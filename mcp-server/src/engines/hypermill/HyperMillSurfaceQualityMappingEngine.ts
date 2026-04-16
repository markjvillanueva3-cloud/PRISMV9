/**
 * HyperMillSurfaceQualityMappingEngine — Surface Quality + Safety Mapping Registry
 *
 * U-HKC43: Maps hyperMILL CAM parameters to downstream surface quality and safety
 * physics engines. Each mapping captures:
 *   - Which CAM parameter drives surface quality (Ra/Rz/scallop/residual stress)
 *   - Which safety hook enforces a hard limit (collision, breakage, over-travel, overspeed)
 *   - The governing physics formula (e.g. Ra = f²/(32R) for turning)
 *
 * Target engines:
 *   - SurfaceFinishPredictorEngine  — Ra/Rz via kinematic and stochastic models
 *   - SurfaceIntegrityEngine        — white layer, work hardening, microstructure
 *   - ResidualStressPredictionEngine — residual stress from thermal + mechanical load
 *
 * Coverage:
 *   Surface quality mappings:
 *     turning feed/nose_radius      → Ra prediction:   18 types × 3 = 54
 *     3D stepover/ball_radius       → scallop height:  12 types × 2 = 24
 *     5-axis scallop_height/cusp    → surface quality: 25 types × 2 = 50
 *     finishing params (all domains): ~50
 *   Total surface quality          : >= 178
 *
 *   Safety limit mappings:
 *     Collision hooks               : 30
 *     Tool breakage limits          : 30
 *     Machine over-travel           : 30
 *     Spindle overspeed             : 20
 *     Negative stock allowance      : 10
 *   Total safety                   : >= 120
 *
 *   Grand total                    : >= 298
 *
 * Physics references:
 *   Ra turning:   Shaw "Metal Cutting Principles" 2nd ed. — Ra = f²/(32R) [μm]
 *   Scallop:      Lasemi et al. (2010) — h = R − √(R² − (ae/2)²) [mm]
 *   Rz milling:   Bouzakis et al. (2003) — Rz ≈ 8×Ra (empirical, HSS/carbide mills)
 *   Residual:     Ulutan & Ozel (2011) — σ_res = f(Fc, Tc, material_hardness)
 *   White layer:  Chou & Evans (1999) — δ_wl = A·Fc·Vc/k_mat (thermal threshold)
 *
 * @domain SurfaceQuality-Safety-Mapping
 * @milestone HM-KC-MS8/U-HKC43
 */

// ── Types ──────────────────────────────────────────────────────────────────────

/** Target physics engine for surface quality mappings */
export type SurfaceQualityTargetEngine =
  | "SurfaceFinishPredictorEngine"
  | "SurfaceIntegrityEngine"
  | "ResidualStressPredictionEngine";

/** Mapping type classification */
export type SurfaceQualityMappingType =
  | "ra_prediction"
  | "rz_prediction"
  | "scallop_height"
  | "residual_stress"
  | "white_layer"
  | "safety_limit";

/**
 * One mapping entry connecting a hyperMILL CAM parameter to a surface quality
 * or safety physics engine.
 */
export interface SurfaceQualityMapping {
  /** Fully qualified parameter ID, e.g. "turning.od_turning.feed_per_rev" */
  parameterId: string;
  /** CAM domain, e.g. "turning", "threeD", "fiveAxis" */
  parameterDomain: string;
  /** Target physics engine */
  targetEngine: SurfaceQualityTargetEngine | "SAFETY_BLOCK";
  /** Mapping category */
  mappingType: SurfaceQualityMappingType;
  /** Physics formula that governs the relationship (where applicable) */
  formula?: string;
  /** Safety hook name that enforces a hard block on this parameter (safety mappings) */
  hookRef?: string;
  /** Confidence in the mapping relationship */
  confidenceLevel: string;
}

/** Aggregated summary of all surface quality mappings */
export interface SurfaceQualityMappingSummary {
  totalMappings: number;
  surfaceQualityMappings: number;
  safetyLimitMappings: number;
  byDomain: Record<string, number>;
  byMappingType: Record<string, number>;
  byTargetEngine: Record<string, number>;
}

// ── Formula constants ──────────────────────────────────────────────────────────

/**
 * Physics formula strings for surface quality relationships.
 * Sources: Shaw 2005, Lasemi 2010, Bouzakis 2003, Ulutan 2011, Chou 1999
 */
