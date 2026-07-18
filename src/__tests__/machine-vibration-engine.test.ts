/**
 * MachineVibrationEngine — Unit Tests
 * @milestone FORGE-ENGINES-B44
 */
import { describe, it, expect } from "vitest";
import { machineVibrationEngine } from "../engines/MachineVibrationEngine.js";

describe("MachineVibrationEngine", () => {
  it("critical depth > 0", () => {
    const r = machineVibrationEngine.calculate({});
    expect(r.critical_depth_mm.value).toBeGreaterThan(0);
  });

  it("higher stiffness increases critical depth", () => {
    const soft = machineVibrationEngine.calculate({ stiffness_n_um: 5 });
    const stiff = machineVibrationEngine.calculate({ stiffness_n_um: 50 });
    expect(stiff.critical_depth_mm.value).toBeGreaterThan(
      soft.critical_depth_mm.value
    );
  });

  it("more flutes reduces critical depth", () => {
    const two = machineVibrationEngine.calculate({ num_flutes: 2 });
    const six = machineVibrationEngine.calculate({ num_flutes: 6 });
    expect(six.critical_depth_mm.value).toBeLessThan(
      two.critical_depth_mm.value
    );
  });

  it("tooth passing frequency = flutes × RPM / 60", () => {
    const r = machineVibrationEngine.calculate({
      num_flutes: 4,
      spindle_rpm: 6000,
    });
    expect(r.tooth_passing_freq.value).toBe(400);
  });

  it("chatter frequency near natural frequency", () => {
    const r = machineVibrationEngine.calculate({ natural_frequency_hz: 1000 });
    expect(r.chatter_frequency.value).toBeGreaterThan(990);
    expect(r.chatter_frequency.value).toBeLessThan(1100);
  });

  it("stable RPMs are > 0", () => {
    const r = machineVibrationEngine.calculate({});
    expect(r.stable_rpm_1.value).toBeGreaterThan(0);
    expect(r.stable_rpm_2.value).toBeGreaterThan(0);
  });

  it("ISO zone is valid", () => {
    const r = machineVibrationEngine.calculate({});
    expect(r.iso_zone.unit).toMatch(/Good|Acceptable|Alert|Danger/);
  });

  it("high vibration gives worse ISO zone", () => {
    const low = machineVibrationEngine.calculate({ vibration_velocity_mm_s: 0.5 });
    const high = machineVibrationEngine.calculate({ vibration_velocity_mm_s: 10 });
    expect(high.iso_zone.value).toBeGreaterThan(low.iso_zone.value);
  });

  it("recommended RPM > 0", () => {
    const r = machineVibrationEngine.calculate({});
    expect(r.recommended_rpm.value).toBeGreaterThan(0);
  });

  it("warns low damping", () => {
    const r = machineVibrationEngine.calculate({ damping_ratio: 0.005 });
    expect(r.warnings.some(w => w.includes("amping"))).toBe(true);
  });
});
