/**
 * LatheProgramAuditPipelineEngine — multi-stage audit pipeline for lathe variants
 * ===============================================================================
 *
 * Orchestrates code-audit + collision-screen for a single lathe NC program.
 * Built to run across the 918,973-variant JM Die V2 corpus (115k programs × 7
 * Okuma lathes) per /goal #5 directive: "assess, analyze and test each
 * program against our collision avoidance systems and code auditing
 * capabilities, build whatever we need to fill the gaps".
 *
 * Stages
 *   STAGE A — STATIC SAFETY AUDIT (via gcSafetyAnalyzer.analyze)
 *   STAGE B — LATHE-MOVE EXTRACTION (this engine, X/Z plane parser)
 *   STAGE C — DETERMINISTIC COLLISION SCREEN (this engine, envelope-rule based)
 *
 * Verdict
 *   FAIL — STAGE-A critical OR STAGE-C collision
 *   WARN — STAGE-A high     OR STAGE-C near_miss
 *   PASS_WITH_NOTES — STAGE-A medium only
 *   PASS — none of the above
 *
 * Full AABB collision (CollisionDetectionEngine integration) is the next iter
 * (U-AUDIT-COLLISION-AABB) — this STAGE-C is a fast lathe-shaped rule pass
 * suitable for batch-scanning hundreds of thousands of programs.
 *
 * @module engines/LatheProgramAuditPipelineEngine
 * @milestone JM-DIE-LATHE-UPGRADE-MS0/U-AUDIT-PIPELINE
 * @version 1.0.0
 */

import {
  gcSafetyAnalyzer,
  type SafetyAnalysisResult,
  type ControllerType,
  type Strictness,
} from "./GCodeSafetyAnalyzerEngine.js";

// ── Constants ─────────────────────────────────────────────────────────

/** Maximum motion-record cap per program (defensive against pathological inputs). */
const MAX_MOVES_PER_PROGRAM = 250_000;
/** Cap on near-miss penalty in score computation. */
const MAX_NEAR_MISS_PENALTY_COUNT = 5;
/** Score penalty per near-miss (capped). */
const SCORE_PENALTY_PER_NEAR_MISS = 10;
/** Minimum score for non-FAIL verdicts (distinguish from FAIL=0). */
const MIN_NON_FAIL_SCORE = 1;

// ── Types ─────────────────────────────────────────────────────────────

export interface LatheMove {
  line: number;
  type: "rapid" | "feed" | "arc_cw" | "arc_ccw";
  /** X coord in *mm* (already unit-converted from source). */
  x?: number;
  /** Z coord in *mm* (already unit-converted from source). */
  z?: number;
  x_is_diameter: boolean;
  /** "inch" or "mm" at the moment this move was emitted. */
  units: "inch" | "mm";
  raw: string;
}

/** Per-move unit tracking (modal — set by G20/G21 in the program). */
export type UnitMode = "inch" | "mm";

export interface CollisionScreenResult {
  has_collision: boolean;
  has_near_miss: boolean;
  collision_count: number;
  near_miss_count: number;
  details: Array<{
    line: number;
    rule: "envelope_x" | "envelope_z" | "chuck_clearance" | "tail_clearance" | "negative_diameter";
    severity: "collision" | "near_miss";
    actual: number;
    limit: number;
    raw: string;
  }>;
  min_clearance_mm: number;
}

