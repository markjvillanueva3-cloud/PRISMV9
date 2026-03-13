/**
 * ChipMorphologyDiagnosticEngine — Chip Form Classification & Process Health Diagnostics
 *
 * Predicts and classifies chip morphology from cutting conditions, then diagnoses
 * process health from observed chip characteristics.
 *
 * Chip types (ISO 3685 classification):
 * 1. Continuous (ribbon/snarled) — ductile materials, high rake, low feed
 * 2. Continuous with BUE — low speed, carbon steel, adhesion
 * 3. Segmented (saw-tooth) — titanium, Inconel, hardened steel, adiabatic shear
 * 4. Discontinuous — cast iron, brass, brittle materials, high feed
 * 5. Elemental — very brittle, extreme negative rake
 *
 * Models:
 * - Merchant's minimum energy: φ = π/4 - β/2 + α/2
 * - Lee-Shaffer: φ = π/4 - β + α
 * - Chip compression ratio: rc = t1/t2 = sin(φ)/cos(φ-α)
 * - Shear strain: γ = cos(α)/[sin(φ)cos(φ-α)]
 * - Chip curl radius: ρ = t2/(1 + t2·κ_thermal)
 * - Recht's adiabatic shear criterion: dτ/dT < dτ/dγ (segmentation onset)
 *
 * References:
 * - Merchant (1945): Mechanics of Metal Cutting Process
 * - Lee & Shaffer (1951): Theory of Plasticity Applied to Machining
 * - Recht (1964): Catastrophic thermoplastic shear (segmented chips)
 * - Shaw (2005): Metal Cutting Principles, Ch. 6-8
 *
 * Actions: chip_diagnose (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type ChipType =
  | "continuous" | "continuous_bue" | "segmented"
  | "discontinuous" | "elemental";

export type ChipShape =
  | "ribbon" | "snarled" | "tubular" | "helical"
  | "spiral" | "arc" | "comma" | "needle";

export interface ChipDiagnoseInput {
  // Cutting conditions
  cutting_speed_mmin: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  rake_angle_deg: number;

  // Material properties
  material_type: "steel" | "stainless" | "aluminum" | "titanium"
    | "inconel" | "cast_iron" | "brass" | "copper" | "plastic";
  hardness_hrc?: number;
  elongation_pct?: number;     // ductility indicator

  // Optional observed chip data
  observed_chip_color?: "silver" | "golden" | "blue" | "purple" | "brown" | "black";
  observed_chip_shape?: ChipShape;
  chip_breaker_present?: boolean;
  coolant_applied?: boolean;
}

export interface ChipPrediction {
  predicted_type: ChipType;
  predicted_shape: ChipShape;
  confidence_pct: number;
  shear_angle_deg: number;        // φ (Merchant)
  chip_compression_ratio: number;  // rc = t1/t2
  shear_strain: number;            // γ
  chip_thickness_mm: number;       // t2
  segmentation_risk: "low" | "medium" | "high";
}

export interface ProcessDiagnosis {
  health: "good" | "acceptable" | "warning" | "critical";
  issues: string[];
  recommendations: string[];
  temperature_estimate_C: number;  // from chip color
}

export interface ChipDiagnoseResult {
  prediction: ChipPrediction;
  diagnosis: ProcessDiagnosis;
  merchant_shear_deg: number;
  lee_shaffer_shear_deg: number;
  formula: string;
  warnings: string[];
}

// ── Material Properties ────────────────────────────────────────────────────

interface MaterialProps {
  friction_coeff: number;     // µ at tool-chip interface
  elongation_pct: number;     // typical ductility
  thermal_softening: number;  // rate of softening (high = prone to segmentation)
  bue_prone: boolean;
  typical_hardness_hrc: number;
}

const MAT_PROPS: Record<string, MaterialProps> = {
  steel:      { friction_coeff: 0.5, elongation_pct: 25, thermal_softening: 0.4, bue_prone: true, typical_hardness_hrc: 25 },
  stainless:  { friction_coeff: 0.6, elongation_pct: 40, thermal_softening: 0.5, bue_prone: true, typical_hardness_hrc: 22 },
  aluminum:   { friction_coeff: 0.4, elongation_pct: 20, thermal_softening: 0.3, bue_prone: true, typical_hardness_hrc: 10 },
  titanium:   { friction_coeff: 0.55, elongation_pct: 14, thermal_softening: 0.8, bue_prone: false, typical_hardness_hrc: 36 },
  inconel:    { friction_coeff: 0.6, elongation_pct: 30, thermal_softening: 0.9, bue_prone: false, typical_hardness_hrc: 40 },
  cast_iron:  { friction_coeff: 0.35, elongation_pct: 3, thermal_softening: 0.2, bue_prone: false, typical_hardness_hrc: 20 },
  brass:      { friction_coeff: 0.3, elongation_pct: 15, thermal_softening: 0.3, bue_prone: false, typical_hardness_hrc: 12 },
  copper:     { friction_coeff: 0.5, elongation_pct: 35, thermal_softening: 0.3, bue_prone: true, typical_hardness_hrc: 8 },
  plastic:    { friction_coeff: 0.25, elongation_pct: 50, thermal_softening: 0.1, bue_prone: false, typical_hardness_hrc: 0 },
};

// ── Chip color → temperature mapping ───────────────────────────────────────

const COLOR_TEMP: Record<string, number> = {
  silver: 200, golden: 300, blue: 400, purple: 450, brown: 500, black: 600,
};

// ── Engine ──────────────────────────────────────────────────────────────────

export class ChipMorphologyDiagnosticEngine {
  /** Merchant minimum energy: φ = π/4 - β/2 + α/2 where β = atan(µ). */
  merchantShearAngle(rakeAngleDeg: number, frictionCoeff: number): number {
    const alpha = rakeAngleDeg * Math.PI / 180;
    const beta = Math.atan(frictionCoeff);
    const phi = Math.PI / 4 - beta / 2 + alpha / 2;
    return Math.max(5, Math.min(45, phi * 180 / Math.PI));
  }

  /** Lee-Shaffer: φ = π/4 - β + α. */
  leeShafferShearAngle(rakeAngleDeg: number, frictionCoeff: number): number {
    const alpha = rakeAngleDeg * Math.PI / 180;
    const beta = Math.atan(frictionCoeff);
    const phi = Math.PI / 4 - beta + alpha;
    return Math.max(5, Math.min(45, phi * 180 / Math.PI));
  }

  /** Chip compression ratio: rc = sin(φ) / cos(φ - α). */
  chipCompressionRatio(shearAngleDeg: number, rakeAngleDeg: number): number {
    const phi = shearAngleDeg * Math.PI / 180;
    const alpha = rakeAngleDeg * Math.PI / 180;
    const denom = Math.cos(phi - alpha);
    if (Math.abs(denom) < 1e-10) return 1;
    return Math.sin(phi) / denom;
  }

  /** Shear strain: γ = cos(α) / [sin(φ) · cos(φ - α)]. */
  shearStrain(shearAngleDeg: number, rakeAngleDeg: number): number {
    const phi = shearAngleDeg * Math.PI / 180;
    const alpha = rakeAngleDeg * Math.PI / 180;
    const denom = Math.sin(phi) * Math.cos(phi - alpha);
    if (Math.abs(denom) < 1e-10) return 0;
    return Math.cos(alpha) / denom;
  }

  /** Predict chip type from material + cutting conditions. */
  predictChipType(input: ChipDiagnoseInput): ChipPrediction {
    const mat = MAT_PROPS[input.material_type] ?? MAT_PROPS.steel;
    const elong = input.elongation_pct ?? mat.elongation_pct;
    const hrc = input.hardness_hrc ?? mat.typical_hardness_hrc;

    const phiMerchant = this.merchantShearAngle(
      input.rake_angle_deg, mat.friction_coeff,
    );
    const rc = this.chipCompressionRatio(phiMerchant, input.rake_angle_deg);
    const gamma = this.shearStrain(phiMerchant, input.rake_angle_deg);
    const t2 = input.feed_mm_rev / rc;

    // Classify chip type
    let chipType: ChipType;
    let chipShape: ChipShape;
    let confidence = 75;
    let segRisk: "low" | "medium" | "high" = "low";

    // Recht's criterion: high thermal softening + low thermal conductivity
    const rechtScore = mat.thermal_softening * (1 + hrc / 60);

    if (elong < 5) {
      // Brittle material
      chipType = input.rake_angle_deg < -10 ? "elemental" : "discontinuous";
      chipShape = "comma";
      confidence = 85;
    } else if (rechtScore > 0.7 && input.cutting_speed_mmin > 30) {
      // Adiabatic shear → segmented
      chipType = "segmented";
      chipShape = "arc";
      segRisk = "high";
      confidence = 80;
    } else if (mat.bue_prone && input.cutting_speed_mmin < 50
      && input.feed_mm_rev > 0.1 && !input.coolant_applied) {
      // BUE zone
      chipType = "continuous_bue";
      chipShape = "snarled";
      confidence = 70;
    } else if (elong > 15 && input.rake_angle_deg > 0) {
      // Ductile + positive rake → continuous
      chipType = "continuous";
      if (input.chip_breaker_present) {
        chipShape = input.feed_mm_rev > 0.15 ? "helical" : "spiral";
      } else {
        chipShape = input.feed_mm_rev > 0.2 ? "ribbon" : "tubular";
      }
      confidence = 82;
      segRisk = rechtScore > 0.5 ? "medium" : "low";
    } else {
      // Moderate ductility
      chipType = input.feed_mm_rev > 0.3 ? "discontinuous" : "continuous";
      chipShape = input.chip_breaker_present ? "spiral" : "helical";
      confidence = 65;
      segRisk = rechtScore > 0.5 ? "medium" : "low";
    }

    return {
      predicted_type: chipType,
      predicted_shape: chipShape,
      confidence_pct: confidence,
      shear_angle_deg: phiMerchant,
      chip_compression_ratio: rc,
      shear_strain: gamma,
      chip_thickness_mm: t2,
      segmentation_risk: segRisk,
    };
  }

  /** Diagnose process health from observed chip characteristics. */
  diagnoseFromObservation(input: ChipDiagnoseInput): ProcessDiagnosis {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let health: "good" | "acceptable" | "warning" | "critical" = "good";

    // Temperature from chip color
    const tempEst = input.observed_chip_color
      ? COLOR_TEMP[input.observed_chip_color] ?? 300
      : 300;

    // Color-based diagnostics
    if (input.observed_chip_color === "blue" || input.observed_chip_color === "purple") {
      issues.push("Chip color indicates temperatures 400-450°C — possible thermal damage");
      recommendations.push("Increase coolant flow or reduce cutting speed by 15-20%");
      health = "warning";
    }
    if (input.observed_chip_color === "black") {
      issues.push("Black chips indicate burning (>600°C) — workpiece damage likely");
      recommendations.push("Reduce speed immediately, check tool wear, verify coolant");
      health = "critical";
    }

    // Shape-based diagnostics
    if (input.observed_chip_shape === "ribbon" || input.observed_chip_shape === "snarled") {
      issues.push("Long continuous chips — entanglement risk, poor chip evacuation");
      recommendations.push("Add chip breaker geometry or increase feed rate");
      if (health === "good") health = "acceptable";
    }
    if (input.observed_chip_shape === "needle") {
      issues.push("Needle chips — overtightened chip breaker or excessive depth of cut");
      recommendations.push("Reduce depth of cut or widen chip breaker groove");
      if (health === "good") health = "acceptable";
    }

    // Speed/material specific
    const mat = MAT_PROPS[input.material_type] ?? MAT_PROPS.steel;
    if (mat.bue_prone && input.cutting_speed_mmin < 40 && !input.coolant_applied) {
      issues.push("BUE risk: low speed + no coolant on BUE-prone material");
      recommendations.push("Increase speed above 60 m/min or apply coolant");
      if (health === "good") health = "acceptable";
    }

    if (input.material_type === "titanium" && input.cutting_speed_mmin > 80) {
      issues.push("Titanium at high speed: severe tool wear and segmented chip risk");
      recommendations.push("Reduce to 40-60 m/min, use high-pressure coolant");
      health = health === "good" ? "warning" : health;
    }

    if (issues.length === 0) {
      recommendations.push("Process appears healthy — monitor chip form periodically");
    }

    return { health, issues, recommendations, temperature_estimate_C: tempEst };
  }

  /** Main entry — predict chip morphology and diagnose process. */
  diagnose(input: ChipDiagnoseInput): ChipDiagnoseResult {
    const warnings: string[] = [];
    const prediction = this.predictChipType(input);
    const diagnosis = this.diagnoseFromObservation(input);

    const mat = MAT_PROPS[input.material_type] ?? MAT_PROPS.steel;
    const phiLS = this.leeShafferShearAngle(
      input.rake_angle_deg, mat.friction_coeff,
    );

    if (Math.abs(prediction.shear_angle_deg - phiLS) > 10) {
      warnings.push(
        `Merchant (${prediction.shear_angle_deg.toFixed(1)}°) and Lee-Shaffer ` +
        `(${phiLS.toFixed(1)}°) differ by >10° — use Merchant as primary`,
      );
    }

    return {
      prediction,
      diagnosis,
      merchant_shear_deg: prediction.shear_angle_deg,
      lee_shaffer_shear_deg: phiLS,
      formula: "Merchant: φ=π/4-β/2+α/2; Lee-Shaffer: φ=π/4-β+α; " +
        "rc=sin(φ)/cos(φ-α); γ=cos(α)/[sin(φ)cos(φ-α)]; " +
        "Recht: dτ/dT < dτ/dγ → segmentation",
      warnings,
    };
  }
}

export const chipMorphologyDiagnosticEngine = new ChipMorphologyDiagnosticEngine();
