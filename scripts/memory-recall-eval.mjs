#!/usr/bin/env node
// memory-recall-eval.mjs — recall-quality harness for the Obsidian-memory recall stack (BRAIN-UPGRADE rank 3).
//
// The 2026-05-30 brain-upgrade sweep found there is NO recall-quality metric anywhere — so every
// recall tuning lever (RRF k, top-K, weights, int8 precision, domain boost, magnitude fusion) is
// UNFALSIFIABLE. This harness produces the first one, and A/B's BM25-only vs the A6 hybrid
// (BM25+dense+RRF) path to quantify the dense arm's actual lift.
//
// GROUND TRUTH = SELF-ANCHOR (no hand-labeling, no garbage-in): for a sampled memory, the query is
// its own frontmatter `description` (minus the doc's own slug-name tokens) and the expected answer
// is that same memory.
//
// HONESTY (R12 — do NOT overclaim the absolute number): this is NOT a paraphrase. The query is the
// VERBATIM indexed description, so the ABSOLUTE p@1/recall is a "self-fingerprint" / vocabulary-
// uniqueness measure (can a doc's description still single it out among ~11K vocabulary-overlapping
// memories), NOT a true paraphrase-recall rate. The TRUSTWORTHY signal is the RELATIVE A/B (BM25-only
// vs hybrid on BYTE-IDENTICAL queries): the dense arm cannot game the self-anchor, so the Δ is honest
// and is exactly what the tuning levers (RRF k, weights, int8 precision, domain boost) optimize.
//
// CAVEAT (namespace skew): the vault is ~97% `reference`, so the default-n stride aggregate is
// effectively a reference-namespace metric. The report emits a per-namespace histogram of the scored
// set; pass --namespace or a larger --n for per-namespace claims (stratified sampling = follow-up).
// Deterministic stride sampling (no RNG) keeps runs reproducible.
//
// Metrics (per mode, averaged): precision@1, recall@k, MRR, nDCG@k. Plus hybrid-engagement rate
// (the `source` field — proves the dense path actually fired vs silently falling back to BM25).
//
// Pure scorers are exported + unit-tested; runEval is injected-deps (the search fn + corpus) so a
// real oracle pins the A/B + aggregation. main() wires the real vault + runMemoryIndexSearch.
//
// CLI: --n N (sample size, default 60) --topk K (default 10) --namespace ns1,ns2 --json --verbose
// Knobs: PRISM_RECALL_EVAL_N, PRISM_RECALL_EVAL_TOPK. Exit 0 always (a report, not a gate).

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { runMemoryIndexSearch, DEFAULT_NAMESPACES, tokenize } from "./lib/memory-index-search-lib.mjs";

const VAULT_ROOT = process.env.PRISM_MEMORY_VAULT_ROOT || "H:/prism/knowledge/memories";
const DEFAULT_N = Number(process.env.PRISM_RECALL_EVAL_N) || 60;
const DEFAULT_TOPK = Number(process.env.PRISM_RECALL_EVAL_TOPK) || 10;
const MIN_DESC_TOKENS = 3; // a query with <3 meaningful tokens is too weak to score fairly

// ───────────────────────── pure scorers (unit-testable) ─────────────────────────

/** 1-based rank of the expected memory in hits (matched by namespace+fileName), or 0 if absent. */
export function rankOf(hits, expected) {
  if (!Array.isArray(hits)) return 0;
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    if (h && h.fileName === expected.fileName && (h.namespace === expected.namespace || !h.namespace || !expected.namespace)) {
      return i + 1;
    }
  }
  return 0;
}

/** Score one query's hit list against the expected memory. nDCG uses ideal=1 (single relevant doc). */
export function scoreQuery(hits, expected, k) {
  const rank = rankOf(hits, expected);
  const found = rank > 0 && rank <= k;
  return {
    rank,
    hit: found, // recall@k contribution
    p1: rank === 1, // precision@1
    rr: rank > 0 ? 1 / rank : 0, // reciprocal rank (MRR contribution)
    ndcg: found ? 1 / Math.log2(rank + 1) : 0, // DCG/IDCG with one relevant doc (IDCG = 1/log2(2) = 1)
  };
}

