/**
 * PartSimilarityEngine
 * =====================
 * Multi-dimensional similarity scoring between part specifications.
 * Computes weighted similarity across material, ISO group, dimensions,
 * features (LCS), tolerances, surface finish, and operations.
 *
 * Actions (4):
 *   similarity_compare, similarity_find_nearest, similarity_batch,
 *   similarity_set_weights
 *
 * @module engines/PartSimilarityEngine
 * @version 1.0.0
 */

// ============================================================================
// Types
// ============================================================================

export interface PartSpec {
  material: string;
  iso_group?: string;
  hardness_hb?: number;
  dimensions?: { x: number; y: number; z: number };
  features?: string[];
  tolerances?: { dimension: string; value_mm: number }[];
  surface_finish_ra?: number;
  operations?: string[];
  machine_type?: string;
  batch_size?: number;
}

export interface SimilarityResult {
  overall: number;
  breakdown: Record<string, number>;
}

export interface SimilarityWeights {
  material: number;
  iso_group: number;
  dimensions: number;
  features: number;
  tolerances: number;
  surface_finish: number;
  operations: number;
  [key: string]: number;
}

// ============================================================================
// ISO Group Affinity Matrix
// ============================================================================

const ISO_AFFINITY: Record<string, Record<string, number>> = {
  P: { P: 1.0, M: 0.6, K: 0.4, N: 0.3, S: 0.3, H: 0.5 },
  M: { P: 0.6, M: 1.0, K: 0.5, N: 0.3, S: 0.7, H: 0.4 },
  K: { P: 0.4, K: 1.0, M: 0.5, N: 0.5, S: 0.3, H: 0.3 },
  N: { P: 0.3, K: 0.5, M: 0.3, N: 1.0, S: 0.2, H: 0.2 },
  S: { P: 0.3, M: 0.7, K: 0.3, N: 0.2, S: 1.0, H: 0.6 },
  H: { P: 0.5, M: 0.4, K: 0.3, N: 0.2, S: 0.6, H: 1.0 },
};

// ============================================================================
// Engine
// ============================================================================

export class PartSimilarityEngine {
  private weights: SimilarityWeights = {
    material: 0.20,
    iso_group: 0.10,
    dimensions: 0.20,
    features: 0.15,
    tolerances: 0.15,
    surface_finish: 0.10,
    operations: 0.10,
  };

  /** Get current weights */
  getWeights(): SimilarityWeights {
    return { ...this.weights };
  }

  /** Set custom weights (normalized to sum=1) */
  setWeights(w: Partial<SimilarityWeights>): SimilarityWeights {
    const merged = { ...this.weights, ...w };
    const vals = Object.values(merged) as number[];
    const total = vals.reduce((s, v) => s + (v ?? 0), 0);
    if (total > 0) {
      for (const key of Object.keys(merged)) {
        (merged as Record<string, number>)[key] = ((merged as Record<string, number>)[key] ?? 0) / total;
      }
    }
    this.weights = merged as SimilarityWeights;
    return { ...this.weights };
  }

  /** Compare two part specs and return weighted similarity [0,1] */
  compare(
    a: PartSpec,
    b: PartSpec,
    customWeights?: Record<string, number>
  ): SimilarityResult {
    const w = customWeights
      ? this.normalizeWeights({ ...this.weights, ...customWeights })
      : this.weights;

    const breakdown: Record<string, number> = {
      material: this.materialSimilarity(a.material, b.material),
      iso_group: this.isoGroupSimilarity(a.iso_group, b.iso_group),
      dimensions: this.dimensionSimilarity(a.dimensions, b.dimensions),
      features: this.featureSimilarity(a.features ?? [], b.features ?? []),
      tolerances: this.toleranceSimilarity(a.tolerances ?? [], b.tolerances ?? []),
      surface_finish: this.surfaceFinishSimilarity(a.surface_finish_ra, b.surface_finish_ra),
      operations: this.operationSimilarity(a.operations ?? [], b.operations ?? []),
    };

    let overall = 0;
    for (const key of Object.keys(breakdown)) {
      overall += (w[key] ?? 0) * breakdown[key];
    }

    return { overall: Math.round(overall * 10000) / 10000, breakdown };
  }

