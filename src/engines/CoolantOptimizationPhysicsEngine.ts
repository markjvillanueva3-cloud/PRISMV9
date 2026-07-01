/**
 * CoolantOptimizationPhysicsEngine — 11 orphaned COOLANT formulas
 *
 * Sub-methods:
 *   A. fluidDelivery()  — Darcy-Weisbach ΔP, jet coherence Lc, nozzle velocity
 *   B. mqlPhysics()     — MQL droplet size d32, penetration distance Lpen
 *   C. hpcDesign()      — HPC pressure requirement from chip-curl force
 *   D. coolantHealth()  — concentration (refractometer), pH drift, tramp oil %
 *   E. optimization()   — optimal flow Q_opt (argmin cost), heat removal capacity
 *
 * References: Darcy-Weisbach (Munson 2013), Lefebvre atomization (1989),
 *   Krauss MQL (2006), Ezugwu HPC (2005), ASTM coolant maintenance,
 *   Machinery's Handbook 31st ed.
 */

import { log } from "../utils/Logger.js";

// ─── Types ─────────────────────────────────────────────────────────

// A. Fluid Delivery
export interface FluidDeliveryInput {
  /** Pipe/channel inner diameter (mm) */
  pipe_diameter_mm: number;
  /** Pipe/channel length (mm) */
  pipe_length_mm: number;
  /** Flow rate (L/min) */
  flow_rate_lpm: number;
  /** Nozzle diameter (mm) */
  nozzle_diameter_mm: number;
  /** Supply pressure (bar) */
  supply_pressure_bar: number;
  /** Coolant density (kg/m³), default 1000 */
  coolant_density_kg_m3?: number;
  /** Dynamic viscosity (Pa·s), default 0.001 */
  viscosity_Pa_s?: number;
  /** Pipe roughness (µm), default 15 */
  roughness_um?: number;
  /** Atmospheric pressure (bar), default 1.01325 */
  p_atm_bar?: number;
  /** Nozzle discharge coefficient Cv, default 0.85 */
  nozzle_Cv?: number;
}
export interface FluidDeliveryOutput {
  /** Darcy-Weisbach pressure drop ΔP (bar) — formula 1 */
  pressure_drop_bar: number;
  /** Darcy friction factor f */
  friction_factor: number;
  /** Reynolds number */
  reynolds_number: number;
  /** Flow regime */
  flow_regime: "laminar" | "transition" | "turbulent";
  /** Pipe velocity (m/s) */
  pipe_velocity_m_s: number;
  /** Jet coherence length Lc (mm) — formula 3 */
  jet_coherence_length_mm: number;
  /** Coherence constant K used */
  coherence_K: number;
  /** Nozzle exit velocity (m/s) — formula 10 */
  nozzle_velocity_m_s: number;
  /** Effective pressure at nozzle (bar) */
  effective_nozzle_pressure_bar: number;
  warnings: string[];
}

// B. MQL Physics
export interface MqlPhysicsInput {
  /** Oil surface tension (N/m), default 0.03 */
  oil_surface_tension_N_m?: number;
  /** Oil density (kg/m³), default 850 */
  oil_density_kg_m3?: number;
  /** Air velocity at nozzle exit (m/s) */
  air_velocity_m_s: number;
  /** Oil evaporation time constant τ_evap (ms) */
  evaporation_time_ms?: number;
  /** Oil droplet initial velocity (m/s); defaults to air_velocity * 0.6 */
  droplet_velocity_m_s?: number;
  /** Atomization constant K, default 2500 */
  atomization_K?: number;
}
export interface MqlPhysicsOutput {
  /** Sauter mean droplet diameter d32 (µm) — formula 2 */
  droplet_diameter_um: number;
  /** MQL penetration distance Lpen (mm) — formula 4 */
  penetration_distance_mm: number;
  /** Droplet velocity used (m/s) */
  droplet_velocity_m_s: number;
  /** Evaporation time used (ms) */
  evaporation_time_ms: number;
  warnings: string[];
}

