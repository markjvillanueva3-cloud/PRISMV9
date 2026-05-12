/**
 * DfMRulesEngine Tests
 * Source: CNC Complete Engineering Guide, CNCCookbook guides
 */
import { describe, it, expect } from "vitest";
import {
  checkDfMRules,
  selectFaceMillGeometry,
  selectDeepHoleTechnique,
  estimateMachineCost,
  type DfMCheckInput,
  type DfMFeature,
} from "../engines/DfMRulesEngine.js";

// ============================================================================
// checkDfMRules
// ============================================================================
describe("checkDfMRules", () => {
  it("passes with no features and default tolerance", () => {
    const result = checkDfMRules({});
    expect(result.pass).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.summary.total_features).toBe(0);
  });

  it("passes with features within recommended limits", () => {
    const input: DfMCheckInput = {
      material_type: "metal",
      tolerance_mm: 0.125,
      features: [
        { type: "wall", thickness_mm: 1.0 },
        { type: "hole", diameter_mm: 10, depth_mm: 30 },
        { type: "thread", thread_nominal_mm: 8, thread_length_mm: 16 },
      ],
    };
    const result = checkDfMRules(input);
    expect(result.pass).toBe(true);
    expect(result.violations.filter(v => v.severity === "error")).toHaveLength(0);
  });

  // --- Wall thickness ---
  it("errors on wall below feasible minimum (metal)", () => {
    const result = checkDfMRules({
      material_type: "metal",
      features: [{ type: "wall", thickness_mm: 0.3 }],
    });
    expect(result.pass).toBe(false);
    const err = result.violations.find(v => v.rule === "wall_below_feasible");
    expect(err).toBeDefined();
    expect(err!.severity).toBe("error");
  });

  it("warns on wall below recommended (metal)", () => {
    const result = checkDfMRules({
      material_type: "metal",
      features: [{ type: "wall", thickness_mm: 0.6 }],
    });
    expect(result.pass).toBe(true);
    expect(result.violations.find(v => v.rule === "wall_below_recommended")).toBeDefined();
  });

  it("uses plastic limits when material_type=plastic", () => {
    const result = checkDfMRules({
      material_type: "plastic",
      features: [{ type: "wall", thickness_mm: 1.2 }],
    });
    // 1.2mm is below plastic recommended (1.5) but above feasible (1.0)
    expect(result.pass).toBe(true);
    expect(result.violations.find(v => v.rule === "wall_below_recommended")).toBeDefined();
  });

  // --- Cavity depth ---
  it("warns when cavity depth exceeds 4× width", () => {
    const result = checkDfMRules({
      features: [{ type: "cavity", depth_mm: 50, width_mm: 10 }],
    });
    expect(result.violations.find(v => v.rule === "cavity_depth_exceeds_4x_width")).toBeDefined();
  });

  it("errors when cavity exceeds 250mm absolute max", () => {
    const result = checkDfMRules({
      features: [{ type: "cavity", depth_mm: 300 }],
    });
    expect(result.pass).toBe(false);
    expect(result.violations.find(v => v.rule === "cavity_exceeds_max_depth")).toBeDefined();
  });

  // --- Holes ---
  it("errors on hole L/D > 10", () => {
    const result = checkDfMRules({
      features: [{ type: "hole", diameter_mm: 5, depth_mm: 60 }],
    });
    expect(result.pass).toBe(false);
    expect(result.violations.find(v => v.rule === "hole_exceeds_10xD")).toBeDefined();
  });

  it("warns on hole L/D between 4 and 10", () => {
    const result = checkDfMRules({
      features: [{ type: "hole", diameter_mm: 10, depth_mm: 70 }],
    });
    expect(result.pass).toBe(true);
    expect(result.violations.find(v => v.rule === "hole_exceeds_4xD")).toBeDefined();
  });

  it("flags non-standard drill size as info", () => {
    const result = checkDfMRules({
      features: [{ type: "hole", diameter_mm: 7.3, depth_mm: 10, standard_drill_size: false }],
    });
    expect(result.violations.find(v => v.rule === "non_standard_drill_size")?.severity).toBe("info");
  });

  // --- Threads ---
  it("errors on thread below M2", () => {
    const result = checkDfMRules({
      features: [{ type: "thread", thread_nominal_mm: 1.5 }],
    });
    expect(result.pass).toBe(false);
    expect(result.violations.find(v => v.rule === "thread_below_M2")).toBeDefined();
  });

  it("warns on thread between M2 and M6", () => {
    const result = checkDfMRules({
      features: [{ type: "thread", thread_nominal_mm: 4 }],
    });
    expect(result.pass).toBe(true);
    expect(result.violations.find(v => v.rule === "thread_below_M6")).toBeDefined();
  });

  it("warns when thread length exceeds 3× nominal", () => {
    const result = checkDfMRules({
      features: [{ type: "thread", thread_nominal_mm: 8, thread_length_mm: 30 }],
    });
    expect(result.violations.find(v => v.rule === "thread_engagement_too_long")).toBeDefined();
  });

  // --- Undercuts ---
  it("errors on undercut narrower than 3mm", () => {
    const result = checkDfMRules({
      features: [{ type: "undercut", width_mm: 2 }],
    });
    expect(result.pass).toBe(false);
    expect(result.violations.find(v => v.rule === "undercut_too_narrow")).toBeDefined();
  });

  it("errors when undercut depth exceeds 2× width", () => {
    const result = checkDfMRules({
      features: [{ type: "undercut", width_mm: 10, depth_mm: 25 }],
    });
    expect(result.pass).toBe(false);
    expect(result.violations.find(v => v.rule === "undercut_depth_exceeds_2x_width")).toBeDefined();
  });

  // --- Tall features ---
  it("warns on tall feature aspect ratio > 4", () => {
    const result = checkDfMRules({
      features: [{ type: "tall_feature", height_mm: 50, width_mm: 10 }],
    });
    expect(result.violations.find(v => v.rule === "tall_feature_high_aspect")).toBeDefined();
  });

  // --- Small features ---
  it("errors on feature below 0.1mm", () => {
    const result = checkDfMRules({
      features: [{ type: "small_feature", width_mm: 0.05 }],
    });
    expect(result.pass).toBe(false);
    expect(result.violations.find(v => v.rule === "feature_below_micro_limit")).toBeDefined();
  });

  it("warns on feature between 0.1mm and 2.5mm", () => {
    const result = checkDfMRules({
      features: [{ type: "small_feature", width_mm: 1.0 }],
    });
    expect(result.violations.find(v => v.rule === "feature_micro_machining")).toBeDefined();
  });

  // --- Fillets ---
  it("warns when fillet radius < 1/3 × cavity depth", () => {
    const result = checkDfMRules({
      features: [{ type: "fillet", width_mm: 1.0, depth_mm: 30 }],
    });
    // min fillet = 30 * 1/3 = 10mm, but radius = 1.0mm
    expect(result.violations.find(v => v.rule === "fillet_too_small_for_cavity")).toBeDefined();
  });

  // --- Tolerance ---
  it("errors on tolerance below 0.025mm", () => {
    const result = checkDfMRules({ tolerance_mm: 0.01 });
    expect(result.pass).toBe(false);
    expect(result.violations.find(v => v.rule === "tolerance_below_feasible")).toBeDefined();
  });

  it("warns on tight tolerance (0.025-0.050mm)", () => {
    const result = checkDfMRules({ tolerance_mm: 0.035 });
    expect(result.pass).toBe(true);
    expect(result.violations.find(v => v.rule === "tolerance_tight")).toBeDefined();
  });

  // --- Summary ---
  it("counts errors/warnings/infos correctly", () => {
    const result = checkDfMRules({
      tolerance_mm: 0.01,
      features: [
        { type: "wall", thickness_mm: 0.3 },
        { type: "hole", diameter_mm: 5, depth_mm: 25, standard_drill_size: false },
      ],
    });
    expect(result.summary.errors).toBe(2); // tolerance + wall
    expect(result.summary.warnings).toBe(1); // hole 5×D
    expect(result.summary.infos).toBe(1); // non-standard drill
  });

  it("deduplicates design_rules_applied", () => {
    const result = checkDfMRules({
      features: [
        { type: "wall", thickness_mm: 1.0 },
        { type: "wall", thickness_mm: 0.3 },
      ],
    });
    expect(result.design_rules_applied.filter(r => r === "wall_thickness")).toHaveLength(1);
  });

  // --- Edge: missing dimensions ---
  it("skips wall check when thickness_mm is undefined", () => {
    const result = checkDfMRules({
      features: [{ type: "wall" }],
    });
    expect(result.violations).toHaveLength(0);
  });

  it("skips hole check when diameter or depth missing", () => {
    const result = checkDfMRules({
      features: [{ type: "hole", diameter_mm: 10 }],
    });
    expect(result.violations).toHaveLength(0);
  });
});

