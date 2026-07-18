/**
 * SprayDryingEngine — Spray drying process analysis
 *
 * Models: Droplet evaporation (d² law), residence time,
 *         outlet temperature, particle size, thermal efficiency
 * References: Masters "Spray Drying Handbook", Oakley, Perry's Ch.12
 */

export type AtomizerType = "rotary" | "pressure_nozzle" | "two_fluid" | "ultrasonic";
export type DryerConfig = "co_current" | "counter_current" | "mixed_flow" | "fountain";

export interface SprayDryingInput {
  atomizer?: AtomizerType;
  config?: DryerConfig;
  feed_rate_kg_h?: number;           // default 100
  feed_solids_pct?: number;          // default 30
  inlet_temp_C?: number;             // default 180
  outlet_temp_C?: number;            // default 90
  feed_viscosity_mPas?: number;      // default 50
  target_moisture_pct?: number;      // default 3
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface SprayDryingResult {
  evaporation_rate_kg_h: AtomicValue;
  air_flow_kg_h: AtomicValue;
  particle_size_um: AtomicValue;
  residence_time_s: AtomicValue;
  thermal_efficiency_pct: AtomicValue;
  specific_energy_kJ_kg: AtomicValue;
  chamber_volume_m3: AtomicValue;
  powder_rate_kg_h: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class SprayDryingEngine {
  calculate(input: SprayDryingInput): SprayDryingResult {
    const {
      atomizer = "rotary",
      config = "co_current",
      feed_rate_kg_h: F = 100,
      feed_solids_pct: xF = 30,
      inlet_temp_C: Tin = 180,
      outlet_temp_C: Tout = 90,
      feed_viscosity_mPas: mu = 50,
      target_moisture_pct: targetMoist = 3,
    } = input;

    const recs: string[] = [];

    // Mass balance
    const waterIn = F * (1 - xF / 100);
    const solidsIn = F * xF / 100;
    const productMass = solidsIn / (1 - targetMoist / 100);
    const evapRate = F - productMass;

    // Air flow (energy balance: Q = m_air × cp_air × ΔT)
    const cpAir = 1.005; // kJ/kgK
    const latentHeat = 2500; // kJ/kg at ~80°C
    const Qevap = evapRate * latentHeat; // kJ/h
    const airFlow = Qevap / (cpAir * (Tin - Tout));

    // Thermal efficiency
    const thermalEff = (Tin - Tout) / (Tin - 20) * 100; // ambient 20°C

    // Specific energy
    const specEnergy = Qevap / (evapRate + 0.001);

    // Particle size (depends on atomizer type)
    const baseDroplet = atomizer === "rotary" ? 80 :
      atomizer === "pressure_nozzle" ? 150 :
      atomizer === "two_fluid" ? 30 : 10; // μm
    const viscEffect = Math.pow(mu / 50, 0.3);
    const feedEffect = Math.pow(F / 100, 0.2);
    const particleSize = baseDroplet * viscEffect * feedEffect * 0.8; // shrinkage on drying

    // Residence time
    const evapTime = Math.pow(particleSize / 1000, 2) / (4 * 2.5e-5) * 1.5; // d² law
    const residenceTime = Math.max(evapTime, 5); // minimum 5s

    // Chamber volume
    const airFlowM3s = airFlow / 1.2 / 3600; // m³/s (air density ~1.2 kg/m³)
    const chamberVol = airFlowM3s * residenceTime * 3; // factor 3 for recirculation

    const isSafe = Tout > 60 && Tout < Tin && evapRate > 0;

    if (Tin > 250) recs.push(`High inlet ${Tin}°C — thermal degradation risk for heat-sensitive products`);
    if (Tout < 70) recs.push(`Low outlet ${Tout}°C — high moisture product, sticking risk`);
    if (Tout > 120 && config === "co_current") recs.push(`High outlet ${Tout}°C — over-drying, energy waste`);
    if (config === "counter_current" && Tin > 200) recs.push(`Counter-current at ${Tin}°C — product exposure to hottest air, quality risk`);
    if (xF < 20) recs.push(`Low feed solids ${xF}% — poor economics, pre-concentrate to >30%`);
    if (recs.length === 0) recs.push(`Spray dry nominal — ${evapRate.toFixed(0)}kg/h evap, d=${particleSize.toFixed(0)}μm, η=${thermalEff.toFixed(0)}%`);

    return {
      evaporation_rate_kg_h: mkAv(Math.round(evapRate * 10) / 10, "kg/h", evapRate * 0.05, "mass_balance"),
      air_flow_kg_h: mkAv(Math.round(airFlow), "kg/h", airFlow * 0.10, "energy_balance"),
      particle_size_um: mkAv(Math.round(particleSize * 10) / 10, "μm", particleSize * 0.20, "atomizer_model"),
      residence_time_s: mkAv(Math.round(residenceTime * 10) / 10, "s", residenceTime * 0.15, "d2_law"),
      thermal_efficiency_pct: mkAv(Math.round(thermalEff * 10) / 10, "%", thermalEff * 0.05, "T_ratio"),
      specific_energy_kJ_kg: mkAv(Math.round(specEnergy * 10) / 10, "kJ/kg", specEnergy * 0.10, "Q_evap"),
      chamber_volume_m3: mkAv(Math.round(chamberVol * 100) / 100, "m³", chamberVol * 0.20, "airflow_time"),
      powder_rate_kg_h: mkAv(Math.round(productMass * 10) / 10, "kg/h", productMass * 0.05, "mass_balance"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const sprayDryingEngine = new SprayDryingEngine();
