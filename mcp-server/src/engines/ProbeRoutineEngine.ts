/**
 * PRISM MCP Server - Probe Routine Engine
 *
 * Auto-generates Renishaw-style touch probe macros for CNC machines.
 * NOVEL: No CAM post-processor generates probe routines from part geometry.
 *
 * Supported controllers (6):
 *   Fanuc, Haas      — G65 P98xx macro calls, DPRNT output
 *   Siemens 840D     — CYCLE977/978/982, MSG output
 *   Heidenhain TNC   — TCH PROBE xxx, Q-parameter storage
 *   Mazak            — G65 P98xx (Fanuc-compatible), DPRNT output
 *   Okuma            — G65 P98xx (Fanuc-compatible), DPRNT output
 *
 * Probe macro reference (Renishaw):
 *   G65 P9811 — Protected positioning (Fanuc/Haas/Mazak/Okuma)
 *   G65 P9812 — Single surface measure X
 *   G65 P9813 — Single surface measure Y
 *   G65 P9814 — Single surface measure Z
 *   G65 P9815 — Internal bore (3-point)
 *   G65 P9816 — External boss (3-point)
 *   G65 P9817 — Internal web measure
 *   G65 P9818 — External web measure
 *   G65 P9819 — Internal corner
 *   G65 P9823 — Tool length measurement
 *   G65 P9825 — Tool diameter measurement
 *   G65 P9832 — Bore + WCS update
 *   G65 P9833 — Boss + WCS update
 *   G65 P9834 — Corner pocket + WCS update
 *   G65 P9843 — Angular measurement
 *   CYCLE977  — Siemens bore/boss probing
 *   CYCLE978  — Siemens slot/web probing
 *   CYCLE982  — Siemens tool measurement
 *   TCH PROBE 420 — Heidenhain bore
 *   TCH PROBE 421 — Heidenhain boss
 *   TCH PROBE 427 — Heidenhain corner
 *   TCH PROBE 430 — Heidenhain web
 *   TCH PROBE 444 — Heidenhain surface
 *   TCH PROBE 480 — Heidenhain tool length
 *   TCH PROBE 481 — Heidenhain tool radius
 *   TCH PROBE 0   — Heidenhain datum setting
 *
 * Exported API:
 *   generateWCSSetup(config)          -> ProbeResult
 *   generatePartInspection(config)    -> ProbeResult
 *   generateToolMeasurement(config)   -> ProbeResult
 *   generateFirstArticle(config)      -> ProbeResult
 *   supportedControllers()            -> ControllerType[]
 *
 * No external imports — pure computation.
 */

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/** Supported CNC controller families. */
export type ControllerType =
  | "fanuc"
  | "haas"
  | "siemens"
  | "heidenhain"
  | "mazak"
  | "okuma";

/** Feature types for WCS setup probing. */
export type WCSFeatureType = "corner" | "bore" | "boss" | "edge" | "web";

/** Feature types for part inspection. */
export type InspectionFeatureType =
  | "bore"
  | "boss"
  | "surface"
  | "web"
  | "groove"
  | "angle";

/** 3D position. */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/** WCS probing feature definition. */
export interface WCSFeature {
  type: WCSFeatureType;
  position: Position3D;
  diameter?: number;
  depth?: number;
}

/** Inspection feature definition. */
export interface InspectionFeature {
  type: InspectionFeatureType;
  nominal: number;
  tolerance_plus: number;
  tolerance_minus: number;
  position: Position3D;
  diameter?: number;
  depth?: number;
  label?: string;
}

/** First article feature definition. */
export interface FAIFeature {
  type: InspectionFeatureType;
  nominal: number;
  tolerance_plus: number;
  tolerance_minus: number;
  position: Position3D;
  diameter?: number;
  depth?: number;
  label?: string;
  balloon_number?: number;
  critical?: boolean;
}

/** Action when inspection fails tolerance. */
export type FailAction = "alarm" | "compensate" | "skip";

/** Tool measurement method. */
export type MeasurementMethod = "probe" | "laser" | "contact";

/** Report format for first article inspection. */
export type ReportFormat = "AS9102" | "PPAP" | "custom";

/** Work coordinate offset specifier. */
export type WorkOffset = "G54" | "G54.1" | "G55" | "G56" | "G57" | "G58" | "G59";

// ---- Configuration interfaces ----

/** Config for WCS setup probing. */
export interface WCSSetupConfig {
  controller: ControllerType;
  probe_tool_number: number;
  features: WCSFeature[];
  work_offset: WorkOffset;
  approach_distance?: number;
  feed_rate?: number;
  retract_height?: number;
}

/** Config for part inspection probing. */
export interface PartInspectionConfig {
  controller: ControllerType;
  features: InspectionFeature[];
  action_on_fail: FailAction;
  spc_output?: boolean;
  probe_tool_number?: number;
  retract_height?: number;
}

/** Config for tool measurement. */
export interface ToolMeasurementConfig {
  controller: ControllerType;
  tool_numbers: number[];
  method: MeasurementMethod;
  measure_radius?: boolean;
  spindle_orient?: number;
}

/** Config for first article inspection. */
export interface FirstArticleConfig {
  controller: ControllerType;
  features: FAIFeature[];
  datum_features: FAIFeature[];
  report_format: ReportFormat;
  probe_tool_number?: number;
  retract_height?: number;
  part_number?: string;
  revision?: string;
}

/** Result returned by all probe routine generators. */
export interface ProbeResult {
  gcode: string;
  line_count: number;
  features_measured: number;
  warnings: string[];
  estimated_time_sec: number;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/** Whether controller uses Fanuc-style G65 macro calls. */
function isFanucLike(ctrl: ControllerType): boolean {
  return ctrl === "fanuc" || ctrl === "haas" || ctrl === "mazak" || ctrl === "okuma";
}

/** Timing constants (seconds). */
const TOUCH_TIME_SEC = 8;
const MOVE_TIME_SEC = 3;
const TOOL_CHANGE_TIME_SEC = 15;

/** Format a number to 3 decimal places, strip trailing zeros. */
function fmt(n: number): string {
  return Number(n.toFixed(3)).toString();
}

/** Build a comment line for the given controller. */
function comment(ctrl: ControllerType, text: string): string {
  if (ctrl === "heidenhain" || ctrl === "siemens") {
    return `; ${text}`;
  }
  return `(${text})`;
}

/** Build safe-position block: rapid to retract height. */
function safeRetract(ctrl: ControllerType, zSafe: number): string {
  if (ctrl === "heidenhain") {
    return `L Z+${fmt(zSafe)} R0 FMAX M91`;
  }
  if (ctrl === "siemens") {
    return `G0 G90 Z${fmt(zSafe)}`;
  }
  return `G90 G0 Z${fmt(zSafe)}`;
}

/** Build spindle orient command (M19). */
function spindleOrient(ctrl: ControllerType, angle: number = 0): string {
  if (ctrl === "heidenhain") {
    return `M19`;
  }
  if (ctrl === "siemens") {
    return `SPOS=${fmt(angle)}`;
  }
  return `M19 R${fmt(angle)}`;
}

/** Build probe tool call sequence. */
function probeToolCall(ctrl: ControllerType, toolNum: number): string[] {
  const lines: string[] = [];
  if (ctrl === "heidenhain") {
    lines.push(`TOOL CALL ${toolNum} Z S0`);
  } else if (ctrl === "siemens") {
    lines.push(`T${toolNum} D1`);
    lines.push(`M6`);
  } else {
    lines.push(`T${toolNum} M6`);
  }
  lines.push(comment(ctrl, "PROBE TOOL LOADED - DO NOT SPIN SPINDLE"));
  lines.push(comment(ctrl, "Ensure probe is calibrated before use"));
  return lines;
}

/** Fanuc-style protected positioning macro. */
function protectedMove(
  ctrl: ControllerType, x: number, y: number, z: number, feed: number
): string[] {
  if (ctrl === "heidenhain") {
    return [
      `L X+${fmt(x)} Y+${fmt(y)} R0 FMAX`,
      `L Z+${fmt(z)} R0 F${fmt(feed)}`,
    ];
  }
  if (ctrl === "siemens") {
    return [
      `G0 X${fmt(x)} Y${fmt(y)}`,
      `G1 Z${fmt(z)} F${fmt(feed)}`,
    ];
  }
  return [`G65 P9811 X${fmt(x)} Y${fmt(y)} Z${fmt(z)} F${fmt(feed)}`];
}

/** Get DPRNT/MSG output line for SPC data. */
function spcOutputLine(
  ctrl: ControllerType, label: string, varRef: string
): string {
  if (ctrl === "heidenhain") {
    return `FN 16: F-PRINT TNC:\\PROBE\\${label}.A / ${varRef}`;
  }
  if (ctrl === "siemens") {
    return `MSG("${label}=" << ${varRef})`;
  }
  return `DPRNT[${label.padEnd(16)}${varRef}]`;
}

/** Variable reference for measured result by controller.
 *  Fanuc: #185-#189+, Siemens: R50+, Heidenhain: Q150+
 */
function measuredVar(ctrl: ControllerType, index: number): string {
  if (ctrl === "heidenhain") {
    return `Q${150 + index}`;
  }
  if (ctrl === "siemens") {
    return `R${50 + index}`;
  }
  return `#${185 + index}`;
}

/** Build tolerance check block with pass/fail branching. */
function toleranceCheck(
  ctrl: ControllerType, varRef: string,
  nominal: number, tolPlus: number, tolMinus: number,
  featureLabel: string, action: FailAction, alarmNum: number
): string[] {
  const lines: string[] = [];
  const upper = nominal + tolPlus;
  const lower = nominal - tolMinus;

  if (ctrl === "heidenhain") {
    lines.push(`FN 9: IF +${varRef} GT +${fmt(upper)} GOTO LBL ${alarmNum}`);
    lines.push(`FN 9: IF +${varRef} LT +${fmt(lower)} GOTO LBL ${alarmNum}`);
    lines.push(`FN 9: IF +0 EQU +0 GOTO LBL ${alarmNum + 100}`);
    lines.push(`LBL ${alarmNum}`);
    if (action === "alarm") {
      lines.push(`FN 14: ERROR = ${alarmNum} ; ${featureLabel} OUT OF TOLERANCE`);
    } else if (action === "compensate") {
      lines.push(`; Compensation: update offset for ${featureLabel}`);
    } else {
      lines.push(`; ${featureLabel} OUT OF TOLERANCE - SKIPPING`);
    }
    lines.push(`LBL ${alarmNum + 100}`);
  } else if (ctrl === "siemens") {
    lines.push(`IF ${varRef} > ${fmt(upper)} GOTOF _FAIL_${alarmNum}`);
    lines.push(`IF ${varRef} < ${fmt(lower)} GOTOF _FAIL_${alarmNum}`);
    lines.push(`GOTOF _PASS_${alarmNum}`);
    lines.push(`_FAIL_${alarmNum}:`);
    if (action === "alarm") {
      lines.push(`SETAL(${alarmNum}, "${featureLabel} OUT OF TOLERANCE")`);
      lines.push(`M0`);
    } else if (action === "compensate") {
      lines.push(`; Compensation: adjust offset for ${featureLabel}`);
    } else {
      lines.push(`; ${featureLabel} OUT OF TOLERANCE - SKIPPING`);
    }
    lines.push(`_PASS_${alarmNum}:`);
  } else {
    lines.push(`IF [${varRef} GT ${fmt(upper)}] GOTO ${alarmNum}`);
    lines.push(`IF [${varRef} LT ${fmt(lower)}] GOTO ${alarmNum}`);
    lines.push(`GOTO ${alarmNum + 100}`);
    lines.push(`N${alarmNum}`);
    if (action === "alarm") {
      lines.push(`#3000=${alarmNum} (${featureLabel} OUT OF TOLERANCE)`);
    } else if (action === "compensate") {
      lines.push(`(COMPENSATE ${featureLabel} - UPDATE OFFSET)`);
      lines.push(`#${10000 + alarmNum} = ${varRef} - ${fmt(nominal)}`);
    } else {
      lines.push(`(${featureLabel} OUT OF TOLERANCE - SKIPPED)`);
    }
    lines.push(`N${alarmNum + 100}`);
  }
  return lines;
}

/** Work offset number extraction for G10 commands. */
function workOffsetNum(wo: WorkOffset): number {
  const map: Record<string, number> = {
    "G54": 1, "G54.1": 1, "G55": 2, "G56": 3, "G57": 4, "G58": 5, "G59": 6,
  };
  return map[wo] ?? 1;
}

// ============================================================================
// PROBE ROUTINE ENGINE CLASS
// ============================================================================

/**
 * ProbeRoutineEngine generates controller-specific Renishaw touch probe
 * macros for WCS setup, part inspection, tool measurement, and FAI.
 *
 * All methods are pure computation with no side effects or external imports.
 */
export class ProbeRoutineEngine {

