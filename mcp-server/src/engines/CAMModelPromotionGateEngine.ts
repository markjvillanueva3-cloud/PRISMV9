// WIRE-EXEMPT: gate/eval engine consumed by the CAM retrain runner + the
// self-driving loop, exposed as its own singleton; not an MCP-protocol surface.
/**
 * CAMModelPromotionGateEngine -- U3 (CLOSE-THE-LOOP CAM self-driving gate)
 * =======================================================================
 *
 * @WIRE-EXEMPT Gate/eval engine. It is its own singleton
 * (`camModelPromotionGateEngine`), consumed directly by the CAM retrain runner
 * and the self-driving loop; there is no MCP-client caller pattern.
 *
 * WHAT THIS CLOSES (U3, verified live 2026-06-30, slot:india):
 * U5 made CAM a training PRODUCER (dual-emit -> FeedbackBus -> neural learner).
 * The learner AUTO-TRAINS at boot already -- `XProcNeuralAutoFireEngine.activate()`
 * (mcp-server/src/index.ts:482, default-on) calls `enableAutoTrain()`
 * DOMAIN-AGNOSTICALLY on the `outcome.recorded` FeedbackBus topic, so accumulating
 * labelled CAM outcomes already trigger `train()` with ZERO CAM-specific wiring
 * (verified: a CAM outcome reaches the buffer + fires a neural.train.tick).
 *
 * What was MISSING -- and what THIS engine is -- is the GATE: a CAM-trained model
 * must not silently become the live model. This engine evaluates a candidate's
 * predictions against a fresh temporal holdout of labelled CAM outcomes and
 * returns a promote/hold verdict against the CANONICAL deploy gate
 * (AUROC>=0.78 / macroF1>=0.55 / Brier<=0.15, selective minConf=0.7) -- the SAME
 * gate the GNN retrain lifecycle enforces (scripts/nn-graph-retrain-lifecycle.mjs
 * promoteDecision). Below-gate stays research-only; a selective operating point
 * (opt-in) may promote when the emitted-above-gate set clears.
 *
 * NOT A DUPLICATE (dedup-checked):
 *   - `PromotionGateEngine` (U-LEARN-06) is a champion-vs-challenger Welch t-test
 *     on paired regression errors -- a DIFFERENT statistical question (is B better
 *     than A on the same actuals). THIS engine is a single-model classification
 *     deploy gate (does THIS model clear absolute AUROC/F1/Brier bars). They
 *     compose: the t-test decides A-vs-B; this gate decides deployable-at-all.
 *   - `scripts/lib/nn-graph-eval.mjs` grades the GNN tier-5 over GRAPH TOPOLOGY.
 *     CAM outcomes are cutting/validation records, a different input; the engine
 *     layer also cannot import a script. We re-derive the identical grade math
 *     (AUROC/macroF1/Brier) in TS with source citations + a drift-pinning test.
 *
 * DESIGN INVARIANTS:
 *   1. HONEST-OR-DEFER. INSUFFICIENT_DATA when a class has < CAM_MIN_HOLDOUT_PER_CLASS
 *      holdout samples; DEGENERATE when the model outputs a constant/near-constant
 *      score (no ranking signal). A tiny-N or degenerate model NEVER earns GO (R12).
 *   2. TEMPORAL HOLDOUT. Enforced: training_max_ts < test_min_ts, else NO_GO.
 *      Prevents label leakage (mirrors PromotionGateEngine.assertNoTemporalLeakage).
 *   3. NEVER THROW. The self-driving loop calls this; every path returns a verdict.
 *   4. CANONICAL GATE. Thresholds imported from camModelGateThresholds (the pinned
 *      TS mirror of the GNN gate) -- never inlined here.
 *
 * @module engines/CAMModelPromotionGateEngine
 * @milestone CLOSE-THE-LOOP-CAM U3
 */

