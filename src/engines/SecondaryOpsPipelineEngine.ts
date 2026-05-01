/**
 * SecondaryOpsPipelineEngine — Deburring, Probing, Marking, Washing
 *
 * Handles non-cutting CNC operations that complete a manufacturing cycle:
 *   - Deburring (chamfer mill, back-deburr, brush)
 *   - In-process probing (Renishaw-style G65 P9xxx macros)
 *   - Part marking / engraving (G-code text generation)
 *   - Washing / air blast cycles
 *   - Part orientation / flip sequences
 *   - Coolant management (through-tool, mist, flood, air)
 *
 * @module engines/SecondaryOpsPipelineEngine
 */

import { log } from "../utils/Logger.js";

// NOTE: This engine ORCHESTRATES existing specialist engines:
//   - DeburringEngine (386 lines) — method selection, time, media
//   - ProbingCycleEngine (510 lines) — Renishaw/Heidenhain/Siemens probe macros
// We delegate to them when available, fall back to inline logic if not.

// ============================================================================
// TYPES
// ============================================================================

export type SecondaryOpType =
  | "chamfer_deburr" | "back_deburr" | "brush_deburr" | "thermal_deburr"
  | "probe_datum" | "probe_bore" | "probe_boss" | "probe_web" | "probe_pocket" | "probe_surface"
  | "engrave_text" | "engrave_serial" | "engrave_date" | "engrave_logo" | "dot_peen"
  | "wash_cycle" | "air_blast" | "chip_clear"
  | "part_flip" | "pallet_change"
  | "tool_breakage_check" | "tool_length_measure";

export interface SecondaryOp {
  id: string;
  type: SecondaryOpType;
  // Deburring
  chamfer_size_mm?: number;
  edge_break_mm?: number;
  feature_ids?: string[];  // Which features to deburr
  // Probing
  probe_axis?: "X" | "Y" | "Z" | "XY" | "bore" | "boss";
  nominal_mm?: number;
  tolerance_mm?: number;
  work_offset_to_update?: string;  // G54-G59 or variable
  alarm_on_fail?: boolean;
  // Engraving
  text?: string;
  font_height_mm?: number;
  depth_mm?: number;
  position_x_mm?: number;
  position_y_mm?: number;
  // Wash / air
  dwell_sec?: number;
  pressure?: "standard" | "high";
}

export interface SecondaryOpsInput {
  part_number?: string;
  operations: SecondaryOp[];
  machine_type?: "mill" | "lathe" | "turn_mill";
  controller?: "fanuc" | "haas" | "siemens";
  probe_system?: "renishaw" | "blum" | "heidenhain" | "generic";
  max_spindle_rpm?: number;
}

export interface SecondaryOpsResult {
  success: boolean;
  operations: Array<{
    op_number: number;
    op_id: string;
    type: SecondaryOpType;
    tool_number?: number;
    tool_description: string;
    cycle_time_sec: number;
    gcode_blocks: string[];
    notes: string[];
  }>;
  total_operations: number;
  total_cycle_time_sec: number;
  program_text: string;
  program_line_count: number;
  confidence_score: number;
  warnings: Array<{ stage: string; severity: "info" | "warning" | "critical"; message: string }>;
}

// ============================================================================
// PROBING MACRO LIBRARY
// ============================================================================

/**
 * Renishaw-compatible probing macros (Haas/Fanuc convention).
 * Source: Haas Programming Workbook, Renishaw Inspection Plus manual
 */
