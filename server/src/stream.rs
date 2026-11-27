//! On-the-fly HLS remuxing for files a browser can't play directly (mainly
//! `.mkv`, which iOS Safari refuses outright).
//!
//! The playlist is a fixed grid of nominal [`SEGMENT_SECS`] segments, so it can
//! be written from the file's duration alone. Segments come from one long-lived
//! ffmpeg "job" per file that copies the video, re-encodes audio to AAC (the
//! only codec every browser decodes) and cuts at the first keyframe after each
//! grid point. A request far from what the running job is producing (a seek)
//! replaces that job with one started at the requested segment.
//!
//! Segments from different jobs are never mixed: ffmpeg's cut points depend
//! slightly on where a job started, so stitching two jobs together could leave
//! a gap. Each job writes to its own directory, which is deleted when the job
//! is replaced.

use std::collections::HashMap;
use std::fmt::Write as _;
use std::path::{Component, Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::time::{Duration, Instant};

use axum::extract::State;
use axum::http::header;
use axum::response::{IntoResponse, Response};
use serde::Deserialize;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use utoipa::IntoParams;

use crate::response::{ApiError, ApiQuery, ErrorBody};
use crate::types::ThumbnailParams;
use crate::{SharedState, path_hash};

/// Nominal segment length. Real segments run to the next keyframe, so they
/// vary by up to one GOP either way.
const SEGMENT_SECS: f64 = 6.0;
/// A request this many segments past the job's newest finished segment is
/// treated as normal buffering and waited for; anything further is a seek.
const WAIT_WINDOW: usize = 5;
/// The job is paused once it is this many segments ahead of the newest
/// request, so a two-hour movie isn't remuxed onto disk in one go.
const MAX_AHEAD: usize = 15;
/// Finished segments this far behind the newest request are deleted.
const KEEP_BEHIND: usize = 10;
/// How long a segment request waits for ffmpeg before giving up.
const SEGMENT_TIMEOUT: Duration = Duration::from_secs(30);
const POLL_INTERVAL: Duration = Duration::from_millis(100);
/// ffmpeg remuxes at ~100x realtime, so the throttle has to check often.
const THROTTLE_INTERVAL: Duration = Duration::from_millis(100);
/// A job nobody has requested from in this long is killed.
const JOB_IDLE: Duration = Duration::from_mins(10);
/// A session (cached duration plus job) unused this long is dropped.
const SESSION_IDLE: Duration = Duration::from_hours(1);
const SWEEP_INTERVAL: Duration = Duration::from_mins(1);

pub struct Streamer {
    root: PathBuf,
    sessions: Mutex<HashMap<String, Session>>,
}

struct Session {
    dir: PathBuf,
    duration: f64,
    last_access: Instant,
    next_job_id: u64,
    job: Option<Job>,
}

struct Job {
    start: usize,
    dir: PathBuf,
    child: Child,
    /// Highest segment index requested so far; the throttle keeps ffmpeg at
    /// most [`MAX_AHEAD`] segments past it.
    wanted: Arc<AtomicUsize>,
    /// Set once the job is discarded, so the throttle stops signalling a pid
    /// that is about to be reaped.
    stopped: Arc<AtomicBool>,
}

impl Streamer {
    /// Scratch space lives under `root`. Anything left there by a previous run
    /// is stale, so it is cleared.
    pub fn new(root: PathBuf) -> Arc<Self> {
        let _ = std::fs::remove_dir_all(&root);
        if let Err(err) = std::fs::create_dir_all(&root) {
            tracing::error!("Could not create HLS cache dir {}: {err}", root.display());
        }

        let streamer = Arc::new(Self {
            root,
            sessions: Mutex::new(HashMap::new()),
        });
        tokio::spawn(sweep(Arc::clone(&streamer)));
        streamer
    }

    async fn playlist(&self, media: &Path, rel: &str) -> Result<String, ApiError> {
        let mut sessions = self.sessions.lock().await;
        let session = self.session(&mut sessions, media, rel).await?;
        Ok(build_playlist(rel, session.duration))
    }

    async fn segment(&self, media: &Path, rel: &str, index: usize) -> Result<Vec<u8>, ApiError> {
        let deadline = Instant::now() + SEGMENT_TIMEOUT;

        loop {
            let mut sessions = self.sessions.lock().await;
            let session = self.session(&mut sessions, media, rel).await?;

            if index >= segment_count(session.duration) {
                return Err(ApiError::NotFound);
            }

            match session.job.as_mut().map(|job| job.poll(index)) {
                Some(JobState::Ready(path)) => {
                    let bytes = tokio::fs::read(&path)
                        .await
                        .map_err(|err| ApiError::Internal(format!("reading segment: {err}")))?;
                    if let Some(job) = session.job.as_ref() {
                        job.prune_before(index);
                    }
                    return Ok(bytes);
                }
                Some(JobState::Pending) => {}
                Some(JobState::Failed(detail)) => {
                    session.job = None;
                    return Err(ApiError::Internal(format!(
                        "ffmpeg failed on {rel}: {detail}"
                    )));
                }
                Some(JobState::Elsewhere) | None => {
                    let id = session.next_job_id;
                    session.next_job_id += 1;
                    let job = Job::spawn(media, &session.dir, id, index, session.duration)?;
                    if let Some(old) = session.job.replace(job) {
                        old.discard();
                    }
                }
            }
            drop(sessions);

            if Instant::now() >= deadline {
                return Err(ApiError::Internal(format!(
                    "timed out waiting for segment {index} of {rel}"
                )));
            }
            tokio::time::sleep(POLL_INTERVAL).await;
        }
    }

    /// The session for `rel`, probing the file's duration on first use.
    async fn session<'a>(
        &self,
        sessions: &'a mut HashMap<String, Session>,
        media: &Path,
        rel: &str,
    ) -> Result<&'a mut Session, ApiError> {
        if !sessions.contains_key(rel) {
            let duration = probe_duration(media).await?;
            let dir = self.root.join(format!("{:x}", path_hash(rel)));
            sessions.insert(
                rel.to_owned(),
                Session {
                    dir,
                    duration,
                    last_access: Instant::now(),
                    next_job_id: 0,
                    job: None,
                },
            );
        }

        let session = sessions.get_mut(rel).expect("inserted above");
        session.last_access = Instant::now();
        Ok(session)
    }
}

