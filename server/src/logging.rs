//! Logging setup. Events go to stdout, and also to the `TanLogs` ingestor when
//! `TANLOGS_ADDR` is set. `RUST_LOG` filters both (default: `info`).

use tanlogs_client::TanLogsLayer;
use tracing_subscriber::EnvFilter;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

pub fn init() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    let addr = std::env::var("TANLOGS_ADDR")
        .ok()
        .filter(|addr| !addr.is_empty());
    // An unreachable ingestor shouldn't stop the server, so fall back to stdout only.
    let (tanlogs, tanlogs_err) = match addr
        .as_deref()
        .map(|addr| TanLogsLayer::new(addr, "MovieHost"))
    {
        Some(Ok(layer)) => (Some(layer), None),
        Some(Err(err)) => (None, Some(err)),
        None => (None, None),
    };

    tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer())
        .with(tanlogs)
        .init();

    match (addr, tanlogs_err) {
        (None, _) => tracing::info!("TANLOGS_ADDR not set, logging to stdout only."),
        (Some(addr), Some(err)) => {
            tracing::warn!("TanLogs connect to {addr} failed, logging to stdout only: {err:#}");
        }
        (Some(addr), None) => tracing::info!("Shipping logs to TanLogs at {addr}."),
    }
}
