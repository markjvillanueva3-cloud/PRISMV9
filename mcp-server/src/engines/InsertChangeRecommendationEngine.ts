/**
 * InsertChangeRecommendationEngine — Recommends insert changes during production.
 *
 * Uses accumulated wear data from TurningToolpathWearEngine to:
 * - Track current wear state per insert station
 * - Predict remaining parts per edge
 * - Generate urgency-based change recommendations (GREEN/YELLOW/RED/CRITICAL)
 * - Suggest optimal change points in a batch to minimize scrap
 *
 * Wear criteria (ISO 3685:1993):
 * - VB_max = 0.3 mm (300 µm) — uniform flank wear
 * - VB_notch = 0.6 mm (600 µm) — notch wear at DOC line
 * - Crater KT = 0.06 + 0.3f [mm] — crater depth limit
 *
 * References:
 * - ISO 3685:1993 — Tool-life testing with single-point turning tools
 * - Sandvik "Tool wear monitoring" application guide
 *
 * @module engines/InsertChangeRecommendationEngine
 * @milestone LATHE-PRO-MS1 U-LPR13
 */

import { turningToolpathWearEngine, type ToolpathWearInput, type ToolpathWearResult } from "./TurningToolpathWearEngine.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type Urgency = "GREEN" | "YELLOW" | "RED" | "CRITICAL";

export interface InsertStation {
  station: number;
  tool_description: string;
  insert_code?: string;
  /** Current accumulated wear [µm VB] */
  current_wear_um: number;
  /** Total parts machined on this edge */
  parts_machined: number;
}

export interface InsertChangeInput {
  stations: InsertStation[];
  /** Wear per part [µm] — from TurningToolpathWearEngine */
  wear_per_part_um: Record<number, number>;
  /** Batch size remaining */
  batch_remaining: number;
  /** Feed per rev [mm/rev] — needed for crater KT limit */
  f_mm_rev?: number;
}

export interface InsertChangeRecommendation {
  station: number;
  tool_description: string;
  current_wear_um: number;
  /** Percentage of VB_max consumed */
  wear_pct: number;
  /** Estimated remaining parts before VB_max */
  remaining_parts: number;
  /** Part number at which to change insert */
  change_at_part: number;
  urgency: Urgency;
  /** Human-readable recommendation */
  message: string;
  /** Wear criteria that's limiting */
  limiting_criterion: "VB_max" | "VB_notch" | "KT_crater";
}

