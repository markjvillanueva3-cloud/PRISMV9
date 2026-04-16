/**
 * GCodeVerificationEngine — L2-P2 CAD/CAM Layer
 *
 * Verifies generated G-code for syntax correctness and physics safety.
 * Supports Fanuc, Siemens, Heidenhain, Mazak, and Haas controller dialects.
 * Performs machine-limit enforcement, motion-continuity analysis, safety
 * checks (rapid plunge, spindle state, coolant), and novel-algorithm-specific
 * validation (PTDC, VCER, TGAR).
 *
 * Actions: gcode_verify
 */

// ============================================================================
// TYPES
// ============================================================================

/** Atomic value wrapper used across PRISM engines. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

/** Supported CNC controller dialects for syntax validation. */
export type ControllerDialect = "fanuc" | "siemens" | "heidenhain" | "mazak" | "haas";

/** Machine travel and speed limits for envelope checking. */
export interface MachineLimits {
  max_rpm: number;
  max_feed_mmmin: number;
  x_travel_mm: [number, number];
  y_travel_mm: [number, number];
  z_travel_mm: [number, number];
  a_range_deg?: [number, number];
  c_range_deg?: [number, number];
}

/** Input configuration for G-code verification. */
export interface GCodeVerificationInput {
  /** Complete G-code program text. */
  gcode: string;
  /** CNC controller dialect — affects syntax validation rules. Default: "fanuc". */
  controller?: ControllerDialect;
  /** Physical machine limits for envelope/speed checks. */
  machine_limits?: MachineLimits;
  /** Tool geometry for clearance validation. */
  tool?: { diameter_mm: number; length_mm: number };
  /** If set, applies algorithm-specific checks (PTDC, VCER, TGAR). */
  novel_algorithm?: string;
  /** Safe Z height for tool change validation. Default: 50mm. */
  safe_z_mm?: number;
}

/**
 * A single verification finding — error (blocking) or warning (advisory).
 * Rule IDs: SYNTAX-001..006, LIMIT-001..007, SAFETY-001..004, NOVEL-001..003.
 */
export interface VerificationIssue {
  line: number;
  code: string;
  rule: string;
  message: string;
  severity: "error" | "warning";
}

/** Bounding box of all programmed motion coordinates. */
export interface WorkEnvelope {
  x_min: number; x_max: number;
  y_min: number; y_max: number;
  z_min: number; z_max: number;
}

