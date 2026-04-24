// WIRE-EXEMPT: U-EFF30 only added optional aliases to AdaptiveSpindleAnalysis/AdaptiveWearAnalysis; engine is a physics-layer bridge consumed by AdaptiveSystemIntegrationEngine, not directly dispatched.
/**
 * AdaptivePhysicsBridgeEngine — Bridges Existing Physics to Phase 0.26 Adaptive System
 *
 * Phase 0.26: Dynamic Adaptive Machining — Integration Layer
 *
 * This engine bridges the gap between:
 * - Existing specialized physics engines (ChipBreaking, CoolantDynamics, SpindleLoad, etc.)
 * - The Phase 0.26 adaptive intelligence system (HolisticMachiningIntelligence, etc.)
 *
 * By centralizing these integrations, we:
 * 1. Avoid duplicating physics calculations
 * 2. Ensure consistency between adaptive and legacy systems
 * 3. Enable real-time parameter adaptation using proven physics models
 *
 * Integrated engines:
 * - ChipBreakingEngine → ChipState for HolisticMachiningIntelligenceEngine
 * - CoolantDynamicsEngine → Coolant modeling for ProcessEnvironmentSensitivityEngine
 * - SpindleLoadMonitorEngine → Load feedback for RealTimeAdaptiveControllerEngine
 * - ToolWearProgressionEngine → WearProgression tracking
 * - SpindleTorqueCurveEngine → Torque-based force verification
 *
 * @module engines/AdaptivePhysicsBridgeEngine
 */

import { chipBreakingEngine, ChipBreakingInput, ChipBreakingResult } from "./ChipBreakingEngine.js";
import { coolantDynamicsEngine, CoolantThroughDrillingInput, CoolantThroughDrillingOutput } from "./CoolantDynamicsEngine.js";
import { spindleLoadMonitorEngine, SpindleLoadMonitorInput, SpindleLoadMonitorResult } from "./SpindleLoadMonitorEngine.js";
import { toolWearProgressionEngine, WearProgressionInput, WearProgressionResult, ToolGrade, WearStage } from "./ToolWearProgressionEngine.js";
import { spindleTorqueCurveEngine, SpindleSpec, TorquePowerResult } from "./SpindleTorqueCurveEngine.js";
import { ChipState, WearProgression } from "./HolisticMachiningIntelligenceEngine.js";
import { SensorInputs, ControlOutput } from "./RealTimeAdaptiveControllerEngine.js";

// ============================================================================
// BRIDGE INTERFACES
// ============================================================================

export interface AdaptiveCuttingConditions {
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  cutting_speed_mpm: number;
  tool_diameter_mm?: number;
  material: "steel" | "stainless" | "aluminum" | "cast_iron" | "titanium" | "superalloy";
  rake_angle_deg?: number;
  insert_nose_radius_mm?: number;
  chipbreaker_type?: "none" | "light" | "medium" | "heavy";
  coolant?: boolean;
}

export interface AdaptiveChipAnalysis {
  chipState: ChipState;
  chipBreakingResult: ChipBreakingResult;
  recommendations: string[];
  adaptations: ChipAdaptation[];
}

export interface ChipAdaptation {
  parameter: "feed" | "depth" | "speed" | "chipbreaker";
  currentValue: number | string;
  recommendedValue: number | string;
  reason: string;
  priority: "low" | "medium" | "high";
}

export interface AdaptiveCoolantAnalysis {
  effectivenessScore: number; // 0-100
  pressureAdequate: boolean;
  flowAdequate: boolean;
  chipEvacuationScore: number; // 0-100
  thermalControlScore: number; // 0-100
  recommendations: string[];
  adaptations: CoolantAdaptation[];
}

export interface CoolantAdaptation {
  parameter: "pressure" | "flow" | "concentration" | "temperature" | "delivery_method";
  currentValue: number | string;
  recommendedValue: number | string;
  reason: string;
}

