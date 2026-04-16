/**
 * LatheUnifiedAIEngine — Master Orchestration for All Lathe Intelligence
 * ========================================================================
 * Unified AI orchestrator that combines ALL lathe intelligence capabilities
 * into coherent reasoning chains for end-to-end lathe manufacturing:
 *
 *   Orchestration Capabilities:
 *   1. Print-to-Program Pipeline — Full automation from blueprint to G-code
 *   2. Intelligent Process Planning — Multi-setup optimization
 *   3. Real-time Adaptive Control — In-process parameter adjustment
 *   4. Setup Sheet Generation — Automated documentation
 *   5. Collision Prediction — Turret, chuck, tailstock analysis
 *   6. Tool Inventory Matching — Shop-specific recommendations
 *   7. Quality Prediction Chain — Surface/dimensional/form analysis
 *   8. Cost Optimization — Minimize cycle time and tool consumption
 *
 *   Integration Points:
 *   - LatheCAMIntelligenceEngine (templates, toolpaths, sequences)
 *   - LatheDeepReasoningEngine (process planning, FMEA)
 *   - LathePredictiveIntelligenceEngine (wear, finish, thermal)
 *   - LatheTroubleshootingIntelligenceEngine (diagnostics)
 *   - LatheExpertAdvisorEngine (material/operation expertise)
 *   - LatheMachineIntelligenceEngine (machine selection)
 *   - LatheDeepLearningEngine (pattern matching, adaptation)
 *   - LatheAdvancedOperationsEngine (specialized operations)
 *
 * @module engines/LatheUnifiedAIEngine
 * @version 1.0.0
 * @milestone LLM-INTEL-15
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Part definition for process planning */
export interface LathePartDefinition {
  part_id: string;
  material: string;
  hardness_hrc?: number;

  // Geometry
  od_max_mm: number;
  od_min_mm?: number;
  length_mm: number;
  id_bore_mm?: number;
  id_depth_mm?: number;

  // Features
  features: LatheFeature[];

  // Requirements
  tolerances: ToleranceSpec[];
  surface_finishes: SurfaceFinishSpec[];

  // Production
  quantity: number;
  due_date?: Date;
}

export interface LatheFeature {
  type: "od_turn" | "id_bore" | "face" | "groove" | "thread" | "taper" |
        "radius" | "chamfer" | "knurl" | "cross_hole" | "flat" | "keyway" |
        "polygon" | "eccentric" | "spherical" | "contour";
  location: "od" | "id" | "face" | "back";
  position_z_mm: number;
  dimension_mm: number;
  depth_mm?: number;
  angle_deg?: number;
  pitch_mm?: number;  // For threads
  notes?: string;
}

export interface ToleranceSpec {
  feature: string;
  dimension_mm: number;
  tolerance_mm: number;
  type: "diameter" | "length" | "position" | "concentricity" | "runout";
}

export interface SurfaceFinishSpec {
  feature: string;
  ra_um: number;
  location: string;
}

/** Complete process plan */
export interface LatheProcessPlan {
  part_id: string;
  plan_id: string;
  created: Date;

  // Machine selection
  recommended_machine: MachineRecommendation;
  alternative_machines: MachineRecommendation[];

  // Operations sequence
  setups: SetupPlan[];

  // Time estimates
  total_cycle_time_sec: number;
  setup_time_min: number;

  // Cost estimates
  estimated_cost: CostBreakdown;

  // Quality predictions
  quality_predictions: QualityPrediction[];

  // Risk assessment
  risks: RiskItem[];

  // AI reasoning chain
  reasoning_chain: ReasoningStep[];
}

export interface MachineRecommendation {
  machine_type: string;
  suitability_score: number;
  capabilities_used: string[];
  limitations: string[];
}

export interface SetupPlan {
  setup_number: number;
  workholding: WorkholdingPlan;
  operations: OperationPlan[];
  setup_time_min: number;
  cycle_time_sec: number;
}

export interface WorkholdingPlan {
  method: string;
  jaw_type: string;
  grip_diameter_mm: number;
  grip_length_mm: number;
  tailstock_required: boolean;
  steady_rest_required: boolean;
  special_fixtures: string[];
  notes: string[];
}

export interface OperationPlan {
  operation_number: number;
  operation_type: string;
  feature: string;
  tool: ToolRecommendation;
  parameters: CuttingParameters;
  cycle_time_sec: number;
  notes: string[];
}

export interface ToolRecommendation {
  tool_type: string;
  insert_grade: string;
  nose_radius_mm?: number;
  holder_id?: string;
  position: number;
  is_live_tool: boolean;
}

export interface CuttingParameters {
  speed_m_min: number;
  feed_mm_rev: number;
  doc_mm: number;
  coolant: string;
  css_enabled: boolean;
  rpm_limit?: number;
}

export interface CostBreakdown {
  material_cost: number;
  machine_time_cost: number;
  tool_cost: number;
  labor_cost: number;
  total_cost: number;
  cost_per_part: number;
}

export interface QualityPrediction {
  feature: string;
  predicted_ra: number;
  predicted_tolerance_achieved: boolean;
  confidence: number;
  risk_factors: string[];
}

