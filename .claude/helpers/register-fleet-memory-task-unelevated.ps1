# Unelevated current-user registration helper for the fleet memory monitor.
# Use this when you can't get an admin PowerShell. Runs as current user, while
# logged in only. For full autonomy (S4U + AtStartup + reboot resume) run the
# elevated install-fleet-memory-monitor-task.ps1 instead.
$ErrorActionPreference = 'Stop'

$node = 'H:\Tools\nodejs\node.exe'
if (-not (Test-Path $node)) { $node = (Get-Command node -ErrorAction Stop).Source }

$a = New-ScheduledTaskAction -Execute $node `
  -Argument '"H:\PRISM\scripts\fleet-memory-monitor.mjs" --once'

$t = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(60) `
  -RepetitionInterval (New-TimeSpan -Minutes 5) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$s = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Seconds 90) `
  -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName 'PRISM Fleet Memory Monitor' `
  -Action $a -Trigger $t -Settings $s `
  -Description 'PRISM Fleet Memory Monitor (current-user, every 5 min). Re-run install-fleet-memory-monitor-task.ps1 elevated for S4U+AtStartup hardening.' `
  -Force | Out-Null

Write-Host 'REGISTERED: PRISM Fleet Memory Monitor (every 5 min, current user, runs while logged in).'
Start-ScheduledTask -TaskName 'PRISM Fleet Memory Monitor'
Start-Sleep -Seconds 8
$info = Get-ScheduledTaskInfo -TaskName 'PRISM Fleet Memory Monitor'
Write-Host "First run dispatched. LastTaskResult=$($info.LastTaskResult) (0=clean 1=warn 2=critical 3=fail 267009=running)"
