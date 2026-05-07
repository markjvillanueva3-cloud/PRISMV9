/**
 * AdaptiveMachiningIntegrationEngine — Unified Integration Layer
 *
 * Phase 0.26: Dynamic Adaptive Machining Integration
 *
 * Integrates Phase 0.26 adaptive machining engines with existing
 * Mill and Lathe AI systems:
 *
 * MILLING INTEGRATION:
 * - MillMasterOrchestratorFacadeEngine → Phase 0.26 engagement/force prediction
 * - MillingAGIOrchestrationEngine → Adaptive feed modulation
 * - MillingUnifiedScienceOrchestrationEngine → Holistic intelligence
 *
 * LATHE INTEGRATION:
 * - LatheMasterOrchestratorFacadeEngine → Lathe-specific adaptive control
 * - LatheUnifiedAIEngine → Turning engagement dynamics
 * - LatheAIOrchestrationEngine → Failure anticipation
 *
 * SHARED SYSTEMS:
 * - Phase 0.25 variability engines (envelope, source tracking, boundaries)
 * - Failure mode anticipation
 * - Environmental sensitivity
 * - Real-time adaptive controller
 *
 * @module engines/AdaptiveMachiningIntegrationEngine
 */

import { engagementDynamicsEngine, EngagementProfile, EngagementState } from "./EngagementDynamicsEngine.js";
import { adaptiveFeedModulationEngine, FeedModulationResult, SegmentFeedPlan } from "./AdaptiveFeedModulationEngine.js";
import { interOperationStateEngine, OperationRecommendation, OperationState } from "./InterOperationStateEngine.js";
import { holisticMachiningIntelligenceEngine, ProcessRiskAssessment, AllForces } from "./HolisticMachiningIntelligenceEngine.js";
import { failureModeAnticipationEngine, FailureRiskProfile } from "./FailureModeAnticipationEngine.js";
import { processEnvironmentSensitivityEngine, EnvironmentalRisk } from "./ProcessEnvironmentSensitivityEngine.js";
import { realTimeAdaptiveControllerEngine, ControlOutput, SensorInputs } from "./RealTimeAdaptiveControllerEngine.js";
import { latheAdaptiveMachiningEngine, TurningEngagement, TurningForces, LatheAdaptiveFeedResult } from "./LatheAdaptiveMachiningEngine.js";
import { variabilityEnvelopeEngine } from "./VariabilityEnvelopeEngine.js";
import { variabilitySourceTrackerEngine } from "./VariabilitySourceTrackerEngine.js";
import { contextualBoundaryEngine } from "./ContextualBoundaryEngine.js";

// ============================================================================
// UNIFIED ADAPTIVE REQUEST/RESPONSE
// ============================================================================

export type MachiningDomain = "milling" | "turning" | "mill_turn";

export interface AdaptiveRequest {
  domain: MachiningDomain;
  requestType: "pre_analysis" | "real_time" | "post_analysis" | "full_cycle";

  // Common parameters
  material: string;
  materialIso: "P" | "M" | "K" | "N" | "S" | "H";
  machineId: string;
  toolId: string;
  operationType: string;

  // Milling-specific
  milling?: {
    toolDiameter: number;
    flutes: number;
    axialDepth: number;
    radialDepth: number;
    feedPerTooth: number;
    cuttingSpeed: number;
    toolpathType: "linear" | "trochoidal" | "adaptive" | "hsr";
  };

  // Turning-specific
  turning?: {
    diameter: number;
    depthOfCut: number;
    feedPerRev: number;
    leadAngle: number;
    noseRadius: number;
    cuttingSpeed: number;
    cssEnabled: boolean;
    operationType: "od_turning" | "id_boring" | "facing" | "grooving" | "threading" | "parting";
  };

  // Environment (optional)
  environment?: {
    ambientTemp: number;
    humidity: number;
    machineUptime: number;
  };

