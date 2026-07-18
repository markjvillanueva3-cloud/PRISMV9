# install-hermes-enrichment-task.ps1
# U-HERMES-ENRICHMENT-LOOP -- register a Windows Scheduled Task that runs the per-domain parallel-Hermes
# knowledge-enrichment loop (scripts/hermes-domain-enrichment-loop.mjs) unattended + REAPER-IMMUNE.
#
# WHY (slot:zulu 2026-06-29, operator directive): "run loops for each domain with a parallel hermes
# agent until we physically exhaust all knowledge... utilize engineered loops, harnesses and crons.
# it has to be usable when needed and pulled automatically." Each run fires ONE diverging Hermes pass
# per domain (delta/echo/foxtrot/mike/whiskey/kilo), dedups vs the per-domain ledger, and novelty-stops
# (a domain marked EXHAUSTED after DRY_STREAK_MAX dry runs -> future runs skip it = self-limiting).
# Re-emits the auto-pullable staging tips file every run (golf/india embed via the shard-safe writer;
# this NEVER writes the live tribal index). Cron-generated items are UNREVIEWED -> specialist confirms
# before any gate fires.
#
# A chat-spawned run gets orphan-reaped on /compact; a scheduled-task node child's parent is Task
# Scheduler (not claude.exe) -> reaper-immune. The loop is RESUMABLE (per-domain ledger cursor) so each
# run advances monotonically. Runs WITHOUT Claude. Uses the LOCAL grok proxy (:8645) by default; set
# PRISM_HERMES_ENRICH_PROXY_URL + _MODEL + NVIDIA_API_KEY to use the NVIDIA cloud lane instead.
#
# Clone-don't-fork of install-cag-warm-task.ps1 (R8/R11 -- same reaper-immune scheduled-task pattern).
#
# USAGE:
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-hermes-enrichment-task.ps1 -RunNow
#   -At "06:45"      start time (default 06:45 -- off-hours, phase-clear of 03:00 galaxy-mine / 04:30
#                    business-mine / 05:15 cag-warm so the Hermes lane + GPU never contend). Today if future else tomorrow.
#   -EveryHours N    add an intraday repetition every N hours (default: none -> once-daily). Faster
#                    accumulation toward exhaustion; the novelty-stop makes post-exhaustion runs cheap no-ops.
#   -Once            one-shot instead of the daily cadence.
#   -RunNow          also kick it immediately.
#   -AsSystem        register under NT AUTHORITY\SYSTEM (runs logged-off; REQUIRES an elevated PowerShell).
#   -Uninstall       remove the task.
#
# ASCII-only (PS 5.1 codepage safe).

param(
  [string]$At = "06:45",
  [int]$EveryHours = 0,
  [switch]$Once,
  [switch]$RunNow,
  [switch]$AsSystem,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$TaskName = "PRISM Hermes Domain Enrichment"
$Script   = "H:/prism/scripts/hermes-domain-enrichment-loop.mjs"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[hermes-enrich] uninstalled task '$TaskName'"
  } else {
    Write-Host "[hermes-enrich] no task '$TaskName' to uninstall"
  }
  return
}

$Node = $null
foreach ($cand in @("H:/Tools/nodejs/node.exe", "C:/Program Files/nodejs/node.exe")) {
  if (Test-Path $cand) { $Node = $cand; break }
}
if (-not $Node) { $Node = (Get-Command node -ErrorAction Stop).Source }
if (-not (Test-Path $Script)) { throw "enrichment loop not found: $Script (run on the PRISM host)." }

# Action: one parallel pass over all non-exhausted domains + re-emit staging. No args = full run.
$action = New-ScheduledTaskAction -Execute $Node -Argument "`"$Script`"" -WorkingDirectory "H:/prism"

$now = Get-Date
$start = [datetime]::ParseExact($At, "HH:mm", $null)
$start = $now.Date.AddHours($start.Hour).AddMinutes($start.Minute)
if ($start -le $now) { $start = $start.AddDays(1) }
$daily = -not $Once

if ($daily) {
  if ($EveryHours -gt 0) {
    $trigger = New-ScheduledTaskTrigger -Daily -At $start
    $trigger.Repetition = (New-ScheduledTaskTrigger -Once -At $start `
      -RepetitionInterval (New-TimeSpan -Hours $EveryHours) `
      -RepetitionDuration (New-TimeSpan -Hours 23)).Repetition
  } else {
    $trigger = New-ScheduledTaskTrigger -Daily -At $start
  }
} else {
  $trigger = New-ScheduledTaskTrigger -Once -At $start
}

# ExecutionTimeLimit 1h: 6 parallel Hermes calls finish in a couple minutes; the cap stops a wedged
# lane from lingering and the next run resumes via the per-domain ledger cursor.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
  -MultipleInstances IgnoreNew

if ($AsSystem) {
  $principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest -LogonType ServiceAccount
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
} else {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
}

Write-Host "[hermes-enrich] registered '$TaskName'"
Write-Host "  fires at : $($start.ToString('yyyy-MM-dd HH:mm')) (local)$(if ($daily) {' daily'} else {' one-shot'})$(if ($EveryHours -gt 0) {" + every ${EveryHours}h"} else {''})$(if ($AsSystem) {' [SYSTEM]'} else {' [current-user]'})"
Write-Host "  loop     : $Script (resumable per-domain ledger; novelty-stops when exhausted)"
Write-Host "  ledgers  : H:/prism/state/shared/hermes-enrichment/<domain>.json"
Write-Host "  staging  : state/shared/staging/hermes-enrichment-loop-tips.json (golf/india embed; specialist verifies)"
Write-Host "  status   : node scripts/hermes-domain-enrichment-loop.mjs --status"

if ($RunNow) {
  Write-Host "[hermes-enrich] -RunNow: starting immediately..."
  Start-ScheduledTask -TaskName $TaskName
}
