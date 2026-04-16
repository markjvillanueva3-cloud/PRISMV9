/**
 * WEDMModelUpdateEngine — Safe model update / rollback manager.
 *
 * Phase 3 / P3-MS1 / U-P3-03 of the WEDM AGI Intelligence Roadmap.
 *
 * Orchestrates the decide → validate → commit/rollback flow for every WEDM
 * neural or Bayesian model update. The engine is model-agnostic: it ingests
 * a pair of predictor callables (old, candidate) plus a held-out ground-truth
 * set, and returns a Decision record that the model-update hook consumes.
 *
 * Exit gate (P3-MS1): committed updates preserve ≥ 95 % of prior performance
 * on the held-out test set. The engine enforces this hard floor —
 * `minRetention` defaults to 0.95 and cannot be bypassed by the caller
 * without setting it explicitly.
 *
 * Metrics supported:
 *   - mae  — Mean Absolute Error (regression)     → smaller is better
 *   - rmse — Root Mean Squared Error (regression) → smaller is better
 *   - r2   — Coefficient of determination          → larger is better
 *   - acc  — Classification accuracy               → larger is better
 *
 * Design notes:
 *   - Pure functional — no I/O, no global state. The hook layer (U-P3-05/06)
 *     is responsible for persisting `Decision` records and applying them.
 *   - Retention ratio is computed against the *old* model's score, always
 *     normalised so higher-is-better. This lets the same floor (0.95) work
 *     across metrics where "better" has opposite directions.
 *   - Keeps a small in-memory ring of recent decisions for audit queries.
 *
 * @module engines/WEDMModelUpdateEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type UpdateMetric = "mae" | "rmse" | "r2" | "acc";

/** Function that produces a prediction from feature row X. */
export type Predictor = (x: number[]) => number;

export interface HeldOutSample {
  /** Feature vector. */
  x: number[];
  /** Ground-truth target. */
  y: number;
}

export interface ModelUpdateRequest {
  modelId: string;
  metric: UpdateMetric;
  oldPredictor: Predictor;
  candidatePredictor: Predictor;
  heldOut: HeldOutSample[];
  /** 0..1 — minimum fraction of prior performance to preserve. Defaults 0.95. */
  minRetention?: number;
  /** Optional label recorded with the decision (e.g. "retrain-2026-04-16"). */
  label?: string;
}

export interface MetricScore {
  metric: UpdateMetric;
  /** Raw metric value (mae/rmse: lower better; r2/acc: higher better). */
  value: number;
  /** Number of samples that contributed. */
  n: number;
}

export type UpdateAction = "commit" | "rollback" | "blocked-insufficient-data";

