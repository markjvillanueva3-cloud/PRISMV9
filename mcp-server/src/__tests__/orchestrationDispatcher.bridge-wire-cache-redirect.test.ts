/**
 * orchestrationDispatcher — U-BRIDGE-WIRE-CACHE-REDIRECT round-trip suite
 * ========================================================================
 *
 * Wires 2 caching/routing engines as a single unit:
 *   - ResponseCacheEngine.stats     -> response_cache_stats
 *   - ToolRedirectEngine.evaluate   -> tool_redirect_evaluate
 *
 * Pre-wire: ZERO dispatcher references for both. Shipped from slot/mike worktree.
 *
 * @milestone BRIDGE-WIRING
 * @unit U-BRIDGE-WIRE-CACHE-REDIRECT
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

describe("U-BRIDGE-WIRE-CACHE-REDIRECT / response_cache_stats", () => {
  it("returns ok envelope with structured stats object", async () => {
    const r = await call(server, "response_cache_stats", {});
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    const stats = r.data.stats as Record<string, unknown>;
    expect(stats).not.toBeNull();
    expect(typeof stats).toBe("object");
    expect(Object.keys(stats).length).toBeGreaterThan(0);
  });
});

describe("U-BRIDGE-WIRE-CACHE-REDIRECT / tool_redirect_evaluate", () => {
  it("returns success envelope on a valid tool call (suggestion may be null/absent)", async () => {
    const r = await call(server, "tool_redirect_evaluate", { tool: "Bash", params: { command: "ls" } });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    // suggestion may be null (no redirect) — the response-slimmer drops null values,
    // so absence-of-property is the success signal. Engine contract: null|object.
    if (r.data.suggestion !== undefined) {
      // If present, it's a structured suggestion object (engine returned non-null).
      expect(typeof r.data.suggestion).toBe("object");
    }
  });

  it("rejects empty tool string (R12 fail-loud)", async () => {
    const r = await call(server, "tool_redirect_evaluate", { tool: "" });
    expect(r.ok).toBe(false);
  });

  it("rejects missing tool param (schema-layer guard)", async () => {
    const r = await call(server, "tool_redirect_evaluate", {});
    expect(r.ok).toBe(false);
  });
});

describe("U-BRIDGE-WIRE-CACHE-REDIRECT / wiring invariants", () => {
  it("both actions resolve through switch (never 'Unknown action:')", async () => {
    const results = await Promise.all([
      call(server, "response_cache_stats", {}),
      call(server, "tool_redirect_evaluate", { tool: "Read", params: {} }),
    ]);
    for (const r of results) {
      const msg = String(r.data.error ?? "");
      expect(msg).not.toMatch(/^Unknown action:/);
    }
    expect(results.length).toBe(2);
  });
});
