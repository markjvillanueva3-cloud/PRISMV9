/**
 * StochasticDimensionalEngine — Multi-Source Dimensional Uncertainty Propagation
 *
 * Predicts dimensional accuracy distributions across production runs by
 * propagating uncertainty from multiple independent and correlated sources
 * through Monte Carlo simulation with time-varying drift models.
 *
 * Variation sources:
 * - Machine positioning (σ_machine): repeatability + accuracy
 * - Thermal drift (σ_thermal): α·ΔT(t)·L with sinusoidal ΔT model
 * - Tool wear drift (δ_wear(t)): progressive shift over tool life
 * - Tool deflection scatter: F-variation → δ=FL³/3EI scatter
 * - Fixture repositioning (σ_fixture): locating + clamping variation
 * - Spindle runout (σ_runout): TIR contribution per revolution
 * - Material hardness scatter: ΔF → Δdeflection → Δdimension
 * - Measurement uncertainty (σ_gage): GR&R contribution
 *
 * Time-varying model:
 * - Dimension(t, part_i) = nominal + Σ systematic_drifts(t) + Σ random_scatter_i
 * - Systematic: thermal = α·A·sin(2πt/T_cycle)·L, wear = k_wear·part_number
 * - Random: machine + fixture + runout + deflection + gage (RSS per part)
 *
 * Statistical outputs:
 * - Part-by-part dimension distribution
 * - Cp/Cpk evolution over production run
 * - Time to first out-of-spec part (reliability)
 * - Optimal tool change / offset correction schedule
 * - SPC chart data (X-bar, R chart values)
 *
 * References:
 * - ASME Y14.5: GD&T / dimensional tolerancing
 * - ISO 22514: Statistical methods in process management
 * - Wheeler (2004): Advanced Topics in SPC
 * - Montgomery (2019): Statistical Quality Control, 8th Ed
 *
 * Actions: stochastic_dimension (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface DimUncertaintyInput {
  /** Nominal dimension (mm) */
  nominal_mm: number;
  /** Tolerance limits */
  usl_mm: number;
  lsl_mm: number;

  /** Machine positioning repeatability (µm, 2σ) */
  machine_repeatability_um?: number;
  /** Machine positioning accuracy (µm, systematic) */
  machine_accuracy_um?: number;

  /** Thermal parameters */
  thermal_coeff_um_per_C?: number; // α for workpiece+machine (µm/°C)
  ambient_temp_amplitude_C?: number; // sinusoidal amplitude
  thermal_cycle_hours?: number;     // period of thermal cycle

  /** Tool wear */
  wear_rate_um_per_part?: number;  // progressive dimensional shift
  tool_change_interval?: number;   // parts between tool changes
  wear_compensation_interval?: number; // parts between offset updates

  /** Tool deflection */
  cutting_force_N?: number;
  force_cv_pct?: number;           // force coefficient of variation
  tool_stiffness_N_per_um?: number; // EI/L³ equivalent

  /** Fixture */
  fixture_repeatability_um?: number;

  /** Spindle runout */
  spindle_runout_um?: number;

  /** Material hardness variation */
  hardness_cv_pct?: number;
  hardness_force_sensitivity?: number; // dF/dHRC (N/HRC)

  /** Measurement (GR&R) */
  gage_rr_um?: number;

  /** Production run size */
  production_qty?: number;

  /** Monte Carlo samples per part position */
  mc_samples_per_part?: number;

  /** SPC subgroup size */
  spc_subgroup_size?: number;
}

export interface PartDimensionState {
  part_number: number;
  mean_mm: number;
  std_um: number;
  cpk: number;
  in_spec_pct: number;
}

export interface SPCPoint {
  subgroup: number;
  x_bar_mm: number;
  range_um: number;
}

