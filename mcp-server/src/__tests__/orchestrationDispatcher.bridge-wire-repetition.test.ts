/**
 * orchestrationDispatcher — U-BRIDGE-WIRE-REPETITION round-trip suite
 * ====================================================================
 *
 * Wires RepetitionDetectorEngine.analyze() into prism_orchestrate as
 * repetition_detect. Pre-wire: ZERO dispatcher references.
 *
 * @milestone BRIDGE-WIRING
 * @unit U-BRIDGE-WIRE-REPETITION
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

describe("U-BRIDGE-WIRE-REPETITION / repetition_detect", () => {
  it("returns success envelope with a report on non-empty text", async () => {
    const text = "foo bar foo bar foo bar baz qux foo bar foo bar";
    const r = await call(server, "repetition_detect", { text });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    const report = r.data.report as Record<string, unknown>;
    expect(report).not.toBeNull();
    expect(typeof report).toBe("object");
    expect(Object.keys(report).length).toBeGreaterThan(0);
  });

  it("rejects empty text input (R12 fail-loud)", async () => {
    const r = await call(server, "repetition_detect", { text: "" });
    expect(r.ok).toBe(false);
  });

  it("rejects missing text input (schema-layer guard)", async () => {
    const r = await call(server, "repetition_detect", {});
    expect(r.ok).toBe(false);
  });

  it("honors maxTopRepeats override (handler does not throw)", async () => {
    const text = "a a a b b c c c c d";
    const r = await call(server, "repetition_detect", { text, maxTopRepeats: 2 });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
  });

  it("action recognized by the switch (never 'Unknown action:')", async () => {
    const r = await call(server, "repetition_detect", { text: "hello hello hello" });
    const msg = String(r.data.error ?? "");
    expect(msg).not.toMatch(/^Unknown action:/);
  });
});