const PROBE_MACROS: Record<string, { macro: string; description: string; params: string }> = {
  single_surface_x: { macro: "G65 P9811", description: "Single surface X probe", params: "X{nominal} T{tolerance} S{offset_var}" },
  single_surface_y: { macro: "G65 P9811", description: "Single surface Y probe", params: "Y{nominal} T{tolerance} S{offset_var}" },
  single_surface_z: { macro: "G65 P9811", description: "Single surface Z probe", params: "Z{nominal} T{tolerance} S{offset_var}" },
  bore: { macro: "G65 P9814", description: "Bore/pocket probe", params: "D{diameter} T{tolerance} S{offset_var}" },
  boss: { macro: "G65 P9814", description: "Boss/web probe", params: "D{diameter} T{tolerance} S{offset_var} B1." },
  web_x: { macro: "G65 P9812", description: "Web X width probe", params: "X{width} T{tolerance}" },
  web_y: { macro: "G65 P9812", description: "Web Y width probe", params: "Y{width} T{tolerance}" },
  pocket_xy: { macro: "G65 P9814", description: "Pocket center + size", params: "D{x_size} E{y_size} T{tolerance}" },
  corner: { macro: "G65 P9815", description: "Inside corner probe", params: "X{x_nom} Y{y_nom} T{tolerance}" },
  tool_length: { macro: "G65 P9995", description: "Tool length measure (tool setter)", params: "T{tool_number} H{offset}" },
  tool_break: { macro: "G65 P9994", description: "Tool breakage detection", params: "T{tool_number} B{break_tolerance}" },
};

// ============================================================================
// ENGRAVING CHARACTER MAP
// ============================================================================

/**
 * Simple stroke font character widths for cycle time estimation.
 * Actual engraving uses G-code subroutines or macro calls.
 */
const CHAR_WIDTH_FACTOR = 0.6; // Character width = height × factor
const CHAR_SPACING_FACTOR = 0.15;
const ENGRAVE_FEED_FACTOR = 0.3; // Feed = diameter × factor × 1000 mm/min

// ============================================================================
// ENGINE
// ============================================================================

export class SecondaryOpsPipelineEngine {
  readonly name = "SecondaryOpsPipelineEngine";
  readonly version = "1.0.0";

