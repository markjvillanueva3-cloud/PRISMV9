// WIRE-EXEMPT: U-EFF40 only hardened undefined-safety in the risk-assessment builder (nullish fallbacks on currentVB_mm/currentLoad, FailurePrediction alias resolution). Engine is a super-facade consumed by higher layers, not directly dispatched.
/**
 * AdaptiveSystemIntegrationEngine — Phase 0.26 System-Wide Integration
 *
 * Integrates dynamic adaptive machining intelligence throughout PRISM:
 *
 * SELF-AWARENESS LAYER:
 *   - PRISMSelfAwarenessEngine: Registers adaptive capabilities
 *   - AIIntelligenceMaximizerEngine: Routes to adaptive analysis
 *   - WEDMSelfAwarenessEngine: Provides EDM-specific adaptation
 *
 * CALCULATION LAYER:
 *   - calcDispatcher: adaptive_analysis, adaptive_feed, adaptive_speed actions
 *   - Integrates with 1100+ existing calc actions
 *
 * POST-PROCESSOR LAYER:
 *   - PostProcessorPipelineEngine: Injects adaptive feed overrides
 *   - Generates G-code with real-time adaptation commands
 *
 * BUSINESS/ERP LAYER:
 *   - Process capability scoring for quality tracking
 *   - Job cost impact from adaptive parameters
 *   - OEE improvements from optimized cutting
 *
 * @module engines/AdaptiveSystemIntegrationEngine
 */

import { adaptivePhysicsBridgeEngine, IntegratedAdaptiveAnalysis, AdaptiveCuttingConditions } from "./AdaptivePhysicsBridgeEngine.js";
import { adaptiveMachiningIntegrationEngine } from "./AdaptiveMachiningIntegrationEngine.js";
import { holisticMachiningIntelligenceEngine, ProcessRiskAssessment } from "./HolisticMachiningIntelligenceEngine.js";
import { failureModeAnticipationEngine, FailureRiskProfile } from "./FailureModeAnticipationEngine.js";
import { realTimeAdaptiveControllerEngine, ControlOutput } from "./RealTimeAdaptiveControllerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface AdaptiveCapabilityRegistration {
  domain: "milling" | "turning" | "drilling" | "wedm" | "grinding";
  capabilities: string[];
  engines: string[];
  actions: string[];
  formulas: string[];
}

export interface SystemWideAdaptiveAnalysis {
  // Core adaptive analysis
  adaptive: IntegratedAdaptiveAnalysis;
  riskAssessment: ProcessRiskAssessment;
  failureRisk: FailureRiskProfile;

  // Self-awareness integration
  selfAwareness: {
    capabilitiesUsed: string[];
    enginesInvoked: string[];
    knowledgeSourcesConsulted: string[];
    confidenceScore: number;
  };

  // Calculator integration
  calcActions: {
    recommended: string[];
    parameters: Record<string, number>;
  };

  // Post-processor integration
  postProcessor: {
    feedOverrideCode: string;
    speedOverrideCode: string;
    adaptiveComments: string[];
    machineSpecific: Record<string, string>;
  };

  // ERP/Business integration
  business: {
    processCapabilityScore: number;
    estimatedCycleTimeImpact: number; // % change
    estimatedToolLifeImpact: number; // % change
    qualityRiskLevel: "low" | "medium" | "high";
    costImpact: {
      tooling: number; // $/part change
      cycle: number; // $/part change
      quality: number; // $/part change
      total: number;
    };
  };

  // Overall system status
  systemStatus: {
    overall: "optimal" | "acceptable" | "needs_attention" | "critical";
    recommendations: string[];
    alertLevel: 0 | 1 | 2 | 3;
  };
}

export interface PostProcessorAdaptiveInjection {
  controller: string;
  feedOverrideBlock: string[];
  speedOverrideBlock: string[];
  adaptiveControlBlock: string[];
  safetyChecks: string[];
}

export interface ERPProcessMetrics {
  jobId?: string;
  operationId?: string;
  processCapabilityIndex: number; // Cpk equivalent
  expectedFirstPassYield: number; // %
  toolLifeUtilization: number; // %
  cycleTimeEfficiency: number; // %
  qualityPrediction: {
    surfaceFinishProbability: number;
    dimensionalAccuracyProbability: number;
    overallPassProbability: number;
  };
}

