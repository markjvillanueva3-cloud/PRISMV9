/**
 * LatheLoRAProgramMinerEngine — LATHE-LORA-MS0 U-LLR37
 * =====================================================
 *
 * Mines G-code programs for patterns, parameters, and practices.
 * Extracts training data from Okuma, Fanuc, and generic G-code.
 *
 * Features:
 *   - G-code pattern extraction (G01, G02, G83, etc.)
 *   - Parameter extraction (F, S, T, M codes)
 *   - Cycle detection (threading, drilling, turning)
 *   - Operation categorization
 *
 * @module engines/LatheLoRAProgramMinerEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Program dialect */
export type ProgramDialect = "okuma" | "fanuc" | "haas" | "mazak" | "generic";

/** Operation category */
export type OperationCategory =
  | "turning"
  | "facing"
  | "threading"
  | "drilling"
  | "grooving"
  | "boring"
  | "parting"
  | "unknown";

/** Extracted parameter */
export interface ExtractedParameter {
  line_number: number;
  code: string;
  value: number | string;
  unit?: string;
}

/** Detected cycle */
export interface DetectedCycle {
  id: string;
  type: string;
  operation: OperationCategory;
  start_line: number;
  end_line: number;
  parameters: Record<string, number>;
}

/** Mining result */
export interface MiningResult {
  id: string;
  program_id: string;
  dialect: ProgramDialect;
  total_lines: number;
  parameters: ExtractedParameter[];
  cycles: DetectedCycle[];
  operations: OperationCategory[];
  feed_rates: number[];
  spindle_speeds: number[];
  tools_used: string[];
  extracted_at: number;
}

