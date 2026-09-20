import React, { useContext } from 'react';
import { getLibrary } from '../api/client';
import useFetch from '../common/useFetch';
import { MediaLibrary } from '../types';
import { StorageContext } from './StorageContext';

type ILibrary = {
    library: MediaLibrary | null;
    loading: boolean;
    error: string;
};

const defaultState: ILibrary = {
    library: null,
    loading: true,
    error: ''
};

export const LibraryContext = React.createContext<ILibrary>(defaultState);

type Props = {
    children?: React.ReactNode;
};

export const LibraryProvider = ({ children }: Props) => {
    const { id } = useContext(StorageContext);
    const { data, loading, error } = useFetch(
        id !== undefined ? getLibrary : null
    );

    return (
        <LibraryContext.Provider
            value={{
                library: data,
                loading,
                error: error ? 'Failed to load media library' : ''
            }}
        >
            {children}
        </LibraryContext.Provider>
    );
};
