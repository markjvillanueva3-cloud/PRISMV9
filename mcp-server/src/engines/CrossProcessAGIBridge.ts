/**
 * CrossProcessAGIBridge — unified decision composer over keyword routing
 * (CrossProcessAIBridge.classify) and the T1-02 neural success
 * distribution.
 *
 * Milestone: INFRA-NEURAL-LEDGER-MS1 / U-XPROC-NEURAL-T1-05.
 *
 * Why this exists
 * ---------------
 * T1-02 (CrossProcessNeuralLearningEngine) gives outcome risk
 * (success/failure/operator_override). CrossProcessAIBridge.classify
 * gives intent → process routing. Neither alone is enough to act on:
 *   - Keyword routing alone: ignores learned shop-floor failure patterns.
 *   - Neural alone: outcome risk doesn't tell the orchestrator which
 *     process to route to.
 *
 * This bridge combines both into a single decision envelope that the
 * top-level router can act on:
 *   - process distribution = α * keyword + (1−α) * neural-derived
 *   - outcome risk         = neural prediction at the chosen process
 *   - recommendation       = proceed / review / reject from thresholds
 *
 * The neural "per-process distribution" is computed by featurizing the
 * candidate context once per process (mill/lathe/wedm) and reading the
 * predicted P(success) from the T1-02 donor. Those three numbers are
 * normalized to a distribution and blended with the keyword classifier's
 * confidences at the configurable mixWeight (default 0.5).
 *
 * Recommendation logic (in order):
 *   - if neural P(failure) > failThreshold → "reject"
 *   - else if neural P(operator_override) > overrideThreshold → "review"
 *   - else if blended argmax confidence < proceedThreshold     → "review"
 *   - else                                                      → "proceed"
 *
 * @module engines/CrossProcessAGIBridge
 */

import {
  CrossProcessAIBridge,
  AI_SUPPORTED_PROCESSES,
  type AIProcessId,
  type ClassifyContext,
  type ProcessClassification,
} from "./CrossProcessAIBridge.js";
import type { CrossProcessNeuralLearningEngine } from "./CrossProcessNeuralLearningEngine.js";
import type {
  OutcomeRecord,
  OutcomeBridge,
} from "./CrossProcessOutcomeStore.js";

// ============================================================================
// CONSTANTS
// ============================================================================

export const AGI_SCHEMA_VERSION = "1.0.0";

const DEFAULT_MIX_WEIGHT = 0.5;
const DEFAULT_FAIL_THRESHOLD = 0.55;
const DEFAULT_OVERRIDE_THRESHOLD = 0.5;
const DEFAULT_PROCEED_THRESHOLD = 0.4;
const NORMALIZE_EPSILON = 1e-9;

const DEFAULT_BRIDGE_FOR_NEURAL: OutcomeBridge = "router";

// ============================================================================
// TYPES
// ============================================================================

export type Recommendation = "proceed" | "review" | "reject";

export interface ComposeRequest {
  intent: string;
  features?: ReadonlyArray<string>;
  material?: string;
  /** When provided, used as the per-process bridge label for featurization. */
  bridge?: OutcomeBridge;
  /** Optional numeric request fields used by both featurization and downstream. */
  request_summary?: OutcomeRecord["request_summary"];
}

export interface ComposeOpts {
  /** [0,1] — 0 = keyword only, 1 = neural only. Default 0.5. */
  mixWeight?: number;
  /** Above this neural P(failure) → "reject". Default 0.55. */
  failThreshold?: number;
  /** Above this neural P(operator_override) → "review". Default 0.5. */
  overrideThreshold?: number;
  /** Below this blended argmax confidence → "review". Default 0.4. */
  proceedThreshold?: number;
  /** When true, classification context filters to a specific process. */
  processHint?: AIProcessId;
}

export interface ProcessDistribution {
  mill: number;
  lathe: number;
  wedm: number;
}

export interface OutcomeDistribution {
  success: number;
  failure: number;
  operator_override: number;
}

export interface ComposeResult {
  schemaVersion: typeof AGI_SCHEMA_VERSION;
  routedProcess: AIProcessId;
  blended: ProcessDistribution;
  keyword: ProcessDistribution;
  neural: ProcessDistribution;
  /** Outcome risk read from the donor at the routed-process featurization. */
  outcomeRisk: OutcomeDistribution;
  recommendation: Recommendation;
  /** Reason chosen by the recommendation logic — useful for audit. */
  recommendationReason: string;
  mixWeight: number;
  /** Verbatim ProcessClassification from the keyword classifier. */
  classification: ProcessClassification;
}

// ============================================================================
// ENGINE
// ============================================================================

