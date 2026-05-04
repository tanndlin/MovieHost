import axios from 'axios';
import { useContext, useEffect, useState } from 'react';
import MediaCard from '../components/MediaCard';
import { StorageContext } from '../contexts/StorageContext';
import { WatchState, type MediaLibrary, type Show } from '../types';
import { API_BASE_URL } from '../utils/env';
import { parseMediaLibrary } from '../utils/utils';

function showWatchProgress(
    show: Show,
    watchStates: Record<string, WatchState>
): { watched: number; total: number } {
    const episodes = show.seasons.flatMap((s) => s.episodes);
    const watched = episodes.filter(
        (ep) => watchStates[ep.path]?.finished
    ).length;
    return { watched, total: episodes.length };
}

const HomePage = () => {
    const [library, setLibrary] = useState<MediaLibrary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { id, profile } = useContext(StorageContext);
    const watchStates = profile?.watch_states || {};

    useEffect(() => {
        if (id === undefined) {
            return;
        }

        axios
            .get<string[]>(`${API_BASE_URL}/ls`)
            .then((res) => {
                setLibrary(parseMediaLibrary(res.data));
            })
            .catch(() => setError('Failed to load media library'))
            .finally(() => setLoading(false));
    }, [id]);

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

    const { shows, movies, other } = library!;

    return (
        <main className="max-w-screen-xl p-6 mx-auto w-full">
            {shows.length > 0 && (
                <section className="mb-10">
                    <h2 className="flex items-center gap-2.5 mb-5 text-xl font-bold text-white">
                        <span className="w-1 h-5 rounded-full bg-blue-500 inline-block shrink-0" />
                        TV Shows
                    </h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {shows.map((show) => {
                            const { watched, total } = showWatchProgress(
                                show,
                                watchStates
                            );
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
                                            : watched > 0
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
                                />
                            );
                        })}
                    </div>
                </section>
            )}

            {movies.length > 0 && (
                <section className="mb-10">
                    <h2 className="flex items-center gap-2.5 mb-5 text-xl font-bold text-white">
                        <span className="w-1 h-5 rounded-full bg-purple-500 inline-block shrink-0" />
                        Movies
                    </h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {movies.map((movie) => (
                            <MediaCard
                                key={movie.path}
                                to={`/player?path=${encodeURIComponent(movie.path)}&title=${encodeURIComponent(movie.name)}`}
                                title={movie.name}
                                icon="🎬"
                                path={movie.path}
                                watchState={watchStates[movie.path]}
                            />
                        ))}
                    </div>
                </section>
            )}

            {other.length > 0 && (
                <section className="mb-10">
                    <h2 className="flex items-center gap-2.5 mb-5 text-xl font-bold text-white">
                        <span className="w-1 h-5 rounded-full bg-gray-500 inline-block shrink-0" />
                        Other
                    </h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {other.map((file) => (
                            <MediaCard
                                key={file.path}
                                to={`/player?path=${encodeURIComponent(file.path)}&title=${encodeURIComponent(file.name)}`}
                                title={file.name}
                                icon="📄"
                                path={file.path}
                                watchState={watchStates[file.path]}
                            />
                        ))}
                    </div>
                </section>
            )}

            {shows.length === 0 &&
                movies.length === 0 &&
                other.length === 0 && (
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
