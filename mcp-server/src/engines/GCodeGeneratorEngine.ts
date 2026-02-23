/**
 * GCodeGeneratorEngine — R13-MS6
 *
 * Extracted from PRISM v8.89.002 monolith sources:
 *   - POST_PROCESSOR_100_PERCENT.js  (G-code validator, modal state)
 *   - PRISM_GCODE_BACKPLOT_ENGINE.js (backplot parser, arc interpolation)
 *   - PRISM_GCODE_PROGRAMMING_ENGINE.js (G-code reference database)
 *
 * Three MCP actions:
 *   validate_gcode   — full validation with modal state tracking
 *   backplot_gcode    — parse G-code into structured move list + statistics
 *   generate_gcode    — G-code reference / snippet generation
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ModalState {
  motionMode: string;
  plane: string;
  units: string;
  positioning: string;
  feedRateMode: string;
  workOffset: string;
  lengthComp: string;
  cutterComp: string;
  cycleMode: string;
  spindleMode: string;
  coolantMode: string;
}

interface ValidationIssue {
  line: number;
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
}

interface BackplotMove {
  type: "rapid" | "linear" | "arc";
  from: { x: number; y: number; z: number };
  to:   { x: number; y: number; z: number };
  feedRate: number;
  lineNumber: number;
  arcData?: { center: { x: number; y: number }; radius: number; clockwise: boolean };
}

interface BackplotStats {
  totalMoves: number;
  rapidDistance: number;
  feedDistance: number;
  totalDistance: number;
  machiningTime: number;
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

interface AddressCode {
  letter: string;
  description: string;
  unit?: string;
  precision?: number;
}

interface GCodeDef {
  code: string;
  description: string;
  modal: boolean;
  group?: number;
}

/* ------------------------------------------------------------------ */
/*  Constants — G-code Reference Database                              */
/* ------------------------------------------------------------------ */

const ADDRESS_CODES: AddressCode[] = [
  { letter: "A", description: "A-axis rotation", unit: "deg", precision: 3 },
  { letter: "B", description: "B-axis rotation", unit: "deg", precision: 3 },
  { letter: "C", description: "C-axis rotation", unit: "deg", precision: 3 },
  { letter: "D", description: "Tool diameter offset number" },
  { letter: "E", description: "Thread pitch (lathe)" },
  { letter: "F", description: "Feed rate", unit: "mm/min or mm/rev", precision: 1 },
  { letter: "G", description: "Preparatory function" },
  { letter: "H", description: "Tool length offset number" },
  { letter: "I", description: "Arc center X-axis offset", unit: "mm", precision: 4 },
  { letter: "J", description: "Arc center Y-axis offset", unit: "mm", precision: 4 },
  { letter: "K", description: "Arc center Z-axis offset", unit: "mm", precision: 4 },
  { letter: "L", description: "Loop count / subroutine call" },
  { letter: "M", description: "Miscellaneous function" },
  { letter: "N", description: "Line / sequence number" },
  { letter: "O", description: "Program number" },
  { letter: "P", description: "Dwell time / parameter", unit: "ms" },
  { letter: "Q", description: "Peck depth / parameter", unit: "mm", precision: 4 },
  { letter: "R", description: "Arc radius / retract plane", unit: "mm", precision: 4 },
  { letter: "S", description: "Spindle speed", unit: "RPM" },
  { letter: "T", description: "Tool number" },
  { letter: "U", description: "Incremental X (lathe)" },
  { letter: "V", description: "Incremental Y (lathe)" },
  { letter: "W", description: "Incremental Z (lathe)" },
  { letter: "X", description: "X-axis position", unit: "mm", precision: 4 },
  { letter: "Y", description: "Y-axis position", unit: "mm", precision: 4 },
  { letter: "Z", description: "Z-axis position", unit: "mm", precision: 4 },
];

