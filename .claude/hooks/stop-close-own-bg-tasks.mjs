#!/usr/bin/env node
// tier: T3
/**
 * stop-close-own-bg-tasks.mjs — "close your tool calls" enforcement (2026-05-30, slot golf)
 *
 * BLOCKING Stop hook that forces a chat to close its own run_in_background
 * Bash tasks before the turn ends. At Stop the turn's FOREGROUND tools have
 * already exited, so any bash.exe that is a still-alive DESCENDANT of THIS
 * chat's claude.exe is an un-closed background task — the orphan the
 * fleet-reaper otherwise has to reap.
 *
 * Detection: resolve this chat's claude.exe = nearest claude.exe ancestor of
 * this hook process; flag bash.exe whose ancestry includes it and whose age
 * >= AGE_FLOOR. Detached children (unref()) re-parent away and are excluded.
 * node.exe is excluded (MCP/hooks) — bash.exe is the precise bg signal.
 *
 * Default mode=block: blocks Stop listing lingering tasks + remediation, up to
 * MAX_BLOCKS times per session, then AUTO-REAPS (deadlock-proof).
 * Knobs: PRISM_CLOSE_BG_TASKS_DISABLE=1 / _MODE=block|advisory|reap / _AGE_SEC
 *        / _MAX_BLOCKS. Implements CLAUDE.md R14 + feedback_close_background_tasks_at_stop.
 * Safe spawnSync(array) — no shell, no user input (same pattern as
 * stop_close_prism_nodes_v2.mjs). Companion net: stop-bash-orphan-cleaner.mjs.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

const WMIC = "C:/Windows/System32/wbem/WMIC.exe";
const TASKKILL = "C:/Windows/System32/taskkill.exe";
const ATTEMPTS_PATH = "H:/prism/state/shared/.close-bg-tasks-attempts.json";
const LOG_PATH = "H:/prism/state/shared/close-bg-tasks.log";
const WMIC_TIMEOUT_MS = 6000;
const KILL_TIMEOUT_MS = 3000;
const MAX_ANCESTRY_HOPS = 24;

const DISABLED = process.env.PRISM_CLOSE_BG_TASKS_DISABLE === "1";
const MODE = (process.env.PRISM_CLOSE_BG_TASKS_MODE || "block").toLowerCase();
// AGE_FLOOR raised 10 -> 45 (2026-06-13, slot charlie): the detector is a process SNAPSHOT,
// not the harness's tracked-task registry, so transient bash.exe (pipeline subshells, command
// substitution, RTK wrappers, and the detached Stop-hook helpers that fire on EVERY Stop) read
// identically to a real run_in_background task. Those transients live seconds; a genuine un-closed
// bg task the user must close lives minutes. 253 prior false-blocks (counts up to 370) all caught
// sub-45s transient bursts. Knob unchanged.
const AGE_FLOOR_SEC = Number(process.env.PRISM_CLOSE_BG_TASKS_AGE_SEC || 45);
const MAX_BLOCKS = Number(process.env.PRISM_CLOSE_BG_TASKS_MAX_BLOCKS || 2);
// Stability re-check window: re-snapshot after this delay and keep only bash still alive, so a
// transient burst (which vanishes in ~1-2s) cannot trip a block. 0 disables the re-check.
const STABILITY_RECHECK_MS = Number(process.env.PRISM_CLOSE_BG_TASKS_STABILITY_MS || 1500);

// ----- pure core (unit-tested) -----

export function selectUnclosedBgTasks(procList, chatPid, { ageFloorSec = 10, now = 0 } = {}) {
  if (!chatPid || !Array.isArray(procList) || procList.length === 0) return [];
  const byPid = new Map(procList.map((p) => [p.pid, p]));
  const isDescendant = (startPpid) => {
    let pid = startPpid;
    let hops = 0;
    while (pid && hops < MAX_ANCESTRY_HOPS) {
      if (pid === chatPid) return true;
      const parent = byPid.get(pid);
      if (!parent) return false;
      pid = parent.ppid;
      hops++;
    }
    return false;
  };
  const out = [];
  for (const p of procList) {
    if (!/^bash\.exe$/i.test(p.name || "")) continue;
    if (!Number.isFinite(p.createdMs)) continue; const ageSec = Math.max(0, (now - p.createdMs) / 1000);
    if (ageSec < ageFloorSec) continue;
    if (!isDescendant(p.ppid)) continue;
    out.push({ pid: p.pid, ppid: p.ppid, cmd: (p.cmd || "").slice(0, 160), ageSec: Math.round(ageSec) });
  }
  return out;
}

export function resolveChatPid(procList, hookPid) {
  if (!hookPid || !Array.isArray(procList)) return null;
  const byPid = new Map(procList.map((p) => [p.pid, p]));
  let pid = hookPid;
  let hops = 0;
  while (pid && hops < MAX_ANCESTRY_HOPS) {
    const p = byPid.get(pid);
    if (!p) break;
    if (/^claude\.exe$/i.test(p.name || "")) return p.pid;
    pid = p.ppid;
    hops++;
  }
  return null;
}

export function decideEnforcement(lingeringCount, priorAttempts, { maxBlocks = 2, mode = "block" } = {}) {
  if (lingeringCount === 0) return { action: "pass", nextAttempts: 0 };
  if (mode === "advisory") return { action: "advise", nextAttempts: priorAttempts };
  if (mode === "reap") return { action: "reap", nextAttempts: 0 };
  if (priorAttempts >= maxBlocks) return { action: "reap", nextAttempts: 0 };
  return { action: "block", nextAttempts: priorAttempts + 1 };
}

/**
 * intersectAlive -- keep only candidates whose pid is still present in a later snapshot. Pure.
 * A genuine un-closed bg task survives the stability window; a transient subshell/hook burst does
 * not, so a second snapshot drops it. Accepts a Set or an array of pids.
 */
