/**
 * claude-tree-priority.mjs — pure-injected helper for FLEET-REAPER-MS3/U-FR-MS3-A.
 *
 * Walk a process tree rooted at a claude.exe and set its priority class so the
 * "active" chat (the one the user just typed in) gets a brief CPU lift over
 * the idle siblings. Strictly capped at AboveNormal (Above-Normal is the
 * highest safe class — High and Realtime affect scheduler stability and are
 * explicitly forbidden by the spec).
 *
 * Safety invariants:
 *   1. Never set above AboveNormal — `parsePriorityName` rejects High/Realtime.
 *   2. Never set on a non-Claude descendant — `walkClaudeTree` walks ONLY from a
 *      claude.exe anchor downward via parent-child relationships; a process
 *      that is NOT a descendant of the anchor is never touched.
 *   3. TTL hard-capped to [60, 1800] seconds (1 min..30 min) by `clampTtlSec`.
 *   4. Missing self-pid / no claude ancestor → no-op silently (NOT an error).
 *   5. Per-pid setPriority failure is logged via the result array but never throws.
 *
 * The hook layer (.claude/hooks/active-chat-priority-{boost,decay}.mjs) owns
 * stdin parsing, stamp-file I/O, and the chat-id surface. This file is the
 * platform/process portion only — pure-injected, hermetic-testable.
 *
 * Cross-platform: Windows-only. Non-Windows callers should check `isWindows()`
 * before calling `setPriorityForPids` — the helper still works on a mocked
 * exec but real Win32 priority values only mean something on Windows.
 *
 * Knobs (consumed by the hooks, not this helper):
 *   PRISM_FR_BOOST_DISABLE=1     master kill switch
 *   PRISM_FR_BOOST_TTL_SEC=N     boost expiry, clamp 60..1800 (default 300)
 *   PRISM_FR_BOOST_PRIORITY      AboveNormal | Normal (default AboveNormal)
 */

import { spawnSync } from "node:child_process";

const CLAUDE_PROCESS_NAMES = new Set(["claude.exe", "claude"]);

// Windows priority-class names that map cleanly to `wmic process … CALL setpriority`
// (the wmic VALUE field — these are the numeric Win32 PROCESS_*_PRIORITY_CLASS).
//   Idle=64 · BelowNormal=16384 · Normal=32 · AboveNormal=32768 · High=128 · Realtime=256
//
// Spec rule (anti-regression #1): never set above AboveNormal. So the
// caller-facing surface offers ONLY {Normal, BelowNormal, AboveNormal}.
// (High and Realtime are intentionally absent — `parsePriorityName` returns null.)
const WIN_PRIORITY_VALUES = Object.freeze({
  BelowNormal: 16384,
  Normal: 32,
  AboveNormal: 32768,
});

export const DEFAULT_BOOST_TTL_SEC = 300;
export const MIN_BOOST_TTL_SEC = 60;
export const MAX_BOOST_TTL_SEC = 1800;

// Subprocess timeouts (ms). wmic is a single-PID per-call hit (fast); the
// PS enumerate runs once per hook fire so a generous budget is safe.
const WMIC_TIMEOUT_MS = 5000;
const PS_ENUM_TIMEOUT_MS = 10000;
const MAX_ANCESTOR_HOPS = 12;

/** Cross-platform Windows check (test override via `injectedPlatform` arg). */
export function isWindows(platform = process.platform) {
  return platform === "win32";
}

/**
 * Validate and normalize a priority name. Returns the canonical name on
 * success, or `null` on rejection. Caller must check the result.
 *
 * Forbidden values: "High", "Realtime", "Idle", anything else.
 * The spec hard-codes the allowed set to {AboveNormal, Normal}; we also
 * accept "BelowNormal" here because the decay/restore path may want it
 * (restore writes "Normal", but a future de-throttle path could write
 * "BelowNormal" without rewriting this function).
 */
