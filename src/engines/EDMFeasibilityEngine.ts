/**
 * PRISM Manufacturing Intelligence - EDM Feasibility & Geometry Assessment Engine
 * Wire EDM feasibility analysis consolidating conductivity, geometry, tolerance,
 * start-hole access, taper, wire access, and cutting time estimation.
 *
 * Consolidates WEDM-P2P-MS2 U01-U07:
 *   U01 ConductivityVerifier
 *   U02 GeometryFeasibilityChecker
 *   U03 ToleranceAchievabilityEngine
 *   U04 StartHoleAccessChecker
 *   U05 TaperFeasibilityChecker
 *   U06 WireAccessAnalyzer
 *   U07 CuttingTimeFeasibilityEstimator
 *
 * @version 1.0.0
 * @module EDMFeasibilityEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface FeasibilityInput {
  material: string;
  material_resistivity_uohm_cm?: number;
  features: Array<{
    name: string;
    is_through: boolean;
    profile_length_mm: number;
    min_corner_radius_mm?: number;
    min_slot_width_mm?: number;
    taper_angle_deg?: number;
    tolerance_mm?: number;
    surface_finish_ra_um?: number;
  }>;
  workpiece: {
    thickness_mm: number;
    length_mm: number;
    width_mm: number;
    height_mm: number;
  };
  machine?: {
    x_travel_mm: number;
    y_travel_mm: number;
    z_travel_mm: number;
    uv_travel_mm?: number;
    tank_length_mm?: number;
    tank_width_mm?: number;
    tank_depth_mm?: number;
  };
  wire_diameter_mm?: number;
  delivery_hours?: number;
}

export interface FeasibilityResult {
  overall_feasible: boolean;
  conductivity: {
    feasible: boolean;
    resistivity: number;
    classification: string;
    note: string;
  };
  geometry: GeometryFeasibility[];
  tolerance_achievability: ToleranceAchievability;
  start_hole_access: StartHoleAccess[];
  taper_feasibility: TaperFeasibility[];
  wire_access: { feasible: boolean; issues: string[] };
  time_estimate: TimeEstimate;
  blockers: string[];
  warnings: string[];
  recommendations: string[];
}

export interface GeometryFeasibility {
  feature: string;
  feasible: boolean;
  issues: string[];
  min_corner_ok: boolean;
  min_slot_ok: boolean;
  through_feature_ok: boolean;
}

export interface ToleranceAchievability {
  achievable: boolean;
  best_achievable_mm: number;
  passes_needed: number;
  factors: string[];
  model: string;
}

export interface StartHoleAccess {
  feature: string;
  needs_start_hole: boolean;
  start_hole_feasible: boolean;
  min_distance_from_edge_mm: number;
  issues: string[];
}

export interface TaperFeasibility {
  feature: string;
  requested_angle_deg: number;
  max_angle_deg: number;
  feasible: boolean;
  effective_taper_height_mm: number;
  issues: string[];
}

export interface TimeEstimate {
  total_hours: number;
  setup_hours: number;
  cutting_hours: number;
  meets_deadline: boolean;
  deadline_hours?: number;
  cutting_speed_mm2_min: number;
  profile_area_mm2: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Typical resistivity values in μΩ·cm for common materials */
const MATERIAL_RESISTIVITY: Record<string, number> = {
  copper: 1.7,
  aluminum: 2.65,
  gold: 2.2,
  silver: 1.6,
  brass: 6.2,
  bronze: 14,
  steel: 15,
  "carbon steel": 15,
  "alloy steel": 22,
  "tool steel": 55,
  "stainless steel": 72,
  "stainless": 72,
  "304 stainless": 72,
  "316 stainless": 74,
  "17-4 ph": 80,
  tungsten: 5.5,
  "tungsten carbide": 20,
  carbide: 20,
  molybdenum: 5.7,
  nickel: 7,
  inconel: 125,
  "inconel 718": 125,
  "inconel 625": 130,
  hastelloy: 135,
  titanium: 178,
  "ti-6al-4v": 171,
  kovar: 49,
  invar: 82,
  niobium: 15,
  tantalum: 13.5,
  zinc: 5.9,
  tin: 11.5,
  graphite: 1400,
  ceramic: 1e12,
  silicon: 640,
  "silicon carbide": 1e6,
};

