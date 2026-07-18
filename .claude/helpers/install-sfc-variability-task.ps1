param(
  [string]$GuardTaskName = 'PRISM SFC Variability Guard',
  [int]$EveryMinutes = 5,
  # Phase offset (seconds) for the guard's poll-trigger anchor. PRISM already
  # runs 5-min host tasks at ~+60s (Cleanup Orchestrator), +120s (Memory
  # Pressure Auto-Relief), +210s (Fleet Reaper), +330s (Fleet Memory Monitor).
  # +390s lands the SFC guard clear of all four.
  [int]$StartOffsetSeconds = 390,
  # Install the guard with --dry-run baked in -- it classifies + decides but
  # never triggers a batch relaunch. Watch state/shared/sfc-variability-guard.jsonl.
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-sfc-variability-task.ps1 -- durable backbone for the SFC variability
# batch (SFC-ACCURACY-MS1 Stage 2).
#
# The Stage-2 batch (sfc-variability-batch-run.mjs) is a multi-day workload
# toward billions of compatibility-filtered speed/feed combos. It has died
# TWICE on machine switches (H: is shared across two PCs -- disk state survives,
# processes do not). This installer registers the THREE Windows Scheduled Tasks
# that make it self-resuming, independent of any Claude Code session:
#
#   1. "PRISM SFC Variability Guard"        -- runs sfc-variability-resume-guard.mjs
#        every $EveryMinutes minutes + AtStartup. Detects whether the batch is
#        alive; on death, computes a provably-no-gap resume --skip and triggers
#        the per-domain batch task below.
#   2. "PRISM SFC Variability Batch Mill"   -- ON-DEMAND (no time trigger). Action
#        is sfc-variability-launch.mjs --domain mill. Triggered by the guard.
#   3. "PRISM SFC Variability Batch Lathe"  -- ON-DEMAND. --domain lathe.
#
# WHY THREE TASKS: a process spawned as a child of the guard's own scheduled-
# task instance lives in that task's job object and is killed when the guard
# task instance exits (5-min cadence). By making each batch the ACTION of its
# OWN on-demand task, the batch runs under that task's job object -- independent
# of the guard. A Task-Scheduler-launched task outlives whatever triggered it.
#
# Per memory feedback_never_delete_only_disable.md: this REGISTERS tasks; pause
# with Disable-ScheduledTask, remove with -Uninstall.

$ErrorActionPreference = 'Stop'

$MillTaskName  = 'PRISM SFC Variability Batch Mill'
$LatheTaskName = 'PRISM SFC Variability Batch Lathe'
$AllTaskNames  = @($GuardTaskName, $MillTaskName, $LatheTaskName)

# (Un)registering a task in the root \ folder needs an elevated context on
# Windows 11 -- fail with a clear message instead of a raw COM error.
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell -- (un)registering the SFC variability scheduled tasks needs admin rights."
}

if ($Uninstall) {
  foreach ($tn in $AllTaskNames) {
    if (Get-ScheduledTask -TaskName $tn -ErrorAction SilentlyContinue) {
      Unregister-ScheduledTask -TaskName $tn -Confirm:$false
      Write-Host "Unregistered task: $tn"
    } else {
      Write-Host "Task not found (already uninstalled): $tn"
    }
  }
  return
}

# Scripts always target the canonical main tree, never a worktree (a worktree's
# scripts/ can be removed; the host-level task must not dangle).
$guardScript  = 'H:\PRISM\scripts\sfc-variability-resume-guard.mjs'
$launchScript = 'H:\PRISM\scripts\sfc-variability-launch.mjs'
$batchScript  = 'H:\PRISM\scripts\sfc-variability-batch-run.mjs'
foreach ($s in @($guardScript, $launchScript, $batchScript)) {
  if (-not (Test-Path $s)) {
    throw "Required script not found: $s (run on the PRISM host with H:\PRISM present and the SFC-ACCURACY-MS1 scripts committed)."
  }
}

# Sanity: confirm the guard is the v4 two-task guard (it must NOT spawn the
# batch directly -- it triggers the per-domain task).
$guardHead = Get-Content $guardScript -TotalCount 120 -ErrorAction SilentlyContinue
if (-not (($guardHead -match 'TWO-TASK ARCHITECTURE') -and ($guardHead -match 'resume-guard'))) {
  throw "Refusing to install: $guardScript does not look like the v4 two-task resume-guard (missing the TWO-TASK ARCHITECTURE header). Ensure the committed HEAD version is present."
}
# Sanity: confirm the launcher is the two-task launcher the batch tasks run --
# it must spawn the batch NON-detached (a detached child would defeat the
# job-object survival the two-task design exists to provide).
$launchHead = Get-Content $launchScript -TotalCount 60 -ErrorAction SilentlyContinue
if (-not (($launchHead -match 'NOT detached') -and ($launchHead -match 'batch launcher'))) {
  throw "Refusing to install: $launchScript does not look like the SFC variability launcher (missing the launcher header / non-detached marker). Ensure the committed HEAD version is present."
}

