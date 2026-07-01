/**
 * SustainabilityLCAEngine.ts
 * ==========================
 * 7 sustainability, energy, and economics models with full math.
 *
 * Methods:
 *   lifecycleAssessment      — ISO 14040/14044 multi-category LCA
 *   ecoEfficiencyFrontier    — Value/impact ratio & Pareto frontier
 *   exergyAnalysis           — 2nd law thermodynamic efficiency
 *   gutowskiEnergyModel      — Fixed + variable power decomposition
 *   coolantLifecycleEnergy   — Coolant total embedded energy
 *   stochasticToolLifeEconomics — Cost with Weibull-distributed tool life
 *   totalCostOfOwnership     — Full tooling TCO breakdown
 */

import { log } from "../utils/Logger.js";

// ─── Types ──────────────────────────────────────────────────────────────────

/** LCA impact categories per ISO 14044. */
export interface LCAInput {
  material_kg: number;
  material_type: "steel" | "aluminum" | "titanium" | "copper" | "plastic" | "inconel";
  energy_kwh: number;
  coolant_liters: number;
  tool_changes: number;
  transport_km: number;
  recycling_fraction: number;
}

export interface LCAImpacts {
  GWP_kg_CO2_eq: number;
  AP_kg_SO2_eq: number;
  EP_kg_PO4_eq: number;
  ODP_kg_CFC_eq: number;
  POCP_kg_C2H4_eq: number;
  ADP_kg_Sb_eq: number;
}

export interface LCAResult {
  impacts: LCAImpacts;
  phase_breakdown: Record<string, LCAImpacts>;
  normalized_score: number;
  dominant_phase: string;
  eco_points_total: number;
}

export interface EcoAlternative {
  name: string;
  value_metric: number;
  impacts: Record<string, number>;
}

export interface EcoEfficiencyResult {
  efficiency_scores: Record<string, number>;
  frontier_members: string[];
  dominated: string[];
  improvement_targets: Record<string, Record<string, number>>;
}

export interface ExergyInput {
  spindle_power_kW: number;
  feed_power_kW: number;
  coolant_power_kW: number;
  MRR_cm3_min: number;
  specific_cutting_energy_J_mm3: number;
  coolant_temp_in_C: number;
  coolant_temp_out_C: number;
}

export interface ExergyResult {
  exergy_efficiency_pct: number;
  exergy_destruction_kW: number;
  entropy_generation_W_K: number;
  irreversibility_ratio: number;
  improvement_potential_kW: number;
}

export interface GutowskiInput {
  idle_power_kW: number;
  specific_energy_J_mm3: number;
  part_volume_cm3: number;
  available_MRR_range: [number, number];
}

export interface GutowskiResult {
  optimal_MRR_cm3_min: number;
  energy_per_part_kWh: number;
  energy_per_volume_kWh_cm3: number;
  idle_fraction_pct: number;
  cutting_fraction_pct: number;
  energy_vs_MRR_curve: Array<{ mrr: number; energy: number }>;
}

export interface CoolantEnergyInput {
  coolant_type: "emulsion" | "synthetic" | "neat_oil" | "MQL";
  sump_volume_liters: number;
  pump_power_kW: number;
  sump_life_weeks: number;
  maintenance_interval_days: number;
  disposal_method: "recycle" | "incinerate" | "waste_treatment";
}

export interface CoolantEnergyResult {
  total_energy_kWh_per_year: number;
  production_pct: number;
  pumping_pct: number;
  maintenance_pct: number;
  disposal_pct: number;
  co2_per_year_kg: number;
  cost_per_year: number;
  mql_savings_pct: number;
}

export interface StochasticToolInput {
  machine_rate_per_min: number;
  tool_cost: number;
  tool_change_time_min: number;
  cycle_time_min: number;
  weibull_shape: number;
  weibull_scale_min: number;
  failure_penalty_cost: number;
}

export interface StochasticToolResult {
  expected_cost_per_part: number;
  std_cost: number;
  optimal_replacement_interval_min: number;
  cost_at_replacement: number;
  expected_failures_pct: number;
  deterministic_cost_comparison: number;
}

export interface TCOInput {
  purchase_price: number;
  n_edges: number;
  regrind_cost: number;
  max_regrinds: number;
  coating_cost: number;
  n_coatings: number;
  annual_usage: number;
  inventory_carrying_pct: number;
  failure_cost: number;
  failure_probability: number;
  disposal_cost: number;
}

