/**
 * PRISM MCP Server - Program Structure Engine
 *
 * Assembles complete NC programs from novel algorithm results (TGAR, HRAF,
 * CFSF, MTHZD, PTDC, VCER, etc.) with proper program structure, safety
 * blocks, tool changes, and automatic setup-sheet generation.
 *
 * Exported API:
 *   assemble(input)  → ProgramStructureResult
 *
 * No external imports — pure computation.
 *
 * @version 1.0.0
 * @module ProgramStructureEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** Atomic value wrapper for typed numeric returns. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

/** Single tool descriptor within a program operation. */
export interface ProgramTool {
  number: number;
  diameter_mm: number;
  length_mm: number;
  description: string;
}

/** One machining operation to insert into the NC program. */
export interface ProgramOperation {
  tool: ProgramTool;
  algorithm_name: string;
  gcode_blocks: string[];
  spindle_rpm: number;
  coolant: "flood" | "mist" | "off";
  type: "roughing" | "semi_finish" | "finishing" | "drilling";
}

/** Full input to the assembler. */
export interface ProgramStructureInput {
  operations: ProgramOperation[];
  program_number?: number;
  work_offset?: string;
  safe_z_mm?: number;
  machine_home?: { x: number; y: number; z: number };
  material?: string;
  part_name?: string;
  operator_notes?: string;
}

/** Setup sheet embedded in the result. */
export interface SetupSheet {
  part_name: string;
  material: string;
  tools_used: { num: number; desc: string; diameter: number }[];
  work_offset: string;
  operations: { seq: number; tool: number; algorithm: string; type: string }[];
  estimated_time_sec: number;
  notes: string[];
}

/** Assembler output. */
export interface ProgramStructureResult {
  program: string;
  setup_sheet: SetupSheet;
  total_lines: number;
  tool_changes: number;
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PROGRAM_NUMBER = 1000;
const DEFAULT_WORK_OFFSET = "G54";
const DEFAULT_SAFE_Z = 50;
const DEFAULT_HOME = { x: 0, y: 0, z: 0 };

/** Approximate seconds per G-code line for naive time estimation. */
const SEC_PER_LINE = 0.45;

/** Feed-rate-weighted time factor for rapid vs cutting moves. */
const RAPID_TIME_FACTOR = 0.15;
const CUTTING_TIME_FACTOR = 0.55;

// ============================================================================
// ENGINE
// ============================================================================

/**
 * ProgramStructureEngine — assembles complete NC programs from novel
 * algorithm G-code segments, adding safety preamble, tool changes,
 * coolant control, and program termination.
 */
export class ProgramStructureEngine {
  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Assemble a complete NC program from one or more operations.
   */
  assemble(input: ProgramStructureInput): AtomicValue<ProgramStructureResult> {
    const warnings: string[] = [];
    const progNum = input.program_number ?? DEFAULT_PROGRAM_NUMBER;
    const workOffset = input.work_offset ?? DEFAULT_WORK_OFFSET;
    // U-PP-NONFINITE-EMIT-SWEEP: a non-finite safe_z_mm would emit a literal `ZNaN`/
    // `ZInfinity` retract the control rejects (`??` catches undefined, NOT NaN/Infinity).
    // Default to the known-safe retract height + warn -- a retract to a safe default is
    // safe, and this single source-guard covers all 3 safeZ emit sites (incl buildToolChange).
    const safeZ = Number.isFinite(input.safe_z_mm) ? (input.safe_z_mm as number) : DEFAULT_SAFE_Z;
    if (input.safe_z_mm !== undefined && !Number.isFinite(input.safe_z_mm)) {
      warnings.push(`Non-finite safe_z_mm (${input.safe_z_mm}) -- defaulted to ${DEFAULT_SAFE_Z}mm to avoid a literal ZNaN/ZInfinity retract the control rejects; verify the setup.`);
    }
    const home = input.machine_home ?? DEFAULT_HOME;
    const partName = input.part_name ?? "UNNAMED";
    const material = input.material ?? "UNKNOWN";

    if (input.operations.length === 0) {
      warnings.push("No operations supplied — empty program generated");
    }

    // Validate operations
    this.validateOperations(input.operations, warnings);

    const lines: string[] = [];

    // ---- Program header ----
    lines.push(...this.buildHeader(progNum, partName, material, input.operator_notes));

    // ---- Safety block ----
    lines.push(...this.buildSafetyBlock());

    // ---- Operations ----
    let toolChanges = 0;
    let prevToolNum = -1;

    for (let i = 0; i < input.operations.length; i++) {
      const op = input.operations[i];
      const seq = i + 1;

      lines.push("");
      lines.push(`(--- OPERATION ${seq}: ${op.algorithm_name} ${op.type.toUpperCase()} ---)`);

      // Tool change (skip if same tool consecutive)
      if (op.tool.number !== prevToolNum) {
        lines.push(...this.buildToolChange(op, workOffset, safeZ));
        toolChanges++;
        prevToolNum = op.tool.number;
      }

      // Spindle & coolant
      lines.push(...this.buildSpindleCoolant(op));

      // Rapid to safe Z then first XY position
      lines.push(`G00 Z${this.fmt(safeZ)} (RAPID TO SAFE Z)`);
      const firstXY = this.extractFirstXY(op.gcode_blocks);
      if (firstXY) {
        lines.push(`G00 ${firstXY} (RAPID TO START POSITION)`);
      }

      // Insert algorithm G-code blocks
      lines.push(`(BEGIN ${op.algorithm_name} OUTPUT - ${op.gcode_blocks.length} BLOCKS)`);
      for (const block of op.gcode_blocks) {
        lines.push(block);
      }
      lines.push(`(END ${op.algorithm_name} OUTPUT)`);

      // Retract
      lines.push(`G00 Z${this.fmt(safeZ)} (RETRACT TO SAFE Z)`);

      // Spindle / coolant off
      lines.push("M05 (SPINDLE OFF)");
      lines.push("M09 (COOLANT OFF)");
    }

    // ---- Program end ----
    lines.push(...this.buildFooter(home));

    const program = lines.join("\n");
    const totalLines = lines.length;

    // ---- Setup sheet ----
    const setupSheet = this.buildSetupSheet(
      input.operations,
      partName,
      material,
      workOffset,
      totalLines,
      warnings,
      input.operator_notes
    );

    const result: ProgramStructureResult = {
      program,
      setup_sheet: setupSheet,
      total_lines: totalLines,
      tool_changes: toolChanges,
      warnings,
    };

    return {
      value: result,
      unit: "nc_program",
      formula: "header + safety + Σ(tool_change + spindle + gcode + retract) + footer",
      confidence: warnings.length === 0 ? 0.95 : 0.8,
    };
  }

