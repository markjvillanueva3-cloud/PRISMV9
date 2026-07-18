/**
 * HybridProgramComposerEngine.ts
 *
 * AI-powered router that selects the optimal programming mode for each feature
 * and composes hybrid CNC programs from multiple generation sources.
 *
 * Programming Modes:
 * - CAM: Complex toolpaths (3D, 5-axis, adaptive clearing)
 * - Conversational: Simple cycles (pattern holes, profiles, pockets)
 * - Hardcode: Direct G-code for proven sequences
 * - Macro: Parametric programs for part families
 *
 * Selection Criteria:
 * - Feature complexity (simple → conversational, complex → CAM)
 * - Lot size (high volume → macro for flexibility)
 * - Controller capability (advanced cycles, macro support)
 * - Cost optimization (minimize programming time vs run time)
 *
 * @module engines/HybridProgramComposerEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ==================== TYPE DEFINITIONS ====================

export type ProgrammingMode = "cam" | "conversational" | "hardcode" | "macro";

export interface FeatureInput {
  id: string;
  type: string;
  complexity: "simple" | "moderate" | "complex";
  dimensions: Record<string, number>;
  tolerances?: Record<string, number>;
  is_repeated?: boolean;
  quantity?: number;
}

export interface ControllerCapabilities {
  controller_type: "fanuc" | "haas" | "okuma" | "mazak" | "siemens" | "mitsubishi";
  has_macro_b: boolean;
  has_conversational: boolean;
  has_canned_cycles: boolean;
  max_macro_variables: number;
  custom_cycles: string[];
}

export interface ComposerInput {
  features: FeatureInput[];
  controller: ControllerCapabilities;
  lot_size: number;
  family_potential: boolean;
  optimize_for: "programming_time" | "run_time" | "flexibility" | "balanced";
}

export interface ModeSelection {
  feature_id: string;
  selected_mode: ProgrammingMode;
  confidence: number;
  rationale: string[];
  estimated_programming_time_min: number;
  estimated_run_time_sec: number;
}

export interface ProgramSegment {
  feature_id: string;
  mode: ProgrammingMode;
  gcode: string;
  line_count: number;
  variables_used?: string[];
}

export interface ComposerResult {
  selections: ModeSelection[];
  segments: ProgramSegment[];
  merged_program: string;
  total_lines: number;
  programming_time_estimate_min: number;
  run_time_estimate_min: number;
  cost_comparison: CostComparison;
  ai_reasoning: string[];
}

export interface CostComparison {
  all_cam_cost: number;
  all_conversational_cost: number;
  hybrid_cost: number;
  savings_pct: number;
  recommendation: string;
}

// ==================== ENGINE IMPLEMENTATION ====================

class HybridProgramComposerEngine {
  /**
   * Main entry point: Analyze features and compose hybrid program
   */
  async compose(input: ComposerInput): Promise<ComposerResult> {
    const aiReasoning: string[] = [];
    aiReasoning.push(`[HYBRID] Starting hybrid program composition for ${input.features.length} features`);
    aiReasoning.push(`[HYBRID] Controller: ${input.controller.controller_type}, Lot size: ${input.lot_size}`);

    // Step 1: Score each feature for programming mode
    const selections = input.features.map(f => this.selectModeForFeature(f, input, aiReasoning));

    // Step 2: Generate program segments for each feature
    const segments = selections.map(s => this.generateSegment(s, input));

    // Step 3: Merge segments into coherent program
    const mergedProgram = this.mergeSegments(segments, input.controller, aiReasoning);

    // Step 4: Calculate cost comparison
    const costComparison = this.calculateCostComparison(selections, input);

    // Step 5: Calculate totals
    const totalLines = segments.reduce((sum, s) => sum + s.line_count, 0);
    const programmingTime = selections.reduce((sum, s) => sum + s.estimated_programming_time_min, 0);
    const runTime = selections.reduce((sum, s) => sum + s.estimated_run_time_sec, 0) / 60;

    aiReasoning.push(`[HYBRID] Complete: ${totalLines} lines, ${programmingTime.toFixed(0)} min programming, ${runTime.toFixed(1)} min run time`);

    return {
      selections,
      segments,
      merged_program: mergedProgram,
      total_lines: totalLines,
      programming_time_estimate_min: programmingTime,
      run_time_estimate_min: runTime,
      cost_comparison: costComparison,
      ai_reasoning: aiReasoning,
    };
  }

  /**
   * Select optimal programming mode for a single feature
   */
  private selectModeForFeature(
    feature: FeatureInput,
    input: ComposerInput,
    reasoning: string[]
  ): ModeSelection {
    const rationale: string[] = [];
    let selectedMode: ProgrammingMode;
    let confidence: number;

    // Complexity-based initial selection
    if (feature.complexity === "complex") {
      selectedMode = "cam";
      confidence = 0.9;
      rationale.push("Complex feature requires CAM toolpath generation");
    } else if (feature.complexity === "simple") {
      selectedMode = "conversational";
      confidence = 0.85;
      rationale.push("Simple feature suitable for conversational cycles");
    } else {
      selectedMode = "cam";
      confidence = 0.75;
      rationale.push("Moderate complexity defaults to CAM");
    }

    // Lot size and family adjustments
    if (input.lot_size > 100 && input.family_potential) {
      if (input.controller.has_macro_b && input.controller.max_macro_variables >= 20) {
        selectedMode = "macro";
        confidence = 0.92;
        rationale.push(`High volume (${input.lot_size}) + family potential → macro programming`);
      }
    }

    // Repeated feature optimization
    if (feature.is_repeated && feature.quantity && feature.quantity > 5) {
      if (feature.complexity === "simple" && input.controller.has_canned_cycles) {
        selectedMode = "conversational";
        confidence = 0.88;
        rationale.push(`${feature.quantity}x repeat → canned cycle efficient`);
      }
    }

    // Controller capability check
    if (selectedMode === "conversational" && !input.controller.has_conversational) {
      selectedMode = "hardcode";
      confidence = 0.8;
      rationale.push("Controller lacks conversational → hardcode G-code");
    }

    if (selectedMode === "macro" && !input.controller.has_macro_b) {
      selectedMode = "cam";
      confidence = 0.75;
      rationale.push("Controller lacks macro B → fallback to CAM");
    }

    // Estimate times
    const programmingTime = this.estimateProgrammingTime(selectedMode, feature);
    const runTime = this.estimateRunTime(feature);

    reasoning.push(`[HYBRID] Feature ${feature.id} (${feature.type}): ${selectedMode} (${(confidence * 100).toFixed(0)}%)`);

    return {
      feature_id: feature.id,
      selected_mode: selectedMode,
      confidence,
      rationale,
      estimated_programming_time_min: programmingTime,
      estimated_run_time_sec: runTime,
    };
  }

  /**
   * Generate G-code segment for a feature
   */
  private generateSegment(selection: ModeSelection, input: ComposerInput): ProgramSegment {
    const feature = input.features.find(f => f.id === selection.feature_id)!;

    let gcode: string;
    let lineCount: number;
    let variablesUsed: string[] | undefined;

    switch (selection.selected_mode) {
      case "cam":
        gcode = this.generateCAMPlaceholder(feature);
        lineCount = Math.floor(20 + feature.complexity === "complex" ? 50 : 15);
        break;

      case "conversational":
        gcode = this.generateConversationalCode(feature, input.controller);
        lineCount = gcode.split("\n").length;
        break;

      case "hardcode":
        gcode = this.generateHardcodeSequence(feature);
        lineCount = gcode.split("\n").length;
        break;

      case "macro":
        const macroResult = this.generateMacroCode(feature);
        gcode = macroResult.code;
        lineCount = gcode.split("\n").length;
        variablesUsed = macroResult.variables;
        break;
    }

    return {
      feature_id: feature.id,
      mode: selection.selected_mode,
      gcode,
      line_count: lineCount,
      variables_used: variablesUsed,
    };
  }

  /**
   * Merge all segments into a single program
   */
  private mergeSegments(
    segments: ProgramSegment[],
    controller: ControllerCapabilities,
    reasoning: string[]
  ): string {
    reasoning.push(`[HYBRID] Merging ${segments.length} segments`);

    const lines: string[] = [];

    // Program header
    lines.push("%");
    lines.push("O1000 (HYBRID PROGRAM - AUTO-GENERATED)");
    lines.push(`(CONTROLLER: ${controller.controller_type.toUpperCase()})`);
    lines.push("(PROGRAMMING MODES: " + [...new Set(segments.map(s => s.mode.toUpperCase()))].join(", ") + ")");
    lines.push("");

    // Variable declarations for macro segments
    const macroSegments = segments.filter(s => s.mode === "macro");
    if (macroSegments.length > 0) {
      lines.push("(=== MACRO VARIABLE DECLARATIONS ===)");
      const allVars = new Set(macroSegments.flatMap(s => s.variables_used || []));
      for (const v of allVars) {
        lines.push(`#${v.replace("#", "")} = 0 (INITIALIZE)`);
      }
      lines.push("");
    }

    // Merge each segment
    for (const segment of segments) {
      lines.push(`(=== FEATURE: ${segment.feature_id} | MODE: ${segment.mode.toUpperCase()} ===)`);
      lines.push(segment.gcode);
      lines.push("");
    }

    // Program footer
    lines.push("M30");
    lines.push("%");

    reasoning.push(`[HYBRID] Merged program: ${lines.length} lines`);

    return lines.join("\n");
  }

  /**
   * Calculate cost comparison between different approaches
   */
  private calculateCostComparison(selections: ModeSelection[], input: ComposerInput): CostComparison {
    const programmingRate = 75; // $/hr for programming
    const machineRate = 85; // $/hr for machine time

    // Actual hybrid cost
    const hybridProgrammingMin = selections.reduce((sum, s) => sum + s.estimated_programming_time_min, 0);
    const hybridRunSec = selections.reduce((sum, s) => sum + s.estimated_run_time_sec, 0);
    const hybridCost = (hybridProgrammingMin / 60) * programmingRate +
      (hybridRunSec / 3600) * machineRate * input.lot_size;

    // All-CAM estimate (longer programming, same run time)
    const camProgrammingMin = selections.length * 15; // 15 min per feature avg for CAM
    const allCamCost = (camProgrammingMin / 60) * programmingRate +
      (hybridRunSec / 3600) * machineRate * input.lot_size;

    // All-conversational estimate (quick programming, possibly longer run)
    const convProgrammingMin = selections.length * 5; // 5 min per feature
    const convRunSec = hybridRunSec * 1.1; // 10% longer run
    const allConvCost = (convProgrammingMin / 60) * programmingRate +
      (convRunSec / 3600) * machineRate * input.lot_size;

    const minCost = Math.min(hybridCost, allCamCost, allConvCost);
    const savings = ((allCamCost - hybridCost) / allCamCost) * 100;

    let recommendation: string;
    if (hybridCost <= minCost) {
      recommendation = "Hybrid approach is optimal";
    } else if (allConvCost <= minCost) {
      recommendation = "Consider all-conversational for this job";
    } else {
      recommendation = "CAM is competitive for complex features";
    }

    return {
      all_cam_cost: Math.round(allCamCost),
      all_conversational_cost: Math.round(allConvCost),
      hybrid_cost: Math.round(hybridCost),
      savings_pct: Math.round(savings),
      recommendation,
    };
  }

  // ==================== GENERATOR METHODS ====================

  private generateCAMPlaceholder(feature: FeatureInput): string {
    return `(CAM TOOLPATH FOR ${feature.id})
(TYPE: ${feature.type})
(INSERT CAM-GENERATED CODE HERE)
G0 Z5.0
G0 X0 Y0
M5`;
  }

  private generateConversationalCode(feature: FeatureInput, controller: ControllerCapabilities): string {
    const type = feature.type.toLowerCase();
    const dims = feature.dimensions;

    if (type.includes("hole") || type.includes("drill")) {
      const depth = dims.depth || 25;
      const diameter = dims.diameter || 10;
      return `(DRILLING CYCLE - ${feature.id})
G0 Z2.0
G81 Z-${depth.toFixed(1)} R2.0 F0.15 (DRILL D${diameter.toFixed(1)})
G80`;
    }

    if (type.includes("pocket")) {
      const width = dims.width || 50;
      const length = dims.length || 50;
      const depth = dims.depth || 10;
      return `(POCKET CYCLE - ${feature.id})
G0 Z2.0
G12 I${(width / 2).toFixed(1)} K${depth.toFixed(1)} D01 F500 (CIRCULAR POCKET)`;
    }

    if (type.includes("thread")) {
      const pitch = dims.pitch || 1.5;
      const depth = dims.depth || 20;
      return `(THREADING CYCLE - ${feature.id})
G0 Z2.0
G84 Z-${depth.toFixed(1)} R2.0 F${(pitch * 100).toFixed(0)} (TAP P${pitch})
G80`;
    }

    return `(GENERIC CYCLE - ${feature.id})
(TYPE: ${type})
G0 Z2.0
G1 Z-5.0 F200
G0 Z2.0`;
  }

  private generateHardcodeSequence(feature: FeatureInput): string {
    const dims = feature.dimensions;
    const x = dims.x || 0;
    const y = dims.y || 0;
    const z = dims.depth ? -dims.depth : -10;

    return `(HARDCODE - ${feature.id})
G0 X${x.toFixed(3)} Y${y.toFixed(3)} Z2.0
G1 Z${z.toFixed(3)} F200
G0 Z2.0`;
  }

  private generateMacroCode(feature: FeatureInput): { code: string; variables: string[] } {
    const dims = feature.dimensions;
    const vars: string[] = [];

    let code = `(MACRO - ${feature.id})\n`;

    if (dims.diameter) {
      vars.push("#100");
      code += `#100 = ${dims.diameter.toFixed(3)} (DIAMETER)\n`;
    }
    if (dims.depth) {
      vars.push("#101");
      code += `#101 = ${dims.depth.toFixed(3)} (DEPTH)\n`;
    }
    if (dims.x !== undefined) {
      vars.push("#102");
      code += `#102 = ${dims.x.toFixed(3)} (X POSITION)\n`;
    }
    if (dims.y !== undefined) {
      vars.push("#103");
      code += `#103 = ${dims.y.toFixed(3)} (Y POSITION)\n`;
    }

    code += `G0 X#102 Y#103 Z2.0\n`;
    code += `G1 Z[-#101] F200\n`;
    code += `G0 Z2.0`;

    return { code, variables: vars };
  }

  // ==================== ESTIMATION METHODS ====================

  private estimateProgrammingTime(mode: ProgrammingMode, feature: FeatureInput): number {
    const baseTime: Record<ProgrammingMode, number> = {
      cam: 15,
      conversational: 5,
      hardcode: 8,
      macro: 20,
    };

    const complexityMultiplier: Record<string, number> = {
      simple: 0.7,
      moderate: 1.0,
      complex: 1.5,
    };

    return baseTime[mode] * (complexityMultiplier[feature.complexity] || 1.0);
  }

  /** Default material-removal rate (cm^3/min) for the rough run-time estimate when the caller
   *  supplies no real value via dimensions.mrr_cm3_min (ENGINE-AUDIT 2026-06-19, slot:bravo:
   *  replaces a magic `mrr = 10` literal -- documented + caller-overridable). */
  private static readonly DEFAULT_MRR_CM3_MIN = 10;

  private estimateRunTime(feature: FeatureInput): number {
    const dims = feature.dimensions;
    const volume = (dims.length || 50) * (dims.width || 50) * (dims.depth || 10);
    // Use a caller-supplied real MRR when present; else the documented rough default.
    const mrr = dims.mrr_cm3_min && dims.mrr_cm3_min > 0
      ? dims.mrr_cm3_min
      : HybridProgramComposerEngine.DEFAULT_MRR_CM3_MIN;
    return (volume / 1000 / mrr) * 60; // seconds
  }
}

export const hybridProgramComposerEngine = new HybridProgramComposerEngine();
