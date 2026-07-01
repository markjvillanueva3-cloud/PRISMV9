/**
 * HyperMillKienzleMappingEngine — Kienzle Force Mapping Registry
 *
 * U-HKC40: Creates a mapping registry connecting all hyperMILL CAM cutting data
 * parameters to KienzleForceModelEngine computations. For each cutting data
 * parameter across all cycle type domains, the mapping defines which Kienzle
 * variable it drives, how force/power constrains its range, and which ISO group
 * material constants apply.
 *
 * Domains covered (8 total):
 *   drilling   — 15 cycle types × ~5 params  = ~75 mappings
 *   twoD       — 9 cycle types  × ~8 params  = ~72 mappings
 *   threeD     — 12 cycle types × ~8 params  = ~96 mappings
 *   fiveAxis   — 25 cycle types × ~5 params  = ~125 mappings
 *   turning    — 18 cycle types × ~6 params  = ~108 mappings
 *   probing    — 8 cycle types  × ~2 params  = ~16 mappings
 *   grinding   — 5 cycle types  × ~4 params  = ~20 mappings
 *   cuttingData — 6 profiles    × ~8 params  = ~48 mappings
 *
 * Total: >= 560 mappings
 *
 * @domain KienzleMapping
 * @milestone HM-KC-MS8/U-HKC40
 */

import { CANONICAL_KIENZLE, type ISOGroup } from "../../physics/constants.js";

// ── Types ──────────────────────────────────────────────────────────────────────

/** Kienzle input variable that the CAM parameter maps to */
export type KienzleInput = "ap" | "ae" | "fz" | "vc";

/** Constraint type describing how Kienzle force limits the parameter range */
export type ConstraintType = "force_limit" | "power_limit" | "torque_limit";

/** Confidence level for the mapping relationship */
export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Mapping from a hyperMILL CAM cutting data parameter to a KienzleForceModelEngine
 * computation. Each entry defines the physical relationship and constraint.
 */
export interface PhysicsMapping {
  /** Fully qualified parameter ID, e.g. "drilling.center_drill.spindle_speed" */
  parameterId: string;
  /** Cycle type domain, e.g. "drilling", "twoD", "threeD" */
  parameterDomain: string;
  /** Cycle type within the domain, e.g. "center_drill", "contour_milling" */
  cycleType: string;
  /** Raw parameter name, e.g. "spindle_speed", "feed_per_tooth" */
  parameterName: string;
  /**
   * Which Kienzle input variable this parameter maps to:
   *   ap = axial depth of cut [mm]
   *   ae = radial depth of cut / width of cut [mm]
   *   fz = feed per tooth [mm/tooth]
   *   vc = cutting speed [m/min]
   */
  kienzleInput: KienzleInput;
  /**
   * How the Kienzle force model constrains this parameter:
   *   force_limit  — Fc = kc1_1 * ap * fz^(1-mc) must not exceed machine rated force
   *   power_limit  — Pc = Fc * vc / 60000 must not exceed spindle power [kW]
   *   torque_limit — Mc = Fc * (D/2) must not exceed spindle torque [Nm]
   */
  constraintType: ConstraintType;
  /** Reference engine that performs the Kienzle computation */
  engineRef: "KienzleForceModelEngine";
  /** Kienzle formula applied for this mapping */
  computationMethod: string;
  /** ISO material groups that have validated kc1_1 / mc constants */
  isoGroups: ISOGroup[];
  /** Confidence in the mapping relationship */
  confidenceLevel: ConfidenceLevel;
  /** kc1_1 values for each ISO group (from CANONICAL_KIENZLE, validated at build time) */
  kc1_1ByGroup: Partial<Record<ISOGroup, number>>;
}

// ── Canonical kc1_1 snapshot (validated against constants.ts) ─────────────────

/**
 * Snapshot of CANONICAL_KIENZLE kc1_1 values referenced by mappings.
 * Imported live from physics/constants.ts — never hardcoded inline.
 * P=1800, M=2100, K=1100, N=700, S=2800, H=3200 (Sandvik/ISO 3685)
 */
