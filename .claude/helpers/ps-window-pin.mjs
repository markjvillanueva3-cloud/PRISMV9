#!/usr/bin/env node
/**
 * ps-window-pin.mjs — Permanent PowerShell-window → slot binding.
 *
 * Solves the terminal-pin tier-drift class: when a PowerShell window opens
 * multiple chats over its lifetime (via /compact, /clear, fresh `claude`
 * invocations, or crash-respawn), the `terminal-window-id.mjs` resolver can
 * return DIFFERENT tier ids for chats in the SAME physical window (tier-1
 * `tw-wt` requires WT_SESSION which is empty on standalone PowerShell;
 * tier-3-fallback `tw-pp` uses bare ppid which is per-chat-ephemeral).
 *
 * This helper anchors the slot to the ONE thing that IS stable across the
 * window's entire lifetime: the PowerShell process PID itself. While the
 * window is open, the PS process lives; when the PS process exits, the
 * window is gone and the pin is meaningless anyway.
 *
 * Flow:
 *   1. /checkin-<slot> claims the slot via chat-slots.mjs.
 *   2. chat-slots.mjs (or the SessionStart hook) calls tryWritePinForCurrentWindow.
 *   3. This helper walks ancestry, finds the PowerShell ancestor PID, writes
 *      `state/shared/ps-window-pins.json` keyed on that PID.
 *   4. On subsequent SessionStart in the same window (new chatId, new
 *      session_id, but SAME PS PID ancestor), session-start-terminal-pin.mjs
 *      calls readPinForCurrentWindow → finds the pin → claims that slot.
 *
 * Cleanup: pruneStalePins() removes (a) entries whose PS PID is no longer
 * alive (window closed) and (b) entries older than 7 days. Called
 * opportunistically on every read.
 *
 * Knobs:
 *   PRISM_PS_PINS_FILE              — override pins file path (tests)
 *   PRISM_PS_PIN_TIMEOUT_MS         — ancestor-walk + isPidAlive budget (ms, default 2000)
 *   PRISM_PS_PIN_DISABLE            — return null from all reads/writes
 *
 * Non-Windows: all functions return safe defaults (null / false / 0). Tests
 * inject mocks via the `_spawn` / `_fs` / `isAlive` parameters.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PINS_FILE = process.env.PRISM_PS_PINS_FILE
  || "H:/prism/state/shared/ps-window-pins.json";
const MAX_PINS = 50;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_HOPS = 8;
const TIMEOUT_MS = Number(process.env.PRISM_PS_PIN_TIMEOUT_MS || 2000);
const SCHEMA_VERSION = 1;

// Absolute powershell path preferred -- portable-node's PATH sometimes lacks
// System32 (the exact bug class stable-session-id.mjs already fixed with
// WIN_PS). Falls back to bare "powershell" when the canonical path is absent
// (non-standard Windows layout). Resolved once at module load.
const WIN_PS_ABS = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
const PS_BIN = (() => {
  try { return fs.existsSync(WIN_PS_ABS) ? WIN_PS_ABS : "powershell"; }
  catch { return "powershell"; }
})();
const ARGV_CMD = 2;
const ARGV_ARG1 = 3;
const ARGV_ARG2 = 4;

// In-process cache for findPsAncestorPid, keyed on sessionId. A single chat's
// repeated calls all see the same answer even if PowerShell flakes between calls.
const _ancestorCache = new Map();

function isDisabled() {
  return process.env.PRISM_PS_PIN_DISABLE === "1";
}

/**
 * Walk ancestors from startPid upward via PowerShell Get-CimInstance.
 * Returns the PID (as string) of the first powershell.exe / pwsh.exe / cmd.exe
 * ancestor, or null if no PS ancestor found within MAX_HOPS.
 *
 * Cache: keyed on sessionId. Falsy sessionId disables caching.
 */
