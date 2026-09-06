import React, { useCallback, useEffect, useMemo } from 'react';
import { Profile, WatchState } from '../types';

type IStorage = {
    id: number;
    setID: (id: number | undefined) => void;
    profile?: Profile;
    setWatchState: (path: string, ws: WatchState) => void;
    unwatchPath: (path: string) => void;
    unwatchPaths: (paths: string[]) => void;
};

const defaultState: IStorage = {
    id: 0,
    setID: () => {},
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

/** Persist a single watch state to the backend. Fire-and-forget. */
function putWatchState(id: number | undefined, ws: WatchState) {
    return fetch(`/api/profile/${id}/watch_state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            movie_path: ws.movie_path,
            last_position: ws.last_position,
            finished: ws.finished
        })
    }).catch((err) => console.error(err));
}

export const StorageContext = React.createContext<IStorage>(defaultState);

export const StorageProvider = ({ children }: Props) => {
    const [id, setID] = React.useState<number | undefined>(
        localStorage.getItem('profileID')
            ? parseInt(localStorage.getItem('profileID') as string, 10) ||
                  undefined
            : undefined
    );
    const [profile, setProfile] = React.useState<Profile | undefined>(
        undefined
    );

    useEffect(() => {
        if (id === undefined) {
            localStorage.removeItem('profileID');
        } else {
            localStorage.setItem('profileID', `${id}`);
        }
    }, [id]);

    useEffect(() => {
        if (id === undefined) {
            return;
        }

        if (id === -1) {
            createNewProfile().then((newProfile) => {
                if (newProfile) {
                    setID(newProfile.id);
                }
            });
            return;
        }

        fetch(`/api/profile/${id}`)
            .then((res) => {
                if (res.status === 404) {
                    console.warn('Profile not found');
                    setID(undefined);
                    localStorage.removeItem('profileID');
                    return null;
                }
                return res.json();
            })
            .then((data) => {
                if (data) {
                    setProfile(data);
                }
            })
            .catch((err) => {
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

            putWatchState(id, next);
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
                putWatchState(id, resetStates[path]);
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
            id: id!,
            setID,
            profile,
            setWatchState,
            unwatchPath,
            unwatchPaths
        }),
        [id, profile, setWatchState, unwatchPath, unwatchPaths]
    );

    return (
        <StorageContext.Provider value={state}>
            {children}
        </StorageContext.Provider>
    );
};

function createNewProfile() {
    return fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
        .then((res) => res.json())
        .catch((err) => {
            console.error('Failed to create new profile', err);
            return null;
        });
}
