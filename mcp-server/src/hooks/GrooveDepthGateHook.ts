/**
 * GrooveDepthGateHook — LATHE-PRO-MS4b Forge-Triple hook.
 *
 * Safety gate on grooving / parting geometry + tool setup. Blocks
 * operations that exceed physics safety margins:
 *
 *   1. Blade L/t ratio > 10 (overhang / blade thickness) → chatter risk.
 *   2. Peak blade stress > 50% of blade yield (HSS-Co 800 MPa default) → feed too high.
 *   3. Groove depth/width > 6 without peck cycle → chip evacuation failure.
 *   4. Blade width > groove width → impossible single-plunge cut.
 *
 * The hook delegates physics to GrooveClassificationEngine so the
 * Sandvik/ISO tables live in one place.
 *
 * Guarded dispatcher actions:
 *   • turning_groove_optimize
 *   • turning_groove_classify
 *   • turning_groove_deep_cycle
 *   • turning_partoff_optimize
 *   • turning_partoff_catcher_timing
 *   • turning_partoff_blade_stress
 *   • turning_groove_depth_gate (self-dispatch)
 *
 * @milestone LATHE-PRO-MS4b Forge-Triple
 * @module hooks/GrooveDepthGateHook
 * @version 1.0.0
 */

import { z } from "zod";
import {
  grooveClassificationEngine,
  type GrooveGeometry,
  type ISOGroup,
} from "../engines/GrooveClassificationEngine.js";

// ── Hook metadata ───────────────────────────────────────────────────────────

export const HOOK_NAME = "groove-depth-gate";
export const HOOK_VERSION = "1.0.0";

export const GUARDED_ACTIONS = [
  "turning_groove_optimize",
  "turning_groove_classify",
  "turning_groove_deep_cycle",
  "turning_partoff_optimize",
  "turning_partoff_catcher_timing",
  "turning_partoff_blade_stress",
  "turning_groove_depth_gate",
] as const;

// ── Schemas ─────────────────────────────────────────────────────────────────

const GateInputSchema = z.object({
  groove_width_mm: z.number().positive(),
  groove_depth_mm: z.number().positive(),
  workpiece_diameter_mm: z.number().positive(),
  blade_width_mm: z.number().positive(),
  blade_overhang_mm: z.number().positive().optional(),
  blade_thickness_mm: z.number().positive().optional(),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  feed_per_rev_mm: z.number().positive().optional(),
  cutting_speed_m_min: z.number().positive().optional(),
  blade_yield_MPa: z.number().positive().optional(),
  /** Override the default L/t chatter ceiling (default 10). */
  lt_ratio_ceiling: z.number().min(1).max(30).optional(),
  /** Override the default 50% stress-to-yield ceiling. */
  stress_fraction_ceiling: z.number().min(0.05).max(1.0).optional(),
  /** Override the default 6.0 depth/width ratio without peck cycle. */
  depth_width_ceiling: z.number().min(1).max(20).optional(),
});

export type GrooveDepthGateInput = z.infer<typeof GateInputSchema>;

export type GateSeverity = "pass" | "warning" | "block" | "error";

export interface GrooveDepthGateViolation {
  code: string;
  parameter: string;
  value: number;
  limit: number;
  severity: GateSeverity;
  message: string;
}

export interface GrooveDepthGateResult {
  passed: boolean;
  blocked: boolean;
  severity: GateSeverity;
  safety_score: number;
  violations: GrooveDepthGateViolation[];
  /** Derived metrics the operator reads. */
  metrics: {
    lt_ratio: number;
    stress_to_yield_fraction: number;
    depth_over_width: number;
  };
  summary: string;
  source: string;
}

// ── Hook implementation ─────────────────────────────────────────────────────

export class GrooveDepthGateHook {
  static readonly VERSION = HOOK_VERSION;