// ============================================================================
// selectFaceMillGeometry
// ============================================================================
describe("selectFaceMillGeometry", () => {
  it("recommends 45° for general purpose", () => {
    const result = selectFaceMillGeometry({});
    expect(result.recommended_angle).toBe(45);
    expect(result.mrr_advantage_pct).toBe(40);
  });

  it("recommends 90° for thin walls", () => {
    const result = selectFaceMillGeometry({ wall_thickness_mm: 3 });
    expect(result.recommended_angle).toBe(90);
    expect(result.mrr_advantage_pct).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("recommends button cutter for interrupted cuts in tough materials", () => {
    const result = selectFaceMillGeometry({
      is_interrupted_cut: true,
      workpiece_material: "Inconel 718",
    });
    expect(result.recommended_angle).toBe("button");
  });

  it("adds finish note when priority=finish", () => {
    const result = selectFaceMillGeometry({ priority: "finish" });
    expect(result.reasoning.some(r => r.includes("fly cutter"))).toBe(true);
  });

  it("adds interrupted cut warning for non-button angles", () => {
    const result = selectFaceMillGeometry({ is_interrupted_cut: true });
    expect(result.warnings.some(w => w.includes("50%"))).toBe(true);
  });
});

// ============================================================================
// selectDeepHoleTechnique
// ============================================================================
describe("selectDeepHoleTechnique", () => {
  it("standard drill for L/D < 5", () => {
    const result = selectDeepHoleTechnique({ hole_diameter_mm: 10, hole_depth_mm: 40 });
    expect(result.technique).toBe("standard_drill");
    expect(result.peck_required).toBe(false);
    expect(result.ld_ratio).toBe(4);
  });

  it("peck drilling for L/D 5-7", () => {
    const result = selectDeepHoleTechnique({ hole_diameter_mm: 10, hole_depth_mm: 60 });
    expect(result.technique).toBe("peck_drilling");
    expect(result.peck_required).toBe(true);
  });

  it("parabolic flute peck for L/D 7-10", () => {
    const result = selectDeepHoleTechnique({ hole_diameter_mm: 10, hole_depth_mm: 85 });
    expect(result.technique).toBe("parabolic_flute_peck");
    expect(result.parabolic_flute).toBe(true);
    expect(result.feed_reduction_pct).toBe(10);
  });

  it("custom cycle for L/D 10-20", () => {
    const result = selectDeepHoleTechnique({ hole_diameter_mm: 10, hole_depth_mm: 150 });
    expect(result.technique).toBe("parabolic_custom_cycle");
    expect(result.feed_reduction_pct).toBe(20);
  });

  it("gun drill for L/D > 20", () => {
    const result = selectDeepHoleTechnique({ hole_diameter_mm: 10, hole_depth_mm: 300 });
    expect(result.technique).toBe("gun_drill_bta");
    expect(result.gun_drill).toBe(true);
  });

  it("warns when L/D exceeds 400", () => {
    const result = selectDeepHoleTechnique({ hole_diameter_mm: 5, hole_depth_mm: 2500 });
    expect(result.notes.some(n => n.includes("exceeds gun drill limit"))).toBe(true);
  });

  it("recommends through-coolant when peck required without it", () => {
    const result = selectDeepHoleTechnique({
      hole_diameter_mm: 10, hole_depth_mm: 60, has_through_coolant: false,
    });
    expect(result.notes.some(n => n.includes("Through-spindle coolant"))).toBe(true);
  });

  it("warns about rubbing in work-hardening materials", () => {
    const result = selectDeepHoleTechnique({
      hole_diameter_mm: 10, hole_depth_mm: 40, material: "Stainless 316",
    });
    expect(result.notes.some(n => n.includes("Work-hardening"))).toBe(true);
  });
});

// ============================================================================
// estimateMachineCost
// ============================================================================
describe("estimateMachineCost", () => {
  it("returns 3-axis baseline cost", () => {
    const result = estimateMachineCost("3axis_mill");
    expect(result.cost_per_hour_usd).toBe(75);
    expect(result.relative_to_3axis).toBe("baseline");
  });

  it("returns 5-axis continuous at +100%", () => {
    const result = estimateMachineCost("5axis_continuous");
    expect(result.cost_per_hour_usd).toBe(150);
  });

  it("falls back to 3-axis for unknown type", () => {
    const result = estimateMachineCost("unknown_machine");
    expect(result.cost_per_hour_usd).toBe(75);
  });

  it("returns lathe at -15%", () => {
    const result = estimateMachineCost("lathe");
    expect(result.cost_per_hour_usd).toBe(65);
    expect(result.relative_to_3axis).toBe("-15%");
  });
});
