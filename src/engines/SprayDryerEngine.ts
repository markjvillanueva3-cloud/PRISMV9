/**
 * SprayDryerEngine — Spray drying process analysis
 *
 * Models: Mass/energy balance, droplet drying kinetics,
 *         particle size prediction, outlet temperature
 * References: Masters 1991, Mujumdar Handbook of Drying
 */

export type AtomizerType = "rotary" | "pressure_nozzle" | "two_fluid_nozzle";
export type FlowConfig = "co_current" | "counter_current" | "mixed_flow";

export interface SprayDryerInput {
  feed_rate_kg_h: number;
  feed_solids_pct: number;            // wt%, default 30
  inlet_air_temp_C: number;
  outlet_air_temp_C?: number;         // default auto-calc
  target_moisture_pct?: number;       // product moisture %, default 3
  atomizer_type?: AtomizerType;
  flow_config?: FlowConfig;
  atomizer_speed_rpm?: number;        // rotary only, default 15000
  feed_viscosity_mPas?: number;       // default 50
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface SprayDryerResult {
  evaporation_rate_kg_h: AtomicValue;
  air_flow_rate_kg_h: AtomicValue;
  thermal_efficiency_pct: AtomicValue;
  outlet_air_temp_C: AtomicValue;
  particle_size_um: AtomicValue;
  product_rate_kg_h: AtomicValue;
  specific_energy_kJ_kg: AtomicValue;
  residence_time_s: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class SprayDryerEngine {
  calculate(input: SprayDryerInput): SprayDryerResult {
    const {
      feed_rate_kg_h: Ff,
      feed_solids_pct: Xs = 30,
      inlet_air_temp_C: Tin,
      target_moisture_pct: Xp = 3,
      atomizer_type = "rotary",
      flow_config = "co_current",
      atomizer_speed_rpm: rpm = 15000,
      feed_viscosity_mPas: visc = 50,
    } = input;

    const recs: string[] = [];

    // Mass balance
    const waterInFeed = Ff * (1 - Xs / 100);
    const solidsInFeed = Ff * Xs / 100;
    const productRate = solidsInFeed / (1 - Xp / 100);
    const waterInProduct = productRate * Xp / 100;
    const evapRate = waterInFeed - waterInProduct;

    // Energy balance
    const Lv = 2400; // latent heat of vaporization kJ/kg
    const cpAir = 1.005; // kJ/kgK
    const heatRequired = evapRate * Lv; // kJ/h

    // Outlet air temperature
    const Tout_est = input.outlet_air_temp_C ??
      (flow_config === "co_current" ? Tin * 0.45 + 20 : Tin * 0.35 + 30);

    // Air flow rate
    const deltaT = Tin - Tout_est;
    const airFlow = heatRequired / (cpAir * Math.max(deltaT, 1)); // kg/h

    // Thermal efficiency
    const thermalEff = (Tin - Tout_est) / (Tin - 20) * 100;

    // Specific energy
    const specificEnergy = heatRequired / Math.max(evapRate, 0.001);

    // Particle size (empirical)
    const d_rotary = 1e4 * Math.pow(Ff / (rpm + 1), 0.5) * Math.pow(visc / 50, 0.25);
    const d_nozzle = atomizer_type === "pressure_nozzle" ? d_rotary * 2 : d_rotary * 0.8;
    const particleSize = atomizer_type === "rotary" ? d_rotary : d_nozzle;

    // Residence time estimate
    const chamberVol = Math.pow(airFlow / 3600 / 1.2, 0.5) * 10; // m³ rough
    const residenceTime = chamberVol * 3600 / (airFlow / 1.2 + 1);

    const isSafe = Tout_est > 60 && thermalEff > 20 && evapRate > 0;

    if (Tout_est < 80) recs.push(`Low outlet temp ${Tout_est.toFixed(0)}°C — product may be too wet`);
    if (Tout_est > 120 && flow_config === "co_current") recs.push(`High outlet ${Tout_est.toFixed(0)}°C — energy waste, reduce inlet temp`);
    if (thermalEff < 40) recs.push(`Low thermal efficiency ${thermalEff.toFixed(0)}% — optimize inlet/outlet temps`);
    if (Xs < 15) recs.push(`Low feed solids ${Xs}% — high energy cost, pre-concentrate feed`);
    if (flow_config === "counter_current" && Tin > 300) recs.push(`Counter-current at ${Tin}°C — product degradation risk`);
    if (recs.length === 0) recs.push(`Spray dryer nominal — ${evapRate.toFixed(0)}kg/h evap, η=${thermalEff.toFixed(0)}%, d=${particleSize.toFixed(0)}µm`);

    return {
      evaporation_rate_kg_h: mkAv(Math.round(evapRate * 10) / 10, "kg/h", evapRate * 0.05, "mass_balance"),
      air_flow_rate_kg_h: mkAv(Math.round(airFlow), "kg/h", airFlow * 0.10, "energy_balance"),
      thermal_efficiency_pct: mkAv(Math.round(thermalEff * 10) / 10, "%", thermalEff * 0.10, "dT_ratio"),
      outlet_air_temp_C: mkAv(Math.round(Tout_est), "°C", Tout_est * 0.05, "balance"),
      particle_size_um: mkAv(Math.round(particleSize), "µm", particleSize * 0.25, "empirical"),
      product_rate_kg_h: mkAv(Math.round(productRate * 10) / 10, "kg/h", productRate * 0.05, "mass_balance"),
      specific_energy_kJ_kg: mkAv(Math.round(specificEnergy), "kJ/kg", specificEnergy * 0.10, "Lv_eff"),
      residence_time_s: mkAv(Math.round(residenceTime * 10) / 10, "s", residenceTime * 0.20, "volume"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const sprayDryerEngine = new SprayDryerEngine();
