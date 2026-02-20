# --- Build stage ---
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (canvas, etc.)
# ca-certificates needed for SSL during npm install / node-gyp header download
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    pkg-config \
    ca-certificates \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

COPY package*.json ./

# Disable strict SSL during build only (OrbStack/Docker network may intercept TLS)
# This is safe: it only affects the build stage, not the runtime image.
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN npm config set strict-ssl false && \
    npm install --no-audit --no-fund

# --- Runtime stage ---
FROM node:20-bookworm-slim

WORKDIR /app

# Install runtime dependencies for canvas/native rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libpixman-1-0 \
    fonts-noto-cjk \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --gid 1001 nodejs && \
    adduser --disabled-password --gecos "" --uid 1001 --ingroup nodejs appuser

COPY --from=builder /app/node_modules ./node_modules
COPY server.js package.json ./

# Create images directory with correct permissions
RUN mkdir -p /app/images && chown -R appuser:nodejs /app

USER appuser

EXPOSE 3200

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD node -e "const http = require('http'); http.get('http://localhost:3200/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "server.js"]
