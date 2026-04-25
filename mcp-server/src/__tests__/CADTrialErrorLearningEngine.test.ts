import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CADTrialErrorLearningEngine,
  type RegenerationOutcome,
} from "../engines/CADTrialErrorLearningEngine.js";

function makeOutcome(overrides: Partial<RegenerationOutcome> = {}): RegenerationOutcome {
  return {
    testId: "T-" + Math.random().toString(36).slice(2, 10),
    originalPath: "/parts/example.step",
    status: "pass",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("CADTrialErrorLearningEngine", () => {
  let engine: CADTrialErrorLearningEngine;

  beforeEach(() => {
    engine = new CADTrialErrorLearningEngine(null);
  });

  describe("ingest", () => {
    it("ingests a passing outcome and produces no failure categories", () => {
      const r = engine.ingest(makeOutcome({ status: "pass" }));
      expect(r.recorded).toBe(true);
      expect(r.categories).toEqual([]);
      expect(r.warning).toEqual(undefined);
    });

    it("classifies volume_mismatch from failing volume metric", () => {
      const r = engine.ingest(
        makeOutcome({
          status: "fail",
          metrics: { volume: { passed: false, deviationPct: 12 } },
        })
      );
      expect(r.recorded).toBe(true);
      expect(r.categories).toEqual(["volume_mismatch"]);
    });

    it("classifies bbox_mismatch when bboxY fails", () => {
      const r = engine.ingest(
        makeOutcome({
          status: "fail",
          metrics: { bboxY: { passed: false, deviationPct: 8 } },
        })
      );
      expect(r.categories).toEqual(["bbox_mismatch"]);
    });

    it("emits both categories when volume and topology both fail", () => {
      const r = engine.ingest(
        makeOutcome({
          status: "fail",
          metrics: {
            volume: { passed: false, deviationPct: 20 },
            topology: { passed: false },
          },
        })
      );
      expect(r.categories.sort()).toEqual(["topology_mismatch", "volume_mismatch"]);
    });

    it("classifies feature_count_mismatch and topology_mismatch independently", () => {
      const r1 = engine.ingest(
        makeOutcome({
          status: "fail",
          metrics: { featureCount: { passed: false, deviationPct: 25 } },
        })
      );
      const r2 = engine.ingest(
        makeOutcome({
          status: "fail",
          metrics: { topology: { passed: false } },
        })
      );
      expect(r1.categories).toEqual(["feature_count_mismatch"]);
      expect(r2.categories).toEqual(["topology_mismatch"]);
    });

    it("classifies error status as code_error", () => {
      const r = engine.ingest(makeOutcome({ status: "error", error: "syntax error in .py" }));
      expect(r.categories).toEqual(["code_error"]);
    });

    it("classifies fail with no specific metric as unknown", () => {
      const r = engine.ingest(makeOutcome({ status: "fail" }));
      expect(r.categories).toEqual(["unknown"]);
    });

    it("rejects invalid outcomes with a warning", () => {
      const r = engine.ingest({ testId: 123, status: "pass" });
      expect(r.recorded).toBe(false);
      expect(r.warning).toMatch(/Invalid/);
    });

    it("rejects outcomes with missing required fields", () => {
      const r = engine.ingest({ testId: "T1", status: "fail" });
      expect(r.recorded).toBe(false);
    });
  });

  describe("ingestBatch", () => {
    it("processes multiple outcomes and reports counts", () => {
      const batch = [
        makeOutcome({ status: "pass" }),
        makeOutcome({ status: "fail", metrics: { volume: { passed: false } } }),
        { invalid: true },
      ];
      const r = engine.ingestBatch(batch);
      expect(r.total).toBe(3);
      expect(r.recorded).toBe(2);
      expect(r.skipped).toBe(1);
      expect(r.results.length).toBe(3);
      expect(r.results[2].recorded).toBe(false);
    });
  });

  describe("extractPatterns", () => {
    it("returns empty when no data ingested", () => {
      expect(engine.extractPatterns()).toEqual([]);
    });

    it("returns posterior failure rates with shrinkage confidence", () => {
      for (let i = 0; i < 8; i++) {
        engine.ingest(
          makeOutcome({
            status: "fail",
            metrics: { volume: { passed: false, deviationPct: 15 } },
            error: "vol-fail-" + i,
          })
        );
      }
      for (let i = 0; i < 2; i++) {
        engine.ingest(makeOutcome({ status: "pass" }));
      }
      const patterns = engine.extractPatterns();
      const vol = patterns.find((p) => p.category === "volume_mismatch");
      expect(vol).toMatchObject({
        category: "volume_mismatch",
        failures: 8,
        successes: 2,
      });
      // Posterior mean = (8+1)/(10+2) = 0.75
      expect(vol!.failureRate).toBeCloseTo(0.75, 2);
      // Confidence = 10/(10+10) = 0.5
      expect(vol!.confidence).toBeCloseTo(0.5, 2);
      expect(vol!.exampleErrors.length).toBe(5);
      expect(vol!.exampleErrors[0]).toMatch(/vol-fail-/);
    });

    it("sorts patterns by rate × confidence descending", () => {
      for (let i = 0; i < 16; i++) {
        engine.ingest(
          makeOutcome({
            status: "fail",
            metrics: { topology: { passed: false } },
          })
        );
      }
      for (let i = 0; i < 2; i++) {
        engine.ingest(
          makeOutcome({
            status: "fail",
            metrics: { volume: { passed: false } },
          })
        );
      }
      const patterns = engine.extractPatterns();
      expect(patterns[0].category).toBe("topology_mismatch");
      expect(patterns[0].failureRate * patterns[0].confidence).toBeGreaterThan(
        patterns[1].failureRate * patterns[1].confidence
      );
    });
  });

  describe("recommendAdjustments", () => {
    it("returns uninformed 0.5 risk with empty data", () => {
      const r = engine.recommendAdjustments({ partType: "bracket" });
      expect(r.riskScore).toBeCloseTo(0.5, 2);
      expect(r.confidence).toBe(0);
      expect(r.suggestions).toEqual([]);
      expect(r.sampleSize).toBe(0);
    });

    it("scores risk from partType slice when available", () => {
      for (let i = 0; i < 8; i++) {
        engine.ingest(
          makeOutcome({
            status: "fail",
            partType: "bracket",
            metrics: { volume: { passed: false } },
          })
        );
      }
      for (let i = 0; i < 2; i++) {
        engine.ingest(makeOutcome({ status: "pass", partType: "bracket" }));
      }
      const r = engine.recommendAdjustments({ partType: "bracket" });
      // partType bracket: (8+1)/(10+2) = 0.75
      expect(r.riskScore).toBeCloseTo(0.75, 2);
      // confidence 10/(10+10) = 0.5
      expect(r.confidence).toBeCloseTo(0.5, 2);
      expect(r.sampleSize).toBe(10);
    });

    it("falls back to global rate when slice has no data", () => {
      for (let i = 0; i < 5; i++) engine.ingest(makeOutcome({ status: "fail", partType: "shaft" }));
      for (let i = 0; i < 5; i++) engine.ingest(makeOutcome({ status: "pass", partType: "shaft" }));
      const r = engine.recommendAdjustments({ partType: "unknown_type" });
      // global: (5+1)/(10+2) = 0.5
      expect(r.riskScore).toBeCloseTo(0.5, 2);
      expect(r.sampleSize).toBe(10);
    });

    it("emits a topology suggestion when topology fails ≥25% of the time", () => {
      for (let i = 0; i < 12; i++) {
        engine.ingest(
          makeOutcome({
            status: "fail",
            metrics: { topology: { passed: false } },
            error: "topo error " + i,
          })
        );
      }
      const r = engine.recommendAdjustments({ partType: "blade" });
      const topoSuggestion = r.suggestions.find((s) => s.category === "topology_mismatch");
      expect(topoSuggestion?.action).toMatch(/fillet|topology|sequencing/i);
      expect(topoSuggestion?.expectedRiskReduction).toBeGreaterThan(0);
      expect(topoSuggestion?.expectedRiskReduction).toBeLessThanOrEqual(1);
    });

    it("recommends alternate generator when one fails >40% with n≥5", () => {
      for (let i = 0; i < 10; i++) {
        engine.ingest(
          makeOutcome({
            status: "fail",
            generator: "freecad",
            metrics: { volume: { passed: false } },
          })
        );
      }
      const r = engine.recommendAdjustments({ generator: "freecad" });
      const altSuggestion = r.suggestions.find((s) => /alternate generator/i.test(s.action));
      expect(altSuggestion?.action).toContain("freecad");
      expect(altSuggestion?.category).toBe("unknown");
    });

    it("does not emit suggestions when failure rates are below threshold", () => {
      for (let i = 0; i < 1; i++) {
        engine.ingest(makeOutcome({ status: "fail", metrics: { volume: { passed: false } } }));
      }
      for (let i = 0; i < 19; i++) {
        engine.ingest(makeOutcome({ status: "pass" }));
      }
      const r = engine.recommendAdjustments({ partType: "low-risk" });
      expect(r.suggestions.filter((s) => s.category === "volume_mismatch")).toEqual([]);
    });
  });

  describe("getFailureStats", () => {
    it("aggregates totals and per-category rates", () => {
      engine.ingest(makeOutcome({ status: "pass", partType: "A" }));
      engine.ingest(
        makeOutcome({
          status: "fail",
          partType: "A",
          metrics: { bboxX: { passed: false, deviationPct: 10 } },
        })
      );
      engine.ingest(makeOutcome({ status: "error", partType: "A", error: "exec failed" }));
      const stats = engine.getFailureStats();
      expect(stats).toMatchObject({
        totalIngested: 3,
        totalFailures: 1,
        totalSuccesses: 1,
        totalErrors: 1,
      });
      expect(stats.byCategory.bbox_mismatch?.failures).toBe(1);
      expect(stats.byCategory.code_error?.failures).toBe(1);
      expect(stats.byPartType.A.failures + stats.byPartType.A.successes).toBe(3);
    });

    it("filters by since timestamp", () => {
      engine.ingest(makeOutcome({ status: "pass", timestamp: "2026-01-01T00:00:00Z" }));
      engine.ingest(makeOutcome({ status: "pass", timestamp: "2026-04-01T00:00:00Z" }));
      const stats = engine.getFailureStats({ since: "2026-02-01T00:00:00Z" });
      expect(stats.totalIngested).toBe(1);
    });

    it("filters by partType", () => {
      engine.ingest(makeOutcome({ status: "pass", partType: "X" }));
      engine.ingest(makeOutcome({ status: "pass", partType: "Y" }));
      const stats = engine.getFailureStats({ partType: "X" });
      expect(stats.totalIngested).toBe(1);
      expect(stats.byPartType).toEqual({
        X: { failures: 0, successes: 1, rate: expect.any(Number) },
      });
    });
  });

  describe("reset", () => {
    it("clears in-memory state", () => {
      engine.ingest(makeOutcome({ status: "fail", metrics: { volume: { passed: false } } }));
      engine.reset();
      expect(engine.extractPatterns()).toEqual([]);
      expect(engine.getFailureStats().totalIngested).toBe(0);
    });
  });

  describe("persistence", () => {
    let tmpDir: string;
    let ledgerPath: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cad-trial-"));
      ledgerPath = path.join(tmpDir, "ledger.jsonl");
    });

    afterEach(() => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    });

    it("appends to JSONL ledger and rebuilds state on reload", () => {
      const e1 = new CADTrialErrorLearningEngine(ledgerPath);
      e1.ingest(
        makeOutcome({
          status: "fail",
          partType: "bracket",
          metrics: { volume: { passed: false, deviationPct: 18 } },
          error: "vol fail",
        })
      );
      e1.ingest(makeOutcome({ status: "pass", partType: "bracket" }));

      expect(fs.existsSync(ledgerPath)).toBe(true);
      const lines = fs.readFileSync(ledgerPath, "utf8").trim().split("\n");
      expect(lines.length).toBe(2);

      const e2 = new CADTrialErrorLearningEngine(ledgerPath);
      const stats = e2.getFailureStats();
      expect(stats).toMatchObject({
        totalIngested: 2,
        totalFailures: 1,
        totalSuccesses: 1,
      });
    });

    it("skips malformed lines on load", () => {
      fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
      fs.writeFileSync(
        ledgerPath,
        [
          JSON.stringify(makeOutcome({ status: "pass" })),
          "{not json",
          JSON.stringify(makeOutcome({ status: "fail", metrics: { topology: { passed: false } } })),
          "",
        ].join("\n"),
        "utf8"
      );
      const e = new CADTrialErrorLearningEngine(ledgerPath);
      const result = e.loadFromDisk();
      expect(result.loaded).toBe(2);
      expect(result.skipped).toBe(1);
    });

    it("eraseLedger option removes the ledger file", () => {
      const e = new CADTrialErrorLearningEngine(ledgerPath);
      e.ingest(makeOutcome({ status: "pass" }));
      expect(fs.existsSync(ledgerPath)).toBe(true);
      e.reset({ eraseLedger: true });
      expect(fs.existsSync(ledgerPath)).toBe(false);
    });

    it("setLedgerPath redirects future appends", () => {
      const e = new CADTrialErrorLearningEngine(null);
      e.ingest(makeOutcome({ status: "pass" }));
      e.setLedgerPath(ledgerPath);
      e.ingest(makeOutcome({ status: "fail", metrics: { volume: { passed: false } } }));
      expect(fs.existsSync(ledgerPath)).toBe(true);
      const lines = fs.readFileSync(ledgerPath, "utf8").trim().split("\n");
      expect(lines.length).toBe(1);
    });
  });

  describe("statistical properties", () => {
    it("posterior rate approaches MLE as sample size grows", () => {
      for (let i = 0; i < 70; i++) {
        engine.ingest(
          makeOutcome({
            status: "fail",
            metrics: { volume: { passed: false } },
          })
        );
      }
      for (let i = 0; i < 30; i++) {
        engine.ingest(makeOutcome({ status: "pass" }));
      }
      const patterns = engine.extractPatterns();
      const vol = patterns.find((p) => p.category === "volume_mismatch")!;
      // posterior = (70+1)/(100+2) = 71/102
      expect(vol.failureRate).toBeCloseTo(71 / 102, 3);
      // confidence n/(n+κ) = 100/110
      expect(vol.confidence).toBeCloseTo(100 / 110, 3);
    });

    it("confidence is low for tiny sample sizes", () => {
      engine.ingest(
        makeOutcome({
          status: "fail",
          metrics: { volume: { passed: false } },
        })
      );
      const patterns = engine.extractPatterns();
      const vol = patterns.find((p) => p.category === "volume_mismatch")!;
      // n=1, κ=10 → 1/11
      expect(vol.confidence).toBeCloseTo(1 / 11, 3);
    });
  });
});
