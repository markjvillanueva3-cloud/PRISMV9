/**
 * orchestrationDispatcher sampling_plan_generate wiring (U-SAMPLING-PLAN-WIRE).
 *
 * Dark-facade fix: probed generate/plan/calculate (none exist on SamplingPlanEngine) ->
 * always "method not callable". Now routes via a `standard` discriminator (default
 * mil1916) to the real static mil1916 / aoqlPlan generators (each self-validates).
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

describe("orchestrationDispatcher sampling_plan_generate — dark-action fix (real mil1916/aoqlPlan)", () => {
  it("default standard -> a real MIL-STD-1916 plan (c=0, sampleSize, codeLetter), NOT 'method not callable'", async () => {
    const invoke = makeInvoke();
    const r = await invoke("sampling_plan_generate", { lotSize: 500, verificationLevel: "IV" });
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(r.success).toBe(true);
    const d = r.data as { sampleSize: number; acceptanceNumber: number; codeLetter: string; verificationLevel: string };
    expect(d.sampleSize).toBeGreaterThan(0);
    expect(d.acceptanceNumber).toBe(0); // MIL-STD-1916 is c=0
    expect((d.codeLetter as string).length).toBeGreaterThan(0);
    expect(d.verificationLevel).toBe("IV");
  });

  it("standard='aoql' routes to a real AOQL plan (targetAoql echoed, sampleSize > 0)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("sampling_plan_generate", { standard: "aoql", lotSize: 500, aoql: 0.01 });
    expect(r.success).toBe(true);
    const d = r.data as { sampleSize: number; targetAoql: number; achievedAoql: number; acceptanceNumber: number };
    expect(d.sampleSize).toBeGreaterThan(0);
    expect(d.targetAoql).toBeCloseTo(0.01, 6);
    expect(typeof d.achievedAoql).toBe("number");
    expect(d.acceptanceNumber).toBeGreaterThanOrEqual(0);
  });

  it("self-validation: a non-positive lotSize is rejected (engine Zod .parse throws)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("sampling_plan_generate", { lotSize: -5, verificationLevel: "IV" });
    expect(r.success).toBe(false);
  });

  it("self-validation: an out-of-range aoql (>=0.5) is rejected", async () => {
    const invoke = makeInvoke();
    const r = await invoke("sampling_plan_generate", { standard: "aoql", lotSize: 500, aoql: 0.9 });
    expect(r.success).toBe(false);
  });
});
