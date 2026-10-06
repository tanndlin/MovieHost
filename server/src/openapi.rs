//! The `OpenAPI` document and the route table. Every route is registered
//! through `routes!`, which reads its path and method off the handler's
//! `#[utoipa::path]` annotation.

use axum::Router;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::SharedState;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "MovieHost API",
        description = "Media library, playback progress, and viewer profiles.",
    ),
    // These describe the `/ws` protocol. No HTTP path references them, so they
    // are registered here explicitly to keep them in the generated client.
    components(schemas(
        crate::ws::types::WsClientMessage,
        crate::ws::types::WsServerMessage,
        crate::ws::types::ControlMessage,
        crate::ws::types::ControlAction,
        crate::ws::types::HandshakeMessage,
    )),
    tags(
        (name = "library", description = "Browsing what is on disk"),
        (name = "media", description = "Artwork and title metadata"),
        (name = "profiles", description = "Viewers and their playback progress"),
    ),
)]
pub struct ApiDoc;

pub fn api_router() -> (Router<SharedState>, utoipa::openapi::OpenApi) {
    OpenApiRouter::with_openapi(ApiDoc::openapi())
        .routes(routes!(crate::handle_ls))
        .routes(routes!(crate::library::handle_library))
        .routes(routes!(crate::handle_thumbnail))
        .routes(routes!(crate::handle_details))
        .routes(routes!(crate::handle_season))
        .routes(routes!(crate::profile::handle_post_profile))
        .routes(routes!(crate::profile::handle_get_profiles))
        .routes(routes!(
            crate::profile::handle_get_profile,
            crate::profile::handle_put_profile,
            crate::profile::handle_delete_profile
        ))
        .routes(routes!(crate::handle_put_watch_state))
        .split_for_parts()
}

#[cfg(test)]
mod tests {
    use super::api_router;

    const SPEC_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/openapi.json");

    /// The spec is checked in so the frontend can generate its types without a
    /// running server. Run `UPDATE_OPENAPI=1 cargo test` after changing a
    /// handler.
    #[test]
    fn checked_in_spec_matches_handlers() {
        let generated = api_router().1.to_pretty_json().unwrap();

        if std::env::var_os("UPDATE_OPENAPI").is_some() {
            std::fs::write(SPEC_PATH, &generated).unwrap();
            return;
        }

        let checked_in = std::fs::read_to_string(SPEC_PATH).unwrap_or_default();
        assert_eq!(
            checked_in.trim(),
            generated.trim(),
            "openapi.json is out of date; regenerate with `UPDATE_OPENAPI=1 cargo test` \
             and re-run `npm run gen:api` in ../frontend",
        );
    }
}