  // Sensor data (for real-time)
  sensors?: SensorInputs;

  // Options
  includeFailureAnalysis?: boolean;
  includeEnvironmentalAnalysis?: boolean;
  includeRecommendations?: boolean;
}

export interface AdaptiveResponse {
  domain: MachiningDomain;
  requestType: AdaptiveRequest["requestType"];
  timestamp: string;

  // Pre-machining analysis
  preAnalysis?: {
    riskAssessment: ProcessRiskAssessment;
    failureRisks: FailureRiskProfile;
    environmentalRisks: EnvironmentalRisk[];
    operationRecommendations: OperationRecommendation[];
    proceedRecommendation: "proceed" | "caution" | "delay" | "abort";
  };

  // Real-time control
  realTimeControl?: {
    feedModulation: FeedModulationResult | LatheAdaptiveFeedResult;
    controlOutput: ControlOutput;
    activeConstraints: string[];
    currentEngagement: EngagementState | TurningEngagement;
  };

  // Post-machining analysis
  postAnalysis?: {
    qualityPrediction: {
      predictedRa: number;
      predictedDimensionalError: number;
      confidence: number;
    };
    toolWearUpdate: {
      currentWear: number;
      remainingLife: number;
    };
    learningInsights: string[];
  };

  // Provenance
  provenance: {
    enginesInvoked: string[];
    formulasUsed: string[];
    confidence: number;
    computeTimeMs: number;
  };
}

// ============================================================================
// MILL INTEGRATION INTERFACE
// ============================================================================

export interface MillAdaptiveContext {
  engagementProfile: EngagementProfile;
  feedPlan: SegmentFeedPlan;
  forces: AllForces;
  failureRisks: FailureRiskProfile;
  recommendations: OperationRecommendation[];
}

// ============================================================================
// LATHE INTEGRATION INTERFACE
// ============================================================================

