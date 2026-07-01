/**
 * CoolantCostOptimizationEngine — CAMX-MS13 U03 (E1154)
 *
 * Compare coolant strategies by total lifecycle cost:
 *   acquisition + disposal + filtration + machine maintenance impact.
 *
 * Coolant strategies modeled:
 *   - MQL (Minimum Quantity Lubrication): low fluid cost, minimal disposal,
 *     specialized applicator required, best for Al/steel, limited for Ti/Ni
 *   - Flood: moderate fluid cost, high disposal + filtration, good cooling
 *   - Cryogenic (CO2/LN2): high consumable cost, zero disposal, best for Ti/Ni
 *   - Dry: zero fluid cost, elevated tool wear cost, limited materials
 *   - Through-tool: higher pump/maintenance cost, superior chip evacuation
 *
 * Cost model per annual_hours:
 *   Total = acquisition + disposal + filtration + maintenance + tool_penalty + applicator_amort
 *
 * References:
 *   - Shokrani et al. (2012): "Environmentally conscious machining of difficult-to-machine materials"
 *   - Pusavec et al. (2010): "Transitioning to sustainable production — cryogenic machining"
 *   - ISO 14001: Environmental management — coolant disposal
 *   - Klocke & Eisenblatter (1997): "Dry cutting" — tool wear penalty factors
 *
 * @module CoolantCostOptimizationEngine
 * @shortcode E1154
 * @dispatcher camDispatcher
 * @actions coolant_cost_compare, coolant_cost_optimal, coolant_cost_lifecycle
 * @milestone CAMX-MS13/U03
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default labor/disposal rate [$/hr] for coolant handling */
const DEFAULT_DISPOSAL_LABOR_RATE = 45;

/** Flood coolant concentration (typical 5-8% emulsion) */
const FLOOD_CONCENTRATION = 0.06;

/** MQL flow rate [mL/hr] — typical 50-500 mL/hr, use midrange */
const MQL_FLOW_ML_PER_HR = 100;

/** MQL oil cost [$/L] — typical synthetic ester */
const MQL_OIL_COST_PER_L = 15;

/** Flood coolant cost [$/L] concentrate */
const FLOOD_CONCENTRATE_COST_PER_L = 8;

/** Flood sump volume [L] — typical 200L for 3-axis */
const FLOOD_SUMP_LITERS = 200;

/** Flood coolant replacement interval [hours] */
const FLOOD_REPLACEMENT_INTERVAL_HR = 2000;

/** Cryogenic CO2 cost [$/kg] */
const CRYO_CO2_COST_PER_KG = 0.35;

/** Cryogenic LN2 cost [$/kg] */
const CRYO_LN2_COST_PER_KG = 0.25;

/** Cryogenic CO2 flow rate [kg/hr] — typical 0.5-2 kg/hr */
const CRYO_CO2_FLOW_KG_PER_HR = 1.0;

/** Cryogenic LN2 flow rate [kg/hr] — typical 1-5 kg/hr */
const CRYO_LN2_FLOW_KG_PER_HR = 2.0;

/** Flood disposal cost [$/L] — includes hauling, treatment */
const FLOOD_DISPOSAL_COST_PER_L = 0.80;

/** Flood filtration system amortization [$/hr] */
const FLOOD_FILTRATION_COST_PER_HR = 2.50;

/** Through-tool pump maintenance premium over flood [$/hr] */
const THROUGH_TOOL_PUMP_PREMIUM_PER_HR = 1.20;

/** MQL applicator capital cost [$] — amortized over 5 years */
const MQL_APPLICATOR_CAPITAL = 8000;

/** Cryogenic system capital cost [$] — amortized over 7 years */
const CRYO_SYSTEM_CAPITAL = 25000;

/** Default annual hours per strategy */
const DEFAULT_ANNUAL_HOURS = 2000;

// ============================================================================
// TYPES
// ============================================================================

export type CoolantStrategy = "mql" | "flood" | "cryogenic_co2" | "cryogenic_ln2" | "dry" | "through_tool";

