/**
 * CAM-EXHAUST-MS0/U-CAM124 — End-to-end CAM AI/ML pipeline integration.
 *
 * Composes ALL FIVE U-CAM117..122 engines as one pipeline and asserts that
 * telemetry flows consistently across the whole stack:
 *
 *     orchestrator (U-CAM117)
 *         ↓
 *     reasoning chain (U-CAM118) — replayable audit trail
 *         ↓
 *     calibration (U-CAM119) — calibrated confidence
 *         ↓
 *     feedback loop (U-CAM120) — operator override → drift
 *         ↓
 *     transfer learning (U-CAM121) — propagate learning to peer CAM
 *         ↓
 *     model serving (U-CAM122) — production deploy + SLO health
 *
 * The orchestrator is run with all sources disabled so the test is
 * deterministic without network I/O. Single-engine behaviour is covered
 * by the per-engine unit tests + the focused-pair integration tests in
 * this directory; this file's purpose is to verify nothing breaks at
 * the seams when all five engines run in series.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CAMReasoningChainEngine } from "../../engines/CAMReasoningChainEngine.js";
import { CAMConfidenceCalibrationEngine } from "../../engines/CAMConfidenceCalibrationEngine.js";
import { CAMFeedbackLoopEngine } from "../../engines/CAMFeedbackLoopEngine.js";
import { CAMTransferLearningEngine } from "../../engines/CAMTransferLearningEngine.js";
import { CAMModelServingEngine } from "../../engines/CAMModelServingEngine.js";
import type {
  AGIDecisionTask,
  SourceKind,
} from "../../engines/CAMDeepLearningOrchestratorEngine.js";

// ── Constants ────────────────────────────────────────────────────────────

const ALL_SOURCES_DISABLED: SourceKind[] = ["physics", "ollama", "nvidia", "tribal"];
const TASK_STRATEGY: AGIDecisionTask = "strategy_recommend";
const TASK_PARAM: AGIDecisionTask = "parameter_extract";
const SOURCE_OLLAMA: SourceKind = "ollama";
const SOURCE_CAM = "hypermill";
const TARGET_CAM = "mastercam";
const OPERATION_POCKET = "pocket_2d";
const MATERIAL_4140 = "P-4140";
const TEST_EPSILON = 0.20;
const TEST_MIN_SAMPLES = 100;
const BASELINE_SAMPLES = 120;
const LATENCY_BASELINE_MS = 100;
const MIN_DRIFT_SAMPLES = 30;

// Wide-spread observation parameters used to seed transfer learning.
const SEEDED_OBSERVATIONS = 4;
const SEEDED_RPM_BASE = 11_000;
const SEEDED_FEED = 0.05;

beforeEach(() => {
  CAMReasoningChainEngine.clearChains();
  CAMConfidenceCalibrationEngine.clearOutcomes();
  CAMFeedbackLoopEngine.clearAll();
  CAMTransferLearningEngine.clearAll();
  CAMModelServingEngine.clearAll();
});

afterEach(() => {
  CAMReasoningChainEngine.clearChains();
  CAMConfidenceCalibrationEngine.clearOutcomes();
  CAMFeedbackLoopEngine.clearAll();
  CAMTransferLearningEngine.clearAll();
  CAMModelServingEngine.clearAll();
});

/** Inline deployActive helper — same shape as the existing canonical test
 *  helper in CAMModelServingEngine.test.ts. Loose ε=0.20 keeps the Hoeffding
 *  promotion gate testable without fabricating thousands of metrics. */
