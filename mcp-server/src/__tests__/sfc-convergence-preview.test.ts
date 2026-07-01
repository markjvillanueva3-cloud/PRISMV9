/**
 * sfc-convergence-preview.test.ts
 *
 * Tests for SFCConvergencePreviewEngine.previewWith() and the dispatcher round-trip.
 *
 * R9 contract: every assertion encodes WHY the value matters -- no toBeDefined() stubs.
 * All assertions use concrete expected values or algebraic invariants.
 *
 * Coverage:
 *   H1-H2  happy path (known production/converged values from ecb2c583da + round-trip)
 *   F1-F7  failure modes (missing inputs, bad operation, negative D, throws, no-diameter)
 *   A1-A3  adversarial (NaN, Infinity, NaN from orchestrator)
 *   S1-S4  spanning ISO groups (P/M/K/N)
 *   SF1-SF4 safety flags (over-speed fix, review, no-flag baseline, power jump)
 *   SC1-SC3 schema validation
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  sfcConvergencePreviewEngine,
  SFCConvergencePreviewInputSchema,
  type SFCConvergencePreviewResult,
  type SFCConvergencePreviewError,
} from "../engines/SFCConvergencePreviewEngine.js";
import type { OrchestratorResult } from "../engines/SpeedFeedOrchestratorEngine.js";
import type { UltimateSpeedFeedResult } from "../engines/UltimateSpeedFeedEngine.js";

/** Matches the real AtomicValue<OrchestratorResult> wrapper that compute() returns. */
interface AtomicValueLike<T> { value: T; confidence: number; source: string; }

// ============================================================================
// CONSTANTS
// ============================================================================

/** Tool life floor used in safety flags (must match engine constant) */
const TOOL_LIFE_FLOOR_MIN = 15;

// ============================================================================
// MOCK FACTORIES
// ============================================================================

type OrchestratorOverrides = Partial<{
  cutting_speed_mpm: number;
  spindle_rpm: number;
  feed_rate_mmmin: number;
  tangential_force_N: number;
  power_kw: number;
  torque_Nm: number;
  tool_life_min: number;
  surface_finish_Ra_um: number;
}>;

// Real compute() returns AtomicValue<OrchestratorResult> -- mock the REAL contract
// (the value is the flat OrchestratorResult; previewWith unwraps .value).
function makeOrchestratorResult(ov: OrchestratorOverrides = {}): AtomicValueLike<OrchestratorResult> {
  const flat = {
    cutting_speed_mpm:    ov.cutting_speed_mpm    ?? 80.3,
    spindle_rpm:          ov.spindle_rpm          ?? 2557,
    feed_rate_mmmin:      ov.feed_rate_mmmin      ?? 1534,
    tangential_force_N:   ov.tangential_force_N   ?? 577,
    power_kw:             ov.power_kw             ?? 0.77,
    torque_Nm:            ov.torque_Nm            ?? 2.87,
    tool_life_min:        ov.tool_life_min        ?? 360,
    surface_finish_Ra_um: ov.surface_finish_Ra_um ?? 0.80,
    mrr_cm3min: 0, deflection_um: 0, overall_confidence: 0.8,
    feed_per_tooth_mm: 0.05, axial_depth_mm: 5, radial_depth_mm: 10,
  } as unknown as OrchestratorResult;
  return { value: flat, confidence: 0.8, source: "orchestrator-mock" };
}

type UltimateOverrides = Partial<{
  vc_m_min: number;
  fz_mm: number;
  fc_N: number;
  power_kw: number;
  torque_Nm: number;
  life_min: number;
  ra_um: number;
}>;

