/**
 * SupplierReputationEngine.ts — PRISM networking-marketplace Phase-2 differentiator (galaxy:business,
 * slot:hotel). The closed-loop MOAT: supplier reputation computed from the IMMUTABLE RFQ outcome corpus
 * (BidCollectionRankingEngine.recordOutcome) — real delivered-on-time + measured-Cpk tuples — NOT
 * self-reported stars. This is what Xometry/Fictiv can't fake: reputation earned from delivered work.
 *
 * It feeds RFQMatchScoring (a reputation criterion) and SupplierOnboarding (probation gates).
 *
 * STATISTICS (no naive point rates — see supplier-reputation-weights.ts):
 *   - Beta-Binomial shrinkage toward an informed industry prior, so a 1-job/1-on-time supplier scores
 *     ~0.72, NOT 1.0 — you cannot buy a perfect reputation with a single lucky job.
 *   - Wilson 95% lower confidence bound on the on-time rate, so a high-mean/low-volume supplier is
 *     visibly less certain than a high-mean/high-volume one (interval estimate, not a bare scalar).
 *   - Composite = onTime*shrunkOnTime + quality*shrunkQuality, asserted into [0,1] before return.
 *
 * Consumes a structural subset of {@link BidCollectionRankingEngine.RFQOutcome} (supplierId,
 * deliveredOnTime, qualityCpk?) — so the real corpus from getOutcomeCorpus() drops straight in, with no
 * import coupling.
 */

import { z } from "zod";
import {
  SUPPLIER_REPUTATION_SCHEMA_VERSION,
  CPK_ACCEPTANCE_THRESHOLD,
  REPUTATION_WEIGHTS,
  REPUTATION_PRIOR_MEAN,
  REPUTATION_PRIOR_STRENGTH,
  WILSON_Z_95,
  REPUTATION_TIERS,
} from "../data/supplier-reputation-weights.js";

/** A single delivered-job outcome (structural subset of RFQOutcome). */
const ReputationOutcomeSchema = z.object({
  supplierId: z.string().min(1, "outcome.supplierId is required"),
  deliveredOnTime: z.boolean(),
  qualityCpk: z.number().finite("qualityCpk must be finite").nonnegative("qualityCpk must be >= 0").optional(),
});
export type ReputationOutcome = z.infer<typeof ReputationOutcomeSchema>;

/** A supplier's computed reputation (all rates in [0,1]). */
export interface SupplierReputation {
  supplierId: string;
  jobsCompleted: number;
  onTimeCount: number;
  /** raw on-time fraction; falls back to the prior mean when jobsCompleted === 0. */
  onTimeRate: number;
  /** Wilson score 95% LOWER bound on the on-time rate (0 when no jobs — no evidence). */
  onTimeLowerCI95: number;
  inspectedJobs: number;
  qualityAcceptedCount: number;
  /** raw quality-accept fraction among inspected jobs; prior mean when none inspected. */
  qualityRate: number;
  /** Beta-Binomial posterior means (shrunk toward the prior). */
  shrunkOnTimeRate: number;
  shrunkQualityRate: number;
  /** composite reputation in [0,1]. */
  reputationScore: number;
  tier: string;
  schemaVersion: string;
}

