/**
 * TurningInsertLifeEngine — Material-specific insert life prediction for lathe operations.
 *
 * Provides:
 * - Extended Taylor model: T = C / (Vc^(1/n) × f^a × ap^b)
 * - Insert grade selection matrix: material + geometry + workpiece rigidity
 * - Chipbreaker operating window validation (per manufacturer catalog data)
 * - Parallel failure mode evaluation: min(T_flank, T_crater, T_notch, T_BUE)
 * - CSS-integrated wear: variable Vc wear accumulation across diameter profile
 * - Wiper insert productivity model: 4× feed at same Ra
 *
 * References:
 * - F.W. Taylor (1907), "On the Art of Cutting Metals"
 * - ISO 3685:1993 — Tool-life testing with single-point turning tools
 * - Kronenberg, "Machining Science and Application" (extended Taylor)
 * - Altintas, "Manufacturing Automation", §2.3 (Kienzle, tool life)
 * - Sandvik Coromant, "Metalcutting Technical Guide" (insert grades, chipbreakers)
 *
 * @module engines/TurningInsertLifeEngine
 * @milestone LATHE-PRO-MS1 U-LPR11
 */

import {
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  taylorLife,
  type ISOGroup,
} from "../physics/constants.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface InsertLifeInput {
  material_name?: string;
  iso_group: ISOGroup;
  hardness_HB?: number;
  Vc_m_min: number;
  f_mm_rev: number;
  ap_mm: number;
  nose_radius_mm?: number;
  coating?: string;
  insert_shape?: InsertShape;
  insert_grade?: string;
  is_interrupted?: boolean;
  is_wiper?: boolean;
  /** CSS mode: provide diameter range for variable-Vc wear integration */
  css_diameters_mm?: { d_start: number; d_end: number };
  workpiece_rigidity?: "rigid" | "normal" | "flexible";
}

export type InsertShape = "C" | "D" | "R" | "S" | "T" | "V" | "W" | "CNMG" | "DNMG" | "WNMG" | "VNMG" | "TNMG" | "SNMG";

/**
 * Single turning operation specification (cutting conditions + duration + label).
 * Consumed by stochastic / sensitivity / robust / envelope-distance engines that
 * sequence multiple ops and need a single canonical shape.
 */
export interface OpSpec {
  conditions: InsertLifeInput;
  duration_min: number;
  label?: string;
}

export interface ChipbreakerWindow {
  name: string;
  f_min_mm: number;
  f_max_mm: number;
  ap_min_mm: number;
  ap_max_mm: number;
}

export interface InsertLifeResult {
  /** Predicted tool life [minutes] from extended Taylor */
  tool_life_min: number;
  /** Parallel failure mode results */
  failure_modes: {
    flank_life_min: number;
    crater_life_min: number;
    notch_life_min: number;
    bue_life_min: number;
    limiting_mode: "flank" | "crater" | "notch" | "BUE";
  };
  /** Recommended insert grade */
  recommended_grade: InsertGradeRecommendation;
  /** Chipbreaker window check */
  chipbreaker: {
    in_window: boolean;
    recommended: string;
    window: ChipbreakerWindow;
  };
  /** Wiper insert analysis (if applicable) */
  wiper?: {
    feed_multiplier: number;
    max_feed_mm: number;
    ra_equivalent_um: number;
  };
  /** CSS-integrated life (if css_diameters provided) */
  css_adjusted_life_min?: number;
  /** Coating effect */
  coating_multiplier: number;
  /** Parts estimate at given cycle time */
  estimated_parts_per_edge?: number;
  /** Confidence 0-1 */
  confidence: number;
  source: string;
}

export interface InsertGradeRecommendation {
  grade_family: string;
  grade_code: string;
  substrate: "carbide" | "cermet" | "ceramic" | "CBN" | "PCD";
  coating: string;
  rationale: string;
}

export interface BatchLifePlanInput {
  /** Ordered ops making up ONE part (cutting conditions + per-op duration). */
  ops: OpSpec[];
  /** Number of parts in the batch (positive integer). */
  batch_size: number;
  /** Fraction of nominal edge life usable before a change (safety derate, 0..1; default 0.85). */
  reliability_threshold?: number;
  /** Optional insert cost per edge for a batch cost rollup. */
  insert_cost_usd_per_edge?: number;
}