export interface TCOResult {
  tco_per_edge: number;
  tco_per_year: number;
  purchase_pct: number;
  regrind_pct: number;
  coating_pct: number;
  carrying_pct: number;
  failure_pct: number;
  disposal_pct: number;
  breakeven_vs_cheaper_tool: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Emission factors per material type (kg CO2-eq per kg material). */
const MATERIAL_GWP: Record<string, number> = {
  steel: 1.8, aluminum: 8.1, titanium: 35.0, copper: 3.5, plastic: 3.2, inconel: 28.0,
};
const MATERIAL_AP: Record<string, number> = {
  steel: 0.008, aluminum: 0.04, titanium: 0.15, copper: 0.02, plastic: 0.012, inconel: 0.12,
};
const MATERIAL_EP: Record<string, number> = {
  steel: 0.001, aluminum: 0.005, titanium: 0.02, copper: 0.003, plastic: 0.002, inconel: 0.015,
};
const MATERIAL_ODP: Record<string, number> = {
  steel: 1e-8, aluminum: 5e-8, titanium: 2e-7, copper: 3e-8, plastic: 1e-7, inconel: 1.5e-7,
};
const MATERIAL_POCP: Record<string, number> = {
  steel: 0.0005, aluminum: 0.002, titanium: 0.008, copper: 0.001, plastic: 0.003, inconel: 0.006,
};
const MATERIAL_ADP: Record<string, number> = {
  steel: 0.01, aluminum: 0.03, titanium: 0.12, copper: 0.08, plastic: 0.02, inconel: 0.10,
};

/** Grid emission factor (kg CO2-eq per kWh). */
const GRID_CO2 = 0.45;
const COOLANT_GWP_PER_L = 0.35;
const TOOL_CHANGE_GWP = 2.5;
const TRANSPORT_GWP_PER_KM = 0.0001;

/** Coolant production energy (kWh per liter). */
const COOLANT_PROD_ENERGY: Record<string, number> = {
  emulsion: 0.8, synthetic: 0.6, neat_oil: 1.5, MQL: 0.3,
};
const COOLANT_COST_PER_L: Record<string, number> = {
  emulsion: 3.5, synthetic: 4.0, neat_oil: 8.0, MQL: 12.0,
};
const DISPOSAL_ENERGY: Record<string, number> = {
  recycle: 0.2, incinerate: 0.8, waste_treatment: 0.5,
};
const DISPOSAL_COST_PER_L: Record<string, number> = {
  recycle: 0.5, incinerate: 1.5, waste_treatment: 1.0,
};

// ─── Engine ─────────────────────────────────────────────────────────────────

class SustainabilityLCAEngineImpl {
  /** ISO 14040/14044 multi-category lifecycle assessment. */
  lifecycleAssessment(input: LCAInput): LCAResult {
    const { material_kg, material_type, energy_kwh, coolant_liters, tool_changes, transport_km, recycling_fraction } = input;
    const mt = material_type;
    const rf = Math.max(0, Math.min(1, recycling_fraction));

    // Phase 1: Material extraction (reduced by recycling)
    const matFactor = 1 - rf * 0.7;
    const extraction: LCAImpacts = {
      GWP_kg_CO2_eq: material_kg * (MATERIAL_GWP[mt] ?? 2) * matFactor,
      AP_kg_SO2_eq: material_kg * (MATERIAL_AP[mt] ?? 0.01) * matFactor,
      EP_kg_PO4_eq: material_kg * (MATERIAL_EP[mt] ?? 0.002) * matFactor,
      ODP_kg_CFC_eq: material_kg * (MATERIAL_ODP[mt] ?? 5e-8) * matFactor,
      POCP_kg_C2H4_eq: material_kg * (MATERIAL_POCP[mt] ?? 0.001) * matFactor,
      ADP_kg_Sb_eq: material_kg * (MATERIAL_ADP[mt] ?? 0.02) * matFactor,
    };

    // Phase 2: Manufacturing (energy + coolant + tooling)
    const manufacturing: LCAImpacts = {
      GWP_kg_CO2_eq: energy_kwh * GRID_CO2 + coolant_liters * COOLANT_GWP_PER_L + tool_changes * TOOL_CHANGE_GWP,
      AP_kg_SO2_eq: energy_kwh * 0.002 + coolant_liters * 0.001,
      EP_kg_PO4_eq: energy_kwh * 0.0003 + coolant_liters * 0.0005,
      ODP_kg_CFC_eq: energy_kwh * 1e-9,
      POCP_kg_C2H4_eq: energy_kwh * 0.0001 + coolant_liters * 0.00005,
      ADP_kg_Sb_eq: energy_kwh * 0.0005,
    };

    // Phase 3: Use (transport)
    const use: LCAImpacts = {
      GWP_kg_CO2_eq: transport_km * TRANSPORT_GWP_PER_KM * material_kg,
      AP_kg_SO2_eq: transport_km * 5e-6 * material_kg,
      EP_kg_PO4_eq: transport_km * 1e-6 * material_kg,
      ODP_kg_CFC_eq: 0,
      POCP_kg_C2H4_eq: transport_km * 2e-6 * material_kg,
      ADP_kg_Sb_eq: transport_km * 1e-5 * material_kg,
    };

    // Phase 4: End-of-life (credit for recycling)
    const eol: LCAImpacts = {
      GWP_kg_CO2_eq: material_kg * 0.3 * (1 - rf) + material_kg * rf * (-0.5 * (MATERIAL_GWP[mt] ?? 2)),
      AP_kg_SO2_eq: material_kg * 0.001 * (1 - rf),
      EP_kg_PO4_eq: material_kg * 0.0002 * (1 - rf),
      ODP_kg_CFC_eq: 0,
      POCP_kg_C2H4_eq: material_kg * 0.00005 * (1 - rf),
      ADP_kg_Sb_eq: material_kg * 0.001 * (1 - rf),
    };

    const phases: Record<string, LCAImpacts> = { extraction, manufacturing, use, end_of_life: eol };
    const sumImpact = (key: keyof LCAImpacts) =>
      extraction[key] + manufacturing[key] + use[key] + eol[key];

    const impacts: LCAImpacts = {
      GWP_kg_CO2_eq: sumImpact("GWP_kg_CO2_eq"),
      AP_kg_SO2_eq: sumImpact("AP_kg_SO2_eq"),
      EP_kg_PO4_eq: sumImpact("EP_kg_PO4_eq"),
      ODP_kg_CFC_eq: sumImpact("ODP_kg_CFC_eq"),
      POCP_kg_C2H4_eq: sumImpact("POCP_kg_C2H4_eq"),
      ADP_kg_Sb_eq: sumImpact("ADP_kg_Sb_eq"),
    };

    // Eco-indicator normalization (simplified, EU-27 reference)
    const norm = impacts.GWP_kg_CO2_eq / 11.0 + impacts.AP_kg_SO2_eq / 0.06 +
      impacts.EP_kg_PO4_eq / 0.012 + impacts.ODP_kg_CFC_eq / 2e-5 +
      impacts.POCP_kg_C2H4_eq / 0.006 + impacts.ADP_kg_Sb_eq / 0.05;
    const normalized_score = Math.round(norm * 1000) / 1000;

    // Weighted eco-points (CML weighting)
    const eco_points_total = Math.round((impacts.GWP_kg_CO2_eq * 1.0 + impacts.AP_kg_SO2_eq * 5.0 +
      impacts.EP_kg_PO4_eq * 10.0 + impacts.POCP_kg_C2H4_eq * 8.0 + impacts.ADP_kg_Sb_eq * 3.0) * 100) / 100;

    // Find dominant phase by GWP
    const phaseGWP = Object.entries(phases).map(([k, v]) => ({ k, v: v.GWP_kg_CO2_eq }));
    const dominant_phase = phaseGWP.reduce((a, b) => (Math.abs(b.v) > Math.abs(a.v) ? b : a)).k;

    log.info(`LCA: GWP=${impacts.GWP_kg_CO2_eq.toFixed(2)} kg CO2-eq, dominant=${dominant_phase}`);
    return { impacts, phase_breakdown: phases, normalized_score, dominant_phase, eco_points_total };
  }

