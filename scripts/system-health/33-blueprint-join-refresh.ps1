#!/usr/bin/env pwsh
<#
.SYNOPSIS
  MS-DOCU-INGEST/U-DOCU-04 — Blueprint↔program join refresh cron (weekly cadence).

.DESCRIPTION
  Rebuilds the blueprint↔program join index that powers prism_dev:program_for_print /
  print_for_program and prism_cam:cam_program_for_print / cam_print_for_program by
  invoking the canonical phase pipeline:

    H:/Tools/python/python.exe scripts/docustrata/phase20-verified-prints-index.py
    H:/Tools/python/python.exe scripts/docustrata/phase16-blueprint-program-join-v6.py

  phase20 reads phase15 raw-page output, dedups + filters verified prints, and
  writes Docustrata/.index/phase20-verified-prints*.jsonl. phase16 then joins those
  verified prints against the program corpus and writes the v6 join index at
  Docustrata/.index/blueprint-program-join-full-v6.jsonl. Both python scripts are
  idempotent — re-running atomically overwrites their outputs.

  After both phases run (or are skipped in -DryRun), the script validates the v6
  jsonl: total line count via [System.IO.File]::ReadLines (streamed, no full slurp
  of the ~60MB file), then ConvertFrom-Json on the first 20 records, checking
  each carries the required keys {part_number, part_number_normalized, blueprints,
  programs, match_confidence} AND that match_confidence is one of the canonical
  values {exact, loose, ambiguous, miss, garbage}. The sample is small + bounded
  to keep the cron cheap; gross corruption (truncated file / missing keys /
  unknown match_confidence) is the failure class worth blocking on, and 20
  records is enough to catch that without burning quota.

  Outputs a structured run record to state/shared/blueprint-join-refresh-last.json
  (schemaVersion 1) for downstream visibility (golf-state-snapshot picks it up;
  hookless dashboards can read it directly). The record is the source of truth for
  this run's freshness — distinct from the hook (blueprint-join-index-stale-check.mjs)
  which only checks file mtime at session start.

  Self-contained by design — unlike 08-envelope-drift.ps1 which is a thin wrapper
  around a node mjs, this script orchestrates two python phases directly + does
  its own validation in PowerShell. There is no equivalent node script and adding
  one would just be a translation layer over the python.

.PARAMETER DryRun
  Skip phase20 + phase16 execution. Still validates the existing v6 jsonl (so
  this mode is the cheap "is the join still healthy?" check the golf in-session
  reminder fires; the actual rebuild runs via the Windows Scheduled Task installed
  by install-blueprint-join-refresh-task.ps1).

.PARAMETER Json
  Emit the full run record to stdout as JSON. (The log file is written either
  way; -Json adds a copy to stdout for callers that want to parse it inline.)

.PARAMETER FrozenTime
  Override the run record's ranAt timestamp (ISO 8601). Used by tests for
  diff-friendly output.

.EXAMPLE
  .\33-blueprint-join-refresh.ps1
  # Live run: phase20 + phase16 + validate + log.

.EXAMPLE
  .\33-blueprint-join-refresh.ps1 -DryRun -Json
  # Skip python phases, validate existing v6 jsonl, emit record to stdout.

