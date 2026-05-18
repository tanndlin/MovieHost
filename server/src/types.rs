use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Deserialize)]
pub struct ThumbnailParams {
    pub path: String,
}

#[derive(Serialize, FromRow)]
pub struct Profile {
    pub id: i32,
    pub username: String,
}

#[derive(Deserialize)]
pub struct ProfileUpdate {
    pub username: String,
}

#[derive(Deserialize, Serialize, FromRow)]
pub struct WatchState {
    pub movie_path: String,
    pub last_position: f32,
    pub finished: bool,
}

#[derive(Deserialize)]
pub struct WatchStateUpdate {
    pub movie_path: String,
    pub last_position: f32,
    pub finished: bool,
}

#[derive(Deserialize)]
pub struct TMBDResponse {
    page: u32,
    pub results: Vec<TMDBMovie>,
}

#[derive(Deserialize)]
pub struct TMDBMovie {
    pub poster_path: Option<String>,
}
