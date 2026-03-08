/**
 * ToolDeflectionPredictionEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { toolDeflectionPredictionEngine } from "../engines/ToolDeflectionPredictionEngine.js";

describe("ToolDeflectionPredictionEngine", () => {
  const base = {
    tool_diameter_mm: 10,
    tool_overhang_mm: 50,
    cutting_force_N: 200,
  };

  it("static deflection > 0", () => {
    const r = toolDeflectionPredictionEngine.calculate(base);
    expect(r.static_deflection_um.value).toBeGreaterThan(0);
  });

  it("dimensional error > 0", () => {
    const r = toolDeflectionPredictionEngine.calculate(base);
    expect(r.dimensional_error_um.value).toBeGreaterThan(0);
  });

  it("longer overhang increases deflection", () => {
    const short = toolDeflectionPredictionEngine.calculate({ ...base, tool_overhang_mm: 30 });
    const long = toolDeflectionPredictionEngine.calculate({ ...base, tool_overhang_mm: 80 });
    expect(long.static_deflection_um.value).toBeGreaterThan(
      short.static_deflection_um.value
    );
  });

  it("safety factor > 0", () => {
    const r = toolDeflectionPredictionEngine.calculate(base);
    expect(r.safety_factor.value).toBeGreaterThan(0);
  });

  it("stiffness > 0", () => {
    const r = toolDeflectionPredictionEngine.calculate(base);
    expect(r.stiffness_N_per_um.value).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = toolDeflectionPredictionEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