// ============================================================================
// SELF-AWARENESS INTEGRATION
// ============================================================================

const ADAPTIVE_CAPABILITIES: AdaptiveCapabilityRegistration[] = [
  {
    domain: "milling",
    capabilities: [
      "real_time_engagement_analysis",
      "adaptive_feed_modulation",
      "chip_load_optimization",
      "chatter_prediction_and_avoidance",
      "thermal_compensation",
      "tool_wear_tracking",
      "failure_mode_prediction",
    ],
    engines: [
      "EngagementDynamicsEngine",
      "AdaptiveFeedModulationEngine",
      "HolisticMachiningIntelligenceEngine",
      "FailureModeAnticipationEngine",
      "AdaptivePhysicsBridgeEngine",
      "RealTimeAdaptiveControllerEngine",
    ],
    actions: [
      "adaptive_analysis",
      "adaptive_feed_calc",
      "adaptive_speed_calc",
      "engagement_dynamics",
      "failure_mode_predict",
      "process_capability_calc",
    ],
    formulas: [
      "Kienzle_force",
      "Taylor_tool_life",
      "chip_thinning_factor",
      "thermal_partition",
      "engagement_angle",
    ],
  },
  {
    domain: "turning",
    capabilities: [
      "css_optimization",
      "centrifugal_workholding_analysis",
      "part_whip_prediction",
      "turning_force_adaptation",
      "bore_finishing_optimization",
    ],
    engines: [
      "LatheAdaptiveMachiningEngine",
      "AdaptiveMachiningIntegrationEngine",
    ],
    actions: [
      "adaptive_turning_analysis",
      "css_recommend",
      "workholding_safety_check",
    ],
    formulas: [
      "turning_chip_thickness",
      "centrifugal_force",
      "css_rpm_limit",
    ],
  },
];

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

export class AdaptiveSystemIntegrationEngine {

  /**
   * Get registered adaptive capabilities for self-awareness system
   */
  getCapabilityRegistration(): AdaptiveCapabilityRegistration[] {
    return ADAPTIVE_CAPABILITIES;
  }

  /**
   * Get capability summary for PRISMSelfAwarenessEngine
   */
  getSelfAwarenessSummary(): {
    totalCapabilities: number;
    totalEngines: number;
    totalActions: number;
    domains: string[];
    topCapabilities: string[];
  } {
    const allCaps = ADAPTIVE_CAPABILITIES.flatMap(c => c.capabilities);
    const allEngines = ADAPTIVE_CAPABILITIES.flatMap(c => c.engines);
    const allActions = ADAPTIVE_CAPABILITIES.flatMap(c => c.actions);

    return {
      totalCapabilities: allCaps.length,
      totalEngines: [...new Set(allEngines)].length,
      totalActions: [...new Set(allActions)].length,
      domains: ADAPTIVE_CAPABILITIES.map(c => c.domain),
      topCapabilities: allCaps.slice(0, 5),
    };
  }

