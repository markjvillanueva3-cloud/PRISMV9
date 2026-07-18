/**
 * orchestrationDispatcher smart_tool_select wiring (U-SMARTTOOL-ORCH-WIRE).
 *
 * Dark-facade fix: probed select/run/recommend (none exist on
 * SmartToolSelectorOrchestratorAdapter) -> always "method not callable". Now routes to
 * the real `selectToolOrchestrated` (orchestrated variant: candidates + decision; the
 * raw selector lives on prism_cam:smart_tool_select). Graceful -> {no_candidates:true}
 * when nothing matches, so no crash-guard needed.
 */
import { describe, it, expect } from "vitest";
import { registerOrchestrationDispatcher } from "../tools/dispatchers/orchestrationDispatcher.js";

function makeInvoke() {
  let handler: ((arg: { action: string; params?: Record<string, unknown> }) => Promise<unknown>) | undefined;
  const server = {
    tool: (_n: string, _d: string, _s: unknown, h: typeof handler) => { handler = h; },
  };
  registerOrchestrationDispatcher(server);
  if (!handler) throw new Error("registerOrchestrationDispatcher did not register a handler");
  return async (action: string, params: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const res = (await handler!({ action, params })) as { content?: Array<{ text?: string }> };
    const text = res?.content?.[0]?.text ?? "null";
    try { return JSON.parse(text) as Record<string, unknown>; } catch { return { _raw: text }; }
  };
}

/** A result is the real orchestrated-adapter output iff it has either the no-candidates
 *  flag or a decision/smart_result field — NEVER the facade's method-not-callable stub. */
function isOrchestratedShape(d: Record<string, unknown>): boolean {
  return d.no_candidates === true || "decision" in d || "smart_result" in d;
}

describe("orchestrationDispatcher smart_tool_select — dark-action fix (real selectToolOrchestrated)", () => {
  it("returns the orchestrated adapter shape (decision/smart_result/no_candidates), NOT 'method not callable'", async () => {
    const invoke = makeInvoke();
    const r = await invoke("smart_tool_select", {
      decision_point: "p2p.tool_select_rough",
      operation_type: "milling",
      material_iso_group: "P",
      material_name: "4140",
      feature_diameter_mm: 12,
      objective: "balanced",
    });
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(r.success).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(isOrchestratedShape(d)).toBe(true);
  });

  it("graceful: an unmatchable request returns no_candidates (not a crash, not a stub)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("smart_tool_select", {
      decision_point: "p2p.tool_select_rough",
      operation_type: "no_such_operation_xyz",
      material_iso_group: "ZZZ",
    });
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(r.success).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(isOrchestratedShape(d)).toBe(true);
  });
});
