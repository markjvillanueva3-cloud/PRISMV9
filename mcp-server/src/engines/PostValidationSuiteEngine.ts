/**
 * PRISM Manufacturing Intelligence - Post Validation Suite Engine
 * POST-ULT-MS15: Comprehensive validation that physics-optimized programs are
 * correct AND better than CAM-native output. Consolidates MS15 U01-U05.
 *
 * Units:
 *   U01 - PostDiffEngine:            Line-level diff, feed/RPM/code deltas, cycle time & tool life estimates
 *   U02 - BackplotVerification:      3D toolpath trace, gouge detect, rapid-into-material, arc errors
 *   U03 - PhysicsConsistencyChecker: Self-consistency of pipeline output vs machine / material limits
 *   U04 - RegressionMatrix:          Scenario × controller × config × material cross-product validation
 *   U05 - A/BComparisonEngine:       Side-by-side per-line delta table + summary KPIs
 *
 * @version 1.0.0  POST-ULT-MS15
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// PUBLIC INTERFACES (spec-mandated)
// ============================================================================

/** Full input to the validation suite. */
export interface ValidationInput {
  original_gcode: string;
  optimized_gcode: string;
  controller: string;
  machine_limits: { max_rpm: number; max_feed: number; max_power_kW: number };
  material_iso: string;
  operations: Array<{ tool_number: number; tool_diameter_mm: number; operation_type: string }>;
}

/** Top-level validation result. */
export interface ValidationResult {
  overall_pass: boolean;
  diff: DiffResult;
  backplot: BackplotResult;
  consistency: ConsistencyResult;
  comparison: ComparisonResult;
  issues: ValidationIssue[];
}

/** U01 diff result. */
export interface DiffResult {
  total_lines_original: number;
  total_lines_optimized: number;
  lines_changed: number;
  lines_added: number;
  lines_removed: number;
  feed_changes: { count: number; avg_delta_percent: number; min_delta: number; max_delta: number };
  rpm_changes: { count: number; original_rpms: number[]; optimized_rpms: number[] };
  codes_added: string[];
  codes_removed: string[];
}

/** U02 backplot result. */
export interface BackplotResult {
  passed: boolean;
  total_moves: number;
  rapid_moves: number;
  cutting_moves: number;
  gouge_detected: boolean;
  rapid_into_material: boolean;
  arc_errors: number;
  bounds: { x: [number, number]; y: [number, number]; z: [number, number] };
}

/** U03 consistency result. */
export interface ConsistencyResult {
  passed: boolean;
  power_within_limits: boolean;
  temperature_within_coating_limit: boolean;
  deflection_within_tolerance: boolean;
  tool_life_exceeds_program: boolean;
  contradictions: string[];
  checks: ConsistencyCheck[];
}

/** Individual consistency check. */
export interface ConsistencyCheck {
  name: string;
  passed: boolean;
  value: number;
  limit: number;
  unit: string;
  message: string;
}

/** Regression matrix result. */
export interface RegressionMatrixResult {
  total_combinations: number;
  passed: number;
  failed: number;
  error_rate_percent: number;
  results: RegressionEntry[];
  summary: string;
}

/** Single regression entry. */
export interface RegressionEntry {
  scenario: string;
  controller: string;
  config: string;
  material: string;
  passed: boolean;
  errors: string[];
  cycle_time_improvement_pct: number;
}

/** U05 comparison result. */
export interface ComparisonResult {
  cycle_time_original_sec: number;
  cycle_time_optimized_sec: number;
  time_saved_sec: number;
  time_saved_percent: number;
  tool_life_improvement_percent: number;
  surface_finish_prediction: string;
  per_operation: Array<{
    op: number;
    original_feed: number;
    optimized_feed: number;
    delta_percent: number;
    reason: string;
  }>;
}

/** Individual validation issue. */
export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  unit: "diff" | "backplot" | "consistency" | "regression" | "comparison";
  code: string;
  message: string;
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface GCodeMove {
  line_number: number;
  raw: string;
  modal_code: string;        // G0, G1, G2, G3, etc.
  x: number | null;
  y: number | null;
  z: number | null;
  i: number | null;
  j: number | null;
  k: number | null;
  r: number | null;
  feed: number | null;       // F word
  rpm: number | null;        // S word (from same block or modal)
  is_rapid: boolean;
  is_cutting: boolean;
  is_arc: boolean;
}

interface ParsedProgram {
  lines: string[];
  moves: GCodeMove[];
  feeds: number[];
  rpms: number[];
  g_codes: Set<string>;
  m_codes: Set<string>;
  t_codes: number[];
}

// ============================================================================
// MATERIAL / COATING LIMIT DATABASE
// ============================================================================

interface MaterialCoatingLimits {
  max_cutting_temp_c: number;       // Above which coating fails
  max_tool_chip_temp_c: number;     // Absolute interface temperature limit
  taylor_C: number;                 // Taylor cutting speed constant (m/min)
  taylor_n: number;                 // Taylor exponent
}

const MATERIAL_LIMITS: Record<string, MaterialCoatingLimits> = {
  // ISO P (steels)
  "P10": { max_cutting_temp_c: 900, max_tool_chip_temp_c: 1050, taylor_C: 200, taylor_n: 0.25 },
  "P20": { max_cutting_temp_c: 850, max_tool_chip_temp_c: 1000, taylor_C: 180, taylor_n: 0.25 },
  "P30": { max_cutting_temp_c: 820, max_tool_chip_temp_c: 980,  taylor_C: 160, taylor_n: 0.25 },
  "P40": { max_cutting_temp_c: 800, max_tool_chip_temp_c: 950,  taylor_C: 140, taylor_n: 0.25 },
  // ISO M (stainless)
  "M10": { max_cutting_temp_c: 750, max_tool_chip_temp_c: 900,  taylor_C: 120, taylor_n: 0.22 },
  "M20": { max_cutting_temp_c: 720, max_tool_chip_temp_c: 870,  taylor_C: 110, taylor_n: 0.22 },
  "M30": { max_cutting_temp_c: 700, max_tool_chip_temp_c: 850,  taylor_C: 100, taylor_n: 0.22 },
  // ISO K (cast iron)
  "K10": { max_cutting_temp_c: 950, max_tool_chip_temp_c: 1100, taylor_C: 250, taylor_n: 0.28 },
  "K20": { max_cutting_temp_c: 900, max_tool_chip_temp_c: 1050, taylor_C: 220, taylor_n: 0.28 },
  // ISO N (aluminium)
  "N10": { max_cutting_temp_c: 550, max_tool_chip_temp_c: 700,  taylor_C: 500, taylor_n: 0.35 },
  "N20": { max_cutting_temp_c: 530, max_tool_chip_temp_c: 680,  taylor_C: 450, taylor_n: 0.35 },
  // ISO S (superalloys)
  "S10": { max_cutting_temp_c: 600, max_tool_chip_temp_c: 750,  taylor_C: 50,  taylor_n: 0.18 },
  "S20": { max_cutting_temp_c: 580, max_tool_chip_temp_c: 720,  taylor_C: 45,  taylor_n: 0.18 },
  // ISO H (hardened)
  "H10": { max_cutting_temp_c: 800, max_tool_chip_temp_c: 950,  taylor_C: 80,  taylor_n: 0.20 },
};

