#!/usr/bin/env node
// A6 — build the memory-vault DENSE-embeddings sidecar that backs the hybrid
// BM25+dense+RRF retrieval added to memory-index-search-lib.mjs.
//
// Reads:  H:/prism/state/shared/memory-index-sidecar.json  (the BM25 sidecar —
//         reused as the record source so the embeddings sidecar aligns 1:1 by
//         recordKey; never re-enumerate the vault here, that would risk drift).
// Embeds: each record's "name. description. opening" via ollama
//         nomic-embed-text /api/embeddings (768-d), quantized to int8.
// Writes: H:/prism/state/shared/memory-embeddings-sidecar.json (atomic).
//
// OFFLINE one-shot (or cron) — NOT the hot path, so async fetch + a concurrency
// pool are fine here (the SEARCH path stays sync via curl, see the lib). The
// ~10.9k embeds take a few minutes; --resume skips already-embedded keys so a
// crash or GPU stall never loses prior work.
//
//   node scripts/build-memory-embeddings-sidecar.mjs                # full build
//   node scripts/build-memory-embeddings-sidecar.mjs --limit 20     # smoke test
//   node scripts/build-memory-embeddings-sidecar.mjs --resume       # continue
//   node scripts/build-memory-embeddings-sidecar.mjs --concurrency 6
//
// Fail-loud (R12): exits 1 if ollama is unreachable at start, or if >25% of
// embeds fail — a partial/degraded sidecar must NOT silently ship.

import { readFileSync, writeFileSync, renameSync, existsSync, statSync } from "node:fs";

import {
  DEFAULT_SIDECAR_PATH,
  DEFAULT_EMBEDDINGS_SIDECAR_PATH,
  EMBEDDINGS_SIDECAR_SCHEMA_VERSION,
  buildEmbedDocText,
  recordKey,
  packInt8,
} from "./lib/memory-index-search-lib.mjs";
import { resolveEmbedConcurrency } from "./lib/embed-pool.mjs";

const DEFAULT_MODEL = "nomic-embed-text";
const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
// Fleet-wide embed-concurrency knob (U-EMBED-CONCURRENCY-KNOB, slot:india 2026-06-11):
// PRISM_EMBED_CONCURRENCY raises the default in-flight Ollama embed calls so the
// 96GB Blackwell (which `nomic-embed-text` leaves ~94% idle at low concurrency) is
// saturated -- the SAME knob the wiki/tribal embedders honor (embed-pool.mjs). An
// explicit --concurrency still overrides. Output is concurrency-invariant (each key
// embeds independently into its own result slot), so this only changes throughput.
const DEFAULT_CONCURRENCY = 4;
const PER_ITEM_TIMEOUT_MS = 20_000;     // generous at build time (GPU may be busy)
const CHECKPOINT_EVERY = 250;            // flush .partial every N successful embeds
const MAX_FAIL_FRACTION = 0.25;          // >25% failures → exit 1 (fail-loud)

function parseArgs(argv) {
  const a = { limit: Infinity, resume: false,
    concurrency: resolveEmbedConcurrency(process.env, DEFAULT_CONCURRENCY), json: false,
    model: DEFAULT_MODEL, url: DEFAULT_OLLAMA_URL,
    inPath: DEFAULT_SIDECAR_PATH, outPath: DEFAULT_EMBEDDINGS_SIDECAR_PATH };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--limit") a.limit = Math.max(1, parseInt(argv[++i], 10) || 1);
    else if (k === "--resume") a.resume = true;
    else if (k === "--json") a.json = true;
    else if (k === "--concurrency") a.concurrency = Math.max(1, parseInt(argv[++i], 10) || DEFAULT_CONCURRENCY);
    else if (k === "--model") a.model = argv[++i] || DEFAULT_MODEL;
    else if (k === "--url") a.url = argv[++i] || DEFAULT_OLLAMA_URL;
    else if (k === "--in") a.inPath = argv[++i] || DEFAULT_SIDECAR_PATH;
    else if (k === "--out") a.outPath = argv[++i] || DEFAULT_EMBEDDINGS_SIDECAR_PATH;
  }
  return a;
}

