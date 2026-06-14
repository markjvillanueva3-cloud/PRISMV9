import { describe, it, expect, beforeEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync, existsSync } from "node:fs";
import {
  MillAGIContinuousLearningEngine,
  DEFAULT_ALPHA,
  MIN_MULTIPLIER,
  MAX_MULTIPLIER,
  MILL_CANONICAL_FEEDBACK_KINDS,
  type MillFeedbackKind,
} from "../engines/MillAGIContinuousLearningEngine.js";

let tmpPath: string;
let eng: MillAGIContinuousLearningEngine;

function freshEngine(): MillAGIContinuousLearningEngine {
  tmpPath = join(tmpdir(), `mill-agi-test-${Date.now()}-${Math.random()}.json`);
  return new MillAGIContinuousLearningEngine(tmpPath);
}

describe("MillAGIContinuousLearningEngine", () => {
  beforeEach(() => {
    if (tmpPath && existsSync(tmpPath)) rmSync(tmpPath, { force: true });
    eng = freshEngine();
  });

  it("getStats: 6 feedback kinds, 3 mill-canonical, default α=0.2, multiplier in [0.5, 2.0]", () => {
    const s = eng.getStats();
    expect(s.feedback_kinds.length).toBe(6);
    expect(s.mill_canonical_feedback_kinds).toEqual(["chatter_event", "fpa_outcome", "chip_evac_outcome"]);
    expect(s.default_alpha).toBe(DEFAULT_ALPHA);
    expect(s.multiplier_bounds).toEqual([MIN_MULTIPLIER, MAX_MULTIPLIER]);
  });

  it("MILL_CANONICAL_FEEDBACK_KINDS contains 3 mill-only kinds (not present in lathe)", () => {
    expect(MILL_CANONICAL_FEEDBACK_KINDS).toEqual([
      "chatter_event", "fpa_outcome", "chip_evac_outcome",
    ]);
  });

  it("recordFeedback first observation sets ewma = observation, sample_count = 1", () => {
    const slot = eng.recordFeedback({
      feature: "speed_feed", key: "1018|EM10",
      kind: "speed_feed_outcome", observation: 1.2,
    });
    expect(slot.ewma).toBe(1.2);
    expect(slot.sample_count).toBe(1);
    expect(slot.kinds.speed_feed_outcome.count).toBe(1);
    expect(slot.kinds.speed_feed_outcome.ewma).toBe(1.2);
  });

  it("EWMA smoothing: 1.0 then 2.0 (α=0.2) → second ewma = 0.2*2.0 + 0.8*1.0 = 1.2", () => {
    eng.recordFeedback({ feature: "X", key: "Y", kind: "speed_feed_outcome", observation: 1.0 });
    const slot = eng.recordFeedback({ feature: "X", key: "Y", kind: "speed_feed_outcome", observation: 2.0 });
    expect(slot.ewma).toBeCloseTo(1.2, 4);
    expect(slot.sample_count).toBe(2);
  });

  it("custom alpha overrides default 0.2", () => {
    eng.recordFeedback({ feature: "X", key: "Y", kind: "speed_feed_outcome", observation: 1.0 });
    const slot = eng.recordFeedback({ feature: "X", key: "Y", kind: "speed_feed_outcome", observation: 2.0, weight_alpha: 0.5 });
    // 0.5*2 + 0.5*1 = 1.5
    expect(slot.ewma).toBeCloseTo(1.5, 4);
  });

  it("MILL-CANONICAL chatter_event feedback is recorded in canonical bucket", () => {
    const slot = eng.recordFeedback({
      feature: "speed_feed", key: "stainless|EM6",
      kind: "chatter_event", observation: 0.8,
    });
    expect(slot.kinds.chatter_event.count).toBe(1);
    expect(slot.kinds.chatter_event.ewma).toBe(0.8);
  });

  it("MILL-CANONICAL fpa_outcome feedback is recorded in canonical bucket", () => {
    const slot = eng.recordFeedback({
      feature: "fpa", key: "PART-A",
      kind: "fpa_outcome", observation: 1.0, // pass
    });
    expect(slot.kinds.fpa_outcome.count).toBe(1);
  });

  it("MILL-CANONICAL chip_evac_outcome feedback is recorded in canonical bucket", () => {
    const slot = eng.recordFeedback({
      feature: "chip_evac", key: "deep_pocket|N",
      kind: "chip_evac_outcome", observation: 0.6,
    });
    expect(slot.kinds.chip_evac_outcome.count).toBe(1);
  });

  it("invalid kind 'turret_index' (lathe-style) rejected by schema", () => {
    expect(() => eng.recordFeedback({
      feature: "X", key: "Y",
      kind: "turret_index" as MillFeedbackKind, observation: 1.0,
    })).toThrow();
  });

  it("predictAdjustment: returns 1.0 when no slot exists (neutral)", () => {
    expect(eng.predictAdjustment("unseen", "key")).toBe(1.0);
  });

  it("predictAdjustment: returns EWMA when within [0.5, 2.0] bounds", () => {
    eng.recordFeedback({ feature: "X", key: "Y", kind: "speed_feed_outcome", observation: 1.2 });
    expect(eng.predictAdjustment("X", "Y")).toBeCloseTo(1.2, 4);
  });

  it("predictAdjustment: clamped to MAX_MULTIPLIER (2.0) when EWMA > 2.0", () => {
    eng.recordFeedback({ feature: "X", key: "Y", kind: "speed_feed_outcome", observation: 5.0 });
    expect(eng.predictAdjustment("X", "Y")).toBe(MAX_MULTIPLIER);
  });

  it("predictAdjustment: clamped to MIN_MULTIPLIER (0.5) when EWMA < 0.5", () => {
    eng.recordFeedback({ feature: "X", key: "Y", kind: "speed_feed_outcome", observation: 0.1 });
    expect(eng.predictAdjustment("X", "Y")).toBe(MIN_MULTIPLIER);
  });

  it("predictAdjustmentByKind (mill-canonical): returns kind-specific EWMA, not overall", () => {
    eng.recordFeedback({ feature: "X", key: "Y", kind: "speed_feed_outcome", observation: 1.5 });
    eng.recordFeedback({ feature: "X", key: "Y", kind: "chatter_event", observation: 0.7 });
    expect(eng.predictAdjustmentByKind("X", "Y", "speed_feed_outcome")).toBeCloseTo(1.5, 4);
    expect(eng.predictAdjustmentByKind("X", "Y", "chatter_event")).toBeCloseTo(0.7, 4);
  });

  it("predictAdjustmentByKind: returns 1.0 when no slot OR kind has 0 samples", () => {
    expect(eng.predictAdjustmentByKind("missing", "key", "chatter_event")).toBe(1.0);
    eng.recordFeedback({ feature: "X", key: "Y", kind: "speed_feed_outcome", observation: 1.5 });
    expect(eng.predictAdjustmentByKind("X", "Y", "chatter_event")).toBe(1.0);
  });

  it("predictAdjustmentByKind: clamped to [0.5, 2.0]", () => {
    eng.recordFeedback({ feature: "X", key: "Y", kind: "chatter_event", observation: 10.0 });
    expect(eng.predictAdjustmentByKind("X", "Y", "chatter_event")).toBe(MAX_MULTIPLIER);
  });

  it("getSlot retrieves recorded slot by (feature, key)", () => {
    eng.recordFeedback({ feature: "F", key: "K", kind: "speed_feed_outcome", observation: 1.0 });
    expect(eng.getSlot("F", "K")?.feature).toBe("F");
    expect(eng.getSlot("MISSING", "K")).toBeNull();
  });

  it("slotsForFeature returns all slots for a feature", () => {
    eng.recordFeedback({ feature: "speed_feed", key: "K1", kind: "speed_feed_outcome", observation: 1.0 });
    eng.recordFeedback({ feature: "speed_feed", key: "K2", kind: "speed_feed_outcome", observation: 1.5 });
    eng.recordFeedback({ feature: "other", key: "K3", kind: "machinist_acceptance", observation: 1.0 });
    const slots = eng.slotsForFeature("speed_feed");
    expect(slots.length).toBe(2);
    expect(slots.map(s => s.key).sort()).toEqual(["K1", "K2"]);
  });

  it("resetSlot removes the slot", () => {
    eng.recordFeedback({ feature: "F", key: "K", kind: "speed_feed_outcome", observation: 1.0 });
    eng.resetSlot("F", "K");
    expect(eng.getSlot("F", "K")).toBeNull();
  });

  it("statsByFeature aggregates slot/sample counts and mean EWMA", () => {
    eng.recordFeedback({ feature: "F1", key: "A", kind: "speed_feed_outcome", observation: 1.0 });
    eng.recordFeedback({ feature: "F1", key: "B", kind: "speed_feed_outcome", observation: 2.0 });
    eng.recordFeedback({ feature: "F2", key: "C", kind: "chatter_event", observation: 0.5 });
    const stats = eng.statsByFeature();
    expect(stats.F1.slots).toBe(2);
    expect(stats.F1.total_samples).toBe(2);
    expect(stats.F1.mean_ewma).toBeCloseTo(1.5, 3);
    expect(stats.F2.slots).toBe(1);
  });

  it("variability ≥3: chatter_event vs fpa_outcome vs chip_evac_outcome — each in its own bucket", () => {
    eng.recordFeedback({ feature: "F", key: "K", kind: "chatter_event", observation: 0.8 });
    eng.recordFeedback({ feature: "F", key: "K", kind: "fpa_outcome", observation: 1.0 });
    eng.recordFeedback({ feature: "F", key: "K", kind: "chip_evac_outcome", observation: 0.6 });
    const slot = eng.getSlot("F", "K")!;
    expect(slot.kinds.chatter_event.count).toBe(1);
    expect(slot.kinds.fpa_outcome.count).toBe(1);
    expect(slot.kinds.chip_evac_outcome.count).toBe(1);
    expect(slot.sample_count).toBe(3);
  });

  it("EWMA across multiple kinds: overall EWMA blends all observations regardless of kind", () => {
    eng.recordFeedback({ feature: "F", key: "K", kind: "speed_feed_outcome", observation: 1.0 });
    eng.recordFeedback({ feature: "F", key: "K", kind: "chatter_event", observation: 2.0 });
    // Overall EWMA: first 1.0, then 0.2*2.0 + 0.8*1.0 = 1.2
    const slot = eng.getSlot("F", "K")!;
    expect(slot.ewma).toBeCloseTo(1.2, 4);
  });

  it("adversarial: NaN/Infinity observations rejected by zod (finite check)", () => {
    expect(() => eng.recordFeedback({
      feature: "F", key: "K", kind: "speed_feed_outcome", observation: NaN,
    })).toThrow();
    expect(() => eng.recordFeedback({
      feature: "F", key: "K", kind: "speed_feed_outcome", observation: Infinity,
    })).toThrow();
  });

  it("__resetForTests clears all slots", () => {
    eng.recordFeedback({ feature: "F", key: "K", kind: "speed_feed_outcome", observation: 1.0 });
    eng.__resetForTests();
    expect(eng.getSlot("F", "K")).toBeNull();
  });

  it("persistence: new engine instance loads previously-recorded slots", () => {
    eng.recordFeedback({ feature: "PERSIST", key: "K", kind: "chatter_event", observation: 1.5 });
    const eng2 = new MillAGIContinuousLearningEngine(tmpPath);
    expect(eng2.getSlot("PERSIST", "K")?.ewma).toBeCloseTo(1.5, 4);
  });

  it("schema rejects empty feature OR key", () => {
    expect(() => eng.recordFeedback({
      feature: "", key: "K", kind: "speed_feed_outcome", observation: 1.0,
    })).toThrow();
    expect(() => eng.recordFeedback({
      feature: "F", key: "", kind: "speed_feed_outcome", observation: 1.0,
    })).toThrow();
  });

  it("convergence: 10 identical observations push EWMA to that value", () => {
    for (let i = 0; i < 20; i++) {
      eng.recordFeedback({ feature: "F", key: "K", kind: "speed_feed_outcome", observation: 1.5 });
    }
    expect(eng.predictAdjustment("F", "K")).toBeCloseTo(1.5, 3);
  });
});
