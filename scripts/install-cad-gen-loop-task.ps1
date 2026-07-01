# install-cad-gen-loop-task.ps1
# CAD-GEN-LOOP SOURCE-OF-TRUTH (U-CAD-GEN-LOOP-INSTALLER, slot:golf, 2026-06-27) -- register the
# "PRISM CAD Gen Loop" Windows Scheduled Task that runs scripts/run-cad-gen-loop-overnight.ps1
# every 30 min across an 11h overnight window.
#
# WHY THIS FILE EXISTS: the live task was hand-registered on 2026-06-25 with a SINGLE one-time
# TimeTrigger (StartBoundary 2026-06-25T23:04, repeat 30m for 11h, StopAtDurationEnd). After that
# one 11h window elapsed, NextRunTime went N/A and the task went permanently stale (fleet-task-health
# flagged "PRISM CAD Gen Loop=stale; last ran 1815min ago"). Root cause = a one-shot trigger where a
# nightly-recurring one was intended, AND no checked-in installer to register it correctly. This
# script is that missing source-of-truth: it registers the task with a DAILY trigger (graft the
# intraday 30m/11h repetition onto a -Daily trigger, the same pattern as
# install-fleet-phd-continuity-task.ps1, R8 clone-don't-fork) so the overnight window restarts every
# night and the task can never go stale again.
#
# ELEVATION: the task runs as the CURRENT USER via S4U (run whether logged on or not, no stored
# password) -- NOT NT AUTHORITY\SYSTEM -- so registering it does NOT require an elevated shell.
# (The live task was re-registered with this exact daily trigger from a non-elevated session on
# 2026-06-27; this script reproduces that.)
#
# SAFETY: this installer only registers the SCHEDULE. The actuated work
# (scripts/run-cad-gen-loop-overnight.ps1) is delta's CAD-generation domain and is unchanged. ASCII-only.
#
# USAGE:
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-cad-gen-loop-task.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-cad-gen-loop-task.ps1 -WhatIf
#   -At "HH:mm"          nightly start time (default 23:04)
#   -EveryMinutes <N>    intraday repeat interval (default 30)
#   -DurationHours <N>   overnight repetition window (default 11)
#   -RunNow              also kick it immediately
#   -Uninstall           remove the task

[CmdletBinding(SupportsShouldProcess)]
param(
  [string]$At = "23:04",
  [int]$EveryMinutes = 30,
  [int]$DurationHours = 11,
  [switch]$RunNow,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

$TaskName = "PRISM CAD Gen Loop"
$Script   = "H:/prism/scripts/run-cad-gen-loop-overnight.ps1"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    if ($PSCmdlet.ShouldProcess($TaskName, "Unregister-ScheduledTask")) {
      Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
      Write-Host "[cad-gen-loop] uninstalled task '$TaskName'"
    }
  } else { Write-Host "[cad-gen-loop] task '$TaskName' not present" }
  exit 0
}

if ($EveryMinutes -lt 1) { $EveryMinutes = 1 }
if ($DurationHours -lt 1) { $DurationHours = 1 }
if ($DurationHours -gt 24) { $DurationHours = 24 }

if (-not (Test-Path $Script)) { throw "CAD gen overnight script not found: $Script (run on the PRISM host)." }

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Script`"" `
  -WorkingDirectory "H:/prism"

$now = Get-Date
$start = [datetime]::ParseExact($At, "HH:mm", $null)
$start = $now.Date.AddHours($start.Hour).AddMinutes($start.Minute)
if ($start -le $now) { $start = $start.AddDays(1) }

# Daily trigger + grafted intraday repetition (the fix: was a one-time TimeTrigger).
# Repeats every $EveryMinutes for the $DurationHours overnight window, then stops; recurs nightly.
$trigger = New-ScheduledTaskTrigger -Daily -At $start
$rep = New-ScheduledTaskTrigger -Once -At $start `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Hours $DurationHours)
$trigger.Repetition = $rep.Repetition

# Overnight generation pass; 2h ceiling per the live definition. Restart 3x on failure.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

# Current-user S4U principal (run whether logged on or not; no elevation, no stored password).
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U

if ($PSCmdlet.ShouldProcess($TaskName, "Register-ScheduledTask")) {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
  Write-Host "[cad-gen-loop] registered '$TaskName'"
  Write-Host "  fires    : nightly $($start.ToString('HH:mm')) (local) then every $EveryMinutes min for ${DurationHours}h [current-user S4U]"
  Write-Host "  script   : $Script"
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "  nextRun  : $($info.NextRunTime)"
}

if ($RunNow) {
  if ($PSCmdlet.ShouldProcess($TaskName, "Start-ScheduledTask")) {
    Write-Host "[cad-gen-loop] -RunNow: starting immediately..."
    Start-ScheduledTask -TaskName $TaskName
  }
}