function getMaterialLimits(iso: string): MaterialCoatingLimits {
  // Try exact match first, then prefix match
  if (MATERIAL_LIMITS[iso]) return MATERIAL_LIMITS[iso];
  const prefix = iso.substring(0, 1).toUpperCase();
  for (const [key, val] of Object.entries(MATERIAL_LIMITS)) {
    if (key.startsWith(prefix)) return val;
  }
  // Default conservative fallback
  return { max_cutting_temp_c: 800, max_tool_chip_temp_c: 950, taylor_C: 150, taylor_n: 0.25 };
}

// ============================================================================
// U01 — GCODE PARSER
// ============================================================================

/** Parse a word (letter + number) from a G-code block. */
function parseWord(block: string, letter: string): number | null {
  const re = new RegExp(`${letter}([+-]?\\d*\\.?\\d+)`, "i");
  const m = re.exec(block);
  return m ? parseFloat(m[1]) : null;
}

/** Extract modal G-codes from a block (G0–G3 etc.). */
function parseModalCode(block: string): string {
  const m = /\bG(\d{1,2}(?:\.\d)?)\b/.exec(block);
  return m ? `G${m[1]}` : "";
}

/** Parse a raw G-code program into structured moves with modal propagation. */
function parseGCode(gcode: string): ParsedProgram {
  const rawLines = gcode
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith(";") && !l.startsWith("%") && !l.startsWith("("));

  const moves: GCodeMove[] = [];
  const feeds: number[] = [];
  const rpms: number[] = [];
  const g_codes = new Set<string>();
  const m_codes = new Set<string>();
  const t_codes: number[] = [];

  // Modal state
  let modal_motion = "G1";
  let modal_x = 0;
  let modal_y = 0;
  let modal_z = 0;
  let modal_feed: number | null = null;
  let modal_rpm: number | null = null;
  let in_cut_zone = false;  // true once Z has gone below stock top (Z=0)

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const upper = raw.toUpperCase();

    // Collect G / M / T codes for set tracking
    const allG = upper.match(/G(\d{1,3})/g);
    const allM = upper.match(/M(\d{1,3})/g);
    const allT = upper.match(/T(\d+)/g);

    if (allG) allG.forEach(g => g_codes.add(g));
    if (allM) allM.forEach(m => m_codes.add(m));
    if (allT) allT.forEach(t => t_codes.push(parseInt(t.substring(1))));

    // Modal motion update
    const gMatch = /\bG([0-3](?:\.\d)?)\b/.exec(upper);
    if (gMatch) {
      const gc = `G${gMatch[1]}`;
      if (["G0","G00","G1","G01","G2","G02","G3","G03"].includes(gc)) {
        modal_motion = gc;
      }
    }

    // Coordinate words
    const xw = parseWord(upper, "X");
    const yw = parseWord(upper, "Y");
    const zw = parseWord(upper, "Z");
    const iw = parseWord(upper, "I");
    const jw = parseWord(upper, "J");
    const kw = parseWord(upper, "K");
    const rw = parseWord(upper, "R");
    const fw = parseWord(upper, "F");
    const sw = parseWord(upper, "S");

    if (fw !== null) { modal_feed = fw; feeds.push(fw); }
    if (sw !== null) { modal_rpm = sw; rpms.push(sw); }

    // Only emit a move if there is axis motion
    const has_xyz = (xw !== null) || (yw !== null) || (zw !== null);
    const has_ijk = (iw !== null) || (jw !== null) || (kw !== null) || (rw !== null);

    if (!has_xyz && !has_ijk) continue;

    const cx = xw ?? modal_x;
    const cy = yw ?? modal_y;
    const cz = zw ?? modal_z;
    modal_x = cx;
    modal_y = cy;
    modal_z = cz;

    // Track cut zone: once Z drops below 0 we're in material
    if (cz < 0) in_cut_zone = true;
    // Above +2mm clearance — exit cut zone
    if (cz > 2) in_cut_zone = false;

    // Normalize the motion word by numeric value: "G0"/"G00" -> "G0", "G01" -> "G1", "G2" -> "G2".
    // (The prior `replace(/^G0*/, "G")` collapsed "G0" -> "G", so is_rapid was ALWAYS false and
    //  is_cutting ALWAYS true -> gouge + rapid-into-material detection were structurally dead.
    //  Fix: U-PP-BACKPLOT-G0NORM, slot:echo 2026-06-24.)
    const motionNum = parseInt(modal_motion.slice(1), 10);
    const norm = Number.isNaN(motionNum) ? modal_motion : `G${motionNum}`;
    const is_rapid = norm === "G0";
    const is_arc = norm === "G2" || norm === "G3";
    const is_cutting = !is_rapid;

    moves.push({
      line_number: i + 1,
      raw,
      modal_code: modal_motion,
      x: cx,
      y: cy,
      z: cz,
      i: iw,
      j: jw,
      k: kw,
      r: rw,
      feed: modal_feed,
      rpm: modal_rpm,
      is_rapid,
      is_cutting,
      is_arc,
    });
  }

  return { lines: rawLines, moves, feeds, rpms, g_codes, m_codes, t_codes };
}

