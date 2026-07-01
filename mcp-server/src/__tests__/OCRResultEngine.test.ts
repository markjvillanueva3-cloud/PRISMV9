/**
 * OCRResultEngine tests — HCAP07.
 */
import { describe, it, expect } from "vitest";
import { OCRResultEngine, type OCRRegion } from "../engines/OCRResultEngine.js";

const region = (over: Partial<OCRRegion> & Pick<OCRRegion, "region_id">): OCRRegion => ({
  text: "x", confidence: 0.9, ...over,
});

describe("OCRResultEngine.summarize", () => {
  it("empty regions → zero summary", () => {
    const s = OCRResultEngine.summarize("doc", []);
    expect(s.region_count).toBe(0);
    expect(s.avg_confidence).toBe(0);
    expect(s.total_chars).toBe(0);
    expect(s.pages).toBe(0);
  });

  it("computes avg confidence exactly across 3 regions", () => {
    const s = OCRResultEngine.summarize("doc", [
      region({ region_id: "a", confidence: 0.9 }),
      region({ region_id: "b", confidence: 0.7 }),
      region({ region_id: "c", confidence: 0.5 }),
    ]);
    expect(s.avg_confidence).toBeCloseTo(0.7, 9);
  });

  it("flags low-confidence regions below default threshold (0.7)", () => {
    const s = OCRResultEngine.summarize("doc", [
      region({ region_id: "a", confidence: 0.9 }),
      region({ region_id: "b", confidence: 0.6 }),
      region({ region_id: "c", confidence: 0.5 }),
    ]);
    expect(s.low_confidence_count).toBe(2);
  });

  it("respects custom threshold", () => {
    const s = OCRResultEngine.summarize("doc", [
      region({ region_id: "a", confidence: 0.8 }),
      region({ region_id: "b", confidence: 0.95 }),
    ], 0.9);
    expect(s.low_confidence_count).toBe(1);
  });

  it("counts distinct pages from optional page field", () => {
    const s = OCRResultEngine.summarize("doc", [
      region({ region_id: "a", page: 1 }),
      region({ region_id: "b", page: 1 }),
      region({ region_id: "c", page: 3 }),
    ]);
    expect(s.pages).toBe(2);
  });

  it("throws on threshold outside [0,1]", () => {
    expect(() => OCRResultEngine.summarize("doc", [region({ region_id: "a" })], 1.5)).toThrow();
    expect(() => OCRResultEngine.summarize("doc", [region({ region_id: "a" })], -0.1)).toThrow();
  });

  it("throws on empty document_id", () => {
    expect(() => OCRResultEngine.summarize("", [])).toThrow();
  });

  it("rejects region with confidence > 1 (zod)", () => {
    expect(() => OCRResultEngine.summarize("doc", [region({ region_id: "a", confidence: 1.5 })])).toThrow();
  });
});

describe("OCRResultEngine.filterByConfidence + mergeText", () => {
  it("filterByConfidence keeps only regions ≥ threshold", () => {
    const regions = [
      region({ region_id: "a", confidence: 0.9, text: "high" }),
      region({ region_id: "b", confidence: 0.4, text: "low" }),
    ];
    const kept = OCRResultEngine.filterByConfidence(regions, 0.8);
    expect(kept.map((r) => r.text)).toEqual(["high"]);
  });

  it("mergeText concatenates in page→y order", () => {
    const regions = [
      region({ region_id: "a", text: "second", page: 2, bbox: { x: 0, y: 0, w: 1, h: 1 } }),
      region({ region_id: "b", text: "first-bottom", page: 1, bbox: { x: 0, y: 100, w: 1, h: 1 } }),
      region({ region_id: "c", text: "first-top", page: 1, bbox: { x: 0, y: 10, w: 1, h: 1 } }),
    ];
    expect(OCRResultEngine.mergeText(regions)).toBe("first-top\nfirst-bottom\nsecond");
  });

  it("renderSummary emits doc id + region count + avg_conf", () => {
    const s = OCRResultEngine.summarize("doc", [region({ region_id: "a", confidence: 0.95, text: "hello" })]);
    const md = OCRResultEngine.renderSummary(s);
    expect(md.includes("[OCR doc]")).toBe(true);
    expect(md.includes("regions=1")).toBe(true);
    expect(md.includes("avg_conf=0.950")).toBe(true);
  });
});
