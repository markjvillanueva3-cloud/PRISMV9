param(
  [string]$TaskName = 'PRISM Handoff Prune',
  # Daily run at an off-:00 minute (per the fleet scheduling convention —
  # avoid the :00 mark every host task lands on). 03:47 is deep off-peak.
  [string]$At = '03:47',
  # Burn-in: bake --dry-run (plan only, no files moved). Run for a cycle to
  # confirm the supersession plan on this host, then reinstall without it.
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall,
  # Legacy: NO principal → "Interactive only" (task dies at logoff).
  # Default (switch OFF) hardens to S4U so prune runs whether-logged-on.
  [switch]$Interactive,
  # SYSTEM principal — opt-in. handoff-prune only touches files under
  # state/shared/handoffs/ owned by the installing user, so S4U suffices.
  [switch]$AsSystem
)

# install-handoff-prune-task.ps1 — durable auto-trigger for the
# supersession-aware handoff archiver (scripts/handoff-prune.mjs).
#
# WHY: SYSTEM-SYNERGY-AUDIT-2026-05-09 Track H6 / §3 finding #8 — "no LRU on
# handoffs" (876 live HANDOFF-*.md as of 2026-05-19). handoff-prune.mjs
# already exists and is dry-run-safe; its archive logic only ever fires when
# something invokes it. This task is that missing auto-trigger — a once-daily
# `--apply` so superseded handoffs (a newer handoff exists for the same chat
# instance) are archived without an operator remembering to.
#
# Per [[feedback_never_delete_only_disable]]: this REGISTERS a task; pause
# with Disable-ScheduledTask, remove with -Uninstall. The prune itself MOVES
# (never deletes) handoffs into state/shared/handoffs/archive/.

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell — (un)registering the scheduled task '$TaskName' needs admin rights."
}

# Always target the canonical main tree, never a worktree.
$pruneScript = 'H:\PRISM\scripts\handoff-prune.mjs'

# Portable node first, then Program Files, then PATH. Keep in sync with
# install-fleet-memory-monitor-task.ps1.
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

if (-not (Test-Path $pruneScript)) {
  throw "handoff-prune script not found: $pruneScript (run on the PRISM host with H:\PRISM present, scripts/handoff-prune.mjs committed)."
}

# Sanity: confirm the script is the one we expect and still understands
# --apply. A rename of that flag would make the task silently no-op.
$head = Get-Content $pruneScript -TotalCount 60 -ErrorAction SilentlyContinue
if (-not (($head -match 'handoff-prune') -and ($head -match '--apply'))) {
  throw "Refusing to install: $pruneScript does not look like handoff-prune.mjs (missing header / --apply flag)."
}

$pruneArgs = if ($DryRun) { "`"$pruneScript`"" } else { "`"$pruneScript`" --apply" }
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $pruneArgs

# Daily trigger + an AtStartup trigger so a host that was off at 03:47 still
# prunes once on next boot (StartWhenAvailable also catches missed runs).
$dailyTrigger   = New-ScheduledTaskTrigger -Daily -At $At
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$trigger = @($dailyTrigger, $startupTrigger)

# 120s limit: a real run is a readdir + plan + N renames, ~1-3s. IgnoreNew so
# a slow run never piles on. RestartCount self-heals a crashed run.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Seconds 120) `
  -RestartCount 2 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

$principal = $null
if (-not $Interactive) {
  if ($AsSystem) {
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
  } else {
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest
  }
}

$desc = "Supersession-aware handoff archiver for the 13-chat PRISM fleet (handoff-prune.mjs$(if (-not $DryRun) { ' --apply' })). Once-daily: groups state/shared/handoffs/HANDOFF-*.md by chat instance, keeps the newest per instance, MOVES older superseded siblings into handoffs/archive/. Never deletes. Closes SYSTEM-SYNERGY-AUDIT Track H6 (handoff LRU). Runs whether-logged-on (S4U) + once on boot."

# Splat so -Principal is omitted entirely in legacy -Interactive mode.
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

$mode = if ($DryRun) { 'DRY-RUN burn-in (plan only, no files moved)' } else { 'live (--apply)' }
$autonomy = if ($Interactive) { 'INTERACTIVE-ONLY (legacy — dies at logoff)' }
  elseif ($AsSystem) { 'AUTONOMOUS as SYSTEM' }
  else { 'AUTONOMOUS as S4U (runs at boot + whether-logged-on)' }
Write-Host "Registered: $TaskName ($mode, $autonomy, handoff-prune.mjs, daily @ $At + AtStartup, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  $deadline = (Get-Date).AddSeconds(45)
  do {
    Start-Sleep -Seconds 2
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate run — still running after 45s (LastTaskResult=267009)."
  } else {
    # handoff-prune exit codes: 0 ok, 1 fail-loud (unreadable dir / move failure).
    $name = switch ($info.LastTaskResult) { 0 { 'OK' } 1 { 'FAIL' } default { 'UNKNOWN' } }
    Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult) ($name)"
  }
}

Write-Host ""
Write-Host "Knobs (env, read by the script):"
Write-Host "  PRISM_HANDOFF_PRUNE_DISABLE=1            script no-ops"
Write-Host "  PRISM_HANDOFF_PRUNE_MAX_AGE_DAYS=N       absolute age floor for dead singletons (default 45)"
Write-Host ""
Write-Host "Preview the plan:            & '$nodeExe' '$pruneScript'"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-handoff-prune-task.ps1' -Uninstall"
