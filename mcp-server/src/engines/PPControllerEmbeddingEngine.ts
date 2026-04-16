/**
 * PPControllerEmbeddingEngine — PP-AGI-MS0
 *
 * Maps each CNC controller dialect to a dense 48-dimensional feature vector
 * capturing syntax, capabilities, and behavior. These embeddings enable:
 *   - Similarity search: find the closest known controller to an unknown one
 *   - Transfer learning: apply G-code patterns from similar controllers
 *   - Clustering: group controllers by behavior (not just manufacturer)
 *   - Dialect gap analysis: identify which features differentiate controllers
 *
 * CONSUMES ControllerDialectEngine data (27 controller families) to produce
 * numerical vectors suitable for ML operations.
 *
 * Embedding dimensions (48 total):
 *   [0..5]   base_family one-hot (fanuc/siemens/heidenhain/mazak/okuma/other)
 *   [6..9]   arc_format one-hot (ijk_inc/ijk_abs/r_word/both)
 *   [10..12] comment_style one-hot (parentheses/semicolon/heidenhain)
 *   [13..16] line_number_style one-hot (n10/n1/none/optional)
 *   [17..21] capability flags (HSC, smoothing, TCPC, coord rotation, nano smooth)
 *   [22..25] controller flags (NURBS, macro B, sub-spindle, guide bushing)
 *   [26..28] cycle flags (probing, rigid tap, threading)
 *   [29..33] normalized numerics (look-ahead, block rate, axes, offsets, memory)
 *   [34..35] complexity scores (cycle count, tool change steps)
 *   [36..38] program structure flags
 *   [39..47] misc features (extended offsets, TSC, ulti-motion, LFV, etc.)
 *
 * References: PP-AGI-MAXOUT-ROADMAP Phase 0 MS0
 * @module PPControllerEmbeddingEngine
 */

import {
  controllerDialectEngine,
  type ControllerDialect,
} from "./ControllerDialectEngine.js";

// ── Constants ─────────────────────────────────────────────────────────

export const EMBEDDING_DIM = 48;

const FAMILY_INDEX: Record<string, number> = {
  fanuc: 0, siemens: 1, heidenhain: 2, mazak: 3, okuma: 4, other: 5,
};
const ARC_INDEX: Record<string, number> = {
  ijk_incremental: 0, ijk_absolute: 1, r_word: 2, both: 3,
};
const COMMENT_INDEX: Record<string, number> = {
  parentheses: 0, semicolon: 1, heidenhain: 2,
};
const LINE_NUM_INDEX: Record<string, number> = {
  n10: 0, n1: 1, none: 2, optional: 3,
};

// Normalization ceilings (based on max observed values across all controllers)
const MAX_LOOK_AHEAD = 200;
const MAX_BLOCK_RATE = 10000;
const MAX_AXES = 5;
const MAX_OFFSETS = 300;
const MAX_MEMORY_KB = 2048;
const MAX_CYCLES = 12;
const MAX_TOOL_CHANGE_STEPS = 5;

// ── Types ─────────────────────────────────────────────────────────────

export interface ControllerEmbedding {
  controller_id: string;
  display_name: string;
  manufacturer: string;
  base_family: string;
  vector: number[];
  dimension: number;
}

export interface SimilarityResult {
  controller_a: string;
  controller_b: string;
  cosine_similarity: number;
  euclidean_distance: number;
  shared_features: string[];
  divergent_features: string[];
}

export interface NearestNeighborResult {
  query: string;
  neighbors: Array<{
    controller_id: string;
    display_name: string;
    cosine_similarity: number;
    euclidean_distance: number;
  }>;
}

export interface ClusterResult {
  clusters: Array<{
    label: string;
    members: string[];
    centroid: number[];
    cohesion: number;
  }>;
  silhouette_score: number;
}

export interface FeatureImportanceResult {
  controller_a: string;
  controller_b: string;
  top_differences: Array<{
    dimension: number;
    name: string;
    value_a: number;
    value_b: number;
    abs_diff: number;
  }>;
}

// ── Dimension names for interpretability ──────────────────────────────