// C. HPC Design
export interface HpcDesignInput {
  /** Chip thickness (mm) */
  chip_thickness_mm: number;
  /** Chip width (mm) */
  chip_width_mm: number;
  /** Chip curl radius (mm) */
  chip_curl_radius_mm: number;
  /** Material yield strength (MPa) */
  yield_strength_MPa: number;
  /** Nozzle diameter (mm) */
  nozzle_diameter_mm: number;
  /** Number of nozzles, default 1 */
  num_nozzles?: number;
  /** Safety factor, default 1.5 */
  safety_factor?: number;
  /** Coolant density (kg/m³), default 1000 */
  coolant_density_kg_m3?: number;
}
export interface HpcDesignOutput {
  /** Chip-curl bending moment (N·mm) */
  chip_curl_moment_Nmm: number;
  /** Force required to break chip (N) */
  chip_break_force_N: number;
  /** Required jet momentum flux (N) */
  required_jet_momentum_N: number;
  /** Required HPC pressure (bar) — formula 5 */
  required_pressure_bar: number;
  /** Required flow rate per nozzle (L/min) */
  flow_rate_per_nozzle_lpm: number;
  /** Jet velocity at required pressure (m/s) */
  jet_velocity_m_s: number;
  warnings: string[];
}

// D. Coolant Health
export interface CoolantHealthInput {
  /** Refractometer reading (Brix) */
  refractometer_brix?: number;
  /** Coolant refractometer factor (concentration = factor × Brix), default 1.0 */
  refractometer_factor?: number;
  /** Target concentration (%), for deviation warning */
  target_concentration_pct?: number;
  /** Initial pH value */
  initial_pH?: number;
  /** Days since last coolant change */
  days_since_change?: number;
  /** pH decay rate constant (1/day), default 0.01 */
  pH_decay_rate?: number;
  /** Measured pH (for comparison) */
  measured_pH?: number;
  /** Skimmer efficiency (0-1), default 0.6 */
  skimmer_efficiency?: number;
  /** Tramp oil ingress rate (% per day), default 0.3 */
  tramp_oil_ingress_rate_pct_day?: number;
  /** Days since last skim */
  days_since_skim?: number;
  /** Sump volume (L), default 200 */
  sump_volume_L?: number;
}
export interface CoolantHealthOutput {
  /** Coolant concentration (%) — formula 6 */
  concentration_pct: number | null;
  /** Concentration deviation from target (%) */
  concentration_deviation_pct: number | null;
  /** Predicted pH after days — formula 7 */
  predicted_pH: number | null;
  /** pH status */
  pH_status: "healthy" | "marginal" | "critical" | null;
  /** Estimated tramp oil (%) — formula 8 */
  tramp_oil_pct: number | null;
  /** Tramp oil status */
  tramp_oil_status: "acceptable" | "elevated" | "critical" | null;
  /** Recommended actions */
  actions: string[];
  warnings: string[];
}

// E. Optimization
export interface CoolantOptimizationInput {
  /** Array of candidate flow rates (L/min) to evaluate */
  candidate_flows_lpm: number[];
  /** Cutting temperature model: T = T0 + A / Q^n */
  T0_C?: number;
  /** Temperature coefficient A */
  temperature_coeff_A?: number;
  /** Temperature exponent n, default 0.5 */
  temperature_exponent_n?: number;
  /** Coolant cost per liter ($/L), default 0.05 */
  coolant_cost_per_L?: number;
  /** Energy cost per kW ($/kWh), default 0.12 */
  energy_cost_per_kWh?: number;
  /** Pump power model: P_pump = k × Q^1.5 (kW) */
  pump_power_coeff_k?: number;
  /** Budget constraint ($/hr), default Infinity */
  budget_per_hr?: number;
  /** Mass flow rate (kg/s) for heat removal calc */
  mass_flow_rate_kg_s?: number;
  /** Coolant specific heat Cp (J/kg·K), default 4180 */
  coolant_Cp_J_kgK?: number;
  /** Temperature rise ΔT (°C) across cutting zone */
  delta_T_C?: number;
}
export interface CoolantOptimizationOutput {
  /** Optimal flow rate Q_opt (L/min) — formula 9 */
  optimal_flow_lpm: number | null;
  /** Minimum temperature at optimal flow (°C) */
  min_temperature_C: number | null;
  /** Cost at optimal flow ($/hr) */
  cost_at_optimal_per_hr: number | null;
  /** All evaluated candidates */
  candidates: Array<{
    flow_lpm: number;
    temperature_C: number;
    cost_per_hr: number;
    feasible: boolean;
  }>;
  /** Heat removal capacity Q_heat (W) — formula 11 */
  heat_removal_W: number | null;
  /** Heat removal description */
  heat_removal_description: string | null;
  warnings: string[];
}

