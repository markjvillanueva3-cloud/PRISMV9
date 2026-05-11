/**
 * XProcNeuralAutoFireEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN09 tests.
 *
 * The auto-fire engine ignites the closed-loop learning system: it turns on the
 * NN auto-train subscription (CrossProcessNeuralLearningEngine.enableAutoTrain)
 * plus all four fan-out bridges (CN04 tribal, CN06 drift/calibration, CN07
 * replay/sampler, CN08 episodic). These tests verify, against the REAL singletons
 * and the real FeedbackBus (no mocks except the deliberate fault-injection spy):
 *   - activate() flips every switch when none were on, idempotently
 *   - it records which switches IT owns vs ones already active
 *   - deactivate() reverses only the owned switches
 *   - one failing component never blocks the rest (errors counted, others enabled)
 *   - status() reports per-component live state + the configured threshold
 *   - the wire is live end-to-end: after activate(), publishing 'outcome.recorded'
 *     buffers a sample in the NN and crossing the threshold triggers a retrain tick
 *   - the dispatch wrapper routes the three actions and rejects unknowns
 *
 * Teardown is thorough (disableAutoTrain + reset all four bridges + reset the
 * auto-fire engine + reset the bus) so nothing leaks into sibling test files.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  XProcNeuralAutoFireEngine,
  xProcNeuralAutoFireDispatch,
} from "../engines/XProcNeuralAutoFireEngine.js";
import { crossProcessNeuralLearningEngine } from "../engines/CrossProcessNeuralLearningEngine.js";
import { TribalKnowledgeOutcomeBridgeEngine } from "../engines/TribalKnowledgeOutcomeBridgeEngine.js";
import { OutcomeDriftCalibrationBridgeEngine } from "../engines/OutcomeDriftCalibrationBridgeEngine.js";
import { OutcomeReplayBufferBridgeEngine } from "../engines/OutcomeReplayBufferBridgeEngine.js";
import { OutcomeEpisodicMemoryBridgeEngine } from "../engines/OutcomeEpisodicMemoryBridgeEngine.js";
import { OutcomeRLBridgeEngine } from "../engines/OutcomeRLBridgeEngine.js";
import { feedbackBusEngine, type FeedbackEvent } from "../engines/FeedbackBusEngine.js";
import { crossProcessOutcomeStore } from "../engines/CrossProcessOutcomeStore.js";

// Drain N microtask cycles — the bus delivers via queueMicrotask.
const flush = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

// Thin OutcomeRecord sufficient for recordToLabel + featurize (real bridge/process enums).
function makeRecord(kind: "success" | "failure" | "operator_override" | "pending") {
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

/** Force every switch OFF and clear the bus, so each test starts from inert. */
function hardResetAll(): void {
  try {
    if (crossProcessNeuralLearningEngine.autoTrainStatus().active) {
      crossProcessNeuralLearningEngine.disableAutoTrain();
    }
  } catch {
    /* ignore */
  }
  TribalKnowledgeOutcomeBridgeEngine.reset();
  OutcomeDriftCalibrationBridgeEngine.reset();
  OutcomeReplayBufferBridgeEngine.reset();
  OutcomeEpisodicMemoryBridgeEngine.reset();
  OutcomeRLBridgeEngine.reset(); // U-CN12 — 6th fan-out bridge
  XProcNeuralAutoFireEngine.reset();
  crossProcessOutcomeStore.clear();
  feedbackBusEngine.reset();
}

function allActive(): boolean {
  return (
    crossProcessNeuralLearningEngine.autoTrainStatus().active &&
    TribalKnowledgeOutcomeBridgeEngine.isSubscribedToOutcomes() &&
    OutcomeDriftCalibrationBridgeEngine.isSubscribedToOutcomes() &&
    OutcomeReplayBufferBridgeEngine.isSubscribedToOutcomes() &&
    OutcomeEpisodicMemoryBridgeEngine.isSubscribedToOutcomes() &&
    OutcomeRLBridgeEngine.isSubscribedToOutcomes()
  );
}

function noneActive(): boolean {
  return (
    !crossProcessNeuralLearningEngine.autoTrainStatus().active &&
    !TribalKnowledgeOutcomeBridgeEngine.isSubscribedToOutcomes() &&
    !OutcomeDriftCalibrationBridgeEngine.isSubscribedToOutcomes() &&
    !OutcomeReplayBufferBridgeEngine.isSubscribedToOutcomes() &&
    !OutcomeEpisodicMemoryBridgeEngine.isSubscribedToOutcomes() &&
    !OutcomeRLBridgeEngine.isSubscribedToOutcomes()
  );
}