export const KC1_1_SNAPSHOT: Record<ISOGroup, number> = {
  P: CANONICAL_KIENZLE.P.kc1_1,
  M: CANONICAL_KIENZLE.M.kc1_1,
  K: CANONICAL_KIENZLE.K.kc1_1,
  N: CANONICAL_KIENZLE.N.kc1_1,
  S: CANONICAL_KIENZLE.S.kc1_1,
  H: CANONICAL_KIENZLE.H.kc1_1,
};

/** All 6 ISO groups — used for standard milling/turning operations */
const ALL_GROUPS: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];
/** High-temperature alloy groups — for roughing/thermal-constrained ops */
const HIGH_TEMP_GROUPS: ISOGroup[] = ["P", "M", "S", "H"];
/** Soft material groups — for high-speed aluminum/non-ferrous ops */
const SOFT_GROUPS: ISOGroup[] = ["N", "K"];
/** Primary structural groups — steel and stainless */
const STEEL_GROUPS: ISOGroup[] = ["P", "M", "H"];

/** Build kc1_1 map for a set of ISO groups */
function kc1_1Map(groups: ISOGroup[]): Partial<Record<ISOGroup, number>> {
  const map: Partial<Record<ISOGroup, number>> = {};
  for (const g of groups) map[g] = KC1_1_SNAPSHOT[g];
  return map;
}

// ── Mapping builder helpers ────────────────────────────────────────────────────

/** Create a single PhysicsMapping entry */
function mapping(
  domain: string,
  cycleType: string,
  paramName: string,
  kienzleInput: KienzleInput,
  constraintType: ConstraintType,
  computationMethod: string,
  isoGroups: ISOGroup[],
  confidenceLevel: ConfidenceLevel
): PhysicsMapping {
  return {
    parameterId: `${domain}.${cycleType}.${paramName}`,
    parameterDomain: domain,
    cycleType,
    parameterName: paramName,
    kienzleInput,
    constraintType,
    engineRef: "KienzleForceModelEngine",
    computationMethod,
    isoGroups,
    confidenceLevel,
    kc1_1ByGroup: kc1_1Map(isoGroups),
  };
}

/** Standard computation method strings (Kienzle formula variants) */
const FORMULA = {
  Fc: "Fc = kc1_1 * b * h^(1-mc)",
  Fc_ap: "Fc = kc1_1 * ap * fz^(1-mc) [axial depth drives width b]",
  Fc_ae: "Fc = kc1_1 * ae * fz^(1-mc) [radial depth drives chip width]",
  Fc_fz: "Fc = kc1_1 * ap * fz^(1-mc) [fz = chip thickness h]",
  Pc_vc: "Pc = Fc * vc / 60000 [kW]; Fc = kc1_1 * ap * fz^(1-mc)",
  Mc_D: "Mc = Fc * (D/2); Fc = kc1_1 * ap * fz^(1-mc)",
  Mc_drill: "Mc = kc1_1 * (D/2) * fz^(1-mc) * ap [drilling torque model]",
  Pc_drill: "Pc = Mc * n / 9550 [kW]; Mc = kc1_1 * ap * fz^(1-mc) * (D/2)",
  Fc_turning: "Fc = kc1_1 * ap * f^(1-mc) [turning: f=feed/rev, ap=depth]",
  Pc_turning: "Pc = kc1_1 * ap * f^(1-mc) * vc / 60000",
  Fc_grinding: "Fc_g = kc1_1 * ae * vw / vc [grinding adaptation, reduced kc]",
  Pc_grinding: "Pc_g = kc1_1 * ae * bw * vw / (60 * ec) [specific energy model]",
} as const;

// ── DRILLING domain ────────────────────────────────────────────────────────────
// 15 cycle types × 5 params = 75 mappings

