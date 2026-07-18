#!/usr/bin/env node
// PSN-ENHANCE-MS0/U-PSN-QDRANT-POPULATE — ingest the 768d node embeddings
// from H:/prism/state/shared/nn-graph/node-embeddings-768d.jsonl into a
// named Qdrant collection. Closes iter-13 follow-up: collections exist but
// are empty, blocking the hybrid (BM25 + vector + graph + episode) retrieval.
//
// Data shape: each JSONL line is `{n: "node-id", q: int8[]}` (RaBitQ-style
// int8 quantization of nomic-embed-text 768-d). Qdrant accepts plain float
// vectors so we dequantize by dividing by SCALE (default 127 — calibrated
// from observed range in the file). The `__meta` first-line is skipped.
//
// Idempotent at the Qdrant API level (upsert overwrites by id).
//
// Flags:
//   --collection NAME        target collection (default: prism_engines)
//   --batch-size N           upsert batch size (default: 100)
//   --limit N                stop after N vectors (default: Infinity)
//   --dry-run                load + dequantize, do NOT POST to Qdrant
//   --url URL                Qdrant base URL (default: http://localhost:6333)
//   --jsonl PATH             override input path
//   --json                   machine-readable output

import { readFileSync, existsSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { spawnSync } from "node:child_process";

const DEFAULT_INPUT = "H:/prism/state/shared/nn-graph/node-embeddings-768d.jsonl";
const DEFAULT_URL = "http://localhost:6333";
const DEFAULT_COLLECTION = "prism_engines";
const DEFAULT_BATCH = 100;
const SCALE = 127.0;

// Use curl subprocess for HTTP (avoids Windows http pool starvation
// per H:/prism/scripts/ollama-docker-health.mjs convention).
function curlSend(method, url, body, opts = {}) {
  const args = ["-sS", "--max-time", "30", "-X", method, "-H", "Content-Type: application/json"];
  if (body !== null && body !== undefined) {
    args.push("--data-binary", "@-");
  }
  args.push(url);
  const spawnImpl = opts.spawnImpl || spawnSync;
  const r = spawnImpl("curl", args, { encoding: "utf8", input: body == null ? undefined : body, maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

export function loadEmbeddings(path = DEFAULT_INPUT, opts = {}) {
  const readImpl = opts.readImpl || readFileSync;
  const existsImpl = opts.existsImpl || existsSync;
  if (!existsImpl(path)) return { meta: null, records: [], error: "file-missing" };
  let raw;
  try { raw = readImpl(path, "utf8"); }
  catch (e) { return { meta: null, records: [], error: e.message }; }
  let meta = null;
  const records = [];
  for (const line of raw.split("\n")) {
    if (line.length === 0) continue;
    let obj;
    try { obj = JSON.parse(line); }
    catch { continue; }
    if (!obj || typeof obj !== "object") continue;
    if (obj.__meta === true) { meta = obj; continue; }
    if (typeof obj.n !== "string" || !Array.isArray(obj.q)) continue;
    records.push(obj);
  }
  return { meta, records, error: null };
}

export function dequantize(q, scale = SCALE) {
  if (!Array.isArray(q)) return [];
  return q.map((v) => v / scale);
}

// Deterministic int id from a string node-id (Qdrant point id must be
// uint64 or UUID; this hashes the slug to fit). FNV-1a 32-bit, doubled.
export function nodeIdToPointId(slug) {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // make positive, fit safely in Number
  return (h >>> 0);
}

export function buildBatch(records, scale = SCALE) {
  return records.map((r) => ({
    id: nodeIdToPointId(r.n),
    vector: dequantize(r.q, scale),
    payload: { node_id: r.n },
  }));
}

export function populateQdrant({
  inputPath = DEFAULT_INPUT,
  url = DEFAULT_URL,
  collection = DEFAULT_COLLECTION,
  batchSize = DEFAULT_BATCH,
  limit = Infinity,
  dryRun = false,
  loadImpl,
  sendImpl,
} = {}) {
  const load = loadImpl || ((p) => loadEmbeddings(p));
  const send = sendImpl || curlSend;
  const { meta, records, error } = load(inputPath);
  if (error) return { ok: false, error, sent: 0, batches: 0 };
  if (records.length === 0) return { ok: false, error: "no-records", sent: 0, batches: 0 };
  const slice = records.slice(0, Math.min(limit, records.length));
  let sent = 0;
  let batches = 0;
  let lastError = null;
  for (let i = 0; i < slice.length; i += batchSize) {
    const chunk = slice.slice(i, i + batchSize);
    const points = buildBatch(chunk);
    if (dryRun) { sent += points.length; batches++; continue; }
    const body = JSON.stringify({ points });
    const r = send("PUT", `${url}/collections/${collection}/points?wait=true`, body);
    if (r.status !== 0) { lastError = `curl exit ${r.status}: ${r.stderr.slice(0, 200)}`; break; }
    let parsed;
    try { parsed = JSON.parse(r.stdout); }
    catch { lastError = `parse: ${r.stdout.slice(0, 200)}`; break; }
    if (parsed && parsed.status !== "ok" && parsed.result && parsed.result.status !== "completed" && parsed.result.status !== "acknowledged") {
      lastError = `qdrant: ${JSON.stringify(parsed).slice(0, 200)}`;
      break;
    }
    sent += points.length;
    batches++;
  }
  return { ok: !lastError, error: lastError, sent, batches, totalAvailable: records.length, meta };
}

// Streaming variant: never holds more than `batchSize` records in memory at
// once, so it is OOM-proof regardless of corpus size (the non-streaming
// populateQdrant above loads the whole input via loadImpl -> records[], which
// OOMs the default heap on a 137MB / 53.8K-vector jsonl like the wiki corpus).
// Reuses buildBatch (identical id/dequant/payload as every other collection) and
// curlSend, so streamed points are byte-identical to populateQdrant's.
//
// Injectables for tests: `lineIter` (an async-iterable of strings, default reads
// inputPath line-by-line), `sendImpl`, and `validate(obj) -> {n,q}|null` (default
// accepts the native {n, q:array} shape, skipping the __meta first line). A
// caller (e.g. wiki) passes a stricter validate to drop wrong-dimension vectors.
export async function streamPopulateQdrant({
  inputPath = DEFAULT_INPUT,
  url = DEFAULT_URL,
  collection = DEFAULT_COLLECTION,
  batchSize = DEFAULT_BATCH,
  limit = Infinity,
  dryRun = false,
  scale = SCALE,
  sendImpl,
  lineIter,
  validate,
} = {}) {
  const send = sendImpl || curlSend;
  const vfn = validate || ((o) => (o && typeof o.n === "string" && Array.isArray(o.q)) ? { n: o.n, q: o.q } : null);
  const lines = lineIter || createInterface({ input: createReadStream(inputPath, "utf8"), crlfDelay: Infinity });
  let sent = 0, batches = 0, dropped = 0, scanned = 0, malformed = 0, lastError = null, meta = null;
  let buf = [];
  const flush = () => {
    if (buf.length === 0) return true;
    const points = buildBatch(buf, scale);
    buf = [];
    if (dryRun) { sent += points.length; batches++; return true; }
    const r = send("PUT", `${url}/collections/${collection}/points?wait=true`, JSON.stringify({ points }));
    if (r.status !== 0) { lastError = `curl exit ${r.status}: ${(r.stderr || "").slice(0, 200)}`; return false; }
    let parsed;
    try { parsed = JSON.parse(r.stdout); }
    catch { lastError = `parse: ${(r.stdout || "").slice(0, 200)}`; return false; }
    if (parsed && parsed.status !== "ok" && parsed.result && parsed.result.status !== "completed" && parsed.result.status !== "acknowledged") {
      lastError = `qdrant: ${JSON.stringify(parsed).slice(0, 200)}`;
      return false;
    }
    sent += points.length; batches++; return true;
  };
  // Build the result + an HONEST integrity verdict (R12): a torn/truncated input
  // (the wiki jsonl is regenerated by a separate embedder) must NOT report
  // ok:true on a partial populate. On a FULL read (not --limit) with a known
  // meta.count, require scanned + malformed === meta.count, else fail loud.
  // malformed>0 with a matching count is the benign single-corrupt-entry case
  // -> warning, not error.
  const finalize = (limited) => {
    let err = lastError;
    let warning = null;
    if (!err && !limited && meta && typeof meta.count === "number") {
      const accounted = scanned + malformed;
      if (accounted !== meta.count) {
        err = `corpus-incomplete: scanned+malformed ${accounted} != meta.count ${meta.count} (torn/truncated input)`;
      }
    }
    if (!err && malformed > 0) warning = `${malformed} malformed line(s) skipped`;
    if (!err && sent === 0) err = "no-records";
    return { ok: !err, error: err, warning, sent, batches, dropped, malformed, scanned, meta };
  };
  try {
    for await (const line of lines) {
      if (!line) continue;
      let obj;
      try { obj = JSON.parse(line); } catch { malformed++; continue; }
      if (!obj || typeof obj !== "object") { malformed++; continue; }
      if (obj.__meta === true) { meta = obj; continue; }
      scanned++;
      const rec = vfn(obj);
      if (!rec) { dropped++; continue; }
      buf.push(rec);
      if (sent + buf.length >= limit) {            // accepted enough: trim + final flush
        const room = limit - sent;
        if (buf.length > room) buf = buf.slice(0, room);
        flush();
        return finalize(true);                     // limited read: skip the meta.count integrity cross-check
      }
      if (buf.length >= batchSize) { if (!flush()) break; }
    }
    if (!lastError) flush();
  } catch (e) { lastError = lastError || e.message; }
  return finalize(false);
}

function parseArgs(argv) {
  const a = { inputPath: DEFAULT_INPUT, url: DEFAULT_URL, collection: DEFAULT_COLLECTION, batchSize: DEFAULT_BATCH, limit: Infinity, dryRun: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--dry-run") a.dryRun = true;
    else if (x === "--json") a.json = true;
    else if (x === "--collection") a.collection = argv[++i] || DEFAULT_COLLECTION;
    else if (x === "--batch-size") a.batchSize = Number(argv[++i]) || DEFAULT_BATCH;
    else if (x === "--limit") a.limit = Number(argv[++i]) || Infinity;
    else if (x === "--url") a.url = argv[++i] || DEFAULT_URL;
    else if (x === "--jsonl") a.inputPath = argv[++i] || DEFAULT_INPUT;
  }
  return a;
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  const start = Date.now();
  const r = populateQdrant(a);
  const elapsedMs = Date.now() - start;
  const summary = { ...r, elapsedMs, collection: a.collection, dryRun: a.dryRun };
  if (a.json) { process.stdout.write(JSON.stringify(summary, null, 2) + "\n"); return r.ok ? 0 : 1; }
  if (!r.ok) {
    process.stderr.write(`[populate-qdrant] FAILED: ${r.error}\n`);
    return 1;
  }
  process.stdout.write(`[populate-qdrant] ${a.dryRun ? "DRY-RUN" : "APPLIED"} collection=${a.collection} sent=${r.sent}/${r.totalAvailable} batches=${r.batches} elapsed=${elapsedMs}ms\n`);
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
