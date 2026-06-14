/**
 * PSN-ENHANCE-MS0/U-PSN-HYBRID-MCP-VERIFY (sierra iter27 2026-05-26):
 * Extract the prism_session:hybrid_search dispatcher case body into a
 * standalone, dependency-injected helper so it can be unit-tested without
 * spinning up Qdrant, Ollama, or the full MCP harness.
 *
 * iter26 (commit d38959daca) shipped the dispatcher case with cross-tree
 * dynamic imports (`file:///H:/prism/scripts/lib/...`) — type-checked but
 * untested at the dispatcher boundary. The CLI path (/hybrid skill) was
 * the only verification surface, leaving the case's import-and-curl glue
 * unverified for external MCP consumers (Cline/Continue/Aider/Codex/Goose).
 *
 * Pure-core via dependency injection — same pattern hybridSearch itself
 * uses in scripts/lib/hybrid-retrieval.mjs. Default deps do the real work;
 * tests inject mocks to exercise the wiring without external I/O.
 */

import { spawnSync } from "node:child_process";

// Loose types — the cross-tree libs aren't TypeScript so we keep the
// surface here narrow and unchecked. The shapes are stable per
// scripts/lib/hybrid-retrieval.mjs (see __test_constants export there).
export interface HybridLibModule {
  hybridSearch: (q: string, opts: unknown) => unknown;
  defaultEmbed: (q: string, opts: unknown) => unknown;
  defaultQdrantSearch: (opts: unknown) => unknown;
}

export interface MemoryModule {
  runMemoryIndexSearch: (q: string, opts?: unknown) => unknown;
}

export interface MasterModule {
  runMasterIndexSearch: (q: string, opts?: unknown) => unknown;
  tokenize: (text: string) => string[];
}

export interface EpisodeModule {
  loadStore: () => unknown;
}

// LOCAL-VECTOR-WIRE: offline dense substrate (scripts/lib/local-vector-store.mjs)
export interface LocalStoreModule {
  makeLocalVectorSearch: (file?: string) => (args: { vector: number[]; limit: number }) => unknown;
}

export interface CurlResult {
  status: number;
  stdout: string;
  stderr: string;
}

export type CurlSend = (method: string, url: string, body?: string) => CurlResult;

export interface HybridSearchDeps {
  importLib?: () => Promise<HybridLibModule>;
  importMem?: () => Promise<MemoryModule>;
  importMaster?: () => Promise<MasterModule>;
  importEpisode?: () => Promise<EpisodeModule>;
  importLocalStore?: () => Promise<LocalStoreModule>; // LOCAL-VECTOR-WIRE
  curlSend?: CurlSend;
}

export interface HybridSearchParams {
  query?: unknown;
  q?: unknown;
  collection?: unknown;
  qdrant_url?: unknown;
  ollama_url?: unknown;
  model?: unknown;
  top_k?: unknown;
  per_source?: unknown;
  no_memory?: unknown;
  no_master?: unknown;
  no_episode?: unknown;
  no_vector?: unknown;
  no_local?: unknown; // LV-NOLOCAL
}

// Default deps — real cross-tree dynamic imports + real child_process curl.
// Lifted out so tests can override one without overriding the whole bundle.
async function defaultImportLib(): Promise<HybridLibModule> {
  return (await import("file:///H:/prism/scripts/lib/hybrid-retrieval.mjs" as string)) as HybridLibModule;
}
async function defaultImportMem(): Promise<MemoryModule> {
  return (await import("file:///H:/prism/scripts/lib/memory-index-search-lib.mjs" as string)) as MemoryModule;
}
async function defaultImportMaster(): Promise<MasterModule> {
  return (await import("file:///H:/prism/scripts/lib/master-index-search-lib.mjs" as string)) as MasterModule;
}
async function defaultImportEpisode(): Promise<EpisodeModule> {
  return (await import("file:///H:/prism/scripts/lib/episode-store.mjs" as string)) as EpisodeModule;
}
// LOCAL-VECTOR-WIRE
async function defaultImportLocalStore(): Promise<LocalStoreModule> {
  return (await import("file:///H:/prism/scripts/lib/local-vector-store.mjs" as string)) as LocalStoreModule;
}

// 30 s max-time matches iter26 inline curlSend so behavior is unchanged
// when deps are at their defaults. Sync — `hybridSearch` invokes sendImpl
// synchronously inside its retriever bodies, so an async wrapper would
// break the lib contract.
function defaultCurlSend(method: string, url: string, body?: string): CurlResult {
  const args = ["-sS", "--max-time", "30", "-X", method, "-H", "Content-Type: application/json"];
  if (body) args.push("--data-binary", "@-");
  args.push(url);
  const r = spawnSync("curl", args, { encoding: "utf8", input: body, maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status ?? 1, stdout: r.stdout || "", stderr: r.stderr || "" };
}

/**
 * Run the hybrid_search action against the four PSN substrates.
 *
 * Mirrors the dispatcher case behavior 1:1 — same defaults, same
 * include/exclude semantics, same params accepted. Returns whatever
 * `hybridSearch` returns (caller wraps with `ok(...)`).
 *
 * Idempotent and side-effect-free at this layer — the only side effects
 * are the curl/HTTP calls performed by the injected deps.
 */
export async function runHybridSearchAction(
  params: HybridSearchParams,
  deps: HybridSearchDeps = {},
): Promise<unknown> {
  const importLib = deps.importLib ?? defaultImportLib;
  const importMem = deps.importMem ?? defaultImportMem;
  const importMaster = deps.importMaster ?? defaultImportMaster;
  const importEpisode = deps.importEpisode ?? defaultImportEpisode;
  const importLocalStore = deps.importLocalStore ?? defaultImportLocalStore; // LOCAL-VECTOR-WIRE
  const curlSend = deps.curlSend ?? defaultCurlSend;

  const lib = await importLib();
  const mem = await importMem();
  const master = await importMaster();
  const ep = await importEpisode();
  const localStore = await importLocalStore(); // LOCAL-VECTOR-WIRE

  const query = String(params.query ?? params.q ?? "");
  const collection = String(params.collection ?? "prism_engines");
  const qdrantUrl = String(params.qdrant_url ?? "http://localhost:6333");
  const ollamaUrl = String(params.ollama_url ?? "http://localhost:11434/api/embeddings");
  const model = String(params.model ?? "nomic-embed-text");

  return lib.hybridSearch(query, {
    topK: params.top_k != null ? Number(params.top_k) : 10,
    perSourceLimit: params.per_source != null ? Number(params.per_source) : 20,
    includeMemory: params.no_memory !== true,
    includeMaster: params.no_master !== true,
    includeEpisode: params.no_episode !== true,
    includeVector: params.no_vector !== true,
    includeLocalVector: params.no_local !== true, // LV-NOLOCAL
    runMemoryIndexSearch: mem.runMemoryIndexSearch,
    runMasterIndexSearch: master.runMasterIndexSearch,
    loadStore: ep.loadStore,
    tokenize: master.tokenize,
    embedImpl: (q: string) => lib.defaultEmbed(q, { sendImpl: curlSend, ollamaUrl, model }),
    // LOCAL-VECTOR-WIRE: offline dense leg, Qdrant-independent (kills the SPOF for MCP clients)
    localVectorSearch: localStore.makeLocalVectorSearch() as (args: { vector: number[]; limit: number }) => unknown,
    qdrantSearch: (opts: { vector: number[]; limit: number }) =>
      lib.defaultQdrantSearch({ ...opts, collection, url: qdrantUrl, sendImpl: curlSend }),
    qdrantCollection: collection,
    qdrantUrl,
  });
}
