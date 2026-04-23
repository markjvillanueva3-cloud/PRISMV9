/**
 * awarenessMiddleware — consult-context middleware for pipeline engines
 *
 * Provides a 50ms-capped awareness lookup that pipelines call at entry to
 * retrieve process context (prior jobs, material lore, machine-specific tips)
 * without blocking. Callers should wrap with Promise.race against a timeout
 * sentinel so slow backends never hold up program emission.
 *
 * Contract:
 *   consultAwareness({ dispatcher, action, keywords }) →
 *     { ok, query, summary[], topMatches[], suggestions[], latencyMs, cached }
 *
 * A local LRU cache (max 128 entries, 10min TTL) is used to satisfy the
 * ≥80% cache-hit target on repeat-material calls.
 */

export interface AwarenessRequest {
  dispatcher: string;
  action: string;
  keywords: string[];
  context?: Record<string, unknown>;
}

export interface AwarenessMatch {
  domain: string;
  name: string;
  confidence: number;
}

export interface AwarenessResponse {
  ok: boolean;
  query: string;
  summary: string[];
  topMatches: AwarenessMatch[];
  suggestions: string[];
  latencyMs: number;
  cached: boolean;
}

const MAX_CACHE = 128;
const TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  response: AwarenessResponse;
  expires: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(req: AwarenessRequest): string {
  return `${req.dispatcher}::${req.action}::${[...req.keywords].sort().join(",")}`;
}

/**
 * Consult awareness context for a pipeline call.
 * @param req request with dispatcher/action/keywords
 * @returns AwarenessResponse (may be cached)
 */
export async function consultAwareness(
  req: AwarenessRequest
): Promise<AwarenessResponse> {
  const start = Date.now();
  const key = cacheKey(req);
  const hit = cache.get(key);
  if (hit && hit.expires > start) {
    return { ...hit.response, cached: true, latencyMs: 0 };
  }

  // Default local implementation — no external backend, returns empty context
  // so pipeline doesn't block. Real deployments override via vi.doMock in tests
  // or DI in production.
  const response: AwarenessResponse = {
    ok: true,
    query: `${req.dispatcher}/${req.action} ${req.keywords.join(" ")}`,
    summary: [],
    topMatches: [],
    suggestions: [],
    latencyMs: Date.now() - start,
    cached: false,
  };

  // LRU-ish eviction
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, { response, expires: start + TTL_MS });
  return response;
}

/**
 * Clear all cached awareness responses (test helper).
 */
export function clearAwarenessCache(): void {
  cache.clear();
}

/**
 * Get current cache size (test helper).
 */
export function awarenessCacheSize(): number {
  return cache.size;
}