// ─── Master calculate() input ──────────────────────────────────────

export type CoolantOptPhysicsAction =
  | "fluid_delivery"
  | "mql_physics"
  | "hpc_design"
  | "coolant_health"
  | "optimize_flow";

export interface CoolantOptPhysicsInput {
  action: CoolantOptPhysicsAction;
  params: Record<string, any>;
}

export interface CoolantOptPhysicsResult {
  action: CoolantOptPhysicsAction;
  result: FluidDeliveryOutput | MqlPhysicsOutput | HpcDesignOutput | CoolantHealthOutput | CoolantOptimizationOutput;
}

// ─── Helpers ───────────────────────────────────────────────────────

/** Swamee-Jain explicit approximation for turbulent Darcy friction factor. */
const swameeJainF = (Re: number, epsD: number): number =>
  0.25 / (Math.log10(epsD / 3.7 + 5.74 / Re ** 0.9)) ** 2;

/** Darcy friction factor (laminar or turbulent). */
const darcyFriction = (Re: number, epsD: number): number =>
  Re < 2300 ? 64 / Math.max(Re, 1) : swameeJainF(Re, epsD);

// ─── Engine ────────────────────────────────────────────────────────

class CoolantOptimizationPhysicsEngineImpl {

  /**
   * A. Fluid Delivery — Darcy-Weisbach ΔP (1), jet coherence Lc (3), nozzle velocity (10)
   *
   * Formula 1:  ΔP = f × (L/D) × (ρv²/2)
   * Formula 3:  Lc = K × D_nozzle × (P/P_atm)^0.25
   * Formula 10: v = Cv × √(2ΔP_eff/ρ)
   */
  fluidDelivery(input: FluidDeliveryInput): FluidDeliveryOutput {
    const warnings: string[] = [];
    const rho = input.coolant_density_kg_m3 ?? 1000;
    const mu = input.viscosity_Pa_s ?? 0.001;
    const eps = (input.roughness_um ?? 15) * 1e-6; // m
    const Cv = input.nozzle_Cv ?? 0.85;
    const P_atm = input.p_atm_bar ?? 1.01325;

    // Pipe geometry
    const D = input.pipe_diameter_mm * 1e-3; // m
    const L = input.pipe_length_mm * 1e-3;   // m
    const A_pipe = Math.PI * (D / 2) ** 2;
    const Q = input.flow_rate_lpm / 60000;   // m³/s
    const V_pipe = Q / A_pipe;

    // Reynolds number
    const Re = rho * V_pipe * D / mu;
    const regime: FluidDeliveryOutput["flow_regime"] =
      Re < 2300 ? "laminar" : Re < 4000 ? "transition" : "turbulent";

    // Formula 1: Darcy-Weisbach ΔP = f×(L/D)×(ρv²/2)
    const epsD = eps / D;
    const f = darcyFriction(Re, epsD);
    const dp_Pa = f * (L / D) * (rho * V_pipe ** 2 / 2);
    const dp_bar = dp_Pa * 1e-5;

    if (dp_bar > input.supply_pressure_bar * 0.8) {
      warnings.push("Pressure drop exceeds 80% of supply — flow may be choked");
    }

    // Effective pressure at nozzle
    const P_eff = Math.max(input.supply_pressure_bar - dp_bar, 0);

    // Formula 10: Nozzle velocity v = Cv × √(2ΔP/ρ)
    const v_nozzle = Cv * Math.sqrt(2 * P_eff * 1e5 / rho);

    // Formula 3: Jet coherence length Lc = K × D_nozzle × (P/P_atm)^0.25
    const D_noz = input.nozzle_diameter_mm * 1e-3;
    const K_coh = 10; // empirical constant for round nozzles (Krauss 2006)
    const Lc = K_coh * D_noz * (P_eff / P_atm) ** 0.25;
    const Lc_mm = Lc * 1000;

    if (v_nozzle < 5) {
      warnings.push("Nozzle velocity < 5 m/s — poor cutting zone penetration");
    }

    log.debug(`[CoolantOptPhysics] fluidDelivery: Re=${Re.toFixed(0)}, ΔP=${dp_bar.toFixed(3)} bar, v_noz=${v_nozzle.toFixed(1)} m/s, Lc=${Lc_mm.toFixed(1)} mm`);

    return {
      pressure_drop_bar: dp_bar,
      friction_factor: f,
      reynolds_number: Re,
      flow_regime: regime,
      pipe_velocity_m_s: V_pipe,
      jet_coherence_length_mm: Lc_mm,
      coherence_K: K_coh,
      nozzle_velocity_m_s: v_nozzle,
      effective_nozzle_pressure_bar: P_eff,
      warnings,
    };
  }

