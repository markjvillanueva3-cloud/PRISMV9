/**
 * CoolantStrategyEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { coolantStrategyEngine } from "../engines/CoolantStrategyEngine.js";

describe("CoolantStrategyEngine", () => {
  const base = { workpiece_material: "carbon_steel" as const, operation: "turning_rough" as const };

  it("concentration > 0", () => {
    const r = coolantStrategyEngine.calculate(base);
    expect(r.concentration_pct.value).toBeGreaterThan(0);
  });

  it("pressure > 0", () => {
    const r = coolantStrategyEngine.calculate(base);
    expect(r.pressure_bar.value).toBeGreaterThan(0);
  });

  it("flow rate > 0", () => {
    const r = coolantStrategyEngine.calculate(base);
    expect(r.flow_rate_l_min.value).toBeGreaterThan(0);
  });

  it("temperature target > 0", () => {
    const r = coolantStrategyEngine.calculate(base);
    expect(r.temperature_target_c.value).toBeGreaterThan(0);
  });

  it("drilling has higher pressure than turning", () => {
    const turn = coolantStrategyEngine.calculate(base);
    const drill = coolantStrategyEngine.calculate({
      ...base, operation: "drilling" as const, hole_diameter_mm: 10, hole_depth_mm: 30,
    });
    expect(drill.pressure_bar.value).toBeGreaterThanOrEqual(
      turn.pressure_bar.value
    );
  });

  it("recommendations is array", () => {
    const r = coolantStrategyEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
