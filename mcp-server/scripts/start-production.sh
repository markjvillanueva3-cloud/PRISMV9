#!/bin/bash
# PRISM MCP Server — Production Start Script
# R6 Production Hardening

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== PRISM Production Start ==="
echo "Node: $(node --version)"
echo "Dir: $PROJECT_DIR"

# Memory limits -- env-overridable (matches deploy/start.sh, R11). Default 4096 is
# a safe floor for constrained production hosts. On the Blackwell box (136 GB RAM)
# the canonical launch is the supervisor (scripts/mcp-server-supervisor.mjs), which
# floors the heap to PRISM_MCP_HEAP_FLOOR_MB=24576; set MAX_OLD_SPACE_SIZE to tune a
# DIRECT production start to the host. Do NOT hardcode a large value here:
# --max-old-space-size is a commit RESERVATION on Windows (counted against the
# commit ceiling even unused -- lesson commit-pressure-find-the-real-committer), so
# a too-large default re-breaks a busy box's ability to spawn.
export NODE_OPTIONS="--max-old-space-size=${MAX_OLD_SPACE_SIZE:-4096}"

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
