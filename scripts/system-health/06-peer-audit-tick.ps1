# =====================================================================
# PRISM System Health 06 — Peer Audit Tick
# CLEANUP-MS0 / U-CLEANUP-B6
# =====================================================================
# Invokes PeerCommitAuditorEngine.tickFromCli() from PowerShell via
# `node -e "import('...').then(m => m.tickFromCli())"`. NOT the MCP HTTP
# bridge — per spec R1-B1 the bridge on port 3100 doesn't exist as an
# HTTP surface (PRISM MCP is stdio-only); cron has no MCP client; node
# direct import is the contracted I/O envelope.
#
# Sets PRISM_GOLF_TICK=1 so any Stop gates triggered by the tick's
# downstream writes (LedgerStoreEngine, peer-audit-ticks.jsonl) short-
# circuit instead of blocking — the cron is a non-interactive context
# without a chat to dismiss the gate.
#
# Cron-friendly:
#   - exits 0 on success (TickResult written to stdout as JSON)
#   - exits 0 ALSO on idle-skip (the G15 activity gate is a feature, not failure)
#   - exits non-zero ONLY on a real engine error (dist not built, node crash,
#     unhandled exception inside tickFromCli)
#   - stdout = the JSON envelope from tickFromCli (cron loggers preserve it)
#   - stderr = diagnostic only
#
# Spec: state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md line 54 + R1-B1/R1-B2
# Envelope: mcp-server/data/milestones/CLEANUP-MS0.json (U-CLEANUP-B6)
# Depends on: U-CLEANUP-B1 (PeerCommitAuditorEngine.ts), U-CLEANUP-B2 (dispatcher)
#
# Usage (interactive / cron):
#   pwsh -NoProfile -File H:/prism/scripts/system-health/06-peer-audit-tick.ps1
#   pwsh -NoProfile -File H:/prism/scripts/system-health/06-peer-audit-tick.ps1 -DryRun
#   pwsh -NoProfile -File H:/prism/scripts/system-health/06-peer-audit-tick.ps1 -SkipActivityGate
# =====================================================================

[CmdletBinding()]
param(
    # Forwarded to tickFromCli — computes the plan but writes nothing.
    [switch]$DryRun,

    # Skip the G15 fleet-idle activity gate. Default: gate is active and a
    # quiet fleet → cheap exit. Pass when you want to FORCE a full tick
    # (debug or manual sweep).
    [switch]$SkipActivityGate,

    # Override the activity-gate window (hours). Defaults to engine default.
    [int]$ActivityWindowHours = 0,

    # Repo root override — defaults to H:/prism so the script works regardless
    # of where it's invoked from (Windows Task Scheduler runs in C:\Windows\System32
    # by default).
    [string]$RepoRoot = "H:/prism",

    # Verbose stderr — surfaces the node CLI command before invocation. The
    # standard $VerbosePreference / -Verbose flag also activates this.
    [switch]$DebugCli
)

$ErrorActionPreference = "Stop"
$startedAtIso = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

# --- Resolve PeerCommitAuditorEngine compiled module path ------------------
# Lazy-import target. Two candidate paths cover both the flat dist layout
# and the mirrored mcp-server/src layout (matches G8's coord-factory pattern).
$candidatePaths = @(
    "$RepoRoot/mcp-server/dist/engines/PeerCommitAuditorEngine.js",
    "$RepoRoot/mcp-server/dist/mcp-server/src/engines/PeerCommitAuditorEngine.js"
)
$enginePath = $null
foreach ($p in $candidatePaths) {
    if (Test-Path $p) { $enginePath = $p; break }
}
if (-not $enginePath) {
    Write-Error @"
PeerCommitAuditorEngine not built. Tried:
$($candidatePaths | ForEach-Object { "  - $_" } | Out-String)
Run ``npm run build:fast`` from $RepoRoot/mcp-server/ first.
"@
    exit 2
}

# --- Build the node -e import script ---------------------------------------
# Use file:// URL so Windows backslashes / spaces / drive letters resolve
# correctly via node:url, mirroring G8's pathToFileURL fix.
$engineUrl = "file:///" + ($enginePath -replace "\\", "/")

# argv flags to forward to tickFromCli — match the engine's parseCliArgs contract.
$nodeArgs = @()
if ($DryRun)            { $nodeArgs += "--dry-run" }
if ($SkipActivityGate)  { $nodeArgs += "--no-activity-gate" }
if ($ActivityWindowHours -gt 0) { $nodeArgs += "--activity-window-hours"; $nodeArgs += "$ActivityWindowHours" }