/** Average per-query scores into the aggregate metric bundle. */
export function aggregate(perQuery) {
  const n = perQuery.length;
  if (n === 0) return { n: 0, recallAtK: 0, p1: 0, mrr: 0, ndcg: 0 };
  const sum = (f) => perQuery.reduce((a, q) => a + f(q), 0);
  return {
    n,
    recallAtK: sum((q) => (q.hit ? 1 : 0)) / n,
    p1: sum((q) => (q.p1 ? 1 : 0)) / n,
    mrr: sum((q) => q.rr) / n,
    ndcg: sum((q) => q.ndcg) / n,
  };
}

/** Delta of hybrid over bm25 (positive = hybrid better). */
export function compareModes(bm25, hybrid) {
  return {
    recallAtK: +(hybrid.recallAtK - bm25.recallAtK).toFixed(4),
    p1: +(hybrid.p1 - bm25.p1).toFixed(4),
    mrr: +(hybrid.mrr - bm25.mrr).toFixed(4),
    ndcg: +(hybrid.ndcg - bm25.ndcg).toFixed(4),
  };
}

/**
 * Build a query from a memory's description, dropping tokens identical to the memory's own slug
 * name so the test isn't a trivial exact-name match (W_NAME is heavily weighted). Returns "" if the
 * remaining query is too weak to score fairly.
 */
export function buildQuery(description, name) {
  if (typeof description !== "string" || !description.trim()) return "";
  const nameTokens = new Set(tokenize((name || "").replace(/[-_]/g, " ")));
  const qTokens = tokenize(description).filter((t) => !nameTokens.has(t));
  if (qTokens.length < MIN_DESC_TOKENS) return "";
  return qTokens.join(" ");
}

/** Deterministic every-Kth stride sample of `n` items from `items` (reproducible — no RNG). */
export function sampleStride(items, n) {
  if (!Array.isArray(items) || items.length === 0 || n <= 0) return [];
  if (items.length <= n) return items.slice();
  const stride = items.length / n;
  const out = [];
  for (let i = 0; i < n; i++) out.push(items[Math.floor(i * stride)]);
  return out;
}

// ───────────────────────── eval orchestrator (injected deps) ─────────────────────────

/**
 * Run the A/B eval. deps: { searchFn(query, {hybrid}) -> {hits, source}, log }.
 * corpus: [{ fileName, namespace, description, name }]. Returns the full report.
 */
export function runEval({ corpus, sampleN, topK, searchFn, log = () => {} }) {
  const sampled = sampleStride(corpus, sampleN);
  const bm25 = [];
  const hybrid = [];
  let scored = 0;
  let skippedWeak = 0;
  const sources = { hybrid: 0, sidecar: 0, live: 0, other: 0 };
  const byNs = {}; // per-namespace count of SCORED queries (surfaces the ~97%-reference skew)
  for (const mem of sampled) {
    const query = buildQuery(mem.description, mem.name);
    if (!query) {
      skippedWeak++;
      continue;
    }
    const b = searchFn(query, { hybrid: false }) || { hits: [], source: "?" };
    const h = searchFn(query, { hybrid: true }) || { hits: [], source: "?" };
    bm25.push(scoreQuery(b.hits, mem, topK));
    hybrid.push(scoreQuery(h.hits, mem, topK));
    sources[h.source] = (sources[h.source] || 0) + 1;
    byNs[mem.namespace] = (byNs[mem.namespace] || 0) + 1;
    scored++;
    log(`  ${mem.fileName}: bm25 rank=${rankOf(b.hits, mem)} hybrid rank=${rankOf(h.hits, mem)} (src=${h.source})`);
  }
  const bm25Agg = aggregate(bm25);
  const hybridAgg = aggregate(hybrid);
  const hybridEngaged = scored > 0 ? (sources.hybrid || 0) / scored : 0;
  return {
    corpusSize: corpus.length,
    sampled: sampled.length,
    scored,
    skippedWeak,
    topK,
    bm25: bm25Agg,
    hybrid: hybridAgg,
    delta: compareModes(bm25Agg, hybridAgg),
    hybridEngagedRate: +hybridEngaged.toFixed(3),
    sources,
    scoredByNamespace: byNs,
  };
}

// ───────────────────────── real corpus enumeration (only used by main) ─────────────────────────

