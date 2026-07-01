/**
 * dispatcher.turningBridgeWire.test.ts — round-trip integration coverage for
 * BRIDGE-WIRING/U-BRIDGE-WIRE-TURNING.
 *
 * Drives 6 previously-unwired Turning engines through the real `prism_turning`
 * dispatcher (each had 0 dispatcher refs before this wire):
 *   - turning_envelope_distance          → TurningEnvelopeDistanceEngine.run
 *   - turning_sensitivity_analysis       → TurningSensitivityAnalysisEngine.run
 *   - turning_stochastic_production_plan → TurningStochasticPlanEngine.run
 *   - turning_thread_optimize            → TurningThreadOptimizerEngine.optimize
 *   - turning_thread_sensitivity         → TurningThreadSensitivityEngine.run
 *   - turning_thread_stochastic_plan     → TurningThreadStochasticPlanEngine.run
 *
 * Each block asserts (a) the Zod schema gate rejects/accepts correctly, (b) the
 * dispatcher emits a { success, data } envelope, (c) a ROUTING PROOF that the
 * wire result equals an engine-direct call on a deterministic scalar (the MC
 * engines are seeded), and (d) the error envelope on invalid params.
 */

import { describe, it, expect, beforeAll } from "vitest";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";
import { turningEnvelopeDistanceEngine } from "../engines/TurningEnvelopeDistanceEngine.js";
import { turningSensitivityAnalysisEngine } from "../engines/TurningSensitivityAnalysisEngine.js";
import { turningStochasticPlanEngine } from "../engines/TurningStochasticPlanEngine.js";
import { turningThreadOptimizerEngine } from "../engines/TurningThreadOptimizerEngine.js";
import { turningThreadSensitivityEngine } from "../engines/TurningThreadSensitivityEngine.js";
import { turningThreadStochasticPlanEngine } from "../engines/TurningThreadStochasticPlanEngine.js";

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

// ── Canonical fixtures ──────────────────────────────────────────────────────

/** P-group steel roughing + finishing ops (InsertLifeInput conditions). */
const OP_ROUGH = {
  conditions: { iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.25, ap_mm: 2.0 },
  duration_min: 1.5,
  label: "OD rough",
};
const OP_FINISH = {
  conditions: { iso_group: "P", Vc_m_min: 280, f_mm_rev: 0.12, ap_mm: 0.4 },
  duration_min: 0.8,
  label: "OD finish",
};

const ENVELOPE_INPUT = {
  ops: [OP_ROUGH, OP_FINISH],
  rules_context: { material: "1045 steel", iso_group: "P", operation: "roughing" },
};

/** Small MC counts keep the cascade fast; seed pins determinism. */
const PLAN_INPUT = {
  ops: [OP_ROUGH, OP_FINISH],
  batch_size: 100,
  nominal_mm: 25,
  tolerance_mm: 0.05,
  seed: 42,
  n_trials: 30,
};
const SENS_INPUT = {
  ops: [OP_ROUGH, OP_FINISH],
  batch_size: 100,
  nominal_mm: 25,
  tolerance_mm: 0.05,
  seed: 42,
  morris_trajectories: 4,
  morris_levels: 4,
};

