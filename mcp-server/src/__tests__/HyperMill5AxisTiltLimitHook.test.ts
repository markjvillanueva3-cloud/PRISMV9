/**
 * HyperMill5AxisTiltLimitHook tests — CAM-EXHAUST-MS0 / U-CAM-HM-TILT-TESTS-01
 *
 * Coverage:
 *   1. hypermill5AxisTiltLimitHook
 *      - happy path inside both axis envelopes
 *      - A-axis violation only
 *      - B-axis violation only
 *      - both-axis violation (joined reason)
 *      - boundary equality (== min, == max)
 *      - margin_deg computation
 *   2. hypermill5AxisCollisionGate
 *      - tilt+clearance both pass
 *      - clearance fail (CL < 0.5*D)
 *      - tilt fail propagates to overall pass
 *      - clearance omitted → collisionPass=true
 *      - default toolDiameterMm=10 when omitted
 *   3. MACHINE_TILT_PRESETS schema invariant
 *
 * Strict legitimacy: concrete assertions, named constants, no `as any`.
 */

import { describe, it, expect } from "vitest";
import {
  hypermill5AxisTiltLimitHook,
  hypermill5AxisCollisionGate,
  MACHINE_TILT_PRESETS,
} from "../engines/HyperMill5AxisTiltLimitHook.js";

const A_MIN = -120;
const A_MAX = 30;
const B_MIN = -360;
const B_MAX = 360;
const A_INSIDE = -45;
const B_INSIDE = 180;
const A_OUTSIDE = 45;     // > A_MAX
const A_BELOW = -150;     // < A_MIN
const B_OUTSIDE = 400;    // > B_MAX
const TOOL_DIA_MM = 10;
const SAFE_CLEARANCE_MM = 8;     // > 0.5*10 = 5
const UNSAFE_CLEARANCE_MM = 3;   // < 5
const DEFAULT_TOOL_DIA_MM = 10;

describe("hypermill5AxisTiltLimitHook — happy path", () => {
  it("passes when both axes inside envelope", () => {
    const result = hypermill5AxisTiltLimitHook({
      tilt_a_deg: A_INSIDE,
      tilt_b_deg: B_INSIDE,
      machine_a_min: A_MIN,
      machine_a_max: A_MAX,
      machine_b_min: B_MIN,
      machine_b_max: B_MAX,
    });
    expect(result.pass).toBe(true);
    expect(result.reason).toBe(undefined);
    expect(result.a_axis.pass).toBe(true);
    expect(result.b_axis.pass).toBe(true);
  });

  it("computes A-axis margin as min of distance-to-min, distance-to-max", () => {
    const result = hypermill5AxisTiltLimitHook({
      tilt_a_deg: 0,
      tilt_b_deg: 0,
      machine_a_min: A_MIN, // -120
      machine_a_max: A_MAX, // 30
      machine_b_min: B_MIN,
      machine_b_max: B_MAX,
    });
    // |0 - (-120)| = 120, |30 - 0| = 30 → margin = 30
    expect(result.a_axis.margin_deg).toBe(30);
  });

  it("computes B-axis margin correctly", () => {
    const result = hypermill5AxisTiltLimitHook({
      tilt_a_deg: 0,
      tilt_b_deg: 0,
      machine_a_min: A_MIN,
      machine_a_max: A_MAX,
      machine_b_min: B_MIN, // -360
      machine_b_max: B_MAX, // 360
    });
    expect(result.b_axis.margin_deg).toBe(360);
  });

  it("margin_deg = 0 when at exact boundary (min)", () => {
    const result = hypermill5AxisTiltLimitHook({
      tilt_a_deg: A_MIN,
      tilt_b_deg: 0,
      machine_a_min: A_MIN,
      machine_a_max: A_MAX,
      machine_b_min: B_MIN,
      machine_b_max: B_MAX,
    });
    expect(result.a_axis.pass).toBe(true);
    expect(result.a_axis.margin_deg).toBe(0);
  });

  it("margin_deg = 0 when at exact boundary (max)", () => {
    const result = hypermill5AxisTiltLimitHook({
      tilt_a_deg: A_MAX,
      tilt_b_deg: 0,
      machine_a_min: A_MIN,
      machine_a_max: A_MAX,
      machine_b_min: B_MIN,
      machine_b_max: B_MAX,
    });
    expect(result.a_axis.pass).toBe(true);
    expect(result.a_axis.margin_deg).toBe(0);
  });
});

