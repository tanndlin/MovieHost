import axios from 'axios';
import { useEffect, useState } from 'react';
import MediaCard from '../components/MediaCard';
import { parseMediaLibrary, type MediaLibrary } from '../types/media';
import { API_BASE_URL } from '../utils/env';

const HomePage = () => {
    const [library, setLibrary] = useState<MediaLibrary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        axios
            .get<string[]>(`${API_BASE_URL}/ls`)
            .then((res) => {
                setLibrary(parseMediaLibrary(res.data));
            })
            .catch(() => setError('Failed to load media library'))
            .finally(() => setLoading(false));
    }, []);

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
        <main className="max-w-screen-xl p-6 mx-auto">
            {shows.length > 0 && (
                <section className="mb-10">
                    <h2 className="mb-4 text-2xl font-semibold text-white">
                        TV Shows
                    </h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {shows.map((show) => (
                            <MediaCard
                                key={show.name}
                                to={`/show/${encodeURIComponent(show.name)}`}
                                title={show.name}
                                subtitle={`${show.seasons.length} season${show.seasons.length !== 1 ? 's' : ''}`}
                                icon="📺"
                            />
                        ))}
                    </div>
                </section>
            )}

            {movies.length > 0 && (
                <section className="mb-10">
                    <h2 className="mb-4 text-2xl font-semibold text-white">
                        Movies
                    </h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {movies.map((movie) => (
                            <MediaCard
                                key={movie.path}
                                to={`/player?path=${encodeURIComponent(movie.path)}&title=${encodeURIComponent(movie.name)}`}
                                title={movie.name}
                                icon="🎬"
                            />
                        ))}
                    </div>
                </section>
            )}

            {other.length > 0 && (
                <section className="mb-10">
                    <h2 className="mb-4 text-2xl font-semibold text-white">
                        Other
                    </h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {other.map((file) => (
                            <MediaCard
                                key={file.path}
                                to={`/player?path=${encodeURIComponent(file.path)}&title=${encodeURIComponent(file.name)}`}
                                title={file.name}
                                icon="📄"
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
