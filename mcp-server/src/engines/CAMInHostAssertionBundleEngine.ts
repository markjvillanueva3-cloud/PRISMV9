/**
 * CAMInHostAssertionBundleEngine — U-CAMTEST14
 * =============================================
 *
 * PHASE-8: Central, host-agnostic assertion bundle covering the 7
 * assertion families that every in-host runner must enforce on a
 * scenario result. The 4 in-host runner engines (HyperMill, Fusion360,
 * InventorHSM, Mastercam) currently inline the same logic in their
 * summarize() methods — this engine is the canonical reference
 * implementation that future runners (and the deduplication follow-up)
 * call into instead of copying the math again.
 *
 * The 7 assertion families:
 *   1. frame_arrival           observed count == expected, no gaps/dupes
 *   2. latency_p99             p99 latency ≤ descriptor budget
 *   3. band_transitions        observed transitions == descriptor expected
 *   4. hard_stop_trigger       deliberate ⇒ fires within budget; otherwise must not fire
 *   5. session_stats_reconcile delivered + queued + dropped + unknown == frames_in
 *   6. encoder_schema          every observed.payload_valid is true
 *   7. reconnect_drain         frames_dropped == 0
 *
 * The engine is purely functional — no internal state, no module-level
 * caches. Every call is independent and safe to run in any order.
 *
 * @module engines/CAMInHostAssertionBundleEngine
 * @milestone CAM-EXHAUST-MS0 U-CAMTEST14
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const AssertionNameSchema = z.enum([
  "frame_arrival",
  "latency_p99",
  "band_transitions",
  "hard_stop_trigger",
  "session_stats_reconcile",
  "encoder_schema",
  "reconnect_drain",
]);
export type AssertionName = z.infer<typeof AssertionNameSchema>;

export const ObservedFrameSchema = z.object({
  seq: z.number().int().nonnegative(),
  latency_ms: z.number().nonnegative(),
  hard_stop: z.boolean().default(false),
  band: z.number().int().min(0).max(2).default(0),
  payload_valid: z.boolean().default(true),
});
export type ObservedFrame = z.infer<typeof ObservedFrameSchema>;

export const SessionStatsSchema = z.object({
  frames_in: z.number().int().nonnegative(),
  frames_delivered: z.number().int().nonnegative(),
  frames_queued: z.number().int().nonnegative(),
  frames_dropped: z.number().int().nonnegative(),
  frames_unknown_target: z.number().int().nonnegative(),
});
export type SessionStats = z.infer<typeof SessionStatsSchema>;

export const ScenarioExpectationsSchema = z.object({
  expected_frame_count: z.number().int().positive(),
  expected_band_transitions: z.number().int().nonnegative(),
  deliberate_hard_stop: z.boolean(),
  latency_p99_budget_ms: z.number().positive(),
});
export type ScenarioExpectations = z.infer<typeof ScenarioExpectationsSchema>;

export const AssertionResultSchema = z.object({
  name: AssertionNameSchema,
  pass: z.boolean(),
  detail: z.string(),
  metric: z.record(z.string(), z.number()).optional(),
});
export type AssertionResult = z.infer<typeof AssertionResultSchema>;

export const BundleResultSchema = z.object({
  overall_pass: z.boolean(),
  assertions: z.array(AssertionResultSchema),
  derived: z.object({
    frame_count: z.number().int().nonnegative(),
    latency_p99_ms: z.number().nonnegative(),
    band_transitions_observed: z.number().int().nonnegative(),
    hard_stop_at_seq: z.number().int().nullable(),
  }),
});
export type BundleResult = z.infer<typeof BundleResultSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

export const HARD_STOP_BUDGET_FRAMES_DEFAULT = 3;

// ── Pure helpers (exported for direct reuse + targeted tests) ────────────────

export function p99(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(0.99 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export function countBandTransitions(observed: ObservedFrame[]): number {
  if (observed.length < 2) return 0;
  const sorted = [...observed].sort((a, b) => a.seq - b.seq);
  let transitions = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].band === 0 ? 0 : 1;
    const curr = sorted[i].band === 0 ? 0 : 1;
    if (prev !== curr) transitions += 1;
  }
  return transitions;
}

export function firstHardStopSeq(observed: ObservedFrame[]): number | null {
  const sorted = [...observed].sort((a, b) => a.seq - b.seq);
  for (const f of sorted) if (f.hard_stop) return f.seq;
  return null;
}

export function seqGaps(observed: ObservedFrame[]): { missing: number[]; duplicate: number[] } {
  const missing: number[] = [];
  const duplicate: number[] = [];
  if (observed.length === 0) return { missing, duplicate };
  const sorted = [...observed].sort((a, b) => a.seq - b.seq);
  const seen = new Set<number>();
  for (const f of sorted) {
    if (seen.has(f.seq)) duplicate.push(f.seq);
    seen.add(f.seq);
  }
  const min = sorted[0].seq;
  const max = sorted[sorted.length - 1].seq;
  for (let s = min; s <= max; s++) if (!seen.has(s)) missing.push(s);
  return { missing, duplicate };
}

// ── Engine ───────────────────────────────────────────────────────────────────

export interface EvaluateInput {
  observed: ObservedFrame[];
  stats: SessionStats;
  expectations: ScenarioExpectations;
  hard_stop_budget_frames?: number;
}

export class CAMInHostAssertionBundleEngine {
  static readonly ASSERTION_FAMILIES: readonly AssertionName[] = Object.freeze([
    "frame_arrival",
    "latency_p99",
    "band_transitions",
    "hard_stop_trigger",
    "session_stats_reconcile",
    "encoder_schema",
    "reconnect_drain",
  ]);

  static readonly HARD_STOP_BUDGET_FRAMES_DEFAULT = HARD_STOP_BUDGET_FRAMES_DEFAULT;

  /**
   * Evaluate all 7 assertion families against an observed scenario result.
   * Validates inputs at the schema boundary so caller drift is caught early.
   * Returns the assertion array + overall pass + derived metrics.
   */
  static evaluate(input: EvaluateInput): BundleResult {
    const observed = input.observed.map(o => ObservedFrameSchema.parse(o));
    const stats = SessionStatsSchema.parse(input.stats);
    const exp = ScenarioExpectationsSchema.parse(input.expectations);
    const budget = input.hard_stop_budget_frames ?? HARD_STOP_BUDGET_FRAMES_DEFAULT;

    const latencies = observed.map(o => o.latency_ms);
    const latency_p99_ms = p99(latencies);
    const bands_obs = countBandTransitions(observed);
    const hard_stop_at_seq = firstHardStopSeq(observed);
    const gaps = seqGaps(observed);

    const assertions: AssertionResult[] = [];

    // 1. frame_arrival
    const arrival_ok =
      observed.length === exp.expected_frame_count &&
      gaps.missing.length === 0 &&
      gaps.duplicate.length === 0;
    assertions.push({
      name: "frame_arrival",
      pass: arrival_ok,
      detail: arrival_ok
        ? `observed ${observed.length} frames with no gaps`
        : `observed ${observed.length}/${exp.expected_frame_count}; missing=${gaps.missing.length} dupes=${gaps.duplicate.length}`,
      metric: {
        observed: observed.length,
        expected: exp.expected_frame_count,
        missing: gaps.missing.length,
        duplicate: gaps.duplicate.length,
      },
    });

    // 2. latency_p99
    const latency_ok = latency_p99_ms <= exp.latency_p99_budget_ms;
    assertions.push({
      name: "latency_p99",
      pass: latency_ok,
      detail: `p99 ${latency_p99_ms.toFixed(2)} ms vs budget ${exp.latency_p99_budget_ms} ms`,
      metric: { p99_ms: latency_p99_ms, budget_ms: exp.latency_p99_budget_ms },
    });

    // 3. band_transitions
    const bands_ok = bands_obs === exp.expected_band_transitions;
    assertions.push({
      name: "band_transitions",
      pass: bands_ok,
      detail: `observed ${bands_obs} vs expected ${exp.expected_band_transitions}`,
      metric: { observed: bands_obs, expected: exp.expected_band_transitions },
    });

    // 4. hard_stop_trigger
    let hs_ok = true;
    let hs_detail = "";
    if (exp.deliberate_hard_stop) {
      if (hard_stop_at_seq === null) {
        hs_ok = false;
        hs_detail = "deliberate violation set but no hard_stop observed";
      } else {
        const sorted = [...observed].sort((a, b) => a.seq - b.seq);
        const firstRed = sorted.find(f => f.band === 2);
        const triggerDistance =
          firstRed === undefined ? 0 : hard_stop_at_seq - firstRed.seq;
        hs_ok = firstRed !== undefined && triggerDistance >= 0 && triggerDistance <= budget;
        hs_detail = firstRed === undefined
          ? `hard_stop observed but no red band precedes it`
          : `hard_stop at seq ${hard_stop_at_seq}, first red at seq ${firstRed.seq}, distance ${triggerDistance}`;
      }
    } else {
      hs_ok = hard_stop_at_seq === null;
      hs_detail = hs_ok
        ? "no hard_stop observed (as expected)"
        : `unexpected hard_stop at seq ${hard_stop_at_seq}`;
    }
    assertions.push({ name: "hard_stop_trigger", pass: hs_ok, detail: hs_detail });

    // 5. session_stats_reconcile
    const sum = stats.frames_delivered + stats.frames_queued + stats.frames_dropped + stats.frames_unknown_target;
    const stats_ok = sum === stats.frames_in;
    assertions.push({
      name: "session_stats_reconcile",
      pass: stats_ok,
      detail: `delivered+queued+dropped+unknown = ${sum}, frames_in = ${stats.frames_in}`,
      metric: {
        in: stats.frames_in,
        delivered: stats.frames_delivered,
        queued: stats.frames_queued,
        dropped: stats.frames_dropped,
        unknown: stats.frames_unknown_target,
      },
    });

    // 6. encoder_schema
    const encoder_ok = observed.every(o => o.payload_valid);
    const invalid_count = observed.filter(o => !o.payload_valid).length;
    assertions.push({
      name: "encoder_schema",
      pass: encoder_ok,
      detail: encoder_ok
        ? "every payload validated"
        : `${invalid_count} payload(s) failed schema validation`,
      metric: { invalid: invalid_count },
    });

    // 7. reconnect_drain
    const drain_ok = stats.frames_dropped === 0;
    assertions.push({
      name: "reconnect_drain",
      pass: drain_ok,
      detail: drain_ok ? "no frames dropped" : `${stats.frames_dropped} frames dropped`,
      metric: { dropped: stats.frames_dropped },
    });

    const overall_pass = assertions.every(a => a.pass);

    return BundleResultSchema.parse({
      overall_pass,
      assertions,
      derived: {
        frame_count: observed.length,
        latency_p99_ms,
        band_transitions_observed: bands_obs,
        hard_stop_at_seq,
      },
    });
  }

  /** Filter assertions by name. Useful for triage in UI. */
  static failed(bundle: BundleResult): AssertionResult[] {
    return bundle.assertions.filter(a => !a.pass);
  }

  /** Convenience: lookup one assertion by name. Throws when unknown name passed. */
  static byName(bundle: BundleResult, name: AssertionName): AssertionResult {
    const n = AssertionNameSchema.parse(name);
    const a = bundle.assertions.find(x => x.name === n);
    if (a === undefined) throw new Error(`AssertionBundle: missing family "${n}" — bundle is malformed`);
    return a;
  }

  static auditBundle(bundle: BundleResult): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    if (bundle.assertions.length !== CAMInHostAssertionBundleEngine.ASSERTION_FAMILIES.length) {
      errors.push(`expected ${CAMInHostAssertionBundleEngine.ASSERTION_FAMILIES.length} assertions, got ${bundle.assertions.length}`);
    }
    const seen = new Set<AssertionName>();
    for (const a of bundle.assertions) {
      if (seen.has(a.name)) errors.push(`duplicate assertion family "${a.name}"`);
      seen.add(a.name);
    }
    for (const required of CAMInHostAssertionBundleEngine.ASSERTION_FAMILIES) {
      if (!seen.has(required)) errors.push(`missing assertion family "${required}"`);
    }
    const computed_overall = bundle.assertions.every(a => a.pass);
    if (computed_overall !== bundle.overall_pass) {
      errors.push(`overall_pass (${bundle.overall_pass}) does not match assertion roll-up (${computed_overall})`);
    }
    return { ok: errors.length === 0, errors };
  }
}

export const camInHostAssertionBundleEngine = CAMInHostAssertionBundleEngine;
