import React, { useEffect } from 'react';
import { Profile, WatchState } from '../types';

type IStorage = {
    id: number;
    setID: (id: number | undefined) => void;
    profile?: Profile;
    setWatchState: (path: string, ws: WatchState) => void;
};

const defaultState: IStorage = {
    id: 0,
    setID: () => {},
    profile: undefined,
    setWatchState: () => {}
};

type Props = {
    children?: React.ReactNode;
};

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

    const setWatchState = (path: string, ws: WatchState) => {
        if (!profile) {
            console.error('No profile loaded, cannot set watch state');
            return;
        }

        setProfile({
            ...profile,
            watch_states: {
                ...profile.watch_states,
                [path]: ws
            }
        });

        fetch(`/api/profile/${id}/watch_state`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                movie_path: path,
                last_position: ws.last_position,
                finished: ws.finished
            })
        }).catch((err) => console.error(err));
    };

    const state: IStorage = {
        id: id!,
        setID,
        profile,
        setWatchState
    };

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
