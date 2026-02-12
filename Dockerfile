# Stage 1: Build
FROM docker.io/library/rust:1.91 as builder

WORKDIR /usr/src/app
COPY . .

# Build the release binary
RUN cargo build --release

# Stage 2: Runtime
FROM docker.io/library/ubuntu:24.04

# Install necessary runtime dependencies
# libssl and ca-certificates are usually needed for HTTPS/web requests
# libpq is needed for PostgreSQL connectivity
RUN apt-get update && apt-get install -y \
    libssl-dev \
    ca-certificates \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from the builder stage
# The name 'pochinki' comes from the [package] name in Cargo.toml
COPY --from=builder /usr/src/app/target/release/pochinki /app/server

# Copy static assets
COPY --from=builder /usr/src/app/statics /app/statics

# Set default stage to Production
ENV STAGE=Production

# Expose the server port (matching SERVER_PORT in .env)
EXPOSE 8000

# Set the command to run the application
CMD ["./server"]
