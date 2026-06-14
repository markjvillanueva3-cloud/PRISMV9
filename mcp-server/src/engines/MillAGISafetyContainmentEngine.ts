/**
 * MillAGISafetyContainmentEngine
 * ================================
 *
 * Bounds AGI outputs against mill physics envelopes, cost margins, shop
 * capacity, and mill-specific kinematic requirements. Every AGI
 * recommendation must pass this gate before being consumed by P1..P5.
 * Failures return a structured rejection with a trace of which check
 * failed and the bound that was violated.
 *
 * Mill parity for LatheAGISafetyContainmentEngine (LATHE-MASTER U-LTH61)
 * with 2 MILL-CANONICAL extensions:
 *
 *   - Kinematic check substitutes mill axes (4th/5th/pallet/probe) for
 *     lathe axes (live_tool/sub_spindle/y_axis)
 *   - Chatter check (MILL-CANONICAL — lathe rarely chatter-bound) —
 *     verifies flute_count × rpm doesn't hit a tool-tooth chatter lobe
 *
 * Check categories:
 *   - physics     — Vc within ISO group envelope, fz_per_tooth within
 *                   fz_max (MILL-CANONICAL: per-tooth not per-rev)
 *   - economics   — quote margin ≥ 0.10 (10% minimum), not 0.00 or
 *                   negative; shared with lathe
 *   - capacity    — schedule total hours ≤ fleet_capacity_hours; shared
 *   - kinematic   — MILL-CANONICAL: requires_4th_axis / requires_5th_axis
 *                   / requires_pallet_changer / requires_probe vs machine_has_*
 *   - chatter     — MILL-CANONICAL: tooth-passing freq vs known
 *                   stability lobes (Tlusty & Polacek 1963)
 *
 * Each check has soft + hard thresholds. Soft = warning. Hard = block.
 *
 * Citations:
 *   - Sandvik Milling Handbook (Vc envelopes per ISO group)
 *   - CANONICAL_KIENZLE (src/physics/constants.ts)
 *   - Tlusty & Polacek 1963 (chatter stability lobes)
 *   - Altintas "Manufacturing Automation" 2e §3 (mill chatter regen)
 *   - JM Die shop-floor margin minimum (10%)
 *
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-AGI-SAFETY-CONTAINMENT (iter81)
 */

import { z } from "zod";
import { CANONICAL_KIENZLE, type ISOGroup } from "../physics/constants.js";

// ═══════════════════════════════════════════════════════════════════════
// PHYSICS ENVELOPES (mill rates — slightly higher than lathe at high end
// for aluminum and slightly lower at the spindle-bound bottom)
// ═══════════════════════════════════════════════════════════════════════

/** Cutting speed envelope (m/min) by ISO group — soft/hard bounds for mill. */
export const MILL_VC_ENVELOPE: Record<ISOGroup, { min_soft: number; min_hard: number; max_soft: number; max_hard: number }> = {
  P: { min_hard: 20, min_soft: 50,  max_soft: 400,  max_hard: 600 },
  M: { min_hard: 15, min_soft: 40,  max_soft: 300,  max_hard: 450 },
  K: { min_hard: 30, min_soft: 60,  max_soft: 400,  max_hard: 550 }, // CI mill goes faster than lathe
  N: { min_hard: 80, min_soft: 200, max_soft: 1500, max_hard: 2500 }, // mill Al at HSM up to 2500
  S: { min_hard: 5,  min_soft: 15,  max_soft: 120,  max_hard: 200 },
  H: { min_hard: 10, min_soft: 30,  max_soft: 200,  max_hard: 300 },
};

/** Max fz per TOOTH (mm/tooth) by ISO group. */
export const MILL_FZ_PER_TOOTH_MAX: Record<ISOGroup, { max_soft: number; max_hard: number }> = {
  P: { max_soft: 0.20, max_hard: 0.40 },
  M: { max_soft: 0.15, max_hard: 0.30 },
  K: { max_soft: 0.25, max_hard: 0.40 },
  N: { max_soft: 0.30, max_hard: 0.50 },
  S: { max_soft: 0.10, max_hard: 0.20 },
  H: { max_soft: 0.08, max_hard: 0.15 },
};

// ═══════════════════════════════════════════════════════════════════════
// OTHER CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