const FORMULA = {
  Ra_turning: "Ra = f²/(32·R) [μm]; f=feed/rev [mm/rev], R=nose radius [mm] — Shaw 2005",
  Rz_turning: "Rz = f²/(8·R) [μm]; Rz≈4×Ra for turning with sharp insert — ISO 4287",
  Ra_milling: "Ra_mill = ae²/(8·R_ball) [μm]; ae=stepover [mm], R_ball=ball end radius [mm]",
  Rz_milling: "Rz_mill ≈ 8·Ra_mill [μm] (empirical, carbide ball-end, HSM regime)",
  scallop_h: "h = R − √(R² − (ae/2)²) [mm]; R=ball radius, ae=radial stepover — Lasemi 2010",
  scallop_5ax: "h_5ax = R·(1−cos(θ/2)) [mm]; θ=cusp half-angle, R=ball radius — Beudaert 2011",
  cusp_height: "h_cusp = ae²/(8·R) [mm]; ae=path interval, R=sphere radius",
  Ra_face: "Ra_face = 0.0321·fz²/R [μm]; fz=feed per tooth [mm/tooth], R=tool radius [mm]",
  residual_stress: "σ_res = f(Fc, kc1_1, Vc, T_interface) — Ulutan & Ozel IJMS 2011",
  white_layer: "δ_wl = A·Fc·Vc/k_mat [μm]; threshold Vc·Fc > 1500 W·N — Chou & Evans 1999",
  Ra_grinding: "Ra_grind = C·(ae/ds)^0.5·(vw/vc)^0.25 [μm]; C≈1.8 for CBN wheels — Rowe 2009",
} as const;

// ── Builder helpers ────────────────────────────────────────────────────────────

/** Build a surface quality mapping entry */
function sq(
  domain: string,
  cycleType: string,
  paramName: string,
  engine: SurfaceQualityTargetEngine | "SAFETY_BLOCK",
  mappingType: SurfaceQualityMappingType,
  formula?: string,
  confidence = "0.90",
  hookRef?: string
): SurfaceQualityMapping {
  return {
    parameterId: `${domain}.${cycleType}.${paramName}`,
    parameterDomain: domain,
    targetEngine: engine,
    mappingType,
    formula,
    hookRef,
    confidenceLevel: confidence,
  };
}

/** Build a safety limit mapping entry */
function safety(
  domain: string,
  cycleType: string,
  paramName: string,
  hookRef: string,
  confidence = "0.95"
): SurfaceQualityMapping {
  return {
    parameterId: `${domain}.${cycleType}.${paramName}`,
    parameterDomain: domain,
    targetEngine: "SAFETY_BLOCK",
    mappingType: "safety_limit",
    hookRef,
    confidenceLevel: confidence,
  };
}

// ── TURNING DOMAIN — Surface Quality ─────────────────────────────────────────
// 18 cycle types × 3 params = 54 Ra/Rz/residual mappings

const TURNING_CYCLE_TYPES = [
  "od_turning", "id_turning", "facing", "parting", "grooving",
  "threading_od", "threading_id", "boring", "profiling", "roughing_turn",
  "finishing_turn", "copy_turning", "taper_turning", "form_turning",
  "knurling", "polygon_turning", "eccentric_turning", "hard_turning",
];

function buildTurningSurfaceMappings(): SurfaceQualityMapping[] {
  const maps: SurfaceQualityMapping[] = [];
  for (const ct of TURNING_CYCLE_TYPES) {
    // feed_per_rev → Ra via kinematic model Ra = f²/(32R)
    maps.push(sq("turning", ct, "feed_per_rev",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_turning, "0.92"));

    // nose_radius → Ra via same kinematic model (R in denominator)
    maps.push(sq("turning", ct, "nose_radius",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_turning, "0.92"));

    // cutting_speed → residual stress (thermal + mechanical coupling)
    maps.push(sq("turning", ct, "cutting_speed",
      "ResidualStressPredictionEngine", "residual_stress",
      FORMULA.residual_stress, "0.85"));
  }
  return maps;
}

// Hard turning adds white layer risk — extra mapping for hard_turning
function buildHardTurningWhiteLayer(): SurfaceQualityMapping[] {
  return [
    sq("turning", "hard_turning", "cutting_speed",
      "SurfaceIntegrityEngine", "white_layer",
      FORMULA.white_layer, "0.88"),
    sq("turning", "hard_turning", "depth_of_cut",
      "SurfaceIntegrityEngine", "white_layer",
      FORMULA.white_layer, "0.85"),
    sq("turning", "hard_turning", "tool_wear_limit",
      "SurfaceIntegrityEngine", "white_layer",
      FORMULA.white_layer, "0.82"),
  ];
}

// ── THREE-D DOMAIN — Scallop Height ──────────────────────────────────────────
// 12 cycle types × 2 params = 24 scallop mappings

const THREED_CYCLE_TYPES = [
  "z_level_roughing", "z_level_finishing", "contour_finishing", "parallel_finishing",
  "radial_finishing", "spiral_finishing", "pencil_milling", "rest_milling",
  "steep_shallow", "scallop_finishing", "morph_finishing", "equidistant_finishing",
];

function buildThreeDScallopMappings(): SurfaceQualityMapping[] {
  const maps: SurfaceQualityMapping[] = [];
  for (const ct of THREED_CYCLE_TYPES) {
    // stepover (ae) → scallop height via h = R − √(R² − (ae/2)²)
    maps.push(sq("threeD", ct, "stepover",
      "SurfaceFinishPredictorEngine", "scallop_height",
      FORMULA.scallop_h, "0.93"));

    // ball_radius → scallop height (R in the scallop formula)
    maps.push(sq("threeD", ct, "ball_radius",
      "SurfaceFinishPredictorEngine", "scallop_height",
      FORMULA.scallop_h, "0.93"));
  }
  return maps;
}

