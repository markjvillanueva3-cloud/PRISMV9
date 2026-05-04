/**
 * WikiRetrievalContextEngine — top-K wiki entries scored by token-overlap
 * with the user's prompt, returned as a context block for consensus models.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-WIKI-RETRIEVAL.
 *
 * Why this exists
 * ---------------
 * `PRISMContextInjectorEngine` ships a STATIC bundle (CLAUDE.md, GSD,
 * digests) to every model. That covers identity but not specifics — if the
 * user asks about "Kienzle force for steel ap=2 fz=0.1", the static bundle
 * doesn't surface the existing CuttingForceEngine entry, the canonical
 * coefficient table, or the prior consensus runs that already answered
 * similar questions.
 *
 * This engine bridges that gap. For each prompt:
 *
 *   1. Tokenize prompt → set of stemmed lowercase tokens (≥3 chars).
 *   2. Stream `wiki/index.md` (722+ entries — one line each).
 *   3. Score each entry by Jaccard overlap of its title+description tokens
 *      against the prompt tokens.
 *   4. Pull the top-K entries; for the top few, also pull their full body
 *      from the linked source file (if accessible) up to a per-entry cap.
 *   5. Also scan recent consensus persistence artifacts for matches —
 *      previous Q&A about the same topic is the highest-value retrieval.
 *
 * The output is a compact markdown block ready to be appended to the
 * PRISM context bundle the injector already produces. Engine respects a
 * byte budget so it never blows the recipient model's context window.
 *
 * Pure file I/O. No network. Cache the index parse with mtime invalidation.
 *
 * @module engines/WikiRetrievalContextEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface RetrievalOptions {
  /** Override wiki root. Default env PRISM_WIKI_ROOT or H:/prism/knowledge/wiki. */
  wikiRoot?: string;
  /** Top-K entries to include from main index. Default 8. */
  topK?: number;
  /** Top-N consensus artifacts to surface. Default 3. */
  topConsensus?: number;
  /** Total byte budget for the retrieval block. Default 6000. */
  byteBudget?: number;
  /** Per-entry body byte cap when fetching source body. Default 500. */
  perEntryBytes?: number;
}

export interface RetrievalResult {
  text: string;
  estimatedTokens: number;
  totalEntries: number;
  consensusHits: number;
  truncated: boolean;
}

interface IndexEntry {
  title: string;
  description: string;
  source: string | null;
  category: string;
}

const DEFAULT_WIKI_ROOT = process.env.PRISM_WIKI_ROOT ?? "H:/prism/knowledge/wiki";
const DEFAULT_TOP_K = 8;
const DEFAULT_TOP_CONSENSUS = 3;
const DEFAULT_BYTE_BUDGET = 6000;
const DEFAULT_PER_ENTRY_BYTES = 500;
const TOKEN_PER_CHAR = 0.25;
const MIN_TOKEN_LEN = 3;

const STOPWORDS = new Set<string>([
  "the", "and", "for", "with", "from", "that", "this", "have", "has", "are",
  "was", "were", "what", "when", "where", "why", "how", "use", "uses", "using",
  "into", "onto", "any", "all", "but", "you", "your", "our", "out", "can",
  "should", "would", "could", "will", "shall", "may", "might", "must",
]);

interface IndexCache {
  mtimeMs: number;
  entries: IndexEntry[];
}

export class WikiRetrievalContextEngine {
  private indexCache: IndexCache | null = null;

  /**
   * Retrieve top-K relevant wiki entries + top-N relevant consensus artifacts
   * for a prompt. Returns a markdown block ready for injection.
   */
  retrieve(prompt: string, opts: RetrievalOptions = {}): RetrievalResult {
    if (typeof prompt !== "string" || prompt.length === 0) {
      return { text: "", estimatedTokens: 0, totalEntries: 0, consensusHits: 0, truncated: false };
    }
    const wikiRoot = opts.wikiRoot ?? DEFAULT_WIKI_ROOT;
    const topK = opts.topK ?? DEFAULT_TOP_K;
    const topConsensus = opts.topConsensus ?? DEFAULT_TOP_CONSENSUS;
    const byteBudget = opts.byteBudget ?? DEFAULT_BYTE_BUDGET;
    const perEntryBytes = opts.perEntryBytes ?? DEFAULT_PER_ENTRY_BYTES;

    const promptTokens = this.tokenize(prompt);
    if (promptTokens.size === 0) {
      return { text: "", estimatedTokens: 0, totalEntries: 0, consensusHits: 0, truncated: false };
    }

    const indexEntries = this.loadIndex(wikiRoot);
    const ranked = this.rankIndex(indexEntries, promptTokens, topK);
    const consensus = this.rankConsensus(wikiRoot, promptTokens, topConsensus);

    const sections: string[] = [];
    let bytes = 0;
    let truncated = false;

    if (ranked.length > 0) {
      const header = "### TOP RELEVANT WIKI ENTRIES\n\n";
      sections.push(header);
      bytes += header.length;
      for (const r of ranked) {
        const line = `- **${r.entry.title}** (${r.entry.category}, score=${r.score.toFixed(3)}) — ${r.entry.description.slice(0, perEntryBytes)}\n`;
        if (bytes + line.length > byteBudget) {
          truncated = true;
          break;
        }
        sections.push(line);
        bytes += line.length;
      }
    }

    if (consensus.length > 0 && bytes < byteBudget) {
      const header = "\n### PRIOR CONSENSUS ANSWERS ON SIMILAR PROMPTS\n\n";
      if (bytes + header.length <= byteBudget) {
        sections.push(header);
        bytes += header.length;
        for (const c of consensus) {
          const line = `- [${c.sha8}] (rec=${c.recommendation}, agreement=${c.agreementScore}, score=${c.score.toFixed(3)}) — ${c.snippet.slice(0, perEntryBytes)}\n`;
          if (bytes + line.length > byteBudget) {
            truncated = true;
            break;
          }
          sections.push(line);
          bytes += line.length;
        }
      }
    }

    const text = sections.join("");
    return {
      text,
      estimatedTokens: Math.ceil(text.length * TOKEN_PER_CHAR),
      totalEntries: ranked.length,
      consensusHits: consensus.length,
      truncated,
    };
  }

