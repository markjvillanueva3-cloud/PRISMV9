/**
 * LatheProgramGeneratorEngine — G-Code Generation from Toolpath Plan
 *
 * U-LTH36: Generates complete lathe G-code programs from toolpath plans.
 * Takes ToolpathPlan and produces machine-ready NC code.
 *
 * Output formats:
 *   - Okuma OSP (default for JM Die)
 *   - Fanuc
 *   - Generic ISO
 *
 * @module LatheProgramGeneratorEngine
 */

import type {
  ToolpathPlan,
  ToolpathSegment,
  ToolChange,
} from "./LatheToolpathPlannerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Supported controller formats */
export type ControllerFormat = "okuma_osp" | "fanuc" | "generic_iso";

/** Program header configuration */
export interface ProgramHeader {
  program_number: number;
  program_name: string;
  part_number?: string;
  customer?: string;
  material?: string;
  revision?: string;
  date?: string;
  operator?: string;
  machine_id?: string;
}

/** Program generation configuration */
export interface ProgramGenerationConfig {
  controller: ControllerFormat;
  header: ProgramHeader;

  // Formatting
  include_line_numbers?: boolean;
  line_number_start?: number;
  line_number_increment?: number;
  decimal_places?: number;

  // Safety
  include_safety_lines?: boolean;
  home_position_x?: number;
  home_position_z?: number;

  // Cycles
  use_canned_cycles?: boolean;

  // Comments
  include_comments?: boolean;
  include_operation_headers?: boolean;
}

/** Generated program output */
export interface GeneratedProgram {
  program_id: string;
  plan_id: string;
  processing_time_ms: number;

  // Output
  gcode: string;
  line_count: number;
  character_count: number;

  // Program info
  header: ProgramHeader;
  controller: ControllerFormat;

  // Statistics
  tool_calls: number;
  cycle_calls: number;
  estimated_runtime_sec: number;

