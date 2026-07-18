/**
 * orchestrationDispatcher — U-BRIDGE-WIRE-BATCH-QUERY round-trip suite
 * =====================================================================
 *
 * Wires BatchQueryEngine.getRegisteredDispatchers() as batch_query_registered.
 * Pre-wire: ZERO dispatcher references. Shipped from slot/mike worktree.
 *
 * @milestone BRIDGE-WIRING
 * @unit U-BRIDGE-WIRE-BATCH-QUERY
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

describe("U-BRIDGE-WIRE-BATCH-QUERY / batch_query_registered", () => {
  it("returns count === dispatchers.length invariant", async () => {
    const r = await call(server, "batch_query_registered", {});
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    const dispatchers = (r.data.dispatchers as unknown[] | undefined) ?? [];
    expect(Array.isArray(dispatchers)).toBe(true);
    expect(r.data.count ?? 0).toBe(dispatchers.length);
  });

  it("action recognized by the switch (never 'Unknown action:')", async () => {
    const r = await call(server, "batch_query_registered", {});
    const msg = String(r.data.error ?? "");
    expect(msg).not.toMatch(/^Unknown action:/);
  });
});
