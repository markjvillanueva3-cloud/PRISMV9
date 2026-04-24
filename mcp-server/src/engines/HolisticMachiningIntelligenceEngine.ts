// WIRE-EXEMPT: U-EFF29 only widened the ChipState interface (added optional chipType alias); engine is a shared type surface for Phase 0.26 adaptive engines and is not directly dispatched.
/**
 * HolisticMachiningIntelligenceEngine — Total Process Intelligence
 *
 * Phase 0.26: Dynamic Adaptive Machining
 *
 * Integrates ALL factors that affect machining quality BEFORE, DURING, and AFTER
 * the cutting process. This is the central brain that considers every variable:
 *
 * BEFORE (Pre-conditions):
 * - Material state (heat treatment, prior work, inclusions)
 * - Machine state (spindle hours, backlash, thermal drift)
 * - Tool state (wear history, coatings, prior materials)
 * - Fixture state (clamping, rigidity, datum accuracy)
 * - Environment (temp, humidity, foundation vibration)
 * - Stock condition (porosity, grain direction, residual stress)
 *
 * DURING (Real-time):
 * - Forces (cutting, clamping, centrifugal, chip evacuation)
 * - Thermal (tool, part, coolant, spindle bearing)
 * - Vibration (forced, self-excited, chatter modes)
 * - Chip formation (morphology, BUE, flow direction)
 * - Wear progression (flank, crater, notch, thermal)
 * - Dynamic stiffness (position-dependent)
 * - Engagement dynamics (continuously varying)
 *
 * AFTER (Post-conditions):
 * - Surface integrity (Ra, residual stress, hardness)
 * - Dimensional stability (spring-back, warpage)
 * - Tool condition for next operation
 * - Machine drift tracking
 * - Quality feedback for learning
 *
 * @module engines/HolisticMachiningIntelligenceEngine
 */

import { variabilityEnvelopeEngine } from "./VariabilityEnvelopeEngine.js";
import { variabilitySourceTrackerEngine } from "./VariabilitySourceTrackerEngine.js";
import { contextualBoundaryEngine } from "./ContextualBoundaryEngine.js";
import { interOperationStateEngine, OperationState, ThermalState } from "./InterOperationStateEngine.js";
import { adaptiveFeedModulationEngine, ToolState } from "./AdaptiveFeedModulationEngine.js";
import { engagementDynamicsEngine, EngagementProfile } from "./EngagementDynamicsEngine.js";

// ============================================================================
// PRE-MACHINING STATE (BEFORE)
// ============================================================================

export interface MaterialState {
  materialId: string;
  hardnessHRC: number;
  heatTreatment: "annealed" | "normalized" | "hardened" | "tempered" | "as-cast" | "as-rolled";
  priorWorkHardening: number; // % increase from nominal
  grainDirection: "parallel" | "perpendicular" | "random";
  inclusionDensity: "low" | "medium" | "high"; // affects tool life
  residualStress: "compressive" | "tensile" | "neutral";
  estimatedYieldStrength: number; // MPa
}

export interface MachineReadiness {
  machineId: string;
  spindleHours: number;
  spindleBearingCondition: number; // 0-100%
  lastMaintenanceHours: number;
  axisBacklash: { x: number; y: number; z: number; a?: number; b?: number; c?: number }; // μm
  repeatability: { x: number; y: number; z: number }; // μm
  thermalState: "cold" | "warmingUp" | "stable" | "overheated";
  spindleRunout: number; // μm
  coolantState: { level: number; concentration: number; temperature: number };
  vibrationBaseline: number; // g RMS at idle
  positioningAccuracy: number; // μm
}

export interface ToolReadiness {
  toolId: string;
  wearPercent: number;
  cuttingTimeMinutes: number;
  materialsProcessed: string[]; // prior materials
  coatingCondition: number; // 0-100%
  edgeSharpness: number; // 0-100% (new = 100)
  chipLoad: number; // prior average chip load
  lastOperationType: "roughing" | "semi-finish" | "finishing" | "none";
  thermalCycles: number; // number of heat/cool cycles
  vibrationExposure: number; // cumulative g-minutes
}

