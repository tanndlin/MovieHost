import { useSearchParams } from 'react-router-dom';
import AnimatedLink from '../common/AnimatedLink';
import VideoPlayer from '../components/VideoPlayer';

const PlayerPage = () => {
    const [params] = useSearchParams();
    const path = params.get('path') ?? '';
    const title = params.get('title') ?? '';

    if (!path) {
        return (
            <main className="p-8">
                <p className="text-red-400">No media path specified</p>
                <div className="mb-4">
                    <AnimatedLink
                        to="/"
                        className="text-sm text-white/50 hover:text-white"
                    >
                        &larr; Back to library
                    </AnimatedLink>
                </div>
            </main>
        );
    }

    return (
        <main className="max-w-screen-xl p-6 mx-auto">
            <div className="mb-4">
                <AnimatedLink
                    to="/"
                    className="text-sm text-white/50 hover:text-white"
                >
                    &larr; Back to library
                </AnimatedLink>
            </div>
            <VideoPlayer path={path} title={title || undefined} />
        </main>
    );
};

export default PlayerPage;
