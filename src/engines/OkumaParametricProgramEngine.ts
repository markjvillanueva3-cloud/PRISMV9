/**
 * OkumaParametricProgramEngine — Okuma OSP Parametric Macro Program Generator
 *
 * Generates and validates Okuma OSP-P macro programs using V-variable
 * parametric programming. Based on real production turning macros with
 * full auto-calculation chains for speeds, feeds, depths, and clearances.
 *
 * Supports: Casing turning, counter-bore operations, face/OD/ID cycles,
 * drill sequences, cutoff operations, chamfer/radius features.
 *
 * Key formulas (from production macros):
 *   RPM = [SFM × 3.82] / diameter
 *   Drill point depth = (drill_dia / 2) / TAN(point_angle / 2)
 *   Okuma chamfer angle = 180 - angle (OD), 180 + angle (ID/cutoff)
 *
 * No external imports — pure computation.
 *
 * @module OkumaParametricProgramEngine
 */

// ============================================================================
// PUBLIC TYPES
// ============================================================================

export interface PartGeometry {
  stockDiameter: number;
  finishOD: number;
  finishID?: number;
  partLength: number;
  drillDiameter?: number;
  counterBoreDia?: number;
  counterBoreDepth?: number;
  stockFaceOffset?: number;
}

export interface ChamferConfig {
  type: "chamfer" | "radius" | "none";
  depth: number;
  angle?: number;
  minorDiaOverride?: number;
}

export interface ToolConfig {
  roughNoseRadius: number;
  finishNoseRadius: number;
  cutoffInsertWidth?: number;
}

export interface SpeedFeedConfig {
  odRoughSFM: number;
  odFinishSFM: number;
  idSFM?: number;
  cutoffSFM?: number;
  faceRoughFeed: number;
  faceFinishFeed: number;
  odRoughFeed: number;
  odFinishFeed: number;
  idRoughFeed?: number;
  idFinishFeed?: number;
  cutoffFeed?: number;
}

export interface CuttingParams {
  odDepthOfCut: number;
  idDepthOfCut?: number;
  faceDepthOfCut?: number;
  maxRoughRPM: number;
  maxFinishRPM: number;
  maxIdRoughRPM?: number;
  maxIdFinishRPM?: number;
  maxCutoffRPM?: number;
}

export interface DrillConfig {
  diameter: number;
  sfm: number;
  feed: number;
  peckDepth?: number;
  pointAngle: number;
  usePeck: boolean;
}

export interface ClearanceConfig {
  zClearance: number;
  xClearance: number;
  zDrillClearance?: number;
  leadInDistance?: number;
}

export interface OkumaProgramConfig {
  programNumber: number;
  geometry: PartGeometry;
  odChamfer?: ChamferConfig;
  idChamfer?: ChamferConfig;
  cutoffChamfer?: ChamferConfig;
  tools: ToolConfig;
  speeds: SpeedFeedConfig;
  cutting: CuttingParams;
  spotDrill?: DrillConfig;
  drill1: DrillConfig;
  drill2?: DrillConfig;
  clearance: ClearanceConfig;
  stockAllowances: {
    odRadial: number;
    odAxial: number;
    idRadial?: number;
    idAxial?: number;
    faceZ: number;
  };
  options: {
    includeG140G270: boolean;
    odToIdStop: boolean;
    skipIdRoughing: boolean;
    faceMultiPass: boolean;
  };
}

