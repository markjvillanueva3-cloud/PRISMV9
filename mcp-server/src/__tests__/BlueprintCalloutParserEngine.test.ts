/**
 * BlueprintCalloutParserEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-PRINT-PARSER
 */
import { describe, it, expect } from "vitest";
import { BlueprintCalloutParserEngine } from "../engines/BlueprintCalloutParserEngine.js";

const engine = new BlueprintCalloutParserEngine();

describe("BlueprintCalloutParserEngine", () => {

  it("parses ± dimension '12.5 ±0.05'", () => {
    const d = engine.parse_dim("12.5 ±0.05");
    expect(d?.nominal).toBeCloseTo(12.5, 3);
    expect(d?.upperTol).toBeCloseTo(0.05, 3);
    expect(d?.lowerTol).toBeCloseTo(0.05, 3);
  });

  it("parses split dimension '1.250 +.005/-.000'", () => {
    const d = engine.parse_dim("1.250 +.005/-.000");
    expect(d?.nominal).toBeCloseTo(1.250, 3);
    expect(d?.upperTol).toBeCloseTo(0.005, 4);
    expect(d?.lowerTol).toBeCloseTo(0.000, 4);
  });

  it("parses metric thread 'M6x1.0-6H'", () => {
    const t = engine.parse_thread("M6x1.0-6H");
    expect(t?.isMetric).toBe(true);
    expect(t?.nominalDiameterMm).toBeCloseTo(6, 3);
    expect(t?.pitch).toBeCloseTo(1.0, 3);
    expect(t?.class).toBe("6H");
  });

  it("parses imperial fractional thread '1/4-20 UNC-2B'", () => {
    const t = engine.parse_thread("1/4-20 UNC-2B");
    expect(t?.isMetric).toBe(false);
    expect(t?.nominalDiameterMm).toBeCloseTo(0.25 * 25.4, 3);
    expect(t?.pitch).toBe(20);
    expect(t?.class).toBe("2B");
  });

  it("parses imperial decimal thread '.500-13 UNC'", () => {
    const t = engine.parse_thread(".500-13 UNC");
    expect(t?.nominalDiameterMm).toBeCloseTo(0.5 * 25.4, 3);
    expect(t?.pitch).toBe(13);
  });

  it("parses surface finish 'Ra 0.8'", () => {
    const result = engine.parse("Surface finish: Ra 0.8 elsewhere Ra 1.6");
    expect(result.surfaceFinishes.length).toBe(2);
    expect(result.surfaceFinishes[0].raMicrometers).toBeCloseTo(0.8, 2);
    expect(result.surfaceFinishes[1].raMicrometers).toBeCloseTo(1.6, 2);
  });

  it("extracts position GDT '⌖ 0.05 MMC A B'", () => {
    const result = engine.parse("⌖ 0.05 MMC A B");
    expect(result.gdt.length).toBeGreaterThanOrEqual(1);
    const pos = result.gdt.find((g) => g.type === "position");
    expect(pos?.tolerance).toBeCloseTo(0.05, 3);
    expect(pos?.modifier).toBe("MMC");
    expect(pos?.datums).toEqual(["A", "B"]);
  });

  it("extracts flatness GDT '⏥ 0.02'", () => {
    const result = engine.parse("⏥ 0.02");
    const flat = result.gdt.find((g) => g.type === "flatness");
    expect(flat?.tolerance).toBeCloseTo(0.02, 3);
  });

  it("extracts material 'AISI 1045'", () => {
    const result = engine.parse("MATERIAL: AISI 1045\nFINISH: anodize");
    expect(result.materialSpec).toMatch(/AISI\s+1045/i);
  });

  it("extracts material 'Ti-6Al-4V'", () => {
    const result = engine.parse("MATERIAL: Ti-6Al-4V Grade 5\nNotes...");
    expect(result.materialSpec).toMatch(/Ti-6Al-4V/);
  });

  it("extracts title-block partNumber, revision, scale", () => {
    const text = `PART NUMBER: PRT-001\nREVISION: B\nSCALE: 1:1\nMATERIAL: 6061-T6\nFINISH: anodize\n`;
    const r = engine.parse(text);
    expect(r.titleBlock.partNumber).toBe("PRT-001");
    expect(r.titleBlock.revision).toBe("B");
    expect(r.titleBlock.scale).toBe("1:1");
    expect(r.titleBlock.material).toMatch(/6061-T6/);
  });

  it("extracts multiple dimensions in one document", () => {
    const r = engine.parse("Dim1: 1.250 +.005/-.000\nDim2: 0.500 ±0.001\nDim3: 2.000 ±0.005");
    expect(r.dimensions.length).toBe(3);
  });

  it("extracts both metric AND imperial threads in same document", () => {
    const r = engine.parse("Thread A: M8x1.25\nThread B: 5/16-18 UNC-2B");
    expect(r.threads.length).toBe(2);
    expect(r.threads.some((t) => t.isMetric)).toBe(true);
    expect(r.threads.some((t) => !t.isMetric)).toBe(true);
  });

  it("empty text → empty parse result", () => {
    const r = engine.parse("");
    expect(r.dimensions.length).toBe(0);
    expect(r.gdt.length).toBe(0);
    expect(r.threads.length).toBe(0);
    expect(r.surfaceFinishes.length).toBe(0);
    expect(typeof r.materialSpec === "undefined").toBe(true);
  });

  it("text with no recognized patterns returns empty parse", () => {
    const r = engine.parse("Lorem ipsum dolor sit amet, no callouts here.");
    expect(r.dimensions.length).toBe(0);
    expect(r.threads.length).toBe(0);
    expect(r.gdt.length).toBe(0);
  });

  it("invalid dim string → null from parse_dim", () => {
    expect(engine.parse_dim("not a dimension")).toBeNull();
  });

  it("invalid thread string → null from parse_thread", () => {
    expect(engine.parse_thread("hello world")).toBeNull();
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes parse + parse_dim + parse_thread", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("parse");
    expect(names).toContain("parse_dim");
    expect(names).toContain("parse_thread");
  });
});
