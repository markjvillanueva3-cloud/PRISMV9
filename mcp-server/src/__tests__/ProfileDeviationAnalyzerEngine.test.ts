import { describe, it, expect } from "vitest";
import { profileDeviationAnalyzerEngine } from "../engines/ProfileDeviationAnalyzerEngine.js";

describe("ProfileDeviationAnalyzerEngine", () => {
  const linearBasis = [
    { x: 0, y: 0 },
    { x: 10, y: 5 },
    { x: 20, y: 10 },
    { x: 30, y: 15 },
  ];

  it("zero deviation when measured matches basis", () => {
    const r = profileDeviationAnalyzerEngine.analyze({
      basis: linearBasis,
      measured: linearBasis,
      tolerance_mm: 0.1,
    });
    expect(r.pass).toBe(true);
    expect(r.max_positive_deviation_mm).toBe(0);
    expect(r.max_negative_deviation_mm).toBe(0);
    expect(r.rms_deviation_mm).toBe(0);
  });

  it("detects positive deviation", () => {
    const measured = linearBasis.map((p) => ({ x: p.x, y: p.y + 0.02 }));
    const r = profileDeviationAnalyzerEngine.analyze({
      basis: linearBasis,
      measured,
      tolerance_mm: 0.1,
    });
    expect(r.max_positive_deviation_mm).toBeGreaterThan(0.019);
    expect(r.max_negative_deviation_mm).toBe(0);
    expect(r.pass).toBe(true);
  });

  it("fails when deviation exceeds bilateral tolerance", () => {
    const measured = linearBasis.map((p) => ({ x: p.x, y: p.y + 0.2 }));
    const r = profileDeviationAnalyzerEngine.analyze({
      basis: linearBasis,
      measured,
      tolerance_mm: 0.1,
      zone_type: "bilateral",
    });
    expect(r.pass).toBe(false);
    expect(r.points_out_of_zone).toBeGreaterThan(0);
  });

  it("unilateral_outside zone accepts only positive dev", () => {
    const measured = linearBasis.map((p) => ({ x: p.x, y: p.y + 0.05 }));
    const r = profileDeviationAnalyzerEngine.analyze({
      basis: linearBasis,
      measured,
      tolerance_mm: 0.1,
      zone_type: "unilateral_outside",
    });
    expect(r.pass).toBe(true);
  });

  it("unilateral_outside rejects negative dev", () => {
    const measured = linearBasis.map((p) => ({ x: p.x, y: p.y - 0.05 }));
    const r = profileDeviationAnalyzerEngine.analyze({
      basis: linearBasis,
      measured,
      tolerance_mm: 0.1,
      zone_type: "unilateral_outside",
    });
    expect(r.pass).toBe(false);
  });

  it("best-fit offset minimizes RMS for constant bias", () => {
    const measured = linearBasis.map((p) => ({ x: p.x, y: p.y + 0.03 }));
    const withoutFit = profileDeviationAnalyzerEngine.analyze({
      basis: linearBasis,
      measured,
      tolerance_mm: 0.1,
      best_fit: false,
    });
    const withFit = profileDeviationAnalyzerEngine.analyze({
      basis: linearBasis,
      measured,
      tolerance_mm: 0.1,
      best_fit: true,
    });
    expect(withFit.rms_deviation_mm).toBeLessThan(withoutFit.rms_deviation_mm);
    expect(withFit.best_fit_offset_mm).toBeDefined();
    expect(Math.abs(withFit.best_fit_offset_mm! - -0.03)).toBeLessThan(0.01);
  });

  it("interpolates measured at basis x when measured is denser", () => {
    const dense: Array<{ x: number; y: number }> = [];
    for (let x = 0; x <= 30; x += 2) dense.push({ x, y: x * 0.5 });
    const r = profileDeviationAnalyzerEngine.analyze({
      basis: linearBasis,
      measured: dense,
      tolerance_mm: 0.1,
    });
    expect(r.total_evaluated).toBe(4);
    expect(r.rms_deviation_mm).toBeLessThan(0.01);
  });

  it("records deviation at each basis point", () => {
    const measured = linearBasis.map((p) => ({ x: p.x, y: p.y + 0.02 }));
    const r = profileDeviationAnalyzerEngine.analyze({
      basis: linearBasis,
      measured,
      tolerance_mm: 0.1,
    });
    expect(r.deviations).toHaveLength(4);
    for (const d of r.deviations) expect(Math.abs(d.deviation - 0.02)).toBeLessThan(0.001);
  });

  it("tracks max deviation location", () => {
    const measured = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 10.08 },
      { x: 30, y: 15 },
    ];
    const r = profileDeviationAnalyzerEngine.analyze({
      basis: linearBasis,
      measured,
      tolerance_mm: 0.2,
    });
    expect(r.max_deviation_location.x).toBe(20);
    expect(r.max_deviation_location.deviation).toBeCloseTo(0.08, 4);
  });

  it("warns when measured does not cover full basis", () => {
    const partial = [{ x: 0, y: 0 }, { x: 10, y: 5 }];
    const r = profileDeviationAnalyzerEngine.analyze({
      basis: linearBasis,
      measured: partial,
      tolerance_mm: 0.1,
    });
    expect(r.warnings.some((w) => /unsampled/.test(w))).toBe(true);
    expect(r.total_evaluated).toBeLessThan(linearBasis.length);
  });

  it("mean deviation sign indicates bias direction", () => {
    const measured = linearBasis.map((p) => ({ x: p.x, y: p.y + 0.05 }));
    const r = profileDeviationAnalyzerEngine.analyze({
      basis: linearBasis,
      measured,
      tolerance_mm: 0.2,
    });
    expect(r.mean_deviation_mm).toBeGreaterThan(0.03);
  });

  it("getStats reports zones + reference", () => {
    const s = profileDeviationAnalyzerEngine.getStats();
    expect(s.zones).toContain("bilateral");
    expect(s.reference).toMatch(/Y14\.5/);
  });
});
