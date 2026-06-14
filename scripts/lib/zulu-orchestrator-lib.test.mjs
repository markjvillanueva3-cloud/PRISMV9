// ZULU-ORCHESTRATOR-MS0 / U-ZULU02 — pure-core orchestrator lib tests.
// Hermetic: no I/O, no PS spawn. Injects a fake `decideClearOrCompact`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_STAGGER_MS,
  DEFAULT_COMPACT_WAIT_MS,
  DEFAULT_PRECOMPACT_WAIT_MS,
  DEFAULT_DRY_RUN_GRACE_HOURS,
  DEFAULT_ACTION_COOLDOWN_MS,
  SELF_EXEMPT_SLOTS,
  pickActionableSlots,
  composeSendKeysText,
  staggerAfterLine,
  decideExecutionGate,
  formatLogEntry,
  planSlotAction,
  slotInCooldown,
} from "../../scripts/lib/zulu-orchestrator-lib.mjs";

const T0 = Date.parse("2026-05-20T12:00:00Z");
const T_RECENT = new Date(T0 - 1 * 60 * 60 * 1000).toISOString(); // 1h ago
const T_OLD = new Date(T0 - 48 * 60 * 60 * 1000).toISOString();   // 48h ago

describe("constants", () => {
  it("DEFAULT_STAGGER_MS is ≥ 5000 per safety invariant", () => {
    assert.ok(DEFAULT_STAGGER_MS >= 5000, `got ${DEFAULT_STAGGER_MS}`);
  });
  it("DEFAULT_DRY_RUN_GRACE_HOURS is 24", () => {
    assert.equal(DEFAULT_DRY_RUN_GRACE_HOURS, 24);
  });
  it("SELF_EXEMPT_SLOTS is frozen and contains zulu+golf", () => {
    assert.equal(Object.isFrozen(SELF_EXEMPT_SLOTS), true);
    assert.ok(SELF_EXEMPT_SLOTS.includes("zulu"));
    assert.ok(SELF_EXEMPT_SLOTS.includes("golf"));
  });
});

