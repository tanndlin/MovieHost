import AnimatedLink from '../common/AnimatedLink';

const Header = () => {
    return (
        <header className="flex items-center gap-4 px-6 py-3 border-b bg-black/30 backdrop-blur border-white/10">
            <AnimatedLink
                to="/"
                className="text-xl font-bold tracking-wide text-white transition-colors hover:text-gray-300"
            >
                MovieHost
            </AnimatedLink>
        </header>
    );
};

export default Header;
