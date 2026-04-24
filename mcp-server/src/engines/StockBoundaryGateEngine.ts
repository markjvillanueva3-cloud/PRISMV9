/**
 * StockBoundaryGateEngine — U-LSR06 (LATHE-HARDENED-MS0)
 *
 * Geometric boundary check between the toolpath and the raw stock / chuck
 * jaws. Produces a typed gate decision the emitter (U-LSR04 pattern) and the
 * formal predicate (U-LSR22) can consume as a hard-block.
 *
 * ── Conventions ─────────────────────────────────────────────────────────
 * Right-handed lathe, workpiece face at Z=0, positive Z points toward the
 * chuck/tailstock (i.e. into the machine). Stock spans Z ∈ [0, length_mm].
 * Gripping region spans Z ∈ [length_mm − gripping_length_mm, length_mm];
 * that is the region in which the chuck jaws physically contact the bar.
 *
 * X is radial (NOT diameter). The spindle centreline is X=0. For a solid
 * bar the tool must never cross X=0. For a tube, ID side cuts use X in
 * [id/2, od/2]; OD side cuts use X ≥ id/2 but will typically live above
 * od/2 − depth during roughing.
 *
 * ── Clauses ─────────────────────────────────────────────────────────────
 *   CENTERLINE_CROSSED    — any x_mm < 0 (tool plunged past spindle axis)
 *   BELOW_ID              — any x_mm < stock.id_mm/2 (tube only; tool
 *                           broke through bore wall)
 *   OD_EXCEEDED           — any x_mm > stock.od_mm/2 + approach_clearance
 *                           (flagged — usually only rapids should live here)
 *   JAW_COLLISION         — any z_mm ≥ length − gripping_length
 *                           (tool inside the gripping region)
 *   JAW_CLEARANCE_LOW     — closest tool Z approaches within
 *                           min_jaw_clearance_mm of the gripping region
 *   STOCK_BACK_PENETRATED — any z_mm > stock.length_mm (past back face)
 *   STOCK_FRONT_EXCEEDED  — any z_mm < 0 − front_clearance_mm (ahead of
 *                           the raw face by more than the clearance
 *                           budget; usually fine for facing but flagged)
 *   NAN_MOVE              — non-finite x_mm or z_mm in any move
 *   INVALID_STOCK         — stock.od_mm ≤ 0, length_mm ≤ 0, id ≥ od, etc.
 *
 * All clauses except JAW_CLEARANCE_LOW and STOCK_FRONT_EXCEEDED are hard
 * blocks (gate_block=true). The two exceptions are WARNINGs by default —
 * they can be promoted to BLOCK by lowering tolerances via options.
 *
 * ── Companion units ─────────────────────────────────────────────────────
 *   U-LSR04 envelope hard-block in emitter (same error pattern)
 *   U-LSR05 spindle torque gate           (same input shape: ToolpathProgram)
 *   U-LSR22 formal safety predicate       (future clause consumer)
 *
 * @milestone LATHE-HARDENED-MS0 U-LSR06
 * @version 1.0.0
 */

import { z } from "zod";
import type { ToolpathProgram } from "./LathePrintToolpathGeneratorEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default minimum clearance between the closest tool-Z and the chuck
 * gripping region. 5 mm is a conservative floor across 6–12" self-centring
 * chucks; callers with precision grip chucks can tighten via options.
 */
const DEFAULT_MIN_JAW_CLEARANCE_MM = 5;

/**
 * Default ahead-of-face rapid clearance — the tool may rapid to a small
 * negative Z to approach the face; beyond this budget, it's suspect.
 */
const DEFAULT_FRONT_CLEARANCE_MM = 3;

/**
 * Default radial overshoot tolerance above stock OD. Below this an approach
 * or rapid may legitimately position outside the stock; above it is flagged.
 */
const DEFAULT_OD_APPROACH_CLEARANCE_MM = 10;

// ============================================================================
// SCHEMAS
// ============================================================================

export const StockGeometrySchema = z
  .object({
    od_mm: z.number().positive(),
    length_mm: z.number().positive(),
    id_mm: z.number().min(0).default(0),
  })
  .refine((s) => s.id_mm < s.od_mm, {
    message: "stock id_mm must be < od_mm",
  });
export type StockGeometry = z.infer<typeof StockGeometrySchema>;

export const WorkholdingSchema = z.object({
  gripping_length_mm: z.number().positive(),
  /** If 0/undefined, stock is assumed to span Z ∈ [0, length_mm]. */
  chuck_face_z_mm: z.number().optional(),
});
export type Workholding = z.infer<typeof WorkholdingSchema>;

