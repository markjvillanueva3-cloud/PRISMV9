# PRISM MCP Server — Production Start Script (Windows)
# R6 Production Hardening

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectDir = Split-Path -Parent $ScriptDir

Write-Host "=== PRISM Production Start ===" -ForegroundColor Cyan
Write-Host "Node: $(node --version)"
Write-Host "Dir: $ProjectDir"

# Memory limits -- env-overridable (matches deploy/start.sh, R11). Default 4096 is
# a safe floor. On the Blackwell box the canonical launch is the supervisor
# (mcp-server-supervisor.mjs), which floors the heap to PRISM_MCP_HEAP_FLOOR_MB=24576;
# set MAX_OLD_SPACE_SIZE to tune a DIRECT production start. Do NOT hardcode a large
# value: --max-old-space-size is a commit RESERVATION on Windows (counted against the
# commit ceiling even unused -- lesson commit-pressure-find-the-real-committer), so a
# too-large default re-breaks a busy box's ability to spawn.
$HeapMb = if ($env:MAX_OLD_SPACE_SIZE) { $env:MAX_OLD_SPACE_SIZE } else { "4096" }
$env:NODE_OPTIONS = "--max-old-space-size=$HeapMb"
$env:NODE_ENV = "production"
if (-not $env:PRISM_LOG_LEVEL) { $env:PRISM_LOG_LEVEL = "info" }
if (-not $env:PRISM_LOG_FORMAT) { $env:PRISM_LOG_FORMAT = "json" }

# Health check
if (-not (Test-Path "$ProjectDir\dist\index.js")) {
    Write-Host "ERROR: dist/index.js not found. Run 'npm run build' first." -ForegroundColor Red
    exit 1
}

# Start
Write-Host "Starting PRISM MCP Server (production)..." -ForegroundColor Green
node "$ProjectDir\dist\index.js"
