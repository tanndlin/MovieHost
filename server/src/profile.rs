use std::sync::{Arc, Mutex};

use axum::{
    Json,
    extract::{Path, State},
    http::{StatusCode, header},
    response::IntoResponse,
};

use crate::{
    AppState,
    types::{Profile, ProfileUpdate, WatchState},
};

pub async fn handle_post_profile(State(state): State<Arc<Mutex<AppState>>>) -> impl IntoResponse {
    let db_pool = state.lock().unwrap().db_pool.clone();

    match sqlx::query_as::<_, Profile>(
        "INSERT INTO users (username) VALUES (CONCAT('User', nextval('users_id_seq'))) RETURNING id, username"
    )
    .fetch_one(&db_pool)
    .await
    {
        Ok(profile) => (
            [(header::CONTENT_TYPE, "application/json")],
            serde_json::to_string(&profile).unwrap(),
        ).into_response(),
        Err(e) => {
            eprintln!("Database error: {e}");
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn handle_get_profile(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let db_pool = state.lock().unwrap().db_pool.clone();

    let user = sqlx::query_as::<_, Profile>("SELECT id, username FROM users WHERE id = $1")
        .bind(id)
        .fetch_one(&db_pool)
        .await;

    let profile = match user {
        Ok(p) => p,
        Err(sqlx::Error::RowNotFound) => return StatusCode::NOT_FOUND.into_response(),
        Err(e) => {
            eprintln!("Database error: {e}");
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    };

    let watch_states = sqlx::query_as::<_, WatchState>(
        "SELECT movie_path, last_position, finished FROM watched_movies WHERE user_id = $1",
    )
    .bind(id)
    .fetch_all(&db_pool)
    .await;

    let watch_states = match watch_states {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("Database error: {e}");
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
    };

    let response = serde_json::json!({
        "id": profile.id,
        "username": profile.username,
        "watch_states": watch_states
            .into_iter()
            .map(|ws| (ws.movie_path.clone(), serde_json::json!({
                "last_position": ws.last_position,
                "finished": ws.finished,
            })))
            .collect::<std::collections::HashMap<_, _>>()
    });

    (
        [(header::CONTENT_TYPE, "application/json")],
        serde_json::to_string(&response).unwrap(),
    )
        .into_response()
}

pub async fn handle_delete_profile(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let db_pool = state.lock().unwrap().db_pool.clone();
    let result = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(id)
        .execute(&db_pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => StatusCode::OK.into_response(),
        Ok(_) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => {
            eprintln!("Database error: {e}");
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn handle_get_profiles(State(state): State<Arc<Mutex<AppState>>>) -> impl IntoResponse {
    let db_pool = state.lock().unwrap().db_pool.clone();
    let profiles = sqlx::query_as::<_, Profile>("SELECT id, username FROM users")
        .fetch_all(&db_pool)
        .await;

    match profiles {
        Ok(profiles) => (
            [(header::CONTENT_TYPE, "application/json")],
            serde_json::to_string(&profiles).unwrap(),
        )
            .into_response(),
        Err(e) => {
            eprintln!("Database error: {e}");
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

pub async fn handle_put_profile(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(id): Path<i32>,
    Json(payload): Json<ProfileUpdate>,
) -> impl IntoResponse {
    let db_pool = state.lock().unwrap().db_pool.clone();
    let result = sqlx::query("UPDATE users SET username = $1 WHERE id = $2")
        .bind(&payload.username)
        .bind(id)
        .execute(&db_pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => StatusCode::OK.into_response(),
        Ok(_) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => {
            eprintln!("Database error: {e}");
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}