  // --------------------------------------------------------------------------
  // supportedControllers
  // --------------------------------------------------------------------------

  /** Returns list of all supported controller types. */
  supportedControllers(): ControllerType[] {
    return ["fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma"];
  }

  // --------------------------------------------------------------------------
  // generateWCSSetup
  // --------------------------------------------------------------------------

  /**
   * Generate Work Coordinate System setup probing routine.
   * Probes geometric features to establish the WCS origin on a new part setup.
   *
   * Uses real Renishaw macro numbers:
   *   - G65 P9815/P9832 for bore-based WCS (Fanuc/Haas)
   *   - G65 P9816/P9833 for boss-based WCS
   *   - G65 P9819/P9834 for corner-based WCS
   *   - CYCLE977 for Siemens bore/boss
   *   - TCH PROBE 420/421/427 for Heidenhain
   */
  generateWCSSetup(config: WCSSetupConfig): ProbeResult {
    const {
      controller: ctrl,
      probe_tool_number,
      features,
      work_offset,
      approach_distance = 10,
      feed_rate = 300,
      retract_height = 50,
    } = config;

    const warnings: string[] = [];
    const lines: string[] = [];

    if (features.length === 0) {
      warnings.push("No features specified for WCS setup");
      return { gcode: "", line_count: 0, features_measured: 0, warnings, estimated_time_sec: 0 };
    }

    // ---- Program header ----
    lines.push(comment(ctrl, "================================================"));
    lines.push(comment(ctrl, "PRISM PROBE ROUTINE - WCS SETUP"));
    lines.push(comment(ctrl, `Controller: ${ctrl.toUpperCase()}`));
    lines.push(comment(ctrl, `Work Offset: ${work_offset}`));
    lines.push(comment(ctrl, `Features: ${features.length}`));
    lines.push(comment(ctrl, `Approach Distance: ${approach_distance} mm`));
    lines.push(comment(ctrl, `Feed Rate: ${feed_rate} mm/min`));
    lines.push(comment(ctrl, "Generated by ProbeRoutineEngine"));
    lines.push(comment(ctrl, "================================================"));
    lines.push("");

    // ---- Safety preamble ----
    if (ctrl === "heidenhain") {
      lines.push(`BEGIN PGM WCS_SETUP MM`);
    } else if (ctrl === "siemens") {
      lines.push(`G90 G71 G17`);
      lines.push(`G40`);
    } else {
      lines.push(`G90 G21 G17`);
      lines.push(`G49 G40 G80`);
    }
    lines.push("");

    // ---- Tool call + spindle orient (DO NOT SPIN with probe) ----
    lines.push(...probeToolCall(ctrl, probe_tool_number));
    lines.push(spindleOrient(ctrl));
    lines.push("");

    // ---- Safe retract ----
    lines.push(safeRetract(ctrl, retract_height));
    lines.push("");

    // ---- Enable probe protection (broken probe detection) ----
    if (isFanucLike(ctrl)) {
      lines.push(`G65 P9832 A0. (ENABLE PROBE PROTECTION)`);
    } else if (ctrl === "siemens") {
      lines.push(`CYCLE982(1) ; Enable probe protection`);
    } else {
      lines.push(`; Probe protection enabled via machine parameter`);
    }
    lines.push("");

    // ---- Probe each feature ----
    for (let fi = 0; fi < features.length; fi++) {
      const feature = features[fi];
      lines.push(comment(ctrl, `--- Feature ${fi + 1}/${features.length}: ${feature.type.toUpperCase()} ---`));
      lines.push(comment(ctrl, `Position: X${fmt(feature.position.x)} Y${fmt(feature.position.y)} Z${fmt(feature.position.z)}`));
      if (feature.diameter) {
        lines.push(comment(ctrl, `Diameter: ${fmt(feature.diameter)} mm`));
      }

      // Rapid to safe Z then approach
      lines.push(safeRetract(ctrl, retract_height));
      lines.push(...protectedMove(ctrl, feature.position.x, feature.position.y, feature.position.z + approach_distance, feed_rate));

      switch (feature.type) {
        case "bore":
          this._wcsProbe_bore(ctrl, feature, work_offset, approach_distance, feed_rate, lines, warnings);
          break;
        case "boss":
          this._wcsProbe_boss(ctrl, feature, work_offset, approach_distance, feed_rate, lines, warnings);
          break;
        case "corner":
          this._wcsProbe_corner(ctrl, feature, work_offset, approach_distance, feed_rate, lines, warnings);
          break;
        case "edge":
          this._wcsProbe_edge(ctrl, feature, work_offset, approach_distance, feed_rate, lines, warnings);
          break;
        case "web":
          this._wcsProbe_web(ctrl, feature, work_offset, approach_distance, feed_rate, lines, warnings);
          break;
      }

      lines.push(safeRetract(ctrl, retract_height));
      lines.push("");
    }

    // ---- Disable probe protection ----
    if (isFanucLike(ctrl)) {
      lines.push(`G65 P9832 A1. (DISABLE PROBE PROTECTION)`);
    }
    lines.push("");

    // ---- Program end ----
    lines.push(safeRetract(ctrl, retract_height));
    if (ctrl === "heidenhain") {
      lines.push(`END PGM WCS_SETUP MM`);
    } else {
      lines.push(`M30`);
    }

    const gcode = lines.join("\n");
    return {
      gcode,
      line_count: lines.length,
      features_measured: features.length,
      warnings,
      estimated_time_sec: TOOL_CHANGE_TIME_SEC + features.length * (MOVE_TIME_SEC * 2 + TOUCH_TIME_SEC * 3),
    };
  }

