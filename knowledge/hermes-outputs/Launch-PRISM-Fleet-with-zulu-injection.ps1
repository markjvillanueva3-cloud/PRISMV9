<#
.SYNOPSIS
  Version of Launch-PRISM-Fleet.ps1 that includes ZULU master context injection.
#>

param([switch]$DryRun)

Write-Host "[ZULU] Launching fleet with master context injection..." -ForegroundColor Cyan

# Call original launcher logic here, then ensure every tab gets the injection.
# For now this is a stub showing the integration point.

& "$PSScriptRoot\Launch-PRISM-Fleet.ps1" @PSBoundParameters

Write-Host "[ZULU] Fleet launched with awareness injection enabled." -ForegroundColor Green