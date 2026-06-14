/**
 * SfcInventorHsmApply.test.ts — U-BRIDGE-SFC-INVENTORHSM coverage.
 *
 * SUT: pure SFC→Inventor HSM mapping + schema invariants + operator-gate.
 * Mirror structure of SfcFusion / SfcHyperMill tests.
 *
 * @milestone BRIDGE-DEEP/U-BRIDGE-SFC-INVENTORHSM
 */

import { describe, it, expect } from "vitest";
import {
  SfcInventorHsmApplyEngine,
  SfcInventorHsmApplyRequestSchema,
  InventorHsmCoolantSchema,
} from "../engines/SfcInventorHsmApplyEngine.js";

// ─── Pure mapper — Al 6061 (Sandvik H10F, 10mm 3FL, Vc=300, fz=0.08) ────────

describe("mapSfcResultToInventorHsmOverrides — Al 6061 happy path", () => {
  // n = 1000·300/(π·10) = 9549.3 rpm; f = 9549·0.08·3 = 2291.76 mm/min
  const mapped = SfcInventorHsmApplyEngine.mapSfcResultToInventorHsmOverrides({
    spindle_rpm: 9549,
    feed_rate_mmmin: 2291.76,
    feed_per_tooth_mm: 0.08,
    cutting_speed_mpm: 300,
  });
  it("emits spindle_rpm = 9549 exactly (Inventor HSM canonical name)", () => {
    expect(mapped.spindle_rpm).toBe(9549);
  });
  it("emits feedrate_mmpm = 2291.76 within 0.01 (Inventor HSM canonical name)", () => {
    expect(mapped.feedrate_mmpm).toBeCloseTo(2291.76, 2);
  });
  it("preserves feedPerTooth_mm = 0.08 within 0.000001", () => {
    expect(mapped.feedPerTooth_mm).toBeCloseTo(0.08, 6);
  });
  it("preserves surfaceSpeed_mpm = 300 exactly", () => {
    expect(mapped.surfaceSpeed_mpm).toBe(300);
  });
});

describe("mapSfcResultToInventorHsmOverrides — 4140 steel (Vc=100, fz=0.06)", () => {
  const mapped = SfcInventorHsmApplyEngine.mapSfcResultToInventorHsmOverrides({
    spindle_rpm: 3183,
    feed_rate_mmmin: 572.94,
    feed_per_tooth_mm: 0.06,
    cutting_speed_mpm: 100,
  });
  it("spindle_rpm = 3183 (ISO P moderate Vc, < Al 6061's 9549)", () => {
    expect(mapped.spindle_rpm).toBe(3183);
    expect(mapped.spindle_rpm! < 9549).toBe(true);
  });
  it("feedrate_mmpm = 572.94 (strictly less than Al 6061's 2291.76)", () => {
    expect(mapped.feedrate_mmpm).toBeCloseTo(572.94, 2);
    expect(mapped.feedrate_mmpm! < 2291.76).toBe(true);
  });
});

describe("mapSfcResultToInventorHsmOverrides — Ti-6Al-4V (Vc=50, fz=0.05)", () => {
  const mapped = SfcInventorHsmApplyEngine.mapSfcResultToInventorHsmOverrides({
    spindle_rpm: 1592,
    feed_rate_mmmin: 238.8,
    feed_per_tooth_mm: 0.05,
    cutting_speed_mpm: 50,
  });
  it("spindle_rpm = 1592 (ISO S — lowest of the 3 materials)", () => {
    expect(mapped.spindle_rpm).toBe(1592);
    expect(mapped.spindle_rpm! < 3183).toBe(true);
  });
  it("feedrate_mmpm = 238.8 (strictly less than 4140's 572.94)", () => {
    expect(mapped.feedrate_mmpm).toBeCloseTo(238.8, 2);
    expect(mapped.feedrate_mmpm! < 572.94).toBe(true);
  });
});

// ─── Failure modes ──────────────────────────────────────────────────────────

describe("mapSfcResultToInventorHsmOverrides — failure modes", () => {
  it("null orchestrator_result → 0 keys in DTO", () => {
    const out = SfcInventorHsmApplyEngine.mapSfcResultToInventorHsmOverrides(null);
    expect(Object.keys(out).length).toBe(0);
  });
  it("zero spindle/feed/fpt/Vc → 0 keys (never emit a zero-rpm override)", () => {
    const out = SfcInventorHsmApplyEngine.mapSfcResultToInventorHsmOverrides({
      spindle_rpm: 0,
      feed_rate_mmmin: 0,
      feed_per_tooth_mm: 0,
      cutting_speed_mpm: 0,
    });
    expect(Object.keys(out).length).toBe(0);
  });
  it("negative spindle/feed → 0 keys (never emit a backwards-spinning override)", () => {
    const out = SfcInventorHsmApplyEngine.mapSfcResultToInventorHsmOverrides({
      spindle_rpm: -500,
      feed_rate_mmmin: -100,
    });
    expect(Object.keys(out).length).toBe(0);
  });
});

// ─── Adversarial inputs ─────────────────────────────────────────────────────