export const StockBoundaryGateInputSchema = z.object({
  program: z.unknown(),
  stock: StockGeometrySchema,
  workholding: WorkholdingSchema,
  min_jaw_clearance_mm: z.number().min(0).optional(),
  front_clearance_mm: z.number().min(0).optional(),
  od_approach_clearance_mm: z.number().min(0).optional(),
});
export type StockBoundaryGateInput = z.infer<typeof StockBoundaryGateInputSchema>;

export const BoundaryClauseSchema = z.enum([
  "CENTERLINE_CROSSED",
  "BELOW_ID",
  "OD_EXCEEDED",
  "JAW_COLLISION",
  "JAW_CLEARANCE_LOW",
  "STOCK_BACK_PENETRATED",
  "STOCK_FRONT_EXCEEDED",
  "NAN_MOVE",
  "INVALID_STOCK",
]);
export type BoundaryClause = z.infer<typeof BoundaryClauseSchema>;

export const BoundaryViolationSchema = z.object({
  clause: BoundaryClauseSchema,
  op_number: z.number().int().nullable(),
  move_index: z.number().int().nullable(),
  offending_value_mm: z.number(),
  limit_mm: z.number(),
  detail: z.string(),
});
export type BoundaryViolation = z.infer<typeof BoundaryViolationSchema>;

export const StockBoundaryOpSummarySchema = z.object({
  op_number: z.number().int(),
  feature_id: z.string(),
  x_min_mm: z.number(),
  x_max_mm: z.number(),
  z_min_mm: z.number(),
  z_max_mm: z.number(),
  min_jaw_clearance_mm: z.number(),
  safe: z.boolean(),
});
export type StockBoundaryOpSummary = z.infer<typeof StockBoundaryOpSummarySchema>;

export const StockBoundaryGateResultSchema = z.object({
  program_id: z.string(),
  stock: StockGeometrySchema,
  workholding: WorkholdingSchema,
  per_operation: z.array(StockBoundaryOpSummarySchema),
  violations: z.array(BoundaryViolationSchema),
  warnings: z.array(BoundaryViolationSchema),
  overall: z.object({
    status: z.enum(["SAFE", "WARNING", "BLOCKED"]),
    gate_block: z.boolean(),
    blocking_clauses: z.array(BoundaryClauseSchema),
    warning_clauses: z.array(BoundaryClauseSchema),
    closest_jaw_clearance_mm: z.number(),
    recommendations: z.array(z.string()),
  }),
  evaluated_at: z.string(),
});
export type StockBoundaryGateResult = z.infer<typeof StockBoundaryGateResultSchema>;

// ============================================================================
// ERROR
// ============================================================================

export class StockBoundaryBlockError extends Error {
  readonly code = "STOCK_BOUNDARY_BLOCKED" as const;
  readonly result: StockBoundaryGateResult;
  constructor(result: StockBoundaryGateResult) {
    const summary = result.overall.blocking_clauses.join(", ");
    super(
      `STOCK_BOUNDARY_BLOCKED: ${result.violations.length} violation(s) [${summary}]. ` +
        `Refusing emission. Re-plan toolpath or supply allow_boundary_override=true.`,
    );
    this.result = result;
    this.name = "StockBoundaryBlockError";
  }
}

// ============================================================================
// ENGINE
// ============================================================================