  /**
   * B. MQL Physics — droplet size (2) and penetration distance (4)
   *
   * Formula 2: d = K × (σ/ρ)^0.5 × v^(-1)
   * Formula 4: Lpen = v × τ_evap
   */
  mqlPhysics(input: MqlPhysicsInput): MqlPhysicsOutput {
    const warnings: string[] = [];
    const sigma = input.oil_surface_tension_N_m ?? 0.03;
    const rho = input.oil_density_kg_m3 ?? 850;
    const K = input.atomization_K ?? 2500;
    const v_air = input.air_velocity_m_s;

    if (v_air <= 0) {
      warnings.push("Air velocity must be positive");
      return {
        droplet_diameter_um: 0,
        penetration_distance_mm: 0,
        droplet_velocity_m_s: 0,
        evaporation_time_ms: 0,
        warnings: ["Air velocity must be positive"],
      };
    }

    // Formula 2: d = K × (σ/ρ)^0.5 × v^(-1)
    // d32 Sauter mean diameter from Lefebvre atomization theory
    const d32_m = K * Math.sqrt(sigma / rho) / v_air;
    const d32_um = d32_m * 1e6;

    // Droplet velocity: fraction of air velocity (momentum transfer ~60%)
    const v_drop = input.droplet_velocity_m_s ?? (v_air * 0.6);

    // Evaporation time: D²-law approximation τ = d²/(8·D_vapor)
    const D_vapor = 2e-6; // m²/s diffusion coefficient for light oil
    const tau_evap_s = input.evaporation_time_ms != null
      ? input.evaporation_time_ms * 1e-3
      : (d32_m ** 2) / (8 * D_vapor);
    const tau_evap_ms = tau_evap_s * 1000;

    // Formula 4: Lpen = v × τ_evap
    const Lpen_m = v_drop * tau_evap_s;
    const Lpen_mm = Lpen_m * 1000;

    if (d32_um > 100) {
      warnings.push("Droplet diameter > 100 µm — poor MQL atomization, increase air pressure");
    }
    if (d32_um < 5) {
      warnings.push("Droplet diameter < 5 µm — risk of aerosol inhalation, check ventilation");
    }

    log.debug(`[CoolantOptPhysics] mqlPhysics: d32=${d32_um.toFixed(1)} µm, Lpen=${Lpen_mm.toFixed(1)} mm`);

    return {
      droplet_diameter_um: d32_um,
      penetration_distance_mm: Lpen_mm,
      droplet_velocity_m_s: v_drop,
      evaporation_time_ms: tau_evap_ms,
      warnings,
    };
  }

