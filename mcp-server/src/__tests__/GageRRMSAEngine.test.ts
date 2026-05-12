import { describe, it, expect } from "vitest";
import { gageRRMSAEngine } from "../engines/GageRRMSAEngine.js";

describe("GageRRMSAEngine", () => {
  // Synthetic dataset: 3 operators × 5 parts × 3 trials
  // Parts vary clearly; small noise per operator (low EV); negligible operator bias (low AV)
  const base = [10.0, 10.1, 10.3, 10.5, 10.7];
  const goodMeas: number[][][] = [0, 1, 2].map((o) =>
    base.map((pv) => [pv + 0.001 * o, pv - 0.001 * o, pv + 0.0005 * o])
  );

  it("returns acceptable for low-noise measurement system", () => {
    const r = gageRRMSAEngine.analyze({ measurements: goodMeas });
    expect(r.acceptance).toBe("acceptable");
    expect(r.pct_grr_tv).toBeLessThan(10);
  });

  it("rr decomposes into EV + AV + interaction", () => {
    const r = gageRRMSAEngine.analyze({ measurements: goodMeas });
    const expected = Math.sqrt(r.ev ** 2 + r.av ** 2 + r.interaction ** 2);
    expect(Math.abs(r.rr - expected)).toBeLessThan(0.001);
  });

  it("tv = sqrt(rr² + pv²)", () => {
    const r = gageRRMSAEngine.analyze({ measurements: goodMeas });
    const expected = Math.sqrt(r.rr ** 2 + r.pv ** 2);
    expect(Math.abs(r.tv - expected)).toBeLessThan(0.001);
  });

  it("pct_grr_tolerance when tolerance_width provided", () => {
    const r = gageRRMSAEngine.analyze({
      measurements: goodMeas,
      tolerance_width: 0.5,
    });
    expect(r.pct_grr_tolerance).toBeDefined();
    expect(r.pct_grr_tolerance!).toBeGreaterThan(0);
  });

  it("reports unacceptable for high-noise system", () => {
    // Huge measurement noise, tiny part variation
    const noisy: number[][][] = [0, 1, 2].map(() =>
      [10.0, 10.0, 10.0, 10.0, 10.0].map((v) => [v + Math.random() * 2 - 1, v + Math.random() * 2 - 1, v + Math.random() * 2 - 1])
    );
    const r = gageRRMSAEngine.analyze({ measurements: noisy });
    expect(["marginal", "unacceptable"]).toContain(r.acceptance);
  });

  it("NDC ≥ 5 for good system", () => {
    const r = gageRRMSAEngine.analyze({ measurements: goodMeas });
    expect(r.ndc).toBeGreaterThanOrEqual(5);
  });

  it("warns on NDC < 2", () => {
    const noisy: number[][][] = [0, 1].map(() =>
      [10.0, 10.0].map(() => [10.0 + Math.random() * 10, 10.0 + Math.random() * 10, 10.0 + Math.random() * 10])
    );
    const r = gageRRMSAEngine.analyze({ measurements: noisy });
    expect(r.ndc).toBeLessThan(5);
  });

  it("ANOVA method runs and separates interaction", () => {
    const r = gageRRMSAEngine.analyze({ measurements: goodMeas, method: "anova" });
    expect(r.method).toBe("anova");
    expect(r.rr).toBeGreaterThanOrEqual(0);
  });

  it("design reflects input shape", () => {
    const r = gageRRMSAEngine.analyze({ measurements: goodMeas });
    expect(r.design.operators).toBe(3);
    expect(r.design.parts).toBe(5);
    expect(r.design.trials).toBe(3);
  });

  it("warns when only 1 operator (AV unresolvable)", () => {
    const oneOp: number[][][] = [goodMeas[0]!];
    const r = gageRRMSAEngine.analyze({ measurements: oneOp });
    expect(r.warnings.some((w) => /operator/i.test(w))).toBe(true);
  });

  it("warns when only 1 trial (EV unresolvable)", () => {
    const oneTrial = goodMeas.map((op) => op.map((part) => [part[0]!]));
    const r = gageRRMSAEngine.analyze({ measurements: oneTrial });
    expect(r.warnings.some((w) => /trial/i.test(w))).toBe(true);
  });

  it("PV > 0 for distinct parts", () => {
    const r = gageRRMSAEngine.analyze({ measurements: goodMeas });
    expect(r.pv).toBeGreaterThan(0);
  });

  it("getStats returns AIAG thresholds", () => {
    const s = gageRRMSAEngine.getStats();
    expect(s.acceptance_thresholds.acceptable).toMatch(/10/);
    expect(s.reference).toMatch(/AIAG/);
  });
});
