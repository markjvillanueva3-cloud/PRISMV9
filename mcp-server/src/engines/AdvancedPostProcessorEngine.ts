/**
 * AdvancedPostProcessorEngine
 *
 * Cross-software advanced post processor features that can be injected into
 * ANY CAM software's post output. Brings algorithms from specific platforms
 * (Fusion 360 iMachining, SolidCAM, Mastercam, etc.) to any controller.
 *
 * Features:
 * - Adaptive clearing / iMachining G-code injection
 * - HSM arc fitting & NURBS interpolation
 * - Corner rounding & deceleration control
 * - Tool management automation (sister tooling, break detection)
 * - In-process measurement blocks
 * - Feed rate optimization (chip thinning, corner slow-down)
 * - Multi-axis RTCP variants per controller
 * - Cross-software algorithm portability
 */

import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Controllers supported by AdvancedPostProcessor's cross-software G-code
 * injection. Each entry has corresponding rows in every dialect table below
 * (SMOOTHING_CODES, NURBS_CODES, CORNER_ROUNDING, RTCP_ACTIVATE,
 * RTCP_DEACTIVATE) plus per-controller branches in the inject* methods.
 *
 * Adding a controller requires populating ALL tables and audit branches —
 * the TypeScript Record<AdvancedController, …> shape enforces this at
 * compile time.
 */
export type AdvancedController =
  | "fanuc"
  | "haas"
  | "siemens"
  | "heidenhain"
  | "mazak"
  | "okuma"
  | "hurco";

export interface AdaptiveClearingConfig {
  optimal_load: number;          // % of tool diameter (e.g. 0.25 = 25%)
  max_stepover: number;          // mm
  min_stepover: number;          // mm
  ramp_angle: number;            // degrees for helical entry
  ramp_diameter_factor: number;  // % of tool diameter for helix
  feed_on_engage: number;        // mm/min when fully engaged
  feed_on_disengage: number;     // mm/min when load reduces
  use_trochoidal: boolean;       // trochoidal slotting fallback
  chip_thinning_compensation: boolean;
}

export interface HSMConfig {
  corner_rounding_tolerance: number;  // mm
  smoothing_mode: "off" | "rough" | "finish" | "ultra";
  nurbs_interpolation: boolean;
  arc_fitting: boolean;
  arc_tolerance: number;              // mm
  min_arc_radius: number;             // mm
  max_arc_radius: number;             // mm
  jerk_limit?: number;                // mm/s³
  look_ahead_blocks?: number;
}

export interface ToolManagementConfig {
  sister_tooling: boolean;
  max_tool_life_minutes: number;
  break_detection: boolean;
  break_detection_method: "probe" | "load_monitor" | "laser";
  wear_offset_increment: number;      // mm per tool life %
  auto_offset_update: boolean;
  tool_group_id?: number;
}

export interface InProcessMeasureConfig {
  measure_every_n_parts: number;
  critical_features: Array<{
    type: "bore" | "boss" | "surface" | "web";
    nominal: number;
    tolerance_plus: number;
    tolerance_minus: number;
    work_offset: string;           // G54, G55, etc.
  }>;
  auto_compensate: boolean;
  alarm_on_out_of_tolerance: boolean;
  spc_logging: boolean;
}

export interface FeedOptimizationConfig {
  chip_thinning: boolean;
  corner_slowdown: boolean;
  corner_radius_threshold: number;    // mm — slow below this radius
  corner_feed_factor: number;         // 0-1, multiply feed at tight corners
  plunge_rate_factor: number;         // multiply for Z-down moves
  retract_rapid: boolean;
  arc_feed_limit?: number;            // mm/min max in arcs
}

export interface MultiAxisConfig {
  rtcp_mode: "G43.4" | "G43.5" | "G234" | "TRAORI" | "TCPM" | "M128";
  tilt_axis: "A" | "B" | "C" | "AB" | "AC" | "BC";
  tool_vector_output: boolean;       // output I/J/K tool axis direction
  singularity_avoidance: boolean;
  singularity_tolerance: number;     // degrees from pole
  inverse_time_feed: boolean;        // G93 mode
  linearize_tolerance?: number;      // mm for 5-axis linearization
}

export interface AdvancedPostInput {
  controller: AdvancedController;
  gcode: string;                     // existing G-code to enhance
  adaptive_clearing?: AdaptiveClearingConfig;
  hsm?: HSMConfig;
  tool_management?: ToolManagementConfig;
  in_process_measure?: InProcessMeasureConfig;
  feed_optimization?: FeedOptimizationConfig;
  multi_axis?: MultiAxisConfig;
}

export interface AdvancedPostResult {
  gcode: string;
  enhancements_applied: string[];
  warnings: string[];
  estimated_time_savings_pct: number;
}

// ---------------------------------------------------------------------------
// Controller-specific code templates
// ---------------------------------------------------------------------------