  /** WCS bore probe: 3-point internal measurement + WCS update. */
  private _wcsProbe_bore(
    ctrl: ControllerType, feat: WCSFeature, wo: WorkOffset,
    approach: number, feed: number, lines: string[], warnings: string[]
  ): void {
    const dia = feat.diameter ?? 25;
    const depth = feat.depth ?? -10;

    if (dia < 6) {
      warnings.push(`Bore dia ${dia}mm at X${fmt(feat.position.x)} Y${fmt(feat.position.y)} may be too small for standard 6mm probe stylus`);
    }

    if (ctrl === "heidenhain") {
      lines.push(`TCH PROBE 420 MEASURE BORE`);
      lines.push(`  Q260=${fmt(feat.position.x)}  ; CENTER 1ST AXIS`);
      lines.push(`  Q261=${fmt(feat.position.y)}  ; CENTER 2ND AXIS`);
      lines.push(`  Q262=${fmt(dia)}               ; NOMINAL DIAMETER`);
      lines.push(`  Q325=${fmt(feat.position.z + depth)} ; PROBE DEPTH`);
      lines.push(`  Q247=${fmt(approach)}           ; APPROACH DISTANCE`);
      lines.push(`  Q281=1                         ; MEASURE DATUM`);
      lines.push(`  Q282=1                         ; SET PRESET`);
      lines.push(`; Results: Q150=measured dia, Q151=X center, Q152=Y center`);
    } else if (ctrl === "siemens") {
      lines.push(`CYCLE977(${fmt(dia)},0,0,${fmt(feat.position.z + depth)},0,${fmt(approach)},${fmt(feed)},1,1,0,0,0,0) ; BORE PROBE`);
      lines.push(`; Results: R160=X center, R161=Y center, R162=measured diameter`);
      lines.push(`$P_UIFR[${workOffsetNum(wo)},X,TR] = $P_UIFR[${workOffsetNum(wo)},X,TR] + ($AA_MW[X]) ; Update ${wo} X`);
      lines.push(`$P_UIFR[${workOffsetNum(wo)},Y,TR] = $P_UIFR[${workOffsetNum(wo)},Y,TR] + ($AA_MW[Y]) ; Update ${wo} Y`);
    } else {
      lines.push(`G65 P9815 D${fmt(dia)} Z${fmt(feat.position.z + depth)} F${fmt(feed)} (BORE PROBE 3-POINT)`);
      lines.push(`(RESULTS: #185=X CENTER  #186=Y CENTER  #187=MEASURED DIA)`);
      lines.push(`G65 P9832 W${wo.replace("G", "")}. A0. (UPDATE ${wo} FROM BORE CENTER)`);
    }
  }

  /** WCS boss probe: 3-point external measurement + WCS update. */
  private _wcsProbe_boss(
    ctrl: ControllerType, feat: WCSFeature, wo: WorkOffset,
    approach: number, feed: number, lines: string[], warnings: string[]
  ): void {
    const dia = feat.diameter ?? 25;

    if (ctrl === "heidenhain") {
      lines.push(`TCH PROBE 421 MEASURE BOSS`);
      lines.push(`  Q260=${fmt(feat.position.x)}  ; CENTER 1ST AXIS`);
      lines.push(`  Q261=${fmt(feat.position.y)}  ; CENTER 2ND AXIS`);
      lines.push(`  Q262=${fmt(dia)}               ; NOMINAL DIAMETER`);
      lines.push(`  Q325=${fmt(feat.position.z)}   ; START HEIGHT`);
      lines.push(`  Q247=${fmt(approach)}           ; APPROACH DISTANCE`);
      lines.push(`  Q281=1                         ; MEASURE DATUM`);
      lines.push(`  Q282=1                         ; SET PRESET`);
      lines.push(`; Results: Q150=measured dia, Q151=X center, Q152=Y center`);
    } else if (ctrl === "siemens") {
      lines.push(`CYCLE977(${fmt(dia)},0,0,${fmt(feat.position.z)},0,${fmt(approach)},${fmt(feed)},1,2,0,0,0,0) ; BOSS PROBE`);
      lines.push(`; Results: R160=X center, R161=Y center, R162=measured diameter`);
      lines.push(`$P_UIFR[${workOffsetNum(wo)},X,TR] = $P_UIFR[${workOffsetNum(wo)},X,TR] + ($AA_MW[X]) ; Update ${wo} X`);
      lines.push(`$P_UIFR[${workOffsetNum(wo)},Y,TR] = $P_UIFR[${workOffsetNum(wo)},Y,TR] + ($AA_MW[Y]) ; Update ${wo} Y`);
    } else {
      lines.push(`G65 P9816 D${fmt(dia)} Z${fmt(feat.position.z)} F${fmt(feed)} (BOSS PROBE 3-POINT)`);
      lines.push(`(RESULTS: #185=X CENTER  #186=Y CENTER  #187=MEASURED DIA)`);
      lines.push(`G65 P9833 W${wo.replace("G", "")}. A0. (UPDATE ${wo} FROM BOSS CENTER)`);
    }
  }

  /** WCS corner probe: two-surface intersection + WCS update. */
  private _wcsProbe_corner(
    ctrl: ControllerType, feat: WCSFeature, wo: WorkOffset,
    approach: number, feed: number, lines: string[], warnings: string[]
  ): void {
    if (ctrl === "heidenhain") {
      lines.push(`TCH PROBE 427 MEASURE CORNER`);
      lines.push(`  Q260=${fmt(feat.position.x)}  ; 1ST CORNER POINT X`);
      lines.push(`  Q261=${fmt(feat.position.y)}  ; 1ST CORNER POINT Y`);
      lines.push(`  Q305=1                        ; CORNER NUMBER (1=+X+Y 2=-X+Y 3=-X-Y 4=+X-Y)`);
      lines.push(`  Q325=${fmt(feat.position.z)}  ; START HEIGHT`);
      lines.push(`  Q247=${fmt(approach)}          ; APPROACH DISTANCE`);
      lines.push(`  Q281=1                        ; MEASURE DATUM`);
      lines.push(`  Q282=1                        ; SET PRESET`);
      lines.push(`; Results: Q151=X corner, Q152=Y corner`);
    } else if (ctrl === "siemens") {
      lines.push(`CYCLE961(${fmt(feat.position.x)},${fmt(feat.position.y)},${fmt(feat.position.z)},${fmt(approach)},${fmt(feed)},0,1,1,0) ; CORNER PROBE`);
      lines.push(`; Results: R160=X corner, R161=Y corner`);
      lines.push(`$P_UIFR[${workOffsetNum(wo)},X,TR] = $P_UIFR[${workOffsetNum(wo)},X,TR] + ($AA_MW[X])`);
      lines.push(`$P_UIFR[${workOffsetNum(wo)},Y,TR] = $P_UIFR[${workOffsetNum(wo)},Y,TR] + ($AA_MW[Y])`);
    } else {
      lines.push(`G65 P9819 X${fmt(feat.position.x)} Y${fmt(feat.position.y)} Z${fmt(feat.position.z)} F${fmt(feed)} (CORNER PROBE)`);
      lines.push(`(RESULTS: #185=X CORNER  #186=Y CORNER)`);
      lines.push(`G65 P9834 W${wo.replace("G", "")}. A0. (UPDATE ${wo} FROM CORNER)`);
    }
  }

  /** WCS edge probe: single surface touch + WCS update. */
  private _wcsProbe_edge(
    ctrl: ControllerType, feat: WCSFeature, wo: WorkOffset,
    approach: number, feed: number, lines: string[], warnings: string[]
  ): void {
    if (ctrl === "heidenhain") {
      lines.push(`TCH PROBE 444 PROBING IN TS AXIS`);
      lines.push(`  Q263=${fmt(feat.position.x)}  ; 1ST POINT 1ST AXIS`);
      lines.push(`  Q264=${fmt(feat.position.y)}  ; 1ST POINT 2ND AXIS`);
      lines.push(`  Q294=90                       ; ROTATION ANGLE`);
      lines.push(`  Q325=${fmt(feat.position.z)}  ; START HEIGHT`);
      lines.push(`  Q247=${fmt(approach)}          ; APPROACH DISTANCE`);
      lines.push(`  Q281=1                        ; MEASURE DATUM`);
      lines.push(`  Q282=1                        ; SET PRESET`);
      lines.push(`; Result: Q160=measured position`);
    } else if (ctrl === "siemens") {
      lines.push(`CYCLE978(${fmt(feat.position.x)},${fmt(feat.position.y)},${fmt(feat.position.z)},${fmt(approach)},${fmt(feed)},1,0,0,0,0) ; EDGE PROBE`);
      lines.push(`; Result: R160=measured X position`);
      lines.push(`$P_UIFR[${workOffsetNum(wo)},X,TR] = $P_UIFR[${workOffsetNum(wo)},X,TR] + ($AA_MW[X])`);
    } else {
      lines.push(`G65 P9812 X${fmt(feat.position.x)} Z${fmt(feat.position.z)} F${fmt(feed)} (EDGE PROBE X-AXIS)`);
      lines.push(`(RESULT: #185=MEASURED X POSITION)`);
      lines.push(`G10 L2 P${workOffsetNum(wo)} X#185 (UPDATE ${wo} X FROM EDGE)`);
    }
  }

