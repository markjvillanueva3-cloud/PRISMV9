/**
 * SustainabilityFormulasEngine — 7 SUSTAINABILITY formulas for environmental & efficiency analysis
 *
 * Methods:
 *   - carbonFootprint: CO2=Σ(E_i×EF_i) scope 1+2+3 emissions
 *   - specificEnergy: SEC=P×t/V_removed [kJ/cm³], benchmark vs theoretical minimum
 *   - coolantLifecycle: TCO=purchase+Σ(maintenance)+disposal, optimal replace interval
 *   - materialUtilization: η=V_part/V_stock×100, buy-to-fly ratio, scrap value offset
 *   - waterFootprint: direct+indirect+cooling water consumption per part
 *   - wasteClassification: hazardous vs recyclable streams, disposal cost
 *   - energyBreakdown: spindle vs axis vs coolant vs auxiliary power split
 *
 * Actions: sustainability_carbon_footprint, sustainability_specific_energy,
 *          sustainability_coolant_lifecycle, sustainability_material_utilization
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface CarbonFootprintInput {
  /** Electricity consumed [kWh] */
  electricity_kwh: number;
  /** Grid emission factor [kg CO2/kWh] (default 0.4 world avg) */
  grid_ef_kg_per_kwh?: number;
  /** Natural gas consumed [m³] (optional) */
  natural_gas_m3?: number;
  /** Gas emission factor [kg CO2/m³] (default 2.0) */
  gas_ef_kg_per_m3?: number;
  /** Transport distance [km] (optional) */
  transport_km?: number;
  /** Transport emission factor [kg CO2/km] (default 0.1 for truck) */
  transport_ef_kg_per_km?: number;
  /** Raw material mass [kg] (optional) */
  material_mass_kg?: number;
  /** Material embodied carbon [kg CO2/kg] (default 2.0 for steel) */
  material_ef_kg_per_kg?: number;
  /** Number of parts in batch */
  batch_size?: number;
}

export interface CarbonFootprintResult {
  scope1_kg_co2: number;
  scope2_kg_co2: number;
  scope3_kg_co2: number;
  total_kg_co2: number;
  per_part_kg_co2: number;
  breakdown: { source: string; kg_co2: number; pct: number }[];
  formula: string;
  warnings: string[];
}

export interface SpecificEnergyInput {
  /** Spindle power [kW] */
  power_kw: number;
  /** Cutting time [min] */
  cutting_time_min: number;
  /** Material removal volume [cm³] */
  volume_removed_cm3: number;
  /** Material type for theoretical minimum lookup */
  material?: string;
}

export interface SpecificEnergyResult {
  sec_kj_per_cm3: number;
  sec_kwh_per_cm3: number;
  theoretical_min_kj_per_cm3: number;
  efficiency_pct: number;
  energy_rating: string;
  formula: string;
  warnings: string[];
}

export interface CoolantLifecycleInput {
  /** Purchase cost per fill [currency] */
  purchase_cost: number;
  /** Volume per fill [liters] */
  fill_volume_liters: number;
  /** Maintenance cost per week [currency] */
  maintenance_cost_per_week: number;
  /** Expected life [weeks] */
  expected_life_weeks: number;
  /** Disposal cost per liter [currency] */
  disposal_cost_per_liter: number;
  /** Top-up rate [liters/week] */
  topup_rate_liters_per_week?: number;
  /** Top-up concentrate cost per liter */
  topup_cost_per_liter?: number;
}

export interface CoolantLifecycleResult {
  tco: number;
  cost_per_week: number;
  optimal_replace_weeks: number;
  purchase_pct: number;
  maintenance_pct: number;
  disposal_pct: number;
  topup_pct: number;
  formula: string;
  warnings: string[];
}

export interface MaterialUtilizationInput {
  /** Final part volume [cm³] */
  part_volume_cm3: number;
  /** Stock (raw material) volume [cm³] */
  stock_volume_cm3: number;
  /** Material cost per cm³ [currency] */
  material_cost_per_cm3?: number;
  /** Scrap value per cm³ [currency] (recyclable chips) */
  scrap_value_per_cm3?: number;
  /** Part mass [kg] (optional, for buy-to-fly) */
  part_mass_kg?: number;
  /** Stock mass [kg] (optional) */
  stock_mass_kg?: number;
}

export interface MaterialUtilizationResult {
  utilization_pct: number;
  buy_to_fly_ratio: number;
  material_wasted_cm3: number;
  material_cost: number;
  scrap_recovery: number;
  net_material_cost: number;
  formula: string;
  warnings: string[];
}

export interface SustainabilityCalcInput {
  action: string;
  params: Record<string, any>;
}

// ─── Constants ──────────────────────────────────────────────────────

