/**
 * orchestrationDispatcher — U-BRIDGE-WIRE-INCREAD round-trip suite
 * =================================================================
 *
 * Wires IncrementalReadEngine.getState() as incremental_read_state.
 * Pre-wire: ZERO dispatcher references.
 *
 * @milestone BRIDGE-WIRING
 * @unit U-BRIDGE-WIRE-INCREAD
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

describe("U-BRIDGE-WIRE-INCREAD / incremental_read_state", () => {
  it("returns a state envelope for a never-read file path", async () => {
    const r = await call(server, "incremental_read_state", { file: "H:/prism/mcp-server/src/db/BusinessStore.ts" });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    const state = r.data.state as Record<string, unknown>;
    expect(state).not.toBeNull();
    expect(typeof state).toBe("object");
  });

  it("rejects empty file path", async () => {
    const r = await call(server, "incremental_read_state", { file: "" });
    expect(r.ok).toBe(false);
  });

  it("rejects missing file param (schema-layer guard)", async () => {
    const r = await call(server, "incremental_read_state", {});
    expect(r.ok).toBe(false);
  });

  it("action recognized by the switch (never 'Unknown action:')", async () => {
    const r = await call(server, "incremental_read_state", { file: "anything" });
    const msg = String(r.data.error ?? "");
    expect(msg).not.toMatch(/^Unknown action:/);
  });
});