/** Base material removal rates in mm²/min (area = profile_length × thickness) */
const BASE_MRR: Record<string, number> = {
  copper: 280,
  aluminum: 300,
  brass: 250,
  steel: 200,
  "carbon steel": 200,
  "alloy steel": 170,
  "tool steel": 140,
  "stainless steel": 120,
  stainless: 120,
  tungsten: 80,
  "tungsten carbide": 60,
  carbide: 60,
  titanium: 90,
  inconel: 70,
  hastelloy: 65,
  molybdenum: 100,
};

/** Spark gap per side in mm (typical for brass wire in deionized water) */
const SPARK_GAP_MM = 0.015;

/** Default wire diameter in mm */
const DEFAULT_WIRE_DIAMETER_MM = 0.25;

/** Default UV axis travel in mm (for taper) */
const DEFAULT_UV_TRAVEL_MM = 60;

/** Guide spacing (upper to lower guide) in mm — typical */
const DEFAULT_GUIDE_DISTANCE_MM = 80;

/** Tolerance model coefficients: tol = K0 + K1 * sqrt(thickness_mm) */
const TOL_K0 = 0.003; // mm base tolerance
const TOL_K1 = 0.0001; // mm per sqrt(mm)

/** Tolerance thresholds for pass estimation */
const TOLERANCE_PASS_TABLE: Array<{ max_tol_mm: number; passes: number }> = [
  { max_tol_mm: 0.002, passes: 7 },
  { max_tol_mm: 0.003, passes: 5 },
  { max_tol_mm: 0.005, passes: 4 },
  { max_tol_mm: 0.01, passes: 3 },
  { max_tol_mm: 0.02, passes: 2 },
  { max_tol_mm: 0.05, passes: 1 },
];

/** Surface finish Ra thresholds (µm) vs. pass count */
const FINISH_PASS_TABLE: Array<{ max_ra_um: number; passes: number }> = [
  { max_ra_um: 0.1, passes: 7 },
  { max_ra_um: 0.2, passes: 5 },
  { max_ra_um: 0.4, passes: 4 },
  { max_ra_um: 0.8, passes: 3 },
  { max_ra_um: 1.6, passes: 2 },
  { max_ra_um: 3.2, passes: 1 },
];

/** Minimum clearance from feature edge to start hole center (mm) */
const MIN_START_HOLE_EDGE_CLEARANCE_MM = 1.0;

/** Default setup time in hours */
const DEFAULT_SETUP_HOURS = 1.5;

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * EDM Feasibility & Geometry Assessment Engine
 *
 * Provides comprehensive wire EDM feasibility analysis covering material
 * conductivity, geometric constraints, tolerance achievability, start-hole
 * access, taper limits, wire access, and cutting-time estimation.
 */
class EDMFeasibilityEngine {
  // ==========================================================================
  // PUBLIC ACTIONS
  // ==========================================================================

