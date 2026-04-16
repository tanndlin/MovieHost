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
    const { profile, setWatchState } = useContext(StorageContext);
    const watchStates = profile?.watch_states || {};
    const currentWatchState = watchStates[path] || {
        last_position: 0,
        finished: false
    };

    const currentTimeRef = useRef(currentWatchState.last_position);
    const durationRef = useRef(0);

    useEffect(() => {
        return () => {
            if (!path) {
                return;
            }
            const currentTime = currentTimeRef.current;
            const duration = durationRef.current;
            const finished = duration > 0 && currentTime >= duration * 0.95;

            setWatchState(path, {
                last_position: currentTime,
                finished,
                movie_path: path
            });
        };
    }, [path, setWatchState]);

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
            <div className="mb-5">
                <AnimatedLink
                    to="/"
                    className="inline-flex items-center gap-1.5 text-sm transition-colors text-white/40 hover:text-white/80"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M19 12H5M5 12l7 7M5 12l7-7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    Back to library
                </AnimatedLink>
            </div>
            <VideoPlayer
                ref={playerRef}
                path={path}
                title={title || undefined}
                startTime={currentWatchState.last_position || undefined}
                onTimeUpdate={(currentTime, duration) => {
                    currentTimeRef.current = currentTime;
                    durationRef.current = duration;
                }}
            />
        </main>
    );
};

export default PlayerPage;
