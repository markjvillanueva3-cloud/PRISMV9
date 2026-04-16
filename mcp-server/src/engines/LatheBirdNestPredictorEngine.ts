/**
 * LatheBirdNestPredictorEngine
 * =============================
 *
 * Predicts "bird's-nest" chip-wrap risk on turning operations where
 * continuous chips tangle around the workpiece, tool, or chuck. This
 * is a lathe-specific failure mode that can cause tool breakage,
 * workholding damage, operator injury (chip whip), and machine
 * downtime for chip clearing.
 *
 * Complements existing ChipFormationPredictionEngine (which classifies
 * chip morphology via Merchant/Ernst-Merchant) by focusing on the
 * downstream *evacuation* risk — continuous chips are not always bad
 * but become dangerous when their length exceeds part clearance or
 * when the part geometry + rotation direction promotes wrapping.
 *
 * Risk model (score 0..1, higher = worse):
 *   R = w1 · chipLengthFactor + w2 · ductilityFactor + w3 · wrapGeom
 *       + w4 · noChipbreakerFactor − w5 · coolantFlushingFactor
 *
 * Where:
 *   - chipLengthFactor: unbroken chip length / part length clearance
 *   - ductilityFactor: ε_f (strain-to-failure) > 0.5 → higher risk
 *   - wrapGeom: L/D × sin(lead angle) — longer/slender parts wrap more
 *   - noChipbreakerFactor: 1 if flat insert, 0.3 for light CB, 0 for
 *     aggressive CB groove
 *   - coolantFlushingFactor: HPC through-tool → −0.2; flood → −0.1
 *
 * Mitigation output ranks by expected risk reduction.
 *
 * References:
 *   - Astakhov V. "Metal Cutting Mechanics" (1998) Ch.6
 *   - Jawahir I.S. & van Luttervelt "Recent Developments in Chip Control"
 *     CIRP Annals 42(2) 1993
 *   - Sandvik Coromant Turning Handbook §Chip Control
 *
 * @module engines/LatheBirdNestPredictorEngine
 * @milestone LATHE-PRO-MS7
 */

export type Ductility = "low" | "medium" | "high" | "very_high";
export type ChipbreakerClass = "flat" | "light" | "medium" | "aggressive";
export type CoolantDelivery = "dry" | "mist" | "flood" | "hpc" | "tsc";

export interface BirdNestInput {
  /** ISO group P/M/K/N/S/H OR ductility class directly */
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  ductility?: Ductility;
  /** Cutting speed (m/min) */
  vc_m_min: number;
  /** Feed (mm/rev) — higher feed shortens chips */
  feed_mm_rev: number;
  /** Depth of cut (mm) */
  doc_mm: number;
  /** Part length clearance between chuck face and tailstock (mm) */
  clearance_length_mm: number;
  /** Part L/D (slender = wraps more) */
  length_over_diameter: number;
  /** Insert lead angle (degrees; 0 = straight, 90 = right angle) */
  lead_angle_deg?: number;
  /** Chipbreaker geometry class on the insert */
  chipbreaker: ChipbreakerClass;
  /** Coolant delivery method */
  coolant: CoolantDelivery;
  /** True for rear-facing / upside-down mounted tool (chip falls by gravity) */
  inverted_mounting?: boolean;
}

export type RiskLevel = "low" | "moderate" | "high" | "severe";

export interface BirdNestMitigation {
  action: string;
  expected_risk_reduction: number;
  priority: "low" | "medium" | "high";
}

export interface BirdNestResult {
  risk_score: number;
  risk_level: RiskLevel;
  predicted_chip_length_mm: number;
  factors: {
    chip_length_factor: number;
    ductility_factor: number;
    wrap_geom_factor: number;
    no_chipbreaker_factor: number;
    coolant_flushing_factor: number;
  };
  reasoning: string[];
  mitigations: BirdNestMitigation[];
  safety_notes: string[];
}

