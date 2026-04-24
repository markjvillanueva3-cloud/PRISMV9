/**
 * WEDMMaterialSparkDatabaseEngine — WEDM AGI Phase 1 / U-P1-10
 *
 * WEDM-specific spark-signature material database. Distinct from:
 *   - MaterialDatabaseEngine          (Kienzle/Taylor coefficients for milling)
 *   - EDMMaterialMachineWireEngine    (machinability class + wire/machine selection)
 *
 * The question answered here is:
 *     "What WEDM spark signature does each material produce at a
 *      reference discharge energy, and can we flag an unknown sample as
 *      out-of-distribution instead of silently mis-classifying?"
 *
 * Klocke Ra model (Klocke & König, Fertigungsverfahren 3):
 *     Ra = C · (ie · te)^k
 *   where ie = peak current [A], te = pulse-on-time [µs], and
 *   (C, k) are material-specific coefficients.
 *
 * Exit gate (P1-MS3): covers all JM Die materials (D2, A2, M2, S7, H13,
 * WC, graphite) — asserted in the test suite.
 *
 * @see WEDMMaterialCharacterizationEngine — inverse: signature → material (U-P1-09)
 * @see EDMMaterialMachineWireEngine       — machinability classification (distinct)
 */

// ────────────────────────── Types ──────────────────────────

export type WEDMMaterialKey =
  | "D2"
  | "A2"
  | "M2"
  | "S7"
  | "H13"
  | "WC"
  | "graphite"
  | "Cu_C110"
  | "Al_6061"
  | "Ti6Al4V"
  | "SS_304"
  | "Inconel_718";

export interface WEDMSparkSignature {
  /** Canonical key, e.g. "D2". */
  key: WEDMMaterialKey;
  /** Human-readable name, e.g. "D2 Cold-Work Tool Steel". */
  display_name: string;
  /** Common names / synonyms the characterizer should accept as input. */
  aliases: string[];
  /** Klocke Ra model: Ra = C · (ie · te)^k [µm]. */
  klocke_C: number;
  klocke_k: number;
  /**
   * Material-removal-rate factor at the reference discharge energy
   * (mm³/min relative to reference steel 1045 = 1.0).
   */
  mrr_factor: number;
  /** Wire consumption multiplier vs reference (dimensionless). */
  wire_wear_factor: number;
  /** Nominal gap voltage during stable cutting [V]. */
  gap_voltage_nominal_V: number;
  /** Nominal peak current during stable cutting [A]. */
  peak_current_nominal_A: number;
  /** Nominal pulse-on-time [µs]. */
  pulse_on_nominal_us: number;
  /** Qualitative debris/spark colour hint for operator cross-check. */
  debris_colour: string;
  /** Advisory notes (recast/crack/toxic fumes/etc.). */
  flags: string[];
}

export interface SparkSignatureObservation {
  peak_current_A: number;
  pulse_on_us: number;
  measured_Ra_um: number;
  gap_voltage_V?: number;
  mrr_relative?: number;
}

export interface OODResult {
  /** True if the observation is outside the envelope of every known material. */
  is_ood: boolean;
  /** Minimum normalized distance to any known material. */
  min_distance: number;
  /** Key of the closest material, even if OOD. */
  closest: WEDMMaterialKey;
}

// ────────────────────────── Canonical Data ──────────────────────────

/**
 * Reference discharge energy used for MRR factor and Klocke Ra calibration:
 *   ie = 8 A, te = 10 µs  ⇒  (ie·te) = 80
 * This matches the conventional WEDM finishing regime in Klocke's reference.
 */
export const REFERENCE_IE_A = 8;
export const REFERENCE_TE_US = 10;

/**
 * Klocke-C and Klocke-k values were interpolated from published WEDM roughness
 * curves (Klocke 2013; DiBitonto 1989). Uncertainty: ±15% on C, ±0.05 on k.
 * The values here are WEDM-specific: the same material cut with a sinker
 * electrode has a different surface-roughness exponent.
 */
