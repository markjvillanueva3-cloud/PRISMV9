/**
 * CoolantDynamicsEngine — Fluid mechanics and thermal models for CNC coolant systems
 *
 * Models: Reynolds channel flow, through-spindle pressure budget, MQL aerosol physics,
 *         jet coherence/breakup, chip transport drag, Komanduri-Hou dual-source thermal,
 *         cryogenic machining (LN2/CO2) phase-change cooling
 * References: Munson et al. (2013), Komanduri & Hou (2001), Weinert et al. (2004),
 *             Jawahir et al. (2016), Machinery's Handbook 31st ed.
 */

import { log } from "../utils/Logger.js";

// ─── Types ─────────────────────────────────────────────────────────

export interface CoolantThroughDrillingInput {
  drill_diameter_mm: number;
  material_group: string; // P/M/K/N/S/H (ISO material group)
  depth_ratio: number;    // L/D ratio
  coolant_type?: "flood" | "mql" | "through_coolant"; // default: through_coolant
}

export interface AtomicValue { value: number; unit: string; source: string; }

export interface PeckRecommendation {
  peck_interval_xD: number;
  entry_feed_pct: number;
  full_retract_depth_xD: number;
  requires_peck: boolean;
}

export interface CoolantThroughDrillingOutput {
  recommended_pressure_psi: AtomicValue;
  recommended_flow_gpm: AtomicValue;
  feed_multiplier: AtomicValue;
  tool_life_multiplier: AtomicValue;
  peck_recommendation: PeckRecommendation;
  deep_hole_classification: "standard" | "deep" | "very_deep" | "gun_drill";
  performance_gains: {
    temp_reduction_pct: number;
    roundness_improvement_pct: number;
    production_rate_increase_pct: number;
  };
}

export interface ReynoldsChannelFlowInput {
  channel_diameter_mm: number; flow_rate_lpm: number; channel_length_mm: number;
  coolant_density_kg_m3?: number; viscosity_Pa_s?: number; roughness_um?: number;
}
export interface ReynoldsChannelFlowOutput {
  reynolds_number: number; flow_regime: "laminar" | "transition" | "turbulent";
  velocity_m_s: number; pressure_drop_bar: number; friction_factor: number;
  flow_rate_at_transition_lpm: number;
}
export interface ThroughSpindlePressureDropInput {
  supply_pressure_bar: number; spindle_bore_mm: number; spindle_length_mm: number;
  holder_channel_mm: number; holder_length_mm: number;
  tool_channels: Array<{ diameter_mm: number; length_mm: number }>;
  nozzle_diameter_mm: number; flow_rate_lpm: number; spindle_rpm: number;
}
export interface SectionLoss { section: string; dp_bar: number; }
export interface ThroughSpindlePressureDropOutput {
  exit_pressure_bar: number; exit_velocity_m_s: number; section_losses: SectionLoss[];
  total_loss_bar: number; centrifugal_boost_bar: number; effective_jet_velocity_m_s: number;
}
export interface MqlSprayModelInput {
  oil_flow_ml_hr: number; air_pressure_bar: number; nozzle_distance_mm: number;
  target_area_mm2: number; oil_viscosity_cSt?: number; oil_density_kg_m3?: number;
  oil_surface_tension_N_m?: number;
}
export interface MqlSprayModelOutput {
  droplet_diameter_um: number; droplet_velocity_m_s: number; coverage_pct: number;
  film_thickness_nm: number; evaporation_time_ms: number; cooling_capacity_W: number;
  lubrication_effectiveness: "excellent" | "good" | "fair" | "poor";
}
export interface JetCoherenceInput {
  nozzle_diameter_mm: number; pressure_bar: number; standoff_mm: number;
  nozzle_type: "round" | "flat_fan" | "needle"; coolant_surface_tension?: number;
}
export interface JetCoherenceOutput {
  jet_velocity_m_s: number; weber_number: number; breakup_length_mm: number;
  coherent_at_standoff: boolean; penetration_effectiveness_pct: number;
  recommended_standoff_mm: number; recommended_pressure_bar: number;
}
export interface ChipTransportDragInput {
  chip_thickness_mm: number; chip_width_mm: number; chip_length_mm: number;
  channel_diameter_mm: number; chip_material_density?: number;
  coolant_density?: number; coolant_viscosity?: number;
}
export interface ChipTransportDragOutput {
  settling_velocity_m_s: number; minimum_flush_velocity_m_s: number;
  required_flow_rate_lpm: number; chip_reynolds: number; drag_coefficient: number;
  will_flush_at_flow: (flow_lpm: number) => boolean;
}
export interface KomanduriHouThermalInput {
  cutting_speed_m_min: number; feed_mm_rev: number; depth_mm: number;
  shear_angle_deg: number; rake_angle_deg: number; friction_coefficient: number;
  shear_strength_MPa: number; workpiece_thermal_diff_mm2_s: number;
  workpiece_conductivity_W_mK: number;
}
export interface TemperatureFieldPoint { x_mm: number; y_mm: number; T_C: number; }
export interface KomanduriHouThermalOutput {
  max_shear_zone_temp_C: number; max_interface_temp_C: number;
  workpiece_surface_temp_C: number; temperature_field: TemperatureFieldPoint[];
  heat_partition_to_chip_pct: number;
}
export interface CryogenicMachiningThermalInput {
  cryogen: "LN2" | "CO2"; flow_rate_kg_min: number; supply_temp_C: number;
  cutting_heat_W: number; contact_area_mm2: number; surface_temp_C: number;
}
export interface CryogenicMachiningThermalOutput {
  heat_removed_W: number; surface_temp_after_C: number;
  boiling_regime: "film" | "transition" | "nucleate" | "convection";
  heat_transfer_coeff_W_m2K: number; cryogen_consumption_kg_per_part: number;
  leidenfrost_temp_C: number; effectiveness_vs_flood_pct: number;
}