export const MARGIN_MIN_HARD = 0.0;
export const MARGIN_MIN_SOFT = 0.10;
/** Spindle force margin (N) — typical Haas/Mazak VMC envelope. */
export const SPINDLE_FORCE_MARGIN_N_MILL = 7000;
export const FLEET_CAPACITY_HOURS_DEFAULT = 168;
const SOFT_WARNING_CODE = "soft";
const HARD_BLOCK_CODE = "hard";

/**
 * Known mill chatter-lobe danger zones — tooth-pass frequency multiples
 * of the dominant structural mode. For mill cutters the regenerative
 * chatter danger zone is at tooth-pass freq = 0.8..1.2 × natural_freq.
 * (Per Altintas §3 stability lobe theory.)
 */
export const CHATTER_DANGER_ZONE_LOW = 0.8;
export const CHATTER_DANGER_ZONE_HIGH = 1.2;

// ═══════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════

export const MillSpeedFeedCandidateSchema = z.object({
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  vc_m_min: z.number().finite(),
  fz_mm_tooth: z.number().finite(), // MILL-CANONICAL per-tooth
  ap_mm: z.number().finite(),
  ae_mm: z.number().finite().optional(), // MILL-CANONICAL radial engagement
  flute_count: z.number().int().min(1),
});
export type MillSpeedFeedCandidate = z.infer<typeof MillSpeedFeedCandidateSchema>;

export const MillQuoteCandidateSchema = z.object({
  unit_price_usd: z.number().finite(),
  total_direct_cost_usd: z.number().finite(),
  quantity: z.number().int().positive(),
});
export type MillQuoteCandidate = z.infer<typeof MillQuoteCandidateSchema>;

export const MillScheduleCandidateSchema = z.object({
  total_busy_min: z.number().finite(),
  fleet_capacity_hours: z.number().positive().optional(),
});
export type MillScheduleCandidate = z.infer<typeof MillScheduleCandidateSchema>;

/** MILL-CANONICAL kinematic axes (4th/5th rotary, pallet, probe). */
export const MillKinematicCandidateSchema = z.object({
  requires_4th_axis: z.boolean().default(false),
  requires_5th_axis: z.boolean().default(false),
  requires_pallet_changer: z.boolean().default(false),
  requires_probe: z.boolean().default(false),
  machine_has_4th_axis: z.boolean().default(false),
  machine_has_5th_axis: z.boolean().default(false),
  machine_has_pallet_changer: z.boolean().default(false),
  machine_has_probe: z.boolean().default(false),
});
export type MillKinematicCandidate = z.infer<typeof MillKinematicCandidateSchema>;

/** MILL-CANONICAL chatter check (Tlusty stability lobes). */
export const MillChatterCandidateSchema = z.object({
  rpm: z.number().positive(),
  flute_count: z.number().int().min(1),
  /** Dominant structural mode of the tool-holder-spindle (Hz). */
  natural_freq_hz: z.number().positive(),
});
export type MillChatterCandidate = z.infer<typeof MillChatterCandidateSchema>;

export const MillSafetyCheckInputSchema = z.object({
  category: z.enum(["physics", "economics", "capacity", "kinematic", "chatter", "all"]),
  speed_feed: MillSpeedFeedCandidateSchema.optional(),
  quote: MillQuoteCandidateSchema.optional(),
  schedule: MillScheduleCandidateSchema.optional(),
  kinematic: MillKinematicCandidateSchema.optional(),
  chatter: MillChatterCandidateSchema.optional(),
});
export type MillSafetyCheckInput = z.infer<typeof MillSafetyCheckInputSchema>;

// ═══════════════════════════════════════════════════════════════════════
// DOMAIN TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillSeverity = "none" | typeof SOFT_WARNING_CODE | typeof HARD_BLOCK_CODE;

export type MillCheckCategory = "physics" | "economics" | "capacity" | "kinematic" | "chatter";

export interface MillCheckResult {
  category: MillCheckCategory;
  check_id: string;
  severity: MillSeverity;
  message: string;
  bound_low?: number;
  bound_high?: number;
  observed?: number;
}

