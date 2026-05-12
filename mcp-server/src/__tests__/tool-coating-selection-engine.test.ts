/**
 * ToolCoatingSelectionEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { toolCoatingSelectionEngine } from "../engines/ToolCoatingSelectionEngine.js";

describe("ToolCoatingSelectionEngine", () => {
  const base = {
    material_class: "steel" as const,
    operation_type: "milling" as const,
  };

  it("suitability score > 0", () => {
    const r = toolCoatingSelectionEngine.calculate(base);
    expect(r.suitability_score.value).toBeGreaterThan(0);
  });

  it("max service temperature > 0", () => {
    const r = toolCoatingSelectionEngine.calculate(base);
    expect(r.max_service_temperature_C.value).toBeGreaterThan(0);
  });

  it("friction coefficient > 0 and < 1", () => {
    const r = toolCoatingSelectionEngine.calculate(base);
    expect(r.friction_coefficient.value).toBeGreaterThan(0);
    expect(r.friction_coefficient.value).toBeLessThan(1);
  });

  it("coating hardness > 0", () => {
    const r = toolCoatingSelectionEngine.calculate(base);
    expect(r.coating_hardness_HV.value).toBeGreaterThan(0);
  });

  it("speed multiplier ≥ 1", () => {
    const r = toolCoatingSelectionEngine.calculate(base);
    expect(r.speed_multiplier.value).toBeGreaterThanOrEqual(1);
  });

  it("recommendations is array", () => {
    const r = toolCoatingSelectionEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
