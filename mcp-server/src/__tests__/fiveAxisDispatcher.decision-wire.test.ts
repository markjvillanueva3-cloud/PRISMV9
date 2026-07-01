/**
 * fiveAxisDispatcher — five_axis_decision wiring (U-5AX-DECISION-WIRE).
 *
 * Regression lock for the 2nd dark-action fix: `five_axis_decision` was facade-wired
 * to decide/analyze/run on the INSTANCE, but `decide` is STATIC -> always returned
 * "method not callable". Now routes to the real `FiveAxisDecisionEngine.decide`, with
 * a strict schema guarding the parents (part_features, machine.axis_limits, tool) that
 * decide + its sub-methods dereference.
 *
 * Mock-server handler-capture harness; real OKUMA_M460V_5AX machine fixture.
 */
import { describe, it, expect } from "vitest";
import { registerFiveAxisDispatcher } from "../tools/dispatchers/fiveAxisDispatcher.js";
import { OKUMA_M460V_5AX } from "../engines/FiveAxisDecisionEngine.js";

function makeInvoke() {
  let handler: ((arg: { action: string; params?: Record<string, unknown> }) => Promise<unknown>) | undefined;
  const server = {
    tool: (_n: string, _d: string, _s: unknown, h: typeof handler) => { handler = h; },
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
    feature_type: "deep_cavity",
    required_orientations: [{ i: 0, j: 0, k: 1 }],
    surface_tolerance_mm: 0.02,
    max_depth_mm: 40,
    min_tool_length_mm: 60,
    has_undercuts: false,
    has_thin_walls: false,
    accessibility_score: 0.7,
  }],
  machine: OKUMA_M460V_5AX,
  tool: { type: "ball_nose", diameter_mm: 10, flute_length_mm: 30, overall_length_mm: 80, gauge_length_mm: 70 },
  material: "D2",
  batch_size: 10,
  operator_skill: 3,
  feed_rate_mm_per_min: 1500,
  include_reasoning: true,
  use_llm_reasoning: false,
};

describe("fiveAxisDispatcher five_axis_decision — dark-action fix (real static decide)", () => {
  it("returns a REAL decision (bounded confidence, named strategy, prediction id, finite cycle time)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_decision", validRequest);
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(r.confidence as number).toBeGreaterThan(0);
    expect(r.confidence as number).toBeLessThanOrEqual(1);
    expect((r.recommended_strategy as string).length).toBeGreaterThan(0);
    expect((r.prediction_id as string).length).toBeGreaterThan(0);
    expect(Number.isFinite(r.expected_cycle_time_min as number)).toBe(true);
    expect(r.expected_cycle_time_min as number).toBeGreaterThan(0);
  });

  it("reports a boolean singularity_safe verdict and an alternatives array (real engine output)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_decision", validRequest);
    expect(typeof r.singularity_safe).toBe("boolean");
    expect(Array.isArray(r.alternatives)).toBe(true);
  });

  it("crash-guard: empty part_features is rejected (decide reads part_features[0])", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_decision", { ...validRequest, part_features: [] });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });

  it("crash-guard: machine without axis_limits is rejected (sub-methods read machine.axis_limits.*)", async () => {
    const invoke = makeInvoke();
    const noLimits = { ...OKUMA_M460V_5AX } as Record<string, unknown>;
    delete noLimits.axis_limits;
    const r = await invoke("five_axis_decision", { ...validRequest, machine: noLimits });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });

  it("crash-guard: missing tool is rejected", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_decision", { ...validRequest, tool: undefined });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });

  it("rejects operator_skill out of the 1-5 range", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_decision", { ...validRequest, operator_skill: 0 });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });

  it("rejects an empty material string", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_decision", { ...validRequest, material: "" });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });

  it("rejects a feature with empty required_orientations (guards -Infinity/NaN in reasoning)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("five_axis_decision", {
      ...validRequest,
      part_features: [{ ...validRequest.part_features[0], required_orientations: [] }],
    });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });
});
