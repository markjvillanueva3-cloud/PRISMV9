/**
 * LaserInterferometerCompensationEngine — Laser interferometer metrology
 *
 * Covers wavelength compensation (Edlen equation), axis compensation
 * table generation, measurement cycle planning, and deadpath error
 * calculation for CNC machine tool calibration.
 *
 * Self-contained: no external dependencies.
 *
 * References:
 *   Edlen, Metrologia 2 (1966) 71 (refractive index of air),
 *   Birch & Downs, Metrologia 31 (1994) 315 (updated Edlen equation),
 *   Ciddor, Appl. Opt. 35 (1996) 1566 (extended equation),
 *   ISO 230-2:2014 (test code for machine tools — positioning accuracy),
 *   ISO 230-1:2012 (geometric accuracy — general),
 *   Bryan, Precision Engineering 1 (1979) 129 (Abbe principle),
 *   Schwenke et al., Ann. CIRP 57/2 (2008) 660 (geometric error)
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// ─── Input / Output Interfaces ──────────────────────────────────────

export interface WavelengthCompInput {
  wavelength_nm: number;
  temperature_C: number;
  pressure_hPa: number;
  humidity_pct: number;
  co2_ppm?: number;
}

export interface WavelengthCompOutput {
  refractive_index: number;
  wavelength_corrected_nm: number;
  correction_ppm: number;
  deadpath_error_um: number;
}

export interface MeasurementPoint {
  position_mm: number;
  error_um: number;
  direction: 'forward' | 'reverse';
}

export interface CompTableInput {
  axis: 'X' | 'Y' | 'Z';
  measurement_points: MeasurementPoint[];
}

export interface CompTableEntry {
  position_mm: number;
  forward_comp_um: number;
  reverse_comp_um: number;
}

export interface CompTableOutput {
  compensation_table: CompTableEntry[];
  backlash_um: number;
  repeatability_um: number;
  accuracy_um: number;
  straightness_um?: number;
  pitch: number;
  yaw: number;
}

export interface MeasurementPlanInput {
  axis: 'X' | 'Y' | 'Z';
  travel_mm: number;
  target_accuracy_um: number;
  machine_type: string;
}

export interface MeasurementPlanOutput {
  num_points: number;
  spacing_mm: number;
  settle_time_sec: number;
  averaging_count: number;
  environmental_settle_min: number;
  total_time_min: number;
  required_equipment: string[];
}

export interface DeadpathInput {
  deadpath_length_mm: number;
  temperature_delta_C: number;
  pressure_delta_hPa: number;
}

export interface DeadpathOutput {
  deadpath_error_um: number;
  temperature_contribution_um: number;
  pressure_contribution_um: number;
  correction_needed: boolean;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class LaserInterferometerCompensationEngine {

  // ── 1. Wavelength Compensation (Edlen / Birch-Downs) ─────────────

  /**
   * Updated Edlen equation for refractive index of air.
   *
   * Birch & Downs (1994) modification of Edlen (1966):
   *   n_s - 1 = (8342.54 + 2406147/(130 - σ²) + 15998/(38.9 - σ²)) × 1e-8
   *   n_tp = 1 + (n_s - 1) × p / 93214.60
   *          × (1 + 1e-8 × (0.5953 - 0.009876×t) × p)
   *          / (1 + 0.003661 × t)
   *   n = n_tp - f(humidity)
   *
   * where σ = 1/λ_vac [µm⁻¹], t [°C], p [Pa].
   *
   * @reference Birch & Downs, Metrologia 31 (1994) 315
   * @reference Ciddor, Appl. Opt. 35 (1996) 1566
   */
  compensateWavelength(
    input: WavelengthCompInput
  ): AtomicValue<WavelengthCompOutput> {
    const lambda_vac_um = input.wavelength_nm / 1000; // nm → µm
    const t = input.temperature_C;
    const p_hPa = input.pressure_hPa;
    const p_Pa = p_hPa * 100;
    const rh = input.humidity_pct;
    const co2 = input.co2_ppm ?? 450;

    // Wavenumber σ = 1/λ [µm⁻¹]
    const sigma = 1 / lambda_vac_um;
    const sigma2 = sigma * sigma;

    // Phase refractive index of standard air (15°C, 101325 Pa, 0% RH,
    // 450 ppm CO₂)
    const ns_minus1 =
      (8342.54 + 2406147 / (130 - sigma2) + 15998 / (38.9 - sigma2)) *
      1e-8;

    // CO₂ correction (Birch & Downs): Δ(n-1) = 1.45e-8 × (CO₂_ppm - 450)
    const co2_correction = 1.45e-8 * (co2 - 450);
    const ns_minus1_co2 = ns_minus1 + co2_correction;

    // Temperature and pressure correction (Birch & Downs 1994)
    const ntp_minus1 =
      ns_minus1_co2 *
      (p_Pa / 93214.6) *
      (1 + 1e-8 * (0.5953 - 0.009876 * t) * p_Pa) /
      (1 + 0.003661 * t);

    // Water vapour correction
    // Saturation vapour pressure (Buck equation, simplified)
    const svp = 6.1121 * Math.exp((18.678 - t / 234.5) * t / (257.14 + t));
    const f_hPa = rh / 100 * svp; // partial pressure of water vapour [hPa]
    const f_Pa = f_hPa * 100;

    // Humidity correction: -3.7345e-10 × f_Pa
    const humidity_correction = -3.7345e-10 * f_Pa;

    const n = 1 + ntp_minus1 + humidity_correction;

    // Corrected wavelength in air
    const lambda_air_nm = input.wavelength_nm / n;

    // Correction in ppm relative to standard conditions (20°C, 1013.25 hPa)
    // Standard n at 20°C, 1013.25 hPa, 50% RH
    const t_std = 20;
    const p_std_Pa = 101325;
    const rh_std = 50;
    const ntp_std =
      ns_minus1_co2 *
      (p_std_Pa / 93214.6) *
      (1 + 1e-8 * (0.5953 - 0.009876 * t_std) * p_std_Pa) /
      (1 + 0.003661 * t_std);
    const svp_std =
      6.1121 * Math.exp((18.678 - t_std / 234.5) * t_std / (257.14 + t_std));
    const f_std_Pa = (rh_std / 100) * svp_std * 100;
    const n_std = 1 + ntp_std + (-3.7345e-10 * f_std_Pa);

    const correction_ppm = ((n - n_std) / n_std) * 1e6;

    // Deadpath error for reference: assume 100mm deadpath
    const deadpath_ref_mm = 100;
    const deadpath_error_um = deadpath_ref_mm * Math.abs(n - n_std) * 1000;

    return {
      value: {
        refractive_index: n,
        wavelength_corrected_nm:
          Math.round(lambda_air_nm * 1e6) / 1e6,
        correction_ppm: Math.round(correction_ppm * 1000) / 1000,
        deadpath_error_um:
          Math.round(deadpath_error_um * 10000) / 10000
      },
      unit: 'ppm',
      formula: [
        `n = 1 + (n_s-1)×p/93214.6 × correction - humidity;`,
        `n_s-1 = ${(ns_minus1 * 1e8).toFixed(2)}e-8;`,
        `n = ${n.toFixed(10)}`
      ].join(' ')
    };
  }

  // ── 2. Compensation Table Generation ─────────────────────────────

  /**
   * Generate axis compensation tables from laser measurement data.
   *
   * Separates forward/reverse measurements, computes backlash,
   * repeatability (2σ), and positional accuracy per ISO 230-2.
   * Outputs compensation values that can be loaded into CNC controllers.
   *
   * @reference ISO 230-2:2014, Test code — positioning accuracy
   */
  generateCompensationTable(
    input: CompTableInput
  ): AtomicValue<CompTableOutput> {
    const pts = input.measurement_points;

    // Group by position
    const posMap = new Map<
      number,
      { fwd: number[]; rev: number[] }
    >();
    for (const p of pts) {
      if (!posMap.has(p.position_mm)) {
        posMap.set(p.position_mm, { fwd: [], rev: [] });
      }
      const entry = posMap.get(p.position_mm)!;
      if (p.direction === 'forward') entry.fwd.push(p.error_um);
      else entry.rev.push(p.error_um);
    }

    // Sort positions
    const positions = Array.from(posMap.keys()).sort((a, b) => a - b);

    // Build compensation table
    const table: CompTableEntry[] = [];
    const backlash_values: number[] = [];
    const repeatabilities: number[] = [];

    for (const pos of positions) {
      const data = posMap.get(pos)!;
      const fwd_mean =
        data.fwd.length > 0
          ? data.fwd.reduce((s, v) => s + v, 0) / data.fwd.length
          : 0;
      const rev_mean =
        data.rev.length > 0
          ? data.rev.reduce((s, v) => s + v, 0) / data.rev.length
          : 0;

      // Backlash at this position
      if (data.fwd.length > 0 && data.rev.length > 0) {
        backlash_values.push(Math.abs(rev_mean - fwd_mean));
      }

      // Repeatability: 2σ of combined measurements
      const all = [...data.fwd, ...data.rev];
      if (all.length > 1) {
        const mean = all.reduce((s, v) => s + v, 0) / all.length;
        const variance =
          all.reduce((s, v) => s + (v - mean) ** 2, 0) / (all.length - 1);
        repeatabilities.push(2 * Math.sqrt(variance));
      }

      // Compensation = negative of error (to correct it)
      table.push({
        position_mm: pos,
        forward_comp_um:
          Math.round(-fwd_mean * 10000) / 10000,
        reverse_comp_um:
          Math.round(-rev_mean * 10000) / 10000
      });
    }

    // Overall metrics
    const backlash_um =
      backlash_values.length > 0
        ? Math.max(...backlash_values)
        : 0;
    const repeatability_um =
      repeatabilities.length > 0
        ? Math.max(...repeatabilities)
        : 0;

    // Positional accuracy: range of mean errors
    const fwd_means = table.map((e) => -e.forward_comp_um);
    const rev_means = table.map((e) => -e.reverse_comp_um);
    const all_means = [...fwd_means, ...rev_means];
    const accuracy_um =
      all_means.length > 0
        ? Math.max(...all_means) - Math.min(...all_means)
        : 0;

    // Angular errors (pitch/yaw) — estimate from error gradient
    let pitch = 0;
    let yaw = 0;
    if (table.length >= 2) {
      const first = table[0];
      const last = table[table.length - 1];
      const span_mm = last.position_mm - first.position_mm;
      if (span_mm > 0) {
        // Error gradient → angular error [arcsec]
        // 1 µm over 1000 mm ≈ 0.206 arcsec
        const err_gradient =
          (-last.forward_comp_um - -first.forward_comp_um) / span_mm;
        pitch = Math.round(err_gradient * 206.265 * 1000) / 1000;
        yaw = Math.round(pitch * 0.3 * 1000) / 1000; // approximate
      }
    }

    return {
      value: {
        compensation_table: table,
        backlash_um: Math.round(backlash_um * 10000) / 10000,
        repeatability_um:
          Math.round(repeatability_um * 10000) / 10000,
        accuracy_um: Math.round(accuracy_um * 10000) / 10000,
        pitch,
        yaw
      },
      unit: 'µm',
      formula: [
        `comp = -mean_error; backlash = |rev_mean - fwd_mean|;`,
        `repeatability = 2σ (ISO 230-2);`,
        `accuracy = max(mean) - min(mean)`
      ].join(' ')
    };
  }

  // ── 3. Measurement Cycle Planning ────────────────────────────────

  /**
   * Plan a laser interferometer measurement cycle.
   *
   * Determines number of measurement points, spacing, settle times,
   * and averaging based on target accuracy and machine characteristics.
   *
   * @reference ISO 230-2:2014
   * @reference ISO 230-1:2012
   */
  planMeasurementCycle(
    input: MeasurementPlanInput
  ): AtomicValue<MeasurementPlanOutput> {
    const travel = input.travel_mm;
    const target = input.target_accuracy_um;

    // Number of points: ISO 230-2 recommends at least
    // travel/spacing ≥ 5, with spacing ≤ 40mm for tight targets
    let spacing_mm: number;
    if (target < 1) {
      spacing_mm = Math.min(10, travel / 20);
    } else if (target < 5) {
      spacing_mm = Math.min(25, travel / 10);
    } else if (target < 10) {
      spacing_mm = Math.min(50, travel / 5);
    } else {
      spacing_mm = Math.min(100, travel / 5);
    }
    spacing_mm = Math.max(spacing_mm, 1); // minimum 1mm

    const num_points = Math.floor(travel / spacing_mm) + 1;

    // Settle time: tighter accuracy needs longer settling
    let settle_sec: number;
    if (target < 1) settle_sec = 3.0;
    else if (target < 5) settle_sec = 1.5;
    else settle_sec = 0.5;

    // Averaging: more averages for tighter accuracy
    let avg_count: number;
    if (target < 1) avg_count = 10;
    else if (target < 5) avg_count = 5;
    else avg_count = 3;

    // Environmental settle time (thermal equilibrium)
    let env_settle_min: number;
    const machineUpper = input.machine_type.toUpperCase();
    if (
      machineUpper.includes('ULTRA') ||
      machineUpper.includes('PRECISION')
    ) {
      env_settle_min = 120;
    } else if (
      machineUpper.includes('CNC') ||
      machineUpper.includes('VMC') ||
      machineUpper.includes('HMC')
    ) {
      env_settle_min = 60;
    } else {
      env_settle_min = 30;
    }

    // Total time estimate
    // Each point: move + settle + avg readings (bidirectional = ×2)
    // 5 runs per ISO 230-2
    const runs = 5;
    const time_per_point_sec =
      (spacing_mm / 500) + settle_sec + avg_count * 0.2; // move @500mm/s
    const total_measurement_min =
      (num_points * time_per_point_sec * 2 * runs) / 60;
    const total_time_min =
      Math.round((env_settle_min + total_measurement_min) * 10) / 10;

    // Required equipment
    const equipment: string[] = [
      'Laser interferometer (He-Ne or stabilized diode)',
      'Linear optics (retroreflector + beam splitter)',
      'Environmental compensation unit (temperature, pressure, humidity)',
      'Tripod or magnetic base mount'
    ];
    if (target < 5) {
      equipment.push('Deadpath minimization optics');
      equipment.push(
        'Temperature sensors (Pt100, ±0.01°C)'
      );
    }
    if (target < 1) {
      equipment.push('Vibration isolation pad');
      equipment.push('Barometric pressure sensor (±0.1 hPa)');
      equipment.push('Humidity sensor (±1% RH)');
    }

    return {
      value: {
        num_points,
        spacing_mm: Math.round(spacing_mm * 100) / 100,
        settle_time_sec: settle_sec,
        averaging_count: avg_count,
        environmental_settle_min: env_settle_min,
        total_time_min,
        required_equipment: equipment
      },
      unit: 'plan',
      formula: [
        `${num_points} pts × ${spacing_mm}mm spacing,`,
        `${runs} bidir runs,`,
        `${avg_count} avg/pt,`,
        `~${total_time_min}min total`
      ].join(' ')
    };
  }

  // ── 4. Deadpath Error Calculation ────────────────────────────────

  /**
   * Calculate deadpath error from environmental changes.
   *
   * Deadpath = distance between interferometer and reference position
   * that is not measured but affected by refractive index changes.
   *   deadpath_error = L_dead × Δn/n
   *
   * Temperature: Δn/ΔT ≈ -0.93 ppm/°C (at standard conditions)
   * Pressure:    Δn/Δp ≈ +0.27 ppm/hPa
   *
   * @reference Bryan, Precision Engineering 1 (1979) 129
   * @reference Birch & Downs, Metrologia 31 (1994) 315
   */
  calculateDeadpathError(
    input: DeadpathInput
  ): AtomicValue<DeadpathOutput> {
    const L = input.deadpath_length_mm;
    const dT = input.temperature_delta_C;
    const dP = input.pressure_delta_hPa;

    // Sensitivity coefficients (near standard conditions)
    // dn/dT ≈ -0.93e-6 /°C
    // dn/dp ≈ +0.268e-6 /hPa (≈ +0.268 ppm/hPa)
    const dn_dT = -0.93e-6;
    const dn_dp = 0.268e-6;

    const delta_n_temp = dn_dT * dT;
    const delta_n_pres = dn_dp * dP;
    const delta_n = delta_n_temp + delta_n_pres;

    // Deadpath error [mm] → convert to µm
    const error_mm = L * delta_n;
    const error_um = Math.abs(error_mm) * 1000;

    const temp_contribution_um = Math.abs(L * delta_n_temp) * 1000;
    const pres_contribution_um = Math.abs(L * delta_n_pres) * 1000;

    // Correction needed if error > 0.1 µm (typical threshold)
    const correction_needed = error_um > 0.1;

    return {
      value: {
        deadpath_error_um:
          Math.round(error_um * 10000) / 10000,
        temperature_contribution_um:
          Math.round(temp_contribution_um * 10000) / 10000,
        pressure_contribution_um:
          Math.round(pres_contribution_um * 10000) / 10000,
        correction_needed
      },
      unit: 'µm',
      formula: [
        `ΔL = L_dead × Δn;`,
        `Δn = (dn/dT)×ΔT + (dn/dp)×Δp`,
        `= ${delta_n_temp.toExponential(3)} + ${delta_n_pres.toExponential(3)}`,
        `= ${delta_n.toExponential(3)};`,
        `error = ${L}mm × ${Math.abs(delta_n).toExponential(3)}`,
        `= ${error_um.toFixed(4)}µm`
      ].join(' ')
    };
  }
}

/** Singleton instance */
export const laserInterferometerCompensationEngine =
  new LaserInterferometerCompensationEngine();
