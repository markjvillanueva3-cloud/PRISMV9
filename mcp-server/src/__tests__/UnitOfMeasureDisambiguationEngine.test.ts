/**
 * Tests — UnitOfMeasureDisambiguationEngine (CAD-COMPLETE-MS0 / U-AI-03)
 *
 * Reference conversions use the exact international inch (1 in = 25.4 mm).
 */
import { describe, it, expect } from "vitest";
import {
  UnitOfMeasureDisambiguationEngine,
  unitOfMeasureDisambiguationEngine,
} from "../engines/UnitOfMeasureDisambiguationEngine.js";

describe("UnitOfMeasureDisambiguationEngine — explicit units", () => {
  const e = new UnitOfMeasureDisambiguationEngine();

  it("resolves an explicit inch value to mm", () => {
    const r = e.resolve("2 in");
    expect(r.valueMm).toBe(50.8);
    expect(r.unitSystem).toBe("imperial");
    expect(r.basis).toBe("explicit");
    expect(r.confidence).toBeGreaterThan(0.95);
    expect(r.clarificationNeeded).toBe(false);
  });

  it("resolves an explicit mm value unchanged", () => {
    const r = e.resolve("50mm");
    expect(r.valueMm).toBe(50);
    expect(r.unitSystem).toBe("metric");
    expect(r.basis).toBe("explicit");
  });

  it("handles a unicode double-prime as inch", () => {
    const r = e.resolve('0.5"');
    expect(r.valueMm).toBe(12.7);
    expect(r.unitSystem).toBe("imperial");
  });

  it("converts feet", () => {
    expect(e.resolve("2 ft").valueMm).toBe(609.6);
  });

  it("converts thou", () => {
    expect(e.resolve("5 thou").valueMm).toBe(0.127);
  });

  it("converts centimetres and metres", () => {
    expect(e.resolve("3 cm").valueMm).toBe(30);
    expect(e.resolve("1.5 m").valueMm).toBe(1500);
  });

  it("parses a simple fraction with a unit", () => {
    const r = e.resolve("1/2 inch");
    expect(r.valueMm).toBe(12.7);
    expect(r.basis).toBe("explicit");
  });

  it("parses a mixed number", () => {
    expect(e.resolve("1 1/2 in").valueMm).toBe(38.1);
  });

  it("accepts a comma decimal separator", () => {
    expect(e.resolve("2,5 mm").valueMm).toBe(2.5);
  });
});

describe("UnitOfMeasureDisambiguationEngine — implicit units", () => {
  const e = new UnitOfMeasureDisambiguationEngine();

  it("uses the document default when no unit is given", () => {
    const r = e.resolve("10", { documentUnit: "metric" });
    expect(r.valueMm).toBe(10);
    expect(r.basis).toBe("document-default");
    expect(r.confidence).toBeCloseTo(0.85, 5);
    expect(r.clarificationNeeded).toBe(false);
  });

  it("applies the inch factor for an imperial document default", () => {
    const r = e.resolve("0.5", { documentUnit: "imperial" });
    expect(r.valueMm).toBe(12.7);
    expect(r.basis).toBe("document-default");
  });

  it("falls back to prior-value consistency when no document default", () => {
    const r = e.resolve("2", { priorUnitSystem: "imperial" });
    expect(r.valueMm).toBe(50.8);
    expect(r.basis).toBe("prior-consistency");
    expect(r.confidence).toBeCloseTo(0.7, 5);
  });

  it("flags a bare number with zero context as ambiguous, never silent", () => {
    const r = e.resolve("0.005");
    expect(r.basis).toBe("magnitude-heuristic");
    expect(r.ambiguous).toBe(true);
    expect(r.clarificationNeeded).toBe(true);
    expect(r.suggestedClarification).toMatch(/confirm/i);
    expect(r.valueMm).not.toBeNull();
  });

  it("skews high-decimal-precision bare numbers toward imperial", () => {
    const r = e.resolve("1.250");
    expect(r.unitSystem).toBe("imperial");
    expect(r.ambiguous).toBe(true);
  });
});

describe("UnitOfMeasureDisambiguationEngine — unparseable input", () => {
  const e = new UnitOfMeasureDisambiguationEngine();

  it("returns confidence 0 + clarification for empty input", () => {
    const r = e.resolve("");
    expect(r.valueMm).toBeNull();
    expect(r.confidence).toBe(0);
    expect(r.basis).toBe("unparseable");
    expect(r.clarificationNeeded).toBe(true);
  });

  it("rejects free text with an unknown trailing token", () => {
    const r = e.resolve("12 widgets");
    expect(r.basis).toBe("unparseable");
    expect(r.valueMm).toBeNull();
  });

  it("rejects pure non-numeric text", () => {
    expect(e.resolve("abc").valueMm).toBeNull();
  });
});

describe("UnitOfMeasureDisambiguationEngine — convert + batch", () => {
  const e = new UnitOfMeasureDisambiguationEngine();

  it("convert is exact in both directions", () => {
    expect(e.convert(1, "in", "mm")).toBe(25.4);
    expect(e.convert(25.4, "mm", "in")).toBe(1);
    expect(e.convert(7, "mm", "mm")).toBe(7);
  });

  it("convert rejects non-finite input", () => {
    expect(() => e.convert(NaN, "in", "mm")).toThrow();
  });

  it("batch lets an explicit value anchor the unit for later implicit values", () => {
    const rs = e.resolveBatch(["2 in", "3", "4"]);
    expect(rs[0].basis).toBe("explicit");
    expect(rs[1].unitSystem).toBe("imperial");
    expect(rs[1].basis).toBe("prior-consistency");
    expect(rs[1].valueMm).toBe(76.2);
    expect(rs[2].valueMm).toBe(101.6);
  });

  it("exports a shared singleton", () => {
    expect(unitOfMeasureDisambiguationEngine).toBeInstanceOf(UnitOfMeasureDisambiguationEngine);
  });
});

describe("UnitOfMeasureDisambiguationEngine — regression: trailing-token anchoring + input traits", () => {
  const e = new UnitOfMeasureDisambiguationEngine();

  // A non-unit word ending in 'm' must NOT resolve as metres — this was a
  // 0.98-confidence silent mis-guess before the unit regexes were ^-anchored.
  it("rejects 'datum' as a metre token", () => {
    const r = e.resolve("5 datum");
    expect(r.basis).toBe("unparseable");
    expect(r.valueMm).toBeNull();
  });

  // A non-unit word ending in 'in' must NOT resolve as inches.
  it("rejects 'min' as an inch token", () => {
    const r = e.resolve("5 min");
    expect(r.basis).toBe("unparseable");
    expect(r.valueMm).toBeNull();
  });

  it("rejects 'rpm' as a unit token", () => {
    expect(e.resolve("5 rpm").basis).toBe("unparseable");
  });

  it("warns in the reasoning trail when a comma was read as a decimal point", () => {
    const r = e.resolve("2,5 mm");
    expect(r.valueMm).toBe(2.5);
    expect(r.reasoning.some((line) => line.toLowerCase().includes("comma"))).toBe(true);
  });

  it("flags a negative dimensional value in the reasoning trail", () => {
    const r = e.resolve("-5 mm");
    expect(r.valueMm).toBe(-5);
    expect(r.reasoning.some((line) => line.toLowerCase().includes("negative"))).toBe(true);
  });
});
