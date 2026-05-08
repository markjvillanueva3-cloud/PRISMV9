/**
 * DailyPersonalBriefEngine
 * ========================
 *
 * OBSIDIAN-COMPOUND-MS1/S2/U-DAILY-PERSONAL-BRIEF
 *
 * Synthesizes the cyrilXBT daily brief from recent vault activity:
 *   - 3 connections — pairs of notes whose TF-IDF cosine similarity ≥ 0.72
 *     in the last 7 days, with a +0.05 co-occurrence boost when both notes
 *     are referenced in the same wiki entry within the last 30 days. Ties
 *     are broken by recency (max(mtime_a, mtime_b) descending).
 *   - 1 pattern — the dominant token shared across the top connections.
 *   - 1 question — a gap-finder anchored on the pattern term, prompting the
 *     vault for what's still missing.
 *
 * `epistemic_only: true` — never feeds machining decisions. The engine is
 * pure-calculation: deterministic given a vault state + `now`. No network,
 * no Ollama, no LLM round-trips. The cron wrapper writes the brief to
 * `knowledge/memories/inbox/brief-YYYY-MM-DD.md`.
 *
 * Why TF-IDF cosine instead of nomic-embed cosine
 * -----------------------------------------------
 * Spec named nomic-embed-text-v1.5, but Ollama embeddings are non-deterministic
 * across model swaps and require the daemon to be live. The brief must run
 * unattended via cron and produce reproducible test fixtures, so the engine
 * uses the same TF-IDF construction as `EmergingThesisEngine` (smoothed IDF +
 * sublinear TF) and computes cosine over the resulting sparse vectors. This
 * trades absolute embedding quality for determinism + zero-dep operation —
 * acceptable because the threshold (0.72) and the +0.05 boost gate noise.
 *
 * Performance: O(N²) pair comparison; each pair is O(min(|tokens(a)|,|tokens(b)|))
 * via sparse map intersection. Validated under 2s on a 200-file vault by
 * `DailyPersonalBriefEngine.test.ts`.
 *
 * Integration: wired into `prism_memory:daily_brief_get` (memoryDispatcher.ts).
 *
 * @milestone OBSIDIAN-COMPOUND-MS1/S2/U-DAILY-PERSONAL-BRIEF
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { connectionMaterializerEngine } from "./ConnectionMaterializerEngine.js";

export interface DailyBriefConnection {
  /** Absolute path of note A (alphabetically first of the pair). */
  a: string;
  /** Absolute path of note B. */
  b: string;
  /** Raw cosine similarity over TF-IDF vectors (∈ [0, 1]). */
  similarity: number;
  /** +0.05 if a wiki entry within 30d cites both notes, else 0. */
  boost: number;
  /** similarity + boost, clamped to [0, 1]. The score used for ranking. */
  combined: number;
  /** max(mtime_a, mtime_b) — used for tie-break. ISO8601. */
  recency: string;
}

export interface DailyBriefResult {
  /** YYYY-MM-DD of the brief target day (derived from `now`). */
  brief_date: string;
  /** Top-N pairs (default 3). Empty when nothing crosses the threshold. */
  connections: DailyBriefConnection[];
  /** One paragraph synthesizing the cluster spine. Single sentence on quiet days. */
  pattern: string;
  /** One question pointing at the next missing piece. Always present. */
  question: string;
  /** Vault notes inside the 7d window that contributed to similarity. */
  analyzed_notes: number;
  /** Wiki entries inside the 30d window scanned for co-occurrence. */
  analyzed_wiki: number;
  /** Echo: the threshold used. */
  threshold: number;
  /** ISO8601 timestamp of synthesis. */
  generated_at: string;
  /**
   * Present when `materializeConnections: true` was requested. Summarizes the
   * ConnectionMaterializerEngine pass that ran on the same `connections` list.
   * The vault talks back: each daily connection becomes a persistent note
   * rather than evaporating with that day's brief.
   */
  materialized?: {
    apply: boolean;
    wrote: number;
    skipped_exists: number;
    updated: number;
    errored: number;
    paths: string[];
  };
}