// ── FIVE-AXIS DOMAIN — Surface Quality ───────────────────────────────────────
// 25 cycle types × 2 params = 50 surface quality mappings

const FIVEAXIS_CYCLE_TYPES = [
  "five_axis_contour", "five_axis_z_level", "five_axis_planar", "five_axis_swarf",
  "five_axis_flank", "five_axis_trimming", "five_axis_pencil", "five_axis_rest",
  "five_axis_tube", "five_axis_impeller", "five_axis_blisk", "five_axis_port",
  "five_axis_steep_shallow", "five_axis_morph", "five_axis_geodesic",
  "five_axis_spiral", "five_axis_parallel", "five_axis_radial", "five_axis_equidistant",
  "five_axis_scallop", "tilted_plane", "five_axis_turning", "five_axis_drilling",
  "five_axis_deburring", "five_axis_trimming_advanced",
];

function buildFiveAxisSurfaceMappings(): SurfaceQualityMapping[] {
  const maps: SurfaceQualityMapping[] = [];
  for (const ct of FIVEAXIS_CYCLE_TYPES) {
    // scallop_height target parameter → surface quality prediction
    maps.push(sq("fiveAxis", ct, "scallop_height",
      "SurfaceFinishPredictorEngine", "scallop_height",
      FORMULA.scallop_5ax, "0.91"));

    // cusp_height → surface quality (cusp is scallop in 5-axis lead/tilt context)
    maps.push(sq("fiveAxis", ct, "cusp_height",
      "SurfaceFinishPredictorEngine", "scallop_height",
      FORMULA.cusp_height, "0.89"));
  }
  return maps;
}

// ── FINISHING PARAMETERS — All domains ───────────────────────────────────────
// ~50 finishing parameter mappings across all CAM domains