// ─── Helpers ───────────────────────────────────────────────────────

/** Swamee-Jain friction factor for turbulent flow. */
const turbulentF = (Re: number, eps: number, D: number): number =>
  0.25 / (Math.log10(eps / D / 3.7 + 5.74 / Re ** 0.9)) ** 2;

/** Pipe section pressure drop (friction + minor loss K). */
const pipeSection = (
  Q: number, dia_mm: number, len_mm: number, K: number, rho: number, mu: number,
): number => {
  const D = dia_mm * 1e-3, L = len_mm * 1e-3, A = Math.PI * (D / 2) ** 2;
  const V = Q / A, Re = rho * V * D / mu;
  const f = Re < 2300 ? 64 / Re : turbulentF(Re, 1e-5, D);
  return (f * L / D + K) * rho * V ** 2 / 2;
};

// ─── Engine ────────────────────────────────────────────────────────

class CoolantDynamicsEngineImpl {
  /** Through-tool coolant flow regime: Reynolds, friction factor, pressure drop. */
  reynoldsChannelFlow(input: ReynoldsChannelFlowInput): ReynoldsChannelFlowOutput {
    const rho = input.coolant_density_kg_m3 ?? 1000, mu = input.viscosity_Pa_s ?? 0.001;
    const eps = (input.roughness_um ?? 10) * 1e-6;
    const D = input.channel_diameter_mm * 1e-3, L = input.channel_length_mm * 1e-3;
    const A = Math.PI * (D / 2) ** 2, Q = input.flow_rate_lpm / 60000;
    const V = Q / A, Re = rho * V * D / mu;
    const regime: ReynoldsChannelFlowOutput["flow_regime"] =
      Re < 2300 ? "laminar" : Re < 4000 ? "transition" : "turbulent";
    const f = Re < 2300 ? 64 / Re : turbulentF(Re, eps, D);
    const dp_bar = f * (L / D) * rho * V ** 2 / 2 * 1e-5;
    const V_tr = 2300 * mu / (rho * D);
    log.debug(`[CoolantDynamics] reynoldsChannelFlow: Re=${Re.toFixed(0)}, regime=${regime}`);
    return { reynolds_number: Re, flow_regime: regime, velocity_m_s: V,
      pressure_drop_bar: dp_bar, friction_factor: f,
      flow_rate_at_transition_lpm: V_tr * A * 60000 };
  }

