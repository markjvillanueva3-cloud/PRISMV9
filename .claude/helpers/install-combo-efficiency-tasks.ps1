# install-combo-efficiency-tasks.ps1
# COMBO-EFFICIENCY-MS0 follow-up -- register 4 Windows scheduled tasks (slot:alpha 2026-05-25).
#
# Pattern lift from .claude/helpers/install-fleet-reaper-task.ps1 (CLAUDE.md
# SFLEET-REAPER) -- uses S4U (Service-For-User) principal so tasks run without
# stored credentials.
#
# Tasks registered:
#   "PRISM Combo Efficiency Baseline"   5-min phase +180s  (P0-U02)
#   "PRISM Combo Efficiency Dashboard"  5-min phase +210s  (P2-U01, after baseline)
#   "PRISM Wiki Link Healer Suggest"    daily 02:17 local  (P1-U02 suggester, full 4136-link batch)
#   "PRISM Wiki Link Healer Apply"      daily 02:23 local  (P1-U02 applier, dry-run by default)
#
# The Apply task DEFAULTS TO DRY-RUN -- operator must edit the registered
# task to flip --apply on. This prevents un-reviewed auto-edits to the wiki/
# tree from landing without explicit consent (per P1-U02 safety contracts).
#
# Usage:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File .claude/helpers/install-combo-efficiency-tasks.ps1
#   pwsh ... -RunNow      # also kicks off baseline + dashboard immediately
#   pwsh ... -Unregister  # removes all 4 tasks (clean uninstall)
#
# Idempotent: re-running just refreshes registrations. Safe to invoke from
# /checkin-alpha or as a one-shot bootstrap.

param(
  [switch]$RunNow,
  [switch]$Unregister,
  [string]$PrismRoot = "H:/prism",
  [string]$NodeBin = "H:/Tools/nodejs/node.exe"
)

$ErrorActionPreference = "Stop"

$TASKS = @(
  @{
    Name = "PRISM Combo Efficiency Baseline";
    Script = "scripts/combo-efficiency-baseline.mjs";
    Args = @("--root", $PrismRoot);
    TriggerType = "PT5M";  # 5-minute repetition
    PhaseOffsetSec = 180;
    Description = "COMBO-EFFICIENCY-MS0/P0-U02: refresh combo-efficiency-baseline.json every 5min (substrate health metric for /awareness-snapshot)";
  },
  @{
    Name = "PRISM Combo Efficiency Dashboard";
    Script = "scripts/render-combo-efficiency-dashboard.mjs";
    Args = @("--root", $PrismRoot);
    TriggerType = "PT5M";
    PhaseOffsetSec = 210;  # 30s after baseline so it sees the fresh data
    Description = "COMBO-EFFICIENCY-MS0/P2-U01: regen dashboard JSON+MD+HTML 30s after baseline refresh";
  },
  @{
    Name = "PRISM Wiki Link Healer Suggest";
    Script = "scripts/wiki-link-fix-suggester.mjs";
    Args = @("--root", $PrismRoot, "--batch", "0");  # 0 = unlimited (full corpus)
    TriggerType = "Daily";
    DailyTime = "02:17";
    Description = "COMBO-EFFICIENCY-MS0/P1-U02: nightly wiki-link-fix-candidates.json refresh (full 4136-link batch)";
  },
  @{
    Name = "PRISM Wiki Link Healer Apply";
    Script = "scripts/wiki-link-fix-apply.mjs";
    Args = @("--root", $PrismRoot, "--max", "50");  # NO --apply flag = dry-run default
    TriggerType = "Daily";
    DailyTime = "02:23";  # 6min after suggester so the candidates JSON exists
    Description = "COMBO-EFFICIENCY-MS0/P1-U02: nightly auto-apply candidates (DEFAULTS TO DRY-RUN; operator adds --apply to enable writes)";
  }
)

function Test-Admin {
  $id = [System.Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [System.Security.Principal.WindowsPrincipal]::new($id)
  return $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Register-OneTask {
  param([hashtable]$Spec)

  $action = New-ScheduledTaskAction -Execute $NodeBin -Argument (
    @($Spec.Script) + $Spec.Args -join " "
  ) -WorkingDirectory $PrismRoot

  if ($Spec.TriggerType -eq "PT5M") {
    # 5-min repetition starting at midnight + phase offset.
    $start = (Get-Date).Date.AddSeconds($Spec.PhaseOffsetSec)
    $trigger = New-ScheduledTaskTrigger -Once -At $start `
      -RepetitionInterval (New-TimeSpan -Minutes 5)
  } elseif ($Spec.TriggerType -eq "Daily") {
    $trigger = New-ScheduledTaskTrigger -Daily -At $Spec.DailyTime
  } else {
    throw "Unknown trigger type: $($Spec.TriggerType)"
  }

  # S4U principal -- runs as current user without stored password
  # (NT AUTHORITY\SYSTEM is more robust but requires Admin; S4U works for user-level).
  $currentUser = "$env:USERDOMAIN\$env:USERNAME"
  $principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType S4U -RunLevel Limited

  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
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
  Write-Host "All COMBO-EFFICIENCY scheduled tasks removed." -ForegroundColor Cyan
}

# --- main ------------------------------------------------------------------

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

Write-Host "Registering 4 COMBO-EFFICIENCY-MS0 scheduled tasks..." -ForegroundColor Cyan
Write-Host "  Node:      $NodeBin"
Write-Host "  PrismRoot: $PrismRoot"
Write-Host "  RunAs:     $env:USERDOMAIN\$env:USERNAME (S4U)"
Write-Host ""

foreach ($spec in $TASKS) {
  Register-OneTask -Spec $spec
}

Write-Host ""
Write-Host "All 4 tasks registered." -ForegroundColor Green
Write-Host ""
Write-Host "Schedule summary:"
Write-Host "  Every 5min @ +180s:  PRISM Combo Efficiency Baseline"
Write-Host "  Every 5min @ +210s:  PRISM Combo Efficiency Dashboard"
Write-Host "  Daily 02:17:         PRISM Wiki Link Healer Suggest  (full 4136-link batch)"
Write-Host "  Daily 02:23:         PRISM Wiki Link Healer Apply    (DRY-RUN by default)"
Write-Host ""
Write-Host "To enable WRITES on the Apply task (after reviewing candidates):"
Write-Host "  Edit task action arguments: add '--apply' flag"
Write-Host ""
Write-Host "To uninstall all: pwsh -NoProfile -ExecutionPolicy Bypass -File `$PSCommandPath -Unregister"

if ($RunNow) {
  Write-Host ""
  Write-Host "Running 5-min tasks immediately..." -ForegroundColor Cyan
  Start-ScheduledTask -TaskName "PRISM Combo Efficiency Baseline"
  Start-Sleep -Seconds 2
  Start-ScheduledTask -TaskName "PRISM Combo Efficiency Dashboard"
  Write-Host "  baseline + dashboard kicked off"
}

exit 0
