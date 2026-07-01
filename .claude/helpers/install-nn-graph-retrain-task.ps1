param(
  [string]$TaskName = 'PRISM NN-Graph Retrain',
  # Cadence in HOURS — this is a heavy task (a retrain is a multi-minute
  # GraphSAGE training run), unlike the 5-minute fleet-reaper sweep. The
  # lifecycle's own drift gate makes most polls a sub-second no-op, so a
  # 6-hour cadence catches graph drift quickly while almost never paying the
  # full retrain cost. Override with -EveryHours 24 for a daily cadence.
  [int]$EveryHours = 6,
  # Phase offset (seconds) for the trigger anchor. The host already runs
  # several 5-minute tasks (Cleanup Orchestrator +60s, Memory Pressure Relief
  # +120s, Fleet Reaper +210s, Fleet Memory Monitor +330s). +450s lands this
  # task clear of all of them, so a poll never phase-locks onto a busy minute.
  [int]$StartOffsetSeconds = 450,
  # Install with --dry-run baked in — a burn-in mode. The lifecycle then
  # fingerprints, drift-checks, trains a candidate, and evaluates it, but never
  # promotes the live checkpoint or advances the baseline. Watch
  # state/shared/nn-graph/retrain-lifecycle.jsonl, then reinstall without it.
  [switch]$DryRun,
  [switch]$RunNow,
  # -RunNow poll ceiling (minutes). Kept under the 30-min ExecutionTimeLimit so
  # a genuine retrain that finishes in the 20-30 min range is not falsely
  # reported as hung.
  [int]$RunNowTimeoutMinutes = 25,
  [switch]$Uninstall,
  # Legacy behavior: register with NO principal so the task runs only while the
  # installing user is interactively logged in (Logon Mode: Interactive only).
  # Default (this switch OFF) hardens the task to run whether-logged-on-or-not.
  [switch]$Interactive,
  # Strongest principal: run as the SYSTEM machine account instead of the
  # default S4U (current user's context, no stored password). The retrain
  # lifecycle only reads the system-viz graph and writes under
  # state/shared/nn-graph/ — S4U (the installing user's context) is sufficient;
  # -AsSystem is offered only for parity with the fleet-reaper installer.
  [switch]$AsSystem
)

# install-nn-graph-retrain-task.ps1 — durable backbone for NN-GRAPH-MS2 U2,
# the autonomous GNN tier-5 self-retrain lifecycle.
#
# Registers a Windows Scheduled Task that runs nn-graph-retrain-lifecycle.mjs
# every $EveryHours hours, independent of any Claude Code session. The lifecycle
# (see scripts/nn-graph-retrain-lifecycle.mjs):
#   1. fingerprints the system-viz graph (node/edge/ghost counts),
#   2. drift-detects against its baseline — no drift => a cheap no-op SKIP,
#   3. on drift, trains a CANDIDATE GraphSAGE checkpoint (the live checkpoint is
#      never touched by training),
#   4. evaluates the candidate against the NN-GRAPH-MS0 gates
#      (AUROC>=0.78, macro-F1>=0.55, Brier<=0.15),
#   5. promotes candidate -> live ONLY when every gate clears — a deferred or
#      sub-gate candidate is NEVER promoted; the prior live checkpoint is kept
#      as graphsage-checkpoint.prev.json.
#
# This is the "survives every chat closing" half of the GNN autonomy stack. It
# pairs with NN-GRAPH-MS2 U1 (the regen-viz stage that seeds the reference-pool
# ghost nodes the evaluator needs).
#
# Per memory feedback_never_delete_only_disable.md: this REGISTERS a task; it
# can be Disable-ScheduledTask'd to pause without removing. Use -Uninstall to
# remove. The lifecycle also honors PRISM_NN_RETRAIN_DISABLE=1 as a kill switch.

$ErrorActionPreference = 'Stop'

