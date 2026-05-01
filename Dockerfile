# PRISM MCP Server — Multi-Stage Docker Build
# VAL-MS7 V7-U01
#
# Stage 1: Build (tsc type-check + esbuild bundle)
# Stage 2: Runtime (node:22-alpine, minimal image)
#
# Usage:
#   docker build -t prism-mcp .
#   docker run -p 3000:3000 prism-mcp

# --- Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/
COPY data/ ./data/
COPY scripts/ ./scripts/

# Type-check then bundle
RUN npx tsc --noEmit && \
    npm run build:fast

# --- Runtime Stage ---
FROM node:22-alpine AS runtime

WORKDIR /app

RUN addgroup -S prism && adduser -S prism -G prism

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/data/ ./data/

RUN mkdir -p /app/state /home/prism/.prism && \
    chown -R prism:prism /app /home/prism

USER prism

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

EXPOSE 3000

ENV NODE_ENV=production
ENV PRISM_AUTH_ENABLED=true
ENV PRISM_MCP_PATH=/app

CMD ["node", "dist/index.js"]
