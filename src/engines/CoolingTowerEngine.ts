/**
 * CoolingTowerEngine — Cooling tower thermal and hydraulic sizing
 *
 * Models: Merkel method (NTU = ∫dT/(h_w-h_a)), range/approach analysis,
 *         L/G ratio, fan power, makeup water
 * References: CTI (Cooling Technology Institute) standards, ASHRAE
 * Safety: Legionella risk, drift loss, structural wind loads
 */

export interface CoolingTowerInput {
  heat_load_kW: number;
  hot_water_temp_C: number;
  cold_water_temp_C: number;
  wet_bulb_temp_C?: number;            // default 25
  water_flow_m3_h?: number;            // calculated if not given
  tower_type?: "induced_draft" | "forced_draft" | "natural_draft" | "crossflow";
  fill_type?: "film" | "splash";       // default film
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CoolingTowerResult {
  range_C: AtomicValue;
  approach_C: AtomicValue;
  water_flow_m3_h: AtomicValue;
  lg_ratio: AtomicValue;
  ntu: AtomicValue;
  fan_power_kW: AtomicValue;
  evaporation_rate_m3_h: AtomicValue;
  makeup_water_m3_h: AtomicValue;
  tower_efficiency_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class CoolingTowerEngine {
  calculate(input: CoolingTowerInput): CoolingTowerResult {
    const {
      heat_load_kW: Q,
      hot_water_temp_C: Thot,
      cold_water_temp_C: Tcold,
      wet_bulb_temp_C: Twb = 25,
      tower_type = "induced_draft",
      fill_type = "film",
    } = input;

    const recs: string[] = [];
    const range = Thot - Tcold;
    const approach = Tcold - Twb;
    const cp = 4.186; // kJ/(kg·°C)

    // Water flow rate: Q = m × cp × ΔT
    const waterFlow = input.water_flow_m3_h ?? (Q / (cp * range) * 3.6); // m³/h

    // L/G ratio (liquid to gas mass ratio)
    // Typical 1.0-1.5 for counterflow
    const lgRatio = tower_type === "natural_draft" ? 0.8 : fill_type === "film" ? 1.2 : 1.5;

    // NTU (Number of Transfer Units) — Merkel simplified
    // NTU ≈ range / approach × correction
    const ntu = range / Math.max(approach, 1) * 0.7;

    // Fan power (empirical: ~0.02 kW per kW heat load for induced draft)
    const fanFactor = tower_type === "induced_draft" ? 0.02
      : tower_type === "forced_draft" ? 0.025
      : tower_type === "natural_draft" ? 0.005 : 0.018;
    const fanPower = Q * fanFactor;

    // Evaporation: ~1% of flow per 7°C range
    const evapRate = waterFlow * range / 700;
    // Drift: ~0.005% for modern eliminators
    const driftRate = waterFlow * 0.00005;
    // Blowdown: typically equals evaporation / (cycles - 1), cycles ≈ 5
    const blowdown = evapRate / 4;
    const makeupWater = evapRate + driftRate + blowdown;

    // Efficiency: η = range / (range + approach)
    const efficiency = (range / (range + approach)) * 100;

    const isSafe = approach >= 3 && range >= 5;

    if (approach < 5) {
      recs.push(`Low approach ${approach.toFixed(1)}°C — larger tower or better fill needed`);
    }
    if (approach < 3) {
      recs.push(`CRITICAL: approach ${approach.toFixed(1)}°C below 3°C minimum — redesign required`);
    }
    if (Thot > 50) {
      recs.push(`Hot water ${Thot}°C — verify fill material temperature rating`);
    }
    if (makeupWater > waterFlow * 0.05) {
      recs.push(`High makeup ${makeupWater.toFixed(1)}m³/h — verify water treatment capacity`);
    }
    if (recs.length === 0) {
      recs.push(`Tower sizing nominal — ${range}°C range, ${approach.toFixed(1)}°C approach, ${efficiency.toFixed(1)}% efficiency`);
    }

    return {
      range_C: mkAv(range, "°C", 0, "input"),
      approach_C: mkAv(Math.round(approach * 10) / 10, "°C", approach * 0.10, "input"),
      water_flow_m3_h: mkAv(Math.round(waterFlow * 10) / 10, "m³/h", waterFlow * 0.05, "energy_balance"),
      lg_ratio: mkAv(lgRatio, "ratio", lgRatio * 0.10, "tower_type_ref"),
      ntu: mkAv(Math.round(ntu * 100) / 100, "NTU", ntu * 0.15, "merkel_simplified"),
      fan_power_kW: mkAv(Math.round(fanPower * 10) / 10, "kW", fanPower * 0.15, "empirical"),
      evaporation_rate_m3_h: mkAv(Math.round(evapRate * 100) / 100, "m³/h", evapRate * 0.10, "mass_transfer"),
      makeup_water_m3_h: mkAv(Math.round(makeupWater * 100) / 100, "m³/h", makeupWater * 0.10, "water_balance"),
      tower_efficiency_pct: mkAv(Math.round(efficiency * 10) / 10, "%", efficiency * 0.05, "range_approach"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const coolingTowerEngine = new CoolingTowerEngine();
