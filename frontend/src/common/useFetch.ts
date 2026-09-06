import { useCallback, useEffect, useState } from 'react';

export default function useFetch<T>(input: URL | RequestInfo | null) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<T | null>(null);
    const [tick, setTick] = useState(0);

    const refetch = useCallback(() => setTick((t) => t + 1), []);

    useEffect(() => {
        let ignore = false;

        setLoading(true);
        setError('');
        setData(null);

        if (input === null) {
            setLoading(false);
            return;
        }

        fetch(input)
            .then((res) => {
                if (!res.ok) {
                    throw new Error(res.statusText);
                }
                return res.json() as Promise<T>;
            })
            .then((json) => {
                if (!ignore) {
                    setData(json);
                }
            })
            .catch((err) => {
                if (!ignore) {
                    setError(err.message);
                }
            })
            .finally(() => {
                if (!ignore) {
                    setLoading(false);
                }
            });

        return () => {
            ignore = true;
        };
    }, [input, tick]);

    return { loading, error, data, refetch };
}
