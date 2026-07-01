// Round-trip test for the blueprint_loop_drain prism_ai action
// (U-BPA-LOOP-DRAIN-DISPATCH, slot:india). Exercises the dispatcher CASE end to
// end -- path resolution, the .mjs drain-core import, the skipActions policy,
// dryRun, and the idempotent consumer-state offset -- against a temp fixture
// (never the live ledger/state).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("blueprint_loop_drain dispatcher round-trip", () => {
  let dir: string;
  const prevEvents = process.env.PRISM_BPA_EVENTS_FILE;
  const prevState = process.env.PRISM_BPA_STATE_FILE;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "bpa-drain-"));
    const eventsFile = join(dir, "events.jsonl");
    const stateFile = join(dir, "state.json");
    // 1 replay_add (the hook pre-computes dispatch.params) + 1 outcome_record
    // (skipped: blueprint ground truth is process-agnostic, ledger-only).
    writeFileSync(
      eventsFile,
      JSON.stringify({ type: "replay_add", ts: "2026-06-25T00:00:00Z", payload: { dispatch: { action: "xproc_replay_add", params: { sample_key: "bpa:test:1", priority: 0.5 } } } }) +
        "\n" +
        JSON.stringify({ type: "outcome_record", ts: "2026-06-25T00:00:01Z", payload: { kind: "rag_extraction", extraction_id: "x1" } }) +
        "\n",
    );
    process.env.PRISM_BPA_EVENTS_FILE = eventsFile;
    process.env.PRISM_BPA_STATE_FILE = stateFile;
  });

  afterAll(() => {
    if (prevEvents === undefined) delete process.env.PRISM_BPA_EVENTS_FILE;
    else process.env.PRISM_BPA_EVENTS_FILE = prevEvents;
    if (prevState === undefined) delete process.env.PRISM_BPA_STATE_FILE;
    else process.env.PRISM_BPA_STATE_FILE = prevState;
    rmSync(dir, { recursive: true, force: true });
  });

  it("dryRun: returns a plan summary, dispatches nothing, advances no offset", async () => {
    const res = await executeAIReasoningAction("blueprint_loop_drain", { dryRun: true });
    expect(res.success).toBe(true);
    const d = res.data as {
      dryRun: boolean;
      summary: { parsedEvents: number; dryRun: boolean; dispatchedOk?: number };
      offset?: { prior?: number; new?: number };
      dispatched?: unknown[];
    };
    expect(d.dryRun).toBe(true);
    expect(d.summary.parsedEvents).toBe(2); // plan still computed
    expect(d.summary.dryRun).toBe(true);
    // dryRun routes nothing + never advances the offset. (responseSlimmer drops
    // the empty `dispatched: []` + 0-valued fields, so assert via ?? defaults.)
    expect(d.summary.dispatchedOk ?? 0).toBe(0);
    expect(d.dispatched ?? []).toHaveLength(0);
    expect(d.offset?.new ?? 0).toBe(d.offset?.prior ?? 0);
  });

  it("real run: skips outcome_record, attempts the replay route, then is idempotent", async () => {
    const res1 = await executeAIReasoningAction("blueprint_loop_drain", {});
    expect(res1.success).toBe(true);
    const d1 = res1.data as {
      summary: { dispatchedSkipped: number; dispatchedOk: number; dispatchedFailed: number; parsedEvents: number };
      offset: { prior: number; new: number };
    };
    // outcome_record was skipped by policy (ledger-only), never routed to the
    // machining outcome store.
    expect(d1.summary.dispatchedSkipped).toBeGreaterThanOrEqual(1);
    // the replay_add reached dispatch (succeeded OR fail-soft -- either way attempted).
    expect(d1.summary.dispatchedOk + d1.summary.dispatchedFailed).toBeGreaterThanOrEqual(1);
    expect(d1.offset.new).toBeGreaterThan(0); // consumed the tail, advanced the offset

    // Re-run: the durable offset means no events re-process (idempotent).
    const res2 = await executeAIReasoningAction("blueprint_loop_drain", {});
    const d2 = res2.data as { summary: { parsedEvents: number }; offset: { prior: number; new: number } };
    expect(d2.summary.parsedEvents).toBe(0);
    expect(d2.offset.new).toBe(d2.offset.prior);
  });
});
