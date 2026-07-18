/**
 * CoatingVcModifier -- Speed-Feed algorithm #8.6
 *
 * Tool coating changes effective surface speed: a harder / more heat-resistant coating
 * lets the edge run faster before thermal+crater wear dominates. The operator picks a
 * coating; this returns a Vc multiplier RELATIVE TO THE REGIME'S TABULATED BASELINE
 * coating -- NOT relative to uncoated.
 *
 * WHY relative-to-baseline (the double-count fix): the base Vc table (BASE_PARAMS in
 * UltimateSpeedFeedEngine) is tabulated with an ASSUMED PREMIUM coating per regime
 * (P/M milling = AlTiN, drilling = TiAlN, N milling = uncoated/DLC, K/turning = CVD
 * grades). A raw rel-uncoated speedMult would DOUBLE-COUNT the baked-in premium and
 * over-speed every default call. So:
 *
 *   coatingVcFactor = speedMult[userCoating] / speedMult[regimeBaselineCoating]
 *
 *     == 1.0 when user coating == the regime baseline   (default calls byte-identical)
 *     <  1.0 when the user picks a WEAKER coating         (derate -- fail-safe)
 *     >  1.0 only when genuinely better than the baseline
 *
 * FAIL-SAFE: if EITHER coating cannot be resolved against the canonical speedMult set
 * (CVD multilayers / Al2O3 / CBN / cermet / ceramic / ZrN have no PVD speedMult entry),
 * the factor is 1.0 -- we never scale Vc off an undefined ratio (no over-speed on an
 * unknown baseline). The same when no user coating is supplied.
 *
 * MATERIAL GATE (goodCoatings): a coating not suited to the work material (e.g. a nitride
 * on aluminium, where adhesion / built-up-edge dominate and the table already assumes
 * uncoated/DLC) is CLAMPED to <= 1.0 -- it may derate but is never rewarded with a
 * speed-up. This mirrors G-Wizard / HSMAdvisor (no nitride bonus on aluminium). The real
 * N (aluminium) speed-up is the PCD/diamond SUBSTRATE factor (tool-material-speed-override),
 * which this coating factor must not double.
 *
 * speedMult + goodCoatings MIRROR data/prism-reference-db/coatings.json
 * (stores.coatingFactors[*].speedMult and stores.goodCoatings). They are inlined here (matching the
 * CoolantVcModifier sibling -- no hot-path JSON I/O) and DRIFT-GUARDED by the companion test, which
 * asserts these maps equal coatings.json so they cannot silently desync from the reference DB.
 *
 * Citations:
 *   speedMult / goodCoatings : prism-reference-db/coatings.json (Sandvik/Iscar/Kennametal grade data)
 *   coating speed effect      : Sandvik Coromant coating & grade guide
 *   thermal/wear basis        : Bouzakis et al., "PVD coatings for cutting tools" (CIRP Annals)
 *   BUE / material gating      : Grzesik, coating tribology + material-conditioned selection
 *
 * @module CoatingVcModifier
 * @version 1.0.0
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  uncertainty: number;
  source: string;
  confidence?: number;
}

export type IsoGroupLabel = "P" | "M" | "K" | "N" | "S" | "H";

export interface CoatingVcInput {
  iso_group: IsoGroupLabel;
  /** The operator-selected tool coating (free-form name; normalized internally). */
  user_coating?: string | null;
  /** The regime's tabulated baseline coating = BASE_PARAMS.coatings[0]. */
  baseline_coating?: string | null;
}

export interface CoatingVcResult {
  vc_multiplier: AtomicValue;
  notes: string[];
  source: string;
}

// Canonical coating speed multipliers RELATIVE TO UNCOATED.
// SOURCED FROM prism-reference-db/coatings.json -> stores.coatingFactors[*].speedMult.
// Keys are NORMALIZED (uppercase, no spaces). Only the bare PVD/uncoated family that the
// reference DB assigns a speedMult lives here; CVD multilayers / Al2O3 / CBN / cermet are
// intentionally absent so they resolve to "unresolved" -> fail-safe 1.0 (see normalize()).
const SPEED_MULT: Record<string, number> = {
  UNCOATED: 1.0,
  TIN: 1.15,
  TICN: 1.2,
  TIALN: 1.3,
  ALTIN: 1.4,
  ALCRN: 1.35,
  DLC: 1.25,
  DIAMOND: 1.5,
};

