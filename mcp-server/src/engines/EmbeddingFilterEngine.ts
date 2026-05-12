/**
 * EmbeddingFilterEngine — Embedding-scored companion to SituationalAwarenessFilter
 *
 * Phase 0.13 U-SAW5 upgrade path. The baseline SituationalAwarenessFilterEngine
 * scores directive lines by token Jaccard. This engine does the same job but
 * uses cosine similarity on real sentence embeddings produced by an injected
 * embedder (typically LocalEmbeddingEngine or the Ollama client). Returns the
 * same output shape so callers can swap them at runtime based on embedder
 * health.
 *
 * Design rules:
 *   - Async, because embedding is I/O-bound (even "in-process" ONNX has
 *     measurable per-line cost).
 *   - Batches every non-blank directive line + the prompt into one embed
 *     call when the embedder supports it, falling back to per-line embeds
 *     when it does not.
 *   - Always preserves original line order in the output (same invariant
 *     as the Jaccard engine).
 *   - Header bias still applies on top of cosine score so section titles
 *     survive.
 *
 * @module engines/EmbeddingFilterEngine
 * @milestone PP-INFRA-AWARE-FILTER
 */

export interface EmbFilterOptions {
  maxLines?: number;
  minScore?: number;
  alwaysKeepHeaders?: boolean;
  headerBias?: number;
}

export interface EmbFilterResult {
  kept: Array<{ lineNumber: number; text: string; score: number }>;
  droppedCount: number;
  inputLineCount: number;
  compressionRatio: number;
  embedderOk: boolean;
  fallbackUsed: "none" | "per-line" | "jaccard";
}

export interface FilterEmbedder {
  embed(text: string): Promise<{ ok: boolean; vector: number[]; error: string | null }>;
  embedBatch?(
    texts: readonly string[]
  ): Promise<Array<{ ok: boolean; vector: number[]; error: string | null }>>;
}

const DEFAULT_MAX_LINES = 25;
const DEFAULT_MIN_SCORE = 0;
const DEFAULT_HEADER_BIAS = 0.10;

const JACCARD_STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "and", "or", "for", "in", "on", "with", "is",
  "are", "be", "by", "from", "at", "as", "it", "that", "this", "these",
  "those", "i", "you", "we", "they", "he", "she", "do", "does", "did", "not",
  "but", "if", "so", "my", "your", "our", "their",
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9_-]*/g) ?? []).filter(
    (t) => !JACCARD_STOPWORDS.has(t)
  );
}

function isHeader(line: string): boolean {
  return /^\s*(#{1,6}\s|\*\*[^*]+\*\*\s*$|-{3,}\s*$|={3,}\s*$)/.test(line);
}

function jaccardFallback(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function cosine(a: readonly number[], b: readonly number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

export class EmbeddingFilterEngine {
  private readonly embedder: FilterEmbedder;

  constructor(embedder: FilterEmbedder) {
    if (!embedder || typeof embedder.embed !== "function") {
      throw new Error("embedder with embed(text) required");
    }
    this.embedder = embedder;
  }

  async filter(directive: string, prompt: string, opts: EmbFilterOptions = {}): Promise<EmbFilterResult> {
    const maxLines = opts.maxLines ?? DEFAULT_MAX_LINES;
    const minScore = opts.minScore ?? DEFAULT_MIN_SCORE;
    const keepHeaders = opts.alwaysKeepHeaders ?? true;
    const headerBias = opts.headerBias ?? DEFAULT_HEADER_BIAS;

    if (maxLines < 0) throw new Error("maxLines must be non-negative");
    if (minScore < 0 || minScore > 1) throw new Error("minScore must be in [0, 1]");
    if (headerBias < 0 || headerBias > 1) throw new Error("headerBias must be in [0, 1]");

    const rawLines = typeof directive === "string" ? directive.split(/\r?\n/) : [];
    const inputLineCount = rawLines.filter((l) => l.trim().length > 0).length;

    if (rawLines.length === 0) {
      return {
        kept: [],
        droppedCount: 0,
        inputLineCount: 0,
        compressionRatio: 1,
        embedderOk: true,
        fallbackUsed: "none",
      };
    }

    // Index of non-blank lines we will actually embed; we keep their 1-based
    // `lineNumber` so the output is aligned with the source file.
    const scoreables: Array<{ lineNumber: number; text: string }> = [];
    rawLines.forEach((text, idx) => {
      if (text.trim().length > 0) scoreables.push({ lineNumber: idx + 1, text });
    });

    const embeddings = await this.embedLines(scoreables.map((s) => s.text));
    const promptResult = await this.embedder.embed(prompt || " ");
    const promptOk = promptResult.ok && promptResult.vector.length > 0;
    const fallbackUsed: EmbFilterResult["fallbackUsed"] = embeddings.fallbackUsed;
    const embedderOk = promptOk && embeddings.anySuccess;

    const scored = scoreables.map((s, i) => {
      let score: number;
      if (embedderOk && embeddings.vectors[i] && embeddings.vectors[i]!.length > 0) {
        score = cosine(promptResult.vector, embeddings.vectors[i] as number[]);
      } else {
        // per-line fallback: Jaccard against the prompt tokens
        score = jaccardFallback(new Set(tokenize(s.text)), new Set(tokenize(prompt)));
      }
      if (keepHeaders && isHeader(s.text)) score = Math.min(1, score + headerBias);
      return { lineNumber: s.lineNumber, text: s.text, score: round4(score) };
    });

    const candidates = scored
      .filter((s) => s.score >= minScore)
      .sort((a, b) => (b.score === a.score ? a.lineNumber - b.lineNumber : b.score - a.score));

    const kept = candidates.slice(0, maxLines).sort((a, b) => a.lineNumber - b.lineNumber);
    const droppedCount = Math.max(0, inputLineCount - kept.length);
    const compressionRatio = inputLineCount === 0 ? 1 : kept.length / inputLineCount;

    return {
      kept,
      droppedCount,
      inputLineCount,
      compressionRatio: round4(compressionRatio),
      embedderOk,
      fallbackUsed: embedderOk ? "none" : fallbackUsed,
    };
  }

  // --- internals ---------------------------------------------------------

  private async embedLines(texts: readonly string[]): Promise<{
    vectors: Array<number[] | null>;
    anySuccess: boolean;
    fallbackUsed: EmbFilterResult["fallbackUsed"];
  }> {
    if (texts.length === 0) {
      return { vectors: [], anySuccess: false, fallbackUsed: "none" };
    }

    if (typeof this.embedder.embedBatch === "function") {
      try {
        const results = await this.embedder.embedBatch(texts);
        const vectors = results.map((r) => (r.ok && r.vector.length > 0 ? r.vector : null));
        const anySuccess = vectors.some((v) => v !== null);
        return { vectors, anySuccess, fallbackUsed: anySuccess ? "none" : "jaccard" };
      } catch {
        // fall through to per-line
      }
    }

    const vectors: Array<number[] | null> = [];
    let anySuccess = false;
    for (const text of texts) {
      try {
        const r = await this.embedder.embed(text);
        if (r.ok && r.vector.length > 0) {
          vectors.push(r.vector);
          anySuccess = true;
        } else {
          vectors.push(null);
        }
      } catch {
        vectors.push(null);
      }
    }
    return {
      vectors,
      anySuccess,
      fallbackUsed: anySuccess ? "per-line" : "jaccard",
    };
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
