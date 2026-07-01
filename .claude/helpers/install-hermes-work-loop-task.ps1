# install-hermes-work-loop-task.ps1 -- register the PRISM Hermes Work Loop scheduled task.
#
# !! OPERATOR-ELEVATED ACTION -- do NOT run from automated tooling without operator review !!
#
# Registers a Windows scheduled task that PERIODICALLY INVOKES the plan+draft-ONLY parallel Hermes
# work loop (scripts/hermes-work-loop-driver.mts, run via tsx). The loop reads open PRISM work units
# (roadmap / research / wiring sources), dedupes against live slot-task claims, fires N parallel
# Hermes agents (cloud Grok reasoning / local Ollama) with Obsidian-vault + PRISM-MCP context, and
# writes each agent's PLAN + DRAFT to state/shared/hermes-work-loop-ledger.jsonl for a HUMAN to
# review + commit. It NEVER commits code (operator decision: "Plan + draft only, human commits").
#
# The task will NOT execute agent waves unless PRISM_HERMES_AUTONOMOUS_DRIVE=1 is set in the task
# environment (the runner-level safety gate, HermesAutonomousDriveRunnerEngine -- the SAME gate the
# autonomous-drive task reuses; the work-loop driver passes it through, adds no second gate). This
# installer DOES NOT set that env automatically -- the operator must pass -GateEnv explicitly.
#
# WHY this exists (HERMES-WORK-LOOP-MS0/U5, operator "utilize engineered loops, harnesses and crons
#   to launch parallel hermes agents ... to help speed up tasks"): the work-loop driver (U4) ships
#   the gated harness; this installer is the operator-armed cron trigger -- still default-off (3
#   independent gates below), reversible (-Uninstall), and never auto-registered.
#
# SAFETY INVARIANTS (three independent gates -- ALL must be deliberately cleared to fire waves):
#   1. The operator must RUN THIS INSTALLER (elevated). It is not wired to any cron/hook/SessionStart.
#   2. The operator must pass -GateEnv, which sets PRISM_HERMES_AUTONOMOUS_DRIVE=1 in the task env.
#      Without it the task runs gate-refused every fire (driver prints {driveRan:false}, exit 0, no harm).
#   3. The .mts driver passes the env gate to the runner, which re-checks it before any wave executes.
#   Plus: -DryRun previews with no changes; -Uninstall removes the task. AND -- regardless of the gate
#   -- the loop NEVER commits code (committed:false on every ledger row); the worst a fully-armed run
#   does is write plan/draft ledger rows + fire read-only ask-hermes agents.
#
# RUNTIME: the driver is TypeScript (.mts) and MUST run via tsx (bare node hits the Node-24 dynamic
#   import trap -- the driver self-reexecs under tsx, but the task invokes tsx directly to be explicit).
#
# Mirrors .claude/helpers/install-hermes-autonomous-drive-task.ps1 (clone-don't-fork, R8).
# Idempotent: re-running with the same -TaskName re-registers.
#
# Usage (one elevated run):
#   powershell -NoProfile -ExecutionPolicy Bypass `
#     -File H:/prism/.claude/helpers/install-hermes-work-loop-task.ps1 -GateEnv
#   powershell ... -DryRun         # preview only, no changes
#   powershell ... -Uninstall      # remove the task

param(
  [string] $TaskName        = "PRISM Hermes Work Loop",
  [int]    $IntervalHours   = 4,
  [int]    $StartOffsetSecs = 900,
  [int]    $MaxUnits        = 6,
  [int]    $MaxParallel     = 3,
  [switch] $GateEnv,        # when set, adds PRISM_HERMES_AUTONOMOUS_DRIVE=1 to the task env (ARMS waves)
  [switch] $Interactive,    # run as the current user instead of SYSTEM / S4U
  [switch] $RunNow,         # kick an immediate run after registration
  [switch] $Uninstall,
  [switch] $DryRun
)

$ErrorActionPreference = 'Stop'
$GATE_ENV_NAME = 'PRISM_HERMES_AUTONOMOUS_DRIVE'

# -- locate node + tsx + the .mts driver -----------------------------------------
$Node = 'H:/.claude/bin/portable-node/node.exe'
if (-not (Test-Path $Node)) {
  $found = Get-Command node -ErrorAction SilentlyContinue
  $Node  = if ($found) { $found.Source } else { $null }
}
$TsxCli = 'H:/prism/mcp-server/node_modules/tsx/dist/cli.mjs'
$Script = 'H:/prism/scripts/hermes-work-loop-driver.mts'

# -- uninstall -------------------------------------------------------------------
if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[hermes-work-loop-task] uninstalled scheduled task '$TaskName'"
  } else {
    Write-Host "[hermes-work-loop-task] no task '$TaskName' to uninstall"
  }
  return
}

# -- pre-flight checks -----------------------------------------------------------
if (-not $Node)               { throw "node.exe not found (portable-node or PATH)" }
if (-not (Test-Path $TsxCli)) { throw "tsx CLI not found at $TsxCli (run npm install in mcp-server)" }
if (-not (Test-Path $Script)) { throw "hermes-work-loop-driver.mts not found at $Script" }

