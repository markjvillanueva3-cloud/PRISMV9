/**
 * U-OSC-TOOLMAT-SPEED-MATERIAL-SPECIFIC (2026-06-09) -- material-specific tool-material speed
 * factor. The canonical uniform `CANONICAL_TOOL_MATERIAL_SPEED_FACTOR` (constants.ts) is
 * workpiece-agnostic, but the real tool-Vc/carbide-Vc RATIO depends on the workpiece ISO group.
 * The live tri-vendor comparison (SpeedFeedTriComparatorEngine) surfaced the gap: PRISM
 * OVER-sped HSS on cast iron +108% and CBN on hardened +49% (UNSAFE -- rapid tool failure), and
 * UNDER-sped ceramic -49%. This module layers a per-(tool, ISO) override + a widened clamp band
 * on top of the canonical base table (imported READ-ONLY).
 *
 * Why it lives OUTSIDE constants.ts: constants.ts is the safety-critical Kienzle/Taylor home
 * (edit-guarded). This material-speed CORRECTION is a separable layer -- it reads the canonical
 * base table but introduces NO Kienzle/Taylor value. Override values are physics-reviewer-
 * validated 2026-06-09 (per-cell literature citations below).
 *
 * SAFETY: the hss/cbn overrides LOWER the factor (fix an over-speed -- strictly safer, NOT a
 * softened threshold). The ceramic overrides RAISE it (ceramic genuinely runs cast iron /
 * superalloys that fast); the downstream machine-RPM cap + S(x) gate remain the backstops.
 */
import {
  CANONICAL_TOOL_MATERIAL_SPEED_FACTOR,
  type ToolMaterial,
  type ISOGroup,
} from "./constants.js";

/**
 * Per-(tool material, workpiece ISO group) speed-ratio overrides. Cell = tool-Vc/carbide-Vc for
 * the SAME ISO group. Cells absent here fall through to the uniform default; carbide is NEVER
 * overridden (the 1.0 calibration baseline). Sources:
 *   hss x K  0.13  -- HSS gray iron 18-37 vs carbide ~150 m/min (Machinery's Handbook 30th
 *                     cast-iron speed table); abrasive pearlite/graphite collapses HSS hot-
 *                     hardness. THE over-speed safety fix.
 *   ceramic x K 3.8 -- Sandvik ceramic gray iron 400-700 vs carbide ~150 m/min (ceramic's home).
 *   ceramic x S 6.5 -- SiAlON/whisker ceramic Inconel 200-280 vs carbide ~35 m/min (Kennametal/
 *                      Sandvik superalloy data).
 *   cbn x H  1.4   -- CBN hard-turn 58-62 HRC 120-200 vs carbide-on-hardened ~110 m/min; CBN's
 *                     edge over hardened steel is tool life/finish, not a 2.5x speed jump.
 */
export const TOOL_MATERIAL_SPEED_OVERRIDE: Partial<
  Record<ToolMaterial, Partial<Record<ISOGroup, number>>>
> = {
  hss: { K: 0.13 },
  ceramic: { K: 3.8, S: 6.5 },
  cbn: { H: 1.4 },
};

/**
 * Widened clamp band (the canonical uniform fn clamps to [0.3, 3.0]). That band BLOCKED the
 * correct material-specific values: HSS-cast-iron ~0.13 was floored to 0.3 (-> over-speed) and
 * ceramic-superalloy ~6.5 was ceiled to 3.0 (-> under-speed). The widened band still catches
 * wild/typo'd values: < 0.10 or > 8.0 is not a real (tool, material) pair.
 */
export const MATERIAL_SPECIFIC_SPEED_FACTOR_MIN = 0.1;
export const MATERIAL_SPECIFIC_SPEED_FACTOR_MAX = 8.0;

/**
 * Material-specific tool-material cutting-speed multiplier. When a workpiece `isoGroup` selects
 * an override cell (e.g. HSS on abrasive cast iron), returns the per-(tool, ISO) ratio; otherwise
 * the canonical uniform default. Omitting `isoGroup` -> uniform (back-compat with the bare
 * canonical fn). Unknown/empty material -> carbide (1.0). Result clamped to the widened band.
 *
 * @param material tool material name (case-insensitive, e.g. "HSS", "carbide")
 * @param isoGroup optional workpiece ISO group (P/M/K/N/S/H) selecting the material-specific cell
 */
