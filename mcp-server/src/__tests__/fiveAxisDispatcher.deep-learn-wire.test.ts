/**
 * fiveAxisDispatcher — five_axis_deep_learn wiring (U-5AX-DEEPLEARN-WIRE).
 *
 * Regression lock for the dark-action fix: `five_axis_deep_learn` was facade-wired
 * to nonexistent predict/analyze/run -> always "method not callable". Now it routes
 * to the real STATIC deepReason, plus the closed learning loop (recordOutcome) and
 * stats (getLearningStats). The strict schema must reject an empty part_features
 * (deepReason crashes on part_features[0]).
 *
 * No prior fiveAxisDispatcher test existed -> mock-server handler-capture harness
 * (the SUT = the real dispatcher logic; only the MCP server shim is faked to grab
 * the registered handler).
 */
import { describe, it, expect } from "vitest";
import { registerFiveAxisDispatcher } from "../tools/dispatchers/fiveAxisDispatcher.js";

/** Capture the tool handler registered via server.tool(name, desc, schema, handler). */
function makeInvoke() {
  let handler: ((arg: { action: string; params?: Record<string, unknown> }) => Promise<unknown>) | undefined;
  const server = {
    tool: (_name: string, _desc: string, _schema: unknown, h: typeof handler) => { handler = h; },
  };
  registerFiveAxisDispatcher(server);
  if (!handler) throw new Error("registerFiveAxisDispatcher did not register a handler");
  return async (action: string, params: Record<string, unknown>) => {
    const res = (await handler!({ action, params })) as { content?: Array<{ text?: string }> };
    const text = res?.content?.[0]?.text ?? "{}";
    try { return JSON.parse(text) as Record<string, unknown>; }
    catch { return { _raw: text } as Record<string, unknown>; }
  };
}

const validRequest = {
  part_features: [{
    type: "mold_cavity",
    dimensions: { length_mm: 50, width_mm: 50, depth_mm: 30, fillet_radius_mm: 2 },
    complexity_score: 6,
    undercut_count: 0,
    thin_wall_count: 0,
    tight_tolerance_count: 2,
    surface_area_mm2: 8500,
    volume_mm3: 75000,
  }],
  material: { iso_group: "H", kc11_mpa: 3200 },
  machine: {
    machine_id: "VMC-02-okuma",
    kinematic_type: "table_table",
    primary_axis: "A",
    secondary_axis: "C",
    rtcp_enabled: true,
  },
  constraints: { batch_size: 10, operator_skill: 3 },
  require_explanation: true,
};

describe("fiveAxisDispatcher five_axis_deep_learn — dark-action fix (real deepReason)", () => {
  it("returns a REAL deepReason result (confidence in [0.7,0.95], named strategy, populated reasoning chain)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_deep_learn", validRequest);
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(r.confidence as number).toBeGreaterThanOrEqual(0.7);
    expect(r.confidence as number).toBeLessThanOrEqual(0.95);
    const strat = r.recommended_strategy as { name?: string };
    expect((strat.name as string).length).toBeGreaterThan(0);
    const chain = r.reasoning_chain as unknown[];
    expect(chain.length).toBeGreaterThan(0);
    // recommended_params must be finite -- guards the kc11_mpa div-by-NaN class on
    // the template-scaling path (getMaterialScale denominator).
    const params = r.recommended_params as { spindle_rpm: number; feed_mmmin: number; ap_mm: number };
    expect(Number.isFinite(params.spindle_rpm)).toBe(true);
    expect(Number.isFinite(params.feed_mmmin)).toBe(true);
    expect(Number.isFinite(params.ap_mm)).toBe(true);
  });

  it("crash-guard: missing material.kc11_mpa is rejected (prevents NaN cutting params)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_deep_learn", { ...validRequest, material: { iso_group: "H" } });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });

  it("H-group material drives the hardened-steel risk warning (real engine branch, not a stub)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_deep_learn", validRequest);
    const warnings = (r.risk_warnings as string[]) ?? [];
    expect(warnings.join(" ")).toMatch(/tool life|chipping/i);
  });

  it("crash-guard: empty part_features is rejected by the schema (not crashed in the engine)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_deep_learn", { ...validRequest, part_features: [] });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });

  it("crash-guard: missing material.iso_group is rejected", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_deep_learn", { ...validRequest, material: {} });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });

  it("rejects operator_skill out of the 1-5 range", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_deep_learn", { ...validRequest, constraints: { batch_size: 1, operator_skill: 9 } });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });

  it("crash-guard: missing machine is rejected (generateChainOfThought reads machine.machine_id)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_deep_learn", { ...validRequest, machine: undefined });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });
});

describe("fiveAxisDispatcher five_axis_deep_learn_feedback/_stats — closed learning loop", () => {
  const outcome = {
    template_id: "tpl_5x_die_cavity_d2",
    prediction_id: "pred_wire_test_1",
    predicted: { cycle_time_min: 30, surface_ra_um: 0.8, tool_life_pct: 80 },
    actual: { cycle_time_min: 33, surface_ra_um: 0.9, tool_life_pct: 75 },
    success: true,
  };

  it("stats action returns numeric learning-stats with a probability success_rate in [0,1]", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_deep_learn_stats", {});
    expect(r.total_outcomes as number).toBeGreaterThanOrEqual(0);
    expect(r.success_rate as number).toBeGreaterThanOrEqual(0);
    expect(r.success_rate as number).toBeLessThanOrEqual(1);
    expect(r.templates_with_outcomes as number).toBeGreaterThanOrEqual(0);
  });

  it("feedback records an outcome; refreshed stats increment total_outcomes and reflect the 10% cycle-time error", async () => {
    const invoke = makeInvoke();
    const before = (await invoke("five_axis_deep_learn_stats", {})).total_outcomes as number;
    const fb = await invoke("five_axis_deep_learn_feedback", outcome);
    expect(fb.recorded).toBe(true);
    const stats = fb.stats as Record<string, unknown>;
    expect(stats.total_outcomes as number).toBe(before + 1);
    // actual 33 vs predicted 30 -> a 10% cycle-time error must pull the aggregate above 0
    expect(stats.avg_cycle_time_error_pct as number).toBeGreaterThan(0);
    const after = (await invoke("five_axis_deep_learn_stats", {})).total_outcomes as number;
    expect(after).toBe(before + 1);
  });

  it("feedback rejects a non-positive predicted cycle_time_min (guards getLearningStats div-by-zero)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_deep_learn_feedback", {
      ...outcome,
      predicted: { cycle_time_min: 0, surface_ra_um: 0.8, tool_life_pct: 80 },
    });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });

  it("feedback rejects missing required ids", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_deep_learn_feedback", { success: true });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });
});
