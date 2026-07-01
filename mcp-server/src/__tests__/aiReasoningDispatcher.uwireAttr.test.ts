/**
 * aiReasoningDispatcher U-WIRE-ATTR round-trip tests — AttractorDetectionEngine.
 *
 * Validates the 13 new actions (attr_observe / attr_observe_batch /
 * attr_detect_fixed_points / attr_detect_limit_cycles / attr_analyze /
 * attr_lyapunov / attr_stability_metrics / attr_recurrence_plot /
 * attr_get_attractors / attr_trajectory_length / attr_current_state /
 * attr_has_converged / attr_get_config) wire through prism_ai and that the
 * dynamical-systems analysis behaves per contract: observe a trajectory, then
 * detect fixed points / limit cycles / Lyapunov / stability / recurrence.
 *
 * Pattern: LIVE dispatcher round-trip. prism_ai wraps results as
 * JSON.stringify({success, data: slimResponse(result)}); engine payload nests
 * under `.data`, and slimResponse strips null/undefined/empty-arrays but KEEPS
 * false/0 (so assert empty fixed_points / null state via ?? []/?? null, but a
 * `converged:false` survives directly). Engine is a module singleton with a
 * clear() reset surface (called in beforeEach). Fully deterministic (no
 * Math.random) -- numeric outputs are asserted by structure/contract. The
 * engine's detectBifurcations is intentionally un-wired (closure input).
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA autonomous loop iteration 6.
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-ATTR
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerAIReasoningDispatcher } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { attractorDetectionEngine } from "../engines/AttractorDetectionEngine.js";

interface CapturedTool {
  name: string; description: string; schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}
async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as { content: { type: string; text: string }[] };
  const text = raw.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && "success" in parsed) {
    if ((parsed as { success: boolean }).success === false) return { ok: false, data: parsed };
    return { ok: true, data: ((parsed as { data?: Record<string, unknown> }).data ?? {}) };
  }
  return { ok: false, data: parsed };
}
function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerAIReasoningDispatcher(s as unknown as { tool: Function });
  return s;
}
// A constant trajectory of n identical states (deterministic timestamps) -> converges.
function constStates(n: number, values: number[] = [1, 2, 3]) {
  return Array.from({ length: n }, (_, i) => ({ values: [...values], timestamp: 1000 + i }));
}

describe("U-WIRE-ATTR — AttractorDetectionEngine via prism_ai", () => {
  beforeEach(() => { attractorDetectionEngine.clear(); });

  it("registers exactly one prism_ai tool", () => {
    expect(newServer().tools).toHaveLength(1);
    expect(newServer().tools[0]!.name).toBe("prism_ai");
  });

  it("attr_observe -> observed, trajectory_length increments", async () => {
    const s = newServer();
    const r = await call(s, "attr_observe", { state: { values: [1, 2, 3], timestamp: 5 } });
    expect(r.ok).toBe(true);
    expect(r.data.observed).toBe(true);
    expect(r.data.trajectory_length).toBe(1);
  });

  it("attr_observe_batch -> observed count == trajectory_length", async () => {
    const s = newServer();
    const r = await call(s, "attr_observe_batch", { states: constStates(12) });
    expect(r.ok).toBe(true);
    expect(r.data.observed).toBe(12);
    expect(r.data.trajectory_length).toBe(12);
  });

  it("attr_observe missing values -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "attr_observe", { state: { timestamp: 5 } });
    expect(r.ok).toBe(false);
  });

  it("attr_observe with non-array values -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "attr_observe", { state: { values: "not-an-array" } });
    expect(r.ok).toBe(false);
  });

  it("attr_observe_batch with a non-numeric value -> error (schema, failure mode)", async () => {
    const s = newServer();
    const r = await call(s, "attr_observe_batch", { states: [{ values: [1, "x", 3] }] });
    expect(r.ok).toBe(false);
  });

  it("attr_trajectory_length reflects observations", async () => {
    const s = newServer();
    await call(s, "attr_observe_batch", { states: constStates(5) });
    const r = await call(s, "attr_trajectory_length");
    expect(r.ok).toBe(true);
    expect(r.data.trajectory_length).toBe(5);
  });

  it("attr_current_state returns the last observation; null when empty (?? null)", async () => {
    const empty = newServer();
    const e = await call(empty, "attr_current_state");
    expect(e.ok).toBe(true);
    expect(e.data.state ?? null).toBe(null);

    const s = newServer();
    await call(s, "attr_observe", { state: { values: [7, 8, 9], timestamp: 42 } });
    const r = await call(s, "attr_current_state");
    expect(r.ok).toBe(true);
    expect((r.data.state as { values: number[] }).values).toEqual([7, 8, 9]);
  });

  it("attr_detect_fixed_points with <10 observations -> empty (?? [])", async () => {
    const s = newServer();
    await call(s, "attr_observe_batch", { states: constStates(5) });
    const r = await call(s, "attr_detect_fixed_points");
    expect(r.ok).toBe(true);
    expect((r.data.fixed_points ?? []) as unknown[]).toHaveLength(0);
  });

  it("attr_detect_fixed_points with >=10 observations -> ok, array", async () => {
    const s = newServer();
    await call(s, "attr_observe_batch", { states: constStates(20) });
    const r = await call(s, "attr_detect_fixed_points");
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.fixed_points ?? [])).toBe(true);
  });

  it("attr_detect_limit_cycles -> ok, array", async () => {
    const s = newServer();
    await call(s, "attr_observe_batch", { states: constStates(20) });
    const r = await call(s, "attr_detect_limit_cycles");
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.limit_cycles ?? [])).toBe(true);
  });

  it("attr_analyze -> ok, shaped TrajectoryAnalysis", async () => {
    const s = newServer();
    await call(s, "attr_observe_batch", { states: constStates(30) });
    const r = await call(s, "attr_analyze");
    expect(r.ok).toBe(true);
    expect(typeof r.data.is_chaotic).toBe("boolean");
    expect(typeof r.data.recurrence_rate).toBe("number");
    expect(Array.isArray(r.data.trajectory ?? [])).toBe(true);
  });

  it("attr_lyapunov -> ok, numeric exponent", async () => {
    const s = newServer();
    await call(s, "attr_observe_batch", { states: constStates(30) });
    const r = await call(s, "attr_lyapunov");
    expect(r.ok).toBe(true);
    expect(typeof r.data.lyapunov_exponent).toBe("number");
  });

  it("attr_stability_metrics -> ok, boolean stability flags + numeric lyapunov", async () => {
    const s = newServer();
    await call(s, "attr_observe_batch", { states: constStates(30) });
    const r = await call(s, "attr_stability_metrics");
    expect(r.ok).toBe(true);
    expect(typeof r.data.is_stable).toBe("boolean");
    expect(typeof r.data.is_chaotic).toBe("boolean");
    expect(typeof r.data.max_lyapunov).toBe("number");
  });

  it("attr_recurrence_plot on a constant trajectory -> full n x n, all recurrent", async () => {
    const s = newServer();
    await call(s, "attr_observe_batch", { states: constStates(4) });
    const r = await call(s, "attr_recurrence_plot");
    expect(r.ok).toBe(true);
    const plot = r.data.recurrence_plot as boolean[][];
    expect(plot.length).toBe(4);
    expect(plot[0]!.length).toBe(4);
    expect(plot[0]![0]).toBe(true); // identical states -> distance 0 < threshold
  });

  it("attr_recurrence_plot honors a custom threshold", async () => {
    const s = newServer();
    await call(s, "attr_observe_batch", { states: constStates(3) });
    const r = await call(s, "attr_recurrence_plot", { threshold: 0.5 });
    expect(r.ok).toBe(true);
    expect((r.data.recurrence_plot as boolean[][]).length).toBe(3);
  });

  it("attr_has_converged true for >=50 constant states", async () => {
    const s = newServer();
    await call(s, "attr_observe_batch", { states: constStates(60) });
    const r = await call(s, "attr_has_converged");
    expect(r.ok).toBe(true);
    expect(r.data.converged).toBe(true);
  });

  it("attr_has_converged false below the 50-state window (false survives slimming)", async () => {
    const s = newServer();
    await call(s, "attr_observe_batch", { states: constStates(10) });
    const r = await call(s, "attr_has_converged");
    expect(r.ok).toBe(true);
    expect(r.data.converged).toBe(false);
  });

  it("attr_get_attractors after analyze -> ok, array", async () => {
    const s = newServer();
    await call(s, "attr_observe_batch", { states: constStates(30) });
    await call(s, "attr_analyze");
    const r = await call(s, "attr_get_attractors");
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data.attractors ?? [])).toBe(true);
  });

  it("attr_get_config returns the attractor config", async () => {
    const s = newServer();
    const r = await call(s, "attr_get_config");
    expect(r.ok).toBe(true);
    expect(typeof r.data.fixed_point_tolerance).toBe("number");
    expect(typeof r.data.embedding_dimension).toBe("number");
  });
});
