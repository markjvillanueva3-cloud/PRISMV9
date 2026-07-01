// scripts/lib/blueprint-loop-drain-lib.test.mjs
// Tests for U-BPA-LOOP-DRAIN-CORE -- the injectable blueprint closed-loop drain.
// Run directly: `node scripts/lib/blueprint-loop-drain-lib.test.mjs`
// (node:test auto-runs on exit; `node --test` reports 0 in this env.)

import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveDispatch, drainEvents } from "./blueprint-loop-drain-lib.mjs";
import { EVENT_TO_XPROC_ACTION } from "./blueprint-accuracy-consumer-lib.mjs";

// ── resolveDispatch ────────────────────────────────────────────────

test("resolveDispatch: prefers the hook-precomputed payload.dispatch.params", () => {
  const r = resolveDispatch({
    event_type: "drift_observation",
    xproc_action: "xproc_drift_observe",
    payload: { sessionId: "s1", dispatch: { action: "xproc_drift_observe", params: { metric: "blueprint_confidence_bound", value: 0.3 } } },
  });
  assert.equal(r.action, "xproc_drift_observe");
  assert.deepEqual(r.params, { metric: "blueprint_confidence_bound", value: 0.3 });
});

test("resolveDispatch: falls back to the raw payload when no dispatch block", () => {
  const r = resolveDispatch({
    event_type: "outcome_record",
    xproc_action: "xproc_outcome_record_outcome",
    payload: { kind: "rag_extraction", extraction_id: "x1" },
  });
  assert.equal(r.action, "xproc_outcome_record_outcome");
  assert.deepEqual(r.params, { kind: "rag_extraction", extraction_id: "x1" });
});

test("resolveDispatch: resolves action from EVENT_TO_XPROC_ACTION when xproc_action absent", () => {
  const r = resolveDispatch({ event_type: "replay_add", payload: { priority: 0.4 } });
  assert.equal(r.action, EVENT_TO_XPROC_ACTION.replay_add);
  assert.equal(r.action, "xproc_replay_add");
});

test("resolveDispatch: returns null action for unresolvable / garbage input", () => {
  assert.deepEqual(resolveDispatch(null), { action: null, params: {} });
  assert.deepEqual(resolveDispatch({}), { action: null, params: {} });
  assert.equal(resolveDispatch({ event_type: "not_a_known_type" }).action, null);
});

test("resolveDispatch: array/null payload yields empty params, not the array", () => {
  assert.deepEqual(resolveDispatch({ xproc_action: "xproc_replay_add", payload: [1, 2, 3] }).params, {});
  assert.deepEqual(resolveDispatch({ xproc_action: "xproc_replay_add", payload: null }).params, {});
});

test("resolveDispatch: a dispatch block missing params falls back to the raw payload", () => {
  const r = resolveDispatch({ xproc_action: "xproc_replay_add", payload: { priority: 0.9, dispatch: { action: "xproc_replay_add" } } });
  // dispatch present but no .params object -> raw payload is used.
  assert.equal(r.params.priority, 0.9);
});

// ── drainEvents ────────────────────────────────────────────────────

/** Build a JSONL blob from event objects. */
function jsonl(...events) {
  return events.map((e) => JSON.stringify(e)).join("\n") + "\n";
}

test("drainEvents: dispatches each planned action via the injected dispatch fn", async () => {
  const calls = [];
  const dispatch = async (action, params) => {
    calls.push({ action, params });
    return { ok: true };
  };
  const blob = jsonl(
    { type: "drift_observation", ts: "2026-06-25T00:00:00Z", payload: { dispatch: { action: "xproc_drift_observe", params: { metric: "m", value: 0.5 } } } },
    { type: "replay_add", ts: "2026-06-25T00:00:01Z", payload: { priority: 0.7 } },
  );
  const out = await drainEvents({ tailBlob: blob, priorState: null, dispatch });
  // Both events drove a real dispatch.
  assert.equal(out.summary.dispatchedOk, 2);
  assert.equal(out.summary.dispatchedFailed, 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].action, "xproc_drift_observe");
  assert.deepEqual(calls[0].params, { metric: "m", value: 0.5 });
  assert.equal(calls[1].action, "xproc_replay_add");
});

