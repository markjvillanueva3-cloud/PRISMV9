/**
 * Tests for AdvancedChipThicknessEngine and EngagementGeometryEngine
 * Sources: SolidCAM iMachining research, Machining Data Handbook, Sandvik
 */
import { describe, it, expect } from "vitest";
import { AdvancedChipThicknessEngine } from "../engines/AdvancedChipThicknessEngine.js";
import { EngagementGeometryEngine } from "../engines/EngagementGeometryEngine.js";

const chip = new AdvancedChipThicknessEngine();
const eng = new EngagementGeometryEngine();

// ── AdvancedChipThicknessEngine ──────────────────────────────────────

describe("AdvancedChipThicknessEngine", () => {
  describe("chipThinningFactorLookup", () => {
    it("returns 2.30 at 5% WOC", () => {
      expect(chip.chipThinningFactorLookup(0.5, 10)).toBe(2.30);
    });
    it("returns 1.00 at 50% WOC (baseline)", () => {
      expect(chip.chipThinningFactorLookup(5, 10)).toBe(1.00);
    });
    it("returns 0.85 at full slotting", () => {
      expect(chip.chipThinningFactorLookup(10, 10)).toBe(0.85);
    });
    it("interpolates between table values", () => {
      const f = chip.chipThinningFactorLookup(1.5, 10); // 15% WOC
      expect(f).toBe(1.45);
    });
    it("clamps below minimum ratio", () => {
      const f = chip.chipThinningFactorLookup(0.01, 10); // 0.1% WOC
      expect(f).toBe(2.30);
    });
  });

  describe("chipThinningFactorTheoretical", () => {
    it("returns 1.0 at 50%+ WOC", () => {
      expect(chip.chipThinningFactorTheoretical(6, 10)).toBe(1.0);
    });
    it("returns sqrt-based factor below 50%", () => {
      // 10% WOC: 1/sqrt(0.1) ≈ 3.16 → capped at 2.5
      expect(chip.chipThinningFactorTheoretical(1, 10)).toBe(2.5);
    });
    it("returns ~1.41 at 25% WOC", () => {
      const f = chip.chipThinningFactorTheoretical(2.5, 10); // 1/sqrt(0.25) = 2
      expect(f).toBeCloseTo(2.0, 1);
    });
  });

  describe("maxChipThickness", () => {
    it("h_ex = fz * sin(engAngle)", () => {
      const h = chip.maxChipThickness(0.1, Math.PI / 2);
      expect(h).toBeCloseTo(0.1, 4);
    });
    it("reduces for smaller engagement", () => {
      const h = chip.maxChipThickness(0.1, Math.PI / 6); // 30 deg
      expect(h).toBeCloseTo(0.05, 3);
    });
  });

  describe("avgChipThickness", () => {
    it("h_m = fz * sin(kappa) * sqrt(ae/Dc)", () => {
      const h = chip.avgChipThickness(0.1, 5, 10, Math.PI / 2);
      expect(h).toBeCloseTo(0.0707, 3);
    });
    it("reduces with entering angle < 90 deg", () => {
      const k60 = (60 * Math.PI) / 180;
      const h = chip.avgChipThickness(0.1, 5, 10, k60);
      expect(h).toBeLessThan(0.0707);
    });
  });

  describe("chipThicknessAlongHelix", () => {
    it("returns fz*sin(phi) when helix=0", () => {
      const h = chip.chipThicknessAlongHelix(0.1, Math.PI / 2, 0, 5, 0);
      expect(h).toBeCloseTo(0.1, 4);
    });
    it("lags with helix angle and axial position", () => {
      const h0 = chip.chipThicknessAlongHelix(0.1, Math.PI / 2, 30, 5, 0);
      const h5 = chip.chipThicknessAlongHelix(0.1, Math.PI / 2, 30, 5, 5);
      expect(h0).toBeGreaterThan(h5);
    });
    it("returns 0 outside engagement arc", () => {
      const h = chip.chipThicknessAlongHelix(0.1, 0.01, 45, 5, 10);
      expect(h).toBe(0);
    });
  });

  describe("ballNoseChipThickness", () => {
    it("returns position-dependent chip data", () => {
      const r = chip.ballNoseChipThickness(0.1, 2, 3, 5);
      expect(r.position_data.length).toBeGreaterThan(0);
      expect(r.max_chip).toBeGreaterThan(0);
      expect(r.min_chip).toBeGreaterThan(0);
      expect(r.effective_average).toBeGreaterThan(0);
      expect(r.max_chip).toBeGreaterThanOrEqual(r.min_chip);
    });
    it("local diameter varies along ball", () => {
      const r = chip.ballNoseChipThickness(0.1, 1, 4, 5);
      const diameters = r.position_data.map(p => p.local_diameter);
      // Near tip: small diameter, increasing upward
      expect(diameters[diameters.length - 1]).toBeGreaterThan(diameters[0]);
    });
  });

  describe("roundInsertChipThickness", () => {
    it("returns effective entering angle", () => {
      const r = chip.roundInsertChipThickness(0.1, 2, 16);
      expect(r.effective_entering_angle_deg).toBeLessThan(90);
      expect(r.max_chip_thickness).toBeGreaterThan(0);
      expect(r.recommended_max_depth).toBe(4); // 0.25 * 16
    });
    it("warns above 60 deg entering angle", () => {
      const r = chip.roundInsertChipThickness(0.1, 8, 16);
      expect(r.warning).not.toBeNull();
      expect(r.warning).toContain("60 deg");
    });
    it("caps at 90 deg for deep cut", () => {
      const r = chip.roundInsertChipThickness(0.1, 10, 16);
      expect(r.effective_entering_angle_deg).toBe(90);
    });
  });

  describe("trochoidalVariableFeed", () => {
    it("increases feed at narrow width", () => {
      const r = chip.trochoidalVariableFeed(1000, 1, 4);
      expect(r.adjusted_feed).toBeGreaterThan(1000);
      expect(r.feed_factor).toBe(2.0); // sqrt(4) = 2
    });
    it("caps at 2x", () => {
      const r = chip.trochoidalVariableFeed(1000, 0.1, 10);
      expect(r.was_limited).toBe(true);
      expect(r.feed_factor).toBe(2.0);
    });
    it("returns 1x at full width", () => {
      const r = chip.trochoidalVariableFeed(1000, 4, 4);
      expect(r.feed_factor).toBe(1.0);
    });
  });

  describe("spiralCorrectionFactor", () => {
    it("detects slotting at center", () => {
      const r = chip.spiralCorrectionFactor(3, 5);
      expect(r.is_slotting).toBe(true);
      expect(r.factor).toBe(0);
    });
    it("returns correction factor for larger radius", () => {
      const r = chip.spiralCorrectionFactor(10, 5);
      // Fx = (20 - 10) / 20 = 0.5
      expect(r.factor).toBe(0.5);
      expect(r.is_slotting).toBe(false);
    });
  });

  describe("validateChipThickness", () => {
    it("detects TOO_THIN (rubbing)", () => {
      const r = chip.validateChipThickness(0.003, 0.02, 0.15);
      expect(r.min_status).toBe("TOO_THIN");
    });
    it("detects MARGINAL", () => {
      const r = chip.validateChipThickness(0.008, 0.02, 0.15);
      expect(r.min_status).toBe("MARGINAL");
    });
    it("detects TOO_THICK (breakage)", () => {
      const r = chip.validateChipThickness(0.2, 0.02, 0.15);
      expect(r.max_status).toBe("TOO_THICK");
    });
    it("optimal range produces no warnings", () => {
      const r = chip.validateChipThickness(0.08, 0.02, 0.15);
      expect(r.min_status).toBe("OPTIMAL");
      expect(r.max_status).toBe("OPTIMAL");
      expect(r.warnings).toHaveLength(0);
    });
  });

  describe("analyze (comprehensive)", () => {
    it("produces full analysis for typical milling", () => {
      const r = chip.analyze({
        feed_per_tooth: 0.1,
        radial_depth: 3,
        axial_depth: 10,
        tool_diameter: 12,
      });
      expect(r.max_chip_thickness).toBeGreaterThan(0);
      expect(r.avg_chip_thickness).toBeGreaterThan(0);
      expect(r.engagement_angle_deg).toBeGreaterThan(0);
      expect(r.engagement_ratio).toBeGreaterThan(0);
      expect(r.thinning_factor_theoretical).toBeGreaterThanOrEqual(1);
      expect(r.thinning_factor_empirical).toBeGreaterThanOrEqual(1);
      expect(r.teeth_in_cut).toBeGreaterThan(0);
      expect(r.adjusted_feed_per_tooth).toBeGreaterThan(0);
    });
    it("feed_can_be_increased when ae < 50% Dc", () => {
      const r = chip.analyze({
        feed_per_tooth: 0.1,
        radial_depth: 2,
        axial_depth: 10,
        tool_diameter: 12,
      });
      expect(r.feed_can_be_increased).toBe(true);
    });
    it("feed_can_be_increased is false at full slotting", () => {
      const r = chip.analyze({
        feed_per_tooth: 0.1,
        radial_depth: 12,
        axial_depth: 10,
        tool_diameter: 12,
      });
      expect(r.feed_can_be_increased).toBe(false);
    });
  });
});

