/**
 * DrillCycleOptimizationEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { drillCycleOptimizationEngine } from "../engines/DrillCycleOptimizationEngine.js";

describe("DrillCycleOptimizationEngine", () => {
  const base = {
    drill_diameter_mm: 10,
    hole_depth_mm: 50,
    feed_mm_rev: 0.15,
    spindle_rpm: 2000,
    is_through_hole: false,
  };

  it("peck depth > 0", () => {
    const r = drillCycleOptimizationEngine.calculate(base);
    expect(r.peck_depth_mm.value).toBeGreaterThan(0);
  });

  it("estimated cycle time > 0", () => {
    const r = drillCycleOptimizationEngine.calculate(base);
    expect(r.estimated_cycle_time_s.value).toBeGreaterThan(0);
  });

  it("deeper hole takes longer", () => {
    const shallow = drillCycleOptimizationEngine.calculate({ ...base, hole_depth_mm: 10 });
    const deep = drillCycleOptimizationEngine.calculate({ ...base, hole_depth_mm: 100 });
    expect(deep.estimated_cycle_time_s.value).toBeGreaterThan(
      shallow.estimated_cycle_time_s.value
    );
  });

  it("dwell time ≥ 0", () => {
    const r = drillCycleOptimizationEngine.calculate(base);
    expect(r.dwell_time_s.value).toBeGreaterThanOrEqual(0);
  });

  it("recommendations is array", () => {
    const r = drillCycleOptimizationEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