export type MaterialGroup = "aluminum" | "steel" | "stainless" | "titanium" | "nickel" | "cast_iron" | "plastic";

export interface CoolantOperation {
  /** Operation type (milling, turning, drilling, etc.) */
  op_type?: "milling" | "turning" | "drilling" | "grinding" | "threading";
  /** Material group being machined */
  material: MaterialGroup;
  /** Cut depth [mm] */
  ap_mm?: number;
  /** Cutting speed [m/min] */
  Vc_mpm?: number;
  /** Annual machine hours for this operation */
  annual_hours?: number;
}

export interface CoolantMachineConfig {
  /** Machine has through-tool coolant capability */
  has_through_tool: boolean;
  /** Machine rated spindle power [kW] */
  spindle_kw?: number;
  /** Existing flood system (sunk cost — set true if already paid) */
  has_flood_system?: boolean;
  /** Existing MQL system */
  has_mql_system?: boolean;
  /** Existing cryogenic system */
  has_cryo_system?: boolean;
}

export interface CoolantCostBreakdown {
  strategy: CoolantStrategy;
  /** Annual acquisition cost [$] */
  acquisition_usd: number;
  /** Annual disposal cost [$] */
  disposal_usd: number;
  /** Annual filtration cost [$] */
  filtration_usd: number;
  /** Annual machine maintenance impact [$] */
  maintenance_usd: number;
  /** Tool wear penalty vs best strategy [$] */
  tool_penalty_usd: number;
  /** Capital amortization [$] */
  capital_amort_usd: number;
  /** Total annual cost [$] */
  total_annual_usd: number;
  /** Cost per hour [$] */
  cost_per_hour: number;
  /** Suitability rating for material (0-1) */
  material_suitability: number;
  /** Notes and caveats */
  notes: string[];
}

export interface CoolantComparison {
  operation: CoolantOperation;
  machine: CoolantMachineConfig;
  strategies: CoolantCostBreakdown[];
  recommended: CoolantStrategy;
  savings_vs_baseline_usd: number;
  baseline_strategy: CoolantStrategy;
}

export interface CoolantConstraints {
  /** Maximum capital investment [$] */
  max_capital_usd?: number;
  /** Strategies to exclude */
  exclude?: CoolantStrategy[];
  /** Require zero liquid disposal */
  zero_liquid_disposal?: boolean;
  /** Material group */
  material?: MaterialGroup;
}

export interface LifecycleCostResult {
  strategy: CoolantStrategy;
  annual_hours: number;
  year_1_cost: number;
  year_3_cost: number;
  year_5_cost: number;
  breakeven_vs_flood_hr?: number;
  cost_per_hour: number;
  co2_kg_per_year: number;
  waste_liters_per_year: number;
}

// ============================================================================
// MATERIAL SUITABILITY MATRIX
// strategy → material → suitability (0=not suitable, 1=ideal)
// ============================================================================

const SUITABILITY: Record<CoolantStrategy, Record<MaterialGroup, number>> = {
  mql:            { aluminum: 0.9, steel: 0.85, stainless: 0.75, titanium: 0.55, nickel: 0.5,  cast_iron: 0.8,  plastic: 0.95 },
  flood:          { aluminum: 0.85, steel: 0.9,  stainless: 0.85, titanium: 0.65, nickel: 0.6,  cast_iron: 0.85, plastic: 0.7 },
  cryogenic_co2:  { aluminum: 0.6,  steel: 0.75, stainless: 0.85, titanium: 0.95, nickel: 0.95, cast_iron: 0.7,  plastic: 0.4 },
  cryogenic_ln2:  { aluminum: 0.55, steel: 0.7,  stainless: 0.85, titanium: 0.98, nickel: 0.98, cast_iron: 0.65, plastic: 0.3 },
  dry:            { aluminum: 0.5,  steel: 0.6,  stainless: 0.35, titanium: 0.2,  nickel: 0.15, cast_iron: 0.9,  plastic: 0.85 },
  through_tool:   { aluminum: 0.9,  steel: 0.9,  stainless: 0.9,  titanium: 0.75, nickel: 0.7,  cast_iron: 0.85, plastic: 0.8 },
};

