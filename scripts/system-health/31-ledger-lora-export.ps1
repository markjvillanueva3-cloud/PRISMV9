#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-B12 — LedgerLoRAExporter nightly cron.

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around scripts/export-ledger-lora.mjs.
  Nightly read-only export of `bug_attribution` rows from
    state/shared/coordination.db
  in cam_lora-style JSONL format to
    state/shared/lora-training/peer-audit-<YYYY-MM>.jsonl

  Behaviour:
    - Default (no -Month): rewrites BOTH previous + current month (idempotent;
      P0 month-boundary fix — rows arriving at month edge are never lost).
    - Explicit -Month YYYY-MM: targets only that month.
    - "Training-ready" signal: emitted in the .stats.json sidecar once total
      bug_attribution rows across all months >= 1000 (the LoRA dataset is
      staging-only until the threshold; this preserves option-value without
      forcing premature fine-tuning).

  Advisory only — missing DB returns ok+db_missing (no-op). Real errors
  exit 1 so cron monitors can alarm. Usage/arg errors exit 2.

.PARAMETER Json
  Pass --json (machine-readable summary to stdout).

.PARAMETER DryRun
  Pass --dry-run: compute the export plan with zero writes.

.PARAMETER Month
  Pass --month YYYY-MM to target a specific month (otherwise default = prev+cur).

.PARAMETER Now
  Pass --now <ISO> to override "now" — used by tests / bisecting.

.PARAMETER MinTrainingRows
  Override the training_ready threshold (default 1000).

.EXAMPLE
  .\31-ledger-lora-export.ps1 -Json

.EXAMPLE
  schtasks.exe /Create /SC DAILY /ST 04:53 /TN "PRISM Ledger LoRA Export" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\31-ledger-lora-export.ps1 -Json"

.NOTES
  Cadence: daily at 04:53 UTC (off the :00/:30 marks per fleet-friendly
           scheduling; phase-offset from neighbour 30-golf-state-snapshot.ps1).
  Output:  state/shared/lora-training/peer-audit-<YYYY-MM>.jsonl
           state/shared/lora-training/peer-audit-<YYYY-MM>.stats.json
#>
param(
  [switch]$Json,
  [switch]$DryRun,
  [string]$Month,
  [string]$Now,
  [int]$MinTrainingRows = 0
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)
$script = Join-Path $repo "scripts/export-ledger-lora.mjs"

if (-not (Test-Path $script)) {
  Write-Error "export-ledger-lora.mjs not found at: $script"
  exit 2
}

$nodeArgs = @($script)
if ($Json)                  { $nodeArgs += "--json" }
if ($DryRun)                { $nodeArgs += "--dry-run" }
if ($Month)                 { $nodeArgs += "--month";              $nodeArgs += $Month }
if ($Now)                   { $nodeArgs += "--now";                $nodeArgs += $Now }
if ($MinTrainingRows -gt 0) { $nodeArgs += "--min-training-rows";  $nodeArgs += "$MinTrainingRows" }

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
