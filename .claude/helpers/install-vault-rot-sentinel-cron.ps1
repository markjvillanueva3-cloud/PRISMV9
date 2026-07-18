# install-vault-rot-sentinel-cron.ps1 — OBSIDIAN-VAULT-OPS / U-VAULT-MAINT-CRON
# Register a durable Windows Scheduled Task that runs the vault-rot sentinel
# (vault-rot-sentinel.mjs --write) daily. Closes the "rot-sentinel runs only by
# hand" gap from the 2026-06-08 vault audit (it detects stale/orphaned/rotting
# notes but its report was 2 days stale because nothing scheduled it).
#
# Pattern mirrors install-wiki-tribal-audit-task.ps1 (current-user S4U, knob-aware
# Action, idempotent unregister-before-register). Phase at 00:38 — off-peak,
# distinct from wiki-tribal audit (00:08), vault promotion (02:47), fleet-reaper.
#
# ── OPERATOR NOTE (HW/DRIVE MIGRATION FREEZE, 2026-06-08) ────────────────────────
# This installer REGISTERS the task but the operator decides WHEN to arm it. The
# fleet has 47 PRISM scheduled tasks deliberately DISABLED during a hardware/drive
# migration — DO NOT run this installer (or run it with -Disabled) until the
# operator confirms the migration is complete.
# ─────────────────────────────────────────────────────────────────────────────────
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-vault-rot-sentinel-cron.ps1 -Disabled
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-vault-rot-sentinel-cron.ps1 -RunNow
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-vault-rot-sentinel-cron.ps1 -Uninstall
#
# Knob (disable WITHOUT uninstalling): PRISM_VAULT_ROT_CRON_DISABLE=1

param(
  [switch]$Uninstall,
  [switch]$RunNow,
  [switch]$Disabled,
  [string]$TaskName = "PRISM Vault Rot Sentinel Cron",
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

# --write persists the rot report JSON. The cron fires regardless; the script
# self-exits early if the disable knob is set.
$action_cmd = @"
if (`$env:PRISM_VAULT_ROT_CRON_DISABLE -eq '1') { exit 0 }
Set-Location -Path '$ProjectRoot'
& '$NodeBin' scripts/vault-rot-sentinel.mjs --write
"@

$tmp = Join-Path $env:TEMP "prism-vault-rot-sentinel-cron.ps1"
Set-Content -Path $tmp -Value $action_cmd -Encoding UTF8

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$tmp`""

# Daily at 00:38:00 — off-peak, distinct from the sibling vault/wiki crons.
$trigger = New-ScheduledTaskTrigger -Daily -At "00:38:00"

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 20)

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
  -Description "Daily vault-rot sentinel (vault-rot-sentinel.mjs --write), U-VAULT-MAINT-CRON. Disable via PRISM_VAULT_ROT_CRON_DISABLE=1." | Out-Null

Write-Host "Registered: $TaskName"
Write-Host "  Trigger: Daily at 00:38:00"
Write-Host "  Action:  $NodeBin scripts/vault-rot-sentinel.mjs --write"
Write-Host "  Disable knob: PRISM_VAULT_ROT_CRON_DISABLE=1"

if ($Disabled) {
  Disable-ScheduledTask -TaskName $TaskName | Out-Null
  Write-Host "  State: DISABLED (migration-safe — operator runs 'Enable-ScheduledTask -TaskName ""$TaskName""' to arm)"
}

if ($RunNow) {
  if ($Disabled) {
    Write-Host "  (-RunNow ignored because -Disabled was set)"
  } else {
    Write-Host "Triggering first run now..."
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 2
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Host "  LastRunTime:   $($info.LastRunTime)"
    Write-Host "  LastTaskResult: $($info.LastTaskResult)"
  }
}
