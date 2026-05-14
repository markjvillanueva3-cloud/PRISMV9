param(
  [int]$LightThresholdPct = 85,
  [int]$MediumThresholdPct = 92,
  [int]$HeavyThresholdPct = 97,
  [int]$MaxRuntimeSec = 100,
  [int]$MinTierBudgetSec = 5,
  [int]$ZombieCapSec = 60,
  [string]$LogPath = 'H:\prism\.cache\memory-pressure-log.jsonl',
  [int]$LogMaxLines = 500,
  [switch]$DryRun
)

# 03-memory-pressure-auto-relief.ps1 — automated memory-pressure relief.
#
# Runs every 5 minutes via the "PRISM Memory Pressure Auto-Relief" Windows
# Scheduled Task (install via install-memory-pressure-task.ps1). Cheap when
# memory is OK (~50ms — one Win32_OS query then exit). When memory crosses
# a threshold, escalates relief actions:
#
#   < $LightThresholdPct  : noop (log only if -DryRun)
#   < $MediumThresholdPct : run 02-kill-zombie-tsservers.ps1 (stale MCP +
#                          tsservers + playwright >60 min). Typical
#                          reclaim: 0.5-2 GB.
#   < $HeavyThresholdPct  : zombie-tsservers + node-process-janitor --full
#                          (reaps Git-for-Windows bash.exe wrappers, orphan
#                          @playwright/mcp / mcp-http-bridge, dead-parent
#                          MCP servers).
#   >= $HeavyThresholdPct : above + dump top 10 processes by RSS to the log
#                          + emit a Windows toast (best-effort) so the
#                          operator sees it. Does NOT kill live processes
#                          unprovoked.
#
# Safety: never kills anything the existing scripts wouldn't already kill;
# this is just an automation wrapper that picks WHEN to invoke them.
#
# ── SELF-BOUNDING (SLOT-WORKTREE-MS0 hygiene fix, 2026-05-14) ───────────
# The scheduled task has an ExecutionTimeLimit after which the Task Scheduler
# SIGKILLs the run — leaving a Stop-Process loop half-done and recording
# LastTaskResult=267014 (SCHED_S_TASK_TERMINATED). Under process-table
# pressure the WMI / Get-Process calls in the sub-cleaners run long enough to
# trip that. Two fixes here:
#   1. Every heavy sub-invocation is a BOUNDED child process (Invoke-Bounded):
#      it gets a timeout, and on timeout the whole process tree is killed
#      (handle-bound $proc.Kill() + a recheck-guarded taskkill /T sweep for
#      orphaned grandchildren).
#   2. The script self-bounds to $MaxRuntimeSec (default 100s, comfortably
#      under the 120s task limit) — each escalation tier checks the remaining
#      budget before starting, and the script always exits 0 cleanly rather
#      than being killed mid-reap.
# Both sub-cleaner invocations (Invoke-ZombieTsservers, Invoke-NodeJanitor) now
# run THROUGH Invoke-Bounded. Previously each used a bare `& $script` /
# `& $nodeExe $script --full` with NO timeout — under process pressure either
# could run long enough to blow the task's ExecutionTimeLimit. That unbounded
# invocation was the real termination cause; the scripts they call
# (02-kill-zombie-tsservers.ps1, .claude/hooks/node-process-janitor.mjs) are
# unchanged and were never dead — only their invocation is now bounded.
#
# Log format (JSONL): {t, pct, usedGB, totalGB?, action, reclaimedMB?, killed?,
#                      janitorRan?, timedOut?, topProcs?}.
#
# Pause without uninstalling: Disable-ScheduledTask -TaskName 'PRISM Memory Pressure Auto-Relief'
# Uninstall:                   & '$PSScriptRoot\..\..\.claude\helpers\install-memory-pressure-task.ps1' -Uninstall

$ErrorActionPreference = 'Continue'  # Never throw — this task must be silent on errors

# Script self-deadline — see SELF-BOUNDING note above. Defined at script scope
# so the functions below can read it (PowerShell dynamic scoping for reads).
$ScriptDeadline = (Get-Date).AddSeconds($MaxRuntimeSec)

function Get-RemainingSec {
  # Whole seconds left before the script must exit. Floored at 0 (never negative).
  $r = [int][math]::Floor((($ScriptDeadline) - (Get-Date)).TotalSeconds)
  if ($r -lt 0) { return 0 }
  return $r
}

