/**
 * HyperMillSpeedFeedMappingEngine — Speed/Feed + SLD Parameter Mapping Registry
 *
 * U-HKC41: Maps HyperMill cutting parameter IDs to their target physics engines:
 *   - SpeedFeedOrchestratorEngine (8 resolver types, Monte Carlo UQ)
 *   - ChatterStabilityLobeEngine (3 stability zones)
 *
 * Covers all HyperMill CAM domains:
 *   - drilling  (15 operation types × ~4 S/F params = ~60 mappings)
 *   - twoD      (9 operation types × ~5 S/F params + ~2 SLD = ~63 mappings)
 *   - threeD    (12 operation types × ~5 S/F + ~2 SLD = ~84 mappings)
 *   - fiveAxis  (25 operation types × ~4 S/F + ~2 SLD = ~150 mappings)
 *   - turning   (18 operation types × ~4 S/F + ~2 SLD = ~108 mappings)
 *   - cuttingData (6 profiles × ~6 S/F params = ~36 mappings)
 *
 * Grand total >= 470 mappings (>= 350 S/F, >= 120 SLD).
 *
 * @domain SpeedFeed-SLD-Mapping
 * @milestone HM-KC-MS8/U-HKC41
 */

// ── Types ──────────────────────────────────────────────────────────────────────

/** The two valid target physics engines for S/F and SLD resolution */
export type SpeedFeedTargetEngine =
  | "SpeedFeedOrchestratorEngine"
  | "ChatterStabilityLobeEngine";

/**
 * One of the 8 resolver strategies inside SpeedFeedOrchestratorEngine.
 * Source: SpeedFeedOrchestratorEngine resolver registry (2,851 LOC).
 */
export type SFResolverType =
  | "kienzle"
  | "empirical"
  | "catalog"
  | "hybrid"
  | "monteCarlo"
  | "adaptive"
  | "taylorsLife"
  | "thermal";

/** Stability zone classification from ChatterStabilityLobeEngine SLD output */
export type StabilityZone = "stable" | "marginal" | "unstable";

/**
 * Maps a single HyperMill CAM parameter to a target physics engine.
 *
 * S/F mappings target SpeedFeedOrchestratorEngine and always set monteCarloUQ=true.
 * SLD mappings target ChatterStabilityLobeEngine and carry a stabilityZone hint.
 */
export interface SpeedFeedMapping {
  /** HyperMill parameter ID, e.g. "drilling.center_drill.spindle_speed" */
  parameterId: string;
  /** Domain name matching HyperMill CAM module */
  parameterDomain: string;
  /** Physics engine that resolves this parameter */
  targetEngine: SpeedFeedTargetEngine;
  /** For S/F mappings: which of the 8 resolver strategies applies */
  resolverType?: SFResolverType;
  /** For SLD mappings: initial stability zone classification */
  stabilityZone?: StabilityZone;
  /** Inputs the target engine requires to resolve this parameter */
  inputParams: string[];
  /** What the engine computes for this parameter */
  outputMapping: string;
  /** Confidence level of the mapping recommendation */
  confidenceLevel: "high" | "medium" | "low";
  /** Whether Monte Carlo uncertainty quantification applies (always true for S/F) */
  monteCarloUQ: boolean;
}