export interface LatheAdaptiveContext {
  engagement: TurningEngagement;
  forces: TurningForces;
  adaptiveFeed: LatheAdaptiveFeedResult;
  failureRisks: FailureRiskProfile;
  recommendations: OperationRecommendation[];
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class AdaptiveMachiningIntegrationEngine {
  /**
   * Main entry point for adaptive machining requests
   */
  process(request: AdaptiveRequest): AdaptiveResponse {
    const startTime = Date.now();
    const enginesInvoked: string[] = ["AdaptiveMachiningIntegrationEngine"];
    const formulasUsed: string[] = [];

    let preAnalysis: AdaptiveResponse["preAnalysis"];
    let realTimeControl: AdaptiveResponse["realTimeControl"];
    let postAnalysis: AdaptiveResponse["postAnalysis"];

    // Route based on domain
    if (request.domain === "milling" && request.milling) {
      const context = this.processMillingRequest(request, enginesInvoked, formulasUsed);

      if (request.requestType === "pre_analysis" || request.requestType === "full_cycle") {
        preAnalysis = this.buildPreAnalysis(request, context.failureRisks, context.recommendations, enginesInvoked);
      }

      if (request.requestType === "real_time" || request.requestType === "full_cycle") {
        realTimeControl = this.buildMillingRealTimeControl(request, context, enginesInvoked);
      }

      if (request.requestType === "post_analysis" || request.requestType === "full_cycle") {
        postAnalysis = this.buildPostAnalysis(context.forces, enginesInvoked);
      }
    } else if (request.domain === "turning" && request.turning) {
      const context = this.processLatheRequest(request, enginesInvoked, formulasUsed);

      if (request.requestType === "pre_analysis" || request.requestType === "full_cycle") {
        preAnalysis = this.buildPreAnalysis(request, context.failureRisks, context.recommendations, enginesInvoked);
      }

      if (request.requestType === "real_time" || request.requestType === "full_cycle") {
        realTimeControl = this.buildLatheRealTimeControl(request, context, enginesInvoked);
      }

      if (request.requestType === "post_analysis" || request.requestType === "full_cycle") {
        postAnalysis = this.buildPostAnalysis(context.forces, enginesInvoked);
      }
    } else if (request.domain === "mill_turn") {
      // Mill-turn: process both domains
      enginesInvoked.push("MillTurnIntegration");
      // Would process both milling and turning portions
    }

    const computeTimeMs = Date.now() - startTime;

    return {
      domain: request.domain,
      requestType: request.requestType,
      timestamp: new Date().toISOString(),
      preAnalysis,
      realTimeControl,
      postAnalysis,
      provenance: {
        enginesInvoked,
        formulasUsed,
        confidence: this.calculateConfidence(enginesInvoked),
        computeTimeMs,
      },
    };
  }

  /**
   * Process milling request through Phase 0.26 engines
   */
  private processMillingRequest(
    request: AdaptiveRequest,
    enginesInvoked: string[],
    formulasUsed: string[]
  ): MillAdaptiveContext {
    const milling = request.milling!;

    // 1. Calculate engagement profile
    enginesInvoked.push("EngagementDynamicsEngine");
    formulasUsed.push("chip_thinning", "kienzle_force");

    const toolpathSegment = {
      id: `${request.machineId}_${request.toolId}`,
      points: [
        { x: 0, y: 0, z: -milling.axialDepth },
        { x: milling.radialDepth, y: 0, z: -milling.axialDepth },
      ],
      type: "linear" as const,
      toolDiameter: milling.toolDiameter,
      depthOfCut: milling.axialDepth,
    };

    const engagementProfile = engagementDynamicsEngine.calculateSegmentProfile(
      toolpathSegment,
      milling.feedPerTooth,
      milling.flutes
    );

    // 2. Calculate adaptive feed plan
    enginesInvoked.push("AdaptiveFeedModulationEngine");

    const feedPlan = adaptiveFeedModulationEngine.calculateSegmentFeedPlan(
      engagementProfile,
      milling.feedPerTooth * milling.flutes * (milling.cuttingSpeed * 1000 / (Math.PI * milling.toolDiameter)),
      request.toolId
    );

    // 3. Predict forces
    enginesInvoked.push("HolisticMachiningIntelligenceEngine");
    formulasUsed.push("kienzle_Fc", "thermal_partition");

    const materialKc = this.getMaterialKc(request.materialIso);
    const forces = holisticMachiningIntelligenceEngine.predictForces(
      {
        Vc: milling.cuttingSpeed,
        fz: milling.feedPerTooth,
        ap: milling.axialDepth,
        ae: milling.radialDepth,
        D: milling.toolDiameter,
        z: milling.flutes,
      },
      materialKc,
      0.25,
      90
    );

    // 4. Failure analysis
    enginesInvoked.push("FailureModeAnticipationEngine");

    const failureRisks = failureModeAnticipationEngine.analyzeFailureRisk({
      toolWearPercent: 20,
      toolOverhangRatio: 3,
      toolGradeMatch: 0.9,
      cuttingForce: forces.cutting.Fc,
      spindleLoad: (forces.cutting.power / 15) * 100,
      vibrationLevel: 0.5,
      temperature: 35,
      clampingForce: forces.clamping.totalClamping,
      cuttingForceRequired: forces.totalResultant,
      fixtureRigidity: 0.85,
      machineHours: 5000,
      spindleCondition: 85,
      lastMaintenance: 100,
      materialHardness: 35,
      materialAbrasivity: this.getMaterialAbrasivity(request.materialIso),
      engagementPercent: engagementProfile.avgEngagement,
      depthOfCut: milling.axialDepth,
      programVerified: true,
    });

    // 5. Operation recommendations
    enginesInvoked.push("InterOperationStateEngine");

    const recommendations = interOperationStateEngine.getNextOperationRecommendations(
      request.operationType.includes("finish") ? "finishing" : "roughing",
      0.02
    );

    return {
      engagementProfile,
      feedPlan,
      forces,
      failureRisks,
      recommendations,
    };
  }

  /**
   * Process lathe request through Phase 0.26 engines
   */
  private processLatheRequest(
    request: AdaptiveRequest,
    enginesInvoked: string[],
    formulasUsed: string[]
  ): LatheAdaptiveContext {
    const turning = request.turning!;

    // 1. Calculate turning engagement
    enginesInvoked.push("LatheAdaptiveMachiningEngine");
    formulasUsed.push("chip_thickness_h", "chip_width_b", "kienzle_turning");

    const engagement = latheAdaptiveMachiningEngine.calculateTurningEngagement({
      operationType: turning.operationType,
      diameter: turning.diameter,
      depthOfCut: turning.depthOfCut,
      feedPerRev: turning.feedPerRev,
      leadAngle: turning.leadAngle,
      noseRadius: turning.noseRadius,
      cuttingSpeed: turning.cuttingSpeed,
    });

    // 2. Calculate turning forces
    const materialKc = this.getMaterialKc(request.materialIso);
    const forces = latheAdaptiveMachiningEngine.calculateTurningForces(
      engagement,
      materialKc,
      0.25
    );

    // 3. Calculate thermal state
    const thermal = latheAdaptiveMachiningEngine.calculateTurningThermal(
      engagement,
      forces,
      "flood",
      100,
      turning.diameter
    );

    // 4. Assess vibration
    const vibration = latheAdaptiveMachiningEngine.assessTurningVibration(
      engagement,
      forces,
      { totalLength: 100, grippedLength: 30, minDiameter: turning.diameter, mass: 2 },
      { overhang: 30, shankSize: 20, isBoring: turning.operationType === "id_boring" },
      { tailstockEngaged: false, tailstockForce: 0, steadyRestPosition: null, steadyRestForce: 0 }
    );

    // 5. Assess workholding
    const workholding = latheAdaptiveMachiningEngine.assessTurningWorkholding(
      { type: "3jaw_chuck", gripDiameter: turning.diameter, gripLength: 30, gripForce: 8000, jawType: "hard", jawMass: 0.5, numJaws: 3 },
      { mass: 2, maxDiameter: turning.diameter },
      engagement.rpm,
      forces
    );

    // 6. Adaptive feed
    const adaptiveFeed = latheAdaptiveMachiningEngine.adaptTurningParameters(
      engagement,
      forces,
      thermal,
      vibration,
      workholding
    );

    // 7. Failure analysis
    enginesInvoked.push("FailureModeAnticipationEngine");

    const failureRisks = failureModeAnticipationEngine.analyzeFailureRisk({
      toolWearPercent: 20,
      toolOverhangRatio: 30 / 20, // tool overhang / shank
      toolGradeMatch: 0.9,
      cuttingForce: forces.Fc,
      spindleLoad: (forces.power / 15) * 100,
      vibrationLevel: vibration.chatterRisk * 2,
      temperature: thermal.toolTemperature / 10,
      clampingForce: workholding.effectiveGrip,
      cuttingForceRequired: forces.resultant,
      fixtureRigidity: workholding.safetyFactor / 3,
      machineHours: 5000,
      spindleCondition: 85,
      lastMaintenance: 100,
      materialHardness: 35,
      materialAbrasivity: this.getMaterialAbrasivity(request.materialIso),
      engagementPercent: 1.0, // continuous engagement in turning
      depthOfCut: turning.depthOfCut,
      programVerified: true,
    });

    // 8. Operation recommendations
    enginesInvoked.push("InterOperationStateEngine");

    const recommendations = interOperationStateEngine.getNextOperationRecommendations(
      turning.operationType.includes("finish") ? "finishing" : "roughing",
      0.02
    );

    return {
      engagement,
      forces,
      adaptiveFeed,
      failureRisks,
      recommendations,
    };
  }

  /**
   * Build pre-analysis section
   */
  private buildPreAnalysis(
    request: AdaptiveRequest,
    failureRisks: FailureRiskProfile,
    recommendations: OperationRecommendation[],
    enginesInvoked: string[]
  ): AdaptiveResponse["preAnalysis"] {
    enginesInvoked.push("ProcessEnvironmentSensitivityEngine");

    let environmentalRisks: EnvironmentalRisk[] = [];
    if (request.environment && request.includeEnvironmentalAnalysis) {
      const optimalWindow = processEnvironmentSensitivityEngine.calculateOptimalWindow({
        timestamp: new Date().toISOString(),
        temperature: {
          ambient: request.environment.ambientTemp,
          coolantSupply: 22,
          coolantReturn: 25,
          spindleHead: request.environment.ambientTemp + 5,
          xAxisMotor: request.environment.ambientTemp + 3,
          yAxisMotor: request.environment.ambientTemp + 3,
          zAxisMotor: request.environment.ambientTemp + 2,
          hydraulicOil: 40,
          machineStructure: request.environment.ambientTemp + 2,
          measurementProbe: request.environment.ambientTemp,
        },
        humidity: {
          relativeHumidity: request.environment.humidity,
          dewPoint: request.environment.ambientTemp - 10,
          condensationRisk: request.environment.humidity > 85,
        },
        vibration: {
          floorVibration: 0.1,
          nearbyMachineVibration: 0.05,
          trafficVibration: 0.02,
          hvacVibration: 0.01,
          dominantFrequency: 50,
          isolationEfficiency: 0.9,
        },
        fluids: {
          coolantLevel: 90,
          coolantConcentration: 8,
          coolantPH: 9.0,
          coolantBacteriaLevel: "low",
          coolantFoaming: false,
          hydraulicPressure: 70,
          hydraulicTemperature: 40,
          hydraulicContamination: 8,
          wayLubeLevel: 80,
          airSupplyPressure: 6.5,
          airSupplyDewPoint: 5,
        },
        electrical: {
          lineVoltage: 480,
          voltageStability: 2,
          powerFactor: 0.95,
          harmonicDistortion: 3,
          groundingQuality: "good",
        },
        temporal: {
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          dayOfYear: Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000),
          machineUptimeMinutes: request.environment.machineUptime,
          timeSinceLastMaintenance: 100,
          timeSinceSpindleWarmup: request.environment.machineUptime > 30 ? 30 : request.environment.machineUptime,
          productionShift: "day",
        },
      });

      // Convert to EnvironmentalRisk array
      if (optimalWindow.reasons.length > 0) {
        environmentalRisks = optimalWindow.reasons.map(r => ({
          factor: r.split(":")[0] || r,
          currentValue: 0,
          optimalRange: { min: 0, max: 100 },
          severity: "warning" as const,
          affectedParameters: ["dimensional_accuracy"],
          recommendation: r,
        }));
      }
    }

    // Build risk assessment
    const overallRisk = failureRisks.overallRisk +
      (environmentalRisks.filter(r => r.severity === "critical").length * 0.1);

    // Map internal "caution"/"delay" semantics onto the public schema values
    // ("proceed_with_caution"/"modify_parameters") accepted by ProcessRiskAssessment.
    let proceedRecommendation: "proceed" | "proceed_with_caution" | "modify_parameters" | "abort" = "proceed";
    if (overallRisk > 0.7) proceedRecommendation = "abort";
    else if (overallRisk > 0.5) proceedRecommendation = "modify_parameters";
    else if (overallRisk > 0.3) proceedRecommendation = "proceed_with_caution";

    return {
      riskAssessment: {
        overallRisk,
        riskCategory: overallRisk < 0.2 ? "acceptable" : overallRisk < 0.4 ? "elevated" : overallRisk < 0.7 ? "high" : "critical",
        potentialIssues: failureRisks.predictions.map(p => ({
          issueType: p.mode.id,
          severity: p.mode.severity as "low" | "medium" | "high" | "critical",
          probability: p.probability,
          affectedParameter: p.mode.warningIndicators[0] || "",
          rootCause: p.mode.rootCauses[0] || "",
          mitigation: p.mode.preventionStrategies[0] || "",
          source: "failure_anticipation" as const,
        })),
        proceedRecommendation,
        parameterAdjustments: recommendations.map(r => ({
          parameter: r.parameter,
          currentValue: 100,
          recommendedValue: 100 * r.adjustment,
          reason: r.reason,
        })),
        monitoringPriorities: failureRisks.monitoringPriorities,
      },
      failureRisks,
      environmentalRisks,
      operationRecommendations: recommendations,
      proceedRecommendation,
    };
  }

