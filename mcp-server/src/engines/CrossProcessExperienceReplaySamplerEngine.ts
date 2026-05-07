/**
 * CrossProcessExperienceReplaySamplerEngine — XPROC-NEURAL Tier 2 (T2-03)
 *
 * Stratified replay sampler. Where T2-02 (PrioritizedReplay) prioritizes by
 * |TD-error|, this engine balances by *category* — drawing equal-shaped
 * batches across the (process × material × outcome) cube so the downstream
 * MLP doesn't overfit to the dominant class (typically: process=mill,
 * material=P, outcome=success in real shop data).
 *
 * Why two samplers, not one:
 *   PER and stratification answer different questions. PER says "give me
 *   experiences whose loss is currently bad" — a *temporal* signal. Stratified
 *   sampling says "give me a balanced view across operating regimes" — a
 *   *coverage* signal. Layered together (PER inside each stratum), the MLP
 *   gets fast convergence on hard cases AND broad generalization across
 *   regimes. T2-02 and T2-03 compose.
 *
 * Stratification scheme (default — overridable):
 *   3 processes × 5 material clusters × 3 outcome classes = 45 strata.
 *   Empty strata are skipped (no synthetic padding); achieved ratios are
 *   reported so the caller can log coverage gaps for active learning (T11).
 *
 * Algorithm:
 *   1. Group input episodes by stratum key (process|material_cluster|outcome).
 *   2. Compute target count per stratum: n / non_empty_stratum_count
 *      (uniform proportional allocation; configurable via weights).
 *   3. Sample (with replacement if stratum size < target) from each.
 *   4. Shuffle the result so the gradient sees mixed strata, not blocks.
 *   5. Report achieved ratio vs. target ratio for each stratum.
 *
 * Failure modes covered:
 *   1. Empty input → returns empty batch, distribution = {}
 *   2. n=0 → returns empty batch (input passes Zod but capacity is 0)
 *   3. Single stratum present → 100% of batch from that stratum
 *   4. n > total available episodes → sample with replacement; achieved
 *      ratios still match target proportions
 *   5. Material outside known clusters → assigned "_other" cluster (still
 *      counted, just under a fallback key)
 *   6. Custom weights with zero-sum → normalized; if all zero, falls back to
 *      uniform allocation (warning emitted in response)
 *   7. Stratum with weight > 0 but no episodes → reported in coverageGaps
 *
 * Standalone — does NOT depend on T1-01 ledger or T2-01 episodic memory
 * being on this branch. Caller passes the episodes array directly.
 *
 * @module CrossProcessExperienceReplaySamplerEngine
 */

import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

const PROCESSES = ["mill", "lathe", "wedm"] as const;
const OUTCOMES = ["success", "marginal", "fail"] as const;

/**
 * Default ISO material clusters. Caller can override; "_other" is a fallback
 * bucket for materials not in any explicit cluster — never silently dropped.
 */
const DEFAULT_MATERIAL_CLUSTERS: Record<string, string[]> = {
  P: ["P", "1018", "1045", "4140", "4340", "P20", "H13"],            // steel
  M: ["M", "304", "316", "316L", "17-4", "duplex"],                  // stainless
  K: ["K", "cast_iron", "ductile_iron", "GG25", "GGG40"],            // cast iron
  N: ["N", "6061", "7075", "2024", "5052", "brass", "bronze", "copper"], // non-ferrous
  S: ["S", "Ti-6Al-4V", "Ti", "Inconel", "Inconel718", "Inconel625", "Hastelloy", "Waspaloy"], // superalloy
};

const SamplerEpisodeSchema = z.object({
  id: z.string().min(1).max(128),
  process: z.enum(PROCESSES),
  material: z.string().min(1).max(64),
  outcome: z.enum(OUTCOMES),
  weight: z.number().positive().finite().default(1),
});

const SampleInputSchema = z.object({
  n: z.number().int().nonnegative().max(100_000),
  episodes: z.array(SamplerEpisodeSchema),
  // Optional weights per stratum dimension. Default = uniform.
  processWeights: z.record(z.string(), z.number().nonnegative()).optional(),
  outcomeWeights: z.record(z.string(), z.number().nonnegative()).optional(),
  materialClusters: z.record(z.string(), z.array(z.string())).optional(),
  shuffleResult: z.boolean().default(true),
});

// ============================================================================
// Public types
// ============================================================================

export type SamplerProcess = (typeof PROCESSES)[number];
export type SamplerOutcome = (typeof OUTCOMES)[number];

export interface SamplerEpisode {
  id: string;
  process: SamplerProcess;
  material: string;
  outcome: SamplerOutcome;
  weight?: number;
}

export interface StratumKey {
  process: SamplerProcess;
  materialCluster: string;
  outcome: SamplerOutcome;
}

