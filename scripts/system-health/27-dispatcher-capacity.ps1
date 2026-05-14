#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-F7 — Daily dispatcher capacity audit.

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around scripts/build-dispatcher-capacity.mjs.
  Flags dispatchers whose actions/limit ratio is >= 80% (warn) or >= 100%
  (critical) against the adaptive `dispatcher_capacity_ceiling` (default 200).
  The signal feeds C1 WiringPotentialEngine so new engines are NOT routed to
  saturated dispatchers, and exposes operator-facing capacity hotspots via
  state/shared/DISPATCHER_CAPACITY.md.

  The Node script returns:
    exit 0 — report written / --json emitted
    exit 1 — fatal IO (missing AGGREGATE) — the wrapper propagates this exit

.PARAMETER Json
  Pass --json to build-dispatcher-capacity.mjs (machine output to stdout,
  skip the DISPATCHER_CAPACITY.{md,json} writes).

.PARAMETER Ceiling
  Override the adaptive capacity ceiling (positive integer). When omitted,
  the Node script reads state/shared/adaptive-thresholds.json.

.PARAMETER AggregatePath
  Override the path to AGGREGATE.json (default:
  mcp-server/data/dispatcher-health/AGGREGATE.json).

.PARAMETER ThresholdsPath
  Override the path to adaptive-thresholds.json
  (default: state/shared/adaptive-thresholds.json).

.PARAMETER FrozenTime
  Override the report's `generatedAt` timestamp (ISO 8601). Used by the
  test suite + idempotency probes.

.EXAMPLE
  .\27-dispatcher-capacity.ps1
    # Default: writes DISPATCHER_CAPACITY.{md,json} to state/shared/.

.EXAMPLE
  schtasks.exe /Create /SC DAILY /ST 03:43 /TN "PRISM Dispatcher Capacity" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\27-dispatcher-capacity.ps1"

.NOTES
  Cadence: daily 03:43 (off the :00 / :30 minute marks, per fleet-friendly
  scheduling guidance). Read-only / advisory — does NOT mutate dispatcher
  source files; only writes the report dashboard.
#>
param(
  [switch]$Json,
  [int]$Ceiling,
  [string]$AggregatePath,
  [string]$ThresholdsPath,
  [string]$FrozenTime
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)  # repo root is two up from scripts/system-health/
$script = Join-Path $repo "scripts/build-dispatcher-capacity.mjs"

if (-not (Test-Path $script)) {
  Write-Error "build-dispatcher-capacity.mjs not found at: $script"
  exit 2
}

$nodeArgs = @($script)
if ($Json)            { $nodeArgs += "--json" }
if ($Ceiling -gt 0)   { $nodeArgs += "--ceiling";    $nodeArgs += "$Ceiling" }
if ($AggregatePath)   { $nodeArgs += "--aggregate";  $nodeArgs += $AggregatePath }
if ($ThresholdsPath)  { $nodeArgs += "--thresholds"; $nodeArgs += $ThresholdsPath }
if ($FrozenTime)      { $nodeArgs += "--frozen-time"; $nodeArgs += $FrozenTime }

# Prefer the portable Node managed by PRISM's harness; fall back to PATH.
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
