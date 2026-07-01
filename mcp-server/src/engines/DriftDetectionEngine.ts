/**
 * DriftDetectionEngine — HMEMV06 semantic drift detection across time.
 *
 * Pure-core detector: caller supplies the embedding centroid of a memory
 * cluster at two times (baseline + current), and the engine reports the
 * drift magnitude (1 - cosine_similarity) plus a verdict (stable / drifting
 * / drifted) against caller-supplied thresholds.
 *
 * Use cases: detect when a memory cluster's meaning has drifted enough to
 * require re-indexing or operator review; flag concept-shift in semantic
 * tier memories.
 *
 * @module engines/DriftDetectionEngine
 */

import { z } from "zod";

export const DriftVerdictSchema = z.enum(["stable", "drifting", "drifted"]);
export type DriftVerdict = z.infer<typeof DriftVerdictSchema>;

export const DriftMeasurementSchema = z.object({
  cluster_id: z.string().min(1).max(120),
  baseline_at: z.string().min(1),
  current_at: z.string().min(1),
  drift: z.number().refine((v) => Number.isFinite(v) && v >= 0 && v <= 2, {}),
  similarity: z.number().refine((v) => Number.isFinite(v) && v >= -1 && v <= 1, {}),
  verdict: DriftVerdictSchema,
  drifting_threshold: z.number(),
  drifted_threshold: z.number(),
});
export type DriftMeasurement = z.infer<typeof DriftMeasurementSchema>;

export interface DriftOptions {
  /** Below this drift score, cluster is stable. Default 0.1. */
  drifting_threshold: number;
  /** At-or-above this drift score, cluster is drifted (re-index needed). Default 0.3. */
  drifted_threshold: number;
}

const DEFAULT_OPTS: DriftOptions = { drifting_threshold: 0.1, drifted_threshold: 0.3 };

export class DriftDetectionEngine {
  static validateMeasurement(m: unknown): DriftMeasurement { return DriftMeasurementSchema.parse(m); }

  /** Cosine similarity of two equal-length vectors. */
  private static cosine(a: readonly number[], b: readonly number[]): number {
    if (a.length !== b.length || a.length === 0) {
      throw new Error("DriftDetection: centroid lengths must match and be non-empty");
    }
    let dot = 0, an = 0, bn = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      an += a[i] * a[i];
      bn += b[i] * b[i];
    }
    const denom = Math.sqrt(an) * Math.sqrt(bn);
    return denom === 0 ? 0 : dot / denom;
  }

  /** Measure drift between two centroids. Drift = 1 − cosine. */
  static measure(args: {
    cluster_id: string;
    baseline_centroid: readonly number[];
    current_centroid: readonly number[];
    baseline_at: string;
    current_at: string;
    opts?: Partial<DriftOptions>;
  }): DriftMeasurement {
    if (!args.cluster_id) throw new Error("DriftDetection.measure: cluster_id required");
    const o = { ...DEFAULT_OPTS, ...(args.opts ?? {}) };
    if (!Number.isFinite(o.drifting_threshold) || !Number.isFinite(o.drifted_threshold)) {
      throw new Error("DriftDetection.measure: thresholds must be finite");
    }
    if (o.drifting_threshold >= o.drifted_threshold) {
      throw new Error("DriftDetection.measure: drifting_threshold must be < drifted_threshold");
    }
    const sim = DriftDetectionEngine.cosine(args.baseline_centroid, args.current_centroid);
    const drift = 1 - sim;
    let verdict: DriftVerdict;
    if (drift < o.drifting_threshold) verdict = "stable";
    else if (drift < o.drifted_threshold) verdict = "drifting";
    else verdict = "drifted";
    return DriftMeasurementSchema.parse({
      cluster_id: args.cluster_id,
      baseline_at: args.baseline_at,
      current_at: args.current_at,
      drift,
      similarity: sim,
      verdict,
      drifting_threshold: o.drifting_threshold,
      drifted_threshold: o.drifted_threshold,
    });
  }

  /** Render drift verdict for operator audit. */
  static renderMeasurement(m: DriftMeasurement): string {
    const tag = m.verdict.toUpperCase();
    return `[DRIFT ${tag}] cluster=${m.cluster_id} drift=${m.drift.toFixed(4)} sim=${m.similarity.toFixed(4)} (thresholds: ${m.drifting_threshold}/${m.drifted_threshold})`;
  }
}

export const driftDetectionEngine = DriftDetectionEngine;