// Real UltimateSpeedFeedResult: every core param is an OptimizedValue (.value);
// cutting_speed/spindle_rpm/feed_per_tooth/feed_rate are TOP-LEVEL OptimizedValue
// fields (NOT flat vc_m_min/fz_mm). Mock the real shape so the snapshot read matches.
function makeUltimateResult(ov: UltimateOverrides = {}): UltimateSpeedFeedResult {
  const mkV = (value: number, unit: string) =>
    ({ value, unit, confidence: 0.9, source: "calculated" as const });
  return {
    cutting_speed:  mkV(ov.vc_m_min ?? 160, "m/min"),
    spindle_rpm:    mkV(5093, "rpm"),
    feed_per_tooth: mkV(ov.fz_mm ?? 0.06, "mm"),
    feed_rate:      mkV(1222, "mm/min"),
    forces: {
      tangential_force_N: mkV(ov.fc_N    ?? 1035, "N"),
      radial_force_N:     mkV(400,   "N"),
      axial_force_N:      mkV(200,   "N"),
      resultant_force_N:  mkV(1150,  "N"),
      torque_Nm:          mkV(ov.torque_Nm ?? 5.23, "Nm"),
    },
    power:   { required_power_kw: mkV(ov.power_kw ?? 2.76, "kW") },
    tool_life:      { life_minutes:    mkV(ov.life_min ?? 36,  "min") },
    surface_finish: { practical_ra_um: mkV(ov.ra_um   ?? 2.70, "um") },
  } as unknown as UltimateSpeedFeedResult;
}

/** Canonical steel-P milling-rough input (mirrors SFC-CONVERGENCE-DIFF.md Steel P mill rough case). */
const STEEL_P_MILL_ROUGH = {
  material:         "Steel P",
  iso_group:        "P" as const,
  operation:        "milling" as const,
  cut_type:         "roughing" as const,
  tool_diameter_mm: 10,
  flutes:           4,
  tool_material:    "carbide" as const,
  axial_depth_mm:   5,
  radial_depth_mm:  5,
};

// ============================================================================
// HELPERS
// ============================================================================

function isError(r: SFCConvergencePreviewResult | SFCConvergencePreviewError): r is SFCConvergencePreviewError {
  return "success" in r && (r as SFCConvergencePreviewError).success === false;
}

function assertOk(r: SFCConvergencePreviewResult | SFCConvergencePreviewError): SFCConvergencePreviewResult {
  if (isError(r)) throw new Error(`Expected success but got error: ${(r as SFCConvergencePreviewError).error}`);
  return r as SFCConvergencePreviewResult;
}

// ============================================================================
// HAPPY PATH
// ============================================================================

describe("SFCConvergencePreviewEngine — happy path", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("H1: steel-P milling-rough: production.vc ~80, converged.vc ~160, delta.vc.pct > 50", () => {
    const orch = { compute: vi.fn().mockReturnValue(makeOrchestratorResult({ cutting_speed_mpm: 80.3 })) };
    const usf  = { calculate: vi.fn().mockReturnValue(makeUltimateResult({ vc_m_min: 160 })) };

    const ok = assertOk(sfcConvergencePreviewEngine.previewWith(STEEL_P_MILL_ROUGH, orch, usf));

    // Known production Vc from SFC-CONVERGENCE-DIFF.md: 80.30 m/min
    expect(ok.production.vc_mpm).toBeCloseTo(80.3, 1);
    // Convergence target: ~160 m/min (engine-delegated)
    expect(ok.converged.vc_mpm).toBeCloseTo(160, 0);
    // Delta must be ~+99% (convergence nearly doubles the cutting speed)
    expect(ok.delta.vc.pct).toBeGreaterThan(50);
    expect(ok.delta.vc.abs).toBeGreaterThan(50);    // abs: 160 - 80.3 = ~79.7 m/min
    // readonly_mode is the safety contract: env was never mutated
    expect(ok.readonly_mode).toBe(true);
    // recommendation is non-empty and mentions the material/operation context
    expect(ok.recommendation.length).toBeGreaterThan(10);
  });

  it("H1b: tool_life delta is negative (engine Taylor life < orchestrator conservative life)", () => {
    // Production 360min (orchestrator); Engine 36min (Taylor @ higher Vc) — delta = 36-360 = -324
    const orch = { compute: vi.fn().mockReturnValue(makeOrchestratorResult({ tool_life_min: 360 })) };
    const usf  = { calculate: vi.fn().mockReturnValue(makeUltimateResult({ life_min: 36 })) };

    const ok = assertOk(sfcConvergencePreviewEngine.previewWith(STEEL_P_MILL_ROUGH, orch, usf));
    expect(ok.delta.tool_life.pct).toBeLessThan(0);        // life decreases at higher speed
    expect(ok.delta.tool_life.abs).toBeCloseTo(-324, 0);   // 36 - 360
  });

  it("H1c: readonly_mode is always true regardless of engine outputs", () => {
    // Invariant: previewWith NEVER mutates process.env -- readonly_mode proves it
    const orch = { compute: vi.fn().mockReturnValue(makeOrchestratorResult()) };
    const usf  = { calculate: vi.fn().mockReturnValue(makeUltimateResult()) };
    const before = process.env["PRISM_SFC_CONVERGE"];

    const ok = assertOk(sfcConvergencePreviewEngine.previewWith(STEEL_P_MILL_ROUGH, orch, usf));

    expect(ok.readonly_mode).toBe(true);
    expect(process.env["PRISM_SFC_CONVERGE"]).toBe(before);  // env unchanged
  });
});