/** Canonical M10×1.5 metric thread (matches dispatcher.turningThreadRobustOptimizer). */
const M10X1_5 = {
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
const THREAD_OPT_INPUT = { thread: M10X1_5, n_trials: 20, seed: 42, grid_steps: 3 };
const THREAD_SENS_INPUT = { thread: M10X1_5, n_trials: 20, seed: 42 };
const THREAD_PLAN_INPUT = { thread: M10X1_5, n_trials: 20, seed: 42 };

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

// ── Wiring completeness: all 6 actions present in the schema map ────────────

describe("U-BRIDGE-WIRE-TURNING — schema-map registration", () => {
  const actions = [
    "turning_envelope_distance",
    "turning_sensitivity_analysis",
    "turning_stochastic_production_plan",
    "turning_thread_optimize",
    "turning_thread_sensitivity",
    "turning_thread_stochastic_plan",
  ];
  for (const a of actions) {
    it(`${a} is a usable Zod schema that rejects empty params`, () => {
      const schema = TURNING_ACTION_SCHEMAS[a];
      expect(typeof schema?.safeParse).toBe("function");
      // All 6 actions have required fields → empty params must fail validation.
      expect(schema.safeParse({}).success).toBe(false);
    });
  }
});

// ── turning_envelope_distance ───────────────────────────────────────────────

describe("U-BRIDGE-WIRE-TURNING — turning_envelope_distance", () => {
  const schema = TURNING_ACTION_SCHEMAS["turning_envelope_distance"];

  it("schema rejects empty params (ops required)", () => {
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("schema rejects ops without rules_context or rule_set (refine gate)", () => {
    expect(schema.safeParse({ ops: [OP_ROUGH] }).success).toBe(false);
  });

  it("schema rejects an op whose conditions miss a physics field", () => {
    expect(schema.safeParse({
      ops: [{ conditions: { iso_group: "P", Vc_m_min: 200, f_mm_rev: 0.2 }, duration_min: 1 }],
      rules_context: { material: "steel" },
    }).success).toBe(false);
  });

  it("schema accepts ops + rules_context", () => {
    expect(schema.safeParse(ENVELOPE_INPUT).success).toBe(true);
  });

  it("round-trip → success envelope with total_ops + per_op + aggregate margins", async () => {
    const r = await invokeHandler(turningHandler, "turning_envelope_distance", ENVELOPE_INPUT);
    expect(r.success).toBe(true);
    const data = r.data as {
      total_ops: number; total_rules_used: number; per_op: unknown[];
      overall_min_margin: number; all_in_envelope: boolean; source: string;
    };
    expect(data.total_ops).toBe(2);
    expect(Array.isArray(data.per_op)).toBe(true);
    expect(data.per_op.length).toBe(2);
    expect(typeof data.overall_min_margin).toBe("number");
    expect(typeof data.all_in_envelope).toBe("boolean");
    expect(data.source).toContain("TurningEnvelopeDistanceEngine");
  });

  it("ROUTING PROOF — wire overall_min_margin equals engine-direct run()", async () => {
    const r = await invokeHandler(turningHandler, "turning_envelope_distance", ENVELOPE_INPUT);
    const direct = turningEnvelopeDistanceEngine.run(ENVELOPE_INPUT as Parameters<typeof turningEnvelopeDistanceEngine.run>[0]);
    expect((r.data as { overall_min_margin: number }).overall_min_margin).toBe(direct.overall_min_margin);
    expect((r.data as { total_rules_used: number }).total_rules_used).toBe(direct.total_rules_used);
  });

  it("VARIABILITY — P / M / K material groups all return a well-formed result", async () => {
    const results = await Promise.all(["P", "M", "K"].map((g) =>
      invokeHandler(turningHandler, "turning_envelope_distance", {
        ops: [{ conditions: { iso_group: g, Vc_m_min: 180, f_mm_rev: 0.2, ap_mm: 1.5 }, duration_min: 1 }],
        rules_context: { material: "test", iso_group: g },
      }),
    ));
    for (const r of results) {
      expect(r.success).toBe(true);
      expect((r.data as { total_ops: number }).total_ops).toBe(1);
    }
  });

  it("error envelope — engine throw on malformed rule_set is caught (no success)", async () => {
    const r = await invokeHandler(turningHandler, "turning_envelope_distance", {
      ops: [OP_ROUGH],
      rule_set: { rules: "not-an-array" },
    });
    expect(r.success).not.toBe(true);
  });

  it("error envelope — empty ops array rejected at the boundary", async () => {
    const r = await invokeHandler(turningHandler, "turning_envelope_distance", {
      ops: [],
      rules_context: { material: "steel" },
    });
    expect(r.success).not.toBe(true);
  });
});

// ── turning_sensitivity_analysis ────────────────────────────────────────────

describe("U-BRIDGE-WIRE-TURNING — turning_sensitivity_analysis", () => {
  const schema = TURNING_ACTION_SCHEMAS["turning_sensitivity_analysis"];

  it("schema rejects missing batch_size / nominal_mm / tolerance_mm", () => {
    expect(schema.safeParse({ ops: [OP_ROUGH] }).success).toBe(false);
  });

  it("schema rejects a non-integer batch_size", () => {
    expect(schema.safeParse({
      ops: [OP_ROUGH], batch_size: 10.5, nominal_mm: 25, tolerance_mm: 0.05,
    }).success).toBe(false);
  });

  it("schema rejects a negative tolerance_mm", () => {
    expect(schema.safeParse({
      ops: [OP_ROUGH], batch_size: 10, nominal_mm: 25, tolerance_mm: -0.01,
    }).success).toBe(false);
  });

  it("schema accepts a valid sensitivity payload", () => {
    expect(schema.safeParse(SENS_INPUT).success).toBe(true);
  });

  it("round-trip → success envelope; engine result shape arrives intact", async () => {
    const r = await invokeHandler(turningHandler, "turning_sensitivity_analysis", SENS_INPUT);
    expect(r.success).toBe(true);
    const data = r.data as { cpk_baseline?: number | null; error?: string; source?: string };
    // The engine returns either a full result (source set) or its documented
    // infeasible-baseline error. slimResponse drops cpk_baseline when it is
    // null, so the discriminator that always survives is source-or-error.
    expect(typeof (data.source ?? data.error)).toBe("string");
  });

  it("ROUTING PROOF — wire result matches the seeded engine-direct run()", async () => {
    const r = await invokeHandler(turningHandler, "turning_sensitivity_analysis", SENS_INPUT);
    const direct = turningSensitivityAnalysisEngine.run(SENS_INPUT as Parameters<typeof turningSensitivityAnalysisEngine.run>[0]);
    const data = r.data as { error?: string; cpk_baseline?: number | null };
    // Compare whichever discriminator the engine produced — proves the wire
    // routed to the same deterministic engine regardless of feasibility.
    if (direct.error !== undefined) {
      expect(data.error).toBe(direct.error);
    } else {
      expect(data.cpk_baseline).toBe(direct.cpk_baseline);
    }
  });

  it("KNOWN ENGINE BUG — cascade degraded: TurningInsertLifeEngine has no insertChangeSchedule/wearAccumulation, so the MS1+MS2 baseline is always infeasible (see ## Recent regressions / follow-up U-FIX-TURNING-CASCADE-API)", async () => {
    // The WIRE is correct — this pins the CURRENT degraded engine output so a
    // future cascade fix fails this test loudly and forces a doc/test update.
    const r = await invokeHandler(turningHandler, "turning_sensitivity_analysis", SENS_INPUT);
    expect((r.data as { error?: string }).error).toContain("infeasible");
  });

  it("error envelope — empty ops array rejected", async () => {
    const r = await invokeHandler(turningHandler, "turning_sensitivity_analysis", {
      ops: [], batch_size: 100, nominal_mm: 25, tolerance_mm: 0.05,
    });
    expect(r.success).not.toBe(true);
  });
});

// ── turning_stochastic_production_plan ──────────────────────────────────────

describe("U-BRIDGE-WIRE-TURNING — turning_stochastic_production_plan", () => {
  const schema = TURNING_ACTION_SCHEMAS["turning_stochastic_production_plan"];

  it("schema rejects missing required production fields", () => {
    expect(schema.safeParse({ ops: [OP_ROUGH] }).success).toBe(false);
  });

  it("schema accepts a valid stochastic-plan payload", () => {
    expect(schema.safeParse(PLAN_INPUT).success).toBe(true);
  });

  it("round-trip → success envelope; trials_attempted honours n_trials", async () => {
    const r = await invokeHandler(turningHandler, "turning_stochastic_production_plan", PLAN_INPUT);
    expect(r.success).toBe(true);
    const data = r.data as {
      trials_attempted: number; trials_feasible: number;
      cpk_p50: number; source: string;
    };
    expect(data.trials_attempted).toBe(30);
    expect(data.trials_feasible).toBeGreaterThanOrEqual(0);
    expect(data.trials_feasible).toBeLessThanOrEqual(30);
    expect(typeof data.cpk_p50).toBe("number");
    expect(data.source).toContain("TurningStochasticPlanEngine");
  });

  it("ROUTING PROOF — wire cpk_p50 + trials_feasible equal seeded engine-direct run()", async () => {
    const r = await invokeHandler(turningHandler, "turning_stochastic_production_plan", PLAN_INPUT);
    const direct = turningStochasticPlanEngine.run(PLAN_INPUT as Parameters<typeof turningStochasticPlanEngine.run>[0]);
    expect((r.data as { cpk_p50: number }).cpk_p50).toBe(direct.cpk_p50);
    expect((r.data as { trials_feasible: number }).trials_feasible).toBe(direct.trials_feasible);
  });

  it("DETERMINISM — two seeded invocations return identical cpk_p50", async () => {
    const r1 = await invokeHandler(turningHandler, "turning_stochastic_production_plan", PLAN_INPUT);
    const r2 = await invokeHandler(turningHandler, "turning_stochastic_production_plan", PLAN_INPUT);
    expect((r1.data as { cpk_p50: number }).cpk_p50).toBe((r2.data as { cpk_p50: number }).cpk_p50);
  });

  it("KNOWN ENGINE BUG — cascade degraded: trials_feasible is 0 because the MS1+MS2 cascade calls non-existent TurningInsertLifeEngine methods (see ## Recent regressions / follow-up U-FIX-TURNING-CASCADE-API)", async () => {
    // The WIRE is correct — this pins the CURRENT degraded engine output so a
    // future cascade fix fails this test loudly and forces a doc/test update.
    const r = await invokeHandler(turningHandler, "turning_stochastic_production_plan", PLAN_INPUT);
    expect((r.data as { trials_feasible: number }).trials_feasible).toBe(0);
  });

  it("error envelope — missing batch_size rejected", async () => {
    const r = await invokeHandler(turningHandler, "turning_stochastic_production_plan", {
      ops: [OP_ROUGH], nominal_mm: 25, tolerance_mm: 0.05,
    });
    expect(r.success).not.toBe(true);
  });
});

// ── turning_thread_optimize ─────────────────────────────────────────────────

describe("U-BRIDGE-WIRE-TURNING — turning_thread_optimize", () => {
  const schema = TURNING_ACTION_SCHEMAS["turning_thread_optimize"];

  it("schema rejects empty params / partial thread spec", () => {
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ thread: {} }).success).toBe(false);
  });

  it("schema rejects a bad thread_form enum", () => {
    expect(schema.safeParse({ thread: { ...M10X1_5, thread_form: "INVALID" } }).success).toBe(false);
  });

  it("schema rejects an out-of-range tolerance_class", () => {
    expect(schema.safeParse({ thread: M10X1_5, tolerance_class: "9z" }).success).toBe(false);
  });

  it("schema accepts a full thread spec", () => {
    expect(schema.safeParse(THREAD_OPT_INPUT).success).toBe(true);
  });

  it("round-trip → success envelope with pitch_diameter_check + reasoning", async () => {
    const r = await invokeHandler(turningHandler, "turning_thread_optimize", THREAD_OPT_INPUT);
    expect(r.success).toBe(true);
    const data = r.data as {
      pitch_diameter_check: { basic_pitch_diameter_mm: number; pass: boolean; class_used: string };
      reasoning: string[]; source: string;
    };
    expect(typeof data.pitch_diameter_check.basic_pitch_diameter_mm).toBe("number");
    expect(typeof data.pitch_diameter_check.pass).toBe("boolean");
    expect(data.pitch_diameter_check.class_used).toBe("6g"); // external metric default
    expect(Array.isArray(data.reasoning)).toBe(true);
    expect(data.source).toContain("TurningThreadOptimizerEngine");
  });

  it("ROUTING PROOF — wire basic_pitch_diameter_mm equals engine-direct optimize()", async () => {
    const r = await invokeHandler(turningHandler, "turning_thread_optimize", THREAD_OPT_INPUT);
    const direct = turningThreadOptimizerEngine.optimize(THREAD_OPT_INPUT as Parameters<typeof turningThreadOptimizerEngine.optimize>[0]);
    expect((r.data as { pitch_diameter_check: { basic_pitch_diameter_mm: number } }).pitch_diameter_check.basic_pitch_diameter_mm)
      .toBe(direct.pitch_diameter_check.basic_pitch_diameter_mm);
  });

  it("tolerance_class override changes the pitch-diameter check class_used", async () => {
    const r = await invokeHandler(turningHandler, "turning_thread_optimize", {
      ...THREAD_OPT_INPUT, tolerance_class: "4g",
    });
    expect((r.data as { pitch_diameter_check: { class_used: string } }).pitch_diameter_check.class_used).toBe("4g");
  });

  it("error envelope — bad thread spec rejected at the boundary", async () => {
    const r = await invokeHandler(turningHandler, "turning_thread_optimize", { thread: { pitch_mm: 1.5 } });
    expect(r.success).not.toBe(true);
  });
});

