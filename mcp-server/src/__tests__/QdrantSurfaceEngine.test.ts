/**
 * QdrantSurfaceEngine tests — TOOL-INVENTORY-MS0/U-TOOLINV-01
 *
 * Real-value assertions only. The surface is a pure translation layer over
 * an injected engine — every test injects a deterministic mock via
 * `deps.engine` and asserts the exact translated shape, error code, and
 * field, NOT just `toBeDefined()`. Failure modes are exercised with a
 * throwing mock and an `{ok:false}` mock so the INTERNAL vs QDRANT_ERROR
 * split is verified, not assumed.
 */

import { describe, it, expect } from "vitest";
import {
  QdrantSurfaceEngine,
  QDRANT_SURFACE_COLLECTION_PREFIX,
  QDRANT_SURFACE_MAX_LIMIT,
  QDRANT_SURFACE_DEFAULT_LIMIT,
  QDRANT_SURFACE_MAX_TEXT_CHARS,
  QDRANT_SURFACE_MCP_NAME,
  type SurfaceEngineLike,
} from "../engines/QdrantSurfaceEngine.js";
import { MEMORY_KINDS, type MemoryItem } from "../engines/QdrantMemoryEngine.js";

// ── mock builders ──────────────────────────────────────────────────────

function okRecallEngine(items: MemoryItem[]): SurfaceEngineLike {
  return {
    async recall() {
      return { ok: true as const, value: items };
    },
    async remember() {
      return { ok: true as const, value: undefined };
    },
  };
}

function okRememberEngine(): {
  engine: SurfaceEngineLike;
  calls: Array<{ kind: string; id: string | number; text: string }>;
} {
  const calls: Array<{ kind: string; id: string | number; text: string }> = [];
  return {
    calls,
    engine: {
      async recall() {
        return { ok: true as const, value: [] };
      },
      async remember(input) {
        calls.push({ kind: input.kind, id: input.id, text: input.text });
        return { ok: true as const, value: undefined };
      },
    },
  };
}

function failingEngine(msg: string): SurfaceEngineLike {
  return {
    async recall() {
      return { ok: false as const, error: msg };
    },
    async remember() {
      return { ok: false as const, error: msg };
    },
  };
}

function failingEngineWithCause(
  msg: string,
  cause: unknown,
): SurfaceEngineLike {
  return {
    async recall() {
      return { ok: false as const, error: msg, cause };
    },
    async remember() {
      return { ok: false as const, error: msg, cause };
    },
  };
}

function throwingEngine(msg: string): SurfaceEngineLike {
  return {
    async recall(): Promise<never> {
      throw new Error(msg);
    },
    async remember(): Promise<never> {
      throw new Error(msg);
    },
  };
}

const SAMPLE_HIT: MemoryItem = {
  id: "tip-42",
  kind: "tip",
  text: "Kienzle force scales with chip thickness exponent",
  metadata: { source: "sandvik" },
  score: 0.87,
  createdAt: "2026-05-16T10:00:00.000Z",
};

// ── parseCollection ────────────────────────────────────────────────────

describe("QdrantSurfaceEngine.parseCollection", () => {
  it("resolves a bare kind shorthand", () => {
    const r = QdrantSurfaceEngine.parseCollection("tip");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("tip");
  });

  it("resolves the fully-qualified prism_memory_ form", () => {
    const r = QdrantSurfaceEngine.parseCollection("prism_memory_outcome");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("outcome");
  });

  it("trims surrounding whitespace before resolving", () => {
    const r = QdrantSurfaceEngine.parseCollection("  formula  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("formula");
  });

  it("rejects an empty string with INVALID_INPUT", () => {
    const r = QdrantSurfaceEngine.parseCollection("");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INVALID_INPUT");
      expect(r.field).toBe("collection");
    }
  });

  it("rejects an unknown kind with UNKNOWN_COLLECTION + valid-kind list", () => {
    const r = QdrantSurfaceEngine.parseCollection("not_a_kind");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("UNKNOWN_COLLECTION");
      expect(r.error).toContain("valid kinds:");
      // every real kind name must appear in the help message
      for (const k of MEMORY_KINDS) expect(r.error).toContain(k);
    }
  });

  it("does NOT treat a prefixed-but-unknown kind as valid", () => {
    const r = QdrantSurfaceEngine.parseCollection("prism_memory_bogus");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("UNKNOWN_COLLECTION");
  });

  it("rejects reserved object keys as UNKNOWN_COLLECTION (no proto-key sink)", () => {
    // The resolved value is matched against the MEMORY_KINDS literal allow-
    // list via Array.includes (a value check, not a property access) and is
    // never used as an object key anywhere in the surface — so a hostile
    // collection name cannot reach a prototype-pollution sink. These assert
    // the allow-list closes the class outright.
    for (const hostile of [
      "__proto__",
      "constructor",
      "prototype",
      "prism_memory___proto__",
      "toString",
    ]) {
      const r = QdrantSurfaceEngine.parseCollection(hostile);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("UNKNOWN_COLLECTION");
    }
  });

  it("rejects a single-strip that does not bottom out in a valid kind", () => {
    // "prism_memory_prism_memory_tip" → ONE strip → "prism_memory_tip"
    // which is NOT in MEMORY_KINDS (strip is single, not looped).
    const r = QdrantSurfaceEngine.parseCollection(
      "prism_memory_prism_memory_tip",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("UNKNOWN_COLLECTION");
  });
});

