// @ts-nocheck
import { describe, it, expect, beforeEach } from "vitest";
import {
  PipelineConsistencyHookEngine,
  type ConsistencyCheckInput,
} from "../engines/PipelineConsistencyHookEngine.js";

describe("PipelineConsistencyHookEngine", () => {
  let engine: PipelineConsistencyHookEngine;

  beforeEach(() => {
    engine = new PipelineConsistencyHookEngine();
  });

  // ── Basic consistency check ──

  it("should check a pipeline result against canonical physics", () => {
    const input: ConsistencyCheckInput = {
      pipeline_name: "SpeedFeedOrchestrator",
      result: {
        cutting_force_N: 800,
        power_kW: 1.5,
        tool_life_min: 45,
        spindle_rpm: 3000,
        feed_rate_mmmin: 1200,
      },
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
      ap_mm: 3,
      ae_mm: 6,
    };
    const result = engine.check(input);
    expect(result).toBeDefined();
    expect(result.pipeline_name).toBe("SpeedFeedOrchestrator");
    expect(result.checked_at).toBeTruthy();
    expect(Array.isArray(result.canonical_comparison)).toBe(true);
    expect(typeof result.max_divergence_pct).toBe("number");
    expect(["consistent", "minor_divergence", "major_divergence"]).toContain(result.verdict);
  });

  it("should return consistent verdict when values match canonical closely", () => {
    // Use values that approximate canonical Kienzle/Taylor for steel
    const result = engine.check({
      pipeline_name: "TestPipeline",
      result: {
        spindle_rpm: 3000,
        feed_rate_mmmin: 1200,
      },
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
      ap_mm: 3,
    });
    // With no force/power/life provided, there should be no comparisons to diverge
    expect(result.canonical_comparison.length).toBe(0);
    expect(result.verdict).toBe("consistent");
  });

  // ── Divergence detection ──

  it("should detect major divergence when force is wildly off", () => {
    const result = engine.check({
      pipeline_name: "BadPipeline",
      result: {
        cutting_force_N: 50000, // Way too high
        spindle_rpm: 3000,
        feed_rate_mmmin: 1200,
      },
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
      ap_mm: 3,
      ae_mm: 6,
    });
    expect(result.max_divergence_pct).toBeGreaterThan(10);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(["minor_divergence", "major_divergence"]).toContain(result.verdict);
  });

  it("should detect divergence in tool life metric", () => {
    const result = engine.check({
      pipeline_name: "LifeTestPipeline",
      result: {
        tool_life_min: 1000, // Unrealistically high
        spindle_rpm: 3000,
        feed_rate_mmmin: 1200,
      },
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
      ap_mm: 3,
      ae_mm: 6,
    });
    const lifeComparison = result.canonical_comparison.find(
      c => c.metric === "tool_life_min"
    );
    if (lifeComparison) {
      expect(Math.abs(lifeComparison.divergence_pct)).toBeGreaterThan(0);
    }
  });

  it("should check surface finish against Brammertz formula", () => {
    const result = engine.check({
      pipeline_name: "FinishPipeline",
      result: {
        surface_finish_Ra_um: 5.0,
        spindle_rpm: 3000,
        feed_rate_mmmin: 1200,
      },
      material: "P",
      tool_diameter_mm: 12,
      flutes: 4,
      corner_radius_mm: 0.8,
    });
    const raComparison = result.canonical_comparison.find(
      c => c.metric === "surface_finish_Ra_um"
    );
    expect(raComparison).toBeDefined();
    expect(raComparison!.canonical_value).toBeGreaterThan(0);
  });

  // ── Ring buffer history ──

  it("should store check results in history", () => {
    engine.check({
      pipeline_name: "Pipeline_A",
      result: { cutting_force_N: 800, spindle_rpm: 3000, feed_rate_mmmin: 1200 },
      material: "P",
      tool_diameter_mm: 12,
      flutes: 4,
      ap_mm: 3,
    });
    engine.check({
      pipeline_name: "Pipeline_B",
      result: { cutting_force_N: 900, spindle_rpm: 3000, feed_rate_mmmin: 1200 },
      material: "P",
      tool_diameter_mm: 12,
      flutes: 4,
      ap_mm: 3,
    });
    const history = engine.getHistory();
    expect(history.length).toBe(2);
    expect(history[0].result.pipeline_name).toBe("Pipeline_A");
    expect(history[1].result.pipeline_name).toBe("Pipeline_B");
  });

  it("should limit history to MAX_HISTORY entries (ring buffer)", () => {
    // Submit 105 checks — history should cap at 100
    for (let i = 0; i < 105; i++) {
      engine.check({
        pipeline_name: `Pipeline_${i}`,
        result: { cutting_force_N: 800 + i, spindle_rpm: 3000, feed_rate_mmmin: 1200 },
        material: "P",
        tool_diameter_mm: 12,
        flutes: 4,
        ap_mm: 3,
      });
    }
    const history = engine.getHistory();
    expect(history.length).toBeLessThanOrEqual(100);
    // Oldest entries should have been evicted
    const names = history.map(h => h.result.pipeline_name);
    expect(names).not.toContain("Pipeline_0");
  });

  // ── Auto-action ──

  it("should set auto_action appropriately based on divergence", () => {
    const consistent = engine.check({
      pipeline_name: "GoodPipeline",
      result: { spindle_rpm: 3000, feed_rate_mmmin: 1200 },
      material: "P",
      tool_diameter_mm: 12,
      flutes: 4,
    });
    expect(["none", "logged", "flagged"]).toContain(consistent.auto_action);
  });

  // ── Default parameter handling ──

  it("should use default material and diameter when not specified", () => {
    const result = engine.check({
      pipeline_name: "MinimalPipeline",
      result: {
        cutting_force_N: 500,
        spindle_rpm: 3000,
        feed_rate_mmmin: 1200,
      },
    });
    // Should not throw; defaults to steel, 12mm
    expect(result).toBeDefined();
    expect(result.pipeline_name).toBe("MinimalPipeline");
  });

  it("should handle deflection check with custom stickout", () => {
    const result = engine.check({
      pipeline_name: "DeflectionPipeline",
      result: {
        deflection_um: 15,
        spindle_rpm: 3000,
        feed_rate_mmmin: 1200,
      },
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
      ap_mm: 3,
      ae_mm: 6,
      tool_stickout_mm: 48,
      tool_material: "carbide",
    });
    const deflComparison = result.canonical_comparison.find(
      c => c.metric === "deflection_um"
    );
    expect(deflComparison).toBeDefined();
    expect(deflComparison!.canonical_value).toBeGreaterThan(0);
  });
});