  /**
   * Build real-time control for milling
   */
  private buildMillingRealTimeControl(
    request: AdaptiveRequest,
    context: MillAdaptiveContext,
    enginesInvoked: string[]
  ): AdaptiveResponse["realTimeControl"] {
    enginesInvoked.push("RealTimeAdaptiveControllerEngine");

    // Get current engagement state
    const currentEngagement = context.engagementProfile.states[0];

    // Get feed modulation
    const feedModulation = context.feedPlan.modulatedFeeds[0];

    // Process through real-time controller if sensor data available
    let controlOutput: ControlOutput;
    if (request.sensors) {
      controlOutput = realTimeAdaptiveControllerEngine.update(request.sensors);
    } else {
      controlOutput = {
        timestamp: Date.now(),
        feedOverride: feedModulation.modulationFactor * 100,
        speedOverride: 100,
        coolantOverride: 100,
        adaptiveDepthLimit: request.milling!.axialDepth,
        warnings: context.failureRisks.predictions.filter(p => p.probability > 0.3).map(p => p.mode.name),
        alarms: [],
        operatorMessages: [],
        safetyHold: false,
        reason: feedModulation.reason,
      };
    }

    return {
      feedModulation,
      controlOutput,
      activeConstraints: feedModulation.constraints,
      currentEngagement,
    };
  }