// ============================================================================
// ROUND-TRIP THROUGH DISPATCHER (real engine singletons)
// ============================================================================

describe("sfc_convergence_preview — dispatcher round-trip (real engines)", () => {
  it("H2: round-trip with real singletons returns readonly_mode:true and finite physics values", async () => {
    // This exercises exactly what the dispatcher case does: lazy-import both engines,
    // pass them to previewWith. It proves the full wiring without spawning the MCP server.
    const { sfcConvergencePreviewEngine: eng }  = await import("../engines/SFCConvergencePreviewEngine.js");
    const { speedFeedOrchestratorEngine: orch } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const { ultimateSpeedFeedEngine: usf }      = await import("../engines/UltimateSpeedFeedEngine.js");

    const r = eng.previewWith(STEEL_P_MILL_ROUGH, orch, usf);

    // A non-error result with positive finite values proves wiring is complete
    expect(isError(r)).toBe(false);
    const ok = r as SFCConvergencePreviewResult;
    expect(ok.readonly_mode).toBe(true);
    expect(isFinite(ok.production.vc_mpm)).toBe(true);
    expect(ok.production.vc_mpm).toBeGreaterThan(0);
    expect(isFinite(ok.converged.vc_mpm)).toBe(true);
    expect(ok.converged.vc_mpm).toBeGreaterThan(0);
    // delta object has all 8 keys
    const deltaKeys = ["vc", "rpm", "feed_mmmin", "fc_N", "power_kw", "torque_Nm", "tool_life", "ra_um"];
    for (const k of deltaKeys) {
      expect(typeof (ok.delta as Record<string, unknown>)[k]).toBe("object");
    }
  });
});

// ============================================================================
// FAILURE MODES (>= 3 required, have 7)
// ============================================================================

describe("SFCConvergencePreviewEngine — failure modes", () => {
  const dummyOrch = { compute: () => makeOrchestratorResult() };
  const dummyUsf  = { calculate: () => makeUltimateResult() };

  it("F1: missing material AND iso_group -> structured error not throw", () => {
    const r = sfcConvergencePreviewEngine.previewWith(
      { tool_diameter_mm: 10, flutes: 4, operation: "milling" },
      dummyOrch, dummyUsf,
    );
    expect(isError(r)).toBe(true);
    expect((r as SFCConvergencePreviewError).error).toMatch(/material or iso_group is required/);
  });

  it("F2: empty object -> error mentions material requirement", () => {
    const r = sfcConvergencePreviewEngine.previewWith({}, dummyOrch, dummyUsf);
    expect(isError(r)).toBe(true);
    expect((r as SFCConvergencePreviewError).error).toMatch(/material or iso_group is required/);
  });

  it("F3: invalid operation enum value -> Zod error with 'Invalid input' prefix", () => {
    const r = sfcConvergencePreviewEngine.previewWith(
      { iso_group: "P", tool_diameter_mm: 10, operation: "laser_cutting" },
      dummyOrch, dummyUsf,
    );
    expect(isError(r)).toBe(true);
    expect((r as SFCConvergencePreviewError).error).toMatch(/Invalid input/);
    expect((r as SFCConvergencePreviewError).error).toMatch(/operation/);
  });

  it("F4: negative tool_diameter_mm -> Zod positive() rejects it", () => {
    const r = sfcConvergencePreviewEngine.previewWith(
      { iso_group: "P", tool_diameter_mm: -5, operation: "milling" },
      dummyOrch, dummyUsf,
    );
    expect(isError(r)).toBe(true);
    expect((r as SFCConvergencePreviewError).error).toMatch(/Invalid input/);
  });

  it("F5: orchestrator throw -> structured error with 'Production path' prefix", () => {
    const throwingOrch = { compute: () => { throw new Error("spindle fault"); } };
    const r = sfcConvergencePreviewEngine.previewWith(STEEL_P_MILL_ROUGH, throwingOrch, dummyUsf);
    expect(isError(r)).toBe(true);
    expect((r as SFCConvergencePreviewError).error).toMatch(/Production path.*spindle fault/);
  });

  it("F6: engine throw -> structured error with 'Convergence path' prefix", () => {
    const throwingUsf = { calculate: () => { throw new Error("kc1.1 undefined"); } };
    const r = sfcConvergencePreviewEngine.previewWith(STEEL_P_MILL_ROUGH, dummyOrch, throwingUsf);
    expect(isError(r)).toBe(true);
    expect((r as SFCConvergencePreviewError).error).toMatch(/Convergence path.*kc1\.1 undefined/);
  });

  it("F7: milling without tool_diameter_mm -> error mentions tool_diameter_mm", () => {
    const r = sfcConvergencePreviewEngine.previewWith(
      { iso_group: "P", operation: "milling" },
      dummyOrch, dummyUsf,
    );
    expect(isError(r)).toBe(true);
    expect((r as SFCConvergencePreviewError).error).toMatch(/tool_diameter_mm/);
  });
});