export interface LatheEnvelope {
  machineId: string;
  x_min_mm: number;
  x_max_mm: number;
  z_min_mm: number;
  z_max_mm: number;
  chuck_z_mm: number;
  tail_z_mm?: number;
  clearance_warning_mm: number;
  /**
   * X cuts may cross center by up to this tolerance (mm) without flagging
   * negative_diameter — covers legitimate through-center facing/parting
   * operations on bored parts. Defaults to 2.0 mm (~0.080") when omitted.
   * Cuts deeper than this still flag.
   */
  facing_x_tolerance_mm?: number;
  /**
   * Z may briefly enter the chuck-clearance zone by up to this tolerance (mm)
   * without flagging chuck_clearance — covers face-of-chuck facing where
   * the tool kisses the chuck face by design (Z ≈ -0.5 to -2 mm for a
   * controlled stopoff). Defaults to 2.0 mm. Z deeper still flags.
   */
  chuck_z_tolerance_mm?: number;
  /**
   * Rapid moves may extend OUTSIDE x_max by up to this tolerance (mm) without
   * flagging envelope_x — covers the standard "rapid to safe X" between
   * tool changes (e.g., X=300 rapid retract on a 250-swing machine).
   * Cuts (G1/G2/G3) still strictly enforce x_max. Defaults to 50 mm
   * (~2", typical Okuma OSP safe-retract distance).
   */
  rapid_retract_x_tolerance_mm?: number;
}

export type AuditVerdict = "pass" | "pass_with_notes" | "warn" | "fail";

export interface AuditInput {
  variantPath: string;
  programText: string;
  partNumber: string;
  machineId: string;
  machineModel: string;
  controller?: ControllerType;
  envelope: LatheEnvelope;
  strictness?: Strictness;
}

export interface AuditResult {
  schemaVersion: "1.0.0";
  variantPath: string;
  partNumber: string;
  machineId: string;
  machineModel: string;
  controller: ControllerType;
  verdict: AuditVerdict;
  score: number;
  stageA: SafetyAnalysisResult;
  stageB: { move_count: number; first_5_moves: LatheMove[] };
  stageC: CollisionScreenResult;
  warnings: string[];
  timestamp: string;
}

// ── STAGE B — G-code → LatheMove[] parsing (pure) ───────────────────

const COORD_PATTERN = /([XZ])\s*(-?\d+(?:\.\d+)?)/gi;
const G_MODE_PATTERN = /\bG(0?0|0?1|0?2|0?3)\b/i;
const INCH_PATTERN = /\bG20\b/;
const MM_PATTERN = /\bG21\b/;
const INCH_TO_MM = 25.4;

export function parseLatheProgram(
  text: string,
  opts?: { x_is_diameter?: boolean; default_units?: UnitMode },
): LatheMove[] {
  const x_is_diameter = opts?.x_is_diameter ?? true;
  // Okuma OSP-controllers ship with inch as factory default — JM Die programs
  // overwhelmingly assume inch (per audit-evidence-2026-05-24). Caller may
  // override via opts.default_units when an outer system has stronger info.
  let units: UnitMode = opts?.default_units ?? "inch";
  const lines = text.split(/\r?\n/);
  const moves: LatheMove[] = [];
  let mode: LatheMove["type"] | null = null;

  for (let i = 0; i < lines.length; i++) {
    if (moves.length >= MAX_MOVES_PER_PROGRAM) break;
    const rawLine = lines[i];
    const stripped = rawLine.replace(/\([^)]*\)/g, " ").replace(/;.*$/, " ");
    if (!/[XZGM]/i.test(stripped)) continue;

    // Modal unit-mode update — G20 (inch) / G21 (mm). Sticky.
    if (INCH_PATTERN.test(stripped)) units = "inch";
    else if (MM_PATTERN.test(stripped)) units = "mm";

    // Modal motion-mode update (sticky across blocks per Okuma + Fanuc spec).
    const gMatch = stripped.match(G_MODE_PATTERN);
    if (gMatch) {
      const num = parseInt(gMatch[1], 10);
      if (num === 0) mode = "rapid";
      else if (num === 1) mode = "feed";
      else if (num === 2) mode = "arc_cw";
      else if (num === 3) mode = "arc_ccw";
    }
    if (mode === null) continue;

    let x: number | undefined;
    let z: number | undefined;
    for (const m of stripped.matchAll(COORD_PATTERN)) {
      const axis = m[1].toUpperCase();
      const val = parseFloat(m[2]);
      if (Number.isNaN(val)) continue;
      if (axis === "X") x = val;
      else if (axis === "Z") z = val;
    }
    if (x === undefined && z === undefined) continue;

    // Unit-normalize all coords to mm BEFORE storing — downstream collision
    // screen + envelope checks all assume mm. Conversion happens here at
    // parse-time so consumers don't re-derive.
    const scale = units === "inch" ? INCH_TO_MM : 1;
    moves.push({
      line: i + 1,
      type: mode,
      x: x === undefined ? undefined : x * scale,
      z: z === undefined ? undefined : z * scale,
      x_is_diameter,
      units,
      raw: rawLine.trim(),
    });
  }
  return moves;
}

