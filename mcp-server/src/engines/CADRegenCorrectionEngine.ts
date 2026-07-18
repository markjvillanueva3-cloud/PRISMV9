/**
 * CADRegenCorrectionEngine -- Stage-6 CORRECT + CONVERGE of the closed-loop
 * CAD replication methodology (INGEST -> PARAMETERIZE -> GENERATE -> COMPARE ->
 * CORRECT -> CONVERGE; see state/shared/specs/CLOSED-LOOP-REPLICATION-METHODOLOGY-2026-06-10.md).
 *
 * This is the controller that closes the loop. It is a PURE, DETERMINISTIC
 * transform (R5 -- not a model call): it reads a `ComparisonResult` delta vector
 * (the COMPARE output) plus the current parameter set, and emits a corrected
 * parameter set plus a convergence verdict. It does NOT call Fusion / a CAD
 * kernel itself -- the live driver injects `evaluate` (a fused GENERATE+COMPARE
 * reader) into `runClosedLoop`, keeping the engine deterministic and unit
 * testable end-to-end with a mock evaluator (the proven pure-core +
 * injected-readers pattern).
 *
 * Correction methods (lightest-first, per the methodology Stage-5):
 *  - "proportional"        : monotone single-var ratio  new = old * (original/generated)^sign
 *  - "secant"              : smooth single-var, uses two prior (param, metric) samples for slope
 *  - "coordinate-descent"  : coupled multi-var, mutate the largest-delta param per failing metric
 *  - "auto" (default)      : secant when >=2 distinct history samples exist, else proportional
 *
 * The spec (params) is mutated, never the candidate output -- preserving the
 * determinism that makes deltas attributable to the spec.
 *
 * No physics constants are used here (numerical control only), so there is
 * nothing to import from src/physics/constants.ts.
 */

import type { ComparisonResult } from "./CADGeometryComparisonEngine.js";
import type { ReverseEngineeredTemplate } from "./CADReverseTemplateEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export type CorrectionMethod = "proportional" | "secant" | "coordinate-descent" | "auto";

export type ConvergenceStatus =
  | "converged"
  | "iterate"
  | "plateau"
  | "max-iterations"
  | "no-correctable-params";

/** A single tunable parameter in the convergence search space. */
export interface CorrectionParam {
  /** Unique name (matches a TemplateParam.name when sourced from a reverse template). */
  name: string;
  /** Current concrete value. */
  value: number;
  /**
   * Metric names (as they appear in ComparisonResult.metrics[].metric) that this
   * param drives. The corrector only adjusts a param to fix a metric it influences.
   */
  influences: string[];
  /** Optional hard lower bound -- correction never steps below. */
  min?: number;
  /** Optional hard upper bound -- correction never steps above. */
  max?: number;
  /**
   * Sign of d(metric)/d(param): +1 (default) = metric rises when param rises,
   * -1 = metric falls when param rises. Picks the correction direction.
   */
  monotonicity?: number;
  /** Optional lineage back to a reverse-engineered op (for applyToTemplate). */
  opIndex?: number;
  /** Optional arg key on that op (for applyToTemplate). */
  argKey?: string;
}

export interface CorrectionConfig {
  /** Hard cap on correction steps. Default 12. */
  maxIterations: number;
  /**
   * Min fractional improvement in maxDeltaPercent that counts as progress. Default 0.02 (2%).
   * NOTE: progress is measured on the worst-|delta| scalar only -- "plateau" means the
   * max-delta has stalled, not that every metric has. A reshaping metric-set whose worst
   * delta is flat still reads as a plateau (acceptable for a 1-D trust controller).
   */
  plateauEpsilon: number;
  /** Consecutive non-progress iterations before declaring PLATEAU. Default 2. */
  plateauPatience: number;
  /** Trust region: a single step is bounded to +-this fraction of |value|. Default 0.5 (50%). */
  maxStepFraction: number;
  /** Correction method. Default "auto". */
  method: CorrectionMethod;
  /** Converge when passRate >= this. Default 1.0 (all metrics pass). */
  passRateTarget: number;
}