  /**
   * Perform system-wide adaptive analysis
   */
  analyzeSystemWide(params: {
    domain: "milling" | "turning";
    conditions: AdaptiveCuttingConditions;
    cuttingPower?: number;
    ratedPower?: number;
    cuttingTime?: number;
    jobId?: string;
    operationId?: string;
    controller?: string;
  }): SystemWideAdaptiveAnalysis {
    const cuttingPower = params.cuttingPower ?? 8;
    const ratedPower = params.ratedPower ?? 22;
    const cuttingTime = params.cuttingTime ?? 0;

    // Core adaptive analysis
    const adaptive = adaptivePhysicsBridgeEngine.performIntegratedAnalysis(
      params.conditions,
      cuttingPower,
      ratedPower,
      cuttingTime,
      3,
      "flood"
    );

    // Failure risk prediction using analyzeFailureRisk with reasonable defaults
    const failureRisk = failureModeAnticipationEngine.analyzeFailureRisk({
      toolWearPercent: (adaptive.wear.currentVB_mm ?? 0) / 0.3 * 100,
      toolOverhangRatio: 4,
      toolGradeMatch: 0.85,
      cuttingForce: 500,
      spindleLoad: adaptive.spindle.currentLoad ?? adaptive.spindle.loadPercentage ?? 0,
      vibrationLevel: 0.5,
      temperature: 200,
      clampingForce: 5000,
      cuttingForceRequired: 500,
      fixtureRigidity: 0.9,
      machineHours: 1000,
      spindleCondition: 90,
      lastMaintenance: 50,
      materialHardness: params.conditions.material === "steel" ? 30 :
                        params.conditions.material === "stainless" ? 35 :
                        params.conditions.material === "titanium" ? 36 :
                        params.conditions.material === "superalloy" ? 40 : 25,
      materialAbrasivity: params.conditions.material === "titanium" ? 0.8 : 0.5,
      engagementPercent: 50,
      depthOfCut: params.conditions.depth_of_cut_mm,
      programVerified: true,
    });

    // Map AdaptiveCuttingConditions material names to ISO cutting-material groups
    // ISO 513: P=steel, M=stainless, K=cast_iron, N=aluminum, S=titanium/superalloy, H=hardened
    const materialIsoMap: Record<string, "P" | "M" | "K" | "N" | "S" | "H"> = {
      steel: "P",
      stainless: "M",
      aluminum: "N",
      cast_iron: "K",
      titanium: "S",
      superalloy: "S",
    };
    const materialIso = materialIsoMap[params.conditions.material] ?? "P";

    // Get integration based on domain
    const toolDiameter = params.conditions.tool_diameter_mm ?? 12;
    const integration = params.domain === "milling"
      ? adaptiveMachiningIntegrationEngine.getMillIntegration(
          params.conditions.material,          // material: string
          materialIso,                          // materialIso
          toolDiameter,                         // toolDiameter: number
          4,                                    // flutes: number (standard 4-flute default)
          params.conditions.depth_of_cut_mm,   // axialDepth: number
          toolDiameter * 0.5,                   // radialDepth: number (50% stepover default)
          params.conditions.feed_mm_rev / 4,   // feedPerTooth: number (fz = f/z, z=4)
          params.conditions.cutting_speed_mpm  // cuttingSpeed: number
        )
      : adaptiveMachiningIntegrationEngine.getLatheIntegration(
          params.conditions.material,                       // material: string
          materialIso,                                      // materialIso
          50,                                               // diameter: number mm (default workpiece OD; not in AdaptiveCuttingConditions)
          params.conditions.depth_of_cut_mm,               // depthOfCut: number
          params.conditions.feed_mm_rev,                   // feedPerRev: number
          params.conditions.rake_angle_deg ?? 5,           // leadAngle: number deg (rake_angle_deg is closest available; 5° default)
          params.conditions.insert_nose_radius_mm ?? 0.8,  // noseRadius: number mm
          params.conditions.cutting_speed_mpm,             // cuttingSpeed: number
          "od_turning"                                      // operationType
        );

    // Build risk assessment
    const riskAssessment: ProcessRiskAssessment = {
      overallRisk: failureRisk.overallRisk,
      riskCategory: failureRisk.overallRisk > 0.6 ? "high" :
                    failureRisk.overallRisk > 0.3 ? "elevated" : "acceptable",
      potentialIssues: failureRisk.predictions.filter(p => p.probability > 0.2).map(p => ({
        // FailurePrediction has `mode: FailureMode` as canonical; failureMode/
        // physicsRationale/mitigation are optional integration aliases that
        // may be missing when predictions come from the canonical pipeline.
        issueType: p.failureMode?.id ?? p.mode?.id ?? "unknown",
        severity: (p.probability > 0.6 ? "high" : p.probability > 0.3 ? "medium" : "low") as "low" | "medium" | "high" | "critical",
        probability: p.probability,
        affectedParameter: p.failureMode?.id ?? p.mode?.id ?? "unknown",
        rootCause: p.physicsRationale ?? p.mode?.rootCauses?.[0] ?? "",
        mitigation: p.mitigation ?? p.recommendedAction ?? "",
        source: "failure_mode_anticipation" as const,
      })),
      proceedRecommendation: failureRisk.overallRisk > 0.6 ? "modify_parameters" :
                              failureRisk.overallRisk > 0.3 ? "proceed_with_caution" : "proceed",
      parameterAdjustments: [],
      monitoringPriorities: failureRisk.predictions
        .filter(p => p.probability > 0.3)
        .map(p => p.failureMode?.id ?? p.mode?.id ?? "")
        .filter((s): s is string => s !== ""),
    };

    // Self-awareness integration
    const domainCaps = ADAPTIVE_CAPABILITIES.find(c => c.domain === params.domain);
    const selfAwareness = {
      capabilitiesUsed: domainCaps?.capabilities ?? [],
      enginesInvoked: [
        "AdaptivePhysicsBridgeEngine",
        "FailureModeAnticipationEngine",
        "AdaptiveMachiningIntegrationEngine",
        ...(domainCaps?.engines ?? []),
      ],
      knowledgeSourcesConsulted: [
        "ChipBreakingEngine",
        "CoolantDynamicsEngine",
        "SpindleLoadMonitorEngine",
        "ToolWearProgressionEngine",
      ],
      confidenceScore: adaptive.processCapabilityScore / 100,
    };

    // Calculator actions integration
    const calcActions = {
      recommended: [
        "adaptive_analysis",
        "engagement_dynamics",
        params.domain === "turning" ? "turning_force" : "cutting_force",
        "tool_life",
        "surface_finish",
      ],
      parameters: {
        feed_override: adaptive.feedOverride,
        speed_override: adaptive.speedOverride,
        depth_override: adaptive.depthOverride,
        chip_load_actual: adaptive.chip.chipState.chipLoadActual,
        tool_life_remaining: adaptive.wear.toolLifeRemaining,
        spindle_load_pct: adaptive.spindle.loadPercentage,
      },
    };

    // Post-processor integration
    const postProcessor = this.generatePostProcessorInjection(
      params.controller ?? "fanuc",
      adaptive
    );

    // Business/ERP integration
    const business = this.calculateBusinessImpact(adaptive, params.jobId);

    // Overall system status
    const alertLevel = adaptive.overallStatus === "critical" ? 3 :
                       adaptive.overallStatus === "needs_attention" ? 2 :
                       adaptive.overallStatus === "acceptable" ? 1 : 0;

    return {
      adaptive,
      riskAssessment,
      failureRisk,
      selfAwareness,
      calcActions,
      postProcessor: {
        feedOverrideCode: postProcessor.feedOverrideBlock.join("\n"),
        speedOverrideCode: postProcessor.speedOverrideBlock.join("\n"),
        adaptiveComments: postProcessor.adaptiveControlBlock,
        machineSpecific: {
          [params.controller ?? "fanuc"]: postProcessor.safetyChecks.join("\n"),
        },
      },
      business,
      systemStatus: {
        overall: adaptive.overallStatus,
        recommendations: adaptive.combinedRecommendations,
        alertLevel,
      },
    };
  }

