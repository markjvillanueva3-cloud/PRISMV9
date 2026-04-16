/**
 * PPCuttingToolEncoderEngine — PP-AGI-MS2
 *
 * Maps cutting tool descriptions to dense 36-dimensional feature vectors for
 * tool similarity search, substitution, and parameter transfer.
 *
 * Accepts a flexible tool spec (not tied to a specific catalog) and produces
 * embeddings encoding tool type, geometry, coating, material compatibility,
 * and performance characteristics.
 *
 * NOT a geometry engine — does not compute intersections, meshes, or spatial
 * transforms. Those are handled by GeometryEngine, SweptVolumeEngine, etc.
 *
 * Embedding dimensions (36 total):
 *   [0..7]   tool type one-hot (endmill/ballnose/drill/tap/insert_turn/insert_mill/boring/face)
 *   [8]      diameter normalized (mm / 50)
 *   [9]      flute count normalized (/12)
 *   [10]     length normalized (mm / 200)
 *   [11]     corner radius normalized (mm / 10)
 *   [12..14] helix angle bucket (low<30, medium 30-40, high>40)
 *   [15..18] substrate (carbide/hss/cermet/ceramic_cbn)
 *   [19..23] coating (uncoated/TiN/TiAlN/AlCrN/DLC_diamond)
 *   [24..29] ISO material compatibility (P/M/K/N/S/H)
 *   [30]     roughing capable
 *   [31]     finishing capable
 *   [32]     coolant through
 *   [33]     high_speed capable (>10000 RPM typical)
 *   [34]     interrupted cut capable
 *   [35]     length_to_diameter ratio normalized (/10)
 *
 * References: PP-AGI-MAXOUT-ROADMAP Phase 0 MS2
 * @module PPCuttingToolEncoderEngine
 */

// ── Constants ─────────────────────────────────────────────────────────

export const TOOL_EMBEDDING_DIM = 36;

const TOOL_TYPE_MAP: Record<string, number> = {
  endmill: 0, flat_endmill: 0, square_endmill: 0,
  ballnose: 1, ball_endmill: 1,
  drill: 2, twist_drill: 2, indexable_drill: 2, center_drill: 2,
  tap: 3, thread_mill: 3,
  insert_turning: 4, turning_insert: 4,
  insert_milling: 5, milling_insert: 5,
  boring_bar: 6, boring: 6,
  face_mill: 7, shell_mill: 7,
};

const SUBSTRATE_MAP: Record<string, number> = {
  carbide: 0, solid_carbide: 0, cemented_carbide: 0,
  hss: 1, high_speed_steel: 1, cobalt_hss: 1,
  cermet: 2,
  ceramic: 3, cbn: 3, pcbn: 3, pcd: 3,
};

const COATING_MAP: Record<string, number> = {
  uncoated: 0, none: 0,
  tin: 1, ticn: 1,
  tialn: 2, altin: 2,
  alcrn: 3,
  dlc: 4, diamond: 4, cvd_diamond: 4,
};

const DIM_NAMES: string[] = [
  "type_endmill", "type_ballnose", "type_drill", "type_tap",
  "type_insert_turn", "type_insert_mill", "type_boring", "type_face_mill",
  "diameter_norm", "flute_count_norm", "length_norm", "corner_radius_norm",
  "helix_low", "helix_medium", "helix_high",
  "substrate_carbide", "substrate_hss", "substrate_cermet", "substrate_ceramic_cbn",
  "coating_uncoated", "coating_tin", "coating_tialn", "coating_alcrn", "coating_dlc_diamond",
  "iso_p", "iso_m", "iso_k", "iso_n", "iso_s", "iso_h",
  "roughing", "finishing", "coolant_through", "high_speed", "interrupted_cut",
  "ld_ratio_norm",
];

// ── Types ─────────────────────────────────────────────────────────────

export interface ToolSpec {
  tool_type: string;
  diameter_mm?: number;
  flute_count?: number;
  overall_length_mm?: number;
  corner_radius_mm?: number;
  helix_angle_deg?: number;
  substrate?: string;
  coating?: string;
  iso_groups?: string[];
  roughing?: boolean;
  finishing?: boolean;
  coolant_through?: boolean;
  high_speed?: boolean;
  interrupted_cut?: boolean;
}

