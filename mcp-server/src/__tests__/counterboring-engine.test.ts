/**
 * CounterboringEngine — Unit Tests
 * @milestone FORGE-ENGINES-B15
 */
import { describe, it, expect } from "vitest";
import { counterboringEngine } from "../engines/CounterboringEngine.js";

describe("CounterboringEngine", () => {
  it("looks up M6 SHCS counterbore dimensions", () => {
    const r = counterboringEngine.calculate({
      screw_size: "M6",
    });
    expect(r.counterbore_diameter.value).toBe(11);
    // Depth = head_h(6) + clearance(0.5)
    expect(r.counterbore_depth.value).toBe(6.5);
    expect(r.through_hole_diameter.value).toBe(6.6);
  });

  it("looks up 1/4 imperial SHCS", () => {
    const r = counterboringEngine.calculate({
      screw_size: "1/4",
    });
    expect(r.counterbore_diameter.value).toBeCloseTo(11.1, 1);
  });

  it("calculates from explicit head diameter", () => {
    const r = counterboringEngine.calculate({
      screw_head_diameter_mm: 15,
      screw_head_height_mm: 8,
    });
    // cbore = 15 + 1.5 = 16.5
    expect(r.counterbore_diameter.value).toBe(16.5);
    // depth = 8 + 0.5 = 8.5
    expect(r.counterbore_depth.value).toBe(8.5);
  });

  it("counterbore tool matches cbore diameter", () => {
    const r = counterboringEngine.calculate({
      screw_size: "M8",
      method: "counterbore_tool",
    });
    expect(r.tool_diameter.value).toBe(
      r.counterbore_diameter.value
    );
  });

  it("interpolation uses smaller tool", () => {
    const r = counterboringEngine.calculate({
      screw_size: "M10",
      method: "interpolation",
    });
    expect(r.tool_diameter.value).toBeLessThan(
      r.counterbore_diameter.value
    );
  });

  it("interpolation gives best flatness", () => {
    const interp = counterboringEngine.calculate({
      screw_size: "M8",
      method: "interpolation",
    });
    const tool = counterboringEngine.calculate({
      screw_size: "M8",
      method: "counterbore_tool",
    });
    expect(interp.flatness_tolerance.value).toBeLessThan(
      tool.flatness_tolerance.value
    );
  });

  it("warns no screw size given", () => {
    const r = counterboringEngine.calculate({});
    expect(
      r.warnings.some(w => w.includes("No screw size"))
    ).toBe(true);
  });

  it("warns large counterbore tool", () => {
    const r = counterboringEngine.calculate({
      screw_head_diameter_mm: 32,
      method: "counterbore_tool",
    });
    expect(
      r.warnings.some(w => w.includes("interpolation"))
    ).toBe(true);
  });

  it("cycle time is positive", () => {
    const r = counterboringEngine.calculate({
      screw_size: "M6",
    });
    expect(r.cycle_time_per_hole.value).toBeGreaterThan(0);
  });

  it("custom clearance affects depth", () => {
    const std = counterboringEngine.calculate({
      screw_size: "M6",
      clearance_mm: 0.5,
    });
    const deep = counterboringEngine.calculate({
      screw_size: "M6",
      clearance_mm: 1.5,
    });
    expect(deep.counterbore_depth.value).toBeGreaterThan(
      std.counterbore_depth.value
    );
  });
});
