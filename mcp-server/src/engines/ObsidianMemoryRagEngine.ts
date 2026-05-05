/**
 * ObsidianMemoryRagEngine — retrieval-augmented memory recall from the
 * H-drive vault. Given a user prompt, returns the top-K most relevant
 * entries from knowledge/memories/ + knowledge/tribal/ for prepending as
 * system context.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P3-U05.
 *
 * Why this exists
 * ---------------
 * P1-U01/U03/U04 produced ~74 memory mirrors + ~4349 tribal-tip files in
 * the vault. They sit on disk and the wiki indexer can read them, but
 * Claude has no automatic recall path: the user has to know what was
 * captured to ask for it. This engine is the recall surface — when the
 * user says "remember X" or "what did we say about Y last time", the hook
 * surfaces the most relevant vault entries before Claude reasons.
 *
 * Design
 * ------
 * Pure file-system keyword-overlap search (no Qdrant dependency — that
 * was P0-U02 territory and Qdrant is currently down). Tokenization +
 * scoring matches PRISMContextInjectorEngine.rankChunks for symmetry, but
 * the source corpora are different (memories + tribal here vs claude-md
 * chunks there).
 *
 * Idempotent + read-only — the engine never mutates the vault; it only
 * reads .md files and returns excerpts.
 *
 * Failure mode: every fs read wrapped — engine returns an empty result
 * rather than throwing. The hook is fire-and-forget so a failure here
 * never blocks the user prompt.
 *
 * @module engines/ObsidianMemoryRagEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";

const FRONTMATTER_OPEN_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const MEMORY_KEYWORD_RE = /\b(remember|recall|previous|last\s+time|earlier|context\s+from|before|prior)\b/i;
const DEFAULT_MEMORIES_DIR = "H:/prism/knowledge/memories";
const DEFAULT_TRIBAL_DIR = "H:/prism/knowledge/tribal";
const DEFAULT_TOP_K = 5;
const DEFAULT_MAX_BODY_CHARS = 1_500;
const MIN_TOKEN_LEN = 3;

export interface RagQueryInput {
  query: string;
  /** Override memories/ dir. Default: H:/prism/knowledge/memories */
  memoriesDir?: string;
  /** Override tribal/ dir. Default: H:/prism/knowledge/tribal */
  tribalDir?: string;
  /** How many entries to return. Default 5. */
  topK?: number;
  /** Per-entry body cap (chars). Default 1500. */
  maxBodyChars?: number;
  /** When true, search even without memory keywords. Default false. */
  forceSearch?: boolean;
}

export interface RagHit {
  source: "memory" | "tribal";
  filename: string;
  fullPath: string;
  title: string;
  body: string;        // truncated to maxBodyChars
  score: number;
  uniqueOverlap: number;
  totalOverlap: number;
}

export interface RagResult {
  ok: boolean;
  triggered: boolean;   // true when memory keywords fired (or forceSearch)
  hits: RagHit[];
  scanned: number;
  query: string;
  durationMs: number;
}

export class ObsidianMemoryRagEngine {
  /**
   * Decide whether the query should trigger RAG. Returns true when:
   *   - forceSearch=true, OR
   *   - query contains a memory-recall keyword (remember/recall/previous/etc).
   * False for short queries (<3 tokens) so single-word prompts don't fire.
   */
  shouldTrigger(query: string, forceSearch = false): boolean {
    if (forceSearch) return true;
    if (typeof query !== "string" || query.length === 0) return false;
    const tokens = this.tokenize(query);
    if (tokens.size < 2) return false;
    return MEMORY_KEYWORD_RE.test(query);
  }

  /**
   * Run a RAG query against the vault. Never throws.
   */
  query(input: RagQueryInput): RagResult {
    const start = Date.now();
    const query = input.query ?? "";
    const memoriesDir = input.memoriesDir ?? DEFAULT_MEMORIES_DIR;
    const tribalDir = input.tribalDir ?? DEFAULT_TRIBAL_DIR;
    const topK = input.topK ?? DEFAULT_TOP_K;
    const maxBodyChars = input.maxBodyChars ?? DEFAULT_MAX_BODY_CHARS;
    const forceSearch = input.forceSearch === true;

    const triggered = this.shouldTrigger(query, forceSearch);
    if (!triggered) {
      return { ok: true, triggered: false, hits: [], scanned: 0, query, durationMs: Date.now() - start };
    }

    const promptTokens = this.tokenize(query);
    const candidates: RagHit[] = [];

    let scanned = 0;
    for (const [dir, source] of [[memoriesDir, "memory"], [tribalDir, "tribal"]] as Array<[string, RagHit["source"]]>) {
      if (!fs.existsSync(dir)) continue;
      let entries: string[] = [];
      try { entries = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".md")); }
      catch { continue; }

