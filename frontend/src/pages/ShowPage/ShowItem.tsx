import { ViewTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { Episode, EpisodeDetails, WatchState } from '../../types';
import { stillUrl, titleTransitionName } from '../../utils/utils';

type ShowItemProps = {
    ep: Episode;
    /** TMDB metadata, when the season lookup found this episode. */
    details?: EpisodeDetails;
    watchStates: Record<string, WatchState>;
    onUnwatch: (path: string) => void;
};

const ShowItem = ({ ep, details, watchStates, onUnwatch }: ShowItemProps) => {
    const navigate = useNavigate();
    const ws = watchStates[ep.path];
    const finished = ws?.finished;
    const inProgress = !finished && (ws?.last_position ?? 0) > 0;
    const goToPlayer = () =>
        navigate(
            `/player?path=${encodeURIComponent(ep.path)}&title=${encodeURIComponent(ep.name)}`
        );

    return (
        <li key={ep.path}>
            <div
                role="button"
                tabIndex={0}
                onClick={goToPlayer}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        goToPlayer();
                    }
                }}
                className={`flex items-center w-full gap-4 px-5 py-3 text-left transition-colors group cursor-pointer ${finished ? 'hover:bg-green-950/30' : inProgress ? 'hover:bg-amber-950/30' : 'hover:bg-white/[0.04]'}`}
            >
                <span className="w-8 text-xs font-mono text-white/25 shrink-0">
                    {ep.episode ? `E${ep.episode.padStart(2, '0')}` : ''}
                </span>
                {details?.still_path && (
                    <img
                        src={stillUrl(details.still_path)}
                        alt=""
                        loading="lazy"
                        className="hidden object-cover w-28 rounded aspect-video shrink-0 bg-white/5 sm:block"
                    />
                )}
                <div className="flex-1 min-w-0">
                    <ViewTransition name={titleTransitionName(ep.path)}>
                        <span className="block text-sm truncate transition-colors text-white/70 group-hover:text-white">
                            {details?.name || ep.name}
                        </span>
                    </ViewTransition>
                    {details && (
                        <>
                            <span className="block mt-0.5 text-xs text-white/30">
                                {[
                                    details.air_date,
                                    details.runtime
                                        ? `${details.runtime}m`
                                        : null
                                ]
                                    .filter(Boolean)
                                    .join(' \u00b7 ')}
                            </span>
                            {details.overview && (
                                <p className="mt-1 text-xs text-white/40 line-clamp-2">
                                    {details.overview}
                                </p>
                            )}
                        </>
                    )}
                </div>
                <span className="flex items-center gap-2 ml-auto shrink-0">
                    {finished && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUnwatch(ep.path);
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            title="Mark as unwatched"
                            className="group/badge flex items-center justify-center w-4 h-4 text-xs font-bold text-green-400 bg-green-500/15 rounded-full transition-colors hover:bg-red-500/20 hover:text-red-400"
                        >
                            <span className="group-hover/badge:hidden">✓</span>
                            <span className="hidden group-hover/badge:inline">
                                ✕
                            </span>
                        </button>
                    )}
                    {inProgress && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUnwatch(ep.path);
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            title="Reset progress"
                            className="group/badge flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/15 transition-colors hover:bg-red-500/20"
                        >
                            <span className="w-2 h-2 rounded-full bg-amber-400 group-hover/badge:hidden" />
                            <span className="hidden text-[10px] font-bold text-red-400 group-hover/badge:inline">
                                ✕
                            </span>
                        </button>
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
            </div>
        </li>
    );
};

export default ShowItem;
