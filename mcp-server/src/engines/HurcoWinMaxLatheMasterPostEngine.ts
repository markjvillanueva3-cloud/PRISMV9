/**
 * HurcoWinMaxLatheMasterPostEngine -- Hurco WinMax LATHE master post (ISNC / Fanuc-dialect turning).
 * (U-PP-HURCO-WINMAX-LATHE-GENERATOR, slot:echo 2026-06-27)
 *
 * The missing operations->NC generator behind the `hurco-winmax-lathe` training-corpus post -- the
 * last `actionVerified:false` post in the closed-loop corpus. Previously the corpus routed that post
 * to `lathe_master_post_route` (a ROUTER, not a generator), which only ever emitted a generic 11-line
 * fallback. This engine emits a real Hurco WinMax lathe program.
 *
 * DIALECT BASIS -- Hurco WinMax controls run conversational OR ISNC (Industry-Standard NC) mode.
 * ISNC turning IS Fanuc-compatible G-code, so this post emits standard Fanuc-form turning:
 *   - G96 constant-surface-speed + G50 max-RPM clamp (G97 fixed-RPM for threading)
 *   - G99 feed-per-rev, G54 work offset, T<nn><nn> turret+offset, ( ) comments
 *   - G71 longitudinal OD/ID roughing (NOTE: G71 is the LONGITUDINAL cycle in Fanuc/ISNC; Okuma's
 *     OSP post uses G72 -- that is the key dialect correction vs the OkumaB250 template this is adapted
 *     from), G76 multi-pass threading, G75 grooving / peck part-off, G83 peck drilling.
 * The conversational WinMax-UI driver path (PrismWinMaxUI process-attach + on-site Tool-Setup FSM) is a
 * SEPARATE operator-gated unit -- it needs the live on-site controller and is NOT this engine.
 *
 * CONTRACT -- reuses the proven `TurningOperation` input shape from OkumaB250LatheMasterPostEngine (the
 * exact shape the post-training harness `latheJobs` feed: od_rough/od_finish/face/thread/groove/part_off
 * with css_m_min / feed_mm_rev / start_x/z / end_x/z), so the same corpus jobs round-trip unchanged.
 *
 * SAFETY -- same non-finite-emit guard discipline as the rest of the post fleet (the bug CLASS fixed in
 * RokuRoku 4259b15e63 / HaasNGC c5fd2e27b5 / OkumaB250 sweep): a NaN / +-Infinity in a field an op-type
 * actually EMITS renders as a literal "XNaN"/"FNaN" block the control rejects, so a malformed op is
 * dropped whole with a visible ERROR block + a warning, never silently emitted. Physics speeds/feeds are
 * caller-supplied (CAM/SFC upstream); this engine does NOT inline cutting constants.
 */

import type { TurningOperation } from "./OkumaB250LatheMasterPostEngine.js";
import type { BlockAnnotation } from "../schemas/postPhysicsSidecarSchema.js";

export interface HurcoWinMaxLathePostConfig {
  /** O-number for the program header. */
  program_number?: number;
  /** Free-text header comment. */
  program_comment?: string;
  units?: "metric" | "inch";
  /** Fanuc work-offset G-code number (54..59). */
  work_offset?: number;
  /** Emit G96 constant surface speed (vs G97 fixed RPM). */
  use_css?: boolean;
  /** G50 spindle clamp (max RPM) -- mandatory upper bound under CSS. */
  css_max_rpm?: number;
  /** Machine label for the (MACHINE: ...) header line. */
  machine_label?: string;
}

export interface HurcoWinMaxLathePostOutput {
  gcode: string[];
  program_number: number;
  total_lines: number;
  tools_used: number[];
  warnings: string[];
  skipped_operations: number;
  /** Empty in v1 (no per-block physics annotations yet) -- present so the output is sealable. */
  block_annotations: BlockAnnotation[];
  dialect: "fanuc";
  controller: "Hurco WinMax (ISNC)";
}

export class HurcoWinMaxLatheMasterPostEngine {
  private readonly defaultConfig: Required<Omit<HurcoWinMaxLathePostConfig, "program_comment">> = {
    program_number: 1,
    units: "metric",
    work_offset: 54,
    use_css: true,
    css_max_rpm: 3500,
    machine_label: "HURCO TM/TMX WINMAX (ISNC)",
  };

