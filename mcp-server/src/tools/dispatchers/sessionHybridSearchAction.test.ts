/**
 * PSN-ENHANCE-MS0/U-PSN-HYBRID-MCP-VERIFY (sierra iter27 2026-05-26):
 * Dispatcher-boundary verification for the `prism_session:hybrid_search`
 * action. Iter26 shipped the wire (commit d38959daca) but only verified
 * the CLI path (/hybrid skill) — the dispatcher case body with its
 * cross-tree dynamic imports + inline curlSend was never invoked under
 * test, so a contract drift would have shipped silently.
 *
 * These tests inject mock deps so we exercise the action's wiring without
 * touching Qdrant or Ollama: substrate fan-out, include/exclude flags,
 * default-collection / default-URL plumbing, embed-impl + qdrant-search
 * call shapes, and `q` / `query` aliasing.
 */
import { describe, it, expect, vi } from "vitest";
import {
  runHybridSearchAction,
  type HybridLibModule,
  type MemoryModule,
  type MasterModule,
  type EpisodeModule,
  type CurlSend,
} from "./sessionHybridSearchAction.js";

// Tiny dep factory — every test gets fresh spies so we can assert the
// exact arguments hybridSearch is invoked with. The default substrate
// retrievers return a single deterministic hit so we can verify they
// were called, without coupling tests to RRF math.
function mkDeps(): {
  lib: HybridLibModule;
  mem: MemoryModule;
  master: MasterModule;
  episode: EpisodeModule;
  curlSend: CurlSend;
  importLib: () => Promise<HybridLibModule>;
  importMem: () => Promise<MemoryModule>;
  importMaster: () => Promise<MasterModule>;
  importEpisode: () => Promise<EpisodeModule>;
} {
  const hybridSearchSpy = vi.fn((q: string, opts: unknown) => ({
    query: q,
    surfacesQueried: 4,
    results: [],
    trace: { sources: [], skipped: [] },
    _opts: opts,
  }));
  const lib: HybridLibModule = {
    hybridSearch: hybridSearchSpy,
    defaultEmbed: vi.fn(() => [0.1, 0.2, 0.3]),
    defaultQdrantSearch: vi.fn(() => []),
  };
  const mem: MemoryModule = {
    runMemoryIndexSearch: vi.fn(() => ({ hits: [], tokens: [] })),
  };
  const master: MasterModule = {
    runMasterIndexSearch: vi.fn(() => ({ hits: [], tokens: [] })),
    tokenize: vi.fn((t: string) => t.split(/\s+/)),
  };
  const episode: EpisodeModule = {
    loadStore: vi.fn(() => ({ episodes: [] })),
  };
  const curlSend: CurlSend = vi.fn(() => ({ status: 0, stdout: "{}", stderr: "" }));

  return {
    lib, mem, master, episode, curlSend,
    importLib: async () => lib,
    importMem: async () => mem,
    importMaster: async () => master,
    importEpisode: async () => episode,
  };
}