  /**
   * Generate post-processor adaptive injection code
   */
  generatePostProcessorInjection(
    controller: string,
    adaptive: IntegratedAdaptiveAnalysis
  ): PostProcessorAdaptiveInjection {
    const feedOverride = Math.round(adaptive.feedOverride * 100);
    const speedOverride = Math.round(adaptive.speedOverride * 100);

    let feedOverrideBlock: string[] = [];
    let speedOverrideBlock: string[] = [];
    let adaptiveControlBlock: string[] = [];
    let safetyChecks: string[] = [];

    switch (controller.toLowerCase()) {
      case "fanuc":
      case "okuma":
        feedOverrideBlock = [
          `(ADAPTIVE FEED OVERRIDE: ${feedOverride}%)`,
          feedOverride !== 100 ? `M101 P${feedOverride} (AUTO FEED OVERRIDE)` : "",
        ].filter(Boolean);
        speedOverrideBlock = [
          `(ADAPTIVE SPEED OVERRIDE: ${speedOverride}%)`,
          speedOverride !== 100 ? `M102 P${speedOverride} (AUTO SPEED OVERRIDE)` : "",
        ].filter(Boolean);
        adaptiveControlBlock = [
          `(PROCESS CAPABILITY: ${adaptive.processCapabilityScore.toFixed(0)}%)`,
          `(CHIP BREAKING: ${adaptive.chip.chipState.chipBreaking ? "OK" : "WARNING"})`,
          `(TOOL LIFE REMAINING: ${adaptive.wear.toolLifeRemaining.toFixed(0)} MIN)`,
        ];
        safetyChecks = [
          `(SPINDLE LOAD CHECK)`,
          adaptive.spindle.loadStatus !== "safe"
            ? `#3000=1 (SPINDLE OVERLOAD WARNING)`
            : `(SPINDLE LOAD: ${adaptive.spindle.loadPercentage.toFixed(0)}% - SAFE)`,
        ];
        break;

      case "siemens":
        feedOverrideBlock = [
          `; ADAPTIVE FEED OVERRIDE: ${feedOverride}%`,
          feedOverride !== 100 ? `FGROUP(1) FOV=${feedOverride}` : "",
        ].filter(Boolean);
        speedOverrideBlock = [
          `; ADAPTIVE SPEED OVERRIDE: ${speedOverride}%`,
          speedOverride !== 100 ? `SOV=${speedOverride}` : "",
        ].filter(Boolean);
        adaptiveControlBlock = [
          `; PROCESS CAPABILITY: ${adaptive.processCapabilityScore.toFixed(0)}%`,
          `; TOOL LIFE REMAINING: ${adaptive.wear.toolLifeRemaining.toFixed(0)} MIN`,
        ];
        safetyChecks = [
          `; SPINDLE LOAD: ${adaptive.spindle.loadPercentage.toFixed(0)}%`,
        ];
        break;

      case "haas":
        feedOverrideBlock = [
          `(ADAPTIVE FEED: ${feedOverride}%)`,
          feedOverride !== 100 ? `#100=${feedOverride} (FEED MULT)` : "",
        ].filter(Boolean);
        speedOverrideBlock = [
          `(ADAPTIVE SPEED: ${speedOverride}%)`,
        ];
        adaptiveControlBlock = [
          `(PRISM ADAPTIVE - CAP:${adaptive.processCapabilityScore.toFixed(0)}%)`,
        ];
        safetyChecks = [];
        break;

      case "mitsubishi":
        feedOverrideBlock = [
          `; ADAPTIVE FEED OVERRIDE: ${feedOverride}%`,
          `; WIRE EDM: Use adaptive pulse timing`,
        ];
        speedOverrideBlock = [];
        adaptiveControlBlock = [
          `; PROCESS STABILITY: ${adaptive.overallStatus.toUpperCase()}`,
        ];
        safetyChecks = [];
        break;

      default:
        feedOverrideBlock = [`(ADAPTIVE FEED: ${feedOverride}%)`];
        speedOverrideBlock = [`(ADAPTIVE SPEED: ${speedOverride}%)`];
        adaptiveControlBlock = [`(PRISM ADAPTIVE MACHINING ENABLED)`];
        safetyChecks = [];
    }

    return {
      controller,
      feedOverrideBlock,
      speedOverrideBlock,
      adaptiveControlBlock,
      safetyChecks,
    };
  }