// Tool wear penalty multiplier vs flood baseline (1.0 = same as flood)
const TOOL_WEAR_PENALTY: Record<CoolantStrategy, Record<MaterialGroup, number>> = {
  mql:            { aluminum: 1.0, steel: 1.05, stainless: 1.1,  titanium: 1.3,  nickel: 1.4,  cast_iron: 1.0, plastic: 1.0 },
  flood:          { aluminum: 1.0, steel: 1.0,  stainless: 1.0,  titanium: 1.0,  nickel: 1.0,  cast_iron: 1.0, plastic: 1.0 },
  cryogenic_co2:  { aluminum: 1.05, steel: 0.95, stainless: 0.9, titanium: 0.7,  nickel: 0.65, cast_iron: 0.95, plastic: 1.1 },
  cryogenic_ln2:  { aluminum: 1.05, steel: 0.9,  stainless: 0.85, titanium: 0.6, nickel: 0.55, cast_iron: 0.9,  plastic: 1.15 },
  dry:            { aluminum: 1.15, steel: 1.4,  stainless: 1.7,  titanium: 2.5,  nickel: 3.0,  cast_iron: 1.05, plastic: 1.0 },
  through_tool:   { aluminum: 0.95, steel: 0.95, stainless: 0.95, titanium: 0.9, nickel: 0.9,  cast_iron: 0.95, plastic: 0.95 },
};

