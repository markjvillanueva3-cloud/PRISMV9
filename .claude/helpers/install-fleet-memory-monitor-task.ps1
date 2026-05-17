param(
  [string]$TaskName = 'PRISM Fleet Memory Monitor',
  [int]$EveryMinutes = 5,
  # Phase offset (seconds) so this task doesn't phase-lock onto the existing
  # 5-min host tasks:
  #   "Cleanup Orchestrator"           anchored ~+60s
  #   "Memory Pressure Auto-Relief"    anchored ~+120s
  #   "PRISM Fleet Reaper"             anchored +210s (CLAUDE.md, install-fleet-reaper-task.ps1:9)
  # Landing this monitor at +330s leaves a ~30s gap before the next reaper
  # sweep so the two reads of process state are independent (no contention
  # on the same Win32_Process enumeration).
  [int]$StartOffsetSeconds = 330,
  # Burn-in mode bakes --dry-run into the task — sweep classifies but never
  # writes telemetry or emits AGENT_CHAT advisories. Use for 1-2 cycles to
  # confirm correct sampling on this host, then reinstall without -DryRun.
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall,
  # Legacy: register with NO principal → Logon Mode "Interactive only" (task
  # dies when you log off). Default (this switch OFF) hardens to S4U so the
  # monitor runs whether-logged-on-or-not.
  [switch]$Interactive,
  # Strongest principal: run as SYSTEM (LogonType ServiceAccount). SYSTEM can
  # enumerate ANY user's processes; S4U only the installing user's. The
  # monitor reads but never kills, so S4U is sufficient — SYSTEM is opt-in.
  [switch]$AsSystem
)

# install-fleet-memory-monitor-task.ps1 — durable backbone for the
# system-RAM + per-chat-tree memory monitor (scripts/fleet-memory-monitor.mjs).
#
# Why this is separate from the fleet-reaper task: they answer DIFFERENT
# questions.
#   * fleet-reaper-sweep.mjs    "which orphan processes of CRASHED slots
#                                should I kill?"      — destructive, slot-aware
#   * fleet-memory-monitor.mjs  "which LIVE chat tree is the largest, and is
#                                the box under pressure?"  — advisory, tree-aware
#
# The monitor closes the gap CLAUDE.md describes as "fleet-reaper isn't
# enough since it drops during alpha's compaction": when all 13 chats are
# LIVE and the box drifts toward commit-memory saturation, the reaper has no
# candidates to kill, returns "ok 0 candidates", and pressure climbs unseen.
# This monitor names WHICH live chat to /compact when that happens.
#
# Independence invariant: S4U principal + AtStartup trigger + 5-min repeat +
# RestartCount 3 means the monitor survives every claude session closing,
# every reboot, every fleet-reaper restart. It is the load-bearing memory
# observation layer — never gated by any single chat or process.
#
# Per [[feedback_never_delete_only_disable]]: this REGISTERS a task; it can
# be Disable-ScheduledTask'd to pause without removing. Use -Uninstall to remove.

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell — (un)registering the scheduled task '$TaskName' needs admin rights."
}

# Always target the canonical main tree, never a worktree (a worktree's
# scripts/ can be removed; the host-level task must not dangle).
$monitorScript = 'H:\PRISM\scripts\fleet-memory-monitor.mjs'

# Prefer the portable node; fall back to PATH then Program Files. Mirrors
# install-fleet-reaper-task.ps1:67-70 — keep in sync.
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

if (-not (Test-Path $monitorScript)) {
  throw "Fleet-memory-monitor script not found: $monitorScript (run on the PRISM host with H:\PRISM present, and ensure scripts/fleet-memory-monitor.mjs is committed)."
}

# Sanity: confirm the script is the one we expect and understands --once.
# A future refactor that renames --once would break the task silently
# (Get-ScheduledTaskInfo would show success while the sweep no-op'd).
$head = Get-Content $monitorScript -TotalCount 90 -ErrorAction SilentlyContinue
if (-not (($head -match 'fleet-memory-monitor') -and ($head -match '--once'))) {
  throw "Refusing to install: $monitorScript does not look like fleet-memory-monitor.mjs (missing header / --once flag)."
}

