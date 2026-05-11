/**
 * U-CN10 — auto-train experience-replay mixing tests.
 *
 * `enableAutoTrain({ replayMixRatio, replayMaxRecords })` makes each retrain
 * pull up to `ceil(buffer.length * replayMixRatio)` historical terminal
 * OutcomeRecords from the singleton CrossProcessOutcomeStore (stratified by
 * process, deduped against the current FIFO buffer, capped at replayMaxRecords)
 * and concat them into the training batch — so a burst of one process doesn't
 * catastrophically wipe what the model learned about other processes/materials.
 *
 * These tests seed the SINGLETON store (the one buildReplayMixedBatch reads),
 * enable auto-train on a fresh engine instance, drive `outcome.recorded` bus
 * events into the buffer, and assert on the `neural.train.tick` payload's new
 * `replayMixed` field plus `autoTrainStatus()`. Teardown clears the store +
 * resets the bus so nothing leaks into sibling files.
 *
 * Failure modes / adversarial coverage: mix=0 (off), store empty, store
 * pending-only, full dedup, replayMaxRecords cap, NaN/negative ratio, oversize
 * maxRecords, plus the forced-flush path.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CrossProcessNeuralLearningEngine } from "../engines/CrossProcessNeuralLearningEngine.js";
import { feedbackBusEngine, type FeedbackEvent } from "../engines/FeedbackBusEngine.js";
import { crossProcessOutcomeStore } from "../engines/CrossProcessOutcomeStore.js";
import type { OutcomeBridge, OutcomeProcess } from "../engines/CrossProcessOutcomeStore.js";

const flush = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

type Kind = "success" | "failure" | "operator_override" | "pending";

// Build a bus-event record (random id, never in the store).
function busRecord(kind: Kind, process: OutcomeProcess = "mill") {
  return {
    schemaVersion: "1.0",
    id: `bus-${Math.random().toString(36).slice(2, 10)}`,
    ts: new Date().toISOString(),
    bridge: "sf" as const,
    process,
    request_summary: { material: "4140", tool_diameter_mm: 12 },
    response_summary: {},
    outcome: { kind },
  };
}

// Seed the SINGLETON store with N historical terminal records. Returns their ids.
function seedStore(n: number, opts: { bridge?: OutcomeBridge; process?: OutcomeProcess; kind?: Exclude<Kind, "pending"> } = {}): string[] {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    ids.push(
      crossProcessOutcomeStore.record({
        bridge: opts.bridge ?? "sf",
        process: opts.process ?? "mill",
        request_summary: { material: "4140" },
        outcome: { kind: opts.kind ?? "success" },
      }),
    );
  }
  return ids;
}

describe("CrossProcessNeuralLearningEngine — auto-train replay mixing (U-CN10)", () => {
  let engine: CrossProcessNeuralLearningEngine;
  let ticks: FeedbackEvent[];

  beforeEach(() => {
    engine = new CrossProcessNeuralLearningEngine();
    crossProcessOutcomeStore.clear();
    feedbackBusEngine.reset();
    ticks = [];
  });

  afterEach(() => {
    engine.disableAutoTrain();
    crossProcessOutcomeStore.clear();
    feedbackBusEngine.reset();
  });

  function watchTicks() {
    feedbackBusEngine.subscribe("neural.train.tick", (e) => ticks.push(e));
  }
  function lastTick() {
    return ticks[ticks.length - 1].payload as { samplesUsed: number; replayMixed: number; forced?: boolean };
  }

  it("replayMixRatio defaults to 0 — no historical records pulled even with a full store", async () => {
    seedStore(20);
    engine.enableAutoTrain({ threshold: 4 });
    watchTicks();
    expect(engine.autoTrainStatus().replayMixRatio).toBe(0);
    for (let i = 0; i < 4; i++) feedbackBusEngine.publish("outcome.recorded", { record: busRecord("success") });
    await flush();
    expect(ticks).toHaveLength(1);
    expect(lastTick().replayMixed).toBe(0);
    expect(lastTick().samplesUsed).toBe(4);
  });

  it("replayMixRatio=1.0 pulls historical records and grows the training batch", async () => {
    seedStore(5, { process: "lathe", kind: "failure" });
    engine.enableAutoTrain({ threshold: 4, replayMixRatio: 1.0 });
    watchTicks();
    for (let i = 0; i < 4; i++) feedbackBusEngine.publish("outcome.recorded", { record: busRecord("success") });
    await flush();
    // want = ceil(4 * 1.0) = 4; the store has 5 lathe records (none in the buffer) → mix 4 of them
    expect(lastTick().replayMixed).toBe(4);
    expect(lastTick().samplesUsed).toBe(8); // 4 fresh + 4 replayed
    expect(engine.autoTrainStatus().totalTicks).toBe(1);
  });

  it("replayMaxRecords caps the historical pull", async () => {
    seedStore(50);
    engine.enableAutoTrain({ threshold: 6, replayMixRatio: 1.0, replayMaxRecords: 2 });
    watchTicks();
    for (let i = 0; i < 6; i++) feedbackBusEngine.publish("outcome.recorded", { record: busRecord("failure") });
    await flush();
    // want = min(2, ceil(6*1.0)) = 2
    expect(lastTick().replayMixed).toBe(2);
    expect(lastTick().samplesUsed).toBe(8);
    expect(engine.autoTrainStatus().replayMaxRecords).toBe(2);
  });

  it("empty store → replayMixed=0 (nothing to pull)", async () => {
    // store cleared in beforeEach; do not seed
    engine.enableAutoTrain({ threshold: 3, replayMixRatio: 2.0 });
    watchTicks();
    for (let i = 0; i < 3; i++) feedbackBusEngine.publish("outcome.recorded", { record: busRecord("success") });
    await flush();
    expect(lastTick().replayMixed).toBe(0);
    expect(lastTick().samplesUsed).toBe(3);
  });

  it("store with only pending records → replayMixed=0 (non-terminal filtered out)", async () => {
    for (let i = 0; i < 10; i++) crossProcessOutcomeStore.record({ bridge: "sf", process: "mill" }); // pending
    engine.enableAutoTrain({ threshold: 3, replayMixRatio: 1.0 });
    watchTicks();
    for (let i = 0; i < 3; i++) feedbackBusEngine.publish("outcome.recorded", { record: busRecord("failure") });
    await flush();
    expect(lastTick().replayMixed).toBe(0);
    expect(lastTick().samplesUsed).toBe(3);
  });

  it("dedups historical records that are already in the FIFO buffer", async () => {
    // Seed 3 store records, capture their ids, then push the SAME ids into the buffer.
    const ids = seedStore(3);
    engine.enableAutoTrain({ threshold: 3, replayMixRatio: 1.0 });
    watchTicks();
    for (const id of ids) {
      feedbackBusEngine.publish("outcome.recorded", {
        record: { schemaVersion: "1.0", id, ts: new Date().toISOString(), bridge: "sf", process: "mill", request_summary: { material: "4140" }, response_summary: {}, outcome: { kind: "success" } },
      });
    }
    await flush();
    // all 3 store records share ids with the buffer → all deduped → nothing extra mixed
    expect(lastTick().replayMixed).toBe(0);
    expect(lastTick().samplesUsed).toBe(3);
  });

  it("dedups partially: buffer overlaps the store on some ids, fresh store records top up the rest", async () => {
    const ids = seedStore(3, { kind: "success" }); // store has [a, b, c]
    engine.enableAutoTrain({ threshold: 3, replayMixRatio: 1.0 });
    watchTicks();
    // buffer = [a, b, <new z>] — overlaps store on a,b; z is novel
    feedbackBusEngine.publish("outcome.recorded", { record: { schemaVersion: "1.0", id: ids[0], ts: new Date().toISOString(), bridge: "sf", process: "mill", request_summary: { material: "4140" }, response_summary: {}, outcome: { kind: "success" } } });
    feedbackBusEngine.publish("outcome.recorded", { record: { schemaVersion: "1.0", id: ids[1], ts: new Date().toISOString(), bridge: "sf", process: "mill", request_summary: { material: "4140" }, response_summary: {}, outcome: { kind: "success" } } });
    feedbackBusEngine.publish("outcome.recorded", { record: busRecord("success") });
    await flush();
    // want = 3; store offers a,b (deduped) + c (novel) → only c is mixed
    expect(lastTick().replayMixed).toBe(1);
    expect(lastTick().samplesUsed).toBe(4);
  });

  it("fills `want` across multiple processes when one process is sparse", async () => {
    seedStore(6, { process: "mill", kind: "success" });
    seedStore(1, { process: "lathe", kind: "failure" });
    engine.enableAutoTrain({ threshold: 6, replayMixRatio: 1.0 });
    watchTicks();
    for (let i = 0; i < 6; i++) feedbackBusEngine.publish("outcome.recorded", { record: busRecord("operator_override", "wedm") });
    await flush();
    // want = 6; store has 7 usable terminal records total (6 mill + 1 lathe), none in the buffer → mix 6
    expect(lastTick().replayMixed).toBe(6);
    expect(lastTick().samplesUsed).toBe(12);
  });

  it("autoTrainStatus() reports the effective replay config", () => {
    engine.enableAutoTrain({ threshold: 8, replayMixRatio: 0.3, replayMaxRecords: 100 });
    const s = engine.autoTrainStatus();
    expect(s.replayMixRatio).toBeCloseTo(0.3, 6);
    expect(s.replayMaxRecords).toBe(100);
  });

  it("clamps invalid replay config: negative ratio → 0, NaN ratio → 0, negative cap → 0, oversize cap → 100000", () => {
    engine.enableAutoTrain({ threshold: 2, replayMixRatio: -5 });
    expect(engine.autoTrainStatus().replayMixRatio).toBe(0);
    engine.disableAutoTrain();
    engine.enableAutoTrain({ threshold: 2, replayMixRatio: Number.NaN });
    expect(engine.autoTrainStatus().replayMixRatio).toBe(0);
    engine.disableAutoTrain();
    engine.enableAutoTrain({ threshold: 2, replayMaxRecords: -10 });
    expect(engine.autoTrainStatus().replayMaxRecords).toBe(0);
    engine.disableAutoTrain();
    engine.enableAutoTrain({ threshold: 2, replayMaxRecords: 1e9 });
    expect(engine.autoTrainStatus().replayMaxRecords).toBe(100_000);
  });

  it("replayMaxRecords=0 disables mixing even with a positive ratio", async () => {
    seedStore(20);
    engine.enableAutoTrain({ threshold: 3, replayMixRatio: 1.0, replayMaxRecords: 0 });
    watchTicks();
    for (let i = 0; i < 3; i++) feedbackBusEngine.publish("outcome.recorded", { record: busRecord("success") });
    await flush();
    expect(lastTick().replayMixed).toBe(0);
    expect(lastTick().samplesUsed).toBe(3);
  });

  it("flushAutoTrainBuffer() also mixes in replay (forced tick)", async () => {
    seedStore(5, { process: "lathe", kind: "failure" });
    engine.enableAutoTrain({ threshold: 100, replayMixRatio: 1.0 }); // threshold high → won't auto-fire
    watchTicks();
    for (let i = 0; i < 3; i++) feedbackBusEngine.publish("outcome.recorded", { record: busRecord("success") });
    await flush();
    expect(ticks).toHaveLength(0); // below threshold
    const result = engine.flushAutoTrainBuffer();
    await flush();
    // want = ceil(3 * 1.0) = 3; store has 5 lathe → mix 3 → batch = 3 fresh + 3 replayed
    expect((result as { samplesUsed: number } | null)?.samplesUsed).toBe(6); // also asserts result !== null
    expect(ticks).toHaveLength(1);
    expect(lastTick().forced).toBe(true);
    expect(lastTick().replayMixed).toBe(3);
    expect(lastTick().samplesUsed).toBe(6);
  });

  it("backward-compat: enableAutoTrain({threshold}) with no replay opts behaves exactly as before", async () => {
    seedStore(20); // store is full but should be ignored
    engine.enableAutoTrain({ threshold: 5 });
    watchTicks();
    expect(engine.autoTrainStatus().replayMixRatio).toBe(0);
    expect(engine.autoTrainStatus().replayMaxRecords).toBe(256);
    for (let i = 0; i < 5; i++) feedbackBusEngine.publish("outcome.recorded", { record: busRecord("success") });
    await flush();
    expect(lastTick().replayMixed).toBe(0);
    expect(lastTick().samplesUsed).toBe(5);
  });
});
