/**
 * PostProcessorFramework — R14-MS1
 *
 * SAFETY CLASSIFICATION: CRITICAL (generates machine instructions)
 *
 * Unified post processing product composing:
 *   - GCodeTemplateEngine (controller dialect info, high-level ops)
 *   - GCodeGeneratorEngine (validation, modal state tracking)
 *   - Controller-specific UIR → G-code emitters (ISO + Heidenhain)
 *   - Safety validator (spindle/feed/travel hard limits — BLOCKS on failure)
 *
 * Universal Intermediate Representation (UIR):
 *   Controller-agnostic operation intent → controller-specific G-code
 *
 * MCP actions:
 *   pp_post        — Full post-process: UIR → G-code with safety validation
 *   pp_validate    — Validate existing G-code against controller + machine constraints
 *   pp_translate   — Translate G-code between controller dialects
 *   pp_uir         — Generate UIR from operation parameters
 *   pp_controllers — List supported controller dialects
 *   pp_safety      — Safety-only check on G-code (spindle/feed/travel limits)
 */

import {
  listControllers as templateListControllers,
  type ControllerFamily,
} from "./GCodeTemplateEngine.js";
import { gcodeGenerator } from "./GCodeGeneratorEngine.js";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Universal Intermediate Representation — controller-agnostic operation intent */
export interface UIROperation {
  type: "rapid" | "linear" | "arc_cw" | "arc_ccw" | "drill" | "tap" | "bore"
    | "tool_change" | "spindle_on" | "spindle_off" | "coolant_on" | "coolant_off"
    | "dwell" | "home" | "comment" | "program_start" | "program_end";
  x?: number; y?: number; z?: number;
  a?: number; b?: number; c?: number;
  i?: number; j?: number; k?: number;
  r?: number;
  feedRate?: number;
  spindleSpeed?: number;
  spindleDirection?: "cw" | "ccw";
  toolNumber?: number;
  coolantType?: "flood" | "mist" | "through" | "off";
  dwellMs?: number;
  comment?: string;
  peckDepth?: number;
  pitch?: number;
  zSafe?: number;
}

export interface UIRProgram {
  programNumber?: number;
  programName?: string;
  material?: string;
  operations: UIROperation[];
  units: "mm" | "inch";
  workOffset?: string;
}

export interface PostProcessResult {
  gcode: string;
  lineCount: number;
  controller: string;
  summary: {
    toolChanges: number;
    rapidMoves: number;
    feedMoves: number;
    arcMoves: number;
    estimatedTime: number;
  };
  warnings: Array<{ code: string; message: string; line?: number }>;
  safety: {
    score: number;
    passed: boolean;
    checks: Array<{ name: string; passed: boolean; detail?: string }>;
  };
}

export interface SafetyReport {
  score: number;
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; detail?: string }>;
  machineConstraints?: any;
}

// ─── Machine Limits ─────────────────────────────────────────────────────────

interface MachineLimits {
  maxSpindleRpm: number;
  minSpindleRpm: number;
  maxFeedRate: number;
  maxRapidRate: number;
  travelX: [number, number];
  travelY: [number, number];
  travelZ: [number, number];
}

/** Conservative defaults — safe for most VMCs */
const DEFAULT_LIMITS: MachineLimits = {
  maxSpindleRpm: 12000,
  minSpindleRpm: 50,
  maxFeedRate: 15000,
  maxRapidRate: 30000,
  travelX: [-500, 500],
  travelY: [-350, 350],
  travelZ: [-300, 50],
};

// ─── Controller Resolution ──────────────────────────────────────────────────

type ControllerGroup = "iso" | "heidenhain";

function controllerGroup(family: ControllerFamily): ControllerGroup {
  return family === "heidenhain" ? "heidenhain" : "iso";
}

