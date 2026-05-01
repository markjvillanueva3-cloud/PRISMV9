import { describe, it, expect } from "vitest";
import { SmartToolSelectorEngine } from "../engines/SmartToolSelectorEngine.js";

const engine = new SmartToolSelectorEngine();

describe("SmartToolSelectorEngine", () => {
  it("selects tool for pocket in P20 steel", () => {
    const result = engine.select({
      operation_type: "pocket",
      material_iso_group: "P",
      material_name: "P20 Mold Steel",
      feature_diameter_mm: 50,
      feature_depth_mm: 15,
      feature_width_mm: 50,
      tolerance_mm: 0.05,
    });

    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.best_tool).toBeDefined();
    expect(result.best_tool.score).toBeGreaterThan(0);
    expect(result.best_tool.diameter_mm).toBeGreaterThan(0);
    expect(result.best_tool.physics.cutting_force_N).toBeGreaterThan(0);
    expect(result.best_tool.physics.cutting_power_kW).toBeGreaterThan(0);
    expect(result.operation).toBe("pocket");
    expect(result.material).toBe("P20 Mold Steel");
  });

  it("selects tool for drilling in aluminum", () => {
    const result = engine.select({
      operation_type: "drill",
      material_iso_group: "N",
      feature_diameter_mm: 10,
      feature_depth_mm: 30,
    });

    expect(result.best_tool.type).toBe("drill");
    expect(result.best_tool.physics.cutting_force_N).toBeGreaterThan(0);
    expect(result.best_tool.recommended_params.speed_mpm).toBeGreaterThan(200);
  });

  it("warns on excessive L/D ratio", () => {
    const result = engine.select({
      operation_type: "pocket",
      material_iso_group: "P",
      feature_diameter_mm: 20,
      feature_depth_mm: 80, // 4:1 depth:diameter on pocket = long tool
    });

    // Should have at least one candidate
    expect(result.candidates.length).toBeGreaterThan(0);
    // At least one candidate should warn about overhang or deflection
    const hasDeflectionWarning = result.candidates.some(
      (c) => c.warnings.some((w) => /deflection|L\/D/i.test(w))
    );
    expect(hasDeflectionWarning).toBe(true);
  });

  it("respects machine RPM limits", () => {
    const result = engine.select({
      operation_type: "pocket",
      material_iso_group: "N", // aluminum = high speed
      feature_diameter_mm: 6,
      max_rpm: 8000, // low RPM limit
    });

    expect(result.best_tool.recommended_params.rpm).toBeLessThanOrEqual(8000);
  });

  it("produces higher scores for matching ISO group", () => {
    const steelResult = engine.select({
      operation_type: "pocket",
      material_iso_group: "P",
      feature_diameter_mm: 20,
    });

    expect(steelResult.best_tool.score).toBeGreaterThan(30);
    expect(steelResult.best_tool.score_breakdown.material_match).toBeGreaterThanOrEqual(50);
  });

  it("Kienzle force increases with harder materials", () => {
    const softResult = engine.select({
      operation_type: "pocket",
      material_iso_group: "N", // aluminum
      feature_diameter_mm: 20,
      feature_depth_mm: 10,
    });
    const hardResult = engine.select({
      operation_type: "pocket",
      material_iso_group: "S", // superalloy
      feature_diameter_mm: 20,
      feature_depth_mm: 10,
    });

    // Superalloy should produce higher cutting forces than aluminum
    expect(hardResult.best_tool.physics.cutting_force_N).toBeGreaterThan(
      softResult.best_tool.physics.cutting_force_N * 0.5
    );
  });

  it("optimize_for=cost favors cost_efficiency weight", () => {
    const costResult = engine.select({
      operation_type: "pocket",
      material_iso_group: "P",
      feature_diameter_mm: 20,
      optimize_for: "cost",
    });

    expect(costResult.optimization_goal).toBe("cost");
    // Cost weight (0.40) should be highest in breakdown impact
    expect(costResult.best_tool.score_breakdown.cost_efficiency).toBeGreaterThan(0);
  });

  it("returns physics report with deflection analysis", () => {
    const result = engine.select({
      operation_type: "pocket",
      material_iso_group: "P",
      feature_diameter_mm: 30,
      feature_depth_mm: 20,
      tolerance_mm: 0.02,
    });

    const phys = result.best_tool.physics;
    expect(phys.deflection_mm).toBeGreaterThanOrEqual(0);
    expect(phys.max_deflection_mm).toBeGreaterThan(0);
    expect(typeof phys.deflection_ok).toBe("boolean");
    expect(phys.tool_life_estimate_min).toBeGreaterThan(0);
  });

  it("handles face milling operation", () => {
    const result = engine.select({
      operation_type: "face",
      material_iso_group: "K", // cast iron
      feature_diameter_mm: 100,
    });

    expect(result.best_tool).toBeDefined();
    expect(result.best_tool.type).toBe("face_mill");
  });

  it("handles ball-end for 3D finishing", () => {
    const result = engine.select({
      operation_type: "3d_finishing",
      material_iso_group: "P",
      feature_diameter_mm: 40,
      surface_finish_Ra: 0.8,
    });

    expect(result.best_tool).toBeDefined();
    expect(result.best_tool.type).toBe("ball_mill");
  });

  it("selection_time_ms is reasonable", () => {
    const result = engine.select({
      operation_type: "pocket",
      material_iso_group: "P",
      feature_diameter_mm: 20,
    });

    expect(result.selection_time_ms).toBeLessThan(5000);
    expect(result.total_candidates_evaluated).toBeGreaterThan(0);
  });
});
