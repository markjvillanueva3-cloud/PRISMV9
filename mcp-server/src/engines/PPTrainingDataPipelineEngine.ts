/**
 * PPTrainingDataPipelineEngine — PP-DL-MS0
 *
 * Extracts machine-readable features from G-code programs for ML training.
 * Processes raw G-code text into labeled training records that link to
 * the Phase 0 embedding vectors (controller, machine, material, toolpath).
 *
 * Pipeline stages:
 *   1. Parse → tokenize G-code lines into structured blocks
 *   2. Classify → identify controller dialect from G-code patterns
 *   3. Extract → pull operation sequences, tool changes, speeds/feeds
 *   4. Label → create training records with feature vectors
 *   5. Validate → check label consistency and flag anomalies
 *
 * Output: TrainingRecord[] suitable for neural network training.
 * Each record contains raw G-code context + embedding-aligned features.
 *
 * References: PP-AGI-MAXOUT-ROADMAP Phase 1 MS0
 * @module PPTrainingDataPipelineEngine
 */

import { ppDialectTransferEngine } from "./PPDialectTransferEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export interface GCodeBlock {
  line_number: number;
  raw: string;
  type: "rapid" | "linear" | "arc_cw" | "arc_ccw" | "drill_cycle" | "tool_change" |
        "spindle" | "coolant" | "comment" | "program_ctrl" | "work_offset" |
        "subprogram" | "macro" | "probe" | "unknown";
  g_codes: string[];
  m_codes: string[];
  parameters: Record<string, number>;
  comment?: string;
}

export interface OperationSegment {
  start_line: number;
  end_line: number;
  tool_number: number;
  operation_type: "roughing" | "finishing" | "drilling" | "tapping" | "boring" |
                  "threading" | "grooving" | "facing" | "contouring" | "unknown";
  spindle_speed?: number;
  feed_rate?: number;
  coolant: boolean;
  block_count: number;
  rapid_pct: number;
  arc_pct: number;
}

export interface ProgramFeatures {
  total_lines: number;
  total_blocks: number;
  tool_changes: number;
  unique_tools: number;
  operations: OperationSegment[];
  controller_dialect: { family: string; confidence: number };
  has_subprograms: boolean;
  has_macros: boolean;
  has_probing: boolean;
  has_canned_cycles: boolean;
  has_5axis: boolean;
  max_spindle_speed: number;
  max_feed_rate: number;
  work_offset_count: number;
  program_complexity: number; // 0-1 normalized
}

export interface TrainingRecord {
  source_file?: string;
  features: ProgramFeatures;
  controller_label: string;
  operation_labels: string[];
  complexity_label: "simple" | "moderate" | "complex" | "expert";
  quality_score: number; // 0-1, how clean/consistent the program is
}

export interface PipelineStats {
  programs_processed: number;
  total_lines_parsed: number;
  total_operations: number;
  controller_distribution: Record<string, number>;
  operation_distribution: Record<string, number>;
  avg_complexity: number;
}

// ── G-code patterns ───────────────────────────────────────────────────

