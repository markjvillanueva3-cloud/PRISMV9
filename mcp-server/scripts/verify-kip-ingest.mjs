#!/usr/bin/env node
/**
 * verify-kip-ingest.mjs — INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U02 verifier.
 *
 * Compare the on-disk checkpoint produced by ingest-pdfs.mjs against the
 * live state of the Qdrant `prism_memory_wiki` collection. Reports:
 *   - PDFs ingested vs PDFs failed (from JSONL)
 *   - Total chunks claimed by checkpoint vs Qdrant point count
 *   - Sample-by-id round-trip (verify chunkId -> point exists with metadata)
 *   - One realistic semantic-recall query (verify embedder + index integrity)
 *
 * Usage:
 *   node scripts/verify-kip-ingest.mjs
 *     [--checkpoint mcp-server/data/state/kip-ingest.jsonl]
 *     [--qdrant http://127.0.0.1:6333]
 *     [--collection prism_memory_wiki]
 *     [--query "carbide insert for 4140 steel"]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const { values: argv } = parseArgs({
  options: {
    checkpoint: { type: "string", default: "mcp-server/data/state/kip-ingest.jsonl" },
    qdrant:     { type: "string", default: "http://127.0.0.1:6333" },
    collection: { type: "string", default: "prism_memory_wiki" },
    query:      { type: "string", default: "carbide insert recommended cutting speed for steel" },
    samples:    { type: "string", default: "5" },
  },
});

const checkpointPath = path.resolve(argv.checkpoint);
if (!fs.existsSync(checkpointPath)) {
  console.error(`checkpoint not found: ${checkpointPath}`);
  process.exit(2);
}

const sampleCount = Number.parseInt(argv.samples, 10) || 5;

// --- Load checkpoint ----------------------------------------------------------

const records = [];
const failed = [];
for (const ln of fs.readFileSync(checkpointPath, "utf8").split("\n").filter(Boolean)) {
  try {
    const o = JSON.parse(ln);
    if (o?.error) failed.push(o);
    else if (o?.source) records.push(o);
  } catch {
    /* skip malformed line */
  }
}

const totalClaimedChunks = records.reduce((s, r) => s + (r.upserted ?? 0), 0);
const totalAttemptedChunks = records.reduce((s, r) => s + (r.chunks ?? 0), 0);
const totalErrors = records.reduce((s, r) => s + (r.errors?.length ?? 0), 0);

console.log("=== KIP Ingest Verification ===");
console.log(`checkpoint: ${checkpointPath}`);
console.log(`PDFs successful: ${records.length}`);
console.log(`PDFs failed:     ${failed.length}`);
console.log(`chunks attempted (sum):  ${totalAttemptedChunks}`);
console.log(`chunks upserted (sum):   ${totalClaimedChunks}`);
console.log(`per-chunk errors (sum):  ${totalErrors}`);

if (failed.length > 0) {
  console.log("\nfailed PDFs:");
  for (const f of failed.slice(0, 10)) {
    console.log(`  - ${path.basename(f.source)}: ${f.error.slice(0, 120)}`);
  }
}

// --- Probe Qdrant collection --------------------------------------------------

async function qdrantGet(p) {
  const r = await fetch(`${argv.qdrant}${p}`);
  if (!r.ok) throw new Error(`Qdrant ${p}: HTTP ${r.status} ${await r.text().catch(() => "")}`);
  return r.json();
}

let qdrantPointCount = -1;
try {
  const info = await qdrantGet(`/collections/${argv.collection}`);
  qdrantPointCount = info?.result?.points_count ?? -1;
  console.log(`\nQdrant collection '${argv.collection}': ${qdrantPointCount} points`);
  if (qdrantPointCount !== totalClaimedChunks) {
    console.log(`  ⚠ point count differs from upserted total — could be from prior ingest`);
  }
} catch (e) {
  console.error(`failed to read collection info: ${e.message}`);
  process.exit(2);
}

// --- Sample-by-id round-trip --------------------------------------------------

const SRC = path.resolve("mcp-server/src");
const { KnowledgeIngestEngine } = await import(pathToFileURL(path.join(SRC, "engines/KnowledgeIngestEngine.ts")).href);
const dummyMemory = {
  remember: async () => ({ ok: true, value: undefined }),
  setEmbedder: () => {},
};
const engine = new KnowledgeIngestEngine({ memory: dummyMemory });

console.log(`\nSampling ${sampleCount} chunk-ids from successful PDFs:`);
const samples = [];
for (const r of records.slice(0, sampleCount)) {
  const id = engine.chunkId(r.source, 0);
  samples.push({ source: r.source, chunkIndex: 0, id });
}

let foundCount = 0;
for (const s of samples) {
  try {
    const r = await fetch(`${argv.qdrant}/collections/${argv.collection}/points/${s.id}`);
    if (r.status === 200) {
      const body = await r.json();
      const payload = body?.result?.payload ?? {};
      const sourceMatch = payload.source === s.source;
      console.log(`  ✓ ${path.basename(s.source)} (chunk 0, id=${s.id.slice(0, 12)}…): payload.source ${sourceMatch ? "matches" : "MISMATCH"} — pageHint=${payload.pageHint}`);
      if (sourceMatch) foundCount++;
    } else {
      console.log(`  ✗ ${path.basename(s.source)} (id=${s.id.slice(0, 12)}…): HTTP ${r.status}`);
    }
  } catch (e) {
    console.log(`  ✗ ${path.basename(s.source)}: ${e.message}`);
  }
}
console.log(`Round-trip sample: ${foundCount}/${samples.length} chunks present with matching source`);

// --- Semantic recall via Ollama embed + Qdrant search -------------------------

console.log(`\nSemantic recall test: "${argv.query}"`);
try {
  const embedRes = await fetch("http://127.0.0.1:11434/api/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", input: argv.query }),
  });
  if (!embedRes.ok) throw new Error(`Ollama embed HTTP ${embedRes.status}`);
  const embedData = await embedRes.json();
  const vec = embedData?.embeddings?.[0];
  if (!Array.isArray(vec)) throw new Error("Ollama returned no vector");

  const searchRes = await fetch(`${argv.qdrant}/collections/${argv.collection}/points/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vector: vec, limit: 5, with_payload: true }),
  });
  if (!searchRes.ok) throw new Error(`Qdrant search HTTP ${searchRes.status}: ${await searchRes.text()}`);
  const searchData = await searchRes.json();
  const hits = searchData?.result ?? [];
  console.log(`top ${hits.length} hits:`);
  for (const h of hits) {
    const src = h.payload?.source ?? "?";
    const page = h.payload?.pageHint ?? "?";
    const snippet = (h.payload?.text ?? "").slice(0, 100).replace(/\s+/g, " ");
    console.log(`  [score=${h.score?.toFixed(3)}] ${path.basename(src)} p${page}: ${snippet}…`);
  }
} catch (e) {
  console.error(`semantic recall failed: ${e.message}`);
}

console.log("\n=== Verification complete ===");
