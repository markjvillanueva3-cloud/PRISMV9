/**
 * U-DEA-november-P01 (DEA-MS0) — inject_thermal_compensate + post_thermal_compensate
 *
 * Tests the cross-wire activation of the precision-cluster engine pair:
 * MachineGeometricAccuracyEngine.thermalErrorModel  →
 *   MotionControllerInjectionEngine.inject_thermal_compensate.
 *
 * The dispatcher action `post_thermal_compensate` chains the two; this suite
 * also asserts the chain in the same shape (E2E without the MCP transport).
 *
 * Coverage:
 *   happy path · 3 failure modes · 2 adversarial · 3 controllers · 1 E2E chain.
 */
import { describe, it, expect } from "vitest";
import { motionControllerInjectionEngine } from "../engines/MotionControllerInjectionEngine.js";
import { machineGeometricAccuracyEngine } from "../engines/MachineGeometricAccuracyEngine.js";

// Linear ramp: 4 calibration points where position error scales cleanly with sensor temps.
// Two sensors (ambient + spindle). Designed so the OLS thermal model produces
// near-unity R² and a compensation that interpolates current_temps[25, 38] sensibly.
const CALIB = [
  { temps: [20, 25], position_errors: { dx: 0.0,    dy: 0.0,    dz: 0.0    } },
  { temps: [22, 30], position_errors: { dx: 0.005,  dy: 0.003,  dz: 0.008  } },
  { temps: [24, 35], position_errors: { dx: 0.010,  dy: 0.006,  dz: 0.016  } },
  { temps: [26, 40], position_errors: { dx: 0.015,  dy: 0.009,  dz: 0.024  } },
];
const CURRENT = [25, 38];
const GCODE = "%\nO1234 (TEST PART)\nT01 M06\nG54 G90 G00 X0 Y0\nG43 H01 Z25.\nM30\n%";

describe("inject_thermal_compensate (U-DEA-november-P01)", () => {
  it("happy path: Fanuc, non-zero compensation, emits one G10 L20 line", () => {
    const r = motionControllerInjectionEngine.inject_thermal_compensate({
      controller: "fanuc",
      gcode: GCODE,
      compensation: { dx: -0.0125, dy: -0.0075, dz: -0.0200 }, // typical post-cooling load
    });
    expect(r.codes_added.length).toBe(1);
    const code = r.codes_added[0];
    expect(code).toMatch(/^G10 L20 P1 X-0\.0125 Y-0\.0075 Z-0\.0200 \(THERMAL COMP ADD\)$/);
    expect(r.injected_gcode.split("\n")).toContain(code);
    expect(r.injections).toHaveLength(1);
    expect(r.injections[0].tier_required).toBe(3);
  });

  it("failure: zero compensation magnitude → no-op", () => {
    const r = motionControllerInjectionEngine.inject_thermal_compensate({
      controller: "fanuc",
      gcode: GCODE,
      compensation: { dx: 0, dy: 0, dz: 0 },
    });
    expect(r.codes_added).toEqual([]);
    expect(r.injections).toEqual([]);
    expect(r.injected_gcode).toBe(GCODE);
  });

  it("failure: empty gcode → empty injected_gcode, no codes", () => {
    const r = motionControllerInjectionEngine.inject_thermal_compensate({
      controller: "fanuc",
      gcode: "",
      compensation: { dx: 0.01, dy: 0, dz: 0 },
    });
    expect(r.codes_added).toEqual([]);
    expect(r.injected_gcode).toBe("");
  });

  it("failure: unsupported controller → falls back to Fanuc G10 L20 with warning explanation", () => {
    const r = motionControllerInjectionEngine.inject_thermal_compensate({
      // @ts-expect-error testing runtime fallback for unknown controller string
      controller: "made_up_controller",
      gcode: GCODE,
      compensation: { dx: 0.01, dy: 0, dz: 0 },
    });
    expect(r.codes_added).toHaveLength(1);
    expect(r.codes_added[0]).toMatch(/^G10 L20 P1 X0\.0100/);
    const explanation = r.codes_explanation[r.codes_added[0]];
    expect(explanation).toMatch(/fallback to fanuc/i);
    expect(explanation).toMatch(/made_up_controller/);
  });

  it("adversarial: NaN compensation → no-op (Math.hypot guard, no throw)", () => {
    const r = motionControllerInjectionEngine.inject_thermal_compensate({
      controller: "fanuc",
      gcode: GCODE,
      compensation: { dx: NaN, dy: 0, dz: 0 },
    });
    expect(r.codes_added).toEqual([]);
    expect(r.injected_gcode).toBe(GCODE);
  });

  it("adversarial: massive 5mm compensation still emits (no silent clamp)", () => {
    const r = motionControllerInjectionEngine.inject_thermal_compensate({
      controller: "fanuc",
      gcode: GCODE,
      compensation: { dx: 5.0, dy: 0, dz: 0 },
    });
    expect(r.codes_added).toHaveLength(1);
    expect(r.codes_added[0]).toMatch(/X5\.0000 Y0\.0000 Z0\.0000/);
  });

  // Variability: ≥3 controllers, each with its correct native code format.
  it("variability: Fanuc emits G10 L20 P-form", () => {
    const r = motionControllerInjectionEngine.inject_thermal_compensate({
      controller: "fanuc",
      gcode: GCODE,
      compensation: { dx: 0.01, dy: 0.02, dz: 0.03 },
      wcs_code: "G55", // exercise non-default WCS
    });
    expect(r.codes_added[0]).toMatch(/^G10 L20 P2 X0\.0100 Y0\.0200 Z0\.0300/);
  });

  it("variability: Siemens emits three additive $P_UIFR lines", () => {
    const r = motionControllerInjectionEngine.inject_thermal_compensate({
      controller: "siemens",
      gcode: GCODE,
      compensation: { dx: 0.01, dy: 0.02, dz: 0.03 },
    });
    expect(r.codes_added).toHaveLength(3);
    expect(r.codes_added[0]).toMatch(/^\$P_UIFR\[1,X,TR\]=\$P_UIFR\[1,X,TR\]\+0\.0100 ;THERMAL$/);
    expect(r.codes_added[1]).toMatch(/^\$P_UIFR\[1,Y,TR\]=\$P_UIFR\[1,Y,TR\]\+0\.0200$/);
    expect(r.codes_added[2]).toMatch(/^\$P_UIFR\[1,Z,TR\]=\$P_UIFR\[1,Z,TR\]\+0\.0300$/);
  });

  it("variability: Heidenhain emits TRANS datum-shift", () => {
    const r = motionControllerInjectionEngine.inject_thermal_compensate({
      controller: "heidenhain",
      gcode: GCODE,
      compensation: { dx: 0.01, dy: 0.02, dz: 0.03 },
    });
    expect(r.codes_added).toHaveLength(1);
    expect(r.codes_added[0]).toMatch(/^TRANS X0\.0100 Y0\.0200 Z0\.0300 ;THERMAL COMP$/);
  });

  it("variability: insertion_line places thermal line at chosen offset", () => {
    const r = motionControllerInjectionEngine.inject_thermal_compensate({
      controller: "fanuc",
      gcode: "L0\nL1\nL2\nL3",
      compensation: { dx: 0.01, dy: 0, dz: 0 },
      insertion_line: 2,
    });
    const lines = r.injected_gcode.split("\n");
    expect(lines[0]).toBe("L0");
    expect(lines[1]).toBe("L1");
    expect(lines[2]).toMatch(/^G10 L20/);
    expect(lines[3]).toBe("L2");
    expect(lines[4]).toBe("L3");
  });
});

