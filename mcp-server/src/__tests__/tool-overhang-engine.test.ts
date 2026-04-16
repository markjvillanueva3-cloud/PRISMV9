/**
 * ToolOverhangEngine — Unit Tests
 * @milestone FORGE-ENGINES-B18
 */
import { describe, it, expect } from "vitest";
import { toolOverhangEngine } from "../engines/ToolOverhangEngine.js";

describe("ToolOverhangEngine", () => {
  it("calculates minimum stickout from depth + clearance", () => {
    const r = toolOverhangEngine.calculate({
      tool_diameter_mm: 10,
      feature_depth_mm: 20,
      clearance_mm: 5,
    });
    expect(r.minimum_stickout.value).toBe(25);
    expect(r.recommended_stickout.value).toBe(25);
  });

  it("rounds recommended stickout to 5mm", () => {
    const r = toolOverhangEngine.calculate({
      tool_diameter_mm: 10,
      feature_depth_mm: 22,
    });
    // 22+5=27, rounds to 30
    expect(r.recommended_stickout.value).toBe(30);
  });

  it("calculates L/D ratio", () => {
    const r = toolOverhangEngine.calculate({
      tool_diameter_mm: 10,
      feature_depth_mm: 30,
    });
    expect(r.ld_ratio.value).toBe(3.5);
  });

  it("tip deflection decreases with stiffer holder", () => {
    const collet = toolOverhangEngine.calculate({
      tool_diameter_mm: 8,
      feature_depth_mm: 25,
      holder_type: "collet",
    });
    const shrink = toolOverhangEngine.calculate({
      tool_diameter_mm: 8,
      feature_depth_mm: 25,
      holder_type: "shrink_fit",
    });
    expect(shrink.tip_deflection.value).toBeLessThan(
      collet.tip_deflection.value
    );
  });

  it("warns high L/D > 5", () => {
    const r = toolOverhangEngine.calculate({
      tool_diameter_mm: 6,
      feature_depth_mm: 30,
    });
    expect(
      r.warnings.some(w => w.includes("5"))
    ).toBe(true);
  });

  it("warns HSS at high L/D", () => {
    const r = toolOverhangEngine.calculate({
      tool_diameter_mm: 8,
      feature_depth_mm: 25,
      tool_material: "hss",
    });
    expect(
      r.warnings.some(w => w.includes("carbide"))
    ).toBe(true);
  });

  it("stiffness is positive", () => {
    const r = toolOverhangEngine.calculate({
      tool_diameter_mm: 12,
      feature_depth_mm: 20,
    });
    expect(r.stiffness.value).toBeGreaterThan(0);
  });

  it("deflection at surface = 2× tip deflection", () => {
    const r = toolOverhangEngine.calculate({
      tool_diameter_mm: 10,
      feature_depth_mm: 30,
    });
    expect(r.deflection_at_surface.value).toBeCloseTo(
      r.tip_deflection.value * 2, 3
    );
  });
});
