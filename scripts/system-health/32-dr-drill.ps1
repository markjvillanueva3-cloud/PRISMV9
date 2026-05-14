# 32-dr-drill.ps1 — CLEANUP-MS0 / U-CLEANUP-G14
#
# MONTHLY DR-drill wrapper. Restores the latest G12 golf-state snapshot to
# H:/prism-dr-test/restore/, verifies integrity + row-count parity, and
# writes a JSONL row to H:/prism/state/shared/DR_DRILL_LEDGER.jsonl.
#
# Schedule: monthly, e.g. via Windows Task Scheduler:
#   schtasks /Create /TN "PRISM DR Drill" `
#            /TR "powershell.exe -NoProfile -File H:\prism\scripts\system-health\32-dr-drill.ps1" `
#            /SC MONTHLY /D 1 /ST 03:30 /F
#
# Companion: scripts/system-health/30-golf-state-snapshot.ps1 (G12, daily).
# Spec: state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md (Subsystem G.G14).
# Envelope: mcp-server/data/milestones/CLEANUP-MS0.json (U-CLEANUP-G14).

$ErrorActionPreference = "Stop"

# Locate portable node — preferred over PATH lookup because the cron may run
# under a non-interactive session without the node alias.
$node = "H:\Tools\nodejs\node.exe"
if (-not (Test-Path $node)) {
    $node = (Get-Command node -ErrorAction Stop).Source
}

$repo = "H:\prism"
$script = Join-Path $repo "scripts\dr-drill.mjs"

if (-not (Test-Path $script)) {
    Write-Error "dr-drill.mjs not found at $script"
    exit 1
}

# Apply mode (NOT dry-run). The drill writes one JSONL line to the ledger
# regardless of PASS/FAIL — exit code 0 = PASS, 1 = FAIL.
& $node $script --json 2>&1 | ForEach-Object { Write-Output $_ }
exit $LASTEXITCODE
