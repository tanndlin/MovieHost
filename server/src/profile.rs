use axum::{Json, extract::State, http::StatusCode};

use crate::{
    SharedState,
    response::{ApiError, ApiJson, ApiPath, ErrorBody},
    types::{Profile, ProfileResponse, ProfileUpdate, WatchState},
};

/// Create a profile with a generated `UserN` username.
#[utoipa::path(
    post,
    path = "/api/profile",
    tag = "profiles",
    responses(
        (status = 201, description = "Profile created", body = Profile),
        (status = 500, description = "Database error", body = ErrorBody),
    ),
)]
pub async fn handle_post_profile(
    State(state): State<SharedState>,
) -> Result<(StatusCode, Json<Profile>), ApiError> {
    let db_pool = state.lock().unwrap().db_pool.clone();

    let profile = sqlx::query_as::<_, Profile>(
        "INSERT INTO users (username) VALUES (CONCAT('User', nextval('users_id_seq'))) RETURNING id, username",
    )
    .fetch_one(&db_pool)
    .await?;

    Ok((StatusCode::CREATED, Json(profile)))
}

/// Fetch one profile together with every watch state it owns.
#[utoipa::path(
    get,
    path = "/api/profile/{id}",
    tag = "profiles",
    params(("id" = i32, Path, description = "Profile id")),
    responses(
        (status = 200, description = "Profile and watch states", body = ProfileResponse),
        (status = 400, description = "Malformed id", body = ErrorBody),
        (status = 404, description = "No such profile", body = ErrorBody),
        (status = 500, description = "Database error", body = ErrorBody),
    ),
)]
pub async fn handle_get_profile(
    State(state): State<SharedState>,
    ApiPath(id): ApiPath<i32>,
) -> Result<Json<ProfileResponse>, ApiError> {
    let db_pool = state.lock().unwrap().db_pool.clone();

    // `RowNotFound` converts to a 404 via `From<sqlx::Error>`.
    let profile = sqlx::query_as::<_, Profile>("SELECT id, username FROM users WHERE id = $1")
        .bind(id)
        .fetch_one(&db_pool)
        .await?;

    let watch_states = sqlx::query_as::<_, WatchState>(
        "SELECT movie_path, last_position, finished FROM watched_movies WHERE user_id = $1",
    )
    .bind(id)
    .fetch_all(&db_pool)
    .await?;

    Ok(Json(ProfileResponse {
        id: profile.id,
        username: profile.username,
        watch_states: watch_states
            .into_iter()
            .map(|ws| (ws.movie_path.clone(), ws))
            .collect(),
    }))
}

/// Delete a profile. Its watch states cascade.
#[utoipa::path(
    delete,
    path = "/api/profile/{id}",
    tag = "profiles",
    params(("id" = i32, Path, description = "Profile id")),
    responses(
        (status = 204, description = "Profile deleted"),
        (status = 400, description = "Malformed id", body = ErrorBody),
        (status = 404, description = "No such profile", body = ErrorBody),
        (status = 500, description = "Database error", body = ErrorBody),
    ),
)]
pub async fn handle_delete_profile(
    State(state): State<SharedState>,
    ApiPath(id): ApiPath<i32>,
) -> Result<StatusCode, ApiError> {
    let db_pool = state.lock().unwrap().db_pool.clone();

    let result = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(id)
        .execute(&db_pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }

    Ok(StatusCode::NO_CONTENT)
}

/// List every profile, without watch states.
#[utoipa::path(
    get,
    path = "/api/profiles",
    tag = "profiles",
    responses(
        (status = 200, description = "All profiles", body = Vec<Profile>),
        (status = 500, description = "Database error", body = ErrorBody),
    ),
)]
pub async fn handle_get_profiles(
    State(state): State<SharedState>,
) -> Result<Json<Vec<Profile>>, ApiError> {
    let db_pool = state.lock().unwrap().db_pool.clone();

    let profiles = sqlx::query_as::<_, Profile>("SELECT id, username FROM users")
        .fetch_all(&db_pool)
        .await?;

    Ok(Json(profiles))
}

/// Rename a profile.
#[utoipa::path(
    put,
    path = "/api/profile/{id}",
    tag = "profiles",
    params(("id" = i32, Path, description = "Profile id")),
    request_body = ProfileUpdate,
    responses(
        (status = 204, description = "Profile renamed"),
        (status = 400, description = "Malformed id", body = ErrorBody),
        (status = 404, description = "No such profile", body = ErrorBody),
        (status = 500, description = "Database error", body = ErrorBody),
    ),
)]
pub async fn handle_put_profile(
    State(state): State<SharedState>,
    ApiPath(id): ApiPath<i32>,
    ApiJson(payload): ApiJson<ProfileUpdate>,
) -> Result<StatusCode, ApiError> {
    let db_pool = state.lock().unwrap().db_pool.clone();

    let result = sqlx::query("UPDATE users SET username = $1 WHERE id = $2")
        .bind(&payload.username)
        .bind(id)
        .execute(&db_pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }

    Ok(StatusCode::NO_CONTENT)
}
