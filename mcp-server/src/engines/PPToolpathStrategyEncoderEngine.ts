/**
 * PPToolpathStrategyEncoderEngine — PP-AGI-MS6
 *
 * Maps toolpath strategies to dense 28-dimensional feature vectors for
 * strategy similarity, recommendation, and parameter transfer.
 *
 * Encodes: operation type, machining mode, engagement geometry, quality
 * targets, and machine requirements into a vector space where similar
 * strategies cluster together.
 *
 * Embedding dimensions (28 total):
 *   [0..5]   operation type (facing/pocket/contour/drill/turn/special)
 *   [6..8]   dimension (2.5D/3D/5axis)
 *   [9..11]  phase (roughing/semi-finish/finishing)
 *   [12]     step-over ratio normalized (/1.0)
 *   [13]     depth-of-cut ratio (doc/tool_dia, /2.0)
 *   [14]     MRR priority normalized (0=quality, 1=speed)
 *   [15]     surface quality priority (0=rough, 1=mirror)
 *   [16]     tool engagement normalized (radial, /1.0)
 *   [17]     adaptive/trochoidal flag
 *   [18]     helical entry flag
 *   [19]     ramp entry flag
 *   [20]     rest machining flag
 *   [21]     constant chip load flag
 *   [22]     climb milling flag
 *   [23]     high_speed_machining flag
 *   [24]     requires_5axis flag
 *   [25]     requires_live_tooling flag
 *   [26]     is_interrupted flag
 *   [27]     coolant_critical flag
 *
 * References: PP-AGI-MAXOUT-ROADMAP Phase 0 MS6
 * @module PPToolpathStrategyEncoderEngine
 */

// ── Constants ─────────────────────────────────────────────────────────

export const TOOLPATH_EMBEDDING_DIM = 28;

const OP_TYPE_MAP: Record<string, number> = {
  facing: 0, face: 0, face_mill: 0,
  pocket: 1, pocketing: 1, cavity: 1, slot: 1,
  contour: 2, profile: 2, wall: 2, side_mill: 2,
  drill: 3, drilling: 3, bore: 3, ream: 3, tap: 3, thread_mill: 3,
  turning: 4, turn_rough: 4, turn_finish: 4, grooving: 4, parting: 4, threading: 4,
  special: 5, pencil: 5, scallop: 5, morph: 5, swarf: 5, flow: 5, impeller: 5,
};

const DIM_MAP: Record<string, number> = {
  "2d": 0, "2.5d": 0, "2.5D": 0,
  "3d": 1, "3D": 1,
  "5axis": 2, "5-axis": 2, "simultaneous": 2, "indexed": 2,
};

const PHASE_MAP: Record<string, number> = {
  roughing: 0, rough: 0, hogging: 0,
  semi_finish: 1, semifinish: 1, semi: 1,
  finishing: 2, finish: 2, superfinish: 2,
};

const DIM_NAMES: string[] = [
  "op_facing", "op_pocket", "op_contour", "op_drill", "op_turning", "op_special",
  "dim_2_5d", "dim_3d", "dim_5axis",
  "phase_rough", "phase_semi", "phase_finish",
  "stepover_ratio", "doc_ratio", "mrr_priority", "surface_priority",
  "tool_engagement", "adaptive", "helical_entry", "ramp_entry",
  "rest_machining", "constant_chip_load", "climb_milling", "hsm",
  "requires_5axis", "requires_live_tool", "is_interrupted", "coolant_critical",
];

// ── Types ─────────────────────────────────────────────────────────────

export interface ToolpathSpec {
  operation_type: string;
  dimension?: string;
  phase?: string;
  stepover_ratio?: number;         // fraction of tool diameter (0-1)
  doc_ratio?: number;              // depth/tool diameter ratio
  mrr_priority?: number;           // 0=quality first, 1=speed first
  surface_priority?: number;       // 0=don't care, 1=mirror finish
  tool_engagement?: number;        // radial engagement fraction (0-1)
  adaptive?: boolean;
  helical_entry?: boolean;
  ramp_entry?: boolean;
  rest_machining?: boolean;
  constant_chip_load?: boolean;
  climb_milling?: boolean;
  hsm?: boolean;
  requires_5axis?: boolean;
  requires_live_tooling?: boolean;
  is_interrupted?: boolean;
  coolant_critical?: boolean;
}

