use axum::extract::ws::{Message, WebSocket};
use axum::extract::{State, WebSocketUpgrade};
use axum::http::Method;
use axum::response::Response;
use axum::routing::get;
use axum::{Json, Router};
use sqlx::postgres::PgPoolOptions;
use std::collections::HashMap;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc::UnboundedSender;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use utoipa_scalar::{Scalar, Servable};

use crate::library::list_media_files;
use crate::openapi::api_router;
use crate::response::{ApiError, ApiJson, ApiPath, ApiQuery, Cached, ErrorBody, Jpeg};
use crate::types::{MovieDetails, ThumbnailParams, TmdbSearchResponse, WatchState};
use crate::ws::websocket::handle_ws;

mod library;
mod openapi;
mod profile;
mod response;
mod types;
mod ws;

/// Process-wide state. Config is resolved once at startup, so a missing
/// environment variable fails on boot rather than inside a handler.
struct AppState {
    serve_dir: String,
    tmdb_api_key: String,
    /// Reused across requests: a fresh `Client` per call would discard the
    /// connection pool every time.
    http_client: reqwest::Client,
    db_pool: sqlx::Pool<sqlx::Postgres>,
    websockets: HashMap<u64, Vec<UnboundedSender<Message>>>,
    movie_info_cache: HashMap<String, MovieDetails>,
}

type SharedState = Arc<Mutex<AppState>>;

#[tokio::main]
async fn main() {
    println!("Starting server...");

    let database_url =
        std::env::var("DATABASE_URL").expect("DATABASE_URL environment variable not set");
    let serve_dir = std::env::var("SERVE_DIR").expect("SERVE_DIR environment variable not set");
    let api_port = std::env::var("API_PORT").expect("API_PORT environment variable not set");
    let tmdb_api_key =
        std::env::var("TMDB_API_KEY").expect("TMDB_API_KEY environment variable not set");

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

    let app_state: SharedState = Arc::new(Mutex::new(AppState {
        serve_dir: serve_dir.clone(),
        tmdb_api_key,
        http_client: reqwest::Client::new(),
        db_pool,
        websockets: HashMap::new(),
        movie_info_cache: HashMap::new(),
    }));

    let (api, openapi) = api_router();

    let app = Router::new()
        .merge(api)
        .merge(Scalar::with_url("/scalar", openapi))
        // Not an HTTP operation, so it is registered outside the OpenAPI router.
        .route("/ws", get(ws_handler))
        .nest_service("/api/media", ServeDir::new(&serve_dir))
        .with_state(app_state);

    let app = if cfg!(debug_assertions) {
        app.layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
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
    println!("API reference at http://{ip}/scalar");
    axum::serve(listener, app).await.unwrap();
}

/// Every media file under the media root, as paths relative to it.
#[utoipa::path(
    get,
    path = "/api/ls",
    tag = "library",
    responses((status = 200, description = "Relative media paths", body = Vec<String>)),
)]
pub(crate) async fn handle_ls(State(state): State<SharedState>) -> Json<Vec<String>> {
    let serve_dir = state.lock().unwrap().serve_dir.clone();
    Json(list_media_files(&serve_dir))
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

/// Poster image for a media path, proxied and cached from TMDB.
#[utoipa::path(
    get,
    path = "/api/thumbnail",
    tag = "media",
    params(ThumbnailParams),
    responses(
        (status = 200, description = "Poster image", content_type = "image/jpeg", body = Vec<u8>),
        (status = 400, description = "Missing or malformed query", body = ErrorBody),
        (status = 404, description = "No artwork for this path", body = ErrorBody),
    ),
)]
pub(crate) async fn handle_thumbnail(
    State(state): State<SharedState>,
    ApiQuery(params): ApiQuery<ThumbnailParams>,
) -> Result<Cached<Jpeg>, ApiError> {
    let thumb_path = format!("/tmp/thumb_{:x}.jpg", path_hash(&params.path));

    if let Ok(bytes) = tokio::fs::read(&thumb_path).await {
        return Ok(Cached::new(THUMBNAIL_CACHE_CONTROL, Jpeg(bytes)));
    }

    let movie_info = movie_details(&state, &params.path).await?;

    let bytes = fetch_poster(&state, &movie_info)
        .await
        .ok_or(ApiError::NotFound)?;
    let _ = tokio::fs::write(&thumb_path, &bytes).await;

    Ok(Cached::new(THUMBNAIL_CACHE_CONTROL, Jpeg(bytes)))
}

