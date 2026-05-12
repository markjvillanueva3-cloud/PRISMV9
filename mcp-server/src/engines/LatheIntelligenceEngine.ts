/**
 * LatheIntelligenceEngine — AI Reasoning for CNC Lathe Operations
 * ================================================================
 * Provides intelligent decision-making and reasoning for:
 *   1. Hard coding vs macro programming decisions
 *   2. Live tooling operation planning and optimization
 *   3. Multi-turret synchronization with safety analysis
 *   4. Swiss-type machining decisions and guide bushing selection
 *   5. Mill-turn process planning and channel optimization
 *
 * Composes underlying engines with AI reasoning:
 *   - ChainOfThoughtEngine for step-by-step reasoning
 *   - DecisionReasoningEngine for multi-criteria selection
 *   - DiagnosticReasoningEngine for safety analysis
 *   - LearningAdaptationEngine for shop-specific calibration
 *
 * @module engines/LatheIntelligenceEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import {
  ChainOfThoughtEngine,
  ReasoningProblem,
} from "./ChainOfThoughtEngine.js";
import {
  DecisionReasoningEngine,
  DecisionProblem,
  DecisionCriterion,
  DecisionCandidate,
} from "./DecisionReasoningEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Lathe operation type */
export type LatheOperationType =
  | "facing"
  | "turning_od"
  | "turning_id"
  | "grooving"
  | "threading"
  | "drilling"
  | "boring"
  | "parting"
  | "tapping"
  | "knurling"
  | "live_milling"
  | "live_drilling"
  | "c_axis_contour"
  | "y_axis_mill";

/** Machine configuration */
export interface LatheMachineConfig {
  machine_id: string;
  machine_type: "2_axis" | "y_axis" | "mill_turn" | "swiss" | "multi_turret";
  has_live_tooling: boolean;
  has_sub_spindle: boolean;
  has_y_axis: boolean;
  has_c_axis: boolean;
  has_b_axis: boolean;
  turret_count: 1 | 2;
  main_spindle_hp: number;
  sub_spindle_hp?: number;
  live_tool_rpm_max?: number;
  live_tool_hp?: number;
  bar_capacity_mm?: number;
  guide_bushing?: boolean;
  controller: "fanuc" | "okuma" | "mazak" | "haas" | "siemens" | "mitsubishi";
}

/** Part characteristics */
export interface LathePartProfile {
  part_id: string;
  material: string;
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  max_od_mm: number;
  min_id_mm?: number;
  length_mm: number;
  lot_size: number;
  tolerance_class: "standard" | "precision" | "ultra_precision";
  has_threads: boolean;
  has_grooves: boolean;
  has_cross_holes: boolean;
  has_flats: boolean;
  has_keyways: boolean;
  has_polygons: boolean;
  surface_finish_ra?: number;
  concentricity_mm?: number;
}

/** Macro vs hard coding recommendation */
export interface MacroRecommendation {
  use_macro: boolean;
  macro_type?: "parametric" | "pattern" | "family" | "calculation";
  reasoning: string[];
  complexity_score: number;  // 1-10
  maintenance_benefit: number;  // 1-10
  flexibility_benefit: number;  // 1-10
  risk_factors: string[];
  suggested_variables?: string[];
  estimated_time_savings_pct?: number;
}

/** Live tooling recommendation */
export interface LiveToolingRecommendation {
  recommended_approach: "c_axis" | "y_axis" | "index_only" | "avoid_live";
  operations: Array<{
    operation: string;
    tool_type: string;
    approach: string;
    rpm: number;
    feed_mm_min: number;
    power_required_kw: number;
    cycle_time_sec: number;
  }>;
  total_cycle_time_sec: number;
  power_utilization_pct: number;
  reasoning: string[];
  warnings: string[];
  alternatives?: string[];
}

/** Multi-turret safety analysis */
export interface MultiTurretSafetyAnalysis {
  safe_to_run_simultaneous: boolean;
  collision_risk_level: "none" | "low" | "medium" | "high" | "critical";
  collision_zones: Array<{
    zone_id: string;
    description: string;
    risk_level: string;
    mitigation: string;
  }>;
  sync_points_required: Array<{
    position: string;
    reason: string;
    code: string;
  }>;
  time_savings_pct: number;
  safety_recommendations: string[];
  optimized_sequence?: string[];
}