  /**
   * Full feasibility assessment — consolidates all seven sub-checks.
   */
  assess(input: FeasibilityInput): FeasibilityResult {
    log.info("[EDMFeasibility] Running full feasibility assessment");

    const wireDia = input.wire_diameter_mm ?? DEFAULT_WIRE_DIAMETER_MM;
    const blockers: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // U01 — Conductivity
    const conductivity = this._checkConductivity(input);
    if (!conductivity.feasible) {
      blockers.push(`Material '${input.material}' is not EDM-feasible (resistivity ${conductivity.resistivity} μΩ·cm — ${conductivity.classification})`);
    } else if (conductivity.classification === "SLOW") {
      warnings.push(`Material '${input.material}' is conductive but will cut slowly (resistivity ${conductivity.resistivity} μΩ·cm)`);
      recommendations.push("Consider longer lead times for high-resistivity material");
    }

    // U02 — Geometry per feature
    const geometry = input.features.map((f) => this._checkGeometry(f, wireDia));
    for (const g of geometry) {
      if (!g.feasible) {
        blockers.push(`Feature '${g.feature}' has geometry issues: ${g.issues.join("; ")}`);
      }
    }

    // U03 — Tolerance achievability (tightest requested)
    const tolerance_achievability = this._checkTolerance(input);
    if (!tolerance_achievability.achievable) {
      blockers.push(
        `Tightest requested tolerance cannot be achieved. Best achievable: ${tolerance_achievability.best_achievable_mm.toFixed(4)} mm`
      );
    } else if (tolerance_achievability.passes_needed >= 5) {
      warnings.push(
        `Tight tolerance requires ${tolerance_achievability.passes_needed} passes — significant time & cost impact`
      );
    }

    // U04 — Start-hole access
    const start_hole_access = input.features.map((f) =>
      this._checkStartHoleAccess(f, wireDia)
    );
    for (const sh of start_hole_access) {
      if (sh.needs_start_hole && !sh.start_hole_feasible) {
        blockers.push(`Feature '${sh.feature}': ${sh.issues.join("; ")}`);
      }
    }

    // U05 — Taper feasibility
    const taper_feasibility = input.features
      .filter((f) => f.taper_angle_deg != null && f.taper_angle_deg > 0)
      .map((f) => this._checkTaper(f, input));
    for (const tf of taper_feasibility) {
      if (!tf.feasible) {
        blockers.push(
          `Feature '${tf.feature}': Requested taper ${tf.requested_angle_deg}° exceeds machine max ${tf.max_angle_deg.toFixed(1)}°`
        );
      }
    }

    // U06 — Wire access (workpiece fits in machine envelope)
    const wire_access = this._checkWireAccess(input);
    if (!wire_access.feasible) {
      for (const issue of wire_access.issues) {
        blockers.push(issue);
      }
    }

    // U07 — Cutting time estimate
    const time_estimate = this._estimateTime(input, tolerance_achievability.passes_needed);

    if (input.delivery_hours != null && !time_estimate.meets_deadline) {
      warnings.push(
        `Estimated total time ${time_estimate.total_hours.toFixed(1)} h exceeds deadline of ${input.delivery_hours} h`
      );
      recommendations.push("Consider multiple machines or relaxed tolerances to meet deadline");
    }

    // Additional recommendations
    if (wireDia <= 0.1) {
      warnings.push("Micro-wire (<= 0.1 mm) increases breakage risk significantly");
      recommendations.push("Ensure machine has automatic wire threading and low-energy circuits");
    }
    if (input.workpiece.thickness_mm > 300) {
      warnings.push("Thick workpiece (> 300 mm) degrades flushing and accuracy");
      recommendations.push("Use submerged cutting and reduced feed for thick stock");
    }

    const overall_feasible = blockers.length === 0;

    if (overall_feasible && warnings.length === 0) {
      recommendations.push("Part is straightforward for wire EDM — standard parameters should work");
    }

    const result: FeasibilityResult = {
      overall_feasible,
      conductivity,
      geometry,
      tolerance_achievability,
      start_hole_access,
      taper_feasibility,
      wire_access,
      time_estimate,
      blockers,
      warnings,
      recommendations,
    };

    log.info(
      `[EDMFeasibility] Assessment complete: feasible=${overall_feasible}, blockers=${blockers.length}, warnings=${warnings.length}`
    );

    return result;
  }

  /**
   * Standalone conductivity check.
   */
  check_conductivity(input: FeasibilityInput): FeasibilityResult["conductivity"] {
    return this._checkConductivity(input);
  }

  /**
   * Standalone geometry check for all features.
   */
  check_geometry(input: FeasibilityInput): GeometryFeasibility[] {
    const wireDia = input.wire_diameter_mm ?? DEFAULT_WIRE_DIAMETER_MM;
    return input.features.map((f) => this._checkGeometry(f, wireDia));
  }