  /** Full through-spindle pressure budget with centrifugal boost. */
  throughSpindlePressureDrop(input: ThroughSpindlePressureDropInput): ThroughSpindlePressureDropOutput {
    const rho = 1000, mu = 0.001, Q = input.flow_rate_lpm / 60000;
    const losses: SectionLoss[] = [];
    const addSection = (name: string, d: number, l: number, K: number) => {
      const dp = pipeSection(Q, d, l, K, rho, mu);
      losses.push({ section: name, dp_bar: dp * 1e-5 });
      return dp;
    };
    let totalDp = addSection("rotary_union", input.spindle_bore_mm * 0.8, 50, 1.5);
    totalDp += addSection("spindle_bore", input.spindle_bore_mm, input.spindle_length_mm, 0.3);
    totalDp += addSection("holder_channel", input.holder_channel_mm, input.holder_length_mm, 0.5);
    for (let i = 0; i < input.tool_channels.length; i++) {
      const ch = input.tool_channels[i];
      totalDp += addSection(`tool_channel_${i}`, ch.diameter_mm, ch.length_mm, 0.3);
    }
    const D_noz = input.nozzle_diameter_mm * 1e-3, A_noz = Math.PI * (D_noz / 2) ** 2;
    const V_noz = Q / A_noz;
    const dp_noz = 0.04 * rho * V_noz ** 2 / 2;
    losses.push({ section: "nozzle_exit", dp_bar: dp_noz * 1e-5 });
    totalDp += dp_noz;
    const totalDp_bar = totalDp * 1e-5;
    // Centrifugal boost: ΔP = rho * omega^2 * (R_outer^2 - R_inner^2) / 2
    const omega = input.spindle_rpm * 2 * Math.PI / 60;
    const R_o = (input.spindle_bore_mm / 2) * 1e-3, R_i = (input.holder_channel_mm / 2) * 1e-3;
    const centrifugal_boost_bar = rho * omega ** 2 * (R_o ** 2 - R_i ** 2) / 2 * 1e-5;
    const exitP = Math.max(input.supply_pressure_bar - totalDp_bar + centrifugal_boost_bar, 0);
    const V_jet = Math.sqrt(2 * exitP * 1e5 / rho);
    log.debug(`[CoolantDynamics] throughSpindlePressureDrop: loss=${totalDp_bar.toFixed(2)} bar`);
    return { exit_pressure_bar: exitP, exit_velocity_m_s: V_noz, section_losses: losses,
      total_loss_bar: totalDp_bar, centrifugal_boost_bar, effective_jet_velocity_m_s: V_jet };
  }

