/**
 * U-NN-LOOP02 — CrossProcessOutcomeStore → FeedbackBusEngine wiring tests.
 *
 * Verifies that:
 *   - record() publishes "outcome.recorded" with the new event id + record
 *   - recordOutcome() publishes "outcome.completed" only on a kind transition
 *   - replaying the same kind on recordOutcome() does NOT re-emit (no replay noise)
 *   - subscriber crash does not corrupt the ledger
 *   - bus stats increment correctly across record + recordOutcome
 *
 * The OutcomeStore tests in CrossProcessOutcomeStore.test.ts cover the storage
 * contract; this file isolates the bus integration so storage tests stay
 * unchanged when the bus contract evolves.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CrossProcessOutcomeStore,
  type OutcomeRecord,
} from "../engines/CrossProcessOutcomeStore.js";
import {
  feedbackBusEngine,
  type FeedbackEvent,
} from "../engines/FeedbackBusEngine.js";

const flush = () => Promise.resolve();

describe("CrossProcessOutcomeStore -> FeedbackBus (U-NN-LOOP02)", () => {
  let store: CrossProcessOutcomeStore;
  beforeEach(() => {
    store = new CrossProcessOutcomeStore();
    feedbackBusEngine.reset();
  });

  it("record() publishes 'outcome.recorded' with id, bridge, process, kind, full record", async () => {
    const seen: FeedbackEvent[] = [];
    feedbackBusEngine.subscribe("outcome.recorded", (e) => {
      seen.push(e);
    });

    const id = store.record({
      bridge: "sf",
      process: "mill",
      request_summary: { material: "4140", tool_diameter_mm: 12 },
    });

    await flush();

    expect(seen.length).toBe(1);
    expect(seen[0].topic).toBe("outcome.recorded");
    const payload = seen[0].payload as {
      id: string;
      bridge: string;
      process: string;
      outcomeKind: string;
      record: OutcomeRecord;
    };
    expect(payload.id).toBe(id);
    expect(payload.id).toBe("evt-1");
    expect(payload.bridge).toBe("sf");
    expect(payload.process).toBe("mill");
    expect(payload.outcomeKind).toBe("pending");
    expect(payload.record.id).toBe(id);
    expect(payload.record.bridge).toBe("sf");
    expect(payload.record.process).toBe("mill");
    expect(payload.record.request_summary.material).toBe("4140");
    expect(payload.record.request_summary.tool_diameter_mm).toBe(12);
  });

  it("record() with explicit success outcome publishes outcomeKind='success'", async () => {
    const seen: FeedbackEvent[] = [];
    feedbackBusEngine.subscribe("outcome.recorded", (e) => {
      seen.push(e);
    });

    store.record({
      bridge: "ai",
      process: "lathe",
      outcome: { kind: "success" },
    });
    await flush();

    expect(seen.length).toBe(1);
    const payload = seen[0].payload as { outcomeKind: string; bridge: string; process: string };
    expect(payload.outcomeKind).toBe("success");
    expect(payload.bridge).toBe("ai");
    expect(payload.process).toBe("lathe");
  });

  it("recordOutcome() publishes 'outcome.completed' on pending -> success transition", async () => {
    const recorded: FeedbackEvent[] = [];
    const completed: FeedbackEvent[] = [];
    feedbackBusEngine.subscribe("outcome.recorded", (e) => {
      recorded.push(e);
    });
    feedbackBusEngine.subscribe("outcome.completed", (e) => {
      completed.push(e);
    });

    const id = store.record({ bridge: "post", process: "wedm" });
    await flush();
    expect(recorded.length).toBe(1);
    expect(completed.length).toBe(0);

    const ok = store.recordOutcome(id, { kind: "success" });
    await flush();

    expect(ok).toBe(true);
    expect(completed.length).toBe(1);
    const payload = completed[0].payload as {
      id: string;
      bridge: string;
      process: string;
      previousKind: string;
      outcomeKind: string;
      record: OutcomeRecord;
    };
    expect(payload.id).toBe(id);
    expect(payload.previousKind).toBe("pending");
    expect(payload.outcomeKind).toBe("success");
    expect(payload.bridge).toBe("post");
    expect(payload.process).toBe("wedm");
    expect(payload.record.outcome?.kind).toBe("success");
  });

  it("recordOutcome() does NOT re-emit when the kind is unchanged (idempotent replay)", async () => {
    const completed: FeedbackEvent[] = [];
    feedbackBusEngine.subscribe("outcome.completed", (e) => {
      completed.push(e);
    });

    const id = store.record({
      bridge: "feature",
      process: "mill",
      outcome: { kind: "success" },
    });
    await flush();

    // Re-record the same kind — kind matches → no event emitted
    const ok = store.recordOutcome(id, { kind: "success" });
    await flush();

    expect(ok).toBe(true);
    expect(completed.length).toBe(0);
  });

  it("recordOutcome() emits when kind flips success -> operator_override", async () => {
    const completed: FeedbackEvent[] = [];
    feedbackBusEngine.subscribe("outcome.completed", (e) => {
      completed.push(e);
    });

    const id = store.record({
      bridge: "router",
      process: "lathe",
      outcome: { kind: "success" },
    });
    await flush();

    store.recordOutcome(id, { kind: "operator_override" });
    await flush();

    expect(completed.length).toBe(1);
    const payload = completed[0].payload as { previousKind: string; outcomeKind: string };
    expect(payload.previousKind).toBe("success");
    expect(payload.outcomeKind).toBe("operator_override");
  });

  it("subscriber crash does not corrupt the ledger or block record()", async () => {
    feedbackBusEngine.subscribe("outcome.recorded", () => {
      throw new Error("subscriber boom (intentional)");
    });
    let goodHits = 0;
    feedbackBusEngine.subscribe("outcome.recorded", () => {
      goodHits++;
    });

    const id = store.record({ bridge: "sf", process: "mill" });
    await flush();

    expect(id).toBe("evt-1");
    expect(store.size()).toBe(1);
    expect(goodHits).toBe(1);
    expect(feedbackBusEngine.stats().totalSubscriberErrors).toBe(1);
  });

  it("bus stats: 5 record() calls produce exactly 5 published events", async () => {
    const before = feedbackBusEngine.stats().totalPublished;
    for (let i = 0; i < 5; i++) {
      store.record({ bridge: "sf", process: "mill" });
    }
    await flush();
    const after = feedbackBusEngine.stats().totalPublished;
    expect(after - before).toBe(5);
  });

  it("recordOutcome() on unknown id returns false and does NOT publish", async () => {
    const completed: FeedbackEvent[] = [];
    feedbackBusEngine.subscribe("outcome.completed", (e) => {
      completed.push(e);
    });

    const ok = store.recordOutcome("evt-doesnotexist", { kind: "failure" });
    await flush();

    expect(ok).toBe(false);
    expect(completed.length).toBe(0);
  });

  it("wildcard subscriber receives both outcome.recorded and outcome.completed in order", async () => {
    const wildcard: FeedbackEvent[] = [];
    feedbackBusEngine.subscribe("*", (e) => {
      wildcard.push(e);
    });

    const id = store.record({ bridge: "ai", process: "wedm" });
    await flush();
    store.recordOutcome(id, { kind: "failure" });
    await flush();

    expect(wildcard.length).toBe(2);
    expect(wildcard[0].topic).toBe("outcome.recorded");
    expect(wildcard[1].topic).toBe("outcome.completed");
    const completedPayload = wildcard[1].payload as { outcomeKind: string };
    expect(completedPayload.outcomeKind).toBe("failure");
  });

  it("ledger remains intact after publishing — record retrievable by id", async () => {
    feedbackBusEngine.subscribe("outcome.recorded", () => {
      // no-op subscriber, just to ensure publish path executes
    });

    const id = store.record({
      bridge: "sf",
      process: "mill",
      request_summary: { customer: "ALCOA" },
    });
    await flush();

    const retrieved = store.query({ bridge: "sf" });
    expect(retrieved.length).toBe(1);
    expect(retrieved[0].id).toBe(id);
    expect(retrieved[0].request_summary.customer).toBe("ALCOA");
  });
});