/** Swiss-type decision */
export interface SwissTypeDecision {
  recommended: boolean;
  guide_bushing_required: boolean;
  reasons: string[];
  part_suitability_score: number;  // 0-100
  slenderness_ratio: number;
  deflection_risk: "low" | "medium" | "high";
  recommended_bushing_type?: "standard" | "carbide" | "rotary";
  alternative_approaches?: string[];
}

/** Mill-turn planning result */
export interface MillTurnPlan {
  channel_count: number;
  channels: Array<{
    channel_id: string;
    spindle: "main" | "sub";
    operations: string[];
    cycle_time_sec: number;
  }>;
  sync_points: Array<{
    code: string;
    channels: string[];
    reason: string;
  }>;
  critical_path_sec: number;
  parallel_efficiency_pct: number;
  transfer_strategy?: "synchronized" | "stop_transfer" | "speed_match";
  back_working_ops?: string[];
  recommendations: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class LatheIntelligenceEngine {
  /**
   * Decide whether to use macros or hard-coded G-code
   */
  static decideMacroVsHardCode(
    part: LathePartProfile,
    machine: LatheMachineConfig,
    operationContext: {
      family_parts_count?: number;
      similar_features_count?: number;
      operator_skill_level?: "beginner" | "intermediate" | "expert";
      production_urgency?: "low" | "normal" | "high";
      expected_revisions?: number;
    }
  ): MacroRecommendation {
    log.info("[LatheIntelligence] Deciding macro vs hard code");

    // Build reasoning problem
    const problem: ReasoningProblem = {
      problem: "Decide whether to use parametric macros or hard-coded G-code",
      goal: "Optimize for maintainability, flexibility, and production efficiency",
      known_facts: [
        `Part family count: ${operationContext.family_parts_count ?? 1}`,
        `Similar features: ${operationContext.similar_features_count ?? 0}`,
        `Lot size: ${part.lot_size}`,
        `Controller: ${machine.controller}`,
        `Operator skill: ${operationContext.operator_skill_level ?? "intermediate"}`,
        `Expected revisions: ${operationContext.expected_revisions ?? 0}`,
        `Has threads: ${part.has_threads}`,
        `Has grooves: ${part.has_grooves}`,
      ],
      constraints: [
        "Macros require operator understanding for setup",
        "Hard code is faster for one-off parts",
        "Macros excel for families with dimensional variations",
      ],
      context: { part, machine, operationContext },
      max_steps: 8,
      confidence_threshold: 0.7,
    };

    const reasoning = ChainOfThoughtEngine.reason(problem);

    // Decision factors
    const familySize = operationContext.family_parts_count ?? 1;
    const similarFeatures = operationContext.similar_features_count ?? 0;
    const lotSize = part.lot_size;
    const expectedRevisions = operationContext.expected_revisions ?? 0;
    const operatorSkill = operationContext.operator_skill_level ?? "intermediate";

    // Score calculation
    let macroScore = 0;
    const reasons: string[] = [];
    const risks: string[] = [];
    const suggestedVars: string[] = [];

    // Family parts benefit
    if (familySize > 3) {
      macroScore += 3;
      reasons.push(`Part family has ${familySize} variants — macros enable single program`);
      suggestedVars.push("PART_LENGTH", "PART_OD", "PART_ID");
    } else if (familySize > 1) {
      macroScore += 1;
      reasons.push(`Small family (${familySize} parts) — moderate macro benefit`);
    }

    // Similar features benefit
    if (similarFeatures > 5) {
      macroScore += 2;
      reasons.push(`${similarFeatures} similar features — subprogram/macro reduces code`);
      suggestedVars.push("FEATURE_DEPTH", "FEATURE_DIA");
    }

    // Lot size consideration
    if (lotSize < 10 && familySize === 1) {
      macroScore -= 2;
      reasons.push(`Small lot (${lotSize}) with no family — hard code is faster`);
    } else if (lotSize > 100) {
      macroScore += 1;
      reasons.push(`Large lot (${lotSize}) — macro debugging time amortizes well`);
    }

    // Revision expectation
    if (expectedRevisions > 2) {
      macroScore += 2;
      reasons.push(`Expected ${expectedRevisions} revisions — parametric changes are easier`);
    }

    // Operator skill consideration
    if (operatorSkill === "beginner") {
      macroScore -= 1;
      risks.push("Beginner operators may struggle with macro variable setup");
    } else if (operatorSkill === "expert") {
      macroScore += 1;
      reasons.push("Expert operators can leverage advanced macro features");
    }

    // Thread patterns
    if (part.has_threads && familySize > 1) {
      macroScore += 1;
      reasons.push("Thread parameters benefit from macro variables");
      suggestedVars.push("THREAD_PITCH", "THREAD_DEPTH", "THREAD_LENGTH");
    }

    // Groove patterns
    if (part.has_grooves && similarFeatures > 3) {
      macroScore += 1;
      reasons.push("Repeating groove patterns ideal for macro loops");
      suggestedVars.push("GROOVE_WIDTH", "GROOVE_DEPTH", "GROOVE_SPACING");
    }

    // Controller capability
    const advancedControllers = ["fanuc", "okuma", "mazak", "siemens"];
    if (!advancedControllers.includes(machine.controller)) {
      macroScore -= 1;
      risks.push(`${machine.controller} has limited macro capabilities`);
    }

    // Production urgency
    if (operationContext.production_urgency === "high") {
      macroScore -= 1;
      risks.push("High urgency — hard code may be faster to deploy");
    }

    const useMacro = macroScore >= 2;
    const complexityScore = Math.min(10, Math.max(1, 5 + macroScore));
    const maintenanceBenefit = useMacro ? Math.min(10, 5 + familySize) : 3;
    const flexibilityBenefit = useMacro ? Math.min(10, 5 + expectedRevisions * 2) : 2;

    // Determine macro type
    let macroType: MacroRecommendation["macro_type"];
    if (useMacro) {
      if (familySize > 3) macroType = "family";
      else if (similarFeatures > 5) macroType = "pattern";
      else if (part.has_threads || part.has_grooves) macroType = "calculation";
      else macroType = "parametric";
    }

    // Estimate time savings
    const timeSavings = useMacro && familySize > 1
      ? Math.min(50, 10 + (familySize - 1) * 8 + expectedRevisions * 5)
      : 0;

    return {
      use_macro: useMacro,
      macro_type: macroType,
      reasoning: reasons,
      complexity_score: complexityScore,
      maintenance_benefit: maintenanceBenefit,
      flexibility_benefit: flexibilityBenefit,
      risk_factors: risks,
      suggested_variables: useMacro ? suggestedVars : undefined,
      estimated_time_savings_pct: timeSavings > 0 ? timeSavings : undefined,
    };
  }

  /**
   * Plan live tooling operations
   */
  static planLiveTooling(
    part: LathePartProfile,
    machine: LatheMachineConfig,
    requiredOperations: Array<{
      type: "cross_hole" | "axial_hole" | "flat" | "keyway" | "contour" | "thread_mill";
      diameter_mm?: number;
      depth_mm: number;
      count?: number;
      angular_position_deg?: number;
      surface_finish_ra?: number;
    }>
  ): LiveToolingRecommendation {
    log.info("[LatheIntelligence] Planning live tooling operations");

    if (!machine.has_live_tooling) {
      return {
        recommended_approach: "avoid_live",
        operations: [],
        total_cycle_time_sec: 0,
        power_utilization_pct: 0,
        reasoning: ["Machine does not have live tooling capability"],
        warnings: ["Operations require secondary machining on mill"],
        alternatives: ["Transfer to VMC for cross-holes and flats"],
      };
    }

    const operations: LiveToolingRecommendation["operations"] = [];
    const reasoning: string[] = [];
    const warnings: string[] = [];
    let totalCycleTime = 0;
    let maxPowerRequired = 0;

    // Determine best approach
    let approach: "c_axis" | "y_axis" | "index_only" = "index_only";

    if (machine.has_y_axis) {
      approach = "y_axis";
      reasoning.push("Y-axis available — enables true milling paths and off-center features");
    } else if (machine.has_c_axis) {
      approach = "c_axis";
      reasoning.push("C-axis available — enables polar interpolation for contours");
    } else {
      reasoning.push("Index-only mode — features limited to radial positions");
    }

    // Kienzle constants for power estimation (simplified)
    const kc1_1 = part.iso_group === "N" ? 700 : part.iso_group === "S" ? 2800 : 1800;

    for (const op of requiredOperations) {
      const toolDia = op.diameter_mm ?? 10;
      const depth = op.depth_mm;
      const count = op.count ?? 1;

      // Calculate parameters based on operation type
      let rpm = Math.min(machine.live_tool_rpm_max ?? 6000, Math.round(80 * 1000 / (Math.PI * toolDia)));
      let feedPerTooth = part.iso_group === "N" ? 0.08 : part.iso_group === "S" ? 0.04 : 0.06;
      let flutes = op.type.includes("drill") ? 2 : 4;
      let feedRate = rpm * feedPerTooth * flutes;
      let powerKw = (kc1_1 * depth * feedPerTooth * feedRate) / (60 * 1e6);

      // Cycle time estimation
      let cycleTimePer = op.type.includes("drill")
        ? (depth / feedRate) * 60 + 2  // drilling + retract
        : op.type === "flat"
        ? (depth / feedRate) * 60 * 2 + 3  // face mill + positioning
        : (depth / feedRate) * 60 + 5;  // other operations

      const totalOpTime = cycleTimePer * count;
      totalCycleTime += totalOpTime;
      maxPowerRequired = Math.max(maxPowerRequired, powerKw);

      let opApproach = approach;
      if (op.type === "keyway" && !machine.has_y_axis) {
        opApproach = "c_axis";
        warnings.push(`Keyway requires Y-axis for best results — using C-axis workaround`);
      }

      operations.push({
        operation: op.type,
        tool_type: op.type.includes("drill") ? "drill" : op.type === "thread_mill" ? "thread_mill" : "end_mill",
        approach: opApproach,
        rpm,
        feed_mm_min: feedRate,
        power_required_kw: powerKw,
        cycle_time_sec: totalOpTime,
      });

      // Add approach-specific notes
      if (op.type === "contour" && !machine.has_y_axis) {
        warnings.push("Complex contours with C-axis only may have surface finish limitations");
      }
    }

    // Check power utilization
    const liveToolPower = machine.live_tool_hp ?? 5;
    const powerUtilization = (maxPowerRequired / (liveToolPower * 0.746)) * 100;

    if (powerUtilization > 80) {
      warnings.push(`High power utilization (${powerUtilization.toFixed(0)}%) — consider reducing feeds`);
    }

    // Surface finish considerations
    const precisionOps = requiredOperations.filter(op => op.surface_finish_ra && op.surface_finish_ra < 1.6);
    if (precisionOps.length > 0 && !machine.has_y_axis) {
      warnings.push("Precision surface finish requested — Y-axis would provide better results");
    }

    // Recommendations for efficiency
    if (requiredOperations.some(op => op.count && op.count > 4)) {
      reasoning.push("Multiple similar features — consider pattern programming for efficiency");
    }

    return {
      recommended_approach: approach,
      operations,
      total_cycle_time_sec: totalCycleTime,
      power_utilization_pct: Math.min(100, powerUtilization),
      reasoning,
      warnings,
      alternatives: approach === "index_only"
        ? ["Consider Y-axis machine for complex features", "Secondary operation on VMC"]
        : undefined,
    };
  }

  /**
   * Analyze multi-turret safety and optimization
   */
  static analyzeMultiTurret(
    machine: LatheMachineConfig,
    operations: Array<{
      turret: 1 | 2;
      operation: string;
      z_start_mm: number;
      z_end_mm: number;
      x_position_mm: number;
      tool_length_mm: number;
      duration_sec: number;
    }>
  ): MultiTurretSafetyAnalysis {
    log.info("[LatheIntelligence] Analyzing multi-turret safety");

    if (machine.turret_count === 1) {
      return {
        safe_to_run_simultaneous: false,
        collision_risk_level: "none",
        collision_zones: [],
        sync_points_required: [],
        time_savings_pct: 0,
        safety_recommendations: ["Single turret machine — no multi-turret analysis needed"],
      };
    }

    const t1Ops = operations.filter(op => op.turret === 1);
    const t2Ops = operations.filter(op => op.turret === 2);

    const collisionZones: MultiTurretSafetyAnalysis["collision_zones"] = [];
    const syncPoints: MultiTurretSafetyAnalysis["sync_points_required"] = [];
    const recommendations: string[] = [];

    // Analyze each T1 operation against T2 operations for overlap
    let highestRisk: "none" | "low" | "medium" | "high" | "critical" = "none";

    for (const op1 of t1Ops) {
      for (const op2 of t2Ops) {
        // Check Z-axis overlap
        const zOverlap = !(op1.z_end_mm < op2.z_start_mm || op2.z_end_mm < op1.z_start_mm);

        // Check X proximity (danger zone typically within 50mm)
        const xProximity = Math.abs(op1.x_position_mm - op2.x_position_mm);
        const toolClearance = xProximity - op1.tool_length_mm - op2.tool_length_mm;

        if (zOverlap && toolClearance < 10) {
          // Collision zone detected
          const risk = toolClearance < 0 ? "critical" : toolClearance < 5 ? "high" : "medium";

          if (risk === "critical" || (risk === "high" && highestRisk !== "critical")) {
            highestRisk = risk;
          } else if (risk === "medium" && highestRisk === "none") {
            highestRisk = risk;
          }

          collisionZones.push({
            zone_id: `Z${op1.z_start_mm}-${op1.z_end_mm}`,
            description: `T1(${op1.operation}) and T2(${op2.operation}) overlap in Z`,
            risk_level: risk,
            mitigation: risk === "critical"
              ? "MUST sequence operations — cannot run simultaneously"
              : `Add wait code at Z=${Math.max(op1.z_start_mm, op2.z_start_mm)}`,
          });

          // Add sync point if needed
          if (risk !== "none") {
            const waitZ = Math.max(op1.z_start_mm, op2.z_start_mm) + 5;
            syncPoints.push({
              position: `Z${waitZ}`,
              reason: `Prevent collision between ${op1.operation} and ${op2.operation}`,
              code: machine.controller === "fanuc" ? "M200" :
                    machine.controller === "okuma" ? "!L" :
                    machine.controller === "mazak" ? "!WAIT" : "M200",
            });
          }
        }
      }
    }

    // Calculate potential time savings
    const t1TotalTime = t1Ops.reduce((sum, op) => sum + op.duration_sec, 0);
    const t2TotalTime = t2Ops.reduce((sum, op) => sum + op.duration_sec, 0);
    const sequentialTime = t1TotalTime + t2TotalTime;

    // Estimate parallel time (conservative — subtract overlap time)
    const nonOverlapOps = operations.filter(op => {
      return !collisionZones.some(zone =>
        op.z_start_mm <= parseFloat(zone.zone_id.split("-")[1]) &&
        op.z_end_mm >= parseFloat(zone.zone_id.split("-")[0].replace("Z", ""))
      );
    });
    const parallelTime = Math.max(t1TotalTime, t2TotalTime) +
      collisionZones.filter(z => z.risk_level === "critical").length * 5;  // 5s per forced sequence

    const timeSavings = sequentialTime > 0
      ? ((sequentialTime - parallelTime) / sequentialTime) * 100
      : 0;

    // Safety recommendations
    if (highestRisk === "critical") {
      recommendations.push("CRITICAL: Some operations MUST be sequenced to prevent collision");
      recommendations.push("Review tool lengths and ensure accurate tool offsets");
    }
    if (highestRisk === "high" || highestRisk === "medium") {
      recommendations.push("Add turret sync codes at collision zone boundaries");
      recommendations.push("Consider softer approach speeds when turrets are proximate");
    }
    if (collisionZones.length === 0) {
      recommendations.push("No collision zones detected — safe for simultaneous operation");
      recommendations.push("Verify tool offsets before first run");
    }

    // Add general multi-turret best practices
    recommendations.push("Always run at reduced feedrate (50%) during first article");
    recommendations.push("Verify sync codes execute correctly in simulation mode");

    return {
      safe_to_run_simultaneous: highestRisk !== "critical",
      collision_risk_level: highestRisk,
      collision_zones: collisionZones,
      sync_points_required: syncPoints,
      time_savings_pct: Math.max(0, timeSavings),
      safety_recommendations: recommendations,
      optimized_sequence: highestRisk === "critical"
        ? t1Ops.map(o => `T1:${o.operation}`).concat(t2Ops.map(o => `T2:${o.operation}`))
        : undefined,
    };
  }

  /**
   * Decide if Swiss-type machining is appropriate
   */
  static decideSwissType(
    part: LathePartProfile,
    availableMachines: Array<{
      id: string;
      type: "conventional" | "swiss";
      bar_capacity_mm: number;
      guide_bushing: boolean;
      accuracy_mm: number;
    }>
  ): SwissTypeDecision {
    log.info("[LatheIntelligence] Evaluating Swiss-type suitability");

    // Calculate slenderness ratio (L/D)
    const slendernessRatio = part.length_mm / part.max_od_mm;

    // Deflection risk assessment
    // Swiss threshold is typically L/D > 3-4 for unsupported, or precision requirements
    let deflectionRisk: "low" | "medium" | "high" = "low";
    if (slendernessRatio > 6) {
      deflectionRisk = "high";
    } else if (slendernessRatio > 4) {
      deflectionRisk = "medium";
    }

    const reasons: string[] = [];
    let suitabilityScore = 50;  // Start neutral

    // Slenderness ratio assessment
    if (slendernessRatio > 4) {
      suitabilityScore += 20;
      reasons.push(`High L/D ratio (${slendernessRatio.toFixed(1)}) — Swiss provides support`);
    } else if (slendernessRatio > 3) {
      suitabilityScore += 10;
      reasons.push(`Moderate L/D ratio (${slendernessRatio.toFixed(1)}) — Swiss beneficial`);
    } else {
      suitabilityScore -= 10;
      reasons.push(`Low L/D ratio (${slendernessRatio.toFixed(1)}) — conventional lathe sufficient`);
    }

    // Tolerance class
    if (part.tolerance_class === "ultra_precision") {
      suitabilityScore += 15;
      reasons.push("Ultra-precision tolerance — Swiss guide bushing provides stability");
    } else if (part.tolerance_class === "precision") {
      suitabilityScore += 5;
      reasons.push("Precision tolerance — Swiss may improve consistency");
    }

    // Concentricity requirement
    if (part.concentricity_mm && part.concentricity_mm < 0.02) {
      suitabilityScore += 15;
      reasons.push(`Tight concentricity (${part.concentricity_mm}mm) — guide bushing critical`);
    }

    // Surface finish
    if (part.surface_finish_ra && part.surface_finish_ra < 0.8) {
      suitabilityScore += 10;
      reasons.push(`Fine surface finish (Ra ${part.surface_finish_ra}) — Swiss chatter-free cuts`);
    }

    // Material consideration
    if (part.iso_group === "S" || part.iso_group === "M") {
      suitabilityScore += 5;
      reasons.push("Difficult material — Swiss enables aggressive cutting with support");
    }

    // Bar stock diameter
    const swissMachines = availableMachines.filter(m => m.type === "swiss");
    const conventionalMachines = availableMachines.filter(m => m.type === "conventional");

    const swissCapable = swissMachines.some(m => m.bar_capacity_mm >= part.max_od_mm);
    if (!swissCapable && swissMachines.length > 0) {
      suitabilityScore -= 30;
      reasons.push(`Part OD (${part.max_od_mm}mm) exceeds Swiss bar capacity`);
    }

    // Lot size consideration
    if (part.lot_size < 50) {
      suitabilityScore -= 5;
      reasons.push("Small lot — Swiss setup time may not be justified");
    } else if (part.lot_size > 500) {
      suitabilityScore += 5;
      reasons.push("Large lot — Swiss efficiency compounds");
    }

    // Determine guide bushing requirement
    const guideBushingRequired = slendernessRatio > 4 ||
      (part.tolerance_class === "ultra_precision") ||
      (part.concentricity_mm && part.concentricity_mm < 0.02);

    // Bushing type recommendation
    let bushingType: "standard" | "carbide" | "rotary" | undefined;
    if (guideBushingRequired) {
      if (part.iso_group === "S" || part.iso_group === "H") {
        bushingType = "carbide";
        reasons.push("Hard/abrasive material — carbide bushing recommended");
      } else if (part.has_polygons || part.has_keyways) {
        bushingType = "rotary";
        reasons.push("Non-round features — rotary bushing for C-axis work");
      } else {
        bushingType = "standard";
      }
    }

    // Alternative approaches if Swiss not recommended
    const alternatives: string[] = [];
    if (suitabilityScore < 60) {
      if (deflectionRisk === "high") {
        alternatives.push("Use tailstock support on conventional lathe");
        alternatives.push("Consider steady rest for long parts");
      }
      alternatives.push("Conventional lathe with light cuts may suffice");
    }

    return {
      recommended: suitabilityScore >= 60,
      guide_bushing_required: guideBushingRequired,
      reasons,
      part_suitability_score: Math.min(100, Math.max(0, suitabilityScore)),
      slenderness_ratio: slendernessRatio,
      deflection_risk: deflectionRisk,
      recommended_bushing_type: bushingType,
      alternative_approaches: alternatives.length > 0 ? alternatives : undefined,
    };
  }

  /**
   * Plan mill-turn operation sequence
   */
  static planMillTurn(
    part: LathePartProfile,
    machine: LatheMachineConfig,
    operations: Array<{
      type: LatheOperationType;
      description: string;
      spindle_preference?: "main" | "sub" | "either";
      estimated_time_sec: number;
      z_range?: [number, number];
      requires_transfer?: boolean;
    }>
  ): MillTurnPlan {
    log.info("[LatheIntelligence] Planning mill-turn sequence");

    const channels: MillTurnPlan["channels"] = [];
    const syncPoints: MillTurnPlan["sync_points"] = [];
    const recommendations: string[] = [];

    // Separate operations by spindle
    const mainOps = operations.filter(op =>
      op.spindle_preference === "main" || op.spindle_preference === "either"
    );
    const subOps = operations.filter(op =>
      op.spindle_preference === "sub" || op.requires_transfer
    );

    // Check if sub-spindle is available
    if (!machine.has_sub_spindle && subOps.length > 0) {
      recommendations.push("WARNING: Sub-spindle operations requested but machine has no sub-spindle");
      recommendations.push("Consider: Op1/Op2 flip workflow or transfer to second machine");
    }

    // Build main spindle channel
    const mainChannel: MillTurnPlan["channels"][0] = {
      channel_id: "CH1",
      spindle: "main",
      operations: mainOps.map(op => op.description),
      cycle_time_sec: mainOps.reduce((sum, op) => sum + op.estimated_time_sec, 0),
    };
    channels.push(mainChannel);

    // Build sub-spindle channel if applicable
    let subChannel: MillTurnPlan["channels"][0] | null = null;
    let backWorkingOps: string[] = [];

    if (machine.has_sub_spindle && subOps.length > 0) {
      // Identify back-working operations (machining after transfer)
      backWorkingOps = subOps
        .filter(op => op.requires_transfer)
        .map(op => op.description);

      subChannel = {
        channel_id: "CH2",
        spindle: "sub",
        operations: subOps.map(op => op.description),
        cycle_time_sec: subOps.reduce((sum, op) => sum + op.estimated_time_sec, 0),
      };
      channels.push(subChannel);

      // Add transfer sync point
      const transferOp = operations.find(op => op.requires_transfer);
      if (transferOp) {
        const syncCode = machine.controller === "fanuc" ? "M200/M201" :
                        machine.controller === "okuma" ? "!L1/!L2" :
                        machine.controller === "mazak" ? "!WAIT1/!WAIT2" : "M200/M201";

        syncPoints.push({
          code: syncCode,
          channels: ["CH1", "CH2"],
          reason: "Part transfer from main to sub-spindle",
        });
      }
    }

    // Determine transfer strategy
    let transferStrategy: "synchronized" | "stop_transfer" | "speed_match" | undefined;
    if (machine.has_sub_spindle && subOps.some(op => op.requires_transfer)) {
      if (part.tolerance_class === "ultra_precision") {
        transferStrategy = "synchronized";
        recommendations.push("Synchronized transfer for concentricity preservation");
      } else if (part.max_od_mm > 50) {
        transferStrategy = "stop_transfer";
        recommendations.push("Stop transfer for large diameter — safer grip");
      } else {
        transferStrategy = "speed_match";
        recommendations.push("Speed-match transfer for cycle time efficiency");
      }
    }

    // Calculate critical path and efficiency
    const mainTime = mainChannel.cycle_time_sec;
    const subTime = subChannel?.cycle_time_sec ?? 0;
    const sequentialTime = mainTime + subTime;
    const criticalPath = Math.max(mainTime, subTime);
    const parallelEfficiency = sequentialTime > 0
      ? ((sequentialTime - criticalPath) / sequentialTime) * 100
      : 0;

    // Add efficiency recommendations
    if (parallelEfficiency < 20 && machine.has_sub_spindle) {
      recommendations.push("Low parallel efficiency — consider rebalancing operations between spindles");
    }

    // Live tooling recommendations
    const liveOps = operations.filter(op =>
      op.type === "live_milling" || op.type === "live_drilling" ||
      op.type === "c_axis_contour" || op.type === "y_axis_mill"
    );
    if (liveOps.length > 0 && machine.has_live_tooling) {
      recommendations.push(`${liveOps.length} live tooling operations — verify power/RPM limits`);

      if (machine.has_y_axis) {
        recommendations.push("Y-axis available — use for complex milling paths");
      } else if (machine.has_c_axis) {
        recommendations.push("C-axis only — polar interpolation for contours");
      }
    }

    // Add sync points for live tooling during main spindle ops
    if (liveOps.length > 0) {
      syncPoints.push({
        code: machine.controller === "fanuc" ? "M19" : machine.controller === "okuma" ? "M119" : "M19",
        channels: ["CH1"],
        reason: "Spindle orient for live tooling",
      });
    }

    return {
      channel_count: channels.length,
      channels,
      sync_points: syncPoints,
      critical_path_sec: criticalPath,
      parallel_efficiency_pct: parallelEfficiency,
      transfer_strategy: transferStrategy,
      back_working_ops: backWorkingOps.length > 0 ? backWorkingOps : undefined,
      recommendations,
    };
  }

  /**
   * Get comprehensive lathe intelligence for a part
   */
  static analyzeComplete(
    part: LathePartProfile,
    machine: LatheMachineConfig,
    operationContext: {
      family_parts_count?: number;
      similar_features_count?: number;
      operator_skill_level?: "beginner" | "intermediate" | "expert";
      operations?: Array<{
        type: LatheOperationType;
        description: string;
        spindle_preference?: "main" | "sub" | "either";
        estimated_time_sec: number;
        requires_transfer?: boolean;
      }>;
    }
  ): {
    macro_decision: MacroRecommendation;
    swiss_decision?: SwissTypeDecision;
    mill_turn_plan?: MillTurnPlan;
    summary: string[];
  } {
    log.info("[LatheIntelligence] Running complete analysis");

    const macroDecision = this.decideMacroVsHardCode(part, machine, operationContext);

    let swissDecision: SwissTypeDecision | undefined;
    if (machine.machine_type === "swiss" || part.length_mm / part.max_od_mm > 3) {
      swissDecision = this.decideSwissType(part, [
        { id: machine.machine_id, type: machine.machine_type === "swiss" ? "swiss" : "conventional",
          bar_capacity_mm: machine.bar_capacity_mm ?? 65, guide_bushing: machine.guide_bushing ?? false,
          accuracy_mm: 0.005 }
      ]);
    }

    let millTurnPlan: MillTurnPlan | undefined;
    if ((machine.machine_type === "mill_turn" || machine.has_live_tooling) && operationContext.operations) {
      millTurnPlan = this.planMillTurn(part, machine, operationContext.operations);
    }

    const summary: string[] = [];
    summary.push(`Programming: ${macroDecision.use_macro ? `Use ${macroDecision.macro_type} macro` : "Hard code"}`);
    if (swissDecision) {
      summary.push(`Swiss: ${swissDecision.recommended ? "Recommended" : "Not required"} (L/D=${swissDecision.slenderness_ratio.toFixed(1)})`);
    }
    if (millTurnPlan) {
      summary.push(`Mill-turn: ${millTurnPlan.channel_count} channels, ${millTurnPlan.parallel_efficiency_pct.toFixed(0)}% parallel efficiency`);
    }

    return {
      macro_decision: macroDecision,
      swiss_decision: swissDecision,
      mill_turn_plan: millTurnPlan,
      summary,
    };
  }
}

// Export singleton
export const latheIntelligenceEngine = new LatheIntelligenceEngine();
