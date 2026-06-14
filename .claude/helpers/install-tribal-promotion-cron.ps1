# install-tribal-promotion-cron.ps1 — U-VICTOR-C1
# Nightly: auto-promote tribal tips at conf >= 0.9 to wiki canonical.
# 628 candidates already above floor as of 2026-05-27 — proves the threshold
# works. This cron just makes promotion happen without an operator invoking.
#
# Phase: 03:17:00 (off the audit cron at 00:08, off fleet-reaper +210s).
#
# Knob: PRISM_TRIBAL_PROMOTION_CRON_DISABLE=1 quiets without uninstall.

param(
  [switch]$Uninstall,
  [switch]$RunNow,
  [string]$TaskName = "PRISM Tribal Promotion Cron",
  [string]$NodeBin = "H:/Tools/nodejs/node.exe",
  [string]$ProjectRoot = "H:/prism",
  [double]$ConfThreshold = 0.9
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
if (`$env:PRISM_TRIBAL_PROMOTION_CRON_DISABLE -eq '1') { exit 0 }
Set-Location -Path '$ProjectRoot'
& '$NodeBin' scripts/promote-tribal-to-wiki.mjs --apply --threshold $ConfThreshold
"@

$tmp = Join-Path $env:TEMP "prism-tribal-promotion-cron.ps1"
Set-Content -Path $tmp -Value $action_cmd -Encoding UTF8

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$tmp`""
$trigger = New-ScheduledTaskTrigger -Daily -At "03:17:00"
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 20)

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false }

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Auto-promote tribal tips at conf>=$ConfThreshold to wiki canonical (U-VICTOR-C1)." | Out-Null

Write-Host "Registered: $TaskName"
Write-Host "  Trigger: Daily at 03:17:00"
Write-Host "  Action:  promote-tribal-to-wiki.mjs --apply --threshold $ConfThreshold"
Write-Host "  Disable knob: PRISM_TRIBAL_PROMOTION_CRON_DISABLE=1"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 2
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "  LastRunTime:    $($info.LastRunTime)"
  Write-Host "  LastTaskResult: $($info.LastTaskResult)"
}
