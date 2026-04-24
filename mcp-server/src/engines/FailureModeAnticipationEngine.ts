// Wired: prism_dev.{failure_risk_analyze, failure_modes_list, failure_mode_get, failure_cascade_chain} (devDispatcher.ts). Also consumed by AdaptiveSystemIntegrationEngine.
/**
 * FailureModeAnticipationEngine — Predictive Failure Analysis
 *
 * Phase 0.26: Dynamic Adaptive Machining
 *
 * Anticipates ALL potential failure modes BEFORE they occur, calculating:
 * - Probability of occurrence
 * - Time to failure (if continuing current conditions)
 * - Severity and consequences
 * - Detection methods
 * - Prevention strategies
 * - Recovery actions
 *
 * Failure categories covered:
 * 1. Tool failures (breakage, chipping, rapid wear, BUE)
 * 2. Part failures (scrap, dimensional, surface, deformation)
 * 3. Machine failures (crash, overload, bearing, thermal)
 * 4. Process failures (chatter, chip evacuation, coolant)
 * 5. Fixture failures (slip, part ejection, deformation)
 * 6. Quality failures (out of tolerance, surface, inspection)
 *
 * @module engines/FailureModeAnticipationEngine
 */

import { variabilityEnvelopeEngine } from "./VariabilityEnvelopeEngine.js";
import { contextualBoundaryEngine } from "./ContextualBoundaryEngine.js";

// ============================================================================
// FAILURE MODE DEFINITIONS
// ============================================================================

export type FailureCategory =
  | "tool"
  | "part"
  | "machine"
  | "process"
  | "fixture"
  | "quality";

export type FailureSeverity =
  | "negligible"    // cosmetic only
  | "minor"         // recoverable, minor rework
  | "moderate"      // significant rework
  | "major"         // part scrap
  | "critical"      // machine damage risk
  | "catastrophic"; // safety hazard

export interface FailureMode {
  id: string;
  name: string;
  category: FailureCategory;
  severity: FailureSeverity;
  description: string;
  rootCauses: string[];
  warningIndicators: string[];
  detectionMethods: string[];
  preventionStrategies: string[];
  recoveryActions: string[];
  typicalTimeToFailure?: number; // minutes from onset
  cascadeRisk: string[]; // other failures this can trigger
}

export interface FailurePrediction {
  mode: FailureMode;
  probability: number; // 0-1
  confidence: number; // 0-1
  timeToFailure: number | null; // minutes, null if unpredictable
  triggerConditions: string[];
  currentStatus: "nominal" | "warning" | "critical" | "imminent";
  recommendedAction: string;
  urgency: "none" | "low" | "medium" | "high" | "immediate";
  costIfOccurs: number; // $ estimated
  /** Alias for `mode` used by integration layers (AdaptiveSystemIntegrationEngine). */
  failureMode?: FailureMode;
  /** Short physics-based explanation of why this mode was predicted. Optional — populated when available. */
  physicsRationale?: string;
  /** Alias for `recommendedAction` used by integration layers. */
  mitigation?: string;
}

export interface FailureRiskProfile {
  overallRisk: number; // 0-1
  dominantRisk: FailurePrediction | null;
  predictions: FailurePrediction[];
  immediateActions: string[];
  monitoringPriorities: string[];
  safeOperatingWindow: {
    maxCuttingSpeed: number;
    maxFeedRate: number;
    maxDepthOfCut: number;
    maxSpindleLoad: number;
  };
}

// ============================================================================
// FAILURE MODE LIBRARY
// ============================================================================

