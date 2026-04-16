/**
 * PPSafetyEnvelopeVectorEngine — PP-AGI-MS5
 *
 * Encodes machine safety envelope configurations into dense 20-dimensional
 * vectors for safety comparison and risk assessment across machines.
 *
 * NOT a collision detector — does not run GJK, SAT, or swept volume checks.
 * This engine encodes safety CONFIGURATIONS as feature vectors for ML use.
 *
 * Embedding dimensions (20 total):
 *   [0..3]   machine category one-hot (vmc/hmc/lathe/5axis)
 *   [4..5]   tool change / probe zone volume normalized
 *   [6]      danger zone count
 *   [7]      total travel volume (log scale)
 *   [8..10]  clearance Z, reach X, reach Y normalized
 *   [11..15] interference flags (rotary/tailstock/sub-spindle/turret/fixture)
 *   [16..18] risk factors (tool overhang, rapid distance, ATC verified)
 *   [19]     data completeness score
 *
 * References: PP-AGI-MAXOUT-ROADMAP Phase 0 MS5
 * @module PPSafetyEnvelopeVectorEngine
 */

export const SAFETY_ENVELOPE_DIM = 20;

const DIM_NAMES: string[] = [
  "cat_vmc", "cat_hmc", "cat_lathe", "cat_5axis",
  "tc_zone_vol", "probe_zone_vol", "danger_zone_count",
  "travel_vol_norm", "min_clearance_z", "max_reach_x", "max_reach_y",
  "rotary_risk", "has_tailstock", "sub_spindle_risk",
  "turret_clearance", "fixture_interference",
  "tool_overhang_risk", "rapid_move_risk", "atc_verified",
  "data_completeness",
];

export interface SafetyEnvelopeSpec {
  machine_category?: "vmc" | "hmc" | "lathe" | "5axis";
  tool_change_zone?: { x_range: number; y_range: number; z_range: number };
  probe_zone?: { x_range: number; y_range: number; z_range: number };
  danger_zone_count?: number;
  travel_x_mm?: number;
  travel_y_mm?: number;
  travel_z_mm?: number;
  min_clearance_z_mm?: number;
  has_rotary_axes?: boolean;
  has_tailstock?: boolean;
  has_sub_spindle?: boolean;
  has_turret?: boolean;
  has_fixture_system?: boolean;
  max_tool_overhang_mm?: number;
  tool_diameter_mm?: number;
  max_rapid_distance_mm?: number;
  atc_clearance_verified?: boolean;
}

export interface SafetyEnvelopeEmbedding {
  vector: number[];
  dimension: number;
  risk_level: "low" | "medium" | "high" | "critical";
  risk_factors: string[];
}

export class PPSafetyEnvelopeVectorEngine {
  embed(spec: SafetyEnvelopeSpec): SafetyEnvelopeEmbedding {
    const v = this.specToVector(spec);
    const { level, factors } = this.assessRisk(v);
    return { vector: v, dimension: SAFETY_ENVELOPE_DIM, risk_level: level, risk_factors: factors };
  }

  compare(a: SafetyEnvelopeSpec, b: SafetyEnvelopeSpec): {
    cosine_similarity: number; risk_delta: string; key_differences: string[];
  } {
    const vecA = this.specToVector(a);
    const vecB = this.specToVector(b);
    const diffs: string[] = [];
    for (let i = 0; i < SAFETY_ENVELOPE_DIM; i++) {
      if (Math.abs(vecA[i] - vecB[i]) > 0.3) diffs.push(DIM_NAMES[i]);
    }
    const rA = this.assessRisk(vecA).level;
    const rB = this.assessRisk(vecB).level;
    return { cosine_similarity: round4(cosineSim(vecA, vecB)), risk_delta: `${rA} → ${rB}`, key_differences: diffs };
  }

  dimensionName(index: number): string { return DIM_NAMES[index] ?? `dim_${index}`; }

