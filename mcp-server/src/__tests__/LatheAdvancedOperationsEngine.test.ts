/**
 * LatheAdvancedOperationsEngine.test.ts -- named companion test (slot:whiskey, 2026-07-01)
 * ============================================================================
 * Value-level coverage of the engine's own methods. The sibling files cover the
 * dispatcher surface (LatheAdvancedOpsDispatch = parity, LatheFormTurning = Kienzle
 * form force); THIS file locks the in-engine math and knowledge tables with real
 * reference values (R9): polygon speed ratios, constant-area threading pass
 * decomposition, groove multi-plunge/peck rules, eccentric method selection +
 * unbalance RPM cap, contour nose-radius/stepover, and live-tooling mode tables.
 */
import { describe, it, expect } from "vitest";
import { latheAdvancedOperationsEngine } from "../engines/LatheAdvancedOperationsEngine.js";

const eng = latheAdvancedOperationsEngine;

describe("getLiveToolingParams -- operation knowledge table", () => {
  it("cross_drilling: indexed spindle, 0.12 mm/rev feed, chuck-jaw collision warning", () => {
    const r = eng.getLiveToolingParams({ operation: "cross_drilling", live_tool_rpm: 2000, feature_depth_mm: 10 });
    expect(r.spindle_mode).toBe("index");
    expect(r.recommended_parameters.feed_mm_rev).toBe(0.12);
    expect(r.recommended_parameters.depth_per_pass_mm).toBe(1.5); // depth 10 >= 3 -> capped at 1.5
    expect(r.collision_warnings.join(" ")).toMatch(/chuck jaws/i);
  });

  it("cross_tapping: feed equals pitch (feature_depth carries the pitch) + rigid-tap requirement", () => {
    const r = eng.getLiveToolingParams({ operation: "cross_tapping", live_tool_rpm: 800, feature_depth_mm: 1.25 });
    expect(r.recommended_parameters.feed_mm_rev).toBe(1.25); // rigid tap: feed/rev = pitch, never a generic default
    expect(r.programming_notes.join(" ")).toMatch(/Match feed to pitch exactly/);
    expect(r.machine_requirements.join(" ")).toMatch(/Rigid tapping or floating holder/);
  });

  it("engraving: enforces the 8000 RPM floor and fine feed/step-down", () => {
    const r = eng.getLiveToolingParams({ operation: "engraving", live_tool_rpm: 3000, feature_depth_mm: 0.3 });
    expect(r.recommended_parameters.live_tool_rpm).toBe(8000); // max(3000, 8000)
    expect(r.recommended_parameters.feed_mm_rev).toBe(0.02);
    expect(r.recommended_parameters.depth_per_pass_mm).toBe(0.1);
    expect(r.spindle_mode).toBe("interpolate");
  });

  it("shallow feature keeps single-pass depth; deep feature caps at 1.5mm/pass", () => {
    // generic rule (no per-op override): depth < 3 passes through, else capped at 1.5
    const shallow = eng.getLiveToolingParams({ operation: "cross_drilling", live_tool_rpm: 2500, feature_depth_mm: 2 });
    const deep = eng.getLiveToolingParams({ operation: "flat_milling", live_tool_rpm: 2500, feature_depth_mm: 8 });
    expect(shallow.recommended_parameters.depth_per_pass_mm).toBe(2);
    expect(deep.recommended_parameters.depth_per_pass_mm).toBe(1.5);
    // keyway_milling overrides the generic rule with a fixed 0.5mm step-down
    const keyway = eng.getLiveToolingParams({ operation: "keyway_milling", live_tool_rpm: 2500, feature_depth_mm: 2 });
    expect(keyway.recommended_parameters.depth_per_pass_mm).toBe(0.5);
  });

  it("c_axis_milling: polar interpolation mode with 0.08 mm/rev feed and G12.1 note", () => {
    const r = eng.getLiveToolingParams({ operation: "c_axis_milling", live_tool_rpm: 3000, feature_depth_mm: 5 });
    expect(r.spindle_mode).toBe("interpolate");
    expect(r.recommended_parameters.feed_mm_rev).toBe(0.08);
    expect(r.programming_notes.join(" ")).toContain("G12.1");
  });

  it("PLAUSIBILITY GUARD: cross_tapping with a depth-like value (>6mm/rev) warns of tap-breaking feed", () => {
    const r = eng.getLiveToolingParams({ operation: "cross_tapping", live_tool_rpm: 800, feature_depth_mm: 10 });
    expect(r.collision_warnings.join(" ")).toMatch(/implausible as a pitch/i);
    const sane = eng.getLiveToolingParams({ operation: "cross_tapping", live_tool_rpm: 800, feature_depth_mm: 1.25 });
    expect(sane.collision_warnings.join(" ")).not.toMatch(/implausible as a pitch/i);
  });
});

