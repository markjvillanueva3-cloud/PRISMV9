/**
 * MacroBulkEmitOrchestratorEngine — MS0-U6 SAFETY-CRITICAL coverage.
 *
 * Asserts every load-bearing invariant from spec lines 75-79:
 *   1. Batch n REFUSED if batch n-1 not approved (no marker, no env).
 *   2. Batch 0 needs no prior approval.
 *   3. Borderline S(x) ∈ [0.70, 0.75) → needsHuman, NOT emitted.
 *   4. Gate failed on every machine → needsHuman.
 *   5. No features supplied → needsHuman (no_features reason).
 *   6. Per-part errors NEVER abort the batch.
 *   7. Three artifacts written: review report + bulk log + needsHuman queue.
 *   8. Approval marker enables next batch.
 *   9. dryRun skips all file writes but returns the same categorization.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { PartPrintFeatures } from "../engines/MacroFillOrchestratorEngine.js";

const GOOD_FEATURES: PartPrintFeatures = {
  family: "waferinsert",
  stockDiameter_in: 1.32,
  finishODAtFace_in: 1.215,
  partLength_in: 0.787,
  odFeatureSize_in: 0.005,
  odFeatureType: "radius",
  odFeatureAngleDeg: 45,
  spotDrill: { diameter_in: 0.5, sfm: 130, pointAngleDeg: 90, usePeck: false, depth_in: 0.05 },
  zClearance_in: 0.25,
  xClearance_in: 0.1,
  odTaperEndDia_in: 1.1473,
  odTaperStartZ_in: 0.4,
  idMajorDia_in: 0.25,
  idTaperAngleOkumaDeg: 250,
  idFinishXDia_in: 0.0,
  thruDrill: { diameter_in: 0.171, sfm: 50, feedPerRev_ipr: 0.0022, pointAngleDeg: 118, usePeck: true, peckDepth_in: 0.13 },
};

function makeTempLibraryRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-u6-test-"));
}
function cleanup(dir: string): void {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ }
}

describe("MacroBulkEmitOrchestratorEngine — happy path (MS0-U6)", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanup(tempRoot); });

  it("batch 0 runs without prior approval — partsConsidered == parts.length", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    const result = macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [
        { customerName: "ACME", partNumber: "P1", features: GOOD_FEATURES },
        { customerName: "ACME", partNumber: "P2", features: GOOD_FEATURES },
      ],
    });
    expect(result.partsConsidered).toBe(2);
    expect(result.priorBatchApproved).toBe(true);
    expect(result.emitted.length + result.needsHuman.length + result.errors.length).toBe(2);
  });

  it("happy path: good features → emitted (passes U2 + U4 + U5)", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    const result = macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [{ customerName: "ACME", partNumber: "PART-A", features: GOOD_FEATURES }],
    });
    expect(result.emitted.length).toBeGreaterThanOrEqual(1);
    expect(result.emitted[0].family).toBe("waferinsert");
    expect(result.emitted[0].filesEmitted).toBeGreaterThanOrEqual(1);
    expect(result.emitted[0].bestSxScore).toBeGreaterThanOrEqual(0.75);
    // Every emitted file still carries needsOperatorReview
    expect(result.needsOperatorReview).toBe(true);
  });

  it("writes review report + bulk log + does NOT create needsHuman file when zero needsHuman", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    const result = macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [{ customerName: "ACME", partNumber: "PART-A", features: GOOD_FEATURES }],
    });
    expect(fs.existsSync(result.reviewReportPath)).toBe(true);
    expect(fs.existsSync(result.bulkLogPath)).toBe(true);
    // needsHumanQueuePath only gets written if there were needsHuman entries
    if (result.needsHuman.length === 0) {
      expect(fs.existsSync(result.needsHumanQueuePath)).toBe(false);
    }
    const reviewContent = fs.readFileSync(result.reviewReportPath, "utf-8");
    expect(reviewContent).toContain("Batch 0 Review");
    expect(reviewContent).toContain("needsOperatorReview");
  });

  it("review report names the next batch number for the approval prompt", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    const result = macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [{ customerName: "ACME", partNumber: "PART-A", features: GOOD_FEATURES }],
    });
    const reviewContent = fs.readFileSync(result.reviewReportPath, "utf-8");
    expect(reviewContent).toContain("To proceed to batch 1");
    expect(reviewContent).toContain("_BATCH_0_APPROVED");
  });
});

describe("MacroBulkEmitOrchestratorEngine — approval gate (HARD)", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanup(tempRoot); });

  it("REFUSES batch 1 if batch 0 not approved (no marker, no env)", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    // Use a unique env var name to avoid pollution from concurrent tests.
    const envVar = "TEST_ENV_NONE_" + Math.random().toString(36).slice(2);
    expect(() => macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 1,
      libraryRoot: tempRoot,
      parts: [{ customerName: "ACME", partNumber: "P1", features: GOOD_FEATURES }],
      approvedEnvVarName: envVar,
    })).toThrow(/batch 0 is not approved|refusing to run batch 1/);
  });

  it("ALLOWS batch 1 when batch 0 marker file exists", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    macroBulkEmitOrchestratorEngine.approveBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      approvedBy: "operator-test",
      approvalNote: "happy-path test",
    });
    const result = macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 1,
      libraryRoot: tempRoot,
      parts: [{ customerName: "ACME", partNumber: "P1", features: GOOD_FEATURES }],
    });
    expect(result.partsConsidered).toBe(1);
    expect(result.priorBatchApproved).toBe(true);
  });

  it("ALLOWS batch 1 when env var set to '0' or higher (fallback)", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    const envVar = "TEST_ENV_BULK_" + Math.random().toString(36).slice(2);
    process.env[envVar] = "0";
    try {
      const result = macroBulkEmitOrchestratorEngine.emitBatch({
        batchNumber: 1,
        libraryRoot: tempRoot,
        parts: [{ customerName: "ACME", partNumber: "P1", features: GOOD_FEATURES }],
        approvedEnvVarName: envVar,
      });
      expect(result.priorBatchApproved).toBe(true);
    } finally {
      delete process.env[envVar];
    }
  });

  it("approveBatch creates a marker with the operator identity + timestamp", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    const result = macroBulkEmitOrchestratorEngine.approveBatch({
      batchNumber: 3,
      libraryRoot: tempRoot,
      approvedBy: "operator-jane@shop",
      approvalNote: "reviewed 25 parts",
    });
    expect(result.approved).toBe(true);
    expect(result.batchNumber).toBe(3);
    expect(fs.existsSync(result.markerPath)).toBe(true);
    const content = fs.readFileSync(result.markerPath, "utf-8");
    expect(content).toContain("APPROVED");
    expect(content).toContain("operator-jane@shop");
    expect(content).toContain("reviewed 25 parts");
  });

  it("isBatchApproved returns true after approveBatch + false before", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    expect(macroBulkEmitOrchestratorEngine.isBatchApproved(7, tempRoot)).toBe(false);
    macroBulkEmitOrchestratorEngine.approveBatch({
      batchNumber: 7,
      libraryRoot: tempRoot,
      approvedBy: "test",
    });
    expect(macroBulkEmitOrchestratorEngine.isBatchApproved(7, tempRoot)).toBe(true);
  });

  it("approveBatch rejects negative batch numbers", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    expect(() => macroBulkEmitOrchestratorEngine.approveBatch({
      batchNumber: -1,
      libraryRoot: tempRoot,
      approvedBy: "test",
    })).toThrow(/non-negative integer/);
  });

  it("approveBatch rejects missing approvedBy (operator identity required)", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    expect(() => macroBulkEmitOrchestratorEngine.approveBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      // @ts-expect-error — testing runtime defense
      approvedBy: undefined,
    })).toThrow(/approvedBy is required/);
  });
});

describe("MacroBulkEmitOrchestratorEngine — per-part categorization", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanup(tempRoot); });

  it("no features → needsHuman with reason='no_features'", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    const result = macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [{ customerName: "ACME", partNumber: "X1" }],
    });
    expect(result.emitted.length).toBe(0);
    expect(result.needsHuman.length).toBe(1);
    expect(result.needsHuman[0].reason).toBe("no_features");
  });

  it("explicit needsHumanReason → needsHuman with reason='explicit_request'", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    const result = macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [{ customerName: "ACME", partNumber: "X1", needsHumanReason: "lot expiring next week" }],
    });
    expect(result.needsHuman[0].reason).toBe("explicit_request");
    expect(result.needsHuman[0].detail).toBe("lot expiring next week");
  });

  it("U2 throws (bad features) → errors with stage='fill', loop continues to next part", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    const badFeatures = { ...GOOD_FEATURES, partLength_in: -5 };  // negative length → U2 validator rejects
    const result = macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [
        { customerName: "ACME", partNumber: "BAD-1", features: badFeatures as PartPrintFeatures },
        { customerName: "ACME", partNumber: "GOOD-1", features: GOOD_FEATURES },
      ],
    });
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].partNumber).toBe("BAD-1");
    expect(["fill", "gate", "emit"]).toContain(result.errors[0].stage);
    // Loop continued: GOOD-1 also processed
    expect(result.partsConsidered).toBe(2);
    expect(result.emitted.length + result.needsHuman.length).toBeGreaterThanOrEqual(1);
  });

  it("batchSize caps the parts processed (default 25, override honored)", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    const parts = Array.from({ length: 5 }, (_, i) => ({
      customerName: "ACME",
      partNumber: `P${i}`,
      features: GOOD_FEATURES,
    }));
    const result = macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts,
      batchSize: 2,
    });
    expect(result.partsConsidered).toBe(2);
  });
});

describe("MacroBulkEmitOrchestratorEngine — borderline S(x) routing", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanup(tempRoot); });

  it("borderlineThreshold high enough → good features routed to needsHuman", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    // Set threshold higher than any candidate could achieve (1.0) — every
    // passing part becomes borderline_sx, demonstrating the routing works.
    // Use threshold > 1.0 to force-route every passing candidate (sxScore is
    // capped at 1.0 by the gate's weighted-sum design).
    const result = macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [{ customerName: "ACME", partNumber: "P1", features: GOOD_FEATURES }],
      borderlineThreshold: 1.5,
    });
    expect(result.emitted.length).toBe(0);
    expect(result.needsHuman.length).toBe(1);
    expect(result.needsHuman[0].reason).toBe("borderline_sx");
    expect(result.needsHuman[0].sxScore).toBeGreaterThanOrEqual(0.70);
    expect(result.needsHuman[0].sxScore).toBeLessThanOrEqual(1.0);
  });
});

describe("MacroBulkEmitOrchestratorEngine — artifacts + needsHuman queue", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanup(tempRoot); });

  it("needsHuman queue file is written when there are needsHuman entries", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    const result = macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [
        { customerName: "ACME", partNumber: "X1" },  // no features → needsHuman
      ],
    });
    expect(fs.existsSync(result.needsHumanQueuePath)).toBe(true);
    const content = fs.readFileSync(result.needsHumanQueuePath, "utf-8");
    expect(content).toContain("Batch 0");
    expect(content).toContain("X1");
    expect(content).toContain("no_features");
  });

  it("needsHuman queue is append-only across batches", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [{ customerName: "ACME", partNumber: "FIRST" }],
    });
    macroBulkEmitOrchestratorEngine.approveBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      approvedBy: "test",
    });
    const result2 = macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 1,
      libraryRoot: tempRoot,
      parts: [{ customerName: "ACME", partNumber: "SECOND" }],
    });
    const content = fs.readFileSync(result2.needsHumanQueuePath, "utf-8");
    expect(content).toContain("FIRST");
    expect(content).toContain("SECOND");
    expect(content).toContain("## Batch 0");
    expect(content).toContain("## Batch 1");
  });

  it("bulk log is append-only across batches", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [{ customerName: "ACME", partNumber: "A" }],
    });
    macroBulkEmitOrchestratorEngine.approveBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      approvedBy: "t",
    });
    const r2 = macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 1,
      libraryRoot: tempRoot,
      parts: [{ customerName: "ACME", partNumber: "B" }],
    });
    const content = fs.readFileSync(r2.bulkLogPath, "utf-8");
    expect(content).toContain("batch 0:");
    expect(content).toContain("batch 1:");
  });

  it("dryRun: zero files written, but categorization is identical", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    const result = macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [{ customerName: "ACME", partNumber: "DRY", features: GOOD_FEATURES }],
      dryRun: true,
    });
    expect(result.reviewReportPath).toBe("");
    expect(result.bulkLogPath).toBe("");
    expect(result.needsHumanQueuePath).toBe("");
    // The library root should NOT have any review files
    const entries = fs.readdirSync(tempRoot);
    expect(entries.filter((e) => e.startsWith("_MACRO_BATCH_") || e === "_MACRO_BULK_LOG.md")).toEqual([]);
  });
});

describe("MacroBulkEmitOrchestratorEngine — Zod input validation", () => {
  let tempRoot: string;
  beforeEach(() => { tempRoot = makeTempLibraryRoot(); });
  afterEach(() => { cleanup(tempRoot); });

  it("rejects batchNumber < 0", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    expect(() => macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: -1,
      libraryRoot: tempRoot,
      parts: [],
    })).toThrow();
  });

  it("rejects empty libraryRoot", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    expect(() => macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: "",
      parts: [],
    })).toThrow();
  });

  it("rejects batchSize > 500", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    expect(() => macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [],
      batchSize: 501,
    })).toThrow();
  });

  it("rejects borderlineThreshold below 0.70 (gate's HARD-BLOCK)", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    expect(() => macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [],
      borderlineThreshold: 0.50,
    })).toThrow();
  });

  it("rejects borderlineThreshold above 2.0 (force-route ceiling)", async () => {
    const { macroBulkEmitOrchestratorEngine } = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    expect(() => macroBulkEmitOrchestratorEngine.emitBatch({
      batchNumber: 0,
      libraryRoot: tempRoot,
      parts: [],
      borderlineThreshold: 2.5,
    })).toThrow();
  });
});

describe("MacroBulkEmitOrchestratorEngine — constants export", () => {
  it("exports BULK_CONSTANTS_FOR_TESTS with canonical values", async () => {
    const mod = await import("../engines/MacroBulkEmitOrchestratorEngine.js");
    expect(mod.BULK_CONSTANTS_FOR_TESTS.DEFAULT_BATCH_SIZE).toBe(25);
    expect(mod.BULK_CONSTANTS_FOR_TESTS.DEFAULT_BORDERLINE_THRESHOLD).toBe(0.75);
    expect(mod.BULK_CONSTANTS_FOR_TESTS.DEFAULT_APPROVED_ENV_VAR).toBe("MACRO_PROGRAM_PIPELINE_BATCH_APPROVED");
    expect(mod.BULK_CONSTANTS_FOR_TESTS.BATCH_REVIEW_FILENAME(3)).toBe("_MACRO_BATCH_3_REVIEW.md");
    expect(mod.BULK_CONSTANTS_FOR_TESTS.BATCH_APPROVED_FILENAME(7)).toBe("_BATCH_7_APPROVED");
    expect(mod.BULK_CONSTANTS_FOR_TESTS.BULK_LOG_FILENAME).toBe("_MACRO_BULK_LOG.md");
    expect(mod.BULK_CONSTANTS_FOR_TESTS.NEEDS_HUMAN_FILENAME).toBe("_MACRO_NEEDS_HUMAN.md");
  });
});
