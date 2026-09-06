use std::cmp::Ordering;
use std::collections::HashMap;

use axum::{Json, response::IntoResponse};
use serde::Serialize;

const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "m4v", "mpg", "mpeg", "ts", "m2ts",
];

#[derive(Serialize)]
// Field names mirror the frontend `Episode` type, so `episode` stays `episode`.
#[allow(clippy::struct_field_names)]
pub struct Episode {
    pub name: String,
    pub path: String,
    pub season: String,
    pub episode: Option<String>,
}

#[derive(Serialize)]
pub struct Season {
    pub name: String,
    pub episodes: Vec<Episode>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Show {
    pub name: String,
    pub base_path: String,
    pub seasons: Vec<Season>,
}

#[derive(Serialize)]
pub struct Movie {
    pub name: String,
    pub path: String,
}

#[derive(Serialize)]
pub struct MediaFile {
    pub path: String,
    pub name: String,
    pub ext: String,
}

#[derive(Serialize)]
pub struct MediaLibrary {
    pub shows: Vec<Show>,
    pub movies: Vec<Movie>,
    pub other: Vec<MediaFile>,
}

/// Walk `serve_dir` and return every file path, relative to the root, using
/// forward slashes. Sorted so the output is deterministic across requests.
pub fn list_media_files(serve_dir: &str) -> Vec<String> {
    let mut entries: Vec<String> = walkdir::WalkDir::new(serve_dir)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| {
            entry
                .path()
                .strip_prefix(serve_dir)
                .ok()
                .and_then(|p| p.to_str())
                .map(|s| s.replace('\\', "/"))
        })
        .collect();
    entries.sort();
    entries
}

pub async fn handle_library() -> impl IntoResponse {
    let serve_dir = std::env::var("SERVE_DIR").expect("SERVE_DIR environment variable not set");
    Json(parse_media_library(&list_media_files(&serve_dir)))
}

/// Group a flat list of relative file paths into shows / movies / other.
///
/// Layout conventions (matching the previous client-side parser):
///   - `Shows|TV|Series/<Show Name>/[Season X/]<episode>.<ext>`
///   - `Movies|Movie/<Movie Name>.<ext>` or `.../<Movie Name>/<Movie Name>.<ext>`
///   - anything else lands in `other`
pub fn parse_media_library(paths: &[String]) -> MediaLibrary {
    let mut show_map: HashMap<String, HashMap<String, Vec<Episode>>> = HashMap::new();
    let mut movies: Vec<Movie> = Vec::new();
    let mut other: Vec<MediaFile> = Vec::new();

    for path in paths {
        if !is_video_file(path) {
            continue;
        }

        let parts: Vec<&str> = path.split('/').collect();
        let top_level = parts.first().map(|s| s.to_lowercase()).unwrap_or_default();
        let filename = *parts.last().unwrap();

        match top_level.as_str() {
            "shows" | "tv" | "series" => {
                let show_name = parts.get(1).copied().unwrap_or("Unknown").to_string();
                let has_season = parts.len() >= 4;
                let base_name = get_base_name(filename);
                let (parsed_season, episode) = parse_episode_number(&base_name);
                let resolved_season = if has_season {
                    parts[2].to_string()
                } else {
                    parsed_season
                };

                show_map
                    .entry(show_name)
                    .or_default()
                    .entry(resolved_season.clone())
                    .or_default()
                    .push(Episode {
                        name: base_name,
                        path: path.clone(),
                        season: resolved_season,
                        episode,
                    });
            }
            "movies" | "movie" => movies.push(Movie {
                name: get_base_name(filename),
                path: path.clone(),
            }),
            _ => other.push(MediaFile {
                path: path.clone(),
                name: get_base_name(path),
                ext: get_ext(path),
            }),
        }
    }

    let mut shows: Vec<Show> = show_map
        .into_iter()
        .map(|(show_name, seasons_map)| {
            let mut seasons: Vec<Season> = seasons_map
                .into_iter()
                .map(|(season_name, mut episodes)| {
                    episodes.sort_by(|a, b| {
                        episode_num(a.episode.as_deref())
                            .cmp(&episode_num(b.episode.as_deref()))
                            .then_with(|| ci_cmp(&a.name, &b.name))
                    });
                    Season {
                        name: season_name,
                        episodes,
                    }
                })
                .collect();
            seasons.sort_by(|a, b| ci_cmp(&a.name, &b.name));
            Show {
                base_path: format!("Shows/{show_name}"),
                name: show_name,
                seasons,
            }
        })
        .collect();

    shows.sort_by(|a, b| ci_cmp(&a.name, &b.name));
    movies.sort_by(|a, b| ci_cmp(&a.name, &b.name));

    MediaLibrary {
        shows,
        movies,
        other,
    }
}

fn is_video_file(path: &str) -> bool {
    let ext = path.rsplit('.').next().unwrap_or("").to_lowercase();
    VIDEO_EXTENSIONS.contains(&ext.as_str())
}

fn get_ext(path: &str) -> String {
    path.rsplit('.').next().unwrap_or("").to_lowercase()
}

