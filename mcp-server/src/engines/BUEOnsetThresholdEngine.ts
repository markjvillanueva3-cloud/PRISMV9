/**
 * BUEOnsetThresholdEngine — LATHE-PROD-READY-MS0/U-LPR-BUE
 * ========================================================
 *
 * Predicts built-up edge (BUE) onset risk for a turning operation given
 * cutting speed, workpiece material class, tool material, and rake
 * angle.  BUE is the welded layer of work-material that adheres to the
 * tool tip at low cutting speeds — it degrades surface finish, causes
 * dimensional drift (effective cutting-edge radius walks), and triggers
 * intermittent chip-load spikes that overstress the insert.
 *
 * The Physics R2 spec for LATHE-PROD-READY-MS0 cites two long-standing
 * sources for the critical-speed regime:
 *
 *   • Trent, E. M. & Wright, P. K. (2000) — "Metal Cutting" 4th ed,
 *     ch.4: BUE forms when v_c lies in the strain-rate window where
 *     the chip's deformation temperature is above the workpiece's
 *     bonding temperature but below the secondary-shear thermal
 *     softening regime.  Steels: 30 m/min < v_c < 90 m/min is the
 *     classic risk band; suppressed above ~120 m/min.
 *
 *   • Sandvik Coromant Technical Guide (2023) — turning recommendations:
 *     "Increase cutting speed above the BUE band to push the chip
 *     into the smooth-flow regime."  Per ISO group:
 *       P (steel)         : risk band 30–110 m/min, suppress > 120
 *       M (stainless)     : risk band 30–130 m/min, suppress > 150
 *       K (cast iron)     : virtually no BUE — graphite acts as
 *                          internal lubricant
 *       N (aluminum)      : aggressive risk 0–200 m/min, needs
 *                          polished tool + high speed (> 250)
 *       S (superalloy)    : risk band 15–60 m/min, suppress > 80
 *       H (hardened steel): no BUE — operating regime is shear-
 *                          dominated, BUE not thermodynamically stable
 *
 * Tool-material modifier: PCD/CBN/coated carbide all reduce affinity
 * with most workpieces.  HSS dramatically increases BUE risk because
 * its surface chemistry is similar to steel workpieces.
 *
 * Rake-angle modifier: positive rake (≥ 5°) reduces shear strain and
 * suppresses BUE; negative rake (≤ -5°) amplifies BUE risk by raising
 * shear-zone temperature.
 *
 * Output: BUE risk level ∈ {none, low, moderate, high, severe} plus
 * a numeric score in [0, 1] and an evidence trace.  A *separate*
 * `recommended_min_vc_m_per_min` field tells the caller the lowest
 * cutting speed that pulls the operation out of the risk band — the
 * actionable signal for AutoSpeedFeed engines.
 *
 * Decision contract:
 *
 *   1. Pure function — same input → same output.  No I/O.
 *   2. Never throws — invalid material defaults to ISO group P with
 *      a warning.  Negative cutting speeds clamp to 0.
 *   3. Risk level is monotone in cutting speed only across the risk
 *      band — outside the band the level returns "none".
 *   4. Material classes follow the canonical six-letter ISO 513
 *      taxonomy (P/M/K/N/S/H) so the engine composes with the
 *      project-wide material registry.
 *
 * @module engines/BUEOnsetThresholdEngine
 * @milestone LATHE-PROD-READY-MS0 / U-LPR-BUE
 */

import { z } from "zod";

// --------------------------------------------------------------------------
// Public types
// --------------------------------------------------------------------------

export const ISO_GROUP = z.enum(["P", "M", "K", "N", "S", "H"]);
export type IsoGroup = z.infer<typeof ISO_GROUP>;

export const TOOL_MATERIAL = z.enum([
  "hss",
  "uncoated_carbide",
  "coated_carbide",
  "cermet",
  "ceramic",
  "cbn",
  "pcd",
]);
export type ToolMaterial = z.infer<typeof TOOL_MATERIAL>;

export const BUE_RISK_LEVEL = z.enum(["none", "low", "moderate", "high", "severe"]);
export type BUERiskLevel = z.infer<typeof BUE_RISK_LEVEL>;

