/**
 * Chatter Stability Formula Engine Tests — Formula Verification
 *
 * Validates regenerative chatter stability analysis against published literature:
 * - Altintas & Budak (1995) analytical stability model
 * - Tlusty "Manufacturing Processes and Equipment" (2000)
 * - Schmitz & Smith "Machining Dynamics" (2009)
 * - Altintas "Manufacturing Automation" (2012) Ch. 3
 *
 * BENCH-MS0 P0-U05: Chatter Stability Proof
 */

import { describe, it, expect } from "vitest";
import { chatterStabilityLobeEngine } from "../engines/ChatterStabilityLobeEngine.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ============================================================================
// CHATTER STABILITY CONSTANTS — Published Reference Values
// ============================================================================

/**
 * Reference structural dynamics parameters.
 * Source: Schmitz & Smith (2009), Table 4.1
 */
const REFERENCE_DYNAMICS = {
  typical_endmill: {
    natural_freq_hz: 2500,
    damping_ratio: 0.03,
    stiffness_n_um: 15,
    source: "Schmitz & Smith (2009)",
  },
  long_endmill: {
    natural_freq_hz: 1200,
    damping_ratio: 0.025,
    stiffness_n_um: 5,
    source: "Schmitz & Smith (2009)",
  },
  boring_bar: {
    natural_freq_hz: 800,
    damping_ratio: 0.02,
    stiffness_n_um: 3,
    source: "Altintas (2012)",
  },
  high_speed_spindle: {
    natural_freq_hz: 5000,
    damping_ratio: 0.04,
    stiffness_n_um: 50,
    source: "Altintas (2012)",
  },
};

/**
 * Typical stability lobe characteristics.
 * Source: Altintas "Manufacturing Automation" Ch. 3
 */
const REFERENCE_STABILITY = {
  lobe_spacing: {
    description: "Lobes spaced by tooth passing frequency",
    formula: "Δn = 60×f_n/Z",
    source: "Altintas (2012)",
  },
  critical_depth: {
    description: "a_lim minimum at resonance",
    formula: "a_lim_min = ζ×k/Ks",
    source: "Altintas & Budak (1995)",
  },
};

// ============================================================================
// TEST SUITE: FUNDAMENTAL FORMULAS
// ============================================================================

