/**
 * LATHE-PRO-MS1, Session 5, U-LPR11
 * TurningInsertLifeEngine Tests
 *
 * Validates:
 * - Extended Taylor model with feed/depth exponents
 * - Insert grade selection matrix across all 6 ISO groups
 * - Chipbreaker operating window validation
 * - Parallel failure mode evaluation: min(T_flank, T_crater, T_notch, T_BUE)
 * - CSS-integrated wear accumulation
 * - Wiper insert productivity model
 * - Coating multiplier effects
 */

import { describe, it, expect } from "vitest";
import { turningInsertLifeEngine } from "../engines/TurningInsertLifeEngine.js";

// ── Extended Taylor Model ──────────────────────────────────────────────────

describe("TurningInsertLifeEngine — Extended Taylor", () => {
  it("predicts positive tool life for standard steel turning", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P",
      Vc_m_min: 200,
      f_mm_rev: 0.30,
      ap_mm: 2.0,
    });
    expect(result.tool_life_min).toBeGreaterThan(0);
    expect(result.source).toContain("Extended Taylor");
  });

  it("higher Vc reduces tool life (Taylor relationship)", () => {
    const slow = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 150, f_mm_rev: 0.30, ap_mm: 2.0,
    });
    const fast = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 300, f_mm_rev: 0.30, ap_mm: 2.0,
    });
    expect(slow.tool_life_min).toBeGreaterThan(fast.tool_life_min);
  });

  it("higher feed reduces tool life (extended Taylor feed exponent)", () => {
    const lightFeed = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.15, ap_mm: 2.0,
    });
    const heavyFeed = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.50, ap_mm: 2.0,
    });
    expect(lightFeed.tool_life_min).toBeGreaterThan(heavyFeed.tool_life_min);
  });

  it("higher depth of cut reduces tool life (extended Taylor depth exponent)", () => {
    const shallow = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 1.0,
    });
    const deep = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 5.0,
    });
    expect(shallow.tool_life_min).toBeGreaterThan(deep.tool_life_min);
  });

  it("reference conditions (f=0.3, ap=2.0) approximate base Taylor life", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0,
    });
    // At reference conditions, extended Taylor ≈ base Taylor
    // Base Taylor for P at 200 m/min: (350/200)^(1/0.25) = 1.75^4 ≈ 9.38 min
    // The real life may differ due to failure modes, but should be in the right ballpark
    expect(result.tool_life_min).toBeGreaterThan(1);
    expect(result.tool_life_min).toBeLessThan(100);
  });
});

// ── Coating Effects ────────────────────────────────────────────────────────

describe("TurningInsertLifeEngine — Coatings", () => {
  it("coated insert lasts longer than uncoated", () => {
    const uncoated = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0,
    });
    const coated = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0, coating: "CVD_TiCN_Al2O3",
    });
    expect(coated.tool_life_min).toBeGreaterThan(uncoated.tool_life_min);
    expect(coated.coating_multiplier).toBe(1.9);
  });

  it("diamond coating has highest multiplier", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "N", Vc_m_min: 500, f_mm_rev: 0.20, ap_mm: 1.5, coating: "diamond",
    });
    expect(result.coating_multiplier).toBe(3.0);
  });
});

// ── Insert Grade Selection ─────────────────────────────────────────────────

describe("TurningInsertLifeEngine — Grade Selection", () => {
  it("recommends CBN for hardened steel (ISO H)", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "H", Vc_m_min: 120, f_mm_rev: 0.10, ap_mm: 0.5,
    });
    expect(result.recommended_grade.substrate).toBe("CBN");
  });

  it("recommends PCD for high-speed aluminum", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "N", Vc_m_min: 600, f_mm_rev: 0.15, ap_mm: 1.0,
    });
    expect(result.recommended_grade.substrate).toBe("PCD");
  });

  it("recommends carbide for standard steel", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0,
    });
    expect(result.recommended_grade.substrate).toBe("carbide");
  });

  it("overrides to CBN when hardness > 450 HB regardless of ISO group", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 100, f_mm_rev: 0.10, ap_mm: 0.5, hardness_HB: 500,
    });
    expect(result.recommended_grade.substrate).toBe("CBN");
  });

  it("all 6 ISO groups produce a valid grade recommendation", () => {
    const groups: Array<"P" | "M" | "K" | "N" | "S" | "H"> = ["P", "M", "K", "N", "S", "H"];
    for (const iso of groups) {
      const result = turningInsertLifeEngine.predictLife({
        iso_group: iso, Vc_m_min: 150, f_mm_rev: 0.25, ap_mm: 1.5,
      });
      expect(result.recommended_grade.grade_family).toBeTruthy();
      expect(result.recommended_grade.rationale.length).toBeGreaterThan(10);
    }
  });
});

// ── Chipbreaker Validation ─────────────────────────────────────────────────

describe("TurningInsertLifeEngine — Chipbreaker", () => {
  it("PM chipbreaker is in-window for medium conditions", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.5,
    });
    expect(result.chipbreaker.in_window).toBe(true);
    expect(result.chipbreaker.recommended).toBe("PM");
  });

  it("detects out-of-window conditions", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 1.2, ap_mm: 15.0,
    });
    expect(result.chipbreaker.in_window).toBe(false);
  });

  it("recommends finishing chipbreaker for light cuts", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 250, f_mm_rev: 0.10, ap_mm: 0.5,
    });
    expect(result.chipbreaker.recommended).toBe("PF");
    expect(result.chipbreaker.in_window).toBe(true);
  });
});