// ── EngagementGeometryEngine ──────────────────────────────────────────

describe("EngagementGeometryEngine", () => {
  describe("classifyCorner", () => {
    it("classifies 90-deg internal corner", () => {
      const r = eng.classifyCorner(0, Math.PI / 2);
      expect(r.type).toBeDefined();
      expect(r.severity).toBeDefined();
    });
  });

  describe("internalCornerSpike", () => {
    it("spike factor > 1 for 90-deg turn", () => {
      const r = eng.internalCornerSpike(3, 12, Math.PI / 2);
      expect(r.spike_factor).toBeGreaterThan(1);
      expect(r.peak_engagement_deg).toBeGreaterThan(0);
    });
    it("corner radius reduces spike", () => {
      const noR = eng.internalCornerSpike(3, 12, Math.PI / 2, 0);
      const withR = eng.internalCornerSpike(3, 12, Math.PI / 2, 2);
      expect(withR.spike_factor).toBeLessThanOrEqual(noR.spike_factor);
    });
  });

  describe("externalCornerDrop", () => {
    it("peak engagement drops below nominal", () => {
      // Negative angle = external corner
      const r = eng.externalCornerDrop(3, 12, -Math.PI / 2);
      expect(r.spike_factor).toBeLessThan(1);
    });
  });

  describe("cornerFeedAdjustment", () => {
    it("reduces feed for internal corner", () => {
      const r = eng.cornerFeedAdjustment(1000, 3, 12, Math.PI / 2);
      expect(r.safe_feed).toBeLessThan(1000);
      expect(r.feed_factor).toBeLessThan(1);
    });
  });

  describe("curvedBoundaryEngagement", () => {
    it("convex boundary increases engagement", () => {
      const r = eng.curvedBoundaryEngagement(3, 12, 20);
      expect(r.effective_engagement_deg).toBeGreaterThan(0);
      expect(r.adjustment_factor).toBeDefined();
    });
    it("concave boundary decreases engagement", () => {
      const concave = eng.curvedBoundaryEngagement(3, 12, -20);
      const flat = eng.curvedBoundaryEngagement(3, 12, 1e6);
      // Concave should have lower engagement
      expect(concave.effective_engagement_deg).toBeLessThan(flat.effective_engagement_deg + 1);
    });
  });

  describe("trochoidalEngagementProfile", () => {
    it("returns profile stats", () => {
      const r = eng.trochoidalEngagementProfile(8, 2, 5, 12);
      expect(r.point_count).toBe(12);
      expect(r.max_engagement_deg).toBeGreaterThan(0);
      expect(r.min_engagement_deg).toBeGreaterThanOrEqual(0);
    });
  });

  describe("islandApproach", () => {
    it("detects engagement spike near island", () => {
      const r = eng.islandApproach(3, 12, 5, 10);
      expect(r).toBeDefined();
      expect(r.recommendation).toBeDefined();
    });
    it("no issue when far from island", () => {
      const r = eng.islandApproach(3, 12, 50, 10);
      expect(r.moating_required).toBe(false);
    });
  });

  describe("calculateMoat", () => {
    it("returns moat specs", () => {
      const targetRad = (40 * Math.PI) / 180;
      const r = eng.calculateMoat(12, targetRad, 10);
      expect(r.minimum_width).toBe(12);
      expect(r.optimal_width).toBeGreaterThan(12);
      expect(r.moat_center_radius).toBeGreaterThan(10);
    });
  });

  describe("validateEngagement", () => {
    it("OPTIMAL at 40 deg", () => {
      const r = eng.validateEngagement(40);
      expect(r.status).toBe("OPTIMAL");
    });
    it("TOO_LOW below 10 deg", () => {
      const r = eng.validateEngagement(5);
      expect(r.status).toBe("TOO_LOW");
    });
    it("TOO_HIGH above 80 deg", () => {
      const r = eng.validateEngagement(85);
      expect(r.status).toBe("TOO_HIGH");
    });
  });

  describe("findOptimalStepover", () => {
    it("returns stepover and engagement", () => {
      const r = eng.findOptimalStepover(12);
      expect(r.optimal_stepover).toBeGreaterThan(0);
      expect(r.optimal_stepover).toBeLessThan(12);
      expect(r.engagement_deg).toBeGreaterThan(0);
    });
    it("MRR priority gives larger stepover", () => {
      const mrr = eng.findOptimalStepover(12, { prioritize_mrr: true });
      const life = eng.findOptimalStepover(12, { prioritize_tool_life: true });
      expect(mrr.optimal_stepover).toBeGreaterThan(life.optimal_stepover);
    });
  });

  describe("stepoverFromEngagement", () => {
    it("50% WOC at 90 deg engagement", () => {
      const ae = eng.stepoverFromEngagement(Math.PI / 2, 12);
      expect(ae).toBeCloseTo(6, 0);
    });
  });

  describe("constantEngagementStepover", () => {
    it("adjusts for convex curvature", () => {
      const flat = eng.constantEngagementStepover(Math.PI / 4, 12, 0);
      const convex = eng.constantEngagementStepover(Math.PI / 4, 12, 0.1);
      expect(convex).toBeLessThan(flat);
    });
  });
});
