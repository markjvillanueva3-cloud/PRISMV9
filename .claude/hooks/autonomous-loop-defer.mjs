#!/usr/bin/env node
/**
 * autonomous-loop-defer.mjs — PreToolUse rate-limiter ("defer") for runaway loops.
 *
 * U-HKA02 of HOOKS-AUTOMATION-V2-MS0.
 *
 * WHY (Boris doctrine): an autonomous loop with no human checkpoint can run for
 * hours burning tokens — a "$6k incident". `autonomous-loop-watchdog.mjs` already
 * bounds the *idle* worst case (no commits for too long → Stop block). This hook
 * bounds the *active* worst case: too many tool calls in a short window. It is the
 * volume backstop the watchdog is silent on.
 *
 * The Claude Code harness in use (2.1.x) does NOT honour a `{decision:"defer"}`
 * PreToolUse output, so "defer" is realised as the supported escalation ladder:
 *   below WARN  → silent passthrough
 *   ≥ WARN      → `additionalContext` nudge ("checkpoint / commit / ask the user")
 *   ≥ ASK       → `permissionDecision:"ask"`  (the harness asks the human y/n —
 *                 i.e. the loop genuinely waits for a human, the "defer" intent)
 *   ≥ DENY      → `permissionDecision:"deny"` (hard stop on a clearly-runaway loop;
 *                 the reason tells the operator exactly how to resume)
 *
 * Thresholds default conservatively and tighten under PRISM_AUTONOMOUS=1 (the same
 * flag yolo/autopilot already sets). Everything is env-tunable; the whole hook is
 * disabled with PRISM_LOOP_DEFER=0.
 *
 * State: one append-only line-per-call log of epoch-ms timestamps at
 *   <cache>/tool-rate-<session>.log  (atomic O_APPEND writes — safe under the
 *   20-way tool concurrency this harness allows). Pruned to the window on read.
 *
 * Telemetry: <cache>/hook-telemetry.jsonl gets {hook:"autonomous-loop-defer", ...}.
 *
 * @hook PreToolUse:* (register in settings.json under the ".*" matcher group)
 *
 * Env:
 *   PRISM_LOOP_DEFER=0            → disable entirely (passthrough)
 *   PRISM_AUTONOMOUS=1           → "autonomous" profile (tighter thresholds)
 *   PRISM_LOOP_DEFER_WINDOW_MS   → sliding window (default 300000 = 5 min)
 *   PRISM_LOOP_DEFER_WARN        → calls/window before the nudge   (auto:50  interactive:250)
 *   PRISM_LOOP_DEFER_ASK         → calls/window before "ask"       (auto:150 interactive:0=off)
 *   PRISM_LOOP_DEFER_MAX         → calls/window before hard "deny" (auto:400 interactive:1500)
 *   PRISM_LOOP_DEFER_CACHE_DIR   → override cache dir (default <root>/.claude/cache)
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ── pure helpers (exported for tests) ──────────────────────────────────────────

const DEFAULT_WINDOW_MS = 300_000; // 5 minutes

/** Resolve the active thresholds from env. `autonomous` tightens the defaults. */
export function resolveThresholds(env = process.env) {
  const autonomous = String(env.PRISM_AUTONOMOUS ?? "") === "1";
  const num = (v, d) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : d;
  };
  const windowMs = num(env.PRISM_LOOP_DEFER_WINDOW_MS, DEFAULT_WINDOW_MS) || DEFAULT_WINDOW_MS;
  // `0` for ASK in the interactive profile means "ask escalation disabled".
  const warn = num(env.PRISM_LOOP_DEFER_WARN, autonomous ? 50 : 250);
  const ask = num(env.PRISM_LOOP_DEFER_ASK, autonomous ? 150 : 0);
  const deny = num(env.PRISM_LOOP_DEFER_MAX, autonomous ? 400 : 1500);
  return { autonomous, windowMs, warn, ask, deny };
}

/** True when the hook is switched off via env. */
export function isDisabled(env = process.env) {
  return String(env.PRISM_LOOP_DEFER ?? "") === "0";
}

/**
 * Pure decision from a count of in-window tool calls.
 * @param {number} count   tool calls in the current window (INCLUDING the one about to fire)
 * @param {{warn:number,ask:number,deny:number,windowMs:number,autonomous:boolean}} t thresholds
 * @returns {{decision:"allow"|"warn"|"ask"|"deny", count:number, threshold:number, message:string}}
 */