describe("mapSfcResultToInventorHsmOverrides — adversarial inputs", () => {
  it("NaN spindle dropped; valid feed survives (selective filter)", () => {
    const out = SfcInventorHsmApplyEngine.mapSfcResultToInventorHsmOverrides({
      spindle_rpm: Number.NaN,
      feed_rate_mmmin: 2280,
    });
    expect(Object.keys(out).length).toBe(1);
    expect(out.feedrate_mmpm).toBe(2280);
  });
  it("Infinity feed dropped; valid spindle survives", () => {
    const out = SfcInventorHsmApplyEngine.mapSfcResultToInventorHsmOverrides({
      spindle_rpm: 9000,
      feed_rate_mmmin: Number.POSITIVE_INFINITY,
    });
    expect(Object.keys(out).length).toBe(1);
    expect(out.spindle_rpm).toBe(9000);
  });
  it("-Infinity fpt dropped; valid Vc survives (not coerced to 0)", () => {
    const out = SfcInventorHsmApplyEngine.mapSfcResultToInventorHsmOverrides({
      feed_per_tooth_mm: Number.NEGATIVE_INFINITY,
      cutting_speed_mpm: 250,
    });
    expect(Object.keys(out).length).toBe(1);
    expect(out.surfaceSpeed_mpm).toBe(250);
  });
  it("string-typed spindle dropped; numeric feed survives (type-drift defense)", () => {
    const out = SfcInventorHsmApplyEngine.mapSfcResultToInventorHsmOverrides({
      spindle_rpm: "9500",
      feed_rate_mmmin: 2280,
    });
    expect(Object.keys(out).length).toBe(1);
    expect(out.feedrate_mmpm).toBe(2280);
  });
});

// ─── Schema invariants ──────────────────────────────────────────────────────

describe("SfcInventorHsmApplyRequestSchema — strict() rejects unknown extras", () => {
  it("rejects unknown key in extra_toolpath_overrides", () => {
    const parsed = SfcInventorHsmApplyRequestSchema.safeParse({
      native_request: { operation_id: "op-1", material: "aluminum_6061", toolDiameter: 10, flutes: 3 },
      extra_toolpath_overrides: { evilKey: 1 } as Record<string, unknown>,
    });
    expect(parsed.success).toBe(false);
  });
  it("accepts a fully-shaped request with no extras", () => {
    const parsed = SfcInventorHsmApplyRequestSchema.safeParse({
      native_request: { operation_id: "op-2", material: "4140_steel", toolDiameter: 12, flutes: 4 },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("InventorHsmCoolantSchema — accepts Inventor HSM vocabulary only", () => {
  it("accepts 'flood' (Inventor canonical, shared with Fusion)", () => {
    expect(InventorHsmCoolantSchema.safeParse("flood").success).toBe(true);
  });
  it("accepts 'thru' (Inventor canonical for through-tool)", () => {
    expect(InventorHsmCoolantSchema.safeParse("thru").success).toBe(true);
  });
  it("accepts 'tap' (Inventor-specific through-tap)", () => {
    expect(InventorHsmCoolantSchema.safeParse("tap").success).toBe(true);
  });
  it("rejects 'tool' (Fusion vocabulary for through-tool, not Inventor's)", () => {
    expect(InventorHsmCoolantSchema.safeParse("tool").success).toBe(false);
  });
  it("rejects 'em' (hyperMILL vocabulary for emulsion, not Inventor's)", () => {
    expect(InventorHsmCoolantSchema.safeParse("em").success).toBe(false);
  });
  it("rejects empty string", () => {
    expect(InventorHsmCoolantSchema.safeParse("").success).toBe(false);
  });
});

// ─── Engine-level operator-gate invariant (real bridge) ─────────────────────

describe("SfcInventorHsmApplyEngine.applyToInventorHsm — operator-gate invariant", () => {
  const res = SfcInventorHsmApplyEngine.applyToInventorHsm({
    native_request: {
      operation_id: "op-real-001",
      material: "aluminum_6061",
      toolDiameter: 10,
      flutes: 3,
    },
  });
  it("requires_operator_approval is exactly true (PSN safety contract)", () => {
    expect(res.requires_operator_approval).toBe(true);
  });
  it("auto_executed is exactly false (no live toolpath-mutate auto-push)", () => {
    expect(res.auto_executed).toBe(false);
  });
  it("operation_id round-tripped from native_request", () => {
    expect(res.operation_id).toBe("op-real-001");
  });
  it("gate_reason explicitly names 'operator' AND 'inventor'", () => {
    const reason = res.gate_reason.toLowerCase();
    expect(reason.includes("operator")).toBe(true);
    expect(reason.includes("inventor")).toBe(true);
  });
});

// ─── Extras layering ────────────────────────────────────────────────────────

describe("SfcInventorHsmApplyEngine.applyToInventorHsm — caller extras layered onto DTO", () => {
  const res = SfcInventorHsmApplyEngine.applyToInventorHsm({
    native_request: {
      operation_id: "op-layer-001",
      material: "aluminum_6061",
      toolDiameter: 10,
      flutes: 3,
    },
    extra_toolpath_overrides: {
      stepover_mm: 4.2,
      stepdown_mm: 1.5,
      coolant: "thru",
      rampType: "helix",
      rampAngle_deg: 2.5,
    },
  });
  it("stepover_mm = 4.2 round-tripped exactly (radial WOC)", () => {
    expect(res.overrides.stepover_mm).toBe(4.2);
  });
  it("stepdown_mm = 1.5 round-tripped exactly (axial DOC — Inventor canonical name)", () => {
    expect(res.overrides.stepdown_mm).toBe(1.5);
  });
  it("coolant = 'thru' round-tripped exactly (Inventor's through-tool canonical)", () => {
    expect(res.overrides.coolant).toBe("thru");
  });
  it("rampType = 'helix' round-tripped exactly", () => {
    expect(res.overrides.rampType).toBe("helix");
  });
  it("rampAngle_deg = 2.5 round-tripped exactly", () => {
    expect(res.overrides.rampAngle_deg).toBe(2.5);
  });
  it("operator-gate invariant holds even with extras", () => {
    expect(res.requires_operator_approval).toBe(true);
  });
});