enum JobState {
    Ready(PathBuf),
    /// The job will reach this segment soon; wait for it.
    Pending,
    /// The job can't serve this segment; start a new one there.
    Elsewhere,
    Failed(String),
}

impl Job {
    fn spawn(
        media: &Path,
        session_dir: &Path,
        id: u64,
        start: usize,
        duration: f64,
    ) -> Result<Self, ApiError> {
        let dir = session_dir.join(id.to_string());
        std::fs::create_dir_all(&dir)
            .map_err(|err| ApiError::Internal(format!("creating {}: {err}", dir.display())))?;

        // With `-copyts`, segment N's cut point is the N-th entry of this list
        // whatever the job's start, so the list always begins at the first
        // boundary rather than at `start`.
        let mut cuts = String::new();
        for n in 1..segment_count(duration) {
            if n > 1 {
                cuts.push(',');
            }
            let _ = write!(cuts, "{}", segment_start(n));
        }

        let mut child = Command::new("ffmpeg")
            .args(["-nostdin", "-hide_banner", "-loglevel", "error"])
            // Input seek: lands on the keyframe at or before the cut. The
            // overlap with the previous segment is harmless.
            .args(["-ss", &segment_start(start).to_string()])
            .arg("-i")
            .arg(media)
            .args(["-copyts", "-map", "0:v:0", "-map", "0:a:0?"])
            .args(["-c:v", "copy", "-c:a", "aac", "-ac", "2", "-b:a", "192k"])
            .args(["-f", "segment", "-segment_format", "mpegts"])
            .args(["-segment_times", &cuts])
            .args(["-segment_start_number", &start.to_string()])
            .arg("-segment_list")
            .arg(dir.join("list.csv"))
            .args(["-segment_list_type", "csv"])
            .arg(dir.join("seg%d.ts"))
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .kill_on_drop(true)
            .spawn()
            .map_err(|err| ApiError::Internal(format!("spawning ffmpeg: {err}")))?;

        tracing::info!("Started HLS job at segment {start} for {}", media.display());

        // Drain stderr into the log; an unread pipe would eventually stall ffmpeg.
        if let Some(stderr) = child.stderr.take() {
            let name = media.display().to_string();
            tokio::spawn(async move {
                let mut lines = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    tracing::warn!("ffmpeg ({name}): {line}");
                }
            });
        }

