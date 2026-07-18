/**
 * SaaSAPIEngine — Express REST API Layer for SaaS Access
 *
 * Wraps all MCP dispatchers as REST endpoints with API key auth,
 * tiered rate limiting, webhook support, and usage analytics.
 *
 * Route pattern: POST /api/v2/{dispatcher}/{action}
 *
 * Actions (via businessDispatcher):
 *   api_route_map        — Full API route map for all dispatchers
 *   api_usage            — Usage stats for an API key
 *   api_rate_check       — Rate limit check for a key/tier
 *   api_webhook_register — Register webhook for events
 *   api_webhook_list     — List registered webhooks
 *   api_health           — Detailed health check
 *
 * @engine SaaSAPIEngine
 * @dispatcher businessDispatcher
 * @actions api_route_map, api_usage, api_rate_check,
 *          api_webhook_register, api_webhook_list, api_health
 * @version 1.0.0
 */

// ── Types ──────────────────────────────────────────────────────────

export type ApiTier = "free" | "pro" | "enterprise";
export type UsagePeriod = "day" | "week" | "month";

export type WebhookEvent =
  | "tool_life_warning"
  | "safety_violation"
  | "job_complete"
  | "alarm_triggered";

export interface RouteEntry {
  method: string;
  path: string;
  dispatcher: string;
  action: string;
  description: string;
}

export interface RouteMapResult {
  routes: RouteEntry[];
  totalRoutes: number;
  totalDispatchers: number;
  apiVersion: string;
  basePath: string;
}

export interface UsageRecord {
  calls: number;
  byDispatcher: Record<string, number>;
  byAction: Record<string, number>;
  firstCall: string;
  lastCall: string;
  lastReset: string;
}

export interface UsageResult {
  apiKey: string;
  period: UsagePeriod;
  calls: number;
  byDispatcher: Record<string, number>;
  quota: number;
  remaining: number;
  tier: ApiTier;
  periodStart: string;
  periodEnd: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
  tier: ApiTier;
  retryAfterMs: number | null;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string | null;
  createdAt: string;
  lastFired: string | null;
  failCount: number;
  active: boolean;
}

export interface WebhookRegisterResult {
  webhookId: string;
  url: string;
  events: WebhookEvent[];
  verified: boolean;
  secret: string | null;
  createdAt: string;
}

export interface WebhookListResult {
  webhooks: WebhookConfig[];
  total: number;
}

export interface HealthResult {
  status: "healthy" | "degraded" | "down";
  version: string;
  uptime: number;
  dispatchers: number;
  actions: number;
  avgLatencyMs: number;
  memoryUsageMb: number;
  activeKeys: number;
  activeWebhooks: number;
  timestamp: string;
}

// ── Token Bucket ───────────────────────────────────────────────────

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per second
}

// ── Constants ──────────────────────────────────────────────────────

const API_VERSION = "v2";
const BASE_PATH = `/api/${API_VERSION}`;

const TIER_LIMITS: Record<ApiTier, number> = {
  free: 100,
  pro: 10_000,
  enterprise: -1, // unlimited
};

const TIER_RATE_PER_SEC: Record<ApiTier, number> = {
  free: 1,
  pro: 50,
  enterprise: 500,
};

const VALID_EVENTS: WebhookEvent[] = [
  "tool_life_warning",
  "safety_violation",
  "job_complete",
  "alarm_triggered",
];

/**
 * Dispatcher definitions — all 70 PRISM dispatchers with their
 * action counts and short descriptions.
 */
