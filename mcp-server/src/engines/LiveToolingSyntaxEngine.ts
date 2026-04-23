/**
 * LiveToolingSyntaxEngine — MIO-MS0/U-MIO21
 *
 * Generates G-code syntax for live tooling on mill-turn machines.
 * Handles C-axis indexing, Y-axis milling, and coordinate transforms.
 *
 * Controller support:
 * - Okuma OSP: G12.1 polar interpolation, C-axis with MSTN
 * - Fanuc: G12.1/G13.1 polar, C-axis with M3/M4
 * - Mazak: Milling mode with C-axis
 * - DMG MORI: TURN/MILL switching
 *
 * Coordinate systems:
 * - C-axis: rotational (degrees or radians)
 * - Y-axis: linear (mm)
 * - Polar interpolation: G12.1/G13.1
 *
 * @module engines/LiveToolingSyntaxEngine
 * @milestone MIO-MS0
 */

import { log } from "../utils/Logger.js";

export type ControllerType = "okuma" | "fanuc" | "mazak" | "dmg" | "haas" | "doosan";

export interface LiveToolingParams {
  controller: ControllerType;
  c_axis_mode: "degrees" | "radians";
  y_axis_available: boolean;
  polar_interpolation: boolean;
  work_offset: string;
}

export interface CAxisMove {
  type: "index" | "continuous";
  angle_deg: number;
  feedrate?: number;
}

export interface YAxisMove {
  y: number;
  z: number;
  feedrate: number;
}

export interface LiveToolingOperation {
  type: "c_index" | "c_contour" | "y_mill" | "polar" | "mill_drill";
  spindle: "main" | "sub" | "live";
  tool_number: number;
  operations: (CAxisMove | YAxisMove)[];
  coolant?: "flood" | "mist" | "off";
}

export interface LiveToolingCodeResult {
  code: string[];
  mode_changes: string[];
  warnings: string[];
  ai_reasoning: string[];
}

const CONTROLLER_SYNTAX: Record<ControllerType, {
  c_axis_on: string;
  c_axis_off: string;
  polar_on: string;
  polar_off: string;
  y_axis_mode: string;
  spindle_clamp: string;
  spindle_release: string;
  live_tool_start: string;
  milling_mode: string;
  turning_mode: string;
}> = {
  okuma: {
    c_axis_on: "M32",
    c_axis_off: "M33",
    polar_on: "G12.1",
    polar_off: "G13.1",
    y_axis_mode: "G17",
    spindle_clamp: "M10",
    spindle_release: "M11",
    live_tool_start: "M23",
    milling_mode: "MILL",
    turning_mode: "TURN",
  },
  fanuc: {
    c_axis_on: "M200",
    c_axis_off: "M201",
    polar_on: "G12.1",
    polar_off: "G13.1",
    y_axis_mode: "G17",
    spindle_clamp: "M10",
    spindle_release: "M11",
    live_tool_start: "M33",
    milling_mode: "G18",
    turning_mode: "G19",
  },
  mazak: {
    c_axis_on: "G43.4",
    c_axis_off: "G49",
    polar_on: "G12.1",
    polar_off: "G13.1",
    y_axis_mode: "G17",
    spindle_clamp: "M11",
    spindle_release: "M10",
    live_tool_start: "M25",
    milling_mode: "G112",
    turning_mode: "G111",
  },
  dmg: {
    c_axis_on: "SPOS=0",
    c_axis_off: "M5",
    polar_on: "TRANSMIT",
    polar_off: "TRAFOOF",
    y_axis_mode: "G17",
    spindle_clamp: "M19",
    spindle_release: "M3",
    live_tool_start: "M5=3",
    milling_mode: "SETMS(2)",
    turning_mode: "SETMS(1)",
  },
  haas: {
    c_axis_on: "M154",
    c_axis_off: "M155",
    polar_on: "G12.1",
    polar_off: "G13.1",
    y_axis_mode: "G17",
    spindle_clamp: "M10",
    spindle_release: "M11",
    live_tool_start: "M133",
    milling_mode: "G17",
    turning_mode: "G18",
  },
  doosan: {
    c_axis_on: "G47.1",
    c_axis_off: "G47.1 P0",
    polar_on: "G12.1",
    polar_off: "G13.1",
    y_axis_mode: "G17",
    spindle_clamp: "M11",
    spindle_release: "M10",
    live_tool_start: "M33",
    milling_mode: "G136",
    turning_mode: "G137",
  },
};