async function embedOne(text, { url, model, timeoutMs = PER_ITEM_TIMEOUT_MS }) {
  let timer;
  try {
    const ctrl = new AbortController();
    timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${url}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    const emb = j && Array.isArray(j.embedding) ? j.embedding : null;
    return emb && emb.length ? emb : null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Bounded-concurrency map. Preserves no order requirement; each task writes its
// own result slot. Pure control-flow; the impure embed is injected.
async function runPool(items, concurrency, worker, onProgress) {
  let idx = 0;
  let done = 0;
  async function lane() {
    while (idx < items.length) {
      const myIdx = idx++;
      await worker(items[myIdx], myIdx);
      done++;
      if (onProgress && done % CHECKPOINT_EVERY === 0) onProgress(done);
    }
  }
  const lanes = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) lanes.push(lane());
  await Promise.all(lanes);
  return done;
}

function loadExistingByKey(outPath) {
  const byKey = new Map();
  for (const p of [outPath, `${outPath}.partial`]) {
    if (!existsSync(p)) continue;
    try {
      const sc = JSON.parse(readFileSync(p, "utf8"));
      if (sc && Array.isArray(sc.records)) {
        for (const r of sc.records) if (r && r.key && r.vec) byKey.set(r.key, r);
      }
    } catch { /* ignore corrupt partial */ }
  }
  return byKey;
}

function writeSidecar(outPath, sidecar, { atomic = true } = {}) {
  const tmp = `${outPath}.tmp.${process.pid}`;
  writeFileSync(tmp, JSON.stringify(sidecar), "utf8");
  if (atomic) renameSync(tmp, outPath);
  else renameSync(tmp, `${outPath}.partial`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(args.inPath)) {
    process.stderr.write(`[build-memory-embeddings] input sidecar missing: ${args.inPath}\n`
      + "Run: node scripts/build-memory-index-sidecar.mjs first.\n");
    process.exit(1);
  }
  const inSc = JSON.parse(readFileSync(args.inPath, "utf8"));
  if (!inSc || !Array.isArray(inSc.records) || inSc.records.length === 0) {
    process.stderr.write("[build-memory-embeddings] input sidecar has no records\n");
    process.exit(1);
  }

  // Fail-loud preflight: ollama must be reachable + the model must embed.
  const probe = await embedOne("search_query: preflight", { url: args.url, model: args.model, timeoutMs: 15_000 });
  if (!probe) {
    process.stderr.write(`[build-memory-embeddings] ollama preflight FAILED at ${args.url} (model ${args.model}).\n`
      + "  Check: curl -s " + args.url + "/api/tags  and that nomic-embed-text is pulled.\n");
    process.exit(1);
  }
  const dim = probe.length;

  const source = inSc.records.slice(0, args.limit).map((r) => ({
    key: recordKey(r), name: r.name, fileName: r.fileName,
    namespace: r.namespace, docText: buildEmbedDocText(r),
  }));

  // U-MRS-EXCLUDE follow-up (scrutiny P1, 2026-06-01 slot:golf): in --resume mode,
  // EVICT any previously-embedded record whose key is no longer in the (now
  // supersession-filtered) BM25 source — otherwise a superseded/deleted memory keeps
  // its stale vector forever and the dense sidecar diverges from the corpus. Intersect
  // against the FULL inSc.records key set, NOT the --limit-truncated `source` (which
  // would wrongly drop valid entries during a partial run).
  const liveKeys = new Set(inSc.records.map((r) => recordKey(r)));
  const existing = args.resume ? loadExistingByKey(args.outPath) : new Map();
  const results = new Map();                  // key → {key,name,fileName,namespace,vec,norm}
  let evicted = 0;
  for (const [k, v] of existing) { if (liveKeys.has(k)) results.set(k, v); else evicted++; }
  const resumedKept = results.size;
  const todo = source.filter((s) => !results.has(s.key));

  let failures = 0;
  const t0 = Date.now();

  const flushPartial = () => {
    writeSidecar(args.outPath, {
      schemaVersion: EMBEDDINGS_SIDECAR_SCHEMA_VERSION,
      builtAt: new Date().toISOString(),
      model: args.model, dim, quant: "int8",
      sourceSidecar: args.inPath,
      sourceMtimeMs: Number(inSc.sourceMtimeMs) || statSync(args.inPath).mtimeMs,
      count: results.size, partial: true,
      records: [...results.values()],
    }, { atomic: false });
  };

  await runPool(todo, args.concurrency, async (item) => {
    const emb = await embedOne(item.docText, { url: args.url, model: args.model });
    if (!emb) { failures++; return; }
    const packed = packInt8(emb);
    if (!packed) { failures++; return; }
    results.set(item.key, {
      key: item.key, name: item.name, fileName: item.fileName,
      namespace: item.namespace, vec: packed.b64, norm: packed.norm,
    });
  }, (done) => {
    flushPartial();
    process.stderr.write(`[build-memory-embeddings] ${done}/${todo.length} embedded `
      + `(${failures} fail) ${Math.round((Date.now() - t0) / 1000)}s\n`);
  });

  const attempted = todo.length;
  const failFrac = attempted > 0 ? failures / attempted : 0;
  if (failFrac > MAX_FAIL_FRACTION) {
    process.stderr.write(`[build-memory-embeddings] FAIL-LOUD: ${failures}/${attempted} embeds failed `
      + `(${Math.round(failFrac * 100)}% > ${MAX_FAIL_FRACTION * 100}%). Refusing to ship a degraded sidecar.\n`
      + "  Wrote a .partial — fix ollama and re-run with --resume.\n");
    flushPartial();
    process.exit(1);
  }

  const sidecar = {
    schemaVersion: EMBEDDINGS_SIDECAR_SCHEMA_VERSION,
    builtAt: new Date().toISOString(),
    model: args.model, dim, quant: "int8",
    sourceSidecar: args.inPath,
    sourceMtimeMs: Number(inSc.sourceMtimeMs) || statSync(args.inPath).mtimeMs,
    count: results.size, partial: false,
    records: [...results.values()],
  };
  writeSidecar(args.outPath, sidecar, { atomic: true });

  const elapsed = Math.round((Date.now() - t0) / 1000);
  const out = { ok: true, outPath: args.outPath, count: results.size, dim,
    embedded: attempted - failures, failures, skipped: resumedKept, evicted, elapsedSec: elapsed,
    model: args.model, schemaVersion: EMBEDDINGS_SIDECAR_SCHEMA_VERSION };
  if (args.json) process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  else process.stdout.write(`[build-memory-embeddings] wrote ${args.outPath} `
    + `count=${results.size} dim=${dim} embedded=${attempted - failures} fail=${failures} `
    + `skip=${resumedKept} evict=${evicted} ${elapsed}s\n`);
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv);
  } catch { return false; }
})();

if (invokedDirect) {
  main().catch((err) => {
    try { process.stderr.write(`[build-memory-embeddings] ${err?.stack || err?.message || err}\n`); }
    catch { /* ignore */ }
    process.exit(1);
  });
}

export { parseArgs, runPool, embedOne, loadExistingByKey };
