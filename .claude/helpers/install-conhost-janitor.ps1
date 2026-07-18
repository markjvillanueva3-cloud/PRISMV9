# install-conhost-janitor.ps1 -- register the durable PRISM Conhost Janitor task (slot:golf)
#
# Registers a hidden, no-time-limit, AtLogon scheduled task that runs
# conhost-orphan-janitor.ps1 -- the fleet-hygiene watcher that closes orphaned
# console-host (conhost.exe) windows left behind by the harness's per-turn hook spawns.
#
# Run from a normal (non-elevated) PowerShell -- a current-user logon task needs no UAC.
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-conhost-janitor.ps1 -RunNow
param([switch]$RunNow)

$ErrorActionPreference = 'Stop'
$taskName = 'PRISM Conhost Janitor'
$ps       = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
$script   = 'H:\prism\.claude\helpers\conhost-orphan-janitor.ps1'

if (-not (Test-Path $script)) { throw "janitor script not found: $script" }

$action   = New-ScheduledTaskAction -Execute $ps -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$trigger  = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
              -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) `
              -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -Hidden
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "registered: $taskName"

if ($RunNow) {
  # Start the persistent watcher immediately (mutex in the script guards against a 2nd instance).
  Start-Process -FilePath $ps -WindowStyle Hidden -ArgumentList @(
    '-NoProfile','-NonInteractive','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-File',$script
  ) | Out-Null
  Write-Host "janitor started (hidden)"
}