describe("hypermill5AxisTiltLimitHook — failure modes", () => {
  it("A-axis above max → fail with reason mentioning A-axis", () => {
    const result = hypermill5AxisTiltLimitHook({
      tilt_a_deg: A_OUTSIDE,
      tilt_b_deg: B_INSIDE,
      machine_a_min: A_MIN,
      machine_a_max: A_MAX,
      machine_b_min: B_MIN,
      machine_b_max: B_MAX,
    });
    expect(result.pass).toBe(false);
    expect(result.a_axis.pass).toBe(false);
    expect(result.a_axis.margin_deg).toBe(0);
    expect(result.reason).toContain("A-axis");
    expect(result.reason).toContain(`${A_OUTSIDE}°`);
  });

  it("A-axis below min → fail", () => {
    const result = hypermill5AxisTiltLimitHook({
      tilt_a_deg: A_BELOW,
      tilt_b_deg: B_INSIDE,
      machine_a_min: A_MIN,
      machine_a_max: A_MAX,
      machine_b_min: B_MIN,
      machine_b_max: B_MAX,
    });
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("A-axis");
  });

  it("B-axis violation only → fail with B reason", () => {
    const result = hypermill5AxisTiltLimitHook({
      tilt_a_deg: A_INSIDE,
      tilt_b_deg: B_OUTSIDE,
      machine_a_min: A_MIN,
      machine_a_max: A_MAX,
      machine_b_min: B_MIN,
      machine_b_max: B_MAX,
    });
    expect(result.pass).toBe(false);
    expect(result.b_axis.pass).toBe(false);
    expect(result.a_axis.pass).toBe(true);
    expect(result.reason).toContain("B-axis");
    expect(result.reason).not.toContain("A-axis");
  });

  it("both axes violate → reason joins with semicolon", () => {
    const result = hypermill5AxisTiltLimitHook({
      tilt_a_deg: A_OUTSIDE,
      tilt_b_deg: B_OUTSIDE,
      machine_a_min: A_MIN,
      machine_a_max: A_MAX,
      machine_b_min: B_MIN,
      machine_b_max: B_MAX,
    });
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("A-axis");
    expect(result.reason).toContain("B-axis");
    expect(result.reason).toContain(";");
  });
});

describe("hypermill5AxisCollisionGate — happy path", () => {
  it("passes when tilt + clearance both safe", () => {
    const result = hypermill5AxisCollisionGate({
      tilt_a_deg: A_INSIDE,
      tilt_b_deg: B_INSIDE,
      machine_a_min: A_MIN,
      machine_a_max: A_MAX,
      machine_b_min: B_MIN,
      machine_b_max: B_MAX,
      toolDiameterMm: TOOL_DIA_MM,
      estimatedClearanceMm: SAFE_CLEARANCE_MM,
    });
    expect(result.pass).toBe(true);
    expect(result.collisionPass).toBe(true);
    expect(result.collisionMessage).toBe(undefined);
  });

  it("collision check skipped when estimatedClearanceMm omitted", () => {
    const result = hypermill5AxisCollisionGate({
      tilt_a_deg: A_INSIDE,
      tilt_b_deg: B_INSIDE,
      machine_a_min: A_MIN,
      machine_a_max: A_MAX,
      machine_b_min: B_MIN,
      machine_b_max: B_MAX,
      toolDiameterMm: TOOL_DIA_MM,
    });
    expect(result.collisionPass).toBe(true);
    expect(result.pass).toBe(true);
  });
});