export interface FixtureState {
  fixtureId: string;
  clampingForce: number; // N
  clampingType: "hydraulic" | "mechanical" | "vacuum" | "magnetic" | "collet";
  contactArea: number; // mm²
  rigidityScore: number; // 0-100
  datumAccuracy: number; // μm deviation from nominal
  partAccessibility: number; // % of part surface accessible
  overhangRatio: number; // overhang length / supported length
  vibrationDamping: number; // damping coefficient
}

export interface EnvironmentState {
  ambientTemperature: number; // °C
  temperatureStability: number; // °C variation over 1 hour
  relativeHumidity: number; // %
  foundationVibration: number; // g RMS from building/nearby machines
  airPressure: number; // bar (for air bearings, coolant)
  dustLevel: "low" | "medium" | "high";
  nearbyMachineLoad: number; // % of nearby machines running
}

export interface StockCondition {
  stockType: "bar" | "plate" | "casting" | "forging" | "previous_op";
  castingPorosity?: "none" | "low" | "medium" | "high";
  scaleSurface?: boolean; // mill scale or oxide layer
  surfaceHardness: number; // HRC (may differ from core)
  surfaceRoughness: number; // Ra from prior operation
  stockAllowance: number; // mm remaining
  materialRunout: number; // μm (for round stock)
  priorMachiningStress: "compressive" | "tensile" | "neutral";
}

// ============================================================================
// DURING-MACHINING FORCES (ALL force types)
// ============================================================================

export interface CuttingForces {
  Fc: number; // main cutting force (N)
  Ff: number; // feed force (N)
  Fp: number; // passive/radial force (N)
  torque: number; // spindle torque (Nm)
  power: number; // cutting power (kW)
  specificForce: number; // kc (MPa)
  chipThickness: number; // mm
}

export interface ClampingForces {
  totalClamping: number; // N
  frictionCoeff: number;
  safetyFactor: number;
  partLiftRisk: boolean;
  partShiftRisk: boolean;
  deformationRisk: number; // 0-1 probability
}

export interface DynamicForces {
  centrifugalForce: number; // N (tool at speed)
  chipImpact: number; // N (chip hitting part/tool)
  coolantPressure: number; // N (from high-pressure coolant)
  gyroscopicMoment: number; // Nm (high-speed spindles)
  inertialForce: number; // N (rapid direction changes)
}

export interface AllForces {
  cutting: CuttingForces;
  clamping: ClampingForces;
  dynamic: DynamicForces;
  totalResultant: number; // N (vector sum)
  directionDegrees: number; // resultant force direction
  forceRatio: number; // radial/tangential ratio
}

// ============================================================================
// DURING-MACHINING THERMAL
// ============================================================================

export interface ThermalEvolution {
  toolTemperature: number; // °C at cutting edge
  toolBulkTemperature: number; // °C average
  chipTemperature: number; // °C
  partSurfaceTemperature: number; // °C at cut
  partBulkTemperature: number; // °C average
  coolantExitTemperature: number; // °C
  spindleBearingTemperature: number; // °C
  thermalExpansionPart: number; // μm
  thermalExpansionTool: number; // μm
  thermalExpansionSpindle: number; // μm (Z-axis growth)
  heatPartitionToTool: number; // % of heat into tool
  heatPartitionToChip: number; // % of heat into chip
  heatPartitionToPart: number; // % of heat into part
}

// ============================================================================
// DURING-MACHINING VIBRATION
// ============================================================================

export interface VibrationState {
  forcedVibrationAmplitude: number; // μm
  forcedVibrationFrequency: number; // Hz
  selfExcitedRisk: number; // 0-1 (chatter probability)
  regenerativeStability: number; // 0-1 (from SLD)
  dominantMode: "stable" | "marginal" | "chatter" | "resonance";
  damping: number; // damping ratio
  modalFrequencies: number[]; // Hz (natural frequencies)
  currentSpindleHarmonics: number[]; // Hz (spindle speed harmonics)
  resonanceProximity: number; // 0-1 (how close to resonance)
}

// ============================================================================
// DURING-MACHINING CHIP FORMATION
// ============================================================================

/**
 * Extended chip morphology vocabulary used across physics/adaptive bridges.
 * "serrated" is distinct from "segmented" in legacy code (periodic shear
 * banding vs. visibly discrete chips) and is kept here so adaptive sensor
 * paths can discriminate. "bue" is the terse form of "built-up-edge".
 */
export type ChipMorphology =
  | "continuous"
  | "lamellar"
  | "segmented"
  | "serrated"
  | "discontinuous"
  | "built-up-edge"
  | "bue";

