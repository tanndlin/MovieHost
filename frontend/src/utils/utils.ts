import { Episode, Season, Show, WatchState, WatchStatus } from '../types';
import { API_BASE_URL } from './env';

/**
 * URL for streaming or downloading a media file. Each path segment is
 * percent-encoded individually so spaces and other special characters in
 * filenames survive, while the `/` separators stay intact for routing.
 */
export function mediaUrl(path: string): string {
    const encoded = path.split('/').map(encodeURIComponent).join('/');
    return `${API_BASE_URL}/media/${encoded}`;
}

export function posterTransitionName(showName: string): string {
    return `show-poster-${sanitizeTransitionName(showName)}`;
}

/** Shared view-transition name to morph a title's text into its position on the destination page. */
export function titleTransitionName(key: string): string {
    return `title-${sanitizeTransitionName(key)}`;
}

function sanitizeTransitionName(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export function hasWatchProgress(ws?: WatchState): boolean {
    return !!ws?.finished || (ws?.last_position ?? 0) > 0;
}

/** Coarse watch status for a single item, or `undefined` when untouched. */
export function watchStatus(ws?: WatchState): WatchStatus | undefined {
    if (ws?.finished) {
        return 'finished';
    }
    if ((ws?.last_position ?? 0) > 0) {
        return 'in-progress';
    }
    return undefined;
}

/** The episode to play next in a show, with whether it is a resume or a fresh start. */
export type NextUp = {
    episode: Episode;
    season: Season;
    resume: boolean;
};

/**
 * Picks the episode "Play next" should jump to: the first partially-watched
 * episode if there is one, otherwise the first unfinished episode in order.
 * Returns `undefined` once every episode is finished.
 */
export function nextEpisode(
    show: Show,
    watchStates: Record<string, WatchState>
): NextUp | undefined {
    let firstUnfinished: NextUp | undefined;

    for (const season of show.seasons) {
        for (const episode of season.episodes) {
            const ws = watchStates[episode.path];
            if (ws?.finished) {
                continue;
            }
            if ((ws?.last_position ?? 0) > 0) {
                return { episode, season, resume: true };
            }
            firstUnfinished ??= { episode, season, resume: false };
        }
    }

    return firstUnfinished;
}