        let wanted = Arc::new(AtomicUsize::new(start));
        let stopped = Arc::new(AtomicBool::new(false));
        if let Some(pid) = child.id().and_then(|pid| i32::try_from(pid).ok()) {
            tokio::spawn(throttle(
                pid,
                dir.clone(),
                Arc::clone(&wanted),
                Arc::clone(&stopped),
            ));
        }

        Ok(Self {
            start,
            dir,
            child,
            wanted,
            stopped,
        })
    }

    fn poll(&mut self, index: usize) -> JobState {
        if index < self.start {
            return JobState::Elsewhere;
        }

        self.wanted.fetch_max(index, Ordering::Relaxed);

        let finished = finished_segments(&self.dir);
        if finished.contains(&index) {
            let path = self.segment_path(index);
            // Pruned segments are gone from disk but still in the list.
            if path.exists() {
                return JobState::Ready(path);
            }
            return JobState::Elsewhere;
        }

        let newest = finished.iter().max().copied();
        let reachable = newest.map_or(self.start, |n| n + 1) + WAIT_WINDOW;
        if index > reachable {
            return JobState::Elsewhere;
        }

        match self.child.try_wait() {
            // If the throttle has paused it, raising `wanted` above resumes it.
            Ok(None) => JobState::Pending,
            // Exited cleanly without writing this segment: the file ends
            // before it, or ffmpeg cut differently than the grid predicts.
            Ok(Some(status)) if status.success() => JobState::Elsewhere,
            Ok(Some(status)) => JobState::Failed(format!("exited with {status}")),
            Err(err) => JobState::Failed(err.to_string()),
        }
    }

    /// Delete finished segments well behind the playhead.
    fn prune_before(&self, index: usize) {
        for n in finished_segments(&self.dir) {
            if n + KEEP_BEHIND < index {
                let _ = std::fs::remove_file(self.segment_path(n));
            }
        }
    }

    fn segment_path(&self, index: usize) -> PathBuf {
        self.dir.join(format!("seg{index}.ts"))
    }

    /// Kill ffmpeg and delete this job's segments in the background.
    fn discard(mut self) {
        self.stopped.store(true, Ordering::Relaxed);
        tokio::spawn(async move {
            let _ = self.child.kill().await;
            let _ = tokio::fs::remove_dir_all(&self.dir).await;
        });
    }
}

/// Indices ffmpeg has finished writing to `dir`. The segment muxer appends a
/// line to the list only once a segment is closed.
fn finished_segments(dir: &Path) -> Vec<usize> {
    let Ok(list) = std::fs::read_to_string(dir.join("list.csv")) else {
        return Vec::new();
    };
    list.lines()
        .filter_map(|line| {
            let name = line.split(',').next()?;
            name.strip_prefix("seg")?.strip_suffix(".ts")?.parse().ok()
        })
        .collect()
}

/// Pause ffmpeg (`SIGSTOP`) while it is [`MAX_AHEAD`] segments past the newest
/// request and resume it (`SIGCONT`) once playback catches up, so a long movie
/// isn't remuxed onto disk in one go.
async fn throttle(pid: i32, dir: PathBuf, wanted: Arc<AtomicUsize>, stopped: Arc<AtomicBool>) {
    let mut paused = false;
    let mut interval = tokio::time::interval(THROTTLE_INTERVAL);
    loop {
        interval.tick().await;
        if stopped.load(Ordering::Relaxed) {
            return;
        }

        let newest = finished_segments(&dir).into_iter().max().unwrap_or(0);
        let pause = newest >= wanted.load(Ordering::Relaxed) + MAX_AHEAD;
        if pause == paused {
            continue;
        }

        let signal = if pause { libc::SIGSTOP } else { libc::SIGCONT };
        // SAFETY: `kill` has no memory-safety preconditions. `pid` is our
        // child: the `Job` holding its `Child` is alive until `stopped` is
        // set, and an unreaped child's pid can't be reused.
        if unsafe { libc::kill(pid, signal) } != 0 {
            return; // Already gone.
        }
        paused = pause;
    }
}

