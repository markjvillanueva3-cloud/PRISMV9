/**
 * Batch 73 — DrumBrake, ShockAbsorber, UltrasonicFlowMeter
 * @milestone FORGE-ENGINES-BATCH73
 */
import { describe, it, expect } from "vitest";
import { drumBrakeEngine } from "../engines/DrumBrakeEngine.js";
import { shockAbsorberEngine } from "../engines/ShockAbsorberEngine.js";
import { ultrasonicFlowMeterEngine } from "../engines/UltrasonicFlowMeterEngine.js";

describe("DrumBrakeEngine", () => {
  const base = { drum_diameter_mm: 250, drum_width_mm: 50, actuation_force_N: 3000 };
  it("braking torque > 0", () => {
    expect(drumBrakeEngine.calculate(base).braking_torque_Nm.value).toBeGreaterThan(0);
  });
  it("duo-servo has higher shoe factor", () => {
    const lt = drumBrakeEngine.calculate({ ...base, shoe_type: "leading_trailing" }).shoe_factor.value;
    const ds = drumBrakeEngine.calculate({ ...base, shoe_type: "duo_servo" }).shoe_factor.value;
    expect(ds).toBeGreaterThan(lt);
  });
  it("drum temp rise > 0", () => {
    expect(drumBrakeEngine.calculate(base).drum_temp_rise_C.value).toBeGreaterThan(0);
  });
  it("stopping distance > 0", () => {
    expect(drumBrakeEngine.calculate(base).stopping_distance_m.value).toBeGreaterThan(0);
  });
  it("more force = more torque", () => {
    const lo = drumBrakeEngine.calculate({ ...base, actuation_force_N: 1000 });
    const hi = drumBrakeEngine.calculate({ ...base, actuation_force_N: 5000 });
    expect(hi.braking_torque_Nm.value).toBeGreaterThan(lo.braking_torque_Nm.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(drumBrakeEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("ShockAbsorberEngine", () => {
  const base = { piston_diameter_mm: 46, rod_diameter_mm: 16, stroke_mm: 150 };
  it("rebound > compression damping", () => {
    const r = shockAbsorberEngine.calculate(base);
    expect(r.rebound_damping_Ns_m.value).toBeGreaterThan(r.compression_damping_Ns_m.value);
  });
  it("natural frequency in ride range", () => {
    const fn = shockAbsorberEngine.calculate(base).natural_frequency_Hz.value;
    expect(fn).toBeGreaterThan(0.5);
    expect(fn).toBeLessThan(5);
  });
  it("damping ratio 0 < ζ < 1", () => {
    const z = shockAbsorberEngine.calculate(base).damping_ratio.value;
    expect(z).toBeGreaterThan(0);
    expect(z).toBeLessThan(1);
  });
  it("heat dissipation > 0", () => {
    expect(shockAbsorberEngine.calculate(base).heat_dissipation_W.value).toBeGreaterThan(0);
  });
  it("oil volume > 0", () => {
    expect(shockAbsorberEngine.calculate(base).oil_volume_cc.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(shockAbsorberEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("UltrasonicFlowMeterEngine", () => {
  const base = { pipe_diameter_mm: 100 };
  it("flow rate > 0", () => {
    expect(ultrasonicFlowMeterEngine.calculate(base).flow_rate_m3_h.value).toBeGreaterThan(0);
  });
  it("transit time diff > 0", () => {
    expect(ultrasonicFlowMeterEngine.calculate(base).transit_time_diff_ns.value).toBeGreaterThan(0);
  });
  it("transit time more accurate than doppler", () => {
    const tt = ultrasonicFlowMeterEngine.calculate({ ...base, mode: "transit_time" }).accuracy_pct.value;
    const dp = ultrasonicFlowMeterEngine.calculate({ ...base, mode: "doppler" }).accuracy_pct.value;
    expect(tt).toBeLessThan(dp);
  });
  it("more paths = better accuracy", () => {
    const p1 = ultrasonicFlowMeterEngine.calculate({ ...base, num_paths: 1 }).accuracy_pct.value;
    const p4 = ultrasonicFlowMeterEngine.calculate({ ...base, num_paths: 4 }).accuracy_pct.value;
    expect(p4).toBeLessThan(p1);
  });
  it("clamp-on lower signal than inline", () => {
    const inl = ultrasonicFlowMeterEngine.calculate({ ...base, mount_type: "inline" }).signal_strength_dB.value;
    const clp = ultrasonicFlowMeterEngine.calculate({ ...base, mount_type: "clamp_on" }).signal_strength_dB.value;
    expect(clp).toBeLessThan(inl);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(ultrasonicFlowMeterEngine.calculate(base).recommendations)).toBe(true);
  });
});