export function findPsAncestorPid(opts = {}) {
  if (isDisabled()) return null;
  if (process.platform !== "win32") return null;
  const {
    sessionId = null,
    startPid = process.pid,
    maxHops = MAX_HOPS,
    timeoutMs = TIMEOUT_MS,
    _spawn = spawnSync,
  } = opts;

  if (sessionId && _ancestorCache.has(sessionId)) {
    return _ancestorCache.get(sessionId);
  }

  // ROOT-CAUSE FIX (2026-06-18, slot:alpha): the start pid + max hops are
  // INTERPOLATED into the script text, NOT passed as trailing positional args.
  // `powershell -Command "<script>" <a> <b>` does NOT bind <a>/<b> to $args --
  // PowerShell appends them to the command text, producing a ParserError
  // ("Unexpected token") -> non-zero exit -> this function returned null for
  // EVERY input on EVERY host. So ps-window-pins.json was never written and the
  // entire terminal-pin / auto-resume subsystem silently ran on the fleet-global
  // family-latest handoff fallback (the wrong-chat-resume hazard). Confirmed
  // live: pre-fix findPsAncestorPid({startPid:<a real powershell.exe pid>}) ===
  // null; post-fix === that same pid. (-File binds $args but needs a temp .ps1;
  // interpolating two validated integers is simpler and equivalent.)
  //
  // Validate BOTH inputs are positive integers before interpolation: they are
  // internal (process.pid / MAX_HOPS) but a non-integer would be both a script
  // syntax error AND a (theoretical) injection vector -- fail closed.
  const sp = Number(startPid);
  const mh = Number(maxHops);
  if (!Number.isInteger(sp) || sp <= 0 || !Number.isInteger(mh) || mh <= 0) {
    if (sessionId) _ancestorCache.set(sessionId, null);
    return null;
  }

  // PS script: walk parents until we hit a shell process. Output the PID or empty.
  const psScript = [
    `$current = ${sp}`,
    `$maxHops = ${mh}`,
    `$hops = 0`,
    `$shells = @('powershell.exe','pwsh.exe','cmd.exe')`,
    `while ($hops -lt $maxHops) {`,
    `  try {`,
    `    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$current" -ErrorAction Stop`,
    `    if (-not $p) { break }`,
    `    if ($shells -contains $p.Name.ToLower()) {`,
    `      Write-Output $current`,
    `      exit 0`,
    `    }`,
    `    $current = [int]$p.ParentProcessId`,
    `    if ($current -le 0) { break }`,
    `    $hops++`,
    `  } catch { break }`,
    `}`,
    `Write-Output ''`,
  ].join(";");

  let result = null;
  try {
    const r = _spawn(
      PS_BIN,
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
       "-Command", psScript],
      { timeout: timeoutMs, encoding: "utf-8", windowsHide: true }
    );
    if (r && r.status === 0) {
      const out = (r.stdout || "").trim();
      if (/^\d+$/.test(out)) result = out;
    }
  } catch {
    result = null;
  }

  if (sessionId) _ancestorCache.set(sessionId, result);
  return result;
}

/**
 * Read pins file. Returns a valid state object even on file-missing / parse-error
 * (fail-soft — a corrupt pins file must NEVER stall the SessionStart pipeline).
 */
export function readPinsFile(_fs = fs) {
  const empty = { schemaVersion: SCHEMA_VERSION, lastUpdated: null, pins: {} };
  try {
    if (!_fs.existsSync(PINS_FILE)) return empty;
    const raw = _fs.readFileSync(PINS_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || !data.pins || typeof data.pins !== "object") {
      return empty;
    }
    return data;
  } catch {
    return empty;
  }
}

/**
 * Atomic write via tmp+rename. Returns true on success, false on any IO error.
 */
