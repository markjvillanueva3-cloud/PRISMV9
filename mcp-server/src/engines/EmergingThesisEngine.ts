/**
 * EmergingThesisEngine
 * ====================
 *
 * OBSIDIAN-COMPOUND-MS1/S2/U-EMERGING-THESIS
 *
 * Surfaces the implicit thesis emerging from recent vault activity. Reads
 * markdown bodies under `knowledge/memories/`, runs TF-IDF over the windowed
 * corpus, and returns the dominant concept plus a confidence score that
 * collapses when the vault contradicts itself or has too little signal.
 *
 * cyrilXBT framing: "the vault is never too empty to find something worth
 * thinking about" — so an empty vault still produces a brief that names the
 * smallest path forward instead of returning null. See
 * [[reference_cyrilxbt_obsidian_article_delta_2026-05-07]].
 *
 * Confidence model
 * ----------------
 *   agreement    = (# docs containing top concept) / (# analyzed docs)  ∈ [0, 1]
 *   topScore     = TF-IDF sum of top concept across analyzed corpus
 *   signal       = clamp(topScore / SIGNAL_FLOOR, 0, 1)
 *   confidence   = agreement × signal
 *
 * Agreement (not dominance over the term vocabulary) is the right axis here
 * because related concepts split a single theme across multiple tokens
 * ("thin-wall", "thin", "wall", "milling") — a corpus where every doc agrees
 * on the theme should not be penalized for that token-level fragmentation.
 * Contradictory vaults still collapse: when each doc carries a different
 * concept, the top term appears in only 1 of N docs, so agreement → 1/N.
 *
 * Performance: O(D × tokens) — single pass over markdown bodies. Validated at
 * <2s on 1000-file vault by EmergingThesisEngine.test.ts.
 *
 * Integration: wired into prism_memory:emerging_thesis (memoryDispatcher.ts).
 *
 * @milestone OBSIDIAN-COMPOUND-MS1/S2/U-EMERGING-THESIS
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

export type ThesisWindow = "24h" | "7d" | "30d";

export interface EmergingThesisResult {
  /** One-sentence thesis naming the dominant concept (or empty-vault path). */
  thesis: string;
  /** Up to 8 markdown paths that contributed most to the thesis. */
  supporting_files: string[];
  /** [0, 1] — drops on contradiction, low signal, or empty vault. */
  confidence: number;
  /** Echoed input window. */
  window: ThesisWindow;
  /** Number of vault files inside the window that were analyzed. */
  analyzed_files: number;
  /** Top concepts by TF-IDF for caller inspection. */
  top_concepts: Array<{ term: string; score: number }>;
  /** ISO8601 timestamp the synthesis was performed. */
  generated_at: string;
}

export interface SynthesizeOptions {
  /** Override vault root (test injection). */
  vaultRoot?: string;
  /** Override "now" for deterministic windowing in tests. */
  now?: number;
  /** Cap on files scanned (defense against runaway vaults). */
  maxFiles?: number;
}

const DEFAULT_VAULT_ROOT = "H:/prism/knowledge/memories";
const DEFAULT_MAX_FILES = 5000;
const SIGNAL_FLOOR = 4; // TF-IDF sum below this is treated as "weak signal"
const TOP_CONCEPTS = 5;
const SUPPORTING_FILES = 8;
const MIN_TOKEN_LEN = 3;

const WINDOW_MS: Record<ThesisWindow, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