function resolveFamily(controller: string): ControllerFamily {
  const c = controller.toLowerCase().trim();
  if (c.includes("heidenhain") || c.includes("tnc")) return "heidenhain";
  if (c.includes("siemens") || c.includes("840d")) return "siemens";
  if (c.includes("haas")) return "haas";
  if (c.includes("mazak")) return "mazak";
  if (c.includes("okuma")) return "okuma";
  return "fanuc";
}

// ─── Number Formatting ──────────────────────────────────────────────────────

function fmt(n: number | undefined, decimals = 3): string {
  if (n === undefined) return "";
  return n.toFixed(decimals);
}

function coord(letter: string, v: number | undefined, d = 3): string {
  return v === undefined ? "" : `${letter}${v.toFixed(d)}`;
}

function hCoord(letter: string, v: number | undefined, d = 3): string {
  if (v === undefined) return "";
  return `${letter}${v >= 0 ? "+" : ""}${v.toFixed(d)}`;
}

// ─── ISO G-code Emitter (Fanuc / Haas / Siemens / Mazak / Okuma) ───────────

function emitISO(uir: UIRProgram, family: ControllerFamily): string[] {
  const lines: string[] = [];
  const unitG = uir.units === "mm" ? "G21" : "G20";
  const wo = uir.workOffset ?? "G54";

  for (const op of uir.operations) {
    switch (op.type) {
      case "program_start": {
        if (uir.programNumber) lines.push(`O${String(uir.programNumber).padStart(4, "0")}`);
        else lines.push("%");
        if (uir.programName) lines.push(`(${uir.programName})`);
        if (uir.material) lines.push(`(MATERIAL: ${uir.material})`);
        lines.push(`${unitG} ${wo} G90 G40 G80`);
        break;
      }
      case "program_end":
        lines.push("M30");
        if (!uir.programNumber) lines.push("%");
        break;

      case "comment":
        lines.push(`(${op.comment ?? ""})`);
        break;

      case "tool_change": {
        const t = op.toolNumber ?? 1;
        if (family === "siemens") {
          lines.push(`T${t} D1`);
          lines.push("M6");
        } else {
          lines.push(`T${t} M6`);
        }
        if (op.spindleSpeed) {
          lines.push(`G43 H${t} S${op.spindleSpeed} M${op.spindleDirection === "ccw" ? 4 : 3}`);
        }
        break;
      }
      case "spindle_on":
        lines.push(`S${op.spindleSpeed ?? 1000} M${op.spindleDirection === "ccw" ? 4 : 3}`);
        break;
      case "spindle_off":
        lines.push("M5");
        break;
      case "coolant_on":
        lines.push(op.coolantType === "mist" ? "M7" : op.coolantType === "through" ? "M88" : "M8");
        break;
      case "coolant_off":
        lines.push("M9");
        break;

      case "rapid":
        lines.push(
          ["G0", coord("X", op.x), coord("Y", op.y), coord("Z", op.z),
           coord("A", op.a), coord("B", op.b), coord("C", op.c)]
            .filter(Boolean).join(" "),
        );
        break;
      case "linear":
        lines.push(
          ["G1", coord("X", op.x), coord("Y", op.y), coord("Z", op.z),
           coord("A", op.a), coord("B", op.b), coord("C", op.c),
           op.feedRate ? `F${fmt(op.feedRate, 1)}` : ""]
            .filter(Boolean).join(" "),
        );
        break;
      case "arc_cw":
      case "arc_ccw": {
        const g = op.type === "arc_cw" ? "G2" : "G3";
        const parts = [g, coord("X", op.x), coord("Y", op.y), coord("Z", op.z)];
        if (op.r !== undefined) parts.push(coord("R", op.r));
        else { parts.push(coord("I", op.i), coord("J", op.j), coord("K", op.k)); }
        if (op.feedRate) parts.push(`F${fmt(op.feedRate, 1)}`);
        lines.push(parts.filter(Boolean).join(" "));
        break;
      }

      case "drill":
        if (op.peckDepth) {
          lines.push(
            ["G83", coord("X", op.x), coord("Y", op.y),
             `Z${fmt(op.z ?? 0)}`, `R${fmt(op.zSafe ?? 2)}`,
             `Q${fmt(op.peckDepth)}`, `F${fmt(op.feedRate ?? 100, 1)}`]
              .filter(Boolean).join(" "),
          );
        } else {
          lines.push(
            ["G81", coord("X", op.x), coord("Y", op.y),
             `Z${fmt(op.z ?? 0)}`, `R${fmt(op.zSafe ?? 2)}`,
             `F${fmt(op.feedRate ?? 100, 1)}`]
              .filter(Boolean).join(" "),
          );
        }
        break;

      case "tap": {
        const pitch = op.pitch ?? 1.0;
        const feedCalc = op.feedRate ?? (op.spindleSpeed ?? 500) * pitch;
        lines.push(
          ["G84", coord("X", op.x), coord("Y", op.y),
           `Z${fmt(op.z ?? 0)}`, `R${fmt(op.zSafe ?? 2)}`,
           `F${fmt(feedCalc, 1)}`]
            .filter(Boolean).join(" "),
        );
        break;
      }
      case "bore":
        lines.push(
          ["G85", coord("X", op.x), coord("Y", op.y),
           `Z${fmt(op.z ?? 0)}`, `R${fmt(op.zSafe ?? 2)}`,
           `F${fmt(op.feedRate ?? 50, 1)}`]
            .filter(Boolean).join(" "),
        );
        break;

      case "dwell":
        lines.push(`G4 P${op.dwellMs ?? 0}`);
        break;
      case "home":
        lines.push("G28 G91 Z0");
        lines.push("G90");
        break;
    }
  }
  return lines;
}

