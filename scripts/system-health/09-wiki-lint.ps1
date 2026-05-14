#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-F6 -- Daily wiki-lint scheduled-task wrapper.

.DESCRIPTION
  Thin Windows-Task-Scheduler wrapper around scripts/lint-wiki-orphans.mjs.
  Runs the wiki orphan lint, then renders a human-readable
  state/shared/WIKI_LINT_REPORT.md from the JSON the linter emits.

  What lint-wiki-orphans.mjs does (NOT re-implemented here -- pure delegation
  per R1): walks knowledge/wiki/, counts inbound [[link]] references per entry,
  flags entries with zero backlinks as orphans, writes
  state/shared/wiki-orphans.json, and regenerates the orphan-rescue hub
  (knowledge/wiki/architecture/_orphans-rescue.md) and the disconnected-graph
  report (knowledge/wiki/architecture/_disconnected-graph-nodes.md).

  This wrapper adds only:
    1. node-binary resolution (H:\Tools\nodejs first, then PATH).
    2. JSON -> Markdown rendering of WIKI_LINT_REPORT.md (BOM-free, LF-only).
    3. Partial-success behavior: a malformed/missing wiki-orphans.json or a
       non-zero linter exit does NOT abort -- the wrapper still writes a
       WIKI_LINT_REPORT.md describing what it could determine, and exits 1 so
       the operator sees something needs attention without losing the report.

  Partial-success rationale: the linter itself already tolerates individual
  malformed wiki files (try/catch around each readFileSync). This wrapper
  extends that tolerance one layer out -- if the linter as a whole fails, the
  operator still gets a report saying so rather than a silent task failure.

.PARAMETER FrozenTime
  Override every wall-clock field in the report (header timestamp, linter
  generatedAt row, elapsed-ms row) with deterministic placeholders so test
  golden-files are diff-stable. lint-wiki-orphans.mjs has no --frozen-time
  flag, so the wrapper normalizes those JSON-sourced fields itself.

.PARAMETER ReportOnly
  Skip running the linter; render WIKI_LINT_REPORT.md from the existing
  wiki-orphans.json only. Useful for re-rendering without a full wiki walk.
  The report header is banner-marked so a stale re-render is never mistaken
  for a fresh run.

.EXAMPLE
  pwsh.exe -NoProfile -ExecutionPolicy Bypass -File `
    H:\prism\scripts\system-health\09-wiki-lint.ps1
    # Default: run the lint, write wiki-orphans.json + WIKI_LINT_REPORT.md.

.EXAMPLE
  # Register the daily scheduled task (idempotent -- /F overwrites if present):
  schtasks.exe /Create /F /SC DAILY /ST 05:43 /TN "PRISM Wiki Lint" `
    /TR "pwsh.exe -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\system-health\09-wiki-lint.ps1"
  # Verify:
  schtasks.exe /Query /TN "PRISM Wiki Lint" /V /FO LIST
  # Remove:
  schtasks.exe /Delete /TN "PRISM Wiki Lint" /F

.NOTES
  Cadence: daily 05:43 (off the :00 / :30 marks per fleet-friendly scheduling;
  clear of sibling 23-hook-orphan-scan at 05:31).
  Advisory only -- never deletes or rewrites wiki entries.

  Exit codes:
    0 = lint ran clean, report written
    1 = partial success (linter failed or JSON unreadable) -- report still written.
        Shows as LastTaskResult=1 in Task Scheduler; this is expected/benign on
        a partial run, and the report header explains why.
    2 = lint-wiki-orphans.mjs not found
    3 = node binary not found

  GIT-TREE AMPLIFICATION: lint-wiki-orphans.mjs rewrites two git-tracked files
  (_orphans-rescue.md + _disconnected-graph-nodes.md) under
  knowledge/wiki/architecture/ on every --write run. Those writes are NOT
  atomic. Turning this into a daily cron means a peer chat mid-commit on that
  directory at 05:43 could race the linter's writes. This is a pre-existing
  property of lint-wiki-orphans.mjs, not the wrapper -- but the daily cadence
  amplifies the exposure. Follow-up: make the linter's arch-file writes atomic
  (temp + rename). Until then, 05:43 was chosen as a low-fleet-activity slot.

  WORKTREE WARNING: always register the scheduled task against the canonical
  H:\prism checkout. If run from a .claude/worktrees/<name>/ copy, $repo
  resolves to the worktree root and the linter rewrites the worktree's wiki
  tree instead of main.
#>
param(
  [string]$FrozenTime,
  [switch]$ReportOnly
)

$ErrorActionPreference = "Continue"

$here = Split-Path -Parent $PSCommandPath
$repo = Split-Path -Parent (Split-Path -Parent $here)
$script = Join-Path $repo "scripts/lint-wiki-orphans.mjs"
$orphansJson = Join-Path $repo "state/shared/wiki-orphans.json"
$reportPath = Join-Path $repo "state/shared/WIKI_LINT_REPORT.md"

# --- Resolve node binary ----------------------------------------------------

$nodeBin = "H:\Tools\nodejs\node.exe"
if (-not (Test-Path $nodeBin)) {
  $nodeBin = (Get-Command node -ErrorAction SilentlyContinue).Source
}
if (-not $nodeBin) {
  Write-Error "node binary not found (tried H:\Tools\nodejs\node.exe + PATH)"
  exit 3
}

# --- Run the linter (unless -ReportOnly) ------------------------------------

$linterExit = 0
if (-not $ReportOnly) {
  if (-not (Test-Path $script)) {
    Write-Error "lint-wiki-orphans.mjs not found at: $script"
    exit 2
  }

  & $nodeBin $script "--write"
  $linterExit = $LASTEXITCODE
  if ($null -eq $linterExit) { $linterExit = 0 }
}