  // Validation
  warnings: string[];
  errors: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<ProgramGenerationConfig, "header" | "controller">> = {
  include_line_numbers: true,
  line_number_start: 10,
  line_number_increment: 10,
  decimal_places: 3,
  include_safety_lines: true,
  home_position_x: 200,
  home_position_z: 300,
  use_canned_cycles: true,
  include_comments: true,
  include_operation_headers: true
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheProgramGeneratorEngine {
  private programCounter = 0;

  /**
   * Generate G-code program from toolpath plan
   */
  generate(plan: ToolpathPlan, config: ProgramGenerationConfig): GeneratedProgram {
    const startTime = Date.now();
    const programId = `prog_${++this.programCounter}_${Date.now()}`;

    const cfg = { ...DEFAULT_CONFIG, ...config };
    const warnings: string[] = [];
    const errors: string[] = [];
    const lines: string[] = [];

    let lineNum = cfg.line_number_start;
    const addLine = (code: string, comment?: string) => {
      let line = cfg.include_line_numbers ? `N${lineNum} ` : "";
      line += code;
      if (comment && cfg.include_comments) {
        line += ` (${comment})`;
      }
      lines.push(line);
      lineNum += cfg.line_number_increment;
    };

    const addComment = (comment: string) => {
      if (cfg.include_comments) {
        lines.push(`(${comment})`);
      }
    };

    // Generate header
    this.generateHeader(lines, config.header, config.controller);

    // Safety block
    if (cfg.include_safety_lines) {
      this.generateSafetyBlock(lines, addLine, config.controller);
    }

    // Process each tool change and its segments
    let toolCalls = 0;
    let cycleCalls = 0;

    for (const toolChange of plan.tool_changes) {
      toolCalls++;

      // Tool change comment
      if (cfg.include_operation_headers) {
        addComment(`--- TOOL ${toolChange.tool_number}: ${toolChange.tool_description} ---`);
      }

      // Tool call
      this.generateToolCall(addLine, toolChange, config.controller);

      // Get segments for this tool
      const toolSegments = plan.segments.filter(s =>
        toolChange.segments.includes(s.id)
      );

      // Generate code for each segment
      for (const segment of toolSegments) {
        if (segment.cycle_type && cfg.use_canned_cycles) {
          cycleCalls++;
          this.generateCycleCode(addLine, segment, config.controller);
        } else {
          this.generateLinearCode(addLine, segment, config.controller, cfg.decimal_places);
        }
      }

      // Return to safe position
      addLine(`G00 X${cfg.home_position_x} Z${cfg.home_position_z}`, "Return to safe position");
    }

    // Program end
    this.generateProgramEnd(lines, addLine, config.controller);

    const gcode = lines.join("\n");

    return {
      program_id: programId,
      plan_id: plan.plan_id,
      processing_time_ms: Date.now() - startTime,

      gcode,
      line_count: lines.length,
      character_count: gcode.length,

      header: config.header,
      controller: config.controller,

      tool_calls: toolCalls,
      cycle_calls: cycleCalls,
      estimated_runtime_sec: plan.total_cycle_time_sec,

      warnings,
      errors
    };
  }

  /**
   * Get engine statistics
   */
  getStatistics(): {
    total_programs: number;
    supported_controllers: ControllerFormat[];
    supported_cycles: string[];
  } {
    return {
      total_programs: this.programCounter,
      supported_controllers: ["okuma_osp", "fanuc", "generic_iso"],
      supported_cycles: ["G71", "G72", "G73", "G74", "G75", "G76", "G81", "G83"]
    };
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  private generateHeader(
    lines: string[],
    header: ProgramHeader,
    controller: ControllerFormat
  ): void {
    const date = header.date || new Date().toISOString().split("T")[0];

    if (controller === "okuma_osp") {
      lines.push(`O${String(header.program_number).padStart(4, "0")}`);
      lines.push(`(${header.program_name})`);
      if (header.part_number) lines.push(`(PART: ${header.part_number})`);
      if (header.customer) lines.push(`(CUSTOMER: ${header.customer})`);
      if (header.material) lines.push(`(MATERIAL: ${header.material})`);
      lines.push(`(DATE: ${date})`);
      if (header.machine_id) lines.push(`(MACHINE: ${header.machine_id})`);
      lines.push(`(GENERATED BY PRISM)`);
      lines.push("");
    } else if (controller === "fanuc") {
      lines.push(`%`);
      lines.push(`O${header.program_number}`);
      lines.push(`(${header.program_name})`);
      if (header.part_number) lines.push(`(PART NO. ${header.part_number})`);
      if (header.material) lines.push(`(MATERIAL ${header.material})`);
      lines.push(`(DATE ${date})`);
      lines.push(`(PRISM GENERATED)`);
      lines.push("");
    } else {
      lines.push(`%`);
      lines.push(`O${header.program_number} (${header.program_name})`);
      if (header.part_number) lines.push(`(PART: ${header.part_number})`);
      lines.push(`(DATE: ${date})`);
      lines.push("");
    }
  }

  private generateSafetyBlock(
    lines: string[],
    addLine: (code: string, comment?: string) => void,
    controller: ControllerFormat
  ): void {
    lines.push("(SAFETY BLOCK)");

    if (controller === "okuma_osp") {
      addLine("G40 G80", "Cancel cutter comp, canned cycles");
      addLine("G50 S3000", "Max spindle speed");
      addLine("G28 U0 W0", "Home axes");
    } else if (controller === "fanuc") {
      addLine("G40 G80 G99", "Cancel cutter comp, cycles, feed per rev");
      addLine("G50 S3000", "Max spindle speed clamp");
      addLine("G28 U0 W0", "Return to reference");
    } else {
      addLine("G40 G80", "Cancel compensation and cycles");
      addLine("G28 U0 W0", "Home position");
    }

    lines.push("");
  }

  private generateToolCall(
    addLine: (code: string, comment?: string) => void,
    toolChange: ToolChange,
    controller: ControllerFormat
  ): void {
    const toolNum = String(toolChange.tool_number).padStart(2, "0");

    if (controller === "okuma_osp") {
      addLine(`T${toolNum}${toolNum}`, `Tool ${toolChange.tool_number}`);
    } else if (controller === "fanuc") {
      addLine(`T${toolNum}${toolNum}`, `Select tool ${toolChange.tool_number}`);
    } else {
      addLine(`T${toolNum} M06`, `Tool change`);
    }
  }

  private generateCycleCode(
    addLine: (code: string, comment?: string) => void,
    segment: ToolpathSegment,
    controller: ControllerFormat
  ): void {
    const { cycle_type, cycle_params, spindle_rpm, feed_mmrev } = segment;

    // Start spindle
    addLine(`G96 S${Math.round(segment.surface_speed_mmin || 150)} M03`, "CSS mode, spindle CW");

    if (!cycle_type || !cycle_params) {
      this.generateLinearCode(addLine, segment, controller, 3);
      return;
    }

    switch (cycle_type) {
      case "G71": // OD Rough Turning
        if (controller === "okuma_osp") {
          addLine(
            `G71 U${cycle_params.D / 1000} R${cycle_params.R || 0.5}`,
            "Rough turning cycle"
          );
          addLine(
            `G71 P100 Q200 U${cycle_params.U} W${cycle_params.W || 0.1} F${feed_mmrev}`,
            "Profile reference"
          );
        } else {
          addLine(
            `G71 U${cycle_params.D / 1000} R${cycle_params.R || 0.5}`,
            "Rough turning"
          );
          addLine(
            `G71 P100 Q200 U${cycle_params.U} W${cycle_params.W || 0.1} F${feed_mmrev}`,
            ""
          );
        }
        // Profile definition placeholder
        addLine("N100 G00 X0", "Profile start");
        addLine(`N200 G01 X${segment.end_point.x * 2} Z${segment.end_point.z}`, "Profile end");
        break;

      case "G72": // Facing Cycle
        addLine(
          `G72 W${cycle_params.D / 1000} R${cycle_params.R || 0.5}`,
          "Facing cycle"
        );
        addLine(`G72 P100 Q200 U${cycle_params.U || 0.5} W0.1 F${feed_mmrev}`, "");
        addLine("N100 G00 Z0", "Face start");
        addLine(`N200 G01 X${segment.end_point.x * 2}`, "Face end");
        break;

      case "G76": // Threading
        addLine(`G97 S${Math.min(spindle_rpm || 800, 1000)} M03`, "Constant RPM for threading");
        if (controller === "okuma_osp") {
          addLine(
            `G76 P0${Math.round(cycle_params.A || 60)}0060 Q${cycle_params.Q || 100} R0.05`,
            "Thread setup"
          );
          addLine(
            `G76 X${segment.end_point.x * 2} Z${segment.end_point.z} P${cycle_params.K} Q${cycle_params.D || 50} F${cycle_params.P / 1000}`,
            "Thread execute"
          );
        } else {
          addLine(
            `G76 P0${Math.round(cycle_params.A || 60)}0060 Q${cycle_params.Q || 100} R0.05`,
            "Thread cycle"
          );
          addLine(
            `G76 X${segment.end_point.x * 2} Z${segment.end_point.z} R0 P${cycle_params.K} Q${cycle_params.D || 50} F${cycle_params.P / 1000}`,
            ""
          );
        }
        break;

      case "G75": // Grooving
        addLine(
          `G75 R${cycle_params.R || 0.5}`,
          "Grooving cycle"
        );
        addLine(
          `G75 X${cycle_params.X} Z${cycle_params.Z} P3000 Q3000 F0.08`,
          ""
        );
        break;

      case "G83": // Peck Drilling
        addLine(`G97 S${spindle_rpm || 1500} M03`, "Constant RPM for drilling");
        addLine(
          `G83 Z${cycle_params.Z} Q${cycle_params.Q} R${cycle_params.R} F${feed_mmrev || 0.15}`,
          "Peck drill"
        );
        addLine("G80", "Cancel cycle");
        break;

      default:
        addLine(`(Unsupported cycle: ${cycle_type})`, "");
        this.generateLinearCode(addLine, segment, controller, 3);
    }
  }

  private generateLinearCode(
    addLine: (code: string, comment?: string) => void,
    segment: ToolpathSegment,
    controller: ControllerFormat,
    decimals: number
  ): void {
    const fmt = (n: number) => n.toFixed(decimals);

    // Start spindle if not already running
    if (segment.spindle_rpm) {
      addLine(`G96 S${Math.round(segment.surface_speed_mmin || 150)} M03`, "CSS spindle CW");
    }

    // Rapid to start
    addLine(
      `G00 X${fmt(segment.start_point.x * 2)} Z${fmt(segment.start_point.z)}`,
      "Rapid to start"
    );

    // Cutting move
    const gCode = segment.path_type === "rapid" ? "G00" :
      segment.path_type === "arc_cw" ? "G02" :
        segment.path_type === "arc_ccw" ? "G03" : "G01";

    let moveCode = `${gCode} X${fmt(segment.end_point.x * 2)} Z${fmt(segment.end_point.z)}`;

    if (segment.path_type !== "rapid" && segment.feed_mmrev) {
      moveCode += ` F${segment.feed_mmrev}`;
    }

    addLine(moveCode, segment.operation);
  }

  private generateProgramEnd(
    lines: string[],
    addLine: (code: string, comment?: string) => void,
    controller: ControllerFormat
  ): void {
    lines.push("");
    lines.push("(PROGRAM END)");

    if (controller === "okuma_osp") {
      addLine("M05", "Spindle stop");
      addLine("M09", "Coolant off");
      addLine("G28 U0 W0", "Home");
      addLine("M30", "Program end");
    } else if (controller === "fanuc") {
      addLine("M05", "Spindle off");
      addLine("M09", "Coolant off");
      addLine("G28 U0 W0", "Return home");
      addLine("M30", "End program");
      lines.push("%");
    } else {
      addLine("M05", "Stop spindle");
      addLine("M09", "Coolant off");
      addLine("G28 U0 W0", "Home");
      addLine("M30", "End");
      lines.push("%");
    }
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheProgramGeneratorEngine = new LatheProgramGeneratorEngine();
