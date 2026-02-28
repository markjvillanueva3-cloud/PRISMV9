/**
 * QA-MS1 P0 Suite: HookEngine Fail-Closed (F01 Fix Verification)
 * ===============================================================
 * Verifies F01 fix — HookEngine CALC-SAFETY-VIOLATION-001 must block
 * when safety_score is missing, not default to 1.0.
 *
 * Tests:
 * - T08: Blocks when safety_score is undefined
 * - T09: Blocks when safety_score is null
 * - T10: Blocks when safety_score = 0.69
 * - T11: Passes when safety_score = 0.70
 * - T12: Accepts S field as alias
 *
 * @safety CRITICAL — Regression of F01 would silently pass unsafe calculations
 */

import { describe, it, expect } from "vitest";
import { hookEngine } from "../orchestration/HookEngine.js";

describe("HookEngine CALC-SAFETY-VIOLATION-001 [QA-MS1 P0]", () => {
  // ── T08 (P0): undefined safety_score → BLOCKED ────────────────────
  it("T08: blocks when safety_score is undefined (no safety data)", async () => {
    const result = await hookEngine.executeHook("CALC-SAFETY-VIOLATION-001", {});
    expect(result.status).toBe("blocked");
    expect(result.blockReason).toBe("missing_safety_score");
  });

  // ── T09 (P0): null safety_score → BLOCKED ─────────────────────────
  it("T09: blocks when safety_score is null", async () => {
    const result = await hookEngine.executeHook("CALC-SAFETY-VIOLATION-001", {
      safety_score: null,
    });
    expect(result.status).toBe("blocked");
    expect(result.blockReason).toBe("missing_safety_score");
  });

  // ── T10 (P0): safety_score = 0.69 → BLOCKED ──────────────────────
  it("T10: blocks when safety_score = 0.69 (below threshold)", async () => {
    const result = await hookEngine.executeHook("CALC-SAFETY-VIOLATION-001", {
      safety_score: 0.69,
    });
    expect(result.status).toBe("blocked");
    expect(result.blockReason).toBe("safety_violation");
  });

  // ── T11 (P1): safety_score = 0.70 → PASS ─────────────────────────
  it("T11: passes when safety_score = 0.70 (at threshold)", async () => {
    const result = await hookEngine.executeHook("CALC-SAFETY-VIOLATION-001", {
      safety_score: 0.70,
    });
    expect(result.status).not.toBe("blocked");
  });

  // ── T12 (P1): S field alias → PASS ───────────────────────────────
  it("T12: accepts S field as alias for safety_score", async () => {
    const result = await hookEngine.executeHook("CALC-SAFETY-VIOLATION-001", {
      S: 0.80,
    });
    expect(result.status).not.toBe("blocked");
  });

  // ── Additional: S alias below threshold still blocks ──────────────
  it("S alias below threshold still blocks", async () => {
    const result = await hookEngine.executeHook("CALC-SAFETY-VIOLATION-001", {
      S: 0.50,
    });
    expect(result.status).toBe("blocked");
    expect(result.blockReason).toBe("safety_violation");
  });

  // ── Verify safety_score takes priority over S when both present ───
  it("safety_score takes priority over S field", async () => {
    const result = await hookEngine.executeHook("CALC-SAFETY-VIOLATION-001", {
      safety_score: 0.80,
      S: 0.50,
    });
    // safety_score ?? S — safety_score wins since it's defined
    expect(result.status).not.toBe("blocked");
  });
});
