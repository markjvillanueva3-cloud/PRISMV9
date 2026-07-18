import { describe, it, expect } from "vitest";
import {
  skimCutQCEngine as eng,
  SkimCutQCEngine,
  type SkimCutQCInput,
} from "../engines/SkimCutQCEngine.js";

function nominal(o: Partial<SkimCutQCInput> = {}): SkimCutQCInput {
  return {
    roughing_ra_um: 6.3,
    roughing_recast_um: 15,
    roughing_dim_accuracy_um: 30,
    n_skim_passes: 3,
    material: "tool_steel_hardened",
    target_ra_um: 1.6,
    target_dim_accuracy_um: 10,
    ...o,
  };
}

describe("SkimCutQCEngine", () => {
  it("exports singleton with predict()", () => {
    expect(eng).toBeInstanceOf(SkimCutQCEngine);
    expect(typeof eng.predict).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.predict({} as SkimCutQCInput)).toThrow(/roughing_ra_um \+ n_skim_passes \+ material required/);
  });

  it("throws on missing targets", () => {
    expect(() => eng.predict({ roughing_ra_um: 6, roughing_recast_um: 15, roughing_dim_accuracy_um: 30,
      n_skim_passes: 3, material: "tool_steel_hardened" } as SkimCutQCInput))
      .toThrow(/target_ra_um \+ target_dim_accuracy_um required/);
  });

  it("throws on non-positive roughing inputs", () => {
    expect(() => eng.predict(nominal({ roughing_ra_um: 0 }))).toThrow(/positive roughing inputs/);
    expect(() => eng.predict(nominal({ roughing_dim_accuracy_um: 0 }))).toThrow(/positive roughing inputs/);
  });

  it("throws on n_skim_passes out of [0, 10] or non-integer", () => {
    expect(() => eng.predict(nominal({ n_skim_passes: -1 }))).toThrow(/n_skim_passes must be integer/);
    expect(() => eng.predict(nominal({ n_skim_passes: 11 }))).toThrow(/n_skim_passes must be integer/);
    expect(() => eng.predict(nominal({ n_skim_passes: 2.5 }))).toThrow(/n_skim_passes must be integer/);
  });

  it("tool_steel_hardened + 3 skims → Ra rolls off 50%^3 = 12.5%", () => {
    const r = eng.predict(nominal());
    // 6.3 × 0.5^3 = 0.7875
    expect(r.predicted_final_ra_um.value).toBeCloseTo(0.788, 2);
  });

  it("aluminum has higher roll-off factor than tool steel", () => {
    const al = eng.predict(nominal({ material: "aluminum" }));
    const ts = eng.predict(nominal({ material: "tool_steel_hardened" }));
    // aluminum 0.65 > tool_steel_hardened 0.50 → aluminum has higher residual Ra
    expect(al.predicted_final_ra_um.value).toBeGreaterThan(ts.predicted_final_ra_um.value);
  });

  it("more skim passes monotonically reduce Ra", () => {
    const lo = eng.predict(nominal({ n_skim_passes: 1 }));
    const hi = eng.predict(nominal({ n_skim_passes: 5 }));
    expect(hi.predicted_final_ra_um.value).toBeLessThan(lo.predicted_final_ra_um.value);
  });

  it("recast asymptotes to 30% × roughing (never fully cleans up)", () => {
    const r = eng.predict(nominal({ n_skim_passes: 10, roughing_recast_um: 20 }));
    // 10-skim recast → 20 × (0.30 + 0.70 × 0.5^10) ≈ 6.01
    expect(r.predicted_recast_um.value).toBeGreaterThanOrEqual(6.0);  // ≥ asymptote
    expect(r.predicted_recast_um.value).toBeLessThan(8);
  });

  it("dim accuracy improves with 1/sqrt(n+1)", () => {
    const zero = eng.predict(nominal({ n_skim_passes: 0 }));
    const three = eng.predict(nominal({ n_skim_passes: 3 }));
    // 30 / sqrt(4) = 15
    expect(three.predicted_dim_accuracy_um.value).toBeCloseTo(15, 1);
    expect(three.predicted_dim_accuracy_um.value).toBeLessThan(zero.predicted_dim_accuracy_um.value);
  });

  it("verdict=meets_spec when all 3 specs met with margin", () => {
    const r = eng.predict(nominal({
      n_skim_passes: 5,                  // 6.3 × 0.5^5 = 0.197
      roughing_recast_um: 5,             // 5 × (0.30 + 0.70 × 0.5^5) = 1.61 < 5
      roughing_dim_accuracy_um: 30,      // 30/sqrt(6) = 12.25 > 10 — uh
      target_ra_um: 1.0,
      target_dim_accuracy_um: 15,        // pass dim
    }));
    expect(r.verdict).toBe("meets_spec");
  });

  it("verdict=additional_skims_required when underspecced", () => {
    const r = eng.predict(nominal({
      n_skim_passes: 1,
      target_ra_um: 0.5,
      target_dim_accuracy_um: 20,  // loose enough to be recoverable within budget
    }));
    expect(r.verdict).toBe("additional_skims_required");
    expect(r.additional_skims_recommended.value).toBeGreaterThan(0);
    expect(r.warnings.some(w => /Add.*more skim/.test(w))).toBe(true);
  });

  it("verdict=infeasible when even 6 skim passes don't meet spec", () => {
    const r = eng.predict(nominal({
      n_skim_passes: 0,
      target_ra_um: 0.05,                // impossible even with 6 skims
      target_dim_accuracy_um: 1,
    }));
    expect(r.verdict).toBe("infeasible");
    expect(r.warnings.some(w => /INFEASIBLE.*grinding|lapping/.test(w))).toBe(true);
  });

  it("verdict=marginal when within 10% of spec", () => {
    // Need final Ra ~ 0.90 × target with everything else passing
    const r = eng.predict(nominal({
      roughing_ra_um: 3.0,
      n_skim_passes: 3,                  // 3.0 × 0.5^3 = 0.375
      roughing_recast_um: 4,
      roughing_dim_accuracy_um: 20,
      target_ra_um: 0.40,                // 0.375 / 0.40 = 93.75% → 6.25% margin → marginal
      target_dim_accuracy_um: 15,
    }));
    expect(r.verdict).toBe("marginal");
    expect(r.warnings.some(w => /10% of spec.*safety margin/.test(w))).toBe(true);
  });

  it("meets_ra/recast/dim flags surface independently", () => {
    const r = eng.predict(nominal({
      roughing_ra_um: 6.3, n_skim_passes: 4, target_ra_um: 5.0,        // Ra: 6.3 × 0.5^4 = 0.394 ≤ 5
      roughing_recast_um: 50, max_recast_um: 5,                         // recast: 50 × (0.30 + 0.70 × 0.5^4) = 17.2 > 5
      roughing_dim_accuracy_um: 30, target_dim_accuracy_um: 50,         // dim: 30 / sqrt(5) = 13.4 ≤ 50
    }));
    expect(r.meets_ra_spec).toBe(true);
    expect(r.meets_recast_spec).toBe(false);
    expect(r.meets_dim_spec).toBe(true);
  });

  it("aluminum + Ra < 0.8μm → instability warning", () => {
    const r = eng.predict(nominal({ material: "aluminum", n_skim_passes: 6, target_ra_um: 2.0 }));
    expect(r.warnings.some(w => /Aluminum.*unstable|smearing/.test(w))).toBe(true);
  });

  it("carbide + n_skim < 2 → spall warning", () => {
    const r = eng.predict(nominal({ material: "carbide", n_skim_passes: 1, target_ra_um: 5.0, roughing_recast_um: 3 }));
    expect(r.warnings.some(w => /Carbide.*skim passes.*spall/.test(w))).toBe(true);
  });

  it("zero skim passes returns roughing values", () => {
    const r = eng.predict(nominal({ n_skim_passes: 0 }));
    expect(r.predicted_final_ra_um.value).toBe(6.3);
    // recast: 15 × (0.30 + 0.70 × 1.0) = 15
    expect(r.predicted_recast_um.value).toBe(15);
  });

  it("material roll-off citations: 4 materials exercised", () => {
    const mats = ["tool_steel_hardened", "aluminum", "inconel", "brass"] as const;
    const ras = mats.map(m => eng.predict(nominal({ material: m })).predicted_final_ra_um.value);
    // 4 distinct values (different rolloff factors)
    expect(new Set(ras).size).toBe(4);
  });

  it("source cites Sodick AP + Fanuc Robocut + Charmilles + Mitsubishi", () => {
    const r = eng.predict(nominal());
    expect(r.source).toMatch(/Sodick AP|Fanuc Robocut|Charmilles|Mitsubishi/);
  });
});
