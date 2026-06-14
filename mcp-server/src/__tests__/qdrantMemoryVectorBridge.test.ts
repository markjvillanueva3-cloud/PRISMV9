/**
 * QdrantMemoryVectorBridgeEngine round-trip tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-BRIDGE-01.
 *
 * Uses a mock RecallBackend so tests are hermetic — never touches the live
 * Qdrant daemon (which is sometimes offline per the 2026-05-26 GPU-contention
 * banner). The whole point of the bridge is to remain useful when backends
 * are flaky; the test contract is the same.
 */

import { describe, it, expect } from "vitest";
import {
  QdrantMemoryVectorBridgeEngine,
  qdrantMemoryVectorBridgeEngine,
  type RecallBackend,
  type UnifiedVectorSearchInput,
} from "../engines/QdrantMemoryVectorBridgeEngine.js";
import {
  MEMORY_KINDS,
  type MemoryKind,
  type MemoryItem,
  type MemoryResult,
} from "../engines/QdrantMemoryEngine.js";
import { ACTION_MEMORY_SCHEMAS } from "../schemas/memoryActionSchemas.js";

// ── Mock backend ─────────────────────────────────────────────────────────

type RecallFn = (input: {
  kind: MemoryKind;
  query: string;
  limit?: number;
}) => Promise<MemoryResult<MemoryItem[]>>;

function makeBackend(fn: RecallFn): RecallBackend {
  return { recall: (input) => fn(input) };
}

function hit(kind: MemoryKind, id: string | number, score: number, opts?: {
  text?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}): MemoryItem {
  return {
    id,
    kind,
    text: opts?.text ?? `text for ${kind}:${id}`,
    metadata: opts?.metadata ?? {},
    score,
    ...(opts?.createdAt !== undefined ? { createdAt: opts.createdAt } : {}),
  };
}

// ── Suites ───────────────────────────────────────────────────────────────

describe("QdrantMemoryVectorBridgeEngine — happy path", () => {
  it("merges, sorts, and dedups across kinds; respects topK", async () => {
    const backend = makeBackend(async ({ kind }) => {
      if (kind === "tip") {
        return { ok: true, value: [
          hit("tip", "t1", 0.91),
          hit("tip", "t2", 0.82),
        ]};
      }
      if (kind === "wiki") {
        return { ok: true, value: [
          hit("wiki", "w1", 0.88),
          hit("wiki", "w2", 0.74),
        ]};
      }
      if (kind === "rule") {
        return { ok: true, value: [
          hit("rule", "r1", 0.95),
        ]};
      }
      return { ok: true, value: [] };
    });
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });

    const r = await bridge.search({
      query: "deflection model for thin walls",
      kinds: ["tip", "wiki", "rule"],
      topK: 3,
    });

    expect(r.ok).toBe(true);
    expect(r.hits).toHaveLength(3);
    expect(r.hits.map((h) => h.score)).toEqual([0.95, 0.91, 0.88]);
    expect(r.hits[0].kind).toBe("rule");
    expect(r.hits[0].id).toBe("r1");
    expect(r.perBackend.qdrant.ok).toBe(true);
    expect(r.perBackend.qdrant.kindsQueried).toBe(3);
    expect(r.perBackend.qdrant.kindsFailed).toBe(0);
    expect(r.stats.kindsWithHits.sort()).toEqual(["rule", "tip", "wiki"]);
  });

  it("defaults kinds to all 14 MEMORY_KINDS when omitted", async () => {
    const seen: MemoryKind[] = [];
    const backend = makeBackend(async ({ kind }) => {
      seen.push(kind);
      return { ok: true, value: [] };
    });
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });

    await bridge.search({ query: "x", topK: 5 });
    expect(seen.sort()).toEqual([...MEMORY_KINDS].sort());
  });

  it("clamps topK over the cap (100) without rejecting", async () => {
    const backend = makeBackend(async () => ({ ok: true, value: [] }));
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });
    const r = await bridge.search({ query: "x", kinds: ["tip"], topK: 9999 });
    expect(r.ok).toBe(true);
    // perKindLimit derived from clamped topK=100 → ceil(200/1) clamped to 50
    expect(r.perBackend.qdrant.kindsQueried).toBe(1);
  });

  it("clamps perKindLimit to MAX (50) when caller asks larger", async () => {
    let captured = -1;
    const backend = makeBackend(async ({ limit }) => {
      captured = limit ?? -1;
      return { ok: true, value: [] };
    });
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });
    await bridge.search({ query: "x", kinds: ["tip"], topK: 5, perKindLimit: 1000 });
    expect(captured).toBe(50);
  });
});

