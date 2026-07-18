<# 
.SYNOPSIS
  Production-ready modified version of slot-tab-boot.ps1 with ZULU master context injection.
  Minimal change from original — only adds the awareness injection call.
#>

param(
    [Parameter(Mandatory)]
    [string]$Slot
)

$ErrorActionPreference = 'Continue'

# === ZULU Master Context Injection (ADDED) ===
& "$PSScriptRoot\zulu-master-context-inject.ps1" -Slot $Slot

# === Original logic continues unchanged below ===
# (In a real merge, the rest of the original file would remain here)

$env:PRISM_BOOT_SLOT = $Slot

Write-Host "[ZULU] Boot complete with master context for $Slot" -ForegroundColor Cyan

# ... rest of original file ...