export interface BatchInsertChangePoint {
  /** Part count produced when the edge is retired. */
  at_part: number;
  /** Cumulative wear fraction on the retired edge at the change (>= threshold). */
  cumulative_wear: number;
}

export interface BatchLifePlanResult {
  /** Total insert edges consumed across the batch. */
  inserts_used: number;
  /** Edge-change events (length === inserts_used - 1). */
  change_points: BatchInsertChangePoint[];
  /** Wear fraction remaining on the final edge after the last part. */
  final_wear_fraction: number;
  /** Batch insert cost (inserts_used * insert_cost_usd_per_edge), when cost supplied. */
  cost_usd?: number;
  /** Number of ops per part. */
  ops_per_part: number;
  /** Fractional edge life consumed per part (linear cumulative-damage sum over ops). */
  wear_per_part: number;
  source: string;
}

export interface InsertChangeScheduleInput {
  /** Ordered ops making up ONE part (cutting conditions + per-op duration). */
  ops: OpSpec[];
  /** Number of parts in the batch (positive integer). */
  batch_size: number;
  /** Fraction of nominal edge life usable before a change (safety derate, 0..1; default 0.85). */
  reliability_threshold?: number;
}

export interface InsertEdgeAssignment {
  /** Zero-based edge index. */
  edge_index: number;
  /** Parts produced on this edge. */
  parts_on_edge: number;
  /** First part index (0-based) on this edge. */
  starts_at_part: number;
  /** Last part index (0-based) on this edge. */
  ends_at_part: number;
  /** Wear fraction consumed on this edge (<= reliability_threshold). */
  final_wear: number;
}

export interface InsertChangeScheduleResult {
  /** Whole parts one edge can produce within the reliability-derated life. */
  parts_per_edge: number;
  /** Insert edges needed to finish the batch (= ceil(batch_size / parts_per_edge)). */
  edges_needed: number;
  /** Per-edge part assignment (length === edges_needed). */
  schedule: InsertEdgeAssignment[];
  /** Edge utilization (parts_per_edge * wear_per_part / threshold) as a percent in (0, 100]. */
  utilization_pct: number;
  /** Fractional edge life consumed per part. */
  wear_per_part: number;
  source: string;
}

export interface WearTrajectoryPoint {
  /** Zero-based op index. */
  op_index: number;
  /** Op label, if provided. */
  label?: string;
  /** Wear fraction added by this op. */
  wear_added: number;
  /** Cumulative wear fraction after this op. */
  cumulative_wear: number;
}

export interface WearAccumulationInput {
  /** Ordered ops processed in one pass (one part). */
  ops: OpSpec[];
  /** Starting wear fraction (0 = fresh edge; 0..1; default 0). */
  current_wear_fraction?: number;
  /** Wear fraction at which the edge is considered failed (default 1.0). */
  failure_wear_fraction?: number;
}

export interface WearAccumulationResult {
  /** Starting wear fraction. */
  start_wear: number;
  /** Wear fraction after processing all ops (current + sum of t_i / T_i). */
  final_wear: number;
  /** Per-op cumulative wear trajectory (length === ops.length). */
  trajectory: WearTrajectoryPoint[];
  /** True if final_wear reaches/exceeds failure_wear_fraction. */
  will_exceed: boolean;
  /** Index of the op at which wear first crosses failure (null if never). */
  first_failure_op_index: number | null;
  /** Cutting minutes until wear reaches failure (null if never). */
  time_until_failure_min: number | null;
  source: string;
}

// ── Extended Taylor Constants (feed/depth exponents) ────────────────────────
// Source: Kronenberg "Machining Science", Sandvik "Metalcutting Technical Guide"
// T = C / (Vc^(1/n) × f^a × ap^b)

