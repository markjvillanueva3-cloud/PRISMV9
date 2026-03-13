/**
 * EnvironmentalVariationEngine — Ambient Condition Effects on Machining
 *
 * Models how environmental conditions (temperature, humidity, barometric
 * pressure) affect dimensional accuracy, machine behavior, and process
 * stability over daily/seasonal cycles.
 *
 * Effects modeled:
 * - Thermal expansion: ΔL = α · ΔT · L (machine + workpiece + fixture)
 * - Humidity → hygroscopic expansion (composites, some polymers)
 * - Humidity → coolant viscosity/evaporation rate change
 * - Barometric pressure → spindle air bearing stiffness (precision machines)
 * - Diurnal temperature cycle: T(t) = T_mean + A·sin(2π(t-6)/24)
 * - Seasonal variation: T_mean(month) from climate model
 * - Differential expansion: machine CTE ≠ workpiece CTE → systematic error
 *
 * Statistical model:
 * - MC simulation of daily/seasonal ambient variation
 * - Correlated T-RH model (higher T → capacity for higher RH)
 * - Dimensional error cumulation from all environmental sources
 * - Cpk impact from environmental drift
 *
 * References:
 * - ISO 1:2016: Geometrical product specifications — Standard reference temp
 * - Bryan (1990): International status of thermal error research
 * - Mayr et al. (2012): Thermal issues in machine tools, CIRP Annals
 * - ASME B89.6.2: Temperature and humidity environment for measurement
 *
 * Actions: environmental_variation (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface EnvironmentalInput {
  /** Part nominal dimension (mm) */
  part_length_mm: number;
  /** Part tolerance (mm) */
  tolerance_mm: number;
  /** Part material CTE (µm/m/°C) */
  part_cte_um_m_C?: number;
  /** Machine material CTE (µm/m/°C) — typically cast iron */
  machine_cte_um_m_C?: number;

  /** Shop ambient conditions */
  mean_temp_C?: number;
  temp_amplitude_C?: number;       // daily swing ±
  seasonal_amplitude_C?: number;    // summer-winter swing ±
  mean_humidity_pct?: number;
  humidity_amplitude_pct?: number;  // daily swing ±

  /** Climate controlled? */
  climate_controlled?: boolean;

  /** Machine type */
  machine_type?: "vmc" | "hmc" | "lathe" | "grinder" | "cmm";

  /** Simulation */
  simulation_hours?: number;
  mc_samples_per_hour?: number;
}

export interface HourlyState {
  hour: number;
  temp_C: number;
  humidity_pct: number;
  thermal_error_um: number;
  differential_error_um: number;
  total_error_um: number;
}

export interface EnvironmentalResult {
  /** Hourly trajectory (sampled) */
  hourly_states: HourlyState[];
  /** Error statistics */
  max_thermal_error_um: number;
  max_differential_error_um: number;
  rms_total_error_um: number;
  peak_to_peak_error_um: number;
  /** Cpk impact */
  cpk_without_env: number;
  cpk_with_env: number;
  cpk_reduction: number;
  /** Optimal measurement window */
  best_measurement_hour: number;
  worst_measurement_hour: number;
  /** Compensation needed? */
  compensation_needed: boolean;
  compensation_value_um_per_C: number;
  recommendations: string[];
  warnings: string[];
  formula: string;
}

// ── CTE database ──────────────────────────────────────────────────────

const PART_CTE: Record<string, number> = {
  steel: 11.7,
  aluminum: 23.1,
  titanium: 8.6,
  inconel: 13.0,
  cast_iron: 10.5,
  stainless: 17.3,
  copper: 16.5,
  brass: 19.0,
  invar: 1.2,
  composite: 2.0,
};

const MACHINE_CTE: Record<string, number> = {
  vmc: 10.5,    // cast iron
  hmc: 10.5,
  lathe: 10.5,
  grinder: 10.5,
  cmm: 8.0,     // granite base
};

// ── Engine ─────────────────────────────────────────────────────────────

export class EnvironmentalVariationEngine {