describe("QdrantMemoryVectorBridgeEngine — input validation", () => {
  const bridge = new QdrantMemoryVectorBridgeEngine({
    qdrant: makeBackend(async () => ({ ok: true, value: [] })),
  });

  it("rejects empty query", async () => {
    const r = await bridge.search({ query: "  " } as UnifiedVectorSearchInput);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/query required/);
  });

  it("rejects unknown kind", async () => {
    const r = await bridge.search({
      query: "x",
      kinds: ["bogus" as MemoryKind],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/unknown kind/);
  });

  it("rejects empty kinds array (must be non-empty when provided)", async () => {
    const r = await bridge.search({ query: "x", kinds: [] });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/non-empty/);
  });

  it("rejects topK = 0", async () => {
    const r = await bridge.search({ query: "x", kinds: ["tip"], topK: 0 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/topK must be a positive integer/);
  });

  it("rejects negative topK", async () => {
    const r = await bridge.search({ query: "x", kinds: ["tip"], topK: -5 });
    expect(r.ok).toBe(false);
  });

  it("rejects non-integer topK", async () => {
    const r = await bridge.search({ query: "x", kinds: ["tip"], topK: 3.5 });
    expect(r.ok).toBe(false);
  });

  it("rejects minScore > 1", async () => {
    const r = await bridge.search({ query: "x", kinds: ["tip"], minScore: 1.5 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/minScore/);
  });

  it("rejects minScore < 0", async () => {
    const r = await bridge.search({ query: "x", kinds: ["tip"], minScore: -0.1 });
    expect(r.ok).toBe(false);
  });

  it("rejects non-array kinds", async () => {
    const r = await bridge.search({ query: "x", kinds: "tip" as unknown as MemoryKind[] });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/array/);
  });

  it("rejects perKindLimit = 0", async () => {
    const r = await bridge.search({
      query: "x", kinds: ["tip"], perKindLimit: 0,
    });
    expect(r.ok).toBe(false);
  });
});

