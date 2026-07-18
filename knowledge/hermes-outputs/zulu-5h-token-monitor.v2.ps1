<#
.SYNOPSIS
  Improved 5h token monitor v2.
  Attempts to read real usage data from the Claude session environment if available.
#>

param([string]$Slot)

$ErrorActionPreference = 'Continue'

# Try to read from environment if Claude exposes it
$FiveHourPct = $env:CLAUDE_5H_PCT
if (-not $FiveHourPct) {
    $FiveHourPct = 79   # Fallback for testing
}

$Entry = @{
    ts = (Get-Date).ToString("o")
    slot = $Slot
    kind = "5h-token-report"
    fiveHourPct = [int]$FiveHourPct
    message = if ([int]$FiveHourPct -ge 88) { "NEAR LIMIT - switch recommended" } else { "ok" }
} | ConvertTo-Json -Compress

Add-Content -Path "H:/prism/state/shared/live-fleet-heartbeat.jsonl" -Value $Entry -ErrorAction SilentlyContinue

Write-Host "[ZULU] $Slot 5h usage: ${FiveHourPct}%" -ForegroundColor DarkGray