/// Title metadata for a media path.
#[utoipa::path(
    get,
    path = "/api/details",
    tag = "media",
    params(ThumbnailParams),
    responses(
        (status = 200, description = "Title metadata", body = MovieDetails),
        (status = 400, description = "Missing or malformed query", body = ErrorBody),
        (status = 404, description = "No metadata for this path", body = ErrorBody),
    ),
)]
pub(crate) async fn handle_details(
    State(state): State<SharedState>,
    ApiQuery(params): ApiQuery<ThumbnailParams>,
) -> Result<Cached<Json<MovieDetails>>, ApiError> {
    let movie_info = movie_details(&state, &params.path).await?;
    Ok(Cached::new(DETAILS_CACHE_CONTROL, Json(movie_info)))
}

/// Cache-backed TMDB lookup shared by the thumbnail and details handlers.
async fn movie_details(state: &SharedState, path: &str) -> Result<MovieDetails, ApiError> {
    if let Some(cached) = state.lock().unwrap().movie_info_cache.get(path).cloned() {
        return Ok(cached);
    }

    let info = search_tmdb(state, path).await.ok_or(ApiError::NotFound)?;
    state
        .lock()
        .unwrap()
        .movie_info_cache
        .insert(path.to_owned(), info.clone());

    Ok(info)
}

async fn search_tmdb(state: &SharedState, path: &str) -> Option<MovieDetails> {
    let media_type = if path.to_lowercase().starts_with("movie") {
        "movie"
    } else if path.to_lowercase().starts_with("show") {
        "tv"
    } else {
        return None;
    };

    let filename = path.rsplit('/').next().unwrap_or(path);
    let title = filename.split('.').next().unwrap_or(filename);

    let (client, api_key) = {
        let guard = state.lock().unwrap();
        (guard.http_client.clone(), guard.tmdb_api_key.clone())
    };

    let url = reqwest::Url::parse_with_params(
        format!("https://api.themoviedb.org/3/search/{media_type}").as_str(),
        &[("api_key", api_key.as_str()), ("query", title)],
    )
    .ok()?;

    let response = client.get(url).send().await.ok()?;
    let resp_text = response.text().await.ok()?;
    let tmdb_response: TmdbSearchResponse = serde_json::from_str(&resp_text).ok()?;
    tmdb_response.results.into_iter().next()
}

async fn fetch_poster(state: &SharedState, movie_info: &MovieDetails) -> Option<Vec<u8>> {
    let poster_path = movie_info.poster_path.as_ref()?;
    let poster_url = format!("https://image.tmdb.org/t/p/w500{poster_path}");

    let client = state.lock().unwrap().http_client.clone();
    let poster_response = client.get(&poster_url).send().await.ok()?;
    let poster_bytes = poster_response.bytes().await.ok()?;
    Some(poster_bytes.to_vec())
}

/// Record how far a profile got through one piece of media.
#[utoipa::path(
    put,
    path = "/api/profile/{id}/watch_state",
    tag = "profiles",
    params(("id" = i32, Path, description = "Profile id")),
    request_body = WatchState,
    responses(
        (status = 204, description = "Watch state saved"),
        (status = 400, description = "Malformed id or body", body = ErrorBody),
        (status = 500, description = "Database error", body = ErrorBody),
    ),
)]
pub(crate) async fn handle_put_watch_state(
    State(state): State<SharedState>,
    ApiPath(id): ApiPath<i32>,
    ApiJson(payload): ApiJson<WatchState>,
) -> Result<axum::http::StatusCode, ApiError> {
    let db_pool = state.lock().unwrap().db_pool.clone();

    sqlx::query(
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
    .await?;

    Ok(axum::http::StatusCode::NO_CONTENT)
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<SharedState>) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: SharedState) {
    handle_ws(socket, state).await;
}