const COMPONENT_KEYS = [
  "neural_auto_train",
  "tribal_bridge",
  "drift_calibration_bridge",
  "replay_buffer_bridge",
  "episodic_memory_bridge",
  "rl_bridge", // U-CN12
] as const;

beforeEach(() => {
  hardResetAll();
});

afterEach(() => {
  hardResetAll();
  vi.restoreAllMocks();
});

describe("XProcNeuralAutoFireEngine — activate()", () => {
  it("starts inert: nothing subscribed before activate()", () => {
    expect(noneActive()).toBe(true);
    expect(XProcNeuralAutoFireEngine.isActivated()).toBe(false);
  });

  it("turns on the NN auto-train + all four bridges in one call", () => {
    const r = XProcNeuralAutoFireEngine.activate();
    expect(r.ok).toBe(true);
    expect(r.alreadyActivated).toBe(false);
    expect(r.errors).toBe(0);
    expect(r.activatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(allActive()).toBe(true);
    expect(XProcNeuralAutoFireEngine.isActivated()).toBe(true);
  });

  it("reports every component as 'enabled' + ownedByAutoFire on a cold activate", () => {
    const r = XProcNeuralAutoFireEngine.activate();
    expect(r.components.map((c) => c.key).sort()).toEqual([...COMPONENT_KEYS].sort());
    for (const c of r.components) {
      expect(c.action).toBe("enabled");
      expect(c.ownedByAutoFire).toBe(true);
    }
  });

  it("registers exactly one bus subscriber per outcome topic after activate()", () => {
    XProcNeuralAutoFireEngine.activate();
    // NN auto-train listens on 'outcome.recorded'; CN04 tribal bridge also on 'outcome.recorded'.
    expect(feedbackBusEngine.subscriberCount("outcome.recorded")).toBe(2);
    // CN06/07/08/12 bridges (drift_cal, replay, episodic, rl) all listen on 'outcome.completed'.
    expect(feedbackBusEngine.subscriberCount("outcome.completed")).toBe(4);
  });

  it("is idempotent: a second activate() while active is a no-op", () => {
    XProcNeuralAutoFireEngine.activate();
    const firstActivatedAt = XProcNeuralAutoFireEngine.status().activatedAt;
    const subsBefore = feedbackBusEngine.subscriberCount("outcome.completed");

    const r2 = XProcNeuralAutoFireEngine.activate();
    expect(r2.alreadyActivated).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r2.errors).toBe(0);
    // no extra subscriptions, timestamp unchanged
    expect(feedbackBusEngine.subscriberCount("outcome.completed")).toBe(subsBefore);
    expect(XProcNeuralAutoFireEngine.status().activatedAt).toBe(firstActivatedAt);
  });

  it("forwards autoTrainThreshold to enableAutoTrain()", () => {
    XProcNeuralAutoFireEngine.activate({ autoTrainThreshold: 8 });
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().threshold).toBe(8);
    expect(XProcNeuralAutoFireEngine.status().autoTrainThreshold).toBe(8);
  });

  it("uses the default threshold (16) when none is given", () => {
    XProcNeuralAutoFireEngine.activate();
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().threshold).toBe(16);
    expect(XProcNeuralAutoFireEngine.status().autoTrainThreshold).toBe(16);
  });

  it("ignores invalid options (negative threshold) and falls back to defaults", () => {
    const r = XProcNeuralAutoFireEngine.activate({ autoTrainThreshold: -5 } as unknown);
    expect(r.ok).toBe(true);
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().threshold).toBe(16);
  });

  it("ignores unknown option keys (strict schema) and still activates", () => {
    const r = XProcNeuralAutoFireEngine.activate({ bogusKey: 123 } as unknown);
    expect(r.ok).toBe(true);
    expect(allActive()).toBe(true);
  });

  it("marks a component 'already_active' (not owned) when it was on before activate()", () => {
    // Pre-subscribe the replay bridge by hand.
    OutcomeReplayBufferBridgeEngine.subscribeToOutcomes();
    const r = XProcNeuralAutoFireEngine.activate();
    const replay = r.components.find((c) => c.key === "replay_buffer_bridge");
    expect(replay?.action).toBe("already_active");
    expect(replay?.ownedByAutoFire).toBe(false);
    // the other five (auto-train + tribal + drift_cal + episodic + rl) are owned
    expect(r.components.filter((c) => c.ownedByAutoFire).length).toBe(5);
  });
});