  /** Find nearest N specs from a list */
  findNearest(
    target: PartSpec,
    candidates: { id: string; spec: PartSpec }[],
    topN: number = 5,
    customWeights?: Record<string, number>
  ): { id: string; score: number; breakdown: Record<string, number> }[] {
    const results = candidates.map((c) => {
      const sim = this.compare(target, c.spec, customWeights);
      return { id: c.id, score: sim.overall, breakdown: sim.breakdown };
    });
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topN);
  }

  /** Batch compare: all pairs */
  batch(
    specs: { id: string; spec: PartSpec }[],
    customWeights?: Record<string, number>
  ): { id_a: string; id_b: string; score: number }[] {
    const results: { id_a: string; id_b: string; score: number }[] = [];
    for (let i = 0; i < specs.length; i++) {
      for (let j = i + 1; j < specs.length; j++) {
        const sim = this.compare(specs[i].spec, specs[j].spec, customWeights);
        results.push({ id_a: specs[i].id, id_b: specs[j].id, score: sim.overall });
      }
    }
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  // ========================================================================
  // Dimension scorers
  // ========================================================================

  /** Material name similarity via normalized Levenshtein */
  private materialSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    const al = a.toLowerCase().trim();
    const bl = b.toLowerCase().trim();
    if (al === bl) return 1.0;
    // Check if one contains the other
    if (al.includes(bl) || bl.includes(al)) return 0.8;
    // Levenshtein distance normalized
    const maxLen = Math.max(al.length, bl.length);
    if (maxLen === 0) return 1.0;
    const dist = this.levenshtein(al, bl);
    return Math.max(0, 1 - dist / maxLen);
  }

  /** ISO group affinity via lookup matrix */
  private isoGroupSimilarity(a?: string, b?: string): number {
    if (!a || !b) return 0.5; // unknown => neutral
    const aU = a.toUpperCase();
    const bU = b.toUpperCase();
    return ISO_AFFINITY[aU]?.[bU] ?? 0.3;
  }

  /** Dimension similarity: cosine similarity of (x,y,z) vectors + volume ratio */
  private dimensionSimilarity(
    a?: { x: number; y: number; z: number },
    b?: { x: number; y: number; z: number }
  ): number {
    if (!a || !b) return 0.5;
    // Cosine similarity
    const dotProd = a.x * b.x + a.y * b.y + a.z * b.z;
    const magA = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
    const magB = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);
    if (magA === 0 || magB === 0) return 0;
    const cosine = dotProd / (magA * magB);

    // Volume ratio (log scale)
    const volA = a.x * a.y * a.z;
    const volB = b.x * b.y * b.z;
    if (volA === 0 || volB === 0) return cosine * 0.5;
    const volRatio = Math.min(volA, volB) / Math.max(volA, volB);

    return 0.5 * cosine + 0.5 * volRatio;
  }

  /** Feature similarity: LCS (longest common subsequence) ratio */
  private featureSimilarity(a: string[], b: string[]): number {
    if (a.length === 0 && b.length === 0) return 1.0;
    if (a.length === 0 || b.length === 0) return 0;
    const lcsLen = this.lcs(a, b);
    return (2 * lcsLen) / (a.length + b.length);
  }

  /** Tolerance similarity: compare distributions */
  private toleranceSimilarity(
    a: { dimension: string; value_mm: number }[],
    b: { dimension: string; value_mm: number }[]
  ): number {
    if (a.length === 0 && b.length === 0) return 1.0;
    if (a.length === 0 || b.length === 0) return 0;

    // Compare tightest tolerance ratio
    const minA = Math.min(...a.map((t) => t.value_mm));
    const minB = Math.min(...b.map((t) => t.value_mm));
    const tightRatio = Math.min(minA, minB) / Math.max(minA, minB);

    // Compare count similarity
    const countRatio = Math.min(a.length, b.length) / Math.max(a.length, b.length);

    return 0.6 * tightRatio + 0.4 * countRatio;
  }

  /** Surface finish similarity: ratio of Ra values */
  private surfaceFinishSimilarity(a?: number, b?: number): number {
    if (a === undefined || b === undefined) return 0.5;
    if (a === 0 && b === 0) return 1.0;
    if (a === 0 || b === 0) return 0;
    return Math.min(a, b) / Math.max(a, b);
  }

  /** Operation similarity: Jaccard + order bonus */
  private operationSimilarity(a: string[], b: string[]): number {
    if (a.length === 0 && b.length === 0) return 1.0;
    if (a.length === 0 || b.length === 0) return 0;
    const setA = new Set(a.map((o) => o.toLowerCase()));
    const setB = new Set(b.map((o) => o.toLowerCase()));
    const intersection = [...setA].filter((o) => setB.has(o)).length;
    const union = new Set([...setA, ...setB]).size;
    const jaccard = union === 0 ? 0 : intersection / union;

    // Order bonus via LCS on string arrays
    const lcsLen = this.lcs(
      a.map((o) => o.toLowerCase()),
      b.map((o) => o.toLowerCase())
    );
    const orderBonus = lcsLen / Math.max(a.length, b.length);

    return 0.7 * jaccard + 0.3 * orderBonus;
  }

  // ========================================================================
  // Utilities
  // ========================================================================

  /** Longest common subsequence length */
  private lcs(a: string[], b: string[]): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      Array(n + 1).fill(0)
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    return dp[m][n];
  }

  /** Levenshtein edit distance */
  private levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  }

  /** Normalize weight map to sum=1 */
  private normalizeWeights(w: Record<string, number>): Record<string, number> {
    const total = Object.values(w).reduce((s, v) => s + v, 0);
    if (total === 0) return w;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(w)) {
      out[k] = v / total;
    }
    return out;
  }
}

/** Singleton */
export const partSimilarityEngine = new PartSimilarityEngine();