class LiveToolingSyntaxEngine {
  /**
   * Generate C-axis indexing code
   */
  generateCAxisIndex(
    angle_deg: number,
    params: LiveToolingParams
  ): LiveToolingCodeResult {
    const syntax = CONTROLLER_SYNTAX[params.controller];
    const code: string[] = [];
    const modeChanges: string[] = [];
    const warnings: string[] = [];
    const reasoning: string[] = [];

    reasoning.push(`[LIVE-TOOL] C-axis index to ${angle_deg}° on ${params.controller}`);

    // Normalize angle
    const normalizedAngle = ((angle_deg % 360) + 360) % 360;

    // Enable C-axis
    code.push(`(C-AXIS INDEX TO ${normalizedAngle} DEG)`);
    code.push(syntax.spindle_clamp);
    modeChanges.push("spindle_clamp");

    code.push(syntax.c_axis_on);
    modeChanges.push("c_axis_on");

    // Index move
    if (params.controller === "dmg") {
      code.push(`SPOS=${normalizedAngle}`);
    } else if (params.controller === "okuma") {
      code.push(`G0 C${normalizedAngle.toFixed(3)}`);
    } else {
      code.push(`G0 C${normalizedAngle.toFixed(3)}`);
    }

    reasoning.push(`[LIVE-TOOL] Using ${syntax.c_axis_on} for C-axis enable`);

    return { code, mode_changes: modeChanges, warnings, ai_reasoning: reasoning };
  }

  /**
   * Generate Y-axis milling code
   */
  generateYAxisMilling(
    operation: LiveToolingOperation,
    params: LiveToolingParams
  ): LiveToolingCodeResult {
    const syntax = CONTROLLER_SYNTAX[params.controller];
    const code: string[] = [];
    const modeChanges: string[] = [];
    const warnings: string[] = [];
    const reasoning: string[] = [];

    if (!params.y_axis_available) {
      const fallback = this.generatePolarMilling(operation, params);
      fallback.warnings.unshift("Y-axis not available - using C-axis interpolation instead");
      return fallback;
    }

    reasoning.push(`[LIVE-TOOL] Y-axis milling on ${params.controller}`);

    // Switch to milling mode
    code.push(`(Y-AXIS MILLING)`);
    code.push(syntax.milling_mode);
    modeChanges.push("milling_mode");

    // Set plane
    code.push(syntax.y_axis_mode);
    modeChanges.push("y_axis_mode");

    // Start live tool spindle
    code.push(`T${operation.tool_number} M6`);
    code.push(syntax.live_tool_start);
    modeChanges.push("live_tool");

    // Clamp main spindle
    code.push(syntax.spindle_clamp);

    // Generate moves
    for (const move of operation.operations) {
      if ("y" in move) {
        const yMove = move as YAxisMove;
        code.push(`G1 Y${yMove.y.toFixed(3)} Z${yMove.z.toFixed(3)} F${yMove.feedrate}`);
      }
    }

    // Coolant
    if (operation.coolant === "flood") {
      code.push("M8");
    } else if (operation.coolant === "mist") {
      code.push("M7");
    }

    reasoning.push(`[LIVE-TOOL] Generated ${operation.operations.length} moves`);

    return { code, mode_changes: modeChanges, warnings, ai_reasoning: reasoning };
  }

  /**
   * Generate polar interpolation milling
   */
  generatePolarMilling(
    operation: LiveToolingOperation,
    params: LiveToolingParams
  ): LiveToolingCodeResult {
    const syntax = CONTROLLER_SYNTAX[params.controller];
    const code: string[] = [];
    const modeChanges: string[] = [];
    const warnings: string[] = [];
    const reasoning: string[] = [];

    reasoning.push(`[LIVE-TOOL] Polar interpolation on ${params.controller}`);

    // Enable polar interpolation
    code.push(`(POLAR INTERPOLATION)`);
    code.push(syntax.polar_on);
    modeChanges.push("polar_on");

    // Live tool spindle
    code.push(`T${operation.tool_number} M6`);
    code.push(syntax.live_tool_start);

    // In polar mode, X becomes radius, C becomes angle
    for (const move of operation.operations) {
      if ("angle_deg" in move) {
        const cMove = move as CAxisMove;
        if (cMove.type === "continuous" && cMove.feedrate) {
          code.push(`G1 C${cMove.angle_deg.toFixed(3)} F${cMove.feedrate}`);
        } else {
          code.push(`G0 C${cMove.angle_deg.toFixed(3)}`);
        }
      }
    }

    // Cancel polar
    code.push(syntax.polar_off);
    modeChanges.push("polar_off");

    return { code, mode_changes: modeChanges, warnings, ai_reasoning: reasoning };
  }

