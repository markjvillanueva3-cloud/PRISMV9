/**
 * LSH-DEDUP-WIRE — wire the orphaned LSHDedupEngine (0 dispatcher refs, 0 consumers — a true
 * stop_on_unwired_assets orphan) into memoryDispatcher (prism_memory) as
 * lsh_dedup_{add,is_duplicate,stats}. Round-trips the REAL dispatcher
 * (registerMemoryDispatcher → fakeServer handler) through the locality-sensitive-hashing
 * embedding deduper and asserts the dedup verdict + stats land in the JSON response.
 * No mocks of the system-under-test.
 *
 * The engine's default config is 384-dim with a fixed seed (reproducible hashing), so the
 * dedup decisions below are deterministic: an identical vector → cosine 1.0 ≥ 0.85 → duplicate;
 * an orthogonal one-hot → cosine 0 < 0.85 → not a duplicate.
 *
 * slot:bravo /loop (2026-06-02, claude-5e210e4e) — close the orphan + expose pure embedding dedup.
 * @module __tests__/memoryDispatcher.lsh-dedup-wire
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerMemoryDispatcher } from "../tools/dispatchers/memoryDispatcher.js";

const DIM = 384;
const oneHot = (i: number): number[] => Array.from({ length: DIM }, (_, j) => (j === i ? 1 : 0));

describe("prism_memory::lsh_dedup_* (LSHDedupEngine round-trip)", () => {
  type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: "text"; text: string }>;
  }>;
  let invoke: (action: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

  beforeAll(() => {
    let captured: Handler | undefined;
    const fakeServer = {
      tool: (_n: string, _d: string, _s: unknown, handler: Handler) => {
        captured = handler;
      },
    };
    // registerMemoryDispatcher(server: McpServer) — the fakeServer satisfies the `.tool(...)` call.
    registerMemoryDispatcher(fakeServer as never);
    if (!captured) throw new Error("registerMemoryDispatcher did not register the prism_memory tool");
    const h = captured;
    invoke = async (action, params = {}) =>
      JSON.parse((await h({ action, params })).content[0].text) as Record<string, unknown>;
  });

  it("adds an embedding and detects an identical one as a duplicate", async () => {
    const vecA = oneHot(0);
    const add = await invoke("lsh_dedup_add", { id: "doc-a", embedding: vecA });
    expect(add.added).toBe(true);
    expect(add.id).toBe("doc-a");

    // identical vector → cosine 1.0 ≥ threshold → duplicate, with doc-a among the matches.
    const dup = await invoke("lsh_dedup_is_duplicate", { embedding: vecA });
    expect(dup.isDuplicate).toBe(true);
    const matches = dup.matches as Array<{ id: string; similarity: number }>;
    expect(matches.some((m) => m.id === "doc-a")).toBe(true);
    expect(matches.find((m) => m.id === "doc-a")!.similarity).toBeGreaterThan(0.99);
  });

  it("treats an orthogonal embedding as NOT a duplicate", async () => {
    // one-hot at a different index → cosine 0 with doc-a < threshold → not a duplicate.
    const orthogonal = oneHot(100);
    const r = await invoke("lsh_dedup_is_duplicate", { embedding: orthogonal });
    expect(r.isDuplicate).toBe(false);
    // slimResponse drops the empty matches array → key absent.
    expect(((r.matches as unknown[]) ?? []).length).toBe(0);
  });

  it("stats report the indexed item count + hashing parameters", async () => {
    const s = (await invoke("lsh_dedup_stats")) as {
      numItems: number; numTables: number; numHashes: number;
    };
    expect(s.numItems).toBeGreaterThanOrEqual(1); // doc-a was added
    expect(s.numTables).toBeGreaterThan(0);
    expect(s.numHashes).toBeGreaterThan(0);
  });
});
