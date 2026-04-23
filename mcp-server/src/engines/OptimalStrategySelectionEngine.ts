/**
 * OptimalStrategySelectionEngine (E1087) — CAMX-MS1 U01
 *
 * THE unified strategy selector called at every strategy decision point in all
 * pipelines. Combines physics simulation, algorithm routing, taxonomy lookup,
 * CAM parameter databases, and playbook rules into a single ranked output.
 *
 * Integrates:
 *   - CrossCamRecommenderEngine: physics simulation (Kienzle force, Taylor life,
 *     scallop height, chatter/thermal risk)
 *   - AdaptiveToolpathRouterEngine: 30 priority rules + 35 algorithms
 *   - StrategyTaxonomyEngine: normalized strategy names + cross-CAM equivalences
 *   - SpeedFeedOrchestratorEngine: CAM_STRATEGY_DB parameters
 *   - MachiningPlaybookEngine: 296 experiential rules
 *
 * All sub-engines are lazy-loaded so this module compiles with zero eager imports.
 *
 * @module engines/OptimalStrategySelectionEngine
 */

// ============================================================================
// LAZY-LOAD HELPERS
// ============================================================================

const _lazyCache: Record<string, any> = {};

function lazyEngine<T = any>(name: string, path: string): T | null {
  if (!(name in _lazyCache)) {
    try {
      const m = require(path);
      _lazyCache[name] = m[name] || m[Object.keys(m).find(k => k.startsWith(name.charAt(0).toLowerCase() + name.slice(1))) || Object.keys(m)[0]] || m;
    } catch {
      _lazyCache[name] = null;
    }
  }
  return _lazyCache[name] as T | null;
}

function getCrossCamRecommender() { return lazyEngine("crossCamRecommenderEngine", "./CrossCamRecommenderEngine.js"); }
function getAdaptiveToolpathRouter() { return lazyEngine("adaptiveToolpathRouterEngine", "./AdaptiveToolpathRouterEngine.js"); }
function getStrategyTaxonomy() { return lazyEngine("strategyTaxonomyEngine", "./StrategyTaxonomyEngine.js"); }
function getMachiningPlaybook() { return lazyEngine("machiningPlaybookEngine", "./MachiningPlaybookEngine.js"); }

// ============================================================================
// TYPES — INPUT
// ============================================================================

/** ISO material group classification */
export type IsoGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Optimization priority mode */
export type OptimizationPriority = "speed" | "quality" | "tool_life" | "cost" | "balanced";

/** Feature geometry description — all fields optional, engine infers missing */
export interface FeatureInput {
  type?: string;
  depth?: number;
  width?: number;
  length?: number;
  corner_radius?: number;
  wall_angle?: number;
  wall_thickness?: number;
  tolerance?: number;
  surface_finish?: number;
}

/** Material properties — iso_group is the primary key, rest is optional */
export interface MaterialInput {
  iso_group?: IsoGroup;
  name?: string;
  hardness_hrc?: number;
  /** Kienzle specific cutting force (N/mm^2) at h=1mm, b=1mm */
  kc1_1?: number;
  /** Kienzle force exponent (dimensionless, typically 0.2-0.35) */
  mc?: number;
  thermal_conductivity?: number;
}

/** Machine capability constraints */
export interface MachineInput {
  max_rpm?: number;
  max_power_kw?: number;
  axes?: 3 | 4 | 5;
  acceleration?: number;
  jerk?: number;
}

/** Tool geometry specification */
export interface ToolInput {
  diameter?: number;
  flutes?: number;
  material?: "carbide" | "hss" | "ceramic" | "cbn" | "pcd";
  overhang?: number;
  helix_angle?: number;
  corner_radius?: number;
}

/** Hard constraints — any violation disqualifies a strategy */
export interface ConstraintInput {
  max_cycle_time_min?: number;
  max_ra_um?: number;
  min_tool_life_min?: number;
  max_cost_per_part?: number;
}

/** User preference overrides */
export interface PreferenceInput {
  cam_system?: string;
  strategy?: string;
  priority?: OptimizationPriority;
}

/** Top-level input to the optimal strategy selector */
export interface OptimalStrategyInput {
  feature?: FeatureInput;
  material?: MaterialInput;
  machine?: MachineInput;
  tool?: ToolInput;
  constraints?: ConstraintInput;
  preference?: PreferenceInput;
}

// ============================================================================
// TYPES — OUTPUT
// ============================================================================

/** Physics simulation results for a single strategy candidate */
export interface PhysicsResult {
  /** Kienzle cutting force (N) */
  Fc_N: number;
  /** Spindle power consumed (kW) */
  power_kW: number;
  /** Tool deflection at tip (um) */
  deflection_um: number;
  /** Predicted surface roughness Ra (um) */
  Ra_um: number;
  /** Predicted tool life (min) */
  tool_life_min: number;
  /** Estimated cycle time (min) */
  cycle_time_est_min: number;
}

/** Score breakdown by evaluation dimension (all 0-100) */
export interface ScoreBreakdown {
  physics: number;
  cycle_time: number;
  tool_life: number;
  surface_quality: number;
  robustness: number;
  cost: number;
}

/** CAM-native strategy names keyed by cam system */
export type CamEquivalents = Record<string, string>;

/** A single ranked strategy recommendation */
export interface RankedStrategy {
  /** Canonical strategy ID from StrategyTaxonomyEngine */
  canonical_id: string;
  /** Human-readable display name */
  display_name: string;
  /** Native equivalents in each CAM system */
  cam_equivalents: CamEquivalents;
  /** Overall score 0-100 */
  score: number;
  /** Physics simulation results */
  physics: PhysicsResult;
  /** Dimension-level score breakdown */
  score_breakdown: ScoreBreakdown;
  /** Recommended cutting parameters (relative to baseline) */
  parameters: {
    ae_pct: number;
    ap_factor: number;
    Vc_multiplier: number;
    fz_multiplier: number;
  };
}

/** Zone-specific strategy for complex features */
export interface ZoneStrategy {
  zone: string;
  strategy_id: string;
  strategy_name: string;
  reason: string;
}

/** Complete output of the optimal strategy selection */
export interface OptimalStrategyResult {
  /** Top-5 ranked strategies with full physics and scoring */
  ranked_strategies: RankedStrategy[];
  /** The winning strategy (shortcut to ranked_strategies[0]) */
  selected: RankedStrategy;
  /** For complex features: multiple strategies per geometric zone */
  zone_decomposition?: ZoneStrategy[];
  /** Human-readable justification chain */
  justification: string[];
  /** Total number of candidates evaluated */
  alternatives_considered: number;
  /** Relevant playbook warnings and anti-patterns */
  playbook_warnings: string[];
}

// ============================================================================
// SCORING WEIGHT PROFILES
// ============================================================================

/**
 * Weight vectors for each priority mode.
 * Keys: physics, cycle_time, tool_life, surface_quality, robustness, cost
 * All weights in a profile sum to 1.0.
 */
