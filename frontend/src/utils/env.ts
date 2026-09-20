export const NODE_ENV = import.meta.env.VITE_NODE_ENV || 'development';
export const API_PORT = import.meta.env.VITE_API_PORT || '5000';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

/**
 * Origin the API is served from, for the generated client. Empty means
 * same-origin. Unlike `API_BASE_URL` this carries no `/api` prefix, because the
 * paths in `openapi.json` already include one.
 */
export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? '';

export const STORAGE_PROFILE_KEY = 'profileID';
