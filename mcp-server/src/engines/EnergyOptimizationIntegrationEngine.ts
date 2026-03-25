/**
 * EnergyOptimizationIntegrationEngine — CAMX-MS13 U04 (E1156)
 *
 * Integrator: connects GCodeEnergyOptimizerEngine (E in engines/) to the
 * cost pipeline, adding energy-per-part and carbon-per-part to any cost model.
 *
 * This is NOT a physics engine — it is an orchestrator that:
 *   1. Calls GCodeEnergyOptimizerEngine.analyzeEnergy() on a G-code program
 *   2. Converts kWh/part → $/part using energy_rate [$/kWh]
 *   3. Converts kWh/part → kg CO2/part using grid_mix emission factor
 *   4. Injects energy line item into PipelineCostModelEngine output
 *   5. Surfaces saving opportunities from GCodeEnergyOptimizerEngine
 *
 * Grid emission factors (kg CO2 per kWh):
 *   us_avg:   0.386   (EPA eGRID 2022 national)
 *   us_clean: 0.090   (Pacific NW hydro-heavy)
 *   us_coal:  0.820   (Midwest coal-heavy)
 *   eu_avg:   0.276   (EEA 2022 EU27)
 *   china:    0.581   (IEA 2022)
 *   renewable: 0.020  (solar/wind lifecycle)
 *
 * References:
 *   - EPA eGRID 2022 (https://www.epa.gov/egrid)
 *   - IEA World Energy Outlook 2022
 *   - ISO 14064-1: GHG accounting — scope 2 emissions
 *   - GCodeEnergyOptimizerEngine (E) — gcode_energy_analyze action
 *   - PipelineCostModelEngine (E1095) — pipeline_cost_compute action
 *
 * @module EnergyOptimizationIntegrationEngine
 * @shortcode E1156
 * @dispatcher camDispatcher
 * @actions energy_add_to_cost, energy_carbon_footprint, energy_suggest_savings
 * @milestone CAMX-MS13/U04
 */

// ============================================================================
// CONSTANTS — Grid emission factors [kg CO2 / kWh]
// ============================================================================

export const GRID_EMISSION_FACTORS: Record<GridMix, number> = {
  us_avg:    0.386,
  us_clean:  0.090,
  us_coal:   0.820,
  eu_avg:    0.276,
  china:     0.581,
  renewable: 0.020,
  custom:    0.386, // falls back to us_avg; user must provide custom_factor
};

/** Default electricity rate [$/kWh] */
const DEFAULT_ENERGY_RATE = 0.12;

/** Default grid mix */
const DEFAULT_GRID_MIX: GridMix = "us_avg";

/** Carbon credit price reference [$/tonne CO2] — EU ETS avg 2023 */
const CARBON_CREDIT_PER_TONNE = 85;

// ============================================================================
// TYPES
// ============================================================================

export type GridMix = "us_avg" | "us_clean" | "us_coal" | "eu_avg" | "china" | "renewable" | "custom";

export interface EnergyProgram {
  /** Raw G-code string OR pre-parsed energy result */
  gcode?: string;
  /** Pre-computed energy [kWh/part] — skips G-code parsing if provided */
  energy_kwh_per_part?: number;
  /** Cycle time [min] — used for rough estimate if G-code not available */
  cycle_time_min?: number;
  /** Machine power [kW] — used with cycle_time for rough estimate */
  machine_power_kw?: number;
}

export interface EnergyMachineRef {
  /** Machine identifier */
  machine_id?: string;
  /** Rated spindle power [kW] */
  rated_power_kw?: number;
  /** Spindle efficiency (0-1, default 0.85) */
  spindle_efficiency?: number;
  /** Coolant pump power [kW] */
  coolant_pump_kw?: number;
  /** Chip conveyor power [kW] */
  chip_conveyor_kw?: number;
}

