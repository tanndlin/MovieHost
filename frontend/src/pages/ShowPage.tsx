import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AnimatedLink from '../common/AnimatedLink';
import { parseMediaLibrary, type Show } from '../types/media';
import { API_BASE_URL } from '../utils/env';

const ShowPage = () => {
    const { name } = useParams<{ name: string }>();
    const navigate = useNavigate();
    const [show, setShow] = useState<Show | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openSeason, setOpenSeason] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API_BASE_URL}/ls`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error(res.statusText);
                }
                return res.json() as Promise<string[]>;
            })
            .then((paths) => {
                const lib = parseMediaLibrary(paths);
                const found = lib.shows.find(
                    (s) => s.name === decodeURIComponent(name ?? '')
                );
                if (found) {
                    setShow(found);
                    if (found.seasons.length > 0) {
                        setOpenSeason(found.seasons[0].name);
                    }
                } else {
                    setError('Show not found');
                }
            })
            .catch(() => setError('Failed to load media library'))
            .finally(() => setLoading(false));
    }, [name]);

    if (loading) {
        return (
            <main className="flex items-center justify-center p-8 min-h-64">
                <p className="text-lg text-white/60 animate-pulse">
                    Loading...
                </p>
            </main>
        );
    }

    if (error || !show) {
        return (
            <main className="p-8">
                <p className="text-red-400">{error || 'Show not found'}</p>
                <AnimatedLink
                    to="/"
                    className="inline-block mt-4 text-gray-400 hover:underline"
                >
                    &larr; Back
                </AnimatedLink>
            </main>
        );
    }

    return (
        <main className="max-w-screen-lg p-6 mx-auto">
            <div className="mb-6">
                <AnimatedLink
                    to="/"
                    className="text-sm transition-colors text-white/50 hover:text-white"
                >
                    &larr; Back to Library
                </AnimatedLink>
                <h1 className="mt-2 text-3xl font-bold text-white">
                    {show.name}
                </h1>
                <p className="mt-1 text-sm text-white/50">
                    {show.seasons.length} season
                    {show.seasons.length !== 1 ? 's' : ''} &middot;{' '}
                    {show.seasons.reduce((a, s) => a + s.episodes.length, 0)}{' '}
                    episodes
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {show.seasons.map((season) => (
                    <div
                        key={season.name}
                        className="overflow-hidden border rounded-xl border-white/10"
                    >
                        <button
                            onClick={() =>
                                setOpenSeason(
                                    openSeason === season.name
                                        ? null
                                        : season.name
                                )
                            }
                            className="flex items-center justify-between w-full px-5 py-3 text-left transition-colors bg-white/5 hover:bg-white/10"
                        >
                            <span className="font-semibold text-white">
                                {season.name}
                            </span>
                            <span className="text-sm text-white/40">
                                {season.episodes.length} episode
                                {season.episodes.length !== 1 ? 's' : ''}{' '}
                                {openSeason === season.name ? '▲' : '▼'}
                            </span>
                        </button>

                        {openSeason === season.name && (
                            <ul className="divide-y divide-white/5">
                                {season.episodes.map((ep) => (
                                    <li key={ep.path}>
                                        <button
                                            onClick={() =>
                                                navigate(
                                                    `/player?path=${encodeURIComponent(ep.path)}&title=${encodeURIComponent(ep.name)}`
                                                )
                                            }
                                            className="flex items-center w-full gap-4 px-5 py-3 text-left transition-colors hover:bg-white/5 group"
                                        >
                                            <span className="w-8 text-xs text-white/30 shrink-0">
                                                {ep.episode
                                                    ? `E${ep.episode.padStart(2, '0')}`
                                                    : ''}
                                            </span>
                                            <span className="text-sm truncate transition-colors text-white/80 group-hover:text-white">
                                                {ep.name}
                                            </span>
                                            <span className="ml-auto transition-colors text-white/20 group-hover:text-white/60 shrink-0">
                                                ▶
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
        </main>
    );
};

export default ShowPage;
