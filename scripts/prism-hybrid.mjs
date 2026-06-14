#!/usr/bin/env node
// PSN-ENHANCE-MS0/U-PSN-HYBRID-RETRIEVAL-WIRE CLI. One verb: run a
// hybrid retrieval query across all 4 PSN substrates (memory + master +
// episode + Qdrant dense) and print fused results.
//
// Flags:
//   --query "..."         (required) the query string
//   --top-k N             top-K final results (default: 10)
//   --per-source N        per-substrate cap before RRF (default: 20)
//   --no-memory           disable memory-index leg
//   --no-master           disable master-index graph leg
//   --no-episode          disable episode-store leg
//   --no-vector           disable Qdrant dense leg
//   --collection NAME     Qdrant collection (default: prism_engines)
//   --qdrant URL          Qdrant base URL (default: http://localhost:6333)
//   --ollama URL          Ollama embeddings URL (default: http://localhost:11434/api/embeddings)
//   --model NAME          embedding model (default: nomic-embed-text)
//   --json                machine-readable output

import { spawnSync } from "node:child_process";
import {
  hybridSearch,
  defaultEmbed,
  defaultQdrantSearch,
} from "./lib/hybrid-retrieval.mjs";
import { runMemoryIndexSearch } from "./lib/memory-index-search-lib.mjs";
import { runMasterIndexSearch, tokenize as masterTokenize } from "./lib/master-index-search-lib.mjs";
import { loadStore } from "./lib/episode-store.mjs";
import { makeLocalVectorSearch } from "./lib/local-vector-store.mjs"; // LOCAL-VECTOR-WIRE

// Curl-subprocess HTTP shim, same pattern as populate-qdrant.mjs (avoids
// Windows http pool starvation).
function curlSend(method, url, body) {
  const args = ["-sS", "--max-time", "30", "-X", method, "-H", "Content-Type: application/json"];
  if (body !== null && body !== undefined) args.push("--data-binary", "@-");
  args.push(url);
  const r = spawnSync("curl", args, { encoding: "utf8", input: body == null ? undefined : body, maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

function parseArgs(argv) {
  const a = {
    query: null,
    topK: 10,
    perSource: 20,
    includeMemory: true,
    includeMaster: true,
    includeEpisode: true,
    includeVector: true,
    includeLocalVector: true, // LV-NOLOCAL
    collection: "prism_engines",
    qdrantUrl: "http://localhost:6333",
    ollamaUrl: "http://localhost:11434/api/embeddings",
    model: "nomic-embed-text",
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--query" || x === "-q") a.query = argv[++i] || null;
    else if (x === "--top-k") a.topK = Number(argv[++i]) || 10;
    else if (x === "--per-source") a.perSource = Number(argv[++i]) || 20;
    else if (x === "--no-memory") a.includeMemory = false;
    else if (x === "--no-master") a.includeMaster = false;
    else if (x === "--no-episode") a.includeEpisode = false;
    else if (x === "--no-vector") a.includeVector = false;
    else if (x === "--no-local") a.includeLocalVector = false; // LV-NOLOCAL
    else if (x === "--collection") a.collection = argv[++i] || a.collection;
    else if (x === "--qdrant") a.qdrantUrl = argv[++i] || a.qdrantUrl;
    else if (x === "--ollama") a.ollamaUrl = argv[++i] || a.ollamaUrl;
    else if (x === "--model") a.model = argv[++i] || a.model;
    else if (x === "--json") a.json = true;
  }
  return a;
}

function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  if (!a.query) {
    process.stderr.write("Usage: prism-hybrid --query \"text\" [--top-k N] [--no-vector] [--json]\n");
    return 1;
  }
  const start = Date.now();
  const result = hybridSearch(a.query, {
    topK: a.topK,
    perSourceLimit: a.perSource,
    includeMemory: a.includeMemory,
    includeMaster: a.includeMaster,
    includeEpisode: a.includeEpisode,
    includeVector: a.includeVector,
    includeLocalVector: a.includeLocalVector, // LV-NOLOCAL
    runMemoryIndexSearch,
    runMasterIndexSearch,
    loadStore: () => loadStore(),
    tokenize: masterTokenize,
    embedImpl: (q) => defaultEmbed(q, { sendImpl: curlSend, ollamaUrl: a.ollamaUrl, model: a.model }),
    localVectorSearch: makeLocalVectorSearch(), // LOCAL-VECTOR-WIRE: offline dense leg, Qdrant-independent (kills the SPOF)
    qdrantSearch: ({ vector, limit }) => defaultQdrantSearch({ vector, collection: a.collection, url: a.qdrantUrl, limit, sendImpl: curlSend }),
    qdrantCollection: a.collection,
    qdrantUrl: a.qdrantUrl,
  });
  const elapsedMs = Date.now() - start;

  if (a.json) {
    process.stdout.write(JSON.stringify({ ...result, elapsedMs }, null, 2) + "\n");
    return 0;
  }

  process.stdout.write(`hybrid query: "${result.query}"\n`);
  process.stdout.write(`substrates queried: ${result.surfacesQueried} (`);
  process.stdout.write(result.trace.sources.map((s) => `${s.source}=${s.count}`).join(", "));
  process.stdout.write(`)\n`);
  if (result.trace.skipped.length > 0) {
    process.stdout.write(`skipped: ${result.trace.skipped.map((s) => `${s.source}(${s.reason || s.error || "?"})`).join(", ")}\n`);
  }
  process.stdout.write(`top ${result.results.length} of fused results (elapsed: ${elapsedMs}ms):\n`);
  result.results.forEach((r, i) => {
    const sources = Object.keys(r.surfaces).map((s) => `${s}@${r.surfaces[s]}`).join(",");
    process.stdout.write(`  ${(i + 1).toString().padStart(2)}. [${r.score.toFixed(4)}] ${r.id}  (${sources})\n`);
  });
  return 0;
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv);
  } catch { return false; }
})();

if (invokedDirect) process.exit(main());
