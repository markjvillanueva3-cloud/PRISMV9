/**
 * dispatcher.turningThreadRobustOptimizer.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-TTRO (TurningThreadRobustOptimizerEngine).
 *
 * Single pure-compute action through real `prism_dev`:
 *   ttro_run → run(input) — sensitivity + grid MC for thread cascade
 *
 * Engine throws on bad input (engine line 92-115); dispatcher try/catch
 * envelopes to clean error string (no bubble-up).
 *
 * Engine-pair test already exists at TurningThreadRobustOptimizerEngine.test.ts.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { turningThreadRobustOptimizerEngine } from "../engines/TurningThreadRobustOptimizerEngine.js";

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

// Canonical M10×1.5 metric thread spec (common shop fastener).
const M10X1_5_THREAD = {
  thread_form: "metric" as const,
  pitch_mm: 1.5,
  major_diameter_mm: 10,
  internal: false,
  infeed_method: "radial" as const,
  total_depth_mm: 0.92,
  spindle_rpm: 600,
  num_passes: 5,
  spring_passes: 2,
  lead_in_mm: 3.0,
  lead_out_mm: 1.5,
  thread_length_mm: 20,
  material_tensile_MPa: 600,
};

// Smaller grid for fast tests (3×3=9 grid points, 20 MC trials each = 180 evals).
const FAST_INPUT = {
  thread: M10X1_5_THREAD,
  grid_steps: 3,
  n_trials: 20,
  seed: 42,
};

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TTRO — Zod schemas", () => {
  it("ttro_run requires thread spec with all 13 SPTInput fields", () => {
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({ thread: {} }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({
      thread: M10X1_5_THREAD,
    }).success).toBe(true);
  });

  it("ttro_run rejects bad thread_form / infeed_method enums", () => {
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({
      thread: { ...M10X1_5_THREAD, thread_form: "INVALID" },
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({
      thread: { ...M10X1_5_THREAD, infeed_method: "INVALID" },
    }).success).toBe(false);
  });

  it("ttro_run caps grid_steps at 11 + n_trials at 2000 (DoS — mirrors engine bounds)", () => {
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({
      thread: M10X1_5_THREAD, grid_steps: 12,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({
      thread: M10X1_5_THREAD, grid_steps: 11,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({
      thread: M10X1_5_THREAD, n_trials: 2001,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({
      thread: M10X1_5_THREAD, n_trials: 2000,
    }).success).toBe(true);
  });

  it("ttro_run caps thread physical dimensions", () => {
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({
      thread: { ...M10X1_5_THREAD, pitch_mm: 51 },
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({
      thread: { ...M10X1_5_THREAD, num_passes: 31 },
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({
      thread: { ...M10X1_5_THREAD, material_tensile_MPa: 10_001 },
    }).success).toBe(false);
  });

  it("ttro_run rejects adjust_range outside (0,1)", () => {
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({
      thread: M10X1_5_THREAD, adjust_range: 0,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({
      thread: M10X1_5_THREAD, adjust_range: 1,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ttro_run"].safeParse({
      thread: M10X1_5_THREAD, adjust_range: 0.5,
    }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TTRO — prism_dev :: ttro_run", () => {
  it("returns ThreadRobustResult with grid + baseline + top2_drivers", async () => {
    const r = await invokeHandler(devHandler, "ttro_run", FAST_INPUT);
    const res = (r as { result: { grid: unknown[]; baseline_safe_fraction: number; top2_drivers: string[]; safe_fraction_lift: number } }).result;
    expect(Array.isArray(res.grid)).toBe(true);
    expect(res.grid.length).toBeGreaterThan(0);
    expect(res.grid.length).toBeLessThanOrEqual(11 * 11); // cap at grid_steps² max
    expect(typeof res.baseline_safe_fraction).toBe("number");
    expect(Array.isArray(res.top2_drivers)).toBe(true);
    expect(typeof res.safe_fraction_lift).toBe("number");
  });

  it("baseline_safe_fraction ∈ [0, 1]", async () => {
    const r = await invokeHandler(devHandler, "ttro_run", FAST_INPUT);
    const res = (r as { result: { baseline_safe_fraction: number } }).result;
    expect(res.baseline_safe_fraction).toBeGreaterThanOrEqual(0);
    expect(res.baseline_safe_fraction).toBeLessThanOrEqual(1);
  });

  it("every grid point has safe_fraction ∈ [0,1] + non-negative force_p95 + time_p50", async () => {
    const r = await invokeHandler(devHandler, "ttro_run", FAST_INPUT);
    const grid = (r as { result: { grid: Array<{ safe_fraction: number; force_p95: number; time_p50: number; feasibility_rate: number }> } }).result.grid;
    for (const g of grid) {
      expect(g.safe_fraction).toBeGreaterThanOrEqual(0);
      expect(g.safe_fraction).toBeLessThanOrEqual(1);
      expect(g.force_p95).toBeGreaterThanOrEqual(0);
      expect(g.time_p50).toBeGreaterThanOrEqual(0);
      expect(g.feasibility_rate).toBeGreaterThanOrEqual(0);
      expect(g.feasibility_rate).toBeLessThanOrEqual(1);
    }
  });

  it("wire-level discriminators mirror engine result shape", async () => {
    const r = await invokeHandler(devHandler, "ttro_run", FAST_INPUT);
    const res = (r as { result: { grid: unknown[]; best_point: unknown | null; top2_drivers: string[]; baseline_safe_fraction: number; safe_fraction_lift: number } }).result;
    expect(r.grid_point_count).toBe(res.grid.length);
    expect(r.has_best_point).toBe(res.best_point !== null);
    expect(r.top2_driver_count).toBe(res.top2_drivers.length);
    expect(r.baseline_safe_fraction).toBe(res.baseline_safe_fraction);
    expect(r.safe_fraction_lift).toBe(res.safe_fraction_lift);
  });

  it("top2_drivers contains exactly 2 entries from THREAD_DIMS (engine line 81-88)", async () => {
    const r = await invokeHandler(devHandler, "ttro_run", FAST_INPUT);
    const drivers = (r as { result: { top2_drivers: string[] } }).result.top2_drivers;
    expect(drivers.length).toBe(2);
    const validDims = ["spindle_rpm", "pitch_mm", "major_diameter_mm", "num_passes", "lead_in_mm", "lead_out_mm"];
    for (const d of drivers) {
      expect(validDims).toContain(d);
    }
  });

  it("DETERMINISM — seeded MC returns identical baseline_safe_fraction twice", async () => {
    const r1 = await invokeHandler(devHandler, "ttro_run", FAST_INPUT);
    const r2 = await invokeHandler(devHandler, "ttro_run", FAST_INPUT);
    expect((r1.result as { baseline_safe_fraction: number }).baseline_safe_fraction)
      .toBe((r2.result as { baseline_safe_fraction: number }).baseline_safe_fraction);
  });

  it("ROUTING PROOF — wire baseline_safe_fraction equals engine-direct run()", async () => {
    const r = await invokeHandler(devHandler, "ttro_run", FAST_INPUT);
    const direct = turningThreadRobustOptimizerEngine.run(FAST_INPUT);
    expect((r.result as { baseline_safe_fraction: number }).baseline_safe_fraction)
      .toBeCloseTo(direct.baseline_safe_fraction, 6);
  });

  it("VARIABILITY — 3 distinct thread specs (UN/metric/ACME) all return well-formed results", async () => {
    const specs = [
      { ...M10X1_5_THREAD, thread_form: "UN" as const, pitch_mm: 1.27, major_diameter_mm: 12 },
      { ...M10X1_5_THREAD, thread_form: "metric" as const },
      { ...M10X1_5_THREAD, thread_form: "ACME" as const, pitch_mm: 2.0, major_diameter_mm: 20, total_depth_mm: 1.5 },
    ];
    for (const t of specs) {
      const r = await invokeHandler(devHandler, "ttro_run", { thread: t, grid_steps: 2, n_trials: 10, seed: 42 });
      const res = (r as { result: { grid: unknown[]; baseline_safe_fraction: number } }).result;
      expect(res.grid.length).toBeGreaterThan(0);
      expect(res.baseline_safe_fraction).toBeGreaterThanOrEqual(0);
      expect(res.baseline_safe_fraction).toBeLessThanOrEqual(1);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TTRO — error envelope (engine throws → caught)", () => {
  it("ttro_run without thread → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ttro_run", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ttro_run with grid_steps=1 → schema rejects (min: 2)", async () => {
    const r = await invokeHandler(devHandler, "ttro_run", {
      thread: M10X1_5_THREAD, grid_steps: 1,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ttro_run with adjust_range >= 1 → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ttro_run", {
      thread: M10X1_5_THREAD, adjust_range: 1.5,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ttro_run with negative time_weight → schema rejects (min: 0)", async () => {
    const r = await invokeHandler(devHandler, "ttro_run", {
      thread: M10X1_5_THREAD, time_weight: -0.1,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