export const DEFAULT_CORRECTION_CONFIG: CorrectionConfig = {
  maxIterations: 12,
  plateauEpsilon: 0.02,
  plateauPatience: 2,
  maxStepFraction: 0.5,
  method: "auto",
  passRateTarget: 1.0,
};

/** One observed iteration: the params used and the metric values they produced. */
export interface IterationSample {
  /** param name -> value used in the iteration that produced these metrics. */
  params: Record<string, number>;
  /** metric name -> generated value observed that iteration. */
  metrics: Record<string, number>;
}

export interface CorrectInput {
  /** The COMPARE output for the current candidate. */
  compareResult: ComparisonResult;
  /** Current parameter set (the search space). */
  params: CorrectionParam[];
  /** Number of correction steps already taken (0-based). Drives the iteration cap. */
  iteration?: number;
  /** Worst |deltaPercent| from the prior iteration (for progress / plateau detection). */
  previousMaxDeltaPercent?: number;
  /** Consecutive prior non-progress iterations (threaded by runClosedLoop). */
  stagnantIterations?: number;
  /** Prior (param, metric) samples for the secant method. */
  history?: IterationSample[];
  config?: Partial<CorrectionConfig>;
}

export interface ParamCorrection {
  name: string;
  oldValue: number;
  newValue: number;
  drivenByMetric: string;
  /** The metric's residual delta% when this correction was computed (diagnostic input, not a post-correction prediction). */
  currentDeltaPercent: number;
  method: CorrectionMethod;
  clampedToBound: boolean;
  stepLimited: boolean;
}

export interface CorrectionResult {
  status: ConvergenceStatus;
  /** 1-based index of THIS correction step. */
  iteration: number;
  /** Worst |deltaPercent| across all metrics this iteration. */
  maxDeltaPercent: number;
  /** passRate carried from the input ComparisonResult. */
  passRate: number;
  /** Fractional improvement in maxDeltaPercent vs the prior iteration (null on first). */
  improvedFraction: number | null;
  corrections: ParamCorrection[];
  correctedParams: CorrectionParam[];
  /** Failing metrics that have NO influencing param (structurally uncorrectable). */
  uncorrectableMetrics: string[];
  recommendation: string;
}

export interface ClosedLoopStep {
  iteration: number;
  maxDeltaPercent: number;
  passRate: number;
  status: ConvergenceStatus;
  corrections: ParamCorrection[];
}

export interface ClosedLoopResult {
  status: ConvergenceStatus;
  converged: boolean;
  iterations: number;
  finalParams: CorrectionParam[];
  finalComparison: ComparisonResult | null;
  trajectory: ClosedLoopStep[];
  recommendation: string;
}

/** A fused GENERATE+COMPARE evaluator injected by the live driver (or a mock in tests). */
export type EvaluateFn = (
  params: CorrectionParam[],
) => ComparisonResult | Promise<ComparisonResult>;

export interface RunClosedLoopInput {
  initialParams: CorrectionParam[];
  /** Generates a candidate from params and compares it to the reference, returning the delta vector. */
  evaluate: EvaluateFn;
  config?: Partial<CorrectionConfig>;
  /** Optional per-iteration callback so the caller can checkpoint (resumability is the caller's job). */
  onIteration?: (step: ClosedLoopStep, comparison: ComparisonResult) => void;
}

export interface RegenCorrectionStats {
  totalCorrectCalls: number;
  totalCorrectionsApplied: number;
  totalLoopsRun: number;
  totalConverged: number;
}

// ---------------------------------------------------------------------------
// ENGINE
// ---------------------------------------------------------------------------

export class CADRegenCorrectionEngine {
  private totalCorrectCalls = 0;
  private totalCorrectionsApplied = 0;
  private totalLoopsRun = 0;
  private totalConverged = 0;

