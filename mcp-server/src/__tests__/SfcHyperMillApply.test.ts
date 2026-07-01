/**
 * SfcHyperMillApply.test.ts — U-BRIDGE-SFC-HYPERMILL coverage.
 *
 * SUT: pure SFC→hyperMILL mapping + schema invariants + operator-gate.
 * The orchestrator itself is NOT the SUT — tests exercise the mapping
 * with realistic SFC numbers and reject malformed upstream output.
 * The engine-level test invokes the real CAMSpeedFeedBridgeEngine.
 *
 * @milestone BRIDGE-DEEP/U-BRIDGE-SFC-HYPERMILL
 */

import { describe, it, expect } from "vitest";
import {
  SfcHyperMillApplyEngine,
  SfcHyperMillApplyRequestSchema,
  HyperMillCoolantSchema,
} from "../engines/SfcHyperMillApplyEngine.js";

// ─── Pure mapper — Al 6061 (Sandvik H10F, 10mm 3FL, Vc=300, fz=0.08) ────────

describe("mapSfcResultToHyperMillOverrides — Al 6061 happy path", () => {
  // n = 1000·300/(π·10) = 9549.3 rpm; f = 9549·0.08·3 = 2291.76 mm/min
  const mapped = SfcHyperMillApplyEngine.mapSfcResultToHyperMillOverrides({
    spindle_rpm: 9549,
    feed_rate_mmmin: 2291.76,
    feed_per_tooth_mm: 0.08,
    cutting_speed_mpm: 300,
  });
  it("emits nSpindle_rpm = 9549 exactly (hyperMILL canonical name)", () => {
    expect(mapped.nSpindle_rpm).toBe(9549);
  });
  it("emits feedRate_mmpm = 2291.76 within 0.01 (hyperMILL canonical name)", () => {
    expect(mapped.feedRate_mmpm).toBeCloseTo(2291.76, 2);
  });
  it("preserves feedPerTooth_mm = 0.08 within 0.000001", () => {
    expect(mapped.feedPerTooth_mm).toBeCloseTo(0.08, 6);
  });
  it("preserves vc_mpm = 300 exactly (hyperMILL canonical name)", () => {
    expect(mapped.vc_mpm).toBe(300);
  });
});

describe("mapSfcResultToHyperMillOverrides — 4140 steel (Vc=100, fz=0.06)", () => {
  // n = 1000·100/(π·10) = 3183.1 rpm; f = 3183·0.06·3 = 572.94
  const mapped = SfcHyperMillApplyEngine.mapSfcResultToHyperMillOverrides({
    spindle_rpm: 3183,
    feed_rate_mmmin: 572.94,
    feed_per_tooth_mm: 0.06,
    cutting_speed_mpm: 100,
  });
  it("nSpindle_rpm = 3183 (ISO P moderate Vc, < Al 6061's 9549)", () => {
    expect(mapped.nSpindle_rpm).toBe(3183);
    expect(mapped.nSpindle_rpm! < 9549).toBe(true);
  });
  it("feedRate_mmpm = 572.94 (strictly less than Al 6061's 2291.76)", () => {
    expect(mapped.feedRate_mmpm).toBeCloseTo(572.94, 2);
    expect(mapped.feedRate_mmpm! < 2291.76).toBe(true);
  });
});

describe("mapSfcResultToHyperMillOverrides — Ti-6Al-4V (Vc=50, fz=0.05)", () => {
  // n = 1000·50/(π·10) = 1591.5 rpm; f = 1592·0.05·3 = 238.8
  const mapped = SfcHyperMillApplyEngine.mapSfcResultToHyperMillOverrides({
    spindle_rpm: 1592,
    feed_rate_mmmin: 238.8,
    feed_per_tooth_mm: 0.05,
    cutting_speed_mpm: 50,
  });
  it("nSpindle_rpm = 1592 (ISO S — lowest of the 3 materials)", () => {
    expect(mapped.nSpindle_rpm).toBe(1592);
    expect(mapped.nSpindle_rpm! < 3183).toBe(true);
  });
  it("feedRate_mmpm = 238.8 (strictly less than 4140's 572.94)", () => {
    expect(mapped.feedRate_mmpm).toBeCloseTo(238.8, 2);
    expect(mapped.feedRate_mmpm! < 572.94).toBe(true);
  });
});

// ─── Failure modes ──────────────────────────────────────────────────────────

describe("mapSfcResultToHyperMillOverrides — failure modes", () => {
  it("null orchestrator_result → 0 keys in DTO", () => {
    const out = SfcHyperMillApplyEngine.mapSfcResultToHyperMillOverrides(null);
    expect(Object.keys(out).length).toBe(0);
  });
  it("zero spindle/feed/fpt/Vc → 0 keys (never emit a zero-rpm override)", () => {
    const out = SfcHyperMillApplyEngine.mapSfcResultToHyperMillOverrides({
      spindle_rpm: 0,
      feed_rate_mmmin: 0,
      feed_per_tooth_mm: 0,
      cutting_speed_mpm: 0,
    });
    expect(Object.keys(out).length).toBe(0);
  });
  it("negative spindle/feed → 0 keys (never emit a backwards-spinning override)", () => {
    const out = SfcHyperMillApplyEngine.mapSfcResultToHyperMillOverrides({
      spindle_rpm: -500,
      feed_rate_mmmin: -100,
    });
    expect(Object.keys(out).length).toBe(0);
  });
});

// ─── Adversarial inputs ─────────────────────────────────────────────────────

