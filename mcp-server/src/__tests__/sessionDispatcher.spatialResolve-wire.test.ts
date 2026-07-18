/**
 * Round-trip wiring test for prism_session:spatial_resolve
 * (GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC05). Invokes THROUGH the registered
 * sessionDispatcher handler (schema validation + dispatch) against a hermetic
 * temp find-cache fixture (no live 65MB sidecar).
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
    tool(_n: string, _d: string, _s: any, fn: Handler) { resolve(fn); },
  };
  registerSessionDispatcher(fakeServer);
  return { handler };
}
async function call(handler: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try { return JSON.parse(text); } catch { return r; }
}

let dir: string;
let fcPath: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "gac05-wire-"));
  fcPath = join(dir, "find-cache.json");
  writeFileSync(
    fcPath,
    JSON.stringify({
      nodes: [
        { id: "eng.mill", label: "MillEngine", layer: "L6" },
        { id: "eng.lathe", label: "LatheEngine", layer: "L6" },
        { id: "disp.prism_ai", label: "prism_ai", layer: "L4" },
      ],
    }),
  );
});
afterAll(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } });

describe("sessionDispatcher · spatial_resolve wiring (E2E round-trip)", () => {
  let handler: Handler;
  beforeAll(async () => {
    vi.setConfig({ testTimeout: 20_000 });
    handler = await createServer().handler;
  });

  it("resolves an exact id through the dispatcher", async () => {
    const r = await call(handler, "spatial_resolve", { text: "eng.mill", findCachePath: fcPath });
    expect(r.method).toBe("exact-id");
    expect(r.nodeId).toBe("eng.mill");
    expect(r.confidence).toBe(1);
  });

  it("resolves a fuzzy alias through the dispatcher", async () => {
    const r = await call(handler, "spatial_resolve", { alias: "lathe", findCachePath: fcPath });
    expect(r.method).toBe("fuzzy");
    expect(r.nodeId).toBe("eng.lathe");
  });

  it("batch resolveMany via aliases[]", async () => {
    const r = await call(handler, "spatial_resolve", { aliases: ["eng.mill", "lathe", ""], findCachePath: fcPath });
    expect(r.results).toHaveLength(3);
    expect(r.results[0].nodeId).toBe("eng.mill");
    expect(r.results[1].nodeId).toBe("eng.lathe");
    expect(r.results[2].method).toBe("unknown");
  });

  it("missing text + no aliases -> structured dispatcherError (no crash)", async () => {
    const r = await call(handler, "spatial_resolve", { findCachePath: fcPath });
    expect(r.success).toBe(false);
    expect(r.error).toContain("requires a non-empty 'text'");
    expect(r.action).toBe("spatial_resolve");
  });
});