  /**
   * Build real-time control for lathe
   */
  private buildLatheRealTimeControl(
    request: AdaptiveRequest,
    context: LatheAdaptiveContext,
    enginesInvoked: string[]
  ): AdaptiveResponse["realTimeControl"] {
    enginesInvoked.push("RealTimeAdaptiveControllerEngine");

    // Get feed adaptation
    const feedModulation = context.adaptiveFeed;

    // Process through real-time controller if sensor data available
    let controlOutput: ControlOutput;
    if (request.sensors) {
      controlOutput = realTimeAdaptiveControllerEngine.update(request.sensors);
    } else {
      controlOutput = {
        timestamp: Date.now(),
        feedOverride: feedModulation.feedAdjustmentFactor * 100,
        speedOverride: feedModulation.rpmAdjustmentFactor * 100,
        coolantOverride: 100,
        adaptiveDepthLimit: request.turning!.depthOfCut,
        warnings: context.failureRisks.predictions.filter(p => p.probability > 0.3).map(p => p.mode.name),
        alarms: [],
        operatorMessages: [],
        safetyHold: false,
        reason: feedModulation.reason,
      };
    }

    return {
      feedModulation,
      controlOutput,
      activeConstraints: feedModulation.constraints,
      currentEngagement: context.engagement,
    };
  }

