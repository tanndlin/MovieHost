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

export type WatchState = {
    last_position: number;
    finished: boolean;
    movie_path: string;
};

/** Coarse watch status derived from a `WatchState`, for badge rendering. */
export type WatchStatus = 'finished' | 'in-progress';

export type Profile = {
    id: string;
    username: string;
    watch_states: {
        [showName: string]: WatchState;
    };
};

export type ShowDetailsResponse = {
    overview: string;
    release_date: string;
};
