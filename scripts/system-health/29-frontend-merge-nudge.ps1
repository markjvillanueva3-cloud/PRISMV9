#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-F3 — Frontend-merge nudge cron (daily cadence).

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around scripts/frontend-merge-nudge.mjs.
  Reads state/shared/BUILD_STATE.json -> NEEDS_FRONTEND.trees[], filters
  merge_status === "PENDING_MERGE", tracks per-tree firstSeen timestamps in
  state/shared/.frontend-merge-nudge-last.json, and once any tree has been
  pending for >7 days posts ONE bundled nudge to AGENT_CHAT.md — at most once
  per 24h.

  Why daily cadence: a pending frontend merge is a slow-moving condition (days,
  not minutes). A daily poll surfaces it without burning quota; the .mjs script
  itself enforces the 7-day staleness gate and the 1-post-per-day rate limit,
  so the .ps1 is a pure pass-through trigger.

  Advisory only — frontend-merge-nudge.mjs always exits 0, so this wrapper
  never fails a scheduler run.

.PARAMETER Json
  Pass --json to frontend-merge-nudge.mjs so callers can parse the result.

.PARAMETER DryRun
  Pass --dry-run: compute only, no bus post, no sidecar write.

.PARAMETER SkipBusPost
  Pass --skip-bus-post: compute + write sidecar, but no AGENT_CHAT.md post.

.PARAMETER Force
  Pass --force: ignore the 24h post cooldown (7d staleness still required).

.PARAMETER FrozenTime
  Override "now" (ISO 8601). Used by tests.

.EXAMPLE
  .\29-frontend-merge-nudge.ps1

.EXAMPLE
  schtasks.exe /Create /SC DAILY /ST 08:43 /TN "PRISM Frontend Merge Nudge" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\29-frontend-merge-nudge.ps1"

.NOTES
  Cadence: daily at 08:43 (off the :00/:30 marks per fleet-friendly scheduling).
  Output:  state/shared/.frontend-merge-nudge-last.json (sidecar — firstSeen + lastNudgeAt)
           AGENT_CHAT.md (posted only when a tree is >7d stale AND cooldown elapsed)
#>
param(
  [switch]$Json,
  [switch]$DryRun,
  [switch]$SkipBusPost,
  [switch]$Force,
  [string]$FrozenTime
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)
$script = Join-Path $repo "scripts/frontend-merge-nudge.mjs"

if (-not (Test-Path $script)) {
  Write-Error "frontend-merge-nudge.mjs not found at: $script"
  exit 2
}

$nodeArgs = @($script)
if ($Json)        { $nodeArgs += "--json" }
if ($DryRun)      { $nodeArgs += "--dry-run" }
if ($SkipBusPost) { $nodeArgs += "--skip-bus-post" }
if ($Force)       { $nodeArgs += "--force" }
if ($FrozenTime)  { $nodeArgs += "--frozen-time"; $nodeArgs += $FrozenTime }

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
