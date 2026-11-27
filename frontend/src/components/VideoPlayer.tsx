import {
    forwardRef,
    useContext,
    useEffect,
    useImperativeHandle,
    useRef,
    useState
} from 'react';
import { WebsocketContext } from '../contexts/WebsocketContext';
import { API_BASE_URL } from '../utils/env';
import { mediaUrl, needsStream, streamUrl } from '../utils/utils';
import { WsControlMessage } from '../wsTypes';
import DownloadLink from './DownloadLink';

type Props = {
    path: string;
    title: string;
    startTime?: number;
    onTimeUpdate?: (currentTime: number, duration: number) => void;
};

const VideoPlayer = forwardRef<HTMLVideoElement, Props>(
    ({ path, title, startTime, onTimeUpdate }, ref) => {
        const [error, setError] = useState(false);

        const videoRef = useRef<HTMLVideoElement>(null);
        useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

        // Read once per source: a later watch-state update shouldn't reload it.
        const startTimeRef = useRef(startTime);
        startTimeRef.current = startTime;

        useEffect(() => {
            const video = videoRef.current;
            if (!video) {
                return;
            }

            const detach = () => {
                video.removeAttribute('src');
                video.load();
            };

            // Native playback: direct files everywhere, and HLS where the
            // browser handles it itself (Safari, including every iOS browser).
            if (!needsStream(path)) {
                video.src = mediaUrl(path);
                return detach;
            }
            const url = streamUrl(path);
            if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = url;
                return detach;
            }

            // Everything else plays HLS through Media Source Extensions.
            let cancelled = false;
            let hls: import('hls.js').default | undefined;
            import('hls.js')
                .then(({ default: Hls }) => {
                    if (cancelled) {
                        return;
                    }
                    if (!Hls.isSupported()) {
                        setError(true);
                        return;
                    }
                    hls = new Hls({
                        // Start where playback resumes, so the server doesn't
                        // remux from 0 only to restart at the seek.
                        startPosition: startTimeRef.current ?? -1
                    });
                    hls.on(Hls.Events.ERROR, (_event, data) => {
                        if (data.fatal) {
                            setError(true);
                        }
                    });
                    hls.loadSource(url);
                    hls.attachMedia(video);
                })
                .catch(() => setError(true));

            return () => {
                cancelled = true;
                hls?.destroy();
            };
        }, [path]);
        // Point the tab title and favicon at the video while it's playing, then
        // restore whatever they were once the player unmounts.
        useEffect(() => {
            const previousTitle = document.title;
            const link =
                document.querySelector<HTMLLinkElement>("link[rel~='icon']");
            const previousIcon = link?.href;

            if (title) {
                document.title = title;
            }
            if (link) {
                link.href = `${API_BASE_URL}/thumbnail?path=${encodeURIComponent(path)}`;
            }

            return () => {
                document.title = previousTitle;
                if (link && previousIcon !== undefined) {
                    link.href = previousIcon;
                }
            };
        }, [title, path]);

        const { addCallback, removeCallback } = useContext(WebsocketContext);
        useEffect(() => {
            addCallback('Control', handleControlMessage);
            function handleControlMessage(msg: WsControlMessage) {
                const video = videoRef.current;
                if (!video) {
                    return;
                }

                switch (msg.action.type) {
                    case 'Play':
                        video.play();
                        break;
                    case 'Pause':
                        video.pause();
                        break;
                    case 'Seek':
                        video.currentTime += msg.action.seek;
                        break;
                }
            }

            return () => removeCallback('Control', handleControlMessage);
        }, [addCallback, removeCallback]);

        return (
            <div className="flex flex-col w-full gap-3">
                <div className="flex justify-between">
                    {title && (
                        <h2 className="text-lg font-medium text-white">
                            {title}
                        </h2>
                    )}
                    <DownloadLink path={path} title={title} />
                </div>
                {error ? (
                    <div className="flex items-center justify-center w-full border aspect-video bg-black/40 rounded-xl border-white/10">
                        <div className="text-center">
                            <p className="mb-2 text-lg text-red-400">
                                Failed to load video
                            </p>
                            <p className="text-sm text-white/40">{path}</p>
                        </div>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        controls
                        autoPlay
                        className="w-full bg-black border rounded-xl border-white/10"
                        onLoadedMetadata={(e) => {
                            if (startTime) {
                                e.currentTarget.currentTime = startTime;
                            }
                        }}
                        onError={() => setError(true)}
                        onTimeUpdate={(e) =>
                            onTimeUpdate?.(
                                e.currentTarget.currentTime,
                                e.currentTarget.duration
                            )
                        }
                    >
                        Your browser does not support the video tag.
                    </video>
                )}
            </div>
        );
    }
);

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
