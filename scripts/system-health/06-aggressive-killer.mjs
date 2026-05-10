#!/usr/bin/env node
/**
 * 06-aggressive-killer.mjs - emergency reaper for stuck bash/git/node processes.
 *
 * Use cases:
 *   - Pressure-gate self-heal (invoked from commit-pressure-stop-gate.mjs)
 *   - Manual emergency cleanup when system commit memory is pinned
 *   - Recovery after a chat hangs on an unfinished tool call
 *
 * Kill rules (all conservative — never touches descendants of MY claude.exe):
 *   1. git.exe / git-credential-* / git-remote-* older than --git-age (default 120s)
 *      Rationale: git operations are fast; >2min usually means stuck on auth prompt
 *      or dead remote. Safe to kill, git operations are atomic-then-commit.
 *   2. bash.exe leaves (no live children) older than --bash-age (default 300s)
 *      that are NOT on my parent chain. Excludes interactive shells.
 *   3. node.exe transients matching vitest/jest/tsx/esbuild patterns older than
 *      --node-age (default 600s) where parent is dead.
 *   4. Stuck PowerShell.exe spawned by hooks older than 5 minutes (hook timeouts
 *      should kill these, but sometimes they leak).
 *
 * --aggressive lowers all thresholds: git-age=30s, bash-age=60s, node-age=180s.
 *
 * --json emits a structured result; otherwise prints a one-line summary.
 *
 * Output JSON:
 *   { killed: { bash:N, git:N, node:N, ps:N }, freed_mb:N, before:{commit_mb,limit_mb}, after:{...} }
 */

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, unlinkSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const AGGRESSIVE = args.includes("--aggressive");
const JSON_MODE = args.includes("--json");
const DRY_RUN = args.includes("--dry-run");

const GIT_AGE = AGGRESSIVE ? 30 : 120;
const BASH_AGE = AGGRESSIVE ? 60 : 300;
const NODE_AGE = AGGRESSIVE ? 180 : 600;
const PS_AGE = AGGRESSIVE ? 60 : 300;
const MAX_KILLS = 50;
const PS_TIMEOUT_MS = 8000;
const TASKKILL_TIMEOUT_MS = 3000;
const MAX_ANCESTOR_DEPTH = 32;

