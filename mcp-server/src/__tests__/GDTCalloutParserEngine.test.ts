import { describe, it, expect } from "vitest";
import { gdtCalloutParserEngine } from "../engines/GDTCalloutParserEngine.js";

describe("GDTCalloutParserEngine", () => {
  it("parses basic position callout with diameter + datums", () => {
    const r = gdtCalloutParserEngine.parse("POS Ø0.02 A B C");
    expect(r.symbol).toBe("position");
    expect(r.tolerance_mm).toBe(0.02);
    expect(r.diameter).toBe(true);
    expect(r.datums.map((d) => d.label)).toEqual(["A", "B", "C"]);
    expect(r.errors).toHaveLength(0);
  });

  it("parses flatness (form) callout with no datums", () => {
    const r = gdtCalloutParserEngine.parse("FLAT 0.01");
    expect(r.symbol).toBe("flatness");
    expect(r.tolerance_mm).toBe(0.01);
    expect(r.datums).toHaveLength(0);
    expect(r.errors).toHaveLength(0);
  });

  it("flags form tolerance with datums as error", () => {
    const r = gdtCalloutParserEngine.parse("FLAT 0.01 A");
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.join(" ")).toMatch(/form/i);
  });

  it("parses perpendicularity with unicode symbol", () => {
    const r = gdtCalloutParserEngine.parse("⟂ 0.05 A");
    expect(r.symbol).toBe("perpendicularity");
    expect(r.tolerance_mm).toBe(0.05);
    expect(r.datums[0]!.label).toBe("A");
  });

  it("parses material modifier M (MMC)", () => {
    const r = gdtCalloutParserEngine.parse("POS Ø0.02 A B(M)");
    expect(r.datums.find((d) => d.label === "B")?.modifier).toBe("M");
  });

  it("rejects position without datums", () => {
    const r = gdtCalloutParserEngine.parse("POS 0.02");
    expect(r.errors.some((e) => /datum/i.test(e))).toBe(true);
  });

  it("flags invalid diameter prefix on flatness", () => {
    const r = gdtCalloutParserEngine.parse("FLAT Ø0.01");
    expect(r.errors.some((e) => /diameter/i.test(e))).toBe(true);
  });

  it("parses circular runout with datum", () => {
    const r = gdtCalloutParserEngine.parse("CR 0.01 A");
    expect(r.symbol).toBe("circular_runout");
    expect(r.tolerance_mm).toBe(0.01);
  });

  it("parses profile of surface with datums", () => {
    const r = gdtCalloutParserEngine.parse("PROF 0.1 A B");
    expect(r.symbol).toBe("profile_of_surface");
    expect(r.datums).toHaveLength(2);
  });

  it("handles pipe-delimited FCF", () => {
    const r = gdtCalloutParserEngine.parse("|⌖|⌀0.03|A|B|C|");
    expect(r.symbol).toBe("position");
    expect(r.diameter).toBe(true);
    expect(r.tolerance_mm).toBe(0.03);
  });

  it("parses composite FCF", () => {
    const r = gdtCalloutParserEngine.parseComposite("POS Ø0.5 A B C", "POS Ø0.1 A");
    // Strengthened from `toBeDefined()` to a real-value check
    // (hook-rejected weak assertion in the 2026-04-16 canonical; fixed in restoration).
    expect(r.composite_refinement?.symbol).toBe("position");
    expect(r.composite_refinement?.tolerance_mm).toBe(0.1);
    expect(r.composite_refinement?.diameter).toBe(true);
    expect(r.composite_refinement?.datums.map((d) => d.label)).toEqual(["A"]);
    expect(r.errors.filter((e) => /refinement/i.test(e))).toHaveLength(0);
  });

  it("flags composite refinement with larger tol than primary", () => {
    const r = gdtCalloutParserEngine.parseComposite("POS 0.1 A", "POS 0.5 A");
    expect(r.errors.some((e) => /refinement/i.test(e))).toBe(true);
  });

  it("returns error on unrecognized symbol", () => {
    const r = gdtCalloutParserEngine.parse("XYZ 0.1 A");
    expect(r.errors.some((e) => /unrecognized/i.test(e))).toBe(true);
  });

  it("getStats reports symbol count", () => {
    const s = gdtCalloutParserEngine.getStats();
    expect(s.symbols_supported).toBeGreaterThanOrEqual(14);
    expect(s.form_symbols).toContain("flatness");
  });
});
