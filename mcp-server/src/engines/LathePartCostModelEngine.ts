/**
 * LathePartCostModelEngine
 * ==========================
 *
 * 7-bucket cost-per-part model for lathe/turning.
 *
 * Buckets:
 *   1. machine    — cycle_time_hr × loaded_rate_per_hr
 *   2. tool       — sum over operations of (cycle_time / tool_life) × (insert_cost + holder_amort)
 *   3. material   — part_mass × price_per_kg + waste_mass × price_per_kg
 *   4. setup      — setup_time_hr × rate_per_hr / batch_size
 *   5. quality    — scrap_rate × (material_cost + machine_cost) [sunk at failure]
 *   6. energy     — spindle_power_kW × cycle_time_hr × price_per_kWh
 *   7. secondary  — sum of named secondary ops (deburr, wash, inspect, heat-treat)
 *
 * Total = Σ buckets. Returns structured breakdown for UI + downstream
 * optimizers (Gilbert, quoting, shop scheduling).
 *
 * Distinction from existing:
 *   - ActualCostEngine: records what did happen after the fact
 *   - CostEstimationEngine: rolls up generic estimates
 *   - This engine: 7-bucket decomposition tailored to lathe/turning mechanics
 *     with tool-life amortization per op and scrap-rate compounding
 *
 * References:
 *   - Armarego & Brown 'Machining of Metals' chapter on economic machining
 *   - Trent & Wright 'Metal Cutting' tool-life economics
 *   - ISO 3685 tool life → amortization
 *
 * @module engines/LathePartCostModelEngine
 * @milestone LATHE-PRO-MS10
 */

export interface LatheOperationCost {
  /** Operation identifier (e.g. "rough_turn", "finish_turn", "face") */
  op: string;
  /** Cycle time contribution (seconds) */
  cycle_time_s: number;
  /** Tool life in same units (seconds) */
  tool_life_s: number;
  /** Cost per insert / edge */
  insert_cost: number;
  /** Edges per insert (e.g., 4 for CNMG; 1 for ground form) */
  edges_per_insert: number;
  /** Holder amortization per edge (if applicable) */
  holder_amort_per_edge?: number;
}

export interface LathePartCostInput {
  /** Total cycle time seconds */
  cycle_time_s: number;
  /** Loaded machine rate $/hr */
  machine_rate_per_hr: number;
  /** Per-op tool cost inputs */
  operations: LatheOperationCost[];
  /** Part mass kg */
  part_mass_kg: number;
  /** Waste (remnant + chip + scrap allowance) mass kg */
  waste_mass_kg: number;
  /** Material price $/kg */
  material_price_per_kg: number;
  /** Setup time seconds */
  setup_time_s: number;
  /** Setup rate $/hr (may differ from run rate) */
  setup_rate_per_hr: number;
  /** Batch size for setup amortization */
  batch_size: number;
  /** Scrap rate fraction (0..1) — typical 0.02 for proven, 0.10 for new */
  scrap_rate?: number;
  /** Average spindle power kW during cut */
  spindle_power_kw?: number;
  /** Energy price $/kWh */
  energy_price_per_kwh?: number;
  /** Named secondary operations */
  secondary_ops?: Array<{ name: string; cost: number }>;
}

export interface LathePartCostResult {
  buckets: {
    machine: number;
    tool: number;
    material: number;
    setup: number;
    quality: number;
    energy: number;
    secondary: number;
  };
  total_cost: number;
  total_cost_with_scrap_amortized: number;
  per_op_tool_cost: Record<string, number>;
  breakdown_pct: Record<string, number>;
  reasoning: string[];
}

class LathePartCostModelEngineImpl {
  compute(i: LathePartCostInput): LathePartCostResult {
    const reasoning: string[] = [];
    if (i.batch_size <= 0) throw new Error("batch_size must be > 0");
    if (i.cycle_time_s < 0) throw new Error("cycle_time_s must be >= 0");

    const scrapRate = Math.max(0, Math.min(1, i.scrap_rate ?? 0.02));

    // 1. Machine bucket
    const machine = (i.cycle_time_s / 3600) * i.machine_rate_per_hr;

    // 2. Tool bucket (per op)
    const perOpToolCost: Record<string, number> = {};
    let tool = 0;
    for (const op of i.operations) {
      if (op.tool_life_s <= 0) continue;
      const edgeCost = op.insert_cost / Math.max(1, op.edges_per_insert);
      const amortPerSec = (edgeCost + (op.holder_amort_per_edge ?? 0)) / op.tool_life_s;
      const cost = amortPerSec * op.cycle_time_s;
      perOpToolCost[op.op] = round2(cost);
      tool += cost;
    }

    // 3. Material bucket
    const material = (i.part_mass_kg + i.waste_mass_kg) * i.material_price_per_kg;

    // 4. Setup bucket — amortized over batch
    const setup = ((i.setup_time_s / 3600) * i.setup_rate_per_hr) / i.batch_size;

    // 5. Quality bucket (scrap loss: for each scrapped part we lose material + machine time already invested)
    //    Per-part expected scrap cost = scrap_rate / (1 - scrap_rate) * (material + machine)
    const perPartInvested = material + machine;
    const quality = scrapRate < 1 ? (scrapRate / (1 - scrapRate)) * perPartInvested : perPartInvested * 10;

    // 6. Energy bucket
    const energy = (i.spindle_power_kw ?? 0) * (i.cycle_time_s / 3600) * (i.energy_price_per_kwh ?? 0);

    // 7. Secondary ops
    const secondary = (i.secondary_ops ?? []).reduce((s, op) => s + op.cost, 0);

    const total = machine + tool + material + setup + energy + secondary;
    const totalWithScrap = total + quality;

    const breakdownPct: Record<string, number> = {};
    if (totalWithScrap > 0) {
      breakdownPct["machine"] = round2((machine / totalWithScrap) * 100);
      breakdownPct["tool"] = round2((tool / totalWithScrap) * 100);
      breakdownPct["material"] = round2((material / totalWithScrap) * 100);
      breakdownPct["setup"] = round2((setup / totalWithScrap) * 100);
      breakdownPct["quality"] = round2((quality / totalWithScrap) * 100);
      breakdownPct["energy"] = round2((energy / totalWithScrap) * 100);
      breakdownPct["secondary"] = round2((secondary / totalWithScrap) * 100);
    }

    reasoning.push(`Cycle ${i.cycle_time_s.toFixed(1)}s @ \$${i.machine_rate_per_hr}/hr → machine \$${round2(machine)}`);
    reasoning.push(`Batch ${i.batch_size} → setup \$${round4(setup)}/pc`);
    reasoning.push(`Scrap rate ${(scrapRate * 100).toFixed(1)}% → quality bucket \$${round2(quality)}`);
    reasoning.push(`Total \$${round2(totalWithScrap)}/pc`);

    return {
      buckets: {
        machine: round4(machine),
        tool: round4(tool),
        material: round4(material),
        setup: round4(setup),
        quality: round4(quality),
        energy: round4(energy),
        secondary: round4(secondary),
      },
      total_cost: round4(total),
      total_cost_with_scrap_amortized: round4(totalWithScrap),
      per_op_tool_cost: perOpToolCost,
      breakdown_pct: breakdownPct,
      reasoning,
    };
  }

  getStats(): { buckets: string[]; reference: string } {
    return {
      buckets: ["machine", "tool", "material", "setup", "quality", "energy", "secondary"],
      reference: "Armarego & Brown; Trent & Wright; ISO 3685",
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const lathePartCostModelEngine = new LathePartCostModelEngineImpl();
export type { LathePartCostModelEngineImpl };