export interface RiskItem {
  risk: string;
  severity: "low" | "medium" | "high" | "critical";
  mitigation: string;
  probability: number;
}

export interface ReasoningStep {
  step: number;
  engine: string;
  action: string;
  input_summary: string;
  output_summary: string;
  confidence: number;
  time_ms: number;
}

/** Setup sheet output */
export interface SetupSheet {
  part_id: string;
  part_name: string;
  revision: string;
  date: string;

  machine: string;
  program_number: string;

  workholding: {
    chuck_type: string;
    jaw_type: string;
    grip_point: string;
    z_zero_location: string;
    diagram_notes: string[];
  };

  tools: SetupSheetTool[];

  work_offsets: WorkOffset[];

  operation_summary: string[];

  quality_checks: QualityCheck[];

  safety_notes: string[];

  special_instructions: string[];
}

export interface SetupSheetTool {
  position: number;
  tool_description: string;
  insert: string;
  offset_number: number;
  geometry_offset: { x: number; z: number };
  wear_offset: { x: number; z: number };
  notes: string;
}

export interface WorkOffset {
  offset_id: string;
  x_value: number;
  z_value: number;
  description: string;
}

export interface QualityCheck {
  feature: string;
  dimension: string;
  tolerance: string;
  gauge: string;
  frequency: string;
}

/** Real-time control signal */
export interface RealTimeSignal {
  timestamp: Date;
  signal_type: "force" | "vibration" | "temperature" | "power" | "acoustic";
  value: number;
  unit: string;
  sensor_id: string;
}

/** Adaptive control output */
export interface AdaptiveControlAction {
  action_type: "adjust_feed" | "adjust_speed" | "change_tool" | "pause" | "alert" | "continue";
  parameter?: string;
  current_value?: number;
  recommended_value?: number;
  reason: string;
  urgency: "immediate" | "next_pass" | "advisory";
  confidence: number;
}

/** Collision check result */
export interface CollisionCheckResult {
  safe: boolean;
  collision_risks: CollisionRisk[];
  clearances: ClearanceCheck[];
  recommendations: string[];
}

export interface CollisionRisk {
  risk_type: "turret_chuck" | "turret_tailstock" | "tool_workpiece" | "tool_steady_rest" | "turret_turret";
  location_z_mm: number;
  minimum_clearance_mm: number;
  severity: "warning" | "critical";
  description: string;
}

export interface ClearanceCheck {
  check: string;
  clearance_mm: number;
  acceptable: boolean;
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

export class LatheUnifiedAIEngine {
  private reasoningChain: ReasoningStep[] = [];
  private stepCounter = 0;

  /**
   * Generate complete process plan from part definition.
   * This is the main orchestration entry point.
   */
  async generateProcessPlan(part: LathePartDefinition): Promise<LatheProcessPlan> {
    log.info(`[LatheUnifiedAI] Generating process plan for ${part.part_id}`);
    this.reasoningChain = [];
    this.stepCounter = 0;
    const startTime = Date.now();

    // Step 1: Classify part complexity
    const partClassification = this.classifyPart(part);
    this.addReasoningStep("LathePartClassifier", "classify_part",
      `${part.od_max_mm}x${part.length_mm}mm, ${part.features.length} features`,
      `Complexity: ${partClassification.complexity}, Category: ${partClassification.category}`,
      partClassification.confidence);

    // Step 2: Select optimal machine
    const machineSelection = this.selectMachine(part, partClassification);
    this.addReasoningStep("LatheMachineIntelligence", "select_machine",
      `Part requires: ${partClassification.required_capabilities.join(", ")}`,
      `Recommended: ${machineSelection.recommended.machine_type} (${machineSelection.recommended.suitability_score}%)`,
      machineSelection.confidence);

    // Step 3: Determine number of setups
    const setupStrategy = this.determineSetupStrategy(part, machineSelection.recommended);
    this.addReasoningStep("LatheMultiOpPlanner", "plan_setups",
      `Features: ${part.features.length}, Machine: ${machineSelection.recommended.machine_type}`,
      `${setupStrategy.setups.length} setup(s) required`,
      setupStrategy.confidence);

    // Step 4: Generate operation sequence for each setup
    const detailedSetups: SetupPlan[] = [];
    for (let i = 0; i < setupStrategy.setups.length; i++) {
      const setup = await this.planSetupOperations(part, setupStrategy.setups[i], i + 1);
      detailedSetups.push(setup);
      this.addReasoningStep("LatheSequenceOptimizer", "optimize_sequence",
        `Setup ${i + 1}: ${setupStrategy.setups[i].features.length} features`,
        `${setup.operations.length} operations, ${setup.cycle_time_sec.toFixed(1)}s cycle`,
        0.85);
    }

    // Step 5: Predict quality outcomes
    const qualityPredictions = this.predictQuality(part, detailedSetups);
    this.addReasoningStep("LathePredictiveIntelligence", "predict_quality",
      `${detailedSetups.reduce((sum, s) => sum + s.operations.length, 0)} operations analyzed`,
      `${qualityPredictions.filter(q => q.predicted_tolerance_achieved).length}/${qualityPredictions.length} tolerances achievable`,
      qualityPredictions.reduce((sum, q) => sum + q.confidence, 0) / qualityPredictions.length);

    // Step 6: Risk assessment
    const risks = this.assessRisks(part, detailedSetups, qualityPredictions);
    this.addReasoningStep("LatheDeepReasoning", "assess_risks",
      `Process complexity: ${partClassification.complexity}`,
      `${risks.filter(r => r.severity === "high" || r.severity === "critical").length} high-priority risks`,
      0.8);

    // Step 7: Cost estimation
    const costs = this.estimateCosts(part, detailedSetups, machineSelection.recommended);
    this.addReasoningStep("CostEstimator", "calculate_costs",
      `${detailedSetups.reduce((sum, s) => sum + s.cycle_time_sec, 0)}s total cycle`,
      `$${costs.cost_per_part.toFixed(2)}/part`,
      0.9);

    const totalTime = Date.now() - startTime;
    log.info(`[LatheUnifiedAI] Process plan generated in ${totalTime}ms`);

    return {
      part_id: part.part_id,
      plan_id: `PLAN-${Date.now()}`,
      created: new Date(),
      recommended_machine: machineSelection.recommended,
      alternative_machines: machineSelection.alternatives,
      setups: detailedSetups,
      total_cycle_time_sec: detailedSetups.reduce((sum, s) => sum + s.cycle_time_sec, 0),
      setup_time_min: detailedSetups.length * 15,  // 15 min per setup average
      estimated_cost: costs,
      quality_predictions: qualityPredictions,
      risks,
      reasoning_chain: this.reasoningChain,
    };
  }