describe("hypermill5AxisCollisionGate — failure modes", () => {
  it("clearance < 0.5*D → collisionPass=false, overall pass=false", () => {
    const result = hypermill5AxisCollisionGate({
      tilt_a_deg: A_INSIDE,
      tilt_b_deg: B_INSIDE,
      machine_a_min: A_MIN,
      machine_a_max: A_MAX,
      machine_b_min: B_MIN,
      machine_b_max: B_MAX,
      toolDiameterMm: TOOL_DIA_MM,
      estimatedClearanceMm: UNSAFE_CLEARANCE_MM,
    });
    expect(result.collisionPass).toBe(false);
    expect(result.pass).toBe(false);
    expect(result.collisionMessage).toContain("COLLISION RISK");
    expect(result.collisionMessage).toContain(`${UNSAFE_CLEARANCE_MM.toFixed(2)}mm`);
  });

  it("tilt fail + clearance pass → overall fail", () => {
    const result = hypermill5AxisCollisionGate({
      tilt_a_deg: A_OUTSIDE,
      tilt_b_deg: B_INSIDE,
      machine_a_min: A_MIN,
      machine_a_max: A_MAX,
      machine_b_min: B_MIN,
      machine_b_max: B_MAX,
      toolDiameterMm: TOOL_DIA_MM,
      estimatedClearanceMm: SAFE_CLEARANCE_MM,
    });
    expect(result.pass).toBe(false);
    expect(result.collisionPass).toBe(true);
    expect(result.reason).toContain("A-axis");
  });

  it("both tilt + clearance fail → reason joins both", () => {
    const result = hypermill5AxisCollisionGate({
      tilt_a_deg: A_OUTSIDE,
      tilt_b_deg: B_INSIDE,
      machine_a_min: A_MIN,
      machine_a_max: A_MAX,
      machine_b_min: B_MIN,
      machine_b_max: B_MAX,
      toolDiameterMm: TOOL_DIA_MM,
      estimatedClearanceMm: UNSAFE_CLEARANCE_MM,
    });
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("A-axis");
    expect(result.reason).toContain("COLLISION RISK");
    expect(result.reason).toContain(";");
  });

  it("uses default toolDiameterMm=10 when omitted", () => {
    const result = hypermill5AxisCollisionGate({
      tilt_a_deg: A_INSIDE,
      tilt_b_deg: B_INSIDE,
      machine_a_min: A_MIN,
      machine_a_max: A_MAX,
      machine_b_min: B_MIN,
      machine_b_max: B_MAX,
      estimatedClearanceMm: 4, // < 0.5 * 10 = 5
    });
    // Default tool diameter = 10, min clearance = 5, actual = 4 → fail
    expect(result.collisionPass).toBe(false);
    expect(result.collisionMessage).toContain(`0.5×D=${DEFAULT_TOOL_DIA_MM}mm`);
  });
});

describe("MACHINE_TILT_PRESETS — schema invariant", () => {
  it("contains 4 expected presets", () => {
    expect(Object.keys(MACHINE_TILT_PRESETS).sort()).toEqual([
      "DMG_DMU50",
      "Hermle_C400",
      "Matsuura_MX520",
      "generic_5axis",
    ]);
  });

  it("DMG_DMU50 has documented limits", () => {
    expect(MACHINE_TILT_PRESETS.DMG_DMU50).toEqual({
      machine_a_min: -120,
      machine_a_max: 30,
      machine_b_min: -360,
      machine_b_max: 360,
    });
  });

  it("generic_5axis is most conservative on A-axis", () => {
    expect(MACHINE_TILT_PRESETS.generic_5axis.machine_a_min).toBe(-90);
  });

  it("preset can be plugged directly into hypermill5AxisTiltLimitHook", () => {
    const result = hypermill5AxisTiltLimitHook({
      tilt_a_deg: 0,
      tilt_b_deg: 0,
      ...MACHINE_TILT_PRESETS.Hermle_C400,
    });
    expect(result.pass).toBe(true);
  });
});