function buildFinishingMappings(): SurfaceQualityMapping[] {
  return [
    // ── 2D finishing ───────────────────────────────────────────────────────────
    sq("twoD", "contour_milling", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_milling, "0.88"),
    sq("twoD", "contour_milling", "stepover",
      "SurfaceFinishPredictorEngine", "rz_prediction",
      FORMULA.Rz_milling, "0.87"),
    sq("twoD", "face_milling", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_face, "0.90"),
    sq("twoD", "face_milling", "stepover",
      "SurfaceFinishPredictorEngine", "rz_prediction",
      FORMULA.Rz_milling, "0.87"),
    sq("twoD", "pocket_milling", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_milling, "0.86"),
    sq("twoD", "pocket_milling", "corner_radius",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_milling, "0.83"),
    sq("twoD", "slot_milling", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_milling, "0.87"),
    sq("twoD", "slot_milling", "stepdown",
      "SurfaceFinishPredictorEngine", "rz_prediction",
      FORMULA.Rz_milling, "0.84"),
    sq("twoD", "chamfer_milling", "feed_rate",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_milling, "0.82"),
    sq("twoD", "thread_milling", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "rz_prediction",
      FORMULA.Rz_milling, "0.85"),

    // ── 3D additional finishing ───────────────────────────────────────────────
    sq("threeD", "parallel_finishing", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_milling, "0.89"),
    sq("threeD", "scallop_finishing", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_milling, "0.91"),
    sq("threeD", "scallop_finishing", "stepover",
      "SurfaceFinishPredictorEngine", "scallop_height",
      FORMULA.scallop_h, "0.93"),
    sq("threeD", "pencil_milling", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "rz_prediction",
      FORMULA.Rz_milling, "0.84"),
    sq("threeD", "contour_finishing", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_milling, "0.90"),
    sq("threeD", "contour_finishing", "stepover",
      "SurfaceFinishPredictorEngine", "rz_prediction",
      FORMULA.Rz_milling, "0.88"),
    sq("threeD", "radial_finishing", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_milling, "0.87"),
    sq("threeD", "equidistant_finishing", "stepover",
      "SurfaceFinishPredictorEngine", "scallop_height",
      FORMULA.scallop_h, "0.90"),
    sq("threeD", "morph_finishing", "stepover",
      "SurfaceFinishPredictorEngine", "scallop_height",
      FORMULA.scallop_h, "0.89"),
    sq("threeD", "rest_milling", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_milling, "0.82"),

    // ── 5-axis additional finishing ───────────────────────────────────────────
    sq("fiveAxis", "five_axis_swarf", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "rz_prediction",
      FORMULA.Rz_milling, "0.88"),
    sq("fiveAxis", "five_axis_flank", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "rz_prediction",
      FORMULA.Rz_milling, "0.87"),
    sq("fiveAxis", "five_axis_impeller", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_milling, "0.89"),
    sq("fiveAxis", "five_axis_blisk", "stepover",
      "SurfaceFinishPredictorEngine", "scallop_height",
      FORMULA.scallop_5ax, "0.88"),
    sq("fiveAxis", "five_axis_port", "feed_per_tooth",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_milling, "0.86"),

    // ── Turning additional surface quality ────────────────────────────────────
    sq("turning", "finishing_turn", "feed_per_rev",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_turning, "0.94"),
    sq("turning", "finishing_turn", "nose_radius",
      "SurfaceFinishPredictorEngine", "rz_prediction",
      FORMULA.Rz_turning, "0.93"),
    sq("turning", "copy_turning", "feed_per_rev",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_turning, "0.91"),
    sq("turning", "hard_turning", "feed_per_rev",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_turning, "0.89"),

    // ── Grinding surface quality ───────────────────────────────────────────────
    sq("grinding", "surface_grinding", "depth_of_cut",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_grinding, "0.88"),
    sq("grinding", "surface_grinding", "workpiece_feed",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_grinding, "0.87"),
    sq("grinding", "cylindrical_grinding", "depth_of_cut",
      "SurfaceFinishPredictorEngine", "ra_prediction",
      FORMULA.Ra_grinding, "0.87"),
    sq("grinding", "cylindrical_grinding", "workpiece_feed",
      "SurfaceFinishPredictorEngine", "rz_prediction",
      FORMULA.Ra_grinding, "0.86"),
    sq("grinding", "profile_grinding", "depth_of_cut",
      "SurfaceFinishPredictorEngine", "scallop_height",
      FORMULA.Ra_grinding, "0.84"),

    // ── Residual stress — turning + 5-axis ────────────────────────────────────
    sq("turning", "od_turning", "depth_of_cut",
      "ResidualStressPredictionEngine", "residual_stress",
      FORMULA.residual_stress, "0.83"),
    sq("turning", "id_turning", "depth_of_cut",
      "ResidualStressPredictionEngine", "residual_stress",
      FORMULA.residual_stress, "0.82"),
    sq("fiveAxis", "five_axis_contour", "depth_of_cut",
      "ResidualStressPredictionEngine", "residual_stress",
      FORMULA.residual_stress, "0.80"),
    sq("fiveAxis", "five_axis_flank", "depth_of_cut",
      "ResidualStressPredictionEngine", "residual_stress",
      FORMULA.residual_stress, "0.80"),
    sq("threeD", "z_level_finishing", "depth_of_cut",
      "ResidualStressPredictionEngine", "residual_stress",
      FORMULA.residual_stress, "0.79"),

    // ── Surface integrity — work hardening check ──────────────────────────────
    sq("turning", "id_turning", "cutting_speed",
      "SurfaceIntegrityEngine", "white_layer",
      FORMULA.white_layer, "0.82"),
    sq("turning", "boring", "cutting_speed",
      "SurfaceIntegrityEngine", "white_layer",
      FORMULA.white_layer, "0.81"),
    sq("fiveAxis", "five_axis_impeller", "cutting_speed",
      "SurfaceIntegrityEngine", "white_layer",
      FORMULA.white_layer, "0.80"),
    sq("threeD", "z_level_roughing", "cutting_speed",
      "SurfaceIntegrityEngine", "white_layer",
      FORMULA.white_layer, "0.78"),
    sq("grinding", "surface_grinding", "wheel_speed",
      "SurfaceIntegrityEngine", "white_layer",
      FORMULA.white_layer, "0.85"),
    sq("grinding", "cylindrical_grinding", "wheel_speed",
      "SurfaceIntegrityEngine", "white_layer",
      FORMULA.white_layer, "0.84"),
    sq("grinding", "profile_grinding", "wheel_speed",
      "SurfaceIntegrityEngine", "white_layer",
      FORMULA.white_layer, "0.83"),
    sq("grinding", "thread_grinding", "wheel_speed",
      "SurfaceIntegrityEngine", "white_layer",
      FORMULA.white_layer, "0.82"),
    sq("grinding", "gear_grinding", "wheel_speed",
      "SurfaceIntegrityEngine", "white_layer",
      FORMULA.white_layer, "0.82"),
    sq("turning", "hard_turning", "depth_of_cut",
      "SurfaceIntegrityEngine", "residual_stress",
      FORMULA.residual_stress, "0.87"),
  ];
}

// ── SAFETY LIMIT MAPPINGS ─────────────────────────────────────────────────────

// ── Collision hooks (30) ──────────────────────────────────────────────────────
// Parameters that, if set incorrectly, will cause collision — hook enforces hard block

const COLLISION_HOOK = "hypermill.collision.guard";

