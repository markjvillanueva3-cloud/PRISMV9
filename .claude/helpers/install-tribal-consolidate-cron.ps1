# install-tribal-consolidate-cron.ps1 -- U-VICTOR-C2
# Weekly: consolidate tribal tips (dedup, merge, prune stale).
# Pairs with U-VICTOR-C4 (stale auto-prune extension to consolidate-weekly).
#
# Phase: Sunday 04:23:00 (light fleet activity window; off all daily crons).
#
# Knob: PRISM_TRIBAL_CONSOLIDATE_CRON_DISABLE=1 quiets without uninstall.

param(
  [switch]$Uninstall,
  [switch]$RunNow,
  [string]$TaskName = "PRISM Tribal Consolidate Weekly",
  [string]$NodeBin = "H:/Tools/nodejs/node.exe",
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

$action_cmd = @"
if (`$env:PRISM_TRIBAL_CONSOLIDATE_CRON_DISABLE -eq '1') { exit 0 }
Set-Location -Path '$ProjectRoot'
& '$NodeBin' scripts/tribal-consolidate-weekly.mjs
& '$NodeBin' scripts/prune-stale-tribal-entries.mjs
"@

$tmp = Join-Path $env:TEMP "prism-tribal-consolidate-cron.ps1"
Set-Content -Path $tmp -Value $action_cmd -Encoding UTF8

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$tmp`""
# Weekly Sunday 04:23 -- DaysOfWeek param available on Win10+
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "04:23:00"
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 60)

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Weekly tribal consolidate + stale-prune (U-VICTOR-C2/C4)." | Out-Null

Write-Host "Registered: $TaskName"
Write-Host "  Trigger: Weekly Sunday at 04:23:00"
Write-Host "  Action:  tribal-consolidate-weekly.mjs + prune-stale-tribal-entries.mjs"
Write-Host "  Disable knob: PRISM_TRIBAL_CONSOLIDATE_CRON_DISABLE=1"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 2
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "  LastRunTime:    $($info.LastRunTime)"
  Write-Host "  LastTaskResult: $($info.LastTaskResult)"
}
