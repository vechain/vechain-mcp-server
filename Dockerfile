# Build stage
FROM node:24-slim AS builder

WORKDIR /app

# Install all dependencies (including dev) for build
COPY package*.json ./
RUN npm ci

# Build the project
COPY . .
RUN npm run build

# Runtime stage
FROM node:24-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Copy built artifacts
COPY --from=builder /app/dist ./dist

ENV PORT=4000
EXPOSE 4000

CMD ["node", "dist/http.js"]