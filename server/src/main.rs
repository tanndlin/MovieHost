use axum::extract::ws::{Message, WebSocket};
use axum::extract::{Path, Query, State, WebSocketUpgrade};
use axum::http::{Method, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::{delete, get, post, put};
use axum::{Json, Router};
use sqlx::postgres::PgPoolOptions;
use std::collections::HashMap;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc::UnboundedSender;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;

use crate::library::{handle_library, list_media_files};
use crate::profile::{
    handle_delete_profile, handle_get_profile, handle_get_profiles, handle_post_profile,
    handle_put_profile,
};
use crate::types::{TMBDResponse, TMDBMovie, ThumbnailParams, WatchStateUpdate};
use crate::ws::websocket::handle_ws;

mod library;
mod profile;
mod types;
mod ws;

struct AppState {
    db_pool: sqlx::Pool<sqlx::Postgres>,
    websockets: HashMap<u64, Vec<UnboundedSender<Message>>>,
    movie_info_cache: HashMap<String, TMDBMovie>,
}

#[tokio::main]
async fn main() {
    println!("Starting server...");

    let database_url =
        std::env::var("DATABASE_URL").expect("DATABASE_URL environment variable not set");

    println!("Connecting to database...");
    let db_pool = PgPoolOptions::new()
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    sqlx::migrate!("./migrations")
        .run(&db_pool)
        .await
        .expect("Failed to run database migrations");

    println!("Database connected and migrations applied.");

    let app_state = Arc::new(Mutex::new(AppState {
        db_pool,
        websockets: HashMap::new(),
        movie_info_cache: HashMap::new(),
    }));

    let serve_dir = std::env::var("SERVE_DIR").expect("SERVE_DIR environment variable not set");
    let api_port = std::env::var("API_PORT").expect("API_PORT environment variable not set");

    let app = Router::new()
        .route("/api/ls", get(handle_ls))
        .route("/api/library", get(handle_library))
        .route("/api/thumbnail", get(handle_thumbnail))
        .route("/api/details", get(handle_details))
        .route("/api/profile", post(handle_post_profile))
        .route("/api/profiles", get(handle_get_profiles))
        .route("/api/profile/{id}", get(handle_get_profile))
        .route("/api/profile/{id}", put(handle_put_profile))
        .route("/api/profile/{id}", delete(handle_delete_profile))
        .route("/api/profile/{id}/watch_state", put(handle_put_watch_state))
        .route("/ws", get(ws_handler))
        .nest_service("/api/media", ServeDir::new(&serve_dir))
        .with_state(app_state);

    let app = if cfg!(debug_assertions) {
        app.layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods([Method::GET, Method::POST, Method::PUT])
                .allow_headers(Any),
        )
    } else {
        app
    };

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{api_port}"))
        .await
        .unwrap();
    let ip = listener.local_addr().unwrap();
    println!("Server running on http://{ip}");
    axum::serve(listener, app).await.unwrap();
}

async fn handle_ls() -> String {
    let serve_dir = std::env::var("SERVE_DIR").expect("SERVE_DIR environment variable not set");
    serde_json::to_string(&list_media_files(&serve_dir)).unwrap()
}

fn path_hash(path: &str) -> u64 {
    let mut h = DefaultHasher::new();
    path.hash(&mut h);
    h.finish()
}

/// Posters are TMDB-backed and don't change for a given path, so let clients
/// (and the hover-prefetch on media cards) keep them for a week.
const THUMBNAIL_CACHE_CONTROL: &str = "public, max-age=604800, immutable";
/// Show/movie details are effectively immutable but cheap to refresh, so use a
/// shorter TTL than the poster image.
const DETAILS_CACHE_CONTROL: &str = "public, max-age=86400";