function ductilityFromIso(iso?: string, override?: Ductility): Ductility {
  if (override) return override;
  switch (iso) {
    case "P":
      return "medium";    // steel
    case "M":
      return "very_high"; // stainless — most problematic
    case "K":
      return "low";       // cast iron — discontinuous chips
    case "N":
      return "high";      // aluminum — long stringy chips
    case "S":
      return "high";      // superalloys
    case "H":
      return "low";       // hardened steel
    default:
      return "medium";
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

function chipbreakerScore(cb: ChipbreakerClass): number {
  switch (cb) {
    case "flat":       return 1.0;
    case "light":      return 0.6;
    case "medium":     return 0.3;
    case "aggressive": return 0.1;
  }
}

function coolantScore(c: CoolantDelivery): number {
  switch (c) {
    case "tsc":   return 0.9;
    case "hpc":   return 0.8;
    case "flood": return 0.5;
    case "mist":  return 0.2;
    case "dry":   return 0.0;
  }
}

class LatheBirdNestPredictorEngineImpl {
  predict(i: BirdNestInput): BirdNestResult {
    const reasoning: string[] = [];
    const safety: string[] = [];

    const d = ductilityFromIso(i.material_iso_group, i.ductility);
    const ductFactor = ductilityScore(d);

    // Predicted chip length — rough empirical:
    // higher ductility × lower feed × lower chipbreaker score → longer chip
    const cbScore = chipbreakerScore(i.chipbreaker);
    const feedTerm = Math.max(0.05, i.feed_mm_rev);
    const predChipLenMm = Math.min(
      5000,
      (80 * ductFactor) / feedTerm * (0.5 + cbScore) * (i.vc_m_min / 150)
    );

    const clearance = Math.max(10, i.clearance_length_mm);
    const chipLengthFactor = Math.min(1, predChipLenMm / clearance);

    const lead = i.lead_angle_deg ?? 0;
    const wrapGeomFactor = Math.min(
      1,
      (i.length_over_diameter / 10) * (0.5 + 0.5 * Math.abs(Math.sin((lead * Math.PI) / 180)))
    );

    const noCbFactor = cbScore;
    const coolantFlush = coolantScore(i.coolant);

    // Weights
    const w = { chip: 0.35, duct: 0.20, wrap: 0.15, cb: 0.30 };
    let risk =
      w.chip * chipLengthFactor +
      w.duct * ductFactor +
      w.wrap * wrapGeomFactor +
      w.cb * noCbFactor -
      0.20 * coolantFlush;

    if (i.inverted_mounting) {
      risk -= 0.08;
      reasoning.push("Inverted/rear mount lets chips fall by gravity");
    }

    risk = Math.max(0, Math.min(1, risk));

    let level: RiskLevel;
    if (risk < 0.25) level = "low";
    else if (risk < 0.5) level = "moderate";
    else if (risk < 0.75) level = "high";
    else level = "severe";

    if (d === "very_high") reasoning.push("Austenitic stainless — highly ductile, long continuous chips");
    if (d === "high") reasoning.push(`${d} ductility material — long chip tendency`);
    if (chipLengthFactor >= 0.9) reasoning.push("Chip length exceeds part clearance — wrap certain");
    if (wrapGeomFactor >= 0.7) reasoning.push(`Slender part (L/D=${i.length_over_diameter}) acts as wrap core`);
    if (cbScore >= 0.6) reasoning.push("Flat / light chipbreaker — no mechanical chip curl");

    // Mitigations ranked
    const mitigations: BirdNestMitigation[] = [];
    if (cbScore > 0.3) {
      mitigations.push({
        action: "Switch to aggressive chipbreaker geometry (e.g., MF/MM grade)",
        expected_risk_reduction: 0.35,
        priority: "high",
      });
    }
    if (i.coolant === "dry" || i.coolant === "mist" || i.coolant === "flood") {
      mitigations.push({
        action: "Upgrade to through-spindle (TSC) coolant at 70+ bar to flush chips",
        expected_risk_reduction: 0.25,
        priority: "high",
      });
    }
    if (i.feed_mm_rev < 0.15 && d !== "low") {
      mitigations.push({
        action: `Increase feed from ${i.feed_mm_rev} to ≥0.18 mm/rev to shorten chips`,
        expected_risk_reduction: 0.20,
        priority: "medium",
      });
    }
    if (!i.inverted_mounting && risk >= 0.5) {
      mitigations.push({
        action: "Consider rear-mounted / upside-down tool so chips fall by gravity",
        expected_risk_reduction: 0.10,
        priority: "low",
      });
    }
    if (i.length_over_diameter > 6) {
      mitigations.push({
        action: "Add steady rest to shorten effective L/D and reduce wrap core",
        expected_risk_reduction: 0.10,
        priority: "medium",
      });
    }
    if (risk >= 0.75 && d !== "low") {
      mitigations.push({
        action: "Program chip-break peck cycle (G73 or dwell every 3-5 mm feed)",
        expected_risk_reduction: 0.15,
        priority: "high",
      });
    }

    // Safety
    if (level === "severe") {
      safety.push("SEVERE: do not run unattended — chip whip injury risk");
      safety.push("Operator must wear face shield + long sleeves");
    }
    if (level === "high" || level === "severe") {
      safety.push("Install chip guard / Plexi window before bar feed run");
      safety.push("Monitor spindle load for wrap-induced spikes");
    }

    return {
      risk_score: round2(risk),
      risk_level: level,
      predicted_chip_length_mm: round1(predChipLenMm),
      factors: {
        chip_length_factor: round2(chipLengthFactor),
        ductility_factor: round2(ductFactor),
        wrap_geom_factor: round2(wrapGeomFactor),
        no_chipbreaker_factor: round2(noCbFactor),
        coolant_flushing_factor: round2(coolantFlush),
      },
      reasoning,
      mitigations,
      safety_notes: safety,
    };
  }

  getStats(): { model: string; factors: string[]; risk_levels: RiskLevel[] } {
    return {
      model: "Weighted composite: chip-length × ductility × wrap-geometry × chipbreaker − coolant-flushing",
      factors: [
        "predicted chip length / part clearance",
        "material ductility (ISO group or explicit)",
        "L/D + lead angle wrap geometry",
        "chipbreaker aggressiveness",
        "coolant delivery mode",
        "tool mounting orientation",
      ],
      risk_levels: ["low", "moderate", "high", "severe"],
    };
  }
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

export const latheBirdNestPredictorEngine = new LatheBirdNestPredictorEngineImpl();
export type { LatheBirdNestPredictorEngineImpl };
