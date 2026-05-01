/**
 * ToolWearProgressionEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { toolWearProgressionEngine } from "../engines/ToolWearProgressionEngine.js";

describe("ToolWearProgressionEngine", () => {
  const base = {
    cutting_speed_m_min: 200,
    feed_mm_rev: 0.2,
    depth_of_cut_mm: 2,
    tool_grade: "CARBIDE_COATED" as const,
    workpiece_hardness_hrc: 30,
  };

  it("wear rate > 0", () => {
    const r = toolWearProgressionEngine.calculate(base);
    expect(r.wear_rate_um_per_min.value).toBeGreaterThan(0);
  });

  it("remaining life > 0", () => {
    const r = toolWearProgressionEngine.calculate(base);
    expect(r.remaining_life_min.value).toBeGreaterThan(0);
  });

  it("taylor life > 0", () => {
    const r = toolWearProgressionEngine.calculate(base);
    expect(r.taylor_life_min.value).toBeGreaterThan(0);
  });

  it("higher speed reduces life", () => {
    const slow = toolWearProgressionEngine.calculate({ ...base, cutting_speed_m_min: 100 });
    const fast = toolWearProgressionEngine.calculate({ ...base, cutting_speed_m_min: 400 });
    expect(fast.taylor_life_min.value).toBeLessThan(
      slow.taylor_life_min.value
    );
  });

  it("optimal change time > 0", () => {
    const r = toolWearProgressionEngine.calculate(base);
    expect(r.optimal_change_min.value).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = toolWearProgressionEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
