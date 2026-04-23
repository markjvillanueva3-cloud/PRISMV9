/**
 * LatheLoRAExampleGeneratorEngine — LATHE-LORA-MS0 U-LLR07
 * ========================================================
 *
 * Generates diverse instruction-tuning examples from parsed Okuma programs.
 * Creates varied question-answer pairs for robust LoRA fine-tuning.
 *
 * Example types:
 *   - Speed/feed calculations
 *   - Operation sequencing
 *   - Code explanation
 *   - Error diagnosis
 *   - Optimization suggestions
 *   - Tool selection
 *   - Parameter justification
 *
 * Integrates:
 *   - Kienzle force model (lathe-physics-science-tips.ts)
 *   - Taylor tool life (lathe-physics-science-tips.ts)
 *   - Okuma OSP idioms (lathe-tribal-tips-okuma.ts)
 *   - MachiningPlaybookEngine rules
 *
 * @module engines/LatheLoRAExampleGeneratorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import type { ParseResult, OperationType, OperationBlock } from "./LatheLoRAProgramParserEngine.js";
import { CANONICAL_KIENZLE, CANONICAL_MATERIAL_DB, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

/** Training example for LoRA */
export interface TrainingExample {
  id: string;
  type: ExampleType;
  instruction: string;
  input: string;
  output: string;
  reasoning?: string[];
  confidence: number;
  tags: string[];
  source: {
    program?: string;
    operation?: OperationType;
    line_range?: [number, number];
  };
}

/** Example type classification */
export type ExampleType =
  | "speed_feed"
  | "operation_sequence"
  | "code_explanation"
  | "error_diagnosis"
  | "optimization"
  | "tool_selection"
  | "parameter_justification"
  | "safety_check"
  | "cycle_time"
  | "surface_finish";

/** Generation configuration */
export interface GenerationConfig {
  max_examples_per_program: number;
  include_reasoning: boolean;
  min_confidence: number;
  example_types: ExampleType[];
  material_context?: string;
  operation_focus?: OperationType[];
}

