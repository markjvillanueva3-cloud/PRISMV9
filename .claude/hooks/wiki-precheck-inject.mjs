#!/usr/bin/env node
// tier: T4
/**
 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
 *
 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
 * additionalContext so Claude doesn't re-derive what the wiki already knows.
 *
 * Scoring: BM25-lite over [[Name]] + description tokens; rare-token weighting
 * with stopwords filter. Caches parsed corpus in /tmp keyed by index.md mtime.
 * Semantic fallback (int8 cosine via Ollama) runs only when BM25 finds nothing.
 *
 * U-CLEANUP-D5: also honors `boost_keywords` frontmatter — curated keywords
 * (multi-word phrases, filenames, globs) that surface a wiki entry even when
 * BM25 token overlap is weak. Injected context is capped at MAX_INJECT_BYTES
 * (8 KB). No-match prompts are logged to MISSES_LOG with SALTED-hashed tokens
 * (raw prompt text never persisted; salt makes the hashes non-reversible).
 *
 * Fail-safe: continueOnError. Never blocks. Skips silently on any error.
 * Disable: PRISM_WIKI_PRECHECK=0
 */
import { readFileSync, writeFileSync, appendFileSync, statSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
// SYSTEM-VIZ-BRAIN-MS0/U-P1-WIKI-PRELOAD-BY-DOMAIN — bias top-K toward the
// active chat's milestone domain. Knob: PRISM_WIKI_DOMAIN_BIAS_DISABLE=1.
import { getDomainTokens, domainBoostFor, chatIdFromInput } from "../helpers/wiki-domain-bias.mjs";

// Paths are env-overridable so the hook is testable in isolation (a vitest suite
// points these at a tmpdir). Defaults are the live PRISM paths.
const INDEX = process.env.PRISM_WIKI_INDEX || "H:/prism/knowledge/wiki/index.md";
const LEAF_INDEX = process.env.PRISM_WIKI_LEAF_INDEX || "H:/prism/knowledge/wiki/architecture/_leaf-index.jsonl";
const EMB_INDEX = process.env.PRISM_WIKI_EMB_INDEX || "H:/prism/knowledge/wiki/architecture/_embeddings.jsonl";
const CACHE_DIR = process.env.PRISM_WIKI_CACHE_DIR || join(tmpdir(), "prism-wiki-cache");
const CACHE = join(CACHE_DIR, "wiki-corpus.json");
const LEAF_CACHE = join(CACHE_DIR, "wiki-leaf-corpus.json");
const EMB_CACHE = join(CACHE_DIR, "wiki-embeddings.json");
const TELEMETRY = process.env.PRISM_WIKI_TELEMETRY || "H:/prism/mcp-server/data/state/hook-fire-counts.jsonl";
// U-CLEANUP-D5: misses (no BM25 hit + no boost hit + semantic miss/down) are
// logged here with hashed prompt tokens — recurring uncovered topics surface as
// hash-frequency without ever persisting raw prompt text.
const MISSES_LOG = process.env.PRISM_WIKI_MISSES_LOG || "H:/prism/state/shared/wiki-inject-misses.jsonl";
const OLLAMA_URL = `http://${(process.env.OLLAMA_HOST || "127.0.0.1:11434").replace(/^https?:\/\//, "")}/api/embeddings`;
const SEM_MIN_COSINE = 0.62; // below this, a "semantic" hit is noise — don't surface

function tele(decision, extra) {
  try { appendFileSync(TELEMETRY, JSON.stringify({ ts: new Date().toISOString(), hook: "wiki-precheck-inject", decision, ...extra }) + "\n", "utf8"); } catch {}
}
const MIN_SCORE = 4.0;
const MIN_MATCHES = 2;
const TOP_K = 3;
const MIN_PROMPT_LEN = 12;
const MIN_PROMPT_TOKENS = 2;
const DESC_PREVIEW_LEN = 140;
const MIN_TOKEN_LEN = 3;
// U-CLEANUP-D5 tunables.
const MAX_INJECT_BYTES = 8192;   // hard cap on injected additionalContext (8 KB)
const BOOST_BASE_SCORE = 12.0;   // synthetic score for a single boost-keyword hit — curated, beats typical BM25
const BOOST_PER_KEYWORD = 3.0;   // + per additional matched boost keyword
const MISS_HASH_TOKENS = 16;     // # of prompt tokens hashed into a miss record
const MAX_MISSES_BYTES = 1048576; // 1 MB — logMiss rotates the ledger past this
const STOP = new Set(["the","and","for","with","from","that","this","what","how","why","when","engine","engines","dispatcher","action","hook","skill","prism","src","data","file","line","get","set","run","use","add","new","old","one","two","all","any","some","into","over","under","via","off","prism-server"]);

function tokenize(s) {
  return String(s || "").toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g)?.filter(t => !STOP.has(t)) || [];
}