  private specToVector(spec: SafetyEnvelopeSpec): number[] {
    const v = new Array<number>(SAFETY_ENVELOPE_DIM).fill(0);
    const catMap: Record<string, number> = { vmc: 0, hmc: 1, lathe: 2, "5axis": 3 };
    v[catMap[spec.machine_category ?? "vmc"] ?? 0] = 1;

    if (spec.tool_change_zone) {
      const vol = spec.tool_change_zone.x_range * spec.tool_change_zone.y_range * spec.tool_change_zone.z_range;
      v[4] = clamp01(vol / 1e8);
    }
    if (spec.probe_zone) {
      const vol = spec.probe_zone.x_range * spec.probe_zone.y_range * spec.probe_zone.z_range;
      v[5] = clamp01(vol / 1e8);
    }
    v[6] = clamp01((spec.danger_zone_count ?? 0) / 5);
    const travelVol = (spec.travel_x_mm ?? 500) * (spec.travel_y_mm ?? 400) * (spec.travel_z_mm ?? 400);
    v[7] = travelVol > 0 ? clamp01(Math.log10(travelVol) / 10) : 0;
    v[8] = clamp01((spec.min_clearance_z_mm ?? 100) / 500);
    v[9] = clamp01((spec.travel_x_mm ?? 500) / 2000);
    v[10] = clamp01((spec.travel_y_mm ?? 400) / 1500);
    v[11] = spec.has_rotary_axes ? 1 : 0;
    v[12] = spec.has_tailstock ? 1 : 0;
    v[13] = spec.has_sub_spindle ? 1 : 0;
    v[14] = spec.has_turret ? 1 : 0;
    v[15] = spec.has_fixture_system ? 1 : 0;
    const overhang = spec.max_tool_overhang_mm ?? 50;
    const toolDia = spec.tool_diameter_mm ?? 10;
    v[16] = toolDia > 0 ? clamp01((overhang / toolDia) / 10) : 0;
    v[17] = clamp01((spec.max_rapid_distance_mm ?? 0) / 2000);
    v[18] = spec.atc_clearance_verified ? 1 : 0;
    let completeness = 0;
    if (spec.machine_category) completeness += 0.15;
    if (spec.tool_change_zone) completeness += 0.15;
    if (spec.travel_x_mm) completeness += 0.15;
    if (spec.min_clearance_z_mm) completeness += 0.15;
    if (spec.has_rotary_axes !== undefined) completeness += 0.1;
    if (spec.max_tool_overhang_mm) completeness += 0.1;
    if (spec.atc_clearance_verified !== undefined) completeness += 0.1;
    if (spec.danger_zone_count !== undefined) completeness += 0.1;
    v[19] = clamp01(completeness);
    return v;
  }

  private assessRisk(v: number[]): { level: "low" | "medium" | "high" | "critical"; factors: string[] } {
    const factors: string[] = [];
    let score = 0;
    if (v[11] === 1) { score += 2; factors.push("rotary_axes"); }
    if (v[13] === 1) { score += 2; factors.push("sub_spindle"); }
    if (v[16] > 0.5) { score += 1; factors.push("tool_overhang"); }
    if (v[17] > 0.5) { score += 1; factors.push("long_rapids"); }
    if (v[6] > 0.4) { score += 1; factors.push("multiple_danger_zones"); }
    if (v[18] === 0) { score += 1; factors.push("atc_unverified"); }
    if (v[19] < 0.5) { score += 1; factors.push("incomplete_data"); }
    const level = score >= 5 ? "critical" : score >= 3 ? "high" : score >= 1 ? "medium" : "low";
    return { level, factors };
  }
}

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i]; }
  const d = Math.sqrt(magA) * Math.sqrt(magB);
  return d > 0 ? dot / d : 0;
}

export const ppSafetyEnvelopeVectorEngine = new PPSafetyEnvelopeVectorEngine();
