import { useNavigate } from 'react-router-dom';
import { Episode } from '../../types';

type ShowItemProps = {
    ep: Episode;
    watchStates: Record<string, { last_position: number; finished: boolean }>;
    onUnwatch: (path: string) => void;
};

const ShowItem = ({ ep, watchStates, onUnwatch }: ShowItemProps) => {
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
                <span className="flex-1 text-sm truncate transition-colors text-white/70 group-hover:text-white">
                    {ep.name}
                </span>
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