async fn handle_thumbnail(
    State(state): State<Arc<Mutex<AppState>>>,
    Query(params): Query<ThumbnailParams>,
) -> impl IntoResponse {
    dbg!("Requested thumbnail for path: {}", &params.path);

    let thumb_path = format!("/tmp/thumb_{:x}.jpg", path_hash(&params.path));

    let thumbnail_headers = [
        (header::CONTENT_TYPE, "image/jpeg"),
        (header::CACHE_CONTROL, THUMBNAIL_CACHE_CONTROL),
    ];

    if let Ok(bytes) = tokio::fs::read(&thumb_path).await {
        return (thumbnail_headers, bytes).into_response();
    }

    // Check movie info cache first
    let movie_info = {
        let state_guard = state.lock().unwrap();
        state_guard.movie_info_cache.get(&params.path).cloned()
    };

    let movie_info = match movie_info {
        Some(info) => info,
        None => {
            if let Some(info) = get_movie_info_from_tmdb(&params.path).await {
                // Cache the movie info
                let mut state_guard = state.lock().unwrap();
                state_guard
                    .movie_info_cache
                    .insert(params.path.clone(), info);
                state_guard
                    .movie_info_cache
                    .get(&params.path)
                    .cloned()
                    .unwrap()
            } else {
                eprintln!("Movie info not found for path: {}", params.path);
                return StatusCode::NOT_FOUND.into_response();
            }
        }
    };

    if let Some(bytes) = get_thumbnail_from_tmdb(&movie_info).await {
        let _ = tokio::fs::write(&thumb_path, &bytes).await;
        return (thumbnail_headers, bytes).into_response();
    }

    StatusCode::NOT_FOUND.into_response()
}

async fn get_movie_info_from_tmdb(path: &str) -> Option<TMDBMovie> {
    let media_type = if path.to_lowercase().starts_with("movie") {
        "movie"
    } else if path.to_lowercase().starts_with("show") {
        "tv"
    } else {
        return None;
    };

    let filename = path.rsplit('/').next().unwrap_or(path);
    let title = filename.split('.').next().unwrap_or(filename);

    let tmdb_api_key =
        std::env::var("TMDB_API_KEY").expect("TMDB_API_KEY environment variable not set");
    let client = reqwest::Client::new();
    let url = reqwest::Url::parse_with_params(
        format!("https://api.themoviedb.org/3/search/{media_type}").as_str(),
        &[("api_key", tmdb_api_key.as_str()), ("query", title)],
    )
    .unwrap();

    let response = client.get(url).send().await.ok()?;
    let resp_text = response.text().await.ok()?;
    let tmdb_response: TMBDResponse = serde_json::from_str(&resp_text).ok()?;
    tmdb_response.results.into_iter().next()
}

async fn get_thumbnail_from_tmdb(movie_info: &TMDBMovie) -> Option<Vec<u8>> {
    let poster_path = movie_info.poster_path.as_ref()?;
    let poster_url = format!("https://image.tmdb.org/t/p/w500{poster_path}");

    let client = reqwest::Client::new();
    let poster_response = client.get(&poster_url).send().await.ok()?;
    let poster_bytes = poster_response.bytes().await.ok()?;
    Some(poster_bytes.to_vec())
}

async fn handle_put_watch_state(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(id): Path<i32>,
    Json(payload): Json<WatchStateUpdate>,
) -> impl IntoResponse {
    let db_pool = state.lock().unwrap().db_pool.clone();
    let result = sqlx::query(
        "INSERT INTO watched_movies (user_id, movie_path, last_position, finished)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, movie_path)
         DO UPDATE SET last_position = $3, finished = $4",
    )
    .bind(id)
    .bind(&payload.movie_path)
    .bind(payload.last_position)
    .bind(payload.finished)
    .execute(&db_pool)
    .await;

    match result {
        Ok(_) => StatusCode::OK.into_response(),
        Err(e) => {
            eprintln!("Database error: {e}");
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

async fn handle_details(
    State(state): State<Arc<Mutex<AppState>>>,
    Query(params): Query<ThumbnailParams>,
) -> impl IntoResponse {
    let movie_info = {
        let state_guard = state.lock().unwrap();
        state_guard.movie_info_cache.get(&params.path).cloned()
    };

    let movie_info = match movie_info {
        Some(info) => info,
        None => {
            match get_movie_info_from_tmdb(&params.path).await {
                Some(info) => {
                    // Cache the movie info
                    let mut state_guard = state.lock().unwrap();
                    state_guard
                        .movie_info_cache
                        .insert(params.path.clone(), info);
                    state_guard
                        .movie_info_cache
                        .get(&params.path)
                        .cloned()
                        .unwrap()
                }
                None => return StatusCode::NOT_FOUND.into_response(),
            }
        }
    };

    (
        [(header::CACHE_CONTROL, DETAILS_CACHE_CONTROL)],
        Json(movie_info),
    )
        .into_response()
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<Arc<Mutex<AppState>>>) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<Mutex<AppState>>) {
    handle_ws(socket, state).await;
}