// ── STAGE C — deterministic collision screen ─────────────────────────

/** Default tolerances when the envelope omits them (lathe-norm). */
const DEFAULT_FACING_X_TOLERANCE_MM = 2.0;
const DEFAULT_CHUCK_Z_TOLERANCE_MM = 2.0;
const DEFAULT_RAPID_RETRACT_X_TOLERANCE_MM = 50.0;

export function screenCollisionsLathe(
  moves: LatheMove[],
  env: LatheEnvelope,
): CollisionScreenResult {
  const details: CollisionScreenResult["details"] = [];
  let min_clearance = Number.POSITIVE_INFINITY;
  const warn = env.clearance_warning_mm;
  const facingX = env.facing_x_tolerance_mm ?? DEFAULT_FACING_X_TOLERANCE_MM;
  const chuckZ = env.chuck_z_tolerance_mm ?? DEFAULT_CHUCK_Z_TOLERANCE_MM;
  const rapidRetractX = env.rapid_retract_x_tolerance_mm ?? DEFAULT_RAPID_RETRACT_X_TOLERANCE_MM;

  for (const m of moves) {
    if (m.x !== undefined) {
      // Negative-diameter check — through-center face cuts allowed up to facingX (mm)
      if (m.x_is_diameter && m.x < -facingX) {
        details.push({ line: m.line, rule: "negative_diameter", severity: "collision", actual: m.x, limit: -facingX, raw: m.raw });
      }
      // X envelope — rapid retracts ABOVE x_max get a wider tolerance (rapidRetractX mm)
      // because Okuma OSP factory-style programs routinely rapid-retract well outside the
      // machinable swing for tool-change clearance. Cuts (G1/G2/G3) still strict.
      const xMaxEffective = m.type === "rapid" ? env.x_max_mm + rapidRetractX : env.x_max_mm;
      if (m.x < env.x_min_mm && (!m.x_is_diameter || m.x < -facingX)) {
        // Below floor only matters when it's NOT a tolerated face-cut.
        details.push({ line: m.line, rule: "envelope_x", severity: "collision", actual: m.x, limit: env.x_min_mm, raw: m.raw });
      } else if (m.x > xMaxEffective) {
        details.push({ line: m.line, rule: "envelope_x", severity: "collision", actual: m.x, limit: xMaxEffective, raw: m.raw });
      } else {
        const dXMin = m.x - env.x_min_mm;
        const dXMax = env.x_max_mm - m.x;
        const dX = Math.min(dXMin, dXMax);
        if (dX >= 0 && dX < warn) {
          details.push({ line: m.line, rule: "envelope_x", severity: "near_miss", actual: m.x, limit: dXMin < dXMax ? env.x_min_mm : env.x_max_mm, raw: m.raw });
        }
        if (dX < min_clearance) min_clearance = dX;
      }
    }
    if (m.z !== undefined) {
      // Chuck-clearance with a facing-zone tolerance: face-of-chuck operations
      // routinely kiss Z ≈ -0.5 to -2 mm (light cleanup pass). Only flag the
      // hard chuck-strike past chuckZ.
      const chuckLimit = env.chuck_z_mm - chuckZ;
      if (m.z < chuckLimit) {
        details.push({ line: m.line, rule: "chuck_clearance", severity: "collision", actual: m.z, limit: chuckLimit, raw: m.raw });
      } else if (m.z < env.chuck_z_mm) {
        // In the facing tolerance band — near-miss, not collision
        details.push({ line: m.line, rule: "chuck_clearance", severity: "near_miss", actual: m.z, limit: env.chuck_z_mm, raw: m.raw });
      }
      if (env.tail_z_mm !== undefined && m.z > env.tail_z_mm) {
        details.push({ line: m.line, rule: "tail_clearance", severity: "collision", actual: m.z, limit: env.tail_z_mm, raw: m.raw });
      }
      // Z envelope — apply same rapid-tolerance treatment for symmetry
      const zMaxEffective = m.type === "rapid" ? env.z_max_mm + rapidRetractX : env.z_max_mm;
      if (m.z < env.z_min_mm) {
        details.push({ line: m.line, rule: "envelope_z", severity: "collision", actual: m.z, limit: env.z_min_mm, raw: m.raw });
      } else if (m.z > zMaxEffective) {
        details.push({ line: m.line, rule: "envelope_z", severity: "collision", actual: m.z, limit: zMaxEffective, raw: m.raw });
      } else {
        const dZMin = m.z - env.z_min_mm;
        const dZMax = env.z_max_mm - m.z;
        const dZ = Math.min(dZMin, dZMax);
        if (dZ >= 0 && dZ < warn) {
          details.push({ line: m.line, rule: "envelope_z", severity: "near_miss", actual: m.z, limit: dZMin < dZMax ? env.z_min_mm : env.z_max_mm, raw: m.raw });
        }
        if (dZ < min_clearance) min_clearance = dZ;
      }
    }
  }

  const collisions = details.filter((d) => d.severity === "collision");
  const near = details.filter((d) => d.severity === "near_miss");
  return {
    has_collision: collisions.length > 0,
    has_near_miss: near.length > 0,
    collision_count: collisions.length,
    near_miss_count: near.length,
    details,
    min_clearance_mm: min_clearance === Number.POSITIVE_INFINITY ? -1 : min_clearance,
  };
}

