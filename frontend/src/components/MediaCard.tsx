import AnimatedLink from '../common/AnimatedLink';

type Props = {
    title: string;
    to: string;
    subtitle?: string;
    icon?: string;
};

const MediaCard = ({ title, to, subtitle, icon }: Props) => {
    return (
        <AnimatedLink to={to} className="block group">
            <div
                className="overflow-hidden transition-all duration-200 border cursor-pointer rounded-xl bg-white/5 border-white/10 hover:border-gray-400/50 hover:bg-white/10"
                style={{
                    viewTransitionName: title
                }}
            >
                <div className="flex items-center justify-center h-40 bg-gradient-to-br from-gray-800/60 to-gray-900/60">
                    <span className="text-5xl">{icon ?? '🎬'}</span>
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