  // --------------------------------------------------------------------------
  // Header / Footer
  // --------------------------------------------------------------------------

  private buildHeader(
    progNum: number,
    partName: string,
    material: string,
    notes?: string
  ): string[] {
    const now = new Date().toISOString().slice(0, 10);
    const h: string[] = [
      "%",
      `O${String(progNum).padStart(4, "0")} (${partName})`,
      `(DATE: ${now})`,
      `(MATERIAL: ${material})`,
      "(GENERATED BY PRISM PROGRAM STRUCTURE ENGINE)",
    ];
    if (notes) {
      h.push(`(NOTE: ${notes})`);
    }
    h.push("");
    return h;
  }

  private buildSafetyBlock(): string[] {
    return [
      "(--- SAFETY PREAMBLE ---)",
      "G90 G40 G80 (ABSOLUTE, CANCEL CUTTER COMP & CANNED CYCLES)",
      "G17 (XY PLANE)",
      "G21 (METRIC MM)",
      "",
    ];
  }

  private buildFooter(home: { x: number; y: number; z: number }): string[] {
    return [
      "",
      "(--- PROGRAM END ---)",
      "G91 G28 Z0 (INCREMENTAL RETURN Z HOME)",
      `G28 X0 Y0 (RETURN XY HOME)`,
      "M30 (PROGRAM END & REWIND)",
      "%",
    ];
  }

  // --------------------------------------------------------------------------
  // Tool Change
  // --------------------------------------------------------------------------

  private buildToolChange(
    op: ProgramOperation,
    workOffset: string,
    safeZ: number
  ): string[] {
    const tn = op.tool.number;
    return [
      `T${tn} M06 (${op.tool.description} D${this.fmt(op.tool.diameter_mm)}mm)`,
      `${workOffset} (WORK OFFSET)`,
      `G43 H${tn} Z${this.fmt(safeZ)} (TOOL LENGTH COMP)`,
    ];
  }

  // --------------------------------------------------------------------------
  // Spindle & Coolant
  // --------------------------------------------------------------------------

