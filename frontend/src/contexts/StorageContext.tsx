import React, { useCallback, useEffect, useMemo } from 'react';
import {
    ApiError,
    createProfile as createProfileRequest,
    getProfile,
    putWatchState
} from '../api/client';
import { ProfileResponse, WatchState } from '../types';

type IStorage = {
    id: number | undefined;
    setID: (id: number | undefined) => void;
    createProfile: () => void;
    profile?: ProfileResponse;
    setWatchState: (path: string, ws: WatchState) => void;
    unwatchPath: (path: string) => void;
    unwatchPaths: (paths: string[]) => void;
};

const defaultState: IStorage = {
    id: undefined,
    setID: () => {},
    createProfile: () => {},
    profile: undefined,
    setWatchState: () => {},
    unwatchPath: () => {},
    unwatchPaths: () => {}
};

type Props = {
    children?: React.ReactNode;
};

/** A freshly-reset (unwatched) watch state for `path`. */
const resetWatchState = (path: string): WatchState => ({
    movie_path: path,
    last_position: 0,
    finished: false
});

/** Persist a single watch state. Fire-and-forget; failures are logged. */
function persistWatchState(id: number | undefined, ws: WatchState) {
    if (id === undefined) {
        return;
    }

    putWatchState(id, ws).catch((err) => console.error(err));
}

export const StorageContext = React.createContext<IStorage>(defaultState);

export const StorageProvider = ({ children }: Props) => {
    const [id, setID] = React.useState<number | undefined>(
        localStorage.getItem('profileID')
            ? parseInt(localStorage.getItem('profileID') as string, 10) ||
                  undefined
            : undefined
    );
    const [profile, setProfile] = React.useState<ProfileResponse | undefined>(
        undefined
    );

    useEffect(() => {
        if (id === undefined) {
            localStorage.removeItem('profileID');
        } else {
            localStorage.setItem('profileID', `${id}`);
        }
    }, [id]);

    const createProfile = useCallback(() => {
        createProfileRequest()
            .then((newProfile) => setID(newProfile.id))
            .catch((err) => console.error('Failed to create new profile', err));
    }, []);

    useEffect(() => {
        if (id === undefined) {
            return;
        }

        getProfile(id)
            .then(setProfile)
            .catch((err: unknown) => {
                if (err instanceof ApiError && err.status === 404) {
                    console.warn('Profile not found');
                    setID(undefined);
                    localStorage.removeItem('profileID');
                    return;
                }
                console.error(err);
            });
    }, [id]);

    const setWatchState = useCallback(
        (path: string, ws: WatchState) => {
            const next: WatchState = {
                ...ws,
                movie_path: ws.movie_path || path
            };

            setProfile((prev) => {
                if (!prev) {
                    console.error('No profile loaded, cannot set watch state');
                    return prev;
                }

                return {
                    ...prev,
                    watch_states: {
                        ...prev.watch_states,
                        [path]: next
                    }
                };
            });

            persistWatchState(id, next);
        },
        [id]
    );

    const unwatchPaths = useCallback(
        (paths: string[]) => {
            if (paths.length === 0) {
                return;
            }

            const resetStates: Record<string, WatchState> = {};
            for (const path of paths) {
                resetStates[path] = resetWatchState(path);
            }

            setProfile((prev) =>
                prev
                    ? {
                          ...prev,
                          watch_states: {
                              ...prev.watch_states,
                              ...resetStates
                          }
                      }
                    : prev
            );

            for (const path of paths) {
                persistWatchState(id, resetStates[path]);
            }
        },
        [id]
    );

    const unwatchPath = useCallback(
        (path: string) => unwatchPaths([path]),
        [unwatchPaths]
    );

    const state: IStorage = useMemo(
        () => ({
            id,
            setID,
            createProfile,
            profile,
            setWatchState,
            unwatchPath,
            unwatchPaths
        }),
        [id, createProfile, profile, setWatchState, unwatchPath, unwatchPaths]
    );

    return (
        <StorageContext.Provider value={state}>
            {children}
        </StorageContext.Provider>
    );
};