export function parsePriorityName(name) {
  if (typeof name !== "string") return null;
  if (!Object.prototype.hasOwnProperty.call(WIN_PRIORITY_VALUES, name)) return null;
  return name;
}

/** Look up the wmic VALUE for a priority name. Throws on invalid input (caller MUST validate first). */
export function winPriorityValue(name) {
  const v = WIN_PRIORITY_VALUES[name];
  if (v === undefined) throw new Error(`unknown priority: ${name}`);
  return v;
}

/** Clamp a TTL (seconds) to the allowed [MIN..MAX] window. Garbage → DEFAULT. */
export function clampTtlSec(v, def = DEFAULT_BOOST_TTL_SEC) {
  // null/undefined → use default (env-var miss is the canonical caller —
  // an undefined env-var should mean "no override", not "0 clamped to MIN").
  // Number(null) === 0 (a finite number) which would otherwise clamp to MIN.
  if (v === null || v === undefined) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(MIN_BOOST_TTL_SEC, Math.min(MAX_BOOST_TTL_SEC, Math.floor(n)));
}

/**
 * Walk up the parent chain from `startPid` until we hit a claude.exe (the
 * "anchor"). Returns the anchor PID or `null` if no claude.exe is found in
 * the chain within `maxHops`.
 *
 * @param {number} startPid
 * @param {Map<number,{pid:number,name:string,ppid:number}>} procIndex
 * @param {number} [maxHops=12]
 * @returns {number|null}
 */
export function findClaudeAncestor(startPid, procIndex, maxHops = MAX_ANCESTOR_HOPS) {
  if (!Number.isFinite(startPid) || startPid <= 0) return null;
  let cur = startPid;
  const seen = new Set();
  for (let i = 0; i < maxHops; i++) {
    if (seen.has(cur)) return null; // cycle guard
    seen.add(cur);
    const proc = procIndex.get(cur);
    if (!proc) return null;
    if (CLAUDE_PROCESS_NAMES.has((proc.name || "").toLowerCase())) {
      return proc.pid;
    }
    if (!Number.isFinite(proc.ppid) || proc.ppid <= 0) return null;
    cur = proc.ppid;
  }
  return null;
}

/**
 * From a confirmed claude.exe anchor, walk the descendant tree via parent-
 * child relationships in the index. Returns the set of pids that includes
 * the anchor itself + every descendant. Cycle-safe.
 */
export function walkClaudeTree(anchorPid, procIndex) {
  const result = new Set();
  if (!Number.isFinite(anchorPid)) return result;
  const anchor = procIndex.get(anchorPid);
  if (!anchor) return result;
  if (!CLAUDE_PROCESS_NAMES.has((anchor.name || "").toLowerCase())) {
    // Anti-regression #2: anchor MUST be a claude.exe. Reject otherwise.
    return result;
  }
  result.add(anchorPid);

  // Build child index for O(N+E) descendant walk
  const childrenByPpid = new Map();
  for (const p of procIndex.values()) {
    if (!Number.isFinite(p.ppid) || p.ppid <= 0) continue;
    const arr = childrenByPpid.get(p.ppid);
    if (arr) arr.push(p.pid);
    else childrenByPpid.set(p.ppid, [p.pid]);
  }

  const queue = [anchorPid];
  while (queue.length) {
    const cur = queue.shift();
    const kids = childrenByPpid.get(cur) || [];
    for (const k of kids) {
      if (result.has(k)) continue; // cycle / duplicate
      result.add(k);
      queue.push(k);
    }
  }
  return result;
}

/**
 * Set Win32 priority class on each PID via `wmic process where ProcessId=<pid> CALL setpriority <value>`.
 * Returns an array of `{pid, ok, error?}` records — never throws out.
 *
 * Injected `execFile` (default `child_process.spawnSync`) is for hermetic
 * testing. The real production path uses spawnSync to wmic.exe.
 *
 * @param {number[]} pids
 * @param {string} priorityName  one of parsePriorityName-accepted values
 * @param {object} [opts]
 * @param {Function} [opts.execFile]  inject for tests
 * @param {string} [opts.platform]
 * @returns {Array<{pid:number, ok:boolean, error?:string}>}
 */