const DRILLING_CYCLE_TYPES = [
  "center_drill", "spot_drill", "twist_drill", "peck_drill", "chip_break_drill",
  "deep_hole_drill", "reamer", "boring_bar", "counter_bore", "counter_sink",
  "thread_mill_drill", "gun_drill", "ejector_drill", "trochoidal_drill", "form_drill",
];

function buildDrillingMappings(): PhysicsMapping[] {
  const maps: PhysicsMapping[] = [];
  for (const ct of DRILLING_CYCLE_TYPES) {
    // spindle_speed → vc (cutting speed drives power)
    maps.push(mapping("drilling", ct, "spindle_speed", "vc", "power_limit",
      FORMULA.Pc_drill, ALL_GROUPS, "high"));
    // feed_rate → fz (feed per rev approximated as fz)
    maps.push(mapping("drilling", ct, "feed_rate", "fz", "force_limit",
      FORMULA.Fc_fz, ALL_GROUPS, "high"));
    // feed_per_rev → fz (direct chip thickness)
    maps.push(mapping("drilling", ct, "feed_per_rev", "fz", "force_limit",
      FORMULA.Fc_fz, ALL_GROUPS, "high"));
    // depth_of_cut → ap (axial depth = drill depth per peck or total)
    maps.push(mapping("drilling", ct, "depth_of_cut", "ap", "torque_limit",
      FORMULA.Mc_drill, ALL_GROUPS, "high"));
    // peck_depth → ap (sub-depth for peck drilling)
    maps.push(mapping("drilling", ct, "peck_depth", "ap", "torque_limit",
      FORMULA.Mc_drill, STEEL_GROUPS, "medium"));
  }
  return maps;
}

// ── TWO-D domain ───────────────────────────────────────────────────────────────
// 9 cycle types × 8 params = 72 mappings

const TWOD_CYCLE_TYPES = [
  "contour_milling", "pocket_milling", "face_milling", "slot_milling",
  "chamfer_milling", "engraving", "thread_milling", "circular_interpolation", "keyway_milling",
];

function buildTwoDMappings(): PhysicsMapping[] {
  const maps: PhysicsMapping[] = [];
  for (const ct of TWOD_CYCLE_TYPES) {
    maps.push(mapping("twoD", ct, "spindle_speed", "vc", "power_limit",
      FORMULA.Pc_vc, ALL_GROUPS, "high"));
    maps.push(mapping("twoD", ct, "feed_rate", "fz", "force_limit",
      FORMULA.Fc_fz, ALL_GROUPS, "high"));
    maps.push(mapping("twoD", ct, "feed_per_tooth", "fz", "force_limit",
      FORMULA.Fc_fz, ALL_GROUPS, "high"));
    maps.push(mapping("twoD", ct, "depth_of_cut", "ap", "force_limit",
      FORMULA.Fc_ap, ALL_GROUPS, "high"));
    maps.push(mapping("twoD", ct, "stepover", "ae", "force_limit",
      FORMULA.Fc_ae, ALL_GROUPS, "high"));
    maps.push(mapping("twoD", ct, "stepdown", "ap", "force_limit",
      FORMULA.Fc_ap, ALL_GROUPS, "high"));
    maps.push(mapping("twoD", ct, "cutting_speed", "vc", "power_limit",
      FORMULA.Pc_vc, ALL_GROUPS, "high"));
    maps.push(mapping("twoD", ct, "plunge_feed", "fz", "force_limit",
      FORMULA.Fc_fz, HIGH_TEMP_GROUPS, "medium"));
  }
  return maps;
}

// ── THREE-D domain ─────────────────────────────────────────────────────────────
// 12 cycle types × 8 params = 96 mappings

const THREED_CYCLE_TYPES = [
  "z_level_roughing", "z_level_finishing", "contour_finishing", "parallel_finishing",
  "radial_finishing", "spiral_finishing", "pencil_milling", "rest_milling",
  "steep_shallow", "scallop_finishing", "morph_finishing", "equidistant_finishing",
];

