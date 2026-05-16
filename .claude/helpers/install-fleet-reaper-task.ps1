param(
  [string]$TaskName = 'PRISM Fleet Reaper',
  [int]$EveryMinutes = 5,
  # Phase offset (seconds) for the trigger anchor. PRISM already runs the
  # 5-min "Cleanup Orchestrator" + "Memory Pressure Auto-Relief" tasks, both
  # anchored ~+60s from their install. Defaulting this reaper to +210s lands it
  # on the half-cycle between them instead of phase-locking onto the same busy
  # minute (three PowerShell-forking reapers firing together every 5 min).
  [int]$StartOffsetSeconds = 210,
  # Install the task with --dry-run baked in — a burn-in mode. The sweep then
  # classifies + decides but never kills; watch state/shared/fleet-reaper.log to
  # confirm correct slot attribution, then reinstall without -DryRun.
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall,
  # Legacy behavior: register with NO principal so the task runs only while the
  # installing user is interactively logged in (Logon Mode: Interactive only).
  # Default (this switch OFF) hardens the task to run whether-logged-on-or-not.
  [switch]$Interactive,
  # Strongest principal: run as the SYSTEM machine account (LogonType
  # ServiceAccount) instead of the default S4U (current user's context, no
  # stored password). SYSTEM can reap ANY user's process; S4U only the
  # installing user's. SYSTEM is appropriate for a host-wide reaper but changes
  # the security context — opt in deliberately. Ignored when -Interactive.
  [switch]$AsSystem
)

# install-fleet-reaper-task.ps1 — durable backbone for the slot-aware orphan reaper.
#
# Registers a Windows Scheduled Task that runs fleet-reaper-sweep.mjs --once every
# $EveryMinutes minutes, independent of any Claude Code session. This is the
# "survives all 7 chats closing" half of the FLEET-REAPER pipeline — the
# in-session Monitor (launched by /fleet-reaper) gives a live event feed while a
# chat is open, but only this scheduled task keeps reaping when every chat is gone.
#
# What the sweep does (see scripts/fleet-reaper-sweep.mjs): maps every running
# node/git/bash process to the chat slot that spawned it (chat-slots.json), and
# reaps only those whose owning slot is provably dead — gated by a
# confirm-after-N-ticks rule so a brief heartbeat gap never kills a live chat's
# process. It does NOT duplicate the generic "PRISM Cleanup Orchestrator" task
# (locks/claims/bash orphans) — it adds the slot-attributed layer those lack.
#
# Why 5-min cadence: matches the existing cleanup-orchestrator / memory-relief
# tasks. The reaper's own confirm window (default 2 ticks x interval) means a
# 5-min sweep cadence reaps a confirmed orphan after ~10-15 min — fast enough to
# keep host memory stable for 7 concurrent chats, slow enough to never thrash.
#
# Per memory feedback_never_delete_only_disable.md: this REGISTERS a task; it can
# be Disable-ScheduledTask'd to pause without removing. Use -Uninstall to remove.

$ErrorActionPreference = 'Stop'

# Registering / unregistering a task in the root \ folder needs an elevated
# context on Windows 11 — fail with a clear message instead of a raw COM error.
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell — (un)registering the scheduled task '$TaskName' needs admin rights."
}

# The scheduled task always targets the canonical main tree, never a worktree
# (a worktree's scripts/ can be removed; the host-level task must not dangle).
$sweepScript = 'H:\PRISM\scripts\fleet-reaper-sweep.mjs'

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

if (-not (Test-Path $sweepScript)) {
  throw "Fleet-reaper sweep script not found: $sweepScript (run on the PRISM host with H:\PRISM present, and ensure scripts/fleet-reaper-sweep.mjs is committed)."
}

# Sanity: confirm the script is the slot-aware reaper and understands --once.
$head = Get-Content $sweepScript -TotalCount 90 -ErrorAction SilentlyContinue
if (-not (($head -match 'slot-aware orphan') -and ($head -match '--once'))) {
  throw "Refusing to install: $sweepScript does not look like fleet-reaper-sweep.mjs (missing the slot-aware-orphan header / --once flag). Ensure it is the committed slot-aware version (HEAD)."
}

