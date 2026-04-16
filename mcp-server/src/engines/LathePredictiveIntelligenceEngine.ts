/**
 * LathePredictiveIntelligenceEngine — Predictive Intelligence for Lathe Operations
 * =================================================================================
 * Provides numerical predictions with confidence intervals for lathe operations:
 *   1. Tool Wear Prediction — Predict tool wear progression and remaining life
 *   2. Surface Finish Prediction — Predict Ra/Rz based on parameters
 *   3. Thermal Growth Prediction — Predict spindle/part thermal expansion
 *   4. Cycle Time Prediction — Accurate cycle time estimation with calibration
 *   5. Quality Outcome Prediction — Dimensional accuracy with confidence intervals
 *   6. Anomaly Detection — Detect deviations from expected patterns
 *
 * Uses physics-based models with statistical learning for calibration.
 *
 * @module engines/LathePredictiveIntelligenceEngine
 * @version 1.0.0
 * @milestone LLM-INTEL-9
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Material ISO group */
export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Prediction with confidence interval */
export interface Prediction<T> {
  value: T;
  confidence: number;           // 0-1 confidence level
  lower_bound: T;               // Lower CI bound
  upper_bound: T;               // Upper CI bound
  uncertainty: number;          // Standard deviation or uncertainty measure
  model_used: string;           // Model/formula used for prediction
  calibration_factor?: number;  // Shop-specific calibration applied
  warning?: string;             // Any warnings about prediction reliability
}

/** Cutting conditions input */
export interface CuttingConditions {
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  material: string;
  iso_group: ISOGroup;
  hardness_hrc?: number;
  tool_material: "carbide" | "ceramic" | "cbn" | "diamond" | "hss";
  tool_coating?: string;
  nose_radius_mm: number;
  coolant: "flood" | "mist" | "dry" | "high_pressure" | "cryogenic";
}

/** Tool state for wear prediction */
export interface ToolState {
  tool_id: string;
  edge_number: number;
  time_in_cut_min: number;
  volume_removed_cm3: number;
  current_vb_mm?: number;        // Current flank wear if known
  current_kt_mm?: number;        // Current crater wear depth if known
  insert_grade: string;
  coating?: string;
  operations_count: number;
}

/** Tool wear prediction result */
export interface ToolWearPrediction {
  flank_wear_vb: Prediction<number>;
  crater_wear_kt: Prediction<number>;
  remaining_life_min: Prediction<number>;
  remaining_parts: Prediction<number>;
  wear_rate_mm_per_min: number;
  recommended_action: "continue" | "monitor" | "index_soon" | "index_now";
  failure_risk: "low" | "medium" | "high" | "critical";
  factors_affecting: string[];
}

/** Surface finish prediction result */
export interface SurfaceFinishPrediction {
  ra_um: Prediction<number>;
  rz_um: Prediction<number>;
  theoretical_ra: number;
  actual_multiplier: number;
  factors_affecting: Array<{
    factor: string;
    impact_pct: number;
    direction: "increase" | "decrease";
  }>;
  recommendations: string[];
}

/** Thermal growth prediction result */
export interface ThermalGrowthPrediction {
  spindle_growth_mm: Prediction<number>;
  part_growth_mm: Prediction<number>;
  total_dimensional_shift_mm: number;
  stabilization_time_min: number;
  temperature_profile: Array<{
    time_min: number;
    spindle_temp_c: number;
    growth_mm: number;
  }>;
  compensation_recommended: boolean;
  recommendations: string[];
}

/** Cycle time prediction result */
export interface CycleTimePrediction {
  total_cycle_time_sec: Prediction<number>;
  cutting_time_sec: number;
  rapid_time_sec: number;
  tool_change_time_sec: number;
  dwell_time_sec: number;
  load_unload_time_sec: number;
  breakdown: Array<{
    operation: string;
    time_sec: number;
    pct_of_total: number;
  }>;
  bottleneck_operations: string[];
  optimization_potential_pct: number;
}

