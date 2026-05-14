#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-H1 — Weekly memory-garden audit (Mon 04:11).

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around scripts/memory-garden-scan.mjs.
  Surfaces three classes of memory debt (unreferenced files / dangling
  MEMORY.md pointers / stale H:/C: path refs) and writes a verdict to
  state/shared/MEMORY_GARDEN_REPORT.md. Defers a prune verdict when any
  chat slot is active per state/shared/chat-slots.json.

  The Node script is exit-0-always (advisory contract); a non-zero exit
  here therefore means the wrapper or Node runtime failed.

.PARAMETER Json
  Pass --json to memory-garden-scan.mjs (emit JSON to stdout, skip the
  COORD_DB_HEALTH-style report files).

.PARAMETER MemoryDir
  Override the memory directory (default: ~/.claude/projects/h--prism/memory).

.PARAMETER SlotsFile
  Override the chat-slots.json path (default: state/shared/chat-slots.json).

.PARAMETER FrozenTime
  Override the report's `generated_at` timestamp (ISO 8601). Used by the
  test suite + idempotency probes.

.EXAMPLE
  .\21-memory-garden.ps1
    # Default: writes MEMORY_GARDEN_REPORT.{md,json} reports to state/shared/.

.EXAMPLE
  schtasks.exe /Create /SC WEEKLY /D MON /ST 04:11 /TN "PRISM Memory Garden" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\21-memory-garden.ps1"
#>
param(
  [switch]$Json,
  [string]$MemoryDir,
  [string]$SlotsFile,
  [string]$FrozenTime
)

$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)  # repo root is two up from scripts/system-health/
$script = Join-Path $repo "scripts/memory-garden-scan.mjs"

if (-not (Test-Path $script)) {
  Write-Error "memory-garden-scan.mjs not found at: $script"
  exit 2
}

$nodeArgs = @($script)
if ($Json)        { $nodeArgs += "--json" }
if ($MemoryDir)   { $nodeArgs += "--memory-dir";  $nodeArgs += $MemoryDir }
if ($SlotsFile)   { $nodeArgs += "--slots-file";  $nodeArgs += $SlotsFile }
if ($FrozenTime)  { $nodeArgs += "--frozen-time"; $nodeArgs += $FrozenTime }

# Prefer the portable Node managed by PRISM's harness; fall back to PATH.
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
