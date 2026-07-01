# Start PRISM MCP Server in HTTP mode (single shared instance)
# Run this once, all Claude chats connect to it

$env:TRANSPORT = "http"
# Canonical port — MUST match MCP_HTTP_URL in .mcp.json (3100). The wired
# SessionStart hook (mcp-daemon-autostart.mjs) and the bridge default both
# target 3100. Drift caused the multi-chat hang debugged in FIX-MCP-MULTI-CHAT-2.
$env:PORT = "3100"
$env:LOG_LEVEL = "info"
$env:NODE_OPTIONS = "--max-old-space-size=16384"

Write-Host "Starting PRISM MCP Server on http://localhost:3100" -ForegroundColor Green
Write-Host "All Claude chats will share this single server instance" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

Set-Location H:\prism\mcp-server
node dist/index.js