export function setPriorityForPids(pids, priorityName, {
  execFile = defaultExec,
  platform = process.platform,
} = {}) {
  const out = [];
  const canonical = parsePriorityName(priorityName);
  if (!canonical) {
    for (const pid of pids) out.push({ pid, ok: false, error: `rejected-priority:${priorityName}` });
    return out;
  }
  if (!isWindows(platform)) {
    for (const pid of pids) out.push({ pid, ok: false, error: `unsupported-platform:${platform}` });
    return out;
  }
  const value = winPriorityValue(canonical);
  for (const pid of pids) {
    if (!Number.isFinite(pid) || pid <= 0) {
      out.push({ pid, ok: false, error: "invalid-pid" });
      continue;
    }
    try {
      const r = execFile("wmic", [
        "process", "where", `ProcessId=${pid}`, "CALL", "setpriority", String(value),
      ], { windowsHide: true, timeout: WMIC_TIMEOUT_MS });
      if (r && r.status === 0) {
        out.push({ pid, ok: true });
      } else {
        const err = (r && r.stderr) || `exit:${r && r.status}`;
        out.push({ pid, ok: false, error: String(err).slice(0, 200) });
      }
    } catch (err) {
      out.push({ pid, ok: false, error: `spawn-failed:${err && err.message ? err.message : String(err)}` });
    }
  }
  return out;
}

function defaultExec(cmd, args, opts) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  return r;
}

/**
 * Enumerate live processes via PS5.1 Get-CimInstance, returning a Map<pid, {pid,name,ppid}>.
 * Limited to candidate names (claude.exe, node.exe, etc.) so the wire payload stays small.
 * Fail-soft: returns empty Map on PS failure (caller checks `.size > 0`).
 *
 * @param {object} [opts]
 * @param {Function} [opts.execFile]  inject for tests
 * @param {number} [opts.timeoutMs=10000]
 * @param {string} [opts.platform]
 * @returns {Map<number, {pid:number, name:string, ppid:number}>}
 */
export function enumerateProcessIndex({
  execFile = defaultExec,
  timeoutMs = PS_ENUM_TIMEOUT_MS,
  platform = process.platform,
} = {}) {
  const empty = new Map();
  if (!isWindows(platform)) return empty;
  const ps = [
    "$ErrorActionPreference='Stop';",
    "$p = Get-CimInstance Win32_Process |",
    "  Where-Object { $_.Name -match '^(claude|node|bash|git|sh|pwsh|powershell|cmd|conhost)\\.exe$' } |",
    "  ForEach-Object {",
    "    [pscustomobject]@{",
    "      pid  = [int]$_.ProcessId",
    "      name = $_.Name",
    "      ppid = [int]$_.ParentProcessId",
    "    }",
    "  };",
    "ConvertTo-Json -Depth 2 -Compress -InputObject @($p)",
  ].join(" ");
  try {
    const r = execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], {
      timeout: timeoutMs, windowsHide: true,
    });
    if (!r || r.status !== 0 || !r.stdout) return empty;
    let parsed;
    try { parsed = JSON.parse(r.stdout); } catch { return empty; }
    if (!Array.isArray(parsed)) return empty;
    const out = new Map();
    for (const p of parsed) {
      const pid = Number(p && p.pid);
      const ppid = Number(p && p.ppid);
      const name = typeof p?.name === "string" ? p.name : "";
      if (Number.isFinite(pid) && pid > 0 && name) {
        out.set(pid, { pid, name, ppid: Number.isFinite(ppid) ? ppid : -1 });
      }
    }
    return out;
  } catch { return empty; }
}

/** Test helper. */
export function _winPriorityValuesForTest() {
  return { ...WIN_PRIORITY_VALUES };
}