describe("mapSfcResultToHyperMillOverrides — adversarial inputs", () => {
  it("NaN spindle dropped; valid feed survives (selective filter)", () => {
    const out = SfcHyperMillApplyEngine.mapSfcResultToHyperMillOverrides({
      spindle_rpm: Number.NaN,
      feed_rate_mmmin: 2280,
    });
    expect(Object.keys(out).length).toBe(1);
    expect(out.feedRate_mmpm).toBe(2280);
  });
  it("Infinity feed dropped; valid spindle survives", () => {
    const out = SfcHyperMillApplyEngine.mapSfcResultToHyperMillOverrides({
      spindle_rpm: 9000,
      feed_rate_mmmin: Number.POSITIVE_INFINITY,
    });
    expect(Object.keys(out).length).toBe(1);
    expect(out.nSpindle_rpm).toBe(9000);
  });
  it("-Infinity fpt dropped; valid Vc survives (not coerced to 0)", () => {
    const out = SfcHyperMillApplyEngine.mapSfcResultToHyperMillOverrides({
      feed_per_tooth_mm: Number.NEGATIVE_INFINITY,
      cutting_speed_mpm: 250,
    });
    expect(Object.keys(out).length).toBe(1);
    expect(out.vc_mpm).toBe(250);
  });
  it("string-typed spindle dropped; numeric feed survives (type-drift defense)", () => {
    const out = SfcHyperMillApplyEngine.mapSfcResultToHyperMillOverrides({
      spindle_rpm: "9500",
      feed_rate_mmmin: 2280,
    });
    expect(Object.keys(out).length).toBe(1);
    expect(out.feedRate_mmpm).toBe(2280);
  });
});

// ─── Schema invariants ──────────────────────────────────────────────────────

describe("SfcHyperMillApplyRequestSchema — strict() rejects unknown extras", () => {
  it("rejects unknown key in extra_macro_overrides", () => {
    const parsed = SfcHyperMillApplyRequestSchema.safeParse({
      native_request: { operation_id: "op-1", material: "aluminum_6061", toolDiameter: 10, flutes: 3 },
      extra_macro_overrides: { evilKey: 1 } as Record<string, unknown>,
    });
    expect(parsed.success).toBe(false);
  });
  it("accepts a fully-shaped request with no extras", () => {
    const parsed = SfcHyperMillApplyRequestSchema.safeParse({
      native_request: { operation_id: "op-2", material: "4140_steel", toolDiameter: 12, flutes: 4 },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("HyperMillCoolantSchema — accepts hyperMILL vocabulary only", () => {
  it("accepts 'em' (hyperMILL canonical for emulsion / flood)", () => {
    expect(HyperMillCoolantSchema.safeParse("em").success).toBe(true);
  });
  it("accepts 'mql' (hyperMILL canonical for minimum-quantity lubrication)", () => {
    expect(HyperMillCoolantSchema.safeParse("mql").success).toBe(true);
  });
  it("accepts 'internal' (hyperMILL canonical for through-tool)", () => {
    expect(HyperMillCoolantSchema.safeParse("internal").success).toBe(true);
  });
  it("rejects 'flood' (Fusion vocabulary, not hyperMILL's)", () => {
    expect(HyperMillCoolantSchema.safeParse("flood").success).toBe(false);
  });
  it("rejects 'tool' (Fusion vocabulary, not hyperMILL's)", () => {
    expect(HyperMillCoolantSchema.safeParse("tool").success).toBe(false);
  });
  it("rejects empty string", () => {
    expect(HyperMillCoolantSchema.safeParse("").success).toBe(false);
  });
});

// ─── Engine-level operator-gate invariant (real bridge) ─────────────────────

describe("SfcHyperMillApplyEngine.applyToHyperMill — operator-gate invariant", () => {
  const res = SfcHyperMillApplyEngine.applyToHyperMill({
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
  it("auto_executed is exactly false (bridge never auto-pushes; live owned downstream)", () => {
    expect(res.auto_executed).toBe(false);
  });
  it("operation_id round-tripped from native_request", () => {
    expect(res.operation_id).toBe("op-real-001");
  });
  it("gate_reason explicitly names 'operator' AND 'hypermill'", () => {
    const reason = res.gate_reason.toLowerCase();
    expect(reason.includes("operator")).toBe(true);
    expect(reason.includes("hypermill")).toBe(true);
  });
});

// ─── Extras layering ────────────────────────────────────────────────────────

describe("SfcHyperMillApplyEngine.applyToHyperMill — caller extras layered onto DTO", () => {
  const res = SfcHyperMillApplyEngine.applyToHyperMill({
    native_request: {
      operation_id: "op-layer-001",
      material: "aluminum_6061",
      toolDiameter: 10,
      flutes: 3,
    },
    extra_macro_overrides: {
      stepover_mm: 4.2,
      zStepover_mm: 1.5,
      coolingMode: "em",
      rampingMode: "helical",
      rampingAngle_deg: 2.5,
    },
  });
  it("stepover_mm = 4.2 round-tripped exactly (radial WOC)", () => {
    expect(res.overrides.stepover_mm).toBe(4.2);
  });
  it("zStepover_mm = 1.5 round-tripped exactly (axial DOC — hyperMILL canonical name)", () => {
    expect(res.overrides.zStepover_mm).toBe(1.5);
  });
  it("coolingMode = 'em' round-tripped exactly (hyperMILL canonical)", () => {
    expect(res.overrides.coolingMode).toBe("em");
  });
  it("rampingMode = 'helical' round-tripped exactly", () => {
    expect(res.overrides.rampingMode).toBe("helical");
  });
  it("rampingAngle_deg = 2.5 round-tripped exactly", () => {
    expect(res.overrides.rampingAngle_deg).toBe(2.5);
  });
  it("operator-gate invariant holds even with extras", () => {
    expect(res.requires_operator_approval).toBe(true);
  });
});