/** Theoretical minimum specific cutting energy by material group [kJ/cm³] */
const THEORETICAL_SEC: Record<string, number> = {
  aluminum: 0.4,
  steel: 2.0,
  stainless: 2.8,
  cast_iron: 1.5,
  titanium: 3.5,
  inconel: 4.5,
  copper: 1.0,
  brass: 0.8,
};

// ─── Engine ─────────────────────────────────────────────────────────

export class SustainabilityFormulasEngine {

  /**
   * Carbon footprint: CO2 = Σ(E_i × EF_i) for scope 1+2+3.
   * Scope 1: direct (gas), Scope 2: electricity, Scope 3: material+transport
   */
  carbonFootprint(input: CarbonFootprintInput): CarbonFootprintResult {
    const {
      electricity_kwh,
      grid_ef_kg_per_kwh = 0.4,
      natural_gas_m3 = 0,
      gas_ef_kg_per_m3 = 2.0,
      transport_km = 0,
      transport_ef_kg_per_km = 0.1,
      material_mass_kg = 0,
      material_ef_kg_per_kg = 2.0,
      batch_size = 1,
    } = input;
    const warnings: string[] = [];

    const scope1 = natural_gas_m3 * gas_ef_kg_per_m3;
    const scope2 = electricity_kwh * grid_ef_kg_per_kwh;
    const scope3_transport = transport_km * transport_ef_kg_per_km;
    const scope3_material = material_mass_kg * material_ef_kg_per_kg;
    const scope3 = scope3_transport + scope3_material;
    const total = scope1 + scope2 + scope3;
    const per_part = batch_size > 0 ? total / batch_size : total;

    const breakdown: { source: string; kg_co2: number; pct: number }[] = [];
    const entries: [string, number][] = [
      ['electricity', scope2],
      ['natural_gas', scope1],
      ['material_embodied', scope3_material],
      ['transport', scope3_transport],
    ];
    for (const [source, kg] of entries) {
      if (kg > 0) breakdown.push({ source, kg_co2: kg, pct: total > 0 ? (kg / total) * 100 : 0 });
    }

    if (grid_ef_kg_per_kwh > 0.8) warnings.push('High grid emission factor: consider renewable energy');
    if (total > 100) warnings.push(`High total CO2 (${total.toFixed(1)} kg): review process efficiency`);

    return {
      scope1_kg_co2: scope1, scope2_kg_co2: scope2, scope3_kg_co2: scope3,
      total_kg_co2: total, per_part_kg_co2: per_part, breakdown,
      formula: 'CO₂ = Σ(E_i × EF_i); Scope 1: direct, 2: electricity, 3: supply chain',
      warnings,
    };
  }

  /**
   * Specific energy consumption: SEC = P × t / V_removed [kJ/cm³]
   */
  specificEnergy(input: SpecificEnergyInput): SpecificEnergyResult {
    const { power_kw, cutting_time_min, volume_removed_cm3, material } = input;
    const warnings: string[] = [];

    const energy_kj = power_kw * cutting_time_min * 60; // kW × s = kJ
    const sec_kj = volume_removed_cm3 > 0 ? energy_kj / volume_removed_cm3 : 0;
    const sec_kwh = sec_kj / 3600;

    const mat_key = material?.toLowerCase().replace(/[^a-z_]/g, '') ?? 'steel';
    const theoretical_min = THEORETICAL_SEC[mat_key] ?? 2.0;
    const efficiency_pct = sec_kj > 0 ? (theoretical_min / sec_kj) * 100 : 0;

    let energy_rating: string;
    if (efficiency_pct >= 60) energy_rating = 'A (excellent)';
    else if (efficiency_pct >= 40) energy_rating = 'B (good)';
    else if (efficiency_pct >= 25) energy_rating = 'C (average)';
    else energy_rating = 'D (poor)';

    if (efficiency_pct < 25) warnings.push('SEC > 4× theoretical minimum: optimize cutting parameters');
    if (volume_removed_cm3 <= 0) warnings.push('No material removed: SEC undefined');
    if (sec_kj > 20) warnings.push(`High SEC (${sec_kj.toFixed(1)} kJ/cm³): check tool sharpness and parameters`);

    return {
      sec_kj_per_cm3: sec_kj, sec_kwh_per_cm3: sec_kwh,
      theoretical_min_kj_per_cm3: theoretical_min, efficiency_pct, energy_rating,
      formula: 'SEC = P × t / V_removed [kJ/cm³]',
      warnings,
    };
  }