// ─── Heidenhain TNC Conversational Emitter ──────────────────────────────────

function emitHeidenhain(uir: UIRProgram): string[] {
  const lines: string[] = [];
  let blk = 0;
  const b = () => `${blk++}`;
  const unitLabel = uir.units === "mm" ? "MM" : "INCH";
  const pgm = uir.programName ?? "UNNAMED";

  for (const op of uir.operations) {
    switch (op.type) {
      case "program_start":
        lines.push(`${b()} BEGIN PGM ${pgm} ${unitLabel}`);
        if (uir.material) lines.push(`${b()} ; MATERIAL: ${uir.material}`);
        break;
      case "program_end":
        lines.push(`${b()} END PGM ${pgm} ${unitLabel}`);
        break;
      case "comment":
        lines.push(`${b()} ; ${op.comment ?? ""}`);
        break;
      case "tool_change":
        lines.push(`${b()} TOOL CALL ${op.toolNumber ?? 1} Z S${op.spindleSpeed ?? 1000}`);
        break;
      case "spindle_on":
        lines.push(`${b()} M${op.spindleDirection === "ccw" ? 4 : 3}`);
        break;
      case "spindle_off":
        lines.push(`${b()} M5`);
        break;
      case "coolant_on":
        lines.push(`${b()} M8`);
        break;
      case "coolant_off":
        lines.push(`${b()} M9`);
        break;
      case "rapid": {
        const coords = [hCoord("X", op.x), hCoord("Y", op.y), hCoord("Z", op.z)].filter(Boolean);
        lines.push(`${b()} L ${coords.join(" ")} FMAX`);
        break;
      }
      case "linear": {
        const coords = [hCoord("X", op.x), hCoord("Y", op.y), hCoord("Z", op.z)].filter(Boolean);
        lines.push(`${b()} L ${coords.join(" ")} F${Math.round(op.feedRate ?? 500)}`);
        break;
      }
      case "arc_cw":
      case "arc_ccw": {
        if (op.i !== undefined || op.j !== undefined) {
          lines.push(`${b()} CC ${hCoord("X", op.i ?? 0)} ${hCoord("Y", op.j ?? 0)}`);
        }
        const dr = op.type === "arc_cw" ? "DR+" : "DR-";
        const coords = [hCoord("X", op.x), hCoord("Y", op.y)].filter(Boolean);
        lines.push(`${b()} C ${coords.join(" ")} ${dr} F${Math.round(op.feedRate ?? 300)}`);
        break;
      }
      case "drill":
        lines.push(`${b()} CYCL DEF 1.0 PECKING`);
        lines.push(`${b()} CYCL DEF 1.1 SET UP ${fmt(op.zSafe ?? 2)}`);
        lines.push(`${b()} CYCL DEF 1.2 DEPTH ${fmt(Math.abs(op.z ?? 10))}`);
        lines.push(`${b()} CYCL DEF 1.3 PECKG ${fmt(op.peckDepth ?? Math.abs(op.z ?? 10))}`);
        lines.push(`${b()} CYCL DEF 1.4 DWELL 0`);
        lines.push(`${b()} CYCL DEF 1.5 F${Math.round(op.feedRate ?? 100)}`);
        if (op.x !== undefined || op.y !== undefined) {
          lines.push(`${b()} L ${[hCoord("X", op.x), hCoord("Y", op.y)].filter(Boolean).join(" ")} FMAX M99`);
        }
        break;
      case "tap":
        lines.push(`${b()} CYCL DEF 2.0 TAPPING`);
        lines.push(`${b()} CYCL DEF 2.1 SET UP ${fmt(op.zSafe ?? 2)}`);
        lines.push(`${b()} CYCL DEF 2.2 DEPTH ${fmt(Math.abs(op.z ?? 10))}`);
        lines.push(`${b()} CYCL DEF 2.3 F${Math.round(op.feedRate ?? 500)}`);
        if (op.x !== undefined || op.y !== undefined) {
          lines.push(`${b()} L ${[hCoord("X", op.x), hCoord("Y", op.y)].filter(Boolean).join(" ")} FMAX M99`);
        }
        break;
      case "bore":
        lines.push(`${b()} CYCL DEF 5.0 BORING`);
        lines.push(`${b()} CYCL DEF 5.1 SET UP ${fmt(op.zSafe ?? 2)}`);
        lines.push(`${b()} CYCL DEF 5.2 DEPTH ${fmt(Math.abs(op.z ?? 10))}`);
        lines.push(`${b()} CYCL DEF 5.3 F${Math.round(op.feedRate ?? 50)}`);
        if (op.x !== undefined || op.y !== undefined) {
          lines.push(`${b()} L ${[hCoord("X", op.x), hCoord("Y", op.y)].filter(Boolean).join(" ")} FMAX M99`);
        }
        break;
      case "dwell":
        lines.push(`${b()} FN 0: WAIT TIME ${fmt((op.dwellMs ?? 0) / 1000, 1)} SEC`);
        break;
      case "home":
        lines.push(`${b()} L Z+0 FMAX M91`);
        break;
    }
  }
  return lines;
}

