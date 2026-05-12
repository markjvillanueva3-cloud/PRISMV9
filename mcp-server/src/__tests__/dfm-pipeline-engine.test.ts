/**
 * Tests for DFMPipelineEngine — unified DFM analysis pipeline
 *
 * Coverage: pipeline orchestration, new rules (undercut, thread, corner, draft, material),
 * tolerance feasibility (Cpk), tolerance stack-up (linear + RSS), cost impact, deduplication,
 * quick check, edge cases.
 */

import { describe, it, expect } from "vitest";
import { dfmPipelineEngine } from "../engines/DFMPipelineEngine.js";
import type {
  DFMPipelineInput,
  DFMPipelineResult,
  ToleranceStackInput,
} from "../engines/DFMPipelineEngine.js";

// ============================================================================
// Helpers
// ============================================================================

function makeInput(overrides: Partial<DFMPipelineInput> = {}): DFMPipelineInput {
  return {
    part_name: "Test Bracket",
    features: [
      {
        id: "f1",
        type: "pocket",
        count: 1,
        dimensions: { length_mm: 50, width_mm: 20, depth_mm: 15 },
        tolerance_mm: 0.05,
        surface_finish_Ra: 1.6,
        wall_thickness_mm: 3,
        corner_radius_mm: 3,
      },
      {
        id: "f2",
        type: "hole",
        count: 4,
        dimensions: { diameter_mm: 8, depth_mm: 20 },
        tolerance_mm: 0.02,
      },
    ],
    material: "6061-T6",
    iso_group: "N",
    machine_type: "3axis",
    ...overrides,
  };
}

// ============================================================================
// Full Pipeline
// ============================================================================

