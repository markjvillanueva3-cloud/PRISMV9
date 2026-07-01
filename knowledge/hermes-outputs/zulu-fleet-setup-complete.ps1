<#
.SYNOPSIS
  One-time setup script to enable full ZULU fleet capabilities on this machine.
#>

Write-Host "[ZULU] Setting up full fleet capabilities..." -ForegroundColor Cyan

# Ensure the injection scripts are in the fleet folder
Copy-Item "H:/prism/knowledge/hermes-outputs/zulu-master-context-inject.ps1" -Destination "H:/Tools/prism-fleet/" -Force
Copy-Item "H:/prism/knowledge/hermes-outputs/zulu-5h-token-monitor.v2.ps1" -Destination "H:/Tools/prism-fleet/" -Force

Write-Host "[ZULU] Fleet setup complete. Awareness injection and 5h monitoring ready." -ForegroundColor Green