      for (const filename of entries) {
        scanned++;
        const fullPath = path.join(dir, filename);
        try {
          const raw = fs.readFileSync(fullPath, "utf-8");
          const { title, body } = this.splitTitleBody(raw, filename);
          const docTokens = this.tokenize(`${title} ${body}`);
          const { unique, total } = this.overlap(promptTokens, docTokens);
          if (unique === 0) continue;
          const score = unique * 4 + total * 0.5;
          candidates.push({
            source,
            filename,
            fullPath,
            title,
            body: body.length > maxBodyChars ? body.slice(0, maxBodyChars) + "\n[…truncated]" : body,
            score,
            uniqueOverlap: unique,
            totalOverlap: total,
          });
        } catch { /* skip unreadable */ }
      }
    }

    candidates.sort((a, b) => b.score - a.score || a.filename.localeCompare(b.filename));
    return {
      ok: true,
      triggered: true,
      hits: candidates.slice(0, topK),
      scanned,
      query,
      durationMs: Date.now() - start,
    };
  }

  /** Render hits as a markdown-formatted system-prompt block. */
  formatForInjection(result: RagResult): string {
    if (!result.triggered || result.hits.length === 0) return "";
    const lines: string[] = [
      "## 🧠 Memory recall (auto-surfaced from knowledge/memories + knowledge/tribal)",
      "",
      `> Query: ${result.query.slice(0, 200)}`,
      `> ${result.hits.length} of ${result.scanned} vault entries matched. Showing top ${result.hits.length} by keyword-overlap score.`,
      "",
    ];
    for (const h of result.hits) {
      lines.push(`### ${h.source}: ${h.title}`);
      lines.push(`*\`${h.filename}\` · score:${h.score.toFixed(1)} · unique-tokens:${h.uniqueOverlap} · total-occurrences:${h.totalOverlap}*`);
      lines.push("");
      lines.push(h.body);
      lines.push("");
    }
    return lines.join("\n");
  }

  // ---- private helpers ----

  /**
   * Split a vault file into title + body. Strips frontmatter, picks the
   * first `# Heading` as title (or filename if none).
   */
  splitTitleBody(raw: string, filename: string): { title: string; body: string } {
    const stripped = raw.replace(FRONTMATTER_OPEN_RE, "");
    const lines = stripped.split(/\r?\n/);
    let title = filename.replace(/\.md$/i, "");
    let titleLine = -1;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^#\s+(.+?)\s*$/);
      if (m) { title = m[1]; titleLine = i; break; }
    }
    const bodyLines = titleLine >= 0 ? lines.slice(titleLine + 1) : lines;
    const body = bodyLines.join("\n").replace(/^\s+|\s+$/g, "");
    return { title, body };
  }

  /** Lowercase word tokens of length ≥ MIN_TOKEN_LEN with frequencies. */
  tokenize(text: string): Map<string, number> {
    const out = new Map<string, number>();
    const re = new RegExp(`[a-z][a-z0-9_]{${MIN_TOKEN_LEN - 1},}`, "g");
    const words = String(text ?? "").toLowerCase().match(re) ?? [];
    for (const w of words) out.set(w, (out.get(w) ?? 0) + 1);
    return out;
  }

  /**
   * Score overlap between query and document token bags.
   * Returns:
   *   unique = number of distinct query tokens present in doc
   *   total  = sum of doc-occurrences for those tokens
   */
  overlap(prompt: Map<string, number>, doc: Map<string, number>): { unique: number; total: number } {
    let unique = 0;
    let total = 0;
    for (const [w] of prompt) {
      const c = doc.get(w);
      if (c === undefined) continue;
      unique++;
      total += c;
    }
    return { unique, total };
  }
}

export const obsidianMemoryRagEngine = new ObsidianMemoryRagEngine();