  /** WCS web probe: center-finding on external width + WCS update. */
  private _wcsProbe_web(
    ctrl: ControllerType, feat: WCSFeature, wo: WorkOffset,
    approach: number, feed: number, lines: string[], warnings: string[]
  ): void {
    const width = feat.diameter ?? 50;

    if (ctrl === "heidenhain") {
      lines.push(`TCH PROBE 430 MEASURE WEB`);
      lines.push(`  Q260=${fmt(feat.position.x)}  ; CENTER 1ST AXIS`);
      lines.push(`  Q261=${fmt(feat.position.y)}  ; CENTER 2ND AXIS`);
      lines.push(`  Q311=${fmt(width)}             ; NOMINAL WIDTH`);
      lines.push(`  Q272=0                        ; MEASURING AXIS (0=X 1=Y)`);
      lines.push(`  Q325=${fmt(feat.position.z)}  ; START HEIGHT`);
      lines.push(`  Q247=${fmt(approach)}          ; APPROACH DISTANCE`);
      lines.push(`  Q281=1                        ; MEASURE DATUM`);
      lines.push(`  Q282=1                        ; SET PRESET`);
      lines.push(`; Results: Q150=measured width, Q151=center position`);
    } else if (ctrl === "siemens") {
      lines.push(`CYCLE978(${fmt(width)},0,${fmt(feat.position.x)},${fmt(feat.position.y)},${fmt(feat.position.z)},${fmt(approach)},${fmt(feed)},2,0,0,0,0) ; WEB PROBE`);
      lines.push(`; Results: R160=center, R161=measured width`);
      lines.push(`$P_UIFR[${workOffsetNum(wo)},X,TR] = $P_UIFR[${workOffsetNum(wo)},X,TR] + ($AA_MW[X])`);
    } else {
      lines.push(`G65 P9818 X${fmt(feat.position.x)} D${fmt(width)} Z${fmt(feat.position.z)} F${fmt(feed)} (WEB MEASURE)`);
      lines.push(`(RESULTS: #185=X CENTER  #187=MEASURED WIDTH)`);
      lines.push(`G10 L2 P${workOffsetNum(wo)} X#185 (UPDATE ${wo} X FROM WEB CENTER)`);
    }
  }

  // --------------------------------------------------------------------------
  // generatePartInspection
  // --------------------------------------------------------------------------

  /**
   * Generate in-process part inspection routine with tolerance checking,
   * compensation logic, and optional SPC data output.
   *
   * Supports alarm, compensate, and skip actions on tolerance failure.
   * SPC output uses DPRNT (Fanuc/Haas), MSG (Siemens), FN 16 (Heidenhain).
   */
  generatePartInspection(config: PartInspectionConfig): ProbeResult {
    const {
      controller: ctrl,
      features,
      action_on_fail,
      spc_output = false,
      probe_tool_number = 99,
      retract_height = 50,
    } = config;

    const warnings: string[] = [];
    const lines: string[] = [];
    const feed = 300;

    if (features.length === 0) {
      warnings.push("No features specified for inspection");
      return { gcode: "", line_count: 0, features_measured: 0, warnings, estimated_time_sec: 0 };
    }

    // ---- Header ----
    lines.push(comment(ctrl, "================================================"));
    lines.push(comment(ctrl, "PRISM PROBE ROUTINE - PART INSPECTION"));
    lines.push(comment(ctrl, `Controller: ${ctrl.toUpperCase()}`));
    lines.push(comment(ctrl, `Features: ${features.length}`));
    lines.push(comment(ctrl, `On-Fail Action: ${action_on_fail.toUpperCase()}`));
    lines.push(comment(ctrl, `SPC Output: ${spc_output ? "YES" : "NO"}`));
    lines.push(comment(ctrl, "Generated by ProbeRoutineEngine"));
    lines.push(comment(ctrl, "================================================"));
    lines.push("");

    // ---- Safety preamble ----
    if (ctrl === "heidenhain") {
      lines.push(`BEGIN PGM INSPECTION MM`);
    } else if (ctrl === "siemens") {
      lines.push(`G90 G71 G17`);
      lines.push(`G40`);
    } else {
      lines.push(`G90 G21 G17`);
      lines.push(`G49 G40 G80`);
    }
    lines.push("");

    // ---- Tool call ----
    lines.push(...probeToolCall(ctrl, probe_tool_number));
    lines.push(spindleOrient(ctrl));
    lines.push(safeRetract(ctrl, retract_height));
    lines.push("");

    // ---- Open SPC data channel ----
    if (spc_output && isFanucLike(ctrl)) {
      lines.push(`POPEN`);
      lines.push(`DPRNT[--- INSPECTION START ---]`);
      lines.push(`DPRNT[DATE*#3011.*#3012]`);
      lines.push("");
    }
    if (spc_output && ctrl === "siemens") {
      lines.push(`MSG("--- INSPECTION START ---")`);
      lines.push("");
    }
    if (spc_output && ctrl === "heidenhain") {
      lines.push(`FN 16: F-PRINT TNC:\\PROBE\\INSP_LOG.A / "INSPECTION START"`);
      lines.push("");
    }

    // ---- Initialize pass/fail counters ----
    if (isFanucLike(ctrl)) {
      lines.push(`#500=0 (PASS COUNT)`);
      lines.push(`#501=0 (FAIL COUNT)`);
    } else if (ctrl === "siemens") {
      lines.push(`R200=0 ; PASS COUNT`);
      lines.push(`R201=0 ; FAIL COUNT`);
    } else {
      lines.push(`Q200 = 0 ; PASS COUNT`);
      lines.push(`Q201 = 0 ; FAIL COUNT`);
    }
    lines.push("");

    // ---- Probe each feature ----
    const alarmBase = 1000;
    for (let i = 0; i < features.length; i++) {
      const feat = features[i];
      const label = feat.label ?? `FEAT_${i + 1}_${feat.type.toUpperCase()}`;
      const varRef = measuredVar(ctrl, i);
      const alarmNum = alarmBase + i * 2;

      lines.push(comment(ctrl, `--- ${label}: ${feat.type} NOM=${fmt(feat.nominal)} +${fmt(feat.tolerance_plus)}/-${fmt(feat.tolerance_minus)} ---`));

      // Position to feature
      lines.push(safeRetract(ctrl, retract_height));
      lines.push(...protectedMove(ctrl, feat.position.x, feat.position.y, feat.position.z + 10, feed));

      // Probe by type
      this._inspectionProbe(ctrl, feat, varRef, feed, lines);
      lines.push("");

      // Tolerance check
      lines.push(...toleranceCheck(ctrl, varRef, feat.nominal, feat.tolerance_plus, feat.tolerance_minus, label, action_on_fail, alarmNum));

      // Update pass/fail counters
      const upper = feat.nominal + feat.tolerance_plus;
      const lower = feat.nominal - feat.tolerance_minus;
      if (isFanucLike(ctrl)) {
        lines.push(`IF [${varRef} GT ${fmt(upper)}] GOTO ${alarmNum + 50}`);
        lines.push(`IF [${varRef} LT ${fmt(lower)}] GOTO ${alarmNum + 50}`);
        lines.push(`#500=#500+1 (PASS)`);
        lines.push(`GOTO ${alarmNum + 51}`);
        lines.push(`N${alarmNum + 50} #501=#501+1 (FAIL)`);
        lines.push(`N${alarmNum + 51}`);
      } else if (ctrl === "siemens") {
        lines.push(`IF ${varRef} > ${fmt(upper)} GOTOF _CNT_FAIL_${alarmNum}`);
        lines.push(`IF ${varRef} < ${fmt(lower)} GOTOF _CNT_FAIL_${alarmNum}`);
        lines.push(`R200=R200+1`);
        lines.push(`GOTOF _CNT_END_${alarmNum}`);
        lines.push(`_CNT_FAIL_${alarmNum}: R201=R201+1`);
        lines.push(`_CNT_END_${alarmNum}:`);
      } else {
        lines.push(`FN 9: IF +${varRef} GT +${fmt(upper)} GOTO LBL ${alarmNum + 50}`);
        lines.push(`FN 9: IF +${varRef} LT +${fmt(lower)} GOTO LBL ${alarmNum + 50}`);
        lines.push(`Q200 = Q200 + 1`);
        lines.push(`FN 9: IF +0 EQU +0 GOTO LBL ${alarmNum + 51}`);
        lines.push(`LBL ${alarmNum + 50}`);
        lines.push(`Q201 = Q201 + 1`);
        lines.push(`LBL ${alarmNum + 51}`);
      }

      // SPC data output
      if (spc_output) {
        lines.push(spcOutputLine(ctrl, label, varRef));
      }
      lines.push("");
    }

    // ---- Summary ----
    lines.push(comment(ctrl, "--- INSPECTION SUMMARY ---"));
    if (spc_output) {
      if (isFanucLike(ctrl)) {
        lines.push(`DPRNT[============================]`);
        lines.push(`DPRNT[PASS*COUNT***#500]`);
        lines.push(`DPRNT[FAIL*COUNT***#501]`);
        lines.push(`DPRNT[--- INSPECTION END ---]`);
        lines.push(`PCLOS`);
      } else if (ctrl === "siemens") {
        lines.push(`MSG("PASS COUNT=" << R200)`);
        lines.push(`MSG("FAIL COUNT=" << R201)`);
        lines.push(`MSG("--- INSPECTION END ---")`);
      } else {
        lines.push(`FN 16: F-PRINT TNC:\\PROBE\\INSP_LOG.A / "PASS=" / Q200`);
        lines.push(`FN 16: F-PRINT TNC:\\PROBE\\INSP_LOG.A / "FAIL=" / Q201`);
        lines.push(`FN 16: F-PRINT TNC:\\PROBE\\INSP_LOG.A / "INSPECTION END"`);
      }
    }
    lines.push("");

    // ---- Program end ----
    lines.push(safeRetract(ctrl, retract_height));
    if (ctrl === "heidenhain") {
      lines.push(`END PGM INSPECTION MM`);
    } else {
      lines.push(`M30`);
    }

    return {
      gcode: lines.join("\n"),
      line_count: lines.length,
      features_measured: features.length,
      warnings,
      estimated_time_sec: TOOL_CHANGE_TIME_SEC + features.length * (MOVE_TIME_SEC * 2 + TOUCH_TIME_SEC * 2),
    };
  }

