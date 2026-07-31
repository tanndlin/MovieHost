import { Season } from '../../types';
import { hasWatchProgress } from '../../utils/utils';
import ShowItem from './ShowItem';

type SeasonProps = {
    season: Season;
    openSeason: string | null;
    setOpenSeason: (seasonName: string | null) => void;
    watchStates: Record<string, { last_position: number; finished: boolean }>;
    onUnwatchEpisode: (path: string) => void;
    onUnwatchSeason: (season: Season) => void;
};

const SeasonDropdown = ({
    season,
    setOpenSeason,
    openSeason,
    watchStates,
    onUnwatchEpisode,
    onUnwatchSeason
}: SeasonProps) => {
    const hasProgress = season.episodes.some((ep) =>
        hasWatchProgress(watchStates[ep.path])
    );

    const toggle = () =>
        setOpenSeason(openSeason === season.name ? null : season.name);

    return (
        <div
            key={season.name}
            className="overflow-hidden rounded-xl ring-1 ring-white/10"
        >
            <div
                role="button"
                tabIndex={0}
                onClick={toggle}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggle();
                    }
                }}
                className="flex items-center justify-between w-full px-5 py-3.5 text-left transition-colors bg-white/[0.04] hover:bg-white/[0.08] cursor-pointer"
            >
                <span className="font-semibold text-white">{season.name}</span>
                <span className="flex items-center gap-3 text-sm text-white/40">
                    {hasProgress && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUnwatchSeason(season);
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            title="Mark season as unwatched"
                            className="text-xs font-medium text-white/40 transition-colors hover:text-red-400"
                        >
                            Mark unwatched
                        </button>
                    )}
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
            </div>

            {openSeason === season.name && (
                <ul className="divide-y divide-white/5">
                    {season.episodes.map((ep) => (
                        <ShowItem
                            key={ep.path}
                            {...{
                                ep,
                                watchStates,
                                onUnwatch: onUnwatchEpisode
                            }}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SeasonDropdown;
