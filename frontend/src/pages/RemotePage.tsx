import { useContext } from 'react';
import { WebsocketContext } from '../contexts/WebsocketContext';

const RemotePage = () => {
    const { ws } = useContext(WebsocketContext);

    return (
        <div className="flex flex-1 w-full">
            <div id="remote" className="m-auto border-red-100">
                Remote
            </div>
        </div>
    );
};

export default RemotePage;