function loadCorpus() {
  let idxStat;
  try { idxStat = statSync(INDEX); } catch { return null; }
  // Try cache first; on parse-fail or stale, fall through to rebuild (B3 fix).
  if (existsSync(CACHE)) {
    try {
      const c = JSON.parse(readFileSync(CACHE, "utf8"));
      if (c && c.mtime === idxStat.mtimeMs && Array.isArray(c.entries)) return c;
    } catch { /* corrupt cache — fall through to rebuild */ }
  }
  try {
    const text = readFileSync(INDEX, "utf8");
    const entries = [];
    const df = Object.create(null);
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^- \[\[([^\]]+)\]\]\s*—\s*(.+?)(?:\s*\|\s*category:([\w-]+))?(?:\s*\|.*?source:([^\s|]+))?\s*$/);
      if (!m) continue;
      const [, name, desc, category, source] = m;
      const toks = [...new Set(tokenize(name + " " + desc))];
      for (const t of toks) df[t] = (df[t] || 0) + 1;
      entries.push({ name, desc: desc.trim(), category: category || "", source: source || "", toks });
    }
    const N = entries.length || 1;
    const idf = Object.create(null);
    for (const [t, freq] of Object.entries(df)) idf[t] = Math.log(1 + N / freq);
    const corpus = { mtime: idxStat.mtimeMs, entries, idf };
    try { mkdirSync(CACHE_DIR, { recursive: true }); writeFileSync(CACHE, JSON.stringify(corpus), "utf8"); } catch {}
    return corpus;
  } catch { return null; }
}

function score(promptToks, entry, idf) {
  const promptSet = new Set(promptToks);
  let s = 0;
  let matches = 0;
  for (const t of entry.toks) if (promptSet.has(t)) { s += idf[t] || 0; matches++; }
  return { s, matches };
}

// ── U-CLEANUP-D5: boost_keywords ─────────────────────────────────────────────
// Wiki entries can carry `boost_keywords: [hook, settings.json, "*.mjs"]` in
// frontmatter (extracted into _leaf-index.jsonl by build-wiki-leaf-index.mjs).
// A boost keyword present in the prompt surfaces its entry even when BM25 token
// overlap is weak — exactly the queries BM25 misses (multi-word phrases,
// filenames with dots, globs). Matching is substring-based (so "settings.json"
// and "close out" work) with glob support for "*"-bearing keywords.
function matchBoostKeywords(promptLower, boostKw) {
  if (!Array.isArray(boostKw) || !boostKw.length) return [];
  const matched = [];
  for (const raw of boostKw) {
    const k = String(raw || "").toLowerCase().trim();
    if (!k || k.replace(/[*\s]/g, "").length === 0) continue; // skip empty / all-glob / all-whitespace
    // a single bare stopword ("hook", "engine") would match nearly every prompt —
    // skip it; multi-word phrases and globs are specific enough to keep.
    if (!k.includes(" ") && !k.includes("*") && STOP.has(k)) continue;
    if (k.includes("*")) {
      // Glob match WITHOUT regex — a frontmatter-derived glob like `**/*.mjs` or
      // `src/**` compiles to adjacent `[\w.-]*[\w.-]*` which ReDoS-hangs a naive
      // glob→regex. Split on "*"; each literal segment must appear in order, "*"
      // is a free gap. O(prompt · segments), no backtracking.
      let pos = 0, ok = true;
      for (const seg of k.split("*")) {
        if (seg === "") continue;                            // leading/trailing/`**` gap
        const idx = promptLower.indexOf(seg, pos);
        if (idx === -1) { ok = false; break; }
        pos = idx + seg.length;
      }
      if (ok) matched.push(k);
    } else if (promptLower.includes(k)) {
      matched.push(k);
    }
  }
  return matched;
}