const SIGNATURES: Record<WEDMMaterialKey, WEDMSparkSignature> = {
  D2: {
    key: "D2",
    display_name: "D2 Cold-Work Tool Steel (AISI D2)",
    aliases: ["d2", "d2_tool", "aisi_d2", "1.2379"],
    klocke_C: 0.28,
    klocke_k: 0.5,
    mrr_factor: 0.95,
    wire_wear_factor: 1.1,
    gap_voltage_nominal_V: 60,
    peak_current_nominal_A: 8,
    pulse_on_nominal_us: 10,
    debris_colour: "bluish-white",
    flags: ["HIGH_CRACK_RISK"],
  },
  A2: {
    key: "A2",
    display_name: "A2 Air-Hardening Tool Steel",
    aliases: ["a2", "a2_tool", "aisi_a2", "1.2363"],
    klocke_C: 0.24,
    klocke_k: 0.5,
    mrr_factor: 0.97,
    wire_wear_factor: 1.05,
    gap_voltage_nominal_V: 54,
    peak_current_nominal_A: 8,
    pulse_on_nominal_us: 10,
    debris_colour: "white-yellow",
    flags: [],
  },
  M2: {
    key: "M2",
    display_name: "M2 High-Speed Steel",
    aliases: ["m2", "m2_hss", "aisi_m2", "1.3343"],
    klocke_C: 0.32,
    klocke_k: 0.5,
    mrr_factor: 0.90,
    wire_wear_factor: 1.15,
    gap_voltage_nominal_V: 66,
    peak_current_nominal_A: 7,
    pulse_on_nominal_us: 10,
    debris_colour: "yellow-orange",
    flags: [],
  },
  S7: {
    key: "S7",
    display_name: "S7 Shock-Resisting Tool Steel",
    aliases: ["s7", "s7_tool", "aisi_s7"],
    klocke_C: 0.22,
    klocke_k: 0.5,
    mrr_factor: 1.0,
    wire_wear_factor: 1.0,
    gap_voltage_nominal_V: 52,
    peak_current_nominal_A: 9,
    pulse_on_nominal_us: 14,
    debris_colour: "white",
    flags: [],
  },
  H13: {
    key: "H13",
    display_name: "H13 Hot-Work Tool Steel",
    aliases: ["h13", "h13_tool", "aisi_h13", "1.2344"],
    klocke_C: 0.26,
    klocke_k: 0.5,
    mrr_factor: 0.95,
    wire_wear_factor: 1.05,
    gap_voltage_nominal_V: 60,
    peak_current_nominal_A: 8,
    pulse_on_nominal_us: 10,
    debris_colour: "white",
    flags: [],
  },
  WC: {
    key: "WC",
    display_name: "Tungsten Carbide (WC-Co)",
    aliases: ["wc", "carbide", "carbide_wc", "tungsten_carbide"],
    klocke_C: 0.22,
    klocke_k: 0.45,
    mrr_factor: 0.30,
    wire_wear_factor: 1.8,
    gap_voltage_nominal_V: 70,
    peak_current_nominal_A: 4,
    pulse_on_nominal_us: 6,
    debris_colour: "bright-blue",
    flags: ["SLOW_MRR", "COBALT_FUMES"],
  },
  graphite: {
    key: "graphite",
    display_name: "EDM Graphite (POCO EDM-3)",
    aliases: ["graphite", "edm_graphite", "poco", "poco_edm3"],
    klocke_C: 0.18,
    klocke_k: 0.45,
    mrr_factor: 1.2,
    wire_wear_factor: 0.6,
    gap_voltage_nominal_V: 50,
    peak_current_nominal_A: 10,
    pulse_on_nominal_us: 8,
    debris_colour: "black-soot",
    flags: ["DUST_HAZARD"],
  },
  Cu_C110: {
    key: "Cu_C110",
    display_name: "Copper C110 (ETP)",
    aliases: ["cu", "copper", "c110", "copper_c110", "cu_c110"],
    klocke_C: 0.20,
    klocke_k: 0.5,
    mrr_factor: 2.0,
    wire_wear_factor: 0.8,
    gap_voltage_nominal_V: 45,
    peak_current_nominal_A: 12,
    pulse_on_nominal_us: 8,
    debris_colour: "bright-red",
    flags: [],
  },
  Al_6061: {
    key: "Al_6061",
    display_name: "Aluminum 6061-T6",
    aliases: ["al", "6061", "al_6061", "aluminum_6061", "6061-t6"],
    klocke_C: 0.32,
    klocke_k: 0.5,
    mrr_factor: 1.8,
    wire_wear_factor: 0.7,
    gap_voltage_nominal_V: 40,
    peak_current_nominal_A: 11,
    pulse_on_nominal_us: 8,
    debris_colour: "white-bright",
    flags: [],
  },
  Ti6Al4V: {
    key: "Ti6Al4V",
    display_name: "Titanium Ti-6Al-4V",
    aliases: ["ti", "titanium", "ti6al4v", "ti_6al_4v", "grade_5"],
    klocke_C: 0.38,
    klocke_k: 0.5,
    mrr_factor: 0.5,
    wire_wear_factor: 1.3,
    gap_voltage_nominal_V: 72,
    peak_current_nominal_A: 6,
    pulse_on_nominal_us: 12,
    debris_colour: "white-sparkler",
    flags: ["SLOW_MRR"],
  },
  SS_304: {
    key: "SS_304",
    display_name: "304 Stainless Steel",
    aliases: ["304", "ss_304", "stainless_304", "aisi_304"],
    klocke_C: 0.30,
    klocke_k: 0.5,
    mrr_factor: 0.8,
    wire_wear_factor: 1.1,
    gap_voltage_nominal_V: 64,
    peak_current_nominal_A: 7,
    pulse_on_nominal_us: 10,
    debris_colour: "yellow",
    flags: [],
  },
  Inconel_718: {
    key: "Inconel_718",
    display_name: "Inconel 718",
    aliases: ["inconel", "inconel_718", "in718", "ni_superalloy"],
    klocke_C: 0.34,
    klocke_k: 0.5,
    mrr_factor: 0.6,
    wire_wear_factor: 1.4,
    gap_voltage_nominal_V: 70,
    peak_current_nominal_A: 6,
    pulse_on_nominal_us: 12,
    debris_colour: "green-yellow",
    flags: ["SLOW_MRR"],
  },
};

