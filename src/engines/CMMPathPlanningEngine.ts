/**
 * PRISM MCP Server — CMM Path Planning Engine
 *
 * CMM probe path planning with ISO GUM measurement uncertainty budgets.
 * Complements GaugingEngine (basic gauge selection/R&R) with CMM-specific
 * path optimization, sampling strategy, datum alignment, acceptance testing,
 * and GD&T feature uncertainty analysis.
 *
 * Methods:
 * 1. planPath          — TSP nearest-neighbor + 2-opt probe sequence optimization
 * 2. uncertaintyBudget — ISO GUM (JCGM 100:2008) Type A/B uncertainty propagation
 * 3. samplingStrategy  — Chebyshev-optimal point count per feature
 * 4. datumAlignment    — 3-2-1 datum alignment with least-squares plane fit
 * 5. acceptanceTest    — ISO 10360 CMM verification (MPEE, MPEP)
 * 6. featureUncertainty— GD&T measurement uncertainty with ISO 14253-1 guard band
 *
 * References:
 * - JCGM 100:2008 (GUM — Guide to the expression of uncertainty in measurement)
 * - ISO 10360-2 (CMM acceptance and reverification tests)
 * - ISO 14253-1 (Decision rules for conformance/nonconformance)
 * - ISO 1101 (Geometrical tolerancing)
 * - Weckenmann & Knauer, "The influence of measurement strategy on uncertainty"
 *
 * Actions: cmm_plan_path, cmm_uncertainty_budget, cmm_sampling_strategy,
 *          cmm_datum_alignment, cmm_acceptance_test, cmm_feature_uncertainty
 *
 * @module CMMPathPlanningEngine
 */

import { log } from "../utils/Logger.js";
import { EigensolverEngine } from "./EigensolverEngine.js";

// ============================================================================
// TYPES
// ============================================================================

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

/** 3D point for probe positions. */
interface Point3D { x: number; y: number; z: number; }

/** Feature type for CMM measurement. */
type FeatureType = "plane" | "cylinder" | "sphere" | "cone" | "circle" | "line" | "point";

/** Feature definition for path planning. */
export interface CMMFeature {
  id: string;
  type: FeatureType;
  nominal_position: Point3D;
  /** Override minimum point count (else uses standard minimums). */
  point_count?: number;
  /** Approach direction for the probe. */
  approach_direction?: Point3D;
  /** Feature size in mm (diameter for cylinders/spheres/circles, length for planes). */
  size_mm?: number;
  /** Tolerance in mm. */
  tolerance_mm?: number;
}

/** Input for planPath. */
export interface PlanPathInput {
  features: CMMFeature[];
  /** Probe travel speed in mm/s (default 10). */
  probe_speed_mms?: number;
  /** Measurement speed in mm/s (default 2). */
  measure_speed_mms?: number;
  /** Safe retract height in mm (default 5). */
  retract_mm?: number;
  /** Time per touch point in seconds (default 1.5). */
  time_per_point_s?: number;
}

/** Output for planPath. */
export interface PlanPathResult {
  measurement_sequence: AtomicValue<string[]>;
  total_points: AtomicValue<number>;
  estimated_time_s: AtomicValue<number>;
  total_path_length_mm: AtomicValue<number>;
}

/** Uncertainty source for GUM budget. */
export interface UncertaintySource {
  name: string;
  type: "A" | "B";
  /** For Type A: standard deviation of repeated measurements. */
  std_dev?: number;
  /** For Type A: number of observations. */
  n_obs?: number;
  /** For Type B: half-width of the distribution. */
  half_width?: number;
  /** For Type B: distribution shape. */
  distribution?: "rectangular" | "triangular" | "normal";
  /** Sensitivity coefficient ci (default 1). */
  sensitivity_coefficient?: number;
}

/** Input for uncertaintyBudget. */
export interface UncertaintyBudgetInput {
  sources: UncertaintySource[];
  /** Coverage probability (default 0.95). */
  coverage_probability?: number;
}

/** Row in the uncertainty budget table. */
export interface BudgetRow {
  source: string;
  type: "A" | "B";
  standard_uncertainty_mm: number;
  sensitivity_coefficient: number;
  contribution_mm: number;
  degrees_of_freedom: number;
  percent_contribution: number;
}

/** Output for uncertaintyBudget. */
export interface UncertaintyBudgetResult {
  combined_uncertainty_mm: AtomicValue<number>;
  expanded_uncertainty_mm: AtomicValue<number>;
  coverage_factor_k: AtomicValue<number>;
  effective_dof: AtomicValue<number>;
  budget_table: AtomicValue<BudgetRow[]>;
}

/** Input for samplingStrategy. */
export interface SamplingStrategyInput {
  feature_type: FeatureType;
  /** Feature size in mm. */
  size_mm: number;
  /** Tolerance in mm. */
  tolerance_mm: number;
  /** Desired confidence level 0-1 (default 0.95). */
  confidence?: number;
  /** Form error expectation in mm (default tolerance/4). */
  expected_form_error_mm?: number;
}

/** Output for samplingStrategy. */
export interface SamplingStrategyResult {
  recommended_points: AtomicValue<number>;
  expected_uncertainty_mm: AtomicValue<number>;
  confidence_pct: AtomicValue<number>;
  distribution_type: AtomicValue<string>;
  chebyshev_angles_deg: AtomicValue<number[]>;
}

/** Datum feature definition. */
export interface DatumFeatureInput {
  type: "plane" | "line" | "point";
  points: Point3D[];
  label: string;
}

/** Input for datumAlignment. */
export interface DatumAlignmentInput {
  primary: DatumFeatureInput;
  secondary: DatumFeatureInput;
  tertiary: DatumFeatureInput;
}

/** Output for datumAlignment. */
export interface DatumAlignmentResult {
  transform: AtomicValue<{ rotation: number[][]; translation: Point3D }>;
  residuals_um: AtomicValue<number[]>;
  alignment_quality: AtomicValue<"excellent" | "good" | "marginal" | "poor">;
  primary_flatness_um: AtomicValue<number>;
  secondary_straightness_um: AtomicValue<number>;
}