describe("DFMPipelineEngine", () => {
  describe("analyze() — full pipeline", () => {
    it("should return structured result with all required fields", async () => {
      const result = await dfmPipelineEngine.analyze(makeInput());

      expect(result.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_score).toBeLessThanOrEqual(100);
      expect(["excellent", "good", "marginal", "difficult"]).toContain(result.manufacturability);
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.tolerance_feasibility)).toBe(true);
      expect(result.engines_used).toContain("DFMPipelineEngine");
      expect(result.summary.features_analyzed).toBe(2);
      expect(typeof result.recommended_process).toBe("string");
      expect(typeof result.total_cost_impact_usd).toBe("number");
    });

    it("should use DFMFeedbackEngine for feature-level scoring", async () => {
      const result = await dfmPipelineEngine.analyze(makeInput());
      expect(result.engines_used).toContain("DFMFeedbackEngine");
    });

    it("should use DfMRulesEngine for structural rules", async () => {
      const result = await dfmPipelineEngine.analyze(makeInput());
      expect(result.engines_used).toContain("DfMRulesEngine");
    });

    it("should sort issues by severity then cost impact", async () => {
      const input = makeInput({
        features: [
          { id: "w1", type: "wall", count: 1, wall_thickness_mm: 0.3 },   // critical
          { id: "w2", type: "wall", count: 1, wall_thickness_mm: 1.5 },   // warning
          { id: "h1", type: "hole", count: 1, dimensions: { diameter_mm: 5, depth_mm: 10 }, tolerance_mm: 0.003 }, // tight tol
        ],
      });
      const result = await dfmPipelineEngine.analyze(input);

      // Critical issues should come first
      const severities = result.issues.map(i => i.severity);
      const critIdx = severities.indexOf("critical");
      const warnIdx = severities.indexOf("warning");
      if (critIdx >= 0 && warnIdx >= 0) {
        expect(critIdx).toBeLessThan(warnIdx);
      }
    });

    it("should produce tolerance_feasibility for features with tolerances", async () => {
      const result = await dfmPipelineEngine.analyze(makeInput());
      expect(result.tolerance_feasibility.length).toBeGreaterThan(0);
      for (const tf of result.tolerance_feasibility) {
        expect(tf.specified_tolerance_mm).toBeGreaterThan(0);
        expect(tf.required_cpk).toBeGreaterThanOrEqual(1.33);
        expect(typeof tf.recommended_process).toBe("string");
        expect(typeof tf.feasible).toBe("boolean");
        expect(["standard", "precision", "ultra_precision"]).toContain(tf.cost_tier);
      }
    });

    it("should estimate cost impact on all issues", async () => {
      const input = makeInput({
        features: [
          { id: "w1", type: "wall", count: 1, wall_thickness_mm: 0.3 }, // triggers critical
        ],
      });
      const result = await dfmPipelineEngine.analyze(input);
      const issuesWithCost = result.issues.filter(i => i.cost_impact_usd !== undefined && i.cost_impact_usd > 0);
      expect(issuesWithCost.length).toBeGreaterThan(0);
    });

    // ── Session 6-4 spec test: 0.3mm wall + 8:1 depth + ±0.005mm tol → 3+ critical ──
    it("should flag ≥3 critical issues for extreme DFM scenario", async () => {
      const input = makeInput({
        features: [
          { id: "wall", type: "wall", count: 1, wall_thickness_mm: 0.3 },
          { id: "pocket", type: "pocket", count: 1, dimensions: { width_mm: 5, depth_mm: 40 }, corner_radius_mm: 0.5 },
          { id: "hole", type: "hole", count: 1, dimensions: { diameter_mm: 3, depth_mm: 3 }, tolerance_mm: 0.005 },
        ],
        iso_group: "P",
      });
      const result = await dfmPipelineEngine.analyze(input);
      const criticals = result.issues.filter(i => i.severity === "critical");
      expect(criticals.length).toBeGreaterThanOrEqual(3);
      expect(result.total_cost_impact_usd).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // New Rules
  // ============================================================================

  describe("new rules — undercut detection", () => {
    it("should flag undercut with depth/width > 2:1 as critical", async () => {
      const input = makeInput({
        features: [
          { id: "uc1", type: "undercut", count: 1, dimensions: { width_mm: 5, depth_mm: 12 } },
        ],
      });
      const result = await dfmPipelineEngine.analyze(input);
      const ucIssues = result.issues.filter(i => i.category === "undercut_depth");
      expect(ucIssues.length).toBeGreaterThanOrEqual(1);
      expect(ucIssues[0].severity).toBe("critical");
    });

    it("should warn for undercut depth/width between 1.5:1 and 2:1", async () => {
      const input = makeInput({
        features: [
          { id: "uc2", type: "undercut", count: 1, dimensions: { width_mm: 10, depth_mm: 17 } },
        ],
      });
      const result = await dfmPipelineEngine.analyze(input);
      const ucIssues = result.issues.filter(i => i.category === "undercut_depth");
      expect(ucIssues.length).toBeGreaterThanOrEqual(1);
      expect(ucIssues[0].severity).toBe("warning");
    });
  });

  describe("new rules — thread depth ratio", () => {
    it("should flag blind thread depth > 3× nominal as critical", async () => {
      const input = makeInput({
        features: [
          {
            id: "t1", type: "thread", count: 1,
            thread_nominal_mm: 6, thread_pitch_mm: 1,
            dimensions: { depth_mm: 24 }, // 24/6 = 4:1 > 3:1 limit
            is_blind: true,
          },
        ],
      });
      const result = await dfmPipelineEngine.analyze(input);
      const threadIssues = result.issues.filter(i => i.category === "thread_depth");
      expect(threadIssues.length).toBeGreaterThanOrEqual(1);
      expect(threadIssues[0].severity).toBe("critical");
      expect(threadIssues[0].physics_basis).toContain("Machinery's Handbook");
    });

    it("should flag thread below M2 minimum with tap breakage warning", async () => {
      const input = makeInput({
        features: [
          { id: "t2", type: "thread", count: 1, thread_nominal_mm: 1.6, dimensions: { depth_mm: 3 } },
        ],
      });
      const result = await dfmPipelineEngine.analyze(input);
      const sizeIssues = result.issues.filter(i => i.category === "thread_size");
      expect(sizeIssues.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("new rules — stress concentration", () => {
    it("should flag internal corner with Kt > 3 (Peterson's)", async () => {
      const input = makeInput({
        features: [
          {
            id: "sc1", type: "pocket", count: 1,
            dimensions: { depth_mm: 20 },
            corner_radius_mm: 0.5, // Kt = 1 + 2×sqrt(20/0.5) = 1 + 2×6.32 = 13.6
          },
        ],
      });
      const result = await dfmPipelineEngine.analyze(input);
      const stressIssues = result.issues.filter(i => i.category === "stress_concentration");
      expect(stressIssues.length).toBeGreaterThanOrEqual(1);
      expect(stressIssues[0].physics_basis).toContain("Peterson");
    });
  });

  describe("new rules — draft angle (injection mold)", () => {
    it("should flag insufficient draft angle for mold features", async () => {
      const input = makeInput({
        is_injection_mold: true,
        features: [
          { id: "d1", type: "wall", count: 1, draft_angle_deg: 0.2, dimensions: { depth_mm: 30 } },
        ],
      });
      const result = await dfmPipelineEngine.analyze(input);
      const draftIssues = result.issues.filter(i => i.category === "draft_angle");
      expect(draftIssues.length).toBeGreaterThanOrEqual(1);
      expect(draftIssues[0].message.toLowerCase()).toContain("draft");
    });

    it("should not flag draft for non-mold parts", async () => {
      const input = makeInput({
        is_injection_mold: false,
        features: [
          { id: "d2", type: "wall", count: 1, draft_angle_deg: 0.2, dimensions: { depth_mm: 30 } },
        ],
      });
      const result = await dfmPipelineEngine.analyze(input);
      const draftIssues = result.issues.filter(i => i.category === "draft_angle");
      expect(draftIssues.length).toBe(0);
    });
  });

  describe("new rules — material-specific DFM", () => {
    it("should flag thin wall for ISO S (Ti/superalloy) with 3× deflection multiplier", async () => {
      const input = makeInput({
        iso_group: "S",
        features: [
          { id: "ms1", type: "wall", count: 1, wall_thickness_mm: 2.0 }, // below 2.5mm min for S
        ],
      });
      const result = await dfmPipelineEngine.analyze(input);
      const matWallIssues = result.issues.filter(i => i.category === "material_wall_thickness");
      expect(matWallIssues.length).toBeGreaterThanOrEqual(1);
      expect(matWallIssues[0].message).toContain("3");
    });

    it("should flag tight corner for ISO H (hardened steel)", async () => {
      const input = makeInput({
        iso_group: "H",
        features: [
          { id: "ms2", type: "pocket", count: 1, corner_radius_mm: 1.0, dimensions: { depth_mm: 5 } }, // below 2.0mm min for H
        ],
      });
      const result = await dfmPipelineEngine.analyze(input);
      const matCornerIssues = result.issues.filter(i => i.category === "material_corner_radius");
      expect(matCornerIssues.length).toBeGreaterThanOrEqual(1);
      expect(matCornerIssues[0].message).toContain("ISO H");
    });
  });

  // ============================================================================
  // Tolerance Feasibility (Cpk)
  // ============================================================================

  describe("checkProcessCapability()", () => {
    it("should return standard tier for 0.05mm tolerance", () => {
      const result = dfmPipelineEngine.checkProcessCapability(0.05);
      expect(result.feasible).toBe(true);
      expect(result.cost_tier).toBe("standard");
      expect(result.achievable_cpk).toBeGreaterThanOrEqual(1.33);
    });

    it("should return precision tier for 0.01mm tolerance", () => {
      const result = dfmPipelineEngine.checkProcessCapability(0.01);
      expect(result.feasible).toBe(true);
      expect(["precision", "ultra_precision"]).toContain(result.cost_tier);
    });

    it("should return ultra_precision for sub-micron tolerance", () => {
      const result = dfmPipelineEngine.checkProcessCapability(0.001);
      expect(result.feasible).toBe(true);
      expect(result.cost_tier).toBe("ultra_precision");
    });
  });

  // ============================================================================
  // Tolerance Stack-up
  // ============================================================================

  describe("toleranceStack()", () => {
    it("should compute linear (worst-case) stack correctly", () => {
      const input: ToleranceStackInput = {
        dimensions: [
          { name: "shaft_length", nominal_mm: 50, tolerance_mm: 0.05 },
          { name: "bearing_width", nominal_mm: 20, tolerance_mm: 0.02 },
          { name: "spacer", nominal_mm: 10, tolerance_mm: 0.03 },
        ],
        method: "linear",
      };
      const result = dfmPipelineEngine.toleranceStack(input);
      expect(result.method).toBe("linear");
      expect(result.total_nominal_mm).toBe(80);
      expect(result.worst_case_tolerance_mm).toBe(0.1); // 0.05 + 0.02 + 0.03
      expect(result.effective_tolerance_mm).toBe(0.1);
      expect(result.contributors.length).toBe(3);
      // Largest contributor should have highest pct
      const sorted = [...result.contributors].sort((a, b) => b.pct_of_total - a.pct_of_total);
      expect(sorted[0].name).toBe("shaft_length");
    });

    it("should compute RSS stack correctly", () => {
      const input: ToleranceStackInput = {
        dimensions: [
          { name: "a", nominal_mm: 30, tolerance_mm: 0.03 },
          { name: "b", nominal_mm: 40, tolerance_mm: 0.04 },
        ],
        method: "rss",
      };
      const result = dfmPipelineEngine.toleranceStack(input);
      expect(result.method).toBe("rss");
      // RSS = sqrt(0.03² + 0.04²) = sqrt(0.0009 + 0.0016) = sqrt(0.0025) = 0.05
      expect(result.rss_tolerance_mm).toBe(0.05);
      expect(result.effective_tolerance_mm).toBe(0.05);
    });

    it("should evaluate assembly gap feasibility", () => {
      const input: ToleranceStackInput = {
        dimensions: [
          { name: "a", nominal_mm: 50, tolerance_mm: 0.1 },
          { name: "b", nominal_mm: 30, tolerance_mm: 0.08 },
        ],
        method: "linear",
        assembly_gap_requirement_mm: 0.1,
      };
      const result = dfmPipelineEngine.toleranceStack(input);
      // worst_case = 0.18mm, gap = 0.1mm → gap_min = 0.1 - 0.18 = -0.08 → NOT feasible
      expect(result.assembly_feasible).toBe(false);
      expect(result.gap_min_mm).toBeLessThan(0);
      expect(result.recommendation).toBeDefined();
    });

    it("should pass assembly feasibility when gap exceeds stack", () => {
      const input: ToleranceStackInput = {
        dimensions: [
          { name: "a", nominal_mm: 50, tolerance_mm: 0.01 },
          { name: "b", nominal_mm: 30, tolerance_mm: 0.01 },
        ],
        method: "linear",
        assembly_gap_requirement_mm: 0.1,
      };
      const result = dfmPipelineEngine.toleranceStack(input);
      expect(result.assembly_feasible).toBe(true);
    });

    it("should throw for empty dimensions array", () => {
      expect(() => dfmPipelineEngine.toleranceStack({
        dimensions: [],
        method: "linear",
      })).toThrow("At least one dimension required");
    });
  });

  // ============================================================================
  // Quick Check
  // ============================================================================

  describe("quickCheck()", () => {
    it("should return result without accessibility analysis", async () => {
      const input = makeInput({
        available_tools: [{ diameter_mm: 6, length_mm: 30 }],
      });
      const result = await dfmPipelineEngine.quickCheck(input);
      // Quick check strips tools, so AccessibilityAnalysisEngine should not run
      expect(result.engines_used).not.toContain("AccessibilityAnalysisEngine");
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("edge cases", () => {
    it("should handle empty features array", async () => {
      const result = await dfmPipelineEngine.analyze({ features: [] });
      expect(result.overall_score).toBe(100);
      expect(result.issues.length).toBe(0);
      expect(result.summary.features_analyzed).toBe(0);
    });

    it("should handle features with no dimensions", async () => {
      const result = await dfmPipelineEngine.analyze({
        features: [{ id: "bare", type: "pocket", count: 1 }],
      });
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
    });

    it("should handle missing iso_group gracefully (defaults to P)", async () => {
      const input = makeInput({ iso_group: undefined });
      const result = await dfmPipelineEngine.analyze(input);
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
    });

    it("should deduplicate issues across engines", async () => {
      // Thin wall triggers both DFMFeedbackEngine and the new material-specific rule
      const input = makeInput({
        iso_group: "S",
        features: [
          { id: "w1", type: "wall", count: 1, wall_thickness_mm: 0.3 },
        ],
      });
      const result = await dfmPipelineEngine.analyze(input);
      // Same category + feature_ref should be deduped to the more severe one
      const wallIssues = result.issues.filter(i =>
        i.feature_ref === "w1" && (i.category.includes("wall") || i.category.includes("thin")),
      );
      // We may have wall issues from different categories, but within same category, deduped
      for (const category of new Set(wallIssues.map(i => i.category))) {
        const sameCategory = wallIssues.filter(i => i.category === category);
        expect(sameCategory.length).toBeLessThanOrEqual(1);
      }
    });

    it("should report recommended process based on tolerance", async () => {
      const tightInput = makeInput({
        features: [
          { id: "t1", type: "bore", count: 1, tolerance_mm: 0.002, dimensions: { diameter_mm: 20 } },
        ],
      });
      const result = await dfmPipelineEngine.analyze(tightInput);
      expect(result.recommended_process).toContain("grinding");
    });
  });

  // ============================================================================
  // GD&T integration
  // ============================================================================

  describe("GD&T callout integration", () => {
    it("should produce tolerance feasibility for GD&T callouts", async () => {
      const input = makeInput({
        features: [
          {
            id: "gdt1", type: "bore", count: 1,
            dimensions: { diameter_mm: 25 },
            tolerance_mm: 0.02,
            gdt_callout: {
              symbol: "position",
              tolerance_mm: 0.05,
              datum_refs: ["A", "B"],
              material_condition: "MMC",
            },
          },
        ],
      });
      const result = await dfmPipelineEngine.analyze(input);
      // Should have at least 2 tolerance feasibility entries: one for tolerance_mm, one for GD&T
      const gdtFeasibility = result.tolerance_feasibility.filter(tf => tf.gdt_symbol);
      expect(gdtFeasibility.length).toBeGreaterThanOrEqual(1);
      expect(gdtFeasibility[0].gdt_symbol).toBe("position");
    });
  });
});
