//! TMDB client. TMDB is a free API, so every metadata lookup goes through
//! [`cached`]: responses (including "nothing found") are stored in Postgres,
//! and concurrent requests for the same key share one upstream call.

use std::future::Future;
use std::sync::Arc;

use serde::Serialize;
use serde::de::DeserializeOwned;

use crate::SharedState;
use crate::types::{MovieDetails, SeasonDetails, TmdbSearchResponse};

/// How long a successful response is reused. Long enough to keep traffic
/// negligible, short enough that new episodes of an airing season show up.
const FOUND_TTL: &str = "7 days";
/// How long "TMDB has nothing for this" is trusted before asking again.
const MISSING_TTL: &str = "1 day";

/// Outcome of one upstream request.
enum Fetch<T> {
    Found(T),
    /// TMDB answered, and has nothing for this key. Cached.
    Missing,
    /// Network error, rate limit or server error. Not cached, so the next
    /// request retries.
    Failed,
}

/// Search TMDB for the title a media path points at, e.g. `Shows/The Wire`.
pub async fn search(state: &SharedState, path: &str) -> Option<MovieDetails> {
    let lower = path.to_lowercase();
    let media_type = if lower.starts_with("movie") {
        "movie"
    } else if lower.starts_with("show") {
        "tv"
    } else {
        return None;
    };

    let filename = path.rsplit('/').next().unwrap_or(path);
    let title = filename.split('.').next().unwrap_or(filename);

    // Keyed by the query rather than the path, so every path that resolves to
    // the same title shares one entry.
    let key = format!("search:{media_type}:{}", title.to_lowercase());
    cached(state, &key, || async {
        let url = format!("https://api.themoviedb.org/3/search/{media_type}");
        match get_json::<TmdbSearchResponse>(state, &url, &[("query", title)]).await {
            Fetch::Found(resp) => resp
                .results
                .into_iter()
                .next()
                .map_or(Fetch::Missing, Fetch::Found),
            Fetch::Missing => Fetch::Missing,
            Fetch::Failed => Fetch::Failed,
        }
    })
    .await
}

/// Episode metadata for one season of a TMDB show.
pub async fn season(state: &SharedState, tv_id: i64, season: u32) -> Option<SeasonDetails> {
    let key = format!("season:{tv_id}:{season}");
    cached(state, &key, || async {
        let url = format!("https://api.themoviedb.org/3/tv/{tv_id}/season/{season}");
        get_json(state, &url, &[]).await
    })
    .await
}

/// Download a poster image. Callers cache the bytes on disk.
pub async fn poster(state: &SharedState, details: &MovieDetails) -> Option<Vec<u8>> {
    let poster_path = details.poster_path.as_ref()?;
    let url = format!("https://image.tmdb.org/t/p/w500{poster_path}");

    let client = state.lock().unwrap().http_client.clone();
    let response = client
        .get(&url)
        .send()
        .await
        .ok()?
        .error_for_status()
        .ok()?;
    Some(response.bytes().await.ok()?.to_vec())
}

async fn get_json<T: DeserializeOwned>(
    state: &SharedState,
    url: &str,
    params: &[(&str, &str)],
) -> Fetch<T> {
    let (client, api_key) = {
        let guard = state.lock().unwrap();
        (guard.http_client.clone(), guard.tmdb_api_key.clone())
    };

    let Ok(url) = reqwest::Url::parse_with_params(
        url,
        params
            .iter()
            .copied()
            .chain([("api_key", api_key.as_str())]),
    ) else {
        return Fetch::Failed;
    };

    let response = match client.get(url).send().await {
        Ok(response) => response,
        Err(err) => {
            eprintln!("TMDB request failed: {err}");
            return Fetch::Failed;
        }
    };
    // TMDB answers an unknown id or season with a 404.
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Fetch::Missing;
    }
    if !response.status().is_success() {
        eprintln!("TMDB request failed: {}", response.status());
        return Fetch::Failed;
    }

    match response
        .text()
        .await
        .map(|text| serde_json::from_str(&text))
    {
        Ok(Ok(value)) => Fetch::Found(value),
        Ok(Err(err)) => {
            eprintln!("Unexpected TMDB response: {err}");
            Fetch::Failed
        }
        Err(err) => {
            eprintln!("TMDB request failed: {err}");
            Fetch::Failed
        }
    }
}

/// Return the cached value for `key`, or run `fetch` and cache its outcome.
async fn cached<T, F, Fut>(state: &SharedState, key: &str, fetch: F) -> Option<T>
where
    T: Serialize + DeserializeOwned,
    F: FnOnce() -> Fut,
    Fut: Future<Output = Fetch<T>>,
{
    let db_pool = state.lock().unwrap().db_pool.clone();

    if let Some(hit) = read_cache(&db_pool, key).await {
        return hit;
    }

    // Serialize fetches per key, then look again: whoever held the lock
    // before us has probably just filled the cache.
    let lock = key_lock(state, key);
    let result = {
        let _guard = lock.lock().await;
        if let Some(hit) = read_cache(&db_pool, key).await {
            hit
        } else {
            match fetch().await {
                Fetch::Found(value) => {
                    write_cache(&db_pool, key, serde_json::to_string(&value).ok()).await;
                    Some(value)
                }
                Fetch::Missing => {
                    write_cache(&db_pool, key, None).await;
                    None
                }
                Fetch::Failed => None,
            }
        }
    };
    release_key_lock(state, key, &lock);
    result
}

/// `Some(hit)` for a fresh entry, where `hit` is `None` for a cached miss.
/// `None` when there is no fresh entry.
async fn read_cache<T: DeserializeOwned>(db_pool: &sqlx::PgPool, key: &str) -> Option<Option<T>> {
    let row: Option<Option<String>> = sqlx::query_scalar(
        "SELECT body FROM tmdb_cache
         WHERE key = $1
           AND fetched_at > now() - CASE WHEN body IS NULL
                                         THEN $2::interval
                                         ELSE $3::interval END",
    )
    .bind(key)
    .bind(MISSING_TTL)
    .bind(FOUND_TTL)
    .fetch_optional(db_pool)
    .await
    .inspect_err(|err| eprintln!("TMDB cache read failed: {err}"))
    .ok()?;

    match row? {
        None => Some(None),
        // A body that no longer parses (the struct changed) counts as stale.
        Some(body) => serde_json::from_str(&body).ok().map(Some),
    }
}

async fn write_cache(db_pool: &sqlx::PgPool, key: &str, body: Option<String>) {
    let result = sqlx::query(
        "INSERT INTO tmdb_cache (key, body, fetched_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET body = $2, fetched_at = now()",
    )
    .bind(key)
    .bind(body)
    .execute(db_pool)
    .await;
    if let Err(err) = result {
        eprintln!("TMDB cache write failed: {err}");
    }
}

fn key_lock(state: &SharedState, key: &str) -> Arc<tokio::sync::Mutex<()>> {
    state
        .lock()
        .unwrap()
        .tmdb_inflight
        .entry(key.to_owned())
        .or_default()
        .clone()
}

/// Drop the per-key lock once nobody else is waiting on it, so the map only
/// holds keys with a fetch in flight.
fn release_key_lock(state: &SharedState, key: &str, lock: &Arc<tokio::sync::Mutex<()>>) {
    let mut guard = state.lock().unwrap();
    // One reference in the map, one held by the caller.
    if Arc::strong_count(lock) == 2 {
        guard.tmdb_inflight.remove(key);
    }
}