# Registering / unregistering a task in the root \ folder needs an elevated
# context on Windows 11 — fail with a clear message instead of a raw COM error.
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell — (un)registering the scheduled task '$TaskName' needs admin rights."
}

# The scheduled task always targets the canonical main tree, never a worktree
# (a worktree's scripts/ can be removed; the host-level task must not dangle).
$lifecycleScript = 'H:\PRISM\scripts\nn-graph-retrain-lifecycle.mjs'

# Prefer the portable node this PC uses; fall back to PATH then Program Files.
$nodeExe = $null
foreach ($cand in @('H:\Tools\nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) { $nodeExe = (Get-Command node -ErrorAction Stop).Source }

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Unregistered task: $TaskName"
  } else {
    Write-Host "Task not found (already uninstalled): $TaskName"
  }
  return
}

if (-not (Test-Path $lifecycleScript)) {
  throw "Retrain lifecycle script not found: $lifecycleScript (run on the PRISM host with H:\PRISM present, and ensure scripts/nn-graph-retrain-lifecycle.mjs is committed)."
}

# Sanity: confirm the script is the NN-GRAPH retrain lifecycle and understands
# the CLI flags this installer relies on.
$head = Get-Content $lifecycleScript -TotalCount 90 -ErrorAction SilentlyContinue
if (-not (($head -match 'NN-GRAPH-MS2') -and ($head -match '--status'))) {
  throw "Refusing to install: $lifecycleScript does not look like nn-graph-retrain-lifecycle.mjs (missing the NN-GRAPH-MS2 header / --status flag). Ensure it is the committed version (HEAD)."
}

# NOTE (slot:india 2026-06-15): selective-deploy auto-promote (PRISM_NN_SELECTIVE_PROMOTE)
# was TRIALED then REVERTED. A forced retrain scored eval AUROC 0.4286 (macroF1 0.1053 /
# Brier 0.2557) vs the single-seed 0.808 it was premised on -- disproving reproducible
# gate-clearance (high seed-variance on a non-separable problem; see the negative result
# U-NN-FEATURE-SEPARABILITY-CLOSE). Auto-promote stays OFF (opt-in only via the env var,
# default off) pending MULTI-SEED validation -- robustAboveGate guards across-tau, NOT
# across-seed, so auto-promoting a lucky seed would violate the multi-seed doctrine.
# See memory reference_gnn_selective_promote_disproven_2026_06_15.

# The lifecycle process loads the ~150 MB system-viz graph to fingerprint it
# and again (in a subprocess) to train -- 8 GB of heap is generous headroom.
# Burn-in mode bakes --dry-run into the task definition (machine-persistent,
# unlike the global PRISM_NN_RETRAIN_DRY_RUN env knob).
$nodeHeap = '--max-old-space-size=8192'
$lifecycleArgs = if ($DryRun) {
  "$nodeHeap `"$lifecycleScript`" --dry-run"
} else {
  "$nodeHeap `"$lifecycleScript`""
}
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $lifecycleArgs

# Two triggers: (1) the every-$EveryHours poll, anchored +$StartOffsetSeconds
# off install so it doesn't phase-lock onto the host's 5-min tasks; (2) an
# AtStartup trigger so a reboot resumes the lifecycle without waiting for the
# next -Once anchor.
$pollTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Hours $EveryHours) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$trigger = @($pollTrigger, $startupTrigger)

# ExecutionTimeLimit 30 min: a retrain is a multi-minute GraphSAGE training run
# plus two ~150 MB graph loads; 30 min is a generous ceiling that still kills a
# genuinely hung run. MultipleInstances IgnoreNew so a slow retrain never piles
# a second instance on itself (the lifecycle also holds its own PID lockfile —
# this is the belt, that is the suspenders). RestartCount/Interval self-heals a
# run that dies abnormally (host OOM mid-train) without waiting a full cycle.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 5) `
  -MultipleInstances IgnoreNew

