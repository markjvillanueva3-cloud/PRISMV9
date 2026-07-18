/**
 * Round-trip wiring test for prism_session:dual_channel_dispatch
 * (GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC04). Invokes THROUGH the registered
 * sessionDispatcher handler (schema validation + dispatch), against a hermetic
 * temp adjacency fixture (no live sidecar, no Chrome dependency: enrich:false +
 * the viz channel deterministically degrades to the mermaid+markdown layer).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerSessionDispatcher(fakeServer);
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

let dir: string;
let adjPath: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "gac04-wire-"));
  adjPath = join(dir, "adj.json");
  writeFileSync(
    adjPath,
    JSON.stringify({
      "eng.system.foo": {
        in: [{ id: "disp.prism_ai", type: "wired-to" }],
        out: [{ id: "eng.system.bar", type: "calls" }, { id: "disp.prism_ai", type: "wired-to" }],
      },
      "eng.system.bar": { in: [{ id: "eng.system.foo", type: "calls" }], out: [] },
      "disp.prism_ai": { in: [{ id: "eng.system.foo", type: "wired-to" }], out: [{ id: "eng.system.foo", type: "wired-to" }] },
    }),
  );
});
afterAll(() => {
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("sessionDispatcher · dual_channel_dispatch wiring (E2E round-trip)", () => {
  let handler: Handler;
  beforeAll(async () => {
    vi.setConfig({ testTimeout: 30_000 });
    handler = await createServer().handler;
  });

  it("builds a dual-channel bundle through the dispatcher (both channels, real ego topology)", async () => {
    const r = await call(handler, "dual_channel_dispatch", {
      nodeId: "eng.system.foo",
      prompt: "Investigate the wiring.",
      adjacencyPath: adjPath,
      enrich: false,
    });
    expect(r.mode).toBe("both");
    expect(r.nodeId).toBe("eng.system.foo");
    // the ego of foo (1-hop) is exactly {foo, bar, prism_ai} from the fixture
    expect(r.json.nodeIds.sort()).toEqual(["disp.prism_ai", "eng.system.bar", "eng.system.foo"]);
    expect(r.json.edgeCount).toBeGreaterThanOrEqual(3); // foo->bar, foo->prism_ai, prism_ai->foo
    // no live Chrome in CI -> deterministic mermaid+markdown visual layer with real edges
    expect(["png", "md-fallback", "empty"]).toContain(r.viz.kind);
    expect(r.viz.mermaid).toContain("graph LR");
    expect(r.prompt).toContain("node-id: `eng.system.foo`");
    expect(r.prompt).toContain("visual layer");
  });

  it("honors mode=json-only via the dispatcher (viz channel omitted entirely)", async () => {
    const r = await call(handler, "dual_channel_dispatch", {
      id: "eng.system.foo", // alias resolves to nodeId
      prompt: "x",
      mode: "json-only",
      adjacencyPath: adjPath,
      enrich: false,
    });
    expect(r.json.nodeIds).toContain("eng.system.foo");
    // viz omitted in json-only mode (the wire's slimResponse strips the null key -> undefined)
    expect(r.viz ?? null).toBeNull();
    expect(r.prompt).toContain("Channel 1");
    expect(r.prompt).not.toContain("Channel 2");
  });

  it("rejects a path-traversal layer at the schema boundary (defense-in-depth)", async () => {
    const r = await call(handler, "dual_channel_dispatch", {
      nodeId: "eng.system.foo",
      layer: "../../etc/cron.d/evil",
      adjacencyPath: adjPath,
      enrich: false,
    });
    expect(r.success).toBe(false);
    expect(r.error).toContain("Invalid params for 'dual_channel_dispatch'");
  });

  it("missing nodeId fails loud through the dispatcher (structured dispatcherError, no crash)", async () => {
    // nodeId optional in schema; the handler pre-validates and returns a structured
    // dispatcherError ({success:false, error, action, dispatcher}) -- NOT a raw throw (R12).
    const r = await call(handler, "dual_channel_dispatch", { prompt: "x", adjacencyPath: adjPath, enrich: false });
    expect(r.success).toBe(false);
    expect(r.error).toContain("non-empty nodeId");
    expect(r.action).toBe("dual_channel_dispatch");
  });
});
