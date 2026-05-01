/**
 * OllamaEmbedderFactory.ts — produces an Embedder backed by Ollama's
 * `nomic-embed-text` model and lazily injects it into the
 * `qdrantMemoryEngine` singleton on first call.
 *
 * Why this lives here (not inside QdrantMemoryEngine.ts):
 *  - QdrantMemoryEngine is provider-agnostic by design (the `Embedder`
 *    interface is `(text: string) => Promise<number[]>`). Coupling the
 *    Ollama HTTP path into the engine would prevent test/stub use.
 *  - The MCP server boots before Ollama may be reachable. Lazy injection
 *    here lets dispatcher actions auto-recover the moment Ollama is
 *    available, without restart.
 *
 * Validation surface (rejected at factory build time):
 *  - Empty model name
 *  - Unparseable host URL
 *  - Negative or NaN timeoutMs
 *
 * Validation surface (rejected at call time):
 *  - Non-string / empty / oversize input
 *  - Network error (descriptive message)
 *  - HTTP non-2xx (status + body fragment)
 *  - Missing or malformed embedding response
 *  - Output dim != EXPECTED_EMBED_DIM (so corrupt vectors never reach
 *    Qdrant)
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P0-U01 + P0-U02
 */

import { qdrantMemoryEngine, type Embedder } from "./QdrantMemoryEngine.js";

export const DEFAULT_EMBED_MODEL = "nomic-embed-text";
export const EXPECTED_EMBED_DIM = 768;
export const MAX_EMBED_INPUT_CHARS = 8_192; // ample for prompts; rejects accidental file-blob inputs
export const DEFAULT_EMBED_TIMEOUT_MS = 10_000;

export interface CreateEmbedderOptions {
  /** Ollama daemon base URL. Defaults to env OLLAMA_HOST or http://127.0.0.1:11434. */
  host?: string;
  /** Model name. Defaults to "nomic-embed-text". */
  model?: string;
  /** Per-call HTTP timeout in milliseconds. Defaults to 10_000. */
  timeoutMs?: number;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function createOllamaEmbedder(opts: CreateEmbedderOptions = {}): Embedder {
  const host = opts.host ?? process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
  const model = opts.model ?? DEFAULT_EMBED_MODEL;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_EMBED_TIMEOUT_MS;

  if (!isValidHttpUrl(host)) throw new Error(`invalid Ollama host: ${host}`);
  if (typeof model !== "string" || model.length === 0) {
    throw new Error("invalid Ollama model: empty");
  }
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`invalid timeoutMs: ${String(timeoutMs)}`);
  }

  return async (text: string): Promise<number[]> => {
    if (typeof text !== "string") throw new Error("embed input must be string");
    if (text.length === 0) throw new Error("embed input must be non-empty");
    if (text.length > MAX_EMBED_INPUT_CHARS) {
      throw new Error(`embed input too long (${text.length} > ${MAX_EMBED_INPUT_CHARS})`);
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${host}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: text }),
        signal: ctrl.signal,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Ollama embed network error: ${msg}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Ollama embed HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    let payload: { embeddings?: number[][] };
    try {
      payload = (await res.json()) as { embeddings?: number[][] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Ollama embed parse error: ${msg}`);
    }
    const vec = payload?.embeddings?.[0];
    if (!Array.isArray(vec) || vec.length === 0) {
      throw new Error("Ollama embed returned empty vector");
    }
    if (vec.length !== EXPECTED_EMBED_DIM) {
      throw new Error(`Ollama embed dim mismatch: ${vec.length} vs ${EXPECTED_EMBED_DIM}`);
    }
    for (const v of vec) {
      if (!Number.isFinite(v)) throw new Error("Ollama embed produced non-finite vector entry");
    }
    return vec;
  };
}

let _embedderInstalled = false;

/**
 * Lazy-install an Ollama-backed embedder into the shared `qdrantMemoryEngine`
 * singleton if it does not already have one. Returns true when an install
 * happened during this call, false when the engine already had an embedder
 * (or when the caller passed a pre-built one — useful for tests).
 *
 * This function is idempotent and safe to call from every dispatcher action
 * that needs vector recall.
 */
export function ensureQdrantEmbedder(opts?: CreateEmbedderOptions | { embedder?: Embedder }): boolean {
  if (_embedderInstalled) return false;
  const explicit = (opts as { embedder?: Embedder } | undefined)?.embedder;
  const fn = explicit ?? createOllamaEmbedder(opts as CreateEmbedderOptions | undefined);
  qdrantMemoryEngine.setEmbedder(fn);
  _embedderInstalled = true;
  return true;
}

/**
 * Reset the install latch. Tests use this to swap stub embedders. Production
 * code should not call this.
 */
export function resetEmbedderInstall(): void {
  _embedderInstalled = false;
  qdrantMemoryEngine.setEmbedder(null);
}
