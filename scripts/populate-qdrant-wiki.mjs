#!/usr/bin/env node
// HMEMV09 -- stream the wiki concept-leaf embeddings into a named Qdrant
// collection (prism_wiki) so the wiki-precheck semantic fallback can use ANN
// instead of loading the 137MB knowledge/wiki/architecture/_embeddings.jsonl
// (~53.8K int8[768] nomic-embed-text vectors) + linear-scanning it on every
// paraphrase query. Producer increment (R13 verifiable core); the consumer
// rewire of wiki-precheck-inject.mjs is a sibling unit.
//
// STREAMING (not the non-streaming populateQdrant): the wiki jsonl stores each
// vector as a plain int8[768] JSON array, so loading all 53.8K at once OOMs the
// default heap (~382MB ceiling, confirmed). streamPopulateQdrant holds at most
// one batch in memory, so it is OOM-proof regardless of corpus growth -- the
// same streaming fix the tribal index needed
// ([[reference_wiki_tribal_coverage_69pct_qdrant_gate_2026_06_10]]).
//
// Clone-don't-fork: reuses populate-qdrant's streamPopulateQdrant (which reuses
// buildBatch -> identical id/dequant/payload as every other collection). The
// only wiki-specific parts are wikiValidate (a 768-dim guard dropping malformed
// / empty-text entries -- see
// [[reference_wiki_tribal_embed_pipeline_blocked_2026_06_08]]) and
// ensureWikiCollection. Dequant is q/127; distance is Cosine, so the per-vector
// scale is irrelevant (direction-preserving) -- the per-entry `s` is unused.
//
// Point ids are FNV-1a uint32 of node_id (populate-qdrant.nodeIdToPointId). At
// ~53.8K entries the birthday bound gives ~0.34 expected id collisions (~71%
// chance of zero); a collision drops ONE entry from ANN (<0.002%, still
// BM25-recoverable). The live --json `sent` vs the collection points_count is
// the validation gate; a wider 64-bit id is a deferred shared-file follow-up.
//
// Flags: --collection NAME (default prism_wiki) --batch-size N --limit N
//        --dry-run --url URL --jsonl PATH --json --create

import { spawnSync } from "node:child_process";
import { streamPopulateQdrant } from "./populate-qdrant.mjs";

export const DEFAULT_INPUT = "H:/prism/knowledge/wiki/architecture/_embeddings.jsonl";
export const DEFAULT_URL = "http://localhost:6333";
export const DEFAULT_COLLECTION = "prism_wiki";
export const DIM = 768;

/**
 * Pure per-line validator for streamPopulateQdrant. Accepts ONLY a full-DIM wiki
 * vector and returns the minimal {n,q} point record (drops t/h/s), else null.
 * The dim guard drops malformed / empty-text entries (truncated vectors from
 * all-frontmatter / all-link / generated _-stub pages) that would otherwise make
 * Qdrant reject the whole batch.
 */
export function wikiValidate(o) {
  if (!o || typeof o.n !== "string" || !Array.isArray(o.q) || o.q.length !== DIM) return null;
  return { n: o.n, q: o.q };
}

// curl subprocess for HTTP (Windows http-pool-starvation convention, mirrors
// populate-qdrant-memories.mjs). spawnImpl injectable for tests.
function curlJson(method, url, body, opts = {}) {
  const args = ["-sS", "--max-time", "30", "-X", method, "-H", "Content-Type: application/json"];
  if (body != null) args.push("--data-binary", "@-");
  args.push(url);
  const spawnImpl = opts.spawnImpl || spawnSync;
  const r = spawnImpl("curl", args, { encoding: "utf8", input: body == null ? undefined : body, maxBuffer: 16 * 1024 * 1024 });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

/** Idempotent: PUT creates-or-leaves; returns true if the collection exists after. */
export function ensureWikiCollection(url, collection, opts = {}) {
  const body = JSON.stringify({ vectors: { size: DIM, distance: "Cosine" } });
  curlJson("PUT", `${url}/collections/${collection}`, body, opts);
  const chk = curlJson("GET", `${url}/collections/${collection}`, null, opts);
  try { return JSON.parse(chk.stdout)?.result?.status != null; } catch { return false; }
}

function parseArgs(argv) {
  const a = { input: DEFAULT_INPUT, url: DEFAULT_URL, collection: DEFAULT_COLLECTION, batchSize: 256, limit: Infinity, dryRun: false, json: false, create: false };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--dry-run") a.dryRun = true;
    else if (x === "--json") a.json = true;
    else if (x === "--create") a.create = true;
    else if (x === "--collection") a.collection = argv[++i] || DEFAULT_COLLECTION;
    else if (x === "--batch-size") a.batchSize = Number(argv[++i]) || 256;
    else if (x === "--limit") a.limit = Number(argv[++i]) || Infinity;
    else if (x === "--url") a.url = argv[++i] || DEFAULT_URL;
    else if (x === "--jsonl") a.input = argv[++i] || DEFAULT_INPUT;
  }
  return a;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.create && !a.dryRun) {
    const ok = ensureWikiCollection(a.url, a.collection);
    if (!ok) { process.stderr.write(`[qdrant-wiki] could not create collection ${a.collection}\n`); return 1; }
    process.stdout.write(`[qdrant-wiki] collection ready: ${a.collection} (dim ${DIM}, Cosine)\n`);
  }
  const start = Date.now();
  const r = await streamPopulateQdrant({
    inputPath: a.input, url: a.url, collection: a.collection,
    batchSize: a.batchSize, limit: a.limit, dryRun: a.dryRun, validate: wikiValidate,
  });
  const elapsedMs = Date.now() - start;
  if (a.json) { process.stdout.write(JSON.stringify({ ...r, elapsedMs, collection: a.collection, dryRun: a.dryRun }, null, 2) + "\n"); return r.ok ? 0 : 1; }
  if (!r.ok) { process.stderr.write(`[qdrant-wiki] FAILED: ${r.error}\n`); return 1; }
  process.stdout.write(`[qdrant-wiki] ${a.dryRun ? "DRY-RUN" : "APPLIED"} collection=${a.collection} sent=${r.sent} scanned=${r.scanned} dropped=${r.dropped} batches=${r.batches} elapsed=${elapsedMs}ms\n`);
  return 0;
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(process.argv[1] || "");
  } catch { return false; }
})();
if (invokedDirect) main().then((code) => process.exit(code));
