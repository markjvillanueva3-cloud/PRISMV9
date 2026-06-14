/**
 * DrawingCapabilityTargetEngine — recommend Cpk target per drawing feature
 *
 * Closes the iter20 P1 "capability target per drawing" gap. Inverse of iter26
 * SPCPreControlEngine (which CHECKS Cpk against target); this RECOMMENDS the
 * target given the drawing tolerance class + feature criticality + industry sector.
 *
 * Cpk targets per AIAG SPC reference manual §1.3 + ISO 22514-2 §4 + IATF 16949 §9.1:
 *   - Production baseline:      Cpk ≥ 1.33  (~4σ)
 *   - Critical-to-quality:      Cpk ≥ 1.50  (~4.5σ)
 *   - Aerospace AS9102/AS9100:  Cpk ≥ 1.67  (~5σ)
 *   - Automotive PPAP Lvl 3:    Cpk ≥ 1.67  (PPAP-mandated)
 *   - Medical 21 CFR §820:      Cpk ≥ 2.00  (~6σ, FDA expects validated process)
 *   - Defense MIL-STD-1916:     Cpk ≥ 2.00  (zero-defect sampling)
 *
 * Sample size for capability study per AIAG SPC §1.3.5:
 *   - Minimum:     30 samples (initial estimate, wide CI)
 *   - Recommended: 100 samples (Ppk indices stable)
 *   - Validated:   125+ samples for medical/aerospace + bootstrapped CI
 *
 * Reference: AIAG SPC 2nd ed. §1.3 (capability indices); ISO 22514-2 (capability
 *   evaluation); IATF 16949 §9.1.1 (statistical techniques); AS9100D §8.5.1.2
 *   (production control); 21 CFR §820.75 (process validation); MIL-STD-1916.
 *
 * @version 1.0.0
 * @module DrawingCapabilityTargetEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type IndustrySector = "general" | "automotive" | "aerospace" | "medical" | "defense" | "consumer";
export type ToleranceClass = "iso2768_fine" | "iso2768_medium" | "iso2768_coarse" | "explicit" | "ks_critical" | "fai_required";
export type FeatureCriticality = "minor" | "major" | "critical" | "ks_safety";

export interface DrawingCapabilityInput {
  /** Industry sector — drives baseline Cpk floor */
  sector: IndustrySector;
  /** Feature criticality per ISO 2859 / AQL classification */
  feature_criticality: FeatureCriticality;
  /** Drawing tolerance class (explicit USL/LSL or ISO 2768 grade) */
  tolerance_class: ToleranceClass;
  /** Lower spec limit (mm or unit) — required for tolerance_class=explicit */
  lsl?: number;
  /** Upper spec limit */
  usl?: number;
  /** Whether part is on a Key Characteristic (KC) list (AS9102 Form 1 column 14) */
  is_key_characteristic?: boolean;
  /** Sample-size override (default per sector + criticality) */
  sample_size_override?: number;
}

export type CapabilityTier = "baseline" | "ctq" | "aerospace" | "ppap_l3" | "medical" | "defense";

export interface DrawingCapabilityResult {
  cpk_target: AtomicValue;
  tier: CapabilityTier;
  /** Sigma level corresponding to Cpk target (Cpk × 3) */
  sigma_level: AtomicValue;
  /** Minimum sample size for capability study */
  min_sample_size: AtomicValue<number>;
  /** Recommended subgroup size for X-bar/R chart (per AIAG SPC §2.5) */
  recommended_subgroup_size: AtomicValue<number>;
  /** Long-term Ppk gate (always ≤ Cpk, per AIAG SPC §1.3.3) */
  ppk_target: AtomicValue;
  /** True if FAI (First Article Inspection) is required */
  fai_required: boolean;
  rationale: string[];
  warnings: string[];
  source: string;
}

// Tier table — Cpk floors per (sector, criticality) — AIAG SPC §1.3 + ISO 22514
function selectTier(sector: IndustrySector, crit: FeatureCriticality, isKC: boolean): CapabilityTier {
  // KS = Key Safety / KC promotes upward
  const effCrit = isKC || crit === "ks_safety" ? "ks_safety" : crit;

  if (sector === "medical") return effCrit === "minor" ? "ctq" : "medical";
  if (sector === "defense") return effCrit === "minor" ? "ctq" : "defense";
  if (sector === "aerospace") return effCrit === "minor" ? "ctq" : "aerospace";
  if (sector === "automotive") return effCrit === "minor" ? "baseline" : "ppap_l3";
  if (effCrit === "ks_safety" || effCrit === "critical") return "ctq";
  return "baseline";
}

const TIER_CPK: Record<CapabilityTier, number> = {
  baseline: 1.33,
  ctq: 1.50,
  aerospace: 1.67,
  ppap_l3: 1.67,
  medical: 2.00,
  defense: 2.00,
};

