/**
 * PromptCachingEngine
 * ====================
 *
 * AGENT-MS5 U-AGT19 — Wraps system prompts and common context chunks with
 * Anthropic prompt caching markers (cache_control) so LLMEngine can pass
 * them directly to the SDK without each caller knowing the marker format.
 *
 * Anthropic prompt caching spec (condensed):
 *   - system prompt blocks may be marked { type:"ephemeral" } to cache
 *   - up to 4 cache breakpoints per request
 *   - cache TTL = 5 minutes
 *   - first request after cache miss writes; subsequent reads within TTL hit
 *   - cached tokens are billed at 10% of input cost for reads, 125% for writes
 *
 * This engine does NOT make API calls — it produces the shape of the system
 * array so any consumer (LLMEngine, AgentDispatcher, ExtendedThinkingBridge)
 * can hand it to the Anthropic SDK unchanged.
 *
 * Usage:
 *   const { system, cache_breakpoints } = promptCachingEngine.buildCachedSystem({
 *     stable: [basePrompt, toolCatalog],   // cached aggressively
 *     volatile: [recentMemory],            // not cached
 *   });
 *   anthropic.messages.create({ system, messages });
 *
 * @module engines/PromptCachingEngine
 * @milestone AGENT-MS5 (U-AGT19)
 * @version 1.0.0
 */

// ── Types ────────────────────────────────────────────────────────────────

/** Matches the Anthropic SDK system block shape. */
export interface SystemBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

export interface CachedSystemResult {
  /** System array ready to pass to anthropic.messages.create */
  system: SystemBlock[];
  /** How many blocks were marked with cache_control */
  cache_breakpoints: number;
  /** Total char length of all blocks */
  total_chars: number;
  /** Rough token estimate */
  token_estimate: number;
  /** Whether we stayed within Anthropic's 4-breakpoint limit */
  within_breakpoint_limit: boolean;
}

export interface CacheStats {
  /** Requests made */
  total_requests: number;
  /** Number of requests that had at least one cache hit */
  cache_hits: number;
  /** Cache hit rate (0..1) */
  hit_rate: number;
  /** Total tokens read from cache */
  cached_input_tokens: number;
  /** Total tokens written to cache */
  cache_creation_tokens: number;
  /** Cumulative cost savings estimate (in tokens, using Anthropic pricing) */
  estimated_token_savings: number;
}

export interface ObservedUsage {
  /** From Anthropic response.usage.cache_read_input_tokens */
  cache_read_input_tokens?: number;
  /** From Anthropic response.usage.cache_creation_input_tokens */
  cache_creation_input_tokens?: number;
  /** Regular input tokens */
  input_tokens?: number;
  /** Output tokens */
  output_tokens?: number;
}

export interface BuildOptions {
  /** Max cache breakpoints (Anthropic limit = 4) */
  maxBreakpoints?: number;
  /** Minimum chars for a block to be worth caching (heuristic: 1024 tokens ~ 4096 chars) */
  minCacheChars?: number;
}

// ── Constants ────────────────────────────────────────────────────────────

/** Anthropic's hard limit on cache breakpoints per request. */
export const ANTHROPIC_MAX_CACHE_BREAKPOINTS = 4;

/** Minimum block size below which caching overhead exceeds savings (≈1024 tokens). */
export const DEFAULT_MIN_CACHE_CHARS = 4096;

/** Anthropic prompt caching cost ratios (for cost-savings estimation). */
const INPUT_TOKEN_COST = 1.0;
const CACHE_READ_COST = 0.1;
const CACHE_WRITE_COST = 1.25;

// ── Engine Implementation ───────────────────────────────────────────────

class PromptCachingEngineImpl {
  private stats: CacheStats = {
    total_requests: 0,
    cache_hits: 0,
    hit_rate: 0,
    cached_input_tokens: 0,
    cache_creation_tokens: 0,
    estimated_token_savings: 0,
  };