const GCODE_DEFS: GCodeDef[] = [
  { code: "G0",  description: "Rapid positioning", modal: true, group: 1 },
  { code: "G1",  description: "Linear interpolation", modal: true, group: 1 },
  { code: "G2",  description: "Circular interpolation CW", modal: true, group: 1 },
  { code: "G3",  description: "Circular interpolation CCW", modal: true, group: 1 },
  { code: "G4",  description: "Dwell", modal: false },
  { code: "G10", description: "Programmable data input", modal: false },
  { code: "G17", description: "XY plane selection", modal: true, group: 2 },
  { code: "G18", description: "XZ plane selection", modal: true, group: 2 },
  { code: "G19", description: "YZ plane selection", modal: true, group: 2 },
  { code: "G20", description: "Inch mode", modal: true, group: 6 },
  { code: "G21", description: "Metric mode", modal: true, group: 6 },
  { code: "G28", description: "Return to home position", modal: false },
  { code: "G40", description: "Cancel cutter compensation", modal: true, group: 7 },
  { code: "G41", description: "Cutter compensation left", modal: true, group: 7 },
  { code: "G42", description: "Cutter compensation right", modal: true, group: 7 },
  { code: "G43", description: "Tool length compensation +", modal: true, group: 8 },
  { code: "G44", description: "Tool length compensation -", modal: true, group: 8 },
  { code: "G49", description: "Cancel tool length compensation", modal: true, group: 8 },
  { code: "G53", description: "Machine coordinate system", modal: false },
  { code: "G54", description: "Work coordinate system 1", modal: true, group: 12 },
  { code: "G55", description: "Work coordinate system 2", modal: true, group: 12 },
  { code: "G56", description: "Work coordinate system 3", modal: true, group: 12 },
  { code: "G57", description: "Work coordinate system 4", modal: true, group: 12 },
  { code: "G58", description: "Work coordinate system 5", modal: true, group: 12 },
  { code: "G59", description: "Work coordinate system 6", modal: true, group: 12 },
  { code: "G73", description: "High-speed peck drilling", modal: true, group: 9 },
  { code: "G76", description: "Fine boring cycle", modal: true, group: 9 },
  { code: "G80", description: "Cancel canned cycle", modal: true, group: 9 },
  { code: "G81", description: "Drilling cycle", modal: true, group: 9 },
  { code: "G82", description: "Spot drill / counterbore", modal: true, group: 9 },
  { code: "G83", description: "Peck drilling cycle", modal: true, group: 9 },
  { code: "G84", description: "Tapping cycle", modal: true, group: 9 },
  { code: "G85", description: "Boring cycle (feed out)", modal: true, group: 9 },
  { code: "G86", description: "Boring cycle (spindle stop)", modal: true, group: 9 },
  { code: "G90", description: "Absolute positioning", modal: true, group: 3 },
  { code: "G91", description: "Incremental positioning", modal: true, group: 3 },
  { code: "G93", description: "Inverse time feed", modal: true, group: 5 },
  { code: "G94", description: "Feed per minute", modal: true, group: 5 },
  { code: "G95", description: "Feed per revolution", modal: true, group: 5 },
  { code: "G98", description: "Return to initial point", modal: true, group: 10 },
  { code: "G99", description: "Return to R point", modal: true, group: 10 },
];

const MCODE_DEFS: GCodeDef[] = [
  { code: "M0",  description: "Program stop", modal: false },
  { code: "M1",  description: "Optional stop", modal: false },
  { code: "M2",  description: "Program end", modal: false },
  { code: "M3",  description: "Spindle on CW", modal: true, group: 7 },
  { code: "M4",  description: "Spindle on CCW", modal: true, group: 7 },
  { code: "M5",  description: "Spindle stop", modal: true, group: 7 },
  { code: "M6",  description: "Tool change", modal: false },
  { code: "M7",  description: "Mist coolant on", modal: true, group: 9 },
  { code: "M8",  description: "Flood coolant on", modal: true, group: 9 },
  { code: "M9",  description: "Coolant off", modal: true, group: 9 },
  { code: "M19", description: "Spindle orientation", modal: false },
  { code: "M30", description: "Program end and rewind", modal: false },
];