/** Aggregated summary of all mappings in this registry */
export interface SpeedFeedMappingSummary {
  totalMappings: number;
  sfMappings: number;
  sldMappings: number;
  byDomain: Record<string, number>;
  byResolver: Record<string, number>;
  byStabilityZone: Record<string, number>;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Build a S/F mapping entry */
function sfMap(
  parameterId: string,
  domain: string,
  resolverType: SFResolverType,
  inputParams: string[],
  outputMapping: string,
  confidenceLevel: "high" | "medium" | "low" = "high"
): SpeedFeedMapping {
  return {
    parameterId,
    parameterDomain: domain,
    targetEngine: "SpeedFeedOrchestratorEngine",
    resolverType,
    inputParams,
    outputMapping,
    confidenceLevel,
    monteCarloUQ: true,
  };
}

/** Build an SLD/Stability mapping entry */
function sldMap(
  parameterId: string,
  domain: string,
  stabilityZone: StabilityZone,
  inputParams: string[],
  outputMapping: string,
  confidenceLevel: "high" | "medium" | "low" = "high"
): SpeedFeedMapping {
  return {
    parameterId,
    parameterDomain: domain,
    targetEngine: "ChatterStabilityLobeEngine",
    stabilityZone,
    inputParams,
    outputMapping,
    confidenceLevel,
    monteCarloUQ: false,
  };
}

// ── Standard input param sets ──────────────────────────────────────────────────

const SF_BASE = ["material", "tool_diameter", "operation_type"];
const SF_DRILL = [...SF_BASE, "drill_point_angle", "coolant_type"];
const SF_MILL2D = [...SF_BASE, "axial_depth", "radial_depth", "number_of_flutes"];
const SF_MILL3D = [...SF_BASE, "axial_depth", "radial_depth", "stepover_pct", "surface_finish_target"];
const SF_5AXIS = [...SF_BASE, "tilt_angle", "lead_angle", "axial_depth", "radial_depth"];
const SF_TURN = [...SF_BASE, "insert_geometry", "cutting_depth", "feed_per_rev", "nose_radius"];
const SF_CD = ["material", "tool_grade", "iso_group", "operation_class", "coolant_pressure"];

const SLD_INPUTS = ["spindle_speed", "depth_of_cut", "tool_overhang", "material", "tool_diameter"];

// ── DRILLING DOMAIN — 15 op types × 4 S/F params = 60 S/F mappings ────────────

const DRILLING_OPS = [
  "center_drill", "spot_drill", "twist_drill", "deep_hole_drill",
  "gun_drill", "step_drill", "indexable_drill", "solid_carbide_drill",
  "trepanning", "core_drill", "spade_drill", "ejector_drill",
  "bta_drill", "countersink", "counterbore",
];

const DRILLING_SF: SpeedFeedMapping[] = DRILLING_OPS.flatMap((op) => [
  sfMap(
    `drilling.${op}.spindle_speed`,
    "drilling",
    "kienzle",
    SF_DRILL,
    "recommended_vc",
    "high"
  ),
  sfMap(
    `drilling.${op}.feed_per_rev`,
    "drilling",
    "empirical",
    SF_DRILL,
    "recommended_fz",
    "high"
  ),
  sfMap(
    `drilling.${op}.cutting_speed`,
    "drilling",
    "catalog",
    [...SF_DRILL, "tool_grade"],
    "recommended_vc",
    "high"
  ),
  sfMap(
    `drilling.${op}.peck_increment`,
    "drilling",
    "adaptive",
    [...SF_DRILL, "hole_depth_diameter_ratio"],
    "recommended_fz",
    "medium"
  ),
]);

// ── 2D DOMAIN — 9 op types × 5 S/F + 2 SLD = 63 mappings ────────────────────

const TWO_D_OPS = [
  "face_mill", "shoulder_mill", "slot_mill", "profile_mill",
  "pocket_mill", "chamfer_mill", "t_slot_mill", "thread_mill", "engrave",
];

const TWO_D_SF: SpeedFeedMapping[] = TWO_D_OPS.flatMap((op) => [
  sfMap(`twoD.${op}.spindle_speed`, "twoD", "kienzle", SF_MILL2D, "recommended_vc"),
  sfMap(`twoD.${op}.feed_per_tooth`, "twoD", "kienzle", SF_MILL2D, "recommended_fz"),
  sfMap(`twoD.${op}.cutting_speed`, "twoD", "catalog", [...SF_MILL2D, "tool_grade"], "recommended_vc"),
  sfMap(`twoD.${op}.axial_depth_of_cut`, "twoD", "hybrid", SF_MILL2D, "critical_depth", "medium"),
  sfMap(`twoD.${op}.radial_depth_of_cut`, "twoD", "monteCarlo", SF_MILL2D, "recommended_fz", "medium"),
]);

const TWO_D_SLD: SpeedFeedMapping[] = TWO_D_OPS.flatMap((op) => [
  sldMap(`twoD.${op}.spindle_speed_sld`, "twoD", "stable", SLD_INPUTS, "stable_rpm_zones"),
  sldMap(`twoD.${op}.depth_of_cut_sld`, "twoD", "marginal", SLD_INPUTS, "critical_depth"),
]);

// ── 3D DOMAIN — 12 op types × 5 S/F + 2 SLD = 84 mappings ───────────────────

const THREE_D_OPS = [
  "z_level_rough", "z_level_finish", "scallop", "constant_z",
  "pencil_trace", "rest_machining", "hybrid_finish", "spiral_finish",
  "radial_finish", "equidistant_finish", "plunge_rough", "trochoidal_rough",
];

const THREE_D_SF: SpeedFeedMapping[] = THREE_D_OPS.flatMap((op) => [
  sfMap(`threeD.${op}.spindle_speed`, "threeD", "kienzle", SF_MILL3D, "recommended_vc"),
  sfMap(`threeD.${op}.feed_per_tooth`, "threeD", "kienzle", SF_MILL3D, "recommended_fz"),
  sfMap(`threeD.${op}.cutting_speed`, "threeD", "catalog", [...SF_MILL3D, "tool_grade"], "recommended_vc"),
  sfMap(`threeD.${op}.axial_depth`, "threeD", "adaptive", SF_MILL3D, "critical_depth", "medium"),
  sfMap(`threeD.${op}.stepover`, "threeD", "monteCarlo", SF_MILL3D, "recommended_fz", "medium"),
]);

const THREE_D_SLD: SpeedFeedMapping[] = THREE_D_OPS.flatMap((op) => [
  sldMap(`threeD.${op}.spindle_speed_sld`, "threeD", "stable", SLD_INPUTS, "stable_rpm_zones"),
  sldMap(`threeD.${op}.depth_sld`, "threeD", "marginal", SLD_INPUTS, "critical_depth"),
]);

// ── 5-AXIS DOMAIN — 25 op types × 4 S/F + 2 SLD = 150 mappings ──────────────

const FIVE_AXIS_OPS = [
  "swarf_mill", "flank_mill", "tube_finish", "blade_roughing", "blade_finishing",
  "port_roughing", "port_finishing", "impeller_rough", "impeller_finish",
  "pencil_5ax", "iso_scallop_5ax", "geodesic_5ax", "five_axis_contour",
  "five_axis_swarf", "five_axis_flank", "five_axis_orbit", "five_axis_spiral",
  "five_axis_plunge", "five_axis_trochoidal", "simultaneous_5ax",
  "indexed_5ax_rough", "indexed_5ax_finish", "cylinder_wrap", "cone_wrap", "barrel_cutter",
];

const FIVE_AXIS_SF: SpeedFeedMapping[] = FIVE_AXIS_OPS.flatMap((op) => [
  sfMap(`fiveAxis.${op}.spindle_speed`, "fiveAxis", "kienzle", SF_5AXIS, "recommended_vc"),
  sfMap(`fiveAxis.${op}.feed_per_tooth`, "fiveAxis", "empirical", SF_5AXIS, "recommended_fz"),
  sfMap(`fiveAxis.${op}.cutting_speed`, "fiveAxis", "taylorsLife", [...SF_5AXIS, "tool_grade"], "recommended_vc"),
  sfMap(`fiveAxis.${op}.axial_depth`, "fiveAxis", "thermal", SF_5AXIS, "critical_depth", "medium"),
]);

const FIVE_AXIS_SLD: SpeedFeedMapping[] = FIVE_AXIS_OPS.flatMap((op) => [
  sldMap(`fiveAxis.${op}.spindle_speed_sld`, "fiveAxis", "stable", SLD_INPUTS, "stable_rpm_zones"),
  sldMap(`fiveAxis.${op}.depth_sld`, "fiveAxis", "unstable", [...SLD_INPUTS, "tilt_angle"], "critical_depth"),
]);

// ── TURNING DOMAIN — 18 op types × 4 S/F + 2 SLD = 108 mappings ─────────────

const TURNING_OPS = [
  "external_rough", "external_finish", "internal_rough", "internal_finish",
  "face_rough", "face_finish", "grooving_external", "grooving_internal",
  "grooving_face", "parting", "threading_external", "threading_internal",
  "boring_rough", "boring_finish", "taper_turn", "form_turn",
  "back_turn", "profiling",
];

const TURNING_SF: SpeedFeedMapping[] = TURNING_OPS.flatMap((op) => [
  sfMap(`turning.${op}.spindle_speed`, "turning", "kienzle", SF_TURN, "recommended_vc"),
  sfMap(`turning.${op}.feed_per_rev`, "turning", "kienzle", SF_TURN, "recommended_fz"),
  sfMap(`turning.${op}.cutting_speed`, "turning", "taylorsLife", [...SF_TURN, "tool_grade"], "recommended_vc"),
  sfMap(`turning.${op}.depth_of_cut`, "turning", "hybrid", SF_TURN, "critical_depth", "medium"),
]);

const TURNING_SLD: SpeedFeedMapping[] = TURNING_OPS.flatMap((op) => [
  sldMap(`turning.${op}.spindle_speed_sld`, "turning", "stable", SLD_INPUTS, "stable_rpm_zones"),
  sldMap(`turning.${op}.depth_sld`, "turning", "marginal", [...SLD_INPUTS, "insert_geometry"], "critical_depth"),
]);

// ── CUTTING DATA DOMAIN — 6 profiles × 6 S/F params = 36 mappings ────────────

const CUTTING_DATA_PROFILES = [
  "roughing_aggressive", "roughing_standard", "semi_finish",
  "finish_standard", "finish_mirror", "high_speed_machining",
];

const CUTTING_DATA_SF: SpeedFeedMapping[] = CUTTING_DATA_PROFILES.flatMap((profile) => [
  sfMap(`cuttingData.${profile}.spindle_speed`, "cuttingData", "catalog", SF_CD, "recommended_vc"),
  sfMap(`cuttingData.${profile}.feed_per_tooth`, "cuttingData", "catalog", SF_CD, "recommended_fz"),
  sfMap(`cuttingData.${profile}.cutting_speed`, "cuttingData", "kienzle", SF_CD, "recommended_vc"),
  sfMap(`cuttingData.${profile}.axial_depth`, "cuttingData", "empirical", [...SF_CD, "operation_type"], "critical_depth", "medium"),
  sfMap(`cuttingData.${profile}.radial_depth`, "cuttingData", "hybrid", [...SF_CD, "operation_type"], "recommended_fz", "medium"),
  sfMap(`cuttingData.${profile}.tool_life_target`, "cuttingData", "taylorsLife", [...SF_CD, "tool_grade", "vc"], "recommended_vc", "high"),
]);

// ── Master array ───────────────────────────────────────────────────────────────

/**
 * All Speed/Feed + SLD mappings for HyperMill parameters.
 *
 * Composition:
 *  - S/F (SpeedFeedOrchestratorEngine): drilling(60) + twoD(45) + threeD(60) + fiveAxis(100) + turning(72) + cuttingData(36) = 373
 *  - SLD (ChatterStabilityLobeEngine):  twoD(18) + threeD(24) + fiveAxis(50) + turning(36) = 128
 *  Total: 501 mappings
 */
export const SPEEDFEED_MAPPINGS: SpeedFeedMapping[] = [
  // S/F mappings
  ...DRILLING_SF,      // 60
  ...TWO_D_SF,         // 45
  ...THREE_D_SF,       // 60
  ...FIVE_AXIS_SF,     // 100
  ...TURNING_SF,       // 72
  ...CUTTING_DATA_SF,  // 36
  // SLD mappings
  ...TWO_D_SLD,        // 18
  ...THREE_D_SLD,      // 24
  ...FIVE_AXIS_SLD,    // 50
  ...TURNING_SLD,      // 36
];

// ── Summary ────────────────────────────────────────────────────────────────────

/**
 * Aggregated statistics over the SPEEDFEED_MAPPINGS registry.
 * Computed once at module load — zero runtime overhead.
 */
export const SPEEDFEED_MAPPING_SUMMARY: SpeedFeedMappingSummary = (() => {
  const sfMappings = SPEEDFEED_MAPPINGS.filter(
    (m) => m.targetEngine === "SpeedFeedOrchestratorEngine"
  ).length;
  const sldMappings = SPEEDFEED_MAPPINGS.filter(
    (m) => m.targetEngine === "ChatterStabilityLobeEngine"
  ).length;

  const byDomain: Record<string, number> = {};
  const byResolver: Record<string, number> = {};
  const byStabilityZone: Record<string, number> = {};

  for (const m of SPEEDFEED_MAPPINGS) {
    byDomain[m.parameterDomain] = (byDomain[m.parameterDomain] ?? 0) + 1;
    if (m.resolverType) {
      byResolver[m.resolverType] = (byResolver[m.resolverType] ?? 0) + 1;
    }
    if (m.stabilityZone) {
      byStabilityZone[m.stabilityZone] = (byStabilityZone[m.stabilityZone] ?? 0) + 1;
    }
  }

  return {
    totalMappings: SPEEDFEED_MAPPINGS.length,
    sfMappings,
    sldMappings,
    byDomain,
    byResolver,
    byStabilityZone,
  };
})();

// ── Engine class ───────────────────────────────────────────────────────────────

/**
 * HyperMillSpeedFeedMappingEngine
 *
 * Provides query methods over the SPEEDFEED_MAPPINGS registry.
 * All methods are pure (no side effects, no I/O).
 */
export class HyperMillSpeedFeedMappingEngine {
  /**
   * Returns all mappings for a given HyperMill domain.
   * @param domain - e.g. "drilling", "twoD", "threeD", "fiveAxis", "turning", "cuttingData"
   * @returns Filtered array of SpeedFeedMapping entries
   */
  getMappingsByDomain(domain: string): SpeedFeedMapping[] {
    return SPEEDFEED_MAPPINGS.filter((m) => m.parameterDomain === domain);
  }

