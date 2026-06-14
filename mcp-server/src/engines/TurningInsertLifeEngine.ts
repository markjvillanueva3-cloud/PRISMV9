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
    const baseLife = taylorLife(taylor.C, taylor.n, input.Vc_m_min, input.coating);

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
    if (dStep <= 0) return taylorLife(taylor.C, taylor.n, input.Vc_m_min, input.coating);

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
      const lifeAtVc = taylorLife(taylor.C, taylor.n, actualVc, input.coating);
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
    const baseExtLife = taylorLife(taylor.C, taylor.n, input.Vc_m_min, input.coating);
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