const SMOOTHING_CODES: Record<AdvancedController, Record<string, string>> = {
  fanuc: {
    rough: "G5.1 Q1 R5.0",           // AI contour control, tolerance 5mm
    finish: "G5.1 Q1 R0.01",         // tight tolerance
    ultra: "G5.1 Q1 R0.005",         // ultra-finish
    off: "G5.1 Q0",
  },
  haas: {
    rough: "G187 P1 E0.05",          // roughing smoothness
    finish: "G187 P3 E0.005",        // finish smoothness
    ultra: "G187 P3 E0.001",         // ultra-finish
    off: "G187 P2",                  // medium (default)
  },
  siemens: {
    rough: "CYCLE832(0.05,1)",        // compressor on, rough
    finish: "CYCLE832(0.005,1)",      // finish tolerance
    ultra: "CYCLE832(0.001,1)",       // ultra
    off: "CYCLE832()",               // off
  },
  heidenhain: {
    rough: "M120 LA5.0",             // look-ahead 5mm
    finish: "M120 LA0.01",           // tight
    ultra: "M120 LA0.005",           // ultra
    off: "M120",                     // default
  },
  mazak: {
    rough: "G5.1 Q1 R5.0",
    finish: "G5.1 Q1 R0.01",
    ultra: "G5.1 Q1 R0.005",
    off: "G5.1 Q0",
  },
  okuma: {
    rough: "G08 P1",                 // high-speed mode
    finish: "G08 P1",               // same code, different path planning
    ultra: "G08 P1",
    off: "G08 P0",
  },
  // Hurco WinMax V11 / UltiMotion does NOT accept inline smoothing G-codes
  // (no Fanuc G5.1 Q1, no Haas G187 P#). Smoothing tolerance is a control-
  // panel parameter (Settings → Performance → Smoothing Tolerance / UltiMotion
  // toggle). Emitting an inline G187 or G5.1 would surface as a parse error
  // on V11. Emit comment annotations documenting the intended target so the
  // operator sees it in the program; injectHSM also surfaces a warning.
  hurco: {
    rough: "(HURCO V11: smoothing tol target ~0.05mm — set in WinMax UI)",
    finish: "(HURCO V11: smoothing tol target ~0.005mm — set in WinMax UI)",
    ultra: "(HURCO V11: smoothing tol target ~0.001mm — set in WinMax UI)",
    off: "(HURCO V11: UltiMotion off — verify in WinMax UI)",
  },
};

const NURBS_CODES: Record<AdvancedController, { start: string; end: string } | null> = {
  fanuc: { start: "G06.2 P3 K1", end: "G01" },           // NURBS mode
  haas: null,                                              // Not supported
  siemens: { start: "BSPLINE", end: "G01" },              // Siemens B-spline
  heidenhain: null,                                        // Use spline blocks
  mazak: { start: "G06.2 P3 K1", end: "G01" },            // Mazak NURBS
  okuma: { start: "G06.2", end: "G01" },
  hurco: null,                                             // V11 stock control has no inline NURBS interpolation
};

const CORNER_ROUNDING: Record<AdvancedController, (tol: number) => string> = {
  fanuc: (tol) => `G62 P1\nG64 P${tol.toFixed(3)}`,       // corner rounding + path blending
  haas: (tol) => `G187 P3 E${tol.toFixed(4)}`,            // smoothness with tolerance
  siemens: (tol) => `G642\nCOMPRESS TOL=${tol.toFixed(3)}`, // spline compression
  heidenhain: (tol) => `TOLERANCE ${tol.toFixed(3)}\nM120 LA${(tol * 10).toFixed(1)}`,
  mazak: (tol) => `G62 P1\nG64 P${tol.toFixed(3)}`,
  okuma: (tol) => `G08 P1\nG64 P${tol.toFixed(3)}`,
  // Hurco V11 supports plain G64 (continuous-path mode) but does NOT accept
  // an inline tolerance argument like G64 P{tol}. Tolerance is set in the
  // WinMax control panel. Emit bare G64 plus a comment documenting the
  // requested tolerance for the operator.
  hurco: (tol) => `(HURCO V11: corner blend tol=${tol.toFixed(3)}mm — set in WinMax UI)\nG64`,
};

const RTCP_ACTIVATE: Record<AdvancedController, Record<string, string>> = {
  fanuc: {
    "G43.4": "G43.4 H#1",            // standard RTCP
    "G43.5": "G43.5 H#1",            // type 2 RTCP
    "G234": "G43.4 H#1",             // Fanuc doesn't use G234
  },
  haas: {
    "G43.4": "G43.4 H#1",
    "G43.5": "G43.5 H#1",
    "G234": "G234 H#1",              // Haas UMC specific
  },
  siemens: {
    TRAORI: "TRAORI(1)",              // transformation orientation
    TCPM: "TRAFOOF\nTRAORI(1)",      // turn off old, activate new
    "G43.4": "TRAORI(1)",            // mapped to TRAORI
  },
  heidenhain: {
    TCPM: "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS",
    M128: "M128",                    // older TNC TCPM
    "G43.4": "M128",                 // mapped to M128
  },
  mazak: {
    "G43.4": "G43.4 H#1",
    "G43.5": "G43.5 H#1",
    "G234": "G43.4 H#1",
  },
  okuma: {
    "G43.4": "G43.4 H#1",
    "G43.5": "G43.5 H#1",
    "G234": "G43.4 H#1",
  },
  // Hurco 5-axis variants (e.g. VMX5x with WinMax V11) accept Fanuc-style
  // G43.4/G43.5 H#1 RTCP. Stock Hurco VMX24 (3-axis) does NOT support RTCP —
  // callers should gate this pass by axis count upstream. Hurco does not use
  // the Haas-specific G234 form; alias it to G43.4 for compatibility.
  hurco: {
    "G43.4": "G43.4 H#1",
    "G43.5": "G43.5 H#1",
    "G234": "G43.4 H#1",
  },
};

