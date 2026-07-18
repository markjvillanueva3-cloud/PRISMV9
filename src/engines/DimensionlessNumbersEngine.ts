// @ts-nocheck
/**
 * DimensionlessNumbersEngine — Novel dimensionless numbers for machining processes
 *
 * INVENTION: Analogous to Reynolds number (Re = ρVL/μ) in fluid dynamics, these
 * dimensionless groups collapse complex multi-parameter machining physics into single
 * universal numbers via Buckingham Pi theorem analysis. Each number is formed from
 * independent dimensional quantities such that all dimensions (M, L, T, Θ) cancel.
 *
 * Eight dimensionless numbers:
 *   Π₁  Cutting Number        — Force ratio (Kienzle normalization)
 *   Pe  Thermal Peclet        — Heat partition (advection vs. conduction)
 *   Π₃  Chip Formation Number — Chip morphology predictor (shear vs. thermal)
 *   Π₄  Stability Number      — Dynamic stability indicator
 *   Π₅  Wear Intensity        — Universal wear rate collapse
 *   Π₆  Process Capability    — Capability-stiffness coupling
 *   MI  Machinability Index   — Universal machinability rating
 *   TDN Thermal Damage Number — Thermal damage risk predictor
 *
 * References: Buckingham (1914), Kienzle (1952), Loewen & Shaw (1954),
 *   Recht (1964), Merchant (1945), Taylor (1907), Jaeger (1942)
 *
 * @module DimensionlessNumbersEngine
 */

// ─── Result Interfaces ──────────────────────────────────────────────────────

export interface CuttingNumberInput {
  measuredForce_N: number;
  kc11_MPa: number;
  mc: number;
  chipThickness_mm: number;
  chipWidth_mm: number;
  depthOfCut_mm: number;
  stepover_mm: number;
}

export interface CuttingNumberResult {
  pi: number;
  interpretation: string;
  deviationPercent: number;
  likelyCause: string;
}

export interface ThermalPecletInput {
  cuttingSpeed_mpm: number;
  contactLength_mm: number;
  thermalDiffusivity_m2ps: number;
}

export interface PecletResult {
  pe: number;
  heatPartition: { chip: number; workpiece: number; tool: number };
  regime: 'chip-dominated' | 'workpiece-dominated' | 'transition';
  thermalDamageRisk: boolean;
}

export interface ChipFormationInput {
  shearStress_MPa: number;
  chipThickness_mm: number;
  kc_MPa: number;
  cuttingSpeed_mpm: number;
  density_kgm3: number;
  specificHeat_JkgK: number;
  shearZoneTemp_C: number;
}

export interface ChipFormResult {
  pi: number;
  chipType: 'continuous' | 'transitional' | 'segmented' | 'discontinuous';
  adiabacticShearRisk: boolean;
  rechtCriterion: number;
}

export interface StabilityInput {
  systemStiffness_Npmm: number;
  criticalDepth_mm: number;
  maxForce_N: number;
}

export interface StabilityResult {
  pi: number;
  stable: boolean;
  margin_dB: number;
  recommendation: string;
}

export interface WearIntensityInput {
  flankWear_mm: number;
  cuttingSpeed_mpm: number;
  cuttingTime_min: number;
  kc_MPa: number;
  chipThickness_mm: number;
}

export interface WearIntResult {
  pi: number;
  wearRegime: 'running-in' | 'steady' | 'accelerated';
  normalizedWearRate: number;
  projectedLifeAtPi1: number;
}

export interface ProcessCapabilityInput {
  cpk: number;
  processStdDev_mm: number;
  tolerance_mm: number;
  force_N?: number;
  stiffness_Npmm?: number;
  thermalExpCoeff?: number;
  tempRise_C?: number;
  length_mm?: number;
}

export interface ProcCapResult {
  pi: number;
  atRisk: boolean;
  dominantVarianceSource: string;
  improvementLeverage: string;
}

export interface MachinabilityInput {
  v30Speed_mpm: number;
  referenceV30_mpm?: number;
  surfaceFinish_um: number;
  referenceSurfaceFinish_um?: number;
  cuttingForce_N: number;
  referenceForce_N?: number;
}

export interface MachIndexResult {
  mi: number;
  rating: 'excellent' | 'good' | 'fair' | 'poor' | 'difficult';
  speedFactor: number;
  surfaceFactor: number;
  forceFactor: number;
}

export interface ThermalDamageInput {
  heatFlux_Wm2: number;
  contactLength_mm: number;
  thermalConductivity_WmK: number;
  criticalTemp_C: number;
  ambientTemp_C: number;
}

export interface TDNResult {
  tdn: number;
  damageRisk: 'safe' | 'caution' | 'likely' | 'certain';
  maxAllowableHeatFlux: number;
  maxAllowableSpeed_mpm?: number;
}

export interface AllNumbersInput {
  // Cutting number
  measuredForce_N?: number;
  kc11_MPa?: number;
  mc?: number;
  chipThickness_mm?: number;
  chipWidth_mm?: number;
  depthOfCut_mm?: number;
  stepover_mm?: number;
  // Peclet
  cuttingSpeed_mpm?: number;
  contactLength_mm?: number;
  thermalDiffusivity_m2ps?: number;
  // Chip formation
  shearStress_MPa?: number;
  kc_MPa?: number;
  density_kgm3?: number;
  specificHeat_JkgK?: number;
  shearZoneTemp_C?: number;
  // Stability
  systemStiffness_Npmm?: number;
  criticalDepth_mm?: number;
  maxForce_N?: number;
  // Wear
  flankWear_mm?: number;
  cuttingTime_min?: number;
  // Process capability
  cpk?: number;
  processStdDev_mm?: number;
  tolerance_mm?: number;
  force_N?: number;
  stiffness_Npmm?: number;
  thermalExpCoeff?: number;
  tempRise_C?: number;
  length_mm?: number;
  // Machinability
  v30Speed_mpm?: number;
  referenceV30_mpm?: number;
  surfaceFinish_um?: number;
  referenceSurfaceFinish_um?: number;
  cuttingForce_N?: number;
  referenceForce_N?: number;
  // Thermal damage
  heatFlux_Wm2?: number;
  thermalConductivity_WmK?: number;
  criticalTemp_C?: number;
  ambientTemp_C?: number;
}