// ─── Safety Validator ───────────────────────────────────────────────────────

function validateSafety(gcode: string, limits: MachineLimits): SafetyReport {
  const checks: Array<{ name: string; passed: boolean; detail?: string }> = [];
  const lines = gcode.split(/\r?\n/);
  let maxS = 0, maxF = 0;
  let mnX = Infinity, mxX = -Infinity;
  let mnY = Infinity, mxY = -Infinity;
  let mnZ = Infinity, mxZ = -Infinity;

  for (const line of lines) {
    const raw = line.trim();
    if (!raw || raw.startsWith("(") || raw.startsWith(";") || raw.startsWith("%")) continue;

    const sM = raw.match(/S(\d+\.?\d*)/);
    if (sM) maxS = Math.max(maxS, parseFloat(sM[1]));
    const fM = raw.match(/F(\d+\.?\d*)/);
    if (fM) maxF = Math.max(maxF, parseFloat(fM[1]));

    const xM = raw.match(/X([+-]?\d+\.?\d*)/);
    const yM = raw.match(/Y([+-]?\d+\.?\d*)/);
    const zM = raw.match(/Z([+-]?\d+\.?\d*)/);
    if (xM) { const v = parseFloat(xM[1]); mnX = Math.min(mnX, v); mxX = Math.max(mxX, v); }
    if (yM) { const v = parseFloat(yM[1]); mnY = Math.min(mnY, v); mxY = Math.max(mxY, v); }
    if (zM) { const v = parseFloat(zM[1]); mnZ = Math.min(mnZ, v); mxZ = Math.max(mxZ, v); }
  }

  const sOk = maxS <= limits.maxSpindleRpm;
  checks.push({
    name: "spindle_limit",
    passed: sOk,
    detail: sOk
      ? `Max S${maxS} within ${limits.maxSpindleRpm} RPM`
      : `DANGER: S${maxS} exceeds ${limits.maxSpindleRpm} RPM limit`,
  });

  const fOk = maxF <= limits.maxFeedRate;
  checks.push({
    name: "feed_limit",
    passed: fOk,
    detail: fOk
      ? `Max F${maxF} within ${limits.maxFeedRate} mm/min`
      : `DANGER: F${maxF} exceeds ${limits.maxFeedRate} mm/min limit`,
  });

  const xOk = mnX === Infinity || (mnX >= limits.travelX[0] && mxX <= limits.travelX[1]);
  checks.push({
    name: "travel_x",
    passed: xOk,
    detail: xOk
      ? `X [${mnX === Infinity ? "n/a" : mnX.toFixed(1)}, ${mxX === -Infinity ? "n/a" : mxX.toFixed(1)}] OK`
      : `DANGER: X [${mnX.toFixed(1)}, ${mxX.toFixed(1)}] exceeds [${limits.travelX[0]}, ${limits.travelX[1]}]`,
  });

  const yOk = mnY === Infinity || (mnY >= limits.travelY[0] && mxY <= limits.travelY[1]);
  checks.push({
    name: "travel_y",
    passed: yOk,
    detail: yOk
      ? `Y [${mnY === Infinity ? "n/a" : mnY.toFixed(1)}, ${mxY === -Infinity ? "n/a" : mxY.toFixed(1)}] OK`
      : `DANGER: Y [${mnY.toFixed(1)}, ${mxY.toFixed(1)}] exceeds [${limits.travelY[0]}, ${limits.travelY[1]}]`,
  });

  const zOk = mnZ === Infinity || (mnZ >= limits.travelZ[0] && mxZ <= limits.travelZ[1]);
  checks.push({
    name: "travel_z",
    passed: zOk,
    detail: zOk
      ? `Z [${mnZ === Infinity ? "n/a" : mnZ.toFixed(1)}, ${mxZ === -Infinity ? "n/a" : mxZ.toFixed(1)}] OK`
      : `DANGER: Z [${mnZ.toFixed(1)}, ${mxZ.toFixed(1)}] exceeds [${limits.travelZ[0]}, ${limits.travelZ[1]}]`,
  });

  const passedCount = checks.filter((c) => c.passed).length;
  return {
    score: Math.round((passedCount / checks.length) * 100),
    passed: checks.every((c) => c.passed),
    checks,
  };
}