  /** Eco-efficiency frontier analysis (value/impact Pareto). */
  ecoEfficiencyFrontier(input: { alternatives: EcoAlternative[] }): EcoEfficiencyResult {
    const { alternatives } = input;
    const efficiency_scores: Record<string, number> = {};
    const allImpactKeys = new Set<string>();
    alternatives.forEach(a => Object.keys(a.impacts).forEach(k => allImpactKeys.add(k)));

    // Aggregate impact = sum of normalized impacts
    alternatives.forEach(a => {
      const totalImpact = Object.values(a.impacts).reduce((s, v) => s + Math.abs(v), 0);
      efficiency_scores[a.name] = totalImpact > 0 ? a.value_metric / totalImpact : Infinity;
    });

    // Pareto dominance: a dominates b if value >= and all impacts <=, with at least one strict
    const frontier_members: string[] = [];
    const dominated: string[] = [];
    for (const a of alternatives) {
      let isDominated = false;
      for (const b of alternatives) {
        if (a.name === b.name) continue;
        const bBetterOrEqual = b.value_metric >= a.value_metric &&
          [...allImpactKeys].every(k => (b.impacts[k] ?? 0) <= (a.impacts[k] ?? 0));
        const bStrictlyBetter = b.value_metric > a.value_metric ||
          [...allImpactKeys].some(k => (b.impacts[k] ?? 0) < (a.impacts[k] ?? 0));
        if (bBetterOrEqual && bStrictlyBetter) { isDominated = true; break; }
      }
      (isDominated ? dominated : frontier_members).push(a.name);
    }

    // Improvement targets for dominated alternatives
    const improvement_targets: Record<string, Record<string, number>> = {};
    for (const name of dominated) {
      const a = alternatives.find(x => x.name === name)!;
      const nearest = alternatives.filter(x => frontier_members.includes(x.name))
        .map(f => ({ f, dist: Math.sqrt([...allImpactKeys].reduce((s, k) => s + ((a.impacts[k] ?? 0) - (f.impacts[k] ?? 0)) ** 2, 0)) }))
        .sort((x, y) => x.dist - y.dist)[0];
      if (nearest) {
        const targets: Record<string, number> = {};
        for (const k of allImpactKeys) {
          const diff = (a.impacts[k] ?? 0) - (nearest.f.impacts[k] ?? 0);
          if (diff > 0) targets[k] = Math.round(diff * 1000) / 1000;
        }
        improvement_targets[name] = targets;
      }
    }

    log.info(`EcoEfficiency: ${frontier_members.length} frontier, ${dominated.length} dominated`);
    return { efficiency_scores, frontier_members, dominated, improvement_targets };
  }