  /** Internal: probe a single inspection feature and store result in varRef. */
  private _inspectionProbe(
    ctrl: ControllerType, feat: InspectionFeature, varRef: string,
    feed: number, lines: string[]
  ): void {
    const dia = feat.diameter ?? feat.nominal;
    const depth = feat.depth ?? -5;

    switch (feat.type) {
      case "bore":
        if (ctrl === "heidenhain") {
          lines.push(`TCH PROBE 420 MEASURE BORE`);
          lines.push(`  Q260=${fmt(feat.position.x)}  ; CENTER 1ST AXIS`);
          lines.push(`  Q261=${fmt(feat.position.y)}  ; CENTER 2ND AXIS`);
          lines.push(`  Q262=${fmt(dia)}               ; NOMINAL DIAMETER`);
          lines.push(`  Q325=${fmt(feat.position.z + depth)} ; PROBE DEPTH`);
          lines.push(`  Q247=10                        ; APPROACH DISTANCE`);
          lines.push(`  Q281=0                         ; NO DATUM UPDATE`);
          lines.push(`${varRef} = Q150 ; measured diameter`);
        } else if (ctrl === "siemens") {
          lines.push(`CYCLE977(${fmt(dia)},0,0,${fmt(feat.position.z + depth)},0,10,${feed},0,1,0,0,0,0) ; BORE`);
          lines.push(`${varRef} = R162 ; measured diameter`);
        } else {
          lines.push(`G65 P9815 D${fmt(dia)} Z${fmt(feat.position.z + depth)} F${feed} (BORE PROBE)`);
          lines.push(`${varRef}=#187 (MEASURED DIAMETER)`);
        }
        break;

      case "boss":
        if (ctrl === "heidenhain") {
          lines.push(`TCH PROBE 421 MEASURE BOSS`);
          lines.push(`  Q260=${fmt(feat.position.x)}`);
          lines.push(`  Q261=${fmt(feat.position.y)}`);
          lines.push(`  Q262=${fmt(dia)}`);
          lines.push(`  Q325=${fmt(feat.position.z)}`);
          lines.push(`  Q247=10`);
          lines.push(`  Q281=0`);
          lines.push(`${varRef} = Q150`);
        } else if (ctrl === "siemens") {
          lines.push(`CYCLE977(${fmt(dia)},0,0,${fmt(feat.position.z)},0,10,${feed},0,2,0,0,0,0) ; BOSS`);
          lines.push(`${varRef} = R162`);
        } else {
          lines.push(`G65 P9816 D${fmt(dia)} Z${fmt(feat.position.z)} F${feed} (BOSS PROBE)`);
          lines.push(`${varRef}=#187`);
        }
        break;

      case "surface":
        if (ctrl === "heidenhain") {
          lines.push(`TCH PROBE 444 PROBING IN TS AXIS`);
          lines.push(`  Q263=${fmt(feat.position.x)}`);
          lines.push(`  Q264=${fmt(feat.position.y)}`);
          lines.push(`  Q325=${fmt(feat.position.z + 5)}`);
          lines.push(`  Q247=10`);
          lines.push(`  Q281=0`);
          lines.push(`${varRef} = Q160`);
        } else if (ctrl === "siemens") {
          lines.push(`CYCLE978(0,0,${fmt(feat.position.x)},${fmt(feat.position.y)},${fmt(feat.position.z + 5)},10,${feed},3,0,0,0,0) ; SURFACE Z`);
          lines.push(`${varRef} = R160`);
        } else {
          lines.push(`G65 P9814 Z${fmt(feat.position.z + 5)} F${feed} (SURFACE PROBE Z)`);
          lines.push(`${varRef}=#185`);
        }
        break;

      case "web": {
        const w = feat.diameter ?? feat.nominal;
        if (ctrl === "heidenhain") {
          lines.push(`TCH PROBE 430 MEASURE WEB`);
          lines.push(`  Q260=${fmt(feat.position.x)}`);
          lines.push(`  Q261=${fmt(feat.position.y)}`);
          lines.push(`  Q311=${fmt(w)}`);
          lines.push(`  Q272=0`);
          lines.push(`  Q325=${fmt(feat.position.z)}`);
          lines.push(`  Q247=10`);
          lines.push(`  Q281=0`);
          lines.push(`${varRef} = Q151 ; measured width`);
        } else if (ctrl === "siemens") {
          lines.push(`CYCLE978(${fmt(w)},0,${fmt(feat.position.x)},${fmt(feat.position.y)},${fmt(feat.position.z)},10,${feed},2,0,0,0,0) ; WEB`);
          lines.push(`${varRef} = R161`);
        } else {
          lines.push(`G65 P9818 X${fmt(feat.position.x)} D${fmt(w)} Z${fmt(feat.position.z)} F${feed} (WEB MEASURE)`);
          lines.push(`${varRef}=#187`);
        }
        break;
      }

      case "groove": {
        const gw = feat.diameter ?? feat.nominal;
        if (ctrl === "heidenhain") {
          lines.push(`TCH PROBE 430 MEASURE WEB`);
          lines.push(`  Q260=${fmt(feat.position.x)}`);
          lines.push(`  Q261=${fmt(feat.position.y)}`);
          lines.push(`  Q311=${fmt(gw)}`);
          lines.push(`  Q272=0`);
          lines.push(`  Q325=${fmt(feat.position.z + depth)}`);
          lines.push(`  Q247=10`);
          lines.push(`  Q281=0`);
          lines.push(`${varRef} = Q151`);
        } else if (ctrl === "siemens") {
          lines.push(`CYCLE978(${fmt(gw)},0,${fmt(feat.position.x)},${fmt(feat.position.y)},${fmt(feat.position.z + depth)},10,${feed},2,0,0,0,0) ; GROOVE`);
          lines.push(`${varRef} = R161`);
        } else {
          lines.push(`G65 P9817 X${fmt(feat.position.x)} D${fmt(gw)} Z${fmt(feat.position.z + depth)} F${feed} (GROOVE/SLOT MEASURE)`);
          lines.push(`${varRef}=#187`);
        }
        break;
      }

      case "angle":
        if (ctrl === "heidenhain") {
          lines.push(`TCH PROBE 420 MEASURE ANGLE`);
          lines.push(`  Q263=${fmt(feat.position.x)}`);
          lines.push(`  Q264=${fmt(feat.position.y)}`);
          lines.push(`  Q325=${fmt(feat.position.z)}`);
          lines.push(`  Q247=10`);
          lines.push(`  Q281=0`);
          lines.push(`${varRef} = Q150`);
        } else if (ctrl === "siemens") {
          lines.push(`CYCLE998(${fmt(feat.position.x)},${fmt(feat.position.y)},${fmt(feat.position.z)},10,${feed},0,0,0,0) ; ANGLE`);
          lines.push(`${varRef} = R160`);
        } else {
          lines.push(`G65 P9843 X${fmt(feat.position.x)} Y${fmt(feat.position.y)} Z${fmt(feat.position.z)} F${feed} (ANGLE MEASURE)`);
          lines.push(`${varRef}=#185`);
        }
        break;
    }
  }

  // --------------------------------------------------------------------------
  // generateToolMeasurement
  // --------------------------------------------------------------------------

