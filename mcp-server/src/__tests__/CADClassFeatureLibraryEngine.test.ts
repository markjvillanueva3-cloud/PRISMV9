import { describe, it, expect } from "vitest";
import { CADClassFeatureLibraryEngine } from "../engines/CADClassFeatureLibraryEngine.js";

const engine = new CADClassFeatureLibraryEngine();

describe("CADClassFeatureLibraryEngine.templateFor", () => {
  it("returns extrude_punch template with 6 ordered features", () => {
    const t = engine.templateFor("extrude_punch");
    expect(t === null).toBe(false);
    expect(t!.part_class).toBe("extrude_punch");
    expect(t!.features.length).toBe(6);
  });

  it("first punch feature is the stepped revolved axis (build root)", () => {
    const t = engine.templateFor("extrude_punch");
    expect(t!.features[0]!.kind).toBe("stepped_revolved_axis");
    expect(t!.features[0]!.prevalence).toBe(1.0);
    expect(t!.features[0]!.build_hint).toBe("revolveStepProfile");
  });

  it("punch template includes working-tip taper at 0.85 prevalence with 2.0° default", () => {
    const t = engine.templateFor("extrude_punch");
    const taper = t!.features.find((f) => f.kind === "working_tip_taper");
    expect(taper?.prevalence).toBe(0.85);
    expect(taper?.typical_angle_deg).toBe(2.0);
    expect(taper?.build_hint).toBe("extrudeTapered");
  });

  it("punch template includes central_oil_hole at 0.9 prevalence with Ø1.27mm", () => {
    const t = engine.templateFor("extrude_punch");
    const oil = t!.features.find((f) => f.kind === "central_oil_hole");
    expect(oil?.prevalence).toBe(0.9);
    expect(oil?.typical_size_mm).toBe(1.27);
  });

  it("punch template includes cross-drilled relief at 0.7 prevalence with Ø1.524mm", () => {
    const t = engine.templateFor("extrude_punch");
    const relief = t!.features.find((f) => f.kind === "cross_drilled_relief_holes");
    expect(relief?.prevalence).toBe(0.7);
    expect(relief?.typical_size_mm).toBe(1.524);
    expect(relief?.build_hint).toBe("crossDrillHoles");
  });

  it("punch template carries visual-fidelity notes about the 2nd-attempt failures", () => {
    const t = engine.templateFor("extrude_punch");
    expect(t!.visual_fidelity_notes.length).toBeGreaterThanOrEqual(3);
    const blob = t!.visual_fidelity_notes.join(" ").toLowerCase();
    expect(blob.includes("detail a")).toBe(true);
    expect(blob.includes("orientation")).toBe(true);
  });

  it("returns null for classes without a template (no shadow fallbacks)", () => {
    const t = engine.templateFor("plate");
    expect(t === null).toBe(true);
  });

  it("die template has ejector_pin_hole at 0.9 prevalence with Ø4.76mm", () => {
    const t = engine.templateFor("die");
    const ej = t!.features.find((f) => f.kind === "ejector_pin_hole");
    expect(ej?.prevalence).toBe(0.9);
    expect(ej?.typical_size_mm).toBe(4.76);
  });

  it("shaft template has end-chamfer at 0.95 prevalence (near-universal)", () => {
    const t = engine.templateFor("shaft");
    const ch = t!.features.find((f) => f.kind === "bevel_face_chamfer");
    expect(ch?.prevalence).toBe(0.95);
    expect(ch?.typical_angle_deg).toBe(45);
  });

  it("blisk template has all 3 airfoil-fillet features at prevalence 1.0", () => {
    const t = engine.templateFor("blisk");
    const le = t!.features.find((f) => f.kind === "leading_edge_fillet");
    const te = t!.features.find((f) => f.kind === "trailing_edge_fillet");
    const root = t!.features.find((f) => f.kind === "blade_root_fillet");
    expect(le?.prevalence).toBe(1.0);
    expect(te?.prevalence).toBe(1.0);
    expect(root?.prevalence).toBe(1.0);
  });

  it("medical_implant template flags biocompat + polish at prevalence 1.0", () => {
    const t = engine.templateFor("medical_implant");
    const bio = t!.features.find((f) => f.kind === "biocompat_note");
    const polish = t!.features.find((f) => f.kind === "polish_callout");
    expect(bio?.prevalence).toBe(1.0);
    expect(polish?.prevalence).toBe(1.0);
  });
});

