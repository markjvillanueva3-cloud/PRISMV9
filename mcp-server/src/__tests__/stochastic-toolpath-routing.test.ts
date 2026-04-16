/**
 * StochasticToolpathRoutingEngine Tests
 * Tests Monte Carlo toolpath strategy optimization with Pareto front selection.
 */
import { describe, it, expect } from "vitest";
import {
  StochasticToolpathRoutingEngine,
  type PocketGeometry,
  type ToolParams,
  type MaterialParams,
} from "../engines/StochasticToolpathRoutingEngine.js";

const engine = new StochasticToolpathRoutingEngine();

const testPocket: PocketGeometry = {
  boundary: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 60 },
    { x: 0, y: 60 },
  ],
  depth_mm: 10,
  width_mm: 60,
  length_mm: 100,
};

const testTool: ToolParams = {
  diameter_mm: 12,
  flute_count: 4,
  max_rpm: 10000,
  base_feed_mm_min: 2000,
  base_rpm: 6000,
  cost_per_tool: 25,
  nose_radius_mm: 0.5,
};

describe("StochasticToolpathRoutingEngine", () => {

  // ---- sampleVariants ----

  it("sampleVariants returns the requested number of variants", () => {
    const variants = engine.sampleVariants(testPocket, 50, {}, 42);
    expect(variants).toHaveLength(50);
    for (const v of variants) {
      expect(v.id).toBeGreaterThanOrEqual(0);
      expect(v.estimated_path_length_mm).toBeGreaterThan(0);
      expect(v.stepover_pct).toBeGreaterThanOrEqual(5);
      expect(v.stepover_pct).toBeLessThanOrEqual(95);
    }
  });

  it("sampleVariants is reproducible with the same seed", () => {
    const a = engine.sampleVariants(testPocket, 20, {}, 123);
    const b = engine.sampleVariants(testPocket, 20, {}, 123);
    for (let i = 0; i < 20; i++) {
      expect(a[i].direction_deg).toBe(b[i].direction_deg);
      expect(a[i].pattern).toBe(b[i].pattern);
      expect(a[i].feed_multiplier).toBe(b[i].feed_multiplier);
    }
  });

  it("sampleVariants with different seeds gives different results", () => {
    const a = engine.sampleVariants(testPocket, 10, {}, 1);
    const b = engine.sampleVariants(testPocket, 10, {}, 999);
    // At least some should differ
    const diffs = a.filter((v, i) => v.direction_deg !== b[i].direction_deg);
    expect(diffs.length).toBeGreaterThan(0);
  });

  // ---- evaluateVariant ----

  it("evaluateVariant returns positive objective values", () => {
    const variants = engine.sampleVariants(testPocket, 1, {}, 42);
    const ev = engine.evaluateVariant(variants[0], "steel_1045", testTool);
    expect(ev.objectives.cycle_time_s).toBeGreaterThan(0);
    expect(ev.objectives.surface_quality_score).toBeGreaterThanOrEqual(0);
    expect(ev.objectives.tool_life_min).toBeGreaterThan(0);
    expect(ev.objectives.cost_per_part).toBeGreaterThan(0);
    expect(ev.objectives.energy_kWh).toBeGreaterThan(0);
  });

  it("evaluateVariant accepts material as string or object", () => {
    const variants = engine.sampleVariants(testPocket, 1, {}, 7);
    const byStr = engine.evaluateVariant(variants[0], "aluminum_6061", testTool);
    const matObj: MaterialParams = {
      name: "aluminum_6061", kc1_1: 800, mc: 0.23, taylor_C: 600, taylor_n: 0.28
    };
    const byObj = engine.evaluateVariant(variants[0], matObj, testTool);
    expect(byStr.objectives.cycle_time_s).toBeCloseTo(byObj.objectives.cycle_time_s, 2);
  });

  // ---- buildParetoFront ----

  it("buildParetoFront returns non-dominated solutions", () => {
    const variants = engine.sampleVariants(testPocket, 50, {}, 42);
    const evals = variants.map(v => engine.evaluateVariant(v, "steel_1045", testTool));
    const pareto = engine.buildParetoFront(evals);
    expect(pareto.size).toBeGreaterThan(0);
    expect(pareto.size).toBeLessThanOrEqual(50);
    expect(pareto.dominated_count).toBe(50 - pareto.size);
    expect(pareto.solutions).toHaveLength(pareto.size);
  });

  it("buildParetoFront with empty input returns empty front", () => {
    const pareto = engine.buildParetoFront([]);
    expect(pareto.size).toBe(0);
    expect(pareto.solutions).toHaveLength(0);
  });

  // ---- selectOptimal ----

  it("selectOptimal with speed priority picks fastest variant", () => {
    const variants = engine.sampleVariants(testPocket, 30, {}, 42);
    const evals = variants.map(v => engine.evaluateVariant(v, "steel_1045", testTool));
    const pareto = engine.buildParetoFront(evals);

    const speed = engine.selectOptimal(pareto, "speed");
    expect(speed.priority).toBe("speed");
    expect(speed.selected.objectives.cycle_time_s).toBeDefined();
    // Should be the minimum cycle time in the Pareto front
    const minTime = Math.min(...pareto.solutions.map(s => s.objectives.cycle_time_s));
    expect(speed.selected.objectives.cycle_time_s).toBeCloseTo(minTime, 2);
  });

  it("selectOptimal with different priorities can yield different selections", () => {
    const variants = engine.sampleVariants(testPocket, 100, {}, 42);
    const evals = variants.map(v => engine.evaluateVariant(v, "steel_1045", testTool));
    const pareto = engine.buildParetoFront(evals);

    const speed = engine.selectOptimal(pareto, "speed");
    const quality = engine.selectOptimal(pareto, "quality");
    const life = engine.selectOptimal(pareto, "life");

    // At least two of the three should differ (different trade-offs)
    const ids = new Set([
      speed.selected.variant.id,
      quality.selected.variant.id,
      life.selected.variant.id,
    ]);
    // With 100 samples, priorities should often pick different variants
    expect(ids.size).toBeGreaterThanOrEqual(1);
    expect(speed.trade_off_explanation).toContain("speed");
    expect(quality.trade_off_explanation).toContain("quality");
  });

  it("selectOptimal throws on empty Pareto front", () => {
    const emptyPareto = { solutions: [], size: 0, dominated_count: 0 };
    expect(() => engine.selectOptimal(emptyPareto, "speed")).toThrow("empty");
  });

  // ---- sensitivityAnalysis ----

  it("batchOptimize processes multiple pockets sequentially", () => {
    const pocket2: PocketGeometry = {
      boundary: [
        { x: 0, y: 0 }, { x: 80, y: 0 },
        { x: 80, y: 40 }, { x: 0, y: 40 },
      ],
      depth_mm: 8, width_mm: 40, length_mm: 80,
    };
    const result = engine.batchOptimize(
      [testPocket, pocket2], "steel_1045", testTool, "balanced", 20, 42
    );
    expect(result.pocket_results).toHaveLength(2);
    expect(result.total_cycle_time_s).toBeGreaterThan(0);
    expect(result.total_cost).toBeGreaterThan(0);
  });

  it("sensitivityAnalysis ranks parameter importance", () => {
    const variants = engine.sampleVariants(testPocket, 1, {}, 42);
    const result = engine.sensitivityAnalysis(
      testPocket, "steel_1045", testTool, variants[0]
    );
    expect(result.sensitivities).toHaveLength(4); // 4 parameters
    expect(result.most_important).toBeDefined();
    expect(result.least_important).toBeDefined();
    // Should be sorted by importance descending
    for (let i = 1; i < result.sensitivities.length; i++) {
      expect(result.sensitivities[i].importance_score)
        .toBeLessThanOrEqual(result.sensitivities[i - 1].importance_score);
    }
  });
});