export interface UpdateDecision {
  modelId: string;
  label?: string;
  metric: UpdateMetric;
  oldScore: MetricScore;
  candidateScore: MetricScore;
  /** Retention ratio in higher-is-better space. 1.0 = same; >1 = improvement. */
  retentionRatio: number;
  /** Minimum retention accepted (default 0.95). */
  minRetention: number;
  action: UpdateAction;
  /** True when the new model was accepted and should be swapped in. */
  committed: boolean;
  timestamp: string;
  summary: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_MIN_RETENTION = 0.95;
const MIN_HELDOUT = 10;
const AUDIT_RING_SIZE = 200;

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMModelUpdateEngine {
  private audit: UpdateDecision[] = [];

  /**
   * Evaluate a candidate model update and return a decision. The engine does
   * NOT swap the model — it only computes the decision and records it.
   */
  evaluate(req: ModelUpdateRequest): UpdateDecision {
    const minRetention = req.minRetention ?? DEFAULT_MIN_RETENTION;
    const heldOut = req.heldOut;

    if (!Array.isArray(heldOut) || heldOut.length < MIN_HELDOUT) {
      const dec: UpdateDecision = {
        modelId: req.modelId,
        label: req.label,
        metric: req.metric,
        oldScore: { metric: req.metric, value: NaN, n: heldOut?.length ?? 0 },
        candidateScore: { metric: req.metric, value: NaN, n: heldOut?.length ?? 0 },
        retentionRatio: NaN,
        minRetention,
        action: "blocked-insufficient-data",
        committed: false,
        timestamp: new Date().toISOString(),
        summary: `insufficient held-out data (need ≥${MIN_HELDOUT}, got ${heldOut?.length ?? 0}) — update blocked`,
      };
      this.record(dec);
      return dec;
    }

    const oldScore = scoreModel(req.metric, req.oldPredictor, heldOut);
    const candidateScore = scoreModel(req.metric, req.candidatePredictor, heldOut);
    const retentionRatio = retention(req.metric, oldScore.value, candidateScore.value);

    const commit = retentionRatio >= minRetention;
    const dec: UpdateDecision = {
      modelId: req.modelId,
      label: req.label,
      metric: req.metric,
      oldScore,
      candidateScore,
      retentionRatio: round6(retentionRatio),
      minRetention,
      action: commit ? "commit" : "rollback",
      committed: commit,
      timestamp: new Date().toISOString(),
      summary:
        `${req.metric}: old=${round4(oldScore.value)} cand=${round4(candidateScore.value)} ` +
        `retention=${round4(retentionRatio)} vs floor ${minRetention} → ${commit ? "COMMIT" : "ROLLBACK"}`,
    };
    this.record(dec);
    return dec;
  }

  /**
   * Evaluate multiple candidate updates in one call (one decision each). Used
   * by the nightly retrain loop to sweep all WEDM models at once.
   */
  evaluateBatch(requests: ModelUpdateRequest[]): {
    decisions: UpdateDecision[];
    committed: number;
    rolledBack: number;
    blocked: number;
  } {
    const decisions = requests.map((r) => this.evaluate(r));
    let committed = 0;
    let rolledBack = 0;
    let blocked = 0;
    for (const d of decisions) {
      if (d.action === "commit") committed++;
      else if (d.action === "rollback") rolledBack++;
      else blocked++;
    }
    return { decisions, committed, rolledBack, blocked };
  }

  /** Recent decisions (most recent first). */
  getAudit(limit = 50): UpdateDecision[] {
    return this.audit.slice(-limit).reverse();
  }

  /** Drop all recorded decisions (tests). */
  resetAudit(): void {
    this.audit = [];
  }

  private record(d: UpdateDecision): void {
    this.audit.push(d);
    if (this.audit.length > AUDIT_RING_SIZE) {
      this.audit.splice(0, this.audit.length - AUDIT_RING_SIZE);
    }
  }
}

// ============================================================================
// METRICS
// ============================================================================

function scoreModel(
  metric: UpdateMetric,
  predictor: Predictor,
  heldOut: HeldOutSample[],
): MetricScore {
  const preds = heldOut.map((s) => predictor(s.x));
  const ys = heldOut.map((s) => s.y);
  let value: number;
  switch (metric) {
    case "mae":
      value = mae(preds, ys);
      break;
    case "rmse":
      value = rmse(preds, ys);
      break;
    case "r2":
      value = r2(preds, ys);
      break;
    case "acc":
      value = accuracy(preds, ys);
      break;
  }
  return { metric, value, n: heldOut.length };
}

function mae(preds: number[], ys: number[]): number {
  let s = 0;
  for (let i = 0; i < preds.length; i++) s += Math.abs(preds[i] - ys[i]);
  return s / preds.length;
}

function rmse(preds: number[], ys: number[]): number {
  let s = 0;
  for (let i = 0; i < preds.length; i++) {
    const d = preds[i] - ys[i];
    s += d * d;
  }
  return Math.sqrt(s / preds.length);
}

function r2(preds: number[], ys: number[]): number {
  const n = ys.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (ys[i] - preds[i]) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  if (ssTot === 0) return preds.every((p, i) => p === ys[i]) ? 1 : -Infinity;
  return 1 - ssRes / ssTot;
}

function accuracy(preds: number[], ys: number[]): number {
  let correct = 0;
  for (let i = 0; i < preds.length; i++) {
    if (Math.round(preds[i]) === Math.round(ys[i])) correct++;
  }
  return correct / preds.length;
}

/**
 * Retention ratio in higher-is-better coordinates.
 *   - For error metrics (mae/rmse): retention = oldValue / candValue (smaller
 *     cand is better → ratio >1 when candidate improves).
 *   - For score metrics (r2/acc): retention = candValue / oldValue.
 * Old == 0 edge cases degrade to 1.0 (neutral) to avoid NaN.
 */
function retention(metric: UpdateMetric, oldValue: number, candValue: number): number {
  const errorMetric = metric === "mae" || metric === "rmse";
  if (errorMetric) {
    if (oldValue === 0) return candValue === 0 ? 1 : 0;
    return oldValue / Math.max(candValue, 1e-12);
  }
  if (oldValue === 0) return candValue === 0 ? 1 : Number.POSITIVE_INFINITY;
  return candValue / oldValue;
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
function round6(x: number): number {
  return Math.round(x * 1_000_000) / 1_000_000;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const wedmModelUpdateEngine = new WEDMModelUpdateEngine();
