# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------------------
# Build stage — Alpine with npm/build tooling
# ---------------------------------------------------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

# Install all dependencies (including dev) for build
COPY package*.json ./
RUN npm ci

# Build the project (outputs dist/http.js + dist/stdio.js)
COPY . .
RUN npm run build

# Reduce node_modules to production-only (we copy this into runtime)
RUN npm ci --omit=dev \
  && npm cache clean --force

# ---------------------------------------------------------------------------
# Runtime stage — Google distroless (no shell, no package manager, nonroot)
# Image: gcr.io/distroless/nodejs24-debian13:nonroot
# - Public, no auth required
# - Runs as user 65532 (nonroot)
# - ENTRYPOINT is already ["/nodejs/bin/node"], so CMD is just script args
# ---------------------------------------------------------------------------
FROM gcr.io/distroless/nodejs24-debian13:nonroot AS runner

ENV NODE_ENV=production
WORKDIR /app

# Copy production node_modules + built artifacts + package.json (for ESM type:module)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

ENV PORT=3000
ENV VECHAIN_NETWORK=mainnet
EXPOSE 3000

# Distroless has no shell — rely on platform health check (e.g. App Runner /ready)
# CMD is appended to the image's ENTRYPOINT (`/nodejs/bin/node`)
CMD ["dist/http.js"]
