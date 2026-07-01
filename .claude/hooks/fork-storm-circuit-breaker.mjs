#!/usr/bin/env node
// tier: T0
/**
 * fork-storm-circuit-breaker.mjs -- PreToolUse(Bash|Agent|Task|Workflow) hard back-pressure gate.
 * GOLF-FLEET-HYGIENE / U-FORKSTORM-BREAKER (slot:golf 2026-06-13).
 *
 * ROOT CAUSE (observed LIVE, session 02a2de10): the per-prompt / per-Stop / per-tool-call hook stack
 * (65 UserPromptSubmit + 76 Stop + 96 PreToolUse/PostToolUse, x up to 13 live chats) detonated a
 * cascading bash.exe fork-storm -- 927 bash.exe under one claude.exe in a single snapshot -- which
 * STARVED the shared MCP server on :3100 ("singleton daemon wedged / SERVER DISCONNECTED timeout")
 * == the operator-reported "api server error". The sibling agent-fanout-pressure-gate catches
 * Agent/Workflow BURSTS (per-session ring), but NOT the system-wide bash explosion driven by the
 * hook-per-tool-call cascade across the whole fleet. THIS is that missing arm: a SYSTEM-WIDE
 * process-count circuit breaker.
 *
 * MECHANISM: before a process-spawning tool runs (Bash / Agent / Task / Workflow), read the LIVE
 * system bash.exe count (TTL-cached -- a burst of gated calls pays the enumeration once, not per
 * call). At/above the ceiling -> BLOCK the spawn. The storm drains within seconds once new spawns
 * stop, and :3100 recovers. Lighter tools (Read/Edit/Grep) are NEVER gated so the session keeps
 * functioning while the storm drains.
 *
 * HARD-ENFORCE by default (operator directive 2026-06-13: "hard enforce whatever mechanism we need
 * to prevent the issue"). Override paths: PRISM_FORKSTORM_BREAKER_DISABLE=1 (off), append [SCOPED]
 * or --force-spawn to the tool input (one-shot), PRISM_FORKSTORM_CEILING=N to retune.
 *
 * FAIL-OPEN on every error path: unreadable payload, tasklist failure, unknown count -> ALLOW. A
 * hygiene guard must NEVER be the thing that stalls a legit tool call (the cure can't become the
 * disease). Top-level catch -> {"continue":true}.
 *
 * Knobs: PRISM_FORKSTORM_BREAKER_DISABLE=1 · PRISM_FORKSTORM_CEILING(default 400) ·
 *   PRISM_FORKSTORM_TTL_MS(default 2500) · PRISM_FORKSTORM_WORKFLOW_FACTOR(default 0.7 -- a Workflow
 *   fans out hard, so it trips at 0.7x the ceiling) · PRISM_FORKSTORM_FORCE=1 (one-shot bypass).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const GATED = new Set(["Bash", "Agent", "Task", "Workflow"]);
const DEFAULT_CEILING = 400;       // normal busy fleet < ~120 bash.exe; the storm peaked at 927. 400 = clearly-storming.
const DEFAULT_TTL_MS = 2500;       // count cache lifetime: a burst pays the tasklist enumeration once, not per call.
const DEFAULT_WF_FACTOR = 0.7;     // a Workflow fans out hard, so it trips at 0.7x the ceiling.
const TASKLIST_TIMEOUT_MS = 4000;  // hard cap on the process-enumeration subprocess; on timeout -> fail-open.

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SIDE_DIR = join(PRISM_ROOT, "state/shared/forkstorm-breaker");
const CACHE = join(SIDE_DIR, "bash-count.json");

// Pure, testable decision. Fail-open on any unknown/odd input.
export function decideBreaker({ tool, bashCount, ceiling, disabled, scoped, wfFactor = DEFAULT_WF_FACTOR }) {
  if (disabled) return { action: "allow", reason: "breaker-disabled" };
  if (!GATED.has(tool)) return { action: "allow", reason: "tool-not-gated" };
  if (scoped) return { action: "allow", reason: "scoped-override" };
  if (typeof bashCount !== "number" || !Number.isFinite(bashCount) || bashCount < 0) {
    return { action: "allow", reason: "count-unknown(fail-open)" };
  }
  const c = Number.isFinite(ceiling) && ceiling > 0 ? ceiling : DEFAULT_CEILING;
  const trip = tool === "Workflow" ? Math.max(1, Math.floor(c * wfFactor)) : c;
  if (bashCount >= trip) {
    return { action: "block", trip,
      reason: `fork-storm guard: ${bashCount} live bash.exe >= ceiling ${trip}${tool === "Workflow" ? " (Workflow trips early -- it fans out)" : ""}` };
  }
  return { action: "allow", reason: "under-ceiling", trip };
}

// Live system bash.exe count. Returns -1 (=> fail-open) if it cannot be determined.
//
// SUSTAINED-SAMPLING (audit 2026-06-14, slot:sierra): the original served a single tasklist
// snapshot, TTL-cached 2500ms. bash.exe churns in sub-second bursts (measured live: 8..586 within
// 400ms), so a snapshot caught at a spike instant over-read, and the 2.5s cache latched that spike
// into a fleet-wide Bash/Agent/Workflow block for the whole TTL -- false-blocking legit work while
// the sustained count was single/double digits. Fix: (a) NEVER serve or write a cache entry that is
// AT/OVER the trip threshold -- a high count is always re-verified live, so a drained spike cannot
// latch; (b) only when a read is at/over the threshold, take extra back-to-back samples (~100ms
// apart naturally) and keep the MIN -- a transient spike collapses to a low min (allow), a sustained
// storm stays high (block). Extra cost is paid ONLY on a high read (rare); the common low path is
// unchanged (one enumeration, cached). `enumerate`/`skipCache` are injection seams for tests.
export function liveBashCount({ ttlMs = DEFAULT_TTL_MS, now = Date.now(), tripThreshold = DEFAULT_CEILING, samples = 3, enumerate, skipCache = false } = {}) {
  if (!skipCache) {
    try {
      if (existsSync(CACHE)) {
        const c = JSON.parse(readFileSync(CACHE, "utf8"));
        // Only a FRESH, BELOW-THRESHOLD cached count is trusted (a high one must be re-verified).
        if (c && typeof c.count === "number" && c.count < tripThreshold && (now - c.ts) <= ttlMs) return c.count;
      }
    } catch { /* stale/corrupt cache -> refresh below */ }
  }
  const _enum = enumerate || (() => {
    // Absolute path: a bash-spawned context can carry a PATH without System32, which makes a bare
    // "tasklist" throw ENOENT -> -1 -> fail-open. Defense-in-depth: never trust PATH for the
    // load-bearing enumeration.
    const TASKLIST = `${process.env.SystemRoot || "C:\\Windows"}\\System32\\tasklist.exe`;
    const out = execFileSync(TASKLIST, ["/NH", "/FI", "IMAGENAME eq bash.exe"], { encoding: "utf8", timeout: TASKLIST_TIMEOUT_MS, windowsHide: true });
    return (out.match(/bash\.exe/gi) || []).length;  // "INFO: No tasks running..." -> 0
  });
  try {
    let count = _enum();
    if (count >= tripThreshold) {
      for (let i = 1; i < Math.max(1, samples); i++) {
        let s; try { s = _enum(); } catch { break; }
        if (typeof s === "number" && s >= 0) count = Math.min(count, s);
        if (count < tripThreshold) break; // already cleared -> transient, stop sampling
      }
    }
    // Cache ONLY a below-threshold count (a high count is re-verified next call, never latched).
    if (!skipCache && count < tripThreshold) {
      try { if (!existsSync(SIDE_DIR)) mkdirSync(SIDE_DIR, { recursive: true }); writeFileSync(CACHE, JSON.stringify({ ts: now, count })); } catch { /* best-effort cache */ }
    }
    return count;
  } catch { return -1; }
}