  /**
   * Returns all S/F mappings for a specific resolver type.
   * @param resolverType - One of the 8 SpeedFeedOrchestratorEngine resolver strategies
   * @returns Filtered array of SpeedFeedMapping entries
   */
  getMappingsByResolver(resolverType: SFResolverType): SpeedFeedMapping[] {
    return SPEEDFEED_MAPPINGS.filter((m) => m.resolverType === resolverType);
  }

  /**
   * Returns all SLD mappings for a given stability zone.
   * @param zone - "stable" | "marginal" | "unstable"
   * @returns Filtered array of SpeedFeedMapping entries
   */
  getMappingsByStabilityZone(zone: StabilityZone): SpeedFeedMapping[] {
    return SPEEDFEED_MAPPINGS.filter((m) => m.stabilityZone === zone);
  }

  /**
   * Looks up a single mapping by its exact parameterId.
   * @param parameterId - Full dotted parameter ID, e.g. "drilling.center_drill.spindle_speed"
   * @returns The matching SpeedFeedMapping or undefined if not found
   */
  getMapping(parameterId: string): SpeedFeedMapping | undefined {
    return SPEEDFEED_MAPPINGS.find((m) => m.parameterId === parameterId);
  }

  /**
   * Returns all mappings targeting a specific engine.
   * @param engine - "SpeedFeedOrchestratorEngine" | "ChatterStabilityLobeEngine"
   * @returns Filtered array of SpeedFeedMapping entries
   */
  getMappingsByEngine(engine: SpeedFeedTargetEngine): SpeedFeedMapping[] {
    return SPEEDFEED_MAPPINGS.filter((m) => m.targetEngine === engine);
  }

  /**
   * Returns the pre-computed summary statistics for the entire registry.
   * @returns SpeedFeedMappingSummary with totals and breakdowns
   */
  getSummary(): SpeedFeedMappingSummary {
    return SPEEDFEED_MAPPING_SUMMARY;
  }
}

/** Singleton export — use this in all callers */
export const speedFeedMappingEngine = new HyperMillSpeedFeedMappingEngine();
