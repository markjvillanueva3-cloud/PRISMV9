#!/usr/bin/env node
/**
 * session-id-pin.mjs — Pins THIS chat's session_id to every PID in the
 * hook process's ancestry chain.
 *
 * PROBLEM: When a Bash tool call (spawned from a Claude Code chat) later
 * invokes stable-session-id.mjs, its process.ppid is NOT Claude Code's PID
 * — Windows git-bash forks subshells, so the immediate parent of node is
 * some intermediate shell. The ONLY guaranteed-shared ancestor between
 * "hook node process" and "future bash-spawned node process" is Claude
 * Code itself, several levels up the chain.
 *
 * SOLUTION: This hook walks its OWN ancestry chain (depth ≤ 8) and writes
 * the session_id → pid mapping for EVERY ancestor. Future stable-session-id
 * invocations walk their own ancestry and find the intersection (Claude
 * Code's PID) — deterministic across concurrent chats.
 *
 * Stale entries (>8h) are GC'd on each fire.
 *
 * FIRES ON: UserPromptSubmit, SessionStart
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const PIN_FILE = "H:/prism/state/shared/handoffs/.active-sessions-by-pid.json";
const STALE_MS = 8 * 60 * 60 * 1000;
const MAX_ANCESTRY_DEPTH = 8;

const WIN_WMIC = "C:/Windows/System32/wbem/WMIC.exe";
const WIN_PS = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";

function atomicWrite(fp, data) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const tmp = `${fp}.${process.pid}.${Date.now().toString(36)}.tmp`;
  try {
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, fp);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

function loadRegistry() {
  try { return JSON.parse(fs.readFileSync(PIN_FILE, "utf-8")); }
  catch { return { pids: {}, updated: null }; }
}

function saveRegistry(reg) {
  atomicWrite(PIN_FILE, JSON.stringify(reg, null, 2) + "\n");
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

function getParentPid(pid) {
  try {
    if (process.platform === "win32") {
      if (fs.existsSync(WIN_WMIC)) {
        const r = spawnSync(WIN_WMIC, ["process", "where", `processid=${pid}`, "get", "parentprocessid", "/value"], { encoding: "utf-8", timeout: 1500 });
        if (r.status === 0 && r.stdout) {
          const m = r.stdout.match(/ParentProcessId=(\d+)/);
          if (m) return Number(m[1]);
        }
      }
      if (fs.existsSync(WIN_PS)) {
        const r = spawnSync(WIN_PS, ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" | Select-Object -ExpandProperty ParentProcessId`], { encoding: "utf-8", timeout: 3000 });
        if (r.status === 0 && r.stdout) {
          const n = Number(r.stdout.trim());
          if (Number.isFinite(n) && n > 0) return n;
        }
      }
      return null;
    } else {
      const status = fs.readFileSync(`/proc/${pid}/status`, "utf-8");
      const m = status.match(/^PPid:\s*(\d+)/m);
      return m ? Number(m[1]) : null;
    }
  } catch { return null; }
}

function collectAncestors(startPid, maxDepth = MAX_ANCESTRY_DEPTH) {
  const chain = [];
  let pid = Number(startPid);
  let depth = 0;
  while (pid && pid > 1 && depth < maxDepth) {
    chain.push(pid);
    const ppid = getParentPid(pid);
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
  if (!sessionId) { process.stdout.write(JSON.stringify({ continue: true })); return; }

  const reg = gc(loadRegistry());
  const ancestors = collectAncestors(process.ppid || process.pid);
  const nowIso = new Date().toISOString();

  // Pin the ENTIRE ancestry chain — stable-session-id's process will share
  // at least one of these PIDs (Claude Code itself).
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
  try { saveRegistry(reg); } catch { /* non-fatal */ }

  process.stdout.write(JSON.stringify({ continue: true }));
}

try { main(); }
catch { try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* give up */ } }