  /** MQL aerosol physics: Sauter mean diameter, coverage, film thickness. */
  mqlSprayModel(input: MqlSprayModelInput): MqlSprayModelOutput {
    const rho_oil = input.oil_density_kg_m3 ?? 850, sigma = input.oil_surface_tension_N_m ?? 0.03;
    const mu_oil_dyn = (input.oil_viscosity_cSt ?? 40) * 1e-6 * rho_oil;
    const rho_air = 1.225, mu_air = 1.81e-5;
    const Q_oil = input.oil_flow_ml_hr / 3.6e6; // m^3/s
    const Q_air = input.air_pressure_bar * 5e-4;  // approx air volume flow
    // D32 = K·(σ/ρ_air)^0.5·(μ_oil/μ_air)^0.25·Q_oil^0.25 / Q_air^0.75
    const D32 = 2500 * Math.sqrt(sigma / rho_air) * (mu_oil_dyn / mu_air) ** 0.25
      * Q_oil ** 0.25 / Q_air ** 0.75;
    const D32_um = D32 * 1e6;
    const V_drop = Math.sqrt(2 * input.air_pressure_bar * 1e5 / rho_air) * 0.6;
    const V_single = (Math.PI / 6) * D32 ** 3, n_drops = Q_oil / V_single;
    const A_tgt = input.target_area_mm2 * 1e-6;
    const flight_t = (input.nozzle_distance_mm * 1e-3) / V_drop;
    const coverage = Math.min(100, (n_drops * flight_t * Math.PI * D32 ** 2 / 4) / A_tgt * 100);
    const film_nm = (Q_oil / A_tgt) * 0.01 * 1e9; // deposition_rate × contact_time
    const evap_ms = D32 ** 2 / (8 * 2e-6) * 1000; // t = D32^2/(8·D_vapor)
    const cooling_W = Q_oil * rho_oil * 2000 * 80; // m_dot·cp·dT
    const eff: MqlSprayModelOutput["lubrication_effectiveness"] =
      coverage > 80 && film_nm > 500 ? "excellent" : coverage > 50 && film_nm > 200 ? "good"
        : coverage > 25 ? "fair" : "poor";
    log.debug(`[CoolantDynamics] mqlSprayModel: D32=${D32_um.toFixed(1)}um, cov=${coverage.toFixed(1)}%`);
    return { droplet_diameter_um: D32_um, droplet_velocity_m_s: V_drop, coverage_pct: coverage,
      film_thickness_nm: film_nm, evaporation_time_ms: evap_ms, cooling_capacity_W: cooling_W,
      lubrication_effectiveness: eff };
  }

  /** Coolant jet breakup: Weber number, breakup length, coherence at standoff. */
  jetCoherence(input: JetCoherenceInput): JetCoherenceOutput {
    const rho = 1000, sigma = input.coolant_surface_tension ?? 0.04;
    const D = input.nozzle_diameter_mm * 1e-3;
    const V = Math.sqrt(2 * input.pressure_bar * 1e5 / rho);
    const We = rho * V ** 2 * D / sigma;
    const C = ({ round: 12, flat_fan: 6, needle: 18 } as const)[input.nozzle_type];
    const L_b_mm = C * D * Math.sqrt(We) * 1000;
    const standoff = input.standoff_mm;
    const coherent = standoff < L_b_mm;
    const pen_pct = coherent
      ? 95 - 30 * (standoff / L_b_mm) ** 2
      : Math.max(5, 65 * Math.exp(-0.5 * (standoff / L_b_mm - 1)));
    const rec_standoff = L_b_mm * 0.7;
    const rec_pressure = coherent ? input.pressure_bar
      : input.pressure_bar * (standoff / rec_standoff) ** 2;
    log.debug(`[CoolantDynamics] jetCoherence: We=${We.toFixed(0)}, breakup=${L_b_mm.toFixed(1)}mm`);
    return { jet_velocity_m_s: V, weber_number: We, breakup_length_mm: L_b_mm,
      coherent_at_standoff: coherent, penetration_effectiveness_pct: pen_pct,
      recommended_standoff_mm: rec_standoff, recommended_pressure_bar: rec_pressure };
  }

