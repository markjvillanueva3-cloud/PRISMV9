# install-galaxy-mine-task.ps1
# U-ALPHA-MINE-DURABLE -- register a Windows Scheduled Task that runs the GENERAL galaxy
# transcript miner (scripts/mine-galaxy-transcripts.mjs --galaxy <G>) unattended + REAPER-IMMUNE.
#
# WHY (slot:alpha 2026-06-11): a chat-spawned `run_in_background` mine of a galaxy's transcripts
# gets orphan-reaped the moment the spawning chat /compacts or stops -- the fleet-reaper's
# ancestry check kills any long node child of a dead claude.exe. The token-optimization mine
# died at ~8/96 this way. The miner is RESUMABLE (per-session skip-if-exists), so each run
# advances monotonically, and a scheduled-task's node child is NOT a chat descendant -- its
# parent is the Task Scheduler / svchost, so the reaper spares it. Runs WITHOUT Claude --
# survives closing chats.
#
# This is the GENERAL form of install-india-mine-task.ps1 (clone-don't-fork, R15
# APPLY-TO-ALL-GALAXIES): one installer serves EVERY galaxy via -Galaxy, instead of 34 copies.
# The miner script is already registry-driven (scripts/lib/galaxy-mining-registry.mjs); this
# closes the missing durable-scheduler piece for all of them.
#
# USAGE:
#   # Default principal = current interactive user (NO elevation needed -- registers + runs while
#   # logged on, which on this single-user box is always). Reaper-immune regardless of principal.
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-galaxy-mine-task.ps1 -Galaxy token-optimization -RunNow
#
#   -Galaxy <name>   REQUIRED. Galaxy key as known to the mining registry (e.g. token-optimization, mill, cad).
#   -At "03:00"      start time (default 03:00; today if future else tomorrow). Ignored when -RunNow alone is wanted.
#   -Daily           daily recurrence so the synthesis stays fresh as new sessions land (default one-shot).
#   -RunNow          also kick it immediately.
#   -AsSystem        register under NT AUTHORITY\SYSTEM (runs logged-off; REQUIRES an elevated PowerShell).
#   -Uninstall       remove the task.
#
# The miner completes all mineable transcripts (resumable) + the cross-session synthesis ->
# state/shared/galaxy-transcript-mining/<G>/_SYNTHESIS.md and the Obsidian vault feed
# knowledge/memories/reference/reference_<G>_transcript_synthesis.md (shrink-guarded). ASCII-only
# (PS 5.1 codepage safe).

param(
  [Parameter(Mandatory = $true)]
  [string]$Galaxy,
  [string]$At = "03:00",
  [switch]$Daily,
  [switch]$RunNow,
  [switch]$AsSystem,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Galaxy)) { throw "-Galaxy is required (e.g. -Galaxy token-optimization)" }

$TaskName = "PRISM Galaxy Mine ($Galaxy)"
$Script   = "H:/prism/scripts/mine-galaxy-transcripts.mjs"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[galaxy-mine] uninstalled task '$TaskName'"
  } else { Write-Host "[galaxy-mine] task '$TaskName' not present" }
  exit 0
}

$Node = $null
foreach ($cand in @("H:/Tools/nodejs/node.exe", "C:/Program Files/nodejs/node.exe")) {
  if (Test-Path $cand) { $Node = $cand; break }
}
if (-not $Node) { $Node = (Get-Command node -ErrorAction Stop).Source }
if (-not (Test-Path $Script)) { throw "miner not found: $Script (run on the PRISM host)." }

# Action: the general miner pinned to ONE galaxy. No --limit: the miner is resumable, so each run
# advances as far as the time limit allows and the next run skips already-mined sessions and
# continues. --galaxy is the registry key.
$action = New-ScheduledTaskAction -Execute $Node `
  -Argument "`"$Script`" --galaxy $Galaxy" `
  -WorkingDirectory "H:/prism"

$now = Get-Date
$start = [datetime]::ParseExact($At, "HH:mm", $null)
$start = $now.Date.AddHours($start.Hour).AddMinutes($start.Minute)
if ($start -le $now) { $start = $start.AddDays(1) }
$trigger = if ($Daily) { New-ScheduledTaskTrigger -Daily -At $start } else { New-ScheduledTaskTrigger -Once -At $start }

# ExecutionTimeLimit 6h: a big galaxy (200+ sessions x gpt-oss:120b synthesis) may not finish in
# one window; the cap stops a wedged run from lingering and -Daily / a manual re-run resumes.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 6) `
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

Write-Host "[galaxy-mine] registered '$TaskName'"
Write-Host "  galaxy   : $Galaxy"
Write-Host "  fires at : $($start.ToString('yyyy-MM-dd HH:mm')) (local)$(if ($Daily) {' daily'} else {' one-shot'})$(if ($AsSystem) {' [SYSTEM]'} else {' [current-user]'})"
Write-Host "  miner    : $Script --galaxy $Galaxy (resumable -- re-run continues from existing per-session digests)"
Write-Host "  out      : H:/prism/state/shared/galaxy-transcript-mining/$Galaxy/{<id>,_SYNTHESIS}.md"
Write-Host "  vault    : H:/prism/knowledge/memories/reference/reference_${Galaxy}_transcript_synthesis.md (shrink-guarded)"

if ($RunNow) {
  Write-Host "[galaxy-mine] -RunNow: starting immediately..."
  Start-ScheduledTask -TaskName $TaskName
}
