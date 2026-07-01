/**
 * GCodeTimeEstimatorEngine — JM-DIE-PROGRAM-ANALYSIS-MS0 / U-JP01
 *
 * Parses CNC G-code programs (.nc / .min / .mpf / .eia / .iso / .pim) and
 * estimates: time-in-cut, op count, tool changes, block count, rapid count,
 * cutting feed count. Supports mill/lathe/WEDM dialects.
 *
 * Time model (MS0 simple): for each cutting motion (G01/G02/G03), compute
 * dt = path_length_mm / feed_rate_mm_per_min × 60; sum across program.
 * Rapid moves (G00) modeled at MACHINE_RAPID_RATE (default 30,000 mm/min).
 *
 * Per CLAUDE.md R5: pure parser. No I/O at call time (caller passes text).
 * Per CLAUDE.md R12: empty/binary input → explicit reason field, not silent zero.
 *
 * @milestone JM-DIE-PROGRAM-ANALYSIS-MS0/U-JP01-GCODE-TIME
 * @author slot:charlie /goal-15 iter1, 2026-05-24
 */

export type Dialect = "fanuc_mill" | "mazak_lathe" | "sodick_wedm" | "auto";

export interface GCodeAnalysis {
  ok: boolean;
  dialect: Dialect;
  block_count: number;
  cutting_block_count: number;
  rapid_block_count: number;
  tool_change_count: number;
  m_code_count: number;
  /** Cutting-time estimate in seconds (G01/G02/G03 with feed). */
  time_in_cut_s: number;
  /** Rapid-positioning time in seconds (G00). */
  rapid_time_s: number;
  /** Total = time_in_cut_s + rapid_time_s + per-tool-change overhead. */
  total_time_s: number;
  /** Distinct tools called (T#). */
  tools_used: number[];
  reason?: string;
}

const DEFAULT_RAPID_RATE_MM_PER_MIN = 30_000;
const DEFAULT_TOOL_CHANGE_OVERHEAD_S = 8;
const DEFAULT_FEED_RATE_MM_PER_MIN = 500; // fallback when no F-word seen

interface ParserState {
  modal_g: number; // current modal G (0/1/2/3)
  feed: number;    // current F value
  x: number; y: number; z: number; // current position
  lastTool: number | null;
  unitsMm: boolean; // G21=mm true, G20=inch false
}

function detectDialect(text: string): Dialect {
  const upper = text.slice(0, 4000).toUpperCase();
  if (/\bG290\b|\bG291\b|\bMITSUBISHI\b|\bSODICK\b|\bON\d{3}\b/.test(upper)) return "sodick_wedm";
  if (/\bG96\b.*\bS\d+/.test(upper) || /\bX-?\d.*\bZ-?\d/.test(upper) && !/Y-?\d/.test(upper)) return "mazak_lathe";
  return "fanuc_mill";
}

function parseNumber(s: string, after: string): number | null {
  const re = new RegExp(`${after}(-?\\d+(\\.\\d+)?)`, "i");
  const m = s.match(re);
  return m ? parseFloat(m[1]) : null;
}

