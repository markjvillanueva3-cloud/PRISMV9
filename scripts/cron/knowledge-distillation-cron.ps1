<#
.SYNOPSIS
  OBSIDIAN-INTELLIGENCE-MS3/B6/U-KNOWLEDGE-DISTILLATION — monthly cron wrapper.

.DESCRIPTION
  Registers (or runs) a monthly Windows Scheduled Task that drives
  KnowledgeDistillationEngine via a small Node entrypoint. The engine is
  loaded through tsx/esm/api (no build dependency), mirroring the B1/B4
  daily/weekly cron pattern. Ollama is probed; if reachable the summariser
  is supplied, otherwise the engine's literal fallback owns the output.

.PARAMETER RunNow
  Register the scheduled task AND start it immediately once.

.PARAMETER RunOnce
  Invoke a single distill pass right now WITHOUT registering a task
  (cron-equivalent manual run / CI).

.PARAMETER Uninstall
  Unregister the scheduled task (reversible; engine + script remain on disk).

.PARAMETER DryRun
  Pass --dry-run to the engine (scan + cluster, no DISTILL writes).

.PARAMETER NoOllama
  Force literal mode (skip the Ollama probe + adapter).

.PARAMETER At
  Day-of-month + time for the monthly trigger (default: day 1, 03:17 local —
  off-peak, off the :00/:30 stampede).

.NOTES
  Reversible by design (feedback_never_delete_only_disable): -Uninstall +
  Disable-ScheduledTask are the levers; nothing is destroyed.
#>
[CmdletBinding()]
param(
  [switch]$RunNow,
  [switch]$RunOnce,
  [switch]$Uninstall,
  [switch]$DryRun,
  [switch]$NoOllama,
  [string]$At = "03:17",
  [int]$DayOfMonth = 1,
  [string]$NodeExe
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PrismRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$TaskName  = "PRISM Knowledge Distillation"
$Runner    = Join-Path $PrismRoot "scripts\run-knowledge-distillation.mjs"

function Resolve-NodeExe {
  if ($env:PRISM_NODE -and (Test-Path $env:PRISM_NODE)) { return $env:PRISM_NODE }
  if ($NodeExe -and (Test-Path $NodeExe)) { return $NodeExe }
  $portable = "H:\.claude\bin\portable-node"
  if (Test-Path $portable) { return $portable }
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  throw "node executable not found (set PRISM_NODE or pass -NodeExe)"
}

if ($Uninstall) {
  $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Output "knowledge-distillation: scheduled task '$TaskName' unregistered"
  } else {
    Write-Output "knowledge-distillation: no scheduled task '$TaskName' to remove"
  }
  return
}

$node = Resolve-NodeExe
if (-not (Test-Path $Runner)) {
  throw "runner not found: $Runner"
}

$runnerArgs = @($Runner)
if ($DryRun)   { $runnerArgs += "--dry-run" }
if ($NoOllama) { $runnerArgs += "--no-ollama" }
$runnerArgs += "--json"

if ($RunOnce) {
  Write-Output "knowledge-distillation: single pass (no task registration)"
  & $node @runnerArgs
  exit $LASTEXITCODE
}

# Build the monthly trigger. Task Scheduler has no native "day N monthly"
# via New-ScheduledTaskTrigger, so use a daily trigger + a day-of-month
# gate in the action (the runner is idempotent via kd-sig markers, so a
# no-op daily fire on non-target days is cheap + safe).
$timeParts = $At.Split(":")
$trigger = New-ScheduledTaskTrigger -Daily -At ([datetime]::Today.AddHours([int]$timeParts[0]).AddMinutes([int]$timeParts[1]))

$gateCmd = "if ((Get-Date).Day -eq $DayOfMonth) { & '$node' $($runnerArgs -join ' ') }"
$action  = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command `"$gateCmd`""

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 20) `
  -MultipleInstances IgnoreNew

# Best-effort S4U principal (runs whether-logged-on-or-not, no stored
# password). Fall back to the interactive default if elevation is absent.
try {
  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Limited
  Register-ScheduledTask -TaskName $TaskName -Trigger $trigger -Action $action `
    -Settings $settings -Principal $principal -Force | Out-Null
} catch {
  Register-ScheduledTask -TaskName $TaskName -Trigger $trigger -Action $action `
    -Settings $settings -Force | Out-Null
}
Write-Output "knowledge-distillation: scheduled task '$TaskName' registered (day $DayOfMonth @ $At local)"

if ($RunNow) {
  Write-Output "knowledge-distillation: starting an immediate pass"
  & $node @runnerArgs
  exit $LASTEXITCODE
}
