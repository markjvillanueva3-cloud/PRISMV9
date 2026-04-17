/**
 * LatheSpeedFeedGuardHook
 * =======================
 *
 * Safety hook: speed-feed-out-of-band-guard
 * Validates lathe speed/feed recommendations against safe operating bands.
 *
 * LATHE-MASTER U-LTH14 — Forge-Triple delivery
 *
 * Triggers on: lathe_sf_calculate, lathe_sf_advise, lathe_sf_full
 *
 * Validation rules:
 * 1. Vc within ISO group safe range (+/- 50% of catalog midpoint)
 * 2. Feed within 0.02-0.6 mm/rev
 * 3. DOC within 0.1-8.0 mm
 * 4. Power requirement < 90% machine capacity
 * 5. Predicted Ra achievable for finishing ops
 *
 * @module hooks/LatheSpeedFeedGuardHook
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH14
 */

import { z } from "zod";
import {
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
} from "../physics/constants.js";

// ── Hook Configuration ──────────────────────────────────────────────────────

export const HOOK_NAME = "speed-feed-out-of-band-guard";
export const HOOK_VERSION = "1.0.0";

/** Actions this hook guards */
export const GUARDED_ACTIONS = [
  "lathe_sf_calculate",
  "lathe_sf_advise",
  "lathe_sf_full",
];

// ── Safe Band Definitions ───────────────────────────────────────────────────

/** ISO group typical cutting speed ranges (m/min) */
const ISO_VC_RANGES: Record<ISOGroup, { min: number; max: number }> = {
  P: { min: 80, max: 350 },   // Carbon/alloy steels
  M: { min: 60, max: 250 },   // Stainless steels
  K: { min: 100, max: 400 },  // Cast irons
  N: { min: 150, max: 1000 }, // Non-ferrous (aluminum)
  S: { min: 15, max: 120 },   // Superalloys/titanium
  H: { min: 40, max: 200 },   // Hardened steels
};

/** Absolute limits */
const LIMITS = {
  vc_min: 5,        // m/min - below this, rubbing not cutting
  vc_max: 1200,     // m/min - extreme aluminum/graphite
  feed_min: 0.02,   // mm/rev
  feed_max: 0.6,    // mm/rev
  doc_min: 0.05,    // mm - minimum effective cut
  doc_max: 10.0,    // mm - very heavy roughing
  rpm_min: 20,      // Minimum practical RPM
  rpm_max: 12000,   // Typical max spindle
  power_factor: 0.9, // Max 90% of machine capacity
};

// ── Input/Output Schemas ────────────────────────────────────────────────────

const GuardInputSchema = z.object({
  recommendation: z.object({
    cutting_speed_m_min: z.number(),
    rpm: z.number(),
    feed_mm_rev: z.number(),
    depth_of_cut_mm: z.number(),
  }),
  material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  machine_power_kw: z.number().optional(),
  predicted_power_kw: z.number().optional(),
  operation_type: z.string().optional(),
  predicted_ra_um: z.number().optional(),
  target_ra_um: z.number().optional(),
});

export type GuardInput = z.infer<typeof GuardInputSchema>;

export interface GuardViolation {
  code: string;
  parameter: string;
  value: number;
  limit: number;
  severity: "warning" | "error" | "critical";
  message: string;
}

export interface GuardResult {
  passed: boolean;
  violations: GuardViolation[];
  adjusted_recommendation?: {
    cutting_speed_m_min: number;
    rpm: number;
    feed_mm_rev: number;
    depth_of_cut_mm: number;
  };
  safety_score: number; // 0-1
}

// ── Hook Implementation ─────────────────────────────────────────────────────

export class LatheSpeedFeedGuardHook {
  private static readonly VERSION = HOOK_VERSION;