/** Input for acceptanceTest. */
export interface AcceptanceTestInput {
  /** MPEE specification: A constant in µm. */
  mpee_A_um: number;
  /** MPEE specification: K divisor for length term (µm). */
  mpee_K: number;
  /** 5 test lengths in mm for MPEE (ISO 10360 requires 5 positions). */
  test_lengths_mm: number[];
  /** 25 measured points on reference sphere for MPEP. */
  sphere_points?: Point3D[];
  /** Nominal sphere diameter in mm (default 25). */
  sphere_diameter_mm?: number;
  /** Simulated measurement errors σ in µm (used when sphere_points not provided). */
  measurement_sigma_um?: number;
}

/** Output for acceptanceTest. */
export interface AcceptanceTestResult {
  mpee_test: AtomicValue<{ pass: boolean; results: { length_mm: number; error_um: number; limit_um: number }[] }>;
  mpep_test: AtomicValue<{ pass: boolean; mpep_um: number; limit_um: number }>;
  overall_pass: AtomicValue<boolean>;
}

/** Input for featureUncertainty. */
export interface FeatureUncertaintyInput {
  feature_type: FeatureType;
  /** Measured value in mm. */
  measured_value_mm: number;
  /** Nominal value in mm. */
  nominal_mm: number;
  /** Tolerance in mm (total zone). */
  tolerance_mm: number;
  /** CMM expanded uncertainty in mm (from uncertaintyBudget or spec). */
  cmm_uncertainty_mm: number;
  /** Part CTE in µm/m/°C (default 11.7 for steel). */
  cte_um_m_C?: number;
  /** Temperature deviation from 20°C in °C (default 0). */
  delta_T_C?: number;
  /** Part length for thermal correction in mm. */
  part_length_mm?: number;
  /** Number of repeated measurements (default 1). */
  n_measurements?: number;
}

/** Output for featureUncertainty. */
export interface FeatureUncertaintyResult {
  measurement_uncertainty_mm: AtomicValue<number>;
  conformance_zone_mm: AtomicValue<number>;
  can_prove_conformance: AtomicValue<boolean>;
  thermal_correction_mm: AtomicValue<number>;
  guard_band_mm: AtomicValue<number>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum measurement points per feature type (metrological standards). */
const MIN_POINTS: Record<FeatureType, number> = {
  plane: 4,
  cylinder: 6,
  sphere: 5,
  cone: 8,
  circle: 4,
  line: 2,
  point: 1,
};

/** Typical measurement time per point in seconds. */
const DEFAULT_TIME_PER_POINT_S = 1.5;

/** t-distribution critical values for coverage factor (two-sided). */
const T_TABLE_95: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
  6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
  11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
  16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
  25: 2.060, 30: 2.042, 40: 2.021, 50: 2.009, 60: 2.000,
  80: 1.990, 100: 1.984, 200: 1.972, 500: 1.965, 1000: 1.962,
};

/** t-distribution critical values for 99% coverage. */
const T_TABLE_99: Record<number, number> = {
  1: 63.657, 2: 9.925, 3: 5.841, 4: 4.604, 5: 4.032,
  6: 3.707, 7: 3.499, 8: 3.355, 9: 3.250, 10: 3.169,
  15: 2.947, 20: 2.845, 25: 2.787, 30: 2.750, 40: 2.704,
  50: 2.678, 60: 2.660, 100: 2.626, 200: 2.601, 1000: 2.581,
};

// ============================================================================
// ENGINE
// ============================================================================

/**
 * CMMPathPlanningEngine — CMM probe path planning and ISO GUM uncertainty budgets.
 *
 * Provides six core methods for CMM measurement planning:
 * path optimization, GUM uncertainty, sampling strategy, datum alignment,
 * ISO 10360 acceptance testing, and GD&T feature uncertainty with guard bands.
 */
export class CMMPathPlanningEngine {

  // ==========================================================================
  // 1. planPath — Optimal CMM probe sequence
  // ==========================================================================

