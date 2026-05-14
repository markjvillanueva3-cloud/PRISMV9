#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-H6 — Daily awareness health rollup (daily 08:17).

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around scripts/build-awareness-health.mjs.
  Combines the outputs of H1-H5 audits (memory garden / skill util / hook util /
  CLAUDE.md drift / GSD freshness) into a single operator dashboard at
  state/shared/AWARENESS_HEALTH_DASHBOARD.md.

  Overall health score (0-100):
    100 - (P0 × 10) - (P1 × 3) - (P2 × 1) - floor(orphan-like / 50)
    < 50 = RED, < 75 = YELLOW, >= 75 = GREEN

  Trend tracking: appends a single timestamped row to
  state/shared/awareness-health-trends.jsonl on every run; the dashboard
  surfaces the rolling 30-day window.

.PARAMETER Json
  Pass --json to build-awareness-health.mjs.

.PARAMETER FrozenTime
  Override the dashboard's `generatedAt` timestamp (ISO 8601). Used by tests.

.PARAMETER SkipTrendsAppend
  Read the trends history but do not append the current run.

.EXAMPLE
  .\26-awareness-health.ps1
    # Default: writes AWARENESS_HEALTH_DASHBOARD.{md,json} + appends trend row.

.EXAMPLE
  schtasks.exe /Create /SC DAILY /ST 08:17 /TN "PRISM Awareness Health" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\26-awareness-health.ps1"

.NOTES
  Cadence: daily 08:17 (off the :00 / :30 marks per fleet-friendly scheduling).
  Depends on H1-H5 cron outputs being present in state/shared/. Missing
  inputs degrade gracefully (sections show "source not available").
#>
param(
  [switch]$Json,
  [string]$FrozenTime,
  [switch]$SkipTrendsAppend
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)
$script = Join-Path $repo "scripts/build-awareness-health.mjs"

if (-not (Test-Path $script)) {
  Write-Error "build-awareness-health.mjs not found at: $script"
  exit 2
}

$nodeArgs = @($script)
if ($Json)              { $nodeArgs += "--json" }
if ($FrozenTime)        { $nodeArgs += "--frozen-time"; $nodeArgs += $FrozenTime }
if ($SkipTrendsAppend)  { $nodeArgs += "--skip-trends-append" }

$nodeBin = "H:\Tools\nodejs\node.exe"
if (-not (Test-Path $nodeBin)) {
  $nodeBin = (Get-Command node -ErrorAction SilentlyContinue).Source
}
if (-not $nodeBin) {
  Write-Error "node binary not found (tried H:\Tools\nodejs\node.exe + PATH)"
  exit 3
}

& $nodeBin @nodeArgs
$exit = $LASTEXITCODE
if ($null -eq $exit) { $exit = 0 }
exit $exit
