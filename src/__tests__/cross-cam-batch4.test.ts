import { describe, it, expect } from "vitest";
import { ChatterStabilityLobeEngine } from "../engines/ChatterStabilityLobeEngine.js";
import type { ChatterInput } from "../engines/ChatterStabilityLobeEngine.js";
import { SurfaceIntegrityPredictorEngine } from "../engines/SurfaceIntegrityPredictorEngine.js";
import type { SurfaceIntegrityInput } from "../engines/SurfaceIntegrityPredictorEngine.js";
import { MachiningEnergyModelEngine } from "../engines/MachiningEnergyModelEngine.js";
import type { MachiningEnergyInput } from "../engines/MachiningEnergyModelEngine.js";

// ═══════════════════════════════════════════════════════════════
// ChatterStabilityLobeEngine
// ═══════════════════════════════════════════════════════════════

describe("ChatterStabilityLobeEngine", () => {
  const engine = new ChatterStabilityLobeEngine();

  const baseInput: ChatterInput = {
    tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 40, material: "carbide" },
    workpiece: { iso_group: "P" },
    machine: { max_rpm: 12000, natural_frequency_hz: 2500, damping_ratio: 0.03, stiffness_n_um: 30 },
    cutting: { radial_immersion_ratio: 0.25, up_milling: false },
  };

  it("generates stability lobes", () => {
    const result = engine.compute(baseInput);
    expect(result.value.lobes.length).toBeGreaterThan(0);
  });

  it("finds optimal RPM", () => {
    const result = engine.compute(baseInput);
    expect(result.value.optimal_rpm).toBeGreaterThan(0);
    expect(result.value.optimal_rpm).toBeLessThanOrEqual(baseInput.machine.max_rpm);
  });

  it("computes max stable depth of cut", () => {
    const result = engine.compute(baseInput);
    expect(result.value.max_stable_ap_mm).toBeGreaterThan(0);
  });

  it("identifies stable pockets", () => {
    const result = engine.compute(baseInput);
    expect(result.value.stable_pockets.length).toBeGreaterThan(0);
    for (const pocket of result.value.stable_pockets) {
      expect(pocket.rpm_range[1]).toBeGreaterThan(pocket.rpm_range[0]);
      expect(pocket.max_ap_mm).toBeGreaterThan(0);
    }
  });

  it("lower stiffness → lower stable depth", () => {
    const stiff = engine.compute(baseInput);
    const flexible = engine.compute({
      ...baseInput,
      machine: { ...baseInput.machine, stiffness_n_um: 5 },
    });
    expect(flexible.value.max_stable_ap_mm).toBeLessThan(stiff.value.max_stable_ap_mm);
  });

  it("provides recommendations", () => {
    const result = engine.compute(baseInput);
    expect(result.value.recommendations.length).toBeGreaterThan(0);
  });

  it("warns for high L/D ratio", () => {
    const longTool = engine.compute({
      ...baseInput,
      tool: { ...baseInput.tool, overhang_mm: 80 },
    });
    expect(longTool.value.recommendations.some(r => r.includes("L/D"))).toBe(true);
  });

  it("returns Altintas-Budak formula reference", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("Altintas");
  });
});

// ═══════════════════════════════════════════════════════════════
// SurfaceIntegrityPredictorEngine
// ═══════════════════════════════════════════════════════════════

