import {
    Episode,
    MediaFile,
    MediaLibrary,
    Movie,
    Season,
    Show,
    VIDEO_EXTENSIONS
} from '../types';

export function parseMediaLibrary(paths: string[]): MediaLibrary {
    const showMap = new Map<string, Map<string, Episode[]>>();
    const movies: Movie[] = [];
    const other: MediaFile[] = [];

    for (const path of paths) {
        if (!isVideoFile(path)) {
            continue;
        }

        const parts = path.split('/');
        const topLevel = parts[0]?.toLowerCase() ?? '';

        if (
            topLevel === 'shows' ||
            topLevel === 'tv' ||
            topLevel === 'series'
        ) {
            // Shows/Show Name/[Season X/]episode.ext
            const showName = parts[1] ?? 'Unknown';
            const hasSeason = parts.length >= 4;
            const seasonFolder = hasSeason ? parts[2] : 'Season 1';
            const filename = parts[parts.length - 1];
            const baseName = getBaseName(filename);
            const { season, episode } = parseEpisodeNumber(baseName);
            const resolvedSeason = hasSeason ? seasonFolder : season;

            if (!showMap.has(showName)) {
                showMap.set(showName, new Map());
            }
            const seasons = showMap.get(showName)!;
            if (!seasons.has(resolvedSeason)) {
                seasons.set(resolvedSeason, []);
            }

            seasons.get(resolvedSeason)!.push({
                name: baseName,
                path,
                season: resolvedSeason,
                episode
            });
        } else if (topLevel === 'movies' || topLevel === 'movie') {
            // Movies/Movie Name.ext  or  Movies/Movie Name/Movie Name.ext
            const filename = parts[parts.length - 1];
            movies.push({ name: getBaseName(filename), path });
        } else {
            other.push({ path, name: getBaseName(path), ext: getExt(path) });
        }
    }

    const shows: Show[] = [];
    for (const [showName, seasonsMap] of showMap.entries()) {
        const seasons: Season[] = [];
        for (const [seasonName, episodes] of seasonsMap.entries()) {
            episodes.sort((a, b) => {
                const aNum = parseInt(a.episode ?? '0');
                const bNum = parseInt(b.episode ?? '0');
                return aNum - bNum || a.name.localeCompare(b.name);
            });
            seasons.push({ name: seasonName, episodes });
        }
        seasons.sort((a, b) => a.name.localeCompare(b.name));
        const basePath = `Shows/${showName}`;
        shows.push({ name: showName, basePath, seasons });
    }
    shows.sort((a, b) => a.name.localeCompare(b.name));
    movies.sort((a, b) => a.name.localeCompare(b.name));

    return { shows, movies, other };
}

export function hasWatchProgress(ws?: {
    finished: boolean;
    last_position: number;
}): boolean {
    return !!ws?.finished || (ws?.last_position ?? 0) > 0;
}

export function isVideoFile(path: string): boolean {
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    return VIDEO_EXTENSIONS.has(ext);
}

function getExt(path: string): string {
    return path.split('.').pop()?.toLowerCase() ?? '';
}

function getBaseName(path: string): string {
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    const dotIdx = filename.lastIndexOf('.');
    return dotIdx > 0 ? filename.substring(0, dotIdx) : filename;
}

function parseEpisodeNumber(name: string): {
    season: string;
    episode: string | null;
} {
    // Match patterns like S01E02, 1x02, Season 1 Episode 2
    const sxe = name.match(/[Ss](\d+)[Ee](\d+)/);
    if (sxe) {
        return { season: `Season ${parseInt(sxe[1])}`, episode: sxe[2] };
    }

    const nxn = name.match(/(\d+)[xX](\d+)/);
    if (nxn) {
        return { season: `Season ${parseInt(nxn[1])}`, episode: nxn[2] };
    }

    return { season: 'Season 1', episode: null };
}
