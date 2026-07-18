/**
 * WEDMWireDeflectionEngine — Wire Deflection Prediction and Compensation
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-05
 *
 * Calculates wire deflection during cutting for:
 * - Corner accuracy compensation
 * - Taper error prediction
 * - Cut speed optimization
 *
 * Physics basis (Euler-Bernoulli beam theory):
 * - Wire as tensioned beam with distributed load from discharge forces
 * - δ = (F × L³) / (3 × E × I) for cantilever (simplified)
 * - For tensioned wire: δ ≈ F × L / (2 × T) at midspan
 * - Where T = wire tension, F = discharge force, L = workpiece thickness
 *
 * Flush-pressure deflection (Dauw & Albert 1992):
 * - δ_flush = (p × d × L²) / (8 × T)
 * - Where p = flush pressure, d = wire diameter, L = span, T = tension
 *
 * Reference: Han et al., "Wire EDM Process Modeling" (2007)
 *            Dauw & Albert, CIRP Annals 41(1), 1992
 *
 * @module engines/WEDMWireDeflectionEngine
 */

import { EDM_PHYSICS } from "../physics/constants.js";
import { WEDM_TAPER_SPEC } from "../physics/wedm-constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface WireDeflectionInput {
  /** Wire diameter in mm */
  wire_diameter_mm: number;
  /** Wire tension in N */
  wire_tension_N: number;
  /** Workpiece thickness (unsupported span) in mm */
  workpiece_thickness_mm: number;
  /** Discharge force in N (or calculate from current) */
  discharge_force_N?: number;
  /** Peak discharge current in A (alternative to force) */
  peak_current_A?: number;
  /** Duty cycle (for average force calculation) */
  duty_cycle?: number;
  /** Wire material (for modulus lookup) */
  wire_material?: string;
  /** Feed rate in mm/min (affects dynamic loading) */
  feed_rate_mm_min?: number;
}

export interface WireDeflectionResult {
  /** Maximum deflection at midspan in mm */
  max_deflection_mm: number;
  /** Maximum deflection in μm */
  max_deflection_um: number;
  /** Deflection angle at entry/exit in degrees */
  deflection_angle_deg: number;
  /** Taper error per side in mm */
  taper_error_mm: number;
  /** Recommended wire offset compensation in mm */
  recommended_offset_mm: number;
  /** Corner radius achievable in mm */
  min_corner_radius_mm: number;
  /** Warning for excessive deflection */
  warning?: string;
  /** Deflection exceeds safe limit */
  exceeds_limit: boolean;
  /** Recommendation if limit exceeded */
  recommendation?: string;
}

export interface WireDeflectionConfig {
  /** Maximum acceptable deflection in μm */
  max_deflection_um: number;
  /** Warning threshold as fraction of max */
  warning_threshold: number;
  /** Force per amp estimate (N/A) */
  force_per_amp: number;
  /** Dynamic force multiplier for high feed rates */
  dynamic_multiplier_max: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: WireDeflectionConfig = {
  max_deflection_um: 25,
  warning_threshold: 0.7,
  force_per_amp: 0.15, // Typical EDM force ~0.1-0.2 N per amp average
  dynamic_multiplier_max: 1.5,
};

// Wire material elastic modulus (GPa)
const WIRE_MODULUS: Record<string, number> = {
  brass: 100,
  brass_cuzn37: 100,
  brass_cuzn40: 95,
  zinc_coated_brass: 100,
  gamma_coated_brass: 100,
  diffusion_annealed: 95,
  molybdenum: 330,
  tungsten: 410,
  copper: 120,
  steel_core_brass: 200,
};

// ============================================================================
// ENGINE
// ============================================================================

class WEDMWireDeflectionEngine {
  private config: WireDeflectionConfig;

