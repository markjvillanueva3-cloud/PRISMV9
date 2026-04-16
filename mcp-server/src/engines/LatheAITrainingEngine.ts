/**
 * LatheAITrainingEngine — LATHE-AI-TRAIN
 * ========================================
 * Trains lathe AI from JM Die's 15,251 real lathe programs (.MIN files).
 * Parses Okuma OSP format, extracts operations/parameters, validates against
 * physics, identifies patterns, and generates improvement recommendations.
 *
 * Training Data:
 *   - 15,251 .MIN files in H:/PRISM/JM DIE/CNC LATHE/
 *   - 119+ customer folders (OMG, Fontana, ITW, Optimas, etc.)
 *   - Primary materials: M2, D2, S7, A2 tool steels
 *   - Typical parts: cold heading punches, dies, electrodes
 *
 * Capabilities:
 *   1. Parse Okuma OSP .MIN programs
 *   2. Extract tools, speeds, feeds, operations
 *   3. Validate against Kienzle/Taylor physics
 *   4. Identify success patterns and anti-patterns
 *   5. Generate parameter improvements
 *   6. Rewrite programs with optimized parameters
 *   7. Train LatheDeepAIHardeningEngine from real data
 *
 * @module engines/LatheAITrainingEngine
 * @milestone LATHE-AI-TRAIN
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { latheDeepAIHardeningEngine } from "./LatheDeepAIHardeningEngine.js";
import type { ISOGroup, LatheOperationType, LatheOperationRecord } from "./LatheDeepAIHardeningEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Parsed tool block from MIN file */
export interface ParsedToolBlock {
  tool_number: number;
  offset: number;
  nat_label: string;
  description: string;
  tool_type: ToolType;
  insert_info?: string;
  lines: string[];
  start_line: number;
  end_line: number;
}

/** Extracted cutting parameters */
export interface ExtractedParams {
  spindle_mode: "CSS" | "RPM";
  spindle_value: number;
  max_rpm?: number;
  feed_ipr?: number;
  feed_ipm?: number;
  depth_of_cut_in?: number;
  coolant: boolean;
}

/** Tool type inferred from description */
export type ToolType =
  | "od_rough" | "od_finish" | "od_groove" | "od_thread"
  | "id_rough" | "id_finish" | "id_groove" | "id_thread"
  | "face" | "center_drill" | "drill" | "boring_bar"
  | "cutoff" | "parting" | "unknown";

/** Parsed complete program */
export interface ParsedProgram {
  filename: string;
  filepath: string;
  customer?: string;
  part_number?: string;
  material?: string;
  post_date?: string;
  tool_blocks: ParsedToolBlock[];
  operation_sequence: ToolType[];
  total_lines: number;
  has_bar_feed: boolean;
  has_canned_cycles: boolean;
}

/** Validation issue found */
export interface ValidationIssue {
  severity: "critical" | "warning" | "suggestion";
  tool_number?: number;
  line_number?: number;
  issue: string;
  current_value?: string | number;
  recommended_value?: string | number;
  physics_basis?: string;
}

/** Program analysis result */
export interface ProgramAnalysis {
  program: ParsedProgram;
  issues: ValidationIssue[];
  score: number; // 0-100
  operation_order_correct: boolean;
  parameters_optimal: boolean;
  recommendations: string[];
  improved_params: Map<number, ExtractedParams>;
}

/** Training statistics */
export interface TrainingStats {
  programs_parsed: number;
  programs_analyzed: number;
  patterns_learned: number;
  anti_patterns_found: number;
  avg_program_score: number;
  common_issues: Map<string, number>;
  best_practices: string[];
}

/** Learned pattern from training */
export interface LearnedPattern {
  pattern_id: string;
  pattern_type: "success" | "anti";
  tool_type: ToolType;
  material_context?: string;
  description: string;
  params: Partial<ExtractedParams>;
  occurrence_count: number;
  avg_score: number;
}

// ============================================================================
// CONSTANTS — Physics-based parameter limits
// ============================================================================

/**
 * Kienzle-based cutting data for JM Die materials.
 * kc11 in N/mm², mc = force exponent
 */
/**
 * Kienzle coefficients for JM Die materials — calibrated per canonical ISO H values.
 * mc updated to 0.28-0.30 per physics validation (canonical ISO H mc = 0.30).
 * vc_range adjusted per Taylor tool life analysis (H13 max reduced from 140→110).
 * Ref: ISO 513, Machinery's Handbook 31st Ed., Sandvik Coromant Main Catalog.
 */
