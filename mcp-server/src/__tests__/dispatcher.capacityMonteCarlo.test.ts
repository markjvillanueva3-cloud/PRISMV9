/**
 * dispatcher.capacityMonteCarlo.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-CMC (CapacityMonteCarloEngine).
 *
 * 1 pure-compute action through real `prism_dev`:
 *   cmc_simulate → CapacityMonteCarloEngine.simulate(input)
 *
 * Stochastic — Math.random() backs the Monte Carlo. ROUTING PROOFs use
 * STATISTICAL bounds (mean within tolerance, value-in-range invariants)
 * rather than exact equality between two calls.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { CapacityMonteCarloEngine } from "../engines/CapacityMonteCarloEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];

const MACHINE_A = {
  id: "mill-1", name: "Mill A",
  hours_per_shift: 8, shifts_per_day: 2, days_per_week: 5,
  mtbf_hours: 200, mttr_hours: 4,
  setup_time_min_mean: 30, setup_time_min_stddev: 5,
  cycle_time_min_mean: 12, cycle_time_min_stddev: 1.5,
};
const MACHINE_B = {
  id: "lathe-1", name: "Lathe B",
  hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5,
  mtbf_hours: 150, mttr_hours: 6,
  setup_time_min_mean: 45, setup_time_min_stddev: 10,
  cycle_time_min_mean: 8, cycle_time_min_stddev: 1.2,
};

const BASE_INPUT = {
  machines: [MACHINE_A, MACHINE_B],
  demand: { parts_per_week_mean: 500, parts_per_week_stddev: 50 },
  scrap_rate_mean: 0.02, scrap_rate_max: 0.10,
  num_simulations: 200, // small N for test speed
  horizon_weeks: 4,
  target_service_level: 0.95,
} as const;

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CMC — Zod schemas", () => {
  it("cmc_simulate requires machines + demand + scrap fields", () => {
    expect(ACTION_DEV_SCHEMAS["cmc_simulate"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cmc_simulate"].safeParse(BASE_INPUT).success).toBe(true);
  });

  it("cmc_simulate caps machines at 100 (DoS bound)", () => {
    expect(ACTION_DEV_SCHEMAS["cmc_simulate"].safeParse({
      ...BASE_INPUT, machines: new Array(101).fill(MACHINE_A),
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cmc_simulate"].safeParse({
      ...BASE_INPUT, machines: new Array(100).fill(MACHINE_A),
    }).success).toBe(true);
  });

  it("cmc_simulate caps num_simulations at 50_000 + horizon_weeks at 104 (DoS bounds)", () => {
    expect(ACTION_DEV_SCHEMAS["cmc_simulate"].safeParse({
      ...BASE_INPUT, num_simulations: 50_001,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cmc_simulate"].safeParse({
      ...BASE_INPUT, horizon_weeks: 105,
    }).success).toBe(false);
  });

  it("cmc_simulate rejects scrap_rate outside [0,1]", () => {
    expect(ACTION_DEV_SCHEMAS["cmc_simulate"].safeParse({
      ...BASE_INPUT, scrap_rate_mean: -0.01,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cmc_simulate"].safeParse({
      ...BASE_INPUT, scrap_rate_max: 1.5,
    }).success).toBe(false);
  });

  it("cmc_simulate rejects zero/negative cycle_time_min_mean (would div-by-zero in engine)", () => {
    const badMachine = { ...MACHINE_A, cycle_time_min_mean: 0 };
    expect(ACTION_DEV_SCHEMAS["cmc_simulate"].safeParse({
      ...BASE_INPUT, machines: [badMachine],
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CMC — prism_dev :: cmc_simulate", () => {
  it("returns full result shape with summary + per_machine + risk_factors + oee_decomposition + confidence_interval", async () => {
    const r = await invokeHandler(devHandler, "cmc_simulate", BASE_INPUT);
    expect(r.machine_count).toBe(2);
    expect(r.num_simulations).toBe(200);
    const sim = (r as { result: { summary: Record<string, number | boolean>; per_machine: unknown[]; risk_factors?: string[]; oee_decomposition: Record<string, number>; confidence_interval: { level: number; lower: number; upper: number } } }).result;
    expect(typeof sim.summary.mean_weekly_capacity).toBe("number");
    expect(typeof sim.summary.mean_oee).toBe("number");
    expect(typeof sim.summary.service_level_met).toBe("boolean");
    expect(sim.per_machine.length).toBe(2);
    expect(sim.confidence_interval.level).toBe(0.90);
    expect((r as { per_machine_count?: number }).per_machine_count).toBe(sim.per_machine.length);
    const risks = sim.risk_factors ?? [];
    expect((r as { risk_factor_count?: number }).risk_factor_count ?? 0).toBe(risks.length);
  });

  it("OEE decomposition invariant: oee ≈ availability * performance * quality (engine line 226 + 265)", async () => {
    const r = await invokeHandler(devHandler, "cmc_simulate", BASE_INPUT);
    const dec = (r as { result: { oee_decomposition: { availability: number; performance: number; quality: number; oee: number } } }).result.oee_decomposition;
    // Engine rounds each to 3 decimals — recompute with same rounding for compare.
    const expected = Math.round(dec.availability * dec.performance * dec.quality * 1000) / 1000;
    // tolerance: 0.01 to absorb compound rounding across the 3 factors.
    expect(Math.abs(dec.oee - expected)).toBeLessThan(0.01);
  });

  it("confidence_interval [lower, upper] = [p5, p95] (engine line 268-269)", async () => {
    const r = await invokeHandler(devHandler, "cmc_simulate", BASE_INPUT);
    const sim = (r as { result: { summary: { p5_capacity: number; p95_capacity: number }; confidence_interval: { lower: number; upper: number } } }).result;
    expect(sim.confidence_interval.lower).toBe(sim.summary.p5_capacity);
    expect(sim.confidence_interval.upper).toBe(sim.summary.p95_capacity);
  });

  it("p5 ≤ p50 ≤ p95 (percentile monotonicity)", async () => {
    const r = await invokeHandler(devHandler, "cmc_simulate", BASE_INPUT);
    const s = (r as { result: { summary: { p5_capacity: number; p50_capacity: number; p95_capacity: number } } }).result.summary;
    expect(s.p5_capacity).toBeLessThanOrEqual(s.p50_capacity);
    expect(s.p50_capacity).toBeLessThanOrEqual(s.p95_capacity);
  });

  it("per_machine bottleneck_probability sums to ≈ 1.0 (each sim has exactly one bottleneck)", async () => {
    const r = await invokeHandler(devHandler, "cmc_simulate", BASE_INPUT);
    const pm = (r as { result: { per_machine: { bottleneck_probability: number }[] } }).result.per_machine;
    const sum = pm.reduce((acc, m) => acc + m.bottleneck_probability, 0);
    // Engine rounds each to 2 decimals, so 2-machine sum may drift up to 0.02.
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.05);
  });

  it("VARIABILITY — single-machine simulation also produces well-formed result", async () => {
    const r = await invokeHandler(devHandler, "cmc_simulate", {
      ...BASE_INPUT, machines: [MACHINE_A],
    });
    expect(r.machine_count).toBe(1);
    const pm = (r as { result: { per_machine: unknown[] } }).result.per_machine;
    expect(pm.length).toBe(1);
  });

  it("VARIABILITY — high-demand scenario triggers stockout risk (engine line 240 threshold 0.1)", async () => {
    const r = await invokeHandler(devHandler, "cmc_simulate", {
      ...BASE_INPUT,
      demand: { parts_per_week_mean: 99_999, parts_per_week_stddev: 100 }, // unmeetable
    });
    const sim = (r as { result: { summary: { service_level_met: boolean; stockout_probability: number } } }).result;
    expect(sim.summary.service_level_met).toBe(false);
    expect(sim.summary.stockout_probability).toBeGreaterThan(0.5);
  });

  it("ROUTING PROOF — wire result.summary fields are within engine-direct call's statistical bounds (multi-call)", async () => {
    // Two independent calls with same input. Both stochastic, but mean
    // capacity, OEE, etc. should agree to within ~25% (200 sims is small).
    const r = await invokeHandler(devHandler, "cmc_simulate", BASE_INPUT);
    const direct = CapacityMonteCarloEngine.simulate({ ...BASE_INPUT } as Parameters<typeof CapacityMonteCarloEngine.simulate>[0]);
    const wire = (r as { result: { summary: { mean_weekly_capacity: number; mean_oee: number } } }).result;
    // Wire and direct ran 200 sims each. Compare mean capacity within
    // ±50% (statistical tolerance for small N). Both should be >0.
    expect(wire.summary.mean_weekly_capacity).toBeGreaterThan(0);
    expect(direct.summary.mean_weekly_capacity).toBeGreaterThan(0);
    const ratio = wire.summary.mean_weekly_capacity / direct.summary.mean_weekly_capacity;
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(2.0);
    // OEE bounded [0,1] for both
    expect(wire.summary.mean_oee).toBeGreaterThanOrEqual(0);
    expect(wire.summary.mean_oee).toBeLessThanOrEqual(1);
    expect(direct.summary.mean_oee).toBeGreaterThanOrEqual(0);
    expect(direct.summary.mean_oee).toBeLessThanOrEqual(1);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CMC — error envelope", () => {
  it("cmc_simulate without machines → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "cmc_simulate", {
      demand: BASE_INPUT.demand,
      scrap_rate_mean: 0.02, scrap_rate_max: 0.10,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("cmc_simulate with empty machines array → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "cmc_simulate", { ...BASE_INPUT, machines: [] });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("cmc_simulate with num_simulations > 50000 → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "cmc_simulate", { ...BASE_INPUT, num_simulations: 1_000_000 });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
