/**
 * MillChipEvacuationPredictorEngine
 * ==================================
 *
 * Predicts chip-evacuation failure risk in milling operations. The mill
 * analog of LatheBirdNestPredictorEngine — but on a mill there's no
 * rotating workpiece for chips to wrap around. Instead the dominant
 * failure modes are:
 *
 *   1. Chip RE-CUTTING in pocket roughing — chips not flushed out
 *      get re-engaged by the cutter on the next pass, causing tool
 *      breakage, BUE, and rough surface finish
 *   2. Chip WELDING to flutes (BUE) — common in aluminum + light feeds
 *   3. Chip PACKING in deep cavities — climb mill in deep pocket
 *      traps chips faster than coolant can flush
 *   4. Chip recirculation in slot milling — slot depth > chip-flow
 *      clearance window
 *   5. Wet/dry mismatch — flood coolant wets aluminum chips into a
 *      mass; dry+air-blast is the canonical aluminum mill strategy
 *
 * Risk model (score 0..1, higher = worse):
 *   R = w1·pocketEvacFactor + w2·ductilityFactor + w3·toolFluteFactor
 *       + w4·strategyFactor + w5·coolantMismatchFactor − w6·hpcBonusFactor
 *
 * Where:
 *   - pocketEvacFactor = min(1, pocket_depth_mm / cutter_diameter_mm × strategy_severity)
 *   - ductilityFactor: same as lathe (ISO group → ductility ε_f)
 *   - toolFluteFactor: 2-flute=0.9, 3-flute=0.5, 4-flute=0.2 (more
 *     flutes = smaller chip-flow gullets → worse evac)
 *   - strategyFactor: full-slot=1.0, climb-pocket-rough=0.8,
 *     adaptive=0.4, climb-finish=0.2, conv-finish=0.3, peel=0.5
 *   - coolantMismatchFactor: aluminum + flood = 1.0 (worst), steel + dry = 0.7
 *   - hpcBonusFactor: through-spindle coolant 0.9, mist 0.2, air-blast 0.3
 *
 * Distinct from existing:
 *   - ChipFormationPredictionEngine    : chip morphology (Merchant)
 *   - LatheBirdNestPredictorEngine     : turning chip wrap (rotating)
 *   - This engine                      : milling chip re-cut / pocket evac
 *
 * References:
 *   - Astakhov V. "Metal Cutting Mechanics" (1998) §6.7 (chip evacuation)
 *   - Sandvik Coromant Milling Handbook §Chip Evacuation
 *   - Jawahir I.S. & van Luttervelt "Recent Developments in Chip Control"
 *     CIRP Annals 42(2) 1993
 *   - Machinery's Handbook 31st Ed. — Milling chapter, chip-flow section
 *
 * @module engines/MillChipEvacuationPredictorEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-CHIP-EVAC (iter73)
 */

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS — sourced + locked
// ═══════════════════════════════════════════════════════════════════════

/** Risk-level thresholds (must be sorted ascending). */
export const RISK_THRESHOLD_LOW = 0.25;
export const RISK_THRESHOLD_MODERATE = 0.5;
export const RISK_THRESHOLD_HIGH = 0.75;

/** Pocket-depth-to-diameter ratio above which evac becomes critical. */
export const POCKET_DEPTH_TO_DIA_CRITICAL = 3.0;

/** Weight set (sums to ≤ 1.0 — coolant subtracts from numerator). */
export const WEIGHTS = {
  pocket_evac: 0.30,
  ductility: 0.20,
  flute_gullet: 0.20,
  strategy: 0.25,
  coolant_mismatch: 0.15,
  coolant_bonus: 0.20,
} as const;

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type Ductility = "low" | "medium" | "high" | "very_high";
export type CoolantDelivery = "dry" | "air_blast" | "mist" | "flood" | "hpc" | "tsc";
export type MillStrategy =
  | "full_slot"
  | "climb_pocket_rough"
  | "conventional_pocket_rough"
  | "adaptive_clearing"
  | "trochoidal"
  | "peel_milling"
  | "finish_climb"
  | "finish_conventional"
  | "drilling";