function buildCollisionMappings(): SurfaceQualityMapping[] {
  return [
    safety("threeD",   "z_level_roughing",    "depth_of_cut",       COLLISION_HOOK),
    safety("threeD",   "z_level_finishing",   "depth_of_cut",       COLLISION_HOOK),
    safety("threeD",   "contour_finishing",   "depth_of_cut",       COLLISION_HOOK),
    safety("threeD",   "scallop_finishing",   "depth_of_cut",       COLLISION_HOOK),
    safety("threeD",   "pencil_milling",      "depth_of_cut",       COLLISION_HOOK),
    safety("threeD",   "rest_milling",        "depth_of_cut",       COLLISION_HOOK),
    safety("fiveAxis", "five_axis_contour",   "tilt_angle",         COLLISION_HOOK),
    safety("fiveAxis", "five_axis_swarf",     "tilt_angle",         COLLISION_HOOK),
    safety("fiveAxis", "five_axis_flank",     "tilt_angle",         COLLISION_HOOK),
    safety("fiveAxis", "five_axis_impeller",  "tilt_angle",         COLLISION_HOOK),
    safety("fiveAxis", "five_axis_blisk",     "tilt_angle",         COLLISION_HOOK),
    safety("fiveAxis", "five_axis_port",      "tilt_angle",         COLLISION_HOOK),
    safety("fiveAxis", "five_axis_tube",      "tilt_angle",         COLLISION_HOOK),
    safety("fiveAxis", "tilted_plane",        "tilt_angle",         COLLISION_HOOK),
    safety("fiveAxis", "five_axis_drilling",  "approach_clearance", COLLISION_HOOK),
    safety("twoD",     "pocket_milling",      "depth_of_cut",       COLLISION_HOOK),
    safety("twoD",     "slot_milling",        "depth_of_cut",       COLLISION_HOOK),
    safety("twoD",     "contour_milling",     "depth_of_cut",       COLLISION_HOOK),
    safety("twoD",     "face_milling",        "stepdown",           COLLISION_HOOK),
    safety("twoD",     "thread_milling",      "depth_of_cut",       COLLISION_HOOK),
    safety("drilling", "twist_drill",         "depth_of_cut",       COLLISION_HOOK),
    safety("drilling", "peck_drill",          "depth_of_cut",       COLLISION_HOOK),
    safety("drilling", "deep_hole_drill",     "depth_of_cut",       COLLISION_HOOK),
    safety("drilling", "gun_drill",           "depth_of_cut",       COLLISION_HOOK),
    safety("drilling", "thread_mill_drill",   "depth_of_cut",       COLLISION_HOOK),
    safety("turning",  "id_turning",          "depth_of_cut",       COLLISION_HOOK),
    safety("turning",  "boring",              "depth_of_cut",       COLLISION_HOOK),
    safety("turning",  "grooving",            "depth_of_cut",       COLLISION_HOOK),
    safety("turning",  "parting",             "depth_of_cut",       COLLISION_HOOK),
    safety("turning",  "threading_id",        "depth_of_cut",       COLLISION_HOOK),
  ];
}

// ── Tool breakage limits (30) ────────────────────────────────────────────────
// Parameters that drive cutting force above tool rupture modulus

const BREAKAGE_HOOK = "hypermill.toolbreakage.limit";

function buildToolBreakageMappings(): SurfaceQualityMapping[] {
  return [
    safety("threeD",   "z_level_roughing",    "feed_rate",          BREAKAGE_HOOK),
    safety("threeD",   "z_level_roughing",    "stepover",           BREAKAGE_HOOK),
    safety("threeD",   "z_level_finishing",   "feed_rate",          BREAKAGE_HOOK),
    safety("threeD",   "parallel_finishing",  "feed_rate",          BREAKAGE_HOOK),
    safety("threeD",   "radial_finishing",    "feed_rate",          BREAKAGE_HOOK),
    safety("threeD",   "spiral_finishing",    "feed_rate",          BREAKAGE_HOOK),
    safety("fiveAxis", "five_axis_contour",   "feed_rate",          BREAKAGE_HOOK),
    safety("fiveAxis", "five_axis_swarf",     "feed_rate",          BREAKAGE_HOOK),
    safety("fiveAxis", "five_axis_flank",     "feed_rate",          BREAKAGE_HOOK),
    safety("fiveAxis", "five_axis_impeller",  "feed_per_tooth",     BREAKAGE_HOOK),
    safety("fiveAxis", "five_axis_blisk",     "feed_per_tooth",     BREAKAGE_HOOK),
    safety("fiveAxis", "five_axis_port",      "feed_per_tooth",     BREAKAGE_HOOK),
    safety("twoD",     "pocket_milling",      "feed_per_tooth",     BREAKAGE_HOOK),
    safety("twoD",     "slot_milling",        "feed_per_tooth",     BREAKAGE_HOOK),
    safety("twoD",     "contour_milling",     "feed_per_tooth",     BREAKAGE_HOOK),
    safety("twoD",     "face_milling",        "feed_per_tooth",     BREAKAGE_HOOK),
    safety("drilling", "twist_drill",         "feed_per_rev",       BREAKAGE_HOOK),
    safety("drilling", "peck_drill",          "feed_per_rev",       BREAKAGE_HOOK),
    safety("drilling", "deep_hole_drill",     "feed_per_rev",       BREAKAGE_HOOK),
    safety("drilling", "gun_drill",           "feed_per_rev",       BREAKAGE_HOOK),
    safety("drilling", "ejector_drill",       "feed_per_rev",       BREAKAGE_HOOK),
    safety("drilling", "form_drill",          "feed_per_rev",       BREAKAGE_HOOK),
    safety("turning",  "od_turning",          "feed_rate",          BREAKAGE_HOOK),
    safety("turning",  "id_turning",          "feed_rate",          BREAKAGE_HOOK),
    safety("turning",  "grooving",            "feed_rate",          BREAKAGE_HOOK),
    safety("turning",  "parting",             "feed_rate",          BREAKAGE_HOOK),
    safety("turning",  "threading_od",        "feed_rate",          BREAKAGE_HOOK),
    safety("turning",  "hard_turning",        "feed_rate",          BREAKAGE_HOOK),
    safety("grinding", "surface_grinding",    "workpiece_feed",     BREAKAGE_HOOK),
    safety("grinding", "cylindrical_grinding","depth_of_cut",       BREAKAGE_HOOK),
  ];
}

