import { describe, it, expect } from "vitest";
import { PostSelectionEngine } from "../engines/PostSelectionEngine.js";
import type { JobContext } from "../engines/PostSelectionEngine.js";

describe("PostSelectionEngine", () => {
  const engine = new PostSelectionEngine();

  const baseCtx: JobContext = {
    machine: {
      controller: "fanuc",
      max_rpm: 12000,
      spindle_power_kw: 15,
      axis_count: 3,
      has_tsc: true,
      has_probing: true,
      has_rigid_tapping: true,
      taper: "BT40",
    },
    part: {
      complexity: "moderate",
      tolerance_mm: 0.05,
      surface_finish_target_um: 3.2,
      has_deep_pockets: false,
      has_thin_walls: false,
      has_tight_corners: false,
      max_depth_mm: 20,
      estimated_cycle_time_min: 30,
    },
    material: {
      iso_group: "P",
      hardness_hrc: 28,
      thermal_sensitivity: "medium",
    },
    cam_source: "hypermill",
    operation_type: "roughing",
    tool_count: 6,
    production_volume: "medium",
  };

  it("selects features for a basic roughing job", () => {
    const result = engine.compute(baseCtx);
    expect(result.selected_features.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(0.95);
    expect(result.controller_config.controller).toBe("fanuc");
  });

  it("always selects safe retract", () => {
    const result = engine.compute(baseCtx);
    const safeRetract = result.selected_features.find(f => f.id === "safe_retract");
    expect(safeRetract).toBeDefined();
    expect(safeRetract!.score).toBe(90);
  });

  it("selects adaptive clearing for roughing", () => {
    const result = engine.compute(baseCtx);
    const adaptive = result.selected_features.find(f => f.id === "adaptive_clearing");
    expect(adaptive).toBeDefined();
  });

  it("selects chip thinning for roughing", () => {
    const result = engine.compute(baseCtx);
    const chipThin = result.selected_features.find(f => f.id === "chip_thinning_comp");
    expect(chipThin).toBeDefined();
    expect(chipThin!.score).toBe(85);
  });

  it("rejects NURBS for fanuc controller", () => {
    const result = engine.compute(baseCtx);
    const nurbs = result.rejected_features.find(f => f.id === "nurbs_interpolation");
    expect(nurbs).toBeDefined();
    expect(nurbs!.reason).toContain("Not supported");
  });

  it("enables TCPM for 5-axis machines", () => {
    const ctx5: JobContext = {
      ...baseCtx,
      machine: { ...baseCtx.machine, axis_count: 5 },
    };
    const result = engine.compute(ctx5);
    const tcpm = result.selected_features.find(f => f.id === "tcpm_mode");
    expect(tcpm).toBeDefined();
    expect(tcpm!.score).toBe(98);
  });

  it("selects collision check for 5-axis siemens", () => {
    const ctx5: JobContext = {
      ...baseCtx,
      machine: { ...baseCtx.machine, axis_count: 5, controller: "siemens" },
    };
    const result = engine.compute(ctx5);
    const collision = result.selected_features.find(f => f.id === "collision_check");
    expect(collision).toBeDefined();
    expect(collision!.score).toBe(95);
  });

  it("detects synergy between adaptive clearing and chip thinning", () => {
    const result = engine.compute(baseCtx);
    const synergy = result.feature_interactions.find(
      i => i.features.includes("adaptive_clearing") && i.features.includes("chip_thinning_comp")
    );
    expect(synergy).toBeDefined();
    expect(synergy!.type).toBe("synergy");
  });

  it("resolves NURBS vs arc fitting conflict on siemens", () => {
    const ctx: JobContext = {
      ...baseCtx,
      machine: { ...baseCtx.machine, controller: "siemens" },
      part: { ...baseCtx.part, complexity: "complex" },
      operation_type: "finishing",
    };
    const result = engine.compute(ctx);
    // NURBS should win over arc fitting (higher score for complex parts)
    const nurbs = result.selected_features.find(f => f.id === "nurbs_interpolation");
    const arcFit = result.rejected_features.find(f => f.id === "arc_fitting");
    expect(nurbs).toBeDefined();
    expect(arcFit).toBeDefined();
  });

  it("selects TSC for deep pockets", () => {
    const ctx: JobContext = {
      ...baseCtx,
      part: { ...baseCtx.part, has_deep_pockets: true, max_depth_mm: 50 },
    };
    const result = engine.compute(ctx);
    const tsc = result.selected_features.find(f => f.id === "through_spindle_coolant");
    expect(tsc).toBeDefined();
    expect(tsc!.score).toBe(95);
  });

  it("selects probing for tight tolerance", () => {
    const ctx: JobContext = {
      ...baseCtx,
      part: { ...baseCtx.part, tolerance_mm: 0.01 },
      operation_type: "finishing",
    };
    const result = engine.compute(ctx);
    const probing = result.selected_features.find(f => f.id === "in_process_probing");
    expect(probing).toBeDefined();
    expect(probing!.score).toBe(95);
  });

  it("selects sister tooling for high volume", () => {
    const ctx: JobContext = { ...baseCtx, production_volume: "high" };
    const result = engine.compute(ctx);
    const sister = result.selected_features.find(f => f.id === "sister_tooling");
    expect(sister).toBeDefined();
    expect(sister!.score).toBe(95);
  });

  it("rejects sister tooling for prototypes", () => {
    const ctx: JobContext = { ...baseCtx, production_volume: "prototype" };
    const result = engine.compute(ctx);
    const sister = result.rejected_features.find(f => f.id === "sister_tooling");
    expect(sister).toBeDefined();
  });

  it("selects SSV for haas with hard materials", () => {
    const ctx: JobContext = {
      ...baseCtx,
      machine: { ...baseCtx.machine, controller: "haas" },
      material: { ...baseCtx.material, iso_group: "S" },
    };
    const result = engine.compute(ctx);
    const ssv = result.selected_features.find(f => f.id === "ssv_mode");
    expect(ssv).toBeDefined();
    expect(ssv!.score).toBe(85);
  });

  it("sets smoothing mode based on operation type", () => {
    const roughResult = engine.compute(baseCtx);
    expect(roughResult.controller_config.smoothing_mode).toBe("rough");

    const finishCtx: JobContext = { ...baseCtx, operation_type: "finishing" };
    const finishResult = engine.compute(finishCtx);
    expect(finishResult.controller_config.smoothing_mode).toBe("ultra");
  });

  it("estimates cycle time improvement", () => {
    const result = engine.compute(baseCtx);
    // Roughing with adaptive clearing + chip thinning should show negative (faster)
    expect(result.estimated_improvement.cycle_time_pct).toBeLessThan(0);
  });

  it("generates a rationale string", () => {
    const result = engine.compute(baseCtx);
    expect(result.rationale).toContain("FANUC");
    expect(result.rationale).toContain("3-axis");
    expect(result.rationale).toContain("P-group");
  });

  it("returns available features for a controller", () => {
    const fanucFeatures = engine.getAvailableFeatures("fanuc");
    expect(fanucFeatures).toContain("hsm_smoothing");
    expect(fanucFeatures).toContain("safe_retract");
    expect(fanucFeatures).not.toContain("nurbs_interpolation"); // siemens/heidenhain only
  });

  it("sets 4 decimal places for tight tolerance", () => {
    const ctx: JobContext = {
      ...baseCtx,
      part: { ...baseCtx.part, tolerance_mm: 0.005 },
    };
    const result = engine.compute(ctx);
    expect(result.controller_config.decimal_places).toBe(4);
  });

  it("enables canned cycles for drilling", () => {
    const ctx: JobContext = { ...baseCtx, operation_type: "drilling" };
    const result = engine.compute(ctx);
    expect(result.controller_config.canned_cycles).toBe(true);
  });
});