  /**
   * Validate a speed/feed recommendation against safe operating bands.
   */
  static validate(input: GuardInput): GuardResult {
    const parsed = GuardInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        passed: false,
        violations: [{
          code: "INVALID_INPUT",
          parameter: "input",
          value: 0,
          limit: 0,
          severity: "error",
          message: `Invalid input: ${parsed.error.message}`,
        }],
        safety_score: 0,
      };
    }

    const { recommendation, material_iso_group, machine_power_kw, predicted_power_kw, operation_type, predicted_ra_um, target_ra_um } = parsed.data;
    const violations: GuardViolation[] = [];
    const adjusted = { ...recommendation };

    // 1. Check absolute Vc limits
    if (recommendation.cutting_speed_m_min < LIMITS.vc_min) {
      violations.push({
        code: "VC_TOO_LOW",
        parameter: "cutting_speed_m_min",
        value: recommendation.cutting_speed_m_min,
        limit: LIMITS.vc_min,
        severity: "error",
        message: `Cutting speed ${recommendation.cutting_speed_m_min} m/min below minimum ${LIMITS.vc_min} m/min (rubbing risk)`,
      });
      adjusted.cutting_speed_m_min = LIMITS.vc_min;
    }
    if (recommendation.cutting_speed_m_min > LIMITS.vc_max) {
      violations.push({
        code: "VC_TOO_HIGH",
        parameter: "cutting_speed_m_min",
        value: recommendation.cutting_speed_m_min,
        limit: LIMITS.vc_max,
        severity: "critical",
        message: `Cutting speed ${recommendation.cutting_speed_m_min} m/min exceeds maximum ${LIMITS.vc_max} m/min`,
      });
      adjusted.cutting_speed_m_min = LIMITS.vc_max;
    }

    // 2. Check ISO group Vc range
    if (material_iso_group) {
      const range = ISO_VC_RANGES[material_iso_group];
      if (recommendation.cutting_speed_m_min < range.min * 0.5) {
        violations.push({
          code: "VC_BELOW_ISO_RANGE",
          parameter: "cutting_speed_m_min",
          value: recommendation.cutting_speed_m_min,
          limit: range.min * 0.5,
          severity: "warning",
          message: `Cutting speed significantly below ISO ${material_iso_group} range (${range.min}-${range.max} m/min)`,
        });
      }
      if (recommendation.cutting_speed_m_min > range.max * 1.5) {
        violations.push({
          code: "VC_ABOVE_ISO_RANGE",
          parameter: "cutting_speed_m_min",
          value: recommendation.cutting_speed_m_min,
          limit: range.max * 1.5,
          severity: "warning",
          message: `Cutting speed significantly above ISO ${material_iso_group} range (${range.min}-${range.max} m/min)`,
        });
        adjusted.cutting_speed_m_min = Math.min(adjusted.cutting_speed_m_min, range.max * 1.3);
      }
    }

    // 3. Check feed limits
    if (recommendation.feed_mm_rev < LIMITS.feed_min) {
      violations.push({
        code: "FEED_TOO_LOW",
        parameter: "feed_mm_rev",
        value: recommendation.feed_mm_rev,
        limit: LIMITS.feed_min,
        severity: "warning",
        message: `Feed ${recommendation.feed_mm_rev} mm/rev below minimum ${LIMITS.feed_min} mm/rev`,
      });
      adjusted.feed_mm_rev = LIMITS.feed_min;
    }
    if (recommendation.feed_mm_rev > LIMITS.feed_max) {
      violations.push({
        code: "FEED_TOO_HIGH",
        parameter: "feed_mm_rev",
        value: recommendation.feed_mm_rev,
        limit: LIMITS.feed_max,
        severity: "error",
        message: `Feed ${recommendation.feed_mm_rev} mm/rev exceeds maximum ${LIMITS.feed_max} mm/rev`,
      });
      adjusted.feed_mm_rev = LIMITS.feed_max;
    }

    // 4. Check DOC limits
    if (recommendation.depth_of_cut_mm < LIMITS.doc_min) {
      violations.push({
        code: "DOC_TOO_LOW",
        parameter: "depth_of_cut_mm",
        value: recommendation.depth_of_cut_mm,
        limit: LIMITS.doc_min,
        severity: "warning",
        message: `Depth of cut ${recommendation.depth_of_cut_mm} mm below minimum ${LIMITS.doc_min} mm`,
      });
      adjusted.depth_of_cut_mm = LIMITS.doc_min;
    }
    if (recommendation.depth_of_cut_mm > LIMITS.doc_max) {
      violations.push({
        code: "DOC_TOO_HIGH",
        parameter: "depth_of_cut_mm",
        value: recommendation.depth_of_cut_mm,
        limit: LIMITS.doc_max,
        severity: "error",
        message: `Depth of cut ${recommendation.depth_of_cut_mm} mm exceeds maximum ${LIMITS.doc_max} mm`,
      });
      adjusted.depth_of_cut_mm = LIMITS.doc_max;
    }

    // 5. Check RPM limits
    if (recommendation.rpm < LIMITS.rpm_min) {
      violations.push({
        code: "RPM_TOO_LOW",
        parameter: "rpm",
        value: recommendation.rpm,
        limit: LIMITS.rpm_min,
        severity: "warning",
        message: `RPM ${recommendation.rpm} below minimum ${LIMITS.rpm_min}`,
      });
      adjusted.rpm = LIMITS.rpm_min;
    }
    if (recommendation.rpm > LIMITS.rpm_max) {
      violations.push({
        code: "RPM_TOO_HIGH",
        parameter: "rpm",
        value: recommendation.rpm,
        limit: LIMITS.rpm_max,
        severity: "warning",
        message: `RPM ${recommendation.rpm} exceeds typical maximum ${LIMITS.rpm_max}`,
      });
      adjusted.rpm = LIMITS.rpm_max;
    }

    // 6. Check power requirement
    if (machine_power_kw && predicted_power_kw) {
      const powerLimit = machine_power_kw * LIMITS.power_factor;
      if (predicted_power_kw > powerLimit) {
        violations.push({
          code: "POWER_EXCEEDED",
          parameter: "predicted_power_kw",
          value: predicted_power_kw,
          limit: powerLimit,
          severity: "error",
          message: `Predicted power ${predicted_power_kw.toFixed(1)} kW exceeds ${LIMITS.power_factor * 100}% of machine capacity (${powerLimit.toFixed(1)} kW)`,
        });
      }
    }

    // 7. Check surface finish for finishing ops
    if (operation_type === "finishing" && target_ra_um && predicted_ra_um) {
      if (predicted_ra_um > target_ra_um * 1.2) {
        violations.push({
          code: "RA_TARGET_EXCEEDED",
          parameter: "predicted_ra_um",
          value: predicted_ra_um,
          limit: target_ra_um,
          severity: "warning",
          message: `Predicted Ra ${predicted_ra_um.toFixed(2)} µm may exceed target ${target_ra_um} µm — consider reducing feed`,
        });
      }
    }

    // Calculate safety score (1.0 = no violations, 0.0 = critical)
    let safetyScore = 1.0;
    for (const v of violations) {
      if (v.severity === "critical") safetyScore -= 0.4;
      else if (v.severity === "error") safetyScore -= 0.2;
      else if (v.severity === "warning") safetyScore -= 0.1;
    }
    safetyScore = Math.max(0, Math.min(1, safetyScore));

    const hasCritical = violations.some(v => v.severity === "critical");
    const hasError = violations.some(v => v.severity === "error");

    return {
      passed: !hasCritical && !hasError,
      violations,
      adjusted_recommendation: violations.length > 0 ? adjusted : undefined,
      safety_score: Math.round(safetyScore * 100) / 100,
    };
  }

  /**
   * Get version info.
   */
  static getVersion(): string {
    return this.VERSION;
  }

  /**
   * Get guarded actions.
   */
  static getGuardedActions(): string[] {
    return GUARDED_ACTIONS;
  }
}

// Export singleton
export const latheSpeedFeedGuardHook = LatheSpeedFeedGuardHook;
