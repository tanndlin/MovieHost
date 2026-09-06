import { WatchState, WatchStatus } from '../types';
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
