/**
 * TurningToolpathWearEngine — Toolpath-aware wear accumulation for turning.
 *
 * Models how insert wear varies along a turning toolpath:
 * - OD turning: engagement = ap/nose_radius affects wear distribution
 * - Interrupted cuts: entry/exit shock loading multiplier per revolution
 * - CSS compensation: as diameter changes, Vc changes → wear rate varies
 * - Variable wear model: integrates wear rate over toolpath length, not just time
 *
 * References:
 * - Usui, Shirakashi & Kitagawa (1978), "Analytical prediction of tool wear"
 * - Altintas "Manufacturing Automation" §4.5 — wear models
 * - ISO 3685:1993 — tool wear measurement
 * - Sandvik "CSS and tool life" application note
 *
 * @module engines/TurningToolpathWearEngine
 * @milestone LATHE-PRO-MS1 U-LPR12
 */

import {
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  taylorLife,
  kienzleForce,
  type ISOGroup,
} from "../physics/constants.js";
import { turningInsertLifeEngine } from "./TurningInsertLifeEngine.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ToolpathSegment {
  /** Segment identifier */
  id: string;
  /** Operation type */
  op_type: "od_rough" | "od_finish" | "face_rough" | "face_finish" | "bore" | "groove" | "thread" | "cutoff";
  /** Diameter at segment start [mm] */
  d_start_mm: number;
  /** Diameter at segment end [mm] */
  d_end_mm: number;
  /** Cut length along this segment [mm] */
  cut_length_mm: number;
  /** Depth of cut [mm] */
  ap_mm: number;
  /** Feed per rev [mm/rev] */
  f_mm_rev: number;
  /** Number of passes */
  passes: number;
  /** Is this an interrupted cut? */
  interrupted?: boolean;
  /** Interruptions per revolution (for interrupted cuts) */
  interruptions_per_rev?: number;
}

export interface ToolpathWearInput {
  iso_group: ISOGroup;
  material_name?: string;
  /** Target CSS speed [m/min] (or fixed Vc if not CSS) */
  Vc_m_min: number;
  /** Whether CSS mode is active */
  css_mode?: boolean;
  /** Max spindle RPM (for CSS clamp) */
  max_rpm?: number;
  /** Nose radius [mm] */
  nose_radius_mm: number;
  /** Coating on insert */
  coating?: string;
  /** Toolpath segments in execution order */
  segments: ToolpathSegment[];
}

export interface SegmentWearResult {
  segment_id: string;
  /** Wear accumulated in this segment [µm VB] */
  wear_um: number;
  /** Cumulative wear after this segment [µm VB] */
  cumulative_wear_um: number;
  /** Average Vc in this segment [m/min] */
  avg_vc_m_min: number;
  /** Cutting time for this segment [min] */
  cutting_time_min: number;
  /** Wear rate [µm/min] in this segment */
  wear_rate_um_min: number;
  /** Life fraction consumed (0-1) */
  life_fraction: number;
}

