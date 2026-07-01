/**
 * WaterHammerEngine — Water hammer / pressure surge analysis
 *
 * Models: Joukowsky equation (ΔP=ρ×a×ΔV), wave speed,
 *         critical closure time, pipe stress, surge relief
 * References: Wylie & Streeter, AWWA M11
 */

export type PipeMaterial = "steel" | "cast_iron" | "pvc" | "hdpe" | "concrete" | "copper";

export interface WaterHammerInput {
  pipe_diameter_mm: number;
  wall_thickness_mm: number;
  pipe_length_m: number;
  flow_velocity_m_s: number;
  pipe_material?: PipeMaterial;
  fluid_density_kg_m3?: number;         // default 1000
  bulk_modulus_GPa?: number;            // default 2.2 (water)
  valve_closure_time_s?: number;        // default instant
  steady_state_pressure_bar?: number;   // default 5
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface WaterHammerResult {
  pressure_surge_bar: AtomicValue;
  wave_speed_m_s: AtomicValue;
  max_pressure_bar: AtomicValue;
  critical_time_s: AtomicValue;
  pipe_hoop_stress_MPa: AtomicValue;
  reflection_time_s: AtomicValue;
  surge_energy_J: AtomicValue;
  closure_type: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const PIPE_E: Record<PipeMaterial, number> = {
  steel: 200, cast_iron: 100, pvc: 3, hdpe: 0.8, concrete: 30, copper: 120,
}; // GPa

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class WaterHammerEngine {
  calculate(input: WaterHammerInput): WaterHammerResult {
    const {
      pipe_diameter_mm: D,
      wall_thickness_mm: t,
      pipe_length_m: L,
      flow_velocity_m_s: V,
      pipe_material = "steel",
      fluid_density_kg_m3: rho = 1000,
      bulk_modulus_GPa: K = 2.2,
      steady_state_pressure_bar: P0 = 5,
    } = input;

    const recs: string[] = [];
    const Ep = PIPE_E[pipe_material] * 1e9; // Pa
    const Kf = K * 1e9; // Pa

    // Wave speed: a = √(K/ρ / (1 + (K×D)/(E×t)))
    const c1 = D / (Ep * t / 1000);
    const a = Math.sqrt(Kf / rho / (1 + Kf * c1 / 1000));

    // Critical closure time
    const Tc = 2 * L / a;
    const closureTime = input.valve_closure_time_s ?? 0;

    // Surge pressure (Joukowsky)
    let dP: number;
    if (closureTime <= Tc || closureTime === 0) {
      // Rapid closure — full Joukowsky
      dP = rho * a * V; // Pa
    } else {
      // Slow closure — reduced surge
      dP = rho * a * V * Tc / closureTime;
    }
    const dP_bar = dP / 1e5;

    const closureType = closureTime <= Tc ? 1 : 2; // 1=rapid, 2=slow
    const maxP = P0 + dP_bar;

    // Hoop stress at max pressure
    const hoopStress = maxP * 1e5 * D / (2 * t * 1e6); // MPa

    // Reflection time
    const reflectionTime = 2 * L / a;

    // Surge energy
    const Apipe = Math.PI / 4 * Math.pow(D / 1000, 2);
    const surgeEnergy = 0.5 * rho * Apipe * L * V * V;

    const allowStress = pipe_material === "steel" ? 150 : pipe_material === "pvc" ? 25 : pipe_material === "hdpe" ? 10 : 100;
    const isSafe = hoopStress < allowStress && dP_bar < P0 * 2;

    if (dP_bar > P0) recs.push(`Surge ${dP_bar.toFixed(1)}bar > steady ${P0}bar — install surge vessel or slow closure`);
    if (closureTime <= Tc && closureTime > 0) recs.push(`Rapid closure (${closureTime}s < Tc=${Tc.toFixed(2)}s) — full Joukowsky surge`);
    if (hoopStress > allowStress * 0.8) recs.push(`High hoop stress ${hoopStress.toFixed(0)}MPa — risk of pipe failure`);
    if (maxP < 0) recs.push(`Negative pressure — column separation risk, install air valves`);
    if (recs.length === 0) recs.push(`Water hammer nominal — ΔP=${dP_bar.toFixed(1)}bar, a=${a.toFixed(0)}m/s, Tc=${Tc.toFixed(2)}s`);

    return {
      pressure_surge_bar: mkAv(Math.round(dP_bar * 10) / 10, "bar", dP_bar * 0.08, "joukowsky"),
      wave_speed_m_s: mkAv(Math.round(a), "m/s", a * 0.05, "elastic_wave"),
      max_pressure_bar: mkAv(Math.round(maxP * 10) / 10, "bar", maxP * 0.08, "superposition"),
      critical_time_s: mkAv(Math.round(Tc * 1000) / 1000, "s", Tc * 0.05, "wave_travel"),
      pipe_hoop_stress_MPa: mkAv(Math.round(hoopStress * 10) / 10, "MPa", hoopStress * 0.08, "thin_wall"),
      reflection_time_s: mkAv(Math.round(reflectionTime * 1000) / 1000, "s", reflectionTime * 0.05, "2L_a"),
      surge_energy_J: mkAv(Math.round(surgeEnergy), "J", surgeEnergy * 0.10, "kinetic"),
      closure_type: mkAv(closureType, "type_code", 0, "Tc_comparison", closureType === 1 ? "rapid" : "slow"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const waterHammerEngine = new WaterHammerEngine();
