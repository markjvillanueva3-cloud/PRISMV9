#!/usr/bin/env node
// tier: T0
/**
 * stop-reblock-storm-breaker.mjs -- Stop hook (wired FIRST in the Stop chain)
 *
 * FIXES the endless-tick storm (operator 2026-06-18): "fix the loop, cron iter
 * setting so if there's a decision I need to make, chat slots don't endlessly
 * keep ticking." Sibling of the operator's prior [[feedback_unbreakable_loop_break]]
 * ("you do it like 9 times before you finally stop").
 *
 * ROOT CAUSE: some wired Stop hook returns {decision:"block"} without honoring
 * `stop_hook_active`, so once CLAUDE_CODE_STOP_HOOK_BLOCK_CAP was raised to 1e9
 * (operator directive, for unbounded PRODUCTIVE loops) there is no harness valve
 * to force-end an UNPRODUCTIVE re-block storm. When the model is just waiting on
 * an operator decision it emits text-only turns ("No action needed"), but the
 * rogue blocker keeps re-blocking Stop -> the chat ticks forever.
 *
 * THE FIX -- keep productive loops unbounded, but cleanly HALT an unproductive
 * storm. A re-block storm is distinguished from a productive loop by a single
 * reliable signal: a productive loop makes TOOL CALLS between blocks; a storm
 * (decision-wait / idle) produces TEXT-ONLY turns. So:
 *
 *   - stop_hook_active !== true  -> fresh stop, reset counter, approve.
 *   - an active RUNNING /loop      -> approve (stop-force-loop-continue owns it,
 *                                     bounded by its own no-progress detector).
 *   - last assistant turn made a TOOL CALL -> productive, reset counter, approve.
 *   - else (text-only continuation, no loop): increment a per-session counter;
 *     at >= threshold consecutive text-only re-blocks, return {continue:false}
 *     to HALT. `continue:false` overrides any later {decision:"block"}, so wired
 *     first this is bulletproof against whichever hook is the rogue blocker.
 *
 * The chat halts and waits for the operator; their next message starts a fresh
 * turn (stop_hook_active=false -> counter resets -> normal operation resumes).
 *
 * Strictly bounded + fail-soft: any error -> {continue:true} (never wedge a chat
 * shut by accident). Per-session counter so 26 concurrent slots never interfere.
 *
 * Knobs:
 *   PRISM_REBLOCK_STORM_DISABLE=1    -- skip entirely (revert to prior behavior)
 *   PRISM_REBLOCK_STORM_THRESHOLD=N  -- consecutive text-only re-blocks before
 *                                       halt (default 3; min 1)
 *   PRISM_REBLOCK_STORM_VERBOSE=1    -- stderr diagnostics
 *
 * @milestone FLEET-LOOP-AUTOMATION
 * @unit U-REBLOCK-STORM-BREAKER
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = "H:/prism";
const HELPER_LOOP = resolve(REPO_ROOT, ".claude/helpers/loop-state.mjs");
const SLOTS_JSON = resolve(REPO_ROOT, "state/shared/chat-slots.json");
const STAMP_DIR = resolve(REPO_ROOT, "state/shared/.reblock-storm-stamps");

const DISABLED = process.env.PRISM_REBLOCK_STORM_DISABLE === "1";
const VERBOSE = process.env.PRISM_REBLOCK_STORM_VERBOSE === "1";
const THRESHOLD_RAW = parseInt(process.env.PRISM_REBLOCK_STORM_THRESHOLD ?? "3", 10);
// NaN/<=0 guard: a bad env value must NOT disable the breaker (n >= NaN is always
// false -> never halts -> storm survives). Fall back to the default 3.
const THRESHOLD = Number.isFinite(THRESHOLD_RAW) && THRESHOLD_RAW >= 1 ? THRESHOLD_RAW : 3;
// auto-decide nudge window: how many text-only turns to NUDGE (try decide+proceed) at the
// threshold before the hard HALT. 0 = revert to halt-on-first (old behavior). Default 2.
const NUDGE_GRACE_RAW = parseInt(process.env.PRISM_REBLOCK_NUDGE_GRACE ?? "2", 10);
const NUDGE_GRACE = Number.isFinite(NUDGE_GRACE_RAW) && NUDGE_GRACE_RAW >= 0 ? NUDGE_GRACE_RAW : 2;
const TRANSCRIPT_TAIL_BYTES = 256 * 1024; // last 256KB holds the most-recent assistant turn

function vlog(msg) { if (VERBOSE) process.stderr.write(`[reblock-storm] ${msg}\n`); }

function readStdinJson() {
  try {
    const raw = readFileSync(0, "utf-8").trim();
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function approveAndExit(reason) {
  vlog(`approve: ${reason}`);
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");
  process.exit(0);
}

function haltAndExit(reason) {
  vlog(`HALT: ${reason}`);
  // continue:false overrides any later decision:block in the same Stop event ->
  // breaks the storm. stopReason is surfaced to the operator (not the model).
  process.stdout.write(JSON.stringify({
    continue: false,
    stopReason: `Paused: ${reason} The chat tried the crossroad auto-decide protocol and still could not proceed -- this fork is genuinely yours to decide (irreversible / safety / financial / external / scope). Send your decision to resume (this resets automatically).`,
  }) + "\n");
  process.exit(0);
}

// The crossroad auto-decide directive (operator directive 2026-06-24): injected via
// {decision:"block"} so the CHAT continues with this guidance instead of halting. It must
// try to decide+proceed on a reversible/internal fork and escalate ONLY an operator-only one.
const AUTO_DECIDE_DIRECTIVE =
  "CROSSROAD AUTO-DECIDE (operator directive 2026-06-24): you appear to have stopped on a decision-wait. " +
  "Do NOT idle waiting for the operator on a fork you can resolve. Apply the protocol: " +
  "(1) NAME the fork. (2) CLASSIFY it -- it is OPERATOR-ONLY only if it is irreversible (delete/overwrite/force-push/reset --hard), " +
  "financial, external-facing (publish/send/deploy/merge-to-main/go-live), credentials/access, safety / real-machine (S(x), G-code to a machine), " +
  "or a goal/scope change. (3) If OPERATOR-ONLY -> state the specific decision + your recommendation, then it is correct to wait. " +
  "(4) OTHERWISE (reversible/internal -- which implementation, naming, order, approach, which of N valid options) -> DO NOT WAIT: " +
  "run a quick deep-reasoning assessment (pick the path that best satisfies the goal + constraints + safety -- use prism_ai reasoning / the " +
  "brainstorm-path-forward Workflow / PRISMCreativeReasoningEngine, or your own structured reasoning), STATE your decision + rationale + confidence, " +
  "and PROCEED with a concrete tool call this turn. Guardrail: scripts/lib/crossroad-auto-decide.mjs classifyDecision(); doctrine [[feedback_crossroad_brainstorm_workflow]]. " +
  "Universal safety rails still bind -- never auto-decide an operator-only fork.";

function nudgeAndExit(reason) {
  vlog(`NUDGE: ${reason}`);
  // decision:"block" -> the chat CONTINUES with `reason` as guidance (the auto-decide
  // directive), rather than halting. If the chat then proceeds (makes a tool call) the
  // counter resets next Stop; if it stays text-only it escalates and halt fires later.
  process.stdout.write(JSON.stringify({
    decision: "block",
    reason: AUTO_DECIDE_DIRECTIVE,
  }) + "\n");
  process.exit(0);
}

function resolveSessionId(input) {
  if (input?.session_id && typeof input.session_id === "string") return input.session_id;
  // Fallback: most-recently-touched slot's chatId (mirrors the other Stop hooks).
  try {
    const slots = JSON.parse(readFileSync(SLOTS_JSON, "utf-8")).slots ?? {};
    let best = { ts: 0, id: null };
    for (const [, s] of Object.entries(slots)) {
      if (!s?.chatId) continue;
      const ts = Date.parse(s.lastHeartbeat ?? s.claimedAt ?? "1970");
      if (ts > best.ts) best = { ts, id: s.chatId };
    }
    return best.id;
  } catch { return null; }
}

/** True iff there is an active /loop still below its target (loop owns the continuation). */
function hasRunningLoop(sid) {
  if (!existsSync(HELPER_LOOP)) return false;
  try {
    const out = execFileSync(process.execPath, [HELPER_LOOP, "read", "--session", sid], { windowsHide: true, encoding: "utf-8", timeout: 3000 });
    if (!out || !out.trim()) return false;
    const loop = JSON.parse(out);
    return !!(loop && loop.status === "running" &&
      typeof loop.iter === "number" && typeof loop.target === "number" && loop.iter < loop.target);
  } catch (e) { vlog(`loop-state read err: ${e.message?.slice(0, 120)}`); return false; }
}

