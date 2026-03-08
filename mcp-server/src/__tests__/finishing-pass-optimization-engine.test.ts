/**
 * FinishingPassOptimizationEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { finishingPassOptimizationEngine } from "../engines/FinishingPassOptimizationEngine.js";

describe("FinishingPassOptimizationEngine", () => {
  const base = {
    tool_diameter_mm: 10,
    tool_overhang_mm: 40,
    tool_nose_radius_mm: 0.4,
    feed_mm_rev: 0.15,
    depth_of_cut_mm: 0.5,
    target_Ra_um: 0.8,
  };

  it("spring pass depth > 0", () => {
    const r = finishingPassOptimizationEngine.calculate(base);
    expect(r.spring_pass_depth_mm.value).toBeGreaterThanOrEqual(0);
  });

  it("finishing feed > 0", () => {
    const r = finishingPassOptimizationEngine.calculate(base);
    expect(r.finishing_feed_mm_rev.value).toBeGreaterThan(0);
  });

  it("number of passes ≥ 1", () => {
    const r = finishingPassOptimizationEngine.calculate(base);
    expect(r.number_of_passes.value).toBeGreaterThanOrEqual(1);
  });

  it("predicted Ra > 0", () => {
    const r = finishingPassOptimizationEngine.calculate(base);
    expect(r.predicted_Ra_um.value).toBeGreaterThan(0);
  });

  it("larger nose radius gives better finish", () => {
    const small = finishingPassOptimizationEngine.calculate({ ...base, tool_nose_radius_mm: 0.2 });
    const large = finishingPassOptimizationEngine.calculate({ ...base, tool_nose_radius_mm: 1.2 });
    expect(large.predicted_Ra_um.value).toBeLessThan(
      small.predicted_Ra_um.value
    );
  });

  it("recommendations is array", () => {
    const r = finishingPassOptimizationEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