function realDescriptionOf(body) {
  if (typeof body !== "string" || !body.startsWith("---")) return "";
  const end = body.indexOf("\n---", 3);
  if (end < 0) return "";
  const m = body.slice(3, end).match(/^\s*description:\s*(.+?)\s*$/m);
  if (!m) return "";
  let d = m[1].trim();
  if ((d.startsWith('"') && d.endsWith('"')) || (d.startsWith("'") && d.endsWith("'"))) d = d.slice(1, -1);
  return d;
}

function enumerateCorpus(namespaces) {
  const out = [];
  for (const ns of namespaces) {
    const dir = join(VAULT_ROOT, ns);
    if (!existsSync(dir)) continue;
    let files;
    try {
      files = readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "MEMORY.md");
    } catch {
      continue;
    }
    for (const fileName of files.sort()) {
      let body = "";
      try {
        body = readFileSync(join(dir, fileName), "utf8");
      } catch {
        continue;
      }
      const description = realDescriptionOf(body);
      if (!description) continue; // need a description to self-anchor
      out.push({ fileName, namespace: ns, description, name: fileName.replace(/\.md$/, "") });
    }
  }
  return out.sort((a, b) => `${a.namespace}/${a.fileName}`.localeCompare(`${b.namespace}/${b.fileName}`));
}

function parseArgs(argv) {
  const a = { n: DEFAULT_N, topK: DEFAULT_TOPK, namespaces: DEFAULT_NAMESPACES, json: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--json") a.json = true;
    else if (t === "--verbose") a.verbose = true;
    else if (t === "--n") a.n = Math.max(1, Number(argv[++i]) || DEFAULT_N);
    else if (t === "--topk") a.topK = Math.max(1, Number(argv[++i]) || DEFAULT_TOPK);
    else if (t === "--namespace") a.namespaces = (argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  return a;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const log = args.verbose ? (m) => process.stderr.write(`[recall-eval] ${m}\n`) : () => {};
  const corpus = enumerateCorpus(args.namespaces);
  if (corpus.length === 0) {
    process.stderr.write(`[recall-eval] no memories with a description found under ${VAULT_ROOT} (namespaces: ${args.namespaces.join(",")})\n`);
    process.exit(0);
  }
  const report = runEval({
    corpus,
    sampleN: args.n,
    topK: args.topK,
    searchFn: (query, opts) => runMemoryIndexSearch(query, { topK: args.topK, ...opts }),
    log,
  });
  if (args.json) {
    process.stdout.write(JSON.stringify(report) + "\n");
  } else {
    const pct = (x) => `${(x * 100).toFixed(1)}%`;
    process.stdout.write(
      `[recall-eval] corpus=${report.corpusSize} scored=${report.scored} (skipped-weak=${report.skippedWeak}) @k=${report.topK}\n` +
        `  BM25-only : recall@k=${pct(report.bm25.recallAtK)} p@1=${pct(report.bm25.p1)} MRR=${report.bm25.mrr.toFixed(3)} nDCG=${report.bm25.ndcg.toFixed(3)}\n` +
        `  Hybrid    : recall@k=${pct(report.hybrid.recallAtK)} p@1=${pct(report.hybrid.p1)} MRR=${report.hybrid.mrr.toFixed(3)} nDCG=${report.hybrid.ndcg.toFixed(3)}\n` +
        `  Δ hybrid  : recall@k=${report.delta.recallAtK >= 0 ? "+" : ""}${report.delta.recallAtK} MRR=${report.delta.mrr >= 0 ? "+" : ""}${report.delta.mrr} nDCG=${report.delta.ndcg >= 0 ? "+" : ""}${report.delta.ndcg}\n` +
        `  hybrid engaged: ${pct(report.hybridEngagedRate)} (sources: ${JSON.stringify(report.sources)})\n` +
        `  scored by namespace: ${JSON.stringify(report.scoredByNamespace)}\n` +
        `  NOTE: absolute = description-anchored self-fingerprint recall — trust the Δ (A/B), not the absolute floor; vault ~97% 'reference'.\n`,
    );
  }
  process.exit(0);
}

// pathToFileURL guard — NOT path.resolve(new URL(import.meta.url).pathname), which on Windows
// yields a leading-slash "/H:/..." that makes main() silently never run (BRAIN-REFRESH-MS0 lesson).
const isMain = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] || "").href;
  } catch {
    return false;
  }
})();
if (isMain) main();