$sweepArgs = if ($DryRun) { "`"$monitorScript`" --once --dry-run" } else { "`"$monitorScript`" --once" }
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $sweepArgs

# Two triggers: the every-$EveryMinutes poll + an AtStartup trigger so a
# reboot resumes monitoring before any login. Same pattern as the reaper.
$pollTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$trigger = @($pollTrigger, $startupTrigger)

# ExecutionTimeLimit 90s: a worst-case sample is ~10s (one PowerShell CIM
# call + JSON parse + JSONL append). MultipleInstances IgnoreNew so a slow
# sweep never piles on. RestartCount/Interval self-heals if a sample crashes.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Seconds 90) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

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

$desc = "System-RAM + per-chat-tree memory monitor for the 13-chat PRISM fleet (fleet-memory-monitor.mjs --once$(if ($DryRun) { ' --dry-run [BURN-IN]' })). Samples Win32_OperatingSystem physical+commit pressure and attributes RSS per live claude.exe process tree; identifies the largest-RSS chat tree as the operator's /compact target on warn/critical pressure. Advisory only — never kills. Runs whether-logged-on (S4U) + at boot. Closes the gap fleet-reaper-sweep leaves when all 13 chats are LIVE and pressure climbs."

# Splat so -Principal is omitted entirely in legacy -Interactive mode
# (passing -Principal `$null throws; an absent key is the correct form).
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

$mode = if ($DryRun) { 'DRY-RUN burn-in (no telemetry/advisory writes)' } else { 'live' }
$autonomy = if ($Interactive) {
  'INTERACTIVE-ONLY (legacy — dies when you log off)'
} elseif ($AsSystem) {
  'AUTONOMOUS as SYSTEM (runs at boot + whether-logged-on-or-not)'
} else {
  'AUTONOMOUS as S4U (runs at boot + whether-logged-on-or-not)'
}
Write-Host "Registered: $TaskName ($mode, $autonomy, fleet-memory-monitor.mjs --once, every $EveryMinutes min + AtStartup, +$($StartOffsetSeconds)s phase offset, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  # A sample takes ~5-15s; LastTaskResult reads 267009 (0x41301) while running.
  # Poll past that instead of reporting the misleading code.
  $deadline = (Get-Date).AddSeconds(60)
  do {
    Start-Sleep -Seconds 2
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate run — still running after 60s (LastTaskResult=267009)."
  } else {
    # Exit codes: 0 clean, 1 warn, 2 critical, 3 measurement failure.
    $name = switch ($info.LastTaskResult) {
      0 { 'CLEAN' }
      1 { 'WARN'  }
      2 { 'CRITICAL' }
      3 { 'MEASUREMENT-FAIL' }
      default { 'UNKNOWN' }
    }
    Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult) ($name)"
  }
}

Write-Host ""
Write-Host "Knobs (env, read by the sweep — full list in the sweep script header):"
Write-Host "  PRISM_FLEET_MEMMON_DISABLE=1                      sweep refuses to write/emit"
Write-Host "  PRISM_FLEET_MEMMON_WARN_PCT=N                     warn threshold (default 80)"
Write-Host "  PRISM_FLEET_MEMMON_CRIT_PCT=N                     critical threshold (default 92)"
Write-Host "  PRISM_FLEET_MEMMON_ADVISORY_COOLDOWN_SEC=N        min seconds between AGENT_CHAT emits (default 600)"
Write-Host "  PRISM_FLEET_MEMMON_SUSTAINED_TICKS=N              consecutive warn ticks before warn advisory (default 2)"
Write-Host ""
Write-Host "Verify registered:           schtasks /Query /TN '$TaskName'"
Write-Host "Watch telemetry:             Get-Content H:/PRISM/state/shared/fleet-memory-history.jsonl -Tail 20 -Wait"
Write-Host "Read last sample:            & '$nodeExe' '$monitorScript' --status"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-fleet-memory-monitor-task.ps1' -Uninstall"
