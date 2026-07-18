/**
 * ToleranceStackUpEngine — Unit Tests
 * @milestone FORGE-ENGINES-B28
 */
import { describe, it, expect } from "vitest";
import {
  toleranceStackUpEngine,
} from "../engines/ToleranceStackUpEngine.js";

describe("ToleranceStackUpEngine", () => {
  const baseDims = [
    { name: "A", nominal: 50, tolerance: 0.1, direction: 1 as const },
    { name: "B", nominal: 30, tolerance: 0.2, direction: 1 as const },
    { name: "C", nominal: 75, tolerance: 0.15, direction: -1 as const },
  ];

  it("nominal gap = Σ(nominal × direction)", () => {
    const r = toleranceStackUpEngine.calculate({ dimensions: baseDims });
    // 50 + 30 - 75 = 5
    expect(r.nominal_gap.value).toBeCloseTo(5, 3);
  });

  it("worst case tolerance = Σ|t_i|", () => {
    const r = toleranceStackUpEngine.calculate({ dimensions: baseDims });
    // 0.1 + 0.2 + 0.15 = 0.45
    expect(r.worst_case_total_tol.value).toBeCloseTo(0.45, 3);
  });

  it("RSS tolerance = √(Σt_i²)", () => {
    const r = toleranceStackUpEngine.calculate({ dimensions: baseDims });
    // √(0.01 + 0.04 + 0.0225) = √0.0725 ≈ 0.269
    expect(r.rss_total_tol.value).toBeCloseTo(0.269, 2);
  });

  it("RSS tolerance < worst case tolerance", () => {
    const r = toleranceStackUpEngine.calculate({ dimensions: baseDims });
    expect(r.rss_total_tol.value).toBeLessThan(
      r.worst_case_total_tol.value
    );
  });

  it("worst case min = nominal - wc_tol", () => {
    const r = toleranceStackUpEngine.calculate({ dimensions: baseDims });
    expect(r.worst_case_min.value).toBeCloseTo(
      r.nominal_gap.value - r.worst_case_total_tol.value, 3
    );
  });

  it("top contributor is largest tolerance", () => {
    const r = toleranceStackUpEngine.calculate({ dimensions: baseDims });
    // B has 0.2 = largest
    expect(r.top_contributor.unit).toBe("B");
  });

  it("feasible when gap within limits", () => {
    const r = toleranceStackUpEngine.calculate({
      dimensions: baseDims,
      min_gap_mm: 0,
      max_gap_mm: 10,
    });
    expect(r.stack_feasible.value).toBe(1);
  });

  it("infeasible when min gap violated", () => {
    const r = toleranceStackUpEngine.calculate({
      dimensions: baseDims,
      min_gap_mm: 5,
      max_gap_mm: 10,
      method: "worst_case",
    });
    // WC min = 5 - 0.45 = 4.55 < 5
    expect(r.stack_feasible.value).toBe(0);
  });

  it("warns high rejection rate", () => {
    const r = toleranceStackUpEngine.calculate({
      dimensions: [
        { name: "A", nominal: 10, tolerance: 0.5, direction: 1 },
        { name: "B", nominal: 10, tolerance: 0.5, direction: -1 },
      ],
      min_gap_mm: -0.05,
      max_gap_mm: 0.05,
    });
    expect(r.rejection_rate_pct.value).toBeGreaterThan(0);
  });

  it("warns dominant contributor > 60%", () => {
    const r = toleranceStackUpEngine.calculate({
      dimensions: [
        { name: "Big", nominal: 50, tolerance: 0.5, direction: 1 },
        { name: "Small", nominal: 30, tolerance: 0.05, direction: -1 },
      ],
    });
    expect(
      r.warnings.some(w => w.includes("Big"))
    ).toBe(true);
  });
});
