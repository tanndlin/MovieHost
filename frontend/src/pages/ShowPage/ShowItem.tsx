import { useNavigate } from 'react-router-dom';
import { Episode } from '../../types';

type ShowItemProps = {
    ep: Episode;
    watchStates: Record<string, { last_position: number; finished: boolean }>;
};

const ShowItem = ({ ep, watchStates }: ShowItemProps) => {
    const navigate = useNavigate();
    const ws = watchStates[ep.path];
    const finished = ws?.finished;
    const inProgress = !finished && (ws?.last_position ?? 0) > 0;
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
                    {ep.episode ? `E${ep.episode.padStart(2, '0')}` : ''}
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
};

export default ShowItem;
