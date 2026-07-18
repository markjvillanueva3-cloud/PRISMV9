/**
 * MillPartCostModelEngine — 8-bucket cost-per-part model for mill operations
 *
 * Mill-domain parity for LathePartCostModelEngine (LATHE-PRO-MS10). Lathe has 7 buckets;
 * mill adds an 8th — **fixture amortization** — because mill operations frequently use
 * dedicated fixtures (soft jaws, custom fixture plates, tombstones) that are amortized
 * over batch_size, not per-cut.
 *
 * 8 BUCKETS:
 *   1. machine    — cycle_time_hr × loaded_rate_per_hr
 *   2. tool       — Σ ops (cycle / tool_life) × (insert_cost + holder_amort) [mill: endmills,
 *                   drills, taps have different edge counts than lathe inserts]
 *   3. material   — (part_mass + waste_mass) × price_per_kg
 *                   [mill waste includes chips + cutoff stock + handling allowance]
 *   4. setup      — setup_time_hr × rate_per_hr / batch_size
 *   5. quality    — scrap_rate × (material + machine) [sunk at failure]
 *   6. energy     — spindle_power_kW × cycle_hr × price_per_kWh
 *   7. secondary  — named secondary ops (deburr, wash, inspect, heat-treat)
 *   8. fixture    — fixture_amort_total / batch_size               ← MILL-CANONICAL
 *                   [mill fixtures are commonly dedicated per-part; lathe uses generic chuck/collets]
 *
 * Total = Σ buckets. Returns structured breakdown for UI + downstream (Gilbert, quoting, scheduling).
 *
 * References:
 *   - Armarego & Brown "Machining of Metals" §8 (economic machining)
 *   - Trent & Wright "Metal Cutting" §11 (tool life economics)
 *   - ISO 3685 (tool life → amortization)
 *   - SME "Tool & Manufacturing Engineers Handbook" Vol 1 §16 (mill cost models)
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-PART-COST-MODEL (iter69)
 * @version 1.0.0
 * @module MillPartCostModelEngine
 */

export interface MillOperationCost {
  /** Operation identifier (e.g. "rough_pocket", "finish_face", "drill_holes") */
  op: string;
  /** Cycle time contribution (seconds) */
  cycle_time_s: number;
  /** Tool life in same units (seconds) */
  tool_life_s: number;
  /** Cost per cutter / insert / edge */
  tool_cost: number;
  /** Edges/uses per tool — solid carbide endmill ~1 (regrind), indexable ~4-8 edges per insert */
  edges_per_tool: number;
  /** Holder amortization per edge (collet, ER, HSK shrink-fit) */
  holder_amort_per_edge?: number;
}

export interface MillPartCostInput {
  /** Total cycle time seconds */
  cycle_time_s: number;
  /** Loaded machine rate $/hr */
  machine_rate_per_hr: number;
  /** Per-op tool cost inputs */
  operations: MillOperationCost[];
  /** Part mass kg */
  part_mass_kg: number;
  /** Waste (chips + cutoff + handling) mass kg */
  waste_mass_kg: number;
  /** Material price $/kg */
  material_price_per_kg: number;
  /** Setup time seconds */
  setup_time_s: number;
  /** Setup rate $/hr */
  setup_rate_per_hr: number;
  /** Batch size for setup + fixture amortization */
  batch_size: number;
  /** Scrap rate fraction (0..1) */
  scrap_rate?: number;
  /** Average spindle power kW during cut */
  spindle_power_kw?: number;
  /** Energy price $/kWh */
  energy_price_per_kwh?: number;
  /** Named secondary operations */
  secondary_ops?: Array<{ name: string; cost: number }>;
  /** Fixture amortization total $ (dedicated soft jaws / fixture plate / tombstone — amortized over batch) */
  fixture_amort_total?: number;
}

