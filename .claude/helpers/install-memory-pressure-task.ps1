param(
  [string]$TaskName = 'PRISM Memory Pressure Auto-Relief',
  [int]$EveryMinutes = 5,
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-memory-pressure-task.ps1 — HS-13 automated memory-pressure relief
# (2026-05-12). Registers a Windows Scheduled Task that runs
# scripts/system-health/03-memory-pressure-auto-relief.ps1 every $EveryMinutes
# minutes, independent of Claude Code sessions. Cheap (~50 ms) when memory is
# healthy; escalates to zombie-tsservers + node-process-janitor only when it
# crosses the configured thresholds.
#
# Why a separate task from "PRISM Hook Janitor": the janitor (2-min cadence)
# targets specific orphan processes by cmdline+parent-PID-dead heuristics —
# it won't reap an alive-but-stale MCP server. The pressure relief task
# operates on *aggregate memory state* and invokes the heavier
# 02-kill-zombie-tsservers.ps1 only when actually needed. Different jobs.
#
# Pause without uninstalling: Disable-ScheduledTask -TaskName 'PRISM Memory Pressure Auto-Relief'
# Uninstall:                   & '$PSScriptRoot\install-memory-pressure-task.ps1' -Uninstall

$ErrorActionPreference = 'Stop'

$reliefScript = 'H:\prism\scripts\system-health\03-memory-pressure-auto-relief.ps1'

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Unregistered task: $TaskName"
  } else {
    Write-Host "Task not found (already uninstalled): $TaskName"
  }
  return
}

if (-not (Test-Path $reliefScript)) { throw "Relief script not found: $reliefScript" }

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$reliefScript`""

$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

# ExecutionTimeLimit is the BACKSTOP, not the primary bound. The relief script
# (03-memory-pressure-auto-relief.ps1) self-bounds every run to its $MaxRuntimeSec
# (default 100s) — each escalation tier checks the remaining budget and every
# heavy sub-invocation is a bounded child process. 4 min gives comfortable
# headroom so a one-off slow OS (WMI hiccup, taskkill latency under fork-storm
# load) still completes cleanly instead of being SIGKILL'd by the scheduler
# (which recorded LastTaskResult=267014 SCHED_S_TASK_TERMINATED — the 2-min
# limit was too tight against the script's own 100s budget). Raised 2026-05-14
# (SLOT-WORKTREE-MS0 hygiene fix). NOTE: an existing registered task keeps its
# old limit until re-registered — re-run this installer (elevated) to apply.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 4) `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Monitors commit-memory pressure every $EveryMinutes minutes. Auto-runs 02-kill-zombie-tsservers + node-process-janitor --full when usage crosses 85/92/97% thresholds. Cheap noop when memory is healthy. Self-bounds each run to ~100s. Logs to .cache/memory-pressure-log.jsonl." `
  -Force | Out-Null

Write-Host "Registered: $TaskName (03-memory-pressure-auto-relief.ps1, every $EveryMinutes min, ExecutionTimeLimit=4min)"
Write-Host "NOTE: this Register call is what APPLIES the 4-min ExecutionTimeLimit. Pulling the"
Write-Host "      commit alone does not — if you only updated the file, re-run this installer"
Write-Host "      (elevated) to push the new limit onto the live task. The relief script also"
Write-Host "      self-bounds to ~100s, so the limit is a backstop, not the primary bound."

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 2
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult)"
}

Write-Host ""
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-memory-pressure-task.ps1' -Uninstall"
Write-Host "View recent activity:        Get-Content H:/prism/.cache/memory-pressure-log.jsonl -Tail 20"
