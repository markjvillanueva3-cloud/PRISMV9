# PRISM MCP Server - Production Dockerfile
# Safety-critical CNC manufacturing intelligence
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 prism && adduser -u 1001 -G prism -s /bin/sh -D prism

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy data directories (read-only in production)
COPY --from=builder /app/data ./data

# Runtime configuration
ENV NODE_ENV=production
ENV MAX_OLD_SPACE_SIZE=4096
ENV PRISM_LOG_LEVEL=info
ENV PRISM_DATA_DIR=/app/data
ENV PRISM_STATE_DIR=/app/state

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "const h=require('http');h.get('http://localhost:3000/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# State directory (writable)
RUN mkdir -p /app/state && chown -R prism:prism /app/state
VOLUME ["/app/state"]

# Switch to non-root
USER prism

# Memory limit for safety-critical ops
CMD ["node", "--max-old-space-size=4096", "--enable-source-maps", "dist/index.js"]

EXPOSE 3000