// ── turning_thread_sensitivity ──────────────────────────────────────────────

describe("U-BRIDGE-WIRE-TURNING — turning_thread_sensitivity", () => {
  const schema = TURNING_ACTION_SCHEMAS["turning_thread_sensitivity"];

  it("schema rejects empty params", () => {
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("schema rejects num_passes below 1", () => {
    expect(schema.safeParse({ thread: { ...M10X1_5, num_passes: 0 } }).success).toBe(false);
  });

  it("schema accepts a valid thread spec", () => {
    expect(schema.safeParse(THREAD_SENS_INPUT).success).toBe(true);
  });

  it("round-trip → success envelope with ranked rows + dominant drivers", async () => {
    const r = await invokeHandler(turningHandler, "turning_thread_sensitivity", THREAD_SENS_INPUT);
    expect(r.success).toBe(true);
    const data = r.data as {
      rows: Array<{ parameter: string; rank: number }>;
      baseline_safe_fraction: number; dominant_safe_driver: string | null; source: string;
    };
    expect(Array.isArray(data.rows)).toBe(true);
    expect(data.rows.length).toBe(6); // 6 SENS_PARAMS
    expect(data.rows[0]!.rank).toBe(1);
    expect(data.baseline_safe_fraction).toBeGreaterThanOrEqual(0);
    expect(data.baseline_safe_fraction).toBeLessThanOrEqual(1);
    expect(data.source).toContain("TurningThreadSensitivityEngine");
  });

  it("ROUTING PROOF — wire baseline_safe_fraction equals seeded engine-direct run()", async () => {
    const r = await invokeHandler(turningHandler, "turning_thread_sensitivity", THREAD_SENS_INPUT);
    const direct = turningThreadSensitivityEngine.run(THREAD_SENS_INPUT as Parameters<typeof turningThreadSensitivityEngine.run>[0]);
    expect((r.data as { baseline_safe_fraction: number }).baseline_safe_fraction).toBe(direct.baseline_safe_fraction);
  });

  it("VARIABILITY — metric / UN / ACME thread forms all return ranked rows", async () => {
    const specs = [
      { ...M10X1_5, thread_form: "metric" as const },
      { ...M10X1_5, thread_form: "UN" as const, pitch_mm: 1.27, major_diameter_mm: 12 },
      { ...M10X1_5, thread_form: "ACME" as const, pitch_mm: 2.0, major_diameter_mm: 20, total_depth_mm: 1.5 },
    ];
    const results = await Promise.all(specs.map((thread) =>
      invokeHandler(turningHandler, "turning_thread_sensitivity", { thread, n_trials: 20, seed: 42 }),
    ));
    for (const r of results) {
      expect(r.success).toBe(true);
      expect((r.data as { rows: unknown[] }).rows.length).toBe(6);
    }
  });

  it("error envelope — missing thread rejected", async () => {
    const r = await invokeHandler(turningHandler, "turning_thread_sensitivity", {});
    expect(r.success).not.toBe(true);
  });
});

// ── turning_thread_stochastic_plan ──────────────────────────────────────────

describe("U-BRIDGE-WIRE-TURNING — turning_thread_stochastic_plan", () => {
  const schema = TURNING_ACTION_SCHEMAS["turning_thread_stochastic_plan"];

  it("schema rejects empty params", () => {
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("schema rejects pitch_mm above the 50 mm cap", () => {
    expect(schema.safeParse({ thread: { ...M10X1_5, pitch_mm: 51 } }).success).toBe(false);
  });

  it("schema accepts a valid thread spec", () => {
    expect(schema.safeParse(THREAD_PLAN_INPUT).success).toBe(true);
  });

  it("round-trip → success envelope; safe_fraction ∈ [0,1] + quantile shape", async () => {
    const r = await invokeHandler(turningHandler, "turning_thread_stochastic_plan", THREAD_PLAN_INPUT);
    expect(r.success).toBe(true);
    const data = r.data as {
      trials_attempted: number; trials_feasible: number;
      safe_fraction: number; force_peak_p95: number; source: string;
    };
    expect(data.trials_attempted).toBe(20);
    expect(data.safe_fraction).toBeGreaterThanOrEqual(0);
    expect(data.safe_fraction).toBeLessThanOrEqual(1);
    expect(data.force_peak_p95).toBeGreaterThanOrEqual(0);
    expect(data.source).toContain("TurningThreadStochasticPlanEngine");
  });

  it("ROUTING PROOF — wire safe_fraction + force_peak_p95 equal seeded engine-direct run()", async () => {
    const r = await invokeHandler(turningHandler, "turning_thread_stochastic_plan", THREAD_PLAN_INPUT);
    const direct = turningThreadStochasticPlanEngine.run(THREAD_PLAN_INPUT as Parameters<typeof turningThreadStochasticPlanEngine.run>[0]);
    expect((r.data as { safe_fraction: number }).safe_fraction).toBe(direct.safe_fraction);
    expect((r.data as { force_peak_p95: number }).force_peak_p95).toBe(direct.force_peak_p95);
  });

  it("error envelope — n_trials below the engine [10,5000] floor is caught", async () => {
    const r = await invokeHandler(turningHandler, "turning_thread_stochastic_plan", {
      thread: M10X1_5, n_trials: 5,
    });
    expect(r.success).not.toBe(true);
  });
});