  /**
   * Standalone time estimation.
   */
  estimate_time(input: FeasibilityInput): TimeEstimate {
    const tol = this._checkTolerance(input);
    return this._estimateTime(input, tol.passes_needed);
  }

  // ==========================================================================
  // PRIVATE — U01 CONDUCTIVITY VERIFIER
  // ==========================================================================

  private _checkConductivity(
    input: FeasibilityInput
  ): FeasibilityResult["conductivity"] {
    const resistivity = this._resolveResistivity(input);

    let feasible: boolean;
    let classification: string;
    let note: string;

    if (resistivity <= 0) {
      feasible = false;
      classification = "UNKNOWN";
      note = `Could not determine resistivity for '${input.material}'. Provide material_resistivity_uohm_cm.`;
    } else if (resistivity <= 100) {
      feasible = true;
      classification = "EASY";
      note = `Resistivity ${resistivity} μΩ·cm — excellent EDM machinability`;
    } else if (resistivity <= 300) {
      feasible = true;
      classification = "SLOW";
      note = `Resistivity ${resistivity} μΩ·cm — feasible but expect reduced MRR and more wire wear`;
    } else {
      feasible = false;
      classification = "NOT_FEASIBLE";
      note = `Resistivity ${resistivity} μΩ·cm exceeds 300 μΩ·cm threshold — material is effectively non-conductive for WEDM`;
    }

    return { feasible, resistivity, classification, note };
  }

  /**
   * Resolve resistivity from explicit value or material lookup.
   */
  private _resolveResistivity(input: FeasibilityInput): number {
    if (
      input.material_resistivity_uohm_cm != null &&
      input.material_resistivity_uohm_cm > 0
    ) {
      return input.material_resistivity_uohm_cm;
    }

    const key = input.material.toLowerCase().trim();

    // Direct lookup
    if (MATERIAL_RESISTIVITY[key] != null) {
      return MATERIAL_RESISTIVITY[key];
    }

    // Fuzzy: check if any known key is contained in the input or vice-versa
    for (const [mat, rho] of Object.entries(MATERIAL_RESISTIVITY)) {
      if (key.includes(mat) || mat.includes(key)) {
        return rho;
      }
    }

    return -1; // unknown
  }

  // ==========================================================================
  // PRIVATE — U02 GEOMETRY FEASIBILITY CHECKER
  // ==========================================================================

  private _checkGeometry(
    feature: FeasibilityInput["features"][number],
    wireDia: number
  ): GeometryFeasibility {
    const issues: string[] = [];
    const wireRadius = wireDia / 2;
    const minAchievableCorner = wireRadius + SPARK_GAP_MM;
    const minAchievableSlot = wireDia + 2 * SPARK_GAP_MM;

    // Corner radius check
    let min_corner_ok = true;
    if (
      feature.min_corner_radius_mm != null &&
      feature.min_corner_radius_mm < minAchievableCorner
    ) {
      min_corner_ok = false;
      issues.push(
        `Min corner radius ${feature.min_corner_radius_mm} mm < achievable ${minAchievableCorner.toFixed(3)} mm (wire R${wireRadius} + gap ${SPARK_GAP_MM})`
      );
    }

    // Slot width check
    let min_slot_ok = true;
    if (
      feature.min_slot_width_mm != null &&
      feature.min_slot_width_mm < minAchievableSlot
    ) {
      min_slot_ok = false;
      issues.push(
        `Min slot width ${feature.min_slot_width_mm} mm < achievable ${minAchievableSlot.toFixed(3)} mm (wire Ø${wireDia} + 2×gap ${SPARK_GAP_MM})`
      );
    }

    // Through-feature check — WEDM fundamentally requires through features
    let through_feature_ok = true;
    if (!feature.is_through) {
      through_feature_ok = false;
      issues.push(
        "Wire EDM requires through-features (wire must pass completely through workpiece). Consider sinker EDM for blind cavities."
      );
    }

    const feasible = min_corner_ok && min_slot_ok && through_feature_ok;

    return {
      feature: feature.name,
      feasible,
      issues,
      min_corner_ok,
      min_slot_ok,
      through_feature_ok,
    };
  }

