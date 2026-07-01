// scripts/lib/blueprint-accuracy-consumer-lib.test.mjs
// Tests for the BLUEPRINT-OCR-TRAINING-MS2/U-BPA-CONSUMER pure core.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseEventLine,
  parseEventsBlob,
  clampWindowCap,
  migrateState,
  applyEvents,
  buildConsolidationSummary,
  advanceOffset,
  DEFAULT_WINDOW_CAP,
  MIN_WINDOW_CAP,
  MAX_WINDOW_CAP,
  DEFAULT_CONSOLIDATE_THRESHOLD,
  STATE_SCHEMA_VERSION,
  KNOWN_EVENT_TYPES,
  EVENT_TO_XPROC_ACTION,
  EVENT_TYPE_ALIASES,
  resolveEventType,
  HOOK_STATE_FILENAME,
  CONSUMER_STATE_FILENAME,
} from "./blueprint-accuracy-consumer-lib.mjs";

// ── parseEventLine ─────────────────────────────────────────────────

test("parseEventLine: returns null for non-string", () => {
  assert.equal(parseEventLine(null), null);
  assert.equal(parseEventLine(undefined), null);
  assert.equal(parseEventLine(123), null);
  assert.equal(parseEventLine({}), null);
});

test("parseEventLine: returns null for empty/whitespace", () => {
  assert.equal(parseEventLine(""), null);
  assert.equal(parseEventLine("   "), null);
  assert.equal(parseEventLine("\n\t"), null);
});

test("parseEventLine: returns null for malformed JSON", () => {
  assert.equal(parseEventLine("{not json"), null);
  assert.equal(parseEventLine("[1,2,3"), null);
});

test("parseEventLine: returns null for non-object JSON", () => {
  assert.equal(parseEventLine("[1,2,3]"), null); // array, not object
  assert.equal(parseEventLine('"string"'), null);
  assert.equal(parseEventLine("42"), null);
  assert.equal(parseEventLine("null"), null);
});

test("parseEventLine: returns null when type field missing", () => {
  assert.equal(parseEventLine('{"foo": "bar"}'), null);
  assert.equal(parseEventLine('{"type": 42}'), null); // type must be string
});

test("parseEventLine: returns event object on valid input", () => {
  const e = parseEventLine('{"type": "outcome_record", "ts": "2026-05-18T00:00:00Z", "payload": {"x": 1}}');
  assert.equal(e?.type, "outcome_record");
  assert.equal(e?.ts, "2026-05-18T00:00:00Z");
  assert.deepEqual(e?.payload, { x: 1 });
});

// ── parseEventsBlob ────────────────────────────────────────────────

test("parseEventsBlob: empty/null returns zero counts", () => {
  assert.deepEqual(parseEventsBlob(""), { events: [], malformedCount: 0, totalLines: 0 });
  assert.deepEqual(parseEventsBlob(null), { events: [], malformedCount: 0, totalLines: 0 });
});

test("parseEventsBlob: counts malformed lines but doesn't drop valid ones", () => {
  const blob = [
    '{"type":"outcome_record"}',
    "not json",
    '{"type":"drift_observation"}',
    '{"missing_type":true}',
    "",
    '{"type":"replay_add"}',
  ].join("\n");
  const r = parseEventsBlob(blob);
  assert.equal(r.events.length, 3);
  assert.equal(r.malformedCount, 2);
  assert.equal(r.totalLines, 5); // 5 non-blank lines
});

test("parseEventsBlob: handles CRLF line endings (Windows)", () => {
  const blob = '{"type":"outcome_record"}\r\n{"type":"drift_observation"}\r\n';
  const r = parseEventsBlob(blob);
  assert.equal(r.events.length, 2);
  assert.equal(r.malformedCount, 0);
});

// ── clampWindowCap ─────────────────────────────────────────────────

test("clampWindowCap: clamps low/high values", () => {
  assert.equal(clampWindowCap(0), DEFAULT_WINDOW_CAP);
  assert.equal(clampWindowCap(-10), DEFAULT_WINDOW_CAP);
  assert.equal(clampWindowCap(1), MIN_WINDOW_CAP);
  assert.equal(clampWindowCap(999999), MAX_WINDOW_CAP);
});