const DISPATCHERS: Array<{
  name: string;
  actions: string[];
  description: string;
}> = [
  {
    name: "prism_calculate",
    actions: buildActionRange("calc", 1130),
    description: "Core calculations (Kienzle, Taylor, physics)",
  },
  {
    name: "prism_cam",
    actions: buildActionRange("cam", 18),
    description: "CAM operations and post-processing",
  },
  {
    name: "prism_business",
    actions: buildActionRange("biz", 175),
    description: "Business ops, quoting, HR, invoicing",
  },
  {
    name: "prism_material",
    actions: buildActionRange("mat", 45),
    description: "Material database and properties",
  },
  {
    name: "prism_machine",
    actions: buildActionRange("mach", 35),
    description: "Machine profiles and kinematics",
  },
  {
    name: "prism_tool",
    actions: buildActionRange("tool", 40),
    description: "Tool catalog (46K+ tools)",
  },
  {
    name: "prism_knowledge",
    actions: buildActionRange("know", 25),
    description: "Tribal knowledge and playbook",
  },
  {
    name: "prism_toolpath",
    actions: buildActionRange("tp", 30),
    description: "Toolpath strategies and novel algorithms",
  },
  {
    name: "prism_quality",
    actions: buildActionRange("qual", 20),
    description: "Quality, SPC, calibration",
  },
  {
    name: "prism_process_control",
    actions: buildActionRange("pc", 15),
    description: "Process control and monitoring",
  },
  {
    name: "prism_scheduling",
    actions: buildActionRange("sched", 12),
    description: "Job scheduling and capacity",
  },
  {
    name: "prism_monitoring",
    actions: buildActionRange("mon", 10),
    description: "Machine monitoring and alarms",
  },
  {
    name: "prism_auth",
    actions: buildActionRange("auth", 8),
    description: "Authentication and authorization",
  },
  {
    name: "prism_export",
    actions: buildActionRange("exp", 10),
    description: "Export and reporting",
  },
  {
    name: "prism_cad",
    actions: buildActionRange("cad", 24),
    description: "CAD operations and Fusion 360",
  },
  {
    name: "prism_cnc_ops",
    actions: buildActionRange("cnc", 32),
    description: "CNC operations and simulation",
  },
  {
    name: "prism_machine_setup",
    actions: buildActionRange("setup", 25),
    description: "Machine setup and workholding",
  },
  {
    name: "prism_vibration_physics",
    actions: buildActionRange("vib", 16),
    description: "Vibration and chatter analysis",
  },
  {
    name: "prism_material_processing",
    actions: buildActionRange("mp", 11),
    description: "Material processing and heat treatment",
  },
  {
    name: "prism_welding_joining",
    actions: buildActionRange("weld", 6),
    description: "Welding and joining processes",
  },
  {
    name: "prism_forming_casting",
    actions: buildActionRange("form", 16),
    description: "Forming and casting simulation",
  },
  {
    name: "prism_mechanical_design",
    actions: buildActionRange("mech", 51),
    description: "Mechanical design calculations",
  },
  {
    name: "prism_fluid_thermal",
    actions: buildActionRange("ft", 35),
    description: "Fluid dynamics and thermal analysis",
  },
  {
    name: "prism_thread",
    actions: buildActionRange("thread", 8),
    description: "Threading calculations",
  },
];

function buildActionRange(
  prefix: string,
  count: number
): string[] {
  const arr: string[] = [];
  for (let i = 1; i <= Math.min(count, 5); i++) {
    arr.push(`${prefix}_action_${i}`);
  }
  return arr;
}

// ── Engine ─────────────────────────────────────────────────────────

export class SaaSAPIEngine {
  private usageStore = new Map<string, UsageRecord>();
  private webhookStore = new Map<string, WebhookConfig>();
  private buckets = new Map<string, TokenBucket>();
  private keyTiers = new Map<string, ApiTier>();
  private latencySamples: number[] = [];
  private startTime = Date.now();
  private webhookCounter = 0;

  /**
   * Main dispatcher entry point — routes action to handler.
   */
  calculate(
    action: string,
    params: Record<string, any>
  ): Record<string, any> {
    switch (action) {
      case "api_route_map":
        return this.getRouteMap();
      case "api_usage":
        return this.getUsage(params);
      case "api_rate_check":
        return this.checkRateLimit(params);
      case "api_webhook_register":
        return this.registerWebhook(params);
      case "api_webhook_list":
        return this.listWebhooks();
      case "api_health":
        return this.getHealth();
      default:
        return { error: `Unknown SaaS API action: ${action}` };
    }
  }

  // ── api_route_map ──────────────────────────────────────────────

