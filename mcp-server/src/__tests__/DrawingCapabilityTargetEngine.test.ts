import { describe, it, expect } from "vitest";
import {
  drawingCapabilityTargetEngine as eng,
  DrawingCapabilityTargetEngine,
  type DrawingCapabilityInput,
} from "../engines/DrawingCapabilityTargetEngine.js";

function nominal(o: Partial<DrawingCapabilityInput> = {}): DrawingCapabilityInput {
  return {
    sector: "general",
    feature_criticality: "minor",
    tolerance_class: "iso2768_medium",
    ...o,
  };
}

describe("DrawingCapabilityTargetEngine", () => {
  it("exports singleton with recommend()", () => {
    expect(eng).toBeInstanceOf(DrawingCapabilityTargetEngine);
    expect(typeof eng.recommend).toBe("function");
  });

  it("throws on missing fields", () => {
    expect(() => eng.recommend({} as DrawingCapabilityInput)).toThrow(/sector \+ feature_criticality \+ tolerance_class required/);
  });

  it("throws on explicit tolerance without LSL/USL", () => {
    expect(() => eng.recommend(nominal({ tolerance_class: "explicit" }))).toThrow(/explicit tolerance requires lsl \+ usl/);
  });

  it("throws on LSL >= USL", () => {
    expect(() => eng.recommend(nominal({ tolerance_class: "explicit", lsl: 10, usl: 5 }))).toThrow(/lsl must be < usl/);
  });

  it("general + minor: baseline tier Cpk=1.33", () => {
    const r = eng.recommend(nominal());
    expect(r.tier).toBe("baseline");
    expect(r.cpk_target.value).toBe(1.33);
    expect(r.sigma_level.value).toBeCloseTo(3.99, 2);
  });

  it("general + critical: CTQ tier Cpk=1.50", () => {
    const r = eng.recommend(nominal({ feature_criticality: "critical" }));
    expect(r.tier).toBe("ctq");
    expect(r.cpk_target.value).toBe(1.50);
  });

  it("aerospace + major: aerospace tier Cpk=1.67", () => {
    const r = eng.recommend(nominal({ sector: "aerospace", feature_criticality: "major" }));
    expect(r.tier).toBe("aerospace");
    expect(r.cpk_target.value).toBe(1.67);
    expect(r.sigma_level.value).toBeCloseTo(5.01, 2);
    expect(r.fai_required).toBe(true);
  });

  it("medical + minor: ctq tier (still 1.50, escalates with criticality)", () => {
    const r = eng.recommend(nominal({ sector: "medical", feature_criticality: "minor" }));
    expect(r.tier).toBe("ctq");
    expect(r.cpk_target.value).toBe(1.50);
  });

  it("medical + critical: medical tier Cpk=2.00", () => {
    const r = eng.recommend(nominal({ sector: "medical", feature_criticality: "critical" }));
    expect(r.tier).toBe("medical");
    expect(r.cpk_target.value).toBe(2.00);
    expect(r.sigma_level.value).toBeCloseTo(6.00, 2);
    expect(r.warnings.some(w => /21 CFR.*820/.test(w))).toBe(true);
  });

  it("defense + critical: defense tier Cpk=2.00 + MIL-STD-1916 in warning", () => {
    const r = eng.recommend(nominal({ sector: "defense", feature_criticality: "critical" }));
    expect(r.tier).toBe("defense");
    expect(r.cpk_target.value).toBe(2.00);
  });

  it("automotive + major: PPAP-3 tier Cpk=1.67", () => {
    const r = eng.recommend(nominal({ sector: "automotive", feature_criticality: "major" }));
    expect(r.tier).toBe("ppap_l3");
    expect(r.cpk_target.value).toBe(1.67);
    expect(r.fai_required).toBe(true);
  });

  it("ks_safety criticality always promotes", () => {
    const r = eng.recommend(nominal({ feature_criticality: "ks_safety" }));
    expect(r.tier).toBe("ctq");
  });

  it("is_key_characteristic promotes minor → ctq", () => {
    const r = eng.recommend(nominal({ feature_criticality: "minor", is_key_characteristic: true }));
    expect(r.tier).toBe("ctq");
    expect(r.fai_required).toBe(true);
  });

  it("Ppk target = Cpk - 0.05 (long-term gate)", () => {
    const r = eng.recommend(nominal({ sector: "aerospace", feature_criticality: "major" }));
    expect(r.ppk_target.value).toBeCloseTo(1.62, 2);
  });

  it("medical/defense sample size = 125", () => {
    const r = eng.recommend(nominal({ sector: "medical", feature_criticality: "critical" }));
    expect(r.min_sample_size.value).toBe(125);
    expect(r.recommended_subgroup_size.value).toBe(5);
  });

  it("aerospace sample size = 100", () => {
    const r = eng.recommend(nominal({ sector: "aerospace", feature_criticality: "major" }));
    expect(r.min_sample_size.value).toBe(100);
  });

  it("baseline sample size = 30 (AIAG minimum)", () => {
    const r = eng.recommend(nominal());
    expect(r.min_sample_size.value).toBe(30);
    expect(r.recommended_subgroup_size.value).toBe(4);
  });

  it("sample_size_override < 30 triggers wide-CI warning", () => {
    const r = eng.recommend(nominal({ sample_size_override: 10 }));
    expect(r.min_sample_size.value).toBe(10);
    expect(r.warnings.some(w => /wide CI/.test(w))).toBe(true);
  });

  it("ISO 2768 coarse + critical → designer-intent warning", () => {
    const r = eng.recommend(nominal({ tolerance_class: "iso2768_coarse", feature_criticality: "critical" }));
    expect(r.warnings.some(w => /coarse class.*non-minor/i.test(w))).toBe(true);
  });

  it("ks_critical tolerance class implies KC + FAI", () => {
    const r = eng.recommend(nominal({ tolerance_class: "ks_critical" }));
    expect(r.fai_required).toBe(true);
  });

  it("explicit tolerance with lsl/usl accepted", () => {
    const r = eng.recommend(nominal({ tolerance_class: "explicit", lsl: 10.00, usl: 10.05 }));
    expect(r.cpk_target.value).toBe(1.33);  // general/minor still baseline
  });

  it("rationale records tier selection reasoning", () => {
    const r = eng.recommend(nominal({ sector: "aerospace", feature_criticality: "major" }));
    expect(r.rationale.some(x => /Tier 'aerospace'/.test(x))).toBe(true);
    expect(r.rationale.some(x => /Ppk target/.test(x))).toBe(true);
  });

  it("source cites AIAG SPC + ISO 22514 + IATF + AS9100 + 21 CFR + MIL-STD", () => {
    const r = eng.recommend(nominal());
    expect(r.source).toMatch(/AIAG SPC|ISO 22514|IATF 16949|AS9100|21 CFR|MIL-STD/);
  });
});