  /**
   * Generate a complete Hurco WinMax lathe (ISNC) program.
   * @param operations  turning operations (same shape the harness latheJobs feed)
   * @param config      post config (program number, CSS, RPM clamp, work offset)
   * @returns           gcode lines + provenance + skipped-op count
   */
  generateProgram(
    operations: TurningOperation[],
    config?: Partial<HurcoWinMaxLathePostConfig>,
  ): HurcoWinMaxLathePostOutput {
    const cfg = { ...this.defaultConfig, ...config };
    const gcode: string[] = [];
    const warnings: string[] = [];
    let skippedOperations = 0;
    const toolsUsed = new Set<number>();

    // Program header
    gcode.push(`O${String(cfg.program_number).padStart(4, "0")} (${config?.program_comment || "PRISM HURCO WINMAX LATHE"})`);
    gcode.push(`(MACHINE: ${cfg.machine_label})`);
    gcode.push("(MODE: ISNC / FANUC-DIALECT TURNING)");
    gcode.push("");

    // Safe start
    gcode.push(...this.generateSafeStart(cfg));

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      toolsUsed.add(op.tool_number);

      gcode.push("");
      gcode.push(`(OPERATION ${i + 1}: ${op.operation_type.toUpperCase()})`);

      // Fail loud on an INVALID required field BEFORE any emit (bug-class guard): non-finite, or a
      // magnitude field (feed/depth) that is <= 0 -- a negative feed is finite but would emit "F-0.1".
      const invalidFields = this.nonFiniteOperationFields(op);
      if (invalidFields.length > 0) {
        gcode.push(`(ERROR: OPERATION ${i + 1} SKIPPED -- INVALID FIELD ${invalidFields.join(", ")} (NON-FINITE OR NON-POSITIVE) -- REVIEW CAM OUTPUT)`);
        warnings.push(`Operation ${i + 1} (${op.operation_type}) skipped: invalid (non-finite/non-positive) ${invalidFields.join(", ")}`);
        skippedOperations++;
        continue;
      }

      gcode.push(...this.generateToolChange(op));

      switch (op.operation_type) {
        case "od_rough":
        case "id_rough":
          gcode.push(...this.generateRoughingCycle(op, cfg));
          break;
        case "od_finish":
        case "id_finish":
          gcode.push(...this.generateFinishingPass(op, cfg));
          break;
        case "face":
          gcode.push(...this.generateFacingPass(op, cfg));
          break;
        case "thread":
          gcode.push(...this.generateThreadingCycle(op));
          break;
        case "groove":
          gcode.push(...this.generateGroovingCycle(op));
          break;
        case "part_off":
          gcode.push(...this.generatePartOff(op));
          break;
        case "drill":
        case "bore":
          gcode.push(...this.generateDrillingCycle(op));
          break;
        default:
          gcode.push(`(WARNING: UNSUPPORTED OP TYPE ${op.operation_type} -- NO CODE EMITTED)`);
          warnings.push(`Operation ${i + 1}: unsupported op type "${op.operation_type}" emitted no cutting code`);
      }
    }

    // Program end
    gcode.push("");
    gcode.push("(END OF PROGRAM)");
    gcode.push("M05 (SPINDLE STOP)");
    gcode.push("M09 (COOLANT OFF)");
    gcode.push("G28 U0 W0 (HOME)");
    gcode.push("M30 (PROGRAM END)");
    gcode.push("%");

