/**
 * AlgorithmSelectorEngine — Auto-select best novel algorithm per zone
 * ====================================================================
 * Decision engine that maps (zone_type, material, machine_capability, priority)
 * → best novel algorithm from all 24. Uses multi-criteria scoring matrix:
 *   - physics_match: Kienzle/thermal/vibration applicability
 *   - geometry_fit: zone type → algorithm affinity
 *   - material_fit: material class → algorithm suitability
 *   - objective_fit: user priority → algorithm strength
 *
 * Returns ranked list with confidence scores (0-100).
 *
 * References:
 * - Kienzle cutting force model applicability [Kienzle & Victor, 1957]
 * - Stability lobe theory for chatter avoidance [Altintas, 2012]
 * - Thermal gradient analysis [Jaeger, 1942]
 *
 * @module engines/AlgorithmSelectorEngine
 * @version 1.0.0
 * @milestone CAMK-MS0/U02
 */

import type { ZoneType } from "./FeatureToZoneEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** All 24 novel algorithms */
export type NovelAlgorithmId =
  // Base 6
  | "TGAR" | "HRAF" | "MTHZD" | "CFSF" | "PTDC" | "VCER"
  // Extended 12
  | "MEGM" | "RSMP" | "WHAP" | "BOPA" | "MCTP" | "SFCR"
  | "KALP" | "PTAP" | "PARETO" | "CFCM" | "WBRL" | "DPLS"
  // Cross-CAM 6
  | "AMEF" | "VCMR" | "SNWF" | "EAPR" | "HBCF" | "MACS";

/** Material class for algorithm selection */
export type MaterialClass =
  | "aluminum" | "mild_steel" | "stainless_steel" | "tool_steel"
  | "titanium" | "nickel_alloy" | "cast_iron" | "copper"
  | "hardened_steel" | "composite" | "plastic" | "unknown";

/** Machine capability descriptor */
export interface MachineCapabilityInput {
  axes: 3 | 4 | 5;
  max_rpm: number;
  max_feed_mmmin: number;
  has_through_spindle_coolant?: boolean;
  has_high_pressure_coolant?: boolean;
  spindle_power_kw?: number;
  rigidity?: "low" | "medium" | "high";
}

/** User optimization priority */
export type OptimizationPriority =
  | "speed" | "quality" | "tool_life" | "balanced"
  | "cost" | "reliability" | "surface_finish";

/** Selection input */
export interface AlgorithmSelectionInput {
  zone_type: ZoneType;
  material: string;
  machine?: MachineCapabilityInput;
  priority?: OptimizationPriority;
  /** Depth-to-diameter ratio (for deep features) */
  depth_ratio?: number;
  /** Wall thickness (for thin features) */
  wall_thickness_mm?: number;
  /** Target surface roughness */
  target_ra_um?: number;
}

/** Scored algorithm recommendation */
export interface AlgorithmRecommendation {
  algorithm: NovelAlgorithmId;
  score: number; // 0-100
  confidence: number; // 0-100
  reasons: string[];
  /** Score breakdown */
  breakdown: {
    geometry_fit: number;
    material_fit: number;
    physics_match: number;
    objective_fit: number;
    machine_fit: number;
  };
}

/** Selection result */
export interface AlgorithmSelectionResult {
  top_3: AlgorithmRecommendation[];
  all_ranked: AlgorithmRecommendation[];
  zone_type: ZoneType;
  material_class: MaterialClass;
  selection_criteria: string;
}

// ============================================================================
// SCORING MATRICES
// ============================================================================

/**
 * Geometry fit: how well each algorithm handles each zone type (0-100)
 * Based on algorithm design purpose and physics applicability
 */