# Burn-in mode bakes --dry-run into the task definition (machine-persistent,
# unlike the global PRISM_FLEET_REAPER_DRY_RUN env knob).
$sweepArgs = if ($DryRun) { "`"$sweepScript`" --once --dry-run" } else { "`"$sweepScript`" --once" }
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $sweepArgs

# Two triggers: (1) the every-$EveryMinutes poll, anchored +$StartOffsetSeconds
# off install so it doesn't phase-lock onto the other 5-min host tasks; (2) an
# AtStartup trigger so a reboot resumes the reaper BEFORE any login instead of
# waiting for -StartWhenAvailable to notice the missed -Once anchor. Two
# triggers => the reaper is live within seconds of boot AND every 5 min after.
$pollTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$trigger = @($pollTrigger, $startupTrigger)

# ExecutionTimeLimit 2 min: a worst-case sweep is ~30s (3 PowerShell forks +
# kills); 2 min is a generous ceiling. MultipleInstances IgnoreNew so a slow
# sweep never piles a second instance on top of itself. RestartCount/Interval
# self-heals a sweep that dies abnormally (host OOM mid-fork) without waiting a
# whole poll cycle — closes the "no recovery if a launch crashes" gap.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 2) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

# Principal — the load-bearing autonomy fix. With NO principal (legacy
# -Interactive) the task's Logon Mode is "Interactive only": it does NOT run
# unless the installing user is logged in. Default hardens it:
#   S4U   = current user's security context, run whether-logged-on-or-not, no
#           stored password (conservative — same processes the user-context
#           reaper always reaped, just no login requirement).
#   SYSTEM (-AsSystem) = machine account, can reap ANY user's process.
# RunLevel Highest matches the elevated install context (the reaper kills
# processes; it must not be a limited token).
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

$desc = "Slot-aware orphan reaper for the 7-chat fleet (fleet-reaper-sweep.mjs --once$(if ($DryRun) { ' --dry-run [BURN-IN]' })). Maps running node/git/bash processes to their owning chat slot and reaps orphans of crashed/dead chats, gated by a confirm-after-N-ticks rule. Keeps host memory stable for concurrent chats. Runs independent of Claude sessions."

# Splat so -Principal is omitted entirely in legacy -Interactive mode (passing
# -Principal $null throws; an absent key is the correct "no principal" form).
$registerParams = @{
  TaskName    = $TaskName
  Action      = $action
  Trigger     = $trigger
  Settings    = $settings
  Description  = $desc
  Force       = $true
}
if ($principal) { $registerParams['Principal'] = $principal }
Register-ScheduledTask @registerParams | Out-Null

$mode = if ($DryRun) { 'DRY-RUN burn-in (never kills)' } else { 'live' }
$autonomy = if ($Interactive) {
  'INTERACTIVE-ONLY (legacy — dies when you log off)'
} elseif ($AsSystem) {
  'AUTONOMOUS as SYSTEM (runs at boot + whether-logged-on-or-not)'
} else {
  'AUTONOMOUS as S4U (runs at boot + whether-logged-on-or-not)'
}
Write-Host "Registered: $TaskName ($mode, $autonomy, fleet-reaper-sweep.mjs --once, every $EveryMinutes min + AtStartup, +$($StartOffsetSeconds)s phase offset, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  # A sweep can take ~30s; LastTaskResult reads 267009 (0x41301 = "running")
  # until it finishes — poll past that rather than reporting a misleading code.
  $deadline = (Get-Date).AddSeconds(90)
  do {
    Start-Sleep -Seconds 3
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate run — still running after 90s (LastTaskResult=267009). Check state/shared/fleet-reaper.log."
  } else {
    Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult)"
  }
}

Write-Host ""
Write-Host "Knobs (env, read by the sweep — full list in the sweep script header):"
Write-Host "  PRISM_FLEET_REAPER_DISABLE=1          sweep refuses to kill anything"
Write-Host "  PRISM_FLEET_REAPER_DRY_RUN=1          classify + decide, never kill"
Write-Host "  PRISM_FLEET_REAPER_KILL_AFTER=N       confirm ticks before a kill (default 2)"
Write-Host "  PRISM_FLEET_REAPER_AGE_FLOOR_SEC=N    min process age to consider (default 45)"
Write-Host "  PRISM_FLEET_REAPER_INTERVAL_SEC=N     confirm-tick length in seconds (default 300)"
Write-Host "  PRISM_FLEET_REAPER_MEM_PRESSURE_PCT=N commit/phys % that drops kill-after to 1 (default 90)"
Write-Host ""
Write-Host "Verify registered:           schtasks /Query /TN '$TaskName'"
Write-Host "Watch reaper activity:       Get-Content H:/PRISM/state/shared/fleet-reaper.log -Tail 20 -Wait"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-fleet-reaper-task.ps1' -Uninstall"