export class CrossProcessAGIBridge {
  /**
   * Compose a unified routing+risk decision. Pure: does not mutate the
   * donor or any state.
   */
  compose(
    donor: CrossProcessNeuralLearningEngine,
    req: ComposeRequest,
    opts: ComposeOpts = {},
  ): ComposeResult {
    const mixWeight = clamp01(opts.mixWeight ?? DEFAULT_MIX_WEIGHT);
    const failThreshold = clamp01(opts.failThreshold ?? DEFAULT_FAIL_THRESHOLD);
    const overrideThreshold = clamp01(opts.overrideThreshold ?? DEFAULT_OVERRIDE_THRESHOLD);
    const proceedThreshold = clamp01(opts.proceedThreshold ?? DEFAULT_PROCEED_THRESHOLD);

    // 1. Keyword classification.
    const ctx: ClassifyContext = {};
    if (opts.processHint) ctx.process = opts.processHint;
    if (req.features) ctx.features = req.features;
    if (req.material !== undefined) ctx.material = req.material;
    const classification = CrossProcessAIBridge.classify(req.intent, ctx);
    const keyword = classificationToDistribution(classification);

    // 2. Neural per-process success prob → distribution over the 3 processes.
    const neural = this.neuralProcessDistribution(donor, req);

    // 3. Blend.
    const blended = mixDistributions(keyword, neural, mixWeight);

    // 4. Routed process = blended argmax (with deterministic tiebreak).
    const routedProcess = argmaxProcess(blended);

    // 5. Outcome risk at the routed process.
    const outcomeRisk = neuralOutcomeAt(donor, req, routedProcess);

    // 6. Recommendation.
    const blendedConf = Math.max(blended.mill, blended.lathe, blended.wedm);
    let recommendation: Recommendation;
    let recommendationReason: string;
    if (outcomeRisk.failure > failThreshold) {
      recommendation = "reject";
      recommendationReason = `neural P(failure)=${outcomeRisk.failure.toFixed(3)} > ${failThreshold}`;
    } else if (outcomeRisk.operator_override > overrideThreshold) {
      recommendation = "review";
      recommendationReason = `neural P(operator_override)=${outcomeRisk.operator_override.toFixed(3)} > ${overrideThreshold}`;
    } else if (blendedConf < proceedThreshold) {
      recommendation = "review";
      recommendationReason = `blended top confidence=${blendedConf.toFixed(3)} < ${proceedThreshold}`;
    } else {
      recommendation = "proceed";
      recommendationReason = `routed to ${routedProcess} with confidence=${blendedConf.toFixed(3)}, P(success)=${outcomeRisk.success.toFixed(3)}`;
    }

    return {
      schemaVersion: AGI_SCHEMA_VERSION,
      routedProcess,
      blended,
      keyword,
      neural,
      outcomeRisk,
      recommendation,
      recommendationReason,
      mixWeight,
      classification,
    };
  }

  // ───── PRIVATE HELPERS ─────

  private neuralProcessDistribution(
    donor: CrossProcessNeuralLearningEngine,
    req: ComposeRequest,
  ): ProcessDistribution {
    const successScores: Record<AIProcessId, number> = { mill: 0, lathe: 0, wedm: 0 };
    for (const p of AI_SUPPORTED_PROCESSES) {
      const out = neuralOutcomeAt(donor, req, p);
      successScores[p] = out.success;
    }
    return normalizeDistribution(successScores);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function classificationToDistribution(c: ProcessClassification): ProcessDistribution {
  // Start with the primary process at its given confidence; fold in
  // alternatives. Renormalize at the end.
  const dist: Record<AIProcessId, number> = { mill: 0, lathe: 0, wedm: 0 };
  dist[c.process] = c.confidence;
  for (const alt of c.alternative_processes) {
    dist[alt.process] = alt.confidence;
  }
  return normalizeDistribution(dist);
}

function normalizeDistribution(d: Record<AIProcessId, number>): ProcessDistribution {
  const sum = (d.mill ?? 0) + (d.lathe ?? 0) + (d.wedm ?? 0);
  if (sum < NORMALIZE_EPSILON) {
    // Cold-start: all zero → uniform.
    return { mill: 1 / 3, lathe: 1 / 3, wedm: 1 / 3 };
  }
  return {
    mill: (d.mill ?? 0) / sum,
    lathe: (d.lathe ?? 0) / sum,
    wedm: (d.wedm ?? 0) / sum,
  };
}

function mixDistributions(
  a: ProcessDistribution,
  b: ProcessDistribution,
  bWeight: number,
): ProcessDistribution {
  const aWeight = 1 - bWeight;
  return {
    mill: a.mill * aWeight + b.mill * bWeight,
    lathe: a.lathe * aWeight + b.lathe * bWeight,
    wedm: a.wedm * aWeight + b.wedm * bWeight,
  };
}

function argmaxProcess(d: ProcessDistribution): AIProcessId {
  // Deterministic tiebreak: mill > lathe > wedm.
  if (d.mill >= d.lathe && d.mill >= d.wedm) return "mill";
  if (d.lathe >= d.wedm) return "lathe";
  return "wedm";
}

function neuralOutcomeAt(
  donor: CrossProcessNeuralLearningEngine,
  req: ComposeRequest,
  process: AIProcessId,
): OutcomeDistribution {
  const synthetic: OutcomeRecord = {
    schemaVersion: "1.0",
    id: "agi-synthetic",
    ts: new Date().toISOString(),
    bridge: req.bridge ?? DEFAULT_BRIDGE_FOR_NEURAL,
    process,
    request_summary: req.request_summary ?? { material: req.material, intent: req.intent },
    response_summary: {},
    outcome: { kind: "pending" },
  };
  const probs = donor.predictFromRecord(synthetic).probs;
  return {
    success: probs.success,
    failure: probs.failure,
    operator_override: probs.operator_override,
  };
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0.5;
  return Math.max(0, Math.min(1, v));
}

export const crossProcessAGIBridge = new CrossProcessAGIBridge();
