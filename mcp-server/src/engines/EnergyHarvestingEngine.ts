/**
 * EnergyHarvestingEngine — Energy harvesting from machining processes
 *
 * Models piezoelectric, thermoelectric, and electromagnetic energy harvesting
 * from cutting vibrations, thermal gradients, and spindle/tool motion. Includes
 * process energy budget analysis, hybrid system design, and ROI comparison.
 *
 * Self-contained: no external dependencies. Monte Carlo uncertainty via
 * Latin Hypercube Sampling on piezo/thermo material properties (CV=10-15%).
 *
 * References:
 *   Roundy, "Energy Scavenging for Wireless Sensor Networks" (Springer, 2004),
 *   Priya & Inman, "Energy Harvesting Technologies" (Springer, 2009),
 *   Erturk & Inman, "Piezoelectric Energy Harvesting" (Wiley, 2011),
 *   Rowe, "Thermoelectrics Handbook" (CRC, 2006),
 *   Stephen, "On energy harvesting from ambient vibration" J. Sound Vib. 293 (2006),
 *   Wright et al., "A piezoelectric vibration based generator for wireless electronics"
 *     Smart Mater. Struct. 13 (2004) 1131-1142,
 *   Meninger et al., IEEE Trans. VLSI Syst. 9 (2001) 64-76 (conditioning losses)
 */

// ─── Types ─────────────────────────────────────────────────────

/** Standard PRISM return wrapper with generic payload. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// ─── Input / Output Interfaces ─────────────────────────────────

export interface PiezoHarvestInput {
  /** Piezo material identifier */
  material: 'PZT-5A' | 'PZT-5H' | 'PVDF' | 'AlN';
  /** Applied stress amplitude in MPa */
  stress_MPa: number;
  /** Vibration frequency in Hz */
  frequency_Hz: number;
  /** Piezo element thickness in mm */
  thickness_mm: number;
  /** Electrode area in mm² */
  area_mm2: number;
  /** Load resistance in ohms (auto-optimized if omitted) */
  load_resistance_ohm?: number;
  /** Number of Monte Carlo samples for uncertainty (default 500) */
  mc_samples?: number;
}

export interface PiezoHarvestOutput {
  power_mW: number;
  voltage_V: number;
  optimal_load_ohm: number;
  capacitance_nF: number;
  open_circuit_voltage_V: number;
  power_density_mW_cm3: number;
  mc_power_std_mW?: number;
}

export interface ThermoHarvestInput {
  /** Thermoelectric material */
  material: 'Bi2Te3' | 'PbTe' | 'SiGe';
  /** Hot-side temperature in °C */
  T_hot_C: number;
  /** Cold-side temperature in °C */
  T_cold_C: number;
  /** Number of thermocouple pairs */
  n_couples: number;
  /** Internal resistance per couple in ohms (default 2) */
  R_couple_ohm?: number;
  /** Monte Carlo samples (default 500) */
  mc_samples?: number;
}

export interface ThermoHarvestOutput {
  power_mW: number;
  efficiency_pct: number;
  ZT_effective: number;
  voltage_V: number;
  carnot_efficiency_pct: number;
  optimal_load_ohm: number;
  mc_power_std_mW?: number;
}

export interface EMHarvestInput {
  /** Number of coil turns */
  n_turns: number;
  /** Magnetic flux density in T */
  B_tesla: number;
  /** Coil cross-section area in mm² */
  coil_area_mm2: number;
  /** Vibration frequency in Hz */
  frequency_Hz: number;
  /** Coil resistance in ohms */
  R_coil_ohm: number;
  /** Load resistance in ohms (auto-optimized if omitted) */
  R_load_ohm?: number;
  /** Coil inductance in mH (for bandwidth calc) */
  inductance_mH?: number;
}

export interface EMHarvestOutput {
  power_mW: number;
  voltage_V: number;
  bandwidth_Hz: number;
  emf_peak_V: number;
  optimal_load_ohm: number;
  resonant_frequency_Hz: number;
}