export interface GCodeVerificationResult {
  valid: boolean;
  errors: VerificationIssue[];
  warnings: VerificationIssue[];
  statistics: {
    line_count: number; motion_lines: number; rapid_lines: number; comment_lines: number;
    max_feed_used: number; max_rpm_used: number; work_envelope: WorkEnvelope;
  };
  motion_continuity: { continuous: boolean; gaps: { from_line: number; to_line: number; gap_mm: number }[] };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/** Internal parsed representation of a single G-code line. */
interface ParsedLine {
  idx: number;
  trimmed: string;
  is_comment: boolean;
  is_blank: boolean;
  g_codes: string[];
  x?: number; y?: number; z?: number;
  a?: number; c?: number;
  f?: number; s?: number;
  is_rapid: boolean;
  is_feed: boolean;
  is_arc: boolean;
  has_tc: boolean;
}

const RE: Record<string, RegExp> = {
  x: /X(-?[\d.]+)/i, y: /Y(-?[\d.]+)/i, z: /Z(-?[\d.]+)/i,
  a: /A(-?[\d.]+)/i, c: /C(-?[\d.]+)/i, f: /F(-?[\d.]+)/i, s: /S(\d+)/i,
};

function pn(line: string, k: string): number | undefined {
  const m = line.match(RE[k]); return m ? parseFloat(m[1]) : undefined;
}

function parseLine(raw: string, idx: number): ParsedLine {
  const t = raw.trim();
  const isCmt = t.startsWith("(") || t.startsWith(";") || t.startsWith("%") || t.length === 0;
  const codes = isCmt ? [] : (t.match(/[GM]\d+(\.\d+)?/gi) || []).map(c => c.toUpperCase());
  const has = (cs: string[]) => codes.some(c => cs.includes(c));
  return {
    idx, trimmed: t, is_comment: isCmt && t.length > 0, is_blank: t.length === 0, g_codes: codes,
    x: pn(t, "x"), y: pn(t, "y"), z: pn(t, "z"), a: pn(t, "a"), c: pn(t, "c"),
    f: pn(t, "f"), s: pn(t, "s"),
    is_rapid: has(["G0", "G00"]), is_feed: has(["G1", "G01"]),
    is_arc: has(["G2", "G02", "G3", "G03"]), has_tc: has(["M6", "M06"]),
  };
}

const VALID_G = new Set(["G0","G00","G1","G01","G2","G02","G3","G03","G4","G04","G10",
  "G17","G18","G19","G20","G21","G28","G30","G40","G41","G42","G43","G43.4","G49",
  "G50","G53","G54","G55","G56","G57","G58","G59","G61","G64","G73","G76","G80",
  "G81","G82","G83","G84","G85","G86","G90","G91","G92","G94","G95","G96","G97","G98","G99"]);
const VALID_M = new Set(["M0","M00","M1","M01","M2","M02","M3","M03","M4","M04","M5","M05",
  "M6","M06","M7","M07","M8","M08","M9","M09","M19","M29","M30","M48","M49","M98","M99"]);

function issue(ln: ParsedLine, rule: string, msg: string, sev: "error" | "warning"): VerificationIssue {
  return { line: ln.idx, code: ln.trimmed, rule, message: msg, severity: sev };
}

function clampEnv(v: number, fallback: number): number {
  return Math.abs(v) === Infinity ? fallback : Math.round(v * 1000) / 1000;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** Verifies G-code programs for syntax, safety, machine limits, and continuity. */
export class GCodeVerificationEngine {

  /** Main verification entry point. */
  verify(input: GCodeVerificationInput): AtomicValue<GCodeVerificationResult> {
    const ctrl = input.controller ?? "fanuc";
    const safeZ = input.safe_z_mm ?? 50;
    const rawLines = input.gcode.split("\n");
    const lines = rawLines.map((r, i) => parseLine(r, i + 1));
    const errs: VerificationIssue[] = [], warns: VerificationIssue[] = [];

    let motionN = 0, rapidN = 0, commentN = 0, maxF = 0, maxR = 0;
    let xMn = Infinity, xMx = -Infinity, yMn = Infinity, yMx = -Infinity, zMn = Infinity, zMx = -Infinity;
    let cx = 0, cy = 0, cz = 0, spOn = false, clOn = false, lastML = 0;
    const gaps: { from_line: number; to_line: number; gap_mm: number }[] = [];

    this.checkStructure(lines, ctrl, errs, warns);

    for (const ln of lines) {
      if (ln.is_blank || ln.is_comment) { if (ln.is_comment) commentN++; continue; }
      this.checkSyntax(ln, errs);

      // Track spindle / coolant state
      const has = (cs: string[]) => ln.g_codes.some(c => cs.includes(c));
      if (has(["M3", "M03", "M4", "M04"])) spOn = true;
      if (has(["M5", "M05"])) spOn = false;
      if (has(["M7", "M07", "M8", "M08"])) clOn = true;
      if (has(["M9", "M09"])) clOn = false;

      const nx = ln.x ?? cx, ny = ln.y ?? cy, nz = ln.z ?? cz;

      if (ln.is_rapid || ln.is_feed || ln.is_arc) {
        motionN++; if (ln.is_rapid) rapidN++;
        xMn = Math.min(xMn, nx); xMx = Math.max(xMx, nx);
        yMn = Math.min(yMn, ny); yMx = Math.max(yMx, ny);
        zMn = Math.min(zMn, nz); zMx = Math.max(zMx, nz);

        // Motion continuity
        if (lastML > 0 && !ln.is_rapid && !ln.has_tc
            && (ln.x !== undefined || ln.y !== undefined || ln.z !== undefined)) {
          const d = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2 + (nz - cz) ** 2);
          if (d > 0.1) gaps.push({ from_line: lastML, to_line: ln.idx, gap_mm: Math.round(d * 1000) / 1000 });
        }

        // SAFETY-001: rapid Z plunge
        if (ln.is_rapid && nz < cz - 0.5)
          errs.push(issue(ln, "SAFETY-001", `Rapid plunge in Z by ${(cz - nz).toFixed(2)}mm — G00 must retract first`, "error"));
        // SAFETY-002: spindle off during cut
        if ((ln.is_feed || ln.is_arc) && !spOn)
          errs.push(issue(ln, "SAFETY-002", "Cutting move without spindle running (M03/M04 required)", "error"));
        // SAFETY-003: coolant off during cut
        if ((ln.is_feed || ln.is_arc) && !clOn)
          warns.push(issue(ln, "SAFETY-003", "Cutting move without coolant — recommend M07/M08", "warning"));

        lastML = ln.idx;
      }

      // SAFETY-004: tool change below safe Z
      if (ln.has_tc && cz < safeZ)
        errs.push(issue(ln, "SAFETY-004", `Tool change at Z=${cz.toFixed(1)}mm, below safe height (${safeZ}mm)`, "error"));

      if (input.machine_limits) this.checkLimits(ln, nx, ny, nz, input.machine_limits, errs);
      if (ln.f !== undefined) maxF = Math.max(maxF, ln.f);
      if (ln.s !== undefined) maxR = Math.max(maxR, ln.s);
      cx = nx; cy = ny; cz = nz;
    }

    if (input.novel_algorithm) this.checkNovel(input.novel_algorithm, lines, errs, warns);

    const result: GCodeVerificationResult = {
      valid: errs.length === 0, errors: errs, warnings: warns,
      statistics: {
        line_count: rawLines.length, motion_lines: motionN, rapid_lines: rapidN,
        comment_lines: commentN, max_feed_used: maxF, max_rpm_used: maxR,
        work_envelope: {
          x_min: clampEnv(xMn, 0), x_max: clampEnv(xMx, 0),
          y_min: clampEnv(yMn, 0), y_max: clampEnv(yMx, 0),
          z_min: clampEnv(zMn, 0), z_max: clampEnv(zMx, 0),
        },
      },
      motion_continuity: { continuous: gaps.length === 0, gaps },
    };

    return { value: result, unit: "verification_report",
      formula: "syntax + limits + safety + continuity + novel",
      confidence: errs.length === 0 ? 1.0 : 0.5 };
  }

  // --- Program structure checks ---

  private checkStructure(lines: ParsedLine[], ctrl: ControllerDialect,
    errs: VerificationIssue[], warns: VerificationIssue[]): void {
    const ne = lines.filter(l => !l.is_blank);
    if (ne.length === 0) { errs.push({ line: 1, code: "", rule: "SYNTAX-001", message: "Empty program", severity: "error" }); return; }
    const first = ne[0], last = ne[ne.length - 1];
    if (["fanuc", "haas", "mazak"].includes(ctrl) && !first.trimmed.startsWith("%") && !first.trimmed.startsWith("O"))
      warns.push(issue(first, "SYNTAX-002", `Program should start with % or O-number for ${ctrl} controller`, "warning"));
    const hasEnd = ne.some(l => l.g_codes.some(c => ["M30", "M2", "M02"].includes(c)) || l.trimmed === "%");
    if (!hasEnd) warns.push(issue(last, "SYNTAX-003", "Program missing M30/M02 end block", "warning"));
  }

  // --- Per-line syntax validation ---

  private checkSyntax(ln: ParsedLine, errs: VerificationIssue[]): void {
    const opens = (ln.trimmed.match(/\(/g) || []).length;
    const closes = (ln.trimmed.match(/\)/g) || []).length;
    if (opens !== closes) errs.push(issue(ln, "SYNTAX-004", "Unbalanced parentheses in comment", "error"));

    for (const code of ln.g_codes) {
      const isG = code.startsWith("G");
      if (!(isG ? VALID_G : VALID_M).has(code))
        errs.push(issue(ln, "SYNTAX-005", `Unrecognized ${isG ? "G" : "M"}-code: ${code}`, "error"));
    }

    if (!ln.is_comment) {
      const bad = ln.trimmed.match(/[XYZABC]([^-\d.\s])/i);
      if (bad && !/[XYZABCFGHIJKLMNOPQRSTUVW]/i.test(bad[1]))
        errs.push(issue(ln, "SYNTAX-006", `Invalid coordinate format near '${bad[0]}'`, "error"));
    }
  }

  // --- Machine limit checks ---

  private checkLimits(ln: ParsedLine, nx: number, ny: number, nz: number,
    lim: MachineLimits, errs: VerificationIssue[]): void {
    if (ln.f !== undefined && ln.f > lim.max_feed_mmmin)
      errs.push(issue(ln, "LIMIT-001", `Feed ${ln.f} mm/min exceeds max ${lim.max_feed_mmmin}`, "error"));
    if (ln.s !== undefined && ln.s > lim.max_rpm)
      errs.push(issue(ln, "LIMIT-002", `Spindle ${ln.s} RPM exceeds max ${lim.max_rpm}`, "error"));

    const axChk = (val: number | undefined, nv: number, range: [number, number], axis: string, rule: string) => {
      if (val !== undefined && (nv < range[0] || nv > range[1]))
        errs.push(issue(ln, rule, `${axis}=${nv} outside travel [${range[0]}, ${range[1]}]`, "error"));
    };
    axChk(ln.x, nx, lim.x_travel_mm, "X", "LIMIT-003");
    axChk(ln.y, ny, lim.y_travel_mm, "Y", "LIMIT-004");
    axChk(ln.z, nz, lim.z_travel_mm, "Z", "LIMIT-005");
    if (lim.a_range_deg) axChk(ln.a, ln.a ?? 0, lim.a_range_deg, "A", "LIMIT-006");
    if (lim.c_range_deg) axChk(ln.c, ln.c ?? 0, lim.c_range_deg, "C", "LIMIT-007");
  }

  // --- Novel-algorithm-specific validation ---

  private checkNovel(algo: string, lines: ParsedLine[],
    errs: VerificationIssue[], warns: VerificationIssue[]): void {
    const key = algo.toUpperCase();
    const active = lines.filter(l => !l.is_blank && !l.is_comment);

    if (key === "PTDC") {
      // Compensation offsets should be within +/-0.5mm
      let prevZ: number | undefined;
      for (const ln of active) {
        if (ln.z !== undefined && prevZ !== undefined) {
          const delta = Math.abs(ln.z - prevZ);
          if (ln.is_feed && delta > 0.5 && !ln.has_tc)
            warns.push(issue(ln, "NOVEL-001", `PTDC offset ${delta.toFixed(3)}mm exceeds ±0.5mm threshold`, "warning"));
        }
        if (ln.z !== undefined) prevZ = ln.z;
      }
    }

    if (key === "VCER") {
      // Verify retract heights between spiral passes
      let lastRZ: number | undefined;
      for (const ln of active) {
        if (ln.is_rapid && ln.z !== undefined) lastRZ = ln.z;
        if (ln.is_feed && ln.z !== undefined && ln.z < 0) {
          if (lastRZ !== undefined && lastRZ < 2.0)
            warns.push(issue(ln, "NOVEL-002", `VCER retract ${lastRZ.toFixed(1)}mm insufficient (recommend ≥2mm)`, "warning"));
          lastRZ = undefined;
        }
      }
    }

    if (key === "TGAR") {
      // Thermal zone transition feeds should ramp, not step
      let prevF: number | undefined;
      for (const ln of active) {
        if (ln.f !== undefined && prevF !== undefined) {
          const ratio = ln.f / prevF;
          if (ratio > 2.0 || ratio < 0.5)
            warns.push(issue(ln, "NOVEL-003",
              `TGAR feed step ${prevF}→${ln.f} mm/min (${ratio.toFixed(2)}x) — should ramp`, "warning"));
        }
        if (ln.f !== undefined) prevF = ln.f;
      }
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const gCodeVerificationEngine = new GCodeVerificationEngine();