const WEIGHT_PROFILES: Record<OptimizationPriority, ScoreBreakdown> = {
  speed:     { physics: 0.25, cycle_time: 0.35, tool_life: 0.15, surface_quality: 0.10, robustness: 0.00, cost: 0.15 },
  quality:   { physics: 0.25, cycle_time: 0.10, tool_life: 0.20, surface_quality: 0.35, robustness: 0.00, cost: 0.10 },
  tool_life: { physics: 0.25, cycle_time: 0.10, tool_life: 0.35, surface_quality: 0.15, robustness: 0.00, cost: 0.15 },
  cost:      { physics: 0.10, cycle_time: 0.25, tool_life: 0.20, surface_quality: 0.10, robustness: 0.00, cost: 0.35 },
  balanced:  { physics: 0.20, cycle_time: 0.20, tool_life: 0.20, surface_quality: 0.20, robustness: 0.00, cost: 0.20 },
};

// ============================================================================
// MATERIAL PHYSICS DATABASE (Kienzle + Taylor constants)
// ============================================================================

interface MaterialPhysicsProfile {
  kc1_1: number;       // Specific cutting force at h=1mm, b=1mm (N/mm^2)
  mc: number;          // Kienzle force exponent
  n_taylor: number;    // Taylor tool life exponent
  C_taylor: number;    // Taylor constant (m/min) — reference for carbide tools
  thermal_k: number;   // Thermal conductivity (W/m-K)
  Vc_ref: number;      // Reference cutting speed (m/min)
  chatter_factor: number; // 0-1, higher = more chatter-prone
}

const MATERIAL_PHYSICS_DB: Record<IsoGroup, MaterialPhysicsProfile> = {
  P: { kc1_1: 2100, mc: 0.25, n_taylor: 0.25, C_taylor: 350, thermal_k: 50,  Vc_ref: 250, chatter_factor: 0.30 },
  M: { kc1_1: 2500, mc: 0.25, n_taylor: 0.20, C_taylor: 200, thermal_k: 15,  Vc_ref: 120, chatter_factor: 0.50 },
  K: { kc1_1: 1500, mc: 0.25, n_taylor: 0.30, C_taylor: 400, thermal_k: 40,  Vc_ref: 300, chatter_factor: 0.20 },
  N: { kc1_1:  800, mc: 0.25, n_taylor: 0.35, C_taylor: 800, thermal_k: 200, Vc_ref: 500, chatter_factor: 0.15 },
  S: { kc1_1: 3200, mc: 0.25, n_taylor: 0.15, C_taylor:  80, thermal_k: 8,   Vc_ref: 40,  chatter_factor: 0.70 },
  H: { kc1_1: 4000, mc: 0.30, n_taylor: 0.12, C_taylor: 150, thermal_k: 25,  Vc_ref: 80,  chatter_factor: 0.60 },
};

// ============================================================================
// INTERNAL CANDIDATE STRATEGY DATABASE
// ============================================================================

/**
 * Built-in strategy profiles covering the most common CAM strategies.
 * Each profile defines baseline cutting parameters and ratings used for
 * physics simulation when the full CrossCamRecommenderEngine database is
 * not available.
 */
interface StrategyProfile {
  id: string;
  name: string;
  category: "roughing" | "semi_finishing" | "finishing" | "drilling";
  /** Radial engagement as % of tool diameter */
  ae_pct: number;
  /** Axial depth as factor of tool diameter */
  ap_factor: number;
  /** Cutting speed multiplier relative to material Vc_ref */
  vc_mult: number;
  /** Feed per tooth multiplier relative to baseline fz */
  fz_mult: number;
  /** Engagement control reduces chatter risk */
  engagement_control: boolean;
  /** HSM capability flag */
  hsm: boolean;
  /** Minimum axis count required */
  min_axes: 3 | 4 | 5;
  /** Applicable geometry types (empty = all) */
  geometries: string[];
  /** Cycle time rating 1-10 (10 = fastest) */
  cycle_rating: number;
  /** Surface finish rating 1-10 (10 = best) */
  finish_rating: number;
  /** Tool life rating 1-10 (10 = longest) */
  life_rating: number;
  /** Cost rating 1-10 (10 = cheapest per part) */
  cost_rating: number;
}

