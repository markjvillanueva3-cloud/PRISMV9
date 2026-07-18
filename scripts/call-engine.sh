#!/usr/bin/env bash
# Server-free PRISM engine invoker (bash). Runs call-engine.mjs through tsx so
# TS engine sources + their deps resolve from mcp-server/node_modules.
# Usage: scripts/call-engine.sh <module> <export.method> '<json-params>'
exec npx --prefix H:/prism/mcp-server tsx H:/prism/scripts/call-engine.mjs "$@"