const DIM_NAMES: string[] = [
  "family_fanuc", "family_siemens", "family_heidenhain", "family_mazak", "family_okuma", "family_other",
  "arc_ijk_inc", "arc_ijk_abs", "arc_r_word", "arc_both",
  "comment_parens", "comment_semicolon", "comment_heidenhain",
  "linenum_n10", "linenum_n1", "linenum_none", "linenum_optional",
  "has_hsc", "has_smoothing", "has_tcpc", "has_coord_rotation", "has_nano_smooth",
  "nurbs", "macro_b", "sub_spindle", "guide_bushing",
  "has_probing", "has_rigid_tap", "has_threading",
  "look_ahead_norm", "block_rate_norm", "max_axes_norm", "offset_count_norm", "memory_norm",
  "cycle_count_norm", "tool_change_complexity",
  "has_percent_wrapper", "has_o_number", "has_program_name",
  "has_extended_offsets", "has_look_ahead_config", "has_tsc_coolant",
  "ulti_motion", "lfv_vibration", "gang_tooling", "part_catcher", "thread_whirling",
  "decimal_mandatory_point",
];

// ── Engine ─────────────────────────────────────────────────────────────

export class PPControllerEmbeddingEngine {
  private cache = new Map<string, ControllerEmbedding>();

  /**
   * Compute the embedding vector for a controller dialect.
   * Uses the ControllerDialectEngine's rich feature data as source.
   */
  embed(controllerId: string): ControllerEmbedding {
    const cached = this.cache.get(controllerId);
    if (cached) return cached;

    const dialect = controllerDialectEngine.getDialect(controllerId);
    const vec = this.dialectToVector(dialect);

    const result: ControllerEmbedding = {
      controller_id: dialect.id,
      display_name: dialect.display_name,
      manufacturer: dialect.manufacturer,
      base_family: dialect.base_family,
      vector: vec,
      dimension: EMBEDDING_DIM,
    };

    this.cache.set(controllerId, result);
    return result;
  }

  /** Embed all known controller dialects. */
  embedAll(): ControllerEmbedding[] {
    const dialects = controllerDialectEngine.listDialects();
    return dialects.map(d => this.embed(d.id));
  }

