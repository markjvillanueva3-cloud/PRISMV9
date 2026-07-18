import { describe, it, expect } from "vitest";
import {
  heatTreatmentAwareSpeedFeedEngine as eng,
  HeatTreatmentAwareSpeedFeedEngine,
  type HeatTreatSFInput,
} from "../engines/HeatTreatmentAwareSpeedFeedEngine.js";
import { CANONICAL_HEAT_TREAT_REGIME } from "../physics/constants.js";

function nominal(o: Partial<HeatTreatSFInput> = {}): HeatTreatSFInput {
  return {
    material: "H13 tool steel",
    heat_treat_regime: "annealed",
    baseline_sfm: 200,
    baseline_chip_load_mm_tooth: 0.10,
    baseline_tool_life_min: 60,
    ...o,
  };
}

describe("HeatTreatmentAwareSpeedFeedEngine", () => {
  it("exports a singleton with adjust()", () => {
    expect(eng).toBeInstanceOf(HeatTreatmentAwareSpeedFeedEngine);
    expect(typeof eng.adjust).toBe("function");
  });

  it("throws on missing material or regime", () => {
    expect(() => eng.adjust({} as HeatTreatSFInput)).toThrow(/material \+ heat_treat_regime/);
  });

  it("throws on non-positive baseline values", () => {
    expect(() => eng.adjust(nominal({ baseline_sfm: 0 }))).toThrow(/positive baseline/);
    expect(() => eng.adjust(nominal({ baseline_chip_load_mm_tooth: -0.01 }))).toThrow(/positive baseline/);
    expect(() => eng.adjust(nominal({ baseline_tool_life_min: 0 }))).toThrow(/positive baseline/);
  });

  it("throws on unknown regime", () => {
    expect(() => eng.adjust(nominal({ heat_treat_regime: "magic" as never })))
      .toThrow(/unknown regime/);
  });

  it("annealed regime preserves baseline (modifier=1.0)", () => {
    const r = eng.adjust(nominal({ heat_treat_regime: "annealed" }));
    expect(r.modifier).toBe(1.0);
    expect(r.adjusted_sfm.value).toBe(200);
    expect(r.adjusted_chip_load_mm_tooth.value).toBe(0.10);
    expect(r.adjusted_tool_life_min.value).toBe(60);
  });

  it("through_hardened (Rc 55+) → 0.35 modifier on SFM + chip", () => {
    const r = eng.adjust(nominal({ heat_treat_regime: "through_hardened" }));
    expect(r.modifier).toBe(0.35);
    expect(r.adjusted_sfm.value).toBeCloseTo(70, 1);  // 200 × 0.35
    expect(r.adjusted_chip_load_mm_tooth.value).toBeCloseTo(0.035, 4);
  });

  it("nitrided → 0.30 modifier (most aggressive)", () => {
    const r = eng.adjust(nominal({ heat_treat_regime: "nitrided" }));
    expect(r.modifier).toBe(0.30);
    expect(r.adjusted_sfm.value).toBeCloseTo(60, 1);
  });

  it("quenched_tempered (Rc 30-40) → 0.55 modifier", () => {
    const r = eng.adjust(nominal({ heat_treat_regime: "quenched_tempered" }));
    expect(r.modifier).toBe(0.55);
    expect(r.adjusted_sfm.value).toBeCloseTo(110, 1);
  });

  it("Taylor extension: lower modifier → longer tool life", () => {
    const ann = eng.adjust(nominal({ heat_treat_regime: "annealed", baseline_tool_life_min: 60, taylor_n: 0.25 }));
    const tha = eng.adjust(nominal({ heat_treat_regime: "through_hardened", baseline_tool_life_min: 60, taylor_n: 0.25 }));
    // T scales by modifier^(-1/n) = 0.35^(-4) ≈ 66.7 — life much longer at slower SFM
    expect(tha.adjusted_tool_life_min.value).toBeGreaterThan(ann.adjusted_tool_life_min.value);
  });

  it("hardness check passes for Rc 35 + quenched_tempered (within 28-45 band)", () => {
    const r = eng.adjust(nominal({ heat_treat_regime: "quenched_tempered", hardness: 35, hardness_scale: "HRC" }));
    expect(r.hardness_check_passed).toBe(true);
  });

  it("hardness check FAILS for Rc 25 + through_hardened (below 50 min)", () => {
    const r = eng.adjust(nominal({ heat_treat_regime: "through_hardened", hardness: 25, hardness_scale: "HRC" }));
    expect(r.hardness_check_passed).toBe(false);
    expect(r.warnings.some(w => /below regime through_hardened min/.test(w))).toBe(true);
  });

  it("hardness check FAILS for Rc 65 + quenched_tempered (above 45 max)", () => {
    const r = eng.adjust(nominal({ heat_treat_regime: "quenched_tempered", hardness: 65, hardness_scale: "HRC" }));
    expect(r.hardness_check_passed).toBe(false);
  });

  it("warns when no hardness reading provided", () => {
    const r = eng.adjust(nominal({ heat_treat_regime: "through_hardened" }));
    expect(r.warnings.some(w => /No hardness reading/.test(w))).toBe(true);
  });

  it("warns when modifier ≤ 0.40 (heavy regime — verify rigidity)", () => {
    const r = eng.adjust(nominal({ heat_treat_regime: "nitrided" }));
    expect(r.warnings.some(w => /verify rigidity/.test(w))).toBe(true);
  });

  it("works across all 7 regimes (annealed → nitrided)", () => {
    const regimes: HeatTreatSFInput["heat_treat_regime"][] = ["annealed", "normalized", "quenched_tempered", "through_hardened", "precip_hardened", "nitrided", "case_hardened"];
    for (const reg of regimes) {
      const r = eng.adjust(nominal({ heat_treat_regime: reg }));
      expect(r.modifier).toBeGreaterThan(0);
      expect(r.modifier).toBeLessThanOrEqual(1.0);
      expect(r.heat_treat_regime).toBe(reg);
    }
  });

  it("source cites Machinery's Handbook + Sandvik + ASM + Kennametal", () => {
    const r = eng.adjust(nominal());
    expect(r.source).toMatch(/Machinery's Handbook|Sandvik|ASM|Kennametal/);
  });

  // U-SFC-HEATTREAT-FIX: locks the inline->canonical de-inline + the NaN/finite baseline guard.
  // (The regime tables were migrated to physics/constants.ts CANONICAL_HEAT_TREAT_REGIME; an
  //  uncommitted half-done migration had left dangling REGIME_MODIFIERS refs -> adjust() threw
  //  ReferenceError live. And `x<=0` let NaN baselines through -> silent NaN speed/feed.)
  it("modifiers are sourced from canonical CANONICAL_HEAT_TREAT_REGIME (de-inline did not drift values)", () => {
    const regimes: HeatTreatSFInput["heat_treat_regime"][] = ["annealed", "normalized", "quenched_tempered", "through_hardened", "precip_hardened", "nitrided", "case_hardened"];
    for (const reg of regimes) {
      expect(eng.adjust(nominal({ heat_treat_regime: reg })).modifier).toBe(CANONICAL_HEAT_TREAT_REGIME[reg].modifier);
    }
  });

  it("rejects NaN baseline (R12: `x<=0` alone let NaN through -> silent NaN speed/feed output)", () => {
    expect(() => eng.adjust(nominal({ baseline_tool_life_min: Number.NaN }))).toThrow(/positive baseline/);
    expect(() => eng.adjust(nominal({ baseline_sfm: Number.NaN }))).toThrow(/positive baseline/);
  });

  it("rejects Infinity baseline (finite guard)", () => {
    expect(() => eng.adjust(nominal({ baseline_chip_load_mm_tooth: Number.POSITIVE_INFINITY }))).toThrow(/positive baseline/);
  });

  it("quenched_tempered tool life matches the exact Taylor extension value (60 * 0.55^-4 = 655.7 min)", () => {
    const r = eng.adjust(nominal({ baseline_tool_life_min: 60, heat_treat_regime: "quenched_tempered", taylor_n: 0.25 }));
    expect(r.adjusted_tool_life_min.value).toBeCloseTo(655.7, 0);
  });

  it("HRB over-hard for a soft regime (annealed max_hrb 90) -> hardness check fails + warns", () => {
    const r = eng.adjust(nominal({ heat_treat_regime: "annealed", hardness: 100, hardness_scale: "HRB" }));
    expect(r.hardness_check_passed).toBe(false);
    expect(r.warnings.some(w => /above regime/.test(w))).toBe(true);
  });
});
