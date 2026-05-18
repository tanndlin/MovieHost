import { Season } from '../../types';
import ShowItem from './ShowItem';

type SeasonProps = {
    season: Season;
    openSeason: string | null;
    setOpenSeason: (seasonName: string | null) => void;
    watchStates: Record<string, { last_position: number; finished: boolean }>;
};

const SeasonDropdown = ({
    season,
    setOpenSeason,
    openSeason,
    watchStates
}: SeasonProps) => {
    return (
        <div
            key={season.name}
            className="overflow-hidden rounded-xl ring-1 ring-white/10"
        >
            <button
                onClick={() =>
                    setOpenSeason(
                        openSeason === season.name ? null : season.name
                    )
                }
                className="flex items-center justify-between w-full px-5 py-3.5 text-left transition-colors bg-white/[0.04] hover:bg-white/[0.08]"
            >
                <span className="font-semibold text-white">{season.name}</span>
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
                    {season.episodes.map((ep) => (
                        <ShowItem key={ep.path} {...{ ep, watchStates }} />
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SeasonDropdown;