/// Periodically kill idle jobs and forget idle sessions.
async fn sweep(streamer: Arc<Streamer>) {
    let mut interval = tokio::time::interval(SWEEP_INTERVAL);
    loop {
        interval.tick().await;
        let mut sessions = streamer.sessions.lock().await;
        sessions.retain(|rel, session| {
            let idle = session.last_access.elapsed();
            if idle >= JOB_IDLE
                && let Some(job) = session.job.take()
            {
                tracing::info!("Stopping idle HLS job for {rel}");
                job.discard();
            }
            if idle >= SESSION_IDLE {
                let dir = session.dir.clone();
                tokio::spawn(async move {
                    let _ = tokio::fs::remove_dir_all(dir).await;
                });
                return false;
            }
            true
        });
    }
}

fn segment_start(index: usize) -> f64 {
    #[allow(clippy::cast_precision_loss)] // Indices stay far below 2^52.
    let index = index as f64;
    index * SEGMENT_SECS
}

fn segment_count(duration: f64) -> usize {
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    // `duration` is a positive, finite number of seconds (checked on probe).
    let count = (duration / SEGMENT_SECS).ceil() as usize;
    count.max(1)
}

fn build_playlist(rel: &str, duration: f64) -> String {
    let count = segment_count(duration);
    let encoded = encode_query_value(rel);

    let mut out = String::from("#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-PLAYLIST-TYPE:VOD\n");
    // Segments overrun the nominal length by up to a GOP, so leave headroom.
    let _ = writeln!(out, "#EXT-X-TARGETDURATION:{}", SEGMENT_SECS * 2.0);
    out.push_str("#EXT-X-MEDIA-SEQUENCE:0\n");
    for index in 0..count {
        let length = (duration - segment_start(index)).min(SEGMENT_SECS);
        // Relative URI: resolves against the playlist's own `/api/stream/`.
        let _ = writeln!(
            out,
            "#EXTINF:{length:.3},\nsegment.ts?path={encoded}&index={index}"
        );
    }
    out.push_str("#EXT-X-ENDLIST\n");
    out
}

/// Percent-encode everything but RFC 3986 unreserved characters.
fn encode_query_value(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || b"-_.~".contains(&byte) {
            out.push(char::from(byte));
        } else {
            let _ = write!(out, "%{byte:02X}");
        }
    }
    out
}

async fn probe_duration(media: &Path) -> Result<f64, ApiError> {
    let output = Command::new("ffprobe")
        .args(["-v", "error", "-show_entries", "format=duration"])
        .args(["-of", "default=noprint_wrappers=1:nokey=1"])
        .arg(media)
        .output()
        .await
        .map_err(|err| ApiError::Internal(format!("spawning ffprobe: {err}")))?;

    String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse::<f64>()
        .ok()
        .filter(|d| d.is_finite() && *d > 0.0)
        .ok_or_else(|| {
            ApiError::Internal(format!(
                "ffprobe found no duration for {}: {}",
                media.display(),
                String::from_utf8_lossy(&output.stderr).trim()
            ))
        })
}

/// Resolve a client-supplied path under the media root, refusing anything
/// that could climb out of it.
fn resolve_media(serve_dir: &str, rel: &str) -> Result<PathBuf, ApiError> {
    let rel_path = Path::new(rel);
    if rel.is_empty()
        || rel_path
            .components()
            .any(|c| !matches!(c, Component::Normal(_)))
    {
        return Err(ApiError::BadRequest("invalid media path".to_owned()));
    }
    let full = Path::new(serve_dir).join(rel_path);
    if !full.is_file() {
        return Err(ApiError::NotFound);
    }
    Ok(full)
}

fn streamer_and_dir(state: &SharedState) -> (Arc<Streamer>, String) {
    let state = state.lock().unwrap();
    (Arc::clone(&state.streamer), state.serve_dir.clone())
}

