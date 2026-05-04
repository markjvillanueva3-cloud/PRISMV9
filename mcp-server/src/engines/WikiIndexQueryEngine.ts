/**
 * WikiIndexQueryEngine — TF-IDF query backstop over knowledge/wiki/index.md
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P9-? wiki bridge (P4-U04)
 *
 * Provides fast token-based search across the 722-entry Karpathy LLM-Wiki index
 * without round-tripping through an embedder service. Used by:
 *
 *   - prism_memory:semantic_search with kind="wiki" (no Qdrant required)
 *   - .claude/hooks/wiki-intent-router.mjs (UserPromptSubmit injection)
 *   - scripts/embed-wiki-index.mjs (pre-builds the cached index file)
 *
 * Why TF-IDF (and not embeddings):
 *   1. Wiki entries are short, structured 1-line records — TF-IDF is excellent for them.
 *   2. No model load, no GPU, no Qdrant — sub-millisecond cold start once cached.
 *   3. Query result is deterministic and explainable (term-overlap rationale).
 *   4. Token saving on a wiki lookup vs reading raw wiki files: ~600+ tok/query.
 *
 * Entry format in index.md (each line under a `## category` heading):
 *   - [[Slug]] — Title — Description | category:X | sources:N | confidence:0.X
 *     | last_verified:YYYY-MM-DD | source:path/to/file
 *
 * Persistence:
 *   data/state/wiki-query-index.json (cached TF-IDF index, built by embed script)
 *
 * Empty corpus / missing index.md → query returns empty results (never throws).
 */
import * as fs from "node:fs";
import * as path from "node:path";

// ──────────────────────────────────────────────────────────────────────────
// Paths — resolved at module load
// ──────────────────────────────────────────────────────────────────────────

function resolveRepoRoot(): string {
  // engines/WikiIndexQueryEngine.ts → ../.. takes us to mcp-server/, then ../ to repo root.
  return path.resolve(import.meta.dirname, "../../..");
}

const REPO_ROOT = resolveRepoRoot();
const WIKI_INDEX_MD = path.join(REPO_ROOT, "knowledge", "wiki", "index.md");
const CACHE_PATH = path.join(REPO_ROOT, "mcp-server", "data", "state", "wiki-query-index.json");

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export interface WikiEntry {
  slug: string;
  title: string;
  description: string;
  category: string;
  sources: number;
  confidence: number;
  last_verified?: string;
  source_path?: string;
  /** Raw line from index.md — useful for surfacing the same record back. */
  raw_line: string;
}

export interface WikiQueryResult {
  entry: WikiEntry;
  score: number;
  /** Tokens that hit between the query and the entry. */
  matched_tokens: string[];
}

export interface WikiIndexCache {
  schemaVersion: "1.0.0";
  built_at: string;
  total_entries: number;
  /** Vocabulary token → IDF (log document frequency). */
  vocabulary: Record<string, number>;
  /** Per-entry TF map keyed by entry index in `entries`. Sparse: only nonzero terms. */
  tf_vectors: Array<Record<string, number>>;
  /** L2-normalized magnitude of each entry vector for cosine similarity. */
  norms: number[];
  entries: WikiEntry[];
}

// ──────────────────────────────────────────────────────────────────────────
// Tokenizer — simple, deterministic, domain-tuned
// ──────────────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
  "have", "in", "is", "it", "of", "on", "or", "that", "the", "to", "was",
  "with", "this", "these", "those",
]);

export function tokenize(input: string): string[] {
  // Lowercase, split on non-alphanumeric, drop length-1 tokens and stopwords.
  // CamelCase is split too: "QualityScoreEngine" → ["quality","score","engine"]
  const decamel = input.replace(/([a-z])([A-Z])/g, "$1 $2");
  return decamel
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// ──────────────────────────────────────────────────────────────────────────
// Parser — converts index.md lines into WikiEntry[]
// ──────────────────────────────────────────────────────────────────────────

const ENTRY_LINE_RE = /^\s*-\s+\[\[([^\]]+)\]\]\s+—\s+(.+)$/u;
const PIPE_FIELD_RE = /\b([a-z_]+):\s*([^|]+?)(?=\s*\||\s*$)/giu;

