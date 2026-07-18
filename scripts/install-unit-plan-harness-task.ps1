# install-unit-plan-harness-task.ps1  (HERMES-UNIT-PLAN / U-ZULU-UNITPLAN-HARNESS, slot:zulu)
#
# Checked-in, idempotent registration for the "PRISM Unit Plan Harness" scheduled task
# (fleet convention: an autonomy-critical cron MUST be reproducible from the repo, like
# install-fleet-reaper-task.ps1). Re-run any time to (re)create the task from source of truth.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-unit-plan-harness-task.ps1 [-RunNow]
#
# The task fires the harness every 23 minutes (off-:00/:30 phase), cap 2 units/run, 20-min
# execution limit, IgnoreNew so overlapping fires never stack. The harness itself is fail-open
# (exit 0 when lanes are dark) and self-locks, so a missed/overlapping fire is always safe.

param([switch]$RunNow)

$ErrorActionPreference = 'Stop'
# Real node.exe (a PE executable), NOT the bash-script shim H:\.claude\bin\portable-node --
# Task Scheduler CreateProcess cannot reliably launch a Bourne script (fails 0x80070001
# ERROR_INVALID_FUNCTION). Matches the working fleet tasks (PRISM Fleet Reaper etc.).
$TaskName = 'PRISM Unit Plan Harness'
$NodeExe  = 'H:\Tools\nodejs\node.exe'
$Script   = 'H:\prism\scripts\hermes-unit-plan-harness.mjs'
$WorkDir  = 'H:\prism'

if (-not (Test-Path $NodeExe)) { throw "node.exe not found at $NodeExe" }
if (-not (Test-Path $Script))  { throw "harness not found at $Script" }

$action = New-ScheduledTaskAction -Execute $NodeExe -Argument "$Script --cap 2" -WorkingDirectory $WorkDir
# Start ~3 min out, then repeat every 23 min effectively forever (10-year duration).
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(3) `
  -RepetitionInterval (New-TimeSpan -Minutes 23) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -MultipleInstances IgnoreNew

# Principal: run whether-logged-on-or-not (S4U, no stored password) so the autonomy fires
# when the operator is logged off ("no down time"). S4U current-user, NOT SYSTEM: the harness
# calls the USER-authenticated local Hermes proxy (:8645 OAuth), which SYSTEM cannot reach.
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType S4U -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force |
  Select-Object TaskName, State | Format-List

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Started '$TaskName' once now."
}
Write-Host "Registered '$TaskName' (every 23 min, --cap 2). Inspect: Get-ScheduledTask '$TaskName' | Get-ScheduledTaskInfo"
