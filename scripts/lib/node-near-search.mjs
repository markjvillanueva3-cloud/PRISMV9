// node-near-search.mjs -- semantic nearest-neighbor search over the 768d node
// embeddings (state/shared/nn-graph/node-embeddings-768d.jsonl, the rtx6000-built
// nomic-768d pool, ~60k nodes). Powers `system-viz-query near <id>`: given a node
// id, return the K nodes whose embeddings are closest by cosine similarity.
//
// WHY (sierra, CHEAP-NODE-ACCESS extension): the cheap-read surface had find
// (substring), subgraph (edge neighborhood) and node-card (read-by-id) but NO
// SEMANTIC neighbor lookup -- "what nodes are *conceptually* like this one" had no
// answer short of loading the 884MB graph + a GNN. The 768d embedding pool already
// exists (india's GNN ref-pool feed, which sierra owns); this turns it into a
// token-cheap "find related nodes" capability every slot + hook can call.
//
// DISCIPLINE: never loads the 884MB system-graph.json. Reads ONLY the embeddings
// jsonl. Embedding record shape is {n:<id>, q:[768 ints]} (q is the quantized
// nomic vector; the first line is a {__meta,...} header with no n/q and is skipped).
// Cosine is scale-invariant per vector, so the integer quantization is fine.
//
// Pure helpers (cosineSim / parseEmbeddingRecord / findVector / topKFromRecords)
// are exported for unit testing without a file; nearById is the file-backed entry.

import fs from "node:fs";
import readline from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// scripts/lib -> repo root -> state/shared/nn-graph/...
export const DEFAULT_EMBEDDINGS_PATH = path.resolve(
  __dirname, "..", "..", "state", "shared", "nn-graph", "node-embeddings-768d.jsonl",
);

// Cosine similarity. Returns a number in [-1, 1], or 0 when it is undefined:
// mismatched/empty length, a zero-norm vector (division would be NaN), or any
// non-finite component (a corrupt vector must rank as "not near", never NaN).
export function cosineSim(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Parse one jsonl line into {n, q} or null (null = skip: the __meta header, blank
// lines, malformed JSON, or any record missing the id/vector contract).
export function parseEmbeddingRecord(line) {
  if (!line) return null;
  let o;
  try { o = JSON.parse(line); } catch { return null; }
  if (!o || typeof o.n !== "string" || !Array.isArray(o.q)) return null;
  return { n: o.n, q: o.q };
}

// Read the embeddings jsonl into an array of {n, q}. fs is injectable for tests.
export function loadRecords(filePath = DEFAULT_EMBEDDINGS_PATH, { fs: fsMod = fs } = {}) {
  const text = fsMod.readFileSync(filePath, "utf8");
  const records = [];
  for (const line of text.split("\n")) {
    const r = parseEmbeddingRecord(line);
    if (r) records.push(r);
  }
  return records;
}

// Find a node's own embedding vector by id, or null if absent.
export function findVector(records, id) {
  for (const r of records) { if (r && r.n === id) return r.q; }
  return null;
}

// A bounded top-K accumulator (kept sorted desc, length <= k). Shared by the
// in-memory topKFromRecords and the streaming nearById so both rank identically.
// excludeId drops the query node itself (always its own nearest at sim 1.0).
export function makeTopK(k = 10, excludeId = null) {
  const kk = Math.max(1, Math.floor(k));
  const top = [];
  return {
    push(id, score) {
      if (id === excludeId) return;
      if (top.length < kk) {
        top.push({ id, score });
        top.sort((a, b) => b.score - a.score);
      } else if (score > top[top.length - 1].score) {
        top[top.length - 1] = { id, score };
        top.sort((a, b) => b.score - a.score);
      }
    },
    result() { return top; },
  };
}

// In-memory top-K (used in tests + by callers that already hold the records).
export function topKFromRecords(queryVec, records, { k = 10, excludeId = null } = {}) {
  const acc = makeTopK(k, excludeId);
  for (const r of records) {
    if (!r) continue;
    acc.push(r.n, cosineSim(queryVec, r.q));
  }
  return acc.result();
}

// Stream the embeddings jsonl line-by-line, calling fn(record) for each {n,q}.
// Bounded memory -- NEVER loads the whole file (it is ~120MB and grows). Closes the
// stream early once stopWhen(record) returns true.
async function streamRecords(filePath, fn, stopWhen = null) {
  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      const r = parseEmbeddingRecord(line);
      if (!r) continue;
      fn(r);
      if (stopWhen && stopWhen(r)) break;
    }
  } finally {
    rl.close();
  }
}

// Parse the `near` subcommand's positional args into { id, k }. params is the
// arg list with --json already stripped by the caller. Handles `id`, `id --k N`,
// `--k N id` (flag before or after), bad/missing --k value -> default k=10, and any
// other --flag skipped. Extracted as a pure fn so the CLI surface is unit-testable
// (the inline predicate version shipped a bug: it excluded index 0 when --k was
// absent, breaking the two simplest forms `near id` / `near id --json`).
export function parseNearArgs(params) {
  let k = 10;
  const ids = [];
  for (let i = 0; i < params.length; i++) {
    if (params[i] === "--k") {
      const v = parseInt(params[i + 1], 10);
      if (Number.isFinite(v) && v > 0) k = v;
      i++; // consume the value
      continue;
    }
    if (typeof params[i] === "string" && params[i].startsWith("--")) continue; // skip other flags
    ids.push(params[i]);
  }
  return { id: ids[0] ?? null, k };
}

// File-backed entry point: nearest K node ids to <id> by cosine over the 768d pool.
// STREAMS the file in two bounded-memory passes (find <id>'s vector, then score all)
// -- never materializes the ~60k-record pool in memory (the loadRecords path OOMs on
// the real file). Throws (code ENOEMBED) with an honest message if the id has no
// embedding -- never a silent empty, so a caller distinguishes "no neighbors" from
// "id not in the pool" (R12).
export async function nearById(id, { path: filePath = DEFAULT_EMBEDDINGS_PATH, k = 10 } = {}) {
  let qv = null;
  await streamRecords(filePath, (r) => { if (r.n === id) qv = r.q; }, (r) => r.n === id);
  if (!qv) {
    const err = new Error(`no embedding for node id "${id}" in ${filePath}`);
    err.code = "ENOEMBED";
    throw err;
  }
  const acc = makeTopK(k, id);
  let total = 0;
  await streamRecords(filePath, (r) => { total++; acc.push(r.n, cosineSim(qv, r.q)); });
  return { id, k: Math.max(1, Math.floor(k)), total, neighbors: acc.result() };
}