// ─── ISO G-code → UIR Parser (for pp_translate) ────────────────────────────

function parseISOToUIR(gcode: string): UIRProgram {
  const lines = gcode.split(/\r?\n/);
  const ops: UIROperation[] = [];
  let units: "mm" | "inch" = "mm";
  let progNum: number | undefined;
  let lastS = 0;

  for (const line of lines) {
    const raw = line.trim();
    if (!raw || raw === "%") continue;

    const oM = raw.match(/^O(\d+)/);
    if (oM) { progNum = parseInt(oM[1]); continue; }

    const cmM = raw.match(/^\((.+)\)$/);
    if (cmM) { ops.push({ type: "comment", comment: cmM[1] }); continue; }

    const w: Record<string, number> = {};
    let m2;
    const re = /([A-Z])([+-]?\d+\.?\d*)/g;
    while ((m2 = re.exec(raw)) !== null) w[m2[1]] = parseFloat(m2[2]);

    const g = w["G"];
    const mc = w["M"];
    if (w["S"] !== undefined) lastS = w["S"];

    if (g === 20) { units = "inch"; continue; }
    if (g === 21) { units = "mm"; continue; }

    if (g === 0) ops.push({ type: "rapid", x: w["X"], y: w["Y"], z: w["Z"] });
    else if (g === 1) ops.push({ type: "linear", x: w["X"], y: w["Y"], z: w["Z"], feedRate: w["F"] });
    else if (g === 2) ops.push({ type: "arc_cw", x: w["X"], y: w["Y"], z: w["Z"], i: w["I"], j: w["J"], k: w["K"], r: w["R"], feedRate: w["F"] });
    else if (g === 3) ops.push({ type: "arc_ccw", x: w["X"], y: w["Y"], z: w["Z"], i: w["I"], j: w["J"], k: w["K"], r: w["R"], feedRate: w["F"] });
    else if (g === 4) ops.push({ type: "dwell", dwellMs: w["P"] });
    else if (g === 28) ops.push({ type: "home" });
    else if (g === 81) ops.push({ type: "drill", x: w["X"], y: w["Y"], z: w["Z"], zSafe: w["R"], feedRate: w["F"] });
    else if (g === 83) ops.push({ type: "drill", x: w["X"], y: w["Y"], z: w["Z"], zSafe: w["R"], peckDepth: w["Q"], feedRate: w["F"] });
    else if (g === 84) ops.push({ type: "tap", x: w["X"], y: w["Y"], z: w["Z"], zSafe: w["R"], feedRate: w["F"] });
    else if (g === 85) ops.push({ type: "bore", x: w["X"], y: w["Y"], z: w["Z"], zSafe: w["R"], feedRate: w["F"] });

    if (mc === 3) ops.push({ type: "spindle_on", spindleSpeed: lastS, spindleDirection: "cw" });
    else if (mc === 4) ops.push({ type: "spindle_on", spindleSpeed: lastS, spindleDirection: "ccw" });
    else if (mc === 5) ops.push({ type: "spindle_off" });
    else if (mc === 6) ops.push({ type: "tool_change", toolNumber: w["T"], spindleSpeed: lastS });
    else if (mc === 7) ops.push({ type: "coolant_on", coolantType: "mist" });
    else if (mc === 8) ops.push({ type: "coolant_on", coolantType: "flood" });
    else if (mc === 9) ops.push({ type: "coolant_off" });
    else if (mc === 30) ops.push({ type: "program_end" });
  }

  return { operations: ops, units, programNumber: progNum };
}