export interface ToolpathWearResult {
  /** Per-segment wear breakdown */
  segments: SegmentWearResult[];
  /** Total accumulated wear [µm VB] */
  total_wear_um: number;
  /** Total cutting time [min] */
  total_cutting_time_min: number;
  /** Total life fraction consumed (0-1) — >1.0 means insert needs changing */
  total_life_fraction: number;
  /** Estimated remaining life after this toolpath [min] */
  remaining_life_min: number;
  /** Parts per edge estimate (how many times this toolpath can repeat) */
  parts_per_edge: number;
  /** Segment with highest wear rate (hotspot) */
  hotspot_segment: string;
  /** Warning if wear exceeds VB_max during toolpath */
  exceeds_vb_max: boolean;
  source: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

/** VB_max flank wear limit [µm] — ISO 3685:1993 */
const VB_MAX_UM = 300; // 0.3 mm = 300 µm

/** Shock loading multiplier for interrupted cuts */
const INTERRUPTED_SHOCK_BASE = 1.5;

/** Engagement effect on wear distribution (ap/nose_radius ratio) */
const ENGAGEMENT_EXPONENT = 0.15; // mild effect

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class TurningToolpathWearEngine {
  /**
   * Compute variable wear accumulation along a turning toolpath.
   * Integrates wear rate segment-by-segment, accounting for:
   * - CSS velocity variation across diameters
   * - Interrupted cut shock loading
   * - Engagement geometry effects
   *
   * @param input - Toolpath segments with cutting parameters
   * @returns Per-segment and total wear accumulation
   *
   * Ref: Usui wear model, ISO 3685:1993
   */
  accumulateWear(input: ToolpathWearInput): ToolpathWearResult {
    const taylor = CANONICAL_TAYLOR[input.iso_group] ?? CANONICAL_TAYLOR.P;
    const results: SegmentWearResult[] = [];
    let cumulativeWear = 0;
    let totalTime = 0;
    let totalLifeFraction = 0;
    let maxWearRate = 0;
    let hotspotId = "";

    for (const seg of input.segments) {
      const segResult = this.computeSegmentWear(input, seg, taylor);

      cumulativeWear += segResult.wear_um;
      totalTime += segResult.cutting_time_min;
      totalLifeFraction += segResult.life_fraction;

      if (segResult.wear_rate_um_min > maxWearRate) {
        maxWearRate = segResult.wear_rate_um_min;
        hotspotId = seg.id;
      }

      results.push({
        ...segResult,
        cumulative_wear_um: round2(cumulativeWear),
      });
    }

    // Parts per edge: how many times we can run this toolpath before VB_max
    const partsPerEdge = totalLifeFraction > 0
      ? Math.floor(1.0 / totalLifeFraction)
      : 999;

    // Remaining life: (1 - total_fraction) × predicted_life
    const predictedTotalLife = this.getBaseLife(input, taylor);
    const remainingLife = Math.max(0, (1 - totalLifeFraction) * predictedTotalLife);

    return {
      segments: results,
      total_wear_um: round2(cumulativeWear),
      total_cutting_time_min: round2(totalTime),
      total_life_fraction: round3(totalLifeFraction),
      remaining_life_min: round2(remainingLife),
      parts_per_edge: partsPerEdge,
      hotspot_segment: hotspotId || (input.segments[0]?.id ?? "unknown"),
      exceeds_vb_max: cumulativeWear > VB_MAX_UM,
      source: "TurningToolpathWearEngine.accumulateWear (variable Vc wear integration)",
    };
  }

  /** Compute wear for a single toolpath segment */
  private computeSegmentWear(
    input: ToolpathWearInput,
    seg: ToolpathSegment,
    taylor: { C: number; n: number },
  ): SegmentWearResult {
    // ── Average diameter and Vc ──
    const avgD = (seg.d_start_mm + seg.d_end_mm) / 2;
    let avgVc = input.Vc_m_min;

    if (input.css_mode && avgD > 0) {
      const maxRPM = input.max_rpm ?? 4000;
      const rpmNeeded = (input.Vc_m_min * 1000) / (Math.PI * avgD);
      const actualRPM = Math.min(rpmNeeded, maxRPM);
      avgVc = (Math.PI * avgD * actualRPM) / 1000;
    }

    // ── Cutting time ──
    // time = cut_length × passes / (f × RPM) or equivalently from feed rate
    const rpm = avgD > 0 ? (avgVc * 1000) / (Math.PI * avgD) : 1000;
    const feedRate = seg.f_mm_rev * rpm; // mm/min
    const totalCutLength = seg.cut_length_mm * seg.passes;
    const cuttingTime = feedRate > 0 ? totalCutLength / feedRate : 0;

    // ── Base life at this Vc ──
    const segLife = turningInsertLifeEngine.predictLife({
      iso_group: input.iso_group,
      Vc_m_min: avgVc,
      f_mm_rev: seg.f_mm_rev,
      ap_mm: seg.ap_mm,
      coating: input.coating,
      nose_radius_mm: input.nose_radius_mm,
      is_interrupted: seg.interrupted,
    });
    const lifeMin = segLife.tool_life_min;

    // ── Engagement factor ──
    // Higher ap/nose_radius concentrates wear on smaller insert arc
    const engagementRatio = seg.ap_mm / input.nose_radius_mm;
    const engagementFactor = Math.pow(Math.max(1, engagementRatio), ENGAGEMENT_EXPONENT);

    // ── Interrupted cut shock factor ──
    let shockFactor = 1.0;
    if (seg.interrupted && seg.interruptions_per_rev) {
      // More interruptions per rev = more shock loading
      shockFactor = 1 + (INTERRUPTED_SHOCK_BASE - 1) * Math.min(seg.interruptions_per_rev / 4, 1);
    }

    // ── Wear for this segment ──
    const effectiveLife = lifeMin / (engagementFactor * shockFactor);
    const lifeFraction = effectiveLife > 0 ? cuttingTime / effectiveLife : 1;

    // VB wear: linear model VB = VB_max × life_fraction
    const wearUm = VB_MAX_UM * lifeFraction;
    const wearRate = cuttingTime > 0 ? wearUm / cuttingTime : 0;

    return {
      segment_id: seg.id,
      wear_um: round2(wearUm),
      cumulative_wear_um: 0, // filled by caller
      avg_vc_m_min: round2(avgVc),
      cutting_time_min: round3(cuttingTime),
      wear_rate_um_min: round2(wearRate),
      life_fraction: round3(lifeFraction),
    };
  }

  /** Get base predicted life for these conditions */
  private getBaseLife(input: ToolpathWearInput, taylor: { C: number; n: number }): number {
    const avgSeg = input.segments[0];
    if (!avgSeg) return 60;
    return turningInsertLifeEngine.predictLife({
      iso_group: input.iso_group,
      Vc_m_min: input.Vc_m_min,
      f_mm_rev: avgSeg.f_mm_rev,
      ap_mm: avgSeg.ap_mm,
      coating: input.coating,
    }).tool_life_min;
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export const turningToolpathWearEngine = new TurningToolpathWearEngine();
export { TurningToolpathWearEngine };
