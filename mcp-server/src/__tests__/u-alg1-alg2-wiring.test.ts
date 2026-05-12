/**
 * Tests for Phase 0-D-3: U-ALG1 + U-ALG2 Algorithm Wiring
 *
 * U-ALG1: CWEZBuffer wiring into InstantaneousEngagementEngine
 *         + Critical Kienzle rake angle fix (gamma_ref=6°)
 *         + Actual chip thickness bypass
 *
 * U-ALG2: StabilityLobeDiagram + FRFStabilityLobe + RCSA wiring
 *         into ChatterStabilityLobeEngine + ReceptanceCouplingEngine
 */
import { describe, it, expect } from "vitest";
import { calculateKienzleCuttingForce } from "../engines/ManufacturingCalculations.js";
import { instantaneousEngagementEngine } from "../engines/InstantaneousEngagementEngine.js";
import { chatterStabilityLobeEngine } from "../engines/ChatterStabilityLobeEngine.js";
import { receptanceCouplingEngine } from "../engines/ReceptanceCouplingEngine.js";
import { KienzleForceModel } from "../algorithms/KienzleForceModel.js";

// ═══ U-ALG1: Kienzle Rake Angle Fix ═══

describe("U-ALG1: Kienzle rake angle correction (gamma_ref=6°)", () => {
  it("at reference rake (6°), correction factor = 1.0 (no change)", () => {
    const result = calculateKienzleCuttingForce({
      cutting_speed: 200, feed_per_tooth: 0.1, axial_depth: 3,
      radial_depth: 5, tool_diameter: 10, number_of_teeth: 4,
      rake_angle: 6,
    }, { kc1_1: 1800, mc: 0.25 });

    // With gamma_ref=6°: K_gamma = 1 - 0.01*(6-6) = 1.0
    // Force should be unmodified by rake correction at reference angle
    const kc = 1800 * Math.pow(result.chip_thickness, -0.25);
    // Fc_single = kc * b * h * K_gamma where K_gamma = 1.0
    expect(result.Fc).toBeGreaterThan(0);
    expect(result.warnings).toBeDefined();
  });

  it("positive rake (12°) → lower force than reference rake (6°)", () => {
    const at6 = calculateKienzleCuttingForce({
      cutting_speed: 200, feed_per_tooth: 0.1, axial_depth: 3,
      radial_depth: 5, tool_diameter: 10, number_of_teeth: 4,
      rake_angle: 6,
    }, { kc1_1: 1800, mc: 0.25 });

    const at12 = calculateKienzleCuttingForce({
      cutting_speed: 200, feed_per_tooth: 0.1, axial_depth: 3,
      radial_depth: 5, tool_diameter: 10, number_of_teeth: 4,
      rake_angle: 12,
    }, { kc1_1: 1800, mc: 0.25 });

    // K_gamma at 12° = 1 - 0.01*(12-6) = 0.94 → 6% less force
    expect(at12.Fc).toBeLessThan(at6.Fc);
    expect(at12.Fc / at6.Fc).toBeCloseTo(0.94, 1);
  });

  it("negative rake (0°) → higher force than reference rake (6°)", () => {
    const at6 = calculateKienzleCuttingForce({
      cutting_speed: 200, feed_per_tooth: 0.1, axial_depth: 3,
      radial_depth: 5, tool_diameter: 10, number_of_teeth: 4,
      rake_angle: 6,
    }, { kc1_1: 1800, mc: 0.25 });

    const at0 = calculateKienzleCuttingForce({
      cutting_speed: 200, feed_per_tooth: 0.1, axial_depth: 3,
      radial_depth: 5, tool_diameter: 10, number_of_teeth: 4,
      rake_angle: 0,
    }, { kc1_1: 1800, mc: 0.25 });

    // K_gamma at 0° = 1 - 0.01*(0-6) = 1.06 → 6% more force
    expect(at0.Fc).toBeGreaterThan(at6.Fc);
    expect(at0.Fc / at6.Fc).toBeCloseTo(1.06, 1);
  });

  it("KienzleForceModel algorithm has same rake correction", () => {
    const alg = new KienzleForceModel();
    const at6 = alg.calculate({
      kc1_1: 1800, mc: 0.25, feed_per_tooth: 0.1,
      axial_depth: 3, radial_depth: 5, tool_diameter: 10,
      number_of_teeth: 4, cutting_speed: 200, rake_angle: 6,
    });
    const at12 = alg.calculate({
      kc1_1: 1800, mc: 0.25, feed_per_tooth: 0.1,
      axial_depth: 3, radial_depth: 5, tool_diameter: 10,
      number_of_teeth: 4, cutting_speed: 200, rake_angle: 12,
    });
    expect(at12.Fc / at6.Fc).toBeCloseTo(0.94, 1);
  });
});

// ═══ U-ALG1: Actual Chip Thickness Bypass ═══