  /** 2nd law thermodynamic exergy analysis. */
  exergyAnalysis(input: ExergyInput): ExergyResult {
    const { spindle_power_kW, feed_power_kW, coolant_power_kW, MRR_cm3_min, specific_cutting_energy_J_mm3, coolant_temp_in_C, coolant_temp_out_C } = input;
    const E_in = spindle_power_kW + feed_power_kW + coolant_power_kW;
    // MRR cm3/min = 1000 mm3/min; SCE in J/mm3; power = SCE * MRR_mm3/s
    const MRR_mm3_s = (MRR_cm3_min * 1000) / 60;
    const E_useful = (specific_cutting_energy_J_mm3 * MRR_mm3_s) / 1000; // kW

    // Coolant heat recovery exergy (Carnot-limited)
    const T0 = 298.15; // K (25C reference)
    const T_in = coolant_temp_in_C + 273.15;
    const T_out = coolant_temp_out_C + 273.15;
    const dT = Math.abs(T_out - T_in);
    // Approximate coolant flow heat: Q = m_dot * Cp * dT, but we use pump power as proxy
    const Q_coolant = coolant_power_kW * 0.3 * dT / 10; // simplified thermal recovery
    const carnot = dT > 0 ? 1 - T0 / Math.max(T_in, T_out) : 0;
    const E_recovered = Q_coolant * Math.max(0, carnot);

    const E_destroyed = Math.max(0, E_in - E_useful - E_recovered);
    const exergy_efficiency_pct = E_in > 0 ? Math.round((E_useful / E_in) * 10000) / 100 : 0;
    // Entropy generation: S_gen = E_destroyed / T0 (kW/K -> W/K)
    const entropy_generation_W_K = Math.round((E_destroyed / (T0 / 1000)) * 100) / 100;
    const irreversibility_ratio = E_in > 0 ? Math.round((E_destroyed / E_in) * 10000) / 100 : 0;
    const improvement_potential_kW = Math.round(E_destroyed * (1 - exergy_efficiency_pct / 100) * 1000) / 1000;

    log.info(`Exergy: eff=${exergy_efficiency_pct}%, destruction=${E_destroyed.toFixed(3)} kW`);
    return {
      exergy_efficiency_pct,
      exergy_destruction_kW: Math.round(E_destroyed * 1000) / 1000,
      entropy_generation_W_K,
      irreversibility_ratio,
      improvement_potential_kW,
    };
  }

