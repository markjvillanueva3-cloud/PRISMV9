/**
 * LatheAGIContinuousLearningEngine tests — U-LTH59
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LatheAGIContinuousLearningEngine } from "../engines/LatheAGIContinuousLearningEngine.js";

function makeEngine() {
  const dir = mkdtempSync(join(tmpdir(), "learn-"));
  const statePath = join(dir, "state.json");
  const engine = new LatheAGIContinuousLearningEngine(statePath);
  engine.__resetForTests();
  return { engine, statePath };
}

describe("LatheAGIContinuousLearningEngine — recordFeedback", () => {
  it("first observation sets ewma to observation (sample_count becomes 1)", () => {
    const { engine } = makeEngine();
    const slot = engine.recordFeedback({
      feature: "speed_feed",
      key: "1018|od_turn",
      kind: "speed_feed_outcome",
      observation: 1.2,
    });
    expect(slot.ewma).toBe(1.2);
    expect(slot.sample_count).toBe(1);
    expect(slot.last_observation).toBe(1.2);
  });

  it("second observation averages per EWMA formula (alpha=0.2)", () => {
    const { engine } = makeEngine();
    engine.recordFeedback({ feature: "f", key: "k", kind: "speed_feed_outcome", observation: 1.0 });
    const slot = engine.recordFeedback({ feature: "f", key: "k", kind: "speed_feed_outcome", observation: 2.0 });
    // ewma_new = 0.2 * 2 + 0.8 * 1 = 1.2
    expect(slot.ewma).toBeCloseTo(1.2, 3);
    expect(slot.sample_count).toBe(2);
  });

  it("per-kind buckets track independently", () => {
    const { engine } = makeEngine();
    engine.recordFeedback({ feature: "f", key: "k", kind: "speed_feed_outcome", observation: 1.5 });
    engine.recordFeedback({ feature: "f", key: "k", kind: "profitability_variance", observation: 10 });
    const slot = engine.getSlot("f", "k")!;
    expect(slot.kinds.speed_feed_outcome.count).toBe(1);
    expect(slot.kinds.profitability_variance.count).toBe(1);
    expect(slot.kinds.machinist_acceptance.count).toBe(0);
  });

  it("custom alpha honored (alpha=1.0 snaps to observation)", () => {
    const { engine } = makeEngine();
    engine.recordFeedback({ feature: "f", key: "k", kind: "speed_feed_outcome", observation: 1.0 });
    const slot = engine.recordFeedback({
      feature: "f", key: "k", kind: "speed_feed_outcome", observation: 5.0, weight_alpha: 1.0,
    });
    expect(slot.ewma).toBe(5.0);
  });
});

describe("LatheAGIContinuousLearningEngine — predictAdjustment", () => {
  it("returns 1.0 for unseen slot (no learning)", () => {
    const { engine } = makeEngine();
    expect(engine.predictAdjustment("f", "unseen")).toBe(1.0);
  });

  it("returns EWMA clamped to [0.5, 2.0]", () => {
    const { engine } = makeEngine();
    // After 5 observations of 0.3, ewma will approach 0.3 but clamp to 0.5
    for (let i = 0; i < 5; i++) {
      engine.recordFeedback({ feature: "f", key: "k", kind: "speed_feed_outcome", observation: 0.3 });
    }
    expect(engine.predictAdjustment("f", "k")).toBeGreaterThanOrEqual(0.5);
    expect(engine.predictAdjustment("f", "k")).toBeLessThanOrEqual(2.0);
  });

  it("high-observation stream → clamped to 2.0 ceiling", () => {
    const { engine } = makeEngine();
    for (let i = 0; i < 10; i++) {
      engine.recordFeedback({ feature: "f", key: "k", kind: "speed_feed_outcome", observation: 3.5 });
    }
    expect(engine.predictAdjustment("f", "k")).toBe(2.0);
  });

  it("behavior-change proof: multiplier shifts after repeated feedback", () => {
    const { engine } = makeEngine();
    const before = engine.predictAdjustment("f", "k");
    expect(before).toBe(1.0);
    for (let i = 0; i < 5; i++) {
      engine.recordFeedback({ feature: "f", key: "k", kind: "machinist_acceptance", observation: 1.35 });
    }
    const after = engine.predictAdjustment("f", "k");
    expect(after).toBeGreaterThan(before);
  });
});

describe("LatheAGIContinuousLearningEngine — query + reset", () => {
  it("slotsForFeature filters correctly", () => {
    const { engine } = makeEngine();
    engine.recordFeedback({ feature: "f1", key: "a", kind: "speed_feed_outcome", observation: 1 });
    engine.recordFeedback({ feature: "f2", key: "b", kind: "speed_feed_outcome", observation: 1 });
    expect(engine.slotsForFeature("f1")).toHaveLength(1);
    expect(engine.slotsForFeature("f2")).toHaveLength(1);
    expect(engine.slotsForFeature("nope")).toHaveLength(0);
  });

  it("resetSlot removes slot", () => {
    const { engine } = makeEngine();
    engine.recordFeedback({ feature: "f", key: "k", kind: "speed_feed_outcome", observation: 1 });
    engine.resetSlot("f", "k");
    expect(engine.getSlot("f", "k")).toBeNull();
  });

  it("statsByFeature aggregates slots + samples", () => {
    const { engine } = makeEngine();
    engine.recordFeedback({ feature: "f1", key: "a", kind: "speed_feed_outcome", observation: 1 });
    engine.recordFeedback({ feature: "f1", key: "a", kind: "speed_feed_outcome", observation: 2 });
    engine.recordFeedback({ feature: "f1", key: "b", kind: "speed_feed_outcome", observation: 3 });
    const stats = engine.statsByFeature();
    expect(stats.f1.slots).toBe(2);
    expect(stats.f1.total_samples).toBe(3);
  });
});

describe("LatheAGIContinuousLearningEngine — failure modes", () => {
  it("rejects NaN observation", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.recordFeedback({ feature: "f", key: "k", kind: "speed_feed_outcome", observation: Number.NaN }),
    ).toThrow();
  });

  it("rejects Infinity observation", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.recordFeedback({ feature: "f", key: "k", kind: "speed_feed_outcome", observation: Number.POSITIVE_INFINITY }),
    ).toThrow();
  });

  it("rejects empty feature", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.recordFeedback({ feature: "", key: "k", kind: "speed_feed_outcome", observation: 1 }),
    ).toThrow();
  });

  it("rejects invalid kind", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.recordFeedback({ feature: "f", key: "k", kind: "bogus" as any, observation: 1 }),
    ).toThrow();
  });

  it("rejects alpha above 1", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.recordFeedback({ feature: "f", key: "k", kind: "speed_feed_outcome", observation: 1, weight_alpha: 2 }),
    ).toThrow();
  });
});

describe("LatheAGIContinuousLearningEngine — dispatcher wiring", () => {
  it("lathe_agi_feedback action wired with handler + lazy import", () => {
    const src = readFileSync(
      "H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts",
      "utf-8",
    );
    expect(src).toContain('"lathe_agi_feedback"');
    expect(src).toContain('"lathe_agi_adjustment"');
    expect(src).toMatch(/case "lathe_agi_feedback"/);
    expect(src).toContain('"../../engines/LatheAGIContinuousLearningEngine.js"');
    expect(src).toContain('case "latheAGILearning"');
  });
});
