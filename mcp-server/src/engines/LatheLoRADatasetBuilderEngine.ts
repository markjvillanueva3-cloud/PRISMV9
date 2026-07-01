/**
 * LatheLoRADatasetBuilderEngine — LATHE-LORA-MS0 U-LLR05
 * ======================================================
 *
 * Builds training datasets for LatheLoRA fine-tuning from JM Die program archive.
 * Converts raw Okuma .MIN programs into instruction-tuning format suitable for
 * Unsloth/PEFT LoRA training.
 *
 * Pipeline:
 *   1. Scan JM DIE archive (5,297 .MIN lathe programs)
 *   2. Parse programs via PPTrainingDataPipelineEngine
 *   3. Enrich with tribal knowledge from TribalKnowledgeEngine
 *   4. Generate instruction-response pairs
 *   5. Split into train/val/test sets
 *   6. Export in Alpaca/ShareGPT JSON format
 *
 * Knowledge sources:
 *   - LatheJMDieKnowledgeEngine (program patterns)
 *   - TribalKnowledgeEngine (lathe tips, Kienzle, Taylor)
 *   - MachiningPlaybookEngine (operational rules)
 *
 * @module engines/LatheLoRADatasetBuilderEngine
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";
import type { TrainingRecord, ProgramFeatures } from "./PPTrainingDataPipelineEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Instruction-tuning example for LoRA fine-tuning */
export interface LoRAExample {
  id: string;
  instruction: string;
  input: string;
  output: string;
  metadata: {
    source_program: string;
    customer: string;
    operation_type: string;
    material_hint?: string;
    confidence: number;
    tribal_tips_applied: string[];
  };
}

/** Dataset split configuration */
export interface DatasetSplitConfig {
  train_ratio: number;     // default 0.8
  val_ratio: number;       // default 0.1
  test_ratio: number;      // default 0.1
  seed: number;            // random seed for reproducibility
  stratify_by?: "customer" | "operation" | "complexity";
}

/** Dataset statistics */
export interface DatasetStats {
  total_programs_scanned: number;
  valid_programs: number;
  examples_generated: number;
  train_examples: number;
  val_examples: number;
  test_examples: number;
  by_operation: Record<string, number>;
  by_customer: Record<string, number>;
  by_complexity: Record<string, number>;
  tribal_tips_used: number;
  avg_instruction_length: number;
  avg_output_length: number;
  generation_time_ms: number;
}

/** Dataset build result */
export interface DatasetBuildResult {
  success: boolean;
  stats: DatasetStats;
  train_path?: string;
  val_path?: string;
  test_path?: string;
  errors: string[];
  warnings: string[];
}

/** Instruction template type */
export type InstructionType =
  | "speed_feed_calc"
  | "operation_sequence"
  | "tool_selection"
  | "g_code_generation"
  | "error_diagnosis"
  | "optimization";

// ============================================================================
// CONSTANTS
// ============================================================================

const JM_DIE_LATHE_PATH = "H:/PRISM/JM DIE/CNC LATHE";

const INSTRUCTION_TEMPLATES: Record<InstructionType, string[]> = {
  speed_feed_calc: [
    "Calculate optimal speed and feed for {material} using a {tool_type} on an Okuma lathe.",
    "What are the recommended cutting parameters for turning {material}?",
    "Determine spindle speed and feed rate for {operation} on {material}.",
  ],
  operation_sequence: [
    "Plan the machining sequence for this part requiring {operations}.",
    "What's the optimal operation order for {operations} on {material}?",
    "Generate an operation sequence for a cold heading die made from {material}.",
  ],
  tool_selection: [
    "Select the appropriate insert for turning {material} with {operation}.",
    "What tool geometry works best for {operation} on {material}?",
    "Recommend tooling for {operation} achieving {surface_finish} surface finish.",
  ],
  g_code_generation: [
    "Generate Okuma OSP G-code for {operation} with these parameters: {params}.",
    "Write the G-code block for {operation} using tool {tool_number}.",
    "Create a {operation} cycle in Okuma OSP format for {material}.",
  ],
  error_diagnosis: [
    "Diagnose why this G-code might cause chatter: {code_snippet}.",
    "What's wrong with this speed/feed combination for {material}?",
    "Identify potential issues in this turning operation: {operation_desc}.",
  ],
  optimization: [
    "Optimize this G-code for faster cycle time while maintaining quality.",
    "How can I reduce tool wear when machining {material}?",
    "Improve this {operation} for better surface finish.",
  ],
};

