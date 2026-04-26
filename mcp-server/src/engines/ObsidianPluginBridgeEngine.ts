/**
 * ObsidianPluginBridgeEngine — U-OBS-BRIDGE02
 *
 * Bridge engine enabling Obsidian plugins to query PRISM MCP actions directly.
 * Provides registration, authentication, query execution, and event subscription
 * for real-time Obsidian workspace integration.
 *
 * @module engines/ObsidianPluginBridgeEngine
 */

import { z } from "zod";
import * as crypto from "crypto";

// ============================================================================
// SCHEMAS
// ============================================================================

/** Plugin registration parameters */
export const PluginRegisterSchema = z.object({
  plugin_id: z.string().describe("Unique plugin identifier"),
  plugin_name: z.string().describe("Human-readable plugin name"),
  version: z.string().optional().describe("Plugin version"),
  vault_path: z.string().optional().describe("Associated Obsidian vault path"),
  capabilities: z
    .array(z.enum(["query", "subscribe", "write"]))
    .optional()
    .default(["query"])
    .describe("Requested capabilities"),
});

export type PluginRegisterParams = z.input<typeof PluginRegisterSchema>;

/** Plugin query parameters */
export const PluginQuerySchema = z.object({
  api_key: z.string().describe("API key from registration"),
  action: z.string().describe("PRISM MCP action to execute"),
  params: z.record(z.string(), z.any()).optional().default({}).describe("Action parameters"),
  timeout_ms: z.number().optional().default(30000).describe("Query timeout in milliseconds"),
});

export type PluginQueryParams = z.input<typeof PluginQuerySchema>;

/** Subscription parameters */
export const PluginSubscribeSchema = z.object({
  api_key: z.string().describe("API key from registration"),
  event_types: z
    .array(
      z.enum([
        "knowledge_update",
        "tribal_tip_added",
        "tribal_tip_modified",
        "sync_complete",
        "conflict_detected",
      ])
    )
    .describe("Event types to subscribe to"),
  filter: z
    .object({
      categories: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      vault_path: z.string().optional(),
    })
    .optional()
    .describe("Optional event filter"),
});

export type PluginSubscribeParams = z.input<typeof PluginSubscribeSchema>;

/** Unsubscribe parameters */
export const PluginUnsubscribeSchema = z.object({
  api_key: z.string().describe("API key from registration"),
  subscription_id: z.string().optional().describe("Specific subscription to remove (all if omitted)"),
});

export type PluginUnsubscribeParams = z.input<typeof PluginUnsubscribeSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface PluginRegistration {
  plugin_id: string;
  plugin_name: string;
  version: string;
  vault_path?: string;
  capabilities: Array<"query" | "subscribe" | "write">;
  api_key: string;
  api_key_hash: string;
  registered_at: string;
  last_activity: string;
  request_count: number;
  rate_limit: {
    requests_per_minute: number;
    requests_this_minute: number;
    minute_started: number;
  };
}

interface Subscription {
  id: string;
  plugin_id: string;
  event_types: string[];
  filter?: {
    categories?: string[];
    tags?: string[];
    vault_path?: string;
  };
  created_at: string;
  event_count: number;
}

interface QueryResult {
  success: boolean;
  data?: unknown;
  error?: string;
  execution_time_ms: number;
  cached: boolean;
}

interface BridgeEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface BridgeStatus {
  active: boolean;
  registered_plugins: number;
  active_subscriptions: number;
  total_queries: number;
  total_events_emitted: number;
  uptime_seconds: number;
  rate_limited_count: number;
}

// ============================================================================
// LOGGING
// ============================================================================

const log = {
  info: (msg: string, ...args: unknown[]) => console.log(`[INFO] ${msg}`, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`[ERROR] ${msg}`, ...args),
  debug: (msg: string, ...args: unknown[]) => console.log(`[DEBUG] ${msg}`, ...args),
};

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Bridge engine for Obsidian plugin integration with PRISM MCP.
 * Handles plugin registration, authentication, query execution, and event subscriptions.
 */
