/**
 * OllamaEmbedderEngine
 * ====================
 *
 * OBSIDIAN-AUTOMATE-MS3/U-EMBEDDING-CONNECTIONS
 *
 * Lightweight wrapper around Ollama's `/api/embeddings` endpoint specialized
 * for the daily-brief use case: embed many short documents, then compute
 * pairwise cosine similarities and return them keyed by canonical pairKey
 * (alphabetical join of two paths).
 *
 * Why this and not the existing QdrantMemoryEngine? QdrantMemoryEngine
 * persists embeddings into Qdrant collections — overkill for a daily brief
 * where the corpus is the last-7d window of vault notes (typically <100
 * docs). This engine embeds in-memory, computes pairs, hands the map
 * back, and forgets — no persistence, no vector store dependency.
 *
 * Determinism + testability:
 *   - The HTTP fetch is injected via opts.fetchImpl (defaults to globalThis.fetch).
 *   - For unit tests, callers pass a deterministic mock that returns
 *     stable vectors per input text.
 *   - When Ollama is unreachable, embed() returns a typed error result
 *     (no throw); the daily-brief script silently falls back to TF-IDF.
 *
 * @milestone OBSIDIAN-AUTOMATE-MS3/U-EMBEDDING-CONNECTIONS
 */

export interface EmbeddingResult {
  ok: true;
  vector: number[];
}

export interface EmbeddingError {
  ok: false;
  error: string;
  cause?: unknown;
}

export type EmbedOutcome = EmbeddingResult | EmbeddingError;

export type FetchLike = typeof fetch;

export interface OllamaEmbedderOptions {
  /** Override the embeddings endpoint. Default http://127.0.0.1:11434/api/embeddings */
  url?: string;
  /** Override the model name. Default nomic-embed-text */
  model?: string;
  /** Per-request timeout in ms. Default 15_000. */
  timeoutMs?: number;
  /** Inject a custom fetch (mocking, retries, alt transport). */
  fetchImpl?: FetchLike;
}

export interface PairwiseInput {
  path: string;
  text: string;
}

export interface PairwiseOutcome {
  ok: boolean;
  /** When ok=true, map keyed by pairKey (alphabetical join "a||b"). */
  similarities?: Map<string, number>;
  /** When ok=false, the embedding error that caused the abort. */
  error?: string;
  /** Always populated: number of inputs that successfully embedded. */
  embedded: number;
  /** Inputs that failed (path + reason). */
  failed: Array<{ path: string; reason: string }>;
}

const DEFAULT_URL = "http://127.0.0.1:11434/api/embeddings";
const DEFAULT_MODEL = "nomic-embed-text";
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Canonical pair key — MUST mirror DailyPersonalBriefEngine.pairKey() exactly,
 * which strips `.md` extension and uses basenames (not full paths). Otherwise
 * the precomputedSimilarities Map lookup misses every pair.
 */
export function pairKey(a: string, b: string): string {
  const ba = baseNoExt(a);
  const bb = baseNoExt(b);
  return ba <= bb ? `${ba}||${bb}` : `${bb}||${ba}`;
}

function baseNoExt(p: string): string {
  const lastSlash = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  const base = lastSlash >= 0 ? p.slice(lastSlash + 1) : p;
  return base.toLowerCase().endsWith(".md") ? base.slice(0, -3) : base;
}

/** Cosine similarity of two equal-length vectors. */
export function cosine(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export class OllamaEmbedderEngine {
  readonly name = "OllamaEmbedderEngine";

  private readonly url: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(opts: OllamaEmbedderOptions = {}) {
    this.url = opts.url ?? DEFAULT_URL;
    this.model = opts.model ?? DEFAULT_MODEL;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as FetchLike);
  }

  /**
   * Embed a single text. Returns a typed result — never throws on transport
   * failure (callers can decide to fall back).
   */
  async embed(text: string): Promise<EmbedOutcome> {
    if (!this.fetchImpl) {
      return { ok: false, error: "no-fetch-implementation" };
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, prompt: text }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        return { ok: false, error: `http-${res.status}`, cause: res.statusText };
      }
      const body = await res.json() as { embedding?: unknown };
      if (!Array.isArray(body.embedding)) {
        return { ok: false, error: "no-embedding-in-response", cause: body };
      }
      const vec = body.embedding;
      if (!vec.every((n) => typeof n === "number" && Number.isFinite(n))) {
        return { ok: false, error: "non-numeric-embedding" };
      }
      return { ok: true, vector: vec as number[] };
    } catch (err) {
      clearTimeout(timer);
      return { ok: false, error: "fetch-failed", cause: err };
    }
  }

  /** Embed N texts in sequence. Failures are reported, not thrown. */
  async embedMany(texts: readonly string[]): Promise<Array<EmbedOutcome>> {
    const out: EmbedOutcome[] = [];
    for (const t of texts) {
      out.push(await this.embed(t));
    }
    return out;
  }

  /**
   * Embed all `inputs` and return pairwise cosine similarities keyed by
   * pairKey. Inputs that fail to embed are excluded from pairs (their
   * key never appears in the map).
   *
   * Use this output as `precomputedSimilarities` in DailyPersonalBriefEngine.
   */
  async pairwiseCosine(inputs: readonly PairwiseInput[]): Promise<PairwiseOutcome> {
    const failed: Array<{ path: string; reason: string }> = [];
    const vectors: Array<{ path: string; vector: number[] }> = [];
    for (const item of inputs) {
      const r = await this.embed(item.text);
      if (r.ok) {
        vectors.push({ path: item.path, vector: r.vector });
      } else {
        failed.push({ path: item.path, reason: r.error });
      }
    }
    const similarities = new Map<string, number>();
    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) {
        const k = pairKey(vectors[i].path, vectors[j].path);
        const s = cosine(vectors[i].vector, vectors[j].vector);
        similarities.set(k, s);
      }
    }
    return {
      ok: vectors.length >= 2 || inputs.length < 2,
      similarities,
      embedded: vectors.length,
      failed,
    };
  }
}

export const ollamaEmbedderEngine = new OllamaEmbedderEngine();
