#!/usr/bin/env node
// tier: T3
/**
 * stop-goal-clear-advance.mjs — AUTONOMOUS-FLEET-MS0/U-GOAL-CLEAR-ADVANCE
 *
 * Stop hook that fires when a chat slot's /loop or /goal has CLEARED
 * (iter >= target, or loop-state ended target-met) and AUTO-FALLS-BACK to the
 * next remaining unit in the slot's task queue — own-domain-first, then
 * fleet-wide — instead of letting the slot go idle.
 *
 * Problem (operator-observed live): when a slot reaches "goal clear", nothing
 * resolves the next queued unit. The slot idles and the Stop hook re-fires with
 * no work to do (the repeated-Stop-advisory loop). The remaining units in the
 * slot's queue are never picked up without a human prompt.
 *
 * This is the INVERSE sibling of stop-force-loop-continue.mjs:
 *   - force-loop-continue handles iter <  target (loop fell off mid-target →
 *     re-inject "resume the SAME unit")
 *   - THIS hook handles    iter >= target (goal CLEARED → advance to the NEXT
 *     queued unit, own-domain-first then fleet fallback)
 *
 * On Stop, when the loop is target-met:
 *   1. Resolve this chat's stable session id (stdin or chat-slots fallback)
 *   2. Read loop-state; gate on target-met (iter >= target, or ended target-met)
 *   3. Resolve the next unit via `loop-state.mjs next --resolve-only` (dry-run:
 *      --resume → handoff RESUME → pick-unit own-lane → pick-unit fleet)
 *      - exhausted (queue genuinely empty) → no-op, advisory only (honest idle)
 *   4. If a real roadmap unit resolved (source pick-unit / pick-unit-fleet):
 *      a. Claim it via slot-task-claim.mjs (best-effort; conflict = skip)
 *      b. Roll the loop via `loop-state.mjs next` (no --resolve-only) so the
 *         loop record advances onto the next unit
 *      c. Append/replace a `## RESUME_LOOP` directive in the per-agent handoff
 *         so the next turn auto-continues (do NOT wait for a human prompt)
 *   5. Bound re-injection at MAX/session via a stamp file (avoid infinite churn)
 *
 * Strictly advisory: NEVER blocks Stop. Any failure → continue.
 *
 * Knobs:
 *   PRISM_GOAL_CLEAR_ADVANCE_DISABLE=1   — skip entirely
 *   PRISM_GOAL_CLEAR_ADVANCE_MAX=3       — max advances per session (default 3)
 *   PRISM_GOAL_CLEAR_ADVANCE_VERBOSE=1   — stderr diagnostics
 *
 * Composes (no new engine/dispatcher):
 *   .claude/helpers/loop-state.mjs        (read, next, next --resolve-only)
 *   .claude/helpers/slot-task-claim.mjs   (claim — best-effort)
 *   state/shared/chat-slots.json          (chatId → slot)
 *   state/shared/handoffs/HANDOFF-*.md    (## RESUME_LOOP append)
 *
 * @milestone AUTONOMOUS-FLEET-MS0
 * @unit U-GOAL-CLEAR-ADVANCE
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, statSync, mkdirSync, readdirSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";

const REPO_ROOT = "H:/prism";
const HANDOFFS_DIR = resolve(REPO_ROOT, "state/shared/handoffs");
const HELPER_LOOP = resolve(REPO_ROOT, ".claude/helpers/loop-state.mjs");
const HELPER_CLAIM = resolve(REPO_ROOT, ".claude/helpers/slot-task-claim.mjs");
// Slots path is overridable for hermetic tests (so the test never mutates the
// live shared chat-slots.json that peer slots heartbeat into concurrently).
const SLOTS_JSON = process.env.PRISM_GOAL_CLEAR_ADVANCE_SLOTS_JSON
  ? resolve(process.env.PRISM_GOAL_CLEAR_ADVANCE_SLOTS_JSON)
  : resolve(REPO_ROOT, "state/shared/chat-slots.json");
const STAMP_DIR = resolve(REPO_ROOT, "state/shared/.goal-clear-advance-stamps");
const RESUME_LOOP_MARKER = "## RESUME_LOOP";

const DISABLED = process.env.PRISM_GOAL_CLEAR_ADVANCE_DISABLE === "1";
const VERBOSE = process.env.PRISM_GOAL_CLEAR_ADVANCE_VERBOSE === "1";
const MAX_ADVANCE_RAW = parseInt(process.env.PRISM_GOAL_CLEAR_ADVANCE_MAX ?? "3", 10);
// NaN guard: a non-numeric env value must NOT disable the cap (count >= NaN is
// always false → unbounded advances). Fall back to the default 3 (reviewer P2).
const MAX_ADVANCE = Number.isFinite(MAX_ADVANCE_RAW) && MAX_ADVANCE_RAW > 0 ? MAX_ADVANCE_RAW : 3;
const NODE_TIMEOUT_MS = 30000; // child-helper spawn ceiling

function vlog(msg) { if (VERBOSE) process.stderr.write(`[goal-clear-advance] ${msg}\n`); }

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

function resolveSessionId(input) {
  if (input?.session_id && typeof input.session_id === "string") return input.session_id;
  // Fallback: most-recently-touched slot's chatId
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

/** Map a session id → { slot, chatId } via chat-slots.json (null slot if unbound). */
function resolveSlot(sessionId) {
  const chatId = `claude-${String(sessionId).slice(0, 8)}`;
  try {
    const slots = JSON.parse(readFileSync(SLOTS_JSON, "utf-8")).slots ?? {};
    for (const [name, s] of Object.entries(slots)) {
      if (s && typeof s === "object" && s.chatId === chatId) return { slot: name, chatId };
    }
  } catch { /* fail-soft */ }
  return { slot: null, chatId };
}