describe("getPolygonTurningParams -- synchronized speed-ratio table", () => {
  it("hex in steel: ratio 5/6, spindle 300 RPM, live tool 360 RPM", () => {
    const r = eng.getPolygonTurningParams({ number_of_flats: 6, flat_width_mm: 16, part_diameter_mm: 20, material: "steel" });
    expect(r.feasible).toBe(true);
    expect(r.method).toBe("synchronized");
    expect(r.speed_ratio).toBeCloseTo(5 / 6, 10);
    expect(r.spindle_rpm).toBe(300);
    expect(r.live_tool_rpm).toBe(360); // round(300 / (5/6))
    expect(r.passes_required).toBe(4); // depth/flat = (20-16)/2 = 2mm -> ceil(2/0.5)
  });

  it("aluminum raises the base spindle speed (800 RPM -> 960 live-tool)", () => {
    const r = eng.getPolygonTurningParams({ number_of_flats: 6, flat_width_mm: 16, part_diameter_mm: 20, material: "6061 aluminum" });
    expect(r.spindle_rpm).toBe(800);
    expect(r.live_tool_rpm).toBe(960); // round(800 / (5/6))
  });

  it("FAIL-SAFE: unsupported flat count (7) is declared infeasible with alternatives, not guessed", () => {
    const r = eng.getPolygonTurningParams({ number_of_flats: 7, flat_width_mm: 16, part_diameter_mm: 20, material: "steel" });
    expect(r.feasible).toBe(false);
    expect(r.speed_ratio).toBe(0);
    expect(r.alternative_methods.join(" ")).toMatch(/Rotary broaching/i);
  });
});

describe("getAdvancedThreadingParams -- constant-area pass decomposition", () => {
  it("metric: depth = pitch * 0.6134 and constant-area first pass ~0.721mm", () => {
    const r = eng.getAdvancedThreadingParams({ thread_form: "metric", pitch_mm: 1.5, diameter_mm: 20, length_mm: 30 });
    expect(r.thread_depth_mm).toBeCloseTo(1.5 * 0.6134, 6); // 0.9201
    expect(r.infeed_method).toBe("modified_flank");
    // constant-area DOC: sqrt(2*0.15 / tan(30deg)) = 0.7208 -> rounded 0.721
    expect(r.doc_per_pass[0]).toBeCloseTo(0.721, 3);
    expect(r.doc_per_pass).toHaveLength(2);
    expect(r.total_passes).toBe(2); // single start
    expect(r.spindle_rpm).toBe(1500); // clamp ceiling
  });

  it("INVARIANT: pass depths are non-increasing and sum to the thread depth (0.02mm exit tail allowed)", () => {
    const r = eng.getAdvancedThreadingParams({ thread_form: "metric", pitch_mm: 2.5, diameter_mm: 30, length_mm: 40 });
    const sum = r.doc_per_pass.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(r.thread_depth_mm - 0.021 - 0.001 * r.doc_per_pass.length);
    expect(sum).toBeLessThan(r.thread_depth_mm + 0.001 * r.doc_per_pass.length);
    for (let i = 1; i < r.doc_per_pass.length; i++) {
      expect(r.doc_per_pass[i]).toBeLessThanOrEqual(r.doc_per_pass[i - 1] + 1e-9);
    }
  });

  it("multi-start: total passes multiply by starts and lead = pitch * starts is programmed", () => {
    const single = eng.getAdvancedThreadingParams({ thread_form: "metric", pitch_mm: 1.5, diameter_mm: 20, length_mm: 30 });
    const dual = eng.getAdvancedThreadingParams({ thread_form: "metric", pitch_mm: 1.5, diameter_mm: 20, length_mm: 30, starts: 2 });
    expect(dual.total_passes).toBe(single.total_passes * 2);
    expect(dual.programming_notes.join(" ")).toMatch(/2 starts, lead = 3mm/);
    expect(dual.programming_notes.join(" ")).toMatch(/Program lead \(not pitch\)/);
  });

  it("ACME: flank infeed, depth factor 0.5, trapezoid insert", () => {
    const r = eng.getAdvancedThreadingParams({ thread_form: "acme", pitch_mm: 4, diameter_mm: 25, length_mm: 50 });
    expect(r.infeed_method).toBe("flank");
    expect(r.thread_depth_mm).toBeCloseTo(2.0, 6); // 4 * 0.5
    expect(r.tool_selection.insert_type).toMatch(/trapezoid/i);
  });

  it("ADVERSARIAL: absurd explicit depth hits the 20-pass safety cap AND warns about the truncation", () => {
    const r = eng.getAdvancedThreadingParams({ thread_form: "metric", pitch_mm: 3, diameter_mm: 40, length_mm: 60, depth_mm: 20 });
    expect(r.doc_per_pass).toHaveLength(20); // loop guard: pass > 20 breaks
    expect(r.total_passes).toBe(20);
    // R12: the truncated remainder must be surfaced, never silent
    expect(r.programming_notes.join(" ")).toMatch(/truncated at the 20-pass safety cap/);
  });

  it("FAIL-LOUD: non-positive / non-finite pitch throws instead of returning a 0-pass plan", () => {
    const base = { thread_form: "metric" as const, diameter_mm: 20, length_mm: 30 };
    expect(() => eng.getAdvancedThreadingParams({ ...base, pitch_mm: 0 })).toThrow(/pitch_mm/);
    expect(() => eng.getAdvancedThreadingParams({ ...base, pitch_mm: -1.5 })).toThrow(/pitch_mm/);
    expect(() => eng.getAdvancedThreadingParams({ ...base, pitch_mm: NaN })).toThrow(/pitch_mm/);
    expect(() => eng.getAdvancedThreadingParams({ ...base, pitch_mm: 1.5, depth_mm: -2 })).toThrow(/depth_mm/);
  });
});