/** Engine configuration */
export interface MinerConfig {
  default_dialect: ProgramDialect;
  max_programs_in_memory: number;
  enable_cycle_detection: boolean;
  min_line_length: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: MinerConfig = {
  default_dialect: "okuma",
  max_programs_in_memory: 100,
  enable_cycle_detection: true,
  min_line_length: 2,
};

/** G-code to operation category mapping */
const GCODE_OPERATIONS: Record<string, OperationCategory> = {
  G00: "turning",
  G01: "turning",
  G02: "turning",
  G03: "turning",
  G32: "threading",
  G33: "threading",
  G34: "threading",
  G71: "turning",
  G72: "facing",
  G73: "turning",
  G74: "drilling",
  G75: "grooving",
  G76: "threading",
  G78: "threading",
  G81: "drilling",
  G82: "drilling",
  G83: "drilling",
  G84: "drilling",
  G85: "boring",
  G86: "boring",
  G87: "boring",
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAProgramMinerEngine {
  private config: MinerConfig = DEFAULT_CONFIG;
  private results: MiningResult[] = [];

  /**
   * Set configuration
   */
  setConfig(config: Partial<MinerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): MinerConfig {
    return { ...this.config };
  }

  /**
   * Detect dialect from program text
   */
  detectDialect(programText: string): ProgramDialect {
    const lower = programText.toLowerCase().slice(0, 2000);
    if (lower.includes("okuma") || lower.includes("osp")) return "okuma";
    if (lower.includes("fanuc") || lower.includes("o0")) return "fanuc";
    if (lower.includes("haas")) return "haas";
    if (lower.includes("mazak") || lower.includes("mazatrol")) return "mazak";
    return this.config.default_dialect;
  }

  /**
   * Extract numeric parameter from a G-code line
   */
  private extractParamValue(line: string, letter: string): number | null {
    const re = new RegExp(`${letter}([-+]?\\d+\\.?\\d*)`);
    const m = line.match(re);
    return m ? parseFloat(m[1]) : null;
  }

  /**
   * Categorize operation from G-code word
   */
  categorizeOperation(gcode: string): OperationCategory {
    const normalized = gcode.toUpperCase().trim();
    return GCODE_OPERATIONS[normalized] || "unknown";
  }

  /**
   * Mine a program
   */
  mineProgram(programId: string, programText: string, dialect?: ProgramDialect): MiningResult {
    const detectedDialect = dialect || this.detectDialect(programText);
    const lines = programText.split(/\r?\n/);

    const parameters: ExtractedParameter[] = [];
    const operationsSet = new Set<OperationCategory>();
    const feedRates: number[] = [];
    const spindleSpeeds: number[] = [];
    const tools: Set<string> = new Set();
    const cycles: DetectedCycle[] = [];

    let currentCycleStart: number | null = null;
    let currentCycleType: string | null = null;
    let currentCycleOperation: OperationCategory = "unknown";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < this.config.min_line_length) continue;

      // Extract G-code
      const gMatch = line.match(/\bG(\d+)/);
      if (gMatch) {
        const gcode = `G${gMatch[1].padStart(2, "0").slice(0, 2)}`;
        const op = this.categorizeOperation(gcode);
        if (op !== "unknown") operationsSet.add(op);

        parameters.push({ line_number: i + 1, code: gcode, value: gMatch[1] });

        // Cycle detection (G71-G76 are macro cycles)
        if (this.config.enable_cycle_detection) {
          const cycleNum = parseInt(gMatch[1]);
          if (cycleNum >= 70 && cycleNum <= 89) {
            if (currentCycleStart === null) {
              currentCycleStart = i + 1;
              currentCycleType = gcode;
              currentCycleOperation = op;
            }
          }
        }
      }

      // Extract feed rate (F)
      const fVal = this.extractParamValue(line, "F");
      if (fVal !== null) {
        feedRates.push(fVal);
        parameters.push({ line_number: i + 1, code: "F", value: fVal });
      }

      // Extract spindle speed (S)
      const sVal = this.extractParamValue(line, "S");
      if (sVal !== null) {
        spindleSpeeds.push(sVal);
        parameters.push({ line_number: i + 1, code: "S", value: sVal });
      }

      // Extract tool (T)
      const tMatch = line.match(/\bT(\d+)/);
      if (tMatch) {
        tools.add(`T${tMatch[1]}`);
        parameters.push({ line_number: i + 1, code: "T", value: tMatch[1] });
      }

      // Close cycle on M30/M02 or new G-code block header
      if (currentCycleStart !== null && (line.includes("M30") || line.includes("M02"))) {
        cycles.push({
          id: `cycle-${Date.now()}-${cycles.length}`,
          type: currentCycleType || "unknown",
          operation: currentCycleOperation,
          start_line: currentCycleStart,
          end_line: i + 1,
          parameters: {},
        });
        currentCycleStart = null;
        currentCycleType = null;
      }
    }

    // Close any open cycle
    if (currentCycleStart !== null) {
      cycles.push({
        id: `cycle-${Date.now()}-${cycles.length}`,
        type: currentCycleType || "unknown",
        operation: currentCycleOperation,
        start_line: currentCycleStart,
        end_line: lines.length,
        parameters: {},
      });
    }

    const result: MiningResult = {
      id: `mine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      program_id: programId,
      dialect: detectedDialect,
      total_lines: lines.length,
      parameters,
      cycles,
      operations: Array.from(operationsSet),
      feed_rates: feedRates,
      spindle_speeds: spindleSpeeds,
      tools_used: Array.from(tools),
      extracted_at: Date.now(),
    };

    this.results.push(result);

    // Trim history
    if (this.results.length > this.config.max_programs_in_memory) {
      this.results = this.results.slice(-this.config.max_programs_in_memory);
    }

    return result;
  }

  /**
   * Get results
   */
  getResults(limit?: number): MiningResult[] {
    const list = [...this.results];
    return limit ? list.slice(-limit) : list;
  }

  /**
   * Find results by operation
   */
  findByOperation(op: OperationCategory): MiningResult[] {
    return this.results.filter(r => r.operations.includes(op));
  }

  /**
   * Aggregate statistics across all mined programs
   */
  getAggregateStats(): {
    total_programs: number;
    total_lines: number;
    avg_lines_per_program: number;
    unique_operations: OperationCategory[];
    dialect_distribution: Record<string, number>;
    avg_feed_rate: number;
    avg_spindle_speed: number;
    unique_tools_count: number;
  } {
    const total = this.results.length;
    if (total === 0) {
      return {
        total_programs: 0,
        total_lines: 0,
        avg_lines_per_program: 0,
        unique_operations: [],
        dialect_distribution: {},
        avg_feed_rate: 0,
        avg_spindle_speed: 0,
        unique_tools_count: 0,
      };
    }

    const totalLines = this.results.reduce((s, r) => s + r.total_lines, 0);
    const opsSet = new Set<OperationCategory>();
    const dialectCount: Record<string, number> = {};
    const toolsSet = new Set<string>();
    let totalFeed = 0, feedCount = 0;
    let totalSpindle = 0, spindleCount = 0;

    for (const r of this.results) {
      for (const op of r.operations) opsSet.add(op);
      dialectCount[r.dialect] = (dialectCount[r.dialect] || 0) + 1;
      for (const t of r.tools_used) toolsSet.add(t);
      for (const f of r.feed_rates) { totalFeed += f; feedCount++; }
      for (const s of r.spindle_speeds) { totalSpindle += s; spindleCount++; }
    }

    return {
      total_programs: total,
      total_lines: totalLines,
      avg_lines_per_program: totalLines / total,
      unique_operations: Array.from(opsSet),
      dialect_distribution: dialectCount,
      avg_feed_rate: feedCount > 0 ? totalFeed / feedCount : 0,
      avg_spindle_speed: spindleCount > 0 ? totalSpindle / spindleCount : 0,
      unique_tools_count: toolsSet.size,
    };
  }

  /**
   * Generate training example from mining result
   */
  toTrainingExample(result: MiningResult): { prompt: string; completion: string } {
    const operations = result.operations.join(", ");
    const avgFeed = result.feed_rates.length > 0
      ? result.feed_rates.reduce((a, b) => a + b, 0) / result.feed_rates.length
      : 0;
    const avgSpindle = result.spindle_speeds.length > 0
      ? result.spindle_speeds.reduce((a, b) => a + b, 0) / result.spindle_speeds.length
      : 0;

    const prompt = `Generate ${result.dialect} lathe program for operations: ${operations || "turning"}`;
    const completion = `Program has ${result.total_lines} lines, ${result.cycles.length} cycles, uses ${result.tools_used.length} tools. Avg feed: ${avgFeed.toFixed(3)}, avg RPM: ${avgSpindle.toFixed(0)}.`;

    return { prompt, completion };
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getAggregateStats();
    const lines = [
      "Program Miner Summary",
      "=====================",
      `Programs Mined: ${stats.total_programs}`,
      `Total Lines: ${stats.total_lines}`,
      `Avg Lines/Program: ${stats.avg_lines_per_program.toFixed(0)}`,
      `Avg Feed Rate: ${stats.avg_feed_rate.toFixed(3)}`,
      `Avg Spindle: ${stats.avg_spindle_speed.toFixed(0)} RPM`,
      `Unique Tools: ${stats.unique_tools_count}`,
      `Operations: ${stats.unique_operations.join(", ")}`,
      "",
      "Dialects:",
    ];
    for (const [dialect, count] of Object.entries(stats.dialect_distribution)) {
      lines.push(`  ${dialect}: ${count}`);
    }
    return lines.join("\n");
  }

  /**
   * Clear results
   */
  clear(): void {
    this.results = [];
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.results = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAProgramMinerEngine = new LatheLoRAProgramMinerEngine();