export interface ToolEmbedding {
  tool_type: string;
  vector: number[];
  dimension: number;
}

export interface ToolSimilarityResult {
  tool_a: ToolSpec;
  tool_b: ToolSpec;
  cosine_similarity: number;
  euclidean_distance: number;
  key_differences: string[];
}

export interface ToolNearestResult {
  query: ToolSpec;
  neighbors: Array<{
    tool: ToolSpec;
    cosine_similarity: number;
    label: string;
  }>;
}

// ── Reference Tool Library ────────────────────────────────────────────

const REFERENCE_TOOLS: Array<ToolSpec & { label: string }> = [
  { label: "General endmill 10mm 4-flute TiAlN", tool_type: "endmill", diameter_mm: 10, flute_count: 4, overall_length_mm: 72, corner_radius_mm: 0, helix_angle_deg: 35, substrate: "carbide", coating: "tialn", iso_groups: ["P", "M", "K"], roughing: true, finishing: true, coolant_through: false, high_speed: true },
  { label: "Ball endmill 6mm 2-flute AlCrN", tool_type: "ballnose", diameter_mm: 6, flute_count: 2, overall_length_mm: 57, corner_radius_mm: 3, helix_angle_deg: 30, substrate: "carbide", coating: "alcrn", iso_groups: ["P", "M", "H"], roughing: false, finishing: true, coolant_through: false, high_speed: true },
  { label: "Roughing endmill 20mm 5-flute TiAlN", tool_type: "endmill", diameter_mm: 20, flute_count: 5, overall_length_mm: 104, corner_radius_mm: 1, helix_angle_deg: 38, substrate: "carbide", coating: "tialn", iso_groups: ["P", "M", "K"], roughing: true, finishing: false, coolant_through: true, high_speed: false },
  { label: "Drill 8mm carbide TiN", tool_type: "drill", diameter_mm: 8, flute_count: 2, overall_length_mm: 79, helix_angle_deg: 30, substrate: "carbide", coating: "tin", iso_groups: ["P", "M", "K", "N"], roughing: true, finishing: false, coolant_through: true },
  { label: "M10 tap HSS TiN", tool_type: "tap", diameter_mm: 10, flute_count: 3, overall_length_mm: 80, substrate: "hss", coating: "tin", iso_groups: ["P", "M", "N"], roughing: false, finishing: true },
  { label: "CNMG turning insert carbide", tool_type: "insert_turning", diameter_mm: 12.7, corner_radius_mm: 0.8, substrate: "carbide", coating: "tialn", iso_groups: ["P", "M", "K"], roughing: true, finishing: true, interrupted_cut: true },
  { label: "APKT milling insert carbide", tool_type: "insert_milling", diameter_mm: 10, substrate: "carbide", coating: "tialn", iso_groups: ["P", "M", "K"], roughing: true, finishing: false },
  { label: "Boring bar 16mm carbide", tool_type: "boring_bar", diameter_mm: 16, overall_length_mm: 150, corner_radius_mm: 0.4, substrate: "carbide", coating: "tialn", iso_groups: ["P", "M"], roughing: false, finishing: true, coolant_through: true },
  { label: "Face mill 50mm 5-insert", tool_type: "face_mill", diameter_mm: 50, flute_count: 5, substrate: "carbide", coating: "tialn", iso_groups: ["P", "M", "K", "N"], roughing: true, finishing: true },
  { label: "Micro endmill 1mm 2-flute DLC", tool_type: "endmill", diameter_mm: 1, flute_count: 2, overall_length_mm: 39, helix_angle_deg: 45, substrate: "carbide", coating: "dlc", iso_groups: ["N", "H"], roughing: false, finishing: true, high_speed: true },
  { label: "Carbide drill 3mm for superalloy", tool_type: "drill", diameter_mm: 3, flute_count: 2, overall_length_mm: 46, substrate: "carbide", coating: "alcrn", iso_groups: ["S"], roughing: true, coolant_through: true },
  { label: "CBN insert for hardened steel", tool_type: "insert_turning", diameter_mm: 12.7, corner_radius_mm: 0.4, substrate: "cbn", coating: "uncoated", iso_groups: ["H"], roughing: false, finishing: true },
];

// ── Engine ─────────────────────────────────────────────────────────────

