import {
    BackwardIcon,
    ForwardIcon,
    PauseIcon,
    PlayIcon
} from '@heroicons/react/24/outline';
import { useContext } from 'react';
import { StorageContext } from '../contexts/StorageContext';
import { WebsocketContext } from '../contexts/WebsocketContext';
import { ControlAction, WsControlMessage } from '../wsTypes';

const RemotePage = () => {
    const { ws, sendMessage } = useContext(WebsocketContext);
    const { id } = useContext(StorageContext);

    function sendControlMessage(action: ControlAction) {
        if (!ws) {
            console.error('WebSocket connection not established');
            return;
        }

        if (id === undefined) {
            console.error('No profile selected');
            return;
        }

        const message: WsControlMessage = {
            type: 'Control',
            userId: id,
            action
        };

        sendMessage(message);
    }

    return (
        <div className="flex flex-1 w-full">
            <div id="remote" className="m-auto border-red-100">
                <h1 className="mb-6 text-2xl font-bold text-center text-white">
                    Remote Control
                </h1>
                <PlayButton senControlMessage={sendControlMessage} />
                <PauseButton senControlMessage={sendControlMessage} />
                <SeekButton
                    senControlMessage={sendControlMessage}
                    direction="backward"
                />
                <SeekButton
                    senControlMessage={sendControlMessage}
                    direction="forward"
                />
            </div>
        </div>
    );
};

const PlayButton = ({
    senControlMessage
}: {
    senControlMessage: (action: ControlAction) => void;
}) => {
    const handlePlay = () => {
        senControlMessage({ type: 'Play' });
    };

    return (
        <button
            className="px-4 py-2 text-white bg-green-500 rounded-lg"
            onClick={handlePlay}
        >
            <PlayIcon className="w-5 h-5" />
        </button>
    );
};

const PauseButton = ({
    senControlMessage
}: {
    senControlMessage: (action: ControlAction) => void;
}) => {
    const handlePause = () => {
        senControlMessage({ type: 'Pause' });
    };

    return (
        <button
            className="px-4 py-2 ml-4 text-white bg-yellow-500 rounded-lg"
            onClick={handlePause}
        >
            <PauseIcon className="w-5 h-5" />
        </button>
    );
};

const SeekButton = ({
    senControlMessage,
    direction
}: {
    senControlMessage: (action: ControlAction) => void;
    direction: 'forward' | 'backward';
}) => {
    const handleSeek = () => {
        senControlMessage({
            type: 'Seek',
            seek: direction === 'forward' ? 10 : -10
        });
    };

    return (
        <button
            className="px-4 py-2 ml-4 text-white bg-blue-500 rounded-lg"
            onClick={handleSeek}
        >
            {direction === 'forward' ? (
                <ForwardIcon className="w-5 h-5" />
            ) : (
                <BackwardIcon className="w-5 h-5" />
            )}
        </button>
    );
};

export default RemotePage;
