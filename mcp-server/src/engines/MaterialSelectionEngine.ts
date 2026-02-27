/**
 * MaterialSelectionEngine — Manufacturing Intelligence Layer
 *
 * Recommends optimal materials for part requirements based on mechanical,
 * thermal, and machinability properties. Composes MaterialRegistry data.
 *
 * Actions: material_recommend, material_compare, material_machinability
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MaterialRequirements {
  tensile_strength_MPa?: number;     // minimum required
  yield_strength_MPa?: number;
  hardness_HRC?: number;             // minimum Rockwell C
  max_hardness_HRC?: number;
  thermal_limit_C?: number;          // max operating temperature
  corrosion_resistant?: boolean;
  weldable?: boolean;
  weight_sensitive?: boolean;        // prefer low density
  cost_sensitive?: boolean;
  iso_group_preference?: string;     // P, M, K, N, S, H
  application?: string;              // aerospace, automotive, medical, general
}

export interface MaterialCandidate {
  material_id: string;
  name: string;
  iso_group: string;
  category: string;
  score: number;
  properties: MaterialProperties;
  machinability_index: number;       // 0–100 (100 = easiest)
  rationale: string[];
  trade_offs: string[];
  relative_cost: number;             // 1.0 = baseline (1018 steel)
}

export interface MaterialProperties {
  tensile_strength_MPa: number;
  yield_strength_MPa: number;
  hardness_HRC: number;
  density_g_cm3: number;
  thermal_conductivity_W_mK: number;
  max_service_temp_C: number;
  elongation_pct: number;
}

export interface MachinabilityReport {
  material_id: string;
  machinability_index: number;
  iso_group: string;
  recommended_speed_factor: number;  // multiply by base speed
  chip_formation: "long" | "short" | "segmented" | "built_up_edge";
  tool_wear_tendency: "low" | "moderate" | "high" | "severe";
  coolant_recommendation: "flood" | "mist" | "dry" | "high_pressure";
  notes: string[];
}

export interface MaterialComparisonResult {
  candidates: MaterialCandidate[];
  best_match: string;
  comparison_table: Record<string, Record<string, number>>;
}

// ============================================================================
// MATERIAL DATABASE (representative common alloys)
// ============================================================================

interface MaterialData {
  name: string; iso: string; cat: string;
  UTS: number; YS: number; HRC: number; density: number;
  thermal_k: number; max_temp: number; elong: number;
  machinability: number; cost: number;
  chip: "long" | "short" | "segmented" | "built_up_edge";
  wear: "low" | "moderate" | "high" | "severe";
  coolant: "flood" | "mist" | "dry" | "high_pressure";
  corrosion: boolean; weldable: boolean;
}

const MATERIALS: MaterialData[] = [
  { name: "1018 Steel", iso: "P", cat: "carbon_steel", UTS: 440, YS: 370, HRC: 15, density: 7.87, thermal_k: 51.9, max_temp: 400, elong: 26, machinability: 78, cost: 1.0, chip: "long", wear: "low", coolant: "flood", corrosion: false, weldable: true },
  { name: "4140 Steel", iso: "P", cat: "alloy_steel", UTS: 655, YS: 415, HRC: 28, density: 7.85, thermal_k: 42.7, max_temp: 500, elong: 18, machinability: 65, cost: 1.3, chip: "long", wear: "moderate", coolant: "flood", corrosion: false, weldable: true },
  { name: "4340 Steel", iso: "P", cat: "alloy_steel", UTS: 745, YS: 470, HRC: 32, density: 7.85, thermal_k: 44.5, max_temp: 500, elong: 16, machinability: 55, cost: 1.5, chip: "segmented", wear: "moderate", coolant: "flood", corrosion: false, weldable: true },
  { name: "D2 Tool Steel", iso: "H", cat: "tool_steel", UTS: 1550, YS: 1380, HRC: 62, density: 7.70, thermal_k: 20.0, max_temp: 600, elong: 1, machinability: 25, cost: 3.5, chip: "short", wear: "severe", coolant: "flood", corrosion: false, weldable: false },
  { name: "H13 Tool Steel", iso: "H", cat: "tool_steel", UTS: 1380, YS: 1170, HRC: 52, density: 7.80, thermal_k: 24.4, max_temp: 600, elong: 8, machinability: 35, cost: 3.0, chip: "segmented", wear: "high", coolant: "flood", corrosion: false, weldable: true },
  { name: "304 Stainless", iso: "M", cat: "stainless_steel", UTS: 515, YS: 205, HRC: 20, density: 8.00, thermal_k: 16.2, max_temp: 870, elong: 40, machinability: 45, cost: 2.2, chip: "long", wear: "high", coolant: "flood", corrosion: true, weldable: true },
  { name: "316 Stainless", iso: "M", cat: "stainless_steel", UTS: 515, YS: 205, HRC: 20, density: 8.00, thermal_k: 16.3, max_temp: 870, elong: 40, machinability: 40, cost: 2.5, chip: "long", wear: "high", coolant: "high_pressure", corrosion: true, weldable: true },
  { name: "17-4 PH Stainless", iso: "M", cat: "stainless_steel", UTS: 1100, YS: 1000, HRC: 40, density: 7.78, thermal_k: 18.3, max_temp: 600, elong: 10, machinability: 38, cost: 3.0, chip: "segmented", wear: "high", coolant: "flood", corrosion: true, weldable: true },
  { name: "6061-T6 Aluminum", iso: "N", cat: "aluminum", UTS: 310, YS: 276, HRC: 15, density: 2.70, thermal_k: 167, max_temp: 200, elong: 17, machinability: 90, cost: 1.8, chip: "long", wear: "low", coolant: "mist", corrosion: true, weldable: true },
  { name: "7075-T6 Aluminum", iso: "N", cat: "aluminum", UTS: 572, YS: 503, HRC: 25, density: 2.81, thermal_k: 130, max_temp: 200, elong: 11, machinability: 85, cost: 2.5, chip: "long", wear: "low", coolant: "mist", corrosion: true, weldable: false },
  { name: "Ti-6Al-4V", iso: "S", cat: "titanium", UTS: 950, YS: 880, HRC: 36, density: 4.43, thermal_k: 6.7, max_temp: 600, elong: 14, machinability: 22, cost: 8.0, chip: "segmented", wear: "severe", coolant: "high_pressure", corrosion: true, weldable: true },
  { name: "Inconel 718", iso: "S", cat: "superalloy", UTS: 1240, YS: 1036, HRC: 44, density: 8.19, thermal_k: 11.4, max_temp: 980, elong: 12, machinability: 15, cost: 12.0, chip: "segmented", wear: "severe", coolant: "high_pressure", corrosion: true, weldable: true },
  { name: "Gray Cast Iron", iso: "K", cat: "cast_iron", UTS: 250, YS: 170, HRC: 20, density: 7.15, thermal_k: 46.0, max_temp: 400, elong: 0, machinability: 80, cost: 0.8, chip: "short", wear: "low", coolant: "dry", corrosion: false, weldable: false },
  { name: "Brass 360", iso: "N", cat: "copper_alloy", UTS: 385, YS: 310, HRC: 18, density: 8.50, thermal_k: 115, max_temp: 260, elong: 23, machinability: 100, cost: 2.0, chip: "short", wear: "low", coolant: "dry", corrosion: true, weldable: false },
  { name: "C110 Copper", iso: "N", cat: "copper_alloy", UTS: 220, YS: 69, HRC: 5, density: 8.94, thermal_k: 390, max_temp: 200, elong: 50, machinability: 70, cost: 3.0, chip: "long", wear: "low", coolant: "mist", corrosion: true, weldable: true },
];

// ============================================================================
// SCORING
// ============================================================================

function scoreMaterial(mat: MaterialData, req: MaterialRequirements): { score: number; rationale: string[]; trade_offs: string[] } {
  let score = 50;
  const rationale: string[] = [];
  const trade_offs: string[] = [];

  if (req.tensile_strength_MPa && mat.UTS >= req.tensile_strength_MPa) { score += 10; rationale.push(`UTS ${mat.UTS} MPa meets requirement`); }
  else if (req.tensile_strength_MPa) { score -= 20; trade_offs.push(`UTS ${mat.UTS} below required ${req.tensile_strength_MPa}`); }

  if (req.yield_strength_MPa && mat.YS >= req.yield_strength_MPa) { score += 10; rationale.push(`Yield ${mat.YS} MPa meets requirement`); }
  else if (req.yield_strength_MPa) { score -= 20; trade_offs.push(`Yield ${mat.YS} below required ${req.yield_strength_MPa}`); }

  if (req.hardness_HRC && mat.HRC >= req.hardness_HRC) { score += 5; }
  else if (req.hardness_HRC) { score -= 15; trade_offs.push(`Hardness ${mat.HRC} HRC below required ${req.hardness_HRC}`); }

  if (req.max_hardness_HRC && mat.HRC > req.max_hardness_HRC) { score -= 10; trade_offs.push("Too hard for requirement"); }

  if (req.thermal_limit_C && mat.max_temp >= req.thermal_limit_C) { score += 5; rationale.push(`Service temp ${mat.max_temp}°C sufficient`); }
  else if (req.thermal_limit_C) { score -= 15; trade_offs.push("Exceeds thermal limit"); }

  if (req.corrosion_resistant && mat.corrosion) { score += 10; rationale.push("Corrosion resistant"); }
  else if (req.corrosion_resistant) { score -= 10; trade_offs.push("No corrosion resistance"); }

  if (req.weldable && mat.weldable) { score += 5; rationale.push("Weldable"); }
  else if (req.weldable && !mat.weldable) { score -= 10; trade_offs.push("Not weldable"); }

  if (req.weight_sensitive) {
    if (mat.density < 4) { score += 15; rationale.push(`Low density ${mat.density} g/cm³`); }
    else if (mat.density < 5) { score += 5; }
    else { trade_offs.push(`High density ${mat.density} g/cm³`); }
  }

  if (req.cost_sensitive) {
    if (mat.cost <= 1.5) { score += 10; rationale.push("Low cost material"); }
    else if (mat.cost > 5) { score -= 10; trade_offs.push(`High cost factor ${mat.cost}x`); }
  }

  // Machinability bonus
  if (mat.machinability >= 75) { score += 10; rationale.push("Excellent machinability"); }
  else if (mat.machinability < 30) { score -= 5; trade_offs.push("Difficult to machine"); }

  if (req.iso_group_preference && mat.iso === req.iso_group_preference) { score += 5; }

  if (req.application === "aerospace" && (mat.iso === "S" || mat.cat === "aluminum")) { score += 10; rationale.push("Suitable for aerospace"); }
  if (req.application === "medical" && mat.corrosion && mat.iso !== "P") { score += 10; rationale.push("Biocompatible / corrosion resistant"); }
  if (req.application === "automotive" && mat.cost < 3.0) { score += 5; rationale.push("Cost-effective for automotive"); }

  return { score: Math.max(0, Math.min(100, score)), rationale, trade_offs };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MaterialSelectionEngine {
  recommend(req: MaterialRequirements): MaterialCandidate[] {
    const candidates: MaterialCandidate[] = [];

    for (const mat of MATERIALS) {
      const { score, rationale, trade_offs } = scoreMaterial(mat, req);
      candidates.push({
        material_id: mat.name.toLowerCase().replace(/[\s-]+/g, "_"),
        name: mat.name, iso_group: mat.iso, category: mat.cat,
        score, machinability_index: mat.machinability,
        rationale, trade_offs, relative_cost: mat.cost,
        properties: {
          tensile_strength_MPa: mat.UTS, yield_strength_MPa: mat.YS,
          hardness_HRC: mat.HRC, density_g_cm3: mat.density,
          thermal_conductivity_W_mK: mat.thermal_k,
          max_service_temp_C: mat.max_temp, elongation_pct: mat.elong,
        },
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 5);
  }

  compare(materialIds: string[]): MaterialComparisonResult {
    const candidates: MaterialCandidate[] = [];
    const table: Record<string, Record<string, number>> = {};

    for (const id of materialIds) {
      const mat = MATERIALS.find(m => m.name.toLowerCase().replace(/[\s-]+/g, "_") === id) || MATERIALS[0];
      const { score, rationale, trade_offs } = scoreMaterial(mat, {});
      const candidate: MaterialCandidate = {
        material_id: id, name: mat.name, iso_group: mat.iso, category: mat.cat,
        score, machinability_index: mat.machinability,
        rationale, trade_offs, relative_cost: mat.cost,
        properties: {
          tensile_strength_MPa: mat.UTS, yield_strength_MPa: mat.YS,
          hardness_HRC: mat.HRC, density_g_cm3: mat.density,
          thermal_conductivity_W_mK: mat.thermal_k,
          max_service_temp_C: mat.max_temp, elongation_pct: mat.elong,
        },
      };
      candidates.push(candidate);
      table[id] = { UTS: mat.UTS, YS: mat.YS, HRC: mat.HRC, density: mat.density, machinability: mat.machinability, cost: mat.cost };
    }

    const best = candidates.reduce((b, c) => c.score > b.score ? c : b, candidates[0]);
    return { candidates, best_match: best.material_id, comparison_table: table };
  }

  machinability(materialId: string): MachinabilityReport {
    const mat = MATERIALS.find(m => m.name.toLowerCase().replace(/[\s-]+/g, "_") === materialId) || MATERIALS[0];
    const speedFactor = mat.machinability / 100;
    const notes: string[] = [];

    if (mat.machinability < 30) notes.push("Use reduced speeds and rigid setup");
    if (mat.iso === "S") notes.push("High-pressure coolant recommended for chip evacuation");
    if (mat.iso === "M") notes.push("Work-hardening tendency — avoid dwelling");
    if (mat.chip === "long") notes.push("Chipbreaker geometry recommended");
    if (mat.wear === "severe") notes.push("Use ceramic or CBN inserts for extended tool life");

    return {
      material_id: materialId, machinability_index: mat.machinability,
      iso_group: mat.iso, recommended_speed_factor: Math.round(speedFactor * 100) / 100,
      chip_formation: mat.chip, tool_wear_tendency: mat.wear,
      coolant_recommendation: mat.coolant, notes,
    };
  }
}

export const materialSelectionEngine = new MaterialSelectionEngine();