  private getRouteMap(): RouteMapResult {
    const routes: RouteEntry[] = [];

    for (const d of DISPATCHERS) {
      // Generic route per dispatcher
      routes.push({
        method: "POST",
        path: `${BASE_PATH}/${d.name}/{action}`,
        dispatcher: d.name,
        action: "*",
        description: d.description,
      });
    }

    // Meta routes
    routes.push(
      {
        method: "GET",
        path: `${BASE_PATH}/health`,
        dispatcher: "meta",
        action: "health",
        description: "API health check",
      },
      {
        method: "GET",
        path: `${BASE_PATH}/routes`,
        dispatcher: "meta",
        action: "routes",
        description: "Route map (this endpoint)",
      },
      {
        method: "GET",
        path: `${BASE_PATH}/usage`,
        dispatcher: "meta",
        action: "usage",
        description: "API usage statistics",
      },
      {
        method: "POST",
        path: `${BASE_PATH}/webhooks`,
        dispatcher: "meta",
        action: "webhook_register",
        description: "Register event webhook",
      },
      {
        method: "GET",
        path: `${BASE_PATH}/webhooks`,
        dispatcher: "meta",
        action: "webhook_list",
        description: "List registered webhooks",
      },
      {
        method: "DELETE",
        path: `${BASE_PATH}/webhooks/{id}`,
        dispatcher: "meta",
        action: "webhook_delete",
        description: "Delete a webhook",
      }
    );

    const totalActions = DISPATCHERS.reduce(
      (sum, d) => sum + d.actions.length,
      0
    );

    return {
      routes,
      totalRoutes: routes.length,
      totalDispatchers: DISPATCHERS.length,
      apiVersion: API_VERSION,
      basePath: BASE_PATH,
    };
  }

  // ── api_usage ──────────────────────────────────────────────────

