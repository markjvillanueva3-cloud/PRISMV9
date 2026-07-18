/**
 * EMBEDDING-FILTER-WIRE — wire the orphaned EmbeddingFilterEngine (0 dispatcher refs, 0
 * consumers — a true stop_on_unwired_assets orphan) into memoryDispatcher (prism_memory) as
 * `embedding_filter`. Two layers of verification:
 *   1. DISPATCHER round-trip (registerMemoryDispatcher → fakeServer handler): proves the wire
 *      end-to-end. The dispatcher injects the real ollamaEmbedderEngine; with Ollama up OR down
 *      the engine returns the same SHAPE (graceful Jaccard fallback on embedder failure), so the
 *      round-trip asserts only embedder-agnostic structural invariants (deterministic in CI).
 *   2. DIRECT engine with INJECTED deterministic fake embedders (the engine's designed DI seam —
 *      NOT a mock of the SUT): proves the cosine-scoring path AND the Jaccard-fallback path
 *      precisely, with no network.
 *
 * slot:bravo /loop (2026-06-02, claude-5e210e4e).
 * @module __tests__/memoryDispatcher.embedding-filter-wire
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerMemoryDispatcher } from "../tools/dispatchers/memoryDispatcher.js";
import { EmbeddingFilterEngine, type FilterEmbedder } from "../engines/EmbeddingFilterEngine.js";

const DIRECTIVE = "# Safety\nalways check units first\nuse rtk prefix on bash\nrandom unrelated trivia line\nparallelize tool calls";
const PROMPT = "how do I check units and prefix bash with rtk";

describe("prism_memory::embedding_filter (EmbeddingFilterEngine round-trip + DI logic)", () => {
  type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: "text"; text: string }>;
  }>;
  let invoke: (action: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

  beforeAll(() => {
    let captured: Handler | undefined;
    const fakeServer = { tool: (_n: string, _d: string, _s: unknown, handler: Handler) => { captured = handler; } };
    registerMemoryDispatcher(fakeServer as never);
    if (!captured) throw new Error("registerMemoryDispatcher did not register the prism_memory tool");
    const h = captured;
    invoke = async (action, params = {}) =>
      JSON.parse((await h({ action, params })).content[0].text) as Record<string, unknown>;
  });

  it("dispatcher round-trip: filters directive lines, honors maxLines, preserves source order", async () => {
    const r = await invoke("embedding_filter", { directive: DIRECTIVE, prompt: PROMPT, opts: { maxLines: 3 } });
    const kept = (r.kept ?? []) as Array<{ lineNumber: number; text: string; score: number }>;
    // embedder-agnostic invariants (hold whether Ollama is up=cosine or down=jaccard):
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThanOrEqual(3);                 // maxLines honored
    const lineNos = kept.map((k) => k.lineNumber);
    expect([...lineNos]).toEqual([...lineNos].sort((a, b) => a - b)); // source order preserved
    expect(r.inputLineCount).toBe(5);                            // 5 non-blank lines
    expect(r.droppedCount).toBe(5 - kept.length);                // accounting invariant
    expect(typeof r.embedderOk).toBe("boolean");
    expect(["none", "per-line", "jaccard"]).toContain(r.fallbackUsed);
    expect(r.compressionRatio as number).toBeLessThanOrEqual(1);
  });

  it("dispatcher round-trip: rejects non-string directive/prompt (fail-loud)", async () => {
    const bad = await invoke("embedding_filter", { directive: 123, prompt: PROMPT });
    expect((bad.error as string) ?? "").toContain("requires string");
  });

  it("direct engine (injected fake embedder): cosine path ranks the prompt-aligned line first", async () => {
    // Deterministic fake: prompt -> [1,0,0]; the 'units' line -> [1,0,0] (cosine 1); others -> [0,1,0] (cosine 0).
    const vecFor = (t: string): number[] =>
      t.includes("units") || t === PROMPT ? [1, 0, 0] : [0, 1, 0];
    const fake: FilterEmbedder = {
      embed: async (text: string) => ({ ok: true, vector: vecFor(text), error: null }),
    };
    const res = await new EmbeddingFilterEngine(fake).filter(DIRECTIVE, PROMPT, { maxLines: 5, alwaysKeepHeaders: false });
    expect(res.embedderOk).toBe(true);
    expect(res.fallbackUsed).toBe("none");
    // the 'units' line (cosine 1.0) must be the top-scored kept line
    const top = [...res.kept].sort((a, b) => b.score - a.score)[0];
    expect(top.text).toContain("units");
    expect(top.score).toBeGreaterThan(0.99);
  });

  it("direct engine (failing embedder): falls back to Jaccard, token-overlap line outscores trivia", async () => {
    const failing: FilterEmbedder = {
      embed: async () => ({ ok: false, vector: [], error: "embedder-down" }),
    };
    const res = await new EmbeddingFilterEngine(failing).filter(DIRECTIVE, PROMPT, { maxLines: 5, alwaysKeepHeaders: false });
    expect(res.embedderOk).toBe(false);
    expect(res.fallbackUsed).toBe("jaccard");
    // maxLines:5 with 5 input lines → all lines kept, so both are always present.
    expect(res.kept.length).toBe(5);
    const rtk = res.kept.find((k) => k.text.includes("rtk"))!;
    const trivia = res.kept.find((k) => k.text.includes("trivia"))!;
    // "rtk"/"bash" overlap the prompt tokens; the trivia line shares no salient tokens →
    // strictly higher Jaccard score. This fails if the fallback scorer regresses.
    expect(rtk.score).toBeGreaterThan(trivia.score);
  });

  it("direct engine: empty directive yields an empty, well-formed result", async () => {
    const fake: FilterEmbedder = { embed: async () => ({ ok: true, vector: [1, 0, 0], error: null }) };
    const res = await new EmbeddingFilterEngine(fake).filter("", PROMPT);
    expect(res.kept.length).toBe(0);
    expect(res.inputLineCount).toBe(0);
    expect(res.compressionRatio).toBe(1);
  });
});
