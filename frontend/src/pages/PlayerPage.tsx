import { useContext, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import AnimatedLink from '../common/AnimatedLink';
import VideoPlayer from '../components/VideoPlayer';
import { StorageContext } from '../contexts/StorageContext';

const PlayerPage = () => {
    const [params] = useSearchParams();
    const path = params.get('path') ?? '';
    const title = params.get('title') ?? '';

    const playerRef = useRef<HTMLVideoElement>(null);
    const { watchStates, setWatchStates } = useContext(StorageContext);
    const currentWatchState = watchStates[path] || {
        lastPosition: 0,
        finished: false
    };

    const currentTimeRef = useRef(currentWatchState.lastPosition);
    const durationRef = useRef(0);

    useEffect(() => {
        return () => {
            if (!path) return;
            const currentTime = currentTimeRef.current;
            const duration = durationRef.current;
            const finished = duration > 0 && currentTime >= duration * 0.95;
            setWatchStates((prev) => ({
                ...prev,
                [path]: { lastPosition: currentTime, finished }
            }));
        };
    }, [path]);

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
            <VideoPlayer
                ref={playerRef}
                path={path}
                title={title || undefined}
                startTime={currentWatchState.lastPosition || undefined}
                onTimeUpdate={(currentTime, duration) => {
                    currentTimeRef.current = currentTime;
                    durationRef.current = duration;
                }}
            />
        </main>
    );
};

export default PlayerPage;
