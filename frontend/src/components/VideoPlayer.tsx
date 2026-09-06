import {
    ViewTransition,
    forwardRef,
    useContext,
    useEffect,
    useState
} from 'react';
import { WebsocketContext } from '../contexts/WebsocketContext';
import { API_BASE_URL } from '../utils/env';
import { titleTransitionName } from '../utils/utils';
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

        const src = `${API_BASE_URL}/media/${path}`;
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
        }, [addCallback, removeCallback, ref]);

        return (
            <div className="flex flex-col w-full gap-3">
                <div className="flex justify-between">
                    {title && (
                        <ViewTransition name={titleTransitionName(path)}>
                            <h2 className="text-lg font-medium text-white">
                                {title}
                            </h2>
                        </ViewTransition>
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