test("drainEvents: dryRun computes the plan but dispatches NOTHING", async () => {
  let dispatched = 0;
  const dispatch = async () => { dispatched += 1; };
  const blob = jsonl({ type: "replay_add", ts: "2026-06-25T00:00:00Z", payload: { priority: 0.5 } });
  const out = await drainEvents({ tailBlob: blob, priorState: null, dispatch, dryRun: true });
  assert.equal(dispatched, 0);
  assert.equal(out.dispatched.length, 0);
  assert.ok(out.plan.length >= 1); // the plan is still computed
  assert.equal(out.summary.dryRun, true);
});

test("drainEvents: a throwing dispatch is fail-soft per action and never aborts the rest", async () => {
  const seen = [];
  const dispatch = async (action) => {
    seen.push(action);
    if (action === "xproc_drift_observe") throw new Error("engine boom");
    return { ok: true };
  };
  const blob = jsonl(
    { type: "drift_observation", ts: "2026-06-25T00:00:00Z", payload: { dispatch: { action: "xproc_drift_observe", params: {} } } },
    { type: "replay_add", ts: "2026-06-25T00:00:01Z", payload: { priority: 0.7 } },
  );
  const out = await drainEvents({ tailBlob: blob, priorState: null, dispatch });
  // The throwing action is recorded as a failure, the second still dispatched.
  assert.equal(out.summary.dispatchedFailed, 1);
  assert.equal(out.summary.dispatchedOk, 1);
  const failed = out.dispatched.find((d) => d.ok === false);
  assert.equal(failed.action, "xproc_drift_observe");
  assert.match(failed.error, /boom/);
  assert.equal(seen.length, 2); // did NOT abort after the throw
});

test("drainEvents: an unresolvable action is recorded, never dispatched", async () => {
  // An event whose type is unknown is bucketed to `unknown` by applyEvents and
  // never enters the plan -- so it can't reach dispatch. Confirm the plan + the
  // dispatch list both exclude it.
  let dispatched = 0;
  const dispatch = async () => { dispatched += 1; };
  const blob = jsonl(
    { type: "totally_unknown_type", ts: "2026-06-25T00:00:00Z", payload: {} },
    { type: "replay_add", ts: "2026-06-25T00:00:01Z", payload: { priority: 0.2 } },
  );
  const out = await drainEvents({ tailBlob: blob, priorState: null, dispatch });
  // Only the known replay_add dispatched.
  assert.equal(dispatched, 1);
  assert.equal(out.summary.dispatchedOk, 1);
  assert.ok(out.plan.every((a) => a.event_type !== "totally_unknown_type"));
});

test("drainEvents: malformed JSONL lines are counted, not dispatched", async () => {
  let dispatched = 0;
  const dispatch = async () => { dispatched += 1; };
  const blob = "{not json\n" + JSON.stringify({ type: "replay_add", ts: "2026-06-25T00:00:00Z", payload: { priority: 0.5 } }) + "\n";
  const out = await drainEvents({ tailBlob: blob, priorState: null, dispatch });
  assert.equal(out.summary.malformedCount, 1);
  assert.equal(out.summary.dispatchedOk, 1);
  assert.equal(dispatched, 1);
});

test("drainEvents: empty tail -> empty plan, zero dispatch (idempotent re-run shape)", async () => {
  let dispatched = 0;
  const out = await drainEvents({ tailBlob: "", priorState: null, dispatch: async () => { dispatched += 1; } });
  assert.equal(out.plan.length, 0);
  assert.equal(out.dispatched.length, 0);
  assert.equal(dispatched, 0);
  assert.equal(out.summary.parsedEvents, 0);
});