// ── Machine over-travel limits (30) ──────────────────────────────────────────
// Parameters that define motion bounds — block if outside machine travel envelope

const OVERTRAVEL_HOOK = "hypermill.overtravel.guard";

function buildOverTravelMappings(): SurfaceQualityMapping[] {
  return [
    safety("threeD",   "z_level_roughing",    "z_min",              OVERTRAVEL_HOOK),
    safety("threeD",   "z_level_roughing",    "z_max",              OVERTRAVEL_HOOK),
    safety("threeD",   "z_level_finishing",   "z_min",              OVERTRAVEL_HOOK),
    safety("threeD",   "z_level_finishing",   "z_max",              OVERTRAVEL_HOOK),
    safety("threeD",   "parallel_finishing",  "z_min",              OVERTRAVEL_HOOK),
    safety("threeD",   "scallop_finishing",   "z_min",              OVERTRAVEL_HOOK),
    safety("fiveAxis", "five_axis_contour",   "z_min",              OVERTRAVEL_HOOK),
    safety("fiveAxis", "five_axis_swarf",     "z_min",              OVERTRAVEL_HOOK),
    safety("fiveAxis", "five_axis_flank",     "z_min",              OVERTRAVEL_HOOK),
    safety("fiveAxis", "five_axis_impeller",  "z_min",              OVERTRAVEL_HOOK),
    safety("fiveAxis", "five_axis_blisk",     "x_limit",            OVERTRAVEL_HOOK),
    safety("fiveAxis", "five_axis_port",      "y_limit",            OVERTRAVEL_HOOK),
    safety("fiveAxis", "tilted_plane",        "z_min",              OVERTRAVEL_HOOK),
    safety("fiveAxis", "five_axis_tube",      "z_min",              OVERTRAVEL_HOOK),
    safety("fiveAxis", "five_axis_drilling",  "z_min",              OVERTRAVEL_HOOK),
    safety("twoD",     "pocket_milling",      "z_min",              OVERTRAVEL_HOOK),
    safety("twoD",     "slot_milling",        "z_min",              OVERTRAVEL_HOOK),
    safety("twoD",     "contour_milling",     "z_min",              OVERTRAVEL_HOOK),
    safety("twoD",     "face_milling",        "z_max",              OVERTRAVEL_HOOK),
    safety("twoD",     "thread_milling",      "z_min",              OVERTRAVEL_HOOK),
    safety("drilling", "twist_drill",         "z_min",              OVERTRAVEL_HOOK),
    safety("drilling", "deep_hole_drill",     "z_min",              OVERTRAVEL_HOOK),
    safety("drilling", "peck_drill",          "z_min",              OVERTRAVEL_HOOK),
    safety("drilling", "gun_drill",           "z_min",              OVERTRAVEL_HOOK),
    safety("drilling", "reamer",              "z_min",              OVERTRAVEL_HOOK),
    safety("turning",  "od_turning",          "x_limit",            OVERTRAVEL_HOOK),
    safety("turning",  "id_turning",          "x_limit",            OVERTRAVEL_HOOK),
    safety("turning",  "facing",              "z_limit",            OVERTRAVEL_HOOK),
    safety("turning",  "grooving",            "x_limit",            OVERTRAVEL_HOOK),
    safety("turning",  "parting",             "x_limit",            OVERTRAVEL_HOOK),
  ];
}

// ── Spindle overspeed limits (20) ─────────────────────────────────────────────
// Parameters that set RPM above machine/spindle/tool rated maximum

const OVERSPEED_HOOK = "hypermill.spindle.overspeed";

function buildOverspeedMappings(): SurfaceQualityMapping[] {
  return [
    safety("threeD",   "z_level_roughing",    "spindle_speed",      OVERSPEED_HOOK),
    safety("threeD",   "z_level_finishing",   "spindle_speed",      OVERSPEED_HOOK),
    safety("threeD",   "scallop_finishing",   "spindle_speed",      OVERSPEED_HOOK),
    safety("fiveAxis", "five_axis_contour",   "spindle_speed",      OVERSPEED_HOOK),
    safety("fiveAxis", "five_axis_impeller",  "spindle_speed",      OVERSPEED_HOOK),
    safety("fiveAxis", "five_axis_blisk",     "spindle_speed",      OVERSPEED_HOOK),
    safety("fiveAxis", "tilted_plane",        "spindle_speed",      OVERSPEED_HOOK),
    safety("twoD",     "face_milling",        "spindle_speed",      OVERSPEED_HOOK),
    safety("twoD",     "pocket_milling",      "spindle_speed",      OVERSPEED_HOOK),
    safety("twoD",     "contour_milling",     "spindle_speed",      OVERSPEED_HOOK),
    safety("twoD",     "slot_milling",        "spindle_speed",      OVERSPEED_HOOK),
    safety("drilling", "twist_drill",         "spindle_speed",      OVERSPEED_HOOK),
    safety("drilling", "deep_hole_drill",     "spindle_speed",      OVERSPEED_HOOK),
    safety("drilling", "gun_drill",           "spindle_speed",      OVERSPEED_HOOK),
    safety("turning",  "od_turning",          "spindle_speed",      OVERSPEED_HOOK),
    safety("turning",  "id_turning",          "spindle_speed",      OVERSPEED_HOOK),
    safety("turning",  "facing",              "spindle_speed",      OVERSPEED_HOOK),
    safety("turning",  "hard_turning",        "spindle_speed",      OVERSPEED_HOOK),
    safety("grinding", "surface_grinding",    "wheel_speed",        OVERSPEED_HOOK),
    safety("grinding", "cylindrical_grinding","wheel_speed",        OVERSPEED_HOOK),
  ];
}

