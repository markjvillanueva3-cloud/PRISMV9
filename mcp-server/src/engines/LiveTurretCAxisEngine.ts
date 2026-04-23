/**
 * LiveTurretCAxisEngine — C-Axis and Live Tooling Intelligence
 *
 * Covers advanced turning center capabilities:
 * - Okuma polar interpolation (G137/G136) + CYLNDR/POLAR modes
 * - G07.1 cylindrical interpolation for OD slot milling
 * - Real-Y (LB3000-Y) vs virtual-Y (B+C compound) kinematics
 * - G41/G42 tool-tip comp in polar vs cartesian frames
 * - Live tool spindle control (M45/M46, M19, M215/M216)
 * - Multi-turret Y-offset coordination
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR12b
 * @module engines/LiveTurretCAxisEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type CAxisMode = "polar" | "cylindrical" | "cartesian";
export type YAxisType = "real_y" | "virtual_y" | "none";
export type ControllerDialect = "okuma" | "fanuc" | "mazak" | "haas" | "siemens" | "mitsubishi";

export interface MachineKinematics {
  machineId: string;
  controllerDialect: ControllerDialect;
  hasCAxis: boolean;
  cAxisRange_deg: number;
  yAxisType: YAxisType;
  yAxisTravel_mm?: number;
  hasBAxis: boolean;
  bAxisRange_deg?: number;
  maxLiveToolRpm: number;
  liveToolSpindleAddress: "S" | "S2" | "SB";
  subSpindleLiveToolAddress?: "S2" | "SB";
  turretCount: 1 | 2;
  turretYOffset_mm?: number;
}

export interface LiveToolOperation {
  operationType: "face_mill" | "cross_drill" | "cross_tap" | "od_slot" | "keyway" | "polygon" | "contour";
  toolDiameter_mm: number;
  depth_mm: number;
  feedrate_mmpm: number;
  spindleRpm: number;
  cAxisPosition_deg?: number;
  yOffset_mm?: number;
  startAngle_deg?: number;
  endAngle_deg?: number;
}

export interface PolarInterpolationParams {
  mode: "G137" | "G136" | "G12.1" | "G13.1";
  centerX_mm: number;
  centerZ_mm: number;
  radius_mm: number;
  startAngle_deg: number;
  endAngle_deg: number;
  feedrate_mmpm: number;
  direction: "CW" | "CCW";
}

export interface CylindricalInterpolationParams {
  mode: "G07.1" | "G107";
  cylinderDiameter_mm: number;
  helixPitch_mm?: number;
  startZ_mm: number;
  endZ_mm: number;
  startAngle_deg: number;
  endAngle_deg: number;
  feedrate_mmpm: number;
}

export interface GCodeOutput {
  lines: string[];
  mode: CAxisMode;
  warnings: string[];
  estimatedCycleTime_sec: number;
}

// ============================================================================
// CONTROLLER DIALECT MAPPINGS
// ============================================================================

const POLAR_MODE_CODES: Record<ControllerDialect, { on: string; off: string }> = {
  okuma: { on: "G137", off: "G136" },
  fanuc: { on: "G12.1", off: "G13.1" },
  mazak: { on: "G12.1", off: "G13.1" },
  haas: { on: "G12.1", off: "G13.1" },
  siemens: { on: "TRANSMIT", off: "TRAFOOF" },
  mitsubishi: { on: "G12.1", off: "G13.1" },
};

const CYLINDRICAL_MODE_CODES: Record<ControllerDialect, { on: string; off: string }> = {
  okuma: { on: "G07.1", off: "G07.1" },
  fanuc: { on: "G07.1", off: "G07.1" },
  mazak: { on: "G107", off: "G107" },
  haas: { on: "G07.1", off: "G07.1" },
  siemens: { on: "TRACYL", off: "TRAFOOF" },
  mitsubishi: { on: "G07.1", off: "G07.1" },
};

const LIVE_TOOL_CW: Record<ControllerDialect, string> = {
  okuma: "M45",
  fanuc: "M13",
  mazak: "M23",
  haas: "M133",
  siemens: "M3",
  mitsubishi: "M13",
};

const LIVE_TOOL_CCW: Record<ControllerDialect, string> = {
  okuma: "M46",
  fanuc: "M14",
  mazak: "M24",
  haas: "M134",
  siemens: "M4",
  mitsubishi: "M14",
};

const SPINDLE_ORIENT: Record<ControllerDialect, string> = {
  okuma: "M19",
  fanuc: "M19",
  mazak: "M19",
  haas: "M19",
  siemens: "SPOS",
  mitsubishi: "M19",
};

// ============================================================================
// ENGINE
// ============================================================================

export class LiveTurretCAxisEngine {
  /**
   * Determine the best C-axis mode for an operation
   */
  selectCAxisMode(
    kinematics: MachineKinematics,
    operation: LiveToolOperation
  ): CAxisMode {
    if (!kinematics.hasCAxis) {
      return "cartesian";
    }

    // Face milling on end face typically uses polar
    if (operation.operationType === "face_mill" || operation.operationType === "contour") {
      return "polar";
    }

    // OD operations (slots, keyways) use cylindrical
    if (
      operation.operationType === "od_slot" ||
      operation.operationType === "keyway" ||
      operation.operationType === "polygon"
    ) {
      return "cylindrical";
    }

    // Cross drilling/tapping can use either, prefer polar for simplicity
    if (operation.operationType === "cross_drill" || operation.operationType === "cross_tap") {
      return kinematics.yAxisType === "real_y" ? "cartesian" : "polar";
    }

    return "polar";
  }

  /**
   * Generate polar interpolation G-code
   */
  generatePolarInterpolation(
    kinematics: MachineKinematics,
    params: PolarInterpolationParams
  ): GCodeOutput {
    const dialect = kinematics.controllerDialect;
    const codes = POLAR_MODE_CODES[dialect];
    const lines: string[] = [];
    const warnings: string[] = [];

    // Validate C-axis capability
    if (!kinematics.hasCAxis) {
      warnings.push("Machine lacks C-axis; polar interpolation not available");
      return { lines: [], mode: "cartesian", warnings, estimatedCycleTime_sec: 0 };
    }

    // Validate angle range
    const angularTravel = Math.abs(params.endAngle_deg - params.startAngle_deg);
    if (angularTravel > kinematics.cAxisRange_deg) {
      warnings.push(`Angular travel ${angularTravel}° exceeds C-axis range ${kinematics.cAxisRange_deg}°`);
    }

    // Generate code
    lines.push(`(POLAR INTERPOLATION - ${dialect.toUpperCase()})`);
    lines.push(codes.on);
    lines.push(`G00 X${(params.radius_mm * 2).toFixed(3)} C${params.startAngle_deg.toFixed(2)}`);

    const arcCode = params.direction === "CW" ? "G02" : "G03";
    const iValue = params.centerX_mm - params.radius_mm;
    lines.push(
      `${arcCode} X${(params.radius_mm * 2).toFixed(3)} C${params.endAngle_deg.toFixed(2)} ` +
      `I${iValue.toFixed(3)} F${params.feedrate_mmpm.toFixed(0)}`
    );

    lines.push(codes.off);

    // Estimate cycle time
    const arcLength = (angularTravel / 360) * 2 * Math.PI * params.radius_mm;
    const estimatedCycleTime_sec = (arcLength / params.feedrate_mmpm) * 60;

    return {
      lines,
      mode: "polar",
      warnings,
      estimatedCycleTime_sec,
    };
  }

  /**
   * Generate cylindrical interpolation G-code for OD milling
   */
  generateCylindricalInterpolation(
    kinematics: MachineKinematics,
    params: CylindricalInterpolationParams
  ): GCodeOutput {
    const dialect = kinematics.controllerDialect;
    const codes = CYLINDRICAL_MODE_CODES[dialect];
    const lines: string[] = [];
    const warnings: string[] = [];

    if (!kinematics.hasCAxis) {
      warnings.push("Machine lacks C-axis; cylindrical interpolation not available");
      return { lines: [], mode: "cartesian", warnings, estimatedCycleTime_sec: 0 };
    }

    lines.push(`(CYLINDRICAL INTERPOLATION - ${dialect.toUpperCase()})`);

    // Siemens uses different syntax
    if (dialect === "siemens") {
      lines.push(`TRACYL(${params.cylinderDiameter_mm.toFixed(3)})`);
    } else {
      lines.push(`${codes.on} C${params.cylinderDiameter_mm.toFixed(3)}`);
    }

    // Convert angles to linear C-axis coordinates (mm on surface)
    const circumference = Math.PI * params.cylinderDiameter_mm;
    const startC_mm = (params.startAngle_deg / 360) * circumference;
    const endC_mm = (params.endAngle_deg / 360) * circumference;

    lines.push(`G00 Z${params.startZ_mm.toFixed(3)} C${startC_mm.toFixed(3)}`);
    lines.push(`G01 Z${params.endZ_mm.toFixed(3)} C${endC_mm.toFixed(3)} F${params.feedrate_mmpm.toFixed(0)}`);

    if (dialect === "siemens") {
      lines.push("TRAFOOF");
    } else {
      lines.push(`${codes.off}`);
    }

    // Estimate cycle time
    const zTravel = Math.abs(params.endZ_mm - params.startZ_mm);
    const cTravel = Math.abs(endC_mm - startC_mm);
    const totalTravel = Math.sqrt(zTravel ** 2 + cTravel ** 2);
    const estimatedCycleTime_sec = (totalTravel / params.feedrate_mmpm) * 60;

    return {
      lines,
      mode: "cylindrical",
      warnings,
      estimatedCycleTime_sec,
    };
  }

  /**
   * Generate live tool spindle start command
   */
  generateLiveToolStart(
    kinematics: MachineKinematics,
    rpm: number,
    direction: "CW" | "CCW",
    turret: 1 | 2 = 1
  ): string[] {
    const dialect = kinematics.controllerDialect;
    const lines: string[] = [];

    // Determine spindle address
    let spindleAddr = kinematics.liveToolSpindleAddress;
    if (turret === 2 && kinematics.subSpindleLiveToolAddress) {
      spindleAddr = kinematics.subSpindleLiveToolAddress;
    }

    // Generate spindle orient first (stop main spindle, lock C-axis)
    lines.push(`${SPINDLE_ORIENT[dialect]} S0 (ORIENT MAIN SPINDLE)`);

    // Start live tool
    const mCode = direction === "CW" ? LIVE_TOOL_CW[dialect] : LIVE_TOOL_CCW[dialect];
    lines.push(`${mCode} ${spindleAddr}${rpm} (LIVE TOOL ${direction})`);

    return lines;
  }

  /**
   * Generate live tool spindle stop command
   */
  generateLiveToolStop(kinematics: MachineKinematics): string[] {
    const dialect = kinematics.controllerDialect;

    // Okuma uses M47, most others use M5 for live tool stop
    const stopCode = dialect === "okuma" ? "M47" : "M5";
    return [`${stopCode} (LIVE TOOL STOP)`];
  }

  /**
   * Calculate Y-axis offset for real-Y vs virtual-Y machines
   */
  calculateYOffset(
    kinematics: MachineKinematics,
    operation: LiveToolOperation
  ): { yOffset_mm: number; compensationMethod: "real" | "bc_compound" | "none" } {
    if (kinematics.yAxisType === "real_y") {
      return {
        yOffset_mm: operation.yOffset_mm ?? 0,
        compensationMethod: "real",
      };
    }

    if (kinematics.yAxisType === "virtual_y" && kinematics.hasBAxis) {
      // Calculate B+C compound angle for virtual Y
      const bAngle = Math.atan2(operation.yOffset_mm ?? 0, operation.toolDiameter_mm / 2);
      return {
        yOffset_mm: 0, // No physical Y
        compensationMethod: "bc_compound",
      };
    }

    return { yOffset_mm: 0, compensationMethod: "none" };
  }

  /**
   * Generate tool compensation setup for polar/cylindrical modes
   */
  generateToolCompensation(
    kinematics: MachineKinematics,
    mode: CAxisMode,
    compensationDirection: "left" | "right" | "off"
  ): string[] {
    const lines: string[] = [];

    if (compensationDirection === "off") {
      lines.push("G40 (COMP OFF)");
      return lines;
    }

    // In polar mode, X+ is radial outward, C+ is CCW
    // Tool comp direction depends on cut direction
    const compCode = compensationDirection === "left" ? "G41" : "G42";

    if (mode === "polar") {
      lines.push(`(NOTE: ${compCode} IN POLAR MODE - X RADIAL, C ANGULAR)`);
    } else if (mode === "cylindrical") {
      lines.push(`(NOTE: ${compCode} IN CYLINDRICAL MODE - C IS LINEAR ON SURFACE)`);
    }

    lines.push(compCode);
    return lines;
  }

  /**
   * Generate complete live tool operation sequence
   */
  generateLiveToolSequence(
    kinematics: MachineKinematics,
    operation: LiveToolOperation
  ): GCodeOutput {
    const lines: string[] = [];
    const warnings: string[] = [];
    let totalTime_sec = 0;

    const mode = this.selectCAxisMode(kinematics, operation);

    lines.push(`(LIVE TOOL OPERATION: ${operation.operationType.toUpperCase()})`);
    lines.push(`(MODE: ${mode.toUpperCase()})`);

    // Start live tool
    lines.push(...this.generateLiveToolStart(kinematics, operation.spindleRpm, "CW"));

    // Position to start
    if (operation.cAxisPosition_deg !== undefined) {
      lines.push(`G00 C${operation.cAxisPosition_deg.toFixed(2)}`);
    }

    // Y-axis handling
    const yCalc = this.calculateYOffset(kinematics, operation);
    if (yCalc.yOffset_mm !== 0 && kinematics.yAxisType === "real_y") {
      lines.push(`G00 Y${yCalc.yOffset_mm.toFixed(3)}`);
    }

    // Generate mode-specific code
    if (mode === "polar" && operation.startAngle_deg !== undefined && operation.endAngle_deg !== undefined) {
      const polarResult = this.generatePolarInterpolation(kinematics, {
        mode: "G137",
        centerX_mm: 0,
        centerZ_mm: 0,
        radius_mm: operation.toolDiameter_mm / 2 + operation.depth_mm,
        startAngle_deg: operation.startAngle_deg,
        endAngle_deg: operation.endAngle_deg,
        feedrate_mmpm: operation.feedrate_mmpm,
        direction: "CW",
      });
      lines.push(...polarResult.lines);
      warnings.push(...polarResult.warnings);
      totalTime_sec += polarResult.estimatedCycleTime_sec;
    } else {
      // Simple positioning for cross operations
      lines.push(`G01 X${(operation.depth_mm * 2).toFixed(3)} F${operation.feedrate_mmpm.toFixed(0)}`);
      totalTime_sec += (operation.depth_mm * 2 / operation.feedrate_mmpm) * 60;
    }

    // Retract and stop
    lines.push("G00 X50.0 (RETRACT)");
    lines.push(...this.generateLiveToolStop(kinematics));

    // Return Y to zero
    if (yCalc.yOffset_mm !== 0 && kinematics.yAxisType === "real_y") {
      lines.push("G00 Y0");
    }

    return {
      lines,
      mode,
      warnings,
      estimatedCycleTime_sec: totalTime_sec,
    };
  }

  /**
   * Validate machine kinematics for live tooling operation
   */
  validateKinematics(kinematics: MachineKinematics): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!kinematics.hasCAxis) {
      issues.push("C-axis required for live tooling");
    }

    if (kinematics.maxLiveToolRpm <= 0) {
      issues.push("Live tool spindle not configured");
    }

    if (kinematics.cAxisRange_deg < 360) {
      issues.push(`C-axis range limited to ${kinematics.cAxisRange_deg}° — may affect some operations`);
    }

    return { valid: issues.length === 0, issues };
  }
}

export const liveTurretCAxisEngine = new LiveTurretCAxisEngine();
