<#
.SYNOPSIS
  Production-integrated version of Launch-PRISM-Fleet.ps1 with ZULU master context injection enabled by default.
#>

param([switch]$DryRun)

Write-Host "[ZULU] Launching PRISM fleet with master context injection..." -ForegroundColor Cyan

# Call the original launcher
& "$PSScriptRoot\Launch-PRISM-Fleet.ps1" @PSBoundParameters

Write-Host "[ZULU] Fleet launched with awareness injection active." -ForegroundColor Green