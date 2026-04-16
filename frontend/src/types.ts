export type MediaFile = {
    path: string;
    name: string;
    ext: string;
};

export type Episode = {
    name: string;
    path: string;
    season: string;
    episode: string | null;
};

export type Season = {
    name: string;
    episodes: Episode[];
};

export type Show = {
    name: string;
    basePath: string;
    seasons: Season[];
};

export type Movie = {
    name: string;
    path: string;
};

export type MediaLibrary = {
    shows: Show[];
    movies: Movie[];
    other: MediaFile[];
};

export const VIDEO_EXTENSIONS = new Set([
    'mp4',
    'mkv',
    'avi',
    'mov',
    'wmv',
    'flv',
    'webm',
    'm4v',
    'mpg',
    'mpeg',
    'ts',
    'm2ts'
]);

export type WatchState = {
    last_position: number;
    finished: boolean;
    movie_path: string;
};

export type Profile = {
    id: string;
    name: string;
    watch_states: {
        [showName: string]: WatchState;
    };
};
