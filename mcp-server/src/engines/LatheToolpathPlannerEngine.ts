/**
 * LatheToolpathPlannerEngine — Toolpath Planning from Features
 *
 * U-LTH35: Plans turning toolpaths from recognized features.
 * Takes FeatureRecognitionResult and generates optimized toolpath sequences.
 *
 * Planning strategies:
 *   - Rough-to-finish stock removal
 *   - Operation grouping by tool
 *   - Cycle time estimation
 *   - Tool selection hints
 *
 * @module LatheToolpathPlannerEngine
 */

import type {
  FeatureRecognitionResult,
  RecognizedTurningFeature,
  TurningOperation,
  FeatureTree,
} from "./LatheFeatureRecognitionEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Tool type for lathe operations */
export type LatheToolType =
  | "turning_external"
  | "turning_internal"
  | "facing"
  | "grooving_external"
  | "grooving_internal"
  | "grooving_face"
  | "threading_external"
  | "threading_internal"
  | "drilling"
  | "boring"
  | "parting";

/** Planned toolpath segment */
export interface ToolpathSegment {
  id: string;
  operation: TurningOperation;
  feature_ids: string[];
  tool_type: LatheToolType;
  tool_hint?: string;

  // Geometry
  start_point: { x: number; z: number };
  end_point: { x: number; z: number };
  path_type: "rapid" | "linear" | "arc_cw" | "arc_ccw" | "cycle";

  // Parameters
  depth_of_cut_mm: number;
  feed_mmrev?: number;
  surface_speed_mmin?: number;
  spindle_rpm?: number;

  // Cycles
  cycle_type?: "G71" | "G72" | "G73" | "G74" | "G75" | "G76" | "G81" | "G83";
  cycle_params?: Record<string, number>;

  // Timing
  estimated_time_sec: number;
  distance_mm: number;
}

/** Tool change record */
export interface ToolChange {
  sequence_number: number;
  tool_number: number;
  tool_type: LatheToolType;
  tool_description: string;
  operations: TurningOperation[];
  segments: string[];
  estimated_time_sec: number;
}

/** Complete toolpath plan */
export interface ToolpathPlan {
  plan_id: string;
  recognition_id: string;
  processing_time_ms: number;

  // Stock info
  stock: FeatureTree["stock"];

  // Toolpath segments
  segments: ToolpathSegment[];
  total_segments: number;

  // Tool changes
  tool_changes: ToolChange[];
  total_tool_changes: number;

  // Timing
  total_cutting_time_sec: number;
  total_rapid_time_sec: number;
  total_cycle_time_sec: number;
  estimated_setup_time_min: number;

  // Optimization hints
  optimization_opportunities: string[];

  // Validation
  warnings: string[];
  errors: string[];
}