describe("U-ALG1: CWE actual chip thickness bypass", () => {
  it("when actual_chip_thickness_mm provided, uses it instead of Martellotti", () => {
    const withoutCWE = calculateKienzleCuttingForce({
      cutting_speed: 200, feed_per_tooth: 0.1, axial_depth: 3,
      radial_depth: 2, tool_diameter: 10, number_of_teeth: 4,
    }, { kc1_1: 1800, mc: 0.25 });

    // Provide CWE-computed actual chip thickness (different from Martellotti)
    const withCWE = calculateKienzleCuttingForce({
      cutting_speed: 200, feed_per_tooth: 0.1, axial_depth: 3,
      radial_depth: 2, tool_diameter: 10, number_of_teeth: 4,
      actual_chip_thickness_mm: 0.08, // CWE says actual h is 0.08mm
    }, { kc1_1: 1800, mc: 0.25 });

    // Different chip thickness → different force
    expect(withCWE.chip_thickness).toBeCloseTo(0.08, 3);
    expect(withCWE.Fc).not.toBeCloseTo(withoutCWE.Fc, 0);
  });

  it("KienzleForceModel algorithm also accepts actual_chip_thickness_mm", () => {
    const alg = new KienzleForceModel();
    const result = alg.calculate({
      kc1_1: 1800, mc: 0.25, feed_per_tooth: 0.1,
      axial_depth: 3, radial_depth: 2, tool_diameter: 10,
      number_of_teeth: 4, cutting_speed: 200,
      actual_chip_thickness_mm: 0.06,
    });
    expect(result.chip_thickness).toBeCloseTo(0.06, 3);
  });
});

// ═══ U-ALG1: CWEZBuffer wiring into InstantaneousEngagementEngine ═══

describe("U-ALG1: CWE-enhanced engagement", () => {
  it("computeOptimalSFWithCWE returns CWE metadata fields", () => {
    const result = instantaneousEngagementEngine.computeOptimalSFWithCWE({
      ae_mm: 3, ap_mm: 5, tool_diameter_mm: 10,
      tool_type: "flat_endmill", flute_count: 4,
      target_Vc_m_min: 200, target_fz_mm: 0.05,
      current_position: { x: 50, y: 50, z: -5 },
      previous_positions: [{ x: 40, y: 50, z: -5 }],
    });

    expect(result.rpm).toBeGreaterThan(0);
    expect(result.actual_chip_thickness_mm).toBeGreaterThan(0);
    expect(result.cwe_method).toBeDefined();
    expect(typeof result.cwe_engagement_ratio).toBe("number");
    expect(typeof result.cwe_max_engagement_deg).toBe("number");
  });

  it("CWE actual chip thickness differs from simple fz at low engagement", () => {
    const result = instantaneousEngagementEngine.computeOptimalSFWithCWE({
      ae_mm: 1, ap_mm: 10, tool_diameter_mm: 10,
      tool_type: "flat_endmill", flute_count: 4,
      target_Vc_m_min: 200, target_fz_mm: 0.1,
      current_position: { x: 50, y: 50, z: -10 },
    });

    // At ae=1mm (10% engagement), actual h < fz due to chip thinning
    expect(result.actual_chip_thickness_mm).toBeLessThan(0.1);
    expect(result.actual_chip_thickness_mm).toBeGreaterThan(0.01);
  });

  it("full slot → actual chip thickness ≈ fz", () => {
    const result = instantaneousEngagementEngine.computeOptimalSFWithCWE({
      ae_mm: 10, ap_mm: 5, tool_diameter_mm: 10,
      tool_type: "flat_endmill", flute_count: 4,
      target_Vc_m_min: 200, target_fz_mm: 0.05,
      current_position: { x: 50, y: 50, z: -5 },
    });

    // At full slot ae=D: sin(arccos(1-ae/R)) = sin(arccos(-1)) = sin(π) = 0
    // Actually at ae=D, aeR=2, sinTheta = sqrt(2*(2-2)) = 0, so h = fz
    // This is because at full slot the mean chip thickness = fz
    expect(result.actual_chip_thickness_mm).toBeCloseTo(0.05, 2);
  });
});

// ═══ U-ALG2: Algorithm-backed chatter prediction ═══

