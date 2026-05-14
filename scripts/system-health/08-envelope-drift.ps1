#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-F2 — Envelope drift cron (30-min cadence).

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around scripts/build-envelope-drift.mjs.
  Regenerates state/shared/MILESTONE_PROGRESS.json, computes a canonicalized
  hash + extracts totals.drift, compares against the previous snapshot at
  state/shared/envelope-drift-last.json, and posts to AGENT_CHAT.md via the
  agent-coordination helper when drift INCREASES. Trend rows are appended to
  state/shared/envelope-drift-trends.jsonl on every run for windowed analysis.

  Why 30-min cadence: drift events typically lag commits by minutes (peer
  chats ship work without flipping their envelope), so a 30-min poll
  surfaces silent debt promptly without burning quota on no-op ticks.

.PARAMETER Json
  Pass --json to build-envelope-drift.mjs so callers can parse the result.

.PARAMETER FrozenTime
  Override the result's generatedAt timestamp (ISO 8601). Used by tests.

.PARAMETER SkipTrendsAppend
  Don't append to envelope-drift-trends.jsonl this run.

.PARAMETER SkipBusPost
  Don't post to AGENT_CHAT.md even if drift increased (dry-run).

.PARAMETER ForcePost
  Post regardless of drift delta (manual trigger).

.EXAMPLE
  .\08-envelope-drift.ps1

.EXAMPLE
  schtasks.exe /Create /SC MINUTE /MO 30 /ST 00:23 /TN "PRISM Envelope Drift" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\08-envelope-drift.ps1"

.NOTES
  Cadence: every 30 min starting at :23 (off the :00/:30 marks per fleet-friendly scheduling).
  Output:  state/shared/envelope-drift-last.json (snapshot)
           state/shared/envelope-drift-trends.jsonl (windowed history)
           AGENT_CHAT.md (posted only on drift increase)
#>
param(
  [switch]$Json,
  [string]$FrozenTime,
  [switch]$SkipTrendsAppend,
  [switch]$SkipBusPost,
  [switch]$ForcePost
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)
$script = Join-Path $repo "scripts/build-envelope-drift.mjs"

if (-not (Test-Path $script)) {
  Write-Error "build-envelope-drift.mjs not found at: $script"
  exit 2
}

$nodeArgs = @($script)
if ($Json)              { $nodeArgs += "--json" }
if ($FrozenTime)        { $nodeArgs += "--frozen-time"; $nodeArgs += $FrozenTime }
if ($SkipTrendsAppend)  { $nodeArgs += "--skip-trends-append" }
if ($SkipBusPost)       { $nodeArgs += "--skip-bus-post" }
if ($ForcePost)         { $nodeArgs += "--force-post" }

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
