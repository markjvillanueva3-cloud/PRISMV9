/**
 * CAMTransferLearningEngine tests — CAM-EXHAUST-MS0/U-CAM121
 *
 * Validates cross-CAM kernel-weighted transfer-learning behaviour:
 *   - default tier-1 CAM domains pre-registered
 *   - similarity is symmetric & ∈ [0,1]
 *   - registerCAMDomain merges and validates inputs
 *   - recordObservation enforces required fields and numeric coercion
 *   - transfer() handles no-evidence, low-similarity, low-evidence regimes
 *   - kernel weighting actually pulls predictions toward closer source CAMs
 *   - recency decay reduces influence of old observations
 *   - bestSourceCAM picks the highest-score source
 *   - transferAccuracy aggregates outcomes with Wilson lower bound
 *   - ring-buffer caps evict oldest first
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CAMTransferLearningEngine,
  type CAMDomainFeatures,
  type CAMTransferPrediction,
} from "../engines/CAMTransferLearningEngine.js";

// ─── named constants used in fixtures and assertions ─────────────────────
const TASK = "strategy_recommend" as const;
const OPERATION = "adaptive_3d";
const MATERIAL_P = "P";
const MATERIAL_M = "M";
const TARGET_CAM = "mastercam";
const SECONDS_PER_DAY = 86_400;
const MS_PER_SEC = 1000;
const STALE_OBS_DAYS = 60;
const RECENT_TAU_DAYS = 10;
const HIGH_TWIN_SIM_FLOOR = 0.6;
const LOW_FAR_SIM_CEILING = 0.5;
const STALE_VS_RECENT_FLOOR = 4500;
const KERNEL_LOWER_BOUND_RPM = 4400;
const KERNEL_UPPER_BOUND_RPM = 4600;
const TIER1_MIN_COUNT = 6;
const OUTCOMES_TOTAL = 7;
const OUTCOMES_HITS = 5;
const CAP_OBS = 3;
const TOTAL_OBS_FOR_CAP = 5;
const CAP_OUTCOMES = 2;
const TOTAL_OUTCOMES_FOR_CAP = 4;
const STALE_OBS_MS = STALE_OBS_DAYS * SECONDS_PER_DAY * MS_PER_SEC;

type ObsInput = Parameters<typeof CAMTransferLearningEngine.recordObservation>[0];

function makeDomain(slug: string, overrides: Partial<CAMDomainFeatures> = {}): CAMDomainFeatures {
  return {
    slug,
    architecture: "history-based",
    cycle_lib_size: 100,
    multiaxis_native: 1,
    adaptive_engine: "native",
    post_language: "javascript",
    gpu_simulate: 1,
    controller_dialects: 200,
    productivity_score: 0.8,
    install_base_score: 0.5,
    ...overrides,
  };
}

function obs(
  source: string,
  material: string,
  parameters: Record<string, number>,
  overrides: Partial<ObsInput> = {},
): ObsInput {
  return {
    source_cam: source,
    task: TASK,
    operation: OPERATION,
    material,
    parameters,
    ...overrides,
  };
}

function findPred(preds: CAMTransferPrediction[], name: string): CAMTransferPrediction {
  const p = preds.find((x) => x.parameter === name);
  if (!p) throw new Error(`expected prediction for parameter "${name}", got ${preds.map((q) => q.parameter).join(",")}`);
  return p;
}

beforeEach(() => {
  CAMTransferLearningEngine.clearAll();
});

describe("CAMTransferLearningEngine — registry + domain features", () => {
  it("pre-registers the six tier-1 CAM domains by default", () => {
    const slugs = CAMTransferLearningEngine.listSupportedCAMs();
    expect(slugs).toContain("hypermill");
    expect(slugs).toContain("mastercam");
    expect(slugs).toContain("fusion360");
    expect(slugs).toContain("inventor-hsm");
    expect(slugs).toContain("solidcam");
    expect(slugs).toContain("nx");
    expect(slugs.length).toBeGreaterThanOrEqual(TIER1_MIN_COUNT);
  });

  it("registers a custom test domain and rejects non-finite numerics", () => {
    CAMTransferLearningEngine.registerCAMDomain(makeDomain("test-x", { cycle_lib_size: 42 }));
    const domain = CAMTransferLearningEngine.getDomain("test-x");
    if (!domain) throw new Error("registered domain should be retrievable");
    expect(domain.cycle_lib_size).toBe(42);
    expect(domain.architecture).toBe("history-based");
    expect(domain.adaptive_engine).toBe("native");
    expect(() =>
      CAMTransferLearningEngine.registerCAMDomain(
        makeDomain("test-bad", { cycle_lib_size: Number.NaN }),
      ),
    ).toThrow(/finite/);
  });
});

describe("CAMTransferLearningEngine — domain similarity", () => {
  it("is symmetric and bounded in [0,1]", () => {
    const ab = CAMTransferLearningEngine.domainSimilarity("hypermill", TARGET_CAM).sim;
    const ba = CAMTransferLearningEngine.domainSimilarity(TARGET_CAM, "hypermill").sim;
    expect(ab).toBeGreaterThan(0);
    expect(ab).toBeLessThanOrEqual(1);
    expect(Math.abs(ab - ba)).toBeLessThan(1e-9);
  });

  it("identical-feature CAMs are more similar than divergent ones", () => {
    CAMTransferLearningEngine.registerCAMDomain(makeDomain("test-twin"));
    CAMTransferLearningEngine.registerCAMDomain(
      makeDomain("test-far", {
        architecture: "mesh-based",
        adaptive_engine: "vortex",
        post_language: "lisp",
        cycle_lib_size: 500,
        productivity_score: 0.1,
        install_base_score: 0.1,
        controller_dialects: 1000,
        multiaxis_native: 0,
        gpu_simulate: 0,
      }),
    );
    CAMTransferLearningEngine.registerCAMDomain(makeDomain("test-base"));
    const closeSim = CAMTransferLearningEngine.domainSimilarity("test-twin", "test-base").sim;
    const farSim = CAMTransferLearningEngine.domainSimilarity("test-far", "test-base").sim;
    expect(closeSim).toBeGreaterThan(farSim);
    expect(closeSim).toBeGreaterThan(HIGH_TWIN_SIM_FLOOR);
    expect(farSim).toBeLessThan(LOW_FAR_SIM_CEILING);
  });

  it("rejects unknown CAM slugs without test- prefix", () => {
    expect(() =>
      CAMTransferLearningEngine.domainSimilarity("not-a-real-cam", TARGET_CAM),
    ).toThrow(/CAMSystemRegistry/);
  });
});

describe("CAMTransferLearningEngine — observation recording", () => {
  it("validates required fields and coerces numeric parameters", () => {
    const stored = CAMTransferLearningEngine.recordObservation(
      obs("hypermill", MATERIAL_P, { rpm: 4500, feed: 1200 }),
    );
    expect(stored.id).toMatch(/^cam-tl-/);
    expect(stored.parameters.rpm).toBe(4500);
    expect(stored.parameters.feed).toBe(1200);
    expect(stored.success).toBe(1);
    expect(stored.source_cam).toBe("hypermill");
    expect(CAMTransferLearningEngine.getObservationCount()).toBe(1);

    expect(() =>
      CAMTransferLearningEngine.recordObservation({
        source_cam: "hypermill",
        task: TASK,
        operation: OPERATION,
        material: MATERIAL_P,
        parameters: { rpm: Number.NaN },
      }),
    ).toThrow(/finite/);
  });

  it("filters by source_cam, task, operation, material via listObservations", () => {
    CAMTransferLearningEngine.recordObservation(obs("hypermill", MATERIAL_P, { rpm: 4500 }));
    CAMTransferLearningEngine.recordObservation(obs("mastercam", MATERIAL_P, { rpm: 4200 }));
    CAMTransferLearningEngine.recordObservation(obs("hypermill", MATERIAL_M, { rpm: 3000 }));
    expect(
      CAMTransferLearningEngine.listObservations({ source_cam: "hypermill" }),
    ).toHaveLength(2);
    expect(CAMTransferLearningEngine.listObservations({ material: MATERIAL_M })).toHaveLength(1);
    expect(CAMTransferLearningEngine.listObservations({ source_cam: "mastercam" })).toHaveLength(
      1,
    );
  });
});

describe("CAMTransferLearningEngine — transfer regime", () => {
  it("returns no_evidence when nothing matches", () => {
    const r = CAMTransferLearningEngine.transfer({
      target_cam: TARGET_CAM,
      task: TASK,
      operation: OPERATION,
      material: MATERIAL_P,
    });
    expect(r.status).toBe("no_evidence");
    expect(r.predictions).toHaveLength(0);
    expect(r.confidence).toBe(0);
    expect(r.observations_considered).toBe(0);
  });

  it("predicts kernel-weighted mean across multiple sources", () => {
    CAMTransferLearningEngine.recordObservation(
      obs("hypermill", MATERIAL_P, { rpm: 4500, feed: 1200 }),
    );
    CAMTransferLearningEngine.recordObservation(
      obs("solidcam", MATERIAL_P, { rpm: 4400, feed: 1150 }),
    );
    CAMTransferLearningEngine.recordObservation(
      obs("nx", MATERIAL_P, { rpm: 4600, feed: 1250 }),
    );
    const r = CAMTransferLearningEngine.transfer({
      target_cam: TARGET_CAM,
      task: TASK,
      operation: OPERATION,
      material: MATERIAL_P,
    });
    expect(r.status).toBe("ok");
    expect(r.predictions.length).toBe(2);
    const rpmPred = findPred(r.predictions, "rpm");
    expect(rpmPred.predicted_value).toBeGreaterThan(KERNEL_LOWER_BOUND_RPM);
    expect(rpmPred.predicted_value).toBeLessThan(KERNEL_UPPER_BOUND_RPM);
    expect(rpmPred.contributions.length).toBe(3);
    const sumPct = rpmPred.contributions.reduce((s, c) => s + c.contribution_pct, 0);
    expect(sumPct).toBeCloseTo(100, 4);
  });

  it("excludes self-source observations from a target's transfer", () => {
    CAMTransferLearningEngine.recordObservation(obs(TARGET_CAM, MATERIAL_P, { rpm: 9999 }));
    CAMTransferLearningEngine.recordObservation(obs("hypermill", MATERIAL_P, { rpm: 4500 }));
    const r = CAMTransferLearningEngine.transfer({
      target_cam: TARGET_CAM,
      task: TASK,
      operation: OPERATION,
      material: MATERIAL_P,
    });
    expect(r.status).toBe("low_evidence");
    expect(r.observations_considered).toBe(1);
    const rpmPred = findPred(r.predictions, "rpm");
    expect(rpmPred.predicted_value).toBe(4500);
  });

  it("respects source_cams filter", () => {
    CAMTransferLearningEngine.recordObservation(obs("hypermill", MATERIAL_P, { rpm: 4500 }));
    CAMTransferLearningEngine.recordObservation(obs("solidcam", MATERIAL_P, { rpm: 4000 }));
    const r = CAMTransferLearningEngine.transfer({
      target_cam: TARGET_CAM,
      task: TASK,
      operation: OPERATION,
      material: MATERIAL_P,
      source_cams: ["hypermill"],
    });
    const rpmPred = findPred(r.predictions, "rpm");
    expect(rpmPred.predicted_value).toBe(4500);
    expect(rpmPred.contributions).toHaveLength(1);
    expect(rpmPred.contributions[0].source_cam).toBe("hypermill");
  });

  it("recency decay weights newer observations more", () => {
    const now = Date.now();
    CAMTransferLearningEngine.recordObservation(
      obs("hypermill", MATERIAL_P, { rpm: 3000 }, { ts: now - STALE_OBS_MS }),
    );
    CAMTransferLearningEngine.recordObservation(
      obs("solidcam", MATERIAL_P, { rpm: 5000 }, { ts: now }),
    );
    const r = CAMTransferLearningEngine.transfer({
      target_cam: TARGET_CAM,
      task: TASK,
      operation: OPERATION,
      material: MATERIAL_P,
      tau_days: RECENT_TAU_DAYS,
    });
    const rpmPred = findPred(r.predictions, "rpm");
    expect(rpmPred.predicted_value).toBeGreaterThan(STALE_VS_RECENT_FLOOR);
  });

  it("flags low_evidence when only one observation exists", () => {
    CAMTransferLearningEngine.recordObservation(obs("hypermill", MATERIAL_P, { rpm: 4500 }));
    const r = CAMTransferLearningEngine.transfer({
      target_cam: TARGET_CAM,
      task: TASK,
      operation: OPERATION,
      material: MATERIAL_P,
    });
    expect(r.status).toBe("low_evidence");
    expect(r.predictions.length).toBe(1);
    expect(r.observations_considered).toBe(1);
  });

  it("flags low_similarity when source CAM is very far in feature space", () => {
    CAMTransferLearningEngine.registerCAMDomain(
      makeDomain("test-alien", {
        architecture: "mesh-based",
        adaptive_engine: "vortex",
        post_language: "lisp",
        cycle_lib_size: 5000,
        productivity_score: 0.05,
        install_base_score: 0.05,
        controller_dialects: 9999,
        multiaxis_native: 0,
        gpu_simulate: 0,
      }),
    );
    CAMTransferLearningEngine.recordObservation(
      obs("test-alien", MATERIAL_P, { rpm: 4500 }, { id: "alien-1" }),
    );
    CAMTransferLearningEngine.recordObservation(
      obs("test-alien", MATERIAL_P, { rpm: 4500 }, { id: "alien-2" }),
    );
    const r = CAMTransferLearningEngine.transfer({
      target_cam: TARGET_CAM,
      task: TASK,
      operation: OPERATION,
      material: MATERIAL_P,
    });
    expect(r.status).toBe("low_similarity");
  });
});

describe("CAMTransferLearningEngine — bestSourceCAM", () => {
  it("returns null when no observations match", () => {
    expect(
      CAMTransferLearningEngine.bestSourceCAM(TARGET_CAM, TASK, OPERATION, MATERIAL_P),
    ).toBeNull();
  });

  it("picks the source with the highest similarity-evidence score", () => {
    CAMTransferLearningEngine.recordObservation(obs("hypermill", MATERIAL_P, { rpm: 4500 }));
    CAMTransferLearningEngine.recordObservation(obs("solidcam", MATERIAL_P, { rpm: 4000 }));
    CAMTransferLearningEngine.recordObservation(obs("solidcam", MATERIAL_P, { rpm: 4100 }));
    CAMTransferLearningEngine.recordObservation(obs("solidcam", MATERIAL_P, { rpm: 4050 }));
    const best = CAMTransferLearningEngine.bestSourceCAM(
      TARGET_CAM,
      TASK,
      OPERATION,
      MATERIAL_P,
    );
    if (!best) throw new Error("bestSourceCAM should return a result with observations present");
    expect(best.source_cam).toBe("solidcam");
    expect(best.evidence_count).toBe(3);
    expect(best.similarity).toBeGreaterThan(0);
    expect(best.score).toBeGreaterThan(0);
  });
});

describe("CAMTransferLearningEngine — transfer-outcome telemetry", () => {
  it("aggregates outcomes per (source,target) pair with Wilson lower bound", () => {
    for (let i = 0; i < OUTCOMES_TOTAL; i++) {
      CAMTransferLearningEngine.recordTransferOutcome({
        decision_id: `d${i}`,
        source_cam: "hypermill",
        target_cam: TARGET_CAM,
        task: TASK,
        was_correct: i < OUTCOMES_HITS,
      });
    }
    const all = CAMTransferLearningEngine.transferAccuracy();
    expect(all).toHaveLength(1);
    expect(all[0].outcomes).toBe(OUTCOMES_TOTAL);
    expect(all[0].hits).toBe(OUTCOMES_HITS);
    expect(all[0].hit_rate).toBeCloseTo(OUTCOMES_HITS / OUTCOMES_TOTAL);
    expect(all[0].wilson_lower_95).toBeGreaterThan(0);
    expect(all[0].wilson_lower_95).toBeLessThan(all[0].hit_rate);
  });

  it("rejects malformed outcomes", () => {
    expect(() =>
      CAMTransferLearningEngine.recordTransferOutcome({
        decision_id: "",
        source_cam: "hypermill",
        target_cam: TARGET_CAM,
        task: TASK,
        was_correct: true,
      }),
    ).toThrow(/decision_id/);
  });
});

describe("CAMTransferLearningEngine — capacity management", () => {
  it("evicts oldest observations when cap is exceeded", () => {
    CAMTransferLearningEngine.setObservationCap(CAP_OBS);
    for (let i = 0; i < TOTAL_OBS_FOR_CAP; i++) {
      CAMTransferLearningEngine.recordObservation(
        obs("hypermill", MATERIAL_P, { rpm: 4000 + i }, { id: `o${i}` }),
      );
    }
    expect(CAMTransferLearningEngine.getObservationCount()).toBe(CAP_OBS);
    const ids = CAMTransferLearningEngine.listObservations().map((o) => o.id);
    expect(ids).toEqual(["o2", "o3", "o4"]);
  });

  it("setObservationCap rejects non-positive integers", () => {
    expect(() => CAMTransferLearningEngine.setObservationCap(0)).toThrow(/positive integer/);
    expect(() => CAMTransferLearningEngine.setObservationCap(-1)).toThrow(/positive integer/);
  });

  it("setOutcomeCap evicts oldest outcomes", () => {
    CAMTransferLearningEngine.setOutcomeCap(CAP_OUTCOMES);
    for (let i = 0; i < TOTAL_OUTCOMES_FOR_CAP; i++) {
      CAMTransferLearningEngine.recordTransferOutcome({
        decision_id: `d${i}`,
        source_cam: "hypermill",
        target_cam: TARGET_CAM,
        task: TASK,
        was_correct: true,
      });
    }
    expect(CAMTransferLearningEngine.getOutcomeCount()).toBe(CAP_OUTCOMES);
  });
});