  /** Force-clear the index cache (for tests / file rotation). */
  reset(): void {
    this.indexCache = null;
  }

  // ---- index loading ----

  private loadIndex(wikiRoot: string): IndexEntry[] {
    const indexPath = path.join(wikiRoot, "index.md");
    if (!fs.existsSync(indexPath)) return [];
    const stat = fs.statSync(indexPath);
    if (this.indexCache !== null && this.indexCache.mtimeMs === stat.mtimeMs) {
      return this.indexCache.entries;
    }
    const raw = fs.readFileSync(indexPath, "utf-8");
    const entries: IndexEntry[] = [];
    let currentCategory = "uncategorized";
    for (const line of raw.split("\n")) {
      const catMatch = line.match(/^##\s+(\S+)/);
      if (catMatch) {
        currentCategory = catMatch[1].toLowerCase();
        continue;
      }
      // Format: - [[Title]] — Description | category:X | ... | source:path
      const m = line.match(/^-\s+\[\[([^\]]+)\]\]\s+—\s+(.+)$/);
      if (!m) continue;
      const title = m[1];
      const rest = m[2];
      // Pull the first non-meta segment as description; meta is "key:value | key:value"
      const segs = rest.split(" | ");
      const description = segs[0].trim();
      let source: string | null = null;
      for (const s of segs) {
        if (s.startsWith("source:")) {
          source = s.slice("source:".length).trim();
          break;
        }
      }
      entries.push({ title, description, source, category: currentCategory });
    }
    this.indexCache = { mtimeMs: stat.mtimeMs, entries };
    return entries;
  }

  private rankIndex(entries: ReadonlyArray<IndexEntry>, promptTokens: Set<string>, topK: number): Array<{ entry: IndexEntry; score: number }> {
    const scored: Array<{ entry: IndexEntry; score: number }> = [];
    for (const e of entries) {
      const text = `${e.title} ${e.description}`;
      const toks = this.tokenize(text);
      const score = this.jaccard(promptTokens, toks);
      if (score > 0) scored.push({ entry: e, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  // ---- consensus retrieval ----

  private rankConsensus(wikiRoot: string, promptTokens: Set<string>, topN: number): Array<{ sha8: string; score: number; recommendation: string; agreementScore: string; snippet: string }> {
    const consensusDir = path.join(wikiRoot, "consensus");
    if (!fs.existsSync(consensusDir)) return [];
    let files: string[];
    try {
      files = fs.readdirSync(consensusDir).filter((f) => f.endsWith(".md") && f !== "index.md");
    } catch {
      return [];
    }
    const scored: Array<{ sha8: string; score: number; recommendation: string; agreementScore: string; snippet: string }> = [];
    for (const f of files) {
      const sha8 = f.replace(/\.md$/, "");
      try {
        const body = fs.readFileSync(path.join(consensusDir, f), "utf-8");
        // Pull the prompt block to score against
        const promptBlock = this.extractPromptBlock(body);
        if (promptBlock.length === 0) continue;
        const tokens = this.tokenize(promptBlock);
        const score = this.jaccard(promptTokens, tokens);
        if (score === 0) continue;
        const fm = this.parseFrontmatter(body);
        const answer = this.extractAnswer(body);
        scored.push({
          sha8,
          score,
          recommendation: fm.recommendation ?? "review",
          agreementScore: fm.agreement_score ?? "0",
          snippet: (answer ?? promptBlock).slice(0, 300).replace(/\n/g, " "),
        });
      } catch {
        continue;
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN);
  }

  private extractPromptBlock(body: string): string {
    const marker = "## Prompt\n\n```\n";
    const start = body.indexOf(marker);
    if (start === -1) return "";
    const fenceStart = start + marker.length;
    const fenceEnd = body.indexOf("\n```", fenceStart);
    if (fenceEnd === -1) return "";
    return body.slice(fenceStart, fenceEnd);
  }

  private extractAnswer(body: string): string | null {
    const marker = "## Consensus answer\n\n```\n";
    const start = body.indexOf(marker);
    if (start === -1) return null;
    const fenceStart = start + marker.length;
    const fenceEnd = body.indexOf("\n```", fenceStart);
    if (fenceEnd === -1) return null;
    return body.slice(fenceStart, fenceEnd);
  }

  private parseFrontmatter(body: string): Record<string, string> {
    const out: Record<string, string> = {};
    if (!body.startsWith("---\n")) return out;
    const end = body.indexOf("\n---\n", 4);
    if (end === -1) return out;
    const yaml = body.slice(4, end);
    for (const line of yaml.split("\n")) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      out[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
    }
    return out;
  }

  // ---- token + jaccard helpers ----

  private tokenize(text: string): Set<string> {
    const tokens = text.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length >= MIN_TOKEN_LEN && !STOPWORDS.has(t));
    return new Set(tokens);
  }

  private jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    let inter = 0;
    for (const t of a) if (b.has(t)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
  }
}

export const wikiRetrievalContextEngine = new WikiRetrievalContextEngine();