function readFileTail(path, maxBytes) {
  if (!existsSync(path)) return "";
  const size = statSync(path).size;
  const start = Math.max(0, size - maxBytes);
  const len = size - start;
  if (len <= 0) return "";
  const fd = openSync(path, "r");
  try {
    const buf = Buffer.allocUnsafe(len);
    const n = readSync(fd, buf, 0, len, start);
    return buf.toString("utf-8", 0, n);
  } finally { closeSync(fd); }
}

/**
 * Read the TAIL of the transcript JSONL and report whether the most-recent
 * assistant message contained a tool_use block (=productive turn). Fail-soft:
 * unreadable/absent transcript -> false (treat as text-only, conservative: an
 * unobservable storm still eventually halts rather than spinning forever).
 */
export function lastAssistantHadToolUse(transcriptPath, opts = {}) {
  const readImpl = opts.readTail || readFileTail;
  let text;
  try { text = readImpl(transcriptPath, TRANSCRIPT_TAIL_BYTES); }
  catch { return false; }
  if (!text || typeof text !== "string") return false;
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  // Walk from the END to the first assistant message; inspect ITS content only.
  for (let i = lines.length - 1; i >= 0; i--) {
    let obj;
    try { obj = JSON.parse(lines[i]); } catch { continue; } // partial first line from the tail cut
    const role = obj?.message?.role ?? obj?.role;
    const type = obj?.type;
    const isAssistant = role === "assistant" || type === "assistant";
    if (!isAssistant) continue;
    const content = obj?.message?.content ?? obj?.content;
    if (Array.isArray(content)) return content.some((b) => b && b.type === "tool_use");
    return false; // string content = pure text -> no tool use
  }
  return false; // no assistant turn found in the tail
}

