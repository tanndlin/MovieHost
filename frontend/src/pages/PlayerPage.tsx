import { useSearchParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';

const PlayerPage = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const path = params.get('path') ?? '';
    const title = params.get('title') ?? '';

    if (!path) {
        return (
            <main className="p-8">
                <p className="text-red-400">No media path specified</p>
                <button
                    onClick={() => navigate('/')}
                    className="text-blue-400 hover:underline mt-4 inline-block"
                >
                    &larr; Back
                </button>
            </main>
        );
    }

    return (
        <main className="p-6 max-w-screen-xl mx-auto">
            <div className="mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="text-white/50 hover:text-white text-sm transition-colors bg-transparent p-0"
                >
                    &larr; Back
                </button>
            </div>
            <VideoPlayer path={path} title={title || undefined} />
        </main>
    );
};

export default PlayerPage;
