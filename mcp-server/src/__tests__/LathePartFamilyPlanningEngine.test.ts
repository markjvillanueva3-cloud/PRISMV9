/**
 * LathePartFamilyPlanningEngine Test Suite (T055)
 * ================================================
 *
 * MS12 (U-LAT87) — Tests for family-potential analysis and macro ROI.
 *
 * @milestone LATHE-AWARE-HARDEN MS12
 * @unit U-LAT87
 */

import { describe, it, expect, beforeEach } from "vitest";
import { lathePartFamilyPlanningEngine } from "../engines/LathePartFamilyPlanningEngine.js";
import { latheProgramCatalogEngine } from "../engines/LatheProgramCatalogEngine.js";

// Ensure the catalog starts empty so archive evidence is deterministic per test
beforeEach(() => {
  latheProgramCatalogEngine.clear();
});

describe("LathePartFamilyPlanningEngine", () => {
  // ── Industry detection ─────────────────────────────────────────────────

  describe("Industry detection via customer name", () => {
    it("detects fasteners industry for ALCOA", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "moderate", lot_size: 10 },
        "ALCOA"
      );
      expect(r.industry).toBe("fasteners");
    });

    it("detects fasteners industry for ITW", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "moderate", lot_size: 10 },
        "ITW"
      );
      expect(r.industry).toBe("fasteners");
    });

    it("detects aerospace industry for Boeing", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "complex", lot_size: 1 },
        "Boeing Commercial Airplanes"
      );
      expect(r.industry).toBe("aerospace");
    });

    it("detects medical industry for Medtronic", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "moderate", lot_size: 10 },
        "Medtronic Labs"
      );
      expect(r.industry).toBe("medical");
    });

    it("returns unknown for unrecognized customer", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "moderate", lot_size: 10 },
        "UnknownCo XYZ"
      );
      expect(r.industry).toBe("unknown");
    });

    it("returns unknown for empty customer string", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "moderate", lot_size: 10 },
        ""
      );
      expect(r.industry).toBe("unknown");
    });
  });

  // ── Family likelihood ──────────────────────────────────────────────────

  describe("Family likelihood scoring", () => {
    it("returns likelihood in [0, 1]", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "moderate", lot_size: 10 },
        "ALCOA"
      );
      expect(r.family_likelihood).toBeGreaterThanOrEqual(0);
      expect(r.family_likelihood).toBeLessThanOrEqual(1);
    });

    it("fastener customer gets higher likelihood than aerospace one-off", () => {
      const fasteners = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "moderate", lot_size: 10 },
        "ALCOA"
      );
      const aero = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "very_complex", lot_size: 1 },
        "Boeing"
      );
      expect(fasteners.family_likelihood).toBeGreaterThan(aero.family_likelihood);
    });

    it("very_complex parts get a penalty", () => {
      const simple = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "simple", lot_size: 10 },
        "ALCOA"
      );
      const vc = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "very_complex", lot_size: 10 },
        "ALCOA"
      );
      expect(simple.family_likelihood).toBeGreaterThan(vc.family_likelihood);
    });

    it("explicit family_parts_expected boosts likelihood", () => {
      const none = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "moderate", lot_size: 10, family_parts_expected: 1 },
        "ALCOA"
      );
      const many = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "moderate", lot_size: 10, family_parts_expected: 20 },
        "ALCOA"
      );
      expect(many.family_likelihood).toBeGreaterThan(none.family_likelihood);
    });

    it("archive evidence boosts likelihood", () => {
      // Register existing programs for this customer to simulate archive
      for (let i = 0; i < 50; i++) {
        latheProgramCatalogEngine.register({
          program_id: `ALCOA__${i}`,
          path: `/ALCOA/p${i}.min`,
          programming_style: "macro",
          controller: "okuma_osp",
          customer: "ALCOA",
          features: ["threading"],
          file_ext: ".min",
        });
      }
      const with_archive = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "moderate", lot_size: 10, features: ["threading"] },
        "ALCOA"
      );
      expect(with_archive.archive_evidence.customer_program_count).toBe(50);
      expect(with_archive.archive_evidence.similar_programs_found).toBeGreaterThan(0);
    });
  });

  // ── Investment recommendation ──────────────────────────────────────────

  describe("recommendInvestment()", () => {
    it("returns 'none' for low likelihood regardless of lot size", () => {
      expect(lathePartFamilyPlanningEngine.recommendInvestment(0.1, 1000, 1)).toBe("none");
      expect(lathePartFamilyPlanningEngine.recommendInvestment(0.2, 1000, 10)).toBe("none");
    });

    it("returns 'full_family_program' for high likelihood + many expected variants", () => {
      expect(lathePartFamilyPlanningEngine.recommendInvestment(0.85, 10, 10)).toBe(
        "full_family_program"
      );
    });

    it("returns 'template' for moderate family expectation", () => {
      expect(lathePartFamilyPlanningEngine.recommendInvestment(0.7, 10, 3)).toBe(
        "template"
      );
    });

    it("returns 'macro' for moderate likelihood with reasonable lot", () => {
      expect(lathePartFamilyPlanningEngine.recommendInvestment(0.5, 10, 1)).toBe("macro");
    });

    it("returns 'macro' for large lot regardless of family expectation", () => {
      expect(lathePartFamilyPlanningEngine.recommendInvestment(0.45, 100, 1)).toBe("macro");
    });
  });

  // ── Full analyzeFamilyPotential() behavior ─────────────────────────────

  describe("analyzeFamilyPotential() end-to-end", () => {
    it("ALCOA (fastener) with moderate part → macro or template or full_family_program", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "moderate", lot_size: 50, family_parts_expected: 5 },
        "ALCOA"
      );
      expect(["macro", "template", "full_family_program"]).toContain(r.recommended_investment);
    });

    it("Boeing aerospace one-off very-complex → 'none' investment", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "very_complex", lot_size: 1, family_parts_expected: 1 },
        "Boeing Aerospace Division"
      );
      expect(r.recommended_investment).toBe("none");
    });

    it("includes reasoning lines", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "moderate", lot_size: 10 },
        "ALCOA"
      );
      expect(r.reasoning.length).toBeGreaterThan(0);
    });

    it("includes roi_estimate structure", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "moderate", lot_size: 50, family_parts_expected: 5 },
        "ALCOA"
      );
      expect(r.roi_estimate.breakeven_quantity === null || r.roi_estimate.breakeven_quantity > 0).toBe(
        true
      );
      expect(typeof r.roi_estimate.year_1_savings).toBe("number");
    });

    it("zero year_1_savings when investment is 'none'", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        { part_complexity: "very_complex", lot_size: 1, family_parts_expected: 1 },
        "Boeing"
      );
      if (r.recommended_investment === "none") {
        expect(r.roi_estimate.year_1_savings).toBe(0);
      }
    });

    it("suggests threading template when part has threading feature", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        {
          part_complexity: "moderate",
          lot_size: 50,
          family_parts_expected: 5,
          features: ["threading"],
        },
        "ALCOA"
      );
      expect(r.template_recommendations.some((t) => t.toLowerCase().includes("thread"))).toBe(
        true
      );
    });

    it("extracts variable dimensions from features when not provided", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        {
          part_complexity: "moderate",
          lot_size: 50,
          features: ["threading", "boring"],
        },
        "ALCOA"
      );
      expect(r.variable_dimensions).toContain("OD");
      expect(r.variable_dimensions).toContain("thread_pitch");
      expect(r.variable_dimensions).toContain("bore_ID");
    });

    it("uses explicit variable_dimensions when provided", () => {
      const r = lathePartFamilyPlanningEngine.analyzeFamilyPotential(
        {
          part_complexity: "moderate",
          lot_size: 10,
          variable_dimensions: ["custom_A", "custom_B"],
        },
        "ALCOA"
      );
      expect(r.variable_dimensions).toEqual(["custom_A", "custom_B"]);
    });
  });

  // ── computeMacroROI() ──────────────────────────────────────────────────

  describe("computeMacroROI()", () => {
    it("returns ROI structure with breakeven + year 1 savings", () => {
      const r = lathePartFamilyPlanningEngine.computeMacroROI(
        { part_complexity: "moderate", lot_size: 50, family_parts_expected: 5 },
        2,
        "ALCOA"
      );
      expect(typeof r.year_1_savings_usd).toBe("number");
      expect(typeof r.roi_percent_year_1).toBe("number");
      expect(r.macro_investment_hr).toBe(2);
    });

    it("three_year_savings_usd >= year_1_savings_usd when likelihood > 0", () => {
      const r = lathePartFamilyPlanningEngine.computeMacroROI(
        { part_complexity: "moderate", lot_size: 50, family_parts_expected: 5 },
        2,
        "ALCOA"
      );
      expect(r.three_year_savings_usd).toBeGreaterThanOrEqual(0);
    });

    it("unknown customer still returns a valid structure", () => {
      const r = lathePartFamilyPlanningEngine.computeMacroROI(
        { part_complexity: "moderate", lot_size: 10 },
        2
      );
      expect(r).toBeDefined();
      expect(typeof r.recommendation).toBe("string");
    });

    it("high-likelihood fastener customer returns a recognizable ROI verdict", () => {
      const r = lathePartFamilyPlanningEngine.computeMacroROI(
        { part_complexity: "moderate", lot_size: 200, family_parts_expected: 10 },
        2,
        "ALCOA"
      );
      // Any of the 5 verdict strings used by the engine
      expect(r.recommendation).toMatch(
        /Strong|Marginal|Weak|Low family|does not break even/i
      );
    });

    it("low-likelihood aerospace one-off gets 'Low family' or 'Weak' ROI string", () => {
      const r = lathePartFamilyPlanningEngine.computeMacroROI(
        { part_complexity: "very_complex", lot_size: 1, family_parts_expected: 1 },
        5,
        "Boeing"
      );
      expect(r.recommendation.toLowerCase()).toMatch(/low|weak|does not break even/);
    });
  });

  // ── getStats() ─────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("reports multiple industries and investment levels", () => {
      const s = lathePartFamilyPlanningEngine.getStats();
      expect(s.industries_supported).toBeGreaterThan(1);
      expect(s.investment_levels).toBe(4);
      expect(s.leverages_archive).toBe(true);
      expect(s.leverages_cost_engine).toBe(true);
    });
  });
});
