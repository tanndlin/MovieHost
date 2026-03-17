import { useRef, useState } from 'react';
import { API_BASE_URL } from '../utils/env';

type Props = {
    path: string;
    title?: string;
};

const VideoPlayer = ({ path, title }: Props) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState(false);

    const src = `${API_BASE_URL.replace('/api', '')}/api/media/${path}`;

    return (
        <div className="w-full flex flex-col gap-3">
            {title && (
                <h2 className="text-white text-lg font-medium">{title}</h2>
            )}
            {error ? (
                <div className="w-full aspect-video bg-black/40 rounded-xl flex items-center justify-center border border-white/10">
                    <div className="text-center">
                        <p className="text-red-400 text-lg mb-2">
                            Failed to load video
                        </p>
                        <p className="text-white/40 text-sm">{path}</p>
                    </div>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    src={src}
                    controls
                    autoPlay
                    className="w-full rounded-xl bg-black border border-white/10"
                    onError={() => setError(true)}
                >
                    Your browser does not support the video tag.
                </video>
            )}
        </div>
    );
};

export default VideoPlayer;