import {
  crossProcessOutcomeStore,
  CrossProcessOutcomeStore,
  type OutcomeRecord,
} from "./CrossProcessOutcomeStore.js";
import {
  CAM_GATE_THRESHOLDS,
  CAM_PRODUCTION_MIN_CONF,
  CAM_SELECTIVE_THRESHOLDS,
  CAM_MIN_HOLDOUT_PER_CLASS,
} from "../schemas/camModelGateThresholds.js";

/** A single held-out CAM outcome + the candidate model's prediction for it. */
export interface CAMHoldoutSample {
  /** The candidate model's probability that this outcome is a "success" [0,1]. */
  score: number;
  /** The candidate's confidence in its emitted class [0,1] (for selective gate). */
  confidence: number;
  /** The candidate's predicted class label. */
  predicted: string;
  /** The ground-truth class label from the CAM outcome. */
  truth: string;
  /** ISO ts of the underlying outcome (temporal-holdout ordering). */
  ts: string;
}

/** Metrics computed over the holdout. Nulls where a metric is undefined. */
export interface CAMEvalMetrics {
  auroc: number | null;
  macroF1: number | null;
  brier: number | null;
  n: number;
  classes: number;
}

/** The full-coverage grade against CAM_GATE_THRESHOLDS. */
export interface CAMFullGrade {
  pass: boolean;
  failures: string[];
}

/** One selective risk-coverage operating point. */
export interface CAMSelectiveRow {
  tau: number;
  emitted: number;
  coverage: number;
  brier: number | null;
  macroF1: number | null;
  brierClears: boolean;
  macroF1Clears: boolean;
  classesEmitted: number;
}

/** The selective (abstaining) deploy verdict at the production gate. */
export interface CAMSelectiveGrade {
  pass: boolean;
  verdict: "deploy-ready-selective" | "no-deployable-operating-point";
  productionGate: number;
  operatingPoint: CAMSelectiveRow | null;
  robustAboveGate: boolean;
  failures: string[];
}

export type CAMPromotionVerdict = "GO" | "GO_SELECTIVE" | "NO_GO" | "INSUFFICIENT_DATA" | "DEGENERATE";

/** The complete gate evaluation returned to the retrain runner / loop. */
export interface CAMPromotionResult {
  verdict: CAMPromotionVerdict;
  /** True iff the candidate may replace the live model (GO or opt-in GO_SELECTIVE). */
  promote: boolean;
  metrics: CAMEvalMetrics;
  fullGrade: CAMFullGrade;
  selectiveGrade: CAMSelectiveGrade | null;
  temporalHoldoutOk: boolean;
  reasons: string[];
  evaluatedTs: string;
}

/** Options for evaluate(). */
export interface CAMEvaluateOptions {
  /** Pre-computed holdout samples (candidate predictions vs truth). Required. */
  holdout: ReadonlyArray<CAMHoldoutSample>;
  /** Latest training-set ts (temporal holdout lower bound). */
  trainingMaxTs?: string;
  /** Earliest test-set ts (temporal holdout upper bound). */
  testMinTs?: string;
  /** Opt-in: allow a selective (abstaining) operating point to promote. Default false. */
  allowSelective?: boolean;
}

// ==========================================================================
// Metric functions -- re-derived faithfully from scripts/lib/nn-graph-eval.mjs
// (engine layer cannot import scripts). Each cites its source. The drift-pinning
// test (camModelGateThresholds.test.ts) fences the THRESHOLDS; these are the
// standard estimators (Mann-Whitney AUROC, macro-F1, Brier) with references.
// ==========================================================================

/**
 * AUROC via the Mann-Whitney U identity (rank-sum). Source parity:
 * scripts/lib/nn-graph-eval.mjs computeAUROC. Returns null with < 1 of either
 * class (undefined -- an honest null beats a fake 0.5). Ref: Hanley & McNeil
 * (1982), "The meaning and use of the area under a ROC curve", Radiology 143.
 */