// Average tool cost per hour reference [$/hr] — used to compute penalty cost
const TOOL_COST_PER_HR_BASELINE: Record<MaterialGroup, number> = {
  aluminum:  3.5,
  steel:     6.0,
  stainless: 9.0,
  titanium:  18.0,
  nickel:    22.0,
  cast_iron: 4.0,
  plastic:   1.5,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class CoolantCostOptimizationEngine {

  // --------------------------------------------------------------------------
  // compareCoolantCosts
  // --------------------------------------------------------------------------

  compareCoolantCosts(
    operation: CoolantOperation,
    machine: CoolantMachineConfig,
    annual_volume: number = 1,
  ): CoolantComparison {
    const hours = (operation.annual_hours ?? DEFAULT_ANNUAL_HOURS) * annual_volume;
    const material = operation.material;

    const strategies: CoolantStrategy[] = ["mql", "flood", "cryogenic_co2", "cryogenic_ln2", "dry", "through_tool"];
    const breakdowns = strategies.map(s => this._computeBreakdown(s, material, machine, hours));

    // Baseline = flood (most common reference)
    const baselineIdx = breakdowns.findIndex(b => b.strategy === "flood");
    const baseline = breakdowns[baselineIdx];

    // Recommended = lowest total cost with suitability ≥ 0.6
    const eligible = breakdowns.filter(b => b.material_suitability >= 0.6);
    const recommended_bd = eligible.length > 0
      ? eligible.reduce((a, b) => a.total_annual_usd < b.total_annual_usd ? a : b)
      : breakdowns.reduce((a, b) => a.total_annual_usd < b.total_annual_usd ? a : b);

    return {
      operation,
      machine,
      strategies: breakdowns.sort((a, b) => a.total_annual_usd - b.total_annual_usd),
      recommended: recommended_bd.strategy,
      savings_vs_baseline_usd: baseline.total_annual_usd - recommended_bd.total_annual_usd,
      baseline_strategy: "flood",
    };
  }

  // --------------------------------------------------------------------------
  // optimalCoolant
  // --------------------------------------------------------------------------

  optimalCoolant(constraints: CoolantConstraints & { annual_hours?: number; machine?: CoolantMachineConfig }): {
    strategy: CoolantStrategy;
    reasoning: string[];
    cost_per_hour: number;
    excluded: { strategy: CoolantStrategy; reason: string }[];
  } {
    const material = constraints.material ?? "steel";
    const hours = constraints.annual_hours ?? DEFAULT_ANNUAL_HOURS;
    const machine: CoolantMachineConfig = constraints.machine ?? {
      has_through_tool: false,
      has_flood_system: true,
    };

    const excluded: { strategy: CoolantStrategy; reason: string }[] = [];
    let candidates: CoolantStrategy[] = ["mql", "flood", "cryogenic_co2", "cryogenic_ln2", "dry", "through_tool"];

    // Apply constraints
    if (constraints.exclude) {
      for (const ex of constraints.exclude) {
        candidates = candidates.filter(c => c !== ex);
        excluded.push({ strategy: ex, reason: "user excluded" });
      }
    }

    if (constraints.zero_liquid_disposal) {
      const toRemove: CoolantStrategy[] = ["flood", "through_tool"];
      for (const s of toRemove) {
        if (candidates.includes(s)) {
          candidates = candidates.filter(c => c !== s);
          excluded.push({ strategy: s, reason: "zero liquid disposal required" });
        }
      }
    }

    if (constraints.max_capital_usd !== undefined) {
      const capLimits: Partial<Record<CoolantStrategy, number>> = {
        mql: MQL_APPLICATOR_CAPITAL,
        cryogenic_co2: CRYO_SYSTEM_CAPITAL,
        cryogenic_ln2: CRYO_SYSTEM_CAPITAL,
      };
      for (const [s, cap] of Object.entries(capLimits)) {
        const strategy = s as CoolantStrategy;
        const hasSystem = strategy === "mql" ? machine.has_mql_system : machine.has_cryo_system;
        if (!hasSystem && cap > constraints.max_capital_usd! && candidates.includes(strategy)) {
          candidates = candidates.filter(c => c !== strategy);
          excluded.push({ strategy, reason: `capital cost $${cap} exceeds limit $${constraints.max_capital_usd}` });
        }
      }
    }

    // Filter through-tool if machine lacks capability
    if (!machine.has_through_tool && candidates.includes("through_tool")) {
      candidates = candidates.filter(c => c !== "through_tool");
      excluded.push({ strategy: "through_tool", reason: "machine lacks through-tool coolant capability" });
    }

    const breakdowns = candidates.map(s => this._computeBreakdown(s, material, machine, hours));
    const eligible = breakdowns.filter(b => b.material_suitability >= 0.5);
    const best = eligible.length > 0
      ? eligible.reduce((a, b) => a.total_annual_usd < b.total_annual_usd ? a : b)
      : breakdowns.reduce((a, b) => a.total_annual_usd < b.total_annual_usd ? a : b);

    const reasoning: string[] = [
      `Material: ${material} — suitability score: ${best.material_suitability.toFixed(2)}`,
      `Annual cost: $${best.total_annual_usd.toFixed(0)} over ${hours} hrs`,
      `Acquisition: $${best.acquisition_usd.toFixed(0)}, Disposal: $${best.disposal_usd.toFixed(0)}`,
      `Tool wear penalty: $${best.tool_penalty_usd.toFixed(0)}/yr`,
    ];
    if (best.notes.length > 0) reasoning.push(...best.notes);

    return {
      strategy: best.strategy,
      reasoning,
      cost_per_hour: best.cost_per_hour,
      excluded,
    };
  }

  // --------------------------------------------------------------------------
  // getLifecycleCost
  // --------------------------------------------------------------------------

  getLifecycleCost(coolant_type: CoolantStrategy, annual_hours: number): LifecycleCostResult {
    const material: MaterialGroup = "steel"; // reference material
    const machine: CoolantMachineConfig = { has_through_tool: true };
    const bd = this._computeBreakdown(coolant_type, material, machine, annual_hours);

    // Year 1 includes full capital amortization first-year hit
    const capitalFirstYear = this._capitalCost(coolant_type, machine) / 1; // simplified: full capital yr1 if not amortized
    const recurring = bd.total_annual_usd - bd.capital_amort_usd;

    const year1 = recurring + capitalFirstYear;
    const year3 = bd.total_annual_usd * 3;
    const year5 = bd.total_annual_usd * 5;

    // Breakeven vs flood
    const flood_bd = this._computeBreakdown("flood", material, machine, annual_hours);
    let breakeven_hr: number | undefined;
    if (bd.cost_per_hour < flood_bd.cost_per_hour) {
      const capitalDiff = this._capitalCost(coolant_type, machine) - this._capitalCost("flood", machine);
      const savingPerHr = flood_bd.cost_per_hour - bd.cost_per_hour;
      if (savingPerHr > 0) breakeven_hr = Math.round(capitalDiff / savingPerHr);
    }

    // CO2: flood generates ~0.01 kg CO2/L disposed; cryogenic CO2 = flow × hours × CO2 factor
    const co2PerYear = coolant_type === "cryogenic_co2"
      ? CRYO_CO2_FLOW_KG_PER_HR * annual_hours
      : coolant_type === "flood" || coolant_type === "through_tool"
        ? (annual_hours / FLOOD_REPLACEMENT_INTERVAL_HR) * FLOOD_SUMP_LITERS * 0.01
        : 0;

    const wasteLitersPerYear = (coolant_type === "flood" || coolant_type === "through_tool")
      ? (annual_hours / FLOOD_REPLACEMENT_INTERVAL_HR) * FLOOD_SUMP_LITERS
      : coolant_type === "mql"
        ? (MQL_FLOW_ML_PER_HR * annual_hours / 1000)
        : 0;

    return {
      strategy: coolant_type,
      annual_hours,
      year_1_cost: Math.round(year1 * 100) / 100,
      year_3_cost: Math.round(year3 * 100) / 100,
      year_5_cost: Math.round(year5 * 100) / 100,
      breakeven_vs_flood_hr: breakeven_hr,
      cost_per_hour: Math.round(bd.cost_per_hour * 100) / 100,
      co2_kg_per_year: Math.round(co2PerYear * 10) / 10,
      waste_liters_per_year: Math.round(wasteLitersPerYear * 10) / 10,
    };
  }

  // --------------------------------------------------------------------------
  // Private: _computeBreakdown
  // --------------------------------------------------------------------------

  private _computeBreakdown(
    strategy: CoolantStrategy,
    material: MaterialGroup,
    machine: CoolantMachineConfig,
    hours: number,
  ): CoolantCostBreakdown {
    const notes: string[] = [];
    let acquisition = 0;
    let disposal = 0;
    let filtration = 0;
    let maintenance = 0;
    let capital_amort = 0;

    switch (strategy) {
      case "mql": {
        acquisition = (MQL_FLOW_ML_PER_HR / 1000) * MQL_OIL_COST_PER_L * hours;
        disposal = 0; // minimal — near-zero liquid
        filtration = 0;
        maintenance = 0.30 * hours; // minor nozzle cleaning
        capital_amort = machine.has_mql_system ? 0 : MQL_APPLICATOR_CAPITAL / 5 / DEFAULT_ANNUAL_HOURS * hours;
        notes.push("MQL requires specialized nozzle setup; poor for deep pockets");
        break;
      }
      case "flood": {
        const replacements = hours / FLOOD_REPLACEMENT_INTERVAL_HR;
        acquisition = replacements * FLOOD_SUMP_LITERS * FLOOD_CONCENTRATION * FLOOD_CONCENTRATE_COST_PER_L;
        disposal = replacements * FLOOD_SUMP_LITERS * FLOOD_DISPOSAL_COST_PER_L;
        filtration = FLOOD_FILTRATION_COST_PER_HR * hours;
        maintenance = 1.50 * hours; // pump seals, filter changes
        capital_amort = machine.has_flood_system ? 0 : 5000 / 7 / DEFAULT_ANNUAL_HOURS * hours;
        notes.push("Flood: high disposal cost; excellent chip evacuation");
        break;
      }
      case "cryogenic_co2": {
        acquisition = CRYO_CO2_COST_PER_KG * CRYO_CO2_FLOW_KG_PER_HR * hours;
        disposal = 0; // CO2 vaporizes
        filtration = 0;
        maintenance = 0.80 * hours; // nozzle wear, sealing
        capital_amort = machine.has_cryo_system ? 0 : CRYO_SYSTEM_CAPITAL / 7 / DEFAULT_ANNUAL_HOURS * hours;
        notes.push("CO2: zero disposal, best for Ti/Ni; requires ventilation");
        break;
      }
      case "cryogenic_ln2": {
        acquisition = CRYO_LN2_COST_PER_KG * CRYO_LN2_FLOW_KG_PER_HR * hours;
        disposal = 0;
        filtration = 0;
        maintenance = 1.20 * hours; // insulation, feed system
        capital_amort = machine.has_cryo_system ? 0 : CRYO_SYSTEM_CAPITAL / 7 / DEFAULT_ANNUAL_HOURS * hours;
        notes.push("LN2: ultra-cold (−196°C), maximum benefit for Ni superalloys; storage tank required");
        break;
      }
      case "dry": {
        acquisition = 0;
        disposal = 0;
        filtration = 0;
        maintenance = 0.20 * hours; // compressed air blast only
        capital_amort = 0;
        notes.push("Dry: suitable for cast iron, plastics; avoid for Ti/Ni/stainless");
        break;
      }
      case "through_tool": {
        if (!machine.has_through_tool) {
          notes.push("WARNING: machine lacks through-tool capability");
        }
        const replacements = hours / FLOOD_REPLACEMENT_INTERVAL_HR;
        acquisition = replacements * FLOOD_SUMP_LITERS * FLOOD_CONCENTRATION * FLOOD_CONCENTRATE_COST_PER_L * 1.1;
        disposal = replacements * FLOOD_SUMP_LITERS * FLOOD_DISPOSAL_COST_PER_L;
        filtration = FLOOD_FILTRATION_COST_PER_HR * hours;
        maintenance = (1.50 + THROUGH_TOOL_PUMP_PREMIUM_PER_HR) * hours;
        capital_amort = machine.has_flood_system ? THROUGH_TOOL_PUMP_PREMIUM_PER_HR * 200 / DEFAULT_ANNUAL_HOURS * hours : 8000 / 7 / DEFAULT_ANNUAL_HOURS * hours;
        notes.push("Through-tool: best chip evac for deep holes/pockets");
        break;
      }
    }

    // Tool wear penalty
    const baseToolCost = (TOOL_COST_PER_HR_BASELINE[material] ?? 6) * hours;
    const penaltyMultiplier = TOOL_WEAR_PENALTY[strategy][material] ?? 1.0;
    // Penalty vs flood baseline (flood multiplier = 1.0)
    const floodMultiplier = TOOL_WEAR_PENALTY["flood"][material] ?? 1.0;
    const tool_penalty = Math.max(0, (penaltyMultiplier - floodMultiplier) * baseToolCost);

    const total = acquisition + disposal + filtration + maintenance + tool_penalty + capital_amort;

    return {
      strategy,
      acquisition_usd: Math.round(acquisition * 100) / 100,
      disposal_usd: Math.round(disposal * 100) / 100,
      filtration_usd: Math.round(filtration * 100) / 100,
      maintenance_usd: Math.round(maintenance * 100) / 100,
      tool_penalty_usd: Math.round(tool_penalty * 100) / 100,
      capital_amort_usd: Math.round(capital_amort * 100) / 100,
      total_annual_usd: Math.round(total * 100) / 100,
      cost_per_hour: hours > 0 ? Math.round((total / hours) * 100) / 100 : 0,
      material_suitability: SUITABILITY[strategy][material] ?? 0.5,
      notes,
    };
  }

  private _capitalCost(strategy: CoolantStrategy, machine: CoolantMachineConfig): number {
    if (strategy === "mql") return machine.has_mql_system ? 0 : MQL_APPLICATOR_CAPITAL;
    if (strategy === "cryogenic_co2" || strategy === "cryogenic_ln2") return machine.has_cryo_system ? 0 : CRYO_SYSTEM_CAPITAL;
    if (strategy === "flood") return machine.has_flood_system ? 0 : 5000;
    if (strategy === "through_tool") return machine.has_flood_system ? 3000 : 8000;
    return 0;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const coolantCostOptimizationEngine = new CoolantCostOptimizationEngine();