function deployActive(modelId: string, camSystem: string, task: string): void {
  if (!CAMModelServingEngine.getRoutingPolicy(camSystem, task)) {
    CAMModelServingEngine.setRoutingPolicy(camSystem, task, "canary_split", {
      epsilon: TEST_EPSILON,
      min_samples_for_promotion: TEST_MIN_SAMPLES,
    });
  }
  CAMModelServingEngine.deployShadow(modelId);
  CAMModelServingEngine.promoteToCanary(modelId, 1);
  for (let i = 0; i < BASELINE_SAMPLES; i++) {
    CAMModelServingEngine.recordMetric(modelId, {
      latency_ms: LATENCY_BASELINE_MS - 20 + (i % 10),
      success: true,
    });
  }
  const env = CAMModelServingEngine.promoteToActive(modelId);
  if (!env.applied) {
    throw new Error(`deployActive failed: ${env.rationale}`);
  }
}

describe("U-CAM124: end-to-end CAM AI/ML pipeline (all five engines)", () => {
  it("composes orchestrator → reasoning → calibration → feedback → transfer → serving without losing identity across the stack", async () => {
    // ── 1. Orchestrator + reasoning chain ─────────────────────────────────
    const decisionResult = await CAMReasoningChainEngine.decide(
      TASK_STRATEGY,
      "thin-wall finishing pocket, ti-6al-4v",
      { disableSources: ALL_SOURCES_DISABLED }
    );
    expect(decisionResult.chain.task).toBe(TASK_STRATEGY);
    expect(decisionResult.chain.escalated).toBe(true);
    expect(decisionResult.decision.confidence).toBe(0);
    const chainId = decisionResult.chain.chainId;

    // ── 2. Calibration: outcome recorded against the chain's id ──────────
    CAMConfidenceCalibrationEngine.recordOutcome({
      decisionId: chainId,
      task: TASK_STRATEGY,
      predictedConfidence: decisionResult.chain.overallConfidence,
      wasCorrect: false, // escalated decisions are not auto-correct
    });
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount(TASK_STRATEGY)).toBe(1);

    // ── 3. Feedback: operator overrides the AI's pick ────────────────────
    const correction = CAMFeedbackLoopEngine.recordCorrection({
      decisionId: chainId,
      task: TASK_STRATEGY,
      originalValue: decisionResult.chain.finalValue, // null (escalated)
      correctedValue: "adaptive",
      originalSource: SOURCE_OLLAMA,
      originalConfidence: decisionResult.chain.overallConfidence,
      reason: "ai abstained; operator selected adaptive based on shop tribal",
      operatorId: "op-jane",
      prompt: decisionResult.chain.prompt,
    });
    expect(correction.decisionId).toBe(chainId);
    expect(correction.correctedValue).toBe("adaptive");

    // Drift series — seed enough outcomes to trigger Mann-Kendall verdict.
    for (let i = 0; i < MIN_DRIFT_SAMPLES + 5; i++) {
      CAMFeedbackLoopEngine.recordOutcome({
        decisionId: `e2e-${i}`,
        task: TASK_STRATEGY,
        wasCorrect: i % 4 !== 0, // 75% accuracy, slowly degrading from start
        predictedConfidence: 0.7,
      });
    }
    const drift = CAMFeedbackLoopEngine.accuracyDrift({ task: TASK_STRATEGY });
    expect(drift.sampleCount).toBe(MIN_DRIFT_SAMPLES + 5);
    expect(drift.verdict).not.toBe("insufficient_data");

    // LoRA training pair from the correction.
    const loraPairs = CAMFeedbackLoopEngine.loraTrainingExport({
      task: TASK_STRATEGY,
      includeConfirmed: false,
    });
    expect(loraPairs.length).toBe(1);
    expect(loraPairs[0].weight).toBe(1.0);
    expect(loraPairs[0].source).toBe("correction");
    expect(loraPairs[0].correctedValue).toBe("adaptive");

    // ── 4. Transfer learning: project learning to a peer CAM ─────────────
    for (let i = 0; i < SEEDED_OBSERVATIONS; i++) {
      CAMTransferLearningEngine.recordObservation({
        id: `e2e-tx-${i}`,
        source_cam: SOURCE_CAM,
        task: TASK_PARAM,
        operation: OPERATION_POCKET,
        material: MATERIAL_4140,
        parameters: { spindle_rpm: SEEDED_RPM_BASE + i * 50, feed_mmrev: SEEDED_FEED },
        success: 1,
        ts: Date.now(),
      });
    }
    const transfer = CAMTransferLearningEngine.transfer({
      target_cam: TARGET_CAM,
      task: TASK_PARAM,
      operation: OPERATION_POCKET,
      material: MATERIAL_4140,
    });
    expect(transfer.status).toBe("ok");
    expect(transfer.predictions.length).toBeGreaterThan(0);
    expect(transfer.observations_considered).toBe(SEEDED_OBSERVATIONS);

    // ── 5. Model serving: register transfer output as a deployed model ───
    const modelId = `e2e-${SOURCE_CAM}→${TARGET_CAM}-pocket2d`;
    CAMModelServingEngine.registerModel({
      id: modelId,
      name: modelId,
      version: "e2e-1.0",
      backend: "custom",
      endpoint_url: `prism://transfer/${SOURCE_CAM}/${TARGET_CAM}`,
      cam_systems: [TARGET_CAM],
      tasks: [TASK_PARAM],
      metadata: {
        transfer_source: SOURCE_CAM,
        derived_from_chain: chainId,
        operator_correction: correction.recordId,
      },
    });
    deployActive(modelId, TARGET_CAM, TASK_PARAM);

    // Route a request — primary should resolve to our derived model.
    const route = CAMModelServingEngine.routeRequest({
      cam_system: TARGET_CAM,
      task: TASK_PARAM,
      request_key: `op-jane:${chainId}`,
    });
    expect(route.primary_model_id).toBe(modelId);

    // Health: deployActive seeded BASELINE_SAMPLES; pipeline is healthy.
    const health = CAMModelServingEngine.getModelHealth(modelId);
    expect(health.samples).toBe(BASELINE_SAMPLES);
    expect(health.errors).toBe(0);
    expect(health.status).toBe("active");

    // ── 6. Cross-engine identity: chain → correction → model metadata ────
    const fetchedChain = CAMReasoningChainEngine.getChain(chainId);
    expect(fetchedChain?.chainId).toBe(chainId);
    const fetchedModel = CAMModelServingEngine.getModel(modelId);
    expect(fetchedModel?.metadata.derived_from_chain).toBe(chainId);
    expect(fetchedModel?.metadata.operator_correction).toBe(correction.recordId);
  });

  it("preserves per-task isolation across the full pipeline (strategy ≠ parameter ≠ classify)", async () => {
    // Two parallel pipelines under different tasks: strategy_recommend and
    // parameter_extract. State per-task must not leak between them.
    const stratResult = await CAMReasoningChainEngine.decide(
      TASK_STRATEGY,
      "rough out a pocket",
      { disableSources: ALL_SOURCES_DISABLED }
    );
    const paramResult = await CAMReasoningChainEngine.decide(
      TASK_PARAM,
      "spindle 12000 fz 0.05",
      { disableSources: ALL_SOURCES_DISABLED }
    );
    expect(stratResult.chain.chainId).not.toBe(paramResult.chain.chainId);

    // Calibration outcomes — different tasks
    CAMConfidenceCalibrationEngine.recordOutcome({
      decisionId: stratResult.chain.chainId,
      task: TASK_STRATEGY,
      predictedConfidence: 0.7,
      wasCorrect: true,
    });
    CAMConfidenceCalibrationEngine.recordOutcome({
      decisionId: paramResult.chain.chainId,
      task: TASK_PARAM,
      predictedConfidence: 0.4,
      wasCorrect: false,
    });
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount(TASK_STRATEGY)).toBe(1);
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount(TASK_PARAM)).toBe(1);
    // Cross-task "all" view sees both.
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount()).toBe(2);

    // Feedback corrections under one task don't pollute the other's drift.
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: stratResult.chain.chainId,
      task: TASK_STRATEGY,
      originalValue: "x", correctedValue: "y", originalSource: SOURCE_OLLAMA,
    });
    const stratStats = CAMFeedbackLoopEngine.feedbackStats();
    expect(stratStats.totalCorrections).toBe(1);
    const paramCorrections = CAMFeedbackLoopEngine.getCorrections({ task: TASK_PARAM });
    expect(paramCorrections.length).toBe(0);
  });

  it("propagates orchestrator opts (escalationThreshold) consistently — chain reflects escalated=true when confidence below threshold", async () => {
    const result = await CAMReasoningChainEngine.decide(
      TASK_STRATEGY,
      "high-threshold case",
      {
        disableSources: ALL_SOURCES_DISABLED,
        escalationThreshold: 0.99, // any confidence < 0.99 escalates
      }
    );
    expect(result.chain.escalated).toBe(true);
    // Calibration recordOutcome should accept the predicted confidence.
    const outcome = CAMConfidenceCalibrationEngine.recordOutcome({
      decisionId: result.chain.chainId,
      task: TASK_STRATEGY,
      predictedConfidence: result.chain.overallConfidence,
      wasCorrect: false,
    });
    expect(outcome.predictedConfidence).toBe(0); // confidence=0 from disabled-orchestrator
    expect(outcome.task).toBe(TASK_STRATEGY);
  });

  it("validates that clearAll() between tests restores fresh state across all five engines", async () => {
    // Seed one record in each engine's storage
    const result = await CAMReasoningChainEngine.decide(
      TASK_STRATEGY,
      "seeded prompt",
      { disableSources: ALL_SOURCES_DISABLED }
    );
    CAMConfidenceCalibrationEngine.recordOutcome({
      decisionId: result.chain.chainId,
      task: TASK_STRATEGY,
      predictedConfidence: 0.5,
      wasCorrect: true,
    });
    CAMFeedbackLoopEngine.recordCorrection({
      decisionId: result.chain.chainId,
      task: TASK_STRATEGY,
      originalValue: "x", correctedValue: "y", originalSource: SOURCE_OLLAMA,
    });
    CAMTransferLearningEngine.recordObservation({
      id: "seed",
      source_cam: SOURCE_CAM,
      task: TASK_PARAM,
      operation: OPERATION_POCKET,
      material: MATERIAL_4140,
      parameters: { spindle_rpm: 12000 },
      success: 1,
      ts: Date.now(),
    });
    CAMModelServingEngine.registerModel({
      id: "seed-model",
      name: "seed",
      version: "1.0",
      backend: "ollama",
      endpoint_url: "http://localhost",
      cam_systems: [TARGET_CAM],
      tasks: [TASK_PARAM],
    });

    // Pre-clear sanity check
    expect(CAMReasoningChainEngine.listChains()).toHaveLength(1);
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount(TASK_STRATEGY)).toBe(1);
    expect(CAMFeedbackLoopEngine.feedbackStats().totalCorrections).toBe(1);
    expect(CAMTransferLearningEngine.getObservationCount()).toBe(1);
    expect(CAMModelServingEngine.getModel("seed-model")?.id).toBe("seed-model");

    // Clear everything
    CAMReasoningChainEngine.clearChains();
    CAMConfidenceCalibrationEngine.clearOutcomes();
    CAMFeedbackLoopEngine.clearAll();
    CAMTransferLearningEngine.clearAll();
    CAMModelServingEngine.clearAll();

    // Post-clear assertions
    expect(CAMReasoningChainEngine.listChains()).toHaveLength(0);
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount()).toBe(0);
    expect(CAMFeedbackLoopEngine.feedbackStats().totalCorrections).toBe(0);
    expect(CAMTransferLearningEngine.getObservationCount()).toBe(0);
    expect(CAMModelServingEngine.getModel("seed-model")).toBeNull();
    // Transfer learning's domain registry is preserved across clearAll —
    // the default tier-1 CAMs should still be listed.
    expect(CAMTransferLearningEngine.listSupportedCAMs().length).toBeGreaterThanOrEqual(6);
  });
});
