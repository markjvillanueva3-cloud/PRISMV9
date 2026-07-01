/**
 * Round-trip wiring test for prism_dev:code_graph_project
 * (GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC03). Invokes THROUGH the registered devDispatcher
 * handler (schema validation + dispatch), projecting REAL engine source (live-data E2E).
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerDevDispatcher(fakeServer);
  return { handler };
}

async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

const TARGET = "mcp-server/src/engines/CodeGraphProjectionEngine.ts";

describe("devDispatcher · code_graph_project wiring (E2E round-trip)", () => {
  let handler: Handler;
  beforeAll(async () => {
    vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
    handler = await createServer().handler;
  });

  it("projects a real engine file -> resolved code graph", async () => {
    const r = await call(handler, "code_graph_project", { target: TARGET });
    expect(r.success).toBe(true);
    expect(r.data.nodes.length).toBeGreaterThanOrEqual(5);
    expect(r.data.edges.length).toBeGreaterThanOrEqual(3);
    expect(r.data.depsResolved).toBe(true);
    expect(r.data.nodes.some((n: any) => n.kind === "class")).toBe(true);
    expect(r.data.nodes.some((n: any) => n.id === `file:${TARGET}`)).toBe(true);
  });

  it("ego-graph retrieval via center node", async () => {
    const r = await call(handler, "code_graph_project", { target: TARGET, center: `file:${TARGET}`, hops: 1 });
    expect(r.success).toBe(true);
    expect(r.data.center).toBe(`file:${TARGET}`);
    expect(r.data.nodes.length).toBeGreaterThan(0);
    expect(r.data.nodes.some((n: any) => n.id === `file:${TARGET}`)).toBe(true);
  });

  it("schema rejects a missing target before the engine runs", async () => {
    const r = await call(handler, "code_graph_project", {});
    expect(r.error).toContain("Invalid params for code_graph_project");
    expect(r.success).toBeUndefined(); // schema gate fired before the handler -> no success payload
  });
});