export class PPCuttingToolEncoderEngine {
  /** Embed a tool specification to a 36-dim vector. */
  embed(spec: ToolSpec): ToolEmbedding {
    return { tool_type: spec.tool_type, vector: this.specToVector(spec), dimension: TOOL_EMBEDDING_DIM };
  }

  /** Embed the reference tool library. */
  embedReferenceLibrary(): Array<ToolEmbedding & { label: string }> {
    return REFERENCE_TOOLS.map(t => ({ ...this.embed(t), label: t.label }));
  }

  /** Cosine similarity. */
  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i]; }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? dot / denom : 0;
  }

  /** Euclidean distance. */
  euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; sum += d * d; }
    return Math.sqrt(sum);
  }

  /** Compare two tool specs. */
  compare(toolA: ToolSpec, toolB: ToolSpec): ToolSimilarityResult {
    const vecA = this.specToVector(toolA);
    const vecB = this.specToVector(toolB);
    const diffs: string[] = [];
    for (let i = 0; i < TOOL_EMBEDDING_DIM; i++) {
      if (Math.abs(vecA[i] - vecB[i]) > 0.3) diffs.push(DIM_NAMES[i]);
    }
    return {
      tool_a: toolA, tool_b: toolB,
      cosine_similarity: round4(this.cosineSimilarity(vecA, vecB)),
      euclidean_distance: round4(this.euclideanDistance(vecA, vecB)),
      key_differences: diffs,
    };
  }

  /** Find nearest tools from the reference library. */
  findNearest(spec: ToolSpec, k = 5): ToolNearestResult {
    const queryVec = this.specToVector(spec);
    const scored = REFERENCE_TOOLS
      .map(t => ({
        tool: t as ToolSpec, label: t.label,
        cosine_similarity: round4(this.cosineSimilarity(queryVec, this.specToVector(t))),
      }))
      .sort((a, b) => b.cosine_similarity - a.cosine_similarity)
      .slice(0, k);
    return { query: spec, neighbors: scored };
  }

  /** Get dimension name. */
  dimensionName(index: number): string { return DIM_NAMES[index] ?? `dim_${index}`; }

  // ── Private ──────────────────────────────────────────────────────────

  private specToVector(spec: ToolSpec): number[] {
    const v = new Array<number>(TOOL_EMBEDDING_DIM).fill(0);

    // [0..7] tool type one-hot
    v[TOOL_TYPE_MAP[spec.tool_type.toLowerCase()] ?? 0] = 1;

    // [8..11] geometry
    v[8] = clamp01((spec.diameter_mm ?? 10) / 50);
    v[9] = clamp01((spec.flute_count ?? 4) / 12);
    v[10] = clamp01((spec.overall_length_mm ?? 70) / 200);
    v[11] = clamp01((spec.corner_radius_mm ?? 0) / 10);

    // [12..14] helix angle buckets
    const helix = spec.helix_angle_deg ?? 35;
    if (helix < 30) v[12] = 1; else if (helix <= 40) v[13] = 1; else v[14] = 1;

    // [15..18] substrate
    v[15 + (SUBSTRATE_MAP[spec.substrate?.toLowerCase() ?? "carbide"] ?? 0)] = 1;

    // [19..23] coating
    v[19 + (COATING_MAP[spec.coating?.toLowerCase() ?? "tialn"] ?? 2)] = 1;

    // [24..29] ISO groups
    const g = spec.iso_groups ?? ["P"];
    if (g.includes("P")) v[24] = 1; if (g.includes("M")) v[25] = 1;
    if (g.includes("K")) v[26] = 1; if (g.includes("N")) v[27] = 1;
    if (g.includes("S")) v[28] = 1; if (g.includes("H")) v[29] = 1;

    // [30..34] capabilities
    v[30] = spec.roughing ? 1 : 0;
    v[31] = spec.finishing ? 1 : 0;
    v[32] = spec.coolant_through ? 1 : 0;
    v[33] = spec.high_speed ? 1 : 0;
    v[34] = spec.interrupted_cut ? 1 : 0;

    // [35] L/D ratio
    const dia = spec.diameter_mm ?? 10;
    v[35] = dia > 0 ? clamp01(((spec.overall_length_mm ?? 70) / dia) / 10) : 0;

    return v;
  }
}

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }

export const ppCuttingToolEncoderEngine = new PPCuttingToolEncoderEngine();
