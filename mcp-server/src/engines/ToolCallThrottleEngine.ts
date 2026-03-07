/**
 * ToolCallThrottleEngine - Rate-limits tool calls
 *
 * Prevents runaway token consumption by tracking call rates per tool
 * and enforcing configurable limits. Supports burst allowance and
 * cooldown periods.
 *
 * @version 1.0.0
 */

export interface ThrottleRule {
  tool: string;
  maxPerMinute: number;
  burstLimit: number;
  cooldownMs: number;
}

export interface ThrottleCheck {
  allowed: boolean;
  reason?: string;
  callsInWindow: number;
  limit: number;
  cooldownRemainingMs?: number;
}

export interface ThrottleStats {
  totalChecks: number;
  totalThrottled: number;
  throttleRate: number;
  perTool: Array<{ tool: string; checks: number; throttled: number }>;
}

const DEFAULT_RULES: ThrottleRule[] = [
  { tool: "Read", maxPerMinute: 20, burstLimit: 5, cooldownMs: 3000 },
  { tool: "Grep", maxPerMinute: 15, burstLimit: 4, cooldownMs: 4000 },
  { tool: "Glob", maxPerMinute: 15, burstLimit: 4, cooldownMs: 4000 },
  { tool: "Edit", maxPerMinute: 10, burstLimit: 3, cooldownMs: 5000 },
  { tool: "Bash", maxPerMinute: 10, burstLimit: 3, cooldownMs: 5000 },
  { tool: "WebFetch", maxPerMinute: 5, burstLimit: 2, cooldownMs: 10000 },
  { tool: "WebSearch", maxPerMinute: 5, burstLimit: 2, cooldownMs: 10000 },
  { tool: "Agent", maxPerMinute: 3, burstLimit: 1, cooldownMs: 20000 },
];

export class ToolCallThrottleEngine {
  private rules: Map<string, ThrottleRule>;
  private callLog: Array<{ tool: string; timestamp: number }> = [];
  private cooldowns = new Map<string, number>();
  private totalChecks = 0;
  private totalThrottled = 0;
  private perToolStats = new Map<string, { checks: number; throttled: number }>();
  private defaultRule: ThrottleRule;

  constructor() {
    this.rules = new Map();
    for (const rule of DEFAULT_RULES) {
      this.rules.set(rule.tool, rule);
    }
    this.defaultRule = { tool: "*", maxPerMinute: 12, burstLimit: 4, cooldownMs: 5000 };
  }

  /**
   * Check if a tool call should be allowed.
   */
  check(tool: string): ThrottleCheck {
    this.totalChecks++;
    const stats = this.perToolStats.get(tool) ?? { checks: 0, throttled: 0 };
    stats.checks++;
    this.perToolStats.set(tool, stats);

    const now = Date.now();
    const rule = this.rules.get(tool) ?? this.defaultRule;

    // Check cooldown
    const cooldownEnd = this.cooldowns.get(tool) ?? 0;
    if (now < cooldownEnd) {
      this.totalThrottled++;
      stats.throttled++;
      return {
        allowed: false,
        reason: tool + " is in cooldown for " + Math.ceil((cooldownEnd - now) / 1000) + "s",
        callsInWindow: this.countRecent(tool, 60000),
        limit: rule.maxPerMinute,
        cooldownRemainingMs: cooldownEnd - now,
      };
    }

    // Check rate limit
    const recentCount = this.countRecent(tool, 60000);
    if (recentCount >= rule.maxPerMinute) {
      this.totalThrottled++;
      stats.throttled++;
      this.cooldowns.set(tool, now + rule.cooldownMs);
      return {
        allowed: false,
        reason: tool + " exceeded " + rule.maxPerMinute + "/min limit",
        callsInWindow: recentCount,
        limit: rule.maxPerMinute,
      };
    }

    // Check burst (calls in last 10 seconds)
    const burstCount = this.countRecent(tool, 10000);
    if (burstCount >= rule.burstLimit) {
      this.totalThrottled++;
      stats.throttled++;
      return {
        allowed: false,
        reason: tool + " burst limit (" + rule.burstLimit + " in 10s) reached",
        callsInWindow: recentCount,
        limit: rule.maxPerMinute,
      };
    }

    // Record and allow
    this.callLog.push({ tool, timestamp: now });
    this.trimLog();

    return {
      allowed: true,
      callsInWindow: recentCount + 1,
      limit: rule.maxPerMinute,
    };
  }

  /**
   * Set a custom throttle rule.
   */
  setRule(tool: string, maxPerMinute: number, burstLimit = 3, cooldownMs = 5000): void {
    this.rules.set(tool, { tool, maxPerMinute, burstLimit, cooldownMs });
  }

  /**
   * Get throttle statistics.
   */
  stats(): ThrottleStats {
    const perTool = Array.from(this.perToolStats.entries())
      .map(([tool, data]) => ({ tool, ...data }))
      .sort((a, b) => b.throttled - a.throttled);

    return {
      totalChecks: this.totalChecks,
      totalThrottled: this.totalThrottled,
      throttleRate: this.totalChecks > 0
        ? Math.round((this.totalThrottled / this.totalChecks) * 100)
        : 0,
      perTool,
    };
  }

  /**
   * One-liner status.
   */
  oneLiner(): string {
    const s = this.stats();
    return (
      "Throttle: " +
      s.totalChecks +
      " checks, " +
      s.totalThrottled +
      " throttled (" +
      s.throttleRate +
      "%)"
    );
  }

  /**
   * Reset all state.
   */
  reset(): void {
    this.callLog = [];
    this.cooldowns.clear();
    this.totalChecks = 0;
    this.totalThrottled = 0;
    this.perToolStats.clear();
  }

  private countRecent(tool: string, windowMs: number): number {
    const cutoff = Date.now() - windowMs;
    return this.callLog.filter((c) => c.tool === tool && c.timestamp > cutoff).length;
  }

  private trimLog(): void {
    const cutoff = Date.now() - 120000;
    this.callLog = this.callLog.filter((c) => c.timestamp > cutoff);
  }
}

export const toolCallThrottleEngine = new ToolCallThrottleEngine();
