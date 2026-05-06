/**
 * CAM-EXHAUST-MS0/U-CAM124 — Feedback ↔ LoRA-export integration.
 *
 * Tests the seam between U-CAM117 (orchestrator) and U-CAM120
 * (CAMFeedbackLoopEngine): operator corrections collected from production
 * decisions feed the Mann-Kendall accuracy-drift signal AND the LoRA
 * training-pair export pipeline. This is the loop that makes the AI arc
 * self-improving.
 *
 * Coverage axes:
 *  - recordCorrection produces a CorrectionRecord with all expected fields
 *  - recordOutcome (correct=true) increments outcomes; (correct=false)
 *    counts toward override rate
 *  - accuracyDrift returns insufficient_data below MIN_DRIFT_SAMPLES
 *  - accuracyDrift surfaces a degrading trend when accuracy declines
 *  - accuracyDrift surfaces an improving trend when accuracy rises
 *  - accuracyDrift returns no_trend for stable accuracy
 *  - correctionPatterns groups by reason, source, and (original→corrected) edge
 *  - loraTrainingExport(corrections only) returns weight=1.0 entries
 *  - loraTrainingExport(includeConfirmed=true) mixes weight=1.0 and 0.5
 *  - feedbackStats override rate matches manual tally
 *  - per-task isolation: corrections under strategy_recommend don't pollute
 *    parameter_extract drift series
 */

import { beforeEach, describe, expect, it } from "vitest";
import { CAMFeedbackLoopEngine } from "../../engines/CAMFeedbackLoopEngine.js";
import type { AGIDecisionTask, SourceKind } from "../../engines/CAMDeepLearningOrchestratorEngine.js";

// ── Constants ────────────────────────────────────────────────────────────

const TASK_STRATEGY: AGIDecisionTask = "strategy_recommend";
const TASK_PARAMETER: AGIDecisionTask = "parameter_extract";
const SOURCE_OLLAMA: SourceKind = "ollama";
const SOURCE_NVIDIA: SourceKind = "nvidia";
const MIN_DRIFT_SAMPLES = 30;
const DEGRADING_OUTCOME_COUNT = 60;
const IMPROVING_OUTCOME_COUNT = 60;
const STABLE_OUTCOME_COUNT = 60;
const MK_Z_01 = 2.5758;

beforeEach(() => {
  CAMFeedbackLoopEngine.clearAll();
});

// ── Correction recording flow ────────────────────────────────────────────