  /**
   * Build a cache-annotated system array.
   *
   * @param input Stable blocks (will be cached if large enough) + volatile
   *              blocks (never cached, appended after cache breakpoints)
   * @param options Optional overrides for breakpoint count and size threshold
   */
  buildCachedSystem(
    input: { stable: string[]; volatile?: string[] },
    options: BuildOptions = {}
  ): CachedSystemResult {
    const maxBreakpoints = Math.min(
      options.maxBreakpoints ?? ANTHROPIC_MAX_CACHE_BREAKPOINTS,
      ANTHROPIC_MAX_CACHE_BREAKPOINTS
    );
    const minCacheChars = options.minCacheChars ?? DEFAULT_MIN_CACHE_CHARS;

    const blocks: SystemBlock[] = [];
    let breakpointsUsed = 0;

    // Stable blocks, biggest first — cache the ones worth caching
    const stableOrdered = [...input.stable]
      .filter((s) => s.length > 0)
      .sort((a, b) => b.length - a.length);

    for (const text of stableOrdered) {
      const block: SystemBlock = { type: "text", text };
      if (breakpointsUsed < maxBreakpoints && text.length >= minCacheChars) {
        block.cache_control = { type: "ephemeral" };
        breakpointsUsed++;
      }
      blocks.push(block);
    }

    // Volatile blocks — never cached
    for (const text of input.volatile ?? []) {
      if (text.length === 0) continue;
      blocks.push({ type: "text", text });
    }

    const total_chars = blocks.reduce((sum, b) => sum + b.text.length, 0);
    const token_estimate = Math.ceil(total_chars / 4);

    return {
      system: blocks,
      cache_breakpoints: breakpointsUsed,
      total_chars,
      token_estimate,
      within_breakpoint_limit: breakpointsUsed <= ANTHROPIC_MAX_CACHE_BREAKPOINTS,
    };
  }

  /**
   * Record usage returned by Anthropic SDK and update running stats.
   * Call after every messages.create() completes.
   */
  recordUsage(usage: ObservedUsage): void {
    this.stats.total_requests++;

    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cacheCreate = usage.cache_creation_input_tokens ?? 0;

    if (cacheRead > 0) {
      this.stats.cache_hits++;
    }

    this.stats.cached_input_tokens += cacheRead;
    this.stats.cache_creation_tokens += cacheCreate;

    // Estimated savings = (what full-input would have cost) − (what cache-read cost)
    // = cacheRead × INPUT_TOKEN_COST − cacheRead × CACHE_READ_COST
    // = cacheRead × (1 − 0.1) = cacheRead × 0.9
    // But subtract write premium: cacheCreate × (CACHE_WRITE_COST − INPUT_TOKEN_COST) = cacheCreate × 0.25
    const readSavings = cacheRead * (INPUT_TOKEN_COST - CACHE_READ_COST);
    const writePremium = cacheCreate * (CACHE_WRITE_COST - INPUT_TOKEN_COST);
    this.stats.estimated_token_savings += readSavings - writePremium;

    this.stats.hit_rate =
      this.stats.total_requests > 0
        ? this.stats.cache_hits / this.stats.total_requests
        : 0;
  }

  /**
   * Get current cache stats (safe to call at any time).
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset stats — useful for benchmarking and test isolation.
   */
  resetStats(): void {
    this.stats = {
      total_requests: 0,
      cache_hits: 0,
      hit_rate: 0,
      cached_input_tokens: 0,
      cache_creation_tokens: 0,
      estimated_token_savings: 0,
    };
  }

  /**
   * Convenience: wrap a single system prompt + optional volatile suffix.
   */
  wrapSystemPrompt(
    systemPrompt: string,
    volatileTail?: string,
    options?: BuildOptions
  ): CachedSystemResult {
    return this.buildCachedSystem(
      {
        stable: [systemPrompt],
        volatile: volatileTail ? [volatileTail] : [],
      },
      options
    );
  }

  /**
   * Estimate the break-even point for caching: minimum cache_read count
   * at which caching pays off, given a block size.
   *
   * @param blockTokens Size of the cached block in tokens
   * @returns Number of subsequent reads needed to amortize the write premium
   */
  breakEvenReads(blockTokens: number): number {
    // Cost of first write: blockTokens × 1.25
    // Cost of normal input: blockTokens × 1.0
    // Cost of cache read: blockTokens × 0.1
    // Break-even: 1.25 + n × 0.1 = 1.0 + n × 1.0
    //             0.25 = n × 0.9
    //             n ≈ 0.28 — cache pays off after 1 repeat on same block
    // But for very small blocks the overhead doesn't kick in — just return 1.
    if (blockTokens < 1024) return Infinity; // below min cacheable size
    return 1;
  }
}

// ── Singleton Export ────────────────────────────────────────────────────

export const promptCachingEngine = new PromptCachingEngineImpl();
export type { PromptCachingEngineImpl };