  /**
   * Generate mill-drill cycle on C-axis
   */
  generateMillDrill(
    x: number,
    angle_deg: number,
    z_start: number,
    z_end: number,
    feedrate: number,
    params: LiveToolingParams
  ): LiveToolingCodeResult {
    const syntax = CONTROLLER_SYNTAX[params.controller];
    const code: string[] = [];
    const modeChanges: string[] = [];
    const warnings: string[] = [];
    const reasoning: string[] = [];

    reasoning.push(`[LIVE-TOOL] Mill-drill at C${angle_deg}°, X${x}`);

    // Index C-axis
    code.push(`(MILL-DRILL AT C${angle_deg})`);
    code.push(syntax.spindle_clamp);
    code.push(syntax.c_axis_on);
    code.push(`G0 C${angle_deg.toFixed(3)}`);
    code.push(`G0 X${x.toFixed(3)} Z${z_start.toFixed(3)}`);

    // Start live tool
    code.push(syntax.live_tool_start);

    // Drill cycle - use controller-specific canned cycle if available
    if (params.controller === "okuma" || params.controller === "fanuc") {
      code.push(`G83 Z${z_end.toFixed(3)} R${z_start.toFixed(3)} Q2.0 F${feedrate}`);
      code.push("G80");
    } else {
      // Linear drill for other controllers
      code.push(`G1 Z${z_end.toFixed(3)} F${feedrate}`);
      code.push(`G0 Z${z_start.toFixed(3)}`);
    }

    reasoning.push(`[LIVE-TOOL] Drill depth: ${Math.abs(z_end - z_start).toFixed(2)}mm`);

    return { code, mode_changes: modeChanges, warnings, ai_reasoning: reasoning };
  }

  /**
   * Generate coordinate rotation for pattern
   */
  generateRotatedPattern(
    base_code: string[],
    rotations: number[],
    params: LiveToolingParams
  ): LiveToolingCodeResult {
    const syntax = CONTROLLER_SYNTAX[params.controller];
    const code: string[] = [];
    const modeChanges: string[] = [];
    const warnings: string[] = [];
    const reasoning: string[] = [];

    reasoning.push(`[LIVE-TOOL] Rotating pattern ${rotations.length} times`);

    code.push(`(ROTATED PATTERN - ${rotations.length} POSITIONS)`);
    code.push(syntax.c_axis_on);
    modeChanges.push("c_axis_on");

    for (const angle of rotations) {
      code.push(`(POSITION AT ${angle} DEG)`);
      code.push(`G0 C${angle.toFixed(3)}`);

      // Insert pattern code with G68 rotation if supported
      if (params.controller === "fanuc" || params.controller === "okuma") {
        code.push(`G68 R${angle}`);
        code.push(...base_code);
        code.push("G69");
      } else {
        // Manual coordinate adjustment for other controllers
        code.push(...base_code);
      }
    }

    code.push(syntax.c_axis_off);

    return { code, mode_changes: modeChanges, warnings, ai_reasoning: reasoning };
  }

  /**
   * Switch between turning and milling modes
   */
  generateModeSwitch(
    to_mode: "turning" | "milling",
    params: LiveToolingParams
  ): LiveToolingCodeResult {
    const syntax = CONTROLLER_SYNTAX[params.controller];
    const code: string[] = [];
    const modeChanges: string[] = [];
    const reasoning: string[] = [];

    reasoning.push(`[LIVE-TOOL] Mode switch to ${to_mode}`);

    code.push(`(SWITCH TO ${to_mode.toUpperCase()} MODE)`);

    if (to_mode === "turning") {
      code.push(syntax.polar_off);
      code.push(syntax.c_axis_off);
      code.push(syntax.spindle_release);
      code.push(syntax.turning_mode);
      modeChanges.push("turning_mode");
    } else {
      code.push(syntax.spindle_clamp);
      code.push(syntax.c_axis_on);
      code.push(syntax.milling_mode);
      modeChanges.push("milling_mode");
    }

    return { code, mode_changes: modeChanges, warnings: [], ai_reasoning: reasoning };
  }

  /**
   * Get supported features for controller
   */
  getControllerCapabilities(controller: ControllerType): {
    c_axis: boolean;
    y_axis: boolean;
    polar_interpolation: boolean;
    canned_cycles: boolean;
    coordinate_rotation: boolean;
  } {
    const caps = {
      okuma: { c_axis: true, y_axis: true, polar_interpolation: true, canned_cycles: true, coordinate_rotation: true },
      fanuc: { c_axis: true, y_axis: true, polar_interpolation: true, canned_cycles: true, coordinate_rotation: true },
      mazak: { c_axis: true, y_axis: true, polar_interpolation: true, canned_cycles: true, coordinate_rotation: true },
      dmg: { c_axis: true, y_axis: true, polar_interpolation: true, canned_cycles: true, coordinate_rotation: true },
      haas: { c_axis: true, y_axis: false, polar_interpolation: true, canned_cycles: true, coordinate_rotation: false },
      doosan: { c_axis: true, y_axis: true, polar_interpolation: true, canned_cycles: true, coordinate_rotation: true },
    };

    return caps[controller];
  }
}

export const liveToolingSyntaxEngine = new LiveToolingSyntaxEngine();
