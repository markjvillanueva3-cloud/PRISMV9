/**
 * ProcessCapabilityPredictionEngine — Pre-Production Cp/Cpk Prediction
 *
 * Predicts process capability indices from machining parameters before
 * production starts, using analytical error stacking and optional
 * Monte Carlo simulation of dimensional variation sources.
 *
 * Variation sources modeled:
 * - Machine geometric accuracy (positioning, straightness)
 * - Thermal drift (α·ΔT·L expansion)
 * - Tool wear progression (flank wear → dimensional shift)
 * - Tool deflection (cantilever beam under cutting force)
 * - Spindle runout (TIR contribution)
 * - Fixturing repeatability (locating accuracy)
 * - Material variation (hardness → force → deflection scatter)
 *
 * Models:
 * - Cp = (USL - LSL) / (6σ)
 * - Cpk = min[(USL - µ)/(3σ), (µ - LSL)/(3σ)]
 * - σ_total² = Σ σᵢ² (RSS for independent sources)
 * - Tool deflection: δ = F·L³/(3EI), I = πd⁴/64
 * - Monte Carlo: N random samples from each source distribution
 *
 * References:
 * - Montgomery (2019): Statistical Quality Control, 8th Ed
 * - AIAG (2005): SPC Reference Manual, 2nd Ed
 * - ISO 22514-1: Statistical methods in process management
 *
 * Actions: capability_predict (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface CapabilityPredictInput {
  /** Tolerance specification */
  nominal_mm: number;
  usl_mm: number;
  lsl_mm: number;

  /** Machine parameters */
  machine_positioning_um?: number;    // positioning accuracy (µm)
  machine_repeatability_um?: number;  // repeatability (µm)
  thermal_drift_um?: number;          // thermal growth uncertainty (µm)

  /** Tool parameters */
  tool_diameter_mm?: number;
  tool_overhang_mm?: number;
  tool_material_E_GPa?: number;       // Young's modulus (carbide ~600, HSS ~210)
  cutting_force_N?: number;
  tool_wear_rate_um_per_part?: number;
  tool_life_parts?: number;

  /** Spindle & fixturing */
  spindle_runout_um?: number;
  fixture_repeatability_um?: number;

  /** Material variation */
  hardness_variation_pct?: number;    // % variation in hardness → force scatter

  /** Simulation */
  monte_carlo_samples?: number;       // 0 = analytical only
  mean_shift_um?: number;             // known systematic offset
}

export interface VariationSource {
  name: string;
  sigma_um: number;
  pct_of_total: number;
}

export interface CapabilityPredictResult {
  cp: number;
  cpk: number;
  sigma_total_um: number;
  mean_um: number;
  tolerance_um: number;
  variation_sources: VariationSource[];
  top_contributor: string;
  meets_target: boolean;              // Cpk ≥ 1.33
  sigma_level: number;                // how many σ fit in half-tolerance
  parts_per_million_defect: number;
  recommendations: string[];
  warnings: string[];
  formula: string;
  monte_carlo_used: boolean;
}

// ── Engine ──────────────────────────────────────────────────────────────────

export class ProcessCapabilityPredictionEngine {

  /** Tool deflection: δ = F·L³/(3EI), I = πd⁴/64 */
  toolDeflection(
    force_N: number, overhang_mm: number, diameter_mm: number, E_GPa: number,
  ): number {
    const I = (Math.PI * Math.pow(diameter_mm, 4)) / 64; // mm⁴
    const E = E_GPa * 1000; // GPa → N/mm²
    if (E * I === 0) return 0;
    return (force_N * Math.pow(overhang_mm, 3)) / (3 * E * I); // mm
  }

  /** Normal random (Box-Muller transform) */
  normalRandom(mean: number, sigma: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
    return mean + sigma * z;
  }