  /**
   * Cosine similarity between two vectors.
   * Returns value in [-1, 1] where 1 = identical, 0 = orthogonal.
   */
  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? dot / denom : 0;
  }

  /** Euclidean distance between two embedding vectors. */
  euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const d = a[i] - b[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
  }

  /** Compare two controllers: similarity score + feature divergence. */
  compare(controllerA: string, controllerB: string): SimilarityResult {
    const embA = this.embed(controllerA);
    const embB = this.embed(controllerB);

    const shared: string[] = [];
    const divergent: string[] = [];

    for (let i = 0; i < EMBEDDING_DIM; i++) {
      const diff = Math.abs(embA.vector[i] - embB.vector[i]);
      if (diff < 0.01) {
        if (embA.vector[i] > 0.5) shared.push(DIM_NAMES[i]);
      } else if (diff > 0.3) {
        divergent.push(DIM_NAMES[i]);
      }
    }

    return {
      controller_a: embA.controller_id,
      controller_b: embB.controller_id,
      cosine_similarity: round4(this.cosineSimilarity(embA.vector, embB.vector)),
      euclidean_distance: round4(this.euclideanDistance(embA.vector, embB.vector)),
      shared_features: shared,
      divergent_features: divergent,
    };
  }

  /** Find the k nearest controllers to a query controller. */
  findNearest(controllerId: string, k = 5): NearestNeighborResult {
    const query = this.embed(controllerId);
    const all = this.embedAll();

    const scored = all
      .filter(e => e.controller_id !== query.controller_id)
      .map(e => ({
        controller_id: e.controller_id,
        display_name: e.display_name,
        cosine_similarity: round4(this.cosineSimilarity(query.vector, e.vector)),
        euclidean_distance: round4(this.euclideanDistance(query.vector, e.vector)),
      }))
      .sort((a, b) => b.cosine_similarity - a.cosine_similarity)
      .slice(0, k);

    return { query: query.controller_id, neighbors: scored };
  }

  /**
   * Cluster all controllers using k-means.
   * Groups by behavioral similarity, not just manufacturer.
   */
  cluster(k = 4, maxIter = 50): ClusterResult {
    const all = this.embedAll();
    const n = all.length;
    if (n <= k) {
      return {
        clusters: all.map(e => ({
          label: e.base_family, members: [e.controller_id],
          centroid: e.vector, cohesion: 1,
        })),
        silhouette_score: 1,
      };
    }

    // k-means++ initialization
    const centroids: number[][] = [];
    centroids.push([...all[0].vector]);
    for (let c = 1; c < k; c++) {
      const dists = all.map(e => {
        const minD = centroids.reduce(
          (min, cent) => Math.min(min, this.euclideanDistance(e.vector, cent)), Infinity);
        return minD * minD;
      });
      const totalD = dists.reduce((s, d) => s + d, 0);
      let r = Math.random() * totalD;
      for (let i = 0; i < n; i++) {
        r -= dists[i];
        if (r <= 0) { centroids.push([...all[i].vector]); break; }
      }
      if (centroids.length <= c) centroids.push([...all[c].vector]);
    }

    // Iterate assignment + update
    let assignments = new Array(n).fill(0);
    for (let iter = 0; iter < maxIter; iter++) {
      const newAssign = all.map(e => {
        let bestC = 0, bestD = Infinity;
        for (let c = 0; c < k; c++) {
          const d = this.euclideanDistance(e.vector, centroids[c]);
          if (d < bestD) { bestD = d; bestC = c; }
        }
        return bestC;
      });
      if (newAssign.every((a, i) => a === assignments[i])) break;
      assignments = newAssign;
      for (let c = 0; c < k; c++) {
        const members = all.filter((_, i) => assignments[i] === c);
        if (members.length === 0) continue;
        for (let d = 0; d < EMBEDDING_DIM; d++) {
          centroids[c][d] = members.reduce((s, m) => s + m.vector[d], 0) / members.length;
        }
      }
    }

    // Build clusters
    const clusters = [];
    for (let c = 0; c < k; c++) {
      const idxs = assignments.map((a, i) => a === c ? i : -1).filter(i => i >= 0);
      const members = idxs.map(i => all[i].controller_id);
      const families = idxs.map(i => all[i].base_family);
      const label = mode(families) ?? `cluster_${c}`;
      const cohesion = members.length > 1
        ? 1 / (1 + idxs.reduce((s, i) =>
            s + this.euclideanDistance(all[i].vector, centroids[c]), 0) / members.length)
        : 1;
      clusters.push({ label, members, centroid: centroids[c], cohesion: round4(cohesion) });
    }

    // Simplified silhouette
    let silSum = 0;
    for (let i = 0; i < n; i++) {
      const ci = assignments[i];
      const same = assignments.map((a, j) => a === ci && j !== i ? j : -1).filter(j => j >= 0);
      const a_i = same.length > 0
        ? same.reduce((s, j) => s + this.euclideanDistance(all[i].vector, all[j].vector), 0) / same.length : 0;
      let b_i = Infinity;
      for (let c = 0; c < k; c++) {
        if (c === ci) continue;
        const others = assignments.map((a, j) => a === c ? j : -1).filter(j => j >= 0);
        if (others.length === 0) continue;
        const avgD = others.reduce((s, j) =>
          s + this.euclideanDistance(all[i].vector, all[j].vector), 0) / others.length;
        if (avgD < b_i) b_i = avgD;
      }
      if (b_i === Infinity) b_i = 0;
      const denom = Math.max(a_i, b_i);
      silSum += denom > 0 ? (b_i - a_i) / denom : 0;
    }

    return { clusters, silhouette_score: round4(silSum / n) };
  }

  /** Identify the most differentiating features between two controllers. */
  featureImportance(controllerA: string, controllerB: string): FeatureImportanceResult {
    const embA = this.embed(controllerA);
    const embB = this.embed(controllerB);

    const diffs: FeatureImportanceResult["top_differences"] = [];
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      const absDiff = Math.abs(embA.vector[i] - embB.vector[i]);
      if (absDiff > 0.01) {
        diffs.push({
          dimension: i, name: DIM_NAMES[i],
          value_a: round4(embA.vector[i]), value_b: round4(embB.vector[i]),
          abs_diff: round4(absDiff),
        });
      }
    }
    diffs.sort((a, b) => b.abs_diff - a.abs_diff);
    return { controller_a: embA.controller_id, controller_b: embB.controller_id, top_differences: diffs.slice(0, 10) };
  }

  /** Get human-readable name for an embedding dimension */
  dimensionName(index: number): string {
    return DIM_NAMES[index] ?? `dim_${index}`;
  }

  /** Clear cached embeddings */
  invalidate(): void {
    this.cache.clear();
  }

  // ── Private: feature extraction ──────────────────────────────────────

  private dialectToVector(d: ControllerDialect): number[] {
    const v = new Array<number>(EMBEDDING_DIM).fill(0);

    // [0..5] base_family one-hot
    v[FAMILY_INDEX[d.base_family] ?? 5] = 1;

    // [6..9] arc_format one-hot
    v[6 + (ARC_INDEX[d.arc_format] ?? 0)] = 1;

    // [10..12] comment_style one-hot
    v[10 + (COMMENT_INDEX[d.comment_style] ?? 0)] = 1;

    // [13..16] line_number_style one-hot
    v[13 + (LINE_NUM_INDEX[d.line_numbers] ?? 0)] = 1;

    // [17..21] capability flags
    v[17] = d.features.hsc_mode ? 1 : 0;
    v[18] = d.features.smoothing ? 1 : 0;
    v[19] = d.features.tcpc ? 1 : 0;
    v[20] = d.features.coord_rotation ? 1 : 0;
    v[21] = d.features.nano_smooth ? 1 : 0;

    // [22..25] controller flags
    v[22] = d.features.nurbs_interpolation ? 1 : 0;
    v[23] = d.features.macro_b_support ? 1 : 0;
    v[24] = d.features.sub_spindle ? 1 : 0;
    v[25] = d.features.guide_bushing ? 1 : 0;

    // [26..28] cycle capabilities
    v[26] = d.probing_cycles ? 1 : 0;
    v[27] = d.canned_cycles.rigid_tap ? 1 : 0;
    v[28] = d.canned_cycles.thread_single_point ? 1 : 0;

    // [29..33] normalized numerics
    v[29] = clamp01((d.features.look_ahead_blocks ?? 0) / MAX_LOOK_AHEAD);
    v[30] = clamp01((d.features.block_processing_rate ?? 0) / MAX_BLOCK_RATE);
    v[31] = clamp01((d.features.max_simultaneous_axes ?? 3) / MAX_AXES);
    v[32] = clamp01((d.features.work_offset_count ?? 48) / MAX_OFFSETS);
    v[33] = clamp01((d.features.program_memory_kb ?? 256) / MAX_MEMORY_KB);

    // [34] canned cycle count
    const cycleCount = Object.values(d.canned_cycles).filter(Boolean).length;
    v[34] = clamp01(cycleCount / MAX_CYCLES);

    // [35] tool change complexity
    v[35] = clamp01(d.tool_change_sequence.length / MAX_TOOL_CHANGE_STEPS);

    // [36..38] program structure flags
    v[36] = d.program_start.includes("%") ? 1 : 0;
    v[37] = d.program_start.some(l => l.startsWith("O")) ? 1 : 0;
    v[38] = d.program_start.some(l => l.includes("_N_") || l.includes("PROGRAM")) ? 1 : 0;

    // [39] extended work offsets
    v[39] = d.work_offsets.extended ? 1 : 0;

    // [40] look-ahead configuration
    v[40] = d.features.look_ahead ? 1 : 0;

    // [41] through-spindle coolant
    v[41] = d.coolant_tsc ? 1 : 0;

    // [42..46] Swiss/specialty features
    v[42] = d.features.ulti_motion ? 1 : 0;
    v[43] = d.features.lfv_vibration ? 1 : 0;
    v[44] = d.features.gang_tooling ? 1 : 0;
    v[45] = d.features.part_catcher ? 1 : 0;
    v[46] = d.features.thread_whirling ? 1 : 0;

    // [47] decimal style
    v[47] = d.decimal_style === "mandatory_point" ? 1 : 0;

    return v;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }
function mode(arr: string[]): string | undefined {
  const freq: Record<string, number> = {};
  for (const v of arr) freq[v] = (freq[v] ?? 0) + 1;
  let best: string | undefined, bestN = 0;
  for (const [k, n] of Object.entries(freq)) {
    if (n > bestN) { best = k; bestN = n; }
  }
  return best;
}

// ── Singleton ─────────────────────────────────────────────────────────

export const ppControllerEmbeddingEngine = new PPControllerEmbeddingEngine();
