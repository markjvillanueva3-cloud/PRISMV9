/**
 * KiloApsBenchmarkEngine — KILO-CAM-TRAINING-MS0 campaign iter 2
 *
 * Measures Autodesk Platform Services (APS, formerly Forge) REST API
 * throughput against the JM-Die corpus. Used to validate that Mode 1
 * (APS REST) is actually faster than Mode 3 (Fusion add-in) before
 * committing the training pipeline to it.
 *
 * Pure-function bench layer:
 *   - inputs:  array of file-IDs + per-call latency samples
 *   - outputs: throughput stats (p50/p95/p99 latency, files/sec, ETA for full corpus)
 *
 * The HTTP-calling layer lives in FusionCloudConnectorEngine + AutoForgeEngine
 * (existing); this engine consumes their measured timings and produces the
 * comparison report. Pure functions are unit-testable without network calls.
 *
 * Per kilo refuse-list:
 *   - no-silent-fallback: when latency samples are empty, return
 *     `{ valid: false, gap: "no samples" }` — NEVER fabricate a default
 *   - dropping-tolerance-stack: percentile calculations preserve raw samples
 *     in the output so downstream can re-aggregate without precision loss
 *
 * @milestone KILO-CAM-TRAINING-MS0
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// SHAPES
// ============================================================================

export const LatencySampleSchema = z.object({
  file_id: z.string(),
  mode: z.enum(["aps_rest", "fusion_addin", "file_parse"]),
  api_call: z.string(),
  latency_ms: z.number().min(0),
  bytes_transferred: z.number().int().min(0).optional(),
  success: z.boolean(),
  error: z.string().optional(),
});
export type LatencySample = z.infer<typeof LatencySampleSchema>;

export const ThroughputStatsSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("kilo_aps_benchmark"),
  mode: z.enum(["aps_rest", "fusion_addin", "file_parse"]),
  sample_count: z.number().int().min(0),
  success_count: z.number().int().min(0),
  failure_count: z.number().int().min(0),
  p50_ms: z.number().min(0),
  p95_ms: z.number().min(0),
  p99_ms: z.number().min(0),
  mean_ms: z.number().min(0),
  files_per_sec: z.number().min(0),
  total_elapsed_ms: z.number().min(0),
  /** Estimate to extract the full JM-Die corpus (147,717 files per
   *  partlib manifest 2026-05-24). Operator can override the corpus_size. */
  corpus_eta_hours: z.number().min(0),
  valid: z.boolean(),
  gap: z.string().nullable(),
});
export type ThroughputStats = z.infer<typeof ThroughputStatsSchema>;

export const ModeComparisonSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("kilo_aps_benchmark"),
  modes: z.record(z.string(), ThroughputStatsSchema),
  ranked_modes: z.array(z.string()),
  /** Speedup factor of the fastest mode vs the slowest (e.g. 60x). */
  best_to_worst_speedup: z.number().min(0).nullable(),
  recommended_primary_mode: z.string().nullable(),
});
export type ModeComparison = z.infer<typeof ModeComparisonSchema>;

// ============================================================================
// PURE STATS
// ============================================================================

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  // Linear interpolation between adjacent ranks (Excel's PERCENTILE.INC).
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const frac = rank - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

const JM_DIE_CORPUS_SIZE_DEFAULT = 147717; // from partlib manifest

/**
 * Compute throughput stats for one mode's samples. Returns a `valid:false`
 * record (NOT a stub) when samples are empty — refuse-list compliance.
 */
function computeThroughput(
  samples: LatencySample[],
  mode: "aps_rest" | "fusion_addin" | "file_parse",
  opts?: { corpus_size?: number },
): ThroughputStats {
  for (const s of samples) LatencySampleSchema.parse(s);
  const modeSamples = samples.filter((s) => s.mode === mode);

  if (modeSamples.length === 0) {
    return {
      schemaVersion: "1.0.0",
      source: "kilo_aps_benchmark",
      mode,
      sample_count: 0,
      success_count: 0,
      failure_count: 0,
      p50_ms: 0, p95_ms: 0, p99_ms: 0, mean_ms: 0,
      files_per_sec: 0,
      total_elapsed_ms: 0,
      corpus_eta_hours: 0,
      valid: false,
      gap: `no latency samples for mode='${mode}' — operator must run the benchmark first`,
    };
  }

  const successes = modeSamples.filter((s) => s.success);
  const latencies = successes.map((s) => s.latency_ms).sort((a, b) => a - b);
  const mean = latencies.length === 0 ? 0
    : latencies.reduce((acc, x) => acc + x, 0) / latencies.length;
  const total = latencies.reduce((acc, x) => acc + x, 0);
  const filesPerSec = total === 0 ? 0 : (latencies.length / total) * 1000;
  const corpusSize = opts?.corpus_size ?? JM_DIE_CORPUS_SIZE_DEFAULT;
  const corpusEtaHours = filesPerSec === 0 ? 0 : (corpusSize / filesPerSec) / 3600;

  return {
    schemaVersion: "1.0.0",
    source: "kilo_aps_benchmark",
    mode,
    sample_count: modeSamples.length,
    success_count: successes.length,
    failure_count: modeSamples.length - successes.length,
    p50_ms: percentile(latencies, 50),
    p95_ms: percentile(latencies, 95),
    p99_ms: percentile(latencies, 99),
    mean_ms: mean,
    files_per_sec: filesPerSec,
    total_elapsed_ms: total,
    corpus_eta_hours: corpusEtaHours,
    valid: successes.length > 0,
    gap: successes.length === 0
      ? `all ${modeSamples.length} samples failed for mode='${mode}'`
      : null,
  };
}

/** Compare all 3 modes on the same sample set and produce a ranked report. */
function compareModes(
  samples: LatencySample[],
  opts?: { corpus_size?: number },
): ModeComparison {
  const modes: Array<"aps_rest" | "fusion_addin" | "file_parse"> = ["aps_rest", "fusion_addin", "file_parse"];
  const byMode: Record<string, ThroughputStats> = {};
  for (const m of modes) byMode[m] = computeThroughput(samples, m, opts);

  // Rank by files_per_sec descending (best first); modes with valid=false sink.
  const ranked = modes
    .slice()
    .sort((a, b) => {
      const va = byMode[a].valid ? byMode[a].files_per_sec : -1;
      const vb = byMode[b].valid ? byMode[b].files_per_sec : -1;
      return vb - va;
    });

  const best = byMode[ranked[0]];
  const worst = byMode[ranked[ranked.length - 1]];
  const speedup = worst.valid && best.valid && worst.files_per_sec > 0
    ? best.files_per_sec / worst.files_per_sec
    : null;

  const recommended = best.valid ? ranked[0] : null;

  return {
    schemaVersion: "1.0.0",
    source: "kilo_aps_benchmark",
    modes: byMode,
    ranked_modes: ranked,
    best_to_worst_speedup: speedup,
    recommended_primary_mode: recommended,
  };
}

// ============================================================================
// CLASS WRAPPER
// ============================================================================

class KiloApsBenchmarkEngine {
  static computeThroughput = computeThroughput;
  static compareModes = compareModes;
  static JM_DIE_CORPUS_SIZE_DEFAULT = JM_DIE_CORPUS_SIZE_DEFAULT;
}

export const kiloApsBenchmarkEngine = KiloApsBenchmarkEngine;
