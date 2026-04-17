/**
 * WEDMNeuralFormulaFusionEngine — MS-P0.5-COORD U-P0.5-COORD-06
 *
 * Fuses multiple formula-based WEDM predictions (MRR, Ra, wire-bend,
 * discharge energy) into a single adaptive estimate, with weights updated
 * from historical residuals. The "neural" part is adaptive softmax-style
 * weighting over the estimator ensemble: estimators that have been
 * consistently accurate for a given (target, material, operation) context
 * get higher weight; outliers get down-weighted.
 *
 * Design:
 *   - An estimator contributes (value, prior_weight, source).
 *   - Weights start at `prior_weight` and adapt as ground-truth observations
 *     arrive via recordObservation(actual_value).
 *   - Adaptation uses an exponential-weighted running mean of squared error
 *     per estimator; softmax on -error scales yields the next weights.
 *   - Fusion is a weight-weighted mean of estimator values.
 *   - Variance across weighted estimators feeds the returned confidence
 *     interval.
 *
 * Keeps per-(target, context) state so fusion for MRR on D2 roughing does
 * not disturb wire-bend weights for Ti6Al4V finishing.
 */

export interface FormulaEstimate {
  source: string;
  value: number;
  priorWeight?: number;
}

export interface FusionContext {
  target: string;
  material?: string;
  operation?: string;
}

export interface FusedResult {
  target: string;
  context: FusionContext;
  fusedValue: number;
  stdDev: number;
  effectiveN: number;
  weights: Array<{ source: string; weight: number; value: number }>;
  participatingEstimators: number;
}

export interface FusionObservationResult {
  target: string;
  actualValue: number;
  residualsBySource: Record<string, number>;
  updatedWeights: Record<string, number>;
}

export interface FusionStats {
  totalFusions: number;
  totalObservations: number;
  trackedContexts: number;
  avgParticipatingEstimators: number;
  bestPerformers: Array<{ source: string; avgErr: number }>;
}

interface ContextState {
  emaErrors: Map<string, number>;
  observations: number;
}

const EMA_ALPHA = 0.3;
const DEFAULT_PRIOR = 1.0;
const SOFTMAX_TEMPERATURE = 1.0;

function contextKey(ctx: FusionContext): string {
  const m = (ctx.material ?? "*").toLowerCase();
  const op = (ctx.operation ?? "*").toLowerCase();
  return `${ctx.target}::${m}::${op}`;
}