export interface AdaptiveSpindleAnalysis {
  loadPercentage: number;
  loadStatus: "safe" | "warning" | "critical";
  wearTrendIndicator: number; // positive = increasing wear
  adaptiveFeedMultiplier: number; // 0.5 to 1.5
  breakageRisk: number; // 0-1
  recommendations: string[];
  /** Current measured spindle load — mirrors loadPercentage for callers that want an absolute reading. */
  currentLoad?: number;
}

export interface AdaptiveWearAnalysis {
  wearProgression: WearProgression;
  toolLifeRemaining: number; // minutes
  wearRateAcceleration: number; // rate change
  failureModeRisk: Record<string, number>;
  recommendations: string[];
  adaptations: WearAdaptation[];
  /** Current flank wear land width (VB) in millimetres — mirrors wearProgression.flankWearVB for callers that want a flat field. */
  currentVB_mm?: number;
}

export interface WearAdaptation {
  parameter: "speed" | "feed" | "depth" | "coolant";
  currentValue: number;
  recommendedValue: number;
  wearReductionPercent: number;
  reason: string;
}

export interface IntegratedAdaptiveAnalysis {
  chip: AdaptiveChipAnalysis;
  coolant: AdaptiveCoolantAnalysis;
  spindle: AdaptiveSpindleAnalysis;
  wear: AdaptiveWearAnalysis;
  overallStatus: "optimal" | "acceptable" | "needs_attention" | "critical";
  combinedRecommendations: string[];
  feedOverride: number; // Combined recommendation: 0.5 to 1.5
  speedOverride: number; // Combined recommendation: 0.5 to 1.5
  depthOverride: number; // Combined recommendation: 0.5 to 1.5
  processCapabilityScore: number; // 0-100
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class AdaptivePhysicsBridgeEngine {

  /**
   * Bridge ChipBreakingEngine to adaptive ChipState
   */
  analyzeChipFormation(conditions: AdaptiveCuttingConditions): AdaptiveChipAnalysis {
    const chipInput: ChipBreakingInput = {
      feed_mm_rev: conditions.feed_mm_rev,
      depth_of_cut_mm: conditions.depth_of_cut_mm,
      rake_angle_deg: conditions.rake_angle_deg ?? 6,
      work_material: conditions.material,
      cutting_speed_mpm: conditions.cutting_speed_mpm,
      insert_nose_radius_mm: conditions.insert_nose_radius_mm ?? 0.8,
      chipbreaker_type: conditions.chipbreaker_type ?? "medium",
      coolant: conditions.coolant ?? true,
    };

    const chipResult = chipBreakingEngine.calculate(chipInput);
    const recommendations: string[] = [...chipResult.warnings];
    const adaptations: ChipAdaptation[] = [];

    // Map chip type code to Phase 0.26 chip type
    // ChipBreakingEngine uses: 1=continuous_stringy, 2=long_helical, 3=C_shaped/discontinuous, 4=short_broken
    const chipTypeCode = chipResult.chip_type.value as number;
    const chipTypeString = chipResult.chip_type.unit; // String description stored in unit field
    let chipType: "continuous" | "serrated" | "discontinuous" | "bue";
    if (chipTypeCode <= 1) {
      chipType = "continuous";
    } else if (chipTypeCode === 2) {
      chipType = "serrated"; // Long helical maps to serrated
    } else {
      chipType = "discontinuous"; // 3+ = good chip breaking
    }

    // Convert to Phase 0.26 ChipState format
    const chipState: ChipState = {
      chipType,
      chipThickness: conditions.feed_mm_rev * chipResult.chip_thickness_ratio.value,
      chipRatio: chipResult.chip_thickness_ratio.value,
      chipCurlRadius: chipResult.chip_curl_radius.value,
      chipFlowAngle: Math.atan2(conditions.depth_of_cut_mm, conditions.feed_mm_rev) * 180 / Math.PI,
      chipBreaking: chipTypeCode >= 3 && chipResult.chip_score.value >= 50,
      bueFormation: chipTypeString.toLowerCase().includes('bue'),
      chipLoadActual: conditions.feed_mm_rev,
      chipLoadDeviation: 0,
      evacuationEfficiency: Math.min(1, chipResult.chip_score.value / 100),
    };

    // Generate adaptations based on chip analysis
    if (chipResult.birds_nest_risk.value > 50) {
      adaptations.push({
        parameter: "feed",
        currentValue: conditions.feed_mm_rev,
        recommendedValue: chipResult.min_feed_for_breaking.value,
        reason: `Bird's nest risk ${chipResult.birds_nest_risk.value}% - increase feed for chip breaking`,
        priority: "high",
      });
      recommendations.push(`Increase feed to ${chipResult.min_feed_for_breaking.value.toFixed(3)} mm/rev for chip breaking`);
    }

    if (chipTypeCode <= 1 && conditions.feed_mm_rev < chipResult.min_feed_for_breaking.value) {
      adaptations.push({
        parameter: "chipbreaker",
        currentValue: conditions.chipbreaker_type ?? "none",
        recommendedValue: chipResult.recommended_chipbreaker.value as string,
        reason: "Continuous chips at current feed - use recommended chipbreaker",
        priority: "medium",
      });
    }

    return {
      chipState,
      chipBreakingResult: chipResult,
      recommendations,
      adaptations,
    };
  }

  /**
   * Bridge CoolantDynamicsEngine to adaptive coolant analysis
   */
  analyzeCoolantEffectiveness(
    toolDiameter: number,
    materialGroup: string,
    depthRatio: number,
    coolantType: "flood" | "mql" | "through_coolant" = "through_coolant",
    currentPressure?: number,
    currentFlow?: number
  ): AdaptiveCoolantAnalysis {
    const coolantInput: CoolantThroughDrillingInput = {
      drill_diameter_mm: toolDiameter,
      material_group: materialGroup,
      depth_ratio: depthRatio,
      coolant_type: coolantType,
    };

    const coolantResult = coolantDynamicsEngine.coolantThroughDrillingParams(coolantInput);
    const recommendations: string[] = [];
    const adaptations: CoolantAdaptation[] = [];

    const recommendedPressure = coolantResult.recommended_pressure_psi.value;
    const recommendedFlow = coolantResult.recommended_flow_gpm.value;

    let pressureAdequate = true;
    let flowAdequate = true;
    let thermalScore = 100;
    let chipEvacScore = 100;

    if (currentPressure !== undefined) {
      const pressureRatio = currentPressure / recommendedPressure;
      pressureAdequate = pressureRatio >= 0.8;
      if (!pressureAdequate) {
        adaptations.push({
          parameter: "pressure",
          currentValue: currentPressure,
          recommendedValue: recommendedPressure,
          reason: `Pressure ${(pressureRatio * 100).toFixed(0)}% of recommended - chip evacuation compromised`,
        });
        chipEvacScore *= pressureRatio;
        recommendations.push(`Increase coolant pressure to ${recommendedPressure.toFixed(0)} PSI`);
      }
    }

    if (currentFlow !== undefined) {
      const flowRatio = currentFlow / recommendedFlow;
      flowAdequate = flowRatio >= 0.8;
      if (!flowAdequate) {
        adaptations.push({
          parameter: "flow",
          currentValue: currentFlow,
          recommendedValue: recommendedFlow,
          reason: `Flow ${(flowRatio * 100).toFixed(0)}% of recommended - thermal control compromised`,
        });
        thermalScore *= flowRatio;
        recommendations.push(`Increase coolant flow to ${recommendedFlow.toFixed(1)} GPM`);
      }
    }

    // Deep hole considerations
    if (coolantResult.peck_recommendation.requires_peck) {
      recommendations.push(
        `Deep hole (${coolantResult.deep_hole_classification}): peck every ${coolantResult.peck_recommendation.peck_interval_xD}×D`
      );
    }

    const effectivenessScore = (thermalScore + chipEvacScore) / 2 *
      coolantResult.tool_life_multiplier.value / 1.5 * 100;

    return {
      effectivenessScore: Math.min(100, effectivenessScore),
      pressureAdequate,
      flowAdequate,
      chipEvacuationScore: chipEvacScore,
      thermalControlScore: thermalScore,
      recommendations,
      adaptations,
    };
  }

  /**
   * Bridge SpindleLoadMonitorEngine to adaptive spindle analysis
   */
  analyzeSpindleLoad(
    cuttingPowerKw: number,
    ratedPowerKw: number,
    loadHistory: number[] = [],
    operation: "roughing" | "finishing" | "drilling" | "tapping" = "roughing"
  ): AdaptiveSpindleAnalysis {
    const spindleInput: SpindleLoadMonitorInput = {
      cutting_power_kw: cuttingPowerKw,
      rated_power_kw: ratedPowerKw,
      load_history: loadHistory,
      operation,
      adaptive_feed: true,
    };

    const spindleResult = spindleLoadMonitorEngine.calculate(spindleInput);
    const recommendations: string[] = [...spindleResult.warnings];

    const currentLoad = spindleResult.nominal_load.value;
    const warningThreshold = spindleResult.warning_threshold.value;
    const feedHoldThreshold = spindleResult.feed_hold_threshold.value;

    let loadStatus: "safe" | "warning" | "critical" = "safe";
    if (currentLoad >= feedHoldThreshold) {
      loadStatus = "critical";
      recommendations.push("CRITICAL: Reduce feed immediately or abort operation");
    } else if (currentLoad >= warningThreshold) {
      loadStatus = "warning";
      recommendations.push("WARNING: Spindle load elevated - consider reducing feed");
    }

    // Calculate adaptive feed multiplier
    let adaptiveFeedMultiplier = 1.0;
    if (currentLoad > warningThreshold) {
      adaptiveFeedMultiplier = Math.max(0.5, warningThreshold / currentLoad * 0.95);
    } else if (currentLoad < warningThreshold * 0.6) {
      adaptiveFeedMultiplier = Math.min(1.3, warningThreshold * 0.8 / currentLoad);
    }

    // Breakage risk from spike/drop limits
    const spikeLimit = spindleResult.breakage_spike_limit.value;
    const dropLimit = spindleResult.breakage_drop_limit.value;
    let breakageRisk = 0;
    if (loadHistory.length >= 2) {
      const lastLoad = loadHistory[loadHistory.length - 1];
      const prevLoad = loadHistory[loadHistory.length - 2];
      const spike = lastLoad - prevLoad;
      if (spike > spikeLimit * 0.5) breakageRisk = spike / spikeLimit;
      if (prevLoad - lastLoad > dropLimit * 0.5) breakageRisk = Math.max(breakageRisk, (prevLoad - lastLoad) / dropLimit);
    }

    return {
      loadPercentage: currentLoad,
      loadStatus,
      wearTrendIndicator: spindleResult.wear_trend.value,
      adaptiveFeedMultiplier,
      breakageRisk: Math.min(1, breakageRisk),
      recommendations,
    };
  }

  /**
   * Bridge ToolWearProgressionEngine to adaptive wear analysis
   */
  analyzeToolWear(
    cuttingSpeed: number,
    feed: number,
    depthOfCut: number,
    cuttingTime: number,
    material: string,
    toolGrade: "HSS" | "COBALT_HSS" | "CARBIDE" | "CARBIDE_COATED" | "CERMET" | "CERAMIC" | "CBN" | "PCD" = "CARBIDE_COATED",
    currentVB?: number,
    hardnessHRC: number = 30
  ): AdaptiveWearAnalysis {
    const wearInput: WearProgressionInput = {
      cutting_speed_m_min: cuttingSpeed,
      feed_mm_rev: feed,
      depth_of_cut_mm: depthOfCut,
      cutting_time_min: cuttingTime,
      tool_grade: toolGrade,
      workpiece_hardness_hrc: hardnessHRC,
      current_vb_mm: currentVB ?? 0,
      vb_limit_mm: 0.3,
    };

    const wearResult = toolWearProgressionEngine.calculate(wearInput);
    const recommendations: string[] = [...wearResult.recommendations];
    const adaptations: WearAdaptation[] = [];

    // Convert to Phase 0.26 WearProgression format
    const wearRateMmPerMin = wearResult.wear_rate_um_per_min.value / 1000;
    const remainingLifeMin = wearResult.remaining_life_min.value;
    const currentVBmm = wearResult.current_vb_mm.value;
    const wearRatio = wearResult.wear_ratio;

    const wearProgression: WearProgression = {
      flankWearVB: currentVBmm,
      craterWearKT: currentVBmm * 0.3, // Estimate crater from flank
      notchWear: currentVBmm * 0.15, // Estimate notch from flank
      thermalCracking: cuttingSpeed > 200 && !material.includes("aluminum"),
      chipping: wearRatio > 0.7,
      wearRate: wearRateMmPerMin,
      remainingLife: remainingLifeMin,
      failureMode: wearRatio > 0.9 ? "gradual" : wearRatio > 0.7 ? "thermal" : "none",
      failureProbability: Math.min(1, wearRatio * 0.8),
    };

    // Generate adaptations based on wear analysis
    if (remainingLifeMin < 10) {
      recommendations.push("TOOL CHANGE IMMINENT: Less than 10 minutes remaining life");
    }

    if (wearRateMmPerMin > 0.01) { // >10 μm/min is aggressive
      const speedReduction = 0.85;
      adaptations.push({
        parameter: "speed",
        currentValue: cuttingSpeed,
        recommendedValue: cuttingSpeed * speedReduction,
        wearReductionPercent: 30,
        reason: "High wear rate - reduce speed for tool life extension",
      });
      recommendations.push(`Reduce cutting speed by 15% to ${(cuttingSpeed * speedReduction).toFixed(0)} m/min`);
    }

    if (cuttingSpeed > 180 && wearRatio > 0.5) {
      adaptations.push({
        parameter: "coolant",
        currentValue: 0,
        recommendedValue: 1,
        wearReductionPercent: 40,
        reason: "High speed + wear - ensure adequate coolant",
      });
    }

    const failureModeRisk: Record<string, number> = {
      flank_wear: wearRatio,
      crater_wear: wearRatio * 0.3,
      thermal_cracking: cuttingSpeed > 200 ? 0.4 : 0.1,
      chipping: wearRatio > 0.7 ? 0.5 : 0.1,
    };

    return {
      wearProgression,
      toolLifeRemaining: remainingLifeMin,
      wearRateAcceleration: wearResult.wear_stage === "accelerated" || wearResult.wear_stage === "critical" ? 0.5 : 0,
      failureModeRisk,
      recommendations,
      adaptations,
    };
  }

  /**
   * Comprehensive integrated analysis combining all physics engines
   */
  performIntegratedAnalysis(
    conditions: AdaptiveCuttingConditions,
    cuttingPower: number,
    ratedPower: number,
    cuttingTime: number,
    depthRatio: number = 3,
    coolantType: "flood" | "mql" | "through_coolant" = "flood",
    loadHistory: number[] = []
  ): IntegratedAdaptiveAnalysis {
    // Run all individual analyses
    const chip = this.analyzeChipFormation(conditions);
    const coolant = this.analyzeCoolantEffectiveness(
      conditions.tool_diameter_mm ?? 10,
      this.materialToGroup(conditions.material),
      depthRatio,
      coolantType
    );
    const spindle = this.analyzeSpindleLoad(
      cuttingPower,
      ratedPower,
      loadHistory,
      "roughing"
    );
    const wear = this.analyzeToolWear(
      conditions.cutting_speed_mpm,
      conditions.feed_mm_rev,
      conditions.depth_of_cut_mm,
      cuttingTime,
      conditions.material
    );

    // Combine recommendations
    const combinedRecommendations = [
      ...chip.recommendations,
      ...coolant.recommendations,
      ...spindle.recommendations,
      ...wear.recommendations,
    ];

    // Calculate combined overrides
    let feedOverride = 1.0;
    let speedOverride = 1.0;
    let depthOverride = 1.0;

    // Chip-driven adjustments
    if (chip.chipState.chipType === "continuous" && !chip.chipState.chipBreaking) {
      feedOverride = Math.max(feedOverride, 1.1); // Increase feed for chip breaking
    }

    // Spindle-driven adjustments
    feedOverride *= spindle.adaptiveFeedMultiplier;

    // Wear-driven adjustments
    for (const adapt of wear.adaptations) {
      if (adapt.parameter === "speed" && typeof adapt.recommendedValue === "number") {
        speedOverride = Math.min(speedOverride, adapt.recommendedValue / conditions.cutting_speed_mpm);
      }
      if (adapt.parameter === "feed" && typeof adapt.recommendedValue === "number") {
        feedOverride = Math.min(feedOverride, adapt.recommendedValue / conditions.feed_mm_rev);
      }
    }

    // Clamp overrides
    feedOverride = Math.max(0.5, Math.min(1.5, feedOverride));
    speedOverride = Math.max(0.5, Math.min(1.5, speedOverride));
    depthOverride = Math.max(0.5, Math.min(1.5, depthOverride));

    // Calculate overall status
    let overallStatus: "optimal" | "acceptable" | "needs_attention" | "critical" = "optimal";
    if (spindle.loadStatus === "critical" || wear.toolLifeRemaining < 5) {
      overallStatus = "critical";
    } else if (spindle.loadStatus === "warning" || wear.toolLifeRemaining < 15 || chip.chipBreakingResult.birds_nest_risk.value > 50) {
      overallStatus = "needs_attention";
    } else if (coolant.effectivenessScore < 70 || chip.chipState.chipType === "continuous") {
      overallStatus = "acceptable";
    }

    // Process capability score (0-100)
    const processCapabilityScore = (
      (chip.chipState.evacuationEfficiency * 25) +
      (coolant.effectivenessScore * 0.25) +
      ((100 - spindle.loadPercentage) * 0.25) +
      (Math.min(100, wear.toolLifeRemaining / 60 * 100) * 0.25)
    );

    return {
      chip,
      coolant,
      spindle,
      wear,
      overallStatus,
      combinedRecommendations: [...new Set(combinedRecommendations)], // Deduplicate
      feedOverride,
      speedOverride,
      depthOverride,
      processCapabilityScore,
    };
  }

  /**
   * Generate sensor inputs for RealTimeAdaptiveControllerEngine
   */
  generateSensorInputs(
    integratedAnalysis: IntegratedAdaptiveAnalysis,
    targetChipLoad: number,
    targetForce: number
  ): SensorInputs {
    return {
      currentChipLoad: integratedAnalysis.chip.chipState.chipLoadActual,
      targetChipLoad,
      currentForce: targetForce * (integratedAnalysis.spindle.loadPercentage / 100),
      forceLimit: targetForce * 1.3,
      vibrationLevel: integratedAnalysis.chip.chipState.chipType === "serrated" ? 2.0 : 0.5,
      vibrationThreshold: 3.0,
      temperature: 200 + (100 - integratedAnalysis.coolant.thermalControlScore),
      temperatureLimit: 400,
      spindleLoad: integratedAnalysis.spindle.loadPercentage,
      spindleLoadLimit: 90,
      toolWear: integratedAnalysis.wear.wearProgression.flankWearVB,
      toolWearLimit: 0.3,
    };
  }

  /**
   * Convert material name to ISO group for coolant calculations
   */
  private materialToGroup(material: string): string {
    const mapping: Record<string, string> = {
      steel: "P",
      stainless: "M",
      cast_iron: "K",
      aluminum: "N",
      titanium: "S",
      superalloy: "S",
    };
    return mapping[material] ?? "P";
  }
}

export const adaptivePhysicsBridgeEngine = new AdaptivePhysicsBridgeEngine();
