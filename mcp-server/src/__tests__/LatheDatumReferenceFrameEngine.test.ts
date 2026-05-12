import { describe, it, expect } from "vitest";
import { latheDatumReferenceFrameEngine } from "../engines/LatheDatumReferenceFrameEngine.js";

describe("LatheDatumReferenceFrameEngine", () => {
  const baseFeatures = [
    { id: "OD1", kind: "od_cylinder" as const, nominal_mm: 50, length_mm: 80, is_mating: true, datum_quality: "good" as const, axis_defining: true },
    { id: "F1", kind: "face" as const, nominal_mm: 60, datum_quality: "good" as const },
    { id: "K1", kind: "keyway" as const, nominal_mm: 6, length_mm: 20, datum_quality: "adequate" as const },
  ];

  it("assigns A|B|C for standard turned part", () => {
    const r = latheDatumReferenceFrameEngine.assign({ part_id: "p1", features: baseFeatures });
    expect(r.assignments.map((a) => a.label)).toEqual(["A", "B", "C"]);
    expect(r.assignments[0]!.feature_id).toBe("OD1");
    expect(r.assignments[1]!.feature_id).toBe("F1");
    expect(r.assignments[2]!.feature_id).toBe("K1");
    expect(r.fully_constrained).toBe(true);
  });

  it("selects highest-scoring OD as primary", () => {
    const r = latheDatumReferenceFrameEngine.assign({
      part_id: "p",
      features: [
        { id: "OD_small", kind: "od_cylinder", nominal_mm: 20, length_mm: 10, datum_quality: "adequate" },
        { id: "OD_big", kind: "od_cylinder", nominal_mm: 60, length_mm: 80, is_mating: true, axis_defining: true, datum_quality: "good" },
        { id: "F", kind: "face", nominal_mm: 60, datum_quality: "good" },
      ],
    });
    expect(r.assignments[0]!.feature_id).toBe("OD_big");
  });

  it("warns when primary L/D < 0.5", () => {
    const r = latheDatumReferenceFrameEngine.assign({
      part_id: "p",
      features: [
        { id: "OD", kind: "od_cylinder", nominal_mm: 100, length_mm: 20, is_mating: true, datum_quality: "good", axis_defining: true },
        { id: "F", kind: "face", nominal_mm: 100, datum_quality: "good" },
      ],
    });
    expect(r.warnings.some((w) => /L\/D/.test(w))).toBe(true);
  });

  it("warns when primary is not marked mating", () => {
    const r = latheDatumReferenceFrameEngine.assign({
      part_id: "p",
      features: [
        { id: "OD", kind: "od_cylinder", nominal_mm: 30, length_mm: 40, datum_quality: "good", axis_defining: true },
        { id: "F", kind: "face", nominal_mm: 30, datum_quality: "good" },
      ],
    });
    expect(r.warnings.some((w) => /mating/i.test(w))).toBe(true);
  });

  it("flags no primary axis candidate", () => {
    const r = latheDatumReferenceFrameEngine.assign({
      part_id: "p",
      features: [
        { id: "F", kind: "face", nominal_mm: 50, datum_quality: "good" },
        { id: "K", kind: "keyway", nominal_mm: 6, datum_quality: "good" },
      ],
    });
    expect(r.warnings.some((w) => /primary/i.test(w))).toBe(true);
  });

  it("notes missing tertiary clocking feature (axisymmetric case)", () => {
    const r = latheDatumReferenceFrameEngine.assign({
      part_id: "p",
      features: [
        { id: "OD", kind: "od_cylinder", nominal_mm: 30, length_mm: 60, is_mating: true, datum_quality: "good", axis_defining: true },
        { id: "F", kind: "face", nominal_mm: 30, datum_quality: "good" },
      ],
    });
    expect(r.warnings.some((w) => /tertiary|clocking|axisymmetric/i.test(w))).toBe(true);
    expect(r.fully_constrained).toBe(true); // 5 DOF + axisymmetric exemption
  });

  it("respects fixed_primary override", () => {
    const r = latheDatumReferenceFrameEngine.assign({
      part_id: "p",
      features: baseFeatures,
      fixed_primary: "OD1",
    });
    expect(r.assignments[0]!.feature_id).toBe("OD1");
  });

  it("warns when fixed override not found", () => {
    const r = latheDatumReferenceFrameEngine.assign({
      part_id: "p",
      features: baseFeatures,
      fixed_primary: "DOES_NOT_EXIST",
    });
    expect(r.warnings.some((w) => /DOES_NOT_EXIST/.test(w))).toBe(true);
  });

  it("warns on poor secondary face quality", () => {
    const r = latheDatumReferenceFrameEngine.assign({
      part_id: "p",
      features: [
        { id: "OD", kind: "od_cylinder", nominal_mm: 30, length_mm: 60, is_mating: true, datum_quality: "good", axis_defining: true },
        { id: "F", kind: "face", nominal_mm: 30, datum_quality: "poor" },
        { id: "K", kind: "keyway", nominal_mm: 6, datum_quality: "adequate" },
      ],
    });
    expect(r.warnings.some((w) => /poor quality|seat repeatably/i.test(w))).toBe(true);
  });

  it("total DOF = 6 for full ABC assignment", () => {
    const r = latheDatumReferenceFrameEngine.assign({ part_id: "p", features: baseFeatures });
    expect(r.total_dof_removed).toBe(6);
  });

  it("getStats returns rules list", () => {
    const s = latheDatumReferenceFrameEngine.getStats();
    expect(s.dof_model).toMatch(/Primary/);
    expect(s.rules_applied.length).toBeGreaterThan(0);
  });
});
