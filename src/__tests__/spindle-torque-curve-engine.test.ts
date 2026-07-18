/**
 * SpindleTorqueCurveEngine — Unit Tests
 * @milestone FORGE-ENGINES-B22
 */
import { describe, it, expect } from "vitest";
import {
  spindleTorqueCurveEngine,
} from "../engines/SpindleTorqueCurveEngine.js";

describe("SpindleTorqueCurveEngine", () => {
  it("constant torque below base speed", () => {
    const r = spindleTorqueCurveEngine.calculate({
      operating_rpm: 500,
      max_torque_nm: 120,
      max_power_kw: 22,
    });
    expect(r.operating_region.unit).toBe("constant_torque");
    expect(r.available_torque.value).toBeCloseTo(120, 0);
  });

  it("constant power above base speed", () => {
    const r = spindleTorqueCurveEngine.calculate({
      operating_rpm: 8000,
      max_torque_nm: 120,
      max_power_kw: 22,
      max_rpm: 12000,
    });
    expect(r.operating_region.unit).toBe("constant_power");
    expect(r.available_power.value).toBeCloseTo(22, 0);
  });

  it("torque decreases above base speed", () => {
    const base = spindleTorqueCurveEngine.calculate({
      operating_rpm: 1000,
      max_torque_nm: 200,
      max_power_kw: 15,
    });
    const high = spindleTorqueCurveEngine.calculate({
      operating_rpm: 6000,
      max_torque_nm: 200,
      max_power_kw: 15,
      max_rpm: 10000,
    });
    expect(high.available_torque.value).toBeLessThan(
      base.available_torque.value
    );
  });

  it("warns insufficient torque", () => {
    const r = spindleTorqueCurveEngine.calculate({
      operating_rpm: 8000,
      max_torque_nm: 50,
      max_power_kw: 15,
      max_rpm: 12000,
      required_torque_nm: 100,
    });
    expect(r.torque_sufficient.value).toBe(0);
    expect(
      r.warnings.some(w => w.includes("torque"))
    ).toBe(true);
  });

  it("warns insufficient power", () => {
    const r = spindleTorqueCurveEngine.calculate({
      operating_rpm: 5000,
      max_power_kw: 10,
      required_power_kw: 15,
    });
    expect(r.power_sufficient.value).toBe(0);
  });

  it("gear spindle has higher max torque than direct", () => {
    const gear = spindleTorqueCurveEngine.calculate({
      operating_rpm: 200,
      spindle_type: "gear",
    });
    const direct = spindleTorqueCurveEngine.calculate({
      operating_rpm: 200,
      spindle_type: "direct",
    });
    expect(gear.available_torque.value).toBeGreaterThan(
      direct.available_torque.value
    );
  });

  it("low gear multiplies torque", () => {
    const high = spindleTorqueCurveEngine.calculate({
      operating_rpm: 500,
      gear_range: "high",
    });
    const low = spindleTorqueCurveEngine.calculate({
      operating_rpm: 500,
      gear_range: "low",
    });
    expect(low.available_torque.value).toBeGreaterThan(
      high.available_torque.value
    );
  });

  it("base speed calculated from power and torque", () => {
    const r = spindleTorqueCurveEngine.calculate({
      operating_rpm: 3000,
      max_power_kw: 22,
      max_torque_nm: 120,
    });
    // base = P*1000*60/(2π*T) = 22000*60/(2π*120) ≈ 1750
    expect(r.base_speed.value).toBeGreaterThan(1000);
    expect(r.base_speed.value).toBeLessThan(3000);
  });

  it("warns field weakening above max RPM", () => {
    const r = spindleTorqueCurveEngine.calculate({
      operating_rpm: 15000,
      max_rpm: 10000,
    });
    expect(r.operating_region.unit).toBe("field_weakening");
    expect(
      r.warnings.some(w => w.includes("field weakening") ||
        w.includes("exceeds"))
    ).toBe(true);
  });

  it("duty cycle derates power", () => {
    const s1 = spindleTorqueCurveEngine.calculate({
      operating_rpm: 5000,
      duty_cycle: "S1",
    });
    const s3 = spindleTorqueCurveEngine.calculate({
      operating_rpm: 5000,
      duty_cycle: "S3_25",
    });
    expect(s3.available_power.value).toBeLessThan(
      s1.available_power.value
    );
  });
});
