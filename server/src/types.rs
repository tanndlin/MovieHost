use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;
use utoipa::{IntoParams, ToSchema};

/// Query string shared by `/api/thumbnail` and `/api/details`.
// `parameter_in` is stated rather than inferred: utoipa only infers it from a
// bare `axum::extract::Query<T>` in the handler signature, and these handlers
// use the `ApiQuery` wrapper.
#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ThumbnailParams {
    /// Media path relative to the server's media root.
    #[param(example = "Movies/Arrival.mkv")]
    pub path: String,
}

/// A viewer profile, without its watch states.
#[derive(Serialize, FromRow, ToSchema)]
pub struct Profile {
    pub id: i32,
    pub username: String,
}

/// A single profile plus every watch state it owns, keyed by media path.
#[derive(Serialize, ToSchema)]
pub struct ProfileResponse {
    pub id: i32,
    pub username: String,
    pub watch_states: HashMap<String, WatchState>,
}

/// Request body for renaming a profile.
#[derive(Deserialize, ToSchema)]
pub struct ProfileUpdate {
    pub username: String,
}

/// How far a profile got through one piece of media. Doubles as the request
/// body for `PUT /api/profile/{id}/watch_state`.
#[derive(Deserialize, Serialize, FromRow, ToSchema)]
pub struct WatchState {
    pub movie_path: String,
    /// Playback position in seconds.
    pub last_position: f32,
    pub finished: bool,
}

/// Search envelope returned by TMDB. Internal: never leaves this server.
#[derive(Deserialize)]
pub struct TmdbSearchResponse {
    pub results: Vec<MovieDetails>,
}

/// Metadata for one title, as served by `/api/details`.
#[derive(Clone, Deserialize, Serialize, ToSchema)]
pub struct MovieDetails {
    /// TMDB id; for a show, this keys the per-season lookups behind `/api/season`.
    pub id: i64,
    /// TMDB-relative poster path, absent when TMDB has no artwork.
    pub poster_path: Option<String>,
    pub overview: Option<String>,
    #[serde(alias = "first_air_date")]
    pub release_date: Option<String>,
}

/// Query string for `/api/season`.
#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct SeasonParams {
    /// Show path relative to the server's media root.
    #[param(example = "Shows/The Wire")]
    pub path: String,
    /// TMDB season number; specials are season 0.
    #[param(example = 1)]
    pub season: u32,
}

/// Episode metadata for one season, as served by `/api/season`. Also the
/// shape TMDB's season endpoint returns, minus the fields we don't use.
#[derive(Clone, Deserialize, Serialize, ToSchema)]
pub struct SeasonDetails {
    pub episodes: Vec<EpisodeDetails>,
}

/// Metadata for a single episode.
#[derive(Clone, Deserialize, Serialize, ToSchema)]
pub struct EpisodeDetails {
    pub episode_number: u32,
    pub name: Option<String>,
    pub overview: Option<String>,
    pub air_date: Option<String>,
    /// TMDB-relative still image path, absent when TMDB has no artwork.
    pub still_path: Option<String>,
    /// Runtime in minutes.
    pub runtime: Option<u32>,
}