describe("pickActionableSlots", () => {
  it("returns empty on null/empty doc", () => {
    assert.deepEqual(pickActionableSlots(null), []);
    assert.deepEqual(pickActionableSlots({}), []);
    assert.deepEqual(pickActionableSlots({ slots: null }), []);
    assert.deepEqual(pickActionableSlots({ slots: "nope" }), []);
  });
  it("filters out slots without zuluOptIn", () => {
    const doc = { slots: {
      bravo: { pid: 100 },
      hotel: { pid: 200, zuluOptIn: false },
      delta: { pid: 300, zuluOptIn: true, zuluOptInAt: T_OLD },
    }};
    const out = pickActionableSlots(doc, { now: T0 });
    assert.equal(out.length, 1);
    assert.equal(out[0].slot, "delta");
  });
  it("excludes zulu + golf self-exempt slots", () => {
    const doc = { slots: {
      zulu: { pid: 100, zuluOptIn: true, zuluOptInAt: T_OLD },
      golf:  { pid: 200, zuluOptIn: true, zuluOptInAt: T_OLD },
      bravo: { pid: 300, zuluOptIn: true, zuluOptInAt: T_OLD },
    }};
    const out = pickActionableSlots(doc, { now: T0 });
    assert.deepEqual(out.map(s => s.slot), ["bravo"]);
  });
  it("excludes the chat's own selfSlot", () => {
    const doc = { slots: {
      bravo: { pid: 100, zuluOptIn: true, zuluOptInAt: T_OLD },
      hotel: { pid: 200, zuluOptIn: true, zuluOptInAt: T_OLD },
    }};
    const out = pickActionableSlots(doc, { now: T0, selfSlot: "hotel" });
    assert.deepEqual(out.map(s => s.slot), ["bravo"]);
  });
  it("excludes entries with missing/invalid pid", () => {
    const doc = { slots: {
      bravo: { pid: 0,    zuluOptIn: true },
      hotel: { pid: -1,   zuluOptIn: true },
      delta: { pid: "no", zuluOptIn: true },
      echo:  {            zuluOptIn: true },
      foxtrot: { pid: 100, zuluOptIn: true, zuluOptInAt: T_OLD },
    }};
    const out = pickActionableSlots(doc, { now: T0 });
    assert.deepEqual(out.map(s => s.slot), ["foxtrot"]);
  });
  it("reads entry.pid, not entry.terminalWindowId (GAP#1 regression guard)", () => {
    // Real chat-slots.json schema: terminalWindowId is a "tw-wt-<uuid>" STRING,
    // pid is the numeric PID. A prior bug Number()-d terminalWindowId → NaN →
    // every real slot silently dropped. This guard fails if that regresses.
    const doc = { slots: {
      bravo: { pid: 31480, terminalWindowId: "tw-wt-cd19a7bb-0a07", zuluOptIn: true, zuluOptInAt: T_OLD },
      hotel: { terminalWindowId: "tw-wt-deadbeef-0000", zuluOptIn: true, zuluOptInAt: T_OLD },
    }};
    const out = pickActionableSlots(doc, { now: T0 });
    assert.deepEqual(out.map(s => s.slot), ["bravo"]);
    assert.equal(out[0].pid, 31480);
  });
  it("flags optedInRecently within grace window", () => {
    const doc = { slots: {
      bravo: { pid: 100, zuluOptIn: true, zuluOptInAt: T_RECENT },
      hotel: { pid: 200, zuluOptIn: true, zuluOptInAt: T_OLD },
    }};
    const out = pickActionableSlots(doc, { now: T0 });
    const b = out.find(s => s.slot === "bravo");
    const h = out.find(s => s.slot === "hotel");
    assert.equal(b.optedInRecently, true);
    assert.equal(h.optedInRecently, false);
  });
  it("treats unknown optInAt as recent (conservative)", () => {
    const doc = { slots: {
      bravo: { pid: 100, zuluOptIn: true /* no zuluOptInAt */ },
    }};
    const out = pickActionableSlots(doc, { now: T0 });
    assert.equal(out[0].optedInRecently, true);
  });
  it("honors custom dryRunGraceHours", () => {
    const doc = { slots: {
      bravo: { pid: 100, zuluOptIn: true, zuluOptInAt: T_RECENT },
    }};
    const out = pickActionableSlots(doc, { now: T0, dryRunGraceHours: 0 });
    assert.equal(out[0].optedInRecently, false);
  });
});

describe("composeSendKeysText", () => {
  it("rejects missing decision/slot", () => {
    assert.equal(composeSendKeysText(null, "bravo").ok, false);
    assert.equal(composeSendKeysText({ action: "compact" }, null).ok, false);
  });
  it("returns no-action-needed for noop/advise-only", () => {
    assert.match(
      composeSendKeysText({ action: "noop" }, "bravo").error,
      /no-action-needed:noop/,
    );
    assert.match(
      composeSendKeysText({ action: "advise-only" }, "bravo").error,
      /no-action-needed:advise-only/,
    );
  });
  it("rejects unknown action", () => {
    const out = composeSendKeysText({ action: "weird" }, "bravo");
    assert.equal(out.ok, false);
    assert.match(out.error, /unknown-action:weird/);
  });
  it("composes /precompact + /compact + /checkin-<slot> lines on compact", () => {
    const out = composeSendKeysText({ action: "compact" }, "bravo");
    assert.equal(out.ok, true);
    assert.equal(out.lines[0], "/precompact");
    assert.equal(out.lines[1], "/compact");
    assert.match(out.lines[2], /^\/checkin-bravo /);
    assert.match(out.lines[2], /backend-dev FIRST$/);
  });
  it("composes /precompact + /clear + /checkin-<slot> lines on clear", () => {
    const out = composeSendKeysText({ action: "clear" }, "hotel");
    assert.equal(out.ok, true);
    assert.equal(out.lines[0], "/precompact");
    assert.equal(out.lines[1], "/clear");
    assert.match(out.lines[2], /^\/checkin-hotel /);
  });
  it("EVERY actionable plan leads with /precompact (handoff-before-wipe invariant)", () => {
    // The whole point of the SendKeys sequence: the handoff must be written
    // before /compact summarises or /clear discards the context. A regression
    // that dropped /precompact would silently lose cross-session state.
    for (const action of ["compact", "clear"]) {
      const out = composeSendKeysText({ action }, "bravo");
      assert.equal(out.ok, true, `${action} should compose`);
      assert.equal(out.lines[0], "/precompact", `${action} must lead with /precompact`);
      assert.equal(out.lines.length, 3, `${action} must be a 3-line sequence`);
    }
  });
  it("propagates buildCheckinPayload errors", () => {
    const out = composeSendKeysText({ action: "compact" }, "bra vo");
    assert.equal(out.ok, false);
    assert.match(out.error, /checkin-payload:/);
  });
});

