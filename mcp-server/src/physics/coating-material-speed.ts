/**
 * U-OSC-COATING-MATERIAL-SPEED (2026-06-29, slot:oscar) -- material-specific COATING cutting-speed
 * factor. The orchestrator's COATING_DB carries a single workpiece-AGNOSTIC `speed_multiplier` per
 * coating (uncoated 0.70 .. diamond 1.30, normalized to TiAlN=1.0). But a coating's speed benefit is
 * NOT material-agnostic -- it depends on the workpiece ISO group, and some (coating, material) pairs
 * are physically WRONG:
 *
 *   - DIAMOND (PCD/CVD) on FERROUS (P/M/K/H): carbon chemically diffuses into iron at the cutting
 *     temperature -> rapid crater/diffusion wear. Diamond is a NON-FERROUS-ONLY coating. Handing it
 *     the home-application 1.30x boost on steel is BOTH inaccurate AND unsafe (over-speeds a tool
 *     that should not be on the material at all).
 *   - DLC (diamond-like carbon) on FERROUS: same carbon-affinity concern (milder than PCD) + DLC's
 *     low-friction/anti-BUE benefit is a non-ferrous property; reduced benefit on steel.
 *   - High-Al PVD (AlCrN/TiAlN/AlTiN) on ALUMINUM (N): these are engineered for ferrous/high-temp
 *     oxidation resistance; on aluminum the failure mode is built-up edge, not oxidation, so the
 *     high-Al benefit does not materialize (polished/uncoated or DLC is preferred). Mild derate.
 *
 * This module layers a per-(coating, ISO) override on top of the caller's scalar baseline, mirroring
 * `tool-material-speed-override.ts` (the established convention for a material-specific speed layer).
 *
 * SAFETY: every override cell is <= the coating's scalar baseline -> the layer is monotonically
 * SAFE for the headline (it only LOWERS Vc for an incompatible/reduced-benefit pair, never raises).
 * Lowering Vc also lowers spindle power P = Fc*Vc, so it never trades one risk for another. The
 * machine-RPM cap + S(x) gate remain the downstream backstops.
 *
 * Sources (per-cell):
 *   diamond x {P,M,K,H} 0.30-0.35 -- Sandvik Coromant + Kennametal PCD application notes: "PCD/diamond
 *     must NOT be used on ferrous materials (carbon diffusion)"; ASM Handbook Vol.16 (Machining) on
 *     diamond-iron chemical wear. Derate + INCOMPATIBLE flag (do-not-recommend, not merely slow).
 *   DLC x {P,M,K,H} 0.70-0.80 -- DLC is a non-ferrous/anti-BUE coating (Oerlikon Balzers, Sandvik);
 *     reduced, not catastrophic, benefit on ferrous.
 *   {AlCrN,TiAlN,AlTiN} x N 0.90 -- high-Al PVD on aluminum: oxidation resistance is irrelevant, BUE
 *     dominates (Sandvik aluminum-milling guidance favors uncoated/polished or DLC).
 */
import type { ISOGroup } from "./constants.js";

/**
 * Per-(coating key, workpiece ISO group) cutting-speed multiplier OVERRIDE. The coating key matches
 * the orchestrator's COATING_DB normalized keys. Cells absent here fall through to the caller's
 * scalar baseline. Every value is <= the coating's scalar baseline (derate-only; see SAFETY above).
 */
export const COATING_ISO_SPEED_OVERRIDE: Record<string, Partial<Record<ISOGroup, number>>> = {
  // Diamond (PCD/CVD): non-ferrous ONLY. Catastrophic on ferrous (carbon diffusion). N stays at the
  // 1.30 scalar baseline (its home); ferrous heavily derated + flagged incompatible by the helper.
  diamond: { P: 0.30, M: 0.30, K: 0.35, H: 0.30 },
  // DLC: non-ferrous/anti-BUE coating; reduced benefit on ferrous (carbon affinity, milder than PCD).
  DLC: { P: 0.75, M: 0.75, K: 0.80, H: 0.75 },
  // High-Al PVD on aluminum: BUE not oxidation is the failure mode -> oxidation-resistance benefit absent.
  AlCrN: { N: 0.90 },
  TiAlN: { N: 0.90 },
  AlTiN: { N: 0.90 },
};

