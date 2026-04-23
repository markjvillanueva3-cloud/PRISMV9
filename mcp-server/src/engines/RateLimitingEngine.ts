/**
 * RateLimitingEngine — U-LPR-SEC05
 *
 * Token bucket rate limiting with:
 * - Per-tenant, per-user, per-IP rate limits
 * - Sliding window counters
 * - Burst allowance with token refill
 * - Rate limit headers (X-RateLimit-*)
 * - Adaptive throttling based on load
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC05
 * @phase PHASE-9 (Security + Compliance)
 */

import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export type RateLimitScope = 'tenant' | 'user' | 'ip' | 'endpoint' | 'global';

export interface RateLimitConfig {
  id: string;
  scope: RateLimitScope;
  scopeId: string;
  maxRequests: number;
  windowMs: number;
  burstLimit?: number;
  refillRate?: number;
  enabled: boolean;
  priority: number;
}

export interface TokenBucket {
  scopeKey: string;
  tokens: number;
  maxTokens: number;
  lastRefill: number;
  refillRate: number;
}

export interface SlidingWindowCounter {
  scopeKey: string;
  counts: { timestamp: number; count: number }[];
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfter?: number;
  headers: Record<string, string>;
}

export interface RateLimitRequest {
  tenantId: string;
  userId?: string;
  ip?: string;
  endpoint?: string;
  cost?: number;
}

export interface ThrottleState {
  scopeKey: string;
  throttled: boolean;
  throttleUntil: number;
  consecutiveViolations: number;
  lastViolation: number;
}

export interface RateLimitStats {
  totalRequests: number;
  allowedRequests: number;
  deniedRequests: number;
  activeConfigs: number;
  activeBuckets: number;
  throttledScopes: number;
  requestsByScope: Record<string, number>;
}

// ============================================================================
// ENGINE
// ============================================================================

export class RateLimitingEngine {
  private configs: Map<string, RateLimitConfig> = new Map();
  private buckets: Map<string, TokenBucket> = new Map();
  private slidingWindows: Map<string, SlidingWindowCounter> = new Map();
  private throttleStates: Map<string, ThrottleState> = new Map();
  private stats = {
    totalRequests: 0,
    allowedRequests: 0,
    deniedRequests: 0,
    requestsByScope: {} as Record<string, number>,
  };

  /**
   * Creates a rate limit configuration.
   */
  createConfig(config: Omit<RateLimitConfig, 'id'>): RateLimitConfig {
    const id = `${config.scope}:${config.scopeId}`;
    const fullConfig: RateLimitConfig = {
      ...config,
      id,
      burstLimit: config.burstLimit ?? config.maxRequests,
      refillRate: config.refillRate ?? config.maxRequests / (config.windowMs / 1000),
    };

    this.configs.set(id, fullConfig);
    log.info(`[RateLimit] Config created: ${id} (${config.maxRequests}/${config.windowMs}ms)`);
    return fullConfig;
  }