describe("decideExecutionGate", () => {
  const pickRecent = { slot: "bravo", optedInRecently: true };
  const pickMature = { slot: "bravo", optedInRecently: false };
  it("skip when slotPick is null", () => {
    assert.equal(decideExecutionGate(null, {}).gate, "skip");
  });
  it("skip when PRISM_ZULU_DISABLE=1", () => {
    assert.equal(decideExecutionGate(pickMature, { PRISM_ZULU_DISABLE: "1" }).gate, "skip");
  });
  it("dry-run when PRISM_ZULU_DRY_RUN=1", () => {
    assert.equal(decideExecutionGate(pickMature, { PRISM_ZULU_DRY_RUN: "1" }).gate, "dry-run");
  });
  it("dry-run when PRISM_SENDKEYS_DISABLE=1", () => {
    assert.equal(decideExecutionGate(pickMature, { PRISM_SENDKEYS_DISABLE: "1" }).gate, "dry-run");
  });
  it("dry-run during opt-in grace period (recent opt-in)", () => {
    assert.equal(decideExecutionGate(pickRecent, {}).gate, "dry-run");
  });
  it("execute when mature opt-in + no disabling envs", () => {
    assert.equal(decideExecutionGate(pickMature, {}).gate, "execute");
  });
  it("kill-switch precedence — disable beats dry-run beats grace", () => {
    assert.equal(
      decideExecutionGate(pickRecent, {
        PRISM_ZULU_DISABLE: "1",
        PRISM_ZULU_DRY_RUN: "1",
        PRISM_SENDKEYS_DISABLE: "1",
      }).gate,
      "skip",
    );
  });
});

