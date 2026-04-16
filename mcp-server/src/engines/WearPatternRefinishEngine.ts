/**
 * PRISM MCP Server -- Wear Pattern Refinish Engine
 *
 * Spatial wear compensation for extended tool life.
 * Maps non-uniform VB(z) along the cutting edge → predicts surface error
 * profile → generates compensating finish pass with offset = -error(z).
 * Extends tool life by 1-2 extra finish passes before tool replacement.
 *
 * 5 methods:
 * - mapWearProfile: cubic spline interpolation of discrete VB measurements
 * - predictSurfaceError: recession + deflection error from wear profile
 * - generateCompensatingPass: offset toolpath for error cancellation
 * - estimateLifeExtension: additional passes before VB threshold
 * - assessWearUniformity: classify wear pattern type with recommendations
 *
 * Physics references:
 * - Tool recession from flank wear: Altintas (2012) Manufacturing Automation
 * - Force increase with wear: Kienzle modified for VB (empirical 0.5·VB/VB_max)
 * - Deflection: cantilever beam δ = FL³/(3EI), I = πd⁴/64
 * - Cubic spline: natural boundary conditions (S''=0 at endpoints)
 *
 * @module WearPatternRefinishEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default clearance angle (degrees) for flank wear recession calculation */
const DEFAULT_CLEARANCE_ANGLE_DEG = 7;

/** Default tool overhang (mm) for deflection calculation */
const DEFAULT_TOOL_OVERHANG_MM = 40;

/** Default tool diameter (mm) for moment of inertia */
const DEFAULT_TOOL_DIAMETER_MM = 12;

/** Young's modulus for carbide (GPa) */
const E_CARBIDE_GPA = 600;

/** Young's modulus for HSS (GPa) */
const E_HSS_GPA = 210;

/** Interpolation resolution for wear profile (mm) */
const SPLINE_RESOLUTION_MM = 0.1;

/** Kienzle empirical VB force amplification factor */
const KIENZLE_VB_FORCE_FACTOR = 0.5;

/** Spring pass depth of cut (mm) */
const SPRING_PASS_AP_MM = 0.05;

/** Feed reduction factor for compensating pass */
const COMPENSATING_FEED_FACTOR = 0.7;

/** Typical cutting time per compensating pass (min) */
const COMPENSATING_PASS_TIME_MIN = 5;

/** VB growth rate per pass (mm/pass) — empirical average for finish cuts */
const VB_GROWTH_PER_PASS_MM = 0.015;

/** Coefficient of variation threshold for uniform wear */
const CV_UNIFORM_THRESHOLD = 0.15;

/** Coefficient of variation threshold for moderate non-uniformity */
const CV_MODERATE_THRESHOLD = 0.35;

/** Notch detection: peak-to-mean ratio threshold */
const NOTCH_PEAK_RATIO = 2.5;

/** Chipping detection: local roughness threshold */
const CHIPPING_IRREGULARITY_THRESHOLD = 0.08;

// ============================================================================
// TYPES
// ============================================================================

/** A single discrete flank wear measurement along the cutting edge */
export interface WearMeasurement {
  /** Position along cutting edge (mm), 0 = tip */
  z_mm: number;
  /** Flank wear land width (mm) */
  VB_mm: number;
  /** Crater wear depth (mm), optional */
  KT_mm?: number;
}

/** Continuous wear profile interpolated from measurements */
export interface WearProfile {
  /** Interpolated z positions at SPLINE_RESOLUTION resolution */
  z_positions: number[];
  /** Interpolated VB values (mm) */
  VB_values: number[];
  /** Maximum VB along cutting edge */
  VB_max: number;
  /** Average VB along cutting edge */
  VB_avg: number;
  /** Coefficient of variation (std/mean) */
  uniformity_cv: number;
  /** Classified wear pattern type */
  wear_type: "uniform" | "notch" | "crater" | "chipping";
  /** Raw spline coefficients for each segment [a, b, c, d] */
  spline_coefficients: number[][];
  /** Original measurement knot positions */
  knot_positions: number[];
}