class StockBoundaryGateEngine {
  /**
   * Evaluate stock-boundary adequacy for every move in every op.
   * Total function — degenerate stock/workholding inputs surface as an
   * INVALID_STOCK violation with gate_block=true, not thrown errors.
   */
  gate(input: StockBoundaryGateInput): StockBoundaryGateResult {
    const parsed = StockBoundaryGateInputSchema.parse(input);
    const stock = parsed.stock;
    const wh = parsed.workholding;
    const minJawClearance = parsed.min_jaw_clearance_mm ?? DEFAULT_MIN_JAW_CLEARANCE_MM;
    const frontClearance = parsed.front_clearance_mm ?? DEFAULT_FRONT_CLEARANCE_MM;
    const odApproachClearance = parsed.od_approach_clearance_mm ?? DEFAULT_OD_APPROACH_CLEARANCE_MM;

    const program = parsed.program as ToolpathProgram;
    if (!program || !Array.isArray((program as { operations?: unknown[] }).operations)) {
      throw new Error("Invalid program: missing operations");
    }

    // INVALID_STOCK — structural impossibility (zod catches negatives already,
    // but we cross-check gripping_length against stock length).
    const violations: BoundaryViolation[] = [];
    const warnings: BoundaryViolation[] = [];

    if (wh.gripping_length_mm >= stock.length_mm) {
      violations.push({
        clause: "INVALID_STOCK",
        op_number: null,
        move_index: null,
        offending_value_mm: wh.gripping_length_mm,
        limit_mm: stock.length_mm,
        detail: `gripping_length ${wh.gripping_length_mm} >= stock length ${stock.length_mm}: nothing to cut`,
      });
    }

    const odMax = stock.od_mm / 2;
    const odApproachLimit = odMax + odApproachClearance;
    const idMin = stock.id_mm / 2;
    const zBack = stock.length_mm;
    const zGripStart = stock.length_mm - wh.gripping_length_mm;
    const zGripSafe = zGripStart - minJawClearance;
    const zFrontLimit = 0 - frontClearance;

    const perOp: StockBoundaryOpSummary[] = [];
    let closestJawClearance = Infinity;

    for (const op of program.operations) {
      let xMin = Infinity;
      let xMax = -Infinity;
      let zMin = Infinity;
      let zMax = -Infinity;

      op.moves.forEach((move, moveIdx) => {
        if (move.x_mm !== undefined) {
          if (!Number.isFinite(move.x_mm)) {
            violations.push({
              clause: "NAN_MOVE",
              op_number: op.op_number,
              move_index: moveIdx,
              offending_value_mm: move.x_mm,
              limit_mm: 0,
              detail: `x_mm is non-finite`,
            });
          } else {
            if (move.x_mm < xMin) xMin = move.x_mm;
            if (move.x_mm > xMax) xMax = move.x_mm;
            if (move.x_mm < 0) {
              violations.push({
                clause: "CENTERLINE_CROSSED",
                op_number: op.op_number,
                move_index: moveIdx,
                offending_value_mm: move.x_mm,
                limit_mm: 0,
                detail: `x_mm ${move.x_mm.toFixed(3)} crosses spindle centreline (X=0)`,
              });
            }
            if (idMin > 0 && move.x_mm < idMin) {
              violations.push({
                clause: "BELOW_ID",
                op_number: op.op_number,
                move_index: moveIdx,
                offending_value_mm: move.x_mm,
                limit_mm: idMin,
                detail: `x_mm ${move.x_mm.toFixed(3)} < stock id/2 ${idMin.toFixed(3)} (tool breached bore wall)`,
              });
            }
            if (move.x_mm > odApproachLimit) {
              warnings.push({
                clause: "OD_EXCEEDED",
                op_number: op.op_number,
                move_index: moveIdx,
                offending_value_mm: move.x_mm,
                limit_mm: odApproachLimit,
                detail: `x_mm ${move.x_mm.toFixed(3)} > od/2 + approach ${odApproachLimit.toFixed(3)}`,
              });
            }
          }
        }
        if (move.z_mm !== undefined) {
          if (!Number.isFinite(move.z_mm)) {
            violations.push({
              clause: "NAN_MOVE",
              op_number: op.op_number,
              move_index: moveIdx,
              offending_value_mm: move.z_mm,
              limit_mm: 0,
              detail: `z_mm is non-finite`,
            });
          } else {
            if (move.z_mm < zMin) zMin = move.z_mm;
            if (move.z_mm > zMax) zMax = move.z_mm;
            if (move.z_mm > zBack) {
              violations.push({
                clause: "STOCK_BACK_PENETRATED",
                op_number: op.op_number,
                move_index: moveIdx,
                offending_value_mm: move.z_mm,
                limit_mm: zBack,
                detail: `z_mm ${move.z_mm.toFixed(3)} > stock back ${zBack.toFixed(3)}`,
              });
            } else if (move.z_mm >= zGripStart) {
              violations.push({
                clause: "JAW_COLLISION",
                op_number: op.op_number,
                move_index: moveIdx,
                offending_value_mm: move.z_mm,
                limit_mm: zGripStart,
                detail: `z_mm ${move.z_mm.toFixed(3)} inside gripping region [${zGripStart.toFixed(3)}..${zBack.toFixed(3)}]`,
              });
            } else if (move.z_mm > zGripSafe) {
              warnings.push({
                clause: "JAW_CLEARANCE_LOW",
                op_number: op.op_number,
                move_index: moveIdx,
                offending_value_mm: move.z_mm,
                limit_mm: zGripSafe,
                detail: `z_mm ${move.z_mm.toFixed(3)} within ${minJawClearance} mm of gripping region`,
              });
            }
            if (move.z_mm < zFrontLimit) {
              warnings.push({
                clause: "STOCK_FRONT_EXCEEDED",
                op_number: op.op_number,
                move_index: moveIdx,
                offending_value_mm: move.z_mm,
                limit_mm: zFrontLimit,
                detail: `z_mm ${move.z_mm.toFixed(3)} ahead of face by more than ${frontClearance} mm`,
              });
            }
          }
        }
      });

      // Close-to-jaw metric per op
      const opJawClearance = zMax === -Infinity ? Infinity : zGripStart - zMax;
      if (opJawClearance < closestJawClearance) closestJawClearance = opJawClearance;

      perOp.push({
        op_number: op.op_number,
        feature_id: op.featureId,
        x_min_mm: xMin === Infinity ? 0 : xMin,
        x_max_mm: xMax === -Infinity ? 0 : xMax,
        z_min_mm: zMin === Infinity ? 0 : zMin,
        z_max_mm: zMax === -Infinity ? 0 : zMax,
        min_jaw_clearance_mm: opJawClearance === Infinity ? 0 : opJawClearance,
        safe: !violations.some((v) => v.op_number === op.op_number),
      });
    }

    // Dedupe clauses for overall summary.
    const blockingClauses = Array.from(new Set(violations.map((v) => v.clause))) as BoundaryClause[];
    const warningClauses = Array.from(new Set(warnings.map((v) => v.clause))) as BoundaryClause[];

    const gateBlock = blockingClauses.length > 0;
    const status: "SAFE" | "WARNING" | "BLOCKED" = gateBlock
      ? "BLOCKED"
      : warningClauses.length > 0
        ? "WARNING"
        : "SAFE";

    const recommendations = this.buildRecommendations(
      blockingClauses,
      warningClauses,
      stock,
      wh,
      closestJawClearance,
    );

    return {
      program_id: program.program_id,
      stock,
      workholding: wh,
      per_operation: perOp,
      violations,
      warnings,
      overall: {
        status,
        gate_block: gateBlock,
        blocking_clauses: blockingClauses,
        warning_clauses: warningClauses,
        closest_jaw_clearance_mm: Number.isFinite(closestJawClearance) ? closestJawClearance : 0,
        recommendations,
      },
      evaluated_at: new Date().toISOString(),
    };
  }

