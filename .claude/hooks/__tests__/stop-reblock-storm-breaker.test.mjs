// Tests for stop-reblock-storm-breaker.mjs pure core.
// Run: node --test .claude/hooks/__tests__/stop-reblock-storm-breaker.test.mjs
//
// The breaker decides a real, costly thing: whether to HALT a chat that is
// re-blocking Stop with no productive work (the operator's "endless tick while I
// decide" bug). Each test encodes WHY a verdict matters -- a false HALT wedges a
// productive loop shut; a false APPROVE lets the storm spin forever.

import { test } from "node:test";
import assert from "node:assert/strict";
import { decideBreak, lastAssistantHadToolUse } from "../stop-reblock-storm-breaker.mjs";

// ── decideBreak ───────────────────────────────────────────────────────────────

test("fresh stop (stop_hook_active !== true) -> never halts, counter reset", () => {
  // A normal turn-end is NOT a hook-continuation storm; the breaker must stay out
  // of the way so the chat ends cleanly and other Stop hooks decide.
  const d = decideBreak({ stopHookActive: false, runningLoop: false, lastTurnHadToolUse: false, priorCount: 99, threshold: 3 });
  assert.equal(d.halt, false);
  assert.equal(d.newCount, 0, "fresh stop resets the storm counter");
});

test("active running /loop -> never halts (loop owns the continuation)", () => {
  // A productive /loop legitimately re-blocks every iteration; force-loop-continue
  // (with its own no-progress detector) owns it. The breaker must NOT halt it even
  // deep into a text-looking continuation.
  const d = decideBreak({ stopHookActive: true, runningLoop: true, lastTurnHadToolUse: false, priorCount: 50, threshold: 3 });
  assert.equal(d.halt, false);
  assert.equal(d.newCount, 0, "an active loop resets the counter -- it is productive by definition");
});

test("productive turn (tool call) -> resets counter, no halt", () => {
  // The single signal that separates a real loop from a storm: tool calls. A turn
  // that called a tool did forward work -> reset, never halt.
  const d = decideBreak({ stopHookActive: true, runningLoop: false, lastTurnHadToolUse: true, priorCount: 2, threshold: 3 });
  assert.equal(d.halt, false);
  assert.equal(d.newCount, 0);
});

test("text-only continuation below threshold -> counts up, no halt yet", () => {
  const d = decideBreak({ stopHookActive: true, runningLoop: false, lastTurnHadToolUse: false, priorCount: 0, threshold: 3 });
  assert.equal(d.halt, false);
  assert.equal(d.newCount, 1, "first text-only re-block -> count 1, allow a couple before halting");
  const d2 = decideBreak({ stopHookActive: true, runningLoop: false, lastTurnHadToolUse: false, priorCount: 1, threshold: 3 });
  assert.equal(d2.halt, false);
  assert.equal(d2.newCount, 2);
});

test("text-only AT threshold -> NUDGE to auto-decide (not halt yet) -- crossroad auto-decide", () => {
  // priorCount 2 + this re-block = 3 >= threshold 3, but within nudgeGrace -> NUDGE the chat
  // to run the crossroad auto-decide protocol (decide+proceed) BEFORE the hard halt.
  const d = decideBreak({ stopHookActive: true, runningLoop: false, lastTurnHadToolUse: false, priorCount: 2, threshold: 3, nudgeGrace: 2 });
  assert.equal(d.action, "nudge");
  assert.equal(d.halt, false);
  assert.equal(d.newCount, 3);
});

test("text-only AFTER nudge grace -> HALTS (fork is genuinely operator-only)", () => {
  // threshold 3 + grace 2 = halt at n >= 5. The auto-decide nudge fired at 3,4 and did not
  // resolve -> the chat is correctly waiting on the operator -> HALT (preserve the safety valve).
  const d = decideBreak({ stopHookActive: true, runningLoop: false, lastTurnHadToolUse: false, priorCount: 4, threshold: 3, nudgeGrace: 2 });
  assert.equal(d.action, "halt");
  assert.equal(d.halt, true);
  assert.equal(d.newCount, 5);
  assert.match(d.reason, /re-block storm/);
});

test("nudgeGrace 0 -> reverts to halt-on-threshold (old behavior, no nudge)", () => {
  const d = decideBreak({ stopHookActive: true, runningLoop: false, lastTurnHadToolUse: false, priorCount: 2, threshold: 3, nudgeGrace: 0 });
  assert.equal(d.action, "halt");
  assert.equal(d.halt, true);
});

test("threshold 1 + nudgeGrace 0 -> halts on the FIRST text-only re-block (aggressive config)", () => {
  const d = decideBreak({ stopHookActive: true, runningLoop: false, lastTurnHadToolUse: false, priorCount: 0, threshold: 1, nudgeGrace: 0 });
  assert.equal(d.action, "halt");
  assert.equal(d.halt, true);
  assert.equal(d.newCount, 1);
});