describe("getGroovingParams -- plunge decomposition + groove-type table", () => {
  it("wide groove (10mm) decomposes into 4 plunges with a 3mm tool", () => {
    const r = eng.getGroovingParams({ groove_type: "od_groove", width_mm: 10, depth_mm: 3, diameter_mm: 50, material: "steel" });
    expect(r.tool_width_mm).toBe(3); // min(3, width/2)
    expect(r.number_of_plunges).toBe(4); // ceil(10/3)
    expect(r.pecking_recommended).toBe(false); // 3 <= 2*10
  });

  it("deep narrow groove triggers pecking at depth/3", () => {
    const r = eng.getGroovingParams({ groove_type: "od_groove", width_mm: 2, depth_mm: 5, diameter_mm: 40, material: "steel" });
    expect(r.pecking_recommended).toBe(true); // 5 > 2*2
    expect(r.peck_depth_mm).toBeCloseTo(5 / 3, 6);
  });

  it("o_ring groove: tool width capped at the AS568 gland width (1.78mm) with fine 0.03 feed", () => {
    const r = eng.getGroovingParams({ groove_type: "o_ring", width_mm: 2, depth_mm: 1, diameter_mm: 30, material: "steel" });
    expect(r.tool_width_mm).toBeCloseTo(1.78, 6);
    expect(r.plunge_feed_mm_rev).toBe(0.03);
    expect(r.finish_considerations.join(" ")).toContain("1.07"); // static_axial gland depth
    expect(r.finish_considerations.join(" ")).toMatch(/Ra 1\.6/);
  });

  it("stainless de-rates the plunge feed by 0.8 and warns about work-hardening", () => {
    const r = eng.getGroovingParams({ groove_type: "od_groove", width_mm: 3, depth_mm: 2, diameter_mm: 40, material: "304 stainless" });
    expect(r.plunge_feed_mm_rev).toBeCloseTo(0.05 * 0.8, 6);
    expect(r.chip_control_notes.join(" ")).toMatch(/work-harden/i);
  });
});