  /** PPM defective from Cpk (normal approximation) */
  ppmFromCpk(cpk: number): number {
    // Approximate: PPM ≈ 2 × Φ(-3·Cpk) × 1e6
    // Using error function approximation
    const z = 3 * cpk;
    const t = 1 / (1 + 0.2316419 * z);
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return Math.max(0, Math.round(2 * p * 1e6));
  }

  /** Main entry — predict capability. */
  predict(input: CapabilityPredictInput): CapabilityPredictResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const tolRange_mm = input.usl_mm - input.lsl_mm;
    const tolRange_um = tolRange_mm * 1000;
    const nominalCenter_um = ((input.usl_mm + input.lsl_mm) / 2) * 1000;

    // ── Collect variation sources (all in µm as σ) ──

    const sources: { name: string; sigma_um: number }[] = [];

    // Machine positioning (uniform → σ = range/√12, but spec is typically ±value)
    const posAccuracy = input.machine_positioning_um ?? 5;
    sources.push({ name: "Machine positioning", sigma_um: posAccuracy / 3 });

    // Machine repeatability
    const repeatability = input.machine_repeatability_um ?? 2;
    sources.push({ name: "Machine repeatability", sigma_um: repeatability / 3 });

    // Thermal drift
    const thermalDrift = input.thermal_drift_um ?? 3;
    sources.push({ name: "Thermal drift", sigma_um: thermalDrift / 3 });

    // Tool deflection variation (from force variation due to material scatter)
    const toolDia = input.tool_diameter_mm ?? 10;
    const toolOH = input.tool_overhang_mm ?? 40;
    const toolE = input.tool_material_E_GPa ?? 600; // carbide default
    const force = input.cutting_force_N ?? 500;
    const hardnessVar = input.hardness_variation_pct ?? 5;

    const nominalDeflection = this.toolDeflection(force, toolOH, toolDia, toolE);
    const deflectionVar_um = nominalDeflection * (hardnessVar / 100) * 1000;
    if (deflectionVar_um > 0.1) {
      sources.push({ name: "Tool deflection variation", sigma_um: deflectionVar_um / 3 });
    }

    // Tool wear drift (systematic over tool life → treat half-range as 3σ)
    const wearRate = input.tool_wear_rate_um_per_part ?? 0.5;
    const toolLife = input.tool_life_parts ?? 200;
    const totalWear = wearRate * toolLife;
    if (totalWear > 0) {
      sources.push({ name: "Tool wear drift", sigma_um: totalWear / 6 });
    }

    // Spindle runout
    const runout = input.spindle_runout_um ?? 2;
    sources.push({ name: "Spindle runout", sigma_um: runout / 3 });

    // Fixture repeatability
    const fixtureRepeat = input.fixture_repeatability_um ?? 3;
    sources.push({ name: "Fixture repeatability", sigma_um: fixtureRepeat / 3 });

    // ── Analytical RSS ──
    const sigmaTotal = Math.sqrt(
      sources.reduce((sum, s) => sum + s.sigma_um * s.sigma_um, 0),
    );
    const sigmaTotalSq = sigmaTotal * sigmaTotal;

    // Variation source breakdown
    const variationSources: VariationSource[] = sources.map(s => ({
      name: s.name,
      sigma_um: Math.round(s.sigma_um * 100) / 100,
      pct_of_total: sigmaTotalSq > 0
        ? Math.round((s.sigma_um * s.sigma_um / sigmaTotalSq) * 10000) / 100
        : 0,
    })).sort((a, b) => b.pct_of_total - a.pct_of_total);

    // Mean shift (systematic offset + half of tool wear)
    const meanShift = (input.mean_shift_um ?? 0) + totalWear / 2;
    const processCenter = nominalCenter_um + meanShift;

    // ── Monte Carlo (optional) ──
    let mcSigma = sigmaTotal;
    let mcMean = processCenter;
    const mcSamples = input.monte_carlo_samples ?? 0;
    const monteCarloUsed = mcSamples > 0;

