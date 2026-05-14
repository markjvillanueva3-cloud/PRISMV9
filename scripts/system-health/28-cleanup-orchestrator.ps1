#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-E3 — every-5-min orphan reaper for nodes / git locks / bash.

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around .claude/helpers/cleanup-orchestrator.mjs.
  The orchestrator delegates to 5 existing PRISM cleaners (NO new kill logic):
    - git-lock-sweeper.mjs        — clears stale .git/*.lock
    - chat-bus-reap.mjs           — reaps zombie chat-bus presence + claims
    - zombie-reaper-daemon.mjs    — clears orphaned lock files + dead claims
    - node-orphan-cleaner.mjs     — kills stale transient node.exe (90s self-throttle)
    - bash-orphan-cleaner.mjs     — kills orphan bash.exe from THIS host's claude tree

  Survives session-clear / Claude exit — runs as a Windows scheduled task on the
  Task Scheduler service, not in any Claude session.

  Best-effort: a single cleaner failure never aborts the orchestrator; the
  unified summary line is logged to state/shared/cleanup-orchestrator.log.

.PARAMETER DryRun
  Forward --dry-run to cleaners that support it (chat-bus, node-orphans).
  Hook-style cleaners are skipped under --dry-run.

.PARAMETER ForceThrottled
  Bypass node-orphan-cleaner's 90s RUN_THROTTLE_MS. Operator opt-in only —
  never set this on the scheduled task itself; cron-triggered runs MUST respect
  the throttle to avoid load spikes on a 5-min cadence.

.PARAMETER Json
  Emit machine-readable JSON instead of the one-line text summary.

.EXAMPLE
  .\28-cleanup-orchestrator.ps1
    # Default: invokes orchestrator, emits one-line summary, exits with orchestrator's exit code.

.EXAMPLE
  # Install as a scheduled task (every 5 minutes):
  schtasks.exe /Create /SC MINUTE /MO 5 /TN "PRISM Cleanup Orchestrator" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\28-cleanup-orchestrator.ps1" `
    /F
  # Verify:
  schtasks.exe /Query /TN "PRISM Cleanup Orchestrator" /V /FO LIST
  # Disable:
  schtasks.exe /Delete /TN "PRISM Cleanup Orchestrator" /F

.NOTES
  Cadence: every 5 minutes (the throttle in node-orphan-cleaner self-limits its
  fork rate to 90s, so the effective node-orphan kill rate is once per ~90s
  even though the scheduler fires every 300s).

  Logs: H:\prism\state\shared\cleanup-orchestrator.log (rotated at 256 KiB).
#>
param(
  [switch]$DryRun,
  [switch]$ForceThrottled,
  [switch]$Json
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)
$script = Join-Path $repo ".claude/helpers/cleanup-orchestrator.mjs"

if (-not (Test-Path $script)) {
  Write-Error "cleanup-orchestrator.mjs not found at: $script"
  exit 2
}

$nodeArgs = @($script)
if ($DryRun)         { $nodeArgs += "--dry-run" }
if ($ForceThrottled) { $nodeArgs += "--force-throttled" }
if ($Json)           { $nodeArgs += "--json" }

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
