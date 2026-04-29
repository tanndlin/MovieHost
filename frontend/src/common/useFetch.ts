import { useCallback, useEffect, useState } from 'react';

export default function useFetch<T>(
    input: URL | RequestInfo,
    init?: RequestInit
) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<T | null>(null);
    const [_, setTick] = useState(0); // Used to trigger refetch

    const refetch = useCallback(() => setTick((t) => t + 1), []);

    useEffect(() => {
        setLoading(true);
        setError('');
        setData(null);

        fetch(input, init)
            .then((res) => {
                if (!res.ok) {
                    throw new Error(res.statusText);
                }
                return res.json() as Promise<T>;
            })
            .then(setData)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [input, init]);

    return { loading, error, data, refetch };
}
