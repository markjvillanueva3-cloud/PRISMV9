# daily-context-cron.ps1
#
# OBSIDIAN-INTELLIGENCE-MS3/B1/U-DAILY-CONTEXT-WORKFLOW — scheduled-task wrapper.
#
# Installs / runs / uninstalls the 6 AM cron that writes
# `knowledge/memories/generated/DAILY-CONTEXT-YYYY-MM-DD.md` via
# `scripts/run-daily-context.mjs`. Idempotent (re-running just refreshes
# the scheduled task). Reversible via -Uninstall.
#
# Usage:
#   pwsh -File scripts/cron/daily-context-cron.ps1                 # register task (6 AM daily)
#   pwsh -File scripts/cron/daily-context-cron.ps1 -RunNow         # register + fire once (install-and-verify)
#   pwsh -File scripts/cron/daily-context-cron.ps1 -RunOnce        # run once, do NOT register anything
#   pwsh -File scripts/cron/daily-context-cron.ps1 -DryRun         # show what would change
#   pwsh -File scripts/cron/daily-context-cron.ps1 -NoOllama       # task uses literal mode
#   pwsh -File scripts/cron/daily-context-cron.ps1 -At "07:30"     # different schedule
#   pwsh -File scripts/cron/daily-context-cron.ps1 -Uninstall      # remove task
#
# Logs land in state/shared/daily-context-cron.jsonl (one JSON line per run).

[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$Uninstall,
  [switch]$RunNow,    # register task + fire it immediately
  [switch]$RunOnce,   # invoke runner once without registering anything
  [switch]$NoOllama,
  [string]$TaskName = "PRISM Daily Context Brief",
  [string]$RepoRoot = "H:/prism",
  [string]$At = "06:00",
  [string]$NodeExe = "H:\.claude\bin\portable-node"
)

$ErrorActionPreference = "Stop"

function Write-Step($m) { Write-Host "▸ $m" -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host "  ✓ $m" -ForegroundColor Green }
function Write-Warn2($m){ Write-Host "  ! $m" -ForegroundColor Yellow }

# ---- helpers ----------------------------------------------------------------

function Get-RunnerPath {
  $p = Join-Path $RepoRoot "scripts/run-daily-context.mjs"
  if (-not (Test-Path $p)) {
    throw "runner not found: $p"
  }
  return (Resolve-Path $p).Path
}

function Get-NodeExe {
  # Kept as a thin alias of Resolve-NodeExe for back-compat with the docstring.
  return (Resolve-NodeExe)
}

function Build-RunnerArgs {
  # NOTE: do NOT name this `$args` — that's a PowerShell automatic variable
  # (function param array). Shadowing it works but trips PSScriptAnalyzer
  # `PSAvoidAssignmentToAutomaticVariable` and is fragile under StrictMode.
  $runnerArgs = @()
  if ($NoOllama) { $runnerArgs += "--no-ollama" }
  $runnerArgs += "--json"
  return $runnerArgs
}

function Resolve-NodeExe {
  # Precedence: $env:PRISM_NODE > -NodeExe param > 'node' on PATH.
  # Fail loud per CLAUDE.md feedback_precompact_bare_node_enoent.
  if ($env:PRISM_NODE -and (Test-Path $env:PRISM_NODE)) { return $env:PRISM_NODE }
  if (Test-Path $NodeExe) { return $NodeExe }
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($null -ne $cmd) { return $cmd.Source }
  throw "Node executable not found. Tried `$env:PRISM_NODE='$($env:PRISM_NODE)', '$NodeExe', and 'node' on PATH."
}

function Assert-NodeVersion([string]$node) {
  # tsx/esm/api requires Node >= 18.5. Fail loud before scheduling a task that
  # would silently die at 6 AM with a cryptic import error.
  $out = & $node --version 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $out) {
    throw "Node version probe failed for '$node'"
  }
  $clean = $out.TrimStart('v')
  $major = [int]($clean.Split('.')[0])
  if ($major -lt 18) {
    throw "Node $clean too old — runner needs >= 18.5 for tsx/esm/api (found '$node')"
  }
}

