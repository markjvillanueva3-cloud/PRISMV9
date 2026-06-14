/**
 * HardnessToVcInverter — Speed-Feed algorithm #8.4
 *
 * Operator inputs workpiece HARDNESS (HRC or HB) and gets a Vc correction
 * relative to the catalog reference hardness. Today operators do this
 * mentally: "if part is HRC 50 instead of HRC 30, drop Vc by 30%". This
 * algorithm encodes the ISO-group-specific curves and returns the multiplier.
 *
 * COMPLEMENTARY (not duplicate) to ExtendedTaylorModel's hardness_HB correction
 * — Taylor uses absolute hardness in the life equation; this engine returns
 * the Vc *change* to maintain a constant life as hardness shifts away from
 * the catalog reference. Operators reason in deltas, not absolutes.
 *
 * Closed-form per ISO group (cited):
 *   P-steels:    Vc_mult = (HB_ref / HB) ^ 0.30   (Sandvik 2023-24 §steel)
 *   M-stainless: Vc_mult = (HB_ref / HB) ^ 0.35   (Sandvik §stainless)
 *   K-cast iron: Vc_mult = (HB_ref / HB) ^ 0.25   (Sandvik §cast iron)
 *   N-aluminum:  Vc_mult = (HB_ref / HB) ^ 0.10   (low sensitivity)
 *   S-superalloy:Vc_mult = (HB_ref / HB) ^ 0.45   (Inconel/Ti — high sensitivity)
 *   H-hardened:  Vc_mult = (HB_ref / HB) ^ 0.50   (very high sensitivity)
 *
 * HRC↔HB conversion uses ISO 18265 standard table (steel only). For non-steel,
 * input MUST be in HB; HRC for aluminum/copper is meaningless.
 *
 * @module HardnessToVcInverter
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

export interface HardnessVcInput {
  iso_group: IsoGroupLabel;
  /** Workpiece hardness HRC (Rockwell C) — STEEL ONLY. Range [20, 65]. */
  hardness_HRC?: number;
  /** Workpiece hardness HB (Brinell) — any material. Range [40, 700]. */
  hardness_HB?: number;
  /** Catalog reference hardness HB — typically vendor's test condition. */
  reference_hardness_HB?: number;
}

export interface HardnessVcResult {
  vc_multiplier: AtomicValue;
  effective_hardness_HB: AtomicValue;
  exponent_used: number;
  notes: string[];
  source: string;
}

/** ISO 18265 conversion table — HRC → HB (steel only). Linear interpolation. */
const HRC_TO_HB: Array<[number, number]> = [
  [20, 226], [25, 253], [30, 286], [35, 327], [40, 371],
  [45, 421], [50, 481], [55, 560], [60, 654], [65, 739],
];

const ISO_EXPONENT: Record<IsoGroupLabel, number> = {
  P: 0.30, M: 0.35, K: 0.25, N: 0.10, S: 0.45, H: 0.50,
};

const ISO_REFERENCE_HB: Record<IsoGroupLabel, number> = {
  P: 180,  // mild steel reference
  M: 200,  // 304 SS reference
  K: 180,  // gray iron reference
  N: 80,   // 6061 Al reference
  S: 250,  // Inconel 718 reference
  H: 500,  // 4140 hardened reference
};

const HRC_MIN = 20, HRC_MAX = 65;
const HB_MIN = 40, HB_MAX = 700;

export function hrcToHB(hrc: number): number {
  if (!Number.isFinite(hrc)) return NaN;
  if (hrc <= HRC_TO_HB[0][0]) return HRC_TO_HB[0][1];
  if (hrc >= HRC_TO_HB[HRC_TO_HB.length - 1][0]) return HRC_TO_HB[HRC_TO_HB.length - 1][1];
  for (let i = 0; i < HRC_TO_HB.length - 1; i++) {
    const [hrc1, hb1] = HRC_TO_HB[i];
    const [hrc2, hb2] = HRC_TO_HB[i + 1];
    if (hrc >= hrc1 && hrc <= hrc2) {
      const t = (hrc - hrc1) / (hrc2 - hrc1);
      return hb1 + t * (hb2 - hb1);
    }
  }
  return NaN;
}

function emit(reason: string): HardnessVcResult {
  return {
    vc_multiplier: { value: 1, unit: "ratio", uncertainty: 0, source: "invalid-input", confidence: 0 },
    effective_hardness_HB: { value: 0, unit: "HB", uncertainty: 0, source: "invalid-input", confidence: 0 },
    exponent_used: 0,
    notes: [reason],
    source: "HardnessToVcInverter v1.0.0",
  };
}

export function computeVcMultiplier(input: HardnessVcInput): HardnessVcResult {
  if (!input) return emit("missing input");
  if (!ISO_EXPONENT[input.iso_group]) return emit(`unknown iso_group: ${input.iso_group}`);

  let HB = NaN;
  if (Number.isFinite(input.hardness_HB)) {
    HB = input.hardness_HB!;
  } else if (Number.isFinite(input.hardness_HRC)) {
    if (input.iso_group !== "P" && input.iso_group !== "H") {
      return emit(`HRC only valid for steel (P or H); got ${input.iso_group} — use hardness_HB`);
    }
    if (input.hardness_HRC! < HRC_MIN || input.hardness_HRC! > HRC_MAX) {
      return emit(`hardness_HRC ${input.hardness_HRC} outside [${HRC_MIN}, ${HRC_MAX}]`);
    }
    HB = hrcToHB(input.hardness_HRC!);
  } else {
    return emit("must supply hardness_HB or hardness_HRC");
  }

  if (HB < HB_MIN || HB > HB_MAX) return emit(`effective HB ${HB.toFixed(0)} outside [${HB_MIN}, ${HB_MAX}]`);

  const HB_ref = Number.isFinite(input.reference_hardness_HB)
    ? input.reference_hardness_HB!
    : ISO_REFERENCE_HB[input.iso_group];
  if (HB_ref <= 0) return emit("reference_hardness_HB must be > 0");

  const exponent = ISO_EXPONENT[input.iso_group];
  const mult = Math.pow(HB_ref / HB, exponent);

  return {
    vc_multiplier: { value: mult, unit: "ratio", uncertainty: mult * 0.05, source: `Sandvik 2023-24 ${input.iso_group}-group exponent`, confidence: 0.85 },
    effective_hardness_HB: { value: HB, unit: "HB", uncertainty: HB * 0.03, source: input.hardness_HRC ? "ISO-18265 HRC→HB conversion" : "input HB", confidence: 0.95 },
    exponent_used: exponent,
    notes: HB > HB_ref ? [`workpiece harder than reference (HB ${HB.toFixed(0)} > ${HB_ref}) — Vc must DROP by ${((1 - mult) * 100).toFixed(1)}%`] : HB < HB_ref ? [`workpiece softer than reference — Vc can RISE by ${((mult - 1) * 100).toFixed(1)}%`] : ["workpiece at reference hardness — no Vc change"],
    source: "HardnessToVcInverter v1.0.0",
  };
}

export const HardnessToVcInverter = {
  version: "1.0.0" as const,
  computeVcMultiplier,
  hrcToHB,
};
