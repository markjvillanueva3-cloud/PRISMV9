/**
 * U-BPA-GUARD-EVENTSHAPE (slot:india) -- proves blueprint-accuracy-guard.appendEvent
 * now writes the CANONICAL {type, ts, payload} shape the offline consumer
 * (blueprint-accuracy-consumer-lib.applyEvents) routes by, instead of the old
 * kind-keyed shape that the consumer silently dropped.
 *
 * Round-trips THROUGH the REAL consumer-lib (parseEventsBlob + applyEvents), and
 * end-to-end through the REAL processPayload -> real appendEvent path. Run:
 *   node .claude/hooks/blueprint-accuracy-guard.event-shape.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { appendEvent, processPayload } from "./blueprint-accuracy-guard.mjs";
import {
  parseEventsBlob,
  applyEvents,
  KNOWN_EVENT_TYPES,
  EVENT_TO_XPROC_ACTION,
} from "../../scripts/lib/blueprint-accuracy-consumer-lib.mjs";

const TMP = mkdtempSync(join(tmpdir(), "bpa-guard-shape-"));
const EVENTS = join(TMP, "events.jsonl");
const STATE = join(TMP, "state.json");

function rows() {
  return existsSync(EVENTS) ? readFileSync(EVENTS, "utf8").split("\n").filter((l) => l.trim()) : [];
}
function fresh() { try { rmSync(EVENTS); } catch { /* not present */ } }

// The five event kinds processPayload emits, mirroring its construction shapes.
const HOOK_EVENTS = [
  { kind: "drift_observation", sessionId: "s1", tool: "Write", widenPct: 25, newWidth: 0.4, sampleCount: 3, reason: "widen", dispatch: { action: "xproc_drift_observe", params: { metric: "blueprint_confidence_bound", value: 0.4 } } },
  { kind: "replay_add", sessionId: "s1", tool: "Write", reason: "low_confidence", priority: 0.42, lowestConfidence: 0.58, groundTruthShape: null, dispatch: { action: "xproc_replay_add", params: { sample_key: "blueprint:s1:1", priority: 0.42 } } },
  { kind: "outcome_record", sessionId: "s1", tool: "Edit", feature_id: "F1", hasBefore: true, hasAfter: true, dispatch: { action: "xproc_outcome_record", params: { kind: "operator_correction", feature_id: "F1" } } },
  { kind: "predlog_pair", sessionId: "s1", tool: "Edit", feature_id: "F1", dispatch: { action: "xproc_predlog_pair", params: { feature_id: "F1" } } },
  { kind: "ewc_consolidate", sessionId: "s1", accumulated: 25, threshold: 25, dispatch: { action: "xproc_ewc_consolidate", params: {} } },
];

test("every hook event kind written via appendEvent routes by type through the REAL consumer (none unknown)", () => {
  fresh();
  for (const ev of HOOK_EVENTS) assert.equal(appendEvent(EVENTS, ev), true);

  const { events, malformedCount } = parseEventsBlob(rows().join("\n"));
  assert.equal(malformedCount, 0);
  assert.equal(events.length, 5);
  for (let i = 0; i < HOOK_EVENTS.length; i++) {
    assert.equal(events[i].type, HOOK_EVENTS[i].kind);     // kind -> top-level type
    assert.equal(typeof events[i].payload, "object");      // rich fields nested
    assert.equal(events[i].kind, undefined);               // not duplicated top-level
  }

  const applied = applyEvents({}, events);
  assert.equal(applied.summary.processedCount, 5);
  assert.equal(applied.state.eventCounts.unknown, 0);
  for (const k of KNOWN_EVENT_TYPES) assert.equal(applied.state.eventCounts[k], 1, `${k} routed exactly once`);
});

test("payload preserves the rich hook fields (dispatch / sessionId / tool)", () => {
  fresh();
  assert.equal(appendEvent(EVENTS, HOOK_EVENTS[1]), true); // replay_add
  const { events } = parseEventsBlob(rows().join("\n"));
  assert.equal(events[0].payload.sessionId, "s1");
  assert.equal(events[0].payload.tool, "Write");
  assert.equal(events[0].payload.reason, "low_confidence");
  assert.equal(events[0].payload.dispatch.action, "xproc_replay_add");
});

test("predlog_pair now routes to xproc_predlog_pair (consumer-lib registration)", () => {
  fresh();
  assert.ok(KNOWN_EVENT_TYPES.includes("predlog_pair"));
  assert.equal(EVENT_TO_XPROC_ACTION.predlog_pair, "xproc_predlog_pair");
  assert.equal(appendEvent(EVENTS, HOOK_EVENTS[3]), true);
  const { events } = parseEventsBlob(rows().join("\n"));
  const applied = applyEvents({}, events);
  const act = applied.actions.find((a) => a.event_type === "predlog_pair");
  assert.ok(act, "predlog_pair produced a routed action");
  assert.equal(act.xproc_action, "xproc_predlog_pair");
  assert.equal(applied.state.eventCounts.unknown, 0);
});

test("REGRESSION ORACLE: the OLD kind-only shape (no top-level type) is silently dropped by the consumer", () => {
  // What appendEvent USED to write: {ts, kind, ...} with no top-level `type`.
  // The consumer skips any row whose `type` is not a string -> processed 0.
  const oldRow = JSON.stringify({ ts: "2026-06-24T00:00:00.000Z", kind: "drift_observation", sessionId: "s1" });
  const { events } = parseEventsBlob(oldRow);
  const applied = applyEvents({}, events);
  assert.equal(applied.summary.processedCount, 0);            // dropped
  assert.equal(applied.state.eventCounts.drift_observation, 0); // never counted
});

test("idempotency: an event already carrying a top-level type keeps it (kind does not override)", () => {
  fresh();
  assert.equal(appendEvent(EVENTS, { type: "outcome_record", kind: "drift_observation", feature_id: "F9" }), true);
  const { events } = parseEventsBlob(rows().join("\n"));
  assert.equal(events[0].type, "outcome_record");   // pre-existing top-level type wins over kind
  assert.equal(events[0].kind, undefined);           // kind never re-emitted at top level
  assert.equal(events[0].payload.feature_id, "F9");  // remaining fields nested under payload
  assert.equal(applyEvents({}, events).state.eventCounts.outcome_record, 1);
});

test("end-to-end: processPayload(ground_truth_match) -> real appendEvent -> consumer routes replay_add", () => {
  fresh();
  const cfg = { eventsFile: EVENTS, stateFile: STATE, replayFloor: 0.7, rollingWindow: 50, driftWidenPct: 0.5, consolidateThreshold: 25, verbose: false };
  const payload = {
    tool_name: "Write",
    tool_input: { file_path: "blueprint.json" },
    tool_response: JSON.stringify({ blueprint: true, ground_truth_match: true }),
    session_id: "int-1",
  };
  const result = processPayload(payload, {
    config: cfg,
    loadState: () => ({ window: [], outcomesSinceConsolidate: 0 }),
    saveState: () => { /* no-op: don't touch real state */ },
  });
  assert.ok(result.events.some((e) => e.kind === "replay_add"), "processPayload emitted a replay_add");

  const { events, malformedCount } = parseEventsBlob(rows().join("\n"));
  assert.equal(malformedCount, 0);
  const applied = applyEvents({}, events);
  assert.ok(applied.actions.some((a) => a.event_type === "replay_add"), "replay_add routed via the real consumer");
  assert.equal(applied.state.eventCounts.unknown, 0);

  rmSync(TMP, { recursive: true, force: true });
});
