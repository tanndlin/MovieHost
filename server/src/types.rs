use serde::Deserialize;

#[derive(Deserialize)]
pub struct ThumbnailParams {
    pub path: String,
}
