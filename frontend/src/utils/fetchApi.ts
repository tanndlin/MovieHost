import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from './env';

export function useFetchApi<T>(endpoint: string) {
    const [data, setData] = useState(null as T | null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`);
            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const result = await response.json();
            setData(result);
        } catch (err) {
            setError('Failed to fetch data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [endpoint]);

    const refetch = () => {
        if (!error) {
            fetchData();
        }
    };

    useEffect(() => {
        fetchData();
    }, [endpoint, fetchData]);

    return { data, loading, error, refetch };
}