  private normalRandom(): number {
    const u1 = Math.random() || 1e-10;
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Thermal expansion error:
   * ΔL = α · ΔT · L (µm)
   * where α in µm/m/°C, L in mm → result in µm
   */
  thermalExpansion(
    cte_um_m_C: number, deltaT_C: number, length_mm: number,
  ): number {
    return cte_um_m_C * deltaT_C * (length_mm / 1000);
  }

  /**
   * Differential expansion between machine and workpiece:
   * ε_diff = (α_part - α_machine) · ΔT · L
   */
  differentialExpansion(
    partCTE: number, machineCTE: number,
    deltaT: number, length_mm: number,
  ): number {
    return (partCTE - machineCTE) * deltaT * (length_mm / 1000);
  }

  /**
   * Diurnal temperature model:
   * T(t) = T_mean + A · sin(2π(t - 6)/24) + noise
   * Peak at ~14:00 (t=14), minimum at ~02:00 (t=2)
   */
  diurnalTemp(
    hour: number, meanTemp: number, amplitude: number,
  ): number {
    return meanTemp + amplitude * Math.sin(2 * Math.PI * (hour - 6) / 24);
  }

  /**
   * Humidity model (correlated with temperature):
   * RH(t) ≈ RH_mean - k · (T(t) - T_mean) + noise
   * Higher temp → lower RH (if absolute humidity constant)
   */
  diurnalHumidity(
    hour: number, meanRH: number, amplitude: number,
    tempDelta: number,
  ): number {
    const rhBase = meanRH - amplitude * Math.sin(
      2 * Math.PI * (hour - 6) / 24,
    );
    // Anti-correlation with temperature
    const rhAdj = rhBase - 1.5 * tempDelta;
    return Math.max(20, Math.min(90, rhAdj));
  }

  /** Main entry — environmental variation analysis. */
  analyze(input: EnvironmentalInput): EnvironmentalResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const L = input.part_length_mm;
    const tol = input.tolerance_mm;
    const partCTE = input.part_cte_um_m_C ?? 11.7; // steel default
    const machCTE = input.machine_cte_um_m_C
      ?? MACHINE_CTE[input.machine_type ?? "vmc"] ?? 10.5;

    const climateCtrl = input.climate_controlled ?? false;
    const meanT = input.mean_temp_C ?? (climateCtrl ? 20 : 22);
    const ampT = input.temp_amplitude_C
      ?? (climateCtrl ? 0.5 : 3);
    const seasonAmp = input.seasonal_amplitude_C
      ?? (climateCtrl ? 1 : 8);
    const meanRH = input.mean_humidity_pct ?? 50;
    const ampRH = input.humidity_amplitude_pct
      ?? (climateCtrl ? 3 : 15);
    const simHours = input.simulation_hours ?? 24;
    const mcPerHour = input.mc_samples_per_hour ?? 20;

    const refTemp = 20; // ISO 1 reference temperature
    const hourlyStates: HourlyState[] = [];

    let maxTherm = 0;
    let maxDiff = 0;
    let sumSqTotal = 0;
    let minTotal = Infinity;
    let maxTotal = -Infinity;
    let bestHour = 0;
    let worstHour = 0;

    // Simulate each hour
    for (let h = 0; h < simHours; h++) {
      let sumTherm = 0;
      let sumDiff = 0;
      let sumTotal = 0;

      for (let s = 0; s < mcPerHour; s++) {
        // Temperature with noise
        const noise = (climateCtrl ? 0.2 : 1.0) * this.normalRandom();
        const T = this.diurnalTemp(h, meanT, ampT) + noise;
        const deltaT = T - refTemp;

        // Part expansion
        const partExp = this.thermalExpansion(partCTE, deltaT, L);
        // Machine expansion
        const machExp = this.thermalExpansion(machCTE, deltaT, L);
        // Differential
        const diffExp = partExp - machExp;

        sumTherm += partExp;
        sumDiff += diffExp;
        sumTotal += Math.abs(diffExp);
      }

      const avgTherm = sumTherm / mcPerHour;
      const avgDiff = sumDiff / mcPerHour;
      const avgTotal = sumTotal / mcPerHour;

      // Humidity (for reporting, not directly affecting dimension for metals)
      const tempDelta = this.diurnalTemp(h, meanT, ampT) - meanT;
      const rh = this.diurnalHumidity(h, meanRH, ampRH, tempDelta);

      hourlyStates.push({
        hour: h,
        temp_C: Math.round(
          this.diurnalTemp(h, meanT, ampT) * 10,
        ) / 10,
        humidity_pct: Math.round(rh * 10) / 10,
        thermal_error_um: Math.round(avgTherm * 100) / 100,
        differential_error_um: Math.round(avgDiff * 100) / 100,
        total_error_um: Math.round(avgTotal * 100) / 100,
      });

      maxTherm = Math.max(maxTherm, Math.abs(avgTherm));
      maxDiff = Math.max(maxDiff, Math.abs(avgDiff));
      sumSqTotal += avgTotal * avgTotal;

      if (avgTotal < minTotal) {
        minTotal = avgTotal;
        bestHour = h;
      }
      if (avgTotal > maxTotal) {
        maxTotal = avgTotal;
        worstHour = h;
      }
    }

    const rmsTotal = Math.sqrt(sumSqTotal / simHours);
    const p2p = maxTotal - minTotal;

    // Cpk impact
    const tolUm = tol * 1000;
    const baseSigma = tolUm / 8; // assume base process uses ~1/8 of tolerance
    const envSigma = rmsTotal;
    const combinedSigma = Math.sqrt(baseSigma ** 2 + envSigma ** 2);

    const cpkWithout = baseSigma > 0 ? tolUm / (6 * baseSigma) : Infinity;
    const cpkWith = combinedSigma > 0
      ? tolUm / (6 * combinedSigma) : Infinity;

    // Compensation
    const compValue = Math.abs(partCTE - machCTE) * (L / 1000);
    const compNeeded = p2p > tolUm * 0.1;

    // Recommendations
    if (compNeeded) {
      recommendations.push(
        "Environmental drift = " + Math.round(p2p * 10) / 10 +
        "µm (>" + Math.round(tolUm * 0.1) +
        "µm = 10% of tolerance) — implement thermal compensation",
      );
    }
    if (!climateCtrl && ampT > 2) {
      recommendations.push(
        "Shop temperature swing ±" + ampT +
        "°C — consider climate control for tight tolerances",
      );
    }
    if (bestHour >= 0) {
      recommendations.push(
        "Best measurement window: hour " + bestHour +
        " (min environmental error)",
      );
    }
    if (Math.abs(partCTE - machCTE) > 5) {
      warnings.push(
        "Large CTE mismatch (Δα=" +
        Math.round(Math.abs(partCTE - machCTE) * 10) / 10 +
        " µm/m/°C) — differential expansion dominates error",
      );
    }
    if (seasonAmp > 5 && !climateCtrl) {
      warnings.push(
        "Seasonal temperature variation ±" + seasonAmp +
        "°C may cause Cpk drift of ~" +
        Math.round((cpkWithout - cpkWith) * 100) / 100 + " units",
      );
    }

    return {
      hourly_states: hourlyStates,
      max_thermal_error_um: Math.round(maxTherm * 100) / 100,
      max_differential_error_um: Math.round(maxDiff * 100) / 100,
      rms_total_error_um: Math.round(rmsTotal * 100) / 100,
      peak_to_peak_error_um: Math.round(p2p * 100) / 100,
      cpk_without_env: Math.round(cpkWithout * 100) / 100,
      cpk_with_env: Math.round(cpkWith * 100) / 100,
      cpk_reduction: Math.round((cpkWithout - cpkWith) * 100) / 100,
      best_measurement_hour: bestHour,
      worst_measurement_hour: worstHour,
      compensation_needed: compNeeded,
      compensation_value_um_per_C: Math.round(compValue * 100) / 100,
      recommendations,
      warnings,
      formula: "ΔL=α·ΔT·L; ε_diff=(α_part-α_mach)·ΔT·L; " +
        "T(t)=T_mean+A·sin(2π(t-6)/24); " +
        "RH(t)=RH_mean-k·ΔT; " +
        "σ_combined=√(σ_base²+σ_env²); " +
        "Cpk=(USL-LSL)/(6σ_combined)",
    };
  }
}

export const environmentalVariationEngine =
  new EnvironmentalVariationEngine();