# ---- uninstall --------------------------------------------------------------

if ($Uninstall) {
  Write-Step "Uninstall mode — removing scheduled task '$TaskName'"
  if ($DryRun) {
    Write-Warn2 "DRY-RUN: would Unregister-ScheduledTask -TaskName '$TaskName'"
    exit 0
  }
  try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
    Write-Ok "Scheduled task removed"
  } catch {
    Write-Warn2 "Task '$TaskName' was not registered (nothing to remove)"
  }
  exit 0
}

# NOTE: -RunNow no longer exits early. It means "register the task then fire
# once" so the operator can install + verify in a single invocation. To run
# without registering, use -RunOnce.

if ($RunOnce) {
  Write-Step "Run-once mode — invoking runner directly (no scheduler registration)"
  $node = Get-NodeExe
  Assert-NodeVersion $node
  $runner = Get-RunnerPath
  $runOnceArgs = @($runner) + (Build-RunnerArgs)
  if ($DryRun) {
    Write-Warn2 "DRY-RUN: would invoke: $node $($runOnceArgs -join ' ')"
    exit 0
  }
  & $node $runOnceArgs
  exit $LASTEXITCODE
}

# ---- register scheduled task ------------------------------------------------

Write-Step "Registering scheduled task '$TaskName' at $At daily"
$node = Get-NodeExe
Assert-NodeVersion $node
$runner = Get-RunnerPath
$argList = @($runner) + (Build-RunnerArgs)
$argString = ($argList | ForEach-Object {
  if ($_ -match '\s') { "`"$_`"" } else { $_ }
}) -join ' '

Write-Ok "Node:    $node"
Write-Ok "Runner:  $runner"
Write-Ok "Args:    $argString"
Write-Ok "When:    daily at $At"

if ($DryRun) {
  Write-Warn2 "DRY-RUN: would Register-ScheduledTask"
  exit 0
}

# Stop on registration errors so the operator sees the failure loud.
$action = New-ScheduledTaskAction -Execute $node -Argument $argString -WorkingDirectory $RepoRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RunOnlyIfNetworkAvailable:$false `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
  -MultipleInstances IgnoreNew
# RestartCount intentionally NOT set: it interacts badly with `IgnoreNew`
# (restart attempts get silently dropped) and the cron fires daily anyway,
# so a one-off failure simply waits 24 h for the next try. The runner is
# idempotent per day-key, so no harm even if the operator re-fires manually.

# Best-effort highest-rights principal (no admin required if the cron only
# touches the repo). If S4U is available we use it so the task runs even when
# the operator isn't logged on.
$principal = $null
try {
  $principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType S4U -RunLevel Highest
} catch {
  Write-Warn2 "S4U principal unavailable — task will run interactive-only"
}

$splat = @{
  TaskName    = $TaskName
  Action      = $action
  Trigger     = $trigger
  Settings    = $settings
  Description = "Daily Context Brief — OBSIDIAN-INTELLIGENCE-MS3/B1 — writes knowledge/memories/generated/DAILY-CONTEXT-YYYY-MM-DD.md"
  Force       = $true
}
if ($null -ne $principal) { $splat["Principal"] = $principal }

Register-ScheduledTask @splat | Out-Null
Write-Ok "Registered. Inspect with: Get-ScheduledTask -TaskName '$TaskName' | Select-Object TaskName,State,@{N='NextRun';E={(Get-ScheduledTaskInfo -TaskName `$_.TaskName).NextRunTime}}"

if ($RunNow) {
  Write-Step "Starting task immediately"
  Start-ScheduledTask -TaskName $TaskName
  Write-Ok "Task started — check log at $RepoRoot/state/shared/daily-context-cron.jsonl"
}