# --- Render WIKI_LINT_REPORT.md from wiki-orphans.json ----------------------
# Under -FrozenTime, every wall-clock field is replaced with a deterministic
# placeholder so golden-file tests are diff-stable.

$frozen = [bool]$FrozenTime
$now = if ($frozen) { $FrozenTime } else { (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ") }
$partial = $false
$lines = @()
$lines += "# Wiki Lint Report"
$lines += ""
$lines += "_Generated $now by scripts/system-health/09-wiki-lint.ps1 (wraps lint-wiki-orphans.mjs)._"
$lines += ""

if ($ReportOnly) {
  $lines += "> _Re-rendered from existing wiki-orphans.json (linter not run -- counts may be stale)._"
  $lines += ""
}

if ($linterExit -ne 0) {
  $partial = $true
  $lines += "> **PARTIAL** -- lint-wiki-orphans.mjs exited with code $linterExit."
  $lines += "> Counts below reflect the last wiki-orphans.json on disk, if any, and"
  $lines += "> may not match the current _orphans-rescue.md in the wiki tree."
  $lines += ""
}

$report = $null
if (Test-Path $orphansJson) {
  try {
    $report = Get-Content $orphansJson -Raw | ConvertFrom-Json
  } catch {
    $partial = $true
    $report = $null
    $lines += "> **PARTIAL** -- wiki-orphans.json present but unparseable: $($_.Exception.Message)"
    $lines += ""
  }
} else {
  $partial = $true
  $lines += "> **PARTIAL** -- wiki-orphans.json not found at $orphansJson."
  $lines += "> The linter may have failed before writing it."
  $lines += ""
}

# Shape guard: a JSON that parsed but has no `totals` object (truncated write,
# `null` literal, etc.) must be treated as partial -- otherwise the report
# renders a header with no body and exits 0, a silently-degraded green run.
if ($report -and -not $report.totals) {
  $partial = $true
  $report = $null
  $lines += "> **PARTIAL** -- wiki-orphans.json parsed but has no 'totals' object (truncated write?)."
  $lines += ""
}

# Schema-version guard: the renderer below hard-couples to lint-wiki-orphans.mjs's
# field layout (totals.files, sections.<n>.total, ...). If the linter bumps its
# schema, those fields would render as blank cells with no signal. Catch the
# drift explicitly -- the linter emits schemaVersion:1 today.
if ($report -and $report.schemaVersion -ne 1) {
  $partial = $true
  $lines += "> **PARTIAL** -- wiki-orphans.json schemaVersion is $($report.schemaVersion), expected 1 (linter format drift)."
  $lines += ""
  $report = $null
}

if ($report) {
  $t = $report.totals
  $genAt = if ($frozen) { "(frozen)" } else { $report.generatedAt }
  $elapsed = if ($frozen) { "(frozen)" } else { "$($report.elapsedMs) ms" }
  $lines += "## Totals"
  $lines += ""
  $lines += "| Metric | Value |"
  $lines += "|--------|-------|"
  $lines += "| Wiki files | $($t.files) |"
  $lines += "| Orphans (zero inbound links) | $($t.orphans) |"
  $lines += "| Orphan ratio | $([math]::Round($t.orphanRatio * 100, 2))% |"
  $lines += "| Linter elapsed | $elapsed |"
  $lines += "| Linter generatedAt | $genAt |"
  $lines += ""

  # Per-section breakdown, sorted by orphan count descending.
  $sectionRows = @()
  foreach ($prop in $report.sections.PSObject.Properties) {
    $s = $prop.Value
    $sectionRows += [pscustomobject]@{
      Section = $prop.Name
      Total   = [int]$s.total
      Orphans = [int]$s.orphans
      Ratio   = if ($s.total -gt 0) { [math]::Round($s.orphans / $s.total * 100, 1) } else { 0 }
      Sample  = if ($s.orphanList) { ($s.orphanList -join ", ") } else { "" }
    }
  }
  $sectionRows = @($sectionRows | Sort-Object -Property Orphans -Descending)

  if ($sectionRows.Count -gt 0) {
    $lines += "## Per-Section Orphan Breakdown"
    $lines += ""
    $lines += "| Section | Files | Orphans | Ratio | Sample orphans |"
    $lines += "|---------|-------|---------|-------|----------------|"
    foreach ($row in $sectionRows) {
      $lines += "| $($row.Section) | $($row.Total) | $($row.Orphans) | $($row.Ratio)% | $($row.Sample) |"
    }
    $lines += ""
  }

  $lines += "## Notes"
  $lines += ""
  $lines += "- Orphans are wiki entries with zero inbound ``[[link]]`` references."
  $lines += "- Soft signal: generated entries (layer-l*, dispatcher-*) are naturally low-backlink"
  $lines += "  until the crosslink injector or a human references them."
  $lines += "- The orphan-rescue hub (``knowledge/wiki/architecture/_orphans-rescue.md``) gives every"
  $lines += "  orphan one inbound edge, so the *effective* orphan rate is ~0."
  $lines += "- Full machine-readable data: ``state/shared/wiki-orphans.json``."
}

# --- Write the report (BOM-free, LF-only, single syscall) -------------------

$reportDir = Split-Path -Parent $reportPath
if (-not (Test-Path $reportDir)) {
  New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
}
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($reportPath, (($lines -join "`n") + "`n"), $utf8NoBom)

if ($partial) {
  Write-Host "WIKI_LINT_REPORT.md written (PARTIAL -- see report header)."
  exit 1
}

Write-Host "WIKI_LINT_REPORT.md written ($($report.totals.orphans) orphans / $($report.totals.files) files)."
exit 0