/** Predicted surface error profile from worn tool */
export interface ErrorProfile {
  /** Z positions along cutting edge (mm) */
  z_positions: number[];
  /** Recession error from VB-induced tool retreat (mm) */
  recession_mm: number[];
  /** Additional deflection from increased cutting force (mm) */
  deflection_extra_mm: number[];
  /** Total error = recession + deflection (mm) */
  total_error_mm: number[];
  /** Maximum total error (mm) */
  max_error_mm: number;
  /** Average total error (mm) */
  avg_error_mm: number;
}

/** Cutting parameters for error prediction */
export interface CuttingParams {
  /** Clearance (relief) angle in degrees */
  clearance_angle_deg?: number;
  /** Nominal cutting force (N) — if not given, estimated from Kienzle */
  nominal_force_N?: number;
  /** Tool overhang from holder (mm) */
  tool_overhang_mm?: number;
  /** Tool shank diameter (mm) */
  tool_diameter_mm?: number;
  /** Tool material for E modulus lookup */
  tool_material?: "carbide" | "hss" | "cermet";
  /** Feed rate (mm/min) for time estimation */
  feed_mm_min?: number;
  /** Spindle speed (RPM) */
  rpm?: number;
  /** Depth of cut (mm) for Kienzle force estimation */
  ap_mm?: number;
  /** Feed per tooth (mm) for Kienzle force estimation */
  fz_mm?: number;
  /** Kienzle specific cutting force kc1.1 (N/mm²) */
  kc1_1?: number;
  /** Kienzle exponent mc */
  mc?: number;
}

/** A 3D point on the toolpath */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/** Generated compensating finish pass */
export interface CompensatingPass {
  /** Offset toolpath points */
  points: Point3D[];
  /** Recommended feed rate (mm/min), reduced by 30% */
  feed_mm_min: number;
  /** Recommended spindle speed (RPM) */
  rpm: number;
  /** Depth of cut — spring pass (mm) */
  ap_mm: number;
  /** Radial engagement (mm) */
  ae_mm: number;
  /** Estimated machining time (s) */
  estimated_time_s: number;
  /** Error compensation applied at each point (mm) */
  offsets_applied: number[];
}

/** Life extension estimate result */
export interface LifeExtensionEstimate {
  /** Number of additional compensating passes possible */
  additional_passes: number;
  /** Estimated additional parts producible */
  additional_parts: number;
  /** Cost savings percentage vs immediate tool change */
  cost_savings_pct: number;
  /** Projected VB after each additional pass (mm) */
  vb_projection: number[];
  /** Total additional cutting time (min) */
  additional_time_min: number;
  /** Whether compensation is recommended */
  recommended: boolean;
  /** Reason if not recommended */
  reason?: string;
}

/** Wear uniformity assessment result */
export interface WearUniformityAssessment {
  /** Classified wear type */
  wear_type: "uniform" | "notch" | "crater" | "chipping";
  /** Coefficient of variation */
  cv: number;
  /** Whether compensation is viable */
  compensation_viable: boolean;
  /** Recommended corrective action */
  recommendation: string;
  /** Detailed metrics */
  metrics: {
    vb_max: number;
    vb_min: number;
    vb_avg: number;
    vb_std: number;
    peak_location_mm?: number;
    peak_prominence?: number;
    irregularity_score?: number;
    kt_avg?: number;
  };
}

/** Dispatcher action types */
export type WearPatternAction =
  | "map_wear"
  | "predict_error"
  | "generate_compensating_pass"
  | "estimate_life_extension"
  | "assess_uniformity";

// ============================================================================
// CUBIC SPLINE INTERPOLATION
// ============================================================================

/**
 * Compute natural cubic spline coefficients for data points.
 * Natural boundary: S''(x0) = S''(xn) = 0.
 *
 * For each segment i, spline is:
 *   S_i(x) = a_i + b_i*(x - x_i) + c_i*(x - x_i)^2 + d_i*(x - x_i)^3
 *
 * @param xs - sorted x coordinates
 * @param ys - corresponding y values
 * @returns coefficients [a, b, c, d] per segment
 */
