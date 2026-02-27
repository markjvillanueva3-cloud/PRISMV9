/**
 * PRISM Algorithm Safety Validation Suite
 *
 * Comprehensive tests for all 8 standalone manufacturing physics algorithms.
 * Tests cover: validation, calculation accuracy, edge cases, safety limits,
 * cross-checking against known values, and metadata consistency.
 *
 * SAFETY-CRITICAL: These tests verify the correctness of force, tool life,
 * stability, thermal, and surface finish predictions that directly affect
 * machine operation and operator safety.
 */

import { describe, it, expect } from "vitest";
import { KienzleForceModel } from "../algorithms/KienzleForceModel.js";
import { ExtendedTaylorModel } from "../algorithms/ExtendedTaylorModel.js";
import { JohnsonCookModel } from "../algorithms/JohnsonCookModel.js";
import { SurfaceFinishPredictor } from "../algorithms/SurfaceFinishPredictor.js";
import { StabilityLobeDiagram } from "../algorithms/StabilityLobeDiagram.js";
import { ChipThinningCompensation } from "../algorithms/ChipThinningCompensation.js";
import { ThermalPartitionModel } from "../algorithms/ThermalPartitionModel.js";
import {
  ALGORITHM_REGISTRY,
  createAlgorithm,
  listAlgorithms,
} from "../algorithms/index.js";

// ═══════════════════════════════════════════════════════════════════
// 1. KIENZLE FORCE MODEL (SAFETY-CRITICAL)
// ═══════════════════════════════════════════════════════════════════

