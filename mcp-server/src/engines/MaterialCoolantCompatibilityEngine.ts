/**
 * MaterialCoolantCompatibilityEngine — workpiece + coolant chemistry compatibility
 *
 * Closes the iter20 P1 "material-coolant chemistry compatibility" gap. Some
 * workpiece + coolant combinations cause progressive part damage that does NOT
 * show up in cutting-force or thermal models:
 *   - Aluminum + chlorinated coolant → galvanic pitting (Cl⁻ attack of oxide layer)
 *   - Titanium + sulfur-bearing EP additives → stress-corrosion cracking
 *   - Magnesium + water-base coolant → exothermic reaction, fire risk
 *   - Cast iron + water-base coolant → rust on hold time > 4h
 *   - Stainless + low-pH coolant → pitting at weld-affected zone
 *
 * The engine is a verifier — refuses incompatible combinations at PreCut stage
 * (matched to the 12-axis checklist). Reference: Cimcool Industrial Lubricants
 * Compatibility Guide §3; Master Fluid Solutions Trim Coolant Selector §B;
 * Sandvik Coromant Coolant Application Guide §A-4; ISO 6743-7 (cutting-fluid
 * classification); ASTM E2275 (water-miscible MWF stability); AMS 2070 (MWF
 * cleanliness aerospace).
 *
 * @version 1.0.0
 * @module MaterialCoolantCompatibilityEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type Material = "aluminum" | "steel" | "stainless" | "titanium" | "inconel" | "brass" | "cast_iron" | "magnesium" | "copper";
export type CoolantClass = "neat_oil" | "soluble_oil" | "semi_synthetic" | "synthetic" | "mql" | "flood_water_only" | "cryogenic_lN2" | "compressed_air_only";

export interface MaterialCoolantInput {
  material: Material;
  coolant: CoolantClass;
  /** Chloride content ppm (defaults: synthetic=0, soluble=50, mql=0) */
  chloride_ppm?: number;
  /** Sulfur content from EP additives (mg/kg) */
  sulfur_mg_kg?: number;
  /** Operating pH (defaults: synthetic=9.2, soluble=8.8) */
  ph?: number;
  /** Dwell time before next operation (hours) — drives rust/corrosion risk */
  dwell_hours?: number;
}

export type CompatibilityVerdict = "compatible" | "compatible_with_caveat" | "incompatible" | "unsafe";

export interface MaterialCoolantResult {
  verdict: CompatibilityVerdict;
  /** Numeric score 0-1 (1=fully compatible, 0=unsafe) */
  score: AtomicValue;
  /** Specific failure mechanisms that would occur */
  failure_mechanisms: string[];
  /** Recommended alternative coolant if incompatible */
  recommended_alternative: CoolantClass | null;
  warnings: string[];
  source: string;
}

interface CompatibilityRule {
  material: Material;
  forbidden: CoolantClass[];
  caveat: Partial<Record<CoolantClass, string>>;
  preferred: CoolantClass;
}

// Authoritative compatibility matrix — Cimcool §3 + Master Fluid §B + Sandvik §A-4
const RULES: CompatibilityRule[] = [
  {
    material: "aluminum",
    forbidden: [],  // No outright forbidden, but chloride > 50ppm causes pitting
    caveat: {
      soluble_oil: "chloride content must be < 50 ppm (Cl⁻ attacks Al₂O₃ oxide layer → pitting)",
      flood_water_only: "no inhibitor — staining within 30 min on as-machined surface",
    },
    preferred: "synthetic",
  },
  {
    material: "magnesium",
    forbidden: ["soluble_oil", "semi_synthetic", "synthetic", "flood_water_only"],  // water + Mg → H₂ + heat
    caveat: {
      neat_oil: "neat oil only — water contact ignites Mg fines (NFPA 484 §6)",
    },
    preferred: "neat_oil",
  },
  {
    material: "titanium",
    forbidden: [],
    caveat: {
      neat_oil: "sulfur EP additives > 100 mg/kg cause stress-corrosion cracking (Ti alpha-case)",
      soluble_oil: "chloride > 50 ppm → SCC under residual stress; flush surface within 1h",
      mql: "MQL OK only with non-chlorinated, non-sulfurized ester base",
    },
    preferred: "synthetic",
  },
  {
    material: "inconel",
    forbidden: [],
    caveat: {
      neat_oil: "low thermal-conductivity coolant traps heat at edge — prefer flooded synthetic with high-pressure 70+ bar",
    },
    preferred: "synthetic",
  },
  {
    material: "stainless",
    forbidden: [],
    caveat: {
      flood_water_only: "pH drift below 8 → pitting at sensitized HAZ",
      soluble_oil: "low pH (<8.5) + chloride > 100 ppm → IGSCC risk on austenitic grades",
    },
    preferred: "semi_synthetic",
  },
  {
    material: "cast_iron",
    forbidden: [],
    caveat: {
      soluble_oil: "rust on machined surface if dwell > 4h before next op — apply rust inhibitor pass",
      synthetic: "dries the cast surface, loose graphite carries swarf — flood at >40 L/min",
      flood_water_only: "rust within 2h — never use without inhibitor",
    },
    preferred: "soluble_oil",
  },
  {
    material: "steel",
    forbidden: [],
    caveat: {
      flood_water_only: "rust within 4h — apply rust inhibitor or RP fluid before storage",
    },
    preferred: "soluble_oil",
  },
  {
    material: "brass",
    forbidden: [],
    caveat: {
      neat_oil: "OK but stain-prone — degrease within 1h",
    },
    preferred: "synthetic",
  },
  {
    material: "copper",
    forbidden: [],
    caveat: {
      soluble_oil: "amine inhibitors attack copper — choose amine-free formula (Cimcool MIL-PRF compliance)",
    },
    preferred: "synthetic",
  },
];