test("clampWindowCap: non-finite falls back to default", () => {
  assert.equal(clampWindowCap(NaN), DEFAULT_WINDOW_CAP);
  // Infinity is non-finite — falls into the same default branch as NaN, NOT a max clamp.
  // This is the correct behavior: non-finite input has no defensible cap, so we use
  // the documented default rather than silently substituting MAX (R12 fail-soft).
  assert.equal(clampWindowCap(Infinity), DEFAULT_WINDOW_CAP);
  assert.equal(clampWindowCap(-Infinity), DEFAULT_WINDOW_CAP);
  assert.equal(clampWindowCap(null), DEFAULT_WINDOW_CAP);
  assert.equal(clampWindowCap(undefined), DEFAULT_WINDOW_CAP);
});

test("clampWindowCap: valid in-range integer passes through", () => {
  assert.equal(clampWindowCap(100), 100);
});

// ── migrateState ───────────────────────────────────────────────────

test("migrateState: null/undefined input yields v2 defaults", () => {
  const s = migrateState(null);
  assert.equal(s.schemaVersion, STATE_SCHEMA_VERSION);
  assert.deepEqual(s.window, []);
  assert.equal(s.outcomesSinceConsolidate, 0);
  assert.equal(s.lastConsolidatedAt, null);
  assert.equal(s.lastProcessedOffset, 0);
  for (const t of KNOWN_EVENT_TYPES) {
    assert.equal(s.eventCounts[t], 0);
  }
  assert.equal(s.eventCounts.unknown, 0);
});

test("migrateState: v1 schema (window:[], outcomesSinceConsolidate:0, lastConsolidatedAt:null) lifts to v2", () => {
  const v1 = { schemaVersion: 1, window: [], outcomesSinceConsolidate: 0, lastConsolidatedAt: null };
  const s = migrateState(v1);
  assert.equal(s.schemaVersion, STATE_SCHEMA_VERSION);
  assert.equal(s.lastProcessedOffset, 0);
  assert.ok("eventCounts" in s);
});

test("migrateState: rejects non-array window, negative offset, NaN counter", () => {
  const corrupt = {
    window: "not an array",
    outcomesSinceConsolidate: -5,
    lastConsolidatedAt: 42,
    lastProcessedOffset: NaN,
    eventCounts: "bad",
  };
  const s = migrateState(corrupt);
  assert.deepEqual(s.window, []);
  assert.equal(s.outcomesSinceConsolidate, 0);
  assert.equal(s.lastConsolidatedAt, null);
  assert.equal(s.lastProcessedOffset, 0);
});

test("migrateState: does not mutate input", () => {
  const input = { window: [{ type: "outcome_record" }], outcomesSinceConsolidate: 3 };
  const s = migrateState(input);
  s.window.push({ type: "drift_observation" });
  s.outcomesSinceConsolidate = 99;
  assert.equal(input.window.length, 1);
  assert.equal(input.outcomesSinceConsolidate, 3);
});

// ── applyEvents ────────────────────────────────────────────────────

test("applyEvents: empty events list is a no-op", () => {
  const { state, actions, summary } = applyEvents({}, []);
  assert.equal(actions.length, 0);
  assert.equal(summary.processedCount, 0);
  assert.equal(state.window.length, 0);
});

test("applyEvents: appends every known event to window + emits one xproc action each", () => {
  const events = [
    { type: "drift_observation", ts: "2026-05-18T01:00:00Z", payload: { sample: 1 } },
    { type: "replay_add", ts: "2026-05-18T01:00:01Z", payload: { priority: 0.5 } },
    { type: "outcome_record", ts: "2026-05-18T01:00:02Z", payload: { accurate: true } },
  ];
  const { state, actions, summary } = applyEvents(null, events);
  assert.equal(state.window.length, 3);
  assert.equal(actions.length, 3);
  assert.equal(actions[0].xproc_action, EVENT_TO_XPROC_ACTION.drift_observation);
  assert.equal(actions[1].xproc_action, EVENT_TO_XPROC_ACTION.replay_add);
  assert.equal(actions[2].xproc_action, EVENT_TO_XPROC_ACTION.outcome_record);
  assert.equal(summary.processedCount, 3);
});

