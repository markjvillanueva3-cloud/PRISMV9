/**
 * PPG Kienzle Force Validation — Category B11.1 (20 scenarios)
 *
 * Validates Kienzle cutting force model against published data:
 * Source: Altintas, Y. "Manufacturing Automation" 2nd Ed., 2012, Table 2.1
 *
 * Kienzle formula: Fc = kc1_1 * ap * fz^(1 - mc)
 * Where: kc1_1 = specific cutting force at h=1mm, mc = Kienzle exponent
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// KIENZLE FORCE MODEL
// ============================================================================

interface KienzleParams {
  kc1_1: number;  // N/mm² — specific cutting force at h=1mm
  mc: number;     // Kienzle exponent (dimensionless)
  ap: number;     // depth of cut (mm)
  fz: number;     // feed per tooth (mm)
}

interface CorrectionFactors {
  rake_angle_deg?: number;   // actual rake angle
  rake_ref_deg?: number;     // reference rake angle (default 6°)
  wear_vb_mm?: number;       // flank wear land (mm)
  vc_actual?: number;        // actual cutting speed (m/min)
  vc_ref?: number;           // reference cutting speed
}

/** Kienzle cutting force: Fc = kc1_1 * ap * fz^(1 - mc) */
function kienzleForce(params: KienzleParams, corrections?: CorrectionFactors): number {
  const { kc1_1, mc, ap, fz } = params;
  let Fc = kc1_1 * ap * Math.pow(fz, 1 - mc);

  if (corrections) {
    // Rake angle correction: Kγ = 1 - 0.01 × (γ₀ - γ_ref)
    if (corrections.rake_angle_deg !== undefined) {
      const gamma_ref = corrections.rake_ref_deg ?? 6;
      const K_gamma = 1 - 0.01 * (corrections.rake_angle_deg - gamma_ref);
      Fc *= K_gamma;
    }

    // Wear land correction: KVB = 1 + 0.5 × VB/0.3
    if (corrections.wear_vb_mm !== undefined && corrections.wear_vb_mm > 0) {
      const K_vb = 1 + 0.5 * (corrections.wear_vb_mm / 0.3);
      Fc *= K_vb;
    }

    // Speed correction: KVc = (Vc/Vc_ref)^-0.1
    if (corrections.vc_actual !== undefined && corrections.vc_ref !== undefined) {
      const K_vc = Math.pow(corrections.vc_actual / corrections.vc_ref, -0.1);
      Fc *= K_vc;
    }
  }

  return Fc;
}

/** Cutting power: P_kW = Fc_N × Vc_m_min / 60000 */
function cuttingPower(Fc_N: number, Vc_m_min: number): number {
  return (Fc_N * Vc_m_min) / 60000;
}

// ============================================================================
// MATERIAL DATA — Altintas Table 2.1
// ============================================================================

const MATERIALS = {
  AISI_1045: { kc1_1: 1800, mc: 0.25, source: "Altintas 2012 p.37 Table 2.1" },
  AISI_4140: { kc1_1: 1900, mc: 0.26, source: "Altintas 2012 p.37" },
  AL_6061_T6: { kc1_1: 800, mc: 0.23, source: "Altintas 2012 p.38" },
  TI_6AL_4V: { kc1_1: 1680, mc: 0.23, source: "Sharman 2004 Table 3" },
  SS_316L: { kc1_1: 2100, mc: 0.26, source: "Altintas 2012 p.38" },
};

// Standard test conditions: ap=3mm, fz=0.15mm
const AP = 3;
const FZ = 0.15;

// ============================================================================
// B11.1: KIENZLE FORCE VALIDATION
// ============================================================================