describe("post_thermal_compensate E2E chain (dispatcher pattern, U-DEA-november-P01)", () => {
  it("chains thermalErrorModel → inject_thermal_compensate with clean linear calibration", () => {
    // Step 1: dispatcher would call machineAccuracy.thermalErrorModel
    const thermal = machineGeometricAccuracyEngine.thermalErrorModel({
      calibration_data: CALIB,
      current_temps: CURRENT,
      sensor_names: ["ambient", "spindle"],
    });
    // OLS over a clean linear ramp must produce a high-quality fit and non-zero compensation
    expect(thermal.model_r_squared.x).toBeGreaterThan(0.95);
    expect(thermal.model_r_squared.z).toBeGreaterThan(0.95);
    const mag = Math.hypot(thermal.compensation.dx, thermal.compensation.dy, thermal.compensation.dz);
    expect(mag).toBeGreaterThan(0);

    // Step 2: dispatcher would call motionInjection.inject_thermal_compensate with that compensation
    const motion = motionControllerInjectionEngine.inject_thermal_compensate({
      controller: "fanuc",
      gcode: GCODE,
      compensation: thermal.compensation,
    });
    expect(motion.codes_added).toHaveLength(1);
    expect(motion.codes_added[0]).toMatch(/^G10 L20 P1 X-?\d+\.\d{4} Y-?\d+\.\d{4} Z-?\d+\.\d{4} \(THERMAL COMP ADD\)$/);
    expect(motion.injected_gcode).toContain(motion.codes_added[0]);
    expect(motion.injections[0].explanation).toMatch(/dx=-?\d+\.\d{4}/);
  });

  it("chain failure: insufficient calibration (<3 points) → zero comp → no injection", () => {
    const thermal = machineGeometricAccuracyEngine.thermalErrorModel({
      calibration_data: CALIB.slice(0, 2), // only 2 points (engine requires ≥3)
      current_temps: CURRENT,
    });
    expect(thermal.compensation).toEqual({ dx: 0, dy: 0, dz: 0 });

    const motion = motionControllerInjectionEngine.inject_thermal_compensate({
      controller: "fanuc",
      gcode: GCODE,
      compensation: thermal.compensation,
    });
    expect(motion.codes_added).toEqual([]);
  });
});
