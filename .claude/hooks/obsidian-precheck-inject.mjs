#!/usr/bin/env node
// tier: T4
/**
 * obsidian-precheck-inject.mjs — UserPromptSubmit hook
 *
 * BACKEND-DEV-LOOP / U-OBSIDIAN-PRECHECK (slot delta, 2026-05-18).
 *
 * Sibling to wiki-precheck-inject.mjs: scans the 644+ Obsidian memory files
 * under knowledge/memories/{feedback,reference,project,user}/ on every
 * UserPromptSubmit. Returns BM25-lite top-K hits as additionalContext so
 * the operator sees relevant CROSS-SESSION tribal knowledge before the
 * model answers — not just the architecture wiki (which the wiki hook
 * already covers) and not just the master index (covered separately).
 *
 * Why a SEPARATE hook (not a wiki-precheck extension):
 *   1. Memory files have different frontmatter (name + description) — a
 *      different parser than the wiki's index.md format.
 *   2. The wiki hook is 523 lines with its own BM25 pipeline; adding 644
 *      more entries risks dilution + tests already pin its surface.
 *   3. Independent kill-switch (`PRISM_OBSIDIAN_PRECHECK=0`) is operator-
 *      useful — wiki and memory recall have different value-noise profiles.
 *
 * Pipeline:
 *   1. Read all knowledge/memories/<type>/*.md files (cached, mtime-keyed)
 *   2. Parse each file's YAML frontmatter for `name`, `description`, `type`
 *   3. Tokenize prompt + every memory entry; BM25-lite score
 *   4. Top-K hits with score ≥ MIN_SCORE → emit as additionalContext
 *
 * Knobs:
 *   PRISM_OBSIDIAN_PRECHECK=0          → kill switch
 *   PRISM_OBSIDIAN_PRECHECK_K=N        → top-K (default 3, cap 6)
 *   PRISM_OBSIDIAN_PRECHECK_MIN_SCORE=N  → cutoff (default 0.6)
 *   PRISM_OBSIDIAN_PRECHECK_CACHE_DIR=<path>  → cache override (tests)
 *
 * Fail-safe: every error path returns `{continue: true}`.
 * Never blocks. Tier-4, max budget 800ms.
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
// 2026-05-26 (U-D6-OBSIDIAN-COUNTER-WIRE, slot:alpha): S6 shared counter for
// FEATURE-UTILIZATION dashboard. Obsidian was 0-fire pre-wire.
import { incrementFeature } from "../helpers/feature-counter.mjs";

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(SELF), "..", "..");

const MEMORIES_DIR =
  process.env.PRISM_OBSIDIAN_PRECHECK_DIR ||
  join(REPO_ROOT, "knowledge", "memories");
const CACHE_DIR =
  process.env.PRISM_OBSIDIAN_PRECHECK_CACHE_DIR ||
  join(tmpdir(), "prism-obsidian-precheck");
const CACHE_FILE = join(CACHE_DIR, "memory-corpus.json");

const DEFAULT_TOP_K = 3;
const MAX_TOP_K = 6;
const DEFAULT_MIN_SCORE = 0.6;
const MIN_TOKEN_LEN = 3;
const MIN_PROMPT_TOKENS = 1;
const MAX_PROMPT_TOKENS = 32; // cap on tokens we actually score against
const MAX_INJECT_BYTES = 4096;
const DESC_PREVIEW_LEN = 120;
const SKIP_BASENAMES = new Set(["MEMORY.md", "MEMORY-ARCHIVE.md"]);

const STOPWORDS = new Set([
  "the", "and", "for", "are", "was", "you", "your", "with", "this", "that",
  "from", "have", "has", "but", "not", "any", "all", "can", "use", "how",
  "what", "when", "where", "why", "who", "which", "into", "out", "its",
  "our", "their", "his", "her", "had", "will", "would", "could", "should",
  "been", "being", "than", "then", "them", "they", "some", "such", "more",
  "most", "very", "only", "also", "just", "like", "now", "see", "get",
  "got", "did", "do", "does", "done", "made", "make", "way", "well", "yes",
  "no",
]);

/** Read stdin JSON. Fail-soft. */
export function readStdinJson(readImpl = () => readFileSync(0, "utf-8")) {
  try {
    if (process.stdin && process.stdin.isTTY) return null;
    const raw = readImpl();
    if (!raw || !raw.trim().startsWith("{")) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Tokenize a string into lowercase alphanumeric tokens of length ≥ MIN_TOKEN_LEN. Pure. */
export function tokenize(s) {
  if (!s || typeof s !== "string") return [];
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= MIN_TOKEN_LEN && !STOPWORDS.has(t));
}

/**
 * Parse YAML frontmatter from a markdown file's content. Extracts `name`,
 * `description`, `type`. Returns {name, description, type} or null on a
 * file with no frontmatter. Pure. Tolerant — silently ignores unrelated
 * frontmatter fields. Does NOT execute any code.
 */
export function parseMemoryFrontmatter(content) {
  if (!content || typeof content !== "string") return null;
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("\n---", 3);
  if (end < 0) return null;
  const fm = content.slice(3, end);
  const out = { name: null, description: null, type: null };
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^(name|description|type)\s*:\s*(.*)$/i);
    if (!m) continue;
    let v = m[2].trim();
    // Strip surrounding quotes if present.
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1].toLowerCase()] = v;
  }
  if (!out.name && !out.description) return null;
  return out;
}

