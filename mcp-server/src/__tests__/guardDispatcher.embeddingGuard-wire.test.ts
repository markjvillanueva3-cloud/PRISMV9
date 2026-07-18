/**
 * Round-trip wiring test for prism_guard:embedding_guard_evaluate
 * (XGAL-WIRE / U-XGAL-EMBEDDING-GUARD). Invokes THROUGH the registered
 * guardDispatcher handler (normalizeParams + schema validation + dispatch).
 *
 * Hermetic: references carry PRECOMPUTED vectors and the candidate uses the
 * exact-name fast-path, so NO ONNX model loads/infers. The green/yellow/red
 * cosine band logic itself is covered by EmbeddingGuardEngine.test.ts.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";

// Mock the ONNX embedder with a deterministic vector-by-text map keyed on the
// EXACT `${name}\n${description}` format the dispatcher + engine must agree on.
// This exercises the embed-REFERENCE path (no precomputed vector) and is the
// regression test for the scrutiny P1: a space-join regression would produce a
// key the map lacks -> ok:false -> reference skipped -> wrong band. All module
// exports are provided so no transitive consumer breaks.
vi.mock("../engines/LocalEmbeddingEngine.js", () => {
  const map: Record<string, number[]> = {
    "WidgetHasher\ncomputes widget hashing": [1, 0, 0],
    "DupEngine\ncomputes widget hashing": [1, 0, 0], // identical content -> cosine 1 -> red
    "FarAway\nunrelated topic entirely": [0, 0, 1], // orthogonal -> cosine 0 -> green
  };
  return {
    DEFAULT_MODEL: "mock-model",
    DEFAULT_DIM: 3,
    LocalEmbeddingEngine: class {
      // Fail LOUD if a future consumer instantiates the class directly instead of
      // using the singleton (no current path does -- this keeps the mock honest).
      async embed(): Promise<never> {
        throw new Error("test mock: use the localEmbeddingEngine singleton, not new LocalEmbeddingEngine()");
      }
    },
    localEmbeddingEngine: {
      async embed(text: string) {
        const v = map[text];
        return v ? { ok: true, vector: v, error: null } : { ok: false, vector: [], error: `unmapped: ${JSON.stringify(text)}` };
      },
    },
  };
});

import { registerGuardDispatcher } from "../tools/dispatchers/guardDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): Promise<Handler> {
  let resolve!: (h: Handler) => void;
  const p = new Promise<Handler>((r) => (resolve = r));
  registerGuardDispatcher({
    tool(_n: string, _d: string, _s: unknown, fn: Handler) {
      resolve(fn);
    },
  });
  return p;
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

const REFS = [
  { id: "r1", name: "FooEngine", description: "computes foo", vector: [1, 0] },
  { id: "r2", name: "BarEngine", description: "computes bar", vector: [0, 1] },
];

describe("guardDispatcher - embedding_guard_evaluate wiring (E2E round-trip)", () => {
  let handler: Handler;
  beforeAll(async () => {
    vi.setConfig({ testTimeout: 30_000 });
    handler = await createServer();
  });

  it("exact-name collision -> red (precomputed ref vectors, no ONNX)", async () => {
    const r = await call(handler, "embedding_guard_evaluate", {
      candidate: { id: "c1", name: "FooEngine", description: "anything at all" },
      references: REFS,
    });
    expect(r.band).toBe("red");
    expect(r.rationale).toMatch(/exact name collision/);
    expect(r.referencesLoaded).toBe(2); // both refs loaded => none skipped
    expect(r.referencesSkipped?.length ?? 0).toBe(0); // count-direct; slimResponse may drop the empty array
    expect(r.requiresJustification).toBe(true);
  });

  it("no references -> green through the dispatcher", async () => {
    const r = await call(handler, "embedding_guard_evaluate", {
      candidate: { id: "c2", name: "Novel", description: "new" },
      references: [],
    });
    expect(r.band).toBe("green");
    expect(r.referencesLoaded).toBe(0);
    expect(r.requiresJustification).toBe(false);
  });

  it("custom config passes validation + flows through (exact-name still red)", async () => {
    const r = await call(handler, "embedding_guard_evaluate", {
      candidate: { id: "c3", name: "FooEngine", description: "x" },
      references: REFS,
      config: { yellowAt: 0.5, redAt: 0.6 },
    });
    expect(r.band).toBe("red");
    expect(r.referencesLoaded).toBe(2);
  });

  it("missing candidate -> structured dispatcherError (schema-rejected, no crash)", async () => {
    const r = await call(handler, "embedding_guard_evaluate", { references: [] });
    expect(r.success).toBe(false);
    expect(r.action).toBe("embedding_guard_evaluate");
  });

  // -- embed-REFERENCE path (no precomputed vector) via the mocked embedder.
  // Regression guard for the scrutiny P1: the dispatcher must embed references
  // with `${name}\n${description}` so reference + candidate share an embedding
  // space. A space-join regression -> unmapped key -> ok:false -> ref skipped ->
  // these assertions (referencesLoaded===1, band) fail.
  it("cosine RED via an embedded reference (identical content, different name)", async () => {
    const r = await call(handler, "embedding_guard_evaluate", {
      candidate: { id: "c", name: "WidgetHasher", description: "computes widget hashing" },
      references: [{ id: "r1", name: "DupEngine", description: "computes widget hashing" }],
    });
    expect(r.referencesLoaded).toBe(1); // ref embedded -> \n format matched the map keys
    expect(r.band).toBe("red");
    expect(r.topMatches[0].similarity).toBeGreaterThan(0.85);
  });

  it("cosine GREEN via an embedded reference (orthogonal content)", async () => {
    const r = await call(handler, "embedding_guard_evaluate", {
      candidate: { id: "c", name: "WidgetHasher", description: "computes widget hashing" },
      references: [{ id: "r1", name: "FarAway", description: "unrelated topic entirely" }],
    });
    expect(r.referencesLoaded).toBe(1);
    expect(r.band).toBe("green");
  });
});