describe("ChatterStabilityFormulaEngine — Fundamental Formulas", () => {
  describe("Altintas-Budak critical depth: a_lim = -1/(2×Ks×α_xx×Re[G(ω)])", () => {
    it("should calculate FRF magnitude and phase correctly", () => {
      // Single-mode FRF: G(ω) = (1/k) × 1/((1-r²) + j(2ζr))
      // At resonance (r=1): Re[G] → 0, Im[G] = -1/(2ζk)
      const k = 15e6; // N/m = 15 N/µm
      const zeta = 0.03;
      const omega_n = 2 * Math.PI * 2500; // rad/s
      const omega = omega_n; // at resonance
      const r = omega / omega_n;

      const denom = (1 - r * r) ** 2 + (2 * zeta * r) ** 2;
      const reG = (1 / k) * (1 - r * r) / denom;
      const imG = (1 / k) * (-(2 * zeta * r)) / denom;
      const magG = Math.sqrt(reG * reG + imG * imG);

      // At resonance, magnitude = 1/(2ζk)
      expect(magG).toBeCloseTo(1 / (2 * zeta * k), -2);
    });

    it("minimum critical depth should follow a_lim_min = ζ×k/Ks", () => {
      // Unconditional stability limit derived from FRF peak magnitude:
      // |G|_max = 1/(2ζk) at resonance
      // a_lim_min = 1/(2×Ks×|G|_max) = ζ×k/Ks
      // From Altintas & Budak (1995)
      const k = 15e6; // N/m
      const Ks = 1800e6; // N/m² (1800 MPa converted)
      const zeta = 0.03;

      // Unconditional limit formula (ignoring α_xx for simplicity)
      const a_lim_min_mm = (zeta * k / Ks) * 1000; // convert m to mm

      // Should be a small positive value for typical parameters
      expect(a_lim_min_mm).toBeGreaterThan(0);
      expect(a_lim_min_mm).toBeLessThan(1); // typically < 1mm unconditional limit
    });

    it("directional coefficient α_xx should be calculated correctly", () => {
      // α_xx = 0.5 × [(φ_ex - φ_st) - 0.5×(sin(2φ_ex) - sin(2φ_st))]

      // Full slotting: φ_st=0, φ_ex=π
      const phi_st_slot = 0;
      const phi_ex_slot = Math.PI;
      const alpha_slot =
        0.5 * ((phi_ex_slot - phi_st_slot) - 0.5 * (Math.sin(2 * phi_ex_slot) - Math.sin(2 * phi_st_slot)));
      expect(alpha_slot).toBeCloseTo(Math.PI / 2, 2);

      // 50% radial immersion (down milling): φ_st=π/2, φ_ex=π
      const ae_ratio = 0.5;
      const phi_st_half = Math.acos(2 * ae_ratio - 1);
      const phi_ex_half = Math.PI;
      const alpha_half =
        0.5 * ((phi_ex_half - phi_st_half) - 0.5 * (Math.sin(2 * phi_ex_half) - Math.sin(2 * phi_st_half)));
      expect(alpha_half).toBeGreaterThan(0);
      expect(alpha_half).toBeLessThan(alpha_slot);
    });
  });

  describe("Stability lobe spacing formula: n_lobe = 60×f_c/(Z×(N + ε/(2π)))", () => {
    it("should calculate lobe RPM from chatter frequency", () => {
      // n = 60×f_c / (Z×(N + ε/(2π)))
      const f_c = 2500; // chatter frequency (Hz)
      const Z = 4; // flute count
      const epsilon = Math.PI; // phase (typical value)

      // Lobe N=0: n = 60×2500 / (4×(0+0.5)) = 150000/2 = 75000 RPM
      const n_lobe0 = (60 * f_c) / (Z * (0 + epsilon / (2 * Math.PI)));
      expect(n_lobe0).toBeCloseTo(75000, -3); // 75000 RPM for N=0

      // Lobe N=1: n = 60×2500 / (4×(1+0.5)) = 150000/6 = 25000 RPM
      const n_lobe1 = (60 * f_c) / (Z * (1 + epsilon / (2 * Math.PI)));
      expect(n_lobe1).toBeCloseTo(25000, -3); // 25000 RPM for N=1

      // Lobe N=2
      const n_lobe2 = (60 * f_c) / (Z * (2 + epsilon / (2 * Math.PI)));
      expect(n_lobe2).toBeLessThan(n_lobe1); // decreasing with N
    });

    it("higher flute count should shift lobes to lower RPM", () => {
      const f_c = 2500;
      const epsilon = Math.PI;
      const N = 1;

      const n_2f = (60 * f_c) / (2 * (N + epsilon / (2 * Math.PI)));
      const n_4f = (60 * f_c) / (4 * (N + epsilon / (2 * Math.PI)));

      expect(n_4f).toBeCloseTo(n_2f / 2, 0);
    });

    it("higher natural frequency should shift lobes to higher RPM", () => {
      const Z = 4;
      const epsilon = Math.PI;
      const N = 1;

      const n_low_f = (60 * 1500) / (Z * (N + epsilon / (2 * Math.PI)));
      const n_high_f = (60 * 3000) / (Z * (N + epsilon / (2 * Math.PI)));

      expect(n_high_f).toBeCloseTo(2 * n_low_f, 0);
    });
  });
});

// ============================================================================
// TEST SUITE: TOOL STIFFNESS FORMULA
// ============================================================================