test("applyEvents: window FIFO-bounded at cap with droppedFromWindow count", () => {
  const events = Array.from({ length: 10 }, (_, i) => ({
    type: "drift_observation",
    ts: `2026-05-18T01:00:0${i}Z`,
    payload: { i },
  }));
  const { state, summary } = applyEvents(null, events, { windowCap: 5 });
  assert.equal(state.window.length, 5);
  // FIFO: first 5 dropped, last 5 kept
  assert.equal(state.window[0].payload.i, 5);
  assert.equal(state.window[4].payload.i, 9);
  assert.equal(summary.droppedFromWindow, 5);
});

test("applyEvents: outcome_record increments outcomesSinceConsolidate", () => {
  const events = [
    { type: "outcome_record", ts: "2026-05-18T01:00:00Z" },
    { type: "outcome_record", ts: "2026-05-18T01:00:01Z" },
    { type: "drift_observation", ts: "2026-05-18T01:00:02Z" }, // does NOT bump
  ];
  const { state } = applyEvents(null, events, { consolidateThreshold: 99 });
  assert.equal(state.outcomesSinceConsolidate, 2);
});

test("applyEvents: ewc_consolidate event resets outcomesSinceConsolidate + sets lastConsolidatedAt", () => {
  const prior = { window: [], outcomesSinceConsolidate: 10, lastConsolidatedAt: null };
  const events = [{ type: "ewc_consolidate", ts: "2026-05-18T02:00:00Z" }];
  const { state, summary } = applyEvents(prior, events);
  assert.equal(state.outcomesSinceConsolidate, 0);
  assert.equal(state.lastConsolidatedAt, "2026-05-18T02:00:00Z");
  assert.ok(summary.consolidationTriggeredByEvent);
});

test("applyEvents: threshold-crossing emits implicit ewc_consolidate action (R12 surface, no silent miss)", () => {
  const events = Array.from({ length: 25 }, (_, i) => ({
    type: "outcome_record",
    ts: `2026-05-18T01:0${(i / 60) | 0}:${(i % 60).toString().padStart(2, "0")}Z`,
  }));
  const { state, actions, summary } = applyEvents(null, events, { consolidateThreshold: 25 });
  // 25 outcome_record actions + 1 implicit ewc_consolidate = 26
  assert.equal(actions.length, 26);
  assert.equal(actions[25].event_type, "ewc_consolidate");
  assert.equal(actions[25].payload.reason, "threshold");
  assert.ok(summary.consolidationTriggeredByThreshold);
  // Counter NOT reset by default (round-trip via the dispatched action is canonical)
  assert.equal(state.outcomesSinceConsolidate, 25);
});

test("applyEvents: resetOnThreshold=true short-circuits the round-trip and resets counter", () => {
  const events = Array.from({ length: 25 }, () => ({ type: "outcome_record" }));
  const now = () => "2026-05-18T03:00:00Z";
  const { state } = applyEvents(null, events, { consolidateThreshold: 25, resetOnThreshold: true, now });
  assert.equal(state.outcomesSinceConsolidate, 0);
  assert.equal(state.lastConsolidatedAt, "2026-05-18T03:00:00Z");
});

test("applyEvents: unknown event types go to eventCounts.unknown bucket but don't emit action or hit window", () => {
  const events = [
    { type: "garbage_type", payload: { hostile: "input" } },
    { type: "another_unknown" },
    { type: "outcome_record" },
  ];
  const { state, actions } = applyEvents(null, events);
  assert.equal(state.eventCounts.unknown, 2);
  assert.equal(state.eventCounts.outcome_record, 1);
  assert.equal(state.window.length, 1); // only the known one
  assert.equal(actions.length, 1); // only the known one
});