const LOG_DIR = "H:/prism/state/shared";
const LOG_FILE = `${LOG_DIR}/aggressive-killer.log`;
const TEMP_DIR = process.env.TEMP || "C:\\Temp";
const POWERSHELL = (() => {
  const sysroot = process.env.SystemRoot || "C:\\Windows";
  const full = join(sysroot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  return existsSync(full) ? full : "powershell";
})();

function log(msg) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`, "utf8");
  } catch {}
}

function enumerate() {
  const ps = `
$now = Get-Date
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ForEach-Object {
  $age = 0
  if ($_.CreationDate) {
    try { $age = [int]((New-TimeSpan -Start $_.CreationDate -End $now).TotalSeconds) } catch {}
  }
  $ws = if ($_.WorkingSetSize) { [int]($_.WorkingSetSize / 1MB) } else { 0 }
  $cmd = ""
  if ($_.CommandLine) { $cmd = ($_.CommandLine -replace '[\\r\\n\\|]',' ') }
  Write-Output "$($_.ProcessId)|$($_.ParentProcessId)|$($_.Name)|$age|$ws|$cmd"
}
  `.trim();
  const tmp = join(TEMP_DIR, `prism_agg_killer_${process.pid}.ps1`);
  try {
    writeFileSync(tmp, ps, "utf8");
    const out = execFileSync(
      POWERSHELL,
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmp],
      { timeout: PS_TIMEOUT_MS, encoding: "utf8", windowsHide: true }
    ).trim();
    if (!out) return [];
    return out.split(/\r?\n/).map((line) => {
      const [pid, ppid, name, age, ws, ...cmdParts] = line.split("|");
      return {
        pid: Number.parseInt(pid, 10),
        ppid: Number.parseInt(ppid, 10),
        name: (name || "").trim(),
        age: Number.parseInt(age, 10) || 0,
        ws: Number.parseInt(ws, 10) || 0,
        cmd: cmdParts.join("|").trim(),
      };
    }).filter((p) => Number.isFinite(p.pid));
  } catch (err) {
    log(`enumerate failed: ${err?.message || err}`);
    return [];
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
}

function readPressure() {
  try {
    const out = execFileSync(POWERSHELL, [
      "-NoProfile", "-Command",
      '$os = Get-CimInstance Win32_OperatingSystem; "$([math]::Round(($os.TotalVirtualMemorySize-$os.FreeVirtualMemory)/1MB,1)) $([math]::Round($os.TotalVirtualMemorySize/1MB,1))"'
    ], { encoding: "utf8", timeout: 4000 });
    const [used, limit] = out.trim().split(/\s+/).map(Number);
    return { used, limit, pct: limit > 0 ? (used / limit) * 100 : 0 };
  } catch { return null; }
}

function findClaudeAncestor(myPid, byPid) {
  let cur = myPid;
  for (let i = 0; i < MAX_ANCESTOR_DEPTH; i++) {
    const p = byPid.get(cur);
    if (!p) return 0;
    if (/^claude\.exe$/i.test(p.name)) return p.pid;
    if (!p.ppid || p.ppid <= 4) return 0;
    cur = p.ppid;
  }
  return 0;
}

function collectDescendants(rootPid, byParent) {
  const out = new Set();
  const stack = [rootPid];
  while (stack.length) {
    const cur = stack.pop();
    for (const child of byParent.get(cur) || []) {
      if (out.has(child.pid)) continue;
      out.add(child.pid);
      stack.push(child.pid);
    }
  }
  return out;
}

function selfChain(myPid, byPid) {
  const set = new Set();
  let cur = myPid;
  for (let i = 0; i < MAX_ANCESTOR_DEPTH; i++) {
    set.add(cur);
    const p = byPid.get(cur);
    if (!p || !p.ppid || p.ppid <= 4) break;
    cur = p.ppid;
  }
  return set;
}

function kill(pid) {
  if (DRY_RUN) return true;
  try {
    execFileSync("taskkill", ["/F", "/PID", String(pid)], {
      timeout: TASKKILL_TIMEOUT_MS, encoding: "utf8", windowsHide: true,
    });
    return true;
  } catch { return false; }
}

function isTransientNode(p) {
  if (!/^node\.exe$/i.test(p.name)) return false;
  const TRANSIENT = /\b(vitest|jest|mocha|ava|esbuild|ts-node|playwright|tsx)\b/i;
  return TRANSIENT.test(p.cmd) || /node(?:\.exe)?"?\s+-(e|-eval)(\s|$)/i.test(p.cmd);
}

function isProtectedNode(p) {
  const KEEP = [
    /node_modules[\\/]+vite[\\/]+bin[\\/]+vite\.js/i,
    /scripts[\\/]+start-http\.mjs/i,
    /agent-coordination-daemon\.mjs/i,
    /mcp-server[\\/]+dist[\\/]+index\.js/i,
    /prism-context-only\.ts/i,
    /@playwright[\\/]mcp/i,
    /Claude Extensions/i,
    /Adobe/i,
  ];
  return KEEP.some((re) => re.test(p.cmd));
}

function main() {
  const before = readPressure();
  const procs = enumerate();
  if (procs.length === 0) {
    const result = { killed: { bash: 0, git: 0, node: 0, ps: 0 }, freed_mb: 0, before, after: before, dry_run: DRY_RUN };
    if (JSON_MODE) console.log(JSON.stringify(result));
    else console.log("aggressive-killer: no processes enumerated");
    return;
  }

  const byPid = new Map(procs.map((p) => [p.pid, p]));
  const byParent = new Map();
  for (const p of procs) {
    if (!byParent.has(p.ppid)) byParent.set(p.ppid, []);
    byParent.get(p.ppid).push(p);
  }
  const livePids = new Set(procs.map((p) => p.pid));

  const myClaude = findClaudeAncestor(process.pid, byPid);
  const myDescendants = myClaude ? collectDescendants(myClaude, byParent) : new Set();
  const myChain = selfChain(process.pid, byPid);
  const protect = (pid) => myDescendants.has(pid) || myChain.has(pid);

  const killed = { bash: 0, git: 0, node: 0, ps: 0 };
  let freed = 0;
  let killCount = 0;
  const killTargets = [];

  for (const p of procs) {
    if (killCount >= MAX_KILLS) break;
    if (protect(p.pid)) continue;
    if (p.pid <= 4) continue;

    let category = null;
    let reason = null;

    // Rule 1: stuck git
    if (/^git(\.exe)?$|^git-(credential|remote|http|index|pack|gui|update-server-info|upload-pack|receive-pack)/i.test(p.name)
        && p.age >= GIT_AGE) {
      category = "git";
      reason = `git stuck ${p.age}s`;
    }
    // Rule 2: bash.exe leaves
    else if (/^bash\.exe$/i.test(p.name)
        && p.age >= BASH_AGE
        && (byParent.get(p.pid) || []).length === 0) {
      // Skip if parent is interactive shell (claude.exe NOT in chain — already excluded above)
      category = "bash";
      reason = `bash leaf age=${p.age}s`;
    }
    // Rule 3: transient node with dead parent OR very old
    else if (/^node\.exe$/i.test(p.name)
        && !isProtectedNode(p)
        && p.age >= NODE_AGE) {
      const parentDead = !livePids.has(p.ppid);
      if (parentDead || isTransientNode(p)) {
        category = "node";
        reason = parentDead ? `node orphaned ppid=${p.ppid} age=${p.age}s` : `transient node age=${p.age}s`;
      }
    }
    // Rule 4: stuck PowerShell from hooks
    else if (/^powershell\.exe$/i.test(p.name)
        && p.age >= PS_AGE
        && (byParent.get(p.pid) || []).length === 0) {
      const parentDead = !livePids.has(p.ppid);
      if (parentDead) {
        category = "ps";
        reason = `pwsh orphan age=${p.age}s`;
      }
    }

    if (!category) continue;

    if (kill(p.pid)) {
      killed[category]++;
      freed += p.ws;
      killCount++;
      killTargets.push({ pid: p.pid, name: p.name, age: p.age, ws: p.ws, reason });
      log(`killed ${category} pid=${p.pid} name=${p.name} age=${p.age}s ws=${p.ws}MB reason=${reason}`);
    }
  }

  const after = readPressure();
  const result = {
    killed, freed_mb: freed, before, after,
    aggressive: AGGRESSIVE, dry_run: DRY_RUN,
    targets: killTargets.slice(0, 20),
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(result));
  } else {
    const total = killed.bash + killed.git + killed.node + killed.ps;
    const beforePct = before ? `${before.pct.toFixed(1)}%` : "n/a";
    const afterPct = after ? `${after.pct.toFixed(1)}%` : "n/a";
    console.log(`aggressive-killer${AGGRESSIVE?" (aggressive)":""}${DRY_RUN?" [dry-run]":""}: killed ${total} (bash:${killed.bash} git:${killed.git} node:${killed.node} ps:${killed.ps}) freed ~${freed} MB; commit ${beforePct} → ${afterPct}`);
  }
}

try { main(); } catch (err) {
  log(`fatal: ${err?.message || err}`);
  if (JSON_MODE) console.log(JSON.stringify({ killed: { bash:0, git:0, node:0, ps:0 }, freed_mb: 0, error: String(err?.message || err) }));
  else console.error(`aggressive-killer: fatal: ${err?.message || err}`);
  process.exit(1);
}
