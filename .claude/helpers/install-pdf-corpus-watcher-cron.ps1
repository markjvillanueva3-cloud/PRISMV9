# install-pdf-corpus-watcher-cron.ps1 -- U-VICTOR-C3
# Periodic sweep of resources/ + JM DIE/ for new/modified PDFs. Closes the
# "operator manually compiles new PDFs" gap noted in [[feedback_enumerate_before_read]].
#
# Cadence: every 15min (more than fast enough for human-scale PDF drops).
# Default: --dry-run (log-only). Operator flips to --extract via the
# downstream pdf-parse-extract.mjs invocation in EXTRACT mode.
#
# Knob: PRISM_PDF_WATCHER_DISABLE=1 quiets without uninstall.

param(
  [switch]$Uninstall,
  [switch]$RunNow,
  [switch]$ExtractMode,
  [string]$TaskName = "PRISM PDF Corpus Watcher",
  [string]$NodeBin = "H:/Tools/nodejs/node.exe",
  [string]$ProjectRoot = "H:/prism",
  [int]$IntervalMinutes = 15
)

$ErrorActionPreference = "Stop"

if ($Uninstall) {
  $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Unregistered: $TaskName"
  } else {
    Write-Host "Not installed: $TaskName"
  }
  exit 0
}

$extractFlag = if ($ExtractMode) { "--extract" } else { "" }
$action_cmd = @"
if (`$env:PRISM_PDF_WATCHER_DISABLE -eq '1') { exit 0 }
Set-Location -Path '$ProjectRoot'
& '$NodeBin' scripts/pdf-corpus-watcher-sweep.mjs $extractFlag
"@

# Durable runner dir (cron-runner-durability-fix; pdf-watcher brought into line
# 2026-06-11 slot:golf -- the other two crons got this on 2026-06-09 but this one
# was missed). $env:TEMP is reaped by Windows AND PRISM's own tmp-orphan janitor,
# which deleted this cron payload -> the task failed 0xFFFD0000 (script-not-found).
# Write into .claude/cron-runners/ (nothing reaps the repo tree) so the registered
# action path stays valid across reboots/cleanups. MUST re-run this installer
# (elevated) so the LIVE task picks up the new path.
$runnerDir = Join-Path $ProjectRoot ".claude/cron-runners"
if (-not (Test-Path $runnerDir)) { New-Item -ItemType Directory -Path $runnerDir -Force | Out-Null }
$tmp = Join-Path $runnerDir "prism-pdf-watcher-cron.ps1"
Set-Content -Path $tmp -Value $action_cmd -Encoding UTF8

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$tmp`""

# Every N minutes, starting at 00:11 (off all other crons)
$startBoundary = (Get-Date).Date.AddHours(0).AddMinutes(11)
$trigger = New-ScheduledTaskTrigger -Once -At $startBoundary `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 9125) # ~25 yr -- effectively forever

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "PDF corpus watcher sweep every $IntervalMinutes min (U-VICTOR-C3). Disable via PRISM_PDF_WATCHER_DISABLE=1." | Out-Null

Write-Host "Registered: $TaskName"
Write-Host "  Trigger: every $IntervalMinutes min (starting 00:11)"
Write-Host "  Action:  pdf-corpus-watcher-sweep.mjs $extractFlag"
Write-Host "  Disable knob: PRISM_PDF_WATCHER_DISABLE=1"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 2
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "  LastRunTime:    $($info.LastRunTime)"
  Write-Host "  LastTaskResult: $($info.LastTaskResult)"
}