export function intersectAlive(lingering, alivePids) {
  if (!Array.isArray(lingering)) return [];
  const alive = alivePids instanceof Set ? alivePids : new Set(Array.isArray(alivePids) ? alivePids : []);
  return lingering.filter((t) => alive.has(t.pid));
}

/**
 * selectStableBgTasks -- the main() detection path, extracted with INJECTED enumerate/sleep so the
 * stability-gate WIRING is deterministically testable (not just the pure intersectAlive helper).
 * First pass selects old descendant bash; only if any are found AND stabilityMs>0 does it sleep then
 * re-snapshot, keeping just the survivors. enumerate()/sleep() are injected (real WMIC + sleepSync in
 * production; fakes in tests). Fail-open: a 2nd enumerate returning [] drops all candidates (a real
 * orphan persists and is re-caught on the next Stop; the fleet-reaper also backstops).
 */
export function selectStableBgTasks({ procs, chatPid, ageFloorSec, now, stabilityMs, enumerate, sleep } = {}) {
  let lingering = selectUnclosedBgTasks(procs, chatPid, { ageFloorSec, now });
  if (lingering.length > 0 && Number(stabilityMs) > 0) {
    if (typeof sleep === "function") sleep(stabilityMs);
    const procs2 = typeof enumerate === "function" ? enumerate() : [];
    const alivePids = new Set((Array.isArray(procs2) ? procs2 : []).map((p) => p.pid));
    lingering = intersectAlive(lingering, alivePids);
  }
  return lingering;
}

export function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.replace(/^"|"$/g, ""));
}

export function parseWmicDate(s) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(String(s || ""));
  if (!m) return undefined;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
}

// ----- impure readers / actions -----

function log(record) {
  try {
    if (!existsSync(dirname(LOG_PATH))) mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, JSON.stringify({ ts: new Date().toISOString(), ...record }) + "\n");
  } catch { /* never fatal */ }
}

export function enumerateProcesses() {
  if (!existsSync(WMIC)) return [];
  const r = spawnSync(WMIC, ["process", "get", "ProcessId,ParentProcessId,Name,CreationDate", "/format:csv"], { windowsHide: true, encoding: "utf-8", timeout: WMIC_TIMEOUT_MS });
  if (r.status !== 0 || !r.stdout) return [];
  const lines = r.stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const startIdx = lines.findIndex((l) => /(^|,)ProcessId(,|$)/.test(l));
  if (startIdx < 0) return [];
  const header = lines[startIdx].split(",").map((s) => s.trim());
  const idx = (k) => header.indexOf(k);
  const iPid = idx("ProcessId"), iPpid = idx("ParentProcessId"), iName = idx("Name"), iDate = idx("CreationDate");
  const out = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i]);
    if (f.length < header.length) continue;
    const pid = Number(f[iPid]);
    const ppid = Number(f[iPpid]);
    if (!Number.isFinite(pid) || !Number.isFinite(ppid)) continue;
    out.push({ pid, ppid, name: f[iName], createdMs: parseWmicDate(f[iDate]), cmd: "" });
  }
  return out;
}

// Synchronous sleep (this Stop hook is sync / spawnSync-based). Atomics.wait blocks without a
// busy spin; the loop is only a fallback when SharedArrayBuffer is unavailable.
function sleepSync(ms) {
  const n = Math.max(0, Number(ms) || 0);
  if (n === 0) return;
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n); }
  catch { const end = Date.now() + n; while (Date.now() < end) { /* fallback */ } }
}

