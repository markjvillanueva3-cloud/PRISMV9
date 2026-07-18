#!/usr/bin/env node
/**
 * tribal-rerank.mjs — L2 of TRIBAL × AI
 *
 * Reads `state/shared/tribal-embed-index.json` (L1), embeds the
 * incoming query via Ollama nomic-embed-text, returns top-N hits
 * with optional domain weighting.
 *
 * Differs from L1 --query in three ways:
 *   1. Domain-aware: --domain <mill|lathe|wedm|cad|cam|backend-dev|general>
 *      doubles the cosine score for in-domain entries before sort.
 *      (`backend-dev` added 2026-05-18 lima for coding/CS/SE/AI/DL/NN
 *      tribal knowledge surfaced to backend-dev slots; see
 *      [[reference_backend_dev_tribal_wiring_2026_05_18]] + CLAUDE.md.)
 *   2. Citation-log emit: every successful query appends one record
 *      to `state/shared/tribal-citation-log.jsonl` so L4 + L6 + the
 *      decay layer can measure which entries actually fire.
 *   3. JSON output mode (--json) for consumption by L4 / L5 hooks.
 *
 * Usage:
 *   node tribal-rerank.mjs --query "chatter on thin wall"
 *   node tribal-rerank.mjs --query "..." --domain mill --k 3
 *   node tribal-rerank.mjs --query "..." --json
 *   node tribal-rerank.mjs --query "..." --no-cite     (skip log)
 */

import fs from "node:fs";
import path from "node:path";
// Cap-safe loader: tribal-embed-index.json crossed V8's 512MiB max string
// length (2026-06-08), so JSON.parse(readFileSync(path,"utf8")) throws BEFORE
// parsing — silently killing tribal injection (PSN leg #5) fleet-wide. The
// buffered loader reads the index without ever allocating a >cap string.
// [[reference_tribal_index_v8_string_cap_2026_06_08]]
import { streamTribalEntries } from "../../scripts/lib/load-tribal-index.mjs";

const PRISM = "H:/prism";
const INDEX_PATH = `${PRISM}/state/shared/tribal-embed-index.json`;
const CITATION_LOG = `${PRISM}/state/shared/tribal-citation-log.jsonl`;
const OLLAMA_URL = "http://127.0.0.1:11434";
const MODEL = "nomic-embed-text:latest";
const DEFAULT_K = 5;
const IN_DOMAIN_WEIGHT = 2.0;

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      opts[k] = v;
    }
  }
  return opts;
}

async function embed(text) {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: text }),
  });
  if (!res.ok) throw new Error(`ollama embed ${res.status}: ${await res.text()}`);
  const j = await res.json();
  if (!Array.isArray(j.embedding)) throw new Error("ollama returned no embedding");
  return j.embedding;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function appendCitation(record) {
  try {
    fs.mkdirSync(path.dirname(CITATION_LOG), { recursive: true });
    fs.appendFileSync(CITATION_LOG, JSON.stringify(record) + "\n");
  } catch (e) {
    // citation log is best-effort — never fail a query because of it
    process.stderr.write(`[citation-log] append failed: ${e.message}\n`);
  }
}

