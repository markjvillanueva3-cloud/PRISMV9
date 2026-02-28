/**
 * QA-MS1 P0 Suite: EnforcementHooks Fail-Closed (F02 Fix Verification)
 * ====================================================================
 * Verifies F02 fix — preOutputSafetyHardGate must block when safety is undefined,
 * not return hookWarning.
 *
 * Tests:
 * - T13: Blocks when context.quality.safety is undefined
 * - T14: Blocks at safety = 0.699
 * - T15: Passes at safety = 0.700
 *
 * @safety CRITICAL — Regression of F02 would let unsafe outputs through
 */

import { describe, it, expect } from "vitest";
import { enforcementHooks } from "../hooks/EnforcementHooks.js";

// Find the preOutputSafetyHardGate hook from the exported array
const safetyHardGate = enforcementHooks.find(
  (h) => h.id === "pre-output-safety-hard-gate"
);

describe("EnforcementHooks preOutputSafetyHardGate [QA-MS1 P0]", () => {
  it("hook exists and is configured correctly", () => {
    expect(safetyHardGate).toBeDefined();
    expect(safetyHardGate!.mode).toBe("blocking");
    expect(safetyHardGate!.priority).toBe("critical");
    expect(safetyHardGate!.enabled).toBe(true);
  });

  // ── T13 (P0): undefined safety → hookBlock (NOT hookWarning) ──────
  it("T13: blocks when context.quality.safety is undefined", () => {
    const ctx = {
      operation: "test-output",
      phase: "pre-output" as const,
      timestamp: new Date(),
      quality: {},
    };
    const result = safetyHardGate!.handler(ctx as any);
    // F02 fix: must return hookBlock (blocked=true), NOT hookWarning
    expect(result).toHaveProperty("blocked", true);
    expect(result).toHaveProperty("success", false);
    expect(result.message).toContain("HARD BLOCK");
  });

  it("T13b: blocks when quality object is missing entirely", () => {
    const ctx = {
      operation: "test-output",
      phase: "pre-output" as const,
      timestamp: new Date(),
      // no quality property at all
    };
    const result = safetyHardGate!.handler(ctx as any);
    expect(result).toHaveProperty("blocked", true);
    expect(result).toHaveProperty("success", false);
  });

  // ── T14 (P0): safety = 0.699 → hookBlock ──────────────────────────
  it("T14: blocks at safety = 0.699 (just below threshold)", () => {
    const ctx = {
      operation: "test-output",
      phase: "pre-output" as const,
      timestamp: new Date(),
      quality: { safety: 0.699 },
    };
    const result = safetyHardGate!.handler(ctx as any);
    expect(result).toHaveProperty("blocked", true);
    expect(result.message).toContain("SAFETY");
  });

  // ── T15 (P1): safety = 0.700 → hookSuccess ───────────────────────
  it("T15: passes at safety = 0.700 (at threshold)", () => {
    const ctx = {
      operation: "test-output",
      phase: "pre-output" as const,
      timestamp: new Date(),
      quality: { safety: 0.700 },
    };
    const result = safetyHardGate!.handler(ctx as any);
    expect(result).toHaveProperty("blocked", false);
    expect(result).toHaveProperty("success", true);
  });

  // ── Additional: safety = 0.0 → blocked ───────────────────────────
  it("safety = 0.0 is blocked", () => {
    const ctx = {
      operation: "test-output",
      phase: "pre-output" as const,
      timestamp: new Date(),
      quality: { safety: 0.0 },
    };
    const result = safetyHardGate!.handler(ctx as any);
    expect(result).toHaveProperty("blocked", true);
  });

  // ── Additional: safety = 1.0 → pass ──────────────────────────────
  it("safety = 1.0 passes", () => {
    const ctx = {
      operation: "test-output",
      phase: "pre-output" as const,
      timestamp: new Date(),
      quality: { safety: 1.0 },
    };
    const result = safetyHardGate!.handler(ctx as any);
    expect(result).toHaveProperty("blocked", false);
    expect(result).toHaveProperty("success", true);
  });
});
