import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CADTrialErrorLearningEngine,
  resolveDefaultLedgerPath,
  type RegenerationOutcome,
  type TribalAdvice,
  type TribalTipProvider,
} from "../engines/CADTrialErrorLearningEngine.js";
import { cadTribalDrawInjectionEngine } from "../engines/CADTribalDrawInjectionEngine.js";
import { CAD_DRAW_TRIBAL_TIPS } from "../data/cadDrawTribalTips.js";

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

  describe("getFailureStats byCategory rate (U-CAD-LEARN-STATS-RATE-FIX)", () => {
    it("credits successes per-category so the rate is not inflated (and matches extractPatterns)", () => {
      // 1 volume failure + 10 passes on the same corpus
      engine.ingest(makeOutcome({ status: "fail", metrics: { volume: { passed: false, deviationPct: 9 } } }));
      for (let i = 0; i < 10; i++) engine.ingest(makeOutcome({ status: "pass" }));

      const stats = engine.getFailureStats();
      const vol = stats.byCategory.volume_mismatch;
      expect(vol.failures).toBe(1);
      expect(vol.successes).toBe(10); // BUG was 0 (passes never credited per-category)
      // posterior (1+1)/(11+2) = 2/13 ~ 0.154, NOT the inflated (1+1)/(1+2) = 0.667
      expect(vol.rate).toBeCloseTo(2 / 13, 3);
      expect(vol.rate).toBeLessThan(0.2);

      // cross-consumer consistency: stats rate == extractPatterns posterior on the SAME data
      const pat = engine.extractPatterns().find((p) => p.category === "volume_mismatch")!;
      expect(vol.rate).toBeCloseTo(pat.failureRate, 6);
    });

    it("a pass-only corpus gives the all-success rate floor (1/(n+2)), never the inflated 0.5+", () => {
      for (let i = 0; i < 8; i++) engine.ingest(makeOutcome({ status: "pass" }));
      const topo = engine.getFailureStats().byCategory.topology_mismatch;
      expect(topo.failures).toBe(0);
      expect(topo.successes).toBe(8);
      expect(topo.rate).toBeCloseTo(1 / 10, 3); // (0+1)/(8+2)
    });

    it("byPartType slice (already credited both) stays consistent with the category fix", () => {
      engine.ingest(makeOutcome({ status: "fail", partType: "bracket", metrics: { topology: { passed: false } } }));
      for (let i = 0; i < 4; i++) engine.ingest(makeOutcome({ status: "pass", partType: "bracket" }));
      const bracket = engine.getFailureStats().byPartType.bracket;
      expect(bracket.failures).toBe(1);
      expect(bracket.successes).toBe(4);
      expect(bracket.rate).toBeCloseTo(2 / 7, 3); // (1+1)/(5+2)
    });
  });

  describe("features as a learning signal (U-CAD-LEARN-FEATURE-SIGNAL)", () => {
    it("risk-scores a candidate by its features (previously accepted but INERT)", () => {
      // feature "risky" always fails; feature "safe" always passes; global is 50/50
      for (let i = 0; i < 5; i++) engine.ingest(makeOutcome({ status: "fail", features: ["risky"], metrics: { volume: { passed: false } } }));
      for (let i = 0; i < 5; i++) engine.ingest(makeOutcome({ status: "pass", features: ["safe"] }));

      const risky = engine.recommendAdjustments({ features: ["risky"] });
      const safe = engine.recommendAdjustments({ features: ["safe"] });

      // risky feature posterior (5+1)/(5+2)=6/7~0.857; safe (0+1)/(5+2)=1/7~0.143
      expect(risky.riskScore).toBeGreaterThan(0.7);
      expect(safe.riskScore).toBeLessThan(0.3);
      // the feature dimension genuinely separates risk (would be EQUAL global=0.5 on the old inert code)
      expect(risky.riskScore).toBeGreaterThan(safe.riskScore + 0.4);
    });

    it("averages multiple candidate features (balanced features -> mid risk)", () => {
      for (let i = 0; i < 5; i++) engine.ingest(makeOutcome({ status: "fail", features: ["risky"], metrics: { volume: { passed: false } } }));
      for (let i = 0; i < 5; i++) engine.ingest(makeOutcome({ status: "pass", features: ["safe"] }));
      const both = engine.recommendAdjustments({ features: ["risky", "safe"] });
      // equal-confidence slices (n=5 each) -> ~midpoint of 6/7 and 1/7
      expect(both.riskScore).toBeGreaterThan(0.35);
      expect(both.riskScore).toBeLessThan(0.65);
    });

    it("reset() clears the feature signal", () => {
      for (let i = 0; i < 5; i++) engine.ingest(makeOutcome({ status: "fail", features: ["risky"], metrics: { volume: { passed: false } } }));
      engine.reset();
      // no history -> uninformed prior 0.5, not the stale 0.857
      expect(engine.recommendAdjustments({ features: ["risky"] }).riskScore).toBeCloseTo(0.5, 6);
    });

    it("feature totals survive a ledger replay (durable across restart)", () => {
      const ledger = path.join(os.tmpdir(), `cad-feat-${Math.random().toString(36).slice(2)}.jsonl`);
      try {
        const e1 = new CADTrialErrorLearningEngine(ledger);
        for (let i = 0; i < 5; i++) e1.ingest(makeOutcome({ status: "fail", features: ["risky"], metrics: { volume: { passed: false } } }));
        for (let i = 0; i < 5; i++) e1.ingest(makeOutcome({ status: "pass", features: ["safe"] }));
        // fresh engine replays the ledger -> the per-FEATURE signal must be rebuilt, not
        // collapsed to the global rate. Isolation: risky >> safe ONLY if featureTotals replays
        // (if loadFromDisk dropped featureTotals, both fall to global ~0.5 and this fails).
        const e2 = new CADTrialErrorLearningEngine(ledger);
        const risky = e2.recommendAdjustments({ features: ["risky"] }).riskScore;
        const safe = e2.recommendAdjustments({ features: ["safe"] }).riskScore;
        expect(risky).toBeGreaterThan(0.7);
        expect(safe).toBeLessThan(0.3);
        expect(risky).toBeGreaterThan(safe + 0.4);
      } finally {
        if (fs.existsSync(ledger)) fs.unlinkSync(ledger);
      }
    });
  });

  describe("getLearningTrend -- loop-health observability (U-CAD-LEARN-TREND)", () => {
    it("reports improving when the recent corpus half fails less than the early half", () => {
      for (let i = 0; i < 4; i++) engine.ingest(makeOutcome({ status: "fail", timestamp: `2026-01-0${i + 1}T00:00:00Z`, metrics: { volume: { passed: false } } }));
      for (let i = 0; i < 4; i++) engine.ingest(makeOutcome({ status: "pass", timestamp: `2026-02-0${i + 1}T00:00:00Z` }));
      const t = engine.getLearningTrend();
      expect(t.sufficientData).toBe(true);
      expect(t.earlyFailureRate).toBeCloseTo(5 / 6, 3); // (4+1)/(4+2)
      expect(t.recentFailureRate).toBeCloseTo(1 / 6, 3); // (0+1)/(4+2)
      expect(t.delta).toBeLessThan(0);
      expect(t.improving).toBe(true);
    });

    it("reports NOT improving when the recent half regresses", () => {
      for (let i = 0; i < 4; i++) engine.ingest(makeOutcome({ status: "pass", timestamp: `2026-01-0${i + 1}T00:00:00Z` }));
      for (let i = 0; i < 4; i++) engine.ingest(makeOutcome({ status: "fail", timestamp: `2026-02-0${i + 1}T00:00:00Z`, metrics: { volume: { passed: false } } }));
      const t = engine.getLearningTrend();
      expect(t.improving).toBe(false);
      expect(t.delta).toBeGreaterThan(0);
    });

    it("flags insufficientData on an empty or single-outcome corpus", () => {
      expect(engine.getLearningTrend().sufficientData).toBe(false);
      engine.ingest(makeOutcome({ status: "fail", metrics: { volume: { passed: false } } }));
      // n=1 -> mid=0 -> early half empty -> still insufficient
      expect(engine.getLearningTrend().sufficientData).toBe(false);
      expect(engine.getLearningTrend().improving).toBe(false);
    });
  });

  describe("recordRecommendation + getLoopEfficacy -- closed-loop attribution (U-CAD-LEARN-LOOP-CLOSURE)", () => {
    it("recordRecommendation returns an auto-assigned id + the recommendation", () => {
      const { recommendationId, recommendation } = engine.recordRecommendation({ partType: "bracket" });
      expect(recommendationId).toBe("rec_0"); // fresh engine (beforeEach) -> deterministic
      expect(recommendation.candidate.partType).toBe("bracket");
      expect(typeof recommendation.riskScore).toBe("number");
    });

    it("auto-assigned ids increment per issued recommendation", () => {
      expect(engine.recordRecommendation({}).recommendationId).toBe("rec_0");
      expect(engine.recordRecommendation({}).recommendationId).toBe("rec_1");
      expect(engine.getLoopEfficacy().issued).toBe(2);
    });

    it("honors a caller-supplied id and is idempotent on a colliding id (no double-count)", () => {
      const a = engine.recordRecommendation({ partType: "x" }, { recommendationId: "custom-1" });
      expect(a.recommendationId).toBe("custom-1");
      engine.recordRecommendation({ partType: "x" }, { recommendationId: "custom-1" }); // re-issue same id
      expect(engine.getLoopEfficacy().issued).toBe(1);
    });

    it("attributes an outcome back to its recommendation via recommendationId", () => {
      const { recommendationId } = engine.recordRecommendation({ partType: "bracket" });
      let eff = engine.getLoopEfficacy();
      expect(eff.issued).toBe(1);
      expect(eff.attributed).toBe(0);
      expect(eff.pending).toBe(1);
      engine.ingest(makeOutcome({ status: "pass", recommendationId }));
      eff = engine.getLoopEfficacy();
      expect(eff.attributed).toBe(1);
      expect(eff.pending).toBe(0);
    });

    it("attributeOutcome closes the loop in one call", () => {
      const { recommendationId } = engine.recordRecommendation({ partType: "y" });
      engine.attributeOutcome(recommendationId, makeOutcome({ status: "fail", metrics: { volume: { passed: false } } }));
      expect(engine.getLoopEfficacy().attributed).toBe(1);
    });

    it("first-write-wins: a second outcome for the same recommendation does not re-attribute", () => {
      const { recommendationId } = engine.recordRecommendation({});
      engine.ingest(makeOutcome({ status: "pass", recommendationId }));
      engine.ingest(makeOutcome({ status: "fail", recommendationId, metrics: { volume: { passed: false } } }));
      expect(engine.getLoopEfficacy().attributed).toBe(1); // only the first linked
    });

    it("lift: followed outcomes failing less than baseline -> positive lift + helping", () => {
      // baseline arm: 4 fails citing NO recommendation
      for (let i = 0; i < 4; i++) engine.ingest(makeOutcome({ status: "fail", metrics: { volume: { passed: false } } }));
      // followed arm: 4 recommendations each followed by a passing outcome
      for (let i = 0; i < 4; i++) {
        const { recommendationId } = engine.recordRecommendation({});
        engine.ingest(makeOutcome({ status: "pass", recommendationId }));
      }
      const eff = engine.getLoopEfficacy();
      expect(eff.sufficientData).toBe(true); // both arms >= MIN_EFFICACY_SAMPLES(3)
      expect(eff.baselineFailureRate).toBeCloseTo(5 / 6, 6); // (4+1)/(4+2)
      expect(eff.followedFailureRate).toBeCloseTo(1 / 6, 6); // (0+1)/(4+2)
      expect(eff.lift).toBeGreaterThan(0);
      expect(eff.helping).toBe(true);
      expect(eff.followedSampleSize).toBe(4);
      expect(eff.baselineSampleSize).toBe(4);
    });

    it("helping=false on insufficient data even when lift is positive", () => {
      engine.ingest(makeOutcome({ status: "fail", metrics: { volume: { passed: false } } })); // 1 baseline
      const { recommendationId } = engine.recordRecommendation({});
      engine.ingest(makeOutcome({ status: "pass", recommendationId })); // 1 followed
      const eff = engine.getLoopEfficacy();
      expect(eff.lift).toBeGreaterThan(0);
      expect(eff.sufficientData).toBe(false); // arms < 3
      expect(eff.helping).toBe(false);
    });

    it("calibration: a 0.5-predicted recommendation realized as a failure scores Brier 0.25", () => {
      const { recommendationId } = engine.recordRecommendation({}); // empty history -> riskScore 0.5
      engine.ingest(makeOutcome({ status: "fail", recommendationId, metrics: { volume: { passed: false } } }));
      const eff = engine.getLoopEfficacy();
      expect(eff.brierScore).toBeCloseTo(0.25, 6); // (0.5 - 1)^2
      expect(eff.calibrationError).toBeCloseTo(0.5, 6); // |0.5 - 1|
    });

    it("empty engine returns zeroed, insufficient, not-helping efficacy", () => {
      const eff = engine.getLoopEfficacy();
      expect(eff.issued).toBe(0);
      expect(eff.attributed).toBe(0);
      expect(eff.followedFailureRate).toBe(0);
      expect(eff.baselineFailureRate).toBe(0);
      expect(eff.lift).toBe(0);
      expect(eff.brierScore).toBe(0);
      expect(eff.helping).toBe(false);
      expect(eff.sufficientData).toBe(false);
    });

    it("an outcome with no recommendationId counts only toward the baseline arm", () => {
      engine.ingest(makeOutcome({ status: "fail", metrics: { volume: { passed: false } } }));
      const eff = engine.getLoopEfficacy();
      expect(eff.baselineSampleSize).toBe(1);
      expect(eff.followedSampleSize).toBe(0);
      expect(eff.issued).toBe(0); // no recommendation was recorded
    });
  });

  describe("recommendation ledger persistence (U-CAD-LEARN-LOOP-CLOSURE)", () => {
    it("recommendation records + attribution survive a ledger replay", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cad-loop-"));
      const ledger = path.join(dir, "cad-failure-ledger.jsonl");
      try {
        const e1 = new CADTrialErrorLearningEngine(ledger);
        const { recommendationId } = e1.recordRecommendation({ partType: "bracket" });
        e1.ingest(makeOutcome({ status: "pass", recommendationId }));
        // a fresh engine replays BOTH the recommendation + outcome ledgers and re-links
        const e2 = new CADTrialErrorLearningEngine(ledger);
        const eff = e2.getLoopEfficacy();
        expect(eff.issued).toBe(1);
        expect(eff.attributed).toBe(1);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("recCounter is restored past the highest auto-id after replay (no id collision)", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cad-loop-"));
      const ledger = path.join(dir, "cad-failure-ledger.jsonl");
      try {
        const e1 = new CADTrialErrorLearningEngine(ledger);
        expect(e1.recordRecommendation({}).recommendationId).toBe("rec_0");
        expect(e1.recordRecommendation({}).recommendationId).toBe("rec_1");
        const e2 = new CADTrialErrorLearningEngine(ledger);
        expect(e2.recordRecommendation({}).recommendationId).toBe("rec_2"); // not rec_0
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("reset({eraseLedger:true}) clears recommendations and removes the rec ledger", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cad-loop-"));
      const ledger = path.join(dir, "cad-failure-ledger.jsonl");
      const recLedger = path.join(dir, "cad-recommendation-ledger.jsonl");
      try {
        const e = new CADTrialErrorLearningEngine(ledger);
        e.recordRecommendation({});
        expect(fs.existsSync(recLedger)).toBe(true);
        e.reset({ eraseLedger: true });
        expect(e.getLoopEfficacy().issued).toBe(0);
        expect(fs.existsSync(recLedger)).toBe(false);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe("resolveDefaultLedgerPath (cwd-independent ledger anchoring, U-CAD-LEDGER-PATH-ABS)", () => {
    const norm = (p: string) => p.replace(/\\/g, "/");

    it("anchors the ledger to <mcp-server>/data/state regardless of launch cwd (src + dist resolve identically)", () => {
      const fromSrc = resolveDefaultLedgerPath("file:///H:/prism/mcp-server/src/engines/CADTrialErrorLearningEngine.ts");
      const fromDist = resolveDefaultLedgerPath("file:///H:/prism/mcp-server/dist/engines/CADTrialErrorLearningEngine.js");
      // ../../ from {src,dist}/engines/ both land in mcp-server/data/state -- one shared ledger.
      expect(norm(fromSrc)).toMatch(/prism\/mcp-server\/data\/state\/cad-failure-ledger\.jsonl$/);
      expect(norm(fromDist)).toMatch(/prism\/mcp-server\/data\/state\/cad-failure-ledger\.jsonl$/);
      expect(norm(fromSrc)).toBe(norm(fromDist));
    });

    it("returns an ABSOLUTE path that is NOT cwd-relative (the divergence bug) and drops the src/dist segment", () => {
      const fromSrc = resolveDefaultLedgerPath("file:///C:/some/other/cwd/mcp-server/src/engines/CADTrialErrorLearningEngine.ts");
      expect(path.isAbsolute(fromSrc)).toBe(true);
      expect(norm(fromSrc)).not.toContain("/src/");
      expect(norm(fromSrc)).not.toContain("/engines/");
      // independent of process.cwd(): same module url -> same path no matter where node launched.
      expect(resolveDefaultLedgerPath("file:///C:/some/other/cwd/mcp-server/dist/engines/CADTrialErrorLearningEngine.js"))
        .toBe(path.resolve("C:/some/other/cwd/mcp-server", "data", "state", "cad-failure-ledger.jsonl"));
    });
  });

  describe("tribal-knowledge injection (U-CAD-LEARN-TRIBAL-INJECT)", () => {
    // A stub provider that returns a fixed list -- isolates the engine's dedupe/sort/cap
    // logic from the real ranker (the real CADTribalDrawInjectionEngine is exercised in
    // the integration test below).
    function stubProvider(tips: Partial<TribalAdvice>[]): TribalTipProvider {
      return () => tips as TribalAdvice[];
    }

    it("no provider -> tribalTips is an empty array (backward-compatible default)", () => {
      const rec = engine.recommendAdjustments({});
      expect(Array.isArray(rec.tribalTips)).toBe(true);
      expect(rec.tribalTips).toEqual([]);
    });

    it("injects provider tips, dedupes by id, sorts by relevance desc, caps at 5", () => {
      const provider = stubProvider([
        { id: "t-low", tip: "low", relevanceScore: 0.2 },
        { id: "t-high", tip: "high", relevanceScore: 0.9 },
        { id: "t-mid", tip: "mid", relevanceScore: 0.5 },
        { id: "t-high", tip: "dup-high", relevanceScore: 0.9 }, // duplicate id -> dropped
        { id: "t-a", tip: "a", relevanceScore: 0.4 },
        { id: "t-b", tip: "b", relevanceScore: 0.3 },
        { id: "t-c", tip: "c", relevanceScore: 0.1 }, // 6th distinct -> dropped by cap=5
      ]);
      const rec = engine.recommendAdjustments({ partType: "bracket" }, { tribalProvider: provider });
      // deduped (7 in, 1 dup) then capped to 5
      expect(rec.tribalTips).toHaveLength(5);
      expect(rec.tribalTips.map((t) => t.id)).toEqual(["t-high", "t-mid", "t-a", "t-b", "t-low"]);
      // the duplicate kept only the first occurrence
      expect(rec.tribalTips.filter((t) => t.id === "t-high")).toHaveLength(1);
      expect(rec.tribalTips[0].tip).toBe("high");
      // the lowest-relevance distinct tip (t-c) was dropped by the cap
      expect(rec.tribalTips.map((t) => t.id)).not.toContain("t-c");
    });

    it("a throwing provider never breaks the recommendation (advisory, fail-soft)", () => {
      const boom: TribalTipProvider = () => {
        throw new Error("tribal corpus unreadable");
      };
      const rec = engine.recommendAdjustments({ partType: "bracket" }, { tribalProvider: boom });
      expect(rec.tribalTips).toEqual([]);
      // the rest of the recommendation is still fully computed
      expect(typeof rec.riskScore).toBe("number");
      expect(rec.candidate.partType).toBe("bracket");
    });

    it("filters malformed tips (missing id/tip) and non-array provider output", () => {
      const provider = stubProvider([
        { id: "ok", tip: "good", relevanceScore: 0.5 },
        { tip: "no-id", relevanceScore: 0.9 } as Partial<TribalAdvice>,
        { id: "no-tip", relevanceScore: 0.9 } as Partial<TribalAdvice>,
        { id: "no-score", tip: "missing score" } as Partial<TribalAdvice>, // score defaults to 0
      ]);
      const rec = engine.recommendAdjustments({}, { tribalProvider: provider });
      // Only id+tip-valid entries survive: "ok" (0.5) and "no-score" (score defaults to 0, sorts last).
      // "no-id" (missing id) and "no-tip" (missing tip) are dropped.
      expect(rec.tribalTips.map((t) => t.id)).toEqual(["ok", "no-score"]);
      expect(rec.tribalTips.find((t) => t.id === "no-score")?.relevanceScore).toBe(0);

      const nonArray: TribalTipProvider = () => undefined as unknown as TribalAdvice[];
      expect(engine.recommendAdjustments({}, { tribalProvider: nonArray }).tribalTips).toEqual([]);
    });

    it("recordRecommendation persists tribalTipCount to the rec ledger (survives reload)", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cad-tribal-"));
      const ledger = path.join(dir, "cad-failure-ledger.jsonl");
      const recLedger = path.join(dir, "cad-recommendation-ledger.jsonl");
      try {
        const e1 = new CADTrialErrorLearningEngine(ledger);
        const provider = stubProvider([
          { id: "x", tip: "x", relevanceScore: 0.5 },
          { id: "y", tip: "y", relevanceScore: 0.6 },
        ]);
        const { recommendation } = e1.recordRecommendation({ partType: "p" }, { tribalProvider: provider });
        expect(recommendation.tribalTips).toHaveLength(2);
        // persisted on disk
        const line = fs.readFileSync(recLedger, "utf8").trim().split(/\r?\n/)[0];
        const persisted = JSON.parse(line);
        expect(persisted.tribalTipCount).toBe(2);
        expect(persisted.suggestionCount).toBeGreaterThanOrEqual(0);
        // a fresh engine replays the ledger and keeps the count
        const e2 = new CADTrialErrorLearningEngine(ledger);
        expect(e2.getLoopEfficacy().issued).toBe(1);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("integration: the REAL CADTribalDrawInjectionEngine surfaces the topology doctrine for a topology-risk candidate", () => {
      // Provider built exactly as the dispatcher builds it (real ranker + tracked corpus).
      const provider: TribalTipProvider = ({ categories, candidate, limit }) => {
        const queryParts = [
          ...categories.map((c) => String(c).replace(/_/g, " ")),
          candidate.partType,
          candidate.generator,
          ...(candidate.features ?? []),
        ].filter((x): x is string => typeof x === "string" && x.length > 0);
        const injection = cadTribalDrawInjectionEngine.recommend(
          { featureType: candidate.features?.[0] ?? candidate.partType, query: queryParts.join(" "), limit: limit ?? 5 },
          CAD_DRAW_TRIBAL_TIPS,
        );
        return injection.applied.map((t) => ({
          id: t.id,
          tip: t.tip ?? "",
          relevanceScore: t.relevanceScore,
          source: t.source,
          kind: t.kind,
        }));
      };
      // Seed a topology failure so the candidate's topRiskCategories include topology_mismatch.
      engine.ingest(
        makeOutcome({ status: "fail", metrics: { topology: { passed: false, deviationPct: 9 } } }),
      );
      const rec = engine.recommendAdjustments({ features: ["topology"] }, { tribalProvider: provider });
      expect(rec.tribalTips.length).toBeGreaterThanOrEqual(1);
      // delta-tribal-004 = "topology before tolerance" (universal consume "all cad mutation")
      expect(rec.tribalTips.map((t) => t.id)).toContain("delta-tribal-004");
      const topo = rec.tribalTips.find((t) => t.id === "delta-tribal-004")!;
      expect(topo.relevanceScore).toBeGreaterThan(0);
      expect(topo.kind).toBe("doctrine");
      expect(topo.tip.toLowerCase()).toContain("topology before tolerance");
    });
  });

  describe("closed-loop self-calibration (U-CAD-LEARN-CALIBRATE)", () => {
    // Seed a known raw riskScore for {partType}, then populate the scored set with
    // recommendations issued at that raw risk (calibrate:false) and attribute outcomes,
    // so the calibration shift is fully deterministic. The attributed outcomes carry NO
    // partType, so partTypeTotals[partType] (hence the raw slice risk) is untouched.
    function seedCalibration(
      eng: CADTrialErrorLearningEngine,
      o: { partType: string; fails: number; passes: number; recCount: number; realizedFails: number }
    ): { rawRisk: number } {
      for (let i = 0; i < o.fails; i++)
        eng.ingest({ testId: `f-${o.partType}-${i}`, originalPath: "/p", status: "fail", partType: o.partType });
      for (let i = 0; i < o.passes; i++)
        eng.ingest({ testId: `p-${o.partType}-${i}`, originalPath: "/p", status: "pass", partType: o.partType });
      for (let i = 0; i < o.recCount; i++)
        eng.recordRecommendation({ partType: o.partType }, { recommendationId: `rc-${o.partType}-${i}`, calibrate: false });
      for (let i = 0; i < o.recCount; i++) {
        const status = i < o.realizedFails ? "fail" : "pass";
        eng.attributeOutcome(`rc-${o.partType}-${i}`, { testId: `o-${o.partType}-${i}`, originalPath: "/p", status });
      }
      return { rawRisk: (o.fails + 1) / (o.fails + o.passes + 2) };
    }

    it("over-predicting corpus -> recalibrates riskScore DOWN toward realized rate", () => {
      // raw 0.75 (8 fail / 2 pass), realized 0.2 (1/5), w = 5/15:
      //   shift = (logit(0.2) - logit(0.75)) * 1/3 = -0.82830
      //   corrected = sigmoid(logit(0.75) - 0.82830) = 0.56717
      const { rawRisk } = seedCalibration(engine, { partType: "widget", fails: 8, passes: 2, recCount: 5, realizedFails: 1 });
      expect(rawRisk).toBeCloseTo(0.75, 6);
      const rec = engine.recommendAdjustments({ partType: "widget" }, { calibrate: true });
      expect(rec.riskScore).toBeCloseTo(0.56717, 4);
      expect(rec.riskScore).toBeLessThan(rawRisk); // corrected toward the lower realized rate
      expect(typeof rec.calibration).toBe("object");
      expect(rec.calibration!.applied).toBe(true);
      expect(rec.calibration!.rawRiskScore).toBeCloseTo(0.75, 6);
      expect(rec.calibration!.shift).toBeCloseTo(-0.82830, 4);
      expect(rec.calibration!.scoredSampleSize).toBe(5);
    });

    it("under-predicting corpus -> recalibrates riskScore UP toward realized rate", () => {
      // raw 0.25 (2 fail / 8 pass), realized 0.8 (4/5): shift = +0.82830, corrected = 0.43283
      const { rawRisk } = seedCalibration(engine, { partType: "thin", fails: 2, passes: 8, recCount: 5, realizedFails: 4 });
      expect(rawRisk).toBeCloseTo(0.25, 6);
      const rec = engine.recommendAdjustments({ partType: "thin" }, { calibrate: true });
      expect(rec.riskScore).toBeCloseTo(0.43283, 4);
      expect(rec.riskScore).toBeGreaterThan(rawRisk);
      expect(rec.calibration!.shift).toBeCloseTo(0.82830, 4);
    });

    it("already-calibrated corpus (realized == meanPred) -> ~zero shift (equilibrium)", () => {
      // raw 0.33333 (3 fail / 7 pass), realized 0.33333 (2/6) -> shift 0, riskScore unchanged.
      const { rawRisk } = seedCalibration(engine, { partType: "cal", fails: 3, passes: 7, recCount: 6, realizedFails: 2 });
      const rec = engine.recommendAdjustments({ partType: "cal" }, { calibrate: true });
      expect(rec.calibration!.applied).toBe(true);
      expect(rec.calibration!.shift).toBeCloseTo(0, 6);
      expect(rec.riskScore).toBeCloseTo(rawRisk, 6);
    });

    it("below MIN_EFFICACY_SAMPLES scored -> NO correction (raw risk preserved)", () => {
      const { rawRisk } = seedCalibration(engine, { partType: "x", fails: 4, passes: 6, recCount: 2, realizedFails: 1 });
      const rec = engine.recommendAdjustments({ partType: "x" }, { calibrate: true });
      expect(rec.calibration!.applied).toBe(false);
      expect(rec.calibration!.shift).toBe(0);
      expect(rec.calibration!.scoredSampleSize).toBe(2);
      expect(rec.riskScore).toBeCloseTo(rawRisk, 6); // identity below the sample floor
      expect(rec.riskScore).toBeCloseTo(rec.calibration!.rawRiskScore, 6);
    });

    it("calibrate:false (default) is byte-identical -- no correction, no calibration field", () => {
      seedCalibration(engine, { partType: "widget", fails: 8, passes: 2, recCount: 5, realizedFails: 1 });
      const off = engine.recommendAdjustments({ partType: "widget" }); // default: no calibrate
      expect(off.riskScore).toBeCloseTo(0.75, 6);
      expect(off.calibration).toBeUndefined();
      const offExplicit = engine.recommendAdjustments({ partType: "widget" }, { calibrate: false });
      expect(offExplicit.riskScore).toBeCloseTo(0.75, 6);
      expect(offExplicit.calibration).toBeUndefined();
    });

    it("extreme realized rate (all-pass) clamps -> finite probability in (0,1), never NaN", () => {
      // realized 0 -> logit clamps at EPS; large negative shift but result stays a valid prob.
      seedCalibration(engine, { partType: "z", fails: 5, passes: 5, recCount: 4, realizedFails: 0 });
      const rec = engine.recommendAdjustments({ partType: "z" }, { calibrate: true });
      expect(Number.isFinite(rec.riskScore)).toBe(true);
      expect(rec.riskScore).toBeGreaterThan(0);
      expect(rec.riskScore).toBeLessThan(0.5); // pushed well below the raw 0.5 toward zero failures
    });

    it("getLoopEfficacy surfaces the shift it will apply (measurement -> action linked)", () => {
      seedCalibration(engine, { partType: "widget", fails: 8, passes: 2, recCount: 5, realizedFails: 1 });
      const eff = engine.getLoopEfficacy();
      expect(eff.calibrationApplied).toBe(true);
      expect(eff.calibrationShift).toBeCloseTo(-0.82830, 4);
      // the diagnostic calibrationError (pre-existing) and the new actionable shift agree in sign
      expect(eff.calibrationError).toBeGreaterThan(0);
    });

    it("production path (calibrate:true records) anchors the shift on RAW prediction -> converges, no self-reference drift", () => {
      // raw slice 0.75; realized 0.2. Two waves: wave-2 recs are RECORDED with calibrate:true once
      // wave-1 is scored, so their predictedRisk is calibrated (~0.567) while rawPredictedRisk stays
      // 0.75. The shift must be computed from the RAW 0.75 anchor (not the calibrated 0.567):
      //   10 scored, realized 0.2, w = 10/20 -> shift = (logit(0.2)-logit(0.75))*0.5 = -1.24245
      // A predictedRisk-anchored bug would instead get ~-1.0216 (polluted mean 0.6585) -> this fails.
      for (let i = 0; i < 8; i++) engine.ingest({ testId: `pf${i}`, originalPath: "/p", status: "fail", partType: "prod" });
      for (let i = 0; i < 2; i++) engine.ingest({ testId: `pp${i}`, originalPath: "/p", status: "pass", partType: "prod" });
      for (let i = 0; i < 5; i++) engine.recordRecommendation({ partType: "prod" }, { recommendationId: `w1-${i}`, calibrate: true });
      for (let i = 0; i < 5; i++) engine.attributeOutcome(`w1-${i}`, { testId: `w1o${i}`, originalPath: "/p", status: i < 1 ? "fail" : "pass" });
      for (let i = 0; i < 5; i++) engine.recordRecommendation({ partType: "prod" }, { recommendationId: `w2-${i}`, calibrate: true });
      for (let i = 0; i < 5; i++) engine.attributeOutcome(`w2-${i}`, { testId: `w2o${i}`, originalPath: "/p", status: i < 1 ? "fail" : "pass" });
      const eff = engine.getLoopEfficacy();
      expect(eff.calibrationShift).toBeCloseTo(-1.24245, 3);
      const rec = engine.recommendAdjustments({ partType: "prod" }, { calibrate: true });
      expect(rec.calibration!.shift).toBeCloseTo(-1.24245, 3);
      expect(rec.riskScore).toBeCloseTo(0.46411, 3); // converged closer to realized 0.2 than the n=5 step (0.567)
      expect(rec.riskScore).toBeLessThan(0.56717); // strictly closer to reality as scored data grew (true convergence)
    });

    it("extreme realized rate (all-fail) clamps -> finite probability in (0,1), never >= 1", () => {
      // realized 1 -> logit clamps at 1-EPS; large positive shift but result stays a valid prob.
      seedCalibration(engine, { partType: "allfail", fails: 5, passes: 5, recCount: 4, realizedFails: 4 });
      const rec = engine.recommendAdjustments({ partType: "allfail" }, { calibrate: true });
      expect(Number.isFinite(rec.riskScore)).toBe(true);
      expect(rec.riskScore).toBeLessThan(1);
      expect(rec.riskScore).toBeGreaterThan(0.5); // pushed well above the raw 0.5 toward all-failure
    });
  });
});