describe("planSlotAction", () => {
  const stubDecide = (state) => {
    if (state.pressureLevel === "clean") return { action: "noop", reason: "clean" };
    if (state.pressureLevel === "warn") return { action: "advise-only", reason: "warn-window" };
    if (state.pressureLevel === "critical") {
      return state.hasActiveLoop || state.hasUncommittedCriticalWork
        ? { action: "compact", reason: "critical-preserve" }
        : { action: "clear", reason: "critical-clean" };
    }
    return { action: "noop", reason: "fallback" };
  };
  const pick = { slot: "bravo", pid: 100, optedInRecently: false };

  it("rejects when slotPick missing", () => {
    assert.equal(planSlotAction(null, { level: "critical" }, { decideClearOrCompact: stubDecide }).ok, false);
  });
  it("rejects when pressure missing", () => {
    const o = planSlotAction(pick, null, { decideClearOrCompact: stubDecide });
    assert.equal(o.ok, false);
    assert.equal(o.error, "missing-pressure");
  });
  it("rejects when decideClearOrCompact not a function", () => {
    const o = planSlotAction(pick, { level: "critical" }, { decideClearOrCompact: null });
    assert.equal(o.ok, false);
    assert.equal(o.error, "missing-decision-fn");
  });
  it("plans compact on critical+loop", () => {
    const o = planSlotAction(pick, { level: "critical", tokens: 950000 }, {
      decideClearOrCompact: stubDecide,
      hasActiveLoop: true,
      env: {},
    });
    assert.equal(o.ok, true);
    assert.equal(o.decision.action, "compact");
    assert.equal(o.plan.ok, true);
    assert.equal(o.plan.lines[0], "/precompact");
    assert.equal(o.plan.lines[1], "/compact");
    assert.equal(o.gate.gate, "execute"); // mature opt-in
  });
  it("plans noop on clean pressure (plan.ok=false with no-action-needed)", () => {
    const o = planSlotAction(pick, { level: "clean", tokens: 100 }, {
      decideClearOrCompact: stubDecide,
      env: {},
    });
    assert.equal(o.ok, true);
    assert.equal(o.decision.action, "noop");
    assert.equal(o.plan.ok, false);
    assert.match(o.plan.error, /no-action-needed:noop/);
  });
  it("surface when decide function throws", () => {
    const o = planSlotAction(pick, { level: "warn" }, {
      decideClearOrCompact: () => { throw new Error("kaboom"); },
    });
    assert.equal(o.ok, false);
    assert.match(o.error, /decide-threw:kaboom/);
  });
  it("kill-switch downgrades gate to skip even with valid plan", () => {
    const o = planSlotAction(pick, { level: "critical" }, {
      decideClearOrCompact: stubDecide,
      hasActiveLoop: true,
      env: { PRISM_ZULU_DISABLE: "1" },
    });
    assert.equal(o.ok, true);
    assert.equal(o.gate.gate, "skip");
  });
  it("G2 — hasUncommittedCriticalWork:false enables the /clear path", () => {
    // critical pressure + no loop + nothing to preserve => stub returns clear.
    const o = planSlotAction(pick, { level: "critical" }, {
      decideClearOrCompact: stubDecide,
      hasActiveLoop: false,
      hasUncommittedCriticalWork: false,
      env: {},
    });
    assert.equal(o.ok, true);
    assert.equal(o.decision.action, "clear");
  });
  it("G2 — explicit hasUncommittedCriticalWork:true forces the /compact path", () => {
    const o = planSlotAction(pick, { level: "critical" }, {
      decideClearOrCompact: stubDecide,
      hasActiveLoop: false,
      hasUncommittedCriticalWork: true,
      env: {},
    });
    assert.equal(o.decision.action, "compact");
  });
  it("G2 — omitting the opt keeps the conservative default (compact, never silent /clear)", () => {
    const o = planSlotAction(pick, { level: "critical" }, {
      decideClearOrCompact: stubDecide,
      hasActiveLoop: false,
      env: {},
    });
    assert.equal(o.decision.action, "compact");
  });
  it("G13 — slotQueueLength > 0 sets hasUnresolvedHandoff=true (queued tribal work is unresolved state)", () => {
    // Capturing stub: asserts the chatState the decider sees, then returns clear so we can read it.
    let seenState = null;
    const captureStub = (state, _opts) => {
      seenState = state;
      return { action: "clear", reason: "stub" };
    };
    planSlotAction(pick, { level: "critical" }, {
      decideClearOrCompact: captureStub,
      hasActiveLoop: false,
      hasHandoff: false,
      slotQueueLength: 5,
      env: {},
    });
    assert.ok(seenState, "decider must be invoked");
    assert.equal(seenState.hasUnresolvedHandoff, true);
  });
  it("G13 — slotQueueLength=0 + hasHandoff=false → hasUnresolvedHandoff=false", () => {
    let seenState = null;
    const captureStub = (state, _opts) => {
      seenState = state;
      return { action: "clear", reason: "stub" };
    };
    planSlotAction(pick, { level: "critical" }, {
      decideClearOrCompact: captureStub,
      hasActiveLoop: false,
      hasHandoff: false,
      slotQueueLength: 0,
      env: {},
    });
    assert.equal(seenState.hasUnresolvedHandoff, false);
  });
  it("G13 — slotQueueLength missing + hasHandoff=true → hasUnresolvedHandoff=true (back-compat)", () => {
    let seenState = null;
    const captureStub = (state, _opts) => {
      seenState = state;
      return { action: "clear", reason: "stub" };
    };
    planSlotAction(pick, { level: "critical" }, {
      decideClearOrCompact: captureStub,
      hasActiveLoop: false,
      hasHandoff: true,
      // slotQueueLength intentionally omitted
      env: {},
    });
    assert.equal(seenState.hasUnresolvedHandoff, true);
  });
  it("U-ZPSN01 — forwards slotAwareness fingerprint as PSN-aware extraHint into /checkin line", () => {
    // Real-shape fingerprint matching the zulu-awareness-pipeline output.
    const fp = {
      ok: true,
      slot: "bravo",
      hermesRole: "mill-specialist",
      domains: ["mill", "milling"],
      refuseList: [],
      queueLength: 4,
      tribalDomainScores: { mill: 9, lathe: 2 },
      vizNodeCount: 35,
      successRate: 0.8,
      successSampleSize: 5,
    };
    const o = planSlotAction(pick, { level: "critical", tokens: 950000 }, {
      decideClearOrCompact: () => ({ action: "compact", reason: "stub" }),
      hasActiveLoop: false,
      hasHandoff: false,
      env: {},
      slotAwareness: fp,
    });
    assert.equal(o.ok, true);
    assert.equal(o.plan.ok, true);
    // Plan is 3-line: /precompact, /compact, /checkin-bravo ... [psn:...]
    assert.equal(o.plan.lines.length, 3);
    const checkinLine = o.plan.lines[2];
    assert.ok(checkinLine.startsWith("/checkin-bravo "), `unexpected: ${checkinLine}`);
    assert.ok(
      checkinLine.endsWith("[psn:domain=mill,role=mill-specialist,queue=4,tribal=mill]"),
      `expected psn hint suffix, got: ${checkinLine}`,
    );
  });
  it("U-ZPSN01 — backward compat: omitted slotAwareness yields no psn hint", () => {
    const o = planSlotAction(pick, { level: "critical", tokens: 950000 }, {
      decideClearOrCompact: () => ({ action: "compact", reason: "stub" }),
      hasActiveLoop: false,
      hasHandoff: false,
      env: {},
      // slotAwareness intentionally omitted — pre-MS3 callers
    });
    assert.equal(o.ok, true);
    const checkinLine = o.plan.lines[2];
    assert.ok(!checkinLine.includes("[psn:"), `expected NO psn hint, got: ${checkinLine}`);
  });
  it("U-ZPSN01 — null/empty fingerprint yields no psn hint (fail-soft)", () => {
    const o = planSlotAction(pick, { level: "critical", tokens: 950000 }, {
      decideClearOrCompact: () => ({ action: "compact", reason: "stub" }),
      hasActiveLoop: false,
      hasHandoff: false,
      env: {},
      slotAwareness: null,
    });
    assert.equal(o.ok, true);
    const checkinLine = o.plan.lines[2];
    assert.ok(!checkinLine.includes("[psn:"), `expected NO psn hint, got: ${checkinLine}`);
  });
  it("U-ZM1-03 — accepts CHO02's pressureLevel/tokensEstimate shape (live reader output)", () => {
    // readChatPressure returns {pressureLevel, tokensEstimate, ...} — the lib
    // must read those fields, not just the test-only {level, tokens} shape, or
    // every live sweep gets "missing-pressure" (smoke-caught 2026-05-22).
    let seenState = null;
    const captureStub = (state) => {
      seenState = state;
      return { action: "compact", reason: "stub" };
    };
    const cho02Pressure = {
      sessionId: "claude-71caa41a", slot: "bravo",
      pressureLevel: "critical", tokensEstimate: 950000,
      totalBytes: 3325000, postCompactBytes: 3325000, lastCompactOffset: 0, found: false,
    };
    const o = planSlotAction(pick, cho02Pressure, {
      decideClearOrCompact: captureStub,
      hasActiveLoop: true,
      env: {},
    });
    assert.equal(o.ok, true, "must not return missing-pressure for the CHO02 shape");
    assert.equal(o.decision.action, "compact");
    assert.equal(seenState.pressureLevel, "critical", "field-name mismatch is the bug this guards");
    assert.equal(seenState.tokensEstimate, 950000);
  });
});

