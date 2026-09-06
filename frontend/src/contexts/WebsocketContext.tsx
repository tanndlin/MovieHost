import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
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

const RECONNECT_DELAY_MS = 2000;

export const WebsocketContext = createContext<IWebsocketContext>(defaultState);

export const WebsocketProvider = ({ children }: Props) => {
    const [ws, setWs] = useState<WebSocket | null>(null);
    const { id } = useContext(StorageContext);
    const callbacks = useRef<
        Partial<Record<WsServerMessageType, ((msg: WsServerMessage) => void)[]>>
    >({});
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined
    );
    const shouldReconnect = useRef(true);

    const connect = useCallback(() => {
        const socket = new WebSocket(`ws://${window.location.host}/ws`);
        wsRef.current = socket;
        setWs(socket);
    }, []);

    useEffect(() => {
        shouldReconnect.current = true;
        connect();

        return () => {
            shouldReconnect.current = false;
            clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, [connect]);

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
                reconnectTimer.current = setTimeout(
                    connect,
                    RECONNECT_DELAY_MS
                );
            }
        };
        ws.onerror = (event) => {
            console.error('WebSocket error:', event);
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

        return () => {
            ws.onopen = null;
            ws.onclose = null;
            ws.onerror = null;
            ws.onmessage = null;
        };
    }, [ws, id, connect]);

    const addCallback = useCallback(
        (
            type: WsServerMessageType,
            callback: (msg: WsServerMessage) => void
        ) => {
            if (!callbacks.current[type]) {
                callbacks.current[type] = [];
            }
            callbacks.current[type].push(callback);
        },
        []
    );

    const removeCallback = useCallback(
        (
            type: WsServerMessageType,
            callback: (msg: WsServerMessage) => void
        ) => {
            const cbs = callbacks.current[type];
            if (cbs) {
                callbacks.current[type] = cbs.filter((cb) => cb !== callback);
            }
        },
        []
    );

    const sendMessage = useCallback((msg: WsClientMessage) => {
        const socket = wsRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            console.error('WebSocket connection not established');
            return;
        }
        socket.send(JSON.stringify(msg));
    }, []);

    const state = useMemo<IWebsocketContext>(
        () => ({ ws, sendMessage, addCallback, removeCallback }),
        [ws, sendMessage, addCallback, removeCallback]
    );

    return (
        <WebsocketContext.Provider value={state}>
            {children}
        </WebsocketContext.Provider>
    );
};