  /**
   * Calculate business/ERP impact metrics
   */
  calculateBusinessImpact(
    adaptive: IntegratedAdaptiveAnalysis,
    jobId?: string
  ): SystemWideAdaptiveAnalysis["business"] {
    // Estimate cycle time impact based on feed/speed overrides
    const cycleTimeImpact = ((1 / adaptive.feedOverride) - 1) * 100;

    // Tool life impact based on wear analysis
    const baseToolLife = 60; // minutes baseline
    const predictedLife = adaptive.wear.toolLifeRemaining;
    const toolLifeImpact = ((predictedLife / baseToolLife) - 1) * 100;

    // Quality risk based on process capability
    const qualityRiskLevel: "low" | "medium" | "high" =
      adaptive.processCapabilityScore > 80 ? "low" :
      adaptive.processCapabilityScore > 60 ? "medium" : "high";

    // Cost impact estimates ($/part)
    const toolingCost = adaptive.feedOverride < 1 ? 0.05 : -0.02; // Conservative = more cost
    const cycleCost = cycleTimeImpact > 0 ? cycleTimeImpact * 0.01 : cycleTimeImpact * 0.008;
    const qualityCost = qualityRiskLevel === "high" ? 0.15 :
                        qualityRiskLevel === "medium" ? 0.05 : 0;

    return {
      processCapabilityScore: adaptive.processCapabilityScore,
      estimatedCycleTimeImpact: cycleTimeImpact,
      estimatedToolLifeImpact: toolLifeImpact,
      qualityRiskLevel,
      costImpact: {
        tooling: toolingCost,
        cycle: cycleCost,
        quality: qualityCost,
        total: toolingCost + cycleCost + qualityCost,
      },
    };
  }

