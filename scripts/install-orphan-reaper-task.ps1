<#
.SYNOPSIS
  install-orphan-reaper-task.ps1 - register scripts/reap-orphan-procs.ps1 as a 5-minute Windows
  Scheduled Task so the PRISM hook stack never spirals into a process/handle exhaustion hang again.

.DESCRIPTION
  Companion to the existing node-based tasks ("PRISM Zombie Reaper v2", "PRISM Node Orphan Cleaner").
  Those handle node-side leaks + vitest/tsx workers - but they're written in node, and the failure
  this guards against is precisely "the machine is too exhausted to spawn node", at which point those
  tasks silently fail to launch. reap-orphan-procs.ps1 is pure PowerShell (no child-process spawns),
  so it keeps reaping the leaked bash hook-wrappers + orphaned shells even in that state. Three tasks
  on the same 5-minute cadence is fine - reaping a dead pid is a no-op.

  Per memory feedback_never_delete_only_disable.md: this REGISTERS a task. Pause it with
  Disable-ScheduledTask -TaskName 'PRISM Orphan Process Reaper (PS)'; remove it with -Uninstall.

.PARAMETER TaskName
  Scheduled-task name. Default 'PRISM Orphan Process Reaper (PS)'.
.PARAMETER EveryMinutes
  Repetition interval in minutes. Default 5.
.PARAMETER RunNow
  Trigger an immediate run after registering and report the result.
.PARAMETER Uninstall
  Unregister the task and exit.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-orphan-reaper-task.ps1 -RunNow
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-orphan-reaper-task.ps1 -Uninstall
#>
[CmdletBinding()]
param(
  [string]$TaskName = 'PRISM Orphan Process Reaper (PS)',
  [int]$EveryMinutes = 5,
  [switch]$RunNow,
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Unregistered task: $TaskName"
  } else {
    Write-Host "Task not found (already uninstalled): $TaskName"
  }
  return
}

# Resolve the reaper script next to this installer.
$reaperScript = Join-Path $PSScriptRoot 'reap-orphan-procs.ps1'
if (-not (Test-Path $reaperScript)) { throw "Reaper script not found: $reaperScript" }

# Sanity: refuse to install if the script does not look like our reaper.
$reaperText = Get-Content $reaperScript -Raw -ErrorAction SilentlyContinue
if (-not (($reaperText -match 'reap-orphan-procs') -and ($reaperText -match 'function Test-ShouldReap'))) {
  throw "Refusing to install: $reaperScript does not look like reap-orphan-procs.ps1."
}

# Self-test the reaper before scheduling it.
$selfTest = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $reaperScript -SelfTest -Quiet 2>&1
if ($LASTEXITCODE -ne 0) {
  $msg = "Reaper self-test FAILED - not scheduling. Output: " + ($selfTest -join ' ')
  throw $msg
}
Write-Host "Reaper self-test passed."

# powershell.exe at its fixed system path (never depends on PATH or a portable runtime).
$psExe = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
if (-not (Test-Path $psExe)) { $psExe = (Get-Command powershell.exe -ErrorAction Stop).Source }

$argString = '-NoProfile -ExecutionPolicy Bypass -File "' + $reaperScript + '" -Quiet'
$action = New-ScheduledTaskAction -Execute $psExe -Argument $argString

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

$desc = "Pure-PowerShell reaper for leaked PRISM hook bash-wrappers + orphaned shells (the process/handle exhaustion that hangs Claude tool calls). Runs even when the machine is too exhausted to spawn node, unlike the node-based reaper tasks. Source: scripts/reap-orphan-procs.ps1."

# Run elevated (when logged on) so it can terminate stubborn hook processes the limited-token
# Task Scheduler default cannot ("Access is denied"). Falls back to a plain current-user task if
# this account can't register an elevated principal (e.g. non-admin) - it still reaps everything killable.
$principal = $null
try { $principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Highest } catch { $principal = $null }
if ($principal) {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $desc -Force | Out-Null
} else {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description $desc -Force | Out-Null
}

Write-Host "Registered: '$TaskName' - every $EveryMinutes min, executes:"
Write-Host ("  " + $psExe + " " + $argString)

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 2
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host ("Triggered an immediate run. LastTaskResult=0x{0:X}  LastRunTime={1}" -f $info.LastTaskResult, $info.LastRunTime)
}

Write-Host ""
Write-Host "Verify:    Get-ScheduledTaskInfo -TaskName '$TaskName'"
Write-Host "Pause:     Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host ("Uninstall: powershell -NoProfile -File `"" + $PSCommandPath + "`" -Uninstall")
