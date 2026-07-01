#!/bin/bash
# PRISM MCP Server — Production Start Script
# R6 Production Hardening

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== PRISM Production Start ==="
echo "Node: $(node --version)"
echo "Dir: $PROJECT_DIR"

# Memory limits
export NODE_OPTIONS="--max-old-space-size=4096"

# Production env
export NODE_ENV=production
export PRISM_LOG_LEVEL=${PRISM_LOG_LEVEL:-info}
export PRISM_LOG_FORMAT=${PRISM_LOG_FORMAT:-json}

# Health check before start
if [ ! -f "$PROJECT_DIR/dist/index.js" ]; then
  echo "ERROR: dist/index.js not found. Run 'npm run build' first."
  exit 1
fi

# Start with structured logging
echo "Starting PRISM MCP Server (production)..."
exec node "$PROJECT_DIR/dist/index.js"