export function computeAUROC(scores: number[], labels: number[]): number | null {
  const pos: number[] = [];
  const neg: number[] = [];
  for (let i = 0; i < scores.length; i++) {
    if (!Number.isFinite(scores[i]!)) continue;
    (labels[i] === 1 ? pos : neg).push(scores[i]!);
  }
  if (pos.length === 0 || neg.length === 0) return null;
  // Rank all scores (average ranks for ties), sum ranks of positives.
  const all = scores
    .map((s, i) => ({ s, y: labels[i] }))
    .filter((o) => Number.isFinite(o.s))
    .sort((a, b) => a.s - b.s);
  let i = 0;
  let rankSumPos = 0;
  while (i < all.length) {
    let j = i;
    while (j < all.length && all[j]!.s === all[i]!.s) j++;
    const avgRank = (i + 1 + j) / 2; // 1-based average rank over the tie block
    for (let k = i; k < j; k++) if (all[k]!.y === 1) rankSumPos += avgRank;
    i = j;
  }
  const u = rankSumPos - (pos.length * (pos.length + 1)) / 2;
  return u / (pos.length * neg.length);
}

/**
 * Macro-F1 over all truth classes. Source parity: nn-graph-eval.mjs
 * computeMacroF1. Ref: Sokolova & Lapalme (2009), Inf. Process. Manage. 45(4).
 * Returns null when there are no classes.
 */
export function computeMacroF1(
  predicted: string[],
  truth: string[],
): { macroF1: number | null; perClass: Map<string, { precision: number; recall: number; f1: number; support: number }> } {
  const classes = new Set<string>([...predicted, ...truth]);
  if (classes.size === 0) return { macroF1: null, perClass: new Map() };
  const perClass = new Map<string, { precision: number; recall: number; f1: number; support: number }>();
  let sumF1 = 0;
  for (const c of classes) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let support = 0;
    for (let i = 0; i < truth.length; i++) {
      const isTruthC = truth[i] === c;
      const isPredC = predicted[i] === c;
      if (isTruthC) support++;
      if (isPredC && isTruthC) tp++;
      else if (isPredC && !isTruthC) fp++;
      else if (!isPredC && isTruthC) fn++;
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    perClass.set(c, { precision, recall, f1, support });
    sumF1 += f1;
  }
  return { macroF1: sumF1 / classes.size, perClass };
}

/**
 * Brier score -- mean squared error of a probabilistic prediction. Source
 * parity: nn-graph-eval.mjs computeBrier. Ref: Brier (1950), Mon. Weather Rev.
 * 78(1). Returns null on empty input.
 */
export function computeBrier(probs: number[], outcomes: number[]): number | null {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < probs.length; i++) {
    if (Number.isFinite(probs[i]!) && (outcomes[i] === 0 || outcomes[i] === 1)) {
      pairs.push([probs[i]!, outcomes[i]!]);
    }
  }
  if (pairs.length === 0) return null;
  let s = 0;
  for (const [p, o] of pairs) s += (p - o) ** 2;
  return s / pairs.length;
}

/**
 * Detect a DEGENERATE candidate -- one whose scores carry no ranking signal
 * (all identical, or spread < epsilon). Source parity: nn-graph-eval.mjs
 * degenerate detection. A degenerate model's AUROC is meaningless (often
 * exactly 0.5 by construction); it must never earn a GO.
 */
export function isDegenerate(scores: number[], eps = 1e-9): boolean {
  const finite = scores.filter((s) => Number.isFinite(s));
  if (finite.length < 2) return true;
  let min = finite[0]!;
  let max = finite[0]!;
  for (const s of finite) {
    if (s < min) min = s;
    if (s > max) max = s;
  }
  return max - min < eps;
}

function round4(x: number | null): number | null {
  return x === null ? null : Math.round(x * 1e4) / 1e4;
}

// ==========================================================================
// Engine
// ==========================================================================

export class CAMModelPromotionGateEngine {
  private readonly store: CrossProcessOutcomeStore;

  constructor(store: CrossProcessOutcomeStore = crossProcessOutcomeStore) {
    this.store = store;
  }