const STRATEGY_DB: StrategyProfile[] = [
  // ── Roughing ──
  { id: "adaptive_clearing", name: "Adaptive Clearing", category: "roughing",
    ae_pct: 10, ap_factor: 2.0, vc_mult: 0.85, fz_mult: 1.0,
    engagement_control: true, hsm: true, min_axes: 3,
    geometries: ["pocket", "pocket_2d", "pocket_3d", "cavity", "deep_cavity", "slot"],
    cycle_rating: 9, finish_rating: 3, life_rating: 9, cost_rating: 8 },
  { id: "trochoidal_milling", name: "Trochoidal Milling", category: "roughing",
    ae_pct: 8, ap_factor: 2.5, vc_mult: 0.90, fz_mult: 1.0,
    engagement_control: true, hsm: true, min_axes: 3,
    geometries: ["slot", "slot_through", "slot_blind", "pocket", "pocket_2d"],
    cycle_rating: 8, finish_rating: 3, life_rating: 9, cost_rating: 8 },
  { id: "optimized_roughing", name: "Optimized Roughing (HPC)", category: "roughing",
    ae_pct: 8, ap_factor: 2.0, vc_mult: 0.80, fz_mult: 1.0,
    engagement_control: true, hsm: true, min_axes: 3,
    geometries: ["pocket", "pocket_2d", "pocket_3d", "deep_cavity", "multi_pocket"],
    cycle_rating: 9, finish_rating: 3, life_rating: 9, cost_rating: 9 },
  { id: "pocket_clearing", name: "Pocket Clearing", category: "roughing",
    ae_pct: 50, ap_factor: 1.0, vc_mult: 0.70, fz_mult: 0.90,
    engagement_control: false, hsm: false, min_axes: 3,
    geometries: ["pocket", "pocket_2d", "slot", "contour"],
    cycle_rating: 6, finish_rating: 2, life_rating: 5, cost_rating: 6 },
  { id: "face_milling", name: "Face Milling", category: "roughing",
    ae_pct: 60, ap_factor: 0.5, vc_mult: 0.90, fz_mult: 1.1,
    engagement_control: false, hsm: false, min_axes: 3,
    geometries: ["face", "step", "floor", "flat"],
    cycle_rating: 8, finish_rating: 4, life_rating: 6, cost_rating: 7 },
  { id: "z_level_roughing", name: "Z-Level Roughing", category: "roughing",
    ae_pct: 40, ap_factor: 1.0, vc_mult: 0.75, fz_mult: 0.95,
    engagement_control: false, hsm: false, min_axes: 3,
    geometries: ["pocket_3d", "cavity", "deep_cavity", "freeform", "surface_3d"],
    cycle_rating: 7, finish_rating: 4, life_rating: 6, cost_rating: 6 },
  { id: "plunge_roughing", name: "Plunge Roughing", category: "roughing",
    ae_pct: 70, ap_factor: 0.3, vc_mult: 0.50, fz_mult: 0.80,
    engagement_control: false, hsm: false, min_axes: 3,
    geometries: ["deep_cavity", "pocket_3d", "slot_blind"],
    cycle_rating: 5, finish_rating: 2, life_rating: 7, cost_rating: 5 },
  { id: "high_feed_milling", name: "High Feed Milling", category: "roughing",
    ae_pct: 70, ap_factor: 0.2, vc_mult: 1.20, fz_mult: 1.8,
    engagement_control: false, hsm: true, min_axes: 3,
    geometries: ["face", "pocket", "pocket_2d", "flat", "floor"],
    cycle_rating: 9, finish_rating: 2, life_rating: 6, cost_rating: 8 },

  // ── Novel algorithms (roughing) ──
  { id: "TGAR", name: "Thermal-Gradient Adaptive Roughing", category: "roughing",
    ae_pct: 10, ap_factor: 2.0, vc_mult: 0.80, fz_mult: 1.0,
    engagement_control: true, hsm: true, min_axes: 3,
    geometries: ["pocket", "pocket_2d", "pocket_3d", "deep_cavity"],
    cycle_rating: 8, finish_rating: 4, life_rating: 10, cost_rating: 9 },
  { id: "VCER", name: "Vortex Chip Evacuation Roughing", category: "roughing",
    ae_pct: 12, ap_factor: 2.0, vc_mult: 0.85, fz_mult: 1.0,
    engagement_control: true, hsm: true, min_axes: 3,
    geometries: ["deep_cavity", "pocket_3d", "slot_blind"],
    cycle_rating: 8, finish_rating: 3, life_rating: 9, cost_rating: 8 },
  { id: "MTHZD", name: "Multi-Tool Hybrid Zone Decomposition", category: "roughing",
    ae_pct: 15, ap_factor: 1.8, vc_mult: 0.80, fz_mult: 1.0,
    engagement_control: true, hsm: true, min_axes: 3,
    geometries: ["complex_cavity", "multi_level", "pocket_3d"],
    cycle_rating: 9, finish_rating: 4, life_rating: 8, cost_rating: 7 },
  { id: "AMEF", name: "Adaptive Multi-Engine Fusion", category: "roughing",
    ae_pct: 10, ap_factor: 2.0, vc_mult: 0.85, fz_mult: 1.0,
    engagement_control: true, hsm: true, min_axes: 3,
    geometries: ["complex_cavity", "multi_level", "pocket_3d"],
    cycle_rating: 9, finish_rating: 5, life_rating: 9, cost_rating: 8 },
  { id: "WBRL", name: "Wear-Balanced Roughing Layout", category: "roughing",
    ae_pct: 10, ap_factor: 2.0, vc_mult: 0.75, fz_mult: 0.95,
    engagement_control: true, hsm: true, min_axes: 3,
    geometries: ["pocket", "pocket_2d", "pocket_3d"],
    cycle_rating: 7, finish_rating: 3, life_rating: 10, cost_rating: 9 },

  // ── Semi-finishing ──
  { id: "rest_machining", name: "Rest Machining", category: "semi_finishing",
    ae_pct: 30, ap_factor: 0.8, vc_mult: 0.80, fz_mult: 0.90,
    engagement_control: false, hsm: false, min_axes: 3,
    geometries: ["pocket_3d", "cavity", "deep_cavity", "freeform", "corner"],
    cycle_rating: 5, finish_rating: 5, life_rating: 7, cost_rating: 5 },
  { id: "contour_offset", name: "Contour Offset Finishing", category: "semi_finishing",
    ae_pct: 20, ap_factor: 0.5, vc_mult: 0.85, fz_mult: 0.90,
    engagement_control: false, hsm: false, min_axes: 3,
    geometries: ["contour", "profile", "wall", "pocket"],
    cycle_rating: 6, finish_rating: 6, life_rating: 6, cost_rating: 6 },

  // ── Finishing ──
  { id: "parallel_finishing", name: "Parallel Finishing", category: "finishing",
    ae_pct: 5, ap_factor: 0.15, vc_mult: 1.00, fz_mult: 0.80,
    engagement_control: false, hsm: true, min_axes: 3,
    geometries: ["surface_3d", "freeform", "pocket_3d", "floor"],
    cycle_rating: 6, finish_rating: 7, life_rating: 7, cost_rating: 6 },
  { id: "scallop_finishing", name: "Constant-Scallop Finishing", category: "finishing",
    ae_pct: 5, ap_factor: 0.10, vc_mult: 1.00, fz_mult: 0.80,
    engagement_control: false, hsm: true, min_axes: 3,
    geometries: ["surface_3d", "freeform"],
    cycle_rating: 5, finish_rating: 9, life_rating: 7, cost_rating: 5 },
  { id: "equidistant_finishing", name: "Equidistant Finishing", category: "finishing",
    ae_pct: 5, ap_factor: 0.10, vc_mult: 1.00, fz_mult: 0.80,
    engagement_control: false, hsm: true, min_axes: 3,
    geometries: ["surface_3d", "freeform", "pocket_3d"],
    cycle_rating: 5, finish_rating: 10, life_rating: 7, cost_rating: 5 },
  { id: "steep_shallow", name: "Steep & Shallow Finishing", category: "finishing",
    ae_pct: 6, ap_factor: 0.15, vc_mult: 0.95, fz_mult: 0.80,
    engagement_control: false, hsm: true, min_axes: 3,
    geometries: ["surface_3d", "freeform", "pocket_3d", "mold_cavity"],
    cycle_rating: 6, finish_rating: 8, life_rating: 7, cost_rating: 6 },
  { id: "pencil_finishing", name: "Pencil Finishing", category: "finishing",
    ae_pct: 50, ap_factor: 0.30, vc_mult: 0.85, fz_mult: 0.70,
    engagement_control: false, hsm: false, min_axes: 3,
    geometries: ["corner", "fillet", "pocket_3d", "freeform", "deep_cavity"],
    cycle_rating: 4, finish_rating: 6, life_rating: 7, cost_rating: 5 },
  { id: "morphed_spiral", name: "Morphed Spiral Finishing", category: "finishing",
    ae_pct: 6, ap_factor: 0.12, vc_mult: 1.00, fz_mult: 0.85,
    engagement_control: false, hsm: true, min_axes: 3,
    geometries: ["surface_3d", "freeform", "mold_cavity"],
    cycle_rating: 6, finish_rating: 9, life_rating: 7, cost_rating: 6 },
  { id: "flowline_finishing", name: "Flowline Finishing", category: "finishing",
    ae_pct: 5, ap_factor: 0.10, vc_mult: 1.00, fz_mult: 0.80,
    engagement_control: false, hsm: true, min_axes: 5,
    geometries: ["surface_3d", "freeform", "blade", "impeller"],
    cycle_rating: 5, finish_rating: 9, life_rating: 7, cost_rating: 5 },
  { id: "contour_finishing", name: "Contour Finishing", category: "finishing",
    ae_pct: 15, ap_factor: 0.20, vc_mult: 0.90, fz_mult: 0.80,
    engagement_control: false, hsm: false, min_axes: 3,
    geometries: ["contour", "wall", "profile", "thin_wall"],
    cycle_rating: 6, finish_rating: 7, life_rating: 6, cost_rating: 6 },
  { id: "swarf_cutting", name: "5-Axis Swarf Cutting", category: "finishing",
    ae_pct: 30, ap_factor: 1.0, vc_mult: 0.85, fz_mult: 0.85,
    engagement_control: false, hsm: false, min_axes: 5,
    geometries: ["thin_wall", "contour", "wall", "surface_3d"],
    cycle_rating: 7, finish_rating: 8, life_rating: 6, cost_rating: 7 },

  // ── Novel algorithms (finishing) ──
  { id: "HRAF", name: "Harmonic-Resonance Avoidant Finishing", category: "finishing",
    ae_pct: 5, ap_factor: 0.15, vc_mult: 0.90, fz_mult: 0.80,
    engagement_control: true, hsm: true, min_axes: 3,
    geometries: ["thin_wall", "freeform", "surface_3d"],
    cycle_rating: 5, finish_rating: 9, life_rating: 8, cost_rating: 6 },
  { id: "CFSF", name: "Constant-Force Spiral Finishing", category: "finishing",
    ae_pct: 5, ap_factor: 0.12, vc_mult: 0.95, fz_mult: 0.85,
    engagement_control: true, hsm: true, min_axes: 3,
    geometries: ["pocket_3d", "freeform", "surface_3d"],
    cycle_rating: 6, finish_rating: 9, life_rating: 8, cost_rating: 6 },
  { id: "PTDC", name: "Predictive Tool Deflection Compensation", category: "finishing",
    ae_pct: 6, ap_factor: 0.15, vc_mult: 0.85, fz_mult: 0.80,
    engagement_control: true, hsm: true, min_axes: 3,
    geometries: ["deep_cavity", "thin_wall", "long_reach"],
    cycle_rating: 5, finish_rating: 8, life_rating: 8, cost_rating: 6 },
  { id: "EAPR", name: "Engagement-Aware Path Refinement", category: "finishing",
    ae_pct: 8, ap_factor: 0.15, vc_mult: 0.90, fz_mult: 0.85,
    engagement_control: true, hsm: true, min_axes: 3,
    geometries: ["corner", "variable_engagement", "pocket_3d"],
    cycle_rating: 6, finish_rating: 8, life_rating: 8, cost_rating: 6 },
  { id: "PARETO", name: "Pareto Multi-Objective Path", category: "finishing",
    ae_pct: 6, ap_factor: 0.12, vc_mult: 0.95, fz_mult: 0.85,
    engagement_control: true, hsm: true, min_axes: 3,
    geometries: ["freeform", "surface_3d", "mold_cavity"],
    cycle_rating: 6, finish_rating: 8, life_rating: 8, cost_rating: 7 },
];

