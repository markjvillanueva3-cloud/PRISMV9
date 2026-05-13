#!/usr/bin/env node
// tier: T4
/**
 * session-id-pin.mjs — Pins THIS chat's session_id to every PID in the
 * hook process's ancestry chain, so later Bash-spawned stable-session-id
 * invocations can find the shared Claude-Code ancestor.
 *
 * FIRES ON: UserPromptSubmit, SessionStart
 *
 * Performance: single WMIC call returns (PID,PPID) for every process;
 * we then walk the chain in-memory. No per-ancestor shellouts.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const PIN_FILE = "H:/prism/state/shared/handoffs/.active-sessions-by-pid.json";
const STALE_MS = 8 * 60 * 60 * 1000;
const MAX_ANCESTRY_DEPTH = 8;
const WIN_WMIC = "C:/Windows/System32/wbem/WMIC.exe";
// Hard internal deadline — always exit well before the 1500ms hook timeout.
const DEADLINE_MS = 1200;
const startMs = Date.now();
const timeLeft = () => DEADLINE_MS - (Date.now() - startMs);

function safeEmit() {
  try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* stdout closed */ }
}

function atomicWrite(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now().toString(36)}.tmp`;
  try {
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

function loadRegistry() {
  try { return JSON.parse(fs.readFileSync(PIN_FILE, "utf-8")); }
  catch { return { pids: {}, updated: null }; }
}

function gc(reg) {
  const now = Date.now();
  const kept = {};
  for (const [pid, entry] of Object.entries(reg.pids || {})) {
    const last = new Date(entry.last_seen || entry.created_at || 0).getTime();
    if (now - last < STALE_MS) kept[pid] = entry;
  }
  reg.pids = kept;
  return reg;
}

/**
 * Load the full (pid → ppid) map in a single WMIC call on Windows,
 * or a single /proc scan on Linux. Falls back to empty map on any error.
 */
function loadProcessTree() {
  try {
    if (process.platform === "win32") {
      if (!fs.existsSync(WIN_WMIC)) return new Map();
      const budget = Math.max(400, Math.min(timeLeft() - 200, 900));
      const result = spawnSync(
        WIN_WMIC,
        ["process", "get", "processid,parentprocessid", "/format:csv"],
        { encoding: "utf-8", timeout: budget }
      );
      if (result.status !== 0 || !result.stdout) return new Map();
      const map = new Map();
      for (const rawLine of result.stdout.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("Node,")) continue;
        const parts = line.split(",");
        if (parts.length < 3) continue;
        const ppid = Number(parts[parts.length - 2]);
        const pid = Number(parts[parts.length - 1]);
        if (Number.isFinite(pid) && Number.isFinite(ppid) && pid > 0) {
          map.set(pid, ppid);
        }
      }
      return map;
    }
    const map = new Map();
    for (const entry of fs.readdirSync("/proc")) {
      const pid = Number(entry);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      try {
        const status = fs.readFileSync(`/proc/${pid}/status`, "utf-8");
        const ppidMatch = status.match(/^PPid:\s*(\d+)/m);
        if (ppidMatch) map.set(pid, Number(ppidMatch[1]));
      } catch { /* process vanished */ }
    }
    return map;
  } catch {
    return new Map();
  }
}

function collectAncestors(startPid, tree) {
  const chain = [];
  const seen = new Set();
  let pid = Number(startPid);
  let depth = 0;
  while (pid && pid > 1 && depth < MAX_ANCESTRY_DEPTH && !seen.has(pid)) {
    chain.push(pid);
    seen.add(pid);
    const ppid = tree.get(pid);
    if (!ppid || ppid === pid) break;
    pid = ppid;
    depth++;
  }
  return chain;
}

function readStdinJson() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function main() {
  const input = readStdinJson() || {};
  const sessionId = input.session_id || input.sessionId;
  if (!sessionId || timeLeft() <= 0) { safeEmit(); return; }

  const tree = loadProcessTree();
  const ancestors = tree.size > 0
    ? collectAncestors(process.ppid || process.pid, tree)
    : [process.ppid || process.pid];

  const nowIso = new Date().toISOString();
  const reg = gc(loadRegistry());

  for (const pid of ancestors) {
    const key = String(pid);
    const prev = reg.pids[key];
    reg.pids[key] = {
      session_id: sessionId,
      transcript_path: input.transcript_path || prev?.transcript_path || null,
      cwd: input.cwd || prev?.cwd || process.cwd(),
      machine: os.hostname(),
      created_at: prev?.created_at || nowIso,
      last_seen: nowIso,
    };
  }
  reg.updated = nowIso;

  try {
    if (timeLeft() > 50) atomicWrite(PIN_FILE, JSON.stringify(reg, null, 2) + "\n");
  } catch { /* non-fatal — next fire will retry */ }

  safeEmit();
}

try { main(); }
catch { safeEmit(); }