  constructor(config: Partial<WireDeflectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate wire second moment of area.
   * Formula: I = π × d⁴ / 64
   */
  calculateMomentOfInertia(diameter_mm: number): number {
    return (Math.PI * Math.pow(diameter_mm, 4)) / 64;
  }

  /**
   * Estimate discharge force from current.
   * Empirical: F_avg ≈ k × Ip × D
   */
  estimateDischargeForce(
    peak_current_A: number,
    duty_cycle: number = 0.3
  ): number {
    return this.config.force_per_amp * peak_current_A * duty_cycle;
  }

  /**
   * Calculate wire deflection using tensioned string model.
   * For uniform load on tensioned wire: δ_max = q × L² / (8 × T)
   * where q = distributed load = F / L
   * Simplifies to: δ_max = F × L / (8 × T)
   *
   * More accurate model accounts for bending stiffness:
   * δ = F × L / (2 × T) × (1 - cosh(λ×x/L) / cosh(λ/2))
   * where λ = L × sqrt(T / (E×I))
   */
  calculateDeflection(
    discharge_force_N: number,
    wire_tension_N: number,
    span_mm: number,
    wire_diameter_mm: number,
    modulus_GPa: number
  ): number {
    if (wire_tension_N <= 0) {
      throw new Error("Wire tension must be positive");
    }

    // Convert modulus to N/mm²
    const E = modulus_GPa * 1000; // GPa → N/mm²
    const I = this.calculateMomentOfInertia(wire_diameter_mm);

    // Calculate characteristic length parameter
    const lambda = span_mm * Math.sqrt(wire_tension_N / (E * I));

    // For typical WEDM: lambda > 10, string behavior dominates
    if (lambda > 5) {
      // String-dominated: δ ≈ F × L / (8 × T)
      return (discharge_force_N * span_mm) / (8 * wire_tension_N);
    } else {
      // Include bending stiffness correction
      const factor = 1 / (1 + (Math.PI * Math.PI * E * I) / (wire_tension_N * span_mm * span_mm));
      return (discharge_force_N * span_mm) / (8 * wire_tension_N) * factor;
    }
  }

  /**
   * Calculate deflection angle at entry/exit.
   * θ ≈ arctan(2 × δ_max / (L/2)) = arctan(4 × δ_max / L)
   */
  calculateDeflectionAngle(max_deflection_mm: number, span_mm: number): number {
    return Math.atan(4 * max_deflection_mm / span_mm) * (180 / Math.PI);
  }

  /**
   * Calculate taper error from deflection.
   * Taper per side ≈ δ_max for symmetric deflection
   */
  calculateTaperError(max_deflection_mm: number): number {
    return max_deflection_mm;
  }

  /**
   * Invert the wire-bow taper error to emit the CORRECTED programmed taper angle.
   *
   * On a taper cut the discharge force bows the wire by delta (calculateDeflection); that bow adds an
   * angular error theta_bow = atan(4*delta/L_eff) (calculateDeflectionAngle) to the cut wall, so the
   * wall lands OFF the intended taper. To HIT theta_target, PROGRAM theta_prog = theta_target - theta_bow
   * so the guides pre-tilt less and the bow supplies the remainder. The unsupported wire span grows with
   * tilt (L_eff = L / cos theta), so delta (hence theta_bow) depends weakly on theta_prog -> solved by a
   * fixed-point iteration. In the tensioned-string regime this collapses to theta_bow = atan(F/(2*T)),
   * independent of span/taper (delta = F*L/(8T) => 4*delta/L = F/(2T)), so it converges in one step; the
   * iteration only does real work in the bending-stiffness regime (STIFF/thick wire at low tension, lambda
   * < 5 -- thin wire lowers I and RAISES lambda toward the string regime, so bending needs a thick wire).
   *
   * Sign: bow opens the wall OUTWARD (adds taper) -> the correction SUBTRACTS theta_bow (bow_direction=+1,
   * default). bow_direction=-1 handles the (rarer) inward-bow geometry. theta_prog is clamped to
   * [0, max_taper]; if the correction would drive it out of range (e.g. bow >= target on a near-vertical
   * wall -- uncorrectable by pre-tilt alone) the angle is clamped and the uncorrected residual_deg is
   * reported with a warning -- never a silently out-of-range programmed angle (R12).
   *
   * Refs: tensioned-string bow delta=F*L/(8T) + guide kinematics L_eff=L/cos(theta) (Mitsubishi MV
   * Programming Manual Sec 5; Sodick VL400Q Sec 2.4). Guide-span / max-taper defaults: WEDM_TAPER_SPEC.
   *
   * @param input target taper + wire/discharge state (guide_span / max_taper default from WEDM_TAPER_SPEC)
   * @returns corrected programmed taper angle + bow diagnostics + clamp residual (typed result object)
   */
  correctTaperAngle(input: {
    target_taper_deg: number;
    discharge_force_N: number;
    wire_tension_N: number;
    wire_diameter_mm: number;
    modulus_GPa: number;
    guide_span_mm?: number;
    max_taper_deg?: number;
    bow_direction?: 1 | -1;
    max_iter?: number;
    tol_deg?: number;
  }): {
    programmed_taper_deg: number;
    target_taper_deg: number;
    bow_angle_deg: number;
    correction_deg: number;
    deflection_mm: number;
    effective_span_mm: number;
    residual_deg: number;
    converged: boolean;
    iterations: number;
    clamped: boolean;
    warning?: string;
    source: string;
  } {
    const { target_taper_deg, discharge_force_N, wire_tension_N, wire_diameter_mm, modulus_GPa } = input;
    // Validate -- throw descriptive errors (matches calculateDeflection's contract in this engine).
    if (!Number.isFinite(target_taper_deg) || target_taper_deg < 0)
      throw new Error("target_taper_deg must be a finite, non-negative angle");
    if (!Number.isFinite(discharge_force_N) || discharge_force_N < 0)
      throw new Error("discharge_force_N must be finite and non-negative");
    if (!Number.isFinite(wire_tension_N) || wire_tension_N <= 0)
      throw new Error("wire_tension_N must be positive");
    // wire_diameter_mm + modulus_GPa feed calculateDeflection -- validate here or a bad value returns
    // programmed_taper_deg = NaN mislabelled "did not converge" (fail-loud, R12).
    if (!Number.isFinite(wire_diameter_mm) || wire_diameter_mm <= 0)
      throw new Error("wire_diameter_mm must be positive");
    if (!Number.isFinite(modulus_GPa) || modulus_GPa <= 0)
      throw new Error("modulus_GPa must be positive");
    const guideSpan = input.guide_span_mm ?? WEDM_TAPER_SPEC.default_guide_span_mm;
    if (!Number.isFinite(guideSpan) || guideSpan <= 0)
      throw new Error("guide_span_mm must be positive");
    const maxTaper = input.max_taper_deg ?? WEDM_TAPER_SPEC.standard_max_taper_deg;
    // bow_direction / max_iter arrive untyped via the dispatcher (this action ships no Zod schema) ->
    // runtime-guard: bow_direction=2 would silently DOUBLE the correction; max_iter<1 skips the solve.
    const rawDir = (input as { bow_direction?: unknown }).bow_direction;
    if (rawDir !== undefined && rawDir !== 1 && rawDir !== -1)
      throw new Error("bow_direction must be 1 or -1");
    const dir: 1 | -1 = (rawDir as 1 | -1) ?? 1;
    const maxIter = input.max_iter ?? 12;
    if (!Number.isInteger(maxIter) || maxIter < 1)
      throw new Error("max_iter must be a positive integer");
    const tol = input.tol_deg ?? 1e-4;

    let theta = target_taper_deg; // initial guess
    let deflection = 0;
    let bow = 0;
    let effSpan = guideSpan;
    let iterations = 0;
    let converged = false;
    for (; iterations < maxIter; iterations++) {
      // Effective unsupported span grows with tilt; cos is symmetric so |theta| is safe; cap short of 90 deg.
      const safeTheta = Math.min(89.9, Math.abs(theta));
      effSpan = guideSpan / Math.cos((safeTheta * Math.PI) / 180);
      deflection = this.calculateDeflection(discharge_force_N, wire_tension_N, effSpan, wire_diameter_mm, modulus_GPa);
      bow = this.calculateDeflectionAngle(deflection, effSpan); // deg, >= 0
      const next = target_taper_deg - dir * bow;
      if (Math.abs(next - theta) < tol) {
        theta = next;
        iterations++;
        converged = true;
        break;
      }
      theta = next;
    }

    let clamped = false;
    let residual = 0;
    let warning: string | undefined;
    if (theta < 0) {
      residual = -theta;
      theta = 0;
      clamped = true;
      warning =
        `wire bow (${bow.toFixed(3)}deg) exceeds target taper (${target_taper_deg}deg); pre-tilt clamped to 0deg, ` +
        `residual ${residual.toFixed(3)}deg is uncorrectable by pre-tilt alone (reduce discharge force or raise wire tension)`;
    } else if (theta > maxTaper) {
      residual = theta - maxTaper;
      theta = maxTaper;
      clamped = true;
      warning = `corrected taper exceeds guide max ${maxTaper}deg; clamped, residual ${residual.toFixed(3)}deg`;
    } else if (!converged) {
      warning = `fixed-point did not converge within ${maxIter} iterations (last step > ${tol}deg)`;
    }

    return {
      programmed_taper_deg: theta,
      target_taper_deg,
      bow_angle_deg: bow,
      correction_deg: target_taper_deg - theta,
      deflection_mm: deflection,
      effective_span_mm: effSpan,
      residual_deg: residual,
      converged,
      iterations,
      clamped,
      warning,
      source: "wire-bow-taper-inverse-fixedpoint",
    };
  }

  /**
   * Calculate minimum achievable corner radius.
   * Limited by wire diameter + 2 × deflection
   */
  calculateMinCornerRadius(
    wire_diameter_mm: number,
    max_deflection_mm: number
  ): number {
    // Minimum = wire radius + deflection
    return (wire_diameter_mm / 2) + max_deflection_mm;
  }

  /**
   * Apply dynamic correction for high feed rates.
   */
  applyDynamicCorrection(
    static_force_N: number,
    feed_rate_mm_min: number
  ): number {
    // Empirical: force increases ~50% at high feeds
    // Threshold: ~5 mm/min
    if (feed_rate_mm_min <= 2) return static_force_N;

    const dynamicFactor = Math.min(
      1 + (feed_rate_mm_min - 2) * 0.1,
      this.config.dynamic_multiplier_max
    );
    return static_force_N * dynamicFactor;
  }

  /**
   * Get wire modulus from material.
   */
  getWireModulus(material?: string): number {
    if (!material) return WIRE_MODULUS.brass;
    const mat = material.toLowerCase().replace(/[- ]/g, "_");
    return WIRE_MODULUS[mat] ?? WIRE_MODULUS.brass;
  }

  /**
   * Calculate wire deflection due to flushing pressure.
   * Formula: δ_flush = (p × d × L²) / (8 × T)
   * Source: Dauw & Albert 1992 CIRP Annals 41(1)
   *
   * @param flush_pressure_bar Flushing pressure in bar
   * @param wire_diameter_mm Wire diameter in mm
   * @param span_mm Unsupported wire span (workpiece thickness) in mm
   * @param wire_tension_N Wire tension in Newtons
   * @returns Deflection in mm
   */
  calculateFlushDeflection(
    flush_pressure_bar: number,
    wire_diameter_mm: number,
    span_mm: number,
    wire_tension_N: number
  ): {
    deflection_mm: number;
    deflection_um: number;
    distributed_load_N_per_mm: number;
    total_lateral_force_N: number;
    within_safe_range: boolean;
    warning?: string;
  } {
    if (wire_tension_N <= 0) {
      throw new Error("Wire tension must be positive");
    }
    if (span_mm <= 0) {
      throw new Error("Span must be positive");
    }

    // Convert pressure: bar → N/mm² (1 bar = 0.1 N/mm²)
    const pressure_N_mm2 = flush_pressure_bar * EDM_PHYSICS.flush_deflection.bar_to_N_per_mm2;

    // Distributed load: q = p × d [N/mm]
    const distributed_load = pressure_N_mm2 * wire_diameter_mm;

    // Total lateral force: F = q × L = p × d × L [N]
    const total_force = distributed_load * span_mm;

    // Deflection: δ = (p × d × L²) / (8 × T) = (q × L²) / (8 × T) [mm]
    const deflection_mm = (distributed_load * span_mm * span_mm) / (8 * wire_tension_N);
    const deflection_um = deflection_mm * 1000;

    // Check against safe range
    const max_safe_deflection_um = this.config.max_deflection_um;
    const warning_threshold_um = max_safe_deflection_um * this.config.warning_threshold;

    let warning: string | undefined;
    if (deflection_um > max_safe_deflection_um) {
      warning = `Flush deflection ${deflection_um.toFixed(1)}μm exceeds limit — exceeds typical max ${max_safe_deflection_um}μm. Reduce pressure or increase tension.`;
    } else if (deflection_um > warning_threshold_um) {
      warning = `Flush deflection ${deflection_um.toFixed(1)}μm approaching limit. Consider increasing tension.`;
    }

    // Check pressure within typical range
    const { min, max } = EDM_PHYSICS.flush_deflection.typical_pressure_bar;
    if (flush_pressure_bar > max) {
      warning = (warning ? warning + " " : "") + `Pressure ${flush_pressure_bar} bar exceeds typical max ${max} bar.`;
    }

    return {
      deflection_mm: parseFloat(deflection_mm.toFixed(6)),
      deflection_um: parseFloat(deflection_um.toFixed(2)),
      distributed_load_N_per_mm: parseFloat(distributed_load.toFixed(6)),
      total_lateral_force_N: parseFloat(total_force.toFixed(4)),
      within_safe_range: deflection_um <= max_safe_deflection_um,
      warning,
    };
  }

  /**
   * Calculate combined deflection from discharge force AND flush pressure.
   * Total deflection is sum of both components (superposition for linear systems).
   */
  calculateCombinedDeflection(input: {
    wire_diameter_mm: number;
    wire_tension_N: number;
    span_mm: number;
    discharge_force_N: number;
    flush_pressure_bar: number;
    wire_material?: string;
  }): {
    discharge_deflection_mm: number;
    flush_deflection_mm: number;
    total_deflection_mm: number;
    total_deflection_um: number;
    dominant_source: "discharge" | "flush" | "balanced";
  } {
    const modulus = this.getWireModulus(input.wire_material);

    // Discharge deflection
    const discharge_deflection = this.calculateDeflection(
      input.discharge_force_N,
      input.wire_tension_N,
      input.span_mm,
      input.wire_diameter_mm,
      modulus
    );

    // Flush deflection
    const flush_result = this.calculateFlushDeflection(
      input.flush_pressure_bar,
      input.wire_diameter_mm,
      input.span_mm,
      input.wire_tension_N
    );

    const total = discharge_deflection + flush_result.deflection_mm;
    const ratio = discharge_deflection / (flush_result.deflection_mm || 0.0001);

    let dominant: "discharge" | "flush" | "balanced" = "balanced";
    if (ratio > 2) dominant = "discharge";
    else if (ratio < 0.5) dominant = "flush";

    return {
      discharge_deflection_mm: parseFloat(discharge_deflection.toFixed(6)),
      flush_deflection_mm: flush_result.deflection_mm,
      total_deflection_mm: parseFloat(total.toFixed(6)),
      total_deflection_um: parseFloat((total * 1000).toFixed(2)),
      dominant_source: dominant,
    };
  }

  /**
   * Predict wire deflection and generate recommendations.
   */
  predict(input: WireDeflectionInput): WireDeflectionResult {
    // Input validation
    if (input.wire_diameter_mm <= 0) {
      throw new Error("Wire diameter must be positive");
    }
    if (input.wire_tension_N <= 0) {
      throw new Error("Wire tension must be positive");
    }
    if (input.workpiece_thickness_mm <= 0) {
      throw new Error("Workpiece thickness must be positive");
    }

    // Determine discharge force
    let dischargeForce = input.discharge_force_N;
    if (!dischargeForce && input.peak_current_A) {
      dischargeForce = this.estimateDischargeForce(
        input.peak_current_A,
        input.duty_cycle ?? 0.3
      );
    }
    if (!dischargeForce) {
      throw new Error("Either discharge_force_N or peak_current_A required");
    }

    // Apply dynamic correction if feed rate specified
    if (input.feed_rate_mm_min) {
      dischargeForce = this.applyDynamicCorrection(
        dischargeForce,
        input.feed_rate_mm_min
      );
    }

    // Get wire material properties
    const modulus = this.getWireModulus(input.wire_material);

    // Calculate deflection
    const maxDeflection = this.calculateDeflection(
      dischargeForce,
      input.wire_tension_N,
      input.workpiece_thickness_mm,
      input.wire_diameter_mm,
      modulus
    );

    const maxDeflection_um = maxDeflection * 1000;

    // Calculate derived parameters
    const deflectionAngle = this.calculateDeflectionAngle(
      maxDeflection,
      input.workpiece_thickness_mm
    );
    const taperError = this.calculateTaperError(maxDeflection);
    const minCornerRadius = this.calculateMinCornerRadius(
      input.wire_diameter_mm,
      maxDeflection
    );

    // Check limits
    const exceedsLimit = maxDeflection_um > this.config.max_deflection_um;
    const atWarning = maxDeflection_um > this.config.max_deflection_um * this.config.warning_threshold;

    // Build result
    const result: WireDeflectionResult = {
      max_deflection_mm: Math.round(maxDeflection * 10000) / 10000,
      max_deflection_um: Math.round(maxDeflection_um * 10) / 10,
      deflection_angle_deg: Math.round(deflectionAngle * 100) / 100,
      taper_error_mm: Math.round(taperError * 10000) / 10000,
      recommended_offset_mm: Math.round(maxDeflection * 10000) / 10000,
      min_corner_radius_mm: Math.round(minCornerRadius * 1000) / 1000,
      exceeds_limit: exceedsLimit,
    };

    // Add warning/recommendation
    if (exceedsLimit) {
      result.warning = `Deflection ${result.max_deflection_um}μm exceeds limit of ${this.config.max_deflection_um}μm`;
      result.recommendation =
        `Reduce current, increase wire tension, or use stiffer wire (e.g., molybdenum). ` +
        `Current settings may cause taper error of ±${result.taper_error_mm.toFixed(4)}mm.`;
    } else if (atWarning) {
      result.warning = `Deflection at ${Math.round((maxDeflection_um / this.config.max_deflection_um) * 100)}% of limit`;
    }

    return result;
  }

  /**
   * Calculate maximum safe current for given setup.
   */
  calculateMaxSafeCurrent(
    wire_diameter_mm: number,
    wire_tension_N: number,
    workpiece_thickness_mm: number,
    wire_material?: string,
    target_deflection_um?: number
  ): number {
    const maxDeflection = (target_deflection_um ?? this.config.max_deflection_um) / 1000; // μm to mm
    const modulus = this.getWireModulus(wire_material);
    const I = this.calculateMomentOfInertia(wire_diameter_mm);
    const lambda = workpiece_thickness_mm * Math.sqrt(wire_tension_N / (modulus * 1000 * I));

    // From δ = F × L / (8 × T), solve for F
    const maxForce = (maxDeflection * 8 * wire_tension_N) / workpiece_thickness_mm;

    // From F = k × Ip × D, solve for Ip (assume D = 0.3)
    const duty_cycle = 0.3;
    return maxForce / (this.config.force_per_amp * duty_cycle);
  }

  /**
   * Update configuration.
   */
  configure(config: Partial<WireDeflectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): WireDeflectionConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmWireDeflectionEngine = new WEDMWireDeflectionEngine();
export { WEDMWireDeflectionEngine };