// 12-hex SALTED sha1 of a single token. The salt (per-repo random value from
// missSalt()) makes the hashes non-reversible — an unsalted 12-hex sha1 of an
// in-vocabulary token is trivially rainbow-tabled against the wiki's own ~23K
// term corpus. Default salt "" keeps the exported fn pure/deterministic for tests.
function hashKeyword(s, salt = "") {
  return createHash("sha1").update(salt + String(s || "")).digest("hex").slice(0, 12);
}

// Lazy per-repo salt for miss-log hashing — 16 random bytes, generated once and
// persisted next to MISSES_LOG, cached in module scope. Fail-safe: an
// unreadable/unwritable salt path falls back to "" (still hashed, just weaker).
let _missSalt = null;
function missSalt() {
  if (_missSalt !== null) return _missSalt;
  const saltPath = join(dirname(MISSES_LOG), ".wiki-miss-salt");
  try {
    if (existsSync(saltPath)) {
      _missSalt = readFileSync(saltPath, "utf8").trim() || "";
    } else {
      _missSalt = randomBytes(16).toString("hex");
      mkdirSync(dirname(saltPath), { recursive: true });
      writeFileSync(saltPath, _missSalt, "utf8");
    }
  } catch { _missSalt = ""; }
  return _missSalt;
}

// Cap injected context at maxBytes. Keeps header + footer, trims entry lines
// from the end, and appends a trimmed-count note so the cap is never silent.
function capInjection(header, entryLines, footer, maxBytes) {
  const assemble = (entries, note) =>
    [header, ...entries, ...(note ? [note] : []), footer].join("\n");
  if (Buffer.byteLength(assemble(entryLines, null), "utf8") <= maxBytes) {
    return assemble(entryLines, null);
  }
  const kept = entryLines.slice();
  while (kept.length) {
    kept.pop();
    const note = `_(${entryLines.length - kept.length} more trimmed — ${Math.round(maxBytes / 1024)} KB injection cap)_`;
    const candidate = assemble(kept, note);
    if (Buffer.byteLength(candidate, "utf8") <= maxBytes) return candidate;
  }
  // header + footer alone overflow (unreachable at 8 KB — defensive): emit header only
  return header;
}

// Append a miss record to MISSES_LOG — prompt tokens are SALTED-hashed so raw
// text never lands in the ledger. Self-rotates past MAX_MISSES_BYTES (the hook
// fires on every prompt and nothing else reaps this file). Fail-safe: a logging
// failure must never break the hook.
function logMiss(promptToks, semReason) {
  try {
    mkdirSync(dirname(MISSES_LOG), { recursive: true });
    try {
      if (statSync(MISSES_LOG).size >= MAX_MISSES_BYTES) renameSync(MISSES_LOG, MISSES_LOG + ".1");
    } catch { /* no file yet, or another chat won the rotate race — both fine */ }
    const salt = missSalt();
    appendFileSync(MISSES_LOG, JSON.stringify({
      ts: new Date().toISOString(),
      hook: "wiki-precheck-inject",
      hashedKeywords: promptToks.slice(0, MISS_HASH_TOKENS).map((t) => hashKeyword(t, salt)),
      tokenCount: promptToks.length,
      sem: semReason,
    }) + "\n", "utf8");
  } catch { /* fail-safe */ }
}