function readLoopState(sid) {
  if (!existsSync(HELPER_LOOP)) return null;
  try {
    const out = execFileSync(process.execPath, [HELPER_LOOP, "read", "--session", sid], { windowsHide: true, encoding: "utf-8", timeout: 3000 });
    if (!out || !out.trim()) return null;
    return JSON.parse(out);
  } catch (e) { vlog(`loop-state read err: ${e.message?.slice(0, 200)}`); return null; }
}

/** True when the loop reached its target (the goal-clear condition). */
function isTargetMet(loop) {
  if (!loop || typeof loop.iter !== "number" || typeof loop.target !== "number") return false;
  if (loop.iter >= loop.target) return true; // running-and-done OR ended-and-done
  // Also accept an ended loop whose endReason names target-met (defensive).
  if (loop.status === "ended" && /target|complete|goal[- ]?clear/i.test(String(loop.endReason ?? ""))) return true;
  return false;
}

function advanceCount(sid) {
  const p = resolve(STAMP_DIR, `${sid}.count`);
  try { return parseInt(readFileSync(p, "utf-8"), 10) || 0; }
  catch { return 0; }
}

function bumpAdvanceCount(sid) {
  const p = resolve(STAMP_DIR, `${sid}.count`);
  mkdirSync(dirname(p), { recursive: true });
  const next = advanceCount(sid) + 1;
  writeFileSync(p, String(next));
  return next;
}

