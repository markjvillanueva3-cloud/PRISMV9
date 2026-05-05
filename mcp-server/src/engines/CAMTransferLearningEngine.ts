/**
 * CAMTransferLearningEngine — CAM-EXHAUST-MS0/U-CAM121
 *
 * Cross-CAM knowledge transfer: outcomes learned in one CAM system (e.g.
 * hyperMILL) are projected onto a target CAM (e.g. Mastercam) via kernel-
 * weighted nearest-neighbour over a CAM domain feature vector.
 *
 * Distinct from neighbouring engines:
 *   - CAMCrossSystemTranslatorEngine  : maps PARAMETER NAMES across CAM
 *                                       lexicons (vocabulary translation).
 *   - LatheTransferLearningEngine     : material/operation/machine transfer
 *                                       within the lathe domain.
 *   - CrossProcessTransferLearningEngine: process bridges (mill ↔ lathe ↔
 *                                          WEDM); operates at process level.
 *   - This engine                      : value-level transfer of observed
 *                                       parameter outcomes between CAM
 *                                       systems for the same physical task.
 *
 * The two are designed to compose: TransferLearningEngine produces predicted
 * parameter VALUES for the target CAM, then CAMCrossSystemTranslatorEngine
 * relabels them onto that CAM's parameter NAMES.
 *
 * Math (Pan & Yang 2010 §3.4 — instance-based transfer):
 *
 *   1. Domain similarity sim(s,t) ∈ [0,1] is built from a Gaussian kernel
 *      over the CAM feature vector:
 *
 *          sim(s,t) = (1−α)·exp(−‖vᵢ(s) − vᵢ(t)‖² / 2σ²)  +  α·match(c(s),c(t))
 *
 *      where vᵢ are the numeric/normalized feature dims, c is the categorical
 *      tuple (architecture, post_lang, adaptive_engine), match() is the
 *      fraction of categorical fields equal, σ is the mean pairwise distance
 *      across registered CAMs (median-rule bandwidth, Gretton 2012), and α
 *      = 0.4 weights the categorical contribution.
 *
 *   2. Predicted target value for parameter p is the kernel-weighted mean
 *      over source observations matching the same (task, material, op):
 *
 *          v̂_t = Σ_i sim(s_i,t)·w_i·v_i / Σ_i sim(s_i,t)·w_i
 *
 *      with recency weight w_i = exp(−(now − ts_i) / τ), τ = 30 days.
 *
 *   3. Confidence tracks both kernel mass and outcome count:
 *
 *          c = min(0.95, 0.5·sim_max + 0.45·(1 − exp(−n / 5)))
 *
 *      so a single distant observation never reaches 0.5, and ≥5 close
 *      observations saturate near 0.95.
 *
 * Outcome feedback: recordTransferOutcome() trains nothing — it appends to
 * a per-pair ring buffer used by transferAccuracy() to surface the empirical
 * historical hit-rate for any (source_cam, target_cam) pair, exposed back
 * to the caller for trust calibration.
 *
 * Operator-in-the-loop: every transfer output carries a prediction interval
 * derived from the weighted standard deviation of source values, plus the
 * kernel similarity, recency mass, and outcome history. The caller is
 * expected to surface these to a human before applying the predicted
 * parameters in production (PRISM unconditional rule).
 *
 * Storage: in-memory Maps with FIFO eviction at MAX_OBS (default 5000) and
 * MAX_OUTCOMES (default 2000). Per-process — persistence is intentionally
 * out of scope for U-CAM121.
 *
 * References:
 *   - Pan, S.J. & Yang, Q. (2010) "A Survey on Transfer Learning" IEEE TKDE 22:10
 *   - Gretton, A. et al. (2012) "A Kernel Two-Sample Test" JMLR 13
 *   - Daumé III, H. (2007) "Frustratingly Easy Domain Adaptation" ACL
 *
 * Authored 2026-05-05 — CAM-EXHAUST-MS0/U-CAM121.
 */

import { isCAMSlug } from "../registries/CAMSystemRegistry.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES — DOMAIN REPRESENTATION
// ═══════════════════════════════════════════════════════════════════════════