  /** Chip transport drag: settling velocity, minimum flushing flow rate. */
  chipTransportDrag(input: ChipTransportDragInput): ChipTransportDragOutput {
    const rho_c = input.chip_material_density ?? 7850, rho_f = input.coolant_density ?? 1000;
    const mu = input.coolant_viscosity ?? 0.001, g = 9.81;
    const V_chip = input.chip_thickness_mm * input.chip_width_mm * input.chip_length_mm;
    const d_eq = (6 * V_chip / Math.PI) ** (1 / 3) * 1e-3;
    // Iterative settling velocity (Schiller-Naumann drag)
    let V_s = (rho_c - rho_f) * g * d_eq ** 2 / (18 * mu), C_D = 0.44, Re_p: number;
    for (let i = 0; i < 20; i++) {
      Re_p = rho_f * V_s * d_eq / mu;
      C_D = Re_p < 0.1 ? 24 / Re_p : Re_p < 1000
        ? 24 / Re_p * (1 + 0.15 * Re_p ** 0.687) : 0.44;
      const V_new = Math.sqrt(4 * g * d_eq * (rho_c - rho_f) / (3 * C_D * rho_f));
      if (Math.abs(V_new - V_s) / V_s < 1e-4) { V_s = V_new; break; }
      V_s = V_new;
    }
    const V_flush = V_s * 1.5; // safety factor
    const D_ch = input.channel_diameter_mm * 1e-3, A_ch = Math.PI * (D_ch / 2) ** 2;
    const Q_flush = V_flush * A_ch * 60000;
    const chipRe = rho_f * V_s * d_eq / mu;
    log.debug(`[CoolantDynamics] chipTransportDrag: Vs=${V_s.toFixed(3)}, Vflush=${V_flush.toFixed(3)} m/s`);
    return { settling_velocity_m_s: V_s, minimum_flush_velocity_m_s: V_flush,
      required_flow_rate_lpm: Q_flush, chip_reynolds: chipRe, drag_coefficient: C_D,
      will_flush_at_flow: (flow_lpm: number) => (flow_lpm / 60000) / A_ch >= V_flush };
  }

  /** Komanduri-Hou dual-source moving heat model for shear + friction zones. */
  komanduriHouThermal(input: KomanduriHouThermalInput): KomanduriHouThermalOutput {
    const V = input.cutting_speed_m_min / 60;
    const t1 = input.feed_mm_rev * 1e-3, w = input.depth_mm * 1e-3;
    const phi = input.shear_angle_deg * Math.PI / 180;
    const alpha = input.rake_angle_deg * Math.PI / 180;
    const tau_s = input.shear_strength_MPa * 1e6;
    const kappa = input.workpiece_thermal_diff_mm2_s * 1e-6, k = input.workpiece_conductivity_W_mK;
    const L_shear = t1 / Math.sin(phi);
    const beta = Math.atan(input.friction_coefficient);
    const F_s = tau_s * L_shear * w;
    const F_c = F_s * Math.cos(beta - alpha) / Math.cos(phi + beta - alpha);
    const F_t = F_s * Math.sin(beta - alpha) / Math.cos(phi + beta - alpha);
    const F_f = F_c * Math.sin(alpha) + F_t * Math.cos(alpha);
    const V_shear = V * Math.cos(alpha) / Math.cos(phi - alpha);
    const V_chip = V * Math.sin(phi) / Math.cos(phi - alpha);
    const q_shear = F_s * V_shear, q_friction = F_f * V_chip;
    const L_contact = t1 * 2;
    // Loewen-Shaw heat partition
    const R_n = 1 / (1 + 0.754 * Math.sqrt(kappa / (V * L_contact)));
    // Temperature rises (Komanduri integral solution)
    const T_shear_rise = (1 - R_n) * q_shear / (k * w)
      * Math.sqrt(kappa / (Math.PI * V * L_shear));
    const T_friction_rise = R_n * q_friction / (k * w)
      * Math.sqrt(kappa / (Math.PI * V_chip * L_contact));
    const T0 = 20;
    // Temperature field: 8×5 grid via moving point-source Green's function
    const field: TemperatureFieldPoint[] = [];
    const xR = L_shear * 3e3, yR = t1 * 5e3; // mm ranges
    for (let ix = 0; ix < 8; ix++) for (let iy = 0; iy < 5; iy++) {
      const x = -xR / 2 + ix * xR / 7, y = iy * yR / 4;
      const xm = x * 1e-3, ym = y * 1e-3, r = Math.sqrt(xm ** 2 + ym ** 2) + 1e-12;
      const T_pt = T_shear_rise * Math.exp(-V * xm / (2 * kappa))
        * Math.exp(-V * r / (2 * kappa)) / r * L_shear * 0.01;
      field.push({ x_mm: x, y_mm: y, T_C: T0 + Math.abs(T_pt) });
    }
    log.debug(`[CoolantDynamics] komanduriHouThermal: Tif=${(T0 + T_shear_rise + T_friction_rise).toFixed(0)}C`);
    return { max_shear_zone_temp_C: T0 + T_shear_rise,
      max_interface_temp_C: T0 + T_shear_rise + T_friction_rise,
      workpiece_surface_temp_C: T0 + T_shear_rise * 0.25,
      temperature_field: field, heat_partition_to_chip_pct: R_n * 100 };
  }

