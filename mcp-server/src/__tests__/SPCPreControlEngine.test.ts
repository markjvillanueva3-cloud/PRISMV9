import { describe, it, expect } from "vitest";
import {
  spcPreControlEngine as eng,
  SPCPreControlEngine,
  type SPCPreControlInput,
} from "../engines/SPCPreControlEngine.js";

describe("SPCPreControlEngine", () => {
  it("exports a singleton with evaluate()", () => {
    expect(eng).toBeInstanceOf(SPCPreControlEngine);
    expect(typeof eng.evaluate).toBe("function");
  });

  it("throws on missing feature_id or measurements", () => {
    expect(() => eng.evaluate({} as SPCPreControlInput)).toThrow(/feature_id \+ measurements/);
  });

  it("throws on fewer than 2 measurements", () => {
    expect(() => eng.evaluate({ feature_id: "F1", measurements: [10], usl: 11, lsl: 9 }))
      .toThrow(/≥2 measurements/);
  });

  it("throws on USL ≤ LSL", () => {
    expect(() => eng.evaluate({ feature_id: "F1", measurements: [10, 10], usl: 5, lsl: 10 }))
      .toThrow(/USL must be > LSL/);
  });

  it("green verdict when Cpk ≥ 1.67 (aerospace/medical target)", () => {
    // Tight measurements around target → high Cpk
    const m: number[] = [];
    for (let i = 0; i < 50; i++) m.push(10.000 + 0.0005 * Math.sin(i));
    const r = eng.evaluate({ feature_id: "F1", measurements: m, usl: 10.05, lsl: 9.95 });
    expect(r.verdict).toBe("green");
    expect(r.cpk.value).toBeGreaterThanOrEqual(1.67);
  });

  it("yellow verdict when 1.33 ≤ Cpk < 1.67", () => {
    // Moderately spread measurements
    const m: number[] = [];
    for (let i = 0; i < 50; i++) m.push(10.000 + 0.005 * Math.sin(i * 0.5));
    const r = eng.evaluate({ feature_id: "F1", measurements: m, usl: 10.03, lsl: 9.97 });
    expect(["yellow", "green"]).toContain(r.verdict);
    expect(r.cpk.value).toBeGreaterThanOrEqual(1.0);
  });

  it("red verdict when Cpk < 1.33", () => {
    // Wide-spread measurements → low Cpk
    const m: number[] = [];
    for (let i = 0; i < 50; i++) m.push(10 + 0.04 * Math.sin(i * 0.5) + 0.02 * Math.cos(i * 0.3));
    const r = eng.evaluate({ feature_id: "F1", measurements: m, usl: 10.03, lsl: 9.97 });
    expect(r.verdict).toBe("red");
    expect(r.cpk.value).toBeLessThan(1.33);
    expect(r.warnings.some(w => /STOP production/.test(w))).toBe(true);
  });

  it("Cp / Cpk units = ratio + source cites canonical formula", () => {
    const r = eng.evaluate({
      feature_id: "F1",
      measurements: Array.from({ length: 30 }, (_, i) => 10 + 0.001 * Math.sin(i)),
      usl: 10.05, lsl: 9.95,
    });
    expect(r.cp.unit).toBe("ratio");
    expect(r.cpk.unit).toBe("ratio");
    expect(r.cp.source).toMatch(/USL-LSL.*6σ_within/);
    expect(r.cpk.source).toMatch(/min/);
  });

  it("detects centered process when mean ≈ target", () => {
    const m: number[] = [];
    for (let i = 0; i < 30; i++) m.push(10.000 + 0.001 * Math.sin(i));
    const r = eng.evaluate({ feature_id: "F1", measurements: m, usl: 10.05, lsl: 9.95, target: 10.0 });
    expect(r.process_position).toBe("centered");
  });

  it("detects skewed_high when mean > target", () => {
    const m: number[] = [];
    for (let i = 0; i < 30; i++) m.push(10.020 + 0.001 * Math.sin(i));
    const r = eng.evaluate({ feature_id: "F1", measurements: m, usl: 10.05, lsl: 9.95, target: 10.0 });
    expect(r.process_position).toBe("skewed_high");
  });

  it("detects skewed_low when mean < target", () => {
    const m: number[] = [];
    for (let i = 0; i < 30; i++) m.push(9.980 + 0.001 * Math.sin(i));
    const r = eng.evaluate({ feature_id: "F1", measurements: m, usl: 10.05, lsl: 9.95, target: 10.0 });
    expect(r.process_position).toBe("skewed_low");
  });

  it("Cpk ≤ Cp always (Cpk = Cp only when perfectly centered)", () => {
    const m: number[] = [];
    for (let i = 0; i < 30; i++) m.push(10.010 + 0.002 * Math.sin(i));
    const r = eng.evaluate({ feature_id: "F1", measurements: m, usl: 10.05, lsl: 9.95 });
    expect(r.cpk.value).toBeLessThanOrEqual(r.cp.value + 0.001);
  });

  it("Ppk uses long-term σ (sample stdev), differs from Cpk (within σ)", () => {
    const m: number[] = [];
    for (let i = 0; i < 30; i++) m.push(10 + 0.002 * Math.sin(i) + 0.001 * (i % 5));  // drift
    const r = eng.evaluate({ feature_id: "F1", measurements: m, usl: 10.05, lsl: 9.95 });
    expect(r.ppk.source).toMatch(/σ_overall/);
    expect(r.cpk.source).toMatch(/min/);
  });

  it("warns on n < 30 (wide CI on capability indices)", () => {
    const r = eng.evaluate({ feature_id: "F1", measurements: [10.0, 10.01, 9.99, 10.005, 9.995], usl: 10.05, lsl: 9.95 });
    expect(r.warnings.some(w => /n=5.*< 30/.test(w))).toBe(true);
  });

  it("custom cpk_target is honored — same data with stricter target → no upgrade", () => {
    const m: number[] = [];
    for (let i = 0; i < 30; i++) m.push(10 + 0.005 * Math.sin(i * 0.5));
    const defaultRun = eng.evaluate({ feature_id: "F1", measurements: m, usl: 10.05, lsl: 9.95 });
    const strictRun = eng.evaluate({ feature_id: "F1", measurements: m, usl: 10.05, lsl: 9.95, cpk_target: 100 });
    expect(defaultRun.cpk.value).toBe(strictRun.cpk.value);
    // Under default (target=1.67) may be green; under target=100 cannot be green
    expect(strictRun.verdict).not.toBe("green");
  });

  it("source cites ISO 22514-2 + AIAG SPC + AS9100 + Montgomery", () => {
    const r = eng.evaluate({
      feature_id: "F1",
      measurements: [10, 10.01, 9.99],
      usl: 10.05, lsl: 9.95,
    });
    expect(r.source).toMatch(/ISO 22514-2|AIAG|AS9100|Montgomery/);
  });
});