export function parseEntryLine(line: string, defaultCategory: string): WikiEntry | null {
  const m = line.match(ENTRY_LINE_RE);
  if (!m) return null;
  const slug = m[1].trim();
  const after = m[2];

  // The "after" portion is "Title — Description | k:v | k:v ..."  OR  "Title | k:v | ..."
  // (some entries omit the description em-dash).
  const pipeIdx = after.indexOf("|");
  const headPart = pipeIdx >= 0 ? after.slice(0, pipeIdx) : after;
  const tailPart = pipeIdx >= 0 ? after.slice(pipeIdx + 1) : "";

  const headSegments = headPart.split(/\s+—\s+/u).map((s) => s.trim()).filter((s) => s.length > 0);
  const title = headSegments[0] ?? slug;
  const description = headSegments.slice(1).join(" — ");

  const fields: Record<string, string> = {};
  if (tailPart.length > 0) {
    let fm: RegExpExecArray | null;
    PIPE_FIELD_RE.lastIndex = 0;
    while ((fm = PIPE_FIELD_RE.exec(tailPart)) !== null) {
      fields[fm[1]] = fm[2].trim();
    }
  }

  const sources = Number.parseInt(fields.sources ?? "0", 10);
  const confidence = Number.parseFloat(fields.confidence ?? "0");

  return {
    slug,
    title,
    description,
    category: fields.category ?? defaultCategory,
    sources: Number.isFinite(sources) ? sources : 0,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    last_verified: fields.last_verified,
    source_path: fields.source,
    raw_line: line.trim(),
  };
}

export function parseIndexMarkdown(md: string): WikiEntry[] {
  const entries: WikiEntry[] = [];
  let currentCategory = "uncategorized";
  for (const line of md.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)\s*$/u);
    if (heading) {
      currentCategory = heading[1].trim().toLowerCase();
      continue;
    }
    const e = parseEntryLine(line, currentCategory);
    if (e) entries.push(e);
  }
  return entries;
}

// ──────────────────────────────────────────────────────────────────────────
// Index builder — TF-IDF with L2-normalized vectors for cosine similarity
// ──────────────────────────────────────────────────────────────────────────

function entryText(e: WikiEntry): string {
  // Score against slug + title + description + category — the searchable surface.
  return `${e.slug} ${e.title} ${e.description} ${e.category}`;
}