  /**
   * One CORRECT step. Pure: returns a new param set, never mutates the input.
   *
   * @param input compare result + current params (+ optional history / iteration state)
   * @returns corrected params and a convergence verdict
   */
  correct(input: CorrectInput): CorrectionResult {
    if (!input || typeof input !== "object") {
      throw new TypeError("correct: input object required");
    }
    const cmp = input.compareResult;
    if (!cmp || !Array.isArray(cmp.metrics)) {
      throw new TypeError("correct: compareResult with a metrics array required");
    }
    if (!Array.isArray(input.params)) {
      throw new TypeError("correct: params must be an array of CorrectionParam");
    }
    this.totalCorrectCalls++;

    const cfg: CorrectionConfig = { ...DEFAULT_CORRECTION_CONFIG, ...(input.config ?? {}) };
    const iteration = Math.max(0, Math.floor(input.iteration ?? 0)) + 1;
    const params = input.params.map((p) => ({ ...p }));
    const maxDeltaPercent = this.maxAbsDeltaPercent(cmp);
    const passRate = typeof cmp.passRate === "number" ? cmp.passRate : 0;

    const prev = input.previousMaxDeltaPercent;
    const improvedFraction =
      typeof prev === "number" && Number.isFinite(prev) && prev > 0
        ? (prev - maxDeltaPercent) / prev
        : null;

    const failing = cmp.metrics.filter((m) => m && m.passed === false);

    // --- CONVERGED ---------------------------------------------------------
    if (cmp.overallPassed === true || (failing.length === 0 && passRate >= cfg.passRateTarget)) {
      return this.result("converged", iteration, maxDeltaPercent, passRate, improvedFraction, [], params, [],
        "All metrics within tolerance. Replica converged to the reference.");
    }

    // --- MAX ITERATIONS ----------------------------------------------------
    if (iteration > cfg.maxIterations) {
      return this.result("max-iterations", iteration, maxDeltaPercent, passRate, improvedFraction, [], params,
        this.uncorrectable(failing, params),
        `Reached the iteration cap (${cfg.maxIterations}) without convergence. Worst residual ${maxDeltaPercent.toFixed(2)}%. Stop or raise the cap / refine the spec.`);
    }

    // --- PLATEAU -----------------------------------------------------------
    const nonProgress = improvedFraction !== null && improvedFraction < cfg.plateauEpsilon;
    const stagnant = Math.max(0, Math.floor(input.stagnantIterations ?? 0)) + (nonProgress ? 1 : 0);
    if (nonProgress && stagnant >= cfg.plateauPatience) {
      return this.result("plateau", iteration, maxDeltaPercent, passRate, improvedFraction, [], params,
        this.uncorrectable(failing, params),
        `Max-delta improvement stalled below ${(cfg.plateauEpsilon * 100).toFixed(1)}% for ${stagnant} iterations. Residual ${maxDeltaPercent.toFixed(2)}% is the classified ceiling -- record it, do not chase noise.`);
    }

    // --- CORRECT -----------------------------------------------------------
    // Largest delta first (coordinate descent). Each param is steered by only
    // ONE metric per step -- its largest-delta influencer -- to avoid double
    // correction of a coupled param.
    const failingSorted = [...failing].sort(
      (a, b) => Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent),
    );
    const corrections: ParamCorrection[] = [];
    const usedParams = new Set<string>();

    for (const metric of failingSorted) {
      if (!Number.isFinite(metric.original) || !Number.isFinite(metric.generated)) continue;
      const param = params.find(
        (p) => !usedParams.has(p.name) && Array.isArray(p.influences) && p.influences.includes(metric.metric),
      );
      if (!param) continue; // no free influencing param for this metric
      const c = this.computeStep(param, metric, cfg, input.history);
      if (c) {
        corrections.push(c);
        usedParams.add(param.name);
        param.value = c.newValue;
      }
    }

    const uncorrectableMetrics = this.uncorrectable(failing, params);

    if (corrections.length === 0) {
      return this.result("no-correctable-params", iteration, maxDeltaPercent, passRate, improvedFraction, [], params,
        uncorrectableMetrics,
        uncorrectableMetrics.length > 0
          ? `No tunable param influences the failing metric(s): ${uncorrectableMetrics.join(", ")}. These are structurally unrecoverable by this spec (e.g. proprietary-surface topology) -- the honest ceiling.`
          : "No correction could be computed (degenerate metric values).");
    }