export interface ChipState {
  /**
   * Chip morphology. Either `morphology` OR the legacy alias `chipType`
   * must be provided — callers that predate Phase 0.26 populate `chipType`
   * only. New code should prefer `morphology`.
   */
  morphology?: ChipMorphology;
  chipType?: ChipMorphology;
  chipThickness: number; // mm
  chipRatio: number; // compression ratio
  chipCurlRadius: number; // mm
  chipFlowAngle: number; // degrees
  chipBreaking: boolean;
  bueFormation: boolean;
  chipLoadActual: number; // mm/tooth
  chipLoadDeviation: number; // % from target
  evacuationEfficiency: number; // 0-1 (chip clearing)
}

// ============================================================================
// DURING-MACHINING WEAR PROGRESSION
// ============================================================================

export interface WearProgression {
  flankWearVB: number; // mm
  craterWearKT: number; // mm
  notchWear: number; // mm
  thermalCracking: boolean;
  chipping: boolean;
  wearRate: number; // mm/min
  remainingLife: number; // minutes
  failureMode: "gradual" | "sudden" | "thermal" | "fracture" | "none";
  failureProbability: number; // 0-1 in next operation
}

// ============================================================================
// POST-MACHINING OUTCOME (AFTER)
// ============================================================================

export interface SurfaceIntegrity {
  surfaceRoughnessRa: number; // μm
  surfaceRoughnessRz: number; // μm
  residualStressType: "compressive" | "tensile";
  residualStressMagnitude: number; // MPa
  surfaceHardnessChange: number; // % change from bulk
  whiteLayer: boolean; // recast layer (EDM, hard turning)
  microCracks: boolean;
  burnMarks: boolean;
  tearingMarks: boolean;
  feedMarksVisibility: "none" | "light" | "visible" | "severe";
}

export interface DimensionalOutcome {
  dimensionalError: number; // mm from nominal
  roundnessError: number; // mm
  straightnessError: number; // mm
  cylindricityError: number; // mm
  parallelismError: number; // mm
  perpendicularityError: number; // mm
  positionError: number; // mm (true position)
  springBack: number; // mm (elastic recovery)
  thermalDistortion: number; // mm (if measured hot)
  stabilityRisk: "low" | "medium" | "high"; // dimensional stability over time
}

export interface QualityFeedback {
  passedInspection: boolean;
  cpk: number; // process capability
  measurementUncertainty: number; // mm
  rootCause?: string; // if failed
  correctiveAction?: string;
  processLearning: string[]; // insights for future
}

// ============================================================================
// COMPREHENSIVE PROCESS SNAPSHOT
// ============================================================================

export interface ProcessSnapshot {
  timestamp: string;
  phase: "pre" | "during" | "post";

  // Pre-conditions
  material?: MaterialState;
  machine?: MachineReadiness;
  tool?: ToolReadiness;
  fixture?: FixtureState;
  environment?: EnvironmentState;
  stock?: StockCondition;

  // During-machining state
  forces?: AllForces;
  thermal?: ThermalEvolution;
  vibration?: VibrationState;
  chip?: ChipState;
  wear?: WearProgression;
  engagement?: EngagementProfile;

  // Post-machining outcome
  surfaceIntegrity?: SurfaceIntegrity;
  dimensional?: DimensionalOutcome;
  qualityFeedback?: QualityFeedback;
}

// ============================================================================
// RISK AND ISSUE PREDICTION
// ============================================================================

export interface PotentialIssue {
  issueType: string;
  severity: "low" | "medium" | "high" | "critical";
  probability: number; // 0-1
  timeToOccur?: number; // seconds (if predictable)
  affectedParameter: string;
  rootCause: string;
  mitigation: string;
  source: "thermal" | "force" | "vibration" | "wear" | "material" | "machine" | "fixture" | "environment";
}

