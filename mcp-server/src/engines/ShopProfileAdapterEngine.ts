/**
 * ShopProfileAdapterEngine — per-shop learning adapter layer
 *
 * Sits ABOVE ShopConfigurationEngine (the static profile) and BELOW the
 * cost / quote / time engines. Learns per-shop calibration deltas from
 * outcome history (caller-supplied; engine is pure) and emits multipliers
 * that adjust baseline ShopProfile values to a specific shop's reality.
 *
 * Architecture (slot:india /goal-psn-self-improving iter2):
 *
 *   raw calculation (Kienzle / Taylor / quote estimator)
 *       │
 *       ▼  ShopProfileAdapterEngine.adapt(shopId, raw)
 *       │
 *       └─→ shop-calibrated result  (with per-delta confidence + provenance)
 *
 * Outcome ingestion (`learnFromOutcome`) updates an in-engine delta cache
 * via EWMA (exponential-weighted moving average) — recent outcomes dominate,
 * old outcomes decay. Critical-severity outliers (S(x)<0.7) are NOT folded
 * into rate/time deltas (they'd poison the average); instead surfaced as
 * `anomalies` for operator review per R12 fail-loud.
 *
 * JM Die is the BASELINE shop — its outcomes train the canonical PSN
 * substrate that every joining shop calibrates against. Per
 * [[feedback_no_public_h_drive]] customer/part identifiers are NEVER
 * exposed in the emitted adapter snapshot.
 *
 * Cross-PSN integration points (wired by DeepReasoningOutcomeIntegratorEngine
 * in iter N): leg #4 Memories (delta snapshots), leg #6 System Viz
 * (ghost.shop_adapter roost per shop), leg #10 NN/GNN (delta vector ↔ HGT
 * shop-node features), leg #11 PRISM AI (calibrated values feed the router).
 *
 * REFS:
 * - [[reference_psn_training_substrate_2026_05_25]] — PSN substrate map
 * - [[reference_psn_r4_deep_stack_2026_05_25]] — R4 picks (this engine is a
 *   prerequisite for pick #9 DPO/KTO on JM-Die outcomes)
 * - [[reference_cov_engine_2026_05_25]] — CoV substrate primitive (used to
 *   verify adapter deltas before commit)
 * - jm-die-profile.ts — canonical baseline data
 *
 * Pure engine — no I/O. Storage + persistence is dispatcher-layer.
 *
 * @module ShopProfileAdapterEngine
 */

import type { ShopProfile, ShopRates } from "./ShopConfigurationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/**
 * One shop-outcome observation. Caller pipes these from:
 *   - AI_LEDGER.jsonl (per-quote outcome)
 *   - completed-job ledger (per-job actual vs estimate)
 *   - quality reports (per-part Cpk vs spec)
 *
 * Privacy: customer_id / part_id are HASHED externally before reaching this
 * engine. Internal-only fields (raw names, file paths) are NEVER accepted.
 */
export interface ShopOutcomeRecord {
  /** ISO8601 timestamp of the outcome event. */
  observed_at: string;
  /** Job category — used to bucket deltas. */
  category: "lathe" | "mill" | "wedm" | "sinker_edm" | "5axis" | "swiss" | "grinding" | "mill_turn";
  /** Domain of measurement. */
  domain: "rate" | "time" | "quality" | "yield";
  /** Estimated value (baseline ShopProfile prediction). */
  estimated: number;
  /** Actual value (measured on shop floor). */
  actual: number;
  /** Unit of `estimated` + `actual`. */
  unit: string;
  /** Safety/quality score on the outcome — 0..1. <0.70 flags as anomaly. */
  s_of_x?: number;
  /** Opaque opaque-hashed evidence pointer (NEVER raw customer/part name). */
  evidence_id?: string;
}

export interface ShopAdapterDelta {
  /** Multiplier to apply to baseline value (1.0 = no adjustment). */
  multiplier: number;
  /** Confidence in this multiplier — 0..1. Increases with evidence_count. */
  confidence: number;
  /** Number of outcomes folded into this delta. */
  evidence_count: number;
  /** ISO8601 of last folded outcome. */
  last_observed_at: string | null;
  /** Effective-sample-size weight (EWMA decay-adjusted). */
  ess: number;
}

export interface ShopAdapterDeltas {
  /** Per-rate-category multipliers (labor_per_hr, setup_per_hr, ...). */
  rates: Partial<Record<keyof ShopRates, ShopAdapterDelta>>;
  /** Per-job-category time multiplier (estimated_min → actual_min). */
  time_by_category: Partial<Record<ShopOutcomeRecord["category"], ShopAdapterDelta>>;
  /** Per-job-category quality score (rolling mean of s_of_x). */
  quality_by_category: Partial<Record<ShopOutcomeRecord["category"], ShopAdapterDelta>>;
  /** Outcomes that failed S(x) gate — surfaced, NOT folded into deltas. */
  anomalies: ShopOutcomeRecord[];
  /** Last-calibration timestamp. */
  last_calibrated_at: string;
  /** Total outcomes seen (folded + anomalies). */
  total_outcomes: number;
}

