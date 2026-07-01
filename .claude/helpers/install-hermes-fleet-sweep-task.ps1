# install-hermes-fleet-sweep-task.ps1 -- register the PRISM Hermes Fleet Sweep scheduled task.
#
# !! OPERATOR-ELEVATED ACTION -- do NOT run from automated tooling without operator review !!
#
# Registers a Windows scheduled task that PERIODICALLY runs the idle Hermes FLEET SWEEP
# (scripts/hermes-fleet-sweep.mjs -- HERMES-FLEET-MAXOUT/U-CRON). Each eligible tick fires the
# proven hermes-work-loop-driver (-> parallel Hermes agents on the FREE NVIDIA lane + Obsidian
# vault) over the next batch of OPEN fleet units, quota-aware (daily budget + min-interval +
# idle-scaled width), so the fleet "covers more ground" autonomously, $0 / off-Claude.
#
# DEFAULT-OFF (conservative until the NVIDIA NGC quota is characterized). Two independent gates,
# BOTH cleared only by -GateEnv:
#   1. The operator must RUN THIS INSTALLER (elevated). It is wired to no cron/hook/SessionStart.
#   2. The operator must pass -GateEnv -> sets PRISM_HERMES_FLEET_SWEEP=1 in the task env (ARMS spawns).
#      Without it the task PLANS every tick + records a "would-fire" ledger row but SPAWNS NOTHING
#      (exit 0, no Hermes calls, no harm).
#   Plus: -DryRun previews with no changes; -Uninstall removes the task (no owned data files
#   beyond the advisory state/ledger under state/shared/).
#
# RUNTIME: the sweep itself is plain .mjs (bare node OK). It SHELLS OUT to the .mts driver via tsx
#   internally, so only node is needed here (no tsx on the task action).
#
# Mirrors install-hermes-autonomous-drive-task.ps1 conventions (S4U principal, restart-on-fail,
#   IgnoreNew, COM env, -Uninstall/-DryRun). Idempotent: re-running re-registers (-Force).
#
# Usage (one elevated run):
#   powershell -NoProfile -ExecutionPolicy Bypass `
#     -File H:/prism/.claude/helpers/install-hermes-fleet-sweep-task.ps1 -GateEnv
#   powershell ... -DryRun         # preview only, no changes
#   powershell ... -Uninstall      # remove the task

param(
  [string] $TaskName        = "PRISM Hermes Fleet Sweep",
  [int]    $IntervalHours   = 2,
  [int]    $StartOffsetSecs = 900,
  [int]    $DailyBudget     = 300,   # max Hermes agent calls per UTC day (PRISM_HERMES_SWEEP_DAILY_BUDGET)
  [int]    $MaxUnits        = 6,     # cap units per sweep    (PRISM_HERMES_SWEEP_MAX_UNITS)
  [int]    $MaxParallel     = 2,     # cloud-lane rate cap    (PRISM_HERMES_SWEEP_MAX_PARALLEL)
  [switch] $GateEnv,        # when set, adds PRISM_HERMES_FLEET_SWEEP=1 to the task env (ARMS spawns)
  [switch] $Interactive,    # run as current user instead of SYSTEM / S4U
  [switch] $RunNow,         # kick an immediate run after registration
  [switch] $Uninstall,
  [switch] $DryRun
)

$ErrorActionPreference = 'Stop'
$GATE_ENV_NAME = 'PRISM_HERMES_FLEET_SWEEP'

# -- locate node + the sweep script ---------------------------------------------
$Node = 'H:/.claude/bin/portable-node/node.exe'
if (-not (Test-Path $Node)) {
  $found = Get-Command node -ErrorAction SilentlyContinue
  $Node  = if ($found) { $found.Source } else { $null }
}
$Script = 'H:/prism/scripts/hermes-fleet-sweep.mjs'

# -- uninstall -------------------------------------------------------------------
if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[hermes-fleet-sweep-task] uninstalled scheduled task '$TaskName'"
  } else {
    Write-Host "[hermes-fleet-sweep-task] no task '$TaskName' to uninstall"
  }
  return
}

# -- pre-flight ------------------------------------------------------------------
if (-not $Node)               { throw "node.exe not found (portable-node or PATH)" }
if (-not (Test-Path $Script)) { throw "hermes-fleet-sweep.mjs not found at $Script" }

