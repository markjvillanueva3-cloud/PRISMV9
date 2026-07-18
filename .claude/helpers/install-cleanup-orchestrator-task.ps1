param(
  [string]$TaskName = 'PRISM Cleanup Orchestrator',
  [int]$EveryMinutes = 5,
  # Phase offset (seconds) for the trigger anchor. PRISM runs three 5-min
  # PowerShell/node-forking hygiene tasks; firing them on the same minute
  # spikes the process table. Default anchors: "Memory Pressure Auto-Relief"
  # ~+60s, this orchestrator +135s, "Fleet Reaper" +210s -- i.e. +135s is the
  # midpoint between Memory-Relief (+60s) and Fleet-Reaper (+210s), spreading
  # the trio ~75s apart across the 300s cycle.
  # KNOWN LIMITATION: a -Once trigger re-anchors to (install-time + offset) on
  # every (re)install, so re-running this (or a sibling) drifts the spacing.
  # The siblings (install-fleet-reaper-task.ps1, install-memory-pressure-task.ps1)
  # share this; the proper fix is a fixed wall-clock anchor, tracked fleet-wide
  # separately. For now: if you re-install one, re-install all three together.
  [int]$StartOffsetSeconds = 135,
  # Burn-in mode: bakes -DryRun into the task definition (machine-persistent).
  # The wrapper forwards --dry-run to the cleaners that support it (chat-bus,
  # node-orphans) -- classify + report, reap nothing. Watch
  # state/shared/cleanup-orchestrator.log, then reinstall without -DryRun.
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-cleanup-orchestrator-task.ps1 -- durable backbone for the generic
# locks/claims/orphan reaper layer.
#
# Registers a Windows Scheduled Task that runs the CANONICAL wrapper
# scripts/system-health/28-cleanup-orchestrator.ps1 every $EveryMinutes minutes,
# independent of any Claude Code session. That wrapper (shipped by
# CLEANUP-MS0/U-CLEANUP-E3) is the single source of truth for HOW the
# orchestrator is invoked -- this installer only handles WHEN. It does NOT
# bypass the wrapper or re-implement node resolution / arg handling.
#
# The orchestrator itself (.claude/helpers/cleanup-orchestrator.mjs) is a
# single-call wrapper over the 5 generic cleanup helpers (git-lock-sweeper,
# chat-bus-reap, zombie-reaper-daemon, node-orphan-cleaner, bash-orphan-cleaner).
#
# WHY THIS INSTALLER EXISTS (SLOT-WORKTREE-MS0 hygiene fix, 2026-05-14):
# U-CLEANUP-E3 shipped the wrapper (28-cleanup-orchestrator.ps1) and documented
# task registration only as a raw `schtasks /Create` command in its comment
# block -- unlike its siblings "PRISM Fleet Reaper" and "PRISM Memory Pressure
# Auto-Relief", which each have a proper install-*.ps1 (elevation probe,
# -RunNow, -Uninstall, phase offset, sanity check). On hosts where the raw
# command was never run, the task simply does not exist and the generic reaper
# layer only runs when a chat invokes it (Stop hook / manual / memory-pressure
# escalation). This installer closes that gap with the same ergonomics as the
# siblings, so the fleet-hygiene installer set is complete and consistent.
#
# This task is ADDITIVE and does NOT duplicate its siblings -- each covers a
# different layer:
#   - PRISM Fleet Reaper                -- slot-attributed orphans (chat-slots.json)
#   - PRISM Memory Pressure Auto-Relief -- aggregate-memory-triggered escalation
#   - PRISM Cleanup Orchestrator (this) -- routine generic locks/claims/orphans,
#                                          run on cadence regardless of pressure
#
# Per memory feedback_never_delete_only_disable.md: this REGISTERS a task; it
# can be Disable-ScheduledTask'd to pause without removing. Use -Uninstall to
# remove.
#
# Pause without uninstalling: Disable-ScheduledTask -TaskName 'PRISM Cleanup Orchestrator'
# Uninstall:                   & '$PSScriptRoot\install-cleanup-orchestrator-task.ps1' -Uninstall

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

# The scheduled task always targets the canonical main tree, never a worktree
# (a worktree's scripts/ can be removed; the host-level task must not dangle).
$wrapperScript = 'H:\PRISM\scripts\system-health\28-cleanup-orchestrator.ps1'

if (-not (Test-Path $wrapperScript)) {
  throw "Cleanup-orchestrator wrapper not found: $wrapperScript (run on the PRISM host with H:\PRISM present, and ensure scripts/system-health/28-cleanup-orchestrator.ps1 is committed)."
}

# Sanity: confirm the wrapper really is U-CLEANUP-E3's orchestrator wrapper
# (not some renamed file). Both anchor strings live in its header docblock.
$head = Get-Content $wrapperScript -TotalCount 60 -ErrorAction SilentlyContinue
if (-not (($head -match 'cleanup-orchestrator') -and ($head -match 'U-CLEANUP-E3'))) {
  throw "Refusing to install: $wrapperScript does not look like 28-cleanup-orchestrator.ps1 (missing its 'cleanup-orchestrator' / 'U-CLEANUP-E3' header anchors). Ensure it is the committed version (HEAD)."
}

# Run the wrapper via powershell.exe (Windows-PowerShell 5.1) -- always present
# in the Task Scheduler service context, unlike pwsh.exe (PS7) which requires a
# separate install. The wrapper's cmdlets + [switch] params are 5.1-compatible.
# This matches the sibling installers, which also use powershell.exe.
$wrapperArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$wrapperScript`"$(if ($DryRun) { ' -DryRun' })"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $wrapperArgs

$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

# ExecutionTimeLimit 3 min: a typical run is ~10s; the orchestrator already
# bounds each of its 5 sub-cleaners internally and never aborts on a single
# sub-failure, so 3 min is a generous backstop for a worst-case contended host.
# MultipleInstances IgnoreNew so a slow run never piles a second instance on
# itself (node-orphan-cleaner also has its own 90s internal throttle).
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 3) `
  -MultipleInstances IgnoreNew

$desc = "Generic fleet-hygiene reaper -- runs scripts/system-health/28-cleanup-orchestrator.ps1$(if ($DryRun) { ' -DryRun [BURN-IN]' }) every $EveryMinutes min, independent of Claude sessions. The wrapper delegates to the 5 cleanup helpers (git-lock-sweeper, chat-bus-reap, zombie-reaper, node-orphan-cleaner, bash-orphan-cleaner). Sibling to 'PRISM Fleet Reaper' (slot-attributed orphans) and 'PRISM Memory Pressure Auto-Relief' (memory-triggered escalation); covers the routine locks/claims/orphans layer those do not."

# Existence probe: Register-ScheduledTask -Force silently overwrites a same-name
# task. U-CLEANUP-E3's comment block documents a raw `schtasks /Create` for this
# exact name -- if an operator (or that command) registered it by hand, surface
# the replace instead of clobbering it silently.
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Replacing existing scheduled task '$TaskName' (state: $($existing.State)) -- its previous trigger/action/limit will be overwritten."
}

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description $desc `
  -Force | Out-Null

$mode = if ($DryRun) { 'DRY-RUN burn-in (reaps nothing)' } else { 'live' }
Write-Host "Registered: $TaskName ($mode, runs 28-cleanup-orchestrator.ps1, every $EveryMinutes min, +$($StartOffsetSeconds)s phase offset)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  # A run is usually ~10s; LastTaskResult reads 267009 (0x41301 = "running")
  # until it finishes -- poll past that rather than reporting a misleading code.
  $deadline = (Get-Date).AddSeconds(90)
  do {
    Start-Sleep -Seconds 3
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate run -- still running after 90s (LastTaskResult=267009). Check state/shared/cleanup-orchestrator.log."
  } else {
    # 0 = all cleaners ok; 1 = completed but a sub-cleaner reported a failure
    # (still a successful orchestrator run); 2 = wrapper misuse (should not happen here).
    Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult) (0=all ok, 1=completed w/ a sub-cleaner failure)"
  }
}

Write-Host ""
Write-Host "Wrapper flags (pass via -DryRun here, or run the wrapper directly): -DryRun, -ForceThrottled, -Json"
Write-Host "Verify registered:           schtasks /Query /TN '$TaskName'"
Write-Host "See all PRISM hygiene tasks: Get-ScheduledTask | Where-Object { `$_.TaskName -like 'PRISM *' }"
Write-Host "Watch orchestrator activity: Get-Content H:/PRISM/state/shared/cleanup-orchestrator.log -Tail 20 -Wait"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-cleanup-orchestrator-task.ps1' -Uninstall"