export interface AdaptedValue {
  value: number;
  unit: string;
  /** baseline before adapter applied. */
  baseline: number;
  /** delta multiplier applied (or 1.0 if no per-shop data yet). */
  multiplier: number;
  /** Confidence in the adapter delta — 0..1. */
  confidence: number;
  /** Provenance trace. */
  source: string;
  /** Set when adapter falls back to baseline (no evidence). */
  warning?: string;
}

// ============================================================================
// CONSTANTS — calibration discipline
// ============================================================================

/**
 * EWMA decay factor — recent outcomes weight `alpha`, prior history weights
 * `(1 - alpha)`. 0.15 = roughly half-life of ~4 observations. Tuned to be
 * responsive without thrashing on a single outlier.
 */
const EWMA_ALPHA = 0.15;

/**
 * S(x) hard floor — outcomes below this safety-quality threshold are
 * surfaced as anomalies and NOT folded into rate/time deltas. Matches the
 * `omega-thresholds.json` shop_floor tier convention referenced in
 * CLAUDE.md §slash-command execution rules.
 */
const SOFX_ANOMALY_THRESHOLD = 0.70;

/**
 * Minimum evidence_count before a delta's confidence exceeds 0.5. Below
 * this floor, `adapt()` falls back to baseline and emits a `warning`.
 */
const MIN_EVIDENCE_FOR_CONFIDENCE = 3;

/**
 * Maximum multiplier — clamps runaway deltas (a bad ledger entry shouldn't
 * 10x the labor rate). Matches CLAUDE.md "fail loud" — beyond this we
 * surface an anomaly instead of applying the multiplier.
 */
const MAX_MULTIPLIER = 3.0;
const MIN_MULTIPLIER = 0.33;

// ============================================================================
// PURE HELPERS — testable in isolation
// ============================================================================

/**
 * EWMA update: prior + new_observation → new_estimate. Exposed for tests.
 */
export function ewmaUpdate(prior: number, observation: number, alpha = EWMA_ALPHA): number {
  return (1 - alpha) * prior + alpha * observation;
}

/**
 * Confidence as a function of effective sample size. Asymptotic to 1.0
 * around ess≈20. Matches a Wilson-style interval shape (sqrt(ess) growth).
 */
export function confidenceFromEss(ess: number): number {
  if (ess <= 0) return 0;
  // c = 1 - 1 / (1 + sqrt(ess / 4)); ess=4 → 0.5, ess=16 → 0.67, ess=36 → 0.75
  return 1 - 1 / (1 + Math.sqrt(ess / 4));
}

/**
 * Clamp + flag — applies hard bounds and returns null for an out-of-bounds
 * multiplier so the caller can route it through the anomaly path.
 */
export function clampMultiplier(m: number): number | null {
  if (!Number.isFinite(m)) return null;
  if (m < MIN_MULTIPLIER || m > MAX_MULTIPLIER) return null;
  return m;
}

/**
 * Fold a single outcome into an existing delta via EWMA. PURE — caller
 * supplies prior, this returns the new delta object (no mutation).
 *
 * Returns null when the outcome's implied multiplier is out of bounds —
 * caller must route it to anomalies in that case.
 */