export interface MillPartCostResult {
  buckets: {
    machine: number;
    tool: number;
    material: number;
    setup: number;
    quality: number;
    energy: number;
    secondary: number;
    fixture: number;
  };
  total_cost: number;
  /** Total cost with scrap-rate amortization (multiply by 1/(1-scrap_rate)) */
  total_cost_with_scrap_amortized: number;
  per_op_tool_cost: Record<string, number>;
  breakdown_pct: Record<string, number>;
  reasoning: string[];
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

class MillPartCostModelEngineImpl {
  compute(i: MillPartCostInput): MillPartCostResult {
    this.validate(i);
    const reasoning: string[] = [];
    const scrapRate = Math.max(0, Math.min(0.99, i.scrap_rate ?? 0.02));

    // 1. Machine bucket
    const machine = (i.cycle_time_s / 3600) * i.machine_rate_per_hr;

    // 2. Tool bucket (per op)
    const perOpToolCost: Record<string, number> = {};
    let tool = 0;
    for (const op of i.operations) {
      if (op.tool_life_s <= 0) {
        perOpToolCost[op.op] = 0;
        continue;
      }
      const edgeCost = op.tool_cost / Math.max(1, op.edges_per_tool);
      const amortPerSec = (edgeCost + (op.holder_amort_per_edge ?? 0)) / op.tool_life_s;
      const cost = amortPerSec * op.cycle_time_s;
      perOpToolCost[op.op] = round2(cost);
      tool += cost;
    }

    // 3. Material bucket
    const material = (i.part_mass_kg + i.waste_mass_kg) * i.material_price_per_kg;

    // 4. Setup bucket (amortized)
    const setup = ((i.setup_time_s / 3600) * i.setup_rate_per_hr) / Math.max(1, i.batch_size);

    // 5. Quality bucket: scrap-rate × material+machine (sunk at failure)
    const quality = scrapRate * (material + machine);

    // 6. Energy bucket
    const energy = (i.spindle_power_kw ?? 0) * (i.cycle_time_s / 3600) * (i.energy_price_per_kwh ?? 0);

    // 7. Secondary bucket
    const secondary = (i.secondary_ops ?? []).reduce((s, op) => s + op.cost, 0);

    // 8. Fixture bucket (mill-canonical) — amortized over batch
    const fixture = (i.fixture_amort_total ?? 0) / Math.max(1, i.batch_size);

    const buckets = { machine, tool, material, setup, quality, energy, secondary, fixture };
    const total = Object.values(buckets).reduce((s, v) => s + v, 0);

    // Scrap-rate amortized total: as a Bernoulli — expected attempts per good = 1/(1-p)
    const totalWithScrap = total / (1 - scrapRate);

    // Breakdown percent (of base total)
    const totalSafe = total > 0 ? total : 1;
    const breakdown_pct: Record<string, number> = {};
    for (const [k, v] of Object.entries(buckets)) {
      breakdown_pct[k] = round2((v / totalSafe) * 100);
    }

    // Round all bucket values
    for (const k of Object.keys(buckets) as Array<keyof typeof buckets>) {
      buckets[k] = round4(buckets[k]);
    }

    reasoning.push(`Machine $${round2(buckets.machine)} (${round2(buckets.machine / 60 / i.machine_rate_per_hr * 3600)}min)`);
    reasoning.push(`Tool $${round2(buckets.tool)} over ${i.operations.length} op(s)`);
    reasoning.push(`Material $${round2(buckets.material)} (part ${i.part_mass_kg}kg + waste ${i.waste_mass_kg}kg @ $${i.material_price_per_kg}/kg)`);
    reasoning.push(`Setup $${round2(buckets.setup)} (${i.setup_time_s}s / batch ${i.batch_size})`);
    reasoning.push(`Quality scrap-rate ${(scrapRate * 100).toFixed(1)}% → $${round2(buckets.quality)}`);
    if (buckets.energy > 0) reasoning.push(`Energy $${round2(buckets.energy)}`);
    if (buckets.secondary > 0) reasoning.push(`Secondary $${round2(buckets.secondary)}`);
    if (buckets.fixture > 0) reasoning.push(`Fixture amort $${round2(buckets.fixture)} ($${i.fixture_amort_total} / batch ${i.batch_size})`);
    reasoning.push(`Total $${round2(total)}; scrap-amortized $${round2(totalWithScrap)}`);

    return {
      buckets,
      total_cost: round4(total),
      total_cost_with_scrap_amortized: round4(totalWithScrap),
      per_op_tool_cost: perOpToolCost,
      breakdown_pct,
      reasoning,
    };
  }

  getStats(): {
    buckets: string[];
    mill_canonical_extensions: string[];
    reference: string;
  } {
    return {
      buckets: ["machine", "tool", "material", "setup", "quality", "energy", "secondary", "fixture"],
      mill_canonical_extensions: ["fixture"], // bucket #8 — mill-canonical vs Lathe's 7
      reference: "Armarego & Brown §8 economic machining; Trent & Wright §11 tool life econ; ISO 3685; SME Vol 1 §16",
    };
  }

  // ── Validation ────────────────────────────────────────────────────────

  private validate(i: MillPartCostInput): void {
    if (!i) throw new Error("MillPartCostModelEngine.compute: input required");
    if (!(i.cycle_time_s >= 0)) throw new Error("MillPartCostModelEngine.compute: cycle_time_s must be >= 0");
    if (!(i.machine_rate_per_hr >= 0)) throw new Error("MillPartCostModelEngine.compute: machine_rate_per_hr must be >= 0");
    if (!(i.batch_size > 0)) throw new Error("MillPartCostModelEngine.compute: batch_size must be > 0");
    if (!Array.isArray(i.operations)) throw new Error("MillPartCostModelEngine.compute: operations[] required");
    if (!(i.part_mass_kg >= 0)) throw new Error("MillPartCostModelEngine.compute: part_mass_kg must be >= 0");
    if (!(i.waste_mass_kg >= 0)) throw new Error("MillPartCostModelEngine.compute: waste_mass_kg must be >= 0");
    if (!(i.material_price_per_kg >= 0)) throw new Error("MillPartCostModelEngine.compute: material_price_per_kg must be >= 0");
  }
}

export const millPartCostModelEngine = new MillPartCostModelEngineImpl();
export type { MillPartCostModelEngineImpl };