  static async validate(input: GrooveDepthGateInput): Promise<GrooveDepthGateResult> {
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
            message: `GrooveDepthGateHook: invalid input — ${parsed.error.message}`,
          },
        ],
        metrics: { lt_ratio: 0, stress_to_yield_fraction: 0, depth_over_width: 0 },
        summary: "GrooveDepthGateHook rejected invalid input before evaluation.",
        source: "GrooveDepthGateHook.validate",
      };
    }

    const cfg = parsed.data;
    const ltCeiling = cfg.lt_ratio_ceiling ?? 10;
    const stressCeiling = cfg.stress_fraction_ceiling ?? 0.5;
    const depthCeiling = cfg.depth_width_ceiling ?? 6.0;
    const bladeOverhang = cfg.blade_overhang_mm ?? cfg.blade_width_mm * 4;
    const bladeThickness = cfg.blade_thickness_mm ?? cfg.blade_width_mm;
    const feed = cfg.feed_per_rev_mm ?? 0.08;
    const vc = cfg.cutting_speed_m_min ?? 120;

    // Delegate stress to engine.
    let stress: Awaited<ReturnType<typeof grooveClassificationEngine.bladeStress>>;
    try {
      stress = await grooveClassificationEngine.bladeStress(
        cfg.workpiece_diameter_mm,
        cfg.blade_width_mm,
        feed,
        vc,
        cfg.material_iso_group as ISOGroup,
        bladeOverhang,
        bladeThickness,
        cfg.blade_yield_MPa ?? 800,
      );
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
            parameter: "blade_stress",
            value: 0,
            limit: 0,
            severity: "error",
            message: `GrooveDepthGateHook: stress calc failed — ${msg}`,
          },
        ],
        metrics: { lt_ratio: 0, stress_to_yield_fraction: 0, depth_over_width: 0 },
        summary: `GrooveDepthGateHook errored: ${msg}`,
        source: "GrooveDepthGateHook.validate",
      };
    }

    const ltRatio = stress.lt_ratio;
    const stressFraction = stress.stress_to_yield_fraction;
    const depthOverWidth = cfg.groove_depth_mm / Math.max(cfg.groove_width_mm, 1e-6);
    const bladeTooWide = cfg.blade_width_mm > cfg.groove_width_mm * 1.05;

    const violations: GrooveDepthGateViolation[] = [];
    // Classify geometry to know cycle — peck is OK at high d/w, single-plunge is not.
    const classify = (grooveClassificationEngine as unknown as {
      classify: (g: GrooveGeometry) => { cycle: string };
    }).classify(cfg as unknown as GrooveGeometry);
    const usesPeck = classify.cycle === "peck";

    if (ltRatio > ltCeiling) {
      violations.push({
        code: "LT_RATIO_EXCEEDED",
        parameter: "blade_overhang / blade_thickness",
        value: ltRatio,
        limit: ltCeiling,
        severity: "block",
        message: `Blade L/t ratio ${ltRatio} exceeds ceiling ${ltCeiling} — chatter risk. Shorten overhang or switch to damped blade.`,
      });
    }
    if (stressFraction > stressCeiling) {
      violations.push({
        code: "BLADE_STRESS_EXCEEDED",
        parameter: "stress_to_yield_fraction",
        value: stressFraction,
        limit: stressCeiling,
        severity: "block",
        message: `Blade stress ${(stressFraction * 100).toFixed(1)}% of yield exceeds ${(stressCeiling * 100).toFixed(0)}% ceiling. Reduce feed.`,
      });
    }
    if (depthOverWidth > depthCeiling && !usesPeck) {
      violations.push({
        code: "DEEP_GROOVE_NO_PECK",
        parameter: "groove_depth / groove_width",
        value: depthOverWidth,
        limit: depthCeiling,
        severity: "block",
        message: `Depth/width ratio ${depthOverWidth.toFixed(1)} > ${depthCeiling} without peck cycle — chip evacuation failure. Re-classify with peck.`,
      });
    }
    if (bladeTooWide) {
      violations.push({
        code: "BLADE_WIDER_THAN_GROOVE",
        parameter: "blade_width_mm",
        value: cfg.blade_width_mm,
        limit: cfg.groove_width_mm,
        severity: "block",
        message: `Blade width ${cfg.blade_width_mm}mm > groove width ${cfg.groove_width_mm}mm — impossible cut. Pick narrower blade.`,
      });
    }

    // Warnings (non-blocking).
    if (
      violations.length === 0 &&
      ltRatio > ltCeiling * 0.8
    ) {
      violations.push({
        code: "LT_RATIO_THIN",
        parameter: "lt_ratio",
        value: ltRatio,
        limit: ltCeiling * 0.8,
        severity: "warning",
        message: `L/t ratio ${ltRatio} within 20% of ceiling ${ltCeiling} — monitor chatter.`,
      });
    }
    if (
      violations.length === 0 &&
      stressFraction > stressCeiling * 0.8
    ) {
      violations.push({
        code: "STRESS_THIN",
        parameter: "stress_fraction",
        value: stressFraction,
        limit: stressCeiling * 0.8,
        severity: "warning",
        message: `Blade stress ${(stressFraction * 100).toFixed(1)}% within 20% of ${(stressCeiling * 100).toFixed(0)}% ceiling — monitor wear.`,
      });
    }

    const hardViolation = violations.find((v) => v.severity === "block");
    const warning = violations.find((v) => v.severity === "warning");

    let severity: GateSeverity;
    let passed: boolean;
    let blocked: boolean;
    let safetyScore: number;
    let summary: string;

    if (hardViolation) {
      severity = "block";
      passed = false;
      blocked = true;
      safetyScore = 0;
      summary = `BLOCK: ${hardViolation.code} — ${hardViolation.message}`;
    } else if (warning) {
      severity = "warning";
      passed = true;
      blocked = false;
      safetyScore = 0.6;
      summary = `WARNING: ${warning.code} — ${warning.message}`;
    } else {
      severity = "pass";
      passed = true;
      blocked = false;
      // Score scales with distance from ceilings.
      const ltSlack = Math.max(0, 1 - ltRatio / ltCeiling);
      const stressSlack = Math.max(0, 1 - stressFraction / stressCeiling);
      safetyScore = Math.round((0.5 + 0.5 * Math.min(ltSlack, stressSlack)) * 1000) / 1000;
      summary = `PASS: L/t=${ltRatio}, stress=${(stressFraction * 100).toFixed(1)}% yield, d/w=${depthOverWidth.toFixed(1)}.`;
    }

    return {
      passed,
      blocked,
      severity,
      safety_score: safetyScore,
      violations,
      metrics: {
        lt_ratio: ltRatio,
        stress_to_yield_fraction: stressFraction,
        depth_over_width: Math.round(depthOverWidth * 100) / 100,
      },
      summary,
      source: "GrooveDepthGateHook.validate (L/t + stress + d/w + blade-vs-groove gates)",
    };
  }
}

export const grooveDepthGateHook = GrooveDepthGateHook;
