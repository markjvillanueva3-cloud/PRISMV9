// tier: T3
/**
 * .claude/hooks/__tests__/stop-goal-clear-advance.test.mjs
 *
 * Hermetic tests for stop-goal-clear-advance.mjs (U-GOAL-CLEAR-ADVANCE) — the
 * Stop hook that, on goal-clear (iter >= target), falls a slot back to the next
 * remaining queued unit (own-domain-first → fleet) instead of idling.
 *
 * Strategy: seed a loop-state JSON + a matching per-agent handoff for a throwaway
 * session id, pipe a Stop payload to the hook, and assert observable effects:
 *   - target-met + a unit resolves → handoff gains `## RESUME_LOOP`
 *   - iter < target → NO-OP (that's force-loop-continue's job)
 *   - advance cap → 4th invocation suppressed by the stamp
 *   - DISABLE knob → NO-OP
 * The hook NEVER blocks Stop, so every run must exit 0 with {continue:true}.
 *
 * Run: node --test .claude/hooks/__tests__/stop-goal-clear-advance.test.mjs
 */

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.resolve(HERE, "..", "stop-goal-clear-advance.mjs");
const REPO = path.join("H:", "prism");
const LOOP_DIR = path.join(REPO, "state", "shared", "loop-state");
const HANDOFF_DIR = path.join(REPO, "state", "shared", "handoffs");
const STAMP_DIR = path.join(REPO, "state", "shared", ".goal-clear-advance-stamps");

let counter = 0;
const CLEANUP = [];
function sid() {
  const s = `test-gca-${process.pid}-${counter++}`;
  return s;
}

/**
 * Build a HERMETIC slots-fixture file binding this session's chatId to a
 * throwaway slot, and return the env override that points the hook at it. This
 * NEVER touches the live shared chat-slots.json (which peer slots heartbeat into
 * concurrently — rewriting it would clobber their updates). The hook reads
 * PRISM_GOAL_CLEAR_ADVANCE_SLOTS_JSON when set. The slot name must be a REAL
 * pick-unit lane so the advance can resolve a unit — use 'alpha'.
 */
function boundSlotsEnv(s) {
  const chatId = `claude-${s.slice(0, 8)}`;
  const fixture = path.join(STAMP_DIR, `slots-fixture-${s}.json`);
  fs.mkdirSync(path.dirname(fixture), { recursive: true });
  fs.writeFileSync(fixture, JSON.stringify({
    schemaVersion: 2,
    slots: { alpha: { chatId, host: "test", claimedAt: "2026-06-08T00:00:00.000Z", lastHeartbeat: "2026-06-08T00:00:00.000Z", branch: "slot/alpha" } },
  }));
  CLEANUP.push(fixture);
  return { PRISM_GOAL_CLEAR_ADVANCE_SLOTS_JSON: fixture };
}

function loopPath(s) {
  const safe = String(s).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
  return path.join(LOOP_DIR, `loop-${safe}.json`);
}
function stampPath(s) { return path.join(STAMP_DIR, `${s}.count`); }
function handoffPath(s) { return path.join(HANDOFF_DIR, `HANDOFF-${s}-goal-clear-test.md`); }

function seedLoop(s, { iter, target, status = "running", task = "prev unit", endReason }) {
  fs.mkdirSync(LOOP_DIR, { recursive: true });
  const st = { schemaVersion: "1.0.0", sessionId: s, task, target, startedAt: "2026-06-08T00:00:00.000Z", lastTickAt: "2026-06-08T00:00:00.000Z", iter, iterations: [], status, slot: null };
  if (endReason) st.endReason = endReason;
  fs.writeFileSync(loopPath(s), JSON.stringify(st));
  CLEANUP.push(loopPath(s));
}

function seedHandoff(s, body = "# Handoff\n\nSome prior content.\n") {
  fs.mkdirSync(HANDOFF_DIR, { recursive: true });
  fs.writeFileSync(handoffPath(s), body);
  CLEANUP.push(handoffPath(s));
}

