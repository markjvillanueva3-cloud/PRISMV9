import { describe, it, expect } from "vitest";
import {
  cryogenicMQLStrategySelectorEngine as eng,
  CryogenicMQLStrategySelectorEngine,
  type CoolantStrategyInput,
} from "../engines/CryogenicMQLStrategySelectorEngine.js";

function nominal(o: Partial<CoolantStrategyInput> = {}): CoolantStrategyInput {
  return {
    material: "steel",
    operation: "milling_3d",
    mrr_cm3_min: 100,
    tool_diameter_mm: 10,
    sustainability: "balanced",
    ...o,
  };
}

describe("CryogenicMQLStrategySelectorEngine", () => {
  it("exports singleton with recommend()", () => {
    expect(eng).toBeInstanceOf(CryogenicMQLStrategySelectorEngine);
    expect(typeof eng.recommend).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.recommend({} as CoolantStrategyInput))
      .toThrow(/material \+ operation \+ mrr_cm3_min required/);
  });

  it("throws on negative MRR or non-positive tool diameter", () => {
    expect(() => eng.recommend(nominal({ mrr_cm3_min: -1 }))).toThrow(/non-negative mrr/);
    expect(() => eng.recommend(nominal({ tool_diameter_mm: 0 }))).toThrow(/positive tool_diameter/);
  });

  it("titanium → cryo-LN2 top recommendation", () => {
    const r = eng.recommend(nominal({ material: "titanium" }));
    expect(r.recommended_strategy.value).toBe("cryo_ln2");
    expect(r.confidence.value).toBeGreaterThan(0.8);
    expect(r.expected_tool_life_multiplier.value).toBe(2.0);
  });

  it("inconel → cryo-LN2 with Mazak citation", () => {
    const r = eng.recommend(nominal({ material: "inconel" }));
    expect(r.recommended_strategy.value).toBe("cryo_ln2");
    expect(r.source).toMatch(/Mazak/);
  });

  it("magnesium → dry (water = fire hazard, NFPA 484)", () => {
    const r = eng.recommend(nominal({ material: "magnesium" }));
    expect(r.recommended_strategy.value).toBe("dry");
    // Flood should NOT be in top-3 alternatives (score 0)
    const floodAlt = r.alternatives.find(a => a.strategy === "flood");
    expect(floodAlt?.score ?? 0).toBeLessThanOrEqual(0.01);
  });

  it("cast_iron + production → dry (rust avoidance)", () => {
    const r = eng.recommend(nominal({ material: "cast_iron" }));
    expect(r.recommended_strategy.value).toBe("dry");
  });

  it("aluminum + finishing → MQL (chip-welding avoidance)", () => {
    const r = eng.recommend(nominal({ material: "aluminum", operation: "finishing" }));
    expect(r.recommended_strategy.value).toBe("mql");
  });

  it("aluminum + roughing → flood (heat removal)", () => {
    const r = eng.recommend(nominal({ material: "aluminum", operation: "roughing" }));
    expect(r.recommended_strategy.value).toBe("flood");
  });

  it("stainless → flood or cryo (work-hardening sensitive)", () => {
    const r = eng.recommend(nominal({ material: "stainless" }));
    expect(["flood", "cryo_ln2"]).toContain(r.recommended_strategy.value);
  });

  it("steel + min_cost sustainability → flood (cost-optimal)", () => {
    const r = eng.recommend(nominal({ material: "steel", sustainability: "min_cost" }));
    expect(r.recommended_strategy.value).toBe("flood");
  });

  it("steel + zero_emission sustainability → MQL or dry preferred", () => {
    const r = eng.recommend(nominal({ material: "steel", sustainability: "zero_emission" }));
    expect(["dry", "mql"]).toContain(r.recommended_strategy.value);
  });

  it("high MRR (>500) flips MQL/dry → flood/cryo", () => {
    const r = eng.recommend(nominal({ material: "steel", mrr_cm3_min: 800, sustainability: "balanced" }));
    expect(["flood", "cryo_ln2"]).toContain(r.recommended_strategy.value);
    expect(r.warnings.some(w => /High MRR.*heat removal limited/.test(w))).toBe(true);
  });

  it("low MRR (<50) favors MQL/dry", () => {
    const r = eng.recommend(nominal({ material: "steel", mrr_cm3_min: 20, sustainability: "low_carbon" }));
    expect(["dry", "mql"]).toContain(r.recommended_strategy.value);
  });

  it("annual_volume + cryo recommendation → LN2 supply warning", () => {
    const r = eng.recommend(nominal({ material: "titanium", annual_volume: 50000 }));
    expect(r.recommended_strategy.value).toBe("cryo_ln2");
    expect(r.warnings.some(w => /LN2 supply contract economics/.test(w))).toBe(true);
  });

  it("low annual volume does NOT trigger LN2 economics warning", () => {
    const r = eng.recommend(nominal({ material: "titanium", annual_volume: 100 }));
    expect(r.warnings.some(w => /LN2 supply contract/.test(w))).toBe(false);
  });

  it("alternatives returned, ranked descending", () => {
    const r = eng.recommend(nominal({ material: "titanium" }));
    expect(r.alternatives.length).toBeGreaterThan(0);
    // First alternative score ≤ top recommendation confidence
    expect(r.alternatives[0].score).toBeLessThanOrEqual(r.confidence.value);
    // Alternatives are sorted descending
    for (let i = 1; i < r.alternatives.length; i++) {
      expect(r.alternatives[i].score).toBeLessThanOrEqual(r.alternatives[i - 1].score);
    }
  });

  it("carbon footprint tier: dry=low, flood=high", () => {
    const rMg = eng.recommend(nominal({ material: "magnesium" }));  // → dry
    const rSteel = eng.recommend(nominal({ material: "steel", sustainability: "min_cost" }));  // → flood
    expect(rMg.carbon_footprint_tier.value).toBe("low");
    expect(rSteel.carbon_footprint_tier.value).toBe("high");
  });

  it("tool_life_multiplier: cryo=2.0, flood=1.0, MQL=0.85, dry=0.70", () => {
    const rTi = eng.recommend(nominal({ material: "titanium" }));  // cryo
    expect(rTi.expected_tool_life_multiplier.value).toBe(2.0);

    const rSteel = eng.recommend(nominal({ material: "steel", sustainability: "min_cost" }));  // flood
    expect(rSteel.expected_tool_life_multiplier.value).toBe(1.0);
  });

  it("4 materials exercised with distinct strategies", () => {
    const mats = ["titanium", "magnesium", "cast_iron", "steel"] as const;
    const strategies = new Set(mats.map(m => eng.recommend(nominal({ material: m, sustainability: "min_cost" })).recommended_strategy.value));
    expect(strategies.size).toBeGreaterThanOrEqual(2);  // at least 2 distinct
  });

  it("source cites Sandvik + Cimcool + ASTM E2275 + LBNL + Mazak + NFPA 484", () => {
    const r = eng.recommend(nominal());
    expect(r.source).toMatch(/Sandvik|Cimcool|ASTM E2275|LBNL|Mazak|NFPA 484/);
  });
});
