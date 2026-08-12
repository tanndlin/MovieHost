import { ViewTransition } from 'react';
import { Link } from 'react-router-dom';
import { WatchState } from '../types';
import { API_BASE_URL } from '../utils/env';

type Props = {
    title: string;
    to: string;
    subtitle?: string;
    icon?: string;
    path?: string;
    watchState?: WatchState;
    onUnwatch?: () => void;
};

const MediaCard = ({
    title,
    to,
    subtitle,
    icon,
    path,
    watchState,
    onUnwatch
}: Props) => {
    const finished = watchState?.finished;
    const inProgress = !finished && (watchState?.last_position ?? 0) > 0;

    // If its a show, just get the parent dir name
    const split = path?.split('/');
    const cleanPath =
        split && split.length > 2 ? split.slice(0, -1).join('/') : path;

    const thumbnailUrl = cleanPath
        ? `${API_BASE_URL}/thumbnail?path=${encodeURIComponent(cleanPath)}`
        : null;

    return (
        <ViewTransition enter="media-card-enter" exit="media-card-exit">
            <div className="relative group">
                <Link to={to} className="block">
                    <div className="relative overflow-hidden rounded-xl cursor-pointer ring-1 ring-white/10 shadow-lg transition-all duration-300 group-hover:ring-white/25 group-hover:shadow-2xl group-hover:shadow-black/70">
                        <div className="aspect-[2/3] relative bg-gradient-to-br from-gray-800 to-gray-900">
                            {thumbnailUrl ? (
                                <img
                                    src={thumbnailUrl}
                                    alt={title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-5xl opacity-50">
                                        {icon ?? '🎬'}
                                    </span>
                                </div>
                            )}

                            {/* Bottom gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />

                            {/* Title overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-sm font-semibold text-white truncate leading-snug">
                                    {title}
                                </p>
                                {subtitle && (
                                    <p className="text-xs text-white/55 mt-0.5 truncate">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </Link>

                {/* Status badge - kept outside the <a> so it isn't nested
                    interactive content inside another interactive element */}
                {finished &&
                    (onUnwatch ? (
                        <button
                            onClick={onUnwatch}
                            title="Mark as unwatched"
                            className="group/badge absolute top-2 right-2 flex items-center justify-center w-5 h-5 bg-green-600/90 backdrop-blur-sm text-white text-xs font-bold rounded-full transition-colors hover:bg-red-600/90"
                        >
                            <span className="group-hover/badge:hidden">✓</span>
                            <span className="hidden group-hover/badge:inline">
                                ✕
                            </span>
                        </button>
                    ) : (
                        <span className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 bg-green-600/90 backdrop-blur-sm text-white text-xs font-bold rounded-full">
                            ✓
                        </span>
                    ))}
                {inProgress &&
                    (onUnwatch ? (
                        <button
                            onClick={onUnwatch}
                            title="Reset progress"
                            className="group/badge absolute top-2 right-2 flex items-center justify-center w-5 h-5 bg-amber-500/90 backdrop-blur-sm rounded-full transition-colors hover:bg-red-600/90"
                        >
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/40 animate-pulse group-hover/badge:hidden" />
                            <span className="hidden text-white text-xs font-bold group-hover/badge:inline">
                                ✕
                            </span>
                        </button>
                    ) : (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/40 animate-pulse" />
                    ))}
            </div>
        </ViewTransition>
    );
};

export default MediaCard;