test("threshold 1 default grace -> NUDGES first (auto-decide before halting)", () => {
  const d = decideBreak({ stopHookActive: true, runningLoop: false, lastTurnHadToolUse: false, priorCount: 0, threshold: 1, nudgeGrace: 2 });
  assert.equal(d.action, "nudge");
  assert.equal(d.newCount, 1);
});

test("adversarial: NaN priorCount treated as 0 (never disables the counter)", () => {
  const d = decideBreak({ stopHookActive: true, runningLoop: false, lastTurnHadToolUse: false, priorCount: NaN, threshold: 3 });
  assert.equal(d.newCount, 1, "NaN prior -> 0 -> 1, not NaN");
  assert.equal(d.halt, false);
});

test("adversarial: NaN/0/negative threshold falls back to default 3 (never never-halts)", () => {
  // A bad threshold must not make `n >= threshold` always-false (storm immortal).
  for (const bad of [NaN, 0, -5, undefined]) {
    // nudgeGrace:0 isolates the THRESHOLD fallback (no nudge window) -> bad threshold must still halt at 3.
    const d = decideBreak({ stopHookActive: true, runningLoop: false, lastTurnHadToolUse: false, priorCount: 2, threshold: bad, nudgeGrace: 0 });
    assert.equal(d.halt, true, `threshold ${bad} -> default 3 -> 3>=3 halts`);
  }
});

// ── lastAssistantHadToolUse (transcript tail parse, injected reader) ────────────

const line = (o) => JSON.stringify(o);
const fakeReader = (text) => () => text;

test("detects a tool_use block in the most-recent assistant turn -> true (productive)", () => {
  const txt = [
    line({ type: "user", message: { role: "user", content: "go" } }),
    line({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "ok" }, { type: "tool_use", name: "Bash" }] } }),
  ].join("\n");
  assert.equal(lastAssistantHadToolUse("x", { readTail: fakeReader(txt) }), true);
});

test("text-only assistant turn (array, no tool_use) -> false (storm-eligible)", () => {
  const txt = line({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "No action needed." }] } });
  assert.equal(lastAssistantHadToolUse("x", { readTail: fakeReader(txt) }), false);
});

test("string-content assistant turn -> false (pure text)", () => {
  const txt = line({ role: "assistant", content: "No action needed." });
  assert.equal(lastAssistantHadToolUse("x", { readTail: fakeReader(txt) }), false);
});

test("walks PAST a trailing user/tool_result to the last ASSISTANT turn", () => {
  // The last line is a user tool_result; the breaker must judge the assistant turn.
  const txt = [
    line({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name: "Read" }] } }),
    line({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "..." }] } }),
  ].join("\n");
  assert.equal(lastAssistantHadToolUse("x", { readTail: fakeReader(txt) }), true, "found the assistant tool_use behind the trailing user line");
});

test("malformed first line (partial JSON from the tail cut) is skipped, not fatal", () => {
  const txt = [
    '{"type":"assist',  // truncated head from reading only the tail
    line({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "hi" }] } }),
  ].join("\n");
  assert.equal(lastAssistantHadToolUse("x", { readTail: fakeReader(txt) }), false, "skips the partial line, judges the valid assistant turn");
});

test("empty transcript / no assistant turn -> false (fail-soft)", () => {
  assert.equal(lastAssistantHadToolUse("x", { readTail: fakeReader("") }), false);
  assert.equal(lastAssistantHadToolUse("x", { readTail: fakeReader(line({ type: "user", message: { role: "user", content: "hi" } })) }), false);
});

test("reader throws -> false (fail-soft, never crashes the Stop chain)", () => {
  const thrower = () => { throw new Error("ENOENT"); };
  assert.equal(lastAssistantHadToolUse("x", { readTail: thrower }), false);
});

// ── integration: the storm scenario end-to-end (decision-wait) ──────────────────

test("STORM SCENARIO: text-only re-blocks -> approve x2, NUDGE auto-decide x2, then HALT at 5", () => {
  // Crossroad auto-decide walk: no loop, each turn text-only, stop_hook_active true.
  // 1,2 = below threshold (approve). 3,4 = at threshold within grace -> NUDGE the chat to
  // run the auto-decide protocol (decide+proceed). 5 = grace exhausted -> HALT (fork is
  // genuinely operator-only; the chat is correctly waiting). Never spins to 1e9.
  let count = 0;
  const fire = () => {
    const d = decideBreak({ stopHookActive: true, runningLoop: false, lastTurnHadToolUse: false, priorCount: count, threshold: 3, nudgeGrace: 2 });
    count = d.newCount;
    return d.action;
  };
  assert.equal(fire(), "approve", "re-block 1");
  assert.equal(fire(), "approve", "re-block 2");
  assert.equal(fire(), "nudge", "re-block 3 -> nudge auto-decide");
  assert.equal(fire(), "nudge", "re-block 4 -> nudge auto-decide");
  assert.equal(fire(), "halt", "re-block 5 -> HALT (operator-only, was: spin to 1e9)");
});
