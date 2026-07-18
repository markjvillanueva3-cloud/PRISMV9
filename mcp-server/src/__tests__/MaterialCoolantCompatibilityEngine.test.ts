import { describe, it, expect } from "vitest";
import {
  materialCoolantCompatibilityEngine as eng,
  MaterialCoolantCompatibilityEngine,
  type MaterialCoolantInput,
} from "../engines/MaterialCoolantCompatibilityEngine.js";

function nominal(o: Partial<MaterialCoolantInput> = {}): MaterialCoolantInput {
  return {
    material: "steel",
    coolant: "soluble_oil",
    ...o,
  };
}

describe("MaterialCoolantCompatibilityEngine", () => {
  it("exports a singleton with check()", () => {
    expect(eng).toBeInstanceOf(MaterialCoolantCompatibilityEngine);
    expect(typeof eng.check).toBe("function");
  });

  it("throws on missing material or coolant", () => {
    expect(() => eng.check({} as MaterialCoolantInput)).toThrow(/material \+ coolant required/);
    expect(() => eng.check({ material: "steel" } as MaterialCoolantInput)).toThrow(/material \+ coolant required/);
  });

  it("steel + soluble_oil → compatible (preferred match)", () => {
    const r = eng.check(nominal());
    expect(r.verdict).toBe("compatible");
    expect(r.score.value).toBe(1.0);
    expect(r.failure_mechanisms).toEqual([]);
    expect(r.recommended_alternative).toBeNull();
  });

  it("magnesium + water-base coolant → UNSAFE (NFPA 484 fire hazard)", () => {
    const r = eng.check(nominal({ material: "magnesium", coolant: "synthetic" }));
    expect(r.verdict).toBe("unsafe");
    expect(r.score.value).toBe(0);
    expect(r.failure_mechanisms.some(m => /H₂|fire|NFPA/.test(m))).toBe(true);
    expect(r.recommended_alternative).toBe("neat_oil");
  });

  it("magnesium + neat_oil → compatible_with_caveat (correct preferred)", () => {
    const r = eng.check(nominal({ material: "magnesium", coolant: "neat_oil" }));
    expect(r.verdict).toBe("compatible_with_caveat");
    expect(r.warnings.some(w => /ignites|NFPA/.test(w))).toBe(true);
  });

  it("aluminum + chloride > 50ppm → incompatible (pitting)", () => {
    const r = eng.check(nominal({ material: "aluminum", coolant: "synthetic", chloride_ppm: 120 }));
    expect(r.verdict).toBe("incompatible");
    expect(r.failure_mechanisms.some(m => /Cl|pitting/.test(m))).toBe(true);
    expect(r.score.value).toBeLessThanOrEqual(0.3);
  });

  it("aluminum + soluble_oil with default chloride → caveat about <50 ppm chloride", () => {
    const r = eng.check(nominal({ material: "aluminum", coolant: "soluble_oil" }));
    expect(r.verdict).toBe("compatible_with_caveat");
    expect(r.warnings.some(w => /chloride/.test(w))).toBe(true);
    expect(r.recommended_alternative).toBe("synthetic");
  });

  it("titanium + sulfur > 100 mg/kg → incompatible (α-case SCC)", () => {
    const r = eng.check(nominal({ material: "titanium", coolant: "synthetic", sulfur_mg_kg: 250 }));
    expect(r.verdict).toBe("incompatible");
    expect(r.failure_mechanisms.some(m => /SCC|α-case|sulfur/i.test(m))).toBe(true);
  });

  it("titanium + neat_oil EP additives → caveat about SCC", () => {
    const r = eng.check(nominal({ material: "titanium", coolant: "neat_oil" }));
    expect(r.verdict).toBe("compatible_with_caveat");
    expect(r.warnings.some(w => /sulfur|EP additives|stress-corrosion/.test(w))).toBe(true);
  });

  it("stainless + pH < 8 → compatible_with_caveat (HAZ pitting)", () => {
    const r = eng.check(nominal({ material: "stainless", coolant: "semi_synthetic", ph: 7.5 }));
    expect(r.verdict).toBe("compatible_with_caveat");
    expect(r.failure_mechanisms.some(m => /pH|pitting|HAZ/.test(m))).toBe(true);
  });

  it("cast_iron + dwell > 4h + soluble_oil → rust inhibitor warning", () => {
    const r = eng.check(nominal({ material: "cast_iron", coolant: "soluble_oil", dwell_hours: 8 }));
    expect(r.warnings.some(w => /rust inhibitor/i.test(w))).toBe(true);
  });

  it("cast_iron + flood_water_only → caveat (rust within 2h)", () => {
    const r = eng.check(nominal({ material: "cast_iron", coolant: "flood_water_only" }));
    expect(r.verdict).toBe("compatible_with_caveat");
    expect(r.warnings.some(w => /rust/i.test(w))).toBe(true);
  });

  it("inconel + neat_oil → caveat (low thermal-conductivity)", () => {
    const r = eng.check(nominal({ material: "inconel", coolant: "neat_oil" }));
    expect(r.verdict).toBe("compatible_with_caveat");
    expect(r.warnings.some(w => /thermal/.test(w))).toBe(true);
    expect(r.recommended_alternative).toBe("synthetic");
  });

  it("copper + soluble_oil → caveat about amine attack", () => {
    const r = eng.check(nominal({ material: "copper", coolant: "soluble_oil" }));
    expect(r.verdict).toBe("compatible_with_caveat");
    expect(r.warnings.some(w => /amine/.test(w))).toBe(true);
  });

  it("brass + synthetic → fully compatible (preferred)", () => {
    const r = eng.check(nominal({ material: "brass", coolant: "synthetic" }));
    expect(r.verdict).toBe("compatible");
    expect(r.recommended_alternative).toBeNull();
  });

  it("source cites Cimcool + Master Fluid + Sandvik + ISO 6743-7", () => {
    const r = eng.check(nominal());
    expect(r.source).toMatch(/Cimcool|Master Fluid|Sandvik|ISO 6743-7/);
  });
});
