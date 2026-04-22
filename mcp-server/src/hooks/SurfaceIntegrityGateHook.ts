/**
 * SurfaceIntegrityGateHook — LATHE-PRO-MS5 Forge-Triple hook.
 *
 * Safety gate on hard-turning programs. Blocks outputs that violate:
 *   1. White-layer risk — `high` or `critical` with coolant ≠ flood/cryo
 *   2. Tool wear (VB) above surface-integrity ceiling (default 0.20 mm for CBN)
 *   3. Residual-stress requirement not met (e.g., tensile required but
 *      process produces compressive)
 *   4. Composite safety gate — HardTurningCapstoneEngine flagged unsafe
 *
 * Delegates physics to HardTurningCapstoneEngine so thresholds live in
 * one place.
 *
 * @milestone LATHE-PRO-MS5 Forge-Triple
 * @module hooks/SurfaceIntegrityGateHook
 * @version 1.0.0
 */

import { z } from "zod";
import {
  hardTurningCapstoneEngine,
  type HardTurningCapstoneInput,
  type HardTurningCapstoneResult,
} from "../engines/HardTurningCapstoneEngine.js";

export const HOOK_NAME = "surface-integrity-gate";
export const HOOK_VERSION = "1.0.0";

export const GUARDED_ACTIONS = [
  "turning_grinding_replacement_analysis",
  "turning_hard_turn_optimize",
  "turning_hard_turn_decide",
  "turning_white_layer_predict",
  "turning_surface_integrity_gate",
] as const;

const GateInputSchema = z.object({
  hardness_hrc: z.number().positive().max(75),
  target_ra_um: z.number().positive(),
  target_tolerance_mm: z.number().positive(),
  feature: z.enum(["od", "bore", "face", "thread", "groove"]),
  lot_size: z.number().int().positive(),
  diameter_mm: z.number().positive(),
  length_over_diameter: z.number().positive().optional(),
  shop_has_grinder: z.boolean().optional(),
  cbn_cost_per_edge_usd: z.number().nonnegative().optional(),
  grind_cost_per_part_usd: z.number().nonnegative().optional(),
  setup_hours: z.number().nonnegative().optional(),
  grinding_baseline: z.object({
    achieved_ra_um: z.number().positive(),
    achieved_tolerance_mm: z.number().positive(),
    stock_removal_mm: z.number().positive(),
    grind_cycle_sec: z.number().positive(),
    grind_cost_per_part_usd: z.number().nonnegative(),
  }).optional(),
  residual_stress_requirement: z.enum(["tensile_required", "compressive_ok", "any"]).optional(),
  concentricity_mm: z.number().positive().optional(),
  turret_precision_mm: z.number().positive().optional(),
  wall_thickness_mm: z.number().positive().optional(),
  cutting_speed_mmin: z.number().positive().optional(),
  feed_per_rev_mm: z.number().positive().optional(),
  depth_of_cut_mm: z.number().positive().optional(),
  tool_wear_VB_mm: z.number().nonnegative().optional(),
  coolant: z.enum(["flood", "mist", "air", "dry", "cryo"]).optional(),
  forced_tool_material: z.enum(["CBN", "ceramic", "carbide"]).optional(),
  /** Override VB wear ceiling (default 0.20 mm). */
  vb_ceiling_mm: z.number().positive().max(1).optional(),
});

export type SurfaceIntegrityGateInput = z.infer<typeof GateInputSchema>;

export type GateSeverity = "pass" | "warning" | "block" | "error";

export interface SurfaceIntegrityGateViolation {
  code: string;
  parameter: string;
  value: number | string;
  limit: number | string;
  severity: GateSeverity;
  message: string;
}

export interface SurfaceIntegrityGateResult {
  passed: boolean;
  blocked: boolean;
  severity: GateSeverity;
  safety_score: number;
  violations: SurfaceIntegrityGateViolation[];
  capstone: HardTurningCapstoneResult | null;
  summary: string;
  source: string;
}

export class SurfaceIntegrityGateHook {
  static readonly VERSION = HOOK_VERSION;

