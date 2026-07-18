# install-slot-bridge-tasks.ps1
# SLOT-BRIDGE-MS0/U-SBB07 -- periodic re-arm cron (slot:alpha 2026-05-26).
#
# Pattern lift from .claude/helpers/install-combo-efficiency-tasks.ps1
# (COMBO-EFFICIENCY-MS0/CRON-INSTALL) -- same S4U principal pattern so
# tasks run without stored credentials.
#
# Background:
# SLOT-BRIDGE-MS0/U-SBB03 made every NEW claimSlot() self-heal the
# binding for any non-golf slot. That closes the gap for NEW chats.
# This cron is the SAFETY NET for:
#   - operator wipes slot-branch-bindings.json by mistake
#   - migration drift where chat-slots.json branch fields desync
#   - long-running peers that haven't claimed in N hours (rare but
#     happens during /compact storms) staying on stale branch fields
#
# Tasks registered:
#   "PRISM Slot Bindings Seed"     daily 02:34  (idempotent -- noop if armed)
#   "PRISM Slot Bindings Backfill" daily 02:37  (3min after seed)
#   "PRISM Slot Bindings Verify"   daily 02:43  (e2e -- alerts on FAIL)
#
# Phase placement: 02:34/37/43 chosen to:
#   - Not collide with COMBO-EFFICIENCY-MS0 tasks (02:17 wiki-suggest +
#     02:23 wiki-apply).
#   - Not collide with the every-5min fleet-reaper (+210s phase) +
#     fleet-memory-monitor (+330s phase).
#   - Off the :00 and :30 marks per anti-thundering-herd convention.
#
# Usage:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File .claude/helpers/install-slot-bridge-tasks.ps1
#   pwsh ... -RunNow      # also fires all 3 tasks immediately
#   pwsh ... -Unregister  # removes all 3 tasks (clean uninstall)
#
# Idempotent: re-running just refreshes registrations. Safe to invoke
# from /checkin-alpha or as a one-shot bootstrap.

param(
  [switch]$RunNow,
  [switch]$Unregister,
  [string]$PrismRoot = "H:/prism",
  [string]$NodeBin = "H:/Tools/nodejs/node.exe"
)

$ErrorActionPreference = "Stop"

$TASKS = @(
  @{
    Name = "PRISM Slot Bindings Seed";
    Script = "scripts/seed-slot-branch-bindings.mjs";
    Args = @();  # no flags -- defaults to apply mode, idempotent (noop if all bound)
    TriggerType = "Daily";
    DailyTime = "02:34";
    Description = "SLOT-BRIDGE-MS0/U-SBB07: daily idempotent re-seed of slot-branch-bindings.json. Safety net for operator wipes / fleet expansion. Noop if all 25 work slots already bound."
  },
  @{
    Name = "PRISM Slot Bindings Backfill";
    Script = "scripts/backfill-chat-slots-branch.mjs";
    Args = @();  # no flags -- defaults to apply mode, withLock-protected, noop if armed
    TriggerType = "Daily";
    DailyTime = "02:37";  # 3min after seed so bindings sidecar is up-to-date
    Description = "SLOT-BRIDGE-MS0/U-SBB07: daily backfill of chat-slots.json branch field for any live slot that drifted. Now uses withLock (U-SBB05) so cannot race-clobber peer heartbeats."
  },
  @{
    Name = "PRISM Slot Bindings Verify";
    Script = "scripts/verify-slot-bridge-enforcement.mjs";
    Args = @();
    TriggerType = "Daily";
    DailyTime = "02:43";  # 6min after seed, 6min after backfill -- verify post-stabilization
    Description = "SLOT-BRIDGE-MS0/U-SBB07: daily e2e check that decideOnEdit denies non-golf main-tree writes + allows own-worktree writes + allows golf main-tree writes. Exit 1 surfaces in scheduled-task history if any case fails."
  }
)

function Register-OneTask {
  param([hashtable]$Spec)

  $argList = @($Spec.Script) + $Spec.Args
  $action = New-ScheduledTaskAction -Execute $NodeBin -Argument ($argList -join " ") -WorkingDirectory $PrismRoot

  if ($Spec.TriggerType -eq "Daily") {
    $trigger = New-ScheduledTaskTrigger -Daily -At $Spec.DailyTime
  } else {
    throw "Unknown trigger type: $($Spec.TriggerType)"
  }

  $currentUser = "$env:USERDOMAIN\$env:USERNAME"
  $principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType S4U -RunLevel Limited

  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
    -MultipleInstances IgnoreNew

  Register-ScheduledTask -TaskName $Spec.Name -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Description $Spec.Description -Force | Out-Null

  Write-Host "  registered: $($Spec.Name)" -ForegroundColor Green
}

function Unregister-AllTasks {
  foreach ($spec in $TASKS) {
    if (Get-ScheduledTask -TaskName $spec.Name -ErrorAction SilentlyContinue) {
      Unregister-ScheduledTask -TaskName $spec.Name -Confirm:$false
      Write-Host "  unregistered: $($spec.Name)" -ForegroundColor Yellow
    }
  }
  Write-Host ""
  Write-Host "All SLOT-BRIDGE scheduled tasks removed." -ForegroundColor Cyan
}

# main

if ($Unregister) {
  Unregister-AllTasks
  exit 0
}

if (-not (Test-Path $NodeBin)) {
  Write-Host "ERROR: node binary not found at $NodeBin" -ForegroundColor Red
  Write-Host "  Override with -NodeBin <path>" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $PrismRoot)) {
  Write-Host "ERROR: PRISM root not found at $PrismRoot" -ForegroundColor Red
  Write-Host "  Override with -PrismRoot <path>" -ForegroundColor Red
  exit 1
}

Write-Host "Registering 3 SLOT-BRIDGE-MS0 scheduled tasks..." -ForegroundColor Cyan
Write-Host "  Node:      $NodeBin"
Write-Host "  PrismRoot: $PrismRoot"
Write-Host "  RunAs:     $env:USERDOMAIN\$env:USERNAME (S4U)"
Write-Host ""

foreach ($spec in $TASKS) {
  Register-OneTask -Spec $spec
}

Write-Host ""
Write-Host "All 3 tasks registered." -ForegroundColor Green
Write-Host ""
Write-Host "Schedule summary:"
Write-Host "  Daily 02:34: PRISM Slot Bindings Seed      (idempotent, noop if all bound)"
Write-Host "  Daily 02:37: PRISM Slot Bindings Backfill  (live chat-slots.json patch, withLock-safe)"
Write-Host "  Daily 02:43: PRISM Slot Bindings Verify    (e2e -- exit 1 if any decideOnEdit case fails)"
Write-Host ""
Write-Host "To uninstall all: pwsh -NoProfile -ExecutionPolicy Bypass -File `$PSCommandPath -Unregister"

if ($RunNow) {
  Write-Host ""
  Write-Host "Firing all 3 tasks immediately..." -ForegroundColor Cyan
  Start-ScheduledTask -TaskName "PRISM Slot Bindings Seed"
  Start-Sleep -Seconds 2
  Start-ScheduledTask -TaskName "PRISM Slot Bindings Backfill"
  Start-Sleep -Seconds 2
  Start-ScheduledTask -TaskName "PRISM Slot Bindings Verify"
  Write-Host "  all 3 kicked off"
}

exit 0