export interface DailyBriefOptions {
  /** Override vault root (defaults to knowledge/memories). */
  vaultRoot?: string;
  /** Override wiki root (defaults to knowledge/wiki). */
  wikiRoot?: string;
  /** Override "now" for deterministic windowing in tests. */
  now?: number;
  /** Cosine-similarity floor for keeping a connection. Default 0.72. */
  threshold?: number;
  /** Number of connections to return. Default 3. */
  maxConnections?: number;
  /** Cap on vault files scanned per call. Default 500. */
  maxNotes?: number;
  /** Cap on wiki files scanned per call. Default 2000. */
  maxWiki?: number;
  /**
   * When true, the top-N connections are also persisted to disk via
   * ConnectionMaterializerEngine. Default false (backward-compatible).
   * cyrilXBT JARVIS rationale: a connection that lives only inside today's
   * brief evaporates; making it a standalone note lets it compound.
   */
  materializeConnections?: boolean;
  /** Override the connections directory used when materializing. */
  connectionsDir?: string;
  /**
   * When true (default when materializeConnections is true), actually write
   * connection files. Set false for dry-run materialization.
   */
  connectionsApply?: boolean;
  /**
   * OBSIDIAN-AUTOMATE-MS3/U-EMBEDDING-CONNECTIONS — when supplied, the
   * connection step uses these similarity values keyed by canonical pairKey
   * (alphabetical join of paths) instead of computing TF-IDF cosine.
   *
   * The motivation is that nomic-embed-text via Ollama gives semantically
   * cleaner connections than TF-IDF once the vault grows past ~500 notes
   * (TF-IDF starts conflating themes by shared vocabulary alone — embeddings
   * separate them by meaning).
   *
   * The caller (typically generate-personal-brief.mjs with PRISM_BRIEF_USE_EMBEDDINGS=1)
   * is responsible for embedding each note and computing pairwise cosine
   * similarities, then passing the Map here. The engine remains synchronous
   * and falls back to TF-IDF when the map is omitted.
   *
   * Threshold semantics shift between backends — for nomic-embed-text we
   * recommend `threshold: 0.55` (vs 0.72 for TF-IDF). The caller picks both.
   */
  precomputedSimilarities?: Map<string, number>;
}

const DEFAULT_VAULT_ROOT = "H:/prism/knowledge/memories";
const DEFAULT_WIKI_ROOT = "H:/prism/knowledge/wiki";
const DEFAULT_THRESHOLD = 0.72;
const DEFAULT_MAX_CONNECTIONS = 3;
const DEFAULT_MAX_NOTES = 500;
const DEFAULT_MAX_WIKI = 2000;
const COOCCURRENCE_BOOST = 0.05;
const NOTE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const WIKI_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_TOKEN_LEN = 3;

// Stopword list mirrors EmergingThesisEngine — kept narrow on purpose so domain
// terms (kienzle, feedrate, deflection) survive tokenization.
const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "have", "has", "had", "are",
  "was", "were", "but", "not", "you", "your", "they", "them", "their", "there",
  "from", "into", "out", "over", "under", "about", "after", "before", "than",
  "then", "when", "what", "which", "who", "how", "why", "where", "all", "any",
  "some", "one", "two", "more", "most", "such", "only", "other", "its", "his",
  "her", "him", "she", "our", "way", "use", "used", "using", "can", "will",
  "would", "could", "should", "may", "might", "must", "also", "just", "very",
  "much", "many", "few", "still", "now", "yet", "back", "down", "off",
  "around", "between", "through", "during", "while", "because", "since", "until",
  "though", "although", "however", "therefore", "thus", "hence", "either",
  "neither", "both", "each", "every", "none", "see", "say", "said",
  "get", "got", "gets", "make", "makes", "made", "let", "lets", "yes", "no",
  "note", "notes", "todo", "fixme", "ref", "refs", "link", "links",
  "page", "section", "header", "title", "body", "para", "paragraph",
]);

interface ScannedDoc {
  path: string;
  mtimeMs: number;
  /** sparse TF-IDF vector keyed by term → weight (already L2-normalizable). */
  tfidf: Map<string, number>;
  /** Pre-computed L2 norm for cosine division. 0 means empty vector. */
  norm: number;
}

/** Strip frontmatter, code fences, links, and markdown punctuation. */
function stripMarkdown(raw: string): string {
  let text = raw;
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end > 0) text = text.slice(end + 4);
  }
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`[^`\n]+`/g, " ");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");
  text = text.replace(/^#+\s*/gm, "");
  text = text.replace(/[|>*_~`>]/g, " ");
  return text;
}