// Stopwords: common English + markdown/journal filler. Kept narrow on purpose
// so domain terms (e.g. "kienzle", "feedrate") survive.
const STOPWORDS = new Set([
  "the", "and", "for", "with", "this", "that", "have", "has", "had", "are",
  "was", "were", "but", "not", "you", "your", "they", "them", "their", "there",
  "from", "into", "out", "over", "under", "about", "after", "before", "than",
  "then", "when", "what", "which", "who", "how", "why", "where", "all", "any",
  "some", "one", "two", "more", "most", "such", "only", "other", "its", "his",
  "her", "him", "she", "our", "way", "use", "used", "using", "can", "will",
  "would", "could", "should", "may", "might", "must", "also", "just", "very",
  "much", "many", "few", "still", "now", "yet", "back", "down", "off", "out",
  "around", "between", "through", "during", "while", "because", "since", "until",
  "though", "although", "however", "therefore", "thus", "hence", "either",
  "neither", "both", "each", "every", "any", "none", "see", "say", "said",
  "get", "got", "gets", "make", "makes", "made", "let", "lets", "yes", "no",
  // Markdown/structural filler
  "note", "notes", "todo", "fixme", "ref", "refs", "link", "links", "see",
  "page", "section", "header", "title", "body", "para", "paragraph",
]);

/** Strip frontmatter, code fences, links, and markdown punctuation. */
function stripMarkdown(raw: string): string {
  let text = raw;
  // Frontmatter `---\n...\n---` at top
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end > 0) text = text.slice(end + 4);
  }
  // Fenced code blocks ```...```
  text = text.replace(/```[\s\S]*?```/g, " ");
  // Inline code `…`
  text = text.replace(/`[^`\n]+`/g, " ");
  // Markdown links [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Wiki links [[name]] → name
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");
  // Heading hashes
  text = text.replace(/^#+\s*/gm, "");
  // Tables/pipes/bullets/blockquotes
  text = text.replace(/[|>*_~`>]/g, " ");
  return text;
}

/** Tokenize markdown body into lowercase concept tokens. */
function tokenize(raw: string): string[] {
  const text = stripMarkdown(raw).toLowerCase();
  const tokens: string[] = [];
  // Split on any non-alphanum/-/_ run; keep hyphenated terms (e.g. "thin-wall").
  for (const piece of text.split(/[^a-z0-9_-]+/)) {
    if (!piece || piece.length < MIN_TOKEN_LEN) continue;
    if (/^\d+$/.test(piece)) continue; // pure numerics
    if (STOPWORDS.has(piece)) continue;
    // Strip leading/trailing hyphens that survived the regex
    const tok = piece.replace(/^-+|-+$/g, "");
    if (tok.length < MIN_TOKEN_LEN) continue;
    tokens.push(tok);
  }
  return tokens;
}

/** Recursively walk a vault directory and yield .md files modified in window. */
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

/** Render a thesis sentence around the dominant concept and corpus size. */
function renderThesis(
  topConcept: string | null,
  topScore: number,
  analyzedFiles: number,
  contributingFiles: number,
  window: ThesisWindow
): string {
  if (analyzedFiles === 0) {
    return `Vault is empty for the ${window} window — the smallest next step is to drop one note into knowledge/memories/inbox/.`;
  }
  if (!topConcept || topScore < 0.5) {
    return `Vault has ${analyzedFiles} note${analyzedFiles === 1 ? "" : "s"} in ${window} but no dominant concept yet — keep capturing; a thesis usually emerges around 5–10 related notes.`;
  }
  const fragment = topConcept.replace(/-/g, " ");
  return `Across ${analyzedFiles} note${analyzedFiles === 1 ? "" : "s"} in the last ${window}, the emerging thesis centers on '${fragment}' (${contributingFiles} note${contributingFiles === 1 ? "" : "s"} touch it).`;
}

export class EmergingThesisEngine {
  readonly name = "EmergingThesisEngine";

