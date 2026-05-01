#!/bin/bash
# Start PRISM MCP Server in HTTP mode (single shared instance)
# Run this once, all Claude chats connect to it

export TRANSPORT=http
# Canonical port — MUST match `MCP_HTTP_URL` in .mcp.json. The wired
# SessionStart hook (mcp-daemon-autostart.mjs) and the bridge default
# both target 3100. Drift caused the multi-chat hang debugged in
# FIX-MCP-MULTI-CHAT-2.
export PORT=3100
export LOG_LEVEL=info
export NODE_OPTIONS="--max-old-space-size=16384"

echo "Starting PRISM MCP Server on http://localhost:3100"
echo "All Claude chats will share this single server instance"
echo "Press Ctrl+C to stop"
echo ""

cd H:/prism/mcp-server
node dist/index.js