  /** Gutowski fixed + variable power decomposition model. */
  gutowskiEnergyModel(input: GutowskiInput): GutowskiResult {
    const { idle_power_kW, specific_energy_J_mm3, part_volume_cm3, available_MRR_range } = input;
    const V_mm3 = part_volume_cm3 * 1000; // cm3 -> mm3
    const k = specific_energy_J_mm3; // J/mm3
    const P0 = idle_power_kW;
    const [mrrMin, mrrMax] = available_MRR_range;

    // Energy per part: E = P0 * (V / MRR) + k * V  (MRR in mm3/min, V in mm3)
    // dE/dMRR = -P0 * V / MRR^2 => always negative, so higher MRR = less energy
    // But practical limit is mrrMax. Optimal is at max MRR.
    const calcEnergy = (mrr_cm3: number): number => {
      const mrr_mm3_min = mrr_cm3 * 1000;
      const t_min = V_mm3 / mrr_mm3_min;
      const E_idle = P0 * (t_min / 60); // kWh
      const E_cut = (k * V_mm3) / (3.6e6); // J -> kWh
      return E_idle + E_cut;
    };

    const optimal_MRR = mrrMax; // monotonically decreasing
    const energy_per_part = Math.round(calcEnergy(optimal_MRR) * 1e6) / 1e6;
    const energy_per_volume = part_volume_cm3 > 0 ? Math.round((energy_per_part / part_volume_cm3) * 1e6) / 1e6 : 0;

    const t_cycle = V_mm3 / (optimal_MRR * 1000);
    const E_idle_opt = P0 * (t_cycle / 60);
    const E_cut_opt = (k * V_mm3) / 3.6e6;
    const E_total_opt = E_idle_opt + E_cut_opt;
    const idle_fraction_pct = E_total_opt > 0 ? Math.round((E_idle_opt / E_total_opt) * 10000) / 100 : 0;
    const cutting_fraction_pct = Math.round((100 - idle_fraction_pct) * 100) / 100;

    // Generate curve with 10 points
    const steps = 10;
    const curve: Array<{ mrr: number; energy: number }> = [];
    for (let i = 0; i <= steps; i++) {
      const mrr = mrrMin + (mrrMax - mrrMin) * (i / steps);
      curve.push({ mrr: Math.round(mrr * 1000) / 1000, energy: Math.round(calcEnergy(mrr) * 1e6) / 1e6 });
    }

    log.info(`Gutowski: optimal MRR=${optimal_MRR}, E/part=${energy_per_part} kWh`);
    return { optimal_MRR_cm3_min: optimal_MRR, energy_per_part_kWh: energy_per_part, energy_per_volume_kWh_cm3: energy_per_volume, idle_fraction_pct, cutting_fraction_pct, energy_vs_MRR_curve: curve };
  }

