/**
 * CostEstimationEngine — Manufacturing Intelligence Layer
 *
 * Calculates manufacturing cost from process plans including material,
 * machine time, tooling, labor, and overhead.
 *
 * Actions: cost_estimate, cost_breakdown, cost_compare_materials
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CostInput {
  material_name: string;
  material_iso_group: string;
  stock_volume_cm3: number;          // raw stock volume
  part_volume_cm3: number;           // finished part volume
  machine_rate_per_hour: number;     // $/hr
  cycle_time_min: number;
  setup_time_min: number;
  num_tools: number;
  batch_size: number;
  labor_rate_per_hour?: number;      // default $55
  overhead_pct?: number;             // default 30%
}

export interface CostBreakdown {
  material_cost: number;
  machine_cost: number;
  tooling_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_per_part: number;
  total_batch: number;
  cost_drivers: CostDriver[];
}

export interface CostDriver {
  category: string;
  amount: number;
  pct_of_total: number;
  notes: string;
}

export interface MaterialCostComparison {
  materials: {
    name: string;
    iso_group: string;
    per_part_cost: number;
    material_cost: number;
    machine_cost: number;
  }[];
  cheapest: string;
  savings_vs_most_expensive: number;
}

// ============================================================================
// MATERIAL COSTS ($/kg)
// ============================================================================

const MATERIAL_COST_PER_KG: Record<string, number> = {
  "1018_steel": 1.10, "4140_steel": 1.65, "4340_steel": 2.20,
  "d2_tool_steel": 8.50, "h13_tool_steel": 7.00,
  "304_stainless": 3.80, "316_stainless": 4.50, "17_4_ph": 6.50,
  "6061_aluminum": 4.00, "7075_aluminum": 5.50,
  "ti_6al_4v": 35.00, "inconel_718": 55.00,
  "gray_cast_iron": 0.80, "brass_360": 5.50, "c110_copper": 8.00,
};

/** Density g/cm³ by ISO group */
const ISO_DENSITY: Record<string, number> = { P: 7.85, M: 8.00, K: 7.15, N: 2.70, S: 4.43, H: 7.80 };

/** Machinability cost factor — harder materials cost more per minute */
const ISO_MACHINING_FACTOR: Record<string, number> = { P: 1.0, M: 1.4, K: 0.9, N: 0.7, S: 2.5, H: 1.8 };

/** Average tool cost per tool */
const AVG_TOOL_COST = 45;

/** Tool life adjustment: shorter life for hard materials → more regrinding */
const ISO_TOOL_LIFE_FACTOR: Record<string, number> = { P: 1.0, M: 1.5, K: 0.8, N: 0.5, S: 3.0, H: 2.0 };

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class CostEstimationEngine {
  estimate(input: CostInput): CostBreakdown {
    const laborRate = input.labor_rate_per_hour || 55;
    const overheadPct = input.overhead_pct || 30;

    // Material cost
    const density = ISO_DENSITY[input.material_iso_group] || 7.85;
    const stockMass_kg = (input.stock_volume_cm3 * density) / 1000;
    const matCostPerKg = this.getMaterialCostPerKg(input.material_name, input.material_iso_group);
    const materialCost = stockMass_kg * matCostPerKg;

    // Machine cost
    const machineFactor = ISO_MACHINING_FACTOR[input.material_iso_group] || 1.0;
    const machineTimeHrs = (input.cycle_time_min + (input.setup_time_min / Math.max(input.batch_size, 1))) / 60;
    const machineCost = machineTimeHrs * input.machine_rate_per_hour * machineFactor;

    // Tooling cost (amortized over tool life)
    const toolLifeFactor = ISO_TOOL_LIFE_FACTOR[input.material_iso_group] || 1.0;
    const toolingCostPerPart = (input.num_tools * AVG_TOOL_COST * toolLifeFactor) / Math.max(input.batch_size, 1);
    const toolingCost = Math.min(toolingCostPerPart, input.num_tools * AVG_TOOL_COST); // cap at full tool cost

    // Labor cost
    const laborTimeHrs = machineTimeHrs * 0.4; // operator attention ~40% of machine time
    const laborCost = laborTimeHrs * laborRate;

    // Overhead
    const subtotal = materialCost + machineCost + toolingCost + laborCost;
    const overheadCost = subtotal * (overheadPct / 100);

    const totalPerPart = subtotal + overheadCost;
    const totalBatch = totalPerPart * input.batch_size;

    const drivers: CostDriver[] = [
      { category: "Material", amount: materialCost, pct_of_total: (materialCost / totalPerPart) * 100, notes: `${stockMass_kg.toFixed(2)}kg @ $${matCostPerKg}/kg` },
      { category: "Machine", amount: machineCost, pct_of_total: (machineCost / totalPerPart) * 100, notes: `${(machineTimeHrs * 60).toFixed(1)} min @ $${input.machine_rate_per_hour}/hr` },
      { category: "Tooling", amount: toolingCost, pct_of_total: (toolingCost / totalPerPart) * 100, notes: `${input.num_tools} tools, life factor ${toolLifeFactor}` },
      { category: "Labor", amount: laborCost, pct_of_total: (laborCost / totalPerPart) * 100, notes: `${(laborTimeHrs * 60).toFixed(1)} min @ $${laborRate}/hr` },
      { category: "Overhead", amount: overheadCost, pct_of_total: (overheadCost / totalPerPart) * 100, notes: `${overheadPct}% of direct costs` },
    ].map(d => ({ ...d, amount: Math.round(d.amount * 100) / 100, pct_of_total: Math.round(d.pct_of_total * 10) / 10 }));

    return {
      material_cost: Math.round(materialCost * 100) / 100,
      machine_cost: Math.round(machineCost * 100) / 100,
      tooling_cost: Math.round(toolingCost * 100) / 100,
      labor_cost: Math.round(laborCost * 100) / 100,
      overhead_cost: Math.round(overheadCost * 100) / 100,
      total_per_part: Math.round(totalPerPart * 100) / 100,
      total_batch: Math.round(totalBatch * 100) / 100,
      cost_drivers: drivers,
    };
  }

  compareMaterials(
    materialOptions: { name: string; iso_group: string }[],
    baseInput: Omit<CostInput, "material_name" | "material_iso_group">
  ): MaterialCostComparison {
    const results = materialOptions.map(mat => {
      const est = this.estimate({ ...baseInput, material_name: mat.name, material_iso_group: mat.iso_group });
      return { name: mat.name, iso_group: mat.iso_group, per_part_cost: est.total_per_part, material_cost: est.material_cost, machine_cost: est.machine_cost };
    });

    results.sort((a, b) => a.per_part_cost - b.per_part_cost);
    const cheapest = results[0].name;
    const maxCost = results[results.length - 1].per_part_cost;
    const savings = maxCost - results[0].per_part_cost;

    return { materials: results, cheapest, savings_vs_most_expensive: Math.round(savings * 100) / 100 };
  }

  private getMaterialCostPerKg(name: string, isoGroup: string): number {
    const key = name.toLowerCase().replace(/[\s-]+/g, "_");
    if (MATERIAL_COST_PER_KG[key]) return MATERIAL_COST_PER_KG[key];

    // Fallback by ISO group
    const fallback: Record<string, number> = { P: 1.50, M: 4.00, K: 1.00, N: 4.50, S: 40.00, H: 7.50 };
    return fallback[isoGroup] || 2.00;
  }
}

export const costEstimationEngine = new CostEstimationEngine();
