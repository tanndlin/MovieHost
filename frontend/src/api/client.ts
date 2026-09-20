import createClient from 'openapi-fetch';
import type { components, paths } from '../generated/api';
import { API_ORIGIN } from '../utils/env';

type ErrorBody = components['schemas']['ErrorBody'];

/** Thrown when the API answers with a non-2xx status. */
export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

const client = createClient<paths>({ baseUrl: API_ORIGIN });

type ApiResult<T> = {
    data?: T;
    error?: ErrorBody;
    response: Response;
};

function unwrap<T>(result: ApiResult<T>): T {
    if (!result.response.ok) {
        throw new ApiError(
            result.response.status,
            result.error?.error ?? result.response.statusText
        );
    }
    return result.data as T;
}

/** For 204 endpoints, which carry no body to unwrap. */
function expectNoContent(result: ApiResult<never>): void {
    if (!result.response.ok) {
        throw new ApiError(
            result.response.status,
            result.error?.error ?? result.response.statusText
        );
    }
}

export async function getLibrary() {
    return unwrap(await client.GET('/api/library'));
}

export async function listProfiles() {
    return unwrap(await client.GET('/api/profiles'));
}

export async function getProfile(id: number) {
    return unwrap(
        await client.GET('/api/profile/{id}', { params: { path: { id } } })
    );
}

export async function createProfile() {
    return unwrap(await client.POST('/api/profile'));
}

export async function renameProfile(id: number, username: string) {
    expectNoContent(
        await client.PUT('/api/profile/{id}', {
            params: { path: { id } },
            body: { username }
        })
    );
}

export async function deleteProfile(id: number) {
    expectNoContent(
        await client.DELETE('/api/profile/{id}', { params: { path: { id } } })
    );
}

export async function putWatchState(
    id: number,
    body: components['schemas']['WatchState']
) {
    expectNoContent(
        await client.PUT('/api/profile/{id}/watch_state', {
            params: { path: { id } },
            body
        })
    );
}

export async function getDetails(path: string) {
    return unwrap(
        await client.GET('/api/details', { params: { query: { path } } })
    );
}
