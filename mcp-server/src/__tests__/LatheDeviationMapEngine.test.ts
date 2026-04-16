import { describe, it, expect } from "vitest";
import { latheDeviationMapEngine } from "../engines/LatheDeviationMapEngine.js";

describe("LatheDeviationMapEngine", () => {
  const commanded = [
    { z_mm: 0, r_mm: 20 },
    { z_mm: 10, r_mm: 20 },
    { z_mm: 20, r_mm: 20 },
    { z_mm: 30, r_mm: 20 },
  ];

  it("identical profiles → zero deviation", () => {
    const r = latheDeviationMapEngine.compare({ commanded, actual: commanded });
    expect(r.max_abs_delta_mm).toBeCloseTo(0, 5);
    expect(r.rms_delta_mm).toBeCloseTo(0, 5);
    expect(r.out_of_tol_count).toBe(0);
  });

  it("positive constant offset → positive bias", () => {
    const actual = commanded.map((p) => ({ z_mm: p.z_mm, r_mm: p.r_mm + 0.02 }));
    const r = latheDeviationMapEngine.compare({ commanded, actual });
    expect(r.signed_bias_mm).toBeCloseTo(0.02, 4);
  });

  it("negative offset → negative bias", () => {
    const actual = commanded.map((p) => ({ z_mm: p.z_mm, r_mm: p.r_mm - 0.015 }));
    const r = latheDeviationMapEngine.compare({ commanded, actual });
    expect(r.signed_bias_mm).toBeLessThan(0);
  });

  it("out-of-tolerance count flags samples above tol", () => {
    const actual = commanded.map((p, k) => ({ z_mm: p.z_mm, r_mm: p.r_mm + (k === 2 ? 0.5 : 0) }));
    const r = latheDeviationMapEngine.compare({ commanded, actual, tolerance_r_mm: 0.01 });
    expect(r.out_of_tol_count).toBe(1);
  });

  it("max_abs_delta captures largest deviation", () => {
    const actual = commanded.map((p, k) => ({ z_mm: p.z_mm, r_mm: p.r_mm + (k === 1 ? 0.3 : 0) }));
    const r = latheDeviationMapEngine.compare({ commanded, actual });
    expect(r.max_abs_delta_mm).toBeCloseTo(0.3, 3);
    expect(r.max_abs_delta_z_mm).toBeCloseTo(10, 2);
  });

  it("diameter_error_mm = 2 × delta_r_mm", () => {
    const actual = commanded.map((p) => ({ z_mm: p.z_mm, r_mm: p.r_mm + 0.1 }));
    const r = latheDeviationMapEngine.compare({ commanded, actual });
    expect(r.points[0].diameter_error_mm).toBeCloseTo(0.2, 4);
  });

  it("RMS deviation is non-negative", () => {
    const actual = commanded.map((p, k) => ({ z_mm: p.z_mm, r_mm: p.r_mm + (k % 2 === 0 ? 0.01 : -0.01) }));
    const r = latheDeviationMapEngine.compare({ commanded, actual });
    expect(r.rms_delta_mm).toBeGreaterThanOrEqual(0);
  });

  it("pass_tol flag per sample", () => {
    const actual = commanded.map((p, k) => ({ z_mm: p.z_mm, r_mm: p.r_mm + (k === 0 ? 0.2 : 0.001) }));
    const r = latheDeviationMapEngine.compare({ commanded, actual, tolerance_r_mm: 0.01 });
    expect(r.points[0].pass_tol).toBe(false);
    expect(r.points.slice(1).every((p) => p.pass_tol)).toBe(true);
  });

  it("points count equals commanded sample count when aligned", () => {
    const actual = commanded.map((p) => ({ ...p }));
    const r = latheDeviationMapEngine.compare({ commanded, actual });
    expect(r.points.length).toBe(commanded.length);
  });

  it("nearest-z alignment works when actual is denser", () => {
    const dense: { z_mm: number; r_mm: number }[] = [];
    for (let z = 0; z <= 30; z += 1) dense.push({ z_mm: z, r_mm: 20 });
    const r = latheDeviationMapEngine.compare({ commanded, actual: dense });
    expect(r.points.length).toBe(commanded.length);
    expect(r.max_abs_delta_mm).toBeCloseTo(0, 5);
  });

  it("empty commanded returns empty points", () => {
    const r = latheDeviationMapEngine.compare({ commanded: [], actual: commanded });
    expect(r.points.length).toBe(0);
  });

  it("reasoning mentions RMS and bias", () => {
    const actual = commanded.map((p) => ({ z_mm: p.z_mm, r_mm: p.r_mm + 0.02 }));
    const r = latheDeviationMapEngine.compare({ commanded, actual });
    const text = r.reasoning.join(" ");
    expect(text).toMatch(/RMS/);
    expect(text).toMatch(/bias/);
  });

  it("getStats returns reference citation", () => {
    const s = latheDeviationMapEngine.getStats();
    expect(s.reference).toMatch(/Smith|ISO/);
  });
});
