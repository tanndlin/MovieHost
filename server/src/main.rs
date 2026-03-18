use axum::{Router, extract::State, http::Method, routing::get};
use std::sync::{Arc, Mutex};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;

#[tokio::main]
async fn main() {
    println!("Starting server...");

    let serve_dir = std::env::var("SERVE_DIR").expect("SERVE_DIR environment variable not set");
    let api_port = std::env::var("API_PORT").expect("API_PORT environment variable not set");

    let state = Arc::new(Mutex::new(AppState {}));

    let app = Router::new()
        .route("/api/ls", get(handle_ls))
        .nest_service("/api/media", ServeDir::new(&serve_dir))
        .with_state(state);

    let app = if cfg!(debug_assertions) {
        app.layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods([Method::GET])
                .allow_headers(Any),
        )
    } else {
        app
    };

    println!("Server running on 0.0.0.0:{api_port}");
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{api_port}"))
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
}

#[derive(Clone)]
struct AppState {}

async fn handle_ls(State(_state): State<Arc<Mutex<AppState>>>) -> String {
    let serve_dir = std::env::var("SERVE_DIR").expect("SERVE_DIR environment variable not set");
    let mut entries = Vec::new();
    for entry in walkdir::WalkDir::new(serve_dir.clone())
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            let path = entry
                .path()
                .strip_prefix(&serve_dir)
                .unwrap()
                .to_str()
                .unwrap()
                .replace('\\', "/");
            entries.push(path);
        }
    }

    serde_json::to_string(&entries).unwrap()
}
