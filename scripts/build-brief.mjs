#!/usr/bin/env node
/**
 * build-brief.mjs — deep pre-build knowledge brief for a unit or topic
 *
 * HIGH-ROI knowledge-injection skill (slot juliett, 2026-05-19).
 *
 * The gap this closes: PRISM's existing injection surfaces are all SHALLOW.
 * master-index-precheck-inject gives ~5 node *names*; wiki-precheck gives 3
 * entry *titles*; unit-knowledge-pack lists *pointers*. Nothing reads the
 * actual *bodies* of the most-relevant knowledge and synthesizes a deep
 * brief into context before a build starts. Build quality is gated by depth
 * — "the more you know about the subject, the higher the quality output."
 *
 * `build-brief` is `unit-knowledge-pack` deepened from pointers to CONTENT:
 *   1. Resolve a unit-id (or free-text topic, or active slot claim).
 *   2. Search the wiki leaf-index DIRECTLY for the most relevant entries and
 *      READ their bodies — emitting a relevance-targeted excerpt of each.
 *      (Graph-independent: survives the architecture-graph fallback the
 *      master-index lib uses when system-graph.json exceeds its byte cap.)
 *   3. Resolve memory entry names from graph hits the same way.
 *   4. Tribal tips — domain-filtered, with their FULL stored text.
 *   5. Known regressions from CLAUDE.md that touch the query area — so the
 *      build does not re-introduce a documented bug.
 *   6. Prior shipped commits in the milestone (unit mode).
 *   7. Master-index graph hits — a ranked node list for orientation.
 *
 * Pure decision functions + injected readers — testable end-to-end without
 * a live model or filesystem. Fail-soft on every missing input: the brief
 * still surfaces what it found instead of throwing.
 *
 * Reuse, not duplication: unit-resolution (lookupUnit / buildQueryTokens /
 * inferDomain / resolveSlotToUnit / gitCommitsForMilestone) is imported from
 * unit-knowledge-pack.mjs; keyword search is the shared master-index lib.
 * The genuinely new code here is the leaf-index search + body-excerpt layer.
 *
 * CLI:
 *   node scripts/build-brief.mjs <UNIT_ID>
 *   node scripts/build-brief.mjs "chatter detection in milling"
 *   node scripts/build-brief.mjs --slot juliett
 *   node scripts/build-brief.mjs <UNIT_ID> --json --no-write --k 12
 *   node scripts/build-brief.mjs <TOPIC> --wiki-bodies 8 --tribal-k 8 --git-n 50
 *
 * Output:
 *   - stdout: rendered markdown (or JSON with --json)
 *   - file:   state/shared/build-briefs/<target>.md  (unless --no-write)
 */
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve, isAbsolute, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import {
  lookupUnit,
  buildQueryTokens,
  inferDomain,
  resolveSlotToUnit,
  gitCommitsForMilestone,
} from "./unit-knowledge-pack.mjs";
import {
  runMasterIndexSearch,
  runTribalSearch,
  loadTribalIndex,
  tokenize,
} from "./lib/master-index-search-lib.mjs";

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(SELF), "..");
const WIKI_LEAF_INDEX_PATH = join(REPO_ROOT, "knowledge", "wiki", "architecture", "_leaf-index.jsonl");
const MEMORY_DIR = join(REPO_ROOT, "knowledge", "memories");
const CLAUDE_MD_PATH = join(REPO_ROOT, "CLAUDE.md");
const BRIEF_OUT_DIR = join(REPO_ROOT, "state", "shared", "build-briefs");

// Obsidian memory namespaces (knowledge/memories/<type>/).
export const MEMORY_TYPES = ["feedback", "reference", "project", "user"];

// Wiki leaf types that carry hand-written DESIGN depth — boosted when
// ranking bodies for the deep-wiki section so a genuine architecture/
// concept doc outranks an auto-generated per-action stub. `code-tribal`
// is deliberately NOT here: distilled shop tips are surfaced by the
// dedicated tribal section, and boosting them here just crowds out the
// design knowledge the deep-wiki section exists to deliver.
const MEATY_WIKI_TYPES = new Set([
  "architecture", "concept", "concepts", "lesson", "lessons",
  "pattern", "patterns", "decision", "decisions", "entity", "entities",
  "software-engineering", "trajectory", "trajectories",
]);

// A slug is safe to interpolate into a path only if it is a bare filename
// token — no separators, no traversal. `~` is allowed (wiki disambiguation
// suffix, e.g. `wiki-propagation-watchdog-stop~2`).
const SAFE_SLUG_RE = /^[A-Za-z0-9._~-]+$/;

