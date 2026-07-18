<#
.SYNOPSIS
  Master activation script for full ZULU fleet capabilities.
#>

Write-Host "[ZULU] Running master fleet activation..." -ForegroundColor Cyan

# Copy production scripts into the fleet folder
$Source = "H:/prism/knowledge/hermes-outputs"
$Dest   = "H:/Tools/prism-fleet"

Copy-Item "$Source/zulu-master-context-inject.production.ps1" -Destination "$Dest/zulu-master-context-inject.ps1" -Force
Copy-Item "$Source/zulu-5h-token-monitor.production.ps1" -Destination "$Dest/" -Force
Copy-Item "$Source/zulu-6account-runtime-switcher.production.mjs" -Destination "$Dest/" -Force

Write-Host "[ZULU] Master activation complete. Awareness, monitoring, and switching ready." -ForegroundColor Green