function Get-MemoryPct {
  try {
    $os = Get-CimInstance Win32_OperatingSystem
    $total = $os.TotalVisibleMemorySize
    $free  = $os.FreePhysicalMemory
    if ($total -le 0) { return @{ pct = 0; totalGB = 0; usedGB = 0 } }
    $pct = [math]::Round((($total - $free) / $total) * 100, 1)
    return @{
      pct = $pct
      totalGB = [math]::Round($total / 1MB, 2)
      usedGB  = [math]::Round(($total - $free) / 1MB, 2)
    }
  } catch {
    return @{ pct = 0; totalGB = 0; usedGB = 0 }
  }
}

function Append-Log {
  param([hashtable]$Entry)
  try {
    $logDir = Split-Path -Parent $LogPath
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

    # Cap the log (keep last $LogMaxLines)
    if (Test-Path $LogPath) {
      $lines = Get-Content -Path $LogPath -ErrorAction SilentlyContinue
      if ($lines -and $lines.Count -ge $LogMaxLines) {
        $kept = $lines | Select-Object -Last ($LogMaxLines - 1)
        Set-Content -Path $LogPath -Value $kept -Encoding UTF8
      }
    }

    $Entry.t = (Get-Date).ToString('o')
    # -Depth 5: heavy-tier entries nest topProcs (array of flat objects) one
    # level inside the hashtable; the default depth of 2 would truncate it.
    $json = $Entry | ConvertTo-Json -Compress -Depth 5
    Add-Content -Path $LogPath -Value $json -Encoding UTF8
  } catch { }
}

