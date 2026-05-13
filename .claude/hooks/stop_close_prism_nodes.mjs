#!/usr/bin/env node
// tier: T4
/**
 * stop_close_prism_nodes.mjs — Stop hook
 *
 * Reaps orphaned node.exe processes left behind by hook scripts that should
 * have exited at the end of their tool-call but lingered (stuck on stdin,
 * unresolved promises, dangling timers, etc). Companion to
 * stop-bash-orphan-cleaner.mjs which handles bash.exe wrappers.
 *
 * Background: a session running for a few hours accumulates 25-60 zombie
 * node processes from hook chains, each holding ~38MB of resident memory.
 * Across all chats this becomes ~1GB of unrecoverable RAM until the user
 * manually closes Task Manager processes (which is what we're preventing).
 *
 * KILL CRITERIA (all must hold):
 *   1. process name == "node.exe"
 *   2. CommandLine references `.claude/hooks/*.mjs` or `.claude/helpers/*.mjs`
 *   3. age >= GRACE_SECONDS  (default 120s — hooks should never run that long)
 *   4. total CPU < CPU_IDLE_THRESHOLD (default 1.0s — under this is idle)
 *
 * NEVER KILLED:
 *   - dist/index.js               (the MCP server brain — 100s of MB resident)
 *   - mcp-http-bridge.mjs         (IPC daemon, expected to be long-lived)
 *   - npm/npx wrappers            (likely peer-chat test runs)
 *   - anything not matching .claude/hooks/ or .claude/helpers/
 *
 * SAFETY:
 *   - never throws into hook output (best-effort; emits {continue:true} always)
 *   - drains stdin so the hook harness can't hang
 *   - logs to state/shared/node-orphan-cleaner.log
 *   - dry-run via PRISM_NODE_ORPHAN_DRY_RUN=1 or --dry-run arg
 *   - hard cap on kills per run (MAX_KILL_PER_RUN) bounds damage if logic regresses
 *   - PowerShell timeout 8s; if PS hangs we exit clean
 *
 * Pattern mirrors stop-bash-orphan-cleaner.mjs.
 *
 * Registered in H:/.claude/settings.json (Stop hook). Replaces the no-op
 * stub left by claude-cba638c3 with the real reaper.
 */

import { appendFileSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const LOG_DIR = "H:/prism/state/shared";
const LOG_FILE = join(LOG_DIR, "node-orphan-cleaner.log");
const TEMP_DIR = process.env.TEMP || "C:\\Temp";
const DRY_RUN = process.argv.includes("--dry-run") || process.env.PRISM_NODE_ORPHAN_DRY_RUN === "1";

const GRACE_SECONDS = 120;          // 2 min — hook scripts should never run this long
const CPU_IDLE_THRESHOLD = 1.0;     // total CPU seconds — under this is idle
const PS_TIMEOUT_MS = 8000;
const KILL_TIMEOUT_MS = 4000;
const MAX_KILL_PER_RUN = 80;        // safety cap (observed leak rate ~25/session)

// Whitelist patterns — matching processes are NEVER killed
const PROTECT_PATTERNS = [
  /dist[\\/]index\.js/i,            // MCP server
  /mcp-http-bridge\.mjs/i,          // IPC daemon
  /portable-node-guard\.mjs/i,      // active runtime guard
];

const POWERSHELL = (() => {
  const systemRoot = process.env.SystemRoot || process.env.SYSTEMROOT || "C:\\Windows";
  const fullPath = join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  return existsSync(fullPath) ? fullPath : "powershell";
})();

function log(message) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${message}\n`, "utf8");
  } catch {
    /* best-effort */
  }
}

/**
 * Single PowerShell call returning node process metadata:
 *   pid|ageSec|cpuSec|workingSetMB|commandLine
 */
function listNodeProcesses() {
  const psScript = `
$now = Get-Date
$cpuByPid = @{}
try {
  Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.CPU) { $cpuByPid[$_.Id] = [math]::Round($_.CPU, 2) }
  }
} catch {}
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
  $age = 0
  if ($_.CreationDate) {
    try { $age = [math]::Round(($now - $_.CreationDate).TotalSeconds) } catch {}
  }
  $cpu = 0
  if ($cpuByPid.ContainsKey([int]$_.ProcessId)) { $cpu = $cpuByPid[[int]$_.ProcessId] }
  $wsMB = if ($_.WorkingSetSize) { [math]::Round($_.WorkingSetSize / 1MB, 1) } else { 0 }
  $cl = if ($_.CommandLine) { $_.CommandLine -replace "\`r|\`n|\\|"," " } else { "" }
  Write-Output "$($_.ProcessId)|$age|$cpu|$wsMB|$cl"
}
`.trim();

  const tempScript = join(TEMP_DIR, `prism_node_orphan_${process.pid}.ps1`);
  try {
    writeFileSync(tempScript, psScript, "utf8");
    const output = execFileSync(
      POWERSHELL,
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tempScript],
      { timeout: PS_TIMEOUT_MS, encoding: "utf8", windowsHide: true },
    ).trim();
    if (!output) return [];
    const procs = [];
    for (const line of output.split(/\r?\n/)) {
      const parts = line.trim().split("|");
      if (parts.length < 5) continue;
      const pid = Number.parseInt(parts[0], 10);
      const ageSec = Number.parseInt(parts[1], 10);
      const cpuSec = Number.parseFloat(parts[2]);
      const wsMB = Number.parseFloat(parts[3]);
      const cmd = parts.slice(4).join("|").trim();
      if (Number.isFinite(pid)) {
        procs.push({
          pid,
          ageSec: Number.isFinite(ageSec) ? ageSec : 0,
          cpuSec: Number.isFinite(cpuSec) ? cpuSec : 0,
          wsMB: Number.isFinite(wsMB) ? wsMB : 0,
          cmd,
        });
      }
    }
    return procs;
  } catch (error) {
    log(`listNodeProcesses failed: ${error?.message || error}`);
    return [];
  } finally {
    try { unlinkSync(tempScript); } catch { /* ignore */ }
  }
}

function isHookOrHelper(cmd) {
  return /\.claude[\\/](hooks|helpers)[\\/][^"\s]+\.mjs/i.test(cmd);
}

function isProtected(cmd) {
  return PROTECT_PATTERNS.some((rx) => rx.test(cmd));
}

function shouldReap(p) {
  if (!isHookOrHelper(p.cmd)) return false;
  if (isProtected(p.cmd)) return false;
  if (p.ageSec < GRACE_SECONDS) return false;
  if (p.cpuSec >= CPU_IDLE_THRESHOLD) return false;
  return true;
}

function killPid(pid) {
  try {
    execFileSync(POWERSHELL, [
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command",
      `Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`,
    ], { timeout: KILL_TIMEOUT_MS, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

function shortName(cmd) {
  const m = cmd.match(/([^\\/]+\.mjs)/);
  return m ? m[1] : "(node)";
}

function emitContinue() {
  try {
    process.stdout.write(JSON.stringify({ continue: true }));
  } catch { /* swallow */ }
}

async function main() {
  // Drain stdin so the harness can't hang
  process.stdin.on("data", () => {});
  process.stdin.on("end", () => {});

  const start = Date.now();
  const procs = listNodeProcesses();
  const candidates = procs.filter(shouldReap);

  if (candidates.length === 0) {
    log(`scan: ${procs.length} node procs, 0 reapable (no zombies)`);
    emitContinue();
    return;
  }

  // Cap how many we kill per run
  const targets = candidates.slice(0, MAX_KILL_PER_RUN);
  const totalMB = Math.round(targets.reduce((sum, p) => sum + p.wsMB, 0));

  if (DRY_RUN) {
    log(`DRY_RUN would kill ${targets.length} procs (${totalMB}MB):`);
    for (const t of targets) {
      log(`  PID ${t.pid}  ${t.wsMB}MB  ${t.ageSec}s old  cpu=${t.cpuSec}s  ${shortName(t.cmd)}`);
    }
    emitContinue();
    return;
  }

  let killed = 0;
  for (const t of targets) {
    if (killPid(t.pid)) {
      killed++;
      log(`reaped PID ${t.pid}  ${t.wsMB}MB  ${t.ageSec}s old  ${shortName(t.cmd)}`);
    }
  }

  const elapsed = Date.now() - start;
  log(`reaper: scanned ${procs.length} node, ${candidates.length} reapable, ${killed} killed (${totalMB}MB), ${elapsed}ms`);
  emitContinue();
}

// Hard timeout — if anything wedges, exit clean rather than hang Stop
setTimeout(() => {
  emitContinue();
  process.exit(0);
}, PS_TIMEOUT_MS + KILL_TIMEOUT_MS + 2000);

main()
  .then(() => process.exit(0))
  .catch((e) => {
    log(`unhandled: ${e?.message || e}`);
    emitContinue();
    process.exit(0);
  });