# -- build the task action -------------------------------------------------------
# Invocation: node <tsx-cli> <.mts driver> <flags>. The driver auto-discovers work units from the
# 4 sources (no --goal). We deliberately do NOT pass --gate: arming is governed SOLELY by the env
# gate PRISM_HERMES_AUTONOMOUS_DRIVE, which -GateEnv sets in the task environment. So -GateEnv is the
# single arming authority -- without it the env is absent and the driver runs gate-refused (the
# runner's parseArgs reads gate = --gate OR env; with neither, gate is false and the wave does not
# fire). This keeps the operator's intent captured by exactly one control (-GateEnv).
$CliArgs = (
  "`"$TsxCli`"",
  "`"$Script`"",
  "--max-units $MaxUnits",
  "--max-parallel $MaxParallel",
  "--json"
) -join " "

$Action = New-ScheduledTaskAction -Execute $Node -Argument $CliArgs -WorkingDirectory 'H:/prism'

# -- triggers: repeating interval + AtStartup -----------------------------------
$startAt      = (Get-Date).AddSeconds($StartOffsetSecs)
$repeat       = New-TimeSpan -Hours $IntervalHours
$trigInterval = New-ScheduledTaskTrigger -Once -At $startAt `
  -RepetitionInterval $repeat -RepetitionDuration ([TimeSpan]::MaxValue)
$trigStartup  = New-ScheduledTaskTrigger -AtStartup

# -- task settings ---------------------------------------------------------------
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# -- env variables for the task (gate + Ollama) ---------------------------------
# Windows PowerShell 5.1 lacks the `??` null-coalescing operator (pwsh 7+ only); the usage
# examples invoke `powershell` (5.1), so use an if-expression instead.
$ollamaUrl = if ($env:OLLAMA_URL) { $env:OLLAMA_URL } else { "http://127.0.0.1:11434" }
$envVars = @{ "OLLAMA_URL" = $ollamaUrl }
if ($GateEnv) {
  $envVars[$GATE_ENV_NAME] = "1"
  Write-Host "[hermes-work-loop-task] NOTICE: arming $GATE_ENV_NAME=1 in task environment."
  Write-Host "  Hermes agent waves WILL fire when the task runs (still plan+draft-only -- NEVER commits)."
} else {
  Write-Host "[hermes-work-loop-task] INFO: $GATE_ENV_NAME is NOT set in the task environment."
  Write-Host "  The task runs gate-refused (driver exits {driveRan:false}, no harm) until -GateEnv is passed."
}

$description = (
  "PRISM Hermes Work Loop: plan+draft-ONLY parallel Hermes agents over open PRISM work units " +
  "(vault + PRISM-MCP context); writes plan/draft to state/shared/hermes-work-loop-ledger.jsonl for " +
  "HUMAN review -- NEVER commits code. Safety gate: $GATE_ENV_NAME must be 1 to fire waves. " +
  "Source: scripts/hermes-work-loop-driver.mts (run via tsx)."
)

$register = @{
  TaskName = $TaskName; Action = $Action; Trigger = @($trigInterval, $trigStartup)
  Settings = $settings; Description = $description; Force = $true
}
if (-not $Interactive) {
  $register.Principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
}

if ($DryRun) {
  Write-Host "[hermes-work-loop-task] DRY-RUN -- would register '$TaskName':"
  Write-Host "  node:      $Node"
  Write-Host "  tsx:       $TsxCli"
  Write-Host "  script:    $Script"
  Write-Host "  args:      $CliArgs"
  Write-Host "  cadence:   every $IntervalHours h, first run +$StartOffsetSecs s, +AtStartup"
  Write-Host "  principal: $(if ($Interactive) { 'interactive (current user)' } else { 'SYSTEM / S4U RunLevel Highest' })"
  Write-Host "  gate env:  $(if ($GateEnv) { "$GATE_ENV_NAME=1 (ARMED)" } else { '(not set -- gate-refused mode)' })"
  Write-Host "  ledger:    H:/prism/state/shared/hermes-work-loop-ledger.jsonl (plan+draft only, NEVER commits)"
  return
}

Register-ScheduledTask @register | Out-Null
Write-Host "[hermes-work-loop-task] registered '$TaskName' (every $IntervalHours h, +$StartOffsetSecs s offset, +AtStartup)"
Write-Host "  gate: $(if ($GateEnv) { "ARMED ($GATE_ENV_NAME=1)" } else { 'REFUSED mode (set -GateEnv to arm)' })"

# -- apply task env vars via COM (best-effort; non-fatal) -----------------------
try {
  $svc = New-Object -ComObject "Schedule.Service"; $svc.Connect()
  $folder = $svc.GetFolder("\"); $task = $folder.GetTask($TaskName); $def = $task.Definition
  foreach ($kv in $envVars.GetEnumerator()) { $def.EnvironmentVariables.Value($kv.Key, $kv.Value) }
  $logon = if ($Interactive) { 4 } else { 6 }   # 6 = S4U service account, 4 = interactive token
  $folder.RegisterTaskDefinition($TaskName, $def, 4, $null, $null, $logon) | Out-Null
  Write-Host "[hermes-work-loop-task] task environment variables applied via COM"
} catch {
  Write-Warning "[hermes-work-loop-task] could not apply env vars via COM: $($_.Exception.Message)"
  Write-Warning "  Set $GATE_ENV_NAME=1 at the system level or re-run with -Interactive if needed."
}

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "[hermes-work-loop-task] kicked an immediate run of '$TaskName'"
  Write-Host "  Monitor: Get-ScheduledTaskInfo -TaskName '$TaskName'"
}
