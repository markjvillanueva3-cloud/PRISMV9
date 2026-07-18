/**
 * orchestrationDispatcher foresight_orchestrate wiring (U-FORESIGHT-ORCH-WIRE).
 *
 * Dark-facade fix: the action probed foresee/run/analyze (none exist on
 * ForesightOrchestratorEngine) -> always "method not callable". Now routes to the
 * real async `reportFor`, which self-validates (throws if description missing).
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

describe("orchestrationDispatcher foresight_orchestrate — dark-action fix (real reportFor)", () => {
  it("returns a real foresight report (verdict/severity/summary), NOT 'method not callable'", async () => {
    const invoke = makeInvoke();
    const r = await invoke("foresight_orchestrate", {
      description: "Wire a new dispatcher action to its real engine method with crash-guard tests",
      unitClass: "wiring",
      proposedFiles: ["src/tools/dispatchers/x.ts"],
    });
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(r.success).toBe(true);
    const report = r.data as { verdict: string; severity: string; summary: string };
    expect(["go", "caution", "no_go"]).toContain(report.verdict);
    expect(["ok", "warn", "block"]).toContain(report.severity);
    expect((report.summary as string).length).toBeGreaterThan(0);
  });

  it("rejects a missing description (reportFor self-validation — no silent stub)", async () => {
    const invoke = makeInvoke();
    let out = "";
    try { out = JSON.stringify(await invoke("foresight_orchestrate", {})); }
    catch (e) { out = String(e); }
    expect(out).toMatch(/description required|error|invalid/i);
    expect(out).not.toMatch(/"verdict"/);
  });
});
