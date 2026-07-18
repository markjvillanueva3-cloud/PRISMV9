import { describe, it, expect } from "vitest";
import {
  millDatumReferenceFrameEngine as eng,
  MIN_PRIMARY_FACE_RATIO,
  MIN_SECONDARY_EDGE_RATIO,
  type MillDRFInput,
  type MillFeature,
} from "../engines/MillDatumReferenceFrameEngine.js";

function makeFace(id: string, area: number, opts: Partial<MillFeature> = {}): MillFeature {
  return { id, kind: "face", area_mm2: area, datum_quality: "good", ...opts };
}

function makeEdge(id: string, len: number, opts: Partial<MillFeature> = {}): MillFeature {
  return { id, kind: "edge", length_mm: len, datum_quality: "good", ...opts };
}

function nominal(): MillDRFInput {
  return {
    part_id: "P-MILL-001",
    bbox_mm: { length: 100, width: 60, height: 20 },
    features: [
      makeFace("F_top", 6000, { is_mating: true, normal: "+z" }),
      makeFace("F_bot", 6000, { normal: "-z" }),
      makeEdge("E_long", 100, { normal: "+y", is_mating: true }),
      makeEdge("E_short", 60, { normal: "+x" }),
      { id: "H_dowel", kind: "hole_pattern", size_mm: 6, datum_quality: "excellent" },
    ],
  };
}

