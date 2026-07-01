# Quick activation script for ZULU Primary Builder Emulation
# Run from Hermes to enable full user-style building

Write-Host "[ZULU] Activating Primary Builder Emulation..." -ForegroundColor Cyan

# Load the skill
hermes skill prism-builder-emulator

# Register MCP actions
node H:/prism/knowledge/hermes-outputs/zulu-builder-mcp-registration.mjs

Write-Host "[ZULU] Primary Builder Emulation ACTIVE. ZULU now operating in user style." -ForegroundColor Green