describe("XProcNeuralAutoFireEngine — failure isolation", () => {
  it("one failing bridge does not block the others; error is counted", () => {
    vi.spyOn(OutcomeDriftCalibrationBridgeEngine, "subscribeToOutcomes").mockImplementation(() => {
      throw new Error("boom: drift bridge subscribe failed");
    });
    const r = XProcNeuralAutoFireEngine.activate();

    expect(r.ok).toBe(false);
    expect(r.errors).toBe(1);
    const drift = r.components.find((c) => c.key === "drift_calibration_bridge");
    expect(drift?.action).toBe("error");
    expect(drift?.ownedByAutoFire).toBe(false);
    expect(drift?.message).toContain("boom");
    // the other five still came up
    const enabled = r.components.filter((c) => c.action === "enabled").map((c) => c.key).sort();
    expect(enabled).toEqual(["episodic_memory_bridge", "neural_auto_train", "replay_buffer_bridge", "rl_bridge", "tribal_bridge"]);
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().active).toBe(true);
    expect(OutcomeReplayBufferBridgeEngine.isSubscribedToOutcomes()).toBe(true);
  });

  it("a failing NN.enableAutoTrain is reported but the bridges still activate", () => {
    vi.spyOn(crossProcessNeuralLearningEngine, "enableAutoTrain").mockImplementation(() => {
      throw new Error("boom: enableAutoTrain failed");
    });
    const r = XProcNeuralAutoFireEngine.activate();
    expect(r.ok).toBe(false);
    expect(r.errors).toBe(1);
    const nn = r.components.find((c) => c.key === "neural_auto_train");
    expect(nn?.action).toBe("error");
    expect(TribalKnowledgeOutcomeBridgeEngine.isSubscribedToOutcomes()).toBe(true);
    expect(OutcomeEpisodicMemoryBridgeEngine.isSubscribedToOutcomes()).toBe(true);
  });
});

describe("XProcNeuralAutoFireEngine — deactivate()", () => {
  it("reverses every switch it owns", () => {
    XProcNeuralAutoFireEngine.activate();
    expect(allActive()).toBe(true);

    const r = XProcNeuralAutoFireEngine.deactivate();
    expect(r.ok).toBe(true);
    expect(r.wasActivated).toBe(true);
    expect(r.errors).toBe(0);
    expect(noneActive()).toBe(true);
    expect(XProcNeuralAutoFireEngine.isActivated()).toBe(false);
    for (const c of r.components) expect(c.action).toBe("disabled");
  });

  it("leaves alone a component that was active before activate() ('not_owned')", () => {
    // Operator subscribed the tribal bridge before auto-fire ran.
    TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
    XProcNeuralAutoFireEngine.activate();

    const r = XProcNeuralAutoFireEngine.deactivate();
    const tribal = r.components.find((c) => c.key === "tribal_bridge");
    expect(tribal?.action).toBe("not_owned");
    // the operator's subscription survives
    expect(TribalKnowledgeOutcomeBridgeEngine.isSubscribedToOutcomes()).toBe(true);
    // everything else was torn down
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().active).toBe(false);
    expect(OutcomeReplayBufferBridgeEngine.isSubscribedToOutcomes()).toBe(false);
  });

  it("deactivate() before activate() is a graceful no-op", () => {
    const r = XProcNeuralAutoFireEngine.deactivate();
    expect(r.ok).toBe(true);
    expect(r.wasActivated).toBe(false);
    for (const c of r.components) expect(c.action).toBe("not_active");
  });

  it("activate → deactivate → activate cycles cleanly", () => {
    XProcNeuralAutoFireEngine.activate();
    XProcNeuralAutoFireEngine.deactivate();
    expect(noneActive()).toBe(true);
    const r = XProcNeuralAutoFireEngine.activate();
    expect(r.ok).toBe(true);
    expect(r.alreadyActivated).toBe(false);
    expect(allActive()).toBe(true);
  });
});

