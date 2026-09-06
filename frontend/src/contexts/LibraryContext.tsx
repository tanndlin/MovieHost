import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react';
import { MediaLibrary } from '../types';
import { API_BASE_URL } from '../utils/env';
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
    const [library, setLibrary] = useState<MediaLibrary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (id === undefined) {
            return;
        }

        axios
            .get<MediaLibrary>(`${API_BASE_URL}/library`)
            .then((res) => {
                setLibrary(res.data);
            })
            .catch(() => setError('Failed to load media library'))
            .finally(() => setLoading(false));
    }, [id]);

    return (
        <LibraryContext.Provider value={{ library, loading, error }}>
            {children}
        </LibraryContext.Provider>
    );
};
