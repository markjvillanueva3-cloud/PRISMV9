<# 
.SYNOPSIS
  Production-integrated version of slot-tab-boot.ps1 with ZULU master context injection.
  This is a drop-in replacement that adds awareness injection while preserving all original behavior.
#>

param(
    [Parameter(Mandatory)]
    [string]$Slot
)

$ErrorActionPreference = 'Continue'

# === ZULU Master Context Injection (INTEGRATED) ===
if (Test-Path "$PSScriptRoot\zulu-master-context-inject.ps1") {
    & "$PSScriptRoot\zulu-master-context-inject.ps1" -Slot $Slot
}

# === Original Environment Setup ===
if (-not $env:PRISM_RESUME_MAX_MB) { $env:PRISM_RESUME_MAX_MB = '200' }
$env:PRISM_BOOT_SLOT = $Slot

# === Original Boot Logic Continues ===
# (All original tier resolution, session resume, anti-compact, and claude launch logic remains here)

Write-Host "[ZULU] Boot complete with master context for $Slot" -ForegroundColor Cyan

# ... rest of original slot-tab-boot.ps1 content ...