describe("XProcNeuralAutoFireEngine — status()", () => {
  it("reports activated=false and all components inactive when inert", () => {
    const s = XProcNeuralAutoFireEngine.status();
    expect(s.activated).toBe(false);
    expect(s.activatedAt).toBeNull();
    expect(s.autoTrainThreshold).toBeNull();
    expect(s.components.every((c) => !c.active && !c.ownedByAutoFire)).toBe(true);
  });

  it("reports activated=true with per-component live state after activate()", () => {
    XProcNeuralAutoFireEngine.activate({ autoTrainThreshold: 12 });
    const s = XProcNeuralAutoFireEngine.status();
    expect(s.activated).toBe(true);
    expect(s.autoTrainThreshold).toBe(12);
    expect(s.components.length).toBe(6); // U-CN12 — auto-train + 5 fan-out bridges (tribal, drift_cal, replay, episodic, rl)
    for (const c of s.components) {
      expect(c.active).toBe(true);
      expect(c.ownedByAutoFire).toBe(true);
    }
  });

  it("status() reflects a live unsubscribe done out-of-band", () => {
    XProcNeuralAutoFireEngine.activate();
    // Someone unsubscribes the replay bridge directly (not via deactivate()).
    OutcomeReplayBufferBridgeEngine.unsubscribeFromOutcomes();
    const s = XProcNeuralAutoFireEngine.status();
    const replay = s.components.find((c) => c.key === "replay_buffer_bridge");
    expect(replay?.active).toBe(false);
    // ownership bookkeeping is unchanged — auto-fire still "owns" it
    expect(replay?.ownedByAutoFire).toBe(true);
  });
});

describe("XProcNeuralAutoFireEngine — reset()", () => {
  it("clears the engine's bookkeeping but leaves the downstream loop running", () => {
    XProcNeuralAutoFireEngine.activate();
    expect(allActive()).toBe(true);

    XProcNeuralAutoFireEngine.reset();
    // bookkeeping wiped …
    expect(XProcNeuralAutoFireEngine.isActivated()).toBe(false);
    expect(XProcNeuralAutoFireEngine.status().components.every((c) => !c.ownedByAutoFire)).toBe(true);
    // … but the actual subscriptions are still live
    expect(allActive()).toBe(true);
    // and a subsequent activate() now sees every component as 'already_active' (not owned),
    // because reset() forgot it had turned them on.
    const r = XProcNeuralAutoFireEngine.activate();
    expect(r.components.every((c) => c.action === "already_active" && c.ownedByAutoFire === false)).toBe(true);
    // (orphaned subs are cleaned up by hardResetAll() in afterEach)
  });
});

describe("XProcNeuralAutoFireEngine — end-to-end wire is live", () => {
  it("after activate(), 'outcome.recorded' events buffer in the NN and crossing the threshold retrains", async () => {
    XProcNeuralAutoFireEngine.activate({ autoTrainThreshold: 3 });
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().active).toBe(true);
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().totalTicks).toBe(0);

    // two labelled outcomes — below threshold
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("success") });
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("failure") });
    await flush();
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().bufferedSamples).toBe(2);
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().totalTicks).toBe(0);

    // third outcome — hits threshold, triggers a retrain
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("success") });
    await flush();
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().bufferedSamples).toBe(0);
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().totalTicks).toBe(1);
  });

  it("after deactivate(), 'outcome.recorded' events no longer touch the NN buffer", async () => {
    XProcNeuralAutoFireEngine.activate({ autoTrainThreshold: 100 });
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("success") });
    await flush();
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().bufferedSamples).toBe(1);

    XProcNeuralAutoFireEngine.deactivate();
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("success") });
    await flush();
    // disableAutoTrain() cleared the buffer and unsubscribed → no growth
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().active).toBe(false);
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().bufferedSamples).toBe(0);
  });

  it("pending outcomes are filtered (no label → no buffer growth)", async () => {
    XProcNeuralAutoFireEngine.activate({ autoTrainThreshold: 50 });
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("pending") });
    feedbackBusEngine.publish("outcome.recorded", { record: makeRecord("pending") });
    await flush();
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().bufferedSamples).toBe(0);
  });
});

