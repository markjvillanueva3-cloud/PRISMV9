# install-hermes-autonomous-drive-task.ps1 -- register the PRISM Hermes Autonomous Drive scheduled task.
#
# !! OPERATOR-ELEVATED ACTION -- do NOT run from automated tooling without operator review !!
#
# Registers a Windows scheduled task that PERIODICALLY INVOKES the GATED autonomous-drive CLI
# (scripts/hermes-autonomous-drive.mts -- zulu's HERMES-UTIL/U-HERMES-DRIVE-CLI, run via tsx).
# The task will NOT execute autonomous agent waves unless PRISM_HERMES_AUTONOMOUS_DRIVE=1 is set
# in the task environment (the runner-level safety gate, HermesAutonomousDriveRunnerEngine). This
# installer DOES NOT set that env automatically -- the operator must pass -GateEnv explicitly.
#
# WHY this exists (HERMES-UTIL completion, 2026-06-28 slot:sierra, operator "do it all"):
#   zulu shipped the full autonomous stack (driver + runner + gated .mts CLI with live E2E) but
#   DELIBERATELY did not add a scheduler ("Install never auto-fires an autonomous agent wave").
#   This installer is the operator-armed trigger for that CLI -- still default-off (3 independent
#   gates below), reversible (-Uninstall), and never auto-registered.
#
# SAFETY INVARIANTS (three independent gates -- ALL must be deliberately cleared to fire waves):
#   1. The operator must RUN THIS INSTALLER (elevated). It is not wired to any cron/hook/SessionStart.
#   2. The operator must pass -GateEnv, which sets PRISM_HERMES_AUTONOMOUS_DRIVE=1 in the task env.
#      Without it the task runs gate-refused every fire (CLI prints {ran:false,gated:true}, exit 0, no harm).
#   3. The .mts CLI itself re-checks the env gate (belt-and-suspenders) before any wave executes.
#   Plus: -DryRun previews with no changes; -Uninstall removes the task (no owned data files).
#
# RUNTIME: the CLI is TypeScript (.mts) and MUST run via tsx (bare node hits the Node-24 dynamic
#   import trap -- reference_charlie_train_cycle_tsx_reexec_2026_06_22). The task therefore invokes
#   `node <tsx-cli> <script> ...`, not bare node on the script.
#
# Mirrors the .claude/helpers/install-hermes-*-task.ps1 conventions (S4U principal, restart-on-fail,
#   IgnoreNew, ExecutionTimeLimit). Idempotent: re-running with the same -TaskName re-registers.
#
# Usage (one elevated run):
#   powershell -NoProfile -ExecutionPolicy Bypass `
#     -File H:/prism/.claude/helpers/install-hermes-autonomous-drive-task.ps1 `
#     -Goal "Harden speed-feed gauntlet across all ISO groups" -GateEnv
#   powershell ... -DryRun         # preview only, no changes
#   powershell ... -Uninstall      # remove the task

param(
  [string] $Goal            = "",
  [string] $TaskName        = "PRISM Hermes Autonomous Drive",
  [string] $OllamaModel     = "qwen2.5-coder:32b",
  [int]    $IntervalHours   = 6,
  [int]    $StartOffsetSecs = 600,
  [int]    $MaxParallel     = 3,
  [int]    $MaxRetries      = 1,
  [int]    $TimeoutMs       = 180000,
  [switch] $GateEnv,        # when set, adds PRISM_HERMES_AUTONOMOUS_DRIVE=1 to the task env (ARMS waves)
  [switch] $Interactive,    # run as the current user instead of SYSTEM / S4U
  [switch] $RunNow,         # kick an immediate run after registration
  [switch] $Uninstall,
  [switch] $DryRun
)

$ErrorActionPreference = 'Stop'
$GATE_ENV_NAME = 'PRISM_HERMES_AUTONOMOUS_DRIVE'

# -- locate node + tsx + the .mts CLI --------------------------------------------
$Node = 'H:/.claude/bin/portable-node/node.exe'
if (-not (Test-Path $Node)) {
  $found = Get-Command node -ErrorAction SilentlyContinue
  $Node  = if ($found) { $found.Source } else { $null }
}
$TsxCli = 'H:/prism/mcp-server/node_modules/tsx/dist/cli.mjs'
$Script = 'H:/prism/scripts/hermes-autonomous-drive.mts'

# -- uninstall -------------------------------------------------------------------
if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[hermes-drive-task] uninstalled scheduled task '$TaskName'"
  } else {
    Write-Host "[hermes-drive-task] no task '$TaskName' to uninstall"
  }
  return
}

