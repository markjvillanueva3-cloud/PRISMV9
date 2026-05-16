#!/usr/bin/env node
/**
 * stress-test-harness.test.mjs — tests for AUTONOMOUS-FLEET-MS0/U-AF-STRESS-HARNESS
 * Run: node --test scripts/stress-test-harness.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  EVENT_TYPES,
  emitEvent,
  readEvents,
  summarize,
  verify,
} from "./stress-test-harness.mjs";

describe("EVENT_TYPES constant", () => {
  test("includes the 8 documented event types", () => {
    const expected = [
      "session_start", "user_prompt", "stop", "pre_compact",
      "handoff_write", "loop_continue_inject", "slot_claim", "slot_drift",
    ];
    for (const t of expected) {
      assert.ok(EVENT_TYPES.includes(t), `missing event type: ${t}`);
    }
  });

  test("EVENT_TYPES is frozen", () => {
    assert.throws(() => { EVENT_TYPES.push("new"); });
  });
});

describe("readEvents", () => {
  test("returns empty array when file missing", () => {
    const events = readEvents("/nope/does/not/exist.jsonl");
    assert.deepEqual(events, []);
  });

  test("tolerates corrupt lines (skip not crash)", () => {
    // Read of a temp file with mixed valid/corrupt lines
    const tmp = `H:/prism/state/shared/__test-corrupt-${Date.now()}.jsonl`;
    try {
      fs.writeFileSync(tmp, `{"ts":"2026-05-16T00:00:00Z","event":"stop","sid":"x"}
NOT_JSON_LINE
{"ts":"2026-05-16T00:01:00Z","event":"session_start","sid":"y"}
`);
      const events = readEvents(tmp);
      assert.equal(events.length, 2);
    } finally {
      try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    }
  });
});

describe("summarize", () => {
  test("counts events by type + by sid", () => {
    const events = [
      { ts: "2026-05-16T00:00:00Z", event: "stop", sid: "a", slot: "alpha" },
      { ts: "2026-05-16T00:00:01Z", event: "stop", sid: "b", slot: "bravo" },
      { ts: "2026-05-16T00:00:02Z", event: "session_start", sid: "a", slot: "alpha" },
    ];
    const s = summarize(events);
    assert.equal(s.total, 3);
    assert.equal(s.byEvent.stop, 2);
    assert.equal(s.byEvent.session_start, 1);
    assert.equal(s.bySid.a.events, 2);
    assert.deepEqual(s.bySid.a.slots, ["alpha"]);
  });

  test("handles empty event array", () => {
    const s = summarize([]);
    assert.equal(s.total, 0);
    assert.deepEqual(s.byEvent, {});
    assert.deepEqual(s.bySid, {});
  });

  test("tracks sid timeline (firstTs / lastTs)", () => {
    const events = [
      { ts: "2026-05-16T00:00:00Z", event: "stop", sid: "a" },
      { ts: "2026-05-16T00:05:00Z", event: "session_start", sid: "a" },
      { ts: "2026-05-16T00:10:00Z", event: "stop", sid: "a" },
    ];
    const s = summarize(events);
    assert.equal(s.bySid.a.firstTs, "2026-05-16T00:00:00Z");
    assert.equal(s.bySid.a.lastTs, "2026-05-16T00:10:00Z");
  });

  test("collects unique slots per sid", () => {
    const events = [
      { ts: "2026-05-16T00:00:00Z", event: "stop", sid: "a", slot: "alpha" },
      { ts: "2026-05-16T00:00:01Z", event: "stop", sid: "a", slot: "alpha" }, // duplicate
      { ts: "2026-05-16T00:00:02Z", event: "stop", sid: "a", slot: "bravo" }, // new
    ];
    const s = summarize(events);
    assert.deepEqual(s.bySid.a.slots.sort(), ["alpha", "bravo"]);
  });
});

describe("verify — invariants", () => {
  test("flags stop without nearby handoff_write", () => {
    const events = [
      { ts: "2026-05-16T00:00:00Z", event: "stop", sid: "a" },
    ];
    const v = verify(events);
    assert.equal(v.ok, false);
    assert.ok(v.violations.some(x => x.rule === "stop_without_handoff_within_10s"));
  });

  test("accepts stop with handoff_write within 10s", () => {
    const events = [
      { ts: "2026-05-16T00:00:00Z", event: "stop", sid: "a" },
      { ts: "2026-05-16T00:00:01Z", event: "handoff_write", sid: "a" },
    ];
    const v = verify(events);
    // Should pass the "stop without handoff" invariant
    const stopViolations = v.violations.filter(x => x.rule === "stop_without_handoff_within_10s");
    assert.equal(stopViolations.length, 0);
  });

  test("flags pre_compact without session_start within 5min", () => {
    const events = [
      { ts: "2026-05-16T00:00:00Z", event: "pre_compact", sid: "a" },
    ];
    const v = verify(events);
    assert.equal(v.ok, false);
    assert.ok(v.violations.some(x => x.rule === "pre_compact_without_session_start_within_5m"));
  });

  test("accepts pre_compact with session_start within 5min", () => {
    const events = [
      { ts: "2026-05-16T00:00:00Z", event: "pre_compact", sid: "a" },
      { ts: "2026-05-16T00:02:00Z", event: "session_start", sid: "a" },
    ];
    const v = verify(events);
    const violations = v.violations.filter(x => x.rule === "pre_compact_without_session_start_within_5m");
    assert.equal(violations.length, 0);
  });

  test("returns ok:true on empty event log", () => {
    const v = verify([]);
    assert.equal(v.ok, true);
    assert.deepEqual(v.violations, []);
  });

  test("handles events with no sid gracefully", () => {
    const events = [
      { ts: "2026-05-16T00:00:00Z", event: "stop", sid: null },
    ];
    const v = verify(events);
    // No-sid events are not checked against per-sid invariants
    assert.ok(Array.isArray(v.violations));
  });
});

describe("emitEvent (integration)", () => {
  test("returns true on successful write", () => {
    // Use a temp log via env-injected path... simpler: just write to default
    // and verify it doesn't throw. Cleanup: best-effort.
    const ok = emitEvent("user_prompt", {
      sid: `test-${Date.now()}`,
      slot: "test",
      branch: "test",
      topic: "test",
      ctx: { test: true },
    });
    assert.equal(ok, true);
  });
});