  /** Coolant lifecycle embedded energy analysis. */
  coolantLifecycleEnergy(input: CoolantEnergyInput): CoolantEnergyResult {
    const { coolant_type, sump_volume_liters, pump_power_kW, sump_life_weeks, maintenance_interval_days, disposal_method } = input;
    const hoursPerYear = 2000; // operating hours
    const changesPerYear = 52 / Math.max(1, sump_life_weeks);
    const maintenancePerYear = 365 / Math.max(1, maintenance_interval_days);

    const E_production = sump_volume_liters * (COOLANT_PROD_ENERGY[coolant_type] ?? 0.8) * changesPerYear;
    const E_pumping = pump_power_kW * hoursPerYear;
    const E_maintenance = maintenancePerYear * sump_volume_liters * 0.02; // kWh per maintenance event per liter
    const E_disposal = sump_volume_liters * (DISPOSAL_ENERGY[disposal_method] ?? 0.5) * changesPerYear;
    const total = E_production + E_pumping + E_maintenance + E_disposal;

    const production_pct = total > 0 ? Math.round((E_production / total) * 10000) / 100 : 0;
    const pumping_pct = total > 0 ? Math.round((E_pumping / total) * 10000) / 100 : 0;
    const maintenance_pct = total > 0 ? Math.round((E_maintenance / total) * 10000) / 100 : 0;
    const disposal_pct = Math.round((100 - production_pct - pumping_pct - maintenance_pct) * 100) / 100;

    const co2 = Math.round(total * GRID_CO2 * 100) / 100;

    // Cost
    const coolantCostYear = sump_volume_liters * (COOLANT_COST_PER_L[coolant_type] ?? 4) * changesPerYear;
    const pumpCostYear = E_pumping * 0.12; // $/kWh electricity
    const disposalCostYear = sump_volume_liters * (DISPOSAL_COST_PER_L[disposal_method] ?? 1) * changesPerYear;
    const cost_per_year = Math.round((coolantCostYear + pumpCostYear + disposalCostYear) * 100) / 100;

    // MQL comparison: estimate MQL total energy
    const mqlPump = 0.1 * hoursPerYear; // MQL uses ~0.1 kW
    const mqlProd = 0.5 * (COOLANT_PROD_ENERGY.MQL) * 52; // ~0.5L/week
    const mqlTotal = mqlPump + mqlProd;
    const mql_savings_pct = total > 0 ? Math.round(((total - mqlTotal) / total) * 10000) / 100 : 0;

    log.info(`CoolantLCA: ${total.toFixed(1)} kWh/yr, CO2=${co2} kg/yr, MQL saves ${mql_savings_pct}%`);
    return { total_energy_kWh_per_year: Math.round(total * 100) / 100, production_pct, pumping_pct, maintenance_pct, disposal_pct, co2_per_year_kg: co2, cost_per_year, mql_savings_pct };
  }

  /** Stochastic tool life economics with Weibull-distributed failure. */
  stochasticToolLifeEconomics(input: StochasticToolInput): StochasticToolResult {
    const { machine_rate_per_min, tool_cost, tool_change_time_min, cycle_time_min, weibull_shape, weibull_scale_min, failure_penalty_cost } = input;
    const beta = weibull_shape;
    const eta = weibull_scale_min;

    // Weibull reliability: R(t) = exp(-(t/eta)^beta)
    // Expected tool life: E[T] = eta * Gamma(1 + 1/beta)
    const gammaApprox = (x: number): number => {
      // Stirling for Gamma(x), x > 0
      if (x <= 0) return 1;
      if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaApprox(1 - x));
      const g = 7; const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
      const xm = x - 1;
      let s = c[0];
      for (let i = 1; i < g + 2; i++) s += c[i] / (xm + i);
      const t = xm + g + 0.5;
      return Math.sqrt(2 * Math.PI) * Math.pow(t, xm + 0.5) * Math.exp(-t) * s;
    };

    const E_T = eta * gammaApprox(1 + 1 / beta);
    const parts_per_tool = E_T / cycle_time_min;

    // Deterministic cost (Taylor): C_det = Cm*tc + (Ct + Cm*ttc) / N
    const C_m = machine_rate_per_min;
    const C_det = C_m * cycle_time_min + (tool_cost + C_m * tool_change_time_min) / Math.max(1, parts_per_tool);

    // Stochastic: include failure probability during each part
    // P(fail during part i) = 1 - R(i*tc) / R((i-1)*tc)
    // Expected cost includes penalty for mid-part failures
    const R = (t: number) => Math.exp(-Math.pow(t / eta, beta));
    let totalCost = 0;
    let totalCostSq = 0;
    const nSim = Math.ceil(parts_per_tool * 3);
    let cumProb = 0;
    let failProb = 0;

    for (let i = 1; i <= nSim && cumProb < 0.999; i++) {
      const pSurvive = R(i * cycle_time_min);
      const pFail = R((i - 1) * cycle_time_min) - pSurvive;
      const pPart = R((i - 1) * cycle_time_min) - cumProb;
      if (pPart <= 0) break;

      // Cost if part completes: machining + amortized change
      const costOk = C_m * cycle_time_min;
      // Cost if fails: machining + penalty + tool change
      const costFail = C_m * cycle_time_min + failure_penalty_cost + tool_cost + C_m * tool_change_time_min;

      const pFailCond = pPart > 0 ? pFail / (R((i - 1) * cycle_time_min)) : 0;
      const eCost = costOk * (1 - pFailCond) + costFail * pFailCond;
      totalCost += eCost * Math.min(pPart, 1);
      totalCostSq += eCost * eCost * Math.min(pPart, 1);
      cumProb += pFail;
      failProb += pFail;
    }

