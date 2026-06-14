// WIRE-EXEMPT: Middleware engine — reads OutcomeCaptureBus to compute parameter-refinement bundles for SpeedFeedOrchestratorEngine. Caller-direct; dispatcher exposure is the sibling unit U-BRIDGE-LEARN-SFC-WIRE.
/**
 * SFCParameterRefinementEngine — U-BRIDGE-LEARN-SFC
 * ==================================================
 *
 * Closed-loop learning → SpeedFeedOrchestrator parameter refinement.
 *
 * Wires the OUTPUT side of the SFC learning pipeline into the FEEDBACK side:
 *
 *   SFCOutcomeCaptureWireEngine ──emits──► OutcomeCaptureBus
 *                                                 │
 *   THIS ENGINE ◄──reads──── OutcomeCaptureBus    │
 *        │                                         │
 *        ▼                                         │
 *   computeRefinement(context) → multiplicative correction factors
 *        │
 *        ▼
 *   SpeedFeedOrchestratorEngine (opt-in refinement pass — wired separately)
 *
 * Algorithm:
 *   1. Read recent (default 90 days) `recommendation_emitted` events on
 *      domain="speed_feed" — these carry SFC recommendations keyed by
 *      lineage_id, with `.recommended.summary.{sfm,vc,fpt,fz,feed_rate,doc,ae,ap}`
 *      populated by SFCOutcomeCaptureWireEngine.
 *   2. Read pairing events on same lineage_ids — operator_override,
 *      cycle_time_measurement, surface_finish_ra, quote_vs_actual. The
 *      pairing carries the ACTUAL value in `actual.*`. (`tool_break` and
 *      `chatter_event` are binary signals without numeric ratios and are
 *      intentionally excluded; they may be folded into a future failure-
 *      probability refinement layer.)
 *   3. Filter by caller context (material, machine_id, tool_id, operation,
 *      customer) — a refinement bundle is ONLY valid for the matched context;
 *      cross-context learning leaks bias from the wrong machine into the
 *      right one. Per [[feedback_verify_actual_contract_not_proxy]].
 *   4. For each canonical metric (sfm, fz, feed_rate, doc, ae): compute
 *      ratios `actual / recommended`, take the **median** (robust against
 *      one bad operator override), clamp to the safety band [0.5, 2.0],
 *      and emit IQR alongside as a dispersion signal.
 *   5. Confidence: `min(1, sampleSize / N_FULL) * exp(-meanIQR / IQR_SCALE)`.
 *      Small samples or high dispersion → low confidence → caller damps
 *      the correction more aggressively.
 *   6. Empty / insufficient samples → factor=1.0, confidence=0 (Karpathy
 *      R12 fail-loud: never silently mark "refinement applied" when there's
 *      no evidence). Caller MUST check `ok` + `confidence` before applying.
 *
 * Canonical-constant invariant (load-bearing):
 *   This engine NEVER updates the canonical physics constants in
 *   `src/physics/constants.ts`. Kienzle kc1.1, Taylor C/n, material density
 *   etc. remain the immutable physics ground truth. The refinement is a
 *   multiplicative correction applied AT THE OUTPUT of SpeedFeedOrchestrator
 *   — a layer on top of physics, not a replacement. This preserves the
 *   "physics constants imported, never inlined" rule (CLAUDE.md SAFETY).
 *
 * Distinction from existing engines:
 *   - SFCOutcomeCaptureWireEngine: emits SFC recommendations INTO the bus.
 *     One-way (this engine reads from the same bus).
 *   - PPGSFCClosedLoopOrchestratorEngine: simulated closed-loop demo with
 *     `Math.random()` adapter; validates workflow shape, not real ratios.
 *   - LatheActualFeedbackTuningEngine: lathe-specific Taylor C refit with
 *     full predicted/actual records. THIS engine reads the BUS (open-ended
 *     event stream), is cross-domain (mill+lathe+wedm), and produces
 *     multiplicative corrections — complementary, not duplicate.
 *   - CrossProcessNeuralLearningEngine: NN-based confidence prediction.
 *     SFC consults it as a pass/review/block gate via
 *     `SpeedFeedOrchestratorEngine.consultNeuralPredictor`. THIS engine is
 *     deterministic median + IQR; no NN dependency.
 *
 * Safety properties:
 *   - Read-only on the bus (uses .query()); never mutates outcome events.
 *   - Pure function of bus events + context — no other I/O.
 *   - Clamped factors prevent runaway corrections (the cap is canonical;
 *     see SAFETY_BAND_MIN/MAX below).
 *   - Empty-evidence path returns `factor=1, confidence=0`. Caller must
 *     gate on `confidence >= threshold` before applying.
 *   - Never throws (matches OutcomeCaptureBus + SFCOutcomeCaptureWireEngine
 *     "best-effort, return result object" contract).
 *
 * @module engines/SFCParameterRefinementEngine
 * @milestone BRIDGE-DEEP U-BRIDGE-LEARN-SFC (2026-05-20)
 */