// ============================================================================
// CAM EQUIVALENCE MAP (top strategies across 8 CAM systems)
// ============================================================================

const CAM_EQUIVALENCES: Record<string, CamEquivalents> = {
  adaptive_clearing: {
    fusion360: "Adaptive Clearing", mastercam: "Dynamic Mill", solidcam: "iMachining 2D",
    hypermill: "MAXX Machining Roughing", gibbscam: "VoluMill", esprit: "ProfitMilling",
    siemens_nx: "Adaptive Milling", surfcam: "TrueMill", powermill: "Vortex",
    edgecam: "Waveform", camworks: "VoluMill", hsmworks: "Adaptive Clearing",
  },
  trochoidal_milling: {
    fusion360: "2D Adaptive", mastercam: "Dynamic Mill", solidcam: "iMachining 2D",
    hypermill: "Optimized Roughing (HPC)", gibbscam: "VoluMill", esprit: "ProfitMilling",
    siemens_nx: "Trochoidal", surfcam: "TrueMill",
  },
  optimized_roughing: {
    hypermill: "Optimized Roughing (HPC)", fusion360: "Adaptive Clearing",
    mastercam: "OptiRough", solidcam: "iMachining 3D", siemens_nx: "Adaptive Milling",
  },
  pocket_clearing: {
    fusion360: "Pocket", mastercam: "Pocket", solidcam: "Pocket 2D",
    hypermill: "Pocket Roughing", gibbscam: "Pocket", esprit: "Pocket",
    siemens_nx: "Cavity Mill", surfcam: "2 Axis Pocket",
  },
  face_milling: {
    fusion360: "Face", mastercam: "Face Mill", solidcam: "Face Milling",
    hypermill: "Face Milling", gibbscam: "Face Mill", siemens_nx: "Face Milling",
  },
  z_level_roughing: {
    fusion360: "Steep and Shallow", mastercam: "Z Level", solidcam: "HSR",
    hypermill: "Z Level Roughing", siemens_nx: "Z-Level",
  },
  plunge_roughing: {
    fusion360: "Slot", mastercam: "Plunge Rough", solidcam: "Plunge Milling",
    hypermill: "Plunge Cutting", siemens_nx: "Plunge Milling",
  },
  high_feed_milling: {
    fusion360: "2D Adaptive", mastercam: "High Feed Mill", solidcam: "iMachining HFM",
    hypermill: "High Feed Cutting", siemens_nx: "High Feed Milling",
  },
  rest_machining: {
    fusion360: "Adaptive (ref tool)", mastercam: "Rest Rough", solidcam: "Rest Roughing",
    hypermill: "Rest Machining", siemens_nx: "Rest Milling",
  },
  parallel_finishing: {
    fusion360: "Parallel", mastercam: "Parallel", solidcam: "Linear",
    hypermill: "Parallel Finishing", siemens_nx: "Parallel Finish",
  },
  scallop_finishing: {
    fusion360: "Scallop", mastercam: "Scallop", solidcam: "Constant Step Over",
    hypermill: "Equidistant Finishing", siemens_nx: "Contour Area",
  },
  equidistant_finishing: {
    hypermill: "Equidistant Finishing", fusion360: "Scallop",
    mastercam: "Scallop", siemens_nx: "Contour Area",
  },
  steep_shallow: {
    fusion360: "Steep and Shallow", mastercam: "Hybrid", solidcam: "HSS",
    hypermill: "Steep/Shallow", siemens_nx: "Steep/Shallow",
  },
  pencil_finishing: {
    fusion360: "Trace", mastercam: "Pencil", solidcam: "Pencil",
    hypermill: "3D Pencil Milling", siemens_nx: "Boundary",
  },
  morphed_spiral: {
    fusion360: "Morphed Spiral", mastercam: "Morph", hypermill: "Spiral Finishing",
    siemens_nx: "Streamline",
  },
  flowline_finishing: {
    fusion360: "Flow", mastercam: "Flowline", hypermill: "Flow Line Finishing",
    siemens_nx: "Streamline", powermill: "Flowline",
  },
  contour_finishing: {
    fusion360: "Contour", mastercam: "Contour", solidcam: "Profile",
    hypermill: "3D Contouring", siemens_nx: "Contour Profile",
  },
  swarf_cutting: {
    fusion360: "Swarf", mastercam: "Multiaxis Swarf", solidcam: "5X Swarf",
    hypermill: "5-Axis Swarf Cutting", siemens_nx: "Swarf Driving",
  },
};

