/**
 * PPMaterialPropertyVectorEngine — PP-AGI-MS3
 *
 * Maps material properties to dense 32-dimensional feature vectors for
 * ML-based material similarity, substitution search, and parameter transfer.
 *
 * CONSUMES MaterialDatabaseEngine data to produce embeddings encoding:
 *   - ISO material group (P/M/K/N/S/H mapping via category)
 *   - Cutting coefficients (Kienzle kc1.1, mc; Taylor C, n)
 *   - Physical properties (density, hardness, tensile, yield)
 *   - Thermal properties (conductivity, expansion)
 *   - Machinability characteristics (rating, chip formation, BUE tendency)
 *   - Recommended cutting parameters (SFM, feed)
 *
 * Use cases:
 *   - "What material is most similar to D2 tool steel?" → nearest neighbor
 *   - "Can I use 4140 parameters for 4340?" → similarity score + gap analysis
 *   - "Group materials by machinability" → clustering
 *
 * References: PP-AGI-MAXOUT-ROADMAP Phase 0 MS3
 * @module PPMaterialPropertyVectorEngine
 */

import {
  MaterialDatabaseEngine,
  type MaterialProperties,
  type MaterialCategory,
} from "./MaterialDatabaseEngine.js";

// ── Constants ─────────────────────────────────────────────────────────

export const MATERIAL_EMBEDDING_DIM = 32;

const CATEGORY_INDEX: Record<string, number> = {
  carbon_steel: 0, alloy_steel: 0,    // ISO P
  stainless_steel: 1,                  // ISO M
  cast_iron: 2,                        // ISO K
  aluminum: 3, copper_alloy: 3,        // ISO N
  titanium: 4, nickel_alloy: 4,        // ISO S
  tool_steel: 5,                       // ISO H (hardened)
  plastic: 6,                          // Other
};

const CHIP_INDEX: Record<string, number> = {
  continuous: 0, segmented: 1, discontinuous: 2,
};

const BUE_INDEX: Record<string, number> = {
  low: 0, medium: 1, high: 2,
};

// Normalization ceilings
const MAX_KC = 3500;      // kc1.1 N/mm²
const MAX_MC = 0.5;       // mc exponent
const MAX_TAYLOR_C = 500; // Taylor C m/min
const MAX_DENSITY = 10;   // g/cm³
const MAX_HB = 700;       // Brinell
const MAX_TENSILE = 2500; // MPa
const MAX_YIELD = 2000;   // MPa
const MAX_THERMAL_K = 400;// W/(m·K)
const MAX_EXPANSION = 25; // µm/(m·K)
const MAX_MACHINABILITY = 200; // %
const MAX_SFM = 3000;     // ft/min
const MAX_FEED = 0.02;    // IPR

const DIM_NAMES: string[] = [
  "iso_p", "iso_m", "iso_k", "iso_n", "iso_s", "iso_h", "iso_other",
  "kc1_1_norm", "mc_norm", "taylor_c_norm", "taylor_n_norm",
  "density_norm", "hardness_hb_norm", "tensile_norm", "yield_norm",
  "thermal_k_norm", "thermal_exp_norm",
  "machinability_norm",
  "chip_continuous", "chip_segmented", "chip_discontinuous",
  "bue_low", "bue_medium", "bue_high",
  "sfm_rough_norm", "sfm_finish_norm", "feed_rough_norm", "feed_finish_norm",
  "is_ferrous", "is_hardened", "is_heat_resistant", "is_nonferrous",
];

// ── Types ─────────────────────────────────────────────────────────────

export interface MaterialEmbedding {
  material_id: string;
  material_name: string;
  category: string;
  vector: number[];
  dimension: number;
}

export interface MaterialSimilarityResult {
  material_a: string;
  material_b: string;
  cosine_similarity: number;
  euclidean_distance: number;
  substitution_safe: boolean;
  parameter_transfer_confidence: number;
  key_differences: string[];
}

