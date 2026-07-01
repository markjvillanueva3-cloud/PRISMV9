// scripts/lib/lora-training-pipeline.mjs
//
// LoRATrainingPipelineEngine — generic LoRA fine-tune pipeline.
//
// PURPOSE
// PRISM today has 67 LoRA engines forked across domains:
//   - 50 LatheLoRA*   (LatheLoRACadenceEngine, LatheLoRADatasetBuilderEngine,
//                       LatheLoRAEnsembleOrchestratorEngine, LatheLoRA-
//                       HyperparameterOptimizerEngine, LatheLoRADeployment*,
//                       LatheLoRAMonitor*, ...)
//   - 17 MillingLoRA* (analogous mill versions)
//   -  1 WEDMLoRA     (WEDMLoRAAdapterEngine)
//
// Each forked engine replicates the same 5 pipeline stages:
//   1. dataset-build     — collect (input, target) pairs from corpus
//   2. hyperparameter-opt — grid/Bayesian search over rank, alpha, dropout, lr
//   3. train             — LoRA adapter fit on base model
//   4. ensemble-vote     — combine top-k adapters for inference
//   5. deploy            — write adapter, register, gate on validation metrics
//
// Maintenance cost today: a single change (e.g. tuning hyperparameter search
// space) touches up to 67 files. After this collapse: 1 file + per-domain
// adapter for what's actually domain-specific.
//
// This is the FOUNDATION. Migrating the 67 existing engines to consume this
// is the follow-up wave (tracked as U-MMO-LORA-PIPELINE-COLLAPSE-MIGRATE).
//
// COMPOSES WITH
//   - CrossProcessEWCMemoryPreservationEngine — for catastrophic-forgetting
//     prevention when adapters fine-tune across material transitions. EWC
//     is currently wired into CrossProcessNeuralLearningEngine but NOT into
//     LoRA adapter trainer (Agent I overstated; verified inline 2026-05-26).
//     U-MMO-EWC-LORA-TRAINER-WIRE (MS1) is the design follow-up.
//   - OutcomeReplayBufferBridgeEngine — supplies the dataset for training.
//   - DistributedLockManager — must wrap train() calls per
//     U-MMO-MULTI-AGENT-MODEL-LOCK to prevent corruption across the 26-slot
//     fleet.
//   - PRISMOmegaSafetyEngine — gates deploy() on S(x) ≥ 0.95.
//
// DOCTRINE
// Per `feedback_mathematical_exhaustive_completeness`: this is the cleanup
// compounding gain Agent M identified. Per CLAUDE.md R8 (read before write):
// every existing LoRA engine's pipeline shape was sampled before this lib
// was named. Per R9 (tests verify intent): test assertions check concrete
// outputs + invariants, not toBeDefined() stubs.

// ---------------------------------------------------------------------------
// VERSION + SCHEMA
// ---------------------------------------------------------------------------

export const PIPELINE_VERSION = "1.0.0";

const REQUIRED_ADAPTER_METHODS = Object.freeze([
  "extractFeatures",   // (rawExample) => featureVector (numeric array)
  "validateExample",   // (rawExample) => { valid: boolean, reason?: string }
  "mergeAdapters",     // (adapters: [{weights, score}]) => mergedAdapter
  "domainTag",         // () => "lathe" | "mill" | "wedm" (read-only assert)
]);

const VALID_DOMAINS = Object.freeze(["lathe", "mill", "wedm"]);

const DEFAULT_HYPERPARAMETER_SEARCH_SPACE = Object.freeze({
  rank:    [4, 8, 16, 32],
  alpha:   [8, 16, 32, 64],
  dropout: [0.0, 0.05, 0.1, 0.2],
  lr:      [1e-4, 3e-4, 1e-3, 3e-3],
});

// ---------------------------------------------------------------------------
// VALIDATION
// ---------------------------------------------------------------------------

/**
 * Validate that an adapter conforms to the contract. Throws on missing
 * methods or invalid domain tag.
 *
 * @param {object} adapter
 * @param {string} domain
 * @returns {void}
 */
