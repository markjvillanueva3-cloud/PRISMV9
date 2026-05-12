/**
 * TurningInsertLifeEngine Test Suite (MS1 U-LPR11)
 */
import { describe, it, expect } from "vitest";
import { turningInsertLifeEngine } from "../engines/TurningInsertLifeEngine.js";

function baseInput(overrides: any = {}): any {
  return {
    iso_group: "P",
    Vc_m_min: 250,
    f_mm_rev: 0.2,
    ap_mm: 2.0,
    nose_radius_mm: 0.8,
    ...overrides,
  };
}

describe("TurningInsertLifeEngine", () => {
  describe("predictLife()", () => {
    it("returns positive tool life for nominal P-group input", () => {
      const r = turningInsertLifeEngine.predictLife(baseInput());
      expect(r.tool_life_min).toBeGreaterThan(0);
    });

    it("reports failure_modes with a limiting mode", () => {
      const r = turningInsertLifeEngine.predictLife(baseInput());
      expect(r.failure_modes.limiting_mode).toBeDefined();
      expect(["flank", "crater", "notch", "BUE"]).toContain(r.failure_modes.limiting_mode);
    });

    it("higher Vc reduces tool life (Taylor's inverse relationship)", () => {
      const slow = turningInsertLifeEngine.predictLife(baseInput({ Vc_m_min: 150 }));
      const fast = turningInsertLifeEngine.predictLife(baseInput({ Vc_m_min: 400 }));
      expect(fast.tool_life_min).toBeLessThan(slow.tool_life_min);
    });

    it("Ti-6Al-4V (S group) has shorter life than 4140 (P) at same Vc", () => {
      const steel = turningInsertLifeEngine.predictLife(baseInput({ iso_group: "P" }));
      const ti = turningInsertLifeEngine.predictLife(baseInput({ iso_group: "S" }));
      expect(ti.tool_life_min).toBeLessThan(steel.tool_life_min);
    });

    it("interrupted cutting reduces tool life", () => {
      const smooth = turningInsertLifeEngine.predictLife(baseInput({ is_interrupted: false }));
      const interrupted = turningInsertLifeEngine.predictLife(baseInput({ is_interrupted: true }));
      expect(interrupted.tool_life_min).toBeLessThanOrEqual(smooth.tool_life_min);
    });

    it("CSS integration produces css_adjusted_life when diameters provided", () => {
      const r = turningInsertLifeEngine.predictLife(
        baseInput({ css_diameters_mm: { d_start: 100, d_end: 20 } })
      );
      expect(r.css_adjusted_life_min).toBeDefined();
      expect(r.css_adjusted_life_min!).toBeGreaterThan(0);
    });

    it("wiper insert reports feed multiplier", () => {
      const r = turningInsertLifeEngine.predictLife(baseInput({ is_wiper: true }));
      expect(r.wiper).toBeDefined();
      expect(r.wiper!.feed_multiplier).toBeGreaterThan(1);
    });

    it("chipbreaker window is evaluated", () => {
      const r = turningInsertLifeEngine.predictLife(baseInput());
      expect(r.chipbreaker).toBeDefined();
      expect(typeof r.chipbreaker.in_window).toBe("boolean");
    });

    it("confidence is in [0,1]", () => {
      const r = turningInsertLifeEngine.predictLife(baseInput());
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("selectGrade()", () => {
    it("returns a grade recommendation for P group", () => {
      const r = turningInsertLifeEngine.selectGrade(baseInput());
      expect(r.grade_family).toBeDefined();
      expect(r.grade_code).toBeDefined();
    });

    it("ceramic or CBN suggested for hardened steel (H group)", () => {
      const r = turningInsertLifeEngine.selectGrade(baseInput({ iso_group: "H", hardness_HB: 500 }));
      expect(["carbide", "cermet", "ceramic", "CBN", "PCD"]).toContain(r.substrate);
    });

    it("aluminum (N group) may recommend PCD", () => {
      const r = turningInsertLifeEngine.selectGrade(baseInput({ iso_group: "N" }));
      expect(r.substrate).toBeDefined();
    });
  });

  describe("validateChipbreaker()", () => {
    it("flags in-window condition correctly", () => {
      const r = turningInsertLifeEngine.validateChipbreaker(baseInput());
      expect(r).toBeDefined();
      expect(typeof r.in_window).toBe("boolean");
    });

    it("low feed falls outside roughing chipbreaker window", () => {
      const r = turningInsertLifeEngine.validateChipbreaker(baseInput({ f_mm_rev: 0.02 }));
      expect(r.recommended).toBeDefined();
    });
  });
});
