# install-cad-decipher-hermes-task.ps1
# U-DELTA-CAD-DECIPHER-HERMES -- register a Windows Scheduled Task that runs the parallel-Hermes CAD
# part-decipher residual pass (scripts/cad-part-decipher-hermes.mjs) unattended + REAPER-IMMUNE.
#
# WHY (slot:delta 2026-07-01, operator directive): "utilize parallel hermes agents, engineered loops,
# harnesses and crons for closed loop training... decipher the print... adding material for finishing
# operations, adding features for clamping or work holding." The deterministic classifier
# (cad-part-decipher.mjs) deciphers ~93% of the kernel-validated corpus for $0; the residual it marks
# needsReasoning is deciphered here by a parallel-Hermes pass. The pass is SLOW (NVIDIA lane latency +
# concurrency-2 + 429 backoff) so it exceeds a foreground budget -> exactly the cron use case, and it is
# RESUMABLE (dedups vs part-decipher-hermes.jsonl) so each run advances monotonically toward full coverage.
#
# A chat-spawned run gets orphan-reaped on /compact; a scheduled-task node child's parent is Task
# Scheduler (not claude.exe) -> reaper-immune. Runs WITHOUT Claude. Uses the shared NVIDIA lane
# (PRISM_HERMES_PROXY_URL + NVIDIA_API_KEY, already set for the fleet); override the model with
# PRISM_CAD_HERMES_MODEL (default meta/llama-3.3-70b-instruct -- the served fallback; the grok default 404s).
#
# Clone-don't-fork of install-hermes-enrichment-task.ps1 (R8/R11 -- same reaper-immune scheduled-task pattern).
#
# USAGE:
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-cad-decipher-hermes-task.ps1 -RunNow
#   -At "07:15"      start time (default 07:15 -- off-hours, phase-clear of 06:45 hermes-enrichment so the
#                    NVIDIA lane never contends). Today if future else tomorrow.
#   -EveryHours N    add an intraday repetition every N hours (default: none -> once-daily). Faster
#                    convergence; once every residual part is deciphered the run is a cheap resumable no-op.
#   -Once            one-shot instead of the daily cadence.
#   -RunNow          also kick it immediately.
#   -AsSystem        register under NT AUTHORITY\SYSTEM (runs logged-off; REQUIRES an elevated PowerShell).
#   -Uninstall       remove the task.
#
# ASCII-only (PS 5.1 codepage safe).

param(
  [string]$At = "07:15",
  [int]$EveryHours = 0,
  [switch]$Once,
  [switch]$RunNow,
  [switch]$AsSystem,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$TaskName = "PRISM CAD Decipher Hermes"
$Script   = "H:/prism/scripts/cad-part-decipher-hermes.mjs"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[cad-decipher] uninstalled task '$TaskName'"
  } else {
    Write-Host "[cad-decipher] no task '$TaskName' to uninstall"
  }
  return
}

$Node = $null
foreach ($cand in @("H:/Tools/nodejs/node.exe", "C:/Program Files/nodejs/node.exe")) {
  if (Test-Path $cand) { $Node = $cand; break }
}
if (-not $Node) { $Node = (Get-Command node -ErrorAction Stop).Source }
if (-not (Test-Path $Script)) { throw "decipher-hermes harness not found: $Script (run on the PRISM host)." }

# Action: one resumable parallel-Hermes pass over the residual (--resume advances the ledger monotonically).
$argLine = "`"$Script`" --in state/shared/cad-fusion-live/part-decipher.jsonl --out --resume"
$action = New-ScheduledTaskAction -Execute $Node -Argument $argLine -WorkingDirectory "H:/prism"

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

# ExecutionTimeLimit 1h: a full residual pass finishes well under an hour; the cap stops a wedged lane
# from lingering and the next run resumes via the part-decipher-hermes.jsonl dedup cursor.
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

Write-Host "[cad-decipher] registered '$TaskName'"
Write-Host "  fires at : $($start.ToString('yyyy-MM-dd HH:mm')) (local)$(if ($daily) {' daily'} else {' one-shot'})$(if ($EveryHours -gt 0) {" + every ${EveryHours}h"} else {''})$(if ($AsSystem) {' [SYSTEM]'} else {' [current-user]'})"
Write-Host "  harness  : $Script --resume (resumable; dedups vs part-decipher-hermes.jsonl)"
Write-Host "  input    : state/shared/cad-fusion-live/part-decipher.jsonl (needsReasoning residual)"
Write-Host "  output   : state/shared/cad-fusion-live/part-decipher-hermes.jsonl (advisory decipher; kernel/human overrides)"
Write-Host "  refresh  : node scripts/cad-part-decipher.mjs --out   (regenerate the deterministic pass first if the kernel ledger grew)"

if ($RunNow) {
  Write-Host "[cad-decipher] -RunNow: starting immediately..."
  Start-ScheduledTask -TaskName $TaskName
}