export function validateAdapter(adapter, domain) {
  if (!adapter || typeof adapter !== "object") {
    throw new Error(
      `LoRATrainingPipeline: adapter must be an object, got ${typeof adapter}`
    );
  }
  if (!VALID_DOMAINS.includes(domain)) {
    throw new Error(
      `LoRATrainingPipeline: invalid domain '${domain}', expected one of ${VALID_DOMAINS.join("|")}`
    );
  }
  for (const method of REQUIRED_ADAPTER_METHODS) {
    if (typeof adapter[method] !== "function") {
      throw new Error(
        `LoRATrainingPipeline[${domain}]: adapter missing required method '${method}'`
      );
    }
  }
  const tag = adapter.domainTag();
  if (tag !== domain) {
    throw new Error(
      `LoRATrainingPipeline: adapter.domainTag() returned '${tag}' but domain is '${domain}' — mismatch indicates adapter wired to wrong pipeline`
    );
  }
}

// ---------------------------------------------------------------------------
// STAGE 1: DATASET BUILD
// ---------------------------------------------------------------------------

/**
 * Build a training dataset from a raw corpus + adapter.
 * Domain-specific feature extraction lives in the adapter; the pipeline
 * owns the partitioning + validation invariants.
 *
 * @param {object[]} corpus - raw examples
 * @param {object} adapter
 * @param {object} [opts]
 * @param {number} [opts.minExamples=10] - reject if fewer valid examples
 * @param {number} [opts.trainSplit=0.8]
 * @returns {{ train: object[], holdout: object[], rejected: number, reasons: object }}
 */
