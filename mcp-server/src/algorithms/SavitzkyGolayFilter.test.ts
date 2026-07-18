import { describe, it, expect } from "vitest";
import { SavitzkyGolayFilter as SG, type SavGolInput } from "./SavitzkyGolayFilter.js";

const close = (a: number[], b: number[], digits = 8) => {
  expect(a).toHaveLength(b.length);
  for (let i = 0; i < a.length; i++) expect(a[i]).toBeCloseTo(b[i], digits);
};

describe("SavitzkyGolayFilter — polynomial-exactness invariant", () => {
  it("reproduces a constant exactly", () => {
    const out = SG.calculate({ signal: [5, 5, 5, 5, 5, 5, 5], windowSize: 5, polyOrder: 2 });
    close(out.filtered, [5, 5, 5, 5, 5, 5, 5]);
  });

  it("reproduces a linear signal exactly (incl. boundaries)", () => {
    const x = [0, 1, 2, 3, 4, 5, 6];
    const y = x.map((v) => 2 * v + 1);
    const out = SG.calculate({ signal: y, windowSize: 5, polyOrder: 1 });
    close(out.filtered, y);
  });

  it("reproduces a quadratic exactly with polyOrder 2 (incl. boundaries)", () => {
    const x = [0, 1, 2, 3, 4, 5, 6, 7];
    const y = x.map((v) => v * v);
    const out = SG.calculate({ signal: y, windowSize: 5, polyOrder: 2 });
    close(out.filtered, y);
  });

  it("does NOT reproduce a cubic with polyOrder 2 (it smooths) but DOES with polyOrder 3", () => {
    const x = [0, 1, 2, 3, 4, 5, 6, 7];
    const y = x.map((v) => v * v * v);
    const smoothed = SG.calculate({ signal: y, windowSize: 5, polyOrder: 2 }).filtered;
    // A quadratic fit reproduces a cubic exactly at SYMMETRIC interior points (odd
    // term cancels), but not at the asymmetric BOUNDARY windows → total deviation > 0.
    const totalDev = smoothed.reduce((s, v, i) => s + Math.abs(v - y[i]), 0);
    expect(totalDev).toBeGreaterThan(1e-6);
    expect(Math.abs(smoothed[0] - y[0])).toBeGreaterThan(1e-6); // boundary point differs
    const exact = SG.calculate({ signal: y, windowSize: 5, polyOrder: 3 }).filtered;
    close(exact, y); // polyOrder 3 reproduces the cubic everywhere
  });
});

describe("SavitzkyGolayFilter — derivatives", () => {
  it("1st derivative of a linear signal is the constant slope", () => {
    const y = [1, 3, 5, 7, 9, 11, 13]; // slope 2
    const out = SG.calculate({ signal: y, windowSize: 5, polyOrder: 1, deriv: 1 });
    close(out.filtered, [2, 2, 2, 2, 2, 2, 2]);
  });

  it("1st derivative of x² is 2x (exact under polyOrder 2)", () => {
    const x = [0, 1, 2, 3, 4, 5, 6];
    const y = x.map((v) => v * v);
    const out = SG.calculate({ signal: y, windowSize: 5, polyOrder: 2, deriv: 1 });
    close(out.filtered, x.map((v) => 2 * v));
  });

  it("delta scales the derivative (spacing ≠ 1)", () => {
    const x = [0, 1, 2, 3, 4]; // index
    const y = x.map((v) => 2 * v); // y=2·index; with delta=0.5, dy/dx = 2/0.5 = 4
    const out = SG.calculate({ signal: y, windowSize: 3, polyOrder: 1, deriv: 1, delta: 0.5 });
    close(out.filtered, [4, 4, 4, 4, 4]);
  });

  it("derivative order > polyOrder is identically zero (with warning)", () => {
    const out = SG.calculate({ signal: [1, 4, 9, 16, 25], windowSize: 5, polyOrder: 2, deriv: 3 });
    expect(out.filtered).toEqual([0, 0, 0, 0, 0]);
    expect(out.warnings.join(" ")).toMatch(/identically 0/i);
  });
});

describe("SavitzkyGolayFilter — smoothing behaviour", () => {
  it("reduces variance of a noisy signal while preserving length", () => {
    // ramp + deterministic alternating noise
    const base = Array.from({ length: 21 }, (_, i) => i);
    const noisy = base.map((v, i) => v + (i % 2 === 0 ? 1.5 : -1.5));
    const out = SG.calculate({ signal: noisy, windowSize: 7, polyOrder: 2 });
    expect(out.filtered).toHaveLength(noisy.length);
    const resid = (a: number[]) => a.reduce((s, v, i) => s + (v - base[i]) ** 2, 0);
    expect(resid(out.filtered)).toBeLessThan(resid(noisy)); // closer to the true ramp
  });
});

describe("SavitzkyGolayFilter — failure modes", () => {
  it("rejects even window", () => {
    expect(SG.validate({ signal: [1, 2, 3, 4], windowSize: 4 }).valid).toBe(false);
  });
  it("rejects window < 3", () => {
    expect(SG.validate({ signal: [1, 2, 3], windowSize: 1 }).valid).toBe(false);
  });
  it("rejects polyOrder >= windowSize", () => {
    expect(SG.validate({ signal: [1, 2, 3, 4, 5], windowSize: 3, polyOrder: 3 }).valid).toBe(false);
  });
  it("rejects window > signal length", () => {
    expect(SG.validate({ signal: [1, 2, 3], windowSize: 5 }).valid).toBe(false);
    expect(() => SG.calculate({ signal: [1, 2, 3], windowSize: 5 })).toThrow(/invalid/i);
  });
});

describe("SavitzkyGolayFilter — adversarial inputs", () => {
  it("rejects NaN in signal", () => {
    expect(SG.validate({ signal: [1, NaN, 3, 4, 5], windowSize: 3 }).valid).toBe(false);
  });
  it("rejects Infinity in signal", () => {
    expect(SG.validate({ signal: [1, 2, Infinity, 4, 5], windowSize: 3 }).valid).toBe(false);
  });
  it("rejects non-positive delta", () => {
    expect(SG.validate({ signal: [1, 2, 3], windowSize: 3, deriv: 1, delta: 0 }).valid).toBe(false);
  });
});

describe("SavitzkyGolayFilter — metadata", () => {
  it("exposes signal/smoothing metadata with the Savitzky-Golay reference", () => {
    const m = SG.getMetadata();
    expect(m.id).toBe("savitzky_golay_filter");
    expect(m.domain).toBe("signal");
    expect(m.reference).toMatch(/Savitzky/i);
  });
});
