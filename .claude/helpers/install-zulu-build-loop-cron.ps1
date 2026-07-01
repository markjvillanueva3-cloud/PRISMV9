# install-zulu-build-loop-cron.ps1
# ZULU-BUILDLOOP (INCR 3) -- register a Windows Scheduled Task that fires
# scripts/zulu-build-loop.mjs every N minutes so the autonomous build queue stays
# continuously fresh: it recomputes the ranked PENDING queue (capability spec + bravo
# brief), Ollama-digests the next unit, and writes state/shared/zulu-build-loop-next.json
# for a gated builder (bravo /checkin /loop) to pick up.
#
# WHY a scheduled task (2026-06-15): a chat-spawned poll dies the moment the chat
# /compacts or the fleet-reaper kills long node children of a dead claude.exe. A
# scheduled-task's node child is parented to Task Scheduler -> reaper-immune -> the
# build queue stays fresh continuously without a live Claude session.
#
# SAFETY: the driver NEVER builds/writes-engine/commits -- it only maintains the
# "what to build next" pointer. The per-unit build+test+3-of-3 scrutiny stays with the
# gated builder chat. Installing this task is therefore SAFE (read sources -> write 1
# pointer JSON + a ledger row). Governance/operator-gated units are never emitted.
#
# Clone of install-account-switch-monitor-cron.ps1 (R8 clone-don't-fork). ASCII-only.
#
# USAGE:
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-zulu-build-loop-cron.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-zulu-build-loop-cron.ps1 -RunNow
#   -EveryMinutes <N>  repeat interval (default 15)
#   -At "HH:mm"        first run time (default 02:25, offset from account-switch 02:05 + galaxy-knowledge 02:15)
#   -RunNow            also kick it immediately
#   -AsSystem          register under NT AUTHORITY\SYSTEM (runs logged-off; REQUIRES elevated PowerShell)
#   -Uninstall         remove the task

param(
  [int]$EveryMinutes = 15,
  [string]$At = "02:25",
  [switch]$RunNow,
  [switch]$AsSystem,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

$TaskName = "PRISM Zulu Build Loop"
$Script   = "H:/prism/scripts/zulu-build-loop.mjs"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[zbl-cron] uninstalled task '$TaskName'"
  } else { Write-Host "[zbl-cron] task '$TaskName' not present" }
  exit 0
}

if ($EveryMinutes -lt 1) { $EveryMinutes = 1 }

# Prefer the canonical PRISM portable node FIRST (a scheduled task may have a different
# PATH than the installer shell -> a bare `node` can be unresolvable at task-run time).
$Node = $null
foreach ($cand in @("H:/.claude/bin/portable-node.exe", "H:/Tools/nodejs/node.exe", "C:/Program Files/nodejs/node.exe")) {
  if (Test-Path $cand) { $Node = $cand; break }
}
if (-not $Node) { $Node = (Get-Command node -ErrorAction Stop).Source }
if (-not (Test-Path $Script)) { throw "build-loop script not found: $Script (run on the PRISM host)." }

$action = New-ScheduledTaskAction -Execute $Node `
  -Argument "`"$Script`"" `
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

# Each tick is a single queue recompute + 1 Ollama call (~seconds); 10 min ceiling.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
  -MultipleInstances IgnoreNew

if ($AsSystem) {
  $principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest -LogonType ServiceAccount
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
} else {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
}

Write-Host "[zbl-cron] registered '$TaskName'"
Write-Host "  fires    : $($start.ToString('yyyy-MM-dd HH:mm')) (local) then every $EveryMinutes min for 24h$(if ($AsSystem) {' [SYSTEM]'} else {' [current-user]'})"
Write-Host "  script   : $Script"
Write-Host "  pointer  : H:/prism/state/shared/zulu-build-loop-next.json"
Write-Host "  ledger   : H:/prism/state/shared/zulu-build-loop-log.jsonl"
Write-Host "  SAFE     : maintains the next-build pointer only; never builds/commits (gated builder owns that)."

if ($RunNow) {
  Write-Host "[zbl-cron] -RunNow: starting immediately..."
  Start-ScheduledTask -TaskName $TaskName
}