// ============================================================================
// ADVERSARIAL INPUTS (>= 2 required, have 3)
// ============================================================================

describe("SFCConvergencePreviewEngine — adversarial inputs", () => {
  const dummyOrch = { compute: () => makeOrchestratorResult() };
  const dummyUsf  = { calculate: () => makeUltimateResult() };

  it("A1: NaN tool_diameter_mm -> Zod .positive() rejects (NaN is not > 0)", () => {
    const r = sfcConvergencePreviewEngine.previewWith(
      { iso_group: "P", tool_diameter_mm: NaN, operation: "milling" },
      dummyOrch, dummyUsf,
    );
    expect(isError(r)).toBe(true);
    expect((r as SFCConvergencePreviewError).error).toMatch(/Invalid input/);
  });

  it("A2: radial_depth_pct: Infinity -> Zod .max(100) rejects it", () => {
    const r = sfcConvergencePreviewEngine.previewWith(
      { iso_group: "P", tool_diameter_mm: 10, operation: "milling", radial_depth_pct: Infinity },
      dummyOrch, dummyUsf,
    );
    expect(isError(r)).toBe(true);
    expect((r as SFCConvergencePreviewError).error).toMatch(/Invalid input/);
  });

  it("A3: orchestrator returns NaN cutting_speed_mpm -> non-finite guard triggers error", () => {
    const nanOrch = { compute: () => makeOrchestratorResult({ cutting_speed_mpm: NaN }) };
    const r = sfcConvergencePreviewEngine.previewWith(STEEL_P_MILL_ROUGH, nanOrch, dummyUsf);
    expect(isError(r)).toBe(true);
    expect((r as SFCConvergencePreviewError).error).toMatch(/non-finite/);
  });
});

// ============================================================================
// SPANNING ISO GROUPS (>= 3 required, have 4: P / M / K / N)
// ============================================================================

