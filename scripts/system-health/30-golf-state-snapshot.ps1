#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-G12 — Golf-state snapshot cron (daily cadence).

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around scripts/golf-state-snapshot.mjs.
  Once daily, copies the golf hygiene chat's durable state —
    state/shared/coordination.db
    state/shared/golf-owned-paths.json
    state/shared/golf-cron-registry.json
    state/shared/golf-token-budget.json
    + a portable JSONL dump of the bug_attribution table
  — to H:/prism-backups/golf-state/<ISO>/, and prunes snapshot dirs older
  than 30 days.

  Why daily cadence: golf state changes slowly (claims churn intra-day but the
  registry/budget/ledger are day-scale). A daily snapshot is the right
  granularity for the G14 dr-drill restore target without burning quota.

  Advisory only — golf-state-snapshot.mjs accrues I/O failures into
  result.errors and exits 1 only if something actually failed; a missing
  source file is recorded as `skipped`, never a hard failure.

.PARAMETER Json
  Pass --json to golf-state-snapshot.mjs (machine-readable summary to stdout).

.PARAMETER DryRun
  Pass --dry-run: compute the full plan (copies, dump, prune) with zero writes.

.PARAMETER RetainDays
  Pass --retain-days N (default 30 in the .mjs).

.PARAMETER Now
  Pass --now <ISO> to override "now" — used by tests / bisecting.

.EXAMPLE
  .\30-golf-state-snapshot.ps1

.EXAMPLE
  schtasks.exe /Create /SC DAILY /ST 04:17 /TN "PRISM Golf State Snapshot" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\30-golf-state-snapshot.ps1"

.NOTES
  Cadence: daily at 04:17 (off the :00/:30 marks per fleet-friendly scheduling).
  Output:  H:/prism-backups/golf-state/<ISO>/ (coordination.db + 3 golf-*.json
           + bug_attribution.jsonl + manifest.json), 30-day retention.
#>
param(
  [switch]$Json,
  [switch]$DryRun,
  [int]$RetainDays = 0,
  [string]$Now
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)
$script = Join-Path $repo "scripts/golf-state-snapshot.mjs"

if (-not (Test-Path $script)) {
  Write-Error "golf-state-snapshot.mjs not found at: $script"
  exit 2
}

$nodeArgs = @($script)
if ($Json)            { $nodeArgs += "--json" }
if ($DryRun)          { $nodeArgs += "--dry-run" }
# RetainDays is only forwarded when explicitly set (> 0) — otherwise the .mjs
# default (30) applies. 0 from the param default means "not supplied here".
if ($RetainDays -gt 0) { $nodeArgs += "--retain-days"; $nodeArgs += "$RetainDays" }
if ($Now)             { $nodeArgs += "--now"; $nodeArgs += $Now }

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