    return {
      gcode,
      program_number: cfg.program_number,
      total_lines: gcode.length,
      tools_used: Array.from(toolsUsed).sort((a, b) => a - b),
      warnings,
      skipped_operations: skippedOperations,
      block_annotations: [],
      dialect: "fanuc",
      controller: "Hurco WinMax (ISNC)",
    };
  }

  /** Fanuc/ISNC safe-start block. */
  private generateSafeStart(cfg: Required<Omit<HurcoWinMaxLathePostConfig, "program_comment">>): string[] {
    const lines: string[] = [];
    lines.push("(SAFE START)");
    lines.push("G28 U0 W0 (HOME POSITION)");
    lines.push(cfg.units === "metric" ? "G21 (METRIC)" : "G20 (INCH)");
    lines.push(`G50 S${cfg.css_max_rpm} (MAX SPINDLE CLAMP)`);
    lines.push("G97 (CANCEL CSS FOR STARTUP)");
    lines.push("G99 (FEED PER REV)");
    lines.push(`G${cfg.work_offset} (WORK OFFSET)`);
    return lines;
  }

  /** Turret tool change: T<nn><nn> = tool number + matching offset register. */
  private generateToolChange(op: TurningOperation): string[] {
    const t = String(op.tool_number).padStart(2, "0");
    return [
      "G28 U0 W0 (HOME FOR TOOL CHANGE)",
      `T${t}${t} (${op.tool_description || `TOOL ${op.tool_number}`})`,
    ];
  }

  /** Spindle-on line: G96 CSS (clamped by the G50 in safe-start) or G97 fixed RPM. */
  private spindleOn(op: TurningOperation, cfg: Pick<HurcoWinMaxLathePostConfig, "use_css">, suffix = ""): string {
    // Guard a non-finite / non-positive css (an optional field the per-op non-finite guard does not
    // cover) so a bad CAM value can never emit "G96 SInfinity"; fall back to G97 fixed RPM.
    if (cfg.use_css && Number.isFinite(op.css_m_min) && (op.css_m_min as number) > 0) {
      return `G96 S${op.css_m_min} M03 (CSS ${op.css_m_min} M/MIN${suffix ? " " + suffix : ""})`;
    }
    const rpm = Number.isFinite(op.spindle_rpm) && (op.spindle_rpm as number) > 0 ? (op.spindle_rpm as number) : 1000;
    return `G97 S${rpm} M03 (${rpm} RPM${suffix ? " " + suffix : ""})`;
  }

  /** Fanuc/ISNC G71 longitudinal roughing (OD->G42, ID->G41). */
  private generateRoughingCycle(op: TurningOperation, cfg: HurcoWinMaxLathePostConfig): string[] {
    const isOD = op.operation_type === "od_rough";
    const lines: string[] = [this.spindleOn(op, cfg)];
    if (op.coolant === "flood") lines.push("M08 (FLOOD COOLANT)");
    lines.push(`${isOD ? "G42" : "G41"} (TOOL NOSE COMP ${isOD ? "RIGHT" : "LEFT"})`);
    // G71 two-block: depth/retract, then contour bounds + finish stock.
    const finishStockX = 0.5;
    const finishStockZ = 0.1;
    lines.push(`G71 U${op.depth_of_cut_mm.toFixed(3)} R1.0`);
    lines.push(`G71 P100 Q200 U${finishStockX} W${finishStockZ} F${op.feed_mm_rev}`);
    lines.push(`N100 G00 X${op.start_x.toFixed(3)}`);
    lines.push(`G01 Z${op.start_z.toFixed(3)} F${op.feed_mm_rev}`);
    lines.push(`X${op.end_x.toFixed(3)}`);
    lines.push(`N200 Z${op.end_z.toFixed(3)}`);
    lines.push("G40 (CANCEL TOOL NOSE COMP)");
    return lines;
  }

  /** Manual finishing contour (dialect-safe; no cross-cycle block dependency). */
  private generateFinishingPass(op: TurningOperation, cfg: HurcoWinMaxLathePostConfig): string[] {
    const isOD = op.operation_type === "od_finish";
    const lines: string[] = [this.spindleOn(op, cfg, "FINISH")];
    if (op.coolant === "flood") lines.push("M08");
    lines.push(`${isOD ? "G42" : "G41"}`);
    lines.push(`G00 X${(op.start_x + 2).toFixed(3)} Z${(op.start_z + 2).toFixed(3)}`);
    lines.push(`X${op.start_x.toFixed(3)}`);
    lines.push(`G01 Z${op.start_z.toFixed(3)} F${op.feed_mm_rev}`);
    lines.push(`X${op.end_x.toFixed(3)} Z${op.end_z.toFixed(3)}`);
    lines.push("G40");
    return lines;
  }

  /** Facing pass: OD->center at face Z. */
  private generateFacingPass(op: TurningOperation, cfg: HurcoWinMaxLathePostConfig): string[] {
    const lines: string[] = [this.spindleOn(op, cfg)];
    if (op.coolant === "flood") lines.push("M08");
    lines.push(`G00 X${op.start_x.toFixed(3)} Z${(op.start_z + 1).toFixed(3)}`);
    lines.push(`G01 Z${op.start_z.toFixed(3)} F${op.feed_mm_rev}`);
    lines.push(`X${op.end_x.toFixed(3)} F${op.feed_mm_rev}`);
    lines.push(`G00 Z${(op.start_z + 1).toFixed(3)}`);
    return lines;
  }

  /**
   * Fanuc/ISNC G76 multi-pass threading. Threading is G97 (fixed RPM, not CSS).
   * thread_depth_mm derives from pitch (60deg metric single-depth ~= 0.6134*pitch) when not supplied.
   */
  private generateThreadingCycle(op: TurningOperation): string[] {
    if (!Number.isFinite(op.thread_pitch_mm) || (op.thread_pitch_mm as number) <= 0) {
      // Missing / NaN / Infinity / negative pitch -> no valid G76 lead. Fail loud, no bad block.
      return ["(ERROR: THREAD PITCH MISSING OR NON-POSITIVE)"];
    }
    const pitch = op.thread_pitch_mm as number;   // guard above proved finite + positive
    const threadDepth = op.thread_depth_mm && Number.isFinite(op.thread_depth_mm)
      ? op.thread_depth_mm
      : 0.6134 * pitch;
    const threadRpm = op.spindle_rpm && Number.isFinite(op.spindle_rpm)
      ? op.spindle_rpm
      : Math.max(200, Math.round(Math.min(1000, 1000 / pitch)));
    const lines: string[] = [];
    lines.push(`G97 S${Math.round(threadRpm)} M03 (THREADING RPM)`);
    lines.push("M08");
    lines.push(`G00 X${op.start_x.toFixed(3)} Z${(op.start_z + 2).toFixed(3)}`);
    // G76 line 1: P<first-pass><angle><finish-allow> Q<min-depth> R<finish-allow>
    const firstPass = 0.1, angle = 60, finishAllow = 0.05, minDepth = 0.05;
    lines.push(
      `G76 P${String(Math.round(firstPass * 100)).padStart(2, "0")}${String(angle).padStart(2, "0")}` +
      `${String(Math.round(finishAllow * 100)).padStart(2, "0")} Q${Math.round(minDepth * 1000)} R${finishAllow}`,
    );
    // G76 line 2: X<minor-dia> Z<end> P<thread-depth-microns> Q<first-pass-microns> F<lead=pitch>
    lines.push(
      `G76 X${(op.start_x - threadDepth * 2).toFixed(3)} Z${op.end_z.toFixed(3)} ` +
      `P${Math.round(threadDepth * 1000)} Q${Math.round(firstPass * 1000)} F${pitch}`,
    );
    return lines;
  }

  /** Fanuc/ISNC G75 peck grooving. */
  private generateGroovingCycle(op: TurningOperation): string[] {
    const lines: string[] = [];
    const css = Number.isFinite(op.css_m_min) && (op.css_m_min as number) > 0 ? (op.css_m_min as number) : 0;
    if (css) lines.push(`G96 S${Math.round(css * 0.7)} M03 (REDUCED CSS FOR GROOVING)`);
    else lines.push(`G97 S${Number.isFinite(op.spindle_rpm) ? (op.spindle_rpm as number) : 800} M03`);
    lines.push("M08");
    const grooveWidth = op.groove_width_mm && Number.isFinite(op.groove_width_mm) ? op.groove_width_mm : 3;
    const radialPeck = 2; // mm X-direction peck increment per pass
    const zSpan = Math.abs(op.end_z - op.start_z);
    lines.push(`G00 X${op.start_x.toFixed(3)} Z${op.start_z.toFixed(3)}`);
    lines.push("G75 R0.5");
    // Fanuc/ISNC G75: P = X-axis radial peck (microns), Q = Z-axis stepover between grooves (microns).
    // Emit Q ONLY when the groove spans Z (wider than one tool plunge); a single-position plunge groove
    // (start_z == end_z) omits Q and X-pecks at one Z. (A Q with no Z travel is a malformed cycle.)
    const qWord = zSpan > 0 ? ` Q${Math.round(grooveWidth * 1000)}` : "";
    lines.push(`G75 X${op.end_x.toFixed(3)} Z${op.end_z.toFixed(3)} P${Math.round(radialPeck * 1000)}${qWord} F${op.feed_mm_rev}`);
    return lines;
  }

  /** Part-off: reduced CSS, flood mandatory, G75 peck for large diameters. */
  private generatePartOff(op: TurningOperation): string[] {
    const css = Number.isFinite(op.css_m_min) && (op.css_m_min as number) > 0 ? (op.css_m_min as number) : 0;
    const partSpeed = css ? Math.round(css * 0.7) : 80;
    const lines: string[] = [];
    lines.push(`G96 S${partSpeed} M03 (REDUCED CSS FOR PART-OFF)`);
    lines.push("M08 (FLOOD COOLANT MANDATORY)");
    lines.push(`G00 X${op.start_x.toFixed(3)} Z${op.start_z.toFixed(3)}`);
    if (op.start_x > 50) {
      // Large-bar cutoff: G75 X-direction pecking for chip evacuation. Single Z position, so NO
      // Z-stepover Q word -- a Q0 (zero Z-shift) is a malformed cycle on Fanuc/ISNC controls.
      lines.push("G75 R0.5");
      lines.push(`G75 X0 Z${op.start_z.toFixed(3)} P3000 F${(op.feed_mm_rev * 0.5).toFixed(4)}`);
    } else {
      lines.push(`G01 X0 F${(op.feed_mm_rev * 0.5).toFixed(4)}`);
    }
    lines.push("G04 P0.5 (DWELL AT CENTER)");
    return lines;
  }

  /** Axial drilling/boring on centerline: G83 peck for deep holes, else G01. */
  private generateDrillingCycle(op: TurningOperation): string[] {
    const rpm = op.spindle_rpm && Number.isFinite(op.spindle_rpm) ? op.spindle_rpm : 1500;
    const lines: string[] = [`G97 S${rpm} M03`];
    if (op.coolant === "flood") lines.push("M08");
    lines.push(`G00 X0 Z${(op.start_z + 2).toFixed(3)}`);
    const depth = Math.abs(op.end_z - op.start_z);
    if (depth > 30) {
      lines.push(`G83 Z${op.end_z.toFixed(3)} Q2.0 F${op.feed_mm_rev}`);
      lines.push("G80");
    } else {
      lines.push(`G01 Z${op.end_z.toFixed(3)} F${op.feed_mm_rev}`);
    }
    lines.push(`G00 Z${(op.start_z + 2).toFixed(3)}`);
    return lines;
  }

  /**
   * Names of any numeric field this op-type actually EMITS that is INVALID: non-finite (NaN /
   * +-Infinity), OR a magnitude field (feed_mm_rev / depth_of_cut_mm) that is <= 0. Per-op-type so a
   * valid op is never rejected for a field it does not consume (a thread op leaves feed/depth unset;
   * a part_off/drill faces from X0 not end_x). Position fields (start/end X/Z) may be negative and are
   * checked for finiteness only. A non-finite field renders a literal "XNaN"/"FNaN" block; a negative
   * feed/depth renders "F-0.1" -- both rejected by the control. Mirrors the camActionSchemas
   * .positive() bound so a DIRECT engine call is as safe as the dispatcher path. U-PP-NONPOS-GUARD.
   */
  private nonFiniteOperationFields(op: TurningOperation): string[] {
    const req: Array<[string, number | undefined]> = [];
    switch (op.operation_type) {
      case "od_rough":
      case "id_rough":
        req.push(["start_x", op.start_x], ["start_z", op.start_z], ["end_x", op.end_x], ["end_z", op.end_z],
          ["feed_mm_rev", op.feed_mm_rev], ["depth_of_cut_mm", op.depth_of_cut_mm]);
        break;
      case "od_finish":
      case "id_finish":
        req.push(["start_x", op.start_x], ["start_z", op.start_z], ["end_x", op.end_x], ["end_z", op.end_z],
          ["feed_mm_rev", op.feed_mm_rev]);
        break;
      case "face":
        req.push(["start_x", op.start_x], ["start_z", op.start_z], ["end_x", op.end_x], ["feed_mm_rev", op.feed_mm_rev]);
        break;
      case "thread":
        // emits start_x / start_z / end_z + thread_pitch_mm (guarded in the emitter).
        req.push(["start_x", op.start_x], ["start_z", op.start_z], ["end_z", op.end_z]);
        break;
      case "groove":
        req.push(["start_x", op.start_x], ["start_z", op.start_z], ["end_x", op.end_x], ["end_z", op.end_z],
          ["feed_mm_rev", op.feed_mm_rev]);
        break;
      case "part_off":
        req.push(["start_x", op.start_x], ["start_z", op.start_z], ["feed_mm_rev", op.feed_mm_rev]);
        break;
      case "drill":
      case "bore":
        req.push(["start_z", op.start_z], ["end_z", op.end_z], ["feed_mm_rev", op.feed_mm_rev]);
        break;
      default:
        req.push(["start_x", op.start_x], ["start_z", op.start_z], ["end_x", op.end_x], ["end_z", op.end_z]);
    }
    // Position fields (start/end X/Z) may legitimately be negative -> finiteness only. Magnitude
    // fields (feed/depth) <= 0 are invalid: a negative feed is FINITE so it slips past the finiteness
    // check and would emit "F-0.1" the control rejects (mirrors camActionSchemas .positive()).
    const POSITIVE_MAGNITUDE = new Set(["feed_mm_rev", "depth_of_cut_mm"]);
    return req
      .filter(([n, v]) => !Number.isFinite(v) || (POSITIVE_MAGNITUDE.has(n) && Number(v) <= 0))
      .map(([n]) => n);
  }
}

export const hurcoWinMaxLatheMasterPostEngine = new HurcoWinMaxLatheMasterPostEngine();