// ── Negative stock allowance (10) ─────────────────────────────────────────────
// Negative stock_allowance means cutting below part nominal — scrap risk

const NEGATIVE_STOCK_HOOK = "hypermill.stock.negative_allowance";

function buildNegativeAllowanceMappings(): SurfaceQualityMapping[] {
  return [
    safety("threeD",   "z_level_roughing",    "stock_allowance",    NEGATIVE_STOCK_HOOK),
    safety("threeD",   "z_level_finishing",   "stock_allowance",    NEGATIVE_STOCK_HOOK),
    safety("threeD",   "contour_finishing",   "stock_allowance",    NEGATIVE_STOCK_HOOK),
    safety("fiveAxis", "five_axis_contour",   "stock_allowance",    NEGATIVE_STOCK_HOOK),
    safety("fiveAxis", "five_axis_swarf",     "stock_allowance",    NEGATIVE_STOCK_HOOK),
    safety("twoD",     "pocket_milling",      "stock_allowance",    NEGATIVE_STOCK_HOOK),
    safety("twoD",     "contour_milling",     "stock_allowance",    NEGATIVE_STOCK_HOOK),
    safety("twoD",     "face_milling",        "stock_allowance",    NEGATIVE_STOCK_HOOK),
    safety("turning",  "od_turning",          "stock_allowance",    NEGATIVE_STOCK_HOOK),
    safety("turning",  "finishing_turn",      "stock_allowance",    NEGATIVE_STOCK_HOOK),
  ];
}

// ── Assemble all mappings ──────────────────────────────────────────────────────

/**
 * All surface quality + safety physics mappings for hyperMILL parameters.
 *
 * Composition:
 *   Surface quality:
 *     Turning Ra/Rz/residual:     18 × 3 = 54
 *     Hard turning white layer:          3
 *     3D scallop height:          12 × 2 = 24
 *     5-axis surface quality:     25 × 2 = 50
 *     Finishing (all domains):          50
 *   Surface subtotal:                  181
 *
 *   Safety limits:
 *     Collision hooks:                  30
 *     Tool breakage:                    30
 *     Over-travel:                      30
 *     Overspeed:                        20
 *     Negative stock allowance:         10
 *   Safety subtotal:                   120
 *
 *   Grand total:                       301
 *
 * Physics references:
 *   Ra = f²/(32R) — Shaw "Metal Cutting Principles" 2nd ed. (2005)
 *   h = R − √(R² − (ae/2)²) — Lasemi, Siu, Zheng, IJAMT 2010
 *   σ_res = f(Fc, Tc, HM) — Ulutan & Ozel, IJMS 53(5) 2011
 *   δ_wl = A·Fc·Vc/k_mat — Chou & Evans, ASME Trans. 1999
 */
export const SURFACE_QUALITY_MAPPINGS: SurfaceQualityMapping[] = [
  // Surface quality
  ...buildTurningSurfaceMappings(),   // 54
  ...buildHardTurningWhiteLayer(),    //  3
  ...buildThreeDScallopMappings(),    // 24
  ...buildFiveAxisSurfaceMappings(),  // 50
  ...buildFinishingMappings(),        // 50

  // Safety limits
  ...buildCollisionMappings(),        // 30
  ...buildToolBreakageMappings(),     // 30
  ...buildOverTravelMappings(),       // 30
  ...buildOverspeedMappings(),        // 20
  ...buildNegativeAllowanceMappings(), // 10
];

// ── Summary ────────────────────────────────────────────────────────────────────