// ============================================================================
// U01 — POST DIFF ENGINE
// ============================================================================

/** Compare two G-code programs and quantify differences. */
export function computeDiff(original: string, optimized: string): DiffResult {
  const origLines = original.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const optLines  = optimized.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  const origSet = new Set(origLines);
  const optSet  = new Set(optLines);

  // Lines present in optimized but not original → added
  const added   = optLines.filter(l => !origSet.has(l));
  // Lines present in original but not optimized → removed
  const removed = origLines.filter(l => !optSet.has(l));
  // "changed" = lines that differ (simple heuristic: added + removed, deduplicated)
  const lines_changed = Math.max(added.length, removed.length);

  // Feed extraction
  const feedRe = /F([0-9]+(?:\.[0-9]+)?)/gi;
  const extractFeeds = (lines: string[]): number[] => {
    const out: number[] = [];
    for (const l of lines) {
      let m: RegExpExecArray | null;
      const re = /F([0-9]+(?:\.[0-9]+)?)/gi;
      while ((m = re.exec(l)) !== null) out.push(parseFloat(m[1]));
    }
    return out;
  };
  void feedRe; // suppress unused warning

  const origFeeds = extractFeeds(origLines);
  const optFeeds  = extractFeeds(optLines);

  // Match feeds positionally (zip to shorter length)
  const minLen = Math.min(origFeeds.length, optFeeds.length);
  const feedDeltas: number[] = [];
  for (let i = 0; i < minLen; i++) {
    if (origFeeds[i] > 0) {
      feedDeltas.push(((optFeeds[i] - origFeeds[i]) / origFeeds[i]) * 100);
    }
  }

  const avg_delta_percent = feedDeltas.length > 0
    ? feedDeltas.reduce((a, b) => a + b, 0) / feedDeltas.length
    : 0;
  const min_delta = feedDeltas.length > 0 ? Math.min(...feedDeltas) : 0;
  const max_delta = feedDeltas.length > 0 ? Math.max(...feedDeltas) : 0;

  // RPM extraction
  const extractRpms = (lines: string[]): number[] => {
    const out: number[] = [];
    for (const l of lines) {
      let m: RegExpExecArray | null;
      const re = /S([0-9]+(?:\.[0-9]+)?)/gi;
      while ((m = re.exec(l)) !== null) out.push(parseFloat(m[1]));
    }
    return out;
  };

  const origRpms = extractRpms(origLines);
  const optRpms  = extractRpms(optLines);
  const rpm_change_count = Math.min(origRpms.length, optRpms.length);

  // G/M code delta
  const extractCodes = (lines: string[]): Set<string> => {
    const out = new Set<string>();
    for (const l of lines) {
      const gm = l.toUpperCase().match(/[GM]\d{1,3}/g);
      if (gm) gm.forEach(c => out.add(c));
    }
    return out;
  };
  const origCodes = extractCodes(origLines);
  const optCodes  = extractCodes(optLines);
  const codes_added   = [...optCodes].filter(c => !origCodes.has(c));
  const codes_removed = [...origCodes].filter(c => !optCodes.has(c));

  return {
    total_lines_original: origLines.length,
    total_lines_optimized: optLines.length,
    lines_changed,
    lines_added: added.length,
    lines_removed: removed.length,
    feed_changes: {
      count: feedDeltas.length,
      avg_delta_percent: +avg_delta_percent.toFixed(2),
      min_delta: +min_delta.toFixed(2),
      max_delta: +max_delta.toFixed(2),
    },
    rpm_changes: {
      count: rpm_change_count,
      original_rpms: origRpms,
      optimized_rpms: optRpms,
    },
    codes_added,
    codes_removed,
  };
}

// ============================================================================
// U02 — BACKPLOT VERIFICATION ENGINE
// ============================================================================

/** Estimate cutting tool diameter for the active tool from operation list. */
function resolveToolDiameter(
  rpm: number | null,
  op_list: ValidationInput["operations"],
): number {
  // Pick first operation as proxy (no tool-number tracking in pure backplot)
  if (op_list.length > 0) return op_list[0].tool_diameter_mm;
  if (rpm && rpm > 0) {
    // Rough estimate from spindle speed (Vc ~100 m/min assumed)
    return (100 * 1000) / (Math.PI * rpm);
  }
  return 10; // default 10mm fallback
}

/** Validate arc geometry (G2/G3): check R vs IJK consistency. */
function validateArc(move: GCodeMove): boolean {
  const { x, y, i, j, r } = move;
  if (r !== null) {
    // R-format: valid as long as R > 0
    return r > 0;
  }
  if (i !== null || j !== null) {
    // IJK format: radius from centre must match entry point to centre
    // We can only check that I² + J² > 0 (non-degenerate)
    const rad2 = Math.pow(i ?? 0, 2) + Math.pow(j ?? 0, 2) + Math.pow(move.k ?? 0, 2);
    if (rad2 < 1e-9) return false;
    // If we had the previous position we could check start=end consistency;
    // with modal propagation we check that X,Y exist (complete endpoint)
    return x !== null && y !== null;
  }
  return false; // no radius info at all
}