/**
 * Walk the memories tree and load each .md file's frontmatter. Returns
 * `{entries:[{relPath, basename, name, description, type, tokens}]}`.
 * `tokens` is the union of name+description+basename tokens for BM25.
 * Pure-shell — dep-injected readers for testing.
 */
export function loadMemoryCorpus({
  root = MEMORIES_DIR,
  readdirImpl = (p) => readdirSync(p, { withFileTypes: true }),
  statImpl = (p) => statSync(p),
  readImpl = (p) => readFileSync(p, "utf-8"),
  existsImpl = existsSync,
} = {}) {
  if (!existsImpl(root)) return { entries: [], reason: "memories-dir-missing" };
  const entries = [];
  const walk = (absDir, depth) => {
    if (depth > 4) return;
    let dirents;
    try { dirents = readdirImpl(absDir); } catch { return; }
    for (const d of dirents) {
      if (!d || typeof d.name !== "string") continue;
      const abs = join(absDir, d.name);
      if (d.isDirectory && d.isDirectory()) {
        walk(abs, depth + 1);
        continue;
      }
      if (!(d.isFile && d.isFile())) continue;
      if (!d.name.endsWith(".md")) continue;
      if (d.name.startsWith("_")) continue;
      if (SKIP_BASENAMES.has(d.name)) continue;
      let content;
      try { content = readImpl(abs); } catch { continue; }
      const fm = parseMemoryFrontmatter(content);
      if (!fm) continue;
      const stem = d.name.replace(/\.md$/i, "").replace(/_/g, " ");
      const tokens = new Set([
        ...tokenize(fm.name || ""),
        ...tokenize(fm.description || ""),
        ...tokenize(stem),
      ]);
      const relPath = abs.split(/[\\/]+/).join("/").replace(root.split(/[\\/]+/).join("/"), "knowledge/memories");
      entries.push({
        relPath,
        basename: d.name,
        name: fm.name,
        description: fm.description,
        type: fm.type,
        tokens: Array.from(tokens),
      });
    }
  };
  walk(root, 0);
  return { entries };
}

/**
 * Score a memory entry against prompt tokens using BM25-lite.
 * Each prompt token that appears in the entry's token set earns 1 point.
 * Multi-token hits with higher coverage rank higher.
 * Returns {score, matches}.
 */
export function scoreMemory(promptTokens, entry) {
  if (!Array.isArray(promptTokens) || promptTokens.length === 0) return { score: 0, matches: 0 };
  if (!entry || !Array.isArray(entry.tokens)) return { score: 0, matches: 0 };
  const tokSet = new Set(entry.tokens);
  let matches = 0;
  for (const t of promptTokens) if (tokSet.has(t)) matches++;
  if (matches === 0) return { score: 0, matches: 0 };
  // Reward density (matches / promptTokens) AND coverage (matches itself)
  const density = matches / promptTokens.length;
  const score = matches + density;
  return { score, matches };
}