import { z } from "zod";
import {
  outcomeCaptureBusEngine,
  type OutcomeCaptureBusEngine,
} from "./OutcomeCaptureBusEngine.js";
import type { OutcomeEvent } from "../schemas/outcomeEventSchema.js";

/**
 * Canonical correction factors emitted by this engine. Each is a
 * MULTIPLICATIVE scalar — caller multiplies the corresponding SFC output
 * field by the factor. A factor of 1.0 means "no correction" (either
 * insufficient evidence or the historical median agrees with physics).
 */
export interface SFCRefinementFactors {
  sfmFactor: number;
  fzFactor: number;
  feedRateFactor: number;
  docFactor: number;
  aeFactor: number;
}

/**
 * Per-metric dispersion (interquartile range of the observed ratios). High
 * IQR with small median delta → noisy population; caller may damp further.
 */
export interface SFCRefinementDispersion {
  sfm?: number;
  fz?: number;
  feed_rate?: number;
  doc?: number;
  ae?: number;
}

/**
 * Context filter — refinement is computed against outcomes whose context
 * matches all NON-UNDEFINED fields. An empty context matches all events;
 * a fully-specified context narrows to the single machine + material +
 * tool combination that's about to run.
 *
 * NOTE: matching is exact-string equality (case-sensitive). The bus's
 * context fields are caller-controlled — we don't normalize here because
 * silently matching "Steel" against "STEEL" would mask data-quality bugs
 * the producer should fix at emission time.
 */
export interface SFCRefinementContext {
  customer?: string;
  material?: string;
  machine_id?: string;
  tool_id?: string;
  operation?: string;
}

export interface SFCRefinementInput {
  context: SFCRefinementContext;
  /** Lookback window in days. Default 90. Bus shards rotate per domain. */
  sinceDays?: number;
  /** Minimum sample size before factor != 1. Default 3. */
  minSamples?: number;
  /** Symmetric clamp around 1.0. Default 2.0 → factor ∈ [0.5, 2.0]. */
  maxFactor?: number;
  /** IQR scale for confidence damping. Default 0.5. */
  iqrScale?: number;
  /** Sample-size confidence ceiling. Default 20. */
  fullConfidenceSamples?: number;
  /** Optional bus injection for tests. */
  bus?: OutcomeCaptureBusEngine;
  /**
   * Optional clock for tests — returns current epoch ms. Defaults to
   * Date.now. Threaded through both the `since_iso` lookback computation
   * AND the `computedAtIso` provenance stamp so a frozen-time test sees
   * deterministic outputs.
   */
  clock?: () => number;
}

export type SFCRefinementResult =
  | {
      ok: true;
      factors: SFCRefinementFactors;
      confidence: number;
      sampleSize: number;
      evidenceLineageIds: string[];
      /** True when the surfaced `evidenceLineageIds` list was truncated for size. */
      evidenceLineageIdsTruncated: boolean;
      dispersion: SFCRefinementDispersion;
      contextMatchHash: string;
      computedAtIso: string;
      /** Per-metric raw sample counts (∑ ≥ sampleSize because one event can carry multiple metrics). */
      perMetricSamples: Partial<Record<keyof SFCRefinementFactors, number>>;
      warning?: string;
    }
  | {
      ok: false;
      reason:
        | "no_evidence"
        | "below_min_samples"
        | "invalid_context"
        | "bus_error";
      message: string;
      sampleSize: number;
      contextMatchHash: string;
    };

