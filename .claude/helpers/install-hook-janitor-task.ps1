param(
  [string]$TaskName = 'PRISM Hook Janitor',
  [int]$EveryMinutes = 2,
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-hook-janitor-task.ps1 -- permanent fix for the hook fork-storm hang (2026-05-11)
#
# Registers a Windows Scheduled Task that runs node-process-janitor.mjs --full
# every $EveryMinutes minutes, independent of Claude Code sessions.
#
# Why a third reaper task: the existing "PRISM Zombie Reaper v2" and "PRISM Node
# Orphan Cleaner" tasks only target node.exe / git.exe. The actual processes that
# wedge on Windows are the Git-for-Windows bash.exe double-fork wrappers around
# each hook, plus orphaned @playwright/mcp / mcp-http-bridge servers from dead
# sessions. The hardened janitor (--full) reaps all of those. 2-min cadence so
# orphans never accumulate for long even when every Claude session is hung (a
# hung session never fires its Stop hooks -- see reference_harness_hang_prevention).
#
# Per memory feedback_never_delete_only_disable.md: this REGISTERS a task; it can
# be Disable-ScheduledTask'd to pause without removing. Use -Uninstall to remove.

$ErrorActionPreference = 'Stop'

$janitorScript = 'H:\PRISM\.claude\hooks\node-process-janitor.mjs'

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

if (-not (Test-Path $janitorScript)) { throw "Janitor script not found: $janitorScript" }

# Sanity: confirm the script understands --full (the hardened version does).
$head = Get-Content $janitorScript -TotalCount 60 -ErrorAction SilentlyContinue
if (-not ($head -match '--full')) {
  throw "Refusing to install: $janitorScript does not look like the hardened janitor (no --full flag). Update it first."
}

$action = New-ScheduledTaskAction -Execute $nodeExe -Argument "`"$janitorScript`" --full"

$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Reaps stale PRISM hook node.exe/bash.exe processes and orphaned MCP servers (node-process-janitor.mjs --full). Permanent fix for the Windows hook fork-storm hang. 2-min cadence, runs independent of Claude sessions." `
  -Force | Out-Null

Write-Host "Registered: $TaskName (node-process-janitor.mjs --full, every $EveryMinutes min, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 2
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult)"
}

Write-Host ""
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-hook-janitor-task.ps1' -Uninstall"
