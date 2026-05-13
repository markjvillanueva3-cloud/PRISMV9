#!/usr/bin/env node
// tier: T4
/**
 * stop-bash-orphan-cleaner.mjs — Stop hook
 *
 * Kills orphaned bash.exe processes. Background: ~50+ bash.exe accumulated
 * in Task Manager overnight from a Claude session. Each Bash tool call
 * spawns a bash.exe; sometimes the bash doesn't exit cleanly (npm scripts
 * spawning detached children, stdin/stdout buffer issues, msys shim bugs).
 *
 * SCOPING (decided 2026-04-30 after testing):
 *   PPID chains can't reliably identify "this session's" bashes — peer
 *   chats run concurrently, and bash leaks happen precisely BECAUSE
 *   intermediate bash wrappers die. Walking up the chain from the hook
 *   breaks at the first already-dead intermediate; walking down from
 *   claude.exe has the same gap (orphaned grandchildren PPID at dead PIDs).
 *
 *   Tested heuristic: ANY bash.exe with age > 30 min AND CPU < 5s is a
 *   leak — regardless of which Claude session spawned it. Active work
 *   either: (a) is fresher than 30 min, or (b) has accumulated >5s CPU
 *   from real subprocess work. Peer chats' actively-pending bashes pass
 *   the filter on one of those two conditions. Long-idle bashes ARE the
 *   leak class — that's exactly what we want to clean.
 *
 * KILL CRITERIA (all must hold):
 *   1. process name == "bash.exe"
 *   2. age >= GRACE_SECONDS (default 1800s = 30 min)
 *   3. total CPU < CPU_IDLE_THRESHOLD (default 5.0s — idle process)
 *
 * SAFETY:
 *   - never throws into hook output (best-effort, JSON {continue:true} always)
 *   - drains stdin so the hook harness can't hang
 *   - logs to state/shared/bash-orphan-cleaner.log
 *   - dry-run via PRISM_BASH_ORPHAN_DRY_RUN=1 or --dry-run arg
 *   - hard cap on kills per run (MAX_KILL_PER_RUN) bounds damage if logic regresses
 *   - PowerShell timeout 8s; if PS hangs we exit clean
 *
 * Pattern mirrors node-orphan-cleaner.mjs (the existing orphan reaper).
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const LOG_DIR = "H:/prism/state/shared";
const LOG_FILE = join(LOG_DIR, "bash-orphan-cleaner.log");
const TEMP_DIR = process.env.TEMP || "C:\\Temp";
const DRY_RUN = process.argv.includes("--dry-run") || process.env.PRISM_BASH_ORPHAN_DRY_RUN === "1";

const GRACE_SECONDS = 1800;        // 30 min — protects all reasonable active work
const CPU_IDLE_THRESHOLD = 5.0;    // total CPU seconds — under this is "idle"
const PS_TIMEOUT_MS = 8000;
const KILL_TIMEOUT_MS = 4000;
const MAX_KILL_PER_RUN = 100;      // safety cap (overnight leak count was ~50)

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
 * Single PowerShell call returning all process metadata we need:
 *   pid|ppid|ageSec|cpuSec|name
 */
