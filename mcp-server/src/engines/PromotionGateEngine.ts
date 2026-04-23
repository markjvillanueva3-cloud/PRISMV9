/**
 * PromotionGateEngine — U-LEARN-06
 * ==================================
 *
 * Statistical gate governing LoRA adapter promotions.  Implements:
 *
 *   1. Shadow-observation ledger — append-only JSONL, one row per paired
 *      (champion, challenger) prediction against the same actual outcome.
 *
 *   2. Welch's two-sample t-test on absolute-error distributions (robust
 *      to unequal variances and sample sizes), with df from the
 *      Welch–Satterthwaite equation.  p-value uses the normal-tail
 *      approximation — honest for df ≥ ~30; smaller-N runs surface a
 *      "low-sample-df" reason so callers don't over-trust the number.
 *
 *   3. Cohen's d effect-size using the pooled standard deviation.
 *
 *   4. Temporal-holdout enforcement — `training_max_ts < test_min_ts`
 *      asserted before a GO verdict can fire.
 *
 *   5. Verdict synthesis — GO requires:
 *        (a) n_challenger ≥ min_samples AND n_champion ≥ min_samples
 *        (b) challenger mean-error better than champion under the
 *            stated direction (lower_is_better)
 *        (c) p_value ≤ alpha
 *        (d) |Cohen's d| ≥ 0.2 (small effect) AND aligned with direction
 *        (e) temporal_holdout_ok (when the caller supplies a boundary)
 *      NO_GO when any of (b)-(e) fail; INSUFFICIENT_DATA when (a) fails.
 *
 *   6. Fail-open write semantics — ledger uses atomic tmp+fsync+rename
 *      like OutcomeCaptureBus / FeatureStore / MLLineage.  Never throws.
 *
 * @module engines/PromotionGateEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-06
 */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  ShadowObservationSchema,
  RecordObservationInputSchema,
  EvaluateGateInputSchema,
  type ShadowObservation,
  type RecordObservationInput,
  type EvaluateGateInput,
  type GateEvaluationResult,
} from "../schemas/promotionGateSchema.js";

const GATE_DIR = path.resolve(process.cwd(), "state/promotion_gate");
const GATE_FILE = "shadow_observations.jsonl";
const SCHEMA_VERSION = "1.0.0" as const;

export interface RecordResult {
  ok: boolean;
  obs_id: string;
  warning?: string;
}

export class PromotionGateEngine {
  private readonly rootDir: string;

  constructor(rootDir: string = GATE_DIR) {
    this.rootDir = rootDir;
  }