test("applyEvents: malformed event (no .type) is skipped silently", () => {
  const events = [{ payload: { x: 1 } }, null, { type: "drift_observation" }];
  const { state, actions } = applyEvents(null, events);
  assert.equal(state.window.length, 1);
  assert.equal(actions.length, 1);
});

test("applyEvents: non-array events arg is treated as empty (defensive)", () => {
  const { state, actions } = applyEvents(null, "not an array");
  assert.equal(state.window.length, 0);
  assert.equal(actions.length, 0);
});

test("applyEvents: state input not mutated (returns new state)", () => {
  const prior = { window: [], outcomesSinceConsolidate: 0, lastConsolidatedAt: null };
  const events = [{ type: "outcome_record" }];
  applyEvents(prior, events);
  assert.equal(prior.window.length, 0);
  assert.equal(prior.outcomesSinceConsolidate, 0);
});

// ── EVENT_TYPE_ALIASES / resolveEventType / operator_correction loop-closure ──

test("EVENT_TYPE_ALIASES: maps operator_correction -> outcome_record and is frozen", () => {
  assert.equal(EVENT_TYPE_ALIASES.operator_correction, "outcome_record");
  assert.ok(Object.isFrozen(EVENT_TYPE_ALIASES));
});

test("resolveEventType: aliases operator_correction; passes unknown + canonical through; non-string -> unknown", () => {
  assert.equal(resolveEventType("operator_correction"), "outcome_record");
  assert.equal(resolveEventType("outcome_record"), "outcome_record"); // canonical unchanged
  assert.equal(resolveEventType("drift_observation"), "drift_observation");
  assert.equal(resolveEventType("garbage_type"), "garbage_type"); // unknown passes through (caller buckets)
  assert.equal(resolveEventType(42), "unknown");
  assert.equal(resolveEventType(null), "unknown");
});

test("applyEvents: top-level operator_correction (divergent python writer shape) is consumed as outcome_record, not dropped", () => {
  // R9: this is the EXACT shape observed live in blueprint-accuracy-events.jsonl
  // (python isoformat ts, top-level type:operator_correction). Pre-fix it routed
  // to the `unknown` bucket and was silently dropped -- losing the single
  // highest-value training signal (human-confirmed ground truth).
  const events = [
    {
      type: "operator_correction",
      ts: "2026-06-18T19:35:11.664755Z",
      payload: {
        pdf_path: "C:/Users/wompu/Downloads/C-033626-R01.pdf",
        drawing: "C-033626 R01",
        part: "Item 2 ALIGNMENT PIN",
        part_class: "pin_revolve",
        failure_mode: "missed_secondary_diameter__dimension_feature_binding",
      },
    },
  ];
  const { state, actions, summary } = applyEvents(null, events, { consolidateThreshold: 99 });
  // It now drives the loop: dispatched as outcome_record, hits the window,
  // bumps the consolidate counter, and is counted under the canonical type.
  assert.equal(actions.length, 1);
  assert.equal(actions[0].event_type, "outcome_record");
  assert.equal(actions[0].xproc_action, EVENT_TO_XPROC_ACTION.outcome_record);
  assert.deepEqual(actions[0].payload, events[0].payload); // payload preserved verbatim
  assert.equal(state.window.length, 1);
  assert.equal(state.outcomesSinceConsolidate, 1);
  assert.equal(state.eventCounts.outcome_record, 1);
  assert.equal(state.eventCounts.unknown, 0); // NOT dropped to unknown
  // Divergence stays observable (fail-loud, not silently masked).
  assert.equal(summary.aliasedCount, 1);
  assert.equal(summary.processedCount, 1);
});

test("applyEvents: aliased operator_correction events DRIVE consolidation (threshold crossing)", () => {
  // 25 divergent-shape operator corrections must trigger the implicit
  // ewc_consolidate exactly like canonical outcome_records -- proving the alias
  // closes the loop, not merely silences a counter.
  const events = Array.from({ length: 25 }, (_, i) => ({
    type: "operator_correction",
    ts: `2026-06-18T19:35:${String(i % 60).padStart(2, "0")}.000000Z`,
    payload: { feature_id: `f${i}` },
  }));
  const { state, actions, summary } = applyEvents(null, events, { consolidateThreshold: 25 });
  assert.equal(state.outcomesSinceConsolidate, 25);
  assert.equal(summary.aliasedCount, 25);
  assert.equal(summary.consolidationTriggeredByThreshold, true);
  // 25 outcome_record dispatches + 1 implicit ewc_consolidate
  assert.equal(actions.length, 26);
  assert.equal(actions[25].xproc_action, EVENT_TO_XPROC_ACTION.ewc_consolidate);
});