export function buildIndex(entries: WikiEntry[]): WikiIndexCache {
  const docCount = entries.length;
  // Document frequency
  const df: Record<string, number> = Object.create(null);
  // Per-entry term frequency (raw counts before normalization)
  const tfRaw: Array<Record<string, number>> = entries.map(() => Object.create(null));

  entries.forEach((e, i) => {
    const seen = new Set<string>();
    for (const tok of tokenize(entryText(e))) {
      tfRaw[i][tok] = (tfRaw[i][tok] ?? 0) + 1;
      if (!seen.has(tok)) {
        df[tok] = (df[tok] ?? 0) + 1;
        seen.add(tok);
      }
    }
  });

  const vocabulary: Record<string, number> = Object.create(null);
  for (const [tok, count] of Object.entries(df)) {
    // Smoothed IDF: log((N + 1) / (df + 1)) + 1 — never zero, never negative.
    vocabulary[tok] = Math.log((docCount + 1) / (count + 1)) + 1;
  }

  // Compute TF-IDF weights, then normalize each entry vector to unit length.
  const tf_vectors: Array<Record<string, number>> = [];
  const norms: number[] = [];
  for (let i = 0; i < entries.length; i++) {
    const weighted: Record<string, number> = Object.create(null);
    let sumSq = 0;
    for (const [tok, count] of Object.entries(tfRaw[i])) {
      const w = count * (vocabulary[tok] ?? 0);
      weighted[tok] = w;
      sumSq += w * w;
    }
    const norm = Math.sqrt(sumSq);
    tf_vectors.push(weighted);
    norms.push(norm);
  }

  return {
    schemaVersion: "1.0.0",
    built_at: new Date().toISOString(),
    total_entries: docCount,
    vocabulary,
    tf_vectors,
    norms,
    entries,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Cosine similarity between a query and indexed entries
// ──────────────────────────────────────────────────────────────────────────

function queryVector(query: string, vocabulary: Record<string, number>): { vec: Record<string, number>; norm: number; tokens: string[] } {
  const tokens = tokenize(query);
  const vec: Record<string, number> = Object.create(null);
  for (const tok of tokens) {
    const idf = vocabulary[tok];
    if (idf === undefined) continue;
    vec[tok] = (vec[tok] ?? 0) + idf;
  }
  let sumSq = 0;
  for (const w of Object.values(vec)) sumSq += w * w;
  return { vec, norm: Math.sqrt(sumSq), tokens };
}

function scoreEntry(qVec: Record<string, number>, qNorm: number, eVec: Record<string, number>, eNorm: number): { score: number; matched: string[] } {
  if (qNorm === 0 || eNorm === 0) return { score: 0, matched: [] };
  let dot = 0;
  const matched: string[] = [];
  // Iterate the smaller vector for speed.
  const [a, b] = Object.keys(qVec).length <= Object.keys(eVec).length
    ? [qVec, eVec]
    : [eVec, qVec];
  for (const [tok, wa] of Object.entries(a)) {
    const wb = b[tok];
    if (wb === undefined) continue;
    dot += wa * wb;
    matched.push(tok);
  }
  return { score: dot / (qNorm * eNorm), matched };
}

// ──────────────────────────────────────────────────────────────────────────
// Engine
// ──────────────────────────────────────────────────────────────────────────

export class WikiIndexQueryEngine {
  private cache: WikiIndexCache | null = null;

  /**
   * Load the cached index from disk if available; otherwise rebuild from
   * knowledge/wiki/index.md. Returns null if both sources are unavailable
   * (so callers can degrade gracefully — never throws).
   */
  loadOrBuild(): WikiIndexCache | null {
    if (this.cache) return this.cache;

    // Prefer cache file (faster cold-start when populated by the embed script).
    if (fs.existsSync(CACHE_PATH)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8")) as WikiIndexCache;
        if (parsed.schemaVersion === "1.0.0" && Array.isArray(parsed.entries)) {
          this.cache = parsed;
          return parsed;
        }
      } catch { /* fall through to rebuild */ }
    }

    // Rebuild from index.md.
    if (!fs.existsSync(WIKI_INDEX_MD)) return null;
    try {
      const md = fs.readFileSync(WIKI_INDEX_MD, "utf-8");
      const entries = parseIndexMarkdown(md);
      if (entries.length === 0) return null;
      const built = buildIndex(entries);
      this.cache = built;
      return built;
    } catch {
      return null;
    }
  }

  /**
   * Query the wiki. Returns top-k by cosine similarity. Results below
   * `minScore` are dropped. An empty query → empty results.
   */
  query(text: string, opts: { limit?: number; minScore?: number } = {}): WikiQueryResult[] {
    const limit = Math.max(1, Math.min(100, opts.limit ?? 5));
    const minScore = Math.max(0, opts.minScore ?? 0);

    const cache = this.loadOrBuild();
    if (!cache || cache.entries.length === 0) return [];

    const trimmed = (text ?? "").trim();
    if (trimmed.length === 0) return [];

    const { vec: qVec, norm: qNorm } = queryVector(trimmed, cache.vocabulary);
    if (qNorm === 0) return []; // No vocab overlap

    const scored: WikiQueryResult[] = [];
    for (let i = 0; i < cache.entries.length; i++) {
      const { score, matched } = scoreEntry(qVec, qNorm, cache.tf_vectors[i], cache.norms[i]);
      if (score < minScore) continue;
      scored.push({ entry: cache.entries[i], score, matched_tokens: matched });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /** Build the cache file from the current wiki/index.md. Used by the embed script. */
  buildAndPersist(): { ok: boolean; total_entries: number; cache_path: string; error?: string } {
    if (!fs.existsSync(WIKI_INDEX_MD)) {
      return { ok: false, total_entries: 0, cache_path: CACHE_PATH, error: `wiki index not found at ${WIKI_INDEX_MD}` };
    }
    const md = fs.readFileSync(WIKI_INDEX_MD, "utf-8");
    const entries = parseIndexMarkdown(md);
    const cache = buildIndex(entries);
    try {
      fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
      this.cache = cache;
      return { ok: true, total_entries: entries.length, cache_path: CACHE_PATH };
    } catch (e) {
      return { ok: false, total_entries: entries.length, cache_path: CACHE_PATH, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** Stats — used by the audit dispatcher action. */
  stats(): { total_entries: number; vocabulary_size: number; categories: Array<{ name: string; count: number }>; built_at: string | null; cache_present: boolean } {
    const cache = this.loadOrBuild();
    if (!cache) {
      return { total_entries: 0, vocabulary_size: 0, categories: [], built_at: null, cache_present: fs.existsSync(CACHE_PATH) };
    }
    const catCounts = new Map<string, number>();
    for (const e of cache.entries) {
      catCounts.set(e.category, (catCounts.get(e.category) ?? 0) + 1);
    }
    const categories = Array.from(catCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return {
      total_entries: cache.total_entries,
      vocabulary_size: Object.keys(cache.vocabulary).length,
      categories,
      built_at: cache.built_at,
      cache_present: fs.existsSync(CACHE_PATH),
    };
  }

  /** Reset the in-memory cache so the next call rebuilds from disk. Used by tests. */
  resetCache(): void {
    this.cache = null;
  }
}

// Singleton export
export const wikiIndexQueryEngine = new WikiIndexQueryEngine();

// Path exports for tooling/tests
export const PATHS = {
  WIKI_INDEX_MD,
  CACHE_PATH,
  REPO_ROOT,
};