  /**
   * C. HPC Design — chip-curl force based pressure requirement (5)
   *
   * Formula 5: P_hpc from chip bending moment balance
   *   M_chip = σ_y × w × t² / 6  (beam bending)
   *   F_break = M_chip / R_curl
   *   F_jet = ρ × A_noz × v² = P × A_noz  (momentum flux)
   *   P_required = F_break × SF / (n × A_noz)
   */
  hpcDesign(input: HpcDesignInput): HpcDesignOutput {
    const warnings: string[] = [];
    const rho = input.coolant_density_kg_m3 ?? 1000;
    const SF = input.safety_factor ?? 1.5;
    const n = input.num_nozzles ?? 1;

    const t = input.chip_thickness_mm * 1e-3;     // m
    const w = input.chip_width_mm * 1e-3;          // m
    const R = input.chip_curl_radius_mm * 1e-3;    // m
    const sigma_y = input.yield_strength_MPa * 1e6; // Pa
    const D_noz = input.nozzle_diameter_mm * 1e-3;  // m
    const A_noz = Math.PI * (D_noz / 2) ** 2;

    // Chip bending moment (rectangular cross-section beam)
    // M = σ_y × w × t² / 6
    const M_chip = sigma_y * w * t ** 2 / 6;
    const M_chip_Nmm = M_chip * 1000; // N·mm

    // Force to break/curl chip
    const F_break = M_chip / R;

    // Required jet momentum flux (with safety factor)
    const F_jet_required = F_break * SF;

    // P = F / (n × A_noz)  — pressure to generate required momentum
    const P_required_Pa = F_jet_required / (n * A_noz);
    const P_required_bar = P_required_Pa * 1e-5;

    // Jet velocity at this pressure: v = √(2P/ρ)
    const v_jet = Math.sqrt(2 * P_required_Pa / rho);

    // Flow rate per nozzle: Q = A × v
    const Q_per_nozzle = A_noz * v_jet;
    const Q_per_nozzle_lpm = Q_per_nozzle * 60000;

    if (P_required_bar > 150) {
      warnings.push("Required HPC pressure > 150 bar — verify pump capacity and safety");
    }
    if (P_required_bar < 20) {
      warnings.push("Required pressure < 20 bar — standard coolant may suffice over HPC");
    }
    if (v_jet > 200) {
      warnings.push("Jet velocity > 200 m/s — risk of workpiece surface damage");
    }

    log.debug(`[CoolantOptPhysics] hpcDesign: P=${P_required_bar.toFixed(1)} bar, F_break=${F_break.toFixed(1)} N, v=${v_jet.toFixed(1)} m/s`);

    return {
      chip_curl_moment_Nmm: M_chip_Nmm,
      chip_break_force_N: F_break,
      required_jet_momentum_N: F_jet_required,
      required_pressure_bar: P_required_bar,
      flow_rate_per_nozzle_lpm: Q_per_nozzle_lpm,
      jet_velocity_m_s: v_jet,
      warnings,
    };
  }