# -- task action: node <sweep.mjs> --json --quiet --------------------------------
$CliArgs = ("`"$Script`"", "--json", "--quiet") -join " "
$Action = New-ScheduledTaskAction -Execute $Node -Argument $CliArgs -WorkingDirectory 'H:/prism'

# -- triggers: repeating interval + AtStartup -----------------------------------
$startAt      = (Get-Date).AddSeconds($StartOffsetSecs)
$repeat       = New-TimeSpan -Hours $IntervalHours
$trigInterval = New-ScheduledTaskTrigger -Once -At $startAt `
  -RepetitionInterval $repeat -RepetitionDuration ([TimeSpan]::MaxValue)
$trigStartup  = New-ScheduledTaskTrigger -AtStartup

# -- settings --------------------------------------------------------------------
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

# -- task env: arming gate + the quota knobs ------------------------------------
$envVars = @{
  "PRISM_HERMES_SWEEP_DAILY_BUDGET" = "$DailyBudget"
  "PRISM_HERMES_SWEEP_MAX_UNITS"    = "$MaxUnits"
  "PRISM_HERMES_SWEEP_MAX_PARALLEL" = "$MaxParallel"
}
if ($GateEnv) {
  $envVars[$GATE_ENV_NAME] = "1"
  Write-Host "[hermes-fleet-sweep-task] NOTICE: arming $GATE_ENV_NAME=1 -- sweeps WILL spawn Hermes waves when eligible."
} else {
  Write-Host "[hermes-fleet-sweep-task] INFO: $GATE_ENV_NAME NOT set -- sweeps plan + record 'would-fire' only (no Hermes calls) until -GateEnv."
}

$description = (
  "PRISM Hermes Fleet Sweep: periodically fires the gated hermes-work-loop-driver (parallel Hermes " +
  "agents on the FREE NVIDIA lane + Obsidian vault) over open fleet units, quota-aware. Arming gate: " +
  "$GATE_ENV_NAME must be 1. Source: scripts/hermes-fleet-sweep.mjs (HERMES-FLEET-MAXOUT/U-CRON)."
)

$register = @{
  TaskName = $TaskName; Action = $Action; Trigger = @($trigInterval, $trigStartup)
  Settings = $settings; Description = $description; Force = $true
}
if (-not $Interactive) {
  $register.Principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
}

if ($DryRun) {
  Write-Host "[hermes-fleet-sweep-task] DRY-RUN -- would register '$TaskName':"
  Write-Host "  node:      $Node"
  Write-Host "  script:    $Script"
  Write-Host "  args:      $CliArgs"
  Write-Host "  cadence:   every $IntervalHours h, first run +$StartOffsetSecs s, +AtStartup"
  Write-Host "  principal: $(if ($Interactive) { 'interactive (current user)' } else { 'SYSTEM / S4U RunLevel Highest' })"
  Write-Host "  gate env:  $(if ($GateEnv) { "$GATE_ENV_NAME=1 (ARMED)" } else { '(not set -- plan-only / would-fire mode)' })"
  Write-Host "  budget:    $DailyBudget calls/UTC-day, <=$MaxUnits units/sweep, <=$MaxParallel parallel"
  return
}

Register-ScheduledTask @register | Out-Null
Write-Host "[hermes-fleet-sweep-task] registered '$TaskName' (every $IntervalHours h, +$StartOffsetSecs s offset, +AtStartup)"
Write-Host "  gate: $(if ($GateEnv) { "ARMED ($GATE_ENV_NAME=1)" } else { 'PLAN-ONLY mode (set -GateEnv to arm)' })"

# -- apply task env vars via COM (best-effort; non-fatal) -----------------------
try {
  $svc = New-Object -ComObject "Schedule.Service"; $svc.Connect()
  $folder = $svc.GetFolder("\"); $task = $folder.GetTask($TaskName); $def = $task.Definition
  foreach ($kv in $envVars.GetEnumerator()) { $def.EnvironmentVariables.Value($kv.Key, $kv.Value) }
  $logon = if ($Interactive) { 4 } else { 6 }   # 6 = S4U service account, 4 = interactive token
  $folder.RegisterTaskDefinition($TaskName, $def, 4, $null, $null, $logon) | Out-Null
  Write-Host "[hermes-fleet-sweep-task] task environment variables applied via COM"
} catch {
  Write-Warning "[hermes-fleet-sweep-task] could not apply env vars via COM: $($_.Exception.Message)"
  Write-Warning "  Set $GATE_ENV_NAME=1 at the system level or re-run with -Interactive if needed."
}

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "[hermes-fleet-sweep-task] kicked an immediate run of '$TaskName'"
  Write-Host "  Monitor: Get-ScheduledTaskInfo -TaskName '$TaskName'"
}