export interface ProcessBudgetInput {
  /** Cutting power in W */
  cutting_power_W: number;
  /** Workpiece material class */
  material_class: 'steel' | 'aluminum' | 'titanium' | 'cast_iron' | 'stainless';
  /** Vibration amplitude in g (acceleration) */
  vibration_g?: number;
  /** Tool-workpiece temperature difference in °C */
  delta_T_C?: number;
  /** Sensor node power requirement in mW (default 5) */
  sensor_node_mW?: number;
}

export interface ProcessBudgetOutput {
  total_input_W: number;
  chip_energy_W: number;
  workpiece_energy_W: number;
  tool_energy_W: number;
  friction_energy_W: number;
  harvestable_vibration_mW: number;
  harvestable_thermal_mW: number;
  total_harvestable_mW: number;
  sensor_nodes_powerable: number;
  partition: { chip_pct: number; workpiece_pct: number; tool_pct: number; friction_pct: number };
}

export interface HybridHarvestInput {
  /** Piezo harvester output in mW (0 if not used) */
  piezo_mW: number;
  /** Thermoelectric harvester output in mW (0 if not used) */
  thermo_mW: number;
  /** Electromagnetic harvester output in mW (0 if not used) */
  em_mW: number;
  /** Power conditioning efficiency 0-1 (default 0.80) */
  conditioning_efficiency?: number;
  /** Required autonomy period in hours (for storage sizing) */
  autonomy_hours?: number;
  /** Average load in mW */
  load_mW?: number;
}

export interface HybridHarvestOutput {
  gross_power_mW: number;
  net_power_mW: number;
  conditioning_loss_mW: number;
  recommended_storage_F: number;
  storage_energy_J: number;
  autonomy_achievable_hours: number;
  sources_active: number;
}

export interface HarvestROIInput {
  /** Total harvested net power in mW */
  harvest_net_mW: number;
  /** Number of sensor nodes powered */
  n_nodes: number;
  /** Harvesting system cost in USD */
  harvester_cost_usd: number;
  /** Battery replacement cost per node per year in USD (default 25) */
  battery_cost_per_node_yr_usd?: number;
  /** Wired power cost per node in USD (default 200) */
  wired_cost_per_node_usd?: number;
  /** Annual electricity cost per node in USD (default 5) */
  electricity_per_node_yr_usd?: number;
  /** Discount rate for NPV (default 0.08) */
  discount_rate?: number;
  /** Analysis period in years (default 5) */
  years?: number;
}

export interface HarvestROIOutput {
  breakeven_months: number;
  recommended: 'harvesting' | 'battery' | 'wired';
  annual_savings_usd: number;
  npv_harvesting_usd: number;
  npv_battery_usd: number;
  npv_wired_usd: number;
  five_year_co2_saved_kg: number;
}

// ─── Material Databases ────────────────────────────────────────

interface PiezoMaterial {
  d33_pC_N: number;   // piezoelectric charge constant
  g33_Vm_N: number;   // piezoelectric voltage constant
  epsilon_33: number;  // relative permittivity
  k33: number;         // coupling coefficient
  density_kg_m3: number;
  cv_d33: number;      // coefficient of variation for MC
}

interface ThermoMaterial {
  alpha_uV_K: number;  // Seebeck coefficient µV/K
  ZT_300K: number;     // figure of merit at 300K
  rho_uOhm_m: number;  // electrical resistivity µΩ·m
  T_max_C: number;     // max operating temperature
  cv_alpha: number;     // CV for MC
}

const PIEZO_DB: Record<string, PiezoMaterial> = {
  'PZT-5A': { d33_pC_N: 374, g33_Vm_N: 24.8e-3, epsilon_33: 1700, k33: 0.705, density_kg_m3: 7750, cv_d33: 0.10 },
  'PZT-5H': { d33_pC_N: 593, g33_Vm_N: 19.7e-3, epsilon_33: 3400, k33: 0.752, density_kg_m3: 7500, cv_d33: 0.12 },
  'PVDF':   { d33_pC_N: 33,  g33_Vm_N: 216e-3,   epsilon_33: 12,   k33: 0.12,  density_kg_m3: 1780, cv_d33: 0.15 },
  'AlN':    { d33_pC_N: 5.5, g33_Vm_N: 3.4e-3,    epsilon_33: 10.4, k33: 0.24,  density_kg_m3: 3260, cv_d33: 0.10 },
};