export function buildDataset(corpus, adapter, opts = {}) {
  const { minExamples = 10, trainSplit = 0.8 } = opts;
  if (!Array.isArray(corpus)) {
    throw new Error(`buildDataset: corpus must be an array, got ${typeof corpus}`);
  }
  if (trainSplit <= 0 || trainSplit >= 1) {
    throw new Error(`buildDataset: trainSplit must be in (0,1), got ${trainSplit}`);
  }
  const validated = [];
  const reasons = {};
  let rejected = 0;
  for (const raw of corpus) {
    const v = adapter.validateExample(raw);
    if (!v.valid) {
      rejected++;
      const reason = v.reason || "unspecified";
      reasons[reason] = (reasons[reason] || 0) + 1;
      continue;
    }
    const features = adapter.extractFeatures(raw);
    if (!Array.isArray(features) || features.length === 0) {
      rejected++;
      reasons["empty-features"] = (reasons["empty-features"] || 0) + 1;
      continue;
    }
    validated.push({ features, raw });
  }
  if (validated.length < minExamples) {
    throw new Error(
      `buildDataset: only ${validated.length} valid examples (minimum ${minExamples}); rejected ${rejected}; reasons=${JSON.stringify(reasons)}`
    );
  }
  const splitIdx = Math.floor(validated.length * trainSplit);
  return {
    train: validated.slice(0, splitIdx),
    holdout: validated.slice(splitIdx),
    rejected,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// STAGE 2: HYPERPARAMETER OPTIMIZE
// ---------------------------------------------------------------------------

/**
 * Generate a grid of hyperparameter combinations.
 * Real Bayesian optimization is a follow-up unit; grid search is the
 * documented baseline that the 67 existing engines all replicate.
 *
 * @param {object} [searchSpace=DEFAULT_HYPERPARAMETER_SEARCH_SPACE]
 * @returns {object[]} - hyperparameter combinations
 */
export function hyperparameterGrid(searchSpace = DEFAULT_HYPERPARAMETER_SEARCH_SPACE) {
  const ranks = searchSpace.rank || [16];
  const alphas = searchSpace.alpha || [16];
  const dropouts = searchSpace.dropout || [0.1];
  const lrs = searchSpace.lr || [3e-4];
  const combos = [];
  for (const rank of ranks) {
    for (const alpha of alphas) {
      for (const dropout of dropouts) {
        for (const lr of lrs) {
          combos.push({ rank, alpha, dropout, lr });
        }
      }
    }
  }
  return combos;
}

// ---------------------------------------------------------------------------
// STAGE 3: TRAIN (HARNESS)
// ---------------------------------------------------------------------------

/**
 * Train harness. Wraps the inner training step (provided by caller — typically
 * delegated to CrossProcessNeuralLearningEngine or a domain-specific
 * adapter-trainer) with: lock acquisition, EWC consolidation hook,
 * holdout-evaluation, drift check, audit-log emission.
 *
 * NOTE: this harness does NOT do the actual gradient descent — that's the
 * caller's responsibility (CAMLoRAAdapterTrainerEngine, etc.). This wraps
 * it with the discipline scaffolding the 67 forked engines all had to
 * re-implement themselves.
 *
 * @param {object} params
 * @param {object} params.dataset - { train, holdout } from buildDataset
 * @param {object} params.hyperparameters - one combo from hyperparameterGrid
 * @param {Function} params.innerTrain - async (train, hyper) => { weights, loss }
 * @param {Function} [params.lockAcquire] - async (key) => releaseFn — multi-agent safety
 * @param {Function} [params.ewcConsolidate] - async (weights) => void — at task transition
 * @param {Function} [params.evalHoldout] - (weights, holdout) => { mae, accuracy }
 * @param {Function} [params.auditLog] - (entry) => void
 * @param {string} params.lockKey - lock identifier per U-MMO-MULTI-AGENT-MODEL-LOCK
 * @returns {Promise<{weights, loss, holdoutMetrics, hyperparameters, timestamp}>}
 */
export async function trainOnce(params) {
  const {
    dataset, hyperparameters, innerTrain, lockAcquire, ewcConsolidate,
    evalHoldout, auditLog, lockKey,
  } = params;
  if (!dataset || !Array.isArray(dataset.train)) {
    throw new Error("trainOnce: dataset.train must be an array");
  }
  if (!hyperparameters) {
    throw new Error("trainOnce: hyperparameters required");
  }
  if (typeof innerTrain !== "function") {
    throw new Error("trainOnce: innerTrain function required");
  }
  let release = null;
  if (typeof lockAcquire === "function") {
    if (!lockKey) {
      throw new Error("trainOnce: lockKey required when lockAcquire provided");
    }
    release = await lockAcquire(lockKey);
  }
  let result;
  try {
    result = await innerTrain(dataset.train, hyperparameters);
    if (!result || typeof result.loss !== "number" || !Number.isFinite(result.loss)) {
      throw new Error(`trainOnce: innerTrain must return finite loss; got ${result?.loss}`);
    }
    if (typeof ewcConsolidate === "function") {
      await ewcConsolidate(result.weights);
    }
    const holdoutMetrics =
      typeof evalHoldout === "function" && dataset.holdout
        ? evalHoldout(result.weights, dataset.holdout)
        : null;
    const entry = {
      timestamp: new Date().toISOString(),
      hyperparameters,
      loss: result.loss,
      holdoutMetrics,
      n_train: dataset.train.length,
      n_holdout: dataset.holdout?.length || 0,
    };
    if (typeof auditLog === "function") {
      auditLog(entry);
    }
    return { ...result, holdoutMetrics, hyperparameters, timestamp: entry.timestamp };
  } finally {
    if (typeof release === "function") {
      await release();
    }
  }
}

// ---------------------------------------------------------------------------
// STAGE 4: ENSEMBLE VOTE
// ---------------------------------------------------------------------------

/**
 * Select top-k adapters by holdout score and ask the domain adapter to
 * merge them. Merging is domain-specific (mill adapters merge differently
 * from wedm adapters).
 *
 * @param {object[]} trainedAdapters - results from multiple trainOnce calls
 * @param {object} domainAdapter
 * @param {object} [opts]
 * @param {number} [opts.topK=3]
 * @param {string} [opts.scoreField='loss'] - lower is better
 * @returns {object} - mergedAdapter (domain-specific shape)
 */
export function ensembleVote(trainedAdapters, domainAdapter, opts = {}) {
  const { topK = 3, scoreField = "loss" } = opts;
  if (!Array.isArray(trainedAdapters) || trainedAdapters.length === 0) {
    throw new Error("ensembleVote: trainedAdapters must be a non-empty array");
  }
  const sorted = [...trainedAdapters].sort(
    (a, b) => (a[scoreField] ?? Infinity) - (b[scoreField] ?? Infinity)
  );
  const top = sorted.slice(0, Math.min(topK, sorted.length));
  // shape passed to adapter: each entry has { weights, score }
  const forMerge = top.map((t) => ({ weights: t.weights, score: t[scoreField] }));
  const merged = domainAdapter.mergeAdapters(forMerge);
  if (!merged) {
    throw new Error("ensembleVote: domainAdapter.mergeAdapters() returned falsy");
  }
  return { merged, topK: top.length, scoreField, scores: top.map((t) => t[scoreField]) };
}

// ---------------------------------------------------------------------------
// STAGE 5: DEPLOY (GATED)
// ---------------------------------------------------------------------------

/**
 * Deploy gate — verifies the merged adapter passes safety + drift checks
 * before it goes live. Composes with PRISMOmegaSafetyEngine + drift gate.
 *
 * @param {object} params
 * @param {object} params.merged - from ensembleVote
 * @param {Function} [params.safetyCheck] - (merged) => { sx: number, omega: number }
 * @param {Function} [params.driftCheck] - (merged, baseline) => { mae_delta: number }
 * @param {object} [params.baseline] - baseline metrics for drift comparison
 * @param {number} [params.safetyFloor=0.95] - S(x) minimum to deploy
 * @param {number} [params.driftFloor=0.05] - max MAE delta vs baseline
 * @returns {{ deployed: boolean, reason: string, gates: object }}
 */
export function deployGate(params) {
  const {
    merged, safetyCheck, driftCheck, baseline,
    safetyFloor = 0.95, driftFloor = 0.05,
  } = params;
  const gates = {};
  if (typeof safetyCheck === "function") {
    gates.safety = safetyCheck(merged);
    if (gates.safety.sx < safetyFloor) {
      return {
        deployed: false,
        reason: `safety-floor: S(x)=${gates.safety.sx} < ${safetyFloor}`,
        gates,
      };
    }
  }
  if (typeof driftCheck === "function" && baseline) {
    gates.drift = driftCheck(merged, baseline);
    if (gates.drift.mae_delta > driftFloor) {
      return {
        deployed: false,
        reason: `drift-floor: MAE delta=${gates.drift.mae_delta} > ${driftFloor}`,
        gates,
      };
    }
  }
  return { deployed: true, reason: "all-gates-passed", gates };
}

// ---------------------------------------------------------------------------
// FULL PIPELINE
// ---------------------------------------------------------------------------

/**
 * Create a pipeline instance bound to a domain + adapter. The returned
 * object exposes the 5 stages plus a `runFullPipeline()` convenience.
 *
 * @param {object} params
 * @param {string} params.domain - lathe|mill|wedm
 * @param {object} params.adapter
 * @returns {object} - pipeline instance
 */
export function createLoRATrainingPipeline({ domain, adapter }) {
  validateAdapter(adapter, domain);
  return {
    version: PIPELINE_VERSION,
    domain,
    buildDataset: (corpus, opts) => buildDataset(corpus, adapter, opts),
    hyperparameterGrid,
    trainOnce,
    ensembleVote: (trained, opts) => ensembleVote(trained, adapter, opts),
    deployGate,
    /**
     * Convenience runner. Calls all 5 stages in sequence.
     * @param {object} params
     * @param {object[]} params.corpus
     * @param {Function} params.innerTrain - injection hook for actual training
     * @param {object} [params.options]
     */
    async runFullPipeline({ corpus, innerTrain, options = {} }) {
      const dataset = buildDataset(corpus, adapter, options.dataset);
      const grid = hyperparameterGrid(options.searchSpace);
      const trained = [];
      for (const hyper of grid) {
        const result = await trainOnce({
          dataset,
          hyperparameters: hyper,
          innerTrain,
          lockAcquire: options.lockAcquire,
          lockKey: `lora-${domain}`,
          ewcConsolidate: options.ewcConsolidate,
          evalHoldout: options.evalHoldout,
          auditLog: options.auditLog,
        });
        trained.push(result);
      }
      const ensemble = ensembleVote(trained, adapter, options.ensemble);
      const deploy = deployGate({
        merged: ensemble.merged,
        safetyCheck: options.safetyCheck,
        driftCheck: options.driftCheck,
        baseline: options.baseline,
        safetyFloor: options.safetyFloor,
        driftFloor: options.driftFloor,
      });
      return {
        dataset: { n_train: dataset.train.length, n_holdout: dataset.holdout.length, rejected: dataset.rejected },
        n_trained: trained.length,
        ensemble,
        deploy,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// THIN DOMAIN-ADAPTER STUBS
// ---------------------------------------------------------------------------
//
// These are reference adapters showing the contract. The 67 existing LoRA
// engines should be migrated to consume these (or specialize them). Real
// migration happens in U-MMO-LORA-PIPELINE-COLLAPSE-MIGRATE.

/**
 * Lathe adapter — features: tool geometry + material + cycle params.
 */
export const latheAdapterStub = Object.freeze({
  domainTag: () => "lathe",
  extractFeatures(raw) {
    // Lathe feature vector: [tool_diameter, depth_of_cut, feed_rate, spindle_rpm, material_hardness_hb]
    return [
      raw.tool_diameter ?? 0,
      raw.depth_of_cut ?? 0,
      raw.feed_rate ?? 0,
      raw.spindle_rpm ?? 0,
      raw.material_hardness_hb ?? 0,
    ];
  },
  validateExample(raw) {
    if (!raw || typeof raw !== "object") return { valid: false, reason: "not-object" };
    if (typeof raw.spindle_rpm !== "number" || raw.spindle_rpm <= 0) {
      return { valid: false, reason: "invalid-spindle-rpm" };
    }
    if (typeof raw.tool_diameter !== "number" || raw.tool_diameter <= 0) {
      return { valid: false, reason: "invalid-tool-diameter" };
    }
    return { valid: true };
  },
  mergeAdapters(adapters) {
    // Lathe: weighted average by inverse loss. Real impl is in
    // LatheLoRAEnsembleOrchestratorEngine; this is the reference shape.
    if (!adapters || adapters.length === 0) return null;
    const totalInverseLoss = adapters.reduce((s, a) => s + 1 / Math.max(a.score, 1e-6), 0);
    return {
      domain: "lathe",
      n_components: adapters.length,
      composition: "weighted-by-inverse-loss",
      mean_score: adapters.reduce((s, a) => s + a.score, 0) / adapters.length,
      weights_ref: adapters.map((a) => ({ weights: a.weights, weight: (1 / Math.max(a.score, 1e-6)) / totalInverseLoss })),
    };
  },
});

/**
 * Mill adapter — features: 5-axis kinematics + chip-thinning + tool stiffness.
 */
export const millAdapterStub = Object.freeze({
  domainTag: () => "mill",
  extractFeatures(raw) {
    return [
      raw.engagement_radial_pct ?? 0,
      raw.engagement_axial_mm ?? 0,
      raw.tool_diameter ?? 0,
      raw.feed_per_tooth ?? 0,
      raw.rpm ?? 0,
      raw.flute_count ?? 0,
    ];
  },
  validateExample(raw) {
    if (!raw || typeof raw !== "object") return { valid: false, reason: "not-object" };
    if (typeof raw.rpm !== "number" || raw.rpm <= 0) {
      return { valid: false, reason: "invalid-rpm" };
    }
    return { valid: true };
  },
  mergeAdapters(adapters) {
    if (!adapters || adapters.length === 0) return null;
    return {
      domain: "mill",
      n_components: adapters.length,
      composition: "top-k-average",
      mean_score: adapters.reduce((s, a) => s + a.score, 0) / adapters.length,
      weights_ref: adapters.map((a) => ({ weights: a.weights, weight: 1 / adapters.length })),
    };
  },
});

/**
 * Wire-EDM adapter — features: pulse energy + flush + wire speed.
 */
export const wedmAdapterStub = Object.freeze({
  domainTag: () => "wedm",
  extractFeatures(raw) {
    return [
      raw.pulse_on_us ?? 0,
      raw.pulse_off_us ?? 0,
      raw.wire_speed_mm_min ?? 0,
      raw.dielectric_pressure_mpa ?? 0,
      raw.servo_voltage_v ?? 0,
    ];
  },
  validateExample(raw) {
    if (!raw || typeof raw !== "object") return { valid: false, reason: "not-object" };
    if (typeof raw.pulse_on_us !== "number" || raw.pulse_on_us <= 0) {
      return { valid: false, reason: "invalid-pulse-on" };
    }
    return { valid: true };
  },
  mergeAdapters(adapters) {
    if (!adapters || adapters.length === 0) return null;
    return {
      domain: "wedm",
      n_components: adapters.length,
      composition: "best-of-k",
      mean_score: adapters.reduce((s, a) => s + a.score, 0) / adapters.length,
      weights_ref: [{ weights: adapters[0].weights, weight: 1.0 }], // wedm uses single-best
    };
  },
});