function runHook(s, env = {}) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ session_id: s }),
    encoding: "utf-8",
    timeout: 60000,
    env: { ...process.env, ...env },
  });
  let json = {};
  try { json = JSON.parse((r.stdout || "").trim().split("\n").filter(Boolean).pop() || "{}"); } catch { /* */ }
  return { json, status: r.status, stderr: r.stderr };
}

afterEach(() => {
  for (const p of CLEANUP.splice(0)) { try { fs.unlinkSync(p); } catch { /* */ } }
});

// ── always advisory: never blocks Stop ──────────────────────────────────────
test("hook never blocks Stop — always exit 0 with continue:true", () => {
  const s = sid();
  seedLoop(s, { iter: 5, target: 5 });
  seedHandoff(s);
  const { json, status } = runHook(s);
  assert.equal(status, 0, "exit 0");
  assert.equal(json.continue, true, "continue:true (advisory, never blocks)");
  try { fs.unlinkSync(stampPath(s)); } catch { /* */ }
});

// ── target-met + a unit resolves → handoff gains ## RESUME_LOOP ──────────────
test("target-met (iter>=target) injects ## RESUME_LOOP into the handoff", () => {
  const s = sid();
  seedLoop(s, { iter: 3, target: 3 }); // cleared
  seedHandoff(s);
  const { status } = runHook(s, boundSlotsEnv(s));
  assert.equal(status, 0);
  const after = fs.readFileSync(handoffPath(s), "utf-8");
  // The fleet roadmap is non-empty in this repo, so resolveNext returns a real
  // unit and the directive is injected. (If the entire fleet were exhausted the
  // hook would no-op — asserted separately below via the iter<target no-op.)
  assert.match(after, /## RESUME_LOOP/, "RESUME_LOOP directive appended on goal-clear");
  assert.match(after, /GOAL CLEARED → auto-advance/, "directive explains the auto-advance");
  assert.match(after, /Next unit:/, "directive names the next unit");
  try { fs.unlinkSync(stampPath(s)); } catch { /* */ }
});

// ── iter < target → NO-OP (force-loop-continue's job, not ours) ─────────────
test("iter < target is a no-op (does NOT inject; that is force-loop-continue)", () => {
  const s = sid();
  seedLoop(s, { iter: 1, target: 5 }); // mid-loop, NOT cleared
  seedHandoff(s);
  runHook(s);
  const after = fs.readFileSync(handoffPath(s), "utf-8");
  assert.doesNotMatch(after, /## RESUME_LOOP/, "no advance while iter < target");
  assert.doesNotMatch(after, /GOAL CLEARED/, "no goal-clear directive mid-loop");
});

// ── DISABLE knob → NO-OP ────────────────────────────────────────────────────
test("PRISM_GOAL_CLEAR_ADVANCE_DISABLE=1 → no injection", () => {
  const s = sid();
  seedLoop(s, { iter: 3, target: 3 });
  seedHandoff(s);
  runHook(s, { PRISM_GOAL_CLEAR_ADVANCE_DISABLE: "1" });
  const after = fs.readFileSync(handoffPath(s), "utf-8");
  assert.doesNotMatch(after, /## RESUME_LOOP/, "disabled → no advance");
});

// ── advance cap → 4th invocation suppressed by the stamp ────────────────────
test("advance cap (MAX=2): 3rd invocation is suppressed by the stamp", () => {
  const s = sid();
  seedHandoff(s);
  const slotsEnv = boundSlotsEnv(s);
  // Re-seed cleared loop each time (the roll mutates it).
  seedLoop(s, { iter: 3, target: 3 });
  runHook(s, { ...slotsEnv, PRISM_GOAL_CLEAR_ADVANCE_MAX: "2" }); // advance 1
  seedLoop(s, { iter: 3, target: 3 });
  runHook(s, { ...slotsEnv, PRISM_GOAL_CLEAR_ADVANCE_MAX: "2" }); // advance 2
  // Wipe handoff RESUME_LOOP to detect whether the 3rd run re-injects.
  fs.writeFileSync(handoffPath(s), "# Handoff\n\nclean.\n");
  seedLoop(s, { iter: 3, target: 3 });
  runHook(s, { ...slotsEnv, PRISM_GOAL_CLEAR_ADVANCE_MAX: "2" }); // capped → must NOT inject
  const after = fs.readFileSync(handoffPath(s), "utf-8");
  assert.doesNotMatch(after, /## RESUME_LOOP/, "3rd advance suppressed by cap=2");
  try { fs.unlinkSync(stampPath(s)); } catch { /* */ }
});

// ── no loop state → no-op (nothing to advance from) ─────────────────────────
test("no loop state for the session → no-op", () => {
  const s = sid();
  seedHandoff(s); // handoff exists but no loop-state
  const { status } = runHook(s);
  assert.equal(status, 0);
  const after = fs.readFileSync(handoffPath(s), "utf-8");
  assert.doesNotMatch(after, /## RESUME_LOOP/, "no loop state ⇒ nothing to advance");
});

// ── idempotency: re-injecting does NOT duplicate the block or corrupt content ─
// (regression guard for the reviewer-P1 regex bug: `m` flag truncated the match,
// orphaning the old body + eating the separator before a preceding section.)
test("re-inject is idempotent — exactly one RESUME_LOOP block, surrounding sections intact", () => {
  const s = sid();
  // Handoff with content BOTH before and after where the block lands.
  seedHandoff(s, "# Handoff\n\n## State\nimportant prior content\n\n## Next Steps\nkeep me\n");
  const slotsEnv = boundSlotsEnv(s);
  seedLoop(s, { iter: 3, target: 3 });
  runHook(s, { ...slotsEnv, PRISM_GOAL_CLEAR_ADVANCE_MAX: "9" }); // advance 1
  seedLoop(s, { iter: 3, target: 3 });
  runHook(s, { ...slotsEnv, PRISM_GOAL_CLEAR_ADVANCE_MAX: "9" }); // advance 2 (re-inject)
  const after = fs.readFileSync(handoffPath(s), "utf-8");
  // Exactly ONE marker (not duplicated across the two advances).
  const markers = (after.match(/## RESUME_LOOP/g) || []).length;
  assert.equal(markers, 1, "exactly one RESUME_LOOP marker after two advances");
  // CRITICAL (3-of-3 arm B): count the BODY sentinel, not just the marker. The
  // m-flag regex bug strips the marker LINE but ORPHANS the body — so a
  // marker-only count stays 1 while the handoff is corrupted with stale bodies.
  // Asserting body-count==1 is what actually catches the regression.
  const bodies = (after.match(/GOAL CLEARED → auto-advance/g) || []).length;
  assert.equal(bodies, 1, "exactly one block BODY (no orphaned stale body — the real corruption signature)");
  // Preceding section header is NOT glued onto the marker (separator preserved).
  assert.doesNotMatch(after, /\S## RESUME_LOOP/, "marker not glued onto prior content");
  // Original sections survive intact (both the preceding AND following section).
  assert.match(after, /## State\nimportant prior content/, "prior section preserved");
  assert.match(after, /## Next Steps\nkeep me/, "following section preserved");
  try { fs.unlinkSync(stampPath(s)); } catch { /* */ }
});

// ── unbound session (no slot) → no-op (would otherwise default to alpha lane) ─
test("session not bound to a slot → no-op (no false advance onto alpha's lane)", () => {
  const s = sid(); // test-gca-* is never a real bound slot in chat-slots.json
  seedLoop(s, { iter: 3, target: 3 });
  seedHandoff(s);
  runHook(s);
  const after = fs.readFileSync(handoffPath(s), "utf-8");
  assert.doesNotMatch(after, /## RESUME_LOOP/, "unbound session must not advance");
  try { fs.unlinkSync(stampPath(s)); } catch { /* */ }
});