const GEOMETRY_SCORES: Record<NovelAlgorithmId, Partial<Record<ZoneType, number>>> = {
  // Base algorithms
  TGAR:   { pocket: 95, flat: 60, steep_wall: 40, freeform: 30, corner: 50, rib: 30, hole: 20, boss: 40, shallow: 50, undercut: 20 },
  HRAF:   { steep_wall: 95, freeform: 85, boss: 80, shallow: 70, flat: 50, pocket: 30, corner: 40, rib: 60, hole: 20, undercut: 30 },
  MTHZD:  { pocket: 70, freeform: 80, steep_wall: 75, flat: 60, corner: 65, rib: 55, boss: 60, shallow: 70, hole: 30, undercut: 60 },
  CFSF:   { freeform: 95, shallow: 90, flat: 85, steep_wall: 60, boss: 70, pocket: 40, corner: 55, rib: 50, hole: 20, undercut: 30 },
  PTDC:   { steep_wall: 90, rib: 95, corner: 85, freeform: 70, boss: 65, shallow: 60, flat: 40, pocket: 50, hole: 30, undercut: 40 },
  VCER:   { pocket: 90, hole: 95, corner: 60, flat: 30, steep_wall: 40, freeform: 20, rib: 30, boss: 25, shallow: 20, undercut: 50 },
  // Extended algorithms
  MEGM:   { pocket: 85, flat: 80, shallow: 70, freeform: 60, steep_wall: 50, corner: 55, rib: 45, boss: 50, hole: 30, undercut: 35 },
  RSMP:   { freeform: 75, steep_wall: 80, boss: 70, shallow: 65, flat: 50, pocket: 40, corner: 45, rib: 60, hole: 20, undercut: 40 },
  WHAP:   { steep_wall: 85, rib: 80, freeform: 70, boss: 65, pocket: 60, corner: 55, shallow: 50, flat: 40, hole: 30, undercut: 45 },
  BOPA:   { pocket: 75, freeform: 70, flat: 65, steep_wall: 60, shallow: 60, corner: 55, boss: 55, rib: 50, hole: 40, undercut: 40 },
  MCTP:   { pocket: 80, hole: 75, flat: 70, boss: 60, corner: 65, steep_wall: 55, freeform: 50, rib: 45, shallow: 50, undercut: 40 },
  SFCR:   { freeform: 90, shallow: 85, flat: 75, steep_wall: 60, boss: 55, pocket: 40, corner: 45, rib: 40, hole: 20, undercut: 30 },
  KALP:   { pocket: 70, freeform: 65, flat: 60, steep_wall: 60, shallow: 55, corner: 55, boss: 50, rib: 50, hole: 40, undercut: 35 },
  PTAP:   { steep_wall: 85, freeform: 80, boss: 75, shallow: 70, rib: 65, flat: 50, pocket: 45, corner: 55, hole: 30, undercut: 40 },
  PARETO: { pocket: 70, freeform: 70, flat: 65, steep_wall: 65, shallow: 65, boss: 60, corner: 60, rib: 55, hole: 45, undercut: 45 },
  CFCM:   { pocket: 60, hole: 55, flat: 50, freeform: 45, steep_wall: 40, shallow: 45, corner: 50, boss: 40, rib: 35, undercut: 30 },
  WBRL:   { pocket: 65, freeform: 60, flat: 60, steep_wall: 55, shallow: 55, boss: 50, corner: 50, rib: 50, hole: 45, undercut: 40 },
  DPLS:   { pocket: 90, flat: 70, steep_wall: 65, corner: 60, freeform: 50, shallow: 55, boss: 45, rib: 55, hole: 40, undercut: 35 },
  // Cross-CAM algorithms
  AMEF:   { freeform: 90, shallow: 85, flat: 80, steep_wall: 65, boss: 60, pocket: 50, corner: 55, rib: 45, hole: 25, undercut: 35 },
  VCMR:   { pocket: 85, flat: 75, steep_wall: 65, freeform: 60, shallow: 60, boss: 55, corner: 60, rib: 50, hole: 40, undercut: 45 },
  SNWF:   { freeform: 85, shallow: 80, steep_wall: 75, flat: 60, boss: 65, pocket: 45, corner: 50, rib: 55, hole: 30, undercut: 40 },
  EAPR:   { pocket: 80, steep_wall: 70, flat: 65, freeform: 60, corner: 70, shallow: 55, boss: 50, rib: 55, hole: 35, undercut: 45 },
  HBCF:   { pocket: 75, hole: 80, corner: 70, steep_wall: 55, flat: 50, freeform: 45, shallow: 45, boss: 40, rib: 40, undercut: 50 },
  MACS:   { freeform: 85, steep_wall: 90, undercut: 85, boss: 75, shallow: 70, pocket: 55, corner: 60, rib: 65, flat: 45, hole: 30 },
};