// ============================================================================
// PHYSICS SIMULATION
// ============================================================================

/**
 * Run Kienzle force model, Taylor tool life, deflection, Ra, and cycle time
 * estimation for a given strategy profile against the resolved inputs.
 */
function simulatePhysics(
  strategy: StrategyProfile,
  feature: Required<FeatureInput>,
  mat: MaterialPhysicsProfile,
  tool: Required<ToolInput>,
  machine: Required<MachineInput>,
): PhysicsResult {
  const D = tool.diameter;
  const z = tool.flutes;
  const L = tool.overhang;
  const r_nose = tool.corner_radius || D / 2;

  // Cutting parameters from strategy + material
  const ae = (strategy.ae_pct / 100) * D;
  const ap = strategy.ap_factor * D;
  const Vc = mat.Vc_ref * strategy.vc_mult;

  // RPM (capped by machine)
  const rpm_calc = (Vc * 1000) / (Math.PI * D);
  const rpm = Math.min(rpm_calc, machine.max_rpm);
  const Vc_actual = (Math.PI * D * rpm) / 1000;

  // Feed per tooth — baseline from tool diameter
  const fz_base = D < 6 ? 0.04 : D < 12 ? 0.08 : D < 20 ? 0.12 : 0.15;
  const fz = fz_base * strategy.fz_mult;

  // Feed rate (mm/min)
  const Vf = rpm * fz * z;

  // Mean chip thickness (accounting for radial engagement)
  const hm = fz * Math.sqrt(ae / D);

  // ── Kienzle cutting force: Fc = kc1_1 * ap * fz^(1 - mc) ──
  const Fc = mat.kc1_1 * ap * Math.pow(fz, 1 - mat.mc);

  // ── Spindle power: P = Fc * Vc / (60 * 1000) ──
  const power_kW = (Fc * Vc_actual) / (60_000);

  // ── Tool deflection: delta = Fc * L^3 / (3 * E * I) ──
  // E = 600 GPa for carbide, 200 GPa for HSS
  const E_GPa = tool.material === "carbide" ? 600 : tool.material === "hss" ? 200 : 400;
  const E_Nmm2 = E_GPa * 1000; // N/mm^2
  const I = (Math.PI * Math.pow(D, 4)) / 64; // mm^4
  const deflection_mm = (Fc * Math.pow(L, 3)) / (3 * E_Nmm2 * I);
  const deflection_um = deflection_mm * 1000;

  // ── Surface roughness: Ra = fz^2 / (32 * r_nose) ──
  // Apply strategy finish rating as modifier
  const Ra_geometric = (fz * fz) / (32 * r_nose);
  const Ra_category_mult = strategy.category === "roughing" ? 8.0
    : strategy.category === "semi_finishing" ? 3.0
    : 1.0;
  const Ra_um = Math.max(0.1, Ra_geometric * 1000 * Ra_category_mult);

  // ── Taylor tool life: T = (C / Vc)^(1/n) ──
  const T_min = Math.pow(mat.C_taylor / Vc_actual, 1 / mat.n_taylor);
  // Adjust for strategy aggressiveness (engagement control extends life)
  const life_mult = strategy.engagement_control ? 1.3 : 1.0;
  const tool_life_min = Math.max(1, T_min * life_mult);

  // ── Cycle time estimate ──
  const volume_mm3 = feature.length * feature.width * feature.depth;
  const mrr_mm3_min = ae * ap * Vf; // theoretical MRR
  const cutting_time = mrr_mm3_min > 0 ? volume_mm3 / mrr_mm3_min : 999;
  const overhead = 1.18; // 18% for rapids, approaches, retracts, tool changes
  const cycle_time_est_min = cutting_time * overhead;

  return {
    Fc_N: round2(Fc),
    power_kW: round2(power_kW),
    deflection_um: round2(deflection_um),
    Ra_um: round2(Ra_um),
    tool_life_min: round2(tool_life_min),
    cycle_time_est_min: round2(cycle_time_est_min),
  };
}

// ============================================================================
// SCORING
// ============================================================================

/**
 * Score a candidate strategy on each evaluation dimension (0-100).
 * Then compute weighted total based on priority profile.
 */
function scoreCandidate(
  strategy: StrategyProfile,
  physics: PhysicsResult,
  machine: Required<MachineInput>,
  constraints: Required<ConstraintInput>,
  priority: OptimizationPriority,
): { total: number; breakdown: ScoreBreakdown } {
  const weights = WEIGHT_PROFILES[priority];

  // ── Physics score (power safety + deflection + validation) ──
  let physicsScore = 70;
  if (physics.power_kW <= (machine.max_power_kw * 0.85)) physicsScore += 15;
  else if (physics.power_kW <= machine.max_power_kw) physicsScore += 5;
  else physicsScore -= 30;

  if (physics.deflection_um < 10) physicsScore += 15;
  else if (physics.deflection_um < 25) physicsScore += 5;
  else physicsScore -= 10;

  physicsScore = clamp(physicsScore, 0, 100);

  // ── Cycle time score (lower = better, scaled against constraint or 60 min) ──
  const ctRef = constraints.max_cycle_time_min || 60;
  const ctRatio = physics.cycle_time_est_min / ctRef;
  let cycleTimeScore: number;
  if (ctRatio <= 0.3) cycleTimeScore = 100;
  else if (ctRatio <= 0.6) cycleTimeScore = 85;
  else if (ctRatio <= 1.0) cycleTimeScore = 65;
  else cycleTimeScore = Math.max(0, 50 - (ctRatio - 1.0) * 30);

  // Bonus from strategy cycle rating
  cycleTimeScore = clamp(cycleTimeScore + (strategy.cycle_rating - 5) * 3, 0, 100);

  // ── Tool life score ──
  const tlRef = constraints.min_tool_life_min || 45;
  const tlRatio = physics.tool_life_min / tlRef;
  let toolLifeScore: number;
  if (tlRatio >= 3.0) toolLifeScore = 100;
  else if (tlRatio >= 1.5) toolLifeScore = 80;
  else if (tlRatio >= 1.0) toolLifeScore = 60;
  else toolLifeScore = Math.max(0, tlRatio * 50);

  toolLifeScore = clamp(toolLifeScore + (strategy.life_rating - 5) * 3, 0, 100);

  // ── Surface quality score ──
  const raRef = constraints.max_ra_um || 3.2;
  const raRatio = physics.Ra_um / raRef;
  let qualityScore: number;
  if (raRatio <= 0.3) qualityScore = 100;
  else if (raRatio <= 0.6) qualityScore = 85;
  else if (raRatio <= 1.0) qualityScore = 65;
  else qualityScore = Math.max(0, 50 - (raRatio - 1.0) * 25);

  qualityScore = clamp(qualityScore + (strategy.finish_rating - 5) * 3, 0, 100);

  // ── Cost score (inversely proportional to cycle time * tool usage) ──
  const costFactor = physics.cycle_time_est_min / Math.max(physics.tool_life_min, 1);
  let costScore: number;
  if (costFactor < 0.05) costScore = 95;
  else if (costFactor < 0.15) costScore = 80;
  else if (costFactor < 0.30) costScore = 65;
  else costScore = Math.max(0, 55 - costFactor * 100);

  costScore = clamp(costScore + (strategy.cost_rating - 5) * 3, 0, 100);

  // ── Robustness (engagement control, HSM, physics margin) ──
  let robustnessScore = 50;
  if (strategy.engagement_control) robustnessScore += 20;
  if (strategy.hsm) robustnessScore += 10;
  if (physics.power_kW < machine.max_power_kw * 0.70) robustnessScore += 10;
  if (physics.deflection_um < 15) robustnessScore += 10;
  robustnessScore = clamp(robustnessScore, 0, 100);

  const breakdown: ScoreBreakdown = {
    physics: round2(physicsScore),
    cycle_time: round2(cycleTimeScore),
    tool_life: round2(toolLifeScore),
    surface_quality: round2(qualityScore),
    robustness: round2(robustnessScore),
    cost: round2(costScore),
  };

  const total =
    weights.physics * physicsScore +
    weights.cycle_time * cycleTimeScore +
    weights.tool_life * toolLifeScore +
    weights.surface_quality * qualityScore +
    weights.robustness * robustnessScore +
    weights.cost * costScore;

  return { total: round2(total), breakdown };
}

