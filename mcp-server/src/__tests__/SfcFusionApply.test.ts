/**
 * SfcFusionApply.test.ts — U-BRIDGE-SFC-FUSION coverage.
 *
 * SUT: pure SFC→Fusion mapping + schema invariants + operator-gate.
 * The orchestrator itself is NOT the SUT — tests exercise the mapping
 * with realistic SFC numbers and reject malformed upstream output.
 * The engine-level test invokes the real CAMSpeedFeedBridgeEngine.
 *
 * @milestone BRIDGE-DEEP/U-BRIDGE-SFC-FUSION
 */

import { describe, it, expect } from "vitest";
import {
  SfcFusionApplyEngine,
  SfcFusionApplyRequestSchema,
  FusionCoolantSchema,
} from "../engines/SfcFusionApplyEngine.js";

// ─── Pure mapper — Al 6061 (Sandvik H10F, 10mm 3FL, Vc=300, fz=0.08) ────────

describe("mapSfcResultToFusionOverrides — Al 6061 happy path", () => {
  // n = 1000·300/(π·10) = 9549.3 rpm; f = 9549·0.08·3 = 2291.76 mm/min
  const mapped = SfcFusionApplyEngine.mapSfcResultToFusionOverrides({
    spindle_rpm: 9549,
    feed_rate_mmmin: 2291.76,
    feed_per_tooth_mm: 0.08,
    cutting_speed_mpm: 300,
  });
  it("emits spindle = 9549 rpm exactly", () => {
    expect(mapped.spindleSpeed_rpm).toBe(9549);
  });
  it("emits feed = 2291.76 mm/min within 0.01", () => {
    expect(mapped.cuttingFeedrate_mmpm).toBeCloseTo(2291.76, 2);
  });
  it("preserves fz = 0.08 mm within 0.000001", () => {
    expect(mapped.feedPerTooth_mm).toBeCloseTo(0.08, 6);
  });
  it("preserves Vc = 300 m/min exactly", () => {
    expect(mapped.surfaceSpeed_mpm).toBe(300);
  });
});

describe("mapSfcResultToFusionOverrides — 4140 steel (Vc=100, fz=0.06)", () => {
  // n = 1000·100/(π·10) = 3183.1 rpm; f = 3183·0.06·3 = 572.94
  const mapped = SfcFusionApplyEngine.mapSfcResultToFusionOverrides({
    spindle_rpm: 3183,
    feed_rate_mmmin: 572.94,
    feed_per_tooth_mm: 0.06,
    cutting_speed_mpm: 100,
  });
  it("RPM = 3183 (ISO P moderate Vc, < Al 6061's 9549)", () => {
    expect(mapped.spindleSpeed_rpm).toBe(3183);
    expect(mapped.spindleSpeed_rpm! < 9549).toBe(true);
  });
  it("feed = 572.94 (strictly less than Al 6061's 2291.76)", () => {
    expect(mapped.cuttingFeedrate_mmpm).toBeCloseTo(572.94, 2);
    expect(mapped.cuttingFeedrate_mmpm! < 2291.76).toBe(true);
  });
});

describe("mapSfcResultToFusionOverrides — Ti-6Al-4V (Vc=50, fz=0.05)", () => {
  // n = 1000·50/(π·10) = 1591.5 rpm; f = 1592·0.05·3 = 238.8
  const mapped = SfcFusionApplyEngine.mapSfcResultToFusionOverrides({
    spindle_rpm: 1592,
    feed_rate_mmmin: 238.8,
    feed_per_tooth_mm: 0.05,
    cutting_speed_mpm: 50,
  });
  it("RPM = 1592 (ISO S — lowest of the 3 materials)", () => {
    expect(mapped.spindleSpeed_rpm).toBe(1592);
    expect(mapped.spindleSpeed_rpm! < 3183).toBe(true);
  });
  it("feed = 238.8 mm/min (strictly less than 4140's 572.94)", () => {
    expect(mapped.cuttingFeedrate_mmpm).toBeCloseTo(238.8, 2);
    expect(mapped.cuttingFeedrate_mmpm! < 572.94).toBe(true);
  });
});

// ─── Failure modes ──────────────────────────────────────────────────────────

describe("mapSfcResultToFusionOverrides — failure modes", () => {
  it("null orchestrator_result → 0 keys in DTO", () => {
    const out = SfcFusionApplyEngine.mapSfcResultToFusionOverrides(null);
    expect(Object.keys(out).length).toBe(0);
  });
  it("zero spindle/feed/fpt/Vc → 0 keys in DTO (never emit a zero-rpm override)", () => {
    const out = SfcFusionApplyEngine.mapSfcResultToFusionOverrides({
      spindle_rpm: 0,
      feed_rate_mmmin: 0,
      feed_per_tooth_mm: 0,
      cutting_speed_mpm: 0,
    });
    expect(Object.keys(out).length).toBe(0);
  });
  it("negative spindle/feed → 0 keys (never emit a backwards-spinning override)", () => {
    const out = SfcFusionApplyEngine.mapSfcResultToFusionOverrides({
      spindle_rpm: -500,
      feed_rate_mmmin: -100,
    });
    expect(Object.keys(out).length).toBe(0);
  });
});

