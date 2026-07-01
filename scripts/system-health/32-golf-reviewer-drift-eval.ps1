#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-B9 — golf reviewer model-drift eval (weekly cadence).

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around scripts/golf-reviewer-drift-eval.mjs.
  Once weekly, runs the golf peer-commit reviewer against a frozen 10-entry
  corpus of known-bug commits (state/shared/golf-reviewer-eval/corpus.json),
  scores accuracy, appends a row to accuracy-history.jsonl, and flags drift
  when EITHER gate trips:
    - SLOPE: linear-regression slope < -0.20 over the last 12-week window
    - FLOOR: latest accuracy < 0.70

  The reviewer agent is pinned to a STABLE model id (claude-sonnet-4-6) — NOT
  "latest" — so the eval measures genuine drift, not model-release noise.
  Prompt drift is flagged separately (corpus entries carry a promptVersion).

  Advisory only — exit 0 regardless of whether drift was detected; the
  operator reads the report / chat-bus signal. Exit 1 only on a real error
  (corpus unreadable, history write failure).

  Until the corpus is operator-seeded with real commit SHAs, the script
  reports `corpus_unseeded` and does NOT append history rows (so the trend
  is never polluted by placeholder runs).

.PARAMETER Json
  Pass --json (machine-readable summary to stdout).

.PARAMETER DryRun
  Pass --dry-run: run the eval but don't append a history row.

.PARAMETER Now
  Pass --now <ISO> to override "now" — used by tests / bisecting.

.EXAMPLE
  .\32-golf-reviewer-drift-eval.ps1 -Json

.EXAMPLE
  schtasks.exe /Create /SC WEEKLY /D SUN /ST 07:41 /TN "PRISM Golf Reviewer Drift Eval" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\32-golf-reviewer-drift-eval.ps1 -Json"

.NOTES
  Cadence: weekly Sunday 07:41 UTC (off the :00/:30 marks per fleet-friendly
           scheduling; phase-offset from the daily golf health scripts).
  Output:  state/shared/golf-reviewer-eval/accuracy-history.jsonl (1 row/week)
#>
param(
  [switch]$Json,
  [switch]$DryRun,
  [string]$Now
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)
$script = Join-Path $repo "scripts/golf-reviewer-drift-eval.mjs"

if (-not (Test-Path $script)) {
  Write-Error "golf-reviewer-drift-eval.mjs not found at: $script"
  exit 2
}

$nodeArgs = @($script)
if ($Json)   { $nodeArgs += "--json" }
if ($DryRun) { $nodeArgs += "--dry-run" }
if ($Now)    { $nodeArgs += "--now"; $nodeArgs += $Now }

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