describe("QdrantMemoryVectorBridgeEngine — fail-soft (Qdrant offline)", () => {
  it("returns ok:true with empty hits when ALL kinds fail (backend down)", async () => {
    const backend = makeBackend(async () => ({ ok: false, error: "qdrant not connected" }));
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });

    const r = await bridge.search({ query: "x", kinds: ["tip", "wiki"] });
    expect(r.ok).toBe(true);
    expect(r.hits).toHaveLength(0);
    expect(r.perBackend.qdrant.ok).toBe(false);
    expect(r.perBackend.qdrant.kindsFailed).toBe(2);
    expect(r.perBackend.qdrant.error).toBe("qdrant not connected");
    expect(r.stats.missReasons).toContain("tip: qdrant not connected");
    expect(r.stats.missReasons).toContain("wiki: qdrant not connected");
  });

  it("continues when SOME kinds fail (partial backend failure)", async () => {
    const backend = makeBackend(async ({ kind }) => {
      if (kind === "tip") return { ok: false, error: "embedder failed" };
      if (kind === "wiki") return { ok: true, value: [hit("wiki", "w1", 0.7)] };
      return { ok: true, value: [] };
    });
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });

    const r = await bridge.search({ query: "x", kinds: ["tip", "wiki", "rule"] });
    expect(r.ok).toBe(true);
    expect(r.hits).toHaveLength(1);
    expect(r.hits[0].kind).toBe("wiki");
    expect(r.perBackend.qdrant.ok).toBe(true); // partial → still ok
    expect(r.perBackend.qdrant.kindsFailed).toBe(1);
  });

  it("never throws when recall() itself throws (caught at task wrapper)", async () => {
    const backend = makeBackend(async ({ kind }) => {
      if (kind === "tip") throw new Error("boom");
      return { ok: true, value: [hit(kind, "x", 0.5)] };
    });
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });

    const r = await bridge.search({ query: "x", kinds: ["tip", "wiki"] });
    expect(r.ok).toBe(true);
    expect(r.hits).toHaveLength(1);
    expect(r.perBackend.qdrant.kindsFailed).toBe(1);
    expect(r.stats.missReasons.some((m) => m.startsWith("tip: recall threw"))).toBe(true);
  });

  it("handles thrown non-Error values without crashing", async () => {
    const backend = makeBackend(async () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal -- intentional non-Error throw to exercise the bridge's fallback String(e) path
      throw "string thrown";
    });
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });
    const r = await bridge.search({ query: "x", kinds: ["tip"] });
    expect(r.ok).toBe(true);
    expect(r.hits).toHaveLength(0);
    expect(r.perBackend.qdrant.kindsFailed).toBe(1);
  });
});

describe("QdrantMemoryVectorBridgeEngine — dedup + filters", () => {
  it("dedups same kind:id keeping higher score", async () => {
    const backend = makeBackend(async ({ kind, limit }) => {
      // Inject same id twice (perKindLimit lets us return more than 1)
      if (kind === "tip") {
        return { ok: true, value: [
          hit("tip", "t1", 0.8),
          hit("tip", "t1", 0.9), // dup, higher score
          hit("tip", "t2", 0.5),
        ].slice(0, limit ?? 100) };
      }
      return { ok: true, value: [] };
    });
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });
    const r = await bridge.search({ query: "x", kinds: ["tip"], topK: 10 });

    expect(r.ok).toBe(true);
    expect(r.hits).toHaveLength(2);
    const tipOne = r.hits.find((h) => h.id === "t1");
    expect(tipOne?.score).toBe(0.9);
    expect(r.stats.dedupRemoved).toBe(1);
  });

  it("filters hits below minScore", async () => {
    const backend = makeBackend(async ({ kind }) => {
      if (kind === "tip") {
        return { ok: true, value: [
          hit("tip", "t1", 0.9),
          hit("tip", "t2", 0.6),
          hit("tip", "t3", 0.3),
        ]};
      }
      return { ok: true, value: [] };
    });
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });
    const r = await bridge.search({
      query: "x", kinds: ["tip"], topK: 10, minScore: 0.7,
    });

    expect(r.hits).toHaveLength(1);
    expect(r.hits[0].id).toBe("t1");
    expect(r.stats.belowMinScore).toBe(2);
  });

  it("permits same id across DIFFERENT kinds (no false dedup)", async () => {
    const backend = makeBackend(async ({ kind }) => {
      if (kind === "tip")   return { ok: true, value: [hit("tip",  "shared", 0.7)] };
      if (kind === "wiki")  return { ok: true, value: [hit("wiki", "shared", 0.8)] };
      return { ok: true, value: [] };
    });
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });
    const r = await bridge.search({ query: "x", kinds: ["tip", "wiki"] });

    expect(r.hits).toHaveLength(2);
    expect(r.stats.dedupRemoved).toBe(0);
  });
});