function cubicSplineCoefficients(
  xs: number[],
  ys: number[]
): { a: number[]; b: number[]; c: number[]; d: number[] } {
  const n = xs.length - 1;
  if (n < 1) {
    return { a: [ys[0]], b: [0], c: [0], d: [0] };
  }

  const h: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    h[i] = xs[i + 1] - xs[i];
  }

  // Set up tridiagonal system for c coefficients
  const alpha: number[] = new Array(n + 1).fill(0);
  for (let i = 1; i < n; i++) {
    alpha[i] =
      (3 / h[i]) * (ys[i + 1] - ys[i]) -
      (3 / h[i - 1]) * (ys[i] - ys[i - 1]);
  }

  // Solve tridiagonal system (Thomas algorithm)
  const l: number[] = new Array(n + 1);
  const mu: number[] = new Array(n + 1);
  const z: number[] = new Array(n + 1);
  const c: number[] = new Array(n + 1);

  l[0] = 1;
  mu[0] = 0;
  z[0] = 0;

  for (let i = 1; i < n; i++) {
    l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }

  l[n] = 1;
  z[n] = 0;
  c[n] = 0;

  const b: number[] = new Array(n);
  const d: number[] = new Array(n);
  const a: number[] = new Array(n);

  for (let j = n - 1; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (ys[j + 1] - ys[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
    a[j] = ys[j];
  }

  return { a, b, c: c.slice(0, n), d };
}

/**
 * Evaluate cubic spline at a given x value.
 */
function evaluateSpline(
  x: number,
  xs: number[],
  coeffs: { a: number[]; b: number[]; c: number[]; d: number[] }
): number {
  const n = coeffs.a.length;

  // Find segment (clamp to valid range)
  let i = 0;
  for (let j = 0; j < n; j++) {
    if (x >= xs[j]) i = j;
  }
  if (i >= n) i = n - 1;

  const dx = x - xs[i];
  return coeffs.a[i] + coeffs.b[i] * dx + coeffs.c[i] * dx * dx + coeffs.d[i] * dx * dx * dx;
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class WearPatternRefinishEngineImpl {
  /**
   * Map discrete VB measurements to a continuous wear profile using cubic spline.
   *
   * Takes sparse measurements along the cutting edge and interpolates at 0.1mm
   * resolution to create a smooth, continuous VB(z) function. Also classifies
   * the wear pattern type.
   *
   * @param measurements - Array of {z_mm, VB_mm} points, minimum 3 required
   * @returns WearProfile with interpolated values and classification
   */
  mapWearProfile(measurements: WearMeasurement[]): WearProfile {
    if (measurements.length < 2) {
      throw new Error("At least 2 wear measurements required for profile mapping");
    }

    // Sort by z position
    const sorted = [...measurements].sort((a, b) => a.z_mm - b.z_mm);
    const xs = sorted.map((m) => m.z_mm);
    const ys = sorted.map((m) => m.VB_mm);

    // Compute cubic spline coefficients
    const coeffs = cubicSplineCoefficients(xs, ys);

    // Interpolate at SPLINE_RESOLUTION_MM intervals
    const zMin = xs[0];
    const zMax = xs[xs.length - 1];
    const nPoints = Math.max(2, Math.ceil((zMax - zMin) / SPLINE_RESOLUTION_MM) + 1);

    const z_positions: number[] = [];
    const VB_values: number[] = [];

    for (let i = 0; i < nPoints; i++) {
      const z = zMin + (i / (nPoints - 1)) * (zMax - zMin);
      const vb = Math.max(0, evaluateSpline(z, xs, coeffs));
      z_positions.push(Math.round(z * 1000) / 1000);
      VB_values.push(Math.round(vb * 10000) / 10000);
    }

    // Statistics
    const VB_max = Math.max(...VB_values);
    const VB_avg = VB_values.reduce((s, v) => s + v, 0) / VB_values.length;
    const VB_std = Math.sqrt(
      VB_values.reduce((s, v) => s + (v - VB_avg) ** 2, 0) / VB_values.length
    );
    const uniformity_cv = VB_avg > 0 ? VB_std / VB_avg : 0;

    // Classify wear type
    const wear_type = this._classifyWearType(VB_values, sorted, uniformity_cv);

    // Pack spline coefficients for storage
    const spline_coefficients: number[][] = [];
    for (let i = 0; i < coeffs.a.length; i++) {
      spline_coefficients.push([coeffs.a[i], coeffs.b[i], coeffs.c[i], coeffs.d[i]]);
    }

    log.info(
      `[WearPatternRefinish] mapWearProfile: ${measurements.length} pts → ${nPoints} interpolated, ` +
        `VB_max=${VB_max.toFixed(3)} mm, VB_avg=${VB_avg.toFixed(3)} mm, CV=${uniformity_cv.toFixed(3)}, type=${wear_type}`
    );

    return {
      z_positions,
      VB_values,
      VB_max,
      VB_avg,
      uniformity_cv,
      wear_type,
      spline_coefficients,
      knot_positions: xs,
    };
  }

  /**
   * Predict surface error profile from a worn tool.
   *
   * Two error sources:
   * 1. Recession: VB causes the tool to retreat from the workpiece surface
   *    by recession(z) = VB(z) × tan(clearance_angle)
   * 2. Deflection: increased cutting force from wear causes additional
   *    elastic deflection δ = FL³/(3EI)
   *
   * @param profile - Interpolated wear profile from mapWearProfile
   * @param params - Cutting conditions and tool geometry
   * @returns ErrorProfile with per-point error breakdown
   */
  predictSurfaceError(profile: WearProfile, params: CuttingParams): ErrorProfile {
    const alpha_rad =
      ((params.clearance_angle_deg ?? DEFAULT_CLEARANCE_ANGLE_DEG) * Math.PI) / 180;
    const tanAlpha = Math.tan(alpha_rad);

    // Tool deflection parameters
    const L = (params.tool_overhang_mm ?? DEFAULT_TOOL_OVERHANG_MM) / 1000; // m
    const d = (params.tool_diameter_mm ?? DEFAULT_TOOL_DIAMETER_MM) / 1000; // m
    const E_Pa = this._getYoungsModulus(params.tool_material) * 1e9;
    const I = (Math.PI * Math.pow(d, 4)) / 64; // m⁴

    // Nominal force — use provided or estimate from Kienzle
    const F_nominal = params.nominal_force_N ?? this._estimateNominalForce(params);

    const n = profile.z_positions.length;
    const recession_mm: number[] = new Array(n);
    const deflection_extra_mm: number[] = new Array(n);
    const total_error_mm: number[] = new Array(n);

    for (let i = 0; i < n; i++) {
      // 1. Recession: VB causes tool surface to recede
      recession_mm[i] = profile.VB_values[i] * tanAlpha;

      // 2. Force increase from wear (Kienzle modified)
      const VB_ratio = profile.VB_max > 0 ? profile.VB_values[i] / profile.VB_max : 0;
      const F_worn = F_nominal * (1 + KIENZLE_VB_FORCE_FACTOR * VB_ratio);
      const F_extra = F_worn - F_nominal;

      // Additional deflection from force increase: δ = FL³/(3EI)
      const delta_extra_m = (F_extra * Math.pow(L, 3)) / (3 * E_Pa * I);
      deflection_extra_mm[i] = Math.abs(delta_extra_m) * 1000; // convert to mm

      // Total error
      total_error_mm[i] = recession_mm[i] + deflection_extra_mm[i];
    }

    const max_error_mm = Math.max(...total_error_mm);
    const avg_error_mm = total_error_mm.reduce((s, v) => s + v, 0) / n;

    log.info(
      `[WearPatternRefinish] predictSurfaceError: max_error=${max_error_mm.toFixed(4)} mm, ` +
        `avg_error=${avg_error_mm.toFixed(4)} mm, recession_dom=${recession_mm[0] > deflection_extra_mm[0]}`
    );

    return {
      z_positions: profile.z_positions,
      recession_mm,
      deflection_extra_mm,
      total_error_mm,
      max_error_mm,
      avg_error_mm,
    };
  }

  /**
   * Generate a compensating finish pass that offsets by -error(z).
   *
   * For each original toolpath point, the tool is shifted inward (toward the
   * workpiece) by the predicted error amount. This cancels the dimensional
   * error caused by wear, effectively producing a surface as if the tool
   * were unworn.
   *
   * Feed is reduced by 30% and depth of cut set to spring-pass level (0.05mm)
   * to minimize additional wear during the compensating cut.
   *
   * @param errorProfile - Predicted error from predictSurfaceError
   * @param originalPath - Original toolpath points (3D)
   * @param params - Cutting conditions for S/F recommendations
   * @returns CompensatingPass with offset points and parameters
   */
  generateCompensatingPass(
    errorProfile: ErrorProfile,
    originalPath: Point3D[],
    params: CuttingParams
  ): CompensatingPass {
    if (originalPath.length < 2) {
      throw new Error("At least 2 toolpath points required");
    }

    const baseFeed = params.feed_mm_min ?? 200;
    const baseRpm = params.rpm ?? 6000;

    // Compute surface normals at each path point (approximate from path direction)
    const points: Point3D[] = [];
    const offsets_applied: number[] = [];

    for (let i = 0; i < originalPath.length; i++) {
      const pt = originalPath[i];

      // Map path index to error profile z position
      const zRange = errorProfile.z_positions;
      const zMin = zRange[0];
      const zMax = zRange[zRange.length - 1];
      const edgeLength = zMax - zMin;

      // Proportional mapping of path index to cutting edge position
      const t = edgeLength > 0 ? (i / Math.max(1, originalPath.length - 1)) : 0;
      const zEdge = zMin + t * edgeLength;

      // Interpolate error at this edge position
      const error = this._interpolateError(zEdge, errorProfile);

      // Compute approximate surface normal from path tangent
      // Normal is perpendicular to the path direction in the XY plane
      const normal = this._computeNormal(originalPath, i);

      // Offset point by -error in normal direction (push tool toward workpiece)
      points.push({
        x: pt.x + normal.x * error,
        y: pt.y + normal.y * error,
        z: pt.z + normal.z * error,
      });

      offsets_applied.push(Math.round(error * 10000) / 10000);
    }

    // Estimate cutting time
    let pathLength = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const dz = points[i].z - points[i - 1].z;
      pathLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    const compensatingFeed = baseFeed * COMPENSATING_FEED_FACTOR;
    const estimated_time_s = compensatingFeed > 0 ? (pathLength / compensatingFeed) * 60 : 0;

    log.info(
      `[WearPatternRefinish] generateCompensatingPass: ${points.length} pts, ` +
        `path=${pathLength.toFixed(1)} mm, feed=${compensatingFeed.toFixed(0)} mm/min, ` +
        `time=${estimated_time_s.toFixed(1)} s, max_offset=${Math.max(...offsets_applied).toFixed(4)} mm`
    );

    return {
      points,
      feed_mm_min: Math.round(compensatingFeed),
      rpm: baseRpm,
      ap_mm: SPRING_PASS_AP_MM,
      ae_mm: Math.max(errorProfile.max_error_mm * 1.5, 0.02),
      estimated_time_s: Math.round(estimated_time_s * 10) / 10,
      offsets_applied,
    };
  }

  /**
   * Estimate how many additional compensating passes are feasible.
   *
   * Projects VB growth from current level using empirical per-pass increment.
   * Compensating passes use reduced forces (spring pass), so VB growth rate
   * is slower than normal cutting. Each pass that stays below threshold
   * extends tool life.
   *
   * @param profile - Current wear profile
   * @param threshold_mm - VB limit for tool replacement (default 0.3 mm)
   * @returns LifeExtensionEstimate with pass count and savings
   */
  estimateLifeExtension(
    profile: WearProfile,
    threshold_mm: number = 0.3
  ): LifeExtensionEstimate {
    const currentVB = profile.VB_max;

    // If already beyond threshold, no extension possible
    if (currentVB >= threshold_mm) {
      return {
        additional_passes: 0,
        additional_parts: 0,
        cost_savings_pct: 0,
        vb_projection: [currentVB],
        additional_time_min: 0,
        recommended: false,
        reason: `VB_max (${currentVB.toFixed(3)} mm) already exceeds threshold (${threshold_mm} mm)`,
      };
    }

    // If wear pattern is chipping, don't recommend compensation
    if (profile.wear_type === "chipping") {
      return {
        additional_passes: 0,
        additional_parts: 0,
        cost_savings_pct: 0,
        vb_projection: [currentVB],
        additional_time_min: 0,
        recommended: false,
        reason: "Edge chipping detected — tool replacement recommended, compensation unsafe",
      };
    }

    // Project VB growth: compensating passes have reduced force,
    // so growth rate is ~60% of normal finish pass growth
    const compensatingGrowthRate = VB_GROWTH_PER_PASS_MM * 0.6;
    const vb_projection: number[] = [currentVB];
    let passes = 0;
    let vb = currentVB;

    while (vb + compensatingGrowthRate < threshold_mm && passes < 20) {
      vb += compensatingGrowthRate;
      vb_projection.push(Math.round(vb * 10000) / 10000);
      passes++;
    }

    // Each compensating pass typically produces 1 part (finish pass)
    const additional_parts = passes;

    // Cost savings: avoiding tool change cost + new insert cost
    // Typical: tool insert $15-40, changeover 2-5 min, machine rate $60-150/hr
    // Conservative estimate: each extra pass saves ~5% of tool cost amortization
    const cost_savings_pct = Math.min(passes * 5, 40);

    const additional_time_min = passes * COMPENSATING_PASS_TIME_MIN;

    const recommended = passes >= 1;

    log.info(
      `[WearPatternRefinish] estimateLifeExtension: ${passes} additional passes, ` +
        `${additional_parts} parts, ${cost_savings_pct}% savings, ` +
        `VB: ${currentVB.toFixed(3)} → ${vb.toFixed(3)} mm (threshold=${threshold_mm})`
    );

    return {
      additional_passes: passes,
      additional_parts,
      cost_savings_pct,
      vb_projection,
      additional_time_min,
      recommended,
      reason: recommended
        ? undefined
        : "No additional passes possible within VB threshold",
    };
  }

  /**
   * Assess wear uniformity and classify the pattern.
   *
   * Four classifications:
   * - Uniform (CV < 15%): normal progressive wear, standard compensation viable
   * - Notch (localized peak at DOC line): reduce ap, add notch avoidance
   * - Crater (VB low but KT high): monitor rake face, chip breaker issue
   * - Chipping (irregular high-frequency peaks): replacement needed, no compensation
   *
   * @param profile - Wear profile to assess
   * @param measurements - Original measurements (needed for KT data)
   * @returns WearUniformityAssessment with type, metrics, and recommendations
   */
  assessWearUniformity(
    profile: WearProfile,
    measurements?: WearMeasurement[]
  ): WearUniformityAssessment {
    const { VB_values, VB_max, VB_avg, uniformity_cv } = profile;

    const VB_min = Math.min(...VB_values);
    const VB_std = VB_avg > 0 ? uniformity_cv * VB_avg : 0;

    // Check for crater wear (KT data available?)
    const kt_values = measurements?.filter((m) => m.KT_mm !== undefined).map((m) => m.KT_mm!);
    const kt_avg =
      kt_values && kt_values.length > 0
        ? kt_values.reduce((s, v) => s + v, 0) / kt_values.length
        : undefined;

    // Detect chipping: high-frequency irregularity in the profile
    const irregularity = this._computeIrregularity(VB_values);

    // Detect notch: localized peak with high prominence
    const { peakIdx, prominence } = this._detectPeak(VB_values);
    const peakLocation =
      peakIdx >= 0 ? profile.z_positions[peakIdx] : undefined;

    // Classification logic
    let wear_type: "uniform" | "notch" | "crater" | "chipping";
    let compensation_viable: boolean;
    let recommendation: string;

    if (irregularity > CHIPPING_IRREGULARITY_THRESHOLD && uniformity_cv > CV_MODERATE_THRESHOLD) {
      wear_type = "chipping";
      compensation_viable = false;
      recommendation =
        "Edge chipping detected (irregular VB pattern). Tool replacement recommended immediately. " +
        "Check: insert grade hardness, entry/exit conditions, vibration sources.";
    } else if (kt_avg !== undefined && kt_avg > VB_avg * 1.5 && VB_avg < 0.15) {
      wear_type = "crater";
      compensation_viable = false;
      recommendation =
        `Crater wear dominant (KT_avg=${kt_avg.toFixed(3)} mm >> VB_avg=${VB_avg.toFixed(3)} mm). ` +
        "Monitor rake face — possible chip breaker geometry mismatch. " +
        "Consider: coated insert, lower cutting speed, different chip breaker.";
    } else if (prominence > NOTCH_PEAK_RATIO && uniformity_cv > CV_UNIFORM_THRESHOLD) {
      wear_type = "notch";
      compensation_viable = true;
      recommendation =
        `Notch wear at z=${peakLocation?.toFixed(1)} mm (DOC line). ` +
        "Compensation viable but reduce ap by 10-15% and vary DOC to distribute wear. " +
        "Consider: round insert geometry, ramping strategy, ceramic insert for Ni alloys.";
    } else {
      wear_type = "uniform";
      compensation_viable = true;
      recommendation =
        uniformity_cv < CV_UNIFORM_THRESHOLD
          ? "Uniform progressive wear — ideal for compensation. Standard offset pass recommended."
          : "Moderately non-uniform wear — compensation viable with per-point offset adjustment.";
    }

    log.info(
      `[WearPatternRefinish] assessWearUniformity: type=${wear_type}, CV=${uniformity_cv.toFixed(3)}, ` +
        `viable=${compensation_viable}, irregularity=${irregularity.toFixed(4)}`
    );

    return {
      wear_type,
      cv: uniformity_cv,
      compensation_viable,
      recommendation,
      metrics: {
        vb_max: VB_max,
        vb_min: VB_min,
        vb_avg: VB_avg,
        vb_std: VB_std,
        peak_location_mm: peakLocation,
        peak_prominence: prominence,
        irregularity_score: irregularity,
        kt_avg,
      },
    };
  }

  // ==========================================================================
  // DISPATCHER
  // ==========================================================================

  /**
   * Unified calculate() dispatcher for all wear pattern refinish actions.
   *
   * @param action - One of: map_wear, predict_error, generate_compensating_pass,
   *                 estimate_life_extension, assess_uniformity
   * @param params - Action-specific parameters
   * @returns Action-specific result
   */
  calculate(
    action: WearPatternAction,
    params: Record<string, unknown>
  ): WearProfile | ErrorProfile | CompensatingPass | LifeExtensionEstimate | WearUniformityAssessment {
    switch (action) {
      case "map_wear":
        return this.mapWearProfile(params.measurements as WearMeasurement[]);

      case "predict_error":
        return this.predictSurfaceError(
          params.profile as WearProfile,
          params.cutting_params as CuttingParams
        );

      case "generate_compensating_pass":
        return this.generateCompensatingPass(
          params.error_profile as ErrorProfile,
          params.original_path as Point3D[],
          params.cutting_params as CuttingParams
        );

      case "estimate_life_extension":
        return this.estimateLifeExtension(
          params.profile as WearProfile,
          (params.threshold_mm as number) ?? 0.3
        );

      case "assess_uniformity":
        return this.assessWearUniformity(
          params.profile as WearProfile,
          params.measurements as WearMeasurement[] | undefined
        );

      default:
        throw new Error(`Unknown WearPatternRefinish action: ${action}`);
    }
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Classify wear type from VB profile shape.
   */
  private _classifyWearType(
    VB_values: number[],
    measurements: WearMeasurement[],
    cv: number
  ): "uniform" | "notch" | "crater" | "chipping" {
    const irregularity = this._computeIrregularity(VB_values);

    if (irregularity > CHIPPING_IRREGULARITY_THRESHOLD && cv > CV_MODERATE_THRESHOLD) {
      return "chipping";
    }

    // Check KT dominance (crater)
    const ktMeasurements = measurements.filter((m) => m.KT_mm !== undefined);
    if (ktMeasurements.length > 0) {
      const ktAvg = ktMeasurements.reduce((s, m) => s + m.KT_mm!, 0) / ktMeasurements.length;
      const vbAvg = VB_values.reduce((s, v) => s + v, 0) / VB_values.length;
      if (ktAvg > vbAvg * 1.5 && vbAvg < 0.15) {
        return "crater";
      }
    }

    // Check for notch peak
    const { prominence } = this._detectPeak(VB_values);
    if (prominence > NOTCH_PEAK_RATIO && cv > CV_UNIFORM_THRESHOLD) {
      return "notch";
    }

    return "uniform";
  }

  /**
   * Compute irregularity score — mean absolute second derivative of VB profile.
   * High values indicate chipping (rapid local VB changes).
   */
  private _computeIrregularity(values: number[]): number {
    if (values.length < 3) return 0;
    let sum = 0;
    for (let i = 1; i < values.length - 1; i++) {
      const d2 = values[i + 1] - 2 * values[i] + values[i - 1];
      sum += Math.abs(d2);
    }
    return sum / (values.length - 2);
  }

  /**
   * Detect the most prominent peak in the VB profile (notch detection).
   * Returns index and prominence (peak_value / avg_of_rest ratio).
   */
  private _detectPeak(values: number[]): { peakIdx: number; prominence: number } {
    if (values.length < 3) return { peakIdx: -1, prominence: 0 };

    const maxVal = Math.max(...values);
    const peakIdx = values.indexOf(maxVal);

    // Prominence = peak value / average of non-peak neighbors
    const others = values.filter((_, i) => Math.abs(i - peakIdx) > 2);
    const avgOthers = others.length > 0 ? others.reduce((s, v) => s + v, 0) / others.length : 1;
    const prominence = avgOthers > 0 ? maxVal / avgOthers : 0;

    return { peakIdx, prominence };
  }

  /**
   * Get Young's modulus for tool material.
   */
  private _getYoungsModulus(material?: "carbide" | "hss" | "cermet"): number {
    switch (material) {
      case "hss":
        return E_HSS_GPA;
      case "cermet":
        return 450; // GPa, typical cermet
      case "carbide":
      default:
        return E_CARBIDE_GPA;
    }
  }

  /**
   * Estimate nominal cutting force from Kienzle model when not provided.
   * Fc = kc1.1 × ap × fz^(1 - mc)
   */
  private _estimateNominalForce(params: CuttingParams): number {
    const kc1_1 = params.kc1_1 ?? 1800; // N/mm², typical for steel
    const mc = params.mc ?? 0.25;
    const ap = params.ap_mm ?? 1.0;
    const fz = params.fz_mm ?? 0.1;

    const Fc = kc1_1 * ap * Math.pow(fz, 1 - mc);
    return Fc;
  }

  /**
   * Interpolate error value at a given z position from the error profile.
   * Linear interpolation between profile points.
   */
  private _interpolateError(z: number, errorProfile: ErrorProfile): number {
    const { z_positions, total_error_mm } = errorProfile;

    // Clamp to range
    if (z <= z_positions[0]) return total_error_mm[0];
    if (z >= z_positions[z_positions.length - 1]) return total_error_mm[total_error_mm.length - 1];

    // Find bracketing indices
    for (let i = 0; i < z_positions.length - 1; i++) {
      if (z >= z_positions[i] && z <= z_positions[i + 1]) {
        const t = (z - z_positions[i]) / (z_positions[i + 1] - z_positions[i]);
        return total_error_mm[i] + t * (total_error_mm[i + 1] - total_error_mm[i]);
      }
    }

    return total_error_mm[total_error_mm.length - 1];
  }

  /**
   * Compute approximate surface normal at a path point.
   * Uses path tangent cross product with Z-up to get the normal.
   * Falls back to Y-direction if path is degenerate.
   */
  private _computeNormal(path: Point3D[], idx: number): Point3D {
    // Get tangent vector
    let dx: number, dy: number, dz: number;
    if (idx < path.length - 1) {
      dx = path[idx + 1].x - path[idx].x;
      dy = path[idx + 1].y - path[idx].y;
      dz = path[idx + 1].z - path[idx].z;
    } else {
      dx = path[idx].x - path[idx - 1].x;
      dy = path[idx].y - path[idx - 1].y;
      dz = path[idx].z - path[idx - 1].z;
    }

    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-10) {
      return { x: 0, y: 1, z: 0 }; // fallback normal
    }

    // Tangent normalized
    const tx = dx / len;
    const ty = dy / len;
    const tz = dz / len;

    // Normal = tangent × Z-up (0, 0, 1)
    let nx = ty * 1 - tz * 0; // ty
    let ny = tz * 0 - tx * 1; // -tx
    let nz = tx * 0 - ty * 0; // 0
    // Simplifies to: nx = ty, ny = -tx, nz = 0

    nx = ty;
    ny = -tx;
    nz = 0;

    const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (nLen < 1e-10) {
      // Path is vertical — use X direction as normal
      return { x: 1, y: 0, z: 0 };
    }

    return { x: nx / nLen, y: ny / nLen, z: nz / nLen };
  }
}

/** Singleton engine instance */
export const wearPatternRefinishEngine = new WearPatternRefinishEngineImpl();
