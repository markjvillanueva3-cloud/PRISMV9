/**
 * QA-MS1 P0 Suite: Emergency Stop / Hard Block End-to-End
 * ========================================================
 * Verifies that hard blocks propagate all the way through the safety chain.
 *
 * Tests:
 * - T23: SafetyBlockError propagates through crossFieldPhysics
 * - T24: SafetyQualityHook blocks RPM > 60000
 * - T28: Superalloy with Fc < 2000N at Vc > 80 → violation
 * - T29: Soft material with Fc > 3000N at Vc > 200 → violation
 * - T30: RPM/Vc implies diameter > 1000mm → violation
 * - T31: Valid physics data → no throw
 *
 * @safety CRITICAL — Ensures physically impossible results never reach the user
 */

import { describe, it, expect } from "vitest";
import { validateCrossFieldPhysics } from "../validation/crossFieldPhysics.js";
import { SafetyBlockError } from "../errors/PrismError.js";
import { safetyQualityHooks } from "../hooks/SafetyQualityHooks.js";

/** Helper: build a minimal SafetyCalcResult */
function makeCalcResult(overrides: Record<string, any>) {
  return {
    Vc: 200,
    fz: 0.15,
    ap: 2.0,
    safety_score: 0.85,
    material: "Steel 1045",
    operation: "face_milling",
    meta: {
      model: "kienzle",
      formula_version: "1.0",
      data_version: "1.0",
      timestamp: new Date().toISOString(),
    },
    ...overrides,
  };
}

// Find the pre-calculate-safety hook
const preCalcSafety = safetyQualityHooks.find(
  (h) => h.id === "pre-calculate-safety"
);

describe("Cross-Field Physics Validation [QA-MS1 P0]", () => {
  // ── T23 (P0): SafetyBlockError propagates ─────────────────────────
  it("T23: crossFieldPhysics violation throws SafetyBlockError with score=0.0", () => {
    const result = makeCalcResult({
      material: "Inconel 718",
      Vc: 100,
      Fc: 500,  // Impossibly low for superalloy at this speed
    });
    expect(() => validateCrossFieldPhysics(result as any)).toThrow(SafetyBlockError);
    try {
      validateCrossFieldPhysics(result as any);
    } catch (e) {
      expect(e).toBeInstanceOf(SafetyBlockError);
      expect((e as SafetyBlockError).safetyScore).toBe(0.0);
    }
  });

  // ── T28 (P1): Superalloy with Fc < 2000N at Vc > 80 → violation ──
  it("T28: superalloy with Fc < 2000N at Vc > 80 throws", () => {
    const result = makeCalcResult({
      material: "Inconel 718",
      Vc: 100,
      Fc: 500,
    });
    expect(() => validateCrossFieldPhysics(result as any)).toThrow(SafetyBlockError);
  });

  // ── T29 (P1): Soft material with Fc > 3000N at Vc > 200 → violation
  it("T29: soft material with Fc > 3000N at Vc > 200 throws", () => {
    const result = makeCalcResult({
      material: "Aluminum 6061",
      Vc: 300,
      Fc: 5000,
    });
    expect(() => validateCrossFieldPhysics(result as any)).toThrow(SafetyBlockError);
  });

  // ── T30 (P2): RPM/Vc implies diameter > 1000mm → violation ────────
  it("T30: RPM/Vc implies implausible diameter > 1000mm", () => {
    const result = makeCalcResult({
      Vc: 1000,
      n_rpm: 100,
      // Implied D = (1000 × 1000) / (π × 100) = 3183mm — impossible
    });
    expect(() => validateCrossFieldPhysics(result as any)).toThrow(SafetyBlockError);
  });

  // ── T31 (P2): Valid physics data → no throw ───────────────────────
  it("T31: valid physics data does NOT throw", () => {
    const result = makeCalcResult({
      material: "Steel 1045",
      Vc: 200,
      Fc: 2000,
      fz: 0.15,
    });
    expect(() => validateCrossFieldPhysics(result as any)).not.toThrow();
  });

  // ── Additional: multiple violations in single check ───────────────
  it("multiple physics violations in single result", () => {
    const result = makeCalcResult({
      material: "Inconel 718",
      Vc: 100,
      Fc: 500,       // Force too low for superalloy
      fz: 0.8,       // Feed too high for superalloy (> 0.5)
    });
    expect(() => validateCrossFieldPhysics(result as any)).toThrow(SafetyBlockError);
  });
});

describe("SafetyQualityHooks pre-calculate-safety [QA-MS1 P0]", () => {
  it("hook exists and is blocking/critical", () => {
    expect(preCalcSafety).toBeDefined();
    expect(preCalcSafety!.mode).toBe("blocking");
    expect(preCalcSafety!.priority).toBe("critical");
  });

  // ── T24 (P0): RPM > 60000 → blocked ──────────────────────────────
  it("T24: blocks when spindleRpm > 60000", () => {
    const ctx = {
      operation: "test-calc",
      phase: "pre-calculation" as const,
      timestamp: new Date(),
      target: {
        type: "calculation" as const,
        data: { spindleRpm: 65000 },
      },
    };
    const result = preCalcSafety!.handler(ctx as any);
    expect(result).toHaveProperty("blocked", true);
    expect(result.message).toContain("SAFETY BLOCK");
  });

  // ── Additional: valid RPM passes ──────────────────────────────────
  it("passes when spindleRpm = 60000 (at limit)", () => {
    const ctx = {
      operation: "test-calc",
      phase: "pre-calculation" as const,
      timestamp: new Date(),
      target: {
        type: "calculation" as const,
        data: { spindleRpm: 60000 },
      },
    };
    const result = preCalcSafety!.handler(ctx as any);
    expect(result).toHaveProperty("blocked", false);
  });

  // ── Feed rate > 50000 → blocked ───────────────────────────────────
  it("blocks when feedRate > 50000", () => {
    const ctx = {
      operation: "test-calc",
      phase: "pre-calculation" as const,
      timestamp: new Date(),
      target: {
        type: "calculation" as const,
        data: { feedRate: 55000 },
      },
    };
    const result = preCalcSafety!.handler(ctx as any);
    expect(result).toHaveProperty("blocked", true);
  });

  // ── DOC > 50mm → blocked ──────────────────────────────────────────
  it("blocks when depthOfCut > 50mm", () => {
    const ctx = {
      operation: "test-calc",
      phase: "pre-calculation" as const,
      timestamp: new Date(),
      target: {
        type: "calculation" as const,
        data: { depthOfCut: 55 },
      },
    };
    const result = preCalcSafety!.handler(ctx as any);
    expect(result).toHaveProperty("blocked", true);
  });

  // ── All params valid → passes ─────────────────────────────────────
  it("passes with all valid parameters", () => {
    const ctx = {
      operation: "test-calc",
      phase: "pre-calculation" as const,
      timestamp: new Date(),
      target: {
        type: "calculation" as const,
        data: {
          spindleRpm: 3000,
          feedRate: 500,
          feedPerTooth: 0.15,
          depthOfCut: 3.0,
          toolDiameter: 12,
        },
      },
    };
    const result = preCalcSafety!.handler(ctx as any);
    expect(result).toHaveProperty("blocked", false);
    expect(result).toHaveProperty("success", true);
  });
});
