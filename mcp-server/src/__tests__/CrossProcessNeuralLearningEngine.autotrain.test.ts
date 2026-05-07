/**
 * U-NN-LOOP03 — CrossProcessNeuralLearningEngine auto-train wiring tests.
 *
 * Verifies that:
 *   - enableAutoTrain() registers a 'outcome.recorded' subscription
 *   - records below threshold accumulate without firing train
 *   - hitting threshold triggers train + publishes 'neural.train.tick'
 *   - pending outcomes are filtered out (no label = skip, no buffer growth)
 *   - disableAutoTrain() unsubscribes and clears the buffer
 *   - re-enable without disable throws (catches misuse before silent leak)
 *   - flushAutoTrainBuffer() trains on a partial batch and publishes
 *     a tick with forced=true
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  CrossProcessNeuralLearningEngine,
} from "../engines/CrossProcessNeuralLearningEngine.js";
import {
  feedbackBusEngine,
  type FeedbackEvent,
} from "../engines/FeedbackBusEngine.js";
import { CrossProcessOutcomeStore } from "../engines/CrossProcessOutcomeStore.js";

// Drain N microtask cycles. The auto-train chain is:
//   publish('outcome.recorded') → queueMicrotask → auto-train subscriber
//   → bus.publish('neural.train.tick') → queueMicrotask → tick subscribers
// Each `await Promise.resolve()` yields once, draining one cycle. We need
// at least 2 cycles to deliver tick events; 4 is generously safe and still
// O(1) — no real waiting, just yielding to the queue.
const flush = async () => {
  for (let i = 0; i < 4; i++) {
    await Promise.resolve();
  }
};

function makeRecord(kind: "success" | "failure" | "operator_override" | "pending") {
  // Thin OutcomeRecord shape sufficient for recordToLabel + featurize.
  // Uses real bridge/process enums so featurize one-hot slots are valid.
  return {
    schemaVersion: "1.0",
    id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    ts: new Date().toISOString(),
    bridge: "sf" as const,
    process: "mill" as const,
    request_summary: { material: "4140", tool_diameter_mm: 12 },
    response_summary: {},
    outcome: { kind },
  };
}

describe("CrossProcessNeuralLearningEngine auto-train (U-NN-LOOP03)", () => {
  let engine: CrossProcessNeuralLearningEngine;

  beforeEach(() => {
    engine = new CrossProcessNeuralLearningEngine();
    feedbackBusEngine.reset();
  });

  afterEach(() => {
    // Defensive cleanup so cross-test leakage can't fire phantom train ticks.
    engine.disableAutoTrain();
    feedbackBusEngine.reset();
  });

  it("enableAutoTrain() registers a subscription on 'outcome.recorded'", () => {
    expect(engine.autoTrainStatus().active).toBe(false);
    const handle = engine.enableAutoTrain({ threshold: 4 });
    expect(handle.topic).toBe("outcome.recorded");
    expect(engine.autoTrainStatus().active).toBe(true);
    expect(engine.autoTrainStatus().threshold).toBe(4);
    expect(feedbackBusEngine.subscriberCount("outcome.recorded")).toBe(1);
  });

  it("buffers labelled records below threshold without firing train", async () => {
    engine.enableAutoTrain({ threshold: 5 });

    const ticks: FeedbackEvent[] = [];
    feedbackBusEngine.subscribe("neural.train.tick", (e) => {
      ticks.push(e);
    });

    for (let i = 0; i < 4; i++) {
      feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("success") });
    }
    await flush();

    const status = engine.autoTrainStatus();
    expect(status.bufferedSamples).toBe(4);
    expect(status.totalTicks).toBe(0);
    expect(status.totalSamplesSeen).toBe(0); // train() never ran
    expect(ticks.length).toBe(0);
  });

  it("fires train + publishes 'neural.train.tick' when threshold is reached", async () => {
    engine.enableAutoTrain({ threshold: 5, trainOpts: { epochs: 1 } });

    const ticks: FeedbackEvent[] = [];
    feedbackBusEngine.subscribe("neural.train.tick", (e) => {
      ticks.push(e);
    });

    // Mix labels so the classifier sees more than one class.
    const labels = ["success", "failure", "success", "operator_override", "failure"] as const;
    for (const k of labels) {
      feedbackBusEngine.publish("outcome.recorded", { record: makeRecord(k) });
    }
    await flush();

    expect(ticks.length).toBe(1);
    const payload = ticks[0].payload as {
      tick: number;
      samplesUsed: number;
      samplesSkipped: number;
      totalSamplesSeen: number;
    };
    expect(payload.tick).toBe(1);
    expect(payload.samplesUsed).toBe(5);
    expect(payload.samplesSkipped).toBe(0);
    expect(payload.totalSamplesSeen).toBe(5);

    const status = engine.autoTrainStatus();
    expect(status.bufferedSamples).toBe(0); // buffer flushed after train
    expect(status.totalTicks).toBe(1);
    expect(status.totalSamplesSeen).toBe(5);
  });

  it("pending outcomes do NOT advance the buffer (no label = skip)", async () => {
    engine.enableAutoTrain({ threshold: 3 });

    for (let i = 0; i < 5; i++) {
      feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("pending") });
    }
    await flush();

    const status = engine.autoTrainStatus();
    expect(status.bufferedSamples).toBe(0);
    expect(status.totalTicks).toBe(0);
  });

  it("mixed pending + labelled — only labelled advance the buffer toward threshold", async () => {
    engine.enableAutoTrain({ threshold: 3 });

    const ticks: FeedbackEvent[] = [];
    feedbackBusEngine.subscribe("neural.train.tick", (e) => {
      ticks.push(e);
    });

    // 4 pending interleaved with 3 labelled — only the 3 labelled count.
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("pending") });
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("success") });
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("pending") });
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("failure") });
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("pending") });
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("success") }); // hits threshold=3
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("pending") });
    await flush();

    expect(ticks.length).toBe(1);
    expect((ticks[0].payload as { samplesUsed: number }).samplesUsed).toBe(3);
    expect(engine.autoTrainStatus().bufferedSamples).toBe(0);
  });

  it("disableAutoTrain() unsubscribes and clears the buffer", async () => {
    engine.enableAutoTrain({ threshold: 100 });
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("success") });
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("failure") });
    await flush();
    expect(engine.autoTrainStatus().bufferedSamples).toBe(2);

    const removed = engine.disableAutoTrain();
    expect(removed).toBe(true);
    expect(engine.autoTrainStatus().active).toBe(false);
    expect(engine.autoTrainStatus().bufferedSamples).toBe(0);
    expect(feedbackBusEngine.subscriberCount("outcome.recorded")).toBe(0);

    // Idempotent: second call returns false
    expect(engine.disableAutoTrain()).toBe(false);
  });

  it("re-enabling without disabling first throws (catches silent double-subscribe)", () => {
    engine.enableAutoTrain({ threshold: 10 });
    expect(() => engine.enableAutoTrain({ threshold: 10 })).toThrow(/already active/);
    // After cleanup, re-enable works
    engine.disableAutoTrain();
    expect(() => engine.enableAutoTrain({ threshold: 10 })).not.toThrow();
  });

  it("flushAutoTrainBuffer() forces a train on a partial batch and emits a 'forced' tick", async () => {
    engine.enableAutoTrain({ threshold: 100 });

    const ticks: FeedbackEvent[] = [];
    feedbackBusEngine.subscribe("neural.train.tick", (e) => {
      ticks.push(e);
    });

    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("success") });
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("failure") });
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("success") });
    await flush();
    expect(ticks.length).toBe(0);
    expect(engine.autoTrainStatus().bufferedSamples).toBe(3);

    const result = engine.flushAutoTrainBuffer();
    await flush();

    expect(result).not.toBeNull();
    expect(result!.samplesUsed).toBe(3);
    expect(ticks.length).toBe(1);
    const payload = ticks[0].payload as { samplesUsed: number; forced?: boolean };
    expect(payload.samplesUsed).toBe(3);
    expect(payload.forced).toBe(true);
    expect(engine.autoTrainStatus().bufferedSamples).toBe(0);

    // Empty buffer flush returns null and emits no tick
    const result2 = engine.flushAutoTrainBuffer();
    await flush();
    expect(result2).toBeNull();
    expect(ticks.length).toBe(1);
  });

  it("end-to-end: OutcomeStore.record() drives auto-train through FeedbackBus", async () => {
    const store = new CrossProcessOutcomeStore();
    engine.enableAutoTrain({ threshold: 4 });

    const ticks: FeedbackEvent[] = [];
    feedbackBusEngine.subscribe("neural.train.tick", (e) => {
      ticks.push(e);
    });

    // record() publishes 'outcome.recorded' (LOOP02 wiring) → engine consumes
    store.record({ bridge: "sf", process: "mill", outcome: { kind: "success" } });
    store.record({ bridge: "ai", process: "lathe", outcome: { kind: "failure" } });
    store.record({ bridge: "router", process: "wedm", outcome: { kind: "operator_override" } });
    store.record({ bridge: "post", process: "mill", outcome: { kind: "success" } });
    await flush();

    expect(ticks.length).toBe(1);
    expect((ticks[0].payload as { samplesUsed: number }).samplesUsed).toBe(4);
    expect(engine.autoTrainStatus().totalTicks).toBe(1);
    expect(engine.autoTrainStatus().totalSamplesSeen).toBe(4);

    // Pending records from store do NOT advance the buffer
    store.record({ bridge: "sf", process: "mill" }); // defaults to pending
    store.record({ bridge: "sf", process: "mill" });
    await flush();

    expect(ticks.length).toBe(1); // unchanged
    expect(engine.autoTrainStatus().bufferedSamples).toBe(0);
  });

  it("subscriber survives malformed payload (missing record) without crashing", async () => {
    engine.enableAutoTrain({ threshold: 2 });

    // Bus ignores subscriber crashes — but we want the auto-train subscriber
    // itself to be defensive. Publishing a payload without `record` should
    // be a silent no-op (no crash, no buffer growth).
    feedbackBusEngine.publish("outcome.recorded", { id: "evt-missing-record" });
    feedbackBusEngine.publish("outcome.recorded", null);
    feedbackBusEngine.publish("outcome.recorded", undefined);
    await flush();

    expect(engine.autoTrainStatus().bufferedSamples).toBe(0);
    expect(feedbackBusEngine.stats().totalSubscriberErrors).toBe(0);
  });
});