  /**
   * Append a paired shadow observation. champion_value and challenger_value
   * are what each model predicted; actual_value is the observed truth.
   */
  record(input: RecordObservationInput): RecordResult {
    const parsed = RecordObservationInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, obs_id: "", warning: `schema validation failed: ${parsed.error.message}` };
    }
    const now = new Date().toISOString();
    const obs: ShadowObservation = {
      schemaVersion: SCHEMA_VERSION,
      obs_id: parsed.data.obs_id ?? randomUUID(),
      champion_id: parsed.data.champion_id,
      challenger_id: parsed.data.challenger_id,
      domain: parsed.data.domain,
      metric: parsed.data.metric,
      champion_value: parsed.data.champion_value,
      challenger_value: parsed.data.challenger_value,
      actual_value: parsed.data.actual_value,
      context_key: parsed.data.context_key ?? "",
      event_ts: parsed.data.event_ts ?? now,
      write_ts: now,
      lineage_id: parsed.data.lineage_id,
    };
    const check = ShadowObservationSchema.safeParse(obs);
    if (!check.success) {
      return { ok: false, obs_id: obs.obs_id, warning: `obs check failed: ${check.error.message}` };
    }
    let line: string;
    try {
      line = JSON.stringify(obs) + "\n";
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      return { ok: false, obs_id: obs.obs_id, warning: `serialization failed: ${m}` };
    }
    const res = this.atomicAppend(path.join(this.rootDir, GATE_FILE), line);
    if (!res.ok) return { ok: false, obs_id: obs.obs_id, warning: res.warning };
    return { ok: true, obs_id: obs.obs_id };
  }

  /**
   * Evaluate a promotion candidate. Returns a verdict object suitable for
   * direct consumption by /promote skill or an automated gate hook.
   */
  evaluate(input: EvaluateGateInput): GateEvaluationResult {
    const parsed = EvaluateGateInputSchema.safeParse(input);
    const reasons: string[] = [];
    const now = new Date().toISOString();

    const emptyResult = (): GateEvaluationResult => ({
      verdict: "INSUFFICIENT_DATA",
      champion_id: input.champion_id ?? "",
      challenger_id: input.challenger_id ?? "",
      metric: input.metric ?? "",
      n_champion: 0,
      n_challenger: 0,
      mean_error_champion: 0,
      mean_error_challenger: 0,
      variance_champion: 0,
      variance_challenger: 0,
      welch_t: null,
      welch_df: null,
      p_value: null,
      cohens_d: null,
      effect_size_interpretation: "unknown",
      temporal_holdout_ok: false,
      reasons,
      evaluated_ts: now,
    });

    if (!parsed.success) {
      reasons.push(`schema validation failed: ${parsed.error.message}`);
      return emptyResult();
    }
    const q = parsed.data;

    // Temporal-holdout check — only enforced if caller supplied bounds.
    let temporalOk = true;
    if (q.training_max_ts && q.test_min_ts) {
      temporalOk = Date.parse(q.training_max_ts) < Date.parse(q.test_min_ts);
      if (!temporalOk) {
        reasons.push(
          `temporal holdout violated: training_max_ts (${q.training_max_ts}) >= test_min_ts (${q.test_min_ts})`,
        );
      }
    } else {
      reasons.push("temporal holdout bounds not supplied (caller should pass training_max_ts + test_min_ts)");
    }

    // Collect paired observations.
    const all = this.readAll();
    const relevant = all.filter(
      (o) =>
        o.champion_id === q.champion_id &&
        o.challenger_id === q.challenger_id &&
        o.metric === q.metric,
    );

    const championErrors = relevant.map((o) => Math.abs(o.champion_value - o.actual_value));
    const challengerErrors = relevant.map((o) => Math.abs(o.challenger_value - o.actual_value));
    const n_champion = championErrors.length;
    const n_challenger = challengerErrors.length;

    const result = emptyResult();
    result.champion_id = q.champion_id;
    result.challenger_id = q.challenger_id;
    result.metric = q.metric;
    result.temporal_holdout_ok = temporalOk;
    result.n_champion = n_champion;
    result.n_challenger = n_challenger;

    if (n_champion < q.min_samples || n_challenger < q.min_samples) {
      reasons.push(
        `insufficient data: n_champion=${n_champion}, n_challenger=${n_challenger}, need ≥ ${q.min_samples} each`,
      );
      result.reasons = reasons;
      result.verdict = "INSUFFICIENT_DATA";
      return result;
    }

    const meanC = mean(championErrors);
    const meanCh = mean(challengerErrors);
    const varC = sampleVariance(championErrors, meanC);
    const varCh = sampleVariance(challengerErrors, meanCh);

    const { t, df } = welchT(meanC, varC, n_champion, meanCh, varCh, n_challenger);
    const p = normalTwoTailedPValue(t);
    const d = cohensD(meanC, varC, n_champion, meanCh, varCh, n_challenger);
    const effectInterp = interpretCohensD(d);

    result.mean_error_champion = meanC;
    result.mean_error_challenger = meanCh;
    result.variance_champion = varC;
    result.variance_challenger = varCh;
    result.welch_t = t;
    result.welch_df = df;
    result.p_value = p;
    result.cohens_d = d;
    result.effect_size_interpretation = effectInterp;

    // Direction check: for lower_is_better, challenger wins when meanCh < meanC.
    const challengerDirectionOk = q.lower_is_better ? meanCh < meanC : meanCh > meanC;
    if (!challengerDirectionOk) {
      reasons.push(
        `challenger direction fails: mean_error_champion=${meanC.toFixed(4)} vs challenger=${meanCh.toFixed(4)} (lower_is_better=${q.lower_is_better})`,
      );
    }

    // p-value check
    if (!(typeof p === "number" && p <= q.alpha)) {
      reasons.push(`p-value ${p?.toFixed(4)} exceeds alpha ${q.alpha}`);
    }

    // Effect-size check: |d| >= 0.2 AND direction-consistent
    const effectMagnitudeOk = Math.abs(d) >= 0.2;
    const effectDirectionOk = q.lower_is_better ? d > 0 : d < 0;
    if (!effectMagnitudeOk) {
      reasons.push(`cohens_d magnitude ${d.toFixed(3)} below 0.2 threshold (${effectInterp})`);
    }
    if (!effectDirectionOk) {
      reasons.push(`cohens_d sign ${d > 0 ? "+" : "-"} does not match lower_is_better=${q.lower_is_better}`);
    }

    // Low-df warning (n<30 each means Welch df often <30 and normal-tail p is optimistic)
    if (n_champion < 30 || n_challenger < 30) {
      reasons.push(`low-sample-df: n_champion=${n_champion}, n_challenger=${n_challenger}; p-value uses normal-tail approximation`);
    }

    const verdictGoCriteria =
      challengerDirectionOk &&
      typeof p === "number" && p <= q.alpha &&
      effectMagnitudeOk &&
      effectDirectionOk &&
      temporalOk;

    result.verdict = verdictGoCriteria ? "GO" : "NO_GO";
    if (result.verdict === "GO") {
      reasons.push(
        `GO: mean_err ${meanCh.toFixed(4)} < ${meanC.toFixed(4)}; p=${p?.toFixed(4)} ≤ ${q.alpha}; d=${d.toFixed(3)} (${effectInterp}); temporal_holdout_ok`,
      );
    }
    result.reasons = reasons;
    return result;
  }

  /**
   * Assert-no-leakage helper — separate from evaluate() for callers that
   * want to check temporal holdout in isolation (e.g. before building a
   * training dataset).
   */
  assertNoTemporalLeakage(training_max_ts: string, test_min_ts: string): {
    ok: boolean;
    reason?: string;
  } {
    const trainMs = Date.parse(training_max_ts);
    const testMs = Date.parse(test_min_ts);
    if (Number.isNaN(trainMs) || Number.isNaN(testMs)) {
      return { ok: false, reason: "invalid ISO timestamp(s)" };
    }
    if (trainMs >= testMs) {
      return {
        ok: false,
        reason: `training_max_ts (${training_max_ts}) >= test_min_ts (${test_min_ts}) — temporal holdout violated`,
      };
    }
    return { ok: true };
  }

  stats(): {
    root_dir: string;
    total_observations: number;
    by_pair: Record<string, number>;
    by_metric: Record<string, number>;
    by_domain: Record<string, number>;
  } {
    const all = this.readAll();
    const by_pair: Record<string, number> = {};
    const by_metric: Record<string, number> = {};
    const by_domain: Record<string, number> = {};
    for (const o of all) {
      const key = `${o.champion_id} vs ${o.challenger_id}`;
      by_pair[key] = (by_pair[key] ?? 0) + 1;
      by_metric[o.metric] = (by_metric[o.metric] ?? 0) + 1;
      by_domain[o.domain] = (by_domain[o.domain] ?? 0) + 1;
    }
    return {
      root_dir: this.rootDir,
      total_observations: all.length,
      by_pair,
      by_metric,
      by_domain,
    };
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private readAll(): ShadowObservation[] {
    const filePath = path.join(this.rootDir, GATE_FILE);
    if (!fs.existsSync(filePath)) return [];
    let raw: string;
    try { raw = fs.readFileSync(filePath, "utf8"); } catch { return []; }
    const out: ShadowObservation[] = [];
    for (const rawLine of raw.split(/\r?\n/)) {
      if (!rawLine.trim()) continue;
      try {
        const obj = JSON.parse(rawLine);
        const p = ShadowObservationSchema.safeParse(obj);
        if (p.success) out.push(p.data);
      } catch { /* torn tail — skip */ }
    }
    return out;
  }

  private atomicAppend(filePath: string, line: string): { ok: boolean; warning?: string } {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let existing = "";
      if (fs.existsSync(filePath)) existing = fs.readFileSync(filePath, "utf8");
      const tmp = path.join(
        dir,
        `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`,
      );
      const fd = fs.openSync(tmp, "w");
      try {
        fs.writeSync(fd, existing);
        fs.writeSync(fd, line);
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
      fs.renameSync(tmp, filePath);
      return { ok: true };
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[PromotionGate] atomic-append failed: ${m}\n`);
      return { ok: false, warning: m };
    }
  }

  static getSelfAwareness() {
    return {
      name: "PromotionGateEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-06",
      capabilities: ["record", "evaluate", "assertNoTemporalLeakage", "stats"],
      dependencies: ["promotionGateSchema"],
      dataSourcesUsed: ["state/promotion_gate/shadow_observations.jsonl"],
    };
  }
}

// ---------------------------- Statistics ----------------------------

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function sampleVariance(xs: number[], mu: number): number {
  if (xs.length < 2) return 0;
  let s = 0;
  for (const x of xs) s += (x - mu) ** 2;
  return s / (xs.length - 1);
}

/**
 * Welch's two-sample t-statistic + Welch–Satterthwaite df.
 */
function welchT(
  m1: number, v1: number, n1: number,
  m2: number, v2: number, n2: number,
): { t: number; df: number } {
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const t = se === 0 ? 0 : (m1 - m2) / se;
  const numerator = (v1 / n1 + v2 / n2) ** 2;
  const denominator =
    ((v1 / n1) ** 2) / (n1 - 1) + ((v2 / n2) ** 2) / (n2 - 1);
  const df = denominator === 0 ? (n1 + n2 - 2) : numerator / denominator;
  return { t, df };
}

/**
 * Two-tailed p-value from the standard normal distribution.
 * Honest for df >= ~30; callers should flag low-df via reasons[] — which
 * our engine does.
 */
function normalTwoTailedPValue(z: number): number {
  // 2 * (1 - Phi(|z|)) = erfc(|z| / sqrt(2))
  return erfc(Math.abs(z) / Math.SQRT2);
}

/** Abramowitz-Stegun 7.1.26 — erfc with ≤ 1.5e-7 absolute error. */
function erfc(x: number): number {
  // erfc(x) = 1 - erf(x); we derive erf via the classic rational approximation.
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  const erf = sign * y;
  return 1 - erf;
}

function cohensD(
  m1: number, v1: number, n1: number,
  m2: number, v2: number, n2: number,
): number {
  const pooledSd = Math.sqrt(
    ((n1 - 1) * v1 + (n2 - 1) * v2) / Math.max(1, n1 + n2 - 2),
  );
  return pooledSd === 0 ? 0 : (m1 - m2) / pooledSd;
}

function interpretCohensD(d: number): string {
  const abs = Math.abs(d);
  if (abs < 0.2) return "negligible";
  if (abs < 0.5) return "small";
  if (abs < 0.8) return "medium";
  return "large";
}

export const promotionGateEngine = new PromotionGateEngine();
