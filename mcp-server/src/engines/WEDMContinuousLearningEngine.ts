/**
 * WEDMContinuousLearningEngine — Online learning orchestrator for WEDM AGI.
 *
 * Phase 3 / P3-MS1 / U-P3-01 of the WEDM AGI Intelligence Roadmap.
 *
 * Orchestrates four continuous-learning signal sources:
 *   1. Ra feedback    (CMM measured vs predicted) → Bayesian Klocke calibration
 *   2. Time feedback  (controller cycle vs predicted) → Bayesian MRR/η calibration
 *   3. Wire-break events (alarm) → Weibull shape/scale update (wire life)
 *   4. Operator adjustments (HMI delta against suggestion) → preference learning
 *
 * Design: composition over duplication. Ra/time calibration delegates to
 * `WEDMFeedbackCalibrationEngine` (229 LOC, already shipped). The wire-break
 * Weibull and operator-preference tracks are handled locally because there is
 * no dedicated upstream engine for them yet.
 *
 * Exit gate (P3-MS1): ingest → settle within 30 s per feedback event. The
 * engine records wall-clock latency per ingest so the hook/monitor can verify.
 *
 * References:
 *   - Bayesian conjugate update (Normal-Normal): Gelman et al. "Bayesian Data
 *     Analysis" 3rd ed., §2.5
 *   - Weibull online MLE approximation: Bain & Engelhardt 1991, §6.4
 *   - Preference learning (exponential moving average): Sutton & Barto 2018
 *
 * @module engines/WEDMContinuousLearningEngine
 */
import { log } from "../utils/Logger.js";
import {
  wedmFeedbackCalibrationEngine,
  type WEDMFeedback,
  type FeedbackResult,
} from "./WEDMFeedbackCalibrationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/**
 * A unit of incoming evidence the learning loop can ingest. Exactly one
 * of the `*Feedback` fields must be populated.
 */
export interface LearningSignal {
  kind: "ra_time" | "wire_break" | "operator_adjustment";
  /** Material key (e.g. "D2", "WC"). Case-insensitive downstream. */
  material: string;
  timestamp?: string;
  raTime?: WEDMFeedback;
  wireBreak?: WireBreakEvent;
  operatorAdjustment?: OperatorAdjustment;
}

/** One wire-break event with the elapsed life at the break (minutes). */
export interface WireBreakEvent {
  elapsed_life_min: number;
  /** Optional: peak current right before the break, amps. */
  peak_current_A?: number;
  /** Optional: wire diameter and material for bucketing. */
  wire_diameter_mm?: number;
  wire_material?: string;
}

/** One operator-adjustment event: HMI delta relative to suggested recipe. */
export interface OperatorAdjustment {
  /** Parameter that was tweaked (e.g. "peak_current_A"). */
  parameter: string;
  suggested: number;
  actual: number;
  /** Cut outcome the operator was optimizing for. */
  outcome?: "faster" | "finer" | "stable" | "recover_break";
}

/** Per-material Weibull state for wire-break prediction. */
interface WeibullState {
  /** Shape parameter β (>0). */
  shape: number;
  /** Scale parameter η (minutes, >0). */
  scale: number;
  /** Number of observed break events that fed this state. */
  samples: number;
  /** Mean break time (minutes) — convenience, η·Γ(1+1/β). */
  meanLifeMin: number;
}

/** Per-(material, parameter) operator-preference state. */
interface PreferenceState {
  /** Exponential-moving-average bias (actual - suggested). */
  bias: number;
  /** Exponential-moving-average |actual - suggested| (magnitude). */
  magnitude: number;
  samples: number;
}

/** The outcome of a single ingestion step. */
export interface LearningIngestResult {
  accepted: boolean;
  kind: LearningSignal["kind"];
  material: string;
  /** Wall-clock latency of this ingest, milliseconds. */
  latency_ms: number;
  /** Whether the learning loop resolved inside the P3-MS1 budget (<30s). */
  withinBudget: boolean;
  /** Populated when kind = "ra_time". */
  feedback?: FeedbackResult;
  /** Populated when kind = "wire_break". */
  weibull?: WeibullState;
  /** Populated when kind = "operator_adjustment". */
  preference?: PreferenceState & { parameter: string };
  /** Human-readable summary. */
  summary: string;
  /** Optional error message when accepted = false. */
  error?: string;
}

