/**
 * QdrantDenseRetrievalEngine -- Thin async REST wrapper for Qdrant dense-vector search.
 *
 * Wraps the Qdrant REST API `/collections/{col}/points/search` endpoint.
 * Returns normalized hits whose shape matches the existing `defaultQdrantSearch`
 * output in `scripts/lib/hybrid-retrieval.mjs` so RRF fusion is drop-in.
 *
 * Design choices:
 *   - Uses native `fetch` (Node 22+; no new dependencies).
 *   - `AbortController` enforces a per-call timeout (default 5000 ms).
 *   - Every failure path returns an empty array + logs the reason (never throws).
 *   - Singleton export so callers share connection config without re-passing opts.
 *   - No physics constants required (pure network/data engine).
 *
 * Gate: this engine is intended to be invoked only when `PRISM_RAG_DENSE_QDRANT=1`
 * is set.  The hybrid-retrieval.mjs caller enforces the gate; this engine does not
 * re-check it so tests can exercise the engine directly.
 *
 * @module engines/ai-training/QdrantDenseRetrievalEngine
 * @milestone AI-SYNERGY/U-INDIA-HYBRID-QDRANT-ARM
 */

export interface QdrantDenseHit {
  /** Stable canonical doc id extracted from payload (externalId > node_id > name > point id). */
  id: string;
  /** Cosine similarity score in [0, 1]. */
  score: number;
  /** Raw Qdrant payload forwarded for provenance. */
  payload: Record<string, unknown> | null;
}

export interface QdrantDenseSearchOptions {
  /** Query vector (must match collection vector dimension). */
  vector: number[];
  /** Target Qdrant collection name. Default: "prism_engines". */
  collection?: string;
  /** Base URL of Qdrant REST API. Default: "http://localhost:6333". */
  url?: string;
  /** Max number of results to return. Default: 20. */
  limit?: number;
  /** Per-call timeout in milliseconds. Default: 5000. */
  timeoutMs?: number;
}

export interface QdrantDenseSearchResult {
  hits: QdrantDenseHit[];
  /** True when the call completed successfully. */
  ok: boolean;
  /** Human-readable failure reason when ok=false. */
  error?: string;
  /** Duration of the successful Qdrant call in milliseconds. */
  durationMs?: number;
}

const DEFAULT_QDRANT_URL = "http://localhost:6333";
const DEFAULT_COLLECTION = "prism_engines";
const DEFAULT_LIMIT = 20;
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Extract a stable canonical id from a Qdrant point payload.
 * Mirrors `pickQdrantPayloadId` in `scripts/lib/hybrid-retrieval.mjs` so the
 * same doc surfaces under the same id regardless of which code path found it.
 *
 * Priority: payload.externalId > payload.node_id > payload.name >
 *           payload.sourceFile > String(point.id)
 */
export function pickPayloadId(point: {
  id?: string | number;
  payload?: Record<string, unknown> | null;
}): string {
  const pl = point.payload;
  if (pl && typeof pl === "object") {
    if (typeof pl["externalId"] === "string" && (pl["externalId"] as string).length > 0)
      return pl["externalId"] as string;
    if (typeof pl["node_id"] === "string" && (pl["node_id"] as string).length > 0)
      return pl["node_id"] as string;
    if (typeof pl["name"] === "string" && (pl["name"] as string).length > 0)
      return pl["name"] as string;
    if (typeof pl["sourceFile"] === "string" && (pl["sourceFile"] as string).length > 0)
      return pl["sourceFile"] as string;
  }
  return String(point.id ?? "unknown");
}

export class QdrantDenseRetrievalEngine {
  /**
   * Query Qdrant for the top-K nearest neighbours of `vector`.
   *
   * Graceful-degrades on every failure class:
   *   - Empty vector -> { ok: false, hits: [], error: "empty-vector" }
   *   - Network timeout -> { ok: false, hits: [], error: "timeout" }
   *   - Non-200 HTTP -> { ok: false, hits: [], error: "http-NNN" }
   *   - Malformed JSON -> { ok: false, hits: [], error: "parse-error" }
   *   - Missing result array -> { ok: false, hits: [], error: "no-result-array" }
   *
   * @param opts - Search parameters (vector required; others have defaults).
   * @returns Normalized hits sorted by score descending plus ok/error metadata.
   */
  async search(opts: QdrantDenseSearchOptions): Promise<QdrantDenseSearchResult> {
    const { vector } = opts;

    if (!Array.isArray(vector) || vector.length === 0) {
      return { ok: false, hits: [], error: "empty-vector" };
    }

    const base = (opts.url ?? DEFAULT_QDRANT_URL).replace(/\/$/, "");
    const col = opts.collection ?? DEFAULT_COLLECTION;
    const limit = Number.isFinite(opts.limit) ? (opts.limit as number) : DEFAULT_LIMIT;
    const timeoutMs = Number.isFinite(opts.timeoutMs)
      ? (opts.timeoutMs as number)
      : DEFAULT_TIMEOUT_MS;

    const endpoint = `${base}/collections/${col}/points/search`;
    const body = JSON.stringify({ vector, limit, with_payload: true });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const t0 = Date.now();

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort =
        err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"));
      return { ok: false, hits: [], error: isAbort ? "timeout" : `fetch-error:${String(err)}` };
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return { ok: false, hits: [], error: `http-${response.status}` };
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      return { ok: false, hits: [], error: "parse-error" };
    }

    const raw = parsed as Record<string, unknown>;
    if (!raw || !Array.isArray(raw["result"])) {
      return { ok: false, hits: [], error: "no-result-array" };
    }

    const hits: QdrantDenseHit[] = (raw["result"] as Array<Record<string, unknown>>).map(
      (p) => ({
        id: pickPayloadId({
          id: p["id"] as string | number | undefined,
          payload: (p["payload"] as Record<string, unknown> | null | undefined) ?? null,
        }),
        score: typeof p["score"] === "number" ? p["score"] : 0,
        payload: (p["payload"] as Record<string, unknown> | null | undefined) ?? null,
      })
    );

    return { ok: true, hits, durationMs: Date.now() - t0 };
  }
}

/** Singleton -- callers share one instance; opts are per-call. */
export const qdrantDenseRetrievalEngine = new QdrantDenseRetrievalEngine();
