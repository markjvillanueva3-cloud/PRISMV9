#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-H4 — Daily CLAUDE.md drift detector (daily 06:43).

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around scripts/claude-md-drift.mjs.
  Parses both CLAUDE.md sources (H:/prism/CLAUDE.md + ~/.claude/CLAUDE.md)
  and cross-checks every verifiable claim (file paths, env knobs) against
  repo state. Emits P0/P1 drift to state/shared/CLAUDE_MD_DRIFT_REPORT.md.

  Advisory only — never auto-edits CLAUDE.md. Operator reviews the report
  and patches doctrine to match reality (or fixes reality to match doctrine).

.PARAMETER Json
  Pass --json to claude-md-drift.mjs (machine output to stdout, skip writes).

.PARAMETER IncludeP2
  Include cosmetic P2 drift (line-number / count drift) in the report.

.PARAMETER ProjectClaudeMd
  Override the H:/prism/CLAUDE.md path.

.PARAMETER UserClaudeMd
  Override the ~/.claude/CLAUDE.md path.

.PARAMETER FrozenTime
  Override the report's `generatedAt` timestamp (ISO 8601). Used by tests.

.EXAMPLE
  .\24-claude-md-drift.ps1
    # Default: writes CLAUDE_MD_DRIFT_REPORT.{md,json} to state/shared/.

.EXAMPLE
  schtasks.exe /Create /SC DAILY /ST 06:43 /TN "PRISM CLAUDE.md Drift" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\24-claude-md-drift.ps1"

.NOTES
  Cadence: daily 06:43 (off the :00 / :30 marks per fleet-friendly scheduling).
#>
param(
  [switch]$Json,
  [switch]$IncludeP2,
  [string]$ProjectClaudeMd,
  [string]$UserClaudeMd,
  [string]$FrozenTime
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)
$script = Join-Path $repo "scripts/claude-md-drift.mjs"

if (-not (Test-Path $script)) {
  Write-Error "claude-md-drift.mjs not found at: $script"
  exit 2
}

$nodeArgs = @($script)
if ($Json)             { $nodeArgs += "--json" }
if ($IncludeP2)        { $nodeArgs += "--include-p2" }
if ($ProjectClaudeMd)  { $nodeArgs += "--project-claude-md"; $nodeArgs += $ProjectClaudeMd }
if ($UserClaudeMd)     { $nodeArgs += "--user-claude-md";    $nodeArgs += $UserClaudeMd }
if ($FrozenTime)       { $nodeArgs += "--frozen-time";       $nodeArgs += $FrozenTime }

$nodeBin = "H:\Tools\nodejs\node.exe"
if (-not (Test-Path $nodeBin)) {
  $nodeBin = (Get-Command node -ErrorAction SilentlyContinue).Source
}
if (-not $nodeBin) {
  Write-Error "node binary not found (tried H:\Tools\nodejs\node.exe + PATH)"
  exit 3
}

& $nodeBin @nodeArgs
$exit = $LASTEXITCODE
if ($null -eq $exit) { $exit = 0 }
exit $exit