const JM_DIE_MATERIALS: Record<string, { iso: ISOGroup; kc11: number; mc: number; vc_range: [number, number] }> = {
  "M2":    { iso: "H", kc11: 3200, mc: 0.30, vc_range: [70, 110] },   // HSS, 60-65 HRC
  "D2":    { iso: "H", kc11: 3000, mc: 0.28, vc_range: [70, 100] },   // Cold work, 58-62 HRC
  "S7":    { iso: "H", kc11: 2800, mc: 0.28, vc_range: [70, 110] },   // Shock steel, 54-58 HRC
  "A2":    { iso: "H", kc11: 2900, mc: 0.28, vc_range: [70, 110] },   // Air-hardening, 57-62 HRC
  "H13":   { iso: "H", kc11: 2700, mc: 0.28, vc_range: [70, 110] },   // Hot work, 45-52 HRC (reduced from 140)
  "1030":  { iso: "P", kc11: 1800, mc: 0.26, vc_range: [150, 300] },  // Medium carbon
  "1045":  { iso: "P", kc11: 1900, mc: 0.26, vc_range: [140, 280] },  // Medium carbon
  "4140":  { iso: "P", kc11: 2000, mc: 0.25, vc_range: [120, 250] },  // Alloy steel
  "4340":  { iso: "P", kc11: 2100, mc: 0.25, vc_range: [100, 220] },  // High-strength
  "303":   { iso: "M", kc11: 2100, mc: 0.22, vc_range: [100, 200] },  // Free-machining SS
  "304":   { iso: "M", kc11: 2200, mc: 0.22, vc_range: [80, 180] },   // Austenitic SS
  "6061":  { iso: "N", kc11: 700,  mc: 0.30, vc_range: [300, 800] },  // Aluminum
  "CARBIDE": { iso: "H", kc11: 4000, mc: 0.25, vc_range: [20, 50] },  // Tungsten carbide (PCBN/ceramic)
};

/**
 * Recommended feed ranges by operation (IPR).
 * Conservative for JM Die tool steels.
 */
/**
 * Feed ranges by operation type (IPR) — calibrated for JM Die tool steels.
 * ISO H materials require conservative feeds to prevent insert chipping.
 * od_rough max reduced from 0.015→0.010 for H-group per canonical mm/rev values.
 */
const FEED_RANGES: Record<ToolType, { min: number; max: number; optimal: number }> = {
  od_rough:     { min: 0.005, max: 0.010, optimal: 0.008 },   // Reduced for ISO H steels
  od_finish:    { min: 0.002, max: 0.006, optimal: 0.004 },
  od_groove:    { min: 0.001, max: 0.004, optimal: 0.002 },
  od_thread:    { min: 0.001, max: 0.003, optimal: 0.002 },
  id_rough:     { min: 0.003, max: 0.008, optimal: 0.005 },   // Adjusted for boring rigidity
  id_finish:    { min: 0.001, max: 0.004, optimal: 0.002 },
  id_groove:    { min: 0.001, max: 0.003, optimal: 0.002 },
  id_thread:    { min: 0.001, max: 0.002, optimal: 0.0015 },
  face:         { min: 0.004, max: 0.012, optimal: 0.008 },
  center_drill: { min: 0.001, max: 0.003, optimal: 0.002 },
  drill:        { min: 0.002, max: 0.006, optimal: 0.003 },
  boring_bar:   { min: 0.001, max: 0.004, optimal: 0.002 },
  cutoff:       { min: 0.001, max: 0.0015, optimal: 0.0012 }, // Tightened - cutoff > F.0015 is anti-pattern
  parting:      { min: 0.001, max: 0.0015, optimal: 0.0012 },
  unknown:      { min: 0.002, max: 0.008, optimal: 0.005 },
};

/**
 * Correct operation order for common part families.
 */