describe("SFCConvergencePreviewEngine — spanning ISO groups", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("S1: ISO P steel rough — converged Vc ~2x production, delta.vc.pct > 50", () => {
    const orch = { compute: vi.fn().mockReturnValue(makeOrchestratorResult({ cutting_speed_mpm: 80.3 })) };
    const usf  = { calculate: vi.fn().mockReturnValue(makeUltimateResult({ vc_m_min: 160 })) };
    const ok = assertOk(sfcConvergencePreviewEngine.previewWith(
      { material: "4140 Steel", iso_group: "P", operation: "milling", cut_type: "roughing", tool_diameter_mm: 10, flutes: 4 },
      orch, usf,
    ));
    expect(ok.production.vc_mpm).toBeCloseTo(80.3, 0);
    expect(ok.converged.vc_mpm).toBeCloseTo(160, 0);
    expect(ok.delta.vc.pct).toBeGreaterThan(50);
  });

  it("S2: ISO M stainless rough — +100%+ Vc, safety_flags is array, readonly_mode true", () => {
    // From SFC-CONVERGENCE-DIFF.md: Stainless M mill rough +142% Vc
    const orch = { compute: vi.fn().mockReturnValue(makeOrchestratorResult({ cutting_speed_mpm: 41.3, tool_life_min: 2658 })) };
    const usf  = { calculate: vi.fn().mockReturnValue(makeUltimateResult({ vc_m_min: 100, life_min: 63 })) };
    const ok = assertOk(sfcConvergencePreviewEngine.previewWith(
      { material: "316L Stainless", iso_group: "M", operation: "milling", cut_type: "roughing", tool_diameter_mm: 12, flutes: 4 },
      orch, usf,
    ));
    expect(ok.delta.vc.pct).toBeGreaterThan(100);
    expect(Array.isArray(ok.safety_flags)).toBe(true);
    expect(ok.readonly_mode).toBe(true);
  });

  it("S3: ISO K cast iron rough — engine life 5min raises 'review' flag (< floor + < production)", () => {
    // From diff: cast iron K mill rough -- engine life 5min < 15min floor, production 50min
    const orch = { compute: vi.fn().mockReturnValue(makeOrchestratorResult({ cutting_speed_mpm: 93.8, tool_life_min: 50 })) };
    const usf  = { calculate: vi.fn().mockReturnValue(makeUltimateResult({ vc_m_min: 170, life_min: 5 })) };
    const ok = assertOk(sfcConvergencePreviewEngine.previewWith(
      { material: "Gray Cast Iron", iso_group: "K", operation: "milling", cut_type: "roughing", tool_diameter_mm: 50, flutes: 4 },
      orch, usf,
    ));
    // Must have a review flag on tool_life_min
    const reviewFlag = ok.safety_flags.filter(f => f.severity === "review" && f.field === "tool_life_min");
    expect(reviewFlag.length).toBe(1);
    expect(reviewFlag[0].message).toMatch(/review/);
    // converged life must actually be below the floor constant
    expect(ok.converged.tool_life_min).toBeLessThan(TOOL_LIFE_FLOOR_MIN);
  });

  it("S4: ISO N aluminum finish — converged Vc > production Vc (aluminum runs faster in engine)", () => {
    // From diff: Aluminum N mill finish +25% Vc
    const orch = { compute: vi.fn().mockReturnValue(makeOrchestratorResult({ cutting_speed_mpm: 302, tool_life_min: 6 })) };
    const usf  = { calculate: vi.fn().mockReturnValue(makeUltimateResult({ vc_m_min: 377, life_min: 6 })) };
    const ok = assertOk(sfcConvergencePreviewEngine.previewWith(
      { material: "6061 Aluminum", iso_group: "N", operation: "milling", cut_type: "finishing", tool_diameter_mm: 8, flutes: 3 },
      orch, usf,
    ));
    expect(ok.converged.vc_mpm).toBeGreaterThan(ok.production.vc_mpm);
    expect(ok.delta.vc.pct).toBeGreaterThan(0);
  });
});

// ============================================================================
// SAFETY FLAG TESTS
// ============================================================================