/**
 * Hard safety band — factors clamped to [1/MAX, MAX] regardless of caller
 * `maxFactor`. This is an OPERATIONAL GUARDRAIL, not a physics derivation:
 * a 4× refinement signal almost always indicates a unit-mismatch or
 * column-shift bug at the producer, not a real correction. Tighter
 * per-material caps live in the caller's policy layer (the orchestrator's
 * machine + material profile), not here.
 */
const HARD_SAFETY_BAND_MAX = 4.0;
const HARD_SAFETY_BAND_MIN = 1 / HARD_SAFETY_BAND_MAX;

const DEFAULT_SINCE_DAYS = 90;
// Reviewer B (arm-B) flagged single-outlier dominance at minSamples=3.
// Default 5 raises the floor so a lone bad operator_override cannot drive
// the median; caller may pass minSamples=3 explicitly for low-data regimes.
const DEFAULT_MIN_SAMPLES = 5;
const DEFAULT_MAX_FACTOR = 2.0;
const DEFAULT_IQR_SCALE = 0.5;
const DEFAULT_FULL_CONFIDENCE_SAMPLES = 20;
const BUS_QUERY_HARD_LIMIT = 10_000;

const SFCInputSchema = z
  .object({
    context: z
      .object({
        customer: z.string().min(1).optional(),
        material: z.string().min(1).optional(),
        machine_id: z.string().min(1).optional(),
        tool_id: z.string().min(1).optional(),
        operation: z.string().min(1).optional(),
      })
      .describe("Context filter — refinement narrowed to matching outcomes."),
    sinceDays: z.number().positive().max(3650).optional(),
    minSamples: z.number().int().positive().max(10_000).optional(),
    maxFactor: z.number().gt(1).max(HARD_SAFETY_BAND_MAX).optional(),
    iqrScale: z.number().positive().max(10).optional(),
    fullConfidenceSamples: z.number().int().positive().max(10_000).optional(),
  })
  .describe("SFC parameter-refinement input.");

const METRIC_KEYS = ["sfm", "fz", "feed_rate", "doc", "ae"] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

const METRIC_TO_FACTOR_FIELD: Record<MetricKey, keyof SFCRefinementFactors> = {
  sfm: "sfmFactor",
  fz: "fzFactor",
  feed_rate: "feedRateFactor",
  doc: "docFactor",
  ae: "aeFactor",
};

/**
 * Stable hash of the context fields so two callers with identical context
 * receive the same `contextMatchHash` — used as a cache key + provenance
 * pointer downstream. Deterministic, no randomness.
 */
function hashContext(ctx: SFCRefinementContext): string {
  const ordered = (Object.keys(ctx) as (keyof SFCRefinementContext)[])
    .filter((k) => ctx[k] !== undefined)
    .sort();
  if (ordered.length === 0) return "ctx:any";
  const parts = ordered.map((k) => `${k}=${ctx[k]}`);
  return `ctx:${parts.join("|")}`;
}

/**
 * Extract a canonical SFC metric value from a free-form `recommended` or
 * `actual` event payload. Mirrors SFCOutcomeCaptureWireEngine.summarize:
 *   - Looks at the top-level key first.
 *   - Falls back to `.summary.<key>` because SFCOutcomeCaptureWireEngine
 *     writes `recommended: { summary, raw }`.
 *   - Unwraps an AtomicValue (`{ value: number }`) one level.
 *   - Rejects NaN/Infinity defensively.
 */
function extractMetric(payload: unknown, key: MetricKey): number | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const obj = payload as Record<string, unknown>;

  // Top-level direct hit.
  const direct = unwrapNumber(obj[key]);
  if (direct !== undefined) return direct;

  // Wire layer puts it under .summary
  const summary = obj.summary;
  if (summary && typeof summary === "object") {
    const sumObj = summary as Record<string, unknown>;
    const fromSummary = unwrapNumber(sumObj[key]);
    if (fromSummary !== undefined) return fromSummary;
    // fpt/fz alias on the input side; consumers may emit either.
    if (key === "fz") {
      const fpt = unwrapNumber(sumObj.fpt);
      if (fpt !== undefined) return fpt;
    }
  }

  // Camel-case alias.
  if (key === "feed_rate") {
    const camel = unwrapNumber(obj.feedRate);
    if (camel !== undefined) return camel;
  }
  if (key === "fz") {
    const fpt = unwrapNumber(obj.fpt);
    if (fpt !== undefined) return fpt;
  }
  return undefined;
}