export class SupplierReputationEngine {
  /** Beta-Binomial posterior mean — shrinks a raw success fraction toward the industry prior. */
  static #shrink(successes: number, trials: number): number {
    return (
      (successes + REPUTATION_PRIOR_MEAN * REPUTATION_PRIOR_STRENGTH) / (trials + REPUTATION_PRIOR_STRENGTH)
    );
  }

  /** Wilson score 95% lower confidence bound for `successes`/`n`. Returns 0 for n === 0 (no evidence). */
  static #wilsonLower(successes: number, n: number): number {
    if (n === 0) return 0;
    const z = WILSON_Z_95;
    const p = successes / n;
    const z2 = z * z;
    const denom = 1 + z2 / n;
    const center = p + z2 / (2 * n);
    const margin = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
    const lower = (center - margin) / denom;
    return Math.max(0, Math.min(1, lower));
  }

  /** Map a composite score to its human-facing tier (highest matching `minScore`). */
  static tierFor(score: number): string {
    for (const t of REPUTATION_TIERS) {
      if (score >= t.minScore) return t.tier;
    }
    return REPUTATION_TIERS[REPUTATION_TIERS.length - 1].tier;
  }

  /** Validate + normalize raw outcomes (fail-loud with index on a malformed record). */
  static #parseAll(outcomes: ReputationOutcome[]): ReputationOutcome[] {
    if (!Array.isArray(outcomes)) {
      throw new Error("SupplierReputationEngine: outcomes must be an array");
    }
    return outcomes.map((o, i) => {
      const r = ReputationOutcomeSchema.safeParse(o);
      if (!r.success) {
        throw new Error(
          `SupplierReputationEngine: outcome[${i}] invalid — ${r.error.issues
            .map((iss) => `${iss.path.join(".") || "<root>"}: ${iss.message}`)
            .join("; ")}`,
        );
      }
      return r.data;
    });
  }

  /** Core: compute a {@link SupplierReputation} from one supplier's already-validated outcomes. */
  static #compute(supplierId: string, mine: ReputationOutcome[]): SupplierReputation {
    const jobs = mine.length;
    const onTimeCount = mine.filter((o) => o.deliveredOnTime).length;
    const inspected = mine.filter((o) => o.qualityCpk !== undefined);
    const inspectedJobs = inspected.length;
    const qualityAcceptedCount = inspected.filter(
      (o) => (o.qualityCpk as number) >= CPK_ACCEPTANCE_THRESHOLD,
    ).length;

    const onTimeRate = jobs > 0 ? onTimeCount / jobs : REPUTATION_PRIOR_MEAN;
    const qualityRate = inspectedJobs > 0 ? qualityAcceptedCount / inspectedJobs : REPUTATION_PRIOR_MEAN;
    const shrunkOnTimeRate = SupplierReputationEngine.#shrink(onTimeCount, jobs);
    const shrunkQualityRate = SupplierReputationEngine.#shrink(qualityAcceptedCount, inspectedJobs);
    const reputationScore =
      REPUTATION_WEIGHTS.onTime * shrunkOnTimeRate + REPUTATION_WEIGHTS.quality * shrunkQualityRate;

    // INVARIANT (fail-loud): a reputation outside [0,1] means the weights/shrinkage are mis-specified.
    if (!(reputationScore >= 0 && reputationScore <= 1)) {
      throw new Error(
        `SupplierReputationEngine: reputationScore ${reputationScore} out of [0,1] for '${supplierId}' ` +
          `(weights must sum to 1; shrunk rates must be in [0,1])`,
      );
    }

    return {
      supplierId,
      jobsCompleted: jobs,
      onTimeCount,
      onTimeRate,
      onTimeLowerCI95: SupplierReputationEngine.#wilsonLower(onTimeCount, jobs),
      inspectedJobs,
      qualityAcceptedCount,
      qualityRate,
      shrunkOnTimeRate,
      shrunkQualityRate,
      reputationScore,
      tier: SupplierReputationEngine.tierFor(reputationScore),
      schemaVersion: SUPPLIER_REPUTATION_SCHEMA_VERSION,
    };
  }

  /**
   * Reputation for ONE supplier across the outcome corpus. A supplier with no recorded outcomes returns
   * the prior-based score (jobsCompleted: 0, reputationScore === REPUTATION_PRIOR_MEAN) — "assumed
   * industry-average until proven", never penalized to zero for being new.
   */
  static reputationFor(outcomes: ReputationOutcome[], supplierId: string): SupplierReputation {
    if (typeof supplierId !== "string" || supplierId.length === 0) {
      throw new Error("SupplierReputationEngine.reputationFor: supplierId is required");
    }
    const parsed = SupplierReputationEngine.#parseAll(outcomes);
    const mine = parsed.filter((o) => o.supplierId === supplierId);
    return SupplierReputationEngine.#compute(supplierId, mine);
  }

  /**
   * Reputation for EVERY supplier in the corpus, ranked best-first by composite score
   * (tie-break: more jobs first, then supplierId ascending for determinism).
   */
  static rankSuppliers(outcomes: ReputationOutcome[]): SupplierReputation[] {
    const parsed = SupplierReputationEngine.#parseAll(outcomes);
    const bySupplier = new Map<string, ReputationOutcome[]>();
    for (const o of parsed) {
      const arr = bySupplier.get(o.supplierId);
      if (arr) arr.push(o);
      else bySupplier.set(o.supplierId, [o]);
    }
    const reps = [...bySupplier.entries()].map(([id, mine]) => SupplierReputationEngine.#compute(id, mine));
    reps.sort((a, b) => {
      if (b.reputationScore !== a.reputationScore) return b.reputationScore - a.reputationScore;
      if (b.jobsCompleted !== a.jobsCompleted) return b.jobsCompleted - a.jobsCompleted;
      return a.supplierId.localeCompare(b.supplierId);
    });
    return reps;
  }

  static schemaVersion(): string {
    return SUPPLIER_REPUTATION_SCHEMA_VERSION;
  }
}

export const supplierReputationEngine = SupplierReputationEngine;