  /**
   * Through-coolant drilling parameters: pressure, flow, feed/life multipliers, peck strategy.
   * References: Guhring deep hole drilling guide, MSC BetterMRO, GuessTools coolant-through reference.
   */
  coolantThroughDrillingParams(input: CoolantThroughDrillingInput): CoolantThroughDrillingOutput {
    const { drill_diameter_mm: d, material_group, depth_ratio, coolant_type = "through_coolant" } = input;

    // ── Base pressure by diameter (PSI) ────────────────────────────
    let basePressurePsi: number;
    if (d < 3)       basePressurePsi = 900;   // mid of 800–1000
    else if (d < 8)  basePressurePsi = 650;   // mid of 500–800
    else if (d < 15) basePressurePsi = 500;   // mid of 400–600
    else             basePressurePsi = 400;   // mid of 300–500

    // ── Material pressure multiplier (ISO group) ───────────────────
    const matUpper = material_group.toUpperCase();
    const matMult =
      matUpper === "S" ? 1.4 :   // Ti/Ni superalloys — +40%
      matUpper === "M" ? 1.2 :   // Stainless steel — +20%
      matUpper === "N" ? 0.8 :   // Aluminium — −20%
      1.0;                        // P/K/H — baseline

    const pressurePsi = Math.round(basePressurePsi * matMult);

    // ── Flow rate (GPM) by diameter ────────────────────────────────
    let flowGpm: number;
    if (d < 6)       flowGpm = 0.75;  // mid of 0.5–1
    else if (d < 12) flowGpm = 1.5;   // mid of 1–2
    else             flowGpm = 3.0;   // mid of 2–4

    // ── Feed & tool-life multipliers (through-coolant vs standard) ─
    const isThroughCoolant = coolant_type === "through_coolant";
    const feedMult       = isThroughCoolant ? 1.45 : 1.0;  // mid of 1.4–1.5×
    const toolLifeMult   = isThroughCoolant ? 1.4  : 1.0;  // mid of 1.3–1.5×

    // ── Peck strategy ──────────────────────────────────────────────
    const requiresPeck = depth_ratio > 3;
    const peck: PeckRecommendation = {
      peck_interval_xD: 1.0,
      entry_feed_pct: 75,           // mid of 70–80%
      full_retract_depth_xD: 3.0,
      requires_peck: requiresPeck,
    };

    // ── Deep-hole classification ───────────────────────────────────
    const deepClass: CoolantThroughDrillingOutput["deep_hole_classification"] =
      depth_ratio <= 3  ? "standard" :
      depth_ratio <= 10 ? "deep"     :
      depth_ratio <= 20 ? "very_deep": "gun_drill";

    const src = "Guhring deep hole drilling guide; MSC BetterMRO; GuessTools coolant-through reference";

    log.debug(`[CoolantDynamics] coolantThroughDrillingParams: d=${d}mm, mat=${material_group}, LD=${depth_ratio}, P=${pressurePsi}psi`);

    return {
      recommended_pressure_psi: { value: pressurePsi, unit: "PSI", source: src },
      recommended_flow_gpm:     { value: flowGpm,     unit: "GPM", source: src },
      feed_multiplier:          { value: feedMult,    unit: "ratio", source: "Through-coolant feed advantage; Guhring, Sandvik application guides" },
      tool_life_multiplier:     { value: toolLifeMult, unit: "ratio", source: "Through-coolant tool life improvement; Sandvik Coromant drilling guide" },
      peck_recommendation: peck,
      deep_hole_classification: deepClass,
      performance_gains: {
        temp_reduction_pct: 70,           // mid of 65–75%
        roundness_improvement_pct: 40,
        production_rate_increase_pct: 25, // mid of 20–30%
      },
    };
  }

