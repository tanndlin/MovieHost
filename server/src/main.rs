use axum::extract::Query;
use axum::http::{StatusCode, header};
use axum::response::IntoResponse;
use axum::{Router, http::Method, routing::get};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;

mod types;

#[tokio::main]
async fn main() {
    println!("Starting server...");

    let serve_dir = std::env::var("SERVE_DIR").expect("SERVE_DIR environment variable not set");
    let api_port = std::env::var("API_PORT").expect("API_PORT environment variable not set");

    let app = Router::new()
        .route("/api/ls", get(handle_ls))
        .route("/api/thumbnail", get(handle_thumbnail))
        .nest_service("/api/media", ServeDir::new(&serve_dir));

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

async fn handle_ls() -> String {
    let serve_dir = std::env::var("SERVE_DIR").expect("SERVE_DIR environment variable not set");
    let mut entries = Vec::new();
    for entry in walkdir::WalkDir::new(&serve_dir)
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

fn path_hash(path: &str) -> u64 {
    let mut h = DefaultHasher::new();
    path.hash(&mut h);
    h.finish()
}

async fn handle_thumbnail(Query(params): Query<types::ThumbnailParams>) -> impl IntoResponse {
    let serve_dir = std::env::var("SERVE_DIR").expect("SERVE_DIR environment variable not set");
    let full_path = format!(
        "{}/{}",
        serve_dir.trim_end_matches('/'),
        params.path.trim_start_matches('/')
    );

    let thumb_path = format!("/tmp/thumb_{:x}.jpg", path_hash(&full_path));

    // Serve cached thumbnail if it already exists
    if let Ok(bytes) = tokio::fs::read(&thumb_path).await {
        return ([(header::CONTENT_TYPE, "image/jpeg")], bytes).into_response();
    }

    // Try to extract embedded attached_pic thumbnail first (fast path)
    let extract_status = tokio::process::Command::new("ffmpeg")
        .args([
            "-i",
            &full_path,
            "-map",
            "0:v",
            "-map",
            "-0:V", // exclude non-attached video, leaving only attached_pic
            "-c",
            "copy",
            "-update",
            "1",
            "-y",
            &thumb_path,
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .await;

    let bytes = match extract_status {
        Ok(s) if s.success() => tokio::fs::read(&thumb_path).await.ok(),
        _ => None,
    };

    // Fallback: decode a frame from the video (slow path)
    let bytes = if bytes.is_none() {
        let status = tokio::process::Command::new("ffmpeg")
            .args([
                "-i",
                &full_path,
                "-ss",
                "00:00:10",
                "-vframes",
                "1",
                "-vf",
                "scale=250:250:force_original_aspect_ratio=decrease",
                "-update",
                "1",
                "-y",
                &thumb_path,
            ])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .await;

        match status {
            Ok(s) if s.success() => tokio::fs::read(&thumb_path).await.ok(),
            _ => None,
        }
    } else {
        bytes
    };

    match bytes {
        Some(b) => ([(header::CONTENT_TYPE, "image/jpeg")], b).into_response(),
        None => StatusCode::NOT_FOUND.into_response(),
    }
}
