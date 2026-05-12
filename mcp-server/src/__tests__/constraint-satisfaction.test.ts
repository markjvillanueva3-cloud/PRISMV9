import { describe, it, expect } from "vitest";
import { ConstraintSatisfactionEngine } from "../engines/ConstraintSatisfactionEngine.js";
import type { MachiningParameters, MachiningConstraints, MachineCapability } from "../engines/ConstraintSatisfactionEngine.js";

describe("ConstraintSatisfactionEngine", () => {
  const engine = new ConstraintSatisfactionEngine();

  const baseParams: MachiningParameters = {
    tool_diameter_mm: 10,
    flute_count: 4,
    overhang_mm: 40,
    stepover_mm: 2.5,
    stepdown_mm: 10,
    spindle_rpm: 8000,
    feed_per_tooth_mm: 0.08,
    cutting_speed_m_min: 250,
    material_iso_group: "P",
    geometry_volume_cm3: 50,
  };

  const baseMachine: MachineCapability = {
    max_spindle_power_kw: 15,
    max_rpm: 12000,
    max_feed_mmmin: 15000,
  };

  it("returns feasible for reasonable parameters", () => {
    const constraints: MachiningConstraints = {
      max_cycle_time_min: 30,
      max_spindle_power_kw: 15,
    };
    const result = engine.compute(baseParams, constraints, baseMachine);
    expect(result.feasible).toBe(true);
    expect(result.violations.length).toBe(0);
    expect(result.overall_score).toBeGreaterThan(0);
  });

  it("detects spindle power violation", () => {
    const constraints: MachiningConstraints = {
      max_spindle_power_kw: 1, // Very low limit
    };
    const result = engine.compute(baseParams, constraints, baseMachine);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.some(v => v.constraint.includes("Power"))).toBe(true);
    expect(result.feasible).toBe(false);
  });

  it("suggests adjustments for violations", () => {
    const constraints: MachiningConstraints = {
      max_spindle_power_kw: 1,
    };
    const result = engine.compute(baseParams, constraints, baseMachine);
    expect(result.suggested_adjustments.length).toBeGreaterThan(0);
    expect(result.suggested_adjustments[0].reason).toContain("Power");
  });

  it("checks surface finish constraint", () => {
    const constraints: MachiningConstraints = {
      max_surface_roughness_um: 0.1, // Very tight
    };
    const result = engine.compute(baseParams, constraints, baseMachine);
    const raCheck = result.checks.find(c => c.constraint.includes("Surface"));
    expect(raCheck).toBeDefined();
    expect(raCheck!.severity).toBe("violated");
  });

  it("checks tool life constraint", () => {
    const constraints: MachiningConstraints = {
      min_tool_life_parts: 1000, // Very high
    };
    const result = engine.compute(baseParams, constraints, baseMachine);
    const tlCheck = result.checks.find(c => c.constraint.includes("Tool Life"));
    expect(tlCheck).toBeDefined();
  });

  it("checks tool deflection constraint", () => {
    const longTool = { ...baseParams, overhang_mm: 100 };
    const constraints: MachiningConstraints = {
      max_tool_deflection_mm: 0.001,
    };
    const result = engine.compute(longTool, constraints, baseMachine);
    const deflCheck = result.checks.find(c => c.constraint.includes("Deflection"));
    expect(deflCheck).toBeDefined();
  });

  it("generates trade-off frontier with 3 scenarios", () => {
    const constraints: MachiningConstraints = {
      max_cycle_time_min: 20,
      max_surface_roughness_um: 3.2,
    };
    const result = engine.compute(baseParams, constraints, baseMachine);
    expect(result.trade_off_frontier.length).toBe(3);
    expect(result.trade_off_frontier[0].scenario).toBe("Speed Priority");
    expect(result.trade_off_frontier[2].scenario).toBe("Quality Priority");
    // Quality scenario should have better surface finish
    expect(result.trade_off_frontier[2].surface_finish_um)
      .toBeLessThan(result.trade_off_frontier[0].surface_finish_um);
  });

  it("detects cycle time vs surface finish conflict", () => {
    const constraints: MachiningConstraints = {
      max_cycle_time_min: 1, // Very fast
      max_surface_roughness_um: 0.5, // Very fine
    };
    const result = engine.compute(baseParams, constraints, baseMachine);
    expect(result.conflict_analysis.length).toBeGreaterThan(0);
  });

  it("handles aluminum (ISO N) correctly", () => {
    const alParams = { ...baseParams, material_iso_group: "N" as const, cutting_speed_m_min: 500 };
    const constraints: MachiningConstraints = { max_spindle_power_kw: 15 };
    const result = engine.compute(alParams, constraints, baseMachine);
    // Aluminum has lower cutting forces
    const powerCheck = result.checks.find(c => c.constraint.includes("Power"));
    expect(powerCheck).toBeDefined();
    expect(powerCheck!.actual).toBeLessThan(15); // Should be well within limits
  });

  it("handles titanium (ISO S) with high forces", () => {
    const tiParams = { ...baseParams, material_iso_group: "S" as const, cutting_speed_m_min: 50 };
    const constraints: MachiningConstraints = { max_spindle_power_kw: 5 };
    const result = engine.compute(tiParams, constraints, baseMachine);
    // Titanium has high specific cutting force
    const powerCheck = result.checks.find(c => c.constraint.includes("Power"));
    expect(powerCheck).toBeDefined();
  });

  it("validates RPM against machine max", () => {
    const highRPM = { ...baseParams, spindle_rpm: 20000 };
    const constraints: MachiningConstraints = {};
    const result = engine.compute(highRPM, constraints, baseMachine);
    const rpmCheck = result.checks.find(c => c.constraint.includes("RPM"));
    expect(rpmCheck).toBeDefined();
    expect(rpmCheck!.severity).toBe("violated");
  });

  it("returns margin percentages", () => {
    const constraints: MachiningConstraints = {
      max_spindle_power_kw: 15,
      max_cycle_time_min: 60,
    };
    const result = engine.compute(baseParams, constraints, baseMachine);
    for (const check of result.checks) {
      expect(typeof check.margin_pct).toBe("number");
    }
  });

  it("overall_score is 0-100", () => {
    const constraints: MachiningConstraints = {
      max_spindle_power_kw: 15,
      max_surface_roughness_um: 10,
    };
    const result = engine.compute(baseParams, constraints, baseMachine);
    expect(result.overall_score).toBeGreaterThanOrEqual(0);
    expect(result.overall_score).toBeLessThanOrEqual(100);
  });
});