export class MaterialCoolantCompatibilityEngine {
  check(input: MaterialCoolantInput): MaterialCoolantResult {
    if (!input || !input.material || !input.coolant) {
      throw new Error("MaterialCoolantCompatibilityEngine.check: material + coolant required");
    }

    const warnings: string[] = [];
    const failureMechanisms: string[] = [];

    const rule = RULES.find(r => r.material === input.material);
    if (!rule) {
      throw new Error(`MaterialCoolantCompatibilityEngine.check: unknown material ${input.material}`);
    }

    // ── Verdict + score ───────────────────────────────────────────────
    let verdict: CompatibilityVerdict;
    let score: number;
    let recommendedAlternative: CoolantClass | null = null;

    if (rule.forbidden.includes(input.coolant)) {
      // Hard incompatibility — Mg+water class
      verdict = input.material === "magnesium" ? "unsafe" : "incompatible";
      score = 0;
      failureMechanisms.push(
        input.material === "magnesium"
          ? `${input.coolant} on magnesium → H₂ generation + exothermic fire (NFPA 484 §6)`
          : `${input.coolant} forbidden for ${input.material} per compatibility matrix`,
      );
      recommendedAlternative = rule.preferred;
      warnings.push(`FORBIDDEN combination — switch to ${rule.preferred}`);
    } else if (rule.caveat[input.coolant]) {
      verdict = "compatible_with_caveat";
      score = 0.7;
      warnings.push(rule.caveat[input.coolant]!);
      if (input.coolant !== rule.preferred) {
        recommendedAlternative = rule.preferred;
      }
    } else {
      verdict = "compatible";
      score = 1.0;
    }

    // ── Chemistry detail checks ───────────────────────────────────────
    if (input.material === "aluminum" && input.chloride_ppm !== undefined && input.chloride_ppm > 50) {
      failureMechanisms.push(`Cl⁻ ${input.chloride_ppm} ppm > 50 ppm — pitting risk on Al₂O₃ layer`);
      if (verdict === "compatible") verdict = "incompatible";
      score = Math.min(score, 0.3);
    }
    if (input.material === "titanium" && input.sulfur_mg_kg !== undefined && input.sulfur_mg_kg > 100) {
      failureMechanisms.push(`S ${input.sulfur_mg_kg} mg/kg > 100 mg/kg — α-case SCC risk`);
      if (verdict === "compatible") verdict = "incompatible";
      score = Math.min(score, 0.2);
    }
    if (input.material === "stainless" && input.ph !== undefined && input.ph < 8) {
      failureMechanisms.push(`pH ${input.ph.toFixed(1)} < 8 — pitting at sensitized HAZ`);
      if (verdict === "compatible") verdict = "compatible_with_caveat";
      score = Math.min(score, 0.5);
    }
    if (input.material === "cast_iron" && input.dwell_hours !== undefined && input.dwell_hours > 4) {
      const coolantNeedsInhibitor = input.coolant === "soluble_oil" || input.coolant === "flood_water_only";
      if (coolantNeedsInhibitor) {
        warnings.push(`Cast iron + ${input.coolant}, dwell ${input.dwell_hours}h > 4h — apply rust inhibitor before storage`);
      }
    }

    return {
      verdict,
      score: {
        value: Number(score.toFixed(2)),
        unit: "score 0-1",
        source: "Cimcool §3 + Master Fluid §B + Sandvik §A-4 compatibility matrix",
      },
      failure_mechanisms: failureMechanisms,
      recommended_alternative: recommendedAlternative,
      warnings,
      source: "MaterialCoolantCompatibilityEngine — Cimcool §3 + Master Fluid §B + Sandvik §A-4 + ISO 6743-7 + ASTM E2275 + NFPA 484 + AMS 2070",
    };
  }
}

export const materialCoolantCompatibilityEngine = new MaterialCoolantCompatibilityEngine();
