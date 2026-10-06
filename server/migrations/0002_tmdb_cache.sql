-- Raw TMDB API responses, so lookups survive restarts. A NULL body records
-- that TMDB had nothing for the key, so misses aren't re-requested either.
CREATE TABLE IF NOT EXISTS "tmdb_cache" (
    "key" TEXT PRIMARY KEY,
    "body" TEXT,
    "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