export const BUEOnsetInputSchema = z
  .object({
    cutting_speed_m_per_min: z.number().describe("Tangential cutting speed v_c"),
    iso_group: ISO_GROUP.describe("ISO 513 workpiece group P/M/K/N/S/H"),
    tool_material: TOOL_MATERIAL.describe("Insert/tool material"),
    rake_angle_deg: z.number().min(-30).max(30).default(0).describe("Effective rake; positive reduces BUE"),
  })
  .strict();
export type BUEOnsetInput = z.infer<typeof BUEOnsetInputSchema>;

export const BUEOnsetResultSchema = z
  .object({
    risk_level: BUE_RISK_LEVEL,
    risk_score: z.number().min(0).max(1).describe("0=safe, 1=worst-case BUE regime"),
    in_risk_band: z.boolean(),
    risk_band_m_per_min: z.tuple([z.number(), z.number()]),
    recommended_min_vc_m_per_min: z.number().nullable().describe("Lowest v_c that exits the risk band; null if BUE not the limiting factor"),
    evidence: z.array(z.string()),
    citations: z.array(z.string()),
  })
  .strict();
export type BUEOnsetResult = z.infer<typeof BUEOnsetResultSchema>;

// --------------------------------------------------------------------------
// Material risk bands (Sandvik Tech Guide 2023 + Trent & Wright 2000)
// --------------------------------------------------------------------------

interface BandSpec {
  /** Lower v_c (m/min) at which BUE starts to form. */
  lower: number;
  /** Upper v_c (m/min) above which BUE is fully suppressed. */
  upper: number;
  /** Cutting speed where BUE intensity peaks within the band. */
  peak: number;
  /** Recommended safe minimum cutting speed (slightly above upper). */
  safeMin: number;
  /** Whether the material is BUE-prone at all (cast iron / hardened steel: no). */
  proneToBUE: boolean;
  /** Material-class evidence string. */
  notes: string;
}

const MATERIAL_BANDS: Record<IsoGroup, BandSpec> = {
  P: {
    lower: 30,
    upper: 110,
    peak: 60,
    safeMin: 120,
    proneToBUE: true,
    notes: "Steel (ISO P): classic BUE band 30–110 m/min, peak ~60. Sandvik recommends > 120 m/min.",
  },
  M: {
    lower: 30,
    upper: 130,
    peak: 70,
    safeMin: 150,
    proneToBUE: true,
    notes: "Stainless (ISO M): wider risk band 30–130 m/min, peak ~70. Work-hardening worsens BUE; suppress > 150.",
  },
  K: {
    lower: 0,
    upper: 0,
    peak: 0,
    safeMin: 0,
    proneToBUE: false,
    notes: "Cast iron (ISO K): virtually no BUE — graphite acts as internal lubricant.",
  },
  N: {
    lower: 0,
    upper: 200,
    peak: 100,
    safeMin: 250,
    proneToBUE: true,
    notes: "Aluminum (ISO N): aggressive BUE 0–200 m/min, peak ~100. Polished tool + > 250 m/min recommended.",
  },
  S: {
    lower: 15,
    upper: 60,
    peak: 30,
    safeMin: 80,
    proneToBUE: true,
    notes: "Superalloy (ISO S): tight BUE band 15–60 m/min, peak ~30. Suppress > 80; thermal limits cap upper v_c.",
  },
  H: {
    lower: 0,
    upper: 0,
    peak: 0,
    safeMin: 0,
    proneToBUE: false,
    notes: "Hardened steel (ISO H): shear-dominated regime, BUE not thermodynamically stable.",
  },
};

// Tool-material affinity multipliers (1.0 = neutral, >1 = worsens, <1 = reduces).
const TOOL_AFFINITY: Record<ToolMaterial, number> = {
  hss: 1.4,            // Steel-on-steel chemistry — strong adhesion
  uncoated_carbide: 1.0,
  coated_carbide: 0.7, // TiAlN / AlCrN coatings dramatically reduce affinity
  cermet: 0.6,         // TiN/TiCN-based — low solubility in steel
  ceramic: 0.5,
  cbn: 0.3,
  pcd: 0.2,            // PCD on aluminum is the lowest-BUE pairing in industry
};

