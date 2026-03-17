export const NODE_ENV = import.meta.env.VITE_NODE_ENV || 'development';
export const API_PORT = import.meta.env.VITE_API_PORT || '5000';

export const API_BASE_URL =
    NODE_ENV === 'production' ? '/api' : `http://localhost:${API_PORT}/api`;

export const WEBSOCKET_URL =
    NODE_ENV === 'production' ? '/ws' : `ws://localhost:${API_PORT}/ws`;
