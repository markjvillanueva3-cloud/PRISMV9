<# 
.SYNOPSIS
  Production Hermes-based per-slot tab boot script.
  Always resumes the most recent session and initializes with loop-enforced harness.
#>

param([Parameter(Mandatory)][string]$Slot)

$ErrorActionPreference = 'Continue'

# Inject enhanced ZULU master context (loops, critic, persistent memory, token optimization)
& "$PSScriptRoot\zulu-master-context-inject.enhanced.ps1" -Slot $Slot

# Set Hermes profile
$env:HERMES_PROFILE = $Slot.ToLower()

# Launch Hermes and resume latest session
hermes --profile $env:HERMES_PROFILE --continue

Write-Host "[ZULU] $Slot launched with full loop-enforced harness and master context." -ForegroundColor Cyan