describe("SFCConvergencePreviewEngine — safety flags", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("SF1: over-speed fix: production life 2min < floor, engine 69min -> warning flag + recommendation mentions FIXES", () => {
    // From diff: Steel P mill finish -- production life 2min (over-speed), engine 69min (safer)
    const orch = { compute: vi.fn().mockReturnValue(makeOrchestratorResult({ tool_life_min: 2, cutting_speed_mpm: 280 })) };
    const usf  = { calculate: vi.fn().mockReturnValue(makeUltimateResult({ life_min: 69, vc_m_min: 170 })) };
    const ok = assertOk(sfcConvergencePreviewEngine.previewWith(STEEL_P_MILL_ROUGH, orch, usf));
    const warnFlags = ok.safety_flags.filter(f => f.severity === "warning" && f.message.includes("OVER-SPEED FIX"));
    expect(warnFlags.length).toBe(1);
    expect(warnFlags[0].field).toBe("tool_life_min");
    expect(ok.recommendation).toMatch(/FIXES/);
    // production life must actually be below the floor
    expect(ok.production.tool_life_min).toBeLessThan(TOOL_LIFE_FLOOR_MIN);
    // converged life must be at or above the floor
    expect(ok.converged.tool_life_min).toBeGreaterThanOrEqual(TOOL_LIFE_FLOOR_MIN);
  });

  it("SF2: review flag: engine life 3min < floor and < production 869min -> review flag message mentions floor", () => {
    // From diff: Cast iron K OD turning rough -- engine life 3min, production 869min
    const orch = { compute: vi.fn().mockReturnValue(makeOrchestratorResult({ tool_life_min: 869 })) };
    const usf  = { calculate: vi.fn().mockReturnValue(makeUltimateResult({ life_min: 3 })) };
    const ok = assertOk(sfcConvergencePreviewEngine.previewWith(STEEL_P_MILL_ROUGH, orch, usf));
    const reviewFlags = ok.safety_flags.filter(f => f.severity === "review" && f.field === "tool_life_min");
    expect(reviewFlags.length).toBe(1);
    expect(reviewFlags[0].message).toMatch(/3min/);
    expect(reviewFlags[0].message).toMatch(/review/);
    expect(ok.recommendation).toMatch(/hotter|review/i);
  });

  it("SF3: no life flags when both production and engine life >= 15min (safe baseline)", () => {
    // Both 60min and 36min are above the 15min floor -> no life safety flags
    const orch = { compute: vi.fn().mockReturnValue(makeOrchestratorResult({ tool_life_min: 60 })) };
    const usf  = { calculate: vi.fn().mockReturnValue(makeUltimateResult({ life_min: 36 })) };
    const ok = assertOk(sfcConvergencePreviewEngine.previewWith(STEEL_P_MILL_ROUGH, orch, usf));
    const lifeFlags = ok.safety_flags.filter(f => f.field === "tool_life_min");
    expect(lifeFlags.length).toBe(0);
  });

  it("SF4: power jump >200% triggers machine-capacity review flag with correct field and message", () => {
    // 1.0 kW -> 5.0 kW = +400% -> must flag power_kw
    const orch = { compute: vi.fn().mockReturnValue(makeOrchestratorResult({ power_kw: 1.0, tool_life_min: 30 })) };
    const usf  = { calculate: vi.fn().mockReturnValue(makeUltimateResult({ power_kw: 5.0, life_min: 25 })) };
    const ok = assertOk(sfcConvergencePreviewEngine.previewWith(STEEL_P_MILL_ROUGH, orch, usf));
    const powerFlags = ok.safety_flags.filter(f => f.field === "power_kw");
    expect(powerFlags.length).toBe(1);
    expect(powerFlags[0].severity).toBe("review");
    expect(powerFlags[0].message).toMatch(/machine capacity/);
    // Verify the actual pct in the flag message is > 200
    expect(powerFlags[0].message).toMatch(/400%|3[0-9][0-9]%|4[0-9][0-9]%/);
  });
});

// ============================================================================
// SCHEMA VALIDATION
// ============================================================================

describe("SFCConvergencePreviewInputSchema", () => {
  it("SC1: accepts minimal valid input (iso_group + tool_diameter_mm + operation)", () => {
    const r = SFCConvergencePreviewInputSchema.safeParse({
      iso_group: "P", tool_diameter_mm: 10, operation: "milling",
    });
    expect(r.success).toBe(true);
  });

  it("SC2: rejects unknown keys (strict mode -- no extra fields allowed)", () => {
    const r = SFCConvergencePreviewInputSchema.safeParse({
      iso_group: "P", tool_diameter_mm: 10, totally_unknown_key: 42,
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].code).toBe("unrecognized_keys");
  });

  it("SC3: accepts turning input without tool_diameter_mm (turning uses workpiece diameter)", () => {
    const r = SFCConvergencePreviewInputSchema.safeParse({
      iso_group: "P", operation: "turning", workpiece_diameter_mm: 80,
    });
    expect(r.success).toBe(true);
  });
});
