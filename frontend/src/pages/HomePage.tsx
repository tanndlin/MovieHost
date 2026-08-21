import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { startTransition, useContext, useMemo, useState } from 'react';
import MediaCard from '../components/MediaCard';
import { LibraryContext } from '../contexts/LibraryContext';
import { StorageContext } from '../contexts/StorageContext';
import { WatchState, type Show } from '../types';
import {
    hasWatchProgress,
    posterTransitionName,
    titleTransitionName
} from '../utils/utils';

function showWatchProgress(
    show: Show,
    watchStates: Record<string, WatchState>
): { watched: number; total: number; anyProgress: boolean } {
    const episodes = show.seasons.flatMap((s) => s.episodes);
    const watched = episodes.filter(
        (ep) => watchStates[ep.path]?.finished
    ).length;
    const anyProgress = episodes.some((ep) =>
        hasWatchProgress(watchStates[ep.path])
    );
    return { watched, total: episodes.length, anyProgress };
}

const HomePage = () => {
    const { id, profile, setWatchState, unwatchPaths } =
        useContext(StorageContext);
    const { library, loading, error } = useContext(LibraryContext);
    const [query, setQuery] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const watchStates = profile?.watch_states || {};

    const handleQueryChange = (value: string) => {
        setQuery(value);
        startTransition(() => {
            setSearchQuery(value);
        });
    };

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = useMemo(() => {
        if (!library) {
            return { shows: [], movies: [], other: [] };
        }
        if (!normalizedQuery) {
            return library;
        }

        return {
            shows: library.shows.filter((show) =>
                show.name.toLowerCase().includes(normalizedQuery)
            ),
            movies: library.movies.filter((movie) =>
                movie.name.toLowerCase().includes(normalizedQuery)
            ),
            other: library.other.filter((file) =>
                file.name.toLowerCase().includes(normalizedQuery)
            )
        };
    }, [library, normalizedQuery]);

    if (id === undefined) {
        return (
            <main className="flex items-center justify-center p-8 min-h-64">
                <p className="text-lg text-white/60 animate-pulse">
                    Please select a profile or create a new one...
                </p>
            </main>
        );
    }

    if (loading) {
        return (
            <main className="flex items-center justify-center p-8 min-h-64">
                <p className="text-lg text-white/60 animate-pulse">
                    Loading media library...
                </p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="flex items-center justify-center p-8 min-h-64">
                <p className="text-red-400">{error}</p>
            </main>
        );
    }

    const { shows: allShows, movies: allMovies, other: allOther } = library!;
    const { shows, movies, other } = filtered;
    const hasLibrary =
        allShows.length > 0 || allMovies.length > 0 || allOther.length > 0;
    const hasResults =
        shows.length > 0 || movies.length > 0 || other.length > 0;

    return (
        <main className="w-full max-w-screen-xl p-6 mx-auto">
            {hasLibrary && (
                <div className="relative max-w-md mb-8">
                    <MagnifyingGlassIcon className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3 top-1/2 text-white/40" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => handleQueryChange(e.target.value)}
                        placeholder="Search your library..."
                        className="w-full py-2 pl-9 pr-9 text-sm !text-white placeholder-white/40 bg-white/5 border rounded-lg outline-none border-white/10 focus:border-white/25"
                    />
                    {query && (
                        <button
                            onClick={() => handleQueryChange('')}
                            title="Clear search"
                            className="absolute -translate-y-1/2 right-3 top-1/2 text-white/40 hover:text-white/80"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}

            {shows.length > 0 && (
                <section className="mb-10">
                    <h2 className="flex items-center gap-2.5 mb-5 text-xl font-bold text-white">
                        <span className="inline-block w-1 h-5 bg-blue-500 rounded-full shrink-0" />
                        TV Shows
                    </h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {shows.map((show) => {
                            const { watched, total, anyProgress } =
                                showWatchProgress(show, watchStates);
                            const seasonCount = show.seasons.length;
                            const seasonLabel = `${seasonCount} season${seasonCount !== 1 ? 's' : ''}`;
                            const progressLabel =
                                watched > 0
                                    ? ` · ${watched}/${total} watched`
                                    : '';
                            const allFinished = total > 0 && watched === total;
                            return (
                                <MediaCard
                                    key={show.name}
                                    to={`/show/${encodeURIComponent(show.name)}`}
                                    title={show.name}
                                    subtitle={`${seasonLabel}${progressLabel}`}
                                    icon="📺"
                                    posterName={posterTransitionName(show.name)}
                                    titleName={titleTransitionName(show.name)}
                                    path={
                                        show.seasons[0]?.episodes[0]?.path || ''
                                    }
                                    watchState={
                                        allFinished
                                            ? {
                                                  last_position: 0,
                                                  finished: true,
                                                  movie_path:
                                                      show.seasons[0]
                                                          ?.episodes[0]?.path ||
                                                      ''
                                              }
                                            : anyProgress
                                              ? {
                                                    last_position: 1,
                                                    finished: false,
                                                    movie_path:
                                                        show.seasons[0]
                                                            ?.episodes[0]
                                                            ?.path || ''
                                                }
                                              : undefined
                                    }
                                    onUnwatch={
                                        anyProgress
                                            ? () =>
                                                  unwatchPaths(
                                                      show.seasons.flatMap(
                                                          (s) =>
                                                              s.episodes.map(
                                                                  (ep) =>
                                                                      ep.path
                                                              )
                                                      )
                                                  )
                                            : undefined
                                    }
                                />
                            );
                        })}
                    </div>
                </section>
            )}

            {movies.length > 0 && (
                <section className="mb-10">
                    <h2 className="flex items-center gap-2.5 mb-5 text-xl font-bold text-white">
                        <span className="inline-block w-1 h-5 bg-purple-500 rounded-full shrink-0" />
                        Movies
                    </h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {movies.map((movie) => (
                            <MediaCard
                                key={movie.path}
                                to={`/player?path=${encodeURIComponent(movie.path)}&title=${encodeURIComponent(movie.name)}`}
                                title={movie.name}
                                icon="🎬"
                                titleName={titleTransitionName(movie.path)}
                                path={movie.path}
                                watchState={watchStates[movie.path]}
                                onUnwatch={
                                    hasWatchProgress(watchStates[movie.path])
                                        ? () =>
                                              setWatchState(movie.path, {
                                                  movie_path: movie.path,
                                                  last_position: 0,
                                                  finished: false
                                              })
                                        : undefined
                                }
                            />
                        ))}
                    </div>
                </section>
            )}

            {other.length > 0 && (
                <section className="mb-10">
                    <h2 className="flex items-center gap-2.5 mb-5 text-xl font-bold text-white">
                        <span className="inline-block w-1 h-5 bg-gray-500 rounded-full shrink-0" />
                        Other
                    </h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {other.map((file) => (
                            <MediaCard
                                key={file.path}
                                to={`/player?path=${encodeURIComponent(file.path)}&title=${encodeURIComponent(file.name)}`}
                                title={file.name}
                                icon="📄"
                                titleName={titleTransitionName(file.path)}
                                path={file.path}
                                watchState={watchStates[file.path]}
                                onUnwatch={
                                    hasWatchProgress(watchStates[file.path])
                                        ? () =>
                                              setWatchState(file.path, {
                                                  movie_path: file.path,
                                                  last_position: 0,
                                                  finished: false
                                              })
                                        : undefined
                                }
                            />
                        ))}
                    </div>
                </section>
            )}

            {!hasResults && hasLibrary && (
                <div className="flex flex-col items-center justify-center py-24 text-white/40">
                    <span className="mb-4 text-6xl">🔍</span>
                    <p className="text-lg">
                        No results for &quot;{query}&quot;
                    </p>
                    <p className="mt-1 text-sm">Try a different search term</p>
                </div>
            )}

            {!hasLibrary && (
                <div className="flex flex-col items-center justify-center py-24 text-white/40">
                    <span className="mb-4 text-6xl">📂</span>
                    <p className="text-lg">No media found</p>
                    <p className="mt-1 text-sm">
                        Make sure your media volume is mounted correctly
                    </p>
                </div>
            )}
        </main>
    );
};

export default HomePage;
