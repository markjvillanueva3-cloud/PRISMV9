/**
 * QdrantMemoryEngineSingleton — Singleton accessor + default Ollama embedder
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P0-U01.
 *
 * QdrantMemoryEngine is pluggable (see its `setEmbedder()` method); it does
 * not assume a specific embedding model. Until this unit, callers had to
 * inject an embedder themselves and there was no cross-call instance, so the
 * memory layer was orphaned (forge-audit: "5 highest-leverage reasoning
 * engines are orphaned").
 *
 * This singleton:
 *   1. Holds a single QdrantMemoryEngine instance per process so dispatchers,
 *      hooks, and tests share the same in-memory `ensured` collection cache.
 *   2. Auto-injects an Ollama-backed embedder using `nomic-embed-text`
 *      (768-dim, matches QdrantMemoryEngine.DEFAULT_VECTOR_SIZE) on first
 *      access. Callers can override with `setEmbedder()` for tests.
 *   3. Talks to Ollama via raw `/api/embed` (the modern endpoint that returns
 *      `{embeddings: number[][]}`). The legacy `client.embeddings()` method
 *      on the `ollama` npm package hits `/api/embeddings`, which on recent
 *      daemons returns empty for `nomic-embed-text`.
 *
 * Design rules:
 *   - Throw on misconfiguration (bad host, empty input). Never silently
 *     return a zero vector — that would corrupt downstream similarity scores.
 *   - Pure-side-effect-free: `getInstance()` is idempotent; resetting is
 *     explicit via `reset()` for tests.
 *
 * @module engines/QdrantMemoryEngineSingleton
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P0-U01
 */

import { QdrantMemoryEngine, type Embedder } from "./QdrantMemoryEngine.js";

export const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";
export const DEFAULT_EMBED_MODEL = "nomic-embed-text";
export const EXPECTED_EMBED_DIM = 768;
/** nomic-embed-text supports ~8k tokens; 32 KB chars is a safe upper bound. */
export const MAX_EMBED_INPUT_CHARS = 32_768;
// 30s, not 15s: a COLD nomic-embed-text load (model not yet resident) routinely
// exceeds 15s on first call, which aborted the embed and surfaced as the
// recall-wide "embed failed" that made the revived vault look broken. The
// keep_alive below keeps the model warm so steady-state calls stay sub-second.
export const DEFAULT_EMBED_TIMEOUT_MS = 30_000;
// Keep the embed model resident between calls so the first recall after an idle
// gap does not pay a cold-load that blows the timeout. Ollama unloads models
// after ~5min idle by default.
export const DEFAULT_EMBED_KEEP_ALIVE = "30m";

export interface OllamaEmbedderOptions {
  /** Ollama daemon URL. Defaults to localhost:11434. */
  host?: string;
  /** Embedding model name. Must be pulled on the daemon. */
  model?: string;
  /** Per-request timeout in ms. Defaults to 15s. */
  timeoutMs?: number;
}

interface OllamaEmbedResponse {
  embeddings?: number[][];
}

/**
 * Singleton accessor for the process-wide QdrantMemoryEngine.
 *
 * Callers should prefer this over `new QdrantMemoryEngine()` so that the
 * embedder, vector store, and ensured-collection cache are shared.
 */
export class QdrantMemoryEngineSingleton {
  private static instance: QdrantMemoryEngine | null = null;
  private static embedderInjected = false;

  /**
   * Get (or lazy-create) the shared QdrantMemoryEngine instance.
   * On first call, auto-injects the Ollama embedder.
   *
   * @returns The singleton QdrantMemoryEngine.
   */
  static getInstance(): QdrantMemoryEngine {
    if (!this.instance) {
      this.instance = new QdrantMemoryEngine();
    }
    if (!this.embedderInjected) {
      this.instance.setEmbedder(this.createOllamaEmbedder());
      this.embedderInjected = true;
    }
    return this.instance;
  }

  /**
   * Override the singleton's embedder. Useful for tests and for swapping in
   * a non-Ollama embedder later.
   *
   * @param fn The embedder function (or null to clear).
   */
  static setEmbedder(fn: Embedder | null): void {
    const inst = this.instance ?? new QdrantMemoryEngine();
    inst.setEmbedder(fn);
    this.instance = inst;
    this.embedderInjected = fn !== null;
  }

  /**
   * Build an Ollama-backed embedder. Throws on bad configuration or empty
   * Ollama responses; never silently returns a zero vector.
   *
   * @param options Optional host/model/timeout overrides.
   * @returns An Embedder function compatible with QdrantMemoryEngine.
   */
  static createOllamaEmbedder(options: OllamaEmbedderOptions = {}): Embedder {
    const host = options.host ?? DEFAULT_OLLAMA_HOST;
    const model = options.model ?? DEFAULT_EMBED_MODEL;
    const timeoutMs = options.timeoutMs ?? DEFAULT_EMBED_TIMEOUT_MS;

    if (typeof host !== "string" || !/^https?:\/\//.test(host)) {
      throw new Error(`invalid Ollama host: ${String(host)}`);
    }
    if (typeof model !== "string" || model.length === 0) {
      throw new Error(`invalid Ollama model: ${String(model)}`);
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new Error(`invalid timeoutMs: ${String(timeoutMs)}`);
    }

    return async (text: string): Promise<number[]> => {
      if (typeof text !== "string") {
        throw new Error(`embedder input must be string, got ${typeof text}`);
      }
      if (text.length === 0) {
        throw new Error("embedder input must be non-empty");
      }
      // Cap pathologically long inputs — Ollama would otherwise allocate
      // and reject. See MAX_EMBED_INPUT_CHARS for the chosen bound.
      if (text.length > MAX_EMBED_INPUT_CHARS) {
        throw new Error(`embedder input too long: ${text.length} > ${MAX_EMBED_INPUT_CHARS} chars`);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res: Response;
      try {
        res = await fetch(`${host}/api/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, input: text, keep_alive: DEFAULT_EMBED_KEEP_ALIVE }),
          signal: controller.signal,
        });
      } catch (e) {
        clearTimeout(timer);
        const msg = (e as Error)?.message ?? String(e);
        throw new Error(`Ollama embed network error: ${msg}`);
      }
      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Ollama embed HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = (await res.json()) as OllamaEmbedResponse;
      const vec = data.embeddings?.[0];
      if (!Array.isArray(vec) || vec.length === 0) {
        throw new Error("Ollama returned empty embedding (model not loaded?)");
      }
      if (vec.length !== EXPECTED_EMBED_DIM) {
        throw new Error(
          `embedder dim mismatch: got ${vec.length}, expected ${EXPECTED_EMBED_DIM}`,
        );
      }
      // Reject NaN/Infinity that would corrupt similarity math downstream.
      for (let i = 0; i < vec.length; i++) {
        if (!Number.isFinite(vec[i])) {
          throw new Error(`embedder produced non-finite value at index ${i}`);
        }
      }
      return vec;
    };
  }

  /**
   * Reset the singleton. Tests use this to isolate state.
   */
  static reset(): void {
    this.instance = null;
    this.embedderInjected = false;
  }

  /**
   * Whether an embedder has been injected. Hook + tests use this to assert
   * post-conditions.
   */
  static hasEmbedder(): boolean {
    return this.instance !== null && this.embedderInjected;
  }
}