const G_RAPID = /G0(?!\d)/i;
const G_LINEAR = /G0?1(?!\d)/i;
const G_ARC_CW = /G0?2(?!\d)/i;
const G_ARC_CCW = /G0?3(?!\d)/i;
const G_DRILL = /G8[1-9]|G73|CYCLE8[12]/i;
const G_TOOL = /T\d+\s*M0?6|M0?6\s*T\d+|TOOL\s+CALL/i;
const G_SPINDLE = /M0?[345]\b|S\d+/i;
const G_COOLANT = /M0?[789]\b|COOLANT/i;
const G_COMMENT = /^\s*[;(]|^\s*\//;
const G_PROG = /^[%ON]|M0?2\b|M30|RET|EXTERN/i;
const G_OFFSET = /G5[4-9]|G54\.1|G10\s*L2|\$P_UIFR/i;
const G_SUB = /M98|M99|CALL|EXTERN|GOTOF|GOTOB/i;
const G_MACRO = /G65|G66|#\d+|DEF\s+(REAL|INT)|IF\s+/i;
const G_PROBE = /G65\s*P98|G31|PROBE|MEAS/i;
const G_5AXIS = /G43\.4|G43\.5|TRAORI|PLANE\s+SPATIAL|TCPC|RTCP|G68\.2/i;

// ── Engine ─────────────────────────────────────────────────────────────

export class PPTrainingDataPipelineEngine {
  private stats: PipelineStats = {
    programs_processed: 0, total_lines_parsed: 0, total_operations: 0,
    controller_distribution: {}, operation_distribution: {}, avg_complexity: 0,
  };

  /**
   * Process a single G-code program into a training record.
   */
  processProgram(gcode: string, sourceFile?: string): TrainingRecord {
    const lines = gcode.split(/\r?\n/);
    const blocks = this.parseBlocks(lines);
    const operations = this.extractOperations(blocks);
    const features = this.extractFeatures(lines, blocks, operations);

    const controllerLabel = features.controller_dialect.family;
    const operationLabels = [...new Set(operations.map(o => o.operation_type))];

    const complexity = features.program_complexity;
    const complexityLabel: TrainingRecord["complexity_label"] =
      complexity < 0.25 ? "simple" : complexity < 0.5 ? "moderate" :
      complexity < 0.75 ? "complex" : "expert";

    const quality = this.assessQuality(blocks, features);

    // Update stats
    this.stats.programs_processed++;
    this.stats.total_lines_parsed += lines.length;
    this.stats.total_operations += operations.length;
    this.stats.controller_distribution[controllerLabel] =
      (this.stats.controller_distribution[controllerLabel] ?? 0) + 1;
    for (const op of operationLabels) {
      this.stats.operation_distribution[op] = (this.stats.operation_distribution[op] ?? 0) + 1;
    }
    this.stats.avg_complexity =
      (this.stats.avg_complexity * (this.stats.programs_processed - 1) + complexity) /
      this.stats.programs_processed;

    return {
      source_file: sourceFile,
      features,
      controller_label: controllerLabel,
      operation_labels: operationLabels,
      complexity_label: complexityLabel,
      quality_score: quality,
    };
  }

  /**
   * Process multiple programs (batch).
   */
  processBatch(programs: Array<{ gcode: string; file?: string }>): TrainingRecord[] {
    return programs.map(p => this.processProgram(p.gcode, p.file));
  }

  /** Get pipeline statistics. */
  getStats(): PipelineStats {
    return { ...this.stats };
  }

  /** Reset pipeline statistics. */
  resetStats(): void {
    this.stats = {
      programs_processed: 0, total_lines_parsed: 0, total_operations: 0,
      controller_distribution: {}, operation_distribution: {}, avg_complexity: 0,
    };
  }

  // ── Parse ────────────────────────────────────────────────────────────

  private parseBlocks(lines: string[]): GCodeBlock[] {
    const blocks: GCodeBlock[] = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) continue;

      const block: GCodeBlock = {
        line_number: i + 1,
        raw,
        type: "unknown",
        g_codes: [],
        m_codes: [],
        parameters: {},
      };

      // Extract G-codes
      const gMatches = raw.match(/G\d+\.?\d*/gi);
      if (gMatches) block.g_codes = gMatches.map(g => g.toUpperCase());

      // Extract M-codes
      const mMatches = raw.match(/M\d+\.?\d*/gi);
      if (mMatches) block.m_codes = mMatches.map(m => m.toUpperCase());

      // Extract parameters (X, Y, Z, F, S, etc.)
      const paramMatches = raw.matchAll(/([A-Z])([+-]?\d+\.?\d*)/gi);
      for (const m of paramMatches) {
        const key = m[1].toUpperCase();
        if (!["G", "M", "N", "O"].includes(key)) {
          block.parameters[key] = parseFloat(m[2]);
        }
      }

      // Extract comment
      const commentMatch = raw.match(/\(([^)]*)\)|;(.*)/);
      if (commentMatch) block.comment = commentMatch[1] ?? commentMatch[2];

      // Classify block type
      if (G_COMMENT.test(raw)) block.type = "comment";
      else if (G_TOOL.test(raw)) block.type = "tool_change";
      else if (G_PROBE.test(raw)) block.type = "probe";
      else if (G_DRILL.test(raw)) block.type = "drill_cycle";
      else if (G_ARC_CW.test(raw)) block.type = "arc_cw";
      else if (G_ARC_CCW.test(raw)) block.type = "arc_ccw";
      else if (G_RAPID.test(raw)) block.type = "rapid";
      else if (G_LINEAR.test(raw)) block.type = "linear";
      else if (G_SPINDLE.test(raw)) block.type = "spindle";
      else if (G_COOLANT.test(raw)) block.type = "coolant";
      else if (G_OFFSET.test(raw)) block.type = "work_offset";
      else if (G_SUB.test(raw)) block.type = "subprogram";
      else if (G_MACRO.test(raw)) block.type = "macro";
      else if (G_PROG.test(raw)) block.type = "program_ctrl";

      blocks.push(block);
    }

    return blocks;
  }

  // ── Extract operations ───────────────────────────────────────────────

  private extractOperations(blocks: GCodeBlock[]): OperationSegment[] {
    const operations: OperationSegment[] = [];
    let currentTool = 0;
    let opStart = 0;
    let opBlocks: GCodeBlock[] = [];

    for (const block of blocks) {
      if (block.type === "tool_change") {
        // Save previous operation
        if (opBlocks.length > 0) {
          operations.push(this.buildSegment(opStart, block.line_number - 1, currentTool, opBlocks));
        }
        // Extract tool number
        const tMatch = block.raw.match(/T(\d+)/i);
        currentTool = tMatch ? parseInt(tMatch[1]) : currentTool + 1;
        opStart = block.line_number;
        opBlocks = [];
      } else {
        opBlocks.push(block);
      }
    }

    // Final operation
    if (opBlocks.length > 0) {
      const lastLine = blocks[blocks.length - 1]?.line_number ?? opStart;
      operations.push(this.buildSegment(opStart, lastLine, currentTool, opBlocks));
    }

    return operations;
  }

  private buildSegment(start: number, end: number, tool: number, blocks: GCodeBlock[]): OperationSegment {
    const total = blocks.length;
    const rapids = blocks.filter(b => b.type === "rapid").length;
    const arcs = blocks.filter(b => b.type === "arc_cw" || b.type === "arc_ccw").length;
    const drills = blocks.filter(b => b.type === "drill_cycle").length;

    // Find spindle speed and feed rate
    let maxS = 0, maxF = 0, hasCoolant = false;
    for (const b of blocks) {
      if (b.parameters.S && b.parameters.S > maxS) maxS = b.parameters.S;
      if (b.parameters.F && b.parameters.F > maxF) maxF = b.parameters.F;
      if (b.type === "coolant") hasCoolant = true;
    }

    // Classify operation type
    let opType: OperationSegment["operation_type"] = "unknown";
    if (drills > 0) {
      const hasTap = blocks.some(b => b.g_codes.includes("G84"));
      opType = hasTap ? "tapping" : "drilling";
    } else if (arcs > total * 0.3) {
      opType = "contouring";
    } else if (rapids > total * 0.5) {
      opType = "roughing";
    } else if (maxF > 0 && maxF < 100) {
      opType = "finishing";
    } else if (total > 5) {
      opType = maxF > 200 ? "roughing" : "finishing";
    }

    return {
      start_line: start, end_line: end, tool_number: tool,
      operation_type: opType, spindle_speed: maxS || undefined,
      feed_rate: maxF || undefined, coolant: hasCoolant,
      block_count: total, rapid_pct: total > 0 ? round2(rapids / total) : 0,
      arc_pct: total > 0 ? round2(arcs / total) : 0,
    };
  }

  // ── Feature extraction ───────────────────────────────────────────────

  private extractFeatures(lines: string[], blocks: GCodeBlock[], ops: OperationSegment[]): ProgramFeatures {
    const fullText = lines.join("\n");
    const dialectInference = ppDialectTransferEngine.inferFamily(lines.slice(0, 20));

    const tools = new Set(ops.map(o => o.tool_number));
    const maxS = Math.max(0, ...ops.map(o => o.spindle_speed ?? 0));
    const maxF = Math.max(0, ...ops.map(o => o.feed_rate ?? 0));
    const offsets = new Set(blocks.filter(b => b.type === "work_offset").flatMap(b => b.g_codes));

    // Complexity score
    const complexity = this.computeComplexity(blocks, ops, fullText);

    return {
      total_lines: lines.length,
      total_blocks: blocks.length,
      tool_changes: blocks.filter(b => b.type === "tool_change").length,
      unique_tools: tools.size,
      operations: ops,
      controller_dialect: { family: dialectInference.family, confidence: dialectInference.confidence },
      has_subprograms: blocks.some(b => b.type === "subprogram"),
      has_macros: blocks.some(b => b.type === "macro"),
      has_probing: blocks.some(b => b.type === "probe"),
      has_canned_cycles: blocks.some(b => b.type === "drill_cycle"),
      has_5axis: G_5AXIS.test(fullText),
      max_spindle_speed: maxS,
      max_feed_rate: maxF,
      work_offset_count: offsets.size,
      program_complexity: complexity,
    };
  }

  private computeComplexity(blocks: GCodeBlock[], ops: OperationSegment[], text: string): number {
    let score = 0;
    // Line count contribution (0-0.2)
    score += Math.min(0.2, blocks.length / 5000);
    // Tool count (0-0.2)
    score += Math.min(0.2, ops.length / 20);
    // Arc percentage (0-0.15)
    const arcBlocks = blocks.filter(b => b.type === "arc_cw" || b.type === "arc_ccw").length;
    score += Math.min(0.15, (arcBlocks / Math.max(blocks.length, 1)) * 0.5);
    // 5-axis (0.15)
    if (G_5AXIS.test(text)) score += 0.15;
    // Macros (0.1)
    if (blocks.some(b => b.type === "macro")) score += 0.1;
    // Subprograms (0.1)
    if (blocks.some(b => b.type === "subprogram")) score += 0.1;
    // Probing (0.1)
    if (blocks.some(b => b.type === "probe")) score += 0.1;
    return Math.min(1, score);
  }

  // ── Quality assessment ───────────────────────────────────────────────

  private assessQuality(blocks: GCodeBlock[], features: ProgramFeatures): number {
    let score = 1.0;
    // Penalize programs with no tool changes (likely incomplete)
    if (features.tool_changes === 0) score -= 0.2;
    // Penalize no coolant
    if (!blocks.some(b => b.type === "coolant")) score -= 0.1;
    // Penalize very short programs
    if (features.total_lines < 10) score -= 0.3;
    // Penalize no feed rate found
    if (features.max_feed_rate === 0) score -= 0.2;
    // Reward safe start block
    if (blocks.some(b => b.g_codes.includes("G90") || b.g_codes.includes("G21"))) score += 0.1;
    // Reward program end (M30)
    if (blocks.some(b => b.m_codes.includes("M30") || b.m_codes.includes("M2"))) score += 0.1;
    return Math.max(0, Math.min(1, round2(score)));
  }
}

function round2(x: number): number { return Math.round(x * 100) / 100; }

export const ppTrainingDataPipelineEngine = new PPTrainingDataPipelineEngine();