pub struct Playlist(String);

impl IntoResponse for Playlist {
    fn into_response(self) -> Response {
        (
            [
                (header::CONTENT_TYPE, "application/vnd.apple.mpegurl"),
                (header::CACHE_CONTROL, "no-cache"),
            ],
            self.0,
        )
            .into_response()
    }
}

pub struct Segment(Vec<u8>);

impl IntoResponse for Segment {
    fn into_response(self) -> Response {
        (
            [
                (header::CONTENT_TYPE, "video/mp2t"),
                (header::CACHE_CONTROL, "no-store"),
            ],
            self.0,
        )
            .into_response()
    }
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct SegmentParams {
    /// Media path relative to the server's media root.
    #[param(example = "Movies/Arrival (2016)/Arrival (2016).mkv")]
    pub path: String,
    /// Zero-based segment index from the playlist.
    pub index: usize,
}

/// HLS playlist that remuxes a file the browser can't play directly.
#[utoipa::path(
    get,
    path = "/api/stream/index.m3u8",
    tag = "stream",
    params(ThumbnailParams),
    responses(
        (status = 200, description = "HLS media playlist", content_type = "application/vnd.apple.mpegurl", body = String),
        (status = 400, description = "Missing or malformed path", body = ErrorBody),
        (status = 404, description = "No such file", body = ErrorBody),
    ),
)]
pub(crate) async fn handle_playlist(
    State(state): State<SharedState>,
    ApiQuery(params): ApiQuery<ThumbnailParams>,
) -> Result<Playlist, ApiError> {
    let (streamer, serve_dir) = streamer_and_dir(&state);
    let media = resolve_media(&serve_dir, &params.path)?;
    streamer.playlist(&media, &params.path).await.map(Playlist)
}

/// One MPEG-TS segment of a remuxed stream.
#[utoipa::path(
    get,
    path = "/api/stream/segment.ts",
    tag = "stream",
    params(SegmentParams),
    responses(
        (status = 200, description = "MPEG-TS segment", content_type = "video/mp2t", body = Vec<u8>),
        (status = 400, description = "Missing or malformed query", body = ErrorBody),
        (status = 404, description = "No such file or segment", body = ErrorBody),
        (status = 500, description = "ffmpeg failed or timed out", body = ErrorBody),
    ),
)]
pub(crate) async fn handle_segment(
    State(state): State<SharedState>,
    ApiQuery(params): ApiQuery<SegmentParams>,
) -> Result<Segment, ApiError> {
    let (streamer, serve_dir) = streamer_and_dir(&state);
    let media = resolve_media(&serve_dir, &params.path)?;
    streamer
        .segment(&media, &params.path, params.index)
        .await
        .map(Segment)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn playlist_covers_duration_with_short_last_segment() {
        let playlist = build_playlist("Movies/A B.mkv", 13.5);
        assert!(playlist.contains("#EXTINF:6.000,\nsegment.ts?path=Movies%2FA%20B.mkv&index=0"));
        assert!(playlist.contains("#EXTINF:1.500,\nsegment.ts?path=Movies%2FA%20B.mkv&index=2"));
        assert!(!playlist.contains("index=3"));
        assert!(playlist.ends_with("#EXT-X-ENDLIST\n"));
    }

    #[test]
    fn segment_count_rounds_up() {
        assert_eq!(segment_count(12.0), 2);
        assert_eq!(segment_count(12.1), 3);
        assert_eq!(segment_count(0.5), 1);
    }

    #[test]
    fn query_encoding_escapes_reserved_characters() {
        assert_eq!(
            encode_query_value("Shows/Mr. & Mrs. (2005)/E1.mkv"),
            "Shows%2FMr.%20%26%20Mrs.%20%282005%29%2FE1.mkv"
        );
    }

    #[test]
    fn rejects_paths_outside_media_root() {
        for rel in ["../etc/passwd", "/etc/passwd", "Movies/../../x", ""] {
            assert!(matches!(
                resolve_media("/media", rel),
                Err(ApiError::BadRequest(_))
            ));
        }
    }
}
