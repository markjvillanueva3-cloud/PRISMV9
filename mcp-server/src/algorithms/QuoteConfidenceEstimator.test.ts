import { describe, it, expect } from "vitest";
import { estimate, QuoteConfidenceEstimator, type CostComponent } from "./QuoteConfidenceEstimator.js";

describe("QuoteConfidenceEstimator", () => {
  it("single component: CI = 1.96 × estimate × uncertainty_frac", () => {
    const r = estimate({ components: [{ name: "material", estimate_usd: 1000, uncertainty_frac: 0.10 }] });
    expect(r.total_usd.value).toBe(1000);
    expect(r.ci_95_half_width_usd.value).toBeCloseTo(1.96 * 100, 2);
  });
  it("two independent components: RSS combines variances", () => {
    const r = estimate({ components: [
      { name: "material", estimate_usd: 1000, uncertainty_frac: 0.10 },
      { name: "labor", estimate_usd: 500, uncertainty_frac: 0.20 },
    ]});
    expect(r.total_usd.value).toBe(1500);
    // RSS: sqrt(100² + 100²) = sqrt(20000) ≈ 141.4
    expect(r.total_usd.uncertainty).toBeCloseTo(Math.sqrt(100 * 100 + 100 * 100), 2);
  });
  it("largest_contributor identifies dominant variance source", () => {
    const r = estimate({ components: [
      { name: "small", estimate_usd: 100, uncertainty_frac: 0.05 },
      { name: "big", estimate_usd: 1000, uncertainty_frac: 0.30 },
    ]});
    expect(r.largest_contributor).toBe("big");
    expect(r.notes.join("|")).toContain("dominates");
  });
  it("contribution_pct sums to 100%", () => {
    const r = estimate({ components: [
      { name: "a", estimate_usd: 500, uncertainty_frac: 0.10 },
      { name: "b", estimate_usd: 500, uncertainty_frac: 0.20 },
    ]});
    const sum = r.per_component.reduce((s, pc) => s + pc.contribution_pct, 0);
    expect(sum).toBeCloseTo(100, 2);
  });
  it("zero uncertainty → zero CI", () => {
    const r = estimate({ components: [{ name: "m", estimate_usd: 1000, uncertainty_frac: 0 }] });
    expect(r.ci_95_half_width_usd.value).toBe(0);
  });
  it("empty components diagnostic", () => {
    expect(estimate({ components: [] }).notes.join("|")).toContain("empty");
  });
  it("invalid uncertainty_frac (>2) diagnostic", () => {
    expect(estimate({ components: [{ name: "m", estimate_usd: 100, uncertainty_frac: 3 }] }).notes.join("|")).toContain("outside");
  });
  it("negative estimate diagnostic", () => {
    expect(estimate({ components: [{ name: "m", estimate_usd: -10, uncertainty_frac: 0.1 }] }).notes.join("|")).toContain("negative");
  });
  it("missing input diagnostic", () => {
    expect(estimate(null as unknown as { components: CostComponent[] }).notes.join("|")).toContain("missing");
  });
  it("too many components diagnostic", () => {
    const big = Array.from({ length: 200 }, (_, i) => ({ name: `c${i}`, estimate_usd: 1, uncertainty_frac: 0.1 }));
    expect(estimate({ components: big }).notes.join("|")).toContain("exceeds");
  });
  it("version 1.0.0", () => {
    expect(QuoteConfidenceEstimator.version).toBe("1.0.0");
  });
});