/// Filename (last path segment) with its extension stripped. A leading-dot name
/// like `.env` keeps its full form, matching `lastIndexOf('.') > 0`.
fn get_base_name(path: &str) -> String {
    let filename = path.rsplit('/').next().unwrap_or(path);
    match filename.rfind('.') {
        Some(idx) if idx > 0 => filename[..idx].to_string(),
        _ => filename.to_string(),
    }
}

fn episode_num(episode: Option<&str>) -> i64 {
    episode.unwrap_or("0").parse::<i64>().unwrap_or(0)
}

/// Case-insensitive ordering, with the raw string as a stable tiebreaker.
/// Approximates `String.prototype.localeCompare` for filename sorting.
fn ci_cmp(a: &str, b: &str) -> Ordering {
    a.to_lowercase()
        .cmp(&b.to_lowercase())
        .then_with(|| a.cmp(b))
}

/// Pull a `Season N` / episode pair out of names like `S01E02` or `1x02`.
/// Falls back to `("Season 1", None)` when nothing matches.
fn parse_episode_number(name: &str) -> (String, Option<String>) {
    let bytes = name.as_bytes();

    // Pattern: [Ss](\d+)[Ee](\d+)
    for i in 0..bytes.len() {
        if bytes[i] != b's' && bytes[i] != b'S' {
            continue;
        }
        let season_start = i + 1;
        let mut j = season_start;
        while j < bytes.len() && bytes[j].is_ascii_digit() {
            j += 1;
        }
        if j == season_start || j >= bytes.len() || (bytes[j] != b'e' && bytes[j] != b'E') {
            continue;
        }
        let episode_start = j + 1;
        let mut k = episode_start;
        while k < bytes.len() && bytes[k].is_ascii_digit() {
            k += 1;
        }
        if k == episode_start {
            continue;
        }
        let season: i64 = name[season_start..j].parse().unwrap_or(0);
        return (
            format!("Season {season}"),
            Some(name[episode_start..k].to_string()),
        );
    }

    // Pattern: (\d+)[xX](\d+)
    for i in 0..bytes.len() {
        if !bytes[i].is_ascii_digit() || (i > 0 && bytes[i - 1].is_ascii_digit()) {
            continue;
        }
        let mut j = i;
        while j < bytes.len() && bytes[j].is_ascii_digit() {
            j += 1;
        }
        if j >= bytes.len() || (bytes[j] != b'x' && bytes[j] != b'X') {
            continue;
        }
        let episode_start = j + 1;
        let mut k = episode_start;
        while k < bytes.len() && bytes[k].is_ascii_digit() {
            k += 1;
        }
        if k == episode_start {
            continue;
        }
        let season: i64 = name[i..j].parse().unwrap_or(0);
        return (
            format!("Season {season}"),
            Some(name[episode_start..k].to_string()),
        );
    }

    ("Season 1".to_string(), None)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn paths(list: &[&str]) -> Vec<String> {
        list.iter().copied().map(String::from).collect()
    }

    #[test]
    fn groups_shows_movies_and_other() {
        let lib = parse_media_library(&paths(&[
            "Shows/The Wire/Season 1/The.Wire.S01E02.mkv",
            "Shows/The Wire/Season 1/The.Wire.S01E01.mkv",
            "Movies/Heat.mp4",
            "Movies/Blade Runner/Blade Runner.mkv",
            "home-video.mov",
            "notes.txt",
        ]));

        assert_eq!(lib.shows.len(), 1);
        let show = &lib.shows[0];
        assert_eq!(show.name, "The Wire");
        assert_eq!(show.base_path, "Shows/The Wire");
        assert_eq!(show.seasons[0].name, "Season 1");
        // sorted by episode number
        assert_eq!(show.seasons[0].episodes[0].episode.as_deref(), Some("01"));
        assert_eq!(show.seasons[0].episodes[1].episode.as_deref(), Some("02"));

        assert_eq!(
            lib.movies
                .iter()
                .map(|m| m.name.as_str())
                .collect::<Vec<_>>(),
            vec!["Blade Runner", "Heat"]
        );

        // non-video files are dropped; unrecognised top-level dirs land in `other`
        assert_eq!(lib.other.len(), 1);
        assert_eq!(lib.other[0].name, "home-video");
        assert_eq!(lib.other[0].ext, "mov");
    }

    #[test]
    fn season_from_filename_when_no_season_folder() {
        let lib = parse_media_library(&paths(&["TV/Firefly/Firefly.1x03.mp4"]));
        let season = &lib.shows[0].seasons[0];
        assert_eq!(season.name, "Season 1");
        assert_eq!(season.episodes[0].episode.as_deref(), Some("03"));
    }

    #[test]
    fn falls_back_to_season_1_without_a_marker() {
        let (season, episode) = parse_episode_number("random-clip");
        assert_eq!(season, "Season 1");
        assert_eq!(episode, None);
    }

    #[test]
    fn shows_and_seasons_sort_case_insensitively() {
        let lib = parse_media_library(&paths(&["Shows/zebra/s1e1.mp4", "Shows/Apple/s1e1.mp4"]));
        assert_eq!(
            lib.shows
                .iter()
                .map(|s| s.name.as_str())
                .collect::<Vec<_>>(),
            vec!["Apple", "zebra"]
        );
    }
}
