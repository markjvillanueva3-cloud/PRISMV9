#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-H2 — Weekly skill utilization audit (Tue 04:23).

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around scripts/skill-utilization-scan.mjs.
  Flags 30-day-unused skills as PROPOSED archive candidates so the operator
  can decide whether to demote them to commands-archive/. Addresses HS-06
  (~565 user-skill re-injects per UserPromptSubmit → context bloat).

  Advisory only — never auto-moves files. Mark promotes manually after
  reviewing state/shared/SKILL_UTILIZATION_REPORT.md.

  Signals (in order of authority):
    1. invocation_count_30d from SKILL_QUALITY_REGISTRY.json (currently null
       for every skill — U-SKU04 will populate; today proxy-only).
    2. last_refined date from registry + on-disk file mtime — proxy for
       activity when telemetry is null.
    3. skill-lint-report.json — surfaces structural problems.

.PARAMETER Json
  Pass --json to skill-utilization-scan.mjs (emit JSON to stdout, skip the
  SKILL_UTILIZATION_REPORT.{md,json} writes).

.PARAMETER WindowDays
  Override the staleness window (default 30).

.PARAMETER Registry
  Override the SKILL_QUALITY_REGISTRY.json path.

.PARAMETER LintReport
  Override the skill-lint-report.json path.

.PARAMETER FrozenTime
  Override the report's `generatedAt` timestamp (ISO 8601). Used by the
  test suite + idempotency probes.

.EXAMPLE
  .\22-skill-utilization.ps1
    # Default: writes SKILL_UTILIZATION_REPORT.{md,json} to state/shared/.

.EXAMPLE
  schtasks.exe /Create /SC WEEKLY /D TUE /ST 04:23 /TN "PRISM Skill Utilization" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\22-skill-utilization.ps1"

.NOTES
  Cadence: weekly Tuesday 04:23 (off the :00 / :30 marks per fleet-friendly
  scheduling). Read-only / advisory — does NOT mutate skill files or move
  anything to archive.
#>
param(
  [switch]$Json,
  [int]$WindowDays,
  [string]$Registry,
  [string]$LintReport,
  [string]$FrozenTime
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)  # repo root is two up
$script = Join-Path $repo "scripts/skill-utilization-scan.mjs"

if (-not (Test-Path $script)) {
  Write-Error "skill-utilization-scan.mjs not found at: $script"
  exit 2
}

$nodeArgs = @($script)
if ($Json)            { $nodeArgs += "--json" }
if ($WindowDays -gt 0){ $nodeArgs += "--window-days"; $nodeArgs += "$WindowDays" }
if ($Registry)        { $nodeArgs += "--registry";    $nodeArgs += $Registry }
if ($LintReport)      { $nodeArgs += "--lint";        $nodeArgs += $LintReport }
if ($FrozenTime)      { $nodeArgs += "--frozen-time"; $nodeArgs += $FrozenTime }

# Prefer portable node managed by PRISM; fall back to PATH.
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