/** Planning configuration */
export interface ToolpathPlanningConfig {
  max_depth_of_cut_mm?: number;
  finishing_allowance_mm?: number;
  rapid_rate_mmmin?: number;
  default_feed_mmrev?: number;
  default_surface_speed_mmin?: number;
  tool_change_time_sec?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: Required<ToolpathPlanningConfig> = {
  max_depth_of_cut_mm: 3.0,
  finishing_allowance_mm: 0.3,
  rapid_rate_mmmin: 10000,
  default_feed_mmrev: 0.25,
  default_surface_speed_mmin: 150,
  tool_change_time_sec: 15
};

const TOOL_MAP: Record<TurningOperation, LatheToolType> = {
  rough_turn: "turning_external",
  finish_turn: "turning_external",
  rough_bore: "boring",
  finish_bore: "boring",
  face: "facing",
  groove: "grooving_external",
  thread: "threading_external",
  drill: "drilling",
  ream: "boring",
  part_off: "parting",
  chamfer: "turning_external",
  radius: "turning_external"
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheToolpathPlannerEngine {
  private planCounter = 0;

  /**
   * Plan toolpaths from feature recognition result
   */
  plan(
    recognition: FeatureRecognitionResult,
    config: ToolpathPlanningConfig = {}
  ): ToolpathPlan {
    const startTime = Date.now();
    const planId = `plan_${++this.planCounter}_${Date.now()}`;

    const cfg = { ...DEFAULT_CONFIG, ...config };
    const warnings: string[] = [];
    const errors: string[] = [];
    const segments: ToolpathSegment[] = [];
    const toolChanges: ToolChange[] = [];
    let segmentId = 0;

    const { feature_tree } = recognition;
    const { features, operation_sequence, stock } = feature_tree;

    // Plan each operation in sequence
    let currentTool: LatheToolType | null = null;
    let currentToolNumber = 0;
    let currentToolSegments: string[] = [];

    for (const operation of operation_sequence) {
      const opFeatures = this.getFeaturesForOperation(features, operation);
      if (opFeatures.length === 0) continue;

      const toolType = TOOL_MAP[operation];

      // Tool change if needed
      if (toolType !== currentTool) {
        if (currentTool !== null) {
          toolChanges.push({
            sequence_number: toolChanges.length + 1,
            tool_number: currentToolNumber,
            tool_type: currentTool,
            tool_description: this.getToolDescription(currentTool),
            operations: [],
            segments: currentToolSegments,
            estimated_time_sec: cfg.tool_change_time_sec
          });
        }

        currentTool = toolType;
        currentToolNumber++;
        currentToolSegments = [];
      }

      // Generate segments for this operation
      const opSegments = this.generateOperationSegments(
        operation,
        opFeatures,
        stock,
        cfg,
        () => `seg_${++segmentId}`
      );

      for (const seg of opSegments) {
        segments.push(seg);
        currentToolSegments.push(seg.id);
      }
    }

    // Final tool change record
    if (currentTool !== null) {
      toolChanges.push({
        sequence_number: toolChanges.length + 1,
        tool_number: currentToolNumber,
        tool_type: currentTool,
        tool_description: this.getToolDescription(currentTool),
        operations: [],
        segments: currentToolSegments,
        estimated_time_sec: cfg.tool_change_time_sec
      });
    }

    // Calculate timing
    const totalCuttingTime = segments
      .filter(s => s.path_type !== "rapid")
      .reduce((sum, s) => sum + s.estimated_time_sec, 0);

    const totalRapidTime = segments
      .filter(s => s.path_type === "rapid")
      .reduce((sum, s) => sum + s.estimated_time_sec, 0);

    const toolChangeTime = toolChanges.length * cfg.tool_change_time_sec;
    const totalCycleTime = totalCuttingTime + totalRapidTime + toolChangeTime;

    // Optimization opportunities
    const opportunities = this.identifyOptimizations(segments, toolChanges);

    // Validation
    if (segments.length === 0) {
      warnings.push("No toolpath segments generated");
    }
    if (recognition.summary.tight_tolerance_count > 0) {
      warnings.push(`${recognition.summary.tight_tolerance_count} features require tight tolerances - verify finish passes`);
    }

    return {
      plan_id: planId,
      recognition_id: recognition.recognition_id,
      processing_time_ms: Date.now() - startTime,

      stock,
      segments,
      total_segments: segments.length,

      tool_changes: toolChanges,
      total_tool_changes: toolChanges.length,

      total_cutting_time_sec: Math.round(totalCuttingTime),
      total_rapid_time_sec: Math.round(totalRapidTime),
      total_cycle_time_sec: Math.round(totalCycleTime),
      estimated_setup_time_min: 15 + toolChanges.length * 2,

      optimization_opportunities: opportunities,
      warnings,
      errors
    };
  }

  /**
   * Get engine statistics
   */
  getStatistics(): {
    total_plans: number;
    supported_operations: TurningOperation[];
    supported_tool_types: LatheToolType[];
    supported_cycles: string[];
  } {
    return {
      total_plans: this.planCounter,
      supported_operations: Object.keys(TOOL_MAP) as TurningOperation[],
      supported_tool_types: [...new Set(Object.values(TOOL_MAP))],
      supported_cycles: ["G71", "G72", "G73", "G74", "G75", "G76", "G81", "G83"]
    };
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  private getFeaturesForOperation(
    features: RecognizedTurningFeature[],
    operation: TurningOperation
  ): RecognizedTurningFeature[] {
    return features.filter(f => f.suggested_operations.includes(operation));
  }

  private generateOperationSegments(
    operation: TurningOperation,
    features: RecognizedTurningFeature[],
    stock: FeatureTree["stock"],
    config: Required<ToolpathPlanningConfig>,
    idGen: () => string
  ): ToolpathSegment[] {
    const segments: ToolpathSegment[] = [];
    const toolType = TOOL_MAP[operation];

    for (const feature of features) {
      // Calculate spindle RPM from surface speed
      const diameter = Math.max(feature.start_diameter, feature.end_diameter, 1);
      const rpm = Math.round((config.default_surface_speed_mmin * 1000) / (Math.PI * diameter));

      switch (operation) {
        case "face":
          segments.push({
            id: idGen(),
            operation,
            feature_ids: [feature.id],
            tool_type: toolType,
            tool_hint: "CNMG 120408 Insert",
            start_point: { x: stock.diameter / 2 + 2, z: 2 },
            end_point: { x: 0, z: 0 },
            path_type: "cycle",
            depth_of_cut_mm: 2,
            feed_mmrev: config.default_feed_mmrev,
            surface_speed_mmin: config.default_surface_speed_mmin,
            spindle_rpm: rpm,
            cycle_type: "G72",
            cycle_params: { U: 0.5, R: 0.5, D: 2000 },
            estimated_time_sec: this.estimateFaceTime(stock.diameter, config),
            distance_mm: stock.diameter / 2
          });
          break;

        case "rough_turn":
          const roughDepth = Math.min(
            config.max_depth_of_cut_mm,
            feature.stock_allowance_mm - config.finishing_allowance_mm
          );
          const numPasses = Math.ceil(
            (feature.stock_allowance_mm - config.finishing_allowance_mm) / roughDepth
          );

          segments.push({
            id: idGen(),
            operation,
            feature_ids: [feature.id],
            tool_type: toolType,
            tool_hint: "CNMG 120408 Insert",
            start_point: { x: stock.diameter / 2, z: 2 },
            end_point: { x: feature.end_diameter / 2 + config.finishing_allowance_mm, z: feature.end_z },
            path_type: "cycle",
            depth_of_cut_mm: roughDepth,
            feed_mmrev: config.default_feed_mmrev,
            surface_speed_mmin: config.default_surface_speed_mmin,
            spindle_rpm: rpm,
            cycle_type: "G71",
            cycle_params: { U: config.finishing_allowance_mm, W: 0.1, R: 0.5, D: roughDepth * 1000 },
            estimated_time_sec: this.estimateTurningTime(feature, numPasses, config),
            distance_mm: feature.end_z * numPasses
          });
          break;

        case "finish_turn":
          segments.push({
            id: idGen(),
            operation,
            feature_ids: [feature.id],
            tool_type: toolType,
            tool_hint: "VNMG 160404 Finish Insert",
            start_point: { x: feature.end_diameter / 2 + config.finishing_allowance_mm, z: 2 },
            end_point: { x: feature.end_diameter / 2, z: feature.end_z },
            path_type: "linear",
            depth_of_cut_mm: config.finishing_allowance_mm,
            feed_mmrev: config.default_feed_mmrev * 0.5,
            surface_speed_mmin: config.default_surface_speed_mmin * 1.2,
            spindle_rpm: Math.round(rpm * 1.2),
            estimated_time_sec: this.estimateFinishTime(feature, config),
            distance_mm: feature.end_z + feature.end_diameter / 2
          });
          break;

        case "thread":
          const threadPitch = feature.thread_pitch || 1.5;
          const threadPasses = Math.ceil((threadPitch * 0.65) / 0.3);

          segments.push({
            id: idGen(),
            operation,
            feature_ids: [feature.id],
            tool_type: "threading_external",
            tool_hint: `Threading Insert ${threadPitch}mm pitch`,
            start_point: { x: feature.start_diameter / 2, z: 2 },
            end_point: { x: feature.start_diameter / 2 - threadPitch * 0.65, z: feature.end_z },
            path_type: "cycle",
            depth_of_cut_mm: 0.3,
            feed_mmrev: threadPitch,
            spindle_rpm: Math.min(rpm, 800),
            cycle_type: "G76",
            cycle_params: {
              P: threadPitch * 1000,
              Q: 100,
              K: threadPitch * 0.65 * 1000,
              D: 50,
              A: 60
            },
            estimated_time_sec: this.estimateThreadingTime(feature, threadPasses),
            distance_mm: feature.end_z * threadPasses
          });
          break;

        case "groove":
          segments.push({
            id: idGen(),
            operation,
            feature_ids: [feature.id],
            tool_type: "grooving_external",
            tool_hint: `Grooving ${feature.groove_width || 3}mm Insert`,
            start_point: { x: feature.start_diameter / 2, z: feature.start_z },
            end_point: { x: feature.end_diameter / 2, z: feature.start_z },
            path_type: "cycle",
            depth_of_cut_mm: feature.groove_depth || 3,
            feed_mmrev: 0.08,
            spindle_rpm: Math.round(rpm * 0.6),
            cycle_type: "G75",
            cycle_params: { R: 0.5, X: feature.end_diameter, Z: feature.start_z },
            estimated_time_sec: this.estimateGrooveTime(feature),
            distance_mm: (feature.groove_depth || 3) * 2
          });
          break;

        case "drill":
          segments.push({
            id: idGen(),
            operation,
            feature_ids: [feature.id],
            tool_type: "drilling",
            tool_hint: `Drill ${feature.end_diameter}mm`,
            start_point: { x: 0, z: 5 },
            end_point: { x: 0, z: -feature.end_z },
            path_type: "cycle",
            depth_of_cut_mm: feature.end_diameter / 2,
            feed_mmrev: 0.15,
            spindle_rpm: Math.min(rpm, 2000),
            cycle_type: "G83",
            cycle_params: { Q: 3000, R: 3, Z: -feature.end_z },
            estimated_time_sec: this.estimateDrillTime(feature),
            distance_mm: feature.end_z * 2
          });
          break;

        case "rough_bore":
        case "finish_bore":
          const boreDepth = operation === "rough_bore"
            ? config.max_depth_of_cut_mm
            : config.finishing_allowance_mm;

          segments.push({
            id: idGen(),
            operation,
            feature_ids: [feature.id],
            tool_type: "boring",
            tool_hint: operation === "rough_bore" ? "Boring Bar Rough" : "Boring Bar Finish",
            start_point: { x: feature.end_diameter / 2 - 2, z: 2 },
            end_point: { x: feature.end_diameter / 2, z: -feature.end_z },
            path_type: "cycle",
            depth_of_cut_mm: boreDepth,
            feed_mmrev: operation === "rough_bore" ? 0.2 : 0.1,
            spindle_rpm: Math.round(rpm * 0.8),
            cycle_type: "G71",
            estimated_time_sec: this.estimateBoreTime(feature, boreDepth, config),
            distance_mm: feature.end_z * 2
          });
          break;

        default:
          // Generic handling for chamfer, radius, etc.
          segments.push({
            id: idGen(),
            operation,
            feature_ids: [feature.id],
            tool_type: toolType,
            start_point: { x: feature.start_diameter / 2, z: feature.start_z },
            end_point: { x: feature.end_diameter / 2, z: feature.end_z },
            path_type: "linear",
            depth_of_cut_mm: 1,
            feed_mmrev: config.default_feed_mmrev,
            spindle_rpm: rpm,
            estimated_time_sec: 5,
            distance_mm: Math.abs(feature.end_z - feature.start_z)
          });
      }
    }

    return segments;
  }

  private estimateFaceTime(diameter: number, config: Required<ToolpathPlanningConfig>): number {
    const distance = diameter / 2;
    const feedMmMin = config.default_feed_mmrev * 800; // Estimated RPM
    return Math.round(distance / feedMmMin * 60);
  }

  private estimateTurningTime(
    feature: RecognizedTurningFeature,
    passes: number,
    config: Required<ToolpathPlanningConfig>
  ): number {
    const length = Math.abs(feature.end_z - feature.start_z);
    const feedMmMin = config.default_feed_mmrev * 500;
    return Math.round((length * passes) / feedMmMin * 60);
  }

  private estimateFinishTime(
    feature: RecognizedTurningFeature,
    config: Required<ToolpathPlanningConfig>
  ): number {
    const length = Math.abs(feature.end_z - feature.start_z);
    const feedMmMin = config.default_feed_mmrev * 0.5 * 600;
    return Math.round(length / feedMmMin * 60);
  }

  private estimateThreadingTime(feature: RecognizedTurningFeature, passes: number): number {
    const length = Math.abs(feature.end_z - feature.start_z);
    const feedMmMin = (feature.thread_pitch || 1.5) * 400;
    return Math.round((length * passes) / feedMmMin * 60);
  }

  private estimateGrooveTime(feature: RecognizedTurningFeature): number {
    const depth = feature.groove_depth || 3;
    return Math.round(depth / 0.5 * 2);
  }

  private estimateDrillTime(feature: RecognizedTurningFeature): number {
    const depth = feature.end_z;
    const feedMmMin = 0.15 * 1000;
    return Math.round((depth * 2) / feedMmMin * 60);
  }

  private estimateBoreTime(
    feature: RecognizedTurningFeature,
    depthOfCut: number,
    config: Required<ToolpathPlanningConfig>
  ): number {
    const length = feature.end_z;
    const stockRemoval = feature.stock_allowance_mm;
    const passes = Math.ceil(stockRemoval / depthOfCut);
    const feedMmMin = 0.15 * 500;
    return Math.round((length * passes * 2) / feedMmMin * 60);
  }

  private getToolDescription(toolType: LatheToolType): string {
    const descriptions: Record<LatheToolType, string> = {
      turning_external: "External Turning Tool (CNMG/VNMG Insert)",
      turning_internal: "Internal Turning Tool",
      facing: "Facing Tool",
      grooving_external: "External Grooving Tool",
      grooving_internal: "Internal Grooving Tool",
      grooving_face: "Face Grooving Tool",
      threading_external: "External Threading Tool",
      threading_internal: "Internal Threading Tool",
      drilling: "Drill",
      boring: "Boring Bar",
      parting: "Part-Off Tool"
    };
    return descriptions[toolType] || toolType;
  }

  private identifyOptimizations(
    segments: ToolpathSegment[],
    toolChanges: ToolChange[]
  ): string[] {
    const opportunities: string[] = [];

    // Check for excessive tool changes
    if (toolChanges.length > 6) {
      opportunities.push(`Consider combining operations to reduce ${toolChanges.length} tool changes`);
    }

    // Check for similar operations that could use same tool
    const roughTurnCount = segments.filter(s => s.operation === "rough_turn").length;
    const finishTurnCount = segments.filter(s => s.operation === "finish_turn").length;
    if (roughTurnCount > 1 && finishTurnCount > 1) {
      opportunities.push("Multiple turning passes - consider G71 multi-profile roughing");
    }

    // Check for threading opportunities
    const threadSegments = segments.filter(s => s.operation === "thread");
    if (threadSegments.length > 0) {
      opportunities.push("Threading detected - verify spring pass included");
    }

    return opportunities;
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheToolpathPlannerEngine = new LatheToolpathPlannerEngine();