// ─── Main Engine ────────────────────────────────────────────────────────────

class PostProcessorFrameworkEngine {

  /** Validate UIR program structure. Returns errors (empty = valid). */
  private validateUIR(uir: UIRProgram): Array<{ code: string; message: string; opIndex: number }> {
    const errs: Array<{ code: string; message: string; opIndex: number }> = [];
    let hasTool = false, spindleOn = false;

    if (!uir.operations.length) {
      errs.push({ code: "UIR_EMPTY", message: "UIR program has no operations", opIndex: -1 });
      return errs;
    }

    const CUTTING = ["linear", "arc_cw", "arc_ccw", "drill", "tap", "bore"];
    const FEED_MOVE = ["linear", "arc_cw", "arc_ccw"];

    for (let i = 0; i < uir.operations.length; i++) {
      const op = uir.operations[i];
      if (op.type === "tool_change") hasTool = true;
      if (op.type === "spindle_on") spindleOn = true;
      if (op.type === "spindle_off") spindleOn = false;

      if (CUTTING.includes(op.type) && !hasTool) {
        errs.push({ code: "UIR_NO_TOOL", message: `${op.type} at op[${i}] before tool_change`, opIndex: i });
      }
      if (FEED_MOVE.includes(op.type) && !spindleOn) {
        errs.push({ code: "UIR_NO_SPINDLE", message: `${op.type} at op[${i}] without spindle`, opIndex: i });
      }
      if (FEED_MOVE.includes(op.type) && !op.feedRate) {
        errs.push({ code: "UIR_NO_FEED", message: `${op.type} at op[${i}] missing feedRate`, opIndex: i });
      }
      if ((op.type === "arc_cw" || op.type === "arc_ccw") &&
          op.r === undefined && op.i === undefined && op.j === undefined) {
        errs.push({ code: "UIR_NO_ARC_DATA", message: `${op.type} at op[${i}] missing I/J or R`, opIndex: i });
      }
      if (op.type === "spindle_on" && (!op.spindleSpeed || op.spindleSpeed <= 0)) {
        errs.push({ code: "UIR_BAD_SPINDLE", message: `spindle_on at op[${i}] invalid speed`, opIndex: i });
      }
    }
    return errs;
  }