  /**
   * Coolant lifecycle TCO with optimal replacement interval.
   * TCO = purchase + Σ(maintenance + topup) + disposal
   */
  coolantLifecycle(input: CoolantLifecycleInput): CoolantLifecycleResult {
    const {
      purchase_cost, fill_volume_liters, maintenance_cost_per_week,
      expected_life_weeks, disposal_cost_per_liter,
      topup_rate_liters_per_week = 0, topup_cost_per_liter = 0,
    } = input;
    const warnings: string[] = [];

    const disposal_cost = fill_volume_liters * disposal_cost_per_liter;
    const topup_total = topup_rate_liters_per_week * topup_cost_per_liter * expected_life_weeks;
    const maintenance_total = maintenance_cost_per_week * expected_life_weeks;
    const tco = purchase_cost + maintenance_total + topup_total + disposal_cost;
    const cost_per_week = expected_life_weeks > 0 ? tco / expected_life_weeks : tco;

    // Optimal replace: minimize cost/week = (purchase + disposal + maint*w + topup*w) / w
    // d/dw[(purchase+disposal)/w + maint + topup_rate*topup_cost] = 0
    // → optimal when fixed_cost/w² = 0 only if maintenance degrades; with constant maint, shorter is always worse
    // Use degradation model: maint_week(w) = maint_base × (1 + 0.02×w) → increasing maint
    // Total = (purchase+disposal)/w + maint_base×(1+0.01×w) + topup
    // Optimal w ≈ √((purchase+disposal)/(0.01×maint_base))
    const fixed = purchase_cost + disposal_cost;
    const degrade_rate = 0.01;
    const optimal_replace_weeks = maintenance_cost_per_week > 0
      ? Math.max(1, Math.round(Math.sqrt(fixed / (degrade_rate * maintenance_cost_per_week))))
      : expected_life_weeks;

    const purchase_pct = tco > 0 ? (purchase_cost / tco) * 100 : 0;
    const maintenance_pct = tco > 0 ? (maintenance_total / tco) * 100 : 0;
    const disposal_pct = tco > 0 ? (disposal_cost / tco) * 100 : 0;
    const topup_pct = tco > 0 ? (topup_total / tco) * 100 : 0;

    if (optimal_replace_weeks < expected_life_weeks * 0.5) {
      warnings.push(`Optimal replacement at ~${optimal_replace_weeks} weeks (currently ${expected_life_weeks})`);
    }
    if (disposal_pct > 30) warnings.push('Disposal > 30% of TCO: consider recycling or longer-life coolant');

    return {
      tco, cost_per_week, optimal_replace_weeks,
      purchase_pct, maintenance_pct, disposal_pct, topup_pct,
      formula: 'TCO = purchase + Σ(maintenance) + Σ(topup) + disposal',
      warnings,
    };
  }

  /**
   * Material utilization: η = V_part/V_stock × 100, buy-to-fly ratio.
   */
  materialUtilization(input: MaterialUtilizationInput): MaterialUtilizationResult {
    const {
      part_volume_cm3, stock_volume_cm3,
      material_cost_per_cm3 = 0, scrap_value_per_cm3 = 0,
      part_mass_kg, stock_mass_kg,
    } = input;
    const warnings: string[] = [];

    const utilization_pct = stock_volume_cm3 > 0 ? (part_volume_cm3 / stock_volume_cm3) * 100 : 0;
    const buy_to_fly_ratio = part_mass_kg && stock_mass_kg && part_mass_kg > 0
      ? stock_mass_kg / part_mass_kg
      : stock_volume_cm3 > 0 ? stock_volume_cm3 / part_volume_cm3 : 1;

    const material_wasted_cm3 = stock_volume_cm3 - part_volume_cm3;
    const material_cost = stock_volume_cm3 * material_cost_per_cm3;
    const scrap_recovery = material_wasted_cm3 * scrap_value_per_cm3;
    const net_material_cost = material_cost - scrap_recovery;

    if (utilization_pct < 20) warnings.push(`Very low utilization (${utilization_pct.toFixed(1)}%): consider near-net-shape stock`);
    else if (utilization_pct < 40) warnings.push('Below 40% utilization: evaluate casting/forging preform');
    if (buy_to_fly_ratio > 10) warnings.push(`Buy-to-fly ${buy_to_fly_ratio.toFixed(1)}:1 — aerospace typical is 10-20:1 for Ti`);
    if (scrap_recovery > 0 && scrap_recovery > material_cost * 0.3) {
      warnings.push('Scrap recovery > 30% of material cost: ensure chip recycling program');
    }

    return {
      utilization_pct, buy_to_fly_ratio, material_wasted_cm3,
      material_cost, scrap_recovery, net_material_cost,
      formula: 'η = V_part/V_stock × 100; BTF = M_stock/M_part',
      warnings,
    };
  }

  /** Dispatcher entry point */
  calculate(input: SustainabilityCalcInput): any {
    const { action, params } = input;
    switch (action) {
      case 'sustainability_carbon_footprint': return this.carbonFootprint(params as any);
      case 'sustainability_specific_energy': return this.specificEnergy(params as any);
      case 'sustainability_coolant_lifecycle': return this.coolantLifecycle(params as any);
      case 'sustainability_material_utilization': return this.materialUtilization(params as any);
      default: throw new Error(`SustainabilityFormulasEngine: unknown action '${action}'`);
    }
  }
}

export const sustainabilityFormulasEngine = new SustainabilityFormulasEngine();