export interface EnergyCostAddition {
  /** Energy consumed per part [kWh] */
  energy_kwh_per_part: number;
  /** Energy cost per part [$] */
  energy_cost_per_part: number;
  /** Carbon emitted per part [kg CO2] */
  carbon_kg_per_part: number;
  /** Carbon cost per part at reference credit price [$] */
  carbon_cost_per_part: number;
  /** Grid mix used */
  grid_mix: GridMix;
  /** Emission factor [kg CO2/kWh] */
  emission_factor: number;
  /** Energy rate used [$/kWh] */
  energy_rate: number;
  /** Source: how energy was determined */
  energy_source: "gcode_analyzed" | "pre_computed" | "cycle_time_estimate";
  /** Cost breakdown additions for pipeline cost model */
  pipeline_additions: {
    energy_usd: number;
    carbon_usd: number;
    total_additional_usd: number;
  };
  notes: string[];
}

export interface CarbonFootprintResult {
  energy_kwh: number;
  grid_mix: GridMix;
  emission_factor_kg_per_kwh: number;
  co2_kg: number;
  co2_tonne: number;
  /** Annual CO2 at given production volume */
  annual_co2_kg?: number;
  annual_co2_tonne?: number;
  /** Carbon credit value [$] at reference price */
  carbon_credit_value_usd: number;
  /** Equivalent comparison */
  equivalent: {
    trees_to_offset: number;
    km_driven_gasoline: number;
  };
  grid_mix_comparison: { mix: GridMix; co2_kg: number; delta_pct: number }[];
}

export interface EnergySavingSuggestion {
  category: "spindle" | "rapid" | "idle" | "coolant" | "scheduling" | "parameter";
  description: string;
  estimated_saving_kwh_per_part: number;
  estimated_saving_usd_per_part: number;
  estimated_saving_co2_kg_per_part: number;
  annual_saving_at_volume?: number;
  implementation_effort: "low" | "medium" | "high";
  priority: number; // 1 = highest
}