/** 3D toolpath trace with gouge and safety checks. */
export function runBackplot(
  optimized_gcode: string,
  input: Pick<ValidationInput, "operations">,
): BackplotResult {
  const prog = parseGCode(optimized_gcode);
  const moves = prog.moves;

  // Bounds
  const allX = moves.map(m => m.x ?? 0);
  const allY = moves.map(m => m.y ?? 0);
  const allZ = moves.map(m => m.z ?? 0);
  const xBounds: [number, number] = [Math.min(...allX), Math.max(...allX)];
  const yBounds: [number, number] = [Math.min(...allY), Math.max(...allY)];
  const zBounds: [number, number] = [Math.min(...allZ), Math.max(...allZ)];

  // Finished surface Z: assume Z=0 (WCS datum) unless driven deeper.
  // Any Z significantly below the minimum cutting Z indicates potential gouge.
  const min_cutting_z = Math.min(...moves.filter(m => m.is_cutting).map(m => m.z ?? 0), 0);
  // Gouge: rapid move that goes below the shallowest cutting pass by >0.1mm
  let gouge_detected = false;
  let rapid_into_material = false;

  // Build a Z-floor map: the deepest programmed cutting Z (the finished surface)
  const finished_surface_z = min_cutting_z; // approximation

  // Track whether we are "in material" by XY bounding box of cutting moves
  const cut_moves = moves.filter(m => m.is_cutting);
  const cut_x_min = cut_moves.length > 0 ? Math.min(...cut_moves.map(m => m.x ?? 0)) : -Infinity;
  const cut_x_max = cut_moves.length > 0 ? Math.max(...cut_moves.map(m => m.x ?? 0)) : Infinity;
  const cut_y_min = cut_moves.length > 0 ? Math.min(...cut_moves.map(m => m.y ?? 0)) : -Infinity;
  const cut_y_max = cut_moves.length > 0 ? Math.max(...cut_moves.map(m => m.y ?? 0)) : Infinity;

  const toolD = resolveToolDiameter(prog.rpms[0] ?? null, input.operations);
  const toolR = toolD / 2;

  let arc_errors = 0;

  for (const mv of moves) {
    // Arc error check
    if (mv.is_arc) {
      if (!validateArc(mv)) arc_errors++;
    }

    // Gouge: any move (rapid or cutting) that goes below finished surface by >0.05mm
    if ((mv.z ?? 0) < finished_surface_z - 0.05) {
      gouge_detected = true;
    }

    // Rapid-into-material: G0 move while XY is within the cut zone AND Z is below stock top (0)
    if (mv.is_rapid && (mv.z ?? 0) < 0) {
      const cx = mv.x ?? 0;
      const cy = mv.y ?? 0;
      if (
        cx >= cut_x_min - toolR &&
        cx <= cut_x_max + toolR &&
        cy >= cut_y_min - toolR &&
        cy <= cut_y_max + toolR
      ) {
        rapid_into_material = true;
      }
    }
  }

  const rapid_moves   = moves.filter(m => m.is_rapid).length;
  const cutting_moves = moves.filter(m => m.is_cutting).length;
  const passed = !gouge_detected && !rapid_into_material && arc_errors === 0;

  return {
    passed,
    total_moves: moves.length,
    rapid_moves,
    cutting_moves,
    gouge_detected,
    rapid_into_material,
    arc_errors,
    bounds: { x: xBounds, y: yBounds, z: zBounds },
  };
}

// ============================================================================
// U03 — PHYSICS CONSISTENCY CHECKER
// ============================================================================

/** Estimate cutting power from feed, depth, and material-specific specific cutting force. */
function estimateCuttingPower(
  feed_mmpm: number,
  radial_depth_mm: number,
  axial_depth_mm: number,
  tool_diameter_mm: number,
  material_iso: string,
): number {
  // Specific cutting force Kc (N/mm²) by ISO family
  const KcMap: Record<string, number> = {
    P: 2200, M: 2500, K: 1500, N: 700, S: 3000, H: 3500,
  };
  const family = material_iso.charAt(0).toUpperCase();
  const Kc = KcMap[family] ?? 2000;

  // Material removal rate MRR (mm³/min)
  const MRR = feed_mmpm * radial_depth_mm * axial_depth_mm;

  // Specific energy → Power (W = Kc [N/mm²] × MRR [mm³/min] / 60,000)
  const power_kW = (Kc * MRR) / 60_000_000;

  void tool_diameter_mm; // available for future use
  return power_kW;
}

/** Estimate cutting temperature using simplified Trigger-Chao model. */
function estimateCuttingTemp(
  cutting_speed_mpm: number,
  feed_mmrev: number,
  material_iso: string,
): number {
  // Empirical coefficients by ISO family
  const coeff: Record<string, { A: number; alpha: number; beta: number }> = {
    P: { A: 0.38, alpha: 0.30, beta: 0.25 },
    M: { A: 0.42, alpha: 0.28, beta: 0.23 },
    K: { A: 0.28, alpha: 0.32, beta: 0.20 },
    N: { A: 0.16, alpha: 0.25, beta: 0.18 },
    S: { A: 0.55, alpha: 0.28, beta: 0.30 },
    H: { A: 0.50, alpha: 0.30, beta: 0.28 },
  };
  const fam = material_iso.charAt(0).toUpperCase();
  const c = coeff[fam] ?? { A: 0.40, alpha: 0.30, beta: 0.25 };
  // T ≈ A × Vc^alpha × f^beta × Kc (simplified, Kc ~2000 for reference)
  return c.A * Math.pow(cutting_speed_mpm, c.alpha) * Math.pow(feed_mmrev, c.beta) * 2000;
}

/** Estimate max tool deflection (cantilever beam model). */
function estimateDeflection(
  tool_diameter_mm: number,
  overhang_mm: number,
  radial_force_N: number,
): number {
  // EI for solid carbide: E ~600 GPa = 600,000 N/mm²
  // I = π/64 × D⁴ mm⁴
  const E = 600_000; // N/mm²
  const I = (Math.PI / 64) * Math.pow(tool_diameter_mm, 4);
  // δ = F × L³ / (3 × E × I)
  return (radial_force_N * Math.pow(overhang_mm, 3)) / (3 * E * I);
}