  /**
   * Generate tool length/radius measurement routine using tool setter.
   *
   * Supports probe, laser, and contact methods.
   * Includes broken tool detection and radius deviation checks.
   *
   * Macro references:
   *   - G65 P9023 tool length (Fanuc/Haas)
   *   - G65 P9025 tool radius (Fanuc/Haas)
   *   - CYCLE982 (Siemens 840D)
   *   - TCH PROBE 480/481 (Heidenhain)
   */
  generateToolMeasurement(config: ToolMeasurementConfig): ProbeResult {
    const {
      controller: ctrl,
      tool_numbers,
      method,
      measure_radius = false,
      spindle_orient = 0,
    } = config;

    const warnings: string[] = [];
    const lines: string[] = [];

    if (tool_numbers.length === 0) {
      warnings.push("No tool numbers specified for measurement");
      return { gcode: "", line_count: 0, features_measured: 0, warnings, estimated_time_sec: 0 };
    }

    if (method === "laser" && ctrl === "heidenhain") {
      warnings.push("Laser tool measurement on Heidenhain: verify TT449 cycle availability on your control");
    }
    if (method === "laser" && measure_radius) {
      warnings.push("Laser radius measurement requires spindle rotation - ensure tool is balanced");
    }

    // ---- Header ----
    lines.push(comment(ctrl, "================================================"));
    lines.push(comment(ctrl, "PRISM PROBE ROUTINE - TOOL MEASUREMENT"));
    lines.push(comment(ctrl, `Controller: ${ctrl.toUpperCase()}`));
    lines.push(comment(ctrl, `Tools: ${tool_numbers.join(", ")}`));
    lines.push(comment(ctrl, `Method: ${method.toUpperCase()}`));
    lines.push(comment(ctrl, `Measure Radius: ${measure_radius ? "YES" : "NO"}`));
    lines.push(comment(ctrl, `Spindle Orient: ${spindle_orient} deg`));
    lines.push(comment(ctrl, "Generated by ProbeRoutineEngine"));
    lines.push(comment(ctrl, "================================================"));
    lines.push("");

    // ---- Safety preamble ----
    if (ctrl === "heidenhain") {
      lines.push(`BEGIN PGM TOOL_MEAS MM`);
    } else if (ctrl === "siemens") {
      lines.push(`G90 G71 G17`);
      lines.push(`G40`);
    } else {
      lines.push(`G90 G21 G17`);
      lines.push(`G49 G40 G80`);
    }
    lines.push("");

    // ---- Measure each tool ----
    for (let i = 0; i < tool_numbers.length; i++) {
      const toolNum = tool_numbers[i];
      lines.push(comment(ctrl, `========== TOOL T${toolNum} ==========`));

      // Tool change
      if (ctrl === "heidenhain") {
        lines.push(`TOOL CALL ${toolNum} Z`);
      } else if (ctrl === "siemens") {
        lines.push(`T${toolNum} D1`);
        lines.push(`M6`);
      } else {
        lines.push(`T${toolNum} M6`);
      }

      // Spindle orient (M19) — DO NOT spin with probe/contact method
      if (method !== "laser") {
        lines.push(spindleOrient(ctrl, spindle_orient));
      } else {
        lines.push(comment(ctrl, "Laser method - no spindle orient needed for length"));
      }
      lines.push("");

      // ---- Tool length measurement ----
      lines.push(comment(ctrl, `--- T${toolNum} LENGTH MEASUREMENT ---`));

      if (ctrl === "heidenhain") {
        if (method === "laser") {
          lines.push(`TCH PROBE 480 CALIBRATE TT`);
          lines.push(`  Q340=${toolNum}    ; TOOL NUMBER`);
          lines.push(`  Q260=0            ; 1ST AXIS POSITION`);
          lines.push(`  Q261=0            ; 2ND AXIS POSITION`);
          lines.push(`  Q297=1            ; REFERENCE MEASURE`);
        } else {
          lines.push(`TCH PROBE 480 CALIBRATE TOOL LENGTH`);
          lines.push(`  Q340=${toolNum}    ; TOOL NUMBER`);
          lines.push(`  Q260=0            ; 1ST AXIS POSITION`);
          lines.push(`  Q261=0            ; 2ND AXIS POSITION`);
          lines.push(`  Q297=1            ; REFERENCE MEASURE`);
        }
        lines.push(`; Tool length stored in tool table automatically`);
        lines.push(`; Broken tool detection: if deviation > 2mm, alarm triggered`);
      } else if (ctrl === "siemens") {
        const methodCode = method === "laser" ? 2 : 1;
        lines.push(`CYCLE982(1,1,,0,0,0,1,${methodCode},0) ; TOOL LENGTH MEASURE`);
        lines.push(`; Result: tool compensation updated automatically`);
        lines.push(`; R260=measured length, R261=length deviation`);
        lines.push(`; Broken tool detection built into CYCLE982`);
        lines.push(`IF ABS(R261) > 2.0 GOTOF _BROKEN_T${toolNum}`);
        lines.push(`GOTOF _OK_LEN_T${toolNum}`);
        lines.push(`_BROKEN_T${toolNum}:`);
        lines.push(`SETAL(${500 + i}, "T${toolNum} BROKEN TOOL - LENGTH DEV > 2mm")`);
        lines.push(`M0`);
        lines.push(`_OK_LEN_T${toolNum}:`);
      } else {
        // Fanuc-like
        if (method === "laser") {
          lines.push(`(LASER TOOL SETTER - LENGTH)`);
          lines.push(`G65 P9023 H${toolNum}. (MEASURE TOOL LENGTH - LASER)`);
        } else {
          lines.push(`(CONTACT TOOL SETTER - LENGTH)`);
          lines.push(`G65 P9023 H${toolNum}. (MEASURE TOOL LENGTH)`);
        }
        lines.push(`(RESULT: TOOL OFFSET H${toolNum} UPDATED AUTOMATICALLY)`);
        lines.push("");
        lines.push(`(BROKEN TOOL DETECTION)`);
        lines.push(`#520=#[11000+${toolNum}] (PREVIOUS LENGTH FROM OFFSET TABLE)`);
        lines.push(`#521=ABS[#185-#520]`);
        lines.push(`IF [#521 GT 2.0] GOTO 9800`);
        lines.push(`GOTO 9801`);
        lines.push(`N9800 #3000=${100 + i} (T${toolNum} BROKEN TOOL - LENGTH DEVIATION > 2mm)`);
        lines.push(`N9801`);
      }
      lines.push("");

      // ---- Tool radius measurement (optional) ----
      if (measure_radius) {
        lines.push(comment(ctrl, `--- T${toolNum} RADIUS MEASUREMENT ---`));

        if (ctrl === "heidenhain") {
          lines.push(`TCH PROBE 481 CALIBRATE TOOL RADIUS`);
          lines.push(`  Q340=${toolNum}    ; TOOL NUMBER`);
          lines.push(`  Q260=0            ; 1ST AXIS POSITION`);
          lines.push(`  Q261=0            ; 2ND AXIS POSITION`);
          lines.push(`  Q341=1            ; SPINDLE ON FOR RADIUS MEAS`);
          lines.push(`; Tool radius stored in tool table automatically`);
        } else if (ctrl === "siemens") {
          const methodCode = method === "laser" ? 2 : 1;
          lines.push(`CYCLE982(1,2,,0,0,0,1,${methodCode},0) ; TOOL RADIUS MEASURE`);
          lines.push(`; R262=measured radius, R263=radius deviation`);
          lines.push(`IF ABS(R263) > 0.05 GOTOF _RAD_WARN_T${toolNum}`);
          lines.push(`GOTOF _RAD_OK_T${toolNum}`);
          lines.push(`_RAD_WARN_T${toolNum}:`);
          lines.push(`MSG("T${toolNum} RADIUS DEVIATION > 0.05mm: CHECK TOOL")`);
          lines.push(`M0`);
          lines.push(`_RAD_OK_T${toolNum}:`);
        } else {
          lines.push(`G65 P9025 H${toolNum}. (MEASURE TOOL RADIUS)`);
          lines.push(`(RESULT: TOOL OFFSET D${toolNum} RADIUS UPDATED)`);
          lines.push("");
          lines.push(`(RADIUS DEVIATION CHECK)`);
          lines.push(`#530=#[13000+${toolNum}] (NOMINAL RADIUS FROM OFFSET TABLE)`);
          lines.push(`#531=ABS[#185-#530]`);
          lines.push(`IF [#531 GT 0.05] GOTO 9810`);
          lines.push(`GOTO 9811`);
          lines.push(`N9810 #3000=${200 + i} (T${toolNum} RADIUS DEVIATION > 0.05mm - CHECK TOOL)`);
          lines.push(`N9811`);
        }
        lines.push("");
      }
    }

    // ---- Program end ----
    if (ctrl === "heidenhain") {
      lines.push(`TOOL CALL 0 Z`);
      lines.push(`END PGM TOOL_MEAS MM`);
    } else if (ctrl === "siemens") {
      lines.push(`M30`);
    } else {
      lines.push(`G91 G28 Z0 (RETURN TO HOME)`);
      lines.push(`M30`);
    }

    const measPerTool = measure_radius ? 2 : 1;
    return {
      gcode: lines.join("\n"),
      line_count: lines.length,
      features_measured: tool_numbers.length * measPerTool,
      warnings,
      estimated_time_sec: tool_numbers.length * (TOOL_CHANGE_TIME_SEC + TOUCH_TIME_SEC * measPerTool + MOVE_TIME_SEC),
    };
  }

  // --------------------------------------------------------------------------
  // generateFirstArticle
  // --------------------------------------------------------------------------

