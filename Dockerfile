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

# Copy built artifacts (dist/http.js = wrapper, dist/stdio.js = MCP child)
COPY --from=builder /app/dist ./dist

ENV PORT=3000
ENV VECHAIN_NETWORK=mainnet
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/ready',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/http.js"]