export type CAMArchitecture =
  | "history-based"
  | "direct-modeling"
  | "feature-based"
  | "mesh-based"
  | "hybrid";

export type CAMPostLanguage = "javascript" | "python" | "lisp" | "csharp" | "cpp" | "proprietary";

export type CAMAdaptiveEngine =
  | "native"
  | "imachining"
  | "volumill"
  | "vortex"
  | "dynamic-motion"
  | "tnc-rmt"
  | "none";

/**
 * Numeric + categorical features for a CAM system. Numeric features are
 * normalized to z-scores at similarity time across the currently registered
 * CAMs; categorical contribute via Hamming agreement.
 */
export interface CAMDomainFeatures {
  slug: string;
  architecture: CAMArchitecture;
  /** Number of canned strategies / cycles in the catalog. */
  cycle_lib_size: number;
  /** Native simultaneous 5-axis support (0|1). */
  multiaxis_native: 0 | 1;
  /** Canned adaptive-clearing engine. */
  adaptive_engine: CAMAdaptiveEngine;
  /** Post-processor language. */
  post_language: CAMPostLanguage;
  /** GPU-accelerated simulation (0|1). */
  gpu_simulate: 0 | 1;
  /** Number of post-processor dialects shipped. */
  controller_dialects: number;
  /** Operator productivity score 0..1 — relative ease-of-use heuristic. */
  productivity_score: number;
  /** Mass-market install base score 0..1 — informs evidence weighting. */
  install_base_score: number;
}

export interface CAMSourceObservation {
  /** Stable observation id. */
  id: string;
  /** CAM slug producing the observation. */
  source_cam: string;
  /** Logical task — same vocabulary as CAMDeepLearningOrchestratorEngine. */
  task: "strategy_recommend" | "parameter_extract" | "operation_classify" | "tool_select_advisor";
  /** Operation type (e.g. "pocket_2d", "adaptive_3d"). */
  operation: string;
  /** Material (ISO group letter or canonical alloy). */
  material: string;
  /** Numeric parameters that succeeded (operator-confirmed). */
  parameters: Record<string, number>;
  /** Optional success-magnitude in [0,1]. Defaults to 1. */
  success: number;
  /** Capture timestamp ms. */
  ts: number;
  /** Optional free-form note. */
  notes?: string;
}

export interface CAMTransferRequest {
  target_cam: string;
  task: CAMSourceObservation["task"];
  operation: string;
  material: string;
  /** Optional restriction to a subset of source CAMs. */
  source_cams?: string[];
  /** Subset of parameters to predict. Empty ⇒ predict all observed. */
  parameters?: string[];
  /** σ override (kernel bandwidth). Defaults to median pairwise distance. */
  sigma?: number;
  /** Recency time-constant in days. Defaults to 30. */
  tau_days?: number;
}

export interface CAMTransferPrediction {
  parameter: string;
  predicted_value: number;
  /** Sample SD across kernel-weighted contributions. */
  uncertainty_sd: number;
  /** Number of source observations used. */
  evidence_count: number;
  /** Maximum source-CAM similarity used in the prediction. */
  max_source_similarity: number;
  /** Per-source contribution table for explainability. */
  contributions: Array<{
    source_cam: string;
    similarity: number;
    recency_weight: number;
    contribution_pct: number;
  }>;
}

export interface CAMTransferResult {
  target_cam: string;
  task: CAMSourceObservation["task"];
  operation: string;
  material: string;
  predictions: CAMTransferPrediction[];
  /** Aggregate confidence in [0,1] across all predicted parameters. */
  confidence: number;
  /** "ok" | "no_evidence" | "low_similarity" | "low_evidence". */
  status: "ok" | "no_evidence" | "low_similarity" | "low_evidence";
  /** Free-form rationale describing the transfer regime. */
  rationale: string;
  /** Number of source observations considered before parameter slicing. */
  observations_considered: number;
  /** Bandwidth σ actually used. */
  sigma_used: number;
}

export interface CAMTransferOutcome {
  /** Free-form id for the operator's decision context. */
  decision_id: string;
  source_cam: string;
  target_cam: string;
  task: CAMSourceObservation["task"];
  /** True if the transferred prediction was accepted/worked. */
  was_correct: boolean;
  ts: number;
}