const EXTENDED_TAYLOR: Record<ISOGroup, { a: number; b: number }> = {
  P: { a: 0.77, b: 0.37 }, // Steel: feed dominates over depth
  M: { a: 0.82, b: 0.35 }, // Stainless: high feed sensitivity (work hardening)
  K: { a: 0.70, b: 0.40 }, // Cast iron: depth matters more (abrasive)
  N: { a: 0.60, b: 0.30 }, // Aluminum: low sensitivity overall
  S: { a: 0.85, b: 0.42 }, // Superalloys: very feed-sensitive
  H: { a: 0.80, b: 0.38 }, // Hardened: high sensitivity to both
};

// ── Insert Grade Selection Matrix ──────────────────────────────────────────
// Source: Sandvik Coromant, ISO 513 classification

const INSERT_GRADE_MATRIX: Record<ISOGroup, InsertGradeRecommendation> = {
  P: {
    grade_family: "GC4325",
    grade_code: "P25",
    substrate: "carbide",
    coating: "CVD_TiCN_Al2O3",
    rationale: "CVD-coated carbide for general steel turning. Broad application range P15-P35.",
  },
  M: {
    grade_family: "GC2220",
    grade_code: "M20",
    substrate: "carbide",
    coating: "TiAlN",
    rationale: "PVD TiAlN for stainless. Resists BUE and work hardening.",
  },
  K: {
    grade_family: "GC3210",
    grade_code: "K15",
    substrate: "carbide",
    coating: "CVD_Al2O3",
    rationale: "Al₂O₃-coated for cast iron. Abrasion resistance from ceramic layer.",
  },
  N: {
    grade_family: "H10",
    grade_code: "N10",
    substrate: "PCD",
    coating: "uncoated",
    rationale: "Uncoated PCD or polished carbide for aluminum. No BUE, mirror finish.",
  },
  S: {
    grade_family: "GC1105",
    grade_code: "S15",
    substrate: "carbide",
    coating: "TiAlN",
    rationale: "Sharp PVD-coated carbide for superalloys. Positive rake, low forces.",
  },
  H: {
    grade_family: "CB7025",
    grade_code: "H10",
    substrate: "CBN",
    coating: "TiN",
    rationale: "CBN for hardened steel >55 HRC. Replaces grinding in many applications.",
  },
};

// ── Chipbreaker Operating Windows ──────────────────────────────────────────
// Source: Sandvik Coromant catalog — simplified universal chipbreakers

const CHIPBREAKER_CATALOG: Record<string, ChipbreakerWindow> = {
  // Light finishing
  PF: { name: "PF (Precision Finishing)", f_min_mm: 0.05, f_max_mm: 0.25, ap_min_mm: 0.25, ap_max_mm: 2.0 },
  // Medium machining
  PM: { name: "PM (Medium Machining)", f_min_mm: 0.15, f_max_mm: 0.50, ap_min_mm: 0.50, ap_max_mm: 5.0 },
  // Roughing
  PR: { name: "PR (Roughing)", f_min_mm: 0.30, f_max_mm: 0.80, ap_min_mm: 2.0, ap_max_mm: 10.0 },
  // Light finishing stainless
  MF: { name: "MF (Stainless Finishing)", f_min_mm: 0.05, f_max_mm: 0.20, ap_min_mm: 0.25, ap_max_mm: 2.0 },
  // Medium stainless
  MM: { name: "MM (Stainless Medium)", f_min_mm: 0.12, f_max_mm: 0.45, ap_min_mm: 0.50, ap_max_mm: 4.0 },
};

// ── Failure Mode Constants ─────────────────────────────────────────────────
// Parallel failure modes — real tool life = min(all modes)
// Source: Altintas §4.5, Sandvik wear mechanism guide

/** Crater wear exponent ratios relative to flank wear (per ISO group) */
const CRATER_RATIO: Record<ISOGroup, number> = {
  P: 0.85, // Steel: crater is close to flank (diffusion at high Vc)
  M: 0.90, // Stainless: crater slightly better (lower Vc typical)
  K: 1.50, // Cast iron: crater rare (discontinuous chips, no diffusion)
  N: 2.00, // Aluminum: crater almost never limiting
  S: 0.70, // Superalloys: crater can be limiting (high θ)
  H: 1.20, // Hardened: crater moderate
};

