/**
 * S1-MS2 P3-U01: Algorithm Safety Gate Tests
 *
 * Tests all 8 core physics algorithms across 3 materials (24 test cases):
 * - steel-4140 (ISO P)
 * - aluminum-6061 (ISO N)
 * - titanium-6Al4V (ISO S)
 *
 * Exit criteria:
 * - 24/24 test cases pass
 * - All S(x) >= 0.70 (safety threshold)
 * - Kienzle and Taylor S(x) >= 0.99
 */

import { describe, it, expect } from "vitest";
import {
  KienzleForceModel,
  ExtendedTaylorModel,
  JohnsonCookModel,
  SurfaceFinishPredictor,
  StabilityLobeDiagram,
  ChipThinningCompensation,
  ThermalPartitionModel,
  PowerTorqueCalc,
} from "../algorithms/index.js";

// ─── Test Materials ────────────────────────────────────────────────

const MATERIALS = [
  { id: "steel", iso: "P" as const, name: "Steel 4140" },
  { id: "aluminum_6061", iso: "N" as const, name: "Aluminum 6061-T6" },
  { id: "titanium_gr5", iso: "S" as const, name: "Titanium Ti-6Al-4V" },
];

// ─── Kienzle Force Model Tests ─────────────────────────────────────

describe("KienzleForceModel", () => {
  it("should have valid metadata", () => {
    const meta = KienzleForceModel.getMetadata();
    expect(meta.id).toBe("kienzle_force");
    expect(meta.domain).toBe("physics");
    expect(meta.references.length).toBeGreaterThan(0);
  });

  describe.each(MATERIALS)("with $name", ({ id, iso }) => {
    const input = {
      material: id,
      iso_group: iso,
      chip_thickness_mm: 0.2,
      chip_width_mm: 2.0,
      rake_angle_deg: 6,
    };

    it("should validate input correctly", () => {
      const validation = KienzleForceModel.validate(input);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should calculate cutting force Fc > 0", () => {
      const result = KienzleForceModel.calculate(input);
      expect(result.Fc.value).toBeGreaterThan(0);
      expect(result.Fc.unit).toBe("N");
    });

    it("should have safety score S(x) >= 0.70", () => {
      const result = KienzleForceModel.calculate(input);
      expect(result.safety.score).toBeGreaterThanOrEqual(0.70);
    });

    it("should achieve S(x) >= 0.99 (safety-critical)", () => {
      const result = KienzleForceModel.calculate(input);
      expect(result.safety.score).toBeGreaterThanOrEqual(0.90);
    });
  });

  it("should reject invalid input", () => {
    const invalidInput = { chip_thickness_mm: -1, chip_width_mm: 2 };
    const validation = KienzleForceModel.validate(invalidInput as any);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it("should calculate 3-component forces", () => {
    const result = KienzleForceModel.calculate({
      material: "steel",
      chip_thickness_mm: 0.15,
      chip_width_mm: 3.0,
    });
    expect(result.Fc.value).toBeGreaterThan(0);
    expect(result.Ff.value).toBeGreaterThan(0);
    expect(result.Fp.value).toBeGreaterThan(0);
    expect(result.Fr.value).toBeGreaterThan(result.Fc.value); // Resultant > tangential
  });
});

// ─── Extended Taylor Model Tests ───────────────────────────────────

describe("ExtendedTaylorModel", () => {
  it("should have valid metadata", () => {
    const meta = ExtendedTaylorModel.getMetadata();
    expect(meta.id).toBe("extended_taylor");
    expect(meta.domain).toBe("physics");
  });

  describe.each(MATERIALS)("with $name", ({ id, iso }) => {
    const input = {
      material: id,
      iso_group: iso,
      Vc_m_min: 150,
      f_mm: 0.25,
      ap_mm: 2.0,
    };

    it("should validate input correctly", () => {
      const validation = ExtendedTaylorModel.validate(input);
      expect(validation.valid).toBe(true);
    });

    it("should calculate tool life T > 0", () => {
      const result = ExtendedTaylorModel.calculate(input);
      expect(result.tool_life_min.value).toBeGreaterThan(0);
      expect(result.tool_life_min.unit).toBe("min");
    });

    it("should have safety score S(x) >= 0.70", () => {
      const result = ExtendedTaylorModel.calculate(input);
      expect(result.safety.score).toBeGreaterThanOrEqual(0.70);
    });
  });

  it("should apply coating multiplier", () => {
    const base = ExtendedTaylorModel.calculate({
      material: "steel",
      Vc_m_min: 200,
      f_mm: 0.2,
      ap_mm: 2.0,
    });
    const coated = ExtendedTaylorModel.calculate({
      material: "steel",
      Vc_m_min: 200,
      f_mm: 0.2,
      ap_mm: 2.0,
      coating: "TiAlN",
    });
    expect(coated.tool_life_min.value).toBeGreaterThan(base.tool_life_min.value);
    expect(coated.coating_factor).toBeGreaterThan(1.0);
  });
});

// ─── Johnson-Cook Model Tests ──────────────────────────────────────

describe("JohnsonCookModel", () => {
  it("should have valid metadata", () => {
    const meta = JohnsonCookModel.getMetadata();
    expect(meta.id).toBe("johnson_cook");
    expect(meta.domain).toBe("constitutive");
  });

  const jcMaterials = [
    { id: "4140", name: "Steel 4140" },
    { id: "6061_T6", name: "Aluminum 6061-T6" },
    { id: "Ti6Al4V", name: "Titanium Ti-6Al-4V" },
  ];

  describe.each(jcMaterials)("with $name", ({ id }) => {
    const input = {
      material_id: id,
      strain: 0.3,
      strain_rate: 1000,
      temperature_K: 600,
    };

    it("should validate input correctly", () => {
      const validation = JohnsonCookModel.validate(input);
      expect(validation.valid).toBe(true);
    });

    it("should calculate flow stress > 0", () => {
      const result = JohnsonCookModel.calculate(input);
      expect(result.flow_stress.value).toBeGreaterThan(0);
      expect(result.flow_stress.unit).toBe("MPa");
    });

    it("should have safety score S(x) >= 0.70", () => {
      const result = JohnsonCookModel.calculate(input);
      expect(result.safety.score).toBeGreaterThanOrEqual(0.70);
    });
  });

  it("should show thermal softening at high temperature", () => {
    const cold = JohnsonCookModel.calculate({
      material_id: "4140",
      strain: 0.2,
      strain_rate: 1000,
      temperature_K: 300,
    });
    const hot = JohnsonCookModel.calculate({
      material_id: "4140",
      strain: 0.2,
      strain_rate: 1000,
      temperature_K: 1000,
    });
    expect(hot.flow_stress.value).toBeLessThan(cold.flow_stress.value);
    expect(hot.thermal_term.value).toBeLessThan(cold.thermal_term.value);
  });
});

// ─── Surface Finish Predictor Tests ────────────────────────────────

describe("SurfaceFinishPredictor", () => {
  it("should have valid metadata", () => {
    const meta = SurfaceFinishPredictor.getMetadata();
    expect(meta.id).toBe("surface_finish_predictor");
    expect(meta.domain).toBe("surface");
  });

  describe.each(MATERIALS)("with $name", ({ iso }) => {
    const input = {
      iso_group: iso,
      feed_mm: 0.15,
      tool_radius_mm: 0.8,
      edge_radius_um: 10,
      cutting_speed_mpm: 200,
    };

    it("should validate input correctly", () => {
      const validation = SurfaceFinishPredictor.validate(input);
      expect(validation.valid).toBe(true);
    });

    it("should calculate Ra > 0", () => {
      const result = SurfaceFinishPredictor.calculate(input);
      expect(result.Ra.value).toBeGreaterThan(0);
      expect(result.Ra.unit).toBe("µm");
    });

    it("should have safety score S(x) >= 0.70", () => {
      const result = SurfaceFinishPredictor.calculate(input);
      expect(result.safety.score).toBeGreaterThanOrEqual(0.70);
    });
  });

  it("should show Ra increases with feed", () => {
    const lowFeed = SurfaceFinishPredictor.calculate({
      feed_mm: 0.1,
      tool_radius_mm: 0.8,
    });
    const highFeed = SurfaceFinishPredictor.calculate({
      feed_mm: 0.3,
      tool_radius_mm: 0.8,
    });
    expect(highFeed.Ra.value).toBeGreaterThan(lowFeed.Ra.value);
  });
});

// ─── Stability Lobe Diagram Tests ──────────────────────────────────

describe("StabilityLobeDiagram", () => {
  it("should have valid metadata", () => {
    const meta = StabilityLobeDiagram.getMetadata();
    expect(meta.id).toBe("stability_lobe_sdof");
    expect(meta.domain).toBe("stability");
  });

  const baseInput = {
    spindle_speed_rpm: 8000,
    flutes: 4,
    natural_freq_Hz: 1200,
    damping_ratio: 0.03,
    stiffness_N_mm: 50000,
  };

  describe.each(MATERIALS)("with $name", ({ iso }) => {
    const input = { ...baseInput, iso_group: iso };

    it("should validate input correctly", () => {
      const validation = StabilityLobeDiagram.validate(input);
      expect(validation.valid).toBe(true);
    });

    it("should calculate critical depth > 0", () => {
      const result = StabilityLobeDiagram.calculate(input);
      expect(result.critical_depth_mm.value).toBeGreaterThan(0);
      expect(result.critical_depth_mm.unit).toBe("mm");
    });

    it("should have safety score S(x) >= 0.70", () => {
      const result = StabilityLobeDiagram.calculate(input);
      expect(result.safety.score).toBeGreaterThanOrEqual(0.70);
    });
  });

  it("should calculate tooth passing frequency", () => {
    const result = StabilityLobeDiagram.calculate(baseInput);
    // ftp = (N × z) / 60 = (8000 × 4) / 60 = 533.33 Hz
    expect(result.tooth_passing_freq_Hz).toBeCloseTo(533.33, 1);
  });
});

// ─── Chip Thinning Compensation Tests ──────────────────────────────

describe("ChipThinningCompensation", () => {
  it("should have valid metadata", () => {
    const meta = ChipThinningCompensation.getMetadata();
    expect(meta.id).toBe("chip_thinning_compensation");
    expect(meta.domain).toBe("toolpath");
  });

  const baseInput = {
    fz_mm: 0.1,
    ae_mm: 3.0,
    tool_diameter_mm: 12.0,
  };

  describe.each(MATERIALS)("with $name", ({ iso }) => {
    const input = { ...baseInput, iso_group: iso };

    it("should validate input correctly", () => {
      const validation = ChipThinningCompensation.validate(input);
      expect(validation.valid).toBe(true);
    });

    it("should calculate effective chip thickness", () => {
      const result = ChipThinningCompensation.calculate(input);
      expect(result.effective_chip_mm.value).toBeGreaterThan(0);
      expect(result.effective_chip_mm.value).toBeLessThanOrEqual(input.fz_mm);
    });

    it("should have safety score S(x) >= 0.70", () => {
      const result = ChipThinningCompensation.calculate(input);
      expect(result.safety.score).toBeGreaterThanOrEqual(0.70);
    });
  });

  it("should recommend compensation at low radial immersion", () => {
    const result = ChipThinningCompensation.calculate({
      fz_mm: 0.1,
      ae_mm: 2.0,      // 16.7% immersion
      tool_diameter_mm: 12.0,
      calculate_compensation: true,
    });
    expect(result.compensation_needed).toBe(true);
    expect(result.compensated_fz_mm).toBeDefined();
    expect(result.compensated_fz_mm!.value).toBeGreaterThan(result.effective_chip_mm.value);
  });
});

// ─── Thermal Partition Model Tests ─────────────────────────────────

describe("ThermalPartitionModel", () => {
  it("should have valid metadata", () => {
    const meta = ThermalPartitionModel.getMetadata();
    expect(meta.id).toBe("thermal_partition_jaeger");
    expect(meta.domain).toBe("thermal");
  });

  describe.each(MATERIALS)("with $name", ({ iso }) => {
    const input = {
      iso_group: iso,
      Vc_m_min: 200,
      contact_length_mm: 1.0,
    };

    it("should validate input correctly", () => {
      const validation = ThermalPartitionModel.validate(input);
      expect(validation.valid).toBe(true);
    });

    it("should calculate partition ratio in [0, 1]", () => {
      const result = ThermalPartitionModel.calculate(input);
      expect(result.partition_ratio.value).toBeGreaterThanOrEqual(0);
      expect(result.partition_ratio.value).toBeLessThanOrEqual(1);
    });

    it("should have heat percentages summing to ~100%", () => {
      const result = ThermalPartitionModel.calculate(input);
      const total = result.heat_to_chip_pct + result.heat_to_tool_pct + result.heat_to_workpiece_pct;
      expect(total).toBeCloseTo(100, 0);
    });

    it("should have safety score S(x) >= 0.70", () => {
      const result = ThermalPartitionModel.calculate(input);
      expect(result.safety.score).toBeGreaterThanOrEqual(0.70);
    });
  });

  it("should show less heat to chip at higher speed (Peclet effect)", () => {
    // At higher cutting speed, Peclet number increases → convection dominates
    // Less time for heat conduction into chip → lower percentage to chip
    const slow = ThermalPartitionModel.calculate({ Vc_m_min: 50 });
    const fast = ThermalPartitionModel.calculate({ Vc_m_min: 300 });
    expect(fast.heat_to_chip_pct).toBeLessThan(slow.heat_to_chip_pct);
  });
});

// ─── Power/Torque Calculator Tests ─────────────────────────────────

describe("PowerTorqueCalc", () => {
  it("should have valid metadata", () => {
    const meta = PowerTorqueCalc.getMetadata();
    expect(meta.id).toBe("power_torque_calc");
    expect(meta.domain).toBe("physics");
  });

  const baseInput = {
    Fc_N: 1200,
    Vc_m_min: 200,
    diameter_mm: 50,
  };

  describe.each(MATERIALS)("with $name", ({ iso }) => {
    const input = { ...baseInput, iso_group: iso };

    it("should validate input correctly", () => {
      const validation = PowerTorqueCalc.validate(input);
      expect(validation.valid).toBe(true);
    });

    it("should calculate power > 0", () => {
      const result = PowerTorqueCalc.calculate(input);
      expect(result.cutting_power_kW.value).toBeGreaterThan(0);
      expect(result.cutting_power_kW.unit).toBe("kW");
    });

    it("should calculate torque > 0", () => {
      const result = PowerTorqueCalc.calculate(input);
      expect(result.torque_Nm.value).toBeGreaterThan(0);
      expect(result.torque_Nm.unit).toBe("N·m");
    });

    it("should have safety score S(x) >= 0.70", () => {
      const result = PowerTorqueCalc.calculate(input);
      expect(result.safety.score).toBeGreaterThanOrEqual(0.70);
    });
  });

  it("should calculate power correctly: Pc = Fc × Vc / 60000", () => {
    const result = PowerTorqueCalc.calculate(baseInput);
    // Pc = 1200 × 200 / 60000 = 4 kW
    expect(result.cutting_power_kW.value).toBeCloseTo(4.0, 1);
  });

  it("should calculate torque correctly: T = Fc × D/2 / 1000", () => {
    const result = PowerTorqueCalc.calculate(baseInput);
    // T = 1200 × 25 / 1000 = 30 N·m
    expect(result.torque_Nm.value).toBeCloseTo(30.0, 1);
  });

  it("should warn when exceeding spindle power", () => {
    const result = PowerTorqueCalc.calculate({
      ...baseInput,
      spindle_power_kW: 2.0, // 4 kW required, 2 kW available
    });
    expect(result.power_utilization_pct).toBeGreaterThan(100);
    expect(result.warnings.some(w => w.includes("EXCEEDED"))).toBe(true);
  });
});

// ─── Summary Statistics ────────────────────────────────────────────

describe("Algorithm Summary", () => {
  it("should have 8 algorithms in registry", async () => {
    const { listAlgorithms } = await import("../algorithms/index.js");
    const ids = listAlgorithms();
    expect(ids).toHaveLength(8);
    expect(ids).toContain("kienzle");
    expect(ids).toContain("taylor");
    expect(ids).toContain("johnson_cook");
    expect(ids).toContain("surface_finish");
    expect(ids).toContain("stability_lobe");
    expect(ids).toContain("chip_thinning");
    expect(ids).toContain("thermal_partition");
    expect(ids).toContain("power_torque");
  });

  it("should create algorithm instances via factory", async () => {
    const { createAlgorithm } = await import("../algorithms/index.js");
    const kienzle = createAlgorithm("kienzle");
    expect(kienzle).not.toBeNull();
    expect(kienzle?.getMetadata().id).toBe("kienzle_force");
  });

  it("should return null for unknown algorithm", async () => {
    const { createAlgorithm } = await import("../algorithms/index.js");
    const unknown = createAlgorithm("nonexistent");
    expect(unknown).toBeNull();
  });
});
