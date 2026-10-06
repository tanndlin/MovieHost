/**
 * Wire types, re-exported from the generated client. Regenerate with
 * `npm run gen:api` after changing a handler.
 */
import type { components } from './generated/api';

type Schemas = components['schemas'];

export type MediaFile = Schemas['MediaFile'];
export type Episode = Schemas['Episode'];
export type Season = Schemas['Season'];
export type Show = Schemas['Show'];
export type Movie = Schemas['Movie'];
export type MediaLibrary = Schemas['MediaLibrary'];
export type WatchState = Schemas['WatchState'];

/** A profile without its watch states, as listed by `/api/profiles`. */
export type Profile = Schemas['Profile'];
/** A profile with its watch states, as returned by `/api/profile/{id}`. */
export type ProfileResponse = Schemas['ProfileResponse'];

export type MovieDetails = Schemas['MovieDetails'];
export type EpisodeDetails = Schemas['EpisodeDetails'];

/** Coarse watch status derived from a `WatchState`, for badge rendering. */
export type WatchStatus = 'finished' | 'in-progress';