function buildThreeDMappings(): PhysicsMapping[] {
  const maps: PhysicsMapping[] = [];
  for (const ct of THREED_CYCLE_TYPES) {
    maps.push(mapping("threeD", ct, "spindle_speed", "vc", "power_limit",
      FORMULA.Pc_vc, ALL_GROUPS, "high"));
    maps.push(mapping("threeD", ct, "feed_rate", "fz", "force_limit",
      FORMULA.Fc_fz, ALL_GROUPS, "high"));
    maps.push(mapping("threeD", ct, "feed_per_tooth", "fz", "force_limit",
      FORMULA.Fc_fz, ALL_GROUPS, "high"));
    maps.push(mapping("threeD", ct, "depth_of_cut", "ap", "force_limit",
      FORMULA.Fc_ap, ALL_GROUPS, "high"));
    maps.push(mapping("threeD", ct, "stepover", "ae", "force_limit",
      FORMULA.Fc_ae, ALL_GROUPS, "high"));
    maps.push(mapping("threeD", ct, "stepdown", "ap", "force_limit",
      FORMULA.Fc_ap, ALL_GROUPS, "high"));
    maps.push(mapping("threeD", ct, "cutting_speed", "vc", "power_limit",
      FORMULA.Pc_vc, ALL_GROUPS, "high"));
    maps.push(mapping("threeD", ct, "scallop_height", "ae", "force_limit",
      FORMULA.Fc_ae, ALL_GROUPS, "medium"));
  }
  return maps;
}

// ── FIVE-AXIS domain ───────────────────────────────────────────────────────────
// 25 cycle types × 5 params = 125 mappings

const FIVEAXIS_CYCLE_TYPES = [
  "five_axis_contour", "five_axis_z_level", "five_axis_planar", "five_axis_swarf",
  "five_axis_flank", "five_axis_trimming", "five_axis_pencil", "five_axis_rest",
  "five_axis_tube", "five_axis_impeller", "five_axis_blisk", "five_axis_port",
  "five_axis_steep_shallow", "five_axis_morph", "five_axis_geodesic",
  "five_axis_spiral", "five_axis_parallel", "five_axis_radial", "five_axis_equidistant",
  "five_axis_scallop", "tilted_plane", "five_axis_turning", "five_axis_drilling",
  "five_axis_deburring", "five_axis_trimming_advanced",
];

function buildFiveAxisMappings(): PhysicsMapping[] {
  const maps: PhysicsMapping[] = [];
  for (const ct of FIVEAXIS_CYCLE_TYPES) {
    maps.push(mapping("fiveAxis", ct, "spindle_speed", "vc", "power_limit",
      FORMULA.Pc_vc, ALL_GROUPS, "high"));
    maps.push(mapping("fiveAxis", ct, "feed_rate", "fz", "force_limit",
      FORMULA.Fc_fz, ALL_GROUPS, "high"));
    maps.push(mapping("fiveAxis", ct, "feed_per_tooth", "fz", "force_limit",
      FORMULA.Fc_fz, ALL_GROUPS, "high"));
    maps.push(mapping("fiveAxis", ct, "depth_of_cut", "ap", "force_limit",
      FORMULA.Fc_ap, ALL_GROUPS, "high"));
    maps.push(mapping("fiveAxis", ct, "stepover", "ae", "force_limit",
      FORMULA.Fc_ae, ALL_GROUPS, "high"));
  }
  return maps;
}

// ── TURNING domain ─────────────────────────────────────────────────────────────
// 18 cycle types × 6 params = 108 mappings

const TURNING_CYCLE_TYPES = [
  "od_turning", "id_turning", "facing", "parting", "grooving",
  "threading_od", "threading_id", "boring", "profiling", "roughing_turn",
  "finishing_turn", "copy_turning", "taper_turning", "form_turning",
  "knurling", "polygon_turning", "eccentric_turning", "hard_turning",
];