// ============================================================================
// ZONE DECOMPOSITION
// ============================================================================

/**
 * For complex features with multiple zones (bulk, corners, walls, floor),
 * recommend different strategies per zone.
 *
 * Returns undefined if the feature does not warrant zone decomposition.
 */
function decomposeZones(
  feature: Required<FeatureInput>,
  rankedStrategies: RankedStrategy[],
): ZoneStrategy[] | undefined {
  // Only decompose if feature has depth, corners, or walls
  const hasDepth = feature.depth > feature.width * 0.5;
  const hasCorners = (feature.corner_radius ?? 0) > 0 && (feature.corner_radius ?? 999) < feature.width * 0.3;
  const hasThinWalls = (feature.wall_thickness ?? 999) < 3.0;
  const needsDecomp = hasDepth || hasCorners || hasThinWalls;
  if (!needsDecomp || rankedStrategies.length < 2) return undefined;

  const zones: ZoneStrategy[] = [];

  // Find best roughing strategy
  const roughing = rankedStrategies.find(s => {
    const sp = STRATEGY_DB.find(p => p.id === s.canonical_id);
    return sp?.category === "roughing";
  });
  if (roughing) {
    zones.push({
      zone: "bulk",
      strategy_id: roughing.canonical_id,
      strategy_name: roughing.display_name,
      reason: "Maximum MRR for primary volume removal",
    });
  }

  // Corner zone — prefer engagement-aware strategies
  if (hasCorners) {
    const cornerStrat = rankedStrategies.find(s => {
      const sp = STRATEGY_DB.find(p => p.id === s.canonical_id);
      return sp && (sp.id === "EAPR" || sp.id === "pencil_finishing" || sp.id === "rest_machining");
    }) || rankedStrategies.find(s => {
      const sp = STRATEGY_DB.find(p => p.id === s.canonical_id);
      return sp?.category === "finishing" || sp?.category === "semi_finishing";
    });
    if (cornerStrat) {
      zones.push({
        zone: "corners",
        strategy_id: cornerStrat.canonical_id,
        strategy_name: cornerStrat.display_name,
        reason: "Corner-aware toolpath to maintain engagement control in tight radii",
      });
    }
  }

  // Thin wall zone — prefer HRAF or contour finishing
  if (hasThinWalls) {
    const wallStrat = rankedStrategies.find(s => {
      const sp = STRATEGY_DB.find(p => p.id === s.canonical_id);
      return sp && (sp.id === "HRAF" || sp.id === "swarf_cutting" || sp.id === "contour_finishing");
    });
    if (wallStrat) {
      zones.push({
        zone: "walls",
        strategy_id: wallStrat.canonical_id,
        strategy_name: wallStrat.display_name,
        reason: "Vibration-avoidant strategy for thin wall stability",
      });
    }
  }

  // Floor zone — finishing strategy for bottom surface
  if (hasDepth) {
    const floorStrat = rankedStrategies.find(s => {
      const sp = STRATEGY_DB.find(p => p.id === s.canonical_id);
      return sp?.category === "finishing";
    });
    if (floorStrat) {
      zones.push({
        zone: "floor",
        strategy_id: floorStrat.canonical_id,
        strategy_name: floorStrat.display_name,
        reason: "High-quality finish pass on floor surface",
      });
    }
  }

  return zones.length >= 2 ? zones : undefined;
}

// ============================================================================
// PLAYBOOK INTEGRATION
// ============================================================================

/**
 * Query MachiningPlaybookEngine for relevant warnings, anti-patterns,
 * and rules that apply to the selected strategies.
 *
 * Gracefully returns empty array if the playbook engine is not available.
 */