function readCount(sid) {
  try { return parseInt(readFileSync(resolve(STAMP_DIR, `${sid}.count`), "utf-8"), 10) || 0; }
  catch { return 0; }
}
function writeCount(sid, n) {
  try { mkdirSync(STAMP_DIR, { recursive: true }); writeFileSync(resolve(STAMP_DIR, `${sid}.count`), String(n)); }
  catch { /* fail-soft: in-memory decision still holds for THIS fire */ }
}

/**
 * Pure decision core (the unit-tested heart). Given the observable state, decide the
 * ACTION and the new consecutive-text-only count.
 *
 * Three-way (CROSSROAD AUTO-DECIDE, operator directive 2026-06-24): a decision-wait is
 * no longer halted on first detection. At the storm threshold the chat is first NUDGED to
 * run the crossroad auto-decide protocol (deep-reason the fork -> decide+proceed on a
 * reversible/internal fork; escalate ONLY a genuinely operator-only one). The hard HALT
 * (wait for the operator) only fires after `nudgeGrace` further text-only turns prove the
 * fork really is operator-only and the chat is correctly waiting.
 *   action:'approve' -> {continue:true} (productive / fresh / loop-owned / below threshold)
 *   action:'nudge'   -> {decision:'block', reason:<auto-decide directive>} (try to decide+proceed)
 *   action:'halt'    -> {continue:false} (genuinely waiting on the operator)
 */
export function decideBreak({ stopHookActive, runningLoop, lastTurnHadToolUse, priorCount, threshold = 3, nudgeGrace = 2 }) {
  if (stopHookActive !== true) return { action: "approve", halt: false, newCount: 0, reason: "fresh-stop (not a hook continuation)" };
  if (runningLoop) return { action: "approve", halt: false, newCount: 0, reason: "active /loop owns the continuation" };
  if (lastTurnHadToolUse) return { action: "approve", halt: false, newCount: 0, reason: "productive turn (tool call) -- not a storm" };
  const n = (Number.isFinite(priorCount) ? priorCount : 0) + 1;
  const t = Number.isFinite(threshold) && threshold >= 1 ? threshold : 3;
  const g = Number.isFinite(nudgeGrace) && nudgeGrace >= 0 ? nudgeGrace : 2;
  if (n < t) return { action: "approve", halt: false, newCount: n, reason: `text-only continuation ${n}/${t} (not yet a storm)` };
  if (n < t + g) return { action: "nudge", halt: false, newCount: n, reason: `decision-wait detected (${n}) -- nudge to auto-decide before halting` };
  return { action: "halt", halt: true, newCount: n, reason: `re-block storm (${n} consecutive text-only continuations, no active loop).` };
}

function main() {
  if (DISABLED) approveAndExit("disabled");
  const input = readStdinJson();
  const sid = resolveSessionId(input);
  if (!sid) approveAndExit("no session id");

  const decision = decideBreak({
    stopHookActive: input.stop_hook_active === true,
    runningLoop: hasRunningLoop(sid),
    lastTurnHadToolUse: lastAssistantHadToolUse(input.transcript_path),
    priorCount: readCount(sid),
    threshold: THRESHOLD,
    nudgeGrace: NUDGE_GRACE,
  });

  writeCount(sid, decision.newCount);
  if (decision.action === "halt") haltAndExit(decision.reason);
  if (decision.action === "nudge") nudgeAndExit(decision.reason);
  approveAndExit(decision.reason);
}

const _invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("stop-reblock-storm-breaker.mjs");
if (_invokedDirectly) {
  try { main(); }
  catch (e) {
    vlog(`unexpected err: ${e.message}`);
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");
    process.exit(0);
  }
}