// Excerpt-size budgets (chars) — defaults, overridable via --max-excerpt.
const DEFAULT_MAX_EXCERPT = 1400; // per wiki-body excerpt
const MEMORY_EXCERPT_CAP = 900;   // memory memos are dense — tighter cap

// excerptBody layout constants.
const SECTION_SEP = "\n\n";
const TRUNC_MARKER = "\n\n… (excerpt truncated — read the full file for the rest)";
const LEAD_BUDGET_FRACTION = 0.55; // lead's max budget share when relevant sections compete
const MIN_SECTION_CHARS = 80;      // drop a section if its clip room falls below this
const TRIBAL_TEXT_CAP = 600;       // per-tribal-tip body shown in the brief
const REGRESSION_LINE_CAP = 280;   // per-regression-line length in the brief

// leaf-index search: per-field weights × IDF (rare query tokens dominate)
// + a multiplicative bonus for hand-written topic types.
const W_LEAF_NAME = 3;
const W_LEAF_TITLE = 2;
const W_LEAF_DESC = 1;
const LEAF_MEATY_MULT = 1.25;

// Process-lifetime cache for the parsed wiki leaf-index, keyed on mtime.
let _leafCache = { path: "", mtimeMs: 0, wrapper: null };

/** Parse CLI argv into a normalized opts object. Pure. */
export function parseArgs(argv) {
  const opts = {
    target: null, slot: null, json: false, write: true,
    topK: 8, tribalK: 5, wikiBodies: 5, memBodies: 3,
    gitN: 20, regrN: 6, maxExcerpt: DEFAULT_MAX_EXCERPT,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slot") opts.slot = argv[++i] ?? null;
    else if (a === "--json") opts.json = true;
    else if (a === "--no-write") opts.write = false;
    else if (a === "--k") {
      const n = parseInt(argv[++i] ?? "8", 10);
      opts.topK = Math.max(1, Math.min(40, Number.isFinite(n) ? n : 8));
    } else if (a === "--max-excerpt") {
      const n = parseInt(argv[++i] ?? String(DEFAULT_MAX_EXCERPT), 10);
      opts.maxExcerpt = Math.max(200, Math.min(8000, Number.isFinite(n) ? n : DEFAULT_MAX_EXCERPT));
    } else if (a === "--tribal-k") {
      const n = parseInt(argv[++i] ?? "5", 10);
      opts.tribalK = Math.max(0, Math.min(20, Number.isFinite(n) ? n : 5));
    } else if (a === "--wiki-bodies") {
      const n = parseInt(argv[++i] ?? "5", 10);
      opts.wikiBodies = Math.max(0, Math.min(20, Number.isFinite(n) ? n : 5));
    } else if (a === "--mem-bodies") {
      const n = parseInt(argv[++i] ?? "3", 10);
      opts.memBodies = Math.max(0, Math.min(20, Number.isFinite(n) ? n : 3));
    } else if (a === "--git-n") {
      const n = parseInt(argv[++i] ?? "20", 10);
      opts.gitN = Math.max(0, Math.min(200, Number.isFinite(n) ? n : 20));
    } else if (a === "--regr-n") {
      const n = parseInt(argv[++i] ?? "6", 10);
      opts.regrN = Math.max(0, Math.min(40, Number.isFinite(n) ? n : 6));
    } else if (!a.startsWith("--") && !opts.target) {
      opts.target = a;
    }
  }
  return opts;
}

/**
 * Strip a leading YAML frontmatter block (`---\n…\n---\n`). Pure.
 * Tolerates a BOM and CRLF line endings.
 */