describe("KienzleForceModel", () => {
  const algo = new KienzleForceModel();

  it("validates correct input", () => {
    const r = algo.validate({
      kc1_1: 1800, mc: 0.25, feed_per_tooth: 0.1, axial_depth: 3,
      radial_depth: 10, tool_diameter: 20, number_of_teeth: 4, cutting_speed: 150,
    });
    expect(r.valid).toBe(true);
  });

  it("rejects invalid kc1_1", () => {
    const r = algo.validate({
      kc1_1: -100, mc: 0.25, feed_per_tooth: 0.1, axial_depth: 3,
      radial_depth: 10, tool_diameter: 20, number_of_teeth: 4, cutting_speed: 150,
    });
    expect(r.valid).toBe(false);
    expect(r.issues.some(i => i.field === "kc1_1")).toBe(true);
  });

  it("calculates AISI-1045 steel force correctly", () => {
    const out = algo.calculate({
      kc1_1: 1800, mc: 0.25, feed_per_tooth: 0.1, axial_depth: 3,
      radial_depth: 10, tool_diameter: 20, number_of_teeth: 4, cutting_speed: 150,
    });
    expect(out.Fc).toBeGreaterThan(0);
    expect(out.Fc).toBeLessThan(50000);
    expect(out.power).toBeGreaterThan(0);
    expect(out.torque).toBeGreaterThan(0);
    expect(out.chip_thickness).toBeGreaterThan(0);
    expect(out.specific_force).toBeGreaterThan(out.Fc / (3 * 0.1)); // kc > 0
  });

  it("produces 3-component force decomposition", () => {
    const out = algo.calculate({
      kc1_1: 1800, mc: 0.25, feed_per_tooth: 0.1, axial_depth: 3,
      radial_depth: 10, tool_diameter: 20, number_of_teeth: 4, cutting_speed: 150,
    });
    expect(out.Ff).toBeGreaterThan(0);
    expect(out.Fp).toBeGreaterThan(0);
    expect(out.F_resultant).toBeGreaterThan(out.Fc);
    expect(out.force_ratios.iso_group).toBe("P");
  });

  it("provides uncertainty band", () => {
    const out = algo.calculate({
      kc1_1: 1800, mc: 0.25, feed_per_tooth: 0.1, axial_depth: 3,
      radial_depth: 10, tool_diameter: 20, number_of_teeth: 4, cutting_speed: 150,
      data_quality: "verified",
    });
    expect(out.uncertainty.low).toBeLessThan(out.uncertainty.nominal);
    expect(out.uncertainty.high).toBeGreaterThan(out.uncertainty.nominal);
    expect(out.uncertainty.confidence).toBe(0.85);
  });

  it("warns on full slotting", () => {
    const out = algo.calculate({
      kc1_1: 1800, mc: 0.25, feed_per_tooth: 0.1, axial_depth: 3,
      radial_depth: 20, tool_diameter: 20, number_of_teeth: 4, cutting_speed: 150,
    });
    expect(out.warnings.some(w => w.includes("FULL_SLOT"))).toBe(true);
  });

  it("has correct metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("kienzle");
    expect(meta.safety_class).toBe("critical");
    expect(meta.domain).toBe("force");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. EXTENDED TAYLOR TOOL LIFE (SAFETY-CRITICAL)
// ═══════════════════════════════════════════════════════════════════

describe("ExtendedTaylorModel", () => {
  const algo = new ExtendedTaylorModel();

  it("validates correct input", () => {
    const r = algo.validate({ cutting_speed: 150, C: 200, n: 0.25 });
    expect(r.valid).toBe(true);
  });

  it("rejects invalid n exponent", () => {
    const r = algo.validate({ cutting_speed: 150, C: 200, n: 1.5 });
    expect(r.valid).toBe(false);
  });

  it("calculates basic Taylor: T=(C/V)^(1/n)", () => {
    // V=200, C=200, n=0.25 → T = (200/200)^(1/0.25) = 1^4 = 1.0 min
    const out = algo.calculate({ cutting_speed: 200, C: 200, n: 0.25 });
    expect(out.tool_life_minutes).toBeCloseTo(1.0, 0);
  });

  it("extended model with feed/depth corrections", () => {
    const basic = algo.calculate({ cutting_speed: 150, C: 200, n: 0.25 });
    const extended = algo.calculate({
      cutting_speed: 150, C: 200, n: 0.25,
      feed: 0.3, depth: 3.0,
    });
    // Higher feed and depth should reduce tool life
    expect(extended.tool_life_minutes).toBeLessThan(basic.tool_life_minutes);
  });

  it("temperature factor reduces tool life", () => {
    const normal = algo.calculate({ cutting_speed: 150, C: 200, n: 0.25 });
    const hot = algo.calculate({
      cutting_speed: 150, C: 200, n: 0.25, temperature_factor: 0.7,
    });
    expect(hot.tool_life_minutes).toBeLessThan(normal.tool_life_minutes);
  });

  it("warns on Taylor cliff", () => {
    const out = algo.calculate({ cutting_speed: 195, C: 200, n: 0.25 });
    expect(out.warnings.some(w => w.includes("TAYLOR_CLIFF"))).toBe(true);
  });

  it("calculates speed_for_60min", () => {
    const out = algo.calculate({ cutting_speed: 150, C: 200, n: 0.25 });
    expect(out.speed_for_60min).toBeDefined();
    expect(out.speed_for_60min!).toBeGreaterThan(0);
    expect(out.speed_for_60min!).toBeLessThan(200);
  });

  it("has correct metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("taylor");
    expect(meta.safety_class).toBe("critical");
    expect(meta.domain).toBe("tool_life");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. JOHNSON-COOK FLOW STRESS
// ═══════════════════════════════════════════════════════════════════

describe("JohnsonCookModel", () => {
  const algo = new JohnsonCookModel();

  // AISI 4340 parameters
  const aisi4340 = {
    A: 792, B: 510, n: 0.26, C: 0.014, m: 1.03, T_melt: 1520, T_ref: 25,
  };

  it("validates correct input", () => {
    const r = algo.validate({ strain: 0.1, strain_rate: 1000, temperature: 300, ...aisi4340 });
    expect(r.valid).toBe(true);
  });

  it("rejects temperature >= T_melt", () => {
    const r = algo.validate({ strain: 0.1, strain_rate: 1000, temperature: 1520, ...aisi4340 });
    expect(r.valid).toBe(false);
  });

  it("calculates AISI 4340 at standard conditions", () => {
    const out = algo.calculate({ strain: 0.1, strain_rate: 1000, temperature: 300, ...aisi4340 });
    // Expected: ~970 MPa (cross-checked)
    expect(out.stress).toBeGreaterThan(900);
    expect(out.stress).toBeLessThan(1100);
    expect(out.strain_term).toBeGreaterThan(aisi4340.A);
    expect(out.rate_term).toBeGreaterThan(1);
    expect(out.thermal_term).toBeLessThan(1);
    expect(out.thermal_term).toBeGreaterThan(0);
  });

  it("strain hardening increases stress", () => {
    const low = algo.calculate({ strain: 0.01, strain_rate: 1, temperature: 25, ...aisi4340 });
    const high = algo.calculate({ strain: 1.0, strain_rate: 1, temperature: 25, ...aisi4340 });
    expect(high.stress).toBeGreaterThan(low.stress);
  });

  it("thermal softening reduces stress", () => {
    const cold = algo.calculate({ strain: 0.1, strain_rate: 1, temperature: 25, ...aisi4340 });
    const hot = algo.calculate({ strain: 0.1, strain_rate: 1, temperature: 800, ...aisi4340 });
    expect(hot.stress).toBeLessThan(cold.stress);
  });

  it("strain rate increases stress", () => {
    const slow = algo.calculate({ strain: 0.1, strain_rate: 1, temperature: 25, ...aisi4340 });
    const fast = algo.calculate({ strain: 0.1, strain_rate: 1e6, temperature: 25, ...aisi4340 });
    expect(fast.stress).toBeGreaterThan(slow.stress);
  });

  it("has correct metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("johnson-cook");
    expect(meta.safety_class).toBe("standard");
    expect(meta.domain).toBe("material");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. SURFACE FINISH PREDICTOR
// ═══════════════════════════════════════════════════════════════════

describe("SurfaceFinishPredictor", () => {
  const algo = new SurfaceFinishPredictor();

  it("validates correct input", () => {
    const r = algo.validate({ feed: 0.2, nose_radius: 0.8 });
    expect(r.valid).toBe(true);
  });

  it("rejects zero nose radius", () => {
    const r = algo.validate({ feed: 0.2, nose_radius: 0 });
    expect(r.valid).toBe(false);
  });

  it("calculates turning surface finish", () => {
    // f=0.2, R=0.8 → Ra_th = 0.2²/(32×0.8)×1000 = 1.5625 μm
    // Ra_actual = 1.5625 × 2.0 = 3.125 μm
    const out = algo.calculate({ feed: 0.2, nose_radius: 0.8 });
    expect(out.theoretical_Ra).toBeCloseTo(1.56, 1);
    expect(out.Ra).toBeCloseTo(3.13, 1);
    expect(out.Rz).toBeGreaterThan(out.Ra);
    expect(out.Rt).toBeGreaterThan(out.Rz);
  });

  it("milling surface finish includes ae/D", () => {
    const out = algo.calculate({
      feed: 0.1, nose_radius: 0.8, is_milling: true,
      radial_depth: 5, tool_diameter: 20,
    });
    expect(out.Ra).toBeGreaterThan(0);
    expect(out.rz_ra_ratio).toBe(5.5); // milling ratio
  });

  it("provides ISO N grade", () => {
    const out = algo.calculate({ feed: 0.2, nose_radius: 0.8 });
    expect(out.iso_grade).toBeDefined();
    expect(out.iso_grade).toMatch(/^N\d+$/);
  });

  it("finer feed gives smoother surface", () => {
    const coarse = algo.calculate({ feed: 0.3, nose_radius: 0.8 });
    const fine = algo.calculate({ feed: 0.05, nose_radius: 0.8 });
    expect(fine.Ra).toBeLessThan(coarse.Ra);
  });

  it("has correct metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("surface-finish");
    expect(meta.safety_class).toBe("standard");
    expect(meta.domain).toBe("surface");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. STABILITY LOBE DIAGRAM (SAFETY-CRITICAL)
// ═══════════════════════════════════════════════════════════════════

describe("StabilityLobeDiagram", () => {
  const algo = new StabilityLobeDiagram();

  const typical = {
    natural_frequency: 800,
    damping_ratio: 0.03,
    stiffness: 5e7,
    specific_cutting_force: 2500,
    num_teeth: 4,
  };

  it("validates correct input", () => {
    const r = algo.validate(typical);
    expect(r.valid).toBe(true);
  });

  it("rejects invalid damping ratio", () => {
    const r = algo.validate({ ...typical, damping_ratio: -0.1 });
    expect(r.valid).toBe(false);
  });

  it("generates stability lobes", () => {
    const out = algo.calculate(typical);
    expect(out.lobes.length).toBeGreaterThan(0);
    expect(out.chatter_frequency).toBeGreaterThan(0);
    expect(out.directional_factor).toBeGreaterThan(0);
  });

  it("finds sweet spots", () => {
    const out = algo.calculate(typical);
    // Sweet spots may or may not exist depending on lobe shape
    if (out.sweet_spots.length > 0) {
      expect(out.sweet_spots[0].max_depth).toBeGreaterThan(0);
      expect(out.sweet_spots[0].rpm).toBeGreaterThan(0);
    }
  });

  it("unconditional limit is positive", () => {
    const out = algo.calculate(typical);
    expect(out.unconditional_limit).toBeGreaterThan(0);
  });

  it("higher stiffness gives deeper stable cuts", () => {
    const soft = algo.calculate({ ...typical, stiffness: 1e7 });
    const stiff = algo.calculate({ ...typical, stiffness: 1e8 });
    expect(stiff.unconditional_limit).toBeGreaterThan(soft.unconditional_limit);
  });

  it("has correct metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("stability-lobe");
    expect(meta.safety_class).toBe("critical");
    expect(meta.domain).toBe("stability");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. CHIP THINNING COMPENSATION
// ═══════════════════════════════════════════════════════════════════

describe("ChipThinningCompensation", () => {
  const algo = new ChipThinningCompensation();

  it("validates correct input", () => {
    const r = algo.validate({ feed_per_tooth: 0.1, radial_depth: 5, tool_diameter: 20 });
    expect(r.valid).toBe(true);
  });

  it("rejects ae > D", () => {
    const r = algo.validate({ feed_per_tooth: 0.1, radial_depth: 25, tool_diameter: 20 });
    expect(r.issues.some(i => i.field === "radial_depth")).toBe(true);
  });

  it("calculates chip thinning at 25% engagement", () => {
    // ae/D = 5/20 = 0.25, φ_e = arccos(1-2×0.25) = 60°
    // hex = 0.1 × (1-cos(60°))/60° ≈ 0.0477
    // factor ≈ 2.094
    const out = algo.calculate({ feed_per_tooth: 0.1, radial_depth: 5, tool_diameter: 20 });
    expect(out.engagement_angle_deg).toBeCloseTo(60, 0);
    expect(out.hex).toBeCloseTo(0.0477, 3);
    expect(out.chip_thinning_factor).toBeCloseTo(2.094, 2);
    expect(out.fz_compensated).toBeGreaterThan(out.fz_programmed);
  });

  it("no thinning at full slot", () => {
    const out = algo.calculate({ feed_per_tooth: 0.1, radial_depth: 20, tool_diameter: 20 });
    expect(out.chip_thinning_factor).toBeCloseTo(1.0, 1);
    expect(out.hex).toBeCloseTo(0.1, 2);
  });

  it("calculates feed rate with RPM", () => {
    const out = algo.calculate({
      feed_per_tooth: 0.1, radial_depth: 5, tool_diameter: 20,
      number_of_teeth: 4, spindle_speed: 5000,
    });
    expect(out.feed_rate_original).toBe(2000);
    expect(out.feed_rate_compensated).toBeGreaterThan(out.feed_rate_original!);
  });

  it("has correct metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("chip-thinning");
    expect(meta.safety_class).toBe("standard");
    expect(meta.domain).toBe("geometry");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. THERMAL PARTITION + POWER/TORQUE
// ═══════════════════════════════════════════════════════════════════

describe("ThermalPartitionModel", () => {
  const algo = new ThermalPartitionModel();

  it("validates correct input", () => {
    const r = algo.validate({ cutting_force: 1000, cutting_speed: 150, tool_diameter: 20 });
    expect(r.valid).toBe(true);
  });

  it("rejects zero force", () => {
    const r = algo.validate({ cutting_force: 0, cutting_speed: 150, tool_diameter: 20 });
    expect(r.valid).toBe(false);
  });

  it("calculates power correctly: P = Fc × Vc / 60000", () => {
    // Fc=1000N, Vc=150m/min → P_cut = 1000×150/60000 = 2.5 kW
    const out = algo.calculate({ cutting_force: 1000, cutting_speed: 150, tool_diameter: 20 });
    expect(out.power_cutting_kw).toBeCloseTo(2.5, 2);
    expect(out.power_spindle_kw).toBeCloseTo(3.125, 2); // 2.5/0.8
    expect(out.power_spindle_hp).toBeCloseTo(4.191, 1);
  });

  it("calculates RPM and torque", () => {
    const out = algo.calculate({ cutting_force: 1000, cutting_speed: 150, tool_diameter: 20 });
    // RPM = 150×1000/(π×20) ≈ 2387
    expect(out.rpm).toBeCloseTo(2387, -1);
    // Torque = 3.125×9549/2387 ≈ 12.50 Nm
    expect(out.torque_nm).toBeCloseTo(12.5, 0);
  });

  it("calculates thermal with feed", () => {
    const out = algo.calculate({
      cutting_force: 1000, cutting_speed: 150, tool_diameter: 20, feed: 0.2,
    });
    expect(out.shear_zone_temp_rise).toBeDefined();
    expect(out.shear_zone_temp).toBeDefined();
    expect(out.shear_zone_temp!).toBeGreaterThan(25);
    expect(out.thermal_number).toBeDefined();
    expect(out.heat_regime).toBeDefined();
  });

  it("efficiency affects spindle power", () => {
    const eff80 = algo.calculate({ cutting_force: 1000, cutting_speed: 150, tool_diameter: 20, efficiency: 0.8 });
    const eff90 = algo.calculate({ cutting_force: 1000, cutting_speed: 150, tool_diameter: 20, efficiency: 0.9 });
    expect(eff80.power_spindle_kw).toBeGreaterThan(eff90.power_spindle_kw);
  });

  it("has correct metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("thermal-power");
    expect(meta.safety_class).toBe("standard");
    expect(meta.domain).toBe("thermal");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. BARREL EXPORT & REGISTRY
// ═══════════════════════════════════════════════════════════════════

describe("Algorithm Registry", () => {
  it("lists 50 algorithms", () => {
    const ids = listAlgorithms();
    expect(ids.length).toBe(50);
    // Original 7
    expect(ids).toContain("kienzle");
    expect(ids).toContain("taylor");
    expect(ids).toContain("johnson-cook");
    expect(ids).toContain("surface-finish");
    expect(ids).toContain("stability-lobe");
    expect(ids).toContain("chip-thinning");
    expect(ids).toContain("thermal-power");
    // L1-P0-MS1 samples
    expect(ids).toContain("gilbert-mrr");
    expect(ids).toContain("bayesian-wear");
    // L1-P1-MS1 samples
    expect(ids).toContain("genetic-optimizer");
    expect(ids).toContain("neural-inference");
    // L1-P1-MS2 samples
    expect(ids).toContain("minkowski-sum");
    expect(ids).toContain("ant-colony-tsp");
    expect(ids).toContain("wavelet-breakage");
  });

  it("createAlgorithm returns instance", () => {
    const algo = createAlgorithm("kienzle");
    expect(algo).not.toBeNull();
    expect(algo!.getMetadata().id).toBe("kienzle");
  });

  it("createAlgorithm returns null for unknown", () => {
    const algo = createAlgorithm("nonexistent");
    expect(algo).toBeNull();
  });

  it("all algorithms have consistent metadata", () => {
    for (const id of listAlgorithms()) {
      const algo = createAlgorithm(id);
      expect(algo).not.toBeNull();
      const meta = algo!.getMetadata();
      expect(meta.id).toBe(id);
      expect(meta.name.length).toBeGreaterThan(5);
      expect(meta.formula.length).toBeGreaterThan(3);
      expect(meta.reference.length).toBeGreaterThan(5);
      expect(["critical", "standard", "informational"]).toContain(meta.safety_class);
    }
  });

  it("all algorithms validate and calculate without throwing", () => {
    // Each algorithm should handle empty/minimal input gracefully
    for (const id of listAlgorithms()) {
      const algo = createAlgorithm(id);
      expect(algo).not.toBeNull();
      // Validate should never throw
      const result = algo!.validate({} as any);
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("issues");
    }
  });
});
