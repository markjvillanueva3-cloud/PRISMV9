/**
 * LatheAIOrchestrationEngine.test.ts -- slot:whiskey (Lathe Wizard)
 * ============================================================================
 * Companion test for the lathe AI head (LatheAIOrchestrationEngine) -- the "AI system at the head of
 * the lathe wizard". This file exercises the engine's REAL deterministic public surface with
 * reference-value / algebraic-invariant assertions (R9), NOT toBeDefined() stubs:
 *
 *   - generateProgram()       -- U-AIHEAD-01 flagship: drives the now-real spine + AI safety advisory
 *   - validatePhysics()       -- deterministic deflection/thermal gates + the overallValid conjunction
 *   - getEngineInventory()    -- registry totals invariant (sum-of-parts === total)
 *   - mapActionToEngines()    -- exact action->engine map + the unknown-action fallback
 *   - adaptStrategy()         -- failure-count / confidence thresholds -> strategy switch
 *   - selectEngineChain()     -- always-include-critical + maxEngines cap
 *   - aggregateResults()      -- empty/all-failed -> null; confidence-weighted vs physics-priority
 *   - executeParallel()       -- a non-existent engine fails gracefully (no throw)
 *
 * Methods backed by pre-existing hardcoded helpers (orchestrateFullAnalysis' default aggregated
 * analysis, etc.) are intentionally NOT asserted as if they compute real values -- that would be a
 * misleading test (R12). We test only the methods with genuine deterministic logic.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  latheAIOrchestrationEngine,
  type EngineExecutionRecord,
} from "../engines/LatheAIOrchestrationEngine.js";
import { latheOrchestrationEngine } from "../engines/LatheOrchestrationEngine.js";
import { turningPrintToProgramEngine } from "../engines/TurningPrintToProgramEngine.js";

// --- fixtures ---------------------------------------------------------------

// An Okuma OD-turn part the real spine can emit (controller:"okuma" -> verified OSP post).
const okumaPart = () =>
  ({
    part_number: "AIHEAD-UNIT",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    part_length_mm: 80,
    features: [
      { id: "f1", type: "od_turn" as const, od_mm: 30, length_mm: 60, position_z_mm: 0,
        x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 },
    ],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

// minimal EngineExecutionRecord builder for aggregate/adapt tests
const rec = (
  engineName: string,
  status: EngineExecutionRecord["status"],
  confidence: number,
  result?: unknown,
): EngineExecutionRecord => ({
  engineName,
  status,
  startTime: 0,
  endTime: 1,
  durationMs: 1,
  retryCount: 0,
  confidence,
  result,
});

// physics fixtures: validatePhysics(params, isoGroup, tool)
type VPArgs = Parameters<typeof latheAIOrchestrationEngine.validatePhysics>;
const cuttingParams = (vc: number, fn: number, ap: number) =>
  ({ vc_mpm: vc, fn_mmrev: fn, ap_mm: ap }) as unknown as VPArgs[0];
const tool = (noseR: number) => ({ nose_radius_mm: noseR }) as unknown as VPArgs[2];

describe("LatheAIOrchestrationEngine -- AI head public surface", () => {
  afterEach(() => vi.restoreAllMocks());

  // === generateProgram() -- the U-AIHEAD-01 flagship =======================

  it("generateProgram() drives the spine to a real Okuma program (head -> spine -> runPipeline)", () => {
    const r = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(50);
    expect(/\bG\d/.test(r.program_text)).toBe(true); // contains real G-code
    expect(r.total_operations).toBeGreaterThan(0);
    expect(r.sessionId).toMatch(/^generate-/);
  });

  it("generateProgram() program EQUALS the spine's program (faithful delegation, not re-derivation)", () => {
    const stripTs = (s: string) =>
      s.replace(/\(GENERATED:[^)]*\)/g, "(GENERATED)").replace(/\d{4}-\d\d-\d\dT[\d:.]+Z?/g, "<TS>").trim();
    const spine = latheOrchestrationEngine.calculate("x", okumaPart());
    const head = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(stripTs(head.program_text)).toBe(stripTs(spine.program_text));
  });

  it("generateProgram() adds a per-op AI safety advisory whose summary count matches the array", () => {
    const r = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(Array.isArray(r.ai_safety_advisory)).toBe(true);
    expect(r.ai_advisory_summary.ops_checked).toBe(r.ai_safety_advisory.length);
    expect(r.ai_advisory_summary.ops_flagged).toBe(r.ai_safety_advisory.filter((a) => !a.passed).length);
    for (const a of r.ai_safety_advisory) {
      expect(typeof a.passed).toBe("boolean");
      expect(Number.isFinite(a.op_number)).toBe(true);
    }
  });

  it("generateProgram() HONORS a spine fail-close -- advisory never overrides the physics verdict", () => {
    // Force the Okuma post to suppress emission -> spine fail-closes -> head must report it verbatim.
    vi.spyOn(
      turningPrintToProgramEngine as unknown as { emitViaOkumaPost: () => unknown },
      "emitViaOkumaPost",
    ).mockReturnValue(null);
    const r = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(r.success).toBe(false);
    expect(r.safety_passed).toBe(false);
    expect(/\bT0101\b/.test(r.program_text)).toBe(false); // no real program ships
  });

  // === validatePhysics() -- deterministic gates + conjunction invariant ====

  it("validatePhysics(): a normal P-group cut passes the deflection + thermal gates", () => {
    const v = latheAIOrchestrationEngine.validatePhysics(cuttingParams(150, 0.2, 2.0), "P", tool(0.8));
    expect(v.deflectionValid).toBe(true); // ap 2 < 5 AND nose 0.8 > 0.2
    expect(v.thermalValid).toBe(true); // vc 150 < 400
    expect(v.warnings.some((w) => /Deflection risk/.test(w))).toBe(false);
    expect(v.warnings.some((w) => /Thermal risk/.test(w))).toBe(false);
  });

  it("validatePhysics(): high depth-of-cut trips the deflection gate + warning", () => {
    const v = latheAIOrchestrationEngine.validatePhysics(cuttingParams(150, 0.2, 6.0), "P", tool(0.8));
    expect(v.deflectionValid).toBe(false); // ap 6 >= 5
    expect(v.warnings.some((w) => /Deflection risk/.test(w))).toBe(true);
  });

  it("validatePhysics(): a sub-0.2mm nose radius trips the deflection gate", () => {
    const v = latheAIOrchestrationEngine.validatePhysics(cuttingParams(150, 0.2, 2.0), "P", tool(0.15));
    expect(v.deflectionValid).toBe(false); // nose 0.15 <= 0.2
  });

  it("validatePhysics(): excessive cutting speed trips thermal AND forces overallValid false", () => {
    const v = latheAIOrchestrationEngine.validatePhysics(cuttingParams(450, 0.2, 2.0), "P", tool(0.8));
    expect(v.thermalValid).toBe(false); // vc 450 >= 400
    expect(v.warnings.some((w) => /Thermal risk/.test(w))).toBe(true);
    // overallValid is the conjunction of all four gates -> one false gate forces it false.
    expect(v.overallValid).toBe(false);
  });

  // === getEngineInventory() -- registry totals invariant ===================

  it("getEngineInventory(): total equals the sum across categories AND across priorities", () => {
    const inv = latheAIOrchestrationEngine.getEngineInventory();
    expect(inv.total).toBeGreaterThan(0);
    const catSum = Object.values(inv.byCategory).reduce((s, n) => s + n, 0);
    const priSum = Object.values(inv.byPriority).reduce((s, n) => s + n, 0);
    expect(catSum).toBe(inv.total);
    expect(priSum).toBe(inv.total);
    // collision_safety holds at least the 3 safety engines (collision-zone, post-proc, orchestration).
    expect(inv.byCategory.collision_safety).toBeGreaterThanOrEqual(3);
  });

  // === mapActionToEngines() / getRegisteredActions() =======================

  it("mapActionToEngines(): a known action maps to its exact engine list", () => {
    expect(latheAIOrchestrationEngine.mapActionToEngines("chuck_force")).toEqual([
      "LatheDeepAIHardeningEngine",
      "LatheScienceHardeningEngine",
    ]);
  });

  it("mapActionToEngines(): an unknown action falls back to the hardening engine (never empty)", () => {
    expect(latheAIOrchestrationEngine.mapActionToEngines("totally_unknown_action_xyz")).toEqual([
      "LatheDeepAIHardeningEngine",
    ]);
  });

  it("every registered action maps to a non-empty engine list (no dangling actions)", () => {
    const actions = latheAIOrchestrationEngine.getRegisteredActions();
    expect(actions.length).toBeGreaterThan(0);
    for (const a of actions) {
      expect(latheAIOrchestrationEngine.mapActionToEngines(a).length).toBeGreaterThan(0);
    }
  });

  // === adaptStrategy() -- threshold-driven switches ========================

  it("adaptStrategy(): more than 3 failed engines collapses to fast_path", () => {
    const history = [1, 2, 3, 4].map((i) => rec(`E${i}`, "failed", 0));
    expect(latheAIOrchestrationEngine.adaptStrategy("adaptive", history)).toBe("fast_path");
  });

  it("adaptStrategy(): uniformly high confidence simplifies to fast_path", () => {
    const history = [1, 2, 3].map((i) => rec(`E${i}`, "completed", 0.95));
    expect(latheAIOrchestrationEngine.adaptStrategy("adaptive", history)).toBe("fast_path");
  });

  it("adaptStrategy(): low confidence escalates to full_coverage", () => {
    const history = [1, 2].map((i) => rec(`E${i}`, "completed", 0.5));
    expect(latheAIOrchestrationEngine.adaptStrategy("adaptive", history)).toBe("full_coverage");
  });

  // === selectEngineChain() -- critical inclusion + cap =====================

  it("selectEngineChain(): always includes critical engines and respects the maxEngines cap", () => {
    const big = latheAIOrchestrationEngine.selectEngineChain("G76 threading program", {}, 10);
    expect(big.length).toBeGreaterThan(0);
    expect(big.length).toBeLessThanOrEqual(10);
    expect(big).toContain("LatheScienceHardeningEngine"); // a critical engine
    // A tight cap is honored (never exceeded).
    const capped = latheAIOrchestrationEngine.selectEngineChain("G76 threading program", {}, 3);
    expect(capped.length).toBeLessThanOrEqual(3);
  });

  // === aggregateResults() -- resolution semantics ==========================

  it("aggregateResults(): an empty result map resolves to null", () => {
    expect(latheAIOrchestrationEngine.aggregateResults(new Map(), "confidence_weighted")).toBeNull();
  });

  it("aggregateResults(): a map with only failed engines resolves to null (completed-only filter)", () => {
    const m = new Map<string, EngineExecutionRecord>([
      ["A", rec("A", "failed", 0.9, "X")],
      ["B", rec("B", "failed", 0.8, "Y")],
    ]);
    expect(latheAIOrchestrationEngine.aggregateResults(m, "confidence_weighted")).toBeNull();
  });

  it("aggregateResults(): confidence_weighted returns the highest-confidence result", () => {
    const m = new Map<string, EngineExecutionRecord>([
      ["LO", rec("LO", "completed", 0.3, "LO_RESULT")],
      ["HI", rec("HI", "completed", 0.9, "HI_RESULT")],
    ]);
    expect(latheAIOrchestrationEngine.aggregateResults(m, "confidence_weighted")).toBe("HI_RESULT");
  });

  it("aggregateResults(): physics_priority prefers a physics engine even at lower confidence (safety)", () => {
    const m = new Map<string, EngineExecutionRecord>([
      ["Other", rec("Other", "completed", 0.99, "OTHER_RESULT")],
      ["LatheScienceHardeningEngine", rec("LatheScienceHardeningEngine", "completed", 0.6, "PHYSICS_RESULT")],
    ]);
    expect(latheAIOrchestrationEngine.aggregateResults(m, "physics_priority")).toBe("PHYSICS_RESULT");
  });

  // === executeParallel() -- graceful failure ===============================

  it("executeParallel(): a non-existent engine records a failed status with an error (never throws)", async () => {
    const results = await latheAIOrchestrationEngine.executeParallel(["NonExistentEngineXYZ123"], {}, 2000);
    const r = results.get("NonExistentEngineXYZ123");
    expect(r?.engineName).toBe("NonExistentEngineXYZ123");
    expect(r?.status).toBe("failed");
    expect(r?.error).toMatch(/Engine not found/);
  });
});
