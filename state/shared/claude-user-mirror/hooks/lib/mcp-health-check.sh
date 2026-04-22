#!/usr/bin/env bash
# MCP Health Check for PRISM Manufacturing Intelligence Server
# Tests if the PRISM MCP server starts and responds.
# Usage: bash mcp-health-check.sh
# Logs to ~/.prism/telemetry/mcp-health.jsonl

set -euo pipefail

PRISM_DIR="C:/PRISM/mcp-server"
ENTRY="$PRISM_DIR/dist/index.js"
LOG_DIR="$HOME/.prism/telemetry"
LOG_FILE="$LOG_DIR/mcp-health.jsonl"
TIMEOUT_SECS=10

mkdir -p "$LOG_DIR"

TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ ! -f "$ENTRY" ]; then
  printf '{"timestamp":"%s","status":"error",' "$TS" >> "$LOG_FILE"
  printf '"reason":"entry_not_found"}\n' >> "$LOG_FILE"
  echo "FAIL: $ENTRY not found"
  exit 1
fi

# Build MCP initialize request (JSON-RPC 2.0)
INIT_REQ='{"jsonrpc":"2.0","id":1,"method":"initialize",'
INIT_REQ+='"params":{"protocolVersion":"2025-11-25",'
INIT_REQ+='"capabilities":{},'
INIT_REQ+='"clientInfo":{"name":"health-check",'
INIT_REQ+='"version":"1.0.0"}}}'

RESPONSE=$(printf '%s' "$INIT_REQ" \
  | timeout "$TIMEOUT_SECS" node "$ENTRY" 2>/dev/null \
  | head -1) || true

if [ -z "$RESPONSE" ]; then
  printf '{"timestamp":"%s","status":"error",' "$TS" >> "$LOG_FILE"
  printf '"reason":"no_response",' >> "$LOG_FILE"
  printf '"timeout_secs":%d}\n' "$TIMEOUT_SECS" >> "$LOG_FILE"
  echo "FAIL: No response within ${TIMEOUT_SECS}s"
  exit 1
fi

if echo "$RESPONSE" | grep -q '"result"'; then
  RESP_LEN=${#RESPONSE}
  printf '{"timestamp":"%s","status":"ok",' "$TS" >> "$LOG_FILE"
  printf '"response_bytes":%d}\n' "$RESP_LEN" >> "$LOG_FILE"
  echo "OK: PRISM MCP server responded ($RESP_LEN bytes)"
  exit 0
else
  printf '{"timestamp":"%s","status":"error",' "$TS" >> "$LOG_FILE"
  printf '"reason":"bad_response"}\n' >> "$LOG_FILE"
  echo "FAIL: Server responded with error"
  exit 1
fi
