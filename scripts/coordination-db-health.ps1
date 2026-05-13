#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-G2 — Scheduled-task wrapper for coord-db-sentinel.mjs.

.DESCRIPTION
  Thin PowerShell harness around `scripts/coord-db-sentinel.mjs` so the
  health check can be wired to a Windows Task Scheduler job (one-line
  scriptblock), to a 04-* maintenance script, or invoked ad-hoc by an
  operator. Forwards stdout/stderr from the Node script and propagates
  its exit code.

  The Node script is exit-0-always (advisory contract); a non-zero exit
  here therefore means the wrapper or Node runtime itself failed (missing
  Node binary, unreadable script, etc.) — investigate the host config.

  Output files are written by the Node script:
    - state/shared/COORD_DB_HEALTH.md   (human)
    - state/shared/COORD_DB_HEALTH.json (machine)

.PARAMETER Json
  Pass --json to coord-db-sentinel.mjs (emit JSON to stdout, do not write
  the COORD_DB_HEALTH.{md,json} report files).

.PARAMETER Db
  Override the SQLite db path (default: state/shared/coordination.db).

.PARAMETER JsonClaims
  Override the legacy WORK_CLAIMS.json path (default:
  state/shared/WORK_CLAIMS.json).

.PARAMETER FrozenTime
  Override the report's `generated_at` timestamp (ISO 8601). Used by the
  test suite + idempotency probes so two runs over identical input
  produce byte-identical markdown.

.EXAMPLE
  .\coordination-db-health.ps1
    # Default: writes COORD_DB_HEALTH.{md,json} reports to state/shared/.

.EXAMPLE
  .\coordination-db-health.ps1 -Json
    # JSON to stdout (suitable for piping to jq / cron summarizers).

.EXAMPLE
  schtasks.exe /Create /SC HOURLY /TN "PRISM Coord DB Health" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\coordination-db-health.ps1"
#>
param(
  [switch]$Json,
  [string]$Db,
  [string]$JsonClaims,
  [string]$FrozenTime
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent $here
$script = Join-Path $here "coord-db-sentinel.mjs"

if (-not (Test-Path $script)) {
  Write-Error "coord-db-sentinel.mjs not found at: $script"
  exit 2
}

$nodeArgs = @($script)
if ($Json)              { $nodeArgs += "--json" }
if ($Db)                { $nodeArgs += "--db";          $nodeArgs += $Db }
if ($JsonClaims)        { $nodeArgs += "--json-claims"; $nodeArgs += $JsonClaims }
if ($FrozenTime)        { $nodeArgs += "--frozen-time"; $nodeArgs += $FrozenTime }

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
if ($null -eq $exit) { $exit = 0 }  # & with native exe always sets $LASTEXITCODE; defensive.
exit $exit