export interface ProcessRiskAssessment {
  overallRisk: number; // 0-1
  riskCategory: "acceptable" | "elevated" | "high" | "critical";
  potentialIssues: PotentialIssue[];
  proceedRecommendation: "proceed" | "proceed_with_caution" | "modify_parameters" | "abort";
  parameterAdjustments: Array<{
    parameter: string;
    currentValue: number;
    recommendedValue: number;
    reason: string;
  }>;
  monitoringPriorities: string[];
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class HolisticMachiningIntelligenceEngine {
  private processHistory: ProcessSnapshot[] = [];
  private readonly maxHistory = 1000;

  /**
   * Assess pre-machining readiness and predict issues
   */
  assessPreMachiningReadiness(
    material: MaterialState,
    machine: MachineReadiness,
    tool: ToolReadiness,
    fixture: FixtureState,
    environment: EnvironmentState,
    stock: StockCondition
  ): ProcessRiskAssessment {
    const issues: PotentialIssue[] = [];
    let overallRisk = 0;

    // Material-related risks
    if (material.priorWorkHardening > 20) {
      issues.push({
        issueType: "work_hardened_surface",
        severity: "medium",
        probability: 0.7,
        affectedParameter: "cutting_speed",
        rootCause: `Material work hardened ${material.priorWorkHardening}% above nominal`,
        mitigation: "Reduce cutting speed 15-20%, increase feed to get under hardened layer",
        source: "material",
      });
      overallRisk += 0.15;
    }

    if (material.inclusionDensity === "high") {
      issues.push({
        issueType: "inclusion_damage",
        severity: "high",
        probability: 0.5,
        affectedParameter: "tool_life",
        rootCause: "High inclusion density causes edge chipping",
        mitigation: "Use tougher grade, reduce feed, increase edge prep",
        source: "material",
      });
      overallRisk += 0.2;
    }

    // Machine-related risks
    if (machine.spindleBearingCondition < 70) {
      issues.push({
        issueType: "spindle_bearing_wear",
        severity: "high",
        probability: 0.6,
        affectedParameter: "surface_finish",
        rootCause: `Spindle bearing at ${machine.spindleBearingCondition}% condition`,
        mitigation: "Schedule spindle rebuild, reduce speeds for precision work",
        source: "machine",
      });
      overallRisk += 0.25;
    }

    if (machine.thermalState === "cold") {
      issues.push({
        issueType: "thermal_drift",
        severity: "medium",
        probability: 0.8,
        affectedParameter: "dimensional_accuracy",
        rootCause: "Cold machine will drift as it warms",
        mitigation: "Run warmup cycle, expect 20-50μm Z-axis growth first hour",
        source: "machine",
      });
      overallRisk += 0.1;
    }

    if (machine.spindleRunout > 5) {
      issues.push({
        issueType: "excessive_runout",
        severity: "high",
        probability: 0.9,
        affectedParameter: "surface_finish",
        rootCause: `Spindle runout ${machine.spindleRunout}μm exceeds precision threshold`,
        mitigation: "Clean collet/holder interface, check drawbar force",
        source: "machine",
      });
      overallRisk += 0.2;
    }

    // Tool-related risks
    if (tool.wearPercent > 50) {
      issues.push({
        issueType: "tool_wear_limit",
        severity: "medium",
        probability: tool.wearPercent / 100,
        timeToOccur: (100 - tool.wearPercent) * 60 / (tool.cuttingTimeMinutes / tool.wearPercent || 1),
        affectedParameter: "tool_life",
        rootCause: `Tool at ${tool.wearPercent}% wear`,
        mitigation: "Plan tool change, reduce parameters if continuing",
        source: "wear",
      });
      overallRisk += tool.wearPercent / 200;
    }

    if (tool.edgeSharpness < 50) {
      issues.push({
        issueType: "dull_cutting_edge",
        severity: "high",
        probability: 0.85,
        affectedParameter: "cutting_force",
        rootCause: `Edge sharpness at ${tool.edgeSharpness}%`,
        mitigation: "Replace insert, forces will be 30-50% higher than nominal",
        source: "wear",
      });
      overallRisk += 0.2;
    }

    // Fixture-related risks
    if (fixture.overhangRatio > 3) {
      issues.push({
        issueType: "excessive_overhang",
        severity: "high",
        probability: 0.7,
        affectedParameter: "vibration",
        rootCause: `L/D ratio ${fixture.overhangRatio} causes deflection/chatter`,
        mitigation: "Use steady rest, tailstock, or live center support",
        source: "fixture",
      });
      overallRisk += 0.25;
    }

    const clampingRequirement = stock.stockAllowance * 100 * material.estimatedYieldStrength / 10;
    if (fixture.clampingForce < clampingRequirement) {
      issues.push({
        issueType: "insufficient_clamping",
        severity: "critical",
        probability: 0.9,
        affectedParameter: "part_security",
        rootCause: `Clamping ${fixture.clampingForce}N insufficient for cutting forces`,
        mitigation: "Increase clamping, reduce cut depth, or add support",
        source: "fixture",
      });
      overallRisk += 0.4;
    }

    // Environment-related risks
    if (environment.temperatureStability > 3) {
      issues.push({
        issueType: "temperature_variation",
        severity: "medium",
        probability: 0.6,
        affectedParameter: "dimensional_accuracy",
        rootCause: `${environment.temperatureStability}°C variation in environment`,
        mitigation: "Wait for thermal stability, use in-process measurement",
        source: "environment",
      });
      overallRisk += 0.1;
    }

    if (environment.foundationVibration > 0.1) {
      issues.push({
        issueType: "foundation_vibration",
        severity: "medium",
        probability: 0.5,
        affectedParameter: "surface_finish",
        rootCause: `Floor vibration ${environment.foundationVibration}g from nearby machines`,
        mitigation: "Schedule precision work when adjacent machines idle",
        source: "environment",
      });
      overallRisk += 0.1;
    }

    // Stock-related risks
    if (stock.castingPorosity === "high") {
      issues.push({
        issueType: "porosity_breakout",
        severity: "high",
        probability: 0.6,
        affectedParameter: "surface_finish",
        rootCause: "High porosity casting will have voids at surface",
        mitigation: "Increase stock allowance, plan for blend passes",
        source: "material",
      });
      overallRisk += 0.15;
    }

    if (stock.scaleSurface) {
      issues.push({
        issueType: "scale_abrasion",
        severity: "medium",
        probability: 0.8,
        affectedParameter: "tool_life",
        rootCause: "Mill scale/oxide is extremely abrasive",
        mitigation: "Use coated carbide, avoid ceramic, expect 50% tool life reduction",
        source: "material",
      });
      overallRisk += 0.15;
    }

    // Determine overall recommendation
    overallRisk = Math.min(1, overallRisk);
    let riskCategory: ProcessRiskAssessment["riskCategory"];
    let proceedRecommendation: ProcessRiskAssessment["proceedRecommendation"];

    if (overallRisk < 0.2) {
      riskCategory = "acceptable";
      proceedRecommendation = "proceed";
    } else if (overallRisk < 0.4) {
      riskCategory = "elevated";
      proceedRecommendation = "proceed_with_caution";
    } else if (overallRisk < 0.7) {
      riskCategory = "high";
      proceedRecommendation = "modify_parameters";
    } else {
      riskCategory = "critical";
      proceedRecommendation = "abort";
    }

    // Generate parameter adjustments
    const parameterAdjustments: ProcessRiskAssessment["parameterAdjustments"] = [];

    if (issues.some(i => i.source === "wear" && i.severity !== "low")) {
      parameterAdjustments.push({
        parameter: "feed_rate",
        currentValue: 100,
        recommendedValue: 85,
        reason: "Reduce feed to compensate for tool wear",
      });
    }

    if (issues.some(i => i.issueType === "work_hardened_surface")) {
      parameterAdjustments.push({
        parameter: "cutting_speed",
        currentValue: 100,
        recommendedValue: 80,
        reason: "Reduce speed for work-hardened material",
      });
      parameterAdjustments.push({
        parameter: "depth_of_cut",
        currentValue: 100,
        recommendedValue: 120,
        reason: "Increase depth to get under hardened layer",
      });
    }

    if (issues.some(i => i.issueType === "excessive_overhang")) {
      parameterAdjustments.push({
        parameter: "spindle_speed",
        currentValue: 100,
        recommendedValue: 70,
        reason: "Reduce speed to avoid chatter from overhang",
      });
    }

    // Monitoring priorities
    const monitoringPriorities = issues
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5)
      .map(i => i.affectedParameter);

    // Record snapshot
    this.recordSnapshot({
      timestamp: new Date().toISOString(),
      phase: "pre",
      material,
      machine,
      tool,
      fixture,
      environment,
      stock,
    });

    return {
      overallRisk,
      riskCategory,
      potentialIssues: issues,
      proceedRecommendation,
      parameterAdjustments,
      monitoringPriorities: [...new Set(monitoringPriorities)],
    };
  }