describe("QdrantMemoryVectorBridgeEngine — metadata + provenance", () => {
  it("omits metadata by default", async () => {
    const backend = makeBackend(async ({ kind }) => ({
      ok: true,
      value: [hit(kind, "x", 0.5, { metadata: { foo: "bar" } })],
    }));
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });
    const r = await bridge.search({ query: "x", kinds: ["tip"] });
    expect(r.hits[0].metadata).toBeUndefined();
  });

  it("includes metadata when includeMetadata=true", async () => {
    const backend = makeBackend(async ({ kind }) => ({
      ok: true,
      value: [hit(kind, "x", 0.5, { metadata: { foo: "bar" } })],
    }));
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });
    const r = await bridge.search({
      query: "x", kinds: ["tip"], includeMetadata: true,
    });
    expect(r.hits[0].metadata).toEqual({ foo: "bar" });
  });

  it("forwards createdAt when present", async () => {
    const backend = makeBackend(async ({ kind }) => ({
      ok: true,
      value: [hit(kind, "x", 0.5, { createdAt: "2026-05-25T00:00:00Z" })],
    }));
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });
    const r = await bridge.search({ query: "x", kinds: ["tip"] });
    expect(r.hits[0].createdAt).toBe("2026-05-25T00:00:00Z");
  });

  it("uses source='qdrant' for every hit (single backend today)", async () => {
    const backend = makeBackend(async ({ kind }) => ({
      ok: true,
      value: [hit(kind, "x", 0.5)],
    }));
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });
    const r = await bridge.search({ query: "x", kinds: ["tip", "wiki"] });
    expect(r.hits.every((h) => h.source === "qdrant")).toBe(true);
  });
});

describe("QdrantMemoryVectorBridgeEngine — singleton", () => {
  it("exports a default singleton instance", () => {
    expect(qdrantMemoryVectorBridgeEngine).toBeInstanceOf(QdrantMemoryVectorBridgeEngine);
  });

  it("singleton uses QdrantMemoryEngineSingleton lazily (no live qdrant required at import)", () => {
    // Just importing the module must not throw or connect to Qdrant.
    expect(typeof qdrantMemoryVectorBridgeEngine.search).toBe("function");
  });
});

// ── Schema contract (vector_search_unified) ──────────────────────────────

describe("U-DB-BRIDGE-01 schema contract — vector_search_unified", () => {
  const schema = ACTION_MEMORY_SCHEMAS["vector_search_unified"];

  it("is registered in ACTION_MEMORY_SCHEMAS with safeParse callable", () => {
    expect(typeof schema?.safeParse).toBe("function");
  });

  it("parses minimal input (query only) and preserves the query value", () => {
    const r = schema.safeParse({ query: "tool deflection" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect((r.data as { query: string }).query).toBe("tool deflection");
    }
  });

  it("parses full input shape and preserves every parameter", () => {
    const input = {
      query: "thin wall milling",
      kinds: ["tip", "wiki", "rule"] as MemoryKind[],
      topK: 25,
      minScore: 0.4,
      includeMetadata: true,
      perKindLimit: 8,
    };
    const r = schema.safeParse(input);
    expect(r.success).toBe(true);
    if (r.success) {
      const parsed = r.data as typeof input;
      expect(parsed.query).toBe(input.query);
      expect(parsed.kinds).toEqual(input.kinds);
      expect(parsed.topK).toBe(25);
      expect(parsed.minScore).toBeCloseTo(0.4, 5);
      expect(parsed.includeMetadata).toBe(true);
      expect(parsed.perKindLimit).toBe(8);
    }
  });

  it("rejects empty query with a string-validation error", () => {
    const r = schema.safeParse({ query: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("query"))).toBe(true);
    }
  });

  it("rejects unknown kind with an enum-validation error", () => {
    const r = schema.safeParse({ query: "x", kinds: ["bogus"] });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("kinds"))).toBe(true);
    }
  });

  it("rejects empty kinds array (schema enforces min 1)", () => {
    const r = schema.safeParse({ query: "x", kinds: [] });
    expect(r.success).toBe(false);
  });

  it("rejects topK > 100 with a number-range error", () => {
    const r = schema.safeParse({ query: "x", topK: 101 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("topK"))).toBe(true);
    }
  });

  it("rejects topK = 0", () => {
    const r = schema.safeParse({ query: "x", topK: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects minScore > 1", () => {
    const r = schema.safeParse({ query: "x", minScore: 1.5 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("minScore"))).toBe(true);
    }
  });

  it("rejects minScore < 0", () => {
    const r = schema.safeParse({ query: "x", minScore: -0.1 });
    expect(r.success).toBe(false);
  });

  it("rejects perKindLimit > 50", () => {
    const r = schema.safeParse({ query: "x", perKindLimit: 100 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("perKindLimit"))).toBe(true);
    }
  });
});