// ── vectorSearch happy path ────────────────────────────────────────────

describe("QdrantSurfaceEngine.vectorSearch — happy path", () => {
  it("translates an engine hit into the MCP surface hit shape", async () => {
    const r = await QdrantSurfaceEngine.vectorSearch(
      { collection: "tip", query: "kienzle" },
      { engine: okRecallEngine([SAMPLE_HIT]) },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.collection).toBe("tip");
      expect(r.value.kind).toBe("tip");
      expect(r.value.hits).toHaveLength(1);
      const h = r.value.hits[0];
      expect(h.id).toBe("tip-42");
      expect(h.text).toBe("Kienzle force scales with chip thickness exponent");
      expect(h.score).toBe(0.87);
      expect(h.metadata).toEqual({ source: "sandvik" });
      expect(h.createdAt).toBe("2026-05-16T10:00:00.000Z");
      // surface hit must NOT leak the internal `kind` field per-hit
      expect("kind" in h).toBe(false);
    }
  });

  it("returns an empty hit array for an empty collection (no error)", async () => {
    const r = await QdrantSurfaceEngine.vectorSearch(
      { collection: "prism_memory_note", query: "anything" },
      { engine: okRecallEngine([]) },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.hits).toEqual([]);
      expect(r.value.kind).toBe("note");
    }
  });

  it("forwards limit + filter to the engine recall call", async () => {
    let captured: unknown = null;
    const spy: SurfaceEngineLike = {
      async recall(input) {
        captured = input;
        return { ok: true as const, value: [] };
      },
      async remember() {
        return { ok: true as const, value: undefined };
      },
    };
    await QdrantSurfaceEngine.vectorSearch(
      { collection: "tip", query: "q", limit: 5, filter: { source: "x" } },
      { engine: spy },
    );
    expect(captured).toEqual({
      kind: "tip",
      query: "q",
      limit: 5,
      filter: { source: "x" },
    });
  });

  it("defaults limit to QDRANT_SURFACE_DEFAULT_LIMIT when omitted", async () => {
    let captured: { limit?: number } = {};
    const spy: SurfaceEngineLike = {
      async recall(input) {
        captured = input;
        return { ok: true as const, value: [] };
      },
      async remember() {
        return { ok: true as const, value: undefined };
      },
    };
    await QdrantSurfaceEngine.vectorSearch(
      { collection: "tip", query: "q" },
      { engine: spy },
    );
    expect(captured.limit).toBe(QDRANT_SURFACE_DEFAULT_LIMIT);
    expect(QDRANT_SURFACE_DEFAULT_LIMIT).toBe(10);
  });
});

// ── vectorSearch failure modes ─────────────────────────────────────────