  /**
   * Predict forces for current cut
   */
  predictForces(
    cuttingParams: {
      Vc: number; // m/min
      fz: number; // mm/tooth
      ap: number; // mm axial depth
      ae: number; // mm radial depth
      D: number; // mm tool diameter
      z: number; // flutes
    },
    materialKc: number, // specific cutting force kc1.1
    mc: number, // Kienzle exponent
    toolCondition: number // 0-100%
  ): AllForces {
    // Kienzle cutting force: Fc = kc1.1 * ap * fz^(1-mc)
    const wearFactor = 1 + (100 - toolCondition) * 0.01; // worn tools require more force
    const h = cuttingParams.fz * Math.sin(Math.acos(1 - 2 * cuttingParams.ae / cuttingParams.D));
    const kc = materialKc * Math.pow(h, -mc) * wearFactor;

    const Fc = kc * cuttingParams.ap * h;
    const Ff = Fc * 0.3; // feed force ~30% of cutting force
    const Fp = Fc * 0.4; // passive force ~40% of cutting force

    // Spindle torque and power
    const n = (cuttingParams.Vc * 1000) / (Math.PI * cuttingParams.D); // RPM
    const torque = (Fc * cuttingParams.D / 2) / 1000; // Nm
    const power = (Fc * cuttingParams.Vc) / 60000; // kW

    const cutting: CuttingForces = {
      Fc,
      Ff,
      Fp,
      torque,
      power,
      specificForce: kc,
      chipThickness: h,
    };

    // Clamping force analysis
    const totalCuttingForce = Math.sqrt(Fc * Fc + Ff * Ff + Fp * Fp);
    const requiredClamping = totalCuttingForce * 2.5; // safety factor

    const clamping: ClampingForces = {
      totalClamping: requiredClamping,
      frictionCoeff: 0.2, // typical steel-on-fixture
      safetyFactor: 2.5,
      partLiftRisk: Fp > requiredClamping * 0.4,
      partShiftRisk: Fc > requiredClamping * 0.3,
      deformationRisk: cuttingParams.ap > 3 ? 0.3 : 0.1,
    };

    // Dynamic forces
    const toolMass = 0.5; // kg estimate
    const omega = (2 * Math.PI * n) / 60;
    const centrifugalForce = toolMass * omega * omega * (cuttingParams.D / 2000);

    const dynamic: DynamicForces = {
      centrifugalForce,
      chipImpact: Fc * 0.05, // chip impact ~5% of cutting force
      coolantPressure: 50, // N (high-pressure coolant)
      gyroscopicMoment: toolMass * omega * 0.01,
      inertialForce: cuttingParams.fz * n / 60 * 10, // simplified
    };

    const totalResultant = Math.sqrt(Fc * Fc + Ff * Ff + Fp * Fp + centrifugalForce * centrifugalForce);
    const directionDegrees = Math.atan2(Fp, Fc) * 180 / Math.PI;
    const forceRatio = Fp / Fc;

    return {
      cutting,
      clamping,
      dynamic,
      totalResultant,
      directionDegrees,
      forceRatio,
    };
  }

