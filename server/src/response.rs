//! The error type every fallible handler returns, plus wrappers that keep
//! headers and content type visible in the handler signature.

use axum::Json;
use axum::extract::rejection::{JsonRejection, PathRejection, QueryRejection};
use axum::extract::{FromRequest, FromRequestParts, Request};
use axum::http::request::Parts;
use axum::http::{StatusCode, header};
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use serde::de::DeserializeOwned;
use utoipa::ToSchema;

/// JSON body returned for every error response.
#[derive(Debug, Serialize, ToSchema)]
pub struct ErrorBody {
    /// Human-readable description of what went wrong.
    #[schema(example = "Not found")]
    pub error: String,
}

/// The error half of every fallible handler.
///
/// Internal detail is logged server-side and never sent to the client, so the
/// body stays the same shape for all failures.
#[derive(Debug)]
pub enum ApiError {
    /// The request itself was malformed. The detail describes the caller's
    /// input, so it is safe to echo back.
    BadRequest(String),
    NotFound,
    /// Something failed server-side; the payload is logged, not returned.
    Internal(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            Self::BadRequest(detail) => (StatusCode::BAD_REQUEST, detail.as_str()),
            Self::NotFound => (StatusCode::NOT_FOUND, "Not found"),
            Self::Internal(detail) => {
                eprintln!("500 Internal Server Error: {detail}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
        };

        (
            status,
            Json(ErrorBody {
                error: message.to_owned(),
            }),
        )
            .into_response()
    }
}

impl From<sqlx::Error> for ApiError {
    /// `RowNotFound` is the one sqlx error that is a client-visible 404; every
    /// other variant is our problem, not the caller's.
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => Self::NotFound,
            other => Self::Internal(format!("database error: {other}")),
        }
    }
}

/// Attaches a `Cache-Control` header to an inner response body.
pub struct Cached<T> {
    pub control: &'static str,
    pub body: T,
}

impl<T> Cached<T> {
    pub const fn new(control: &'static str, body: T) -> Self {
        Self { control, body }
    }
}

impl<T: IntoResponse> IntoResponse for Cached<T> {
    fn into_response(self) -> Response {
        ([(header::CACHE_CONTROL, self.control)], self.body).into_response()
    }
}

pub struct Jpeg(pub Vec<u8>);

impl IntoResponse for Jpeg {
    fn into_response(self) -> Response {
        ([(header::CONTENT_TYPE, "image/jpeg")], self.0).into_response()
    }
}

/// Extractors that map axum's built-in rejections onto [`ApiError`]. Without
/// them a malformed query or body answers with axum's `text/plain` rejection
/// instead of `ErrorBody`.
pub struct ApiQuery<T>(pub T);

impl<T, S> FromRequestParts<S> for ApiQuery<T>
where
    T: DeserializeOwned,
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        axum::extract::Query::<T>::from_request_parts(parts, state)
            .await
            .map(|axum::extract::Query(value)| Self(value))
            .map_err(|err: QueryRejection| ApiError::BadRequest(err.body_text()))
    }
}

pub struct ApiPath<T>(pub T);

impl<T, S> FromRequestParts<S> for ApiPath<T>
where
    T: DeserializeOwned + Send,
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        axum::extract::Path::<T>::from_request_parts(parts, state)
            .await
            .map(|axum::extract::Path(value)| Self(value))
            .map_err(|err: PathRejection| ApiError::BadRequest(err.body_text()))
    }
}

pub struct ApiJson<T>(pub T);

impl<T, S> FromRequest<S> for ApiJson<T>
where
    T: DeserializeOwned,
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        Json::<T>::from_request(req, state)
            .await
            .map(|Json(value)| Self(value))
            .map_err(|err: JsonRejection| ApiError::BadRequest(err.body_text()))
    }
}