  /**
   * Count labelled CAM outcomes currently accumulated in the store (the pool a
   * CAM retrain draws from). Filters to the CAM bridges (feature|post) with a
   * usable class label. Lets the runner decide whether there is enough data to
   * bother retraining -- the honest data-volume signal.
   */
  camLabelledPoolSize(): { total: number; byClass: Record<string, number> } {
    const byClass: Record<string, number> = {};
    let total = 0;
    let all: OutcomeRecord[];
    try {
      all = this.store.query({ limit: 1_000_000 });
    } catch {
      return { total: 0, byClass: {} };
    }
    for (const r of all) {
      const isCam = r.bridge === "feature" || r.bridge === "post";
      const isCamFeature =
        r.request_summary?.feature === "toolpath" ||
        r.request_summary?.feature === "post" ||
        r.request_summary?.feature === "nc_validate";
      const kind = r.outcome?.kind;
      const labelled = kind === "success" || kind === "failure" || kind === "operator_override";
      if (isCam && isCamFeature && labelled) {
        total++;
        byClass[kind] = (byClass[kind] ?? 0) + 1;
      }
    }
    return { total, byClass };
  }

  /**
   * Evaluate a CAM-trained candidate against a fresh temporal holdout and return
   * a promote/hold verdict against the canonical deploy gate. NEVER throws.
   *
   * @param opts.holdout       candidate predictions vs ground-truth, per sample.
   * @param opts.trainingMaxTs latest training ts (temporal-holdout lower bound).
   * @param opts.testMinTs     earliest test ts (temporal-holdout upper bound).
   * @param opts.allowSelective opt-in: a selective operating point may promote.
   */
  evaluate(opts: CAMEvaluateOptions): CAMPromotionResult {
    const reasons: string[] = [];
    const evaluatedTs = new Date().toISOString();
    const holdout = Array.isArray(opts?.holdout) ? opts.holdout : [];

    const empty = (verdict: CAMPromotionVerdict): CAMPromotionResult => ({
      verdict,
      promote: false,
      metrics: { auroc: null, macroF1: null, brier: null, n: holdout.length, classes: 0 },
      fullGrade: { pass: false, failures: reasons.slice() },
      selectiveGrade: null,
      temporalHoldoutOk: false,
      reasons,
      evaluatedTs,
    });

    // ---- temporal holdout (leakage guard) ----
    let temporalOk = true;
    if (opts.trainingMaxTs && opts.testMinTs) {
      const trainMs = Date.parse(opts.trainingMaxTs);
      const testMs = Date.parse(opts.testMinTs);
      if (Number.isNaN(trainMs) || Number.isNaN(testMs)) {
        temporalOk = false;
        reasons.push("temporal holdout: invalid ISO timestamp(s)");
      } else if (trainMs >= testMs) {
        temporalOk = false;
        reasons.push(
          `temporal holdout violated: training_max_ts (${opts.trainingMaxTs}) >= test_min_ts (${opts.testMinTs})`,
        );
      }
    } else {
      reasons.push("temporal holdout bounds not supplied (caller should pass trainingMaxTs + testMinTs)");
    }

    // ---- insufficient data (per-class floor) ----
    const perClass: Record<string, number> = {};
    for (const s of holdout) perClass[s.truth] = (perClass[s.truth] ?? 0) + 1;
    const classNames = Object.keys(perClass);
    if (classNames.length < 2) {
      reasons.push(
        `insufficient data: holdout spans ${classNames.length} class(es); need >= 2 classes for a discrimination metric`,
      );
      const r = empty("INSUFFICIENT_DATA");
      r.temporalHoldoutOk = temporalOk;
      r.metrics.classes = classNames.length;
      return r;
    }
    const underfilled = classNames.filter((c) => perClass[c]! < CAM_MIN_HOLDOUT_PER_CLASS);
    if (underfilled.length > 0) {
      reasons.push(
        `insufficient data: class(es) [${underfilled.join(", ")}] have < ${CAM_MIN_HOLDOUT_PER_CLASS} holdout samples ` +
          `(${underfilled.map((c) => `${c}=${perClass[c]}`).join(", ")}); verdict cannot be certified`,
      );
      const r = empty("INSUFFICIENT_DATA");
      r.temporalHoldoutOk = temporalOk;
      r.metrics.classes = classNames.length;
      return r;
    }

    // ---- binary encoding for AUROC/Brier (success vs not-success) ----
    const scores = holdout.map((s) => s.score);
    const binLabels = holdout.map((s) => (s.truth === "success" ? 1 : 0));

    // ---- degenerate guard ----
    if (isDegenerate(scores)) {
      reasons.push("degenerate candidate: model scores carry no ranking signal (constant/near-constant) -- never promote");
      const r = empty("DEGENERATE");
      r.temporalHoldoutOk = temporalOk;
      r.metrics.classes = classNames.length;
      return r;
    }

    // ---- metrics ----
    const auroc = round4(computeAUROC(scores, binLabels));
    const macroF1 = round4(
      computeMacroF1(holdout.map((s) => s.predicted), holdout.map((s) => s.truth)).macroF1,
    );
    const brier = round4(computeBrier(scores, binLabels));
    const metrics: CAMEvalMetrics = {
      auroc,
      macroF1,
      brier,
      n: holdout.length,
      classes: classNames.length,
    };

    // ---- full-coverage grade against the canonical gate ----
    const fullGrade = this.gradeFull(metrics);

    // ---- selective grade (abstaining deploy at the production gate) ----
    const selectiveGrade = this.gradeSelective(holdout, auroc);

    // ---- verdict synthesis ----
    let verdict: CAMPromotionVerdict;
    let promote = false;
    if (fullGrade.pass && temporalOk) {
      verdict = "GO";
      promote = true;
      reasons.push(
        `GO: AUROC ${auroc} >= ${CAM_GATE_THRESHOLDS.auroc}, macroF1 ${macroF1} >= ${CAM_GATE_THRESHOLDS.macroF1}, ` +
          `Brier ${brier} <= ${CAM_GATE_THRESHOLDS.brier}; temporal holdout ok`,
      );
    } else if (opts.allowSelective === true && selectiveGrade.pass && selectiveGrade.robustAboveGate && temporalOk) {
      verdict = "GO_SELECTIVE";
      promote = true;
      reasons.push(
        `GO_SELECTIVE (opt-in): full-coverage gate not cleared (${fullGrade.failures.join("; ")}), ` +
          `but robustly deploy-ready-selective at tau=${selectiveGrade.productionGate} -- consumer abstains below minConf`,
      );
    } else {
      verdict = "NO_GO";
      promote = false;
      if (!temporalOk) reasons.push("NO_GO: temporal holdout not satisfied");
      if (!fullGrade.pass) reasons.push(`NO_GO (full): ${fullGrade.failures.join("; ")}`);
      if (opts.allowSelective === true && !selectiveGrade.pass) {
        reasons.push(`NO_GO (selective): ${selectiveGrade.failures.join("; ")}`);
      }
    }

    return {
      verdict,
      promote,
      metrics,
      fullGrade,
      selectiveGrade,
      temporalHoldoutOk: temporalOk,
      reasons,
      evaluatedTs,
    };
  }

