/**
 * CoolantVcModifier — Speed-Feed algorithm #8.5
 *
 * Coolant strategy changes both effective surface speed AND Taylor tool life.
 * Operator picks coolant from a 5-state set (dry / flood / mist / MQL / cryo)
 * and gets Vc + Taylor-C multipliers vs the standard-flood reference.
 *
 * COMPLEMENTARY to ExtendedTaylorModel's `coolant` temperature derating —
 * this returns the headline Vc adjustment for first-cut selection; Taylor's
 * field is a finer-grained life-time correction for the steady-state regime.
 *
 * Citations:
 *   dry        : Sandvik 2023-24 §dry-machining (75-80% of flood Vc)
 *   flood      : reference (1.0 baseline)
 *   mist       : Iscar §coolant-effect (105-110% of flood for most ISO)
 *   MQL        : ISO 14955 §MQL guidance (90-115% depending on ISO)
 *   cryogenic  : Cryomec / Sandvik LN2 study (120-180% boost for S+H)
 *
 * Per-ISO-group multipliers — coolant effect varies strongly with material:
 *   - Aluminum (N): MQL excels (chip evacuation), cryo offers little benefit
 *   - Inconel (S): cryogenic shines (cuts heat at chip-tool interface)
 *   - Steel (P): flood remains best for general-purpose
 *
 * @module CoolantVcModifier
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
export type CoolantType = "dry" | "flood" | "mist" | "MQL" | "cryogenic";

export interface CoolantVcInput {
  iso_group: IsoGroupLabel;
  coolant: CoolantType;
}

export interface CoolantVcResult {
  vc_multiplier: AtomicValue;
  taylor_C_multiplier: AtomicValue;
  notes: string[];
  source: string;
}

// [Vc-mult, Taylor-C-mult] per (iso, coolant). Reference: flood = [1.0, 1.0].
// Sources cited in module header.
const TABLE: Record<IsoGroupLabel, Record<CoolantType, [number, number]>> = {
  P: { dry: [0.78, 0.65], flood: [1.00, 1.00], mist: [1.05, 1.02], MQL: [1.00, 0.95], cryogenic: [1.15, 1.30] },
  M: { dry: [0.70, 0.55], flood: [1.00, 1.00], mist: [1.03, 1.00], MQL: [1.05, 1.05], cryogenic: [1.30, 1.50] },
  K: { dry: [0.92, 0.85], flood: [1.00, 1.00], mist: [1.02, 1.00], MQL: [0.98, 0.92], cryogenic: [1.10, 1.20] },
  N: { dry: [0.85, 0.80], flood: [1.00, 1.00], mist: [1.08, 1.05], MQL: [1.15, 1.10], cryogenic: [1.05, 1.05] },
  S: { dry: [0.55, 0.40], flood: [1.00, 1.00], mist: [0.95, 0.85], MQL: [0.90, 0.80], cryogenic: [1.60, 1.80] },
  H: { dry: [0.65, 0.50], flood: [1.00, 1.00], mist: [0.95, 0.90], MQL: [0.95, 0.90], cryogenic: [1.40, 1.55] },
};

const ISO_VALID = new Set<string>(["P", "M", "K", "N", "S", "H"]);
const COOLANT_VALID = new Set<string>(["dry", "flood", "mist", "MQL", "cryogenic"]);

function emit(reason: string): CoolantVcResult {
  return {
    vc_multiplier: { value: 1, unit: "ratio", uncertainty: 0, source: "invalid-input", confidence: 0 },
    taylor_C_multiplier: { value: 1, unit: "ratio", uncertainty: 0, source: "invalid-input", confidence: 0 },
    notes: [reason],
    source: "CoolantVcModifier v1.0.0",
  };
}

export function getMultipliers(input: CoolantVcInput): CoolantVcResult {
  if (!input) return emit("missing input");
  if (!ISO_VALID.has(input.iso_group)) return emit(`unknown iso_group: ${input.iso_group}`);
  if (!COOLANT_VALID.has(input.coolant)) return emit(`unknown coolant: ${input.coolant}`);

  const [vcMult, cMult] = TABLE[input.iso_group][input.coolant];
  const notes: string[] = [];
  if (input.coolant === "dry" && (input.iso_group === "S" || input.iso_group === "M")) {
    notes.push(`dry on ${input.iso_group}-group is aggressive — tool life drops sharply (C×${cMult.toFixed(2)})`);
  }
  if (input.coolant === "cryogenic" && input.iso_group === "S") {
    notes.push("cryogenic on S-superalloy: largest Vc boost in the catalog (60%) — verify LN2 supply + nozzle aim");
  }
  if (input.coolant === "MQL" && (input.iso_group === "S" || input.iso_group === "H")) {
    notes.push(`MQL on ${input.iso_group}-group is sub-flood — heat removal is insufficient; consider flood or cryo`);
  }

  return {
    vc_multiplier: { value: vcMult, unit: "ratio", uncertainty: 0.05, source: `coolant table ${input.iso_group}/${input.coolant}`, confidence: 0.85 },
    taylor_C_multiplier: { value: cMult, unit: "ratio", uncertainty: 0.08, source: `coolant table ${input.iso_group}/${input.coolant}`, confidence: 0.80 },
    notes,
    source: "CoolantVcModifier v1.0.0",
  };
}

export const CoolantVcModifier = {
  version: "1.0.0" as const,
  getMultipliers,
};