export interface MaterialNearestResult {
  query: string;
  neighbors: Array<{
    material_id: string;
    material_name: string;
    cosine_similarity: number;
    category: string;
  }>;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPMaterialPropertyVectorEngine {
  private db: MaterialDatabaseEngine;
  private cache = new Map<string, MaterialEmbedding>();

  constructor(db?: MaterialDatabaseEngine) {
    this.db = db ?? new MaterialDatabaseEngine();
  }

  /** Embed a single material to a 32-dim vector. */
  embed(materialId: string): MaterialEmbedding | null {
    const cached = this.cache.get(materialId);
    if (cached) return cached;

    const mat = this.db.getMaterial(materialId);
    if (!mat) return null;

    const vec = this.materialToVector(mat);
    const result: MaterialEmbedding = {
      material_id: mat.id,
      material_name: mat.name,
      category: mat.category,
      vector: vec,
      dimension: MATERIAL_EMBEDDING_DIM,
    };

    this.cache.set(materialId, result);
    return result;
  }

  /** Embed all materials in the database. */
  embedAll(): MaterialEmbedding[] {
    const ids = this.db.getAllMaterialIds();
    const results: MaterialEmbedding[] = [];
    for (const id of ids) {
      const emb = this.embed(id);
      if (emb) results.push(emb);
    }
    return results;
  }

  /** Cosine similarity between two vectors. */
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

  /** Euclidean distance. */
  euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const d = a[i] - b[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
  }

  /** Compare two materials for similarity and substitution safety. */
  compare(materialA: string, materialB: string): MaterialSimilarityResult | null {
    const embA = this.embed(materialA);
    const embB = this.embed(materialB);
    if (!embA || !embB) return null;

    const sim = this.cosineSimilarity(embA.vector, embB.vector);
    const dist = this.euclideanDistance(embA.vector, embB.vector);

    const diffs: string[] = [];
    for (let i = 0; i < MATERIAL_EMBEDDING_DIM; i++) {
      if (Math.abs(embA.vector[i] - embB.vector[i]) > 0.3) {
        diffs.push(DIM_NAMES[i]);
      }
    }

    // Substitution is safe if same ISO group and Kienzle kc1.1 within 20%
    const sameGroup = embA.vector.slice(0, 7).findIndex(v => v === 1) ===
                      embB.vector.slice(0, 7).findIndex(v => v === 1);
    const kcDiff = Math.abs(embA.vector[7] - embB.vector[7]);
    const substitutionSafe = sameGroup && kcDiff < 0.2;

    // Parameter transfer confidence based on cutting coefficient similarity
    const cuttingDims = [7, 8, 9, 10]; // kc1.1, mc, Taylor C, Taylor n
    let cuttingSim = 0;
    for (const d of cuttingDims) {
      cuttingSim += 1 - Math.abs(embA.vector[d] - embB.vector[d]);
    }
    const parameterConf = round2(cuttingSim / cuttingDims.length * sim);

    return {
      material_a: embA.material_id,
      material_b: embB.material_id,
      cosine_similarity: round4(sim),
      euclidean_distance: round4(dist),
      substitution_safe: substitutionSafe,
      parameter_transfer_confidence: parameterConf,
      key_differences: diffs,
    };
  }

  /** Find k nearest materials. */
  findNearest(materialId: string, k = 5): MaterialNearestResult | null {
    const query = this.embed(materialId);
    if (!query) return null;

    const all = this.embedAll();
    const scored = all
      .filter(e => e.material_id !== query.material_id)
      .map(e => ({
        material_id: e.material_id,
        material_name: e.material_name,
        cosine_similarity: round4(this.cosineSimilarity(query.vector, e.vector)),
        category: e.category,
      }))
      .sort((a, b) => b.cosine_similarity - a.cosine_similarity)
      .slice(0, k);

    return { query: query.material_id, neighbors: scored };
  }

  /** Get dimension name. */
  dimensionName(index: number): string {
    return DIM_NAMES[index] ?? `dim_${index}`;
  }

  /** Clear cache. */
  invalidate(): void {
    this.cache.clear();
  }

  // ── Private ──────────────────────────────────────────────────────────

  private materialToVector(mat: MaterialProperties): number[] {
    const v = new Array<number>(MATERIAL_EMBEDDING_DIM).fill(0);

    // [0..6] ISO category one-hot
    const catIdx = CATEGORY_INDEX[mat.category] ?? 6;
    v[catIdx] = 1;

    // [7..10] cutting coefficients
    v[7] = clamp01(mat.kienzle.kc1_1 / MAX_KC);
    v[8] = clamp01(mat.kienzle.mc / MAX_MC);
    v[9] = clamp01(mat.taylor.C / MAX_TAYLOR_C);
    v[10] = clamp01(mat.taylor.n);  // already 0-1 range

    // [11..14] physical properties
    v[11] = clamp01(mat.density / MAX_DENSITY);
    v[12] = clamp01(mat.hardnessHB / MAX_HB);
    v[13] = clamp01(mat.tensileStrength / MAX_TENSILE);
    v[14] = clamp01(mat.yieldStrength / MAX_YIELD);

    // [15..16] thermal
    v[15] = clamp01(mat.thermalConductivity / MAX_THERMAL_K);
    v[16] = clamp01(mat.thermalExpansion / MAX_EXPANSION);

    // [17] machinability
    v[17] = clamp01(mat.machinabilityRating / MAX_MACHINABILITY);

    // [18..20] chip formation one-hot
    const chipIdx = CHIP_INDEX[mat.chipFormation] ?? 0;
    v[18 + chipIdx] = 1;

    // [21..23] BUE tendency one-hot
    const bueIdx = BUE_INDEX[mat.builtUpEdgeTendency] ?? 0;
    v[21 + bueIdx] = 1;

    // [24..27] recommended cutting params
    v[24] = clamp01(mat.recommendedSFM.roughing / MAX_SFM);
    v[25] = clamp01(mat.recommendedSFM.finishing / MAX_SFM);
    v[26] = clamp01(mat.recommendedFeedIPR.roughing / MAX_FEED);
    v[27] = clamp01(mat.recommendedFeedIPR.finishing / MAX_FEED);

    // [28..31] material type flags
    const cat = mat.category;
    v[28] = ["carbon_steel", "alloy_steel", "tool_steel", "stainless_steel", "cast_iron"].includes(cat) ? 1 : 0;
    v[29] = cat === "tool_steel" || (mat.hardnessHRC ?? 0) > 45 ? 1 : 0;
    v[30] = ["titanium", "nickel_alloy"].includes(cat) ? 1 : 0;
    v[31] = ["aluminum", "copper_alloy", "plastic"].includes(cat) ? 1 : 0;

    return v;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
function round2(x: number): number { return Math.round(x * 100) / 100; }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }

// ── Singleton ─────────────────────────────────────────────────────────

export const ppMaterialPropertyVectorEngine = new PPMaterialPropertyVectorEngine();