  /**
   * gate() + throw on BLOCKED. Follows the U-LSR04/U-LSR05/U-LSR22 pattern.
   */
  gateOrThrow(input: StockBoundaryGateInput): StockBoundaryGateResult {
    const result = this.gate(input);
    if (result.overall.gate_block) {
      throw new StockBoundaryBlockError(result);
    }
    return result;
  }

  // --------------------------------------------------------------------------

  private buildRecommendations(
    blocking: BoundaryClause[],
    warnings: BoundaryClause[],
    stock: StockGeometry,
    wh: Workholding,
    closestJawClearance: number,
  ): string[] {
    const recs: string[] = [];
    if (blocking.includes("CENTERLINE_CROSSED")) {
      recs.push(`BLOCK: tool crossed X=0 — verify part-off/groove final diameter > 0 or clip final move to X=0.`);
    }
    if (blocking.includes("BELOW_ID")) {
      recs.push(
        `BLOCK: OD toolpath reached into the bore (x < ${(stock.id_mm / 2).toFixed(2)}). ` +
          `Use a boring bar for ID work; OD tool should stay at x ≥ id/2.`,
      );
    }
    if (blocking.includes("JAW_COLLISION")) {
      recs.push(
        `BLOCK: toolpath enters gripping region (z ≥ ${(stock.length_mm - wh.gripping_length_mm).toFixed(2)}). ` +
          `Shorten cut length, re-grip the bar deeper, or change strategy.`,
      );
    }
    if (blocking.includes("STOCK_BACK_PENETRATED")) {
      recs.push(`BLOCK: toolpath z > stock length ${stock.length_mm} — stock too short or Z origin mis-set.`);
    }
    if (blocking.includes("NAN_MOVE")) {
      recs.push(`BLOCK: move coordinates contain NaN/Infinity — toolpath generator regression.`);
    }
    if (blocking.includes("INVALID_STOCK")) {
      recs.push(`BLOCK: gripping_length ≥ stock length — re-grip with a longer bar or reduce grip.`);
    }
    if (warnings.includes("JAW_CLEARANCE_LOW")) {
      recs.push(
        `WARN: closest jaw clearance ${closestJawClearance.toFixed(2)} mm is within safety budget — ` +
          `verify fixture and consider a rear live-centre.`,
      );
    }
    if (warnings.includes("OD_EXCEEDED")) {
      recs.push(`WARN: a move lives beyond od/2 + approach clearance — usually a rapid; confirm clearance plane.`);
    }
    if (warnings.includes("STOCK_FRONT_EXCEEDED")) {
      recs.push(`WARN: a move lives ahead of face beyond front clearance — confirm facing approach height.`);
    }
    if (blocking.length === 0 && warnings.length === 0) {
      recs.push(
        `All operations within stock/jaw boundaries. Closest jaw clearance: ${closestJawClearance.toFixed(2)} mm.`,
      );
    }
    return recs;
  }
}

export const stockBoundaryGateEngine = new StockBoundaryGateEngine();
export { StockBoundaryGateEngine };