/** Notch wear tendency (lower = more notch prone) */
const NOTCH_RATIO: Record<ISOGroup, number> = {
  P: 1.50, // Steel: notch rare
  M: 0.60, // Stainless: notch common (work-hardened layer at ap line)
  K: 1.30, // Cast iron: notch moderate
  N: 2.00, // Aluminum: notch very rare
  S: 0.50, // Superalloys: notch is THE failure mode
  H: 0.80, // Hardened: notch at DOC line
};

/** BUE tendency (lower = more BUE prone). BUE extends life slightly then causes breakage */
const BUE_RATIO: Record<ISOGroup, number> = {
  P: 1.20, // Steel: BUE at low Vc
  M: 0.80, // Stainless: BUE common
  K: 1.50, // Cast iron: BUE rare
  N: 0.70, // Aluminum: BUE very common at low Vc
  S: 1.00, // Superalloys: moderate
  H: 2.00, // Hardened: BUE impossible at high hardness
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class TurningInsertLifeEngine {
  /**
   * Predict insert life using extended Taylor model with parallel failure modes.
   *
   * Extended Taylor: T = (C × k_coat) / (Vc^(1/n) × f^a × ap^b)
   * Real life = min(T_flank, T_crater, T_notch, T_BUE)
   *
   * @param input - Insert life prediction input parameters
   * @returns Insert life prediction with failure modes and recommendations
   *
   * Ref: ISO 3685:1993, Kronenberg "Machining Science", Taylor (1907)
   */
  predictLife(input: InsertLifeInput): InsertLifeResult {
    const iso = input.iso_group;
    const taylor = CANONICAL_TAYLOR[iso] ?? CANONICAL_TAYLOR.P;
    const extended = EXTENDED_TAYLOR[iso] ?? EXTENDED_TAYLOR.P;

    // ── Base Taylor life (speed only) ──
    const baseLife = taylorLife(taylor.C, taylor.n, input.Vc_m_min);

    // ── Coating multiplier ──
    const COATING_MULT: Record<string, number> = {
      uncoated: 1.0, TiN: 1.3, TiCN: 1.4, TiAlN: 1.5, AlTiN: 1.6,
      AlCrN: 1.5, nACo: 1.7, CVD_Al2O3: 1.8, CVD_TiCN_Al2O3: 1.9,
      Tiger_tec_Gold: 2.0, PVD_multilayer: 1.4, DLC: 1.3, diamond: 3.0,
    };
    const coatingMult = COATING_MULT[input.coating ?? "uncoated"] ?? 1.0;

    // ── Extended Taylor: apply feed and depth exponents ──
    // T_extended = T_base / (f^a × ap^b)
    // Normalized to f_ref=0.3 mm/rev and ap_ref=2.0 mm
    const f_ref = 0.30;
    const ap_ref = 2.0;
    const feedFactor = Math.pow(input.f_mm_rev / f_ref, extended.a);
    const depthFactor = Math.pow(input.ap_mm / ap_ref, extended.b);
    const extendedLife = baseLife / (feedFactor * depthFactor);

    // ── Interrupted cut penalty ──
    const interruptFactor = input.is_interrupted ? 0.60 : 1.0;

    // ── Rigidity factor ──
    const rigidityFactor = input.workpiece_rigidity === "flexible" ? 0.75
      : input.workpiece_rigidity === "rigid" ? 1.10 : 1.0;

    // ── Flank wear life (primary mode) ──
    const flankLife = extendedLife * interruptFactor * rigidityFactor;

    // ── Parallel failure modes ──
    const craterLife = flankLife * (CRATER_RATIO[iso] ?? 1.0);
    const notchLife = flankLife * (NOTCH_RATIO[iso] ?? 1.0);

    // BUE life: inversely related to cutting speed (BUE forms at LOW Vc)
    const vc_base = CANONICAL_MATERIAL_DB[this.resolveMatKey(iso)]?.vc_base_roughing ?? 200;
    const vcRatio = input.Vc_m_min / vc_base;
    // Below 0.6× recommended Vc, BUE becomes dominant
    const bueFactor = vcRatio < 0.6 ? (BUE_RATIO[iso] ?? 1.0) * vcRatio / 0.6
      : (BUE_RATIO[iso] ?? 1.0) * 1.5; // Above threshold, BUE is not limiting
    const bueLife = flankLife * bueFactor;

    // Real life = min of all modes
    const modes = { flank: flankLife, crater: craterLife, notch: notchLife, BUE: bueLife };
    const limitingMode = (Object.entries(modes) as [keyof typeof modes, number][])
      .reduce((min, [k, v]) => v < min[1] ? [k, v] : min, ["flank" as keyof typeof modes, Infinity]);
    const realLife = limitingMode[1];

    // ── Insert grade recommendation ──
    const grade = this.selectGrade(input);

    // ── Chipbreaker validation ──
    const chipbreaker = this.validateChipbreaker(input);

    // ── Wiper insert analysis ──
    let wiper: InsertLifeResult["wiper"];
    if (input.is_wiper) {
      // Wiper inserts: can run 2-4× feed at same Ra
      // Ra = f²/(32×r_e) → for same Ra at 2× feed, need 4× radius (wiper geometry provides this)
      // Ref: Sandvik "Wiper insert technology" application guide
      const feedMult = 2.0; // Conservative 2× (catalog claims up to 4×)
      const noseR = input.nose_radius_mm ?? 0.8;
      const maxFeed = Math.min(input.f_mm_rev * feedMult, noseR * 0.8); // Never exceed 80% of nose radius
      const raEquiv = (input.f_mm_rev * input.f_mm_rev) / (32 * noseR * 2) * 1000; // Wiper effective radius ≈ 2× nose
      wiper = { feed_multiplier: feedMult, max_feed_mm: round3(maxFeed), ra_equivalent_um: round3(raEquiv) };
    }

    // ── CSS-integrated wear ──
    let cssLife: number | undefined;
    if (input.css_diameters_mm) {
      cssLife = this.integrateCSSWear(input, taylor, extended, coatingMult);
    }

    // ── Confidence ──
    let confidence = 0.70; // Base confidence for Taylor model
    if (input.material_name && Object.keys(CANONICAL_MATERIAL_DB).some(k =>
      CANONICAL_MATERIAL_DB[k].name.toLowerCase().includes((input.material_name ?? "").toLowerCase())
    )) confidence += 0.10; // Known material
    if (input.coating) confidence += 0.05;
    if (input.hardness_HB) confidence += 0.05;
    confidence = Math.min(confidence, 0.95);

    return {
      tool_life_min: round2(realLife),
      failure_modes: {
        flank_life_min: round2(flankLife),
        crater_life_min: round2(craterLife),
        notch_life_min: round2(notchLife),
        bue_life_min: round2(bueLife),
        limiting_mode: limitingMode[0] as "flank" | "crater" | "notch" | "BUE",
      },
      recommended_grade: grade,
      chipbreaker,
      wiper,
      css_adjusted_life_min: cssLife != null ? round2(cssLife) : undefined,
      coating_multiplier: coatingMult,
      confidence,
      source: "TurningInsertLifeEngine.predictLife (Extended Taylor + parallel failure modes)",
    };
  }

  /** Per-part fractional edge-life consumption: linear cumulative-damage sum over ops. */
  private wearPerPart(ops: OpSpec[]): number {
    let w = 0;
    for (const op of ops) {
      const life = this.predictLife(op.conditions).tool_life_min;
      if (life > 0 && Number.isFinite(life)) {
        w += Math.max(op.duration_min, 0) / life;
      }
    }
    return w;
  }

  /**
   * Batch insert-life plan: simulate cumulative edge wear across a part batch and
   * report how many insert edges the batch consumes plus where each change falls.
   *
   * Per-part wear is the linear cumulative-damage sum over ops (Palmgren-Miner
   * analog): wear_per_part = sum_i ( op_i.duration_min /
   * predictLife(op_i.conditions).tool_life_min ). An edge is retired once its
   * cumulative wear reaches reliability_threshold.
   *
   * Ref: linear cumulative-damage rule (Palmgren-Miner analog); ISO 3685:1993; Taylor (1907).
   */
  batchLifePlan(input: BatchLifePlanInput): BatchLifePlanResult {
    if (!input.ops || input.ops.length === 0) {
      throw new Error("batchLifePlan: ops required (at least one operation)");
    }
    if (!Number.isInteger(input.batch_size) || input.batch_size <= 0) {
      throw new Error("batchLifePlan: batch_size must be a positive integer");
    }
    const threshold = input.reliability_threshold ?? 0.85;
    if (!(threshold > 0 && threshold <= 1)) {
      throw new Error("batchLifePlan: reliability_threshold must be in (0, 1]");
    }
    const wearPerPart = this.wearPerPart(input.ops);
    let cumulative = 0;
    let insertsUsed = 1;
    const changePoints: BatchInsertChangePoint[] = [];
    for (let part = 0; part < input.batch_size; part++) {
      cumulative += wearPerPart;
      // Retire the edge once it reaches the derated life -- but never after the last part.
      if (cumulative >= threshold && part < input.batch_size - 1) {
        changePoints.push({ at_part: part + 1, cumulative_wear: round3(cumulative) });
        insertsUsed++;
        cumulative = 0;
      }
    }
    return {
      inserts_used: insertsUsed,
      change_points: changePoints,
      final_wear_fraction: round3(cumulative),
      cost_usd:
        input.insert_cost_usd_per_edge != null
          ? round2(insertsUsed * input.insert_cost_usd_per_edge)
          : undefined,
      ops_per_part: input.ops.length,
      wear_per_part: round3(wearPerPart),
      source: "TurningInsertLifeEngine.batchLifePlan (linear cumulative-damage + extended Taylor)",
    };
  }

  /**
   * Insert-change schedule: pack parts onto edges so no edge exceeds the
   * reliability-derated life, and report the per-edge part assignment.
   *
   * parts_per_edge = floor(reliability_threshold / wear_per_part); throws when a
   * single part already exceeds the threshold (an infeasible setup -- not silenced).
   *
   * Ref: linear cumulative-damage rule (Palmgren-Miner analog); ISO 3685:1993.
   */
  insertChangeSchedule(input: InsertChangeScheduleInput): InsertChangeScheduleResult {
    if (!input.ops || input.ops.length === 0) {
      throw new Error("insertChangeSchedule: ops required (at least one operation)");
    }
    if (!Number.isInteger(input.batch_size) || input.batch_size <= 0) {
      throw new Error("insertChangeSchedule: batch_size must be a positive integer");
    }
    const threshold = input.reliability_threshold ?? 0.85;
    if (!(threshold > 0 && threshold <= 1)) {
      throw new Error("insertChangeSchedule: reliability_threshold must be in (0, 1]");
    }
    const wearPerPart = this.wearPerPart(input.ops);
    if (wearPerPart > threshold) {
      throw new Error(
        `insertChangeSchedule: a single part consumes ${round3(wearPerPart)} of edge life and ` +
          `cannot fit on a single edge (exceeds threshold ${threshold})`,
      );
    }
    const partsPerEdge = Math.max(Math.floor(threshold / wearPerPart), 1);
    const edgesNeeded = Math.ceil(input.batch_size / partsPerEdge);
    const schedule: InsertEdgeAssignment[] = [];
    let start = 0;
    for (let e = 0; e < edgesNeeded; e++) {
      const partsOnEdge = Math.min(partsPerEdge, input.batch_size - start);
      schedule.push({
        edge_index: e,
        parts_on_edge: partsOnEdge,
        starts_at_part: start,
        ends_at_part: start + partsOnEdge - 1,
        final_wear: round3(partsOnEdge * wearPerPart),
      });
      start += partsOnEdge;
    }
    return {
      parts_per_edge: partsPerEdge,
      edges_needed: edgesNeeded,
      schedule,
      utilization_pct: round2(((partsPerEdge * wearPerPart) / threshold) * 100),
      wear_per_part: round3(wearPerPart),
      source: "TurningInsertLifeEngine.insertChangeSchedule (linear cumulative-damage + extended Taylor)",
    };
  }

  /**
   * Linear wear accumulation across one pass through a multi-op part, with the
   * per-op cumulative trajectory and a first-failure projection.
   *
   *   wear_added_i = op_i.duration_min / predictLife(op_i.conditions).tool_life_min
   *   final_wear   = current_wear_fraction + sum_i wear_added_i
   *
   * Ref: linear cumulative-damage rule (Palmgren-Miner analog); ISO 3685:1993.
   */
  wearAccumulation(input: WearAccumulationInput): WearAccumulationResult {
    if (!input.ops || input.ops.length === 0) {
      throw new Error("wearAccumulation: ops required (at least one operation)");
    }
    const start = input.current_wear_fraction ?? 0;
    if (!(start >= 0 && start <= 1)) {
      throw new Error("wearAccumulation: current_wear_fraction must be in [0, 1]");
    }
    const failure = input.failure_wear_fraction ?? 1.0;
    let cumulative = start;
    let elapsed = 0;
    let willExceed = false;
    let firstFailureOpIndex: number | null = null;
    let timeUntilFailureMin: number | null = null;
    const trajectory: WearTrajectoryPoint[] = [];
    for (let i = 0; i < input.ops.length; i++) {
      const op = input.ops[i];
      if (!(op.duration_min > 0)) {
        throw new Error("wearAccumulation: duration_min must be > 0 for every op");
      }
      const life = this.predictLife(op.conditions).tool_life_min;
      const wear = life > 0 && Number.isFinite(life) ? op.duration_min / life : 0;
      const before = cumulative;
      cumulative += wear;
      trajectory.push({
        op_index: i,
        label: op.label,
        wear_added: round3(wear),
        cumulative_wear: round3(cumulative),
      });
      if (!willExceed && cumulative >= failure) {
        willExceed = true;
        firstFailureOpIndex = i;
        const wearRate = wear / op.duration_min; // fraction per minute
        const remaining = failure - before;
        const tInOp = wearRate > 0 ? Math.max(remaining, 0) / wearRate : 0;
        timeUntilFailureMin = round3(elapsed + Math.max(tInOp, 0));
      }
      elapsed += op.duration_min;
    }
    return {
      start_wear: round3(start),
      final_wear: round3(cumulative),
      trajectory,
      will_exceed: willExceed,
      first_failure_op_index: firstFailureOpIndex,
      time_until_failure_min: timeUntilFailureMin,
      source: "TurningInsertLifeEngine.wearAccumulation (linear cumulative-damage + extended Taylor)",
    };
  }

  /**
   * Select optimal insert grade for material + operation.
   *
   * Ref: ISO 513 insert classification, Sandvik Coromant "Turning Tools" catalog
   */
  selectGrade(input: InsertLifeInput): InsertGradeRecommendation {
    const base = INSERT_GRADE_MATRIX[input.iso_group] ?? INSERT_GRADE_MATRIX.P;

    // Override for hardened steel with hardness data
    if (input.iso_group === "H" || (input.hardness_HB && input.hardness_HB > 450)) {
      return {
        grade_family: "CB7025",
        grade_code: "H10",
        substrate: "CBN",
        coating: "TiN",
        rationale: `CBN required for hardness ${input.hardness_HB ?? ">450"} HB. Replaces grinding.`,
      };
    }

    // Override for aluminum with high Vc
    if (input.iso_group === "N" && input.Vc_m_min > 500) {
      return {
        grade_family: "CD10",
        grade_code: "N05",
        substrate: "PCD",
        coating: "uncoated",
        rationale: "PCD for high-speed aluminum. No BUE, excellent surface finish.",
      };
    }

    return base;
  }

  /**
   * Validate chipbreaker window for given feed/depth.
   * Returns best-fit chipbreaker and whether current parameters are in-window.
   *
   * Ref: Sandvik chipbreaker selection guide
   */
  validateChipbreaker(input: InsertLifeInput): InsertLifeResult["chipbreaker"] {
    const f = input.f_mm_rev;
    const ap = input.ap_mm;

    // Select prefix by ISO group
    const prefix = input.iso_group === "M" ? "M" : "P";

    // Try exact match first
    for (const [code, window] of Object.entries(CHIPBREAKER_CATALOG)) {
      if (!code.startsWith(prefix)) continue;
      if (f >= window.f_min_mm && f <= window.f_max_mm &&
          ap >= window.ap_min_mm && ap <= window.ap_max_mm) {
        return { in_window: true, recommended: code, window };
      }
    }

    // Find best fit (closest to center of window)
    let bestCode = prefix + "M";
    let bestDist = Infinity;
    for (const [code, window] of Object.entries(CHIPBREAKER_CATALOG)) {
      if (!code.startsWith(prefix)) continue;
      const fCenter = (window.f_min_mm + window.f_max_mm) / 2;
      const apCenter = (window.ap_min_mm + window.ap_max_mm) / 2;
      const dist = Math.sqrt(Math.pow((f - fCenter) / fCenter, 2) + Math.pow((ap - apCenter) / apCenter, 2));
      if (dist < bestDist) { bestDist = dist; bestCode = code; }
    }

    const best = CHIPBREAKER_CATALOG[bestCode] ?? CHIPBREAKER_CATALOG.PM!;
    return { in_window: false, recommended: bestCode, window: best };
  }

  /**
   * Integrate wear over CSS diameter range.
   * In CSS mode, Vc varies as Vc = π×D×N/1000. As D decreases, if RPM is clamped,
   * Vc drops → wear rate drops. If RPM increases (CSS), Vc stays constant but
   * RPM limit may cause Vc drop at small diameters.
   *
   * This integrates wear rate dW/dL over the cut length for variable diameters.
   *
   * Ref: Sandvik "CSS and tool life" application note
   */
  private integrateCSSWear(
    input: InsertLifeInput,
    taylor: { C: number; n: number },
    extended: { a: number; b: number },
    coatingMult: number,
  ): number {
    const { d_start, d_end } = input.css_diameters_mm!;
    const steps = 20;
    const dStep = (d_start - d_end) / steps;
    if (dStep <= 0) return taylorLife(taylor.C, taylor.n, input.Vc_m_min);

    // Assume constant CSS = input.Vc_m_min, with RPM clamp at max_rpm
    const maxRPM = 4000; // typical lathe max
    let totalWearFraction = 0;

    for (let i = 0; i < steps; i++) {
      const D = d_start - i * dStep;
      // Actual Vc at this diameter (may be less than CSS if RPM clamped)
      const rpmNeeded = (input.Vc_m_min * 1000) / (Math.PI * D);
      const actualRPM = Math.min(rpmNeeded, maxRPM);
      const actualVc = (Math.PI * D * actualRPM) / 1000;

      // Life at this Vc
      const lifeAtVc = taylorLife(taylor.C, taylor.n, actualVc);
      const f_ref = 0.30;
      const ap_ref = 2.0;
      const feedFactor = Math.pow(input.f_mm_rev / f_ref, extended.a);
      const depthFactor = Math.pow(input.ap_mm / ap_ref, extended.b);
      const segmentLife = lifeAtVc / (feedFactor * depthFactor);

      // Time spent at this diameter (assume equal time per segment)
      // Wear fraction = time_at_segment / life_at_segment
      const segmentTime = 1.0 / steps; // normalized
      totalWearFraction += segmentTime / (segmentLife > 0 ? segmentLife : 1);
    }

    // CSS-integrated life = 1 / totalWearFraction (normalized to base life units)
    const baseExtLife = taylorLife(taylor.C, taylor.n, input.Vc_m_min);
    const f_ref = 0.30;
    const ap_ref = 2.0;
    const baseFeedFactor = Math.pow(input.f_mm_rev / f_ref, extended.a);
    const baseDepthFactor = Math.pow(input.ap_mm / ap_ref, extended.b);
    const baseLife = baseExtLife / (baseFeedFactor * baseDepthFactor);

    return totalWearFraction > 0 ? baseLife / (totalWearFraction * steps) : baseLife;
  }

  /** Resolve ISO group to a canonical material key */
  private resolveMatKey(iso: ISOGroup): string {
    const map: Record<string, string> = {
      P: "steel", M: "stainless_304", K: "cast_iron",
      N: "aluminum_6061", S: "titanium_gr5", H: "tool_steel",
    };
    return map[iso] ?? "steel";
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export const turningInsertLifeEngine = new TurningInsertLifeEngine();
export { TurningInsertLifeEngine };
