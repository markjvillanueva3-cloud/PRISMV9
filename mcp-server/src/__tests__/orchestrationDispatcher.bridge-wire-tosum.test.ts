/**
 * orchestrationDispatcher — U-BRIDGE-WIRE-TOSUM round-trip suite
 * ===============================================================
 *
 * Wires ToolOutputSummarizerEngine.summarize() as tool_output_summarize.
 * Pre-wire: ZERO dispatcher references.
 *
 * @milestone BRIDGE-WIRING
 * @unit U-BRIDGE-WIRE-TOSUM
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

describe("U-BRIDGE-WIRE-TOSUM / tool_output_summarize", () => {
  const noisyBuild = Array.from({ length: 100 }, (_, i) => "line " + i + " of build output").join("\n");

  it("compresses verbose output to a summary envelope", async () => {
    const r = await call(server, "tool_output_summarize", { output: noisyBuild, maxLines: 5 });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    const summary = r.data.summary as Record<string, unknown>;
    expect(summary).not.toBeNull();
    expect(typeof summary).toBe("object");
    expect(Object.keys(summary).length).toBeGreaterThan(0);
  });

  it("rejects empty output input", async () => {
    const r = await call(server, "tool_output_summarize", { output: "" });
    expect(r.ok).toBe(false);
  });

  it("rejects missing output param (schema-layer guard)", async () => {
    const r = await call(server, "tool_output_summarize", {});
    expect(r.ok).toBe(false);
  });

  it("honors maxLines override (handler does not throw)", async () => {
    const r = await call(server, "tool_output_summarize", { output: noisyBuild, maxLines: 3 });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
  });

  it("action recognized by the switch (never 'Unknown action:')", async () => {
    const r = await call(server, "tool_output_summarize", { output: "single line" });
    const msg = String(r.data.error ?? "");
    expect(msg).not.toMatch(/^Unknown action:/);
  });
});