  /**
   * Predict thermal evolution during cut
   */
  predictThermalEvolution(
    cuttingPower: number, // kW
    cuttingSpeed: number, // m/min
    material: { meltingPoint: number; thermalConductivity: number },
    coolantType: "flood" | "mist" | "hpc" | "dry" | "cryogenic",
    cutDuration: number // seconds
  ): ThermalEvolution {
    // Heat generation = cutting power (most goes to chip)
    const heatRate = cuttingPower * 1000; // W

    // Heat partition (Boothroyd model approximation)
    const speedFactor = Math.min(1, cuttingSpeed / 300);
    const heatPartitionToChip = 0.6 + 0.2 * speedFactor; // high speed → more into chip
    const heatPartitionToTool = 0.15 - 0.05 * speedFactor;
    const heatPartitionToPart = 1 - heatPartitionToChip - heatPartitionToTool;

    // Coolant effectiveness
    const coolantFactors: Record<typeof coolantType, number> = {
      dry: 1.0,
      mist: 0.7,
      flood: 0.4,
      hpc: 0.25,
      cryogenic: 0.1,
    };
    const coolantFactor = coolantFactors[coolantType];

    // Temperature estimates (simplified)
    const toolTemperature = 200 + (heatPartitionToTool * heatRate / 100) * coolantFactor;
    const chipTemperature = 400 + (heatPartitionToChip * heatRate / 50);
    const partSurfaceTemperature = 25 + (heatPartitionToPart * heatRate / 500) * coolantFactor;

    // Thermal expansion
    const thermalExpansionCoeff = 12; // μm/m/°C (steel)
    const partLength = 100; // mm assumed
    const thermalExpansionPart = (partSurfaceTemperature - 20) * thermalExpansionCoeff * partLength / 1000;
    const thermalExpansionTool = (toolTemperature - 20) * 6 * 50 / 1000; // carbide ~6 μm/m/°C
    const thermalExpansionSpindle = cutDuration / 60 * 2; // ~2 μm/min Z growth

    return {
      toolTemperature,
      toolBulkTemperature: toolTemperature * 0.6,
      chipTemperature,
      partSurfaceTemperature,
      partBulkTemperature: partSurfaceTemperature * 0.3 + 20,
      coolantExitTemperature: 25 + heatRate * 0.001 * (1 - coolantFactor),
      spindleBearingTemperature: 35 + cutDuration / 300,
      thermalExpansionPart,
      thermalExpansionTool,
      thermalExpansionSpindle,
      heatPartitionToTool,
      heatPartitionToChip,
      heatPartitionToPart,
    };
  }