describe("formatLogEntry", () => {
  const pick = { slot: "bravo", pid: 12345 };
  const dec = { action: "compact", reason: "critical-loop" };
  const plan = { ok: true, lines: ["/precompact", "/compact", "/checkin-bravo ..."] };
  const gate = { gate: "execute", reason: "live" };

  it("emits parsable JSON with all keys", () => {
    const line = formatLogEntry(pick, dec, plan, gate, { ok: true, dryRun: false, hwnd: 42, chars: 16 }, T0);
    const parsed = JSON.parse(line);
    assert.equal(parsed.slot, "bravo");
    assert.equal(parsed.pid, 12345);
    assert.equal(parsed.decision, "compact");
    assert.equal(parsed.gate, "execute");
    assert.equal(parsed.resultOk, true);
    assert.equal(parsed.resultHwnd, 42);
    assert.equal(parsed.resultChars, 16);
    assert.deepEqual(parsed.planLines, ["/precompact", "/compact", "/checkin-bravo ..."]);
    assert.match(parsed.ts, /^2026-05-20T/);
  });
  it("survives missing/null fields (R12 fail-loud, never throws)", () => {
    const line = formatLogEntry(null, null, null, null, null);
    const parsed = JSON.parse(line);
    assert.equal(parsed.slot, "unknown");
    assert.equal(parsed.decision, "unknown");
    assert.equal(parsed.gate, "skip");
    assert.equal(parsed.resultOk, false);
  });
});