describe("SurfaceIntegrityPredictorEngine", () => {
  const engine = new SurfaceIntegrityPredictorEngine();

  const baseInput: SurfaceIntegrityInput = {
    tool: { nose_radius_mm: 0.8, edge_radius_um: 5 },
    cutting: { feed_per_rev_mm: 0.1, cutting_speed_m_min: 200, axial_depth_mm: 2 },
    material: { iso_group: "P", hardness_hrc: 28 },
    process: "turning",
    coolant: "flood",
  };

  it("predicts Ra, Rz, Rt", () => {
    const result = engine.compute(baseInput);
    expect(result.value.roughness.ra_um).toBeGreaterThan(0);
    expect(result.value.roughness.rz_um).toBeGreaterThanOrEqual(result.value.roughness.ra_um);
    expect(result.value.roughness.rt_um).toBeGreaterThanOrEqual(result.value.roughness.rz_um);
  });

  it("higher feed → worse roughness", () => {
    const lowFeed = engine.compute(baseInput);
    const highFeed = engine.compute({
      ...baseInput,
      cutting: { ...baseInput.cutting, feed_per_rev_mm: 0.3 },
    });
    expect(highFeed.value.roughness.ra_um).toBeGreaterThan(lowFeed.value.roughness.ra_um);
  });

  it("predicts residual stress type", () => {
    const result = engine.compute(baseInput);
    expect(["compressive", "tensile", "neutral"]).toContain(result.value.residual_stress.type);
  });

  it("coolant affects residual stress", () => {
    const flood = engine.compute(baseInput);
    const dry = engine.compute({ ...baseInput, coolant: "dry" });
    // Both produce valid stress values; coolant factor modifies the magnitude
    expect(typeof flood.value.residual_stress.surface_mpa).toBe("number");
    expect(typeof dry.value.residual_stress.surface_mpa).toBe("number");
    // Dry should have different magnitude than flood (1.3x vs 0.7x factor)
    expect(Math.abs(dry.value.residual_stress.surface_mpa))
      .not.toBe(Math.abs(flood.value.residual_stress.surface_mpa));
  });

  it("assesses white layer risk for high speed", () => {
    const highSpeed = engine.compute({
      ...baseInput,
      cutting: { ...baseInput.cutting, cutting_speed_m_min: 500 },
      material: { iso_group: "H", hardness_hrc: 55 },
      coolant: "dry",
    });
    expect(["medium", "high"]).toContain(highSpeed.value.subsurface.white_layer_risk);
  });

  it("assigns ISO quality grade", () => {
    const result = engine.compute(baseInput);
    expect(result.value.quality_grade).toMatch(/^N\d+$/);
  });

  it("larger nose radius → better finish", () => {
    const small = engine.compute(baseInput);
    const large = engine.compute({
      ...baseInput,
      tool: { ...baseInput.tool, nose_radius_mm: 2.0 },
    });
    expect(large.value.roughness.ra_um).toBeLessThanOrEqual(small.value.roughness.ra_um);
  });

  it("provides recommendations for worn tool", () => {
    const worn = engine.compute({
      ...baseInput,
      tool: { ...baseInput.tool, flank_wear_vb_mm: 0.3 },
    });
    expect(worn.value.process_recommendations.some(r => r.includes("wear"))).toBe(true);
  });

  it("returns Brammertz formula reference", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("Brammertz");
  });
});

// ═══════════════════════════════════════════════════════════════
// MachiningEnergyModelEngine
// ═══════════════════════════════════════════════════════════════

describe("MachiningEnergyModelEngine", () => {
  const engine = new MachiningEnergyModelEngine();

  const baseInput: MachiningEnergyInput = {
    cutting: { spindle_rpm: 8000, feed_rate_mmmin: 2000, axial_depth_mm: 5, radial_depth_mm: 2.5, cutting_speed_m_min: 250 },
    tool: { diameter_mm: 10, flute_count: 4 },
    material: { iso_group: "P", volume_to_remove_cm3: 50 },
    machine: { standby_power_kw: 5, tool_changes: 3 },
    coolant_type: "flood",
  };

  it("computes total energy per part", () => {
    const result = engine.compute(baseInput);
    expect(result.value.total_kwh).toBeGreaterThan(0);
    const sum = result.value.spindle_kwh + result.value.axis_kwh +
      result.value.coolant_kwh + result.value.idle_kwh + result.value.atc_kwh;
    expect(Math.abs(sum - result.value.total_kwh)).toBeLessThan(0.001);
  });

  it("computes specific energy consumption", () => {
    const result = engine.compute(baseInput);
    expect(result.value.sec_j_mm3).toBeGreaterThan(0);
  });

  it("dry machining uses less energy than flood", () => {
    const flood = engine.compute(baseInput);
    const dry = engine.compute({ ...baseInput, coolant_type: "dry" });
    expect(dry.value.coolant_kwh).toBe(0);
    expect(dry.value.total_kwh).toBeLessThan(flood.value.total_kwh);
  });

  it("computes CO2 footprint", () => {
    const result = engine.compute(baseInput);
    expect(result.value.co2_kg).toBeGreaterThan(0);
  });

  it("computes energy cost", () => {
    const result = engine.compute(baseInput);
    expect(result.value.cost_energy).toBeGreaterThan(0);
  });

  it("efficiency < 100%", () => {
    const result = engine.compute(baseInput);
    expect(result.value.efficiency_pct).toBeGreaterThan(0);
    expect(result.value.efficiency_pct).toBeLessThan(100);
  });

  it("returns Gutowski formula", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("Gutowski");
  });
});
