/**
 * INFRA-NEURAL-LEDGER-MS1 / P0-U04 — Neural feedback bus E2E.
 *
 * Verifies the closed-loop primitive:
 *
 *   CrossProcessOutcomeStore.record()       → publishes "outcome.recorded"
 *   CrossProcessOutcomeStore.recordOutcome() → publishes "outcome.completed"
 *
 *   subscribed engines (all 3 per the P0-U04 spec):
 *     1. CrossProcessNeuralLearningEngine        (outcome.recorded → auto-train buffer)
 *     2. OutcomeDriftCalibrationBridgeEngine     (outcome.completed → drift + calibration)
 *     3. CAMLoRAAdapterTrainerEngine             (outcome.recorded → per-CAM observation buffer)
 *
 * The spec's exit conditions force this file to assert:
 *   - subscribe + publish round-trip                            → §1
 *   - subscriber error does not prevent other subscribers       → §2
 *   - publish to non-existent domain is no-op                   → §3
 *   - E2E mill job → ALL 3 subscribers get the event            → §4
 *
 * Plus regression coverage for:
 *   - LoRA per-CAM dispatch (process="mill" + request_summary.cam_system="mastercam")
 *   - LoRA idempotent dedup on a replayed event id
 *   - Drift bridge fires only on outcome.completed (not outcome.recorded)
 *   - Disable cycle cleans up bus subscriptions
 *
 * Why a separate file from the per-engine tests:
 *   FeedbackBusEngine.test.ts covers the bus primitive in isolation;
 *   CrossProcessOutcomeStore.feedbackbus.test.ts covers the store→bus
 *   bridge; each subscriber engine has its own unit tests. This file is
 *   the ONLY one that wires all four together end-to-end, which is what
 *   the unit acceptance criterion "verify ALL 3 subscribers get the event"
 *   demands.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  CrossProcessOutcomeStore,
} from "../engines/CrossProcessOutcomeStore.js";
import {
  feedbackBusEngine,
  type FeedbackEvent,
} from "../engines/FeedbackBusEngine.js";
import { crossProcessNeuralLearningEngine } from "../engines/CrossProcessNeuralLearningEngine.js";
import { camLoRAAdapterTrainerEngine } from "../engines/CAMLoRAAdapterTrainerEngine.js";
import { OutcomeDriftCalibrationBridgeEngine } from "../engines/OutcomeDriftCalibrationBridgeEngine.js";

// queueMicrotask + async-promise fan-out means a publish() returns before
// any subscriber has run. Two flushes drain the wrapper microtask and any
// promise rejection .catch handler attached to async callbacks.
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

/** Fresh store per test — the singletons are reset via their public APIs. */
function makeStore() {
  return new CrossProcessOutcomeStore();
}

/** Pull engine subscribers off the bus and clear their internal state. */
function detachAndResetAllSubscribers() {
  // Order matters only for tidiness: detach before reset so the bus stats
  // reflect the engines' true subscription count when we assert later.
  if (crossProcessNeuralLearningEngine.autoTrainStatus().active) {
    crossProcessNeuralLearningEngine.disableAutoTrain();
  }
  if (camLoRAAdapterTrainerEngine.isObservingOutcomes()) {
    camLoRAAdapterTrainerEngine.disableOutcomeObservation();
  }
  camLoRAAdapterTrainerEngine.clearObservations();
  OutcomeDriftCalibrationBridgeEngine.reset();
}