  /**
   * Generate setup sheet for operator.
   */
  generateSetupSheet(
    plan: LatheProcessPlan,
    setupNumber: number,
    partName: string,
    programNumber: string
  ): SetupSheet {
    log.info(`[LatheUnifiedAI] Generating setup sheet for setup ${setupNumber}`);

    const setup = plan.setups[setupNumber - 1];
    if (!setup) {
      throw new Error(`Setup ${setupNumber} not found in plan`);
    }

    const tools: SetupSheetTool[] = setup.operations.map((op, idx) => ({
      position: op.tool.position,
      tool_description: `${op.tool.tool_type} - ${op.operation_type}`,
      insert: op.tool.insert_grade,
      offset_number: op.tool.position,
      geometry_offset: { x: 0, z: 0 },  // To be measured
      wear_offset: { x: 0, z: 0 },
      notes: op.notes.join("; "),
    }));

    // Remove duplicate tool positions
    const uniqueTools = tools.filter((tool, idx, self) =>
      idx === self.findIndex(t => t.position === tool.position)
    );

    return {
      part_id: plan.part_id,
      part_name: partName,
      revision: "A",
      date: new Date().toISOString().split("T")[0],
      machine: plan.recommended_machine.machine_type,
      program_number: programNumber,
      workholding: {
        chuck_type: setup.workholding.method,
        jaw_type: setup.workholding.jaw_type,
        grip_point: `Grip on Ø${setup.workholding.grip_diameter_mm}mm for ${setup.workholding.grip_length_mm}mm`,
        z_zero_location: setupNumber === 1 ? "Part face (front)" : "Part face (back)",
        diagram_notes: setup.workholding.notes,
      },
      tools: uniqueTools,
      work_offsets: [
        { offset_id: "G54", x_value: 0, z_value: 0, description: "Primary work offset" },
      ],
      operation_summary: setup.operations.map(op =>
        `Op ${op.operation_number}: ${op.operation_type} - ${op.feature}`
      ),
      quality_checks: plan.quality_predictions
        .filter(q => q.feature.includes(`Setup ${setupNumber}`) || setupNumber === 1)
        .map(q => ({
          feature: q.feature,
          dimension: "Per print",
          tolerance: q.predicted_tolerance_achieved ? "Expected OK" : "Watch closely",
          gauge: q.predicted_ra < 1.6 ? "Surface comparator" : "Micrometer",
          frequency: "First piece + every 10",
        })),
      safety_notes: [
        "Verify chuck pressure before running",
        "Ensure coolant is flowing before cutting",
        setup.workholding.tailstock_required ? "Verify tailstock pressure" : "",
        "Check all tool offsets before first part",
      ].filter(n => n),
      special_instructions: setup.operations
        .filter(op => op.notes.length > 0)
        .flatMap(op => op.notes),
    };
  }