/** Snapshot of everything this engine currently believes for a material. */
export interface LearningSnapshot {
  material: string;
  /** Bayesian calibration factors — delegated to feedback engine. */
  calibration: { k_ra: number; eta_mrr: number; samples: number };
  /** Wire-break Weibull state — local. */
  weibull: WeibullState | null;
  /** Operator preference per parameter — local. */
  preferences: Record<string, PreferenceState>;
  /** Total signals ingested for this material. */
  totalSignals: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Exit-gate budget from the roadmap (P3-MS1). */
const LEARNING_BUDGET_MS = 30_000;

/** Seed Weibull — median-industrial wire life; overwritten after first sample. */
const DEFAULT_WEIBULL_SHAPE = 2.0;
const DEFAULT_WEIBULL_SCALE_MIN = 90.0;

/**
 * Exponential-moving-average smoothing factor for preferences. α=0.2 keeps
 * ~5-sample effective memory — enough to reflect shift-long operator trends
 * without chasing one-off adjustments.
 */
const PREFERENCE_EMA_ALPHA = 0.2;

/** Cap on individual Weibull sample influence to avoid single-outlier drift. */
const WEIBULL_MAX_STEP = 0.30;

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMContinuousLearningEngine {
  private weibull = new Map<string, WeibullState>();
  private preferences = new Map<string, PreferenceState>();
  private signalsByMaterial = new Map<string, number>();
  private history: Array<{ signal: LearningSignal; result: LearningIngestResult }> = [];

  /**
   * Ingest a single learning signal and return the result of the update.
   * Latency is measured against the P3-MS1 30 s budget.
   */
  ingest(signal: LearningSignal): LearningIngestResult {
    const start = Date.now();
    const matKey = this.matKey(signal.material);
    try {
      let result: LearningIngestResult;
      switch (signal.kind) {
        case "ra_time":
          result = this.ingestRaTime(signal, matKey, start);
          break;
        case "wire_break":
          result = this.ingestWireBreak(signal, matKey, start);
          break;
        case "operator_adjustment":
          result = this.ingestOperatorAdjustment(signal, matKey, start);
          break;
        default: {
          const kind = (signal as LearningSignal).kind;
          return {
            accepted: false,
            kind,
            material: signal.material,
            latency_ms: Date.now() - start,
            withinBudget: true,
            summary: `Unsupported learning signal kind: ${kind}`,
            error: `unsupported_kind:${kind}`,
          };
        }
      }
      this.signalsByMaterial.set(matKey, (this.signalsByMaterial.get(matKey) ?? 0) + 1);
      this.history.push({ signal, result });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error?.(`[WEDMContinuousLearning] ingest failed for ${signal.material}: ${msg}`);
      return {
        accepted: false,
        kind: signal.kind,
        material: signal.material,
        latency_ms: Date.now() - start,
        withinBudget: Date.now() - start < LEARNING_BUDGET_MS,
        summary: `Ingest failed: ${msg}`,
        error: msg,
      };
    }
  }

  /**
   * Convenience: ingest a batch in order and return all results. Latency is
   * per-signal; the 30 s budget applies per event, not the batch as a whole.
   */
  ingestBatch(signals: LearningSignal[]): LearningIngestResult[] {
    return signals.map((s) => this.ingest(s));
  }

  /** Return the current learned state for a material. */
  snapshot(material: string): LearningSnapshot {
    const matKey = this.matKey(material);
    const calibration = wedmFeedbackCalibrationEngine.get_calibration(material);
    const weibull = this.weibull.get(matKey) ?? null;
    const prefs: Record<string, PreferenceState> = {};
    for (const [key, state] of this.preferences.entries()) {
      if (key.startsWith(`${matKey}::`)) {
        const param = key.split("::")[1];
        prefs[param] = { ...state };
      }
    }
    return {
      material,
      calibration,
      weibull: weibull ? { ...weibull } : null,
      preferences: prefs,
      totalSignals: this.signalsByMaterial.get(matKey) ?? 0,
    };
  }

  /** Recent ingest history (most recent first). */
  getHistory(limit = 20): Array<{ signal: LearningSignal; result: LearningIngestResult }> {
    return this.history.slice(-limit).reverse();
  }

  /** Reset only the local state (wire-break + preferences) for a material. */
  reset(material: string): void {
    const matKey = this.matKey(material);
    this.weibull.delete(matKey);
    for (const key of [...this.preferences.keys()]) {
      if (key.startsWith(`${matKey}::`)) this.preferences.delete(key);
    }
    this.signalsByMaterial.delete(matKey);
  }

  /** Clear all learned state (tests + calibration runs). */
  clearAll(): void {
    this.weibull.clear();
    this.preferences.clear();
    this.signalsByMaterial.clear();
    this.history = [];
  }

  /** Aggregate across all materials — used by drift / update engines later. */
  stats(): {
    materials: number;
    signals: number;
    weibull: Record<string, WeibullState>;
  } {
    const weibull: Record<string, WeibullState> = {};
    for (const [key, state] of this.weibull.entries()) {
      weibull[key] = { ...state };
    }
    let signals = 0;
    for (const n of this.signalsByMaterial.values()) signals += n;
    return { materials: this.signalsByMaterial.size, signals, weibull };
  }

  // --------------------------------------------------------------------------
  // PRIVATE — signal-specific ingest paths
  // --------------------------------------------------------------------------

  private ingestRaTime(
    signal: LearningSignal,
    matKey: string,
    startMs: number,
  ): LearningIngestResult {
    if (!signal.raTime) {
      return this.notAccepted(signal, startMs, "ra_time signal missing raTime payload");
    }
    const feedback = wedmFeedbackCalibrationEngine.submit_feedback(signal.raTime);
    const latency = Date.now() - startMs;
    return {
      accepted: feedback.accepted,
      kind: "ra_time",
      material: signal.material,
      latency_ms: latency,
      withinBudget: latency < LEARNING_BUDGET_MS,
      feedback,
      summary: feedback.summary,
      error: feedback.accepted ? undefined : "invalid_ra_time_values",
    };
  }

  private ingestWireBreak(
    signal: LearningSignal,
    matKey: string,
    startMs: number,
  ): LearningIngestResult {
    const evt = signal.wireBreak;
    if (!evt || !Number.isFinite(evt.elapsed_life_min) || evt.elapsed_life_min <= 0) {
      return this.notAccepted(signal, startMs, "wire_break elapsed_life_min must be > 0");
    }
    const prior = this.weibull.get(matKey) ?? {
      shape: DEFAULT_WEIBULL_SHAPE,
      scale: DEFAULT_WEIBULL_SCALE_MIN,
      samples: 0,
      meanLifeMin: DEFAULT_WEIBULL_SCALE_MIN * gammaFn(1 + 1 / DEFAULT_WEIBULL_SHAPE),
    };

    // Bounded online update on scale — treat the sample life as an
    // observation of the Weibull mean (η·Γ(1+1/β)). Guard against single
    // outliers with ±30 % step cap.
    const ratio = evt.elapsed_life_min / prior.meanLifeMin;
    const boundedRatio = Math.max(1 - WEIBULL_MAX_STEP, Math.min(1 + WEIBULL_MAX_STEP, ratio));
    const n = prior.samples + 1;
    const blended = prior.scale * ((1 - 1 / n) + (boundedRatio / n));
    const nextScale = Math.max(1, blended);

    // Shape stays near the prior but drifts toward 2.0 as we accumulate —
    // without a full MLE we bias β → 2 (a standard industrial baseline).
    const nextShape =
      prior.samples === 0
        ? DEFAULT_WEIBULL_SHAPE
        : prior.shape + (DEFAULT_WEIBULL_SHAPE - prior.shape) / (n + 4);

    const nextMean = nextScale * gammaFn(1 + 1 / nextShape);
    const nextState: WeibullState = {
      shape: round4(nextShape),
      scale: round4(nextScale),
      samples: n,
      meanLifeMin: round4(nextMean),
    };
    this.weibull.set(matKey, nextState);

    const latency = Date.now() - startMs;
    return {
      accepted: true,
      kind: "wire_break",
      material: signal.material,
      latency_ms: latency,
      withinBudget: latency < LEARNING_BUDGET_MS,
      weibull: { ...nextState },
      summary: `Wire-break Weibull updated: β=${nextState.shape}, η=${nextState.scale} min (n=${n})`,
    };
  }

  private ingestOperatorAdjustment(
    signal: LearningSignal,
    matKey: string,
    startMs: number,
  ): LearningIngestResult {
    const adj = signal.operatorAdjustment;
    if (
      !adj ||
      !adj.parameter ||
      !Number.isFinite(adj.suggested) ||
      !Number.isFinite(adj.actual)
    ) {
      return this.notAccepted(signal, startMs, "operator_adjustment missing/invalid fields");
    }
    const key = `${matKey}::${adj.parameter}`;
    const delta = adj.actual - adj.suggested;
    const mag = Math.abs(delta);
    const prior = this.preferences.get(key) ?? { bias: 0, magnitude: 0, samples: 0 };
    const a = PREFERENCE_EMA_ALPHA;
    const next: PreferenceState = {
      bias: prior.samples === 0 ? delta : prior.bias * (1 - a) + delta * a,
      magnitude: prior.samples === 0 ? mag : prior.magnitude * (1 - a) + mag * a,
      samples: prior.samples + 1,
    };
    this.preferences.set(key, next);

    const latency = Date.now() - startMs;
    return {
      accepted: true,
      kind: "operator_adjustment",
      material: signal.material,
      latency_ms: latency,
      withinBudget: latency < LEARNING_BUDGET_MS,
      preference: { ...next, parameter: adj.parameter },
      summary: `Operator preference updated for ${adj.parameter}: bias=${round4(next.bias)}, |Δ|=${round4(next.magnitude)} (n=${next.samples})`,
    };
  }

  private notAccepted(
    signal: LearningSignal,
    startMs: number,
    reason: string,
  ): LearningIngestResult {
    const latency = Date.now() - startMs;
    return {
      accepted: false,
      kind: signal.kind,
      material: signal.material,
      latency_ms: latency,
      withinBudget: latency < LEARNING_BUDGET_MS,
      summary: reason,
      error: reason.replace(/\s+/g, "_"),
    };
  }

  private matKey(material: string): string {
    return material.trim().toLowerCase().replace(/\s+/g, "_");
  }
}

// ============================================================================
// UTIL — small Gamma function (Lanczos approximation, g=7, n=9)
//   used for Weibull mean = η · Γ(1 + 1/β).
// ============================================================================

const G_COEFS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function gammaFn(z: number): number {
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
  }
  z -= 1;
  let x = G_COEFS[0];
  for (let i = 1; i < 9; i++) x += G_COEFS[i] / (z + i);
  const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const wedmContinuousLearningEngine = new WEDMContinuousLearningEngine();
