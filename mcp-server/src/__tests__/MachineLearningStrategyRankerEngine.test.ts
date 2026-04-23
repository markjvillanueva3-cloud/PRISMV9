import { describe, it, expect, beforeEach } from "vitest";
import { MachineLearningStrategyRankerEngine } from "../engines/MachineLearningStrategyRankerEngine.js";

describe("MachineLearningStrategyRankerEngine", () => {
  let engine: MachineLearningStrategyRankerEngine;

  beforeEach(() => {
    engine = new MachineLearningStrategyRankerEngine();
    engine.resetPriors(false);
  });

  it("recordOutcome() returns key + stats + score", () => {
    const r = engine.recordOutcome("adaptive_clearing", "pocket", "P", {
      success: true, cycle_time_min: 12, tool_life_min: 60, Ra_um: 1.8,
    });
    expect(r.key.strategy).toBe("adaptive_clearing");
    expect(r.key.feature_type).toBe("pocket");
    expect(r.key.material_iso).toBe("P");
    expect(r.stats.count).toBe(1);
    expect(r.composite_score).toBeGreaterThanOrEqual(0);
  });

  it("recordOutcome() accumulates observations", () => {
    engine.recordOutcome("s1", "pocket", "P", { success: true });
    engine.recordOutcome("s1", "pocket", "P", { success: true });
    const r = engine.recordOutcome("s1", "pocket", "P", { success: false });
    expect(r.stats.count).toBe(3);
    expect(r.stats.successes).toBe(2);
    expect(r.stats.failures).toBe(1);
  });

  it("rankStrategies() returns ordered list", () => {
    engine.recordOutcome("s1", "pocket", "P", { success: true, cycle_time_min: 5 });
    engine.recordOutcome("s2", "pocket", "P", { success: false });
    const r = engine.rankStrategies("pocket", "P", ["s1", "s2"], "greedy");
    expect(r.ranked.length).toBe(2);
    expect(r.ranked[0].strategy).toBe("s1");
  });

  it("rankStrategies() thompson exploration differs from greedy ordering on similar means", () => {
    engine.recordOutcome("s1", "pocket", "P", { success: true });
    engine.recordOutcome("s2", "pocket", "P", { success: true });
    const r1 = engine.rankStrategies("pocket", "P", ["s1", "s2"], "thompson");
    expect(r1.exploration_strategy).toBe("thompson");
  });

  it("rankStrategies() UCB1 mode works", () => {
    engine.recordOutcome("s1", "pocket", "P", { success: true });
    const r = engine.rankStrategies("pocket", "P", ["s1", "s2"], "ucb1");
    expect(r.exploration_strategy).toBe("ucb1");
    expect(r.ranked.length).toBe(2);
  });

  it("rankStrategies() cold-start returns prior ranking", () => {
    const r = engine.rankStrategies("pocket", "P", ["never_seen"], "greedy");
    expect(r.ranked.length).toBe(1);
    expect(r.ranked[0].observation_count).toBeGreaterThanOrEqual(0);
  });

  it("rankStrategies() confidence=low for <5 obs", () => {
    for (let i = 0; i < 3; i++) engine.recordOutcome("s1", "pocket", "P", { success: true });
    const r = engine.rankStrategies("pocket", "P", ["s1"], "greedy");
    expect(r.ranked[0].confidence).toBe("low");
  });

  it("rankStrategies() confidence=medium for 5-20 obs", () => {
    for (let i = 0; i < 10; i++) engine.recordOutcome("s1", "pocket", "P", { success: true });
    const r = engine.rankStrategies("pocket", "P", ["s1"], "greedy");
    expect(r.ranked[0].confidence).toBe("medium");
  });

  it("rankStrategies() confidence=high for >20 obs", () => {
    for (let i = 0; i < 25; i++) engine.recordOutcome("s1", "pocket", "P", { success: true });
    const r = engine.rankStrategies("pocket", "P", ["s1"], "greedy");
    expect(r.ranked[0].confidence).toBe("high");
  });

  it("rankStrategies() credible interval bounds monotonic", () => {
    engine.recordOutcome("s1", "pocket", "P", { success: true });
    const r = engine.rankStrategies("pocket", "P", ["s1"], "greedy");
    const [lo, hi] = r.ranked[0].credible_interval_95;
    expect(lo).toBeLessThanOrEqual(hi);
  });

  it("getPerformanceHistory() filters by strategy", () => {
    engine.recordOutcome("s1", "pocket", "P", { success: true });
    engine.recordOutcome("s2", "pocket", "P", { success: true });
    const history = engine.getPerformanceHistory("s1");
    expect(history.every(h => h.key.strategy === "s1")).toBe(true);
  });

  it("getPerformanceHistory() filters by material", () => {
    engine.recordOutcome("s1", "pocket", "P", { success: true });
    engine.recordOutcome("s1", "pocket", "M", { success: true });
    const history = engine.getPerformanceHistory(undefined, undefined, "M");
    expect(history.every(h => h.key.material_iso === "M")).toBe(true);
  });

  it("getRecommendation() returns primary + alternatives", () => {
    engine.recordOutcome("s1", "pocket", "P", { success: true, cycle_time_min: 5 });
    engine.recordOutcome("s2", "pocket", "P", { success: false });
    const rec = engine.getRecommendation("pocket", "P");
    expect(rec.recommended_strategy).toBeDefined();
    expect(Array.isArray(rec.alternatives)).toBe(true);
  });

  it("exportData() round-trips via importData()", () => {
    engine.recordOutcome("s1", "pocket", "P", { success: true });
    const data = engine.exportData();
    const eng2 = new MachineLearningStrategyRankerEngine();
    eng2.resetPriors(false);
    eng2.importData(data);
    const h = eng2.getPerformanceHistory("s1");
    expect(h.length).toBeGreaterThan(0);
  });

  it("resetPriors() clears all state", () => {
    engine.recordOutcome("s1", "pocket", "P", { success: true });
    const result = engine.resetPriors(false);
    expect(result.cleared_entries).toBeGreaterThan(0);
    expect(engine.getPerformanceHistory("s1").length).toBe(0);
  });
});