/**
 * Material fit: algorithm suitability per material class (0-100)
 */
const MATERIAL_SCORES: Record<NovelAlgorithmId, Partial<Record<MaterialClass, number>>> = {
  TGAR:   { aluminum: 90, mild_steel: 85, stainless_steel: 75, titanium: 80, tool_steel: 70, nickel_alloy: 75, cast_iron: 80, hardened_steel: 60, copper: 85, composite: 50, plastic: 70 },
  HRAF:   { aluminum: 85, mild_steel: 80, stainless_steel: 85, titanium: 90, tool_steel: 85, nickel_alloy: 90, cast_iron: 70, hardened_steel: 80, copper: 75, composite: 60, plastic: 50 },
  MTHZD:  { aluminum: 80, mild_steel: 80, stainless_steel: 80, titanium: 80, tool_steel: 80, nickel_alloy: 80, cast_iron: 80, hardened_steel: 75, copper: 80, composite: 75, plastic: 75 },
  CFSF:   { aluminum: 85, mild_steel: 80, stainless_steel: 80, titanium: 85, tool_steel: 80, nickel_alloy: 85, cast_iron: 70, hardened_steel: 75, copper: 80, composite: 65, plastic: 60 },
  PTDC:   { aluminum: 70, mild_steel: 80, stainless_steel: 85, titanium: 90, tool_steel: 85, nickel_alloy: 90, cast_iron: 65, hardened_steel: 80, copper: 70, composite: 60, plastic: 50 },
  VCER:   { aluminum: 90, mild_steel: 85, stainless_steel: 75, titanium: 70, tool_steel: 70, nickel_alloy: 65, cast_iron: 80, hardened_steel: 55, copper: 85, composite: 60, plastic: 80 },
  MEGM:   { aluminum: 85, mild_steel: 80, stainless_steel: 80, titanium: 85, tool_steel: 75, nickel_alloy: 80, cast_iron: 75, hardened_steel: 70, copper: 80, composite: 60, plastic: 65 },
  RSMP:   { aluminum: 70, mild_steel: 75, stainless_steel: 85, titanium: 85, tool_steel: 80, nickel_alloy: 90, cast_iron: 65, hardened_steel: 85, copper: 65, composite: 55, plastic: 45 },
  WHAP:   { aluminum: 65, mild_steel: 70, stainless_steel: 85, titanium: 95, tool_steel: 85, nickel_alloy: 90, cast_iron: 60, hardened_steel: 90, copper: 60, composite: 50, plastic: 40 },
  BOPA:   { aluminum: 80, mild_steel: 80, stainless_steel: 80, titanium: 80, tool_steel: 80, nickel_alloy: 80, cast_iron: 80, hardened_steel: 80, copper: 80, composite: 75, plastic: 75 },
  MCTP:   { aluminum: 85, mild_steel: 80, stainless_steel: 80, titanium: 80, tool_steel: 80, nickel_alloy: 75, cast_iron: 80, hardened_steel: 75, copper: 80, composite: 70, plastic: 70 },
  SFCR:   { aluminum: 80, mild_steel: 80, stainless_steel: 75, titanium: 75, tool_steel: 75, nickel_alloy: 75, cast_iron: 70, hardened_steel: 70, copper: 75, composite: 65, plastic: 60 },
  KALP:   { aluminum: 80, mild_steel: 80, stainless_steel: 80, titanium: 85, tool_steel: 80, nickel_alloy: 85, cast_iron: 75, hardened_steel: 80, copper: 80, composite: 70, plastic: 65 },
  PTAP:   { aluminum: 70, mild_steel: 75, stainless_steel: 80, titanium: 90, tool_steel: 85, nickel_alloy: 90, cast_iron: 65, hardened_steel: 90, copper: 65, composite: 55, plastic: 45 },
  PARETO: { aluminum: 80, mild_steel: 80, stainless_steel: 80, titanium: 80, tool_steel: 80, nickel_alloy: 80, cast_iron: 80, hardened_steel: 80, copper: 80, composite: 75, plastic: 75 },
  CFCM:   { aluminum: 95, mild_steel: 60, stainless_steel: 55, titanium: 50, tool_steel: 50, nickel_alloy: 45, cast_iron: 55, hardened_steel: 40, copper: 90, composite: 65, plastic: 85 },
  WBRL:   { aluminum: 80, mild_steel: 80, stainless_steel: 80, titanium: 80, tool_steel: 80, nickel_alloy: 80, cast_iron: 80, hardened_steel: 80, copper: 80, composite: 75, plastic: 75 },
  DPLS:   { aluminum: 85, mild_steel: 85, stainless_steel: 80, titanium: 80, tool_steel: 80, nickel_alloy: 75, cast_iron: 85, hardened_steel: 75, copper: 85, composite: 70, plastic: 75 },
  AMEF:   { aluminum: 85, mild_steel: 80, stainless_steel: 80, titanium: 80, tool_steel: 80, nickel_alloy: 80, cast_iron: 75, hardened_steel: 75, copper: 80, composite: 70, plastic: 65 },
  VCMR:   { aluminum: 90, mild_steel: 85, stainless_steel: 80, titanium: 80, tool_steel: 80, nickel_alloy: 75, cast_iron: 85, hardened_steel: 70, copper: 85, composite: 65, plastic: 75 },
  SNWF:   { aluminum: 85, mild_steel: 80, stainless_steel: 80, titanium: 85, tool_steel: 80, nickel_alloy: 85, cast_iron: 75, hardened_steel: 75, copper: 80, composite: 70, plastic: 60 },
  EAPR:   { aluminum: 85, mild_steel: 85, stainless_steel: 80, titanium: 80, tool_steel: 80, nickel_alloy: 80, cast_iron: 80, hardened_steel: 75, copper: 80, composite: 70, plastic: 70 },
  HBCF:   { aluminum: 80, mild_steel: 80, stainless_steel: 80, titanium: 75, tool_steel: 75, nickel_alloy: 75, cast_iron: 80, hardened_steel: 70, copper: 80, composite: 65, plastic: 70 },
  MACS:   { aluminum: 80, mild_steel: 80, stainless_steel: 85, titanium: 90, tool_steel: 85, nickel_alloy: 90, cast_iron: 75, hardened_steel: 80, copper: 75, composite: 70, plastic: 55 },
};

