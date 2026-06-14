/**
 * orchestrationDispatcher — U-BRIDGE-WIRE-CTX-UTIL round-trip suite
 * ==================================================================
 *
 * Wires 2 context-utility engines as a single unit:
 *   - ConversationTrimmerEngine.classify -> conversation_classify_segment
 *   - SmartPrefetchEngine.extractImports -> prefetch_extract_imports
 *
 * Pre-wire: ZERO dispatcher references for both.
 *
 * @milestone BRIDGE-WIRING
 * @unit U-BRIDGE-WIRE-CTX-UTIL
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

describe("U-BRIDGE-WIRE-CTX-UTIL / conversation_classify_segment", () => {
  it("returns a segment envelope on non-empty content", async () => {
    const r = await call(server, "conversation_classify_segment", { content: "Some chat content to classify" });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    expect(r.data.segment).not.toBeNull();
  });

  it("rejects empty content", async () => {
    const r = await call(server, "conversation_classify_segment", { content: "" });
    expect(r.ok).toBe(false);
  });

  it("rejects missing content", async () => {
    const r = await call(server, "conversation_classify_segment", {});
    expect(r.ok).toBe(false);
  });
});

describe("U-BRIDGE-WIRE-CTX-UTIL / prefetch_extract_imports", () => {
  it("extracts ES module imports from TS source", async () => {
    const src = `import { foo } from "./foo.js";\nimport bar from "../bar.ts";\nconst x = 1;\n`;
    const r = await call(server, "prefetch_extract_imports", { content: src });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    const imports = r.data.imports as string[];
    expect(Array.isArray(imports)).toBe(true);
    expect(r.data.count).toBe(imports.length);
    expect(imports.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty array on import-less content (zero is a valid result)", async () => {
    const r = await call(server, "prefetch_extract_imports", { content: "const x = 42; export { x };" });
    expect(r.ok).toBe(true);
    const imports = (r.data.imports as string[] | undefined) ?? [];
    expect(imports.length).toBe(0);
    expect(r.data.count ?? 0).toBe(0);
  });

  it("rejects empty content (R12 fail-loud)", async () => {
    const r = await call(server, "prefetch_extract_imports", { content: "" });
    expect(r.ok).toBe(false);
  });
});

describe("U-BRIDGE-WIRE-CTX-UTIL / wiring invariants", () => {
  it("both actions resolve through the switch (never 'Unknown action:')", async () => {
    const cases = [
      { action: "conversation_classify_segment", params: { content: "x" } },
      { action: "prefetch_extract_imports", params: { content: "x" } },
    ];
    const results = await Promise.all(cases.map(c => call(server, c.action, c.params)));
    for (const r of results) {
      const msg = String(r.data.error ?? "");
      expect(msg).not.toMatch(/^Unknown action:/);
    }
    expect(results.length).toBe(2);
  });
});
