# Packages the binary built by Jenkins' "Build Backend" stage (rust:1.97, Debian trixie)
# instead of recompiling. For local builds use `dockerfile`.
# Debian slim rather than distroless: HLS streaming shells out to ffmpeg and
# ffprobe. ca-certificates is for TMDB over TLS.
FROM debian:trixie-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY target/release/server /app/server

ENV API_PORT=3000
EXPOSE 3000
CMD ["./server"]
