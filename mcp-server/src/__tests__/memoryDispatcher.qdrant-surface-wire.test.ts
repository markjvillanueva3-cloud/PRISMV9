/**
 * memoryDispatcher.qdrant-surface-wire.test.ts
 *
 * TOOL-INVENTORY-MS0/U-TOOLINV-01 — round-trip wire test for the
 * qdrant_vector_search / qdrant_vector_upsert actions that expose
 * QdrantSurfaceEngine through the prism_memory dispatcher.
 *
 * QdrantSurfaceEngine itself is exhaustively unit-tested in
 * QdrantSurfaceEngine.test.ts (37 cases). This file verifies ONLY the
 * wiring seam, using the surface's PRE-ENGINE validation path so the
 * assertions are deterministic WITHOUT a live Qdrant daemon: a malformed
 * request round-trips enum -> schema -> case handler -> QdrantSurfaceEngine
 * -> structured error envelope, and the dispatcher maps the surface code to
 * a numeric httpCode for external-MCP wire parity.
 *
 * Plus a COMPILE-TIME guard (the deferred P3 from per-file scrutiny): if a
 * future change widens SurfaceEngineLike so the real QdrantMemoryEngine no
 * longer satisfies it, this file fails tsc — catching the silent-cast drift
 * the round-1 reviewer flagged.
 */

import { describe, it, expect } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMemoryDispatcher } from "../tools/dispatchers/memoryDispatcher.js";
import { ACTION_MEMORY_SCHEMAS } from "../schemas/memoryActionSchemas.js";
import type { SurfaceEngineLike } from "../engines/QdrantSurfaceEngine.js";
import { qdrantMemoryEngine } from "../engines/QdrantMemoryEngine.js";

// COMPILE-TIME GUARD (deferred-P3 closure): if SurfaceEngineLike is ever
// widened past what the real engine implements, this assignment fails tsc
// so the cast in QdrantSurfaceEngine.resolveEngine() cannot silently rot.
// Type-only — never executed.
const _engineSatisfiesSurface: SurfaceEngineLike = qdrantMemoryEngine;
void _engineSatisfiesSurface;

interface CapturedTool {
  handler: (args: {
    action: string;
    params?: Record<string, unknown>;
  }) => Promise<{ content?: Array<{ text?: string }> }>;
}

function createServer(): Promise<CapturedTool["handler"]> {
  let resolve!: (h: CapturedTool["handler"]) => void;
  const handlerPromise = new Promise<CapturedTool["handler"]>(
    (r) => (resolve = r),
  );
  // The dispatcher only calls `.tool(name, desc, schema, fn)` — a minimal
  // shim is sufficient; the McpServer cast scopes the surface we depend on.
  const fakeServer = {
    tool(
      _name: string,
      _desc: string,
      _schema: unknown,
      fn: CapturedTool["handler"],
    ) {
      resolve(fn);
    },
  };
  registerMemoryDispatcher(fakeServer as unknown as McpServer);
  return handlerPromise;
}

async function call(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return r as unknown as Record<string, unknown>;
  }
}

describe("memoryDispatcher — qdrant surface schema behavior", () => {
  it("validates a well-formed vector_search request and strips nothing required", () => {
    const parsed = ACTION_MEMORY_SCHEMAS.qdrant_vector_search.safeParse({
      collection: "tip",
      query: "kienzle",
      limit: 5,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.collection).toBe("tip");
      expect(parsed.data.query).toBe("kienzle");
      expect(parsed.data.limit).toBe(5);
    }
  });

  it("rejects vector_search with a missing query (required field)", () => {
    const parsed = ACTION_MEMORY_SCHEMAS.qdrant_vector_search.safeParse({
      collection: "tip",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects vector_search limit above the 100 cap", () => {
    const parsed = ACTION_MEMORY_SCHEMAS.qdrant_vector_search.safeParse({
      collection: "tip",
      query: "q",
      limit: 101,
    });
    expect(parsed.success).toBe(false);
  });

  it("validates a well-formed vector_upsert and preserves id type", () => {
    const parsed = ACTION_MEMORY_SCHEMAS.qdrant_vector_upsert.safeParse({
      collection: "note",
      id: 42,
      text: "stored",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.id).toBe(42);
  });

  it("rejects vector_upsert with empty text", () => {
    const parsed = ACTION_MEMORY_SCHEMAS.qdrant_vector_upsert.safeParse({
      collection: "note",
      id: "x",
      text: "",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("memoryDispatcher — qdrant surface round-trip", () => {
  it("round-trips an empty query to a 400 INVALID_INPUT envelope (no Qdrant needed)", async () => {
    const handler = await createServer();
    const res = await call(handler, "qdrant_vector_search", {
      collection: "tip",
      query: "   ",
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("INVALID_INPUT");
    expect(res.httpCode).toBe(400);
    expect(res.field).toBe("query");
  });

  it("round-trips an unknown collection to a 400 UNKNOWN_COLLECTION envelope", async () => {
    const handler = await createServer();
    const res = await call(handler, "qdrant_vector_search", {
      collection: "not_a_real_kind",
      query: "anything",
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("UNKNOWN_COLLECTION");
    expect(res.httpCode).toBe(400);
  });

  it("round-trips empty upsert text to a 400 INVALID_INPUT/text envelope", async () => {
    const handler = await createServer();
    const res = await call(handler, "qdrant_vector_upsert", {
      collection: "note",
      id: "k1",
      text: "  ",
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("INVALID_INPUT");
    expect(res.httpCode).toBe(400);
    expect(res.field).toBe("text");
  });

  it("round-trips a reserved-key collection to UNKNOWN_COLLECTION/400 (proto-key class closed end-to-end)", async () => {
    const handler = await createServer();
    const res = await call(handler, "qdrant_vector_upsert", {
      collection: "__proto__",
      id: "k1",
      text: "real text",
    });
    expect(res.ok).toBe(false);
    expect(res.code).toBe("UNKNOWN_COLLECTION");
    expect(res.httpCode).toBe(400);
  });

  it("a valid-shape vector_search reaches the engine seam (QDRANT_ERROR/500 if Qdrant down, real hits if up)", async () => {
    const handler = await createServer();
    const res = await call(handler, "qdrant_vector_search", {
      collection: "tip",
      query: "a valid query that passes surface validation",
      limit: 3,
    });
    if (res.ok === true) {
      // Qdrant up in this environment — assert the real translated shape.
      expect(res.kind).toBe("tip");
      expect(Array.isArray(res.hits)).toBe(true);
    } else {
      // Qdrant down (CI / no daemon): seam still proven — surface
      // validation passed, engine was reached, error normalized + coded.
      expect(["QDRANT_ERROR", "INTERNAL"]).toContain(res.code);
      expect(res.httpCode).toBe(500);
      expect(typeof res.error).toBe("string");
      expect((res.error as string).length).toBeGreaterThan(0);
    }
  });

  it("unknown action fallback enumerates both new actions as available", async () => {
    const handler = await createServer();
    const res = await call(handler, "definitely_not_an_action", {});
    expect(String(res.error)).toContain("Unknown action");
    expect(res.available as string[]).toContain("qdrant_vector_search");
    expect(res.available as string[]).toContain("qdrant_vector_upsert");
  });
});