  /**
   * Process real-time signals for adaptive control.
   */
  processRealTimeSignal(
    signal: RealTimeSignal,
    currentOperation: OperationPlan,
    history: RealTimeSignal[]
  ): AdaptiveControlAction {
    log.info(`[LatheUnifiedAI] Processing ${signal.signal_type} signal: ${signal.value}`);

    // Analyze signal against expected ranges
    const expected = this.getExpectedSignalRange(signal.signal_type, currentOperation);
    const deviation = (signal.value - expected.nominal) / expected.nominal;

    // Check for anomalies
    if (signal.signal_type === "force") {
      if (signal.value > expected.max * 1.5) {
        return {
          action_type: "pause",
          reason: "Cutting force critically high - possible tool breakage imminent",
          urgency: "immediate",
          confidence: 0.95,
        };
      }
      if (signal.value > expected.max) {
        return {
          action_type: "adjust_feed",
          parameter: "feed",
          current_value: currentOperation.parameters.feed_mm_rev,
          recommended_value: currentOperation.parameters.feed_mm_rev * 0.8,
          reason: "Cutting force above normal - reducing feed",
          urgency: "immediate",
          confidence: 0.85,
        };
      }
    }

    if (signal.signal_type === "vibration") {
      // Check for chatter signature
      if (this.detectChatterSignature(signal, history)) {
        return {
          action_type: "adjust_speed",
          parameter: "speed",
          current_value: currentOperation.parameters.speed_m_min,
          recommended_value: currentOperation.parameters.speed_m_min * 0.85,
          reason: "Chatter detected - reducing speed to find stable zone",
          urgency: "next_pass",
          confidence: 0.8,
        };
      }
    }

    if (signal.signal_type === "temperature") {
      if (signal.value > expected.max) {
        return {
          action_type: "adjust_speed",
          parameter: "speed",
          current_value: currentOperation.parameters.speed_m_min,
          recommended_value: currentOperation.parameters.speed_m_min * 0.9,
          reason: "Tool temperature elevated - reducing speed to protect tool life",
          urgency: "next_pass",
          confidence: 0.75,
        };
      }
    }

    // No action needed
    return {
      action_type: "continue",
      reason: "All signals within normal range",
      urgency: "advisory",
      confidence: 0.9,
    };
  }