function emit(obj) { try { process.stdout.write(JSON.stringify(obj)); } catch { /* ignore */ } }

function main() {
  if (process.env.PRISM_FORKSTORM_BREAKER_DISABLE === "1") { emit({ continue: true }); return; }
  let payload;
  try { payload = JSON.parse(readFileSync(0, "utf8")); } catch { emit({ continue: true }); return; }
  const tool = payload?.tool_name || payload?.tool || "";
  if (!GATED.has(tool)) { emit({ continue: true }); return; }

  const ti = payload?.tool_input || {};
  const text = `${ti.command || ""} ${ti.prompt || ""} ${ti.description || ""}`;
  const scoped = /\[SCOPED\]|--force-spawn/i.test(text) || process.env.PRISM_FORKSTORM_FORCE === "1";
  const ceiling = Number(process.env.PRISM_FORKSTORM_CEILING || DEFAULT_CEILING);
  const ttlMs = Number(process.env.PRISM_FORKSTORM_TTL_MS || DEFAULT_TTL_MS);
  const wfFactor = Number(process.env.PRISM_FORKSTORM_WORKFLOW_FACTOR || DEFAULT_WF_FACTOR);

  // Pass the per-tool TRIP threshold (Workflow trips early at wfFactor*ceiling) so the sustained-
  // sampling + no-latch cache gate use the SAME threshold the decision will use.
  const tripThreshold = tool === "Workflow" ? Math.max(1, Math.floor(ceiling * wfFactor)) : ceiling;
  const bashCount = liveBashCount({ ttlMs, tripThreshold });
  const verdict = decideBreaker({ tool, bashCount, ceiling, disabled: false, scoped, wfFactor });
  if (verdict.action !== "block") { emit({ continue: true }); return; }

  emit({ decision: "block", reason:
    `[fork-storm-breaker] ${verdict.reason}. New ${tool} spawns are PAUSED to protect the MCP server (:3100) from process-storm starvation -- the "api server error" root cause. The storm drains within seconds; WAIT briefly, then retry. Do NOT fan out more agents/bash right now. Override only if you are certain: append [SCOPED] / --force-spawn, raise PRISM_FORKSTORM_CEILING, or PRISM_FORKSTORM_BREAKER_DISABLE=1.` });
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  // Top-level fail-open: this fires on EVERY Bash/Agent/Workflow across all slots. Any uncaught
  // error MUST degrade to allow -- never a non-zero exit that stalls a legit call.
  try { main(); } catch { try { process.stdout.write('{"continue":true}'); } catch { /* give up silently */ } }
}