function distance(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): number {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const TWO_PI = Math.PI * 2;
const ARC_EPS = 1e-9; // angular tolerance for sweep normalization

/**
 * Minor/major arc length in the R-radius form (G17 XY plane assumed), with the
 * out-of-plane Z added as a helical component. R<0 selects the major arc
 * (>180deg); R>0 the minor arc. Direction (CW/CCW) does not affect length.
 * Returns the straight-line `chord` on a degenerate/full-circle endpoint so the
 * estimate is never WORSE than the prior chord-only behavior (U-QP-TIME-BUGS).
 */
function arcLengthFromR(x0: number, y0: number, x1: number, y1: number, dz: number, R: number, chord: number): number {
  const r = Math.abs(R);
  const cdx = x1 - x0, cdy = y1 - y0;
  const chordXY = Math.sqrt(cdx * cdx + cdy * cdy);
  if (chordXY <= 0 || chordXY > 2 * r) return chord; // full-circle (no endpoint move) or geometrically impossible
  const half = Math.asin((chordXY / 2) / r);
  const sweep = R < 0 ? TWO_PI - 2 * half : 2 * half;
  const arc = r * sweep;
  // Clamp >= chord: a true arc is never shorter than its chord, so the fix can
  // only ADD the length the chord undercounted (unconditional invariant).
  return Math.max(chord, Math.sqrt(arc * arc + dz * dz));
}

/**
 * True 3D length of a G2/G3 circular (or helical) move, in mm (U-QP-TIME-BUGS G7
 * fix for the arc-as-chord undercount). Prefers the IJK center-offset form in
 * whichever principal plane the offsets imply (G17 XY via I/J, G18 XZ via I/K,
 * G19 YZ via J/K); the out-of-plane axis is added linearly: sqrt(arc^2 + off^2).
 * Falls back to the R-radius form, then to the straight-line `chord` when no
 * usable arc params are present -- so a fix can only ever ADD length the chord
 * undercounted, never subtract. `cw` = true for G2 (clockwise).
 * All offsets are pre-converted to mm by the caller.
 */
function arcLengthMm(
  cw: boolean,
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
  I: number | null, J: number | null, K: number | null,
  R: number | null,
  chord: number,
): number {
  // Two in-plane center offsets define the arc plane.
  let a0: number, a1: number, b0: number, b1: number, ca: number, cb: number, off: number;
  if (I !== null && J !== null) {            // G17 XY plane
    a0 = x0; a1 = x1; b0 = y0; b1 = y1; ca = x0 + I; cb = y0 + J; off = z1 - z0;
  } else if (I !== null && K !== null) {     // G18 XZ plane (lathe)
    a0 = x0; a1 = x1; b0 = z0; b1 = z1; ca = x0 + I; cb = z0 + K; off = y1 - y0;
  } else if (J !== null && K !== null) {     // G19 YZ plane
    a0 = y0; a1 = y1; b0 = z0; b1 = z1; ca = y0 + J; cb = z0 + K; off = x1 - x0;
  } else if (R !== null && R !== 0) {        // R-radius form -> assume XY (most common)
    return arcLengthFromR(x0, y0, x1, y1, z1 - z0, R, chord);
  } else {
    return chord; // no usable arc info -> chord (prior behavior)
  }

  const radius = Math.sqrt((a0 - ca) * (a0 - ca) + (b0 - cb) * (b0 - cb));
  if (!(radius > 0)) return chord;
  const th0 = Math.atan2(b0 - cb, a0 - ca);
  const th1 = Math.atan2(b1 - cb, a1 - ca);
  let sweep = cw ? th0 - th1 : th1 - th0;
  // Normalize sweep into (0, 2pi]. A specified-endpoint arc whose start==end is a full circle.
  while (sweep <= ARC_EPS) sweep += TWO_PI;
  while (sweep > TWO_PI + ARC_EPS) sweep -= TWO_PI;
  const arc = radius * sweep;
  // Clamp >= chord: guards the "never shorter than chord" invariant even for an
  // over-specified (endpoint-off-circle) arc, where radius_start*sweep could dip
  // below the true 3D chord. Zero effect on well-formed arcs (arc >= chord always).
  return Math.max(chord, Math.sqrt(arc * arc + off * off));
}

export class GCodeTimeEstimatorEngine {
  analyze(text: string, opts: { dialect?: Dialect; machineRapidRateMmPerMin?: number; toolChangeOverheadS?: number } = {}): GCodeAnalysis {
    const empty: GCodeAnalysis = {
      ok: false, dialect: "auto", block_count: 0, cutting_block_count: 0, rapid_block_count: 0,
      tool_change_count: 0, m_code_count: 0, time_in_cut_s: 0, rapid_time_s: 0, total_time_s: 0,
      tools_used: [],
    };
    if (typeof text !== "string" || text.trim().length === 0) {
      return { ...empty, reason: "empty-or-missing-text" };
    }
    // Detect binary content (high non-printable ratio)
    let nonPrintable = 0;
    for (let i = 0; i < Math.min(text.length, 2000); i++) {
      const c = text.charCodeAt(i);
      if (c !== 9 && c !== 10 && c !== 13 && (c < 32 || c > 126)) nonPrintable++;
    }
    if (nonPrintable / Math.min(text.length, 2000) > 0.10) {
      return { ...empty, reason: "binary-input-not-gcode" };
    }

    const dialect = opts.dialect && opts.dialect !== "auto" ? opts.dialect : detectDialect(text);
    const rapidRate = opts.machineRapidRateMmPerMin ?? DEFAULT_RAPID_RATE_MM_PER_MIN;
    const tcOverhead = opts.toolChangeOverheadS ?? DEFAULT_TOOL_CHANGE_OVERHEAD_S;

    const state: ParserState = { modal_g: 0, feed: DEFAULT_FEED_RATE_MM_PER_MIN, x: 0, y: 0, z: 0, lastTool: null, unitsMm: true };
    const toolsSet = new Set<number>();
    let blocks = 0, cutting = 0, rapid = 0, toolChanges = 0, mcodes = 0;
    let timeInCutS = 0, rapidTimeS = 0;

    const lines = text.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.replace(/\(.*?\)/g, "").replace(/;.*$/, "").trim();
      if (!line || line.startsWith("%") || line.startsWith("/")) continue;
      blocks++;

      // Units
      if (/\bG20\b/i.test(line)) state.unitsMm = false;
      if (/\bG21\b/i.test(line)) state.unitsMm = true;

      // Modal G
      const gMatch = line.match(/\bG(0?[0123])\b/i);
      if (gMatch) {
        const g = parseInt(gMatch[1], 10);
        if (g === 0 || g === 1 || g === 2 || g === 3) state.modal_g = g;
      }

      // Tool change (T + M06, or just T)
      const tMatch = line.match(/\bT(\d+)/i);
      if (tMatch) {
        const tn = parseInt(tMatch[1], 10);
        toolsSet.add(tn);
        if (state.lastTool !== null && state.lastTool !== tn) {
          toolChanges++;
          rapidTimeS += tcOverhead; // model tool-change as overhead time
        } else if (state.lastTool === null) {
          toolChanges++;
        }
        state.lastTool = tn;
      }

      // M-codes
      const mMatches = line.match(/\bM\d+/gi);
      if (mMatches) mcodes += mMatches.length;

      // Feed
      const f = parseNumber(line, "F");
      if (f !== null && f > 0) state.feed = state.unitsMm ? f : f * 25.4;

      // Position
      const xN = parseNumber(line, "X");
      const yN = parseNumber(line, "Y");
      const zN = parseNumber(line, "Z");
      if (xN === null && yN === null && zN === null) continue;
      const xMm = xN !== null ? (state.unitsMm ? xN : xN * 25.4) : state.x;
      const yMm = yN !== null ? (state.unitsMm ? yN : yN * 25.4) : state.y;
      const zMm = zN !== null ? (state.unitsMm ? zN : zN * 25.4) : state.z;
      const dist = distance(state.x, state.y, state.z, xMm, yMm, zMm);

      if (state.modal_g === 0) {
        rapid++;
        if (dist > 0) rapidTimeS += (dist / rapidRate) * 60;
      } else if (state.modal_g === 1) {
        cutting++;
        const feedRate = state.feed > 0 ? state.feed : DEFAULT_FEED_RATE_MM_PER_MIN;
        if (dist > 0) timeInCutS += (dist / feedRate) * 60;
      } else if (state.modal_g === 2 || state.modal_g === 3) {
        // G02/G03 arc: use TRUE arc length, not the straight-line chord (U-QP-TIME-BUGS).
        // Arc center offsets (I/J/K) and radius (R) are in the active units -> convert to mm.
        cutting++;
        const feedRate = state.feed > 0 ? state.feed : DEFAULT_FEED_RATE_MM_PER_MIN;
        const toMm = (v: number | null) => (v === null ? null : state.unitsMm ? v : v * 25.4);
        const iMm = toMm(parseNumber(line, "I"));
        const jMm = toMm(parseNumber(line, "J"));
        const kMm = toMm(parseNumber(line, "K"));
        const rMm = toMm(parseNumber(line, "R"));
        const moveLen = arcLengthMm(state.modal_g === 2, state.x, state.y, state.z, xMm, yMm, zMm, iMm, jMm, kMm, rMm, dist);
        if (moveLen > 0) timeInCutS += (moveLen / feedRate) * 60;
      }

      state.x = xMm; state.y = yMm; state.z = zMm;
    }

    return {
      ok: true,
      dialect,
      block_count: blocks,
      cutting_block_count: cutting,
      rapid_block_count: rapid,
      tool_change_count: toolChanges,
      m_code_count: mcodes,
      time_in_cut_s: Math.round(timeInCutS * 100) / 100,
      rapid_time_s: Math.round(rapidTimeS * 100) / 100,
      total_time_s: Math.round((timeInCutS + rapidTimeS) * 100) / 100,
      tools_used: [...toolsSet].sort((a, b) => a - b),
    };
  }
}

export const gCodeTimeEstimatorEngine = new GCodeTimeEstimatorEngine();
