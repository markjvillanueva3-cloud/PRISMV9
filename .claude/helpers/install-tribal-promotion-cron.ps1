# install-tribal-promotion-cron.ps1 -- U-VICTOR-C1 (+ U-YT-PROMOTE-INSTALLER-SSOT 2026-06-25)
# Nightly: run the COMMITTED tribal-promotion runner (youtube->tribal, then tribal->wiki @conf>=90).
# The runner (.claude/cron-runners/prism-tribal-promotion-cron.ps1) is the SINGLE SOURCE OF TRUTH:
# this installer only registers/points the scheduled task at it -- it no longer generates a %TEMP% copy.
#   - Was: generated a %TEMP% action script -> two failure modes: (a) divergence (the generated copy
#     could drift from the committed runner -- e.g. the old 0.9 threshold + missing youtube step), and
#     (b) the %TEMP%-action-script 0xFFFD0000 cron-failure mode (reference_cron_temp_path_failure_2026_06_11).
#   - Now: registers `-File <committed runner>` directly. To change behavior/threshold, edit the runner.
#
# Phase: 03:17:00 (off the audit cron at 00:08, off fleet-reaper +210s).
# Knob: PRISM_TRIBAL_PROMOTION_CRON_DISABLE=1 quiets without uninstall (honored inside the runner).

param(
  [switch]$Uninstall,
  [switch]$RunNow,
  [string]$TaskName = "PRISM Tribal Promotion Cron",
  [string]$ProjectRoot = "H:/prism"
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

# Single source of truth: register the COMMITTED runner directly (NOT a generated %TEMP% copy).
# The committed runner carries both promotion steps + the disable-env guard + the threshold.
$runner = Join-Path $ProjectRoot ".claude/cron-runners/prism-tribal-promotion-cron.ps1"
if (-not (Test-Path $runner)) { throw "committed runner not found: $runner (cannot register the task without it)" }

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""
$trigger = New-ScheduledTaskTrigger -Daily -At "03:17:00"
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 20)

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Promote staged YouTube tips -> tribal store, then high-conf tribal -> wiki. Runs the committed .claude/cron-runners/prism-tribal-promotion-cron.ps1 (U-VICTOR-C1 + U-YT-PROMOTE)." | Out-Null

Write-Host "Registered: $TaskName"
Write-Host "  Trigger: Daily at 03:17:00"
Write-Host "  Action:  -File $runner (youtube->tribal + tribal->wiki @conf>=90)"
Write-Host "  Disable knob: PRISM_TRIBAL_PROMOTION_CRON_DISABLE=1"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 2
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "  LastRunTime:    $($info.LastRunTime)"
  Write-Host "  LastTaskResult: $($info.LastTaskResult)"
}