/** JM Die canonical materials (P1-MS3 exit-gate coverage check). */
export const JM_DIE_MATERIALS: WEDMMaterialKey[] = [
  "D2",
  "A2",
  "M2",
  "S7",
  "H13",
  "WC",
  "graphite",
];

// ────────────────────────── Helpers ──────────────────────────

function predictRa(sig: WEDMSparkSignature, ie_A: number, te_us: number): number {
  const energy = Math.max(1e-6, ie_A * te_us);
  return sig.klocke_C * Math.pow(energy, sig.klocke_k);
}

/**
 * Normalized feature-space distance between an observation and a signature.
 * Components (each in relative-error units so no one component dominates):
 *   1. Ra error (predicted vs measured) — primary signal
 *   2. gap-voltage error vs nominal (if supplied)
 *   3. MRR error vs nominal (if supplied)
 *   4. pulse-on deviation from the material's nominal operating regime
 *   5. peak-current deviation from the material's nominal operating regime
 *
 * Components 4 and 5 encode the observation that different materials
 * have distinct "sweet spots" in (ie, te) for stable cutting — operators
 * don't run H13 at S7's regime, so the chosen parameters are informative.
 */
function signatureDistance(
  sig: WEDMSparkSignature,
  obs: SparkSignatureObservation,
): number {
  const ra_pred = predictRa(sig, obs.peak_current_A, obs.pulse_on_us);
  const ra_err = Math.abs(obs.measured_Ra_um - ra_pred) / Math.max(ra_pred, 0.05);

  let v_err = 0;
  if (typeof obs.gap_voltage_V === "number") {
    v_err =
      Math.abs(obs.gap_voltage_V - sig.gap_voltage_nominal_V) /
      sig.gap_voltage_nominal_V;
  }

  let mrr_err = 0;
  if (typeof obs.mrr_relative === "number") {
    mrr_err =
      Math.abs(obs.mrr_relative - sig.mrr_factor) /
      Math.max(sig.mrr_factor, 0.1);
  }

  const te_err =
    Math.abs(obs.pulse_on_us - sig.pulse_on_nominal_us) /
    sig.pulse_on_nominal_us;
  const ie_err =
    Math.abs(obs.peak_current_A - sig.peak_current_nominal_A) /
    sig.peak_current_nominal_A;

  // Weighted L2 — Ra is primary signal; gap V / MRR / (ie, te) corroborate.
  return Math.hypot(
    ra_err,
    0.6 * v_err,
    0.5 * mrr_err,
    0.4 * te_err,
    0.4 * ie_err,
  );
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMMaterialSparkDatabaseEngine {
  /** All known spark signatures, keyed by material. */
  list(): WEDMSparkSignature[] {
    return Object.values(SIGNATURES);
  }

  /** Lookup by exact key or alias (case-insensitive). */
  resolve(input: string): WEDMSparkSignature | null {
    if (!input) return null;
    const q = input.trim().toLowerCase();
    for (const sig of Object.values(SIGNATURES)) {
      if (sig.key.toLowerCase() === q) return sig;
      if (sig.aliases.some((a) => a.toLowerCase() === q)) return sig;
    }
    return null;
  }

  /** Strict lookup by canonical key. */
  get(key: WEDMMaterialKey): WEDMSparkSignature {
    const sig = SIGNATURES[key];
    if (!sig) {
      throw new Error(`Unknown WEDM material key: ${key}`);
    }
    return sig;
  }

  /** Klocke-Ra prediction for a given material at (ie, te). */
  predictRaUm(key: WEDMMaterialKey, ie_A: number, te_us: number): number {
    return predictRa(this.get(key), ie_A, te_us);
  }

  /** Normalized signature distance for a single observation. */
  distance(
    key: WEDMMaterialKey,
    obs: SparkSignatureObservation,
  ): number {
    return signatureDistance(this.get(key), obs);
  }

  /**
   * Out-of-distribution check: if the closest candidate is farther than
   * `ood_threshold` in normalized distance, the observation is flagged as
   * unknown. Default threshold 1.0 ≈ one "material-σ" away — tuned so that
   * the 12 known materials all classify within-distribution but random
   * synthetic exotic materials trigger the flag.
   */
  detectOOD(
    obs: SparkSignatureObservation,
    ood_threshold = 1.0,
  ): OODResult {
    let minD = Infinity;
    let closest: WEDMMaterialKey = "D2";
    for (const sig of Object.values(SIGNATURES)) {
      const d = signatureDistance(sig, obs);
      if (d < minD) {
        minD = d;
        closest = sig.key;
      }
    }
    return {
      is_ood: minD > ood_threshold,
      min_distance: minD,
      closest,
    };
  }

  /** True if the database covers every JM Die canonical material. */
  coversJMDiePortfolio(): boolean {
    return JM_DIE_MATERIALS.every((k) => SIGNATURES[k] != null);
  }
}

export const wedmMaterialSparkDatabaseEngine =
  new WEDMMaterialSparkDatabaseEngine();