describe("U-CAM124: feedback collection → LoRA export integration", () => {
  it("recordCorrection captures originalValue, correctedValue, source, and operator metadata", () => {
    const rec = CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "decision-001",
      task: TASK_STRATEGY,
      originalValue: "trochoidal",
      correctedValue: "adaptive",
      originalSource: SOURCE_OLLAMA,
      originalConfidence: 0.72,
      reason: "thin-wall risk: trochoidal would deflect the wall",
      operatorId: "op-jane",
      prompt: "thin-wall finish, ti-6al-4v, 25mm depth",
    });
    expect(rec.decisionId).toBe("decision-001");
    expect(rec.task).toBe(TASK_STRATEGY);
    expect(rec.originalValue).toBe("trochoidal");
    expect(rec.correctedValue).toBe("adaptive");
    expect(rec.originalSource).toBe(SOURCE_OLLAMA);
    expect(rec.originalConfidence).toBeCloseTo(0.72, 6);
    expect(rec.operatorId).toBe("op-jane");
    expect(rec.reason).toContain("thin-wall");
    expect(typeof rec.recordId).toBe("string");
    expect(rec.recordId.length).toBeGreaterThan(0);
  });

  it("getCorrections filters by task and returns only matching records", () => {
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "d1", task: TASK_STRATEGY,
      originalValue: "x", correctedValue: "y", originalSource: SOURCE_OLLAMA,
    });
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "d2", task: TASK_PARAMETER,
      originalValue: 1000, correctedValue: 1200, originalSource: SOURCE_NVIDIA,
    });
    const strat = CAMFeedbackLoopEngine.getCorrections({ task: TASK_STRATEGY });
    expect(strat.length).toBe(1);
    expect(strat[0].decisionId).toBe("d1");

    const param = CAMFeedbackLoopEngine.getCorrections({ task: TASK_PARAMETER });
    expect(param.length).toBe(1);
    expect(param[0].decisionId).toBe("d2");
  });

  it("accuracyDrift returns insufficient_data below MIN_DRIFT_SAMPLES", () => {
    for (let i = 0; i < MIN_DRIFT_SAMPLES - 1; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `o-${i}`,
        task: TASK_STRATEGY,
        wasCorrect: true,
        predictedConfidence: 0.8,
      });
    }
    const drift = CAMFeedbackLoopEngine.accuracyDrift({ task: TASK_STRATEGY });
    expect(drift.verdict).toBe("insufficient_data");
    expect(drift.sampleCount).toBe(MIN_DRIFT_SAMPLES - 1);
  });

  it("accuracyDrift detects a degrading trend when accuracy declines monotonically", () => {
    // Front-load correct outcomes, back-load incorrect → strong negative trend.
    for (let i = 0; i < DEGRADING_OUTCOME_COUNT; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `deg-${i}`,
        task: TASK_STRATEGY,
        wasCorrect: i < DEGRADING_OUTCOME_COUNT / 3,
        predictedConfidence: 0.8,
      });
    }
    const drift = CAMFeedbackLoopEngine.accuracyDrift({ task: TASK_STRATEGY });
    expect(drift.sampleCount).toBe(DEGRADING_OUTCOME_COUNT);
    expect(["degrading_05", "degrading_01"]).toContain(drift.verdict);
    expect(drift.mannKendallS).toBeLessThan(0);
    expect(drift.ordinarySlope).toBeLessThan(0);
  });

  it("accuracyDrift detects an improving trend when accuracy rises monotonically", () => {
    for (let i = 0; i < IMPROVING_OUTCOME_COUNT; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `imp-${i}`,
        task: TASK_STRATEGY,
        wasCorrect: i >= (IMPROVING_OUTCOME_COUNT * 2) / 3,
        predictedConfidence: 0.8,
      });
    }
    const drift = CAMFeedbackLoopEngine.accuracyDrift({ task: TASK_STRATEGY });
    expect(["improving_05", "improving_01"]).toContain(drift.verdict);
    expect(drift.mannKendallS).toBeGreaterThan(0);
  });

  it("accuracyDrift returns no_trend with mannKendallS=0 for constant-accuracy outcomes", () => {
    // All correct ⇒ rolling-window accuracy is constant at 1.0 throughout.
    // Constant series ⇒ Mann-Kendall S=0 (no pairwise sign disagreement),
    // which the engine reports as the "no_trend" verdict.
    for (let i = 0; i < STABLE_OUTCOME_COUNT; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `stab-${i}`,
        task: TASK_STRATEGY,
        wasCorrect: true,
        predictedConfidence: 0.8,
      });
    }
    const drift = CAMFeedbackLoopEngine.accuracyDrift({ task: TASK_STRATEGY });
    expect(drift.sampleCount).toBe(STABLE_OUTCOME_COUNT);
    expect(drift.verdict).toBe("no_trend");
    expect(drift.mannKendallS).toBe(0);
    expect(drift.ordinarySlope).toBeCloseTo(0, 6);
  });

  it("correctionPatterns groups by reason and source dimensions and computes correct shares", () => {
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "p1", task: TASK_STRATEGY,
      originalValue: "trochoidal", correctedValue: "adaptive",
      originalSource: SOURCE_OLLAMA, reason: "thin-wall",
    });
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "p2", task: TASK_STRATEGY,
      originalValue: "trochoidal", correctedValue: "adaptive",
      originalSource: SOURCE_OLLAMA, reason: "thin-wall",
    });
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "p3", task: TASK_STRATEGY,
      originalValue: "pocket", correctedValue: "trochoidal",
      originalSource: SOURCE_NVIDIA, reason: "tool deflection",
    });
    const report = CAMFeedbackLoopEngine.correctionPatterns({ task: TASK_STRATEGY });
    expect(report.totalCorrections).toBe(3);
    expect(report.byReason.length).toBeGreaterThanOrEqual(1);
    expect(report.bySource.length).toBeGreaterThanOrEqual(1);
    expect(report.byEdge.length).toBeGreaterThanOrEqual(1);

    // Ollama appears 2x, NVIDIA 1x → Ollama leads bySource ranking.
    const ollamaPattern = report.bySource.find((p) => p.group.includes("ollama"));
    expect(ollamaPattern?.count).toBe(2);
    expect(ollamaPattern?.share).toBeCloseTo(2 / 3, 6);
    expect(ollamaPattern?.dimension).toBe("source");
  });

  it("loraTrainingExport (corrections only) emits weight=1.0 source=correction tuples", () => {
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "lora-1", task: TASK_STRATEGY,
      originalValue: "a", correctedValue: "b",
      originalSource: SOURCE_OLLAMA, prompt: "test prompt",
    });
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "lora-2", task: TASK_STRATEGY,
      originalValue: "x", correctedValue: "y",
      originalSource: SOURCE_NVIDIA, prompt: "test prompt 2",
    });
    const pairs = CAMFeedbackLoopEngine.loraTrainingExport({
      task: TASK_STRATEGY,
      includeConfirmed: false,
    });
    expect(pairs.length).toBe(2);
    for (const p of pairs) {
      expect(p.weight).toBe(1.0);
      expect(p.source).toBe("correction");
      expect(p.task).toBe(TASK_STRATEGY);
    }
  });

  it("loraTrainingExport with includeConfirmed=true mixes weights 1.0 (corrections) + 0.5 (confirmations)", () => {
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: "mix-1", task: TASK_STRATEGY,
      originalValue: "a", correctedValue: "b",
      originalSource: SOURCE_OLLAMA, prompt: "p",
    });
    CAMFeedbackLoopEngine.recordOutcome({
      decisionId: "mix-2",
      task: TASK_STRATEGY,
      wasCorrect: true,
      predictedConfidence: 0.9,
    });
    const pairs = CAMFeedbackLoopEngine.loraTrainingExport({
      task: TASK_STRATEGY,
      includeConfirmed: true,
    });
    const weights = pairs.map((p) => p.weight).sort();
    // Expect at least one 0.5 (confirmation) and one 1.0 (correction).
    expect(weights).toContain(1.0);
    expect(weights).toContain(0.5);
  });

  it("feedbackStats override rate matches manual tally (3 corrections / 10 total = 0.30)", () => {
    for (let i = 0; i < 3; i++) {
      CAMFeedbackLoopEngine.recordCorrection({
        decisionId: `c-${i}`, task: TASK_STRATEGY,
        originalValue: i, correctedValue: i + 1, originalSource: SOURCE_OLLAMA,
      });
    }
    for (let i = 0; i < 7; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `o-${i}`,
        task: TASK_STRATEGY,
        wasCorrect: true,
        predictedConfidence: 0.85,
      });
    }
    const stats = CAMFeedbackLoopEngine.feedbackStats();
    expect(stats.totalCorrections).toBe(3);
    expect(stats.totalOutcomes).toBe(7);
    expect(stats.overrideRate).toBeCloseTo(0.30, 6);
    // Top corrected source = ollama (3 times)
    expect(stats.topCorrectedSources[0].source).toBe(SOURCE_OLLAMA);
    expect(stats.topCorrectedSources[0].count).toBe(3);
  });

  it("isolates per-task drift series — strategy corrections don't pollute parameter_extract drift", () => {
    for (let i = 0; i < MIN_DRIFT_SAMPLES + 5; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `s-${i}`,
        task: TASK_STRATEGY,
        wasCorrect: i < 5, // strongly degrading on strategy
        predictedConfidence: 0.7,
      });
    }
    const stratDrift = CAMFeedbackLoopEngine.accuracyDrift({ task: TASK_STRATEGY });
    const paramDrift = CAMFeedbackLoopEngine.accuracyDrift({ task: TASK_PARAMETER });

    expect(stratDrift.sampleCount).toBe(MIN_DRIFT_SAMPLES + 5);
    expect(paramDrift.sampleCount).toBe(0);
    expect(paramDrift.verdict).toBe("insufficient_data");
  });
});
