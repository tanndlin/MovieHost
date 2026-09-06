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

export function hasWatchProgress(ws?: {
    finished: boolean;
    last_position: number;
}): boolean {
    return !!ws?.finished || (ws?.last_position ?? 0) > 0;
}