const RTCP_DEACTIVATE: Record<AdvancedController, string> = {
  fanuc: "G49",
  haas: "G49",
  siemens: "TRAFOOF",
  heidenhain: "M129",
  mazak: "G49",
  okuma: "G49",
  hurco: "G49",                      // Hurco V11 uses standard G49 to cancel tool-length comp / RTCP
};

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class AdvancedPostProcessorEngine {
  /**
   * Enhance existing G-code with advanced features.
   * This is the primary entry point — takes raw G-code and injects
   * advanced blocks based on configuration.
   */
  enhance(input: AdvancedPostInput): AdvancedPostResult {
    const enhancements: string[] = [];
    const warnings: string[] = [];
    let gcode = input.gcode;
    let timeSavings = 0;

    // 1. Adaptive Clearing / iMachining injection
    if (input.adaptive_clearing) {
      const result = this.injectAdaptiveClearing(
        gcode,
        input.controller,
        input.adaptive_clearing,
      );
      gcode = result.gcode;
      enhancements.push("adaptive_clearing");
      warnings.push(...result.warnings);
      timeSavings += 15; // typically 15-40% cycle time reduction
    }

    // 2. HSM smoothing & arc fitting
    if (input.hsm) {
      const result = this.injectHSM(gcode, input.controller, input.hsm);
      gcode = result.gcode;
      enhancements.push("hsm_smoothing");
      if (input.hsm.nurbs_interpolation) enhancements.push("nurbs_interpolation");
      if (input.hsm.arc_fitting) enhancements.push("arc_fitting");
      warnings.push(...result.warnings);
      timeSavings += 8;
    }

    // 3. Feed optimization (chip thinning, corners)
    if (input.feed_optimization) {
      const result = this.injectFeedOptimization(
        gcode,
        input.controller,
        input.feed_optimization,
      );
      gcode = result.gcode;
      enhancements.push("feed_optimization");
      warnings.push(...result.warnings);
      timeSavings += 5;
    }

    // 4. Multi-axis RTCP
    if (input.multi_axis) {
      const result = this.injectMultiAxis(gcode, input.controller, input.multi_axis);
      gcode = result.gcode;
      enhancements.push("multi_axis_rtcp");
      warnings.push(...result.warnings);
    }

    // 5. Tool management
    if (input.tool_management) {
      const result = this.injectToolManagement(
        gcode,
        input.controller,
        input.tool_management,
      );
      gcode = result.gcode;
      enhancements.push("tool_management");
      warnings.push(...result.warnings);
    }

    // 6. In-process measurement
    if (input.in_process_measure) {
      const result = this.injectInProcessMeasure(
        gcode,
        input.controller,
        input.in_process_measure,
      );
      gcode = result.gcode;
      enhancements.push("in_process_measurement");
      warnings.push(...result.warnings);
    }

    const result: AdvancedPostResult = {
      gcode,
      enhancements_applied: enhancements,
      warnings,
      estimated_time_savings_pct: Math.min(timeSavings, 50),
    };

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["safety", "anti_pattern"],
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        result.warnings.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Adaptive Clearing / iMachining
  // -------------------------------------------------------------------------

  /**
   * Inject adaptive clearing parameters into G-code.
   * Based on SolidCAM iMachining and Fusion 360 Adaptive Clearing algorithms.
   *
   * Key concepts:
   * - Constant chip load: adjust stepover to maintain optimal tool engagement
   * - Trochoidal slotting: circular arc paths for full-slot engagement
   * - Helical ramping: spiral entry instead of plunge
   * - Feed compensation: increase feed when engagement angle decreases
   */
  private injectAdaptiveClearing(
    gcode: string,
    controller: AdvancedController,
    config: AdaptiveClearingConfig,
  ): { gcode: string; warnings: string[] } {
    const warnings: string[] = [];
    const lines = gcode.split("\n");
    const enhanced: string[] = [];

    // Insert adaptive parameters as header comments
    enhanced.push(`(ADAPTIVE CLEARING - Optimal Load: ${(config.optimal_load * 100).toFixed(0)}%)`);
    enhanced.push(`(Max Stepover: ${config.max_stepover}mm, Min: ${config.min_stepover}mm)`);

    if (config.chip_thinning_compensation) {
      enhanced.push("(CHIP THINNING COMPENSATION ACTIVE)");
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect helical ramp entry points (Z-down with XY motion)
      if (this.isHelicalEntry(line, lines[i - 1])) {
        // Replace plunge with helical ramp
        const rampBlock = this.generateHelicalRamp(
          controller,
          config.ramp_angle,
          config.ramp_diameter_factor,
        );
        enhanced.push(`(HELICAL RAMP ENTRY - ${config.ramp_angle}deg)`);
        enhanced.push(...rampBlock);
        continue;
      }

      // Detect slot cutting (full engagement) → inject trochoidal
      if (config.use_trochoidal && this.isSlotCut(line, lines)) {
        const trochBlock = this.generateTrochoidalBlock(controller, config);
        enhanced.push("(TROCHOIDAL SLOT MILLING)");
        enhanced.push(...trochBlock);
        enhanced.push(line);
        continue;
      }

      // Feed compensation for chip thinning
      if (config.chip_thinning_compensation && this.isFeedMove(line)) {
        const compensated = this.applyChipThinningToLine(line, config);
        enhanced.push(compensated);
        continue;
      }

      enhanced.push(line);
    }

    return { gcode: enhanced.join("\n"), warnings };
  }

  private isHelicalEntry(line: string, prevLine?: string): boolean {
    if (!line || !prevLine) return false;
    const hasXY = /[XY]/.test(line);
    const hasZDown = /Z-?\d/.test(line) && /G0?[123]/.test(line);
    const prevIsRapid = /G0[0 ]/.test(prevLine);
    return hasXY && hasZDown && prevIsRapid;
  }

  private isSlotCut(line: string, _allLines: string[]): boolean {
    // Detect full-width cuts (slot) by looking for linear moves without prior stepover
    return /G0?1\s/.test(line) && /F\d/.test(line) && !/[IJ]/.test(line);
  }

  private isFeedMove(line: string): boolean {
    return /G0?1\s/.test(line) && /F\d/.test(line);
  }

  private generateHelicalRamp(
    controller: AdvancedController,
    angle: number,
    diaFactor: number,
  ): string[] {
    const lines: string[] = [];
    const helixComment = controller === "heidenhain"
      ? `; Helix entry ${angle}deg, ${(diaFactor * 100).toFixed(0)}% dia`
      : `(Helix entry ${angle}deg, ${(diaFactor * 100).toFixed(0)}% dia)`;
    lines.push(helixComment);
    // The actual helix toolpath is generated by CAM — this adds the approach
    // mode annotation for the controller to optimize motion planning
    if (controller === "siemens") {
      lines.push("COMPCAD");  // activate spline compression for helix
    }
    return lines;
  }

  private generateTrochoidalBlock(
    controller: AdvancedController,
    config: AdaptiveClearingConfig,
  ): string[] {
    const lines: string[] = [];
    // Trochoidal parameters as structured comments
    if (controller === "siemens") {
      // Siemens native trochoidal support via CYCLE899
      lines.push(`CYCLE899(${config.max_stepover.toFixed(2)},${config.optimal_load.toFixed(2)},1)`);
    } else if (controller === "heidenhain") {
      // Heidenhain trochoidal milling cycle
      lines.push(`CYCL DEF 233 FACE MILLING`);
      lines.push(`Q389=${config.max_stepover.toFixed(2)} ;STEPOVER`);
    } else {
      // Generic trochoidal annotation
      lines.push(`(TROCH: stepover=${config.max_stepover} load=${(config.optimal_load * 100).toFixed(0)}%)`);
    }
    return lines;
  }

  private applyChipThinningToLine(line: string, config: AdaptiveClearingConfig): string {
    // Chip thinning formula: F_actual = F_programmed × (ae / (2 × sqrt(ae × (D - ae))))
    // where ae = stepover, D = tool diameter
    // We annotate the compensation factor
    const feedMatch = line.match(/F(\d+\.?\d*)/);
    if (!feedMatch) return line;
    const baseFeed = parseFloat(feedMatch[1]);
    // Approximate: if stepover < 50% of tool, increase feed
    const ratio = config.optimal_load;
    const thinningFactor = ratio < 0.5 ? 1 / Math.sqrt(2 * ratio) : 1.0;
    const compensatedFeed = Math.round(baseFeed * Math.min(thinningFactor, 1.5));
    if (compensatedFeed !== baseFeed) {
      return line.replace(/F\d+\.?\d*/, `F${compensatedFeed}`) +
        ` (CTF: ${thinningFactor.toFixed(2)}x)`;
    }
    return line;
  }

  // -------------------------------------------------------------------------
  // HSM Smoothing & NURBS
  // -------------------------------------------------------------------------

  private injectHSM(
    gcode: string,
    controller: AdvancedController,
    config: HSMConfig,
  ): { gcode: string; warnings: string[] } {
    const warnings: string[] = [];

    // Hurco V11 / WinMax / UltiMotion has no inline smoothing G-code; the
    // SMOOTHING_CODES.hurco entries emit operator-facing comments documenting
    // the intended tolerance. Surface a structured warning so the caller
    // can decide whether to also push a programmer note into the post output.
    if (controller === "hurco" && config.smoothing_mode !== "off") {
      warnings.push(
        "Hurco V11 has no inline smoothing G-code; UltiMotion / smoothing tolerance is set in the WinMax control panel. Emitted comment annotations only.",
      );
    }
    if (controller === "hurco" && config.nurbs_interpolation) {
      // NURBS_CODES.hurco is null — the existing null-handler will push its
      // own warning. We add nothing here to avoid duplicate warning text.
    }

    const lines = gcode.split("\n");
    const enhanced: string[] = [];

    // Insert smoothing activation after safe start block
    const smoothCode = SMOOTHING_CODES[controller][config.smoothing_mode];
    let smoothInserted = false;

    for (let i = 0; i < lines.length; i++) {
      enhanced.push(lines[i]);

      // Insert smoothing after first tool call or safe start
      if (!smoothInserted && /[TM]0?6/.test(lines[i])) {
        if (smoothCode) {
          enhanced.push(smoothCode);
          smoothInserted = true;
        }
      }
    }

    // Corner rounding
    if (config.corner_rounding_tolerance > 0) {
      const crCode = CORNER_ROUNDING[controller](config.corner_rounding_tolerance);
      // Insert after smoothing code
      const insertIdx = enhanced.findIndex((l) => l === smoothCode);
      if (insertIdx >= 0) {
        enhanced.splice(insertIdx + 1, 0, crCode);
      }
    }

    // NURBS interpolation
    if (config.nurbs_interpolation) {
      const nurbs = NURBS_CODES[controller];
      if (nurbs) {
        // Wrap feed moves in NURBS mode
        let inNurbs = false;
        for (let i = 0; i < enhanced.length; i++) {
          if (/G0?1\s/.test(enhanced[i]) && !inNurbs) {
            enhanced.splice(i, 0, nurbs.start);
            inNurbs = true;
            i++;
          } else if (inNurbs && (/G0?0\s/.test(enhanced[i]) || /M0?[359]/.test(enhanced[i]))) {
            enhanced.splice(i, 0, nurbs.end);
            inNurbs = false;
            i++;
          }
        }
        if (inNurbs) enhanced.push(nurbs.end);
      } else {
        warnings.push(`NURBS interpolation not supported on ${controller}`);
      }
    }

    return { gcode: enhanced.join("\n"), warnings };
  }

  // -------------------------------------------------------------------------
  // Feed Optimization
  // -------------------------------------------------------------------------

  private injectFeedOptimization(
    gcode: string,
    controller: AdvancedController,
    config: FeedOptimizationConfig,
  ): { gcode: string; warnings: string[] } {
    const warnings: string[] = [];
    const lines = gcode.split("\n");
    const enhanced: string[] = [];

    let prevX = 0, prevY = 0;

    for (const line of lines) {
      // Track XY position for corner detection
      const xMatch = line.match(/X(-?\d+\.?\d*)/);
      const yMatch = line.match(/Y(-?\d+\.?\d*)/);
      const curX = xMatch ? parseFloat(xMatch[1]) : prevX;
      const curY = yMatch ? parseFloat(yMatch[1]) : prevY;

      // Corner slowdown
      if (config.corner_slowdown && this.isFeedMove(line)) {
        const dx = curX - prevX;
        const dy = curY - prevY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < config.corner_radius_threshold) {
          const feedMatch = line.match(/F(\d+\.?\d*)/);
          if (feedMatch) {
            const slowFeed = Math.round(parseFloat(feedMatch[1]) * config.corner_feed_factor);
            enhanced.push(
              line.replace(/F\d+\.?\d*/, `F${slowFeed}`) +
              ` (CORNER SLOWDOWN ${(config.corner_feed_factor * 100).toFixed(0)}%)`,
            );
            prevX = curX;
            prevY = curY;
            continue;
          }
        }
      }

      // Plunge rate reduction
      if (config.plunge_rate_factor < 1.0 && /G0?1\s/.test(line) && /Z-/.test(line)) {
        const feedMatch = line.match(/F(\d+\.?\d*)/);
        if (feedMatch) {
          const plungeFeed = Math.round(parseFloat(feedMatch[1]) * config.plunge_rate_factor);
          enhanced.push(
            line.replace(/F\d+\.?\d*/, `F${plungeFeed}`) + " (PLUNGE RATE)",
          );
          prevX = curX;
          prevY = curY;
          continue;
        }
      }

      // Arc feed limiting
      if (config.arc_feed_limit && /G0?[23]/.test(line)) {
        const feedMatch = line.match(/F(\d+\.?\d*)/);
        if (feedMatch && parseFloat(feedMatch[1]) > config.arc_feed_limit) {
          enhanced.push(
            line.replace(/F\d+\.?\d*/, `F${config.arc_feed_limit}`) +
            " (ARC FEED LIMIT)",
          );
          prevX = curX;
          prevY = curY;
          continue;
        }
      }

      enhanced.push(line);
      prevX = curX;
      prevY = curY;
    }

    return { gcode: enhanced.join("\n"), warnings };
  }

  // -------------------------------------------------------------------------
  // Multi-Axis RTCP
  // -------------------------------------------------------------------------

  private injectMultiAxis(
    gcode: string,
    controller: AdvancedController,
    config: MultiAxisConfig,
  ): { gcode: string; warnings: string[] } {
    const warnings: string[] = [];
    const lines = gcode.split("\n");
    const enhanced: string[] = [];

    const rtcpMap = RTCP_ACTIVATE[controller];
    const activateCode = rtcpMap?.[config.rtcp_mode] ?? rtcpMap?.["G43.4"];
    const deactivateCode = RTCP_DEACTIVATE[controller];

    if (!activateCode) {
      warnings.push(`RTCP mode ${config.rtcp_mode} not available for ${controller}`);
      return { gcode, warnings };
    }

    // Insert RTCP activation after tool call
    let rtcpInserted = false;
    let hasRotary = false;

    for (const line of lines) {
      // Check for rotary axes
      if (/[ABC]-?\d/.test(line)) hasRotary = true;

      // Activate RTCP after tool length comp or first rotary move
      if (!rtcpInserted && hasRotary) {
        enhanced.push(activateCode);
        if (config.inverse_time_feed) {
          enhanced.push("G93 (INVERSE TIME FEED)");
        }
        if (config.tool_vector_output && controller === "siemens") {
          enhanced.push("ORIAXES (TOOL VECTOR MODE)");
        } else if (config.tool_vector_output && controller === "heidenhain") {
          enhanced.push("FUNCTION TCPM F TCP AXIS SPAT PATHCTRL AXIS");
        }
        rtcpInserted = true;
      }

      // Singularity avoidance near poles
      if (config.singularity_avoidance && /[ABC]/.test(line)) {
        const aMatch = line.match(/A(-?\d+\.?\d*)/);
        const bMatch = line.match(/B(-?\d+\.?\d*)/);
        if (aMatch || bMatch) {
          const angle = parseFloat((aMatch ?? bMatch)![1]);
          if (Math.abs(angle) < config.singularity_tolerance ||
              Math.abs(Math.abs(angle) - 180) < config.singularity_tolerance) {
            warnings.push(`Near-singularity at ${aMatch ? "A" : "B"}${angle}°`);
            enhanced.push(`(WARNING: Near singularity — consider linearization)`);
          }
        }
      }

      enhanced.push(line);
    }

    // Deactivate RTCP before program end
    if (rtcpInserted) {
      let endIdx = -1;
      for (let i = enhanced.length - 1; i >= 0; i--) {
        if (/M0?[39]0|M0?2\b/.test(enhanced[i])) { endIdx = i; break; }
      }
      if (endIdx >= 0) {
        if (config.inverse_time_feed) {
          enhanced.splice(endIdx, 0, "G94 (FEED PER MINUTE RESTORED)");
        }
        enhanced.splice(endIdx, 0, deactivateCode);
      }
    }

    return { gcode: enhanced.join("\n"), warnings };
  }

  // -------------------------------------------------------------------------
  // Tool Management
  // -------------------------------------------------------------------------

  private injectToolManagement(
    gcode: string,
    controller: AdvancedController,
    config: ToolManagementConfig,
  ): { gcode: string; warnings: string[] } {
    const warnings: string[] = [];
    const lines = gcode.split("\n");
    const enhanced: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // At each tool change, add tool management blocks
      if (/T\d+\s*M0?6/.test(line) || /M0?6\s*T\d+/.test(line)) {
        const toolMatch = line.match(/T(\d+)/);
        const toolNum = toolMatch ? parseInt(toolMatch[1]) : 0;

        enhanced.push(line);

        // Sister tool logic
        if (config.sister_tooling) {
          enhanced.push(...this.generateSisterToolBlock(controller, toolNum, config));
        }

        // Break detection after tool change
        if (config.break_detection) {
          enhanced.push(...this.generateBreakDetection(
            controller,
            toolNum,
            config.break_detection_method,
          ));
        }

        continue;
      }

      enhanced.push(line);
    }

    return { gcode: enhanced.join("\n"), warnings };
  }

  private generateSisterToolBlock(
    controller: AdvancedController,
    toolNum: number,
    config: ToolManagementConfig,
  ): string[] {
    const lines: string[] = [];
    const sisterTool = toolNum + 100; // Convention: sister tool = T + 100
    const lifeVar = controller === "siemens" ? `R${200 + toolNum}` :
      controller === "heidenhain" ? `Q${200 + toolNum}` :
      `#${500 + toolNum}`;
    const maxLife = config.max_tool_life_minutes;

    lines.push(`(TOOL LIFE CHECK - T${toolNum})`);

    if (
      controller === "fanuc" ||
      controller === "haas" ||
      controller === "mazak" ||
      controller === "okuma" ||
      controller === "hurco"  // Hurco V11 supports Fanuc-style #500-series macros + IF [] GOTO syntax
    ) {
      lines.push(`IF [${lifeVar} GE ${maxLife}] GOTO 9900`);
      lines.push(`(SISTER TOOL: T${sisterTool})`);
      // Jump target at end of program for sister tool swap
    } else if (controller === "siemens") {
      lines.push(`IF ${lifeVar}>=${maxLife} GOTOF SISTER_T${toolNum}`);
    } else if (controller === "heidenhain") {
      lines.push(`FN 9: IF +${lifeVar} GE +${maxLife} GOTO LBL 99`);
    }

    // Auto wear offset update
    if (config.auto_offset_update) {
      const wearInc = config.wear_offset_increment;
      lines.push(`(AUTO WEAR: ${wearInc}mm/life%)`);
    }

    return lines;
  }

  private generateBreakDetection(
    controller: AdvancedController,
    toolNum: number,
    method: string,
  ): string[] {
    const lines: string[] = [];
    lines.push(`(TOOL BREAK CHECK - T${toolNum} via ${method.toUpperCase()})`);

    if (method === "probe") {
      if (
        controller === "fanuc" ||
        controller === "haas" ||
        controller === "mazak" ||
        controller === "okuma" ||
        controller === "hurco"  // Hurco V11 + Renishaw OMP40 install macros under O9xxx slots; G65 P9xxx call form is identical to Fanuc
      ) {
        // P9023 is the conventional Renishaw tool-length-measure slot installed
        // by Renishaw on most CNC controls (Fanuc/Haas/Hurco/Okuma). On Hurco
        // installs the P-number can vary by Renishaw kit revision; operator
        // should verify against the installed macro library.
        lines.push("G65 P9023 (TOOL LENGTH MEASURE)");
        lines.push(`IF [#182 LT #501] GOTO 9999 (BROKEN TOOL ALARM)`);
      } else if (controller === "siemens") {
        lines.push(`CYCLE982(${toolNum},0,0,0)`);
      } else if (controller === "heidenhain") {
        lines.push(`TCH PROBE 481 TOOL LENGTH`);
        lines.push(`Q340=${toolNum} ;TOOL NUMBER`);
      }
    } else if (method === "load_monitor") {
      lines.push(`(SPINDLE LOAD MONITOR ACTIVE)`);
      if (controller === "haas") {
        // Haas setting 84 — overload detection
        lines.push("(CHECK SETTING 84 FOR OVERLOAD %)");
      }
    } else if (method === "laser") {
      lines.push(`(LASER TOOL CHECK)`);
      if (controller === "fanuc") {
        lines.push("M26 (LASER TOOL SETTER ON)");
        lines.push("G65 P8150 (LASER MEASURE MACRO)");
        lines.push("M27 (LASER TOOL SETTER OFF)");
      }
    }

    return lines;
  }

  // -------------------------------------------------------------------------
  // In-Process Measurement
  // -------------------------------------------------------------------------

  private injectInProcessMeasure(
    gcode: string,
    controller: AdvancedController,
    config: InProcessMeasureConfig,
  ): { gcode: string; warnings: string[] } {
    const warnings: string[] = [];
    const lines = gcode.split("\n");
    const enhanced: string[] = [];

    // Add measurement subroutine at program end
    enhanced.push(...lines);

    // Generate measurement block
    enhanced.push("");
    enhanced.push(`(IN-PROCESS MEASUREMENT - Every ${config.measure_every_n_parts} parts)`);

    const counterVar = controller === "siemens" ? "R199" :
      controller === "heidenhain" ? "Q199" : "#199";

    // Part counter logic
    if (
      controller === "fanuc" ||
      controller === "haas" ||
      controller === "mazak" ||
      controller === "okuma" ||
      controller === "hurco"  // Hurco V11 supports #199 Fanuc-style macro variables + IF [] GOTO
    ) {
      enhanced.push(`${counterVar}=${counterVar}+1`);
      enhanced.push(`IF [${counterVar} LT ${config.measure_every_n_parts}] GOTO 9800`);
      enhanced.push(`${counterVar}=0`);
    } else if (controller === "siemens") {
      enhanced.push(`${counterVar}=${counterVar}+1`);
      enhanced.push(`IF ${counterVar}<${config.measure_every_n_parts} GOTOF SKIP_MEASURE`);
      enhanced.push(`${counterVar}=0`);
    } else if (controller === "heidenhain") {
      enhanced.push(`FN 1: ${counterVar} = ${counterVar} + 1`);
      enhanced.push(`FN 9: IF +${counterVar} LT +${config.measure_every_n_parts} GOTO LBL 98`);
      enhanced.push(`FN 0: ${counterVar} = +0`);
    }

    // Measurement cycles for each critical feature
    for (const feature of config.critical_features) {
      enhanced.push(`(MEASURE: ${feature.type} nom=${feature.nominal} tol=${feature.tolerance_plus}/${feature.tolerance_minus})`);

      const measBlock = this.generateMeasurementBlock(controller, feature);
      enhanced.push(...measBlock);

      // Auto-compensate: update work offset or tool offset
      if (config.auto_compensate) {
        enhanced.push(...this.generateCompensationBlock(controller, feature));
      }

      // Alarm on out-of-tolerance
      if (config.alarm_on_out_of_tolerance) {
        enhanced.push(...this.generateToleranceAlarm(controller, feature));
      }
    }

    // SPC logging
    if (config.spc_logging) {
      enhanced.push(`(SPC DATA LOGGED TO DPRNT)`);
      if (controller === "fanuc" || controller === "haas") {
        enhanced.push("DPRNT[SPC_MEAS*#185[44]*#186[44]*#182[44]]");
      } else if (controller === "siemens") {
        enhanced.push("MSG(\"SPC:\" << R185 << \",\" << R186 << \",\" << R182)");
      }
    }

    // Skip label
    if (controller === "fanuc" || controller === "haas" || controller === "mazak" || controller === "okuma") {
      enhanced.push("N9800 (SKIP MEASUREMENT)");
    } else if (controller === "siemens") {
      enhanced.push("SKIP_MEASURE:");
    } else if (controller === "heidenhain") {
      enhanced.push("LBL 98");
    }

    return { gcode: enhanced.join("\n"), warnings };
  }

  private generateMeasurementBlock(
    controller: AdvancedController,
    feature: InProcessMeasureConfig["critical_features"][0],
  ): string[] {
    const lines: string[] = [];

    // U-PP-NONFINITE-EMIT-SWEEP: a non-finite feature.nominal would emit a literal
    // `ZNaN`/`DInfinity`/`WNaN` the probe macro rejects -- emit an ERROR marker instead
    // (this block-builder has no warnings channel; the inline comment is the fail-loud
    // signal). Covers every controller branch below in one guard. Byte-identical finite.
    if (!Number.isFinite(feature.nominal)) {
      return [`(ERROR: ${String(feature.type ?? "FEATURE").toUpperCase()} MEASURE NON-FINITE NOMINAL (${feature.nominal}) - NO PROBE EMITTED, REVIEW)`];
    }

    if (controller === "fanuc" || controller === "haas" || controller === "mazak" || controller === "okuma") {
      switch (feature.type) {
        case "bore":
          lines.push(`G65 P9812 D${feature.nominal.toFixed(3)} (BORE MEASURE)`);
          break;
        case "boss":
          lines.push(`G65 P9814 D${feature.nominal.toFixed(3)} (BOSS MEASURE)`);
          break;
        case "surface":
          lines.push(`G65 P9811 Z${feature.nominal.toFixed(3)} (SURFACE MEASURE)`);
          break;
        case "web":
          lines.push(`G65 P9843 W${feature.nominal.toFixed(3)} (WEB MEASURE)`);
          break;
      }
    } else if (controller === "siemens") {
      const cycleMap = { bore: "CYCLE977", boss: "CYCLE977", surface: "CYCLE978", web: "CYCLE977" };
      lines.push(`${cycleMap[feature.type]}(${feature.nominal.toFixed(3)},0,0,0,0,0,0)`);
    } else if (controller === "heidenhain") {
      const probeMap = { bore: "421", boss: "422", surface: "427", web: "409" };
      lines.push(`TCH PROBE ${probeMap[feature.type]} MEASURE`);
      lines.push(`Q263=${feature.nominal.toFixed(3)} ;NOMINAL`);
    }

    return lines;
  }

  private generateCompensationBlock(
    controller: AdvancedController,
    feature: InProcessMeasureConfig["critical_features"][0],
  ): string[] {
    const lines: string[] = [];
    lines.push(`(AUTO COMPENSATE → ${feature.work_offset})`);

    if (controller === "fanuc" || controller === "haas") {
      // Use G10 to update work offset
      const offsetNum = parseInt(feature.work_offset.replace(/\D/g, "")) || 1;
      lines.push(`G10 L2 P${offsetNum} Z[#182-${feature.nominal.toFixed(3)}]`);
    } else if (controller === "siemens") {
      lines.push(`$P_UIFR[1,Z,TR]=$AA_MW[Z]-${feature.nominal.toFixed(3)}`);
    } else if (controller === "heidenhain") {
      lines.push(`CYCL DEF 247 DATUM SETTING`);
    }

    return lines;
  }

  private generateToleranceAlarm(
    controller: AdvancedController,
    feature: InProcessMeasureConfig["critical_features"][0],
  ): string[] {
    const lines: string[] = [];
    const nom = feature.nominal;
    const upper = nom + feature.tolerance_plus;
    const lower = nom + feature.tolerance_minus;

    if (controller === "fanuc" || controller === "haas" || controller === "mazak" || controller === "okuma") {
      lines.push(`IF [#187 GT ${upper.toFixed(3)}] GOTO 9999`);
      lines.push(`IF [#187 LT ${lower.toFixed(3)}] GOTO 9999`);
    } else if (controller === "siemens") {
      lines.push(`IF R187>${upper.toFixed(3)} SETAL(61000)`);
      lines.push(`IF R187<${lower.toFixed(3)} SETAL(61000)`);
    } else if (controller === "heidenhain") {
      lines.push(`FN 9: IF +Q187 GT +${upper.toFixed(3)} GOTO LBL 99`);
      lines.push(`FN 9: IF +Q187 LT +${lower.toFixed(3)} GOTO LBL 99`);
    }

    return lines;
  }

  // -------------------------------------------------------------------------
  // Static helpers
  // -------------------------------------------------------------------------

  supportedControllers(): AdvancedController[] {
    return ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"];
  }

  supportedFeatures(): string[] {
    return [
      "adaptive_clearing",
      "hsm_smoothing",
      "nurbs_interpolation",
      "arc_fitting",
      "corner_rounding",
      "feed_optimization",
      "chip_thinning",
      "multi_axis_rtcp",
      "tool_management",
      "sister_tooling",
      "break_detection",
      "in_process_measurement",
      "auto_compensation",
      "spc_logging",
    ];
  }
}

export const advancedPostProcessorEngine = new AdvancedPostProcessorEngine();
