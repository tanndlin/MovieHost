import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
                if (!res.ok) throw new Error(res.statusText);
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
            <main className="p-8 flex items-center justify-center min-h-64">
                <p className="text-white/60 text-lg animate-pulse">
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
                    className="text-blue-400 hover:underline mt-4 inline-block"
                >
                    &larr; Back
                </AnimatedLink>
            </main>
        );
    }

    return (
        <main className="p-6 max-w-screen-lg mx-auto">
            <div className="mb-6">
                <AnimatedLink
                    to="/"
                    className="text-white/50 hover:text-white text-sm transition-colors"
                >
                    &larr; Back to Library
                </AnimatedLink>
                <h1 className="text-white text-3xl font-bold mt-2">
                    {show.name}
                </h1>
                <p className="text-white/50 text-sm mt-1">
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
                        className="rounded-xl border border-white/10 overflow-hidden"
                    >
                        <button
                            onClick={() =>
                                setOpenSeason(
                                    openSeason === season.name
                                        ? null
                                        : season.name
                                )
                            }
                            className="w-full flex items-center justify-between px-5 py-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
                        >
                            <span className="text-white font-semibold">
                                {season.name}
                            </span>
                            <span className="text-white/40 text-sm">
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
                                            className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors text-left group"
                                        >
                                            <span className="text-white/30 text-xs w-8 shrink-0">
                                                {ep.episode
                                                    ? `E${ep.episode.padStart(2, '0')}`
                                                    : ''}
                                            </span>
                                            <span className="text-white/80 text-sm group-hover:text-white transition-colors truncate">
                                                {ep.name}
                                            </span>
                                            <span className="ml-auto text-white/20 group-hover:text-white/60 transition-colors shrink-0">
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