describe("P0-U04 feedback bus E2E — three subscribers, one mill job", () => {
  beforeEach(() => {
    detachAndResetAllSubscribers();
    feedbackBusEngine.reset();
  });

  afterEach(() => {
    detachAndResetAllSubscribers();
    feedbackBusEngine.reset();
  });

  // ──────────────────────────────────────────────────────────────
  // §1 subscribe + publish round-trip (exit condition 1 of P0-U04)
  // ──────────────────────────────────────────────────────────────

  it("[§1] subscribe + publish round-trip delivers exactly the event", async () => {
    const received: FeedbackEvent[] = [];
    feedbackBusEngine.subscribe("p2p.emitted", (e) => {
      received.push(e);
    });

    feedbackBusEngine.publish("p2p.emitted", { jobId: "JOB-1", domain: "mill" });
    await flush();

    expect(received).toHaveLength(1);
    expect(received[0].topic).toBe("p2p.emitted");
    expect(received[0].payload).toEqual({ jobId: "JOB-1", domain: "mill" });
  });

  // ──────────────────────────────────────────────────────────────
  // §2 subscriber error isolation (exit condition 2 of P0-U04)
  // ──────────────────────────────────────────────────────────────

  it("[§2] a crashing subscriber does not prevent the other two from firing", async () => {
    let aHits = 0;
    let cHits = 0;
    feedbackBusEngine.subscribe("outcome.recorded", () => {
      aHits++;
    });
    feedbackBusEngine.subscribe("outcome.recorded", () => {
      throw new Error("intentional test crash");
    });
    feedbackBusEngine.subscribe("outcome.recorded", () => {
      cHits++;
    });

    const store = makeStore();
    store.record({
      bridge: "sf",
      process: "mill",
      outcome: { kind: "success" },
    });
    await flush();

    expect(aHits).toBe(1);
    expect(cHits).toBe(1);
    expect(feedbackBusEngine.stats().totalSubscriberErrors).toBe(1);
  });

  // ──────────────────────────────────────────────────────────────
  // §3 publish to a non-existent domain is a no-op
  // ──────────────────────────────────────────────────────────────

  it("[§3] publish to a topic with no subscribers is a no-op (stats still update)", async () => {
    expect(() => feedbackBusEngine.publish("nobody.listens", { x: 1 })).not.toThrow();
    await flush();
    const s = feedbackBusEngine.stats();
    expect(s.totalPublished).toBe(1);
    expect(s.totalDelivered).toBe(0);
    expect(s.totalSubscriberErrors).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────
  // §4 E2E: mill job lifecycle → all 3 subscribers get their event
  // (the central P0-U04 exit condition)
  // ──────────────────────────────────────────────────────────────

  it("[§4] simulate a mill job; ALL three subscribers observe their respective topics", async () => {
    // Wire all three subscribers up via their public enable* APIs.
    crossProcessNeuralLearningEngine.enableAutoTrain({ threshold: 100 });
    camLoRAAdapterTrainerEngine.enableOutcomeObservation();
    OutcomeDriftCalibrationBridgeEngine.subscribeToOutcomes();

    expect(crossProcessNeuralLearningEngine.autoTrainStatus().active).toBe(true);
    expect(camLoRAAdapterTrainerEngine.isObservingOutcomes()).toBe(true);
    expect(OutcomeDriftCalibrationBridgeEngine.isSubscribedToOutcomes()).toBe(true);

    // Confirm the bus carries exactly three subscribers across two topics:
    //   - "outcome.recorded": neural learner + LoRA trainer
    //   - "outcome.completed": drift bridge
    expect(feedbackBusEngine.subscriberCount("outcome.recorded")).toBe(2);
    expect(feedbackBusEngine.subscriberCount("outcome.completed")).toBe(1);

    // Phase 1 — mill job kicks off, immediately records as success
    // with `cam_system=mastercam` so the LoRA trainer can attribute it.
    const store = makeStore();
    const id = store.record({
      bridge: "sf",
      process: "mill",
      jobId: "JOB-MILL-001",
      request_summary: {
        material: "4140",
        tool_diameter_mm: 12,
        cam_system: "mastercam",
        spindle_rpm: 1800,
        feed_mm_min: 380,
      },
      response_summary: { dialect: "fanuc", lines: 412 },
      outcome: { kind: "success" },
    });
    await flush();

    // Subscriber 1: neural learner buffered the labelled record.
    const ntStatus = crossProcessNeuralLearningEngine.autoTrainStatus();
    expect(ntStatus.bufferedSamples).toBe(1);

    // Subscriber 2: LoRA trainer attributed it to mastercam.
    const loraStatus = camLoRAAdapterTrainerEngine.getObservationStatus();
    expect(loraStatus.totalObserved).toBe(1);
    expect(loraStatus.byCam.mastercam).toBe(1);
    expect(loraStatus.byCam.hypermill).toBe(0);
    expect(loraStatus.byCam.fusion360).toBe(0);
    expect(loraStatus.byCam["inventor-hsm"]).toBe(0);
    const mastercamBuf = camLoRAAdapterTrainerEngine.getObservationBuffer("mastercam");
    expect(mastercamBuf).toHaveLength(1);
    expect(mastercamBuf[0].outcomeId).toBe(id);
    expect(mastercamBuf[0].kind).toBe("success");
    expect(mastercamBuf[0].request_summary.material).toBe("4140");

    // Subscriber 3 (drift bridge) does NOT fire on outcome.recorded.
    expect(OutcomeDriftCalibrationBridgeEngine.stats().total_events_seen).toBe(0);

    // Phase 2 — drive a pending → terminal transition so the store publishes
    // `outcome.completed`, which is the only topic the drift bridge listens
    // to. (CrossProcessOutcomeStore.recordOutcome() only emits on a
    // genuine kind change, see CrossProcessOutcomeStore.ts:307.)
    const pendingId = store.record({
      bridge: "sf",
      process: "mill",
      jobId: "JOB-MILL-002",
      request_summary: { material: "1018", cam_system: "mastercam" },
      response_summary: {},
      outcome: { kind: "pending" },
    });
    await flush();

    // Pending outcomes do NOT increment any subscriber's "observed" count:
    //   - neural learner: recordToLabel(pending) === null → skipped
    //   - LoRA trainer: explicit pending filter → skipped (totalSkipped += 1)
    //   - drift bridge: outcome.recorded path only (still listening to completed)
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().bufferedSamples).toBe(1);
    expect(camLoRAAdapterTrainerEngine.getObservationStatus().totalObserved).toBe(1);
    expect(camLoRAAdapterTrainerEngine.getObservationStatus().totalSkipped).toBeGreaterThanOrEqual(1);
    expect(OutcomeDriftCalibrationBridgeEngine.stats().total_events_seen).toBe(0);

    // Now drive the pending → failure transition.
    const transitioned = store.recordOutcome(pendingId, { kind: "failure" });
    expect(transitioned).toBe(true); // recordOutcome returns true on known id (CrossProcessOutcomeStore.ts:299)
    await flush();

    expect(OutcomeDriftCalibrationBridgeEngine.stats().total_events_seen).toBe(1);
  });

  // ──────────────────────────────────────────────────────────────
  // §5 per-CAM dispatch in the LoRA observer
  // ──────────────────────────────────────────────────────────────

  it("[§5] LoRA observer dispatches by cam_system across all 4 priority CAMs", async () => {
    camLoRAAdapterTrainerEngine.enableOutcomeObservation();
    const store = makeStore();

    for (const cam of ["mastercam", "hypermill", "fusion360", "inventor-hsm"]) {
      store.record({
        bridge: "sf",
        process: "mill",
        request_summary: { cam_system: cam },
        outcome: { kind: "success" },
      });
    }
    await flush();

    const status = camLoRAAdapterTrainerEngine.getObservationStatus();
    expect(status.totalObserved).toBe(4);
    expect(status.byCam.mastercam).toBe(1);
    expect(status.byCam.hypermill).toBe(1);
    expect(status.byCam.fusion360).toBe(1);
    expect(status.byCam["inventor-hsm"]).toBe(1);
    expect(status.totalSkipped).toBe(0);
  });

  it("[§5b] LoRA observer skips outcomes with no recognizable CAM hint", async () => {
    camLoRAAdapterTrainerEngine.enableOutcomeObservation();
    const store = makeStore();

    store.record({
      bridge: "sf",
      process: "mill",
      // no cam_system; process="mill" is not a CAM slug
      outcome: { kind: "success" },
    });
    store.record({
      bridge: "sf",
      process: "lathe",
      request_summary: { cam_system: "siemens-nx" }, // not in PRIORITY_4
      outcome: { kind: "success" },
    });
    await flush();

    const status = camLoRAAdapterTrainerEngine.getObservationStatus();
    expect(status.totalObserved).toBe(0);
    expect(status.totalSkipped).toBe(2);
  });

  // ──────────────────────────────────────────────────────────────
  // §6 idempotent dedup — same OutcomeRecord.id replayed twice
  // ──────────────────────────────────────────────────────────────

  it("[§6] LoRA observer is idempotent — replaying the same outcomeId is a no-op", async () => {
    camLoRAAdapterTrainerEngine.enableOutcomeObservation();
    const store = makeStore();

    const id = store.record({
      bridge: "sf",
      process: "mill",
      request_summary: { cam_system: "fusion360" },
      outcome: { kind: "success" },
    });
    await flush();

    expect(camLoRAAdapterTrainerEngine.getObservationStatus().byCam.fusion360).toBe(1);

    // Manually replay the same event payload on the bus — exercises the
    // dedup path inside observeOutcome() (real-world cause: a peer engine
    // re-emits, or the bus runs through a recovery replay).
    feedbackBusEngine.publish("outcome.recorded", {
      id,
      bridge: "sf",
      process: "mill",
      outcomeKind: "success",
      record: {
        schemaVersion: "1.0.0",
        id,
        ts: new Date().toISOString(),
        bridge: "sf",
        process: "mill",
        request_summary: { cam_system: "fusion360" },
        response_summary: {},
        outcome: { kind: "success" },
      },
    });
    await flush();

    const status = camLoRAAdapterTrainerEngine.getObservationStatus();
    expect(status.byCam.fusion360).toBe(1); // still 1 — dedup'd
    expect(status.totalSkipped).toBeGreaterThanOrEqual(1);
  });

  // ──────────────────────────────────────────────────────────────
  // §6b drift bridge ignores outcome.recorded (topic-filter proof)
  // ──────────────────────────────────────────────────────────────

  it("[§6b] drift bridge subscribed to outcome.completed does NOT fire on a manual outcome.recorded publish", async () => {
    OutcomeDriftCalibrationBridgeEngine.subscribeToOutcomes();
    expect(OutcomeDriftCalibrationBridgeEngine.isSubscribedToOutcomes()).toBe(true);

    // Hand-craft an outcome.recorded payload with a TERMINAL outcome — proves
    // the drift bridge's topic filter (not its kind filter) is what suppresses
    // the event. If the bridge ever accidentally subscribed to outcome.recorded
    // too, this test would catch it.
    feedbackBusEngine.publish("outcome.recorded", {
      id: "evt-synthetic-1",
      bridge: "sf",
      process: "mill",
      outcomeKind: "failure",
      record: {
        schemaVersion: "1.0.0",
        id: "evt-synthetic-1",
        ts: new Date().toISOString(),
        bridge: "sf",
        process: "mill",
        request_summary: {},
        response_summary: {},
        outcome: { kind: "failure" },
      },
    });
    await flush();

    expect(OutcomeDriftCalibrationBridgeEngine.stats().total_events_seen).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────
  // §7 disable cycle cleans up bus state
  // ──────────────────────────────────────────────────────────────

  it("[§7] disable cycle detaches all three subscribers cleanly", async () => {
    crossProcessNeuralLearningEngine.enableAutoTrain({ threshold: 100 });
    camLoRAAdapterTrainerEngine.enableOutcomeObservation();
    OutcomeDriftCalibrationBridgeEngine.subscribeToOutcomes();

    expect(feedbackBusEngine.subscriberCount("outcome.recorded")).toBe(2);
    expect(feedbackBusEngine.subscriberCount("outcome.completed")).toBe(1);

    expect(crossProcessNeuralLearningEngine.disableAutoTrain()).toBe(true);
    expect(camLoRAAdapterTrainerEngine.disableOutcomeObservation()).toBe(true);
    expect(OutcomeDriftCalibrationBridgeEngine.unsubscribeFromOutcomes().wasSubscribed).toBe(true);

    expect(feedbackBusEngine.subscriberCount("outcome.recorded")).toBe(0);
    expect(feedbackBusEngine.subscriberCount("outcome.completed")).toBe(0);

    // Idempotent re-disable
    expect(crossProcessNeuralLearningEngine.disableAutoTrain()).toBe(false);
    expect(camLoRAAdapterTrainerEngine.disableOutcomeObservation()).toBe(false);
    expect(OutcomeDriftCalibrationBridgeEngine.unsubscribeFromOutcomes().wasSubscribed).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────
  // §8 LoRA buffer cap (FIFO eviction)
  // ──────────────────────────────────────────────────────────────

  it("[§8] LoRA observation buffer respects bufferCap with FIFO eviction; counters stay monotonic", async () => {
    camLoRAAdapterTrainerEngine.enableOutcomeObservation({ bufferCap: 3 });
    const store = makeStore();

    for (let i = 0; i < 5; i++) {
      store.record({
        bridge: "sf",
        process: "mill",
        request_summary: { cam_system: "hypermill", iter: i },
        outcome: { kind: "success" },
      });
    }
    await flush();

    const status = camLoRAAdapterTrainerEngine.getObservationStatus();
    // Counter is monotonic — all 5 were observed.
    expect(status.byCam.hypermill).toBe(5);
    expect(status.totalObserved).toBe(5);
    // But the per-CAM buffer is capped at 3 — oldest 2 evicted.
    const buf = camLoRAAdapterTrainerEngine.getObservationBuffer("hypermill");
    expect(buf).toHaveLength(3);
    // Verify FIFO order — last three iter values are 2,3,4.
    expect(buf.map((o) => (o.request_summary.iter as number))).toEqual([2, 3, 4]);
  });

  // ──────────────────────────────────────────────────────────────
  // §9 enable is idempotent — calling twice returns the same handle
  // ──────────────────────────────────────────────────────────────

  it("[§9] LoRA enableOutcomeObservation is idempotent (same handle, single bus subscription)", () => {
    const h1 = camLoRAAdapterTrainerEngine.enableOutcomeObservation();
    const h2 = camLoRAAdapterTrainerEngine.enableOutcomeObservation();
    expect(h1.id).toBe(h2.id);
    expect(feedbackBusEngine.subscriberCount("outcome.recorded")).toBe(1);
  });

  it("[§9b] bufferCap is applied even when enableOutcomeObservation re-subscribes", () => {
    camLoRAAdapterTrainerEngine.enableOutcomeObservation({ bufferCap: 5 });
    expect(camLoRAAdapterTrainerEngine.getObservationStatus().bufferCap).toBe(5);
    // Re-enable with a NEW cap on an already-subscribed engine — must take effect.
    camLoRAAdapterTrainerEngine.enableOutcomeObservation({ bufferCap: 12 });
    expect(camLoRAAdapterTrainerEngine.getObservationStatus().bufferCap).toBe(12);
    // Re-enable with no opts — leaves the live cap alone.
    camLoRAAdapterTrainerEngine.enableOutcomeObservation();
    expect(camLoRAAdapterTrainerEngine.getObservationStatus().bufferCap).toBe(12);
  });

  it("[§9c] clearObservations() resets bufferCap to DEFAULT_OBSERVATION_CAP", () => {
    camLoRAAdapterTrainerEngine.enableOutcomeObservation({ bufferCap: 7 });
    expect(camLoRAAdapterTrainerEngine.getObservationStatus().bufferCap).toBe(7);
    camLoRAAdapterTrainerEngine.clearObservations();
    // 1000 is the canonical DEFAULT_OBSERVATION_CAP — see CAMLoRAAdapterTrainerEngine.ts.
    expect(camLoRAAdapterTrainerEngine.getObservationStatus().bufferCap).toBe(1000);
  });

  // ──────────────────────────────────────────────────────────────
  // §10 status snapshot includes bus delivery counter at read time
  // ──────────────────────────────────────────────────────────────

  it("[§10] getObservationStatus reports live bus delivery counter", async () => {
    camLoRAAdapterTrainerEngine.enableOutcomeObservation();
    const store = makeStore();

    const before = camLoRAAdapterTrainerEngine.getObservationStatus().busDeliveredAtRead;
    store.record({
      bridge: "sf",
      process: "mill",
      request_summary: { cam_system: "mastercam" },
      outcome: { kind: "failure" },
    });
    await flush();
    const after = camLoRAAdapterTrainerEngine.getObservationStatus().busDeliveredAtRead;

    expect(after).toBeGreaterThan(before);
  });
});
