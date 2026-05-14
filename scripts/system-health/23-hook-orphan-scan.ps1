#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-H3 — Daily hook orphan + utilization scan (daily 05:31).

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around scripts/hook-orphan-scan.mjs.
  Consumes HOOK_REGISTRY.json + hook-latency.jsonl + async-hook-results.jsonl
  and flags:
    - orphan files (registered, wired:false)
    - 30-day-dormant hooks (no firings in window — requires H4 telemetry)
    - tier-mismatch (T0 claimed but never blocked)
    - missing tier frontmatter / missing event binding

  Advisory only — never auto-disables hooks or rewrites settings.json. The
  operator reviews state/shared/HOOK_UTILIZATION_REPORT.md and prunes.

  Telemetry sources (hook-latency.jsonl + async-hook-results.jsonl) are
  OPTIONAL — when absent, dormant+tier-mismatch detection is skipped and a
  note is added to the report.

.PARAMETER Json
  Pass --json to hook-orphan-scan.mjs (machine output to stdout, skip writes).

.PARAMETER WindowDays
  Override the firing-history window (default 30).

.PARAMETER Registry
  Override HOOK_REGISTRY.json path.

.PARAMETER LatencyPath
  Override hook-latency.jsonl path.

.PARAMETER AsyncPath
  Override async-hook-results.jsonl path.

.PARAMETER FrozenTime
  Override the report's `generatedAt` timestamp (ISO 8601). Used by tests.

.EXAMPLE
  .\23-hook-orphan-scan.ps1
    # Default: writes HOOK_UTILIZATION_REPORT.{md,json} to state/shared/.

.EXAMPLE
  schtasks.exe /Create /SC DAILY /ST 05:31 /TN "PRISM Hook Orphan Scan" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\23-hook-orphan-scan.ps1"

.NOTES
  Cadence: daily 05:31 (off the :00 / :30 marks per fleet-friendly scheduling).
#>
param(
  [switch]$Json,
  [int]$WindowDays,
  [string]$Registry,
  [string]$LatencyPath,
  [string]$AsyncPath,
  [string]$FrozenTime
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)
$script = Join-Path $repo "scripts/hook-orphan-scan.mjs"

if (-not (Test-Path $script)) {
  Write-Error "hook-orphan-scan.mjs not found at: $script"
  exit 2
}

$nodeArgs = @($script)
if ($Json)            { $nodeArgs += "--json" }
if ($WindowDays -gt 0){ $nodeArgs += "--window-days"; $nodeArgs += "$WindowDays" }
if ($Registry)        { $nodeArgs += "--registry";    $nodeArgs += $Registry }
if ($LatencyPath)     { $nodeArgs += "--latency";     $nodeArgs += $LatencyPath }
if ($AsyncPath)       { $nodeArgs += "--async";       $nodeArgs += $AsyncPath }
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