  private buildSpindleCoolant(op: ProgramOperation): string[] {
    const lines: string[] = [];
    lines.push(`S${op.spindle_rpm} M03 (SPINDLE CW ${op.spindle_rpm} RPM)`);

    switch (op.coolant) {
      case "flood":
        lines.push("M08 (FLOOD COOLANT ON)");
        break;
      case "mist":
        lines.push("M07 (MIST COOLANT ON)");
        break;
      case "off":
        lines.push("(COOLANT OFF - DRY MACHINING)");
        break;
    }
    return lines;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /**
   * Extract the first X/Y coordinates from the G-code block array
   * so the rapid approach goes to the correct start position.
   */
  private extractFirstXY(blocks: string[]): string | null {
    for (const block of blocks) {
      const xMatch = block.match(/X([+-]?\d+\.?\d*)/);
      const yMatch = block.match(/Y([+-]?\d+\.?\d*)/);
      if (xMatch && yMatch) {
        return `X${xMatch[1]} Y${yMatch[1]}`;
      }
      if (xMatch) return `X${xMatch[1]}`;
    }
    return null;
  }

  /** Format a number to 3 decimal places, trimming trailing zeros. */
  private fmt(n: number): string {
    return parseFloat(n.toFixed(3)).toString();
  }

  /** Validate operations and collect warnings. */
  private validateOperations(ops: ProgramOperation[], warnings: string[]): void {
    const toolNums = new Set<number>();
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      if (op.gcode_blocks.length === 0) {
        warnings.push(`Operation ${i + 1} (${op.algorithm_name}) has no G-code blocks`);
      }
      if (op.spindle_rpm <= 0) {
        warnings.push(`Operation ${i + 1} has invalid spindle RPM: ${op.spindle_rpm}`);
      }
      if (op.tool.number < 1 || op.tool.number > 99) {
        warnings.push(`Operation ${i + 1} tool number ${op.tool.number} outside 1-99 range`);
      }
      if (op.tool.diameter_mm <= 0) {
        warnings.push(`Operation ${i + 1} tool diameter must be positive`);
      }
      toolNums.add(op.tool.number);
    }

    // Check for rough→finish ordering
    for (let i = 1; i < ops.length; i++) {
      if (ops[i].type === "roughing" && ops[i - 1].type === "finishing") {
        warnings.push(
          `Operation ${i + 1} is roughing after finishing (op ${i}) — verify sequence`
        );
      }
    }
  }

  /** Estimate cycle time from G-code block count and move types. */
  private estimateTimeSec(ops: ProgramOperation[]): number {
    let totalSec = 0;
    for (const op of ops) {
      for (const block of op.gcode_blocks) {
        const isRapid = block.startsWith("G00") || block.startsWith("G0 ");
        totalSec += isRapid ? RAPID_TIME_FACTOR : CUTTING_TIME_FACTOR;
      }
      // Add tool change overhead: ~8 sec per change
      totalSec += 8;
    }
    return Math.round(totalSec);
  }

  /** Build setup sheet from operation metadata. */
  private buildSetupSheet(
    ops: ProgramOperation[],
    partName: string,
    material: string,
    workOffset: string,
    totalLines: number,
    warnings: string[],
    notes?: string
  ): SetupSheet {
    const seenTools = new Map<number, { desc: string; diameter: number }>();
    const opEntries: { seq: number; tool: number; algorithm: string; type: string }[] = [];

    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      if (!seenTools.has(op.tool.number)) {
        seenTools.set(op.tool.number, {
          desc: op.tool.description,
          diameter: op.tool.diameter_mm,
        });
      }
      opEntries.push({
        seq: i + 1,
        tool: op.tool.number,
        algorithm: op.algorithm_name,
        type: op.type,
      });
    }

    const toolsUsed = Array.from(seenTools.entries()).map(([num, t]) => ({
      num,
      desc: t.desc,
      diameter: t.diameter,
    }));

    const sheetNotes: string[] = [];
    if (notes) sheetNotes.push(notes);
    if (warnings.length > 0) {
      sheetNotes.push(`${warnings.length} warning(s) — review before running`);
    }
    sheetNotes.push(`Total program lines: ${totalLines}`);

    return {
      part_name: partName,
      material,
      tools_used: toolsUsed,
      work_offset: workOffset,
      operations: opEntries,
      estimated_time_sec: this.estimateTimeSec(ops),
      notes: sheetNotes,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

/** Singleton instance for direct import. */
export const programStructureEngine = new ProgramStructureEngine();
