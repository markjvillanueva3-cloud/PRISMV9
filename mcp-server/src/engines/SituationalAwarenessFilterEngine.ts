/**
 * SituationalAwarenessFilterEngine — Compresses a long directive to a tight slice
 *
 * Phase 0.13 U-SAW5 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. The full PRISM
 * self-awareness directive is 188 lines. Injecting all of it on every prompt
 * burns context for no benefit. This engine scores each line against the user
 * prompt and returns the top ≤25 most-relevant lines, preserving their
 * original order so that surrounding context is not destroyed.
 *
 * Scoring is a keyword-overlap baseline (token Jaccard + section-header bias).
 * It is intentionally simple so that the engine has zero runtime dependencies
 * and can be swapped for MiniLM embeddings later by replacing `scoreLine`.
 *
 * @module engines/SituationalAwarenessFilterEngine
 * @milestone PP-0.13-U-SAW5
 */

export interface FilterOptions {
  maxLines?: number;
  minScore?: number;
  alwaysKeepHeaders?: boolean;
}

export interface FilterResult {
  kept: Array<{ lineNumber: number; text: string; score: number }>;
  droppedCount: number;
  inputLineCount: number;
  compressionRatio: number;
}

export interface ScoredLine {
  lineNumber: number;
  text: string;
  score: number;
}

const DEFAULT_MAX_LINES = 25;
const DEFAULT_MIN_SCORE = 0.0;

const STOPWORDS = new Set([
  "the","a","an","of","to","and","or","for","in","on","with","is","are","be","by",
  "from","at","as","it","that","this","these","those","i","you","we","they","he","she",
  "do","does","did","not","but","if","so","my","your","our","their",
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9_-]*/g) ?? []).filter((t) => !STOPWORDS.has(t));
}

function isHeader(line: string): boolean {
  return /^\s*(#{1,6}\s|\*\*[^*]+\*\*\s*$|-{3,}\s*$|={3,}\s*$)/.test(line);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export class SituationalAwarenessFilterEngine {
  filter(directive: string, prompt: string, opts: FilterOptions = {}): FilterResult {
    const maxLines = opts.maxLines ?? DEFAULT_MAX_LINES;
    const minScore = opts.minScore ?? DEFAULT_MIN_SCORE;
    const keepHeaders = opts.alwaysKeepHeaders ?? true;

    if (maxLines < 0) throw new Error("maxLines must be non-negative");
    if (minScore < 0 || minScore > 1) throw new Error("minScore must be in [0, 1]");

    const lines = directive.split(/\r?\n/);
    const promptTokens = new Set(tokenize(prompt));

    const scored: ScoredLine[] = lines.map((text, idx) => ({
      lineNumber: idx + 1,
      text,
      score: this.scoreLine(text, promptTokens, keepHeaders),
    }));

    const candidates = scored
      .filter((s) => s.text.trim().length > 0 && s.score >= minScore)
      .sort((a, b) => (b.score === a.score ? a.lineNumber - b.lineNumber : b.score - a.score));

    const kept = candidates.slice(0, maxLines).sort((a, b) => a.lineNumber - b.lineNumber);
    const inputLineCount = lines.filter((l) => l.trim().length > 0).length;
    const droppedCount = Math.max(0, inputLineCount - kept.length);
    const compressionRatio = inputLineCount === 0 ? 1 : kept.length / inputLineCount;

    return {
      kept,
      droppedCount,
      inputLineCount,
      compressionRatio: Math.round(compressionRatio * 10000) / 10000,
    };
  }

  /**
   * Score a single line against the tokenized prompt. Public so subclasses or
   * MiniLM-backed replacements can override it.
   */
  scoreLine(text: string, promptTokens: Set<string>, keepHeaders = true): number {
    if (text.trim().length === 0) return 0;
    const lineTokens = new Set(tokenize(text));
    let score = jaccard(lineTokens, promptTokens);
    if (keepHeaders && isHeader(text)) {
      score += 0.25; // bias headers so sections remain navigable
    }
    return Math.min(1, Math.round(score * 10000) / 10000);
  }

  /**
   * Tokenize-and-compare helper exposed for callers that want to compute
   * scores without slicing the whole directive (e.g., A/B comparisons).
   */
  similarity(a: string, b: string): number {
    return jaccard(new Set(tokenize(a)), new Set(tokenize(b)));
  }
}

export const situationalAwarenessFilterEngine = new SituationalAwarenessFilterEngine();
