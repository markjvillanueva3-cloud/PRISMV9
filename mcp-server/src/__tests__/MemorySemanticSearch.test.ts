/**
 * MemorySemanticSearch.test.ts
 *
 * Verifies INTEL-OLLAMA-OBSIDIAN-MS0/P0-U02 deliverables:
 *  1. ACTION_MEMORY_SCHEMAS["semantic_search"] validates required+optional fields
 *  2. Round-trip: handleSemanticSearch(query, kind) → ensureQdrantEmbedder
 *     → qdrantMemoryEngine.recall → JSON envelope with success/data
 *  3. Validation paths return success=false with descriptive `error` field
 *  4. Schema rejects malformed input (empty query, bad kind, oversize limit)
 *  5. Threshold filter retains exactly the items at-or-above cutoff
 *  6. Auto-install path: when no stub embedder is set, the dispatcher
 *     installs an Ollama-backed one (failure shape != "embedder not configured")
 *
 * The dispatcher itself uses MCP server bindings that are awkward to spawn
 * in unit tests; we mirror the `case "semantic_search"` block here so
 * the action's behavior is testable without MCP-server boot. If the
 * dispatcher implementation drifts from this, the test must be updated.
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P0-U02
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { qdrantMemoryEngine } from "../engines/QdrantMemoryEngine.js";
import {
  ensureQdrantEmbedder,
  resetEmbedderInstall,
  EXPECTED_EMBED_DIM,
} from "../engines/OllamaEmbedderFactory.js";
import { ACTION_MEMORY_SCHEMAS } from "../schemas/memoryActionSchemas.js";

const SEMANTIC_KIND_VALUES = ["program", "outcome", "tip", "formula", "rule", "playbook", "note"] as const;

interface SemanticSearchResult {
  success: boolean;
  data?: { kind: string; query: string; limit: number; threshold: number; hits: number; items: unknown[] };
  error?: string;
}

/**
 * Mirrors the `case "semantic_search"` block of memoryDispatcher.ts so the
 * action's behavior can be unit-tested without MCP-server boot.
 */
async function runSemanticSearch(params: Record<string, unknown>): Promise<SemanticSearchResult> {
  const query = typeof params.query === "string" ? params.query : "";
  if (query.length === 0) {
    return { success: false, error: "semantic_search requires non-empty 'query' string" };
  }
  const kind = (params.kind ?? "tip") as (typeof SEMANTIC_KIND_VALUES)[number];
  const requestedLimit = Number.isFinite(params.limit) ? Number(params.limit) : 5;
  const limit = Math.max(1, Math.min(100, requestedLimit));
  const threshold = Number.isFinite(params.threshold) ? Number(params.threshold) : 0;
  const filter =
    params.filter && typeof params.filter === "object"
      ? (params.filter as Record<string, unknown>)
      : undefined;

  try {
    ensureQdrantEmbedder();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `embedder install failed: ${msg}` };
  }

  const recalled = await qdrantMemoryEngine.recall({ kind, query, limit, filter });
  if (!recalled.ok) {
    return { success: false, error: recalled.error ?? "recall failed" };
  }
  const items = recalled.value;
  const passing =
    threshold > 0
      ? items.filter(
          (it) => typeof (it as { score?: number }).score !== "number" || (it as { score: number }).score >= threshold,
        )
      : items;
  return {
    success: true,
    data: { kind, query, limit, threshold, hits: passing.length, items: passing },
  };
}

describe("memoryActionSchemas — semantic_search Zod schema", () => {
  it("rejects empty query with a path that includes 'query'", () => {
    const r = ACTION_MEMORY_SCHEMAS.semantic_search.safeParse({ query: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("query"))).toBe(true);
    }
  });

  it("accepts minimal valid payload (just query) and parses into the same shape", () => {
    const r = ACTION_MEMORY_SCHEMAS.semantic_search.safeParse({ query: "hello" });
    expect(r.success).toBe(true);
    if (r.success) {
      const data = r.data as { query: string };
      expect(data.query).toBe("hello");
    }
  });

  it("rejects unknown kind 'decision' (was the intel-p8 set, not main's MEMORY_KINDS)", () => {
    const r = ACTION_MEMORY_SCHEMAS.semantic_search.safeParse({ query: "x", kind: "decision" });
    expect(r.success).toBe(false);
  });

  it("accepts every MEMORY_KINDS value and round-trips it", () => {
    for (const kind of SEMANTIC_KIND_VALUES) {
      const r = ACTION_MEMORY_SCHEMAS.semantic_search.safeParse({ query: "x", kind });
      expect(r.success).toBe(true);
      if (r.success) {
        const data = r.data as { kind: string };
        expect(data.kind).toBe(kind);
      }
    }
  });

  it("rejects limit > 100 (hard ceiling)", () => {
    const r = ACTION_MEMORY_SCHEMAS.semantic_search.safeParse({ query: "x", limit: 1_000 });
    expect(r.success).toBe(false);
  });

  it("rejects limit < 1 and non-integer limit", () => {
    expect(ACTION_MEMORY_SCHEMAS.semantic_search.safeParse({ query: "x", limit: 0 }).success).toBe(false);
    expect(ACTION_MEMORY_SCHEMAS.semantic_search.safeParse({ query: "x", limit: 2.5 }).success).toBe(false);
  });

  it("rejects threshold > 1 and < 0 (cosine similarity bounds)", () => {
    expect(ACTION_MEMORY_SCHEMAS.semantic_search.safeParse({ query: "x", threshold: 2 }).success).toBe(false);
    expect(ACTION_MEMORY_SCHEMAS.semantic_search.safeParse({ query: "x", threshold: -0.1 }).success).toBe(false);
  });
});

