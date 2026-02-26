# PRISM MCP Server — Production Start Script (Windows)
# R6 Production Hardening

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectDir = Split-Path -Parent $ScriptDir

Write-Host "=== PRISM Production Start ===" -ForegroundColor Cyan
Write-Host "Node: $(node --version)"
Write-Host "Dir: $ProjectDir"

# Memory limits
$env:NODE_OPTIONS = "--max-old-space-size=4096"
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
