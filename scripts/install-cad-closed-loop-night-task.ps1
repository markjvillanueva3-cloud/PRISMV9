# install-cad-closed-loop-night-task.ps1 - register the "PRISM CAD Closed Loop Night" Windows
# Scheduled Task that runs scripts/run-cad-closed-loop-night.ps1 nightly (slot:delta, 2026-07-02).
#
# WHY A CHECKED-IN INSTALLER: the PRISM CAD Gen Loop task went permanently stale in June 2026 because
# it was hand-registered with a one-shot trigger and no source-of-truth installer (see
# install-cad-gen-loop-task.ps1 header). This clones that installer's corrected pattern: DAILY trigger,
# S4U current user (run whether logged on or not, no stored password, no elevation needed).
#
# SCHEDULE RATIONALE (no-downtime stagger, off-minute per fleet convention): 22:11 nightly starts the
# CPU/Fusion chain BEFORE the GPU cadence peaks (Ollama Night Batch ~22:23, CAD Gen Loop 23:04 x
# 30m/11h, NN-Graph Retrain 01:05, Galaxy Mines 01:00-06:00) - the chain is CPU/Fusion-bound so the
# two tracks overlap without contention. ExecutionTimeLimit 9h ends the chain by ~07:11, clear of the
# 07:15 PRISM CAD Decipher Hermes task (which re-runs the residual pass with fresher ledgers anyway).
# CAVEAT: -StartWhenAvailable can slide a missed 22:11 start (machine asleep) past 07:15, letting the
# chain's hermes stage overlap the 07:15 task - both append part-decipher-hermes.jsonl (atomic appends,
# no torn lines; cost is duplicate Hermes asks/rows, and the LoRA builder does not dedup them).
#
# USAGE:
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-cad-closed-loop-night-task.ps1
#   -At "HH:mm"   nightly start (default 22:11)
#   -RunNow       also kick it immediately
#   -Uninstall    remove the task

[CmdletBinding()]
param(
  [string]$At = "22:11",
  [switch]$RunNow,
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

$TaskName = "PRISM CAD Closed Loop Night"
$Script   = "H:/prism/scripts/run-cad-closed-loop-night.ps1"

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[cad-closed-loop-night] uninstalled task '$TaskName'"
  } else { Write-Host "[cad-closed-loop-night] task '$TaskName' not present" }
  exit 0
}

if (-not (Test-Path $Script)) { throw "night chain wrapper not found: $Script (run on the PRISM host)." }

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Script`"" `
  -WorkingDirectory "H:/prism"

$now = Get-Date
$start = [datetime]::ParseExact($At, "HH:mm", $null)
$start = $now.Date.AddHours($start.Hour).AddMinutes($start.Minute)
if ($start -le $now) { $start = $start.AddDays(1) }
$trigger = New-ScheduledTaskTrigger -Daily -At $start

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 9) `
  -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "[cad-closed-loop-night] registered '$TaskName' daily at $At (S4U $env:USERNAME, 9h cap)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "[cad-closed-loop-night] kicked '$TaskName' now"
}
