param(
  [string]$TaskName = 'PRISM SFC Gauntlet',
  # Cadence of the incremental JM-accuracy refresh. The refresh is cursor-resumed
  # (only newly-written JM programs are re-extracted), so a few-hour cadence keeps
  # "test SFC vs ALL JM programs" current without thrashing. Default 6h = 4x/day.
  [int]$EveryHours = 6,
  # Phase offset (seconds) so this does not phase-lock onto the +60s/+210s/+330s
  # cluster of existing PRISM host tasks (cleanup / reaper / memory-monitor).
  [int]$StartOffsetSeconds = 420,
  # --full re-extracts the WHOLE JM corpus each run (slow, ~all 154K rows) instead
  # of the cursor-resumed incremental default. Use only for a one-off rebuild.
  [switch]$Full,
  [switch]$RunNow,
  [switch]$Uninstall,
  # DEFAULT principal = S4U / current user: runs whether-logged-on-or-not, no
  # stored password, matches the installing user's file ACLs. The task only READS
  # JM files + WRITES report JSON -- it never kills a process, so it does NOT need
  # SYSTEM's elevated kill privilege. Pass -AsSystem only if a machine-account
  # context is specifically required.
  [switch]$AsSystem,
  # Legacy: register with no principal -> "Interactive only" (dies when you log off).
  [switch]$Interactive
)

# install-sfc-gauntlet-task.ps1 -- durable, session-independent backbone for the
# "test SFC against ALL JM programs" accuracy gauntlet (operator directive
# 2026-06-25: "automate and have loops, harnesses and crons scheduled so it never
# stops"). Sibling of install-fleet-reaper-task.ps1.
#
# THE GAP THIS CLOSES: the SFC accuracy/sweep crons live only in
# .claude/scheduled_tasks.json -- they are Claude-REPL crons that fire ONLY while
# a Claude session is open + idle. When every chat closes, the gauntlet STOPS.
# This registers a Windows Scheduled Task that runs the refresh directly via node,
# independent of any Claude session -- the "survives all chats closing" half.
#
# What it runs: scripts/sfc-jm-accuracy-refresh.mjs --json  (INCREMENTAL by
# default -- resumes at the corpus cursor, picks up newly-written JM programs,
# re-flags outliers). The script is explicitly "built to be pointed at a
# scheduler". Output: state/shared/SFC-JM-CORPUS-ANALYSIS.json +
# SFC-JM-PHYSICS-COMPARE.json (the accuracy-vs-JM report). Read-only over JM
# files; the only writes are the report JSONs + the resume cursor.
#
# NOTE (follow-up, NOT this task): the heavier synthetic VARIABILITY sweep
# (sfc-variability-launch/batch-run, the "trillions of combinations" gauntlet) is
# a separate long-running batch with its own resume-guard -- it warrants its own
# task with a longer ExecutionTimeLimit. This task is the JM-corpus reconcile leg.
#
# Per feedback_never_delete_only_disable.md: this REGISTERS a task; Disable-
# ScheduledTask pauses it without removing. Use -Uninstall to remove.

$ErrorActionPreference = 'Stop'

# (Un)registering a task in the root \ folder needs elevation on Windows 11.
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell -- (un)registering the scheduled task '$TaskName' needs admin rights."
}

# Always target the canonical main tree, never a worktree (a worktree's scripts/
# can be removed; the host-level task must not dangle).
$runnerScript = 'H:\PRISM\scripts\sfc-jm-accuracy-refresh.mjs'

# Prefer the portable node this PC uses; fall back to PATH then Program Files.
$nodeExe = $null
foreach ($cand in @('H:\Tools\nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) { $nodeExe = (Get-Command node -ErrorAction Stop).Source }

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Unregistered task: $TaskName"
  } else {
    Write-Host "Task not found (already uninstalled): $TaskName"
  }
  return
}

if (-not (Test-Path $runnerScript)) {
  throw "SFC accuracy-refresh runner not found: $runnerScript (run on the PRISM host with H:\PRISM present, and ensure scripts/sfc-jm-accuracy-refresh.mjs is committed)."
}