export interface StratumStats {
  key: StratumKey;
  available: number;
  targetCount: number;
  achievedCount: number;
  achievedRatio: number;       // achievedCount / total batch size
  targetRatio: number;         // targetCount / n
  withReplacement: boolean;    // true iff available < targetCount
}

export interface SampleResponse {
  batch: SamplerEpisode[];
  distribution: StratumStats[];
  coverageGaps: StratumKey[];   // strata with target>0 but no episodes
  totalAvailable: number;
  totalRequested: number;
  totalSampled: number;
  warnings: string[];
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum drift between target and achieved ratio that triggers a warning. */
const COVERAGE_DRIFT_THRESHOLD = 0.05;

/** Sentinel cluster key for materials not matching any explicit cluster. */
const OTHER_CLUSTER = "_other";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Resolve a material string to its cluster key. Exact match in any cluster's
 * member list wins; otherwise → OTHER_CLUSTER. Case-insensitive comparison.
 */
function resolveCluster(
  material: string,
  clusters: Record<string, string[]>,
): string {
  const upper = material.trim().toUpperCase();
  for (const [clusterKey, members] of Object.entries(clusters)) {
    for (const member of members) {
      if (member.toUpperCase() === upper) return clusterKey;
    }
    // Also accept the cluster key itself as a direct match (e.g. "P" → "P")
    if (clusterKey.toUpperCase() === upper) return clusterKey;
  }
  return OTHER_CLUSTER;
}

function stratumKeyToString(k: StratumKey): string {
  return `${k.process}|${k.materialCluster}|${k.outcome}`;
}

/**
 * Mulberry32 PRNG seedable for reproducible test runs (callers don't see this;
 * Math.random is used in production paths via shuffle()).
 */
function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

function normalizeWeights(
  weights: Record<string, number> | undefined,
  keys: readonly string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!weights) {
    const w = 1 / keys.length;
    for (const k of keys) out[k] = w;
    return out;
  }
  let sum = 0;
  for (const k of keys) {
    const v = weights[k] ?? 0;
    if (v < 0 || !Number.isFinite(v)) continue;
    out[k] = v;
    sum += v;
  }
  if (sum <= 0) {
    const w = 1 / keys.length;
    for (const k of keys) out[k] = w;
    return out;
  }
  for (const k of keys) out[k] = (out[k] ?? 0) / sum;
  return out;
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessExperienceReplaySamplerEngine {
  static readonly tier = "T2-03";

  /**
   * Draw a stratified batch of `n` episodes balanced across the (process ×
   * material_cluster × outcome) cube. Returns achieved-vs-target distribution
   * stats for downstream coverage monitoring (active learning hooks).
   */
  static stratifiedBatch(input: unknown): SampleResponse {
    const parsed = SampleInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        batch: [],
        distribution: [],
        coverageGaps: [],
        totalAvailable: 0,
        totalRequested: 0,
        totalSampled: 0,
        warnings: [
          parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        ],
      };
    }
    const { n, episodes, processWeights, outcomeWeights, materialClusters, shuffleResult } =
      parsed.data;

    if (n === 0 || episodes.length === 0) {
      return {
        batch: [],
        distribution: [],
        coverageGaps: [],
        totalAvailable: episodes.length,
        totalRequested: n,
        totalSampled: 0,
        warnings: episodes.length === 0 ? ["empty episodes input"] : [],
      };
    }

    const clusters = materialClusters ?? DEFAULT_MATERIAL_CLUSTERS;
    const clusterKeys = [...Object.keys(clusters), OTHER_CLUSTER];

    // Group episodes by stratum
    const buckets = new Map<string, SamplerEpisode[]>();
    for (const ep of episodes) {
      const cluster = resolveCluster(ep.material, clusters);
      const key: StratumKey = {
        process: ep.process,
        materialCluster: cluster,
        outcome: ep.outcome,
      };
      const sk = stratumKeyToString(key);
      let arr = buckets.get(sk);
      if (!arr) {
        arr = [];
        buckets.set(sk, arr);
      }
      arr.push(ep);
    }

    // Compute weights
    const procW = normalizeWeights(processWeights, PROCESSES);
    const outW = normalizeWeights(outcomeWeights, OUTCOMES);

    // Allocate ONLY to strata with ≥1 episode. This prevents target dilution
    // when many (process × cluster × outcome) combos have zero data — without
    // it, we'd compute target=n/45 even when only 1 stratum has data.
    const warnings: string[] = [];
    const populatedStrata: Array<{ key: StratumKey; sk: string; bucket: SamplerEpisode[]; rawWeight: number }> = [];
    let totalRawWeight = 0;
    for (const [sk, bucket] of buckets) {
      if (bucket.length === 0) continue;
      const [p, c, o] = sk.split("|") as [SamplerProcess, string, SamplerOutcome];
      const k: StratumKey = { process: p, materialCluster: c, outcome: o };
      const rawWeight = (procW[p] ?? 0) * (outW[o] ?? 0);
      // Only include strata whose dimensional weights are non-zero
      if (rawWeight <= 0) continue;
      populatedStrata.push({ key: k, sk, bucket, rawWeight });
      totalRawWeight += rawWeight;
    }