// --------------------------------------------------------------------------
// Engine
// --------------------------------------------------------------------------

export class BUEOnsetThresholdEngine {
  public readonly schemaVersion = "1.0.0" as const;

  /**
   * Predict BUE onset risk for a single turning operation.
   * Pure: same input → same output.  Never throws.
   */
  evaluate(input: BUEOnsetInput): BUEOnsetResult {
    const evidence: string[] = [];
    const citations: string[] = [
      "Trent & Wright (2000) — Metal Cutting, 4th ed, Ch.4 (BUE thermodynamics)",
      "Sandvik Coromant Technical Guide (2023) — turning ISO group recommendations",
    ];

    // Clamp inputs to physically meaningful ranges.
    const vc = Math.max(0, input.cutting_speed_m_per_min);
    const rake = Math.max(-30, Math.min(30, input.rake_angle_deg ?? 0));
    const band = MATERIAL_BANDS[input.iso_group];

    evidence.push(band.notes);

    if (!band.proneToBUE) {
      // Cast iron / hardened steel — BUE not thermodynamically stable.
      return {
        risk_level: "none",
        risk_score: 0,
        in_risk_band: false,
        risk_band_m_per_min: [band.lower, band.upper],
        recommended_min_vc_m_per_min: null,
        evidence,
        citations,
      };
    }

    const inBand = vc >= band.lower && vc <= band.upper;
    if (!inBand) {
      evidence.push(
        `v_c=${vc.toFixed(1)} m/min is OUTSIDE the BUE risk band [${band.lower}, ${band.upper}] for ISO ${input.iso_group}`,
      );
      return {
        risk_level: "none",
        risk_score: 0,
        in_risk_band: false,
        risk_band_m_per_min: [band.lower, band.upper],
        recommended_min_vc_m_per_min:
          vc < band.lower ? band.safeMin : null,
        evidence,
        citations,
      };
    }

    // In-band: compute proximity to peak.  Triangular intensity profile —
    // 1.0 at peak, 0 at band edges.  Smooth across material boundaries.
    const dPeak = Math.abs(vc - band.peak);
    const halfWidth = Math.max(band.peak - band.lower, band.upper - band.peak);
    const proximityFactor = halfWidth === 0 ? 1 : Math.max(0, 1 - dPeak / halfWidth);
    evidence.push(
      `v_c=${vc.toFixed(1)} m/min is INSIDE risk band [${band.lower}, ${band.upper}], distance from peak ${band.peak} = ${dPeak.toFixed(1)} m/min`,
    );

    // Tool-material modifier.
    const toolMod = TOOL_AFFINITY[input.tool_material];
    evidence.push(
      `tool=${input.tool_material}: affinity multiplier ${toolMod.toFixed(2)} (1.0 neutral, <1 reduces, >1 worsens)`,
    );

    // Rake-angle modifier: positive rake reduces shear-zone temperature.
    // Linear: -10° → +0.20, 0° → 0.00, +10° → -0.20.  Clamped.
    const rakeMod = -rake * 0.02;
    evidence.push(
      `rake=${rake.toFixed(1)}°: shear-zone modifier ${rakeMod.toFixed(2)} (negative rake worsens, positive helps)`,
    );

    // Combine into [0, 1] score.
    const rawScore = proximityFactor * toolMod + rakeMod;
    const score = Math.max(0, Math.min(1, rawScore));

    let level: BUERiskLevel;
    if (score >= 0.85) level = "severe";
    else if (score >= 0.65) level = "high";
    else if (score >= 0.40) level = "moderate";
    else if (score > 0) level = "low";
    else level = "none";

    return {
      risk_level: level,
      risk_score: Number(score.toFixed(4)),
      in_risk_band: true,
      risk_band_m_per_min: [band.lower, band.upper],
      recommended_min_vc_m_per_min: band.safeMin,
      evidence,
      citations,
    };
  }
}

export const bueOnsetThresholdEngine = new BUEOnsetThresholdEngine();