const THERMO_DB: Record<string, ThermoMaterial> = {
  'Bi2Te3': { alpha_uV_K: 200, ZT_300K: 1.0, rho_uOhm_m: 10,  T_max_C: 250,  cv_alpha: 0.10 },
  'PbTe':   { alpha_uV_K: 260, ZT_300K: 1.5, rho_uOhm_m: 22,  T_max_C: 600,  cv_alpha: 0.12 },
  'SiGe':   { alpha_uV_K: 140, ZT_300K: 0.9, rho_uOhm_m: 100, T_max_C: 1000, cv_alpha: 0.15 },
};

/** Energy partition coefficients by material class [chip, workpiece, tool, friction] */
const PARTITION_DB: Record<string, [number, number, number, number]> = {
  'steel':      [0.75, 0.10, 0.08, 0.07],
  'aluminum':   [0.80, 0.08, 0.05, 0.07],
  'titanium':   [0.50, 0.25, 0.15, 0.10],
  'cast_iron':  [0.78, 0.09, 0.06, 0.07],
  'stainless':  [0.60, 0.18, 0.12, 0.10],
};

// ─── Helpers ───────────────────────────────────────────────────

const EPS_0 = 8.854e-12; // F/m, vacuum permittivity

/**
 * Seeded pseudo-random number generator (Mulberry32).
 * Deterministic for reproducibility in tests.
 */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Latin Hypercube Sampling — generates N samples in [0,1]
 * for improved coverage vs pure MC.
 */
function lhsSamples(n: number, rng: () => number): number[] {
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    samples.push((i + rng()) / n);
  }
  // Shuffle
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = samples[i];
    samples[i] = samples[j];
    samples[j] = tmp;
  }
  return samples;
}

/**
 * Inverse normal CDF (Beasley-Springer-Moro approximation).
 */