export interface MillChipEvacInput {
  /** ISO group P/M/K/N/S/H */
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Explicit override of ductility */
  ductility?: Ductility;
  /** Cutter diameter (mm) */
  cutter_diameter_mm: number;
  /** Pocket / cavity depth from open Z to floor (mm) */
  pocket_depth_mm: number;
  /** Cutting strategy in use */
  strategy: MillStrategy;
  /** Cutter flute count (2-8 typical) */
  flute_count: number;
  /** Cutting speed (m/min) */
  vc_m_min: number;
  /** Feed per tooth (mm/tooth) */
  fz_mm_tooth: number;
  /** Coolant delivery method */
  coolant: CoolantDelivery;
  /** Is the operation a closed pocket (4 walls) vs open contour? */
  is_closed_pocket?: boolean;
  /** Is climb milling in use? (default: depends on strategy) */
  is_climb_milling?: boolean;
}

export type RiskLevel = "low" | "moderate" | "high" | "severe";

export interface MillChipEvacMitigation {
  action: string;
  expected_risk_reduction: number;
  priority: "low" | "medium" | "high";
}

export interface MillChipEvacResult {
  risk_score: number;
  risk_level: RiskLevel;
  factors: {
    pocket_evac_factor: number;
    ductility_factor: number;
    flute_gullet_factor: number;
    strategy_factor: number;
    coolant_mismatch_factor: number;
    coolant_bonus_factor: number;
  };
  reasoning: string[];
  mitigations: MillChipEvacMitigation[];
  safety_notes: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function ductilityFromIso(iso?: string, override?: Ductility): Ductility {
  if (override) return override;
  switch (iso) {
    case "P": return "medium";    // steel
    case "M": return "very_high"; // stainless — long chips even in mill
    case "K": return "low";       // cast iron — discontinuous (best for mill)
    case "N": return "high";      // aluminum — sticky, BUE prone
    case "S": return "high";      // superalloys
    case "H": return "low";       // hardened steel
    default:  return "medium";
  }
}

function ductilityScore(d: Ductility): number {
  switch (d) {
    case "low":       return 0.1;
    case "medium":    return 0.4;
    case "high":      return 0.7;
    case "very_high": return 1.0;
  }
}

function strategyScore(s: MillStrategy): number {
  switch (s) {
    case "full_slot":               return 1.0; // worst — both flutes engaged + closed
    case "climb_pocket_rough":      return 0.8;
    case "conventional_pocket_rough": return 0.6;
    case "drilling":                return 0.7; // chips ride up flutes
    case "peel_milling":            return 0.5;
    case "adaptive_clearing":       return 0.4; // small ae, low force, chip room
    case "finish_climb":            return 0.2;
    case "finish_conventional":     return 0.3;
    case "trochoidal":              return 0.2;
  }
}

function fluteGulletScore(fluteCount: number): number {
  // More flutes = smaller gullet = worse evac
  if (fluteCount <= 2) return 0.2;
  if (fluteCount === 3) return 0.4;
  if (fluteCount === 4) return 0.6;
  if (fluteCount === 5) return 0.75;
  return 0.9; // 6+ flutes
}

/**
 * Coolant ↔ material mismatch matrix.
 * Returns 0..1 where 1.0 = worst mismatch, 0 = good fit.
 *
 * Canonical pairs (Machinery's Handbook 31e mill chapter):
 *   - Aluminum (N) + flood: BAD (chips weld together into a mass)
 *   - Aluminum (N) + dry/air_blast: GOOD
 *   - Steel (P) + flood/hpc/tsc: GOOD
 *   - Steel (P) + dry: tolerable if light cuts, BAD for roughing
 *   - Stainless (M) + flood/hpc: GOOD; + dry: BAD (work-hardens)
 *   - Cast iron (K) + dry: GOOD (chips brittle, dust-like)
 *   - Cast iron (K) + flood: tolerable but not preferred
 *   - Superalloy (S) + hpc/tsc: REQUIRED (heat removal)
 */
function coolantMismatchScore(iso: string | undefined, coolant: CoolantDelivery): number {
  const c = coolant;
  switch (iso) {
    case "N": // aluminum
      if (c === "flood") return 1.0;
      if (c === "mist") return 0.5;
      if (c === "hpc" || c === "tsc") return 0.3;
      if (c === "dry" || c === "air_blast") return 0.1;
      return 0.5;
    case "P": // steel
      if (c === "dry") return 0.7;
      if (c === "air_blast" || c === "mist") return 0.4;
      return 0.1;
    case "M": // stainless
      if (c === "dry" || c === "air_blast") return 1.0;
      if (c === "mist") return 0.6;
      return 0.1;
    case "K": // cast iron
      if (c === "flood") return 0.5;
      return 0.1;
    case "S": // superalloy
      if (c === "dry" || c === "air_blast" || c === "mist") return 1.0;
      if (c === "flood") return 0.4;
      return 0.1;
    case "H": // hardened steel
      if (c === "dry") return 0.3;
      return 0.1;
    default: return 0.4;
  }
}

function coolantBonusScore(c: CoolantDelivery): number {
  // Flushing capacity, regardless of mismatch
  switch (c) {
    case "tsc":       return 0.9;
    case "hpc":       return 0.8;
    case "flood":     return 0.5;
    case "mist":      return 0.2;
    case "air_blast": return 0.4;
    case "dry":       return 0.0;
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillChipEvacuationPredictorEngineImpl {
  predict(i: MillChipEvacInput): MillChipEvacResult {
    this.validate(i);
    const reasoning: string[] = [];
    const safety: string[] = [];

    const d = ductilityFromIso(i.material_iso_group, i.ductility);
    const ductFactor = ductilityScore(d);

    const strategy_factor = strategyScore(i.strategy);
    const flute_gullet_factor = fluteGulletScore(i.flute_count);

    // Pocket evac factor: depth/dia × strategy severity, clamped
    const depthDiaRatio = i.pocket_depth_mm / Math.max(0.1, i.cutter_diameter_mm);
    const closedBonus = i.is_closed_pocket ? 1.0 : 0.6; // open contour evacs much better
    const pocket_evac_factor = Math.min(
      1,
      (depthDiaRatio / POCKET_DEPTH_TO_DIA_CRITICAL) * strategy_factor * closedBonus,
    );

    const coolant_mismatch_factor = coolantMismatchScore(i.material_iso_group, i.coolant);
    const coolant_bonus_factor = coolantBonusScore(i.coolant);

    let risk =
      WEIGHTS.pocket_evac * pocket_evac_factor +
      WEIGHTS.ductility * ductFactor +
      WEIGHTS.flute_gullet * flute_gullet_factor +
      WEIGHTS.strategy * strategy_factor +
      WEIGHTS.coolant_mismatch * coolant_mismatch_factor -
      WEIGHTS.coolant_bonus * coolant_bonus_factor;

    risk = Math.max(0, Math.min(1, risk));

    let level: RiskLevel;
    if (risk < RISK_THRESHOLD_LOW) level = "low";
    else if (risk < RISK_THRESHOLD_MODERATE) level = "moderate";
    else if (risk < RISK_THRESHOLD_HIGH) level = "high";
    else level = "severe";

    // ── Narrative reasoning ───────────────────────────────────────────
    if (d === "very_high") reasoning.push("Austenitic stainless — chips ribbon, prone to re-cut and weld");
    if (d === "high" && i.material_iso_group === "N") reasoning.push("Aluminum — BUE risk + sticky chip; needs dry/air-blast");
    if (depthDiaRatio >= POCKET_DEPTH_TO_DIA_CRITICAL) {
      reasoning.push(`Pocket depth/dia = ${round2(depthDiaRatio)} ≥ ${POCKET_DEPTH_TO_DIA_CRITICAL} — chip evac critical`);
    }
    if (i.is_closed_pocket) reasoning.push("Closed pocket — chips cannot escape laterally");
    if (flute_gullet_factor >= 0.6) {
      reasoning.push(`${i.flute_count}-flute cutter — smaller gullets restrict chip flow`);
    }
    if (coolant_mismatch_factor >= 0.7) {
      reasoning.push(`Coolant '${i.coolant}' mismatched to ${i.material_iso_group ?? "material"} — re-evaluate`);
    }
    if (strategy_factor >= 0.8) {
      reasoning.push(`Strategy '${i.strategy}' — high engagement / closed swept volume`);
    }

    // ── Mitigations ranked by expected risk reduction ─────────────────
    const mitigations: MillChipEvacMitigation[] = [];
    if (coolant_mismatch_factor >= 0.5) {
      const target = i.material_iso_group === "N"
        ? "dry or air-blast (no flood)"
        : i.material_iso_group === "M" || i.material_iso_group === "S"
          ? "HPC or TSC through-spindle 70+ bar"
          : "flood or HPC";
      mitigations.push({
        action: `Switch coolant to ${target}`,
        expected_risk_reduction: 0.25,
        priority: "high",
      });
    }
    if (i.flute_count >= 4 && d !== "low") {
      mitigations.push({
        action: "Reduce flute count to 2-3 for larger gullet + better evacuation",
        expected_risk_reduction: 0.20,
        priority: "high",
      });
    }
    if (strategy_factor >= 0.8 && i.strategy !== "adaptive_clearing") {
      mitigations.push({
        action: "Switch to adaptive clearing (constant engagement, low ae)",
        expected_risk_reduction: 0.25,
        priority: "high",
      });
    }
    if (depthDiaRatio >= POCKET_DEPTH_TO_DIA_CRITICAL && i.strategy !== "trochoidal") {
      mitigations.push({
        action: "Use trochoidal toolpath for deep pocket (chip room + low radial)",
        expected_risk_reduction: 0.20,
        priority: "high",
      });
    }
    if (coolant_bonus_factor < 0.5 && level !== "low") {
      mitigations.push({
        action: "Add through-spindle coolant or air-blast to flush evacuated chips",
        expected_risk_reduction: 0.15,
        priority: "medium",
      });
    }
    if (i.is_closed_pocket && depthDiaRatio >= 2) {
      mitigations.push({
        action: "Pre-drill chip-clearance hole or step-rough to staircase out deep pocket",
        expected_risk_reduction: 0.10,
        priority: "medium",
      });
    }
    if (level === "severe") {
      mitigations.push({
        action: "Add programmed peck / lift / retract every 3-5mm of Z plunge",
        expected_risk_reduction: 0.12,
        priority: "high",
      });
    }

    // ── Safety notes ───────────────────────────────────────────────────
    if (level === "severe") {
      safety.push("SEVERE: do not run unattended — tool breakage from chip re-cut probable");
      safety.push("Inspect chip pile each cycle for re-cut chips (small uniform pieces = bad)");
    }
    if (level === "high" || level === "severe") {
      safety.push("Monitor spindle load for re-cut spikes (sudden 20%+ jumps)");
      safety.push("Verify chip wash / coolant nozzle aim at cut zone before run");
    }

    return {
      risk_score: round2(risk),
      risk_level: level,
      factors: {
        pocket_evac_factor: round2(pocket_evac_factor),
        ductility_factor: round2(ductFactor),
        flute_gullet_factor: round2(flute_gullet_factor),
        strategy_factor: round2(strategy_factor),
        coolant_mismatch_factor: round2(coolant_mismatch_factor),
        coolant_bonus_factor: round2(coolant_bonus_factor),
      },
      reasoning,
      mitigations,
      safety_notes: safety,
    };
  }

  getStats(): { model: string; factors: string[]; risk_levels: RiskLevel[]; weights: typeof WEIGHTS } {
    return {
      model: "Weighted composite: pocket-evac × ductility × flute-gullet × strategy + coolant-mismatch − coolant-flushing",
      factors: [
        "pocket depth/diameter × strategy severity × closed/open",
        "material ductility (ISO group or explicit)",
        "flute count → gullet size (more flutes = worse evac)",
        "strategy (full_slot=worst, trochoidal=best)",
        "coolant material-pair mismatch (Al + flood = BAD)",
        "coolant flushing capacity (TSC > HPC > flood > air_blast > mist > dry)",
      ],
      risk_levels: ["low", "moderate", "high", "severe"],
      weights: { ...WEIGHTS },
    };
  }

  private validate(i: MillChipEvacInput): void {
    if (!i || typeof i !== "object") throw new TypeError("MillChipEvacuationPredictorEngine.predict: input required");
    if (!(i.cutter_diameter_mm > 0)) throw new TypeError("cutter_diameter_mm must be > 0");
    if (!(i.pocket_depth_mm >= 0)) throw new TypeError("pocket_depth_mm must be >= 0");
    if (!(i.flute_count >= 1)) throw new TypeError("flute_count must be >= 1");
    if (!(i.vc_m_min >= 0)) throw new TypeError("vc_m_min must be >= 0");
    if (!(i.fz_mm_tooth >= 0)) throw new TypeError("fz_mm_tooth must be >= 0");
  }
}

export const millChipEvacuationPredictorEngine = new MillChipEvacuationPredictorEngineImpl();
export type { MillChipEvacuationPredictorEngineImpl };
