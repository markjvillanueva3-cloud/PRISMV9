/**
 * ToolGeometrySelectionEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { toolGeometrySelectionEngine } from "../engines/ToolGeometrySelectionEngine.js";

describe("ToolGeometrySelectionEngine", () => {
  const base = {
    workpiece_material: "carbon_steel" as const,
    operation: "roughing" as const,
    tool_diameter_mm: 10,
  };

  it("recommended flutes > 0", () => {
    const r = toolGeometrySelectionEngine.calculate(base);
    expect(r.recommended_flutes.value).toBeGreaterThan(0);
  });

  it("helix angle > 0", () => {
    const r = toolGeometrySelectionEngine.calculate(base);
    expect(r.helix_angle_deg.value).toBeGreaterThan(0);
  });

  it("corner radius ≥ 0", () => {
    const r = toolGeometrySelectionEngine.calculate(base);
    expect(r.corner_radius_mm.value).toBeGreaterThanOrEqual(0);
  });

  it("core diameter > 0", () => {
    const r = toolGeometrySelectionEngine.calculate(base);
    expect(r.core_diameter_pct.value).toBeGreaterThan(0);
  });

  it("aluminum gets fewer flutes than steel", () => {
    const steel = toolGeometrySelectionEngine.calculate(base);
    const alu = toolGeometrySelectionEngine.calculate({
      ...base, workpiece_material: "aluminum" as const,
    });
    expect(alu.recommended_flutes.value).toBeLessThanOrEqual(
      steel.recommended_flutes.value
    );
  });

  it("recommendations is array", () => {
    const r = toolGeometrySelectionEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