function killProcess(pid) {
  if (existsSync(TASKKILL)) {
    const r = spawnSync(TASKKILL, ["/PID", String(pid), "/T", "/F"], { windowsHide: true, encoding: "utf-8", timeout: KILL_TIMEOUT_MS });
    return r.status === 0;
  }
  try { process.kill(pid, "SIGKILL"); return true; }
  catch { return false; }
}

function readAttempts() {
  try { return JSON.parse(readFileSync(ATTEMPTS_PATH, "utf-8")); }
  catch { return {}; }
}
function writeAttempts(obj) {
  try {
    if (!existsSync(dirname(ATTEMPTS_PATH))) mkdirSync(dirname(ATTEMPTS_PATH), { recursive: true });
    writeFileSync(ATTEMPTS_PATH, JSON.stringify(obj));
  } catch { /* best-effort */ }
}

function readPayload() {
  try {
    if (process.stdin.isTTY) return {};
    const raw = readFileSync(0, "utf-8");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

function main() {
  const payload = readPayload();
  const sessionId = payload?.session_id || payload?.sessionId || "unknown";
  if (payload?.stop_hook_active === true) { emit({ continue: true }); return; }
  if (DISABLED) { emit({ continue: true }); return; }
  const procs = enumerateProcesses();
  const chatPid = resolveChatPid(procs, process.pid);
  if (!chatPid) { emit({ continue: true }); return; }
  // STABILITY GATE (anti-false-positive, 2026-06-13 slot charlie): the first pass is a snapshot, so
  // a transient burst of subshell/hook-spawned bash.exe reads like a real bg task. selectStableBgTasks
  // re-snapshots ONCE (only when the cheap first pass found candidates -> cost bounded to the rare
  // non-empty path) and keeps only the bash still alive -> transient bursts drop, real tasks survive.
  const lingering = selectStableBgTasks({
    procs, chatPid, ageFloorSec: AGE_FLOOR_SEC, now: Date.now(),
    stabilityMs: STABILITY_RECHECK_MS, enumerate: enumerateProcesses, sleep: sleepSync,
  });
  const attempts = readAttempts();
  const prior = Number(attempts[sessionId] || 0);
  const { action, nextAttempts } = decideEnforcement(lingering.length, prior, { maxBlocks: MAX_BLOCKS, mode: MODE });
  if (action === "pass") {
    if (prior !== 0) { attempts[sessionId] = 0; writeAttempts(attempts); }
    emit({ continue: true });
    return;
  }
  const list = lingering.map((t) => "  - pid " + t.pid + " (bash.exe, " + t.ageSec + "s old, parent " + t.ppid + ")").join("\n");
  const stabilityNote = STABILITY_RECHECK_MS > 0
    ? ", AND survived a " + STABILITY_RECHECK_MS + "ms stability re-check (so not a transient subshell/hook burst)"
    : " (single-snapshot; stability re-check disabled via STABILITY_MS=0)";
  attempts[sessionId] = nextAttempts;
  writeAttempts(attempts);
  if (action === "block") {
    log({ event: "block", sessionId, count: lingering.length, attempt: nextAttempts, pids: lingering.map((t) => t.pid) });
    emit({
      continue: false,
      decision: "block",
      reason: "R14 cleanup -- " + lingering.length + " bash.exe process(es) descend from this chat, are >" + AGE_FLOOR_SEC + "s old" + stabilityNote + ":\n" + list + "\nIf any are YOUR run_in_background tasks, close them: TaskList then TaskStop. If not, they are orphaned subshell/hook processes -- they auto-reap after " + MAX_BLOCKS + " blocks and the fleet-reaper also sweeps them.",
      hookSpecificOutput: { hookEventName: "Stop", additionalContext: "stop-close-own-bg-tasks: " + lingering.length + " un-closed bg task(s) (claude.exe " + chatPid + "); block attempt " + nextAttempts + "/" + MAX_BLOCKS + "." },
    });
    return;
  }
  if (action === "reap") {
    let killed = 0;
    for (const t of lingering) { if (killProcess(t.pid)) killed++; }
    log({ event: "auto-reap", sessionId, requested: lingering.length, killed, afterBlocks: prior });
    emit({ continue: true, systemMessage: "Auto-reaped " + killed + "/" + lingering.length + " un-closed background Bash task(s) after " + prior + " block(s). Close them with TaskStop next time (R14)." });
    return;
  }
  log({ event: "advise", sessionId, count: lingering.length, pids: lingering.map((t) => t.pid) });
  emit({ continue: true, systemMessage: "You have " + lingering.length + " un-closed run_in_background Bash task(s):\n" + list + "\nClose them with TaskStop (R14)." });
}

if (import.meta.url === pathToFileURL(process.argv[1] || "x").href) {
  try { main(); }
  catch (e) { log({ event: "fatal", error: e?.message }); emit({ continue: true }); }
}

