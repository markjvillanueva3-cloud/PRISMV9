# install-hermes-graph-improvement-task.ps1
# U-ALPHA-HERMES-GRAPH-IMPROVE -- register a Windows Scheduled Task that runs the
# parallel opus-fast-max graph-improvement DRIVER (scripts/hermes-graph-improvement-driver.mts
# --apply) unattended + REAPER-IMMUNE. This is the "automatically invoked" leg of the loop.
#
# WHY (slot:alpha 2026-06-25): the operator wants parallel opus-fast-max hermes agents driven
# by an engineered loop + cron to continuously improve the system-viz graphs alpha developed.
# Each tick READS the live leverage wiring queue (every unwired engine = a missing
# engine->dispatcher edge in the graph), PLANS the highest-leverage opus fan-out (budget-bounded),
# and RECORDS it to state/shared/hermes-graph-improvement-ledger.jsonl -- the PSN feed-up a live
# chat / Workflow then consumes to fire the parallel batch. (A headless cron cannot spawn Claude
# opus sessions; it PRODUCES + PERSISTS the prioritized plan -- R12. Execution is consumer-gated.)
#
# The driver is pure planning + file I/O (NO LLM / GPU calls), so it is cheap and never contends
# with the Ollama/GPU crons. Runs WITHOUT Claude -- $0, survives closing chats.
#
# A chat-spawned background run gets orphan-reaped the moment the spawning chat /compacts. A
# scheduled-task's node child's parent is Task Scheduler, NOT a claude.exe chat -> reaper-immune.
#
# Clone-don't-fork of install-cag-warm-task.ps1 (R8/R11 -- same reaper-immune scheduled-task pattern).
# Runs the .mts driver via the tsx CLI (bare node hits the Node-24 dynamic-import trap on the .ts
# engine imports -- reference_charlie_train_cycle_tsx_reexec_2026_06_22).
#
# USAGE:
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-hermes-graph-improvement-task.ps1 -RunNow
#
#   -At "05:47"     first start time (default 05:47 -- off-minute, off-hours). Today if future else tomorrow.
#   -EveryHours N   intra-day repetition interval (default 6 -> 4x/day). 0 = fire once daily only.
#   -Budget N       per-tick token budget passed to --budget (default 1500000).
#   -Count N        desired parallel agents passed to --count (default 12, budget-bounded down).
#   -RunNow         also kick it immediately.
#   -AsSystem       register under NT AUTHORITY\SYSTEM (runs logged-off; REQUIRES an elevated PowerShell).
#   -Uninstall      remove the task.
#
# Kill switch (no uninstall needed): set env PRISM_HERMES_GRAPH_IMPROVE_DISABLE=1 -- the driver
# exits 0 with skipped:true, so the task stays green while paused. ASCII-only (PS 5.1 codepage safe).

param(
  [string]$At = "05:47",
  [int]$EveryHours = 6,
  [long]$Budget = 1500000,
  [int]$Count = 12,
  [switch]$RunNow,
  [switch]$AsSystem,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

$TaskName = "PRISM Hermes Graph Improvement"
$Script   = "H:/prism/scripts/hermes-graph-improvement-driver.mts"
$TsxCli   = "H:/prism/mcp-server/node_modules/tsx/dist/cli.mjs"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[graph-improve] uninstalled task '$TaskName'"
  } else {
    Write-Host "[graph-improve] no task '$TaskName' to uninstall"
  }
  return
}

$Node = $null
foreach ($cand in @("H:/Tools/nodejs/node.exe", "C:/Program Files/nodejs/node.exe")) {
  if (Test-Path $cand) { $Node = $cand; break }
}
if (-not $Node) { $Node = (Get-Command node -ErrorAction Stop).Source }
if (-not (Test-Path $Script)) { throw "graph-improve driver not found: $Script (run on the PRISM host)." }
if (-not (Test-Path $TsxCli)) { throw "tsx CLI not found: $TsxCli (run 'npm install' in mcp-server)." }

# Action: node runs the tsx CLI -> the .mts driver with --refresh (regenerate the leverage queue
# from the fresh arch-graph FIRST, so the loop targets CURRENT gaps, not a stale snapshot -- a stale
# queue once showed 118 unwired vs 4 after a fresh regen) then --apply (records the plan to the ledger).
$action = New-ScheduledTaskAction -Execute $Node `
  -Argument "`"$TsxCli`" `"$Script`" --refresh --apply --budget $Budget --count $Count" `
  -WorkingDirectory "H:/prism"

$now = Get-Date
$start = [datetime]::ParseExact($At, "HH:mm", $null)
$start = $now.Date.AddHours($start.Hour).AddMinutes($start.Minute)
if ($start -le $now) { $start = $start.AddDays(1) }

# Daily trigger re-arms each day; an optional intra-day repetition keeps the plan fresh as engines
# get wired through the day. Borrow the Repetition object from a temp Once trigger (the standard idiom).
$trigger = New-ScheduledTaskTrigger -Daily -At $start
if ($EveryHours -gt 0) {
  $rep = (New-ScheduledTaskTrigger -Once -At $start `
    -RepetitionInterval (New-TimeSpan -Hours $EveryHours) `
    -RepetitionDuration (New-TimeSpan -Hours 24)).Repetition
  $trigger.Repetition = $rep
}

# ExecutionTimeLimit 15m: the driver is pure planning + small file I/O (no LLM); finishes in seconds.
# The cap stops any wedge; the next fire / -Daily re-arm recovers (the ledger just appends).
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15) `
  -MultipleInstances IgnoreNew

if ($AsSystem) {
  $principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest -LogonType ServiceAccount
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
} else {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
}

Write-Host "[graph-improve] registered '$TaskName'"
Write-Host "  fires at : $($start.ToString('yyyy-MM-dd HH:mm')) (local) daily$(if ($EveryHours -gt 0) {" + every ${EveryHours}h"})$(if ($AsSystem) {' [SYSTEM]'} else {' [current-user]'})"
Write-Host "  action   : node tsx $Script --refresh --apply --budget $Budget --count $Count"
Write-Host "  ledger   : H:/prism/state/shared/hermes-graph-improvement-ledger.jsonl (the PSN feed-up plan)"
Write-Host "  pause    : set env PRISM_HERMES_GRAPH_IMPROVE_DISABLE=1 (task stays green, driver skips)"
Write-Host "  uninstall: -Uninstall"

if ($RunNow) {
  Write-Host "[graph-improve] -RunNow: starting immediately..."
  Start-ScheduledTask -TaskName $TaskName
}