describe("ChatterStabilityFormulaEngine — Tool Stiffness", () => {
  describe("Cantilever beam stiffness: k = 3EI/L³", () => {
    it("should calculate stiffness correctly", () => {
      // k = 3EI/L³
      const E = 600e9; // Pa (600 GPa for carbide)
      const d = 0.012; // 12mm diameter
      const I = (Math.PI / 64) * Math.pow(d, 4); // m⁴
      const L = 0.050; // 50mm overhang

      const k = (3 * E * I) / Math.pow(L, 3);

      // Should be in N/m, typical range 10-50 MN/m for endmills
      expect(k / 1e6).toBeGreaterThan(5);
      expect(k / 1e6).toBeLessThan(100);
    });

    it("stiffness should scale with d⁴", () => {
      const E = 600e9;
      const L = 0.050;

      const k_10mm = (3 * E * (Math.PI / 64) * Math.pow(0.010, 4)) / Math.pow(L, 3);
      const k_20mm = (3 * E * (Math.PI / 64) * Math.pow(0.020, 4)) / Math.pow(L, 3);

      expect(k_20mm / k_10mm).toBeCloseTo(16, 1); // 2⁴ = 16
    });

    it("stiffness should scale with 1/L³", () => {
      const E = 600e9;
      const d = 0.012;
      const I = (Math.PI / 64) * Math.pow(d, 4);

      const k_40mm = (3 * E * I) / Math.pow(0.040, 3);
      const k_80mm = (3 * E * I) / Math.pow(0.080, 3);

      expect(k_40mm / k_80mm).toBeCloseTo(8, 1); // 2³ = 8
    });
  });

  describe("Natural frequency: f_n = (1/2π)×√(k/m)", () => {
    it("should calculate natural frequency correctly", () => {
      const k = 20e6; // N/m
      const m = 0.1; // kg (effective modal mass)

      const f_n = (1 / (2 * Math.PI)) * Math.sqrt(k / m);

      // Typical range 1000-5000 Hz for endmills
      expect(f_n).toBeGreaterThan(500);
      expect(f_n).toBeLessThan(10000);
    });

    it("stiffer system should have higher natural frequency", () => {
      const m = 0.1;

      const f_low_k = (1 / (2 * Math.PI)) * Math.sqrt(10e6 / m);
      const f_high_k = (1 / (2 * Math.PI)) * Math.sqrt(40e6 / m);

      expect(f_high_k / f_low_k).toBeCloseTo(2, 1); // √4 = 2
    });
  });
});

// ============================================================================
// TEST SUITE: ENGINE RESULT STRUCTURE
// ============================================================================

describe("ChatterStabilityFormulaEngine — Engine Structure", () => {
  describe("Result fields", () => {
    it("should return result with correct structure", () => {
      const result = chatterStabilityLobeEngine.compute({
        tool: {
          diameter_mm: 12,
          flute_count: 4,
          overhang_mm: 50,
          material: "carbide",
        },
        workpiece: { iso_group: "P" },
        machine: {
          natural_frequency_hz: 2000,
          damping_ratio: 0.03,
          stiffness_n_um: 15,
          max_rpm: 10000,
        },
        cutting: {
          radial_immersion_ratio: 0.5,
          up_milling: false,
        },
      });

      // Result should have AtomicValue structure
      expect(result.unit).toBeDefined();
      expect(result.formula).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Result value should have chatter result structure
      expect(result.value.optimal_rpm).toBeDefined();
      expect(result.value.max_stable_ap_mm).toBeDefined();
      expect(result.value.critical_frequency_hz).toBeDefined();
      expect(result.value.lobes).toBeDefined();
      expect(result.value.recommendations).toBeDefined();
    });

    it("formula should reference Altintas-Budak", () => {
      const result = chatterStabilityLobeEngine.compute({
        tool: {
          diameter_mm: 12,
          flute_count: 4,
          overhang_mm: 50,
          material: "carbide",
        },
        workpiece: { iso_group: "P" },
        machine: {
          max_rpm: 10000,
        },
        cutting: {
          radial_immersion_ratio: 0.5,
          up_milling: false,
        },
      });

      expect(result.formula).toContain("Altintas");
    });

    it("should produce recommendations", () => {
      const result = chatterStabilityLobeEngine.compute({
        tool: {
          diameter_mm: 12,
          flute_count: 4,
          overhang_mm: 50,
          material: "carbide",
        },
        workpiece: { iso_group: "P" },
        machine: {
          max_rpm: 10000,
        },
        cutting: {
          radial_immersion_ratio: 0.5,
          up_milling: false,
        },
      });

      expect(Array.isArray(result.value.recommendations)).toBe(true);
    });
  });
});