function softmax(values: number[], temperature = 1.0): number[] {
  if (values.length === 0) return [];
  const maxV = Math.max(...values);
  const exps = values.map((v) => Math.exp((v - maxV) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return sum === 0 ? values.map(() => 1 / values.length) : exps.map((e) => e / sum);
}

export class WEDMNeuralFormulaFusionEngine {
  private contextState = new Map<string, ContextState>();
  private fusionCount = 0;
  private observationCount = 0;
  private participatingHistory: number[] = [];

  private getOrCreateState(ctx: FusionContext): ContextState {
    const k = contextKey(ctx);
    let s = this.contextState.get(k);
    if (!s) {
      s = { emaErrors: new Map(), observations: 0 };
      this.contextState.set(k, s);
    }
    return s;
  }

  computeWeights(estimators: FormulaEstimate[], ctx: FusionContext): number[] {
    if (estimators.length === 0) return [];
    const state = this.getOrCreateState(ctx);
    const priors = estimators.map((e) => e.priorWeight ?? DEFAULT_PRIOR);
    const errScores: number[] = estimators.map((e) => {
      const err = state.emaErrors.get(e.source);
      if (err === undefined || state.observations < 2) {
        return 0; // cold start: neutral score, defer to priors
      }
      return -err; // lower error → higher logit
    });
    const cold = state.observations < 2;
    if (cold) {
      const total = priors.reduce((a, b) => a + b, 0);
      return total === 0 ? priors.map(() => 1 / priors.length) : priors.map((p) => p / total);
    }
    const softmaxWeights = softmax(errScores, SOFTMAX_TEMPERATURE);
    const combined = softmaxWeights.map((w, i) => w * priors[i]);
    const sumCombined = combined.reduce((a, b) => a + b, 0);
    return sumCombined === 0
      ? combined.map(() => 1 / combined.length)
      : combined.map((c) => c / sumCombined);
  }

  fuse(estimators: FormulaEstimate[], ctx: FusionContext): FusedResult {
    const filtered = estimators.filter((e) => Number.isFinite(e.value));
    if (filtered.length === 0) {
      this.fusionCount++;
      this.participatingHistory.push(0);
      return {
        target: ctx.target,
        context: ctx,
        fusedValue: NaN,
        stdDev: NaN,
        effectiveN: 0,
        weights: [],
        participatingEstimators: 0,
      };
    }
    const weights = this.computeWeights(filtered, ctx);
    const fusedValue = filtered.reduce((acc, e, i) => acc + e.value * weights[i], 0);
    const variance = filtered.reduce(
      (acc, e, i) => acc + weights[i] * (e.value - fusedValue) ** 2,
      0,
    );
    const stdDev = Math.sqrt(variance);
    const effectiveN = 1 / weights.reduce((a, b) => a + b * b, 0);
    this.fusionCount++;
    this.participatingHistory.push(filtered.length);
    if (this.participatingHistory.length > 500) {
      this.participatingHistory.splice(0, this.participatingHistory.length - 500);
    }
    return {
      target: ctx.target,
      context: ctx,
      fusedValue,
      stdDev,
      effectiveN: Math.round(effectiveN * 100) / 100,
      weights: filtered.map((e, i) => ({ source: e.source, weight: weights[i], value: e.value })),
      participatingEstimators: filtered.length,
    };
  }

  recordObservation(
    estimators: FormulaEstimate[],
    actualValue: number,
    ctx: FusionContext,
  ): FusionObservationResult {
    this.observationCount++;
    const state = this.getOrCreateState(ctx);
    state.observations++;
    const residuals: Record<string, number> = {};
    for (const est of estimators) {
      if (!Number.isFinite(est.value) || !Number.isFinite(actualValue)) continue;
      const err = Math.abs(est.value - actualValue);
      const prior = state.emaErrors.get(est.source);
      const next = prior === undefined ? err : EMA_ALPHA * err + (1 - EMA_ALPHA) * prior;
      state.emaErrors.set(est.source, next);
      residuals[est.source] = err;
    }
    const updated = this.computeWeights(estimators, ctx);
    const updatedWeights: Record<string, number> = {};
    estimators.forEach((e, i) => {
      updatedWeights[e.source] = updated[i];
    });
    return { target: ctx.target, actualValue, residualsBySource: residuals, updatedWeights };
  }

  getContextStats(ctx: FusionContext): {
    observations: number;
    sources: Array<{ source: string; avgErr: number }>;
  } | null {
    const k = contextKey(ctx);
    const s = this.contextState.get(k);
    if (!s) return null;
    const sources = Array.from(s.emaErrors.entries())
      .map(([source, avgErr]) => ({ source, avgErr: Math.round(avgErr * 10000) / 10000 }))
      .sort((a, b) => a.avgErr - b.avgErr);
    return { observations: s.observations, sources };
  }

  getStats(): FusionStats {
    const avgParticipatingEstimators =
      this.participatingHistory.length === 0
        ? 0
        : Math.round(
            (this.participatingHistory.reduce((a, b) => a + b, 0) /
              this.participatingHistory.length) *
              100,
          ) / 100;
    const allErrors = new Map<string, number[]>();
    for (const state of this.contextState.values()) {
      for (const [source, err] of state.emaErrors.entries()) {
        let arr = allErrors.get(source);
        if (!arr) {
          arr = [];
          allErrors.set(source, arr);
        }
        arr.push(err);
      }
    }
    const bestPerformers = Array.from(allErrors.entries())
      .map(([source, errs]) => ({
        source,
        avgErr: Math.round((errs.reduce((a, b) => a + b, 0) / errs.length) * 10000) / 10000,
      }))
      .sort((a, b) => a.avgErr - b.avgErr)
      .slice(0, 5);
    return {
      totalFusions: this.fusionCount,
      totalObservations: this.observationCount,
      trackedContexts: this.contextState.size,
      avgParticipatingEstimators,
      bestPerformers,
    };
  }

  resetForTests(): void {
    this.contextState.clear();
    this.fusionCount = 0;
    this.observationCount = 0;
    this.participatingHistory.length = 0;
  }
}

export const wedmNeuralFormulaFusionEngine = new WEDMNeuralFormulaFusionEngine();