test("drainEvents: missing dispatch fn is a no-op, NOT counted as a real dispatch", async () => {
  const blob = jsonl({ type: "replay_add", ts: "2026-06-25T00:00:00Z", payload: { priority: 0.5 } });
  const out = await drainEvents({ tailBlob: blob, priorState: null }); // no dispatch
  // The action RESOLVES but nothing was actually routed: dispatchedNoop, NOT
  // dispatchedOk (a caller reading dispatchedOk must never see a phantom dispatch).
  assert.equal(out.summary.dispatchedOk, 0);
  assert.equal(out.summary.dispatchedNoop, 1);
  assert.equal(out.dispatched[0].ok, true);
  assert.equal(out.dispatched[0].dispatched, false); // resolved but not routed
});

test("drainEvents: a REAL dispatch is marked dispatched:true (distinct from the no-op path)", async () => {
  const blob = jsonl({ type: "replay_add", ts: "2026-06-25T00:00:00Z", payload: { priority: 0.5 } });
  const out = await drainEvents({ tailBlob: blob, priorState: null, dispatch: async () => ({ ok: 1 }) });
  assert.equal(out.summary.dispatchedOk, 1);
  assert.equal(out.summary.dispatchedNoop, 0);
  assert.equal(out.dispatched[0].dispatched, true);
});

test("drainEvents: skipActions are counted as dispatchedSkipped and NEVER routed to dispatch", async () => {
  const routed = [];
  const dispatch = async (action) => { routed.push(action); return { ok: 1 }; };
  const blob = jsonl(
    { type: "outcome_record", ts: "2026-06-25T00:00:00Z", payload: { kind: "rag_extraction" } },
    { type: "replay_add", ts: "2026-06-25T00:00:01Z", payload: { priority: 0.4 } },
  );
  // outcome_record resolves to xproc_outcome_record -> skipped; replay_add routes.
  const out = await drainEvents({ tailBlob: blob, priorState: null, dispatch, skipActions: ["xproc_outcome_record"] });
  assert.equal(out.summary.dispatchedSkipped, 1);
  assert.equal(out.summary.dispatchedOk, 1); // only replay_add really dispatched
  assert.ok(routed.includes("xproc_replay_add"));
  assert.ok(!routed.includes("xproc_outcome_record")); // skipped, never called
  const skippedRow = out.dispatched.find((d) => d.skipped === true);
  assert.equal(skippedRow.action, "xproc_outcome_record");
  assert.equal(skippedRow.dispatched, false);
});

test("drainEvents: no skipActions -> nothing skipped (dispatchedSkipped 0)", async () => {
  const blob = jsonl({ type: "replay_add", ts: "2026-06-25T00:00:00Z", payload: { priority: 0.4 } });
  const out = await drainEvents({ tailBlob: blob, priorState: null, dispatch: async () => ({ ok: 1 }) });
  assert.equal(out.summary.dispatchedSkipped, 0);
  assert.equal(out.summary.dispatchedOk, 1);
});

test("drainEvents: forwards the prior state so applyEvents accumulates (carries outcomesSinceConsolidate)", async () => {
  const blob1 = jsonl({ type: "outcome_record", ts: "2026-06-25T00:00:00Z", payload: { kind: "rag_extraction" } });
  const first = await drainEvents({ tailBlob: blob1, priorState: null, dryRun: true });
  assert.equal(first.newState.outcomesSinceConsolidate, 1);
  const blob2 = jsonl({ type: "outcome_record", ts: "2026-06-25T00:00:01Z", payload: { kind: "rag_extraction" } });
  const second = await drainEvents({ tailBlob: blob2, priorState: first.newState, dryRun: true });
  assert.equal(second.newState.outcomesSinceConsolidate, 2); // accumulated, not reset
});
