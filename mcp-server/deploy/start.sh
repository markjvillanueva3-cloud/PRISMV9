#!/bin/sh
# PRISM MCP Server - Production Start Script
# R6 Production Hardening
set -e

echo "=== PRISM Manufacturing Intelligence Server ==="
echo "Environment: ${NODE_ENV:-development}"
echo "Memory limit: ${MAX_OLD_SPACE_SIZE:-4096}MB"
echo "Data dir: ${PRISM_DATA_DIR:-./data}"
echo "State dir: ${PRISM_STATE_DIR:-./state}"
echo ""

# Ensure state directory exists
mkdir -p "${PRISM_STATE_DIR:-./state}"

# Start with production memory settings
exec node \
  --max-old-space-size="${MAX_OLD_SPACE_SIZE:-4096}" \
  --enable-source-maps \
  dist/index.js
