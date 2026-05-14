#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-H5 — Daily GSD doctrine docs freshness scan.

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around scripts/gsd-freshness-scan.mjs.
  Watches mcp-server/data/docs/gsd/ + sections/ for:
    - mtime staleness: files unmodified for > N days (default 90)
    - count-drift: GSD_QUICK.md header counts vs PRISM-INVENTORY-LATEST.md

  Writes state/shared/GSD_FRESHNESS_REPORT.{md,json}. Advisory only.

.PARAMETER Json
  Pass --json to gsd-freshness-scan.mjs.

.PARAMETER StaleDays
  Override the mtime-staleness threshold (default 90).

.PARAMETER GsdDir
  Override the GSD docs dir path.

.PARAMETER InventoryPath
  Override the PRISM-INVENTORY-LATEST.md path.

.PARAMETER FrozenTime
  Override the report's `generatedAt` timestamp (ISO 8601). Used by tests.

.EXAMPLE
  .\25-gsd-freshness.ps1
    # Default: writes GSD_FRESHNESS_REPORT.{md,json} to state/shared/.

.EXAMPLE
  schtasks.exe /Create /SC DAILY /ST 07:17 /TN "PRISM GSD Freshness" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\25-gsd-freshness.ps1"

.NOTES
  Cadence: daily 07:17 (off the :00 / :30 marks per fleet-friendly scheduling).
#>
param(
  [switch]$Json,
  [int]$StaleDays,
  [string]$GsdDir,
  [string]$InventoryPath,
  [string]$FrozenTime
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)
$script = Join-Path $repo "scripts/gsd-freshness-scan.mjs"

if (-not (Test-Path $script)) {
  Write-Error "gsd-freshness-scan.mjs not found at: $script"
  exit 2
}

$nodeArgs = @($script)
if ($Json)            { $nodeArgs += "--json" }
if ($StaleDays -gt 0) { $nodeArgs += "--stale-days"; $nodeArgs += "$StaleDays" }
if ($GsdDir)          { $nodeArgs += "--gsd-dir";    $nodeArgs += $GsdDir }
if ($InventoryPath)   { $nodeArgs += "--inventory";  $nodeArgs += $InventoryPath }
if ($FrozenTime)      { $nodeArgs += "--frozen-time"; $nodeArgs += $FrozenTime }

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
