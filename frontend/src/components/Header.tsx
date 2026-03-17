import AnimatedLink from '../common/AnimatedLink';

const Header = () => {
    return (
        <header className="flex items-center gap-4 px-6 py-3 bg-black/30 backdrop-blur border-b border-white/10">
            <AnimatedLink
                to="/"
                className="text-xl font-bold tracking-wide text-white hover:text-blue-300 transition-colors"
            >
                MovieHost
            </AnimatedLink>
        </header>
    );
};

export default Header;