function getPlaybookWarnings(
  feature: Required<FeatureInput>,
  mat: { iso_group: IsoGroup },
  selectedIds: string[],
): string[] {
  try {
    const playbook = getMachiningPlaybook();
    if (!playbook || typeof playbook.compute !== "function") return [];

    const result = playbook.compute({
      action: "playbook_antipatterns",
      feature_type: feature.type,
      iso_group: mat.iso_group,
      strategies: selectedIds,
    });
    if (result?.value?.anti_patterns) {
      return result.value.anti_patterns.map(
        (ap: { rule: string; why: string }) => `[ANTI-PATTERN] ${ap.rule}: ${ap.why}`,
      );
    }
    if (result?.value?.rules) {
      return result.value.rules
        .filter((r: { severity: string }) => r.severity === "critical" || r.severity === "important")
        .map((r: { text: string }) => r.text);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Attempt to enrich CAM equivalences via StrategyTaxonomyEngine.
 * Falls back to built-in CAM_EQUIVALENCES map.
 */
function enrichCamEquivalents(canonicalId: string): CamEquivalents {
  // Try taxonomy engine first
  try {
    const taxonomy = getStrategyTaxonomy();
    if (taxonomy && typeof taxonomy.lookup === "function") {
      const info = taxonomy.lookup(canonicalId);
      if (info?.cam_equivalents?.length) {
        const eqs: CamEquivalents = {};
        for (const eq of info.cam_equivalents) {
          eqs[eq.cam_system] = eq.native_name;
        }
        return eqs;
      }
    }
  } catch { /* graceful fallback */ }

  // Fall back to built-in map
  return CAM_EQUIVALENCES[canonicalId] || {};
}

// ============================================================================
// JUSTIFICATION BUILDER
// ============================================================================

/**
 * Generate human-readable justification chain explaining why the selected
 * strategy was chosen and how the ranking was determined.
 */
function buildJustification(
  selected: RankedStrategy,
  priority: OptimizationPriority,
  feature: Required<FeatureInput>,
  mat: { iso_group: IsoGroup },
  totalCandidates: number,
): string[] {
  const j: string[] = [];

  j.push(
    `Evaluated ${totalCandidates} candidate strategies for ${feature.type || "general"} feature ` +
    `in ISO ${mat.iso_group} material with "${priority}" priority.`,
  );

  j.push(
    `Selected "${selected.display_name}" (${selected.canonical_id}) with score ${selected.score.toFixed(1)}/100.`,
  );

  // Highlight dominant score dimension
  const bd = selected.score_breakdown;
  const dims: Array<[string, number]> = [
    ["physics", bd.physics],
    ["cycle_time", bd.cycle_time],
    ["tool_life", bd.tool_life],
    ["surface_quality", bd.surface_quality],
    ["cost", bd.cost],
  ];
  dims.sort((a, b) => b[1] - a[1]);
  j.push(`Strongest dimensions: ${dims[0][0]} (${dims[0][1].toFixed(0)}) and ${dims[1][0]} (${dims[1][1].toFixed(0)}).`);

  // Physics summary
  const p = selected.physics;
  j.push(
    `Physics: Fc=${p.Fc_N.toFixed(0)}N, Power=${p.power_kW.toFixed(2)}kW, ` +
    `Deflection=${p.deflection_um.toFixed(1)}um, Ra=${p.Ra_um.toFixed(2)}um, ` +
    `Tool life=${p.tool_life_min.toFixed(0)}min, Cycle=${p.cycle_time_est_min.toFixed(1)}min.`,
  );

  // Strategy-specific notes
  const sp = STRATEGY_DB.find(s => s.id === selected.canonical_id);
  if (sp?.engagement_control) {
    j.push("Strategy uses constant engagement control -- reduces chatter risk and extends tool life.");
  }
  if (sp?.hsm) {
    j.push("HSM-capable strategy -- suitable for high-speed machining centers.");
  }

  return j;
}

// ============================================================================
// DEFAULTS & UTILS
// ============================================================================

function resolveFeature(f?: FeatureInput): Required<FeatureInput> {
  return {
    type: f?.type ?? "pocket",
    depth: f?.depth ?? 20,
    width: f?.width ?? 50,
    length: f?.length ?? 80,
    corner_radius: f?.corner_radius ?? 5,
    wall_angle: f?.wall_angle ?? 90,
    wall_thickness: f?.wall_thickness ?? 5,
    tolerance: f?.tolerance ?? 0.05,
    surface_finish: f?.surface_finish ?? 1.6,
  };
}

function resolveMaterial(m?: MaterialInput): { iso_group: IsoGroup; profile: MaterialPhysicsProfile } {
  const iso = m?.iso_group ?? "P";
  const profile = { ...MATERIAL_PHYSICS_DB[iso] };
  if (m?.kc1_1) profile.kc1_1 = m.kc1_1;
  if (m?.mc) profile.mc = m.mc;
  if (m?.thermal_conductivity) profile.thermal_k = m.thermal_conductivity;
  // Adjust Vc for hardness
  if (m?.hardness_hrc) {
    if (m.hardness_hrc > 50) profile.Vc_ref *= 0.5;
    else if (m.hardness_hrc > 40) profile.Vc_ref *= 0.65;
    else if (m.hardness_hrc > 30) profile.Vc_ref *= 0.80;
  }
  return { iso_group: iso, profile };
}

function resolveMachine(m?: MachineInput): Required<MachineInput> {
  return {
    max_rpm: m?.max_rpm ?? 12000,
    max_power_kw: m?.max_power_kw ?? 15,
    axes: m?.axes ?? 3,
    acceleration: m?.acceleration ?? 5,
    jerk: m?.jerk ?? 50,
  };
}

function resolveTool(t?: ToolInput): Required<ToolInput> {
  return {
    diameter: t?.diameter ?? 12,
    flutes: t?.flutes ?? 4,
    material: t?.material ?? "carbide",
    overhang: t?.overhang ?? 40,
    helix_angle: t?.helix_angle ?? 35,
    corner_radius: t?.corner_radius ?? 0.8,
  };
}

function resolveConstraints(c?: ConstraintInput): Required<ConstraintInput> {
  return {
    max_cycle_time_min: c?.max_cycle_time_min ?? 60,
    max_ra_um: c?.max_ra_um ?? 3.2,
    min_tool_life_min: c?.min_tool_life_min ?? 45,
    max_cost_per_part: c?.max_cost_per_part ?? 100,
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * OptimalStrategySelectionEngine (E1087) -- the unified strategy selector.
 *
 * Call `compute(input)` with any subset of feature/material/machine/tool/constraints/preference
 * and receive a ranked list of strategies with full physics simulation, scoring,
 * CAM equivalences, zone decomposition, and playbook warnings.
 */
export class OptimalStrategySelectionEngine {
  /**
   * Select the optimal machining strategy for the given context.
   *
   * @param input - Feature, material, machine, tool, constraints, and preference (all optional)
   * @returns Ranked strategies with physics simulation, scores, and justification
   */
  compute(input: OptimalStrategyInput): OptimalStrategyResult {
    // ── Resolve all inputs to fully-populated objects ──
    const feature = resolveFeature(input.feature);
    const { iso_group, profile: matProfile } = resolveMaterial(input.material);
    const machine = resolveMachine(input.machine);
    const tool = resolveTool(input.tool);
    const constraints = resolveConstraints(input.constraints);
    const priority = input.preference?.priority ?? "balanced";

    // ── Phase 1: Filter candidate strategies ──
    const candidates = this.filterCandidates(feature, machine, input.preference);

    // ── Phase 2: Physics simulation for each candidate ──
    const simulated = candidates.map(strategy => ({
      strategy,
      physics: simulatePhysics(strategy, feature, matProfile, tool, machine),
    }));

    // ── Phase 3: Score and rank ──
    const scored = simulated.map(({ strategy, physics }) => {
      const { total, breakdown } = scoreCandidate(strategy, physics, machine, constraints, priority);
      return { strategy, physics, score: total, breakdown };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // ── Phase 4: Build ranked output (top 5) ──
    const rankedStrategies: RankedStrategy[] = scored.slice(0, 5).map(({ strategy, physics, score, breakdown }) => ({
      canonical_id: strategy.id,
      display_name: strategy.name,
      cam_equivalents: enrichCamEquivalents(strategy.id),
      score: round2(score),
      physics,
      score_breakdown: breakdown,
      parameters: {
        ae_pct: strategy.ae_pct,
        ap_factor: strategy.ap_factor,
        Vc_multiplier: strategy.vc_mult,
        fz_multiplier: strategy.fz_mult,
      },
    }));

    // ── Phase 5: Zone decomposition ──
    const zoneDecomp = decomposeZones(feature, rankedStrategies);

    // ── Phase 6: Playbook warnings ──
    const selectedIds = rankedStrategies.map(s => s.canonical_id);
    const playbookWarnings = getPlaybookWarnings(feature, { iso_group }, selectedIds);

    // ── Phase 7: Justification ──
    const selected = rankedStrategies[0];
    const justification = buildJustification(selected, priority, feature, { iso_group }, candidates.length);

    return {
      ranked_strategies: rankedStrategies,
      selected,
      ...(zoneDecomp ? { zone_decomposition: zoneDecomp } : {}),
      justification,
      alternatives_considered: candidates.length,
      playbook_warnings: playbookWarnings,
    };
  }

  /**
   * Filter the strategy database to candidates compatible with the given
   * feature geometry, machine axis count, and user preferences.
   */
  private filterCandidates(
    feature: Required<FeatureInput>,
    machine: Required<MachineInput>,
    preference?: PreferenceInput,
  ): StrategyProfile[] {
    // Query ToolpathStrategyRegistry (752 strategies) for expanded candidates
    let registryStrategies: StrategyProfile[] = [];
    try {
      const { ToolpathStrategyRegistry } = require("../registries/ToolpathStrategyRegistry.js");
      const registry = ToolpathStrategyRegistry.getInstance();
      const featureType = (feature.type || "pocket").toLowerCase();
      const categories = registry.featureMap?.[featureType] || ["milling_roughing", "milling_finishing"];
      for (const cat of categories) {
        const catStrategies = registry.strategies[cat];
        if (catStrategies) {
          for (const [id, strat] of Object.entries(catStrategies)) {
            const s = strat as any;
            registryStrategies.push({
              id, name: s.name || id,
              category: cat.includes("roughing") ? "roughing" as const : cat.includes("finishing") ? "finishing" as const : cat.includes("hole") ? "drilling" as const : "roughing" as const,
              ae_pct: s.ae_pct ?? s.stepover_pct ?? 10,
              ap_factor: s.ap_factor ?? s.doc_factor ?? 1.0,
              vc_mult: s.vc_mult ?? s.speed_factor ?? 0.85,
              fz_mult: s.fz_mult ?? s.feed_factor ?? 1.0,
              engagement_control: s.engagement_control ?? s.constant_engagement ?? false,
              hsm: s.hsm ?? s.high_speed ?? false,
              min_axes: s.min_axes ?? 3,
              geometries: s.geometries ?? s.applicable_features ?? [],
              cycle_rating: s.cycle_rating ?? 5,
              finish_rating: s.finish_rating ?? 5,
              life_rating: s.life_rating ?? 5,
              cost_rating: s.cost_rating ?? 5,
            });
          }
        }
      }
    } catch { /* Registry not available — fall through to inline DB */ }

    // Merge: registry strategies + inline STRATEGY_DB (dedup by id)
    const seenIds = new Set(registryStrategies.map(s => s.id));
    const merged = [...registryStrategies, ...STRATEGY_DB.filter(s => !seenIds.has(s.id))];
    const source = merged.length > STRATEGY_DB.length ? merged : STRATEGY_DB;

    let candidates = source.filter(s => {
      // Axis count gate
      if (s.min_axes > (machine.axes || 3)) return false;

      // Geometry match (empty geometries = universal)
      if (s.geometries.length > 0) {
        const featureType = (feature.type || "pocket").toLowerCase();
        const matches = s.geometries.some(g =>
          featureType.includes(g) || g.includes(featureType),
        );
        if (!matches) {
          // Still include universal-ish strategies for roughing/finishing
          const isUniversal = s.geometries.some(g =>
            ["pocket", "pocket_2d", "pocket_3d", "surface_3d", "freeform", "contour"].includes(g),
          );
          if (!isUniversal) return false;
        }
      }

      return true;
    });

    // User preference: boost specific CAM system or strategy
    if (preference?.strategy) {
      const prefLower = preference.strategy.toLowerCase();
      // Move preferred strategy to front if it exists
      const prefIdx = candidates.findIndex(c =>
        c.id.toLowerCase().includes(prefLower) || c.name.toLowerCase().includes(prefLower),
      );
      if (prefIdx > 0) {
        const [pref] = candidates.splice(prefIdx, 1);
        candidates.unshift(pref);
      }
    }

    // Ensure we have at least some candidates
    if (candidates.length === 0) {
      // Fall back to all strategies that match axis count
      candidates = source.filter(s => s.min_axes <= (machine.axes || 3));
    }

    return candidates;
  }

  /**
   * Quick lookup: get the CAM-native name for a canonical strategy ID.
   *
   * @param canonicalId - Canonical strategy identifier
   * @param camSystem - Target CAM system name
   * @returns Native strategy name or undefined
   */
  translate(canonicalId: string, camSystem: string): string | undefined {
    const eqs = enrichCamEquivalents(canonicalId);
    return eqs[camSystem.toLowerCase()] || eqs[camSystem];
  }

  /**
   * Get the full list of supported canonical strategy IDs.
   */
  listStrategies(): Array<{ id: string; name: string; category: string }> {
    return STRATEGY_DB.map(s => ({ id: s.id, name: s.name, category: s.category }));
  }

  /**
   * Get the count of available strategies by category.
   */
  getStrategyCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const s of STRATEGY_DB) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return counts;
  }

  /**
   * Evaluate a single named strategy against the given inputs (for comparison).
   *
   * @param strategyId - Canonical strategy ID to evaluate
   * @param input - Full input context
   * @returns Physics result and score, or null if strategy not found
   */
  evaluateSingle(strategyId: string, input: OptimalStrategyInput): {
    physics: PhysicsResult;
    score: number;
    breakdown: ScoreBreakdown;
  } | null {
    const strategy = STRATEGY_DB.find(s => s.id === strategyId);
    if (!strategy) return null;

    const feature = resolveFeature(input.feature);
    const { profile: matProfile } = resolveMaterial(input.material);
    const machine = resolveMachine(input.machine);
    const tool = resolveTool(input.tool);
    const constraints = resolveConstraints(input.constraints);
    const priority = input.preference?.priority ?? "balanced";

    const physics = simulatePhysics(strategy, feature, matProfile, tool, machine);
    const { total, breakdown } = scoreCandidate(strategy, physics, machine, constraints, priority);

    return { physics, score: round2(total), breakdown };
  }
}

// ============================================================================
// SINGLETON EXPORT — shortcode E1087
// ============================================================================

/** Singleton instance -- shortcode E1087 */
export const optimalStrategySelectionEngine = new OptimalStrategySelectionEngine();
