# Packages the binary built by Jenkins' "Build Backend" stage (rust:1.92, Debian trixie)
# instead of recompiling. For local builds use `dockerfile`.
FROM debian:trixie-slim
WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates && update-ca-certificates

COPY target/release/server /app/server

ENV API_PORT=3000
EXPOSE 3000
CMD ["./server"]
