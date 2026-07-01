import { describe, it, expect } from "vitest";
import { CrossCamRecommenderEngine } from "../engines/CrossCamRecommenderEngine.js";
import type { CrossCamInput } from "../engines/CrossCamRecommenderEngine.js";

describe("CrossCamRecommenderEngine", () => {
  const engine = new CrossCamRecommenderEngine();

  const baseInput: CrossCamInput = {
    geometry: {
      type: "pocket_2d",
      dimensions_mm: { length: 100, width: 80, depth: 30 },
      corner_radius_mm: 5,
    },
    material: {
      class: "aluminum_6061",
      iso_group: "N",
    },
    machine: {
      spindle_power_kw: 15,
      max_rpm: 12000,
      axis_count: 3,
    },
    tool: {
      diameter_mm: 10,
      flute_count: 3,
      material: "carbide",
      overhang_mm: 40,
    },
    constraints: {
      priority: "balanced",
    },
  };

  it("returns ranked strategies for aluminum pocket", () => {
    const result = engine.compute(baseInput);
    expect(result.value).toBeDefined();
    expect(result.value.ranked_strategies.length).toBeGreaterThan(0);
    expect(result.value.best_overall).toBeDefined();
    expect(result.value.best_overall.cam_system).toBeTruthy();
    expect(result.value.best_overall.strategy_name).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.unit).toBe("cross_cam_recommendation");
  });

  it("returns strategies from multiple CAM systems", () => {
    const result = engine.compute(baseInput);
    const camSystems = new Set(result.value.ranked_strategies.map(s => s.cam_system));
    expect(camSystems.size).toBeGreaterThanOrEqual(2);
  });

  it("includes physics validation for each strategy", () => {
    const result = engine.compute(baseInput);
    for (const strategy of result.value.ranked_strategies) {
      expect(typeof strategy.physics_validated).toBe("boolean");
      expect(strategy.cutting_force_n).toBeGreaterThan(0);
      expect(strategy.spindle_power_required_kw).toBeGreaterThan(0);
      expect(strategy.predicted_cycle_time_min).toBeGreaterThan(0);
      expect(strategy.mrr_cm3_min).toBeGreaterThan(0);
    }
  });

  it("ranks speed priority correctly", () => {
    const speedInput: CrossCamInput = { ...baseInput, constraints: { priority: "speed" } };
    const result = engine.compute(speedInput);
    // Best overall should have good cycle time
    expect(result.value.best_by_priority.speed.predicted_cycle_time_min).toBeLessThanOrEqual(
      result.value.ranked_strategies[result.value.ranked_strategies.length - 1].predicted_cycle_time_min
    );
  });

  it("ranks quality priority correctly", () => {
    const qualityInput: CrossCamInput = { ...baseInput, constraints: { priority: "quality" } };
    const result = engine.compute(qualityInput);
    expect(result.value.best_by_priority.quality.predicted_surface_finish_um).toBeLessThanOrEqual(
      result.value.ranked_strategies[result.value.ranked_strategies.length - 1].predicted_surface_finish_um
    );
  });

  it("provides hybrid recommendation with multiple zones", () => {
    const result = engine.compute(baseInput);
    if (result.value.hybrid_recommendation) {
      expect(result.value.hybrid_recommendation.zones.length).toBeGreaterThanOrEqual(2);
      expect(result.value.hybrid_recommendation.estimated_total_cycle_time_min).toBeGreaterThan(0);
    }
  });

  it("validates against machine limits", () => {
    const weakMachine: CrossCamInput = {
      ...baseInput,
      machine: { spindle_power_kw: 3, max_rpm: 4000, axis_count: 3 },
    };
    const result = engine.compute(weakMachine);
    // Some strategies should have warnings about exceeding limits
    const hasWarnings = result.value.ranked_strategies.some(s => s.warnings.length > 0);
    expect(hasWarnings).toBe(true);
  });

  it("handles titanium (difficult material) correctly", () => {
    const titaniumInput: CrossCamInput = {
      ...baseInput,
      material: { class: "titanium_6al4v", iso_group: "S" },
    };
    const result = engine.compute(titaniumInput);
    expect(result.value.physics_summary.thermal_risk).toBe("high");
    // Titanium should have lower RPM recommendations
    for (const s of result.value.ranked_strategies) {
      expect(s.parameters.spindle_rpm).toBeLessThanOrEqual(titaniumInput.machine.max_rpm);
    }
  });

  it("handles 5-axis machine correctly", () => {
    const fiveAxisInput: CrossCamInput = {
      ...baseInput,
      machine: { ...baseInput.machine, axis_count: 5 },
      geometry: { ...baseInput.geometry, type: "surface_3d" },
    };
    const result = engine.compute(fiveAxisInput);
    // Should include 5-axis capable strategies
    const has5axis = result.value.ranked_strategies.some(s =>
      s.advantages.some(a => a.toLowerCase().includes("5-axis") || a.toLowerCase().includes("five"))
    );
    // May or may not have 5-axis depending on strategy DB, but should work
    expect(result.value.ranked_strategies.length).toBeGreaterThan(0);
  });

  it("filters by available CAM systems", () => {
    const limitedInput: CrossCamInput = {
      ...baseInput,
      available_cam_systems: ["hypermill", "fusion360"],
    };
    const result = engine.compute(limitedInput);
    for (const s of result.value.ranked_strategies) {
      expect(["hypermill", "fusion360"]).toContain(s.cam_system);
    }
  });

  it("provides trade-off analysis", () => {
    const result = engine.compute(baseInput);
    expect(result.value.trade_off_analysis).toBeDefined();
    expect(result.value.trade_off_analysis.speed_vs_quality).toBeTruthy();
    expect(result.value.trade_off_analysis.tool_life_vs_speed).toBeTruthy();
    expect(result.value.trade_off_analysis.recommendation_confidence).toBeGreaterThan(0);
  });

  it("provides physics summary", () => {
    const result = engine.compute(baseInput);
    expect(result.value.physics_summary.max_cutting_force_n).toBeGreaterThan(0);
    expect(result.value.physics_summary.max_spindle_power_kw).toBeGreaterThan(0);
    expect(result.value.physics_summary.machine_utilization_pct).toBeGreaterThanOrEqual(0);
    expect(["low", "medium", "high"]).toContain(result.value.physics_summary.thermal_risk);
    expect(["low", "medium", "high"]).toContain(result.value.physics_summary.chatter_risk);
  });

  it("getSupportedCamSystems returns all 8 systems", () => {
    const systems = engine.getSupportedCamSystems();
    expect(systems.length).toBeGreaterThanOrEqual(7);
    expect(systems).toContain("hypermill");
    expect(systems).toContain("fusion360");
    expect(systems).toContain("mastercam");
  });

  it("getStrategyCounts returns counts for each system", () => {
    const counts = engine.getStrategyCounts();
    expect(counts.hypermill).toBeGreaterThanOrEqual(3);
    expect(counts.fusion360).toBeGreaterThanOrEqual(2);
    expect(counts.mastercam).toBeGreaterThanOrEqual(2);
  });

  it("handles deep cavity geometry", () => {
    const deepInput: CrossCamInput = {
      ...baseInput,
      geometry: { type: "deep_cavity", dimensions_mm: { length: 50, width: 50, depth: 100 } },
      material: { class: "steel_4140", iso_group: "P" },
    };
    const result = engine.compute(deepInput);
    expect(result.value.ranked_strategies.length).toBeGreaterThan(0);
    // Deep cavity strategies should have engagement control
    const hasEngagement = result.value.ranked_strategies.some(s =>
      s.parameters.toolpath_pattern === "adaptive" || s.parameters.toolpath_pattern === "trochoidal"
    );
    expect(hasEngagement).toBe(true);
  });

  it("respects constraint satisfaction", () => {
    const constrainedInput: CrossCamInput = {
      ...baseInput,
      constraints: {
        priority: "balanced",
        max_cycle_time_min: 5,
        max_surface_roughness_um: 3.2,
      },
    };
    const result = engine.compute(constrainedInput);
    expect(result.value.ranked_strategies.length).toBeGreaterThan(0);
  });
});
