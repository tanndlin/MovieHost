CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL PRIMARY KEY,
    "username" VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "watched_movies" (
    "id" SERIAL PRIMARY KEY,
    "last_position" REAL NOT NULL,
    "finished" BOOLEAN NOT NULL,
    "movie_path" VARCHAR(255) NOT NULL,
    "user_id" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, movie_path)
);