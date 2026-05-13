#!/usr/bin/env node
// tier: T4
/**
 * bash-orphan-cleaner.mjs — Stop hook that kills orphaned bash.exe subprocesses
 * spawned by THIS Claude Code session.
 *
 * Why: Claude Code on Windows spawns bash.exe per Bash tool call. Interrupted
 * tool calls and crashed run_in_background tasks leak bash.exe — the user
 * found 60+ stuck bash.exe in Task Manager when ejecting the H: drive last
 * night. This hook cleans them up at every Stop.
 *
 * Scoping (peer-chat safe):
 *   1. Walk our ppid chain to find the ancestor named `claude.exe` — that is
 *      THIS session's host process (one claude.exe per chat).
 *   2. Collect bash.exe processes that are descendants of THAT specific
 *      claude.exe PID. Peer chats run their own claude.exe with disjoint
 *      descendant trees, so we never touch their bash.
 *   3. If the claude.exe ancestor cannot be located (unfamiliar host shell,
 *      detached invocation), no-op — never guess.
 *
 * Kill policy (conservative — avoids killing live background tasks):
 *   - Only bash.exe with NO living children (leaves only — active background
 *     tasks like `npm run dev` keep child processes, so they're skipped).
 *   - Only bash.exe older than ORPHAN_AGE_SECONDS (in-flight Bash tool calls
 *     are typically <60s old; protects fresh subprocesses from race kills).
 *
 * Best-effort: returns {continue:true} on every error path. Stop hooks must
 * never block on cleanup failure.
 *
 * Disable: set env PRISM_BASH_CLEANUP=0
 */

import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ORPHAN_AGE_SECONDS = 60;
const MAX_ANCESTOR_DEPTH = 32;
const PS_ENUMERATE_TIMEOUT_MS = 8000;
const TASKKILL_TIMEOUT_MS = 3000;
// Cap kills per Stop firing so a large backlog can't run us past the hook
// timeout. Backlogs drain across multiple Stop events.
const MAX_KILLS_PER_RUN = 20;
const LOG_DIR = "H:/prism/state/shared";
const LOG_FILE = `${LOG_DIR}/bash-orphan-cleaner.log`;
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
  } catch { /* best-effort */ }
}

function drainStdin() {
  try { readFileSync(0, "utf8"); } catch { /* no stdin is fine */ }
}

function enumerateProcesses() {
  const psScript = `
$now = Get-Date
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ForEach-Object {
  $age = 0
  if ($_.CreationDate) {
    try { $age = [int]((New-TimeSpan -Start $_.CreationDate -End $now).TotalSeconds) } catch {}
  }
  Write-Output "$($_.ProcessId)|$($_.ParentProcessId)|$($_.Name)|$age"
}
`.trim();

  const tmp = join(TEMP_DIR, `prism_bash_orphan_${process.pid}.ps1`);
  try {
    writeFileSync(tmp, psScript, "utf8");
    const out = execFileSync(
      POWERSHELL,
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmp],
      { timeout: PS_ENUMERATE_TIMEOUT_MS, encoding: "utf8", windowsHide: true },
    ).trim();
    if (!out) return [];
    return out
      .split(/\r?\n/)
      .map((line) => {
        const [pid, ppid, name, age] = line.split("|");
        return {
          pid: Number.parseInt(pid, 10),
          ppid: Number.parseInt(ppid, 10),
          name: (name || "").trim(),
          age: Number.parseInt(age, 10) || 0,
        };
      })
      .filter((p) => Number.isFinite(p.pid));
  } catch (err) {
    log(`enumerate failed: ${err?.message || err}`);
    return [];
  } finally {
    try { unlinkSync(tmp); } catch { /* best-effort */ }
  }
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
  const out = [];
  const stack = [rootPid];
  const seen = new Set([rootPid]);
  while (stack.length) {
    const cur = stack.pop();
    for (const child of byParent.get(cur) || []) {
      if (seen.has(child.pid)) continue;
      seen.add(child.pid);
      out.push(child);
      stack.push(child.pid);
    }
  }
  return out;
}

function killProcess(pid) {
  try {
    execFileSync("taskkill", ["/F", "/PID", String(pid)], {
      timeout: TASKKILL_TIMEOUT_MS, encoding: "utf8", windowsHide: true,
    });
    return true;
  } catch { return false; }
}

function main() {
  drainStdin();

  if (process.env.PRISM_BASH_CLEANUP === "0") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const procs = enumerateProcesses();
  if (procs.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const byPid = new Map(procs.map((p) => [p.pid, p]));
  const byParent = new Map();
  for (const p of procs) {
    if (!byParent.has(p.ppid)) byParent.set(p.ppid, []);
    byParent.get(p.ppid).push(p);
  }

  const claudePid = findClaudeAncestor(process.pid, byPid);
  if (!claudePid) {
    log(`no claude.exe ancestor from pid=${process.pid} — chain broken (test artifact or detached spawn) — skipping`);
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const descendants = collectDescendants(claudePid, byParent);

  // Don't kill the bash.exe that hosts THIS hook invocation (and its parent
  // chain) — those are active right now and bash will exit naturally when the
  // hook returns. Build a protect-set from our own ancestor chain.
  const selfChain = new Set();
  {
    let cur = process.pid;
    for (let i = 0; i < MAX_ANCESTOR_DEPTH; i++) {
      selfChain.add(cur);
      const p = byPid.get(cur);
      if (!p || !p.ppid || p.ppid <= 4) break;
      cur = p.ppid;
    }
  }

  const allCandidates = descendants.filter(
    (p) =>
      /^bash\.exe$/i.test(p.name) &&
      !selfChain.has(p.pid) &&
      p.age >= ORPHAN_AGE_SECONDS &&
      (byParent.get(p.pid) || []).length === 0,
  );

  if (allCandidates.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Oldest first — those are the most likely true orphans.
  allCandidates.sort((a, b) => b.age - a.age);
  const candidates = allCandidates.slice(0, MAX_KILLS_PER_RUN);
  const deferred = allCandidates.length - candidates.length;

  let killed = 0;
  for (const c of candidates) {
    if (killProcess(c.pid)) {
      killed++;
      log(`killed bash pid=${c.pid} ppid=${c.ppid} age=${c.age}s claude=${claudePid}`);
    } else {
      log(`failed kill bash pid=${c.pid} ppid=${c.ppid} (access denied or already gone)`);
    }
  }

  if (killed > 0) {
    const tail = deferred > 0 ? `, deferred=${deferred}` : "";
    process.stdout.write(JSON.stringify({
      continue: true,
      systemMessage: `bash-orphan-cleaner: reaped ${killed}/${candidates.length} orphan bash.exe (claude=${claudePid}${tail})`,
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

try { main(); } catch (err) {
  log(`fatal: ${err?.message || err}`);
  try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* noop */ }
}