export function decideToolRate(count, t) {
  const windowMin = Math.round((t.windowMs / 60000) * 10) / 10;
  const profile = t.autonomous ? "autonomous" : "interactive";
  if (t.deny > 0 && count >= t.deny) {
    return {
      decision: "deny",
      count,
      threshold: t.deny,
      message:
        `🛑 autonomous-loop-defer: ${count} tool calls in the last ${windowMin}min ` +
        `(≥ hard ceiling ${t.deny}, profile=${profile}). This looks like a runaway loop. ` +
        `Stopping to prevent a token-burn incident. To resume: commit/checkpoint your work, ` +
        `then either wait for the window to drain, raise PRISM_LOOP_DEFER_MAX, ` +
        `unset PRISM_AUTONOMOUS, or set PRISM_LOOP_DEFER=0.`,
    };
  }
  if (t.ask > 0 && count >= t.ask) {
    return {
      decision: "ask",
      count,
      threshold: t.ask,
      message:
        `⏸️ autonomous-loop-defer: ${count} tool calls in the last ${windowMin}min ` +
        `(≥ ${t.ask}, profile=${profile}). Per the autonomous-loop doctrine this is a ` +
        `checkpoint: confirm you want to keep going. (Raise PRISM_LOOP_DEFER_ASK or set ` +
        `PRISM_LOOP_DEFER=0 to silence.)`,
    };
  }
  if (t.warn > 0 && count >= t.warn) {
    return {
      decision: "warn",
      count,
      threshold: t.warn,
      message:
        `autonomous-loop-defer: ${count} tool calls in the last ${windowMin}min ` +
        `(≥ ${t.warn}). If this is a loop, consider committing/checkpointing now or ` +
        `asking the user whether to continue — runaway loops are the classic $-incident.`,
    };
  }
  return { decision: "allow", count, threshold: t.warn || t.deny, message: "" };
}

// ── IO helpers ────────────────────────────────────────────────────────────────

function findRoot(start = process.cwd()) {
  let cur = start;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return start;
}

export function cacheDir(env = process.env) {
  if (env.PRISM_LOOP_DEFER_CACHE_DIR) return env.PRISM_LOOP_DEFER_CACHE_DIR;
  return path.join(findRoot(), ".claude", "cache");
}

export function safeSid(sid) {
  if (typeof sid !== "string" || !sid) return "global";
  return sid.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64) || "global";
}

export function ratePath(sid, env = process.env) {
  return path.join(cacheDir(env), `tool-rate-${safeSid(sid)}.log`);
}

/** Read recent epoch-ms timestamps from the log (bounded tail), keeping only the
 *  ones within `windowMs` of `now`. Also returns whether a rewrite/prune is due. */
export function readWindow(file, now, windowMs, maxLines = 4096) {
  let lines = [];
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      lines = raw.split("\n");
      if (lines.length > maxLines) lines = lines.slice(-maxLines);
    }
  } catch {
    lines = [];
  }
  const cutoff = now - windowMs;
  const kept = [];
  for (const ln of lines) {
    const ts = Number(ln.trim());
    if (Number.isFinite(ts) && ts >= cutoff && ts <= now + 60_000 /* tolerate small clock skew */) {
      kept.push(ts);
    }
  }
  // prune when the on-disk file is much larger than the live window
  const pruneDue = lines.filter((l) => l.trim()).length > kept.length * 2 + 64;
  return { kept, pruneDue };
}

function appendTs(file, ts) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, String(ts) + "\n"); // O_APPEND ⇒ atomic for small writes
  } catch {
    /* best-effort */
  }
}

function rewritePruned(file, kept) {
  try {
    const tmp = file + "." + process.pid + ".tmp";
    fs.writeFileSync(tmp, kept.map(String).join("\n") + (kept.length ? "\n" : ""));
    fs.renameSync(tmp, file);
  } catch {
    /* best-effort */
  }
}

function telemetry(env, rec) {
  try {
    const f = path.join(cacheDir(env), "hook-telemetry.jsonl");
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, JSON.stringify({ hook: "autonomous-loop-defer", t: new Date().toISOString(), ...rec }) + "\n");
  } catch {
    /* ignore */
  }
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf8");
    if (!raw || !raw.trim().startsWith("{")) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

// ── main ──────────────────────────────────────────────────────────────────────

export function runDecision({ stdin, env = process.env, now = Date.now() }) {
  if (isDisabled(env)) return { decision: "allow", count: 0, threshold: 0, message: "", disabled: true };
  const sid = stdin?.session_id;
  const t = resolveThresholds(env);
  const file = ratePath(sid, env);
  const { kept, pruneDue } = readWindow(file, now, t.windowMs);
  appendTs(file, now);
  if (pruneDue) rewritePruned(file, [...kept, now]);
  const count = kept.length + 1; // include the call about to fire
  const out = decideToolRate(count, t);
  return { ...out, profile: t.autonomous ? "autonomous" : "interactive", windowMs: t.windowMs, file };
}

function main() {
  const stdin = readStdin();
  const env = process.env;
  let res;
  try {
    res = runDecision({ stdin, env });
  } catch {
    return emit({ continue: true });
  }
  if (res.disabled || res.decision === "allow") {
    return emit({ continue: true });
  }

  telemetry(env, {
    event: res.decision,
    count: res.count,
    threshold: res.threshold,
    profile: res.profile,
    tool: stdin?.tool_name ?? null,
    session: stdin?.session_id ?? null,
  });

  if (res.decision === "warn") {
    return emit({
      continue: true,
      hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: res.message },
    });
  }
  if (res.decision === "ask") {
    return emit({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: res.message,
        additionalContext: res.message,
      },
    });
  }
  // deny
  return emit({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: res.message,
      additionalContext: res.message,
    },
  });
}

// Run only when invoked directly (import-safe for tests).
const invokedDirectly = (() => {
  try {
    return path.resolve(process.argv[1] || "").endsWith("autonomous-loop-defer.mjs");
  } catch {
    return false;
  }
})();
if (invokedDirectly) main();