const DEFAULT_SPLIT_CONFIG: DatasetSplitConfig = {
  train_ratio: 0.8,
  val_ratio: 0.1,
  test_ratio: 0.1,
  seed: 42,
  stratify_by: "operation",
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRADatasetBuilderEngine {
  private examples: LoRAExample[] = [];
  private stats: DatasetStats = this.initStats();

  /** Initialize empty stats */
  private initStats(): DatasetStats {
    return {
      total_programs_scanned: 0,
      valid_programs: 0,
      examples_generated: 0,
      train_examples: 0,
      val_examples: 0,
      test_examples: 0,
      by_operation: {},
      by_customer: {},
      by_complexity: {},
      tribal_tips_used: 0,
      avg_instruction_length: 0,
      avg_output_length: 0,
      generation_time_ms: 0,
    };
  }

  /**
   * Scan JM DIE lathe program archive
   */
  async scanArchive(basePath: string = JM_DIE_LATHE_PATH): Promise<string[]> {
    const programs: string[] = [];

    if (!fs.existsSync(basePath)) {
      log.warn(`[LatheLoRADataset] Archive path not found: ${basePath}`);
      return programs;
    }

    const scanDir = (dirPath: string): void => {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (entry.name.toLowerCase().endsWith(".min")) {
            programs.push(fullPath);
          }
        }
      } catch (err) {
        log.debug(`[LatheLoRADataset] Cannot read directory: ${dirPath}`);
      }
    };

    scanDir(basePath);
    log.info(`[LatheLoRADataset] Found ${programs.length} .MIN programs`);
    return programs;
  }

  /**
   * Extract customer name from program path
   */
  private extractCustomer(programPath: string): string {
    const parts = programPath.replace(/\\/g, "/").split("/");
    const latheIdx = parts.findIndex(p => p.toUpperCase() === "CNC LATHE");
    if (latheIdx >= 0 && latheIdx + 1 < parts.length) {
      return parts[latheIdx + 1];
    }
    return "UNKNOWN";
  }

  /**
   * Parse G-code and extract features (simplified - real impl uses PPTrainingDataPipelineEngine)
   */
  private parseProgram(programPath: string): {
    raw: string;
    features: Partial<ProgramFeatures>;
    operations: string[];
  } | null {
    try {
      const content = fs.readFileSync(programPath, "utf-8");
      const lines = content.split(/\r?\n/);

      const operations: string[] = [];
      let maxSpindleSpeed = 0;
      let maxFeedRate = 0;
      let toolChanges = 0;

      for (const line of lines) {
        const trimmed = line.trim().toUpperCase();

        // Detect operations
        if (trimmed.includes("G71") || trimmed.includes("G72")) operations.push("roughing");
        if (trimmed.includes("G70")) operations.push("finishing");
        if (trimmed.includes("G76") || trimmed.includes("G92")) operations.push("threading");
        if (trimmed.includes("G83") || trimmed.includes("G81")) operations.push("drilling");
        if (trimmed.includes("G75")) operations.push("grooving");
        if (trimmed.includes("G73")) operations.push("pattern_repeat");

        // Extract spindle speed
        const sMatch = trimmed.match(/S(\d+)/);
        if (sMatch) {
          const s = parseInt(sMatch[1], 10);
          if (s > maxSpindleSpeed) maxSpindleSpeed = s;
        }

        // Extract feed rate
        const fMatch = trimmed.match(/F([\d.]+)/);
        if (fMatch) {
          const f = parseFloat(fMatch[1]);
          if (f > maxFeedRate) maxFeedRate = f;
        }

        // Count tool changes
        if (trimmed.match(/^T\d{2,4}/)) toolChanges++;
      }

      return {
        raw: content,
        features: {
          total_lines: lines.length,
          tool_changes: toolChanges,
          max_spindle_speed: maxSpindleSpeed,
          max_feed_rate: maxFeedRate,
          program_complexity: Math.min(1, (lines.length / 500) * (toolChanges / 5)),
        },
        operations: [...new Set(operations)],
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Generate instruction-response pairs from a parsed program
   */
  private generateExamples(
    programPath: string,
    parsed: NonNullable<ReturnType<typeof this.parseProgram>>,
    tribalTips: string[] = []
  ): LoRAExample[] {
    const examples: LoRAExample[] = [];
    const customer = this.extractCustomer(programPath);
    const fileName = path.basename(programPath);
    const operations = parsed.operations;

    // Example 1: Speed/Feed from actual program
    if (parsed.features.max_spindle_speed && parsed.features.max_feed_rate) {
      const instruction = this.selectTemplate("speed_feed_calc", {
        material: "tool steel",
        tool_type: "carbide insert",
        operation: operations[0] || "turning",
      });

      examples.push({
        id: `${fileName}-sf-001`,
        instruction,
        input: `Spindle: ${parsed.features.max_spindle_speed} RPM, Feed: ${parsed.features.max_feed_rate} IPR`,
        output: this.generateSpeedFeedResponse(parsed.features, tribalTips),
        metadata: {
          source_program: fileName,
          customer,
          operation_type: operations[0] || "general",
          confidence: 0.85,
          tribal_tips_applied: tribalTips.slice(0, 3),
        },
      });
    }

    // Example 2: Operation sequence
    if (operations.length > 1) {
      const instruction = this.selectTemplate("operation_sequence", {
        operations: operations.join(", "),
        material: "D2 tool steel",
      });

      examples.push({
        id: `${fileName}-seq-001`,
        instruction,
        input: `Operations required: ${operations.join(" → ")}`,
        output: this.generateSequenceResponse(operations, tribalTips),
        metadata: {
          source_program: fileName,
          customer,
          operation_type: "sequence",
          confidence: 0.80,
          tribal_tips_applied: tribalTips.slice(0, 2),
        },
      });
    }

    // Example 3: G-code snippet explanation
    const codeSnippet = this.extractRepresentativeSnippet(parsed.raw);
    if (codeSnippet) {
      examples.push({
        id: `${fileName}-gcode-001`,
        instruction: "Explain what this Okuma OSP G-code does and suggest any improvements.",
        input: codeSnippet,
        output: this.generateCodeExplanation(codeSnippet, tribalTips),
        metadata: {
          source_program: fileName,
          customer,
          operation_type: "code_review",
          confidence: 0.75,
          tribal_tips_applied: tribalTips.slice(0, 2),
        },
      });
    }

    return examples;
  }

  /**
   * Select and fill instruction template
   */
  private selectTemplate(type: InstructionType, vars: Record<string, string>): string {
    const templates = INSTRUCTION_TEMPLATES[type];
    const template = templates[Math.floor(Math.random() * templates.length)];

    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return result;
  }

  /**
   * Generate speed/feed response with tribal knowledge
   */
  private generateSpeedFeedResponse(features: Partial<ProgramFeatures>, tips: string[]): string {
    const lines = [
      `Based on the program parameters (S${features.max_spindle_speed}, F${features.max_feed_rate}):`,
      "",
      "**Analysis:**",
      `- Spindle speed: ${features.max_spindle_speed} RPM is ${this.evaluateSpindleSpeed(features.max_spindle_speed || 0)}`,
      `- Feed rate: ${features.max_feed_rate} IPR is ${this.evaluateFeedRate(features.max_feed_rate || 0)}`,
      "",
      "**Recommendations:**",
    ];

    if (tips.length > 0) {
      lines.push("From tribal knowledge:");
      tips.slice(0, 2).forEach(tip => lines.push(`- ${tip}`));
    }

    lines.push("", "Always verify with Kienzle force calculations before heavy roughing.");
    return lines.join("\n");
  }

  /**
   * Generate operation sequence response
   */
  private generateSequenceResponse(operations: string[], tips: string[]): string {
    const optimized = this.optimizeSequence(operations);
    const lines = [
      "**Recommended Operation Sequence:**",
      "",
      optimized.map((op, i) => `${i + 1}. ${op}`).join("\n"),
      "",
      "**Rationale:**",
      "- Start with roughing to remove bulk material efficiently",
      "- Threading after roughing to ensure dimensional stability",
      "- Finishing passes last for final tolerances",
    ];

    if (tips.length > 0) {
      lines.push("", "**Tribal Knowledge:**");
      tips.slice(0, 2).forEach(tip => lines.push(`- ${tip}`));
    }

    return lines.join("\n");
  }

  /**
   * Generate G-code explanation
   */
  private generateCodeExplanation(snippet: string, tips: string[]): string {
    const lines = [
      "**Code Analysis:**",
      "",
      "This G-code segment performs:",
    ];

    // Simple pattern detection
    if (snippet.includes("G71") || snippet.includes("G72")) {
      lines.push("- Roughing cycle (G71/G72) for efficient material removal");
    }
    if (snippet.includes("G70")) {
      lines.push("- Finishing cycle (G70) following the roughing profile");
    }
    if (snippet.includes("G96")) {
      lines.push("- Constant surface speed (CSS) mode for consistent cutting");
    }
    if (snippet.includes("G50")) {
      lines.push("- Maximum spindle speed clamp (G50 S) for safety");
    }

    lines.push("", "**Suggestions:**");
    lines.push("- Verify coolant is active before cutting operations");
    lines.push("- Check tool life counters if using tool groups");

    return lines.join("\n");
  }

  /**
   * Extract representative code snippet
   */
  private extractRepresentativeSnippet(raw: string): string | null {
    const lines = raw.split(/\r?\n/);

    // Find a cutting operation block
    for (let i = 0; i < lines.length - 10; i++) {
      const line = lines[i].trim().toUpperCase();
      if (line.includes("G71") || line.includes("G76") || line.includes("G70")) {
        return lines.slice(i, Math.min(i + 10, lines.length)).join("\n");
      }
    }

    // Fallback: return first non-comment block
    const startIdx = lines.findIndex(l => !l.trim().startsWith("(") && l.trim().length > 0);
    if (startIdx >= 0) {
      return lines.slice(startIdx, Math.min(startIdx + 8, lines.length)).join("\n");
    }

    return null;
  }

  /**
   * Evaluate spindle speed appropriateness
   */
  private evaluateSpindleSpeed(rpm: number): string {
    if (rpm < 200) return "very conservative, suitable for large diameters or difficult materials";
    if (rpm < 800) return "moderate, typical for roughing operations";
    if (rpm < 2000) return "standard for general turning";
    if (rpm < 4000) return "aggressive, ensure rigidity and balance";
    return "very high, verify tool and workpiece setup";
  }

  /**
   * Evaluate feed rate appropriateness
   */
  private evaluateFeedRate(ipr: number): string {
    if (ipr < 0.004) return "very fine, finishing or threading";
    if (ipr < 0.010) return "light, suitable for finishing passes";
    if (ipr < 0.020) return "moderate, balanced for general turning";
    if (ipr < 0.030) return "aggressive roughing";
    return "very heavy, verify machine capability";
  }

  /**
   * Optimize operation sequence based on best practices
   */
  private optimizeSequence(operations: string[]): string[] {
    const priority: Record<string, number> = {
      facing: 1,
      roughing: 2,
      pattern_repeat: 3,
      drilling: 4,
      boring: 5,
      threading: 6,
      grooving: 7,
      finishing: 8,
    };

    return [...new Set(operations)].sort((a, b) =>
      (priority[a] || 99) - (priority[b] || 99)
    );
  }

  /**
   * Build complete dataset from archive
   */
  async buildDataset(
    options: {
      basePath?: string;
      splitConfig?: Partial<DatasetSplitConfig>;
      maxPrograms?: number;
      outputDir?: string;
    } = {}
  ): Promise<DatasetBuildResult> {
    const startTime = Date.now();
    const config = { ...DEFAULT_SPLIT_CONFIG, ...options.splitConfig };
    const outputDir = options.outputDir || "H:/prism/mcp-server/data/lathe-lora";

    this.examples = [];
    this.stats = this.initStats();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Step 1: Scan archive
    log.info("[LatheLoRADataset] Scanning archive...");
    let programs = await this.scanArchive(options.basePath);
    this.stats.total_programs_scanned = programs.length;

    if (programs.length === 0) {
      return {
        success: false,
        stats: this.stats,
        errors: ["No programs found in archive"],
        warnings,
      };
    }

    // Limit if specified
    if (options.maxPrograms && programs.length > options.maxPrograms) {
      programs = programs.slice(0, options.maxPrograms);
      warnings.push(`Limited to ${options.maxPrograms} programs`);
    }

    // Step 2: Parse and generate examples
    log.info("[LatheLoRADataset] Parsing programs and generating examples...");

    // Get tribal tips once
    let tribalTips: string[] = [];
    try {
      const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");
      const result = tribalKnowledgeEngine.search({ query: "lathe turning Okuma", limit: 20 });
      tribalTips = result.map((t) => t.body || t.title);
      this.stats.tribal_tips_used = tribalTips.length;
    } catch (err) {
      warnings.push("Could not load tribal knowledge tips");
    }

    for (const programPath of programs) {
      const parsed = this.parseProgram(programPath);
      if (!parsed) {
        errors.push(`Failed to parse: ${programPath}`);
        continue;
      }

      this.stats.valid_programs++;
      const examples = this.generateExamples(programPath, parsed, tribalTips);

      for (const ex of examples) {
        this.examples.push(ex);

        // Track stats
        const opType = ex.metadata.operation_type;
        this.stats.by_operation[opType] = (this.stats.by_operation[opType] || 0) + 1;

        const customer = ex.metadata.customer;
        this.stats.by_customer[customer] = (this.stats.by_customer[customer] || 0) + 1;
      }
    }

    this.stats.examples_generated = this.examples.length;

    if (this.examples.length === 0) {
      return {
        success: false,
        stats: this.stats,
        errors: ["No examples generated"],
        warnings,
      };
    }

    // Step 3: Calculate avg lengths
    const totalInstructionLen = this.examples.reduce((sum, e) => sum + e.instruction.length, 0);
    const totalOutputLen = this.examples.reduce((sum, e) => sum + e.output.length, 0);
    this.stats.avg_instruction_length = Math.round(totalInstructionLen / this.examples.length);
    this.stats.avg_output_length = Math.round(totalOutputLen / this.examples.length);

    // Step 4: Split dataset
    const shuffled = this.shuffleWithSeed(this.examples, config.seed);
    const trainEnd = Math.floor(shuffled.length * config.train_ratio);
    const valEnd = trainEnd + Math.floor(shuffled.length * config.val_ratio);

    const trainSet = shuffled.slice(0, trainEnd);
    const valSet = shuffled.slice(trainEnd, valEnd);
    const testSet = shuffled.slice(valEnd);

    this.stats.train_examples = trainSet.length;
    this.stats.val_examples = valSet.length;
    this.stats.test_examples = testSet.length;

    // Step 5: Write output files
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const trainPath = path.join(outputDir, "train.json");
      const valPath = path.join(outputDir, "val.json");
      const testPath = path.join(outputDir, "test.json");

      fs.writeFileSync(trainPath, JSON.stringify(trainSet, null, 2));
      fs.writeFileSync(valPath, JSON.stringify(valSet, null, 2));
      fs.writeFileSync(testPath, JSON.stringify(testSet, null, 2));

      this.stats.generation_time_ms = Date.now() - startTime;

      log.info(`[LatheLoRADataset] Built dataset: ${this.stats.examples_generated} examples in ${this.stats.generation_time_ms}ms`);

      return {
        success: true,
        stats: this.stats,
        train_path: trainPath,
        val_path: valPath,
        test_path: testPath,
        errors,
        warnings,
      };
    } catch (err) {
      errors.push(`Failed to write output: ${err}`);
      return {
        success: false,
        stats: this.stats,
        errors,
        warnings,
      };
    }
  }

  /**
   * Shuffle array with seed for reproducibility
   */
  private shuffleWithSeed<T>(array: T[], seed: number): T[] {
    const result = [...array];
    let m = result.length;
    let s = seed;

    while (m) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const i = s % m--;
      [result[m], result[i]] = [result[i], result[m]];
    }

    return result;
  }

  /**
   * Get current examples (for inspection)
   */
  getExamples(): LoRAExample[] {
    return [...this.examples];
  }

  /**
   * Get current stats
   */
  getStats(): DatasetStats {
    return { ...this.stats };
  }

  /**
   * Convert to Alpaca format for training
   */
  toAlpacaFormat(): Array<{ instruction: string; input: string; output: string }> {
    return this.examples.map(ex => ({
      instruction: ex.instruction,
      input: ex.input,
      output: ex.output,
    }));
  }

  /**
   * Convert to ShareGPT conversation format
   */
  toShareGPTFormat(): Array<{ conversations: Array<{ from: string; value: string }> }> {
    return this.examples.map(ex => ({
      conversations: [
        { from: "human", value: ex.input ? `${ex.instruction}\n\n${ex.input}` : ex.instruction },
        { from: "gpt", value: ex.output },
      ],
    }));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRADatasetBuilderEngine = new LatheLoRADatasetBuilderEngine();
