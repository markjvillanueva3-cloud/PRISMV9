/**
 * chat-orchestrator-decisions.test.mjs — exhaustive coverage of the two
 * pure decision functions + helpers in chat-orchestrator-decisions.mjs.
 *
 * Node:test (not vitest — the .claude/ vitest config has a known
 * transform bug; node:test runs clean and the broader fleet suite uses it).
 *
 * KEY GUARDS — these tests fail-on-revert when:
 *   * a future edit makes critical-pressure recommend "noop"
 *   * a future edit forgets that hasUncommittedCriticalWork should preserve
 *   * a future edit collapses the recency-30s respawn-race window
 *   * a future edit allows "respawn" without a pin (silent unrecoverable)
 *   * SAFE_ACTIONS or REACHING_ACTIONS membership shifts unexpectedly
 *
 * Run: node --test H:/prism/scripts/lib/chat-orchestrator-decisions.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  decideClearOrCompact,
  decideRestartAction,
  normalisePressureLevel,
  SAFE_ACTIONS,
  REACHING_ACTIONS,
} from "./chat-orchestrator-decisions.mjs";

// ─── decideClearOrCompact: pressure-level dispatch ──────────────────────────

test("decideClearOrCompact: pressure clean → noop", () => {
  const r = decideClearOrCompact({ pressureLevel: "clean", hasActiveLoop: false, hasUncommittedCriticalWork: false, hasUnresolvedHandoff: false });
  assert.equal(r.action, "noop");
  assert.equal(r.reason, "pressure-clean");
});

test("decideClearOrCompact: pressure warn → advise-only (no action)", () => {
  const r = decideClearOrCompact({ pressureLevel: "warn", hasActiveLoop: false, hasUncommittedCriticalWork: false, hasUnresolvedHandoff: false });
  assert.equal(r.action, "advise-only");
  assert.equal(r.reason, "pressure-warn-early-signal");
});

test("decideClearOrCompact: critical + active loop → compact (preserve)", () => {
  const r = decideClearOrCompact({ pressureLevel: "critical", hasActiveLoop: true, hasUncommittedCriticalWork: false, hasUnresolvedHandoff: false });
  assert.equal(r.action, "compact", "critical + loop must preserve continuity");
  assert.match(r.reason, /active-loop/);
});

test("decideClearOrCompact: critical + uncommitted critical work → compact", () => {
  const r = decideClearOrCompact({ pressureLevel: "critical", hasActiveLoop: false, hasUncommittedCriticalWork: true, hasUnresolvedHandoff: false });
  assert.equal(r.action, "compact");
  assert.match(r.reason, /uncommitted/);
});

test("decideClearOrCompact: critical + unresolved handoff → compact", () => {
  const r = decideClearOrCompact({ pressureLevel: "critical", hasActiveLoop: false, hasUncommittedCriticalWork: false, hasUnresolvedHandoff: true });
  assert.equal(r.action, "compact");
  assert.match(r.reason, /handoff/);
});

test("decideClearOrCompact: critical + clean state → clear (cheap reset)", () => {
  const r = decideClearOrCompact({ pressureLevel: "critical", hasActiveLoop: false, hasUncommittedCriticalWork: false, hasUnresolvedHandoff: false });
  assert.equal(r.action, "clear", "critical with zero continuity flags → clear is cheaper");
  assert.match(r.reason, /clean-state/);
});

test("decideClearOrCompact: critical + ALL continuity flags → compact (loop wins precedence)", () => {
  const r = decideClearOrCompact({ pressureLevel: "critical", hasActiveLoop: true, hasUncommittedCriticalWork: true, hasUnresolvedHandoff: true });
  assert.equal(r.action, "compact");
  // Loop is checked first in the decision tree — preserves the most important continuity.
  assert.match(r.reason, /active-loop/);
});

// ─── decideClearOrCompact: fail-safe defaults ───────────────────────────────

test("decideClearOrCompact: null state → advise-only fail-safe", () => {
  const r = decideClearOrCompact(null);
  assert.equal(r.action, "advise-only");
  assert.match(r.reason, /missing/);
});

test("decideClearOrCompact: missing pressureLevel → advise-only", () => {
  const r = decideClearOrCompact({});
  assert.equal(r.action, "advise-only");
  assert.match(r.reason, /unknown-pressure/);
});

test("decideClearOrCompact: unrecognized pressureLevel → advise-only", () => {
  const r = decideClearOrCompact({ pressureLevel: "DEGRADED" });
  assert.equal(r.action, "advise-only");
  assert.match(r.reason, /unknown-pressure-level:DEGRADED/);
});

test("decideClearOrCompact: non-boolean continuity flags are truthy-coerced safely", () => {
  // hasActiveLoop is checked === true so anything non-true (including
  // truthy non-boolean) doesn't trigger the loop branch.
  const r = decideClearOrCompact({ pressureLevel: "critical", hasActiveLoop: 1, hasUncommittedCriticalWork: "yes", hasUnresolvedHandoff: false });
  assert.equal(r.action, "clear",
    "strict-equality guard: truthy-non-true falls through to clean-state branch");
});

// ─── decideRestartAction: status dispatch ───────────────────────────────────

test("decideRestartAction: alive + claudePid alive → skip-alive", () => {
  const r = decideRestartAction({ status: "alive", claudePidAlive: true, ageMs: 1000, terminalWindowAlive: true, hasPin: true });
  assert.equal(r.action, "skip-alive");
});

test("decideRestartAction: alive + claudePid dead + recent claim → skip-still-claim (race window)", () => {
  // Within 30s of claim, claude.exe might not have started yet.
  const r = decideRestartAction({ status: "alive", claudePidAlive: false, ageMs: 15000, terminalWindowAlive: true, hasPin: true });
  assert.equal(r.action, "skip-still-claim", "30s claim-recency window protects races");
});

test("decideRestartAction: alive + claudePid dead + OLD claim → falls past skip-still-claim", () => {
  // > 30s = no longer claim-race; falls through to status-mismatch unknown.
  const r = decideRestartAction({ status: "alive", claudePidAlive: false, ageMs: 60000, terminalWindowAlive: true, hasPin: true });
  assert.equal(r.action, "skip-unknown",
    "status=alive but claude dead and past race window — operator must investigate");
});

test("decideRestartAction: crashed + window alive + pin present → respawn", () => {
  const r = decideRestartAction({ status: "crashed", claudePidAlive: false, ageMs: 999999, terminalWindowAlive: true, hasPin: true });
  assert.equal(r.action, "respawn", "the only path that actually restarts");
  assert.match(r.reason, /window-alive-pin-present/);
});

test("decideRestartAction: crashed + window DEAD → skip-unrecoverable", () => {
  const r = decideRestartAction({ status: "crashed", claudePidAlive: false, ageMs: 999999, terminalWindowAlive: false, hasPin: true });
  assert.equal(r.action, "skip-unrecoverable",
    "if the PowerShell window is gone, golf has nowhere to respawn into");
  assert.match(r.reason, /ps-window-dead/);
});

test("decideRestartAction: crashed + no pin → skip-unrecoverable", () => {
  const r = decideRestartAction({ status: "crashed", claudePidAlive: false, ageMs: 999999, terminalWindowAlive: true, hasPin: false });
  assert.equal(r.action, "skip-unrecoverable",
    "no pin means golf doesn't know WHICH window to target");
  assert.match(r.reason, /no-pin/);
});

test("decideRestartAction: unknown status → skip-unknown", () => {
  const r = decideRestartAction({ status: "weird", claudePidAlive: false, ageMs: 0, terminalWindowAlive: true, hasPin: true });
  assert.equal(r.action, "skip-unknown");
});

test("decideRestartAction: null state → skip-unknown fail-safe", () => {
  const r = decideRestartAction(null);
  assert.equal(r.action, "skip-unknown");
  assert.match(r.reason, /missing/);
});

test("decideRestartAction: missing ageMs → treated as Infinity (past race window)", () => {
  const r = decideRestartAction({ status: "alive", claudePidAlive: false, terminalWindowAlive: true, hasPin: true });
  assert.equal(r.action, "skip-unknown",
    "missing ageMs is Infinity → not within 30s race → falls through");
});

// ─── Helpers ────────────────────────────────────────────────────────────────

test("normalisePressureLevel: known values pass through", () => {
  assert.equal(normalisePressureLevel("clean"), "clean");
  assert.equal(normalisePressureLevel("warn"), "warn");
  assert.equal(normalisePressureLevel("critical"), "critical");
});

test("normalisePressureLevel: unknown/null/undefined → null", () => {
  assert.equal(normalisePressureLevel("ok"), null);
  assert.equal(normalisePressureLevel(""), null);
  assert.equal(normalisePressureLevel(null), null);
  assert.equal(normalisePressureLevel(undefined), null);
});

test("SAFE_ACTIONS / REACHING_ACTIONS: membership invariants", () => {
  // SAFE_ACTIONS are the ones that DON'T touch external chats — every
  // skip-* + noop + advise-only.
  for (const a of ["noop", "advise-only", "skip-alive", "skip-still-claim", "skip-unrecoverable", "skip-unknown"]) {
    assert.ok(SAFE_ACTIONS.has(a), `${a} must be SAFE (no external effect)`);
    assert.ok(!REACHING_ACTIONS.has(a), `${a} must NOT be in REACHING_ACTIONS`);
  }
  // REACHING_ACTIONS touch a target chat — golf cannot do these without
  // an authorisation gate (advisory-injection hook OR explicit UI Automation).
  for (const a of ["clear", "compact", "respawn"]) {
    assert.ok(REACHING_ACTIONS.has(a), `${a} must be in REACHING_ACTIONS`);
    assert.ok(!SAFE_ACTIONS.has(a), `${a} must NOT be in SAFE_ACTIONS`);
  }
  // Disjoint sets — no action can be both.
  for (const a of SAFE_ACTIONS) {
    assert.ok(!REACHING_ACTIONS.has(a), `${a} cannot be both safe and reaching`);
  }
});

// ─── Boundary integration: every decideClearOrCompact action ∈ SAFE ∪ REACHING

test("INVARIANT: every decideClearOrCompact action is classified in SAFE_ACTIONS ∪ REACHING_ACTIONS", () => {
  const seen = new Set();
  for (const pressure of ["clean", "warn", "critical", "unknown"]) {
    for (const loop of [true, false]) {
      for (const uncommitted of [true, false]) {
        for (const handoff of [true, false]) {
          const { action } = decideClearOrCompact({
            pressureLevel: pressure, hasActiveLoop: loop,
            hasUncommittedCriticalWork: uncommitted, hasUnresolvedHandoff: handoff,
          });
          seen.add(action);
          assert.ok(SAFE_ACTIONS.has(action) || REACHING_ACTIONS.has(action),
            `action "${action}" must be classified in one of the two sets`);
        }
      }
    }
  }
  // Sanity: we exercised at least 3 distinct actions (noop, advise-only, compact, clear).
  assert.ok(seen.size >= 3, `expected ≥3 distinct actions across the matrix, saw ${seen.size}: ${[...seen].join(",")}`);
});

test("INVARIANT: every decideRestartAction action is classified in SAFE_ACTIONS ∪ REACHING_ACTIONS", () => {
  const seen = new Set();
  for (const status of ["alive", "crashed", "stale", "unknown"]) {
    for (const claudeAlive of [true, false]) {
      for (const winAlive of [true, false]) {
        for (const pin of [true, false]) {
          for (const ageMs of [1000, 60000]) {
            const { action } = decideRestartAction({
              status, claudePidAlive: claudeAlive, ageMs,
              terminalWindowAlive: winAlive, hasPin: pin,
            });
            seen.add(action);
            assert.ok(SAFE_ACTIONS.has(action) || REACHING_ACTIONS.has(action),
              `action "${action}" must be classified`);
          }
        }
      }
    }
  }
  assert.ok(seen.size >= 3, `expected ≥3 distinct actions, saw ${seen.size}: ${[...seen].join(",")}`);
});
