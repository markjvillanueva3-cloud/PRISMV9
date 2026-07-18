<# 
.SYNOPSIS
  Modified slot-tab-boot.ps1 with ZULU master context injection included.
  Drop-in replacement for testing the new awareness system.
#>

param(
    [Parameter(Mandatory)]
    [string]$Slot
)

$ErrorActionPreference = 'Continue'

# === ZULU Master Context Injection (NEW) ===
& "$PSScriptRoot\zulu-master-context-inject.ps1" -Slot $Slot

# === Original boot logic continues below ===
# (In real use this would be the full original content with the injection added)

Write-Host "[ZULU] Boot with master context complete for $Slot" -ForegroundColor Green

# ... rest of original slot-tab-boot.ps1 would go here ...