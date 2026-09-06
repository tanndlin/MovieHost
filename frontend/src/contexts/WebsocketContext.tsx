import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
    WsClientMessage,
    WsServerMessage,
    WsServerMessageType
} from '../wsTypes';
import { StorageContext } from './StorageContext';

type IWebsocketContext = {
    ws: WebSocket | null;
    sendMessage: (msg: WsClientMessage) => void;
    addCallback: (
        type: WsServerMessageType,
        callback: (msg: WsServerMessage) => void
    ) => void;
    removeCallback: (
        type: WsServerMessageType,
        callback: (msg: WsServerMessage) => void
    ) => void;
};

const defaultState: IWebsocketContext = {
    ws: null,
    sendMessage: () => {},
    addCallback: () => {},
    removeCallback: () => {}
};

type Props = {
    children?: React.ReactNode;
};

export const WebsocketContext = createContext<IWebsocketContext>(defaultState);

export const WebsocketProvider = ({ children }: Props) => {
    const [ws, setWs] = useState<WebSocket | null>(null);
    const { id } = useContext(StorageContext);
    const callbacks = useRef<
        Partial<Record<WsServerMessageType, ((msg: WsServerMessage) => void)[]>>
    >({});
    const shouldReconnect = useRef(true);

    useEffect(() => {
        shouldReconnect.current = true;
        const socket = new WebSocket(`ws://${window.location.host}/ws`);
        setWs(socket);
        return () => {
            shouldReconnect.current = false;
            socket.close();
        };
    }, []);

    useEffect(() => {
        if (!ws) {
            return;
        }

        ws.onopen = () => {
            if (id === undefined) {
                return;
            }
            const handshakeMessage: WsClientMessage = {
                type: 'Handshake',
                userId: id
            };
            ws.send(JSON.stringify(handshakeMessage));
        };
        ws.onclose = () => {
            if (shouldReconnect.current) {
                setTimeout(() => {
                    const socket = new WebSocket(
                        `ws://${window.location.host}/ws`
                    );
                    setWs(socket);
                }, 2000);
            }
        };
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        ws.onmessage = (event) => {
            const message: WsServerMessage = JSON.parse(event.data);

            const cbs = callbacks.current[message.type];
            if (cbs) {
                cbs.forEach((cb) => cb(message));
            } else {
                console.warn(
                    'No callback registered for message type:',
                    message.type
                );
            }
        };
    }, [ws, id]);

    const addCallback = (
        type: WsServerMessageType,
        callback: (msg: WsServerMessage) => void
    ) => {
        if (!callbacks.current[type]) {
            callbacks.current[type] = [];
        }
        callbacks.current[type].push(callback);
    };

    const removeCallback = (
        type: WsServerMessageType,
        callback: (msg: WsServerMessage) => void
    ) => {
        const cbs = callbacks.current[type];
        if (cbs) {
            callbacks.current[type] = cbs.filter((cb) => cb !== callback);
        }
    };

    const sendMessage = (msg: WsClientMessage) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket connection not established');
            return;
        }
        ws.send(JSON.stringify(msg));
    };

    const state: IWebsocketContext = {
        ws,
        sendMessage,
        addCallback,
        removeCallback
    };

    return (
        <WebsocketContext.Provider value={state}>
            {children}
        </WebsocketContext.Provider>
    );
};