  // ==========================================================================
  // PRIVATE — U03 TOLERANCE ACHIEVABILITY ENGINE
  // ==========================================================================

  private _checkTolerance(input: FeasibilityInput): ToleranceAchievability {
    const thickness = input.workpiece.thickness_mm;
    const bestAchievable = TOL_K0 + TOL_K1 * Math.sqrt(thickness);
    const factors: string[] = [];

    // Find tightest requested tolerance across all features
    let tightestRequested = Infinity;
    for (const f of input.features) {
      if (f.tolerance_mm != null && f.tolerance_mm < tightestRequested) {
        tightestRequested = f.tolerance_mm;
      }
    }

    // If no tolerance specified, assume standard ±0.01
    if (!isFinite(tightestRequested)) {
      tightestRequested = 0.01;
      factors.push("No tolerance specified — assuming ±0.01 mm");
    }

    // Determine passes needed
    let passes_needed = 1;
    for (const row of TOLERANCE_PASS_TABLE) {
      if (tightestRequested <= row.max_tol_mm) {
        passes_needed = row.passes;
        break;
      }
    }

    // Also check surface finish requirements — may drive more passes
    let tightestRa = Infinity;
    for (const f of input.features) {
      if (f.surface_finish_ra_um != null && f.surface_finish_ra_um < tightestRa) {
        tightestRa = f.surface_finish_ra_um;
      }
    }
    if (isFinite(tightestRa)) {
      for (const row of FINISH_PASS_TABLE) {
        if (tightestRa <= row.max_ra_um) {
          if (row.passes > passes_needed) {
            passes_needed = row.passes;
            factors.push(
              `Surface finish Ra ${tightestRa} µm drives ${row.passes} passes`
            );
          }
          break;
        }
      }
    }

    const achievable = tightestRequested >= bestAchievable;

    factors.push(
      `Workpiece thickness ${thickness} mm → best achievable tolerance ±${bestAchievable.toFixed(4)} mm`
    );

    if (thickness > 200) {
      factors.push("Thick workpiece degrades flushing — tolerance may be worse than model predicts");
    }

    if (!achievable) {
      factors.push(
        `Requested ±${tightestRequested} mm is tighter than machine capability ±${bestAchievable.toFixed(4)} mm`
      );
    }

    return {
      achievable,
      best_achievable_mm: parseFloat(bestAchievable.toFixed(5)),
      passes_needed,
      factors,
      model: `tol = ${TOL_K0} + ${TOL_K1}*sqrt(H) where H=thickness_mm`,
    };
  }

  // ==========================================================================
  // PRIVATE — U04 START HOLE ACCESS CHECKER
  // ==========================================================================

  private _checkStartHoleAccess(
    feature: FeasibilityInput["features"][number],
    wireDia: number
  ): StartHoleAccess {
    const issues: string[] = [];

    // Through features that start from an edge don't need a start hole
    // We approximate: if profile_length is large relative to slot width,
    // a start hole is likely needed for interior features.
    const needsStartHole = feature.is_through;

    // For a start hole, we need enough material around it.
    // Min start hole diameter is typically 0.3-0.5mm for standard wire,
    // and the center must be ≥ MIN_START_HOLE_EDGE_CLEARANCE_MM from the feature edge.
    let startHoleFeasible = true;
    let minDistFromEdge = MIN_START_HOLE_EDGE_CLEARANCE_MM;

    if (needsStartHole) {
      // Check if minimum slot width or corner radius prevents start hole placement
      if (
        feature.min_slot_width_mm != null &&
        feature.min_slot_width_mm < wireDia + 2 * MIN_START_HOLE_EDGE_CLEARANCE_MM
      ) {
        // Slot is too narrow for a start hole inside it
        // This is OK if start hole can be placed outside the slot
        issues.push(
          `Slot width ${feature.min_slot_width_mm} mm is narrow — start hole must be placed at an open area of the feature`
        );
      }

      // For blind features (shouldn't reach here due to is_through check, but defensive)
      if (!feature.is_through) {
        startHoleFeasible = false;
        issues.push("Cannot place start hole — feature is not through");
      }
    }

    return {
      feature: feature.name,
      needs_start_hole: needsStartHole,
      start_hole_feasible: startHoleFeasible,
      min_distance_from_edge_mm: minDistFromEdge,
      issues,
    };
  }