# Principal — the autonomy fix. With NO principal (legacy -Interactive) the
# task's Logon Mode is "Interactive only": it does NOT run unless the installing
# user is logged in. Default hardens it:
#   S4U   = current user's security context, runs whether-logged-on-or-not, no
#           stored password.
#   SYSTEM (-AsSystem) = machine account.
# RunLevel Highest matches the elevated install context.
$principal = $null
if (-not $Interactive) {
  if ($AsSystem) {
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' `
      -LogonType ServiceAccount -RunLevel Highest
  } else {
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
      -LogonType S4U -RunLevel Highest
  }
}

$desc = "Autonomous GNN tier-5 self-retrain lifecycle (nn-graph-retrain-lifecycle.mjs$(if ($DryRun) { ' --dry-run [BURN-IN]' })). Every $EveryHours h: fingerprint the system-viz graph, drift-detect, and on drift train + evaluate a candidate GraphSAGE checkpoint — promoting it to the live checkpoint ONLY when every NN-GRAPH gate clears. Runs independent of Claude sessions. NN-GRAPH-MS2 U2."

# Splat so -Principal is omitted entirely in legacy -Interactive mode (passing
# -Principal $null throws; an absent key is the correct "no principal" form).
$registerParams = @{
  TaskName    = $TaskName
  Action      = $action
  Trigger     = $trigger
  Settings    = $settings
  Description = $desc
  Force       = $true
}
if ($principal) { $registerParams['Principal'] = $principal }
Register-ScheduledTask @registerParams | Out-Null

$mode = if ($DryRun) { 'DRY-RUN burn-in (never promotes)' } else { 'live' }
$autonomy = if ($Interactive) {
  'INTERACTIVE-ONLY (legacy — dies when you log off)'
} elseif ($AsSystem) {
  'AUTONOMOUS as SYSTEM (runs at boot + whether-logged-on-or-not)'
} else {
  'AUTONOMOUS as S4U (runs at boot + whether-logged-on-or-not)'
}
Write-Host "Registered: $TaskName ($mode, $autonomy, nn-graph-retrain-lifecycle.mjs, every $EveryHours h + AtStartup, +$($StartOffsetSeconds)s phase offset, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  # A retrain can take several minutes; LastTaskResult reads 267009 (0x41301 =
  # "running") until it finishes — poll past that rather than reporting a
  # misleading code. A SKIP (no drift) finishes in seconds.
  $deadline = (Get-Date).AddMinutes($RunNowTimeoutMinutes)
  do {
    Start-Sleep -Seconds 10
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate run — still running after $RunNowTimeoutMinutes min (LastTaskResult=267009). Check state/shared/nn-graph/retrain-lifecycle.jsonl."
  } else {
    Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult)"
  }
}

Write-Host ""
Write-Host "Knobs (env, read by the lifecycle — full list in the script header):"
Write-Host "  PRISM_NN_RETRAIN_DISABLE=1               lifecycle refuses to do anything (kill switch)"
Write-Host "  PRISM_NN_RETRAIN_DRY_RUN=1               train + evaluate, never promote"
Write-Host "  PRISM_NN_RETRAIN_MIN_NODE_DELTA_PCT=N    node-count drift band (default 10)"
Write-Host "  PRISM_NN_RETRAIN_MIN_EDGE_DELTA_PCT=N    edge-count drift band (default 10)"
Write-Host "  PRISM_NN_RETRAIN_MIN_GHOST_DELTA_PCT=N   ghost-pool drift band (default 25)"
Write-Host "  PRISM_NN_RETRAIN_MAX_AGE_HOURS=N         retrain-anyway floor (default 168)"
Write-Host ""
Write-Host "Verify registered:           schtasks /Query /TN '$TaskName'"
Write-Host "Inspect lifecycle state:     & '$nodeExe' '$lifecycleScript' --status"
Write-Host "Watch retrain ledger:        Get-Content H:/PRISM/state/shared/nn-graph/retrain-lifecycle.jsonl -Tail 20 -Wait"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-nn-graph-retrain-task.ps1' -Uninstall"