async function rerank({ query, domain, k }) {
  if (!query || typeof query !== "string" || query.length < 3) {
    throw new Error("query must be a non-empty string (≥3 chars)");
  }
  // Existence check (formerly readIndex's): a missing index AND missing shard
  // manifest is a hard error; either present -> streamTribalEntries handles it.
  const manifestPath = INDEX_PATH.replace(/\.json$/i, "") + ".manifest.json";
  if (!fs.existsSync(INDEX_PATH) && !fs.existsSync(manifestPath)) {
    throw new Error(`index not found at ${INDEX_PATH} -- run tribal-embed-index.mjs --bootstrap first`);
  }
  const qe = await embed(query);
  // STREAM the index with a bounded top-K instead of materializing all ~30K
  // entries (each a 768-float embedding) into heap. Peak heap is O(K + the
  // off-heap Buffer), so the per-prompt rerank runs in a small heap and -- the
  // point -- the JSON index can grow to full wiki coverage without the 8 GB
  // heap ceiling that was the stated reason to migrate to Qdrant
  // (U-TRIBAL-RERANK-STREAM 2026-06-10). Drop each entry's `embedding` the moment
  // it is scored (keep only the small projection the output needs) and trim the
  // candidate buffer back to top-K whenever it grows past a small multiple of k.
  const scored = [];
  const TRIM_AT = Math.max(k * 8, 64);
  const total = streamTribalEntries(INDEX_PATH, (e) => {
    if (!Array.isArray(e.embedding)) return;
    const base = cosine(qe, e.embedding);
    const matches = domain && e.domain === domain;
    const score = matches ? base * IN_DOMAIN_WEIGHT : base;
    const { embedding, ...rest } = e; // drop the heavy 768-float field
    scored.push({ score, base, weighted: matches, e: rest });
    if (scored.length > TRIM_AT) {
      scored.sort((a, b) => b.score - a.score);
      scored.length = k; // discard below-top-K candidates (can never re-enter)
    }
  }, fs);
  if (total === 0) {
    throw new Error("index is empty");
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

const opts = parseArgs();
const query = typeof opts.query === "string" ? opts.query : "";
const domain = typeof opts.domain === "string" ? opts.domain.toLowerCase() : null;
const k = Number(opts.k) || DEFAULT_K;
const asJson = !!opts.json;
const skipCite = !!opts["no-cite"];
const milestone = typeof opts.milestone === "string" ? opts.milestone : null;
const caller = typeof opts.caller === "string" ? opts.caller : null;

if (!query) {
  console.error("usage: tribal-rerank.mjs --query \"<text>\" [--domain mill|lathe|wedm|cad|cam|backend-dev|general] [--k 5] [--json] [--no-cite]");
  process.exit(1);
}

// Validate --domain. The cosine-comparison logic accepts any string (so an
// unknown value silently disables the 2× boost), which is a CLI footgun:
// `--domain typo` returns top-K by raw cosine without the operator knowing
// the boost never fired. Fail-loud is cheaper than a 0.5σ-degraded ranking.
// The hook (`tribal-by-domain-inject.mjs`) only ever passes validated values,
// so this gate doesn't constrain production callers — it just protects ad-hoc
// CLI use.
const VALID_DOMAINS = new Set(["mill", "lathe", "wedm", "cad", "cam", "backend-dev", "general"]);
if (domain !== null && !VALID_DOMAINS.has(domain)) {
  const msg = `unknown domain "${domain}" — expected one of: ${[...VALID_DOMAINS].join(", ")}`;
  if (asJson) {
    process.stdout.write(JSON.stringify({ ok: false, error: msg }));
    process.exit(2);
  }
  console.error(`error: ${msg}`);
  process.exit(2);
}

try {
  const hits = await rerank({ query, domain, k });

  if (!skipCite) {
    appendCitation({
      ts: new Date().toISOString(),
      query: query.slice(0, 200),
      domain: domain || null,
      milestone,
      caller,
      k,
      cited: hits.map((h) => ({ id: h.e.id, score: Number(h.score.toFixed(4)), weighted: h.weighted })),
    });
  }

  if (asJson) {
    process.stdout.write(JSON.stringify({
      ok: true, query, domain, k,
      hits: hits.map((h) => ({
        score: Number(h.score.toFixed(4)),
        baseScore: Number(h.base.toFixed(4)),
        weighted: h.weighted,
        id: h.e.id,
        source: h.e.source,
        domain: h.e.domain,
        title: h.e.title,
        path: h.e.path,
        snippet: (h.e.text || "").slice(0, 240),
      })),
    }));
  } else {
    console.log(`top ${hits.length} for "${query}"${domain ? ` (domain=${domain})` : ""}:`);
    for (const h of hits) {
      const tag = h.weighted ? "★" : " ";
      console.log(`${tag} ${h.score.toFixed(4)}  [${h.e.domain}/${h.e.source}] ${h.e.title}`);
      console.log(`           ${h.e.id}`);
    }
  }
} catch (e) {
  if (asJson) {
    process.stdout.write(JSON.stringify({ ok: false, error: e.message }));
    process.exit(2);
  }
  console.error(`error: ${e.message}`);
  process.exit(2);
}
