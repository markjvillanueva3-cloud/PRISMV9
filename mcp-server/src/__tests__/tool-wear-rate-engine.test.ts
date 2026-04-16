/**
 * ToolWearRateEngine — Unit Tests
 * @milestone FORGE-ENGINES-B20
 */
import { describe, it, expect } from "vitest";
import { toolWearRateEngine } from "../engines/ToolWearRateEngine.js";

describe("ToolWearRateEngine", () => {
  it("predicts tool life from Taylor equation", () => {
    const r = toolWearRateEngine.calculate({
      cutting_speed_mpm: 200,
      work_material: "steel",
      tool_material: "carbide",
    });
    expect(r.predicted_tool_life.value).toBeGreaterThan(0);
    expect(r.taylor_constant.value).toBe(300);
    expect(r.taylor_exponent.value).toBe(0.25);
  });

  it("higher speed = shorter tool life", () => {
    const slow = toolWearRateEngine.calculate({
      cutting_speed_mpm: 100,
    });
    const fast = toolWearRateEngine.calculate({
      cutting_speed_mpm: 250,
    });
    expect(fast.predicted_tool_life.value).toBeLessThan(
      slow.predicted_tool_life.value
    );
  });

  it("ceramic has higher Taylor n than HSS", () => {
    const hss = toolWearRateEngine.calculate({
      cutting_speed_mpm: 100,
      tool_material: "hss",
    });
    const ceramic = toolWearRateEngine.calculate({
      cutting_speed_mpm: 100,
      tool_material: "ceramic",
    });
    expect(ceramic.taylor_exponent.value).toBeGreaterThan(
      hss.taylor_exponent.value
    );
  });

  it("calculates flank wear rate", () => {
    const r = toolWearRateEngine.calculate({
      cutting_speed_mpm: 150,
    });
    expect(r.flank_wear_rate.value).toBeGreaterThan(0);
  });

  it("calculates remaining life from current wear", () => {
    const r = toolWearRateEngine.calculate({
      cutting_speed_mpm: 150,
      current_flank_wear_mm: 0.15,
      max_flank_wear_mm: 0.3,
    });
    expect(r.remaining_life.value).toBeGreaterThan(0);
    expect(r.remaining_life.value).toBeLessThan(
      r.predicted_tool_life.value
    );
  });

  it("warns very short tool life", () => {
    const r = toolWearRateEngine.calculate({
      cutting_speed_mpm: 500,
      tool_material: "hss",
    });
    expect(
      r.warnings.some(w => w.includes("short"))
    ).toBe(true);
  });

  it("warns high wear level", () => {
    const r = toolWearRateEngine.calculate({
      cutting_speed_mpm: 150,
      current_flank_wear_mm: 0.28,
      max_flank_wear_mm: 0.3,
    });
    expect(
      r.warnings.some(w => w.includes("replace"))
    ).toBe(true);
  });

  it("optimal cost speed < productivity speed", () => {
    const r = toolWearRateEngine.calculate({
      cutting_speed_mpm: 200,
    });
    expect(r.optimal_speed_cost.value).toBeLessThan(
      r.optimal_speed_productivity.value
    );
  });

  it("crater wear risk increases with speed", () => {
    const slow = toolWearRateEngine.calculate({
      cutting_speed_mpm: 80,
    });
    const fast = toolWearRateEngine.calculate({
      cutting_speed_mpm: 250,
    });
    expect(fast.crater_wear_risk.value).toBeGreaterThanOrEqual(
      slow.crater_wear_risk.value
    );
  });
});