  /**
   * Generate comprehensive first article inspection (FAI) program.
   *
   * Supports AS9102 (aerospace), PPAP (automotive), and custom report formats.
   * Includes datum feature establishment, all critical dimensions, data logging,
   * and pass/fail summary with alarm on critical dimension failure.
   */
  generateFirstArticle(config: FirstArticleConfig): ProbeResult {
    const {
      controller: ctrl,
      features,
      datum_features,
      report_format,
      probe_tool_number = 99,
      retract_height = 50,
      part_number = "UNKNOWN",
      revision = "A",
    } = config;

    const warnings: string[] = [];
    const lines: string[] = [];
    const feed = 250;
    const allFeatures = [...datum_features, ...features];

    if (allFeatures.length === 0) {
      warnings.push("No features specified for first article inspection");
      return { gcode: "", line_count: 0, features_measured: 0, warnings, estimated_time_sec: 0 };
    }

    if (allFeatures.length > 50) {
      warnings.push(`Large FAI with ${allFeatures.length} features - consider splitting into sub-programs`);
    }

    const prgName = `FAI_${part_number.replace(/[^A-Z0-9]/gi, "_")}`;

    // ---- Header ----
    lines.push(comment(ctrl, "================================================"));
    lines.push(comment(ctrl, "PRISM PROBE ROUTINE - FIRST ARTICLE INSPECTION"));
    lines.push(comment(ctrl, `Controller: ${ctrl.toUpperCase()}`));
    lines.push(comment(ctrl, `Part Number: ${part_number}`));
    lines.push(comment(ctrl, `Revision: ${revision}`));
    lines.push(comment(ctrl, `Report Format: ${report_format}`));
    lines.push(comment(ctrl, `Datum Features: ${datum_features.length}`));
    lines.push(comment(ctrl, `Inspection Features: ${features.length}`));
    lines.push(comment(ctrl, `Total: ${allFeatures.length}`));
    lines.push(comment(ctrl, "Generated by ProbeRoutineEngine"));
    lines.push(comment(ctrl, "================================================"));
    lines.push("");

    // ---- Safety preamble ----
    if (ctrl === "heidenhain") {
      lines.push(`BEGIN PGM ${prgName} MM`);
    } else if (ctrl === "siemens") {
      lines.push(`G90 G71 G17`);
      lines.push(`G40`);
    } else {
      lines.push(`G90 G21 G17`);
      lines.push(`G49 G40 G80`);
    }
    lines.push("");

    // ---- Tool call ----
    lines.push(...probeToolCall(ctrl, probe_tool_number));
    lines.push(spindleOrient(ctrl));
    lines.push(safeRetract(ctrl, retract_height));
    lines.push("");

    // ---- Open data output channel ----
    if (isFanucLike(ctrl)) {
      lines.push(`POPEN`);
      lines.push(`DPRNT[================================================]`);
      lines.push(`DPRNT[FAI*REPORT*FORMAT*${report_format}]`);
      lines.push(`DPRNT[PART*${part_number}*REV*${revision}]`);
      lines.push(`DPRNT[DATE*#3011.*#3012]`);
      lines.push(`DPRNT[TIME*#3001]`);
      lines.push(`DPRNT[================================================]`);
    } else if (ctrl === "siemens") {
      lines.push(`MSG("================================================")`);
      lines.push(`MSG("FAI REPORT - ${report_format}")`);
      lines.push(`MSG("PART: ${part_number} REV: ${revision}")`);
      lines.push(`MSG("================================================")`);
    } else {
      lines.push(`FN 16: F-PRINT TNC:\\FAI\\${prgName}.A / "FAI REPORT"`);
      lines.push(`FN 16: F-PRINT TNC:\\FAI\\${prgName}.A / "FORMAT: ${report_format}"`);
      lines.push(`FN 16: F-PRINT TNC:\\FAI\\${prgName}.A / "PART: ${part_number} REV: ${revision}"`);
    }
    lines.push("");

    // ---- Initialize counters ----
    if (isFanucLike(ctrl)) {
      lines.push(`#500=0 (TOTAL MEASURED)`);
      lines.push(`#501=0 (TOTAL PASS)`);
      lines.push(`#502=0 (TOTAL FAIL)`);
      lines.push(`#503=0 (CRITICAL FAIL)`);
    } else if (ctrl === "siemens") {
      lines.push(`R200=0 ; TOTAL MEASURED`);
      lines.push(`R201=0 ; TOTAL PASS`);
      lines.push(`R202=0 ; TOTAL FAIL`);
      lines.push(`R203=0 ; CRITICAL FAIL`);
    } else {
      lines.push(`Q200 = 0 ; TOTAL MEASURED`);
      lines.push(`Q201 = 0 ; TOTAL PASS`);
      lines.push(`Q202 = 0 ; TOTAL FAIL`);
      lines.push(`Q203 = 0 ; CRITICAL FAIL`);
    }
    lines.push("");

    // ---- DATUM FEATURES (establish part coordinate system) ----
    if (datum_features.length > 0) {
      lines.push(comment(ctrl, "============ DATUM FEATURES ============"));
      lines.push("");

      for (let i = 0; i < datum_features.length; i++) {
        this._faiFeatureBlock(ctrl, datum_features[i], i, feed, retract_height, true, report_format, prgName, lines, warnings);
      }
    }

    // ---- INSPECTION FEATURES ----
    lines.push(comment(ctrl, "============ INSPECTION FEATURES ============"));
    lines.push("");

    for (let i = 0; i < features.length; i++) {
      this._faiFeatureBlock(ctrl, features[i], datum_features.length + i, feed, retract_height, false, report_format, prgName, lines, warnings);
    }

    // ---- FAI SUMMARY ----
    lines.push(comment(ctrl, "============ FAI SUMMARY ============"));
    lines.push("");

    if (isFanucLike(ctrl)) {
      lines.push(`DPRNT[================================================]`);
      lines.push(`DPRNT[TOTAL*MEASURED**#500]`);
      lines.push(`DPRNT[TOTAL*PASS*****#501]`);
      lines.push(`DPRNT[TOTAL*FAIL*****#502]`);
      lines.push(`DPRNT[CRITICAL*FAIL**#503]`);
      lines.push(`DPRNT[================================================]`);
      lines.push(`IF [#502 GT 0] GOTO 9900`);
      lines.push(`DPRNT[FAI*RESULT*****PASS]`);
      lines.push(`GOTO 9901`);
      lines.push(`N9900 DPRNT[FAI*RESULT*****FAIL]`);
      lines.push(`IF [#503 GT 0] GOTO 9902`);
      lines.push(`GOTO 9901`);
      lines.push(`N9902 #3000=200 (CRITICAL DIMENSION FAILED - PART REJECTED)`);
      lines.push(`N9901`);
      lines.push(`PCLOS`);
    } else if (ctrl === "siemens") {
      lines.push(`MSG("================================================")`);
      lines.push(`MSG("TOTAL MEASURED=" << R200)`);
      lines.push(`MSG("TOTAL PASS=" << R201)`);
      lines.push(`MSG("TOTAL FAIL=" << R202)`);
      lines.push(`MSG("CRITICAL FAIL=" << R203)`);
      lines.push(`MSG("================================================")`);
      lines.push(`IF R202 > 0 GOTOF _FAI_FAIL`);
      lines.push(`MSG("FAI RESULT: PASS")`);
      lines.push(`GOTOF _FAI_END`);
      lines.push(`_FAI_FAIL:`);
      lines.push(`MSG("FAI RESULT: FAIL")`);
      lines.push(`IF R203 > 0 GOTOF _FAI_CRITICAL`);
      lines.push(`GOTOF _FAI_END`);
      lines.push(`_FAI_CRITICAL:`);
      lines.push(`SETAL(200, "CRITICAL DIMENSION FAILED - PART REJECTED")`);
      lines.push(`M0`);
      lines.push(`_FAI_END:`);
    } else {
      lines.push(`FN 16: F-PRINT TNC:\\FAI\\${prgName}.A / "TOTAL MEASURED=" / Q200`);
      lines.push(`FN 16: F-PRINT TNC:\\FAI\\${prgName}.A / "TOTAL PASS=" / Q201`);
      lines.push(`FN 16: F-PRINT TNC:\\FAI\\${prgName}.A / "TOTAL FAIL=" / Q202`);
      lines.push(`FN 16: F-PRINT TNC:\\FAI\\${prgName}.A / "CRITICAL FAIL=" / Q203`);
      lines.push(`FN 9: IF +Q202 GT +0 GOTO LBL 900`);
      lines.push(`FN 14: PRINT "FAI RESULT: PASS"`);
      lines.push(`FN 9: IF +0 EQU +0 GOTO LBL 901`);
      lines.push(`LBL 900`);
      lines.push(`FN 14: PRINT "FAI RESULT: FAIL"`);
      lines.push(`FN 9: IF +Q203 GT +0 GOTO LBL 902`);
      lines.push(`FN 9: IF +0 EQU +0 GOTO LBL 901`);
      lines.push(`LBL 902`);
      lines.push(`FN 14: ERROR = 200 ; CRITICAL DIMENSION FAILED - PART REJECTED`);
      lines.push(`LBL 901`);
    }
    lines.push("");

    // ---- Program end ----
    lines.push(safeRetract(ctrl, retract_height));
    if (ctrl === "heidenhain") {
      lines.push(`END PGM ${prgName} MM`);
    } else {
      lines.push(`M30`);
    }

    return {
      gcode: lines.join("\n"),
      line_count: lines.length,
      features_measured: allFeatures.length,
      warnings,
      estimated_time_sec: TOOL_CHANGE_TIME_SEC + allFeatures.length * (MOVE_TIME_SEC * 2 + TOUCH_TIME_SEC * 3),
    };
  }

