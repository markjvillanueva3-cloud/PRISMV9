/**
 * CAMISO286FitClassifierEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-FIT-CLASSIFY
 */
import { describe, it, expect } from "vitest";
import { CAMISO286FitClassifierEngine } from "../engines/CAMISO286FitClassifierEngine.js";

const engine = new CAMISO286FitClassifierEngine();

describe("CAMISO286FitClassifierEngine", () => {

  it("12mm H7 hole: +0.018/-0 → IT7 + H letter", () => {
    // ISO 286: 10-18mm IT7 = 18 µm
    const r = engine.classify(12, 0.018, 0);
    expect(r.itGrade).toBe(7);
    expect(r.fit).toBe("H7");
    expect(r.sizeBandMm).toBe("10-18");
    expect(r.unilateral).toBe(true);
  });

  it("12mm h6 shaft: 0/-0.011 → IT6 + h letter", () => {
    // 10-18mm IT6 = 11 µm
    const r = engine.classify(12, 0, 0.011);
    expect(r.itGrade).toBe(6);
    expect(r.fit).toBe("h6");
  });

  it("25mm H8: +0.033/-0 → IT8 + H", () => {
    // 18-30mm IT8 = 33 µm
    const r = engine.classify(25, 0.033, 0);
    expect(r.itGrade).toBe(8);
    expect(r.fit).toBe("H8");
    expect(r.sizeBandMm).toBe("18-30");
  });

  it("50mm IT11 large bilateral: ±0.080 → IT11 (total 160µm)", () => {
    // 30-50mm IT11 = 160 µm
    const r = engine.classify(50, 0.080, 0.080);
    expect(r.itGrade).toBe(11);
  });

  it("100mm IT12 coarse: +0.350/-0 → IT12", () => {
    // 80-120 IT12 = 350 µm
    const r = engine.classify(100, 0.350, 0);
    expect(r.itGrade).toBe(12);
  });

  it("symmetric bilateral → Js letter", () => {
    const r = engine.classify(20, 0.010, 0.010);
    expect(r.fit?.startsWith("Js")).toBe(true);
  });

  it("upper-skewed bilateral → g letter (clearance shaft)", () => {
    const r = engine.classify(20, 0.020, 0.005);
    expect(r.fit?.startsWith("g")).toBe(true);
  });

  it("lower-skewed bilateral → K letter (interference hole)", () => {
    const r = engine.classify(20, 0.005, 0.020);
    expect(r.fit?.startsWith("K")).toBe(true);
  });

  it("out-of-range nominal (>500mm) returns null grade + reason", () => {
    const r = engine.classify(600, 0.020, 0);
    expect(r.itGrade).toBeNull();
    expect(r.fit).toBeNull();
    expect(r.sizeBandMm).toBe("out-of-range");
    expect(r.rationale).toMatch(/outside|range/i);
  });

  it("nominal 3mm exact boundary lands in 0-3 band (upTo inclusive)", () => {
    const r = engine.classify(3, 0.010, 0);
    expect(r.sizeBandMm).toBe("0-3");
  });

  it("nominal just above 3mm (3.01) lands in 3-6 band", () => {
    const r = engine.classify(3.01, 0.010, 0);
    expect(r.sizeBandMm).toBe("3-6");
  });

  it("size_bands() returns 13 standard bands", () => {
    const bands = engine.size_bands();
    expect(bands.length).toBe(13);
    expect(bands[0].label).toBe("0-3");
    expect(bands[12].label).toBe("400-500");
  });

  it("it_values('10-18') returns 8-grade table", () => {
    const v = engine.it_values("10-18");
    expect(v).not.toBeNull();
    expect(v![5]).toBe(8);
    expect(v![7]).toBe(18);
    expect(v![11]).toBe(110);
  });

  it("it_values for unknown band → null (no fabrication)", () => {
    expect(engine.it_values("nonexistent")).toBeNull();
  });

  it("rationale string contains nominal + band + IT grade", () => {
    const r = engine.classify(12, 0.018, 0);
    expect(r.rationale).toMatch(/12/);
    expect(r.rationale).toMatch(/10-18/);
    expect(r.rationale).toMatch(/IT7/);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes classify + size_bands + it_values", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("classify");
    expect(names).toContain("size_bands");
    expect(names).toContain("it_values");
  });
});