    // Add tool change cost amortized
    const expectedCost = totalCost / Math.max(1, parts_per_tool) + (tool_cost + C_m * tool_change_time_min) / Math.max(1, parts_per_tool);
    const variance = Math.max(0, totalCostSq / Math.max(1, parts_per_tool) - (totalCost / Math.max(1, parts_per_tool)) ** 2);
    const std_cost = Math.round(Math.sqrt(variance) * 100) / 100;

    // Optimal replacement: minimize expected cost by replacing at T_r < eta
    // Search over replacement intervals
    let bestCost = Infinity;
    let bestTr = eta;
    for (let tr = cycle_time_min; tr <= eta * 2; tr += cycle_time_min * 0.5) {
      const partsAtTr = Math.floor(tr / cycle_time_min);
      if (partsAtTr < 1) continue;
      const pSurv = R(tr);
      const costPerCycle = (C_m * cycle_time_min * partsAtTr + tool_cost + C_m * tool_change_time_min +
        (1 - pSurv) * failure_penalty_cost) / partsAtTr;
      if (costPerCycle < bestCost) { bestCost = costPerCycle; bestTr = tr; }
    }

    const expected_failures_pct = Math.round((1 - R(bestTr)) * 10000) / 100;

    log.info(`StochasticTool: E[cost]=${expectedCost.toFixed(2)}, optimal_Tr=${bestTr.toFixed(1)} min`);
    return {
      expected_cost_per_part: Math.round(expectedCost * 100) / 100,
      std_cost,
      optimal_replacement_interval_min: Math.round(bestTr * 10) / 10,
      cost_at_replacement: Math.round(bestCost * 100) / 100,
      expected_failures_pct,
      deterministic_cost_comparison: Math.round(C_det * 100) / 100,
    };
  }

  /** Full tooling total cost of ownership. */
  totalCostOfOwnership(input: TCOInput): TCOResult {
    const { purchase_price, n_edges, regrind_cost, max_regrinds, coating_cost, n_coatings, annual_usage, inventory_carrying_pct, failure_cost, failure_probability, disposal_cost } = input;

    const total_edges = n_edges * (1 + max_regrinds);
    const tools_per_year = Math.ceil(annual_usage / Math.max(1, total_edges));

    const purchase_total = purchase_price * tools_per_year;
    const regrind_total = regrind_cost * max_regrinds * tools_per_year;
    const coating_total = coating_cost * n_coatings * tools_per_year;
    const carrying_total = purchase_price * tools_per_year * (inventory_carrying_pct / 100) * 0.5; // avg inventory
    const failure_total = failure_cost * failure_probability * annual_usage;
    const disposal_total = disposal_cost * tools_per_year;

    const tco_year = purchase_total + regrind_total + coating_total + carrying_total + failure_total + disposal_total;
    const tco_edge = annual_usage > 0 ? Math.round((tco_year / annual_usage) * 100) / 100 : 0;

    const pct = (v: number) => tco_year > 0 ? Math.round((v / tco_year) * 10000) / 100 : 0;

    // Breakeven: how much cheaper could a tool be to justify no regrind?
    // No-regrind TCO = (price_alt / n_edges) * annual_usage + carrying + failure + disposal
    // Set equal to current TCO and solve for price_alt
    const nonToolCosts = carrying_total + failure_total + disposal_total;
    const currentTooling = purchase_total + regrind_total + coating_total;
    // price_alt * (annual_usage / n_edges) = currentTooling => price_alt = currentTooling * n_edges / annual_usage
    const breakeven = annual_usage > 0 ? Math.round((currentTooling * n_edges / annual_usage) * 100) / 100 : 0;

    log.info(`TCO: $${tco_edge}/edge, $${tco_year.toFixed(0)}/yr, ${tools_per_year} tools/yr`);
    return {
      tco_per_edge: tco_edge,
      tco_per_year: Math.round(tco_year * 100) / 100,
      purchase_pct: pct(purchase_total),
      regrind_pct: pct(regrind_total),
      coating_pct: pct(coating_total),
      carrying_pct: pct(carrying_total),
      failure_pct: pct(failure_total),
      disposal_pct: pct(disposal_total),
      breakeven_vs_cheaper_tool: breakeven,
    };
  }
}

export const sustainabilityLCAEngine = new SustainabilityLCAEngineImpl();
