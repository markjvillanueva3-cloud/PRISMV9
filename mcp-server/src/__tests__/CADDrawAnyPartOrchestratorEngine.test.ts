/**
 * CADDrawAnyPartOrchestratorEngine — vitest suite (CAD-DRAW-MAX-MS0/FINAL).
 *
 * Closed-form assertions on the propose→encode→execute→publish loop.
 * Stubs the three live-side singletons (decoder, hyperCAD-S bridge, outcome
 * publisher) by replacing their methods before each test and restoring
 * after — keeps unit isolation without vi.mock factory hoisting hazards.
 *
 * Tests verify the loop CONTRACT: opLog accumulates only on live.ok,
 * tolerance augmentation flag tracks input.callouts, export_* terminates,
 * maxOps caps the loop, decoder-null halts cleanly, continueOnFailure
 * routes the failure correctly, R12 fail-loud on bad inputs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  CADDrawAnyPartOrchestratorEngine,
  DEFAULT_MAX_OPS,
} from "../engines/CADDrawAnyPartOrchestratorEngine.js";
import { cadOperationDecoderEngine } from "../engines/CADOperationDecoderEngine.js";
import { hyperCADSLiveBridgeEngine } from "../engines/HyperCADSLiveBridgeEngine.js";
import { hyperCADSOutcomePublisherEngine } from "../engines/HyperCADSOutcomePublisherEngine.js";
import { UNIFIED_FEATURE_DIM } from "../engines/CADUnifiedFeatureBridgeEngine.js";
import { TOLERANCE_SIGNAL_DIM } from "../engines/CADToleranceSignalEncoderEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

describe("CADDrawAnyPartOrchestratorEngine — FINAL", () => {
  let engine: CADDrawAnyPartOrchestratorEngine;
  // Snapshots of original methods to restore after each test
  let origProposeNextOp: typeof cadOperationDecoderEngine.proposeNextOp;
  let origNewDoc: typeof hyperCADSLiveBridgeEngine.newDoc;
  let origCreateSketch: typeof hyperCADSLiveBridgeEngine.createSketch;
  let origExtrude: typeof hyperCADSLiveBridgeEngine.extrude;
  let origFillet: typeof hyperCADSLiveBridgeEngine.fillet;
  let origExportFile: typeof hyperCADSLiveBridgeEngine.exportFile;
  let origPublish: typeof hyperCADSOutcomePublisherEngine.publishLiveResult;

  beforeEach(() => {
    engine = new CADDrawAnyPartOrchestratorEngine();
    origProposeNextOp = cadOperationDecoderEngine.proposeNextOp.bind(cadOperationDecoderEngine);
    origNewDoc = hyperCADSLiveBridgeEngine.newDoc.bind(hyperCADSLiveBridgeEngine);
    origCreateSketch = hyperCADSLiveBridgeEngine.createSketch.bind(hyperCADSLiveBridgeEngine);
    origExtrude = hyperCADSLiveBridgeEngine.extrude.bind(hyperCADSLiveBridgeEngine);
    origFillet = hyperCADSLiveBridgeEngine.fillet.bind(hyperCADSLiveBridgeEngine);
    origExportFile = hyperCADSLiveBridgeEngine.exportFile.bind(hyperCADSLiveBridgeEngine);
    origPublish = hyperCADSOutcomePublisherEngine.publishLiveResult.bind(hyperCADSOutcomePublisherEngine);
    // Default stub: newDoc is a no-op; publish records calls
    hyperCADSLiveBridgeEngine.newDoc = (() => undefined) as never;
  });

  afterEach(() => {
    cadOperationDecoderEngine.proposeNextOp = origProposeNextOp;
    hyperCADSLiveBridgeEngine.newDoc = origNewDoc;
    hyperCADSLiveBridgeEngine.createSketch = origCreateSketch;
    hyperCADSLiveBridgeEngine.extrude = origExtrude;
    hyperCADSLiveBridgeEngine.fillet = origFillet;
    hyperCADSLiveBridgeEngine.exportFile = origExportFile;
    hyperCADSOutcomePublisherEngine.publishLiveResult = origPublish;
  });

  // ── R12 fail-loud ─────────────────────────────────────────────────────────

  it("R12 fail-loud: empty intent throws TypeError", async () => {
    await expect(engine.drawAnyPart({ intent: "" } as never)).rejects.toThrow(TypeError);
  });

  it("R12 fail-loud: non-string intent throws TypeError", async () => {
    await expect(engine.drawAnyPart({ intent: 123 } as never)).rejects.toThrow(TypeError);
  });

  it("R12 fail-loud: null input throws TypeError", async () => {
    await expect(engine.drawAnyPart(null as never)).rejects.toThrow(TypeError);
  });

  // ── Static dimension invariants ──────────────────────────────────────────

  it("static UNIFIED_DIM and TOLERANCE_AUGMENTED_DIM match upstream constants", () => {
    expect(CADDrawAnyPartOrchestratorEngine.UNIFIED_DIM).toBe(UNIFIED_FEATURE_DIM);
    expect(CADDrawAnyPartOrchestratorEngine.TOLERANCE_AUGMENTED_DIM).toBe(
      UNIFIED_FEATURE_DIM + TOLERANCE_SIGNAL_DIM,
    );
    expect(CADDrawAnyPartOrchestratorEngine.UNIFIED_DIM).toBe(33);
    expect(CADDrawAnyPartOrchestratorEngine.TOLERANCE_AUGMENTED_DIM).toBe(39);
  });

  // ── Termination paths ────────────────────────────────────────────────────

  it("export_step proposal terminates the loop with stopReason='exported'", async () => {
    cadOperationDecoderEngine.proposeNextOp = (() => ({
      op: { kind: "export_step", args: { path: "/tmp/x.step" } } as CADOperation,
      score: 0.9,
      source: "intent_rule" as const,
    })) as never;
    hyperCADSLiveBridgeEngine.exportFile = (async () => ({
      ok: true,
      opId: "export_step",
      durationMs: 50,
    })) as never;
    hyperCADSOutcomePublisherEngine.publishLiveResult = (() => ({
      ok: true,
      lineageId: "lin-1",
    })) as never;

    const result = await engine.drawAnyPart({ intent: "save as step" });
    expect(result.stopReason).toBe("exported");
    expect(result.exportedSuccessfully).toBe(true);
    expect(result.iterations).toBe(1);
    expect(result.opLog).toHaveLength(1);
    expect(result.opLog[0].kind).toBe("export_step");
  });

  it("decoder returning null halts with stopReason='decoder-null'", async () => {
    cadOperationDecoderEngine.proposeNextOp = (() => null) as never;
    const result = await engine.drawAnyPart({ intent: "do something" });
    expect(result.stopReason).toBe("decoder-null");
    expect(result.iterations).toBe(0);
    expect(result.opLog).toHaveLength(0);
    expect(result.exportedSuccessfully).toBe(false);
  });

  it("maxOps cap stops the loop when no export emitted (stopReason='max-ops')", async () => {
    cadOperationDecoderEngine.proposeNextOp = (() => ({
      op: { kind: "feature_extrude", args: { distance: 10 } } as CADOperation,
      score: 0.7,
      source: "sequence_template" as const,
    })) as never;
    hyperCADSLiveBridgeEngine.extrude = (async () => ({
      ok: true,
      opId: "extrude",
      durationMs: 12,
    })) as never;
    hyperCADSOutcomePublisherEngine.publishLiveResult = (() => ({
      ok: true,
      lineageId: "lin-x",
    })) as never;

    const result = await engine.drawAnyPart({ intent: "extrude forever", maxOps: 3 });
    expect(result.stopReason).toBe("max-ops");
    expect(result.exportedSuccessfully).toBe(false);
    expect(result.iterations).toBe(3);
    expect(result.opLog).toHaveLength(3);
  });

  it("default maxOps is DEFAULT_MAX_OPS (15) when not specified", async () => {
    cadOperationDecoderEngine.proposeNextOp = (() => ({
      op: { kind: "feature_extrude", args: {} } as CADOperation,
      score: 0.7,
      source: "sequence_template" as const,
    })) as never;
    hyperCADSLiveBridgeEngine.extrude = (async () => ({
      ok: true,
      opId: "extrude",
      durationMs: 1,
    })) as never;
    hyperCADSOutcomePublisherEngine.publishLiveResult = (() => ({
      ok: true,
      lineageId: "lin",
    })) as never;

    const result = await engine.drawAnyPart({ intent: "loop" });
    expect(result.iterations).toBe(DEFAULT_MAX_OPS);
    expect(DEFAULT_MAX_OPS).toBe(15);
  });

  // ── live.ok contract: opLog accumulates only on success ──────────────────

  it("opLog accumulates ONLY for live.ok=true ops; failures are skipped from opLog", async () => {
    let callCount = 0;
    cadOperationDecoderEngine.proposeNextOp = (() => {
      callCount++;
      return {
        op: { kind: "feature_extrude", args: { distance: callCount } } as CADOperation,
        score: 0.7,
        source: "sequence_template" as const,
      };
    }) as never;
    let extrudeCall = 0;
    hyperCADSLiveBridgeEngine.extrude = (async () => {
      extrudeCall++;
      // Fail iter 2, succeed otherwise
      return extrudeCall === 2
        ? { ok: false, opId: "extrude", durationMs: 5, errorMessage: "boom" }
        : { ok: true, opId: "extrude", durationMs: 5 };
    }) as never;
    hyperCADSOutcomePublisherEngine.publishLiveResult = (() => ({
      ok: true,
      lineageId: "lin",
    })) as never;

    const result = await engine.drawAnyPart({ intent: "ext", maxOps: 4, continueOnFailure: true });
    // 4 iterations, 3 successes, 1 failure → opLog has 3 entries
    expect(result.iterations).toBe(4);
    expect(result.opLog).toHaveLength(3);
    expect(result.steps).toHaveLength(4);
    // Failed step's live.ok is false
    expect(result.steps[1].live.ok).toBe(false);
    // But still published — assert publish call shape
    expect(result.steps[1].outcome.ok).toBe(true);
  });

  it("continueOnFailure=false halts on first live failure (stopReason='live-failure-halt')", async () => {
    cadOperationDecoderEngine.proposeNextOp = (() => ({
      op: { kind: "feature_extrude", args: {} } as CADOperation,
      score: 0.7,
      source: "sequence_template" as const,
    })) as never;
    hyperCADSLiveBridgeEngine.extrude = (async () => ({
      ok: false,
      opId: "extrude",
      durationMs: 5,
      errorMessage: "topology",
    })) as never;
    hyperCADSOutcomePublisherEngine.publishLiveResult = (() => ({
      ok: true,
      lineageId: "lin",
    })) as never;

    const result = await engine.drawAnyPart({ intent: "ext", continueOnFailure: false });
    expect(result.stopReason).toBe("live-failure-halt");
    expect(result.iterations).toBe(1);
    expect(result.opLog).toHaveLength(0);
  });

  // ── Tolerance augmentation flag ──────────────────────────────────────────

  it("steps[].toleranceAugmented is true when callouts present, false when omitted", async () => {
    cadOperationDecoderEngine.proposeNextOp = (() => ({
      op: { kind: "export_step", args: {} } as CADOperation,
      score: 0.9,
      source: "intent_rule" as const,
    })) as never;
    hyperCADSLiveBridgeEngine.exportFile = (async () => ({
      ok: true,
      opId: "export_step",
      durationMs: 1,
    })) as never;
    hyperCADSOutcomePublisherEngine.publishLiveResult = (() => ({
      ok: true,
      lineageId: "lin",
    })) as never;

    // No callouts → 33-d feature, toleranceAugmented=false
    const noTol = await engine.drawAnyPart({ intent: "save" });
    expect(noTol.steps[0].toleranceAugmented).toBe(false);
    expect(noTol.steps[0].feature).toHaveLength(33);

    // With callouts → 39-d feature, toleranceAugmented=true
    const withTol = await engine.drawAnyPart({
      intent: "save",
      callouts: [{ tolerance_mm: 0.01, gdt_symbol: "position" }],
    });
    expect(withTol.steps[0].toleranceAugmented).toBe(true);
    expect(withTol.steps[0].feature).toHaveLength(39);
  });

  it("empty callouts array (length 0) does NOT trigger augmentation", async () => {
    cadOperationDecoderEngine.proposeNextOp = (() => ({
      op: { kind: "export_step", args: {} } as CADOperation,
      score: 0.9,
      source: "intent_rule" as const,
    })) as never;
    hyperCADSLiveBridgeEngine.exportFile = (async () => ({
      ok: true,
      opId: "export_step",
      durationMs: 1,
    })) as never;
    hyperCADSOutcomePublisherEngine.publishLiveResult = (() => ({
      ok: true,
      lineageId: "lin",
    })) as never;

    const result = await engine.drawAnyPart({ intent: "save", callouts: [] });
    expect(result.steps[0].toleranceAugmented).toBe(false);
    expect(result.steps[0].feature).toHaveLength(33);
  });

  // ── Op-kind routing through executeProposal ──────────────────────────────

  it("executeProposal routes feature_extrude → hyperCADS.extrude", async () => {
    const calls: string[] = [];
    cadOperationDecoderEngine.proposeNextOp = (() => ({
      op: { kind: "feature_extrude", args: { distance: 7 } } as CADOperation,
      score: 0.7,
      source: "sequence_template" as const,
    })) as never;
    hyperCADSLiveBridgeEngine.extrude = (async (params: unknown) => {
      calls.push(`extrude:${JSON.stringify(params)}`);
      return { ok: true, opId: "extrude", durationMs: 1 };
    }) as never;
    hyperCADSOutcomePublisherEngine.publishLiveResult = (() => ({
      ok: true,
      lineageId: "lin",
    })) as never;

    await engine.drawAnyPart({ intent: "ext", maxOps: 1 });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("extrude");
    expect(calls[0]).toContain('"distance":7');
  });

  it("executeProposal routes sketch_create → hyperCADS.createSketch", async () => {
    let createSketchCalled = false;
    cadOperationDecoderEngine.proposeNextOp = (() => ({
      op: { kind: "sketch_create", args: { plane: "XY" } } as CADOperation,
      score: 0.85,
      source: "sequence_template" as const,
    })) as never;
    hyperCADSLiveBridgeEngine.createSketch = (async () => {
      createSketchCalled = true;
      return { ok: true, opId: "sketch", durationMs: 1 };
    }) as never;
    hyperCADSOutcomePublisherEngine.publishLiveResult = (() => ({
      ok: true,
      lineageId: "lin",
    })) as never;

    await engine.drawAnyPart({ intent: "sketch", maxOps: 1 });
    expect(createSketchCalled).toBe(true);
  });

  // ── Stats tracking ────────────────────────────────────────────────────────

  it("getStats tracks totalRuns + totalSuccessfulExports + totalIterations + totalLiveFailures", async () => {
    cadOperationDecoderEngine.proposeNextOp = (() => ({
      op: { kind: "export_step", args: {} } as CADOperation,
      score: 0.9,
      source: "intent_rule" as const,
    })) as never;
    hyperCADSLiveBridgeEngine.exportFile = (async () => ({
      ok: true,
      opId: "export_step",
      durationMs: 1,
    })) as never;
    hyperCADSOutcomePublisherEngine.publishLiveResult = (() => ({
      ok: true,
      lineageId: "lin",
    })) as never;

    await engine.drawAnyPart({ intent: "save" });
    await engine.drawAnyPart({ intent: "save" });
    const stats = engine.getStats();
    expect(stats.totalRuns).toBe(2);
    expect(stats.totalSuccessfulExports).toBe(2);
    expect(stats.totalIterations).toBe(2);
    expect(stats.totalLiveFailures).toBe(0);
  });

  it("getStats tracks live failures separately from iterations", async () => {
    cadOperationDecoderEngine.proposeNextOp = (() => ({
      op: { kind: "feature_extrude", args: {} } as CADOperation,
      score: 0.7,
      source: "sequence_template" as const,
    })) as never;
    hyperCADSLiveBridgeEngine.extrude = (async () => ({
      ok: false,
      opId: "extrude",
      durationMs: 1,
      errorMessage: "x",
    })) as never;
    hyperCADSOutcomePublisherEngine.publishLiveResult = (() => ({
      ok: true,
      lineageId: "lin",
    })) as never;

    await engine.drawAnyPart({ intent: "ext", maxOps: 3, continueOnFailure: true });
    const stats = engine.getStats();
    expect(stats.totalRuns).toBe(1);
    expect(stats.totalSuccessfulExports).toBe(0);
    expect(stats.totalIterations).toBe(3);
    expect(stats.totalLiveFailures).toBe(3);
  });

  // ── _resetForTests ────────────────────────────────────────────────────────

  it("_resetForTests zeroes all counters", async () => {
    cadOperationDecoderEngine.proposeNextOp = (() => ({
      op: { kind: "export_step", args: {} } as CADOperation,
      score: 0.9,
      source: "intent_rule" as const,
    })) as never;
    hyperCADSLiveBridgeEngine.exportFile = (async () => ({
      ok: true,
      opId: "x",
      durationMs: 1,
    })) as never;
    hyperCADSOutcomePublisherEngine.publishLiveResult = (() => ({
      ok: true,
      lineageId: "lin",
    })) as never;

    await engine.drawAnyPart({ intent: "save" });
    expect(engine.getStats().totalRuns).toBe(1);
    engine._resetForTests();
    const reset = engine.getStats();
    expect(reset.totalRuns).toBe(0);
    expect(reset.totalSuccessfulExports).toBe(0);
    expect(reset.totalIterations).toBe(0);
    expect(reset.totalLiveFailures).toBe(0);
  });
});