# Prefer the portable node this PC uses; fall back to PATH then Program Files.
$nodeExe = $null
foreach ($cand in @('H:\Tools\nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) { $nodeExe = (Get-Command node -ErrorAction Stop).Source }

# All three tasks run as the current user via S4U: runs whether-logged-on-or-not,
# no stored password. S4U (not SYSTEM) because the batch writes to H: and runs
# portable node from H: -- if H: is a per-user mapped/network drive, SYSTEM
# (session 0) may not see it. The current-user context is correct here.
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType S4U -RunLevel Highest

#  Task 1: the guard (recurring) 
$guardArgs = if ($DryRun) {
  "`"$guardScript`" --domains mill,lathe --workers 4 --max-minutes 600 --chunk 50 --dry-run"
} else {
  "`"$guardScript`" --domains mill,lathe --workers 4 --max-minutes 600 --chunk 50"
}
$guardAction = New-ScheduledTaskAction -Execute $nodeExe -Argument $guardArgs

# Two triggers: the every-$EveryMinutes poll (anchored +$StartOffsetSeconds off
# install so it never phase-locks onto the other 5-min host tasks) + AtStartup
# so a reboot resumes the guard before any login.
$pollTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$startupTrigger = New-ScheduledTaskTrigger -AtStartup

# Guard pass is fast; the worst case is the readResumeState directory scan on a
# relaunch, still well under 5 min. MultipleInstances IgnoreNew -- the host-keyed
# lock also prevents overlap. RestartCount self-heals an abnormal guard death.
$guardSettings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
  -RestartCount 2 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

$guardDesc = "SFC variability batch resume-guard (sfc-variability-resume-guard.mjs$(if ($DryRun) { ' --dry-run [BURN-IN]' })). Every $EveryMinutes min + AtStartup: detects whether the Stage-2 batch is alive; on death computes a provably-no-gap resume --skip and triggers the per-domain 'PRISM SFC Variability Batch <Domain>' task. Makes the multi-day SFC-ACCURACY-MS1 batch survive machine switches / reboots / session ends."

Register-ScheduledTask -TaskName $GuardTaskName -Action $guardAction `
  -Trigger @($pollTrigger, $startupTrigger) -Settings $guardSettings `
  -Principal $principal -Description $guardDesc -Force | Out-Null
Write-Host "Registered: $GuardTaskName (every $EveryMinutes min + AtStartup, +$($StartOffsetSeconds)s offset)"

#  Tasks 2 & 3: the per-domain batch launchers (ON-DEMAND, no trigger) 
# These have NO time trigger -- the guard triggers them via `schtasks /run`.
# ExecutionTimeLimit 12h: the batch self-terminates at --max-minutes 600 (10h);
# 12h is a safety ceiling. MultipleInstances IgnoreNew -- never start a second
# batch for a domain that is already running.
$batchSettings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 12) `
  -MultipleInstances IgnoreNew

foreach ($pair in @(@{ Task = $MillTaskName; Domain = 'mill' }, @{ Task = $LatheTaskName; Domain = 'lathe' })) {
  $launchArgs = "`"$launchScript`" --domain $($pair.Domain)"
  $batchAction = New-ScheduledTaskAction -Execute $nodeExe -Argument $launchArgs
  $batchDesc = "SFC variability batch -- $($pair.Domain) domain (sfc-variability-launch.mjs --domain $($pair.Domain)). ON-DEMAND only: triggered by '$GuardTaskName' when the $($pair.Domain) batch is found dead. The launcher reads the resume-state sidecar and runs sfc-variability-batch-run.mjs under THIS task's job object (independent of the guard)."
  Register-ScheduledTask -TaskName $pair.Task -Action $batchAction `
    -Settings $batchSettings -Principal $principal -Description $batchDesc -Force | Out-Null
  Write-Host "Registered: $($pair.Task) (on-demand -- triggered by the guard)"
}

$mode = if ($DryRun) { 'DRY-RUN burn-in (guard never triggers a relaunch)' } else { 'live' }
Write-Host ""
Write-Host "All 3 SFC variability tasks registered ($mode, S4U current-user, node=$nodeExe)."

if ($RunNow) {
  Start-ScheduledTask -TaskName $GuardTaskName
  # A guard pass is usually <30s; LastTaskResult reads 267009 (0x41301 =
  # "running") until it finishes -- poll past that.
  $deadline = (Get-Date).AddSeconds(90)
  do {
    Start-Sleep -Seconds 3
    $info = Get-ScheduledTaskInfo -TaskName $GuardTaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate guard run -- still running after 90s. Check state/shared/sfc-variability-guard.jsonl."
  } else {
    Write-Host "Triggered immediate guard run. LastTaskResult=$($info.LastTaskResult)"
  }
}

Write-Host ""
Write-Host "Knobs (env, read by the guard):"
Write-Host "  PRISM_SFC_VARIABILITY_GUARD_DISABLE=1   guard no-ops every run"
Write-Host ""
Write-Host "Verify registered:          schtasks /Query /TN '$GuardTaskName'"
Write-Host "Watch guard telemetry:      Get-Content H:/PRISM/state/shared/sfc-variability-guard.jsonl -Tail 20 -Wait"
Write-Host "Pause without uninstalling: Disable-ScheduledTask -TaskName '$GuardTaskName'"
Write-Host "Uninstall all 3:            & '$PSScriptRoot\install-sfc-variability-task.ps1' -Uninstall"