  /**
   * D. Coolant Health — concentration (6), pH drift (7), tramp oil (8)
   *
   * Formula 6: concentration = refractometer_factor × Brix
   * Formula 7: pH(t) = pH_0 × exp(-k × t)  (exponential decay model)
   * Formula 8: tramp_oil% = ingress_rate × days × (1 - skim_eff)^(days/skim_interval)
   */
  coolantHealth(input: CoolantHealthInput): CoolantHealthOutput {
    const warnings: string[] = [];
    const actions: string[] = [];

    // Formula 6: Concentration via refractometer
    let concentration_pct: number | null = null;
    let concentration_deviation_pct: number | null = null;
    if (input.refractometer_brix != null) {
      const factor = input.refractometer_factor ?? 1.0;
      concentration_pct = factor * input.refractometer_brix;

      if (input.target_concentration_pct != null) {
        concentration_deviation_pct = concentration_pct - input.target_concentration_pct;
        const dev_abs = Math.abs(concentration_deviation_pct);
        if (dev_abs > 2) {
          warnings.push(`Concentration deviation ${concentration_deviation_pct > 0 ? "above" : "below"} target by ${dev_abs.toFixed(1)}%`);
          actions.push(concentration_deviation_pct > 0
            ? "Add water to reduce concentration"
            : "Add concentrate to increase concentration");
        }
      }

      if (concentration_pct < 3) {
        warnings.push("Concentration below 3% — corrosion risk");
        actions.push("Increase concentration immediately to prevent rust");
      } else if (concentration_pct > 12) {
        warnings.push("Concentration above 12% — skin irritation risk, poor cooling");
        actions.push("Dilute with water to reduce concentration");
      }
    }

    // Formula 7: pH drift model  pH(t) = pH_0 × exp(-k × t)
    let predicted_pH: number | null = null;
    let pH_status: CoolantHealthOutput["pH_status"] = null;
    if (input.initial_pH != null && input.days_since_change != null) {
      const k = input.pH_decay_rate ?? 0.01;
      predicted_pH = input.initial_pH * Math.exp(-k * input.days_since_change);

      // Clamp to realistic range
      predicted_pH = Math.max(predicted_pH, 4.0);

      if (predicted_pH >= 8.5) pH_status = "healthy";
      else if (predicted_pH >= 7.5) pH_status = "marginal";
      else pH_status = "critical";

      if (pH_status === "critical") {
        warnings.push(`Predicted pH ${predicted_pH.toFixed(1)} is critical (< 7.5) — bacterial growth risk`);
        actions.push("Perform coolant change or add biocide");
      } else if (pH_status === "marginal") {
        warnings.push(`Predicted pH ${predicted_pH.toFixed(1)} is marginal — monitor closely`);
        actions.push("Test pH daily, consider biocide addition");
      }

      // Compare with measured pH if provided
      if (input.measured_pH != null) {
        const diff = Math.abs(input.measured_pH - predicted_pH);
        if (diff > 0.5) {
          warnings.push(`Measured pH ${input.measured_pH.toFixed(1)} differs from predicted ${predicted_pH.toFixed(1)} by ${diff.toFixed(1)} — model may need recalibration`);
        }
      }
    }

    // Formula 8: Tramp oil estimation
    // tramp_oil% = ingress_rate × days × (1 - skim_eff)^(days/skim_interval)
    let tramp_oil_pct: number | null = null;
    let tramp_oil_status: CoolantHealthOutput["tramp_oil_status"] = null;
    if (input.days_since_skim != null) {
      const ingress_rate = input.tramp_oil_ingress_rate_pct_day ?? 0.3;
      const skim_eff = input.skimmer_efficiency ?? 0.6;
      const days = input.days_since_skim;

      // Accumulation model: ingress minus skim removal
      // Without skim: oil accumulates linearly at ingress_rate
      // With periodic skimming: net = ingress × days × (1 - skim_eff) per cycle
      // Simplified: tramp_oil = ingress_rate × days × (1 - skim_eff)
      tramp_oil_pct = ingress_rate * days * (1 - skim_eff);

      // Clamp to realistic max
      tramp_oil_pct = Math.min(tramp_oil_pct, 30);

      if (tramp_oil_pct < 2) tramp_oil_status = "acceptable";
      else if (tramp_oil_pct < 5) tramp_oil_status = "elevated";
      else tramp_oil_status = "critical";

      if (tramp_oil_status === "critical") {
        warnings.push(`Tramp oil ${tramp_oil_pct.toFixed(1)}% is critical (≥5%) — coolant life compromised`);
        actions.push("Run skimmer continuously, consider coolant change");
      } else if (tramp_oil_status === "elevated") {
        warnings.push(`Tramp oil ${tramp_oil_pct.toFixed(1)}% is elevated — increase skimming`);
        actions.push("Increase skimmer run time");
      }
    }

    log.debug(`[CoolantOptPhysics] coolantHealth: conc=${concentration_pct?.toFixed(1) ?? "N/A"}%, pH=${predicted_pH?.toFixed(1) ?? "N/A"}, oil=${tramp_oil_pct?.toFixed(1) ?? "N/A"}%`);

    return {
      concentration_pct,
      concentration_deviation_pct,
      predicted_pH,
      pH_status,
      tramp_oil_pct,
      tramp_oil_status,
      actions,
      warnings,
    };
  }