export class ObsidianPluginBridgeEngine {
  private registrations: Map<string, PluginRegistration> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private eventQueue: BridgeEvent[] = [];
  private startTime: number = Date.now();
  private totalQueries: number = 0;
  private totalEventsEmitted: number = 0;
  private rateLimitedCount: number = 0;

  // Rate limit configuration
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private readonly MAX_SUBSCRIPTIONS_PER_PLUGIN = 10;
  private readonly EVENT_QUEUE_MAX_SIZE = 1000;
  private readonly API_KEY_LENGTH = 32;

  constructor() {
    log.info("[ObsidianPluginBridgeEngine] Initialized");
  }

  // ==========================================================================
  // REGISTRATION
  // ==========================================================================

  /**
   * Register an Obsidian plugin instance
   */
  register(params: PluginRegisterParams): {
    success: boolean;
    api_key?: string;
    plugin_id?: string;
    message: string;
    expires_at?: string;
  } {
    const validated = PluginRegisterSchema.parse(params);

    // Check if plugin already registered
    const existing = Array.from(this.registrations.values()).find(
      (r) => r.plugin_id === validated.plugin_id
    );

    if (existing) {
      // Update existing registration
      existing.version = validated.version || existing.version;
      existing.vault_path = validated.vault_path || existing.vault_path;
      existing.capabilities = validated.capabilities || existing.capabilities;
      existing.last_activity = new Date().toISOString();

      log.info(`[ObsidianPluginBridgeEngine] Updated registration for ${validated.plugin_id}`);

      return {
        success: true,
        api_key: existing.api_key,
        plugin_id: existing.plugin_id,
        message: "Registration updated",
      };
    }

    // Generate new API key
    const apiKey = this.generateApiKey();
    const apiKeyHash = this.hashApiKey(apiKey);

    const registration: PluginRegistration = {
      plugin_id: validated.plugin_id,
      plugin_name: validated.plugin_name,
      version: validated.version || "1.0.0",
      vault_path: validated.vault_path,
      capabilities: validated.capabilities || ["query"],
      api_key: apiKey,
      api_key_hash: apiKeyHash,
      registered_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      request_count: 0,
      rate_limit: {
        requests_per_minute: this.MAX_REQUESTS_PER_MINUTE,
        requests_this_minute: 0,
        minute_started: Date.now(),
      },
    };

    this.registrations.set(apiKeyHash, registration);
    log.info(`[ObsidianPluginBridgeEngine] Registered plugin ${validated.plugin_id}`);

    return {
      success: true,
      api_key: apiKey,
      plugin_id: validated.plugin_id,
      message: "Plugin registered successfully",
      expires_at: undefined, // API keys don't expire by default
    };
  }

  // ==========================================================================
  // QUERY EXECUTION
  // ==========================================================================