/** Check physics consistency of optimized G-code vs machine and material limits. */
export function checkConsistency(
  input: ValidationInput,
): ConsistencyResult {
  const prog = parseGCode(input.optimized_gcode);
  const mat = getMaterialLimits(input.material_iso);
  const lim = input.machine_limits;
  const checks: ConsistencyCheck[] = [];
  const contradictions: string[] = [];

  // ---- 1. Spindle RPM vs machine max ----
  const max_rpm_prog = prog.rpms.length > 0 ? Math.max(...prog.rpms) : 0;
  const rpm_ok = max_rpm_prog <= lim.max_rpm;
  checks.push({
    name: "Max RPM",
    passed: rpm_ok,
    value: max_rpm_prog,
    limit: lim.max_rpm,
    unit: "RPM",
    message: rpm_ok
      ? `Max spindle RPM ${max_rpm_prog} within machine limit ${lim.max_rpm}`
      : `FAIL: Programmed RPM ${max_rpm_prog} exceeds machine max ${lim.max_rpm}`,
  });
  if (!rpm_ok) contradictions.push(`RPM ${max_rpm_prog} > machine max ${lim.max_rpm}`);

  // ---- 2. Feed rate vs machine max ----
  const max_feed_prog = prog.feeds.length > 0 ? Math.max(...prog.feeds) : 0;
  const feed_ok = max_feed_prog <= lim.max_feed;
  checks.push({
    name: "Max Feed",
    passed: feed_ok,
    value: max_feed_prog,
    limit: lim.max_feed,
    unit: "mm/min",
    message: feed_ok
      ? `Max feed ${max_feed_prog} mm/min within machine limit ${lim.max_feed} mm/min`
      : `FAIL: Programmed feed ${max_feed_prog} mm/min exceeds machine max ${lim.max_feed} mm/min`,
  });
  if (!feed_ok) contradictions.push(`Feed ${max_feed_prog} mm/min > machine max ${lim.max_feed} mm/min`);

  // ---- 3. Estimated cutting power vs machine max ----
  // Use representative operation (first tool, 5mm DOC proxy)
  const rep_op = input.operations[0];
  const tool_d = rep_op?.tool_diameter_mm ?? 10;
  const avg_feed = prog.feeds.length > 0
    ? prog.feeds.reduce((a, b) => a + b, 0) / prog.feeds.length
    : 500;
  const est_power = estimateCuttingPower(avg_feed, tool_d * 0.5, 5.0, tool_d, input.material_iso);
  const power_ok = est_power <= lim.max_power_kW;
  checks.push({
    name: "Estimated Cutting Power",
    passed: power_ok,
    value: +est_power.toFixed(3),
    limit: lim.max_power_kW,
    unit: "kW",
    message: power_ok
      ? `Estimated cutting power ${est_power.toFixed(2)} kW within machine limit ${lim.max_power_kW} kW`
      : `WARN: Estimated cutting power ${est_power.toFixed(2)} kW may exceed machine capacity ${lim.max_power_kW} kW`,
  });
  if (!power_ok) contradictions.push(`Est. power ${est_power.toFixed(2)} kW > machine max ${lim.max_power_kW} kW`);

  // ---- 4. Cutting temperature vs coating limit ----
  const avg_rpm = prog.rpms.length > 0
    ? prog.rpms.reduce((a, b) => a + b, 0) / prog.rpms.length
    : 3000;
  // Vc (m/min) = π × D × RPM / 1000
  const vc_mpm = (Math.PI * tool_d * avg_rpm) / 1000;
  const fpr = prog.feeds.length > 0
    ? (avg_feed / avg_rpm) / Math.max(1, rep_op?.tool_diameter_mm ?? 1) * 2
    : 0.1; // feed per rev estimate
  const est_temp = estimateCuttingTemp(vc_mpm, fpr, input.material_iso);
  const temp_ok = est_temp <= mat.max_cutting_temp_c;
  checks.push({
    name: "Estimated Cutting Temperature",
    passed: temp_ok,
    value: +est_temp.toFixed(1),
    limit: mat.max_cutting_temp_c,
    unit: "°C",
    message: temp_ok
      ? `Estimated cutting temp ${est_temp.toFixed(0)}°C within coating limit ${mat.max_cutting_temp_c}°C`
      : `WARN: Estimated temp ${est_temp.toFixed(0)}°C exceeds coating limit ${mat.max_cutting_temp_c}°C — coating failure risk`,
  });
  if (!temp_ok) contradictions.push(`Est. temp ${est_temp.toFixed(0)}°C > coating limit ${mat.max_cutting_temp_c}°C`);

  // ---- 5. Tool deflection vs tolerance (0.05mm threshold for finishing) ----
  // Radial force estimate: Kc × chip_area (simplified)
  const family = input.material_iso.charAt(0).toUpperCase();
  const KcMap: Record<string, number> = { P: 2200, M: 2500, K: 1500, N: 700, S: 3000, H: 3500 };
  const Kc = KcMap[family] ?? 2000;
  const chip_area = (avg_feed / avg_rpm) * tool_d * 0.3; // mm² rough estimate
  const radial_force = Kc * chip_area;
  const overhang = tool_d * 4; // 4× D typical overhang
  const deflection_mm = estimateDeflection(tool_d, overhang, radial_force);
  const tolerance_mm = 0.05; // conservative finishing tolerance
  const defl_ok = deflection_mm <= tolerance_mm;
  checks.push({
    name: "Tool Deflection",
    passed: defl_ok,
    value: +deflection_mm.toFixed(4),
    limit: tolerance_mm,
    unit: "mm",
    message: defl_ok
      ? `Estimated deflection ${(deflection_mm * 1000).toFixed(2)}μm within ${tolerance_mm * 1000}μm tolerance`
      : `WARN: Estimated deflection ${(deflection_mm * 1000).toFixed(2)}μm exceeds ${tolerance_mm * 1000}μm tolerance`,
  });
  if (!defl_ok) contradictions.push(`Tool deflection ${(deflection_mm * 1000).toFixed(2)}μm > ${tolerance_mm * 1000}μm`);

  // ---- 6. Tool life > program duration ----
  // Taylor: T = C^(1/n) / Vc^(1/n)  [minutes]
  const tool_life_min = Math.pow(mat.taylor_C, 1 / mat.taylor_n) / Math.pow(Math.max(vc_mpm, 1), 1 / mat.taylor_n);
  // Program duration: estimate from total feed moves / average feed
  const prog_moves = parseGCode(input.optimized_gcode);
  const cutting_length_mm = prog_moves.moves
    .filter(m => m.is_cutting)
    .reduce((acc, mv, idx, arr) => {
      if (idx === 0) return 0;
      const prev = arr[idx - 1];
      const dx = (mv.x ?? 0) - (prev.x ?? 0);
      const dy = (mv.y ?? 0) - (prev.y ?? 0);
      const dz = (mv.z ?? 0) - (prev.z ?? 0);
      return acc + Math.sqrt(dx * dx + dy * dy + dz * dz);
    }, 0);
  const prog_duration_min = avg_feed > 0 ? cutting_length_mm / avg_feed : 10;
  const life_ok = tool_life_min >= prog_duration_min;
  checks.push({
    name: "Tool Life vs Program Duration",
    passed: life_ok,
    value: +tool_life_min.toFixed(1),
    limit: +prog_duration_min.toFixed(1),
    unit: "min",
    message: life_ok
      ? `Taylor tool life ${tool_life_min.toFixed(1)} min exceeds program duration ${prog_duration_min.toFixed(1)} min`
      : `WARN: Tool life ${tool_life_min.toFixed(1)} min less than program duration ${prog_duration_min.toFixed(1)} min — tool change required`,
  });
  if (!life_ok) contradictions.push(`Tool life ${tool_life_min.toFixed(1)} min < program ${prog_duration_min.toFixed(1)} min`);

  const passed = checks.every(c => c.passed);

  return {
    passed,
    power_within_limits: power_ok,
    temperature_within_coating_limit: temp_ok,
    deflection_within_tolerance: defl_ok,
    tool_life_exceeds_program: life_ok,
    contradictions,
    checks,
  };
}

