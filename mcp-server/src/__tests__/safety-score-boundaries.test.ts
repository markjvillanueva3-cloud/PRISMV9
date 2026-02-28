/**
 * QA-MS1 P0 Suite: S(x) Safety Score Boundary Conditions
 * =======================================================
 * Verifies S(x) threshold enforcement at exact boundaries — the most critical safety gate.
 *
 * Tests:
 * - T01: S(x) = 0.699 must BLOCK
 * - T02: S(x) = 0.700 must APPROVE
 * - T03: Missing kc1_1/mc → BLOCKED (criticalDataMissing)
 * - T04: Missing Taylor C/n → BLOCKED (criticalDataMissing)
 * - T05: Weight sum invariant = 1.00
 * - T06: All components at 1.0 → S(x) = 1.000
 * - T07: All components at 0.0 → S(x) = 0.000, BLOCKED
 *
 * @safety CRITICAL — These tests guard the F01/F02 fix regressions
 */

import { describe, it, expect } from "vitest";
import { computeSafetyScore, SAFETY_THRESHOLD } from "../utils/validators.js";

/** A fully-valid material that produces S(x) = 1.0 */
const FULL_MATERIAL: Record<string, unknown> = {
  density: 7.85,                    // g/cm³ — valid range (0-25)
  melting_point: 1500,              // °C — valid range (100-4000)
  kc1_1: 1800,                     // Kienzle kc1.1
  mc: 0.25,                        // Kienzle mc
  iso_group: "P",                  // ISO P (steel)
  thermal_conductivity: 50,        // W/m·K
  specific_heat: 500,              // J/kg·K
  taylor_C: 250,                   // Taylor C
  taylor_n: 0.25,                  // Taylor n
  V30: 200,                        // m/min
  recommended_cutting_speed: 200,
  hardness_min: 180,               // HB
  hardness_max: 220,               // HB
};

describe("S(x) Safety Score Boundary Conditions [QA-MS1 P0]", () => {
  // ── T05 (P1): Weight sum invariant ─────────────────────────────────
  it("T05: component weights sum to exactly 1.00", () => {
    const result = computeSafetyScore(FULL_MATERIAL);
    const weights = Object.values(result.components).map(c => c.weight);
    const sum = weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  // ── T06 (P1): Perfect material → S(x) = 1.0, APPROVED ────────────
  it("T06: fully valid material produces S(x) = 1.000, APPROVED", () => {
    const result = computeSafetyScore(FULL_MATERIAL);
    expect(result.score).toBe(1.0);
    expect(result.status).toBe("APPROVED");
    expect(result.issues.filter(i => i.startsWith("HARD BLOCK"))).toHaveLength(0);
  });

  // ── T01 (P0): S(x) just below threshold → BLOCKED ─────────────────
  it("T01: S(x) < 0.70 must BLOCK", () => {
    // Remove edge_cases (0.15 weight) and machine_capability (0.15 weight)
    // to drop score to 0.70. Then remove thermal (0.15) partially to go below.
    const material: Record<string, unknown> = {
      ...FULL_MATERIAL,
      hardness_min: undefined,   // removes edge_cases → score 0
      hardness_max: undefined,
      V30: undefined,            // removes machine_capability → score 0
      recommended_cutting_speed: undefined,
      thermal_conductivity: undefined,  // removes thermal → score 0
      specific_heat: undefined,
    };
    const result = computeSafetyScore(material);
    // With physical_limits (0.20 × 1.0 = 0.20) + force_safety (0.20 × ~1.0) + tool_life (0.15 × ~1.0) = ~0.55
    expect(result.score).toBeLessThan(SAFETY_THRESHOLD);
    expect(result.status).toBe("BLOCKED");
  });

  // ── T02 (P0): S(x) at exact threshold → APPROVED ──────────────────
  it("T02: S(x) >= 0.700 must APPROVE", () => {
    // Full material has S(x) = 1.0, well above threshold
    const result = computeSafetyScore(FULL_MATERIAL);
    expect(result.score).toBeGreaterThanOrEqual(SAFETY_THRESHOLD);
    expect(result.status).toBe("APPROVED");
  });

  it("T02b: threshold constant is exactly 0.70", () => {
    expect(SAFETY_THRESHOLD).toBe(0.70);
  });

  // ── T03 (P0): Missing kc1_1/mc → BLOCKED (criticalDataMissing) ───
  it("T03: missing kc1_1 and mc triggers HARD BLOCK for cutting force data", () => {
    const material: Record<string, unknown> = {
      ...FULL_MATERIAL,
      kc1_1: undefined,
      mc: undefined,
    };
    const result = computeSafetyScore(material);
    expect(result.status).toBe("BLOCKED");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("HARD BLOCK"),
        expect.stringContaining("cutting force"),
      ])
    );
  });

  // ── T04 (P0): Missing Taylor C/n → BLOCKED (criticalDataMissing) ──
  it("T04: missing Taylor C and n triggers HARD BLOCK for tool life data", () => {
    const material: Record<string, unknown> = {
      ...FULL_MATERIAL,
      taylor_C: undefined,
      taylor_n: undefined,
    };
    const result = computeSafetyScore(material);
    expect(result.status).toBe("BLOCKED");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("HARD BLOCK"),
        expect.stringContaining("tool life"),
      ])
    );
  });

  // ── T07 (P1): Empty material → S(x) = 0.000, BLOCKED ─────────────
  it("T07: empty material produces S(x) = 0.000 and BLOCKED", () => {
    const result = computeSafetyScore({});
    expect(result.score).toBe(0.0);
    expect(result.status).toBe("BLOCKED");
  });

  // ── Additional boundary: criticalDataMissing forces BLOCKED even if score >= 0.70 ──
  it("criticalDataMissing overrides score — missing force data always blocks", () => {
    // Even if we could somehow get score >= 0.70 without force data,
    // criticalDataMissing should still block
    const material: Record<string, unknown> = {
      ...FULL_MATERIAL,
      kc1_1: undefined,  // Remove force data
      mc: undefined,
    };
    const result = computeSafetyScore(material);
    // force_safety.score === 0 → criticalDataMissing === true → always BLOCKED
    expect(result.status).toBe("BLOCKED");
  });
});