// ─── Adversarial inputs ─────────────────────────────────────────────────────

describe("mapSfcResultToFusionOverrides — adversarial inputs", () => {
  it("NaN spindle dropped; valid feed survives (selective filter)", () => {
    const out = SfcFusionApplyEngine.mapSfcResultToFusionOverrides({
      spindle_rpm: Number.NaN,
      feed_rate_mmmin: 2280,
    });
    expect(Object.keys(out).length).toBe(1);
    expect(out.cuttingFeedrate_mmpm).toBe(2280);
  });
  it("Infinity feed dropped; valid spindle survives", () => {
    const out = SfcFusionApplyEngine.mapSfcResultToFusionOverrides({
      spindle_rpm: 9000,
      feed_rate_mmmin: Number.POSITIVE_INFINITY,
    });
    expect(Object.keys(out).length).toBe(1);
    expect(out.spindleSpeed_rpm).toBe(9000);
  });
  it("-Infinity fpt dropped; valid Vc survives (not coerced to 0)", () => {
    const out = SfcFusionApplyEngine.mapSfcResultToFusionOverrides({
      feed_per_tooth_mm: Number.NEGATIVE_INFINITY,
      cutting_speed_mpm: 250,
    });
    expect(Object.keys(out).length).toBe(1);
    expect(out.surfaceSpeed_mpm).toBe(250);
  });
  it("string-typed spindle dropped; numeric feed survives (type-drift defense)", () => {
    const out = SfcFusionApplyEngine.mapSfcResultToFusionOverrides({
      spindle_rpm: "9500",
      feed_rate_mmmin: 2280,
    });
    expect(Object.keys(out).length).toBe(1);
    expect(out.cuttingFeedrate_mmpm).toBe(2280);
  });
});

// ─── Schema invariants ──────────────────────────────────────────────────────

describe("SfcFusionApplyRequestSchema — strict() rejects unknown extras keys", () => {
  it("rejects unknown key in extra_toolpath_overrides", () => {
    const parsed = SfcFusionApplyRequestSchema.safeParse({
      native_request: { operation_id: "op-1", material: "aluminum_6061", toolDiameter: 10, flutes: 3 },
      extra_toolpath_overrides: { evilKey: 1 } as Record<string, unknown>,
    });
    expect(parsed.success).toBe(false);
  });
  it("accepts a fully-shaped request with no extras", () => {
    const parsed = SfcFusionApplyRequestSchema.safeParse({
      native_request: { operation_id: "op-2", material: "4140_steel", toolDiameter: 12, flutes: 4 },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("FusionCoolantSchema — accepts Fusion vocabulary only", () => {
  it("accepts 'flood' (Fusion canonical)", () => {
    expect(FusionCoolantSchema.safeParse("flood").success).toBe(true);
  });
  it("accepts 'tool' (Fusion's name for through-tool)", () => {
    expect(FusionCoolantSchema.safeParse("tool").success).toBe(true);
  });
  it("rejects 'through_tool' (Esprit vocabulary, not Fusion's)", () => {
    expect(FusionCoolantSchema.safeParse("through_tool").success).toBe(false);
  });
  it("rejects empty string", () => {
    expect(FusionCoolantSchema.safeParse("").success).toBe(false);
  });
});

// ─── Engine-level operator-gate invariant (real bridge) ─────────────────────

describe("SfcFusionApplyEngine.applyToFusion — operator-gate invariant", () => {
  const res = SfcFusionApplyEngine.applyToFusion({
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
  it("auto_executed is exactly false (Fusion has no live toolpath-mutate API)", () => {
    expect(res.auto_executed).toBe(false);
  });
  it("operation_id round-tripped from native_request", () => {
    expect(res.operation_id).toBe("op-real-001");
  });
  it("gate_reason explicitly names 'operator' AND 'fusion'", () => {
    const reason = res.gate_reason.toLowerCase();
    expect(reason.includes("operator")).toBe(true);
    expect(reason.includes("fusion")).toBe(true);
  });
});

// ─── Extras layering ────────────────────────────────────────────────────────

describe("SfcFusionApplyEngine.applyToFusion — caller extras layered onto DTO", () => {
  const res = SfcFusionApplyEngine.applyToFusion({
    native_request: {
      operation_id: "op-layer-001",
      material: "aluminum_6061",
      toolDiameter: 10,
      flutes: 3,
    },
    extra_toolpath_overrides: {
      stepover_mm: 4.2,
      coolant: "flood",
      rampingType: "helix",
      rampingAngle_deg: 2.5,
    },
  });
  it("stepover_mm = 4.2 round-tripped exactly", () => {
    expect(res.overrides.stepover_mm).toBe(4.2);
  });
  it("coolant = 'flood' round-tripped exactly", () => {
    expect(res.overrides.coolant).toBe("flood");
  });
  it("rampingType = 'helix' round-tripped exactly", () => {
    expect(res.overrides.rampingType).toBe("helix");
  });
  it("rampingAngle_deg = 2.5 round-tripped exactly", () => {
    expect(res.overrides.rampingAngle_deg).toBe(2.5);
  });
  it("operator-gate invariant holds even with extras", () => {
    expect(res.requires_operator_approval).toBe(true);
  });
});