# The node -e script: import the engine, invoke tickFromCli, propagate exit.
# tickFromCli's contract: side-effects (stdout JSON + process.exit) are the
# return value; we capture stdout/stderr/exitcode and forward verbatim.
$nodeScript = @"
import('$engineUrl').then(m => {
  if (typeof m.tickFromCli !== 'function') {
    process.stderr.write('PeerCommitAuditorEngine.tickFromCli is not a function (module shape changed?)\n');
    process.exit(2);
  }
  try {
    const r = m.tickFromCli();
    // tickFromCli may be sync (returns plain object) OR async (returns Promise).
    // Handle both.
    if (r && typeof r.then === 'function') {
      r.then(v => { process.stdout.write(JSON.stringify(v, null, 2) + '\n'); process.exit(0); })
       .catch(e => { process.stderr.write('tick error: ' + (e && e.stack || e) + '\n'); process.exit(2); });
    } else {
      process.stdout.write(JSON.stringify(r, null, 2) + '\n');
      process.exit(0);
    }
  } catch (e) {
    process.stderr.write('tick threw: ' + (e && e.stack || e) + '\n');
    process.exit(2);
  }
}).catch(e => {
  process.stderr.write('import error: ' + (e && e.stack || e) + '\n');
  process.exit(2);
});
"@

# --- Resolve node ----------------------------------------------------------
# Prefer portable node H:/Tools/nodejs/node.exe per SessionStart hint, fall
# back to PATH lookup. Surface a clear error if neither is present.
$nodeExe = $null
if (Test-Path "H:/Tools/nodejs/node.exe") {
    $nodeExe = "H:/Tools/nodejs/node.exe"
} else {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) { $nodeExe = $nodeCmd.Source }
}
if (-not $nodeExe) {
    Write-Error "node.exe not found (looked in H:/Tools/nodejs and PATH). Cannot run B6 tick."
    exit 2
}

if ($DebugCli -or $VerbosePreference -ne 'SilentlyContinue') {
    Write-Verbose "[B6] startedAt=$startedAtIso"
    Write-Verbose "[B6] node     =$nodeExe"
    Write-Verbose "[B6] engine   =$enginePath"
    Write-Verbose "[B6] args     =$($nodeArgs -join ' ')"
}

# --- Invoke with PRISM_GOLF_TICK=1 to short-circuit Stop gates ------------
# Stop gates (scrutinize-before-stop, enforce-handoff-topic, stop_on_unwired_assets,
# etc.) are designed for an interactive chat dismissing them. A cron tick has
# no chat — the env var tells the gates to skip themselves cleanly per the
# unit spec ("sets PRISM_GOLF_TICK=1 env var so Stop gates short-circuit").
$origGolfTick = $env:PRISM_GOLF_TICK
$env:PRISM_GOLF_TICK = "1"
try {
    # Build the full argv as a single array — & passes each element as a
    # discrete argv slot, preventing shell-splitting on prompts that contain
    # spaces. Capture stdout/stderr/exitcode independently.
    $allArgs = @("-e", $nodeScript) + $nodeArgs

    # PowerShell's 2>&1 merges stderr into the success stream; we keep them
    # split so the cron logger can distinguish JSON-stdout from diagnostics.
    # Use Start-Process for proper stream separation? No — & with output
    # redirection to a temp file is cleaner and avoids PIPE buffer limits.
    $stdoutFile = [System.IO.Path]::GetTempFileName()
    $stderrFile = [System.IO.Path]::GetTempFileName()
    try {
        $proc = Start-Process -FilePath $nodeExe -ArgumentList $allArgs `
            -NoNewWindow -Wait -PassThru `
            -RedirectStandardOutput $stdoutFile `
            -RedirectStandardError $stderrFile
        $exitCode = $proc.ExitCode

        # Forward stdout verbatim (JSON envelope from tickFromCli) and stderr
        # verbatim (diagnostics) — preserves the contract for cron loggers.
        if (Test-Path $stdoutFile) {
            $stdout = Get-Content $stdoutFile -Raw -ErrorAction SilentlyContinue
            if ($stdout) { [Console]::Out.Write($stdout) }
        }
        if (Test-Path $stderrFile) {
            $stderr = Get-Content $stderrFile -Raw -ErrorAction SilentlyContinue
            if ($stderr) { [Console]::Error.Write($stderr) }
        }
    } finally {
        Remove-Item $stdoutFile -ErrorAction SilentlyContinue
        Remove-Item $stderrFile -ErrorAction SilentlyContinue
    }

    if ($exitCode -ne 0) {
        Write-Verbose "[B6] tick exited with code $exitCode"
        exit $exitCode
    }
    exit 0
}
finally {
    # Restore the prior PRISM_GOLF_TICK value (idempotent — set to $null
    # works if it wasn't set originally; PowerShell deletes the variable).
    if ($null -eq $origGolfTick) { Remove-Item Env:PRISM_GOLF_TICK -ErrorAction SilentlyContinue }
    else { $env:PRISM_GOLF_TICK = $origGolfTick }
}