describe("runHybridSearchAction", () => {
  it("wires all 4 substrate retrievers + tokenize into hybridSearch by default", async () => {
    const d = mkDeps();
    await runHybridSearchAction({ query: "cutting force" }, {
      importLib: d.importLib,
      importMem: d.importMem,
      importMaster: d.importMaster,
      importEpisode: d.importEpisode,
      curlSend: d.curlSend,
    });

    expect(d.lib.hybridSearch).toHaveBeenCalledOnce();
    const [q, opts] = (d.lib.hybridSearch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(q).toBe("cutting force");

    // All 4 substrates default to ON
    expect(opts.includeMemory).toBe(true);
    expect(opts.includeMaster).toBe(true);
    expect(opts.includeEpisode).toBe(true);
    expect(opts.includeVector).toBe(true);

    // Retrievers piped through verbatim (reference equality matters —
    // this is what catches an iter26-class wiring drift where one of the
    // imports gets shadowed or replaced by an inline stub)
    expect(opts.runMemoryIndexSearch).toBe(d.mem.runMemoryIndexSearch);
    expect(opts.runMasterIndexSearch).toBe(d.master.runMasterIndexSearch);
    expect(opts.loadStore).toBe(d.episode.loadStore);
    expect(opts.tokenize).toBe(d.master.tokenize);
  });

  it("accepts both `query` and `q` as the query alias (preferring query)", async () => {
    const d = mkDeps();
    await runHybridSearchAction({ q: "from-q" }, {
      importLib: d.importLib, importMem: d.importMem,
      importMaster: d.importMaster, importEpisode: d.importEpisode, curlSend: d.curlSend,
    });
    expect((d.lib.hybridSearch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe("from-q");

    const d2 = mkDeps();
    await runHybridSearchAction({ query: "from-query", q: "from-q" }, {
      importLib: d2.importLib, importMem: d2.importMem,
      importMaster: d2.importMaster, importEpisode: d2.importEpisode, curlSend: d2.curlSend,
    });
    expect((d2.lib.hybridSearch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe("from-query");
  });

  it("propagates `no_*` flags as include-OFF toggles for each substrate", async () => {
    const d = mkDeps();
    await runHybridSearchAction({
      query: "x", no_memory: true, no_master: true, no_episode: true, no_vector: true,
    }, {
      importLib: d.importLib, importMem: d.importMem,
      importMaster: d.importMaster, importEpisode: d.importEpisode, curlSend: d.curlSend,
    });
    const opts = (d.lib.hybridSearch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(opts.includeMemory).toBe(false);
    expect(opts.includeMaster).toBe(false);
    expect(opts.includeEpisode).toBe(false);
    expect(opts.includeVector).toBe(false);
  });

  it("uses iter26 defaults for collection/qdrant_url/ollama_url/model when params absent", async () => {
    const d = mkDeps();
    await runHybridSearchAction({ query: "x" }, {
      importLib: d.importLib, importMem: d.importMem,
      importMaster: d.importMaster, importEpisode: d.importEpisode, curlSend: d.curlSend,
    });
    const opts = (d.lib.hybridSearch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(opts.qdrantCollection).toBe("prism_engines");
    expect(opts.qdrantUrl).toBe("http://localhost:6333");

    // Trigger the embedImpl closure with the mocked lib to confirm it
    // routes ollama_url + model into defaultEmbed.
    const embedImpl = opts.embedImpl as (q: string) => unknown;
    embedImpl("probe-text");
    expect(d.lib.defaultEmbed).toHaveBeenCalledWith("probe-text", expect.objectContaining({
      ollamaUrl: "http://localhost:11434/api/embeddings",
      model: "nomic-embed-text",
      sendImpl: d.curlSend,
    }));
  });

  it("honors per-call overrides for collection/qdrant_url/ollama_url/model", async () => {
    const d = mkDeps();
    await runHybridSearchAction({
      query: "x",
      collection: "prism_wiki",
      qdrant_url: "http://qdrant.internal:6333",
      ollama_url: "http://ollama.internal:11434/api/embeddings",
      model: "mxbai-embed-large",
    }, {
      importLib: d.importLib, importMem: d.importMem,
      importMaster: d.importMaster, importEpisode: d.importEpisode, curlSend: d.curlSend,
    });
    const opts = (d.lib.hybridSearch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(opts.qdrantCollection).toBe("prism_wiki");
    expect(opts.qdrantUrl).toBe("http://qdrant.internal:6333");

    // qdrantSearch closure must forward both override + injected curlSend
    const qdrantSearch = opts.qdrantSearch as (o: { vector: number[]; limit: number }) => unknown;
    qdrantSearch({ vector: [0.1], limit: 5 });
    expect(d.lib.defaultQdrantSearch).toHaveBeenCalledWith(expect.objectContaining({
      vector: [0.1],
      limit: 5,
      collection: "prism_wiki",
      url: "http://qdrant.internal:6333",
      sendImpl: d.curlSend,
    }));
  });

  it("honors top_k + per_source overrides; defaults to 10 / 20", async () => {
    const d = mkDeps();
    await runHybridSearchAction({ query: "x" }, {
      importLib: d.importLib, importMem: d.importMem,
      importMaster: d.importMaster, importEpisode: d.importEpisode, curlSend: d.curlSend,
    });
    let opts = (d.lib.hybridSearch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(opts.topK).toBe(10);
    expect(opts.perSourceLimit).toBe(20);

    const d2 = mkDeps();
    await runHybridSearchAction({ query: "x", top_k: 5, per_source: 40 }, {
      importLib: d2.importLib, importMem: d2.importMem,
      importMaster: d2.importMaster, importEpisode: d2.importEpisode, curlSend: d2.curlSend,
    });
    opts = (d2.lib.hybridSearch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(opts.topK).toBe(5);
    expect(opts.perSourceLimit).toBe(40);
  });

  it("normalizes missing query to empty string (lib will short-circuit)", async () => {
    const d = mkDeps();
    await runHybridSearchAction({}, {
      importLib: d.importLib, importMem: d.importMem,
      importMaster: d.importMaster, importEpisode: d.importEpisode, curlSend: d.curlSend,
    });
    expect((d.lib.hybridSearch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe("");
  });

  it("returns the hybridSearch result verbatim (no wrapping)", async () => {
    const d = mkDeps();
    const sentinel = { tag: "sentinel-payload" };
    d.lib.hybridSearch = vi.fn(() => sentinel);
    const out = await runHybridSearchAction({ query: "x" }, {
      importLib: async () => d.lib,
      importMem: d.importMem, importMaster: d.importMaster,
      importEpisode: d.importEpisode, curlSend: d.curlSend,
    });
    expect(out).toBe(sentinel);
  });

  it("propagates errors thrown by the lib import (fail loud — R12)", async () => {
    await expect(runHybridSearchAction({ query: "x" }, {
      importLib: async () => { throw new Error("lib-import-failed"); },
    })).rejects.toThrow("lib-import-failed");
  });

  it("propagates errors thrown by any of the helper imports (master)", async () => {
    const d = mkDeps();
    await expect(runHybridSearchAction({ query: "x" }, {
      importLib: d.importLib,
      importMem: d.importMem,
      importMaster: async () => { throw new Error("master-import-failed"); },
      importEpisode: d.importEpisode,
      curlSend: d.curlSend,
    })).rejects.toThrow("master-import-failed");
  });

  it("propagates errors thrown by the episode-store import", async () => {
    const d = mkDeps();
    await expect(runHybridSearchAction({ query: "x" }, {
      importLib: d.importLib,
      importMem: d.importMem,
      importMaster: d.importMaster,
      importEpisode: async () => { throw new Error("episode-import-failed"); },
      curlSend: d.curlSend,
    })).rejects.toThrow("episode-import-failed");
  });

  it("coerces non-string query to string; null collection falls through to default (?? semantics)", async () => {
    const d = mkDeps();
    await runHybridSearchAction({
      query: 42 as unknown as string,
      collection: null as unknown as string,
    }, {
      importLib: d.importLib, importMem: d.importMem,
      importMaster: d.importMaster, importEpisode: d.importEpisode, curlSend: d.curlSend,
    });
    expect((d.lib.hybridSearch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe("42");
    // `String(params.collection ?? "prism_engines")` — null triggers default
    // (nullish coalescing), so null falls through to the iter26 default
    // rather than being stringified to "null". This is the safer behavior:
    // a misformed RPC that omits collection gets the canonical engine
    // collection instead of trying to query a collection named "null".
    const opts = (d.lib.hybridSearch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(opts.qdrantCollection).toBe("prism_engines");
  });

  // Smoke test against the REAL cross-tree imports. No `deps` override —
  // every dynamic import in defaultImport* must actually resolve, or this
  // test breaks. Catches: scripts/lib/*.mjs renamed, export renamed,
  // file:// URL drift, helper path typo on the dispatcher side.
  //
  // Strategy: pass empty query + `no_*` flags so the lib short-circuits
  // (returns the empty-query trace) without invoking any retriever — we
  // hit every import path but no Qdrant/Ollama/etc. I/O.
  //
  // Closes reviewer A P1 + reviewer B P2 (3-of-3 scrutiny iter27).
  it("smoke: real default imports resolve when query is empty (no Qdrant/Ollama needed)", async () => {
    const out = (await runHybridSearchAction({
      query: "",
      no_memory: true, no_master: true, no_episode: true, no_vector: true,
    })) as { query: string | null; results: unknown[]; surfacesQueried: number; trace: { sources: unknown[]; skipped: { source: string; reason: string }[] } };
    // hybrid-retrieval.mjs short-circuits empty queries with a marker
    // trace entry. If the shape ever drifts, this assertion catches it.
    expect(Array.isArray(out.results)).toBe(true);
    expect(out.results).toHaveLength(0);
    expect(out.surfacesQueried).toBe(0);
    expect(out.trace.skipped.some((s) => s.source === "all" && s.reason === "empty-query")).toBe(true);
  });

  it("stringifies an explicit non-null, non-string collection value (e.g. number)", async () => {
    // Distinct from the null case above: a numeric collection arrives via
    // a malformed RPC, so we want to surface the bad value rather than
    // silently route to the default. `String(123)` -> "123".
    const d = mkDeps();
    await runHybridSearchAction({
      query: "x",
      collection: 123 as unknown as string,
    }, {
      importLib: d.importLib, importMem: d.importMem,
      importMaster: d.importMaster, importEpisode: d.importEpisode, curlSend: d.curlSend,
    });
    const opts = (d.lib.hybridSearch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(opts.qdrantCollection).toBe("123");
  });
});
