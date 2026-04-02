import React, { useEffect } from 'react';

type IStorage = {
    // A mapping of show names to their watch state.
    watchStates: {
        [showName: string]: WatchState;
    };
    setWatchStates: React.Dispatch<
        React.SetStateAction<{
            [showName: string]: WatchState;
        }>
    >;
};

type WatchState = {
    // The last position the user was at in the video, in seconds.
    lastPosition: number;
    // Whether the user has finished watching the video.
    finished: boolean;
};

const defaultState: IStorage = {
    watchStates: {},
    setWatchStates: () => {}
};

type Props = {
    children?: React.ReactNode;
};

export const StorageContext = React.createContext<IStorage>(defaultState);

export const StorageProvider = ({ children }: Props) => {
    const [watchStates, setWatchStates] = React.useState<{
        [showName: string]: WatchState;
    }>(defaultState.watchStates);

    useEffect(() => {
        // Load watch states from localStorage on mount.
        const storedWatchStates = localStorage.getItem('watchStates');
        if (storedWatchStates) {
            setWatchStates(JSON.parse(storedWatchStates));
        }
    }, []);

    useEffect(() => {
        // Save watch states to localStorage whenever they change.
        localStorage.setItem('watchStates', JSON.stringify(watchStates));

        console.log('Updated watch states:', watchStates);
    }, [watchStates]);

    const state: IStorage = {
        watchStates,
        setWatchStates
    };

    return (
        <StorageContext.Provider value={state}>
            {children}
        </StorageContext.Provider>
    );
};