export function writePinsFile(state, _fs = fs) {
  try {
    _fs.mkdirSync(path.dirname(PINS_FILE), { recursive: true });
    const out = {
      schemaVersion: SCHEMA_VERSION,
      lastUpdated: new Date().toISOString(),
      pins: state.pins || {},
    };
    const tmp = `${PINS_FILE}.tmp.${process.pid}.${Date.now()}`;
    _fs.writeFileSync(tmp, JSON.stringify(out, null, 2));
    _fs.renameSync(tmp, PINS_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns true if the given PID is alive on the host.
 * Non-Windows / spawn failure → false (fail-safe: pin gets pruned, no harm).
 */
export function isPidAlive(pid, _spawn = spawnSync) {
  if (process.platform !== "win32") return false;
  const pidStr = String(pid);
  if (!/^\d+$/.test(pidStr)) return false;
  try {
    const r = _spawn(
      PS_BIN,
      ["-NoProfile", "-NonInteractive", "-Command",
       `try { Get-Process -Id ${pidStr} -ErrorAction Stop | Out-Null; 'alive' } catch { 'dead' }`],
      { timeout: TIMEOUT_MS, encoding: "utf-8", windowsHide: true }
    );
    return (r && (r.stdout || "").trim()) === "alive";
  } catch {
    return false;
  }
}

/**
 * Remove pins whose PS PID is dead or whose writtenAt is older than maxAgeMs.
 * Also caps total pins at MAX_PINS, dropping oldest. Returns count pruned.
 *
 * Tests inject `isAlive` to avoid spawning PowerShell.
 */
export function pruneStalePins(opts = {}) {
  const {
    now = Date.now(),
    maxAgeMs = MAX_AGE_MS,
    maxPins = MAX_PINS,
    isAlive = isPidAlive,
    _fs = fs,
  } = opts;
  const state = readPinsFile(_fs);
  const pins = state.pins || {};
  const before = Object.keys(pins).length;

  for (const [pid, pin] of Object.entries(pins)) {
    let stale = false;
    const writtenAt = pin && pin.writtenAt ? Date.parse(pin.writtenAt) : NaN;
    if (Number.isFinite(writtenAt)) {
      const age = now - writtenAt;
      if (age > maxAgeMs) stale = true;
    } else {
      stale = true;
    }
    if (!stale && !isAlive(pid)) stale = true;
    if (stale) delete pins[pid];
  }

  // Cap at maxPins — drop oldest by writtenAt
  const entries = Object.entries(pins);
  if (entries.length > maxPins) {
    entries.sort((a, b) => {
      const at = Date.parse(a[1].writtenAt || "") || 0;
      const bt = Date.parse(b[1].writtenAt || "") || 0;
      return at - bt;
    });
    const drop = entries.slice(0, entries.length - maxPins);
    for (const [pid] of drop) delete pins[pid];
  }

  const after = Object.keys(pins).length;
  if (before !== after) {
    state.pins = pins;
    writePinsFile(state, _fs);
  }
  return before - after;
}

/**
 * Read the pin for the given PS PID. Returns null if no pin or pin too old.
 * Pin shape: { slot, chatId, writtenAt }.
 */
export function readPinForPid(psPid, opts = {}) {
  if (isDisabled()) return null;
  if (!psPid) return null;
  const { now = Date.now(), maxAgeMs = MAX_AGE_MS, _fs = fs } = opts;
  const state = readPinsFile(_fs);
  const pin = state.pins[String(psPid)];
  if (!pin || !pin.slot || !pin.chatId) return null;
  const writtenAt = pin.writtenAt ? Date.parse(pin.writtenAt) : NaN;
  if (Number.isFinite(writtenAt) && (now - writtenAt) > maxAgeMs) return null;
  return { slot: pin.slot, chatId: pin.chatId, writtenAt: pin.writtenAt };
}

/**
 * Write a pin for the given PS PID. Returns true on success.
 */
export function writePinForPid(psPid, slot, chatId, opts = {}) {
  if (isDisabled()) return false;
  if (!psPid || !slot || !chatId) return false;
  const { _fs = fs } = opts;
  const state = readPinsFile(_fs);
  state.pins[String(psPid)] = {
    slot,
    chatId,
    writtenAt: new Date().toISOString(),
  };
  return writePinsFile(state, _fs);
}

/**
 * Convenience: find current window's PS PID + read its pin.
 * Returns { psPid, slot, chatId, writtenAt } or { psPid: <pid>, slot: null, ... }
 * if PS PID resolves but no pin exists. Returns null only when no PS ancestor
 * could be resolved at all.
 */
export function readPinForCurrentWindow(opts = {}) {
  if (isDisabled()) return null;
  const psPid = findPsAncestorPid(opts);
  if (!psPid) return null;
  const pin = readPinForPid(psPid, opts);
  if (!pin) return { psPid, slot: null, chatId: null, writtenAt: null };
  return { psPid, ...pin };
}

/**
 * Convenience: find current window's PS PID + write the pin.
 * Returns { psPid, written: boolean }.
 */
export function tryWritePinForCurrentWindow(opts = {}) {
  if (isDisabled()) return { psPid: null, written: false };
  const { slot, chatId, sessionId } = opts;
  if (!slot || !chatId) return { psPid: null, written: false };
  const psPid = findPsAncestorPid({ sessionId });
  if (!psPid) return { psPid: null, written: false };
  const written = writePinForPid(psPid, slot, chatId);
  return { psPid, written };
}

// CLI: find-ps [sid] | read-current | write <slot> <chatId> | prune | list
const isCli = (() => {
  try {
    const me = path.resolve(fileURLToPath(import.meta.url));
    const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
    return me === argv1;
  } catch { return false; }
})();

if (isCli) {
  const cmd = process.argv[ARGV_CMD];
  let exitCode = 0;
  if (cmd === "find-ps") {
    const sid = process.argv[ARGV_ARG1] || null;
    console.log(findPsAncestorPid({ sessionId: sid }) || "");
  } else if (cmd === "read-current") {
    console.log(JSON.stringify(readPinForCurrentWindow() || null, null, 2));
  } else if (cmd === "write") {
    const slot = process.argv[ARGV_ARG1];
    const chatId = process.argv[ARGV_ARG2];
    if (!slot || !chatId) {
      console.error("usage: write <slot> <chatId>");
      exitCode = 2;
    } else {
      const r = tryWritePinForCurrentWindow({ slot, chatId });
      console.log(JSON.stringify(r, null, 2));
      exitCode = r.written ? 0 : 1;
    }
  } else if (cmd === "prune") {
    console.log(`pruned: ${pruneStalePins()}`);
  } else if (cmd === "list") {
    console.log(JSON.stringify(readPinsFile(), null, 2));
  } else {
    console.error("usage: ps-window-pin.mjs {find-ps [sid] | read-current | write <slot> <chatId> | prune | list}");
    exitCode = 2;
  }
  process.exit(exitCode);
}