  /**
   * Get ERP process metrics for a job/operation
   */
  getERPProcessMetrics(
    adaptive: IntegratedAdaptiveAnalysis,
    jobId?: string,
    operationId?: string
  ): ERPProcessMetrics {
    // Process capability index (Cpk-like metric)
    const processCapabilityIndex = adaptive.processCapabilityScore / 100 * 1.33;

    // First pass yield estimate
    const expectedFirstPassYield = adaptive.overallStatus === "optimal" ? 98 :
                                    adaptive.overallStatus === "acceptable" ? 95 :
                                    adaptive.overallStatus === "needs_attention" ? 88 : 75;

    // Tool life utilization
    const toolLifeUtilization = Math.min(100, (60 - adaptive.wear.toolLifeRemaining) / 60 * 100);

    // Cycle time efficiency (based on feed override)
    const cycleTimeEfficiency = adaptive.feedOverride * 100;

    // Quality predictions
    const surfaceFinishProbability = adaptive.chip.chipState.chipBreaking ? 0.95 : 0.85;
    const dimensionalAccuracyProbability = adaptive.spindle.loadStatus === "safe" ? 0.96 : 0.88;
    const overallPassProbability = expectedFirstPassYield / 100;

    return {
      jobId,
      operationId,
      processCapabilityIndex,
      expectedFirstPassYield,
      toolLifeUtilization,
      cycleTimeEfficiency,
      qualityPrediction: {
        surfaceFinishProbability,
        dimensionalAccuracyProbability,
        overallPassProbability,
      },
    };
  }

  /**
   * Get Wire EDM adaptive parameters
   * Specialized for electrical discharge machining
   */
  getWEDMAdaptiveParams(params: {
    wire_diameter_mm: number;
    workpiece_thickness_mm: number;
    material: string;
    cutting_mode: "rough" | "skim" | "finish";
    target_surface_finish_um?: number;
  }): {
    adaptive_on_time_us: number;
    adaptive_off_time_us: number;
    adaptive_current_A: number;
    adaptive_voltage_V: number;
    wire_tension_N: number;
    flushing_pressure_bar: number;
    recommendations: string[];
  } {
    // EDM-specific adaptive parameters based on conditions
    const thicknessRatio = params.workpiece_thickness_mm / 25.4; // Normalize to 1"

    // Base parameters by cutting mode
    const modeParams = {
      rough: { on: 8, off: 16, current: 12, voltage: 60 },
      skim: { on: 2, off: 8, current: 5, voltage: 45 },
      finish: { on: 0.5, off: 4, current: 2, voltage: 35 },
    }[params.cutting_mode];

    // Adjust for thickness
    const thicknessFactor = Math.min(2, Math.max(0.5, thicknessRatio));
    const adaptiveOnTime = modeParams.on * thicknessFactor;
    const adaptiveOffTime = modeParams.off * thicknessFactor;
    const adaptiveCurrent = modeParams.current * Math.sqrt(thicknessFactor);

    // Wire tension based on wire diameter
    const wireTension = params.wire_diameter_mm < 0.2 ? 8 :
                        params.wire_diameter_mm < 0.25 ? 12 : 15;

    const recommendations: string[] = [];
    if (params.workpiece_thickness_mm > 100) {
      recommendations.push("Consider submerged cutting for thermal stability");
    }
    if (params.cutting_mode === "finish" && (params.target_surface_finish_um ?? 1.5) < 0.8) {
      recommendations.push("Use multiple skim passes for sub-micron finish");
    }

    return {
      adaptive_on_time_us: adaptiveOnTime,
      adaptive_off_time_us: adaptiveOffTime,
      adaptive_current_A: adaptiveCurrent,
      adaptive_voltage_V: modeParams.voltage,
      wire_tension_N: wireTension,
      flushing_pressure_bar: params.workpiece_thickness_mm > 50 ? 8 : 5,
      recommendations,
    };
  }
}

export const adaptiveSystemIntegrationEngine = new AdaptiveSystemIntegrationEngine();
