# install-hook-window-hider.ps1 -- register the durable PRISM Hook Window Hider task (slot:golf)
#
# Registers a hidden, no-time-limit, AtLogon scheduled task that runs hook-window-hider.ps1 -- the
# in-session watcher that HIDES (ShowWindow SW_HIDE) the harness's throwaway claude->bash->conhost hook
# console windows the instant they appear, while never touching real terminals / Windows Terminal / MCP.
#
# CRITICAL -- LogonType MUST stay Interactive (session 1), NOT S4U:
#   The sibling `PRISM Conhost Janitor` runs S4U because it KILLS the conhost process (cross-session OK).
#   This task HIDES the window via user32!ShowWindow, which is window-station bound -- a session-0 (S4U)
#   process CANNOT manipulate a session-1 window, so an S4U hider silently no-ops. If H:\Tools\enforce-hidden-tasks.ps1
#   (the 2026-06-24 Interactive->S4U sweep) ever flips this task, the watcher logs a loud session-0 warning
#   and stops -- add this task to that script's exclusion list (alongside PRISM Conhost Janitor).
#   See [[reference_interactive_scheduled_task_window_popups_2026_06_24]].
#
# Run from a normal (non-elevated) PowerShell -- a current-user logon task needs no UAC.
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-hook-window-hider.ps1 -RunNow
param([switch]$RunNow)

$ErrorActionPreference = 'Stop'
$taskName = 'PRISM Hook Window Hider'
$ps       = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
$script   = 'H:\prism\.claude\helpers\hook-window-hider.ps1'

if (-not (Test-Path $script)) { throw "hider script not found: $script" }

$action   = New-ScheduledTaskAction -Execute $ps -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$trigger  = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
              -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) `
              -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -Hidden
# Interactive logon type (session 1) is REQUIRED -- see the CRITICAL note above. Limited run level (no UAC).
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "registered: $taskName (Interactive / session 1)"

if ($RunNow) {
  # Start the persistent watcher immediately (mutex in the script guards against a 2nd instance).
  Start-Process -FilePath $ps -WindowStyle Hidden -ArgumentList @(
    '-NoProfile','-NonInteractive','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-File',$script
  ) | Out-Null
  Write-Host "hider started (hidden)"
}