function findHandoff(sid) {
  if (!existsSync(HANDOFFS_DIR)) return null;
  try {
    const files = readdirSync(HANDOFFS_DIR).filter(f => f.startsWith("HANDOFF-") && f.endsWith(".md") && f.includes(sid));
    if (!files.length) return null;
    const sorted = files
      .map(f => ({ f, mtimeMs: statSync(resolve(HANDOFFS_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    return resolve(HANDOFFS_DIR, sorted[0].f);
  } catch { return null; }
}

/** Resolve the next unit WITHOUT mutating loop state (dry-run). */
function resolveNext(sid, slot, chatId) {
  try {
    const args = [HELPER_LOOP, "next", "--session", sid, "--terminal", sid, "--resolve-only"];
    if (slot) args.push("--slot", slot);
    if (chatId) args.push("--chatId", chatId);
    const out = execFileSync(process.execPath, args, { windowsHide: true, encoding: "utf-8", timeout: NODE_TIMEOUT_MS });
    const line = (out || "").trim().split("\n").filter(Boolean).pop() || "{}";
    return JSON.parse(line);
  } catch (e) { vlog(`resolveNext err: ${e.message?.slice(0, 200)}`); return { ok: false, exhausted: true, nextTask: "", source: "none" }; }
}

/** Roll the loop onto the next unit (mutates loop state; mirror of resolveNext args). */
function rollNext(sid, slot, chatId) {
  try {
    const args = [HELPER_LOOP, "next", "--session", sid, "--terminal", sid];
    if (slot) args.push("--slot", slot);
    if (chatId) args.push("--chatId", chatId);
    const out = execFileSync(process.execPath, args, { windowsHide: true, encoding: "utf-8", timeout: NODE_TIMEOUT_MS });
    const line = (out || "").trim().split("\n").filter(Boolean).pop() || "{}";
    return JSON.parse(line);
  } catch (e) { vlog(`rollNext err: ${e.message?.slice(0, 200)}`); return { ok: false }; }
}

/**
 * Parse a `MILESTONE::U-ID` or `MILESTONE / U-ID` unit key from a pick-unit
 * task line (pick-unit prints "MILESTONE / U-ID"). Returns "" if no unit key.
 */
function parseUnitKey(task) {
  if (typeof task !== "string") return "";
  const m = task.match(/([A-Z0-9][A-Z0-9-]*(?:-MS\d+)?)\s*(?:::|\/)\s*(U-[A-Za-z0-9-]+)/);
  return m ? `${m[1]}::${m[2]}` : "";
}

/** Best-effort claim of a roadmap unit. Conflict / failure → false (never throws). */
function tryClaim(slot, chatId, unitKey) {
  if (!slot || !chatId || !unitKey || !existsSync(HELPER_CLAIM)) return false;
  try {
    execFileSync(process.execPath, [HELPER_CLAIM, "claim", "--slot", slot, "--chatId", chatId, "--unit", unitKey],
      { windowsHide: true, encoding: "utf-8", timeout: 10000 });
    return true; // exit 0 = claimed
  } catch (e) { vlog(`claim skip (conflict/err): ${e.message?.slice(0, 120)}`); return false; }
}

function injectResumeLoop(handoffPath, nextTask, source, claimed, count) {
  let content;
  try { content = readFileSync(handoffPath, "utf-8"); }
  catch { return false; }

  const block = `

${RESUME_LOOP_MARKER}

**GOAL CLEARED → auto-advance to next queued unit** (advance ${count}/${MAX_ADVANCE} by stop-goal-clear-advance.mjs).

Next unit: ${nextTask}
Source: ${source}${source === "pick-unit-fleet" ? " (own-lane empty → fleet fallback)" : ""}
Claimed: ${claimed ? "yes" : "no (already-claimed or freeform directive)"}

▶ NEXT ACTION (auto-continue — do NOT stop to wait for a prompt): re-invoke \`/loop\` to build the next unit above. The loop record has already been rolled onto it. To abandon instead: \`node H:/prism/.claude/helpers/loop-state.mjs end --session <sid> --reason "manual-abort"\`.

(Injected by the goal-clear-advance Stop hook; cap = ${MAX_ADVANCE} advances/session. Disable: PRISM_GOAL_CLEAR_ADVANCE_DISABLE=1.)
`;

  // Idempotency: strip EVERY existing RESUME_LOOP block (marker line + body),
  // then append the fresh one. A regex approach is fragile here — a lazy
  // `[\s\S]*?` with a `(?=\n## |$)` lookahead either fails to match (no `m`:
  // proven `test()===false` on real content) or strips only the marker line
  // (`m`: `$`=end-of-line orphans the body). BOTH break (3-of-3 scrutiny arms B+C,
  // 2026-06-08). A line-scanner is unambiguous: drop from each marker line until
  // the next non-RESUME_LOOP `## ` heading (or EOF), preserving every other
  // section. Verified across {block-at-end, block-followed-by-section, two-blocks,
  // none}.
  const lines = content.split("\n");
  const kept = [];
  let skipping = false;
  for (const ln of lines) {
    const isMarker = ln.trimStart().startsWith(RESUME_LOOP_MARKER);
    if (isMarker) { skipping = true; continue; } // drop the marker line
    if (skipping) {
      // End the skipped block at the next ## heading that is NOT another RESUME_LOOP.
      if (/^\s*## /.test(ln)) { skipping = false; kept.push(ln); }
      // else: still inside the old block body → drop
    } else {
      kept.push(ln);
    }
  }
  const stripped = kept.join("\n");
  const newContent = stripped.replace(/\s*$/, "") + block;

  try {
    const tmp = `${handoffPath}.${process.pid}.tmp`;
    writeFileSync(tmp, newContent);
    renameSync(tmp, handoffPath);
    return true;
  } catch (e) { vlog(`write err: ${e.message?.slice(0, 200)}`); return false; }
}

function main() {
  if (DISABLED) approveAndExit("disabled");
  const input = readStdinJson();
  const sid = resolveSessionId(input);
  if (!sid) approveAndExit("no session id");

  const loop = readLoopState(sid);
  if (!loop) approveAndExit("no loop state");
  // Only the GOAL-CLEARED case is ours — iter < target is force-loop-continue's job.
  if (!isTargetMet(loop)) approveAndExit(`loop not target-met (iter=${loop.iter}/${loop.target}, status=${loop.status})`);

  const count = advanceCount(sid);
  if (count >= MAX_ADVANCE) approveAndExit(`advance cap hit (${count}/${MAX_ADVANCE})`);

  const { slot, chatId } = resolveSlot(sid);
  // Unbound chat (no slot) → no-op. Defaulting to alpha's lane (pick-unit's
  // default) would advance the wrong slot onto alpha's queue (reviewer P2).
  if (!slot) approveAndExit("session not bound to a slot (no-op; would otherwise default to alpha lane)");

  // Dry-run resolve the next unit first — decide before mutating anything.
  const probe = resolveNext(sid, slot, chatId);
  if (!probe.nextTask || probe.exhausted) approveAndExit(`queue exhausted for slot=${slot} (honest idle)`);

  const handoffPath = findHandoff(sid);
  if (!handoffPath) approveAndExit("no handoff for sid (cannot inject directive)");

  // Claim ONLY when the next unit came from a STRUCTURED roadmap source
  // (pick-unit / pick-unit-fleet). A freeform handoff-resume/resume-flag task is
  // prose, NOT a roadmap unit — parsing a `WORD / U-x` fragment out of prose and
  // claiming it would falsely lock a (possibly peer-owned) unit (reviewer P1).
  const STRUCTURED = probe.source === "pick-unit" || probe.source === "pick-unit-fleet";
  const unitKey = STRUCTURED ? parseUnitKey(probe.nextTask) : "";
  const claimed = unitKey ? tryClaim(slot, chatId, unitKey) : false;
  const rolled = rollNext(sid, slot, chatId);
  const nextTask = (rolled && rolled.nextTask) || probe.nextTask;
  const source = (rolled && rolled.source) || probe.source;

  const newCount = bumpAdvanceCount(sid);
  const ok = injectResumeLoop(handoffPath, nextTask, source, claimed, newCount);
  vlog(`advance: ok=${ok} count=${newCount}/${MAX_ADVANCE} slot=${slot} unit=${unitKey || "(freeform)"} claimed=${claimed} source=${source}`);
  approveAndExit("advanced");
}

try { main(); }
catch (e) {
  vlog(`unexpected err: ${e.message}`);
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + "\n");
  process.exit(0);
}
