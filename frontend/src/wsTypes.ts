/**
 * WebSocket protocol types, re-exported from the generated client. `/ws` has no
 * OpenAPI path, so the server publishes these schemas under `components`
 * instead (see `server/src/openapi.rs`).
 */
import type { components } from './generated/api';

type Schemas = components['schemas'];

export type WsServerMessage = Schemas['WsServerMessage'];
export type WsClientMessage = Schemas['WsClientMessage'];
export type ControlMessage = Schemas['ControlMessage'];
export type ControlAction = Schemas['ControlAction'];
export type HandshakeMessage = Schemas['HandshakeMessage'];

export type WsServerMessageType = WsServerMessage['type'];

/** The only server-sent message today; kept as a name for call sites. */
export type WsControlMessage = WsServerMessage;
