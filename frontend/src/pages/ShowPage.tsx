import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AnimatedLink from '../common/AnimatedLink';
import useFetch from '../common/useFetch';
import { StorageContext } from '../contexts/StorageContext';
import { type Show } from '../types';
import { API_BASE_URL } from '../utils/env';
import { parseMediaLibrary } from '../utils/utils';

const ShowPage = () => {
    const { name } = useParams<{ name: string }>();
    const navigate = useNavigate();
    const [show, setShow] = useState<Show | null>(null);
    const [openSeason, setOpenSeason] = useState<string | null>(null);
    const { profile } = useContext(StorageContext);
    const watchStates = profile?.watch_states || {};

    const { loading, error, data } = useFetch<string[]>(`${API_BASE_URL}/ls`);

    useEffect(() => {
        if (data) {
            const lib = parseMediaLibrary(data);
            const found = lib.shows.find(
                (s) => s.name === decodeURIComponent(name ?? '')
            );
            if (found) {
                setShow(found);
                if (found.seasons.length > 0) {
                    setOpenSeason(found.seasons[0].name);
                }
            }
        }
    }, [data, name]);

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
            <div className="mb-8">
                <AnimatedLink
                    to="/"
                    className="inline-flex items-center gap-1.5 text-sm transition-colors text-white/40 hover:text-white/80 mb-4"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M19 12H5M5 12l7 7M5 12l7-7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    Back to Library
                </AnimatedLink>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    {show.name}
                </h1>
                <p className="mt-1.5 text-sm text-white/40">
                    {show.seasons.length} season
                    {show.seasons.length !== 1 ? 's' : ''} &middot;{' '}
                    {show.seasons.reduce((a, s) => a + s.episodes.length, 0)}{' '}
                    episodes
                </p>
            </div>

            <div className="flex flex-col gap-2">
                {show.seasons.map((season) => (
                    <div
                        key={season.name}
                        className="overflow-hidden rounded-xl ring-1 ring-white/10"
                    >
                        <button
                            onClick={() =>
                                setOpenSeason(
                                    openSeason === season.name
                                        ? null
                                        : season.name
                                )
                            }
                            className="flex items-center justify-between w-full px-5 py-3.5 text-left transition-colors bg-white/[0.04] hover:bg-white/[0.08]"
                        >
                            <span className="font-semibold text-white">
                                {season.name}
                            </span>
                            <span className="flex items-center gap-2 text-sm text-white/40">
                                {season.episodes.length} episode
                                {season.episodes.length !== 1 ? 's' : ''}
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className={`transition-transform duration-200 ${openSeason === season.name ? 'rotate-180' : ''}`}
                                >
                                    <path
                                        d="M6 9l6 6 6-6"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </span>
                        </button>

                        {openSeason === season.name && (
                            <ul className="divide-y divide-white/5">
                                {season.episodes.map((ep) => {
                                    const ws = watchStates[ep.path];
                                    const finished = ws?.finished;
                                    const inProgress =
                                        !finished &&
                                        (ws?.last_position ?? 0) > 0;
                                    return (
                                        <li key={ep.path}>
                                            <button
                                                onClick={() =>
                                                    navigate(
                                                        `/player?path=${encodeURIComponent(ep.path)}&title=${encodeURIComponent(ep.name)}`
                                                    )
                                                }
                                                className={`flex items-center w-full gap-4 px-5 py-3 text-left transition-colors group ${finished ? 'hover:bg-green-950/30' : inProgress ? 'hover:bg-amber-950/30' : 'hover:bg-white/[0.04]'}`}
                                            >
                                                <span className="w-8 text-xs font-mono text-white/25 shrink-0">
                                                    {ep.episode
                                                        ? `E${ep.episode.padStart(2, '0')}`
                                                        : ''}
                                                </span>
                                                <span className="flex-1 text-sm truncate transition-colors text-white/70 group-hover:text-white">
                                                    {ep.name}
                                                </span>
                                                <span className="flex items-center gap-2 ml-auto shrink-0">
                                                    {finished && (
                                                        <span className="flex items-center justify-center w-4 h-4 text-xs font-bold text-green-400 bg-green-500/15 rounded-full">
                                                            ✓
                                                        </span>
                                                    )}
                                                    {inProgress && (
                                                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                                                    )}
                                                    <svg
                                                        width="14"
                                                        height="14"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                        className="text-white/20 transition-colors group-hover:text-white/60"
                                                    >
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
        </main>
    );
};

export default ShowPage;
