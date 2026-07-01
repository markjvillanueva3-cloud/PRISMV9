/**
 * ThermalGrowthCompensationEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { thermalGrowthCompensationEngine } from "../engines/ThermalGrowthCompensationEngine.js";

describe("ThermalGrowthCompensationEngine", () => {
  const base = {
    spindle_speed_rpm: 8000,
    cutting_time_min: 30,
    tool_overhang_mm: 60,
  };

  it("spindle growth > 0", () => {
    const r = thermalGrowthCompensationEngine.calculate(base);
    expect(r.spindle_growth_um.value).toBeGreaterThan(0);
  });

  it("total Z error is non-zero", () => {
    const r = thermalGrowthCompensationEngine.calculate(base);
    expect(Math.abs(r.total_z_error_um.value)).toBeGreaterThan(0);
  });

  it("higher RPM increases spindle growth", () => {
    const lo = thermalGrowthCompensationEngine.calculate({ ...base, spindle_speed_rpm: 3000 });
    const hi = thermalGrowthCompensationEngine.calculate({ ...base, spindle_speed_rpm: 15000 });
    expect(hi.spindle_growth_um.value).toBeGreaterThan(
      lo.spindle_growth_um.value
    );
  });

  it("longer cutting time increases growth", () => {
    const short = thermalGrowthCompensationEngine.calculate({ ...base, cutting_time_min: 5 });
    const long = thermalGrowthCompensationEngine.calculate({ ...base, cutting_time_min: 120 });
    expect(long.spindle_growth_um.value).toBeGreaterThan(
      short.spindle_growth_um.value
    );
  });

  it("compensation needed is non-zero", () => {
    const r = thermalGrowthCompensationEngine.calculate(base);
    expect(Math.abs(r.compensation_needed_mm.value)).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = thermalGrowthCompensationEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
