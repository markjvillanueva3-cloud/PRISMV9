# PRISM Claude Flow + MCP Setup Script
# Run this in PowerShell as Administrator

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "PRISM Claude Flow + MCP Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Node.js
Write-Host "[1/6] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "  ✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js not found. Please install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Step 2: Check npm
Write-Host "[2/6] Checking npm..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($npmVersion) {
    Write-Host "  ✓ npm installed: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "  ✗ npm not found" -ForegroundColor Red
    exit 1
}

# Step 3: Install MCP servers
Write-Host "[3/6] Installing MCP servers..." -ForegroundColor Yellow
Write-Host "  Installing @modelcontextprotocol/server-filesystem..."
npm install -g @modelcontextprotocol/server-filesystem 2>$null
Write-Host "  Installing @modelcontextprotocol/server-memory..."
npm install -g @modelcontextprotocol/server-memory 2>$null
Write-Host "  ✓ MCP servers installed" -ForegroundColor Green

# Step 4: Create Claude Desktop config
Write-Host "[4/6] Setting up Claude Desktop config..." -ForegroundColor Yellow
$claudeConfigDir = "$env:APPDATA\Claude"
$claudeConfigFile = "$claudeConfigDir\claude_desktop_config.json"

# Create directory if it doesn't exist
if (!(Test-Path $claudeConfigDir)) {
    New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
}

# Create or update config
$config = @{
    mcpServers = @{
        filesystem = @{
            command = "npx"
            args = @("-y", "@modelcontextprotocol/server-filesystem", "C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)")
        }
        memory = @{
            command = "npx"
            args = @("-y", "@modelcontextprotocol/server-memory")
        }
    }
}

$configJson = $config | ConvertTo-Json -Depth 10
Set-Content -Path $claudeConfigFile -Value $configJson -Encoding UTF8
Write-Host "  ✓ Claude Desktop config created at: $claudeConfigFile" -ForegroundColor Green

# Step 5: Verify PRISM directories
Write-Host "[5/6] Verifying PRISM directories..." -ForegroundColor Yellow
$prismRoot = "C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)"
$requiredDirs = @(
    ".claude-memory",
    ".swarm",
    "_CLAUDE_FLOW",
    "_CLAUDE_FLOW\scripts"
)

foreach ($dir in $requiredDirs) {
    $fullPath = Join-Path $prismRoot $dir
    if (!(Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Gray
    } else {
        Write-Host "  ✓ Exists: $dir" -ForegroundColor Green
    }
}

# Step 6: Summary
Write-Host "[6/6] Setup Complete!" -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. RESTART Claude Desktop for MCP servers to load" -ForegroundColor White
Write-Host ""
Write-Host "2. To verify MCP is working, ask Claude:" -ForegroundColor White
Write-Host '   "List files in C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)"' -ForegroundColor Gray
Write-Host ""
Write-Host "3. For Claude Flow multi-agent (when available):" -ForegroundColor White
Write-Host "   npm install -g @anthropic/claude-flow" -ForegroundColor Gray
Write-Host "   claude-flow init prism-extraction" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Config file location:" -ForegroundColor White
Write-Host "$claudeConfigFile" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Cyan