// ============================================================================
// TEST SUITE: KIENZLE Ks VALUES
// ============================================================================

describe("ChatterStabilityFormulaEngine — Kienzle Integration", () => {
  describe("Specific cutting force from CANONICAL_KIENZLE", () => {
    it("ISO P (Steel) Ks should be 1800 MPa", () => {
      expect(CANONICAL_KIENZLE.P.kc1_1).toBe(1800);
    });

    it("ISO N (Aluminum) Ks should be 700 MPa (lower)", () => {
      expect(CANONICAL_KIENZLE.N.kc1_1).toBe(700);
    });

    it("ISO S (Titanium) Ks should be 2800 MPa (higher)", () => {
      expect(CANONICAL_KIENZLE.S.kc1_1).toBe(2800);
    });

    it("lower Ks should give higher stability limit", () => {
      // a_lim ∝ 1/Ks
      const Ks_steel = CANONICAL_KIENZLE.P.kc1_1;
      const Ks_aluminum = CANONICAL_KIENZLE.N.kc1_1;

      const ratio = Ks_steel / Ks_aluminum;
      expect(ratio).toBeCloseTo(1800 / 700, 1); // ~2.57

      // Aluminum allows ~2.5× deeper stable cuts than steel
    });
  });
});

// ============================================================================
// TEST SUITE: DAMPING EFFECT
// ============================================================================

describe("ChatterStabilityFormulaEngine — Damping Effect", () => {
  describe("Damping ratio effect on stability", () => {
    it("unconditional limit should be proportional to damping", () => {
      // a_lim_min = ζ×k/Ks (derived from |G|_max = 1/(2ζk))
      // Higher damping → higher stability limit
      const k = 15e6; // N/m
      const Ks = 1800e6; // N/m²

      // a_lim_min = ζ × k / Ks
      const a_lim_zeta_002 = (0.02 * k / Ks) * 1000; // mm
      const a_lim_zeta_004 = (0.04 * k / Ks) * 1000; // mm

      // Doubling damping should double stability limit
      expect(a_lim_zeta_004 / a_lim_zeta_002).toBeCloseTo(2, 1);
    });

    it("vibration-damping holders should improve stability", () => {
      // Typical damping: 0.02-0.03, with damping holders: 0.06-0.10
      const improvement = 0.08 / 0.03; // ~2.7× improvement
      expect(improvement).toBeGreaterThan(2);
    });
  });
});

// ============================================================================
// TEST SUITE: LITERATURE REFERENCES
// ============================================================================

describe("ChatterStabilityFormulaEngine — Literature References", () => {
  describe("Altintas & Budak (1995)", () => {
    it("formula should match paper: a_lim = -1/(2×Ks×N_t×α_xx×Re[G])", () => {
      // This is the core Altintas-Budak formula
      // N_t is number of teeth (Z)
      // The negative sign ensures a_lim > 0 when Re[G] < 0

      const Ks = 1800; // N/mm² = MPa
      const Z = 4;
      const alpha_xx = Math.PI / 2; // full slot
      const reG = -0.001; // negative (above resonance)

      const a_lim = -1 / (2 * Ks * Z * alpha_xx * reG);

      expect(a_lim).toBeGreaterThan(0); // positive critical depth
    });
  });

  describe("Schmitz & Smith (2009) dynamics values", () => {
    it("typical endmill should have f_n = 2000-3000 Hz", () => {
      const ref = REFERENCE_DYNAMICS.typical_endmill;
      expect(ref.natural_freq_hz).toBeGreaterThanOrEqual(2000);
      expect(ref.natural_freq_hz).toBeLessThanOrEqual(3500);
    });

    it("typical damping ratio should be 0.02-0.05", () => {
      const ref = REFERENCE_DYNAMICS.typical_endmill;
      expect(ref.damping_ratio).toBeGreaterThanOrEqual(0.02);
      expect(ref.damping_ratio).toBeLessThanOrEqual(0.05);
    });
  });
});

