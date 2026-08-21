import { ViewTransition } from 'react';
import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useFetch from '../../common/useFetch';
import { LibraryContext } from '../../contexts/LibraryContext';
import { StorageContext } from '../../contexts/StorageContext';
import { Season, Show, ShowDetailsResponse } from '../../types';
import { API_BASE_URL } from '../../utils/env';
import { hasWatchProgress, posterTransitionName } from '../../utils/utils';
import SeasonDropdown from './SeasonDropdown';

const ShowPage = () => {
    const { name } = useParams<{ name: string }>();
    const showName = decodeURIComponent(name ?? '');
    const [show, setShow] = useState<Show | null>(null);
    const [openSeason, setOpenSeason] = useState<string | null>(null);
    const { profile, setWatchState, unwatchPaths } = useContext(StorageContext);
    const watchStates = profile?.watch_states || {};
    const watchStatesRef = useRef(watchStates);
    watchStatesRef.current = watchStates;

    const handleUnwatchEpisode = (path: string) => {
        setWatchState(path, {
            movie_path: path,
            last_position: 0,
            finished: false
        });
    };

    const handleUnwatchSeason = (season: Season) => {
        unwatchPaths(season.episodes.map((ep) => ep.path));
    };

    const handleUnwatchShow = () => {
        if (!show) {
            return;
        }
        unwatchPaths(
            show.seasons.flatMap((s) => s.episodes.map((ep) => ep.path))
        );
    };

    const showHasProgress = show?.seasons.some((s) =>
        s.episodes.some((ep) => hasWatchProgress(watchStates[ep.path]))
    );

    const { library, loading, error } = useContext(LibraryContext);

    // Derived directly from the route param so the poster can render (and
    // participate in the view transition) before the library fetch resolves.
    const basePath = `Shows/${showName}`;
    const { data: detailsData } = useFetch<ShowDetailsResponse>(
        showName
            ? `${API_BASE_URL}/details?path=${encodeURIComponent(basePath)}`
            : null
    );
    const poster = `${API_BASE_URL}/thumbnail?path=${encodeURIComponent(basePath)}`;

    useEffect(() => {
        if (library) {
            const found = library.shows.find((s) => s.name === showName);
            if (found) {
                setShow(found);
                const currentWatchStates = watchStatesRef.current;
                const firstUnwatched = found.seasons.find(
                    (s) =>
                        !s.episodes.every(
                            (ep) => currentWatchStates[ep.path]?.finished
                        )
                );
                setOpenSeason(firstUnwatched?.name ?? null);
            }
        }
    }, [library, showName]);

    return (
        <main className="max-w-screen-lg p-6 mx-auto w-full">
            <div className="mb-8 flex gap-4 justify-between">
                <div>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-sm transition-colors text-white/40 hover:text-white/80 mb-4"
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <path
                                d="M19 12H5M5 12l7 7M5 12l7-7"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        Back to Library
                    </Link>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            {show?.name ?? showName}
                        </h1>
                        {showHasProgress && (
                            <button
                                onClick={handleUnwatchShow}
                                title="Mark entire show as unwatched"
                                className="text-xs font-medium text-white/40 transition-colors hover:text-red-400"
                            >
                                Mark unwatched
                            </button>
                        )}
                    </div>
                    {show && (
                        <p className="mt-1.5 text-sm text-white/40 mb-4">
                            {show.seasons.length} season
                            {show.seasons.length !== 1 ? 's' : ''} &middot;{' '}
                            {show.seasons.reduce(
                                (a, s) => a + s.episodes.length,
                                0
                            )}{' '}
                            episodes &middot; Released on{' '}
                            {detailsData?.release_date || 'Unknown'}
                        </p>
                    )}
                    <p>{detailsData?.overview}</p>
                </div>
                <ViewTransition name={posterTransitionName(showName)}>
                    <img id="poster" src={poster} alt="Poster" />
                </ViewTransition>
            </div>

            {loading ? (
                <p className="text-lg text-white/60 animate-pulse">
                    Loading...
                </p>
            ) : error ? (
                <p className="text-red-400">{error}</p>
            ) : !show ? (
                <p className="text-red-400">Show not found</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {show.seasons.map((season) => (
                        <SeasonDropdown
                            key={season.name}
                            {...{
                                season,
                                setOpenSeason,
                                openSeason,
                                watchStates,
                                onUnwatchEpisode: handleUnwatchEpisode,
                                onUnwatchSeason: handleUnwatchSeason
                            }}
                        />
                    ))}
                </div>
            )}
        </main>
    );
};

export default ShowPage;