function listAllProcesses() {
  const psScript = `
$now = Get-Date
$cpuByPid = @{}
try {
  Get-Process -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.CPU) { $cpuByPid[$_.Id] = [math]::Round($_.CPU, 2) }
  }
} catch {}
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ForEach-Object {
  $age = 0
  if ($_.CreationDate) {
    try { $age = [math]::Round(($now - $_.CreationDate).TotalSeconds) } catch {}
  }
  $cpu = 0
  if ($cpuByPid.ContainsKey($_.ProcessId)) { $cpu = $cpuByPid[$_.ProcessId] }
  Write-Output "$($_.ProcessId)|$($_.ParentProcessId)|$age|$cpu|$($_.Name)"
}
`.trim();

  const tempScript = join(TEMP_DIR, `prism_bash_orphan_${process.pid}.ps1`);
  try {
    writeFileSync(tempScript, psScript, "utf8");
    const output = execFileSync(
      POWERSHELL,
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tempScript],
      { timeout: PS_TIMEOUT_MS, encoding: "utf8", windowsHide: true },
    ).trim();
    if (!output) return new Map();
    const map = new Map();
    for (const line of output.split(/\r?\n/)) {
      const parts = line.trim().split("|");
      if (parts.length < 5) continue;
      const pid = Number.parseInt(parts[0], 10);
      const ppid = Number.parseInt(parts[1], 10);
      const ageSec = Number.parseInt(parts[2], 10);
      const cpuSec = Number.parseFloat(parts[3]);
      const name = parts.slice(4).join("|").trim();
      if (Number.isFinite(pid) && name) {
        map.set(pid, {
          name,
          ppid: Number.isFinite(ppid) ? ppid : 0,
          ageSec: Number.isFinite(ageSec) ? ageSec : 0,
          cpuSec: Number.isFinite(cpuSec) ? cpuSec : 0,
        });
      }
    }
    return map;
  } catch (error) {
    log(`listAllProcesses failed: ${error?.message || error}`);
    return new Map();
  } finally {
    try { unlinkSync(tempScript); } catch { /* best-effort */ }
  }
}

function killProcess(pid) {
  try {
    execFileSync("taskkill", ["/F", "/PID", String(pid)], {
      timeout: KILL_TIMEOUT_MS,
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main() {
  const stdinRaw = readStdinSafe();
  let sessionId = "unknown";
  try {
    const payload = stdinRaw ? JSON.parse(stdinRaw) : {};
    sessionId = payload?.session_id || payload?.sessionId || "unknown";
  } catch {
    /* invalid JSON — keep sessionId=unknown */
  }

  const processMap = listAllProcesses();
  if (processMap.size === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Identify leaked bash.exe (idle + old). Cross-session by design — see
  // SCOPING note above. Active work passes via either fresh age or accrued CPU.
  const targets = [];
  for (const [pid, info] of processMap) {
    if (pid === process.pid) continue;
    if (info.name.toLowerCase() !== "bash.exe") continue;
    if (info.ageSec < GRACE_SECONDS) continue;
    if (info.cpuSec >= CPU_IDLE_THRESHOLD) continue;
    targets.push({ pid, ageSec: info.ageSec, cpuSec: info.cpuSec, ppid: info.ppid });
  }

  if (targets.length === 0) {
    log(`session=${sessionId} no orphan bash.exe found (scanned ${processMap.size} procs)`);
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const capped = targets.slice(0, MAX_KILL_PER_RUN);
  let killed = 0;
  let denied = 0;
  for (const target of capped) {
    if (DRY_RUN) {
      log(`DRY RUN would kill bash.exe pid=${target.pid} ppid=${target.ppid}(idle) age=${target.ageSec}s cpu=${target.cpuSec}s`);
      killed += 1;
      continue;
    }
    if (killProcess(target.pid)) {
      killed += 1;
      log(`killed bash.exe pid=${target.pid} ppid=${target.ppid}(idle) age=${target.ageSec}s cpu=${target.cpuSec}s`);
    } else {
      denied += 1;
      log(`access denied bash.exe pid=${target.pid} ppid=${target.ppid}(idle) age=${target.ageSec}s`);
    }
  }

  const overflow = targets.length - capped.length;
  const summary = `bash-orphan-cleaner: ${killed} killed${DRY_RUN ? " (dry-run)" : ""}, ${denied} denied${overflow > 0 ? `, ${overflow} skipped (cap=${MAX_KILL_PER_RUN})` : ""} (session=${sessionId})`;
  log(summary);
  process.stdout.write(JSON.stringify({ continue: true, systemMessage: summary }));
}

try { main(); } catch (e) {
  try { log(`fatal: ${e?.message || e}`); } catch { /* nope */ }
  process.stdout.write(JSON.stringify({ continue: true }));
}
