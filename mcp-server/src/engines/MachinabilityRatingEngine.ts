/**
 * MachinabilityRatingEngine — L2-P2-MS1 CAD/CAM Layer
 *
 * Rates material machinability on a 0-100 scale relative to AISI 1212
 * (free-machining steel = 100). Considers cutting forces, tool wear,
 * surface finish, chip formation, and thermal behavior.
 *
 * Actions: machinability_rate, machinability_compare, machinability_factors
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MachinabilityInput {
  material_name: string;
  hardness_HRC?: number;
  hardness_HB?: number;
  tensile_strength_MPa?: number;
  iso_group?: string;
  condition?: "annealed" | "normalized" | "quenched_tempered" | "cold_worked" | "solution_treated" | "aged";
}

export interface MachinabilityRating {
  material: string;
  overall_rating: number;             // 0-100, AISI 1212 = 100
  category: "excellent" | "good" | "fair" | "poor" | "very_poor";
  factors: MachinabilityFactor[];
  recommended_speed_factor: number;   // multiply baseline speed by this
  recommended_feed_factor: number;
  tool_life_factor: number;           // expected tool life relative to baseline
  chip_formation: "long_continuous" | "short_breaking" | "segmented" | "built_up_edge";
  notes: string[];
}

export interface MachinabilityFactor {
  name: string;
  score: number;                      // 0-100
  weight: number;                     // contribution weight
  description: string;
}

export interface MachinabilityComparison {
  materials: MachinabilityRating[];
  best_index: number;
  worst_index: number;
  speed_ratio: number;                // best speed / worst speed
}

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

interface MaterialMachData {
  rating: number;
  iso: string;
  speedFactor: number;
  feedFactor: number;
  toolLifeFactor: number;
  chipType: MachinabilityRating["chip_formation"];
  forceScore: number;
  wearScore: number;
  finishScore: number;
  thermalScore: number;
}

const MATERIAL_DB: Record<string, MaterialMachData> = {
  "AISI 1212":    { rating: 100, iso: "P", speedFactor: 1.0, feedFactor: 1.0, toolLifeFactor: 1.0, chipType: "short_breaking", forceScore: 90, wearScore: 90, finishScore: 85, thermalScore: 85 },
  "AISI 1018":    { rating: 78, iso: "P", speedFactor: 0.85, feedFactor: 0.95, toolLifeFactor: 0.85, chipType: "long_continuous", forceScore: 75, wearScore: 80, finishScore: 70, thermalScore: 80 },
  "AISI 1045":    { rating: 65, iso: "P", speedFactor: 0.75, feedFactor: 0.90, toolLifeFactor: 0.75, chipType: "long_continuous", forceScore: 65, wearScore: 70, finishScore: 65, thermalScore: 75 },
  "AISI 4140":    { rating: 55, iso: "P", speedFactor: 0.65, feedFactor: 0.85, toolLifeFactor: 0.65, chipType: "segmented", forceScore: 55, wearScore: 60, finishScore: 60, thermalScore: 70 },
  "AISI 4340":    { rating: 45, iso: "P", speedFactor: 0.55, feedFactor: 0.80, toolLifeFactor: 0.55, chipType: "segmented", forceScore: 45, wearScore: 50, finishScore: 55, thermalScore: 65 },
  "304 Stainless": { rating: 40, iso: "M", speedFactor: 0.50, feedFactor: 0.75, toolLifeFactor: 0.45, chipType: "built_up_edge", forceScore: 40, wearScore: 40, finishScore: 45, thermalScore: 35 },
  "316 Stainless": { rating: 35, iso: "M", speedFactor: 0.45, feedFactor: 0.70, toolLifeFactor: 0.40, chipType: "built_up_edge", forceScore: 35, wearScore: 35, finishScore: 40, thermalScore: 30 },
  "17-4PH":       { rating: 30, iso: "M", speedFactor: 0.40, feedFactor: 0.70, toolLifeFactor: 0.35, chipType: "segmented", forceScore: 30, wearScore: 30, finishScore: 35, thermalScore: 30 },
  "6061-T6 Al":   { rating: 95, iso: "N", speedFactor: 2.5, feedFactor: 1.2, toolLifeFactor: 3.0, chipType: "long_continuous", forceScore: 95, wearScore: 95, finishScore: 90, thermalScore: 90 },
  "7075-T6 Al":   { rating: 85, iso: "N", speedFactor: 2.0, feedFactor: 1.1, toolLifeFactor: 2.5, chipType: "short_breaking", forceScore: 85, wearScore: 90, finishScore: 85, thermalScore: 85 },
  "Ti-6Al-4V":    { rating: 22, iso: "S", speedFactor: 0.25, feedFactor: 0.60, toolLifeFactor: 0.20, chipType: "segmented", forceScore: 25, wearScore: 20, finishScore: 30, thermalScore: 15 },
  "Inconel 718":  { rating: 12, iso: "S", speedFactor: 0.15, feedFactor: 0.50, toolLifeFactor: 0.12, chipType: "segmented", forceScore: 15, wearScore: 10, finishScore: 20, thermalScore: 10 },
  "Cast Iron FC25": { rating: 70, iso: "K", speedFactor: 0.80, feedFactor: 1.0, toolLifeFactor: 0.90, chipType: "short_breaking", forceScore: 75, wearScore: 70, finishScore: 75, thermalScore: 80 },
  "Brass C360":   { rating: 90, iso: "N", speedFactor: 2.0, feedFactor: 1.1, toolLifeFactor: 2.5, chipType: "short_breaking", forceScore: 90, wearScore: 90, finishScore: 90, thermalScore: 85 },
  "D2 Tool Steel": { rating: 25, iso: "H", speedFactor: 0.30, feedFactor: 0.65, toolLifeFactor: 0.25, chipType: "segmented", forceScore: 25, wearScore: 25, finishScore: 30, thermalScore: 35 },
  "H13 Tool Steel": { rating: 30, iso: "H", speedFactor: 0.35, feedFactor: 0.70, toolLifeFactor: 0.30, chipType: "segmented", forceScore: 30, wearScore: 30, finishScore: 35, thermalScore: 35 },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MachinabilityRatingEngine {
  rate(input: MachinabilityInput): MachinabilityRating {
    // Look up material or estimate from properties
    let data = this.findMaterial(input.material_name);

    if (!data) {
      // Estimate from properties
      data = this.estimateFromProperties(input);
    }

    // Hardness adjustment
    let ratingAdj = data.rating;
    if (input.hardness_HRC && input.hardness_HRC > 40) {
      ratingAdj *= Math.max(0.3, 1 - (input.hardness_HRC - 40) * 0.015);
    }
    if (input.condition === "cold_worked" || input.condition === "aged") {
      ratingAdj *= 0.85;
    }

    ratingAdj = Math.round(Math.max(5, Math.min(100, ratingAdj)));

    const category: MachinabilityRating["category"] =
      ratingAdj >= 80 ? "excellent"
      : ratingAdj >= 60 ? "good"
      : ratingAdj >= 40 ? "fair"
      : ratingAdj >= 20 ? "poor"
      : "very_poor";

    const factors: MachinabilityFactor[] = [
      { name: "cutting_forces", score: data.forceScore, weight: 0.25, description: "Lower forces = better machinability" },
      { name: "tool_wear", score: data.wearScore, weight: 0.30, description: "Lower wear rate = better machinability" },
      { name: "surface_finish", score: data.finishScore, weight: 0.25, description: "Better achievable finish = better machinability" },
      { name: "thermal_behavior", score: data.thermalScore, weight: 0.20, description: "Better heat dissipation = better machinability" },
    ];

    const notes: string[] = [];
    if (data.chipType === "built_up_edge") notes.push("BUE tendency — use sharp tools with positive rake and high speed");
    if (data.chipType === "long_continuous") notes.push("Long chips — use chip breaker geometry");
    if (ratingAdj < 30) notes.push("Difficult to machine — use rigid setup, sharp tools, appropriate coolant");
    if (input.iso_group === "S") notes.push("Superalloy — ceramic or CBN tooling recommended at appropriate speeds");

    return {
      material: input.material_name,
      overall_rating: ratingAdj,
      category,
      factors,
      recommended_speed_factor: Math.round(data.speedFactor * 100) / 100,
      recommended_feed_factor: Math.round(data.feedFactor * 100) / 100,
      tool_life_factor: Math.round(data.toolLifeFactor * 100) / 100,
      chip_formation: data.chipType,
      notes,
    };
  }

  compare(inputs: MachinabilityInput[]): MachinabilityComparison {
    const ratings = inputs.map(i => this.rate(i));
    let bestIdx = 0, worstIdx = 0;
    for (let i = 1; i < ratings.length; i++) {
      if (ratings[i].overall_rating > ratings[bestIdx].overall_rating) bestIdx = i;
      if (ratings[i].overall_rating < ratings[worstIdx].overall_rating) worstIdx = i;
    }
    const speedRatio = ratings[bestIdx].recommended_speed_factor / Math.max(ratings[worstIdx].recommended_speed_factor, 0.01);

    return {
      materials: ratings,
      best_index: bestIdx,
      worst_index: worstIdx,
      speed_ratio: Math.round(speedRatio * 100) / 100,
    };
  }

  listMaterials(): string[] {
    return Object.keys(MATERIAL_DB);
  }

  private findMaterial(name: string): MaterialMachData | undefined {
    // Exact match first
    if (MATERIAL_DB[name]) return MATERIAL_DB[name];
    // Partial match
    const lower = name.toLowerCase();
    for (const [key, val] of Object.entries(MATERIAL_DB)) {
      if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) return val;
    }
    return undefined;
  }

  private estimateFromProperties(input: MachinabilityInput): MaterialMachData {
    // Estimate machinability from ISO group and/or hardness
    const iso = input.iso_group || "P";
    const baseRatings: Record<string, number> = { P: 60, M: 35, K: 70, N: 90, S: 20, H: 25 };
    let rating = baseRatings[iso] || 50;

    if (input.tensile_strength_MPa) {
      // Higher strength = lower machinability
      rating *= Math.max(0.3, 1 - (input.tensile_strength_MPa - 500) / 2000);
    }

    rating = Math.max(5, Math.min(100, rating));
    const speedFactor = rating / 100;

    return {
      rating: Math.round(rating),
      iso,
      speedFactor: Math.round(speedFactor * 100) / 100,
      feedFactor: Math.round(Math.max(0.5, speedFactor * 1.1) * 100) / 100,
      toolLifeFactor: Math.round(speedFactor * 100) / 100,
      chipType: iso === "M" ? "built_up_edge" : iso === "S" || iso === "H" ? "segmented" : "long_continuous",
      forceScore: Math.round(rating * 0.9),
      wearScore: Math.round(rating * 0.85),
      finishScore: Math.round(rating * 0.95),
      thermalScore: Math.round(rating * 0.80),
    };
  }
}

export const machinabilityRatingEngine = new MachinabilityRatingEngine();