  // ==========================================================================
  // PRIVATE — U05 TAPER FEASIBILITY CHECKER
  // ==========================================================================

  private _checkTaper(
    feature: FeasibilityInput["features"][number],
    input: FeasibilityInput
  ): TaperFeasibility {
    const requestedAngle = feature.taper_angle_deg ?? 0;
    const thickness = input.workpiece.thickness_mm;
    const uvTravel = input.machine?.uv_travel_mm ?? DEFAULT_UV_TRAVEL_MM;
    const guideDistance = DEFAULT_GUIDE_DISTANCE_MM;

    // Max achievable taper angle:
    // The UV axes offset the wire at the guide. For a workpiece of height H
    // centered between guides spaced D apart:
    //   max_angle = atan(uv_travel / (guide_distance / 2))
    // But effective taper height is limited by guide distance minus workpiece overhead
    const maxAngleDeg =
      (Math.atan(uvTravel / (guideDistance / 2)) * 180) / Math.PI;

    // Effective taper height — actual height over which taper is applied
    const effectiveTaperHeight = Math.min(thickness, guideDistance);

    const issues: string[] = [];
    let feasible = true;

    if (requestedAngle > maxAngleDeg) {
      feasible = false;
      issues.push(
        `Requested ${requestedAngle}° exceeds max ${maxAngleDeg.toFixed(1)}° (UV travel ${uvTravel} mm, guide distance ${guideDistance} mm)`
      );
    }

    if (requestedAngle > 15) {
      issues.push(
        "Taper > 15° increases wire breakage risk and degrades surface finish"
      );
    }

    if (thickness > guideDistance * 0.8) {
      issues.push(
        `Workpiece thickness ${thickness} mm is close to guide spacing ${guideDistance} mm — taper accuracy may degrade`
      );
    }

    return {
      feature: feature.name,
      requested_angle_deg: requestedAngle,
      max_angle_deg: parseFloat(maxAngleDeg.toFixed(2)),
      feasible,
      effective_taper_height_mm: effectiveTaperHeight,
      issues,
    };
  }

  // ==========================================================================
  // PRIVATE — U06 WIRE ACCESS ANALYZER
  // ==========================================================================

  private _checkWireAccess(
    input: FeasibilityInput
  ): { feasible: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!input.machine) {
      // No machine specified — assume it fits, but note it
      return { feasible: true, issues: ["No machine envelope specified — cannot validate wire access"] };
    }

    const wp = input.workpiece;
    const m = input.machine;

    // Workpiece must fit within machine travel
    if (wp.length_mm > m.x_travel_mm) {
      issues.push(
        `Workpiece length ${wp.length_mm} mm exceeds X travel ${m.x_travel_mm} mm`
      );
    }
    if (wp.width_mm > m.y_travel_mm) {
      issues.push(
        `Workpiece width ${wp.width_mm} mm exceeds Y travel ${m.y_travel_mm} mm`
      );
    }
    if (wp.height_mm > m.z_travel_mm) {
      issues.push(
        `Workpiece height ${wp.height_mm} mm exceeds Z travel ${m.z_travel_mm} mm`
      );
    }