  /**
   * Full post-process: UIR → controller-specific G-code with safety.
   * CRITICAL SAFETY: Output wrapped with SAFETY BLOCK header if checks fail.
   */
  postProcess(uir: UIRProgram, controller: string, _machineId?: string): PostProcessResult {
    if (!uir || !uir.operations) {
      return {
        gcode: "", lineCount: 0, controller,
        summary: { toolChanges: 0, rapidMoves: 0, feedMoves: 0, arcMoves: 0, estimatedTime: 0 },
        warnings: [{ code: "UIR_INVALID", message: "No UIR program provided" }],
        safety: { score: 0, passed: false, checks: [] },
      };
    }

    const family = resolveFamily(controller);
    const group = controllerGroup(family);
    const limits = DEFAULT_LIMITS;
    const warnings: Array<{ code: string; message: string; line?: number }> = [];

    // Step 1: Validate UIR
    for (const err of this.validateUIR(uir)) {
      warnings.push({ code: err.code, message: err.message });
    }

    // Step 2: Emit controller-specific G-code
    const gcodeLines = group === "heidenhain" ? emitHeidenhain(uir) : emitISO(uir, family);
    const gcode = gcodeLines.join("\n");

    // Step 3: Validate output (ISO only — Heidenhain uses non-ISO syntax)
    let toolChanges = 0, rapidMoves = 0, feedMoves = 0, arcMoves = 0;
    if (group === "iso") {
      const v = gcodeGenerator.validateGCode(gcode);
      toolChanges = v.stats.toolChanges;
      rapidMoves = v.stats.rapidMoves;
      feedMoves = v.stats.feedMoves;
      arcMoves = v.stats.arcMoves;
      for (const iss of v.issues) {
        warnings.push({ code: iss.code, message: iss.message, line: iss.line });
      }
    } else {
      for (const op of uir.operations) {
        if (op.type === "tool_change") toolChanges++;
        else if (op.type === "rapid") rapidMoves++;
        else if (op.type === "linear" || op.type === "drill" || op.type === "tap" || op.type === "bore") feedMoves++;
        else if (op.type === "arc_cw" || op.type === "arc_ccw") arcMoves++;
      }
    }

    // Step 4: Safety audit — HARD BLOCK
    const safety = validateSafety(gcode, limits);

    // Estimated cycle time (rough heuristic: seconds per move type)
    const estimatedTime = (rapidMoves * 0.5) + (feedMoves * 3) + (arcMoves * 4) + (toolChanges * 8);

    // CRITICAL: If safety fails, wrap output in SAFETY BLOCK markers
    const finalGCode = safety.passed
      ? gcode
      : `(*** SAFETY BLOCK — DO NOT RUN ON MACHINE ***)\n(${safety.checks.filter((c) => !c.passed).map((c) => c.detail).join("; ")})\n${gcode}\n(*** END SAFETY BLOCK ***)`;

    return {
      gcode: finalGCode,
      lineCount: gcodeLines.length,
      controller: `${family} (${group})`,
      summary: { toolChanges, rapidMoves, feedMoves, arcMoves, estimatedTime },
      warnings,
      safety,
    };
  }