// Leaf corpus: the ~13.7K architecture leaf entries (engines, actions, skills,
// hooks, formulas, monolith categories, …) live in _leaf-index.jsonl, not in
// index.md (which must stay small). Same BM25-lite scoring, separate cache.
function loadLeafCorpus() {
  let st;
  try { st = statSync(LEAF_INDEX); } catch { return null; }
  if (existsSync(LEAF_CACHE)) {
    try {
      const c = JSON.parse(readFileSync(LEAF_CACHE, "utf8"));
      if (c && c.mtime === st.mtimeMs && Array.isArray(c.entries)) return c;
    } catch { /* rebuild */ }
  }
  try {
    const text = readFileSync(LEAF_INDEX, "utf8");
    const entries = [];
    const df = Object.create(null);
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      let r;
      try { r = JSON.parse(line); } catch { continue; }
      if (!r || !r.name) continue;
      const toks = [...new Set(tokenize(r.name + " " + (r.title || "") + " " + (r.desc || "")))];
      for (const t of toks) df[t] = (df[t] || 0) + 1;
      // U-CLEANUP-D5: carry boost_keywords through so main() can surface curated
      // entries the BM25 path would miss. Only lowercased string arrays kept.
      const boost = Array.isArray(r.boost_keywords)
        ? r.boost_keywords.filter((k) => typeof k === "string" && k.trim()).map((k) => k.toLowerCase().trim())
        : null;
      entries.push({ name: r.name, desc: (r.title || r.desc || "").trim(), category: r.type || "", source: r.path || "", toks, boost: boost && boost.length ? boost : null });
    }
    const N = entries.length || 1;
    const idf = Object.create(null);
    for (const [t, freq] of Object.entries(df)) idf[t] = Math.log(1 + N / freq);
    const corpus = { mtime: st.mtimeMs, entries, idf };
    try { mkdirSync(CACHE_DIR, { recursive: true }); writeFileSync(LEAF_CACHE, JSON.stringify(corpus), "utf8"); } catch {}
    return corpus;
  } catch { return null; }
}

// ── Semantic fallback (int8-quantized nomic-embed-text vectors) ───────────────
// Only used when BM25 over index.md + _leaf-index.jsonl yields nothing — catches
// paraphrase/synonym queries. Lazy: the ~3.5MB JSONL is parsed only on the miss
// path and cached in /tmp keyed by mtime.
function loadEmbeddings() {
  let st;
  try { st = statSync(EMB_INDEX); } catch { return null; }
  if (existsSync(EMB_CACHE)) {
    try {
      const c = JSON.parse(readFileSync(EMB_CACHE, "utf8"));
      if (c && c.mtime === st.mtimeMs && Array.isArray(c.entries)) return c;
    } catch { /* rebuild */ }
  }
  try {
    const text = readFileSync(EMB_INDEX, "utf8");
    let model = "nomic-embed-text", dim = 0;
    const entries = [];
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      let r;
      try { r = JSON.parse(line); } catch { continue; }
      if (r && r.__meta) { model = r.model || model; dim = r.dim || dim; continue; }
      if (!r || !r.n || !Array.isArray(r.q) || typeof r.s !== "number") continue;
      // reconstruct the unit-norm float vector once (q[i]*s); recompute exact norm
      let nrm = 0; for (const x of r.q) nrm += x * x;
      nrm = (Math.sqrt(nrm) * r.s) || 1;
      entries.push({ n: r.n, t: r.t || "", v: r.q.map((x) => (x * r.s) / nrm) });
    }
    const corpus = { mtime: st.mtimeMs, model, dim, entries };
    try { mkdirSync(CACHE_DIR, { recursive: true }); writeFileSync(EMB_CACHE, JSON.stringify(corpus), "utf8"); } catch {}
    return corpus;
  } catch { return null; }
}