  /**
   * Updates a rate limit configuration.
   */
  updateConfig(id: string, updates: Partial<Omit<RateLimitConfig, 'id'>>): RateLimitConfig | null {
    const existing = this.configs.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates };
    this.configs.set(id, updated);
    return updated;
  }

  /**
   * Deletes a rate limit configuration.
   */
  deleteConfig(id: string): boolean {
    return this.configs.delete(id);
  }

  /**
   * Gets a specific configuration.
   */
  getConfig(id: string): RateLimitConfig | null {
    return this.configs.get(id) || null;
  }

  /**
   * Lists all configurations.
   */
  listConfigs(scope?: RateLimitScope): RateLimitConfig[] {
    let configs = [...this.configs.values()];
    if (scope) {
      configs = configs.filter(c => c.scope === scope);
    }
    return configs.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Checks if a request is allowed under rate limits.
   * Uses token bucket algorithm for smooth rate limiting.
   */
  checkLimit(request: RateLimitRequest): RateLimitResult {
    this.stats.totalRequests++;
    const cost = request.cost ?? 1;

    // Find applicable configs in priority order
    const applicableConfigs = this.findApplicableConfigs(request);

    // No configs = allow
    if (applicableConfigs.length === 0) {
      this.stats.allowedRequests++;
      return this.allowResult(Infinity, Infinity, Date.now() + 60000);
    }

    // Check each config
    for (const config of applicableConfigs) {
      if (!config.enabled) continue;

      const scopeKey = this.buildScopeKey(config, request);
      this.stats.requestsByScope[scopeKey] = (this.stats.requestsByScope[scopeKey] || 0) + 1;

      // Check throttle state
      const throttleState = this.throttleStates.get(scopeKey);
      if (throttleState && throttleState.throttled && Date.now() < throttleState.throttleUntil) {
        this.stats.deniedRequests++;
        return this.denyResult(
          0,
          config.maxRequests,
          throttleState.throttleUntil,
          Math.ceil((throttleState.throttleUntil - Date.now()) / 1000)
        );
      }

      // Get or create bucket
      const bucket = this.getOrCreateBucket(scopeKey, config);

      // Refill tokens
      this.refillBucket(bucket);

      // Check if we have enough tokens
      if (bucket.tokens < cost) {
        this.stats.deniedRequests++;
        this.recordViolation(scopeKey);

        const waitTime = Math.ceil((cost - bucket.tokens) / bucket.refillRate * 1000);
        return this.denyResult(
          Math.floor(bucket.tokens),
          config.maxRequests,
          Date.now() + waitTime,
          Math.ceil(waitTime / 1000)
        );
      }

      // Consume tokens
      bucket.tokens -= cost;
    }

    this.stats.allowedRequests++;

    // Return result from first (highest priority) config
    const primaryConfig = applicableConfigs[0];
    const primaryKey = this.buildScopeKey(primaryConfig, request);
    const primaryBucket = this.buckets.get(primaryKey)!;

    return this.allowResult(
      Math.floor(primaryBucket.tokens),
      primaryConfig.maxRequests,
      Date.now() + primaryConfig.windowMs
    );
  }

  /**
   * Checks rate limit using sliding window algorithm.
   * More accurate for bursts but more memory intensive.
   */
  checkSlidingWindow(request: RateLimitRequest): RateLimitResult {
    this.stats.totalRequests++;
    const cost = request.cost ?? 1;

    const applicableConfigs = this.findApplicableConfigs(request);
    if (applicableConfigs.length === 0) {
      this.stats.allowedRequests++;
      return this.allowResult(Infinity, Infinity, Date.now() + 60000);
    }

    for (const config of applicableConfigs) {
      if (!config.enabled) continue;

      const scopeKey = this.buildScopeKey(config, request);
      const window = this.getOrCreateWindow(scopeKey, config.windowMs);

      // Clean old entries
      const cutoff = Date.now() - config.windowMs;
      window.counts = window.counts.filter(c => c.timestamp > cutoff);

      // Count current window
      const currentCount = window.counts.reduce((sum, c) => sum + c.count, 0);

      if (currentCount + cost > config.maxRequests) {
        this.stats.deniedRequests++;
        this.recordViolation(scopeKey);

        const oldestEntry = window.counts[0];
        const resetAt = oldestEntry ? oldestEntry.timestamp + config.windowMs : Date.now() + config.windowMs;

        return this.denyResult(
          config.maxRequests - currentCount,
          config.maxRequests,
          resetAt,
          Math.ceil((resetAt - Date.now()) / 1000)
        );
      }

      // Record request
      window.counts.push({ timestamp: Date.now(), count: cost });
    }

    this.stats.allowedRequests++;

    const primaryConfig = applicableConfigs[0];
    const primaryKey = this.buildScopeKey(primaryConfig, request);
    const primaryWindow = this.slidingWindows.get(primaryKey)!;
    const count = primaryWindow.counts.reduce((sum, c) => sum + c.count, 0);

    return this.allowResult(
      primaryConfig.maxRequests - count,
      primaryConfig.maxRequests,
      Date.now() + primaryConfig.windowMs
    );
  }

  /**
   * Manually throttles a scope.
   */
  throttle(scopeKey: string, durationMs: number): void {
    const state = this.throttleStates.get(scopeKey) || {
      scopeKey,
      throttled: false,
      throttleUntil: 0,
      consecutiveViolations: 0,
      lastViolation: 0,
    };

    state.throttled = true;
    state.throttleUntil = Date.now() + durationMs;
    this.throttleStates.set(scopeKey, state);

    log.warn(`[RateLimit] Throttled: ${scopeKey} for ${durationMs}ms`);
  }

  /**
   * Removes throttle from a scope.
   */
  unthrottle(scopeKey: string): boolean {
    const state = this.throttleStates.get(scopeKey);
    if (!state) return false;

    state.throttled = false;
    state.throttleUntil = 0;
    state.consecutiveViolations = 0;
    return true;
  }

  /**
   * Gets throttle state for a scope.
   */
  getThrottleState(scopeKey: string): ThrottleState | null {
    return this.throttleStates.get(scopeKey) || null;
  }

  /**
   * Resets rate limit state for a scope.
   */
  resetScope(scopeKey: string): void {
    this.buckets.delete(scopeKey);
    this.slidingWindows.delete(scopeKey);
    this.throttleStates.delete(scopeKey);
  }

  /**
   * Gets rate limit statistics.
   */
  getStats(): RateLimitStats {
    const throttledCount = [...this.throttleStates.values()].filter(
      s => s.throttled && Date.now() < s.throttleUntil
    ).length;

    return {
      totalRequests: this.stats.totalRequests,
      allowedRequests: this.stats.allowedRequests,
      deniedRequests: this.stats.deniedRequests,
      activeConfigs: this.configs.size,
      activeBuckets: this.buckets.size,
      throttledScopes: throttledCount,
      requestsByScope: { ...this.stats.requestsByScope },
    };
  }

  /**
   * Clears all state (for testing).
   */
  clear(): void {
    this.configs.clear();
    this.buckets.clear();
    this.slidingWindows.clear();
    this.throttleStates.clear();
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      deniedRequests: 0,
      requestsByScope: {},
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private findApplicableConfigs(request: RateLimitRequest): RateLimitConfig[] {
    const configs: RateLimitConfig[] = [];

    for (const config of this.configs.values()) {
      if (!config.enabled) continue;

      switch (config.scope) {
        case 'global':
          if (config.scopeId === '*') configs.push(config);
          break;
        case 'tenant':
          if (config.scopeId === request.tenantId || config.scopeId === '*') configs.push(config);
          break;
        case 'user':
          if (request.userId && (config.scopeId === request.userId || config.scopeId === '*')) configs.push(config);
          break;
        case 'ip':
          if (request.ip && (config.scopeId === request.ip || config.scopeId === '*')) configs.push(config);
          break;
        case 'endpoint':
          if (request.endpoint && (config.scopeId === request.endpoint || config.scopeId === '*')) configs.push(config);
          break;
      }
    }

    return configs.sort((a, b) => b.priority - a.priority);
  }

  private buildScopeKey(config: RateLimitConfig, request: RateLimitRequest): string {
    switch (config.scope) {
      case 'global':
        return 'global:*';
      case 'tenant':
        return `tenant:${request.tenantId}`;
      case 'user':
        return `user:${request.userId}`;
      case 'ip':
        return `ip:${request.ip}`;
      case 'endpoint':
        return `endpoint:${request.endpoint}`;
      default:
        return `${config.scope}:${config.scopeId}`;
    }
  }

  private getOrCreateBucket(scopeKey: string, config: RateLimitConfig): TokenBucket {
    let bucket = this.buckets.get(scopeKey);
    if (!bucket) {
      bucket = {
        scopeKey,
        tokens: config.burstLimit ?? config.maxRequests,
        maxTokens: config.burstLimit ?? config.maxRequests,
        lastRefill: Date.now(),
        refillRate: config.refillRate ?? config.maxRequests / (config.windowMs / 1000),
      };
      this.buckets.set(scopeKey, bucket);
    }
    return bucket;
  }

  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    const refillAmount = elapsed * bucket.refillRate;

    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + refillAmount);
    bucket.lastRefill = now;
  }

  private getOrCreateWindow(scopeKey: string, windowMs: number): SlidingWindowCounter {
    let window = this.slidingWindows.get(scopeKey);
    if (!window) {
      window = {
        scopeKey,
        counts: [],
        windowMs,
      };
      this.slidingWindows.set(scopeKey, window);
    }
    return window;
  }

  private recordViolation(scopeKey: string): void {
    let state = this.throttleStates.get(scopeKey);
    if (!state) {
      state = {
        scopeKey,
        throttled: false,
        throttleUntil: 0,
        consecutiveViolations: 0,
        lastViolation: 0,
      };
    }

    state.consecutiveViolations++;
    state.lastViolation = Date.now();

    // Auto-throttle after 10 consecutive violations
    if (state.consecutiveViolations >= 10 && !state.throttled) {
      const throttleDuration = Math.min(state.consecutiveViolations * 1000, 60000);
      state.throttled = true;
      state.throttleUntil = Date.now() + throttleDuration;
      log.warn(`[RateLimit] Auto-throttle: ${scopeKey} after ${state.consecutiveViolations} violations`);
    }

    this.throttleStates.set(scopeKey, state);
  }

  private allowResult(remaining: number, limit: number, resetAt: number): RateLimitResult {
    return {
      allowed: true,
      remaining: Math.max(0, remaining),
      limit,
      resetAt,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(Math.max(0, Math.floor(remaining))),
        'X-RateLimit-Reset': String(Math.floor(resetAt / 1000)),
      },
    };
  }

  private denyResult(remaining: number, limit: number, resetAt: number, retryAfter: number): RateLimitResult {
    return {
      allowed: false,
      remaining: Math.max(0, remaining),
      limit,
      resetAt,
      retryAfter,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(resetAt / 1000)),
        'Retry-After': String(retryAfter),
      },
    };
  }
}

export const rateLimitingEngine = new RateLimitingEngine();
