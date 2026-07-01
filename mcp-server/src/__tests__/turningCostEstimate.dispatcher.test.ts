/**
 * turningCostEstimate.dispatcher.test.ts — round-trip wiring + behaviour coverage
 * for CALC-RESTORE-MS0 / Phase 1A: prism_turning:turning_cost_estimate.
 *
 * Drives the action through the REAL dispatcher (action enum + Zod schema + lazy
 * import + switch case → JobCostingEngine.calculateJobCost), not the engine
 * singleton — a rename of calculateJobCost or a missing enum entry would slip
 * past an engine-only test but fails here.
 *
 * Assertions lean on algebraic / physical invariants rather than hard-coded
 * reference numbers, so the test stays valid as JobCostingEngine's internal
 * rates evolve — it verifies the WIRING and the turning→JobSpec adaptation, and
 * deliberately exercises spanning material/batch/rate configurations plus the
 * minimal-input ("not all information available") path.
 *
 * @milestone CALC-RESTORE-MS0 / Phase 1A
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name: string, _desc: string, _schema: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, handler });
    },
  };
}

async function invoke(
  handler: CapturedTool["handler"],
  params: Record<string, unknown>,
): Promise<Record<string, any>> {
  const res = (await handler({ action: "turning_cost_estimate", params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const arr = (res as { content: Array<{ text?: string }> }).content;
    return JSON.parse(arr[0]?.text ?? "{}") as Record<string, any>;
  }
  return res as Record<string, any>;
}

const COST_CATEGORIES = [
  "material", "setup", "machining", "programming", "inspection",
  "finishing", "toolConsumption", "power", "overhead", "admin",
] as const;

/** Sum of every category's per-batch cost — should reconcile to `total`. */
function categorySum(out: Record<string, any>): number {
  return COST_CATEGORIES.reduce((s, c) => s + Number(out[c]?.cost ?? 0), 0);
}

/** Baseline: a 50 mm round-bar part, 60 mm long, 3 min cycle, 100-off in steel. */
const BASE = {
  bar_od_mm: 50,
  part_length_mm: 60,
  cycle_time_sec: 180,
  density_kg_m3: 7850,
  material_price_per_kg: 3.5,
  machine_rate_per_hr: 85,
  setup_minutes: 30,
  batch_size: 100,
  secondary_ops_cost_usd: 0,
};

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning dispatcher not registered");
  turningHandler = t.handler;
});

describe("turning_cost_estimate — round-trip wiring", () => {
  it("is reachable through the dispatcher and returns a reconciling CostBreakdown", async () => {
    const out = await invoke(turningHandler, BASE);
    // A real breakdown — not an "Unknown action" / "Invalid params" envelope —
    // has a positive, bounded total and a per-part figure no larger than it.
    expect(out.total).toBeGreaterThan(0);
    expect(out.total).toBeLessThan(1e7);
    expect(out.perPart).toBeGreaterThan(0);
    expect(out.perPart).toBeLessThanOrEqual(out.total);
    // Every category cost is a bounded non-negative number, and the ten
    // categories sum to the reported batch total (engine reconciliation).
    for (const cat of COST_CATEGORIES) {
      expect(out[cat].cost, `${cat}.cost`).toBeGreaterThanOrEqual(0);
      expect(out[cat].cost, `${cat}.cost bounded`).toBeLessThan(1e7);
    }
    expect(categorySum(out)).toBeCloseTo(out.total, 1);
  });

  it("echoes batch_size so the frontend can per-part-amortize", async () => {
    expect((await invoke(turningHandler, { ...BASE, batch_size: 250 })).batch_size).toBe(250);
    expect((await invoke(turningHandler, { ...BASE, batch_size: 1 })).batch_size).toBe(1);
  });

  it("perPart equals the batch total divided by batch_size (engine amortization invariant)", async () => {
    const out = await invoke(turningHandler, BASE);
    expect(out.perPart).toBeCloseTo(out.total / 100, 1);
  });
});

describe("turning_cost_estimate — physical / algebraic invariants", () => {
  it("material cost scales ~quadratically with bar OD (cylinder cross-section ∝ D²)", async () => {
    const small = await invoke(turningHandler, { ...BASE, bar_od_mm: 25 });
    const large = await invoke(turningHandler, { ...BASE, bar_od_mm: 50 });
    // Doubling the OD quadruples the cross-sectional area → ~4× the material cost.
    expect(large.material.cost / small.material.cost).toBeCloseTo(4, 0);
  });

  it("material cost scales linearly with density", async () => {
    const steel = await invoke(turningHandler, { ...BASE, density_kg_m3: 7850 });
    const dense = await invoke(turningHandler, { ...BASE, density_kg_m3: 15700 });
    expect(dense.material.cost / steel.material.cost).toBeCloseTo(2, 1);
  });

  it("machining cost scales linearly with cycle time and with machine rate", async () => {
    const baseRun = await invoke(turningHandler, BASE);
    const longCycle = await invoke(turningHandler, { ...BASE, cycle_time_sec: 360 });
    const fastRate = await invoke(turningHandler, { ...BASE, machine_rate_per_hr: 170 });
    expect(longCycle.machining.cost / baseRun.machining.cost).toBeCloseTo(2, 1);
    expect(fastRate.machining.cost / baseRun.machining.cost).toBeCloseTo(2, 1);
  });

  it("per-part cost falls as batch size grows (setup is amortized)", async () => {
    const oneOff = await invoke(turningHandler, { ...BASE, batch_size: 1 });
    const small = await invoke(turningHandler, { ...BASE, batch_size: 50 });
    const large = await invoke(turningHandler, { ...BASE, batch_size: 1000 });
    expect(oneOff.perPart).toBeGreaterThan(small.perPart);
    expect(small.perPart).toBeGreaterThan(large.perPart);
  });

  it("secondary-ops cost flows into the finishing category at exactly $/part × batch", async () => {
    const without = await invoke(turningHandler, { ...BASE, secondary_ops_cost_usd: 0 });
    const withOps = await invoke(turningHandler, { ...BASE, secondary_ops_cost_usd: 4 });
    // 4 $/part × 100 parts = 400 added to the batch finishing line.
    expect(withOps.finishing.cost - without.finishing.cost).toBeCloseTo(400, 0);
  });
});