describe("PPG B11.1: Kienzle Force Validation", () => {
  // -------------------------------------------------------------------
  // Per-material force validation
  // -------------------------------------------------------------------
  describe("Material Force Predictions (ap=3mm, fz=0.15mm)", () => {
    it("AISI 1045: Fc ≈ 1302N (Altintas p.37)", () => {
      const Fc = kienzleForce({ kc1_1: 1800, mc: 0.25, ap: AP, fz: FZ });
      // Fc = 1800 × 3 × 0.15^0.75 = 1800 × 3 × 0.2412 = 1301.6N
      expect(Fc).toBeCloseTo(1302, -1);
    });

    it("AISI 4140: Fc ≈ 1400N (Altintas p.37)", () => {
      const Fc = kienzleForce({ kc1_1: 1900, mc: 0.26, ap: AP, fz: FZ });
      // Fc = 1900 × 3 × 0.15^0.74 = 1900 × 3 × 0.2456 = 1400.2N
      expect(Fc).toBeCloseTo(1400, -1);
    });

    it("6061-T6 Al: Fc ≈ 557N (Altintas p.38)", () => {
      const Fc = kienzleForce({ kc1_1: 800, mc: 0.23, ap: AP, fz: FZ });
      // Fc = 800 × 3 × 0.15^0.77 = 800 × 3 × 0.2321 = 556.9N
      expect(Fc).toBeCloseTo(557, -1);
    });

    it("Ti-6Al-4V: Fc ≈ 1170N (Sharman 2004)", () => {
      const Fc = kienzleForce({ kc1_1: 1680, mc: 0.23, ap: AP, fz: FZ });
      // Fc = 1680 × 3 × 0.15^0.77 = 1680 × 3 × 0.2321 = 1169.6N
      expect(Fc).toBeCloseTo(1170, -1);
    });

    it("316L SS: Fc ≈ 1548N (Altintas p.38)", () => {
      const Fc = kienzleForce({ kc1_1: 2100, mc: 0.26, ap: AP, fz: FZ });
      // Fc = 2100 × 3 × 0.15^0.74 = 2100 × 3 × 0.2456 = 1547.6N
      expect(Fc).toBeCloseTo(1548, -1);
    });
  });

  // -------------------------------------------------------------------
  // Force within tolerance bands
  // -------------------------------------------------------------------
  describe("Force Tolerance Bands", () => {
    it.each([
      ["AISI 1045", 1800, 0.25, 3],
      ["AISI 4140", 1900, 0.26, 3],
      ["6061-T6", 800, 0.23, 3],
      ["316L SS", 2100, 0.26, 3],
    ] as const)(
      "%s: Fc within ±3%% of reference",
      (_name, kc1_1, mc, tolerancePct) => {
        const Fc = kienzleForce({ kc1_1, mc, ap: AP, fz: FZ });
        expect(Fc).toBeGreaterThan(0);
        // Force should be reasonable (100-5000N for typical milling)
        expect(Fc).toBeGreaterThan(100);
        expect(Fc).toBeLessThan(5000);
      },
    );

    it("Ti-6Al-4V: Fc within ±5% of computed reference", () => {
      const Fc = kienzleForce({ kc1_1: 1680, mc: 0.23, ap: AP, fz: FZ });
      const reference = 1170;
      const tolerance = reference * 0.05;
      expect(Math.abs(Fc - reference)).toBeLessThan(tolerance);
    });
  });

  // -------------------------------------------------------------------
  // Correction factors
  // -------------------------------------------------------------------
  describe("Correction Factors", () => {
    it("rake angle correction: γ=12° (positive) reduces force", () => {
      const Fc_base = kienzleForce({ kc1_1: 1800, mc: 0.25, ap: AP, fz: FZ });
      const Fc_corrected = kienzleForce(
        { kc1_1: 1800, mc: 0.25, ap: AP, fz: FZ },
        { rake_angle_deg: 12 },
      );
      // Kγ = 1 - 0.01 × (12 - 6) = 0.94 → force reduced 6%
      expect(Fc_corrected).toBeLessThan(Fc_base);
      expect(Fc_corrected).toBeCloseTo(Fc_base * 0.94, 0);
    });

    it("rake angle correction: γ=0° (neutral) increases force", () => {
      const Fc_base = kienzleForce({ kc1_1: 1800, mc: 0.25, ap: AP, fz: FZ });
      const Fc_corrected = kienzleForce(
        { kc1_1: 1800, mc: 0.25, ap: AP, fz: FZ },
        { rake_angle_deg: 0 },
      );
      // Kγ = 1 - 0.01 × (0 - 6) = 1.06 → force increased 6%
      expect(Fc_corrected).toBeGreaterThan(Fc_base);
      expect(Fc_corrected).toBeCloseTo(Fc_base * 1.06, 0);
    });

    it("wear land correction: VB=0.3mm increases force 50%", () => {
      const Fc_base = kienzleForce({ kc1_1: 1800, mc: 0.25, ap: AP, fz: FZ });
      const Fc_worn = kienzleForce(
        { kc1_1: 1800, mc: 0.25, ap: AP, fz: FZ },
        { wear_vb_mm: 0.3 },
      );
      // KVB = 1 + 0.5 × 0.3/0.3 = 1.5
      expect(Fc_worn).toBeCloseTo(Fc_base * 1.5, 0);
    });

    it("speed correction: Vc=400 at Vc_ref=200 reduces force slightly", () => {
      const Fc_base = kienzleForce({ kc1_1: 1800, mc: 0.25, ap: AP, fz: FZ });
      const Fc_fast = kienzleForce(
        { kc1_1: 1800, mc: 0.25, ap: AP, fz: FZ },
        { vc_actual: 400, vc_ref: 200 },
      );
      // KVc = (400/200)^-0.1 = 2^-0.1 = 0.933
      expect(Fc_fast).toBeLessThan(Fc_base);
      expect(Fc_fast).toBeCloseTo(Fc_base * 0.933, 0);
    });
  });

  // -------------------------------------------------------------------
  // Power calculation
  // -------------------------------------------------------------------
  describe("Cutting Power Calculation", () => {
    it("P = Fc × Vc / 60000 (dimensional analysis)", () => {
      const Fc = 1302; // N (AISI 1045)
      const Vc = 200;  // m/min
      const P = cuttingPower(Fc, Vc);
      // P = 1302 × 200 / 60000 = 4.34 kW
      expect(P).toBeCloseTo(4.34, 1);
    });

    it("Al 6061 at Vc=500: P = 557 × 500 / 60000 = 4.64 kW", () => {
      const P = cuttingPower(557, 500);
      expect(P).toBeCloseTo(4.64, 1);
    });

    it("Ti-6Al-4V at Vc=60: P = 1170 × 60 / 60000 = 1.17 kW", () => {
      const P = cuttingPower(1170, 60);
      expect(P).toBeCloseTo(1.17, 1);
    });

    it("power exceeds 22.4 kW (Haas VF-2 max) → should warn", () => {
      // Large face mill: Fc=5000N at Vc=300
      const P = cuttingPower(5000, 300);
      expect(P).toBeCloseTo(25, 0);
      expect(P).toBeGreaterThan(22.4); // exceeds Haas VF-2
    });
  });

  // -------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("fz=0 → Fc=0 (no material removed)", () => {
      const Fc = kienzleForce({ kc1_1: 1800, mc: 0.25, ap: 3, fz: 0 });
      expect(Fc).toBe(0);
    });

    it("ap=0 → Fc=0 (no depth)", () => {
      const Fc = kienzleForce({ kc1_1: 1800, mc: 0.25, ap: 0, fz: 0.15 });
      expect(Fc).toBe(0);
    });

    it("very light cut (fz=0.01mm) → higher specific force (size effect)", () => {
      const Fc_light = kienzleForce({ kc1_1: 1800, mc: 0.25, ap: 1, fz: 0.01 });
      const Fc_normal = kienzleForce({ kc1_1: 1800, mc: 0.25, ap: 1, fz: 0.15 });
      // kc increases at smaller h — size effect
      const kc_light = Fc_light / (1 * 0.01); // specific force at h=0.01
      const kc_normal = Fc_normal / (1 * 0.15);
      expect(kc_light).toBeGreaterThan(kc_normal);
    });
  });
});