/** Quality outcome prediction result */
export interface QualityPrediction {
  diameter_error_mm: Prediction<number>;
  length_error_mm: Prediction<number>;
  roundness_error_mm: Prediction<number>;
  surface_finish_ra: Prediction<number>;
  cpk_estimate: Prediction<number>;
  scrap_probability: number;
  rework_probability: number;
  pass_probability: number;
  critical_dimensions: Array<{
    dimension_id: string;
    target_mm: number;
    tolerance_mm: number;
    predicted_mm: number;
    in_tolerance: boolean;
    margin_pct: number;
  }>;
}

/** Anomaly detection result */
export interface AnomalyDetection {
  anomalies_detected: boolean;
  anomaly_count: number;
  anomalies: Array<{
    id: string;
    type: "process" | "tool" | "quality" | "machine";
    severity: "minor" | "moderate" | "severe" | "critical";
    description: string;
    deviation_sigma: number;
    probable_cause: string;
    recommended_action: string;
  }>;
  overall_process_health: "normal" | "degraded" | "critical";
  trend_direction: "improving" | "stable" | "degrading";
}

/** Calibration data for learning */
export interface CalibrationData {
  shop_id: string;
  machine_id: string;
  material: string;
  operation: string;
  predicted_value: number;
  actual_value: number;
  timestamp: Date;
  conditions: CuttingConditions;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Taylor tool life constants by ISO group */
const TAYLOR_CONSTANTS: Record<ISOGroup, { C: number; n: number }> = {
  P: { C: 300, n: 0.25 },   // Steel
  M: { C: 200, n: 0.20 },   // Stainless
  K: { C: 400, n: 0.30 },   // Cast iron
  N: { C: 600, n: 0.35 },   // Aluminum
  S: { C: 80, n: 0.15 },    // Superalloys
  H: { C: 150, n: 0.20 },   // Hardened steel
};

/** Surface finish constants */
const SURFACE_FINISH_CONSTANTS = {
  theoretical_multiplier: 1.3,  // Ra = 0.0321 * f^2 / r * multiplier
  bue_factor: 1.5,              // Built-up edge increases Ra
  wear_factor_per_0_1mm: 0.15,  // 15% increase per 0.1mm flank wear
  chatter_factor: 2.5,          // Chatter doubles or triples Ra
};

/** Thermal growth constants */
const THERMAL_CONSTANTS = {
  steel_expansion_per_c: 11.7e-6,      // mm/mm/°C
  aluminum_expansion_per_c: 23.1e-6,
  spindle_thermal_time_constant_min: 20,
  spindle_max_growth_mm: 0.03,
  ambient_temp_c: 20,
};

/** Wear rate constants */
const WEAR_CONSTANTS = {
  vb_limit_roughing_mm: 0.3,
  vb_limit_finishing_mm: 0.15,
  kt_limit_mm: 0.1,
  wear_exponent: 1.5,
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

export class LathePredictiveIntelligenceEngine {
  private calibrationData: Map<string, CalibrationData[]> = new Map();

  /**
   * Predict tool wear and remaining life.
   */
  predictToolWear(
    conditions: CuttingConditions,
    toolState: ToolState,
    cycleTimePerPart_sec: number
  ): ToolWearPrediction {
    log.info(`[LathePredictive] Predicting tool wear for ${toolState.tool_id}`);

    // Get Taylor constants
    const taylor = TAYLOR_CONSTANTS[conditions.iso_group];

    // Calculate theoretical tool life using Taylor equation: V * T^n = C
    const theoreticalLife_min = Math.pow(taylor.C / conditions.cutting_speed_m_min, 1 / taylor.n);

    // Adjust for actual conditions
    let lifeMultiplier = 1.0;

    // Feed factor
    if (conditions.feed_mm_rev > 0.3) lifeMultiplier *= 0.7;
    else if (conditions.feed_mm_rev > 0.2) lifeMultiplier *= 0.85;

    // DOC factor
    if (conditions.depth_of_cut_mm > 3) lifeMultiplier *= 0.8;
    else if (conditions.depth_of_cut_mm > 2) lifeMultiplier *= 0.9;

    // Coolant factor
    if (conditions.coolant === "dry") lifeMultiplier *= 0.6;
    else if (conditions.coolant === "high_pressure") lifeMultiplier *= 1.3;
    else if (conditions.coolant === "cryogenic") lifeMultiplier *= 1.5;

    // Material hardness factor
    if (conditions.hardness_hrc && conditions.hardness_hrc > 50) {
      lifeMultiplier *= 0.5;
    } else if (conditions.hardness_hrc && conditions.hardness_hrc > 40) {
      lifeMultiplier *= 0.7;
    }

    const adjustedLife_min = theoreticalLife_min * lifeMultiplier;

    // Calculate current wear state
    const wearProgress = toolState.time_in_cut_min / adjustedLife_min;
    const estimatedVb = WEAR_CONSTANTS.vb_limit_roughing_mm * Math.pow(wearProgress, WEAR_CONSTANTS.wear_exponent);
    const actualVb = toolState.current_vb_mm ?? estimatedVb;

    // Remaining life calculation
    const remainingLife = Math.max(0, adjustedLife_min - toolState.time_in_cut_min);
    const remainingParts = Math.floor(remainingLife / (cycleTimePerPart_sec / 60));

    // Wear rate
    const wearRate = actualVb / Math.max(1, toolState.time_in_cut_min);

    // Determine action
    let action: ToolWearPrediction["recommended_action"];
    let failureRisk: ToolWearPrediction["failure_risk"];

    if (actualVb >= WEAR_CONSTANTS.vb_limit_roughing_mm * 0.9) {
      action = "index_now";
      failureRisk = "critical";
    } else if (actualVb >= WEAR_CONSTANTS.vb_limit_roughing_mm * 0.7) {
      action = "index_soon";
      failureRisk = "high";
    } else if (actualVb >= WEAR_CONSTANTS.vb_limit_roughing_mm * 0.5) {
      action = "monitor";
      failureRisk = "medium";
    } else {
      action = "continue";
      failureRisk = "low";
    }

    // Factors affecting wear
    const factors: string[] = [];
    if (conditions.cutting_speed_m_min > taylor.C * 0.8) factors.push("High cutting speed accelerates wear");
    if (conditions.feed_mm_rev > 0.3) factors.push("Heavy feed increases flank wear");
    if (conditions.coolant === "dry") factors.push("Dry cutting significantly reduces life");
    if (conditions.iso_group === "S" || conditions.iso_group === "H") factors.push("Difficult material accelerates wear");

    // Uncertainty calculation
    const uncertainty = 0.15; // 15% base uncertainty

    return {
      flank_wear_vb: {
        value: actualVb,
        confidence: 0.75,
        lower_bound: actualVb * (1 - uncertainty),
        upper_bound: actualVb * (1 + uncertainty),
        uncertainty: actualVb * uncertainty,
        model_used: "Taylor tool life with empirical adjustments",
      },
      crater_wear_kt: {
        value: actualVb * 0.3, // Approximate crater depth
        confidence: 0.6,
        lower_bound: actualVb * 0.2,
        upper_bound: actualVb * 0.4,
        uncertainty: actualVb * 0.1,
        model_used: "Empirical crater/flank ratio",
      },
      remaining_life_min: {
        value: remainingLife,
        confidence: 0.7,
        lower_bound: remainingLife * 0.7,
        upper_bound: remainingLife * 1.3,
        uncertainty: remainingLife * 0.2,
        model_used: "Taylor equation with condition adjustments",
      },
      remaining_parts: {
        value: remainingParts,
        confidence: 0.7,
        lower_bound: Math.floor(remainingParts * 0.7),
        upper_bound: Math.ceil(remainingParts * 1.3),
        uncertainty: remainingParts * 0.2,
        model_used: "Cycle time based estimation",
      },
      wear_rate_mm_per_min: wearRate,
      recommended_action: action,
      failure_risk: failureRisk,
      factors_affecting: factors,
    };
  }

  /**
   * Predict surface finish (Ra/Rz).
   */
  predictSurfaceFinish(
    conditions: CuttingConditions,
    toolState?: ToolState
  ): SurfaceFinishPrediction {
    log.info(`[LathePredictive] Predicting surface finish`);

    // Theoretical Ra = 0.0321 * f^2 / r (for single-point turning)
    const theoreticalRa = (0.0321 * Math.pow(conditions.feed_mm_rev, 2) / conditions.nose_radius_mm) * 1000; // Convert to µm

    // Actual multiplier based on conditions
    let multiplier = SURFACE_FINISH_CONSTANTS.theoretical_multiplier;
    const factors: SurfaceFinishPrediction["factors_affecting"] = [];

    // Tool wear effect
    if (toolState && toolState.current_vb_mm) {
      const wearFactor = 1 + (toolState.current_vb_mm / 0.1) * SURFACE_FINISH_CONSTANTS.wear_factor_per_0_1mm;
      multiplier *= wearFactor;
      if (wearFactor > 1.1) {
        factors.push({
          factor: "Tool wear",
          impact_pct: (wearFactor - 1) * 100,
          direction: "increase",
        });
      }
    }

    // Material effect
    if (conditions.iso_group === "N") {
      multiplier *= 0.85; // Aluminum gives better finish
      factors.push({ factor: "Aluminum material", impact_pct: 15, direction: "decrease" });
    } else if (conditions.iso_group === "M") {
      multiplier *= 1.2; // Stainless can be gummy
      factors.push({ factor: "Stainless steel BUE tendency", impact_pct: 20, direction: "increase" });
    }

    // Cutting speed effect
    if (conditions.cutting_speed_m_min < 100) {
      multiplier *= SURFACE_FINISH_CONSTANTS.bue_factor; // BUE at low speed
      factors.push({ factor: "Low cutting speed (BUE)", impact_pct: 50, direction: "increase" });
    } else if (conditions.cutting_speed_m_min > 300) {
      multiplier *= 0.9; // High speed often gives better finish
      factors.push({ factor: "High cutting speed", impact_pct: 10, direction: "decrease" });
    }

    // Coolant effect
    if (conditions.coolant === "high_pressure") {
      multiplier *= 0.85;
      factors.push({ factor: "High pressure coolant", impact_pct: 15, direction: "decrease" });
    } else if (conditions.coolant === "dry") {
      multiplier *= 1.25;
      factors.push({ factor: "Dry cutting", impact_pct: 25, direction: "increase" });
    }

    // DOC effect on surface waviness
    if (conditions.depth_of_cut_mm > 3) {
      multiplier *= 1.1;
      factors.push({ factor: "Heavy depth of cut", impact_pct: 10, direction: "increase" });
    }

    const predictedRa = theoreticalRa * multiplier;
    const predictedRz = predictedRa * 4.5; // Typical Ra/Rz ratio

    // Recommendations
    const recommendations: string[] = [];
    if (predictedRa > 3.2) {
      if (conditions.feed_mm_rev > 0.15) {
        recommendations.push("Reduce feed rate for better finish");
      }
      if (conditions.nose_radius_mm < 0.8) {
        recommendations.push("Use larger nose radius insert");
      }
      if (conditions.cutting_speed_m_min < 150) {
        recommendations.push("Increase cutting speed to reduce BUE");
      }
    }

    return {
      ra_um: {
        value: predictedRa,
        confidence: 0.75,
        lower_bound: predictedRa * 0.7,
        upper_bound: predictedRa * 1.4,
        uncertainty: predictedRa * 0.2,
        model_used: "Theoretical Ra with empirical multipliers",
      },
      rz_um: {
        value: predictedRz,
        confidence: 0.7,
        lower_bound: predictedRz * 0.7,
        upper_bound: predictedRz * 1.4,
        uncertainty: predictedRz * 0.2,
        model_used: "Ra/Rz ratio approximation",
      },
      theoretical_ra: theoreticalRa,
      actual_multiplier: multiplier,
      factors_affecting: factors,
      recommendations,
    };
  }

  /**
   * Predict thermal growth and compensation needs.
   */
  predictThermalGrowth(
    machineId: string,
    spindleRpm: number,
    runtimeMin: number,
    partMaterial: ISOGroup,
    partLength_mm: number,
    ambientTemp_c?: number
  ): ThermalGrowthPrediction {
    log.info(`[LathePredictive] Predicting thermal growth for ${machineId}`);

    const ambient = ambientTemp_c ?? THERMAL_CONSTANTS.ambient_temp_c;

    // Spindle heat generation model (simplified)
    // Heat increases with RPM^2 due to bearing friction
    const heatFactor = Math.pow(spindleRpm / 3000, 2);

    // Temperature rise follows exponential approach to steady state
    const tau = THERMAL_CONSTANTS.spindle_thermal_time_constant_min;
    const steadyStateTemp = ambient + 15 * heatFactor; // Max 15°C rise at high RPM
    const currentTemp = ambient + (steadyStateTemp - ambient) * (1 - Math.exp(-runtimeMin / tau));

    // Spindle growth
    const spindleGrowth = THERMAL_CONSTANTS.spindle_max_growth_mm *
      (1 - Math.exp(-runtimeMin / tau)) * heatFactor;

    // Part thermal growth
    const expansion = partMaterial === "N"
      ? THERMAL_CONSTANTS.aluminum_expansion_per_c
      : THERMAL_CONSTANTS.steel_expansion_per_c;
    const partTempRise = (currentTemp - ambient) * 0.5; // Part heats less than spindle
    const partGrowth = partLength_mm * expansion * partTempRise;

    // Total dimensional shift (spindle pushes Z, part expands)
    const totalShift = spindleGrowth + partGrowth;

    // Time to reach 95% of steady state
    const stabilizationTime = 3 * tau;

    // Temperature profile
    const profile: ThermalGrowthPrediction["temperature_profile"] = [];
    for (let t = 0; t <= Math.max(runtimeMin, stabilizationTime); t += 5) {
      const temp = ambient + (steadyStateTemp - ambient) * (1 - Math.exp(-t / tau));
      const growth = THERMAL_CONSTANTS.spindle_max_growth_mm *
        (1 - Math.exp(-t / tau)) * heatFactor;
      profile.push({
        time_min: t,
        spindle_temp_c: Math.round(temp * 10) / 10,
        growth_mm: Math.round(growth * 10000) / 10000,
      });
    }

    // Recommendations
    const recommendations: string[] = [];
    if (runtimeMin < tau * 0.5) {
      recommendations.push("Machine not yet thermally stable - run warm-up cycle");
    }
    if (totalShift > 0.01) {
      recommendations.push("Apply thermal compensation to Z-axis offset");
    }
    if (spindleRpm > 4000) {
      recommendations.push("High RPM operation - monitor spindle temperature");
    }

    return {
      spindle_growth_mm: {
        value: spindleGrowth,
        confidence: 0.7,
        lower_bound: spindleGrowth * 0.7,
        upper_bound: spindleGrowth * 1.4,
        uncertainty: spindleGrowth * 0.2,
        model_used: "Exponential thermal model",
      },
      part_growth_mm: {
        value: partGrowth,
        confidence: 0.8,
        lower_bound: partGrowth * 0.8,
        upper_bound: partGrowth * 1.2,
        uncertainty: partGrowth * 0.15,
        model_used: "Linear thermal expansion",
      },
      total_dimensional_shift_mm: totalShift,
      stabilization_time_min: stabilizationTime,
      temperature_profile: profile,
      compensation_recommended: totalShift > 0.005,
      recommendations,
    };
  }

  /**
   * Predict cycle time with breakdown.
   */
  predictCycleTime(
    operations: Array<{
      id: string;
      type: string;
      length_mm: number;
      feed_mm_rev: number;
      rpm: number;
      passes?: number;
      rapid_distance_mm?: number;
    }>,
    machineParams: {
      rapid_rate_mm_min: number;
      tool_change_time_sec: number;
      tool_count: number;
      load_unload_time_sec: number;
    }
  ): CycleTimePrediction {
    log.info(`[LathePredictive] Predicting cycle time for ${operations.length} operations`);

    let cuttingTime = 0;
    let rapidTime = 0;
    let dwellTime = 0;
    const breakdown: CycleTimePrediction["breakdown"] = [];

    for (const op of operations) {
      const passes = op.passes ?? 1;
      const feedRate = op.feed_mm_rev * op.rpm / 60; // mm/sec
      const opCuttingTime = (op.length_mm * passes) / feedRate;
      const opRapidTime = (op.rapid_distance_mm ?? op.length_mm) / (machineParams.rapid_rate_mm_min / 60);

      // Add dwell for certain operations
      let opDwell = 0;
      if (op.type === "threading") opDwell = 0.5; // Brief dwell at thread end
      if (op.type === "grooving") opDwell = 1.0;  // Dwell for chip break

      cuttingTime += opCuttingTime;
      rapidTime += opRapidTime;
      dwellTime += opDwell;

      breakdown.push({
        operation: `${op.id} (${op.type})`,
        time_sec: opCuttingTime + opRapidTime + opDwell,
        pct_of_total: 0, // Calculate after
      });
    }

    const toolChangeTime = machineParams.tool_change_time_sec * (machineParams.tool_count - 1);
    const loadUnloadTime = machineParams.load_unload_time_sec;

    const totalTime = cuttingTime + rapidTime + dwellTime + toolChangeTime + loadUnloadTime;

    // Calculate percentages
    for (const item of breakdown) {
      item.pct_of_total = (item.time_sec / totalTime) * 100;
    }

    // Identify bottlenecks (operations > 30% of total)
    const bottlenecks = breakdown
      .filter(b => b.pct_of_total > 30)
      .map(b => b.operation);

    // Optimization potential (based on rapid traverse efficiency)
    const rapidPct = (rapidTime / totalTime) * 100;
    const optimizationPotential = rapidPct > 20 ? (rapidPct - 15) : 0;

    return {
      total_cycle_time_sec: {
        value: totalTime,
        confidence: 0.85,
        lower_bound: totalTime * 0.9,
        upper_bound: totalTime * 1.15,
        uncertainty: totalTime * 0.08,
        model_used: "Operation-based time study",
      },
      cutting_time_sec: cuttingTime,
      rapid_time_sec: rapidTime,
      tool_change_time_sec: toolChangeTime,
      dwell_time_sec: dwellTime,
      load_unload_time_sec: loadUnloadTime,
      breakdown,
      bottleneck_operations: bottlenecks,
      optimization_potential_pct: optimizationPotential,
    };
  }

  /**
   * Predict quality outcomes with dimensional accuracy.
   */
  predictQualityOutcome(
    targetDimensions: Array<{
      id: string;
      type: "diameter" | "length" | "roundness";
      target_mm: number;
      tolerance_mm: number;
    }>,
    conditions: CuttingConditions,
    machineAccuracy: {
      positioning_accuracy_mm: number;
      repeatability_mm: number;
      thermal_drift_mm?: number;
    },
    toolState?: ToolState
  ): QualityPrediction {
    log.info(`[LathePredictive] Predicting quality for ${targetDimensions.length} dimensions`);

    const criticalDims: QualityPrediction["critical_dimensions"] = [];

    // Base error sources
    const positioningError = machineAccuracy.positioning_accuracy_mm;
    const repeatabilityError = machineAccuracy.repeatability_mm;
    const thermalError = machineAccuracy.thermal_drift_mm ?? 0.005;

    // Tool wear contribution
    let wearError = 0;
    if (toolState && toolState.current_vb_mm) {
      wearError = toolState.current_vb_mm * 0.3; // Wear increases diameter
    }

    // Combined error (RSS)
    const baseError = Math.sqrt(
      Math.pow(positioningError, 2) +
      Math.pow(repeatabilityError, 2) +
      Math.pow(thermalError, 2) +
      Math.pow(wearError, 2)
    );

    // Evaluate each dimension
    let inToleranceCount = 0;
    let minMargin = 1.0;

    for (const dim of targetDimensions) {
      // Error varies by dimension type
      let dimError = baseError;
      if (dim.type === "diameter") {
        dimError *= 1.2; // Diameters affected more by multiple factors
      } else if (dim.type === "roundness") {
        dimError *= 0.5; // Roundness error typically smaller
      }

      const predictedDim = dim.target_mm + (Math.random() - 0.5) * dimError * 2;
      const deviation = Math.abs(predictedDim - dim.target_mm);
      const inTolerance = deviation <= dim.tolerance_mm;
      const margin = 1 - (deviation / dim.tolerance_mm);

      if (inTolerance) inToleranceCount++;
      if (margin < minMargin) minMargin = margin;

      criticalDims.push({
        dimension_id: dim.id,
        target_mm: dim.target_mm,
        tolerance_mm: dim.tolerance_mm,
        predicted_mm: Math.round(predictedDim * 10000) / 10000,
        in_tolerance: inTolerance,
        margin_pct: Math.max(0, margin * 100),
      });
    }

    // Calculate Cpk estimate
    // Cpk = min((USL - mean) / 3σ, (mean - LSL) / 3σ)
    const sigma = baseError / 2;
    const cpk = Math.min(2.0, minMargin / (3 * sigma / criticalDims[0]?.tolerance_mm || 0.01));

    // Probabilities
    const passProb = inToleranceCount / targetDimensions.length;
    const scrapProb = Math.pow(1 - passProb, 2); // Exponential for multiple failures
    const reworkProb = (1 - passProb) * 0.7; // 70% of failures can be reworked

    // Surface finish prediction
    const surfacePred = this.predictSurfaceFinish(conditions, toolState);

    return {
      diameter_error_mm: {
        value: baseError,
        confidence: 0.75,
        lower_bound: baseError * 0.5,
        upper_bound: baseError * 2.0,
        uncertainty: baseError * 0.3,
        model_used: "RSS error propagation",
      },
      length_error_mm: {
        value: baseError * 0.8,
        confidence: 0.8,
        lower_bound: baseError * 0.4,
        upper_bound: baseError * 1.5,
        uncertainty: baseError * 0.25,
        model_used: "RSS error propagation",
      },
      roundness_error_mm: {
        value: repeatabilityError * 0.5,
        confidence: 0.7,
        lower_bound: repeatabilityError * 0.3,
        upper_bound: repeatabilityError * 0.8,
        uncertainty: repeatabilityError * 0.15,
        model_used: "Machine repeatability based",
      },
      surface_finish_ra: surfacePred.ra_um,
      cpk_estimate: {
        value: cpk,
        confidence: 0.65,
        lower_bound: cpk * 0.7,
        upper_bound: Math.min(2.0, cpk * 1.3),
        uncertainty: cpk * 0.2,
        model_used: "Statistical process capability",
      },
      scrap_probability: scrapProb,
      rework_probability: reworkProb,
      pass_probability: passProb,
      critical_dimensions: criticalDims,
    };
  }

  /**
   * Detect anomalies in process data.
   */
  detectAnomalies(
    currentData: {
      cutting_force_n?: number;
      spindle_load_pct?: number;
      vibration_mm_s?: number;
      temperature_c?: number;
      surface_finish_ra?: number;
      cycle_time_sec?: number;
      dimension_error_mm?: number;
    },
    baselineData: {
      cutting_force_n_mean: number;
      cutting_force_n_std: number;
      spindle_load_pct_mean: number;
      spindle_load_pct_std: number;
      vibration_mm_s_mean: number;
      vibration_mm_s_std: number;
      cycle_time_sec_mean?: number;
      cycle_time_sec_std?: number;
    }
  ): AnomalyDetection {
    log.info(`[LathePredictive] Detecting anomalies`);

    const anomalies: AnomalyDetection["anomalies"] = [];

    // Helper function for sigma calculation
    const calcSigma = (current: number, mean: number, std: number): number => {
      return std > 0 ? Math.abs(current - mean) / std : 0;
    };

    // Check cutting force
    if (currentData.cutting_force_n !== undefined) {
      const sigma = calcSigma(
        currentData.cutting_force_n,
        baselineData.cutting_force_n_mean,
        baselineData.cutting_force_n_std
      );
      if (sigma > 3) {
        anomalies.push({
          id: "ANO-FORCE",
          type: "process",
          severity: sigma > 5 ? "critical" : sigma > 4 ? "severe" : "moderate",
          description: `Cutting force ${sigma.toFixed(1)}σ from baseline`,
          deviation_sigma: sigma,
          probable_cause: currentData.cutting_force_n > baselineData.cutting_force_n_mean
            ? "Tool wear, work hardening, or incorrect parameters"
            : "Missing material, air cut, or broken tool",
          recommended_action: sigma > 4
            ? "Stop and inspect immediately"
            : "Monitor closely, check tool condition",
        });
      }
    }

    // Check spindle load
    if (currentData.spindle_load_pct !== undefined) {
      const sigma = calcSigma(
        currentData.spindle_load_pct,
        baselineData.spindle_load_pct_mean,
        baselineData.spindle_load_pct_std
      );
      if (sigma > 3) {
        anomalies.push({
          id: "ANO-LOAD",
          type: "machine",
          severity: sigma > 5 ? "critical" : "moderate",
          description: `Spindle load ${sigma.toFixed(1)}σ from baseline`,
          deviation_sigma: sigma,
          probable_cause: "Excessive cutting parameters or tool dulling",
          recommended_action: "Reduce parameters or index tool",
        });
      }
    }

    // Check vibration
    if (currentData.vibration_mm_s !== undefined) {
      const sigma = calcSigma(
        currentData.vibration_mm_s,
        baselineData.vibration_mm_s_mean,
        baselineData.vibration_mm_s_std
      );
      if (sigma > 2.5) {
        anomalies.push({
          id: "ANO-VIBRATION",
          type: "process",
          severity: sigma > 4 ? "severe" : "moderate",
          description: `Vibration ${sigma.toFixed(1)}σ from baseline - possible chatter`,
          deviation_sigma: sigma,
          probable_cause: "Chatter onset, loose workholding, or tool instability",
          recommended_action: "Reduce speed/feed, check workholding, verify tool clamping",
        });
      }
    }

    // Check cycle time
    if (currentData.cycle_time_sec !== undefined && baselineData.cycle_time_sec_mean) {
      const sigma = calcSigma(
        currentData.cycle_time_sec,
        baselineData.cycle_time_sec_mean,
        baselineData.cycle_time_sec_std ?? baselineData.cycle_time_sec_mean * 0.1
      );
      if (sigma > 3) {
        anomalies.push({
          id: "ANO-CYCLE",
          type: "process",
          severity: "minor",
          description: `Cycle time ${sigma.toFixed(1)}σ from baseline`,
          deviation_sigma: sigma,
          probable_cause: currentData.cycle_time_sec > baselineData.cycle_time_sec_mean
            ? "Feed override, dwell, or operator intervention"
            : "Missed operation or rapid error",
          recommended_action: "Verify program and operation sequence",
        });
      }
    }

    // Determine overall health
    const maxSeverity = anomalies.reduce((max, a) => {
      const severityRank = { minor: 1, moderate: 2, severe: 3, critical: 4 };
      return Math.max(max, severityRank[a.severity]);
    }, 0);

    let overallHealth: AnomalyDetection["overall_process_health"] = "normal";
    if (maxSeverity >= 4) overallHealth = "critical";
    else if (maxSeverity >= 2) overallHealth = "degraded";

    // Simple trend (would need historical data for real implementation)
    const trend: AnomalyDetection["trend_direction"] =
      anomalies.length > 2 ? "degrading" : anomalies.length === 0 ? "stable" : "stable";

    return {
      anomalies_detected: anomalies.length > 0,
      anomaly_count: anomalies.length,
      anomalies,
      overall_process_health: overallHealth,
      trend_direction: trend,
    };
  }

  /**
   * Record calibration data for learning.
   */
  recordCalibration(data: CalibrationData): void {
    const key = `${data.shop_id}:${data.machine_id}:${data.material}:${data.operation}`;
    if (!this.calibrationData.has(key)) {
      this.calibrationData.set(key, []);
    }
    this.calibrationData.get(key)!.push(data);
    log.info(`[LathePredictive] Recorded calibration for ${key}`);
  }

  /**
   * Get calibration factor for a specific context.
   */
  getCalibrationFactor(
    shopId: string,
    machineId: string,
    material: string,
    operation: string
  ): number {
    const key = `${shopId}:${machineId}:${material}:${operation}`;
    const data = this.calibrationData.get(key);

    if (!data || data.length < 3) {
      return 1.0; // No calibration available
    }

    // Calculate average correction factor
    const recentData = data.slice(-10);
    const avgCorrection = recentData.reduce((sum, d) =>
      sum + (d.actual_value / d.predicted_value), 0) / recentData.length;

    return Math.max(0.5, Math.min(2.0, avgCorrection)); // Clamp to reasonable range
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const lathePredictiveIntelligenceEngine = new LathePredictiveIntelligenceEngine();
