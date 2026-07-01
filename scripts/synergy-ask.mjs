#!/usr/bin/env node
// scripts/synergy-ask.mjs -- VIZ-OBSIDIAN-OLLAMA-SYNERGY (2026-06-24, slot:sierra)
// ---------------------------------------------------------------------------
// The graph+vault -> Ollama JOIN the utilization protocol
// ([[tribal---obsidian---system-viz-utilization-protocol]]) names as MISSING:
// "the three behave as three islands rather than one compounding artefact."
//   - `ask-ollama viz`          grounds on the system-viz GRAPH only.
//   - `galaxy-reasoning-bridge` grounds on per-galaxy DOCTRINE files only.
//   - NEITHER grounds an Ollama answer on BOTH the live graph AND the Obsidian
//     vault (wiki + memories) together.
//
// This is that combiner. Every call makes all THREE substrates actively
// participate (the synergy directive), $0, read-only (no graph regen, no vault
// mutation), and drives the ollama-utilization metric (executedOffloads):
//   1. system-viz : `system-viz-query find <q> --json`             (graph breadth)
//                 + `system-viz-query find <q> --brain-only --json` (vault focus, deeper limit)
//                 -> merged, deduped, ranked hits (vault-backed nodes first)
//   2. obsidian   : resolve the top-K vault hits (wiki.* / memory_*) to their
//                   .md and pull a short snippet -> real content grounding
//   3. ollama     : `ask-ollama ask <grounded-prompt>` -> synthesized,
//                   vault-cited answer ($0 local; recorded as an executed offload)
//
// Run: node scripts/synergy-ask.mjs "<question>" [--k 12] [--snippets 4]
//      [--model gpt-oss:20b] [--json] [--timeout 90000]

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { seekCard } from "./lib/node-card-read.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = pathResolve(HERE, "..");
const SVQ = join(REPO_ROOT, "scripts/system-viz-query.mjs");
const ASK_OLLAMA = join(REPO_ROOT, "scripts/ask-ollama.mjs");

const DEFAULT_K = 12;
const DEFAULT_SNIPPETS = 4;
const DEFAULT_MODEL = "gpt-oss:20b";
const DEFAULT_TIMEOUT_MS = 90000;
const DEFAULT_SNIPPET_CHARS = 400;
const DEFAULT_CARDS = 6;
const DEFAULT_CARD_INFO_CHARS = 200;
const DEFAULT_MIN_GRAPH = 4;

// --------------------------------------------------------------------------
// PURE FUNCTIONS (exported, unit-tested)
// --------------------------------------------------------------------------

// system-viz-query `find` is AND-conjunctive (every term must match one node),
// so a natural-language question returns 0 hits. We extract salient keywords and
// query EACH individually, then merge -- OR-semantics built over the AND matcher.
const STOPWORDS = new Set([
  "the","a","an","to","of","and","or","is","are","was","were","be","been","being",
  "how","does","do","did","what","why","when","where","which","who","whom","that","this",
  "for","in","on","with","by","as","at","from","into","using","use","used","via","per",
  "save","saves","work","works","make","makes","get","gets","can","will","would","should",
  "it","its","they","them","their","our","your","you","we","i","not","no","yes","than","then",
]);