const FAILURE_MODES: FailureMode[] = [
  // Tool failures
  {
    id: "tool_breakage",
    name: "Catastrophic Tool Breakage",
    category: "tool",
    severity: "critical",
    description: "Sudden fracture of cutting tool",
    rootCauses: [
      "Excessive cutting forces",
      "Interrupted cut impact",
      "Material hard spots/inclusions",
      "Incorrect tool grade for material",
      "Excessive tool overhang",
      "Worn tool continued past limit",
      "Incorrect speed/feed combination",
    ],
    warningIndicators: [
      "Increasing cutting forces",
      "Unusual vibration patterns",
      "Surface finish degradation",
      "Chip color changes (blue = high temp)",
      "Audible pitch changes",
    ],
    detectionMethods: [
      "Spindle load monitoring",
      "Acoustic emission sensing",
      "Vibration monitoring",
      "Visual inspection",
    ],
    preventionStrategies: [
      "Use appropriate tool grade",
      "Reduce cutting parameters",
      "Add coolant/lubrication",
      "Reduce tool overhang",
      "Replace worn tools proactively",
    ],
    recoveryActions: [
      "EMERGENCY STOP",
      "Inspect part for embedded fragments",
      "Check spindle for damage",
      "Clear broken tool pieces",
      "Re-datum setup if needed",
    ],
    typicalTimeToFailure: 0.1, // sudden
    cascadeRisk: ["part_scrap", "machine_damage", "operator_injury"],
  },
  {
    id: "tool_chipping",
    name: "Cutting Edge Chipping",
    category: "tool",
    severity: "moderate",
    description: "Micro-fractures on cutting edge",
    rootCauses: [
      "Interrupted cuts",
      "Hard material inclusions",
      "Inadequate edge preparation",
      "Thermal shock (coolant intermittent)",
      "Excessive negative rake angle",
    ],
    warningIndicators: [
      "Irregular surface finish",
      "Burr formation increases",
      "Force fluctuations",
    ],
    detectionMethods: [
      "Visual tool inspection",
      "Surface finish measurement",
      "Force monitoring",
    ],
    preventionStrategies: [
      "Select tougher grade",
      "Reduce entry velocity",
      "Consistent coolant application",
      "Increase edge hone",
    ],
    recoveryActions: [
      "Replace insert",
      "Inspect part surface",
      "Adjust parameters for remaining inserts",
    ],
    typicalTimeToFailure: 5,
    cascadeRisk: ["surface_defects", "tool_breakage"],
  },
  {
    id: "rapid_flank_wear",
    name: "Accelerated Flank Wear",
    category: "tool",
    severity: "minor",
    description: "Faster than expected tool wear",
    rootCauses: [
      "Speed too high for material",
      "Abrasive material/scale",
      "Inadequate cooling",
      "Wrong coating",
      "Work-hardened layer",
    ],
    warningIndicators: [
      "Dimension drift positive",
      "Increasing cutting forces",
      "Rising spindle load",
    ],
    detectionMethods: [
      "Tool presetter measurement",
      "In-process gauging",
      "Spindle load trend",
    ],
    preventionStrategies: [
      "Reduce cutting speed",
      "Apply correct coating",
      "Optimize coolant delivery",
    ],
    recoveryActions: [
      "Replace tool",
      "Adjust offset",
      "Verify remaining tool life",
    ],
    typicalTimeToFailure: 15,
    cascadeRisk: ["dimensional_deviation", "surface_defects"],
  },
  {
    id: "built_up_edge",
    name: "Built-Up Edge Formation",
    category: "tool",
    severity: "minor",
    description: "Material adhesion to cutting edge",
    rootCauses: [
      "Speed too low",
      "Gummy/ductile material (aluminum, stainless)",
      "Inadequate chip breaker",
      "Wrong tool geometry",
    ],
    warningIndicators: [
      "Erratic surface finish",
      "Dimension variation",
      "Chips sticking to tool",
    ],
    detectionMethods: [
      "Visual inspection",
      "Surface finish variation",
    ],
    preventionStrategies: [
      "Increase cutting speed",
      "Use sharper edge geometry",
      "Apply appropriate coating (TiN, DLC)",
      "Use high-pressure coolant",
    ],
    recoveryActions: [
      "Remove BUE carefully",
      "Increase speed",
      "Change to polished rake face insert",
    ],
    typicalTimeToFailure: 3,
    cascadeRisk: ["surface_defects", "dimensional_deviation"],
  },

  // Part failures
  {
    id: "part_scrap",
    name: "Part Scrap (Irreparable)",
    category: "part",
    severity: "major",
    description: "Part cannot be recovered",
    rootCauses: [
      "Tool crash",
      "Incorrect program",
      "Wrong offset",
      "Material defect",
      "Fixture failure",
    ],
    warningIndicators: [
      "Large dimension deviation",
      "Excessive material removed",
      "Visible damage",
    ],
    detectionMethods: [
      "In-process measurement",
      "Visual inspection",
      "CMM inspection",
    ],
    preventionStrategies: [
      "Program verification",
      "First piece inspection",
      "Tool length verification",
      "Fixture validation",
    ],
    recoveryActions: [
      "Document failure mode",
      "RCA analysis",
      "Correct root cause",
      "Remake part",
    ],
    cascadeRisk: ["schedule_delay", "cost_overrun"],
  },
  {
    id: "dimensional_deviation",
    name: "Out of Tolerance Dimension",
    category: "part",
    severity: "moderate",
    description: "Critical dimension outside tolerance",
    rootCauses: [
      "Tool wear",
      "Thermal expansion",
      "Deflection",
      "Incorrect offset",
      "Backlash",
    ],
    warningIndicators: [
      "Trend toward tolerance limit",
      "Temperature rising",
      "Tool wear advancing",
    ],
    detectionMethods: [
      "In-process gauging",
      "SPC monitoring",
      "Post-op CMM",
    ],
    preventionStrategies: [
      "Tool wear compensation",
      "Thermal compensation",
      "Spring pass",
      "Rigidity improvement",
    ],
    recoveryActions: [
      "Remeasure carefully",
      "Assess rework possibility",
      "Adjust offset for next part",
    ],
    typicalTimeToFailure: 10,
    cascadeRisk: ["part_scrap", "customer_rejection"],
  },
  {
    id: "surface_defects",
    name: "Unacceptable Surface Finish",
    category: "part",
    severity: "moderate",
    description: "Ra exceeds specification",
    rootCauses: [
      "Chatter/vibration",
      "Tool wear",
      "BUE",
      "Incorrect parameters",
      "Poor chip evacuation",
    ],
    warningIndicators: [
      "Visible surface marks",
      "Audible vibration",
      "Chip morphology change",
    ],
    detectionMethods: [
      "Profilometer measurement",
      "Visual/tactile inspection",
    ],
    preventionStrategies: [
      "Optimize speed/feed",
      "Reduce vibration",
      "Use correct tool radius",
      "Fresh insert for finish pass",
    ],
    recoveryActions: [
      "Light skim pass",
      "Polish if acceptable",
      "Scrap if cannot recover",
    ],
    typicalTimeToFailure: 2,
    cascadeRisk: ["part_scrap", "customer_rejection"],
  },
  {
    id: "part_deformation",
    name: "Part Distortion/Warpage",
    category: "part",
    severity: "moderate",
    description: "Part warps due to stress relief or clamping",
    rootCauses: [
      "Residual stress release",
      "Excessive clamping force",
      "Thermal distortion",
      "Asymmetric material removal",
    ],
    warningIndicators: [
      "Flatness deviation post-unclamp",
      "Spring-back observed",
    ],
    detectionMethods: [
      "Post-unclamp measurement",
      "CMM flatness check",
    ],
    preventionStrategies: [
      "Stress relief heat treatment",
      "Symmetric machining sequence",
      "Reduced clamping force",
      "Multiple setups with relaxation",
    ],
    recoveryActions: [
      "Stress relief + remachine",
      "Straightening operation",
      "Accept with deviation",
    ],
    typicalTimeToFailure: 0, // occurs at unclamp
    cascadeRisk: ["dimensional_deviation"],
  },

  // Machine failures
  {
    id: "machine_crash",
    name: "Collision/Crash",
    category: "machine",
    severity: "catastrophic",
    description: "Tool/spindle collision with part/fixture",
    rootCauses: [
      "Programming error",
      "Wrong offset",
      "Fixture interference",
      "Manual jog error",
      "Work coordinate error",
    ],
    warningIndicators: [
      "Rapid traverse toward obstruction",
      "Unexpected axis movement",
    ],
    detectionMethods: [
      "Collision detection systems",
      "Operator vigilance",
      "Simulation verification",
    ],
    preventionStrategies: [
      "Verify program in simulation",
      "Reduced rapid override for first piece",
      "Safe approach distances",
      "Tool length verification",
    ],
    recoveryActions: [
      "EMERGENCY STOP",
      "Full machine inspection",
      "Spindle runout check",
      "Axis accuracy verification",
    ],
    typicalTimeToFailure: 0.01, // instantaneous
    cascadeRisk: ["spindle_damage", "part_scrap", "operator_injury"],
  },
  {
    id: "spindle_overload",
    name: "Spindle Overload",
    category: "machine",
    severity: "major",
    description: "Spindle motor/drive overloaded",
    rootCauses: [
      "Excessive depth of cut",
      "Wrong material (harder than expected)",
      "Dull tool",
      "Chip packing",
    ],
    warningIndicators: [
      "Spindle load alarm",
      "Motor temperature rising",
      "Speed dropping under load",
    ],
    detectionMethods: [
      "Spindle load monitoring",
      "Current monitoring",
    ],
    preventionStrategies: [
      "Verify material before cut",
      "Monitor load continuously",
      "Limit depth of cut",
    ],
    recoveryActions: [
      "Reduce feed immediately",
      "Check for chip packing",
      "Reduce depth of cut",
    ],
    typicalTimeToFailure: 1,
    cascadeRisk: ["tool_breakage", "spindle_bearing_damage"],
  },
  {
    id: "spindle_bearing_damage",
    name: "Spindle Bearing Damage",
    category: "machine",
    severity: "critical",
    description: "Bearing degradation or failure",
    rootCauses: [
      "Impact loads",
      "Overloading",
      "Contamination",
      "Overheating",
      "Age/wear",
    ],
    warningIndicators: [
      "Increasing runout",
      "Temperature rise",
      "Unusual noise",
      "Vibration increase",
    ],
    detectionMethods: [
      "Vibration analysis",
      "Temperature monitoring",
      "Runout measurement",
    ],
    preventionStrategies: [
      "Avoid side loads",
      "Proper warmup",
      "Regular maintenance",
      "Monitor bearing temperature",
    ],
    recoveryActions: [
      "Schedule spindle rebuild",
      "Reduce parameters until repair",
      "Avoid high-precision work",
    ],
    typicalTimeToFailure: 1000, // hours
    cascadeRisk: ["surface_defects", "dimensional_deviation"],
  },

  // Process failures
  {
    id: "chatter_instability",
    name: "Regenerative Chatter",
    category: "process",
    severity: "moderate",
    description: "Self-excited vibration damaging surface and tool",
    rootCauses: [
      "Insufficient system stiffness",
      "Wrong speed for lobe",
      "Excessive depth of cut",
      "Tool overhang too long",
    ],
    warningIndicators: [
      "Distinctive sound",
      "Surface marks at pitch frequency",
      "Vibration amplitude spike",
    ],
    detectionMethods: [
      "Acoustic monitoring",
      "Accelerometer",
      "Surface inspection",
    ],
    preventionStrategies: [
      "Use stability lobe diagram",
      "Reduce depth or speed",
      "Minimize overhang",
      "Add damping",
    ],
    recoveryActions: [
      "Change speed ±10-20%",
      "Reduce depth of cut",
      "Use variable pitch cutter",
    ],
    typicalTimeToFailure: 0.5,
    cascadeRisk: ["tool_chipping", "surface_defects"],
  },
  {
    id: "chip_evacuation_failure",
    name: "Chip Packing/Recutting",
    category: "process",
    severity: "minor",
    description: "Chips not clearing, causing damage",
    rootCauses: [
      "Inadequate coolant flow",
      "Deep cavity/pocket",
      "Stringy chip material",
      "Insufficient flute space",
    ],
    warningIndicators: [
      "Chip wrapping on tool",
      "Erratic cutting forces",
      "Surface scratches",
    ],
    detectionMethods: [
      "Visual inspection",
      "Force monitoring",
    ],
    preventionStrategies: [
      "Through-spindle coolant",
      "High-pressure coolant",
      "Peck drilling",
      "Chip breaker geometry",
    ],
    recoveryActions: [
      "Clear chips",
      "Increase coolant pressure",
      "Add peck cycle",
    ],
    typicalTimeToFailure: 2,
    cascadeRisk: ["tool_breakage", "surface_defects"],
  },

  // Fixture failures
  {
    id: "part_slip",
    name: "Part Slippage in Fixture",
    category: "fixture",
    severity: "major",
    description: "Part moves during cutting",
    rootCauses: [
      "Insufficient clamping force",
      "Cutting forces exceed friction",
      "Oil/coolant contamination",
      "Worn fixture surfaces",
    ],
    warningIndicators: [
      "Sudden dimension shift",
      "Part rotation visible",
      "Unusual sounds",
    ],
    detectionMethods: [
      "Touch probe verification",
      "Visual inspection",
    ],
    preventionStrategies: [
      "Calculate required clamping",
      "Clean clamping surfaces",
      "Use serrated jaws",
      "Verify before heavy cuts",
    ],
    recoveryActions: [
      "STOP immediately",
      "Re-indicate part",
      "Increase clamping",
      "Verify datum positions",
    ],
    typicalTimeToFailure: 0.5,
    cascadeRisk: ["part_scrap", "tool_breakage", "machine_crash"],
  },
  {
    id: "part_ejection",
    name: "Part Ejection from Chuck",
    category: "fixture",
    severity: "catastrophic",
    description: "Part thrown from rotating workholding",
    rootCauses: [
      "Grossly insufficient clamping",
      "Centrifugal force exceeds grip",
      "Chuck failure",
      "Jaw failure",
    ],
    warningIndicators: [
      "Part wobble",
      "Runout increase",
      "Unusual vibration",
    ],
    detectionMethods: [
      "Clamping force verification",
      "Runout check",
    ],
    preventionStrategies: [
      "Verify clamping pressure",
      "Check chuck/jaw condition",
      "Calculate safe RPM limits",
      "Use soft jaws for grip",
    ],
    recoveryActions: [
      "EMERGENCY STOP",
      "Evacuate area",
      "Full safety inspection",
    ],
    typicalTimeToFailure: 0.01,
    cascadeRisk: ["operator_injury", "machine_damage"],
  },
];

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class FailureModeAnticipationEngine {
  private failureModes: Map<string, FailureMode> = new Map();
  private activeMonitoring: Map<string, FailurePrediction> = new Map();

  constructor() {
    FAILURE_MODES.forEach(fm => this.failureModes.set(fm.id, fm));
  }

  /**
   * Analyze current conditions and predict failure modes
   */
  analyzeFailureRisk(
    conditions: {
      // Tool conditions
      toolWearPercent: number;
      toolOverhangRatio: number;
      toolGradeMatch: number; // 0-1 (1 = perfect for material)

      // Cutting conditions
      cuttingForce: number; // N
      spindleLoad: number; // %
      vibrationLevel: number; // g
      temperature: number; // °C

      // Setup conditions
      clampingForce: number; // N
      cuttingForceRequired: number; // N for friction calc
      fixtureRigidity: number; // 0-1

      // Machine conditions
      machineHours: number;
      spindleCondition: number; // 0-100%
      lastMaintenance: number; // hours ago

      // Material
      materialHardness: number; // HRC
      materialAbrasivity: number; // 0-1

      // Process
      engagementPercent: number; // radial engagement
      depthOfCut: number; // mm
      programVerified: boolean;
    }
  ): FailureRiskProfile {
    const predictions: FailurePrediction[] = [];

    // Analyze each failure mode
    for (const [id, mode] of this.failureModes) {
      const prediction = this.predictFailureMode(mode, conditions);
      if (prediction.probability > 0.05) {
        predictions.push(prediction);
      }
    }

    // Sort by probability * severity
    const severityWeights: Record<FailureSeverity, number> = {
      negligible: 0.1,
      minor: 0.3,
      moderate: 0.5,
      major: 0.7,
      critical: 0.9,
      catastrophic: 1.0,
    };

    predictions.sort((a, b) => {
      const aScore = a.probability * severityWeights[a.mode.severity];
      const bScore = b.probability * severityWeights[b.mode.severity];
      return bScore - aScore;
    });

    // Calculate overall risk
    const overallRisk = Math.min(
      1,
      predictions.reduce((sum, p) => sum + p.probability * severityWeights[p.mode.severity], 0)
    );

    // Immediate actions
    const immediateActions = predictions
      .filter(p => p.urgency === "immediate" || p.urgency === "high")
      .map(p => p.recommendedAction);

    // Monitoring priorities
    const monitoringPriorities = [...new Set(
      predictions.flatMap(p => p.mode.warningIndicators).slice(0, 10)
    )];

    // Safe operating window
    const safeOperatingWindow = this.calculateSafeWindow(conditions, predictions);

    return {
      overallRisk,
      dominantRisk: predictions[0] || null,
      predictions,
      immediateActions,
      monitoringPriorities,
      safeOperatingWindow,
    };
  }

  /**
   * Predict a specific failure mode
   */
  private predictFailureMode(
    mode: FailureMode,
    conditions: Parameters<FailureModeAnticipationEngine["analyzeFailureRisk"]>[0]
  ): FailurePrediction {
    let probability = 0;
    const triggerConditions: string[] = [];

    switch (mode.id) {
      case "tool_breakage":
        if (conditions.toolWearPercent > 80) {
          probability += 0.3;
          triggerConditions.push("Tool wear >80%");
        }
        if (conditions.toolOverhangRatio > 5) {
          probability += 0.25;
          triggerConditions.push("Tool L/D >5");
        }
        if (conditions.spindleLoad > 90) {
          probability += 0.3;
          triggerConditions.push("Spindle load >90%");
        }
        if (conditions.vibrationLevel > 3) {
          probability += 0.2;
          triggerConditions.push("High vibration");
        }
        break;

      case "tool_chipping":
        if (conditions.materialHardness > 50) {
          probability += 0.2;
          triggerConditions.push("Hard material");
        }
        if (conditions.engagementPercent < 0.1) {
          probability += 0.15;
          triggerConditions.push("Interrupted cut");
        }
        if (conditions.toolGradeMatch < 0.5) {
          probability += 0.25;
          triggerConditions.push("Wrong tool grade");
        }
        break;

      case "rapid_flank_wear":
        if (conditions.materialAbrasivity > 0.7) {
          probability += 0.3;
          triggerConditions.push("Abrasive material");
        }
        if (conditions.temperature > 500) {
          probability += 0.2;
          triggerConditions.push("High temperature");
        }
        break;

      case "built_up_edge":
        if (conditions.materialHardness < 25 && conditions.temperature < 200) {
          probability += 0.4;
          triggerConditions.push("Soft material, low speed");
        }
        break;

      case "dimensional_deviation":
        probability += conditions.toolWearPercent * 0.003;
        if (conditions.temperature > 40) {
          probability += (conditions.temperature - 20) * 0.002;
          triggerConditions.push("Thermal expansion");
        }
        break;

      case "surface_defects":
        if (conditions.vibrationLevel > 1) {
          probability += conditions.vibrationLevel * 0.15;
          triggerConditions.push("Vibration present");
        }
        if (conditions.toolWearPercent > 50) {
          probability += 0.2;
          triggerConditions.push("Tool wear >50%");
        }
        break;

      case "part_deformation":
        if (conditions.depthOfCut > 5 && conditions.engagementPercent > 0.5) {
          probability += 0.2;
          triggerConditions.push("Heavy asymmetric cut");
        }
        break;

      case "machine_crash":
        if (!conditions.programVerified) {
          probability += 0.1;
          triggerConditions.push("Program not verified");
        }
        break;

      case "spindle_overload":
        if (conditions.spindleLoad > 85) {
          probability += (conditions.spindleLoad - 85) * 0.05;
          triggerConditions.push("High spindle load");
        }
        break;

      case "spindle_bearing_damage":
        if (conditions.spindleCondition < 60) {
          probability += (60 - conditions.spindleCondition) * 0.01;
          triggerConditions.push("Spindle wear");
        }
        if (conditions.machineHours > 10000) {
          probability += 0.1;
          triggerConditions.push("High machine hours");
        }
        break;

      case "chatter_instability":
        if (conditions.vibrationLevel > 2) {
          probability += 0.5;
          triggerConditions.push("Chatter detected");
        }
        if (conditions.toolOverhangRatio > 4 && conditions.depthOfCut > 2) {
          probability += 0.3;
          triggerConditions.push("Long tool + deep cut");
        }
        break;

      case "chip_evacuation_failure":
        if (conditions.engagementPercent > 0.8 && conditions.depthOfCut > 10) {
          probability += 0.3;
          triggerConditions.push("Deep slotting");
        }
        break;

      case "part_slip":
        const frictionForce = conditions.clampingForce * 0.2;
        if (frictionForce < conditions.cuttingForceRequired * 1.5) {
          probability += 0.4;
          triggerConditions.push("Marginal clamping");
        }
        break;

      case "part_ejection":
        if (conditions.clampingForce < conditions.cuttingForceRequired) {
          probability += 0.6;
          triggerConditions.push("Grossly insufficient clamping");
        }
        break;

      default:
        probability = 0.01; // baseline
    }

    probability = Math.min(1, probability);

    // Determine status and urgency
    let currentStatus: FailurePrediction["currentStatus"];
    let urgency: FailurePrediction["urgency"];

    if (probability < 0.1) {
      currentStatus = "nominal";
      urgency = "none";
    } else if (probability < 0.3) {
      currentStatus = "warning";
      urgency = "low";
    } else if (probability < 0.6) {
      currentStatus = "critical";
      urgency = "medium";
    } else {
      currentStatus = "imminent";
      urgency = mode.severity === "catastrophic" || mode.severity === "critical" ? "immediate" : "high";
    }

    // Estimate time to failure
    let timeToFailure: number | null = null;
    if (mode.typicalTimeToFailure !== undefined && probability > 0.1) {
      timeToFailure = mode.typicalTimeToFailure / probability;
    }

    // Cost estimate
    const costMultipliers: Record<FailureSeverity, number> = {
      negligible: 10,
      minor: 100,
      moderate: 500,
      major: 2000,
      critical: 10000,
      catastrophic: 50000,
    };
    const costIfOccurs = costMultipliers[mode.severity];

    return {
      mode,
      probability,
      confidence: triggerConditions.length > 0 ? 0.7 : 0.3,
      timeToFailure,
      triggerConditions,
      currentStatus,
      recommendedAction: mode.preventionStrategies[0] || "Monitor closely",
      urgency,
      costIfOccurs,
    };
  }

  /**
   * Calculate safe operating window
   */
  private calculateSafeWindow(
    conditions: Parameters<FailureModeAnticipationEngine["analyzeFailureRisk"]>[0],
    predictions: FailurePrediction[]
  ): FailureRiskProfile["safeOperatingWindow"] {
    let maxSpeed = 100;
    let maxFeed = 100;
    let maxDepth = 100;
    let maxLoad = 100;

    for (const pred of predictions) {
      if (pred.probability > 0.3) {
        const reduction = 1 - pred.probability * 0.5;

        if (pred.mode.id === "tool_breakage" || pred.mode.id === "spindle_overload") {
          maxLoad = Math.min(maxLoad, maxLoad * reduction);
          maxDepth = Math.min(maxDepth, maxDepth * reduction);
        }
        if (pred.mode.id === "chatter_instability") {
          maxSpeed = Math.min(maxSpeed, maxSpeed * reduction);
          maxDepth = Math.min(maxDepth, maxDepth * reduction);
        }
        if (pred.mode.id === "rapid_flank_wear") {
          maxSpeed = Math.min(maxSpeed, maxSpeed * reduction);
        }
        if (pred.mode.id === "part_slip") {
          maxFeed = Math.min(maxFeed, maxFeed * reduction);
          maxDepth = Math.min(maxDepth, maxDepth * reduction);
        }
      }
    }

    return {
      maxCuttingSpeed: maxSpeed,
      maxFeedRate: maxFeed,
      maxDepthOfCut: maxDepth,
      maxSpindleLoad: maxLoad,
    };
  }

  /**
   * Get all failure modes
   */
  getFailureModes(): FailureMode[] {
    return [...this.failureModes.values()];
  }

  /**
   * Get specific failure mode
   */
  getFailureMode(id: string): FailureMode | undefined {
    return this.failureModes.get(id);
  }

  /**
   * Get cascade chain for a failure
   */
  getCascadeChain(failureId: string): string[] {
    const visited = new Set<string>();
    const chain: string[] = [];

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      chain.push(id);

      const mode = this.failureModes.get(id);
      if (mode) {
        for (const cascadeId of mode.cascadeRisk) {
          if (this.failureModes.has(cascadeId)) {
            traverse(cascadeId);
          }
        }
      }
    };

    traverse(failureId);
    return chain;
  }
}

export const failureModeAnticipationEngine = new FailureModeAnticipationEngine();