  /**
   * E. Optimization — optimal flow Q_opt (9) and heat removal capacity (11)
   *
   * Formula 9:  Q_opt = argmin(T) s.t. Cost ≤ Budget
   *   T(Q) = T0 + A / Q^n
   *   Cost(Q) = coolant_cost × Q × 60 / 1000 + energy_cost × k × Q^1.5
   *
   * Formula 11: Q_heat = ṁ × Cp × ΔT
   */
  optimization(input: CoolantOptimizationInput): CoolantOptimizationOutput {
    const warnings: string[] = [];
    const T0 = input.T0_C ?? 200;
    const A = input.temperature_coeff_A ?? 500;
    const n = input.temperature_exponent_n ?? 0.5;
    const cost_coolant = input.coolant_cost_per_L ?? 0.05;
    const cost_energy = input.energy_cost_per_kWh ?? 0.12;
    const k_pump = input.pump_power_coeff_k ?? 0.01;
    const budget = input.budget_per_hr ?? Infinity;

    // Evaluate all candidates
    const candidates = input.candidate_flows_lpm.map(Q => {
      // Temperature model: T = T0 + A / Q^n
      const T = T0 + A / Math.pow(Math.max(Q, 0.01), n);
      // Cost model: coolant consumption + pump energy
      const coolant_cost_hr = cost_coolant * Q * 60 / 1000; // $/hr
      const pump_kW = k_pump * Math.pow(Q, 1.5);
      const energy_cost_hr = cost_energy * pump_kW;
      const cost_hr = coolant_cost_hr + energy_cost_hr;
      return {
        flow_lpm: Q,
        temperature_C: T,
        cost_per_hr: cost_hr,
        feasible: cost_hr <= budget,
      };
    });

    // Formula 9: argmin(T) s.t. Cost ≤ Budget
    const feasible = candidates.filter(c => c.feasible);
    let optimal_flow_lpm: number | null = null;
    let min_temperature_C: number | null = null;
    let cost_at_optimal: number | null = null;

    if (feasible.length > 0) {
      // Sort by temperature ascending to find minimum
      const sorted = [...feasible].sort((a, b) => a.temperature_C - b.temperature_C);
      optimal_flow_lpm = sorted[0].flow_lpm;
      min_temperature_C = sorted[0].temperature_C;
      cost_at_optimal = sorted[0].cost_per_hr;
    } else {
      warnings.push("No feasible flow rate within budget constraint");
    }

    // Formula 11: Q_heat = ṁ × Cp × ΔT
    let heat_removal_W: number | null = null;
    let heat_removal_description: string | null = null;
    if (input.mass_flow_rate_kg_s != null && input.delta_T_C != null) {
      const Cp = input.coolant_Cp_J_kgK ?? 4180;
      heat_removal_W = input.mass_flow_rate_kg_s * Cp * input.delta_T_C;
      heat_removal_description = `Q_heat = ${input.mass_flow_rate_kg_s} kg/s × ${Cp} J/(kg·K) × ${input.delta_T_C} °C = ${heat_removal_W.toFixed(1)} W`;

      if (heat_removal_W < 100) {
        warnings.push("Heat removal < 100 W — may be insufficient for aggressive cuts");
      }
    }

    log.debug(`[CoolantOptPhysics] optimization: Q_opt=${optimal_flow_lpm?.toFixed(1) ?? "N/A"} L/min, T_min=${min_temperature_C?.toFixed(1) ?? "N/A"} °C, Q_heat=${heat_removal_W?.toFixed(1) ?? "N/A"} W`);

    return {
      optimal_flow_lpm,
      min_temperature_C,
      cost_at_optimal_per_hr: cost_at_optimal,
      candidates,
      heat_removal_W,
      heat_removal_description,
      warnings,
    };
  }

  /**
   * Dispatcher-compatible calculate() entry point.
   */
  calculate(params: CoolantOptPhysicsInput): CoolantOptPhysicsResult {
    const { action } = params;
    switch (action) {
      case "fluid_delivery":
        return { action, result: this.fluidDelivery(params.params as FluidDeliveryInput) };
      case "mql_physics":
        return { action, result: this.mqlPhysics(params.params as MqlPhysicsInput) };
      case "hpc_design":
        return { action, result: this.hpcDesign(params.params as HpcDesignInput) };
      case "coolant_health":
        return { action, result: this.coolantHealth(params.params as CoolantHealthInput) };
      case "optimize_flow":
        return { action, result: this.optimization(params.params as CoolantOptimizationInput) };
      default:
        throw new Error(`Unknown CoolantOptimizationPhysics action: ${action}`);
    }
  }
}

/** CoolantOptimizationPhysicsEngine singleton. */
export const coolantOptimizationPhysicsEngine = new CoolantOptimizationPhysicsEngineImpl();
export { CoolantOptimizationPhysicsEngineImpl as CoolantOptimizationPhysicsEngine };