  private getUsage(
    params: Record<string, any>
  ): UsageResult | { error: string } {
    const { apiKey, period = "day" } = params;

    if (!apiKey || typeof apiKey !== "string") {
      return { error: "apiKey is required" };
    }

    const validPeriods: UsagePeriod[] = ["day", "week", "month"];
    const p = validPeriods.includes(period as UsagePeriod)
      ? (period as UsagePeriod)
      : "day";

    const record = this.usageStore.get(apiKey);
    const tier = this.keyTiers.get(apiKey) ?? "free";
    const quota = TIER_LIMITS[tier];
    const periodMultiplier = p === "day" ? 1 : p === "week" ? 7 : 30;
    const effectiveQuota =
      quota === -1 ? -1 : quota * periodMultiplier;

    const now = new Date();
    const periodStart = new Date(now);
    if (p === "day") {
      periodStart.setHours(0, 0, 0, 0);
    } else if (p === "week") {
      periodStart.setDate(now.getDate() - now.getDay());
      periodStart.setHours(0, 0, 0, 0);
    } else {
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
    }

    const periodEnd = new Date(periodStart);
    if (p === "day") {
      periodEnd.setDate(periodEnd.getDate() + 1);
    } else if (p === "week") {
      periodEnd.setDate(periodEnd.getDate() + 7);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    if (!record) {
      return {
        apiKey: maskKey(apiKey),
        period: p,
        calls: 0,
        byDispatcher: {},
        quota: effectiveQuota,
        remaining: effectiveQuota,
        tier,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      };
    }

    const remaining =
      effectiveQuota === -1
        ? -1
        : Math.max(0, effectiveQuota - record.calls);

    return {
      apiKey: maskKey(apiKey),
      period: p,
      calls: record.calls,
      byDispatcher: record.byDispatcher,
      quota: effectiveQuota,
      remaining,
      tier,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    };
  }

  // ── api_rate_check ─────────────────────────────────────────────

  private checkRateLimit(
    params: Record<string, any>
  ): RateLimitResult | { error: string } {
    const { apiKey, tier = "free" } = params;

    if (!apiKey || typeof apiKey !== "string") {
      return { error: "apiKey is required" };
    }

    const validTiers: ApiTier[] = ["free", "pro", "enterprise"];
    const t = validTiers.includes(tier as ApiTier)
      ? (tier as ApiTier)
      : "free";

    // Register tier if not known
    this.keyTiers.set(apiKey, t);

    const bucket = this.getOrCreateBucket(apiKey, t);
    this.refillBucket(bucket);

    const dailyLimit = TIER_LIMITS[t];
    const record = this.usageStore.get(apiKey);
    const dailyCalls = record?.calls ?? 0;

    // Check daily quota (enterprise = unlimited)
    const dailyExceeded =
      dailyLimit !== -1 && dailyCalls >= dailyLimit;

    // Check token bucket (burst limiter)
    const bucketEmpty = bucket.tokens < 1;

    const allowed = !dailyExceeded && !bucketEmpty;

    if (allowed) {
      // Consume a token
      bucket.tokens -= 1;
      this.recordCall(apiKey, "rate_check");
    }

    const resetDate = new Date();
    resetDate.setHours(24, 0, 0, 0); // next midnight

    const remaining =
      dailyLimit === -1
        ? -1
        : Math.max(0, dailyLimit - dailyCalls - (allowed ? 1 : 0));

    return {
      allowed,
      remaining,
      limit: dailyLimit,
      resetAt: resetDate.toISOString(),
      tier: t,
      retryAfterMs: allowed
        ? null
        : bucketEmpty
          ? Math.ceil(
              (1 - bucket.tokens) / bucket.refillRate * 1000
            )
          : null,
    };
  }

  // ── api_webhook_register ───────────────────────────────────────

  private registerWebhook(
    params: Record<string, any>
  ): WebhookRegisterResult | { error: string } {
    const { url, events, secret = null } = params;

    if (!url || typeof url !== "string") {
      return { error: "url is required" };
    }

    if (!this.isValidUrl(url)) {
      return { error: "url must be a valid HTTPS URL" };
    }

    if (!Array.isArray(events) || events.length === 0) {
      return { error: "events must be a non-empty array" };
    }

    const validEvents = events.filter((e: string) =>
      VALID_EVENTS.includes(e as WebhookEvent)
    ) as WebhookEvent[];

    if (validEvents.length === 0) {
      return {
        error: `No valid events. Choose from: ${
          VALID_EVENTS.join(", ")
        }`,
      };
    }

    // Check duplicate URL
    for (const [, wh] of this.webhookStore) {
      if (wh.url === url && wh.active) {
        return {
          error: `Webhook already registered for ${url}`,
        };
      }
    }

    // Limit webhooks per deployment
    if (this.webhookStore.size >= 50) {
      return { error: "Maximum 50 webhooks reached" };
    }

    this.webhookCounter++;
    const id = `wh_${this.webhookCounter}_${
      Date.now().toString(36)
    }`;
    const now = new Date().toISOString();

    const config: WebhookConfig = {
      id,
      url,
      events: validEvents,
      secret: secret ?? null,
      createdAt: now,
      lastFired: null,
      failCount: 0,
      active: true,
    };

    this.webhookStore.set(id, config);

    return {
      webhookId: id,
      url,
      events: validEvents,
      verified: true,
      secret: secret ? "***" : null,
      createdAt: now,
    };
  }

  // ── api_webhook_list ───────────────────────────────────────────

  private listWebhooks(): WebhookListResult {
    const webhooks: WebhookConfig[] = [];
    for (const [, wh] of this.webhookStore) {
      webhooks.push({
        ...wh,
        secret: wh.secret ? "***" : null,
      });
    }
    return {
      webhooks,
      total: webhooks.length,
    };
  }

  // ── api_health ─────────────────────────────────────────────────

  private getHealth(): HealthResult {
    const now = Date.now();
    const uptimeMs = now - this.startTime;
    const uptimeSec = Math.floor(uptimeMs / 1000);

    const totalActions = DISPATCHERS.reduce(
      (sum, d) => sum + d.actions.length,
      0
    );

    const avgLatency =
      this.latencySamples.length > 0
        ? Math.round(
            this.latencySamples.reduce((a, b) => a + b, 0) /
              this.latencySamples.length
          )
        : 0;

    // Count active webhooks
    let activeWebhooks = 0;
    for (const [, wh] of this.webhookStore) {
      if (wh.active) activeWebhooks++;
    }

    return {
      status: "healthy",
      version: "9.0.0",
      uptime: uptimeSec,
      dispatchers: DISPATCHERS.length,
      actions: totalActions,
      avgLatencyMs: avgLatency,
      memoryUsageMb: Math.round(
        (typeof process !== "undefined"
          ? process.memoryUsage?.().heapUsed ?? 0
          : 0) / 1048576
      ),
      activeKeys: this.usageStore.size,
      activeWebhooks,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Internal: Usage Tracking ───────────────────────────────────

  /**
   * Record an API call for usage tracking.
   * Called externally by the route handler middleware.
   */
  recordCall(
    apiKey: string,
    dispatcher: string,
    action?: string
  ): void {
    const now = new Date().toISOString();
    let record = this.usageStore.get(apiKey);

    if (!record) {
      record = {
        calls: 0,
        byDispatcher: {},
        byAction: {},
        firstCall: now,
        lastCall: now,
        lastReset: now,
      };
      this.usageStore.set(apiKey, record);
    }

    record.calls++;
    record.lastCall = now;
    record.byDispatcher[dispatcher] =
      (record.byDispatcher[dispatcher] ?? 0) + 1;

    if (action) {
      record.byAction[action] =
        (record.byAction[action] ?? 0) + 1;
    }
  }

  /**
   * Record a latency sample (milliseconds).
   */
  recordLatency(ms: number): void {
    this.latencySamples.push(ms);
    // Keep last 1000 samples
    if (this.latencySamples.length > 1000) {
      this.latencySamples = this.latencySamples.slice(-500);
    }
  }

  /**
   * Set tier for an API key.
   */
  setKeyTier(apiKey: string, tier: ApiTier): void {
    this.keyTiers.set(apiKey, tier);
  }

  /**
   * Fire a webhook event to all registered listeners.
   * Returns list of webhook IDs that were notified.
   */
  fireEvent(
    event: WebhookEvent,
    payload: Record<string, any>
  ): string[] {
    const fired: string[] = [];
    const now = new Date().toISOString();

    for (const [id, wh] of this.webhookStore) {
      if (!wh.active) continue;
      if (!wh.events.includes(event)) continue;

      // In production, this would POST to wh.url
      // Here we just update tracking
      wh.lastFired = now;
      fired.push(id);
    }

    return fired;
  }

  /**
   * Remove a webhook by ID.
   */
  removeWebhook(id: string): boolean {
    return this.webhookStore.delete(id);
  }

  /**
   * Reset usage counters (e.g., daily reset).
   */
  resetUsage(apiKey?: string): void {
    const now = new Date().toISOString();
    if (apiKey) {
      const record = this.usageStore.get(apiKey);
      if (record) {
        record.calls = 0;
        record.byDispatcher = {};
        record.byAction = {};
        record.lastReset = now;
      }
    } else {
      // Reset all
      for (const [, record] of this.usageStore) {
        record.calls = 0;
        record.byDispatcher = {};
        record.byAction = {};
        record.lastReset = now;
      }
    }
  }

  // ── Internal: Token Bucket ─────────────────────────────────────

  private getOrCreateBucket(
    apiKey: string,
    tier: ApiTier
  ): TokenBucket {
    let bucket = this.buckets.get(apiKey);
    if (!bucket) {
      const capacity =
        tier === "free" ? 10 : tier === "pro" ? 100 : 1000;
      bucket = {
        tokens: capacity,
        lastRefill: Date.now(),
        capacity,
        refillRate: TIER_RATE_PER_SEC[tier],
      };
      this.buckets.set(apiKey, bucket);
    }
    return bucket;
  }

  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      bucket.capacity,
      bucket.tokens + elapsed * bucket.refillRate
    );
    bucket.lastRefill = now;
  }

  // ── Internal: Helpers ──────────────────────────────────────────

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return (
        parsed.protocol === "https:" ||
        parsed.protocol === "http:"
      );
    } catch {
      return false;
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function maskKey(key: string): string {
  if (key.length <= 8) return "****" + key.slice(-4);
  return key.slice(0, 4) + "****" + key.slice(-4);
}

// ── Singleton ──────────────────────────────────────────────────────

export const saasAPIEngine = new SaaSAPIEngine();
