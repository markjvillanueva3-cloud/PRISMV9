/**
 * PRISM Bot Configuration
 *
 * Environment variables and defaults for Discord/Slack integration.
 * Rate limiting, context TTL, output constraints, notification routing.
 *
 * @module bot/bot-config
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  maxCalls: number;
  windowMs: number;
}

export const BOT_CONFIG = {
  // Discord connection
  discord: {
    token:    process.env.DISCORD_BOT_TOKEN  || '',
    clientId: process.env.DISCORD_CLIENT_ID  || '',
    guildId:  process.env.DISCORD_GUILD_ID   || '', // For dev; empty = global commands
  },

  // Slack connection
  slack: {
    botToken:      process.env.SLACK_BOT_TOKEN      || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET  || '',
    appToken:      process.env.SLACK_APP_TOKEN       || '', // Socket mode
  },

  // Rate limiting — 3 tiers to prevent abuse
  rateLimits: {
    perUser:    { maxCalls: 30,  windowMs: 60_000 } as RateLimitConfig,  // 30/min per user
    perChannel: { maxCalls: 60,  windowMs: 60_000 } as RateLimitConfig,  // 60/min per channel
    global:     { maxCalls: 300, windowMs: 60_000 } as RateLimitConfig,  // 300/min total
  },

  // Per-channel context persistence
  context: {
    maxChannels:          1_000,
    contextTtlMs:         24 * 60 * 60 * 1_000,  // 24 hours
    maxHistoryPerChannel: 50,
    pruneIntervalMs:      60 * 60 * 1_000,        // Prune check every hour
  },

  // Output formatting (Discord/Slack embed constraints)
  output: {
    maxEmbedFields:  25,
    maxFieldValue:   1_024,
    maxDescription:  4_096,
    maxMessageLen:   2_000,
    compactMode:     true,    // Phone-friendly condensed output
    codeBlockLang:   'yaml',  // For structured result blocks
  },

  // Notification channels — which events get forwarded to messaging
  notifications: {
    buildFailures:   true,
    testRegressions: true,
    catalogUpdates:  false,
    cronResults:     false,
    alarmAlerts:     true,   // Forward machine alarm events
    wearAlerts:      true,   // Forward tool wear threshold events
  },

  // Webhook receiver
  webhook: {
    port:    Number(process.env.PRISM_WEBHOOK_PORT) || 18362,
    enabled: process.env.PRISM_WEBHOOK_ENABLED !== 'false',
  },
} as const;

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const callCounts = new Map<string, RateLimitEntry>();

/**
 * Check and consume a rate limit token.
 * @returns true if the call is allowed, false if rate-limited.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const entry = callCounts.get(key);

  if (!entry || now > entry.resetAt) {
    callCounts.set(key, { count: 1, resetAt: now + config.windowMs });
    return true;
  }

  if (entry.count >= config.maxCalls) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Multi-tier rate limit check: user -> channel -> global.
 * Returns { allowed, reason } so the caller can provide feedback.
 */
export function checkAllRateLimits(
  userId: string,
  channelId: string,
): { allowed: boolean; reason?: string } {
  if (!checkRateLimit(`user:${userId}`, BOT_CONFIG.rateLimits.perUser)) {
    return { allowed: false, reason: `Rate limited: max ${BOT_CONFIG.rateLimits.perUser.maxCalls} calls/min per user` };
  }
  if (!checkRateLimit(`channel:${channelId}`, BOT_CONFIG.rateLimits.perChannel)) {
    return { allowed: false, reason: `Rate limited: max ${BOT_CONFIG.rateLimits.perChannel.maxCalls} calls/min per channel` };
  }
  if (!checkRateLimit('global', BOT_CONFIG.rateLimits.global)) {
    return { allowed: false, reason: `Rate limited: global capacity reached` };
  }
  return { allowed: true };
}

/**
 * Get remaining calls for a key within its current window.
 */
export function getRateLimitRemaining(key: string, config: RateLimitConfig): number {
  const now = Date.now();
  const entry = callCounts.get(key);
  if (!entry || now > entry.resetAt) return config.maxCalls;
  return Math.max(0, config.maxCalls - entry.count);
}

/**
 * Reset rate limit state (for testing or admin commands).
 */
export function resetRateLimits(): void {
  callCounts.clear();
}