function buildTurningMappings(): PhysicsMapping[] {
  const maps: PhysicsMapping[] = [];
  for (const ct of TURNING_CYCLE_TYPES) {
    maps.push(mapping("turning", ct, "spindle_speed", "vc", "power_limit",
      FORMULA.Pc_turning, ALL_GROUPS, "high"));
    maps.push(mapping("turning", ct, "cutting_speed", "vc", "power_limit",
      FORMULA.Pc_turning, ALL_GROUPS, "high"));
    maps.push(mapping("turning", ct, "feed_rate", "fz", "force_limit",
      FORMULA.Fc_turning, ALL_GROUPS, "high"));
    maps.push(mapping("turning", ct, "feed_per_rev", "fz", "force_limit",
      FORMULA.Fc_turning, ALL_GROUPS, "high"));
    maps.push(mapping("turning", ct, "depth_of_cut", "ap", "force_limit",
      FORMULA.Fc_turning, ALL_GROUPS, "high"));
    maps.push(mapping("turning", ct, "stepdown", "ap", "force_limit",
      FORMULA.Fc_turning, ALL_GROUPS, "high"));
  }
  return maps;
}

// ── PROBING domain ─────────────────────────────────────────────────────────────
// 8 cycle types × 2 params = 16 mappings
// Probing uses light contact forces — only vc and fz are Kienzle-relevant

const PROBING_CYCLE_TYPES = [
  "single_surface_probe", "bore_probe", "boss_probe", "pocket_probe",
  "corner_probe", "angle_probe", "web_probe", "length_probe",
];

function buildProbingMappings(): PhysicsMapping[] {
  const maps: PhysicsMapping[] = [];
  for (const ct of PROBING_CYCLE_TYPES) {
    // probe approach speed → vc (contact force constraint)
    maps.push(mapping("probing", ct, "approach_speed", "vc", "force_limit",
      FORMULA.Fc, STEEL_GROUPS, "low"));
    // probe feed → fz (contact chip-equivalent, very low)
    maps.push(mapping("probing", ct, "probe_feed", "fz", "force_limit",
      FORMULA.Fc_fz, STEEL_GROUPS, "low"));
  }
  return maps;
}

// ── GRINDING domain ────────────────────────────────────────────────────────────
// 5 cycle types × 4 params = 20 mappings

const GRINDING_CYCLE_TYPES = [
  "surface_grinding", "cylindrical_grinding", "profile_grinding",
  "thread_grinding", "gear_grinding",
];

function buildGrindingMappings(): PhysicsMapping[] {
  const maps: PhysicsMapping[] = [];
  for (const ct of GRINDING_CYCLE_TYPES) {
    // wheel speed → vc
    maps.push(mapping("grinding", ct, "wheel_speed", "vc", "power_limit",
      FORMULA.Pc_grinding, STEEL_GROUPS, "medium"));
    // workpiece feed → fz (equivalent chip thickness)
    maps.push(mapping("grinding", ct, "workpiece_feed", "fz", "force_limit",
      FORMULA.Fc_grinding, STEEL_GROUPS, "medium"));
    // depth of cut → ae (radial infeed for grinding)
    maps.push(mapping("grinding", ct, "depth_of_cut", "ae", "power_limit",
      FORMULA.Fc_grinding, STEEL_GROUPS, "medium"));
    // dressing feed → fz (dressing chip thickness equivalent)
    maps.push(mapping("grinding", ct, "dressing_feed", "fz", "force_limit",
      FORMULA.Fc_grinding, STEEL_GROUPS, "low"));
  }
  return maps;
}

// ── CUTTING DATA profiles domain ───────────────────────────────────────────────
// 6 profile types × 8 params = 48 mappings
// These are technology database profiles, not individual cycles

const CUTTING_DATA_PROFILES = [
  "roughing_profile", "semi_finish_profile", "finishing_profile",
  "high_speed_profile", "hard_material_profile", "soft_material_profile",
];

