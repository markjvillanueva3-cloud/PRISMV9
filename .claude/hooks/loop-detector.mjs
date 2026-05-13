#!/usr/bin/env node
// tier: T3
/**
 * loop-detector.mjs — PostToolUse hook (any tool).
 *
 * Detects when Claude is repeating the same tool call in a tight window,
 * which usually means a stuck loop or a missing piece of information that
 * the model is hoping a re-call will produce.
 *
 * Algorithm:
 *   - Per-session ring buffer of last N tool calls keyed by (tool_name +
 *     hash of params), persisted to H:/prism/.claude/cache/loop-<sid>.json.
 *   - On each PostToolUse, append current call's hash to the ring.
 *   - If the same hash appears ≥ THRESHOLD times in the last WINDOW calls,
 *     emit a warning via additionalContext.
 *   - The warning is fired AT MOST ONCE per (sid, hash) until the hash
 *     drops out of the window — prevents spamming once detected.
 *
 * No-op cases:
 *   - No tool_name / tool_input
 *   - Insufficient history (< THRESHOLD)
 *
 * @hook PostToolUse:*
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

const CACHE_DIR = path.resolve("H:/prism/.claude/cache");
const RING_SIZE = 30;
const WINDOW = 10;
const THRESHOLD = 3;

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}
function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

function safeSid(sid) {
  if (typeof sid !== "string" || !sid) return "global";
  return sid.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "global";
}
function ringPath(sid) { return path.join(CACHE_DIR, `loop-${safeSid(sid)}.json`); }

function loadRing(sid) {
  try {
    const p = ringPath(sid);
    if (!fs.existsSync(p)) return { calls: [], warnedHashes: [] };
    const obj = JSON.parse(fs.readFileSync(p, "utf-8"));
    if (!obj || !Array.isArray(obj.calls)) return { calls: [], warnedHashes: [] };
    return { calls: obj.calls, warnedHashes: Array.isArray(obj.warnedHashes) ? obj.warnedHashes : [] };
  } catch { return { calls: [], warnedHashes: [] }; }
}
function saveRing(sid, state) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(ringPath(sid), JSON.stringify({
      calls: state.calls.slice(-RING_SIZE),
      warnedHashes: state.warnedHashes.slice(-RING_SIZE),
    }));
  } catch { /* ignore */ }
}

function callHash(toolName, toolInput) {
  // Stable hash of (tool_name, sorted-keyed JSON of input).
  // Stringify a normalized form so {a:1,b:2} and {b:2,a:1} match.
  const normalize = (v) => {
    if (Array.isArray(v)) return v.map(normalize);
    if (v && typeof v === "object") {
      const o = {};
      for (const k of Object.keys(v).sort()) o[k] = normalize(v[k]);
      return o;
    }
    return v;
  };
  const payload = JSON.stringify({ tool: toolName, input: normalize(toolInput ?? {}) });
  return crypto.createHash("sha1").update(payload).digest("hex").slice(0, 16);
}

function main() {
  const stdin = readStdinSafe();
  const passthrough = () => emit({ continue: true });
  if (!stdin || !stdin.tool_name) return passthrough();

  const sid = stdin.session_id;
  const hash = callHash(stdin.tool_name, stdin.tool_input);
  const state = loadRing(sid);

  state.calls.push(hash);

  const window = state.calls.slice(-WINDOW);
  const occurrences = window.filter((h) => h === hash).length;

  if (occurrences >= THRESHOLD && !state.warnedHashes.includes(hash)) {
    state.warnedHashes.push(hash);
    saveRing(sid, state);
    emit({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `loop-detector: tool ${stdin.tool_name} has been called ${occurrences}× in the last ${WINDOW} calls with identical params. If you're stuck, try a different tool, narrow the params, or ask the user. Hash=${hash}.`,
      },
    });
    return;
  }

  // If hash is no longer in window, allow re-warning later
  if (!window.includes(hash)) {
    state.warnedHashes = state.warnedHashes.filter((h) => h !== hash);
  }
  saveRing(sid, state);
  passthrough();
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
