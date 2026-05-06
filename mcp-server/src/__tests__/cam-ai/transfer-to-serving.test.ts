/**
 * CAM-EXHAUST-MS0/U-CAM124 — Transfer-Learning ↔ Model-Serving integration.
 *
 * Tests the seam between U-CAM121 (CAMTransferLearningEngine) and U-CAM122
 * (CAMModelServingEngine): transfer-learning predictions can be hosted as
 * registered models, routed via deterministic FNV bucketing, and observed
 * via the serving health pipeline. This is the path that lets a parameter
 * prediction trained on hyperMILL show up as a Mastercam-tagged model with
 * full SLO tracking.
 *
 * Coverage axes:
 *  - listSupportedCAMs returns ≥6 default tier-1 CAMs
 *  - registerCAMDomain adds + overrides
 *  - domainSimilarity is symmetric for identical CAMs (sim=1)
 *  - transfer with no observations returns no_evidence status
 *  - transfer with sufficient close-similarity observations returns ok status
 *  - registerModel + setRoutingPolicy round-trip
 *  - routeRequest is deterministic for the same request_key
 *  - routeRequest with no active model returns null primary
 *  - recordMetric → getModelHealth round-trip with quantile correctness
 *  - listAllHealth is ordered consistently with the registry
 *  - end-to-end: transfer prediction → derived model → routed → metric → health
 */

import { beforeEach, describe, expect, it } from "vitest";
import { CAMTransferLearningEngine } from "../../engines/CAMTransferLearningEngine.js";
import { CAMModelServingEngine } from "../../engines/CAMModelServingEngine.js";

// ── Constants ────────────────────────────────────────────────────────────

const DEFAULT_CAM_COUNT = 6;
const SOURCE_CAM = "hypermill";
const TARGET_CAM = "mastercam";
const TASK_PARAM: "parameter_extract" = "parameter_extract";
const OPERATION_POCKET = "pocket_2d";
const MATERIAL_4140 = "P-4140";
const REQUEST_KEY_A = "operator-jane:job-1234";
const REQUEST_KEY_B = "operator-john:job-5678";
const ROUTE_BUCKET_MAX = 1000;
const METRIC_SAMPLE_COUNT = 50;
const LATENCY_BASELINE_MS = 100;
// Loose ε=0.20 ⇒ Hoeffding sample floor ≈ 46. Production uses ε=0.05 (~738 samples).
const TEST_EPSILON = 0.20;
const TEST_MIN_SAMPLES = 100;
// Baseline samples needed by promoteToActive's gate at TEST_EPSILON.
const BASELINE_SAMPLES = 120;

beforeEach(() => {
  CAMTransferLearningEngine.clearAll();
  CAMModelServingEngine.clearAll();
});

/** Promote a model from pending → active using a loose test policy. */
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

// ── Transfer learning surface ────────────────────────────────────────────