describe("QdrantSurfaceEngine.vectorSearch — failure modes", () => {
  it("rejects an empty query with INVALID_INPUT/query", async () => {
    const r = await QdrantSurfaceEngine.vectorSearch(
      { collection: "tip", query: "   " },
      { engine: okRecallEngine([]) },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INVALID_INPUT");
      expect(r.field).toBe("query");
    }
  });

  it("rejects limit above QDRANT_SURFACE_MAX_LIMIT", async () => {
    const r = await QdrantSurfaceEngine.vectorSearch(
      { collection: "tip", query: "q", limit: QDRANT_SURFACE_MAX_LIMIT + 1 },
      { engine: okRecallEngine([]) },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INVALID_INPUT");
      expect(r.field).toBe("limit");
    }
  });

  it("rejects limit = 0 (boundary)", async () => {
    const r = await QdrantSurfaceEngine.vectorSearch(
      { collection: "tip", query: "q", limit: 0 },
      { engine: okRecallEngine([]) },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INVALID_INPUT");
  });

  it("rejects a non-integer limit", async () => {
    const r = await QdrantSurfaceEngine.vectorSearch(
      { collection: "tip", query: "q", limit: 3.7 },
      { engine: okRecallEngine([]) },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INVALID_INPUT");
  });

  it("rejects an array filter (adversarial — not a plain object)", async () => {
    const r = await QdrantSurfaceEngine.vectorSearch(
      {
        collection: "tip",
        query: "q",
        filter: [1, 2] as unknown as Record<string, unknown>,
      },
      { engine: okRecallEngine([]) },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INVALID_INPUT");
      expect(r.field).toBe("filter");
    }
  });

  it("maps engine {ok:false} to QDRANT_ERROR with propagated message", async () => {
    const r = await QdrantSurfaceEngine.vectorSearch(
      { collection: "tip", query: "q" },
      { engine: failingEngine("qdrant not connected") },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("QDRANT_ERROR");
      expect(r.error).toBe("qdrant not connected");
    }
  });

  it("catches an engine throw and downgrades to INTERNAL", async () => {
    const r = await QdrantSurfaceEngine.vectorSearch(
      { collection: "tip", query: "q" },
      { engine: throwingEngine("socket hang up") },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INTERNAL");
      expect(r.error).toContain("socket hang up");
    }
  });

  it("surfaces the engine's root cause on QDRANT_ERROR (R12 fail-loud)", async () => {
    const rootErr = new Error("ECONNREFUSED 127.0.0.1:6333");
    const r = await QdrantSurfaceEngine.vectorSearch(
      { collection: "tip", query: "q" },
      { engine: failingEngineWithCause("qdrant not connected", rootErr) },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("QDRANT_ERROR");
      expect(r.error).toBe("qdrant not connected");
      // the raw cause must propagate verbatim — NOT flattened to a string
      expect(r.cause).toBe(rootErr);
      expect((r.cause as Error).message).toContain("ECONNREFUSED");
    }
  });

  it("carries the thrown exception as INTERNAL cause", async () => {
    const r = await QdrantSurfaceEngine.vectorSearch(
      { collection: "tip", query: "q" },
      { engine: throwingEngine("kaboom") },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INTERNAL");
      expect(r.cause).toBeInstanceOf(Error);
      expect((r.cause as Error).message).toBe("kaboom");
    }
  });

  it("propagates UNKNOWN_COLLECTION before touching the engine", async () => {
    let touched = false;
    const guard: SurfaceEngineLike = {
      async recall() {
        touched = true;
        return { ok: true as const, value: [] };
      },
      async remember() {
        return { ok: true as const, value: undefined };
      },
    };
    const r = await QdrantSurfaceEngine.vectorSearch(
      { collection: "garbage", query: "q" },
      { engine: guard },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("UNKNOWN_COLLECTION");
    expect(touched).toBe(false);
  });

  it("rejects a null input", async () => {
    const r = await QdrantSurfaceEngine.vectorSearch(
      null as unknown as { collection: string; query: string },
      { engine: okRecallEngine([]) },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INVALID_INPUT");
  });
});

// ── vectorUpsert happy path ────────────────────────────────────────────

describe("QdrantSurfaceEngine.vectorUpsert — happy path", () => {
  it("forwards the resolved kind + id + text to engine.remember", async () => {
    const { engine, calls } = okRememberEngine();
    const r = await QdrantSurfaceEngine.vectorUpsert(
      {
        collection: "prism_memory_outcome",
        id: 77,
        text: "cut OK at 1200 sfm",
        metadata: { machine: "haas-vf2" },
      },
      { engine },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.collection).toBe("prism_memory_outcome");
      expect(r.value.kind).toBe("outcome");
      expect(r.value.id).toBe(77);
    }
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      kind: "outcome",
      id: 77,
      text: "cut OK at 1200 sfm",
    });
  });

  it("accepts a string id", async () => {
    const { engine } = okRememberEngine();
    const r = await QdrantSurfaceEngine.vectorUpsert(
      { collection: "note", id: "note-abc", text: "hi" },
      { engine },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.id).toBe("note-abc");
  });

  it("accepts numeric id 0 (falsy-but-valid boundary)", async () => {
    // `id === ""` / null / undefined are the only empty-id rejects; 0 is a
    // legitimate Qdrant point id and Number.isFinite(0) is true.
    const { engine, calls } = okRememberEngine();
    const r = await QdrantSurfaceEngine.vectorUpsert(
      { collection: "note", id: 0, text: "zero-id" },
      { engine },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.id).toBe(0);
    expect(calls[0]?.id).toBe(0);
  });
});

// ── vectorUpsert failure modes ─────────────────────────────────────────

describe("QdrantSurfaceEngine.vectorUpsert — failure modes", () => {
  it("rejects empty text", async () => {
    const r = await QdrantSurfaceEngine.vectorUpsert(
      { collection: "note", id: "x", text: "  " },
      { engine: okRememberEngine().engine },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INVALID_INPUT");
      expect(r.field).toBe("text");
    }
  });

  it("rejects text over QDRANT_SURFACE_MAX_TEXT_CHARS (resource boundary)", async () => {
    const r = await QdrantSurfaceEngine.vectorUpsert(
      {
        collection: "note",
        id: "x",
        text: "a".repeat(QDRANT_SURFACE_MAX_TEXT_CHARS + 1),
      },
      { engine: okRememberEngine().engine },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INVALID_INPUT");
      expect(r.field).toBe("text");
    }
  });

  it("rejects an empty-string id", async () => {
    const r = await QdrantSurfaceEngine.vectorUpsert(
      { collection: "note", id: "", text: "hi" },
      { engine: okRememberEngine().engine },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INVALID_INPUT");
      expect(r.field).toBe("id");
    }
  });

  it("rejects NaN id (adversarial — non-finite number)", async () => {
    const r = await QdrantSurfaceEngine.vectorUpsert(
      { collection: "note", id: NaN, text: "hi" },
      { engine: okRememberEngine().engine },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INVALID_INPUT");
      expect(r.field).toBe("id");
    }
  });

  it("rejects Infinity id (adversarial)", async () => {
    const r = await QdrantSurfaceEngine.vectorUpsert(
      { collection: "note", id: Infinity, text: "hi" },
      { engine: okRememberEngine().engine },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INVALID_INPUT");
  });

  it("rejects an array metadata (adversarial)", async () => {
    const r = await QdrantSurfaceEngine.vectorUpsert(
      {
        collection: "note",
        id: "x",
        text: "hi",
        metadata: ["a"] as unknown as Record<string, unknown>,
      },
      { engine: okRememberEngine().engine },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("metadata");
  });

  it("maps engine {ok:false} to QDRANT_ERROR", async () => {
    const r = await QdrantSurfaceEngine.vectorUpsert(
      { collection: "note", id: "x", text: "hi" },
      { engine: failingEngine("embedder not configured") },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("QDRANT_ERROR");
      expect(r.error).toBe("embedder not configured");
    }
  });

  it("catches an engine throw and downgrades to INTERNAL", async () => {
    const r = await QdrantSurfaceEngine.vectorUpsert(
      { collection: "note", id: "x", text: "hi" },
      { engine: throwingEngine("disk full") },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INTERNAL");
      expect(r.error).toContain("disk full");
    }
  });
});

// ── listCollections + httpCodeFor ──────────────────────────────────────

describe("QdrantSurfaceEngine.listCollections", () => {
  it("returns one fully-qualified name per memory kind", () => {
    const cols = QdrantSurfaceEngine.listCollections();
    expect(cols).toHaveLength(MEMORY_KINDS.length);
    for (const k of MEMORY_KINDS) {
      expect(cols).toContain(`${QDRANT_SURFACE_COLLECTION_PREFIX}${k}`);
    }
    // every entry round-trips back through parseCollection
    for (const c of cols) {
      const p = QdrantSurfaceEngine.parseCollection(c);
      expect(p.ok).toBe(true);
    }
  });
});

describe("QdrantSurfaceEngine.httpCodeFor", () => {
  it("maps client errors to 400 and server errors to 500", () => {
    expect(QdrantSurfaceEngine.httpCodeFor("INVALID_INPUT")).toBe(400);
    expect(QdrantSurfaceEngine.httpCodeFor("UNKNOWN_COLLECTION")).toBe(400);
    expect(QdrantSurfaceEngine.httpCodeFor("QDRANT_ERROR")).toBe(500);
    expect(QdrantSurfaceEngine.httpCodeFor("INTERNAL")).toBe(500);
  });
});

describe("QdrantSurfaceEngine — constants", () => {
  it("exposes a non-colliding MCP name", () => {
    expect(QDRANT_SURFACE_MCP_NAME).toBe("prism-qdrant");
    // must NOT be the bare external name (collision-avoidance invariant)
    expect(QDRANT_SURFACE_MCP_NAME).not.toBe("qdrant");
  });
});
