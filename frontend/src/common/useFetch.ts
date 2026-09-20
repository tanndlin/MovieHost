import { useCallback, useEffect, useState } from 'react';

/**
 * Runs `fetcher` and tracks its loading/error/data state, or stays idle when
 * it is `null`.
 *
 * `fetcher` is the effect's dependency, so it must be referentially stable —
 * a module-level function from `src/api/client`, or wrapped in `useCallback` /
 * `useMemo`.
 */
export default function useFetch<T>(fetcher: (() => Promise<T>) | null) {
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

        if (fetcher === null) {
            setLoading(false);
            return;
        }

        fetcher()
            .then((result) => {
                if (!ignore) {
                    setData(result);
                }
            })
            .catch((err: unknown) => {
                if (!ignore) {
                    setError(
                        err instanceof Error ? err.message : 'Request failed'
                    );
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
    }, [fetcher, tick]);

    return { loading, error, data, refetch };
}