export interface CAMTransferAccuracy {
  source_cam: string;
  target_cam: string;
  outcomes: number;
  hits: number;
  hit_rate: number;
  /** Wilson score 95% lower bound on hit_rate. */
  wilson_lower_95: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT TIER-1 CAM DOMAIN VECTORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Conservative defaults for the six tier-1 CAMs. Numeric values are PRISM
 * internal heuristics derived from the catalog scrape (cycle_lib_size,
 * controller_dialects) and vendor documentation (other flags). Adjust via
 * registerCAMDomain() to override.
 */
const DEFAULT_CAM_DOMAINS: ReadonlyArray<CAMDomainFeatures> = [
  {
    slug: "hypermill",
    architecture: "feature-based",
    cycle_lib_size: 145,
    multiaxis_native: 1,
    adaptive_engine: "native",
    post_language: "javascript",
    gpu_simulate: 1,
    controller_dialects: 320,
    productivity_score: 0.82,
    install_base_score: 0.55,
  },
  {
    slug: "mastercam",
    architecture: "history-based",
    cycle_lib_size: 220,
    multiaxis_native: 1,
    adaptive_engine: "dynamic-motion",
    post_language: "lisp",
    gpu_simulate: 1,
    controller_dialects: 450,
    productivity_score: 0.78,
    install_base_score: 0.95,
  },
  {
    slug: "fusion360",
    architecture: "history-based",
    cycle_lib_size: 95,
    multiaxis_native: 1,
    adaptive_engine: "dynamic-motion",
    post_language: "javascript",
    gpu_simulate: 1,
    controller_dialects: 180,
    productivity_score: 0.86,
    install_base_score: 0.92,
  },
  {
    slug: "inventor-hsm",
    architecture: "history-based",
    cycle_lib_size: 88,
    multiaxis_native: 0,
    adaptive_engine: "dynamic-motion",
    post_language: "javascript",
    gpu_simulate: 1,
    controller_dialects: 175,
    productivity_score: 0.76,
    install_base_score: 0.55,
  },
  {
    slug: "solidcam",
    architecture: "feature-based",
    cycle_lib_size: 180,
    multiaxis_native: 1,
    adaptive_engine: "imachining",
    post_language: "csharp",
    gpu_simulate: 1,
    controller_dialects: 240,
    productivity_score: 0.80,
    install_base_score: 0.65,
  },
  {
    slug: "nx",
    architecture: "feature-based",
    cycle_lib_size: 260,
    multiaxis_native: 1,
    adaptive_engine: "native",
    post_language: "csharp",
    gpu_simulate: 1,
    controller_dialects: 380,
    productivity_score: 0.74,
    install_base_score: 0.70,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const CAT_WEIGHT = 0.4;
const RECENCY_TAU_MS_DEFAULT = 30 * 24 * 60 * 60 * 1000; // 30 days
const MIN_SIMILARITY_OK = 0.35;
const MIN_EVIDENCE_OK = 2;
const MAX_OBS_DEFAULT = 5000;
const MAX_OUTCOMES_DEFAULT = 2000;
const MAX_CONFIDENCE = 0.95;

/** Numeric feature dimension keys, in stable order for vector ops. */
const NUMERIC_DIMS: ReadonlyArray<keyof CAMDomainFeatures> = [
  "cycle_lib_size",
  "multiaxis_native",
  "gpu_simulate",
  "controller_dialects",
  "productivity_score",
  "install_base_score",
];

/** Categorical dimension keys. */
const CATEGORICAL_DIMS: ReadonlyArray<keyof CAMDomainFeatures> = [
  "architecture",
  "adaptive_engine",
  "post_language",
];

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

interface InternalState {
  domains: Map<string, CAMDomainFeatures>;
  observations: CAMSourceObservation[];
  outcomes: CAMTransferOutcome[];
  maxObs: number;
  maxOutcomes: number;
}

function freshState(): InternalState {
  const domains = new Map<string, CAMDomainFeatures>();
  for (const d of DEFAULT_CAM_DOMAINS) domains.set(d.slug, { ...d });
  return {
    domains,
    observations: [],
    outcomes: [],
    maxObs: MAX_OBS_DEFAULT,
    maxOutcomes: MAX_OUTCOMES_DEFAULT,
  };
}

const state: InternalState = freshState();

function ensureValidSlug(slug: string, label: string): void {
  if (!slug || typeof slug !== "string") {
    throw new Error(`${label} must be a non-empty string`);
  }
  // Allow registry slugs as well as ad-hoc test slugs prefixed "test-".
  if (isCAMSlug(slug) || slug.startsWith("test-") || state.domains.has(slug)) return;
  throw new Error(
    `${label} '${slug}' is not in CAMSystemRegistry. Register the domain first or use a 'test-' prefix.`
  );
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function categoricalAgreement(a: CAMDomainFeatures, b: CAMDomainFeatures): number {
  let hits = 0;
  for (const k of CATEGORICAL_DIMS) {
    if (a[k] === b[k]) hits++;
  }
  return hits / CATEGORICAL_DIMS.length;
}

/** Compute z-score normalization stats over the registered CAM domains. */
function numericStats(): { mean: number[]; std: number[] } {
  const slugs = [...state.domains.values()];
  const n = slugs.length || 1;
  const mean = new Array(NUMERIC_DIMS.length).fill(0);
  for (const d of slugs) {
    NUMERIC_DIMS.forEach((k, i) => {
      mean[i] += Number(d[k] ?? 0);
    });
  }
  for (let i = 0; i < mean.length; i++) mean[i] /= n;
  const variance = new Array(NUMERIC_DIMS.length).fill(0);
  for (const d of slugs) {
    NUMERIC_DIMS.forEach((k, i) => {
      const v = Number(d[k] ?? 0);
      variance[i] += (v - mean[i]) ** 2;
    });
  }
  const std = variance.map((v) => Math.sqrt(v / n) || 1);
  return { mean, std };
}

function numericVector(d: CAMDomainFeatures, mean: number[], std: number[]): number[] {
  return NUMERIC_DIMS.map((k, i) => (Number(d[k] ?? 0) - mean[i]) / std[i]);
}

function vecDist(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

/** Median pairwise distance across all registered CAMs (Gretton bandwidth). */
function medianBandwidth(): number {
  const stats = numericStats();
  const vecs = [...state.domains.values()].map((d) => numericVector(d, stats.mean, stats.std));
  const dists: number[] = [];
  for (let i = 0; i < vecs.length; i++) {
    for (let j = i + 1; j < vecs.length; j++) dists.push(vecDist(vecs[i], vecs[j]));
  }
  if (dists.length === 0) return 1;
  dists.sort((a, b) => a - b);
  const med = dists[Math.floor(dists.length / 2)];
  return med > 0 ? med : 1;
}

function similarity(
  source: string,
  target: string,
  sigmaOverride?: number
): { sim: number; numericKernel: number; categoricalAgreement: number } {
  const a = state.domains.get(source);
  const b = state.domains.get(target);
  if (!a || !b) return { sim: 0, numericKernel: 0, categoricalAgreement: 0 };
  const stats = numericStats();
  const va = numericVector(a, stats.mean, stats.std);
  const vb = numericVector(b, stats.mean, stats.std);
  const sigma = sigmaOverride ?? medianBandwidth();
  const dist = vecDist(va, vb);
  const numKernel = Math.exp(-(dist * dist) / (2 * sigma * sigma));
  const cat = categoricalAgreement(a, b);
  const sim = clamp01((1 - CAT_WEIGHT) * numKernel + CAT_WEIGHT * cat);
  return { sim, numericKernel: numKernel, categoricalAgreement: cat };
}

function recencyWeight(tsMs: number, tauMs: number, nowMs: number): number {
  const dt = Math.max(0, nowMs - tsMs);
  return Math.exp(-dt / tauMs);
}

function wilsonLower95(hits: number, total: number): number {
  if (total <= 0) return 0;
  const z = 1.96;
  const p = hits / total;
  const denom = 1 + (z * z) / total;
  const center = p + (z * z) / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return Math.max(0, (center - margin) / denom);
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

export class CAMTransferLearningEngine {
  /**
   * Register / overwrite a CAM domain feature vector.
   * @throws if features.slug is empty or contains non-finite numerics.
   */
  static registerCAMDomain(features: CAMDomainFeatures): CAMDomainFeatures {
    if (!features.slug) throw new Error("features.slug is required");
    for (const k of NUMERIC_DIMS) {
      const v = Number(features[k] ?? 0);
      if (!Number.isFinite(v)) {
        throw new Error(`features.${String(k)} must be finite, got ${features[k]}`);
      }
    }
    const stored = { ...features };
    state.domains.set(features.slug, stored);
    return stored;
  }

  /** Return registered CAM slugs in insertion order. */
  static listSupportedCAMs(): string[] {
    return [...state.domains.keys()];
  }

  static getDomain(slug: string): CAMDomainFeatures | undefined {
    return state.domains.get(slug);
  }

  /**
   * Compute domain similarity between two CAMs.
   * @returns sim ∈ [0,1] plus the numeric-kernel and categorical-agreement
   *   components for explainability.
   */
  static domainSimilarity(
    sourceCam: string,
    targetCam: string,
    sigma?: number
  ): { sim: number; numericKernel: number; categoricalAgreement: number } {
    ensureValidSlug(sourceCam, "sourceCam");
    ensureValidSlug(targetCam, "targetCam");
    return similarity(sourceCam, targetCam, sigma);
  }

  /**
   * Append a source-CAM observation. Caller is responsible for ensuring the
   * observation is operator-confirmed.
   */
  static recordObservation(
    obs: Omit<CAMSourceObservation, "id" | "ts" | "success"> & {
      id?: string;
      ts?: number;
      success?: number;
    }
  ): CAMSourceObservation {
    ensureValidSlug(obs.source_cam, "source_cam");
    if (!obs.task) throw new Error("obs.task is required");
    if (!obs.operation) throw new Error("obs.operation is required");
    if (!obs.material) throw new Error("obs.material is required");
    if (!obs.parameters || typeof obs.parameters !== "object") {
      throw new Error("obs.parameters must be a non-empty record");
    }
    const params: Record<string, number> = {};
    for (const [k, v] of Object.entries(obs.parameters)) {
      const n = Number(v);
      if (!Number.isFinite(n)) {
        throw new Error(`parameters.${k} must be finite numeric, got ${v}`);
      }
      params[k] = n;
    }
    const stored: CAMSourceObservation = {
      id: obs.id ?? `cam-tl-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      source_cam: obs.source_cam,
      task: obs.task,
      operation: obs.operation,
      material: obs.material,
      parameters: params,
      success: clamp01(obs.success ?? 1),
      ts: obs.ts ?? Date.now(),
      notes: obs.notes,
    };
    state.observations.push(stored);
    while (state.observations.length > state.maxObs) state.observations.shift();
    return stored;
  }

  /**
   * Predict target-CAM parameters for (task, operation, material) using
   * kernel-weighted nearest-neighbour over registered source observations.
   */
  static transfer(req: CAMTransferRequest): CAMTransferResult {
    ensureValidSlug(req.target_cam, "target_cam");
    if (!req.task) throw new Error("req.task is required");
    if (!req.operation) throw new Error("req.operation is required");
    if (!req.material) throw new Error("req.material is required");

    const tauMs = (req.tau_days ?? 30) * 24 * 60 * 60 * 1000;
    const sigma = req.sigma ?? medianBandwidth();
    const now = Date.now();
    const allowedSources = new Set(req.source_cams ?? []);
    const useFilter = allowedSources.size > 0;

    // Gather relevant observations
    const candidates = state.observations.filter((o) => {
      if (o.source_cam === req.target_cam) return false;
      if (useFilter && !allowedSources.has(o.source_cam)) return false;
      return o.task === req.task && o.operation === req.operation && o.material === req.material;
    });

    if (candidates.length === 0) {
      return {
        target_cam: req.target_cam,
        task: req.task,
        operation: req.operation,
        material: req.material,
        predictions: [],
        confidence: 0,
        status: "no_evidence",
        rationale: `No source observations for task=${req.task} operation=${req.operation} material=${req.material}`,
        observations_considered: 0,
        sigma_used: sigma,
      };
    }

    // Pre-compute per-observation similarity & recency
    const enriched = candidates.map((o) => {
      const { sim } = similarity(o.source_cam, req.target_cam, sigma);
      const rec = recencyWeight(o.ts, tauMs, now);
      return {
        obs: o,
        sim,
        rec,
        weight: sim * rec * o.success,
      };
    });

    // Determine which parameters to predict
    const paramSet = new Set<string>();
    for (const e of enriched) Object.keys(e.obs.parameters).forEach((k) => paramSet.add(k));
    const requested = req.parameters && req.parameters.length > 0 ? req.parameters : [...paramSet];

    const predictions: CAMTransferPrediction[] = [];
    let maxSim = 0;

    for (const p of requested) {
      const contributing = enriched.filter((e) => p in e.obs.parameters);
      const totalW = contributing.reduce((s, e) => s + e.weight, 0);
      if (contributing.length === 0 || totalW <= 0) continue;
      let mean = 0;
      for (const e of contributing) mean += (e.weight / totalW) * e.obs.parameters[p];
      let variance = 0;
      for (const e of contributing) {
        const d = e.obs.parameters[p] - mean;
        variance += (e.weight / totalW) * d * d;
      }
      const localMaxSim = Math.max(...contributing.map((e) => e.sim));
      maxSim = Math.max(maxSim, localMaxSim);
      const contribTable = contributing
        .map((e) => ({
          source_cam: e.obs.source_cam,
          similarity: e.sim,
          recency_weight: e.rec,
          contribution_pct: (e.weight / totalW) * 100,
        }))
        .sort((a, b) => b.contribution_pct - a.contribution_pct);

      predictions.push({
        parameter: p,
        predicted_value: mean,
        uncertainty_sd: Math.sqrt(variance),
        evidence_count: contributing.length,
        max_source_similarity: localMaxSim,
        contributions: contribTable,
      });
    }

    const evidenceTotal = candidates.length;
    let status: CAMTransferResult["status"] = "ok";
    if (predictions.length === 0) status = "no_evidence";
    else if (maxSim < MIN_SIMILARITY_OK) status = "low_similarity";
    else if (evidenceTotal < MIN_EVIDENCE_OK) status = "low_evidence";

    const evidenceFactor = 1 - Math.exp(-evidenceTotal / 5);
    const confidence =
      predictions.length === 0
        ? 0
        : Math.min(MAX_CONFIDENCE, 0.5 * maxSim + 0.45 * evidenceFactor);

    const rationale =
      status === "ok"
        ? `Predicted ${predictions.length} parameter(s) via kernel-weighted transfer over ${evidenceTotal} source observation(s); max sim=${maxSim.toFixed(3)}`
        : status === "low_similarity"
          ? `Source CAM(s) too dissimilar (max sim=${maxSim.toFixed(3)} < ${MIN_SIMILARITY_OK}); prediction returned but treat as advisory`
          : status === "low_evidence"
            ? `Only ${evidenceTotal} source observation(s); collect more before relying on the transfer`
            : `No source observations matched`;

    return {
      target_cam: req.target_cam,
      task: req.task,
      operation: req.operation,
      material: req.material,
      predictions,
      confidence,
      status,
      rationale,
      observations_considered: evidenceTotal,
      sigma_used: sigma,
    };
  }

  /**
   * Pick the most-promising source CAM for a given target CAM under (task,
   * operation, material). Combines similarity with the count of stored
   * observations.
   */
  static bestSourceCAM(
    targetCam: string,
    task: CAMSourceObservation["task"],
    operation: string,
    material: string
  ): { source_cam: string; similarity: number; evidence_count: number; score: number } | null {
    ensureValidSlug(targetCam, "targetCam");
    const counts = new Map<string, number>();
    for (const o of state.observations) {
      if (o.source_cam === targetCam) continue;
      if (o.task !== task || o.operation !== operation || o.material !== material) continue;
      counts.set(o.source_cam, (counts.get(o.source_cam) ?? 0) + 1);
    }
    if (counts.size === 0) return null;
    let best: { slug: string; sim: number; n: number; score: number } | null = null;
    for (const [slug, n] of counts.entries()) {
      const { sim } = similarity(slug, targetCam);
      const score = sim * (1 - Math.exp(-n / 3));
      if (!best || score > best.score) best = { slug, sim, n, score };
    }
    if (!best) return null;
    return {
      source_cam: best.slug,
      similarity: best.sim,
      evidence_count: best.n,
      score: best.score,
    };
  }

  static recordTransferOutcome(
    outcome: Omit<CAMTransferOutcome, "ts"> & { ts?: number }
  ): CAMTransferOutcome {
    ensureValidSlug(outcome.source_cam, "source_cam");
    ensureValidSlug(outcome.target_cam, "target_cam");
    if (typeof outcome.was_correct !== "boolean") {
      throw new Error("outcome.was_correct must be a boolean");
    }
    if (!outcome.decision_id) throw new Error("outcome.decision_id is required");
    const stored: CAMTransferOutcome = {
      decision_id: outcome.decision_id,
      source_cam: outcome.source_cam,
      target_cam: outcome.target_cam,
      task: outcome.task,
      was_correct: outcome.was_correct,
      ts: outcome.ts ?? Date.now(),
    };
    state.outcomes.push(stored);
    while (state.outcomes.length > state.maxOutcomes) state.outcomes.shift();
    return stored;
  }

  static transferAccuracy(
    sourceCam?: string,
    targetCam?: string
  ): CAMTransferAccuracy[] {
    const buckets = new Map<string, { hits: number; n: number; src: string; tgt: string }>();
    for (const o of state.outcomes) {
      if (sourceCam && o.source_cam !== sourceCam) continue;
      if (targetCam && o.target_cam !== targetCam) continue;
      const key = `${o.source_cam}__${o.target_cam}`;
      const b = buckets.get(key) ?? { hits: 0, n: 0, src: o.source_cam, tgt: o.target_cam };
      b.n++;
      if (o.was_correct) b.hits++;
      buckets.set(key, b);
    }
    return [...buckets.values()]
      .map((b) => ({
        source_cam: b.src,
        target_cam: b.tgt,
        outcomes: b.n,
        hits: b.hits,
        hit_rate: b.n > 0 ? b.hits / b.n : 0,
        wilson_lower_95: wilsonLower95(b.hits, b.n),
      }))
      .sort((a, b) => b.outcomes - a.outcomes);
  }

  static listObservations(filter?: {
    source_cam?: string;
    task?: CAMSourceObservation["task"];
    material?: string;
    operation?: string;
  }): CAMSourceObservation[] {
    return state.observations.filter((o) => {
      if (filter?.source_cam && o.source_cam !== filter.source_cam) return false;
      if (filter?.task && o.task !== filter.task) return false;
      if (filter?.material && o.material !== filter.material) return false;
      if (filter?.operation && o.operation !== filter.operation) return false;
      return true;
    });
  }

  static getObservationCount(): number {
    return state.observations.length;
  }

  static getOutcomeCount(): number {
    return state.outcomes.length;
  }

  /** Test hook — wipe observations and outcomes, restore default domains. */
  static clearAll(): void {
    state.observations.length = 0;
    state.outcomes.length = 0;
    state.domains.clear();
    for (const d of DEFAULT_CAM_DOMAINS) state.domains.set(d.slug, { ...d });
    state.maxObs = MAX_OBS_DEFAULT;
    state.maxOutcomes = MAX_OUTCOMES_DEFAULT;
  }

  static setObservationCap(cap: number): void {
    if (!Number.isInteger(cap) || cap < 1) {
      throw new Error("observation cap must be a positive integer");
    }
    state.maxObs = cap;
    while (state.observations.length > state.maxObs) state.observations.shift();
  }

  static setOutcomeCap(cap: number): void {
    if (!Number.isInteger(cap) || cap < 1) {
      throw new Error("outcome cap must be a positive integer");
    }
    state.maxOutcomes = cap;
    while (state.outcomes.length > state.maxOutcomes) state.outcomes.shift();
  }
}

export default CAMTransferLearningEngine;