describe("getEccentricParams -- method selection + unbalance RPM cap", () => {
  it("selects by offset magnitude: >D/4 four_jaw, <2mm offset_tailstock, else eccentric_chuck", () => {
    expect(eng.getEccentricParams({ offset_mm: 10, diameter_mm: 25, length_mm: 40, material: "steel" }).method).toBe("four_jaw");
    expect(eng.getEccentricParams({ offset_mm: 1, diameter_mm: 25, length_mm: 40, material: "steel" }).method).toBe("offset_tailstock");
    expect(eng.getEccentricParams({ offset_mm: 3, diameter_mm: 25, length_mm: 40, material: "steel" }).method).toBe("eccentric_chuck");
  });

  it("max safe RPM follows 3000/sqrt(unbalance) with a 2000 RPM hard cap", () => {
    // offset 3, dia 25: unbalance = 3*25*0.1 = 7.5 -> round(3000/sqrt(7.5)) = 1095
    const r = eng.getEccentricParams({ offset_mm: 3, diameter_mm: 25, length_mm: 40, material: "steel" });
    expect(r.max_safe_rpm).toBe(1095);
    expect(r.balancing_required).toBe(true); // 1095 > 1000
    // tiny unbalance hits the absolute cap, never above 2000
    const capped = eng.getEccentricParams({ offset_mm: 0.5, diameter_mm: 4, length_mm: 20, material: "steel" });
    expect(capped.max_safe_rpm).toBe(2000);
  });

  it("large offset (>5mm) demands a counterweight with an estimated mass", () => {
    const r = eng.getEccentricParams({ offset_mm: 8, diameter_mm: 30, length_mm: 50, material: "steel" });
    expect(r.balancing_required).toBe(true);
    expect(r.counterweight_notes.join(" ")).toMatch(/Add counterweight opposite eccentric/);
    const minor = eng.getEccentricParams({ offset_mm: 1, diameter_mm: 25, length_mm: 40, material: "steel" });
    expect(minor.counterweight_notes.join(" ")).toMatch(/counterweight optional/i);
  });
});

describe("getContourParams -- nose radius, stepover, CSS clamp", () => {
  it("spherical: nose radius min(1.2, R/8), 30% stepover, CSS with G50 clamp note", () => {
    const r = eng.getContourParams({ profile_type: "spherical", radius_mm: 10, roughing_allowance_mm: 0.5, finish_allowance_mm: 0.1, material: "steel" });
    expect(r.tool_nose_radius_mm).toBe(1.2); // min(1.2, 10/8=1.25)
    expect(r.stepover_mm).toBeCloseTo(1.2 * 0.3, 6);
    expect(r.constant_surface_speed).toBe(true);
    expect(r.max_rpm).toBe(2500); // steel ceiling
    expect(r.programming_notes.join(" ")).toContain("G50 S2500");
    expect(r.feed_mm_rev).toBe(0.08); // finer feed for spherical
  });

  it("tight concave radius shrinks the nose radius to R/4 (floor 0.2)", () => {
    const r = eng.getContourParams({ profile_type: "concave", radius_mm: 2, roughing_allowance_mm: 0.5, finish_allowance_mm: 0.1, material: "steel" });
    expect(r.tool_nose_radius_mm).toBeCloseTo(0.5, 6); // max(0.2, 2/4)
    expect(r.programming_notes.join(" ")).toMatch(/clearance in concave regions/i);
  });

  it("aluminum raises the CSS RPM ceiling to 4000", () => {
    const r = eng.getContourParams({ profile_type: "convex", roughing_allowance_mm: 0.5, finish_allowance_mm: 0.1, material: "aluminum" });
    expect(r.max_rpm).toBe(4000);
    expect(r.feed_mm_rev).toBe(0.12); // non-spherical feed
  });
});

describe("listAdvancedOperations -- capability catalog completeness", () => {
  it("advertises 9 live-tooling ops, 8 thread forms, 8 groove types, 4 contour types incl. cross_tapping", () => {
    const ops = eng.listAdvancedOperations();
    expect(ops.live_tooling).toHaveLength(9);
    expect(ops.thread_forms).toHaveLength(8);
    expect(ops.groove_types).toHaveLength(8);
    expect(ops.contour_types).toHaveLength(4);
    expect(ops.live_tooling).toContain("cross_tapping");
    expect(ops.groove_types).toContain("o_ring");
    expect(ops.thread_forms).toContain("acme");
  });
});