test("applyEvents: alias is narrow -- genuinely-unknown types still bucket to unknown with aliasedCount 0", () => {
  const events = [
    { type: "garbage_type" },
    { type: "another_unknown" },
    { type: "outcome_record" }, // canonical -> aliasedCount must stay 0
  ];
  const { state, summary } = applyEvents(null, events);
  assert.equal(state.eventCounts.unknown, 2);
  assert.equal(state.eventCounts.outcome_record, 1);
  assert.equal(summary.aliasedCount, 0); // no over-broad aliasing; canonical not counted as aliased
});

// ── buildConsolidationSummary ──────────────────────────────────────

test("buildConsolidationSummary: aggregates window-by-type", () => {
  const state = {
    window: [
      { type: "drift_observation" },
      { type: "drift_observation" },
      { type: "outcome_record" },
      { type: "replay_add" },
    ],
    outcomesSinceConsolidate: 1,
    lastConsolidatedAt: "2026-05-18T00:00:00Z",
  };
  const s = buildConsolidationSummary(state);
  assert.equal(s.windowSize, 4);
  assert.equal(s.windowByType.drift_observation, 2);
  assert.equal(s.windowByType.outcome_record, 1);
  assert.equal(s.windowByType.replay_add, 1);
});

test("buildConsolidationSummary: empty window yields zero size + empty map", () => {
  const s = buildConsolidationSummary(null);
  assert.equal(s.windowSize, 0);
  assert.deepEqual(s.windowByType, {});
});

// ── advanceOffset ──────────────────────────────────────────────────

test("advanceOffset: adds blob byte length to prior offset", () => {
  assert.equal(advanceOffset(100, 50), 150);
  assert.equal(advanceOffset(0, 1024), 1024);
});

test("advanceOffset: non-finite inputs clamp to 0", () => {
  assert.equal(advanceOffset(NaN, 50), 50);
  assert.equal(advanceOffset(100, -5), 100); // negative blob length clamps to 0
  assert.equal(advanceOffset(null, undefined), 0);
});

// ── Idempotency regression ─────────────────────────────────────────

test("idempotency: re-applying same events with same offset is a no-op pattern (caller responsibility, but lib must support it)", () => {
  const events = [{ type: "outcome_record" }];
  const { state: s1 } = applyEvents(null, events);
  // Second pass with the SAME state + zero new events = no change
  const { state: s2, summary } = applyEvents(s1, []);
  assert.equal(s2.outcomesSinceConsolidate, s1.outcomesSinceConsolidate);
  assert.equal(s2.window.length, s1.window.length);
  assert.equal(summary.processedCount, 0);
});

// ── Fail-loud: corrupt event values don't corrupt state ────────────

test("R12 regression: corrupt payload values cannot escape into NaN window counters", () => {
  const events = [
    { type: "outcome_record", payload: { value: NaN } },
    { type: "drift_observation", payload: { unbounded: Infinity } },
  ];
  const { state } = applyEvents(null, events);
  // Counts are integer; window entries preserve raw payload (caller's job).
  assert.equal(state.outcomesSinceConsolidate, 1);
  assert.equal(state.window.length, 2);
  for (const v of Object.values(state.eventCounts)) {
    assert.ok(Number.isFinite(v));
  }
});

// ── Default constants surface check ────────────────────────────────

test("constants: defaults match hook contract (50 window cap, 25 consolidate threshold)", () => {
  assert.equal(DEFAULT_WINDOW_CAP, 50);
  assert.equal(MIN_WINDOW_CAP, 5);
  assert.equal(MAX_WINDOW_CAP, 500);
  assert.equal(DEFAULT_CONSOLIDATE_THRESHOLD, 25);
});

