<#
.SYNOPSIS
  install-cron-schedule.ps1 — INTEL-OLLAMA-OBSIDIAN-MS0/P11-U03

.DESCRIPTION
  Registers Windows Task Scheduler entries for the canonical PRISM dev
  scripts listed in scripts/lib/cron-schedule-plan.mjs. Each task runs
  the named .mjs via portable node, captures stdout/stderr to
  data/state/cron-runs.jsonl, and uses the schedule kind (daily / hourly
  / weekly / monthly) declared by the JS planner.

  Why a PS1: schtasks.exe is the only first-class scheduling primitive on
  Windows. The actual planning (which scripts, what schedule, do they
  exist on this box) is done in JS so it can be unit-tested.

.PARAMETER DryRun
  Show what would be installed; do not call schtasks.

.PARAMETER Uninstall
  Remove all PRISM-prefixed scheduled tasks instead of installing.

.PARAMETER LogFile
  Append every install/uninstall outcome to this JSONL file. Defaults to
  H:\prism-iooms0\mcp-server\data\state\cron-runs.jsonl

.PARAMETER NodeExe
  Path to portable node. Defaults to H:\Tools\nodejs\node.exe.

.EXAMPLE
  pwsh -File scripts/install-cron-schedule.ps1 -DryRun
  pwsh -File scripts/install-cron-schedule.ps1
  pwsh -File scripts/install-cron-schedule.ps1 -Uninstall
#>

[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$Uninstall,
  [string]$LogFile = "H:\prism-iooms0\mcp-server\data\state\cron-runs.jsonl",
  [string]$NodeExe = "H:\Tools\nodejs\node.exe"
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Repo root — assume this script lives at <repo>/scripts/install-cron-schedule.ps1
# ---------------------------------------------------------------------------
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$PlanScript = Join-Path $RepoRoot "scripts\lib\cron-schedule-plan.mjs"

if (-not (Test-Path $NodeExe)) {
  throw "Portable node not found at $NodeExe — install or pass -NodeExe"
}
if (-not (Test-Path $PlanScript)) {
  throw "Plan module not found at $PlanScript"
}

# ---------------------------------------------------------------------------
# Get the plan as JSON
# ---------------------------------------------------------------------------
$planJson = & $NodeExe $PlanScript --json 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "Plan generation failed: $planJson"
}
$plan = $planJson | ConvertFrom-Json

# ---------------------------------------------------------------------------
# Schedule → schtasks args translation (table-driven)
# ---------------------------------------------------------------------------
function Get-SchtasksArgs {
  param($Task, $RunCmd)
  $sched = $Task.parsedSchedule
  $base = @(
    "/Create",
    "/TN", $Task.id,
    "/TR", $RunCmd,
    "/F"
  )
  switch ($sched.kind) {
    "hourly"  { return $base + @("/SC", "HOURLY") }
    "daily"   { return $base + @("/SC", "DAILY",   "/ST", $sched.time) }
    "weekly"  { return $base + @("/SC", "WEEKLY",  "/D",  $sched.dow.ToUpper().Substring(0,3), "/ST", $sched.time) }
    "monthly" { return $base + @("/SC", "MONTHLY", "/D",  $sched.dom, "/ST", $sched.time) }
    default   { throw "Unknown schedule kind: $($sched.kind)" }
  }
}

function Write-RunLog {
  param([string]$Action, [string]$TaskId, [string]$Result, [string]$Detail)
  $entry = @{
    ts = (Get-Date).ToUniversalTime().ToString("o")
    action = $Action
    taskId = $TaskId
    result = $Result
    detail = $Detail
    host = $env:COMPUTERNAME
  } | ConvertTo-Json -Compress
  $logDir = Split-Path $LogFile -Parent
  if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
  Add-Content -Path $LogFile -Value $entry
}

# ---------------------------------------------------------------------------
# Uninstall path
# ---------------------------------------------------------------------------
if ($Uninstall) {
  Write-Host "Uninstalling PRISM cron tasks..."
  foreach ($t in $plan.plan.runnable) {
    if ($DryRun) {
      Write-Host "  [dry] would delete: $($t.id)"
    } else {
      & schtasks /Delete /TN $t.id /F 2>&1 | Out-Null
      $ok = $LASTEXITCODE -eq 0
      Write-Host "  $(if ($ok) {'✓'} else {'·'}) $($t.id)$(if (-not $ok) {' (not present)'})"
      Write-RunLog -Action "uninstall" -TaskId $t.id -Result $(if ($ok) {"deleted"} else {"absent"}) -Detail ""
    }
  }
  exit 0
}

# ---------------------------------------------------------------------------
# Install path
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "PRISM Cron Schedule — install plan"
Write-Host "  repo root  : $RepoRoot"
Write-Host "  runnable   : $($plan.summary.runnable)"
Write-Host "  skipped    : $($plan.summary.skipped) (scripts not on this box)"
Write-Host "  errors     : $($plan.summary.errors)"
Write-Host ""

foreach ($t in $plan.plan.runnable) {
  $runCmd = "`"$NodeExe`" `"$($t.scriptAbs)`""
  if ($t.args -and $t.args.Count -gt 0) {
    $runCmd = $runCmd + " " + ($t.args -join " ")
  }
  $logAppend = " >> `"$LogFile`" 2>&1"
  $fullCmd = "cmd /c `"$runCmd$logAppend`""

  $stArgs = Get-SchtasksArgs -Task $t -RunCmd $fullCmd

  if ($DryRun) {
    Write-Host "  [dry] $($t.id)  ($($t.parsedSchedule.kind))"
    Write-Host "        $runCmd"
  } else {
    $out = & schtasks @stArgs 2>&1
    $ok = $LASTEXITCODE -eq 0
    Write-Host "  $(if ($ok) {'✓'} else {'✗'}) $($t.id)  →  $($t.schedule)"
    Write-RunLog -Action "install" -TaskId $t.id -Result $(if ($ok) {"created"} else {"failed"}) -Detail ($out -join " | ")
  }
}

if ($plan.plan.skipped.Count -gt 0) {
  Write-Host ""
  Write-Host "Skipped (script not on this box):"
  foreach ($s in $plan.plan.skipped) {
    Write-Host "  · $($s.id)  →  $($s.script)"
  }
}

Write-Host ""
Write-Host "Done. View tasks: schtasks /Query /FO LIST /V | Select-String 'prism-'"
Write-Host "Run log: $LogFile"
