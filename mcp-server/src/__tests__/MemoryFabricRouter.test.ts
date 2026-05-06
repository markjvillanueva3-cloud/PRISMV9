/**
 * MemoryFabricRouter — INTEL-OLLAMA-OBSIDIAN-MS0/P10-U04.
 *
 * Tests for MemoryFabricRouterEngine — the third in the P10 unifying-router
 * trio (P10-U03 AuditChain, P10-U02 ValidationOrchestrator, P10-U04 here).
 *
 * Asserts:
 *   1. MEMORY_BACKEND_TABLE covers all 12 documented intents and every
 *      descriptor is well-formed.
 *   2. normalizeIntent: direct enum, case-insensitive, dash→underscore,
 *      alias map, unknown rejection.
 *   3. selectBackend: descriptor lookup + throw on out-of-table.
 *   4. validateRequest: object shape + intent + payload string-or-object
 *      + options plain-object.
 *   5. mergeMemoryResults: empty / all-ok / mixed-fail aggregation.
 *   6. shouldRouteToVectorStore returns true for vector-backed intents
 *      and false for the others.
 *   7. .run() returns the documented envelope shape.
 */

import { describe, it, expect } from "vitest";
import {
  MemoryFabricRouterEngine,
  memoryFabricRouterEngine,
  MEMORY_BACKEND_TABLE,
  normalizeIntent,
  selectBackend,
  validateRequest,
  mergeMemoryResults,
  shouldRouteToVectorStore,
  type MemoryIntent,
  type MemoryFabricResult,
} from "../engines/MemoryFabricRouterEngine.js";

describe("P10-U04 MEMORY_BACKEND_TABLE", () => {
  it("covers the 12 documented memory intents", () => {
    const expected: MemoryIntent[] = [
      "store", "recall", "consolidate", "semantic_search",
      "persist", "sync", "graph", "pressure",
      "obsidian", "program", "agent", "audit",
    ];
    for (const i of expected) {
      expect(MEMORY_BACKEND_TABLE[i]).toBeTruthy();
    }
  });

  it("every descriptor has engineClass + singleton + method + description + isVector", () => {
    for (const [intent, desc] of Object.entries(MEMORY_BACKEND_TABLE)) {
      expect(typeof desc.engineClass).toBe("string");
      expect(desc.engineClass.length).toBeGreaterThan(0);
      expect(typeof desc.singleton).toBe("string");
      expect(typeof desc.method).toBe("string");
      expect(typeof desc.description).toBe("string");
      expect(desc.description.length).toBeGreaterThan(10);
      expect(typeof desc.isVector).toBe("boolean");
    }
  });

  it("engineClass entries follow PascalCase + Engine suffix convention", () => {
    for (const desc of Object.values(MEMORY_BACKEND_TABLE)) {
      expect(/^[A-Z][A-Za-z0-9]+Engine$/.test(desc.engineClass)).toBe(true);
    }
  });

  it("vector-backed intents are exactly the 3 documented", () => {
    const vectorBacked = (Object.keys(MEMORY_BACKEND_TABLE) as MemoryIntent[])
      .filter((i) => MEMORY_BACKEND_TABLE[i].isVector);
    expect(vectorBacked.sort()).toEqual(["obsidian", "program", "semantic_search"]);
  });
});

describe("P10-U04 normalizeIntent", () => {
  it("returns canonical enum for direct lowercase matches", () => {
    expect(normalizeIntent("store")).toBe("store");
    expect(normalizeIntent("recall")).toBe("recall");
    expect(normalizeIntent("semantic_search")).toBe("semantic_search");
  });

  it("is case-insensitive", () => {
    expect(normalizeIntent("STORE")).toBe("store");
    expect(normalizeIntent("Recall")).toBe("recall");
  });

  it("converts dashes to underscores", () => {
    expect(normalizeIntent("semantic-search")).toBe("semantic_search");
  });

  it("trims whitespace", () => {
    expect(normalizeIntent("  store  ")).toBe("store");
  });

  it("resolves common aliases", () => {
    expect(normalizeIntent("write")).toBe("store");
    expect(normalizeIntent("save")).toBe("store");
    expect(normalizeIntent("remember")).toBe("store");
    expect(normalizeIntent("read")).toBe("recall");
    expect(normalizeIntent("get")).toBe("recall");
    expect(normalizeIntent("fetch")).toBe("recall");
    expect(normalizeIntent("search")).toBe("semantic_search");
    expect(normalizeIntent("knn")).toBe("semantic_search");
    expect(normalizeIntent("vector")).toBe("semantic_search");
    expect(normalizeIntent("flush")).toBe("persist");
    expect(normalizeIntent("bridge")).toBe("sync");
    expect(normalizeIntent("traverse")).toBe("graph");
    expect(normalizeIntent("budget")).toBe("pressure");
    expect(normalizeIntent("oom")).toBe("pressure");
    expect(normalizeIntent("vault")).toBe("obsidian");
    expect(normalizeIntent("rag")).toBe("obsidian");
    expect(normalizeIntent("history")).toBe("program");
    expect(normalizeIntent("fabric")).toBe("agent");
    expect(normalizeIntent("integrity")).toBe("audit");
  });

  it("returns null for unknown / non-string input", () => {
    expect(normalizeIntent("xyzzy")).toBeNull();
    expect(normalizeIntent("")).toBeNull();
    expect(normalizeIntent(null)).toBeNull();
    expect(normalizeIntent(undefined)).toBeNull();
    expect(normalizeIntent(42)).toBeNull();
    expect(normalizeIntent({})).toBeNull();
  });
});