describe("slotInCooldown (G8)", () => {
  const T = (msAgo) => new Date(T0 - msAgo).toISOString();
  // a successfully-executed action log line for slot bravo
  const execLine = (o) => JSON.stringify({ slot: "bravo", gate: "execute", resultOk: true, ...o });

  it("DEFAULT_ACTION_COOLDOWN_MS is 15 minutes", () => {
    assert.equal(DEFAULT_ACTION_COOLDOWN_MS, 15 * 60 * 1000);
  });
  it("not in cooldown on empty/invalid input", () => {
    assert.equal(slotInCooldown(null, "bravo", { now: T0 }).cooldown, false);
    assert.equal(slotInCooldown([], "bravo", { now: T0 }).cooldown, false);
    assert.equal(slotInCooldown(["{}"], "", { now: T0 }).cooldown, false);
  });
  it("not in cooldown when no log entry matches the slot", () => {
    const lines = [execLine({ slot: "hotel", ts: T(1000) })];
    assert.equal(slotInCooldown(lines, "bravo", { now: T0 }).cooldown, false);
  });
  it("in cooldown after a recent executed action", () => {
    const r = slotInCooldown([execLine({ ts: T(60 * 1000) })], "bravo", { now: T0 });
    assert.equal(r.cooldown, true);
    assert.equal(r.sinceMs, 60 * 1000);
  });
  it("not in cooldown once the action is older than the window", () => {
    const lines = [execLine({ ts: T(20 * 60 * 1000) })];
    assert.equal(slotInCooldown(lines, "bravo", { now: T0 }).cooldown, false);
  });
  it("dry-run actions do NOT start a cooldown", () => {
    const lines = [JSON.stringify({ slot: "bravo", gate: "dry-run", resultOk: true, ts: T(1000) })];
    assert.equal(slotInCooldown(lines, "bravo", { now: T0 }).cooldown, false);
  });
  it("failed executes (resultOk=false) do NOT start a cooldown", () => {
    const lines = [JSON.stringify({ slot: "bravo", gate: "execute", resultOk: false, ts: T(1000) })];
    assert.equal(slotInCooldown(lines, "bravo", { now: T0 }).cooldown, false);
  });
  it("skips malformed JSON lines, still finds the real action", () => {
    const lines = ["{not json", "", execLine({ ts: T(60 * 1000) })];
    assert.equal(slotInCooldown(lines, "bravo", { now: T0 }).cooldown, true);
  });
  it("uses the most recent matching action", () => {
    const lines = [execLine({ ts: T(20 * 60 * 1000) }), execLine({ ts: T(2 * 60 * 1000) })];
    const r = slotInCooldown(lines, "bravo", { now: T0 });
    assert.equal(r.cooldown, true);
    assert.equal(r.sinceMs, 2 * 60 * 1000);
  });
  it("honors a custom cooldownMs", () => {
    const lines = [execLine({ ts: T(60 * 1000) })]; // 1 min ago
    assert.equal(slotInCooldown(lines, "bravo", { now: T0, cooldownMs: 30 * 1000 }).cooldown, false);
    assert.equal(slotInCooldown(lines, "bravo", { now: T0, cooldownMs: 120 * 1000 }).cooldown, true);
  });
});