  /** Internal: generate a single FAI feature block (probe + tolerance + data log). */
  private _faiFeatureBlock(
    ctrl: ControllerType, feat: FAIFeature, globalIdx: number,
    feed: number, retractHeight: number, isDatum: boolean,
    reportFormat: ReportFormat, prgName: string,
    lines: string[], warnings: string[]
  ): void {
    const balloon = feat.balloon_number ?? globalIdx + 1;
    const label = feat.label ?? `${isDatum ? "DATUM" : "DIM"}_${balloon}_${feat.type.toUpperCase()}`;
    const varRef = measuredVar(ctrl, globalIdx);
    const alarmNum = 2000 + globalIdx * 2;

    lines.push(comment(ctrl, `--- BAL#${balloon}: ${label} ---`));
    lines.push(comment(ctrl, `Type: ${feat.type} | Nominal: ${fmt(feat.nominal)} | Tol: +${fmt(feat.tolerance_plus)}/-${fmt(feat.tolerance_minus)}${feat.critical ? " | CRITICAL" : ""}`));

    // Position to feature
    lines.push(safeRetract(ctrl, retractHeight));
    lines.push(...protectedMove(ctrl, feat.position.x, feat.position.y, feat.position.z + 10, feed));

    // Probe based on type
    const dia = feat.diameter ?? feat.nominal;
    const depth = feat.depth ?? -5;

    switch (feat.type) {
      case "bore":
        if (ctrl === "heidenhain") {
          lines.push(`TCH PROBE 420 MEASURE BORE`);
          lines.push(`  Q260=${fmt(feat.position.x)}`);
          lines.push(`  Q261=${fmt(feat.position.y)}`);
          lines.push(`  Q262=${fmt(dia)}`);
          lines.push(`  Q325=${fmt(feat.position.z + depth)}`);
          lines.push(`  Q247=10`);
          lines.push(`  Q281=${isDatum ? 1 : 0}`);
          lines.push(`${varRef} = Q150`);
        } else if (ctrl === "siemens") {
          lines.push(`CYCLE977(${fmt(dia)},0,0,${fmt(feat.position.z + depth)},0,10,${feed},${isDatum ? 1 : 0},1,0,0,0,0)`);
          lines.push(`${varRef} = R162`);
        } else {
          lines.push(`G65 P9815 D${fmt(dia)} Z${fmt(feat.position.z + depth)} F${feed} (BORE)`);
          lines.push(`${varRef}=#187`);
          if (isDatum) {
            lines.push(`G65 P9832 W54. A0. (SET WCS FROM DATUM BORE)`);
          }
        }
        break;

      case "boss":
        if (ctrl === "heidenhain") {
          lines.push(`TCH PROBE 421 MEASURE BOSS`);
          lines.push(`  Q260=${fmt(feat.position.x)}`);
          lines.push(`  Q261=${fmt(feat.position.y)}`);
          lines.push(`  Q262=${fmt(dia)}`);
          lines.push(`  Q325=${fmt(feat.position.z)}`);
          lines.push(`  Q247=10`);
          lines.push(`  Q281=${isDatum ? 1 : 0}`);
          lines.push(`${varRef} = Q150`);
        } else if (ctrl === "siemens") {
          lines.push(`CYCLE977(${fmt(dia)},0,0,${fmt(feat.position.z)},0,10,${feed},${isDatum ? 1 : 0},2,0,0,0,0)`);
          lines.push(`${varRef} = R162`);
        } else {
          lines.push(`G65 P9816 D${fmt(dia)} Z${fmt(feat.position.z)} F${feed} (BOSS)`);
          lines.push(`${varRef}=#187`);
          if (isDatum) {
            lines.push(`G65 P9833 W54. A0. (SET WCS FROM DATUM BOSS)`);
          }
        }
        break;

      case "surface":
        if (ctrl === "heidenhain") {
          lines.push(`TCH PROBE 444 PROBING IN TS AXIS`);
          lines.push(`  Q263=${fmt(feat.position.x)}`);
          lines.push(`  Q264=${fmt(feat.position.y)}`);
          lines.push(`  Q325=${fmt(feat.position.z + 5)}`);
          lines.push(`  Q247=10`);
          lines.push(`  Q281=${isDatum ? 1 : 0}`);
          lines.push(`${varRef} = Q160`);
        } else if (ctrl === "siemens") {
          lines.push(`CYCLE978(0,0,${fmt(feat.position.x)},${fmt(feat.position.y)},${fmt(feat.position.z + 5)},10,${feed},3,0,0,0,0)`);
          lines.push(`${varRef} = R160`);
        } else {
          lines.push(`G65 P9814 Z${fmt(feat.position.z + 5)} F${feed} (SURFACE Z)`);
          lines.push(`${varRef}=#185`);
          if (isDatum) {
            lines.push(`G10 L2 P1 Z#185 (SET WCS Z FROM DATUM SURFACE)`);
          }
        }
        break;

      case "web": {
        const w = feat.diameter ?? feat.nominal;
        if (ctrl === "heidenhain") {
          lines.push(`TCH PROBE 430 MEASURE WEB`);
          lines.push(`  Q260=${fmt(feat.position.x)}`);
          lines.push(`  Q261=${fmt(feat.position.y)}`);
          lines.push(`  Q311=${fmt(w)}`);
          lines.push(`  Q272=0`);
          lines.push(`  Q325=${fmt(feat.position.z)}`);
          lines.push(`  Q247=10`);
          lines.push(`  Q281=0`);
          lines.push(`${varRef} = Q151`);
        } else if (ctrl === "siemens") {
          lines.push(`CYCLE978(${fmt(w)},0,${fmt(feat.position.x)},${fmt(feat.position.y)},${fmt(feat.position.z)},10,${feed},2,0,0,0,0)`);
          lines.push(`${varRef} = R161`);
        } else {
          lines.push(`G65 P9818 X${fmt(feat.position.x)} D${fmt(w)} Z${fmt(feat.position.z)} F${feed} (WEB)`);
          lines.push(`${varRef}=#187`);
        }
        break;
      }

      case "groove": {
        const gw = feat.diameter ?? feat.nominal;
        if (ctrl === "heidenhain") {
          lines.push(`TCH PROBE 430 MEASURE WEB`);
          lines.push(`  Q260=${fmt(feat.position.x)}`);
          lines.push(`  Q261=${fmt(feat.position.y)}`);
          lines.push(`  Q311=${fmt(gw)}`);
          lines.push(`  Q272=0`);
          lines.push(`  Q325=${fmt(feat.position.z + depth)}`);
          lines.push(`  Q247=10`);
          lines.push(`  Q281=0`);
          lines.push(`${varRef} = Q151`);
        } else if (ctrl === "siemens") {
          lines.push(`CYCLE978(${fmt(gw)},0,${fmt(feat.position.x)},${fmt(feat.position.y)},${fmt(feat.position.z + depth)},10,${feed},2,0,0,0,0)`);
          lines.push(`${varRef} = R161`);
        } else {
          lines.push(`G65 P9817 X${fmt(feat.position.x)} D${fmt(gw)} Z${fmt(feat.position.z + depth)} F${feed} (GROOVE)`);
          lines.push(`${varRef}=#187`);
        }
        break;
      }

      case "angle":
        if (ctrl === "heidenhain") {
          lines.push(`TCH PROBE 420 MEASURE ANGLE`);
          lines.push(`  Q263=${fmt(feat.position.x)}`);
          lines.push(`  Q264=${fmt(feat.position.y)}`);
          lines.push(`  Q325=${fmt(feat.position.z)}`);
          lines.push(`  Q247=10`);
          lines.push(`  Q281=0`);
          lines.push(`${varRef} = Q150`);
        } else if (ctrl === "siemens") {
          lines.push(`CYCLE998(${fmt(feat.position.x)},${fmt(feat.position.y)},${fmt(feat.position.z)},10,${feed},0,0,0,0)`);
          lines.push(`${varRef} = R160`);
        } else {
          lines.push(`G65 P9843 X${fmt(feat.position.x)} Y${fmt(feat.position.y)} Z${fmt(feat.position.z)} F${feed} (ANGLE)`);
          lines.push(`${varRef}=#185`);
        }
        break;
    }

    lines.push("");

    // Tolerance check
    lines.push(...toleranceCheck(ctrl, varRef, feat.nominal, feat.tolerance_plus, feat.tolerance_minus, label, feat.critical ? "alarm" : "alarm", alarmNum));

    // Increment counters + pass/fail tracking
    const upper = feat.nominal + feat.tolerance_plus;
    const lower = feat.nominal - feat.tolerance_minus;

    if (isFanucLike(ctrl)) {
      lines.push(`#500=#500+1 (MEASURED++)`);
      lines.push(`IF [${varRef} GT ${fmt(upper)}] GOTO ${alarmNum + 50}`);
      lines.push(`IF [${varRef} LT ${fmt(lower)}] GOTO ${alarmNum + 50}`);
      lines.push(`#501=#501+1 (PASS++)`);
      lines.push(`GOTO ${alarmNum + 51}`);
      lines.push(`N${alarmNum + 50} #502=#502+1 (FAIL++)`);
      if (feat.critical) {
        lines.push(`#503=#503+1 (CRITICAL FAIL++)`);
      }
      lines.push(`N${alarmNum + 51}`);
    } else if (ctrl === "siemens") {
      lines.push(`R200=R200+1`);
      lines.push(`IF ${varRef} > ${fmt(upper)} GOTOF _FAI_FAIL_${alarmNum}`);
      lines.push(`IF ${varRef} < ${fmt(lower)} GOTOF _FAI_FAIL_${alarmNum}`);
      lines.push(`R201=R201+1`);
      lines.push(`GOTOF _FAI_NEXT_${alarmNum}`);
      lines.push(`_FAI_FAIL_${alarmNum}:`);
      lines.push(`R202=R202+1`);
      if (feat.critical) {
        lines.push(`R203=R203+1`);
      }
      lines.push(`_FAI_NEXT_${alarmNum}:`);
    } else {
      lines.push(`Q200 = Q200 + 1`);
      lines.push(`FN 9: IF +${varRef} GT +${fmt(upper)} GOTO LBL ${alarmNum + 50}`);
      lines.push(`FN 9: IF +${varRef} LT +${fmt(lower)} GOTO LBL ${alarmNum + 50}`);
      lines.push(`Q201 = Q201 + 1`);
      lines.push(`FN 9: IF +0 EQU +0 GOTO LBL ${alarmNum + 51}`);
      lines.push(`LBL ${alarmNum + 50}`);
      lines.push(`Q202 = Q202 + 1`);
      if (feat.critical) {
        lines.push(`Q203 = Q203 + 1`);
      }
      lines.push(`LBL ${alarmNum + 51}`);
    }

    // Data output for report
    if (isFanucLike(ctrl)) {
      lines.push(`DPRNT[BAL#${String(balloon).padStart(3, "0")}*${label.padEnd(16)}*NOM=${fmt(feat.nominal).padStart(8)}*ACT=${varRef}]`);
      if (feat.critical) {
        lines.push(`DPRNT[****CRITICAL*DIMENSION****]`);
      }
    } else if (ctrl === "siemens") {
      lines.push(`MSG("BAL#${balloon} ${label} NOM=${fmt(feat.nominal)} ACT=" << ${varRef})`);
      if (feat.critical) {
        lines.push(`MSG("  ** CRITICAL DIMENSION **")`);
      }
    } else {
      lines.push(`FN 16: F-PRINT TNC:\\FAI\\${prgName}.A / "BAL#${balloon} ${label} NOM=${fmt(feat.nominal)}" / ${varRef}`);
      if (feat.critical) {
        lines.push(`FN 16: F-PRINT TNC:\\FAI\\${prgName}.A / "  ** CRITICAL DIMENSION **"`);
      }
    }

    lines.push("");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of ProbeRoutineEngine. */
export const probeRoutineEngine = new ProbeRoutineEngine();