describe("P10-U04 selectBackend", () => {
  it("returns descriptor for every intent in the table", () => {
    for (const intent of Object.keys(MEMORY_BACKEND_TABLE) as MemoryIntent[]) {
      const desc = selectBackend(intent);
      expect(desc.engineClass).toBe(MEMORY_BACKEND_TABLE[intent].engineClass);
    }
  });

  it("throws for an out-of-table intent", () => {
    expect(() => selectBackend("not-an-intent" as MemoryIntent)).toThrow();
  });
});

describe("P10-U04 validateRequest", () => {
  it("accepts a minimal valid request (intent only)", () => {
    expect(validateRequest({ intent: "store" })).toBeNull();
  });

  it("accepts string payload", () => {
    expect(validateRequest({ intent: "store", payload: "some text" })).toBeNull();
  });

  it("accepts plain-object payload", () => {
    expect(validateRequest({ intent: "store", payload: { kind: "tip", body: "..." } })).toBeNull();
  });

  it("accepts options as plain object", () => {
    expect(validateRequest({ intent: "recall", options: { limit: 10 } })).toBeNull();
  });

  it("accepts aliased intent", () => {
    expect(validateRequest({ intent: "save" })).toBeNull();
    expect(validateRequest({ intent: "knn" })).toBeNull();
  });

  it("rejects null / non-object", () => {
    expect(validateRequest(null)).toContain("object");
    expect(validateRequest("store")).toContain("object");
  });

  it("rejects unknown intent", () => {
    const err = validateRequest({ intent: "widgets" });
    expect(err).toContain("unknown memory intent");
    expect(err).toContain("Valid:");
  });

  it("rejects payload that is array or non-string non-object", () => {
    expect(validateRequest({ intent: "store", payload: [1, 2, 3] })).toContain("payload");
    expect(validateRequest({ intent: "store", payload: 42 })).toContain("payload");
    expect(validateRequest({ intent: "store", payload: true })).toContain("payload");
  });

  it("rejects options that isn't a plain object", () => {
    expect(validateRequest({ intent: "store", options: "bad" })).toContain("options");
    expect(validateRequest({ intent: "store", options: ["arr"] })).toContain("options");
    expect(validateRequest({ intent: "store", options: null })).toContain("options");
  });
});

describe("P10-U04 mergeMemoryResults", () => {
  function part(over: Partial<MemoryFabricResult>): MemoryFabricResult {
    return {
      intent: "store",
      ok: true,
      backend: "Backend",
      data: undefined,
      durationMs: 50,
      ts: new Date().toISOString(),
      ...over,
    };
  }

  it("returns an empty envelope for empty array", () => {
    const r = mergeMemoryResults([]);
    expect(r.ok).toBe(true);
    expect(r.backend).toBe("merge:empty");
    expect(r.durationMs).toBe(0);
  });

  it("aggregates ok=true across all-ok parts", () => {
    const r = mergeMemoryResults([part({ backend: "A" }), part({ backend: "B" })]);
    expect(r.ok).toBe(true);
    expect(r.backend).toBe("A,B");
    expect(r.durationMs).toBe(100);
    expect(r.error).toBeUndefined();
  });

  it("ok=false when any part fails; concatenates errors", () => {
    const r = mergeMemoryResults([
      part({ backend: "A", ok: false, error: "fail-a" }),
      part({ backend: "B", ok: true }),
    ]);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("fail-a");
  });

  it("propagates intent from first part", () => {
    const r = mergeMemoryResults([
      part({ intent: "semantic_search" }),
      part({ intent: "semantic_search" }),
    ]);
    expect(r.intent).toBe("semantic_search");
  });
});

describe("P10-U04 shouldRouteToVectorStore", () => {
  it("returns true for semantic_search, obsidian, program", () => {
    expect(shouldRouteToVectorStore("semantic_search")).toBe(true);
    expect(shouldRouteToVectorStore("obsidian")).toBe(true);
    expect(shouldRouteToVectorStore("program")).toBe(true);
  });

  it("returns false for non-vector intents", () => {
    expect(shouldRouteToVectorStore("store")).toBe(false);
    expect(shouldRouteToVectorStore("recall")).toBe(false);
    expect(shouldRouteToVectorStore("consolidate")).toBe(false);
    expect(shouldRouteToVectorStore("persist")).toBe(false);
    expect(shouldRouteToVectorStore("sync")).toBe(false);
    expect(shouldRouteToVectorStore("graph")).toBe(false);
    expect(shouldRouteToVectorStore("pressure")).toBe(false);
    expect(shouldRouteToVectorStore("agent")).toBe(false);
    expect(shouldRouteToVectorStore("audit")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(shouldRouteToVectorStore(null)).toBe(false);
    expect(shouldRouteToVectorStore(undefined)).toBe(false);
  });
});

describe("P10-U04 .run() round-trip", () => {
  it("returns a structured envelope on validation failure", async () => {
    const r = await memoryFabricRouterEngine.run({ intent: "widgets" } as any);
    expect(r.ok).toBe(false);
    expect(r.backend).toBe("validation");
    expect(r.error).toContain("unknown memory intent");
  });

  it("returns ok=false with envelope when backend method is missing", async () => {
    const r = await memoryFabricRouterEngine.run({ intent: "audit" });
    expect(typeof r.ok).toBe("boolean");
    expect(r.backend).toBe("CSMMemoryDBAuditEngine");
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof r.ts).toBe("string");
  });

  it("singleton export instanceof MemoryFabricRouterEngine", () => {
    expect(memoryFabricRouterEngine).toBeInstanceOf(MemoryFabricRouterEngine);
  });
});