/**
 * Rank memory entries by score, return top-K with score ≥ minScore.
 * Pure.
 */
export function rankMemories(promptTokens, entries, opts = {}) {
  const k = Math.max(1, Math.min(opts.topK || DEFAULT_TOP_K, MAX_TOP_K));
  const minScore = typeof opts.minScore === "number" ? opts.minScore : DEFAULT_MIN_SCORE;
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const scored = [];
  for (const e of entries) {
    const { score, matches } = scoreMemory(promptTokens, e);
    if (score >= minScore) scored.push({ entry: e, score, matches });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/** Cache load: returns the parsed corpus, or rebuilds if stale. */
function getCachedCorpus() {
  let dirMtime = 0;
  try { dirMtime = statSync(MEMORIES_DIR).mtimeMs; } catch { return loadMemoryCorpus(); }
  try {
    const raw = readFileSync(CACHE_FILE, "utf-8");
    const cached = JSON.parse(raw);
    if (cached.dirMtime === dirMtime && Array.isArray(cached.entries)) {
      return { entries: cached.entries };
    }
  } catch { /* fall through to rebuild */ }
  const corpus = loadMemoryCorpus();
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify({ dirMtime, entries: corpus.entries }), "utf-8");
  } catch { /* cache-write failure is non-fatal */ }
  return corpus;
}

/** Render the top hits as additionalContext markdown. */
export function renderInject(hits, opts = {}) {
  const maxBytes = opts.maxBytes || MAX_INJECT_BYTES;
  if (!hits || hits.length === 0) return "";
  const lines = ["## 🧠 Obsidian memory precheck — relevant cross-session knowledge"];
  for (const h of hits) {
    const e = h.entry;
    const name = e.name || e.basename;
    const desc = (e.description || "").slice(0, DESC_PREVIEW_LEN);
    const type = e.type ? `_(${e.type})_` : "";
    lines.push(`- **${name}** ${type} — ${desc}${desc.length === DESC_PREVIEW_LEN ? "…" : ""}`);
    lines.push(`  Path: \`${e.relPath}\`  ·  matches: ${h.matches}  ·  score: ${h.score.toFixed(2)}`);
  }
  lines.push("_Read the full memory file when context warrants — these are cross-session tribal facts (feedback rules, reference snapshots) the model wouldn't know from the codebase alone._");
  const body = lines.join("\n");
  return body.length > maxBytes ? body.slice(0, maxBytes - 12) + " … [TRUNC]" : body;
}

/** Main hook entry. Returns the object to print. */
export async function runHook(opts = {}) {
  if (process.env.PRISM_OBSIDIAN_PRECHECK === "0") return { continue: true };
  const stdin = (opts.stdinImpl || readStdinJson)();
  const prompt = String(stdin?.prompt || "");
  if (!prompt) return { continue: true };
  const allTokens = tokenize(prompt);
  if (allTokens.length < MIN_PROMPT_TOKENS) return { continue: true };
  const promptTokens = allTokens.slice(0, MAX_PROMPT_TOKENS);
  const corpus = (opts.loadImpl || getCachedCorpus)();
  if (!corpus || !corpus.entries || corpus.entries.length === 0) return { continue: true };
  const topK = Number.parseInt(process.env.PRISM_OBSIDIAN_PRECHECK_K || "", 10) || DEFAULT_TOP_K;
  const minScore = Number.parseFloat(process.env.PRISM_OBSIDIAN_PRECHECK_MIN_SCORE || "") || DEFAULT_MIN_SCORE;
  const hits = rankMemories(promptTokens, corpus.entries, { topK, minScore });
  if (hits.length === 0) return { continue: true };
  // U-D6: feature engaged — Obsidian memory precheck returned hits.
  try { incrementFeature("Obsidian", { slot: null }); } catch { /* never blocks */ }
  const body = renderInject(hits);
  if (!body) return { continue: true };
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: body,
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runHook().then((o) => process.stdout.write(JSON.stringify(o)));
}
