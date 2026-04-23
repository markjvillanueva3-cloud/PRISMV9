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

  /**
   * Piispanen card model — idealized shear strain in chip formation.
   * Models chip as a deck of cards sliding along the shear plane.
   * γ = cos(α) / (sin(φ) · cos(φ - α))
   * Reference: Piispanen (1937), "Theory of Formation of Metal Chips"
   */
  piispanenShearStrain(input: {
    shear_angle_deg: number;
    rake_angle_deg: number;
  }): {
    shear_strain: { value: number; unit: string; source: string };
    chip_thickness_ratio: { value: number; unit: string; source: string };
    velocity_ratio: { value: number; unit: string; source: string };
    note: string;
  } {
    const phi = input.shear_angle_deg * Math.PI / 180;
    const alpha = input.rake_angle_deg * Math.PI / 180;

    const sinPhi = Math.sin(phi);
    const cosAlpha = Math.cos(alpha);
    const cosPhiMinusAlpha = Math.cos(phi - alpha);

    const denom = sinPhi * cosPhiMinusAlpha;
    const gamma = Math.abs(denom) > 1e-12
      ? cosAlpha / denom
      : 0;

    // chip thickness ratio r = sin(φ) / cos(φ - α)
    const r = Math.abs(cosPhiMinusAlpha) > 1e-12
      ? sinPhi / cosPhiMinusAlpha
      : 1;

    return {
      shear_strain: {
        value: Number(gamma.toFixed(4)),
        unit: "dimensionless",
        source: "Piispanen (1937): γ = cos(α) / (sin(φ)·cos(φ-α))",
      },
      chip_thickness_ratio: {
        value: Number(r.toFixed(4)),
        unit: "dimensionless",
        source: "r = sin(φ) / cos(φ - α); ratio of uncut to cut chip thickness",
      },
      velocity_ratio: {
        value: Number(r.toFixed(4)),
        unit: "dimensionless",
        source: "V_chip / V_cutting = r (chip thickens by same ratio it slows)",
      },
      note:
        "Piispanen's deck-of-cards analogy: the workpiece material shears like " +
        "a stack of inclined cards sliding over each other along the shear plane. " +
        `φ=${input.shear_angle_deg.toFixed(1)}°, α=${input.rake_angle_deg.toFixed(1)}°. ` +
        "Higher rake angle (α) reduces shear strain; steeper shear plane (φ) reduces strain.",
    };
  }

  /**
   * Zorev stress distribution on tool rake face.
   * Normal stress σ(x) = σ_max × (1 - x/lc)^n  (exponential decay from cutting edge)
   * Shear stress: sticking zone (τ = τ_s) near edge, sliding zone (τ = μ·σ) further out.
   * Reference: Zorev (1963), "Inter-relationship between shear processes on tool face and flank"
   */
  zorevStressDistribution(input: {
    normal_force_N: number;
    contact_length_mm: number;
    chip_width_mm: number;
    shear_yield_stress_MPa: number;
    friction_coefficient: number;
    n_exponent?: number;
    num_points?: number;
  }): {
    sticking_length_mm: { value: number; unit: string; source: string };
    sliding_length_mm: { value: number; unit: string; source: string };
    max_normal_stress_MPa: { value: number; unit: string; source: string };
    stress_profile: Array<{ x_mm: number; sigma_MPa: number; tau_MPa: number; zone: string }>;
    crater_wear_risk: string;
    note: string;
  } {
    const {
      normal_force_N,
      contact_length_mm,
      chip_width_mm,
      shear_yield_stress_MPa,
      friction_coefficient,
      n_exponent = 2,
      num_points = 20,
    } = input;

    const lc = contact_length_mm;
    const area = lc * chip_width_mm; // mm²  →  convert force to MPa

    // σ_max from integral: ∫₀^lc σ_max·(1-x/lc)^n dx = F_n / w
    // = σ_max · lc / (n+1)  →  σ_max = (n+1)·F_n / (lc·w)
    const sigma_max = ((n_exponent + 1) * normal_force_N) / area;

    // Sticking zone boundary: τ_s = μ·σ(x) → σ(x) = τ_s/μ
    // σ_max·(1 - x_p/lc)^n = τ_s/μ → x_p = lc·(1 - (τ_s/(μ·σ_max))^(1/n))
    const tau_s = shear_yield_stress_MPa;
    const mu = friction_coefficient;
    let l_p = 0;
    if (sigma_max > 0 && mu > 0) {
      const ratio = tau_s / (mu * sigma_max);
      l_p = ratio < 1
        ? lc * (1 - Math.pow(ratio, 1 / n_exponent))
        : 0;
    }
    l_p = Math.max(0, Math.min(l_p, lc));
    const l_sliding = lc - l_p;

    // Build stress profile
    const stress_profile: Array<{ x_mm: number; sigma_MPa: number; tau_MPa: number; zone: string }> = [];
    for (let i = 0; i < num_points; i++) {
      const x = (i / (num_points - 1)) * lc;
      const factor = Math.pow(Math.max(0, 1 - x / lc), n_exponent);
      const sigma = sigma_max * factor;
      const zone = x <= l_p ? "sticking" : "sliding";
      const tau = zone === "sticking" ? tau_s : mu * sigma;
      stress_profile.push({
        x_mm: Number(x.toFixed(4)),
        sigma_MPa: Number(sigma.toFixed(2)),
        tau_MPa: Number(tau.toFixed(2)),
        zone,
      });
    }

    // Crater wear risk based on peak normal stress vs typical threshold (~1000 MPa)
    let crater_wear_risk: string;
    if (sigma_max > 1500) crater_wear_risk = "high";
    else if (sigma_max > 800) crater_wear_risk = "moderate";
    else crater_wear_risk = "low";

    return {
      sticking_length_mm: {
        value: Number(l_p.toFixed(4)),
        unit: "mm",
        source: `Zorev sticking zone: x_p = lc·(1-(τ_s/(μ·σ_max))^(1/n)) = ${l_p.toFixed(3)} mm`,
      },
      sliding_length_mm: {
        value: Number(l_sliding.toFixed(4)),
        unit: "mm",
        source: `Sliding zone = lc - l_p = ${l_sliding.toFixed(3)} mm`,
      },
      max_normal_stress_MPa: {
        value: Number(sigma_max.toFixed(2)),
        unit: "MPa",
        source: `σ_max = (n+1)·F_n/(lc·w) = (${n_exponent + 1}·${normal_force_N})/(${lc}·${chip_width_mm}) = ${sigma_max.toFixed(1)} MPa`,
      },
      stress_profile,
      crater_wear_risk,
      note:
        "Zorev model: stress peaks at the cutting edge (x=0) and decays toward tool tip (x=lc). " +
        "Near the edge the chip is seized (sticking friction, τ=τ_s); further out it slides (τ=μσ). " +
        "Maximum normal stress drives crater wear at ~0.3–0.5 lc from edge. " +
        `σ_max=${sigma_max.toFixed(0)} MPa, sticking zone=${l_p.toFixed(3)} mm (${((l_p / lc) * 100).toFixed(0)}% of contact).`,
    };
  }

  /**
   * Okushima-Hitomi thick shear zone model.
   * Unlike Merchant's idealized thin plane, models shear zone as having finite thickness δ.
   * Strain rate: γ̇ = V_s / δ. More accurate for ductile materials with large shear zones.
   * Reference: Okushima & Hitomi (1961)
   */
  thickShearZone(input: {
    cutting_speed_mpm: number;
    shear_angle_deg: number;
    rake_angle_deg: number;
    zone_thickness_mm?: number;
    feed_mm?: number;
  }): {
    shear_velocity_mps: { value: number; unit: string; source: string };
    strain_rate_per_s: { value: number; unit: string; source: string };
    shear_strain: { value: number; unit: string; source: string };
    zone_thickness_mm: { value: number; unit: string; source: string };
    thin_vs_thick_comparison: string;
    note: string;
  } {
    const {
      cutting_speed_mpm,
      shear_angle_deg,
      rake_angle_deg,
      feed_mm,
    } = input;

    const phi = shear_angle_deg * Math.PI / 180;
    const alpha = rake_angle_deg * Math.PI / 180;

    // Shear velocity: V_s = V_c · cos(α) / cos(φ - α)
    const V_c_mps = cutting_speed_mpm / 60;
    const cosPhiMinusAlpha = Math.cos(phi - alpha);
    const V_s = Math.abs(cosPhiMinusAlpha) > 1e-12
      ? V_c_mps * Math.cos(alpha) / cosPhiMinusAlpha
      : V_c_mps;

    // Zone thickness: use provided value or estimate δ ≈ 0.1 × feed (ductile metals rule of thumb)
    let delta_mm: number;
    let delta_source: string;
    if (input.zone_thickness_mm !== undefined && input.zone_thickness_mm > 0) {
      delta_mm = input.zone_thickness_mm;
      delta_source = "user-provided measured zone thickness";
    } else if (feed_mm !== undefined && feed_mm > 0) {
      delta_mm = 0.1 * feed_mm;
      delta_source = `Estimated: δ ≈ 0.1 × feed = 0.1 × ${feed_mm} = ${delta_mm.toFixed(4)} mm (ductile metal rule of thumb)`;
    } else {
      delta_mm = 0.05; // default 50 µm
      delta_source = "Default δ = 0.05 mm (typical ductile machining; provide feed_mm for auto-estimate)";
    }

    const delta_m = delta_mm / 1000; // convert to metres
    const strain_rate = V_s / delta_m; // s⁻¹

    // Shear strain (same formula as Piispanen — context differs; Merchant thin-plane gives same γ)
    const sinPhi = Math.sin(phi);
    const denom = sinPhi * cosPhiMinusAlpha;
    const gamma = Math.abs(denom) > 1e-12
      ? Math.cos(alpha) / denom
      : 0;

    // Thin-plane model gives infinite strain rate (δ→0); thick model gives finite value
    const thin_label = strain_rate > 1e5
      ? "very high (>10⁵ /s) — verify zone thickness"
      : strain_rate > 1e4
        ? "high (10⁴–10⁵ /s) — typical for metals"
        : "moderate (<10⁴ /s) — soft/ductile material or large shear zone";

    return {
      shear_velocity_mps: {
        value: Number(V_s.toFixed(4)),
        unit: "m/s",
        source: `V_s = V_c·cos(α)/cos(φ-α) = ${V_c_mps.toFixed(3)}·cos(${rake_angle_deg}°)/cos(${(shear_angle_deg - rake_angle_deg).toFixed(1)}°)`,
      },
      strain_rate_per_s: {
        value: Number(strain_rate.toFixed(1)),
        unit: "s⁻¹",
        source: `γ̇ = V_s / δ = ${V_s.toFixed(4)} m/s / ${delta_m.toFixed(6)} m = ${strain_rate.toFixed(0)} /s`,
      },
      shear_strain: {
        value: Number(gamma.toFixed(4)),
        unit: "dimensionless",
        source: "γ = cos(α) / (sin(φ)·cos(φ-α)) — same as Piispanen; thick model adds finite δ context",
      },
      zone_thickness_mm: {
        value: Number(delta_mm.toFixed(4)),
        unit: "mm",
        source: delta_source,
      },
      thin_vs_thick_comparison:
        `Merchant thin-plane: δ→0, γ̇→∞ (unphysical). ` +
        `Okushima-Hitomi thick zone: δ=${delta_mm.toFixed(3)} mm → γ̇=${strain_rate.toFixed(0)} /s (${thin_label}). ` +
        `Typical machining strain rates: 10³–10⁵ /s.`,
      note:
        `Thick shear zone model accounts for the finite width of the plastic zone in real cutting. ` +
        `V_s=${V_s.toFixed(3)} m/s, δ=${delta_mm.toFixed(3)} mm, γ̇=${strain_rate.toFixed(0)} /s. ` +
        `Shear strain γ=${gamma.toFixed(3)} is independent of zone thickness — it depends only on ` +
        `geometry (φ, α). Zone thickness affects only strain RATE, which drives thermal generation and ` +
        `tool wear at the shear plane.`,
    };
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