  /**
   * Assess vibration risk and chatter probability
   */
  assessVibrationRisk(
    forces: AllForces,
    spindleSpeed: number, // RPM
    toolGeometry: { diameter: number; overhang: number; flutes: number },
    systemDamping: number // damping ratio (0.01-0.1 typical)
  ): VibrationState {
    // Simplified stability analysis
    const toothPassFreq = (spindleSpeed * toolGeometry.flutes) / 60; // Hz

    // Estimate natural frequencies (simplified cantilever model)
    const E = 600000; // MPa (carbide)
    const I = (Math.PI * Math.pow(toolGeometry.diameter, 4)) / 64;
    const L = toolGeometry.overhang;
    const m = toolGeometry.diameter * toolGeometry.diameter * 0.015 * L / 1000; // kg
    const k = (3 * E * I) / (L * L * L); // N/mm stiffness
    const naturalFreq = Math.sqrt(k * 1000 / m) / (2 * Math.PI); // Hz

    // Stability lobes check
    const harmonics = [1, 2, 3, 4, 5].map(n => n * toothPassFreq);
    const resonanceProximity = Math.min(
      ...harmonics.map(h => Math.abs(h - naturalFreq) / naturalFreq)
    );

    // Chatter probability
    const depthFactor = forces.cutting.chipThickness > 0.2 ? 0.3 : 0;
    const overHangFactor = toolGeometry.overhang / toolGeometry.diameter > 4 ? 0.4 : 0.1;
    const forceFactor = forces.totalResultant > 1000 ? 0.2 : 0;
    const selfExcitedRisk = Math.min(1, depthFactor + overHangFactor + forceFactor + (1 - resonanceProximity) * 0.3);

    // Regenerative stability
    const blim = systemDamping * k / forces.cutting.specificForce;
    const regenerativeStability = forces.cutting.chipThickness < blim ? 0.9 : 0.3;

    let dominantMode: VibrationState["dominantMode"];
    if (selfExcitedRisk < 0.2 && regenerativeStability > 0.7) {
      dominantMode = "stable";
    } else if (selfExcitedRisk < 0.4) {
      dominantMode = "marginal";
    } else if (resonanceProximity < 0.1) {
      dominantMode = "resonance";
    } else {
      dominantMode = "chatter";
    }

    return {
      forcedVibrationAmplitude: forces.totalResultant / k * 1000, // μm
      forcedVibrationFrequency: toothPassFreq,
      selfExcitedRisk,
      regenerativeStability,
      dominantMode,
      damping: systemDamping,
      modalFrequencies: [naturalFreq, naturalFreq * 2.5, naturalFreq * 6.2],
      currentSpindleHarmonics: harmonics,
      resonanceProximity,
    };
  }

