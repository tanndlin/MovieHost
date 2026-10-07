# Packages the binary built by Jenkins' "Build Backend" stage (rust:1.97, Debian trixie)
# instead of recompiling. For local builds use `dockerfile`.
# distroless/cc ships glibc, libgcc and CA certs (needed for TMDB over TLS); no shell.
FROM gcr.io/distroless/cc-debian13
WORKDIR /app

COPY target/release/server /app/server

ENV API_PORT=3000
EXPOSE 3000
CMD ["./server"]