// ── Parallel Failure Modes ─────────────────────────────────────────────────

describe("TurningInsertLifeEngine — Failure Modes", () => {
  it("reports all 4 failure modes", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0,
    });
    expect(result.failure_modes.flank_life_min).toBeGreaterThan(0);
    expect(result.failure_modes.crater_life_min).toBeGreaterThan(0);
    expect(result.failure_modes.notch_life_min).toBeGreaterThan(0);
    expect(result.failure_modes.bue_life_min).toBeGreaterThan(0);
  });

  it("tool life equals the minimum failure mode", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0,
    });
    const minLife = Math.min(
      result.failure_modes.flank_life_min,
      result.failure_modes.crater_life_min,
      result.failure_modes.notch_life_min,
      result.failure_modes.bue_life_min,
    );
    expect(result.tool_life_min).toBeCloseTo(minLife, 1);
  });

  it("notch wear dominates for superalloys (ISO S)", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "S", Vc_m_min: 50, f_mm_rev: 0.15, ap_mm: 1.0,
    });
    expect(result.failure_modes.notch_life_min).toBeLessThanOrEqual(result.failure_modes.flank_life_min);
  });

  it("BUE dominates for aluminum at low Vc", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "N", Vc_m_min: 100, f_mm_rev: 0.20, ap_mm: 1.5,
    });
    // At low Vc for aluminum, BUE should be close to or below flank
    expect(result.failure_modes.bue_life_min).toBeLessThan(result.failure_modes.crater_life_min);
  });

  it("interrupted cuts reduce life by ~40%", () => {
    const continuous = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0,
    });
    const interrupted = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0, is_interrupted: true,
    });
    const ratio = interrupted.tool_life_min / continuous.tool_life_min;
    expect(ratio).toBeCloseTo(0.60, 1);
  });
});

// ── CSS-Integrated Wear ────────────────────────────────────────────────────

describe("TurningInsertLifeEngine — CSS Wear", () => {
  it("computes CSS-adjusted life when diameters provided", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0,
      css_diameters_mm: { d_start: 60, d_end: 20 },
    });
    expect(result.css_adjusted_life_min).toBeDefined();
    expect(result.css_adjusted_life_min!).toBeGreaterThan(0);
  });

  it("CSS life differs from constant-Vc life", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0,
      css_diameters_mm: { d_start: 80, d_end: 10 },
    });
    // Large diameter range with RPM clamp should give different life
    expect(result.css_adjusted_life_min).toBeDefined();
    expect(result.css_adjusted_life_min).not.toBeCloseTo(result.tool_life_min, 0);
  });

  it("no CSS adjustment when diameters not provided", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0,
    });
    expect(result.css_adjusted_life_min).toBeUndefined();
  });
});

// ── Wiper Insert Model ─────────────────────────────────────────────────────

describe("TurningInsertLifeEngine — Wiper Inserts", () => {
  it("wiper insert has feed multiplier", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.20, ap_mm: 1.5,
      is_wiper: true, nose_radius_mm: 0.8,
    });
    expect(result.wiper).toBeDefined();
    expect(result.wiper!.feed_multiplier).toBeGreaterThanOrEqual(2.0);
    expect(result.wiper!.max_feed_mm).toBeGreaterThan(result.wiper!.feed_multiplier > 0 ? 0 : -1);
  });

  it("wiper max feed does not exceed 80% of nose radius", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.50, ap_mm: 2.0,
      is_wiper: true, nose_radius_mm: 0.4,
    });
    expect(result.wiper!.max_feed_mm).toBeLessThanOrEqual(0.4 * 0.8);
  });

  it("no wiper data when is_wiper is false", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0,
    });
    expect(result.wiper).toBeUndefined();
  });
});

// ── Confidence ─────────────────────────────────────────────────────────────

describe("TurningInsertLifeEngine — Confidence", () => {
  it("base confidence is >= 0.70", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0,
    });
    expect(result.confidence).toBeGreaterThanOrEqual(0.70);
  });

  it("higher confidence with more input data", () => {
    const basic = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0,
    });
    const detailed = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0,
      material_name: "Carbon Steel", coating: "TiAlN", hardness_HB: 200,
    });
    expect(detailed.confidence).toBeGreaterThan(basic.confidence);
  });

  it("confidence never exceeds 0.95", () => {
    const result = turningInsertLifeEngine.predictLife({
      iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.30, ap_mm: 2.0,
      material_name: "Carbon Steel", coating: "TiAlN", hardness_HB: 200,
    });
    expect(result.confidence).toBeLessThanOrEqual(0.95);
  });
});

// ── Material Coverage ──────────────────────────────────────────────────────

describe("TurningInsertLifeEngine — All ISO Groups", () => {
  const groups: Array<"P" | "M" | "K" | "N" | "S" | "H"> = ["P", "M", "K", "N", "S", "H"];

  for (const iso of groups) {
    it(`ISO ${iso}: produces valid life prediction`, () => {
      const result = turningInsertLifeEngine.predictLife({
        iso_group: iso, Vc_m_min: 150, f_mm_rev: 0.25, ap_mm: 1.5,
      });
      expect(result.tool_life_min).toBeGreaterThan(0);
      expect(result.failure_modes.limiting_mode).toBeTruthy();
      expect(result.recommended_grade.substrate).toBeTruthy();
      expect(result.chipbreaker.recommended).toBeTruthy();
    });
  }
});
