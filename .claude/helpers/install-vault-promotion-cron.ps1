# install-vault-promotion-cron.ps1 -- OBSIDIAN-VAULT-OPS / U-VAULT-MAINT-CRON
# Register a durable Windows Scheduled Task that runs the Memory->Wiki promotion
# (promote-memory-to-wiki.mjs) nightly. Closes the "promotion runs only by hand"
# gap from the 2026-06-08 vault audit (the engine + script work but were never
# scheduled, so durable memories never auto-graduated to the wiki).
#
# Pattern mirrors install-wiki-tribal-audit-task.ps1 (current-user S4U, knob-aware
# Action, idempotent unregister-before-register). Phase chosen at 02:47 -- off-peak,
# distinct from the wiki-tribal audit (00:08) and fleet-reaper (+210s) so the three
# do not contend for the H:/prism git/state surface.
#
# -- OPERATOR NOTE (HW/DRIVE MIGRATION FREEZE, 2026-06-08) ------------------------
# This installer REGISTERS the task but the operator decides WHEN to arm it. As of
# 2026-06-08 the fleet has 47 PRISM scheduled tasks deliberately DISABLED during a
# hardware/drive migration -- DO NOT run this installer (or run it with -Disabled)
# until the operator confirms the migration is complete. Registering with -Disabled
# creates the task in a Disabled state (belt-and-suspenders) so it cannot fire.
# ---------------------------------------------------------------------------------
#
# Usage:
#   # Ship-only (default during migration): register DISABLED so it never fires
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-vault-promotion-cron.ps1 -Disabled
#   # Post-migration: arm it
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-vault-promotion-cron.ps1 -RunNow
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-vault-promotion-cron.ps1 -Uninstall
#
# Knob (disable WITHOUT uninstalling): PRISM_VAULT_PROMOTION_CRON_DISABLE=1
#   (checked at the start of the Action script -- the task fires but exits early)

param(
  [switch]$Uninstall,
  [switch]$RunNow,
  [switch]$Disabled,
  [string]$TaskName = "PRISM Vault Memory Promotion Cron",
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

# Knob-aware Action script. --apply --backlink promotes earned memories into the
# wiki and adds the memory->wiki backlink pointer. The cron fires regardless; the
# script self-exits early if the disable knob is set.
$action_cmd = @"
if (`$env:PRISM_VAULT_PROMOTION_CRON_DISABLE -eq '1') { exit 0 }
Set-Location -Path '$ProjectRoot'
& '$NodeBin' scripts/promote-memory-to-wiki.mjs --apply --backlink
"@

$tmp = Join-Path $env:TEMP "prism-vault-promotion-cron.ps1"
Set-Content -Path $tmp -Value $action_cmd -Encoding UTF8

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$tmp`""

# Nightly at 02:47:00 -- off-peak, distinct from wiki-tribal audit (00:08) +
# vault-rot sentinel (00:38) + fleet-reaper (+210s).
$trigger = New-ScheduledTaskTrigger -Daily -At "02:47:00"

# Current user; no elevation needed (writes only into PRISM_ROOT knowledge/).
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
  -Description "Nightly Memory->Wiki promotion (promote-memory-to-wiki.mjs --apply --backlink), U-VAULT-MAINT-CRON. Disable via PRISM_VAULT_PROMOTION_CRON_DISABLE=1." | Out-Null

Write-Host "Registered: $TaskName"
Write-Host "  Trigger: Daily at 02:47:00"
Write-Host "  Action:  $NodeBin scripts/promote-memory-to-wiki.mjs --apply --backlink"
Write-Host "  Disable knob: PRISM_VAULT_PROMOTION_CRON_DISABLE=1"

# Migration-safe: -Disabled registers the task then immediately disables it, so it
# is present (auditable, ready to arm) but cannot fire until the operator enables it.
if ($Disabled) {
  Disable-ScheduledTask -TaskName $TaskName | Out-Null
  Write-Host "  State: DISABLED (migration-safe -- operator runs 'Enable-ScheduledTask -TaskName ""$TaskName""' to arm)"
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