/**
 * Objective fit: algorithm strength per optimization priority (0-100)
 */
const OBJECTIVE_SCORES: Record<NovelAlgorithmId, Partial<Record<OptimizationPriority, number>>> = {
  TGAR:   { speed: 60, quality: 70, tool_life: 85, balanced: 75, cost: 80, reliability: 75, surface_finish: 60 },
  HRAF:   { speed: 70, quality: 90, tool_life: 80, balanced: 80, cost: 65, reliability: 85, surface_finish: 95 },
  MTHZD:  { speed: 85, quality: 75, tool_life: 70, balanced: 80, cost: 80, reliability: 75, surface_finish: 70 },
  CFSF:   { speed: 70, quality: 90, tool_life: 85, balanced: 85, cost: 70, reliability: 85, surface_finish: 95 },
  PTDC:   { speed: 65, quality: 95, tool_life: 70, balanced: 75, cost: 60, reliability: 80, surface_finish: 90 },
  VCER:   { speed: 90, quality: 60, tool_life: 75, balanced: 75, cost: 85, reliability: 80, surface_finish: 50 },
  MEGM:   { speed: 80, quality: 70, tool_life: 90, balanced: 80, cost: 85, reliability: 85, surface_finish: 65 },
  RSMP:   { speed: 55, quality: 85, tool_life: 70, balanced: 70, cost: 55, reliability: 70, surface_finish: 90 },
  WHAP:   { speed: 60, quality: 80, tool_life: 90, balanced: 80, cost: 75, reliability: 85, surface_finish: 75 },
  BOPA:   { speed: 70, quality: 80, tool_life: 80, balanced: 85, cost: 75, reliability: 90, surface_finish: 75 },
  MCTP:   { speed: 65, quality: 90, tool_life: 70, balanced: 75, cost: 60, reliability: 80, surface_finish: 80 },
  SFCR:   { speed: 75, quality: 85, tool_life: 70, balanced: 80, cost: 70, reliability: 75, surface_finish: 85 },
  KALP:   { speed: 70, quality: 85, tool_life: 80, balanced: 85, cost: 75, reliability: 90, surface_finish: 80 },
  PTAP:   { speed: 55, quality: 80, tool_life: 90, balanced: 75, cost: 70, reliability: 85, surface_finish: 80 },
  PARETO: { speed: 80, quality: 80, tool_life: 80, balanced: 95, cost: 80, reliability: 80, surface_finish: 80 },
  CFCM:   { speed: 95, quality: 60, tool_life: 65, balanced: 70, cost: 85, reliability: 70, surface_finish: 55 },
  WBRL:   { speed: 65, quality: 70, tool_life: 95, balanced: 75, cost: 80, reliability: 95, surface_finish: 65 },
  DPLS:   { speed: 95, quality: 65, tool_life: 80, balanced: 80, cost: 90, reliability: 80, surface_finish: 60 },
  AMEF:   { speed: 75, quality: 90, tool_life: 80, balanced: 85, cost: 70, reliability: 80, surface_finish: 90 },
  VCMR:   { speed: 90, quality: 75, tool_life: 80, balanced: 85, cost: 85, reliability: 80, surface_finish: 70 },
  SNWF:   { speed: 70, quality: 85, tool_life: 80, balanced: 80, cost: 70, reliability: 80, surface_finish: 90 },
  EAPR:   { speed: 85, quality: 80, tool_life: 75, balanced: 85, cost: 80, reliability: 80, surface_finish: 75 },
  HBCF:   { speed: 80, quality: 75, tool_life: 80, balanced: 80, cost: 80, reliability: 85, surface_finish: 70 },
  MACS:   { speed: 75, quality: 90, tool_life: 85, balanced: 85, cost: 70, reliability: 85, surface_finish: 90 },
};