    if (monteCarloUsed) {
      const samples: number[] = [];
      for (let i = 0; i < mcSamples; i++) {
        let dim = nominalCenter_um + meanShift;
        for (const src of sources) {
          dim += this.normalRandom(0, src.sigma_um);
        }
        samples.push(dim);
      }
      mcMean = samples.reduce((a, b) => a + b, 0) / samples.length;
      const variance = samples.reduce((a, b) => a + (b - mcMean) ** 2, 0) / (samples.length - 1);
      mcSigma = Math.sqrt(variance);
    }

    const usedSigma = monteCarloUsed ? mcSigma : sigmaTotal;
    const usedMean = monteCarloUsed ? mcMean : processCenter;

    // ── Capability indices ──
    const usl_um = input.usl_mm * 1000;
    const lsl_um = input.lsl_mm * 1000;

    const cp = usedSigma > 0 ? tolRange_um / (6 * usedSigma) : Infinity;
    const cpk = usedSigma > 0
      ? Math.min(
          (usl_um - usedMean) / (3 * usedSigma),
          (usedMean - lsl_um) / (3 * usedSigma),
        )
      : Infinity;

    // Sigma level = 3 × Cpk (accounts for mean shift, not just tolerance/sigma)
    const sigmaLevel = cpk > 0 ? 3 * cpk : 0;
    const ppm = this.ppmFromCpk(Math.max(0, cpk));
    const meetsCpk = cpk >= 1.33;

    // ── Recommendations ──
    if (cpk < 1.0) {
      recommendations.push("Process NOT capable (Cpk < 1.0) — reduce variation or widen tolerance");
      const topSource = variationSources[0];
      if (topSource) {
        recommendations.push(`Largest contributor: ${topSource.name} (${topSource.pct_of_total}%) — address first`);
      }
    } else if (cpk < 1.33) {
      recommendations.push("Process marginally capable (1.0 ≤ Cpk < 1.33) — improvement recommended");
    } else if (cpk < 1.67) {
      recommendations.push("Process capable (1.33 ≤ Cpk < 1.67) — monitor for drift");
    } else {
      recommendations.push("Process highly capable (Cpk ≥ 1.67) — consider tighter tolerances");
    }

    if (Math.abs(cp - cpk) > 0.3) {
      recommendations.push("Large Cp-Cpk gap indicates process centering issue — adjust tool offset");
    }
    if (totalWear > tolRange_um * 0.3) {
      recommendations.push("Tool wear consumes >30% of tolerance band — increase compensation frequency");
    }

    // Warnings
    if (tolRange_um < 10) {
      warnings.push("Very tight tolerance (<10µm) — validate with actual capability study");
    }
    if (nominalDeflection * 1000 > tolRange_um * 0.2) {
      warnings.push("Tool deflection exceeds 20% of tolerance — use stiffer tooling");
    }

    return {
      cp: Math.round(cp * 100) / 100,
      cpk: Math.round(cpk * 100) / 100,
      sigma_total_um: Math.round(usedSigma * 100) / 100,
      mean_um: Math.round(usedMean * 100) / 100,
      tolerance_um: tolRange_um,
      variation_sources: variationSources,
      top_contributor: variationSources[0]?.name ?? "none",
      meets_target: meetsCpk,
      sigma_level: Math.round(sigmaLevel * 10) / 10,
      parts_per_million_defect: ppm,
      recommendations,
      warnings,
      formula: "Cp=(USL-LSL)/(6σ); Cpk=min[(USL-µ)/(3σ),(µ-LSL)/(3σ)]; " +
        "σ²=Σσᵢ² (RSS); δ=FL³/(3EI); " +
        "PPM≈2·Φ(-3Cpk)·10⁶",
      monte_carlo_used: monteCarloUsed,
    };
  }
}

export const processCapabilityPredictionEngine = new ProcessCapabilityPredictionEngine();
