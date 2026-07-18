<#
.SYNOPSIS
  Register (or remove) the per-user scheduled task that DRAINS the blueprint
  predictions->outcomes ledger into consolidation/retrain signal autonomously.

.DESCRIPTION
  AI-SYSTEMS-CAD-LEARNING/U-BPA-CONSUMER-CRON (slot:india 2026-06-25) -- the
  missing autonomous TRIGGER that closes the blueprint predictions->outcomes->
  retrain loop.

  ROOT CAUSE this fixes: the closed loop has two PRODUCERS that append
  `outcome_record` events to `state/shared/blueprint-accuracy-events.jsonl` --
  the `blueprint-accuracy-guard.mjs` hook (U-BPA-GUARD-EVENTSHAPE) and the
  `cadDispatcher.blueprint_rag_extract` recordOutcome path (U-BPA-RAG-RECORDOUTCOME,
  via the canonical writer). The CONSUMER that drains those events into the
  rolling window + daily consolidation summary (which feeds retrain) is
  `scripts/blueprint-accuracy-consumer.mjs` -- but it had NO scheduled task and
  NO chained invoker (verified 2026-06-25: no task action, no installer, no
  script spawns it). It drained the live 145 events only because a prior session
  ran it BY HAND (offset==EOF, 0 unknown). With no autonomous trigger, every NEW
  outcome_record accumulates un-consumed -> the predictions->outcomes->retrain
  loop silently stops closing. Same producer-alive/consumer-dead class as the
  tribal-embed cron (U-TRIBAL-EMBED-CRON-REARM). This installs the consumer's
  recurring trigger so the loop closes itself.

  PER-USER, NON-ELEVATED (clone-don't-fork of install-tribal-embed-cron.ps1 /
  install-resources-tribal-drain-task.ps1 -- the proven RECURRING-FOREVER pattern;
  NOT the one-shot SYSTEM/GPU pattern of install-blueprint-ocr-batch-task.ps1).
  The consumer is offset-based + idempotent (a re-run with no new events parses
  an empty tail and no-ops), writes atomically, and is rotation-aware -- so a
  recurring fire is safe; `MultipleInstances IgnoreNew` prevents an overlapping
  second instance at the scheduler level (the consumer has no internal lock).

.PARAMETER TaskName        Scheduled task name (default 'PRISM Blueprint Accuracy Consumer').
.PARAMETER IntervalMinutes Minutes between fires (default 30 -- matches the producer cadence + consolidation threshold).
.PARAMETER Unregister      Remove the task instead of creating it.
.PARAMETER RunNow          Start the task once immediately after registering.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-blueprint-accuracy-consumer-task.ps1 -RunNow
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-blueprint-accuracy-consumer-task.ps1 -Unregister
#>
param(
  [string]$TaskName = 'PRISM Blueprint Accuracy Consumer',
  [int]$IntervalMinutes = 30,
  [switch]$Unregister,
  [switch]$RunNow
)

$ErrorActionPreference = 'Stop'

if ($Unregister) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Output "removed: $TaskName"
  } else {
    Write-Output "not present: $TaskName"
  }
  return
}

# Repo root = parent of this script's dir (.claude/helpers/ -> .claude -> repo root).
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$consumer = Join-Path $repoRoot 'scripts/blueprint-accuracy-consumer.mjs'
if (-not (Test-Path $consumer)) { throw "consumer script not found: $consumer" }

# Prefer a REAL node.exe -- a scheduled task launches it directly (clean, no
# nested-quote cmd wrapper). The portable-node.cmd shim is for interactive PATH
# use; launching it via `cmd /c ""shim" "script"..."` mangles the script path
# (MODULE_NOT_FOUND -- verified 2026-06-24), so it is the LAST resort.
$nodeExe = $null
foreach ($cand in @('H:/Tools/nodejs/node.exe', 'H:/.claude/bin/portable-node.cmd')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $nodeExe = $cmd.Source }
}
if (-not $nodeExe) { throw 'node executable not found (portable-node / Tools / PATH all missing)' }

# .cmd shims must be launched via cmd.exe; a real .exe runs directly.
if ($nodeExe -like '*.cmd') {
  $exec = $env:ComSpec
  $taskArgs = "/c `"`"$nodeExe`" `"$consumer`"`""
} else {
  $exec = $nodeExe
  $taskArgs = "`"$consumer`""
}

$action = New-ScheduledTaskAction -Execute $exec -Argument $taskArgs -WorkingDirectory $repoRoot
# Repeat FOREVER (no Duration cap -- the bug this whole pattern guards against),
# starting 2 min from now.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)
# IgnoreNew prevents an overlapping second instance (the consumer has no internal
# lock); a drain pass is fast (parse the unconsumed tail), so the interval is
# ample headroom.
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes $IntervalMinutes)
# Current interactive user, LEAST privilege -> no elevation required.
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force | Out-Null
Write-Output "registered: $TaskName (every $IntervalMinutes min, forever, user-level)"
Write-Output "exec: $exec $taskArgs"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Output "started once now"
}