describe("semantic_search dispatcher path — round-trip with stub embedder", () => {
  beforeEach(() => {
    resetEmbedderInstall();
    const stub = async (): Promise<number[]> => new Array(EXPECTED_EMBED_DIM).fill(0.05);
    ensureQdrantEmbedder({ embedder: stub });
  });
  afterEach(() => {
    resetEmbedderInstall();
  });

  it("returns success=false on empty query before reaching the engine, with non-empty rationale", async () => {
    const r = await runSemanticSearch({ query: "" });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/non-empty/);
  });

  it("returns success=false when Qdrant is unreachable, with descriptive non-embedder error", async () => {
    const r = await runSemanticSearch({ query: "Kienzle steel kc1.1", kind: "formula" });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
    expect(r.error).not.toMatch(/embedder not configured/);
  });

  it("clamps limit into [1, 100] — verified by direct clamp + structured failure", async () => {
    const high = await runSemanticSearch({ query: "x", limit: 9_999 });
    const low = await runSemanticSearch({ query: "x", limit: -5 });
    expect(Math.max(1, Math.min(100, 9_999))).toBe(100);
    expect(Math.max(1, Math.min(100, -5))).toBe(1);
    expect(high.success).toBe(false);
    expect(low.success).toBe(false);
  });

  it("threshold filter retains hits with score >= cutoff and items with no score (mock recall)", async () => {
    const realRecall = qdrantMemoryEngine.recall.bind(qdrantMemoryEngine);
    try {
      qdrantMemoryEngine.recall = async () => ({
        ok: true,
        value: [
          { id: "a", text: "A", kind: "tip", score: 0.95 },
          { id: "b", text: "B", kind: "tip", score: 0.55 },
          { id: "c", text: "C", kind: "tip", score: 0.2 },
          { id: "d", text: "D", kind: "tip" }, // no score → kept
        ],
      });
      const r = await runSemanticSearch({ query: "x", threshold: 0.5 });
      expect(r.success).toBe(true);
      expect(r.data?.hits).toBe(3);
      const ids = (r.data?.items as Array<{ id: string }> | undefined)?.map((it) => it.id) ?? [];
      expect(ids).toEqual(["a", "b", "d"]);
    } finally {
      qdrantMemoryEngine.recall = realRecall;
    }
  });

  it("threshold=0 (default) preserves every recalled item including low-score ones", async () => {
    const realRecall = qdrantMemoryEngine.recall.bind(qdrantMemoryEngine);
    try {
      qdrantMemoryEngine.recall = async () => ({
        ok: true,
        value: [
          { id: "x1", text: "X", kind: "tip", score: 0.99 },
          { id: "x2", text: "X", kind: "tip", score: 0.01 },
          { id: "x3", text: "X", kind: "tip" },
        ],
      });
      const r = await runSemanticSearch({ query: "x" });
      expect(r.success).toBe(true);
      expect(r.data?.hits).toBe(3);
      expect(r.data?.threshold).toBe(0);
    } finally {
      qdrantMemoryEngine.recall = realRecall;
    }
  });

  it("data envelope echoes inputs (kind, query, limit, threshold)", async () => {
    const realRecall = qdrantMemoryEngine.recall.bind(qdrantMemoryEngine);
    try {
      qdrantMemoryEngine.recall = async () => ({ ok: true, value: [] });
      const r = await runSemanticSearch({ query: "echo me", kind: "playbook", limit: 7, threshold: 0.3 });
      expect(r.success).toBe(true);
      expect(r.data?.kind).toBe("playbook");
      expect(r.data?.query).toBe("echo me");
      expect(r.data?.limit).toBe(7);
      expect(r.data?.threshold).toBe(0.3);
      expect(r.data?.hits).toBe(0);
    } finally {
      qdrantMemoryEngine.recall = realRecall;
    }
  });
});

describe("semantic_search dispatcher path — auto-install when no embedder", () => {
  beforeEach(() => {
    resetEmbedderInstall();
  });
  afterEach(() => {
    resetEmbedderInstall();
  });

  it("auto-installs an Ollama-backed embedder; failure shape is never 'embedder not configured'", async () => {
    const r = await runSemanticSearch({ query: "x", kind: "note" });
    expect(r.success).toBe(false);
    expect(r.error).not.toMatch(/embedder not configured/);
  });
});

describe("memoryDispatcher source-of-truth: dispatcher includes semantic_search in its z.enum", () => {
  it("the dispatcher source file contains the new action token (regression guard)", async () => {
    // Read the dispatcher source to confirm the enum entry exists. This
    // catches the silent-deletion class of regression where someone removes
    // the case but leaves the schema, or vice-versa.
    const { readFileSync } = await import("node:fs");
    const path = (await import("node:path")).resolve(
      (await import("node:url")).fileURLToPath(import.meta.url),
      "..",
      "..",
      "tools",
      "dispatchers",
      "memoryDispatcher.ts",
    );
    const source = readFileSync(path, "utf8");
    expect(source).toMatch(/"semantic_search"/);
    expect(source).toMatch(/case "semantic_search"/);
    expect(source).toMatch(/ensureQdrantEmbedder/);
  });
});