async function ollamaEmbedQuery(model, prompt, timeoutMs = 1500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt: prompt.slice(0, 1200) }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    const v = j && (j.embedding || (j.data && j.data[0] && j.data[0].embedding));
    return Array.isArray(v) && v.length ? v : null;
  } catch { return null; }
  finally { clearTimeout(t); }
}

function cosineAgainstCorpus(qvec, corpus, topK) {
  // normalize the query once
  let qn = 0; for (const x of qvec) qn += x * x;
  qn = Math.sqrt(qn) || 1;
  const q = qvec.map((x) => x / qn);
  const scored = [];
  for (const e of corpus.entries) {
    const v = e.v;
    if (v.length !== q.length) continue;
    let dot = 0;
    for (let i = 0; i < q.length; i++) dot += q[i] * v[i];
    if (dot >= SEM_MIN_COSINE) scored.push({ n: e.n, t: e.t, cos: dot });
  }
  scored.sort((a, b) => b.cos - a.cos);
  return scored.slice(0, topK);
}

async function semanticFallback(prompt) {
  const corpus = loadEmbeddings();
  if (!corpus || !corpus.entries.length) return null;
  const qvec = await ollamaEmbedQuery(corpus.model, prompt);
  if (!qvec) return { ok: false, reason: "ollama_down" };
  const hits = cosineAgainstCorpus(qvec, corpus, TOP_K);
  return { ok: true, hits };
}