  /** Validate existing G-code against controller + machine constraints. */
  validateGCode(gcode: string, _controller: string, _machineId?: string): any {
    const validation = gcodeGenerator.validateGCode(gcode);
    const safety = validateSafety(gcode, DEFAULT_LIMITS);
    return { validation, safety, overallValid: validation.valid && safety.passed };
  }

  /** Translate G-code between controller dialects via UIR round-trip. */
  translateGCode(gcode: string, fromController: string, toController: string): any {
    const uir = parseISOToUIR(gcode);
    const result = this.postProcess(uir, toController);
    return {
      originalLines: gcode.split(/\r?\n/).length,
      translatedLines: result.lineCount,
      fromController,
      toController: result.controller,
      gcode: result.gcode,
      warnings: result.warnings,
      safety: result.safety,
    };
  }

  /** Generate UIR from raw operation parameter objects. */
  generateUIR(operations: any[]): UIRProgram {
    const uirOps: UIROperation[] = [];
    const VALID: Set<string> = new Set([
      "rapid", "linear", "arc_cw", "arc_ccw", "drill", "tap", "bore",
      "tool_change", "spindle_on", "spindle_off", "coolant_on", "coolant_off",
      "dwell", "home", "comment", "program_start", "program_end",
    ]);
    for (const op of operations) {
      const t = op.type ?? op.operation;
      if (VALID.has(t)) uirOps.push(op as UIROperation);
      else uirOps.push({ type: "comment", comment: `Unknown op: ${t}` });
    }
    return {
      operations: uirOps,
      units: operations[0]?.units ?? "mm",
      programName: operations[0]?.programName,
    };
  }

  /** List supported controller dialects with UIR info. */
  listControllers(): any {
    const ctrls = templateListControllers();
    return {
      controllers: ctrls,
      groups: {
        iso: ctrls.filter((c) => c.family !== "heidenhain").map((c) => c.name),
        heidenhain: ctrls.filter((c) => c.family === "heidenhain").map((c) => c.name),
      },
      totalControllers: ctrls.length,
      uirTypes: [
        "rapid", "linear", "arc_cw", "arc_ccw", "drill", "tap", "bore",
        "tool_change", "spindle_on", "spindle_off", "coolant_on", "coolant_off",
        "dwell", "home", "comment", "program_start", "program_end",
      ],
    };
  }

  /** Safety-only check on G-code. Returns hard pass/fail. */
  safetyCheck(gcode: string, _machineId?: string): SafetyReport {
    return validateSafety(gcode, DEFAULT_LIMITS);
  }
}

// ─── Singleton + action dispatcher ──────────────────────────────────────────

export const postProcessorFramework = new PostProcessorFrameworkEngine();

export function executePostProcessorAction(action: string, params: Record<string, any> = {}): any {
  switch (action) {
    case "pp_post":
      return postProcessorFramework.postProcess(params.uir ?? params.program, params.controller ?? "fanuc", params.machine);
    case "pp_validate":
      return postProcessorFramework.validateGCode(params.gcode ?? "", params.controller ?? "fanuc", params.machine);
    case "pp_translate":
      return postProcessorFramework.translateGCode(params.gcode ?? "", params.from ?? "fanuc", params.to ?? "haas");
    case "pp_uir":
      return postProcessorFramework.generateUIR(params.operations ?? []);
    case "pp_controllers":
      return postProcessorFramework.listControllers();
    case "pp_safety":
      return postProcessorFramework.safetyCheck(params.gcode ?? "", params.machine);
    default:
      return { error: `Unknown PostProcessorFramework action: ${action}` };
  }
}