describe("MillDatumReferenceFrameEngine", () => {
  it("getStats reports 3-2-1 model and Y14.5 reference", () => {
    const s = eng.getStats();
    expect(s.dof_model).toMatch(/Primary=3.*Secondary=2.*Tertiary=1/);
    expect(s.reference).toMatch(/Y14\.5/);
    expect(s.rules_applied.length).toBeGreaterThanOrEqual(5);
  });

  it("throws when input is missing or features[] absent", () => {
    expect(() => eng.assign(null as never)).toThrow(/input required/);
    expect(() => eng.assign({ part_id: "P", features: undefined as never })).toThrow(/features\[\] required/);
  });

  it("nominal prismatic part → 3 assignments A/B/C, total 6 DOF, fully_constrained", () => {
    const r = eng.assign(nominal());
    expect(r.assignments.map(a => a.label)).toEqual(["A", "B", "C"]);
    expect(r.total_dof_removed).toBe(6);
    expect(r.fully_constrained).toBe(true);
  });

  it("primary is the largest mating face (F_top, 6000mm² with mating boost)", () => {
    const r = eng.assign(nominal());
    expect(r.assignments[0].feature_id).toBe("F_top");
    expect(r.assignments[0].dof_removed).toBe(3);
  });

  it("secondary picks the longer edge (E_long, 100mm vs E_short, 60mm)", () => {
    const r = eng.assign(nominal());
    expect(r.assignments[1].feature_id).toBe("E_long");
    expect(r.assignments[1].dof_removed).toBe(2);
  });

  it("tertiary prefers hole_pattern over edge for clocking precision", () => {
    const r = eng.assign(nominal());
    expect(r.assignments[2].feature_id).toBe("H_dowel");
    expect(r.assignments[2].dof_removed).toBe(1);
  });

  it("fixed_primary override is honored", () => {
    const r = eng.assign({ ...nominal(), fixed_primary: "F_bot" });
    expect(r.assignments[0].feature_id).toBe("F_bot");
  });

  it("fixed_primary that doesn't exist emits a warning", () => {
    const r = eng.assign({ ...nominal(), fixed_primary: "MISSING" });
    expect(r.warnings.some(w => /fixed_primary 'MISSING' not found/.test(w))).toBe(true);
  });

  it("fixed_secondary and fixed_tertiary overrides honored simultaneously", () => {
    const r = eng.assign({
      ...nominal(),
      fixed_secondary: "E_short",
      fixed_tertiary: "E_long",
    });
    expect(r.assignments[1].feature_id).toBe("E_short");
    expect(r.assignments[2].feature_id).toBe("E_long");
  });

  it("non-mating primary emits warning ('confirm functional surface')", () => {
    const features = [
      makeFace("F_big", 8000, { is_mating: false, normal: "+z" }),
      makeEdge("E", 80, { normal: "+y" }),
    ];
    const r = eng.assign({ part_id: "P", features, bbox_mm: { length: 80, width: 80, height: 10 } });
    expect(r.warnings.some(w => /not marked as mating/.test(w))).toBe(true);
  });

  it("primary face area < 25% of bbox face emits warning", () => {
    const r = eng.assign({
      part_id: "P",
      bbox_mm: { length: 200, width: 200, height: 20 }, // bbox face = 40,000 mm²
      features: [
        makeFace("F_small", 5000, { is_mating: true, normal: "+z" }), // 5000/40000 = 0.125 < 0.25
        makeEdge("E", 200, { normal: "+y" }),
      ],
    });
    expect(r.warnings.some(w => new RegExp(`< ${MIN_PRIMARY_FACE_RATIO * 100}%`).test(w))).toBe(true);
  });

  it("primary with poor quality emits warning", () => {
    const features = [
      makeFace("F_top", 6000, { is_mating: true, datum_quality: "poor", normal: "+z" }),
      makeEdge("E", 60, { normal: "+y" }),
    ];
    const r = eng.assign({ part_id: "P", features });
    expect(r.warnings.some(w => /poor quality.*re-grade/.test(w))).toBe(true);
  });

  it("secondary length < 50% of longest bbox dim emits warning", () => {
    const features = [
      makeFace("F", 6000, { is_mating: true, normal: "+z" }),
      makeEdge("E_short", 30, { normal: "+y" }), // 30/100 = 0.3 < 0.5
    ];
    const r = eng.assign({
      part_id: "P",
      bbox_mm: { length: 100, width: 60, height: 20 },
      features,
    });
    expect(r.warnings.some(w => new RegExp(`< ${MIN_SECONDARY_EDGE_RATIO * 100}%`).test(w))).toBe(true);
  });

  it("no secondary edge available → warning + only A assignment + 3 DOF", () => {
    const features = [makeFace("F_only", 6000, { is_mating: true, normal: "+z" })];
    const r = eng.assign({ part_id: "P", features });
    expect(r.assignments.length).toBe(1);
    expect(r.total_dof_removed).toBe(3);
    expect(r.fully_constrained).toBe(false);
    expect(r.warnings.some(w => /No secondary edge/.test(w))).toBe(true);
  });

  it("no tertiary feature → A+B only, 5 DOF, fully_constrained=true for symmetric (5-DOF axisymmetric OK)", () => {
    const features = [
      makeFace("F", 6000, { is_mating: true, normal: "+z" }),
      makeEdge("E", 100, { normal: "+y" }),
    ];
    const r = eng.assign({ part_id: "P", features });
    expect(r.total_dof_removed).toBe(5);
    expect(r.fully_constrained).toBe(true); // 5-DOF + no tertiary acceptable
    expect(r.warnings.some(w => /No tertiary clocking/.test(w))).toBe(true);
  });

  it("no face datum candidate → fundamentally un-inspectable warning", () => {
    const r = eng.assign({
      part_id: "P",
      features: [makeEdge("E", 100, { normal: "+y" })],
    });
    expect(r.assignments.length).toBe(0);
    expect(r.warnings.some(w => /un-inspectable/.test(w))).toBe(true);
    expect(r.fully_constrained).toBe(false);
  });

  it("secondary parallel to primary normal is REJECTED (face-on-face is not perpendicular)", () => {
    // F_top normal +z, F_bot normal -z. Without giving an edge with x or y normal,
    // the engine should skip face candidates with z-axis normals when picking secondary.
    const features = [
      makeFace("F_top", 6000, { is_mating: true, normal: "+z" }),
      // boss with +z normal would be parallel to primary — rejected
      { id: "B_parallel", kind: "boss" as const, size_mm: 30, normal: "+z" as const, datum_quality: "good" as const },
      makeEdge("E_perp", 80, { normal: "+y" }),
    ];
    const r = eng.assign({ part_id: "P", features });
    expect(r.assignments[1].feature_id).toBe("E_perp"); // not B_parallel
  });

  it("hole_pattern beats single hole for tertiary clocking", () => {
    const features = [
      makeFace("F", 6000, { is_mating: true, normal: "+z" }),
      makeEdge("E", 80, { normal: "+y" }),
      { id: "H_single", kind: "hole" as const, size_mm: 10, datum_quality: "good" as const },
      { id: "H_pattern", kind: "hole_pattern" as const, size_mm: 6, datum_quality: "good" as const },
    ];
    const r = eng.assign({ part_id: "P", features });
    expect(r.assignments[2].feature_id).toBe("H_pattern");
  });

  it("mating bonus boosts a smaller face above a larger non-mating face", () => {
    const features = [
      makeFace("F_huge", 10000, { is_mating: false, normal: "+z" }), // score 10000 × 1.0 × 0.75 = 7500
      makeFace("F_mating", 6000, { is_mating: true, normal: "+z" }), // score 6000 × 2.0 × 0.75 = 9000
      makeEdge("E", 80, { normal: "+y" }),
    ];
    const r = eng.assign({ part_id: "P", features });
    expect(r.assignments[0].feature_id).toBe("F_mating");
  });

  it("axis_defining flag boosts face score (multiplier 1.5)", () => {
    const features = [
      makeFace("F_normal", 8000, { is_mating: false, normal: "+z" }), // 8000 × 1.0 × 1.0 × 0.75 = 6000
      makeFace("F_axis", 5000, { is_mating: false, axis_defining: true, normal: "+z" }), // 5000 × 1.5 × 0.75 = 5625
      // axis_defining alone NOT enough to flip — needs combined signal
      makeFace("F_axis_big", 6000, { is_mating: false, axis_defining: true, normal: "+z" }), // 6000 × 1.5 × 0.75 = 6750
      makeEdge("E", 80, { normal: "+y" }),
    ];
    const r = eng.assign({ part_id: "P", features });
    expect(r.assignments[0].feature_id).toBe("F_axis_big");
  });

  it("machine_axis_count < 3 emits refixturing warning", () => {
    const r = eng.assign({ ...nominal(), machine_axis_count: 2 });
    expect(r.warnings.some(w => /refixturing/.test(w))).toBe(true);
  });

  it("machine_axis_count >= 3 does NOT emit refixturing warning", () => {
    const r3 = eng.assign({ ...nominal(), machine_axis_count: 3 });
    const r5 = eng.assign({ ...nominal(), machine_axis_count: 5 });
    expect(r3.warnings.some(w => /refixturing/.test(w))).toBe(false);
    expect(r5.warnings.some(w => /refixturing/.test(w))).toBe(false);
  });

  it("rejected_candidates lists every face candidate except the winner with score reason", () => {
    const r = eng.assign(nominal());
    expect(r.rejected_candidates.length).toBeGreaterThanOrEqual(1);
    expect(r.rejected_candidates.every(c => /Lower (face|edge) score/.test(c.reason))).toBe(true);
    expect(r.rejected_candidates.every(c => c.feature_id !== r.assignments[0].feature_id)).toBe(true);
  });

  it("primary reasoning narrates area + mating + quality", () => {
    const r = eng.assign(nominal());
    expect(r.assignments[0].reasoning).toMatch(/area=6000mm²/);
    expect(r.assignments[0].reasoning).toMatch(/mating/);
    expect(r.assignments[0].reasoning).toMatch(/quality=good/);
  });

  it("variability: 3 distinct DRF configurations (vise plate, mold block, thin plate) all produce valid assignments", () => {
    const vise = nominal();
    const moldBlock: MillDRFInput = {
      part_id: "P-MOLD",
      bbox_mm: { length: 200, width: 200, height: 100 },
      features: [
        makeFace("F_bottom", 40000, { is_mating: true, normal: "-z", datum_quality: "excellent" }),
        makeEdge("E_x", 200, { normal: "+y", is_mating: true }),
        makeEdge("E_y", 200, { normal: "+x" }),
        { id: "H_dowel", kind: "hole_pattern", size_mm: 8, datum_quality: "excellent" },
      ],
    };
    const thinPlate: MillDRFInput = {
      part_id: "P-THIN",
      bbox_mm: { length: 300, width: 200, height: 3 },
      features: [
        makeFace("F_face", 60000, { is_mating: true, normal: "+z", datum_quality: "excellent" }),
        makeEdge("E_long", 300, { normal: "+y" }),
        { id: "H1", kind: "hole", size_mm: 5, datum_quality: "good" },
      ],
    };
    const rVise = eng.assign(vise);
    const rMold = eng.assign(moldBlock);
    const rThin = eng.assign(thinPlate);
    expect(rVise.fully_constrained).toBe(true);
    expect(rMold.fully_constrained).toBe(true);
    expect(rThin.fully_constrained).toBe(true);
    expect(rVise.assignments[0].feature_id).toBe("F_top");
    expect(rMold.assignments[0].feature_id).toBe("F_bottom");
    expect(rThin.assignments[0].feature_id).toBe("F_face");
  });

  it("determinism: same input twice → identical assignments and warnings", () => {
    const input = nominal();
    const r1 = eng.assign(input);
    const r2 = eng.assign(input);
    expect(r1.assignments).toEqual(r2.assignments);
    expect(r1.warnings).toEqual(r2.warnings);
    expect(r1.total_dof_removed).toBe(r2.total_dof_removed);
  });

  it("adversarial: empty features array → no assignments + un-inspectable warning + not constrained", () => {
    const r = eng.assign({ part_id: "P", features: [] });
    expect(r.assignments).toEqual([]);
    expect(r.warnings.some(w => /un-inspectable/.test(w))).toBe(true);
    expect(r.fully_constrained).toBe(false);
  });

  it("adversarial: face missing area_mm2 still scores (defaults to 1)", () => {
    const features = [
      { id: "F_noarea", kind: "face" as const, is_mating: true, normal: "+z" as const },
      makeEdge("E", 80, { normal: "+y" }),
    ];
    const r = eng.assign({ part_id: "P", features });
    expect(r.assignments.length).toBeGreaterThanOrEqual(1);
    expect(r.assignments[0].feature_id).toBe("F_noarea");
  });
});
