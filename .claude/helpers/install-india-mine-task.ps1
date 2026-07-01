# install-india-mine-task.ps1
# U-MINE-INDIA-TASK -- register a Windows Scheduled Task that runs scripts/mine-india-transcripts.mjs
# unattended + REAPER-IMMUNE. Built because foreground/run_in_background passes kept getting reaped
# (exit 255) under heavy fleet load (documented host behavior) -- the miner is RESUMABLE (per-session
# skip-if-exists) so each run advances monotonically, and a SYSTEM-principal scheduled task's node
# child is spared by the fleet-reaper's ancestry check (it is not an orphan). Sister to
# install-ocr-training-loop-task.ps1 (cloned pattern). Runs WITHOUT Claude -- survives closing chats.
#
# USAGE (run from an ELEVATED PowerShell -- Register-ScheduledTask requires admin):
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-india-mine-task.ps1
#   -At "03:00"   start time (default 03:00; today if future else tomorrow)
#   -Daily        daily recurring to keep the india synthesis fresh as new sessions land (default one-shot)
#   -RunNow       also kick it immediately
#   -Uninstall    remove the task
#
# The first run completes all mineable transcripts (resumable) + the cross-session synthesis -> the
# Obsidian vault (knowledge/memories/reference/reference_india_transcript_synthesis.md). The vault
# shrink-guard prevents a smaller-coverage run from clobbering a larger one.

param(
  [string]$At = "03:00",
  [switch]$Daily,
  [switch]$RunNow,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$TaskName = "PRISM India Transcript Mine"
$Node     = "H:/Tools/nodejs/node.exe"
$Script   = "H:/prism/scripts/mine-india-transcripts.mjs"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[india-mine] uninstalled task '$TaskName'"
  } else { Write-Host "[india-mine] task '$TaskName' not present" }
  exit 0
}

if (-not (Test-Path $Node))   { throw "node not found: $Node" }
if (-not (Test-Path $Script)) { throw "miner not found: $Script" }

# Action: run the miner directly under node (no wrapper needed -- the miner is pure node + Ollama HTTP,
# no console allocation required, unlike the OCR loop's pdf-to-png step).
$action = New-ScheduledTaskAction -Execute $Node `
  -Argument "`"$Script`"" `
  -WorkingDirectory "H:/prism"

$now = Get-Date
$start = [datetime]::ParseExact($At, "HH:mm", $null)
$start = $now.Date.AddHours($start.Hour).AddMinutes($start.Minute)
if ($start -le $now) { $start = $start.AddDays(1) }
$trigger = if ($Daily) { New-ScheduledTaskTrigger -Daily -At $start } else { New-ScheduledTaskTrigger -Once -At $start }

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 6)
$principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -RunLevel Highest -LogonType ServiceAccount

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "[india-mine] registered '$TaskName'"
Write-Host "  fires at : $($start.ToString('yyyy-MM-dd HH:mm')) (local)$(if ($Daily) {' daily'} else {' one-shot'})"
Write-Host "  miner    : $Script (resumable -- re-run continues from existing per-session digests)"
Write-Host "  out      : H:/prism/state/shared/india-transcript-mining/{<id>,_COMBINED,_SYNTHESIS}.md"
Write-Host "  vault    : H:/prism/knowledge/memories/reference/reference_india_transcript_synthesis.md (shrink-guarded)"

if ($RunNow) {
  Write-Host "[india-mine] -RunNow: starting immediately..."
  Start-ScheduledTask -TaskName $TaskName
}
