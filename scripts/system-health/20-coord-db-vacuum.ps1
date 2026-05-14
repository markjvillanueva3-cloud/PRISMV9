# 20-coord-db-vacuum.ps1 — CLEANUP-MS0 / U-CLEANUP-G17
#
# Weekly Sunday 02:17 PRAGMA wal_checkpoint(TRUNCATE) + VACUUM on
# H:/prism/state/shared/coordination.db. Thin wrapper around
# H:/prism/scripts/coord-db-vacuum.mjs — the .mjs holds all logic +
# vitest coverage; this file exists so Windows Task Scheduler has a
# native .ps1 to invoke without learning Node's calling convention.
#
# Scheduled via H:/prism/.claude/helpers/install-coord-db-vacuum-task.ps1
# (companion installer, planned). Manual invocation:
#
#   pwsh -NoProfile -ExecutionPolicy Bypass `
#        -File H:/prism/scripts/system-health/20-coord-db-vacuum.ps1
#
# Exit code: always 0 (the .mjs logs failures to coord-db-health.json —
# Task Scheduler must not keep retrying; operator triages from the log).
#
# @see scripts/coord-db-vacuum.mjs
# @see U-CLEANUP-G17

$ErrorActionPreference = "Continue"

$Node   = "H:/.claude/bin/portable-node.cmd"
$Script = "H:/prism/scripts/coord-db-vacuum.mjs"

# Fall back to bare 'node' if the portable wrapper is missing (dev hosts).
if (-not (Test-Path $Node)) {
  $Node = "node"
}

if (-not (Test-Path $Script)) {
  Write-Host "coord-db-vacuum: missing $Script — skipping run"
  exit 0
}

& $Node $Script
exit 0