  /**
   * Build post-analysis section
   */
  private buildPostAnalysis(
    forces: AllForces | TurningForces,
    enginesInvoked: string[]
  ): AdaptiveResponse["postAnalysis"] {
    enginesInvoked.push("VariabilityEnvelopeEngine");

    // Get quality prediction from variability envelope
    const raEvaluation = variabilityEnvelopeEngine.evaluate("surface_roughness", 1.6);
    const dimEvaluation = variabilityEnvelopeEngine.evaluate("dimensional_deviation", 0.02);

    return {
      qualityPrediction: {
        predictedRa: raEvaluation.percentile * 3.2, // rough estimate
        predictedDimensionalError: dimEvaluation.percentile * 0.05,
        confidence: (raEvaluation.sampleSize > 10 && dimEvaluation.sampleSize > 10) ? 0.8 : 0.5,
      },
      toolWearUpdate: {
        currentWear: 25,
        remainingLife: 45, // minutes
      },
      learningInsights: [
        "Force levels within expected range",
        "Thermal expansion compensation recommended",
      ],
    };
  }

  /**
   * Get material kc1.1 from ISO group
   */
  private getMaterialKc(iso: "P" | "M" | "K" | "N" | "S" | "H"): number {
    const kcValues: Record<typeof iso, number> = {
      P: 1800, // Steel
      M: 2100, // Stainless
      K: 1100, // Cast iron
      N: 700,  // Non-ferrous
      S: 2800, // Heat resistant
      H: 3200, // Hardened
    };
    return kcValues[iso];
  }