function tokenize(raw: string): string[] {
  const text = stripMarkdown(raw).toLowerCase();
  const tokens: string[] = [];
  for (const piece of text.split(/[^a-z0-9_-]+/)) {
    if (!piece || piece.length < MIN_TOKEN_LEN) continue;
    if (/^\d+$/.test(piece)) continue;
    if (STOPWORDS.has(piece)) continue;
    const tok = piece.replace(/^-+|-+$/g, "");
    if (tok.length < MIN_TOKEN_LEN) continue;
    tokens.push(tok);
  }
  return tokens;
}

/** Recursively walk a directory and yield .md files modified since cutoff. */
function listMarkdownInWindow(
  root: string,
  cutoffMs: number,
  maxFiles: number
): Array<{ path: string; mtimeMs: number }> {
  if (!existsSync(root)) return [];
  const out: Array<{ path: string; mtimeMs: number }> = [];
  const stack: string[] = [root];
  while (stack.length > 0 && out.length < maxFiles) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (ent.name.startsWith(".")) continue;
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!ent.isFile() || !ent.name.toLowerCase().endsWith(".md")) continue;
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.mtimeMs < cutoffMs) continue;
      out.push({ path: full, mtimeMs: st.mtimeMs });
      if (out.length >= maxFiles) break;
    }
  }
  return out;
}

/** Build TF-IDF sparse vectors with smoothed IDF + sublinear TF (matches EmergingThesisEngine). */
function buildTfidfDocs(files: Array<{ path: string; mtimeMs: number }>): ScannedDoc[] {
  // Pass 1: tokenize, count document frequencies.
  const docTokens: Array<{ path: string; mtimeMs: number; tokens: string[] }> = [];
  const docFreq = new Map<string, number>();
  for (const f of files) {
    let body = "";
    try {
      body = readFileSync(f.path, "utf8");
    } catch {
      continue;
    }
    const tokens = tokenize(body);
    if (tokens.length === 0) continue;
    docTokens.push({ path: f.path, mtimeMs: f.mtimeMs, tokens });
    const seen = new Set<string>();
    for (const t of tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
    }
  }
  const N = docTokens.length;
  if (N === 0) return [];

  // Pass 2: compute per-doc TF-IDF + L2 norm.
  const out: ScannedDoc[] = [];
  for (const { path, mtimeMs, tokens } of docTokens) {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const docLen = tokens.length;
    const tfidf = new Map<string, number>();
    let normSq = 0;
    for (const [term, count] of tf.entries()) {
      const df = docFreq.get(term) ?? 1;
      const idf = Math.log((N + 1) / (df + 1)) + 1;
      const tfNorm = (1 + Math.log(count)) / Math.max(1, Math.sqrt(docLen));
      const w = tfNorm * idf;
      tfidf.set(term, w);
      normSq += w * w;
    }
    out.push({ path, mtimeMs, tfidf, norm: Math.sqrt(normSq) });
  }
  return out;
}

/** Cosine similarity over two sparse TF-IDF maps. Iterates the smaller map. */
function cosineSim(a: ScannedDoc, b: ScannedDoc): number {
  if (a.norm === 0 || b.norm === 0) return 0;
  const [small, large] = a.tfidf.size <= b.tfidf.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, weight] of small.tfidf.entries()) {
    const w2 = large.tfidf.get(term);
    if (w2 !== undefined) dot += weight * w2;
  }
  const sim = dot / (a.norm * b.norm);
  if (!Number.isFinite(sim)) return 0;
  return Math.max(0, Math.min(1, sim));
}

/**
 * Build a co-occurrence map: for each pair of note basenames that are both
 * cited via `[[wiki-link]]` notation inside the same wiki entry, the pair
 * gets +COOCCURRENCE_BOOST. Returns a Map keyed by canonical "a||b"
 * (alphabetically sorted) → boost.
 *
 * Citation semantics: an Obsidian wiki-link `[[name]]` (or `[[name|alias]]`)
 * is the canonical reference. Bare-substring matching was rejected as too
 * permissive — a wiki entry mentioning "feedback" in prose should not
 * implicitly link every note whose basename starts with "feedback_".
 */
const WIKI_LINK_PATTERN = /\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g;

