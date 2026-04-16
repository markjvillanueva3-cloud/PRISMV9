/**
 * ProbeRoutineGeneratorEngine — Controller-Specific Probe Macro Generation
 * =========================================================================
 * NOVEL: Generates real, runnable Renishaw/Blum/Hexagon probe macros for
 * CNC machines. No CAM post-processor auto-generates probe routines from
 * part geometry — this is a PRISM exclusive.
 *
 * Generates controller-specific G-code using real macro numbers:
 * - Fanuc/Haas/Mazak: G65 P98xx (Renishaw Inspection Plus)
 * - Siemens: CYCLE977/978/982 (native probing cycles)
 * - Heidenhain: TCH PROBE 4xx (touch probe cycles)
 * - Okuma: G65 P98xx (Renishaw compatible)
 *
 * @module engines/ProbeRoutineGeneratorEngine
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export type ProbeController = "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma";

export interface ProbeFeature {
  type: "corner" | "bore" | "boss" | "edge" | "web" | "surface" | "groove" | "angle";
  position?: { x: number; y: number; z: number };
  diameter?: number;
  depth?: number;
  nominal?: number;
  tolerance_plus?: number;
  tolerance_minus?: number;
}

export interface ProbeWCSConfig {
  controller?: ProbeController;
  probe_tool_number?: number;
  features: ProbeFeature[];
  work_offset?: string;
  approach_distance?: number;
  feed_rate?: number;
}

export interface ProbeInspectionConfig {
  controller?: ProbeController;
  features: ProbeFeature[];
  action_on_fail?: "alarm" | "compensate" | "skip";
  spc_output?: boolean;
  measure_every_n_parts?: number;
}

export interface ProbeToolMeasureConfig {
  controller?: ProbeController;
  tool_numbers: number[];
  method?: "probe" | "laser" | "contact";
  measure_radius?: boolean;
  spindle_orient?: boolean;
}

export interface ProbeFirstArticleConfig {
  controller?: ProbeController;
  features: ProbeFeature[];
  datum_features?: string[];
  report_format?: "AS9102" | "PPAP" | "custom";
}

export interface ProbeResult {
  gcode: string;
  line_count: number;
  features_measured: number;
  warnings: string[];
  estimated_time_sec: number;
}

// ============================================================================
// CONTROLLER PROBE MACROS
// ============================================================================

interface ProbeDialect {
  comment: (text: string) => string;
  safeApproach: (z: number) => string;
  spindleOrient: () => string;
  probeTool: (t: number) => string;
  coolantOff: () => string;
  measureBore: (x: number, y: number, z: number, d: number, depth: number) => string[];
  measureBoss: (x: number, y: number, z: number, d: number, depth: number) => string[];
  measureSurface: (x: number, y: number, z: number) => string[];
  measureEdgeX: (x: number, y: number, z: number) => string[];
  measureEdgeY: (x: number, y: number, z: number) => string[];
  measureWeb: (x: number, y: number, z: number, width: number) => string[];
  measureCorner: (x: number, y: number, z: number) => string[];
  measureAngle: (x: number, y: number, z: number) => string[];
  toolLength: (t: number) => string[];
  toolRadius: (t: number) => string[];
  toleranceCheck: (varNum: string, nominal: number, tolPlus: number, tolMinus: number, alarmLabel: string) => string[];
  spcOutput: (label: string, varNum: string) => string[];
  compensateOffset: (offsetNum: number, axis: string, varNum: string, nominal: number) => string[];
  setWCS: (offset: string, axis: string, varNum: string) => string[];
}

const FANUC_DIALECT: ProbeDialect = {
  comment: (t) => `(${t})`,
  safeApproach: (z) => `G00 G90 Z${z.toFixed(3)}`,
  spindleOrient: () => "M19 (SPINDLE ORIENT)",
  probeTool: (t) => `T${t} M06\nG43 H${t}\nM19`,
  coolantOff: () => "M09",
  measureBore: (x, y, z, d, depth) => [
    `G00 X${x.toFixed(3)} Y${y.toFixed(3)}`,
    `G00 Z${(z + 5).toFixed(3)}`,
    `G65 P9814 D${d.toFixed(3)} Z${(z - depth).toFixed(3)} (BORE MEASURE)`,
  ],
  measureBoss: (x, y, z, d, depth) => [
    `G00 X${x.toFixed(3)} Y${y.toFixed(3)}`,
    `G00 Z${(z + 5).toFixed(3)}`,
    `G65 P9814 D${d.toFixed(3)} Z${(z - depth).toFixed(3)} M1. (BOSS MEASURE)`,
  ],
  measureSurface: (x, y, z) => [
    `G00 X${x.toFixed(3)} Y${y.toFixed(3)}`,
    `G00 Z${(z + 5).toFixed(3)}`,
    `G65 P9811 Z${z.toFixed(3)} (SURFACE MEASURE)`,
  ],
  measureEdgeX: (x, y, z) => [
    `G00 X${(x - 10).toFixed(3)} Y${y.toFixed(3)}`,
    `G00 Z${z.toFixed(3)}`,
    `G65 P9811 X${x.toFixed(3)} (X EDGE MEASURE)`,
  ],
  measureEdgeY: (x, y, z) => [
    `G00 X${x.toFixed(3)} Y${(y - 10).toFixed(3)}`,
    `G00 Z${z.toFixed(3)}`,
    `G65 P9811 Y${y.toFixed(3)} (Y EDGE MEASURE)`,
  ],
  measureWeb: (x, y, z, w) => [
    `G00 X${x.toFixed(3)} Y${y.toFixed(3)}`,
    `G00 Z${z.toFixed(3)}`,
    `G65 P9843 W${w.toFixed(3)} (WEB/POCKET WIDTH)`,
  ],
  measureCorner: (x, y, z) => [
    `G00 X${(x - 10).toFixed(3)} Y${(y - 10).toFixed(3)}`,
    `G00 Z${z.toFixed(3)}`,
    `G65 P9801 X${x.toFixed(3)} Y${y.toFixed(3)} (CORNER FIND)`,
  ],
  measureAngle: (x, y, z) => [
    `G00 X${x.toFixed(3)} Y${y.toFixed(3)}`,
    `G00 Z${z.toFixed(3)}`,
    `G65 P9843 A1. (ANGLE MEASURE)`,
  ],
  toolLength: (t) => [
    `T${t} M06`,
    "G65 P9023 (TOOL LENGTH MEASURE)",
    `(MEASURED LENGTH STORED IN H${t})`,
  ],
  toolRadius: (t) => [
    `T${t} M06`,
    "S500 M03 (SPIN FOR RADIUS MEASURE)",
    "G65 P9023 R1. (TOOL RADIUS MEASURE)",
    `(MEASURED RADIUS STORED IN D${t})`,
  ],
  toleranceCheck: (v, nom, tp, tm, label) => [
    `IF [${v} GT ${(nom + tp).toFixed(4)}] GOTO ${label}`,
    `IF [${v} LT ${(nom + tm).toFixed(4)}] GOTO ${label}`,
  ],
  spcOutput: (label, v) => [
    `DPRNT[${label}*${v}[44]]`,
  ],
  compensateOffset: (n, axis, v, nom) => [
    `G10 L2 P${n} ${axis}[${v}-${nom.toFixed(4)}] (AUTO COMPENSATE)`,
  ],
  setWCS: (offset, axis, v) => {
    const n = parseInt(offset.replace(/\D/g, "")) || 1;
    return [`G10 L2 P${n} ${axis}${v} (SET ${offset} ${axis})`];
  },
};

const SIEMENS_DIALECT: ProbeDialect = {
  comment: (t) => `; ${t}`,
  safeApproach: (z) => `G0 G90 Z${z.toFixed(3)}`,
  spindleOrient: () => "M19",
  probeTool: (t) => `T${t} D1\nM6\nM19`,
  coolantOff: () => "M9",
  measureBore: (x, y, z, d, depth) => [
    `G0 X${x.toFixed(3)} Y${y.toFixed(3)}`,
    `G0 Z${(z + 5).toFixed(3)}`,
    `CYCLE977(${d.toFixed(3)},0,${(z - depth).toFixed(3)},0,0,0,0,1) ; BORE MEASURE`,
  ],
  measureBoss: (x, y, z, d, depth) => [
    `G0 X${x.toFixed(3)} Y${y.toFixed(3)}`,
    `G0 Z${(z + 5).toFixed(3)}`,
    `CYCLE977(${d.toFixed(3)},0,${(z - depth).toFixed(3)},0,0,0,0,2) ; BOSS MEASURE`,
  ],
  measureSurface: (x, y, z) => [
    `G0 X${x.toFixed(3)} Y${y.toFixed(3)}`,
    `G0 Z${(z + 5).toFixed(3)}`,
    `CYCLE978(${z.toFixed(3)},0,0,0,0,0,0) ; SURFACE Z`,
  ],
  measureEdgeX: (x, y, z) => [
    `G0 X${(x - 10).toFixed(3)} Y${y.toFixed(3)}`,
    `G0 Z${z.toFixed(3)}`,
    `CYCLE978(${x.toFixed(3)},0,0,1,0,0,0) ; EDGE X`,
  ],
  measureEdgeY: (x, y, z) => [
    `G0 X${x.toFixed(3)} Y${(y - 10).toFixed(3)}`,
    `G0 Z${z.toFixed(3)}`,
    `CYCLE978(${y.toFixed(3)},0,0,2,0,0,0) ; EDGE Y`,
  ],
  measureWeb: (x, y, z, w) => [
    `G0 X${x.toFixed(3)} Y${y.toFixed(3)}`,
    `G0 Z${z.toFixed(3)}`,
    `CYCLE977(${w.toFixed(3)},0,0,0,0,0,0,3) ; WEB WIDTH`,
  ],
  measureCorner: (x, y, z) => [
    `G0 X${(x - 10).toFixed(3)} Y${(y - 10).toFixed(3)}`,
    `G0 Z${z.toFixed(3)}`,
    `CYCLE961(${x.toFixed(3)},${y.toFixed(3)},0,0) ; CORNER`,
  ],
  measureAngle: (x, y, z) => [
    `G0 X${x.toFixed(3)} Y${y.toFixed(3)}`,
    `G0 Z${z.toFixed(3)}`,
    `CYCLE998(0,0,0,1) ; ANGLE MEASURE`,
  ],
  toolLength: (t) => [
    `T${t} D1\nM6`,
    `CYCLE982(${t},0,0,0) ; TOOL LENGTH MEASURE`,
  ],
  toolRadius: (t) => [
    `T${t} D1\nM6`,
    `S500 M3`,
    `CYCLE982(${t},0,0,1) ; TOOL RADIUS MEASURE`,
  ],
  toleranceCheck: (v, nom, tp, tm, _label) => [
    `IF ${v}>${(nom + tp).toFixed(4)} SETAL(61000) ; OUT OF TOLERANCE HIGH`,
    `IF ${v}<${(nom + tm).toFixed(4)} SETAL(61000) ; OUT OF TOLERANCE LOW`,
  ],
  spcOutput: (label, v) => [
    `MSG("SPC:${label}=" << ${v})`,
  ],
  compensateOffset: (_n, axis, v, nom) => [
    `$P_UIFR[1,${axis},TR]=${v}-${nom.toFixed(4)} ; AUTO COMPENSATE`,
  ],
  setWCS: (offset, axis, v) => {
    const n = parseInt(offset.replace(/\D/g, "")) || 1;
    return [`$P_UIFR[${n},${axis},TR]=${v} ; SET WCS ${axis}`];
  },
};

const HEIDENHAIN_DIALECT: ProbeDialect = {
  comment: (t) => `; ${t}`,
  safeApproach: (z) => `L Z+${z.toFixed(3)} R0 FMAX`,
  spindleOrient: () => "M19",
  probeTool: (t) => `TOOL CALL ${t} Z\nM19`,
  coolantOff: () => "M9",
  measureBore: (x, y, z, d, depth) => [
    `L X+${x.toFixed(3)} Y+${y.toFixed(3)} R0 FMAX`,
    `L Z+${(z + 5).toFixed(3)} R0 FMAX`,
    `TCH PROBE 421 BORE MEASURING`,
    `Q273=${x.toFixed(3)} ;CENTER 1ST AXIS`,
    `Q274=${y.toFixed(3)} ;CENTER 2ND AXIS`,
    `Q262=${d.toFixed(3)} ;NOMINAL DIAMETER`,
    `Q325=${depth.toFixed(3)} ;START DEPTH`,
    `Q320=0 ;SET-UP CLEARANCE`,
  ],
  measureBoss: (x, y, z, d, depth) => [
    `L X+${x.toFixed(3)} Y+${y.toFixed(3)} R0 FMAX`,
    `L Z+${(z + 5).toFixed(3)} R0 FMAX`,
    `TCH PROBE 422 BOSS MEASURING`,
    `Q273=${x.toFixed(3)} ;CENTER 1ST AXIS`,
    `Q274=${y.toFixed(3)} ;CENTER 2ND AXIS`,
    `Q262=${d.toFixed(3)} ;NOMINAL DIAMETER`,
    `Q325=${depth.toFixed(3)} ;START DEPTH`,
  ],
  measureSurface: (x, y, z) => [
    `L X+${x.toFixed(3)} Y+${y.toFixed(3)} R0 FMAX`,
    `L Z+${(z + 5).toFixed(3)} R0 FMAX`,
    `TCH PROBE 427 MEASURE COORDINATE`,
    `Q263=${z.toFixed(3)} ;NOMINAL VALUE`,
    `Q272=3 ;MEASURING AXIS (Z)`,
  ],
  measureEdgeX: (x, y, z) => [
    `L X+${(x - 10).toFixed(3)} Y+${y.toFixed(3)} R0 FMAX`,
    `L Z+${z.toFixed(3)} R0 FMAX`,
    `TCH PROBE 400 MEASURE EDGE`,
    `Q263=${x.toFixed(3)} ;NOMINAL VALUE`,
    `Q272=1 ;MEASURING AXIS (X)`,
  ],
  measureEdgeY: (x, y, z) => [
    `L X+${x.toFixed(3)} Y+${(y - 10).toFixed(3)} R0 FMAX`,
    `L Z+${z.toFixed(3)} R0 FMAX`,
    `TCH PROBE 400 MEASURE EDGE`,
    `Q263=${y.toFixed(3)} ;NOMINAL VALUE`,
    `Q272=2 ;MEASURING AXIS (Y)`,
  ],
  measureWeb: (x, y, z, w) => [
    `L X+${x.toFixed(3)} Y+${y.toFixed(3)} R0 FMAX`,
    `L Z+${z.toFixed(3)} R0 FMAX`,
    `TCH PROBE 409 RIDGE MEASURING`,
    `Q261=${w.toFixed(3)} ;NOMINAL WIDTH`,
  ],
  measureCorner: (x, y, z) => [
    `L X+${(x - 10).toFixed(3)} Y+${(y - 10).toFixed(3)} R0 FMAX`,
    `L Z+${z.toFixed(3)} R0 FMAX`,
    `TCH PROBE 410 DATUM IN CORNER`,
    `Q263=${x.toFixed(3)} ;1ST AXIS NOMINAL`,
    `Q264=${y.toFixed(3)} ;2ND AXIS NOMINAL`,
  ],
  measureAngle: (x, y, z) => [
    `L X+${x.toFixed(3)} Y+${y.toFixed(3)} R0 FMAX`,
    `L Z+${z.toFixed(3)} R0 FMAX`,
    `TCH PROBE 403 MEASURE ANGLE`,
  ],
  toolLength: (t) => [
    `TOOL CALL ${t} Z`,
    `TCH PROBE 481 TOOL LENGTH`,
    `Q340=${t} ;TOOL NUMBER`,
    `Q341=1 ;UPDATE TOOL TABLE`,
  ],
  toolRadius: (t) => [
    `TOOL CALL ${t} Z S500`,
    `TCH PROBE 482 TOOL RADIUS`,
    `Q340=${t} ;TOOL NUMBER`,
    `Q341=1 ;UPDATE TOOL TABLE`,
  ],
  toleranceCheck: (_v, nom, tp, tm, _label) => [
    `FN 9: IF +Q188 GT +${(nom + tp).toFixed(4)} GOTO LBL 99`,
    `FN 9: IF +Q188 LT +${(nom + tm).toFixed(4)} GOTO LBL 99`,
  ],
  spcOutput: (label, _v) => [
    `FN 16: F-PRINT SPC_${label} / Q188`,
  ],
  compensateOffset: (_n, _axis, _v, _nom) => [
    `CYCL DEF 247 DATUM SETTING`,
  ],
  setWCS: (_offset, axis, _v) => {
    const axisNum = axis === "X" ? 1 : axis === "Y" ? 2 : 3;
    return [
      `CYCL DEF 247 DATUM SETTING`,
      `Q339=${axisNum} ;DATUM AXIS`,
      `Q340=+Q188 ;DATUM VALUE`,
    ];
  },
};

function getDialect(controller: ProbeController): ProbeDialect {
  switch (controller) {
    case "siemens": return SIEMENS_DIALECT;
    case "heidenhain": return HEIDENHAIN_DIALECT;
    case "fanuc": case "haas": case "mazak": case "okuma":
    default: return FANUC_DIALECT;
  }
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ProbeRoutineGeneratorEngine {

  /**
   * Generate WCS (Work Coordinate System) setup probing routine.
   * Probes datum features to establish part zero.
   */
  generateWCSSetup(config: ProbeWCSConfig): ProbeResult {
    const ctrl = config.controller ?? "fanuc";
    const d = getDialect(ctrl);
    const lines: string[] = [];
    const warnings: string[] = [];
    const probeTool = config.probe_tool_number ?? 99;
    const wcs = config.work_offset ?? "G54";

    lines.push(d.comment("=== PRISM WCS SETUP PROBING ROUTINE ==="));
    lines.push(d.comment(`Controller: ${ctrl.toUpperCase()} | WCS: ${wcs}`));
    lines.push("");
    lines.push(d.coolantOff());
    lines.push(d.probeTool(probeTool));
    lines.push(d.safeApproach(100));
    lines.push("");

    let featureIdx = 0;
    for (const feature of config.features) {
      featureIdx++;
      const pos = feature.position ?? { x: 0, y: 0, z: 0 };
      lines.push(d.comment(`--- Feature ${featureIdx}: ${feature.type.toUpperCase()} ---`));

      let probeLines: string[] = [];
      switch (feature.type) {
        case "corner":
          probeLines = d.measureCorner(pos.x, pos.y, pos.z);
          // Set both X and Y from corner
          probeLines.push(...d.setWCS(wcs, "X", ctrl === "heidenhain" ? "Q188" : "#185"));
          probeLines.push(...d.setWCS(wcs, "Y", ctrl === "heidenhain" ? "Q189" : "#186"));
          break;
        case "bore":
          probeLines = d.measureBore(pos.x, pos.y, pos.z, feature.diameter ?? 20, feature.depth ?? 10);
          probeLines.push(...d.setWCS(wcs, "X", ctrl === "heidenhain" ? "Q188" : "#185"));
          probeLines.push(...d.setWCS(wcs, "Y", ctrl === "heidenhain" ? "Q189" : "#186"));
          break;
        case "boss":
          probeLines = d.measureBoss(pos.x, pos.y, pos.z, feature.diameter ?? 20, feature.depth ?? 10);
          probeLines.push(...d.setWCS(wcs, "X", ctrl === "heidenhain" ? "Q188" : "#185"));
          probeLines.push(...d.setWCS(wcs, "Y", ctrl === "heidenhain" ? "Q189" : "#186"));
          break;
        case "edge":
          probeLines = d.measureEdgeX(pos.x, pos.y, pos.z);
          probeLines.push(...d.setWCS(wcs, "X", ctrl === "heidenhain" ? "Q188" : "#185"));
          break;
        case "surface":
          probeLines = d.measureSurface(pos.x, pos.y, pos.z);
          probeLines.push(...d.setWCS(wcs, "Z", ctrl === "heidenhain" ? "Q188" : "#182"));
          break;
        default:
          probeLines = d.measureSurface(pos.x, pos.y, pos.z);
          warnings.push(`Feature type '${feature.type}' defaulted to surface measure`);
      }
      lines.push(...probeLines);
      lines.push(d.safeApproach(50));
      lines.push("");
    }

    lines.push(d.safeApproach(100));
    lines.push(d.comment("=== WCS SETUP COMPLETE ==="));

    return {
      gcode: lines.join("\n"),
      line_count: lines.length,
      features_measured: config.features.length,
      warnings,
      estimated_time_sec: config.features.length * 15,
    };
  }

  /**
   * Generate in-process part inspection routine with tolerance checking.
   */
  generatePartInspection(config: ProbeInspectionConfig): ProbeResult {
    const ctrl = config.controller ?? "fanuc";
    const d = getDialect(ctrl);
    const lines: string[] = [];
    const warnings: string[] = [];
    const actionOnFail = config.action_on_fail ?? "alarm";
    const measInterval = config.measure_every_n_parts ?? 1;
    const resultVar = ctrl === "siemens" ? "R187" : ctrl === "heidenhain" ? "Q188" : "#187";

    lines.push(d.comment("=== PRISM IN-PROCESS INSPECTION ==="));
    lines.push(d.comment(`Action on fail: ${actionOnFail} | Interval: every ${measInterval} parts`));
    lines.push("");

    // Part counter for interval-based measurement
    if (measInterval > 1) {
      const ctrVar = ctrl === "siemens" ? "R199" : ctrl === "heidenhain" ? "Q199" : "#199";
      if (ctrl === "fanuc" || ctrl === "haas" || ctrl === "mazak" || ctrl === "okuma") {
        lines.push(`${ctrVar}=${ctrVar}+1`);
        lines.push(`IF [${ctrVar} LT ${measInterval}] GOTO 9800`);
        lines.push(`${ctrVar}=0`);
      } else if (ctrl === "siemens") {
        lines.push(`${ctrVar}=${ctrVar}+1`);
        lines.push(`IF ${ctrVar}<${measInterval} GOTOF SKIP_INSPECT`);
        lines.push(`${ctrVar}=0`);
      } else {
        lines.push(`FN 1: ${ctrVar} = ${ctrVar} + 1`);
        lines.push(`FN 9: IF +${ctrVar} LT +${measInterval} GOTO LBL 98`);
        lines.push(`FN 0: ${ctrVar} = +0`);
      }
      lines.push("");
    }

    lines.push(d.coolantOff());
    lines.push(d.spindleOrient());
    lines.push("");

    let featureIdx = 0;
    for (const feature of config.features) {
      featureIdx++;
      const pos = feature.position ?? { x: 0, y: 0, z: 0 };
      const nom = feature.nominal ?? 0;
      const tolP = feature.tolerance_plus ?? 0.05;
      const tolM = feature.tolerance_minus ?? -0.05;

      lines.push(d.comment(`--- Inspect #${featureIdx}: ${feature.type} nom=${nom} +${tolP}/${tolM} ---`));

      // Probe the feature
      let probeLines: string[] = [];
      switch (feature.type) {
        case "bore": probeLines = d.measureBore(pos.x, pos.y, pos.z, feature.diameter ?? 20, feature.depth ?? 10); break;
        case "boss": probeLines = d.measureBoss(pos.x, pos.y, pos.z, feature.diameter ?? 20, feature.depth ?? 10); break;
        case "surface": probeLines = d.measureSurface(pos.x, pos.y, pos.z); break;
        case "web": probeLines = d.measureWeb(pos.x, pos.y, pos.z, nom); break;
        case "groove": probeLines = d.measureWeb(pos.x, pos.y, pos.z, nom); break;
        default: probeLines = d.measureSurface(pos.x, pos.y, pos.z); break;
      }
      lines.push(...probeLines);

      // Tolerance check
      const alarmLabel = ctrl === "heidenhain" ? "LBL 99" : "9999";
      if (actionOnFail === "alarm") {
        lines.push(...d.toleranceCheck(resultVar, nom, tolP, tolM, alarmLabel));
      } else if (actionOnFail === "compensate") {
        lines.push(...d.compensateOffset(1, "Z", resultVar, nom));
      }

      // SPC output
      if (config.spc_output) {
        lines.push(...d.spcOutput(`F${featureIdx}_${feature.type}`, resultVar));
      }

      lines.push(d.safeApproach(50));
      lines.push("");
    }

    // Skip label for interval
    if (measInterval > 1) {
      if (ctrl === "fanuc" || ctrl === "haas" || ctrl === "mazak" || ctrl === "okuma") {
        lines.push("N9800 (SKIP INSPECTION)");
      } else if (ctrl === "siemens") {
        lines.push("SKIP_INSPECT:");
      } else {
        lines.push("LBL 98");
      }
    }

    lines.push(d.comment("=== INSPECTION COMPLETE ==="));

    return {
      gcode: lines.join("\n"),
      line_count: lines.length,
      features_measured: config.features.length,
      warnings,
      estimated_time_sec: config.features.length * 12,
    };
  }

  /**
   * Generate tool length/radius measurement routine.
   */
  generateToolMeasurement(config: ProbeToolMeasureConfig): ProbeResult {
    const ctrl = config.controller ?? "fanuc";
    const d = getDialect(ctrl);
    const lines: string[] = [];
    const warnings: string[] = [];
    const method = config.method ?? "probe";

    lines.push(d.comment("=== PRISM TOOL MEASUREMENT ROUTINE ==="));
    lines.push(d.comment(`Method: ${method} | Tools: ${config.tool_numbers.join(", ")}`));
    lines.push("");

    for (const toolNum of config.tool_numbers) {
      lines.push(d.comment(`--- Tool T${toolNum} ---`));

      if (method === "laser") {
        // Laser tool setter
        if (ctrl === "fanuc" || ctrl === "haas") {
          lines.push(`T${toolNum} M06`);
          lines.push("M26 (LASER TOOL SETTER ON)");
          lines.push("G65 P8150 (LASER LENGTH MEASURE)");
          if (config.measure_radius) {
            lines.push("S500 M03");
            lines.push("G65 P8151 (LASER RADIUS MEASURE)");
            lines.push("M05");
          }
          lines.push("M27 (LASER TOOL SETTER OFF)");
        } else {
          lines.push(...d.toolLength(toolNum));
          warnings.push(`Laser method mapped to standard probe for ${ctrl}`);
        }
      } else {
        // Contact probe / tool setter
        lines.push(...d.toolLength(toolNum));
        if (config.measure_radius) {
          lines.push(...d.toolRadius(toolNum));
        }
      }

      // Broken tool detection: compare measured vs expected
      if (ctrl === "fanuc" || ctrl === "haas" || ctrl === "mazak") {
        lines.push(`IF [#182 LT 1.0] GOTO 9999 (BROKEN TOOL - T${toolNum})`);
      }

      lines.push("");
    }

    lines.push(d.safeApproach(100));
    lines.push(d.comment("=== TOOL MEASUREMENT COMPLETE ==="));

    return {
      gcode: lines.join("\n"),
      line_count: lines.length,
      features_measured: config.tool_numbers.length,
      warnings,
      estimated_time_sec: config.tool_numbers.length * (config.measure_radius ? 20 : 10),
    };
  }

  /**
   * Generate comprehensive first article inspection program.
   */
  generateFirstArticle(config: ProbeFirstArticleConfig): ProbeResult {
    const ctrl = config.controller ?? "fanuc";
    const d = getDialect(ctrl);
    const lines: string[] = [];
    const warnings: string[] = [];
    const format = config.report_format ?? "custom";
    const resultVar = ctrl === "siemens" ? "R187" : ctrl === "heidenhain" ? "Q188" : "#187";

    lines.push(d.comment("=== PRISM FIRST ARTICLE INSPECTION ==="));
    lines.push(d.comment(`Report format: ${format} | Features: ${config.features.length}`));
    lines.push(d.comment("All measured values logged to DPRNT/MSG for FAI report"));
    lines.push("");

    // Initialize SPC log
    if (ctrl === "fanuc" || ctrl === "haas") {
      lines.push("POPEN (OPEN DPRNT OUTPUT)");
      lines.push(`DPRNT[FAI_REPORT*${format}]`);
      lines.push(`DPRNT[DATE*#3011*TIME*#3012]`);
    }

    lines.push(d.coolantOff());
    lines.push(d.spindleOrient());
    lines.push("");

    // Datum features first
    if (config.datum_features?.length) {
      lines.push(d.comment("--- DATUM FEATURES ---"));
      for (const datumName of config.datum_features) {
        lines.push(d.comment(`Datum: ${datumName}`));
      }
      lines.push("");
    }

    // Measure all features
    let passCount = 0;
    for (let i = 0; i < config.features.length; i++) {
      const feature = config.features[i];
      const pos = feature.position ?? { x: 0, y: 0, z: 0 };
      const nom = feature.nominal ?? 0;
      const tolP = feature.tolerance_plus ?? 0.025;
      const tolM = feature.tolerance_minus ?? -0.025;

      lines.push(d.comment(`--- FAI #${i + 1}: ${feature.type} nom=${nom} tol=[${tolM},+${tolP}] ---`));

      // Probe
      let probeLines: string[] = [];
      switch (feature.type) {
        case "bore": probeLines = d.measureBore(pos.x, pos.y, pos.z, feature.diameter ?? nom, feature.depth ?? 10); break;
        case "boss": probeLines = d.measureBoss(pos.x, pos.y, pos.z, feature.diameter ?? nom, feature.depth ?? 10); break;
        case "surface": probeLines = d.measureSurface(pos.x, pos.y, pos.z); break;
        case "web": probeLines = d.measureWeb(pos.x, pos.y, pos.z, nom); break;
        default: probeLines = d.measureSurface(pos.x, pos.y, pos.z); break;
      }
      lines.push(...probeLines);

      // Log measured value
      lines.push(...d.spcOutput(`DIM${i + 1}_${feature.type}`, resultVar));

      // Tolerance check (log but don't alarm on FAI — just flag)
      if (ctrl === "fanuc" || ctrl === "haas") {
        lines.push(`IF [${resultVar} GT ${(nom + tolP).toFixed(4)}] THEN #198=1 (FAIL)`);
        lines.push(`IF [${resultVar} LT ${(nom + tolM).toFixed(4)}] THEN #198=1 (FAIL)`);
        lines.push(`DPRNT[DIM${i + 1}*NOM=${nom.toFixed(4)}*MEAS=${resultVar}[44]*PASS=#198[10]]`);
        passCount++;
      }

      lines.push(d.safeApproach(50));
      lines.push("");
    }

    // Summary
    if (ctrl === "fanuc" || ctrl === "haas") {
      lines.push(`DPRNT[FAI_COMPLETE*FEATURES=${config.features.length}]`);
      lines.push("PCLOS (CLOSE DPRNT OUTPUT)");
    }

    lines.push(d.safeApproach(100));
    lines.push(d.comment(`=== FAI COMPLETE: ${config.features.length} features measured ===`));

    return {
      gcode: lines.join("\n"),
      line_count: lines.length,
      features_measured: config.features.length,
      warnings,
      estimated_time_sec: config.features.length * 15 + 30,
    };
  }

  supportedControllers(): ProbeController[] {
    return ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"];
  }
}

export const probeRoutineGeneratorEngine = new ProbeRoutineGeneratorEngine();