export interface GeneratedProgram {
  gcode: string;
  lineCount: number;
  operations: string[];
  variables: Record<string, { value: number; description: string }>;
  calculations: Record<string, { formula: string; result: number }>;
  estimatedCycleTime_s?: number;
  warnings: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  variableUsage: { defined: string[]; used: string[]; unused: string[] };
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface CalculatedValues {
  // Drill RPMs
  spotDrillRPM: number;
  drill1RPM: number;
  drill2RPM: number;
  // Drill depths
  drill1PointDepth: number;
  drill1TotalDepth: number;
  drill1ZDepth: number;
  drill2PointDepth: number;
  drill2TotalDepth: number;
  drill2ZDepth: number;
  // Chamfer start diameters
  odChamferStartDia: number;
  idChamferStartDia: number;
  // Okuma angle corrections (measured from +Z CCW)
  odChamferAngle: number;
  idChamferAngle: number;
  cutoffChamferAngle: number;
  // Turning RPMs
  odRoughRPM: number;
  odFinishRPM: number;
  cutoffRPM: number;
  idRoughRPM: number;
  idFinishRPM: number;
  // Approach values
  approachDia: number;
  boreApproachDia: number;
  odRoughDepth: number;
  zClearancePos: number;
  drillRetractZ: number;
  faceEndX: number;
  faceRoughTargetZ: number;
  odStockToRemove: number;
  // Face rough approach
  faceApproachZ: number;
  faceRoughRapidX: number;
  faceRoughCompOnX: number;
  faceRoughEndX: number;
  faceRoughCompOffX: number;
  // Face finish approach
  faceFinishRapidX: number;
  faceFinishCompOnX: number;
  faceFinishEndX: number;
  // Bore depths
  idRoughDepth: number;
  idFinishDepth: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function fmt(n: number, decimals = 4): string {
  if (Number.isInteger(n) && decimals <= 0) return String(n);
  const s = Math.abs(n).toFixed(decimals);
  // Strip trailing zeros but keep at least one decimal
  const trimmed = s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, ".0");
  return n < 0 ? `-${trimmed}` : trimmed;
}

function fmtV(expr: string): string {
  return `[${expr}]`;
}

function tanDeg(degrees: number): number {
  return Math.tan((degrees * Math.PI) / 180);
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class OkumaParametricProgramEngineImpl {
  // --------------------------------------------------------------------------
  // PUBLIC: Calculate RPM from SFM and diameter
  // --------------------------------------------------------------------------
  calculateRPM(sfm: number, diameter: number): number {
    if (diameter <= 0) return 0;
    return Math.round((sfm * 3.82) / diameter);
  }

  // --------------------------------------------------------------------------
  // PUBLIC: Calculate drill point depth
  // --------------------------------------------------------------------------
  calculateDrillDepth(
    drillDia: number,
    pointAngle: number,
    partLength: number,
    insertWidth: number
  ): { pointDepth: number; totalDepth: number } {
    const halfAngleRad = ((pointAngle / 2) * Math.PI) / 180;
    const pointDepth = drillDia / 2 / Math.tan(halfAngleRad);
    const totalDepth = partLength + insertWidth + pointDepth + 0.03;
    return { pointDepth, totalDepth };
  }

  // --------------------------------------------------------------------------
  // PUBLIC: Generate a full casing turning program
  // --------------------------------------------------------------------------
  generateCasingProgram(config: OkumaProgramConfig): GeneratedProgram {
    const warnings: string[] = [];
    const operations: string[] = [];
    const calc = this._computeValues(config, warnings);
    const vars = this._buildVariableMap(config, calc);
    const calcs = this._buildCalculationMap(config, calc);

    const lines: string[] = [];
    const g = config.geometry;
    const s = config.speeds;
    const c = config.cutting;
    const cl = config.clearance;
    const sa = config.stockAllowances;
    const opts = config.options;
    const tnrRough = config.tools.roughNoseRadius;
    const tnrFinish = config.tools.finishNoseRadius;
    const cutoffWidth = config.tools.cutoffInsertWidth ?? 0.118;
    const stockFace = g.stockFaceOffset ?? 0.015;
    const leadIn = cl.leadInDistance ?? 0.06;

    // --- Header ---
    lines.push(`O${config.programNumber}`);
    lines.push(`(T010101 - FACE/OD ROUGH)`);
    lines.push(`(T020202 - FACE/OD FINISH)`);
    if (config.spotDrill) lines.push(`(T030303 - SPOT DRILL)`);
    lines.push(`(T050505 - DRILL 1)`);
    if (config.drill2) lines.push(`(T060606 - DRILL 2 - OPTIONAL)`);
    if (g.finishID !== undefined) {
      lines.push(`(T070707 - ID ROUGH - OPTIONAL)`);
      lines.push(`(T080808 - ID FINISH)`);
    }
    lines.push(`(T111111 - CUTOFF)`);
    lines.push(``);

    // --- Parameters section ---
    lines.push(`(==========================================================)`);
    lines.push(`(============= ADJUSTABLE PARAMETERS ======================)`);
    lines.push(`(==========================================================)`);
    lines.push(``);

    // Stock and model
    lines.push(`(========== STOCK AND MODEL ==========)`);
    lines.push(`V1 = ${fmt(g.stockDiameter)}           (STOCK DIAMETER)`);
    lines.push(`V2 = ${fmt(g.finishOD)}          (FINISH OD)`);
    lines.push(`V3 = ${fmt(config.drill1.diameter)}        (DRILL SIZE / START HOLE DIA)`);
    if (g.finishID !== undefined) {
      lines.push(`V4 = ${fmt(g.finishID)}          (FINISH ID)`);
    }
    lines.push(`V5 = ${fmt(g.partLength)}          (PART LENGTH)`);
    lines.push(`V100 = ${fmt(stockFace)}        (STOCK FACE OFFSET - Z ZERO AT PART FACE)`);
    lines.push(``);

    // OD Chamfer
    const odCham = config.odChamfer ?? { type: "none" as const, depth: 0 };
    lines.push(`(========== OD CHAMFER/RADIUS ==========)`);
    lines.push(`V6 = ${fmt(odCham.depth)}           (CHAMFER Z DEPTH / RADIUS SIZE - 0 FOR NONE)`);
    lines.push(`V7 = ${odCham.type === "radius" ? 2 : 1}              (1=CHAMFER, 2=RADIUS)`);
    lines.push(`V8 = ${odCham.angle ?? 45}             (CHAMFER ANGLE)`);
    lines.push(`V170 = ${odCham.minorDiaOverride ?? 0}            (CHAMFER MINOR DIA - 0=AUTO CALC, OR ENTER START DIA)`);
    lines.push(``);

    // ID Chamfer
    const idCham = config.idChamfer ?? { type: "none" as const, depth: 0 };
    if (g.finishID !== undefined) {
      lines.push(`(========== ID CHAMFER/RADIUS ==========)`);
      lines.push(`V9 = ${fmt(idCham.depth)}              (CHAMFER Z DEPTH / RADIUS SIZE - 0 FOR NONE)`);
      lines.push(`V10 = ${idCham.type === "radius" ? 2 : 1}             (1=CHAMFER, 2=RADIUS)`);
      lines.push(`V11 = ${idCham.angle ?? 45}            (CHAMFER ANGLE)`);
      lines.push(`V171 = ${idCham.minorDiaOverride ?? 0}            (CHAMFER MAJOR DIA - 0=AUTO CALC, OR ENTER START DIA)`);
      lines.push(`V12 = ${opts.skipIdRoughing ? 0 : 1}             (ID ROUGHING: 0=SKIP WHEN DRILL CLOSE TO FINISH, 1=RUN)`);
      lines.push(``);
    }

    // Cutoff parameters
    const cutCham = config.cutoffChamfer ?? { type: "none" as const, depth: 0 };
    lines.push(`(========== CUTOFF PARAMETERS ==========)`);
    lines.push(`V13 = ${cutCham.type === "none" ? 0 : cutCham.type === "chamfer" ? 1 : 2}             (CUTOFF FEATURE: 0=NONE, 1=CHAMFER, 2=RADIUS)`);
    lines.push(`V14 = ${fmt(cutCham.depth)}          (CHAMFER Z DEPTH / RADIUS SIZE)`);
    lines.push(`V15 = ${cutCham.angle ?? 45}            (CHAMFER ANGLE)`);
    lines.push(`V16 = 0.001         (CHAMFER/RADIUS FEED)`);
    lines.push(`V17 = ${fmt(cutoffWidth)}        (CUTOFF INSERT WIDTH)`);
    lines.push(``);

    // Spot drill
    if (config.spotDrill) {
      const sd = config.spotDrill;
      lines.push(`(========== SPOT DRILL PARAMETERS ==========)`);
      lines.push(`V20 = ${fmt(sd.diameter)}           (SPOT DRILL DIAMETER)`);
      lines.push(`V21 = ${fmt(sd.sfm, 0)}           (SPOT DRILL SFM)`);
      lines.push(`V22 = ${fmt(sd.peckDepth ?? 0.08)}          (SPOT DRILL DEPTH)`);
      lines.push(`V23 = ${sd.usePeck ? 1 : 0}             (SPOT DRILL PECK: 0=NO, 1=YES)`);
      lines.push(`V24 = ${fmt(sd.peckDepth ?? 0.13)}          (SPOT DRILL PECK DEPTH)`);
      lines.push(`V19 = ${fmt(sd.feed)}         (SPOT DRILL FEED - IPR)`);
      lines.push(``);
    }

    // Drill 1
    const d1 = config.drill1;
    lines.push(`(========== DRILL 1 PARAMETERS ==========)`);
    lines.push(`V25 = ${fmt(d1.diameter)}       (DRILL 1 DIAMETER)`);
    lines.push(`V26 = ${fmt(d1.sfm, 0)}            (DRILL 1 SFM)`);
    lines.push(`V27 = ${fmt(d1.feed)}         (DRILL 1 FEED)`);
    lines.push(`V28 = ${fmt(d1.peckDepth ?? 0.13)}          (DRILL 1 PECK DEPTH)`);
    lines.push(`V29 = ${fmt(d1.pointAngle, 0)}           (DRILL 1 POINT ANGLE)`);
    lines.push(`V30 = ${d1.usePeck ? 1 : 0}             (DRILL 1 PECK: 0=NO, 1=YES)`);
    lines.push(``);

    // Drill 2
    if (config.drill2) {
      const d2 = config.drill2;
      lines.push(`(========== DRILL 2 PARAMETERS - OPTIONAL ==========)`);
      lines.push(`V31 = 1             (DRILL 2 ENABLE: 0=NO, 1=YES)`);
      lines.push(`V32 = ${fmt(d2.diameter)}           (DRILL 2 DIAMETER)`);
      lines.push(`V33 = ${fmt(d2.sfm, 0)}            (DRILL 2 SFM)`);
      lines.push(`V34 = ${fmt(d2.feed)}         (DRILL 2 FEED)`);
      lines.push(`V155 = ${fmt(d2.peckDepth ?? 0.15)}         (DRILL 2 PECK DEPTH)`);
      lines.push(`V156 = ${fmt(d2.pointAngle, 0)}          (DRILL 2 POINT ANGLE)`);
      lines.push(`V157 = ${d2.usePeck ? 1 : 0}            (DRILL 2 PECK: 0=NO, 1=YES)`);
      lines.push(``);
    } else {
      lines.push(`(========== DRILL 2 PARAMETERS - OPTIONAL ==========)`);
      lines.push(`V31 = 0             (DRILL 2 ENABLE: 0=NO, 1=YES)`);
      lines.push(``);
    }

    // Stock allowances
    lines.push(`(========== STOCK ALLOWANCES ==========)`);
    lines.push(`V35 = ${fmt(sa.odRadial)}         (OD FINISH STOCK - RADIAL)`);
    lines.push(`V36 = ${fmt(sa.odAxial)}         (OD FINISH STOCK - AXIAL)`);
    if (g.finishID !== undefined) {
      lines.push(`V37 = ${fmt(sa.idRadial ?? 0.006)}         (ID FINISH STOCK - RADIAL)`);
      lines.push(`V38 = ${fmt(sa.idAxial ?? 0)}           (ID FINISH STOCK - AXIAL)`);
    }
    lines.push(`V39 = ${fmt(sa.faceZ)}         (FACE STOCK ALLOWANCE - Z)`);
    lines.push(``);

    // Roughing parameters
    lines.push(`(========== ROUGHING PARAMETERS ==========)`);
    lines.push(`V40 = ${fmt(c.odDepthOfCut)}           (OD DEPTH OF CUT)`);
    if (c.idDepthOfCut !== undefined) {
      lines.push(`V41 = ${fmt(c.idDepthOfCut)}          (ID DEPTH OF CUT)`);
    }
    lines.push(`V42 = ${fmt(c.faceDepthOfCut ?? 0.08)}          (FACE DEPTH OF CUT)`);
    lines.push(`V43 = ${opts.faceMultiPass ? 1 : 0}             (FACE MULTI-PASS: 0=SINGLE, 1=MULTI)`);
    lines.push(`V95 = 0.03          (CHAMFER/RADIUS DEPTH OF CUT)`);
    lines.push(``);

    // Tool nose radius
    lines.push(`(========== TOOL NOSE RADIUS ==========)`);
    lines.push(`V44 = ${fmt(tnrRough)}         (TOOL 1 NOSE RADIUS - ROUGH)`);
    lines.push(`V99 = ${fmt(tnrFinish)}        (TOOL 2 NOSE RADIUS - FINISH)`);
    lines.push(``);

    // Turning speeds
    lines.push(`(========== TURNING SPEEDS - SFM ==========)`);
    lines.push(`V45 = ${fmt(s.odRoughSFM, 0)}           (OD ROUGH SFM)`);
    lines.push(`V46 = ${fmt(s.odFinishSFM, 0)}           (OD FINISH SFM)`);
    if (s.idSFM !== undefined) lines.push(`V47 = ${fmt(s.idSFM, 0)}           (ID ROUGH/FINISH SFM)`);
    if (s.cutoffSFM !== undefined) lines.push(`V48 = ${fmt(s.cutoffSFM, 0)}           (CUTOFF SFM)`);
    lines.push(``);

    // Turning feeds
    lines.push(`(========== TURNING FEEDS ==========)`);
    lines.push(`V50 = ${fmt(s.faceRoughFeed)}         (FACE ROUGH FEED)`);
    lines.push(`V51 = ${fmt(s.faceFinishFeed)}        (FACE FINISH FEED)`);
    lines.push(`V52 = ${fmt(s.odRoughFeed)}         (OD ROUGH FEED)`);
    lines.push(`V53 = ${fmt(s.odFinishFeed)}        (OD FINISH FEED)`);
    if (s.idRoughFeed !== undefined) lines.push(`V54 = ${fmt(s.idRoughFeed)}         (ID ROUGH FEED)`);
    if (s.idFinishFeed !== undefined) lines.push(`V55 = ${fmt(s.idFinishFeed)}        (ID FINISH FEED)`);
    if (s.cutoffFeed !== undefined) lines.push(`V56 = ${fmt(s.cutoffFeed)}         (CUTOFF FEED)`);
    lines.push(``);

    // Clearance
    lines.push(`(========== CLEARANCE ==========)`);
    lines.push(`V60 = ${fmt(cl.zClearance)}          (Z CLEARANCE)`);
    lines.push(`V61 = ${fmt(cl.xClearance)}          (X CLEARANCE - ADDED TO STOCK DIA)`);
    if (cl.zDrillClearance !== undefined) lines.push(`V62 = ${fmt(cl.zDrillClearance)}           (Z DRILL CLEARANCE - EXTRA FOR DRILLING OPS)`);
    lines.push(`V63 = ${fmt(leadIn)}          (LEAD-IN DISTANCE - FOR CUTTER COMP)`);
    lines.push(``);

    // Max spindle speeds
    lines.push(`(========== MAX SPINDLE SPEEDS ==========)`);
    lines.push(`V65 = ${fmt(c.maxRoughRPM, 0)}          (ROUGH MAX RPM)`);
    lines.push(`V66 = ${fmt(c.maxFinishRPM, 0)}          (FINISH MAX RPM)`);
    if (c.maxIdRoughRPM !== undefined) lines.push(`V68 = ${fmt(c.maxIdRoughRPM, 0)}          (ID ROUGH MAX RPM)`);
    if (c.maxIdFinishRPM !== undefined) lines.push(`V69 = ${fmt(c.maxIdFinishRPM, 0)}          (ID FINISH MAX RPM)`);
    if (c.maxCutoffRPM !== undefined) lines.push(`V172 = ${fmt(c.maxCutoffRPM, 0)}         (CUTOFF MAX RPM)`);
    lines.push(``);

    // Optional stops
    lines.push(`(========== OPTIONAL STOPS ==========)`);
    lines.push(`V67 = ${opts.odToIdStop ? 1 : 0}             (OD FINISH TO ID STOP: 0=NO STOP, 1=STOP)`);
    lines.push(``);

    // Machine options
    lines.push(`(========== MACHINE OPTIONS ==========)`);
    lines.push(`V110 = ${opts.includeG140G270 ? 1 : 0}            (INCLUDE G140/G270: 0=NO, 1=YES)`);
    lines.push(``);

    // --- Auto-calculations section ---
    lines.push(`(==========================================================)`);
    lines.push(`(============= AUTO-CALCULATIONS ==========================)`);
    lines.push(`(==========================================================)`);
    lines.push(``);

    // Calculated RPM
    lines.push(`(========== CALCULATED RPM ==========)`);
    if (config.spotDrill) {
      lines.push(`V70 = [V21 * 3.82] / V20        (SPOT DRILL RPM)`);
    }
    lines.push(`V71 = [V26 * 3.82] / V25        (DRILL 1 RPM)`);
    if (config.drill2) {
      lines.push(`V158 = [V33 * 3.82] / V32       (DRILL 2 RPM)`);
    }
    lines.push(``);

    // Drill 1 depth calculations
    lines.push(`(========== DRILL 1 DEPTH CALCULATIONS ==========)`);
    lines.push(`V72 = V25 / 2 / TAN[V29 / 2]    (DRILL 1 POINT DEPTH)`);
    lines.push(`V73 = V5 + V17 + V72 + 0.03     (DRILL 1 TOTAL DEPTH - POSITIVE)`);
    lines.push(`V74 = -V73                      (DRILL 1 Z DEPTH - NEGATIVE)`);
    lines.push(``);

    // Drill 2 depth calculations
    if (config.drill2) {
      lines.push(`(========== DRILL 2 DEPTH CALCULATIONS ==========)`);
      lines.push(`V159 = V32 / 2 / TAN[V156 / 2]  (DRILL 2 POINT DEPTH)`);
      lines.push(`V160 = V5 + V17 + V159 + 0.03   (DRILL 2 TOTAL DEPTH - POSITIVE)`);
      lines.push(`V161 = -V160                    (DRILL 2 Z DEPTH - NEGATIVE)`);
      lines.push(``);
    }

    // Calculated values
    lines.push(`(========== CALCULATED VALUES ==========)`);
    lines.push(`V75 = V2 - [V6 * TAN[V8] * 2]   (OD CHAMFER START DIA - AUTO CALC USING ANGLE)`);
    if (g.finishID !== undefined) {
      lines.push(`V76 = V4 + [V9 * TAN[V11] * 2]  (ID CHAMFER START DIA - AUTO CALC USING ANGLE)`);
    }
    lines.push(`V77 = V5 + 0.01                 (OD ROUGH DEPTH - 0.01 PAST PART)`);
    lines.push(`V78 = V1 + V61                  (APPROACH DIA - X CLEARANCE)`);
    if (g.finishID !== undefined) {
      lines.push(`V79 = V3 - V61                  (BORE APPROACH DIA)`);
    }
    lines.push(`V80 = V1 - [V2 + [V35 * 2]]     (OD STOCK TO REMOVE - DIA)`);
    lines.push(`V81 = V60 + V100                (Z CLEARANCE POSITION)`);
    lines.push(`V82 = 0 - [V44 * 2]             (FACE END X - PAST CENTER - 2X TNR)`);
    lines.push(`V83 = V100 - V39                (FACE ROUGH TARGET Z)`);
    lines.push(``);

    // Bore depths
    if (g.finishID !== undefined) {
      lines.push(`(========== BORE DEPTH CALCULATIONS ==========)`);
      lines.push(`V163 = V5 + 0.06                (ID ROUGH DEPTH - 0.06 PAST PART)`);
      lines.push(`V164 = V5 + 0.03                (ID FINISH DEPTH - 0.03 PAST PART)`);
      lines.push(``);
    }

    // Turning RPM calculations
    lines.push(`(========== TURNING RPM CALCULATIONS ==========)`);
    lines.push(`V87 = [V45 * 3.82] / V1         (OD ROUGH INITIAL RPM)`);
    lines.push(`V88 = [V46 * 3.82] / V2         (OD FINISH INITIAL RPM)`);
    if (s.cutoffSFM !== undefined) {
      lines.push(`V89 = [V48 * 3.82] / V2         (CUTOFF INITIAL RPM)`);
    }
    if (g.finishID !== undefined) {
      lines.push(`V162 = [V47 * 3.82] / V4        (ID FINISH INITIAL RPM)`);
      lines.push(`V166 = [V47 * 3.82] / V3        (ID ROUGH INITIAL RPM)`);
    }
    lines.push(``);

    // Chamfer angle corrections
    lines.push(`(========== CHAMFER ANGLE CORRECTIONS ==========)`);
    lines.push(`(OKUMA ANGLES MEASURED FROM +Z AXIS CCW)`);
    lines.push(`V84 = 180 - V8                  (OD CHAMFER: 45 BECOMES 135)`);
    if (g.finishID !== undefined) {
      lines.push(`V85 = 180 + V11                 (ID CHAMFER: 45 BECOMES 225)`);
    }
    lines.push(`V86 = 180 + V15                 (CUTOFF CHAMFER: 45 BECOMES 225)`);
    lines.push(``);

    // Face rough approach values
    lines.push(`(========== FACE ROUGH APPROACH VALUES ==========)`);
    lines.push(`V90 = V39 + 0.0566              (FACE APPROACH Z)`);
    lines.push(`V94 = V1 + V44 + V61            (FACE ROUGH RAPID X - STOCK + TNR + CLEARANCE)`);
    lines.push(`V96 = V1 + V44                  (FACE ROUGH COMP ON X - STOCK + TNR)`);
    lines.push(`V97 = 0 - [V44 * 2]             (FACE ROUGH END X - 2X TNR PAST CENTER)`);
    lines.push(`V98 = 0 - V44                   (FACE ROUGH COMP OFF X - 1X TNR)`);
    lines.push(``);

    // Face finish approach values
    lines.push(`(========== FACE FINISH APPROACH VALUES ==========)`);
    lines.push(`V91 = V2 - 0.05                 (FACE FINISH RAPID APPROACH X)`);
    lines.push(`V92 = V2 - [V99 * 2]            (FACE FINISH COMP ON X - OD MINUS 2X TNR)`);
    if (g.finishID !== undefined) {
      lines.push(`V93 = V4 - 0.07                 (FACE FINISH END X BEFORE COMP OFF)`);
    } else {
      lines.push(`V93 = 0 - [V99 * 2]             (FACE FINISH END X)`);
    }
    lines.push(``);

    // Drill Z clearance
    lines.push(`(========== DRILL Z CLEARANCE ==========)`);
    lines.push(`V165 = V81 + V62                (DRILL RETRACT Z - CLEARANCE + EXTRA)`);
    lines.push(``);

    // --- Program body ---
    lines.push(`(==========================================================)`);
    lines.push(`(============= PROGRAM START ==============================)`);
    lines.push(`(==========================================================)`);
    lines.push(``);

    // G140 optional
    lines.push(`IF [V110 EQ 0] GOTO N9000`);
    lines.push(`G140`);
    lines.push(`N9000 G90 G80`);
    lines.push(`G50 S[V65]`);
    lines.push(``);

    // ---- FACE ROUGH AND OD ROUGH ----
    operations.push("FACE_ROUGH");
    operations.push("OD_ROUGH");
    this._emitToolStart(lines, "T010101", "FACE/OD ROUGH", "V87", "N9001", opts.includeG140G270);
    lines.push(`G0 Z[V81]`);
    lines.push(`X[V94]`);
    lines.push(`G96 S[V45] M3`);
    lines.push(`Z[V90]`);
    lines.push(`G41 X[V96] Z[V39] F[V50]`);
    lines.push(`X[V97]`);
    lines.push(`G40 X[V98] Z[V90]`);
    lines.push(`G0 X[V94]`);
    lines.push(`Z[V81]`);
    lines.push(`G97 S[V87] M3`);
    lines.push(``);

    // Profile roughing - OD
    lines.push(`(PROFILE ROUGHING - OD)`);
    lines.push(`(SKIP FULL ROUGHING IF STOCK TO REMOVE < 0.05")`);
    lines.push(`N2 IF [V80 LT 0.05] GOTO N15`);
    lines.push(`G97 S[V87] M3`);
    lines.push(`G0 Z[V81]`);
    lines.push(`X[V1 + V63]`);
    lines.push(`G96 S[V45] M3`);
    lines.push(`Z[V100 + 0.03]`);
    lines.push(`G85 NAT1 D[V40] U[V35] W[V36] F[V52]`);
    lines.push(`NAT1 G81`);
    // Chamfer minor dia check
    lines.push(`(CHECK FOR CUSTOM CHAMFER MINOR DIA)`);
    lines.push(`IF [V170 GT 0] GOTO N1101`);
    lines.push(`(AUTO CALC FROM ANGLE)`);
    lines.push(`G0 X[V75] Z[V100 + 0.03]`);
    lines.push(`GOTO N1102`);
    lines.push(`(CUSTOM MINOR DIA)`);
    lines.push(`N1101 G0 X[V170] Z[V100 + 0.03]`);
    lines.push(`N1102 G1 Z[V100]`);
    lines.push(`IF [V6 EQ 0] GOTO N12`);
    lines.push(`IF [V7 EQ 2] GOTO N10`);
    lines.push(`(OD CHAMFER)`);
    lines.push(`X[V2] A[V84]`);
    lines.push(`GOTO N12`);
    lines.push(`(OD RADIUS)`);
    lines.push(`N10 X[V2] R[V6]`);
    lines.push(`N12 Z-[V77]`);
    lines.push(`X[V1]`);
    lines.push(`G80`);
    lines.push(`G0 X[V1 + V63] Z[V100 + 0.03]`);
    lines.push(`Z[V81]`);
    lines.push(`G180`);
    this._emitToolEnd(lines);
    lines.push(`GOTO N30`);
    lines.push(``);

    // Skip full rough - only rough chamfer/radius
    lines.push(`(SKIP FULL ROUGH - ONLY ROUGH CHAMFER/RADIUS IF ENABLED)`);
    lines.push(`N15 IF [V6 EQ 0] GOTO N30`);
    lines.push(`G97 S[V87] M3`);
    lines.push(`G0 Z[V81]`);
    lines.push(`X[V1 + V63]`);
    lines.push(`G96 S[V45] M3`);
    lines.push(`Z[V100 + 0.03]`);
    lines.push(`G85 NAT1 D[V95] U[V35] W[V36] F[V52]`);
    lines.push(`NAT1 G81`);
    lines.push(`(CHECK FOR CUSTOM CHAMFER MINOR DIA)`);
    lines.push(`IF [V170 GT 0] GOTO N17`);
    lines.push(`(AUTO CALC FROM ANGLE)`);
    lines.push(`G0 X[V75] Z[V100 + 0.03]`);
    lines.push(`GOTO N17A`);
    lines.push(`(CUSTOM MINOR DIA)`);
    lines.push(`N17 G0 X[V170] Z[V100 + 0.03]`);
    lines.push(`N17A G1 Z[V100]`);
    lines.push(`IF [V7 EQ 2] GOTO N18`);
    lines.push(`(OD CHAMFER)`);
    lines.push(`X[V2] A[V84]`);
    lines.push(`GOTO N20`);
    lines.push(`(OD RADIUS)`);
    lines.push(`N18 X[V2] R[V6]`);
    lines.push(`N20 Z-[V6 + 0.02]`);
    lines.push(`X[V1]`);
    lines.push(`G80`);
    lines.push(`G0 X[V1 + V63] Z[V100 + 0.03]`);
    lines.push(`Z[V81]`);
    lines.push(`G180`);
    this._emitToolEnd(lines);
    lines.push(``);

    // ---- SPOT DRILL ----
    if (config.spotDrill) {
      operations.push("SPOT_DRILL");
      lines.push(`N30 (SPOT DRILL - T030303)`);
      this._emitToolStart(lines, "T030303", "SPOT DRILL", "V70", "N9002", opts.includeG140G270);
      lines.push(`G0 Z[V165]`);
      lines.push(`X0.`);
      lines.push(`G0 Z[V81]`);
      lines.push(`IF [V23 EQ 1] GOTO N32`);
      lines.push(`(NO PECK)`);
      lines.push(`G1 Z[V100 - V22] F[V19]`);
      lines.push(`G0 Z[V165]`);
      lines.push(`GOTO N35`);
      lines.push(`(PECK)`);
      lines.push(`N32 G74 X0. Z[V100 - V22] I[V24] D0.18 F[V19]`);
      lines.push(`G180`);
      lines.push(`G0 Z[V165]`);
      lines.push(`N35 M5`);
      lines.push(`M9`);
      lines.push(`G0 X20.`);
      lines.push(`Z20.`);
      lines.push(`M1`);
      lines.push(``);
    } else {
      lines.push(`N30 (CONTINUE TO DRILL)`);
      lines.push(``);
    }

    // ---- DRILL 1 ----
    operations.push("DRILL_1");
    lines.push(`(DRILL 1 - T050505)`);
    this._emitToolStart(lines, "T050505", "DRILL 1", "V71", "N9003", opts.includeG140G270);
    lines.push(`G0 Z[V165]`);
    lines.push(`X0.`);
    lines.push(`G0 Z[V81]`);
    lines.push(`IF [V30 EQ 1] GOTO N40`);
    lines.push(`(NO PECK)`);
    lines.push(`G1 Z[V74] F[V27]`);
    lines.push(`G0 Z[V165]`);
    lines.push(`GOTO N50`);
    lines.push(`(PECK)`);
    lines.push(`N40 G74 X0. Z[V74] I[V28] D[V73 + 0.1] F[V27]`);
    lines.push(`G180`);
    lines.push(`G0 Z[V165]`);
    lines.push(`N50 M5`);
    lines.push(`M9`);
    lines.push(`G0 X20.`);
    lines.push(`Z20.`);
    lines.push(`M1`);
    lines.push(``);

    // ---- DRILL 2 ----
    if (config.drill2) {
      operations.push("DRILL_2");
      lines.push(`(DRILL 2 - T060606 - OPTIONAL)`);
      lines.push(`IF [V31 EQ 0] GOTO N100`);
      this._emitToolStart(lines, "T060606", "DRILL 2", "V158", "N9004", opts.includeG140G270);
      lines.push(`G0 Z[V165]`);
      lines.push(`X0.`);
      lines.push(`G0 Z[V81]`);
      lines.push(`IF [V157 EQ 1] GOTO N60`);
      lines.push(`(NO PECK)`);
      lines.push(`G1 Z[V161] F[V34]`);
      lines.push(`G0 Z[V165]`);
      lines.push(`GOTO N70`);
      lines.push(`(PECK)`);
      lines.push(`N60 G74 X0. Z[V161] I[V155] D[V160 + 0.1] F[V34]`);
      lines.push(`G180`);
      lines.push(`G0 Z[V165]`);
      lines.push(`N70 M5`);
      lines.push(`M9`);
      lines.push(`G0 X20.`);
      lines.push(`Z20.`);
      lines.push(`M1`);
      lines.push(``);
    }

    // ---- FACE FINISH AND OD FINISH ----
    operations.push("FACE_FINISH");
    operations.push("OD_FINISH");
    lines.push(`(FACE FINISH AND OD FINISH - T020202)`);
    lines.push(`N100 G0 X20. Z20.`);
    lines.push(`IF [V110 EQ 0] GOTO N9005`);
    lines.push(`G270`);
    lines.push(`N9005 G95 G18`);
    lines.push(`N5 T020202`);
    lines.push(`M8`);
    lines.push(`G97 S[V88] M3`);
    lines.push(`G0 Z[V81]`);
    lines.push(`X[V2 + V61]`);
    lines.push(`G96 S[V46] M3`);
    lines.push(`Z[V90 - 0.01]`);
    lines.push(`G41 X[V92] Z[V100] F[V51]`);
    if (g.finishID !== undefined) {
      lines.push(`X[V4 - 0.07]`);
      lines.push(`G40 X[V4 + 0.04] Z[V90 - 0.01]`);
    } else {
      lines.push(`X[V93]`);
      lines.push(`G40 X[V93 + 0.04] Z[V90 - 0.01]`);
    }
    lines.push(`G0 X[V2 + V61]`);
    lines.push(`Z[V81]`);
    lines.push(`G97 S[V88] M3`);
    lines.push(``);

    // Profile finishing - OD
    lines.push(`(PROFILE FINISHING - OD - MANUAL WITH LEAD-IN)`);
    lines.push(`N7 G97 S[V88] M3`);
    lines.push(`G0 Z[V81]`);
    lines.push(`X[V78]`);
    lines.push(`G96 S[V46] M3`);
    lines.push(`(CHECK FOR CHAMFER/RADIUS)`);
    lines.push(`IF [V6 EQ 0] GOTO N75`);
    // With chamfer/radius
    lines.push(`(WITH CHAMFER/RADIUS - LEAD IN AT CHAMFER START)`);
    lines.push(`G0 Z[V100 + 0.03]`);
    lines.push(`(CHECK FOR CUSTOM CHAMFER MINOR DIA)`);
    lines.push(`IF [V170 GT 0] GOTO N71`);
    lines.push(`(AUTO CALC FROM ANGLE)`);
    lines.push(`X[V75 - V63]`);
    lines.push(`G42 G1 X[V75] Z[V100] F[V53]`);
    lines.push(`GOTO N73`);
    lines.push(`(CUSTOM MINOR DIA)`);
    lines.push(`N71 X[V170 - V63]`);
    lines.push(`G42 G1 X[V170] Z[V100] F[V53]`);
    lines.push(`N73 IF [V7 EQ 2] GOTO N72`);
    lines.push(`(OD CHAMFER)`);
    lines.push(`X[V2] A[V84]`);
    lines.push(`GOTO N76`);
    lines.push(`(OD RADIUS)`);
    lines.push(`N72 X[V2] R[V6]`);
    lines.push(`GOTO N76`);
    // No chamfer
    lines.push(`(NO CHAMFER - LEAD IN AT OD)`);
    lines.push(`N75 G0 Z[V100 + 0.03]`);
    lines.push(`X[V2 - V63]`);
    lines.push(`G42 G1 X[V2] Z[V100] F[V53]`);
    // Common OD finish
    lines.push(`(OD STRAIGHT DOWN TO PART LENGTH)`);
    lines.push(`N76 Z-[V5]`);
    lines.push(`(LEAD OUT AND CANCEL COMP)`);
    lines.push(`G40 X[V2 + V63]`);
    lines.push(`(OD FINISH RETRACT)`);
    lines.push(`G0 X[V78]`);
    lines.push(`Z[V81]`);
    lines.push(`G97 S[V88] M3`);
    // Optional stop
    lines.push(`(OPTIONAL STOP BETWEEN OD AND ID)`);
    lines.push(`IF [V67 EQ 0] GOTO N200`);
    lines.push(`M5`);
    lines.push(`M9`);
    lines.push(`G0 X20.`);
    lines.push(`Z20.`);
    lines.push(`M1`);
    lines.push(``);

    // ---- ID ROUGHING ----
    if (g.finishID !== undefined) {
      operations.push("ID_ROUGH");
      lines.push(`(PROFILE ROUGHING - ID - T070707 - OPTIONAL)`);
      lines.push(`(V12=0 SKIPS ROUGHING, V12=1 RUNS ROUGHING)`);
      lines.push(`N200 IF [V12 EQ 0] GOTO N300`);
      this._emitToolStart(lines, "T070707", "ID ROUGH", "V166", "N9006", opts.includeG140G270);
      lines.push(`G50 S[V68]`);
      // Re-emit tool call for ID rough (follows macro pattern where T call is after G50)
      lines.push(`N8 T070707`);
      lines.push(`M8`);
      lines.push(`G97 S[V166] M3`);
      lines.push(`G0 Z[V81]`);
      lines.push(`X[V3 - 0.05]`);
      lines.push(`G96 S[V47] M3`);
      lines.push(`Z[V100 + 0.01]`);
      lines.push(`G85 NAT6 D[V41] U[V37] W[V38] F[V54]`);
      lines.push(`NAT6 G81`);
      // ID chamfer check
      lines.push(`(CHECK FOR CUSTOM CHAMFER MAJOR DIA)`);
      lines.push(`IF [V171 GT 0] GOTO N118`);
      lines.push(`(AUTO CALC FROM ANGLE)`);
      lines.push(`G0 X[V76] Z[V100 + 0.01]`);
      lines.push(`GOTO N118A`);
      lines.push(`(CUSTOM MAJOR DIA)`);
      lines.push(`N118 G0 X[V171] Z[V100 + 0.01]`);
      lines.push(`N118A G1 Z[V100]`);
      lines.push(`IF [V9 EQ 0] GOTO N120`);
      lines.push(`IF [V10 EQ 2] GOTO N115`);
      lines.push(`(ID CHAMFER)`);
      lines.push(`X[V4] A[V85]`);
      lines.push(`GOTO N120`);
      lines.push(`(ID RADIUS)`);
      lines.push(`N115 X[V4] R[V9]`);
      lines.push(`N120 Z-[V163]`);
      lines.push(`X[V3 - 0.05]`);
      lines.push(`G80`);
      lines.push(`(ID ROUGH RETRACT - X CLEARANCE THEN Z)`);
      lines.push(`G0 X[V4 - 0.005]`);
      lines.push(`Z[V81]`);
      lines.push(`G97 S[V166] M3`);
      this._emitToolEnd(lines);
      lines.push(``);

      // ---- ID FINISHING ----
      operations.push("ID_FINISH");
      lines.push(`(PROFILE FINISHING - ID - T080808 - MANUAL TOOLPATH)`);
      lines.push(`N300 G0 X20. Z20.`);
      lines.push(`IF [V110 EQ 0] GOTO N9007`);
      lines.push(`G270`);
      lines.push(`N9007 G95 G18`);
      lines.push(`G50 S[V69]`);
      lines.push(`N9 T080808`);
      lines.push(`M8`);
      lines.push(`G97 S[V162] M3`);
      lines.push(`G0 Z[V81]`);
      lines.push(`X[V3]`);
      lines.push(`G96 S[V47] M3`);
      lines.push(`(CHECK FOR ID CHAMFER/RADIUS)`);
      lines.push(`IF [V9 EQ 0] GOTO N305`);
      // With chamfer
      lines.push(`(WITH CHAMFER/RADIUS - LEAD IN AT BORE DIA)`);
      lines.push(`G0 Z[V100 + 0.03]`);
      lines.push(`X[V4 - V63]`);
      lines.push(`G41 G1 X[V4] Z[V100] F[V55]`);
      lines.push(`IF [V10 EQ 2] GOTO N302`);
      // ID chamfer
      lines.push(`(ID CHAMFER - CUT OUTWARD TO CHAMFER)`);
      lines.push(`(CHECK FOR CUSTOM CHAMFER MAJOR DIA)`);
      lines.push(`IF [V171 GT 0] GOTO N301`);
      lines.push(`(AUTO CALC FROM ANGLE)`);
      lines.push(`X[V76]`);
      lines.push(`X[V4] A[V85]`);
      lines.push(`GOTO N310`);
      lines.push(`(CUSTOM MAJOR DIA)`);
      lines.push(`N301 X[V171]`);
      lines.push(`X[V4] A[V85]`);
      lines.push(`GOTO N310`);
      // ID radius
      lines.push(`(ID RADIUS)`);
      lines.push(`N302 IF [V171 GT 0] GOTO N303`);
      lines.push(`(AUTO CALC)`);
      lines.push(`X[V76]`);
      lines.push(`X[V4] R[V9]`);
      lines.push(`GOTO N310`);
      lines.push(`(CUSTOM MAJOR DIA)`);
      lines.push(`N303 X[V171]`);
      lines.push(`X[V4] R[V9]`);
      lines.push(`GOTO N310`);
      // No chamfer
      lines.push(`(NO CHAMFER - LEAD IN AT BORE DIA)`);
      lines.push(`N305 G0 Z[V100 + 0.03]`);
      lines.push(`X[V4 - V63]`);
      lines.push(`G41 G1 X[V4] Z[V100] F[V55]`);
      // Common bore path
      lines.push(`(BORE STRAIGHT DOWN TO FINISH DEPTH)`);
      lines.push(`N310 Z-[V164]`);
      lines.push(`(LEAD OUT AND CANCEL COMP - 0.01 INSIDE FINISH DIA)`);
      lines.push(`G40 X[V4 - 0.01]`);
      lines.push(`(ID FINISH RETRACT - X ALREADY AT CLEARANCE, NOW Z)`);
      lines.push(`G0 Z[V81]`);
      lines.push(`G97 S[V162] M3`);
      lines.push(`M5`);
      lines.push(`M9`);
      lines.push(`G0 X20.`);
      lines.push(`Z20.`);
      lines.push(`M1`);
      lines.push(``);
    } else {
      // No ID operations — jump target
      lines.push(`N200 (NO ID OPERATIONS)`);
      lines.push(``);
    }

    // ---- CUTOFF ----
    operations.push("CUTOFF");
    lines.push(`(CUTOFF - T111111)`);
    lines.push(`G0 X20. Z20.`);
    lines.push(`IF [V110 EQ 0] GOTO N9008`);
    lines.push(`G270`);
    lines.push(`N9008 G95 G18`);
    if (c.maxCutoffRPM !== undefined) {
      lines.push(`G50 S[V172]`);
    }
    lines.push(`N11 T111111`);
    lines.push(`M8`);
    lines.push(`G97 S[V89] M3`);
    lines.push(`G0 Z-[V5]`);
    lines.push(`X[V78]`);
    lines.push(`G96 S[V48] M3`);
    lines.push(``);

    // Cutoff chamfer/radius
    lines.push(`(CHECK FOR CHAMFER/RADIUS)`);
    lines.push(`IF [V13 EQ 0] GOTO N400`);
    lines.push(``);
    lines.push(`(CLEAR CUTOFF GROOVE FOR CHAMFER/RADIUS)`);
    lines.push(`G1 X[V2 - [V14 * TAN[V15] * 2]] F[V56]`);
    lines.push(`G0 X[V1 + V61]`);
    lines.push(`Z-[V5 + V17]`);
    lines.push(`G1 X[V2 - [V14 * TAN[V15] * 2]] F[V56]`);
    lines.push(`G0 X[V2 + 0.02]`);
    lines.push(``);
    lines.push(`(CHAMFER OR RADIUS)`);
    lines.push(`IF [V13 EQ 2] GOTO N350`);
    lines.push(`(CHAMFER)`);
    lines.push(`Z-[V5]`);
    lines.push(`G1 X[V2] A[V86] F[V16]`);
    lines.push(`GOTO N400`);
    lines.push(`(RADIUS)`);
    lines.push(`N350 Z-[V5 - V14]`);
    lines.push(`G1 X[V2] R[V14] F[V16]`);
    lines.push(``);

    // Finish cutoff
    lines.push(`(FINISH CUTOFF)`);
    const cutoffEndX = g.finishID !== undefined ? `V3 - 0.11` : `V3 - 0.11`;
    lines.push(`N400 G1 X[${cutoffEndX}] F[V56]`);
    lines.push(`G0 X[V78]`);
    lines.push(`G97 S[V89] M3`);
    lines.push(`M5`);
    lines.push(`M9`);
    lines.push(`M243`);
    lines.push(``);

    // Program end
    lines.push(`G0 X20.`);
    lines.push(`Z20.`);
    lines.push(`IF [V110 EQ 0] GOTO N9009`);
    lines.push(`G270`);
    lines.push(``);
    lines.push(`N9009 M30`);

    const gcode = lines.join("\n");
    const cycleTime = this.estimateCycleTime(config);

    return {
      gcode,
      lineCount: lines.length,
      operations,
      variables: vars,
      calculations: calcs,
      estimatedCycleTime_s: cycleTime,
      warnings,
    };
  }

  // --------------------------------------------------------------------------
  // PUBLIC: Generate counter bore program
  // --------------------------------------------------------------------------
  generateCounterBoreProgram(config: OkumaProgramConfig & {
    counterBore: {
      diameter: number;
      depth: number;
      undercut?: {
        taperAngle: number;
        diameterReduction: number;
        straightLength: number;
      };
      idRoughStep: number;
      drill3?: DrillConfig & { depth: number };
    };
  }): GeneratedProgram {
    const warnings: string[] = [];
    const operations: string[] = [];
    const calc = this._computeValues(config, warnings);
    const vars = this._buildVariableMap(config, calc);
    const calcs = this._buildCalculationMap(config, calc);

    const lines: string[] = [];
    const g = config.geometry;
    const cb = config.counterBore;
    const s = config.speeds;
    const c = config.cutting;
    const cl = config.clearance;
    const sa = config.stockAllowances;
    const opts = config.options;
    const tnrRough = config.tools.roughNoseRadius;
    const tnrFinish = config.tools.finishNoseRadius;
    const stockFace = g.stockFaceOffset ?? 0.015;

    // --- Header ---
    lines.push(`O${config.programNumber}`);
    lines.push(`(T010101 - FACE/OD ROUGH)`);
    lines.push(`(T020202 - FACE/OD FINISH)`);
    lines.push(`(T030303 - SPOT DRILL)`);
    lines.push(`(T050505 - DRILL 1 - PILOT)`);
    lines.push(`(T060606 - DRILL 2 - THRU)`);
    if (cb.drill3) lines.push(`(T070707 - DRILL 3 - 180 DEG - OPTIONAL)`);
    lines.push(`(T080808 - ID ROUGH - COUNTER BORE)`);
    lines.push(`(T090909 - ID FINISH - COUNTER BORE)`);
    lines.push(`(T111111 - CUTOFF)`);
    lines.push(``);

    // --- Parameters section ---
    lines.push(`(==========================================================)`);
    lines.push(`(============= ADJUSTABLE PARAMETERS ======================)`);
    lines.push(`(==========================================================)`);
    lines.push(``);

    lines.push(`(========== STOCK AND MODEL ==========)`);
    lines.push(`V1 = ${fmt(g.stockDiameter)}           (STOCK DIAMETER)`);
    lines.push(`V2 = ${fmt(g.finishOD)}          (FINISH OD)`);
    lines.push(`V3 = ${fmt(g.drillDiameter ?? config.drill1.diameter)}         (FINISH THRU HOLE DIA)`);
    lines.push(`V4 = ${fmt(cb.diameter)}          (FINISH COUNTER BORE DIA)`);
    lines.push(`V5 = ${fmt(g.partLength)}         (PART LENGTH - OD)`);
    lines.push(`V6 = ${fmt(cb.depth)}            (COUNTER BORE DEPTH)`);
    lines.push(`V100 = ${fmt(stockFace)}          (STOCK FACE OFFSET - Z ZERO AT PART FACE)`);
    lines.push(``);

    // OD Chamfer
    const odCham = config.odChamfer ?? { type: "none" as const, depth: 0 };
    lines.push(`(========== OD CHAMFER ==========)`);
    lines.push(`V7 = ${fmt(odCham.depth)}           (CHAMFER Z DEPTH - 0 FOR NONE)`);
    lines.push(`V8 = ${odCham.angle ?? 45}             (CHAMFER ANGLE)`);
    lines.push(`V170 = ${odCham.minorDiaOverride ?? 0}            (CHAMFER MINOR DIA - 0=AUTO CALC, OR ENTER START DIA)`);
    lines.push(``);

    // Spot drill
    if (config.spotDrill) {
      const sd = config.spotDrill;
      lines.push(`(========== SPOT DRILL PARAMETERS ==========)`);
      lines.push(`V20 = ${fmt(sd.diameter)}           (SPOT DRILL DIAMETER)`);
      lines.push(`V21 = ${fmt(sd.sfm, 0)}           (SPOT DRILL SFM)`);
      lines.push(`V22 = ${fmt(sd.peckDepth ?? 0.1)}           (SPOT DRILL DEPTH)`);
      lines.push(`V23 = ${sd.usePeck ? 1 : 0}             (SPOT DRILL PECK: 0=NO, 1=YES)`);
      lines.push(`V24 = ${fmt(sd.peckDepth ?? 0.13)}          (SPOT DRILL PECK DEPTH)`);
      lines.push(`V19 = ${fmt(sd.feed)}         (SPOT DRILL FEED - IPR)`);
      lines.push(``);
    }

    // Drill 1 - Pilot
    const d1 = config.drill1;
    lines.push(`(========== DRILL 1 - PILOT ==========)`);
    lines.push(`V25 = ${fmt(d1.diameter)}        (DRILL 1 DIAMETER)`);
    lines.push(`V26 = ${fmt(d1.sfm, 0)}            (DRILL 1 SFM)`);
    lines.push(`V27 = ${fmt(d1.feed)}         (DRILL 1 FEED - IPR)`);
    lines.push(`V28 = ${fmt(d1.peckDepth ?? 0.13)}          (DRILL 1 PECK DEPTH)`);
    lines.push(`V29 = ${fmt(d1.pointAngle, 0)}           (DRILL 1 POINT ANGLE)`);
    lines.push(`V30 = ${d1.usePeck ? 1 : 0}             (DRILL 1 PECK: 0=NO, 1=YES)`);
    lines.push(``);

    // Drill 2 - Thru
    if (config.drill2) {
      const d2 = config.drill2;
      lines.push(`(========== DRILL 2 - THRU - OPTIONAL ==========)`);
      lines.push(`V45 = 1             (DRILL 2 ENABLE: 0=NO, 1=YES)`);
      lines.push(`V31 = ${fmt(d2.diameter)}          (DRILL 2 DIAMETER - THRU DRILL)`);
      lines.push(`V32 = ${fmt(d2.sfm, 0)}            (DRILL 2 SFM)`);
      lines.push(`V33 = ${fmt(d2.feed)}         (DRILL 2 FEED - IPR)`);
      lines.push(`V34 = ${fmt(d2.peckDepth ?? 0.13)}          (DRILL 2 PECK DEPTH)`);
      lines.push(`V35 = ${fmt(d2.pointAngle, 0)}           (DRILL 2 POINT ANGLE)`);
      lines.push(`V36 = ${d2.usePeck ? 1 : 0}             (DRILL 2 PECK: 0=NO, 1=YES)`);
      lines.push(``);
    }

    // Drill 3 - 180 deg
    if (cb.drill3) {
      const d3 = cb.drill3;
      lines.push(`(========== DRILL 3 - 180 DEG - OPTIONAL ==========)`);
      lines.push(`V37 = 1             (DRILL 3 ENABLE: 0=NO, 1=YES)`);
      lines.push(`V38 = ${fmt(d3.diameter)}        (DRILL 3 DIAMETER - 180 DEG)`);
      lines.push(`V39 = ${fmt(d3.sfm, 0)}            (DRILL 3 SFM)`);
      lines.push(`V40 = ${fmt(d3.feed)}         (DRILL 3 FEED - IPR)`);
      lines.push(`V41 = ${fmt(d3.peckDepth ?? 0.957)}         (DRILL 3 PECK DEPTH)`);
      lines.push(`V42 = ${fmt(d3.pointAngle, 0)}           (DRILL 3 POINT ANGLE)`);
      lines.push(`V43 = ${d3.usePeck ? 1 : 0}             (DRILL 3 PECK: 0=NO, 1=YES)`);
      lines.push(`V44 = ${fmt(d3.depth)}           (DRILL 3 DEPTH - COUNTER BORE DEPTH)`);
      lines.push(``);
    }

    // Stock allowances
    lines.push(`(========== STOCK ALLOWANCES ==========)`);
    lines.push(`V50 = ${fmt(sa.odRadial)}          (OD FINISH STOCK - RADIAL)`);
    lines.push(`V51 = ${fmt(sa.odAxial)}         (OD FINISH STOCK - AXIAL)`);
    lines.push(`V52 = ${fmt(sa.idRadial ?? 0.01)}          (ID FINISH STOCK - RADIAL)`);
    lines.push(`V53 = ${fmt(sa.idAxial ?? 0.002)}           (ID FINISH STOCK - AXIAL)`);
    lines.push(`V54 = ${fmt(sa.faceZ)}          (FACE STOCK ALLOWANCE - Z)`);
    lines.push(``);

    // Cutoff
    lines.push(`(========== CUTOFF PARAMETERS ==========)`);
    lines.push(`V130 = ${fmt(s.cutoffSFM ?? 500, 0)}          (CUTOFF SFM)`);
    lines.push(`V131 = ${fmt(s.cutoffFeed ?? 0.004)}        (CUTOFF FEED - IPR)`);
    lines.push(`V132 = ${fmt(config.tools.cutoffInsertWidth ?? 0.118)}        (CUTOFF INSERT WIDTH)`);
    lines.push(`V133 = ${fmt(c.maxCutoffRPM ?? 2500, 0)}         (CUTOFF MAX RPM)`);
    lines.push(``);

    // Roughing
    lines.push(`(========== ROUGHING PARAMETERS ==========)`);
    lines.push(`V55 = ${fmt(c.odDepthOfCut)}           (OD DEPTH OF CUT)`);
    lines.push(`V56 = ${fmt(cb.idRoughStep)}          (ID ROUGH STEP - DIAMETER INCREMENT)`);
    lines.push(``);

    // Counter bore undercut
    if (cb.undercut) {
      lines.push(`(========== COUNTER BORE UNDERCUT ==========)`);
      lines.push(`V140 = ${fmt(cb.undercut.taperAngle, 0)}            (UNDERCUT TAPER ANGLE - DEGREES)`);
      lines.push(`V141 = ${fmt(cb.undercut.diameterReduction)}         (UNDERCUT DIAMETER REDUCTION)`);
      lines.push(`V142 = ${fmt(cb.undercut.straightLength)}         (UNDERCUT STRAIGHT LENGTH)`);
      lines.push(``);
    }

    // Tool nose radius
    lines.push(`(========== TOOL NOSE RADIUS ==========)`);
    lines.push(`V57 = ${fmt(tnrRough)}        (TOOL 1 NOSE RADIUS - OD ROUGH)`);
    lines.push(`V58 = ${fmt(tnrFinish)}        (TOOL 2 NOSE RADIUS - OD FINISH)`);
    lines.push(``);

    // Turning speeds
    lines.push(`(========== TURNING SPEEDS - SFM ==========)`);
    lines.push(`V60 = ${fmt(s.odRoughSFM, 0)}           (OD ROUGH SFM)`);
    lines.push(`V61 = ${fmt(s.odFinishSFM, 0)}           (OD FINISH SFM)`);
    lines.push(`V62 = ${fmt(s.idSFM ?? 400, 0)}           (ID ROUGH SFM)`);
    lines.push(`V63 = ${fmt((s.idSFM ?? 400) + 100, 0)}           (ID FINISH SFM)`);
    lines.push(``);

    // Turning feeds
    lines.push(`(========== TURNING FEEDS ==========)`);
    lines.push(`V64 = ${fmt(s.faceRoughFeed)}         (FACE ROUGH FEED)`);
    lines.push(`V65 = ${fmt(s.faceFinishFeed)}         (FACE FINISH FEED)`);
    lines.push(`V66 = ${fmt(s.odRoughFeed)}         (OD ROUGH FEED)`);
    lines.push(`V67 = ${fmt(s.odFinishFeed)}         (OD FINISH FEED)`);
    lines.push(`V68 = ${fmt(s.idRoughFeed ?? 0.007)}         (ID ROUGH FEED)`);
    lines.push(`V69 = ${fmt(s.idFinishFeed ?? 0.0045)}        (ID FINISH FEED)`);
    lines.push(``);

    // Clearance
    lines.push(`(========== CLEARANCE ==========)`);
    lines.push(`V70 = ${fmt(cl.zClearance)}          (Z CLEARANCE - OD)`);
    lines.push(`V71 = ${fmt(cl.xClearance)}           (X CLEARANCE - OD RAPID)`);
    lines.push(`V72 = ${fmt(cl.zDrillClearance ?? 0.05)}           (Z DRILL CLEARANCE - EXTRA)`);
    lines.push(`V73 = 0.01          (ID CLEARANCE - BORING)`);
    lines.push(`V74 = 0.06          (ID RAPID CLEARANCE - FROM DRILL)`);
    lines.push(``);

    // Max spindle
    lines.push(`(========== MAX SPINDLE SPEEDS ==========)`);
    lines.push(`V75 = ${fmt(c.maxRoughRPM, 0)}          (OD ROUGH MAX RPM)`);
    lines.push(`V76 = ${fmt(c.maxFinishRPM, 0)}          (OD FINISH MAX RPM)`);
    lines.push(`V77 = ${fmt(c.maxIdRoughRPM ?? 2500, 0)}          (ID ROUGH MAX RPM)`);
    lines.push(`V78 = ${fmt(c.maxIdFinishRPM ?? 1000, 0)}          (ID FINISH MAX RPM)`);
    lines.push(``);

    // Options
    lines.push(`(========== ID ROUGHING OPTIONS ==========)`);
    lines.push(`V79 = ${opts.skipIdRoughing ? 1 : 0}             (SKIP THRU BORE ROUGH: 0=ROUGH FULL, 1=COUNTER BORE ONLY)`);
    lines.push(``);
    lines.push(`(========== OPTIONAL STOPS ==========)`);
    lines.push(`V80 = ${opts.odToIdStop ? 1 : 0}             (OD FINISH TO ID STOP: 0=NO, 1=YES)`);
    lines.push(``);
    lines.push(`(========== MACHINE OPTIONS ==========)`);
    lines.push(`V81 = ${opts.includeG140G270 ? 1 : 0}             (INCLUDE G140/G270: 0=NO, 1=YES)`);
    lines.push(``);

    // --- Auto-calculations ---
    lines.push(`(==========================================================)`);
    lines.push(`(============= AUTO-CALCULATIONS ==========================)`);
    lines.push(`(==========================================================)`);
    lines.push(``);

    lines.push(`(========== CALCULATED RPM ==========)`);
    if (config.spotDrill) lines.push(`V90 = [V21 * 3.82] / V20         (SPOT DRILL RPM)`);
    lines.push(`V91 = [V26 * 3.82] / V25         (DRILL 1 RPM)`);
    if (config.drill2) lines.push(`V92 = [V32 * 3.82] / V31         (DRILL 2 RPM)`);
    if (cb.drill3) lines.push(`V93 = [V39 * 3.82] / V38         (DRILL 3 RPM)`);
    lines.push(``);

    lines.push(`(========== DRILL DEPTH CALCULATIONS ==========)`);
    lines.push(`V94 = V25 / 2 / TAN[V29 / 2]     (DRILL 1 POINT DEPTH)`);
    lines.push(`V95 = V5 + V94 + 0.03            (DRILL 1 FULL THRU DEPTH)`);
    lines.push(`V123 = [V3 / 2] / TAN[V29 / 2]   (DRILL 1 TANGENT DEPTH - TANGENT TO THRU HOLE DIA)`);
    if (config.drill2) {
      lines.push(``);
      lines.push(`V96 = V31 / 2 / TAN[V35 / 2]     (DRILL 2 POINT DEPTH)`);
      lines.push(`V97 = V5 + V96 + 0.03            (DRILL 2 TOTAL DEPTH)`);
    }
    lines.push(``);

    lines.push(`(========== APPROACH/CLEARANCE VALUES ==========)`);
    lines.push(`V101 = V1 + V71                  (OD APPROACH DIA - STOCK + CLEARANCE)`);
    lines.push(`V102 = V70 + V100                (Z CLEARANCE POSITION)`);
    lines.push(`V103 = V102 + V72                (DRILL RETRACT Z)`);
    lines.push(``);

    lines.push(`(========== OD CHAMFER CALCULATIONS ==========)`);
    lines.push(`V104 = V2 - [V7 * TAN[V8] * 2]   (CHAMFER START DIA - AUTO CALC USING ANGLE)`);
    lines.push(`V105 = 180 - V8                  (CHAMFER ANGLE FOR OKUMA - FROM +Z CCW)`);
    lines.push(``);

    lines.push(`(========== TURNING RPM CALCULATIONS ==========)`);
    lines.push(`V106 = [V60 * 3.82] / V1         (OD ROUGH INITIAL RPM)`);
    lines.push(`V107 = [V61 * 3.82] / V2         (OD FINISH INITIAL RPM)`);
    lines.push(`V108 = [V62 * 3.82] / V4         (ID ROUGH INITIAL RPM)`);
    lines.push(`V109 = [V63 * 3.82] / V4         (ID FINISH INITIAL RPM)`);
    lines.push(`V134 = [V130 * 3.82] / V2        (CUTOFF INITIAL RPM)`);
    lines.push(``);

    lines.push(`(========== FACE ROUGH APPROACH VALUES ==========)`);
    lines.push(`V110 = V54 + V57 + 0.0185        (FACE ROUGH APPROACH Z)`);
    lines.push(`V111 = V1 + V57 + V71            (FACE ROUGH RAPID X - STOCK + TNR + CLEARANCE)`);
    lines.push(`V112 = V1 + V57                  (FACE ROUGH COMP ON X - STOCK + TNR)`);
    lines.push(`V113 = 0 - [V57 * 2]             (FACE ROUGH END X - 2X TNR PAST CENTER)`);
    lines.push(`V114 = 0 - V57                   (FACE ROUGH COMP OFF X - 1X TNR)`);
    lines.push(``);

    lines.push(`(========== FACE FINISH APPROACH VALUES ==========)`);
    lines.push(`V115 = V100 + V58 + 0.0185       (FACE FINISH APPROACH Z)`);
    lines.push(`V116 = V2 + V58 + V71            (FACE FINISH RAPID X - OD + TNR + CLEARANCE)`);
    lines.push(`V117 = V2 + V58                  (FACE FINISH COMP ON X - OD + TNR)`);
    lines.push(`V118 = V4 - 0.1                  (FACE FINISH END X - BEFORE COUNTER BORE)`);
    lines.push(`V135 = V4                        (FACE FINISH COMP OFF X)`);
    lines.push(``);

    lines.push(`(========== OD ROUGH VALUES ==========)`);
    lines.push(`V119 = V5 + 0.01                 (OD ROUGH Z DEPTH)`);
    lines.push(``);

    lines.push(`(========== ID APPROACH CALCULATIONS ==========)`);
    lines.push(`V120 = V25 - V74                 (ID APPROACH - PILOT DRILL MINUS .06)`);
    if (cb.drill3) lines.push(`V121 = V38 - V74                 (ID APPROACH AFTER 180 - IF USED)`);
    if (config.drill2) lines.push(`V122 = V31 - V74                 (ID APPROACH AFTER THRU - IF NO 180)`);
    lines.push(``);

    if (cb.undercut) {
      lines.push(`(========== COUNTER BORE UNDERCUT CALCULATIONS ==========)`);
      lines.push(`V143 = V4 - V141                 (UNDERCUT FINISH DIAMETER)`);
      lines.push(`V144 = [V141 / 2] / TAN[V140]    (TAPER Z LENGTH)`);
      lines.push(`V145 = 180 + V140                (OKUMA A WORD FOR ID TAPER)`);
      lines.push(`V146 = V6 - V142 - V144          (TAPER START Z - FROM FACE)`);
      lines.push(`V147 = V6 - V142                 (UNDERCUT START Z - FROM FACE)`);
      lines.push(`V148 = V143 + [V52 * 2]          (UNDERCUT ROUGH DIA WITH STOCK)`);
      lines.push(``);
    }

    lines.push(`(========== ID ROUGHING PASS CALCULATIONS ==========)`);
    lines.push(`V149 = V25 + V56                 (PASS 1 DIA)`);
    lines.push(`V150 = V25 + [V56 * 2]           (PASS 2 DIA)`);
    lines.push(`V151 = V25 + [V56 * 3]           (PASS 3 DIA)`);
    lines.push(`V152 = V25 + [V56 * 4]           (PASS 4 DIA)`);
    lines.push(`V153 = V25 + [V56 * 5]           (PASS 5 DIA)`);
    lines.push(`V154 = V25 + [V56 * 6]           (PASS 6 DIA)`);
    lines.push(`V155 = V4 + [V52 * 2]            (COUNTER BORE ROUGH DIA)`);
    lines.push(``);

    // --- Program body ---
    lines.push(`(==========================================================)`);
    lines.push(`(============= PROGRAM START ==============================)`);
    lines.push(`(==========================================================)`);
    lines.push(``);

    lines.push(`IF [V81 EQ 0] GOTO N9000`);
    lines.push(`G140`);
    lines.push(`N9000 G90 G80`);
    lines.push(`G50 S[V75]`);
    lines.push(``);

    // FACE ROUGH
    operations.push("FACE_ROUGH");
    lines.push(`(FACE ROUGH - T010101)`);
    lines.push(`G0 X20. Z20.`);
    lines.push(`IF [V81 EQ 0] GOTO N9001`);
    lines.push(`G270`);
    lines.push(`N9001 G95 G18`);
    lines.push(`N1 T010101`);
    lines.push(`M8`);
    lines.push(`G97 S[V106] M3`);
    lines.push(`G0 Z[V102]`);
    lines.push(`X[V111]`);
    lines.push(`G96 S[V60] M3`);
    lines.push(`Z[V110]`);
    lines.push(`G41 X[V112] Z[V54] F[V64]`);
    lines.push(`X[V113]`);
    lines.push(`G40 X[V114] Z[V110]`);
    lines.push(`G0 X[V111]`);
    lines.push(`Z[V102]`);
    lines.push(`G97 S[V106] M3`);
    lines.push(``);

    // OD ROUGH
    operations.push("OD_ROUGH");
    lines.push(`(PROFILE ROUGHING - OD)`);
    lines.push(`N2 G97 S[V106] M3`);
    lines.push(`G0 Z[V102]`);
    lines.push(`X[V101]`);
    lines.push(`G96 S[V60] M3`);
    lines.push(`Z[V100 + 0.03]`);
    lines.push(`X[V1 + 0.06]`);
    lines.push(`G85 NAT1 D[V55] U[V50] W[V51] F[V66]`);
    lines.push(`NAT1 G81`);
    lines.push(`(CHECK FOR CUSTOM CHAMFER MINOR DIA)`);
    lines.push(`IF [V170 GT 0] GOTO N1101`);
    lines.push(`(AUTO CALC FROM ANGLE)`);
    lines.push(`G0 X[V104] Z[V100 + 0.03]`);
    lines.push(`GOTO N1102`);
    lines.push(`(CUSTOM MINOR DIA)`);
    lines.push(`N1101 G0 X[V170] Z[V100 + 0.03]`);
    lines.push(`N1102 G1 Z[V100]`);
    lines.push(`IF [V7 EQ 0] GOTO N12`);
    lines.push(`X[V2] A[V105]`);
    lines.push(`GOTO N13`);
    lines.push(`N12 X[V2]`);
    lines.push(`N13 Z-[V119]`);
    lines.push(`X[V1 + 0.02]`);
    lines.push(`G80`);
    lines.push(`G0 X[V101] Z[V100 + 0.03]`);
    lines.push(`Z[V102]`);
    lines.push(`G180`);
    lines.push(`G97 S[V106] M3`);
    lines.push(`M5`);
    lines.push(`M9`);
    lines.push(`G0 X20.`);
    lines.push(`Z20.`);
    lines.push(`M1`);
    lines.push(``);

    // SPOT DRILL
    if (config.spotDrill) {
      operations.push("SPOT_DRILL");
      lines.push(`(SPOT DRILL - T030303)`);
      lines.push(`G0 X20. Z20.`);
      lines.push(`IF [V81 EQ 0] GOTO N9002`);
      lines.push(`G270`);
      lines.push(`N9002 G95 G18`);
      lines.push(`N3 T030303`);
      lines.push(`M8`);
      lines.push(`G97 S[V90] M3`);
      lines.push(`G0 Z[V103]`);
      lines.push(`X0.`);
      lines.push(`G0 Z[V102]`);
      lines.push(`IF [V23 EQ 0] GOTO N31`);
      lines.push(`(PECK)`);
      lines.push(`G74 X0. Z[V100 - V22] I[V24] D0.2 F[V19]`);
      lines.push(`G180`);
      lines.push(`G0 Z[V103]`);
      lines.push(`GOTO N32`);
      lines.push(`(NO PECK)`);
      lines.push(`N31 G1 Z[V100 - V22] F[V19]`);
      lines.push(`G0 Z[V103]`);
      lines.push(`N32 M5`);
      lines.push(`M9`);
      lines.push(`G0 X20.`);
      lines.push(`Z20.`);
      lines.push(`M1`);
      lines.push(``);
    }

    // DRILL 1 - PILOT
    operations.push("DRILL_1_PILOT");
    lines.push(`(DRILL 1 - PILOT - T050505)`);
    lines.push(`G0 X20. Z20.`);
    lines.push(`IF [V81 EQ 0] GOTO N9003`);
    lines.push(`G270`);
    lines.push(`N9003 G95 G18`);
    lines.push(`N4 T050505`);
    lines.push(`M8`);
    lines.push(`G97 S[V91] M3`);
    lines.push(`G0 Z[V103]`);
    lines.push(`X0.`);
    lines.push(`G0 Z[V102]`);
    lines.push(`(CHECK IF DRILL 2 IS ENABLED)`);
    lines.push(`IF [V45 EQ 1] GOTO N40`);
    lines.push(`(DRILL 2 DISABLED - DRILL TO TANGENT DEPTH ONLY)`);
    lines.push(`IF [V30 EQ 0] GOTO N43`);
    lines.push(`(PECK TO TANGENT)`);
    lines.push(`G74 X0. Z-[V123] I[V28] D[V123 + 0.1] F[V27]`);
    lines.push(`G180`);
    lines.push(`G0 Z[V103]`);
    lines.push(`GOTO N42`);
    lines.push(`N43 G1 Z-[V123] F[V27]`);
    lines.push(`G0 Z[V103]`);
    lines.push(`GOTO N42`);
    lines.push(`(DRILL 2 ENABLED - DRILL FULL THRU)`);
    lines.push(`N40 IF [V30 EQ 0] GOTO N41`);
    lines.push(`(PECK FULL THRU)`);
    lines.push(`G74 X0. Z-[V95] I[V28] D[V95 + 0.1] F[V27]`);
    lines.push(`G180`);
    lines.push(`G0 Z[V103]`);
    lines.push(`GOTO N42`);
    lines.push(`(NO PECK FULL THRU)`);
    lines.push(`N41 G1 Z-[V95] F[V27]`);
    lines.push(`G0 Z[V103]`);
    lines.push(`N42 M5`);
    lines.push(`M9`);
    lines.push(`G0 X20.`);
    lines.push(`Z20.`);
    lines.push(`M1`);
    lines.push(``);

    // DRILL 2 - THRU
    if (config.drill2) {
      operations.push("DRILL_2_THRU");
      lines.push(`(DRILL 2 - THRU - OPTIONAL - T060606)`);
      lines.push(`IF [V45 EQ 0] GOTO N55`);
      lines.push(`G0 X20. Z20.`);
      lines.push(`IF [V81 EQ 0] GOTO N9004`);
      lines.push(`G270`);
      lines.push(`N9004 G95 G18`);
      lines.push(`N5 T060606`);
      lines.push(`M8`);
      lines.push(`G97 S[V92] M3`);
      lines.push(`G0 Z[V103]`);
      lines.push(`X0.`);
      lines.push(`G0 Z[V102]`);
      lines.push(`IF [V36 EQ 0] GOTO N51`);
      lines.push(`(PECK)`);
      lines.push(`G74 X0. Z-[V97] I[V34] D[V97 + 0.1] F[V33]`);
      lines.push(`G180`);
      lines.push(`G0 Z[V103]`);
      lines.push(`GOTO N52`);
      lines.push(`(NO PECK)`);
      lines.push(`N51 G1 Z-[V97] F[V33]`);
      lines.push(`G0 Z[V103]`);
      lines.push(`N52 M5`);
      lines.push(`M9`);
      lines.push(`G0 X20.`);
      lines.push(`Z20.`);
      lines.push(`M1`);
      lines.push(``);
    }

    // DRILL 3 - 180 DEG
    if (cb.drill3) {
      operations.push("DRILL_3_180");
      lines.push(`N55 (DRILL 3 - 180 DEG - OPTIONAL - T070707)`);
      lines.push(`IF [V37 EQ 0] GOTO N200`);
      lines.push(`G0 X20. Z20.`);
      lines.push(`IF [V81 EQ 0] GOTO N9005`);
      lines.push(`G270`);
      lines.push(`N9005 G95 G18`);
      lines.push(`N6 T070707`);
      lines.push(`M8`);
      lines.push(`G97 S[V93] M3`);
      lines.push(`G0 Z[V103]`);
      lines.push(`X0.`);
      lines.push(`G0 Z[V102]`);
      lines.push(`IF [V43 EQ 0] GOTO N61`);
      lines.push(`(PECK)`);
      lines.push(`G74 X0. Z-[V44] I[V41] D[V44 + 0.1] F[V40]`);
      lines.push(`G180`);
      lines.push(`G0 Z[V103]`);
      lines.push(`GOTO N62`);
      lines.push(`(NO PECK)`);
      lines.push(`N61 G1 Z-[V44] F[V40]`);
      lines.push(`G0 Z[V103]`);
      lines.push(`N62 M5`);
      lines.push(`M9`);
      lines.push(`G0 X20.`);
      lines.push(`Z20.`);
      lines.push(`M1`);
      lines.push(``);
    }

    // FACE FINISH
    operations.push("FACE_FINISH");
    lines.push(`(FACE FINISH - T020202)`);
    lines.push(`N200 G0 X20. Z20.`);
    lines.push(`IF [V81 EQ 0] GOTO N9006`);
    lines.push(`G270`);
    lines.push(`N9006 G95 G18`);
    lines.push(`N7 T020202`);
    lines.push(`M8`);
    lines.push(`G97 S[V107] M3`);
    lines.push(`G0 Z[V102]`);
    lines.push(`X[V116]`);
    lines.push(`G96 S[V61] M3`);
    lines.push(`Z[V115]`);
    lines.push(`G41 X[V117] Z[V100] F[V65]`);
    lines.push(`X[V118]`);
    lines.push(`G40 X[V135] Z[V115]`);
    lines.push(`G0 X[V116]`);
    lines.push(`Z[V102]`);
    lines.push(`G97 S[V107] M3`);
    lines.push(``);

    // OD FINISH using G86 NAT1
    operations.push("OD_FINISH");
    lines.push(`(PROFILE FINISHING - OD)`);
    lines.push(`N8 G50 S[V76]`);
    lines.push(`G97 S[V107] M3`);
    lines.push(`G0 Z[V102]`);
    lines.push(`X[V101 - 0.6]`);
    lines.push(`G96 S[V61] M3`);
    lines.push(`G86 NAT1 F3.`);
    lines.push(`G97 S[V107] M3`);
    lines.push(`M5`);
    lines.push(`M9`);
    lines.push(`G0 X20.`);
    lines.push(`Z20.`);
    lines.push(`(OPTIONAL STOP BETWEEN OD AND ID)`);
    lines.push(`IF [V80 EQ 0] GOTO N300`);
    lines.push(`M1`);
    lines.push(``);

    // ID ROUGH - COUNTER BORE
    operations.push("ID_ROUGH_CBORE");
    lines.push(`(ID ROUGH - COUNTER BORE - T080808)`);
    lines.push(`N300 G0 X20. Z20.`);
    lines.push(`IF [V81 EQ 0] GOTO N9007`);
    lines.push(`G270`);
    lines.push(`N9007 G95 G18`);
    lines.push(`G50 S[V77]`);
    lines.push(`N9 T080808`);
    lines.push(`M8`);
    lines.push(`G97 S[V108] M3`);
    lines.push(`G0 Z[V102]`);
    lines.push(`(APPROACH DIA BASED ON PILOT DRILL)`);
    lines.push(`X[V120]`);
    lines.push(`G96 S[V62] M3`);
    lines.push(`Z[V100 + V73]`);
    lines.push(``);

    lines.push(`(CHECK IF THRU BORE NEEDS ROUGHING)`);
    lines.push(`IF [V79 EQ 1] GOTO N315`);
    lines.push(`(ROUGH THRU HOLE IF NEEDED)`);
    lines.push(`X[V3 + [V52 * 2]]`);
    lines.push(`G1 Z-[V5 + 0.03] F[V68]`);
    lines.push(`X[V3]`);
    lines.push(`G0 Z[V100 + V73]`);
    lines.push(``);

    // Incremental roughing
    if (cb.drill3) {
      lines.push(`(CHECK IF 180 DRILL USED - SKIP INCREMENTAL PASSES)`);
      lines.push(`N315 IF [V37 EQ 1] GOTO N320`);
    } else {
      lines.push(`N315 (INCREMENTAL ROUGHING)`);
    }
    lines.push(``);
    lines.push(`(INCREMENTAL ROUGHING FROM PILOT DRILL TO COUNTER BORE)`);
    lines.push(`X[V120]`);
    const taperZ = cb.undercut ? "V146" : `V6`;
    for (let pass = 1; pass <= 6; pass++) {
      const vPass = 148 + pass; // V149-V154
      lines.push(`(PASS ${pass})`);
      lines.push(`IF [V${vPass} GT V155] GOTO N320`);
      lines.push(`X[V${vPass}]`);
      lines.push(`G1 Z-[${taperZ}] F[V68]`);
      lines.push(`G0 Z[V100 + V73]`);
    }
    lines.push(``);

    // NAT6 profile definition
    lines.push(`(DEFINE NAT6 PROFILE FOR FINISH CYCLE REFERENCE)`);
    lines.push(`N320 X[V155 - 0.01]`);
    lines.push(`G0 Z[V102]`);
    lines.push(`G85 NAT6 D[V56] U[V52] W[V53] F[V68]`);
    lines.push(`NAT6 G81`);
    lines.push(`G0 X[V155] Z[V100 + V73]`);
    lines.push(`G1 Z[V100]`);
    if (cb.undercut) {
      lines.push(`Z-[V146]`);
      lines.push(`X[V148] A[V145]`);
      lines.push(`Z-[V6]`);
      lines.push(`X[V143 - 0.02]`);
    } else {
      lines.push(`Z-[V6]`);
      lines.push(`X[V4 - 0.02]`);
    }
    lines.push(`G80`);
    lines.push(`G0 X[V120]`);
    lines.push(`Z[V102]`);
    lines.push(`G180`);
    lines.push(`G97 S[V108] M3`);
    lines.push(`M5`);
    lines.push(`M9`);
    lines.push(`G0 X20.`);
    lines.push(`Z20.`);
    lines.push(`M1`);
    lines.push(``);

    // ID FINISH - COUNTER BORE
    operations.push("ID_FINISH_CBORE");
    lines.push(`(ID FINISH - COUNTER BORE - T090909)`);
    lines.push(`N400 G0 X20. Z20.`);
    lines.push(`IF [V81 EQ 0] GOTO N9008`);
    lines.push(`G270`);
    lines.push(`N9008 G95 G18`);
    lines.push(`G50 S[V78]`);
    lines.push(`N10 T090909`);
    lines.push(`M8`);
    lines.push(`G97 S[V109] M3`);
    lines.push(`G0 Z[V102]`);
    lines.push(`X[V120]`);
    lines.push(`G96 S[V63] M3`);
    lines.push(`Z[V100 + V73]`);
    lines.push(`G0 X[V3 - V73]`);
    lines.push(`G86 NAT6 F[V69]`);
    lines.push(`G97 S[V109] M3`);
    lines.push(`M5`);
    lines.push(`M9`);
    lines.push(`G0 X20.`);
    lines.push(`Z20.`);
    lines.push(`M1`);
    lines.push(``);

    // CUTOFF
    operations.push("CUTOFF");
    lines.push(`(CUTOFF - T111111)`);
    lines.push(`G0 X20. Z20.`);
    lines.push(`IF [V81 EQ 0] GOTO N9009`);
    lines.push(`G270`);
    lines.push(`N9009 G95 G18`);
    lines.push(`G50 S[V133]`);
    lines.push(`N11 T111111`);
    lines.push(`M8`);
    lines.push(`G97 S[V134] M3`);
    lines.push(`G0 Z-[V5]`);
    lines.push(`X[V101]`);
    lines.push(`G96 S[V130] M3`);
    lines.push(`G1 X[V3 - 0.1] F[V131]`);
    lines.push(`G0 X[V101]`);
    lines.push(`G97 S[V134] M3`);
    lines.push(`M5`);
    lines.push(`M9`);
    lines.push(``);
    lines.push(`G0 X20.`);
    lines.push(`Z20.`);
    lines.push(`IF [V81 EQ 0] GOTO N9010`);
    lines.push(`G270`);
    lines.push(``);
    lines.push(`N9010 M30`);

    const gcode = lines.join("\n");
    const cycleTime = this.estimateCycleTime(config);

    return {
      gcode,
      lineCount: lines.length,
      operations,
      variables: vars,
      calculations: calcs,
      estimatedCycleTime_s: cycleTime,
      warnings,
    };
  }

  // --------------------------------------------------------------------------
  // PUBLIC: Validate Okuma macro syntax
  // --------------------------------------------------------------------------
  validateProgram(gcode: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const defined: Set<string> = new Set();
    const used: Set<string> = new Set();
    const lines = gcode.split("\n");
    const natDefined: Set<string> = new Set();
    const natUsed: Set<string> = new Set();
    const nLabels: Set<string> = new Set();
    const nGotoTargets: Set<string> = new Set();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      if (!line || line.startsWith("(")) continue;

      // Check V-variable definitions (V# = ...)
      const defMatch = line.match(/^V(\d+)\s*=/);
      if (defMatch) {
        const vNum = defMatch[1];
        if (defined.has(vNum)) {
          warnings.push(`Line ${lineNum}: V${vNum} redefined`);
        }
        defined.add(vNum);
      }

      // Check V-variable usage in expressions
      const useMatches = line.matchAll(/V(\d+)/g);
      for (const m of useMatches) {
        if (!defMatch || m.index! > line.indexOf("=")) {
          used.add(m[1]);
        }
      }

      // NAT definitions
      const natDefMatch = line.match(/^NAT(\d+)\s+G81/);
      if (natDefMatch) natDefined.add(natDefMatch[1]);

      // NAT usage (G85/G86 NAT#)
      const natUseMatch = line.match(/G8[56]\s+NAT(\d+)/);
      if (natUseMatch) natUsed.add(natUseMatch[1]);

      // N labels
      const nLabelMatch = line.match(/^N(\d+)/);
      if (nLabelMatch) nLabels.add(nLabelMatch[1]);

      // GOTO targets
      const gotoMatches = line.matchAll(/GOTO\s+N(\d+)/g);
      for (const gm of gotoMatches) {
        nGotoTargets.add(gm[1]);
      }

      // Check for balanced brackets
      const openBrackets = (line.match(/\[/g) || []).length;
      const closeBrackets = (line.match(/\]/g) || []).length;
      if (openBrackets !== closeBrackets) {
        errors.push(`Line ${lineNum}: Unbalanced brackets — ${openBrackets} open, ${closeBrackets} close`);
      }

      // Check G85/G86 must reference NAT
      if (/G8[56]\b/.test(line) && !/NAT\d+/.test(line) && !/G80/.test(line)) {
        warnings.push(`Line ${lineNum}: G85/G86 without NAT# reference`);
      }

      // Check G41/G42 has corresponding G40
      // (checked at program level below)

      // Check for proper M-codes
      if (/M0[0-9]/.test(line) && !/M0[0-9]/.test(line.replace(/\(.*?\)/g, ""))) {
        // Comment-only M-code reference, skip
      }

      // Validate G50 has S word
      if (/G50\b/.test(line) && !/S/.test(line)) {
        errors.push(`Line ${lineNum}: G50 without S (max RPM) value`);
      }

      // Validate G96/G97 has S word
      if (/G9[67]\b/.test(line) && !/S/.test(line)) {
        errors.push(`Line ${lineNum}: G96/G97 without S value`);
      }

      // Check IF-GOTO syntax
      if (/^IF\b/.test(line)) {
        if (!/IF\s*\[.+\]\s*(GOTO\s+N\d+|$)/.test(line)) {
          errors.push(`Line ${lineNum}: Malformed IF statement`);
        }
      }
    }

    // Check for missing GOTO targets
    for (const target of nGotoTargets) {
      if (!nLabels.has(target)) {
        errors.push(`GOTO N${target} references undefined label`);
      }
    }

    // Check for missing NAT profiles
    for (const nat of natUsed) {
      if (!natDefined.has(nat)) {
        errors.push(`G85/G86 references NAT${nat} but profile not defined`);
      }
    }

    // Check G41/G42 balance with G40
    const compOnCount = (gcode.match(/G4[12]\b/g) || []).length;
    const compOffCount = (gcode.match(/G40\b/g) || []).length;
    if (compOnCount > compOffCount) {
      warnings.push(`Cutter comp: ${compOnCount} G41/G42 activations but only ${compOffCount} G40 cancels`);
    }

    // Check program start/end
    if (!lines[0]?.trim().match(/^O\d+/)) {
      warnings.push("Program does not start with O-number");
    }
    const lastNonEmpty = lines.filter((l) => l.trim()).pop()?.trim();
    if (lastNonEmpty && !/M30|M99/.test(lastNonEmpty)) {
      warnings.push("Program does not end with M30 or M99");
    }

    // Build unused variable list
    const definedArr = Array.from(defined).sort((a, b) => +a - +b);
    const usedArr = Array.from(used).sort((a, b) => +a - +b);
    const unusedArr = definedArr.filter((v) => !used.has(v));

    if (unusedArr.length > 0) {
      warnings.push(`Unused V-variables: ${unusedArr.map((v) => `V${v}`).join(", ")}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      variableUsage: {
        defined: definedArr.map((v) => `V${v}`),
        used: usedArr.map((v) => `V${v}`),
        unused: unusedArr.map((v) => `V${v}`),
      },
    };
  }

  // --------------------------------------------------------------------------
  // PUBLIC: Parse existing macro into config
  // --------------------------------------------------------------------------
  parseExistingMacro(gcode: string): Partial<OkumaProgramConfig> {
    const lines = gcode.split("\n");
    const vars: Record<number, number> = {};

    // Extract all V-variable assignments (simple numeric)
    for (const line of lines) {
      const match = line.trim().match(/^V(\d+)\s*=\s*([\d.+-]+)/);
      if (match) {
        vars[parseInt(match[1])] = parseFloat(match[2]);
      }
    }

    // Extract program number
    const progMatch = lines[0]?.trim().match(/^O(\d+)/);
    const programNumber = progMatch ? parseInt(progMatch[1]) : 1001;

    // Determine chamfer type from V7 (1=chamfer, 2=radius)
    const odChamferType =
      vars[7] === 2 ? "radius" : vars[6] && vars[6] > 0 ? "chamfer" : "none";
    const idChamferType =
      vars[10] === 2 ? "radius" : vars[9] && vars[9] > 0 ? "chamfer" : "none";
    const cutoffType =
      vars[13] === 2 ? "radius" : vars[13] === 1 ? "chamfer" : "none";

    const config: Partial<OkumaProgramConfig> = {
      programNumber,
      geometry: {
        stockDiameter: vars[1] ?? 2.0,
        finishOD: vars[2] ?? 1.75,
        finishID: vars[4],
        partLength: vars[5] ?? 2.0,
        drillDiameter: vars[3],
        stockFaceOffset: vars[100] ?? 0.015,
      },
      odChamfer: {
        type: odChamferType as "chamfer" | "radius" | "none",
        depth: vars[6] ?? 0,
        angle: vars[8] ?? 45,
        minorDiaOverride: vars[170] ?? 0,
      },
      tools: {
        roughNoseRadius: vars[44] ?? 0.031,
        finishNoseRadius: vars[99] ?? 0.0156,
        cutoffInsertWidth: vars[17] ?? 0.118,
      },
      speeds: {
        odRoughSFM: vars[45] ?? 755,
        odFinishSFM: vars[46] ?? 825,
        idSFM: vars[47],
        cutoffSFM: vars[48],
        faceRoughFeed: vars[50] ?? 0.008,
        faceFinishFeed: vars[51] ?? 0.0045,
        odRoughFeed: vars[52] ?? 0.012,
        odFinishFeed: vars[53] ?? 0.0045,
        idRoughFeed: vars[54],
        idFinishFeed: vars[55],
        cutoffFeed: vars[56],
      },
      cutting: {
        odDepthOfCut: vars[40] ?? 0.1,
        idDepthOfCut: vars[41],
        faceDepthOfCut: vars[42],
        maxRoughRPM: vars[65] ?? 2500,
        maxFinishRPM: vars[66] ?? 2500,
        maxIdRoughRPM: vars[68],
        maxIdFinishRPM: vars[69],
        maxCutoffRPM: vars[172],
      },
      drill1: {
        diameter: vars[25] ?? vars[3] ?? 0.5,
        sfm: vars[26] ?? 95,
        feed: vars[27] ?? 0.005,
        peckDepth: vars[28],
        pointAngle: vars[29] ?? 130,
        usePeck: (vars[30] ?? 0) === 1,
      },
      clearance: {
        zClearance: vars[60] ?? 0.03,
        xClearance: vars[61] ?? 0.03,
        zDrillClearance: vars[62],
        leadInDistance: vars[63],
      },
      stockAllowances: {
        odRadial: vars[35] ?? 0.015,
        odAxial: vars[36] ?? 0.002,
        idRadial: vars[37],
        idAxial: vars[38],
        faceZ: vars[39] ?? 0.015,
      },
      options: {
        includeG140G270: (vars[110] ?? 0) === 1,
        odToIdStop: (vars[67] ?? 0) === 1,
        skipIdRoughing: (vars[12] ?? 0) === 0,
        faceMultiPass: (vars[43] ?? 0) === 1,
      },
    };

    // ID chamfer
    if (vars[4] !== undefined) {
      config.idChamfer = {
        type: idChamferType as "chamfer" | "radius" | "none",
        depth: vars[9] ?? 0,
        angle: vars[11] ?? 45,
        minorDiaOverride: vars[171] ?? 0,
      };
    }

    // Cutoff chamfer
    if (vars[13] !== undefined) {
      config.cutoffChamfer = {
        type: cutoffType as "chamfer" | "radius" | "none",
        depth: vars[14] ?? 0.03,
        angle: vars[15] ?? 45,
      };
    }

    // Spot drill
    if (vars[20] !== undefined) {
      config.spotDrill = {
        diameter: vars[20],
        sfm: vars[21] ?? 131,
        feed: vars[19] ?? 0.002,
        peckDepth: vars[24],
        pointAngle: 90,
        usePeck: (vars[23] ?? 0) === 1,
      };
    }

    // Drill 2
    if (vars[31] !== undefined && vars[31] !== 0) {
      config.drill2 = {
        diameter: vars[32] ?? 0.5,
        sfm: vars[33] ?? 80,
        feed: vars[34] ?? 0.006,
        peckDepth: vars[155],
        pointAngle: vars[156] ?? 118,
        usePeck: (vars[157] ?? 0) === 1,
      };
    }

    return config;
  }

  // --------------------------------------------------------------------------
  // PUBLIC: Get smart defaults by material
  // --------------------------------------------------------------------------
  getDefaults(material?: string): Partial<OkumaProgramConfig> {
    const mat = (material ?? "steel").toLowerCase();

    const base: Partial<OkumaProgramConfig> = {
      tools: { roughNoseRadius: 0.031, finishNoseRadius: 0.0156, cutoffInsertWidth: 0.118 },
      clearance: { zClearance: 0.03, xClearance: 0.03, zDrillClearance: 0.5, leadInDistance: 0.06 },
      stockAllowances: { odRadial: 0.015, odAxial: 0.002, faceZ: 0.015 },
      cutting: { odDepthOfCut: 0.1, maxRoughRPM: 2500, maxFinishRPM: 2500 },
      options: { includeG140G270: false, odToIdStop: false, skipIdRoughing: false, faceMultiPass: false },
    };

    if (mat.includes("aluminum") || mat.includes("alumin")) {
      return {
        ...base,
        speeds: {
          odRoughSFM: 1200, odFinishSFM: 1500,
          idSFM: 800, cutoffSFM: 800,
          faceRoughFeed: 0.01, faceFinishFeed: 0.005,
          odRoughFeed: 0.015, odFinishFeed: 0.006,
          idRoughFeed: 0.008, idFinishFeed: 0.005,
          cutoffFeed: 0.005,
        },
        cutting: { odDepthOfCut: 0.15, maxRoughRPM: 4000, maxFinishRPM: 4000 },
      };
    }

    if (mat.includes("stainless") || mat.includes("303") || mat.includes("304") || mat.includes("316")) {
      return {
        ...base,
        speeds: {
          odRoughSFM: 400, odFinishSFM: 500,
          idSFM: 300, cutoffSFM: 350,
          faceRoughFeed: 0.006, faceFinishFeed: 0.003,
          odRoughFeed: 0.008, odFinishFeed: 0.004,
          idRoughFeed: 0.005, idFinishFeed: 0.003,
          cutoffFeed: 0.003,
        },
        cutting: { odDepthOfCut: 0.08, maxRoughRPM: 2000, maxFinishRPM: 2500 },
      };
    }

    if (mat.includes("brass") || mat.includes("bronze")) {
      return {
        ...base,
        speeds: {
          odRoughSFM: 800, odFinishSFM: 1000,
          idSFM: 600, cutoffSFM: 600,
          faceRoughFeed: 0.01, faceFinishFeed: 0.005,
          odRoughFeed: 0.012, odFinishFeed: 0.005,
          idRoughFeed: 0.008, idFinishFeed: 0.005,
          cutoffFeed: 0.005,
        },
        cutting: { odDepthOfCut: 0.12, maxRoughRPM: 3500, maxFinishRPM: 3500 },
      };
    }

    if (mat.includes("titanium") || mat.includes("ti-6al") || mat.includes("ti6al")) {
      return {
        ...base,
        speeds: {
          odRoughSFM: 200, odFinishSFM: 250,
          idSFM: 150, cutoffSFM: 150,
          faceRoughFeed: 0.005, faceFinishFeed: 0.003,
          odRoughFeed: 0.006, odFinishFeed: 0.003,
          idRoughFeed: 0.004, idFinishFeed: 0.003,
          cutoffFeed: 0.002,
        },
        cutting: { odDepthOfCut: 0.06, maxRoughRPM: 1500, maxFinishRPM: 1500 },
      };
    }

    if (mat.includes("inconel") || mat.includes("hastelloy") || mat.includes("nickel")) {
      return {
        ...base,
        speeds: {
          odRoughSFM: 120, odFinishSFM: 150,
          idSFM: 100, cutoffSFM: 100,
          faceRoughFeed: 0.004, faceFinishFeed: 0.002,
          odRoughFeed: 0.005, odFinishFeed: 0.003,
          idRoughFeed: 0.004, idFinishFeed: 0.002,
          cutoffFeed: 0.002,
        },
        cutting: { odDepthOfCut: 0.05, maxRoughRPM: 1000, maxFinishRPM: 1200 },
      };
    }

    // Default: mild steel / 1018 / 4140
    return {
      ...base,
      speeds: {
        odRoughSFM: 755, odFinishSFM: 825,
        idSFM: 400, cutoffSFM: 500,
        faceRoughFeed: 0.008, faceFinishFeed: 0.0045,
        odRoughFeed: 0.012, odFinishFeed: 0.0045,
        idRoughFeed: 0.007, idFinishFeed: 0.0045,
        cutoffFeed: 0.004,
      },
    };
  }

  // --------------------------------------------------------------------------
  // PUBLIC: Estimate cycle time (rough, in seconds)
  // --------------------------------------------------------------------------
  estimateCycleTime(config: OkumaProgramConfig): number {
    const g = config.geometry;
    const s = config.speeds;
    const c = config.cutting;
    const cutoffWidth = config.tools.cutoffInsertWidth ?? 0.118;
    let totalTime = 0;

    // Tool change time (assume 3s per change)
    let toolChanges = 3; // rough, finish, drill1, cutoff minimum
    if (config.spotDrill) toolChanges++;
    if (config.drill2) toolChanges++;
    if (g.finishID !== undefined) toolChanges += 2; // id rough + id finish
    totalTime += toolChanges * 3;

    // Facing: single pass across diameter
    const faceRPM = Math.min(this.calculateRPM(s.odRoughSFM, g.stockDiameter), c.maxRoughRPM);
    const faceDistance = g.stockDiameter / 2;
    totalTime += faceDistance / (s.faceRoughFeed * faceRPM / 60);

    // OD roughing: number of passes × length
    const odStock = g.stockDiameter - g.finishOD;
    const odPasses = Math.ceil(odStock / (2 * c.odDepthOfCut));
    const odRoughRPM = Math.min(this.calculateRPM(s.odRoughSFM, g.finishOD + odStock / 2), c.maxRoughRPM);
    totalTime += odPasses * g.partLength / (s.odRoughFeed * odRoughRPM / 60);

    // OD finishing: single pass
    const odFinishRPM = Math.min(this.calculateRPM(s.odFinishSFM, g.finishOD), c.maxFinishRPM);
    totalTime += g.partLength / (s.odFinishFeed * odFinishRPM / 60);

    // Drilling
    const drillDepth = g.partLength + cutoffWidth + 0.2;
    const drill1RPM = this.calculateRPM(config.drill1.sfm, config.drill1.diameter);
    totalTime += drillDepth / (config.drill1.feed * drill1RPM / 60);

    // ID operations
    if (g.finishID !== undefined && s.idSFM && s.idRoughFeed && c.idDepthOfCut) {
      const idStock = g.finishID - (config.drill1.diameter ?? 0);
      const idPasses = Math.ceil(idStock / (2 * c.idDepthOfCut));
      const idRPM = this.calculateRPM(s.idSFM, g.finishID);
      totalTime += idPasses * g.partLength / (s.idRoughFeed * idRPM / 60);
      totalTime += g.partLength / ((s.idFinishFeed ?? 0.0045) * idRPM / 60);
    }

    // Cutoff
    if (s.cutoffSFM && s.cutoffFeed) {
      const cutoffRPM = this.calculateRPM(s.cutoffSFM, g.finishOD);
      const cutoffTravel = (g.finishOD - (config.drill1.diameter ?? 0)) / 2;
      totalTime += cutoffTravel / (s.cutoffFeed * cutoffRPM / 60);
    }

    // Rapid moves overhead (~15% addition)
    totalTime *= 1.15;

    return Math.round(totalTime);
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Compute all derived values
  // --------------------------------------------------------------------------
  private _computeValues(config: OkumaProgramConfig, warnings: string[]): CalculatedValues {
    const g = config.geometry;
    const s = config.speeds;
    const c = config.cutting;
    const cl = config.clearance;
    const sa = config.stockAllowances;
    const tnrRough = config.tools.roughNoseRadius;
    const tnrFinish = config.tools.finishNoseRadius;
    const cutoffWidth = config.tools.cutoffInsertWidth ?? 0.118;
    const stockFace = g.stockFaceOffset ?? 0.015;
    const odCham = config.odChamfer ?? { type: "none" as const, depth: 0, angle: 45 };
    const idCham = config.idChamfer ?? { type: "none" as const, depth: 0, angle: 45 };
    const cutCham = config.cutoffChamfer ?? { type: "none" as const, depth: 0, angle: 45 };

    // Validations
    if (g.stockDiameter <= g.finishOD) {
      warnings.push("Stock diameter must be greater than finish OD");
    }
    if (g.finishID !== undefined && g.finishID >= g.finishOD) {
      warnings.push("Finish ID must be less than finish OD");
    }
    if (g.finishID !== undefined && config.drill1.diameter >= g.finishID) {
      warnings.push("Drill diameter is >= finish ID — ID roughing may not be needed");
    }

    const drill1PointDepth = (config.drill1.diameter / 2) / tanDeg(config.drill1.pointAngle / 2);
    const drill1TotalDepth = g.partLength + cutoffWidth + drill1PointDepth + 0.03;

    let drill2PointDepth = 0;
    let drill2TotalDepth = 0;
    if (config.drill2) {
      drill2PointDepth = (config.drill2.diameter / 2) / tanDeg(config.drill2.pointAngle / 2);
      drill2TotalDepth = g.partLength + cutoffWidth + drill2PointDepth + 0.03;
    }

    const odChamAngle = odCham.angle ?? 45;
    const idChamAngle = idCham.angle ?? 45;
    const cutChamAngle = cutCham.angle ?? 45;

    const odChamferStartDia = g.finishOD - (odCham.depth * tanDeg(odChamAngle) * 2);
    const idChamferStartDia = g.finishID !== undefined ? g.finishID + (idCham.depth * tanDeg(idChamAngle) * 2) : 0;

    const zClearancePos = cl.zClearance + stockFace;
    const drillRetractZ = zClearancePos + (cl.zDrillClearance ?? 0.5);

    return {
      spotDrillRPM: config.spotDrill ? this.calculateRPM(config.spotDrill.sfm, config.spotDrill.diameter) : 0,
      drill1RPM: this.calculateRPM(config.drill1.sfm, config.drill1.diameter),
      drill2RPM: config.drill2 ? this.calculateRPM(config.drill2.sfm, config.drill2.diameter) : 0,
      drill1PointDepth,
      drill1TotalDepth,
      drill1ZDepth: -drill1TotalDepth,
      drill2PointDepth,
      drill2TotalDepth,
      drill2ZDepth: -drill2TotalDepth,
      odChamferStartDia,
      idChamferStartDia,
      odChamferAngle: 180 - odChamAngle,
      idChamferAngle: 180 + idChamAngle,
      cutoffChamferAngle: 180 + cutChamAngle,
      odRoughRPM: this.calculateRPM(s.odRoughSFM, g.stockDiameter),
      odFinishRPM: this.calculateRPM(s.odFinishSFM, g.finishOD),
      cutoffRPM: s.cutoffSFM ? this.calculateRPM(s.cutoffSFM, g.finishOD) : 0,
      idRoughRPM: g.finishID && s.idSFM ? this.calculateRPM(s.idSFM, config.drill1.diameter) : 0,
      idFinishRPM: g.finishID && s.idSFM ? this.calculateRPM(s.idSFM, g.finishID) : 0,
      approachDia: g.stockDiameter + cl.xClearance,
      boreApproachDia: config.drill1.diameter - cl.xClearance,
      odRoughDepth: g.partLength + 0.01,
      zClearancePos,
      drillRetractZ,
      faceEndX: -(tnrRough * 2),
      faceRoughTargetZ: stockFace - sa.faceZ,
      odStockToRemove: g.stockDiameter - (g.finishOD + sa.odRadial * 2),
      faceApproachZ: sa.faceZ + 0.0566,
      faceRoughRapidX: g.stockDiameter + tnrRough + cl.xClearance,
      faceRoughCompOnX: g.stockDiameter + tnrRough,
      faceRoughEndX: -(tnrRough * 2),
      faceRoughCompOffX: -tnrRough,
      faceFinishRapidX: g.finishOD - 0.05,
      faceFinishCompOnX: g.finishOD - tnrFinish * 2,
      faceFinishEndX: g.finishID !== undefined ? g.finishID - 0.07 : -(tnrFinish * 2),
      idRoughDepth: g.partLength + 0.06,
      idFinishDepth: g.partLength + 0.03,
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Build variable map for output
  // --------------------------------------------------------------------------
  private _buildVariableMap(
    config: OkumaProgramConfig,
    calc: CalculatedValues
  ): Record<string, { value: number; description: string }> {
    const g = config.geometry;
    const s = config.speeds;
    const c = config.cutting;
    const sa = config.stockAllowances;
    const cl = config.clearance;
    const stockFace = g.stockFaceOffset ?? 0.015;

    const map: Record<string, { value: number; description: string }> = {
      V1: { value: g.stockDiameter, description: "Stock Diameter" },
      V2: { value: g.finishOD, description: "Finish OD" },
      V5: { value: g.partLength, description: "Part Length" },
      V100: { value: stockFace, description: "Stock Face Offset" },
      V25: { value: config.drill1.diameter, description: "Drill 1 Diameter" },
      V35: { value: sa.odRadial, description: "OD Finish Stock - Radial" },
      V36: { value: sa.odAxial, description: "OD Finish Stock - Axial" },
      V39: { value: sa.faceZ, description: "Face Stock Allowance - Z" },
      V40: { value: c.odDepthOfCut, description: "OD Depth of Cut" },
      V44: { value: config.tools.roughNoseRadius, description: "Rough Nose Radius" },
      V99: { value: config.tools.finishNoseRadius, description: "Finish Nose Radius" },
      V45: { value: s.odRoughSFM, description: "OD Rough SFM" },
      V46: { value: s.odFinishSFM, description: "OD Finish SFM" },
      V50: { value: s.faceRoughFeed, description: "Face Rough Feed" },
      V52: { value: s.odRoughFeed, description: "OD Rough Feed" },
      V53: { value: s.odFinishFeed, description: "OD Finish Feed" },
      V60: { value: cl.zClearance, description: "Z Clearance" },
      V61: { value: cl.xClearance, description: "X Clearance" },
      V65: { value: c.maxRoughRPM, description: "Rough Max RPM" },
      V66: { value: c.maxFinishRPM, description: "Finish Max RPM" },
    };

    if (g.finishID !== undefined) {
      map.V4 = { value: g.finishID, description: "Finish ID" };
    }
    if (s.idSFM !== undefined) {
      map.V47 = { value: s.idSFM, description: "ID SFM" };
    }
    if (s.cutoffSFM !== undefined) {
      map.V48 = { value: s.cutoffSFM, description: "Cutoff SFM" };
    }

    return map;
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Build calculation map
  // --------------------------------------------------------------------------
  private _buildCalculationMap(
    config: OkumaProgramConfig,
    calc: CalculatedValues
  ): Record<string, { formula: string; result: number }> {
    const map: Record<string, { formula: string; result: number }> = {
      "Drill 1 RPM": { formula: `[${config.drill1.sfm} * 3.82] / ${config.drill1.diameter}`, result: calc.drill1RPM },
      "Drill 1 Point Depth": { formula: `${config.drill1.diameter} / 2 / TAN[${config.drill1.pointAngle} / 2]`, result: +calc.drill1PointDepth.toFixed(4) },
      "Drill 1 Total Depth": { formula: `${config.geometry.partLength} + ${config.tools.cutoffInsertWidth ?? 0.118} + pointDepth + 0.03`, result: +calc.drill1TotalDepth.toFixed(4) },
      "OD Rough RPM": { formula: `[${config.speeds.odRoughSFM} * 3.82] / ${config.geometry.stockDiameter}`, result: calc.odRoughRPM },
      "OD Finish RPM": { formula: `[${config.speeds.odFinishSFM} * 3.82] / ${config.geometry.finishOD}`, result: calc.odFinishRPM },
      "OD Stock To Remove": { formula: `${config.geometry.stockDiameter} - (${config.geometry.finishOD} + ${config.stockAllowances.odRadial} * 2)`, result: +calc.odStockToRemove.toFixed(4) },
      "OD Chamfer Angle (Okuma)": { formula: `180 - ${config.odChamfer?.angle ?? 45}`, result: calc.odChamferAngle },
      "Z Clearance Position": { formula: `${config.clearance.zClearance} + ${config.geometry.stockFaceOffset ?? 0.015}`, result: +calc.zClearancePos.toFixed(4) },
      "Approach Diameter": { formula: `${config.geometry.stockDiameter} + ${config.clearance.xClearance}`, result: +calc.approachDia.toFixed(4) },
    };

    if (config.spotDrill) {
      map["Spot Drill RPM"] = { formula: `[${config.spotDrill.sfm} * 3.82] / ${config.spotDrill.diameter}`, result: calc.spotDrillRPM };
    }

    if (config.drill2) {
      map["Drill 2 RPM"] = { formula: `[${config.drill2.sfm} * 3.82] / ${config.drill2.diameter}`, result: calc.drill2RPM };
    }

    if (config.geometry.finishID !== undefined && config.speeds.idSFM) {
      map["ID Finish RPM"] = { formula: `[${config.speeds.idSFM} * 3.82] / ${config.geometry.finishID}`, result: calc.idFinishRPM };
    }

    return map;
  }

  // --------------------------------------------------------------------------
  // PUBLIC: Convert macro program to hardcoded G-code (ported from Python)
  // --------------------------------------------------------------------------
  /**
   * Convert an Okuma macro program with V-variables to clean hardcoded G-code.
   * Evaluates all expressions, resolves IF/GOTO branches, and outputs only
   * the executed code path with no variables remaining.
   *
   * Ported from okuma_interpreter.py (547 lines Python → TypeScript)
   */
  convertToHardcode(programText: string, decimalPlaces = 4): {
    gcode: string;
    variables: Record<number, number>;
    errors: string[];
    warnings: string[];
  } {
    const variables: Record<number, number> = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    const evalExpr = (expr: string): number => {
      let e = String(expr).trim();
      // Replace V-variables
      e = e.replace(/V(\d+)/gi, (_, n) => {
        const v = variables[parseInt(n)];
        if (v !== undefined) return String(v);
        errors.push(`Undefined variable: V${n}`);
        return "0";
      });
      // Brackets → parentheses
      e = e.replace(/\[/g, "(").replace(/\]/g, ")");
      // Trig functions (Okuma uses degrees)
      // Safe numeric evaluation helper — replaces raw eval() to prevent code injection
      const safeNumEval = (s: string): number => {
        try {
          // Only allow: digits, operators, parens, decimal points, spaces, E notation
          const cleaned = s.replace(/[^0-9+\-*/().eE\s]/g, "");
          if (!cleaned.trim()) return 0;
          return new Function(`"use strict"; return (${cleaned});`)() as number;
        } catch { return 0; }
      };
      e = e.replace(/TAN\(([^)]+)\)/gi, (_, a) => {
        try { return String(Math.tan((safeNumEval(a) * Math.PI) / 180)); } catch { return "0"; }
      });
      e = e.replace(/SIN\(([^)]+)\)/gi, (_, a) => {
        try { return String(Math.sin((safeNumEval(a) * Math.PI) / 180)); } catch { return "0"; }
      });
      e = e.replace(/COS\(([^)]+)\)/gi, (_, a) => {
        try { return String(Math.cos((safeNumEval(a) * Math.PI) / 180)); } catch { return "0"; }
      });
      e = e.replace(/SQRT\(([^)]+)\)/gi, (_, a) => {
        try { return String(Math.sqrt(safeNumEval(a))); } catch { return "0"; }
      });
      e = e.replace(/ABS\(([^)]+)\)/gi, (_, a) => {
        try { return String(Math.abs(safeNumEval(a))); } catch { return "0"; }
      });
      try { return safeNumEval(e); } catch (err) {
        errors.push(`Eval error: ${expr} → ${err}`);
        return 0;
      }
    };

    const evalCondition = (cond: string): boolean => {
      let e = cond.trim();
      const ops: Record<string, string> = { " LT ": " < ", " GT ": " > ", " EQ ": " == ", " NE ": " != ", " LE ": " <= ", " GE ": " >= " };
      for (const [ok, py] of Object.entries(ops)) e = e.replace(new RegExp(ok.replace(/\s/g, "\\s"), "gi"), py);
      e = e.replace(/V(\d+)/gi, (_, n) => String(variables[parseInt(n)] ?? 0));
      e = e.replace(/\[/g, "(").replace(/\]/g, ")");
      try { return Boolean(eval(e)); } catch { return false; }
    };

    const fmtNum = (v: number): string => {
      if (v === 0) return "0.";
      const r = parseFloat(v.toFixed(decimalPlaces));
      if (r === Math.floor(r)) return `${Math.floor(r)}.`;
      let s = r.toFixed(decimalPlaces).replace(/0+$/, "");
      if (s.endsWith(".")) s += "0";
      return s;
    };

    const substituteVars = (line: string): string => {
      // Resolve bracket expressions
      let result = "";
      let i = 0;
      while (i < line.length) {
        if (line[i] === "[") {
          let depth = 1, j = i + 1;
          while (j < line.length && depth > 0) { if (line[j] === "[") depth++; if (line[j] === "]") depth--; j++; }
          if (depth === 0) { result += fmtNum(evalExpr(line.slice(i + 1, j - 1))); i = j; }
          else { result += line[i]; i++; }
        } else { result += line[i]; i++; }
      }
      // Standalone V## refs
      result = result.replace(/V(\d+)/gi, (_, n) => {
        const v = variables[parseInt(n)];
        return v !== undefined ? fmtNum(v) : `V${n}`;
      });
      return result;
    };

    const lines = programText.split("\n");
    // Pass 1: parse all variable definitions
    const varDefLines = new Set<number>();
    for (let idx = 0; idx < lines.length; idx++) {
      const clean = lines[idx].replace(/\([^)]*\)\s*$/, "").trim();
      const m = clean.match(/^V(\d+)\s*=\s*(.+)$/i);
      if (m) {
        variables[parseInt(m[1])] = evalExpr(m[2]);
        varDefLines.add(idx);
      }
    }
    // Build label index
    const labels: Record<number, number> = {};
    for (let idx = 0; idx < lines.length; idx++) {
      const m = lines[idx].trim().match(/^N(\d+)\b/);
      if (m) labels[parseInt(m[1])] = idx;
    }
    // Pass 2: interpret flow
    const outputLines: string[] = [];
    let cur = 0;
    const maxIter = lines.length * 10;
    let iter = 0;
    while (cur < lines.length && iter < maxIter) {
      iter++;
      const stripped = lines[cur].trim();
      if (varDefLines.has(cur)) { cur++; continue; }
      if (!stripped) { cur++; continue; }
      // IF [cond] GOTO N##
      const ifM = stripped.match(/IF\s*\[([^\]]+)\]\s*GOTO\s*N(\d+)/i);
      if (ifM) {
        if (evalCondition(ifM[1])) {
          const tgt = parseInt(ifM[2]);
          if (tgt in labels) { cur = labels[tgt]; continue; }
        }
        cur++; continue;
      }
      // Unconditional GOTO
      const gotoM = stripped.match(/^GOTO\s*N(\d+)$/i);
      if (gotoM) {
        const tgt = parseInt(gotoM[1]);
        if (tgt in labels) { cur = labels[tgt]; continue; }
        cur++; continue;
      }
      // Skip branch-only labels
      if (/^N\d+\s*(\(.*\))?\s*$/.test(stripped)) { cur++; continue; }
      // Skip section dividers and parameter headers
      if (stripped.startsWith("(=") || stripped.includes("ADJUSTABLE PARAMETERS") || stripped.includes("AUTO-CALCULATIONS")) { cur++; continue; }
      // Real code line — substitute values
      let processed = substituteVars(lines[cur]);
      // Strip branch N-labels from non-tool lines
      if (!/\bT\d{6}\b/.test(processed)) {
        const nm = processed.trim().match(/^N\d+\s+(.+)$/);
        if (nm && !/^T\d{6}/.test(nm[1])) processed = nm[1];
      }
      outputLines.push(processed);
      cur++;
    }
    if (iter >= maxIter) warnings.push("Maximum iterations reached — possible infinite loop");
    return { gcode: outputLines.join("\n"), variables, errors, warnings };
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Emit standard tool start sequence
  // --------------------------------------------------------------------------
  private _emitToolStart(
    lines: string[],
    tool: string,
    comment: string,
    rpmVar: string,
    gotoLabel: string,
    includeG270: boolean
  ): void {
    lines.push(`(${comment} - ${tool})`);
    lines.push(`G0 X20. Z20.`);
    lines.push(`IF [V110 EQ 0] GOTO ${gotoLabel}`);
    lines.push(`G270`);
    lines.push(`${gotoLabel} G95 G18`);
    lines.push(`N1 ${tool}`);
    lines.push(`M8`);
    lines.push(`G97 S[${rpmVar}] M3`);
  }

  // --------------------------------------------------------------------------
  // PRIVATE: Emit standard tool end sequence
  // --------------------------------------------------------------------------
  private _emitToolEnd(lines: string[]): void {
    lines.push(`G97 S[V87] M3`);
    lines.push(`M5`);
    lines.push(`M9`);
    lines.push(`G0 X20.`);
    lines.push(`Z20.`);
    lines.push(`M1`);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const okumaParametricProgramEngine = new OkumaParametricProgramEngineImpl();