function unwrapNumber(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (raw && typeof raw === "object" && "value" in raw) {
    const v = (raw as { value: unknown }).value;
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  }
  return undefined;
}

/**
 * Sort + median + IQR. Returns null for empty arrays.
 */
function medianAndIqr(values: number[]): { median: number; iqr: number } | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const median =
    n % 2 === 1
      ? sorted[(n - 1) / 2]
      : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  // IQR via linear interpolation on quartile positions.
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  return { median, iqr: Math.max(0, q3 - q1) };
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return NaN;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const rank = p * (sortedAsc.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sortedAsc[lo];
  const frac = rank - lo;
  return sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac;
}

function clamp(x: number, lo: number, hi: number): number {
  if (!Number.isFinite(x)) return 1;
  return Math.min(hi, Math.max(lo, x));
}

/**
 * Does the event's context satisfy all NON-UNDEFINED filter fields?
 */
function contextMatches(
  evt: OutcomeEvent,
  filter: SFCRefinementContext,
): boolean {
  const ctx = (evt.context ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(filter) as (keyof SFCRefinementContext)[]) {
    const want = filter[key];
    if (want === undefined) continue;
    if (ctx[key] !== want) return false;
  }
  return true;
}

export class SFCParameterRefinementEngine {
  private readonly bus: OutcomeCaptureBusEngine;

  constructor(bus: OutcomeCaptureBusEngine = outcomeCaptureBusEngine) {
    this.bus = bus;
  }

  /**
   * Compute a multiplicative correction bundle for a given context.
   *
   * @returns result object — caller MUST inspect `ok` and `confidence`.
   */
  computeRefinement(input: SFCRefinementInput): SFCRefinementResult {
    // 1. Validate input.
    const parsed = SFCInputSchema.safeParse({
      context: input.context,
      sinceDays: input.sinceDays,
      minSamples: input.minSamples,
      maxFactor: input.maxFactor,
      iqrScale: input.iqrScale,
      fullConfidenceSamples: input.fullConfidenceSamples,
    });
    if (!parsed.success) {
      return {
        ok: false,
        reason: "invalid_context",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; "),
        sampleSize: 0,
        contextMatchHash: hashContext(input.context ?? {}),
      };
    }

    const sinceDays = parsed.data.sinceDays ?? DEFAULT_SINCE_DAYS;
    const minSamples = parsed.data.minSamples ?? DEFAULT_MIN_SAMPLES;
    const maxFactor = clamp(
      parsed.data.maxFactor ?? DEFAULT_MAX_FACTOR,
      1.001,
      HARD_SAFETY_BAND_MAX,
    );
    const iqrScale = parsed.data.iqrScale ?? DEFAULT_IQR_SCALE;
    const nFull =
      parsed.data.fullConfidenceSamples ?? DEFAULT_FULL_CONFIDENCE_SAMPLES;
    const bus = input.bus ?? this.bus;
    const clock = input.clock ?? (() => Date.now());

    const nowMs = clock();
    const sinceMs = nowMs - sinceDays * 86_400_000;
    const since_iso = new Date(sinceMs).toISOString();
    const ctxHash = hashContext(input.context);

    // 2. Pull recommendation_emitted events (the SFC side).
    let recEvents: OutcomeEvent[];
    try {
      const qr = bus.query({
        domain: "speed_feed",
        kind: "recommendation_emitted",
        since_iso,
        limit: BUS_QUERY_HARD_LIMIT,
      });
      recEvents = qr.events;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        reason: "bus_error",
        message: `bus.query(recommendation_emitted) failed: ${msg}`,
        sampleSize: 0,
        contextMatchHash: ctxHash,
      };
    }

    // 3. Build a lineage_id → recommended-metrics map, restricted to events
    //    whose context matches the caller's filter.
    type RecMetrics = Partial<Record<MetricKey, number>>;
    const recByLineage = new Map<string, RecMetrics>();
    for (const evt of recEvents) {
      if (!contextMatches(evt, input.context)) continue;
      const metrics: RecMetrics = {};
      for (const key of METRIC_KEYS) {
        const v = extractMetric(evt.recommended, key);
        if (v !== undefined) metrics[key] = v;
      }
      // Only include if at least one metric is recoverable.
      if (Object.keys(metrics).length === 0) continue;
      recByLineage.set(evt.lineage_id, metrics);
    }