/** Generation statistics */
export interface GenerationStats {
  total_generated: number;
  by_type: Record<ExampleType, number>;
  avg_confidence: number;
  with_reasoning: number;
  skipped_low_confidence: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: GenerationConfig = {
  max_examples_per_program: 10,
  include_reasoning: true,
  min_confidence: 0.6,
  example_types: [
    "speed_feed",
    "operation_sequence",
    "code_explanation",
    "parameter_justification",
    "optimization",
  ],
};

/** Material ISO group hints from common names */
const MATERIAL_HINTS: Record<string, ISOGroup> = {
  steel: "P",
  "tool steel": "P",
  d2: "H",
  m2: "H",
  s7: "P",
  a2: "P",
  h13: "H",
  stainless: "M",
  "304": "M",
  "316": "M",
  aluminum: "N",
  "6061": "N",
  titanium: "S",
  "ti-6al-4v": "S",
  inconel: "S",
  cast: "K",
  brass: "N",
  copper: "N",
  carbide: "H",
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAExampleGeneratorEngine {
  private stats: GenerationStats = this.initStats();

  /** Initialize stats */
  private initStats(): GenerationStats {
    return {
      total_generated: 0,
      by_type: {} as Record<ExampleType, number>,
      avg_confidence: 0,
      with_reasoning: 0,
      skipped_low_confidence: 0,
    };
  }

  /**
   * Generate training examples from a parsed program
   */
  generateFromParsed(
    parseResult: ParseResult,
    programName: string,
    config: Partial<GenerationConfig> = {}
  ): TrainingExample[] {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const examples: TrainingExample[] = [];

    if (!parseResult.success || parseResult.structure.operations.length === 0) {
      return examples;
    }

    const structure = parseResult.structure;
    let exampleCount = 0;

    // Generate examples for each enabled type
    for (const exType of cfg.example_types) {
      if (exampleCount >= cfg.max_examples_per_program) break;

      const generated = this.generateByType(exType, parseResult, programName, cfg);

      for (const ex of generated) {
        if (ex.confidence >= cfg.min_confidence) {
          examples.push(ex);
          exampleCount++;
          this.updateStats(ex);
        } else {
          this.stats.skipped_low_confidence++;
        }

        if (exampleCount >= cfg.max_examples_per_program) break;
      }
    }

    return examples;
  }

  /**
   * Generate examples of a specific type
   */
  private generateByType(
    type: ExampleType,
    parseResult: ParseResult,
    programName: string,
    config: GenerationConfig
  ): TrainingExample[] {
    switch (type) {
      case "speed_feed":
        return this.generateSpeedFeedExamples(parseResult, programName, config);
      case "operation_sequence":
        return this.generateSequenceExamples(parseResult, programName, config);
      case "code_explanation":
        return this.generateCodeExplanationExamples(parseResult, programName, config);
      case "parameter_justification":
        return this.generateParameterJustificationExamples(parseResult, programName, config);
      case "optimization":
        return this.generateOptimizationExamples(parseResult, programName, config);
      case "tool_selection":
        return this.generateToolSelectionExamples(parseResult, programName, config);
      case "safety_check":
        return this.generateSafetyCheckExamples(parseResult, programName, config);
      default:
        return [];
    }
  }

  /**
   * Generate speed/feed calculation examples
   */
  private generateSpeedFeedExamples(
    parseResult: ParseResult,
    programName: string,
    config: GenerationConfig
  ): TrainingExample[] {
    const examples: TrainingExample[] = [];
    const structure = parseResult.structure;

    for (const op of structure.operations) {
      if (!op.spindle_speed || !op.feed_rate) continue;

      const material = config.material_context || "tool steel";
      const isoGroup = this.detectISOGroup(material);
      const kienzle = CANONICAL_KIENZLE[isoGroup];

      const instruction = `Calculate if the speed and feed parameters are appropriate for ${op.operation_type} on ${material}.`;

      const input = [
        `Operation: ${op.operation_type}`,
        `Spindle: ${op.spindle_speed} RPM (${op.spindle_mode.toUpperCase()})`,
        `Feed: ${op.feed_rate} IPR`,
        `Tool: T${op.tool_number || "unknown"}`,
      ].join("\n");

      const reasoning = config.include_reasoning ? [
        `Using Kienzle model for ISO group ${isoGroup}`,
        `kc1.1 = ${kienzle.kc1_1} N/mm², mc = ${kienzle.mc}`,
        `${op.spindle_mode === "css" ? "CSS mode provides consistent surface speed" : "RPM mode - verify for diameter range"}`,
      ] : undefined;

      const output = this.generateSpeedFeedResponse(op, isoGroup, kienzle);

      examples.push({
        id: `${programName}-sf-${op.block_id}`,
        type: "speed_feed",
        instruction,
        input,
        output,
        reasoning,
        confidence: 0.85,
        tags: ["kienzle", "speed_feed", op.operation_type, isoGroup],
        source: {
          program: programName,
          operation: op.operation_type,
          line_range: [op.start_line, op.end_line],
        },
      });
    }

    return examples;
  }

  /**
   * Generate operation sequence examples
   */
  private generateSequenceExamples(
    parseResult: ParseResult,
    programName: string,
    config: GenerationConfig
  ): TrainingExample[] {
    const examples: TrainingExample[] = [];
    const structure = parseResult.structure;

    if (structure.operations.length < 2) return examples;

    const opSequence = structure.operations.map(o => o.operation_type);
    const uniqueOps = [...new Set(opSequence)];

    const instruction = `Evaluate this operation sequence for a lathe part and suggest improvements if needed.`;

    const input = [
      `Current sequence: ${opSequence.join(" → ")}`,
      `Tool changes: ${structure.tool_changes}`,
      `Unique tools: ${structure.unique_tools.length}`,
    ].join("\n");

    const reasoning = config.include_reasoning ? [
      "Evaluating for optimal material removal order",
      "Checking for unnecessary tool changes",
      "Verifying roughing before finishing principle",
    ] : undefined;

    const output = this.generateSequenceResponse(opSequence, structure.tool_changes);

    examples.push({
      id: `${programName}-seq-001`,
      type: "operation_sequence",
      instruction,
      input,
      output,
      reasoning,
      confidence: 0.80,
      tags: ["sequence", "planning", ...uniqueOps],
      source: {
        program: programName,
      },
    });

    return examples;
  }

  /**
   * Generate code explanation examples
   */
  private generateCodeExplanationExamples(
    parseResult: ParseResult,
    programName: string,
    config: GenerationConfig
  ): TrainingExample[] {
    const examples: TrainingExample[] = [];
    const structure = parseResult.structure;

    for (const op of structure.operations.slice(0, 2)) {
      const codeLines = op.lines.map(l => l.raw).filter(l => l.trim()).slice(0, 8);
      if (codeLines.length < 2) continue;

      const instruction = "Explain what this Okuma OSP G-code does and identify the operation type.";
      const input = codeLines.join("\n");

      const reasoning = config.include_reasoning ? [
        `Identified ${op.lines.length} code lines`,
        `Primary G-codes: ${op.lines.flatMap(l => l.g_codes).slice(0, 5).join(", ")}`,
        `Operation classification: ${op.operation_type}`,
      ] : undefined;

      const output = this.generateCodeExplanationResponse(op);

      examples.push({
        id: `${programName}-explain-${op.block_id}`,
        type: "code_explanation",
        instruction,
        input,
        output,
        reasoning,
        confidence: 0.75,
        tags: ["explanation", "g_code", op.operation_type],
        source: {
          program: programName,
          operation: op.operation_type,
          line_range: [op.start_line, op.end_line],
        },
      });
    }

    return examples;
  }

  /**
   * Generate parameter justification examples
   */
  private generateParameterJustificationExamples(
    parseResult: ParseResult,
    programName: string,
    config: GenerationConfig
  ): TrainingExample[] {
    const examples: TrainingExample[] = [];
    const structure = parseResult.structure;

    // Spindle clamp justification
    if (structure.spindle_clamp) {
      const instruction = "Explain why this spindle speed limit is appropriate for this lathe program.";

      const input = [
        `G50 S${structure.spindle_clamp} (spindle clamp)`,
        `Program has ${structure.operations.length} operations`,
        `Uses ${structure.has_css ? "CSS (G96)" : "direct RPM (G97)"} mode`,
      ].join("\n");

      const reasoning = config.include_reasoning ? [
        "Spindle clamp prevents excessive RPM at small diameters",
        "Critical for safety and tool life in CSS mode",
        "Value should match machine capability and part requirements",
      ] : undefined;

      const output = this.generateSpindleClampResponse(structure.spindle_clamp, structure.has_css);

      examples.push({
        id: `${programName}-param-clamp`,
        type: "parameter_justification",
        instruction,
        input,
        output,
        reasoning,
        confidence: 0.88,
        tags: ["spindle", "safety", "g50"],
        source: { program: programName },
      });
    }

    return examples;
  }

  /**
   * Generate optimization examples
   */
  private generateOptimizationExamples(
    parseResult: ParseResult,
    programName: string,
    config: GenerationConfig
  ): TrainingExample[] {
    const examples: TrainingExample[] = [];
    const structure = parseResult.structure;

    // Look for optimization opportunities
    const issues: string[] = [];

    if (!structure.has_css) {
      issues.push("Not using CSS mode - surface speed varies with diameter");
    }
    if (!structure.spindle_clamp && structure.has_css) {
      issues.push("CSS without spindle clamp - safety risk at small diameters");
    }
    if (structure.tool_changes > structure.unique_tools.length * 2) {
      issues.push("Excessive tool changes - consider reordering operations");
    }

    if (issues.length === 0) return examples;

    const instruction = "Identify potential optimizations in this lathe program structure.";

    const input = [
      `Tool changes: ${structure.tool_changes}`,
      `Unique tools: ${structure.unique_tools.length}`,
      `CSS mode: ${structure.has_css ? "Yes" : "No"}`,
      `Spindle clamp: ${structure.spindle_clamp || "None"}`,
      `Operations: ${structure.operations.map(o => o.operation_type).join(", ")}`,
    ].join("\n");

    const reasoning = config.include_reasoning ? [
      "Analyzing program structure for efficiency",
      "Checking safety and best practices",
      `Found ${issues.length} potential improvements`,
    ] : undefined;

    const output = this.generateOptimizationResponse(issues);

    examples.push({
      id: `${programName}-opt-001`,
      type: "optimization",
      instruction,
      input,
      output,
      reasoning,
      confidence: 0.78,
      tags: ["optimization", "efficiency", "best_practices"],
      source: { program: programName },
    });

    return examples;
  }

  /**
   * Generate tool selection examples
   */
  private generateToolSelectionExamples(
    parseResult: ParseResult,
    programName: string,
    config: GenerationConfig
  ): TrainingExample[] {
    const examples: TrainingExample[] = [];
    const structure = parseResult.structure;

    for (const op of structure.operations.slice(0, 2)) {
      if (!op.tool_number) continue;

      const material = config.material_context || "tool steel";

      const instruction = `Evaluate the tool selection for ${op.operation_type} on ${material}.`;

      const input = [
        `Tool: T${op.tool_number}`,
        `Operation: ${op.operation_type}`,
        `Material: ${material}`,
        `Spindle speed: ${op.spindle_speed || "not specified"} RPM`,
      ].join("\n");

      const reasoning = config.include_reasoning ? [
        "Considering material hardness and operation type",
        "Evaluating insert geometry requirements",
        "Checking speed/feed compatibility",
      ] : undefined;

      const output = this.generateToolSelectionResponse(op, material);

      examples.push({
        id: `${programName}-tool-${op.block_id}`,
        type: "tool_selection",
        instruction,
        input,
        output,
        reasoning,
        confidence: 0.72,
        tags: ["tooling", "insert", op.operation_type],
        source: {
          program: programName,
          operation: op.operation_type,
        },
      });
    }

    return examples;
  }

  /**
   * Generate safety check examples
   */
  private generateSafetyCheckExamples(
    parseResult: ParseResult,
    programName: string,
    config: GenerationConfig
  ): TrainingExample[] {
    const examples: TrainingExample[] = [];
    const structure = parseResult.structure;

    const instruction = "Perform a safety review of this lathe program configuration.";

    const input = [
      `Spindle clamp (G50 S): ${structure.spindle_clamp || "NOT SET"}`,
      `CSS mode: ${structure.has_css ? "Active (G96)" : "Not used"}`,
      `Max spindle speed seen: ${structure.max_spindle_speed || "N/A"}`,
      `Tool life management: ${structure.has_tool_life ? "Active" : "Not detected"}`,
      `Work offsets: ${structure.work_offsets.join(", ") || "None"}`,
    ].join("\n");

    const reasoning = config.include_reasoning ? [
      "Checking spindle safety limits",
      "Verifying CSS mode protection",
      "Reviewing tool life monitoring",
    ] : undefined;

    const safetyIssues: string[] = [];
    if (!structure.spindle_clamp && structure.has_css) {
      safetyIssues.push("CRITICAL: CSS mode without spindle clamp");
    }
    if (structure.max_spindle_speed && structure.max_spindle_speed > 4000) {
      safetyIssues.push("HIGH: Very high spindle speed - verify balance");
    }
    if (!structure.has_tool_life && structure.unique_tools.length > 3) {
      safetyIssues.push("MEDIUM: No tool life monitoring with multiple tools");
    }

    const output = this.generateSafetyResponse(safetyIssues, structure);

    examples.push({
      id: `${programName}-safety-001`,
      type: "safety_check",
      instruction,
      input,
      output,
      reasoning,
      confidence: safetyIssues.length > 0 ? 0.90 : 0.75,
      tags: ["safety", "review", "audit"],
      source: { program: programName },
    });

    return examples;
  }

  // ============================================================================
  // RESPONSE GENERATORS
  // ============================================================================

  private generateSpeedFeedResponse(
    op: OperationBlock,
    isoGroup: ISOGroup,
    kienzle: typeof CANONICAL_KIENZLE[ISOGroup]
  ): string {
    const lines = [
      `**Speed/Feed Analysis for ${op.operation_type}:**`,
      "",
      `Spindle: ${op.spindle_speed} RPM in ${op.spindle_mode.toUpperCase()} mode`,
      `Feed: ${op.feed_rate} IPR`,
      "",
      `**Material Class:** ISO ${isoGroup}`,
      `- Specific cutting force (kc1.1): ${kienzle.kc1_1} N/mm²`,
      `- Kienzle exponent (mc): ${kienzle.mc}`,
      "",
      "**Assessment:**",
    ];

    if (op.operation_type === "roughing") {
      lines.push("- Feed rate appropriate for roughing if depth of cut is moderate");
      lines.push("- Monitor tool wear and adjust based on chip formation");
    } else if (op.operation_type === "finishing") {
      lines.push("- Fine feed suitable for surface finish requirements");
      lines.push("- Higher speed acceptable for finishing passes");
    }

    lines.push("", "Verify with force calculations before production.");
    return lines.join("\n");
  }

  private generateSequenceResponse(opSequence: OperationType[], toolChanges: number): string {
    const lines = [
      "**Sequence Analysis:**",
      "",
      `Current: ${opSequence.join(" → ")}`,
      "",
    ];

    // Check for issues
    const issues: string[] = [];
    const roughIdx = opSequence.indexOf("roughing");
    const finishIdx = opSequence.indexOf("finishing");

    if (finishIdx >= 0 && roughIdx > finishIdx) {
      issues.push("Finishing before roughing detected - incorrect order");
    }

    if (issues.length === 0) {
      lines.push("**Assessment:** Sequence follows best practices.");
      lines.push("- Roughing operations precede finishing");
      lines.push("- Tool changes appear reasonable");
    } else {
      lines.push("**Issues Found:**");
      issues.forEach(i => lines.push(`- ${i}`));
    }

    return lines.join("\n");
  }

  private generateCodeExplanationResponse(op: OperationBlock): string {
    const lines = [
      `**Code Analysis:**`,
      "",
      `This code performs a **${op.operation_type}** operation.`,
      "",
      "**Key Elements:**",
    ];

    const gCodes = [...new Set(op.lines.flatMap(l => l.g_codes))];
    for (const g of gCodes.slice(0, 5)) {
      lines.push(`- ${g}: ${this.explainGCode(g)}`);
    }

    if (op.spindle_speed) {
      lines.push(`- Spindle speed: ${op.spindle_speed} RPM (${op.spindle_mode})`);
    }
    if (op.feed_rate) {
      lines.push(`- Feed rate: ${op.feed_rate} IPR`);
    }
    if (op.coolant) {
      lines.push("- Coolant: Active");
    }

    return lines.join("\n");
  }

  private generateSpindleClampResponse(clamp: number, hasCSS: boolean): string {
    const lines = [
      `**Spindle Clamp Analysis (G50 S${clamp}):**`,
      "",
      `Maximum spindle speed limited to ${clamp} RPM.`,
      "",
      "**Purpose:**",
    ];

    if (hasCSS) {
      lines.push("- Essential safety limit for CSS (G96) mode");
      lines.push("- Prevents dangerous RPM at small diameters");
      lines.push("- Formula: RPM = (SFM × 12) / (π × diameter)");
      lines.push("- Without clamp, RPM approaches infinity as diameter → 0");
    } else {
      lines.push("- Sets overall spindle speed ceiling");
      lines.push("- Protects against programming errors");
    }

    lines.push("");
    lines.push(`**Recommendation:** ${clamp} RPM is ${clamp < 2000 ? "conservative" : clamp < 3500 ? "standard" : "aggressive"} for most operations.`);

    return lines.join("\n");
  }

  private generateOptimizationResponse(issues: string[]): string {
    const lines = [
      "**Optimization Opportunities:**",
      "",
    ];

    if (issues.length === 0) {
      lines.push("Program structure follows best practices. No significant optimizations identified.");
    } else {
      for (const issue of issues) {
        lines.push(`• ${issue}`);
      }
      lines.push("");
      lines.push("**Recommendations:**");
      if (issues.some(i => i.includes("CSS"))) {
        lines.push("- Add CSS mode (G96) for consistent surface speed");
      }
      if (issues.some(i => i.includes("clamp"))) {
        lines.push("- Add G50 S[max] before G96 for safety");
      }
      if (issues.some(i => i.includes("tool changes"))) {
        lines.push("- Reorder operations to minimize tool changes");
      }
    }

    return lines.join("\n");
  }

  private generateToolSelectionResponse(op: OperationBlock, material: string): string {
    const isoGroup = this.detectISOGroup(material);

    const lines = [
      `**Tool Selection for ${op.operation_type} on ${material} (ISO ${isoGroup}):**`,
      "",
      `Current tool: T${op.tool_number}`,
      "",
      "**Recommendations:**",
    ];

    if (op.operation_type === "roughing") {
      lines.push("- Use robust insert with strong edge (CNMG, WNMG)");
      lines.push("- Positive rake for reduced cutting forces");
      lines.push("- Larger nose radius for strength (0.8-1.2mm)");
    } else if (op.operation_type === "finishing") {
      lines.push("- Fine-grain carbide or cermet for surface quality");
      lines.push("- Smaller nose radius for detail (0.4-0.8mm)");
      lines.push("- Consider wiper insert for improved Ra");
    } else if (op.operation_type === "threading") {
      lines.push("- Full-profile or multi-tooth threading insert");
      lines.push("- Match insert pitch to thread specification");
      lines.push("- Use infeed method appropriate for material");
    }

    return lines.join("\n");
  }

  private generateSafetyResponse(issues: string[], structure: ParseResult["structure"]): string {
    const lines = [
      "**Safety Review Results:**",
      "",
    ];

    if (issues.length === 0) {
      lines.push("✅ No critical safety issues detected.");
      lines.push("");
      lines.push("**Verified:**");
      if (structure.spindle_clamp) {
        lines.push(`- Spindle clamp active at ${structure.spindle_clamp} RPM`);
      }
      if (structure.has_tool_life) {
        lines.push("- Tool life monitoring enabled");
      }
    } else {
      lines.push("⚠️ Safety concerns identified:");
      lines.push("");
      for (const issue of issues) {
        lines.push(`• ${issue}`);
      }
      lines.push("");
      lines.push("**Required Actions:**");
      lines.push("Address all CRITICAL issues before running program.");
    }

    return lines.join("\n");
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private detectISOGroup(material: string): ISOGroup {
    const lower = material.toLowerCase();
    for (const [hint, group] of Object.entries(MATERIAL_HINTS)) {
      if (lower.includes(hint)) return group;
    }
    return "P"; // Default to steel
  }

  private explainGCode(code: string): string {
    const explanations: Record<string, string> = {
      G00: "Rapid positioning",
      G01: "Linear interpolation (cutting)",
      G02: "Circular interpolation CW",
      G03: "Circular interpolation CCW",
      G04: "Dwell",
      G50: "Spindle speed clamp / coordinate set",
      G70: "Finishing cycle",
      G71: "Longitudinal roughing cycle",
      G72: "Face roughing cycle",
      G74: "Peck drilling cycle",
      G75: "Grooving cycle",
      G76: "Threading cycle",
      G83: "Deep hole drilling cycle",
      G92: "Thread cutting cycle",
      G96: "Constant surface speed (CSS)",
      G97: "Direct RPM mode",
    };
    return explanations[code] || "G-code function";
  }

  private updateStats(example: TrainingExample): void {
    this.stats.total_generated++;
    this.stats.by_type[example.type] = (this.stats.by_type[example.type] || 0) + 1;
    if (example.reasoning) this.stats.with_reasoning++;

    // Rolling average confidence
    const n = this.stats.total_generated;
    this.stats.avg_confidence = ((n - 1) * this.stats.avg_confidence + example.confidence) / n;
  }

  /** Get current stats */
  getStats(): GenerationStats {
    return { ...this.stats };
  }

  /** Reset stats */
  resetStats(): void {
    this.stats = this.initStats();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAExampleGeneratorEngine = new LatheLoRAExampleGeneratorEngine();