export interface ToolpathEmbedding {
  operation_type: string;
  vector: number[];
  dimension: number;
}

export interface ToolpathSimilarityResult {
  strategy_a: string;
  strategy_b: string;
  cosine_similarity: number;
  key_differences: string[];
}

export interface ToolpathRecommendation {
  query: ToolpathSpec;
  recommendations: Array<{
    strategy: ToolpathSpec;
    label: string;
    cosine_similarity: number;
  }>;
}

// ── Reference Strategy Library ────────────────────────────────────────

const REFERENCE_STRATEGIES: Array<ToolpathSpec & { label: string }> = [
  // Roughing strategies
  { label: "Adaptive roughing 3D", operation_type: "pocket", dimension: "3d", phase: "roughing", stepover_ratio: 0.10, doc_ratio: 1.5, mrr_priority: 0.9, surface_priority: 0.1, tool_engagement: 0.10, adaptive: true, constant_chip_load: true, climb_milling: true, hsm: true, helical_entry: true },
  { label: "Traditional pocket roughing 2.5D", operation_type: "pocket", dimension: "2.5d", phase: "roughing", stepover_ratio: 0.60, doc_ratio: 0.5, mrr_priority: 0.7, surface_priority: 0.2, tool_engagement: 0.60, climb_milling: true },
  { label: "Plunge roughing (deep pocket)", operation_type: "pocket", dimension: "2.5d", phase: "roughing", stepover_ratio: 0.50, doc_ratio: 2.0, mrr_priority: 0.8, surface_priority: 0.1, tool_engagement: 0.50, ramp_entry: true },
  { label: "Face milling", operation_type: "facing", dimension: "2.5d", phase: "roughing", stepover_ratio: 0.75, doc_ratio: 0.3, mrr_priority: 0.8, surface_priority: 0.3, tool_engagement: 0.75 },

  // Finishing strategies
  { label: "Parallel finish 3D", operation_type: "contour", dimension: "3d", phase: "finishing", stepover_ratio: 0.05, doc_ratio: 0.1, mrr_priority: 0.1, surface_priority: 0.9, tool_engagement: 0.05, climb_milling: true, hsm: true },
  { label: "Scallop finish 3D", operation_type: "special", dimension: "3d", phase: "finishing", stepover_ratio: 0.08, doc_ratio: 0.1, mrr_priority: 0.1, surface_priority: 0.95, tool_engagement: 0.08, climb_milling: true, hsm: true },
  { label: "Pencil finishing (corner cleanup)", operation_type: "special", dimension: "3d", phase: "finishing", stepover_ratio: 0.03, doc_ratio: 0.05, mrr_priority: 0.05, surface_priority: 0.9, rest_machining: true, climb_milling: true },
  { label: "Contour finish 2.5D wall", operation_type: "contour", dimension: "2.5d", phase: "finishing", stepover_ratio: 0.02, doc_ratio: 1.0, mrr_priority: 0.2, surface_priority: 0.8, tool_engagement: 0.02, climb_milling: true },

  // 5-axis strategies
  { label: "5-axis swarf cutting", operation_type: "special", dimension: "5axis", phase: "finishing", stepover_ratio: 0.15, doc_ratio: 1.0, surface_priority: 0.85, requires_5axis: true, climb_milling: true },
  { label: "5-axis flow cutting (impeller)", operation_type: "special", dimension: "5axis", phase: "finishing", stepover_ratio: 0.10, doc_ratio: 0.5, surface_priority: 0.9, requires_5axis: true, hsm: true, coolant_critical: true },

  // Drilling
  { label: "Peck drilling deep hole", operation_type: "drill", dimension: "2.5d", phase: "roughing", doc_ratio: 0.5, mrr_priority: 0.5, coolant_critical: true },
  { label: "Rigid tapping", operation_type: "drill", dimension: "2.5d", phase: "finishing", mrr_priority: 0.3, surface_priority: 0.5 },

  // Turning
  { label: "OD rough turning", operation_type: "turning", dimension: "2.5d", phase: "roughing", doc_ratio: 1.0, mrr_priority: 0.8, tool_engagement: 0.80, constant_chip_load: true, coolant_critical: true },
  { label: "OD finish turning", operation_type: "turning", dimension: "2.5d", phase: "finishing", doc_ratio: 0.1, mrr_priority: 0.1, surface_priority: 0.9, tool_engagement: 0.10, coolant_critical: true },
  { label: "ID boring finish", operation_type: "turning", dimension: "2.5d", phase: "finishing", doc_ratio: 0.05, surface_priority: 0.95, coolant_critical: true, is_interrupted: true },
];