describe("staggerAfterLine (G3)", () => {
  it("DEFAULT_COMPACT_WAIT_MS is generously longer than the normal stagger", () => {
    assert.ok(DEFAULT_COMPACT_WAIT_MS > DEFAULT_STAGGER_MS, `${DEFAULT_COMPACT_WAIT_MS} !> ${DEFAULT_STAGGER_MS}`);
    assert.ok(DEFAULT_COMPACT_WAIT_MS >= 60000, "must cover a 60s+ /compact");
  });
  it("a /compact line gets the long compact wait", () => {
    assert.equal(staggerAfterLine("/compact"), DEFAULT_COMPACT_WAIT_MS);
  });
  it("a /compact line with trailing args still gets the compact wait", () => {
    assert.equal(staggerAfterLine("/compact focus on the tests"), DEFAULT_COMPACT_WAIT_MS);
  });
  it("is case- and whitespace-insensitive on the /compact token", () => {
    assert.equal(staggerAfterLine("  /COMPACT  "), DEFAULT_COMPACT_WAIT_MS);
  });
  it("/clear gets the normal stagger, not the compact wait", () => {
    assert.equal(staggerAfterLine("/clear"), DEFAULT_STAGGER_MS);
  });
  it("a /checkin line gets the normal stagger", () => {
    assert.equal(staggerAfterLine("/checkin-bravo do work"), DEFAULT_STAGGER_MS);
  });
  it("non-string / empty line falls back to the normal stagger", () => {
    assert.equal(staggerAfterLine(null), DEFAULT_STAGGER_MS);
    assert.equal(staggerAfterLine(""), DEFAULT_STAGGER_MS);
  });
  it("honors opts.compactWaitMs and opts.staggerMs overrides", () => {
    assert.equal(staggerAfterLine("/compact", { compactWaitMs: 120000 }), 120000);
    assert.equal(staggerAfterLine("/clear", { staggerMs: 7000 }), 7000);
  });
  it("ignores a negative / non-finite override, using the default", () => {
    assert.equal(staggerAfterLine("/compact", { compactWaitMs: -1 }), DEFAULT_COMPACT_WAIT_MS);
    assert.equal(staggerAfterLine("/clear", { staggerMs: NaN }), DEFAULT_STAGGER_MS);
  });
  it("a non-leading 'compact' substring does NOT trigger the long wait", () => {
    assert.equal(staggerAfterLine("/checkin-bravo run compact tests"), DEFAULT_STAGGER_MS);
  });
  it("waits the long precompact window after /precompact (model authors handoff)", () => {
    assert.equal(staggerAfterLine("/precompact"), DEFAULT_PRECOMPACT_WAIT_MS);
    assert.notEqual(staggerAfterLine("/precompact"), DEFAULT_STAGGER_MS);
  });
  it("honors a precompactWaitMs override and ignores a non-finite one", () => {
    assert.equal(staggerAfterLine("/precompact", { precompactWaitMs: 1234 }), 1234);
    assert.equal(staggerAfterLine("/precompact", { precompactWaitMs: -1 }), DEFAULT_PRECOMPACT_WAIT_MS);
  });
});