function buildCuttingDataMappings(): PhysicsMapping[] {
  const maps: PhysicsMapping[] = [];
  for (const ct of CUTTING_DATA_PROFILES) {
    maps.push(mapping("cuttingData", ct, "spindle_speed", "vc", "power_limit",
      FORMULA.Pc_vc, ALL_GROUPS, "high"));
    maps.push(mapping("cuttingData", ct, "feed_rate", "fz", "force_limit",
      FORMULA.Fc_fz, ALL_GROUPS, "high"));
    maps.push(mapping("cuttingData", ct, "feed_per_tooth", "fz", "force_limit",
      FORMULA.Fc_fz, ALL_GROUPS, "high"));
    maps.push(mapping("cuttingData", ct, "depth_of_cut", "ap", "force_limit",
      FORMULA.Fc_ap, ALL_GROUPS, "high"));
    maps.push(mapping("cuttingData", ct, "stepover", "ae", "force_limit",
      FORMULA.Fc_ae, ALL_GROUPS, "high"));
    maps.push(mapping("cuttingData", ct, "stepdown", "ap", "force_limit",
      FORMULA.Fc_ap, ALL_GROUPS, "high"));
    maps.push(mapping("cuttingData", ct, "cutting_speed", "vc", "power_limit",
      FORMULA.Pc_vc, ALL_GROUPS, "high"));
    maps.push(mapping("cuttingData", ct, "tool_diameter", "ae", "force_limit",
      FORMULA.Fc_ae, ALL_GROUPS, "medium"));
  }
  return maps;
}

// ── Assemble all mappings ──────────────────────────────────────────────────────

/**
 * All Kienzle force physics mappings across all hyperMILL cutting data domains.
 * 560+ entries connecting CAM parameters to KienzleForceModelEngine inputs.
 *
 * Sources:
 *   - Kienzle/Victor (1952) — original chip thickness force model
 *   - Altintas "Manufacturing Automation" (2012) — milling force model
 *   - Sandvik Coromant General Turning (2024) — kc1_1 validation
 *   - ISO 3685 (1993) — tool life testing and force measurement standards
 */
export const KIENZLE_MAPPINGS: PhysicsMapping[] = [
  ...buildDrillingMappings(),
  ...buildTwoDMappings(),
  ...buildThreeDMappings(),
  ...buildFiveAxisMappings(),
  ...buildTurningMappings(),
  ...buildProbingMappings(),
  ...buildGrindingMappings(),
  ...buildCuttingDataMappings(),
];

// ── Summary ────────────────────────────────────────────────────────────────────

/** Aggregated summary of KIENZLE_MAPPINGS */
export interface KienzleMappingSummary {
  /** Total number of physics mappings */
  totalMappings: number;
  /** Mapping count per domain */
  byDomain: Record<string, number>;
  /** Mapping count per constraint type */
  byConstraintType: Record<ConstraintType, number>;
  /** Mapping count per ISO group */
  byIsoGroup: Record<ISOGroup, number>;
  /** Mapping count per Kienzle input variable */
  byKienzleInput: Record<KienzleInput, number>;
  /** Mapping count per confidence level */
  byConfidence: Record<ConfidenceLevel, number>;
}

function buildSummary(mappings: PhysicsMapping[]): KienzleMappingSummary {
  const byDomain: Record<string, number> = {};
  const byConstraintType: Record<ConstraintType, number> = {
    force_limit: 0,
    power_limit: 0,
    torque_limit: 0,
  };
  const byIsoGroup: Record<ISOGroup, number> = {
    P: 0, M: 0, K: 0, N: 0, S: 0, H: 0,
  };
  const byKienzleInput: Record<KienzleInput, number> = {
    ap: 0, ae: 0, fz: 0, vc: 0,
  };
  const byConfidence: Record<ConfidenceLevel, number> = {
    high: 0, medium: 0, low: 0,
  };

  for (const m of mappings) {
    byDomain[m.parameterDomain] = (byDomain[m.parameterDomain] ?? 0) + 1;
    byConstraintType[m.constraintType]++;
    byKienzleInput[m.kienzleInput]++;
    byConfidence[m.confidenceLevel]++;
    for (const g of m.isoGroups) {
      byIsoGroup[g]++;
    }
  }

  return {
    totalMappings: mappings.length,
    byDomain,
    byConstraintType,
    byIsoGroup,
    byKienzleInput,
    byConfidence,
  };
}