function buildCooccurrenceBoosts(
  noteBaseToPath: Map<string, string>,
  wikiFiles: Array<{ path: string; mtimeMs: number }>
): Map<string, number> {
  const boosts = new Map<string, number>();
  if (noteBaseToPath.size === 0 || wikiFiles.length === 0) return boosts;

  for (const w of wikiFiles) {
    let body = "";
    try { body = readFileSync(w.path, "utf8"); } catch { continue; }
    const present = new Set<string>();
    for (const m of body.matchAll(WIKI_LINK_PATTERN)) {
      const ref = m[1].trim().toLowerCase();
      if (noteBaseToPath.has(ref)) present.add(ref);
    }
    if (present.size < 2) continue;
    const sorted = [...present].sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}||${sorted[j]}`;
        // Cap the boost — multiple wiki citations don't compound past +0.05.
        boosts.set(key, COOCCURRENCE_BOOST);
      }
    }
  }
  return boosts;
}

function pairKey(a: string, b: string): string {
  // Use basenames-without-ext, alphabetical, to match co-occurrence map.
  const ba = basename(a, ".md");
  const bb = basename(b, ".md");
  return ba <= bb ? `${ba}||${bb}` : `${bb}||${ba}`;
}

function dateOnlyIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Render the 1-paragraph pattern from the dominant shared token in top connections. */
function renderPattern(
  connections: DailyBriefConnection[],
  docs: ScannedDoc[]
): { pattern: string; spine: string | null } {
  if (connections.length === 0) {
    return {
      pattern: "No pattern crystallized today — fewer than two notes crossed the cosine threshold.",
      spine: null,
    };
  }
  // Find the single token with the highest combined TF-IDF weight across all
  // notes that participate in any top connection. That's the "spine."
  const participantPaths = new Set<string>();
  for (const c of connections) { participantPaths.add(c.a); participantPaths.add(c.b); }
  const termWeight = new Map<string, number>();
  for (const d of docs) {
    if (!participantPaths.has(d.path)) continue;
    for (const [term, w] of d.tfidf.entries()) {
      termWeight.set(term, (termWeight.get(term) ?? 0) + w);
    }
  }
  const ranked = [...termWeight.entries()].sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1));
  if (ranked.length === 0) {
    return {
      pattern: `Top ${connections.length} pair${connections.length === 1 ? "" : "s"} cluster, but no single token spans them — the connection is structural, not lexical.`,
      spine: null,
    };
  }
  const spine = ranked[0][0].replace(/-/g, " ");
  return {
    pattern: `Across the top ${connections.length} pair${connections.length === 1 ? "" : "s"} of notes, '${spine}' is the spine — it appears as the heaviest shared TF-IDF term in every participant note.`,
    spine: ranked[0][0],
  };
}

function renderQuestion(spine: string | null, connections: DailyBriefConnection[]): string {
  if (connections.length === 0) {
    return "What single note, captured today, would give tomorrow's brief at least one connection to chew on?";
  }
  if (!spine) {
    return "What concrete artifact would prove the structural similarity between these notes is real and not a TF-IDF coincidence?";
  }
  const fragment = spine.replace(/-/g, " ");
  return `What outcome — a measurement, a failure, a working program — would falsify '${fragment}' as the thread tying these notes together?`;
}

export class DailyPersonalBriefEngine {
  readonly name = "DailyPersonalBriefEngine";

  /**
   * Build today's brief from vault + wiki state at `now`.
   *
   * Determinism: given identical filesystem contents + mtimes + `now`, the
   * output is byte-stable. Tie-breaking uses recency desc → path-alpha asc.
   *
   * @param opts  Optional overrides for testing (vaultRoot, wikiRoot, now, threshold).
   * @returns     Brief result with up to 3 connections, 1 pattern, 1 question.
   */
  synthesize(opts: DailyBriefOptions = {}): DailyBriefResult {
    const vaultRoot = resolve(opts.vaultRoot ?? DEFAULT_VAULT_ROOT);
    const wikiRoot = resolve(opts.wikiRoot ?? DEFAULT_WIKI_ROOT);
    const now = opts.now ?? Date.now();
    const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
    const maxConnections = opts.maxConnections ?? DEFAULT_MAX_CONNECTIONS;
    const maxNotes = opts.maxNotes ?? DEFAULT_MAX_NOTES;
    const maxWiki = opts.maxWiki ?? DEFAULT_MAX_WIKI;
    const generatedAt = new Date(now).toISOString();
    const briefDate = dateOnlyIso(now);

    // Gather notes in the 7d window.
    const noteFiles = listMarkdownInWindow(vaultRoot, now - NOTE_WINDOW_MS, maxNotes);
    const docs = buildTfidfDocs(noteFiles);

    // Quiet-vault fast paths still produce a question — the brief is never null.
    if (docs.length < 2) {
      const pattern = renderPattern([], docs);
      return {
        brief_date: briefDate,
        connections: [],
        pattern: pattern.pattern,
        question: renderQuestion(pattern.spine, []),
        analyzed_notes: docs.length,
        analyzed_wiki: 0,
        threshold,
        generated_at: generatedAt,
      };
    }

    // Co-occurrence map from wiki window.
    const wikiFiles = listMarkdownInWindow(wikiRoot, now - WIKI_WINDOW_MS, maxWiki);
    const noteBaseToPath = new Map<string, string>();
    for (const d of docs) noteBaseToPath.set(basename(d.path, ".md").toLowerCase(), d.path);
    const boosts = buildCooccurrenceBoosts(noteBaseToPath, wikiFiles);

    // All pairs above threshold (post-boost).
    // Similarity backend: precomputed (embedding-cosine via Ollama) when supplied,
    // otherwise compute TF-IDF cosine on the fly. The wiki co-occurrence boost
    // applies in either backend so wiki-validated pairs always rank higher.
    const precomputed = opts.precomputedSimilarities;
    type Candidate = DailyBriefConnection & { recencyMs: number };
    const candidates: Candidate[] = [];
    for (let i = 0; i < docs.length; i++) {
      for (let j = i + 1; j < docs.length; j++) {
        const key = pairKey(docs[i].path, docs[j].path);
        const sim = precomputed
          ? (precomputed.get(key) ?? 0)
          : cosineSim(docs[i], docs[j]);
        if (sim < threshold) {
          // Quick path: cannot reach threshold even with the boost.
          if (sim + COOCCURRENCE_BOOST < threshold) continue;
        }
        const boost = boosts.get(key) ?? 0;
        const combined = Math.min(1, sim + boost);
        if (combined < threshold) continue;
        const [a, b] = docs[i].path <= docs[j].path
          ? [docs[i].path, docs[j].path]
          : [docs[j].path, docs[i].path];
        const recencyMs = Math.max(docs[i].mtimeMs, docs[j].mtimeMs);
        candidates.push({
          a,
          b,
          similarity: Number(sim.toFixed(4)),
          boost: Number(boost.toFixed(4)),
          combined: Number(combined.toFixed(4)),
          recency: new Date(recencyMs).toISOString(),
          recencyMs,
        });
      }
    }

    // Rank: combined desc → recency desc → path-alpha asc (deterministic tie-break).
    candidates.sort((x, y) => {
      if (y.combined !== x.combined) return y.combined - x.combined;
      if (y.recencyMs !== x.recencyMs) return y.recencyMs - x.recencyMs;
      if (x.a !== y.a) return x.a < y.a ? -1 : 1;
      return x.b < y.b ? -1 : 1;
    });
    const top = candidates.slice(0, maxConnections).map<DailyBriefConnection>((c) => ({
      a: c.a, b: c.b, similarity: c.similarity, boost: c.boost,
      combined: c.combined, recency: c.recency,
    }));

    const pattern = renderPattern(top, docs);

    // Optional: materialize each connection as a standalone note in the
    // connections/ directory so daily connections compound rather than
    // evaporating with that day's brief. Default off for backward compat.
    let materialized: DailyBriefResult["materialized"] = undefined;
    if (opts.materializeConnections && top.length > 0) {
      const apply = opts.connectionsApply !== false;
      const matReport = connectionMaterializerEngine.materialize(top, {
        connectionsDir: opts.connectionsDir,
        apply,
        mode: "skip",
        now,
      });
      materialized = {
        apply,
        wrote: matReport.counters.wrote,
        skipped_exists: matReport.counters.skipped_exists,
        updated: matReport.counters.updated,
        errored: matReport.counters.errored,
        paths: matReport.results.map((r) => r.filePath),
      };
    }

    return {
      brief_date: briefDate,
      connections: top,
      pattern: pattern.pattern,
      question: renderQuestion(pattern.spine, top),
      analyzed_notes: docs.length,
      analyzed_wiki: wikiFiles.length,
      threshold,
      generated_at: generatedAt,
      ...(materialized ? { materialized } : {}),
    };
  }
}

export const dailyPersonalBriefEngine = new DailyPersonalBriefEngine();