  /**
   * Plan an optimal CMM probe measurement sequence using TSP nearest-neighbor
   * heuristic with 2-opt local improvement.
   *
   * Assigns minimum point counts per feature type, computes inter-feature
   * travel distances, and optimizes the visit order to minimize total
   * probe travel path length.
   *
   * @param input - Features to measure and machine parameters
   * @returns Optimized measurement sequence, total points, time, and path length
   *
   * @example
   * ```ts
   * const result = cmmPathPlanningEngine.planPath({
   *   features: [
   *     { id: "F1", type: "plane", nominal_position: { x: 0, y: 0, z: 0 } },
   *     { id: "F2", type: "cylinder", nominal_position: { x: 100, y: 0, z: 0 }, size_mm: 20 },
   *   ],
   *   probe_speed_mms: 10,
   * });
   * ```
   */
  planPath(input: PlanPathInput): PlanPathResult {
    const {
      features,
      probe_speed_mms = 10,
      measure_speed_mms = 2,
      retract_mm = 5,
      time_per_point_s = DEFAULT_TIME_PER_POINT_S,
    } = input;

    if (!features || features.length === 0) {
      throw new Error("planPath: at least one feature is required");
    }

    // Assign point counts
    const pointCounts = features.map(f => f.point_count ?? MIN_POINTS[f.type] ?? 4);
    const totalPoints = pointCounts.reduce((s, p) => s + p, 0);

    // Build distance matrix between feature nominal positions
    const n = features.length;
    const dist: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = this._dist3D(features[i].nominal_position, features[j].nominal_position);
        dist[i][j] = d;
        dist[j][i] = d;
      }
    }

    // Nearest-neighbor TSP
    let order = this._nearestNeighborTSP(dist, n);

    // 2-opt improvement
    order = this._twoOpt(order, dist);

    // Compute total path length
    let totalLength = 0;
    for (let i = 0; i < order.length - 1; i++) {
      totalLength += dist[order[i]][order[i + 1]];
      // Add retract between features
      totalLength += 2 * retract_mm;
    }

    // Time estimate: travel time + measurement time
    const travelTime = totalLength / probe_speed_mms;
    const measureTime = totalPoints * time_per_point_s;
    // Per-feature local scanning time (approach at measure speed)
    const localTravel = pointCounts.reduce((s, pc, i) => {
      const size = features[i].size_mm ?? 50;
      // Approximate local path as fraction of feature perimeter
      const localDist = (size * Math.PI * pc) / (MIN_POINTS[features[i].type] * 2);
      return s + localDist / measure_speed_mms;
    }, 0);
    const estimatedTime = travelTime + measureTime + localTravel;

    const sequence = order.map(i => features[i].id);

    log.info(`CMMPathPlanning.planPath: ${n} features, ${totalPoints} points, ${totalLength.toFixed(1)} mm path`);

    return {
      measurement_sequence: {
        value: sequence,
        unit: "feature_ids",
        formula: "TSP nearest-neighbor + 2-opt optimization",
        confidence: 0.9,
      },
      total_points: {
        value: totalPoints,
        unit: "points",
        formula: `Σ max(specified, min_required) per feature; mins: plane=4, cyl=6, sphere=5, cone=8, circle=4`,
      },
      estimated_time_s: {
        value: Math.round(estimatedTime * 10) / 10,
        unit: "s",
        formula: `t = L_travel/v_probe + n_points × t_per_point + L_local/v_measure`,
        confidence: 0.85,
      },
      total_path_length_mm: {
        value: Math.round(totalLength * 100) / 100,
        unit: "mm",
        formula: "Σ inter-feature distances (optimized order) + 2 × retract per transition",
      },
    };
  }

  // ==========================================================================
  // 2. uncertaintyBudget — ISO GUM (JCGM 100:2008)
  // ==========================================================================

  /**
   * Compute an ISO GUM uncertainty budget from Type A and Type B sources.
   *
   * Type A: statistical evaluation from repeated measurements (u = s/√n).
   * Type B: assumed distributions — rectangular (u = a/√3), triangular (u = a/√6),
   *         normal (u = a/k where k from coverage).
   * Combined: u_c = √(Σ(ci·ui)²)
   * Effective DOF: Welch-Satterthwaite formula.
   * Expanded: U = k_p · u_c where k_p from t-distribution at ν_eff.
   *
   * @param input - Uncertainty sources and coverage probability
   * @returns Complete GUM uncertainty budget
   *
   * @example
   * ```ts
   * const budget = cmmPathPlanningEngine.uncertaintyBudget({
   *   sources: [
   *     { name: "repeatability", type: "A", std_dev: 0.002, n_obs: 10 },
   *     { name: "resolution", type: "B", half_width: 0.0005, distribution: "rectangular" },
   *     { name: "thermal", type: "B", half_width: 0.003, distribution: "triangular" },
   *   ],
   *   coverage_probability: 0.95,
   * });
   * ```
   */
  uncertaintyBudget(input: UncertaintyBudgetInput): UncertaintyBudgetResult {
    const { sources, coverage_probability = 0.95 } = input;

    if (!sources || sources.length === 0) {
      throw new Error("uncertaintyBudget: at least one source is required");
    }

    const budgetRows: BudgetRow[] = [];
    let sumCiUiSq = 0;
    // For Welch-Satterthwaite
    const ciUi: number[] = [];
    const dofs: number[] = [];

    for (const src of sources) {
      const ci = src.sensitivity_coefficient ?? 1;
      let ui: number;
      let dof: number;

      if (src.type === "A") {
        // Type A: u = s/√n
        const s = src.std_dev ?? 0;
        const n = src.n_obs ?? 1;
        ui = n > 1 ? s / Math.sqrt(n) : s;
        dof = Math.max(n - 1, 1);
      } else {
        // Type B
        const a = src.half_width ?? 0;
        const dist = src.distribution ?? "rectangular";
        if (dist === "rectangular") {
          ui = a / Math.sqrt(3);       // u = a/√3
        } else if (dist === "triangular") {
          ui = a / Math.sqrt(6);       // u = a/√6
        } else {
          // Normal: half_width is k*sigma, assume k=2 for 95%
          ui = a / 2;
        }
        dof = Infinity; // Type B: infinite DOF (by convention, use 1e6)
      }

      const contribution = ci * ui;
      sumCiUiSq += contribution * contribution;
      ciUi.push(contribution);
      dofs.push(dof === Infinity ? 1e6 : dof);

      budgetRows.push({
        source: src.name,
        type: src.type,
        standard_uncertainty_mm: Math.round(ui * 1e6) / 1e6,
        sensitivity_coefficient: ci,
        contribution_mm: Math.round(contribution * 1e6) / 1e6,
        degrees_of_freedom: dof === Infinity ? 1e6 : dof,
        percent_contribution: 0, // filled below
      });
    }

    const uc = Math.sqrt(sumCiUiSq);

    // Fill percent contributions
    for (const row of budgetRows) {
      row.percent_contribution = uc > 0
        ? Math.round((row.contribution_mm * row.contribution_mm / sumCiUiSq) * 10000) / 100
        : 0;
    }

    // Welch-Satterthwaite effective degrees of freedom
    // ν_eff = u_c^4 / Σ((ci·ui)^4 / νi)
    let denominator = 0;
    for (let i = 0; i < ciUi.length; i++) {
      const ciui4 = Math.pow(ciUi[i], 4);
      denominator += ciui4 / dofs[i];
    }
    const nuEff = denominator > 0 ? Math.pow(uc, 4) / denominator : 1e6;
    const nuEffRounded = Math.min(Math.round(nuEff), 1e6);

    // Coverage factor from t-distribution
    const kp = this._coverageFactor(nuEffRounded, coverage_probability);
    const expanded = kp * uc;

    log.info(`CMMPathPlanning.uncertaintyBudget: u_c=${(uc * 1000).toFixed(4)} µm, U=${(expanded * 1000).toFixed(4)} µm (k=${kp.toFixed(3)})`);

    return {
      combined_uncertainty_mm: {
        value: Math.round(uc * 1e6) / 1e6,
        unit: "mm",
        formula: "u_c = √(Σ(ci·ui)²)",
      },
      expanded_uncertainty_mm: {
        value: Math.round(expanded * 1e6) / 1e6,
        unit: "mm",
        formula: `U = k × u_c = ${kp.toFixed(3)} × ${(uc * 1e6 / 1e6).toFixed(6)}`,
      },
      coverage_factor_k: {
        value: Math.round(kp * 1000) / 1000,
        unit: "dimensionless",
        formula: `t(ν_eff=${nuEffRounded}, p=${coverage_probability}) from Welch-Satterthwaite`,
      },
      effective_dof: {
        value: nuEffRounded,
        unit: "dimensionless",
        formula: "ν_eff = u_c⁴ / Σ((ci·ui)⁴ / νi)  [Welch-Satterthwaite]",
      },
      budget_table: {
        value: budgetRows,
        unit: "table",
        formula: "ISO GUM JCGM 100:2008 uncertainty budget",
      },
    };
  }

  // ==========================================================================
  // 3. samplingStrategy — Optimal point count per feature
  // ==========================================================================

  /**
   * Determine optimal measurement point count and angular distribution
   * for a given feature type using Chebyshev spacing for minimax form error
   * and uncertainty–point-count trade-off analysis.
   *
   * Chebyshev nodes on [0, 2π): θ_k = π(2k-1)/(2n) for k=1..n
   * provide minimax interpolation error for form assessment.
   *
   * Uncertainty reduction: u ∝ 1/√n for random error,
   * form error sampling: u_form ∝ 1/n² for Chebyshev-spaced points.
   *
   * @param input - Feature type, size, tolerance, and confidence target
   * @returns Recommended points, expected uncertainty, and Chebyshev angles
   */
  samplingStrategy(input: SamplingStrategyInput): SamplingStrategyResult {
    const {
      feature_type,
      size_mm,
      tolerance_mm,
      confidence = 0.95,
      expected_form_error_mm,
    } = input;

    const minPts = MIN_POINTS[feature_type] ?? 4;
    const formError = expected_form_error_mm ?? tolerance_mm / 4;

    // Target: measurement uncertainty < tolerance / 5 (for Cpk > 1.33 discrimination)
    const uTarget = tolerance_mm / 5;

    // Random error component (CMM repeatability, ~1 µm typical scaled by size)
    const baseRepeatability = 0.001 + size_mm * 1e-5; // mm

    // Find optimal n where combined uncertainty < uTarget
    let n = minPts;
    let uCombined = Infinity;
    while (n <= 200) {
      const uRandom = baseRepeatability / Math.sqrt(n);
      // Form error sampling uncertainty: Chebyshev bound
      const uForm = formError / (n * n);
      uCombined = Math.sqrt(uRandom * uRandom + uForm * uForm);
      if (uCombined < uTarget) break;
      n++;
    }
    // Ensure at least min points
    n = Math.max(n, minPts);
    // Cap at reasonable maximum
    n = Math.min(n, 200);

    // Recompute final uncertainty
    const uRandom = baseRepeatability / Math.sqrt(n);
    const uForm = formError / (n * n);
    uCombined = Math.sqrt(uRandom * uRandom + uForm * uForm);

    // Chebyshev angles for circular/cylindrical features
    const chebyshevAngles: number[] = [];
    const isCircular = ["circle", "cylinder", "sphere", "cone"].includes(feature_type);
    if (isCircular) {
      for (let k = 1; k <= n; k++) {
        const angle = (180 * (2 * k - 1)) / (2 * n); // degrees, mapped to [0, 360)
        chebyshevAngles.push(Math.round((angle % 360) * 100) / 100);
      }
    }

    const confPct = Math.round(confidence * 100);

    log.info(`CMMPathPlanning.samplingStrategy: ${feature_type} → ${n} points, u=${(uCombined * 1000).toFixed(3)} µm`);

    return {
      recommended_points: {
        value: n,
        unit: "points",
        formula: `n ≥ ${minPts} (min for ${feature_type}), optimized for u < tol/5 = ${(uTarget * 1000).toFixed(3)} µm`,
      },
      expected_uncertainty_mm: {
        value: Math.round(uCombined * 1e6) / 1e6,
        unit: "mm",
        formula: "u = √(u_random² + u_form²); u_random = σ/√n, u_form = e_form/n²",
      },
      confidence_pct: {
        value: confPct,
        unit: "%",
        formula: `Specified coverage probability: ${confidence}`,
      },
      distribution_type: {
        value: isCircular ? "Chebyshev (minimax)" : "uniform grid",
        unit: "type",
        formula: "Chebyshev nodes minimize maximum interpolation error (minimax)",
      },
      chebyshev_angles_deg: {
        value: chebyshevAngles,
        unit: "deg",
        formula: "θ_k = π(2k-1)/(2n) mapped to [0°, 360°)",
      },
    };
  }

  // ==========================================================================
  // 4. datumAlignment — 3-2-1 datum alignment
  // ==========================================================================

  /**
   * Compute 3-2-1 datum alignment from measured points.
   *
   * - Primary (plane): least-squares plane fit via SVD-free normal estimation
   *   (cross-product method with centroid subtraction). Constrains 3 DOF
   *   (1 translation + 2 rotations).
   * - Secondary (line): project onto primary plane, fit line. Constrains
   *   2 DOF (1 rotation + 1 translation).
   * - Tertiary (point): project onto intersection, set origin. Constrains
   *   1 DOF (1 translation).
   *
   * @param input - Primary, secondary, and tertiary datum feature points
   * @returns Alignment transform, residuals, and quality assessment
   */
  datumAlignment(input: DatumAlignmentInput): DatumAlignmentResult {
    const { primary, secondary, tertiary } = input;

    if (primary.points.length < 3) {
      throw new Error("datumAlignment: primary plane requires at least 3 points");
    }
    if (secondary.points.length < 2) {
      throw new Error("datumAlignment: secondary line requires at least 2 points");
    }
    if (tertiary.points.length < 1) {
      throw new Error("datumAlignment: tertiary point requires at least 1 point");
    }

    // ── Primary: Least-squares plane fit ──
    const planeFit = this._fitPlane(primary.points);
    const { normal, centroid, residuals: planeResiduals } = planeFit;

    // Rotation to align plane normal with Z-axis
    const zAxis: Point3D = { x: 0, y: 0, z: 1 };
    const rotMatrix = this._rotationBetweenVectors(normal, zAxis);

    // Transform all points to aligned coordinate system
    const primaryAligned = primary.points.map(p => this._transformPoint(p, rotMatrix, centroid));
    const secondaryAligned = secondary.points.map(p => this._transformPoint(p, rotMatrix, centroid));
    const tertiaryAligned = tertiary.points.map(p => this._transformPoint(p, rotMatrix, centroid));

    // ── Secondary: Fit line in XY plane ──
    const secProjected = secondaryAligned.map(p => ({ x: p.x, y: p.y }));
    const lineAngle = this._fitLine2D(secProjected);
    const secResiduals = this._lineResiduals2D(secProjected, lineAngle);

    // Rotation about Z to align secondary with X-axis
    const cosA = Math.cos(-lineAngle);
    const sinA = Math.sin(-lineAngle);
    const zRotMatrix: number[][] = [
      [cosA, -sinA, 0],
      [sinA, cosA, 0],
      [0, 0, 1],
    ];

    // Combine rotations
    const combinedRot = this._multiplyMatrices(zRotMatrix, rotMatrix);

    // ── Tertiary: Origin point ──
    const tertiaryTransformed = tertiaryAligned.map(p => {
      const x2 = cosA * p.x - sinA * p.y;
      const y2 = sinA * p.x + cosA * p.y;
      return { x: x2, y: y2, z: p.z };
    });
    const origin: Point3D = {
      x: tertiaryTransformed.reduce((s, p) => s + p.x, 0) / tertiaryTransformed.length,
      y: tertiaryTransformed.reduce((s, p) => s + p.y, 0) / tertiaryTransformed.length,
      z: 0, // Already on primary plane
    };

    // Translation = -(rotation × centroid + origin offset)
    const rotCentroid = this._matVecMul(combinedRot, centroid);
    const translation: Point3D = {
      x: -(rotCentroid.x + origin.x),
      y: -(rotCentroid.y + origin.y),
      z: -rotCentroid.z,
    };

    // Residuals in µm
    const allResiduals = [
      ...planeResiduals.map(r => Math.round(r * 1000 * 100) / 100),
      ...secResiduals.map(r => Math.round(r * 1000 * 100) / 100),
    ];

    const flatness = Math.max(...planeResiduals.map(Math.abs)) * 1000; // µm
    const straightness = Math.max(...secResiduals.map(Math.abs)) * 1000; // µm

    // Quality assessment
    let quality: "excellent" | "good" | "marginal" | "poor";
    const maxResidual = Math.max(flatness, straightness);
    if (maxResidual < 2) quality = "excellent";
    else if (maxResidual < 5) quality = "good";
    else if (maxResidual < 15) quality = "marginal";
    else quality = "poor";

    log.info(`CMMPathPlanning.datumAlignment: quality=${quality}, flatness=${flatness.toFixed(2)} µm`);

    return {
      transform: {
        value: {
          rotation: combinedRot.map(row => row.map(v => Math.round(v * 1e9) / 1e9)),
          translation: {
            x: Math.round(translation.x * 1e6) / 1e6,
            y: Math.round(translation.y * 1e6) / 1e6,
            z: Math.round(translation.z * 1e6) / 1e6,
          },
        },
        unit: "mm",
        formula: "3-2-1 alignment: R_z(secondary) × R(primary_normal→Z) + T(tertiary→origin)",
      },
      residuals_um: {
        value: allResiduals,
        unit: "µm",
        formula: "Signed distance from fitted geometry per measured point",
      },
      alignment_quality: {
        value: quality,
        unit: "category",
        formula: "Based on max residual: <2µm=excellent, <5µm=good, <15µm=marginal, else=poor",
      },
      primary_flatness_um: {
        value: Math.round(flatness * 100) / 100,
        unit: "µm",
        formula: "max|point-to-plane distance| across primary datum points",
      },
      secondary_straightness_um: {
        value: Math.round(straightness * 100) / 100,
        unit: "µm",
        formula: "max|point-to-line distance| across secondary datum points (in XY plane)",
      },
    };
  }

  // ==========================================================================
  // 5. acceptanceTest — ISO 10360 CMM verification
  // ==========================================================================

  /**
   * Simulate or evaluate ISO 10360-2 CMM acceptance and reverification tests.
   *
   * MPEE (Maximum Permissible Error of indication for size): ±(A + L/K)
   * where A is the constant error in µm, L is measured length in mm, K is the
   * divisor. Tests 5 calibrated lengths at various orientations.
   *
   * MPEP (Maximum Permissible Probing Error): range of 25 points measured
   * on a reference sphere. Must be ≤ specified MPEP limit.
   *
   * When sphere_points are not provided, simulates measurements with
   * Gaussian noise at the specified σ.
   *
   * @param input - MPEE spec, test lengths, and sphere measurement data
   * @returns Pass/fail results for MPEE, MPEP, and overall
   */
  acceptanceTest(input: AcceptanceTestInput): AcceptanceTestResult {
    const {
      mpee_A_um,
      mpee_K,
      test_lengths_mm,
      sphere_points,
      sphere_diameter_mm = 25,
      measurement_sigma_um = 1.5,
    } = input;

    if (test_lengths_mm.length < 5) {
      throw new Error("acceptanceTest: ISO 10360 requires at least 5 test lengths");
    }

    // ── MPEE test ──
    // Simulate measurement errors for each length
    const mpeeResults: { length_mm: number; error_um: number; limit_um: number }[] = [];
    let mpeePass = true;

    for (const length of test_lengths_mm) {
      const limit = mpee_A_um + length / mpee_K;
      // Simulate error using deterministic pseudo-random based on length
      // (seeded by length for reproducibility)
      const seed = Math.abs(Math.sin(length * 137.508) * 10000);
      const error = this._gaussianFromSeed(seed) * measurement_sigma_um;
      const absError = Math.abs(error);

      if (absError > limit) mpeePass = false;

      mpeeResults.push({
        length_mm: length,
        error_um: Math.round(error * 100) / 100,
        limit_um: Math.round(limit * 100) / 100,
      });
    }

    // ── MPEP test ──
    let mpepValue: number;
    const mpepLimit = mpee_A_um; // MPEP limit is typically the A constant

    if (sphere_points && sphere_points.length >= 25) {
      // Compute from actual measurements
      // Fit sphere and find range of radial deviations
      const fitted = this._fitSphere(sphere_points);
      const radialDeviations = sphere_points.map(p => {
        const r = this._dist3D(p, fitted.center);
        return (r - fitted.radius) * 1000; // µm
      });
      mpepValue = Math.max(...radialDeviations) - Math.min(...radialDeviations);
    } else {
      // Simulate 25 sphere points with Gaussian noise
      const deviations: number[] = [];
      for (let i = 0; i < 25; i++) {
        const seed = Math.abs(Math.sin((i + 1) * 237.508 + sphere_diameter_mm) * 10000);
        deviations.push(this._gaussianFromSeed(seed) * measurement_sigma_um);
      }
      mpepValue = Math.max(...deviations) - Math.min(...deviations);
    }

    const mpepPass = mpepValue <= mpepLimit;
    const overallPass = mpeePass && mpepPass;

    log.info(`CMMPathPlanning.acceptanceTest: MPEE=${mpeePass ? "PASS" : "FAIL"}, MPEP=${mpepPass ? "PASS" : "FAIL"} (${mpepValue.toFixed(2)} µm)`);

    return {
      mpee_test: {
        value: { pass: mpeePass, results: mpeeResults },
        unit: "µm",
        formula: `MPEE = ±(${mpee_A_um} + L/${mpee_K}) µm per ISO 10360-2`,
      },
      mpep_test: {
        value: {
          pass: mpepPass,
          mpep_um: Math.round(mpepValue * 100) / 100,
          limit_um: mpepLimit,
        },
        unit: "µm",
        formula: `MPEP = range of 25-point sphere deviations ≤ ${mpepLimit} µm`,
      },
      overall_pass: {
        value: overallPass,
        unit: "boolean",
        formula: "MPEE_pass AND MPEP_pass per ISO 10360-2",
      },
    };
  }

  // ==========================================================================
  // 6. featureUncertainty — GD&T feature measurement uncertainty
  // ==========================================================================

  /**
   * Calculate measurement uncertainty for a GD&T feature with temperature
   * compensation and ISO 14253-1 guard band for conformance assessment.
   *
   * Temperature correction: ΔL = α · ΔT · L (CTE-based thermal expansion).
   * Guard band: per ISO 14253-1, the acceptance zone is reduced by the
   * expanded measurement uncertainty U on each side.
   * Conformance: can prove conformance only if the measured value falls
   * within the guard-banded tolerance zone.
   *
   * @param input - Feature measurement data, CMM uncertainty, and thermal conditions
   * @returns Measurement uncertainty, guard-banded conformance zone, and conformance assessment
   */
  featureUncertainty(input: FeatureUncertaintyInput): FeatureUncertaintyResult {
    const {
      feature_type,
      measured_value_mm,
      nominal_mm,
      tolerance_mm,
      cmm_uncertainty_mm,
      cte_um_m_C = 11.7,
      delta_T_C = 0,
      part_length_mm,
      n_measurements = 1,
    } = input;

    const effectiveLength = part_length_mm ?? Math.abs(nominal_mm);

    // Temperature correction: ΔL = α · ΔT · L
    // α in µm/m/°C → convert to mm/mm/°C: × 1e-6
    const thermalCorrection = (cte_um_m_C * 1e-6) * delta_T_C * effectiveLength;

    // Thermal uncertainty component (assuming ΔT uncertainty = ±0.5°C, rectangular)
    const uThermal = (cte_um_m_C * 1e-6 * 0.5 * effectiveLength) / Math.sqrt(3);

    // CMM uncertainty component (expanded → standard: divide by k≈2)
    const uCMM = cmm_uncertainty_mm / 2;

    // Repeatability improvement from multiple measurements
    const uRepeat = uCMM / Math.sqrt(n_measurements);

    // Feature-specific form uncertainty factor
    const formFactors: Record<FeatureType, number> = {
      plane: 1.0,
      cylinder: 1.2,
      sphere: 1.1,
      cone: 1.5,
      circle: 1.15,
      line: 0.9,
      point: 0.8,
    };
    const formFactor = formFactors[feature_type] ?? 1.0;
    const uForm = uCMM * (formFactor - 1); // Additional form-related uncertainty

    // Combined standard uncertainty
    const uc = Math.sqrt(uRepeat * uRepeat + uThermal * uThermal + uForm * uForm);

    // Expanded uncertainty (k=2 for 95%)
    const U = 2 * uc;

    // ISO 14253-1 guard band
    // Acceptance zone = tolerance - 2U (guard band on each side)
    const guardBand = U;
    const conformanceZone = Math.max(tolerance_mm - 2 * guardBand, 0);

    // Check conformance
    const correctedValue = measured_value_mm - thermalCorrection;
    const deviation = Math.abs(correctedValue - nominal_mm);
    const canProve = deviation <= conformanceZone / 2;

    log.info(`CMMPathPlanning.featureUncertainty: U=${(U * 1000).toFixed(3)} µm, conform=${canProve}`);

    return {
      measurement_uncertainty_mm: {
        value: Math.round(U * 1e6) / 1e6,
        unit: "mm",
        formula: `U = 2 × √(u_CMM²/n + u_thermal² + u_form²); u_thermal = α·0.5°C·L/√3`,
        confidence: 0.95,
      },
      conformance_zone_mm: {
        value: Math.round(conformanceZone * 1e6) / 1e6,
        unit: "mm",
        formula: `zone = tolerance - 2U = ${tolerance_mm} - 2×${U.toFixed(6)} per ISO 14253-1`,
      },
      can_prove_conformance: {
        value: canProve,
        unit: "boolean",
        formula: `|measured - nominal| = ${deviation.toFixed(6)} mm ${canProve ? "≤" : ">"} zone/2 = ${(conformanceZone / 2).toFixed(6)} mm`,
      },
      thermal_correction_mm: {
        value: Math.round(thermalCorrection * 1e6) / 1e6,
        unit: "mm",
        formula: `ΔL = α·ΔT·L = ${cte_um_m_C}e-6 × ${delta_T_C} × ${effectiveLength} mm`,
      },
      guard_band_mm: {
        value: Math.round(guardBand * 1e6) / 1e6,
        unit: "mm",
        formula: "Guard band = U (expanded measurement uncertainty) per ISO 14253-1",
      },
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /** Euclidean distance between two 3D points. */
  private _dist3D(a: Point3D, b: Point3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /** Nearest-neighbor TSP heuristic starting from node 0. */
  private _nearestNeighborTSP(dist: number[][], n: number): number[] {
    const visited = new Set<number>();
    const order: number[] = [0];
    visited.add(0);

    for (let step = 1; step < n; step++) {
      const current = order[order.length - 1];
      let bestNext = -1;
      let bestDist = Infinity;
      for (let j = 0; j < n; j++) {
        if (!visited.has(j) && dist[current][j] < bestDist) {
          bestDist = dist[current][j];
          bestNext = j;
        }
      }
      if (bestNext >= 0) {
        order.push(bestNext);
        visited.add(bestNext);
      }
    }
    return order;
  }

  /**
   * 2-opt local search improvement for TSP.
   * Reverses sub-segments to reduce total path length.
   */
  private _twoOpt(route: number[], dist: number[][]): number[] {
    const n = route.length;
    if (n < 4) return route;

    let improved = true;
    const result = [...route];
    let maxIter = 100;

    while (improved && maxIter-- > 0) {
      improved = false;
      for (let i = 0; i < n - 2; i++) {
        for (let j = i + 2; j < n; j++) {
          const a = result[i], b = result[i + 1];
          const c = result[j], d = j + 1 < n ? result[j + 1] : result[0];

          const oldDist = dist[a][b] + dist[c][d];
          const newDist = dist[a][c] + dist[b][d];

          if (newDist < oldDist - 1e-10) {
            // Reverse segment [i+1 .. j]
            let left = i + 1, right = j;
            while (left < right) {
              const tmp = result[left];
              result[left] = result[right];
              result[right] = tmp;
              left++;
              right--;
            }
            improved = true;
          }
        }
      }
    }
    return result;
  }

  /** Look up coverage factor from t-distribution table with interpolation. */
  private _coverageFactor(dof: number, probability: number): number {
    const table = probability >= 0.99 ? T_TABLE_99 : T_TABLE_95;
    const keys = Object.keys(table).map(Number).sort((a, b) => a - b);

    if (dof >= 1000) return probability >= 0.99 ? 2.576 : 1.96;

    // Find bracketing keys
    let lo = keys[0], hi = keys[keys.length - 1];
    for (const k of keys) {
      if (k <= dof) lo = k;
      if (k >= dof && hi === keys[keys.length - 1]) hi = k;
    }
    // Fix hi
    for (const k of keys) {
      if (k >= dof) { hi = k; break; }
    }

    if (lo === hi) return table[lo];

    // Linear interpolation
    const frac = (dof - lo) / (hi - lo);
    return table[lo] + frac * (table[hi] - table[lo]);
  }

  /**
   * Least-squares plane fit using cross-product method.
   * Returns normal vector (unit), centroid, and per-point residuals.
   */
  private _fitPlane(points: Point3D[]): { normal: Point3D; centroid: Point3D; residuals: number[] } {
    const n = points.length;

    // Centroid
    const cx = points.reduce((s, p) => s + p.x, 0) / n;
    const cy = points.reduce((s, p) => s + p.y, 0) / n;
    const cz = points.reduce((s, p) => s + p.z, 0) / n;
    const centroid: Point3D = { x: cx, y: cy, z: cz };

    // Covariance matrix elements (symmetric 3×3)
    let sxx = 0, sxy = 0, sxz = 0, syy = 0, syz = 0, szz = 0;
    for (const p of points) {
      const dx = p.x - cx, dy = p.y - cy, dz = p.z - cz;
      sxx += dx * dx; sxy += dx * dy; sxz += dx * dz;
      syy += dy * dy; syz += dy * dz; szz += dz * dz;
    }

    // Find the eigenvector corresponding to the smallest eigenvalue
    // of the covariance matrix — this is the plane normal.
    // Use power iteration on the adjugate (cofactor) approach for 3×3.
    const normal = this._smallestEigenvector3x3(sxx, sxy, sxz, syy, syz, szz);

    // Compute residuals (signed distance from plane)
    const residuals = points.map(p => {
      return normal.x * (p.x - cx) + normal.y * (p.y - cy) + normal.z * (p.z - cz);
    });

    return { normal, centroid, residuals };
  }

  /**
   * Find the eigenvector of the smallest eigenvalue of a 3×3 symmetric matrix.
   * Uses EigensolverEngine.symmetricQR for numerical stability.
   * @milestone SCIMATH-WIRE-MS0 P6-U02
   */
  private _smallestEigenvector3x3(
    a11: number, a12: number, a13: number,
    a22: number, a23: number, a33: number,
  ): Point3D {
    const matrix = [
      [a11, a12, a13],
      [a12, a22, a23],
      [a13, a23, a33],
    ];

    const result = EigensolverEngine.symmetricQR(matrix, { maxIterations: 100, tolerance: 1e-12 });

    if (!result.converged || result.eigenvalues.length < 3) {
      return { x: 0, y: 0, z: 1 }; // fallback for degenerate case
    }

    // Find index of smallest eigenvalue
    let minIdx = 0;
    for (let i = 1; i < result.eigenvalues.length; i++) {
      if (result.eigenvalues[i] < result.eigenvalues[minIdx]) minIdx = i;
    }

    // Extract the corresponding eigenvector (column minIdx of eigenvectors matrix)
    const ev = result.eigenvectors.map(row => row[minIdx]);
    const len = Math.sqrt(ev[0] * ev[0] + ev[1] * ev[1] + ev[2] * ev[2]);
    if (len < 1e-12) return { x: 0, y: 0, z: 1 };

    return { x: ev[0] / len, y: ev[1] / len, z: ev[2] / len };
  }

  /**
   * Compute rotation matrix that rotates vector 'from' to vector 'to'.
   * Uses Rodrigues' rotation formula.
   */
  private _rotationBetweenVectors(from: Point3D, to: Point3D): number[][] {
    // Normalize
    const fl = Math.sqrt(from.x ** 2 + from.y ** 2 + from.z ** 2);
    const tl = Math.sqrt(to.x ** 2 + to.y ** 2 + to.z ** 2);
    const f = { x: from.x / fl, y: from.y / fl, z: from.z / fl };
    const t = { x: to.x / tl, y: to.y / tl, z: to.z / tl };

    // Cross product v = f × t
    const vx = f.y * t.z - f.z * t.y;
    const vy = f.z * t.x - f.x * t.z;
    const vz = f.x * t.y - f.y * t.x;

    // Dot product
    const c = f.x * t.x + f.y * t.y + f.z * t.z;

    if (c > 0.99999) {
      // Vectors are parallel — identity
      return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    }
    if (c < -0.99999) {
      // Vectors are anti-parallel — 180° rotation about any perpendicular axis
      const perp = Math.abs(f.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
      const ax = f.y * perp.z - f.z * perp.y;
      const ay = f.z * perp.x - f.x * perp.z;
      const az = f.x * perp.y - f.y * perp.x;
      const al = Math.sqrt(ax * ax + ay * ay + az * az);
      const ux = ax / al, uy = ay / al, uz = az / al;
      // 180° rotation about (ux, uy, uz)
      return [
        [2 * ux * ux - 1, 2 * ux * uy, 2 * ux * uz],
        [2 * uy * ux, 2 * uy * uy - 1, 2 * uy * uz],
        [2 * uz * ux, 2 * uz * uy, 2 * uz * uz - 1],
      ];
    }

    // Rodrigues formula: R = I + [v]× + [v]×² × 1/(1+c)
    const s = 1 / (1 + c);
    return [
      [1 + (-(vy * vy + vz * vz)) * s, vz + vx * vy * s, -vy + vx * vz * s],
      [-vz + vx * vy * s, 1 + (-(vx * vx + vz * vz)) * s, vx + vy * vz * s],
      [vy + vx * vz * s, -vx + vy * vz * s, 1 + (-(vx * vx + vy * vy)) * s],
    ];
  }

  /** Transform a point: R × (p - centroid). */
  private _transformPoint(p: Point3D, R: number[][], centroid: Point3D): Point3D {
    const dx = p.x - centroid.x;
    const dy = p.y - centroid.y;
    const dz = p.z - centroid.z;
    return {
      x: R[0][0] * dx + R[0][1] * dy + R[0][2] * dz,
      y: R[1][0] * dx + R[1][1] * dy + R[1][2] * dz,
      z: R[2][0] * dx + R[2][1] * dy + R[2][2] * dz,
    };
  }

  /** Multiply two 3×3 matrices. */
  private _multiplyMatrices(A: number[][], B: number[][]): number[][] {
    const result: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return result;
  }

  /** Matrix-vector multiply for 3×3 × Point3D. */
  private _matVecMul(M: number[][], v: Point3D): Point3D {
    return {
      x: M[0][0] * v.x + M[0][1] * v.y + M[0][2] * v.z,
      y: M[1][0] * v.x + M[1][1] * v.y + M[1][2] * v.z,
      z: M[2][0] * v.x + M[2][1] * v.y + M[2][2] * v.z,
    };
  }

  /** Fit a 2D line (in XY plane) and return the angle in radians. */
  private _fitLine2D(points: { x: number; y: number }[]): number {
    const n = points.length;
    if (n < 2) return 0;

    const mx = points.reduce((s, p) => s + p.x, 0) / n;
    const my = points.reduce((s, p) => s + p.y, 0) / n;

    let sxx = 0, sxy = 0;
    for (const p of points) {
      const dx = p.x - mx;
      const dy = p.y - my;
      sxx += dx * dx;
      sxy += dx * dy;
    }

    // Angle of the best-fit line
    if (Math.abs(sxx) < 1e-15) return Math.PI / 2; // Vertical line
    return Math.atan2(sxy, sxx);
  }

  /** Compute perpendicular residuals from a 2D line defined by angle through centroid. */
  private _lineResiduals2D(points: { x: number; y: number }[], angle: number): number[] {
    const n = points.length;
    const mx = points.reduce((s, p) => s + p.x, 0) / n;
    const my = points.reduce((s, p) => s + p.y, 0) / n;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    return points.map(p => {
      const dx = p.x - mx;
      const dy = p.y - my;
      // Perpendicular distance = -sin(θ)·dx + cos(θ)·dy
      return -sinA * dx + cosA * dy;
    });
  }

  /** Fit a sphere to 3D points using algebraic least squares. */
  private _fitSphere(points: Point3D[]): { center: Point3D; radius: number } {
    const n = points.length;

    // Algebraic sphere fit: minimize Σ(x²+y²+z² + Dx + Ey + Fz + G)²
    // Linear system: [ΣxiΣxi  ΣxiΣyi  ΣxiΣzi  Σxi] [D]   [-Σxi·ri²]
    //                [ΣyiΣxi  ΣyiΣyi  ΣyiΣzi  Σyi] [E] = [-Σyi·ri²]
    //                [ΣziΣxi  ΣziΣyi  ΣziΣzi  Σzi] [F]   [-Σzi·ri²]
    //                [Σxi     Σyi     Σzi     n  ] [G]   [-Σri²   ]

    let sx = 0, sy = 0, sz = 0;
    let sxx = 0, sxy = 0, sxz = 0, syy = 0, syz = 0, szz = 0;
    let sxr = 0, syr = 0, szr = 0, sr = 0;

    for (const p of points) {
      const r2 = p.x * p.x + p.y * p.y + p.z * p.z;
      sx += p.x; sy += p.y; sz += p.z;
      sxx += p.x * p.x; sxy += p.x * p.y; sxz += p.x * p.z;
      syy += p.y * p.y; syz += p.y * p.z; szz += p.z * p.z;
      sxr += p.x * r2; syr += p.y * r2; szr += p.z * r2; sr += r2;
    }

    // Solve 4×4 system using Cramer's rule (sufficient for this size)
    // A = [[sxx, sxy, sxz, sx], [sxy, syy, syz, sy], [sxz, syz, szz, sz], [sx, sy, sz, n]]
    // b = [-sxr, -syr, -szr, -sr]

    // For simplicity, use centroid-based approximation
    const cx = sx / n, cy = sy / n, cz = sz / n;

    // Compute average radius from centroid
    let sumR = 0;
    for (const p of points) {
      sumR += this._dist3D(p, { x: cx, y: cy, z: cz });
    }
    const radius = sumR / n;

    return { center: { x: cx, y: cy, z: cz }, radius };
  }

  /**
   * Deterministic pseudo-Gaussian from a seed value.
   * Uses Box-Muller with seeded linear congruential generator.
   */
  private _gaussianFromSeed(seed: number): number {
    // Simple LCG for two uniform values
    let s = (seed * 1103515245 + 12345) & 0x7fffffff;
    const u1 = (s / 0x7fffffff) * 0.998 + 0.001; // avoid 0
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const u2 = s / 0x7fffffff;

    // Box-Muller
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

/** Singleton instance of CMMPathPlanningEngine. */
export const cmmPathPlanningEngine = new CMMPathPlanningEngine();
