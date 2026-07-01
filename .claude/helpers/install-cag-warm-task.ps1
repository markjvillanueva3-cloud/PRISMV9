# install-cag-warm-task.ps1
# U-CAG-WARM-SWEEP -- register a Windows Scheduled Task that runs the Ollama-offloaded ($0)
# CAG/RAG galaxy WARMING sweep (scripts/cag-galaxy-warm-sweep.mjs --resume) unattended + REAPER-IMMUNE.
#
# WHY (slot:alpha 2026-06-16): the galaxy-reasoning-bridge CAG/RAG hybrid only pays off on a cache
# HIT, but a cold fleet caches nothing until a question repeats. This sweep pre-populates the per-galaxy
# CAG cache from each galaxy's Obsidian/CLAUDE.md/SOUL/MEMORY/wiki corpus via local Ollama, turning cold
# first-asks into warm reuse -- a measurable lift in the substrate hit-rate (PSN leg #10), at $0.
# It is the PRODUCER the CAG warm-rate metric (U-CAG-WARM-RATE-LEGACY-QUARANTINE) was built to measure.
#
# A chat-spawned `run_in_background` sweep gets orphan-reaped the moment the spawning chat /compacts or
# stops (the fleet-reaper kills long node children of a dead claude.exe). The sweep is RESUMABLE
# (per-galaxy cursor state/shared/cag-warm-cursor.jsonl), so each run advances monotonically, and a
# scheduled-task's node child is NOT a chat descendant -- its parent is Task Scheduler / svchost, so
# the reaper spares it. Runs WITHOUT Claude -- $0, survives closing chats.
#
# Clone-don't-fork of install-galaxy-mine-task.ps1 (R8/R11 -- same reaper-immune scheduled-task pattern).
#
# USAGE:
#   # Default principal = current interactive user (NO elevation; registers + runs while logged on).
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-cag-warm-task.ps1 -RunNow
#
#   -At "05:15"   start time (default 05:15 -- off-hours, phase-offset CLEAR of the 03:00 fleet
#                 galaxy-mine AND the 04:30 per-galaxy business-mine, so Ollama/GPU never contend).
#                 Today if future else tomorrow.
#   -Once         one-shot instead of the default daily warming cadence.
#   -RunNow       also kick it immediately.
#   -AsSystem     register under NT AUTHORITY\SYSTEM (runs logged-off; REQUIRES an elevated PowerShell).
#   -Uninstall    remove the task.
#
# The sweep warms every galaxy (resumable) + records CAG telemetry (recordCagStat) so cag-cache-stats
# computes a warm hit-rate that reflects the now-populated cache. ASCII-only (PS 5.1 codepage safe).

param(
  [string]$At = "05:15",
  [switch]$Once,
  [switch]$RunNow,
  [switch]$AsSystem,
  [switch]$Deep,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

# -Deep registers a SEPARATE task that warms the DEEP-reasoning cache (gpt-oss:120b) into its own
# cursor (cag-warm-cursor-deep.jsonl). Default time bumped to 06:30 so the 120b deep warm does not
# contend with the 05:15 default (qwen2.5-coder:32b) warm on the GPU. Distinct task name + cursor =
# the two crons coexist cleanly.
$ModeArg  = if ($Deep) { " --deep" } else { "" }
$TaskName = if ($Deep) { "PRISM CAG Galaxy Warm (deep)" } else { "PRISM CAG Galaxy Warm" }
if ($Deep -and $At -eq "05:15") { $At = "06:30" }
$Script   = "H:/prism/scripts/cag-galaxy-warm-sweep.mjs"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[cag-warm] uninstalled task '$TaskName'"
  } else {
    Write-Host "[cag-warm] no task '$TaskName' to uninstall"
  }
  return
}

$Node = $null
foreach ($cand in @("H:/Tools/nodejs/node.exe", "C:/Program Files/nodejs/node.exe")) {
  if (Test-Path $cand) { $Node = $cand; break }
}
if (-not $Node) { $Node = (Get-Command node -ErrorAction Stop).Source }
if (-not (Test-Path $Script)) { throw "warm sweep not found: $Script (run on the PRISM host)." }

# Action: the resumable warming sweep across all galaxies. --resume skips galaxies already warmed
# WITHIN THE 20h window (--max-age-hours 20): a same-day re-run / reaper-resume skips the just-warmed
# galaxies, but the NEXT daily run (24h later) sees them as stale and re-warms (catching galaxies whose
# doctrine docs changed) -- without the window the cron would no-op forever after the first full sweep.
# No --limit so each run advances as far as the time limit allows and the next resumes.
$action = New-ScheduledTaskAction -Execute $Node `
  -Argument "`"$Script`" --resume --max-age-hours 20$ModeArg" `
  -WorkingDirectory "H:/prism"

$now = Get-Date
$start = [datetime]::ParseExact($At, "HH:mm", $null)
$start = $now.Date.AddHours($start.Hour).AddMinutes($start.Minute)
if ($start -le $now) { $start = $start.AddDays(1) }
$daily = -not $Once
$trigger = if ($daily) { New-ScheduledTaskTrigger -Daily -At $start } else { New-ScheduledTaskTrigger -Once -At $start }

# ExecutionTimeLimit 2h: a full 34-galaxy x 3-query sweep (~102 Ollama calls) finishes well inside this;
# the cap stops a wedged Ollama run from lingering and -Daily / a manual re-run resumes via the cursor.
$LimitHours = if ($Deep) { 4 } else { 2 }  # deep (gpt-oss:120b) is slower than default (qwen:32b)
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours $LimitHours) `
  -MultipleInstances IgnoreNew

# Principal: default = current interactive user (omit -Principal => caller context, no elevation).
# -AsSystem = ServiceAccount SYSTEM (runs logged-off, needs an elevated PowerShell to register).
# Either way the node child's parent is Task Scheduler, NOT a claude.exe chat -> reaper-immune.
if ($AsSystem) {
  $principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest -LogonType ServiceAccount
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
} else {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
}

Write-Host "[cag-warm] registered '$TaskName'"
Write-Host "  fires at : $($start.ToString('yyyy-MM-dd HH:mm')) (local)$(if ($daily) {' daily'} else {' one-shot'})$(if ($AsSystem) {' [SYSTEM]'} else {' [current-user]'})"
Write-Host "  sweep    : $Script --resume (resumable -- re-run continues from the per-galaxy cursor)"
Write-Host "  cursor   : H:/prism/state/shared/cag-warm-cursor$(if ($Deep) { '-deep' } else { '' }).jsonl"
Write-Host "  telemetry: state/shared/cache/cag-cache-stats.json (warm hit-rate -- node scripts/cag-cache-stats.mjs)"

if ($RunNow) {
  Write-Host "[cag-warm] -RunNow: starting immediately..."
  Start-ScheduledTask -TaskName $TaskName
}