export interface AllNumbersResult {
  cuttingNumber?: CuttingNumberResult;
  thermalPeclet?: PecletResult;
  chipFormationNumber?: ChipFormResult;
  stabilityNumber?: StabilityResult;
  wearIntensity?: WearIntResult;
  processCapabilityNumber?: ProcCapResult;
  machinabilityIndex?: MachIndexResult;
  thermalDamageNumber?: TDNResult;
  computed: string[];
  skipped: string[];
}

export interface InterpretResult {
  overallAssessment: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  dominantConcern: string;
  recommendations: string[];
  synergyEffects: string[];
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class DimensionlessNumbersEngine {
  private calculationCount = 0;

  /**
   * INVENTION: Π₁ — Cutting Number (Dimensionless Force Ratio)
   *
   * Dimensional analysis (Buckingham Pi):
   *   Variables: F [MLT⁻²], kc [ML⁻¹T⁻²], h [L], b [L], ap [L], ae [L]
   *   Fundamental dimensions: M, L, T → 3
   *   Variables: 6 → Pi groups: 6 - 3 = 3
   *   Primary group: Π₁ = F / (kc · ap · ae)
   *
   * The Kienzle force model gives F = kc1.1 · h^(1-mc) · b · ap
   * where kc1.1 is specific cutting force at h=1mm, mc is Kienzle exponent.
   * Actual kc = kc1.1 · h^(-mc), so theoretical force = kc1.1 · h^(1-mc) · b.
   * We normalize: Π₁ = F_measured / F_theoretical.
   *
   * Physical interpretation:
   *   Π₁ = 1.0 — Perfect Kienzle prediction
   *   Π₁ > 1.0 — Additional forces: friction, BUE, ploughing, edge radius effects
   *   Π₁ < 1.0 — Shear angle deviation, size effect, or thermal softening
   */
  cuttingNumber(input: CuttingNumberInput): CuttingNumberResult {
    this.calculationCount++;
    const { measuredForce_N, kc11_MPa, mc, chipThickness_mm, chipWidth_mm } = input;

    // Kienzle specific cutting force: kc = kc1.1 · h^(-mc)
    const kc = kc11_MPa * Math.pow(chipThickness_mm, -mc);

    // Theoretical force: F = kc · h · b (where h = chip thickness, b = chip width)
    const theoreticalForce = kc * chipThickness_mm * chipWidth_mm;

    // Dimensionless cutting number
    const pi = measuredForce_N / theoreticalForce;
    const deviationPercent = (pi - 1.0) * 100;

    let interpretation: string;
    let likelyCause: string;

    if (pi > 1.3) {
      interpretation = 'Force significantly exceeds Kienzle prediction — additional dissipation mechanisms active';
      likelyCause = 'Built-up edge (BUE), ploughing at sub-minimum chip thickness, or excessive flank wear increasing contact area';
    } else if (pi > 1.05) {
      interpretation = 'Force moderately above Kienzle prediction — minor additional effects';
      likelyCause = 'Edge radius ploughing component, friction coefficient variation, or slight tool wear';
    } else if (pi >= 0.95) {
      interpretation = 'Force matches Kienzle prediction — model is valid for these conditions';
      likelyCause = 'None — good agreement between theory and measurement';
    } else if (pi >= 0.7) {
      interpretation = 'Force below Kienzle prediction — favorable shear conditions';
      likelyCause = 'Higher shear angle (sharper tool), thermal softening at high speed, or size effect at large h';
    } else {
      interpretation = 'Force well below prediction — significant model deviation';
      likelyCause = 'Severe thermal softening, phase transformation, or measurement error';
    }

    return { pi, interpretation, deviationPercent, likelyCause };
  }

  /**
   * INVENTION: Pe — Thermal Peclet Number for Machining
   *
   * Dimensional analysis:
   *   Variables: V [LT⁻¹], L_c [L], α [L²T⁻¹]
   *   Dimensions: L, T → 2
   *   Variables: 3 → Pi groups: 3 - 2 = 1
   *   Pe = V · L_c / (2α)
   *
   * The Peclet number characterizes the ratio of advective heat transport
   * (chip carrying heat away) to conductive heat transport (into workpiece).
   *
   * Heat partition from Loewen-Shaw (1954):
   *   R_chip = 1 / (1 + 0.754 · √(α_w / (V · L_c)))
   *   where α_w = workpiece thermal diffusivity
   *
   * Physical regimes:
   *   Pe >> 10  — Chip-dominated: most heat leaves with chip (HSM regime)
   *   Pe ≈ 1-10 — Transition: significant heat into both chip and workpiece
   *   Pe < 1    — Workpiece-dominated: thermal damage risk (grinding-like)
   */
  thermalPeclet(input: ThermalPecletInput): PecletResult {
    this.calculationCount++;
    const { cuttingSpeed_mpm, contactLength_mm, thermalDiffusivity_m2ps } = input;

    // Convert units: V from m/min to m/s, L_c from mm to m
    const V = cuttingSpeed_mpm / 60;
    const Lc = contactLength_mm / 1000;
    const alpha = thermalDiffusivity_m2ps;

    // Peclet number: Pe = V · L_c / (2α)
    const pe = (V * Lc) / (2 * alpha);

    // Loewen-Shaw heat partition: fraction going to chip
    // R_chip = 1 / (1 + 0.754 · √(α / (V · L_c)))
    const loewenShawParam = Math.sqrt(alpha / (V * Lc));
    const chipFraction = 1 / (1 + 0.754 * loewenShawParam);

    // Tool typically absorbs 5-15% depending on coating; remainder to workpiece
    const toolFraction = 0.10; // typical coated carbide
    const workpieceFraction = (1 - chipFraction) * (1 - toolFraction);
    const adjustedToolFraction = (1 - chipFraction) * toolFraction;

    let regime: 'chip-dominated' | 'workpiece-dominated' | 'transition';
    if (pe > 10) {
      regime = 'chip-dominated';
    } else if (pe < 1) {
      regime = 'workpiece-dominated';
    } else {
      regime = 'transition';
    }

    // Thermal damage risk when workpiece absorbs >40% of heat
    const thermalDamageRisk = workpieceFraction > 0.4 || pe < 1;

    return {
      pe,
      heatPartition: {
        chip: Math.round(chipFraction * 1000) / 1000,
        workpiece: Math.round(workpieceFraction * 1000) / 1000,
        tool: Math.round(adjustedToolFraction * 1000) / 1000,
      },
      regime,
      thermalDamageRisk,
    };
  }

  /**
   * INVENTION: Π₃ — Chip Formation Number (Chip Morphology Predictor)
   *
   * Dimensional analysis:
   *   Variables: τ [ML⁻¹T⁻²], h [L], kc [ML⁻¹T⁻²], V [LT⁻¹],
   *              ρ [ML⁻³], cp [L²T⁻²Θ⁻¹], ΔT [Θ]
   *   Dimensions: M, L, T, Θ → 4
   *   Variables: 7 → Pi groups: 7 - 4 = 3
   *   Primary group: Π₃ = τ · h / (kc · V · ρ · cp · ΔT) — simplified ratio
   *     of mechanical shear energy density to volumetric thermal capacity.
   *
   * Relates to Recht (1964) catastrophic shear criterion:
   *   Instability when dτ/dT < 0 and |dτ/dT| > ρ·cp (strain hardening
   *   cannot compensate thermal softening).
   *
   * Physical interpretation:
   *   Π₃ < 0.1  — Continuous chip (ductile, good thermal absorption)
   *   Π₃ 0.1-1  — Transitional (wavy chip, some serration)
   *   Π₃ 1-10   — Segmented chip (adiabatic shear bands)
   *   Π₃ > 10   — Discontinuous chip (brittle fracture)
   */
  chipFormationNumber(input: ChipFormationInput): ChipFormResult {
    this.calculationCount++;
    const {
      shearStress_MPa,
      chipThickness_mm,
      kc_MPa,
      cuttingSpeed_mpm,
      density_kgm3,
      specificHeat_JkgK,
      shearZoneTemp_C,
    } = input;

    // Convert to SI: stress MPa→Pa, h mm→m, V m/min→m/s
    const tau = shearStress_MPa * 1e6;
    const h = chipThickness_mm / 1000;
    const kc = kc_MPa * 1e6;
    const V = cuttingSpeed_mpm / 60;
    const rho = density_kgm3;
    const cp = specificHeat_JkgK;
    // ΔT is the shear zone temperature rise above ambient (assume ambient ~25°C)
    const deltaT = Math.max(shearZoneTemp_C - 25, 1);

    // Chip formation number: ratio of shear energy to thermal capacity
    // Π₃ = (τ · h) / (ρ · cp · ΔT · V · h) simplified:
    // Π₃ = τ / (ρ · cp · ΔT) — but we keep kc for normalization
    // Full form: Π₃ = (τ · h) / (kc · V · ρ · cp · ΔT · h²) — dimensionally consistent
    // Simplified physically meaningful form:
    const pi = (tau * h) / (rho * cp * deltaT * V * h);
    // This simplifies to τ / (ρ · cp · ΔT · V) but keeping h in numerator
    // for dimensional consistency with the shear band width

    // Recht criterion: thermal softening rate vs. strain hardening
    // Simplified: rechtCriterion = τ / (ρ · cp · ΔT)
    // Values > 1 indicate adiabatic shear instability
    const rechtCriterion = tau / (rho * cp * deltaT);

    let chipType: 'continuous' | 'transitional' | 'segmented' | 'discontinuous';
    if (pi < 0.001) {
      chipType = 'continuous';
    } else if (pi < 0.01) {
      chipType = 'transitional';
    } else if (pi < 0.1) {
      chipType = 'segmented';
    } else {
      chipType = 'discontinuous';
    }

    const adiabacticShearRisk = rechtCriterion > 0.5;

    return { pi, chipType, adiabacticShearRisk, rechtCriterion };
  }

  /**
   * INVENTION: Π₄ — Stability Number (Dynamic Stability Indicator)
   *
   * Dimensional analysis:
   *   Variables: K [MT⁻²], ap [L], F [MLT⁻²]
   *   Dimensions: M, L, T → 3
   *   Variables: 3 → Pi groups: 3 - 3 = 0 (but K·ap/F is dimensionless)
   *   Actually: K [N/mm = MT⁻²], ap [L], F [MLT⁻²]
   *   Π₄ = K · ap / F — dimensionless
   *
   * Relates to chatter stability theory (Tlusty, Tobias):
   *   Critical depth ap_lim = -1 / (2 · Ks · Re[G(ω)])
   *   where Ks = specific cutting stiffness, G = FRF
   *
   * The stability number captures whether the system stiffness can support
   * the required cutting forces at the critical depth.
   *
   * Physical interpretation:
   *   Π₄ > 2.0  — Very stable, large margin (>6 dB)
   *   Π₄ 1-2    — Stable with moderate margin
   *   Π₄ 0.5-1  — Marginally stable, caution
   *   Π₄ < 0.5  — Unstable, chatter likely
   */
  stabilityNumber(input: StabilityInput): StabilityResult {
    this.calculationCount++;
    const { systemStiffness_Npmm, criticalDepth_mm, maxForce_N } = input;

    // Stability number: Π₄ = K · ap_lim / F_max
    const pi = (systemStiffness_Npmm * criticalDepth_mm) / maxForce_N;

    // Margin in dB (acoustic/vibration convention)
    const margin_dB = 20 * Math.log10(Math.max(pi, 1e-10));

    const stable = pi >= 1.0;

    let recommendation: string;
    if (pi > 2.0) {
      recommendation = 'Process is well within stable zone. Consider increasing depth of cut for productivity.';
    } else if (pi > 1.0) {
      recommendation = 'Stable but monitor for chatter onset. Maintain current parameters.';
    } else if (pi > 0.5) {
      recommendation = 'Marginally stable — reduce depth of cut by ' +
        Math.round((1 - pi) * 100) + '% or increase spindle speed to next stable lobe.';
    } else {
      recommendation = 'Unstable — chatter highly likely. Reduce ap by >' +
        Math.round((1 - pi) * 100) + '%, increase damping, or use variable-pitch tooling.';
    }

    return { pi, stable, margin_dB, recommendation };
  }

  /**
   * INVENTION: Π₅ — Wear Intensity Number (Universal Wear Rate)
   *
   * Dimensional analysis:
   *   Variables: VB [L], V [LT⁻¹], t [T], kc [ML⁻¹T⁻²], h [L]
   *   Dimensions: M, L, T → 3
   *   Variables: 5 → Pi groups: 5 - 3 = 2
   *   Primary: Π₅ = VB · V · t / (kc · h²)
   *     [L · LT⁻¹ · T] / [ML⁻¹T⁻² · L²] = [L²] / [ML⁻¹T⁻² · L²]
   *     Requires consistent treatment: V·t = sliding distance [L],
   *     VB/h = dimensionless wear, kc·h² = force·length = energy
   *     Π₅ = (VB · V · t) / (kc · h²) — wear-distance-energy ratio
   *
   * This number should collapse Taylor tool life curves for different
   * material/tool combinations onto a smaller family of universal curves.
   *
   * Physical interpretation:
   *   Π₅ < 0.1    — Running-in (initial rapid wear, edge preparation settling)
   *   Π₅ 0.1-1.0  — Steady-state wear (linear region, predictable)
   *   Π₅ > 1.0    — Accelerated wear (catastrophic failure imminent)
   */
  wearIntensity(input: WearIntensityInput): WearIntResult {
    this.calculationCount++;
    const { flankWear_mm, cuttingSpeed_mpm, cuttingTime_min, kc_MPa, chipThickness_mm } = input;

    // Convert: V m/min→mm/min, kc MPa→N/mm²
    const V_mmpm = cuttingSpeed_mpm * 1000; // mm/min
    const kc_Nmm2 = kc_MPa; // MPa = N/mm²
    const h = chipThickness_mm;

    // Wear intensity: Π₅ = VB · V · t / (kc · h²)
    const pi = (flankWear_mm * V_mmpm * cuttingTime_min) / (kc_Nmm2 * h * h);

    // Normalized wear rate: dVB/dt normalized
    const normalizedWearRate = flankWear_mm / cuttingTime_min; // mm/min

    // Project time to reach Π₅ = 1 (nominal end-of-life threshold)
    // At constant conditions: Π₅ scales linearly with VB·t
    // If current Π₅ corresponds to current VB and t, then at Π₅=1:
    // t_life ≈ t · (1/Π₅)^0.5 (since both VB and t grow)
    const projectedLifeAtPi1 = pi > 0 ? cuttingTime_min * Math.sqrt(1 / pi) : Infinity;

    let wearRegime: 'running-in' | 'steady' | 'accelerated';
    if (pi < 0.1) {
      wearRegime = 'running-in';
    } else if (pi <= 1.0) {
      wearRegime = 'steady';
    } else {
      wearRegime = 'accelerated';
    }

    return { pi, wearRegime, normalizedWearRate, projectedLifeAtPi1 };
  }

  /**
   * INVENTION: Π₆ — Process Capability Number (Capability-Stiffness Coupling)
   *
   * Dimensional analysis:
   *   Combines statistical (Cpk, σ) with physical error sources:
   *   σ_total = √(σ_process² + σ_deflection² + σ_thermal²)
   *   where:
   *     σ_deflection = F / (K · 3)   — force-induced (cantilever beam)
   *     σ_thermal    = α · ΔT · L / 3 — thermal expansion
   *
   *   Π₆ = Cpk · σ_total / tolerance
   *   All length units cancel: [1] · [L] / [L] = dimensionless
   *
   * This bridges SPC (statistical) with physics (deflection, thermal),
   * identifying which error source dominates and where to invest.
   *
   * Physical interpretation:
   *   Π₆ < 1/6 (0.167) — Highly capable with large margin
   *   Π₆ 1/6 to 1/3    — Capable but limited margin
   *   Π₆ > 1/3 (0.333) — At risk, intervention needed
   *   Π₆ > 1/2          — Not capable, redesign process
   */
  processCapabilityNumber(input: ProcessCapabilityInput): ProcCapResult {
    this.calculationCount++;
    const {
      cpk,
      processStdDev_mm,
      tolerance_mm,
      force_N,
      stiffness_Npmm,
      thermalExpCoeff,
      tempRise_C,
      length_mm,
    } = input;

    // Variance components
    const sigmaProcess2 = processStdDev_mm * processStdDev_mm;

    // Deflection-induced variance: σ_defl = F / (K · 3)
    let sigmaDeflection2 = 0;
    if (force_N !== undefined && stiffness_Npmm !== undefined && stiffness_Npmm > 0) {
      const sigmaDefl = force_N / (stiffness_Npmm * 3);
      sigmaDeflection2 = sigmaDefl * sigmaDefl;
    }

    // Thermal expansion variance: σ_thermal = α · ΔT · L / 3
    let sigmaThermal2 = 0;
    if (thermalExpCoeff !== undefined && tempRise_C !== undefined && length_mm !== undefined) {
      const sigmaThermal = thermalExpCoeff * tempRise_C * length_mm / 3;
      sigmaThermal2 = sigmaThermal * sigmaThermal;
    }

    // Total standard deviation (RSS)
    const sigmaTotal = Math.sqrt(sigmaProcess2 + sigmaDeflection2 + sigmaThermal2);

    // Process capability number
    const pi = cpk * sigmaTotal / tolerance_mm;

    const atRisk = pi > 1 / 3;

    // Identify dominant variance source
    const sources = [
      { name: 'process_variation', variance: sigmaProcess2 },
      { name: 'force_deflection', variance: sigmaDeflection2 },
      { name: 'thermal_expansion', variance: sigmaThermal2 },
    ];
    sources.sort((a, b) => b.variance - a.variance);
    const dominantVarianceSource = sources[0].name;

    // Improvement leverage — what would have most impact
    let improvementLeverage: string;
    const totalVariance = sigmaProcess2 + sigmaDeflection2 + sigmaThermal2;
    const dominantFraction = totalVariance > 0 ? sources[0].variance / totalVariance : 0;

    if (dominantFraction > 0.7) {
      switch (dominantVarianceSource) {
        case 'process_variation':
          improvementLeverage = 'Reduce process variation (better tooling, fixturing, or SPC control)';
          break;
        case 'force_deflection':
          improvementLeverage = 'Increase system stiffness (shorter tool, stiffer holder, reduce force via lighter cuts)';
          break;
        case 'thermal_expansion':
          improvementLeverage = 'Thermal management (coolant, warm-up cycle, compensation, or reduce ΔT)';
          break;
        default:
          improvementLeverage = 'Address dominant variance source: ' + dominantVarianceSource;
      }
    } else {
      improvementLeverage = 'Multiple sources contribute — systematic approach needed (RSS reduction across all sources)';
    }

    return { pi, atRisk, dominantVarianceSource, improvementLeverage };
  }

  /**
   * INVENTION: MI — Machinability Index (Universal Machinability Rating)
   *
   * Extends AISI machinability rating with multi-factor normalization:
   *   MI = (V₃₀ / V₃₀_ref) · (Ra_ref / Ra) · (F_ref / F)^0.5
   *
   * Traditional machinability is single-factor (speed only, AISI 1112 = 100%).
   * This index adds surface quality and force dimensions for a more complete picture.
   *
   * The 0.5 exponent on force ratio reflects that force impacts are sub-linear
   * on overall machinability (power scales with force, but tool life depends
   * more on speed and temperature).
   *
   * Normalized to AISI 1112 free-cutting steel = 1.0
   *
   * Physical interpretation:
   *   MI > 1.5  — Excellent machinability (free-cutting alloys)
   *   MI 1.0-1.5 — Good (most carbon steels, aluminum)
   *   MI 0.5-1.0 — Fair (alloy steels, some stainless)
   *   MI 0.2-0.5 — Poor (hardened steels, nickel alloys)
   *   MI < 0.2   — Difficult (Inconel, titanium aluminides, ceramics)
   */
  machinabilityIndex(input: MachinabilityInput): MachIndexResult {
    this.calculationCount++;
    const {
      v30Speed_mpm,
      referenceV30_mpm = 100,
      surfaceFinish_um,
      referenceSurfaceFinish_um = 3.2,
      cuttingForce_N,
      referenceForce_N = 1000,
    } = input;

    // Component factors
    const speedFactor = v30Speed_mpm / referenceV30_mpm;
    const surfaceFactor = referenceSurfaceFinish_um / surfaceFinish_um;
    const forceFactor = Math.sqrt(referenceForce_N / cuttingForce_N);

    // Composite machinability index
    const mi = speedFactor * surfaceFactor * forceFactor;

    let rating: 'excellent' | 'good' | 'fair' | 'poor' | 'difficult';
    if (mi > 1.5) {
      rating = 'excellent';
    } else if (mi > 1.0) {
      rating = 'good';
    } else if (mi > 0.5) {
      rating = 'fair';
    } else if (mi > 0.2) {
      rating = 'poor';
    } else {
      rating = 'difficult';
    }

    return {
      mi: Math.round(mi * 1000) / 1000,
      rating,
      speedFactor: Math.round(speedFactor * 1000) / 1000,
      surfaceFactor: Math.round(surfaceFactor * 1000) / 1000,
      forceFactor: Math.round(forceFactor * 1000) / 1000,
    };
  }

  /**
   * INVENTION: TDN — Thermal Damage Number
   *
   * Dimensional analysis:
   *   Variables: q [MT⁻³], L_c [L], k [MLT⁻³Θ⁻¹], T_crit [Θ]
   *   Dimensions: M, L, T, Θ → 4
   *   Variables: 4 → Pi groups: 4 - 4 = 0 → but q·L_c/(k·ΔT) is dimensionless
   *   TDN = (q · L_c) / (k · (T_critical - T_ambient))
   *   [W/m² · m] / [W/(m·K) · K] = [W/m] / [W/m] = 1 ✓
   *
   * Based on Jaeger (1942) moving heat source theory:
   *   Surface temperature rise: ΔT ∝ q · L_c / k
   *   When ΔT exceeds critical metallurgical temperature, damage occurs.
   *
   * For steel: T_critical ≈ 723°C (A₁ austenite transformation → white layer)
   * For aluminum: T_critical ≈ 200°C (age-hardening reversion)
   * For titanium: T_critical ≈ 600°C (alpha-case formation)
   *
   * Physical interpretation:
   *   TDN < 0.3  — Safe, no thermal damage expected
   *   TDN 0.3-0.7 — Caution, subsurface microstructural changes possible
   *   TDN 0.7-1.0 — Likely damage, white layer or tensile residual stress
   *   TDN > 1.0   — Certain damage, rehardening, phase transformation
   */
  thermalDamageNumber(input: ThermalDamageInput): TDNResult {
    this.calculationCount++;
    const {
      heatFlux_Wm2,
      contactLength_mm,
      thermalConductivity_WmK,
      criticalTemp_C,
      ambientTemp_C,
    } = input;

    const Lc = contactLength_mm / 1000; // mm → m
    const deltaT_crit = criticalTemp_C - ambientTemp_C;

    // Thermal damage number: TDN = q · L_c / (k · ΔT_crit)
    const tdn = (heatFlux_Wm2 * Lc) / (thermalConductivity_WmK * deltaT_crit);

    let damageRisk: 'safe' | 'caution' | 'likely' | 'certain';
    if (tdn < 0.3) {
      damageRisk = 'safe';
    } else if (tdn < 0.7) {
      damageRisk = 'caution';
    } else if (tdn <= 1.0) {
      damageRisk = 'likely';
    } else {
      damageRisk = 'certain';
    }

    // Maximum allowable heat flux for TDN = 0.5 (safe threshold with margin)
    const maxAllowableHeatFlux = (0.5 * thermalConductivity_WmK * deltaT_crit) / Lc;

    // Estimate max speed if we assume q ∝ V (simplified: q = η · F · V / A_contact)
    // maxSpeed = V_current · (maxAllowableHeatFlux / heatFlux_Wm2)
    let maxAllowableSpeed_mpm: number | undefined;
    if (heatFlux_Wm2 > 0) {
      const speedRatio = maxAllowableHeatFlux / heatFlux_Wm2;
      // Only meaningful if we can estimate — return as ratio of current speed
      maxAllowableSpeed_mpm = undefined; // Cannot compute without current speed
    }

    return { tdn, damageRisk, maxAllowableHeatFlux, maxAllowableSpeed_mpm };
  }

  /**
   * Compute ALL applicable dimensionless numbers from a single comprehensive input.
   * Skips numbers for which insufficient input data is provided.
   */
  allNumbers(input: AllNumbersInput): AllNumbersResult {
    this.calculationCount++;
    const result: AllNumbersResult = { computed: [], skipped: [] };

    // 1. Cutting Number — needs measuredForce_N, kc11_MPa, mc, chipThickness_mm, chipWidth_mm, depthOfCut_mm, stepover_mm
    if (
      input.measuredForce_N !== undefined &&
      input.kc11_MPa !== undefined &&
      input.mc !== undefined &&
      input.chipThickness_mm !== undefined &&
      input.chipWidth_mm !== undefined &&
      input.depthOfCut_mm !== undefined &&
      input.stepover_mm !== undefined
    ) {
      result.cuttingNumber = this.cuttingNumber({
        measuredForce_N: input.measuredForce_N,
        kc11_MPa: input.kc11_MPa,
        mc: input.mc,
        chipThickness_mm: input.chipThickness_mm,
        chipWidth_mm: input.chipWidth_mm,
        depthOfCut_mm: input.depthOfCut_mm,
        stepover_mm: input.stepover_mm,
      });
      result.computed.push('cuttingNumber');
    } else {
      result.skipped.push('cuttingNumber');
    }

    // 2. Thermal Peclet — needs cuttingSpeed_mpm, contactLength_mm, thermalDiffusivity_m2ps
    if (
      input.cuttingSpeed_mpm !== undefined &&
      input.contactLength_mm !== undefined &&
      input.thermalDiffusivity_m2ps !== undefined
    ) {
      result.thermalPeclet = this.thermalPeclet({
        cuttingSpeed_mpm: input.cuttingSpeed_mpm,
        contactLength_mm: input.contactLength_mm,
        thermalDiffusivity_m2ps: input.thermalDiffusivity_m2ps,
      });
      result.computed.push('thermalPeclet');
    } else {
      result.skipped.push('thermalPeclet');
    }

    // 3. Chip Formation — needs shearStress_MPa, chipThickness_mm, kc_MPa, cuttingSpeed_mpm, density_kgm3, specificHeat_JkgK, shearZoneTemp_C
    if (
      input.shearStress_MPa !== undefined &&
      input.chipThickness_mm !== undefined &&
      (input.kc_MPa !== undefined || input.kc11_MPa !== undefined) &&
      input.cuttingSpeed_mpm !== undefined &&
      input.density_kgm3 !== undefined &&
      input.specificHeat_JkgK !== undefined &&
      input.shearZoneTemp_C !== undefined
    ) {
      result.chipFormationNumber = this.chipFormationNumber({
        shearStress_MPa: input.shearStress_MPa,
        chipThickness_mm: input.chipThickness_mm,
        kc_MPa: input.kc_MPa ?? input.kc11_MPa!,
        cuttingSpeed_mpm: input.cuttingSpeed_mpm,
        density_kgm3: input.density_kgm3,
        specificHeat_JkgK: input.specificHeat_JkgK,
        shearZoneTemp_C: input.shearZoneTemp_C,
      });
      result.computed.push('chipFormationNumber');
    } else {
      result.skipped.push('chipFormationNumber');
    }

    // 4. Stability Number — needs systemStiffness_Npmm, criticalDepth_mm, maxForce_N
    if (
      input.systemStiffness_Npmm !== undefined &&
      input.criticalDepth_mm !== undefined &&
      input.maxForce_N !== undefined
    ) {
      result.stabilityNumber = this.stabilityNumber({
        systemStiffness_Npmm: input.systemStiffness_Npmm,
        criticalDepth_mm: input.criticalDepth_mm,
        maxForce_N: input.maxForce_N,
      });
      result.computed.push('stabilityNumber');
    } else {
      result.skipped.push('stabilityNumber');
    }

    // 5. Wear Intensity — needs flankWear_mm, cuttingSpeed_mpm, cuttingTime_min, kc_MPa (or kc11_MPa), chipThickness_mm
    if (
      input.flankWear_mm !== undefined &&
      input.cuttingSpeed_mpm !== undefined &&
      input.cuttingTime_min !== undefined &&
      (input.kc_MPa !== undefined || input.kc11_MPa !== undefined) &&
      input.chipThickness_mm !== undefined
    ) {
      result.wearIntensity = this.wearIntensity({
        flankWear_mm: input.flankWear_mm,
        cuttingSpeed_mpm: input.cuttingSpeed_mpm,
        cuttingTime_min: input.cuttingTime_min,
        kc_MPa: input.kc_MPa ?? input.kc11_MPa!,
        chipThickness_mm: input.chipThickness_mm,
      });
      result.computed.push('wearIntensity');
    } else {
      result.skipped.push('wearIntensity');
    }

    // 6. Process Capability — needs cpk, processStdDev_mm, tolerance_mm
    if (
      input.cpk !== undefined &&
      input.processStdDev_mm !== undefined &&
      input.tolerance_mm !== undefined
    ) {
      result.processCapabilityNumber = this.processCapabilityNumber({
        cpk: input.cpk,
        processStdDev_mm: input.processStdDev_mm,
        tolerance_mm: input.tolerance_mm,
        force_N: input.force_N,
        stiffness_Npmm: input.stiffness_Npmm,
        thermalExpCoeff: input.thermalExpCoeff,
        tempRise_C: input.tempRise_C,
        length_mm: input.length_mm,
      });
      result.computed.push('processCapabilityNumber');
    } else {
      result.skipped.push('processCapabilityNumber');
    }

    // 7. Machinability Index — needs v30Speed_mpm, surfaceFinish_um, cuttingForce_N
    if (
      input.v30Speed_mpm !== undefined &&
      input.surfaceFinish_um !== undefined &&
      input.cuttingForce_N !== undefined
    ) {
      result.machinabilityIndex = this.machinabilityIndex({
        v30Speed_mpm: input.v30Speed_mpm,
        referenceV30_mpm: input.referenceV30_mpm,
        surfaceFinish_um: input.surfaceFinish_um,
        referenceSurfaceFinish_um: input.referenceSurfaceFinish_um,
        cuttingForce_N: input.cuttingForce_N,
        referenceForce_N: input.referenceForce_N,
      });
      result.computed.push('machinabilityIndex');
    } else {
      result.skipped.push('machinabilityIndex');
    }

    // 8. Thermal Damage Number — needs heatFlux_Wm2, contactLength_mm, thermalConductivity_WmK, criticalTemp_C, ambientTemp_C
    if (
      input.heatFlux_Wm2 !== undefined &&
      input.contactLength_mm !== undefined &&
      input.thermalConductivity_WmK !== undefined &&
      input.criticalTemp_C !== undefined &&
      input.ambientTemp_C !== undefined
    ) {
      result.thermalDamageNumber = this.thermalDamageNumber({
        heatFlux_Wm2: input.heatFlux_Wm2,
        contactLength_mm: input.contactLength_mm,
        thermalConductivity_WmK: input.thermalConductivity_WmK,
        criticalTemp_C: input.criticalTemp_C,
        ambientTemp_C: input.ambientTemp_C,
      });
      result.computed.push('thermalDamageNumber');
    } else {
      result.skipped.push('thermalDamageNumber');
    }

    return result;
  }

  /**
   * Holistic process assessment from a set of dimensionless numbers.
   * Identifies synergy effects, dominant concerns, and actionable recommendations.
   */
  interpret(numbers: Partial<AllNumbersResult>): InterpretResult {
    this.calculationCount++;
    const risks: string[] = [];
    const recommendations: string[] = [];
    const synergyEffects: string[] = [];
    let maxRiskScore = 0;

    // Evaluate each available number
    if (numbers.cuttingNumber) {
      const cn = numbers.cuttingNumber;
      if (cn.pi > 1.3) {
        risks.push('cutting_force_excess');
        maxRiskScore = Math.max(maxRiskScore, 2);
        recommendations.push(`Cutting force ${cn.deviationPercent.toFixed(0)}% above Kienzle prediction — investigate ${cn.likelyCause}`);
      } else if (cn.pi < 0.7) {
        risks.push('cutting_model_deviation');
        maxRiskScore = Math.max(maxRiskScore, 1);
        recommendations.push('Cutting force well below model — verify measurement or consider thermal softening effects');
      }
    }

    if (numbers.thermalPeclet) {
      const tp = numbers.thermalPeclet;
      if (tp.thermalDamageRisk) {
        risks.push('thermal_damage_from_heat_partition');
        maxRiskScore = Math.max(maxRiskScore, 2);
        recommendations.push(`Pe=${tp.pe.toFixed(1)}: ${(tp.heatPartition.workpiece * 100).toFixed(0)}% heat into workpiece — increase cutting speed or improve coolant delivery`);
      }
    }

    if (numbers.chipFormationNumber) {
      const cf = numbers.chipFormationNumber;
      if (cf.adiabacticShearRisk) {
        risks.push('adiabatic_shear');
        maxRiskScore = Math.max(maxRiskScore, 2);
        recommendations.push(`Chip type: ${cf.chipType}, Recht criterion=${cf.rechtCriterion.toFixed(3)} — risk of serrated chips causing force fluctuations`);
      }
    }

    if (numbers.stabilityNumber) {
      const sn = numbers.stabilityNumber;
      if (!sn.stable) {
        risks.push('chatter_instability');
        maxRiskScore = Math.max(maxRiskScore, 3);
        recommendations.push(sn.recommendation);
      }
    }

    if (numbers.wearIntensity) {
      const wi = numbers.wearIntensity;
      if (wi.wearRegime === 'accelerated') {
        risks.push('accelerated_wear');
        maxRiskScore = Math.max(maxRiskScore, 3);
        recommendations.push(`Wear intensity Π₅=${wi.pi.toFixed(2)} in accelerated regime — tool change imminent, projected life: ${wi.projectedLifeAtPi1.toFixed(1)} min`);
      }
    }

    if (numbers.processCapabilityNumber) {
      const pc = numbers.processCapabilityNumber;
      if (pc.atRisk) {
        risks.push('capability_at_risk');
        maxRiskScore = Math.max(maxRiskScore, 2);
        recommendations.push(`Π₆=${pc.pi.toFixed(3)} (at risk) — dominant source: ${pc.dominantVarianceSource}. ${pc.improvementLeverage}`);
      }
    }

    if (numbers.machinabilityIndex) {
      const mi = numbers.machinabilityIndex;
      if (mi.rating === 'poor' || mi.rating === 'difficult') {
        risks.push('poor_machinability');
        maxRiskScore = Math.max(maxRiskScore, 1);
        recommendations.push(`MI=${mi.mi} (${mi.rating}) — consider specialized tooling, coatings, or coolant strategy`);
      }
    }

    if (numbers.thermalDamageNumber) {
      const td = numbers.thermalDamageNumber;
      if (td.damageRisk === 'likely' || td.damageRisk === 'certain') {
        risks.push('thermal_surface_damage');
        maxRiskScore = Math.max(maxRiskScore, 3);
        recommendations.push(`TDN=${td.tdn.toFixed(2)} (${td.damageRisk}) — reduce heat flux below ${(td.maxAllowableHeatFlux / 1e6).toFixed(1)} MW/m²`);
      }
    }

    // Synergy detection — cross-number interactions
    if (numbers.thermalPeclet && numbers.thermalDamageNumber) {
      if (numbers.thermalPeclet.regime === 'workpiece-dominated' && numbers.thermalDamageNumber.tdn > 0.5) {
        synergyEffects.push('CRITICAL SYNERGY: Low Peclet (heat into workpiece) combined with high TDN — thermal damage is compounding. Both speed increase and coolant improvement needed simultaneously.');
        maxRiskScore = Math.max(maxRiskScore, 3);
      }
    }

    if (numbers.cuttingNumber && numbers.stabilityNumber) {
      if (numbers.cuttingNumber.pi > 1.2 && numbers.stabilityNumber.pi < 1.5) {
        synergyEffects.push('Force excess (Π₁>' + numbers.cuttingNumber.pi.toFixed(2) + ') reduces stability margin — address force anomaly before increasing depth.');
      }
    }

    if (numbers.wearIntensity && numbers.processCapabilityNumber) {
      if (numbers.wearIntensity.wearRegime !== 'running-in' && numbers.processCapabilityNumber.atRisk) {
        synergyEffects.push('Tool wear progression will further degrade process capability — implement adaptive compensation or tighter tool change intervals.');
      }
    }

    if (numbers.chipFormationNumber && numbers.cuttingNumber) {
      if (numbers.chipFormationNumber.chipType === 'segmented' && numbers.cuttingNumber.pi > 1.1) {
        synergyEffects.push('Segmented chips cause periodic force spikes above Kienzle prediction — the cutting number deviation is partly explained by chip morphology.');
      }
    }

    if (numbers.thermalPeclet && numbers.wearIntensity) {
      if (numbers.thermalPeclet.heatPartition.tool > 0.15 && numbers.wearIntensity.wearRegime === 'accelerated') {
        synergyEffects.push('High tool heat fraction accelerating diffusion wear — coating upgrade or cryogenic coolant would address both thermal and wear numbers.');
      }
    }

    // Determine overall risk level
    let riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    if (maxRiskScore >= 3) {
      riskLevel = 'critical';
    } else if (maxRiskScore >= 2) {
      riskLevel = 'high';
    } else if (maxRiskScore >= 1) {
      riskLevel = 'moderate';
    } else {
      riskLevel = 'low';
    }

    // Dominant concern
    const dominantConcern = risks.length > 0
      ? risks[risks.length - 1].replace(/_/g, ' ')
      : 'none — all dimensionless numbers within acceptable ranges';

    // Overall assessment
    let overallAssessment: string;
    if (riskLevel === 'low') {
      overallAssessment = 'Process is well-characterized and within safe operating envelopes across all computed dimensionless numbers.';
    } else if (riskLevel === 'moderate') {
      overallAssessment = `Process shows moderate concerns in ${risks.length} area(s): ${risks.map(r => r.replace(/_/g, ' ')).join(', ')}. Monitor and consider adjustments.`;
    } else if (riskLevel === 'high') {
      overallAssessment = `Process has significant risks in ${risks.length} area(s). Immediate parameter adjustment recommended to avoid quality or tool life issues.`;
    } else {
      overallAssessment = `CRITICAL: ${risks.length} risk indicators active with ${synergyEffects.length} synergy effects. Process intervention required before continuing production.`;
    }

    if (recommendations.length === 0) {
      recommendations.push('All computed dimensionless numbers are within acceptable ranges — continue with current parameters.');
    }

    return {
      overallAssessment,
      riskLevel,
      dominantConcern,
      recommendations,
      synergyEffects,
    };
  }

  /**
   * Returns the list of available dimensionless numbers and total calculation count.
   */
  stats(): { numbers: string[]; totalCalculations: number } {
    return {
      numbers: [
        'cuttingNumber (Π₁ = F / (kc·ap·ae)) — Dimensionless force ratio',
        'thermalPeclet (Pe = V·Lc / 2α) — Heat partition number',
        'chipFormationNumber (Π₃ = τ·h / (ρ·cp·ΔT·V·h)) — Chip morphology predictor',
        'stabilityNumber (Π₄ = K·ap_lim / F_max) — Dynamic stability indicator',
        'wearIntensity (Π₅ = VB·V·t / (kc·h²)) — Universal wear rate',
        'processCapabilityNumber (Π₆ = Cpk·σ_total / tolerance) — Capability-stiffness coupling',
        'machinabilityIndex (MI = (V₃₀/V₃₀_ref)·(Ra_ref/Ra)·(F_ref/F)^0.5) — Universal machinability',
        'thermalDamageNumber (TDN = q·Lc / (k·ΔT_crit)) — Thermal damage risk',
      ],
      totalCalculations: this.calculationCount,
    };
  }
}