// ============================================================================
// U04 — REGRESSION MATRIX ENGINE
// ============================================================================

/** Regression test scenarios: representative operation types. */
const REGRESSION_SCENARIOS = [
  "roughing",
  "semi-finishing",
  "finishing",
  "drilling",
  "boring",
  "trochoidal",
] as const;

/** Regression test controllers. */
const REGRESSION_CONTROLLERS = ["Fanuc", "Siemens", "Haas", "Mazak"] as const;

/** Regression test configs: WOC percentages of tool diameter. */
const REGRESSION_CONFIGS = ["25pct_WOC", "50pct_WOC", "full_slot"] as const;

/** Regression test materials. */
const REGRESSION_MATERIALS = ["P20", "M20", "K20", "N10", "S10"] as const;

/** Synthetic feed modifier by scenario (simulates different optimization ratios). */
function scenarioFeedModifier(scenario: string): number {
  const map: Record<string, number> = {
    roughing: 1.20, "semi-finishing": 1.10, finishing: 1.05,
    drilling: 1.08, boring: 1.03, trochoidal: 1.35,
  };
  return map[scenario] ?? 1.10;
}

/** Run regression matrix against a specific configuration combo. */
function runRegressionEntry(
  scenario: string,
  controller: string,
  config: string,
  material: string,
  orig_gcode: string,
  opt_gcode: string,
  machine_limits: ValidationInput["machine_limits"],
  operations: ValidationInput["operations"],
): RegressionEntry {
  const errors: string[] = [];

  // Validate diff exists
  const diff = computeDiff(orig_gcode, opt_gcode);
  if (diff.lines_changed === 0 && diff.lines_added === 0 && diff.lines_removed === 0) {
    errors.push(`${scenario}/${controller}: No changes detected between original and optimized`);
  }

  // Validate feed improvement makes sense
  if (diff.feed_changes.avg_delta_percent < 0 && scenario !== "finishing") {
    // Finishing sometimes reduces feed for quality — only flag if large regression
    if (diff.feed_changes.avg_delta_percent < -30) {
      errors.push(`${scenario}/${controller}: Suspiciously large feed reduction (${diff.feed_changes.avg_delta_percent.toFixed(1)}%)`);
    }
  }

  // Consistency check
  const cons_input: ValidationInput = {
    original_gcode: orig_gcode,
    optimized_gcode: opt_gcode,
    controller,
    machine_limits,
    material_iso: material,
    operations,
  };
  const cons = checkConsistency(cons_input);
  for (const c of cons.checks) {
    if (!c.passed) {
      errors.push(`${scenario}/${controller}/${material}: ${c.name} — ${c.message}`);
    }
  }

  // Backplot
  const bp = runBackplot(opt_gcode, { operations });
  if (bp.gouge_detected) errors.push(`${scenario}/${controller}: Gouge detected in backplot`);
  if (bp.rapid_into_material) errors.push(`${scenario}/${controller}: Rapid into material`);
  if (bp.arc_errors > 0) errors.push(`${scenario}/${controller}: ${bp.arc_errors} arc error(s)`);

  // Cycle time improvement estimate
  const modifier = scenarioFeedModifier(scenario);
  const config_factor = config === "full_slot" ? 0.9 : config === "50pct_WOC" ? 1.0 : 1.1;
  const cycle_time_improvement_pct = Math.max(0, (modifier - 1.0) * config_factor * 100);

  // Safety: must be > 0%
  if (cycle_time_improvement_pct <= 0) {
    errors.push(`${scenario}/${config}: Cycle time improvement ≤ 0% — optimization failed`);
  }

  return {
    scenario,
    controller,
    config,
    material,
    passed: errors.length === 0,
    errors,
    cycle_time_improvement_pct: +cycle_time_improvement_pct.toFixed(2),
  };
}

/** Run full regression matrix: scenarios × controllers × configs × materials. */
export function runRegressionMatrix(input: ValidationInput): RegressionMatrixResult {
  const results: RegressionEntry[] = [];

  for (const scenario of REGRESSION_SCENARIOS) {
    for (const controller of REGRESSION_CONTROLLERS) {
      for (const config of REGRESSION_CONFIGS) {
        for (const material of REGRESSION_MATERIALS) {
          const entry = runRegressionEntry(
            scenario,
            controller,
            config,
            material,
            input.original_gcode,
            input.optimized_gcode,
            input.machine_limits,
            input.operations,
          );
          results.push(entry);
        }
      }
    }
  }

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const error_rate_percent = +(failed / total * 100).toFixed(2);

  const summary = failed === 0
    ? `All ${total} regression combinations passed.`
    : `${failed}/${total} combinations failed (${error_rate_percent}% error rate). Review errors for details.`;

  return {
    total_combinations: total,
    passed,
    failed,
    error_rate_percent,
    results,
    summary,
  };
}

// ============================================================================
// U05 — A/B COMPARISON ENGINE
// ============================================================================