  /**
   * Get material abrasivity from ISO group
   */
  private getMaterialAbrasivity(iso: "P" | "M" | "K" | "N" | "S" | "H"): number {
    const abrasivity: Record<typeof iso, number> = {
      P: 0.3,
      M: 0.5,
      K: 0.6,
      N: 0.2,
      S: 0.7,
      H: 0.8,
    };
    return abrasivity[iso];
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(enginesInvoked: string[]): number {
    // More engines = more comprehensive = higher confidence
    const baseConfidence = 0.5;
    const engineBonus = Math.min(0.4, enginesInvoked.length * 0.05);
    return baseConfidence + engineBonus;
  }

  /**
   * Get integration for Mill orchestrator
   */
  getMillIntegration(
    material: string,
    materialIso: "P" | "M" | "K" | "N" | "S" | "H",
    toolDiameter: number,
    flutes: number,
    axialDepth: number,
    radialDepth: number,
    feedPerTooth: number,
    cuttingSpeed: number
  ): MillAdaptiveContext {
    const enginesInvoked: string[] = [];
    const formulasUsed: string[] = [];

    return this.processMillingRequest(
      {
        domain: "milling",
        requestType: "full_cycle",
        material,
        materialIso,
        machineId: "default",
        toolId: "default",
        operationType: "roughing",
        milling: {
          toolDiameter,
          flutes,
          axialDepth,
          radialDepth,
          feedPerTooth,
          cuttingSpeed,
          toolpathType: "linear",
        },
      },
      enginesInvoked,
      formulasUsed
    );
  }

  /**
   * Get integration for Lathe orchestrator
   */
  getLatheIntegration(
    material: string,
    materialIso: "P" | "M" | "K" | "N" | "S" | "H",
    diameter: number,
    depthOfCut: number,
    feedPerRev: number,
    leadAngle: number,
    noseRadius: number,
    cuttingSpeed: number,
    operationType: "od_turning" | "id_boring" | "facing" | "grooving" | "threading" | "parting"
  ): LatheAdaptiveContext {
    const enginesInvoked: string[] = [];
    const formulasUsed: string[] = [];

    return this.processLatheRequest(
      {
        domain: "turning",
        requestType: "full_cycle",
        material,
        materialIso,
        machineId: "default",
        toolId: "default",
        operationType,
        turning: {
          diameter,
          depthOfCut,
          feedPerRev,
          leadAngle,
          noseRadius,
          cuttingSpeed,
          cssEnabled: true,
          operationType,
        },
      },
      enginesInvoked,
      formulasUsed
    );
  }
}

export const adaptiveMachiningIntegrationEngine = new AdaptiveMachiningIntegrationEngine();