/** All algorithm IDs */
const ALL_ALGORITHMS: NovelAlgorithmId[] = [
  "TGAR", "HRAF", "MTHZD", "CFSF", "PTDC", "VCER",
  "MEGM", "RSMP", "WHAP", "BOPA", "MCTP", "SFCR",
  "KALP", "PTAP", "PARETO", "CFCM", "WBRL", "DPLS",
  "AMEF", "VCMR", "SNWF", "EAPR", "HBCF", "MACS",
];

// ============================================================================
// MATERIAL CLASSIFICATION
// ============================================================================

/** Map common material strings to material classes */
function classifyMaterial(material: string): MaterialClass {
  const m = material.toLowerCase().replace(/[-_\s]/g, "");
  // Titanium BEFORE aluminum — "ti6al4v" contains "al" which would false-match aluminum
  if (/titanium|ti6al|ti64|grade5/.test(m)) return "titanium";
  if (/inconel|hastelloy|waspaloy|nimonic|nickel/.test(m)) return "nickel_alloy";
  if (/alum|6061|7075|2024|al\d/.test(m)) return "aluminum";
  if (/stainless|304|316|17.?4|austenitic|duplex/.test(m)) return "stainless_steel";
  if (/harden|hrc[456]|d2|a2|s7|h13|m2/.test(m)) return "hardened_steel";
  if (/tool.?steel|p20|4340|4140|o1/.test(m)) return "tool_steel";
  if (/cast.?iron|ductile|gray|grey|sgr|fcd/.test(m)) return "cast_iron";
  if (/copper|brass|bronze|cu/.test(m)) return "copper";
  if (/composite|cfrp|gfrp|carbon.?fiber|fiberglass/.test(m)) return "composite";
  if (/1018|1045|4130|mild|carbon|low.?alloy|structural/.test(m)) return "mild_steel";
  if (/plastic|nylon|peek|delrin|acetal|pom|abs|pvc/.test(m)) return "plastic";
  // Default: check for generic "steel"
  if (/steel/.test(m)) return "mild_steel";
  return "unknown";
}

