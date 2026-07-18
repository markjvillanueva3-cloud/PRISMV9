/**
 * orchestrationDispatcher — U-BRIDGE-WIRE-EDIT-PLAN round-trip suite
 * ===================================================================
 *
 * Wires EditPlannerEngine.suggestTool() into prism_orchestrate as
 * edit_plan_suggest_tool. Pre-wire: ZERO dispatcher references.
 *
 * @milestone BRIDGE-WIRING
 * @unit U-BRIDGE-WIRE-EDIT-PLAN
 * @slot mike
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerOrchestrationDispatcher } from "../tools/dispatchers/orchestrationDispatcher.js";

interface CapturedTool {
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(_n: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ handler });
  }
}
interface DispatchResult { ok: boolean; data: Record<string, unknown> }
async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<DispatchResult> {
  const tool = server.tools[0]!;
  const raw = await tool.handler({ action, params });
  const envelope = raw as { content: { type: string; text: string }[] };
  const parsed = JSON.parse(envelope.content[0]!.text) as Record<string, unknown>;
  if ("error" in parsed) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerOrchestrationDispatcher(server as unknown as Parameters<typeof registerOrchestrationDispatcher>[0]);
});

describe("U-BRIDGE-WIRE-EDIT-PLAN / edit_plan_suggest_tool", () => {
  it("large change (>50%) recommends Write", async () => {
    const r = await call(server, "edit_plan_suggest_tool", { fileSize: 1000, changeSize: 800 });
    expect(r.ok).toBe(true);
    const sug = r.data.suggestion as { tool: string; reason: string };
    expect(sug.tool).toBe("Write");
    expect(sug.reason).toMatch(/Write is cheaper/);
  });

  it("small change (<50%) recommends Edit", async () => {
    const r = await call(server, "edit_plan_suggest_tool", { fileSize: 1000, changeSize: 50 });
    expect(r.ok).toBe(true);
    const sug = r.data.suggestion as { tool: string; reason: string };
    expect(sug.tool).toBe("Edit");
    expect(sug.reason).toMatch(/minimizes context/);
  });

  it("accepts snake_case params (paramNormalizer round-trip)", async () => {
    const r = await call(server, "edit_plan_suggest_tool", { file_size: 1000, change_size: 100 });
    expect(r.ok).toBe(true);
    const sug = r.data.suggestion as { tool: string };
    expect(sug.tool).toBe("Edit");
  });

  it("rejects missing or negative inputs (R12 fail-loud)", async () => {
    const r = await call(server, "edit_plan_suggest_tool", {});
    // Schema or handler must reject — never silently produce a suggestion from undefined.
    expect(r.ok).toBe(false);
  });

  it("action is recognized by the switch (never 'Unknown action:')", async () => {
    const r = await call(server, "edit_plan_suggest_tool", { fileSize: 100, changeSize: 30 });
    const msg = String(r.data.error ?? "");
    expect(msg).not.toMatch(/^Unknown action:/);
  });
});