/** Extract up to `max` distinctive keywords (>=3 chars, non-stopword, deduped) from a question. */
export function extractKeywords(question, max = 5) {
  if (typeof question !== "string") return [];
  const out = [];
  const seen = new Set();
  for (const t of question.toLowerCase().split(/[^a-z0-9]+/)) {
    if (t.length < 3 || STOPWORDS.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/** A hit is vault-backed iff its node id lives in a wiki/memory/vault namespace. */
export function isVaultHit(hit) {
  const id = hit && typeof hit.id === "string" ? hit.id : "";
  return /^(wiki\.|memory_|vault\.(mem|wiki)\.)/.test(id);
}

/**
 * Merge graph-find hits + brain-only hits into one ranked, deduped list.
 * Vault-backed hits are surfaced FIRST (the obsidian emphasis), then structural
 * graph nodes; deduped by id (first wins); capped at k. Each hit is tagged with
 * `source: 'vault' | 'graph'`.
 */
export function mergeHits(graphHits, brainHits, k = DEFAULT_K, minGraph = DEFAULT_MIN_GRAPH) {
  const g = Array.isArray(graphHits) ? graphHits : [];
  const b = Array.isArray(brainHits) ? brainHits : [];
  const tagged = [
    ...b.map(h => ({ ...h, source: "vault" })),
    ...g.map(h => ({ ...h, source: isVaultHit(h) ? "vault" : "graph" })),
  ];
  const vault = tagged.filter(h => h.source === "vault");
  const graph = tagged.filter(h => h.source === "graph");
  // Reserve a few slots for structural GRAPH hits. Without this, vault-first +
  // the k-cap evicts EVERY graph hit for any documented query (the vault holds a
  // node per commit), so the "combiner" would ground vault-only -- defeating the
  // whole graph+vault join. Never reserve more than a third of the budget, and
  // never more graph than actually exist.
  const reserve = Math.min(minGraph, graph.length, Math.floor(k / 3));
  const out = [];
  const seen = new Set();
  const take = (arr, limit) => {
    for (const h of arr) {
      if (out.length >= limit) break;
      if (!h || typeof h.id !== "string" || seen.has(h.id)) continue;
      seen.add(h.id);
      out.push(h);
    }
  };
  take(vault, k - reserve); // vault first (obsidian emphasis), leaving room for reserved graph
  take(graph, k);           // guarantee up to `reserve` structural graph hits
  take(vault, k);           // backfill any remaining capacity with leftover vault
  return out;
}

/**
 * Best-effort node-id -> vault .md relative path. Returns null for non-vault
 * ids. wiki.<dir...>.<slug> -> knowledge/wiki/<dir...>/<slug>.md;
 * memory_<type>.<slug> -> knowledge/memories/<type>/<slug>.md.
 */
export function idToVaultPath(id) {
  if (typeof id !== "string") return null;
  // system-viz vault-node namespaces: vault.mem.<segs> / vault.wiki.<segs>
  if (id.startsWith("vault.mem.")) {
    const segs = id.slice("vault.mem.".length).split(".").filter(Boolean);
    return segs.length ? "knowledge/memories/" + segs.join("/") + ".md" : null;
  }
  if (id.startsWith("vault.wiki.")) {
    const segs = id.slice("vault.wiki.".length).split(".").filter(Boolean);
    return segs.length ? "knowledge/wiki/" + segs.join("/") + ".md" : null;
  }
  // legacy/direct namespaces: wiki.<segs> / memory_<type>.<slug>
  if (id.startsWith("wiki.")) {
    const segs = id.slice("wiki.".length).split(".").filter(Boolean);
    return segs.length ? "knowledge/wiki/" + segs.join("/") + ".md" : null;
  }
  const m = id.match(/^memory_([a-z0-9-]+)\.(.+)$/);
  if (m) return "knowledge/memories/" + m[1] + "/" + m[2] + ".md";
  return null;
}

/** Trim a markdown body to a compact snippet: strip frontmatter, collapse blanks, cap chars. */
export function snippetOf(body, maxChars = DEFAULT_SNIPPET_CHARS) {
  if (typeof body !== "string") return "";
  let t = body.replace(/^---\n[\s\S]*?\n---\n/, ""); // drop YAML frontmatter
  t = t.replace(/\r/g, "").split("\n").filter(l => l.trim().length).join(" ").replace(/\s+/g, " ").trim();
  return t.slice(0, maxChars);
}

/** Build the grounded Ollama prompt from the question + merged hits + resolved snippets. */
export function buildGroundedPrompt(question, hits, snippetsById = {}, cardsById = {}) {
  const lines = [];
  lines.push(`You are answering a question about the PRISM manufacturing-intelligence system, grounded ONLY in the PRISM system-graph nodes and Obsidian-vault entries listed below.`);
  lines.push(`Question: ${question}`);
  lines.push("");
  lines.push(`Grounding (system-viz graph + Obsidian vault):`);
  for (const h of hits) {
    const tag = h.source === "vault" ? "[VAULT]" : "[GRAPH]";
    lines.push(`- ${tag} ${h.id} :: ${h.label || ""}`);
    const snip = snippetsById[h.id];
    if (snip) lines.push(`    excerpt: ${snip}`);
    // Graph hits carry no .md snippet; enrich them with their node-card meta
    // (layer/kind/status + one-line info + doc count) so the graph side grounds
    // as richly as the vault side instead of just "id :: label".
    const card = cardsById[h.id];
    if (card) {
      const bits = [card.layer, card.kind, card.status].filter(Boolean).join("/");
      const info = card.info ? " -- " + card.info : "";
      const docs = card.noteCount ? " [" + card.noteCount + " docs]" : "";
      lines.push("    meta: " + bits + info + docs);
    }
  }
  lines.push("");
  lines.push(`Answer the question using ONLY the grounding above. Be concise. Cite the specific node ids / vault entries you used. If the grounding does not contain the answer, say so plainly -- do not invent.`);
  return lines.join("\n");
}

// --------------------------------------------------------------------------
// IMPURE SHELL (spawners are injectable for tests)
// --------------------------------------------------------------------------

function defaultVizQuery(query, brainOnly) {
  const args = [SVQ, "find", query, "--json"];
  if (brainOnly) args.push("--brain-only");
  try {
    const out = execFileSync(process.execPath, args, { encoding: "utf8", timeout: 60000, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    const j = JSON.parse(out);
    return Array.isArray(j) ? j : (Array.isArray(j.hits) ? j.hits : []);
  } catch { return []; }
}

function defaultAsk(prompt, model, timeoutMs) {
  try {
    const out = execFileSync(process.execPath, [ASK_OLLAMA, "ask", prompt, "--json", "--model", model, "--timeout", String(timeoutMs)],
      { encoding: "utf8", timeout: timeoutMs + 15000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    const j = JSON.parse(out);
    return typeof j.answer === "string" ? j.answer : "";
  } catch { return ""; }
}

/** Resolve snippets for the top-N vault hits (fail-soft). */
function resolveSnippets(hits, maxSnippets, maxChars) {
  const snippetsById = {};
  let n = 0;
  for (const h of hits) {
    if (n >= maxSnippets) break;
    if (h.source !== "vault") continue;
    const rel = idToVaultPath(h.id);
    if (!rel) continue;
    const abs = join(REPO_ROOT, rel);
    if (!existsSync(abs)) continue;
    try { snippetsById[h.id] = snippetOf(readFileSync(abs, "utf8"), maxChars); n++; } catch { /* skip */ }
  }
  return snippetsById;
}

/** Seek node-cards (cheap offset-index seek, never loads the 878MB graph, never throws) for the
 * top GRAPH hits -> structural grounding (layer/kind/status/info/noteCount). Vault hits already
 * get .md snippets, so they are skipped here. Fail-soft: a null seek -> no card for that hit. */
function resolveCards(hits, maxCards, seek = seekCard) {
  const cardsById = {};
  let n = 0;
  for (const h of hits) {
    if (n >= maxCards) break;
    if (!h || h.source !== "graph") continue;
    let r;
    try { r = seek(h.id); } catch { r = null; }
    if (!r || !r.card) continue;
    const c = r.card;
    cardsById[h.id] = {
      layer: c.layer || "",
      kind: c.kind || "",
      status: c.status || "",
      info: typeof c.info === "string" ? c.info.slice(0, DEFAULT_CARD_INFO_CHARS) : "",
      noteCount: c.noteCount || 0,
    };
    n++;
  }
  return cardsById;
}

export async function synergyAsk(question, opts = {}, deps = {}) {
  const { k = DEFAULT_K, snippets = DEFAULT_SNIPPETS, cards = DEFAULT_CARDS, model = DEFAULT_MODEL, timeoutMs = DEFAULT_TIMEOUT_MS, snippetChars = DEFAULT_SNIPPET_CHARS } = opts;
  const vizQuery = deps.vizQuery || defaultVizQuery;
  const ask = deps.ask || defaultAsk;
  const resolve = deps.resolveSnippets || resolveSnippets;
  const resolveCardsFn = deps.resolveCards || resolveCards;
  const seek = deps.seekCard || seekCard;

  // AND-conjunctive find -> query each keyword individually, merge (OR semantics).
  const keywords = extractKeywords(question);
  const terms = keywords.length ? keywords : [question]; // fallback: the whole question
  const graphHits = [];
  const brainHits = [];
  for (const term of terms) {
    graphHits.push(...(await vizQuery(term, false)));
    brainHits.push(...(await vizQuery(term, true)));
  }
  const hits = mergeHits(graphHits, brainHits, k);

  // R5/R12: a question with ZERO grounding must NOT reach the LLM. The skill
  // promises "does not invent" -- enforce that deterministically instead of
  // trusting the model to obey the prompt: no grounding -> no ollama call (saves
  // the wasted offload + latency) -> honest empty answer that main() surfaces as
  // "no PRISM grounding found". A 0-hit prompt is the one case where an LLM call
  // can only hallucinate, never ground.
  if (hits.length === 0) {
    return {
      question,
      keywords: terms,
      answer: "",
      grounded: false,
      grounding: { total: 0, vault: 0, graph: 0, snippets: 0 },
      sources: [],
    };
  }

  const snippetsById = resolve(hits, snippets, snippetChars);
  const cardsById = resolveCardsFn(hits, cards, seek);
  const prompt = buildGroundedPrompt(question, hits, snippetsById, cardsById);
  const answer = await ask(prompt, model, timeoutMs);

  return {
    question,
    keywords: terms,
    answer,
    grounded: hits.length > 0,
    grounding: {
      total: hits.length,
      vault: hits.filter(h => h.source === "vault").length,
      graph: hits.filter(h => h.source === "graph").length,
      snippets: Object.keys(snippetsById).length,
      cards: Object.keys(cardsById).length,
    },
    sources: hits.map(h => ({ id: h.id, source: h.source, label: h.label })),
  };
}

function parseArgs(argv) {
  const a = { k: DEFAULT_K, snippets: DEFAULT_SNIPPETS, cards: DEFAULT_CARDS, model: DEFAULT_MODEL, timeoutMs: DEFAULT_TIMEOUT_MS, json: false, q: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--json") a.json = true;
    else if (t === "--k") a.k = Math.max(1, parseInt(argv[++i], 10) || DEFAULT_K);
    else if (t === "--snippets") a.snippets = Math.max(0, parseInt(argv[++i], 10) || DEFAULT_SNIPPETS);
    else if (t === "--cards") a.cards = Math.max(0, parseInt(argv[++i], 10) || DEFAULT_CARDS);
    else if (t === "--model") a.model = argv[++i] || a.model;
    else if (t === "--timeout") a.timeoutMs = Math.max(5000, parseInt(argv[++i], 10) || DEFAULT_TIMEOUT_MS);
    else a.q.push(t);
  }
  return a;
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const question = a.q.join(" ").trim();
  if (!question) { console.error('usage: node scripts/synergy-ask.mjs "<question>" [--k N --snippets N --model M --json]'); return 2; }
  const r = await synergyAsk(question, a);
  if (a.json) { console.log(JSON.stringify(r, null, 2)); return 0; }
  console.log(`Q: ${r.question}`);
  console.log(`\n${r.answer || (r.grounded === false ? "(no PRISM grounding found for this question -- nothing to ground an answer on; not invented)" : "(no answer -- ollama unreachable; grounding hits below)")}`);
  console.log(`\n-- grounded on ${r.grounding.total} hits (${r.grounding.vault} vault / ${r.grounding.graph} graph, ${r.grounding.snippets} snippets, ${r.grounding.cards} cards) --`);
  for (const s of r.sources.slice(0, 8)) console.log(`  [${s.source}] ${s.id}`);
  return 0;
}

const invokedDirect = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("synergy-ask.mjs");
if (invokedDirect) {
  main().then(c => process.exit(c || 0)).catch(e => { console.error("synergy-ask crashed:", e.message); process.exit(1); });
}
