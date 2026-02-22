/**
 * ManufacturingGenomeEngine.ts — R10-Rev1 Manufacturing Genome
 * =============================================================
 *
 * Complete, computable model of how any material behaves under cutting:
 *   - Material genome records: composition, mechanical, thermal, machinability fingerprints
 *   - Genome-based parameter prediction with batch/condition awareness
 *   - Similarity search: find similar materials for parameter transfer
 *   - Behavioral pattern tracking from accumulated jobs
 *   - Cross-reference: genome record ↔ existing PRISM material registry
 *
 * @version 1.0.0 — R10-Rev1
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type HeatTreatment = "annealed" | "normalized" | "quench_temper" | "solution_aged" | "as_cast" | "stress_relieved";
export type ChipFormation = "continuous" | "segmented" | "discontinuous" | "bue_prone";

export interface Composition {
  C?: number; Si?: number; Mn?: number; Cr?: number; Ni?: number; Mo?: number;
  V?: number; W?: number; Co?: number; Ti?: number; Al?: number; Cu?: number;
  Nb?: number; Fe?: number; S?: number; P?: number; N?: number;
}

export interface MechanicalFingerprint {
  hardness_hrc: number;
  hardness_hb: number;
  tensile_mpa: number;
  yield_mpa: number;
  elongation_pct: number;
  fracture_toughness_mpa_m05?: number;
  johnson_cook?: { A: number; B: number; C: number; n: number; m: number };
}

export interface ThermalFingerprint {
  conductivity_w_mk: number;
  specific_heat_j_kgk: number;
  expansion_um_mk: number;
  white_layer_threshold_c?: number;
  melting_point_c: number;
}

export interface MachinabilityFingerprint {
  kc1_1: number; // specific cutting force (N/mm²)
  mc: number;    // cutting force exponent
  taylor_C: number; // Taylor tool life constant
  taylor_n: number; // Taylor exponent
  chip_formation: ChipFormation;
  work_hardening_rate: number; // 0 = none, 1 = extreme
  bue_tendency: number;       // 0-1
  abrasiveness: number;       // 0-1
  optimal_chip_thickness_mm: [number, number]; // [min, max]
  vc_range_carbide: [number, number]; // m/min
}

export interface SurfaceIntegrityResponse {
  residual_stress_tendency: "compressive" | "tensile" | "neutral";
  white_layer_risk: "none" | "low" | "medium" | "high";
  work_hardened_depth_mm: number;
  roughness_correction_factor: number; // multiplier on theoretical Ra
}

export interface BehavioralPattern {
  jobs_recorded: number;
  avg_tool_life_vs_predicted: number; // ratio: >1 = better than predicted
  common_failure_modes: string[];
  community_insights: string[];
  last_updated: string;
}

export interface GenomeRecord {
  genome_id: string;
  material_name: string;
  designations: Record<string, string>; // AISI, UNS, DIN, etc.
  heat_treatment: HeatTreatment;
  composition: Composition;
  mechanical: MechanicalFingerprint;
  thermal: ThermalFingerprint;
  machinability: MachinabilityFingerprint;
  surface_integrity: SurfaceIntegrityResponse;
  behavioral: BehavioralPattern;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  family: string;
}

export interface GenomePrediction {
  prediction_id: string;
  genome_id: string;
  material: string;
  condition: string;
  recommended_vc: number;
  recommended_fz: number;
  recommended_ap_max: number;
  predicted_tool_life_min: number;
  confidence_pct: number;
  basis: string;
  adjustments: string[];
}

export interface SimilarityResult {
  genome_id: string;
  material: string;
  similarity_score: number; // 0-1
  matching_properties: string[];
  differences: string[];
}

// ─── Genome Database ─────────────────────────────────────────────────────────

const GENOME_DB: GenomeRecord[] = [
  {
    genome_id: "GEN-001", material_name: "AISI 4140", family: "alloy_steel",
    designations: { AISI: "4140", UNS: "G41400", DIN: "1.7225", EN: "42CrMo4" },
    heat_treatment: "quench_temper", iso_group: "P",
    composition: { C: 0.40, Mn: 0.85, Cr: 1.0, Mo: 0.20, Si: 0.25, Fe: 97.3 },
    mechanical: { hardness_hrc: 28, hardness_hb: 280, tensile_mpa: 950, yield_mpa: 655, elongation_pct: 18 },
    thermal: { conductivity_w_mk: 42, specific_heat_j_kgk: 473, expansion_um_mk: 11.2, melting_point_c: 1416, white_layer_threshold_c: 750 },
    machinability: { kc1_1: 1800, mc: 0.25, taylor_C: 350, taylor_n: 0.25, chip_formation: "continuous", work_hardening_rate: 0.15, bue_tendency: 0.2, abrasiveness: 0.3, optimal_chip_thickness_mm: [0.03, 0.15], vc_range_carbide: [120, 280] },
    surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "low", work_hardened_depth_mm: 0.02, roughness_correction_factor: 1.15 },
    behavioral: { jobs_recorded: 1247, avg_tool_life_vs_predicted: 1.05, common_failure_modes: ["Flank wear at high speed", "Thermal cracking with flood coolant in milling"], community_insights: ["Sweet spot at Vc=180 for roughing", "Oil-based coolant gives 20% better tool life than water-based"], last_updated: "2026-02-01" },
  },
  {
    genome_id: "GEN-002", material_name: "304 Stainless Steel", family: "austenitic_stainless",
    designations: { AISI: "304", UNS: "S30400", DIN: "1.4301", EN: "X5CrNi18-10" },
    heat_treatment: "solution_aged", iso_group: "M",
    composition: { C: 0.05, Cr: 18.5, Ni: 9.0, Mn: 1.5, Si: 0.5, Fe: 70.5 },
    mechanical: { hardness_hrc: 20, hardness_hb: 187, tensile_mpa: 515, yield_mpa: 205, elongation_pct: 40 },
    thermal: { conductivity_w_mk: 16, specific_heat_j_kgk: 500, expansion_um_mk: 17.3, melting_point_c: 1400 },
    machinability: { kc1_1: 2200, mc: 0.25, taylor_C: 200, taylor_n: 0.20, chip_formation: "continuous", work_hardening_rate: 0.65, bue_tendency: 0.5, abrasiveness: 0.35, optimal_chip_thickness_mm: [0.04, 0.12], vc_range_carbide: [80, 180] },
    surface_integrity: { residual_stress_tendency: "tensile", white_layer_risk: "low", work_hardened_depth_mm: 0.08, roughness_correction_factor: 1.3 },
    behavioral: { jobs_recorded: 892, avg_tool_life_vs_predicted: 0.88, common_failure_modes: ["Notch wear from work hardening", "BUE at low speed", "Smeared surface finish"], community_insights: ["Never go below fz=0.04mm", "Climb milling only — conventional work-hardens the surface"], last_updated: "2026-01-28" },
  },
  {
    genome_id: "GEN-003", material_name: "7075-T6 Aluminum", family: "aluminum_alloy",
    designations: { AISI: "-", UNS: "A97075", DIN: "3.4365", EN: "AlZn5.5MgCu" },
    heat_treatment: "solution_aged", iso_group: "N",
    composition: { Al: 89.5, Zn: 5.6, Mg: 2.5, Cu: 1.6, Cr: 0.23, Si: 0.10, Fe: 0.15 },
    mechanical: { hardness_hrc: 5, hardness_hb: 150, tensile_mpa: 572, yield_mpa: 503, elongation_pct: 11 },
    thermal: { conductivity_w_mk: 130, specific_heat_j_kgk: 960, expansion_um_mk: 23.6, melting_point_c: 635 },
    machinability: { kc1_1: 700, mc: 0.25, taylor_C: 800, taylor_n: 0.35, chip_formation: "continuous", work_hardening_rate: 0.05, bue_tendency: 0.6, abrasiveness: 0.08, optimal_chip_thickness_mm: [0.05, 0.25], vc_range_carbide: [250, 600] },
    surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardened_depth_mm: 0.001, roughness_correction_factor: 1.05 },
    behavioral: { jobs_recorded: 2340, avg_tool_life_vs_predicted: 1.20, common_failure_modes: ["BUE at low speed", "Chip packing in deep pockets"], community_insights: ["DLC coating eliminates BUE completely", "Through-tool coolant essential for deep pockets"], last_updated: "2026-02-10" },
  },
  {
    genome_id: "GEN-004", material_name: "Ti-6Al-4V", family: "titanium_alloy",
    designations: { AISI: "-", UNS: "R56400", DIN: "3.7165", EN: "TiAl6V4" },
    heat_treatment: "annealed", iso_group: "S",
    composition: { Ti: 89.5, Al: 6.0, V: 4.0, Fe: 0.25, C: 0.08 },
    mechanical: { hardness_hrc: 36, hardness_hb: 334, tensile_mpa: 950, yield_mpa: 880, elongation_pct: 14, johnson_cook: { A: 1098, B: 1092, C: 0.014, n: 0.93, m: 1.1 } },
    thermal: { conductivity_w_mk: 6.7, specific_heat_j_kgk: 526, expansion_um_mk: 8.6, melting_point_c: 1660, white_layer_threshold_c: 550 },
    machinability: { kc1_1: 1700, mc: 0.23, taylor_C: 100, taylor_n: 0.15, chip_formation: "segmented", work_hardening_rate: 0.45, bue_tendency: 0.3, abrasiveness: 0.5, optimal_chip_thickness_mm: [0.04, 0.10], vc_range_carbide: [30, 80] },
    surface_integrity: { residual_stress_tendency: "tensile", white_layer_risk: "medium", work_hardened_depth_mm: 0.05, roughness_correction_factor: 1.4 },
    behavioral: { jobs_recorded: 456, avg_tool_life_vs_predicted: 0.82, common_failure_modes: ["Crater wear from diffusion", "Notch wear", "Chemical reaction with uncoated carbide"], community_insights: ["Through-tool coolant at 70 bar minimum", "AlTiN coating outperforms TiAlN by 30%", "Never exceed 60 m/min with carbide"], last_updated: "2026-02-05" },
  },
  {
    genome_id: "GEN-005", material_name: "Inconel 718", family: "nickel_superalloy",
    designations: { AISI: "-", UNS: "N07718", DIN: "2.4668", EN: "NiCr19NbMo" },
    heat_treatment: "solution_aged", iso_group: "S",
    composition: { Ni: 52.5, Cr: 19.0, Fe: 18.0, Nb: 5.1, Mo: 3.0, Ti: 0.9, Al: 0.5, Co: 0.5, C: 0.04 },
    mechanical: { hardness_hrc: 40, hardness_hb: 375, tensile_mpa: 1240, yield_mpa: 1030, elongation_pct: 12, johnson_cook: { A: 1241, B: 622, C: 0.0134, n: 0.6522, m: 1.3 } },
    thermal: { conductivity_w_mk: 11.4, specific_heat_j_kgk: 435, expansion_um_mk: 13.0, melting_point_c: 1336, white_layer_threshold_c: 600 },
    machinability: { kc1_1: 2800, mc: 0.25, taylor_C: 50, taylor_n: 0.12, chip_formation: "segmented", work_hardening_rate: 0.80, bue_tendency: 0.4, abrasiveness: 0.7, optimal_chip_thickness_mm: [0.03, 0.08], vc_range_carbide: [20, 60] },
    surface_integrity: { residual_stress_tendency: "tensile", white_layer_risk: "high", work_hardened_depth_mm: 0.12, roughness_correction_factor: 1.5 },
    behavioral: { jobs_recorded: 234, avg_tool_life_vs_predicted: 0.75, common_failure_modes: ["Crater wear (diffusion)", "Notch wear", "Plastic deformation of edge"], community_insights: ["Ceramic inserts at 200+ m/min for roughing", "Vary DOC by 15-20% between passes", "Never exceed Vc=50 with carbide for long tool life"], last_updated: "2026-02-12" },
  },
  {
    genome_id: "GEN-006", material_name: "Gray Cast Iron FC250", family: "cast_iron",
    designations: { AISI: "-", UNS: "F33800", DIN: "0.6025", EN: "EN-GJL-250" },
    heat_treatment: "as_cast", iso_group: "K",
    composition: { C: 3.3, Si: 2.0, Mn: 0.8, Fe: 93.5, S: 0.12, P: 0.08 },
    mechanical: { hardness_hrc: 22, hardness_hb: 210, tensile_mpa: 250, yield_mpa: 165, elongation_pct: 0.5 },
    thermal: { conductivity_w_mk: 46, specific_heat_j_kgk: 460, expansion_um_mk: 10.5, melting_point_c: 1175 },
    machinability: { kc1_1: 1200, mc: 0.26, taylor_C: 280, taylor_n: 0.28, chip_formation: "discontinuous", work_hardening_rate: 0.0, bue_tendency: 0.1, abrasiveness: 0.5, optimal_chip_thickness_mm: [0.05, 0.20], vc_range_carbide: [100, 300] },
    surface_integrity: { residual_stress_tendency: "neutral", white_layer_risk: "low", work_hardened_depth_mm: 0.0, roughness_correction_factor: 1.10 },
    behavioral: { jobs_recorded: 567, avg_tool_life_vs_predicted: 1.10, common_failure_modes: ["Flank wear from graphite abrasion", "Chipping on interrupted cuts"], community_insights: ["Always cut dry — coolant + cast iron dust = disaster", "Ceramic inserts excellent for high-speed finishing", "CBN for hardened CI above 45 HRC"], last_updated: "2026-01-20" },
  },
  {
    genome_id: "GEN-007", material_name: "17-4PH Stainless Steel", family: "precipitation_hardened_stainless",
    designations: { AISI: "630", UNS: "S17400", DIN: "1.4542", EN: "X5CrNiCuNb16-4" },
    heat_treatment: "solution_aged", iso_group: "M",
    composition: { C: 0.04, Cr: 16.5, Ni: 4.0, Cu: 3.5, Mn: 0.7, Si: 0.5, Nb: 0.3, Fe: 74.5 },
    mechanical: { hardness_hrc: 38, hardness_hb: 352, tensile_mpa: 1140, yield_mpa: 1000, elongation_pct: 12 },
    thermal: { conductivity_w_mk: 18, specific_heat_j_kgk: 460, expansion_um_mk: 10.8, melting_point_c: 1440 },
    machinability: { kc1_1: 2500, mc: 0.25, taylor_C: 120, taylor_n: 0.17, chip_formation: "continuous", work_hardening_rate: 0.40, bue_tendency: 0.35, abrasiveness: 0.45, optimal_chip_thickness_mm: [0.04, 0.10], vc_range_carbide: [60, 140] },
    surface_integrity: { residual_stress_tendency: "tensile", white_layer_risk: "medium", work_hardened_depth_mm: 0.05, roughness_correction_factor: 1.35 },
    behavioral: { jobs_recorded: 189, avg_tool_life_vs_predicted: 0.90, common_failure_modes: ["Notch wear", "BUE at low speed", "Chip packing in drills"], community_insights: ["Run 20% slower than 304 baseline", "4-flute preferred over 3-flute", "Parabolic flute drills mandatory — standard flutes pack and snap"], last_updated: "2026-02-08" },
  },
  {
    genome_id: "GEN-008", material_name: "6061-T6 Aluminum", family: "aluminum_alloy",
    designations: { AISI: "-", UNS: "A96061", DIN: "3.3211", EN: "AlMg1SiCu" },
    heat_treatment: "solution_aged", iso_group: "N",
    composition: { Al: 97.0, Mg: 1.0, Si: 0.6, Cu: 0.28, Cr: 0.2, Fe: 0.35 },
    mechanical: { hardness_hrc: 3, hardness_hb: 95, tensile_mpa: 310, yield_mpa: 276, elongation_pct: 17 },
    thermal: { conductivity_w_mk: 167, specific_heat_j_kgk: 897, expansion_um_mk: 23.6, melting_point_c: 652 },
    machinability: { kc1_1: 600, mc: 0.25, taylor_C: 900, taylor_n: 0.40, chip_formation: "continuous", work_hardening_rate: 0.02, bue_tendency: 0.7, abrasiveness: 0.05, optimal_chip_thickness_mm: [0.05, 0.30], vc_range_carbide: [300, 800] },
    surface_integrity: { residual_stress_tendency: "compressive", white_layer_risk: "none", work_hardened_depth_mm: 0.001, roughness_correction_factor: 1.02 },
    behavioral: { jobs_recorded: 3100, avg_tool_life_vs_predicted: 1.25, common_failure_modes: ["BUE at low speed", "Chip welding to flutes"], community_insights: ["DLC coating is the gold standard", "MQL better than flood for most operations", "3-flute with polished rake face eliminates BUE"], last_updated: "2026-02-15" },
  },
];

// ─── State ───────────────────────────────────────────────────────────────────

let predictionCounter = 0;
const predictionHistory: GenomePrediction[] = [];

// ─── Functions ───────────────────────────────────────────────────────────────

function findGenome(params: Record<string, any>): GenomeRecord | undefined {
  const id = params.genome_id ?? params.id;
  if (id) return GENOME_DB.find(g => g.genome_id === id);
  const name = (params.material ?? params.material_name ?? "").toLowerCase();
  return GENOME_DB.find(g =>
    g.material_name.toLowerCase().includes(name) ||
    Object.values(g.designations).some(d => d.toLowerCase() === name)
  );
}

function predictParameters(params: Record<string, any>): GenomePrediction {
  predictionCounter++;
  const id = `GP-${String(predictionCounter).padStart(4, "0")}`;
  const genome = findGenome(params);
  if (!genome) {
    return {
      prediction_id: id, genome_id: "unknown", material: params.material ?? "unknown",
      condition: "unknown", recommended_vc: 0, recommended_fz: 0, recommended_ap_max: 0,
      predicted_tool_life_min: 0, confidence_pct: 0, basis: "Material not found in genome database",
      adjustments: [],
    };
  }

  const tool_diameter = params.tool_diameter_mm ?? 10;
  const flutes = params.flutes ?? 4;
  const hardness = params.hardness_hrc ?? genome.mechanical.hardness_hrc;

  // Hardness adjustment factor
  const hardnessRatio = genome.mechanical.hardness_hrc / Math.max(1, hardness);
  const hardnessAdj = Math.pow(hardnessRatio, 0.3); // softer batch = can go faster

  // Base recommendations from genome
  const vc_mid = (genome.machinability.vc_range_carbide[0] + genome.machinability.vc_range_carbide[1]) / 2;
  const recommended_vc = Math.round(vc_mid * hardnessAdj);
  const fz_mid = (genome.machinability.optimal_chip_thickness_mm[0] + genome.machinability.optimal_chip_thickness_mm[1]) / 2;
  const recommended_fz = Math.round(fz_mid * 1000) / 1000;
  const recommended_ap_max = tool_diameter * 0.5; // conservative: half diameter

  // Tool life prediction from Taylor
  const predicted_tool_life = Math.round(genome.machinability.taylor_C * Math.pow(recommended_vc, -1 / genome.machinability.taylor_n) * genome.behavioral.avg_tool_life_vs_predicted);

  // Confidence based on jobs recorded
  const confidence = Math.min(95, 50 + Math.log10(genome.behavioral.jobs_recorded + 1) * 15);

  const adjustments: string[] = [];
  if (hardness !== genome.mechanical.hardness_hrc) {
    adjustments.push(`Hardness adjusted: ${hardness} HRC vs genome baseline ${genome.mechanical.hardness_hrc} HRC`);
  }
  if (genome.machinability.work_hardening_rate > 0.3) {
    adjustments.push(`Work-hardening material: maintain fz ≥ ${genome.machinability.optimal_chip_thickness_mm[0]}mm to stay under hardened layer`);
  }
  if (genome.machinability.bue_tendency > 0.5) {
    adjustments.push(`High BUE tendency: ensure Vc ≥ ${genome.machinability.vc_range_carbide[0]} m/min to prevent built-up edge`);
  }

  const prediction: GenomePrediction = {
    prediction_id: id, genome_id: genome.genome_id, material: genome.material_name,
    condition: `${genome.heat_treatment}, ${hardness} HRC`,
    recommended_vc, recommended_fz, recommended_ap_max,
    predicted_tool_life_min: Math.max(1, predicted_tool_life),
    confidence_pct: Math.round(confidence),
    basis: `Genome model based on ${genome.behavioral.jobs_recorded} recorded jobs + Taylor equation (C=${genome.machinability.taylor_C}, n=${genome.machinability.taylor_n})`,
    adjustments,
  };

  predictionHistory.push(prediction);
  return prediction;
}

function findSimilarMaterials(params: Record<string, any>): SimilarityResult[] {
  const genome = findGenome(params);
  if (!genome) return [];

  return GENOME_DB
    .filter(g => g.genome_id !== genome.genome_id)
    .map(g => {
      let score = 0;
      const matching: string[] = [];
      const differences: string[] = [];

      // ISO group match (high weight)
      if (g.iso_group === genome.iso_group) { score += 0.25; matching.push("ISO group"); }
      else differences.push(`ISO group: ${g.iso_group} vs ${genome.iso_group}`);

      // Family match
      if (g.family === genome.family) { score += 0.20; matching.push("Material family"); }
      else differences.push(`Family: ${g.family} vs ${genome.family}`);

      // Hardness similarity (within 20%)
      const hDiff = Math.abs(g.mechanical.hardness_hrc - genome.mechanical.hardness_hrc) / Math.max(1, genome.mechanical.hardness_hrc);
      if (hDiff < 0.2) { score += 0.15; matching.push("Hardness"); }
      else differences.push(`Hardness: ${g.mechanical.hardness_hrc} vs ${genome.mechanical.hardness_hrc} HRC`);

      // Thermal conductivity similarity (within 50%)
      const tDiff = Math.abs(g.thermal.conductivity_w_mk - genome.thermal.conductivity_w_mk) / genome.thermal.conductivity_w_mk;
      if (tDiff < 0.5) { score += 0.15; matching.push("Thermal conductivity"); }
      else differences.push(`Conductivity: ${g.thermal.conductivity_w_mk} vs ${genome.thermal.conductivity_w_mk} W/m·K`);

      // Chip formation match
      if (g.machinability.chip_formation === genome.machinability.chip_formation) { score += 0.10; matching.push("Chip formation"); }

      // Work hardening similarity
      const whDiff = Math.abs(g.machinability.work_hardening_rate - genome.machinability.work_hardening_rate);
      if (whDiff < 0.2) { score += 0.10; matching.push("Work hardening behavior"); }

      // Cutting force similarity
      const kcDiff = Math.abs(g.machinability.kc1_1 - genome.machinability.kc1_1) / genome.machinability.kc1_1;
      if (kcDiff < 0.3) { score += 0.05; matching.push("Cutting force (Kc)"); }

      return { genome_id: g.genome_id, material: g.material_name, similarity_score: Math.round(score * 100) / 100, matching_properties: matching, differences };
    })
    .sort((a, b) => b.similarity_score - a.similarity_score);
}

function compareGenomes(params: Record<string, any>): any {
  const a = findGenome({ material: params.material_a ?? params.a });
  const b = findGenome({ material: params.material_b ?? params.b });
  if (!a || !b) return { error: "One or both materials not found" };

  return {
    a: { genome_id: a.genome_id, material: a.material_name, iso_group: a.iso_group },
    b: { genome_id: b.genome_id, material: b.material_name, iso_group: b.iso_group },
    comparison: {
      hardness: { a: a.mechanical.hardness_hrc, b: b.mechanical.hardness_hrc, unit: "HRC" },
      tensile: { a: a.mechanical.tensile_mpa, b: b.mechanical.tensile_mpa, unit: "MPa" },
      conductivity: { a: a.thermal.conductivity_w_mk, b: b.thermal.conductivity_w_mk, unit: "W/m·K" },
      kc1_1: { a: a.machinability.kc1_1, b: b.machinability.kc1_1, unit: "N/mm²" },
      vc_range: { a: a.machinability.vc_range_carbide, b: b.machinability.vc_range_carbide, unit: "m/min" },
      work_hardening: { a: a.machinability.work_hardening_rate, b: b.machinability.work_hardening_rate },
      bue_tendency: { a: a.machinability.bue_tendency, b: b.machinability.bue_tendency },
      chip_formation: { a: a.machinability.chip_formation, b: b.machinability.chip_formation },
    },
    machinability_winner: a.machinability.kc1_1 < b.machinability.kc1_1 ? a.material_name : b.material_name,
    easier_to_machine: a.machinability.taylor_C > b.machinability.taylor_C ? a.material_name : b.material_name,
  };
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

/**
 * Actions:
 *   genome_lookup      — Look up a genome record by material name or ID
 *   genome_predict     — Predict parameters from genome + conditions
 *   genome_similar     — Find materials with similar machinability
 *   genome_compare     — Compare two material genomes head-to-head
 *   genome_list        — List all genome records
 *   genome_fingerprint — Get specific fingerprint (mechanical/thermal/machinability)
 *   genome_behavioral  — Get behavioral patterns (community insights, job data)
 *   genome_search      — Search genomes by property range
 *   genome_history     — Get prediction history
 *   genome_get         — Get specific prediction by ID
 */
