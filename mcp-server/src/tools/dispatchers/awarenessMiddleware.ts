/**
 * Dispatcher Awareness Middleware — AI-AWARE-HARDEN/U-AWR12
 *
 * Non-invasive helper that dispatchers can call at the start of an action
 * to consult UnifiedAwarenessOrchestrator and attach a compact awareness
 * summary to the handler's result metadata. Does not block execution —
 * just surfaces "things PRISM already knows about this topic."
 *
 * Design goals:
 *   - <50ms overhead per dispatcher call (exit gate criterion)
 *   - Opt-in — dispatchers decide per-action whether to consult
 *   - Fails open — if the orchestrator throws, the action still runs
 *   - Results cached for 30s per (dispatcher, action) tuple
 *
 * Usage pattern:
 *
 *   import { consultAwareness } from "./awarenessMiddleware.js";
 *   const awareness = await consultAwareness({
 *     dispatcher: "calc",
 *     action: "speed_feed_calc",
 *     keywords: ["speed", "feed", "4140", "steel"],
 *   });
 *   // awareness.topMatches / awareness.suggestions / awareness.latencyMs
 *   return { ...result, _awareness: awareness.summary };
 */

import { log } from "../../utils/Logger.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AwarenessConsultInput {
  /** Dispatcher name (e.g., "calc", "cam", "aiReasoning") */
  dispatcher: string;
  /** Action being dispatched */
  action: string;
  /** Search keywords (2-6 short terms work best) */
  keywords: string[];
  /** Optional: limit results (default 5) */
  limit?: number;
  /** Optional: skip cache (for benchmarking) */
  noCache?: boolean;
}

export interface AwarenessConsultResult {
  /** Whether the consult ran successfully */
  ok: boolean;
  /** Query used */
  query: string;
  /** Compact match summary for handler result metadata */
  summary: string[];
  /** Top 5 raw matches (if available) */
  topMatches: Array<{ domain: string; name: string; confidence: number }>;
  /** Short suggestion list (if orchestrator provides) */
  suggestions: string[];
  /** Wall-clock time in ms */
  latencyMs: number;
  /** Whether result came from cache */
  cached: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CACHE — 30-second TTL, keyed by (dispatcher, action, keywords)
// ═══════════════════════════════════════════════════════════════════════════

interface CacheEntry {
  result: AwarenessConsultResult;
  expiresAt: number;
}

const CACHE: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 30_000;
const MAX_CACHE_SIZE = 500;

function cacheKey(input: AwarenessConsultInput): string {
  const kw = [...input.keywords].sort().join("|");
  return `${input.dispatcher}::${input.action}::${kw}::${input.limit ?? 5}`;
}

function pruneCache(): void {
  if (CACHE.size <= MAX_CACHE_SIZE) return;
  const now = Date.now();
  for (const [key, entry] of CACHE.entries()) {
    if (entry.expiresAt <= now) CACHE.delete(key);
    if (CACHE.size <= MAX_CACHE_SIZE) break;
  }
  // Still too big? Drop oldest.
  if (CACHE.size > MAX_CACHE_SIZE) {
    const excess = CACHE.size - MAX_CACHE_SIZE;
    const keys = Array.from(CACHE.keys()).slice(0, excess);
    for (const k of keys) CACHE.delete(k);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Consult the awareness orchestrator for a dispatcher action.
 * Always resolves — never throws. Attach result to handler metadata.
 */
export async function consultAwareness(
  input: AwarenessConsultInput,
): Promise<AwarenessConsultResult> {
  const t0 = Date.now();
  const key = cacheKey(input);

  if (!input.noCache) {
    const hit = CACHE.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return { ...hit.result, cached: true, latencyMs: Date.now() - t0 };
    }
  }

  const query = input.keywords.join(" ").trim() || input.action;
  const limit = input.limit ?? 5;

  try {
    const { unifiedAwarenessOrchestrator } = await import(
      "../../engines/UnifiedAwarenessOrchestrator.js"
    );
    const qResult = await unifiedAwarenessOrchestrator.query({
      domain: "all",
      query,
      limit,
    });

    const topMatches = (qResult.matches ?? []).slice(0, limit).map(m => ({
      domain: m.domain,
      name: m.name,
      confidence: m.confidence,
    }));

    const summary: string[] = [];
    for (const m of topMatches.slice(0, 3)) {
      summary.push(`[${m.domain}] ${m.name} (${Math.round(m.confidence * 100)}%)`);
    }

    const result: AwarenessConsultResult = {
      ok: true,
      query,
      summary,
      topMatches,
      suggestions: (qResult.suggestions ?? []).slice(0, 3),
      latencyMs: Date.now() - t0,
      cached: false,
    };

    CACHE.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    pruneCache();
    return result;
  } catch (err) {
    // Fail open — return empty awareness result
    log.debug(`[awareness] consult failed for ${input.dispatcher}:${input.action}: ${err}`);
    return {
      ok: false,
      query,
      summary: [],
      topMatches: [],
      suggestions: [],
      latencyMs: Date.now() - t0,
      cached: false,
    };
  }
}

/**
 * Flush the awareness cache (used by tests).
 */
export function clearAwarenessCache(): void {
  CACHE.clear();
}

/**
 * Peek at the cache size (for monitoring / tests).
 */
export function awarenessCacheSize(): number {
  return CACHE.size;
}