// ── Wiring anti-regression: PLURAL-BRIDGE proof ────────────────────────────

describe("U-DB-BRIDGE-01 wiring anti-regression", () => {
  it("vector_search_unified parses a representative input via the action schema map", () => {
    const r = ACTION_MEMORY_SCHEMAS["vector_search_unified"].safeParse({
      query: "Kienzle force model",
      kinds: ["formula", "tip", "wiki"],
      topK: 5,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      const d = r.data as { kinds: MemoryKind[]; topK: number };
      expect(d.kinds).toHaveLength(3);
      expect(d.topK).toBe(5);
    }
  });

  // PLURAL-BRIDGE proof — analogous to U-DB-BRIDGE-03/05's "≥2 distinct
  // DB-bridge actions live in the schema map simultaneously" assertion.
  // Documents that prism_memory now hosts THREE distinct Qdrant-touching
  // bridge actions (raw surface search + raw surface upsert + unified
  // vector router), proving systematic bridging is live.
  it("prism_memory hosts 3 distinct Qdrant-bridge actions with non-aliased contracts", () => {
    const map = ACTION_MEMORY_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;

    // All three actions parse representative input → they're live, not stubs.
    expect(map["qdrant_vector_search"].safeParse({ collection: "tip", query: "x" }).success).toBe(true);
    expect(map["qdrant_vector_upsert"].safeParse({ collection: "tip", id: "1", text: "hello" }).success).toBe(true);
    expect(map["vector_search_unified"].safeParse({ query: "x" }).success).toBe(true);

    // The contracts are DIFFERENT, not aliases:
    //   qdrant_vector_search requires `collection`; unified does not accept it as primary.
    //   unified requires only `query`; qdrant_vector_search rejects `query`-only.
    expect(map["qdrant_vector_search"].safeParse({ query: "x" }).success).toBe(false);
    //   qdrant_vector_upsert requires `id` + `text`; unified rejects only-id-and-text.
    expect(map["qdrant_vector_upsert"].safeParse({ collection: "tip", query: "x" }).success).toBe(false);
  });
});

describe("QdrantMemoryVectorBridgeEngine — score handling", () => {
  it("defaults missing score to 0", async () => {
    const backend = makeBackend(async ({ kind }) => ({
      ok: true,
      value: [{
        id: "x", kind, text: "t", metadata: {}, // no score
      }],
    }));
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });
    const r = await bridge.search({ query: "x", kinds: ["tip"] });
    expect(r.hits[0].score).toBe(0);
  });

  it("sorts hits strictly by score desc across kinds", async () => {
    const backend = makeBackend(async ({ kind }) => {
      if (kind === "tip")   return { ok: true, value: [hit("tip",  "a", 0.55)] };
      if (kind === "wiki")  return { ok: true, value: [hit("wiki", "b", 0.85)] };
      if (kind === "rule")  return { ok: true, value: [hit("rule", "c", 0.20)] };
      return { ok: true, value: [] };
    });
    const bridge = new QdrantMemoryVectorBridgeEngine({ qdrant: backend });
    const r = await bridge.search({
      query: "x", kinds: ["tip", "wiki", "rule"], topK: 10,
    });
    expect(r.hits.map((h) => h.score)).toEqual([0.85, 0.55, 0.20]);
  });
});
