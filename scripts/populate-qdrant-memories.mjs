#!/usr/bin/env node
// HMEMV09 -- seed the 17K Obsidian-vault memory embeddings into a Qdrant
// collection so memory recall can use ANN instead of the per-query linear int8
// scan over `state/shared/memory-embeddings-sidecar.json`. Producer increment
// (R13 verifiable core); the consumer rewire of denseRankAll is a follow-up.
//
// Clone-don't-fork of scripts/populate-qdrant.mjs: reuses its populateQdrant()
// (batched upsert + curl HTTP) via the loadImpl injection. The only new part is
// the loader, because the memory sidecar stores each vector as a BASE64-encoded
// int8[768] string (`vec`) + an L2 `norm`, NOT a plain int8 array like the
// node-embeddings jsonl. We base64-decode -> signed Int8Array -> {n,q}; the
// reused buildBatch dequantizes q/127 to floats. Distance is Cosine, so the
// per-vector magnitude (norm) is irrelevant and intentionally dropped.
//
// Flags: --collection NAME (default prism_memories) --batch-size N --limit N
//        --dry-run --url URL --sidecar PATH --json --create (create collection first)

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { populateQdrant } from "./populate-qdrant.mjs";

const DEFAULT_SIDECAR = "H:/prism/state/shared/memory-embeddings-sidecar.json";
const DEFAULT_URL = "http://localhost:6333";
const DEFAULT_COLLECTION = "prism_memories";
const DIM = 768;

/** Decode a base64 int8 vector string to a signed-int array (length DIM). */
export function decodeInt8Vec(b64) {
  if (typeof b64 !== "string" || b64.length === 0) return null;
  const u8 = Uint8Array.from(Buffer.from(b64, "base64"));
  // reinterpret the raw bytes as signed int8 (byte 200 -> -56), preserving direction
  const i8 = new Int8Array(u8.buffer, u8.byteOffset, u8.length);
  return Array.from(i8);
}

/**
 * loadImpl for populateQdrant: read the memory sidecar -> {meta, records:[{n,q}]}.
 * Each sidecar record is {key, name, namespace, vec(base64 int8), norm}.
 */
export function loadMemorySidecar(path = DEFAULT_SIDECAR, opts = {}) {
  const readImpl = opts.readImpl || readFileSync;
  const existsImpl = opts.existsImpl || existsSync;
  if (!existsImpl(path)) return { meta: null, records: [], error: "file-missing" };
  let j;
  try { j = JSON.parse(readImpl(path, "utf8")); }
  catch (e) { return { meta: null, records: [], error: e.message }; }
  const src = Array.isArray(j) ? j : (j.records || j.entries || j.items || []);
  const records = [];
  let dropped = 0;
  for (const r of src) {
    if (!r || typeof r !== "object") { dropped++; continue; }
    // canonical id only -- `name` is a (non-unique) display label, never a point id
    const key = r.key || r.id || r.n;
    const q = decodeInt8Vec(r.vec);
    if (typeof key !== "string" || !q || q.length !== DIM) { dropped++; continue; }
    records.push({ n: key, q });
  }
  return { meta: { dim: j.dim, quant: j.quant, model: j.model, count: j.count, dropped }, records, error: null };
}

function curlJson(method, url, body) {
  const args = ["-sS", "--max-time", "30", "-X", method, "-H", "Content-Type: application/json"];
  if (body != null) args.push("--data-binary", "@-");
  args.push(url);
  const r = spawnSync("curl", args, { encoding: "utf8", input: body == null ? undefined : body, maxBuffer: 16 * 1024 * 1024 });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

export function ensureCollection(url, collection) {
  // idempotent: PUT creates-or-leaves; returns true if collection exists after.
  const body = JSON.stringify({ vectors: { size: DIM, distance: "Cosine" } });
  curlJson("PUT", `${url}/collections/${collection}`, body);
  const chk = curlJson("GET", `${url}/collections/${collection}`, null);
  try { return JSON.parse(chk.stdout)?.result?.status != null; } catch { return false; }
}

function parseArgs(argv) {
  const a = { sidecar: DEFAULT_SIDECAR, url: DEFAULT_URL, collection: DEFAULT_COLLECTION, batchSize: 256, limit: Infinity, dryRun: false, json: false, create: false };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--dry-run") a.dryRun = true;
    else if (x === "--json") a.json = true;
    else if (x === "--create") a.create = true;
    else if (x === "--collection") a.collection = argv[++i] || DEFAULT_COLLECTION;
    else if (x === "--batch-size") a.batchSize = Number(argv[++i]) || 256;
    else if (x === "--limit") a.limit = Number(argv[++i]) || Infinity;
    else if (x === "--url") a.url = argv[++i] || DEFAULT_URL;
    else if (x === "--sidecar") a.sidecar = argv[++i] || DEFAULT_SIDECAR;
  }
  return a;
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.create && !a.dryRun) {
    const ok = ensureCollection(a.url, a.collection);
    if (!ok) { process.stderr.write(`[qdrant-memories] could not create collection ${a.collection}\n`); return 1; }
    process.stdout.write(`[qdrant-memories] collection ready: ${a.collection} (dim ${DIM}, Cosine)\n`);
  }
  const start = Date.now();
  const r = populateQdrant({
    inputPath: a.sidecar, url: a.url, collection: a.collection,
    batchSize: a.batchSize, limit: a.limit, dryRun: a.dryRun,
    loadImpl: (p) => loadMemorySidecar(p),
  });
  const elapsedMs = Date.now() - start;
  if (a.json) { process.stdout.write(JSON.stringify({ ...r, elapsedMs, collection: a.collection, dryRun: a.dryRun }, null, 2) + "\n"); return r.ok ? 0 : 1; }
  if (!r.ok) { process.stderr.write(`[qdrant-memories] FAILED: ${r.error}\n`); return 1; }
  process.stdout.write(`[qdrant-memories] ${a.dryRun ? "DRY-RUN" : "APPLIED"} collection=${a.collection} sent=${r.sent}/${r.totalAvailable} batches=${r.batches} elapsed=${elapsedMs}ms\n`);
  return 0;
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(process.argv[1] || "");
  } catch { return false; }
})();
if (invokedDirect) process.exit(main());
