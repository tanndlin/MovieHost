import { useNavigate, useSearchParams } from 'react-router-dom';
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
                    className="inline-block mt-4 text-gray-400 hover:underline"
                >
                    &larr; Back
                </button>
            </main>
        );
    }

    return (
        <main className="max-w-screen-xl p-6 mx-auto">
            <div className="mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-0 text-sm transition-colors bg-transparent text-white/50 hover:text-white"
                >
                    &larr; Back
                </button>
            </div>
            <VideoPlayer path={path} title={title || undefined} />
        </main>
    );
};

export default PlayerPage;
