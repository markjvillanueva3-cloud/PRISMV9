/**
 * orchestrationDispatcher — U-BRIDGE-WIRE-PLUGIN-FAP round-trip suite
 * ====================================================================
 *
 * Wires 2 dev-tooling engines as a single unit:
 *   - PluginEngine.list -> plugin_list
 *   - FileAccessPatternEngine.hotFiles -> file_access_hot_files
 *
 * Pre-wire: ZERO dispatcher references for both. Shipped from slot/mike worktree.
 *
 * @milestone BRIDGE-WIRING
 * @unit U-BRIDGE-WIRE-PLUGIN-FAP
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

describe("U-BRIDGE-WIRE-PLUGIN-FAP / plugin_list", () => {
  it("returns count === plugins.length invariant", async () => {
    const r = await call(server, "plugin_list", {});
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    const plugins = (r.data.plugins as unknown[] | undefined) ?? [];
    expect(Array.isArray(plugins)).toBe(true);
    expect(r.data.count ?? 0).toBe(plugins.length);
  });

  it("status filter passes through without throwing", async () => {
    const r = await call(server, "plugin_list", { status: "active" });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
  });
});

describe("U-BRIDGE-WIRE-PLUGIN-FAP / file_access_hot_files", () => {
  it("returns count === files.length invariant", async () => {
    const r = await call(server, "file_access_hot_files", {});
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    const files = (r.data.files as unknown[] | undefined) ?? [];
    expect(Array.isArray(files)).toBe(true);
    expect(r.data.count ?? 0).toBe(files.length);
  });

  it("custom minAccess override accepted", async () => {
    const r = await call(server, "file_access_hot_files", { minAccess: 100 });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
  });
});

describe("U-BRIDGE-WIRE-PLUGIN-FAP / wiring invariants", () => {
  it("both actions resolve through switch (never 'Unknown action:')", async () => {
    const results = await Promise.all([
      call(server, "plugin_list", {}),
      call(server, "file_access_hot_files", {}),
    ]);
    for (const r of results) {
      const msg = String(r.data.error ?? "");
      expect(msg).not.toMatch(/^Unknown action:/);
    }
    expect(results.length).toBe(2);
  });
});
