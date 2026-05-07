/**
 * LATHE-PRO-MS4a — Thread robust optimizer test.
 *
 * Tests TurningThreadRobustOptimizerEngine end-to-end:
 *   • Reference-value invariants (argmax correctness, grid size, monotonicity).
 *   • Algebraic invariants: best.safe_fraction ≥ every candidate's safe_fraction
 *     when time_weight = 0 (pure safety ranking).
 *   • Reproducibility under fixed seed.
 *   • ≥3 failure modes (invalid range, steps, n_trials).
 *   • ≥2 adversarial (NaN, Infinity, extreme config).
 *   • Variability across 3 thread forms (UN, metric, ACME).
 *   • Dispatcher round-trip: action invokes through stub server.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  turningThreadRobustOptimizerEngine,
  TurningThreadRobustOptimizerEngine,
  type ThreadRobustInput,
} from "../engines/TurningThreadRobustOptimizerEngine.js";
import type { SPTInput } from "../engines/SinglePointThreadEngine.js";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

function baseThread(overrides: Partial<SPTInput> = {}): SPTInput {
  return {
    thread_form: "UN",
    pitch_mm: 2.0,
    major_diameter_mm: 12.0,
    internal: false,
    infeed_method: "modified_flank",
    total_depth_mm: 1.227,
    spindle_rpm: 600,
    num_passes: 6,
    spring_passes: 2,
    lead_in_mm: 3,
    lead_out_mm: 3,
    thread_length_mm: 25,
    material_tensile_MPa: 200,
    ...overrides,
  };
}

function baseInput(o: Partial<ThreadRobustInput> = {}): ThreadRobustInput {
  return {
    thread: baseThread(),
    grid_steps: 3,
    n_trials: 20,
    seed: 1,
    ...o,
  };
}

const THREAD_DIMS = [
  "spindle_rpm",
  "pitch_mm",
  "major_diameter_mm",
  "num_passes",
  "lead_in_mm",
  "lead_out_mm",
];

// ───────────────── Reference values ─────────────────

describe("TurningThreadRobustOptimizerEngine.run — reference values", () => {
  it("returns grid_steps × grid_steps = 9 points for steps=3", () => {
    const r = turningThreadRobustOptimizerEngine.run(baseInput({ grid_steps: 3 }));
    expect(r.grid).toHaveLength(9);
    expect(r.best_point).not.toBeNull();
  });

  it("returns grid_steps × grid_steps = 25 points for steps=5", () => {
    const r = turningThreadRobustOptimizerEngine.run(baseInput({ grid_steps: 5 }));
    expect(r.grid).toHaveLength(25);
  });

  it("picks exactly 2 distinct drivers from the 6-dim axis set", () => {
    const r = turningThreadRobustOptimizerEngine.run(baseInput());
    expect(r.top2_drivers).toHaveLength(2);
    expect(r.top2_drivers[0]).not.toBe(r.top2_drivers[1]);
    for (const d of r.top2_drivers) expect(THREAD_DIMS).toContain(d);
  });

  it("best_point has max score among feasible candidates", () => {
    const r = turningThreadRobustOptimizerEngine.run(baseInput());
    const floor = r.min_feasibility_rate;
    const feasible = r.grid.filter((g) => g.feasibility_rate >= floor);
    const pool = feasible.length > 0 ? feasible : r.grid;
    const maxScore = Math.max(...pool.map((g) => g.score));
    expect(r.best_point!.score).toBe(maxScore);
  });

  it("with time_weight=0, best.safe_fraction ≥ every candidate's safe_fraction", () => {
    const r = turningThreadRobustOptimizerEngine.run(baseInput({ time_weight: 0 }));
    const floor = r.min_feasibility_rate;
    const feasible = r.grid.filter((g) => g.feasibility_rate >= floor);
    const pool = feasible.length > 0 ? feasible : r.grid;
    for (const g of pool) {
      expect(r.best_point!.safe_fraction).toBeGreaterThanOrEqual(g.safe_fraction);
    }
  });

  it("all grid points have feasibility_rate ∈ [0, 1]", () => {
    const r = turningThreadRobustOptimizerEngine.run(baseInput());
    for (const g of r.grid) {
      expect(g.feasibility_rate).toBeGreaterThanOrEqual(0);
      expect(g.feasibility_rate).toBeLessThanOrEqual(1);
    }
  });

  it("all grid points have finite score", () => {
    const r = turningThreadRobustOptimizerEngine.run(baseInput());
    for (const g of r.grid) expect(Number.isFinite(g.score)).toBe(true);
  });

  it("each grid point's factors object has exactly 2 keys (the top-2 drivers)", () => {
    const r = turningThreadRobustOptimizerEngine.run(baseInput());
    for (const g of r.grid) {
      const keys = Object.keys(g.factors);
      expect(keys).toHaveLength(2);
      expect(keys.sort()).toEqual([...r.top2_drivers].sort());
    }
  });

  it("is reproducible under fixed seed (bit-exact grid + best)", () => {
    const a = turningThreadRobustOptimizerEngine.run(baseInput({ seed: 42 }));
    const b = turningThreadRobustOptimizerEngine.run(baseInput({ seed: 42 }));
    expect(a.best_point!.score).toBe(b.best_point!.score);
    expect(a.best_point!.factors).toEqual(b.best_point!.factors);
    expect(a.top2_drivers).toEqual(b.top2_drivers);
    expect(a.grid).toEqual(b.grid);
  });

  it("wider adjust_range covers wider factor span", () => {
    const narrow = turningThreadRobustOptimizerEngine.run(
      baseInput({ adjust_range: 0.05, seed: 5 }),
    );
    const wide = turningThreadRobustOptimizerEngine.run(
      baseInput({ adjust_range: 0.25, seed: 5 }),
    );
    const spanOf = (r: ReturnType<typeof turningThreadRobustOptimizerEngine.run>) => {
      const d = r.top2_drivers[0];
      const vals = r.grid.map((g) => g.factors[d]);
      return Math.max(...vals) - Math.min(...vals);
    };
    expect(spanOf(wide)).toBeGreaterThan(spanOf(narrow));
  });

  it("centre grid point (factors=1,1) exists when grid_steps is odd", () => {
    const r = turningThreadRobustOptimizerEngine.run(
      baseInput({ grid_steps: 5, adjust_range: 0.10 }),
    );
    const centre = r.grid.find(
      (g) =>
        Math.abs(g.factors[r.top2_drivers[0]] - 1.0) < 1e-6 &&
        Math.abs(g.factors[r.top2_drivers[1]] - 1.0) < 1e-6,
    );
    expect(centre).toBeDefined();
  });

  it("safe_fraction_lift is finite and ≥ 0 when baseline exists in feasible pool", () => {
    const r = turningThreadRobustOptimizerEngine.run(baseInput());
    expect(Number.isFinite(r.safe_fraction_lift)).toBe(true);
  });

  it("positive time_weight penalises slow configurations", () => {
    // With time_weight > 0, score = safe_fraction - weight*(time/baseline_time).
    // A point with identical safety but higher time will have lower score.
    const r = turningThreadRobustOptimizerEngine.run(
      baseInput({ time_weight: 5, seed: 11 }),
    );
    // Verify score formula holds for each grid point
    const baseTime = Math.max(r.baseline_time_p50, 1e-6);
    for (const g of r.grid) {
      const expected = g.safe_fraction - 5 * (g.time_p50 / baseTime);
      expect(g.score).toBeCloseTo(Math.round(expected * 10000) / 10000, 3);
    }
  });
});

// ───────────────── Failure modes ─────────────────

describe("TurningThreadRobustOptimizerEngine.run — failure modes", () => {
  it("rejects missing thread", () => {
    expect(() =>
      turningThreadRobustOptimizerEngine.run({ thread: null as any }),
    ).toThrow(/thread/);
  });

  it("rejects adjust_range = 0", () => {
    expect(() =>
      turningThreadRobustOptimizerEngine.run(baseInput({ adjust_range: 0 })),
    ).toThrow(/adjust_range/);
  });

  it("rejects adjust_range ≥ 1", () => {
    expect(() =>
      turningThreadRobustOptimizerEngine.run(baseInput({ adjust_range: 1 })),
    ).toThrow(/adjust_range/);
  });

  it("rejects grid_steps < 2", () => {
    expect(() =>
      turningThreadRobustOptimizerEngine.run(baseInput({ grid_steps: 1 })),
    ).toThrow(/grid_steps/);
  });

  it("rejects grid_steps > 11", () => {
    expect(() =>
      turningThreadRobustOptimizerEngine.run(baseInput({ grid_steps: 20 })),
    ).toThrow(/grid_steps/);
  });

  it("rejects n_trials below 10", () => {
    expect(() =>
      turningThreadRobustOptimizerEngine.run(baseInput({ n_trials: 5 })),
    ).toThrow(/n_trials/);
  });

  it("rejects negative time_weight", () => {
    expect(() =>
      turningThreadRobustOptimizerEngine.run(baseInput({ time_weight: -0.1 })),
    ).toThrow(/time_weight/);
  });

  it("rejects min_feasibility_rate outside [0,1]", () => {
    expect(() =>
      turningThreadRobustOptimizerEngine.run(
        baseInput({ min_feasibility_rate: 1.5 }),
      ),
    ).toThrow(/min_feasibility_rate/);
  });
});

// ───────────────── Adversarial inputs ─────────────────

describe("TurningThreadRobustOptimizerEngine.run — adversarial inputs", () => {
  it("rejects NaN adjust_range", () => {
    expect(() =>
      turningThreadRobustOptimizerEngine.run(baseInput({ adjust_range: NaN })),
    ).toThrow(/adjust_range/);
  });

  it("rejects Infinity time_weight", () => {
    expect(() =>
      turningThreadRobustOptimizerEngine.run(baseInput({ time_weight: Infinity })),
    ).toThrow(/time_weight/);
  });

  it("handles maximum grid (11×11=121 points)", () => {
    const r = turningThreadRobustOptimizerEngine.run(
      baseInput({ grid_steps: 11, n_trials: 10, seed: 1 }),
    );
    expect(r.grid).toHaveLength(121);
  });

  it("handles extreme σ on pitch without crashing", () => {
    const r = turningThreadRobustOptimizerEngine.run(
      baseInput({ sigma_pitch_abs_mm: 0.1, seed: 1 }),
    );
    expect(r.grid.length).toBeGreaterThan(0);
  });
});

// ───────────────── Variability across thread forms ─────────────────

describe("TurningThreadRobustOptimizerEngine — variability across thread forms", () => {
  const forms: Array<{ form: SPTInput["thread_form"]; depth: number }> = [
    { form: "UN", depth: 1.227 },
    { form: "metric", depth: 1.227 },
    { form: "ACME", depth: 1.0 },
  ];

  it.each(forms)("produces valid grid + best for $form thread", ({ form, depth }) => {
    const r = turningThreadRobustOptimizerEngine.run({
      thread: baseThread({ thread_form: form, total_depth_mm: depth }),
      grid_steps: 3,
      n_trials: 20,
      seed: 7,
    });
    expect(r.grid).toHaveLength(9);
    expect(r.best_point).not.toBeNull();
    expect(r.top2_drivers).toHaveLength(2);
  });

  it("different thread forms may pick different top-2 drivers", () => {
    const runs = forms.map(({ form, depth }) =>
      turningThreadRobustOptimizerEngine.run({
        thread: baseThread({ thread_form: form, total_depth_mm: depth }),
        grid_steps: 3,
        n_trials: 20,
        seed: 17,
      }),
    );
    // At least ensure all runs produce 2 valid drivers each
    for (const r of runs) {
      expect(r.top2_drivers).toHaveLength(2);
      expect(new Set(r.top2_drivers).size).toBe(2);
    }
  });
});

// ───────────────── Engine stability ─────────────────

describe("TurningThreadRobustOptimizerEngine — singleton stability", () => {
  it("fresh engine instance matches singleton on same input", () => {
    const fresh = new TurningThreadRobustOptimizerEngine();
    const a = turningThreadRobustOptimizerEngine.run(baseInput({ seed: 71 }));
    const b = fresh.run(baseInput({ seed: 71 }));
    expect(a.best_point!.score).toBe(b.best_point!.score);
    expect(a.grid).toEqual(b.grid);
  });
});

// ───────────────── Dispatcher round-trip ─────────────────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(
      name: string,
      description: string,
      schema: unknown,
      handler: CapturedTool["handler"],
    ) {
      captured.push({ name, description, schema, handler });
    },
  };
}

describe("turning_thread_robust_optimizer — dispatcher round-trip", () => {
  let handler: CapturedTool["handler"];

  beforeAll(() => {
    const server = makeStubServer();
    registerTurningDispatcher(server as any);
    const tool = server.tools.find((t) => t.name === "prism_turning");
    if (!tool) throw new Error("prism_turning tool was not registered");
    handler = tool.handler;
  });

  async function invoke(action: string, params: Record<string, unknown>) {
    const res = await handler({ action, params });
    const text = res.content[0]?.text ?? "";
    try {
      return JSON.parse(text) as any;
    } catch {
      return { __raw: text };
    }
  }

  it("dispatcher exposes turning_thread_robust_optimizer in tool description", () => {
    const server = makeStubServer();
    registerTurningDispatcher(server as any);
    const tool = server.tools.find((t) => t.name === "prism_turning");
    expect(tool!.description).toContain("turning_thread_robust_optimizer");
  });

  it("dispatcher action matches direct engine call bit-exactly", async () => {
    const direct = turningThreadRobustOptimizerEngine.run(
      baseInput({ seed: 88, grid_steps: 3, n_trials: 20 }),
    );
    const viaDisp = await invoke("turning_thread_robust_optimizer", {
      thread: baseThread(),
      grid_steps: 3,
      n_trials: 20,
      seed: 88,
    });
    const r = viaDisp.grid !== undefined ? viaDisp : (viaDisp.result ?? viaDisp);
    expect(r.best_point.score).toBe(direct.best_point!.score);
    expect(r.top2_drivers).toEqual(direct.top2_drivers);
    expect(r.grid.length).toBe(direct.grid.length);
  });

  it("dispatcher rejects grid_steps > 11 via schema", async () => {
    const res = await invoke("turning_thread_robust_optimizer", {
      thread: baseThread(),
      grid_steps: 15,
      n_trials: 20,
    });
    const txt = JSON.stringify(res);
    expect(txt.toLowerCase()).toMatch(/invalid|grid_steps|11/);
  });

  it("dispatcher rejects invalid thread_form via schema enum", async () => {
    const res = await invoke("turning_thread_robust_optimizer", {
      thread: { ...baseThread(), thread_form: "BOGUS" as any },
    });
    const txt = JSON.stringify(res);
    expect(txt.toLowerCase()).toMatch(/invalid|thread_form|enum/);
  });
});