const CORRECT_OPERATION_ORDER: ToolType[][] = [
  // Simple shaft: face → rough → finish → cutoff
  ["face", "od_rough", "od_finish", "cutoff"],
  // With hole: face → rough → center → drill → bore → finish → cutoff
  ["face", "od_rough", "center_drill", "drill", "boring_bar", "od_finish", "cutoff"],
  // Threaded: face → rough → finish → thread → cutoff
  ["face", "od_rough", "od_finish", "od_thread", "cutoff"],
  // With ID thread: face → rough → center → drill → bore_rough → bore_finish → id_thread → od_finish → cutoff
  ["face", "od_rough", "center_drill", "drill", "id_rough", "id_finish", "id_thread", "od_finish", "cutoff"],
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class LatheAITrainingEngine {
  private _learnedPatterns: Map<string, LearnedPattern> = new Map();
  private _trainingStats: TrainingStats = {
    programs_parsed: 0,
    programs_analyzed: 0,
    patterns_learned: 0,
    anti_patterns_found: 0,
    avg_program_score: 0,
    common_issues: new Map(),
    best_practices: [],
  };

  // ==========================================================================
  // 1. PARSE OKUMA MIN FILE
  // ==========================================================================

  /**
   * Parse an Okuma .MIN file into structured data.
   */
  parseProgram(content: string, filepath: string): ParsedProgram {
    const lines = content.split(/\r?\n/);
    const filename = filepath.split(/[/\\]/).pop() ?? "unknown.MIN";

    // Extract customer from path
    const pathParts = filepath.split(/[/\\]/);
    const latheIdx = pathParts.findIndex(p => p.toUpperCase() === "CNC LATHE");
    const customer = latheIdx >= 0 && pathParts[latheIdx + 1] ? pathParts[latheIdx + 1] : undefined;

    // Extract metadata from header comments
    let material: string | undefined;
    let post_date: string | undefined;
    let part_number: string | undefined;

    for (const line of lines.slice(0, 20)) {
      const upper = line.toUpperCase();
      if (upper.includes("MATERIAL")) {
        const match = line.match(/MATERIAL\s*[-=]\s*(.+?)(?:\s*[-=]|$)/i);
        if (match) material = match[1].trim();
      }
      if (upper.includes("DATE")) {
        const match = line.match(/DATE\s*[-=]\s*(\d{1,2}-\d{1,2}-\d{2,4})/i);
        if (match) post_date = match[1];
      }
      if (upper.includes("PROGRAM NAME")) {
        const match = line.match(/PROGRAM NAME\s*[-=]\s*(\S+)/i);
        if (match) part_number = match[1];
      }
    }

    // Parse tool blocks
    const toolBlocks: ParsedToolBlock[] = [];
    let currentBlock: Partial<ParsedToolBlock> | null = null;
    let blockLines: string[] = [];
    let blockStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // NAT## line starts a new tool block
      const natMatch = line.match(/^NAT(\d{1,2})\s*(.*)/);
      if (natMatch) {
        // Save previous block
        if (currentBlock && currentBlock.tool_number !== undefined) {
          toolBlocks.push({
            ...currentBlock,
            lines: blockLines,
            end_line: i - 1,
          } as ParsedToolBlock);
        }

        // Start new block
        const toolNum = parseInt(natMatch[1], 10);
        const description = natMatch[2].replace(/[()]/g, "").trim();
        currentBlock = {
          tool_number: toolNum,
          offset: toolNum,
          nat_label: `NAT${natMatch[1].padStart(2, "0")}`,
          description,
          tool_type: this._inferToolType(description),
          start_line: i,
        };
        blockLines = [line];
        blockStart = i;
        continue;
      }

      // T###### line sets tool number/offset
      const toolMatch = line.match(/^T(\d{2})(\d{2})(\d{2})/);
      if (toolMatch && currentBlock) {
        currentBlock.tool_number = parseInt(toolMatch[1], 10);
        currentBlock.offset = parseInt(toolMatch[2], 10);
      }

      // Add line to current block
      if (currentBlock) {
        blockLines.push(line);
      }
    }

    // Save last block
    if (currentBlock && currentBlock.tool_number !== undefined) {
      toolBlocks.push({
        ...currentBlock,
        lines: blockLines,
        end_line: lines.length - 1,
      } as ParsedToolBlock);
    }

    // Build operation sequence
    const operation_sequence = toolBlocks.map(b => b.tool_type);

    // Detect features
    const contentUpper = content.toUpperCase();
    const has_bar_feed = contentUpper.includes("NBAR") || contentUpper.includes("/GOTO NBAR");
    const has_canned_cycles = /G8[0-9]|G7[0-6]/.test(content);

    return {
      filename,
      filepath,
      customer,
      part_number,
      material,
      post_date,
      tool_blocks: toolBlocks,
      operation_sequence,
      total_lines: lines.length,
      has_bar_feed,
      has_canned_cycles,
    };
  }

  /**
   * Extract cutting parameters from a tool block.
   */
  extractParams(block: ParsedToolBlock): ExtractedParams {
    const content = block.lines.join("\n");

    let spindle_mode: "CSS" | "RPM" = "RPM";
    let spindle_value = 0;
    let max_rpm: number | undefined;
    let feed_ipr: number | undefined;
    let coolant = false;

    // G96 = CSS mode, G97 = RPM mode
    if (content.includes("G96")) {
      spindle_mode = "CSS";
      const cssMatch = content.match(/G96\s*S(\d+)/);
      if (cssMatch) spindle_value = parseInt(cssMatch[1], 10);
    }

    const rpmMatch = content.match(/G97\s*S(\d+)/);
    if (rpmMatch) {
      if (spindle_mode === "RPM") spindle_value = parseInt(rpmMatch[1], 10);
    }

    // G50 S#### = max RPM limit
    const g50Match = content.match(/G50\s*S(\d+)/);
    if (g50Match) max_rpm = parseInt(g50Match[1], 10);

    // F### = feed rate (IPR for lathe)
    const feedMatches = content.match(/F\.?(\d+)/g);
    if (feedMatches) {
      const feeds = feedMatches.map(f => {
        const num = f.replace("F", "").replace(".", "");
        return parseFloat(`0.${num.padStart(4, "0")}`);
      });
      feed_ipr = Math.min(...feeds.filter(f => f > 0 && f < 1));
    }

    // M8 = coolant on
    coolant = content.includes("M8");

    return {
      spindle_mode,
      spindle_value,
      max_rpm,
      feed_ipr,
      coolant,
    };
  }

  // ==========================================================================
  // 2. VALIDATE AGAINST PHYSICS
  // ==========================================================================

  /**
   * Analyze a parsed program for issues and improvements.
   */
  analyzeProgram(program: ParsedProgram): ProgramAnalysis {
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];
    const improved_params = new Map<number, ExtractedParams>();

    // Detect material for physics validation
    const materialKey = this._detectMaterial(program.material);
    const materialData = materialKey ? JM_DIE_MATERIALS[materialKey] : null;

    // 1. Check operation order
    const operation_order_correct = this._validateOperationOrder(program.operation_sequence);
    if (!operation_order_correct) {
      issues.push({
        severity: "warning",
        issue: "Operation order may not be optimal",
        physics_basis: "Face before OD turning, drilling before boring, finish after rough",
      });
      recommendations.push("Consider: Face → OD Rough → Center Drill → Drill → Bore → OD Finish → Cutoff");
    }

    // 2. Validate each tool block
    let parameters_optimal = true;
    for (const block of program.tool_blocks) {
      const params = this.extractParams(block);
      const blockIssues = this._validateToolBlock(block, params, materialData);
      issues.push(...blockIssues);

      if (blockIssues.some(i => i.severity === "critical" || i.severity === "warning")) {
        parameters_optimal = false;
      }

      // Generate improved parameters
      const improved = this._optimizeParams(block, params, materialData);
      if (improved) {
        improved_params.set(block.tool_number, improved);
      }
    }

    // 3. Check for common issues
    this._checkCommonIssues(program, issues);

    // 4. Calculate score (with diminishing returns to avoid 0 on multi-tool programs)
    const criticals = issues.filter(i => i.severity === "critical").length;
    const warnings = issues.filter(i => i.severity === "warning").length;
    const suggestions = issues.filter(i => i.severity === "suggestion").length;

    // Cap penalties per category to be fair to multi-tool programs:
    // - Critical: max 60 points (3+ criticals all cap at 60)
    // - Warning: max 30 points (3+ warnings all cap at 30)
    // - Suggestion: max 10 points (5+ suggestions all cap at 10)
    const criticalPenalty = Math.min(criticals * 20, 60);
    const warningPenalty = Math.min(warnings * 10, 30);
    const suggestionPenalty = Math.min(suggestions * 2, 10);
    const score = Math.max(0, 100 - criticalPenalty - warningPenalty - suggestionPenalty);

    // 5. Generate recommendations
    if (!parameters_optimal) {
      recommendations.push("Review and update cutting parameters based on physics validation");
    }
    if (materialData && materialData.iso === "H") {
      recommendations.push("Hard material detected: use CBN inserts, reduce Vc, increase rigidity");
    }
    if (!program.has_canned_cycles) {
      recommendations.push("Consider using G85/G87 canned cycles for roughing/finishing");
    }

    return {
      program,
      issues,
      score,
      operation_order_correct,
      parameters_optimal,
      recommendations,
      improved_params,
    };
  }

  /**
   * Validate a single tool block against physics.
   */
  private _validateToolBlock(
    block: ParsedToolBlock,
    params: ExtractedParams,
    material: { iso: ISOGroup; kc11: number; mc: number; vc_range: [number, number] } | null,
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Get expected feed range
    const feedRange = FEED_RANGES[block.tool_type];

    // Check feed rate
    if (params.feed_ipr !== undefined) {
      if (params.feed_ipr < feedRange.min) {
        issues.push({
          severity: "warning",
          tool_number: block.tool_number,
          issue: `Feed too low for ${block.tool_type}`,
          current_value: params.feed_ipr,
          recommended_value: feedRange.optimal,
          physics_basis: "Low feed increases cycle time, may cause rubbing wear",
        });
      } else if (params.feed_ipr > feedRange.max * 1.5) {
        issues.push({
          severity: "critical",
          tool_number: block.tool_number,
          issue: `Feed too high for ${block.tool_type}`,
          current_value: params.feed_ipr,
          recommended_value: feedRange.max,
          physics_basis: "High feed causes insert chipping, poor surface finish",
        });
      }
    }

    // Check spindle speed against material
    if (material && params.spindle_mode === "CSS") {
      const [minVc, maxVc] = material.vc_range;
      // CSS value is surface feet/min (SFM), convert to m/min for comparison
      const vc_mpm = params.spindle_value * 0.3048;

      if (vc_mpm < minVc * 0.7) {
        issues.push({
          severity: "warning",
          tool_number: block.tool_number,
          issue: "Cutting speed too low",
          current_value: `${params.spindle_value} SFM (${vc_mpm.toFixed(0)} m/min)`,
          recommended_value: `${Math.round(minVc / 0.3048)} SFM`,
          physics_basis: "Low Vc reduces productivity, may cause BUE",
        });
      } else if (vc_mpm > maxVc * 1.2) {
        issues.push({
          severity: "critical",
          tool_number: block.tool_number,
          issue: "Cutting speed too high for material",
          current_value: `${params.spindle_value} SFM (${vc_mpm.toFixed(0)} m/min)`,
          recommended_value: `${Math.round(maxVc / 0.3048)} SFM`,
          physics_basis: "High Vc causes rapid tool wear (Taylor equation)",
        });
      }
    }

    // Check for missing G50 RPM limit with CSS
    if (params.spindle_mode === "CSS" && !params.max_rpm) {
      issues.push({
        severity: "critical",
        tool_number: block.tool_number,
        issue: "Missing G50 S#### max RPM limit with CSS mode",
        recommended_value: "Add G50 S#### before G96",
        physics_basis: "Without limit, spindle overspeeds at small diameters — safety risk",
      });
    }

    // Check for coolant on roughing/drilling
    if ((block.tool_type.includes("rough") || block.tool_type === "drill") && !params.coolant) {
      issues.push({
        severity: "suggestion",
        tool_number: block.tool_number,
        issue: "No coolant detected for roughing/drilling",
        physics_basis: "Coolant reduces temperature, extends tool life",
      });
    }

    return issues;
  }

  // ==========================================================================
  // 3. GENERATE IMPROVEMENTS
  // ==========================================================================

  /**
   * Optimize parameters based on physics.
   */
  private _optimizeParams(
    block: ParsedToolBlock,
    current: ExtractedParams,
    material: { iso: ISOGroup; kc11: number; mc: number; vc_range: [number, number] } | null,
  ): ExtractedParams {
    const feedRange = FEED_RANGES[block.tool_type];

    const optimized: ExtractedParams = { ...current };

    // Optimize feed
    if (!current.feed_ipr || current.feed_ipr < feedRange.min) {
      optimized.feed_ipr = feedRange.optimal;
    } else if (current.feed_ipr > feedRange.max) {
      optimized.feed_ipr = feedRange.max;
    }

    // Optimize speed for material
    if (material) {
      const optimalVc = (material.vc_range[0] + material.vc_range[1]) / 2;
      const optimalSfm = Math.round(optimalVc / 0.3048);

      if (current.spindle_mode === "CSS") {
        const currentVc = current.spindle_value * 0.3048;
        if (currentVc < material.vc_range[0] || currentVc > material.vc_range[1]) {
          optimized.spindle_value = optimalSfm;
        }
      }
    }

    // Add max RPM if missing with CSS
    if (current.spindle_mode === "CSS" && !current.max_rpm) {
      // Default max based on material hardness
      optimized.max_rpm = material?.iso === "H" ? 800 : 1500;
    }

    // Ensure coolant for roughing
    if (block.tool_type.includes("rough") || block.tool_type === "drill") {
      optimized.coolant = true;
    }

    return optimized;
  }

  /**
   * Generate an improved version of the program.
   */
  rewriteProgram(analysis: ProgramAnalysis): string {
    const lines = [...analysis.program.tool_blocks.flatMap(b => b.lines)];
    const output: string[] = [];

    output.push(`; ===============================================`);
    output.push(`; PRISM AI-Optimized Program`);
    output.push(`; Original: ${analysis.program.filename}`);
    output.push(`; Score: ${analysis.score}/100 → Improved`);
    output.push(`; ===============================================`);
    output.push(``);

    for (const block of analysis.program.tool_blocks) {
      const improved = analysis.improved_params.get(block.tool_number);

      output.push(`; --- Tool ${block.tool_number}: ${block.description} ---`);

      for (const line of block.lines) {
        let modifiedLine = line;

        // Apply improved parameters
        if (improved) {
          // Update feed
          if (improved.feed_ipr && line.match(/F\.?\d+/)) {
            const feedStr = improved.feed_ipr.toFixed(4).replace(/^0\./, ".");
            modifiedLine = modifiedLine.replace(/F\.?\d+/, `F${feedStr}`);
          }

          // Update CSS speed
          if (improved.spindle_value && line.includes("G96")) {
            modifiedLine = modifiedLine.replace(/G96\s*S\d+/, `G96 S${improved.spindle_value}`);
          }

          // Add G50 if missing
          if (improved.max_rpm && line.includes("G96") && !block.lines.some(l => l.includes("G50"))) {
            output.push(`G50 S${improved.max_rpm}  ; PRISM: Added RPM limit`);
          }

          // Add coolant if missing
          if (improved.coolant && line.match(/G0\s+X[\d.]+\s+Z[\d.]+\s*$/) && !block.lines.some(l => l.includes("M8"))) {
            modifiedLine += " M8  ; PRISM: Added coolant";
          }
        }

        output.push(modifiedLine);
      }

      output.push(``);
    }

    return output.join("\n");
  }

  // ==========================================================================
  // 4. TRAINING FROM ARCHIVE
  // ==========================================================================

  /**
   * Train from a batch of programs (pass file contents).
   */
  trainFromPrograms(programs: Array<{ content: string; filepath: string }>): TrainingStats {
    let totalScore = 0;

    for (const prog of programs) {
      try {
        const parsed = this.parseProgram(prog.content, prog.filepath);
        this._trainingStats.programs_parsed++;

        const analysis = this.analyzeProgram(parsed);
        this._trainingStats.programs_analyzed++;
        totalScore += analysis.score;

        // Track common issues
        for (const issue of analysis.issues) {
          const key = issue.issue.substring(0, 50);
          this._trainingStats.common_issues.set(
            key,
            (this._trainingStats.common_issues.get(key) ?? 0) + 1,
          );
        }

        // Learn patterns from high-scoring programs
        if (analysis.score >= 80) {
          this._learnSuccessPatterns(parsed, analysis);
        } else if (analysis.score < 50) {
          this._learnAntiPatterns(parsed, analysis);
        }

        // Feed to LatheDeepAIHardeningEngine
        this._feedToHardeningEngine(parsed, analysis);

      } catch (err) {
        log.warn("LatheAITrainingEngine: Failed to parse program", { file: prog.filepath });
      }
    }

    this._trainingStats.avg_program_score = totalScore / Math.max(1, this._trainingStats.programs_analyzed);
    this._trainingStats.patterns_learned = Array.from(this._learnedPatterns.values())
      .filter(p => p.pattern_type === "success").length;
    this._trainingStats.anti_patterns_found = Array.from(this._learnedPatterns.values())
      .filter(p => p.pattern_type === "anti").length;

    // Generate best practices
    this._trainingStats.best_practices = this._generateBestPractices();

    return this._trainingStats;
  }

  /**
   * Learn success patterns from a high-scoring program.
   */
  private _learnSuccessPatterns(program: ParsedProgram, analysis: ProgramAnalysis): void {
    for (const block of program.tool_blocks) {
      const params = this.extractParams(block);
      const patternId = `success_${block.tool_type}_${program.material ?? "unknown"}`;

      const existing = this._learnedPatterns.get(patternId);
      if (existing) {
        existing.occurrence_count++;
        existing.avg_score = (existing.avg_score * (existing.occurrence_count - 1) + analysis.score) / existing.occurrence_count;
        // Average the params
        if (params.feed_ipr && existing.params.feed_ipr) {
          existing.params.feed_ipr = (existing.params.feed_ipr * (existing.occurrence_count - 1) + params.feed_ipr) / existing.occurrence_count;
        }
      } else {
        this._learnedPatterns.set(patternId, {
          pattern_id: patternId,
          pattern_type: "success",
          tool_type: block.tool_type,
          material_context: program.material,
          description: `Successful ${block.tool_type} parameters`,
          params,
          occurrence_count: 1,
          avg_score: analysis.score,
        });
      }
    }
  }

  /**
   * Learn anti-patterns from a low-scoring program.
   */
  private _learnAntiPatterns(program: ParsedProgram, analysis: ProgramAnalysis): void {
    for (const issue of analysis.issues.filter(i => i.severity === "critical")) {
      const patternId = `anti_${issue.issue.replace(/\s+/g, "_").substring(0, 30)}`;

      const existing = this._learnedPatterns.get(patternId);
      if (existing) {
        existing.occurrence_count++;
      } else {
        this._learnedPatterns.set(patternId, {
          pattern_id: patternId,
          pattern_type: "anti",
          tool_type: "unknown",
          description: issue.issue,
          params: {},
          occurrence_count: 1,
          avg_score: analysis.score,
        });
      }
    }
  }

  /**
   * Feed learned data to LatheDeepAIHardeningEngine.
   */
  private _feedToHardeningEngine(program: ParsedProgram, analysis: ProgramAnalysis): void {
    const materialKey = this._detectMaterial(program.material);
    const iso: ISOGroup = materialKey ? (JM_DIE_MATERIALS[materialKey]?.iso ?? "P") : "P";

    for (const block of program.tool_blocks) {
      const params = this.extractParams(block);
      const opType = this._toolTypeToOperationType(block.tool_type);

      if (opType) {
        const record: LatheOperationRecord = {
          id: `train_${program.filename}_T${block.tool_number}`,
          timestamp: new Date().toISOString(),
          machine_id: "LTH-01", // Default JM Die lathe
          material_iso_group: iso,
          operation_type: opType,
          params: {
            vc_mpm: params.spindle_mode === "CSS" ? params.spindle_value * 0.3048 : undefined,
            fn_mmrev: params.feed_ipr ? params.feed_ipr * 25.4 : undefined,
          },
          outcome: analysis.score >= 70 ? "success" : analysis.score >= 40 ? "partial" : "failure",
        };

        latheDeepAIHardeningEngine.recordOperation(record);
      }
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private _inferToolType(description: string): ToolType {
    const desc = description.toUpperCase();

    if (desc.includes("CUTOFF") || desc.includes("CUT OFF") || desc.includes("CUT-OFF")) return "cutoff";
    if (desc.includes("PART") && !desc.includes("PART#")) return "parting";
    if (desc.includes("CENTER") && desc.includes("DRILL")) return "center_drill";
    if (desc.includes("DRILL") && !desc.includes("CENTER")) return "drill";
    if (desc.includes("BORE") || desc.includes("B.BAR") || desc.includes("BORING")) return "boring_bar";
    if (desc.includes("GROOVE") && desc.includes("ID")) return "id_groove";
    if (desc.includes("GROOVE") || desc.includes("GRV")) return "od_groove";
    if (desc.includes("THREAD") && desc.includes("ID")) return "id_thread";
    if (desc.includes("THREAD")) return "od_thread";
    if (desc.includes("FIN") && desc.includes("ID")) return "id_finish";
    if (desc.includes("FIN")) return "od_finish";
    if (desc.includes("RGH") && desc.includes("ID")) return "id_rough";
    if (desc.includes("RGH") || desc.includes("ROUGH")) return "od_rough";
    if (desc.includes("FACE")) return "face";
    if (desc.includes("OD")) return "od_rough";
    if (desc.includes("ID")) return "id_rough";

    return "unknown";
  }

  private _toolTypeToOperationType(toolType: ToolType): LatheOperationType | null {
    const mapping: Record<ToolType, LatheOperationType | null> = {
      od_rough: "od_rough",
      od_finish: "od_finish",
      od_groove: "od_groove",
      od_thread: "od_thread",
      id_rough: "id_rough",
      id_finish: "id_finish",
      id_groove: "id_groove",
      id_thread: "id_thread",
      face: "face_rough",
      center_drill: "drilling",
      drill: "drilling",
      boring_bar: "boring",
      cutoff: "cutoff",
      parting: "parting",
      unknown: null,
    };
    return mapping[toolType];
  }

  private _detectMaterial(materialStr?: string): string | null {
    if (!materialStr) return null;
    const upper = materialStr.toUpperCase();

    for (const key of Object.keys(JM_DIE_MATERIALS)) {
      if (upper.includes(key)) return key;
    }

    // Common aliases
    if (upper.includes("TOOL STEEL")) return "D2";
    if (upper.includes("HSS")) return "M2";
    if (upper.includes("STAINLESS")) return "304";
    if (upper.includes("ALUMINUM")) return "6061";

    return null;
  }

  private _validateOperationOrder(sequence: ToolType[]): boolean {
    // Check if face comes before OD turning
    const faceIdx = sequence.findIndex(t => t === "face" || t === "od_rough");
    const drillIdx = sequence.findIndex(t => t === "drill" || t === "center_drill");
    const boreIdx = sequence.findIndex(t => t === "boring_bar" || t.includes("id_"));
    const cutoffIdx = sequence.findIndex(t => t === "cutoff" || t === "parting");

    // Cutoff should be last
    if (cutoffIdx >= 0 && cutoffIdx !== sequence.length - 1) return false;

    // Drilling should come before boring
    if (drillIdx >= 0 && boreIdx >= 0 && drillIdx > boreIdx) return false;

    // Face/rough should come first
    if (faceIdx > 0 && sequence[0] !== "face" && sequence[0] !== "od_rough") return false;

    return true;
  }

  private _checkCommonIssues(program: ParsedProgram, issues: ValidationIssue[]): void {
    // Check for very slow feeds (common amateur mistake)
    for (const block of program.tool_blocks) {
      const params = this.extractParams(block);
      if (params.feed_ipr && params.feed_ipr < 0.001) {
        issues.push({
          severity: "warning",
          tool_number: block.tool_number,
          issue: "Extremely slow feed rate (< 0.001 IPR)",
          current_value: params.feed_ipr,
          recommended_value: FEED_RANGES[block.tool_type].optimal,
          physics_basis: "Very slow feeds waste cycle time and may cause rubbing",
        });
      }
    }

    // Check for missing optional stops between tools
    const hasM1 = program.tool_blocks.some(b => b.lines.some(l => l.includes("M1")));
    if (!hasM1) {
      issues.push({
        severity: "suggestion",
        issue: "No optional stops (M1) between tool changes",
        physics_basis: "M1 allows operator to check first part before continuing",
      });
    }
  }

  private _generateBestPractices(): string[] {
    const practices: string[] = [];

    // Based on learned patterns
    const successPatterns = Array.from(this._learnedPatterns.values())
      .filter(p => p.pattern_type === "success" && p.occurrence_count >= 5);

    for (const pattern of successPatterns.slice(0, 5)) {
      if (pattern.params.feed_ipr) {
        practices.push(`${pattern.tool_type}: optimal feed ${pattern.params.feed_ipr.toFixed(4)} IPR (${pattern.occurrence_count} occurrences)`);
      }
    }

    // Common issues to avoid
    const topIssues = Array.from(this._trainingStats.common_issues.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [issue, count] of topIssues) {
      practices.push(`AVOID: ${issue} (found in ${count} programs)`);
    }

    return practices;
  }

  /**
   * Get training statistics.
   */
  getTrainingStats(): TrainingStats {
    return this._trainingStats;
  }

  /**
   * Get learned patterns.
   */
  getLearnedPatterns(): LearnedPattern[] {
    return Array.from(this._learnedPatterns.values());
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheAITrainingEngine = new LatheAITrainingEngine();