  /**
   * MQL (Minimum Quantity Lubrication) optimal parameter recommendation.
   * Based on 2024-2025 research: Springer Manufacturing & Materials Processing,
   * Tandfonline International Journal of Advanced Manufacturing Technology,
   * JMES (Journal of Mechanical Engineering Science) MQL optimization studies.
   *
   * Key findings:
   * - Nozzle distance: 20-30 mm optimal (25 mm slot milling, 20 mm end milling)
   * - Flow rate: 40-60 mL/h (60 mL/h reduces force 14.6%, temp 42.1%, Ra 41.8%)
   * - Air pressure: 0.2-0.4 MPa (6 bar), higher pressure = better atomization
   * - Nozzle angle: 60° elevation, 120° relative to feed direction
   * - Dual-jet nozzles outperform single-jet by ~15-20%
   */
  mqlOptimalParameters(input: {
    operation: string;
    material_group?: string;
    tool_diameter_mm?: number;
    cutting_speed_mpm?: number;
  }): {
    nozzle_distance_mm: AtomicValue;
    flow_rate_ml_per_h: AtomicValue;
    air_pressure_MPa: AtomicValue;
    nozzle_elevation_deg: AtomicValue;
    nozzle_feed_angle_deg: AtomicValue;
    nozzle_type: string;
    expected_improvements: {
      cutting_force_reduction_pct: number;
      temperature_reduction_pct: number;
      surface_roughness_improvement_pct: number;
      tool_life_increase_pct: number;
    };
    comparison_vs_flood: string;
  } {
    const op = input.operation.toLowerCase();
    const mat = (input.material_group ?? "P").toUpperCase();
    const src = "Springer IJAMT 2024; Tandfonline Adv Manuf Technol 2024; JMES MQL optimization 2025";

    // Nozzle distance by operation
    let nozzle_distance_mm: number;
    if (op === "milling" || op === "slot_milling") nozzle_distance_mm = 25;
    else if (op === "turning") nozzle_distance_mm = 20;
    else nozzle_distance_mm = 30; // drilling, grinding

    // Flow rate by material group
    let flow_rate_ml_per_h: number;
    if (mat === "H") flow_rate_ml_per_h = 60;       // hardened steel — max flow
    else if (mat === "N") flow_rate_ml_per_h = 40;  // aluminium — lower viscosity
    else flow_rate_ml_per_h = 50;                    // P/M/K/S — general

    // Air pressure by material hardness class
    let air_pressure_MPa: number;
    if (mat === "M" || mat === "S" || mat === "H") air_pressure_MPa = 0.4; // difficult materials
    else air_pressure_MPa = 0.3;

    // Hard/HRSA materials: tighter standoff, higher pressure for better penetration
    if (mat === "S" || mat === "H") nozzle_distance_mm = Math.max(nozzle_distance_mm - 5, 15);

    // Dual jet recommended for difficult materials
    const nozzle_type = (mat === "M" || mat === "S" || mat === "H") ? "dual_jet" : "single_jet";

    // Expected improvements (60 mL/h baseline from 2024-2025 studies)
    const force_pct   = mat === "H" ? 14.6 : mat === "S" ? 12.0 : 10.0;
    const temp_pct    = mat === "H" ? 42.1 : mat === "S" ? 35.0 : 30.0;
    const ra_pct      = mat === "H" ? 41.8 : mat === "S" ? 35.0 : 28.0;
    const life_pct    = mat === "H" ? 35.0 : mat === "S" ? 30.0 : 20.0;

    log.debug(`[CoolantDynamics] mqlOptimalParameters: op=${op}, mat=${mat}, d=${nozzle_distance_mm}mm, Q=${flow_rate_ml_per_h}mL/h`);

    return {
      nozzle_distance_mm:    { value: nozzle_distance_mm,  unit: "mm",  source: src },
      flow_rate_ml_per_h:    { value: flow_rate_ml_per_h,  unit: "mL/h", source: src },
      air_pressure_MPa:      { value: air_pressure_MPa,    unit: "MPa", source: src },
      nozzle_elevation_deg:  { value: 60,                  unit: "deg", source: src },
      nozzle_feed_angle_deg: { value: 120,                 unit: "deg", source: src },
      nozzle_type,
      expected_improvements: {
        cutting_force_reduction_pct:        force_pct,
        temperature_reduction_pct:          temp_pct,
        surface_roughness_improvement_pct:  ra_pct,
        tool_life_increase_pct:             life_pct,
      },
      comparison_vs_flood: `MQL at ${flow_rate_ml_per_h} mL/h uses ~99% less fluid than flood coolant while achieving comparable or better surface finish in ${mat}-group materials. CO2+MQL hybrid achieves 19% lower power vs LN2.`,
    };
  }

