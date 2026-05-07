/**
 * WEDMDielectricFlushAdjustEngine — unit tests
 * P2P-FULLSTACK-MS0 / U-P2PFS40
 */
import { describe, it, expect } from "vitest";
import {
  WEDMDielectricFlushAdjustEngine,
  wedmDielectricFlushAdjustEngine,
  type DielectricFlushAdjustInput,
} from "../engines/WEDMDielectricFlushAdjustEngine.js";
import { WEDM_DIELECTRIC_SPEC } from "../physics/wedm-constants.js";

// ── Fixtures ──────────────────────────────────────────────────────────

function opt(overrides: Partial<DielectricFlushAdjustInput> = {}): DielectricFlushAdjustInput {
  return {
    baseline_flush_pressure_bar: 8.0,
    conductivity_uS_cm: WEDM_DIELECTRIC_SPEC.optimal_conductivity_uS_cm, // 5
    thickness_mm: 20,
    dielectric_temp_C: WEDM_DIELECTRIC_SPEC.reference_temp_C, // 20
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("WEDMDielectricFlushAdjustEngine", () => {
  const engine = new WEDMDielectricFlushAdjustEngine();

  describe("identity / baseline", () => {
    it("at σ = σ_opt and T = 20 °C, pressure passes through unchanged", () => {
      const r = engine.calculate(opt());
      expect(r.conductivity_factor).toBeCloseTo(1.0, 6);
      expect(r.temperature_factor).toBeCloseTo(1.0, 6);
      expect(r.thick_section_factor).toBeCloseTo(1.0, 6);
      expect(r.total_factor).toBeCloseTo(1.0, 6);
      expect(r.adjusted_flush_pressure_bar).toBeCloseTo(8.0, 3);
    });

    it("classifies σ at optimum as 'optimal'", () => {
      const r = engine.calculate(opt());
      expect(r.conductivity_status).toBe("optimal");
      expect(r.resin_exchange_urgency).toBe("none");
    });
  });

  describe("conductivity scaling", () => {
    it("monotonically increases pressure with conductivity", () => {
      const lo = engine.calculate(opt({ conductivity_uS_cm: 5 }));
      const mid = engine.calculate(opt({ conductivity_uS_cm: 15 }));
      const hi = engine.calculate(opt({ conductivity_uS_cm: 25 }));
      expect(mid.adjusted_flush_pressure_bar).toBeGreaterThan(lo.adjusted_flush_pressure_bar);
      expect(hi.adjusted_flush_pressure_bar).toBeGreaterThan(mid.adjusted_flush_pressure_bar);
    });

    it("applies the canonical sensitivity (2.5% per µS/cm over optimum)", () => {
      // σ = 15 → excess = 10 → k_cond = 1 + 10 × 0.025 = 1.25
      const r = engine.calculate(opt({ conductivity_uS_cm: 15 }));
      expect(r.conductivity_factor).toBeCloseTo(1.25, 6);
      expect(r.adjusted_flush_pressure_bar).toBeCloseTo(10.0, 3); // 8.0 × 1.25
    });

    it("does not reduce pressure below floor when σ < optimum", () => {
      const r = engine.calculate(opt({ conductivity_uS_cm: 0 }));
      // excess = 0 → k_cond = 1 (no reduction from conductivity alone)
      expect(r.conductivity_factor).toBeCloseTo(1.0, 6);
      expect(r.total_factor).toBeGreaterThanOrEqual(WEDM_DIELECTRIC_SPEC.min_pressure_factor);
    });

    it("caps total factor at max_pressure_factor", () => {
      // Use wildly high conductivity so raw factor far exceeds cap
      const r = engine.calculate(
        opt({
          conductivity_uS_cm: 500, // 495 over optimum → raw k_cond ≈ 13.4
          dielectric_temp_C: 35,
        }),
      );
      expect(r.total_factor).toBeCloseTo(WEDM_DIELECTRIC_SPEC.max_pressure_factor, 6);
      expect(r.warnings.some((w) => /safe cap/i.test(w))).toBe(true);
    });
  });

  describe("temperature scaling", () => {
    it("increases factor with temperature above reference", () => {
      // T = 30 → excess = 10 → k_temp = 1 + 10 × 0.015 = 1.15
      const r = engine.calculate(opt({ dielectric_temp_C: 30 }));
      expect(r.temperature_factor).toBeCloseTo(1.15, 6);
    });

    it("warns when temperature exceeds ceiling (30 °C)", () => {
      const r = engine.calculate(opt({ dielectric_temp_C: 35 }));
      expect(r.warnings.some((w) => /temperature/i.test(w))).toBe(true);
    });

    it("does not adjust below reference temperature", () => {
      const r = engine.calculate(opt({ dielectric_temp_C: 10 }));
      expect(r.temperature_factor).toBeCloseTo(1.0, 6);
    });
  });

  describe("thick section boost", () => {
    it("adds 10% for thickness > 60 mm", () => {
      const r = engine.calculate(opt({ thickness_mm: 80 }));
      expect(r.thick_section_factor).toBeCloseTo(1.1, 6);
      // Adjusted = 8 × 1.0 × 1.0 × 1.1 = 8.8
      expect(r.adjusted_flush_pressure_bar).toBeCloseTo(8.8, 3);
    });

    it("omits boost at or below 60 mm threshold", () => {
      const r = engine.calculate(opt({ thickness_mm: 60 }));
      expect(r.thick_section_factor).toBeCloseTo(1.0, 6);
    });

    it("omits boost when thickness is undefined", () => {
      const { thickness_mm: _t, ...rest } = opt();
      const r = engine.calculate(rest as DielectricFlushAdjustInput);
      expect(r.thick_section_factor).toBeCloseTo(1.0, 6);
    });
  });

  describe("conductivity status classification", () => {
    it("σ ≤ 8 → optimal", () => {
      const r = engine.calculate(opt({ conductivity_uS_cm: 8 }));
      expect(r.conductivity_status).toBe("optimal");
      expect(r.resin_exchange_urgency).toBe("none");
    });

    it("8 < σ ≤ 15 → acceptable", () => {
      const r = engine.calculate(opt({ conductivity_uS_cm: 12 }));
      expect(r.conductivity_status).toBe("acceptable");
      expect(r.resin_exchange_urgency).toBe("none");
    });

    it("15 < σ ≤ 25 → degraded, resin exchange recommended", () => {
      const r = engine.calculate(opt({ conductivity_uS_cm: 22 }));
      expect(r.conductivity_status).toBe("degraded");
      expect(r.resin_exchange_urgency).toBe("recommended");
      expect(r.recommendations.some((x) => /resin/i.test(x))).toBe(true);
    });

    it("σ > 25 → out_of_spec, resin exchange required", () => {
      const r = engine.calculate(opt({ conductivity_uS_cm: 32 }));
      expect(r.conductivity_status).toBe("out_of_spec");
      expect(r.resin_exchange_urgency).toBe("required");
      expect(r.warnings.some((x) => /required|exceeds/i.test(x))).toBe(true);
      expect(r.recommendations.some((x) => /STOP/i.test(x))).toBe(true);
    });
  });

  describe("recommendations", () => {
    it("includes proceed-baseline rec when optimal", () => {
      const r = engine.calculate(opt());
      expect(r.recommendations.join(" ")).toMatch(/optimum|proceed/i);
    });

    it("includes thick-section nozzle check for thickness > 60 mm", () => {
      const r = engine.calculate(opt({ thickness_mm: 80 }));
      expect(r.recommendations.some((x) => /nozzle/i.test(x))).toBe(true);
    });

    it("includes chiller rec when temp is elevated", () => {
      const r = engine.calculate(opt({ dielectric_temp_C: 28 }));
      expect(r.recommendations.some((x) => /temperature|lower/i.test(x))).toBe(true);
    });
  });

  describe("input validation", () => {
    it("rejects non-positive baseline pressure", () => {
      expect(() => engine.calculate(opt({ baseline_flush_pressure_bar: 0 }))).toThrow(
        /baseline_flush_pressure_bar/,
      );
    });

    it("rejects negative conductivity", () => {
      expect(() => engine.calculate(opt({ conductivity_uS_cm: -1 }))).toThrow(
        /conductivity_uS_cm/,
      );
    });

    it("rejects non-positive thickness when provided", () => {
      expect(() => engine.calculate(opt({ thickness_mm: 0 }))).toThrow(/thickness_mm/);
    });

    it("rejects out-of-range dielectric temperature", () => {
      expect(() => engine.calculate(opt({ dielectric_temp_C: -5 }))).toThrow(/dielectric_temp_C/);
      expect(() => engine.calculate(opt({ dielectric_temp_C: 150 }))).toThrow(/dielectric_temp_C/);
    });
  });

  describe("singleton export", () => {
    it("exports a reusable singleton", () => {
      expect(wedmDielectricFlushAdjustEngine).toBeInstanceOf(
        WEDMDielectricFlushAdjustEngine,
      );
      const r = wedmDielectricFlushAdjustEngine.calculate(opt());
      expect(r.adjusted_flush_pressure_bar).toBeCloseTo(8.0, 3);
    });
  });
});