export function stripFrontmatter(body) {
  if (typeof body !== "string") return "";
  const m = body.match(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return m ? body.slice(m[0].length) : body.replace(/^﻿/, "");
}

/**
 * Count total occurrences of any query token inside a string. Token-overlap
 * relevance score — used for section ranking (density matters here); this is
 * NOT the leaf-index scorer (searchWikiLeaves uses IDF + presence). Pure.
 */
export function tokenScore(text, queryTokens) {
  if (!text) return 0;
  const lc = String(text).toLowerCase();
  let score = 0;
  for (const t of queryTokens || []) {
    const tok = String(t).toLowerCase();
    if (tok.length < 2) continue;
    let idx = 0;
    while ((idx = lc.indexOf(tok, idx)) !== -1) { score++; idx += tok.length; }
  }
  return score;
}

/**
 * Relevance-targeted excerpt of a markdown body. Splits the body into
 * heading-delimited sections, then allocates a character budget across them:
 * the lead section always appears (but is capped at LEAD_BUDGET_FRACTION of
 * the budget when query-relevant sections compete, so a long boilerplate
 * lead cannot starve them), and the remaining budget goes to the
 * highest token-scoring sections. Selected sections are emitted in document
 * order. The returned string — including any truncation marker — is
 * guaranteed not to exceed `maxChars`. Pure.
 *
 * @param {string} body          — raw file content (frontmatter ok)
 * @param {string[]} queryTokens — relevance tokens
 * @param {number} [maxChars]
 * @returns {string}
 */
export function excerptBody(body, queryTokens = [], maxChars = DEFAULT_MAX_EXCERPT) {
  const stripped = stripFrontmatter(body).trim();
  if (!stripped) return "";
  if (stripped.length <= maxChars) return stripped;
  // Budget too small to carry sectioned content + the marker — plain clip.
  if (maxChars <= TRUNC_MARKER.length + MIN_SECTION_CHARS) {
    return stripped.slice(0, maxChars).replace(/\s+\S*$/, "");
  }

  // Section the body at markdown headings (# … ####). Text before the first
  // heading is the lead section.
  const lines = stripped.split(/\r?\n/);
  const sections = [];
  let cur = [];
  for (const ln of lines) {
    if (/^#{1,4}\s/.test(ln) && cur.length) { sections.push(cur.join("\n").trim()); cur = []; }
    cur.push(ln);
  }
  if (cur.length) sections.push(cur.join("\n").trim());

  const scored = sections.map((text, i) => ({ i, text, score: tokenScore(text, queryTokens) }));
  const budget = maxChars - TRUNC_MARKER.length;

  // Queue: lead first, then query-relevant sections by descending score.
  const relevant = [...scored].slice(1)
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i);
  const queue = [scored[0], ...relevant];

  // Allocate the budget. The lead is capped when relevant sections exist; it
  // gets the whole budget when it is the only content. Each section is
  // clipped to its allocation on a word boundary.
  const leadCap = relevant.length > 0 ? Math.floor(budget * LEAD_BUDGET_FRACTION) : budget;
  const kept = new Map();
  let remaining = budget;
  for (let qi = 0; qi < queue.length; qi++) {
    if (remaining < MIN_SECTION_CHARS) break;
    const s = queue[qi];
    const cap = Math.min(remaining, qi === 0 ? leadCap : remaining);
    const piece = s.text.length > cap ? s.text.slice(0, cap).replace(/\s+\S*$/, "") : s.text;
    if (!piece) break;
    kept.set(s.i, piece);
    remaining -= piece.length + SECTION_SEP.length;
  }

  // Emit selected sections in document order, with a gap marker for
  // non-contiguous jumps. The final hard clip guarantees out + marker
  // never exceeds maxChars regardless of separator/gap-marker accounting.
  const chosen = [...kept.keys()].sort((a, b) => a - b);
  let truncated = chosen.length < scored.length;
  const blocks = [];
  for (let k = 0; k < chosen.length; k++) {
    const idx = chosen[k];
    if (kept.get(idx).length < scored[idx].text.length) truncated = true;
    blocks.push(kept.get(idx));
    if (k + 1 < chosen.length && chosen[k + 1] !== idx + 1) blocks.push("…");
  }
  let out = blocks.join(SECTION_SEP);
  if (out.length > budget) {
    out = out.slice(0, budget).replace(/\s+\S*$/, "");
    truncated = true;
  }
  return truncated ? out + TRUNC_MARKER : out;
}

/**
 * Normalize a wiki/memory entry name to a bare slug: strips `[[ ]]`
 * wikilink brackets, any path segments, and a trailing `.md`. Returns null
 * if the result is not a safe path token.
 */
export function normalizeSlug(name) {
  if (!name || typeof name !== "string") return null;
  let slug = name.trim().replace(/^\[\[/, "").replace(/\]\]$/, "").trim();
  slug = slug.split(/[\\/]/).pop() || "";
  slug = slug.replace(/\.md$/i, "").trim();
  if (!slug || slug === "." || slug === ".." || !SAFE_SLUG_RE.test(slug)) return null;
  return slug;
}

/**
 * Load + parse the wiki leaf-index (`_leaf-index.jsonl`) — one JSON record
 * per line, `{name, title, type, desc, path}`. mtime-cached for the process
 * lifetime. Per-line try/continue so one malformed row never aborts the
 * load. Returns `{entries, byName}` or null on any failure.
 */
export function loadWikiLeafIndex(indexPath = WIKI_LEAF_INDEX_PATH, opts = {}) {
  const readImpl = opts.readImpl || readFileSync;
  const existsImpl = opts.existsImpl || existsSync;
  const statImpl = opts.statImpl || statSync;
  if (!existsImpl(indexPath)) return null;
  let stat;
  try { stat = statImpl(indexPath); } catch { return null; }
  if (_leafCache.path === indexPath && _leafCache.mtimeMs === stat.mtimeMs && _leafCache.wrapper) {
    return _leafCache.wrapper;
  }
  let raw;
  try { raw = readImpl(indexPath, "utf8"); } catch { return null; }
  const entries = [];
  const byName = new Map();
  for (const line of String(raw).split(/\r?\n/)) {
    const ln = line.trim();
    if (!ln) continue;
    let e;
    try { e = JSON.parse(ln); } catch { continue; }
    if (!e || typeof e.name !== "string" || typeof e.path !== "string") continue;
    const rec = {
      name: e.name,
      title: String(e.title || ""),
      type: String(e.type || ""),
      desc: String(e.desc || ""),
      path: e.path,
    };
    entries.push(rec);
    if (!byName.has(rec.name)) byName.set(rec.name, rec);
  }
  const wrapper = { entries, byName };
  _leafCache = { path: indexPath, mtimeMs: stat.mtimeMs, wrapper };
  return wrapper;
}

/** Reset the leaf-index cache. Test helper. */
export function _resetLeafCacheForTests() {
  _leafCache = { path: "", mtimeMs: 0, wrapper: null };
}

/**
 * Keyword-search the wiki leaf-index for the top-K most relevant entries.
 *
 * IDF-weighted: a one-pass document-frequency count over the index gives
 * each query token an inverse-document-frequency weight, so a rare
 * discriminating term ("chatter", "kienzle") outweighs a generic one
 * ("milling", "system") — the difference between surfacing the entry the
 * builder actually needs versus the most keyword-dense noise. A
 * multiplicative bonus then lifts hand-written topic types above the
 * auto-generated per-action stub entries. Pure.
 *
 * @param {{entries: Array}} index
 * @param {string[]} queryTokens
 * @param {object} [opts]  — { topK }
 * @returns {Array<{name,title,type,path,score}>}
 */
export function searchWikiLeaves(index, queryTokens, opts = {}) {
  if (!index || !Array.isArray(index.entries)) return [];
  if (!Array.isArray(queryTokens) || queryTokens.length === 0) return [];
  const topK = opts.topK ?? 12;
  const toks = [...new Set(
    queryTokens.map((t) => String(t).toLowerCase()).filter((t) => t.length >= 2),
  )];
  if (toks.length === 0) return [];
  const N = index.entries.length || 1;

  // Pass 1 — lowercase each field once + count document frequency per token.
  const df = new Map(toks.map((t) => [t, 0]));
  const lc = [];
  for (const e of index.entries) {
    const rec = {
      nameLc: e.name.toLowerCase(),
      titleLc: e.title.toLowerCase(),
      descLc: e.desc.toLowerCase(),
    };
    lc.push(rec);
    const blob = `${rec.nameLc}\n${rec.titleLc}\n${rec.descLc}`;
    for (const t of toks) if (blob.includes(t)) df.set(t, df.get(t) + 1);
  }
  // Smoothed IDF — always positive; rare tokens score far higher.
  const idf = new Map(toks.map((t) => [t, Math.log((N + 1) / (df.get(t) + 1)) + 1]));

  // Pass 2 — score each entry by best-field hit per token, IDF-weighted.
  const scored = [];
  for (let i = 0; i < index.entries.length; i++) {
    const e = index.entries[i];
    const { nameLc, titleLc, descLc } = lc[i];
    let s = 0;
    for (const t of toks) {
      const w = idf.get(t);
      if (nameLc.includes(t)) s += W_LEAF_NAME * w;
      else if (titleLc.includes(t)) s += W_LEAF_TITLE * w;
      else if (descLc.includes(t)) s += W_LEAF_DESC * w;
    }
    if (s <= 0) continue;
    if (MEATY_WIKI_TYPES.has(e.type)) s *= LEAF_MEATY_MULT;
    scored.push({ name: e.name, title: e.title, type: e.type, path: e.path, score: s });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

/**
 * Resolve a memory entry name to an on-disk .md file. The `type_*` filename
 * prefix picks the namespace first; all namespaces are then probed as a
 * fallback. Returns the first existing path, or null.
 */
export function resolveMemoryFile(name, opts = {}) {
  const existsImpl = opts.existsImpl || existsSync;
  const memDir = opts.memoryDir || MEMORY_DIR;
  const slug = normalizeSlug(name);
  if (!slug) return null;
  const prefix = slug.split("_")[0];
  const order = MEMORY_TYPES.includes(prefix)
    ? [prefix, ...MEMORY_TYPES.filter((t) => t !== prefix)]
    : MEMORY_TYPES;
  for (const t of order) {
    const p = join(memDir, t, `${slug}.md`);
    try { if (existsImpl(p)) return p; } catch { /* probe next */ }
  }
  return null;
}

/**
 * Collect ranked, deduped EXPLICIT wiki entry names joined onto master-index
 * hits via `.wiki`. These are curated references — resolved against the
 * leaf-index first, ahead of the direct keyword-search results. Pure.
 */
export function collectWikiNames(hits, cap = 24) {
  const seen = new Set();
  const out = [];
  for (const h of hits || []) {
    for (const w of (h && Array.isArray(h.wiki) ? h.wiki : [])) {
      const slug = normalizeSlug(w);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      out.push(slug);
      if (out.length >= cap) return out;
    }
  }
  return out;
}

/** Collect ranked, deduped memory entry names from master-index hits. Pure. */
export function collectMemoryNames(hits, cap = 12) {
  const seen = new Set();
  const out = [];
  for (const h of hits || []) {
    for (const m of (h && Array.isArray(h.memory) ? h.memory : [])) {
      const slug = normalizeSlug(m);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      out.push(slug);
      if (out.length >= cap) return out;
    }
  }
  return out;
}

/**
 * Read + excerpt the bodies of resolved entries. Stops once `limit` bodies
 * are collected so an unresolvable early item never crowds out a resolvable
 * later one.
 *
 * Each item is `{name, path?, title?, kind?}`. When `path` is set it is used
 * directly (joined onto `repoRoot` if relative); otherwise `opts.resolveImpl`
 * resolves `name` to a path. Only non-"derived" misses land in `missing`.
 *
 * @returns {{entries: Array<{name,path,title,excerpt}>, missing: string[]}}
 */
export function collectBodies(items, queryTokens, opts = {}) {
  const readImpl = opts.readImpl || readFileSync;
  const resolveImpl = opts.resolveImpl || null;
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const maxExcerpt = opts.maxExcerpt ?? DEFAULT_MAX_EXCERPT;
  const limit = Number.isFinite(opts.limit) ? opts.limit : Infinity;
  const entries = [];
  const missing = [];
  const rootResolved = resolve(repoRoot);
  for (const raw of items || []) {
    if (entries.length >= limit) break;
    const item = typeof raw === "string" ? { name: raw } : raw;
    if (!item || typeof item.name !== "string") continue;
    const reportable = item.kind !== "derived";
    let path = item.path || null;
    if (path) {
      // Containment guard — a corrupted leaf-index `path` (relative OR
      // absolute) must not escape the repo root.
      const abs = isAbsolute(path) ? resolve(path) : resolve(join(repoRoot, path));
      if (abs === rootResolved || abs.startsWith(rootResolved + sep)) path = abs;
      else { if (reportable) missing.push(item.name); continue; }
    }
    if (!path && resolveImpl) path = resolveImpl(item.name, opts);
    if (!path) { if (reportable) missing.push(item.name); continue; }
    let body;
    try { body = readImpl(path, "utf8"); }
    catch { if (reportable) missing.push(item.name); continue; }
    const excerpt = excerptBody(body, queryTokens, maxExcerpt);
    if (excerpt) entries.push({ name: item.name, path, title: item.title || "", excerpt });
    else if (reportable) missing.push(item.name);
  }
  return { entries, missing };
}

/**
 * Scan CLAUDE.md regression log lines (`- YYYY-MM-DD | …`) for entries whose
 * text overlaps the query tokens. Returns the top `limit` most-relevant,
 * each trimmed to a readable length, leading bullet stripped. Pure.
 */
export function scanRegressions(claudeMdText, queryTokens, limit = 6) {
  if (!claudeMdText || typeof claudeMdText !== "string") return [];
  const hits = [];
  for (const raw of claudeMdText.split(/\r?\n/)) {
    if (!/^-\s*20\d\d-\d\d-\d\d\s*\|/.test(raw)) continue;
    const score = tokenScore(raw, queryTokens);
    if (score <= 0) continue;
    // Strip the leading markdown bullet — renderBriefMarkdown re-adds one.
    const line = raw.replace(/^-\s*/, "").replace(/\s+/g, " ").trim();
    hits.push({
      score,
      line: line.length > REGRESSION_LINE_CAP ? `${line.slice(0, REGRESSION_LINE_CAP - 3)}…` : line,
    });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit).map((h) => h.line);
}

/**
 * Enrich tribal hits (which carry no body text) with their full stored text
 * by joining against the loaded tribal index on `id`. Pure-ish (depends on
 * the injected index loader).
 */
export function enrichTribalText(hits, opts = {}) {
  const loadImpl = opts.loadTribalImpl || loadTribalIndex;
  let index;
  try { index = loadImpl(); } catch { index = null; }
  const textById = new Map();
  for (const e of (index && Array.isArray(index.entries) ? index.entries : [])) {
    if (e && e.id) textById.set(String(e.id), String(e.text || ""));
  }
  return (hits || []).map((h) => ({ ...h, fullText: textById.get(String(h.id)) || "" }));
}

/**
 * Compose a deep build brief for a unit-id or free-text topic.
 * Pure-ish: every external read is an injectable dependency.
 *
 * @param {string} target — unit-id or topic text
 * @param {object} [opts]
 * @returns {object} brief
 */
export function composeBrief(target, opts = {}) {
  const {
    readImpl = readFileSync,
    spawnImpl = spawnSync,
    searchImpl = runMasterIndexSearch,
    tribalImpl = runTribalSearch,
    loadLeafImpl = loadWikiLeafIndex,
    searchLeavesImpl = searchWikiLeaves,
    collectBodiesImpl = collectBodies,
    enrichTribalImpl = enrichTribalText,
    nowIso = new Date().toISOString(),
    slot = null,
    topK = 8,
    tribalK = 5,
    wikiBodies = 5,
    memBodies = 3,
    gitN = 20,
    regrN = 6,
    maxExcerpt = DEFAULT_MAX_EXCERPT,
  } = opts;

  const warnings = [];
  if (!target || typeof target !== "string" || !target.trim()) {
    return {
      target: null, mode: "empty", slot, generatedAt: nowIso,
      unit: null, domain: null, query: "", queryTokens: [],
      wikiContext: [], memoryContext: [], tribal: [], regressions: [], commits: [],
      masterHits: [], missingWiki: [], missingMemory: [],
      warnings: ["No target — pass a unit-id, a topic string, or --slot <NATO> with an active claim."],
    };
  }
  const cleanTarget = target.trim();

  // Mode resolution: a target that resolves in the consolidated roadmap is a
  // unit; everything else is a free-text topic.
  const unit = lookupUnit(cleanTarget, readImpl);
  const mode = unit ? "unit" : "topic";

  const query = mode === "unit"
    ? buildQueryTokens(cleanTarget, unit)
    : cleanTarget.replace(/[_:]+/g, " ").trim();
  const queryTokens = tokenize(query, { maxTokens: 12 });
  if (queryTokens.length < 2) {
    warnings.push(`Query "${query}" yielded < 2 search tokens — brief will be thin.`);
  }

  // Master-index graph search (shared lib — correct opt name: topK, not k).
  let masterHits = [];
  try {
    const r = searchImpl(query, { topK });
    masterHits = (r && Array.isArray(r.hits) ? r.hits : Array.isArray(r) ? r : []).slice(0, topK);
  } catch (e) {
    warnings.push(`master-index search failed: ${e?.message || e}`);
  }

  // Domain — drives tribal preference. inferDomain reads `unit.milestone`;
  // for a topic, synthesize a milestone-shaped string from the target.
  const domain = inferDomain(unit || { milestone: cleanTarget.toUpperCase() });

  // Deep wiki bodies — the core value. Primary source is a DIRECT leaf-index
  // keyword search (graph-independent — works even when the master-index lib
  // has fallen back to the architecture-graph). Explicit `.wiki` names from
  // graph hits are resolved against the same index and tried first.
  let wikiContext = [];
  let missingWiki = [];
  try {
    const leafIndex = loadLeafImpl();
    if (!leafIndex) warnings.push("wiki leaf-index not loadable — deep wiki context skipped.");
    const items = [];
    const seenNames = new Set();
    const seenTitles = new Set();
    const pushItem = (rec, kind) => {
      if (!rec || seenNames.has(rec.name)) return;
      const tkey = String(rec.title || "").toLowerCase().replace(/\s+/g, " ").trim();
      if (tkey && seenTitles.has(tkey)) return;
      seenNames.add(rec.name);
      if (tkey) seenTitles.add(tkey);
      items.push({ name: rec.name, path: rec.path, title: rec.title, kind });
    };
    if (leafIndex && leafIndex.byName) {
      for (const slug of collectWikiNames(masterHits)) {
        const rec = leafIndex.byName.get(slug);
        if (rec) pushItem(rec, "explicit");
      }
    }
    for (const rec of searchLeavesImpl(leafIndex, queryTokens, { topK: wikiBodies * 4 })) {
      pushItem(rec, "derived");
    }
    const r = collectBodiesImpl(items, queryTokens, {
      readImpl, repoRoot: REPO_ROOT, maxExcerpt, limit: wikiBodies,
    });
    wikiContext = r.entries;
    missingWiki = r.missing;
  } catch (e) {
    warnings.push(`wiki body collection failed: ${e?.message || e}`);
  }

  // Memory bodies — shorter excerpts (feedback memos are dense). Resolved by
  // namespace probe (memory files are flat under knowledge/memories/<type>/).
  let memoryContext = [];
  let missingMemory = [];
  try {
    const memItems = collectMemoryNames(masterHits).map((slug) => ({ name: slug }));
    const r = collectBodiesImpl(memItems, queryTokens, {
      readImpl, resolveImpl: resolveMemoryFile,
      maxExcerpt: Math.min(maxExcerpt, MEMORY_EXCERPT_CAP), limit: memBodies,
    });
    memoryContext = r.entries;
    missingMemory = r.missing;
  } catch (e) {
    warnings.push(`memory body collection failed: ${e?.message || e}`);
  }

  // Tribal tips — domain-filtered, with full stored text.
  let tribal = [];
  if (tribalK > 0) {
    try {
      // Over-fetch then dedup — the tribal index carries re-distilled
      // near-duplicates — so we still land tribalK unique entries.
      const r = tribalImpl(query, { topK: tribalK * 2, prefDomain: domain ?? undefined });
      const rawHits = (r && Array.isArray(r.hits) ? r.hits : Array.isArray(r) ? r : []);
      const enriched = enrichTribalImpl(rawHits);
      const seenTitles = new Set();
      tribal = enriched.filter((t) => {
        const key = String(t.title || t.id || "").toLowerCase().replace(/\s+/g, " ").trim();
        if (!key) return true;
        if (seenTitles.has(key)) return false;
        seenTitles.add(key);
        return true;
      }).slice(0, tribalK);
    } catch (e) {
      warnings.push(`tribal search failed: ${e?.message || e}`);
    }
  }

  // Known regressions touching this area.
  let regressions = [];
  try {
    const claudeMd = readImpl(CLAUDE_MD_PATH, "utf8");
    regressions = scanRegressions(claudeMd, queryTokens, regrN);
  } catch {
    warnings.push("CLAUDE.md not readable — regression scan skipped.");
  }

  // Prior shipped commits (unit mode only — needs a milestone).
  const commits = mode === "unit" ? gitCommitsForMilestone(unit, gitN, spawnImpl) : [];

  return {
    target: cleanTarget, mode, slot, generatedAt: nowIso,
    unit: unit ? { milestone: unit.milestone ?? null, title: unit.title ?? null } : null,
    domain, query, queryTokens,
    wikiContext, memoryContext, tribal, regressions, commits, masterHits,
    missingWiki, missingMemory, warnings,
  };
}

/** Render the brief to markdown. Pure. */
export function renderBriefMarkdown(brief) {
  const L = [];
  L.push(`# Build Brief — ${brief.target ?? "(no target)"}`);
  L.push("");
  L.push(`**Mode:** ${brief.mode}`);
  if (brief.unit) {
    L.push(`**Milestone:** ${brief.unit.milestone ?? "(unknown)"}`);
    L.push(`**Title:** ${brief.unit.title ?? "(no title in roadmap)"}`);
  }
  if (brief.domain) L.push(`**Domain:** ${brief.domain}`);
  if (brief.slot) L.push(`**Slot:** ${brief.slot}`);
  L.push(`**Generated:** ${brief.generatedAt}`);
  if (brief.queryTokens?.length) L.push(`**Query tokens:** ${brief.queryTokens.join(" · ")}`);
  L.push("");

  L.push(`## 📚 Deep wiki context (${brief.wikiContext.length})`);
  if (brief.wikiContext.length === 0) {
    L.push("_(no wiki bodies resolved — the area may be undocumented; build with extra care)_");
  } else {
    for (const w of brief.wikiContext) {
      L.push("");
      L.push(`### ${w.name}${w.title ? ` — ${w.title}` : ""}`);
      L.push(`\`${w.path}\``);
      L.push("");
      L.push(w.excerpt);
    }
  }
  L.push("");

  L.push(`## 🧠 Tribal knowledge (${brief.tribal.length}${brief.domain ? `, domain: ${brief.domain}` : ""})`);
  if (brief.tribal.length === 0) {
    L.push("_(no tribal tips matched)_");
  } else {
    for (const t of brief.tribal) {
      const txt = String(t.fullText || "").replace(/\s+/g, " ").trim();
      L.push(`- **${t.title || t.id}** _(${t.domain || "general"})_`
        + (txt ? `\n  ${txt.slice(0, TRIBAL_TEXT_CAP)}` : ""));
    }
  }
  L.push("");

  L.push(`## 🧬 Relevant memory (${brief.memoryContext.length})`);
  if (brief.memoryContext.length === 0) {
    L.push("_(no memory entries resolved)_");
  } else {
    for (const m of brief.memoryContext) {
      L.push("");
      L.push(`### ${m.name}`);
      L.push(m.excerpt);
    }
  }
  L.push("");

  L.push(`## ⚠️ Known regressions touching this area (${brief.regressions.length})`);
  if (brief.regressions.length === 0) {
    L.push("_(no matching regression entries — still verify, the log is not exhaustive)_");
  } else {
    L.push("_Do NOT re-introduce these — each is a documented past failure:_");
    for (const r of brief.regressions) L.push(`- ${r}`);
  }
  L.push("");

  if (brief.mode === "unit") {
    L.push(`## 📜 Prior commits in milestone (${brief.commits.length})`);
    if (brief.commits.length === 0) {
      L.push("_(no `[MILESTONE]` commits — likely a brand-new milestone)_");
    } else {
      for (const c of brief.commits) L.push(`- ${c}`);
    }
    L.push("");
  }

  L.push(`## 🧭 Master-index hits (${brief.masterHits.length})`);
  if (brief.masterHits.length === 0) {
    L.push("_(no graph hits — query tokens too sparse or graph unavailable)_");
  } else {
    for (const h of brief.masterHits) {
      L.push(`- [${h.layer || "?"}/${h.status || h.kind || "?"}] **${h.label || h.id}**`);
    }
  }
  L.push("");

  L.push("## How to use this brief");
  L.push("Read every section above **before writing code**. The deep wiki "
    + "context is the canonical design — match its conventions. Treat the "
    + "regressions as hard constraints. If the wiki context is empty, the "
    + "area is undocumented: investigate the engines directly and plan to "
    + "add a wiki entry as part of the build.");
  L.push("");

  if (brief.missingWiki?.length || brief.missingMemory?.length) {
    L.push("## 🔎 Referenced but unresolved");
    for (const n of (brief.missingWiki || []).slice(0, 8)) L.push(`- wiki: ${n}`);
    for (const n of (brief.missingMemory || []).slice(0, 8)) L.push(`- memory: ${n}`);
    L.push("");
  }

  if (brief.warnings?.length) {
    L.push("## ⚠ Composition warnings");
    for (const w of brief.warnings) L.push(`- ${w}`);
    L.push("");
  }

  return L.join("\n");
}

/** Write the brief to disk. Returns the file path, or null. */
export function writeBrief(brief, outDir = BRIEF_OUT_DIR) {
  if (!brief?.target) return null;
  try { mkdirSync(outDir, { recursive: true }); } catch { /* ignore */ }
  const safeId = brief.target.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 120);
  const filePath = join(outDir, `${safeId || "brief"}.md`);
  try { writeFileSync(filePath, renderBriefMarkdown(brief), "utf8"); }
  catch { return null; }
  return filePath;
}

/** CLI entrypoint. */
export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  let target = opts.target;
  if (!target && opts.slot) target = resolveSlotToUnit(opts.slot);

  const brief = composeBrief(target, {
    slot: opts.slot, topK: opts.topK, tribalK: opts.tribalK,
    wikiBodies: opts.wikiBodies, memBodies: opts.memBodies,
    gitN: opts.gitN, regrN: opts.regrN, maxExcerpt: opts.maxExcerpt,
  });

  let writtenTo = null;
  if (opts.write && brief.target) writtenTo = writeBrief(brief);

  if (opts.json) {
    process.stdout.write(JSON.stringify({ ...brief, writtenTo }, null, 2) + "\n");
  } else {
    process.stdout.write(renderBriefMarkdown(brief));
    if (writtenTo) process.stdout.write(`\n\n_Written to: ${writtenTo}_\n`);
  }
  return brief;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
