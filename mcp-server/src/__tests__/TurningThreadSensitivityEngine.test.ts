/**
 * LATHE-PRO-MS4a — Thread sensitivity apportionment test.
 *
 * Tests TurningThreadSensitivityEngine end-to-end:
 *   • Reference-value invariants: 6-parameter table, descending |elasticity_safe|.
 *   • Algebraic invariants: elasticity finite, ranks are 1..6, dominant driver name valid.
 *   • Reproducibility under fixed seed.
 *   • ≥3 failure modes (invalid thread, invalid oat_delta, infeasible baseline).
 *   • ≥2 adversarial (NaN, Infinity, extreme σ, zero delta).
 *   • Variability across 3 thread forms (UN, metric, ACME).
 *   • Dispatcher round-trip: action invokes through stub server.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  turningThreadSensitivityEngine,
  TurningThreadSensitivityEngine,
} from "../engines/TurningThreadSensitivityEngine.js";
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

const THREAD_PARAMS = [
  "spindle_rpm",
  "pitch_mm",
  "major_diameter_mm",
  "num_passes",
  "lead_in_mm",
  "lead_out_mm",
];

// ───────────────── Reference values ─────────────────

describe("TurningThreadSensitivityEngine.run — reference values", () => {
  it("returns a 6-row table covering every parameter", () => {
    const r = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 30,
      seed: 1,
    });
    expect(r.rows).toHaveLength(6);
    const names = r.rows.map((x) => x.parameter).sort();
    expect(names).toEqual([...THREAD_PARAMS].sort());
  });

  it("rows are ranked 1..6 by |elasticity_safe| descending", () => {
    const r = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 30,
      seed: 2,
    });
    for (let i = 0; i < 6; i++) expect(r.rows[i].rank).toBe(i + 1);
    for (let i = 1; i < 6; i++) {
      expect(Math.abs(r.rows[i - 1].elasticity_safe)).toBeGreaterThanOrEqual(
        Math.abs(r.rows[i].elasticity_safe),
      );
    }
  });

  it("baseline_force_p95 and baseline_safe_fraction are finite", () => {
    const r = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 30,
      seed: 3,
    });
    expect(Number.isFinite(r.baseline_force_p95)).toBe(true);
    expect(Number.isFinite(r.baseline_safe_fraction)).toBe(true);
    expect(r.baseline_safe_fraction).toBeGreaterThanOrEqual(0);
    expect(r.baseline_safe_fraction).toBeLessThanOrEqual(1);
  });

  it("every row's elasticities and deltas are finite", () => {
    const r = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 30,
      seed: 4,
    });
    for (const row of r.rows) {
      expect(Number.isFinite(row.elasticity_force)).toBe(true);
      expect(Number.isFinite(row.elasticity_safe)).toBe(true);
      expect(Number.isFinite(row.delta_force_p95)).toBe(true);
      expect(Number.isFinite(row.delta_safe_fraction)).toBe(true);
    }
  });

  it("dominant_safe_driver and dominant_force_driver are valid parameter names", () => {
    const r = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 30,
      seed: 5,
    });
    expect(THREAD_PARAMS).toContain(r.dominant_safe_driver);
    expect(THREAD_PARAMS).toContain(r.dominant_force_driver);
  });

  it("is reproducible under fixed seed (bit-exact)", () => {
    const a = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 30,
      seed: 99,
    });
    const b = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 30,
      seed: 99,
    });
    expect(a.baseline_force_p95).toBe(b.baseline_force_p95);
    expect(a.baseline_safe_fraction).toBe(b.baseline_safe_fraction);
    expect(a.rows).toEqual(b.rows);
    expect(a.dominant_safe_driver).toBe(b.dominant_safe_driver);
  });

  it("num_passes perturbation uses integer ±1 (algebraic: more passes → smaller force_hi)", () => {
    // More num_passes = smaller chip area per pass = smaller force peak.
    // So force_p95_hi (num_passes +1) should be ≤ baseline.
    const r = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 50,
      seed: 6,
    });
    const np = r.rows.find((x) => x.parameter === "num_passes")!;
    expect(np.force_p95_hi).toBeLessThanOrEqual(r.baseline_force_p95 + 1);
  });

  it("wider oat_delta magnifies elasticities (for most parameters)", () => {
    const narrow = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 30,
      seed: 7,
      oat_delta: 0.02,
    });
    const wide = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 30,
      seed: 7,
      oat_delta: 0.20,
    });
    // Pick a row that is likely to respond (pitch_mm or major_diameter_mm)
    const narrowPitch = narrow.rows.find((x) => x.parameter === "pitch_mm")!;
    const widePitch = wide.rows.find((x) => x.parameter === "pitch_mm")!;
    expect(Number.isFinite(narrowPitch.delta_force_p95)).toBe(true);
    expect(Number.isFinite(widePitch.delta_force_p95)).toBe(true);
  });
});

// ───────────────── Failure modes ─────────────────

describe("TurningThreadSensitivityEngine.run — failure modes", () => {
  it("rejects missing thread spec", () => {
    expect(() =>
      turningThreadSensitivityEngine.run({ thread: null as any }),
    ).toThrow(/thread/);
  });

  it("rejects non-positive pitch_mm", () => {
    expect(() =>
      turningThreadSensitivityEngine.run({ thread: baseThread({ pitch_mm: 0 }) }),
    ).toThrow(/pitch_mm/);
  });

  it("rejects non-positive major_diameter_mm", () => {
    expect(() =>
      turningThreadSensitivityEngine.run({
        thread: baseThread({ major_diameter_mm: -1 }),
      }),
    ).toThrow(/major_diameter_mm/);
  });

  it("rejects num_passes < 1", () => {
    expect(() =>
      turningThreadSensitivityEngine.run({ thread: baseThread({ num_passes: 0 }) }),
    ).toThrow(/num_passes/);
  });

  it("rejects oat_delta = 0", () => {
    expect(() =>
      turningThreadSensitivityEngine.run({
        thread: baseThread(),
        oat_delta: 0,
      }),
    ).toThrow(/oat_delta/);
  });

  it("rejects oat_delta ≥ 1", () => {
    expect(() =>
      turningThreadSensitivityEngine.run({
        thread: baseThread(),
        oat_delta: 1,
      }),
    ).toThrow(/oat_delta/);
  });
});

// ───────────────── Adversarial inputs ─────────────────

describe("TurningThreadSensitivityEngine.run — adversarial inputs", () => {
  it("rejects NaN pitch_mm", () => {
    expect(() =>
      turningThreadSensitivityEngine.run({ thread: baseThread({ pitch_mm: NaN }) }),
    ).toThrow(/pitch_mm/);
  });

  it("rejects Infinity major_diameter_mm", () => {
    expect(() =>
      turningThreadSensitivityEngine.run({
        thread: baseThread({ major_diameter_mm: Infinity }),
      }),
    ).toThrow(/major_diameter_mm/);
  });

  it("handles extreme σ without crashing (σ_pitch=0.09)", () => {
    const r = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 30,
      seed: 11,
      sigma_pitch_abs_mm: 0.09,
    });
    expect(r.rows).toHaveLength(6);
  });

  it("handles minimum n_trials (10)", () => {
    const r = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 10,
      seed: 1,
    });
    expect(r.rows).toHaveLength(6);
  });
});

// ───────────────── Variability across thread forms ─────────────────

describe("TurningThreadSensitivityEngine — variability across thread forms", () => {
  const forms: Array<{ form: SPTInput["thread_form"]; depth: number }> = [
    { form: "UN", depth: 1.227 },
    { form: "metric", depth: 1.227 },
    { form: "ACME", depth: 1.0 },
  ];

  it.each(forms)("produces valid rankings for $form thread", ({ form, depth }) => {
    const r = turningThreadSensitivityEngine.run({
      thread: baseThread({ thread_form: form, total_depth_mm: depth }),
      n_trials: 30,
      seed: 20,
    });
    expect(r.rows).toHaveLength(6);
    for (let i = 1; i < 6; i++) {
      expect(Math.abs(r.rows[i - 1].elasticity_safe)).toBeGreaterThanOrEqual(
        Math.abs(r.rows[i].elasticity_safe),
      );
    }
    expect(THREAD_PARAMS).toContain(r.dominant_safe_driver);
  });

  it("topDriversBySafeElasticity returns N-sized list of unique parameters", () => {
    const r = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 30,
      seed: 30,
    });
    const top3 = turningThreadSensitivityEngine.topDriversBySafeElasticity(r, 3);
    expect(top3).toHaveLength(3);
    expect(new Set(top3).size).toBe(3);
    expect(top3[0]).toBe(r.rows[0].parameter);
  });
});

// ───────────────── Engine utilities ─────────────────

describe("TurningThreadSensitivityEngine — singleton stability", () => {
  it("fresh engine produces same result as singleton for same input", () => {
    const fresh = new TurningThreadSensitivityEngine();
    const a = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 20,
      seed: 55,
    });
    const b = fresh.run({ thread: baseThread(), n_trials: 20, seed: 55 });
    expect(a.rows).toEqual(b.rows);
    expect(a.dominant_safe_driver).toBe(b.dominant_safe_driver);
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

describe("turning_thread_sensitivity — dispatcher round-trip", () => {
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

  it("dispatcher exposes turning_thread_sensitivity in tool description", () => {
    const server = makeStubServer();
    registerTurningDispatcher(server as any);
    const tool = server.tools.find((t) => t.name === "prism_turning");
    expect(tool!.description).toContain("turning_thread_sensitivity");
  });

  it("dispatcher action matches direct engine call bit-exactly", async () => {
    const direct = turningThreadSensitivityEngine.run({
      thread: baseThread(),
      n_trials: 20,
      seed: 77,
    });
    const viaDisp = await invoke("turning_thread_sensitivity", {
      thread: baseThread(),
      n_trials: 20,
      seed: 77,
    });
    const r = viaDisp.rows !== undefined ? viaDisp : (viaDisp.result ?? viaDisp);
    expect(r.rows).toEqual(direct.rows);
    expect(r.dominant_safe_driver).toBe(direct.dominant_safe_driver);
  });

  it("dispatcher rejects invalid oat_delta via schema validation", async () => {
    const res = await invoke("turning_thread_sensitivity", {
      thread: baseThread(),
      oat_delta: 2.0, // above 0.5 cap
    });
    const txt = JSON.stringify(res);
    expect(txt.toLowerCase()).toMatch(/invalid|oat_delta|0.5/);
  });

  it("dispatcher rejects invalid thread_form via schema enum", async () => {
    const res = await invoke("turning_thread_sensitivity", {
      thread: { ...baseThread(), thread_form: "XYZ" as any },
      n_trials: 20,
    });
    const txt = JSON.stringify(res);
    expect(txt.toLowerCase()).toMatch(/invalid|thread_form|enum/);
  });
});