  /**
   * Execute a PRISM MCP query from plugin context
   */
  async query(params: PluginQueryParams): Promise<QueryResult> {
    const startTime = Date.now();
    const validated = PluginQuerySchema.parse(params);

    // Authenticate
    const registration = this.authenticateRequest(validated.api_key);
    if (!registration) {
      return {
        success: false,
        error: "Invalid or expired API key",
        execution_time_ms: Date.now() - startTime,
        cached: false,
      };
    }

    // Check rate limit
    if (!this.checkRateLimit(registration)) {
      this.rateLimitedCount++;
      return {
        success: false,
        error: `Rate limit exceeded. Maximum ${this.MAX_REQUESTS_PER_MINUTE} requests per minute.`,
        execution_time_ms: Date.now() - startTime,
        cached: false,
      };
    }

    // Check capabilities
    if (!registration.capabilities.includes("query")) {
      return {
        success: false,
        error: "Plugin does not have query capability",
        execution_time_ms: Date.now() - startTime,
        cached: false,
      };
    }

    // Update activity
    registration.last_activity = new Date().toISOString();
    registration.request_count++;
    this.totalQueries++;

    try {
      // Execute the MCP action
      const result = await this.executeMcpAction(validated.action, validated.params);

      return {
        success: true,
        data: result,
        execution_time_ms: Date.now() - startTime,
        cached: false,
      };
    } catch (error) {
      log.error(`[ObsidianPluginBridgeEngine] Query failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Query execution failed",
        execution_time_ms: Date.now() - startTime,
        cached: false,
      };
    }
  }

  // ==========================================================================
  // SUBSCRIPTIONS
  // ==========================================================================

  /**
   * Subscribe to knowledge update events
   */
  subscribe(params: PluginSubscribeParams): {
    success: boolean;
    subscription_id?: string;
    message: string;
  } {
    const validated = PluginSubscribeSchema.parse(params);

    // Authenticate
    const registration = this.authenticateRequest(validated.api_key);
    if (!registration) {
      return {
        success: false,
        message: "Invalid or expired API key",
      };
    }

    // Check capabilities
    if (!registration.capabilities.includes("subscribe")) {
      return {
        success: false,
        message: "Plugin does not have subscribe capability",
      };
    }

    // Check subscription limit
    const pluginSubs = Array.from(this.subscriptions.values()).filter(
      (s) => s.plugin_id === registration.plugin_id
    );
    if (pluginSubs.length >= this.MAX_SUBSCRIPTIONS_PER_PLUGIN) {
      return {
        success: false,
        message: `Maximum ${this.MAX_SUBSCRIPTIONS_PER_PLUGIN} subscriptions per plugin`,
      };
    }

    const subscriptionId = this.generateSubscriptionId();
    const subscription: Subscription = {
      id: subscriptionId,
      plugin_id: registration.plugin_id,
      event_types: validated.event_types,
      filter: validated.filter,
      created_at: new Date().toISOString(),
      event_count: 0,
    };

    this.subscriptions.set(subscriptionId, subscription);
    log.info(
      `[ObsidianPluginBridgeEngine] Created subscription ${subscriptionId} for ${registration.plugin_id}`
    );

    return {
      success: true,
      subscription_id: subscriptionId,
      message: `Subscribed to ${validated.event_types.length} event type(s)`,
    };
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(params: PluginUnsubscribeParams): {
    success: boolean;
    removed_count: number;
    message: string;
  } {
    const validated = PluginUnsubscribeSchema.parse(params);

    // Authenticate
    const registration = this.authenticateRequest(validated.api_key);
    if (!registration) {
      return {
        success: false,
        removed_count: 0,
        message: "Invalid or expired API key",
      };
    }

    let removedCount = 0;

    if (validated.subscription_id) {
      // Remove specific subscription
      const sub = this.subscriptions.get(validated.subscription_id);
      if (sub && sub.plugin_id === registration.plugin_id) {
        this.subscriptions.delete(validated.subscription_id);
        removedCount = 1;
      }
    } else {
      // Remove all subscriptions for this plugin
      for (const [id, sub] of this.subscriptions.entries()) {
        if (sub.plugin_id === registration.plugin_id) {
          this.subscriptions.delete(id);
          removedCount++;
        }
      }
    }

    log.info(
      `[ObsidianPluginBridgeEngine] Removed ${removedCount} subscription(s) for ${registration.plugin_id}`
    );

    return {
      success: true,
      removed_count: removedCount,
      message: removedCount > 0 ? `Removed ${removedCount} subscription(s)` : "No subscriptions found",
    };
  }

  // ==========================================================================
  // STATUS
  // ==========================================================================

  /**
   * Get bridge status
   */
  status(apiKey?: string): BridgeStatus & { plugin_status?: PluginStatus } {
    const baseStatus: BridgeStatus = {
      active: true,
      registered_plugins: this.registrations.size,
      active_subscriptions: this.subscriptions.size,
      total_queries: this.totalQueries,
      total_events_emitted: this.totalEventsEmitted,
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      rate_limited_count: this.rateLimitedCount,
    };

    // If API key provided, include plugin-specific status
    if (apiKey) {
      const registration = this.authenticateRequest(apiKey);
      if (registration) {
        const pluginSubs = Array.from(this.subscriptions.values()).filter(
          (s) => s.plugin_id === registration.plugin_id
        );

        return {
          ...baseStatus,
          plugin_status: {
            plugin_id: registration.plugin_id,
            plugin_name: registration.plugin_name,
            capabilities: registration.capabilities,
            registered_at: registration.registered_at,
            last_activity: registration.last_activity,
            request_count: registration.request_count,
            active_subscriptions: pluginSubs.length,
            rate_limit_remaining:
              registration.rate_limit.requests_per_minute -
              registration.rate_limit.requests_this_minute,
          },
        };
      }
    }

    return baseStatus;
  }

  // ==========================================================================
  // EVENT EMISSION
  // ==========================================================================

  /**
   * Emit an event to all matching subscriptions
   */
  emitEvent(
    type: string,
    data: Record<string, unknown>
  ): {
    delivered_to: number;
    event_id: string;
  } {
    const event: BridgeEvent = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      data,
    };

    // Add to queue
    this.eventQueue.push(event);
    if (this.eventQueue.length > this.EVENT_QUEUE_MAX_SIZE) {
      this.eventQueue.shift(); // Remove oldest
    }

    // Find matching subscriptions
    let deliveredTo = 0;
    for (const sub of this.subscriptions.values()) {
      if (this.eventMatchesSubscription(event, sub)) {
        sub.event_count++;
        deliveredTo++;
        // In a real implementation, this would push to WebSocket or callback
      }
    }

    this.totalEventsEmitted++;
    log.debug(`[ObsidianPluginBridgeEngine] Emitted event ${type} to ${deliveredTo} subscriber(s)`);

    return {
      delivered_to: deliveredTo,
      event_id: event.id,
    };
  }

  /**
   * Get pending events for a plugin
   */
  getPendingEvents(
    apiKey: string,
    since?: string
  ): {
    success: boolean;
    events: BridgeEvent[];
    message: string;
  } {
    const registration = this.authenticateRequest(apiKey);
    if (!registration) {
      return {
        success: false,
        events: [],
        message: "Invalid or expired API key",
      };
    }

    // Get plugin's subscriptions
    const pluginSubs = Array.from(this.subscriptions.values()).filter(
      (s) => s.plugin_id === registration.plugin_id
    );

    if (pluginSubs.length === 0) {
      return {
        success: true,
        events: [],
        message: "No active subscriptions",
      };
    }

    // Filter events
    const sinceDate = since ? new Date(since) : new Date(0);
    const matchingEvents = this.eventQueue.filter((event) => {
      if (new Date(event.timestamp) <= sinceDate) return false;
      return pluginSubs.some((sub) => this.eventMatchesSubscription(event, sub));
    });

    return {
      success: true,
      events: matchingEvents,
      message: `Found ${matchingEvents.length} event(s)`,
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private generateApiKey(): string {
    return crypto.randomBytes(this.API_KEY_LENGTH).toString("hex");
  }

  private hashApiKey(apiKey: string): string {
    return crypto.createHash("sha256").update(apiKey).digest("hex");
  }

  private generateSubscriptionId(): string {
    return `sub_${crypto.randomBytes(12).toString("hex")}`;
  }

  private authenticateRequest(apiKey: string): PluginRegistration | null {
    const hash = this.hashApiKey(apiKey);
    return this.registrations.get(hash) || null;
  }

  private checkRateLimit(registration: PluginRegistration): boolean {
    const now = Date.now();
    const minuteAgo = now - 60000;

    // Reset counter if minute has passed
    if (registration.rate_limit.minute_started < minuteAgo) {
      registration.rate_limit.minute_started = now;
      registration.rate_limit.requests_this_minute = 0;
    }

    if (registration.rate_limit.requests_this_minute >= registration.rate_limit.requests_per_minute) {
      return false;
    }

    registration.rate_limit.requests_this_minute++;
    return true;
  }

  private eventMatchesSubscription(event: BridgeEvent, subscription: Subscription): boolean {
    // Check event type
    if (!subscription.event_types.includes(event.type)) {
      return false;
    }

    // Check filter if present
    if (subscription.filter) {
      const { categories, tags, vault_path } = subscription.filter;

      if (categories && categories.length > 0) {
        const eventCategory = event.data.category as string | undefined;
        if (!eventCategory || !categories.includes(eventCategory)) {
          return false;
        }
      }

      if (tags && tags.length > 0) {
        const eventTags = (event.data.tags as string[]) || [];
        if (!tags.some((t) => eventTags.includes(t))) {
          return false;
        }
      }

      if (vault_path) {
        const eventVault = event.data.vault_path as string | undefined;
        if (!eventVault || !eventVault.startsWith(vault_path)) {
          return false;
        }
      }
    }

    return true;
  }

  private async executeMcpAction(
    action: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    // Map common Obsidian plugin queries to PRISM actions
    const actionMap: Record<string, () => Promise<unknown>> = {
      // Knowledge queries
      "knowledge.search": async () => {
        const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");
        return tribalKnowledgeEngine.search({
          query: params.query as string,
          limit: (params.limit as number) || 10,
        });
      },
      "knowledge.get": async () => {
        const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");
        const results = tribalKnowledgeEngine.search({
          query: params.id as string,
          limit: 1,
        });
        return results.length > 0 ? results[0] : null;
      },
      // Tribal tip queries
      "tribal.list": async () => {
        const { tribalKnowledgeEngine } = await import("./TribalKnowledgeEngine.js");
        return tribalKnowledgeEngine.search({
          query: "*",
          limit: (params.limit as number) || 50,
        });
      },
      "tribal.categories": async () => {
        // Return available categories
        return [
          "general",
          "machining",
          "material",
          "tooling",
          "fixture",
          "quality",
          "safety",
          "maintenance",
        ];
      },
      // Sync queries
      "sync.status": async () => {
        const { obsidianVaultSyncEngine } = await import("./ObsidianVaultSyncEngine.js");
        return obsidianVaultSyncEngine.status();
      },
    };

    const handler = actionMap[action];
    if (!handler) {
      throw new Error(`Unknown action: ${action}. Available: ${Object.keys(actionMap).join(", ")}`);
    }

    return handler();
  }

  // ==========================================================================
  // ADMIN METHODS
  // ==========================================================================

  /**
   * Revoke a plugin's API key (admin function)
   */
  revokePlugin(pluginId: string): boolean {
    for (const [hash, reg] of this.registrations.entries()) {
      if (reg.plugin_id === pluginId) {
        // Remove all subscriptions
        for (const [subId, sub] of this.subscriptions.entries()) {
          if (sub.plugin_id === pluginId) {
            this.subscriptions.delete(subId);
          }
        }
        // Remove registration
        this.registrations.delete(hash);
        log.info(`[ObsidianPluginBridgeEngine] Revoked plugin ${pluginId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * List all registered plugins (admin function)
   */
  listPlugins(): Array<{
    plugin_id: string;
    plugin_name: string;
    registered_at: string;
    last_activity: string;
    request_count: number;
  }> {
    return Array.from(this.registrations.values()).map((r) => ({
      plugin_id: r.plugin_id,
      plugin_name: r.plugin_name,
      registered_at: r.registered_at,
      last_activity: r.last_activity,
      request_count: r.request_count,
    }));
  }

  /**
   * Clear all registrations and subscriptions (for testing)
   */
  reset(): void {
    this.registrations.clear();
    this.subscriptions.clear();
    this.eventQueue = [];
    this.totalQueries = 0;
    this.totalEventsEmitted = 0;
    this.rateLimitedCount = 0;
    log.info("[ObsidianPluginBridgeEngine] Reset complete");
  }
}

// ============================================================================
// TYPES (additional exports)
// ============================================================================

interface PluginStatus {
  plugin_id: string;
  plugin_name: string;
  capabilities: Array<"query" | "subscribe" | "write">;
  registered_at: string;
  last_activity: string;
  request_count: number;
  active_subscriptions: number;
  rate_limit_remaining: number;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const obsidianPluginBridgeEngine = new ObsidianPluginBridgeEngine();

export default ObsidianPluginBridgeEngine;
