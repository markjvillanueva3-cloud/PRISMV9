#!/usr/bin/env node
// tier: T3
/**
 * Node Process Janitor — PreToolUse `.*` (hot path) + scheduled `--full` (backstop)
 *
 * Problem: ~8 concurrent Claude terminals × ~15 PreToolUse + ~9 PostToolUse hooks
 * per tool call → dozens of `node`/`bash` processes spawned per second. On Windows
 * the *fork itself* (CreateProcess + per-process DLL init for the Git-for-Windows
 * `bash.exe` wrapper) is the expensive part; under process-table saturation it
 * fails (`STATUS_DLL_INIT_FAILED 0xC0000142`) and the hook orphans instead of
 * exiting. Orphans accumulate → everything crawls → the session hangs. And the
 * Stop hooks meant to reap orphans never run, because a hung session never fires
 * Stop. This janitor is the one cleanup path that runs *before* the hang.
 *
 * What it kills (best-effort, age-gated so live hooks survive):
 *   1. `node.exe`  whose cmdline references `.claude/hooks` or `.claude/helpers`
 *      and is older than MAX_AGE_SECONDS (well past any 10s hook timeout).
 *   2. `bash.exe` / `sh.exe` (Git-for-Windows) whose cmdline references
 *      `.claude/hooks` or `.claude/helpers` and is older than MAX_AGE_SECONDS.
 *      ← these are the double-fork wrappers that actually wedge on stdio.
 *   3. Orphan MCP servers — `node.exe` running `@playwright/mcp`,
 *      `mcp-http-bridge.mjs`, or the PRISM MCP `dist/index.js` — but ONLY when
 *      their parent process no longer exists (true orphan from a dead session)
 *      AND they're older than MAX_AGE_SECONDS. The current session's MCP servers
 *      always have the live Claude harness as parent, so they are never touched.
 *
 * Modes:
 *   (default)  hot-path: throttled via stamp file (≈20ms no-op most calls,
 *              real sweep ≈ once per THROTTLE_SECONDS). Wire on PreToolUse `.*`.
 *   --full     scheduled-task mode: ignore the throttle, always sweep, also do
 *              the orphan-MCP pass. Wire as a Windows Scheduled Task every ~2min
 *              so reaping continues even when every Claude session is hung.
 *   --verbose  log to stderr.
 *
 * Design notes:
 *   - No external deps; node built-ins only.
 *   - Match-gated + age-gated + (for MCP) parent-dead-gated — never touches
 *     system node, the user's editor LSP, or a live session's MCP.
 *   - Silent unless --verbose; never throws (exit always 0 — best-effort).
 */

import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { platform, tmpdir } from "node:os";
import { exit } from "node:process";
import { join } from "node:path";

const STAMP = "H:/prism/state/shared/.hook-janitor-stamp";
const STAMP_DIR = "H:/prism/state/shared";
const THROTTLE_SECONDS = 30;
const MAX_AGE_SECONDS = 45;
const PS_TIMEOUT_MS = 8000;
const VERBOSE = process.argv.includes("--verbose");
const FULL = process.argv.includes("--full") || process.argv.includes("--scheduled");

function log(msg) {
  if (VERBOSE) process.stderr.write(`[node-janitor] ${msg}\n`);
}

function readStamp() {
  try { return parseInt(readFileSync(STAMP, "utf-8").trim(), 10) || 0; }
  catch { return 0; }
}
function writeStamp(ts) {
  try { mkdirSync(STAMP_DIR, { recursive: true }); } catch {}
  try { writeFileSync(STAMP, String(ts), "utf-8"); } catch {}
}

// Drain stdin (hook input) — we don't need it. Only when invoked as a hook;
// a scheduled-task / CLI invocation has no stdin pipe and reading fd 0 there
// can block waiting for an EOF that never comes.
if (!FULL) {
  try { readFileSync(0, "utf-8"); } catch {}
}