describe("XProcNeuralAutoFireEngine — replay-mixing config (U-CN10)", () => {
  const flush = async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  };
  function seedStore(n: number, process: "mill" | "lathe" | "wedm" = "mill"): void {
    for (let i = 0; i < n; i++) {
      crossProcessOutcomeStore.record({ bridge: "sf", process, request_summary: { material: "4140" }, outcome: { kind: "success" } });
    }
  }
  function busRecord() {
    return {
      schemaVersion: "1.0",
      id: `bus-${Math.random().toString(36).slice(2, 10)}`,
      ts: new Date().toISOString(),
      bridge: "sf" as const,
      process: "mill" as const,
      request_summary: { material: "4140", tool_diameter_mm: 12 },
      response_summary: {},
      outcome: { kind: "success" as const },
    };
  }

  it("defaults the auto-train replay mix ratio to 0.5", () => {
    XProcNeuralAutoFireEngine.activate();
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().replayMixRatio).toBeCloseTo(0.5, 6);
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().replayMaxRecords).toBe(256);
    const s = XProcNeuralAutoFireEngine.status();
    expect(s.autoTrainReplayMixRatio).toBeCloseTo(0.5, 6);
    expect(s.autoTrainReplayMaxRecords).toBe(256);
  });

  it("forwards autoTrainReplayMixRatio / autoTrainReplayMaxRecords to enableAutoTrain", () => {
    XProcNeuralAutoFireEngine.activate({ autoTrainReplayMixRatio: 0.25, autoTrainReplayMaxRecords: 100 });
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().replayMixRatio).toBeCloseTo(0.25, 6);
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().replayMaxRecords).toBe(100);
    const s = XProcNeuralAutoFireEngine.status();
    expect(s.autoTrainReplayMixRatio).toBeCloseTo(0.25, 6);
    expect(s.autoTrainReplayMaxRecords).toBe(100);
  });

  it("status() reports null replay config before activate(), 0.5 after activate, null after reset()", () => {
    expect(XProcNeuralAutoFireEngine.status().autoTrainReplayMixRatio).toBeNull();
    XProcNeuralAutoFireEngine.activate({ autoTrainReplayMixRatio: 0.5 });
    expect(XProcNeuralAutoFireEngine.status().autoTrainReplayMixRatio).toBeCloseTo(0.5, 6);
    XProcNeuralAutoFireEngine.reset();
    expect(XProcNeuralAutoFireEngine.status().autoTrainReplayMixRatio).toBeNull();
    expect(XProcNeuralAutoFireEngine.status().autoTrainReplayMaxRecords).toBeNull();
  });

  it("end-to-end: after activate(), a retrain mixes in historical store records", async () => {
    seedStore(8, "lathe"); // 8 historical lathe records BEFORE activation (land only in the store, not the buffer)
    const ticks: FeedbackEvent[] = [];
    // autoTrainTotalTicks is singleton-cumulative across the file → assert a +1 delta.
    const ticksBefore = crossProcessNeuralLearningEngine.autoTrainStatus().totalTicks;
    XProcNeuralAutoFireEngine.activate({ autoTrainThreshold: 3, autoTrainReplayMixRatio: 1.0 });
    feedbackBusEngine.subscribe("neural.train.tick", (e) => ticks.push(e));
    for (let i = 0; i < 3; i++) feedbackBusEngine.publish("outcome.recorded", { record: busRecord() });
    await flush();
    expect(ticks).toHaveLength(1);
    const tick = ticks[0].payload as { samplesUsed: number; replayMixed: number };
    // want = ceil(3 * 1.0) = 3; the store has 8 lathe records (none in the buffer) → mix exactly 3
    expect(tick.replayMixed).toBe(3);
    expect(tick.samplesUsed).toBe(6); // 3 fresh + 3 replayed
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().totalTicks).toBe(ticksBefore + 1);
  });

  it("dispatch wrapper forwards the replay config", () => {
    xProcNeuralAutoFireDispatch("xproc_autofire_activate", { autoTrainReplayMixRatio: 0.75, autoTrainReplayMaxRecords: 50 });
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().replayMixRatio).toBeCloseTo(0.75, 6);
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().replayMaxRecords).toBe(50);
  });
});

describe("xProcNeuralAutoFireDispatch", () => {
  it("routes xproc_autofire_activate", () => {
    const r = xProcNeuralAutoFireDispatch("xproc_autofire_activate", {}) as { ok: boolean; activatedAt: string };
    expect(r.ok).toBe(true);
    expect(typeof r.activatedAt).toBe("string");
    expect(allActive()).toBe(true);
  });

  it("routes xproc_autofire_status", () => {
    xProcNeuralAutoFireDispatch("xproc_autofire_activate", {});
    const r = xProcNeuralAutoFireDispatch("xproc_autofire_status", {}) as { ok: boolean; status: { activated: boolean } };
    expect(r.ok).toBe(true);
    expect(r.status.activated).toBe(true);
  });

  it("routes xproc_autofire_deactivate", () => {
    xProcNeuralAutoFireDispatch("xproc_autofire_activate", {});
    const r = xProcNeuralAutoFireDispatch("xproc_autofire_deactivate", {}) as { ok: boolean; wasActivated: boolean };
    expect(r.ok).toBe(true);
    expect(r.wasActivated).toBe(true);
    expect(noneActive()).toBe(true);
  });

  it("forwards activate options through the dispatch wrapper", () => {
    xProcNeuralAutoFireDispatch("xproc_autofire_activate", { autoTrainThreshold: 7 });
    expect(crossProcessNeuralLearningEngine.autoTrainStatus().threshold).toBe(7);
  });

  it("throws on an unknown action", () => {
    expect(() => xProcNeuralAutoFireDispatch("xproc_autofire_bogus", {})).toThrow(/unknown action/);
  });
});