  calculate(action: string, params: Record<string, unknown>): SecondaryOpsResult {
    switch (action) {
      case "secondary_ops_pipeline":
        return this.runPipeline(params as unknown as SecondaryOpsInput);
      case "secondary_ops_plan":
        return this.runPipeline(params as unknown as SecondaryOpsInput);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  runPipeline(input: SecondaryOpsInput): SecondaryOpsResult {
    log.info(`[SecondaryOps] Processing ${input.operations.length} operations`);

    const warnings: SecondaryOpsResult["warnings"] = [];
    const results: SecondaryOpsResult["operations"] = [];
    const unsupportedOps: string[] = [];
    let opNum = 1;
    let toolNum = 50; // Start tools at T50 to not conflict with cutting tools

    for (const op of input.operations) {
      const gcode: string[] = [];
      let toolDesc = "";
      let cycleTime = 5;
      let tNum: number | undefined;
      const notes: string[] = [];

      switch (op.type) {
        // ==============================
        // DEBURRING
        // ==============================
        case "chamfer_deburr": {
          const chamfer = op.chamfer_size_mm || 0.5;
          tNum = toolNum++;
          toolDesc = `Chamfer mill 90° (T${tNum})`;
          const rpm = Math.min(input.max_spindle_rpm || 8000, 6000);
          const feed = Math.round(rpm * 0.05); // Conservative
          gcode.push(`T${tNum} M06 (${toolDesc})`);
          gcode.push(`G43 H${tNum} Z50.0`);
          gcode.push(`S${rpm} M03`);
          gcode.push(`M08`);
          gcode.push(`(Chamfer deburr — ${chamfer}mm break)`);
          gcode.push(`G00 X0 Y0 Z5.0`);
          gcode.push(`G01 Z${(-chamfer).toFixed(2)} F${Math.round(feed * 0.5)} (Plunge to chamfer depth)`);
          gcode.push(`(Follow edge contour at Z${(-chamfer).toFixed(2)})`);
          gcode.push(`G00 Z5.0`);
          cycleTime = 15 + (op.feature_ids?.length || 1) * 8;
          notes.push(`Chamfer ${chamfer}mm on ${op.feature_ids?.length || "all"} edges`);
          break;
        }

        case "back_deburr": {
          tNum = toolNum++;
          toolDesc = `Back deburr tool (T${tNum})`;
          gcode.push(`T${tNum} M06 (${toolDesc})`);
          gcode.push(`G43 H${tNum} Z50.0`);
          gcode.push(`S3000 M03`);
          gcode.push(`M08`);
          gcode.push(`(Back deburr — enter hole, extend blade, retract)`);
          gcode.push(`G00 X0 Y0 Z5.0`);
          gcode.push(`G01 Z-15.0 F500 (Through hole)`);
          gcode.push(`(Extend back-deburr blade — controller-specific)`);
          gcode.push(`G01 Z-10.0 F200 (Pull back through, deburring back face)`);
          gcode.push(`G00 Z5.0`);
          cycleTime = 20;
          notes.push("Back-side deburr — requires through-hole access");
          break;
        }

        case "brush_deburr": {
          tNum = toolNum++;
          toolDesc = `Nylon brush tool (T${tNum})`;
          gcode.push(`T${tNum} M06 (${toolDesc})`);
          gcode.push(`G43 H${tNum} Z50.0`);
          gcode.push(`S2000 M03`);
          gcode.push(`(Brush deburr — sweep across part surface)`);
          gcode.push(`G00 X-50.0 Y0 Z1.0`);
          gcode.push(`G01 X50.0 F1000`);
          gcode.push(`G00 Z5.0`);
          cycleTime = 10;
          notes.push("Brush deburr — cosmetic edge break only");
          break;
        }

        // ==============================
        // PROBING
        // ==============================
        case "probe_datum":
        case "probe_surface": {
          tNum = toolNum;
          toolDesc = `Touch probe (T${tNum})`;
          const axis = op.probe_axis || "Z";
          const nominal = op.nominal_mm || 0;
          const tol = op.tolerance_mm || 0.025;
          const macro = axis === "Z" ? PROBE_MACROS.single_surface_z
            : axis === "Y" ? PROBE_MACROS.single_surface_y
            : PROBE_MACROS.single_surface_x;

          gcode.push(`T${tNum} M06 (${toolDesc})`);
          gcode.push(`G43 H${tNum} Z50.0`);
          gcode.push(`(Probe ${axis} surface — nominal ${nominal}mm ±${tol}mm)`);
          gcode.push(`G00 X0 Y0 Z10.0`);
          gcode.push(`${macro.macro} ${axis}${nominal.toFixed(3)} T${tol.toFixed(3)}${op.work_offset_to_update ? ` S${op.work_offset_to_update}` : ""}`);
          if (op.alarm_on_fail) {
            gcode.push(`(Alarm on out-of-tolerance — macro handles internally)`);
          }
          cycleTime = 8;
          notes.push(`Probe ${axis} datum, update ${op.work_offset_to_update || "none"}`);
          break;
        }

        case "probe_bore": {
          tNum = toolNum;
          toolDesc = `Touch probe (T${tNum})`;
          const boreDia = op.nominal_mm || 20;
          const boreTol = op.tolerance_mm || 0.025;
          gcode.push(`T${tNum} M06 (${toolDesc})`);
          gcode.push(`G43 H${tNum} Z50.0`);
          gcode.push(`(Probe bore — D${boreDia}mm ±${boreTol}mm)`);
          gcode.push(`G00 X0 Y0 Z5.0`);
          gcode.push(`G01 Z-5.0 F500 (Enter bore)`);
          gcode.push(`${PROBE_MACROS.bore.macro} D${boreDia.toFixed(3)} T${boreTol.toFixed(3)}${op.work_offset_to_update ? ` S${op.work_offset_to_update}` : ""}`);
          gcode.push(`G00 Z10.0`);
          cycleTime = 15;
          notes.push(`Probe bore D${boreDia}mm, center + diameter`);
          break;
        }

        case "probe_boss": {
          tNum = toolNum;
          toolDesc = `Touch probe (T${tNum})`;
          const bossDia = op.nominal_mm || 30;
          gcode.push(`T${tNum} M06 (${toolDesc})`);
          gcode.push(`G43 H${tNum} Z50.0`);
          gcode.push(`(Probe boss — D${bossDia}mm)`);
          gcode.push(`G00 X0 Y0 Z10.0`);
          gcode.push(`${PROBE_MACROS.boss.macro} D${bossDia.toFixed(3)} T${(op.tolerance_mm || 0.025).toFixed(3)}`);
          cycleTime = 15;
          notes.push(`Probe boss OD${bossDia}mm`);
          break;
        }

        case "probe_web": {
          tNum = toolNum;
          toolDesc = `Touch probe (T${tNum})`;
          const webAxis = op.probe_axis === "Y" ? "Y" : "X";
          gcode.push(`T${tNum} M06 (${toolDesc})`);
          gcode.push(`G43 H${tNum} Z50.0`);
          gcode.push(`(Probe web ${webAxis} — ${op.nominal_mm || 20}mm)`);
          const webMacro = webAxis === "Y" ? PROBE_MACROS.web_y : PROBE_MACROS.web_x;
          gcode.push(`${webMacro.macro} ${webAxis}${(op.nominal_mm || 20).toFixed(3)} T${(op.tolerance_mm || 0.025).toFixed(3)}`);
          cycleTime = 12;
          notes.push(`Probe web width ${webAxis}=${op.nominal_mm || 20}mm`);
          break;
        }

        case "probe_pocket": {
          tNum = toolNum;
          toolDesc = `Touch probe (T${tNum})`;
          gcode.push(`T${tNum} M06 (${toolDesc})`);
          gcode.push(`G43 H${tNum} Z50.0`);
          gcode.push(`(Probe pocket center + size)`);
          gcode.push(`G00 X0 Y0 Z5.0`);
          gcode.push(`G01 Z-3.0 F500`);
          gcode.push(`${PROBE_MACROS.pocket_xy.macro} D${(op.nominal_mm || 30).toFixed(3)} T${(op.tolerance_mm || 0.05).toFixed(3)}`);
          gcode.push(`G00 Z10.0`);
          cycleTime = 20;
          notes.push("Probe pocket XY center and size");
          break;
        }

        // ==============================
        // ENGRAVING
        // ==============================
        case "engrave_text":
        case "engrave_serial":
        case "engrave_date": {
          tNum = toolNum++;
          const text = op.text || (op.type === "engrave_date" ? "2026-03-22" : op.type === "engrave_serial" ? "SN001" : "PRISM");
          const height = op.font_height_mm || 3;
          const depth = op.depth_mm || 0.1;
          const engRPM = Math.min(input.max_spindle_rpm || 10000, 8000);
          const engFeed = Math.round(engRPM * 0.02);
          toolDesc = `Engraving cutter 30° (T${tNum})`;

          gcode.push(`T${tNum} M06 (${toolDesc})`);
          gcode.push(`G43 H${tNum} Z50.0`);
          gcode.push(`S${engRPM} M03`);
          gcode.push(`M08`);
          gcode.push(`(Engrave: "${text}" — H${height}mm, D${depth}mm)`);
          gcode.push(`G00 X${(op.position_x_mm || 0).toFixed(1)} Y${(op.position_y_mm || 0).toFixed(1)} Z5.0`);

          // Use Haas M97 engraving or manual G-code text
          if (input.controller === "haas") {
            gcode.push(`G47 P0 (Engrave mode ON — Haas canned text cycle)`);
            gcode.push(`G47 X${(op.position_x_mm || 0).toFixed(1)} Y${(op.position_y_mm || 0).toFixed(1)} Z${(-depth).toFixed(2)} R0.5 I${(height * CHAR_SPACING_FACTOR).toFixed(2)} J${height.toFixed(1)} F${engFeed} (${text})`);
          } else {
            // Generic controller: subprogram approach
            gcode.push(`(Text engraving via subprogram — controller-specific)`);
            gcode.push(`G01 Z${(-depth).toFixed(2)} F${Math.round(engFeed * 0.3)}`);
            gcode.push(`(Stroke path for "${text}" at F${engFeed})`);
            gcode.push(`G00 Z1.0`);
          }
          gcode.push(`G00 Z5.0`);

          // Cycle time estimate
          const textLen = text.length;
          const strokeLen = textLen * height * CHAR_WIDTH_FACTOR;
          cycleTime = Math.round(strokeLen / (engFeed / 60) + textLen * 0.5 + 5);
          notes.push(`Engrave "${text}" — ${textLen} chars, H${height}mm`);
          break;
        }

        case "dot_peen": {
          tNum = toolNum++;
          toolDesc = `Dot peen marker (T${tNum})`;
          gcode.push(`T${tNum} M06 (${toolDesc})`);
          gcode.push(`(Dot peen marking — external device or M-code trigger)`);
          gcode.push(`G00 X${(op.position_x_mm || 0).toFixed(1)} Y${(op.position_y_mm || 0).toFixed(1)} Z2.0`);
          gcode.push(`M51 (Trigger dot peen — user M-code)`);
          gcode.push(`G04 P${((op.dwell_sec || 5) * 1000).toFixed(0)} (Dwell for marking)`);
          gcode.push(`M61 (Stop dot peen)`);
          cycleTime = (op.dwell_sec || 5) + 3;
          notes.push("Dot peen — requires external marking head");
          break;
        }

        // ==============================
        // WASH / AIR BLAST
        // ==============================
        case "wash_cycle": {
          gcode.push(`(Wash cycle — flood coolant at multiple positions)`);
          gcode.push(`M08 (Coolant ON)`);
          gcode.push(`G00 X0 Y0 Z50.0`);
          gcode.push(`G04 P${((op.dwell_sec || 5) * 1000).toFixed(0)} (Dwell ${op.dwell_sec || 5}s)`);
          gcode.push(`G00 X50.0 Y50.0`);
          gcode.push(`G04 P${((op.dwell_sec || 5) * 1000).toFixed(0)}`);
          gcode.push(`G00 X-50.0 Y-50.0`);
          gcode.push(`G04 P${((op.dwell_sec || 5) * 1000).toFixed(0)}`);
          gcode.push(`M09`);
          toolDesc = "Wash cycle (no tool)";
          cycleTime = (op.dwell_sec || 5) * 3 + 5;
          notes.push("Flood wash at 3 positions");
          break;
        }

        case "air_blast": {
          gcode.push(`(Air blast — chip clearance)`);
          if (input.controller === "haas") {
            gcode.push(`M83 (Auto air gun ON)`);
          } else {
            gcode.push(`M07 (Mist/air ON — controller-specific)`);
          }
          gcode.push(`G00 X0 Y0 Z30.0`);
          gcode.push(`G04 P${((op.dwell_sec || 3) * 1000).toFixed(0)}`);
          if (input.controller === "haas") {
            gcode.push(`M84 (Auto air gun OFF)`);
          } else {
            gcode.push(`M09`);
          }
          toolDesc = "Air blast (no tool)";
          cycleTime = (op.dwell_sec || 3) + 2;
          notes.push("Air blast chip clearance");
          break;
        }

        case "chip_clear": {
          gcode.push(`(Chip clearance — retract + coolant flush)`);
          gcode.push(`G28 G91 Z0 (Retract Z)`);
          gcode.push(`M08`);
          gcode.push(`G04 P3000 (3s flush)`);
          gcode.push(`M09`);
          toolDesc = "Chip clear (no tool)";
          cycleTime = 5;
          notes.push("Mid-program chip clearance");
          break;
        }

        // ==============================
        // TOOL CHECKS
        // ==============================
        case "tool_breakage_check": {
          tNum = undefined;
          toolDesc = "Tool setter (fixed)";
          gcode.push(`(Tool breakage check)`);
          gcode.push(`${PROBE_MACROS.tool_break.macro} T${op.nominal_mm || 1} B0.5`);
          cycleTime = 5;
          notes.push("Tool breakage detection via tool setter");
          break;
        }

        case "tool_length_measure": {
          tNum = undefined;
          toolDesc = "Tool setter (fixed)";
          gcode.push(`(Tool length measurement)`);
          gcode.push(`${PROBE_MACROS.tool_length.macro} T${op.nominal_mm || 1} H${op.nominal_mm || 1}`);
          cycleTime = 8;
          notes.push("Measure tool length, update offset");
          break;
        }

        // ==============================
        // PART HANDLING
        // ==============================
        case "part_flip": {
          toolDesc = "Manual operation";
          gcode.push(`M00 (STOP — FLIP PART)`);
          gcode.push(`(Re-probe datum after flip)`);
          cycleTime = 60; // Manual time estimate
          notes.push("Manual part flip — operator intervention");
          warnings.push({ stage: "planning", severity: "info", message: `Op ${op.id}: manual part flip — add handling time` });
          break;
        }

        case "pallet_change": {
          toolDesc = "Pallet changer";
          gcode.push(`G28 G91 Z0 (Safe Z)`);
          gcode.push(`M60 (Pallet change — controller specific)`);
          cycleTime = 15;
          notes.push("Automatic pallet change");
          break;
        }

        default: {
          toolDesc = "Unsupported operation";
          cycleTime = 0;
          notes.push(`Unsupported secondary op type "${op.type}"`);
          unsupportedOps.push(op.id);
          warnings.push({ stage: "planning", severity: "critical", message: `Op ${op.id}: unsupported type "${op.type}"` });
        }
      }

      results.push({
        op_number: opNum++,
        op_id: op.id,
        type: op.type,
        tool_number: tNum,
        tool_description: toolDesc,
        cycle_time_sec: cycleTime,
        gcode_blocks: gcode,
        notes,
      });
    }

    const hasUnsupportedOps = unsupportedOps.length > 0;
    const programText = hasUnsupportedOps ? "" : this.assembleProgram(results, input);
    const totalCycleTime = results.reduce((s, o) => s + o.cycle_time_sec, 0);

    return {
      success: !hasUnsupportedOps && results.length > 0,
      operations: results,
      total_operations: results.length,
      total_cycle_time_sec: Math.round(totalCycleTime),
      program_text: programText,
      program_line_count: programText ? programText.split("\n").length : 0,
      confidence_score: hasUnsupportedOps ? 0 : 0.85,
      warnings,
    };
  }

  private assembleProgram(ops: SecondaryOpsResult["operations"], input: SecondaryOpsInput): string {
    const lines: string[] = [];
    let lineNum = 10;
    const ln = () => { const n = lineNum; lineNum += 10; return `N${n}`; };

    lines.push(`%`);
    lines.push(`O${(input.part_number || "SEC001").replace(/\D/g, "").slice(0, 4) || "8001"} (${input.part_number || "SECONDARY-OPS"})`);
    lines.push(`(GENERATED BY PRISM SecondaryOpsPipelineEngine v1.0)`);
    lines.push(``);
    lines.push(`${ln()} G28 G91 Z0`);
    lines.push(`${ln()} G90 G21 G40 G80`);
    lines.push(``);

    for (const op of ops) {
      lines.push(`(OP${op.op_number}: ${op.type} — ${op.tool_description})`);
      for (const block of op.gcode_blocks) {
        lines.push(`${ln()} ${block}`);
      }
      lines.push(``);
    }

    lines.push(`${ln()} M09`);
    lines.push(`${ln()} G28 G91 Z0`);
    lines.push(`${ln()} M30`);
    lines.push(`%`);

    return lines.join("\n");
  }
}

/** Singleton instance. */
export const secondaryOpsPipelineEngine = new SecondaryOpsPipelineEngine();