  // ------------------------------------------------------------------
  // Grade internals (canonical thresholds imported, never inlined)
  // ------------------------------------------------------------------

  /** Full-coverage grade -- every canonical threshold must clear. */
  private gradeFull(m: CAMEvalMetrics): CAMFullGrade {
    const failures: string[] = [];
    if (!Number.isFinite(m.auroc as number) || (m.auroc as number) < CAM_GATE_THRESHOLDS.auroc) {
      failures.push(`AUROC ${m.auroc ?? "n/a"} < ${CAM_GATE_THRESHOLDS.auroc}`);
    }
    if (!Number.isFinite(m.macroF1 as number) || (m.macroF1 as number) < CAM_GATE_THRESHOLDS.macroF1) {
      failures.push(`macroF1 ${m.macroF1 ?? "n/a"} < ${CAM_GATE_THRESHOLDS.macroF1}`);
    }
    if (!Number.isFinite(m.brier as number) || (m.brier as number) > CAM_GATE_THRESHOLDS.brier) {
      failures.push(`Brier ${m.brier ?? "n/a"} > ${CAM_GATE_THRESHOLDS.brier}`);
    }
    return { pass: failures.length === 0, failures };
  }

  /**
   * Selective (abstaining) grade at the production gate. Global AUROC must clear
   * AND the emitted-above-gate set must clear Brier + macroF1. Anchored on the
   * production gate (not the most-favorable tau); robustAboveGate requires every
   * tau at/above the gate to clear. Source parity: nn-graph-eval.mjs
   * selectiveDeployPoint + gradeSelectiveDeploy.
   */
  private gradeSelective(
    holdout: ReadonlyArray<CAMHoldoutSample>,
    auroc: number | null,
  ): CAMSelectiveGrade {
    const failures: string[] = [];
    const aurocPass = Number.isFinite(auroc as number) && (auroc as number) >= CAM_GATE_THRESHOLDS.auroc;
    if (!aurocPass) {
      failures.push(`AUROC ${auroc ?? "n/a"} < ${CAM_GATE_THRESHOLDS.auroc} (global ranking)`);
    }

    const rowAt = (tau: number): CAMSelectiveRow => {
      const emittedSamples = holdout.filter((s) => Number.isFinite(s.confidence) && s.confidence >= tau);
      const emitted = emittedSamples.length;
      const coverage = holdout.length > 0 ? emitted / holdout.length : 0;
      if (emitted === 0) {
        return { tau, emitted: 0, coverage: 0, brier: null, macroF1: null, brierClears: false, macroF1Clears: false, classesEmitted: 0 };
      }
      const probs = emittedSamples.map((s) => s.score);
      const bin = emittedSamples.map((s) => (s.truth === "success" ? 1 : 0));
      const brier = round4(computeBrier(probs, bin));
      const macroF1 = round4(
        computeMacroF1(emittedSamples.map((s) => s.predicted), emittedSamples.map((s) => s.truth)).macroF1,
      );
      const classesEmitted = new Set(emittedSamples.map((s) => s.truth)).size;
      return {
        tau,
        emitted,
        coverage: round4(coverage) as number,
        brier,
        macroF1,
        brierClears: Number.isFinite(brier as number) && (brier as number) <= CAM_GATE_THRESHOLDS.brier,
        macroF1Clears: Number.isFinite(macroF1 as number) && (macroF1 as number) >= CAM_GATE_THRESHOLDS.macroF1,
        classesEmitted,
      };
    };

    const productionPoint = rowAt(CAM_PRODUCTION_MIN_CONF);
    const found = productionPoint.emitted > 0 && productionPoint.brierClears && productionPoint.macroF1Clears;
    // Robust: clears at the production gate AND every grid tau at/above it.
    const aboveGate = CAM_SELECTIVE_THRESHOLDS.filter((t) => t >= CAM_PRODUCTION_MIN_CONF).map((t) => rowAt(t));
    const robustAboveGate = found && aboveGate.length > 0 && aboveGate.every((r) => r.emitted > 0 && r.brierClears && r.macroF1Clears);

    if (!found) {
      failures.push(
        productionPoint.emitted === 0
          ? `emits nothing at the production gate tau=${CAM_PRODUCTION_MIN_CONF}`
          : `at tau=${CAM_PRODUCTION_MIN_CONF} emitted set fails: ` +
              [
                productionPoint.brierClears ? null : `Brier ${productionPoint.brier} > ${CAM_GATE_THRESHOLDS.brier}`,
                productionPoint.macroF1Clears ? null : `macroF1 ${productionPoint.macroF1} < ${CAM_GATE_THRESHOLDS.macroF1}`,
              ]
                .filter(Boolean)
                .join(", "),
      );
    }

    const pass = aurocPass && found;
    return {
      pass,
      verdict: pass ? "deploy-ready-selective" : "no-deployable-operating-point",
      productionGate: CAM_PRODUCTION_MIN_CONF,
      operatingPoint: productionPoint.emitted > 0 ? productionPoint : null,
      robustAboveGate,
      failures,
    };
  }
}

export const camModelPromotionGateEngine = new CAMModelPromotionGateEngine();
