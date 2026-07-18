param(
  [string]$TaskName = 'PRISM Source Monitor Sweep',
  [int]$EveryHours = 4,
  [int]$AtMinute = 7,
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-source-monitor-task.ps1 -- AUTO-LEARNING-LOOP-MS0 / U-ALL01 step-4
#
# Registers a Windows Scheduled Task that runs scripts/source-monitor-sweep.mjs
# every 4 hours at minute 7 (off-minute to avoid colliding with the every-2-min
# hook janitor and other PRISM cron tasks). The sweep polls 10 reputable AI/ML
# RSS / Atom feeds and appends per-source results to
# `state/shared/source-monitor-log.jsonl`.
#
# Per atomized spec (BACKEND-DEVTOOLS-RGS6-AUTO-LEARNING-LOOP-MS0-ATOMIZED-2026-05-10.md):
#   loop_schedule: 4h cron
#   verifies_via: integration tool `node scripts/source-monitor-sweep.mjs --once`
#   expected_signal: >=1 new item logged from each of 10 sources
#
# Permanent fix policy: this REGISTERS a task. Use -Uninstall to remove cleanly.
# Per `feedback_never_delete_only_disable.md` you can Disable-ScheduledTask
# to pause without removing.

$ErrorActionPreference = 'Stop'

$sweepScript = 'H:\PRISM\scripts\source-monitor-sweep.mjs'

# Prefer the portable node this PC uses; fall back to PATH then Program Files.
$nodeExe = $null
foreach ($cand in @('H:\Tools\nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) { $nodeExe = (Get-Command node -ErrorAction Stop).Source }

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Unregistered task: $TaskName"
  } else {
    Write-Host "Task not found (already uninstalled): $TaskName"
  }
  return
}

if (-not (Test-Path $sweepScript)) { throw "Sweep script not found: $sweepScript" }

# Sanity: confirm the script supports the --once flag (the U-ALL01-shipped version does).
$head = Get-Content $sweepScript -TotalCount 80 -ErrorAction SilentlyContinue
if (-not ($head -match '--once')) {
  throw "Refusing to install: $sweepScript does not look like the U-ALL01 sweep CLI (no --once flag). Update it first."
}

$action = New-ScheduledTaskAction -Execute $nodeExe -Argument "`"$sweepScript`" --once"

# First fire: today at AtMinute past the next hour boundary that's a multiple of EveryHours.
$now = Get-Date
$hour = [Math]::Ceiling($now.Hour / $EveryHours) * $EveryHours
if ($hour -ge 24) { $hour = 0; $now = $now.AddDays(1) }
$start = [DateTime]::new($now.Year, $now.Month, $now.Day, $hour, $AtMinute, 0)
if ($start -le $now) { $start = $start.AddHours($EveryHours) }

$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At $start `
  -RepetitionInterval (New-TimeSpan -Hours $EveryHours) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Polls 10 reputable AI/ML RSS/Atom feeds and appends results to state/shared/source-monitor-log.jsonl. AUTO-LEARNING-LOOP-MS0 U-ALL01 step-4. Cadence: every $EveryHours h at minute $AtMinute." `
  -Force | Out-Null

Write-Host "Registered: $TaskName (source-monitor-sweep.mjs --once, every $EveryHours h at minute $AtMinute, first fire $start, node=$nodeExe)"
Write-Host "Verify: schtasks /query /tn `"$TaskName`" /v /fo list"
Write-Host "Uninstall: powershell -File H:\PRISM\.claude\helpers\install-source-monitor-task.ps1 -Uninstall"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 2
  Write-Host "Started (running asynchronously); log: H:\PRISM\state\shared\source-monitor-log.jsonl"
}