function buildSummary(): SurfaceQualityMappingSummary {
  const surfaceQualityMappings = SURFACE_QUALITY_MAPPINGS.filter(
    (m) => m.mappingType !== "safety_limit"
  ).length;
  const safetyLimitMappings = SURFACE_QUALITY_MAPPINGS.filter(
    (m) => m.mappingType === "safety_limit"
  ).length;

  const byDomain: Record<string, number> = {};
  const byMappingType: Record<string, number> = {};
  const byTargetEngine: Record<string, number> = {};

  for (const m of SURFACE_QUALITY_MAPPINGS) {
    byDomain[m.parameterDomain] = (byDomain[m.parameterDomain] ?? 0) + 1;
    byMappingType[m.mappingType] = (byMappingType[m.mappingType] ?? 0) + 1;
    byTargetEngine[m.targetEngine] = (byTargetEngine[m.targetEngine] ?? 0) + 1;
  }

  return {
    totalMappings: SURFACE_QUALITY_MAPPINGS.length,
    surfaceQualityMappings,
    safetyLimitMappings,
    byDomain,
    byMappingType,
    byTargetEngine,
  };
}

/**
 * Pre-computed summary of all surface quality + safety mappings.
 * Available without instantiating the engine class.
 */
export const SURFACE_QUALITY_MAPPING_SUMMARY: SurfaceQualityMappingSummary = buildSummary();

// ── Engine class ───────────────────────────────────────────────────────────────

/**
 * HyperMillSurfaceQualityMappingEngine
 *
 * Provides query methods over the SURFACE_QUALITY_MAPPINGS registry.
 * All methods are pure (no I/O, no side effects).
 *
 * Usage:
 *   import { surfaceQualityMappingEngine } from './HyperMillSurfaceQualityMappingEngine.js';
 *   const raMappings = surfaceQualityMappingEngine.getMappingsByType('ra_prediction');
 *   const safetyMaps = surfaceQualityMappingEngine.getSafetyMappings();
 */
export class HyperMillSurfaceQualityMappingEngine {
  /**
   * Returns all mappings for a given CAM parameter domain.
   *
   * @param domain - e.g. "turning", "threeD", "fiveAxis", "twoD", "drilling", "grinding"
   * @returns Filtered array of SurfaceQualityMapping entries
   */
  getMappingsByDomain(domain: string): SurfaceQualityMapping[] {
    return SURFACE_QUALITY_MAPPINGS.filter((m) => m.parameterDomain === domain);
  }

  /**
   * Returns all mappings for a specific mapping type.
   *
   * @param mappingType - "ra_prediction" | "rz_prediction" | "scallop_height" |
   *                      "residual_stress" | "white_layer" | "safety_limit"
   * @returns Filtered array of SurfaceQualityMapping entries
   */
  getMappingsByType(mappingType: SurfaceQualityMappingType): SurfaceQualityMapping[] {
    return SURFACE_QUALITY_MAPPINGS.filter((m) => m.mappingType === mappingType);
  }

  /**
   * Returns all safety limit mappings (hook-enforced hard blocks).
   *
   * @returns Array of safety_limit SurfaceQualityMapping entries
   */
  getSafetyMappings(): SurfaceQualityMapping[] {
    return SURFACE_QUALITY_MAPPINGS.filter((m) => m.mappingType === "safety_limit");
  }

  /**
   * Returns all surface quality prediction mappings (non-safety).
   *
   * @returns Array of non-safety SurfaceQualityMapping entries
   */
  getSurfaceQualityMappings(): SurfaceQualityMapping[] {
    return SURFACE_QUALITY_MAPPINGS.filter((m) => m.mappingType !== "safety_limit");
  }

  /**
   * Returns all mappings for a specific target engine.
   *
   * @param engine - Engine name string
   * @returns Filtered array of SurfaceQualityMapping entries
   */
  getMappingsByEngine(engine: string): SurfaceQualityMapping[] {
    return SURFACE_QUALITY_MAPPINGS.filter((m) => m.targetEngine === engine);
  }

  /**
   * Returns all mappings referencing a specific safety hook.
   *
   * @param hookRef - Hook identifier, e.g. "hypermill.collision.guard"
   * @returns Filtered array of safety SurfaceQualityMapping entries
   */
  getMappingsByHook(hookRef: string): SurfaceQualityMapping[] {
    return SURFACE_QUALITY_MAPPINGS.filter((m) => m.hookRef === hookRef);
  }

  /**
   * Looks up a mapping by its fully qualified parameterId.
   *
   * @param parameterId - e.g. "turning.od_turning.feed_per_rev"
   * @returns The matching SurfaceQualityMapping or undefined if not found
   */
  getMappingById(parameterId: string): SurfaceQualityMapping | undefined {
    return SURFACE_QUALITY_MAPPINGS.find((m) => m.parameterId === parameterId);
  }

  /**
   * Returns all mappings that have a formula string defined.
   * (Safety limit mappings typically do not have formulas.)
   *
   * @returns Array of SurfaceQualityMapping entries with a formula
   */
  getMappingsWithFormula(): SurfaceQualityMapping[] {
    return SURFACE_QUALITY_MAPPINGS.filter((m) => m.formula !== undefined);
  }

  /**
   * Returns the pre-computed summary statistics for the full registry.
   *
   * @returns SurfaceQualityMappingSummary with totals and breakdowns
   */
  getSummary(): SurfaceQualityMappingSummary {
    return SURFACE_QUALITY_MAPPING_SUMMARY;
  }
}

/** Singleton export — use this in all callers */
export const surfaceQualityMappingEngine = new HyperMillSurfaceQualityMappingEngine();
