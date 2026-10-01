import { useCallback, useEffect, useState } from 'react';

type Settled<T> = {
    fetcher: (() => Promise<T>) | null;
    tick: number;
    data: T | null;
    error: string;
};

/**
 * Runs `fetcher` and tracks its loading/error/data state, or stays idle when
 * it is `null`.
 *
 * `fetcher` is the effect's dependency, so it must be referentially stable —
 * a module-level function from `src/api/client`, or wrapped in `useCallback` /
 * `useMemo`.
 */
export default function useFetch<T>(fetcher: (() => Promise<T>) | null) {
    const [tick, setTick] = useState(0);
    // The result of the most recent request, tagged with the request it
    // belongs to. Comparing the tag during render (rather than resetting state
    // in the effect) means a changed `fetcher` reads as loading immediately,
    // instead of exposing one render of `loading: false, data: null`.
    const [settled, setSettled] = useState<Settled<T> | null>(null);

    const refetch = useCallback(() => setTick((t) => t + 1), []);

    useEffect(() => {
        if (fetcher === null) {
            return;
        }

        let ignore = false;

        fetcher()
            .then((result) => {
                if (!ignore) {
                    setSettled({ fetcher, tick, data: result, error: '' });
                }
            })
            .catch((err: unknown) => {
                if (!ignore) {
                    setSettled({
                        fetcher,
                        tick,
                        data: null,
                        error:
                            err instanceof Error
                                ? err.message
                                : 'Request failed'
                    });
                }
            });

        return () => {
            ignore = true;
        };
    }, [fetcher, tick]);

    const current =
        settled !== null &&
        settled.fetcher === fetcher &&
        settled.tick === tick;

    return {
        loading: fetcher !== null && !current,
        error: current ? settled.error : '',
        data: current ? settled.data : null,
        refetch
    };
}