test("constants: every known event type has a registered xproc action", () => {
  for (const t of KNOWN_EVENT_TYPES) {
    assert.ok(typeof EVENT_TO_XPROC_ACTION[t] === "string");
    assert.ok(EVENT_TO_XPROC_ACTION[t].startsWith("xproc_"));
  }
});

test("constants: outcome_record targets the CREATE action, not the id-requiring update variant", () => {
  // xproc_outcome_record_outcome (recordOutcome(id)) THROWS without an `id`, and
  // every outcome_record producer emits none -> it would fail-soft 100% when the
  // live drainer dispatches. Must be the create action (xproc_outcome_record),
  // matching the hook's own pre-computed dispatch. (U-BPA-LOOP-DRAIN-CORE)
  assert.equal(EVENT_TO_XPROC_ACTION.outcome_record, "xproc_outcome_record");
  assert.notEqual(EVENT_TO_XPROC_ACTION.outcome_record, "xproc_outcome_record_outcome");
});

// ── State-file isolation (U-BPA-CONSUMER-STATE-ISOLATE) ────────────
// The consumer MUST persist to its OWN file, never the hook's. These lock the
// fix: distinct basenames + the documented root cause (a hook-shaped v1 state
// loses lastProcessedOffset on migrate, which is exactly why a shared file
// re-processes the whole ledger).

test("state-isolation: consumer + hook state filenames are distinct", () => {
  assert.equal(typeof HOOK_STATE_FILENAME, "string");
  assert.equal(typeof CONSUMER_STATE_FILENAME, "string");
  assert.ok(HOOK_STATE_FILENAME.length > 0);
  assert.ok(CONSUMER_STATE_FILENAME.length > 0);
  // The whole point of the fix: they cannot be the same path.
  assert.notEqual(CONSUMER_STATE_FILENAME, HOOK_STATE_FILENAME);
  // Hook keeps the legacy name; consumer takes the dedicated one.
  assert.equal(HOOK_STATE_FILENAME, "blueprint-accuracy-state.json");
  assert.equal(CONSUMER_STATE_FILENAME, "blueprint-accuracy-consumer-state.json");
});

test("state-isolation: a hook-shaped v1 state loses lastProcessedOffset on migrate (root-cause oracle)", () => {
  // This is the EXACT object the hook's saveState writes to its state file:
  // schemaVersion:1, a window of {ts,width} drift entries, no lastProcessedOffset.
  const hookWritten = {
    schemaVersion: 1,
    window: [
      { ts: "2026-06-24T00:00:00Z", width: 0.12 },
      { ts: "2026-06-24T00:01:00Z", width: 0.31 },
    ],
    outcomesSinceConsolidate: 0,
    lastConsolidatedAt: null,
  };
  const migrated = migrateState(hookWritten);
  // If the consumer had read this (shared-file collision), its durable offset is
  // GONE -> defaults to 0 -> the next run re-reads the entire ledger from byte 0.
  // That double-count is the bug the separate file prevents.
  assert.equal(migrated.lastProcessedOffset, 0);
});

test("state-isolation: consumer round-trips its OWN v2 state without offset loss", () => {
  // When the consumer reads back a state IT wrote (v2 with a real offset), the
  // offset survives -- the property a dedicated file guarantees in production.
  const consumerWritten = {
    schemaVersion: STATE_SCHEMA_VERSION,
    window: [{ type: "outcome_record", ts: "2026-06-24T00:00:00Z", payload: { kind: "rag_extraction" } }],
    outcomesSinceConsolidate: 1,
    lastConsolidatedAt: null,
    lastProcessedOffset: 508483,
    eventCounts: { outcome_record: 1 },
  };
  const migrated = migrateState(consumerWritten);
  assert.equal(migrated.lastProcessedOffset, 508483);
  // And applying zero new events leaves the offset untouched (idempotent re-run).
  const { state } = applyEvents(migrated, []);
  assert.equal(state.lastProcessedOffset, 508483);
});
