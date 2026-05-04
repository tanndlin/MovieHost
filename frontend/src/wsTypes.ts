export type WsServerMessage = WsControlMessage;
export type WsClientMessage = WsControlMessage | HandshakeMessage;

export type WsServerMessageType = WsServerMessage['type'];

export type WsControlMessage = {
    type: 'Control';
    userId: number;
    action: ControlAction;
};

export type ControlAction =
    | { type: 'Play' }
    | { type: 'Pause' }
    | { seek: number; type: 'Seek' };

export type HandshakeMessage = {
    type: 'Handshake';
    userId: number;
};
