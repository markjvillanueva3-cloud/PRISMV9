#!/usr/bin/env node
/**
 * Node Process Janitor — PostToolUse / UserPromptSubmit
 *
 * Problem: 6+ concurrent Claude terminals × ~14 PreToolUse + ~10 PostToolUse hooks
 * per tool call → dozens of `node` processes spawned per second. Some leak past
 * their declared timeouts and linger as zombies, compounding over hours until
 * the PC is unusable.
 *
 * This janitor kills orphaned PRISM hook/helper `node` processes older than a
 * safety threshold — well past any legitimate hook timeout (max 10s declared).
 *
 * Design:
 *   - Throttled via stamp file: only runs once per THROTTLE_SECONDS.
 *   - Cheap no-op on hot path (reads stamp, exits if recent).
 *   - Age-gated: only kills nodes older than MAX_AGE_SECONDS — active hooks survive.
 *   - Match-gated: only touches node processes whose command line references
 *     `.claude/hooks` or `.claude/helpers` — never system or user node.
 *   - Silent (unless --verbose): never throws.
 *   - No external deps: node built-ins only.
 *
 * Exit: always 0 (best-effort cleanup).
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
const PS_TIMEOUT_MS = 5000;
const VERBOSE = process.argv.includes("--verbose");

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

// Drain stdin (hook input) — we don't need it
try { readFileSync(0, "utf-8"); } catch {}

const now = Math.floor(Date.now() / 1000);
const lastRun = readStamp();
if (now - lastRun < THROTTLE_SECONDS) {
  log(`throttled (${now - lastRun}s < ${THROTTLE_SECONDS}s)`);
  exit(0);
}
writeStamp(now);

const isWin = platform() === "win32";
const self = process.pid;

try {
  if (isWin) {
    // Write PS script to a temp file — avoids all shell quoting issues.
    const psScript = `
$cutoff = (Get-Date).AddSeconds(-${MAX_AGE_SECONDS})
$self = ${self}
$killed = 0
try {
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.ProcessId -ne $self -and
      $_.CommandLine -ne $null -and
      ($_.CommandLine -like '*\\.claude\\hooks*' -or
       $_.CommandLine -like '*\\.claude\\helpers*' -or
       $_.CommandLine -like '*.claude/hooks*' -or
       $_.CommandLine -like '*.claude/helpers*') -and
      $_.CreationDate -lt $cutoff
    } |
    ForEach-Object {
      try {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        $killed++
      } catch {}
    }
} catch {}
Write-Output $killed
`.trim();

    const psFile = join(tmpdir(), `prism-janitor-${process.pid}-${Date.now()}.ps1`);
    writeFileSync(psFile, psScript, "utf-8");

    // Portable-node child shell PATH may not contain `powershell` — resolve
    // it explicitly via SystemRoot so this janitor actually runs (was failing
    // silently and reporting "complete" with no nodes killed).
    const sysRoot = process.env.SystemRoot || process.env.SYSTEMROOT || "C:\\Windows";
    const psExe = `${sysRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
    let killed = "0";
    try {
      killed = execSync(
        `"${psExe}" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${psFile}"`,
        { timeout: PS_TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"], windowsHide: true },
      ).toString().trim();
    } finally {
      try { unlinkSync(psFile); } catch {}
    }
    log(`windows cleanup complete (killed=${killed})`);
  } else {
    const cmd =
      `ps -eo pid=,etimes=,args= 2>/dev/null | ` +
      `awk -v self=${self} '($1+0) != self && ($2+0) > ${MAX_AGE_SECONDS} && ` +
      `($0 ~ /\\.claude\\/hooks/ || $0 ~ /\\.claude\\/helpers/) && !/node-process-janitor/ {print $1}' | ` +
      `xargs -r kill -TERM 2>/dev/null; true`;
    execSync(cmd, { timeout: PS_TIMEOUT_MS, stdio: "ignore", shell: "/bin/sh" });
    log("unix cleanup complete");
  }
} catch (err) {
  log(`cleanup failed: ${err?.message || err}`);
}

exit(0);