export interface MillSafetyReport {
  passed: boolean;
  blocking_count: number;
  warning_count: number;
  checks: MillCheckResult[];
  trace: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillAGISafetyContainmentEngine {
  check(input: MillSafetyCheckInput): MillSafetyReport {
    const parsed = MillSafetyCheckInputSchema.parse(input);
    const checks: MillCheckResult[] = [];
    const trace: string[] = [];

    if (parsed.category === "physics" || parsed.category === "all") {
      if (parsed.speed_feed) {
        checks.push(...this.checkPhysics(parsed.speed_feed));
        trace.push(`physics: evaluated Vc=${parsed.speed_feed.vc_m_min}, fz=${parsed.speed_feed.fz_mm_tooth}/tooth, ap=${parsed.speed_feed.ap_mm}`);
      }
    }
    if (parsed.category === "economics" || parsed.category === "all") {
      if (parsed.quote) {
        checks.push(...this.checkEconomics(parsed.quote));
        trace.push(`economics: evaluated unit=${parsed.quote.unit_price_usd}, direct=${parsed.quote.total_direct_cost_usd}, qty=${parsed.quote.quantity}`);
      }
    }
    if (parsed.category === "capacity" || parsed.category === "all") {
      if (parsed.schedule) {
        checks.push(...this.checkCapacity(parsed.schedule));
        trace.push(`capacity: evaluated busy=${parsed.schedule.total_busy_min} min`);
      }
    }
    if (parsed.category === "kinematic" || parsed.category === "all") {
      if (parsed.kinematic) {
        checks.push(...this.checkKinematic(parsed.kinematic));
        trace.push("kinematic: evaluated required vs present flags");
      }
    }
    if (parsed.category === "chatter" || parsed.category === "all") {
      if (parsed.chatter) {
        checks.push(...this.checkChatter(parsed.chatter));
        trace.push(`chatter: evaluated rpm=${parsed.chatter.rpm}, Z=${parsed.chatter.flute_count}, fn=${parsed.chatter.natural_freq_hz}Hz`);
      }
    }

    const blocking = checks.filter((c) => c.severity === HARD_BLOCK_CODE).length;
    const warning = checks.filter((c) => c.severity === SOFT_WARNING_CODE).length;
    trace.push(`final: ${checks.length} checks, ${blocking} blocking, ${warning} warnings`);

    return {
      passed: blocking === 0,
      blocking_count: blocking,
      warning_count: warning,
      checks,
      trace,
    };
  }

  getStats(): {
    categories: MillCheckCategory[];
    mill_canonical_extensions: string[];
    iso_groups: ISOGroup[];
    margin_thresholds: { min_hard: number; min_soft: number };
    chatter_danger_zone: { low: number; high: number };
    reference: string;
  } {
    return {
      categories: ["physics", "economics", "capacity", "kinematic", "chatter"],
      mill_canonical_extensions: ["chatter_check", "fz_per_tooth", "kinematic_4_5_axis_pallet_probe"],
      iso_groups: ["P", "M", "K", "N", "S", "H"],
      margin_thresholds: { min_hard: MARGIN_MIN_HARD, min_soft: MARGIN_MIN_SOFT },
      chatter_danger_zone: { low: CHATTER_DANGER_ZONE_LOW, high: CHATTER_DANGER_ZONE_HIGH },
      reference: "Sandvik Milling Hbk; CANONICAL_KIENZLE; Tlusty & Polacek 1963; Altintas Manufacturing Automation 2e §3",
    };
  }

  // ── check implementations ───────────────────────────────────────────

  private checkPhysics(sf: MillSpeedFeedCandidate): MillCheckResult[] {
    const results: MillCheckResult[] = [];
    const envelope = MILL_VC_ENVELOPE[sf.iso_group];
    const fzLimits = MILL_FZ_PER_TOOTH_MAX[sf.iso_group];
    const kienzle = CANONICAL_KIENZLE[sf.iso_group]; // reference touch

    // Vc envelope
    if (sf.vc_m_min < envelope.min_hard) {
      results.push({
        category: "physics", check_id: "vc_below_hard_min", severity: HARD_BLOCK_CODE,
        message: `Vc ${sf.vc_m_min} m/min below hard min ${envelope.min_hard} for ${sf.iso_group}`,
        bound_low: envelope.min_hard, observed: sf.vc_m_min,
      });
    } else if (sf.vc_m_min < envelope.min_soft) {
      results.push({
        category: "physics", check_id: "vc_below_soft_min", severity: SOFT_WARNING_CODE,
        message: `Vc ${sf.vc_m_min} below recommended ${envelope.min_soft} — risk of BUE`,
        bound_low: envelope.min_soft, observed: sf.vc_m_min,
      });
    } else if (sf.vc_m_min > envelope.max_hard) {
      results.push({
        category: "physics", check_id: "vc_above_hard_max", severity: HARD_BLOCK_CODE,
        message: `Vc ${sf.vc_m_min} exceeds hard max ${envelope.max_hard} for ${sf.iso_group}`,
        bound_high: envelope.max_hard, observed: sf.vc_m_min,
      });
    } else if (sf.vc_m_min > envelope.max_soft) {
      results.push({
        category: "physics", check_id: "vc_above_soft_max", severity: SOFT_WARNING_CODE,
        message: `Vc ${sf.vc_m_min} above recommended ${envelope.max_soft} — rapid wear`,
        bound_high: envelope.max_soft, observed: sf.vc_m_min,
      });
    }

    // MILL-CANONICAL: fz PER TOOTH check (not per-rev like lathe)
    if (sf.fz_mm_tooth <= 0) {
      results.push({
        category: "physics", check_id: "fz_nonpositive", severity: HARD_BLOCK_CODE,
        message: `fz_mm_tooth ${sf.fz_mm_tooth} must be > 0`,
        observed: sf.fz_mm_tooth,
      });
    } else if (sf.fz_mm_tooth > fzLimits.max_hard) {
      results.push({
        category: "physics", check_id: "fz_above_hard_max", severity: HARD_BLOCK_CODE,
        message: `fz_mm_tooth ${sf.fz_mm_tooth} exceeds hard max ${fzLimits.max_hard} for ${sf.iso_group}`,
        bound_high: fzLimits.max_hard, observed: sf.fz_mm_tooth,
      });
    } else if (sf.fz_mm_tooth > fzLimits.max_soft) {
      results.push({
        category: "physics", check_id: "fz_above_soft_max", severity: SOFT_WARNING_CODE,
        message: `fz_mm_tooth ${sf.fz_mm_tooth} above recommended ${fzLimits.max_soft} — chip overload risk`,
        bound_high: fzLimits.max_soft, observed: sf.fz_mm_tooth,
      });
    }

    // ap and ae positivity
    if (sf.ap_mm <= 0) {
      results.push({
        category: "physics", check_id: "ap_nonpositive", severity: HARD_BLOCK_CODE,
        message: `ap_mm ${sf.ap_mm} must be > 0`, observed: sf.ap_mm,
      });
    }
    if (sf.ae_mm !== undefined && sf.ae_mm <= 0) {
      results.push({
        category: "physics", check_id: "ae_nonpositive", severity: HARD_BLOCK_CODE,
        message: `ae_mm ${sf.ae_mm} must be > 0`, observed: sf.ae_mm,
      });
    }

    // Approximate force check (Kienzle-style): Fc ≈ kc × ae × fz × Z_engagement
    if (sf.ae_mm !== undefined) {
      const kc = kienzle.kc1_1;
      // Conservative envelope force estimate per chip: kc × ae × fz × flute_count
      const forceEstimate = kc * sf.ae_mm * sf.fz_mm_tooth * sf.flute_count;
      if (forceEstimate > SPINDLE_FORCE_MARGIN_N_MILL) {
        results.push({
          category: "physics", check_id: "force_above_spindle_margin", severity: HARD_BLOCK_CODE,
          message: `Estimated cut force ${Math.round(forceEstimate)}N exceeds spindle margin ${SPINDLE_FORCE_MARGIN_N_MILL}N`,
          bound_high: SPINDLE_FORCE_MARGIN_N_MILL, observed: forceEstimate,
        });
      }
    }

    return results;
  }

  private checkEconomics(q: MillQuoteCandidate): MillCheckResult[] {
    const results: MillCheckResult[] = [];
    const unitCost = q.total_direct_cost_usd / q.quantity;
    const margin = q.unit_price_usd > 0
      ? (q.unit_price_usd - unitCost) / q.unit_price_usd
      : 0;
    if (margin < MARGIN_MIN_HARD) {
      results.push({
        category: "economics", check_id: "margin_negative", severity: HARD_BLOCK_CODE,
        message: `Margin ${(margin * 100).toFixed(1)}% < 0 — quote loses money`,
        bound_low: MARGIN_MIN_HARD, observed: margin,
      });
    } else if (margin < MARGIN_MIN_SOFT) {
      results.push({
        category: "economics", check_id: "margin_below_soft_min", severity: SOFT_WARNING_CODE,
        message: `Margin ${(margin * 100).toFixed(1)}% below recommended ${MARGIN_MIN_SOFT * 100}%`,
        bound_low: MARGIN_MIN_SOFT, observed: margin,
      });
    }
    return results;
  }

  private checkCapacity(s: MillScheduleCandidate): MillCheckResult[] {
    const cap = s.fleet_capacity_hours ?? FLEET_CAPACITY_HOURS_DEFAULT;
    const busyHr = s.total_busy_min / 60;
    if (busyHr > cap) {
      return [{
        category: "capacity", check_id: "busy_exceeds_capacity", severity: HARD_BLOCK_CODE,
        message: `Schedule ${busyHr.toFixed(1)}hr exceeds fleet capacity ${cap}hr`,
        bound_high: cap, observed: busyHr,
      }];
    }
    if (busyHr > cap * 0.9) {
      return [{
        category: "capacity", check_id: "busy_above_soft_threshold", severity: SOFT_WARNING_CODE,
        message: `Schedule ${busyHr.toFixed(1)}hr at >90% of capacity ${cap}hr — risk of delivery slip`,
        bound_high: cap, observed: busyHr,
      }];
    }
    return [];
  }

  private checkKinematic(k: MillKinematicCandidate): MillCheckResult[] {
    const results: MillCheckResult[] = [];
    if (k.requires_4th_axis && !k.machine_has_4th_axis) {
      results.push({
        category: "kinematic", check_id: "missing_4th_axis", severity: HARD_BLOCK_CODE,
        message: "Program requires 4th-axis (A or B rotary) but machine lacks it",
      });
    }
    if (k.requires_5th_axis && !k.machine_has_5th_axis) {
      results.push({
        category: "kinematic", check_id: "missing_5th_axis", severity: HARD_BLOCK_CODE,
        message: "Program requires 5-axis (trunnion/head tilt) but machine lacks it",
      });
    }
    if (k.requires_pallet_changer && !k.machine_has_pallet_changer) {
      results.push({
        category: "kinematic", check_id: "missing_pallet_changer", severity: SOFT_WARNING_CODE,
        message: "Program assumes pallet changer for unattended run; manual swap will reduce throughput",
      });
    }
    if (k.requires_probe && !k.machine_has_probe) {
      results.push({
        category: "kinematic", check_id: "missing_probe", severity: HARD_BLOCK_CODE,
        message: "Program calls probe routines but machine lacks touch probe",
      });
    }
    return results;
  }

  /**
   * MILL-CANONICAL chatter check (Tlusty stability lobes).
   * Tooth-pass frequency = rpm × flute_count / 60. Compare to natural_freq.
   * If tooth-pass freq is in danger zone [0.8, 1.2] × natural_freq → likely chatter.
   * Outside this zone but within higher harmonics → soft warning.
   */
  private checkChatter(c: MillChatterCandidate): MillCheckResult[] {
    const toothPassFreq = (c.rpm * c.flute_count) / 60;
    const ratio = toothPassFreq / c.natural_freq_hz;
    if (ratio >= CHATTER_DANGER_ZONE_LOW && ratio <= CHATTER_DANGER_ZONE_HIGH) {
      return [{
        category: "chatter", check_id: "tooth_pass_in_danger_zone", severity: HARD_BLOCK_CODE,
        message: `Tooth-pass freq ${toothPassFreq.toFixed(0)}Hz is ${ratio.toFixed(2)}× natural freq — in [${CHATTER_DANGER_ZONE_LOW}, ${CHATTER_DANGER_ZONE_HIGH}] chatter zone`,
        bound_low: CHATTER_DANGER_ZONE_LOW * c.natural_freq_hz,
        bound_high: CHATTER_DANGER_ZONE_HIGH * c.natural_freq_hz,
        observed: toothPassFreq,
      }];
    }
    // Check 1st harmonic stability lobe danger (0.4..0.6 × fn)
    if (ratio >= 0.4 && ratio <= 0.6) {
      return [{
        category: "chatter", check_id: "tooth_pass_near_1st_harmonic", severity: SOFT_WARNING_CODE,
        message: `Tooth-pass freq ${toothPassFreq.toFixed(0)}Hz is ${ratio.toFixed(2)}× fn — 1st-harmonic chatter risk`,
        observed: toothPassFreq,
      }];
    }
    return [];
  }
}

export const millAGISafetyContainmentEngine = new MillAGISafetyContainmentEngine();
export { MillAGISafetyContainmentEngine };