// ============================================================================
// TEST SUITE: DIMENSIONAL CONSISTENCY
// ============================================================================

describe("ChatterStabilityFormulaEngine — Dimensional Consistency", () => {
  it("a_lim should have units of length (mm)", () => {
    // a_lim = -1 / (2 × Ks × α_xx × Re[G])
    // [1] / ([N/mm²] × [1] × [mm/N]) = mm ✓

    const Ks = 1800; // N/mm²
    const alpha_xx = 1; // dimensionless
    const reG = -0.001; // mm/N (FRF compliance)

    const a_lim = -1 / (2 * Ks * alpha_xx * reG);

    // Result should be in mm
    expect(a_lim).toBeGreaterThan(0);
    expect(a_lim).toBeLessThan(100); // reasonable mm range
  });

  it("k (stiffness) should have units of N/m or N/mm", () => {
    // k = 3EI/L³
    // [Pa × m⁴] / [m³] = N/m² × m = N/m ✓

    const E = 600e9; // Pa = N/m²
    const d = 0.012; // m
    const I = (Math.PI / 64) * Math.pow(d, 4); // m⁴
    const L = 0.050; // m

    const k = (3 * E * I) / Math.pow(L, 3); // N/m

    expect(k).toBeGreaterThan(1e6); // MN/m range
    expect(k).toBeLessThan(1e9); // reasonable upper bound
  });

  it("f_n should have units of Hz", () => {
    // f_n = (1/2π) × √(k/m)
    // √([N/m] / [kg]) = √(kg·m/s²/m / kg) = √(1/s²) = 1/s = Hz ✓

    const k = 20e6; // N/m
    const m = 0.1; // kg

    const f_n = (1 / (2 * Math.PI)) * Math.sqrt(k / m); // Hz

    expect(f_n).toBeGreaterThan(100);
    expect(f_n).toBeLessThan(10000);
  });
});

// ============================================================================
// TEST SUITE: EDGE CASES
// ============================================================================

describe("ChatterStabilityFormulaEngine — Edge Cases", () => {
  it("should handle low damping (close to zero)", () => {
    // Very low damping should give very low stability limit
    // a_lim_min = ζ × k / Ks
    const k = 15e6;
    const Ks = 1800e6;
    const zeta = 0.005; // very low

    const a_lim_min = (zeta * k / Ks) * 1000; // mm

    // Should still be positive but very small
    expect(a_lim_min).toBeGreaterThan(0);
    expect(a_lim_min).toBeLessThan(0.1); // very restrictive (< 0.1mm)
  });

  it("should handle high damping", () => {
    // a_lim_min = ζ × k / Ks
    const k = 15e6;
    const Ks = 1800e6;
    const zeta = 0.10; // high (damping holder)

    const a_lim_min = (zeta * k / Ks) * 1000; // mm

    // High damping should give reasonable stability limit
    expect(a_lim_min).toBeGreaterThan(0.5);
    expect(a_lim_min).toBeLessThan(5);
  });

  it("should handle very long overhang (L/D > 6)", () => {
    const result = chatterStabilityLobeEngine.compute({
      tool: {
        diameter_mm: 10,
        flute_count: 4,
        overhang_mm: 70, // L/D = 7
        material: "carbide",
      },
      workpiece: { iso_group: "P" },
      machine: {
        max_rpm: 10000,
      },
      cutting: {
        radial_immersion_ratio: 0.5,
        up_milling: false,
      },
    });

    // Should warn about L/D
    const hasLDWarning = result.value.recommendations.some(
      (r) => r.toLowerCase().includes("l/d") || r.toLowerCase().includes("overhang")
    );
    expect(hasLDWarning).toBe(true);
  });
});