    this.totalCorrectionsApplied += corrections.length;
    return this.result("iterate", iteration, maxDeltaPercent, passRate, improvedFraction, corrections, params,
      uncorrectableMetrics,
      `Applied ${corrections.length} correction(s). Re-GENERATE with the corrected spec and re-COMPARE.`);
  }

  /**
   * Run the full GENERATE -> COMPARE -> CORRECT loop to convergence (or plateau /
   * cap) using an injected `evaluate` (a fused generate+compare reader).
   * Deterministic given a deterministic `evaluate`.
   */
  async runClosedLoop(input: RunClosedLoopInput): Promise<ClosedLoopResult> {
    if (!input || typeof input.evaluate !== "function") {
      throw new TypeError("runClosedLoop: an evaluate function is required");
    }
    if (!Array.isArray(input.initialParams)) {
      throw new TypeError("runClosedLoop: initialParams must be an array");
    }
    this.totalLoopsRun++;

    const cfg: CorrectionConfig = { ...DEFAULT_CORRECTION_CONFIG, ...(input.config ?? {}) };
    let params = input.initialParams.map((p) => ({ ...p }));
    const history: IterationSample[] = [];
    const trajectory: ClosedLoopStep[] = [];
    let prevMaxDelta: number | undefined;
    let stagnant = 0;
    let lastComparison: ComparisonResult | null = null;

    for (let it = 0; it < cfg.maxIterations; it++) {
      const cmp = await input.evaluate(params);
      lastComparison = cmp;
      const maxDelta = this.maxAbsDeltaPercent(cmp);

      history.push({ params: this.snapshotParams(params), metrics: this.metricValues(cmp) });

      // `stagnant` holds the count of consecutive non-progress iterations BEFORE
      // this one; correct() owns the +1 for the current iteration. The counter is
      // advanced AFTER the call (further down) -- pre-incrementing here would
      // double-count this iteration and trip PLATEAU one step early.
      const step = this.correct({
        compareResult: cmp,
        params,
        iteration: it,
        previousMaxDeltaPercent: prevMaxDelta,
        stagnantIterations: stagnant,
        history,
        config: cfg,
      });

      const loopStep: ClosedLoopStep = {
        iteration: it + 1,
        maxDeltaPercent: maxDelta,
        passRate: step.passRate,
        status: step.status,
        corrections: step.corrections,
      };
      trajectory.push(loopStep);
      input.onIteration?.(loopStep, cmp);

      if (step.status === "converged") {
        this.totalConverged++;
        return this.loopResult("converged", true, trajectory, params, cmp,
          `Converged in ${it + 1} iteration(s).`);
      }
      if (step.status === "plateau" || step.status === "no-correctable-params" || step.status === "max-iterations") {
        return this.loopResult(step.status, false, trajectory, params, cmp, step.recommendation);
      }

      // advance the consecutive-non-progress counter for the NEXT iteration
      if (typeof prevMaxDelta === "number" && Number.isFinite(prevMaxDelta) && prevMaxDelta > 0) {
        const improved = (prevMaxDelta - maxDelta) / prevMaxDelta;
        stagnant = improved < cfg.plateauEpsilon ? stagnant + 1 : 0;
      }
      params = step.correctedParams;
      prevMaxDelta = maxDelta;
    }

    return this.loopResult("max-iterations", false, trajectory, params, lastComparison,
      `Hit the iteration cap (${cfg.maxIterations}) without convergence.`);
  }

  /**
   * Write corrected param values back into a reverse-engineered template's
   * opTemplate (via opIndex + argKey), closing CORRECT back to GENERATE.
   * Pure: returns a new opTemplate, never mutates the input.
   *
   * @param opTemplate the reverse-engineered op stream (template.opTemplate)
   * @param corrections the ParamCorrection[] from a correct() result
   * @returns a new op array with corrected arg values applied
   */
  applyToTemplate(
    opTemplate: ReadonlyArray<CADOperation>,
    corrections: ReadonlyArray<ParamCorrection>,
    paramLineage?: ReadonlyArray<CorrectionParam>,
  ): CADOperation[] {
    if (!Array.isArray(opTemplate)) {
      throw new TypeError("applyToTemplate: opTemplate must be an array");
    }
    const cloned: CADOperation[] = opTemplate.map((op) => ({
      ...op,
      args: { ...(op.args ?? {}) },
      ...(op.params ? { params: { ...op.params } } : {}),
    }));
    const lineageByName = new Map<string, CorrectionParam>();
    for (const p of paramLineage ?? []) lineageByName.set(p.name, p);

    for (const c of corrections ?? []) {
      const lineage = lineageByName.get(c.name);
      const opIndex = lineage?.opIndex;
      const argKey = lineage?.argKey;
      if (typeof opIndex !== "number" || typeof argKey !== "string") continue;
      if (opIndex < 0 || opIndex >= cloned.length) continue; // out-of-range guard
      if (!Number.isFinite(c.newValue)) continue;
      // argKey is the `args` key (paramsFromTemplate derives lineage from args).
      // The legacy `params` alias is kept in sync under the SAME key when present.
      cloned[opIndex].args[argKey] = c.newValue;
      if (cloned[opIndex].params) {
        (cloned[opIndex].params as Record<string, unknown>)[argKey] = c.newValue;
      }
    }
    return cloned;
  }

  /**
   * Build a CorrectionParam[] from a reverse-engineered template, carrying
   * opIndex + argKey lineage so applyToTemplate can write corrections back.
   * `influenceMap` maps a metric name to the TemplateParam names that drive it.
   */
  paramsFromTemplate(
    template: ReverseEngineeredTemplate,
    influenceMap: Record<string, string[]>,
  ): CorrectionParam[] {
    if (!template || !Array.isArray(template.params)) {
      throw new TypeError("paramsFromTemplate: template with a params array required");
    }
    // invert metric->paramNames into paramName->metrics
    const byParam: Record<string, string[]> = {};
    for (const [metric, paramNames] of Object.entries(influenceMap ?? {})) {
      for (const pn of paramNames ?? []) {
        (byParam[pn] ??= []).push(metric);
      }
    }
    return template.params.map((tp) => ({
      name: tp.name,
      value: tp.value,
      influences: byParam[tp.name] ?? [],
      opIndex: tp.opIndex,
      argKey: tp.argKey,
    }));
  }

  getStats(): RegenCorrectionStats {
    return {
      totalCorrectCalls: this.totalCorrectCalls,
      totalCorrectionsApplied: this.totalCorrectionsApplied,
      totalLoopsRun: this.totalLoopsRun,
      totalConverged: this.totalConverged,
    };
  }

  // -------------------------------------------------------------------------
  // INTERNAL
  // -------------------------------------------------------------------------

  /** Compute one param step toward its target metric. Returns null if degenerate. */
  private computeStep(
    param: CorrectionParam,
    metric: { metric: string; original: number; generated: number },
    cfg: CorrectionConfig,
    history?: IterationSample[],
  ): ParamCorrection | null {
    const sign = (param.monotonicity ?? 1) >= 0 ? 1 : -1;
    const old = param.value;
    if (!Number.isFinite(old)) return null;

    let proposed: number | null = null;
    let method: CorrectionMethod = cfg.method;

    const wantSecant = cfg.method === "secant" || cfg.method === "auto";
    if (wantSecant) {
      const secant = this.secantStep(param, metric, history);
      if (secant !== null) {
        proposed = secant;
        method = "secant";
      }
    }

    if (proposed === null) {
      // proportional fallback (also the "proportional" / "coordinate-descent" path)
      if (!Number.isFinite(metric.generated) || metric.generated === 0) return null;
      if (!Number.isFinite(metric.original)) return null;
      const ratio = metric.original / metric.generated; // multiplicative change wanted in the metric
      if (!Number.isFinite(ratio) || ratio <= 0) return null;
      proposed = sign > 0 ? old * ratio : old / ratio;
      method = cfg.method === "auto" ? "proportional" : cfg.method;
    }

    if (proposed === null || !Number.isFinite(proposed)) return null;

    // trust region: bound the step to +-maxStepFraction * |old|
    let stepLimited = false;
    const span = Math.abs(old) * cfg.maxStepFraction;
    if (span > 0 && Math.abs(proposed - old) > span) {
      proposed = old + Math.sign(proposed - old) * span;
      stepLimited = true;
    }

    // hard bounds
    let clampedToBound = false;
    if (typeof param.max === "number" && proposed > param.max) {
      proposed = param.max;
      clampedToBound = true;
    }
    if (typeof param.min === "number" && proposed < param.min) {
      proposed = param.min;
      clampedToBound = true;
    }

    if (proposed === old) return null; // no movement -> not a correction

    return {
      name: param.name,
      oldValue: old,
      newValue: proposed,
      drivenByMetric: metric.metric,
      currentDeltaPercent: metric.original !== 0
        ? ((metric.generated - metric.original) / Math.abs(metric.original)) * 100
        : 0,
      method,
      clampedToBound,
      stepLimited,
    };
  }

  /**
   * Secant slope from the two most recent history samples with DISTINCT values
   * of this param. step = (target - current) / slope. Returns null if there is
   * not enough distinct history or the slope is degenerate.
   */
  private secantStep(
    param: CorrectionParam,
    metric: { metric: string; generated: number; original: number },
    history?: IterationSample[],
  ): number | null {
    if (!Array.isArray(history) || history.length < 2) return null;
    // walk backward collecting samples that have both this param and this metric
    const pts: Array<{ p: number; m: number }> = [];
    for (let i = history.length - 1; i >= 0 && pts.length < 2; i--) {
      const h = history[i];
      const p = h?.params?.[param.name];
      const m = h?.metrics?.[metric.metric];
      if (typeof p === "number" && Number.isFinite(p) && typeof m === "number" && Number.isFinite(m)) {
        if (pts.length === 0 || pts[0].p !== p) pts.push({ p, m });
      }
    }
    if (pts.length < 2) return null;
    const [recent, older] = pts;
    const dp = recent.p - older.p;
    const dm = recent.m - older.m;
    if (dp === 0 || dm === 0 || !Number.isFinite(dm / dp)) return null;
    const slope = dm / dp;
    const step = (metric.original - recent.m) / slope;
    const proposed = recent.p + step;
    return Number.isFinite(proposed) ? proposed : null;
  }

  /** Worst |deltaPercent| across all metrics (0 when empty / non-finite). */
  private maxAbsDeltaPercent(cmp: ComparisonResult): number {
    let max = 0;
    for (const m of cmp.metrics ?? []) {
      const d = Math.abs(m?.deltaPercent ?? 0);
      if (Number.isFinite(d) && d > max) max = d;
    }
    return max;
  }

  private metricValues(cmp: ComparisonResult): Record<string, number> {
    const out: Record<string, number> = {};
    for (const m of cmp.metrics ?? []) {
      if (m && typeof m.metric === "string" && Number.isFinite(m.generated)) {
        out[m.metric] = m.generated;
      }
    }
    return out;
  }

  private snapshotParams(params: ReadonlyArray<CorrectionParam>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const p of params) if (Number.isFinite(p.value)) out[p.name] = p.value;
    return out;
  }

  /** Failing metric names that have no influencing param in the set. */
  private uncorrectable(
    failing: ReadonlyArray<{ metric: string }>,
    params: ReadonlyArray<CorrectionParam>,
  ): string[] {
    return failing
      .filter((m) => !params.some((p) => Array.isArray(p.influences) && p.influences.includes(m.metric)))
      .map((m) => m.metric);
  }

  private result(
    status: ConvergenceStatus,
    iteration: number,
    maxDeltaPercent: number,
    passRate: number,
    improvedFraction: number | null,
    corrections: ParamCorrection[],
    correctedParams: CorrectionParam[],
    uncorrectableMetrics: string[],
    recommendation: string,
  ): CorrectionResult {
    return {
      status,
      iteration,
      maxDeltaPercent,
      passRate,
      improvedFraction,
      corrections,
      correctedParams,
      uncorrectableMetrics,
      recommendation,
    };
  }

  private loopResult(
    status: ConvergenceStatus,
    converged: boolean,
    trajectory: ClosedLoopStep[],
    finalParams: CorrectionParam[],
    finalComparison: ComparisonResult | null,
    recommendation: string,
  ): ClosedLoopResult {
    return {
      status,
      converged,
      iterations: trajectory.length,
      finalParams,
      finalComparison,
      trajectory,
      recommendation,
    };
  }
}

export const cadRegenCorrectionEngine = new CADRegenCorrectionEngine();