function readStdin() {
  // Always drain — even if env-var disables logic, parent pipe must not deadlock.
  let raw = "";
  try { raw = readFileSync(0, "utf8") || ""; } catch {}
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

async function main(injectedInput) {
  const input = injectedInput !== undefined ? injectedInput : readStdin();
  if (process.env.PRISM_WIKI_PRECHECK === "0") { tele("disabled"); return out({}); }
  const prompt = String(input?.prompt || "");
  if (prompt.length < MIN_PROMPT_LEN) { tele("skip_short"); return out({}); }
  const promptToks = tokenize(prompt);
  if (promptToks.length < MIN_PROMPT_TOKENS) { tele("skip_low_tokens"); return out({}); }
  const corpus = loadCorpus();
  const leafCorpus = loadLeafCorpus();
  if ((!corpus || !corpus.entries.length) && (!leafCorpus || !leafCorpus.entries.length)) { tele("error_no_corpus"); return out({}); }
  const candidates = [];
  if (corpus?.entries?.length) {
    for (const e of corpus.entries) { const { s, matches } = score(promptToks, e, corpus.idf); if (s >= MIN_SCORE && matches >= MIN_MATCHES) candidates.push({ e, s, matches, leaf: false }); }
  }
  if (leafCorpus?.entries?.length) {
    for (const e of leafCorpus.entries) { const { s, matches } = score(promptToks, e, leafCorpus.idf); if (s >= MIN_SCORE && matches >= MIN_MATCHES) candidates.push({ e, s, matches, leaf: true }); }
  }
  // U-CLEANUP-D5: boost_keywords — surface curated entries whose keywords appear
  // in the prompt even when BM25 token overlap is weak. Synthetic high score so
  // a deliberate curation reliably ranks into the top-K.
  const promptLower = prompt.toLowerCase();
  if (leafCorpus?.entries?.length) {
    for (const e of leafCorpus.entries) {
      if (!e.boost) continue;
      const hits = matchBoostKeywords(promptLower, e.boost);
      if (!hits.length) continue;
      candidates.push({ e, leaf: true, boosted: true, boostHits: hits, matches: MIN_MATCHES, s: BOOST_BASE_SCORE + (hits.length - 1) * BOOST_PER_KEYWORD });
    }
  }
  // U-P1-WIKI-PRELOAD-BY-DOMAIN: bias candidates toward the active milestone
  // domain (chat-slots topic + branch + CURRENT_POSITION H1). Capped at +4.5
  // so a deliberate curated boost_keywords match (BOOST_BASE_SCORE=12) still
  // dominates. No-op when knob disabled or no slot domain resolvable.
  let domainBoostCount = 0;
  try {
    const domainTokens = getDomainTokens({ chatId: chatIdFromInput(input) });
    if (domainTokens.length) {
      for (const c of candidates) {
        const b = domainBoostFor(c.e, domainTokens);
        if (b > 0) { c.s += b; c.domainBoost = b; domainBoostCount++; }
      }
    }
  } catch { /* domain bias is best-effort — never break the inject path */ }

  // De-dup by entry name, then top-K by score (highest score wins; on a tie the
  // first-inserted survives — index.md entries are pushed before leaf entries).
  const seen = new Set();
  const ranked = candidates
    .sort((a, b) => b.s - a.s)
    .filter(x => { if (seen.has(x.e.name)) return false; seen.add(x.e.name); return true; })
    .slice(0, TOP_K);
  if (!ranked.length) {
    // BM25 missed — try the semantic fallback (paraphrase/synonym queries). Tight
    // Ollama timeout; if it's down or returns nothing useful, this stays a no-op.
    const sem = await semanticFallback(prompt);
    if (sem && sem.ok && sem.hits && sem.hits.length) {
      tele("matched_semantic", { hits: sem.hits.length, top_cos: Math.round(sem.hits[0].cos * 100) / 100 });
      const header = "## 📚 Wiki precheck — semantically related entries (BM25 missed; nearest by meaning)";
      const entryLines = sem.hits.map(h => `- **[[${h.n}]]**${h.t ? ` _(${h.t})_` : ""} — cosine ${h.cos.toFixed(2)}`);
      const footer = "_Query \`/wiki-query <name>\` for full entry. These are paraphrase matches — verify relevance before relying on them._";
      return out({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: capInjection(header, entryLines, footer, MAX_INJECT_BYTES) } });
    }
    const semReason = sem ? sem.reason || "no_hits" : "no_corpus";
    tele("noop_no_matches", { tokens: promptToks.length, sem: semReason });
    logMiss(promptToks, semReason);
    return out({});
  }
  tele("matched", { hits: ranked.length, top_score: Math.round(ranked[0].s * 10) / 10, leaf_hits: ranked.filter(r => r.leaf).length, boost_hits: ranked.filter(r => r.boosted).length, domain_boosted: domainBoostCount });
  const header = "## 📚 Wiki precheck — relevant entries already known";
  const entryLines = ranked.map(x => {
    const tag = x.boosted ? ` _(boost: ${x.boostHits.slice(0, 3).join(", ")})_` : "";
    return `- **[[${x.e.name}]]**${tag} — ${x.e.desc.slice(0, DESC_PREVIEW_LEN)}${x.e.source ? ` (\`${x.e.source}\`)` : ""}`;
  });
  const footer = "_Query \`/wiki-query <name>\` for full entry. Don't re-derive what the wiki already documents._";
  return out({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: capInjection(header, entryLines, footer, MAX_INJECT_BYTES) } });
}

// out() returns the emitted object so main() is assertable in-process by tests.
function out(obj) {
  const o = { continue: true, ...obj };
  try { process.stdout.write(JSON.stringify(o)); } catch {}
  return o;
}

// Exported for the U-CLEANUP-D5 vitest suite. main() takes an optional injected
// input object so it's testable without a stdin pipe.
export { main, matchBoostKeywords, hashKeyword, capInjection, loadLeafCorpus };

// Run as a hook only when invoked directly (not when imported by a test).
const isDirectRun = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) main().catch(() => out({}));
