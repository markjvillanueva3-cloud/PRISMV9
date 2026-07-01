/**
 * orchestrationDispatcher wet_run_pilot_orchestrate wiring (U-WETRUN-PILOT-WIRE).
 *
 * Dark-facade fix: probed run/orchestrate/execute (none exist on
 * WetRunPilotOrchestratorEngine) -> always "method not callable". Now routes to the
 * real `pilotPromotionReadiness(pilotId, nowTs)` (positional args, self-validates).
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

describe("orchestrationDispatcher wet_run_pilot_orchestrate — dark-action fix (real pilotPromotionReadiness)", () => {
  it("returns a real readiness gate (pilot_id/as_of_ts/ready/blockers/breakdown), NOT 'method not callable'", async () => {
    const invoke = makeInvoke();
    const r = await invoke("wet_run_pilot_orchestrate", { pilot_id: "PILOT-WIRE-TEST", now_ts: 1750000000000 });
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(r.success).toBe(true);
    const d = r.data as { pilot_id: string; as_of_ts: number; ready: boolean; blockers: unknown[]; breakdown: Record<string, unknown> };
    expect(d.pilot_id).toBe("PILOT-WIRE-TEST");
    expect(d.as_of_ts).toBe(1750000000000); // echoes the positional nowTs arg
    expect(typeof d.ready).toBe("boolean");
    expect(Array.isArray(d.blockers)).toBe(true);
    expect(typeof d.breakdown).toBe("object");
  });

  it("defaults nowTs to the current time when omitted (positional-arg adapter), no crash", async () => {
    const invoke = makeInvoke();
    const before = Date.now();
    const r = await invoke("wet_run_pilot_orchestrate", { pilot_id: "PILOT-WIRE-TEST-2" });
    expect(r.success).toBe(true);
    const d = r.data as { as_of_ts: number };
    expect(Number.isFinite(d.as_of_ts)).toBe(true);
    expect(d.as_of_ts).toBeGreaterThanOrEqual(before);
  });

  it("rejects a missing pilot_id (engine self-validation: non-empty string)", async () => {
    const invoke = makeInvoke();
    let out = "";
    try { out = JSON.stringify(await invoke("wet_run_pilot_orchestrate", { now_ts: 1750000000000 })); }
    catch (e) { out = String(e); }
    expect(out).toMatch(/non-empty string|pilot_id|error/i);
    expect(out).not.toMatch(/"ready":/);
  });
});
