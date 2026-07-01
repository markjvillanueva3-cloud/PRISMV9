# install-account-switch-monitor-cron.ps1
# ZULU-ACCOUNT-CYCLE-MS0 / auto-switch wiring -- register a Windows Scheduled Task that fires
# scripts/account-switch-monitor.mjs every N minutes to auto-detect the 90%-of-5h-limit signal
# and (when armed) swap accounts + stagger-restart the fleet unattended + REAPER-IMMUNE.
#
# WHY (2026-06-15): account-switch-restart-coordinator.mjs already detects -> decides -> actuates,
# but nothing auto-fired it on a schedule. A chat-spawned poll dies the moment the chat /compacts
# or the fleet-reaper kills long node children of a dead claude.exe. A scheduled-task's node child
# is parented to Task Scheduler / svchost -> reaper-immune -> runs continuously without a Claude session.
#
# SAFETY -- apply is OFF by default:
#   The monitor runs in dry-run mode (detect + advise, no swap, no restart) until the operator:
#     (a) captures >=2 Claude accounts  (claude logout / claude login)
#     (b) sets env PRISM_5H_WEIGHTED_TOKEN_TRIGGER to calibrate the 90% gate
#     (c) sets env PRISM_ACCT_SWITCH_AUTO_APPLY=1 on this task (re-register or edit in Task Scheduler)
#   Installing this task with defaults is therefore SAFE -- it only detects and logs.
#
# Clone of install-galaxy-knowledge-cron.ps1 (R8 clone-don't-fork). ASCII-only (PS 5.1 codepage safe).
#
# USAGE:
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-account-switch-monitor-cron.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-account-switch-monitor-cron.ps1 -RunNow
#   -EveryMinutes <N>  repeat interval in minutes (default 10)
#   -At "HH:mm"        first run time today/tomorrow (default 02:05, offset from galaxy-knowledge 02:15)
#   -RunNow            also kick it immediately
#   -AsSystem          register under NT AUTHORITY\SYSTEM (runs logged-off; REQUIRES elevated PowerShell)
#   -Uninstall         remove the task

param(
  [int]$EveryMinutes = 10,
  [string]$At = "02:05",
  [switch]$RunNow,
  [switch]$AsSystem,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

$TaskName = "PRISM Account Switch Monitor"
$Script   = "H:/prism/scripts/account-switch-monitor.mjs"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[acct-mon-cron] uninstalled task '$TaskName'"
  } else { Write-Host "[acct-mon-cron] task '$TaskName' not present" }
  exit 0
}

if ($EveryMinutes -lt 1) { $EveryMinutes = 1 }

# Prefer the canonical PRISM portable node FIRST: a scheduled task (esp. -AsSystem / logged-off) may
# have a different PATH than the interactive installer shell, so a bare `node` resolved at install
# time can be a binary the TASK cannot see -> silent HRESULT launch-failure (the fleet-task-health
# class). The portable node is the absolute path every PRISM hook already uses.
$Node = $null
foreach ($cand in @("H:/.claude/bin/portable-node.exe", "H:/Tools/nodejs/node.exe", "C:/Program Files/nodejs/node.exe")) {
  if (Test-Path $cand) { $Node = $cand; break }
}
if (-not $Node) { $Node = (Get-Command node -ErrorAction Stop).Source }
if (-not (Test-Path $Script)) { throw "monitor script not found: $Script (run on the PRISM host)." }

# Action: run the monitor with no extra args; it reads all knobs from env.
$action = New-ScheduledTaskAction -Execute $Node `
  -Argument "`"$Script`"" `
  -WorkingDirectory "H:/prism"

$now = Get-Date
$start = [datetime]::ParseExact($At, "HH:mm", $null)
$start = $now.Date.AddHours($start.Hour).AddMinutes($start.Minute)
if ($start -le $now) { $start = $start.AddDays(1) }

# Daily trigger + intraday repetition (standard PS idiom: graft a -Once repetition onto a -Daily).
$trigger = New-ScheduledTaskTrigger -Daily -At $start
$rep = New-ScheduledTaskTrigger -Once -At $start `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Hours 24)
$trigger.Repetition = $rep.Repetition

# ExecutionTimeLimit 10 min: each tick is a single coordinator call (~seconds normally).
# MultipleInstances IgnoreNew so a slow tick never stacks on the next interval.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
  -MultipleInstances IgnoreNew

# Principal: default = current interactive user. -AsSystem runs logged-off (needs elevated PS).
if ($AsSystem) {
  $principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest -LogonType ServiceAccount
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
} else {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
}

Write-Host "[acct-mon-cron] registered '$TaskName'"
Write-Host "  fires    : $($start.ToString('yyyy-MM-dd HH:mm')) (local) then every $EveryMinutes min for 24h$(if ($AsSystem) {' [SYSTEM]'} else {' [current-user]'})"
Write-Host "  script   : $Script"
Write-Host "  ledger   : H:/prism/state/shared/account-switch-monitor.jsonl"
Write-Host ""
Write-Host "  APPLY KNOB IS OFF BY DEFAULT -- dry-run only until you:"
Write-Host "    (a) capture >=2 Claude accounts  (claude logout / claude login)"
Write-Host "    (b) set env PRISM_5H_WEIGHTED_TOKEN_TRIGGER (calibrates the 90%% gate)"
Write-Host "    (c) set env PRISM_ACCT_SWITCH_AUTO_APPLY=1 on this task"
Write-Host "  Until (a)+(b)+(c) are done, each tick detects + logs but does NOT swap or restart."

if ($RunNow) {
  Write-Host "[acct-mon-cron] -RunNow: starting immediately..."
  Start-ScheduledTask -TaskName $TaskName
}