    if (recByLineage.size === 0) {
      return {
        ok: false,
        reason: "no_evidence",
        message: `no SFC recommendations matching context in the last ${sinceDays}d`,
        sampleSize: 0,
        contextMatchHash: ctxHash,
      };
    }

    // 4. Pull pairing events (operator_override is the gold signal; the
    //    other kinds are softer pairing channels for surface/wear/timing).
    let pairEvents: OutcomeEvent[];
    try {
      const qr = bus.query({
        domain: "speed_feed",
        since_iso,
        limit: BUS_QUERY_HARD_LIMIT,
      });
      pairEvents = qr.events;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        reason: "bus_error",
        message: `bus.query(pairing) failed: ${msg}`,
        sampleSize: 0,
        contextMatchHash: ctxHash,
      };
    }

    const PAIRING_KINDS = new Set<string>([
      "operator_override",
      "cycle_time_measurement",
      "surface_finish_ra",
      "quote_vs_actual",
    ]);

    // 5. For each pairing event, fetch its lineage's recommended metrics
    //    and compute per-metric ratios.
    const ratiosByMetric: Record<MetricKey, number[]> = {
      sfm: [],
      fz: [],
      feed_rate: [],
      doc: [],
      ae: [],
    };
    const evidenceLineageIds = new Set<string>();

    for (const evt of pairEvents) {
      if (!PAIRING_KINDS.has(evt.kind)) continue;
      const rec = recByLineage.get(evt.lineage_id);
      if (!rec) continue; // pairing for an unmatched-context recommendation
      // actual is the gold field; fall back to delta if producer wrote there.
      for (const key of METRIC_KEYS) {
        const recommendedValue = rec[key];
        if (recommendedValue === undefined) continue;
        // Reviewer B P1: drop the `delta` fallback. `delta` is semantically
        // a difference payload (per outcomeEventSchema "engine-computed
        // delta summary"); reading it as if it were an absolute would
        // silently corrupt ratios. Producers MUST emit absolute values in
        // `actual`; delta is read-only summary metadata.
        const actualValue = extractMetric(evt.actual, key);
        if (actualValue === undefined) continue;
        const ratio = actualValue / recommendedValue;
        if (!Number.isFinite(ratio) || ratio <= 0) continue;
        // Pre-clip wildly-bad records (>10× or <0.1×) — those are almost
        // certainly unit-mismatch or column-shift bugs, not real corrections.
        if (ratio > 10 || ratio < 0.1) continue;
        ratiosByMetric[key].push(ratio);
        evidenceLineageIds.add(evt.lineage_id);
      }
    }

    const sampleSize = evidenceLineageIds.size;

    if (sampleSize === 0) {
      return {
        ok: false,
        reason: "no_evidence",
        message: "no paired outcome events for matched recommendations",
        sampleSize: 0,
        contextMatchHash: ctxHash,
      };
    }
    if (sampleSize < minSamples) {
      return {
        ok: false,
        reason: "below_min_samples",
        message: `sampleSize=${sampleSize} < minSamples=${minSamples} — refinement withheld`,
        sampleSize,
        contextMatchHash: ctxHash,
      };
    }

    // 6. Compute per-metric median + IQR.
    const factors: SFCRefinementFactors = {
      sfmFactor: 1,
      fzFactor: 1,
      feedRateFactor: 1,
      docFactor: 1,
      aeFactor: 1,
    };
    const dispersion: SFCRefinementDispersion = {};
    const perMetricSamples: Partial<Record<keyof SFCRefinementFactors, number>> =
      {};
    const iqrSamples: number[] = [];

    const lowerBand = Math.max(1 / maxFactor, HARD_SAFETY_BAND_MIN);
    const upperBand = Math.min(maxFactor, HARD_SAFETY_BAND_MAX);

    for (const key of METRIC_KEYS) {
      const arr = ratiosByMetric[key];
      if (arr.length === 0) continue;
      const stat = medianAndIqr(arr);
      if (!stat) continue;
      const clamped = clamp(stat.median, lowerBand, upperBand);
      const factorField = METRIC_TO_FACTOR_FIELD[key];
      factors[factorField] = clamped;
      dispersion[key] = stat.iqr;
      perMetricSamples[factorField] = arr.length;
      iqrSamples.push(stat.iqr);
    }

    // 7. Confidence: sample-size term × dispersion-damping term.
    const sampleTerm = Math.min(1, sampleSize / nFull);
    const meanIqr =
      iqrSamples.length > 0
        ? iqrSamples.reduce((a, b) => a + b, 0) / iqrSamples.length
        : 0;
    const dispersionTerm = Math.exp(-meanIqr / iqrScale);
    const confidence = clamp(sampleTerm * dispersionTerm, 0, 1);

    // 8. Soft warning when every factor collapsed to 1.0 despite sufficient
    //    samples — that means the median was already within the band.
    let warning: string | undefined;
    const anyNonUnit = (Object.values(factors) as number[]).some(
      (f) => Math.abs(f - 1) > 1e-9,
    );
    if (!anyNonUnit) {
      warning =
        "all metrics already aligned with historical actuals — no correction applied (this is a healthy signal)";
    }

    const allLineageIds = [...evidenceLineageIds];
    const LINEAGE_ID_CAP = 50;
    const evidenceLineageIdsTruncated = allLineageIds.length > LINEAGE_ID_CAP;

    return {
      ok: true,
      factors,
      confidence,
      sampleSize,
      evidenceLineageIds: allLineageIds.slice(0, LINEAGE_ID_CAP),
      evidenceLineageIdsTruncated,
      dispersion,
      contextMatchHash: ctxHash,
      computedAtIso: new Date(nowMs).toISOString(),
      perMetricSamples,
      warning,
    };
  }

  /**
   * Apply a refinement bundle to a recommendation payload, multiplying
   * every present metric by the corresponding factor (silently skipping
   * missing fields). Caller-side helper so callers don't re-implement the
   * lookup. Pure — does not mutate the input.
   *
   * Damping: the actual applied factor is
   *   `1 + (factor - 1) * confidence`
   * so a confidence of 0 leaves the recommendation untouched and a
   * confidence of 1 applies the full factor. This is the canonical "soft
   * blend" — never let an under-confident refinement perturb the physics.
   */
  applyToRecommendation<R extends Record<string, unknown>>(
    rec: R,
    refinement: Extract<SFCRefinementResult, { ok: true }>,
  ): R {
    const out: Record<string, unknown> = { ...rec };
    const conf = clamp(refinement.confidence, 0, 1);
    if (conf <= 0) return out as R;
    const dampedFactor = (raw: number) => 1 + (raw - 1) * conf;

    // Reviewer B P1: sfm/vc, doc/ap, fpt/fz are aliased pairs (imperial/
    // metric twins or naming convention drift). Apply the factor to AT
    // MOST ONE key per factor field — first key present wins. Otherwise
    // a payload carrying BOTH sfm and vc would get the factor applied
    // twice (or twice-derived inconsistent values that the consumer's
    // re-derivation step would not flag).
    const applied = new Set<keyof SFCRefinementFactors>();
    const applyKey = (
      payloadKey: string,
      factorField: keyof SFCRefinementFactors,
    ) => {
      if (applied.has(factorField)) return;
      const v = unwrapNumber(out[payloadKey]);
      if (v === undefined) return;
      const f = dampedFactor(refinement.factors[factorField]);
      out[payloadKey] = v * f;
      applied.add(factorField);
    };

    // Aliased order: first key wins. Imperial preferred (matches the
    // canonical SFCRecommendationSummary field order in the wire layer).
    applyKey("sfm", "sfmFactor");
    applyKey("vc", "sfmFactor"); // metric twin of sfm
    applyKey("fpt", "fzFactor");
    applyKey("fz", "fzFactor");
    applyKey("feed_rate", "feedRateFactor");
    applyKey("doc", "docFactor");
    applyKey("ap", "docFactor"); // metric twin of doc
    applyKey("ae", "aeFactor");

    return out as R;
  }
}

export const sfcParameterRefinementEngine = new SFCParameterRefinementEngine();