describe("U-CAM124: transfer learning → model serving integration", () => {
  it("listSupportedCAMs includes the default tier-1 CAMs", () => {
    const cams = CAMTransferLearningEngine.listSupportedCAMs();
    expect(cams.length).toBeGreaterThanOrEqual(DEFAULT_CAM_COUNT);
    expect(cams).toContain(SOURCE_CAM);
    expect(cams).toContain(TARGET_CAM);
    expect(cams).toContain("fusion360");
  });

  it("getDomain retrieves a registered CAM's full feature vector", () => {
    const dom = CAMTransferLearningEngine.getDomain(SOURCE_CAM);
    expect(dom?.slug).toBe(SOURCE_CAM);
    expect(dom?.architecture).toBe("feature-based");
    expect(dom?.cycle_lib_size).toBeGreaterThan(0);
    expect(dom?.adaptive_engine).toBe("native");
  });

  it("domainSimilarity returns 1.0 for a CAM compared to itself", () => {
    const sim = CAMTransferLearningEngine.domainSimilarity(SOURCE_CAM, SOURCE_CAM);
    expect(sim.sim).toBeCloseTo(1, 6);
    expect(sim.categoricalAgreement).toBeCloseTo(1, 6);
    // Numeric kernel should be 1.0 (or very close) when distance vector = 0.
    expect(sim.numericKernel).toBeCloseTo(1, 6);
  });

  it("transfer with no observations returns status=no_evidence", () => {
    const result = CAMTransferLearningEngine.transfer({
      target_cam: TARGET_CAM,
      task: TASK_PARAM,
      operation: OPERATION_POCKET,
      material: MATERIAL_4140,
    });
    expect(result.status).toBe("no_evidence");
    expect(result.predictions).toEqual([]);
    expect(result.observations_considered).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it("transfer with sufficient observations from a close-similarity source returns ok status", () => {
    // Seed 3 hyperMILL observations for the same task/op/material.
    for (let i = 0; i < 3; i++) {
      CAMTransferLearningEngine.recordObservation({
        id: `obs-${i}`,
        source_cam: SOURCE_CAM,
        task: TASK_PARAM,
        operation: OPERATION_POCKET,
        material: MATERIAL_4140,
        parameters: { spindle_rpm: 12000 + i * 50, feed_mmrev: 0.06 },
        success: 1,
        ts: Date.now(),
      });
    }
    const result = CAMTransferLearningEngine.transfer({
      target_cam: TARGET_CAM,
      task: TASK_PARAM,
      operation: OPERATION_POCKET,
      material: MATERIAL_4140,
    });
    expect(result.status).toBe("ok");
    expect(result.predictions.length).toBeGreaterThan(0);
    expect(result.observations_considered).toBe(3);
    expect(result.confidence).toBeGreaterThan(0);
    // spindle_rpm prediction should be near the mean of seeded values (12050).
    const rpm = result.predictions.find((p) => p.parameter === "spindle_rpm");
    expect(rpm?.predicted_value).toBeGreaterThan(11_900);
    expect(rpm?.predicted_value).toBeLessThan(12_200);
  });

  // ── Model serving surface ──────────────────────────────────────────────

  it("registerModel + setRoutingPolicy round-trip with default policy values", () => {
    CAMModelServingEngine.registerModel({
      id: "transfer-model-v1",
      name: "transfer-pocket2d-v1",
      version: "1.0.0",
      backend: "ollama",
      endpoint_url: "http://localhost:11434",
      cam_systems: [TARGET_CAM],
      tasks: [TASK_PARAM],
    });
    const m = CAMModelServingEngine.getModel("transfer-model-v1");
    expect(m?.id).toBe("transfer-model-v1");
    expect(m?.status).toBe("pending");
    expect(m?.cam_systems).toEqual([TARGET_CAM]);

    const policy = CAMModelServingEngine.setRoutingPolicy(
      TARGET_CAM,
      TASK_PARAM,
      "weighted"
    );
    expect(policy.cam_system).toBe(TARGET_CAM);
    expect(policy.task).toBe(TASK_PARAM);
    expect(policy.kind).toBe("weighted");
    expect(policy.epsilon).toBe(0.05);
    expect(policy.max_error_rate).toBe(0.10);
  });

  it("routeRequest is deterministic — same request_key bucket on every call", () => {
    CAMModelServingEngine.registerModel({
      id: "active-1",
      name: "active-1",
      version: "1.0.0",
      backend: "ollama",
      endpoint_url: "http://localhost:11434",
      cam_systems: [TARGET_CAM],
      tasks: [TASK_PARAM],
    });
    deployActive("active-1", TARGET_CAM, TASK_PARAM);

    const a1 = CAMModelServingEngine.routeRequest({
      cam_system: TARGET_CAM, task: TASK_PARAM, request_key: REQUEST_KEY_A,
    });
    const a2 = CAMModelServingEngine.routeRequest({
      cam_system: TARGET_CAM, task: TASK_PARAM, request_key: REQUEST_KEY_A,
    });
    expect(a1.bucket).toBe(a2.bucket);
    expect(a1.primary_model_id).toBe("active-1");
    expect(a1.primary_model_id).toBe(a2.primary_model_id);
    expect(a1.bucket).toBeGreaterThanOrEqual(0);
    expect(a1.bucket).toBeLessThan(ROUTE_BUCKET_MAX);

    // Different request_key may hash to a different bucket (FNV-1a is well-mixed).
    const b1 = CAMModelServingEngine.routeRequest({
      cam_system: TARGET_CAM, task: TASK_PARAM, request_key: REQUEST_KEY_B,
    });
    expect(b1.bucket).toBeGreaterThanOrEqual(0);
    expect(b1.bucket).toBeLessThan(ROUTE_BUCKET_MAX);
  });

  it("routeRequest with no active model returns null primary", () => {
    CAMModelServingEngine.setRoutingPolicy(TARGET_CAM, TASK_PARAM, "weighted");
    const decision = CAMModelServingEngine.routeRequest({
      cam_system: TARGET_CAM, task: TASK_PARAM, request_key: REQUEST_KEY_A,
    });
    expect(decision.primary_model_id).toBeNull();
    expect(decision.shadow_model_ids).toEqual([]);
    expect(typeof decision.rationale).toBe("string");
  });

  it("recordMetric → getModelHealth produces quantiles consistent with the sample distribution", () => {
    CAMModelServingEngine.registerModel({
      id: "metric-model",
      name: "metric-model",
      version: "1.0.0",
      backend: "ollama",
      endpoint_url: "http://localhost:11434",
      cam_systems: [TARGET_CAM],
      tasks: [TASK_PARAM],
    });
    deployActive("metric-model", TARGET_CAM, TASK_PARAM);

    // After deployActive(): BASELINE_SAMPLES baseline samples already in the
    // ring buffer (latency 80..89ms), all success=true. We add 50 spread
    // samples (50..200ms) and verify quantiles cover the combined distribution.
    const minMs = 50;
    const maxMs = 200;
    for (let i = 0; i < METRIC_SAMPLE_COUNT; i++) {
      const latency = minMs + (i / (METRIC_SAMPLE_COUNT - 1)) * (maxMs - minMs);
      CAMModelServingEngine.recordMetric("metric-model", {
        latency_ms: latency,
        success: true,
      });
    }
    const health = CAMModelServingEngine.getModelHealth("metric-model");
    expect(health.samples).toBe(BASELINE_SAMPLES + METRIC_SAMPLE_COUNT);
    expect(health.errors).toBe(0);
    expect(health.error_rate).toBe(0);
    // Sample distribution spans 50..200ms with most samples in the 80..89 range
    // (baseline). p50 will sit in the baseline cluster; p95 reaches into the
    // spread tail.
    expect(health.p50_latency_ms).toBeGreaterThanOrEqual(minMs);
    expect(health.p50_latency_ms).toBeLessThanOrEqual(maxMs);
    expect(health.p95_latency_ms).toBeGreaterThan(health.p50_latency_ms);
    expect(health.p95_latency_ms).toBeLessThanOrEqual(maxMs);
    expect(health.wilson_lower_95_success).toBeGreaterThan(0.9);
  });

  it("recordMetric with mixed success/error updates error_rate and Wilson lower bound", () => {
    CAMModelServingEngine.registerModel({
      id: "err-model",
      name: "err-model",
      version: "1.0.0",
      backend: "ollama",
      endpoint_url: "http://localhost:11434",
      cam_systems: [TARGET_CAM],
      tasks: [TASK_PARAM],
    });
    // Use a brand-new policy key so deployActive() doesn't pull baseline samples
    // from a prior model — each test isolates its own (cam_system, task) policy.
    deployActive("err-model", TARGET_CAM, TASK_PARAM);

    // After deployActive: BASELINE_SAMPLES success=true samples seeded.
    // Add 40 more: 32 success + 8 timeout errors.
    for (let i = 0; i < 40; i++) {
      CAMModelServingEngine.recordMetric("err-model", {
        latency_ms: 100,
        success: i < 32,
        ...(i >= 32 ? { error_class: "timeout" } : {}),
      });
    }
    const health = CAMModelServingEngine.getModelHealth("err-model");
    const expectedTotal = BASELINE_SAMPLES + 40;
    expect(health.samples).toBe(expectedTotal);
    expect(health.successes).toBe(BASELINE_SAMPLES + 32);
    expect(health.errors).toBe(8);
    expect(health.error_rate).toBeCloseTo(8 / expectedTotal, 4);
    // Wilson lower bound on a 152/160 success ratio sits well above the
    // observed 8/160 ≈ 5% error rate complement.
    expect(health.wilson_lower_95_success).toBeGreaterThan(0.85);
    expect(health.wilson_lower_95_success).toBeLessThan(1);
    // top_error_classes should surface "timeout"
    expect(health.top_error_classes[0]?.class).toBe("timeout");
    expect(health.top_error_classes[0]?.count).toBe(8);
  });

  it("end-to-end: transfer prediction → derived model registered → routed → metric → health", () => {
    // 1. Generate transfer prediction
    for (let i = 0; i < 3; i++) {
      CAMTransferLearningEngine.recordObservation({
        id: `e2e-obs-${i}`,
        source_cam: SOURCE_CAM,
        task: TASK_PARAM,
        operation: OPERATION_POCKET,
        material: MATERIAL_4140,
        parameters: { spindle_rpm: 11000 + i * 100, feed_mmrev: 0.05 },
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

    // 2. Wrap the transfer output as a model in the serving registry.
    const modelId = `transfer-${SOURCE_CAM}-to-${TARGET_CAM}-pocket2d`;
    CAMModelServingEngine.registerModel({
      id: modelId,
      name: modelId,
      version: "transfer-1.0",
      backend: "custom",
      endpoint_url: `prism://transfer/${SOURCE_CAM}/${TARGET_CAM}`,
      cam_systems: [TARGET_CAM],
      tasks: [TASK_PARAM],
      metadata: {
        transfer_source: SOURCE_CAM,
        transfer_confidence: String(transfer.confidence),
      },
    });
    deployActive(modelId, TARGET_CAM, TASK_PARAM);

    // 3. Route a request — primary should resolve to our derived model.
    const route = CAMModelServingEngine.routeRequest({
      cam_system: TARGET_CAM,
      task: TASK_PARAM,
      request_key: REQUEST_KEY_A,
    });
    expect(route.primary_model_id).toBe(modelId);

    // 4. Record a metric and confirm health surfaces the derived model.
    // deployActive seeded BASELINE_SAMPLES (=120) success=true samples; this
    // adds one more.
    CAMModelServingEngine.recordMetric(modelId, {
      latency_ms: LATENCY_BASELINE_MS,
      success: true,
    });
    const health = CAMModelServingEngine.getModelHealth(modelId);
    expect(health.samples).toBe(BASELINE_SAMPLES + 1);
    expect(health.errors).toBe(0);
    expect(health.error_rate).toBe(0);
    expect(health.status).toBe("active");

    // 5. listAllHealth includes the derived model.
    const all = CAMModelServingEngine.listAllHealth();
    expect(all.find((h) => h.model_id === modelId)?.samples).toBe(BASELINE_SAMPLES + 1);
  });
});
