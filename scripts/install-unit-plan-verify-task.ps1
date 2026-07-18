# install-unit-plan-verify-task.ps1  (HERMES-UNIT-PLAN / U-ZULU-UNITPLAN-VERIFY, slot:zulu)
#
# Checked-in, idempotent registration for the "PRISM Unit Plan Verify" scheduled task -- the
# MISSING pipeline stage after the drafter ("PRISM Unit Plan Harness"). The drafter drains to
# actionable=0 and idles; this cron VERIFIES the UNREVIEWED drafts (deterministic build-readiness
# gate) and promotes the passing ones into build-ready-queue.json for a specialist/build slot.
# Together the two crons keep the Master Unit Plan advancing with no down time.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-unit-plan-verify-task.ps1 [-RunNow]
#
# Fires every 13 minutes (quick-firing, off-:00/:30 phase, offset from the 23-min drafter). Runs
# --no-llm (pure deterministic gate: ~1s for the whole draft set, never GPU-starves the fleet) and
# --cap 30 (covers every draft). Idempotent: once all drafts are verified, each fire is a near-
# instant no-op (actionable=0) until a draft appears or changes. The harness is fail-open (exit 0)
# and self-locks, so a missed/overlapping fire is always safe.

param([switch]$RunNow)

$ErrorActionPreference = 'Stop'
# Real node.exe (a PE executable), NOT the bash-script shim -- Task Scheduler CreateProcess
# cannot launch a Bourne script (0x80070001). Matches the drafter + fleet-reaper tasks.
$TaskName = 'PRISM Unit Plan Verify'
$NodeExe  = 'H:\Tools\nodejs\node.exe'
$Script   = 'H:\prism\scripts\hermes-unit-plan-verify-harness.mjs'
$WorkDir  = 'H:\prism'

if (-not (Test-Path $NodeExe)) { throw "node.exe not found at $NodeExe" }
if (-not (Test-Path $Script))  { throw "verify harness not found at $Script" }

$action = New-ScheduledTaskAction -Execute $NodeExe -Argument "$Script --no-llm --cap 30" -WorkingDirectory $WorkDir
# Start ~2 min out, then repeat every 13 min effectively forever (10-year duration).
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
  -RepetitionInterval (New-TimeSpan -Minutes 13) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew

# S4U current-user (no stored password, runs whether-logged-on-or-not) so verification advances
# when the operator is logged off. Limited run level; verify is deterministic + read-mostly.
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType S4U -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force |
  Select-Object TaskName, State | Format-List

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Started '$TaskName' once now."
}
Write-Host "Registered '$TaskName' (every 13 min, --no-llm --cap 30). Inspect: Get-ScheduledTask '$TaskName' | Get-ScheduledTaskInfo"
