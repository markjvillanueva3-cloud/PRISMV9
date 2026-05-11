#!/usr/bin/env node
/**
 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
 *
 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
 * additionalContext so Claude doesn't re-derive what the wiki already knows.
 *
 * Scoring: BM25-lite over [[Name]] + description tokens; rare-token weighting
 * with stopwords filter. Caches parsed corpus in /tmp keyed by index.md mtime.
 *
 * Fail-safe: continueOnError. Never blocks. Skips silently on any error.
 * Disable: PRISM_WIKI_PRECHECK=0
 */
import { readFileSync, writeFileSync, appendFileSync, statSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const INDEX = "H:/prism/knowledge/wiki/index.md";
const LEAF_INDEX = "H:/prism/knowledge/wiki/architecture/_leaf-index.jsonl";
const CACHE_DIR = join(tmpdir(), "prism-wiki-cache");
const CACHE = join(CACHE_DIR, "wiki-corpus.json");
const LEAF_CACHE = join(CACHE_DIR, "wiki-leaf-corpus.json");
const TELEMETRY = "H:/prism/mcp-server/data/state/hook-fire-counts.jsonl";

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
      entries.push({ name: r.name, desc: (r.title || r.desc || "").trim(), category: r.type || "", source: r.path || "", toks });
    }
    const N = entries.length || 1;
    const idf = Object.create(null);
    for (const [t, freq] of Object.entries(df)) idf[t] = Math.log(1 + N / freq);
    const corpus = { mtime: st.mtimeMs, entries, idf };
    try { mkdirSync(CACHE_DIR, { recursive: true }); writeFileSync(LEAF_CACHE, JSON.stringify(corpus), "utf8"); } catch {}
    return corpus;
  } catch { return null; }
}

function readStdin() {
  // Always drain — even if env-var disables logic, parent pipe must not deadlock.
  let raw = "";
  try { raw = readFileSync(0, "utf8") || ""; } catch {}
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

function main() {
  const input = readStdin();
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
  // De-dup by entry name (index.md entry wins over leaf if both match), then top-K by score.
  const seen = new Set();
  const ranked = candidates
    .sort((a, b) => b.s - a.s)
    .filter(x => { if (seen.has(x.e.name)) return false; seen.add(x.e.name); return true; })
    .slice(0, TOP_K);
  if (!ranked.length) { tele("noop_no_matches", { tokens: promptToks.length }); return out({}); }
  tele("matched", { hits: ranked.length, top_score: Math.round(ranked[0].s * 10) / 10, leaf_hits: ranked.filter(r => r.leaf).length });
  const lines = [
    "## 📚 Wiki precheck — relevant entries already known",
    ...ranked.map(x => `- **[[${x.e.name}]]** — ${x.e.desc.slice(0, DESC_PREVIEW_LEN)}${x.e.source ? ` (\`${x.e.source}\`)` : ""}`),
    "_Query \`/wiki-query <name>\` for full entry. Don't re-derive what the wiki already documents._",
  ];
  out({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: lines.join("\n") } });
}

function out(obj) { try { process.stdout.write(JSON.stringify({ continue: true, ...obj })); } catch {} }
try { main(); } catch { out({}); }