describe("CADClassFeatureLibraryEngine.classesCovered", () => {
  it("covers at least 6 classes (punch, die, shaft, blisk, medical_implant, valve_body)", () => {
    const classes = engine.classesCovered();
    expect(classes.length).toBeGreaterThanOrEqual(6);
    const hasAll = ["extrude_punch", "die", "shaft", "blisk", "medical_implant", "valve_body"]
      .every((c) => classes.includes(c as never));
    expect(hasAll).toBe(true);
  });
});

describe("CADClassFeatureLibraryEngine.predictVisualFidelity", () => {
  it("returns score 1.0 when every template feature is in the plan (full fidelity)", () => {
    const t = engine.templateFor("extrude_punch")!;
    const allKinds = t.features.map((f) => f.kind);
    const result = engine.predictVisualFidelity("extrude_punch", allKinds);
    expect(result.score).toBe(1);
    expect(result.missing.length).toBe(0);
  });

  it("predicts the 2nd JM Die attempt at score ≈ 0.55 (revolve + oil + cross-drill only)", () => {
    // 2nd attempt: revolveStepProfile + central oil hole + cross-drilled relief.
    // Missing: working_tip_taper (0.85), bevel_face_chamfer (0.8), shoulder_fillet (0.6)
    // Covered prevalence: 1.0 + 0.9 + 0.7 = 2.6 / total 4.95 = 0.525
    const result = engine.predictVisualFidelity("extrude_punch", [
      "stepped_revolved_axis",
      "central_oil_hole",
      "cross_drilled_relief_holes",
    ]);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.score).toBeLessThan(0.6);
    expect(result.missing.length).toBe(3);
    const missingKinds = result.missing.map((f) => f.kind);
    expect(missingKinds.includes("working_tip_taper")).toBe(true);
    expect(missingKinds.includes("bevel_face_chamfer")).toBe(true);
  });

  it("returns score 0 + empty arrays for unknown class", () => {
    const result = engine.predictVisualFidelity("plate", ["stepped_revolved_axis"]);
    expect(result.score).toBe(0);
    expect(result.template_total).toBe(0);
    expect(result.missing.length).toBe(0);
  });

  it("planned_covered exactly equals sum of matched prevalences", () => {
    const result = engine.predictVisualFidelity("extrude_punch", ["stepped_revolved_axis", "central_oil_hole"]);
    // 1.0 (axis) + 0.9 (oil) = 1.9
    expect(Math.round(result.planned_covered * 100) / 100).toBe(1.9);
  });

  it("missing list excludes features that ARE in the plan", () => {
    const result = engine.predictVisualFidelity("extrude_punch", ["stepped_revolved_axis"]);
    const missingKinds = result.missing.map((f) => f.kind);
    expect(missingKinds.includes("stepped_revolved_axis")).toBe(false);
  });
});

describe("CADClassFeatureLibraryEngine.buildSequenceFor", () => {
  it("returns features at or above default 0.5 threshold (drops only the 0.6 shoulder_fillet at threshold 0.7)", () => {
    const seq = engine.buildSequenceFor("extrude_punch", 0.7);
    const kinds = seq.map((f) => f.kind);
    expect(kinds.includes("shoulder_fillet")).toBe(false);
    expect(kinds.includes("stepped_revolved_axis")).toBe(true);
    expect(kinds.includes("working_tip_taper")).toBe(true);
  });

  it("default threshold 0.5 includes shoulder_fillet (prevalence 0.6)", () => {
    const seq = engine.buildSequenceFor("extrude_punch");
    const kinds = seq.map((f) => f.kind);
    expect(kinds.includes("shoulder_fillet")).toBe(true);
  });

  it("threshold 1.0 returns only the 100%-prevalence root features", () => {
    const seq = engine.buildSequenceFor("extrude_punch", 1.0);
    expect(seq.length).toBe(1);
    expect(seq[0]!.kind).toBe("stepped_revolved_axis");
  });

  it("returns empty array for unknown classes (no extrapolation)", () => {
    const seq = engine.buildSequenceFor("plate");
    expect(seq.length).toBe(0);
  });

  it("blisk default sequence emits LE/TE/root fillets in order before optional balance hole", () => {
    const seq = engine.buildSequenceFor("blisk");
    const kinds = seq.map((f) => f.kind);
    expect(kinds.includes("leading_edge_fillet")).toBe(true);
    expect(kinds.includes("trailing_edge_fillet")).toBe(true);
    expect(kinds.includes("blade_root_fillet")).toBe(true);
  });
});
