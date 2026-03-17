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
            <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all duration-200 cursor-pointer">
                <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/40 h-40 flex items-center justify-center">
                    <span className="text-5xl">{icon ?? '🎬'}</span>
                </div>
                <div className="p-3">
                    <p className="text-white font-medium text-sm truncate group-hover:text-blue-300 transition-colors">
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
