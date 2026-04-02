import AnimatedLink from '../common/AnimatedLink';

type WatchState = {
    lastPosition: number;
    finished: boolean;
};

type Props = {
    title: string;
    to: string;
    subtitle?: string;
    icon?: string;
    watchState?: WatchState;
};

const MediaCard = ({ title, to, subtitle, icon, watchState }: Props) => {
    const finished = watchState?.finished;
    const inProgress = !finished && (watchState?.lastPosition ?? 0) > 0;

    return (
        <AnimatedLink to={to} className="block group">
            <div
                className="overflow-hidden transition-all duration-200 border cursor-pointer rounded-xl bg-white/5 border-white/10 hover:border-gray-400/50 hover:bg-white/10"
                style={{
                    viewTransitionName: title
                }}
            >
                <div className="relative flex items-center justify-center h-40 bg-gradient-to-br from-gray-800/60 to-gray-900/60">
                    <span className="text-5xl">{icon ?? '🎬'}</span>
                    {finished && (
                        <span className="absolute top-2 right-2 bg-green-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded">
                            ✓
                        </span>
                    )}
                    {inProgress && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-400" />
                    )}
                </div>
                <div className="p-3">
                    <p className="text-sm font-medium text-white truncate transition-colors group-hover:text-gray-300">
                        {title}
                    </p>
                    {subtitle && (
                        <p className="text-white/50 text-xs mt-0.5 truncate">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
        </AnimatedLink>
    );
};

export default MediaCard;