/**
 * Per-(coating key, workpiece ISO group) tool-LIFE multiplier OVERRIDE. The orchestrator's COATING_DB
 * carries a workpiece-AGNOSTIC `life_multiplier` (diamond=2.00, its non-ferrous home value), but tool
 * LIFE is even more material-dependent than speed: diamond/PCD on ferrous suffers diffusion/crater wear
 * that collapses life to a small FRACTION of its non-ferrous life -- yet the bare 2.00 OVER-states it on
 * the exact diamond-on-steel pair the speed layer already derates+flags. These cells are the ABSOLUTE
 * life multiplier for the pair (not relative to the scalar); all are <= the coating's life baseline, so
 * the layer is DERATE-ONLY (a tool-life estimate can only fall, never rise -> never an over-optimistic
 * life that would under-warn the operator). Sources: ASM Handbook Vol.16 (diamond-iron diffusion wear);
 * Sandvik/Kennametal PCD "non-ferrous only" life guidance.
 */
export const COATING_ISO_LIFE_OVERRIDE: Record<string, Partial<Record<ISOGroup, number>>> = {
  // Diamond on ferrous: life collapses to a small fraction (diffusion/graphitization wear). 0.15-0.25
  // (vs the 2.00 non-ferrous baseline = ~10x shorter; vs a TiAlN 1.0 baseline = ~5x shorter) -- the
  // tool-life estimate now reflects "wrong tool for the material", consistent with the speed derate + flag.
  diamond: { P: 0.15, M: 0.15, K: 0.20, H: 0.15 },
  // DLC on ferrous: reduced life (carbon affinity + low max_temp 350C limits hot ferrous cutting).
  DLC: { P: 0.65, M: 0.65, K: 0.70, H: 0.60 },
  // High-Al PVD on aluminium: BUE shortens edge life vs the coating's ferrous-tuned baseline.
  AlCrN: { N: 0.85 },
  TiAlN: { N: 0.85 },
  AlTiN: { N: 0.85 },
};

/** Clamp band for the life override (life multipliers span a wider range than speed). */
export const COATING_MATERIAL_LIFE_FACTOR_MIN = 0.05;
export const COATING_MATERIAL_LIFE_FACTOR_MAX = 2.5;

/**
 * Material-specific coating tool-LIFE multiplier. When a workpiece `isoGroup` selects an override cell,
 * returns the per-(coating, ISO) life factor; otherwise the caller's workpiece-agnostic `baseLifeScalar`
 * (the COATING_DB life_multiplier). DERATE-ONLY: every override cell is <= the coating's life baseline,
 * so a tool-life estimate can only fall. Omitting `isoGroup` -> baseLifeScalar (back-compat). Clamped.
 *
 * @param coatingKey     normalized coating key (e.g. "diamond", "AlCrN")
 * @param baseLifeScalar the coating's workpiece-agnostic scalar life_multiplier (the fallback)
 * @param isoGroup       optional workpiece ISO group (P/M/K/N/S/H) selecting the material-specific cell
 */
export function getCoatingMaterialLifeFactor(
  coatingKey: string | undefined | null,
  baseLifeScalar: number,
  isoGroup?: ISOGroup,
): number {
  const base = Number.isFinite(baseLifeScalar) && baseLifeScalar > 0 ? baseLifeScalar : 1.0;
  if (!coatingKey || !isoGroup) return base;
  const override = COATING_ISO_LIFE_OVERRIDE[coatingKey]?.[isoGroup];
  const raw = override ?? base;
  return Math.min(COATING_MATERIAL_LIFE_FACTOR_MAX, Math.max(COATING_MATERIAL_LIFE_FACTOR_MIN, raw));
}