    // Tank size check — workpiece must physically fit in tank (with clearance for fixturing)
    const FIXTURE_CLEARANCE_MM = 50; // clearance on each side for clamping
    if (m.tank_length_mm != null && wp.length_mm + 2 * FIXTURE_CLEARANCE_MM > m.tank_length_mm) {
      issues.push(
        `Workpiece length ${wp.length_mm} mm + fixturing clearance exceeds tank length ${m.tank_length_mm} mm`
      );
    }
    if (m.tank_width_mm != null && wp.width_mm + 2 * FIXTURE_CLEARANCE_MM > m.tank_width_mm) {
      issues.push(
        `Workpiece width ${wp.width_mm} mm + fixturing clearance exceeds tank width ${m.tank_width_mm} mm`
      );
    }
    if (m.tank_depth_mm != null && wp.thickness_mm + FIXTURE_CLEARANCE_MM > m.tank_depth_mm) {
      issues.push(
        `Workpiece thickness ${wp.thickness_mm} mm + fixture exceeds tank depth ${m.tank_depth_mm} mm`
      );
    }

    return { feasible: issues.length === 0, issues };
  }

  // ==========================================================================
  // PRIVATE — U07 CUTTING TIME FEASIBILITY ESTIMATOR
  // ==========================================================================

  private _estimateTime(
    input: FeasibilityInput,
    passesNeeded: number
  ): TimeEstimate {
    const thickness = input.workpiece.thickness_mm;
    const wireDia = input.wire_diameter_mm ?? DEFAULT_WIRE_DIAMETER_MM;

    // Total profile length across all features
    const totalProfileLength = input.features.reduce(
      (sum, f) => sum + f.profile_length_mm,
      0
    );

    // Profile area = total_profile_length × thickness
    const profileArea = totalProfileLength * thickness;

    // Base MRR from material lookup
    const baseMRR = this._resolveMRR(input.material);

    // MRR adjustments
    let effectiveMRR = baseMRR;

    // Thicker stock reduces flushing efficiency
    if (thickness > 100) {
      effectiveMRR *= 0.85;
    }
    if (thickness > 200) {
      effectiveMRR *= 0.75; // cumulative with above
    }

    // Smaller wire = slower
    if (wireDia < 0.2) {
      effectiveMRR *= 0.6;
    } else if (wireDia < 0.25) {
      effectiveMRR *= 0.8;
    }

    // Skim passes are faster but still take time.
    // Rough cut: full MRR. Each skim pass ≈ 30% of rough cut time.
    const roughCutMinutes = profileArea / effectiveMRR;
    const skimPasses = Math.max(0, passesNeeded - 1);
    const skimTimeMinutes = skimPasses * roughCutMinutes * 0.3;

    const cuttingMinutes = roughCutMinutes + skimTimeMinutes;
    const cuttingHours = cuttingMinutes / 60;

    // Setup: base + per-feature threading time
    const threadingTimePerFeature = 5 / 60; // 5 min per threading in hours
    const setupHours =
      DEFAULT_SETUP_HOURS + input.features.length * threadingTimePerFeature;

    const totalHours = setupHours + cuttingHours;

    const meetsDeadline =
      input.delivery_hours == null || totalHours <= input.delivery_hours;

    return {
      total_hours: parseFloat(totalHours.toFixed(2)),
      setup_hours: parseFloat(setupHours.toFixed(2)),
      cutting_hours: parseFloat(cuttingHours.toFixed(2)),
      meets_deadline: meetsDeadline,
      deadline_hours: input.delivery_hours,
      cutting_speed_mm2_min: parseFloat(effectiveMRR.toFixed(1)),
      profile_area_mm2: parseFloat(profileArea.toFixed(1)),
    };
  }

  /**
   * Resolve material removal rate from material name.
   */
  private _resolveMRR(material: string): number {
    const key = material.toLowerCase().trim();

    if (BASE_MRR[key] != null) return BASE_MRR[key];

    for (const [mat, mrr] of Object.entries(BASE_MRR)) {
      if (key.includes(mat) || mat.includes(key)) {
        return mrr;
      }
    }

    // Default conservative MRR for unknown materials
    return 100;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** EDM Feasibility & Geometry Assessment Engine instance. */
export const edmFeasibilityEngine = new EDMFeasibilityEngine();

export { EDMFeasibilityEngine };