  static validate(input: SurfaceIntegrityGateInput): SurfaceIntegrityGateResult {
    const parsed = GateInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        passed: false,
        blocked: true,
        severity: "error",
        safety_score: 0,
        violations: [
          {
            code: "INVALID_INPUT",
            parameter: "input",
            value: 0,
            limit: 0,
            severity: "error",
            message: `SurfaceIntegrityGateHook: invalid input — ${parsed.error.message}`,
          },
        ],
        capstone: null,
        summary: "SurfaceIntegrityGateHook rejected invalid input before evaluation.",
        source: "SurfaceIntegrityGateHook.validate",
      };
    }
    const cfg = parsed.data;
    const vbCeiling = cfg.vb_ceiling_mm ?? 0.20;

    let capstone: HardTurningCapstoneResult;
    try {
      capstone = hardTurningCapstoneEngine.optimize(cfg as HardTurningCapstoneInput);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err ?? "unknown error");
      return {
        passed: false,
        blocked: true,
        severity: "error",
        safety_score: 0,
        violations: [
          {
            code: "ENGINE_ERROR",
            parameter: "capstone",
            value: 0,
            limit: 0,
            severity: "error",
            message: `SurfaceIntegrityGateHook: capstone failed — ${msg}`,
          },
        ],
        capstone: null,
        summary: `SurfaceIntegrityGateHook errored: ${msg}`,
        source: "SurfaceIntegrityGateHook.validate",
      };
    }

    const violations: SurfaceIntegrityGateViolation[] = [];
    const vb = cfg.tool_wear_VB_mm ?? 0.1;
    const coolant = cfg.coolant ?? "flood";

    // White-layer block.
    if (
      capstone.white_layer.risk_level === "critical" ||
      (capstone.white_layer.risk_level === "high" && coolant !== "flood" && coolant !== "cryo")
    ) {
      violations.push({
        code: "WHITE_LAYER_RISK",
        parameter: "white_layer.risk_level",
        value: capstone.white_layer.risk_level,
        limit: "moderate (with flood/cryo)",
        severity: "block",
        message: `White-layer risk ${capstone.white_layer.risk_level} with coolant=${coolant} — surface damage likely. Increase coolant, reduce Vc, or freshen tool.`,
      });
    }

    // VB wear ceiling.
    if (vb > vbCeiling) {
      violations.push({
        code: "VB_WEAR_EXCEEDED",
        parameter: "tool_wear_VB_mm",
        value: vb,
        limit: vbCeiling,
        severity: "block",
        message: `VB wear ${vb} mm exceeds surface-integrity ceiling ${vbCeiling} mm. Index edge before finish pass.`,
      });
    }

    // Residual stress requirement not met.
    if (!capstone.residual_stress.meets_requirement) {
      violations.push({
        code: "RESIDUAL_STRESS_FAIL",
        parameter: "residual_stress.predicted_state",
        value: capstone.residual_stress.predicted_state,
        limit: cfg.residual_stress_requirement ?? "any",
        severity: "block",
        message: `Residual stress "${capstone.residual_stress.predicted_state}" does not satisfy requirement "${cfg.residual_stress_requirement ?? "any"}".`,
      });
    }

    // Grinding replacement blocker propagation.
    if (
      capstone.grinding_replacement &&
      capstone.grinding_replacement.feasibility === "blocked"
    ) {
      violations.push({
        code: "GRINDING_REPLACEMENT_BLOCKED",
        parameter: "grinding_replacement.feasibility",
        value: "blocked",
        limit: "replace|partial",
        severity: "block",
        message: `Grinding replacement analysis blocked: ${capstone.grinding_replacement.blockers[0] ?? "no details"}.`,
      });
    }

    // VB warning threshold (80% of ceiling).
    if (violations.length === 0 && vb > vbCeiling * 0.8) {
      violations.push({
        code: "VB_WEAR_THIN",
        parameter: "tool_wear_VB_mm",
        value: vb,
        limit: vbCeiling * 0.8,
        severity: "warning",
        message: `VB wear ${vb} mm within 20% of ceiling ${vbCeiling} mm — plan edge index before next lot.`,
      });
    }
    // Moderate white-layer risk warning.
    if (violations.length === 0 && capstone.white_layer.risk_level === "moderate") {
      violations.push({
        code: "WHITE_LAYER_MODERATE",
        parameter: "white_layer.risk_level",
        value: "moderate",
        limit: "low",
        severity: "warning",
        message: `White-layer risk moderate — consider tightening coolant or lowering Vc for critical features.`,
      });
    }

    const hard = violations.find((v) => v.severity === "block");
    const warn = violations.find((v) => v.severity === "warning");

    let severity: GateSeverity;
    let passed: boolean;
    let blocked: boolean;
    let safetyScore: number;
    let summary: string;

    if (hard) {
      severity = "block";
      passed = false;
      blocked = true;
      safetyScore = 0;
      summary = `BLOCK: ${hard.code} — ${hard.message}`;
    } else if (warn) {
      severity = "warning";
      passed = true;
      blocked = false;
      safetyScore = 0.6;
      summary = `WARNING: ${warn.code} — ${warn.message}`;
    } else {
      severity = "pass";
      passed = true;
      blocked = false;
      const vbSlack = Math.max(0, 1 - vb / vbCeiling);
      safetyScore = Math.round((0.5 + 0.5 * vbSlack) * 1000) / 1000;
      summary = `PASS: ${capstone.decision.recommendation}, white-layer ${capstone.white_layer.risk_level}, residual ${capstone.residual_stress.predicted_state}.`;
    }

    return {
      passed,
      blocked,
      severity,
      safety_score: safetyScore,
      violations,
      capstone,
      summary,
      source: "SurfaceIntegrityGateHook.validate (white-layer + VB + residual-stress + grind-replacement gates)",
    };
  }
}

export const surfaceIntegrityGateHook = SurfaceIntegrityGateHook;
