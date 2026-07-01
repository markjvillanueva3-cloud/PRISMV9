param(
  [string]$TaskName = 'PRISM Zombie Reaper v2',
  [int]$EveryMinutes = 5,
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-zombie-reaper-task.ps1 -- HARNESS-AUDIT/U-TIER3c (2026-05-10)
#
# Registers a Windows Scheduled Task that runs stop_close_prism_nodes_v2.mjs
# every $EveryMinutes minutes, independent of Claude Code sessions.
#
# Why: v2 reaper currently fires only on Stop events. Hung chats never fire
# Stop, so orphan git.exe/node.exe accumulate. A 5-min scheduled task
# guarantees reaping continues even when chats are stuck.
#
# Companion: install-node-cleaner-task.ps1 (handles node-orphan-cleaner).
# Together they provide system-wide zombie reaping on the same cadence.
#
# Per memory feedback_never_delete_only_disable.md:
#   - This script REGISTERS a task. It can be Disable-ScheduledTask'd to
#     pause without removing.
#   - Use -Uninstall flag to remove (explicit, deliberate action).

$ErrorActionPreference = 'Stop'

# Registering with an S4U principal (below) needs an elevated context on Win11 --
# fail with a clear message instead of a raw COM "Access is denied".
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell -- (un)registering the scheduled task '$TaskName' needs admin rights."
}

$reaperScript = 'H:\PRISM\.claude\hooks\stop_close_prism_nodes_v2.mjs'
$nodeExe = 'C:\Program Files\nodejs\node.exe'

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Unregistered task: $TaskName"
  } else {
    Write-Host "Task not found (already uninstalled): $TaskName"
  }
  return
}

if (-not (Test-Path $reaperScript)) {
  throw "Reaper script not found: $reaperScript"
}

if (-not (Test-Path $nodeExe)) {
  $nodeCommand = Get-Command node -ErrorAction Stop
  $nodeExe = $nodeCommand.Source
}

# Verify the reaper supports headless invocation (the v2 reaper does -- the
# v1 reaper does not have this property and must never be installed here).
$reaperHead = Get-Content $reaperScript -TotalCount 30 -ErrorAction SilentlyContinue
if (-not ($reaperHead -match 'stop_close_prism_nodes_v2|U-A3|v2 design')) {
  throw "Refusing to install: $reaperScript does not look like the v2 reaper. Aborting to avoid scheduling the broken v1."
}

# Launch node via wscript run-hidden.vbs -- wscript NEVER allocates a console, so
# the child node inherits "no console" cleanly. (powershell.exe -WindowStyle Hidden
# still flashes a 1-frame console AND the child node it spawned via & got its OWN
# window -- the per-fire flash that interrupted fullscreen/gaming sessions.)
# Belt-and-suspenders with the S4U principal below (session 0 = no interactive
# desktop). Matches PRISM Node Orphan Cleaner + Orphan Process Reaper (PS).
$vbs = Join-Path $PSScriptRoot 'run-hidden.vbs'
if (-not (Test-Path $vbs)) { throw "Hidden launcher not found: $vbs" }
$action = New-ScheduledTaskAction -Execute 'wscript.exe' `
  -Argument ('//nologo "' + $vbs + '" "' + $nodeExe + '" "' + $reaperScript + '"')

$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 2) `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Reaps orphan node.exe and git.exe processes spawned by the PRISM hook stack. Replaces lifecycle gap when Stop hooks don't fire (hung chats). Per HARNESS-AUDIT/U-TIER3c." `
  -Force | Out-Null

Write-Host "Registered: $TaskName (every $EveryMinutes min)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 2
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult)"
}

Write-Host ""
Write-Host "To verify it's running 5-min later:"
Write-Host "  Get-ScheduledTaskInfo -TaskName '$TaskName'"
Write-Host "To pause without uninstalling:"
Write-Host "  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "To uninstall:"
Write-Host "  & '$PSScriptRoot\install-zombie-reaper-task.ps1' -Uninstall"