# Sanity: confirm the runner is the JM-accuracy refresh and understands --json.
$head = Get-Content $runnerScript -TotalCount 20 -ErrorAction SilentlyContinue
if (-not (($head -match 'SFC-JM-ACCURACY') -and ($head -match '--json'))) {
  throw "Refusing to install: $runnerScript does not look like sfc-jm-accuracy-refresh.mjs (missing the SFC-JM-ACCURACY header / --json usage). Ensure it is the committed version (HEAD)."
}

$refreshArgs = if ($Full) { "`"$runnerScript`" --full --json" } else { "`"$runnerScript`" --json" }
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $refreshArgs -WorkingDirectory 'H:\PRISM'

# Two triggers: (1) every-$EveryHours poll anchored +$StartOffsetSeconds off
# install so it does not phase-lock onto the other host tasks; (2) AtStartup so a
# reboot resumes the gauntlet without waiting for the missed -Once anchor.
$pollTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Hours $EveryHours) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$trigger = @($pollTrigger, $startupTrigger)

# ExecutionTimeLimit: an incremental refresh is fast (cursor-resumed), but a cold
# -Full re-extract spans ~154K program rows + 1.17M-op analyze + the tsx physics-
# compare stage and can exceed an hour on a loaded host -- so -Full gets 180 min,
# incremental 60. A mid-run kill is RECOVERABLE (the corpus is cursor-resumable;
# the next poll resumes with no data loss), but a generous -Full ceiling avoids a
# kill-and-resume thrash. IgnoreNew so a slow refresh never piles a second
# instance on itself. RestartCount self-heals an abnormal death (host OOM)
# without waiting a whole poll cycle.
$execLimitMin = if ($Full) { 180 } else { 60 }
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes $execLimitMin) `
  -RestartCount 2 `
  -RestartInterval (New-TimeSpan -Minutes 5) `
  -MultipleInstances IgnoreNew

# Principal -- DEFAULT S4U / current user (read JM files + write report JSON; no
# kill privilege needed; matches the installing user's file ACLs). -AsSystem only
# if a machine-account context is specifically wanted.
$principal = $null
if (-not $Interactive) {
  if ($AsSystem) {
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' `
      -LogonType ServiceAccount -RunLevel Highest
  } else {
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
      -LogonType S4U -RunLevel Highest
  }
}

$desc = "SFC accuracy gauntlet -- runs sfc-jm-accuracy-refresh.mjs --json$(if ($Full) { ' --full' }) every $EveryHours h, independent of any Claude session. Incrementally reconciles PRISM SFC recommendations against ALL JM Die programs (corpus + outlier report). Operator 2026-06-25: keep the gauntlet running so it never stops. Read-only over JM files; writes only the report JSONs + resume cursor."

$registerParams = @{
  TaskName    = $TaskName
  Action      = $action
  Trigger     = $trigger
  Settings    = $settings
  Description = $desc
  Force       = $true
}
if ($principal) { $registerParams['Principal'] = $principal }
Register-ScheduledTask @registerParams | Out-Null

$autonomy = if ($Interactive) {
  'INTERACTIVE-ONLY (legacy -- dies when you log off)'
} elseif ($AsSystem) {
  'AUTONOMOUS as SYSTEM (runs at boot + whether-logged-on-or-not)'
} else {
  'AUTONOMOUS as S4U / current user (runs at boot + whether-logged-on-or-not; uses your H: mapping + file ACLs)'
}
Write-Host "Registered task: $TaskName"
Write-Host "  runner   : $nodeExe $refreshArgs"
Write-Host "  cadence  : every $EveryHours h (+ AtStartup), anchored +$StartOffsetSeconds s"
Write-Host "  autonomy : $autonomy"
Write-Host "  report   : state/shared/SFC-JM-CORPUS-ANALYSIS.json + SFC-JM-PHYSICS-COMPARE.json"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Triggered '$TaskName' now -- the refresh runs in the BACKGROUND (no inline result; a -Full pass can take many minutes)."
  Write-Host "  check : Get-ScheduledTaskInfo -TaskName '$TaskName' | Select-Object LastRunTime, LastTaskResult   (0 = ok)"
  Write-Host "  report: state/shared/SFC-JM-CORPUS-ANALYSIS.json + SFC-JM-PHYSICS-COMPARE.json (freshly written on success)"
}