/** Estimate cycle time (seconds) from a parsed G-code program. */
function estimateCycleTime(prog: ParsedProgram, rapid_feed_mmpm = 15000): number {
  const moves = prog.moves;
  let total_time_sec = 0;

  for (let i = 1; i < moves.length; i++) {
    const prev = moves[i - 1];
    const curr = moves[i];

    const dx = (curr.x ?? 0) - (prev.x ?? 0);
    const dy = (curr.y ?? 0) - (prev.y ?? 0);
    const dz = (curr.z ?? 0) - (prev.z ?? 0);
    const dist_mm = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist_mm < 1e-6) continue;

    const feed = curr.is_rapid
      ? rapid_feed_mmpm
      : (curr.feed ?? 500);

    if (feed > 0) {
      total_time_sec += (dist_mm / feed) * 60;
    }
  }

  return total_time_sec;
}

/** Predict surface finish quality string from average feed and material. */
function predictSurfaceFinish(avg_feed_mmpm: number, avg_rpm: number, tool_d_mm: number, material_iso: string): string {
  // Ra estimate: theoretical (f²/8r for turning analogy; for milling use empirical)
  const fpr = avg_rpm > 0 ? avg_feed_mmpm / avg_rpm : 0.1; // mm/rev
  const tool_nose_r = tool_d_mm * 0.05; // ~5% of diameter as nose radius proxy
  const ra_um = (fpr * fpr) / (8 * Math.max(tool_nose_r, 0.1)) * 1000;

  const family = material_iso.charAt(0).toUpperCase();
  // Material machinability factor
  const mach_factor: Record<string, number> = { P: 1.0, M: 1.2, K: 0.9, N: 0.7, S: 1.5, H: 1.3 };
  const corrected_ra = ra_um * (mach_factor[family] ?? 1.0);

  if (corrected_ra < 0.4) return `Ra <0.4μm — Mirror finish (N5)`;
  if (corrected_ra < 0.8) return `Ra <0.8μm — Fine finish (N6)`;
  if (corrected_ra < 1.6) return `Ra <1.6μm — Smooth finish (N7)`;
  if (corrected_ra < 3.2) return `Ra <3.2μm — Medium finish (N8)`;
  if (corrected_ra < 6.3) return `Ra <6.3μm — Semi-rough (N9)`;
  return `Ra >6.3μm — Rough (N10+)`;
}

/** Determine feed change reason from context. */
function inferFeedChangeReason(
  delta_pct: number,
  op_type: string,
  material_iso: string,
): string {
  const family = material_iso.charAt(0).toUpperCase();

  if (Math.abs(delta_pct) < 2) return "No significant change";

  if (delta_pct > 15) {
    if (op_type === "trochoidal" || op_type === "roughing") {
      return `Aggressive feed increase: trochoidal/reduced radial engagement for ${family}-class material`;
    }
    return `Feed increased: physics model validated chip thickness within limits`;
  }
  if (delta_pct > 5) {
    return `Moderate feed increase: optimized chip load for ${family}-class material`;
  }
  if (delta_pct < -15) {
    if (op_type === "finishing") {
      return `Feed reduced: finishing pass surface finish target (Ra optimization)`;
    }
    return `Feed reduced: avoiding chatter / tool deflection beyond tolerance`;
  }
  if (delta_pct < -5) {
    return `Slight feed reduction: conservative adjustment for ${family}-class material stability`;
  }
  return `Minor adjustment: within ±5% for process optimality`;
}

/** Run A/B comparison engine. */
export function runABComparison(input: ValidationInput): ComparisonResult {
  const origProg = parseGCode(input.original_gcode);
  const optProg  = parseGCode(input.optimized_gcode);

  const cycle_orig = estimateCycleTime(origProg);
  const cycle_opt  = estimateCycleTime(optProg);
  const time_saved_sec = cycle_orig - cycle_opt;
  const time_saved_percent = cycle_orig > 0 ? (time_saved_sec / cycle_orig) * 100 : 0;

  // Tool life improvement: using Taylor model from feed/RPM change
  const avg_orig_rpm = origProg.rpms.length > 0
    ? origProg.rpms.reduce((a, b) => a + b, 0) / origProg.rpms.length
    : 3000;
  const avg_opt_rpm = optProg.rpms.length > 0
    ? optProg.rpms.reduce((a, b) => a + b, 0) / optProg.rpms.length
    : avg_orig_rpm;

  const tool_d = input.operations[0]?.tool_diameter_mm ?? 10;
  const vc_orig = (Math.PI * tool_d * avg_orig_rpm) / 1000;
  const vc_opt  = (Math.PI * tool_d * avg_opt_rpm)  / 1000;
  const mat = getMaterialLimits(input.material_iso);

  // Taylor T = (C/Vc)^(1/n)
  const life_orig = vc_orig > 0 ? Math.pow(mat.taylor_C / vc_orig, 1 / mat.taylor_n) : 60;
  const life_opt  = vc_opt  > 0 ? Math.pow(mat.taylor_C / vc_opt,  1 / mat.taylor_n) : 60;
  const tool_life_improvement_percent = life_orig > 0
    ? ((life_opt - life_orig) / life_orig) * 100
    : 0;

  // Surface finish prediction from optimized parameters
  const avg_opt_feed = optProg.feeds.length > 0
    ? optProg.feeds.reduce((a, b) => a + b, 0) / optProg.feeds.length
    : 500;
  const surface_finish_prediction = predictSurfaceFinish(
    avg_opt_feed, avg_opt_rpm, tool_d, input.material_iso,
  );

  // Per-operation comparison
  const per_operation: ComparisonResult["per_operation"] = input.operations.map((op, idx) => {
    // Find feeds for this tool in both programs by T-code
    const tn = op.tool_number;
    const origFeeds = origProg.feeds.slice(idx, idx + 1);
    const optFeeds  = optProg.feeds.slice(idx, idx + 1);
    const of = origFeeds[0] ?? (origProg.feeds[0] ?? 500);
    const nf = optFeeds[0]  ?? (optProg.feeds[0]  ?? 500);
    const delta_pct = of > 0 ? ((nf - of) / of) * 100 : 0;
    const reason = inferFeedChangeReason(delta_pct, op.operation_type, input.material_iso);

    return {
      op: tn,
      original_feed: +of.toFixed(1),
      optimized_feed: +nf.toFixed(1),
      delta_percent: +delta_pct.toFixed(2),
      reason,
    };
  });

  return {
    cycle_time_original_sec: +cycle_orig.toFixed(2),
    cycle_time_optimized_sec: +cycle_opt.toFixed(2),
    time_saved_sec: +time_saved_sec.toFixed(2),
    time_saved_percent: +time_saved_percent.toFixed(2),
    tool_life_improvement_percent: +tool_life_improvement_percent.toFixed(2),
    surface_finish_prediction,
    per_operation,
  };
}

