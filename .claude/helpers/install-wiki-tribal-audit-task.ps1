# install-wiki-tribal-audit-task.ps1 — U-VICTOR-A3
# Register a durable Windows Scheduled Task that regenerates the wiki<->tribal
# audit + per-domain breakdown every 24h. Closes the audit-staleness gap (was
# 5 days stale when victor opened the audit 2026-05-27).
#
# Pattern mirrors install-fleet-reaper-task.ps1 (fleet-reaper +210s phase).
# Phase chosen at +480s to avoid contention with the 5-min fleet-reaper sweep.
#
# Usage (admin or self-install):
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-wiki-tribal-audit-task.ps1 -RunNow
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-wiki-tribal-audit-task.ps1 -Uninstall
#
# Knob (disable WITHOUT uninstalling): PRISM_WIKI_TRIBAL_AUDIT_CRON_DISABLE=1
#   (env-var checked at the start of the Action script — task fires but exits early)

param(
  [switch]$Uninstall,
  [switch]$RunNow,
  [string]$TaskName = "PRISM Wiki-Tribal Audit Regen",
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

# Knob-aware Action script. The cron fires regardless; the script self-exits
# early if the disable knob is set, so an operator can quiet the cron without
# de-registering it.
$action_cmd = @"
if (`$env:PRISM_WIKI_TRIBAL_AUDIT_CRON_DISABLE -eq '1') { exit 0 }
Set-Location -Path '$ProjectRoot'
& '$NodeBin' scripts/wiki-tribal-cross-ref-audit.mjs
& '$NodeBin' scripts/audit-tribal-coverage-by-domain.mjs
"@

$tmp = Join-Path $env:TEMP "prism-wiki-tribal-audit-cron.ps1"
Set-Content -Path $tmp -Value $action_cmd -Encoding UTF8

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$tmp`""

# 24h cadence. Phase +480s past midnight to avoid fleet-reaper contention
# (fleet-reaper phase is +210s). Daily trigger at 00:08:00.
$trigger = New-ScheduledTaskTrigger -Daily -At "00:08:00"

# Run as current user; no elevated privileges needed (script writes only into
# PRISM_ROOT state/shared/).
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description "Regenerates state/shared/.wiki-tribal-cross-ref-audit.json + .wiki-tribal-coverage-by-domain.json daily (U-VICTOR-A3). Disable via PRISM_WIKI_TRIBAL_AUDIT_CRON_DISABLE=1." | Out-Null

Write-Host "Registered: $TaskName"
Write-Host "  Trigger: Daily at 00:08:00"
Write-Host "  Action:  $NodeBin scripts/wiki-tribal-cross-ref-audit.mjs && audit-tribal-coverage-by-domain.mjs"
Write-Host "  Disable knob: PRISM_WIKI_TRIBAL_AUDIT_CRON_DISABLE=1"

if ($RunNow) {
  Write-Host "Triggering first run now..."
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 2
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "  LastRunTime:   $($info.LastRunTime)"
  Write-Host "  LastTaskResult: $($info.LastTaskResult)"
}