export function foldOutcomeIntoDelta(
  prior: ShopAdapterDelta | undefined,
  outcome: ShopOutcomeRecord,
): ShopAdapterDelta | null {
  if (outcome.estimated === 0) return null; // can't compute ratio
  const observed_multiplier = outcome.actual / outcome.estimated;
  const clamped = clampMultiplier(observed_multiplier);
  if (clamped === null) return null;
  const prior_multiplier = prior?.multiplier ?? 1.0;
  const prior_ess = prior?.ess ?? 0;
  const new_multiplier = ewmaUpdate(prior_multiplier, clamped);
  const new_ess = prior_ess * (1 - EWMA_ALPHA) + 1; // ess growth tracks EWMA
  return {
    multiplier: new_multiplier,
    confidence: confidenceFromEss(new_ess),
    evidence_count: (prior?.evidence_count ?? 0) + 1,
    last_observed_at: outcome.observed_at,
    ess: new_ess,
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class ShopProfileAdapterEngine {
  /** Static engine metadata for dispatcher registration. */
  static readonly engineId = "shop_profile_adapter";
  static readonly version = "1.0.0";

  /** In-memory cache: shopId → deltas. Caller persists via dispatcher. */
  private readonly cache = new Map<string, ShopAdapterDeltas>();

  /** Read-only access to current deltas (returns a frozen snapshot). */
  getDeltas(shopId: string): Readonly<ShopAdapterDeltas> | null {
    const d = this.cache.get(shopId);
    if (!d) return null;
    return Object.freeze({
      ...d,
      rates: { ...d.rates },
      time_by_category: { ...d.time_by_category },
      quality_by_category: { ...d.quality_by_category },
      anomalies: [...d.anomalies],
    });
  }

  /** Bootstrap: install pre-computed deltas (e.g. loaded from dispatcher persistence). */
  hydrate(shopId: string, deltas: ShopAdapterDeltas): void {
    this.cache.set(shopId, structuredClone(deltas));
  }

  /** Reset deltas for a shop (e.g. on profile reset). */
  reset(shopId: string): void {
    this.cache.delete(shopId);
  }

  /**
   * Fold one outcome into the shop's delta cache. Critical-severity
   * outcomes (S(x)<0.70) are surfaced as anomalies, NOT folded into
   * rate/time multipliers.
   *
   * Returns the post-fold delta snapshot (or the existing snapshot if the
   * outcome was routed to anomalies).
   */
  learnFromOutcome(shopId: string, outcome: ShopOutcomeRecord): Readonly<ShopAdapterDeltas> {
    const current = this.cache.get(shopId) ?? this.emptyDeltas(outcome.observed_at);

    // R12 input validation
    if (!Number.isFinite(outcome.estimated) || !Number.isFinite(outcome.actual)) {
      throw new Error(
        `ShopProfileAdapterEngine.learnFromOutcome: non-finite estimated/actual ` +
          `(shop=${shopId}, cat=${outcome.category}, dom=${outcome.domain})`,
      );
    }

    // Anomaly route — S(x) failed or implied multiplier out of bounds
    if (typeof outcome.s_of_x === "number" && outcome.s_of_x < SOFX_ANOMALY_THRESHOLD) {
      current.anomalies.push(outcome);
      current.total_outcomes += 1;
      current.last_calibrated_at = outcome.observed_at;
      this.cache.set(shopId, current);
      return this.getDeltas(shopId) as Readonly<ShopAdapterDeltas>;
    }

    // Normal route — fold into the right bucket
    if (outcome.domain === "rate") {
      // Rate outcomes don't fold by category — they map to a ShopRates key.
      // For now we attribute every rate observation to labor_per_hr (the
      // most common); per-category rate routing queues for iter N when
      // dispatcher schema lands.
      const prior = current.rates.labor_per_hr;
      const folded = foldOutcomeIntoDelta(prior, outcome);
      if (folded === null) {
        current.anomalies.push(outcome);
      } else {
        current.rates.labor_per_hr = folded;
      }
    } else if (outcome.domain === "time") {
      const prior = current.time_by_category[outcome.category];
      const folded = foldOutcomeIntoDelta(prior, outcome);
      if (folded === null) {
        current.anomalies.push(outcome);
      } else {
        current.time_by_category[outcome.category] = folded;
      }
    } else if (outcome.domain === "quality" || outcome.domain === "yield") {
      // Quality folds the s_of_x or yield itself, not the multiplier.
      // `actual` is the quality score in [0,1]; treat as direct EWMA update.
      const prior = current.quality_by_category[outcome.category];
      const prior_val = prior?.multiplier ?? 1.0;
      const new_val = ewmaUpdate(prior_val, outcome.actual);
      const prior_ess = prior?.ess ?? 0;
      const new_ess = prior_ess * (1 - EWMA_ALPHA) + 1;
      current.quality_by_category[outcome.category] = {
        multiplier: new_val,
        confidence: confidenceFromEss(new_ess),
        evidence_count: (prior?.evidence_count ?? 0) + 1,
        last_observed_at: outcome.observed_at,
        ess: new_ess,
      };
    }

    current.total_outcomes += 1;
    current.last_calibrated_at = outcome.observed_at;
    this.cache.set(shopId, current);
    return this.getDeltas(shopId) as Readonly<ShopAdapterDeltas>;
  }

  /**
   * Apply per-shop adaptation to a baseline value. Used by cost/quote/time
   * engines to convert their canonical estimates to shop-calibrated ones.
   *
   * Falls back to baseline + warning when evidence is insufficient.
   */
  adapt(
    shopId: string,
    baseline: number,
    opts: {
      kind: "rate" | "time" | "quality";
      category?: ShopOutcomeRecord["category"];
      rate_key?: keyof ShopRates;
      unit: string;
    },
  ): AdaptedValue {
    if (!Number.isFinite(baseline)) {
      throw new Error(`ShopProfileAdapterEngine.adapt: non-finite baseline (shop=${shopId})`);
    }
    const d = this.cache.get(shopId);
    if (!d) {
      return {
        value: baseline,
        unit: opts.unit,
        baseline,
        multiplier: 1.0,
        confidence: 0,
        source: "shop_profile_adapter:no_history",
        warning: `no outcomes recorded for shop=${shopId} — using baseline`,
      };
    }

    let delta: ShopAdapterDelta | undefined;
    if (opts.kind === "rate") {
      delta = d.rates[opts.rate_key ?? "labor_per_hr"];
    } else if (opts.kind === "time" && opts.category) {
      delta = d.time_by_category[opts.category];
    } else if (opts.kind === "quality" && opts.category) {
      delta = d.quality_by_category[opts.category];
    }

    if (!delta || delta.evidence_count < MIN_EVIDENCE_FOR_CONFIDENCE) {
      return {
        value: baseline,
        unit: opts.unit,
        baseline,
        multiplier: 1.0,
        confidence: delta?.confidence ?? 0,
        source: "shop_profile_adapter:insufficient_evidence",
        warning: `evidence_count=${delta?.evidence_count ?? 0} < ${MIN_EVIDENCE_FOR_CONFIDENCE} — using baseline`,
      };
    }

    return {
      value: baseline * delta.multiplier,
      unit: opts.unit,
      baseline,
      multiplier: delta.multiplier,
      confidence: delta.confidence,
      source: `shop_profile_adapter:${opts.kind}:${opts.category ?? opts.rate_key ?? ""}`,
    };
  }

  /**
   * Summarize a shop's learned profile — for /system-viz roost rendering
   * and dispatcher introspection. Returns sanitized JSON (no anomaly raw
   * payloads — only counts).
   */
  summarize(shopId: string): {
    shop_id: string;
    total_outcomes: number;
    anomaly_count: number;
    rate_categories_calibrated: number;
    time_categories_calibrated: number;
    quality_categories_calibrated: number;
    overall_confidence: number;
    last_calibrated_at: string | null;
  } | null {
    const d = this.cache.get(shopId);
    if (!d) return null;
    const rate_count = Object.values(d.rates).filter((x): x is ShopAdapterDelta => !!x).length;
    const time_count = Object.values(d.time_by_category).filter((x): x is ShopAdapterDelta => !!x).length;
    const quality_count = Object.values(d.quality_by_category).filter(
      (x): x is ShopAdapterDelta => !!x,
    ).length;
    const all_confidences = [
      ...Object.values(d.rates),
      ...Object.values(d.time_by_category),
      ...Object.values(d.quality_by_category),
    ]
      .filter((x): x is ShopAdapterDelta => !!x)
      .map((x) => x.confidence);
    const overall = all_confidences.length
      ? all_confidences.reduce((s, c) => s + c, 0) / all_confidences.length
      : 0;
    return {
      shop_id: shopId,
      total_outcomes: d.total_outcomes,
      anomaly_count: d.anomalies.length,
      rate_categories_calibrated: rate_count,
      time_categories_calibrated: time_count,
      quality_categories_calibrated: quality_count,
      overall_confidence: overall,
      last_calibrated_at: d.last_calibrated_at,
    };
  }

  private emptyDeltas(timestamp: string): ShopAdapterDeltas {
    return {
      rates: {},
      time_by_category: {},
      quality_by_category: {},
      anomalies: [],
      last_calibrated_at: timestamp,
      total_outcomes: 0,
    };
  }
}

export const shopProfileAdapterEngine = new ShopProfileAdapterEngine();

/**
 * Apply a calibrated ShopProfile to a baseline ShopProfile by multiplying
 * rate deltas into the rates table. Returns a NEW profile object — caller
 * is responsible for persisting it.
 *
 * NOT a mutation of the baseline. The baseline ShopProfile is canonical
 * (JM Die per CLAUDE.md §TEST SHOP) and never modified in-place.
 */
export function projectAdaptedProfile(
  baseline: ShopProfile,
  shopId: string,
  engine: ShopProfileAdapterEngine = shopProfileAdapterEngine,
): ShopProfile {
  const d = engine.getDeltas(shopId);
  if (!d) return baseline; // no history yet — return canonical baseline
  const adapted_rates: ShopRates = { ...baseline.rates };
  for (const [k, delta] of Object.entries(d.rates)) {
    if (!delta || delta.evidence_count < MIN_EVIDENCE_FOR_CONFIDENCE) continue;
    const key = k as keyof ShopRates;
    adapted_rates[key] = baseline.rates[key] * delta.multiplier;
  }
  return {
    ...baseline,
    rates: adapted_rates,
    updated_at: d.last_calibrated_at,
  };
}
