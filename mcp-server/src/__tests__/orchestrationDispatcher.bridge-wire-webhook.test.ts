/**
 * orchestrationDispatcher — U-BRIDGE-WIRE-WEBHOOK round-trip suite
 * =================================================================
 *
 * Wires WebhookEngine.list() as webhook_list. Pre-wire: ZERO dispatcher refs.
 * Shipped from slot/mike worktree (commits land on slot/mike branch).
 *
 * @milestone BRIDGE-WIRING
 * @unit U-BRIDGE-WIRE-WEBHOOK
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

describe("U-BRIDGE-WIRE-WEBHOOK / webhook_list", () => {
  it("returns count === webhooks.length invariant on empty registry", async () => {
    const r = await call(server, "webhook_list", {});
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    const webhooks = (r.data.webhooks as unknown[] | undefined) ?? [];
    expect(Array.isArray(webhooks)).toBe(true);
    expect(r.data.count ?? 0).toBe(webhooks.length);
  });

  it("status filter passes through without throwing", async () => {
    const r = await call(server, "webhook_list", { status: "active" });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
  });

  it("action recognized by the switch (never 'Unknown action:')", async () => {
    const r = await call(server, "webhook_list", {});
    const msg = String(r.data.error ?? "");
    expect(msg).not.toMatch(/^Unknown action:/);
  });
});
