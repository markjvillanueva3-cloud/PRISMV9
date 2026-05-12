/**
 * TappingTorqueEngine — Unit Tests
 * @milestone FORGE-ENGINES-TESTGAP
 */
import { describe, it, expect } from "vitest";
import { tappingTorqueEngine } from "../engines/TappingTorqueEngine.js";

describe("TappingTorqueEngine", () => {
  const base = {
    thread_major_diameter_mm: 10,
    pitch_mm: 1.5,
  };

  it("cutting torque > 0", () => {
    const r = tappingTorqueEngine.calculate(base);
    expect(r.cutting_torque_Nm.value).toBeGreaterThan(0);
  });

  it("axial thrust > 0", () => {
    const r = tappingTorqueEngine.calculate(base);
    expect(r.axial_thrust_N.value).toBeGreaterThan(0);
  });

  it("tapping power > 0", () => {
    const r = tappingTorqueEngine.calculate(base);
    expect(r.tapping_power_kW.value).toBeGreaterThan(0);
  });

  it("larger thread requires more torque", () => {
    const small = tappingTorqueEngine.calculate({ thread_major_diameter_mm: 6, pitch_mm: 1 });
    const large = tappingTorqueEngine.calculate({ thread_major_diameter_mm: 20, pitch_mm: 2.5 });
    expect(large.cutting_torque_Nm.value).toBeGreaterThan(
      small.cutting_torque_Nm.value
    );
  });

  it("torque margin > 0", () => {
    const r = tappingTorqueEngine.calculate(base);
    expect(r.torque_margin_pct.value).toBeGreaterThan(0);
  });

  it("max safe RPM > 0", () => {
    const r = tappingTorqueEngine.calculate(base);
    expect(r.max_safe_rpm.value).toBeGreaterThan(0);
  });
});