export interface DimUncertaintyResult {
  /** Per-part statistics (sampled at intervals) */
  part_states: PartDimensionState[];
  /** Overall run statistics */
  overall_cpk: number;
  overall_cp: number;
  overall_mean_mm: number;
  overall_sigma_um: number;
  /** Reliability */
  first_oos_part: number | null;  // first out-of-spec part number, or null
  pct_in_spec: number;
  expected_defect_ppm: number;
  /** Variance decomposition (% of total variance) */
  variance_breakdown: {
    machine_pct: number;
    thermal_pct: number;
    wear_pct: number;
    deflection_pct: number;
    fixture_pct: number;
    runout_pct: number;
    gage_pct: number;
  };
  /** Optimal correction schedule */
  recommended_correction_interval: number;
  /** SPC data */
  spc_points: SPCPoint[];
  warnings: string[];
  formula: string;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class StochasticDimensionalEngine {

  /** Box-Muller normal random */
  private normalRandom(): number {
    const u1 = Math.random() || 1e-10;
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Thermal drift at time t (hours):
   * δ_thermal = α · A · sin(2πt/T) · L_effective
   * where L_effective is embedded in thermal_coeff_um_per_C
   */
  thermalDrift(
    t_hours: number, amplitude_C: number,
    cycle_hours: number, coeff_um_per_C: number,
  ): number {
    if (cycle_hours <= 0) return 0;
    const deltaT = amplitude_C * Math.sin(2 * Math.PI * t_hours / cycle_hours);
    return coeff_um_per_C * deltaT;
  }

  /**
   * Tool wear drift: progressive shift that resets at tool change.
   * With periodic compensation, the max drift is bounded.
   */
  wearDrift(
    partNum: number, wearRate_um: number,
    changeInterval: number, compInterval: number,
  ): number {
    // Position within current tool life
    const posInTool = partNum % changeInterval;
    // Position within current compensation window
    const posInComp = compInterval > 0 ? posInTool % compInterval : posInTool;
    return wearRate_um * posInComp;
  }

  /** PPM from Cpk */
  private ppmFromCpk(cpk: number): number {
    const z = 3 * cpk;
    if (z > 6) return 0;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 +
      t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return Math.max(0, Math.round(2 * p * 1e6));
  }

  /** Main entry — simulate dimensional variation across production run. */
  simulate(input: DimUncertaintyInput): DimUncertaintyResult {
    const warnings: string[] = [];
    const qty = input.production_qty ?? 200;
    const MAX_TRIALS = 100_000;
    const mcPerPart = Math.min(input.mc_samples_per_part ?? 100, MAX_TRIALS);
    const subgroupSize = input.spc_subgroup_size ?? 5;

    // Defaults (all in µm)
    const machRepeat = input.machine_repeatability_um ?? 3;
    const machAccuracy = input.machine_accuracy_um ?? 0;
    const thermalCoeff = input.thermal_coeff_um_per_C ?? 5;
    const thermalAmp = input.ambient_temp_amplitude_C ?? 2;
    const thermalCycle = input.thermal_cycle_hours ?? 8;
    const wearRate = input.wear_rate_um_per_part ?? 0.3;
    const changeInterval = input.tool_change_interval ?? 200;
    const compInterval = input.wear_compensation_interval ?? 50;
    const cuttingForce = input.cutting_force_N ?? 500;
    const forceCv = input.force_cv_pct ?? 5;
    const toolStiffness = input.tool_stiffness_N_per_um ?? 50;
    const fixtureRepeat = input.fixture_repeatability_um ?? 3;
    const runout = input.spindle_runout_um ?? 1.5;
    const hardnessCv = input.hardness_cv_pct ?? 3;
    const hardnessForceSens = input.hardness_force_sensitivity ?? 10;
    const gageRR = input.gage_rr_um ?? 1;

    // Time per part (assume 2 min cycle)
    const cycleTime_hr = 2 / 60;

    // Nominal deflection
    const nomDeflection_um = cuttingForce / toolStiffness;

    // σ for each random source (convert 2σ specs to 1σ)
    const sigMachine = machRepeat / 2;
    const sigFixture = fixtureRepeat / 2;
    const sigRunout = runout / 2;
    const sigGage = gageRR / 2;
    const sigForce = cuttingForce * (forceCv / 100);
    const sigDeflection = sigForce / toolStiffness;
    const sigHardness = hardnessForceSens * (hardnessCv / 100) / toolStiffness;

    // Variance decomposition (analytical RSS)
    const variances = {
      machine: sigMachine ** 2,
      thermal: (thermalCoeff * thermalAmp) ** 2 / 2, // RMS of sinusoidal
      wear: (wearRate * Math.min(compInterval, changeInterval)) ** 2 / 12, // uniform
      deflection: sigDeflection ** 2,
      fixture: sigFixture ** 2,
      runout: sigRunout ** 2,
      gage: sigGage ** 2,
    };
    const totalVar = Object.values(variances).reduce((s, v) => s + v, 0);

    const varianceBreakdown = {
      machine_pct: totalVar > 0
        ? Math.round((variances.machine / totalVar) * 10000) / 100 : 0,
      thermal_pct: totalVar > 0
        ? Math.round((variances.thermal / totalVar) * 10000) / 100 : 0,
      wear_pct: totalVar > 0
        ? Math.round((variances.wear / totalVar) * 10000) / 100 : 0,
      deflection_pct: totalVar > 0
        ? Math.round((variances.deflection / totalVar) * 10000) / 100 : 0,
      fixture_pct: totalVar > 0
        ? Math.round((variances.fixture / totalVar) * 10000) / 100 : 0,
      runout_pct: totalVar > 0
        ? Math.round((variances.runout / totalVar) * 10000) / 100 : 0,
      gage_pct: totalVar > 0
        ? Math.round((variances.gage / totalVar) * 10000) / 100 : 0,
    };

    // Tolerance
    const tolRange_um = (input.usl_mm - input.lsl_mm) * 1000;
    const nomCenter_um = ((input.usl_mm + input.lsl_mm) / 2) * 1000;

    // ── Monte Carlo simulation ──
    const allDims: number[] = [];
    const partStates: PartDimensionState[] = [];
    const spcPoints: SPCPoint[] = [];
    let firstOOS: number | null = null;
    let totalOOS = 0;

    // Sample at intervals to avoid excessive computation
    const sampleInterval = Math.max(1, Math.floor(qty / 50));

    let subgroupDims: number[] = [];
    let subgroupIdx = 0;

    for (let part = 0; part < qty; part++) {
      const t_hr = part * cycleTime_hr;

      // Systematic drifts
      const thermal = this.thermalDrift(
        t_hr, thermalAmp, thermalCycle, thermalCoeff,
      );
      const wear = this.wearDrift(
        part, wearRate, changeInterval, compInterval,
      );

      // Simulate multiple samples for this part position
      const partDims: number[] = [];
      for (let s = 0; s < mcPerPart; s++) {
        const machNoise = sigMachine * this.normalRandom();
        const fixNoise = sigFixture * this.normalRandom();
        const runNoise = sigRunout * this.normalRandom();
        const forceVar = sigForce * this.normalRandom();
        const deflNoise = forceVar / toolStiffness;
        const hardNoise = sigHardness * this.normalRandom();
        const gageNoise = sigGage * this.normalRandom();

        const dim_um = nomCenter_um + machAccuracy + thermal + wear
          + nomDeflection_um + machNoise + fixNoise + runNoise
          + deflNoise + hardNoise + gageNoise;

        partDims.push(dim_um);
        allDims.push(dim_um);
      }

      // Check OOS
      const usl_um = input.usl_mm * 1000;
      const lsl_um = input.lsl_mm * 1000;
      const oosCount = partDims.filter(d => d < lsl_um || d > usl_um).length;
      if (oosCount > 0 && firstOOS === null) firstOOS = part + 1;
      totalOOS += oosCount;

      // SPC subgroup tracking (use first sample as representative)
      subgroupDims.push(partDims[0]);
      if (subgroupDims.length >= subgroupSize) {
        const xBar = subgroupDims.reduce((a, b) => a + b, 0)
          / subgroupDims.length;
        const range = Math.max(...subgroupDims) - Math.min(...subgroupDims);
        spcPoints.push({
          subgroup: ++subgroupIdx,
          x_bar_mm: Math.round((xBar / 1000) * 10000) / 10000,
          range_um: Math.round(range * 100) / 100,
        });
        subgroupDims = [];
      }

      // Record state at sample intervals
      if (part % sampleInterval === 0 || part === qty - 1) {
        const pMean = partDims.reduce((a, b) => a + b, 0) / partDims.length;
        const pVar = partDims.reduce((a, b) =>
          a + (b - pMean) ** 2, 0) / (partDims.length - 1);
        const pStd = Math.sqrt(pVar);
        const pCpk = pStd > 0
          ? Math.min(
              (usl_um - pMean) / (3 * pStd),
              (pMean - lsl_um) / (3 * pStd),
            )
          : Infinity;
        const inSpec = partDims.filter(
          d => d >= lsl_um && d <= usl_um,
        ).length / partDims.length * 100;

        partStates.push({
          part_number: part + 1,
          mean_mm: Math.round((pMean / 1000) * 10000) / 10000,
          std_um: Math.round(pStd * 100) / 100,
          cpk: Math.round(pCpk * 100) / 100,
          in_spec_pct: Math.round(inSpec * 10) / 10,
        });
      }
    }

    // Overall statistics
    const overallMean = allDims.reduce((a, b) => a + b, 0) / allDims.length;
    const overallVar = allDims.reduce(
      (a, b) => a + (b - overallMean) ** 2, 0,
    ) / (allDims.length - 1);
    const overallSigma = Math.sqrt(overallVar);
    const usl_um = input.usl_mm * 1000;
    const lsl_um = input.lsl_mm * 1000;

    const cp = overallSigma > 0 ? tolRange_um / (6 * overallSigma) : Infinity;
    const cpk = overallSigma > 0
      ? Math.min(
          (usl_um - overallMean) / (3 * overallSigma),
          (overallMean - lsl_um) / (3 * overallSigma),
        )
      : Infinity;

    const pctInSpec = 100 - (totalOOS / allDims.length) * 100;

    // Optimal correction interval: minimize max drift within tolerance
    const maxAllowedDrift = tolRange_um * 0.1; // 10% of tolerance
    const recInterval = wearRate > 0
      ? Math.max(1, Math.floor(maxAllowedDrift / wearRate))
      : changeInterval;

    // Warnings
    if (cpk < 1.0) {
      warnings.push("Process NOT capable (Cpk<1.0) — reduce variation");
    }
    if (varianceBreakdown.wear_pct > 40) {
      warnings.push(
        "Tool wear dominates variance (>" +
        Math.round(varianceBreakdown.wear_pct) +
        "%) — increase compensation frequency",
      );
    }
    if (varianceBreakdown.thermal_pct > 30) {
      warnings.push("Thermal drift significant — add temperature compensation");
    }

    return {
      part_states: partStates,
      overall_cpk: Math.round(cpk * 100) / 100,
      overall_cp: Math.round(cp * 100) / 100,
      overall_mean_mm: Math.round((overallMean / 1000) * 10000) / 10000,
      overall_sigma_um: Math.round(overallSigma * 100) / 100,
      first_oos_part: firstOOS,
      pct_in_spec: Math.round(pctInSpec * 100) / 100,
      expected_defect_ppm: this.ppmFromCpk(Math.max(0, cpk)),
      variance_breakdown: varianceBreakdown,
      recommended_correction_interval: recInterval,
      spc_points: spcPoints,
      warnings,
      formula: "dim(t,i)=nom+α·A·sin(2πt/T)+k_wear·part_in_window" +
        "+δ_defl+Σε_random; " +
        "σ²_total=σ²_mach+σ²_therm+σ²_wear+σ²_defl" +
        "+σ²_fix+σ²_run+σ²_gage; " +
        "Cp=(USL-LSL)/(6σ); Cpk=min[(USL-µ)/(3σ),(µ-LSL)/(3σ)]",
    };
  }
}

export const stochasticDimensionalEngine = new StochasticDimensionalEngine();