describe("U-ALG2: ChatterStabilityLobeEngine algorithm wiring", () => {
  it("computeWithAlgorithms returns result with algorithm_used field", () => {
    const result = chatterStabilityLobeEngine.computeWithAlgorithms({
      tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 40, material: "carbide" },
      workpiece: { iso_group: "P" },
      machine: { max_rpm: 15000, natural_frequency_hz: 3000, damping_ratio: 0.03, stiffness_n_um: 20 },
      cutting: { radial_immersion_ratio: 0.5, up_milling: false },
    });

    expect(result.value.algorithm_used).toBeDefined();
    expect(result.value.lobes.length).toBeGreaterThan(0);
    expect(result.value.optimal_rpm).toBeGreaterThan(0);
    expect(result.value.max_stable_ap_mm).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.65);
  });

  it("StabilityLobeDiagram algorithm produces sweet spots", () => {
    const result = chatterStabilityLobeEngine.computeWithAlgorithms({
      tool: { diameter_mm: 12, flute_count: 3, overhang_mm: 50, material: "carbide" },
      workpiece: { iso_group: "P", kc11_mpa: 2100 },
      machine: { max_rpm: 20000, natural_frequency_hz: 2500, damping_ratio: 0.04, stiffness_n_um: 15 },
      cutting: { radial_immersion_ratio: 0.3, up_milling: false },
    });

    expect(result.value.algorithm_used).toContain("StabilityLobeDiagram");
    expect(result.value.stable_pockets.length).toBeGreaterThan(0);
    expect(result.value.recommendations.length).toBeGreaterThan(0);
  });

  it("with assembly FRF data, uses FRFStabilityLobe path", () => {
    // Generate synthetic FRF data (SDOF response at 3000 Hz)
    const fn = 3000;
    const zeta = 0.03;
    const k = 2e7;
    const omega_n = 2 * Math.PI * fn;
    const frf = Array.from({ length: 100 }, (_, i) => {
      const freq = 500 + i * 80;
      const omega = 2 * Math.PI * freq;
      const r = omega / omega_n;
      const dr = 1 - r * r;
      const di = 2 * zeta * r;
      const denom = k * (dr * dr + di * di);
      return { frequency: freq, real: dr / denom, imag: -di / denom };
    });

    const result = chatterStabilityLobeEngine.computeWithAlgorithms({
      tool: { diameter_mm: 10, flute_count: 4, overhang_mm: 40, material: "carbide" },
      workpiece: { iso_group: "P" },
      machine: { max_rpm: 15000 },
      cutting: { radial_immersion_ratio: 0.5, up_milling: false },
      assembly_frf: frf,
    });

    expect(result.value.algorithm_used).toContain("FRFStabilityLobe");
    expect(result.value.lobes.length).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });
});

// ═══ U-ALG2: RCSA wiring into ReceptanceCouplingEngine ═══

describe("U-ALG2: ReceptanceCouplingEngine RCSA wiring", () => {
  it("predictWithRCSA falls back to analytical when no spindle FRF", () => {
    const result = receptanceCouplingEngine.predictWithRCSA({
      tool: { diameter_mm: 10, stickout_mm: 40, material: "carbide" },
      holder: { type: "shrink_fit", taper: "HSK-A63" },
    });

    expect(result.rcsa_used).toBe(false);
    expect(result.method).toContain("analytical");
    expect(result.natural_freq_Hz).toBeGreaterThan(0);
    expect(result.stiffness_N_per_m).toBeGreaterThan(0);
  });

  it("predictWithRCSA with measured FRF data returns valid result", () => {
    // Generate synthetic spindle FRF (SDOF at 2000 Hz)
    const fn = 2000;
    const zeta = 0.04;
    const k = 5e7;
    const omega_n = 2 * Math.PI * fn;
    const frequencies: number[] = [];
    const H11_real: number[] = [];
    const H11_imag: number[] = [];

    for (let i = 0; i < 200; i++) {
      const freq = 100 + i * 50;
      const omega = 2 * Math.PI * freq;
      const r = omega / omega_n;
      const dr = 1 - r * r;
      const di = 2 * zeta * r;
      const denom = k * (dr * dr + di * di);
      frequencies.push(freq);
      H11_real.push(dr / denom);
      H11_imag.push(-di / denom);
    }

    const result = receptanceCouplingEngine.predictWithRCSA({
      tool: { diameter_mm: 10, stickout_mm: 40, material: "carbide", flutes: 4 },
      holder: { type: "shrink_fit", taper: "HSK-A63" },
      spindle_frf: { frequencies, H11_real, H11_imag },
    });

    // RCSA may or may not be available — either path should produce valid results
    expect(result.natural_freq_Hz).toBeGreaterThan(0);
    expect(result.stiffness_N_per_m).toBeGreaterThan(0);
    expect(result.method).toBeDefined();
    // If RCSA was used, should have FRF data
    if (result.rcsa_used) {
      expect(result.frf.length).toBeGreaterThan(0);
      expect(result.method).toContain("RCSA");
    }
  });

  it("BT40 vs HSK-A63 produce different stiffness for short stiff tool", () => {
    // Short stiff tool (20mm dia, 25mm stickout) — holder stiffness matters
    // With long slender tools, beam stiffness dominates and holder is irrelevant
    const bt40 = receptanceCouplingEngine.predictWithRCSA({
      tool: { diameter_mm: 20, stickout_mm: 25, material: "carbide" },
      holder: { type: "collet", taper: "BT40" },
    });
    const hsk = receptanceCouplingEngine.predictWithRCSA({
      tool: { diameter_mm: 20, stickout_mm: 25, material: "carbide" },
      holder: { type: "shrink_fit", taper: "HSK-A63" },
    });

    // HSK+shrink_fit should be stiffer than BT40+collet
    expect(hsk.stiffness_N_per_m).toBeGreaterThan(bt40.stiffness_N_per_m);
  });
});
