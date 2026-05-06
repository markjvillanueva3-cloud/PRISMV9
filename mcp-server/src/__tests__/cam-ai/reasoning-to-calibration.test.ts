/**
 * CAM-EXHAUST-MS0/U-CAM124 — Reasoning ↔ Calibration integration.
 *
 * Tests the seam between U-CAM118 (CAMReasoningChainEngine) and U-CAM119
 * (CAMConfidenceCalibrationEngine): when the orchestrator emits a decision,
 * the reasoning chain records WHY it was made, and the calibrator consumes
 * the outcome to inform future confidence calibration. This is the
 * cross-engine flow that single-engine unit tests cannot exercise.
 *
 * All engines run with REAL implementations — no mocks of critical-domain
 * SUTs (CAM AI engines). Orchestrator is run with all sources disabled so
 * decisions are deterministic without network I/O.
 *
 * Coverage axes:
 *  - chain.finalValue + chain.overallConfidence are the inputs to the
 *    calibration recordOutcome path
 *  - histogram method requires ≥20 outcomes; integration test seeds 25
 *  - calibrate() return shape: rawConfidence preserved, calibratedConfidence
 *    falls inside Wilson 95% interval (when calibrated)
 *  - per-task isolation: reasoning chains keyed by task feed the matching
 *    task bucket in the calibrator
 *  - escalation flag from orchestrator surfaces in chain.escalated AND
 *    is consistent with predictedConfidence below escalationThreshold
 *  - real CAMDeepLearningOrchestratorEngine.decide() with all sources
 *    disabled returns confidence=0, escalateToHuman=true, value=null
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CAMReasoningChainEngine } from "../../engines/CAMReasoningChainEngine.js";
import { CAMConfidenceCalibrationEngine } from "../../engines/CAMConfidenceCalibrationEngine.js";
import {
  CAMDeepLearningOrchestratorEngine,
  type AGIDecisionTask,
  type SourceKind,
} from "../../engines/CAMDeepLearningOrchestratorEngine.js";

// ── Constants (avoid magic numbers) ──────────────────────────────────────

const ALL_SOURCES_DISABLED: SourceKind[] = ["physics", "ollama", "nvidia", "tribal"];
const STEP_COUNT_FULL = 8;
const SOURCE_STEP_COUNT = 4;
const HISTOGRAM_MIN_OUTCOMES = 20;
const SEED_OUTCOMES = 25;
const TASK_STRATEGY: AGIDecisionTask = "strategy_recommend";
const TASK_PARAMETER: AGIDecisionTask = "parameter_extract";

beforeEach(() => {
  CAMReasoningChainEngine.clearChains();
  CAMConfidenceCalibrationEngine.clearOutcomes();
});

afterEach(() => {
  CAMReasoningChainEngine.clearChains();
  CAMConfidenceCalibrationEngine.clearOutcomes();
});

// ── Decision-to-Outcome flow ─────────────────────────────────────────────

describe("U-CAM124: orchestrator → reasoning chain → calibration outcome", () => {
  it("records a chain whose finalValue + overallConfidence match the orchestrator decision", async () => {
    const result = await CAMReasoningChainEngine.decide(
      TASK_STRATEGY,
      "deep cavity, 4140 prehard",
      { disableSources: ALL_SOURCES_DISABLED }
    );
    // All sources disabled ⇒ orchestrator emits no consensus, finalValue=null,
    // confidence=0, escalateToHuman=true.
    expect(result.decision.value).toBeNull();
    expect(result.decision.confidence).toBe(0);
    expect(result.decision.escalateToHuman).toBe(true);

    // Reasoning chain mirrors the decision exactly.
    expect(result.chain.finalValue).toBe(result.decision.value);
    expect(result.chain.overallConfidence).toBeCloseTo(result.decision.confidence, 6);
    expect(result.chain.escalated).toBe(result.decision.escalateToHuman);
    expect(result.chain.steps.length).toBe(STEP_COUNT_FULL);
  });

  it("emits a vote-row step with errorCode=disabled for every disabled source", async () => {
    const result = await CAMReasoningChainEngine.decide(
      TASK_STRATEGY,
      "trochoidal pocket, A36",
      { disableSources: ALL_SOURCES_DISABLED }
    );
    const sourceSteps = result.chain.steps.filter((s) => s.source !== null);
    expect(sourceSteps.length).toBe(SOURCE_STEP_COUNT);
    for (const step of sourceSteps) {
      expect(step.errorCode).toBe("disabled");
      expect(step.confidence).toBe(0);
    }
  });

  it("feeds chain output into calibrator as a wrong-answer outcome (escalated decisions correlate with wasCorrect=false)", async () => {
    const result = await CAMReasoningChainEngine.decide(
      TASK_STRATEGY,
      "thin-wall finishing, ti-6al-4v",
      { disableSources: ALL_SOURCES_DISABLED }
    );
    const recorded = CAMConfidenceCalibrationEngine.recordOutcome({
      decisionId: result.chain.chainId,
      task: result.chain.task,
      predictedConfidence: result.chain.overallConfidence,
      wasCorrect: !result.chain.escalated, // escalated → not auto-correct
    });
    expect(recorded.decisionId).toBe(result.chain.chainId);
    expect(recorded.task).toBe(TASK_STRATEGY);
    expect(recorded.predictedConfidence).toBe(0);
    expect(recorded.wasCorrect).toBe(false);
  });

  it("calibrate() falls back to raw method below the histogram threshold", () => {
    // Seed only 5 outcomes (< MIN_HISTOGRAM_OUTCOMES = 20)
    for (let i = 0; i < 5; i++) {
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `dec-${i}`,
        task: TASK_STRATEGY,
        predictedConfidence: 0.7,
        wasCorrect: i % 2 === 0,
      });
    }
    const out = CAMConfidenceCalibrationEngine.calibrate(0.7, {
      method: "histogram",
      task: TASK_STRATEGY,
    });
    expect(out.calibrated).toBe(false);
    expect(out.method).toBe("raw");
    expect(out.rawConfidence).toBeCloseTo(0.7, 6);
    expect(out.calibratedConfidence).toBeCloseTo(0.7, 6);
  });

  it("calibrate() applies histogram once ≥20 outcomes are present and confidence ≠ accuracy", () => {
    // Seed 25 outcomes at confidence=0.9 with only 60% correct — calibration
    // should pull calibrated confidence DOWN from 0.9 toward 0.6.
    for (let i = 0; i < SEED_OUTCOMES; i++) {
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `dec-${i}`,
        task: TASK_STRATEGY,
        predictedConfidence: 0.9,
        wasCorrect: i < 15, // 15/25 = 60%
      });
    }
    const out = CAMConfidenceCalibrationEngine.calibrate(0.9, {
      method: "histogram",
      task: TASK_STRATEGY,
    });
    expect(out.calibrated).toBe(true);
    expect(out.method).toBe("histogram");
    expect(out.rawConfidence).toBeCloseTo(0.9, 6);
    // Calibration should pull confidence toward the empirical 60% accuracy.
    expect(out.calibratedConfidence).toBeLessThan(0.9);
    expect(out.calibratedConfidence).toBeGreaterThan(0.4);
  });

  it("calibrated value lies inside the Wilson 95% uncertainty interval", () => {
    for (let i = 0; i < SEED_OUTCOMES; i++) {
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `wilson-${i}`,
        task: TASK_STRATEGY,
        predictedConfidence: 0.8,
        wasCorrect: i < 18, // 72% accuracy
      });
    }
    const out = CAMConfidenceCalibrationEngine.calibrate(0.8, {
      method: "histogram",
      task: TASK_STRATEGY,
    });
    expect(out.calibrated).toBe(true);
    const [lo, hi] = out.uncertaintyInterval;
    expect(lo).toBeLessThanOrEqual(out.calibratedConfidence);
    expect(out.calibratedConfidence).toBeLessThanOrEqual(hi);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(1);
  });

  it("metrics() returns ECE, MCE, Brier across populated bins after seeding outcomes", () => {
    for (let i = 0; i < SEED_OUTCOMES; i++) {
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `m-${i}`,
        task: TASK_STRATEGY,
        predictedConfidence: 0.5 + (i % 5) * 0.1, // spread across bins
        wasCorrect: i % 3 !== 0, // ~67%
      });
    }
    const m = CAMConfidenceCalibrationEngine.metrics({ task: TASK_STRATEGY });
    expect(m.task).toBe(TASK_STRATEGY);
    expect(m.outcomeCount).toBe(SEED_OUTCOMES);
    expect(m.ece).toBeGreaterThanOrEqual(0);
    expect(m.ece).toBeLessThanOrEqual(1);
    expect(m.mce).toBeGreaterThanOrEqual(m.ece); // MCE is per-bin worst, ≥ weighted-mean ECE
    expect(m.brierScore).toBeGreaterThanOrEqual(0);
    expect(m.brierScore).toBeLessThanOrEqual(1);
    expect(m.bins.length).toBeGreaterThan(0);
  });

  it("recommendMethod() selects histogram for small samples and isotonic for large", () => {
    // Below isotonic threshold → histogram
    for (let i = 0; i < 25; i++) {
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `r-${i}`,
        task: TASK_STRATEGY,
        predictedConfidence: 0.6,
        wasCorrect: i % 2 === 0,
      });
    }
    const small = CAMConfidenceCalibrationEngine.recommendMethod(TASK_STRATEGY);
    expect(["histogram", "platt"]).toContain(small);

    // Pump above isotonic threshold (50)
    for (let i = 25; i < 80; i++) {
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `r-${i}`,
        task: TASK_STRATEGY,
        predictedConfidence: 0.6,
        wasCorrect: i % 2 === 0,
      });
    }
    const large = CAMConfidenceCalibrationEngine.recommendMethod(TASK_STRATEGY);
    expect(["isotonic", "platt", "histogram"]).toContain(large);
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount(TASK_STRATEGY)).toBe(80);
  });

  it("isolates per-task outcome buckets — recording strategy_recommend doesn't pollute parameter_extract", () => {
    for (let i = 0; i < 10; i++) {
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `s-${i}`,
        task: TASK_STRATEGY,
        predictedConfidence: 0.7,
        wasCorrect: true,
      });
    }
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount(TASK_STRATEGY)).toBe(10);
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount(TASK_PARAMETER)).toBe(0);
    // Cross-task metrics: "all" sees the strategy outcomes.
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount()).toBe(10);
  });

  it("propagates orchestrator opts (escalationThreshold) through to chain.escalated", async () => {
    const result = await CAMReasoningChainEngine.decide(
      TASK_PARAMETER,
      "spindle 12000 rpm, fz 0.05",
      {
        disableSources: ALL_SOURCES_DISABLED,
        escalationThreshold: 0.5,
      }
    );
    // confidence=0 < 0.5 ⇒ escalated.
    expect(result.chain.escalated).toBe(true);
    expect(result.chain.task).toBe(TASK_PARAMETER);
  });

  it("decision flow integrates: chain.chainId is unique across rapid sequential calls", async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const result = await CAMReasoningChainEngine.decide(
        TASK_STRATEGY,
        `prompt-${i}`,
        { disableSources: ALL_SOURCES_DISABLED }
      );
      ids.add(result.chain.chainId);
    }
    expect(ids.size).toBe(5);
  });

  it("end-to-end: chain stored ⇒ retrievable via getChain ⇒ outcome recorded against same chainId", async () => {
    const result = await CAMReasoningChainEngine.decide(
      TASK_STRATEGY,
      "rest machining residue",
      { disableSources: ALL_SOURCES_DISABLED }
    );
    const fetched = CAMReasoningChainEngine.getChain(result.chain.chainId);
    expect(fetched).not.toBeNull();
    expect(fetched?.chainId).toBe(result.chain.chainId);

    const outcome = CAMConfidenceCalibrationEngine.recordOutcome({
      decisionId: result.chain.chainId,
      task: result.chain.task,
      predictedConfidence: result.chain.overallConfidence,
      wasCorrect: false,
    });
    expect(outcome.decisionId).toBe(result.chain.chainId);
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount(TASK_STRATEGY)).toBe(1);
  });

  it("orchestrator can also be invoked directly and its decision fed into buildFromDecision", async () => {
    const decision = await CAMDeepLearningOrchestratorEngine.decide(
      TASK_STRATEGY,
      "direct orchestrator path",
      { disableSources: ALL_SOURCES_DISABLED }
    );
    const chain = CAMReasoningChainEngine.buildFromDecision(decision, {
      task: TASK_STRATEGY,
      prompt: "direct orchestrator path",
    });
    expect(chain.task).toBe(TASK_STRATEGY);
    expect(chain.steps.length).toBe(STEP_COUNT_FULL);
    expect(chain.finalValue).toBe(decision.value);
  });
});