  /**
   * Synthesize the dominant thesis emerging from vault activity in the window.
   *
   * @param window  Time window — '24h' | '7d' | '30d'
   * @param opts    Optional overrides for testing (vaultRoot, now, maxFiles)
   * @returns       Deterministic synthesis result for the given vault state.
   */
  synthesize(window: ThesisWindow, opts: SynthesizeOptions = {}): EmergingThesisResult {
    const vaultRoot = resolve(opts.vaultRoot ?? DEFAULT_VAULT_ROOT);
    const now = opts.now ?? Date.now();
    const maxFiles = opts.maxFiles ?? DEFAULT_MAX_FILES;
    const cutoffMs = now - WINDOW_MS[window];
    const generatedAt = new Date(now).toISOString();

    const files = listMarkdownInWindow(vaultRoot, cutoffMs, maxFiles);

    // Empty / single-file fast paths preserve determinism and exit_criteria.
    if (files.length === 0) {
      return {
        thesis: renderThesis(null, 0, 0, 0, window),
        supporting_files: [],
        confidence: 0,
        window,
        analyzed_files: 0,
        top_concepts: [],
        generated_at: generatedAt,
      };
    }

    // Pass 1: tokenize each doc, count document frequencies.
    const docTokens: string[][] = [];
    const docPaths: string[] = [];
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
      docTokens.push(tokens);
      docPaths.push(f.path);
      const seen = new Set<string>();
      for (const t of tokens) {
        if (seen.has(t)) continue;
        seen.add(t);
        docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
      }
    }

    const N = docTokens.length;
    if (N === 0) {
      return {
        thesis: renderThesis(null, 0, 0, 0, window),
        supporting_files: [],
        confidence: 0,
        window,
        analyzed_files: 0,
        top_concepts: [],
        generated_at: generatedAt,
      };
    }

    // Pass 2: compute term TF-IDF totals across corpus + per-doc top-term map.
    const termScore = new Map<string, number>();
    const termDocs = new Map<string, Set<number>>();
    for (let d = 0; d < N; d++) {
      const tokens = docTokens[d];
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      const docLen = tokens.length;
      for (const [term, count] of tf.entries()) {
        const df = docFreq.get(term) ?? 1;
        // Smoothed IDF + sublinear TF — same shape as CAMTribalRAGEngine.
        const idf = Math.log((N + 1) / (df + 1)) + 1;
        const tfNorm = (1 + Math.log(count)) / Math.max(1, Math.sqrt(docLen));
        const w = tfNorm * idf;
        termScore.set(term, (termScore.get(term) ?? 0) + w);
        let bucket = termDocs.get(term);
        if (!bucket) {
          bucket = new Set<number>();
          termDocs.set(term, bucket);
        }
        bucket.add(d);
      }
    }

    // Rank concepts. Tie-break alphabetically for determinism.
    const ranked = [...termScore.entries()]
      .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))
      .slice(0, TOP_CONCEPTS)
      .map(([term, score]) => ({ term, score }));

    if (ranked.length === 0) {
      return {
        thesis: renderThesis(null, 0, N, 0, window),
        supporting_files: docPaths.slice(0, SUPPORTING_FILES),
        confidence: 0,
        window,
        analyzed_files: N,
        top_concepts: [],
        generated_at: generatedAt,
      };
    }

    const topScore = ranked[0].score;
    const topTerm = ranked[0].term;
    const contribDocs = termDocs.get(topTerm) ?? new Set<number>();
    // Agreement = fraction of analyzed docs that contain the top concept.
    // Robust to token-level fragmentation across related themes.
    const agreement = N > 0 ? contribDocs.size / N : 0;
    const signal = Math.min(1, topScore / SIGNAL_FLOOR);
    const confidence = Math.max(0, Math.min(1, agreement * signal));
    const supporting = [...contribDocs]
      .sort((a, b) => a - b)
      .slice(0, SUPPORTING_FILES)
      .map((idx) => docPaths[idx]);

    return {
      thesis: renderThesis(topTerm, topScore, N, contribDocs.size, window),
      supporting_files: supporting,
      confidence: Number(confidence.toFixed(4)),
      window,
      analyzed_files: N,
      top_concepts: ranked.map((r) => ({ term: r.term, score: Number(r.score.toFixed(4)) })),
      generated_at: generatedAt,
    };
  }
}

export const emergingThesisEngine = new EmergingThesisEngine();