// ── Engine ─────────────────────────────────────────────────────────────

export class PPToolpathStrategyEncoderEngine {
  /** Embed a toolpath strategy to a 28-dim vector. */
  embed(spec: ToolpathSpec): ToolpathEmbedding {
    return { operation_type: spec.operation_type, vector: this.specToVector(spec), dimension: TOOLPATH_EMBEDDING_DIM };
  }

  /** Embed the reference strategy library. */
  embedReferenceLibrary(): Array<ToolpathEmbedding & { label: string }> {
    return REFERENCE_STRATEGIES.map(s => ({ ...this.embed(s), label: s.label }));
  }

  /** Cosine similarity. */
  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i]; }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? dot / denom : 0;
  }

  /** Compare two strategies. */
  compare(a: ToolpathSpec, b: ToolpathSpec): ToolpathSimilarityResult {
    const vecA = this.specToVector(a);
    const vecB = this.specToVector(b);
    const diffs: string[] = [];
    for (let i = 0; i < TOOLPATH_EMBEDDING_DIM; i++) {
      if (Math.abs(vecA[i] - vecB[i]) > 0.3) diffs.push(DIM_NAMES[i]);
    }
    return {
      strategy_a: a.operation_type, strategy_b: b.operation_type,
      cosine_similarity: round4(this.cosineSimilarity(vecA, vecB)),
      key_differences: diffs,
    };
  }

  /** Find nearest strategies from reference library. */
  recommend(spec: ToolpathSpec, k = 5): ToolpathRecommendation {
    const queryVec = this.specToVector(spec);
    const scored = REFERENCE_STRATEGIES
      .map(s => ({
        strategy: s as ToolpathSpec, label: s.label,
        cosine_similarity: round4(this.cosineSimilarity(queryVec, this.specToVector(s))),
      }))
      .sort((a, b) => b.cosine_similarity - a.cosine_similarity)
      .slice(0, k);
    return { query: spec, recommendations: scored };
  }

  /** Get dimension name. */
  dimensionName(index: number): string { return DIM_NAMES[index] ?? `dim_${index}`; }

  // ── Private ──────────────────────────────────────────────────────────

  private specToVector(spec: ToolpathSpec): number[] {
    const v = new Array<number>(TOOLPATH_EMBEDDING_DIM).fill(0);

    // [0..5] operation type
    v[OP_TYPE_MAP[spec.operation_type?.toLowerCase() ?? "pocket"] ?? 1] = 1;

    // [6..8] dimension
    v[6 + (DIM_MAP[spec.dimension?.toLowerCase() ?? "2.5d"] ?? 0)] = 1;

    // [9..11] phase
    v[9 + (PHASE_MAP[spec.phase?.toLowerCase() ?? "roughing"] ?? 0)] = 1;

    // [12..16] continuous params
    v[12] = clamp01(spec.stepover_ratio ?? 0.3);
    v[13] = clamp01((spec.doc_ratio ?? 0.5) / 2.0);
    v[14] = clamp01(spec.mrr_priority ?? 0.5);
    v[15] = clamp01(spec.surface_priority ?? 0.3);
    v[16] = clamp01(spec.tool_engagement ?? 0.3);

    // [17..27] flags
    v[17] = spec.adaptive ? 1 : 0;
    v[18] = spec.helical_entry ? 1 : 0;
    v[19] = spec.ramp_entry ? 1 : 0;
    v[20] = spec.rest_machining ? 1 : 0;
    v[21] = spec.constant_chip_load ? 1 : 0;
    v[22] = spec.climb_milling ? 1 : 0;
    v[23] = spec.hsm ? 1 : 0;
    v[24] = spec.requires_5axis ? 1 : 0;
    v[25] = spec.requires_live_tooling ? 1 : 0;
    v[26] = spec.is_interrupted ? 1 : 0;
    v[27] = spec.coolant_critical ? 1 : 0;

    return v;
  }
}

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }

export const ppToolpathStrategyEncoderEngine = new PPToolpathStrategyEncoderEngine();
