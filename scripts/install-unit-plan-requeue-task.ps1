# install-unit-plan-requeue-task.ps1  (HERMES-UNIT-PLAN / U-ZULU-UNITPLAN-REQUEUE, slot:zulu)
#
# Checked-in, idempotent registration for the "PRISM Unit Plan Requeue Rework" scheduled task --
# the LOOP-CLOSURE stage after the verifier ("PRISM Unit Plan Verify"). A draft the verify stage
# flags NEEDS-REWORK is DROPPED from build-ready-queue.json AND left Status="Drafted", so the
# drafter (orderQueue excludes non-"Not Started") never re-picks it -- stuck forever, the silent-
# done no-downtime hole. This cron re-drafts those units at a higher token budget (truncation is
# the usual NEEDS-REWORK cause); structural (split/replace) verdicts + units past REDRAFT_CAP
# surface needs-human and are never looped. Draft -> verify -> REQUEUE -> build-ready now has no
# dead-end.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-unit-plan-requeue-task.ps1 [-RunNow]
#
# Fires every 19 minutes (quick-firing, off-:00/:30 phase, offset from the 13-min verify + 15-min
# surface + 23-min drafter). Unlike verify (--no-llm, ~1s), this stage makes real Hermes/Ollama
# draft calls, so the execution time limit is 20 min (cap 2 units x up to ~8 min each). Idempotent:
# once no NEEDS-REWORK units remain (or all are capped/structural), each fire is a fast no-op. The
# stage is fail-open (exit 0) and the drafter it spawns self-locks, so a missed/overlapping fire is
# always safe.

param([switch]$RunNow)

$ErrorActionPreference = 'Stop'
# Real node.exe (a PE executable), NOT the bash-script shim -- Task Scheduler CreateProcess cannot
# launch a Bourne script (0x80070001). Matches the drafter + verify + fleet-reaper tasks.
$TaskName = 'PRISM Unit Plan Requeue Rework'
$NodeExe  = 'H:\Tools\nodejs\node.exe'
$Script   = 'H:\prism\scripts\hermes-unit-plan-requeue.mjs'
$WorkDir  = 'H:\prism'

if (-not (Test-Path $NodeExe)) { throw "node.exe not found at $NodeExe" }
if (-not (Test-Path $Script))  { throw "requeue stage not found at $Script" }

$action = New-ScheduledTaskAction -Execute $NodeExe -Argument "$Script --apply --cap 2" -WorkingDirectory $WorkDir
# Start ~5 min out (after the verify stage has produced verdicts), then repeat every 19 min.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) `
  -RepetitionInterval (New-TimeSpan -Minutes 19) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -MultipleInstances IgnoreNew

# S4U current-user (no stored password, runs whether-logged-on-or-not) so redrafts advance while
# the operator is logged off. Limited run level; the stage writes only under knowledge/hermes-
# outputs + state/shared and never touches repo source.
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType S4U -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force |
  Select-Object TaskName, State | Format-List

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Started '$TaskName' once now."
}
Write-Host "Registered '$TaskName' (every 19 min, --apply --cap 2). Inspect: Get-ScheduledTask '$TaskName' | Get-ScheduledTaskInfo"