  /**
   * Predict post-machining surface integrity
   */
  predictSurfaceIntegrity(
    forces: AllForces,
    thermal: ThermalEvolution,
    vibration: VibrationState,
    feedPerRev: number, // mm/rev
    toolNoseRadius: number // mm
  ): SurfaceIntegrity {
    // Theoretical Ra (Brammertz formula)
    const theoreticalRa = (feedPerRev * feedPerRev) / (8 * toolNoseRadius) * 1000; // μm

    // Adjustments for real conditions
    let actualRa = theoreticalRa;

    // Vibration degrades surface
    actualRa *= 1 + vibration.forcedVibrationAmplitude / 10;
    if (vibration.dominantMode === "chatter") actualRa *= 2;

    // High temperature causes white layer risk
    const whiteLayer = thermal.partSurfaceTemperature > 600;

    // Residual stress type (compressive from mechanical, tensile from thermal)
    const mechanicalStress = forces.cutting.Fc * 0.1; // MPa compressive
    const thermalStress = (thermal.partSurfaceTemperature - 20) * 3; // MPa tensile
    const netStress = thermalStress - mechanicalStress;
    const residualStressType = netStress > 0 ? "tensile" : "compressive";
    const residualStressMagnitude = Math.abs(netStress);

    // Surface hardness change (work hardening from mechanical, softening from thermal)
    const workHardening = forces.cutting.specificForce > 2000 ? 10 : 5; // %
    const thermalSoftening = thermal.partSurfaceTemperature > 400 ? 5 : 0;
    const surfaceHardnessChange = workHardening - thermalSoftening;

    return {
      surfaceRoughnessRa: actualRa,
      surfaceRoughnessRz: actualRa * 4.5,
      residualStressType,
      residualStressMagnitude,
      surfaceHardnessChange,
      whiteLayer,
      microCracks: thermal.partSurfaceTemperature > 700,
      burnMarks: thermal.partSurfaceTemperature > 500,
      tearingMarks: vibration.dominantMode === "chatter",
      feedMarksVisibility: actualRa > 3.2 ? "severe" : actualRa > 1.6 ? "visible" : actualRa > 0.8 ? "light" : "none",
    };
  }

  /**
   * Record process snapshot for learning
   */
  recordSnapshot(snapshot: ProcessSnapshot): void {
    this.processHistory.push(snapshot);
    if (this.processHistory.length > this.maxHistory) {
      this.processHistory.shift();
    }

    // Feed to variability tracking
    if (snapshot.surfaceIntegrity?.surfaceRoughnessRa) {
      variabilitySourceTrackerEngine.recordObservation({
        parameter: "surface_roughness",
        expectedValue: 1.6,
        actualValue: snapshot.surfaceIntegrity.surfaceRoughnessRa,
        context: {
          forces: snapshot.forces?.totalResultant,
          thermal: snapshot.thermal?.partSurfaceTemperature,
          vibration: snapshot.vibration?.dominantMode,
        },
      });
    }
  }

  /**
   * Get comprehensive process recommendation
   */
  getComprehensiveRecommendation(
    targetRa: number,
    targetDimensionalTolerance: number,
    riskTolerance: "conservative" | "normal" | "aggressive"
  ): {
    parameterMultipliers: Record<string, number>;
    monitoringConfig: Record<string, { threshold: number; action: string }>;
    contingencyPlans: Array<{ trigger: string; response: string }>;
  } {
    const riskFactors = {
      conservative: 0.7,
      normal: 1.0,
      aggressive: 1.3,
    };
    const factor = riskFactors[riskTolerance];

    return {
      parameterMultipliers: {
        cutting_speed: factor,
        feed_rate: factor * 0.95,
        depth_of_cut: factor * 0.9,
        stepover: factor * 0.85,
      },
      monitoringConfig: {
        spindle_load: { threshold: 80 * factor, action: "reduce_feed" },
        vibration: { threshold: 2.0 / factor, action: "reduce_speed" },
        tool_wear: { threshold: 60 / factor, action: "tool_change" },
        temperature: { threshold: 400 * factor, action: "increase_coolant" },
      },
      contingencyPlans: [
        { trigger: "chatter_detected", response: "reduce_speed_10%_increase_depth_15%" },
        { trigger: "tool_wear_rapid", response: "reduce_speed_20%_schedule_change" },
        { trigger: "thermal_drift", response: "pause_for_stabilization" },
        { trigger: "surface_degradation", response: "switch_to_finishing_parameters" },
      ],
    };
  }

  /**
   * Get process history for analysis
   */
  getProcessHistory(): ProcessSnapshot[] {
    return [...this.processHistory];
  }
}

export const holisticMachiningIntelligenceEngine = new HolisticMachiningIntelligenceEngine();