// ============================================================================
// SCORING ENGINE
// ============================================================================

/**
 * Score a single algorithm against selection criteria
 */
function scoreAlgorithm(
  algo: NovelAlgorithmId,
  input: AlgorithmSelectionInput,
  matClass: MaterialClass
): AlgorithmRecommendation {
  const priority = input.priority ?? "balanced";
  const reasons: string[] = [];

  // 1. Geometry fit (weight: 0.30)
  const geoScore = GEOMETRY_SCORES[algo]?.[input.zone_type] ?? 50;
  if (geoScore >= 85) reasons.push(`Excellent geometry match for ${input.zone_type}`);

  // 2. Material fit (weight: 0.25)
  const matScore = MATERIAL_SCORES[algo]?.[matClass] ?? 60;
  if (matScore >= 85) reasons.push(`Strong material fit for ${matClass}`);

  // 3. Physics match (weight: 0.20) — derived from contextual factors
  let physScore = 60; // base
  // Deep pocket → VCER/DPLS physics advantage
  if (input.depth_ratio && input.depth_ratio > 3) {
    if (algo === "VCER") { physScore = 95; reasons.push("Vortex chip evacuation ideal for deep features"); }
    else if (algo === "DPLS") { physScore = 90; reasons.push("Dynamic programming optimizes deep layer sequence"); }
    else if (algo === "TGAR") { physScore = 80; reasons.push("Thermal gradient management for deep roughing"); }
    else physScore = Math.max(40, physScore - (input.depth_ratio - 3) * 5);
  }
  // Thin wall → PTDC physics advantage
  if (input.wall_thickness_mm && input.wall_thickness_mm < 3) {
    if (algo === "PTDC") { physScore = 95; reasons.push("Deflection compensation critical for thin walls"); }
    else if (algo === "WHAP") { physScore = 85; reasons.push("Work hardening awareness for thin features"); }
    else if (algo === "KALP") { physScore = 80; reasons.push("Kalman filter tracks deflection in thin walls"); }
  }
  // Fine surface finish → HRAF/CFSF/AMEF physics advantage
  if (input.target_ra_um && input.target_ra_um < 0.8) {
    if (algo === "HRAF") { physScore = 95; reasons.push("Harmonic avoidance eliminates vibration marks"); }
    else if (algo === "CFSF") { physScore = 90; reasons.push("Constant force prevents force-induced roughness"); }
    else if (algo === "AMEF") { physScore = 85; reasons.push("Morphed engagement ensures uniform chip load"); }
    else if (algo === "SFCR") { physScore = 85; reasons.push("Space-filling curves maintain uniform coverage"); }
  }

  // 4. Objective fit (weight: 0.15)
  const objScore = OBJECTIVE_SCORES[algo]?.[priority] ?? 60;
  if (objScore >= 90) reasons.push(`Top-tier for ${priority} optimization`);

  // 5. Machine fit (weight: 0.10) — penalize 5-axis algorithms on 3-axis machines
  let machScore = 70; // base
  if (input.machine) {
    const axes = input.machine.axes;
    const fiveAxisAlgos = new Set<NovelAlgorithmId>(["MACS", "SNWF", "PTDC", "MTHZD"]);
    if (axes < 5 && fiveAxisAlgos.has(algo)) {
      machScore = 30;
      reasons.push("Reduced: needs 5-axis capability");
    } else if (axes === 5) {
      machScore = fiveAxisAlgos.has(algo) ? 95 : 75;
    }
    // High RPM → CFCM/HRAF advantage
    if (input.machine.max_rpm >= 15000) {
      if (algo === "CFCM") { machScore = 95; reasons.push("High-speed spindle enables centrifugal force model"); }
      else if (algo === "HRAF") machScore = Math.max(machScore, 85);
    }
    // High-pressure coolant → VCER advantage
    if (input.machine.has_high_pressure_coolant && algo === "VCER") {
      machScore = 95;
      reasons.push("HPC enhances vortex chip evacuation");
    }
  }

  // Weighted composite score
  const weights = { geometry: 0.30, material: 0.25, physics: 0.20, objective: 0.15, machine: 0.10 };
  const composite = Math.round(
    geoScore * weights.geometry +
    matScore * weights.material +
    physScore * weights.physics +
    objScore * weights.objective +
    machScore * weights.machine
  );

  // Confidence: higher when scores are consistent, lower when highly variable
  const scores = [geoScore, matScore, physScore, objScore, machScore];
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const confidence = Math.max(20, Math.min(100, Math.round(100 - stdDev)));

  if (reasons.length === 0) reasons.push("General-purpose match");

  return {
    algorithm: algo,
    score: composite,
    confidence,
    reasons,
    breakdown: {
      geometry_fit: geoScore,
      material_fit: matScore,
      physics_match: physScore,
      objective_fit: objScore,
      machine_fit: machScore,
    },
  };
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

/**
 * Select best novel algorithms for a given zone + material + constraints
 */
function selectAlgorithm(input: AlgorithmSelectionInput): AlgorithmSelectionResult {
  const matClass = classifyMaterial(input.material);
  const priority = input.priority ?? "balanced";

  // Score all 24 algorithms
  const scored = ALL_ALGORITHMS.map(algo => scoreAlgorithm(algo, input, matClass));

  // Sort by score descending, then by confidence descending
  scored.sort((a, b) => b.score - a.score || b.confidence - a.confidence);

  return {
    top_3: scored.slice(0, 3),
    all_ranked: scored,
    zone_type: input.zone_type,
    material_class: matClass,
    selection_criteria: `zone=${input.zone_type} material=${matClass} priority=${priority}`,
  };
}

/**
 * Batch select: run selection for multiple zones at once
 */
function selectForZones(
  zones: Array<{ zone_type: ZoneType; id: string }>,
  material: string,
  machine?: MachineCapabilityInput,
  priority?: OptimizationPriority
): Array<{ zone_id: string; recommendations: AlgorithmRecommendation[] }> {
  return zones.map(zone => ({
    zone_id: zone.id,
    recommendations: selectAlgorithm({
      zone_type: zone.zone_type,
      material,
      machine,
      priority,
    }).top_3,
  }));
}

// ============================================================================
// ENGINE EXPORT
// ============================================================================

export const algorithmSelectorEngine = {
  select: selectAlgorithm,
  selectForZones,
  classifyMaterial,
  scoreAlgorithm,
  ALL_ALGORITHMS,
  GEOMETRY_SCORES,
  MATERIAL_SCORES,
  OBJECTIVE_SCORES,
};
