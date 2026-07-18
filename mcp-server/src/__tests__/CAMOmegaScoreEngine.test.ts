/**
 * CAMOmegaScoreEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-OMEGA
 */
import { describe, it, expect } from "vitest";
import { CAMOmegaScoreEngine } from "../engines/CAMOmegaScoreEngine.js";

const engine = new CAMOmegaScoreEngine();

describe("CAMOmegaScoreEngine", () => {

  it("perfect inputs S(x)=1.0, cumulative=tol/2 → Ω=1.0 (pass)", () => {
    const r = engine.score({ sx: 1.0, cumulativeMm: 0.025, printToleranceMm: 0.05 });
    expect(r.omega).toBeCloseTo(1.0, 6);
    expect(r.ok).toBe(true);
  });

  it("Ω = 0.6*S(x) + 0.4*T (linear weights)", () => {
    const r = engine.score({ sx: 0.5, cumulativeMm: 0, printToleranceMm: 0.1 });
    expect(r.omega).toBeCloseTo(0.3 + 0.4, 6);
  });

  it("tolerance compliance = 1.0 when cumulative ≤ print tol", () => {
    const r = engine.score({ sx: 1.0, cumulativeMm: 0.05, printToleranceMm: 0.05 });
    expect(r.toleranceCompliance).toBe(1.0);
  });

  it("tolerance compliance linearly decays from 1 → 0 between 1× and 2× print tol", () => {
    // cumulative=1.5× → expected compliance = 0.5
    const r = engine.score({ sx: 1.0, cumulativeMm: 0.15, printToleranceMm: 0.10 });
    expect(r.toleranceCompliance).toBeCloseTo(0.5, 6);
  });

  it("tolerance compliance = 0 when cumulative ≥ 2× print tol", () => {
    const r = engine.score({ sx: 1.0, cumulativeMm: 0.30, printToleranceMm: 0.10 });
    expect(r.toleranceCompliance).toBe(0);
  });

  it("zero-print-tolerance → tolerance compliance = 0 (fail-safe)", () => {
    const r = engine.score({ sx: 1.0, cumulativeMm: 0.05, printToleranceMm: 0 });
    expect(r.toleranceCompliance).toBe(0);
  });

  it("clamps S(x) to [0,1] even if caller passes out-of-range", () => {
    expect(engine.score({ sx: 1.5, cumulativeMm: 0, printToleranceMm: 0.1 }).sx).toBe(1);
    expect(engine.score({ sx: -0.5, cumulativeMm: 0, printToleranceMm: 0.1 }).sx).toBe(0);
  });

  it("shop_floor pass requires Ω ≥ 0.95", () => {
    expect(engine.threshold()).toBe(0.95);
    // S(x)=0.98 + tol_compliance=0.90 → Ω = 0.6*0.98 + 0.4*0.90 = 0.588 + 0.36 = 0.948 < 0.95 → fail
    const r = engine.score({ sx: 0.98, cumulativeMm: 0.11, printToleranceMm: 0.10 });
    expect(r.omega).toBeLessThan(0.95);
    expect(r.ok).toBe(false);
  });

  it("breakdown components sum to omega", () => {
    const r = engine.score({ sx: 0.8, cumulativeMm: 0.04, printToleranceMm: 0.05 });
    expect(r.breakdown.sxComponent + r.breakdown.toleranceComponent).toBeCloseTo(r.omega, 6);
  });

  it("NaN/Infinity print tolerance → tolerance compliance = 0", () => {
    expect(engine.score({ sx: 1, cumulativeMm: 0, printToleranceMm: Number.NaN }).toleranceCompliance).toBe(0);
    expect(engine.score({ sx: 1, cumulativeMm: 0, printToleranceMm: Number.POSITIVE_INFINITY }).toleranceCompliance).toBe(0);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes score + threshold", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("score");
    expect(names).toContain("threshold");
  });
});