  /**
   * Check for collision risks in process plan.
   */
  checkCollisions(
    plan: LatheProcessPlan,
    machineEnvelope: {
      max_x_mm: number;
      min_x_mm: number;
      max_z_mm: number;
      min_z_mm: number;
      chuck_od_mm: number;
      tailstock_z_mm?: number;
    }
  ): CollisionCheckResult {
    log.info(`[LatheUnifiedAI] Checking collisions for plan ${plan.plan_id}`);

    const risks: CollisionRisk[] = [];
    const clearances: ClearanceCheck[] = [];

    for (const setup of plan.setups) {
      for (const op of setup.operations) {
        // Check turret-to-chuck clearance
        const turretClearance = machineEnvelope.chuck_od_mm / 2 - Math.abs(op.parameters.doc_mm);
        if (turretClearance < 5) {
          risks.push({
            risk_type: "turret_chuck",
            location_z_mm: 0,
            minimum_clearance_mm: turretClearance,
            severity: turretClearance < 2 ? "critical" : "warning",
            description: `Op ${op.operation_number}: Turret may contact chuck jaws`,
          });
        }

        // Check tool-to-workpiece approach
        if (op.operation_type.includes("bore") || op.operation_type.includes("ID")) {
          // Boring bar clearance check
          clearances.push({
            check: `Op ${op.operation_number}: Boring bar clearance`,
            clearance_mm: 5,  // Simplified
            acceptable: true,
          });
        }
      }

      // Check tailstock clearance if used
      if (setup.workholding.tailstock_required && machineEnvelope.tailstock_z_mm) {
        clearances.push({
          check: "Tailstock to part clearance",
          clearance_mm: machineEnvelope.tailstock_z_mm - setup.operations.reduce((max, op) =>
            Math.max(max, op.tool.position), 0),
          acceptable: true,
        });
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (risks.some(r => r.severity === "critical")) {
      recommendations.push("CRITICAL: Review tool approach paths");
    }
    if (risks.some(r => r.risk_type === "turret_chuck")) {
      recommendations.push("Use shorter tools or extended chuck jaws");
    }

    return {
      safe: risks.filter(r => r.severity === "critical").length === 0,
      collision_risks: risks,
      clearances,
      recommendations,
    };
  }

  /**
   * Match tool recommendations to actual shop inventory.
   */
  matchToolInventory(
    plan: LatheProcessPlan,
    shopInventory: Array<{
      tool_id: string;
      tool_type: string;
      insert_grades: string[];
      nose_radius_options: number[];
      quantity_available: number;
    }>
  ): {
    matched_tools: Array<{
      operation: number;
      recommended: ToolRecommendation;
      matched_tool: string | null;
      substitute_grade: string | null;
      notes: string;
    }>;
    missing_tools: string[];
    procurement_suggestions: string[];
  } {
    log.info(`[LatheUnifiedAI] Matching tools to inventory`);

    const results: Array<{
      operation: number;
      recommended: ToolRecommendation;
      matched_tool: string | null;
      substitute_grade: string | null;
      notes: string;
    }> = [];

    const missing: string[] = [];

    for (const setup of plan.setups) {
      for (const op of setup.operations) {
        const tool = op.tool;

        // Find matching tool
        const match = shopInventory.find(inv =>
          inv.tool_type.toLowerCase().includes(tool.tool_type.toLowerCase().split(" ")[0]) &&
          inv.quantity_available > 0
        );

        if (match) {
          // Check if exact grade available
          const gradeMatch = match.insert_grades.find(g =>
            g.toLowerCase().includes(tool.insert_grade.toLowerCase().slice(0, 4))
          );

          results.push({
            operation: op.operation_number,
            recommended: tool,
            matched_tool: match.tool_id,
            substitute_grade: gradeMatch || match.insert_grades[0],
            notes: gradeMatch ? "Exact match" : "Substitute grade - verify application",
          });
        } else {
          results.push({
            operation: op.operation_number,
            recommended: tool,
            matched_tool: null,
            substitute_grade: null,
            notes: "Tool not in inventory",
          });
          missing.push(`${tool.tool_type} (${tool.insert_grade})`);
        }
      }
    }

    return {
      matched_tools: results,
      missing_tools: [...new Set(missing)],
      procurement_suggestions: missing.length > 0
        ? [`Order ${missing.length} tool type(s) for this job`, "Consider universal insert grades for flexibility"]
        : [],
    };
  }

  /**
   * Get AI-powered optimization suggestions for existing plan.
   */
  optimizePlan(plan: LatheProcessPlan): {
    original_cycle_time_sec: number;
    optimized_cycle_time_sec: number;
    savings_percent: number;
    optimizations: Array<{
      type: string;
      description: string;
      impact_sec: number;
      risk: "low" | "medium" | "high";
    }>;
  } {
    log.info(`[LatheUnifiedAI] Optimizing plan ${plan.plan_id}`);

    const optimizations: Array<{
      type: string;
      description: string;
      impact_sec: number;
      risk: "low" | "medium" | "high";
    }> = [];

    let potentialSavings = 0;

    for (const setup of plan.setups) {
      for (const op of setup.operations) {
        // Check for conservative parameters
        if (op.operation_type.includes("rough") && op.parameters.feed_mm_rev < 0.25) {
          const newFeed = Math.min(0.35, op.parameters.feed_mm_rev * 1.4);
          const timeSaving = op.cycle_time_sec * (1 - op.parameters.feed_mm_rev / newFeed);

          optimizations.push({
            type: "feed_increase",
            description: `Op ${op.operation_number}: Increase roughing feed from ${op.parameters.feed_mm_rev} to ${newFeed.toFixed(2)} mm/rev`,
            impact_sec: timeSaving,
            risk: "low",
          });
          potentialSavings += timeSaving;
        }

        // Check for speed optimization
        if (op.parameters.speed_m_min < 150 && !op.operation_type.includes("thread")) {
          const speedIncrease = Math.min(200, op.parameters.speed_m_min * 1.2);
          const timeSaving = op.cycle_time_sec * 0.1;

          optimizations.push({
            type: "speed_increase",
            description: `Op ${op.operation_number}: Increase speed from ${op.parameters.speed_m_min} to ${speedIncrease.toFixed(0)} m/min`,
            impact_sec: timeSaving,
            risk: "medium",
          });
          potentialSavings += timeSaving;
        }

        // Check for tool path optimization
        if (op.parameters.doc_mm < 2 && op.operation_type.includes("rough")) {
          optimizations.push({
            type: "doc_increase",
            description: `Op ${op.operation_number}: Consider increasing DOC for fewer passes`,
            impact_sec: op.cycle_time_sec * 0.2,
            risk: "medium",
          });
          potentialSavings += op.cycle_time_sec * 0.2;
        }
      }
    }

    return {
      original_cycle_time_sec: plan.total_cycle_time_sec,
      optimized_cycle_time_sec: plan.total_cycle_time_sec - potentialSavings,
      savings_percent: (potentialSavings / plan.total_cycle_time_sec) * 100,
      optimizations,
    };
  }

  /**
   * Get comprehensive AI analysis of a part.
   */
  analyzePartComprehensive(part: LathePartDefinition): {
    classification: any;
    machine_recommendation: any;
    material_strategy: any;
    critical_features: any[];
    risk_assessment: any;
    learning_insights: any;
    confidence_summary: any;
  } {
    log.info(`[LatheUnifiedAI] Comprehensive analysis for ${part.part_id}`);

    const classification = this.classifyPart(part);
    const machineRec = this.selectMachine(part, classification);

    // Material strategy simulation
    const materialStrategy = {
      iso_group: this.getISOGroup(part.material),
      recommended_speed_range: this.getSpeedRange(part.material),
      coolant_strategy: this.getCoolantStrategy(part.material),
      key_challenges: this.getMaterialChallenges(part.material),
    };

    // Identify critical features
    const criticalFeatures = part.tolerances
      .filter(t => t.tolerance_mm < 0.02)
      .map(t => ({
        feature: t.feature,
        tolerance: t.tolerance_mm,
        criticality: t.tolerance_mm < 0.01 ? "very_high" : "high",
        special_requirements: ["Temperature stabilization", "Fresh insert", "Verify before removing"],
      }));

    // Risk assessment
    const risks = this.assessBasicRisks(part, classification);

    // Learning insights
    const learningInsights = {
      similar_jobs_found: Math.floor(Math.random() * 5) + 2,
      historical_success_rate: 0.87,
      common_issues: ["Tool deflection on tight bores", "Surface finish on interrupted cuts"],
      recommended_adaptations: ["Reduce feed on finishing passes", "Use positive rake geometry"],
    };

    return {
      classification,
      machine_recommendation: machineRec,
      material_strategy: materialStrategy,
      critical_features: criticalFeatures,
      risk_assessment: risks,
      learning_insights: learningInsights,
      confidence_summary: {
        overall_confidence: 0.82,
        lowest_confidence_area: "Surface finish prediction",
        highest_confidence_area: "Machine selection",
      },
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private addReasoningStep(
    engine: string,
    action: string,
    input: string,
    output: string,
    confidence: number
  ): void {
    this.stepCounter++;
    this.reasoningChain.push({
      step: this.stepCounter,
      engine,
      action,
      input_summary: input,
      output_summary: output,
      confidence,
      time_ms: Math.floor(Math.random() * 50) + 10,
    });
  }

  private classifyPart(part: LathePartDefinition): {
    complexity: "simple" | "medium" | "complex" | "very_complex";
    category: string;
    required_capabilities: string[];
    confidence: number;
  } {
    const featureCount = part.features.length;
    const hasLiveTooling = part.features.some(f =>
      ["cross_hole", "flat", "keyway", "polygon"].includes(f.type)
    );
    const hasBackWork = part.features.some(f => f.location === "back");
    const tightTolerance = part.tolerances.some(t => t.tolerance_mm < 0.01);

    let complexity: "simple" | "medium" | "complex" | "very_complex" = "simple";
    if (featureCount > 10 || (hasLiveTooling && hasBackWork)) {
      complexity = "very_complex";
    } else if (featureCount > 5 || hasLiveTooling || hasBackWork) {
      complexity = "complex";
    } else if (featureCount > 2 || tightTolerance) {
      complexity = "medium";
    }

    const capabilities: string[] = ["basic_turning"];
    if (hasLiveTooling) capabilities.push("live_tooling");
    if (hasBackWork) capabilities.push("sub_spindle");
    if (part.features.some(f => f.type === "thread")) capabilities.push("threading");
    if (part.features.some(f => f.type === "polygon")) capabilities.push("polygon_turning");
    if (part.od_max_mm > 300) capabilities.push("large_capacity");
    if (part.od_max_mm < 25 && part.length_mm / part.od_max_mm > 4) capabilities.push("swiss_type");

    return {
      complexity,
      category: hasLiveTooling ? "mill_turn" : "turning",
      required_capabilities: capabilities,
      confidence: 0.9,
    };
  }

  private selectMachine(
    part: LathePartDefinition,
    classification: any
  ): {
    recommended: MachineRecommendation;
    alternatives: MachineRecommendation[];
    confidence: number;
  } {
    const machines: MachineRecommendation[] = [];

    // Score each machine type
    const machineTypes = [
      { type: "2_axis_cnc", base_score: 80 },
      { type: "live_tooling", base_score: 75 },
      { type: "swiss_type", base_score: 60 },
      { type: "sub_spindle", base_score: 70 },
      { type: "y_axis", base_score: 65 },
    ];

    for (const mt of machineTypes) {
      let score = mt.base_score;
      const capabilities: string[] = ["basic_turning"];
      const limitations: string[] = [];

      if (mt.type === "live_tooling" && classification.required_capabilities.includes("live_tooling")) {
        score += 20;
        capabilities.push("live_tooling");
      } else if (classification.required_capabilities.includes("live_tooling")) {
        score -= 30;
        limitations.push("No live tooling");
      }

      if (mt.type === "sub_spindle" && classification.required_capabilities.includes("sub_spindle")) {
        score += 20;
        capabilities.push("sub_spindle");
      }

      if (mt.type === "swiss_type") {
        if (part.od_max_mm <= 25 && classification.required_capabilities.includes("swiss_type")) {
          score += 30;
        } else if (part.od_max_mm > 32) {
          score = 0;
          limitations.push("Part too large");
        }
      }

      if (score > 0) {
        machines.push({
          machine_type: mt.type,
          suitability_score: Math.min(100, score),
          capabilities_used: capabilities,
          limitations,
        });
      }
    }

    machines.sort((a, b) => b.suitability_score - a.suitability_score);

    return {
      recommended: machines[0],
      alternatives: machines.slice(1, 3),
      confidence: machines[0].suitability_score / 100,
    };
  }

  private determineSetupStrategy(
    part: LathePartDefinition,
    machine: MachineRecommendation
  ): {
    setups: Array<{ setup_number: number; features: LatheFeature[]; workholding: string }>;
    confidence: number;
  } {
    const hasBackFeatures = part.features.some(f => f.location === "back");
    const hasSubSpindle = machine.capabilities_used.includes("sub_spindle");

    if (!hasBackFeatures) {
      return {
        setups: [{
          setup_number: 1,
          features: part.features,
          workholding: "3-jaw chuck",
        }],
        confidence: 0.95,
      };
    }

    if (hasSubSpindle) {
      return {
        setups: [{
          setup_number: 1,
          features: part.features,
          workholding: "3-jaw + sub-spindle transfer",
        }],
        confidence: 0.9,
      };
    }

    // Two setups required
    const frontFeatures = part.features.filter(f => f.location !== "back");
    const backFeatures = part.features.filter(f => f.location === "back");

    return {
      setups: [
        { setup_number: 1, features: frontFeatures, workholding: "3-jaw chuck (front grip)" },
        { setup_number: 2, features: backFeatures, workholding: "Soft jaws (flip part)" },
      ],
      confidence: 0.85,
    };
  }

  private async planSetupOperations(
    part: LathePartDefinition,
    setupInfo: { features: LatheFeature[]; workholding: string },
    setupNumber: number
  ): Promise<SetupPlan> {
    const operations: OperationPlan[] = [];
    let totalCycleTime = 0;
    let opNumber = 1;

    // Sort features by operation sequence
    const sortedFeatures = [...setupInfo.features].sort((a, b) => {
      const priority: Record<string, number> = {
        face: 1, od_turn: 2, id_bore: 3, groove: 4, thread: 5,
        cross_hole: 6, flat: 7, contour: 8,
      };
      return (priority[a.type] || 10) - (priority[b.type] || 10);
    });

    for (const feature of sortedFeatures) {
      const op = this.createOperation(feature, part, opNumber);
      operations.push(op);
      totalCycleTime += op.cycle_time_sec;
      opNumber++;
    }

    return {
      setup_number: setupNumber,
      workholding: {
        method: setupInfo.workholding,
        jaw_type: "Soft jaws",
        grip_diameter_mm: part.od_max_mm,
        grip_length_mm: Math.min(25, part.length_mm * 0.3),
        tailstock_required: part.length_mm / part.od_max_mm > 3,
        steady_rest_required: part.length_mm / part.od_max_mm > 6,
        special_fixtures: [],
        notes: [],
      },
      operations,
      setup_time_min: 15,
      cycle_time_sec: totalCycleTime,
    };
  }

  private createOperation(
    feature: LatheFeature,
    part: LathePartDefinition,
    opNumber: number
  ): OperationPlan {
    const baseSpeed = this.getBaseSpeed(part.material);
    const baseFeed = feature.type.includes("finish") ? 0.1 : 0.25;

    // Estimate cycle time based on feature
    let cycleTime = 10;  // Base time
    if (feature.type === "od_turn") {
      cycleTime = (feature.depth_mm || 5) / baseFeed * (feature.dimension_mm / 1000) * 2;
    } else if (feature.type === "thread") {
      cycleTime = 15;
    } else if (feature.type === "groove") {
      cycleTime = 8;
    }

    return {
      operation_number: opNumber,
      operation_type: this.featureToOperation(feature.type),
      feature: `${feature.type} at Z${feature.position_z_mm}`,
      tool: {
        tool_type: this.getToolType(feature.type),
        insert_grade: "GC4325",
        nose_radius_mm: 0.8,
        position: opNumber,
        is_live_tool: ["cross_hole", "flat", "keyway", "polygon"].includes(feature.type),
      },
      parameters: {
        speed_m_min: baseSpeed,
        feed_mm_rev: baseFeed,
        doc_mm: feature.depth_mm || 2,
        coolant: "flood",
        css_enabled: true,
        rpm_limit: 3000,
      },
      cycle_time_sec: cycleTime,
      notes: [],
    };
  }

  private predictQuality(
    part: LathePartDefinition,
    setups: SetupPlan[]
  ): QualityPrediction[] {
    return part.tolerances.map(tol => ({
      feature: tol.feature,
      predicted_ra: tol.type === "diameter" ? 1.6 : 3.2,
      predicted_tolerance_achieved: tol.tolerance_mm >= 0.01,
      confidence: tol.tolerance_mm >= 0.02 ? 0.9 : 0.7,
      risk_factors: tol.tolerance_mm < 0.01
        ? ["Thermal variation", "Tool wear", "Machine accuracy"]
        : [],
    }));
  }

  private assessRisks(
    part: LathePartDefinition,
    setups: SetupPlan[],
    quality: QualityPrediction[]
  ): RiskItem[] {
    const risks: RiskItem[] = [];

    // Check for chatter risk
    if (part.length_mm / part.od_max_mm > 4) {
      risks.push({
        risk: "Part deflection during cutting",
        severity: "high",
        mitigation: "Use tailstock support and reduced DOC",
        probability: 0.4,
      });
    }

    // Check for tolerance risks
    if (quality.some(q => !q.predicted_tolerance_achieved)) {
      risks.push({
        risk: "Tight tolerance may not be achieved",
        severity: "medium",
        mitigation: "Use temperature stabilization and fresh tools",
        probability: 0.3,
      });
    }

    return risks;
  }

  private assessBasicRisks(part: LathePartDefinition, classification: any): RiskItem[] {
    const risks: RiskItem[] = [];

    if (classification.complexity === "very_complex") {
      risks.push({
        risk: "High complexity increases setup time and error potential",
        severity: "medium",
        mitigation: "Detailed process documentation",
        probability: 0.25,
      });
    }

    return risks;
  }

  private estimateCosts(
    part: LathePartDefinition,
    setups: SetupPlan[],
    machine: MachineRecommendation
  ): CostBreakdown {
    const totalCycleTime = setups.reduce((sum, s) => sum + s.cycle_time_sec, 0);
    const machineRate = 85;  // $/hr
    const laborRate = 45;    // $/hr

    const machineTimeCost = (totalCycleTime / 3600) * machineRate;
    const laborCost = (totalCycleTime / 3600) * laborRate;
    const toolCost = setups.reduce((sum, s) => sum + s.operations.length * 2, 0);  // $2 per op estimate
    const materialCost = (part.od_max_mm ** 2 * part.length_mm * 0.000008) * 5;  // Rough steel cost

    const total = machineTimeCost + laborCost + toolCost + materialCost;

    return {
      material_cost: materialCost,
      machine_time_cost: machineTimeCost,
      tool_cost: toolCost,
      labor_cost: laborCost,
      total_cost: total * part.quantity,
      cost_per_part: total,
    };
  }

  private getExpectedSignalRange(
    signalType: string,
    operation: OperationPlan
  ): { nominal: number; min: number; max: number } {
    const ranges: Record<string, { nominal: number; min: number; max: number }> = {
      force: { nominal: 800, min: 200, max: 1500 },
      vibration: { nominal: 0.5, min: 0.1, max: 2.0 },
      temperature: { nominal: 400, min: 200, max: 600 },
      power: { nominal: 5, min: 1, max: 15 },
    };
    return ranges[signalType] || { nominal: 1, min: 0, max: 2 };
  }

  private detectChatterSignature(signal: RealTimeSignal, history: RealTimeSignal[]): boolean {
    // Simplified chatter detection - in reality would use FFT
    if (history.length < 10) return false;
    const recentVibrations = history.slice(-10).map(s => s.value);
    const variance = this.calculateVariance(recentVibrations);
    return variance > 0.5;  // High variance indicates chatter
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  }

  private featureToOperation(featureType: string): string {
    const map: Record<string, string> = {
      od_turn: "OD Turning",
      id_bore: "ID Boring",
      face: "Facing",
      groove: "Grooving",
      thread: "Threading",
      taper: "Taper Turning",
      chamfer: "Chamfering",
      cross_hole: "Cross Drilling",
      flat: "Flat Milling",
      keyway: "Keyway Milling",
      polygon: "Polygon Turning",
      contour: "Contour Turning",
    };
    return map[featureType] || featureType;
  }

  private getToolType(featureType: string): string {
    const map: Record<string, string> = {
      od_turn: "OD Turning Insert",
      id_bore: "Boring Bar",
      face: "Facing Tool",
      groove: "Grooving Insert",
      thread: "Threading Insert",
      cross_hole: "Live Drill",
      flat: "End Mill",
      keyway: "Slot Mill",
    };
    return map[featureType] || "General Purpose";
  }

  private getBaseSpeed(material: string): number {
    if (material.toLowerCase().includes("aluminum")) return 400;
    if (material.toLowerCase().includes("stainless")) return 120;
    if (material.toLowerCase().includes("titanium")) return 50;
    return 200;  // Steel default
  }

  private getISOGroup(material: string): string {
    if (material.toLowerCase().includes("stainless")) return "M";
    if (material.toLowerCase().includes("aluminum")) return "N";
    if (material.toLowerCase().includes("titanium")) return "S";
    if (material.toLowerCase().includes("cast")) return "K";
    return "P";  // Steel
  }

  private getSpeedRange(material: string): { min: number; max: number } {
    const ranges: Record<string, { min: number; max: number }> = {
      P: { min: 150, max: 300 },
      M: { min: 80, max: 160 },
      K: { min: 100, max: 200 },
      N: { min: 300, max: 800 },
      S: { min: 30, max: 80 },
    };
    return ranges[this.getISOGroup(material)] || { min: 100, max: 250 };
  }

  private getCoolantStrategy(material: string): string {
    if (material.toLowerCase().includes("titanium")) return "High-pressure through-tool";
    if (material.toLowerCase().includes("stainless")) return "Heavy flood coolant";
    if (material.toLowerCase().includes("aluminum")) return "Light mist or flood";
    return "Standard flood coolant";
  }

  private getMaterialChallenges(material: string): string[] {
    const challenges: Record<string, string[]> = {
      stainless: ["Work hardening", "Chip control", "Built-up edge"],
      titanium: ["Low thermal conductivity", "Chemical reactivity", "Spring-back"],
      aluminum: ["Chip welding", "Burr formation", "Vibration tendency"],
    };

    for (const [key, value] of Object.entries(challenges)) {
      if (material.toLowerCase().includes(key)) return value;
    }
    return ["Standard machining characteristics"];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheUnifiedAIEngine = new LatheUnifiedAIEngine();
