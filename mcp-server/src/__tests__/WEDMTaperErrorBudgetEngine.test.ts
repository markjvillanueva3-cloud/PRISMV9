/**
 * WEDMTaperErrorBudgetEngine — unit tests
 * P2P-FULLSTACK-MS0 / U-P2PFS42
 */
import { describe, it, expect } from "vitest";
import {
  WEDMTaperErrorBudgetEngine,
  wedmTaperErrorBudgetEngine,
  type TaperErrorBudgetInput,
} from "../engines/WEDMTaperErrorBudgetEngine.js";
import { WEDM_TAPER_SPEC } from "../physics/wedm-constants.js";

function base(overrides: Partial<TaperErrorBudgetInput> = {}): TaperErrorBudgetInput {
  return {
    taper_angle_deg: 5,
    part_height_mm: 50,
    guide_span_mm: 300,
    upper_guide_tolerance_um: 3,
    lower_guide_tolerance_um: 3,
    auto_calibration: true,
    guide_style: "standard",
    ...overrides,
  };
}

describe("WEDMTaperErrorBudgetEngine", () => {
  const engine = new WEDMTaperErrorBudgetEngine();

  describe("UV travel geometry", () => {
    it("UV = h × tan(θ) — zero taper → zero travel", () => {
      const r = engine.calculate(base({ taper_angle_deg: 0 }));
      expect(r.uv_travel_mm).toBeCloseTo(0, 3);
    });

    it("UV = 50 × tan(5°) ≈ 4.374 mm", () => {
      const r = engine.calculate(base({ taper_angle_deg: 5, part_height_mm: 50 }));
      const expected = 50 * Math.tan((5 * Math.PI) / 180);
      expect(r.uv_travel_mm).toBeCloseTo(expected, 3);
    });

    it("sign of taper does not change UV magnitude (absolute)", () => {
      const a = engine.calculate(base({ taper_angle_deg: 10 }));
      const b = engine.calculate(base({ taper_angle_deg: -10 }));
      expect(a.uv_travel_mm).toBeCloseTo(b.uv_travel_mm, 6);
    });

    it("scales linearly with part height at fixed angle", () => {
      const a = engine.calculate(base({ part_height_mm: 25 }));
      const b = engine.calculate(base({ part_height_mm: 100 }));
      expect(b.uv_travel_mm / a.uv_travel_mm).toBeCloseTo(4, 3);
    });
  });

  describe("error budget (RSS)", () => {
    it("returns exactly 4 error sources in stable order", () => {
      const r = engine.calculate(base());
      expect(r.error_sources).toHaveLength(4);
      expect(r.error_sources.map((e) => e.name)).toEqual([
        "Guide tolerance",
        "UV encoder resolution",
        "Wire bow at taper",
        "Calibration residual",
      ]);
    });

    it("total_error_um is the RSS of source contributions", () => {
      const r = engine.calculate(base());
      const rss = Math.sqrt(
        r.error_sources.reduce((s, e) => s + e.contribution_um ** 2, 0),
      );
      // Allow ±0.2 µm for rounding of individual contributions.
      expect(r.total_error_um).toBeGreaterThanOrEqual(rss - 0.2);
      expect(r.total_error_um).toBeLessThanOrEqual(rss + 0.2);
    });

    it("wire bow contribution increases linearly with taper angle", () => {
      const a = engine.calculate(base({ taper_angle_deg: 5 }));
      const b = engine.calculate(base({ taper_angle_deg: 20 }));
      const aBow = a.error_sources.find((e) => /wire bow/i.test(e.name))!.contribution_um;
      const bBow = b.error_sources.find((e) => /wire bow/i.test(e.name))!.contribution_um;
      // 20° / 5° = 4 → bow should be ~4× larger.
      expect(bBow / aBow).toBeCloseTo(4, 1);
    });

    it("auto calibration reduces calibration residual vs manual", () => {
      const auto = engine.calculate(base({ auto_calibration: true }));
      const manual = engine.calculate(base({ auto_calibration: false }));
      const autoCal = auto.error_sources.find((e) => /calibration/i.test(e.name))!
        .contribution_um;
      const manualCal = manual.error_sources.find((e) => /calibration/i.test(e.name))!
        .contribution_um;
      expect(manualCal).toBeGreaterThan(autoCal);
      expect(manual.total_error_um).toBeGreaterThan(auto.total_error_um);
    });

    it("larger guide tolerances widen the error budget", () => {
      const tight = engine.calculate(base({ upper_guide_tolerance_um: 2, lower_guide_tolerance_um: 2 }));
      const loose = engine.calculate(base({ upper_guide_tolerance_um: 8, lower_guide_tolerance_um: 8 }));
      expect(loose.total_error_um).toBeGreaterThan(tight.total_error_um);
    });
  });

  describe("IT tolerance classification", () => {
    it("tight config lands inside the IT6/IT7 band", () => {
      const r = engine.calculate(
        base({
          taper_angle_deg: 0, // no bow
          upper_guide_tolerance_um: 1,
          lower_guide_tolerance_um: 1,
          auto_calibration: true,
        }),
      );
      expect(["IT6", "IT7"]).toContain(r.achievable_tolerance_class);
    });

    it("very loose config degrades to out_of_spec", () => {
      // IT12 = 120 µm. Need RSS total to exceed that.
      // guide = √((500/2)² + (500/2)²) = ~353 µm (dominates) → total ~ 354 µm > 120
      const r = engine.calculate(
        base({
          taper_angle_deg: 45,
          upper_guide_tolerance_um: 500,
          lower_guide_tolerance_um: 500,
          auto_calibration: false,
          guide_style: "extended",
        }),
      );
      expect(r.achievable_tolerance_class).toBe("out_of_spec");
      expect(r.warnings.some((w) => /IT12|exceeds/i.test(w))).toBe(true);
    });

    it("moderate config falls inside IT8–IT10 band", () => {
      const r = engine.calculate(
        base({
          taper_angle_deg: 15,
          upper_guide_tolerance_um: 5,
          lower_guide_tolerance_um: 5,
        }),
      );
      expect(["IT8", "IT9", "IT10"]).toContain(r.achievable_tolerance_class);
    });
  });

  describe("guide geometry limits", () => {
    it("standard guides cap taper at WEDM_TAPER_SPEC.standard_max_taper_deg", () => {
      const r = engine.calculate(base({ taper_angle_deg: 35, guide_style: "standard" }));
      expect(r.exceeds_guide_limit).toBe(true);
      expect(r.max_practical_taper_deg).toBe(WEDM_TAPER_SPEC.standard_max_taper_deg);
      expect(r.warnings.some((w) => /guide geometry|H-head/i.test(w))).toBe(true);
    });

    it("extended (H-head) guides allow higher tapers", () => {
      const r = engine.calculate(base({ taper_angle_deg: 35, guide_style: "extended" }));
      expect(r.exceeds_guide_limit).toBe(false);
      expect(r.max_practical_taper_deg).toBe(WEDM_TAPER_SPEC.extended_max_taper_deg);
    });
  });

  describe("recommendations", () => {
    it("suggests auto-calibration when currently manual", () => {
      const r = engine.calculate(base({ auto_calibration: false }));
      expect(r.recommendations.some((x) => /auto-calibration/i.test(x))).toBe(true);
    });

    it("suggests H-head switch when exceeding standard guide limit", () => {
      const r = engine.calculate(base({ taper_angle_deg: 35, guide_style: "standard" }));
      expect(r.recommendations.some((x) => /H-head|extended/i.test(x))).toBe(true);
    });
  });

  describe("input validation", () => {
    it("rejects taper ≥ 90°", () => {
      expect(() => engine.calculate(base({ taper_angle_deg: 90 }))).toThrow(/taper_angle_deg/);
      expect(() => engine.calculate(base({ taper_angle_deg: -95 }))).toThrow(/taper_angle_deg/);
    });

    it("rejects non-finite taper", () => {
      expect(() => engine.calculate(base({ taper_angle_deg: NaN }))).toThrow(/taper_angle_deg/);
    });

    it("rejects non-positive part height", () => {
      expect(() => engine.calculate(base({ part_height_mm: 0 }))).toThrow(/part_height_mm/);
    });

    it("rejects negative guide tolerances", () => {
      expect(() => engine.calculate(base({ upper_guide_tolerance_um: -1 }))).toThrow(
        /upper_guide_tolerance_um/,
      );
      expect(() => engine.calculate(base({ lower_guide_tolerance_um: -1 }))).toThrow(
        /lower_guide_tolerance_um/,
      );
    });

    it("rejects non-positive guide span", () => {
      expect(() => engine.calculate(base({ guide_span_mm: 0 }))).toThrow(/guide_span_mm/);
    });
  });

  describe("singleton + warnings", () => {
    it("exports a reusable singleton", () => {
      expect(wedmTaperErrorBudgetEngine).toBeInstanceOf(WEDMTaperErrorBudgetEngine);
      const r = wedmTaperErrorBudgetEngine.calculate(base());
      expect(r.total_error_um).toBeGreaterThan(0);
    });

    it("warns when part height approaches guide span (>75%)", () => {
      const r = engine.calculate(base({ part_height_mm: 240, guide_span_mm: 300 }));
      expect(r.warnings.some((w) => /guide span/i.test(w))).toBe(true);
    });
  });
});