export function getMaterialSpecificToolSpeedFactor(
  material: string | undefined | null,
  isoGroup?: ISOGroup,
): number {
  if (!material) return CANONICAL_TOOL_MATERIAL_SPEED_FACTOR.carbide;
  const key = String(material).toLowerCase() as ToolMaterial;
  const override = isoGroup ? TOOL_MATERIAL_SPEED_OVERRIDE[key]?.[isoGroup] : undefined;
  const raw =
    override ?? CANONICAL_TOOL_MATERIAL_SPEED_FACTOR[key] ?? CANONICAL_TOOL_MATERIAL_SPEED_FACTOR.carbide;
  return Math.min(
    MATERIAL_SPECIFIC_SPEED_FACTOR_MAX,
    Math.max(MATERIAL_SPECIFIC_SPEED_FACTOR_MIN, raw),
  );
}

/**
 * U-OSC-HSS-AGGR-VC-CAP (2026-06-25) -- HSS aggressive-mode cutting-SPEED thermal cap.
 *
 * ISO groups where HSS (high-speed steel) has NO aggressive cutting-SPEED (Vc) regime above its
 * general/recommended milling speed. HSS red-hardness / tempering limit (~540-600 C) is reached at
 * the RECOMMENDED Vc, so for these hot-cutting workpiece classes the recommended (balanced) speed
 * IS the thermal ceiling -- pushing an "aggressive" higher Vc just over-heats the edge and collapses
 * tool life. For HSS, aggressive MRR therefore comes from depth-of-cut (ap) + feed-per-tooth (fz),
 * NOT a higher Vc. Carbide (red-hardness ~1000 C+) and the high-temp super-hard materials
 * (cermet / ceramic / CBN / PCD) DO have a legitimate aggressive Vc gear -- they are NEVER capped.
 *
 * N (aluminum) is DELIBERATELY EXCLUDED: aluminum's low cutting temperature leaves HSS genuine Vc
 * headroom (~1.5-2x above the general speed), so an aggressive HSS Vc IS physically justified there.
 *
 * The cap is applied by the SFC engine as Vc_base = min(Vc_aggressive_base, Vc_balanced_base) for an
 * HSS tool in one of these groups -- monotonically SAFE (it can only LOWER Vc; balanced + conservative
 * modes are byte-identical, and lowering Vc also lowers spindle power P = Fc*Vc, so it never trades
 * one risk for another). K-group HSS over-speed was separately fixed by the hss:{K:0.13} ratio
 * override above; this cap closes the orthogonal aggressive-MODE over-reach for P/M/K/S/H.
 *
 * Source: Trent & Wright, "Metal Cutting" 4th ed. ch.6 (HSS hot-hardness / red-hardness mechanism);
 *   Machinery's Handbook 31st ed. HSS milling speed tables (a SINGLE recommended Vc band per
 *   material -- no separate "aggressive" Vc column for HSS, unlike the carbide tables); Sandvik
 *   Coromant + Kennametal HSS application data. Independently corroborated 2026-06-25 (xAI Grok
 *   physics consensus + adversarial physics-review adjudication of this exact change).
 */
export const HSS_THERMALLY_VC_CAPPED_ISO: ReadonlySet<ISOGroup> = new Set<ISOGroup>([
  "P",
  "M",
  "K",
  "S",
  "H",
]);

/**
 * True iff the (tool material, workpiece ISO) pair is HSS in a hot-cutting group with NO aggressive
 * cutting-SPEED headroom -- the SFC engine must then clamp the aggressive Vc base to the balanced
 * level (fz/ap stay aggressive). False for every non-HSS material, for HSS-on-aluminum (N), and when
 * the ISO group is unknown (fail-open to the existing RPM-cap + S(x) backstops -- never a wild cap).
 *
 * @param material tool material name (case-insensitive, e.g. "HSS", "carbide")
 * @param isoGroup workpiece ISO group (P/M/K/N/S/H)
 */
export function isHssAggressiveVcThermallyCapped(
  material: string | undefined | null,
  isoGroup?: ISOGroup,
): boolean {
  if (!material || !isoGroup) return false;
  return String(material).toLowerCase() === "hss" && HSS_THERMALLY_VC_CAPPED_ISO.has(isoGroup);
}