// goodCoatings (material-conditioning) from coatings.json -> stores.goodCoatings, normalized to Sets.
// A coating absent from its material's set (and != the regime baseline) is clamped to <= 1.0.
const GOOD_COATINGS: Record<string, Set<string>> = {
  aluminum: new Set(["DLC", "ZRN", "UNCOATED", "TIB2"]),
  steel: new Set(["TIALN", "ALTIN", "TICN", "TIN"]),
  stainless: new Set(["ALTIN", "TIALN", "NACO"]),
  titanium: new Set(["TIALN", "ALCRN"]),
  cast_iron: new Set(["TICN", "TIN", "AL2O3"]),
};

// ISO group -> the goodCoatings material bucket. N (non-ferrous) maps to aluminium (the BUE-prone
// dominant case); S (superalloy/titanium) borrows titanium's suited set; H (hardened) borrows steel's.
const ISO_TO_MATERIAL: Record<IsoGroupLabel, string> = {
  P: "steel",
  M: "stainless",
  K: "cast_iron",
  N: "aluminum",
  S: "titanium",
  H: "steel",
};

const ISO_VALID = new Set<string>(["P", "M", "K", "N", "S", "H"]);

/** Uppercase + strip a leading PVD-process prefix + remove spaces. Used for set membership (the gate). */
function gateKey(name: string): string {
  return String(name).trim().toUpperCase().replace(/^PVD[\s_-]+/, "").replace(/\s+/g, "");
}

/** Resolve a coating name to a canonical SPEED_MULT key, or null if it has no defined speedMult. */
function normalize(name: string | undefined | null): string | null {
  if (!name) return null;
  const key = gateKey(name);
  return Object.prototype.hasOwnProperty.call(SPEED_MULT, key) ? key : null;
}

function emit(reason: string, value = 1, confidence = 0): CoatingVcResult {
  return {
    vc_multiplier: { value, unit: "ratio", uncertainty: 0, source: reason, confidence },
    notes: [reason],
    source: "CoatingVcModifier v1.0.0",
  };
}

/**
 * Vc multiplier for a tool coating relative to the regime's tabulated baseline coating.
 * Always fail-safe to 1.0 (never throws, never over-speeds on an undefined ratio).
 */
export function getMultipliers(input: CoatingVcInput): CoatingVcResult {
  if (!input) return emit("missing input");
  if (!ISO_VALID.has(input.iso_group)) return emit(`unknown iso_group: ${input.iso_group}`);

  // No operator coating -> no adjustment (byte-identical default).
  if (!input.user_coating) return emit("coating-unspecified->1.0");

  const uNorm = normalize(input.user_coating);
  const bNorm = normalize(input.baseline_coating);

  // Either side unresolved (CVD multilayer / Al2O3 / CBN / cermet / ZrN baseline, or an unknown
  // user coating) -> fail-safe 1.0; we never ratio against an undefined speedMult.
  if (uNorm === null || bNorm === null) {
    return emit(
      `coating unresolved (user='${input.user_coating}' base='${input.baseline_coating ?? ""}')->1.0`,
      1,
      0.3,
    );
  }

  let factor = SPEED_MULT[uNorm] / SPEED_MULT[bNorm];
  const notes: string[] = [];
  const isBaseline = uNorm === bNorm;

  // Material gate: a coating not suited to the work material may derate but never speed up.
  const material = ISO_TO_MATERIAL[input.iso_group];
  const suited = GOOD_COATINGS[material];
  if (suited && !suited.has(gateKey(input.user_coating)) && !isBaseline && factor > 1.0) {
    notes.push(
      `${input.user_coating} is not advised for ${material} (${input.iso_group}-group): adhesion/BUE dominate; coating speed-up suppressed (clamped to 1.0). The real ${input.iso_group} speed-up is the PCD/diamond substrate, not a coating.`,
    );
    factor = 1.0;
  } else if (!isBaseline) {
    notes.push(
      factor > 1.0
        ? `${input.user_coating} runs ${((factor - 1) * 100).toFixed(0)}% faster than the regime baseline ${input.baseline_coating}`
        : `${input.user_coating} is weaker than the regime baseline ${input.baseline_coating}: Vc derated ${((1 - factor) * 100).toFixed(0)}% (fail-safe)`,
    );
  }

  return {
    vc_multiplier: {
      value: factor,
      unit: "ratio",
      uncertainty: 0.08,
      source: `coating speedMult ${uNorm}/${bNorm} (iso ${input.iso_group})`,
      confidence: 0.8,
    },
    notes,
    source: "CoatingVcModifier v1.0.0",
  };
}

export const CoatingVcModifier = {
  version: "1.0.0" as const,
  getMultipliers,
};

// Exposed for the drift-guard test (CoatingVcModifier.test.ts), which pins these inlined maps to
// data/prism-reference-db/coatings.json so they can never silently desync from the reference DB.
export { SPEED_MULT as COATING_SPEED_MULT, GOOD_COATINGS as COATING_GOOD_COATINGS };
