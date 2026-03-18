import { useRef, useState } from 'react';
import { API_BASE_URL } from '../utils/env';

type Props = {
    path: string;
    title?: string;
};

const VideoPlayer = ({ path, title }: Props) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState(false);

    const src = `${API_BASE_URL}/media/${path}`;

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
                    ref={videoRef}
                    src={src}
                    controls
                    autoPlay
                    className="w-full bg-black border rounded-xl border-white/10"
                    onError={() => setError(true)}
                >
                    Your browser does not support the video tag.
                </video>
            )}
        </div>
    );
};

export default VideoPlayer;
