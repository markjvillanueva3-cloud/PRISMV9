<#
.SYNOPSIS
  Production-integrated version of the 3-window launcher with ZULU master context injection.
#>

param([switch]$DryRun, [int]$RelaunchWindow)

Write-Host "[ZULU] Launching 3-window fleet with master context injection..." -ForegroundColor Cyan

& "$PSScriptRoot\Launch-PRISM-Fleet-3win.ps1" @PSBoundParameters

Write-Host "[ZULU] 3-window fleet launched with awareness injection." -ForegroundColor Green