if (!FULL) {
  const now = Math.floor(Date.now() / 1000);
  const lastRun = readStamp();
  if (now - lastRun < THROTTLE_SECONDS) {
    log(`throttled (${now - lastRun}s < ${THROTTLE_SECONDS}s)`);
    exit(0);
  }
  writeStamp(now);
}

const isWin = platform() === "win32";
const self = process.pid;

try {
  if (isWin) {
    // One PS pass: snapshot all processes, then kill by category. Written to a
    // temp .ps1 to dodge all shell-quoting hazards.
    const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
$cutoff = (Get-Date).AddSeconds(-${MAX_AGE_SECONDS})
$self = ${self}
$procs = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
$alivePids = @{}
foreach ($p in $procs) { $alivePids[[int]$p.ProcessId] = $true }
$killed = 0
function Kill-Proc($p, $reason) {
  try { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue; $script:killed++ } catch {}
}
foreach ($p in $procs) {
  if ($p.ProcessId -eq $self) { continue }
  $cl = $p.CommandLine
  if ($null -eq $cl) { continue }
  $name = $p.Name
  $isHookNode = ($name -eq 'node.exe') -and ($cl -like '*.claude\\hooks*' -or $cl -like '*.claude/hooks*' -or $cl -like '*.claude\\helpers*' -or $cl -like '*.claude/helpers*')
  $isHookBash = (($name -eq 'bash.exe') -or ($name -eq 'sh.exe')) -and ($cl -like '*.claude/hooks*' -or $cl -like '*.claude\\hooks*' -or $cl -like '*.claude/helpers*' -or $cl -like '*.claude\\helpers*')
  # Orphan-MCP targets: only unambiguous, harness-spawned MCP servers. (We do
  # NOT match a bare 'dist/index.js' — too generic; a dead PRISM MCP is reaped
  # by stop_close_prism_nodes_v2 / PRISM Node Orphan Cleaner instead.)
  $isMcp     = ($name -eq 'node.exe') -and ($cl -like '*@playwright*mcp*' -or $cl -like '*mcp-http-bridge.mjs*')
  if (-not ($isHookNode -or $isHookBash -or $isMcp)) { continue }
  # Age gate (all categories): never touch anything younger than the cutoff.
  if ($null -ne $p.CreationDate -and $p.CreationDate -ge $cutoff) { continue }
  if ($isHookNode -or $isHookBash) {
    Kill-Proc $p 'stale-hook'
    continue
  }
  if ($isMcp) {
    # Only kill MCP servers whose parent process is gone (true orphan from a
    # dead session). A live session's MCP always has a live parent.
    $ppid = [int]$p.ParentProcessId
    if (-not $alivePids.ContainsKey($ppid)) { Kill-Proc $p 'orphan-mcp' }
  }
}
Write-Output $killed
`.trim();

    const psFile = join(tmpdir(), `prism-janitor-${process.pid}-${Date.now()}.ps1`);
    writeFileSync(psFile, psScript, "utf-8");
    let killed = "0";
    try {
      killed = execSync(
        `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${psFile}"`,
        { timeout: PS_TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"], windowsHide: true },
      ).toString().trim();
    } finally { try { unlinkSync(psFile); } catch {} }
    log(`windows cleanup complete (killed=${killed}, full=${FULL})`);
  } else {
    // POSIX: kill stale .claude/hooks|helpers node+bash; skip self & this script.
    const cmd =
      `ps -eo pid=,ppid=,etimes=,comm=,args= 2>/dev/null | ` +
      `awk -v self=${self} '($1+0)!=self && ($3+0)>${MAX_AGE_SECONDS} && ` +
      `($0 ~ /\\.claude\\/(hooks|helpers)/) && !/node-process-janitor/ {print $1}' | ` +
      `xargs -r kill -TERM 2>/dev/null; true`;
    execSync(cmd, { timeout: PS_TIMEOUT_MS, stdio: "ignore", shell: "/bin/sh" });
    log(`unix cleanup complete (full=${FULL})`);
  }
} catch (err) {
  log(`cleanup failed: ${err?.message || err}`);
}

exit(0);