export interface EnergySavingsReport {
  current_kwh_per_part: number;
  current_cost_per_part: number;
  current_co2_per_part: number;
  suggestions: EnergySavingSuggestion[];
  total_potential_saving_kwh: number;
  total_potential_saving_usd: number;
  total_potential_saving_co2_kg: number;
  optimized_kwh_per_part: number;
  optimized_cost_per_part: number;
  optimized_co2_per_part: number;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EnergyOptimizationIntegrationEngine {

  // --------------------------------------------------------------------------
  // addEnergyToCost
  // --------------------------------------------------------------------------

  async addEnergyToCost(
    program: EnergyProgram,
    machine: EnergyMachineRef,
    energy_rate: number = DEFAULT_ENERGY_RATE,
    grid_mix: GridMix = DEFAULT_GRID_MIX,
    custom_emission_factor?: number,
  ): Promise<EnergyCostAddition> {
    const notes: string[] = [];
    let energyKwh: number;
    let source: EnergyCostAddition["energy_source"];

    if (program.energy_kwh_per_part !== undefined) {
      // Pre-computed — use directly
      energyKwh = program.energy_kwh_per_part;
      source = "pre_computed";
      notes.push("Using pre-computed energy value — no G-code analysis performed");

    } else if (program.gcode) {
      // Delegate to GCodeEnergyOptimizerEngine
      try {
        const { gcodeEnergyOptimizerEngine } = await import("./GCodeEnergyOptimizerEngine.js");
        const machineConfig = {
          machine_power_kw: machine.rated_power_kw ?? 15,
          spindle_efficiency: machine.spindle_efficiency ?? 0.85,
          rapid_power_pct: 0.15,
          idle_power_pct: 0.08,
          coolant_pump_kw: machine.coolant_pump_kw ?? 2.2,
          chip_conveyor_kw: machine.chip_conveyor_kw ?? 0.75,
          cost_per_kwh: energy_rate,
          co2_per_kwh: custom_emission_factor ?? GRID_EMISSION_FACTORS[grid_mix],
        };
        const result = await gcodeEnergyOptimizerEngine.analyzeEnergyConsumption(program.gcode, machineConfig);
        energyKwh = result.total_kwh;
        source = "gcode_analyzed";
        notes.push(`G-code analyzed: ${result.total_time_s.toFixed(0)}s cycle, ${result.phase_breakdown.length} phases`);
      } catch (err) {
        // Fallback to cycle-time estimate
        notes.push(`G-code analysis failed (${err}) — falling back to cycle-time estimate`);
        energyKwh = this._cycleTimeEstimate(program, machine);
        source = "cycle_time_estimate";
      }

    } else if (program.cycle_time_min !== undefined && program.machine_power_kw !== undefined) {
      // Rough estimate: P × t
      energyKwh = this._cycleTimeEstimate(program, machine);
      source = "cycle_time_estimate";
      notes.push("Cycle-time estimate used — provide G-code for higher accuracy");

    } else {
      energyKwh = 0;
      source = "cycle_time_estimate";
      notes.push("No energy data provided — energy cost = $0");
    }

    const emissionFactor = custom_emission_factor ?? GRID_EMISSION_FACTORS[grid_mix];
    const energyCostPerPart = energyKwh * energy_rate;
    const carbonKgPerPart = energyKwh * emissionFactor;
    const carbonCostPerPart = (carbonKgPerPart / 1000) * CARBON_CREDIT_PER_TONNE;

    return {
      energy_kwh_per_part: Math.round(energyKwh * 10000) / 10000,
      energy_cost_per_part: Math.round(energyCostPerPart * 10000) / 10000,
      carbon_kg_per_part: Math.round(carbonKgPerPart * 10000) / 10000,
      carbon_cost_per_part: Math.round(carbonCostPerPart * 10000) / 10000,
      grid_mix,
      emission_factor: emissionFactor,
      energy_rate,
      energy_source: source,
      pipeline_additions: {
        energy_usd: Math.round(energyCostPerPart * 10000) / 10000,
        carbon_usd: Math.round(carbonCostPerPart * 10000) / 10000,
        total_additional_usd: Math.round((energyCostPerPart + carbonCostPerPart) * 10000) / 10000,
      },
      notes,
    };
  }

  // --------------------------------------------------------------------------
  // getCarbonFootprint
  // --------------------------------------------------------------------------

  getCarbonFootprint(
    energy_kwh: number,
    grid_mix: GridMix = DEFAULT_GRID_MIX,
    options?: {
      custom_factor?: number;
      annual_volume?: number;
    },
  ): CarbonFootprintResult {
    const factor = options?.custom_factor ?? GRID_EMISSION_FACTORS[grid_mix];
    const co2Kg = energy_kwh * factor;
    const co2Tonne = co2Kg / 1000;

    // Carbon credit value at reference price
    const creditValue = co2Tonne * CARBON_CREDIT_PER_TONNE;

    // Equivalents: 1 tree sequesters ~22 kg CO2/yr; avg car emits ~0.21 kg CO2/km
    const treesNeeded = Math.ceil(co2Kg / 22);
    const kmDriven = Math.round(co2Kg / 0.21);

    // Compare all grid mixes
    const gridComparison = (Object.keys(GRID_EMISSION_FACTORS) as GridMix[])
      .filter(m => m !== "custom")
      .map(m => ({
        mix: m,
        co2_kg: Math.round(energy_kwh * GRID_EMISSION_FACTORS[m] * 1000) / 1000,
        delta_pct: Math.round(((GRID_EMISSION_FACTORS[m] - factor) / factor) * 1000) / 10,
      }))
      .sort((a, b) => a.co2_kg - b.co2_kg);

    return {
      energy_kwh,
      grid_mix,
      emission_factor_kg_per_kwh: factor,
      co2_kg: Math.round(co2Kg * 1000) / 1000,
      co2_tonne: Math.round(co2Tonne * 10000) / 10000,
      annual_co2_kg: options?.annual_volume != null ? Math.round(co2Kg * options.annual_volume * 10) / 10 : undefined,
      annual_co2_tonne: options?.annual_volume != null ? Math.round(co2Tonne * options.annual_volume * 1000) / 1000 : undefined,
      carbon_credit_value_usd: Math.round(creditValue * 100) / 100,
      equivalent: {
        trees_to_offset: treesNeeded,
        km_driven_gasoline: kmDriven,
      },
      grid_mix_comparison: gridComparison,
    };
  }

  // --------------------------------------------------------------------------
  // suggestEnergySavings
  // --------------------------------------------------------------------------

  async suggestEnergySavings(
    program: EnergyProgram,
    machine: EnergyMachineRef,
    options?: {
      energy_rate?: number;
      grid_mix?: GridMix;
      annual_volume?: number;
    },
  ): Promise<EnergySavingsReport> {
    const rate = options?.energy_rate ?? DEFAULT_ENERGY_RATE;
    const mix = options?.grid_mix ?? DEFAULT_GRID_MIX;
    const factor = GRID_EMISSION_FACTORS[mix];

    // Get current energy
    const current = await this.addEnergyToCost(program, machine, rate, mix);
    const currentKwh = current.energy_kwh_per_part;
    const currentCost = current.energy_cost_per_part;
    const currentCO2 = current.carbon_kg_per_part;

    // Generate saving suggestions
    const suggestions: EnergySavingSuggestion[] = [];

    // 1. Rapid traverse optimization (typical 5-15% of energy)
    const rapidKwh = currentKwh * 0.10; // assume 10% of energy is rapids
    suggestions.push({
      category: "rapid",
      description: "Optimize rapid traverse order using TSP-inspired resequencing — minimize air-cutting distance by 20-40%",
      estimated_saving_kwh_per_part: Math.round(rapidKwh * 0.30 * 10000) / 10000,
      estimated_saving_usd_per_part: Math.round(rapidKwh * 0.30 * rate * 10000) / 10000,
      estimated_saving_co2_kg_per_part: Math.round(rapidKwh * 0.30 * factor * 10000) / 10000,
      annual_saving_at_volume: options?.annual_volume ? Math.round(rapidKwh * 0.30 * rate * options.annual_volume * 100) / 100 : undefined,
      implementation_effort: "low",
      priority: 2,
    });

    // 2. Spindle stop during long rapids/tool changes (typical 5-10%)
    const idleKwh = currentKwh * 0.08;
    suggestions.push({
      category: "spindle",
      description: "Insert M05 spindle stop during rapids >8s and tool changes — eliminates idle spindle power (typically 10-20% of rated kW)",
      estimated_saving_kwh_per_part: Math.round(idleKwh * 0.60 * 10000) / 10000,
      estimated_saving_usd_per_part: Math.round(idleKwh * 0.60 * rate * 10000) / 10000,
      estimated_saving_co2_kg_per_part: Math.round(idleKwh * 0.60 * factor * 10000) / 10000,
      annual_saving_at_volume: options?.annual_volume ? Math.round(idleKwh * 0.60 * rate * options.annual_volume * 100) / 100 : undefined,
      implementation_effort: "low",
      priority: 1,
    });

    // 3. Coolant shutoff during rapids
    const coolantKwh = currentKwh * 0.05;
    suggestions.push({
      category: "coolant",
      description: "Insert M09 coolant shutoff during long rapids (>5s) — coolant pump is 1.5-2.2 kW continuous",
      estimated_saving_kwh_per_part: Math.round(coolantKwh * 0.50 * 10000) / 10000,
      estimated_saving_usd_per_part: Math.round(coolantKwh * 0.50 * rate * 10000) / 10000,
      estimated_saving_co2_kg_per_part: Math.round(coolantKwh * 0.50 * factor * 10000) / 10000,
      annual_saving_at_volume: options?.annual_volume ? Math.round(coolantKwh * 0.50 * rate * options.annual_volume * 100) / 100 : undefined,
      implementation_effort: "low",
      priority: 3,
    });

    // 4. Cutting parameter optimization (deeper cut, fewer passes)
    const cutKwh = currentKwh * 0.60; // majority is actual cutting
    suggestions.push({
      category: "parameter",
      description: "Increase radial depth and reduce pass count — fewer passes at higher engagement reduces total cycle time and total energy (time dominates)",
      estimated_saving_kwh_per_part: Math.round(cutKwh * 0.08 * 10000) / 10000,
      estimated_saving_usd_per_part: Math.round(cutKwh * 0.08 * rate * 10000) / 10000,
      estimated_saving_co2_kg_per_part: Math.round(cutKwh * 0.08 * factor * 10000) / 10000,
      annual_saving_at_volume: options?.annual_volume ? Math.round(cutKwh * 0.08 * rate * options.annual_volume * 100) / 100 : undefined,
      implementation_effort: "medium",
      priority: 4,
    });

    // 5. Off-peak scheduling
    if (options?.annual_volume && options.annual_volume > 500) {
      suggestions.push({
        category: "scheduling",
        description: "Schedule high-energy operations during off-peak hours (night/weekend) — Time-of-Use rates can reduce energy cost 20-40% on TOU tariffs",
        estimated_saving_kwh_per_part: 0,
        estimated_saving_usd_per_part: Math.round(currentCost * 0.25 * 10000) / 10000,
        estimated_saving_co2_kg_per_part: 0,
        annual_saving_at_volume: options.annual_volume ? Math.round(currentCost * 0.25 * options.annual_volume * 100) / 100 : undefined,
        implementation_effort: "medium",
        priority: 5,
      });
    }

    suggestions.sort((a, b) => a.priority - b.priority);

    const totalKwhSaving = suggestions.reduce((s, sg) => s + sg.estimated_saving_kwh_per_part, 0);
    const totalUsdSaving = suggestions.reduce((s, sg) => s + sg.estimated_saving_usd_per_part, 0);
    const totalCO2Saving = suggestions.reduce((s, sg) => s + sg.estimated_saving_co2_kg_per_part, 0);

    return {
      current_kwh_per_part: currentKwh,
      current_cost_per_part: currentCost,
      current_co2_per_part: currentCO2,
      suggestions,
      total_potential_saving_kwh: Math.round(totalKwhSaving * 10000) / 10000,
      total_potential_saving_usd: Math.round(totalUsdSaving * 10000) / 10000,
      total_potential_saving_co2_kg: Math.round(totalCO2Saving * 10000) / 10000,
      optimized_kwh_per_part: Math.round(Math.max(0, currentKwh - totalKwhSaving) * 10000) / 10000,
      optimized_cost_per_part: Math.round(Math.max(0, currentCost - totalUsdSaving) * 10000) / 10000,
      optimized_co2_per_part: Math.round(Math.max(0, currentCO2 - totalCO2Saving) * 10000) / 10000,
    };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private _cycleTimeEstimate(program: EnergyProgram, machine: EnergyMachineRef): number {
    const cycleMin = program.cycle_time_min ?? 0;
    const powerKw = program.machine_power_kw ?? machine.rated_power_kw ?? 15;
    const eff = machine.spindle_efficiency ?? 0.85;
    // Rough: ~60% of cycle at ~50% of rated power (average load factor), plus aux
    const avgCuttingPower = powerKw * eff * 0.50;
    const auxPower = (machine.coolant_pump_kw ?? 2.2) + (machine.chip_conveyor_kw ?? 0.75) + 0.5;
    const totalPower = avgCuttingPower + auxPower;
    return (totalPower * cycleMin) / 60; // kWh
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const energyOptimizationIntegrationEngine = new EnergyOptimizationIntegrationEngine();