/**
 * Pre-computed summary of all Kienzle force mappings.
 * Available without instantiating the engine class.
 */
export const KIENZLE_MAPPING_SUMMARY: KienzleMappingSummary = buildSummary(KIENZLE_MAPPINGS);

// ── Engine class ───────────────────────────────────────────────────────────────

export class HyperMillKienzleMappingEngine {
  /**
   * Returns all physics mappings for a given parameter domain.
   * @param domain - Domain name: "drilling" | "twoD" | "threeD" | "fiveAxis" |
   *                             "turning" | "probing" | "grinding" | "cuttingData"
   * @returns Array of PhysicsMapping entries for the domain
   */
  getMappingsForDomain(domain: string): PhysicsMapping[] {
    return KIENZLE_MAPPINGS.filter((m) => m.parameterDomain === domain);
  }

  /**
   * Returns all physics mappings for a specific cycle type within a domain.
   * @param domain - Domain name
   * @param cycleType - Cycle type within the domain
   * @returns Array of PhysicsMapping entries for the cycle type
   */
  getMappingsForCycleType(domain: string, cycleType: string): PhysicsMapping[] {
    return KIENZLE_MAPPINGS.filter(
      (m) => m.parameterDomain === domain && m.cycleType === cycleType
    );
  }

  /**
   * Looks up a mapping by its fully qualified parameterId.
   * @param parameterId - e.g. "drilling.center_drill.spindle_speed"
   * @returns The PhysicsMapping or undefined if not found
   */
  getMappingById(parameterId: string): PhysicsMapping | undefined {
    return KIENZLE_MAPPINGS.find((m) => m.parameterId === parameterId);
  }

  /**
   * Returns all mappings constrained by a given ISO group.
   * @param group - ISO material group: "P" | "M" | "K" | "N" | "S" | "H"
   * @returns Array of PhysicsMapping entries that include the group
   */
  getMappingsForIsoGroup(group: ISOGroup): PhysicsMapping[] {
    return KIENZLE_MAPPINGS.filter((m) => m.isoGroups.includes(group));
  }

  /**
   * Returns all mappings for a specific Kienzle input variable.
   * @param input - Kienzle variable: "ap" | "ae" | "fz" | "vc"
   * @returns Array of PhysicsMapping entries for the variable
   */
  getMappingsForKienzleInput(input: KienzleInput): PhysicsMapping[] {
    return KIENZLE_MAPPINGS.filter((m) => m.kienzleInput === input);
  }

  /**
   * Returns all mappings for a given constraint type.
   * @param constraintType - "force_limit" | "power_limit" | "torque_limit"
   * @returns Array of PhysicsMapping entries with the constraint type
   */
  getMappingsForConstraintType(constraintType: ConstraintType): PhysicsMapping[] {
    return KIENZLE_MAPPINGS.filter((m) => m.constraintType === constraintType);
  }

  /**
   * Returns the aggregate summary statistics for all mappings.
   * @returns KienzleMappingSummary with counts by domain, constraint, ISO group, etc.
   */
  getSummary(): KienzleMappingSummary {
    return KIENZLE_MAPPING_SUMMARY;
  }

  /**
   * Returns the canonical kc1_1 values imported from physics/constants.ts.
   * P=1800, M=2100, K=1100, N=700, S=2800, H=3200 (Sandvik/ISO 3685)
   * @returns Record of ISOGroup to kc1_1 specific cutting force [N/mm²]
   */
  getKc1_1Values(): Record<ISOGroup, number> {
    return KC1_1_SNAPSHOT;
  }
}

/** Singleton export */
export const kienzleMappingEngine = new HyperMillKienzleMappingEngine();
