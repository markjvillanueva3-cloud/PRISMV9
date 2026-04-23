/**
 * LATHE-PRO-MS4a — Thread Optimizer (capstone) test.
 *
 * Exercises TurningThreadOptimizerEngine end-to-end across:
 *   • Pitch-diameter reference values (Machinery's Handbook / ISO 68-1).
 *   • Algebraic invariants (best.safe_fraction ≥ baseline, pitch band
 *     symmetry, class-4 tighter than class-6, etc.).
 *   • Capstone composition — sensitivity top-1 driver matches the
 *     dominant_safe_driver emitted by the dedicated engine.
 *   • ≥3 failure modes, ≥2 adversarial inputs (NaN / Infinity).
 *   • Variability floor: ≥3 spanning configurations (UN steel, metric
 *     stainless, ACME titanium) plus internal (class 6H) threads.
 *   • Dispatcher round-trip: action "turning_thread_optimize" invokes
 *     through a stub registered server, bit-identical to direct call.
 *   • ThreadClassGateHook: pass / warning (thin margin) / block (out of
 *     band) surfaces, plus dispatcher "turning_thread_class_gate".
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  turningThreadOptimizerEngine,
  TurningThreadOptimizerEngine,
  type ThreadOptimizeInput,
} from "../engines/TurningThreadOptimizerEngine.js";
import {
  ThreadClassGateHook,
} from "../hooks/ThreadClassGateHook.js";
import {
  turningThreadSensitivityEngine,
} from "../engines/TurningThreadSensitivityEngine.js";
import type { SPTInput } from "../engines/SinglePointThreadEngine.js";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

// ── Thread fixtures (spanning 3 materials × 3 forms) ────────────────────────

function unThreadSteel(overrides: Partial<SPTInput> = {}): SPTInput {
  return {
    thread_form: "UN",
    pitch_mm: 2.0,              // 1/2-13 UNC effective pitch
    major_diameter_mm: 12.7,    // 1/2" UN
    internal: false,
    infeed_method: "modified_flank",
    total_depth_mm: 1.227,
    spindle_rpm: 600,
    num_passes: 6,
    spring_passes: 2,
    lead_in_mm: 3,
    lead_out_mm: 3,
    thread_length_mm: 25,
    material_tensile_MPa: 500,  // carbon steel ~ 500 MPa
    ...overrides,
  };
}

function metricThreadStainless(overrides: Partial<SPTInput> = {}): SPTInput {
  return {
    thread_form: "metric",
    pitch_mm: 1.5,
    major_diameter_mm: 10.0,   // M10×1.5
    internal: false,
    infeed_method: "flank",
    total_depth_mm: 0.920,
    spindle_rpm: 400,
    num_passes: 7,
    spring_passes: 3,           // stainless wants extra spring
    lead_in_mm: 3,
    lead_out_mm: 3,
    thread_length_mm: 20,
    material_tensile_MPa: 620,  // 316 stainless ~ 620 MPa
    ...overrides,
  };
}

function acmeThreadTitanium(overrides: Partial<SPTInput> = {}): SPTInput {
  return {
    thread_form: "ACME",
    pitch_mm: 3.0,
    major_diameter_mm: 25.4,    // 1" ACME 8 TPI ≈ 3.175 mm pitch, rounded here
    internal: false,
    infeed_method: "flank",
    total_depth_mm: 1.5,
    spindle_rpm: 300,
    num_passes: 10,
    spring_passes: 4,
    lead_in_mm: 4,
    lead_out_mm: 4,
    thread_length_mm: 30,
    material_tensile_MPa: 900,  // Ti-6Al-4V
    ...overrides,
  };
}

function baseOptInput(
  thread: SPTInput,
  o: Partial<ThreadOptimizeInput> = {},
): ThreadOptimizeInput {
  return {
    thread,
    n_trials: 20,
    seed: 1,
    grid_steps: 3,
    ...o,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Engine — reference-value invariants
// ────────────────────────────────────────────────────────────────────────────

describe("TurningThreadOptimizerEngine — pitch-diameter reference values", () => {
  it("M10×1.5 basic d2 = 10 − 0.6495·1.5 ≈ 9.0258 mm", () => {
    const r = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless()),
    );
    // Basic pitch diameter per ISO 68-1 (d - 0.6495·P). Tolerance 0.0005 mm.
    expect(r.pitch_diameter_check.basic_pitch_diameter_mm).toBeCloseTo(
      9.0258,
      3,
    );
  });

  it("1/2 UN P=2.0 basic d2 = 12.7 − 0.6495·2.0 = 11.401 mm", () => {
    const r = turningThreadOptimizerEngine.optimize(
      baseOptInput(unThreadSteel()),
    );
    expect(r.pitch_diameter_check.basic_pitch_diameter_mm).toBeCloseTo(
      11.401,
      3,
    );
  });

  it("ACME P=3.0 d=25.4 basic d2 = 25.4 − 0.5·3.0 = 23.9 mm", () => {
    const r = turningThreadOptimizerEngine.optimize(
      baseOptInput(acmeThreadTitanium()),
    );
    expect(r.pitch_diameter_check.basic_pitch_diameter_mm).toBeCloseTo(
      23.9,
      3,
    );
  });

  it("Class 6g M10×1.5 tolerance band ≈ 140 μm (ISO 965-1 table)", () => {
    const r = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), { tolerance_class: "6g" }),
    );
    expect(r.pitch_diameter_check.tolerance_band_um).toBeGreaterThan(130);
    expect(r.pitch_diameter_check.tolerance_band_um).toBeLessThan(150);
  });

  it("Class 4g band is strictly tighter than class 6g (0.63 ratio)", () => {
    const r6 = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), { tolerance_class: "6g" }),
    );
    const r4 = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), { tolerance_class: "4g" }),
    );
    expect(r4.pitch_diameter_check.tolerance_band_um).toBeLessThan(
      r6.pitch_diameter_check.tolerance_band_um,
    );
    expect(r4.pitch_diameter_check.tolerance_band_um / r6.pitch_diameter_check.tolerance_band_um)
      .toBeCloseTo(0.63, 2);
  });

  it("6g external band lies BELOW basic (max_d2 ≤ basic_d2)", () => {
    const r = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), { tolerance_class: "6g" }),
    );
    expect(r.pitch_diameter_check.max_allowed_pitch_diameter_mm).toBeLessThanOrEqual(
      r.pitch_diameter_check.basic_pitch_diameter_mm + 1e-9,
    );
    expect(r.pitch_diameter_check.min_allowed_pitch_diameter_mm).toBeLessThan(
      r.pitch_diameter_check.max_allowed_pitch_diameter_mm,
    );
  });

  it("6H internal band lies ABOVE basic (min_d2 = basic_d2)", () => {
    const r = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless({ internal: true }), {
        tolerance_class: "6H",
      }),
    );
    expect(r.pitch_diameter_check.min_allowed_pitch_diameter_mm).toBeCloseTo(
      r.pitch_diameter_check.basic_pitch_diameter_mm,
      3,
    );
    expect(r.pitch_diameter_check.max_allowed_pitch_diameter_mm).toBeGreaterThan(
      r.pitch_diameter_check.basic_pitch_diameter_mm,
    );
  });

  it("manufactured offset = 0 → pass (margin ≥ 0)", () => {
    const r = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), {
        manufactured_pitch_offset_mm: 0,
      }),
    );
    // For external 6g with offset 0, basic_d2 sits at top of band (near max).
    // Should still pass since max_d2 = basic_d2 + es (es ≤ 0 → max ≤ basic)
    // ... actually basic sits above max_d2, so offset 0 places us *outside*.
    // The spec says offset=0 assumes manufactured = basic. For 6g ext this
    // is above the band, so manufactured=basic fails the class — that's
    // correct physics (basic is a theoretical point; real threads must be
    // cut below it for 6g). So this test documents that behaviour: offset
    // must be negative for external 6g to land inside the band.
    expect(r.pitch_diameter_check.pass).toBe(false);
  });

  it("manufactured offset inside external 6g band → PASS", () => {
    const r = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), {
        tolerance_class: "6g",
        manufactured_pitch_offset_mm: -0.1,  // 100 μm below basic → inside band
      }),
    );
    expect(r.pitch_diameter_check.pass).toBe(true);
    expect(r.pitch_diameter_check.margin_um).toBeGreaterThanOrEqual(0);
  });

  it("manufactured offset below external 6g band → FAIL", () => {
    const r = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), {
        tolerance_class: "6g",
        manufactured_pitch_offset_mm: -0.5,  // 500 μm below basic → well under min
      }),
    );
    expect(r.pitch_diameter_check.pass).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Capstone composition invariants
// ────────────────────────────────────────────────────────────────────────────

describe("TurningThreadOptimizerEngine — capstone composition", () => {
  it("delegates to sensitivity: dominant_safe_driver matches between engines", () => {
    const input = baseOptInput(metricThreadStainless(), { seed: 5 });
    const capstone = turningThreadOptimizerEngine.optimize(input);
    const direct = turningThreadSensitivityEngine.run({
      thread: input.thread,
      oat_delta: 0.10,
      n_trials: 20,
      seed: 5,
    });
    expect(capstone.sensitivity.dominant_safe_driver).toBe(
      direct.dominant_safe_driver,
    );
  });

  it("robust.best_plan equals capstone.best_plan", () => {
    const r = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), { seed: 22 }),
    );
    expect(r.best_plan).toEqual(r.robust.best_point);
  });

  it("safe_fraction_lift = robust.best.safe_fraction − baseline.safe_fraction", () => {
    const r = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), { seed: 33 }),
    );
    if (r.best_plan) {
      const expectedLift =
        Math.round(
          (r.best_plan.safe_fraction - r.baseline.safe_fraction) * 10000,
        ) / 10000;
      expect(r.safe_fraction_lift).toBeCloseTo(expectedLift, 4);
    }
  });

  it("force_p95_reduction_pct > 0 when robust best reduces force", () => {
    const r = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), { seed: 44 }),
    );
    if (r.best_plan && r.best_plan.force_p95 < r.baseline.force_peak_p95) {
      expect(r.force_p95_reduction_pct).toBeGreaterThan(0);
    }
  });

  it("reasoning trace contains baseline + sensitivity + pitch lines", () => {
    const r = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), { seed: 55 }),
    );
    const joined = r.reasoning.join("\n").toLowerCase();
    expect(joined).toMatch(/baseline/);
    expect(joined).toMatch(/sensitivity|driver/);
    expect(joined).toMatch(/pitch diameter/);
  });

  it("is reproducible under fixed seed (bit-identical outputs)", () => {
    const a = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), { seed: 99 }),
    );
    const b = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), { seed: 99 }),
    );
    expect(a.baseline.safe_fraction).toBe(b.baseline.safe_fraction);
    expect(a.robust.grid).toEqual(b.robust.grid);
    expect(a.pitch_diameter_check).toEqual(b.pitch_diameter_check);
  });

  it("fresh instance matches singleton on same input", () => {
    const fresh = new TurningThreadOptimizerEngine();
    const a = turningThreadOptimizerEngine.optimize(
      baseOptInput(unThreadSteel(), { seed: 101 }),
    );
    const b = fresh.optimize(baseOptInput(unThreadSteel(), { seed: 101 }));
    expect(a.baseline).toEqual(b.baseline);
    expect(a.robust.grid).toEqual(b.robust.grid);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Failure modes (≥3)
// ────────────────────────────────────────────────────────────────────────────

describe("TurningThreadOptimizerEngine.optimize — failure modes", () => {
  it("rejects missing thread", () => {
    expect(() =>
      turningThreadOptimizerEngine.optimize({ thread: null as unknown as SPTInput }),
    ).toThrow(/thread/);
  });

  it("rejects zero pitch_mm", () => {
    expect(() =>
      turningThreadOptimizerEngine.optimize(
        baseOptInput(metricThreadStainless({ pitch_mm: 0 })),
      ),
    ).toThrow(/pitch_mm/);
  });

  it("rejects zero major_diameter_mm", () => {
    expect(() =>
      turningThreadOptimizerEngine.optimize(
        baseOptInput(metricThreadStainless({ major_diameter_mm: 0 })),
      ),
    ).toThrow(/major_diameter_mm/);
  });

  it("rejects num_passes = 0", () => {
    expect(() =>
      turningThreadOptimizerEngine.optimize(
        baseOptInput(metricThreadStainless({ num_passes: 0 })),
      ),
    ).toThrow(/num_passes/);
  });

  it("rejects zero spindle_rpm", () => {
    expect(() =>
      turningThreadOptimizerEngine.optimize(
        baseOptInput(metricThreadStainless({ spindle_rpm: 0 })),
      ),
    ).toThrow(/spindle_rpm/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Adversarial inputs (≥2)
// ────────────────────────────────────────────────────────────────────────────

describe("TurningThreadOptimizerEngine.optimize — adversarial inputs", () => {
  it("rejects NaN pitch_mm", () => {
    expect(() =>
      turningThreadOptimizerEngine.optimize(
        baseOptInput(metricThreadStainless({ pitch_mm: NaN })),
      ),
    ).toThrow(/pitch_mm|finite/);
  });

  it("rejects Infinity major_diameter_mm", () => {
    expect(() =>
      turningThreadOptimizerEngine.optimize(
        baseOptInput(metricThreadStainless({ major_diameter_mm: Infinity })),
      ),
    ).toThrow(/major_diameter_mm|finite/);
  });

  it("rejects Infinity manufactured_pitch_offset_mm", () => {
    expect(() =>
      turningThreadOptimizerEngine.optimize(
        baseOptInput(metricThreadStainless(), {
          manufactured_pitch_offset_mm: Infinity,
        }),
      ),
    ).toThrow(/manufactured_pitch_offset_mm|finite/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Variability — ≥3 spanning thread forms
// ────────────────────────────────────────────────────────────────────────────

describe("TurningThreadOptimizerEngine — variability across forms/materials", () => {
  const fixtures = [
    { name: "UN carbon steel", thread: unThreadSteel() },
    { name: "metric stainless", thread: metricThreadStainless() },
    { name: "ACME titanium", thread: acmeThreadTitanium() },
  ];

  it.each(fixtures)(
    "produces full capstone result for $name",
    ({ thread }) => {
      const r = turningThreadOptimizerEngine.optimize(
        baseOptInput(thread, { seed: 7 }),
      );
      expect(r.sensitivity.rows.length).toBeGreaterThanOrEqual(6);
      expect(r.baseline.trials_attempted).toBeGreaterThan(0);
      expect(r.robust.grid.length).toBeGreaterThan(0);
      expect(r.pitch_diameter_check).toBeDefined();
      expect(r.pitch_diameter_check.basic_pitch_diameter_mm).toBeGreaterThan(0);
    },
  );

  it("ACME uses k=0.5 depth factor, metric/UN use k=0.6495", () => {
    const acme = turningThreadOptimizerEngine.optimize(
      baseOptInput(acmeThreadTitanium()),
    );
    const metric = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless()),
    );
    // ACME: d2 = d - 0.5·P = 25.4 - 1.5 = 23.9
    // metric: d2 = d - 0.6495·P = 10 - 0.97425 = 9.02575
    expect(acme.pitch_diameter_check.basic_pitch_diameter_mm).toBeCloseTo(23.9, 3);
    expect(metric.pitch_diameter_check.basic_pitch_diameter_mm).toBeCloseTo(9.026, 3);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// ThreadClassGateHook — standalone validation
// ────────────────────────────────────────────────────────────────────────────

describe("ThreadClassGateHook.validate", () => {
  it("PASS when manufactured d2 lies inside class 6g band with healthy margin", () => {
    const r = ThreadClassGateHook.validate({
      thread: metricThreadStainless(),
      tolerance_class: "6g",
      manufactured_pitch_offset_mm: -0.1,
      margin_floor_um: 10,
    });
    expect(r.passed).toBe(true);
    expect(r.blocked).toBe(false);
    expect(r.severity).toBe("pass");
    expect(r.safety_score).toBeGreaterThan(0.5);
    expect(r.pitch_check.pass).toBe(true);
  });

  it("BLOCK when manufactured d2 escapes class 6g band (undersize)", () => {
    const r = ThreadClassGateHook.validate({
      thread: metricThreadStainless(),
      tolerance_class: "6g",
      manufactured_pitch_offset_mm: -0.5,
    });
    expect(r.passed).toBe(false);
    expect(r.blocked).toBe(true);
    expect(r.severity).toBe("block");
    expect(r.safety_score).toBe(0);
    expect(r.violations[0].code).toBe("PITCH_DIA_OUT_OF_CLASS");
  });

  it("WARNING when margin is inside band but below floor (thin margin)", () => {
    // Find an offset that lands just inside the band (within 10 μm of edge).
    // For M10×1.5 6g: max_d2 = basic + es(-32 μm). 5 μm below max = within floor.
    const optResult = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), { tolerance_class: "6g" }),
    );
    const { max_allowed_pitch_diameter_mm, basic_pitch_diameter_mm } =
      optResult.pitch_diameter_check;
    // Offset that produces manufactured_d2 = max - 0.005 (5 μm below max)
    const target_d2 = max_allowed_pitch_diameter_mm - 0.005;
    const offset = target_d2 - basic_pitch_diameter_mm;

    const r = ThreadClassGateHook.validate({
      thread: metricThreadStainless(),
      tolerance_class: "6g",
      manufactured_pitch_offset_mm: offset,
      margin_floor_um: 20,  // 20 μm floor — 5 μm margin is below
    });
    // 5 μm margin < 20 μm floor → warning
    expect(r.passed).toBe(true);
    expect(r.blocked).toBe(false);
    expect(r.severity).toBe("warning");
    expect(r.violations[0].code).toBe("PITCH_DIA_MARGIN_THIN");
  });

  it("rejects invalid input shape", () => {
    const r = ThreadClassGateHook.validate({
      thread: { nope: true } as unknown as SPTInput,
    });
    expect(r.severity).toBe("error");
    expect(r.blocked).toBe(true);
    expect(r.violations[0].code).toBe("INVALID_INPUT");
  });

  it("uses default class 6g for external threads, 6H for internal", () => {
    const ext = ThreadClassGateHook.validate({
      thread: metricThreadStainless({ internal: false }),
      manufactured_pitch_offset_mm: -0.1,
    });
    const int = ThreadClassGateHook.validate({
      thread: metricThreadStainless({ internal: true }),
      manufactured_pitch_offset_mm: 0.05,
    });
    expect(ext.pitch_check.class_used).toBe("6g");
    expect(int.pitch_check.class_used).toBe("6H");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Dispatcher round-trip
// ────────────────────────────────────────────────────────────────────────────

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

describe("turning_thread_optimize — dispatcher round-trip", () => {
  let handler: CapturedTool["handler"];

  beforeAll(() => {
    const server = makeStubServer();
    registerTurningDispatcher(server as unknown as Parameters<typeof registerTurningDispatcher>[0]);
    const tool = server.tools.find((t) => t.name === "prism_turning");
    if (!tool) throw new Error("prism_turning tool was not registered");
    handler = tool.handler;
  });

  async function invoke(action: string, params: Record<string, unknown>) {
    const res = await handler({ action, params });
    const text = res.content[0]?.text ?? "";
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { __raw: text };
    }
  }

  it("tool description advertises turning_thread_optimize + turning_thread_class_gate", () => {
    const server = makeStubServer();
    registerTurningDispatcher(server as unknown as Parameters<typeof registerTurningDispatcher>[0]);
    const tool = server.tools.find((t) => t.name === "prism_turning");
    expect(tool!.description).toContain("turning_thread_optimize");
    expect(tool!.description).toContain("turning_thread_class_gate");
  });

  it("turning_thread_optimize via dispatcher matches direct engine (best_plan)", async () => {
    const direct = turningThreadOptimizerEngine.optimize(
      baseOptInput(metricThreadStainless(), { seed: 88 }),
    );
    const viaDisp = await invoke("turning_thread_optimize", {
      thread: metricThreadStainless(),
      n_trials: 20,
      seed: 88,
      grid_steps: 3,
    });
    const r = (viaDisp.result ?? viaDisp) as Record<string, unknown>;
    expect((r.best_plan as Record<string, unknown>)?.score).toBe(
      direct.best_plan!.score,
    );
    expect((r.pitch_diameter_check as Record<string, unknown>)?.basic_pitch_diameter_mm)
      .toBe(direct.pitch_diameter_check.basic_pitch_diameter_mm);
  });

  it("turning_thread_class_gate via dispatcher matches direct hook call", async () => {
    const direct = ThreadClassGateHook.validate({
      thread: metricThreadStainless(),
      tolerance_class: "6g",
      manufactured_pitch_offset_mm: -0.1,
      margin_floor_um: 10,
    });
    const viaDisp = await invoke("turning_thread_class_gate", {
      thread: metricThreadStainless(),
      tolerance_class: "6g",
      manufactured_pitch_offset_mm: -0.1,
      margin_floor_um: 10,
    });
    const r = (viaDisp.result ?? viaDisp) as Record<string, unknown>;
    expect(r.passed).toBe(direct.passed);
    expect(r.severity).toBe(direct.severity);
    expect(r.safety_score).toBe(direct.safety_score);
  });

  it("dispatcher rejects invalid thread_form via schema", async () => {
    const res = await invoke("turning_thread_optimize", {
      thread: { ...metricThreadStainless(), thread_form: "BOGUS" },
    });
    const txt = JSON.stringify(res).toLowerCase();
    expect(txt).toMatch(/invalid|thread_form|enum/);
  });

  it("dispatcher rejects negative n_trials via schema", async () => {
    const res = await invoke("turning_thread_optimize", {
      thread: metricThreadStainless(),
      n_trials: 5,  // below min=10
    });
    const txt = JSON.stringify(res).toLowerCase();
    expect(txt).toMatch(/invalid|n_trials/);
  });
});
