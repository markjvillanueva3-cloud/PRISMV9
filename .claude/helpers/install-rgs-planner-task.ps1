param(
  [string]$TaskName = 'PRISM RGS Tool Planner',
  # Wall-clock cap passed to the planner as --time-budget <minutes>. The planner
  # stops before the next unit once the budget is spent; per-unit checkpointing
  # means the following night resumes where this one stopped.
  [int]$TimeBudgetMinutes = 60,
  # Nightly trigger time. Default 3:13 AM -- off-peak and off the :00/:30 marks
  # so it does not phase-lock onto every other task anchored on the hour.
  [string]$At = '3:13AM',
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-rgs-planner-task.ps1 -- durable nightly replan for the RGS tool-plan
# sidecar (RGS-TOOL-AUTOINVOKE-MS1/U-CRON).
#
# Registers a Windows Scheduled Task that runs rgs-tool-planner.mjs once a night
# with a --time-budget cap, independent of any Claude Code session. Without it
# the per-roadmap-unit tool-plan sidecar rots: new/changed units never get a
# plan and Ollama-synthesised plans go stale.
#
# What the planner does (see scripts/rgs-tool-planner.mjs): enumerates every
# open roadmap unit, fuses signals (capabilities + tribal + skill triggers +
# rules + optional Ollama synthesis) into a tool plan, and writes the sidecar
# state/shared/roadmap-tool-plans.json. The run is checkpoint-resumable
# (.roadmap-tool-plans.checkpoint.jsonl) -- a budget-truncated night is continued
# the next night, and a unit whose source text changed is re-planned.
#
# Why a time budget: a full 4,400-unit pass with Ollama synthesis is long. The
# budget bounds each night's run; the planner refreshes its own lock on every
# flush so a long budgeted run never lets the lock go stale (a concurrent
# /rgs tool-plan would otherwise steal it after 10 min).
#
# Per memory feedback_never_delete_only_disable.md: this REGISTERS a task; it
# can be Disable-ScheduledTask'd to pause without removing. Use -Uninstall to
# remove.

$ErrorActionPreference = 'Stop'

# Registering / unregistering a task in the root \ folder needs an elevated
# context on Windows 11 -- fail with a clear message instead of a raw COM error.
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell -- (un)registering the scheduled task '$TaskName' needs admin rights."
}

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Unregistered task: $TaskName"
  } else {
    Write-Host "Task not found (already uninstalled): $TaskName"
  }
  return
}

if ($TimeBudgetMinutes -le 0) {
  throw "TimeBudgetMinutes must be a positive integer (got $TimeBudgetMinutes)."
}

# The scheduled task always targets the canonical main tree, never a worktree
# (a worktree's scripts/ can be removed; the host-level task must not dangle).
$plannerScript = 'H:\PRISM\scripts\rgs-tool-planner.mjs'

# Prefer the portable node this PC uses; fall back to PATH then Program Files.
$nodeExe = $null
foreach ($cand in @('H:\Tools\nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) { $nodeExe = (Get-Command node -ErrorAction Stop).Source }

if (-not (Test-Path $plannerScript)) {
  throw "Planner script not found: $plannerScript (run on the PRISM host with H:\PRISM present, and ensure scripts/rgs-tool-planner.mjs is committed)."
}

# Sanity: confirm the script is the RGS planner and understands --time-budget.
$head = Get-Content $plannerScript -TotalCount 20 -ErrorAction SilentlyContinue
if (-not (($head -match 'tool-plan sidecar') -and ($head -match '--time-budget'))) {
  throw "Refusing to install: $plannerScript does not look like the RGS tool-planner with --time-budget support (missing header markers). Ensure it is the committed HEAD version."
}

# Validate the trigger time parses before registering (a bad -At string would
# otherwise fail deep inside New-ScheduledTaskTrigger with an opaque error).
try { [void][datetime]::Parse($At) }
catch { throw "Could not parse -At '$At' as a time of day (e.g. '3:13AM')." }

$action = New-ScheduledTaskAction -Execute $nodeExe `
  -Argument "`"$plannerScript`" --time-budget $TimeBudgetMinutes"

$trigger = New-ScheduledTaskTrigger -Daily -At $At

# ExecutionTimeLimit = budget + 15 min margin (graph load + flush overhead).
# The planner stops itself at the budget; this is a hard safety ceiling.
# MultipleInstances IgnoreNew so a slow night never piles a second planner on
# top of itself (the planner's own file lock would reject it anyway).
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes ($TimeBudgetMinutes + 15)) `
  -MultipleInstances IgnoreNew

$desc = "Nightly RGS tool-plan replan (rgs-tool-planner.mjs --time-budget $TimeBudgetMinutes). Enumerates every open roadmap unit, fuses a recommended PRISM toolchain, writes state/shared/roadmap-tool-plans.json. Checkpoint-resumable: a budget-truncated night continues the next night. Keeps the per-unit tool-plan sidecar fresh. Runs independent of Claude sessions."

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description $desc `
  -Force | Out-Null

Write-Host "Registered: $TaskName (daily at $At, rgs-tool-planner.mjs --time-budget $TimeBudgetMinutes, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  # A budgeted planner run can take up to $TimeBudgetMinutes -- do NOT poll to
  # completion here. Confirm it started and point at the durable artifacts.
  Start-Sleep -Seconds 3
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Triggered immediate run (LastTaskResult=$($info.LastTaskResult); 267009 = still running -- expected for a budgeted run)."
}

Write-Host ""
Write-Host "Output is the sidecar itself -- there is no separate run-log:"
Write-Host "  Sidecar:    H:/PRISM/state/shared/roadmap-tool-plans.json"
Write-Host "  Checkpoint: H:/PRISM/state/shared/.roadmap-tool-plans.checkpoint.jsonl"
Write-Host "  Coverage:   node H:/PRISM/scripts/rgs-plan-coverage.mjs   (or /rgs tool-plan-coverage)"
Write-Host ""
Write-Host "Verify registered:           schtasks /Query /TN '$TaskName'"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-rgs-planner-task.ps1' -Uninstall"