export interface BatchInsertPlan {
  recommendations: InsertChangeRecommendation[];
  /** Total insert changes needed for the remaining batch */
  total_changes: number;
  /** Optimal change schedule: [{part_number, stations_to_change}] */
  change_schedule: Array<{ at_part: number; stations: number[] }>;
  /** Estimated total insert cost for this batch */
  insert_cost_estimate?: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

/** VB_max = 0.3 mm = 300 µm — ISO 3685 uniform flank wear limit */
const VB_MAX_UM = 300;

/** VB_notch = 0.6 mm = 600 µm — notch wear limit (at DOC line) */
const VB_NOTCH_UM = 600;

/** Urgency thresholds (% of VB_max) */
const URGENCY: Record<Urgency, { min: number; max: number }> = {
  GREEN:    { min: 0,   max: 50 },
  YELLOW:   { min: 50,  max: 75 },
  RED:      { min: 75,  max: 90 },
  CRITICAL: { min: 90,  max: 100 },
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class InsertChangeRecommendationEngine {
  /**
   * Evaluate all insert stations and generate change recommendations.
   *
   * @param input - Current insert states, wear rates, and batch info
   * @returns Per-station recommendations with batch change schedule
   *
   * Ref: ISO 3685:1993 wear criteria
   */
  recommend(input: InsertChangeInput): BatchInsertPlan {
    const recommendations: InsertChangeRecommendation[] = [];

    for (const station of input.stations) {
      const wearPerPart = input.wear_per_part_um[station.station] ?? 10; // default 10 µm/part
      const rec = this.evaluateStation(station, wearPerPart, input.f_mm_rev ?? 0.3);
      recommendations.push(rec);
    }

    // Sort by urgency (CRITICAL first)
    const urgencyOrder: Record<Urgency, number> = { CRITICAL: 0, RED: 1, YELLOW: 2, GREEN: 3 };
    recommendations.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    // Build batch change schedule
    const schedule = this.buildChangeSchedule(recommendations, input.batch_remaining);

    return {
      recommendations,
      total_changes: schedule.reduce((sum, s) => sum + s.stations.length, 0),
      change_schedule: schedule,
    };
  }

  /** Evaluate a single station's wear state */
  private evaluateStation(
    station: InsertStation,
    wearPerPart: number,
    f_mm_rev: number,
  ): InsertChangeRecommendation {
    // ── VB_max check ──
    const wearPct = (station.current_wear_um / VB_MAX_UM) * 100;

    // ── Crater KT limit: KT_max = 0.06 + 0.3f [mm] ──
    // Assume crater depth tracks ~30% of flank wear for steel
    const ktLimit_um = (0.06 + 0.3 * f_mm_rev) * 1000; // convert mm → µm
    const estimatedKT = station.current_wear_um * 0.30;
    const ktPct = (estimatedKT / ktLimit_um) * 100;

    // ── Determine limiting criterion ──
    let limiting: InsertChangeRecommendation["limiting_criterion"] = "VB_max";
    let effectivePct = wearPct;
    if (ktPct > wearPct) {
      limiting = "KT_crater";
      effectivePct = ktPct;
    }

    // ── Remaining parts ──
    const remainingWear = Math.max(0, VB_MAX_UM - station.current_wear_um);
    const remainingParts = wearPerPart > 0 ? Math.floor(remainingWear / wearPerPart) : 999;

    // ── Change point ──
    const changeAtPart = station.parts_machined + remainingParts;

    // ── Urgency ──
    let urgency: Urgency = "GREEN";
    if (effectivePct >= URGENCY.CRITICAL.min) urgency = "CRITICAL";
    else if (effectivePct >= URGENCY.RED.min) urgency = "RED";
    else if (effectivePct >= URGENCY.YELLOW.min) urgency = "YELLOW";

    // ── Message ──
    const messages: Record<Urgency, string> = {
      GREEN: `T${station.station} OK — ${remainingParts} parts remaining (${Math.round(effectivePct)}% worn)`,
      YELLOW: `T${station.station} MONITOR — ${remainingParts} parts remaining. Plan change at part #${changeAtPart}`,
      RED: `T${station.station} CHANGE SOON — Only ${remainingParts} parts left! Schedule change.`,
      CRITICAL: `T${station.station} CHANGE NOW — ${Math.round(effectivePct)}% worn, ${remainingParts} parts to failure!`,
    };

    return {
      station: station.station,
      tool_description: station.tool_description,
      current_wear_um: station.current_wear_um,
      wear_pct: round1(effectivePct),
      remaining_parts: remainingParts,
      change_at_part: changeAtPart,
      urgency,
      message: messages[urgency],
      limiting_criterion: limiting,
    };
  }

  /** Build optimal change schedule to minimize stops */
  private buildChangeSchedule(
    recs: InsertChangeRecommendation[],
    batchRemaining: number,
  ): BatchInsertPlan["change_schedule"] {
    if (recs.length === 0) return [];

    // Group changes by approximate change point (within 5 parts of each other)
    const changePoints: Map<number, number[]> = new Map();

    for (const rec of recs) {
      if (rec.remaining_parts <= 0) {
        // Immediate change needed
        const existing = changePoints.get(0) ?? [];
        existing.push(rec.station);
        changePoints.set(0, existing);
        continue;
      }

      // How many changes for this station across the remaining batch?
      const changesNeeded = Math.ceil(batchRemaining / Math.max(1, rec.remaining_parts));
      let nextChange = rec.remaining_parts;

      for (let i = 0; i < changesNeeded && nextChange <= batchRemaining; i++) {
        // Snap to nearest 5 parts for grouping
        const snapped = Math.round(nextChange / 5) * 5;
        const existing = changePoints.get(snapped) ?? [];
        if (!existing.includes(rec.station)) {
          existing.push(rec.station);
        }
        changePoints.set(snapped, existing);
        nextChange += rec.remaining_parts > 0 ? rec.remaining_parts : batchRemaining;
      }
    }

    // Convert to sorted schedule
    return Array.from(changePoints.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([atPart, stations]) => ({
        at_part: atPart,
        stations: stations.sort((a, b) => a - b),
      }));
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }

export const insertChangeRecommendationEngine = new InsertChangeRecommendationEngine();
export { InsertChangeRecommendationEngine };
