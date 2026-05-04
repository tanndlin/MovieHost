import { forwardRef, useContext, useEffect, useState } from 'react';
import { WebsocketContext } from '../contexts/WebsocketContext';
import { API_BASE_URL } from '../utils/env';
import { WsControlMessage } from '../wsTypes';

type Props = {
    path: string;
    title?: string;
    startTime?: number;
    onTimeUpdate?: (currentTime: number, duration: number) => void;
};

const VideoPlayer = forwardRef<HTMLVideoElement, Props>(
    ({ path, title, startTime, onTimeUpdate }, ref) => {
        const [error, setError] = useState(false);

        const src = `${API_BASE_URL}/media/${path}`;
        // Set the favicon to the video thumbnail and the title to the video title
        useEffect(() => {
            if (title) {
                document.title = title;
            }

            const link = document.querySelector(
                "link[rel~='icon']"
            ) as HTMLLinkElement;
            if (link) {
                link.href = `${API_BASE_URL}/thumbnail?path=${encodeURIComponent(path)}`;
            }
        }, [title, path]);

        const { addCallback, removeCallback } = useContext(WebsocketContext);
        useEffect(() => {
            addCallback('Control', handleControlMessage);
            function handleControlMessage(msg: WsControlMessage) {
                if (!ref || !('current' in ref) || !ref.current) {
                    return;
                }

                switch (msg.action.type) {
                    case 'Play':
                        ref.current.play();
                        break;
                    case 'Pause':
                        ref.current.pause();
                        break;
                    case 'Seek':
                        ref.current.currentTime += msg.action.seek;
                        break;
                }
            }

            return () => removeCallback('Control', handleControlMessage);
        }, [addCallback, ref]);

        return (
            <div className="flex flex-col w-full gap-3">
                {title && (
                    <h2 className="text-lg font-medium text-white">{title}</h2>
                )}
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
                        style={{ viewTransitionName: title }}
                        ref={ref}
                        src={src}
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
