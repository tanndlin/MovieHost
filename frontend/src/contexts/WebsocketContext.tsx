import React, { useEffect } from 'react';
import { WsServerMessage } from '../types';

type IWebsocketContext = {
    ws: WebSocket | null;
};

const defaultState: IWebsocketContext = {
    ws: null
};

type Props = {
    children?: React.ReactNode;
};

export const WebsocketContext =
    React.createContext<IWebsocketContext>(defaultState);

export const WebsocketProvider = ({ children }: Props) => {
    const [ws, setWs] = React.useState<WebSocket | null>(null);

    useEffect(() => {
        const socket = new WebSocket(`ws://${window.location.host}/ws`);
        setWs(socket);
        return () => {
            socket.close();
        };
    }, []);

    useEffect(() => {
        if (!ws) {
            return;
        }

        ws.onopen = () => {
            console.log('WebSocket connection established');
        };
        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        ws.onmessage = (event) => {
            const message: WsServerMessage = JSON.parse(event.data);
            console.log('Received message from server:', message);
        };
    }, [ws]);

    const state: IWebsocketContext = {
        ws
    };

    return (
        <WebsocketContext.Provider value={state}>
            {children}
        </WebsocketContext.Provider>
    );
};