/* ------------------------------------------------------------------ */
/*  Engine class                                                       */
/* ------------------------------------------------------------------ */

class GCodeGeneratorEngine {

  private defaultModalState(): ModalState {
    return {
      motionMode: "G0",
      plane: "G17",
      units: "G21",
      positioning: "G90",
      feedRateMode: "G94",
      workOffset: "G54",
      lengthComp: "G49",
      cutterComp: "G40",
      cycleMode: "G80",
      spindleMode: "M5",
      coolantMode: "M9",
    };
  }

  private parseLine(line: string): Record<string, number> {
    const words: Record<string, number> = {};
    const clean = line.replace(/\(.*?\)/g, "").replace(/;.*$/, "").trim().toUpperCase();
    const re = /([A-Z])([+-]?\d*\.?\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(clean)) !== null) {
      words[m[1]] = parseFloat(m[2]);
    }
    return words;
  }

  private updateModalState(state: ModalState, words: Record<string, number>): void {
    const g = words["G"];
    if (g !== undefined) {
      const gs = `G${g}`;
      if ([0, 1, 2, 3].includes(g)) state.motionMode = gs;
      if ([17, 18, 19].includes(g)) state.plane = gs;
      if (g === 20 || g === 21) state.units = gs;
      if (g === 90 || g === 91) state.positioning = gs;
      if ([93, 94, 95].includes(g)) state.feedRateMode = gs;
      if (g >= 54 && g <= 59) state.workOffset = gs;
      if ([43, 44, 49].includes(g)) state.lengthComp = gs;
      if ([40, 41, 42].includes(g)) state.cutterComp = gs;
      if (g === 80 || (g >= 73 && g <= 89)) state.cycleMode = gs;
    }
    const m = words["M"];
    if (m !== undefined) {
      if ([3, 4, 5].includes(m)) state.spindleMode = `M${m}`;
      if ([7, 8, 9].includes(m)) state.coolantMode = `M${m}`;
    }
  }

  private validateLine(
    lineNum: number,
    words: Record<string, number>,
    state: ModalState,
    issues: ValidationIssue[],
  ): void {
    const g = words["G"];
    if (g === 2 || g === 3) {
      const hasIJK = words["I"] !== undefined || words["J"] !== undefined || words["K"] !== undefined;
      const hasR = words["R"] !== undefined;
      if (!hasIJK && !hasR) {
        issues.push({ line: lineNum, severity: "error", code: "ARC_NO_CENTER", message: "Arc command without I/J/K or R" });
      }
      if (hasIJK && hasR) {
        issues.push({ line: lineNum, severity: "warning", code: "ARC_IJK_AND_R", message: "Arc has both I/J/K and R; R takes precedence on most controllers" });
      }
      const hasEnd = words["X"] !== undefined || words["Y"] !== undefined || words["Z"] !== undefined;
      if (!hasEnd) {
        issues.push({ line: lineNum, severity: "warning", code: "ARC_NO_ENDPOINT", message: "Arc without explicit endpoint (full circle assumed)" });
      }
    }
    if ((g === 1 || g === 2 || g === 3) || (g === undefined && ["G1", "G2", "G3"].includes(state.motionMode))) {
      if (words["F"] !== undefined && words["F"] <= 0) {
        issues.push({ line: lineNum, severity: "error", code: "FEED_ZERO", message: "Feed rate is zero or negative" });
      }
    }
    if ((g === 1 || g === 2 || g === 3) && state.spindleMode === "M5") {
      issues.push({ line: lineNum, severity: "warning", code: "CUT_NO_SPINDLE", message: "Cutting move with spindle off" });
    }
    if (words["S"] !== undefined) {
      if (words["S"] <= 0) {
        issues.push({ line: lineNum, severity: "error", code: "SPINDLE_ZERO", message: "Spindle speed zero or negative" });
      }
      if (words["S"] > 30000) {
        issues.push({ line: lineNum, severity: "warning", code: "SPINDLE_HIGH", message: `Spindle speed ${words["S"]} RPM exceeds typical limit` });
      }
    }
    if ((g === 41 || g === 42) && words["X"] === undefined && words["Y"] === undefined) {
      issues.push({ line: lineNum, severity: "warning", code: "COMP_NO_MOTION", message: "Cutter compensation activated without motion on the same line" });
    }
  }

  validateGCode(gcode: string): {
    valid: boolean;
    issues: ValidationIssue[];
    stats: {
      lineCount: number;
      gCodeCount: number;
      mCodeCount: number;
      toolChanges: number;
      rapidMoves: number;
      feedMoves: number;
      arcMoves: number;
    };
    finalModalState: ModalState;
  } {
    const lines = gcode.split(/\r?\n/);
    const issues: ValidationIssue[] = [];
    const state = this.defaultModalState();
    let gCodeCount = 0, mCodeCount = 0, toolChanges = 0;
    let rapidMoves = 0, feedMoves = 0, arcMoves = 0;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw || raw.startsWith("(") || raw.startsWith("%") || raw.startsWith(";")) continue;
      const words = this.parseLine(raw);
      if (words["G"] !== undefined) gCodeCount++;
      if (words["M"] !== undefined) mCodeCount++;
      if (words["M"] === 6 || words["T"] !== undefined) toolChanges++;

      const g = words["G"];
      if (g === 0) rapidMoves++;
      else if (g === 1) feedMoves++;
      else if (g === 2 || g === 3) arcMoves++;
      else if (g === undefined) {
        const hasXYZ = words["X"] !== undefined || words["Y"] !== undefined || words["Z"] !== undefined;
        if (hasXYZ) {
          if (state.motionMode === "G0") rapidMoves++;
          else if (state.motionMode === "G1") feedMoves++;
          else if (state.motionMode === "G2" || state.motionMode === "G3") arcMoves++;
        }
      }
      this.validateLine(i + 1, words, state, issues);
      this.updateModalState(state, words);
    }

    return {
      valid: !issues.some(i => i.severity === "error"),
      issues,
      stats: { lineCount: lines.length, gCodeCount, mCodeCount, toolChanges, rapidMoves, feedMoves, arcMoves },
      finalModalState: state,
    };
  }

  /* ---------- Backplot parser -------------------------------------- */

  backplotGCode(gcode: string): { moves: BackplotMove[]; statistics: BackplotStats } {
    const lines = gcode.split(/\r?\n/);
    const moves: BackplotMove[] = [];
    let pos = { x: 0, y: 0, z: 0 };
    let feedRate = 0;
    let motionMode = "G0";
    let positioning = "G90";

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw || raw.startsWith("(") || raw.startsWith("%") || raw.startsWith(";")) continue;
      const words = this.parseLine(raw);
      const g = words["G"];

      if (g === 90) positioning = "G90";
      if (g === 91) positioning = "G91";
      if (g !== undefined && [0, 1, 2, 3].includes(g)) motionMode = `G${g}`;
      if (words["F"] !== undefined) feedRate = words["F"];

      const hasMotion = words["X"] !== undefined || words["Y"] !== undefined || words["Z"] !== undefined;
      if (!hasMotion && g !== 2 && g !== 3) continue;

      let tx: number, ty: number, tz: number;
      if (positioning === "G91") {
        tx = pos.x + (words["X"] ?? 0);
        ty = pos.y + (words["Y"] ?? 0);
        tz = pos.z + (words["Z"] ?? 0);
      } else {
        tx = words["X"] ?? pos.x;
        ty = words["Y"] ?? pos.y;
        tz = words["Z"] ?? pos.z;
      }

      const active = (g !== undefined && [0, 1, 2, 3].includes(g)) ? `G${g}` : motionMode;

      if (active === "G0") {
        moves.push({ type: "rapid", from: { ...pos }, to: { x: tx, y: ty, z: tz }, feedRate: 0, lineNumber: i + 1 });
      } else if (active === "G1") {
        moves.push({ type: "linear", from: { ...pos }, to: { x: tx, y: ty, z: tz }, feedRate, lineNumber: i + 1 });
      } else if (active === "G2" || active === "G3") {
        const cw = active === "G2";
        moves.push(...this.interpolateArc(pos.x, pos.y, pos.z, tx, ty, tz, words["I"], words["J"], words["K"], words["R"], cw, feedRate, i + 1));
      }
      pos = { x: tx, y: ty, z: tz };
    }
    return { moves, statistics: this.calcStats(moves) };
  }

  private interpolateArc(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    i: number | undefined, j: number | undefined, k: number | undefined,
    r: number | undefined,
    clockwise: boolean, feedRate: number, lineNumber: number,
  ): BackplotMove[] {
    const moves: BackplotMove[] = [];
    let cx: number, cy: number, radius: number;

    if (r !== undefined) {
      const dx = x2 - x1, dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return moves;
      const rAbs = Math.abs(r);
      const h2 = rAbs * rAbs - (dist / 2) ** 2;
      const h = h2 > 0 ? Math.sqrt(h2) : 0;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const sign = (clockwise ? 1 : -1) * (r < 0 ? -1 : 1);
      cx = mx + sign * h * (-dy / dist);
      cy = my + sign * h * (dx / dist);
      radius = rAbs;
    } else {
      cx = x1 + (i ?? 0);
      cy = y1 + (j ?? 0);
      radius = Math.sqrt((x1 - cx) ** 2 + (y1 - cy) ** 2);
    }

    const sa = Math.atan2(y1 - cy, x1 - cx);
    const ea = Math.atan2(y2 - cy, x2 - cx);
    let sweep = ea - sa;
    if (clockwise) { if (sweep > 0) sweep -= Math.PI * 2; }
    else { if (sweep < 0) sweep += Math.PI * 2; }

    const segs = Math.max(12, Math.abs(Math.round(sweep / (Math.PI / 18))));
    const dZ = (z2 - z1) / segs;
    let px = x1, py = y1, pz = z1;

    for (let s = 1; s <= segs; s++) {
      const angle = sa + sweep * (s / segs);
      const nx = cx + radius * Math.cos(angle);
      const ny = cy + radius * Math.sin(angle);
      const nz = z1 + dZ * s;
      moves.push({
        type: "arc",
        from: { x: px, y: py, z: pz },
        to: { x: nx, y: ny, z: nz },
        feedRate, lineNumber,
        arcData: { center: { x: cx, y: cy }, radius, clockwise },
      });
      px = nx; py = ny; pz = nz;
    }
    return moves;
  }

  private calcStats(moves: BackplotMove[]): BackplotStats {
    let rapidDist = 0, feedDist = 0, machTime = 0;
    let mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity, mnZ = Infinity, mxZ = -Infinity;

    for (const m of moves) {
      const d = Math.sqrt((m.to.x - m.from.x) ** 2 + (m.to.y - m.from.y) ** 2 + (m.to.z - m.from.z) ** 2);
      if (m.type === "rapid") rapidDist += d;
      else { feedDist += d; if (m.feedRate > 0) machTime += d / m.feedRate; }
      mnX = Math.min(mnX, m.from.x, m.to.x); mxX = Math.max(mxX, m.from.x, m.to.x);
      mnY = Math.min(mnY, m.from.y, m.to.y); mxY = Math.max(mxY, m.from.y, m.to.y);
      mnZ = Math.min(mnZ, m.from.z, m.to.z); mxZ = Math.max(mxZ, m.from.z, m.to.z);
    }
    return {
      totalMoves: moves.length, rapidDistance: rapidDist, feedDistance: feedDist,
      totalDistance: rapidDist + feedDist, machiningTime: machTime,
      boundingBox: { min: { x: mnX, y: mnY, z: mnZ }, max: { x: mxX, y: mxY, z: mxZ } },
    };
  }

  /* ---------- G-code Reference / Snippet Generator ----------------- */

  generateReference(params: {
    query?: string;
    code?: string;
    type?: "gcode" | "mcode" | "address" | "skeleton";
  }): any {
    const { query, code, type } = params;

    if (code) {
      const upper = code.toUpperCase();
      const gMatch = GCODE_DEFS.find(d => d.code === upper);
      if (gMatch) return { found: true, ...gMatch, category: "G-code" };
      const mMatch = MCODE_DEFS.find(d => d.code === upper);
      if (mMatch) return { found: true, ...mMatch, category: "M-code" };
      const aMatch = ADDRESS_CODES.find(d => d.letter === upper.replace(/\d/g, ""));
      if (aMatch) return { found: true, ...aMatch, category: "address" };
      return { found: false, code, message: `Unknown code: ${code}` };
    }

    if (query) {
      const q = query.toLowerCase();
      const gMatches = GCODE_DEFS.filter(d => d.description.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
      const mMatches = MCODE_DEFS.filter(d => d.description.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
      const aMatches = ADDRESS_CODES.filter(d => d.description.toLowerCase().includes(q) || d.letter.toLowerCase().includes(q));
      return { gCodes: gMatches, mCodes: mMatches, addressCodes: aMatches, total: gMatches.length + mMatches.length + aMatches.length };
    }

    if (type === "gcode") return { gCodes: GCODE_DEFS, total: GCODE_DEFS.length };
    if (type === "mcode") return { mCodes: MCODE_DEFS, total: MCODE_DEFS.length };
    if (type === "address") return { addressCodes: ADDRESS_CODES, total: ADDRESS_CODES.length };

    if (type === "skeleton") {
      return {
        skeleton: [
          "%", "O0001 (PROGRAM NAME)", "(MATERIAL: ALUMINUM 6061-T6)",
          "(TOOL: 12MM 3FL CARBIDE ENDMILL)", "",
          "G21 G90 G17 (METRIC, ABSOLUTE, XY PLANE)",
          "G54 (WORK COORDINATE SYSTEM 1)", "",
          "T1 M6 (TOOL CHANGE)", "S10000 M3 (SPINDLE ON CW)",
          "G43 H1 Z50. (TOOL LENGTH COMP)", "M8 (COOLANT ON)", "",
          "G0 X0. Y0. (RAPID TO START)", "G0 Z5. (APPROACH HEIGHT)",
          "G1 Z-2. F500 (PLUNGE)", "G1 X100. F1000 (CUT)",
          "G1 Y50. (CUT)", "G1 X0. (CUT)", "G1 Y0. (CUT)", "",
          "G0 Z50. (RETRACT)", "M9 (COOLANT OFF)", "M5 (SPINDLE OFF)",
          "G28 G91 Z0. (HOME Z)", "G28 X0. Y0. (HOME XY)",
          "M30 (PROGRAM END)", "%",
        ].join("\n"),
        description: "Standard CNC milling program skeleton with safe start/end blocks",
      };
    }

    return {
      gCodes: GCODE_DEFS.length, mCodes: MCODE_DEFS.length,
      addressCodes: ADDRESS_CODES.length,
      modalGroups: [...new Set(GCODE_DEFS.filter(d => d.group).map(d => d.group))].length,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton + action dispatcher                                      */
/* ------------------------------------------------------------------ */

export const gcodeGenerator = new GCodeGeneratorEngine();

export function executeGCodeAction(action: string, params: Record<string, any> = {}): any {
  switch (action) {
    case "validate_gcode":
      return gcodeGenerator.validateGCode(params.gcode ?? params.program ?? "");
    case "backplot_gcode":
      return gcodeGenerator.backplotGCode(params.gcode ?? params.program ?? "");
    case "generate_gcode":
      return gcodeGenerator.generateReference(params);
    default:
      return { error: `Unknown GCodeGenerator action: ${action}` };
  }
}