.NOTES
  Cadence: weekly, Sunday 08:47 UTC (registered by install-blueprint-join-refresh-task.ps1).
  Dual-mechanism: also fires as an in-session golf reminder via
  state/shared/golf-cron-registry.json → golf-blueprint-join-refresh (the golf
  prompt invokes this with -DryRun for a freshness/plan check).
  Output:  state/shared/blueprint-join-refresh-last.json (schemaVersion 1)
  Exit:    0 = OK   2 = python bin missing   3 = phase failure (live mode)
           4 = v6 jsonl missing (only if no upstream phase failure already failed; phase-failure dominates)
           5 = v6 jsonl validation failed
  KEEP-IN-SYNC: .claude/helpers/install-blueprint-join-refresh-task.ps1 -RunNow
                report block also enumerates these codes for operator output. If
                a future U-DOCU unit adds an exit code, BOTH files must be
                updated together; the installer guards against unmapped codes
                so a stale installer doesn't lie about a new wrapper code, but
                the report message will still be less informative until updated.
  Exit-code reconciliation vs model 08-envelope-drift.ps1:
    The model file uses exit 2 = wrapped-mjs-missing and exit 3 = node-bin-missing.
    THIS file carries strictly more information (we orchestrate two python phases +
    do our own validation), so the codes are intentionally re-mapped:
      our 2 = python-bin-missing  (analogous to model's 3 = node-bin-missing)
      our 3 = phase-script returned non-zero  (no model equivalent)
      our 4 = post-run v6 jsonl absent on disk  (no model equivalent)
      our 5 = v6 jsonl present but failed validation  (no model equivalent)
    The 2 (binary-missing) numerical drift from the model is deliberate — codes 3-5
    are now reserved for our richer failure semantics, and a downstream consumer
    only needs to read the .ok boolean in the JSON log to skip the code switch.
#>
param(
  [switch]$DryRun,
  [switch]$Json,
  [string]$FrozenTime
)

# Continue (not Stop): a single python phase failure must not abort the second
# phase or the validation — we accrue failures into the result.errors[] array
# and report them in the log so a downstream consumer sees the full picture.
$ErrorActionPreference = "Continue"

$here   = Split-Path -Parent $PSCommandPath
$repo   = Split-Path -Parent (Split-Path -Parent $here)

$phase20 = Join-Path $repo "scripts/docustrata/phase20-verified-prints-index.py"
$phase16 = Join-Path $repo "scripts/docustrata/phase16-blueprint-program-join-v6.py"
$joinJsonl = Join-Path $repo "Docustrata/.index/blueprint-program-join-full-v6.jsonl"
$logPath = Join-Path $repo "state/shared/blueprint-join-refresh-last.json"

# KEEP-IN-SYNC with blueprint-join-index-stale-check.mjs JOIN_PATH literal and
# BlueprintProgramJoinEngine.DEFAULT_JOIN_REL. A move here without updating
# those two fails silently (this rebuilds the new path, the hook + engine still
# watch the old one).

# Python bin probe: prefer the portable H:/Tools install, fall back to PATH.
# The PATH fallback explicitly filters out the Windows Store stub
# (C:\Users\<u>\AppData\Local\Microsoft\WindowsApps\python.exe — a 0-byte
# reparse point that pops the Store dialog on launch and would hang the cron
# until ExecutionTimeLimit kills it) and restricts to -CommandType Application
# so we don't accidentally resolve a `python.bat`/`.cmd` shim from a pyenv-win
# install (those shims wrap pwsh in PowerShell and break Start-Process exit-code
# capture under PS 5.1). Real python.exe only.
$pythonBin = "H:\Tools\python\python.exe"
if (-not (Test-Path $pythonBin)) {
  $cmd = Get-Command python -CommandType Application -ErrorAction SilentlyContinue |
         Where-Object { $_.Source -and $_.Source -notlike '*\WindowsApps\*' -and $_.Source -like '*.exe' } |
         Select-Object -First 1
  $pythonBin = if ($cmd) { $cmd.Source } else { $null }
}

# Required keys for the v6 record schema; KEEP-IN-SYNC with
# phase16-blueprint-program-join-v6.py main() write loop (rec={...} at ~L411).
$requiredKeys = @('part_number','part_number_normalized','blueprints','programs','match_confidence')
# Canonical record-level match_confidence values. KEEP-IN-SYNC with
# phase16-blueprint-program-join-v6.py conf= assignment block (~L354-367) and
# BlueprintProgramJoinEngine.ts VALID_MATCH_CONFIDENCE (~L728-734).
# Note: "internal" appears in phase16 as a PER-PROGRAM `via` value (recorded on
# each matched program entry to mark how that program was matched via the
# internal-PN index), NEVER as a record-level match_confidence — they are
# different fields. The record-level match_confidence is always one of the five
# below by the time main() writes the record, regardless of how individual
# programs got matched in.
$canonicalConfidence = @('exact','loose','ambiguous','miss','garbage')

function New-RunRecord {
  param([string]$ranAt)
  # PSCustomObject preserves key order on ConvertTo-Json (PS 5.1 + 7+); a
  # plain @{} hashtable does not, which we deliberately avoid for the log.
  return [pscustomobject]@{
    schemaVersion = 1
    ranAt         = $ranAt
    frozenTime    = [bool]$FrozenTime
    dryRun        = [bool]$DryRun
    phase20       = $null
    phase16       = $null
    validation    = $null
    errors        = @()
    ok            = $false
  }
}

function Invoke-PhaseScript {
  param(
    [string]$Label,
    [string]$ScriptPath
  )
  $start = Get-Date
  $result = [pscustomobject]@{
    label     = $Label
    scriptPath= $ScriptPath
    ok        = $false
    exitCode  = -1
    elapsedMs = 0
    stdoutTail= ""
    stderrTail= ""
    skipped   = $false
  }
  if ($DryRun) {
    $result.skipped = $true
    $result.ok = $true
    return $result
  }
  if (-not (Test-Path $ScriptPath)) {
    $result.stderrTail = "phase script not found: $ScriptPath"
    # Capture elapsed before bailing — operators reading the log need to
    # distinguish a fast "script-not-found" failure (sub-ms) from a slow
    # phase that died after several minutes of work.
    $result.elapsedMs = [int]((Get-Date) - $start).TotalMilliseconds
    return $result
  }
  # Capture stdout + stderr to temp files (Start-Process is the cleanest way to
  # capture both separately without inline redirection quirks under PS 5.1).
  $stdoutFile = [System.IO.Path]::GetTempFileName()
  $stderrFile = [System.IO.Path]::GetTempFileName()
  try {
    $proc = Start-Process -FilePath $pythonBin `
      -ArgumentList @($ScriptPath) `
      -NoNewWindow `
      -Wait `
      -PassThru `
      -RedirectStandardOutput $stdoutFile `
      -RedirectStandardError $stderrFile
    $result.exitCode = $proc.ExitCode
    # Tail only the last 4KB of each stream — full output can be MB for phase16
    # and we already have the v6 jsonl as the substantive artifact. The tail is
    # diagnostic, not a transcript.
    if (Test-Path $stdoutFile) {
      $stdoutContent = Get-Content -Path $stdoutFile -Raw -ErrorAction SilentlyContinue
      if ($stdoutContent) {
        $result.stdoutTail = if ($stdoutContent.Length -gt 4096) { $stdoutContent.Substring($stdoutContent.Length - 4096) } else { $stdoutContent }
      }
    }
    if (Test-Path $stderrFile) {
      $stderrContent = Get-Content -Path $stderrFile -Raw -ErrorAction SilentlyContinue
      if ($stderrContent) {
        $result.stderrTail = if ($stderrContent.Length -gt 4096) { $stderrContent.Substring($stderrContent.Length - 4096) } else { $stderrContent }
      }
    }
    $result.ok = ($proc.ExitCode -eq 0)
  } catch {
    $result.stderrTail = "Invoke-PhaseScript exception: $($_.Exception.Message)"
  } finally {
    if (Test-Path $stdoutFile) { Remove-Item -Path $stdoutFile -Force -ErrorAction SilentlyContinue }
    if (Test-Path $stderrFile) { Remove-Item -Path $stderrFile -Force -ErrorAction SilentlyContinue }
  }
  $result.elapsedMs = [int]((Get-Date) - $start).TotalMilliseconds
  return $result
}

function Test-V6Jsonl {
  param([string]$Path)
  $val = [pscustomobject]@{
    joinPath                       = $Path
    exists                         = $false
    lineCount                      = 0
    sampledLines                   = 0
    sampleOk                       = 0
    sampleErrors                   = @()
    matchConfidenceDistribution    = [pscustomobject]@{ exact = 0; loose = 0; ambiguous = 0; miss = 0; garbage = 0; unknown = 0 }
    valid                          = $false
  }
  if (-not (Test-Path $Path)) {
    return $val
  }
  $val.exists = $true

  # Stream line-count via [System.IO.File]::ReadLines (lazy enumeration — no
  # 60MB slurp into memory; PS 5.1 + 7+ both support this since .NET Framework
  # 4.0). We just count; the parse step below re-opens for the first 20 lines.
  $lineCount = 0
  try {
    foreach ($_ in [System.IO.File]::ReadLines($Path)) {
      $lineCount++
    }
  } catch {
    $val.sampleErrors += "ReadLines failed: $($_.Exception.Message)"
    return $val
  }
  $val.lineCount = $lineCount

  if ($lineCount -lt 1) {
    $val.sampleErrors += "join jsonl is empty (0 lines)"
    return $val
  }

  # Parse first 20 lines (or fewer if the file is shorter — bounded enumerator
  # below stops at $sampleCap so we don't read the whole file just to break early).
  # SMOKE-TEST SCOPE NOTE: 20 records is intentionally a coverage smoke test, not
  # a full-corpus validation. A phase16 bug that writes 73,000 good records then
  # one truncated/malformed record at line 50,000 would pass this validator's
  # `valid=true` gate. The line-count check above + the `n_written` print phase16
  # itself emits to stdoutTail are the canaries for that class of failure;
  # full-corpus validation is intentionally out of scope (too slow for a weekly
  # cron, and the v6 jsonl is the authoritative artifact — downstream consumers
  # carry their own per-record schema guards).
  $sampleCap = 20
  $sampleIdx = 0
  $sampleOk = 0
  try {
    foreach ($line in [System.IO.File]::ReadLines($Path)) {
      if ($sampleIdx -ge $sampleCap) { break }
      $sampleIdx++
      if ([string]::IsNullOrWhiteSpace($line)) {
        $val.sampleErrors += "line ${sampleIdx}: empty"
        continue
      }
      $rec = $null
      try {
        $rec = $line | ConvertFrom-Json -ErrorAction Stop
      } catch {
        $val.sampleErrors += "line ${sampleIdx}: ConvertFrom-Json failed ($($_.Exception.Message))"
        continue
      }
      # Required-keys check: ConvertFrom-Json returns a PSCustomObject in PS 5.1
      # (no -AsHashtable). Probe via PSObject.Properties.Name.
      $present = $rec.PSObject.Properties.Name
      $missing = @($requiredKeys | Where-Object { $present -notcontains $_ })
      if ($missing.Count -gt 0) {
        $val.sampleErrors += "line ${sampleIdx}: missing required keys [$($missing -join ', ')]"
        continue
      }
      # match_confidence value check
      $mc = [string]$rec.match_confidence
      if ($canonicalConfidence -notcontains $mc) {
        $val.sampleErrors += "line ${sampleIdx}: unknown match_confidence value '$mc' (expected one of $($canonicalConfidence -join '/'))"
        continue
      }
      # Distribution counter — bump the matching bucket.
      switch ($mc) {
        'exact'     { $val.matchConfidenceDistribution.exact     += 1 }
        'loose'     { $val.matchConfidenceDistribution.loose     += 1 }
        'ambiguous' { $val.matchConfidenceDistribution.ambiguous += 1 }
        'miss'      { $val.matchConfidenceDistribution.miss      += 1 }
        'garbage'   { $val.matchConfidenceDistribution.garbage   += 1 }
        default     { $val.matchConfidenceDistribution.unknown   += 1 }
      }
      $sampleOk++
    }
  } catch {
    $val.sampleErrors += "sample iteration failed: $($_.Exception.Message)"
  }
  $val.sampledLines = $sampleIdx
  $val.sampleOk = $sampleOk

  # Valid iff every sampled line parsed clean (no errors recorded) AND we got at
  # least one sampled record. A 0-sample file is "valid metadata-wise but
  # empty" — we already flagged that above as a sampleErrors entry.
  $val.valid = ($val.sampleErrors.Count -eq 0) -and ($sampleOk -gt 0)
  return $val
}

function Write-NoBomJson {
  param(
    [string]$Path,
    [string]$Content
  )
  # No-BOM UTF8 write — Set-Content / Out-File default to UTF8 *with* BOM on
  # PS 5.1 (the harness reads this file with node's JSON.parse, which tolerates
  # BOM, but the bytes still leak into git diffs as a U+FEFF). Use the explicit
  # UTF8Encoding($false) overload to disable BOM. Parent dir must exist; we
  # ensure it before writing.
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

# --- main ----------------------------------------------------------------------

$ranAt = if ($FrozenTime) { $FrozenTime } else { (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ") }
$rec = New-RunRecord -ranAt $ranAt

# Resolve python bin first — without it, live mode can't run and -DryRun is the
# only thing we can do. Surface that as a non-fatal warning in dry-run but as a
# hard exit 2 in live mode.
if (-not $pythonBin) {
  $rec.errors += "python binary not found (tried H:/Tools/python/python.exe + PATH)"
  if (-not $DryRun) {
    $rec.ok = $false
    $jsonOut = $rec | ConvertTo-Json -Depth 8
    Write-NoBomJson -Path $logPath -Content $jsonOut
    if ($Json) { Write-Output $jsonOut }
    exit 2
  }
}

# Phase 20: verified-prints-index. Idempotent; reads phase15, writes phase20-*.
$rec.phase20 = Invoke-PhaseScript -Label 'phase20-verified-prints-index' -ScriptPath $phase20
if (-not $rec.phase20.ok -and -not $DryRun) {
  $rec.errors += "phase20 failed (exit $($rec.phase20.exitCode))"
}

# Phase 16: blueprint-program-join-v6. Reads phase20 + program corpus, writes v6.
$rec.phase16 = Invoke-PhaseScript -Label 'phase16-blueprint-program-join-v6' -ScriptPath $phase16
if (-not $rec.phase16.ok -and -not $DryRun) {
  $rec.errors += "phase16 failed (exit $($rec.phase16.exitCode))"
}

# Validation: always run, whether live or dry-run. A live mode failure in
# phase20/phase16 should still produce a validation record on the *existing*
# v6 jsonl (whatever's on disk pre-failure), so the consumer can see "phases
# failed but the previous build is still on disk and valid".
$rec.validation = Test-V6Jsonl -Path $joinJsonl

# Exit code precedence (lower number = higher priority — phase-failure DOMINATES
# downstream validation symptoms because a missing/invalid v6 jsonl is usually a
# CONSEQUENCE of a failed phase, and we want the actionable root-cause code, not
# the secondary symptom):
#   2 = python bin missing in live mode (handled above, early-exit)
#   3 = phase failure in live mode  (root cause; dominates 4 + 5)
#   4 = v6 jsonl absent on disk  (only when phases ok — phase ran but produced no output)
#   5 = v6 jsonl present but failed validation  (only when phases ok + file exists)
#   0 = ok
# All three of (3,4,5) accrue into rec.errors[] regardless of which one is the
# emitted exit code, so a downstream consumer reading the JSON log sees the
# full failure picture; the exit code is just the most-actionable signal.
$exit = 0
if (-not $DryRun -and ($rec.phase20.ok -ne $true -or $rec.phase16.ok -ne $true)) {
  $exit = 3
}
if (-not $rec.validation.exists) {
  $rec.errors += "v6 join jsonl missing: $joinJsonl"
  if ($exit -eq 0) { $exit = 4 }
} elseif (-not $rec.validation.valid) {
  $rec.errors += "v6 join jsonl failed validation ($($rec.validation.sampleErrors.Count) sample errors)"
  if ($exit -eq 0) { $exit = 5 }
}
$rec.ok = ($exit -eq 0)

$jsonOut = $rec | ConvertTo-Json -Depth 8
Write-NoBomJson -Path $logPath -Content $jsonOut
if ($Json) { Write-Output $jsonOut }

exit $exit