  /** Cryogenic machining (LN2/CO2): phase-change heat removal and boiling regime. */
  cryogenicMachiningThermal(input: CryogenicMachiningThermalInput): CryogenicMachiningThermalOutput {
    const isLN2 = input.cryogen === "LN2";
    const cp = isLN2 ? 1040 : 844, L_vap = isLN2 ? 199000 : 234000;
    const T_boil = isLN2 ? -196 : -78;
    const m_dot = input.flow_rate_kg_min / 60;
    const Q_sensible = m_dot * cp * Math.abs(T_boil - input.supply_temp_C);
    const Q_latent = m_dot * L_vap;
    const Q_superheat = m_dot * (isLN2 ? 1040 : 846) * Math.abs(20 - T_boil) * 0.3;
    const heat_removed = Math.min(Q_sensible + Q_latent + Q_superheat, input.cutting_heat_W * 1.2);
    const dT_wall = input.surface_temp_C - T_boil;
    const leidenfrost = isLN2 ? 150 : 120;
    let regime: CryogenicMachiningThermalOutput["boiling_regime"], h: number;
    if (dT_wall > leidenfrost) { regime = "film"; h = 250; }
    else if (dT_wall > leidenfrost * 0.6) { regime = "transition"; h = 2000; }
    else if (dT_wall > 10) { regime = "nucleate"; h = 15000; }
    else { regime = "convection"; h = 800; }
    const A = input.contact_area_mm2 * 1e-6;
    const Q_surf = h * A * dT_wall;
    const T_red = Math.min(dT_wall * 0.8, Q_surf / (h * A + 1e-12) * 0.8);
    log.debug(`[CoolantDynamics] cryogenicMachiningThermal: regime=${regime}, h=${h}`);
    return { heat_removed_W: heat_removed, surface_temp_after_C: input.surface_temp_C - T_red,
      boiling_regime: regime, heat_transfer_coeff_W_m2K: h,
      cryogen_consumption_kg_per_part: m_dot * 30, leidenfrost_temp_C: T_boil + leidenfrost,
      effectiveness_vs_flood_pct: h / 5000 * 100 };
  }
}

/** Coolant Dynamics Engine singleton. */
export const coolantDynamicsEngine = new CoolantDynamicsEngineImpl();