export function manufacturingGenome(action: string, params: Record<string, any>): any {
  switch (action) {
    case "genome_lookup": {
      const genome = findGenome(params);
      if (!genome) return { error: "Material not found in genome database", query: params.material ?? params.genome_id };
      return genome;
    }

    case "genome_predict":
      return predictParameters(params);

    case "genome_similar": {
      const results = findSimilarMaterials(params);
      return { query_material: params.material, similar: results, total: results.length };
    }

    case "genome_compare":
      return compareGenomes(params);

    case "genome_list":
      return {
        genomes: GENOME_DB.map(g => ({
          genome_id: g.genome_id, material: g.material_name, family: g.family,
          iso_group: g.iso_group, hardness_hrc: g.mechanical.hardness_hrc,
          vc_range: g.machinability.vc_range_carbide, jobs: g.behavioral.jobs_recorded,
        })),
        total: GENOME_DB.length,
      };

    case "genome_fingerprint": {
      const genome = findGenome(params);
      if (!genome) return { error: "Material not found" };
      const fp = params.fingerprint ?? params.type ?? "machinability";
      switch (fp) {
        case "mechanical": return { genome_id: genome.genome_id, material: genome.material_name, ...genome.mechanical };
        case "thermal": return { genome_id: genome.genome_id, material: genome.material_name, ...genome.thermal };
        case "machinability": return { genome_id: genome.genome_id, material: genome.material_name, ...genome.machinability };
        case "surface_integrity": return { genome_id: genome.genome_id, material: genome.material_name, ...genome.surface_integrity };
        default: return { error: `Unknown fingerprint type: ${fp}` };
      }
    }

    case "genome_behavioral": {
      const genome = findGenome(params);
      if (!genome) return { error: "Material not found" };
      return { genome_id: genome.genome_id, material: genome.material_name, ...genome.behavioral };
    }

    case "genome_search": {
      const minHardness = params.min_hardness ?? 0;
      const maxHardness = params.max_hardness ?? 100;
      const isoGroup = params.iso_group;
      const family = params.family;

      let filtered = GENOME_DB.filter(g =>
        g.mechanical.hardness_hrc >= minHardness &&
        g.mechanical.hardness_hrc <= maxHardness
      );
      if (isoGroup) filtered = filtered.filter(g => g.iso_group === isoGroup);
      if (family) filtered = filtered.filter(g => g.family.includes(family));

      return {
        results: filtered.map(g => ({ genome_id: g.genome_id, material: g.material_name, hardness_hrc: g.mechanical.hardness_hrc, iso_group: g.iso_group, family: g.family })),
        total: filtered.length,
      };
    }

    case "genome_history":
      return {
        predictions: predictionHistory,
        total: predictionHistory.length,
      };

    case "genome_get": {
      const id = params.prediction_id ?? params.id ?? "";
      const prediction = predictionHistory.find(p => p.prediction_id === id);
      if (!prediction) return { error: "Prediction not found", id };
      return prediction;
    }

    default:
      return { error: `ManufacturingGenomeEngine: unknown action "${action}"` };
  }
}
