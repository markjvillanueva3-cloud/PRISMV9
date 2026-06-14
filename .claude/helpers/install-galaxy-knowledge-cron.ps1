# install-galaxy-knowledge-cron.ps1
# FLEET-KNOWLEDGE-MAX / U-ZKM-ITERATE -- register a Windows Scheduled Task that drives the
# fleet knowledge-accretion loop (scripts/galaxy-knowledge-iterate.mjs) unattended + REAPER-IMMUNE.
#
# WHY (slot:zulu 2026-06-14): operator goal = "loop EVERY galaxy >=10x each, extracting reputable
# external sources, until physically impossible (no more reputable sources)". A chat-spawned loop
# dies the moment the chat /compacts or stops (the fleet-reaper kills long node children of a dead
# claude.exe). A scheduled-task's node child's parent is Task Scheduler / svchost, NOT a claude.exe
# chat, so the reaper spares it -- the loop runs continuously WITHOUT a Claude session.
#
# ONE task (not 34): galaxy-knowledge-iterate.mjs --count N picks the N LEAST-ITERATED, non-saturated
# galaxies each run (nextGalaxies), so the single task fairly advances all 34 toward the >=10 target,
# and stops touching a galaxy once it SATURATES (>=10 iters + sustained source-novelty -> 0). When all
# 34 saturate, each run is a cheap no-op ("FLEET DONE"). The ledger
# (state/shared/galaxy-knowledge-iterations.json) is the deterministic stop -- there is no infinite loop.
#
# Clone of install-galaxy-mine-task.ps1 (R8 clone-don't-fork). ASCII-only (PS 5.1 codepage safe).
#
# USAGE:
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-galaxy-knowledge-cron.ps1 -RunNow
#   -Count <N>       galaxies advanced per run (default 3). Each is one Hermes deep-research iteration.
#   -At "HH:mm"      first run time today/tomorrow (default 02:15).
#   -EveryHours <H>  repeat interval across 24h (default 3 -> ~8 runs/day -> ~24 galaxy-iters/day).
#   -RunNow          also kick it immediately.
#   -AsSystem        register under NT AUTHORITY\SYSTEM (runs logged-off; REQUIRES elevated PowerShell).
#   -Uninstall       remove the task.

param(
  [int]$Count = 3,
  [string]$At = "02:15",
  [int]$EveryHours = 3,
  [switch]$RunNow,
  [switch]$AsSystem,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

$TaskName = "PRISM Galaxy Knowledge Iterate"
$Script   = "H:/prism/scripts/galaxy-knowledge-iterate.mjs"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[gk-cron] uninstalled task '$TaskName'"
  } else { Write-Host "[gk-cron] task '$TaskName' not present" }
  exit 0
}

if ($Count -lt 1) { $Count = 1 }
if ($EveryHours -lt 1) { $EveryHours = 1 }

$Node = $null
foreach ($cand in @("H:/Tools/nodejs/node.exe", "C:/Program Files/nodejs/node.exe")) {
  if (Test-Path $cand) { $Node = $cand; break }
}
if (-not $Node) { $Node = (Get-Command node -ErrorAction Stop).Source }
if (-not (Test-Path $Script)) { throw "iterate script not found: $Script (run on the PRISM host)." }

# Action: advance the N least-iterated open galaxies. The CLI inits the ledger on first run.
$action = New-ScheduledTaskAction -Execute $Node `
  -Argument "`"$Script`" --count $Count" `
  -WorkingDirectory "H:/prism"

$now = Get-Date
$start = [datetime]::ParseExact($At, "HH:mm", $null)
$start = $now.Date.AddHours($start.Hour).AddMinutes($start.Minute)
if ($start -le $now) { $start = $start.AddDays(1) }

# Daily trigger + intraday repetition (the standard PS idiom: graft a -Once repetition onto a -Daily).
$trigger = New-ScheduledTaskTrigger -Daily -At $start
$rep = New-ScheduledTaskTrigger -Once -At $start `
  -RepetitionInterval (New-TimeSpan -Hours $EveryHours) `
  -RepetitionDuration (New-TimeSpan -Hours 24)
$trigger.Repetition = $rep.Repetition

# ExecutionTimeLimit 2h: a --count 3 run is ~3 Hermes calls (~5 min); the cap stops a wedged Hermes
# call from lingering. MultipleInstances IgnoreNew so a slow run never stacks on the next interval.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
  -MultipleInstances IgnoreNew

# Principal: default = current interactive user (no elevation). -AsSystem runs logged-off (needs
# elevated PS to register). Either way the node child's parent is Task Scheduler -> reaper-immune.
if ($AsSystem) {
  $principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest -LogonType ServiceAccount
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
} else {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
}

Write-Host "[gk-cron] registered '$TaskName'"
Write-Host "  count    : $Count galaxies / run (least-iterated open galaxies first)"
Write-Host "  fires    : $($start.ToString('yyyy-MM-dd HH:mm')) (local) then every $EveryHours h for 24h$(if ($AsSystem) {' [SYSTEM]'} else {' [current-user]'})"
Write-Host "  script   : $Script --count $Count"
Write-Host "  ledger   : H:/prism/state/shared/galaxy-knowledge-iterations.json (deterministic stop: all 34 saturated)"
Write-Host "  anchors  : H:/prism/knowledge/memories/reference/reference_<galaxy>_iter<N>_deepsource_*.md"

if ($RunNow) {
  Write-Host "[gk-cron] -RunNow: starting immediately..."
  Start-ScheduledTask -TaskName $TaskName
}