/**
 * Absolute tool-LIFE cap (minutes) for a carbon-diffusion-INCOMPATIBLE pair (diamond/PCD on ferrous).
 * A multiplier on the Taylor base is the WRONG mechanism here: the speed layer derates Vc, and Taylor
 * life ~ (1/Vc)^(1/n) INFLATES the base ~100x at a 0.3x Vc derate -- a 0.15 life multiplier cannot
 * counteract that, leaving a physically-impossible long life. The real failure on ferrous is CHEMICAL
 * (carbon diffusion / crater wear) which proceeds fast regardless of cutting speed, so a small ABSOLUTE
 * cap is the correct model: diamond on steel does not survive a normal cut. 8 min is a conservative
 * UPPER bound (actual is usually far shorter) -- the cap floors the optimism without claiming precision.
 * Source: ASM Handbook Vol.16 (diamond-iron diffusion wear is temperature-driven, not Vc-arrestable).
 */
export const COATING_INCOMPATIBLE_LIFE_CAP_MIN = 8;

/** The life cap for a (coating, ISO) pair: the absolute cap minutes if incompatible, else Infinity (no cap). */
export function coatingIncompatibleLifeCap(
  coatingKey: string | undefined | null,
  isoGroup?: ISOGroup,
): number {
  return isCoatingMaterialIncompatible(coatingKey, isoGroup) ? COATING_INCOMPATIBLE_LIFE_CAP_MIN : Infinity;
}

/** Coating keys that are physically INCOMPATIBLE with ferrous workpieces (carbon-diffusion class). */
const FERROUS_INCOMPATIBLE_COATINGS = new Set<string>(["diamond"]);
const FERROUS_ISO = new Set<ISOGroup>(["P", "M", "K", "H"]); // P steel, M stainless, K cast iron, H hardened

/** Clamp band -- catches a wild/typo'd override while still allowing the legitimate spread. */
export const COATING_MATERIAL_SPEED_FACTOR_MIN = 0.2;
export const COATING_MATERIAL_SPEED_FACTOR_MAX = 1.5;

/**
 * Material-specific coating cutting-speed multiplier. When a workpiece `isoGroup` selects an override
 * cell, returns the per-(coating, ISO) factor; otherwise the caller's workpiece-agnostic `baseScalar`
 * (the COATING_DB speed_multiplier). Omitting `isoGroup` -> baseScalar (back-compat). Result clamped.
 *
 * @param coatingKey normalized coating key (e.g. "AlCrN", "diamond", "TiAlN")
 * @param baseScalar the coating's workpiece-agnostic scalar speed_multiplier (the fallback)
 * @param isoGroup  optional workpiece ISO group (P/M/K/N/S/H) selecting the material-specific cell
 */
export function getCoatingMaterialSpeedFactor(
  coatingKey: string | undefined | null,
  baseScalar: number,
  isoGroup?: ISOGroup,
): number {
  const base = Number.isFinite(baseScalar) && baseScalar > 0 ? baseScalar : 1.0;
  if (!coatingKey || !isoGroup) return base;
  const override = COATING_ISO_SPEED_OVERRIDE[coatingKey]?.[isoGroup];
  const raw = override ?? base;
  return Math.min(COATING_MATERIAL_SPEED_FACTOR_MAX, Math.max(COATING_MATERIAL_SPEED_FACTOR_MIN, raw));
}

/**
 * True iff the (coating, workpiece ISO) pair is physically incompatible (carbon-diffusion class --
 * diamond/PCD on ferrous). The SFC engine surfaces this as an operator warning ("diamond tooling on
 * a ferrous workpiece -- chemical wear; select a PVD/CVD carbide grade"), distinct from the speed
 * derate. False for every non-ferrous workpiece and every non-incompatible coating.
 *
 * @param coatingKey normalized coating key
 * @param isoGroup   workpiece ISO group (P/M/K/N/S/H)
 */
export function isCoatingMaterialIncompatible(
  coatingKey: string | undefined | null,
  isoGroup?: ISOGroup,
): boolean {
  if (!coatingKey || !isoGroup) return false;
  return FERROUS_INCOMPATIBLE_COATINGS.has(coatingKey) && FERROUS_ISO.has(isoGroup);
}