describe("turning_cost_estimate — variability across spanning configurations", () => {
  // Three materials spanning the density/price range a real shop turns.
  const MATERIALS = [
    { name: "6061 aluminum", density_kg_m3: 2700, material_price_per_kg: 4.0 },
    { name: "1018 steel", density_kg_m3: 7850, material_price_per_kg: 1.1 },
    { name: "Ti-6Al-4V", density_kg_m3: 4430, material_price_per_kg: 35.0 },
  ];
  it.each(MATERIALS)("prices a turned part in $name with a positive, bounded total", async (mat) => {
    const out = await invoke(turningHandler, {
      ...BASE,
      density_kg_m3: mat.density_kg_m3,
      material_price_per_kg: mat.material_price_per_kg,
    });
    expect(out.total).toBeGreaterThan(0);
    expect(out.total).toBeLessThan(1e7);
    expect(out.material.cost).toBeGreaterThan(0);
    expect(categorySum(out)).toBeCloseTo(out.total, 1);
  });

  // Titanium ($35/kg) must cost more material than aluminum ($4/kg) at the same
  // geometry — for these spanning values price dominates the density difference.
  it("ranks material cost by price·density across the spanning set", async () => {
    const al = await invoke(turningHandler, { ...BASE, density_kg_m3: 2700, material_price_per_kg: 4.0 });
    const ti = await invoke(turningHandler, { ...BASE, density_kg_m3: 4430, material_price_per_kg: 35.0 });
    expect(ti.material.cost).toBeGreaterThan(al.material.cost);
  });

  it.each([1, 100, 5000])("produces a reconciling breakdown for a batch of %i", async (batch) => {
    const out = await invoke(turningHandler, { ...BASE, batch_size: batch });
    expect(out.batch_size).toBe(batch);
    expect(out.perPart).toBeGreaterThan(0);
    expect(out.total).toBeCloseTo(out.perPart * batch, 0);
  });
});

describe("turning_cost_estimate — incomplete information (defaults applied)", () => {
  it("works with only the three required fields — optionals fall back to defaults", async () => {
    // The realistic "operator hasn't filled everything in" path: no density, no
    // price, no machine rate, no batch size, no setup. Must still cost the job.
    const out = await invoke(turningHandler, {
      bar_od_mm: 32,
      part_length_mm: 80,
      cycle_time_sec: 120,
    });
    expect(out.batch_size).toBe(1); // default
    expect(out.total).toBeGreaterThan(0);
    expect(out.total).toBeLessThan(1e7);
    expect(out.perPart).toBeCloseTo(out.total, 1); // batch of 1 → perPart === total
  });

  it("treats an absent material name as 'price from defaults', not a failure", async () => {
    const out = await invoke(turningHandler, { ...BASE, material: undefined });
    expect(out.material.cost).toBeGreaterThan(0);
    expect(out.total).toBeGreaterThan(0);
  });
});

describe("turning_cost_estimate — failure modes are rejected by the schema", () => {
  it("rejects a missing required field (no cycle_time_sec)", async () => {
    const out = await invoke(turningHandler, { bar_od_mm: 50, part_length_mm: 60 });
    expect(String(out.error ?? "")).toMatch(/invalid params|cycle_time_sec/i);
  });

  it("rejects a non-positive bar OD", async () => {
    const out = await invoke(turningHandler, { ...BASE, bar_od_mm: 0 });
    expect(String(out.error ?? "")).toMatch(/invalid params|bar_od_mm/i);
  });

  it("rejects a negative cycle time", async () => {
    const out = await invoke(turningHandler, { ...BASE, cycle_time_sec: -10 });
    expect(String(out.error ?? "")).toMatch(/invalid params|cycle_time_sec/i);
  });
});

describe("turning_cost_estimate — adversarial inputs stay finite", () => {
  it("handles an extreme oversize bar with a large but bounded, non-NaN total", async () => {
    const out = await invoke(turningHandler, { ...BASE, bar_od_mm: 5000, part_length_mm: 5000 });
    // toBeGreaterThan / toBeLessThan both fail on NaN, so these bound AND finiteness-check.
    expect(out.total).toBeGreaterThan(0);
    expect(out.total).toBeLessThan(1e12);
    expect(categorySum(out)).toBeCloseTo(out.total, 0);
  });

  it("handles a sub-millimetre micro-part with a small but valid total", async () => {
    const out = await invoke(turningHandler, { ...BASE, bar_od_mm: 0.5, part_length_mm: 1, cycle_time_sec: 5 });
    expect(out.total).toBeGreaterThan(0);
    expect(out.total).toBeLessThan(1e7);
  });
});
