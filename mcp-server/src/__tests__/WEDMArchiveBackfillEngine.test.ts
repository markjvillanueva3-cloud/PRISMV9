/**
 * WEDMArchiveBackfillEngine tests — MS-P0.5-COORD U-P0.5-COORD-07
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { wedmArchiveBackfillEngine } from "../engines/WEDMArchiveBackfillEngine.js";
import { wedmBlackboardEngine } from "../engines/WEDMBlackboardEngine.js";
import { wedmReasoningTraceLedgerEngine } from "../engines/WEDMReasoningTraceLedgerEngine.js";
import { wedmNeuralFormulaFusionEngine } from "../engines/WEDMNeuralFormulaFusionEngine.js";

function writeBatchAnalysis(tempDir: string, programs: any[]): string {
  const p = path.join(tempDir, "WEDM_BATCH_ANALYSIS.json");
  const body = {
    schemaVersion: "1.0.0",
    analysisId: "test-batch",
    timestamp: new Date().toISOString(),
    totalProgramsAnalyzed: programs.length,
    programs,
  };
  fs.writeFileSync(p, JSON.stringify(body), "utf8");
  return p;
}

function sampleProgram(overrides: Record<string, any> = {}): any {
  return {
    filePath: "H:\\PRISM\\JM DIE\\WIRE EDM\\SAMPLE.NC",
    fileName: "SAMPLE.NC",
    customerName: "ALCOA",
    dialect: "mitsubishi",
    eCodes: ["E1221"],
    feedRates: [0.2, 0.24, 0.21],
    passCount: 3,
    qualityScore: 85,
    estimatedThicknessCategory: "thin",
    wireBreakRiskLevel: "medium",
    hasAdaptiveControl: true,
    hasMultiPass: true,
    ...overrides,
  };
}

describe("WEDMArchiveBackfillEngine", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wedm-backfill-"));
    wedmArchiveBackfillEngine.resetForTests();
    wedmArchiveBackfillEngine.overrideStatePathForTests(
      path.join(tempDir, "WEDM_BACKFILL_STATE.json"),
    );
    wedmBlackboardEngine.resetForTests();
    wedmReasoningTraceLedgerEngine.resetForTests();
    wedmNeuralFormulaFusionEngine.resetForTests();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe("run", () => {
    it("returns zero-counts when batch analysis missing", () => {
      const r = wedmArchiveBackfillEngine.run({
        batchAnalysisPath: path.join(tempDir, "does-not-exist.json"),
      });
      expect(r.programsConsidered).toBe(0);
      expect(r.programsBackfilled).toBe(0);
      expect(r.skippedReasons["batch-analysis-missing"]).toBe(1);
    });

    it("backfills programs into blackboard", () => {
      const bp = writeBatchAnalysis(tempDir, [sampleProgram()]);
      const r = wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp });
      expect(r.programsBackfilled).toBe(1);
      expect(r.blackboardEntriesPosted).toBeGreaterThan(0);
    });

    it("records ledger entries for each program", () => {
      const bp = writeBatchAnalysis(tempDir, [sampleProgram()]);
      const before = wedmReasoningTraceLedgerEngine.getStats().totalTraces;
      const r = wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp });
      const after = wedmReasoningTraceLedgerEngine.getStats().totalTraces;
      expect(after - before).toBe(r.ledgerEntriesRecorded);
      expect(r.ledgerEntriesRecorded).toBe(1);
    });

    it("seeds neural fusion observations from historical feed rates", () => {
      const bp = writeBatchAnalysis(tempDir, [sampleProgram()]);
      const r = wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp });
      expect(r.formulaObservationsSeeded).toBe(1);
      const stats = wedmNeuralFormulaFusionEngine.getStats();
      expect(stats.totalObservations).toBe(1);
    });

    it("skips programs missing feedRates from formula seeding", () => {
      const bp = writeBatchAnalysis(tempDir, [
        sampleProgram({ feedRates: [], passCount: 3 }),
      ]);
      const r = wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp });
      expect(r.formulaObservationsSeeded).toBe(0);
    });

    it("posts a wire-break-risk warning when risk is medium or high", () => {
      const bp = writeBatchAnalysis(tempDir, [
        sampleProgram({ wireBreakRiskLevel: "high" }),
      ]);
      wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp });
      const warnings = wedmBlackboardEngine.readAllInNamespace(
        "wedm.archive.mat.tool-steel",
      ).filter((e) => e.tag === "warning");
      expect(warnings.length).toBeGreaterThan(0);
    });

    it("does NOT post a wire-break warning when risk is low", () => {
      const bp = writeBatchAnalysis(tempDir, [
        sampleProgram({ wireBreakRiskLevel: "low" }),
      ]);
      wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp });
      const warnings = wedmBlackboardEngine.readAllInNamespace(
        "wedm.archive.mat.tool-steel",
      ).filter((e) => e.tag === "warning");
      expect(warnings.length).toBe(0);
    });

    it("honors limit option", () => {
      const bp = writeBatchAnalysis(tempDir, [
        sampleProgram({ filePath: "a.NC", fileName: "a.NC" }),
        sampleProgram({ filePath: "b.NC", fileName: "b.NC" }),
        sampleProgram({ filePath: "c.NC", fileName: "c.NC" }),
      ]);
      const r = wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp, limit: 2 });
      expect(r.programsConsidered).toBe(2);
      expect(r.programsBackfilled).toBe(2);
    });

    it("is idempotent — second run skips already-backfilled paths", () => {
      const bp = writeBatchAnalysis(tempDir, [
        sampleProgram({ filePath: "a.NC", fileName: "a.NC" }),
      ]);
      const r1 = wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp });
      const r2 = wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp });
      expect(r1.programsBackfilled).toBe(1);
      expect(r2.programsBackfilled).toBe(0);
      expect(r2.skippedReasons["already-backfilled"]).toBe(1);
    });

    it("dryRun does NOT persist state or post to blackboard", () => {
      const bp = writeBatchAnalysis(tempDir, [sampleProgram()]);
      const r = wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp, dryRun: true });
      expect(r.programsBackfilled).toBe(1);
      expect(r.blackboardEntriesPosted).toBe(0);
      expect(r.ledgerEntriesRecorded).toBe(0);
      expect(
        wedmArchiveBackfillEngine.hasBeenBackfilled(
          "H:\\PRISM\\JM DIE\\WIRE EDM\\SAMPLE.NC",
        ),
      ).toBe(false);
    });

    it("tracks customers and dialects covered", () => {
      const bp = writeBatchAnalysis(tempDir, [
        sampleProgram({
          filePath: "a.NC",
          fileName: "a.NC",
          customerName: "ALCOA",
          dialect: "mitsubishi",
        }),
        sampleProgram({
          filePath: "b.NC",
          fileName: "b.NC",
          customerName: "ITW",
          dialect: "mitsubishi",
        }),
        sampleProgram({
          filePath: "c.NC",
          fileName: "c.NC",
          customerName: "ALCOA",
          dialect: "agie",
        }),
      ]);
      const r = wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp });
      expect(r.customersCovered).toBe(2);
      expect(r.dialectsCovered).toBe(2);
    });

    it("classifies material from customer/filename hints", () => {
      const bp = writeBatchAnalysis(tempDir, [
        sampleProgram({
          filePath: "d2.NC",
          fileName: "BLANK D2 TOOL.NC",
          customerName: "X",
        }),
      ]);
      wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp });
      const d2 = wedmBlackboardEngine.readAllInNamespace("wedm.archive.mat.d2");
      expect(d2.length).toBeGreaterThan(0);
    });
  });

  describe("state persistence", () => {
    it("persists completed run IDs across reload", () => {
      const statePath = path.join(tempDir, "persist.json");
      wedmArchiveBackfillEngine.overrideStatePathForTests(statePath);
      const bp = writeBatchAnalysis(tempDir, [sampleProgram()]);
      wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp });
      expect(fs.existsSync(statePath)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(statePath, "utf8"));
      expect(parsed.completedRunIds.length).toBe(1);
      expect(parsed.totals.runs).toBe(1);
    });

    it("hasBeenBackfilled reflects runs", () => {
      const bp = writeBatchAnalysis(tempDir, [
        sampleProgram({ filePath: "unique.NC", fileName: "unique.NC" }),
      ]);
      expect(wedmArchiveBackfillEngine.hasBeenBackfilled("unique.NC")).toBe(false);
      wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp });
      expect(wedmArchiveBackfillEngine.hasBeenBackfilled("unique.NC")).toBe(true);
    });
  });

  describe("getState", () => {
    it("returns zero-totals for fresh engine", () => {
      const s = wedmArchiveBackfillEngine.getState();
      expect(s.totals.runs).toBe(0);
      expect(s.totals.programs).toBe(0);
    });

    it("accumulates totals after runs", () => {
      const bp = writeBatchAnalysis(tempDir, [
        sampleProgram({ filePath: "a.NC", fileName: "a.NC" }),
        sampleProgram({ filePath: "b.NC", fileName: "b.NC" }),
      ]);
      wedmArchiveBackfillEngine.run({ batchAnalysisPath: bp });
      const s = wedmArchiveBackfillEngine.getState();
      expect(s.totals.programs).toBe(2);
      expect(s.totals.runs).toBe(1);
    });
  });
});
