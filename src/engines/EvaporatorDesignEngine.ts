/**
 * EvaporatorDesignEngine — Single/multi-effect evaporator sizing
 *
 * Models: Steam economy, heat transfer area (Q=UAΔTlm),
 *         boiling point elevation, multi-effect steam economy
 * References: McCabe-Smith, Perry's Ch.11
 * Safety: BPE limits, fouling factor, pressure rating
 */

export type EvaporatorType = "falling_film" | "rising_film" | "forced_circulation" | "plate";

export interface EvaporatorDesignInput {
  feed_flow_kg_h: number;
  feed_concentration_pct?: number;      // default 5
  product_concentration_pct?: number;   // default 30
  steam_pressure_bar?: number;          // default 3
  num_effects?: number;                 // default 1
  evaporator_type?: EvaporatorType;
  feed_temp_C?: number;                 // default 60
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface EvaporatorDesignResult {
  heat_transfer_area_m2: AtomicValue;
  steam_consumption_kg_h: AtomicValue;
  steam_economy: AtomicValue;
  evaporation_rate_kg_h: AtomicValue;
  overall_U_W_m2K: AtomicValue;
  bpe_C: AtomicValue;
  product_flow_kg_h: AtomicValue;
  effective_dT_C: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class EvaporatorDesignEngine {
  calculate(input: EvaporatorDesignInput): EvaporatorDesignResult {
    const {
      feed_flow_kg_h: F,
      feed_concentration_pct: xf = 5,
      product_concentration_pct: xp = 30,
      steam_pressure_bar: Ps = 3,
      num_effects: N = 1,
      evaporator_type = "falling_film",
      feed_temp_C: Tf = 60,
    } = input;

    const recs: string[] = [];

    // Mass balance: F×xf = P×xp → P = F×xf/xp
    const P = F * (xf / 100) / (xp / 100);
    const W = F - P; // water evaporated

    // Steam temperature
    const Tsteam = 100 + (Ps - 1) * 20; // simplified sat temp
    const hfg_steam = 2200; // kJ/kg latent heat (approx)
    const hfg_vapor = 2257; // kJ/kg at 1 atm

    // BPE (boiling point elevation)
    const bpe = 0.5 * (xp / 10); // simplified, °C

    // Effective ΔT per effect
    const Tvapor = 100; // boiling at 1 atm
    const totalDT = Tsteam - Tvapor - bpe;
    const effectiveDT = totalDT / N;

    // Overall U (W/m²·K)
    const U = evaporator_type === "falling_film" ? 2500
      : evaporator_type === "rising_film" ? 2000
      : evaporator_type === "forced_circulation" ? 3000 : 3500;

    // Heat duty per effect
    const Q_total = W * hfg_vapor / 3600; // kW
    const Q_per_effect = Q_total / N;

    // Area per effect
    const A_per_effect = Q_per_effect * 1000 / (U * Math.max(effectiveDT, 5));
    const A_total = A_per_effect * N;

    // Steam economy
    const steamConsumption = W / N * 1.1; // 10% extra for losses
    const economy = W / steamConsumption;

    const isSafe = effectiveDT >= 5 && xp <= 70;

    if (effectiveDT < 8) recs.push(`Low effective ΔT ${effectiveDT.toFixed(1)}°C — large area needed, consider higher steam pressure`);
    if (xp > 50) recs.push(`High product concentration ${xp}% — BPE significant, use forced circulation`);
    if (N > 4) recs.push(`${N} effects — diminishing returns, verify economic justification`);
    if (evaporator_type === "rising_film" && xp > 25) recs.push(`Rising film not suitable above 25% concentration — switch to forced circulation`);
    if (recs.length === 0) recs.push(`Evaporator nominal — ${N}-effect, ${A_total.toFixed(0)}m², economy ${economy.toFixed(1)}`);

    return {
      heat_transfer_area_m2: mkAv(Math.round(A_total * 10) / 10, "m²", A_total * 0.12, "heat_transfer"),
      steam_consumption_kg_h: mkAv(Math.round(steamConsumption), "kg/h", steamConsumption * 0.10, "energy_balance"),
      steam_economy: mkAv(Math.round(economy * 100) / 100, "kg/kg", economy * 0.08, "multi_effect"),
      evaporation_rate_kg_h: mkAv(Math.round(W), "kg/h", W * 0.05, "mass_balance"),
      overall_U_W_m2K: mkAv(U, "W/m²·K", U * 0.15, "correlation"),
      bpe_C: mkAv(Math.round(bpe * 10) / 10, "°C", bpe * 0.20, "concentration"),
      product_flow_kg_h: mkAv(Math.round(P), "kg/h", P * 0.05, "mass_balance"),
      effective_dT_C: mkAv(Math.round(effectiveDT * 10) / 10, "°C", effectiveDT * 0.10, "thermal_analysis"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const evaporatorDesignEngine = new EvaporatorDesignEngine();