# -- pre-flight checks -----------------------------------------------------------
if (-not $Node)               { throw "node.exe not found (portable-node or PATH)" }
if (-not (Test-Path $TsxCli)) { throw "tsx CLI not found at $TsxCli (run npm install in mcp-server)" }
if (-not (Test-Path $Script)) { throw "hermes-autonomous-drive.mts not found at $Script" }
if (-not $DryRun -and $Goal.Trim() -eq "") {
  throw "-Goal is required when registering the task (provide a non-empty goal string)"
}

# -- build the task action -------------------------------------------------------
# Invocation: node <tsx-cli> <.mts script> <flags>. Flags match the .mts CLI
# (argVal: --goal --model --max-parallel --timeout-ms --max-retries). Arming is via
# the env gate (PRISM_HERMES_AUTONOMOUS_DRIVE), NOT a --gate flag, so -GateEnv is the
# single arming control; without it the CLI is gated-off and exits harmlessly.
$CliArgs = (
  "`"$TsxCli`"",
  "`"$Script`"",
  "--goal `"$Goal`"",
  "--model `"$OllamaModel`"",
  "--max-parallel $MaxParallel",
  "--max-retries $MaxRetries",
  "--timeout-ms $TimeoutMs"
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
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)

# -- env variables for the task (gate + Ollama) ---------------------------------
$envVars = @{ "OLLAMA_URL" = ($env:OLLAMA_URL ?? "http://127.0.0.1:11434") }
if ($GateEnv) {
  $envVars[$GATE_ENV_NAME] = "1"
  Write-Host "[hermes-drive-task] NOTICE: arming $GATE_ENV_NAME=1 in task environment."
  Write-Host "  Autonomous agent waves WILL execute when the task fires."
} else {
  Write-Host "[hermes-drive-task] INFO: $GATE_ENV_NAME is NOT set in the task environment."
  Write-Host "  The task runs gate-refused (CLI exits {ran:false,gated:true}, no harm) until -GateEnv is passed."
}

$description = (
  "PRISM Hermes Autonomous Drive: drives a goal via HermesAutonomousDriveRunnerEngine (wave-scheduled " +
  "Ollama executor). Safety gate: $GATE_ENV_NAME must be 1 for execution. Source: scripts/hermes-autonomous-drive.mts " +
  "(run via tsx). Goal: $Goal"
)

$register = @{
  TaskName = $TaskName; Action = $Action; Trigger = @($trigInterval, $trigStartup)
  Settings = $settings; Description = $description; Force = $true
}
if (-not $Interactive) {
  $register.Principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
}

if ($DryRun) {
  Write-Host "[hermes-drive-task] DRY-RUN -- would register '$TaskName':"
  Write-Host "  node:      $Node"
  Write-Host "  tsx:       $TsxCli"
  Write-Host "  script:    $Script"
  Write-Host "  args:      $CliArgs"
  Write-Host "  cadence:   every $IntervalHours h, first run +$StartOffsetSecs s, +AtStartup"
  Write-Host "  principal: $(if ($Interactive) { 'interactive (current user)' } else { 'SYSTEM / S4U RunLevel Highest' })"
  Write-Host "  gate env:  $(if ($GateEnv) { "$GATE_ENV_NAME=1 (ARMED)" } else { '(not set -- gate-refused mode)' })"
  Write-Host "  goal:      $(if ($Goal) { $Goal } else { '(not specified -- provide -Goal when registering)' })"
  return
}

Register-ScheduledTask @register | Out-Null
Write-Host "[hermes-drive-task] registered '$TaskName' (every $IntervalHours h, +$StartOffsetSecs s offset, +AtStartup)"
Write-Host "  gate: $(if ($GateEnv) { "ARMED ($GATE_ENV_NAME=1)" } else { 'REFUSED mode (set -GateEnv to arm)' })"

# -- apply task env vars via COM (best-effort; non-fatal) -----------------------
try {
  $svc = New-Object -ComObject "Schedule.Service"; $svc.Connect()
  $folder = $svc.GetFolder("\"); $task = $folder.GetTask($TaskName); $def = $task.Definition
  foreach ($kv in $envVars.GetEnumerator()) { $def.EnvironmentVariables.Value($kv.Key, $kv.Value) }
  $logon = if ($Interactive) { 4 } else { 6 }   # 6 = S4U service account, 4 = interactive token
  $folder.RegisterTaskDefinition($TaskName, $def, 4, $null, $null, $logon) | Out-Null
  Write-Host "[hermes-drive-task] task environment variables applied via COM"
} catch {
  Write-Warning "[hermes-drive-task] could not apply env vars via COM: $($_.Exception.Message)"
  Write-Warning "  Set $GATE_ENV_NAME=1 at the system level or re-run with -Interactive if needed."
}

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "[hermes-drive-task] kicked an immediate run of '$TaskName'"
  Write-Host "  Monitor: Get-ScheduledTaskInfo -TaskName '$TaskName'"
}