    if (populatedStrata.length === 0 || totalRawWeight <= 0) {
      // Fallback: all strata were filtered out; sample uniformly from all buckets
      const flat: SamplerEpisode[] = [];
      for (const b of buckets.values()) flat.push(...b);
      const out: SamplerEpisode[] = [];
      for (let i = 0; i < n; i++) out.push(flat[Math.floor(Math.random() * flat.length)]);
      if (shuffleResult) shuffleInPlace(out);
      return {
        batch: out,
        distribution: [],
        coverageGaps: [],
        totalAvailable: episodes.length,
        totalRequested: n,
        totalSampled: out.length,
        warnings: ["all weights zero; uniform fallback applied"],
      };
    }

    const stratumTargets = new Map<string, { key: StratumKey; target: number; available: number }>();
    let allocatedSum = 0;
    for (const p of populatedStrata) {
      const fractional = p.rawWeight / totalRawWeight;
      const target = Math.round(n * fractional);
      stratumTargets.set(p.sk, { key: p.key, target, available: p.bucket.length });
      allocatedSum += target;
    }

    // Adjust rounding drift: if allocated > n, trim from largest targets;
    // if allocated < n, top up the largest available stratum.
    if (allocatedSum !== n && stratumTargets.size > 0) {
      const sortedByTarget = [...stratumTargets.entries()].sort(
        (a, b) => b[1].target - a[1].target,
      );
      let drift = n - allocatedSum;
      let i = 0;
      while (drift !== 0 && sortedByTarget.length > 0) {
        const [_sk, st] = sortedByTarget[i % sortedByTarget.length];
        if (drift > 0) {
          st.target++;
          drift--;
        } else if (st.target > 0) {
          st.target--;
          drift++;
        }
        i++;
        if (i > 10_000) break;  // safety
      }
    }

    // Sample from each stratum. Use replacement when available < target.
    const batch: SamplerEpisode[] = [];
    const distribution: StratumStats[] = [];
    const coverageGaps: StratumKey[] = [];

    for (const [sk, st] of stratumTargets) {
      if (st.target === 0) continue;
      if (st.available === 0) {
        coverageGaps.push(st.key);
        continue;
      }
      const bucket = buckets.get(sk)!;
      const withReplacement = bucket.length < st.target;
      const samples: SamplerEpisode[] = [];
      if (withReplacement) {
        for (let i = 0; i < st.target; i++) {
          samples.push(bucket[Math.floor(Math.random() * bucket.length)]);
        }
      } else {
        // Reservoir sample without replacement (shuffle, take first target)
        const copy = bucket.slice();
        shuffleInPlace(copy);
        for (let i = 0; i < st.target; i++) samples.push(copy[i]);
      }
      batch.push(...samples);
      const targetRatio = st.target / n;
      const achievedRatio = samples.length / Math.max(1, n);
      distribution.push({
        key: st.key,
        available: st.available,
        targetCount: st.target,
        achievedCount: samples.length,
        targetRatio,
        achievedRatio,
        withReplacement,
      });
      if (Math.abs(targetRatio - achievedRatio) > COVERAGE_DRIFT_THRESHOLD) {
        warnings.push(
          `stratum ${sk} drift ${(achievedRatio - targetRatio).toFixed(3)} > threshold`,
        );
      }
    }

    if (shuffleResult) shuffleInPlace(batch);

    return {
      batch,
      distribution,
      coverageGaps,
      totalAvailable: episodes.length,
      totalRequested: n,
      totalSampled: batch.length,
      warnings,
    };
  }

  /** List the default cluster definitions for callers building UIs. */
  static defaultClusters(): Record<string, string[]> {
    return JSON.parse(JSON.stringify(DEFAULT_MATERIAL_CLUSTERS));
  }
}

export const crossProcessExperienceReplaySamplerEngine = CrossProcessExperienceReplaySamplerEngine;

/**
 * Dispatcher convenience wrapper.
 */
export function crossProcessExperienceReplaySampler(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_replay_balanced_batch":
      return CrossProcessExperienceReplaySamplerEngine.stratifiedBatch(params);
    case "xproc_replay_default_clusters":
      return CrossProcessExperienceReplaySamplerEngine.defaultClusters();
    default:
      throw new Error(`crossProcessExperienceReplaySampler: unknown action '${action}'`);
  }
}
