# install-fleet-phd-continuity-task.ps1
# FLEET-PHD-CONTINUITY (U-PHD-DRIVER, slot:zulu, 2026-06-27) -- register a Windows Scheduled
# Task that fires scripts/fleet-phd-continuity.mjs every N minutes so the 16-domain
# FLEET-PHD-BUILDOUT campaign is continuously OBSERVED with zero Claude tokens: each tick
# re-reads the 16 plans + live signals (task health, galaxy-dir commits, deepening-artifact
# mtime), classifies each domain advancing|stalled|blocked|done, and writes
# state/shared/dashboards/FLEET-PHD-CONTINUITY.{json,md} + a throttled chat-bus nudge.
#
# WHY a scheduled task: a chat-spawned poll dies the moment the chat /compacts or the
# fleet-reaper kills long node children of a dead claude.exe. A scheduled task's node child is
# parented to Task Scheduler -> reaper-immune -> the campaign stays observed without a live
# Claude session.
#
# SAFETY: the driver is READ-ONLY -- it actuates nothing (no SendKeys, no plan writes, no task
# registration). It only writes its own 2 dashboard files + an advisory chat-bus line. Installing
# this task is therefore SAFE. The agent does NOT register it (operator elevation required); run
# this yourself. Clone of install-zulu-build-loop-cron.ps1 (R8 clone-don't-fork). ASCII-only.
#
# USAGE:
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-fleet-phd-continuity-task.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-fleet-phd-continuity-task.ps1 -WhatIf
#   -EveryMinutes <N>  repeat interval (default 30)
#   -At "HH:mm"        first run time (default 00:08, +~8min phase off the 5-min reaper cluster)
#   -RunNow            also kick it immediately
#   -RekickStale       one-shot: Start-ScheduledTask "PRISM CAD Gen Loop" (the dashboard's CAD-Gen repair)
#   -AsSystem          register under NT AUTHORITY\SYSTEM (runs logged-off; REQUIRES elevated PowerShell)
#   -Uninstall         remove the task

[CmdletBinding(SupportsShouldProcess)]
param(
  [int]$EveryMinutes = 30,
  [string]$At = "00:08",
  [switch]$RunNow,
  [switch]$RekickStale,
  [switch]$AsSystem,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

$TaskName = "PRISM Fleet PhD Continuity"
$Script   = "H:/prism/scripts/fleet-phd-continuity.mjs"

# -RekickStale: the one-shot operator repair the dashboard surfaces (PRISM CAD Gen Loop stale).
if ($RekickStale) {
  if (Get-ScheduledTask -TaskName "PRISM CAD Gen Loop" -ErrorAction SilentlyContinue) {
    if ($PSCmdlet.ShouldProcess("PRISM CAD Gen Loop", "Start-ScheduledTask")) {
      Start-ScheduledTask -TaskName "PRISM CAD Gen Loop"
      Write-Host "[phd-cont] re-kicked 'PRISM CAD Gen Loop'"
    }
  } else {
    Write-Host "[phd-cont] 'PRISM CAD Gen Loop' not registered -- nothing to re-kick"
  }
}

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    if ($PSCmdlet.ShouldProcess($TaskName, "Unregister-ScheduledTask")) {
      Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
      Write-Host "[phd-cont] uninstalled task '$TaskName'"
    }
  } else { Write-Host "[phd-cont] task '$TaskName' not present" }
  exit 0
}

if ($EveryMinutes -lt 1) { $EveryMinutes = 1 }

# Prefer the canonical PRISM portable node FIRST (a scheduled task may have a different PATH
# than the installer shell -> a bare `node` can be unresolvable at task-run time).
$Node = $null
foreach ($cand in @("H:/.claude/bin/portable-node.exe", "H:/Tools/nodejs/node.exe", "C:/Program Files/nodejs/node.exe")) {
  if (Test-Path $cand) { $Node = $cand; break }
}
if (-not $Node) { $Node = (Get-Command node -ErrorAction Stop).Source }
if (-not (Test-Path $Script)) { throw "continuity script not found: $Script (run on the PRISM host)." }

$action = New-ScheduledTaskAction -Execute $Node `
  -Argument "`"$Script`" --json" `
  -WorkingDirectory "H:/prism"

$now = Get-Date
$start = [datetime]::ParseExact($At, "HH:mm", $null)
$start = $now.Date.AddHours($start.Hour).AddMinutes($start.Minute)
if ($start -le $now) { $start = $start.AddDays(1) }

# Daily trigger + intraday repetition (graft a -Once repetition onto a -Daily).
$trigger = New-ScheduledTaskTrigger -Daily -At $start
$rep = New-ScheduledTaskTrigger -Once -At $start `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Hours 24)
$trigger.Repetition = $rep.Repetition

# Each tick is a read-mostly observe pass (~seconds); 10 min ceiling.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
  -MultipleInstances IgnoreNew

if ($PSCmdlet.ShouldProcess($TaskName, "Register-ScheduledTask")) {
  if ($AsSystem) {
    $principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest -LogonType ServiceAccount
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
  } else {
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
  }
  Write-Host "[phd-cont] registered '$TaskName'"
  Write-Host "  fires    : $($start.ToString('yyyy-MM-dd HH:mm')) (local) then every $EveryMinutes min for 24h$(if ($AsSystem) {' [SYSTEM]'} else {' [current-user]'})"
  Write-Host "  script   : $Script --json"
  Write-Host "  output   : H:/prism/state/shared/dashboards/FLEET-PHD-CONTINUITY.{json,md}"
  Write-Host "  SAFE     : read-only observer; writes its 2 dashboard files + advisory chat-bus only."
}

if ($RunNow) {
  if ($PSCmdlet.ShouldProcess($TaskName, "Start-ScheduledTask")) {
    Write-Host "[phd-cont] -RunNow: starting immediately..."
    Start-ScheduledTask -TaskName $TaskName
  }
}