export class DrawingCapabilityTargetEngine {
  recommend(input: DrawingCapabilityInput): DrawingCapabilityResult {
    if (!input || !input.sector || !input.feature_criticality || !input.tolerance_class) {
      throw new Error("DrawingCapabilityTargetEngine.recommend: sector + feature_criticality + tolerance_class required");
    }
    if (input.tolerance_class === "explicit" && (input.lsl == null || input.usl == null)) {
      throw new Error("DrawingCapabilityTargetEngine.recommend: explicit tolerance requires lsl + usl");
    }
    if (input.lsl !== undefined && input.usl !== undefined && input.lsl >= input.usl) {
      throw new Error("DrawingCapabilityTargetEngine.recommend: lsl must be < usl");
    }

    const rationale: string[] = [];
    const warnings: string[] = [];

    // ── Tier selection + Cpk floor ────────────────────────────────────
    const isKC = input.is_key_characteristic === true || input.tolerance_class === "ks_critical" || input.tolerance_class === "fai_required";
    const tier = selectTier(input.sector, input.feature_criticality, isKC);
    const cpkTarget = TIER_CPK[tier];
    rationale.push(`Tier '${tier}' selected from sector=${input.sector}, criticality=${input.feature_criticality}, isKC=${isKC}`);

    // ── Ppk gate (per AIAG SPC §1.3.3: Ppk ≤ Cpk always; spec PPAP-3 = 0.05 below) ──
    const ppkTarget = Number((cpkTarget - 0.05).toFixed(2));
    rationale.push(`Ppk target = Cpk - 0.05 = ${ppkTarget} (long-term variation allowance, AIAG SPC §1.3.3)`);

    // ── Sigma level (Cpk × 3 = sigma) ─────────────────────────────────
    const sigmaLevel = cpkTarget * 3;

    // ── Sample size (AIAG SPC §1.3.5) ─────────────────────────────────
    let sampleSize: number;
    if (input.sample_size_override !== undefined) {
      sampleSize = input.sample_size_override;
    } else if (tier === "medical" || tier === "defense") {
      sampleSize = 125;
      rationale.push("Sample size 125 — medical/defense process validation per 21 CFR §820.75 + MIL-STD-1916");
    } else if (tier === "aerospace" || tier === "ppap_l3") {
      sampleSize = 100;
      rationale.push("Sample size 100 — AIAG-recommended for Ppk stability");
    } else {
      sampleSize = 30;
      rationale.push("Sample size 30 — AIAG initial estimate; bump to 100 for production");
    }

    // ── Subgroup size (AIAG SPC §2.5: 4-5 typical for X-bar/R) ────────
    const subgroupSize = tier === "medical" || tier === "defense" ? 5 : 4;

    // ── FAI required? AS9102/AS9100 → always; PPAP-3 → always; KC → always ──
    const faiRequired = tier === "aerospace" || tier === "ppap_l3" || isKC || input.tolerance_class === "fai_required";

    // ── Warnings ──────────────────────────────────────────────────────
    if (tier === "medical" || tier === "defense") {
      warnings.push(`${tier} tier Cpk≥${cpkTarget} requires validated SPC + process FMEA + 21 CFR §820.75 OQ/PQ if medical`);
    }
    if (input.tolerance_class === "iso2768_coarse" && input.feature_criticality !== "minor") {
      warnings.push("ISO 2768 coarse class with non-minor criticality — verify designer intent; coarse class typically reserved for non-functional features");
    }
    if (input.sample_size_override !== undefined && input.sample_size_override < 30) {
      warnings.push(`Sample size ${input.sample_size_override} < 30 — capability estimate has wide CI (AIAG SPC §1.3.5)`);
    }

    return {
      cpk_target: {
        value: cpkTarget,
        unit: "Cpk",
        source: `tier ${tier} per AIAG SPC §1.3 + ISO 22514-2`,
      },
      tier,
      sigma_level: {
        value: Number(sigmaLevel.toFixed(2)),
        unit: "σ",
        source: "Cpk × 3 = sigma level",
      },
      min_sample_size: {
        value: sampleSize,
        unit: "samples",
        source: "AIAG SPC §1.3.5",
      },
      recommended_subgroup_size: {
        value: subgroupSize,
        unit: "samples/subgroup",
        source: "AIAG SPC §2.5 X-bar/R chart",
      },
      ppk_target: {
        value: ppkTarget,
        unit: "Ppk",
        source: "Cpk - 0.05 per AIAG SPC §1.3.3",
      },
      fai_required: faiRequired,
      rationale,
      warnings,
      source: "DrawingCapabilityTargetEngine — AIAG SPC §1.3 + ISO 22514-2 + IATF 16949 §9.1 + AS9100D §8.5 + 21 CFR §820.75 + MIL-STD-1916",
    };
  }
}

export const drawingCapabilityTargetEngine = new DrawingCapabilityTargetEngine();