function invNorm(p: number): number {
  const a = [
    -3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838e0, -2.549732539343734e0,
    4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996e0, 3.754408661907416e0,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

/** Standard deviation of a numeric array */
function stddev(arr: number[]): number {
  const n = arr.length;
  if (n < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

// ─── Engine Class ───────────────────────────────────────────────────

/**
 * EnergyHarvestingEngine provides physics-based models for piezoelectric,
 * thermoelectric, and electromagnetic energy harvesting from machining
 * processes. Includes process energy budget, hybrid system design, and
 * 5-year NPV ROI analysis for harvesting vs battery vs wired power.
 *
 * All methods return `AtomicValue<T>` with units, governing formula,
 * and confidence (0-1 based on MC uncertainty where applicable).
 */
export class EnergyHarvestingEngine {
  // ──── 1. Piezoelectric Harvesting ──────────────────────────────────

  /**
   * Models piezoelectric energy harvesting from machining vibrations.
   *
   * Physics:
   *   V_oc = g33 · σ · t         (open-circuit voltage, Erturk & Inman eq. 3.21)
   *   C_p  = ε33 · ε0 · A / t   (piezo capacitance)
   *   R_opt = 1 / (2πfC_p)      (impedance-matched load, Roundy eq. 4.12)
   *   P    = V_oc² / (4·R_opt)  (maximum power at matched load)
   *
   * Monte Carlo uncertainty on d33 and g33 with CV=10-15% (material-dependent).
   *
   * @param input - Piezo material, stress, frequency, geometry
   * @returns AtomicValue with PiezoHarvestOutput
   */
  piezoHarvest(input: PiezoHarvestInput): AtomicValue<PiezoHarvestOutput> {
    const mat = PIEZO_DB[input.material];
    if (!mat) {
      throw new Error(`Unknown piezo material: ${input.material}. Valid: ${Object.keys(PIEZO_DB).join(', ')}`);
    }
    if (input.stress_MPa <= 0) throw new Error('stress_MPa must be > 0');
    if (input.frequency_Hz <= 0) throw new Error('frequency_Hz must be > 0');
    if (input.thickness_mm <= 0) throw new Error('thickness_mm must be > 0');
    if (input.area_mm2 <= 0) throw new Error('area_mm2 must be > 0');

    const t_m = input.thickness_mm * 1e-3;     // thickness in m
    const A_m2 = input.area_mm2 * 1e-6;        // area in m²
    const sigma = input.stress_MPa * 1e6;       // stress in Pa
    const f = input.frequency_Hz;

    // Open-circuit voltage: V_oc = g33 · σ · t
    const V_oc = mat.g33_Vm_N * sigma * t_m;

    // Capacitance: C_p = ε33 · ε0 · A / t
    const C_p = mat.epsilon_33 * EPS_0 * A_m2 / t_m;

    // Optimal load resistance: R_opt = 1/(2πfCp)
    const R_opt = 1 / (2 * Math.PI * f * C_p);

    const R_load = input.load_resistance_ohm ?? R_opt;

    // Power with arbitrary load: P = V_oc² · R_load / (R_opt + R_load)² · (1/(4R_opt)) simplification
    // More precisely: P = (V_oc² / 2) · R_load / ((R_load + R_opt)² + (R_load * R_opt * 2*π*f*C_p)²)
    // At matched load: P_max = V_oc² / (4 · R_opt)
    // General: P = V_oc² · R_load / (R_load + 1/(2πfCp))²  (simplified resistive model)
    const denom = (R_load + R_opt) ** 2;
    const P_watts = (V_oc ** 2 * R_load) / denom;
    const P_mW = P_watts * 1e3;

    // Voltage across load
    const V_load = V_oc * R_load / (R_load + R_opt);

    // Volume for power density
    const vol_cm3 = (A_m2 * t_m) * 1e6; // m³ → cm³
    const power_density = vol_cm3 > 0 ? P_mW / vol_cm3 : 0;

    // Monte Carlo uncertainty
    const MAX_TRIALS = 100_000;
    const nmc = Math.min(input.mc_samples ?? 500, MAX_TRIALS);
    const rng = mulberry32(42);
    const uSamples = lhsSamples(nmc, rng);
    const mcPowers: number[] = [];
    for (let i = 0; i < nmc; i++) {
      const g33_sample = mat.g33_Vm_N * (1 + mat.cv_d33 * invNorm(Math.max(1e-6, Math.min(1 - 1e-6, uSamples[i]))));
      const eps_sample = mat.epsilon_33 * (1 + mat.cv_d33 * invNorm(Math.max(1e-6, Math.min(1 - 1e-6, rng()))));
      const Voc_s = g33_sample * sigma * t_m;
      const Cp_s = eps_sample * EPS_0 * A_m2 / t_m;
      const Ropt_s = 1 / (2 * Math.PI * f * Cp_s);
      const Rl_s = input.load_resistance_ohm ?? Ropt_s;
      const P_s = (Voc_s ** 2 * Rl_s) / ((Rl_s + Ropt_s) ** 2);
      mcPowers.push(P_s * 1e3);
    }
    const mc_std = stddev(mcPowers);

    return {
      value: {
        power_mW: +P_mW.toFixed(4),
        voltage_V: +V_load.toFixed(4),
        optimal_load_ohm: +R_opt.toFixed(1),
        capacitance_nF: +(C_p * 1e9).toFixed(3),
        open_circuit_voltage_V: +V_oc.toFixed(4),
        power_density_mW_cm3: +power_density.toFixed(4),
        mc_power_std_mW: +mc_std.toFixed(4),
      },
      unit: 'mW',
      formula: 'V_oc=g33·σ·t; C_p=ε33·ε0·A/t; R_opt=1/(2πfCp); P=V²·R_L/(R_L+R_opt)²',
      confidence: Math.max(0.5, 1 - mc_std / Math.max(P_mW, 1e-9)),
    };
  }

  // ──── 2. Thermoelectric Harvesting ─────────────────────────────────

  /**
   * Models thermoelectric generator (TEG) power from cutting zone thermal
   * gradients using the Seebeck effect.
   *
   * Physics:
   *   V = n · α · ΔT                              (Seebeck voltage, Rowe ch.1)
   *   P_max = (n·α·ΔT)² / (4·R_int)              (matched-load power)
   *   η = η_Carnot · (√(1+ZT)-1) / (√(1+ZT)+Tc/Th)  (real TEG efficiency, Ioffe)
   *
   * Monte Carlo on Seebeck coefficient α with CV=10-15%.
   *
   * @param input - TEG material, temperatures, couple count
   * @returns AtomicValue with ThermoHarvestOutput
   */
  thermoHarvest(input: ThermoHarvestInput): AtomicValue<ThermoHarvestOutput> {
    const mat = THERMO_DB[input.material];
    if (!mat) {
      throw new Error(`Unknown thermo material: ${input.material}. Valid: ${Object.keys(THERMO_DB).join(', ')}`);
    }
    if (input.T_hot_C <= input.T_cold_C) throw new Error('T_hot_C must be > T_cold_C');
    if (input.n_couples <= 0) throw new Error('n_couples must be > 0');

    const Th = input.T_hot_C + 273.15;  // K
    const Tc = input.T_cold_C + 273.15; // K
    const dT = Th - Tc;
    const n = input.n_couples;
    const alpha = mat.alpha_uV_K * 1e-6; // V/K
    const R_couple = input.R_couple_ohm ?? 2;
    const R_int = n * R_couple;

    // Open-circuit voltage
    const V_oc = n * alpha * dT;

    // Maximum power at matched load
    const P_max = (V_oc ** 2) / (4 * R_int);
    const P_mW = P_max * 1e3;

    // Carnot and real efficiency
    const eta_carnot = 1 - Tc / Th;
    const ZT = mat.ZT_300K; // approximate at operating temp
    const sqrtZT = Math.sqrt(1 + ZT);
    const eta_real = eta_carnot * (sqrtZT - 1) / (sqrtZT + Tc / Th);

    // Monte Carlo
    const MAX_TRIALS = 100_000;
    const nmc = Math.min(input.mc_samples ?? 500, MAX_TRIALS);
    const rng = mulberry32(77);
    const uSamples = lhsSamples(nmc, rng);
    const mcPowers: number[] = [];
    for (let i = 0; i < nmc; i++) {
      const alpha_s = alpha * (1 + mat.cv_alpha * invNorm(Math.max(1e-6, Math.min(1 - 1e-6, uSamples[i]))));
      const Voc_s = n * alpha_s * dT;
      const P_s = (Voc_s ** 2) / (4 * R_int);
      mcPowers.push(P_s * 1e3);
    }
    const mc_std = stddev(mcPowers);

    return {
      value: {
        power_mW: +P_mW.toFixed(4),
        efficiency_pct: +(eta_real * 100).toFixed(3),
        ZT_effective: +ZT.toFixed(2),
        voltage_V: +(V_oc / 2).toFixed(4), // voltage at matched load = Voc/2
        carnot_efficiency_pct: +(eta_carnot * 100).toFixed(3),
        optimal_load_ohm: +R_int.toFixed(2),
        mc_power_std_mW: +mc_std.toFixed(4),
      },
      unit: 'mW',
      formula: 'V=n·α·ΔT; P_max=(nαΔT)²/(4R); η=η_C·(√(1+ZT)-1)/(√(1+ZT)+Tc/Th)',
      confidence: Math.max(0.5, 1 - mc_std / Math.max(P_mW, 1e-9)),
    };
  }

  // ──── 3. Electromagnetic Harvesting ────────────────────────────────

  /**
   * Models electromagnetic energy harvesting from cutting vibrations via
   * coil-magnet relative motion (Faraday induction).
   *
   * Physics:
   *   EMF_peak = N · B · A · ω           (Faraday's law, peak sinusoidal)
   *   P = EMF_rms² / (R_coil + R_load)   (average dissipated power)
   *   BW = R_total / (2π · L)            (electrical bandwidth, -3dB)
   *
   * Reference: Stephen, J. Sound Vib. 293 (2006) 409-425.
   *
   * @param input - Coil geometry, magnetic field, vibration frequency
   * @returns AtomicValue with EMHarvestOutput
   */
  emHarvest(input: EMHarvestInput): AtomicValue<EMHarvestOutput> {
    if (input.n_turns <= 0) throw new Error('n_turns must be > 0');
    if (input.B_tesla <= 0) throw new Error('B_tesla must be > 0');
    if (input.coil_area_mm2 <= 0) throw new Error('coil_area_mm2 must be > 0');
    if (input.frequency_Hz <= 0) throw new Error('frequency_Hz must be > 0');
    if (input.R_coil_ohm <= 0) throw new Error('R_coil_ohm must be > 0');

    const N = input.n_turns;
    const B = input.B_tesla;
    const A = input.coil_area_mm2 * 1e-6;  // m²
    const omega = 2 * Math.PI * input.frequency_Hz;
    const R_coil = input.R_coil_ohm;

    // Peak EMF: Faraday's law
    const EMF_peak = N * B * A * omega;
    const EMF_rms = EMF_peak / Math.SQRT2;

    // Optimal load = coil resistance (impedance matched)
    const R_load = input.R_load_ohm ?? R_coil;
    const R_total = R_coil + R_load;

    // Average power
    const P_watts = (EMF_rms ** 2 * R_load) / (R_total ** 2);
    const P_mW = P_watts * 1e3;

    // Voltage across load
    const V_load = EMF_rms * R_load / R_total;

    // Electrical bandwidth (3dB)
    const L = (input.inductance_mH ?? 10) * 1e-3; // default 10mH
    const BW = R_total / (2 * Math.PI * L);

    return {
      value: {
        power_mW: +P_mW.toFixed(4),
        voltage_V: +V_load.toFixed(4),
        bandwidth_Hz: +BW.toFixed(2),
        emf_peak_V: +EMF_peak.toFixed(4),
        optimal_load_ohm: +R_coil.toFixed(2),
        resonant_frequency_Hz: +input.frequency_Hz.toFixed(2),
      },
      unit: 'mW',
      formula: 'EMF=N·B·A·ω; P=EMF_rms²·R_L/(R_coil+R_L)²; BW=R/(2πL)',
      confidence: 0.85, // deterministic model, moderate confidence due to idealized assumptions
    };
  }

  // ──── 4. Process Energy Budget ─────────────────────────────────────

  /**
   * Partitions cutting energy into chip, workpiece, tool, and friction
   * components, then estimates harvestable energy from vibration and
   * thermal channels.
   *
   * Physics:
   *   Chip: 50-80% (Boothroyd & Knight, Fundamentals of Machining)
   *   Vibration harvestable: 0.1-1% of total (Priya & Inman)
   *   Thermal harvestable: 0.5-3% of workpiece/tool heat (Rowe)
   *
   * Material-specific partition coefficients from published calorimetric
   * studies (Komanduri & Hou, Shaw, Loewen & Shaw).
   *
   * @param input - Cutting power, material class, vibration/thermal data
   * @returns AtomicValue with ProcessBudgetOutput
   */
  processBudget(input: ProcessBudgetInput): AtomicValue<ProcessBudgetOutput> {
    if (input.cutting_power_W <= 0) throw new Error('cutting_power_W must be > 0');

    const partitions = PARTITION_DB[input.material_class];
    if (!partitions) {
      throw new Error(`Unknown material_class: ${input.material_class}. Valid: ${Object.keys(PARTITION_DB).join(', ')}`);
    }

    const P = input.cutting_power_W;
    const [chipFrac, wpFrac, toolFrac, fricFrac] = partitions;

    const chipW = P * chipFrac;
    const wpW = P * wpFrac;
    const toolW = P * toolFrac;
    const fricW = P * fricFrac;

    // Harvestable vibration energy: function of vibration amplitude
    // Base: 0.1% of total, enhanced by measured vibration level
    const vibG = input.vibration_g ?? 1.0;
    // Empirical: harvestable vibration scales with g², capped at 1%
    const vibFrac = Math.min(0.01, 0.001 * vibG ** 2);
    const harvVibMW = P * vibFrac * 1e3; // in mW

    // Harvestable thermal: function of ΔT
    // Base: 0.5% of (workpiece + tool) heat, enhanced by ΔT
    const dT = input.delta_T_C ?? 100;
    // Empirical: thermal harvest scales with ΔT, capped at 3%
    const thermFrac = Math.min(0.03, 0.005 * (dT / 100));
    const harvThermMW = (wpW + toolW) * thermFrac * 1e3;

    const totalHarv = harvVibMW + harvThermMW;

    const sensorMW = input.sensor_node_mW ?? 5;
    const nodes = Math.floor(totalHarv / sensorMW);

    return {
      value: {
        total_input_W: +P.toFixed(2),
        chip_energy_W: +chipW.toFixed(2),
        workpiece_energy_W: +wpW.toFixed(2),
        tool_energy_W: +toolW.toFixed(2),
        friction_energy_W: +fricW.toFixed(2),
        harvestable_vibration_mW: +harvVibMW.toFixed(3),
        harvestable_thermal_mW: +harvThermMW.toFixed(3),
        total_harvestable_mW: +totalHarv.toFixed(3),
        sensor_nodes_powerable: nodes,
        partition: {
          chip_pct: +(chipFrac * 100).toFixed(1),
          workpiece_pct: +(wpFrac * 100).toFixed(1),
          tool_pct: +(toolFrac * 100).toFixed(1),
          friction_pct: +(fricFrac * 100).toFixed(1),
        },
      },
      unit: 'mixed (W and mW)',
      formula: 'P_chip=P·f_chip; P_harv_vib=P·min(0.01,0.001g²); P_harv_th=(P_wp+P_tool)·min(0.03,0.005·ΔT/100)',
      confidence: 0.75,
    };
  }

  // ──── 5. Hybrid Harvesting System ──────────────────────────────────

  /**
   * Combines multiple harvesting sources with power conditioning losses
   * and supercapacitor storage sizing.
   *
   * Physics:
   *   P_net = (P_piezo + P_thermo + P_em) · η_cond   (Meninger et al.)
   *   E_storage = P_load · t_autonomy
   *   C = 2·E / V²                                    (supercap sizing)
   *
   * Conditioning losses 10-30% depending on impedance mismatch and
   * rectification topology (Roundy ch.6).
   *
   * @param input - Individual source powers, conditioning efficiency, storage needs
   * @returns AtomicValue with HybridHarvestOutput
   */
  hybridHarvest(input: HybridHarvestInput): AtomicValue<HybridHarvestOutput> {
    const gross = input.piezo_mW + input.thermo_mW + input.em_mW;
    if (gross <= 0) throw new Error('At least one source must provide power > 0');

    const eta = input.conditioning_efficiency ?? 0.80;
    if (eta <= 0 || eta > 1) throw new Error('conditioning_efficiency must be in (0, 1]');

    const net = gross * eta;
    const condLoss = gross - net;

    // Count active sources
    let active = 0;
    if (input.piezo_mW > 0) active++;
    if (input.thermo_mW > 0) active++;
    if (input.em_mW > 0) active++;

    // Storage sizing
    const load_mW = input.load_mW ?? net; // default: use all harvested power
    const autonomy_h = input.autonomy_hours ?? 1;
    const E_storage_J = load_mW * 1e-3 * autonomy_h * 3600; // energy in Joules

    // Supercapacitor: C = 2E/V² assuming 3.3V rail with 50% depth of discharge
    const V_cap = 3.3;
    const dod = 0.5;
    const C_farads = (2 * E_storage_J) / (V_cap ** 2 * dod);

    // Achievable autonomy with net power
    const achievable_h = net >= load_mW
      ? Infinity
      : (E_storage_J / ((load_mW - net) * 1e-3)) / 3600;

    return {
      value: {
        gross_power_mW: +gross.toFixed(4),
        net_power_mW: +net.toFixed(4),
        conditioning_loss_mW: +condLoss.toFixed(4),
        recommended_storage_F: +C_farads.toFixed(3),
        storage_energy_J: +E_storage_J.toFixed(3),
        autonomy_achievable_hours: achievable_h === Infinity ? -1 : +achievable_h.toFixed(2),
        sources_active: active,
      },
      unit: 'mW',
      formula: 'P_net=P_gross·η_cond; E=P·t; C=2E/(V²·DoD)',
      confidence: 0.80,
    };
  }

  // ──── 6. Harvest ROI Analysis ──────────────────────────────────────

  /**
   * Five-year NPV comparison of energy harvesting vs battery replacement
   * vs wired power for wireless sensor networks in machining.
   *
   * Economics:
   *   NPV = Σ(CF_t / (1+r)^t)   for t=0..years
   *   Breakeven: month where cumulative savings > 0
   *   CO2 savings: ~0.5 kg/battery/year avoided (Priya & Inman ch.18)
   *
   * @param input - Harvest power, node count, costs, discount rate
   * @returns AtomicValue with HarvestROIOutput
   */
  harvestROI(input: HarvestROIInput): AtomicValue<HarvestROIOutput> {
    if (input.n_nodes <= 0) throw new Error('n_nodes must be > 0');
    if (input.harvester_cost_usd < 0) throw new Error('harvester_cost_usd must be >= 0');

    const n = input.n_nodes;
    const years = input.years ?? 5;
    const r = input.discount_rate ?? 0.08;
    const batt_cost_yr = input.battery_cost_per_node_yr_usd ?? 25;
    const wired_per_node = input.wired_cost_per_node_usd ?? 200;
    const elec_yr = input.electricity_per_node_yr_usd ?? 5;

    // ── NPV: Harvesting ──
    // Year 0: harvester + installation cost
    // Year 1+: minimal maintenance ($2/node/yr)
    let npv_harvest = -input.harvester_cost_usd;
    for (let t = 1; t <= years; t++) {
      npv_harvest -= (2 * n) / (1 + r) ** t;
    }

    // ── NPV: Battery ──
    // Year 0: $5 per node (initial batteries)
    // Year 1+: replacement cost per node
    let npv_battery = -(5 * n);
    for (let t = 1; t <= years; t++) {
      npv_battery -= (batt_cost_yr * n) / (1 + r) ** t;
    }

    // ── NPV: Wired ──
    // Year 0: installation
    // Year 1+: electricity
    let npv_wired = -(wired_per_node * n);
    for (let t = 1; t <= years; t++) {
      npv_wired -= (elec_yr * n) / (1 + r) ** t;
    }

    // Annual savings: harvesting vs battery (the common alternative)
    const annual_savings = batt_cost_yr * n - 2 * n; // battery cost - maintenance

    // Breakeven: month where cumulative harvest savings > initial cost
    const monthly_savings = annual_savings / 12;
    let breakeven_months: number;
    if (monthly_savings <= 0) {
      breakeven_months = -1; // never breaks even
    } else {
      breakeven_months = Math.ceil((input.harvester_cost_usd - 5 * n) / monthly_savings);
      if (breakeven_months < 0) breakeven_months = 0;
    }

    // CO2 savings: ~0.5 kg/battery/yr (lithium coin cell lifecycle)
    const co2_saved = 0.5 * n * years;

    // Recommendation
    const npvs = [
      { name: 'harvesting' as const, npv: npv_harvest },
      { name: 'battery' as const, npv: npv_battery },
      { name: 'wired' as const, npv: npv_wired },
    ];
    npvs.sort((a, b) => b.npv - a.npv); // highest (least negative) first
    const recommended = npvs[0].name;

    return {
      value: {
        breakeven_months: breakeven_months,
        recommended,
        annual_savings_usd: +annual_savings.toFixed(2),
        npv_harvesting_usd: +npv_harvest.toFixed(2),
        npv_battery_usd: +npv_battery.toFixed(2),
        npv_wired_usd: +npv_wired.toFixed(2),
        five_year_co2_saved_kg: +co2_saved.toFixed(2),
      },
      unit: 'USD',
      formula: 'NPV=Σ(CF_t/(1+r)^t); breakeven=C_0/(annual_savings/12)',
      confidence: 0.70,
    };
  }
}

// ─── Singleton Export ───────────────────────────────────────────────

/** Singleton instance of EnergyHarvestingEngine */
export const energyHarvestingEngine = new EnergyHarvestingEngine();