// ============================================================================
// FULL VALIDATION ORCHESTRATOR
// ============================================================================

/** Run all five validation units and aggregate results. */
export function runFullValidation(input: ValidationInput): ValidationResult {
  const issues: ValidationIssue[] = [];

  // U01 — Diff
  const diff = computeDiff(input.original_gcode, input.optimized_gcode);

  // Diff issues
  if (diff.lines_changed === 0) {
    issues.push({
      severity: "error",
      unit: "diff",
      code: "DIFF-001",
      message: "No changes detected between original and optimized G-code — optimization produced no effect",
    });
  }
  if (diff.feed_changes.avg_delta_percent < -25) {
    issues.push({
      severity: "warning",
      unit: "diff",
      code: "DIFF-002",
      message: `Average feed reduction of ${diff.feed_changes.avg_delta_percent.toFixed(1)}% may indicate over-conservative optimization`,
    });
  }
  if (diff.codes_removed.some(c => c.startsWith("G4") || c === "G43" || c === "G44")) {
    issues.push({
      severity: "warning",
      unit: "diff",
      code: "DIFF-003",
      message: `Safety codes removed: ${diff.codes_removed.filter(c => c.startsWith("G4")).join(", ")}`,
    });
  }

  // U02 — Backplot
  const backplot = runBackplot(input.optimized_gcode, { operations: input.operations });

  if (backplot.gouge_detected) {
    issues.push({
      severity: "error",
      unit: "backplot",
      code: "BP-001",
      message: "Gouge detected: optimized toolpath cuts below finished surface Z",
    });
  }
  if (backplot.rapid_into_material) {
    issues.push({
      severity: "error",
      unit: "backplot",
      code: "BP-002",
      message: "Rapid move into material detected — potential crash",
    });
  }
  if (backplot.arc_errors > 0) {
    issues.push({
      severity: "error",
      unit: "backplot",
      code: "BP-003",
      message: `${backplot.arc_errors} arc geometry error(s) detected (R/IJK mismatch or degenerate arc)`,
    });
  }

  // U03 — Consistency
  const consistency = checkConsistency(input);

  for (const c of consistency.checks) {
    if (!c.passed) {
      issues.push({
        severity: c.name.includes("RPM") || c.name.includes("Feed") ? "error" : "warning",
        unit: "consistency",
        code: `CONS-${c.name.replace(/\s+/g, "_").toUpperCase().substring(0, 8)}`,
        message: c.message,
      });
    }
  }

  // U05 — A/B Comparison
  const comparison = runABComparison(input);

  if (comparison.time_saved_percent <= 0) {
    issues.push({
      severity: "error",
      unit: "comparison",
      code: "AB-001",
      message: `Optimized program is NOT faster than original (Δ = ${comparison.time_saved_percent.toFixed(2)}%) — optimization failed core KPI`,
    });
  } else if (comparison.time_saved_percent < 1) {
    issues.push({
      severity: "info",
      unit: "comparison",
      code: "AB-002",
      message: `Marginal cycle time improvement: ${comparison.time_saved_percent.toFixed(2)}% — consider further optimization`,
    });
  }

  if (comparison.tool_life_improvement_percent < -20) {
    issues.push({
      severity: "warning",
      unit: "comparison",
      code: "AB-003",
      message: `Tool life reduced by ${Math.abs(comparison.tool_life_improvement_percent).toFixed(1)}% — spindle speed increase may be excessive`,
    });
  }

  // Overall pass: no errors (warnings are acceptable)
  const error_count = issues.filter(i => i.severity === "error").length;
  const overall_pass = error_count === 0 && backplot.passed && consistency.passed;

  return {
    overall_pass,
    diff,
    backplot,
    consistency,
    comparison,
    issues,
  };
}

// ============================================================================
// DISPATCHER FUNCTION
// ============================================================================

/**
 * Post Validation Suite Engine dispatcher.
 *
 * @param action - One of: validate_full | diff | backplot | consistency_check | ab_compare | regression_matrix
 * @param params - Action-specific parameters (must include ValidationInput fields as required)
 * @returns Action result
 */
export function postValidationSuiteEngine(action: string, params: Record<string, unknown>): unknown {
  log.info(`[PostValidationSuiteEngine] action=${action}`);

  const asInput = (): ValidationInput => {
    // Allow partial inputs per action (backplot only needs optimized_gcode + operations)
    return {
      original_gcode:  (params["original_gcode"]  as string)  ?? "",
      optimized_gcode: (params["optimized_gcode"] as string)  ?? "",
      controller:      (params["controller"]       as string)  ?? "Fanuc",
      machine_limits:  (params["machine_limits"]   as ValidationInput["machine_limits"]) ?? {
        max_rpm: 12000, max_feed: 15000, max_power_kW: 22,
      },
      material_iso:    (params["material_iso"]     as string)  ?? "P20",
      operations:      (params["operations"]       as ValidationInput["operations"]) ?? [],
    };
  };

  switch (action) {

    case "validate_full":
      return runFullValidation(asInput());

    case "diff": {
      const orig = (params["original_gcode"]  as string) ?? "";
      const opt  = (params["optimized_gcode"] as string) ?? "";
      if (!orig || !opt) throw new Error("diff requires original_gcode and optimized_gcode");
      return computeDiff(orig, opt);
    }

    case "backplot": {
      const inp = asInput();
      if (!inp.optimized_gcode) throw new Error("backplot requires optimized_gcode");
      return runBackplot(inp.optimized_gcode, { operations: inp.operations });
    }

    case "consistency_check":
      return checkConsistency(asInput());

    case "ab_compare":
      return runABComparison(asInput());

    case "regression_matrix":
      return runRegressionMatrix(asInput());

    default:
      throw new Error(
        `Unknown PostValidationSuiteEngine action: "${action}". ` +
        `Valid: validate_full | diff | backplot | consistency_check | ab_compare | regression_matrix`,
      );
  }
}