# Run a child process bounded to $TimeoutSec. Captures stdout+stderr to two
# independent temp files (each its own reserved GetTempFileName — no derived
# predictable path), kills the whole process tree on timeout, and never throws.
# Returns @{ output=[string[]]; timedOut=$bool; exitCode; ran=$bool; skipped?;
# error? }.
function Invoke-Bounded {
  param(
    [string]$Exe,
    [string[]]$ChildArgs,
    [int]$TimeoutSec
  )
  if ($TimeoutSec -le 0) {
    return @{ output = @(); timedOut = $false; exitCode = $null; ran = $false; skipped = 'no_time_budget' }
  }
  # Declared before the try so the finally can see them; assigned INSIDE the try
  # so a GetTempFileName() IOException (%TEMP% exhausted / unwritable) returns
  # the error result instead of throwing out of the function and aborting the
  # whole script — the exact SCHED-kill failure mode this rewrite exists to fix.
  $tmpOut = $null
  $tmpErr = $null
  try {
    # Two independent reserved temp names — Start-Process requires distinct
    # stdout/stderr targets, and deriving "$tmpOut.err" leaves a predictable,
    # un-reserved path (a symlink-TOCTOU surface). Two GetTempFileName() calls
    # are both random and both OS-reserved.
    $tmpOut = [System.IO.Path]::GetTempFileName()
    $tmpErr = [System.IO.Path]::GetTempFileName()
    $proc = Start-Process -FilePath $Exe -ArgumentList $ChildArgs -PassThru -NoNewWindow `
      -RedirectStandardOutput $tmpOut -RedirectStandardError $tmpErr -ErrorAction Stop
    Wait-Process -Id $proc.Id -Timeout $TimeoutSec -ErrorAction SilentlyContinue
    $proc.Refresh()
    $timedOut = $false
    if (-not $proc.HasExited) {
      $timedOut = $true
      # Tree-kill a hung sub-cleaner. taskkill /T targets the PID and is needed
      # to reap grandchildren (git / powershell / node the sub-cleaner spawned),
      # but Windows recycles PIDs aggressively under exactly the process
      # pressure this script runs in — so re-check HasExited immediately before
      # taskkill to shrink the PID-reuse window to microseconds. $proc.Kill()
      # afterwards is bound to the original .NET process handle — it can never
      # hit a recycled PID — and is the authoritative kill for the direct child.
      try {
        $proc.Refresh()
        if (-not $proc.HasExited) { & taskkill /T /F /PID $proc.Id 2>&1 | Out-Null }
      } catch { }
      try { if (-not $proc.HasExited) { $proc.Kill() } } catch { }
    }
    $exitCode = $null
    try { if ($proc.HasExited) { $exitCode = $proc.ExitCode } } catch { }
    # Short settle: PS 5.1 Start-Process redirection can lag the final flush
    # slightly behind process exit under load — reading immediately can get a
    # truncated tail (would only under-report a log number, never corrupt).
    Start-Sleep -Milliseconds 50
    $out = @()
    if ($tmpOut -and (Test-Path $tmpOut)) { $out += @(Get-Content -Path $tmpOut -ErrorAction SilentlyContinue) }
    if ($tmpErr -and (Test-Path $tmpErr)) { $out += @(Get-Content -Path $tmpErr -ErrorAction SilentlyContinue) }
    return @{ output = $out; timedOut = $timedOut; exitCode = $exitCode; ran = $true }
  } catch {
    return @{ output = @(); timedOut = $false; exitCode = $null; ran = $false; error = $_.Exception.Message }
  } finally {
    if ($tmpOut) { try { Remove-Item $tmpOut -Force -ErrorAction SilentlyContinue } catch { } }
    if ($tmpErr) { try { Remove-Item $tmpErr -Force -ErrorAction SilentlyContinue } catch { } }
  }
}

function Invoke-ZombieTsservers {
  param([int]$TimeoutSec)
  $script = 'H:\prism\scripts\system-health\02-kill-zombie-tsservers.ps1'
  if (-not (Test-Path $script)) { return @{ reclaimedMB = 0; killed = 0; error = 'script_missing' } }
  # Reuse the powershell.exe that is running THIS script (no PATH guesswork) so
  # the sub-script runs under the same interpreter the task is pinned to.
  $psExe = $null
  try { $psExe = (Get-Process -Id $PID -ErrorAction SilentlyContinue).Path } catch { }
  if (-not $psExe) { $psExe = 'powershell.exe' }
  $r = Invoke-Bounded -Exe $psExe `
    -ChildArgs @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $script) `
    -TimeoutSec $TimeoutSec
  $reclaimed = 0
  $killed = 0
  foreach ($line in $r.output) {
    if ($line -match 'Reclaimed approximately (\d+) MB') { $reclaimed = [int]$Matches[1] }
    if ($line -match '^Found (\d+) zombie')              { $killed    = [int]$Matches[1] }
  }
  $res = @{ reclaimedMB = $reclaimed; killed = $killed }
  if ($r.timedOut) { $res.timedOut = $true }
  if ($r.skipped)  { $res.skipped  = $r.skipped }
  if ($r.error)    { $res.error    = $r.error }
  return $res
}

function Invoke-NodeJanitor {
  param([int]$TimeoutSec)
  # node-process-janitor.mjs --full is the scheduled-task "backstop" mode of the
  # prism-scoped orphan reaper (reaps Git-for-Windows bash.exe wrappers, orphan
  # @playwright/mcp / mcp-http-bridge, dead-parent MCP servers). The script and
  # the --full arg are UNCHANGED from the original — the only fix is that the
  # invocation now goes THROUGH Invoke-Bounded, so a slow run under process
  # pressure can no longer overrun the scheduled task's ExecutionTimeLimit.
  $script = 'H:\prism\.claude\hooks\node-process-janitor.mjs'
  if (-not (Test-Path $script)) { return @{ ran = $false; error = 'script_missing' } }
  $nodeExe = $null
  foreach ($cand in @('H:\Tools\nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
    if (Test-Path $cand) { $nodeExe = $cand; break }
  }
  if (-not $nodeExe) { return @{ ran = $false; error = 'node_missing' } }
  $r = Invoke-Bounded -Exe $nodeExe -ChildArgs @($script, '--full') -TimeoutSec $TimeoutSec
  # `ran` is honest: true only if the janitor actually spawned AND finished
  # within budget. A timeout (tree-killed mid-run) reports ran=$false so a
  # JSONL consumer reading janitorRan is not misled.
  $res = @{ ran = ([bool]$r.ran -and -not [bool]$r.timedOut) }
  if ($r.timedOut) { $res.timedOut = $true }
  if ($r.skipped)  { $res.skipped = $r.skipped }
  if ($r.error)    { $res.error = $r.error }
  return $res
}

function Dump-TopProcs {
  # Returns an array of flat objects (NOT a JSON string) so Append-Log nests it
  # as a real JSON array, not an escaped string-in-string.
  try {
    return @(Get-Process | Sort-Object WorkingSet64 -Descending |
      Select-Object -First 10 ProcessName, Id, @{N='RSS_MB';E={[int]($_.WorkingSet64/1MB)}})
  } catch { return @() }
}

function Try-Toast {
  param([string]$Title, [string]$Body)
  # Best-effort Windows toast (silent failure if BurntToast not installed).
  try {
    if (Get-Module -ListAvailable -Name BurntToast -ErrorAction SilentlyContinue) {
      New-BurntToastNotification -Text $Title, $Body -ErrorAction SilentlyContinue
    }
  } catch { }
}

# --- MAIN ---------------------------------------------------------------
# HS-14 fix (2026-05-12): explicit `exit 0` on every script-level return path.
# Previously bare `return` preserved $LASTEXITCODE from earlier non-terminating
# errors swallowed by $ErrorActionPreference='Continue' (e.g. WMI hiccups in
# Get-CimInstance, Add-Content lock contention). When the Task Scheduler reads
# the script's exit code on exit, that swallowed non-zero bubbled to 0x1 even
# though no real failure occurred — the healthy-noop branch ran ~144 times/day
# but every run was recorded as failed. Symptom: NumberOfMissedRuns=0,
# LastTaskResult=0x1, log empty (because Append-Log only runs >=85% pct).
$global:LASTEXITCODE = 0  # baseline — never propagate inherited non-zero exit
$Error.Clear()            # clear any pre-existing error records from module load
$mem = Get-MemoryPct
$pct = $mem.pct

if ($DryRun) {
  Append-Log @{ pct = $pct; usedGB = $mem.usedGB; totalGB = $mem.totalGB; action = 'dry_run' }
  Write-Host "DRY-RUN: memory $($mem.usedGB)/$($mem.totalGB) GB = $pct% — no action (dryrun)"
  exit 0
}

if ($pct -lt $LightThresholdPct) {
  # Healthy — no action, no log spam. Explicit exit 0 so the Task Scheduler
  # doesn't record the swallowed-error exit code from any prior cmdlet.
  exit 0
}

if ($pct -lt $MediumThresholdPct) {
  $budget = Get-RemainingSec
  if ($budget -le $MinTierBudgetSec) {
    Append-Log @{ pct = $pct; usedGB = $mem.usedGB; action = 'light_skipped_no_budget' }
    exit 0
  }
  Write-Host "Memory $pct% > light threshold $LightThresholdPct% — running zombie-tsservers."
  $r = Invoke-ZombieTsservers -TimeoutSec ([math]::Min($budget, $ZombieCapSec))
  Append-Log @{ pct = $pct; usedGB = $mem.usedGB; action = 'light'; reclaimedMB = $r.reclaimedMB; killed = $r.killed; timedOut = [bool]$r.timedOut }
  exit 0
}

if ($pct -lt $HeavyThresholdPct) {
  $budget = Get-RemainingSec
  if ($budget -le $MinTierBudgetSec) {
    Append-Log @{ pct = $pct; usedGB = $mem.usedGB; action = 'medium_skipped_no_budget' }
    exit 0
  }
  Write-Host "Memory $pct% > medium threshold $MediumThresholdPct% — zombie + node-janitor."
  $r1 = Invoke-ZombieTsservers -TimeoutSec ([math]::Min($budget, $ZombieCapSec))
  $budget2 = Get-RemainingSec
  $r2 = if ($budget2 -gt $MinTierBudgetSec) { Invoke-NodeJanitor -TimeoutSec $budget2 } else { @{ ran = $false; skipped = 'no_budget' } }
  Append-Log @{ pct = $pct; usedGB = $mem.usedGB; action = 'medium'; reclaimedMB = $r1.reclaimedMB; killed = $r1.killed; janitorRan = [bool]$r2.ran; timedOut = ([bool]$r1.timedOut -or [bool]$r2.timedOut) }
  exit 0
}

# >= heavy
$budget = Get-RemainingSec
if ($budget -le $MinTierBudgetSec) {
  Append-Log @{ pct = $pct; usedGB = $mem.usedGB; action = 'heavy_skipped_no_budget' }
  exit 0
}
Write-Host "Memory $pct% > heavy threshold $HeavyThresholdPct% — escalated relief."
$r1 = Invoke-ZombieTsservers -TimeoutSec ([math]::Min($budget, $ZombieCapSec))
$budget2 = Get-RemainingSec
$r2 = if ($budget2 -gt $MinTierBudgetSec) { Invoke-NodeJanitor -TimeoutSec $budget2 } else { @{ ran = $false; skipped = 'no_budget' } }
$topProcs = Dump-TopProcs
Try-Toast 'PRISM memory pressure' "$pct% used. Reaper ran. Top procs in log: $LogPath"
Append-Log @{ pct = $pct; usedGB = $mem.usedGB; action = 'heavy'; reclaimedMB = $r1.reclaimedMB; killed = $r1.killed; janitorRan = [bool]$r2.ran; timedOut = ([bool]$r1.timedOut -or [bool]$r2.timedOut); topProcs = $topProcs }
exit 0