// ── Verdict + score composition ──────────────────────────────────────

function computeVerdict(
  stageA: SafetyAnalysisResult,
  stageC: CollisionScreenResult,
): AuditVerdict {
  if (stageC.has_collision || stageA.critical.length > 0) return "fail";
  if (stageC.has_near_miss || stageA.high.length > 0) return "warn";
  if (stageA.medium.length > 0) return "pass_with_notes";
  return "pass";
}

function computeScore(
  stageA: SafetyAnalysisResult,
  stageC: CollisionScreenResult,
  verdict: AuditVerdict,
): number {
  if (verdict === "fail") return 0;
  let base = stageA.score;
  base -= SCORE_PENALTY_PER_NEAR_MISS * Math.min(stageC.near_miss_count, MAX_NEAR_MISS_PENALTY_COUNT);
  return Math.max(MIN_NON_FAIL_SCORE, Math.round(base));
}

// ── Class API ────────────────────────────────────────────────────────

export class LatheProgramAuditPipelineEngine {
  static auditOne(input: AuditInput): AuditResult {
    const controller = input.controller ?? "okuma";
    const strictness = input.strictness ?? "standard";
    const warnings: string[] = [];
    const stageA = gcSafetyAnalyzer.analyze(input.programText, { controller, strictness });
    const moves = parseLatheProgram(input.programText);
    if (moves.length === 0) warnings.push("no_motion_moves_parsed");
    const stageC = screenCollisionsLathe(moves, input.envelope);
    const verdict = computeVerdict(stageA, stageC);
    const score = computeScore(stageA, stageC, verdict);
    return {
      schemaVersion: "1.0.0",
      variantPath: input.variantPath,
      partNumber: input.partNumber,
      machineId: input.machineId,
      machineModel: input.machineModel,
      controller,
      verdict,
      score,
      stageA,
      stageB: { move_count: moves.length, first_5_moves: moves.slice(0, 5) },
      stageC,
      warnings,
      timestamp: new Date().toISOString(),
    };
  }
}

export const latheProgramAuditPipelineEngine = LatheProgramAuditPipelineEngine;
