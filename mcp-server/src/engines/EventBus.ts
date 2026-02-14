/**
 * PRISM MCP Server - Event Bus Engine
 * Centralized event-driven communication system
 * 
 * Features:
 * - Pub/Sub event system with typed events
 * - Event history and replay
 * - Async event handlers with timeout
 * - Event filtering and routing
 * - Error isolation (one handler failure doesn't affect others)
 * - Event batching and debouncing
 * - Wildcard subscriptions
 * 
 * SAFETY CRITICAL: Events coordinate manufacturing operations.
 * All events are logged and traceable for audit.
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type EventPriority = "critical" | "high" | "normal" | "low";
export type EventCategory = 
  | "system"
  | "task"
  | "agent"
  | "swarm"
  | "calculation"
  | "data"
  | "hook"
  | "error"
  | "audit";

export interface PrismEvent<T = unknown> {
  id: string;
  type: string;
  category: EventCategory;
  priority: EventPriority;
  timestamp: Date;
  source: string;
  payload: T;
  metadata?: Record<string, unknown>;
  correlationId?: string;    // For tracking related events
  parentEventId?: string;    // For event chains
}

export interface EventSubscription {
  id: string;
  pattern: string;           // Event type pattern (supports wildcards)
  handler: EventHandler;
  options: SubscriptionOptions;
  createdAt: Date;
  callCount: number;
  lastCalled?: Date;
  errors: number;
}

export interface SubscriptionOptions {
  priority?: EventPriority;  // Filter by priority
  category?: EventCategory;  // Filter by category
  once?: boolean;            // Auto-unsubscribe after first call
  timeout_ms?: number;       // Handler timeout
  maxCalls?: number;         // Max invocations before auto-unsubscribe
  debounce_ms?: number;      // Debounce rapid events
  filter?: (event: PrismEvent) => boolean;  // Custom filter
}

export type EventHandler<T = unknown> = (event: PrismEvent<T>) => void | Promise<void>;

export interface EventStats {
  totalEvents: number;
  eventsByCategory: Record<EventCategory, number>;
  eventsByType: Record<string, number>;
  subscriptions: number;
  activeSubscriptions: number;
  handlerErrors: number;
  avgHandlerTime_ms: number;
}

export interface EventHistoryEntry {
  event: PrismEvent;
  handlers: number;
  successfulHandlers: number;
  failedHandlers: number;
  totalTime_ms: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EVENT_CONSTANTS = {
  MAX_HISTORY: 1000,
  DEFAULT_TIMEOUT_MS: 5000,
  MAX_SUBSCRIPTIONS: 500,
  CLEANUP_INTERVAL_MS: 60000,
  MAX_EVENT_PAYLOAD_SIZE: 1024 * 1024  // 1MB
};

// ============================================================================
// STANDARD EVENT TYPES
// ============================================================================

export const EventTypes = {
  // System events
  SYSTEM_STARTUP: "system.startup",
  SYSTEM_SHUTDOWN: "system.shutdown",
  SYSTEM_ERROR: "system.error",
  SYSTEM_WARNING: "system.warning",
  
  // Task events
  TASK_CREATED: "task.created",
  TASK_QUEUED: "task.queued",
  TASK_STARTED: "task.started",
  TASK_COMPLETED: "task.completed",
  TASK_FAILED: "task.failed",
  TASK_CANCELLED: "task.cancelled",
  TASK_RETRY: "task.retry",
  
  // Agent events
  AGENT_REGISTERED: "agent.registered",
  AGENT_INVOKED: "agent.invoked",
  AGENT_COMPLETED: "agent.completed",
  AGENT_ERROR: "agent.error",
  
  // Swarm events
  SWARM_STARTED: "swarm.started",
  SWARM_COMPLETED: "swarm.completed",
  SWARM_FAILED: "swarm.failed",
  SWARM_CONSENSUS_REACHED: "swarm.consensus.reached",
  SWARM_CONSENSUS_FAILED: "swarm.consensus.failed",
  
  // Calculation events
  CALC_STARTED: "calculation.started",
  CALC_COMPLETED: "calculation.completed",
  CALC_ERROR: "calculation.error",
  CALC_WARNING: "calculation.warning",
  
  // Data events
  DATA_LOADED: "data.loaded",
  DATA_UPDATED: "data.updated",
  DATA_VALIDATION_ERROR: "data.validation.error",
  
  // Hook events
  HOOK_REGISTERED: "hook.registered",
  HOOK_TRIGGERED: "hook.triggered",
  HOOK_COMPLETED: "hook.completed",
  HOOK_ERROR: "hook.error",
  
  // Audit events
  AUDIT_ACTION: "audit.action",
  AUDIT_ACCESS: "audit.access",
  AUDIT_CHANGE: "audit.change"
} as const;

// ============================================================================
// EVENT BUS CLASS
// ============================================================================

export class EventBus {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private history: EventHistoryEntry[] = [];
  private eventCounter: number = 0;
  private subscriptionCounter: number = 0;
  private handlerTimes: number[] = [];
  private handlerErrors: number = 0;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
    log.info("[EventBus] Initialized");
  }

  // ==========================================================================
  // PUBLISHING
  // ==========================================================================

  /**
   * Publish an event to all matching subscribers
   */
  async publish<T>(
    type: string,
    payload: T,
    options: Partial<{
      category: EventCategory;
      priority: EventPriority;
      source: string;
      correlationId: string;
      parentEventId: string;
      metadata: Record<string, unknown>;
    }> = {}
  ): Promise<PrismEvent<T>> {
    const event: PrismEvent<T> = {
      id: `evt_${++this.eventCounter}_${Date.now()}`,
      type,
      category: options.category || this.inferCategory(type),
      priority: options.priority || "normal",
      timestamp: new Date(),
      source: options.source || "system",
      payload,
      metadata: options.metadata,
      correlationId: options.correlationId,
      parentEventId: options.parentEventId
    };

    log.debug(`[EventBus] Publishing event: ${event.type} (${event.id})`);

    // Find matching subscriptions
    const matchingSubscriptions = this.findMatchingSubscriptions(event);

    // Execute handlers
    const startTime = Date.now();
    let successfulHandlers = 0;
    let failedHandlers = 0;

    const handlerPromises = matchingSubscriptions.map(async (sub) => {
      try {
        // Check debounce
        if (sub.options.debounce_ms) {
          const debounceKey = `${sub.id}_${event.type}`;
          const existingTimer = this.debounceTimers.get(debounceKey);
          if (existingTimer) {
            clearTimeout(existingTimer);
          }
          
          await new Promise<void>((resolve) => {
            const timer = setTimeout(async () => {
              this.debounceTimers.delete(debounceKey);
              await this.executeHandler(sub, event);
              resolve();
            }, sub.options.debounce_ms);
            this.debounceTimers.set(debounceKey, timer);
          });
        } else {
          await this.executeHandler(sub, event);
        }
        
        successfulHandlers++;
        sub.callCount++;
        sub.lastCalled = new Date();

        // Check max calls
        if (sub.options.maxCalls && sub.callCount >= sub.options.maxCalls) {
          this.unsubscribe(sub.id);
        }

        // Check once
        if (sub.options.once) {
          this.unsubscribe(sub.id);
        }

      } catch (error) {
        failedHandlers++;
        sub.errors++;
        this.handlerErrors++;
        log.error(`[EventBus] Handler error for ${event.type}: ${error}`);
      }
    });

    await Promise.all(handlerPromises);

    const totalTime = Date.now() - startTime;
    this.handlerTimes.push(totalTime);

    // Add to history
    this.addToHistory({
      event,
      handlers: matchingSubscriptions.length,
      successfulHandlers,
      failedHandlers,
      totalTime_ms: totalTime
    });

    log.debug(`[EventBus] Event ${event.id} processed: ${successfulHandlers}/${matchingSubscriptions.length} handlers in ${totalTime}ms`);

    return event;
  }

  /**
   * Publish multiple events in batch
   */
  async publishBatch<T>(
    events: Array<{ type: string; payload: T; options?: Partial<{ category: EventCategory; priority: EventPriority; source: string }> }>
  ): Promise<PrismEvent<T>[]> {
    const results = await Promise.all(
      events.map(e => this.publish(e.type, e.payload, e.options))
    );
    return results;
  }

  /**
   * Execute a single handler with timeout
   */
  private async executeHandler<T>(sub: EventSubscription, event: PrismEvent<T>): Promise<void> {
    const timeout = sub.options.timeout_ms || EVENT_CONSTANTS.DEFAULT_TIMEOUT_MS;

    await Promise.race([
      sub.handler(event),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Handler timeout")), timeout)
      )
    ]);
  }

  // ==========================================================================
  // SUBSCRIBING
  // ==========================================================================

  /**
   * Subscribe to events matching a pattern
   * Pattern supports wildcards: "task.*", "*.completed", "*"
   */
  subscribe<T = unknown>(
    pattern: string,
    handler: EventHandler<T>,
    options: SubscriptionOptions = {}
  ): string {
    if (this.subscriptions.size >= EVENT_CONSTANTS.MAX_SUBSCRIPTIONS) {
      throw new Error(`Max subscriptions reached: ${EVENT_CONSTANTS.MAX_SUBSCRIPTIONS}`);
    }

    const subscription: EventSubscription = {
      id: `sub_${++this.subscriptionCounter}_${Date.now()}`,
      pattern,
      handler: handler as EventHandler,
      options,
      createdAt: new Date(),
      callCount: 0,
      errors: 0
    };

    this.subscriptions.set(subscription.id, subscription);
    log.debug(`[EventBus] Subscription created: ${subscription.id} for pattern "${pattern}"`);

    return subscription.id;
  }

  /**
   * Subscribe to a specific event type once
   */
  once<T = unknown>(
    type: string,
    handler: EventHandler<T>,
    options: Omit<SubscriptionOptions, "once"> = {}
  ): string {
    return this.subscribe(type, handler, { ...options, once: true });
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    const deleted = this.subscriptions.delete(subscriptionId);
    if (deleted) {
      log.debug(`[EventBus] Subscription removed: ${subscriptionId}`);
    }
    return deleted;
  }

  /**
   * Unsubscribe all handlers for a pattern
   */
  unsubscribePattern(pattern: string): number {
    let count = 0;
    this.subscriptions.forEach((sub, id) => {
      if (sub.pattern === pattern) {
        this.subscriptions.delete(id);
        count++;
      }
    });
    return count;
  }

  // ==========================================================================
  // PATTERN MATCHING
  // ==========================================================================

  /**
   * Find subscriptions matching an event
   */
  private findMatchingSubscriptions(event: PrismEvent): EventSubscription[] {
    const matching: EventSubscription[] = [];

    this.subscriptions.forEach(sub => {
      if (this.matchesPattern(event.type, sub.pattern)) {
        // Apply filters
        if (sub.options.priority && event.priority !== sub.options.priority) return;
        if (sub.options.category && event.category !== sub.options.category) return;
        if (sub.options.filter && !sub.options.filter(event)) return;

        matching.push(sub);
      }
    });

    // Sort by priority (critical handlers first)
    return matching.sort((a, b) => {
      const priorityOrder: Record<EventPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
      const aPriority = a.options.priority || "normal";
      const bPriority = b.options.priority || "normal";
      return priorityOrder[aPriority] - priorityOrder[bPriority];
    });
  }

  /**
   * Check if event type matches subscription pattern
   */
  private matchesPattern(eventType: string, pattern: string): boolean {
    if (pattern === "*") return true;
    if (pattern === eventType) return true;

    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, "[^.]+");

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(eventType);
  }

  /**
   * Infer category from event type
   */
  private inferCategory(type: string): EventCategory {
    const prefix = type.split(".")[0];
    const categoryMap: Record<string, EventCategory> = {
      system: "system",
      task: "task",
      agent: "agent",
      swarm: "swarm",
      calculation: "calculation",
      calc: "calculation",
      data: "data",
      hook: "hook",
      error: "error",
      audit: "audit"
    };
    return categoryMap[prefix] || "system";
  }

  // ==========================================================================
  // HISTORY & REPLAY
  // ==========================================================================

  /**
   * Add event to history
   */
  private addToHistory(entry: EventHistoryEntry): void {
    this.history.push(entry);
    if (this.history.length > EVENT_CONSTANTS.MAX_HISTORY) {
      this.history.shift();
    }
  }

  /**
   * Get recent events
   */
  getHistory(options: {
    limit?: number;
    category?: EventCategory;
    type?: string;
    since?: Date;
  } = {}): EventHistoryEntry[] {
    let results = [...this.history];

    if (options.category) {
      results = results.filter(e => e.event.category === options.category);
    }
    if (options.type) {
      results = results.filter(e => e.event.type === options.type);
    }
    if (options.since) {
      results = results.filter(e => e.event.timestamp >= options.since);
    }

    if (options.limit) {
      results = results.slice(-options.limit);
    }

    return results;
  }

  /**
   * Replay events to a handler
   */
  async replay(
    handler: EventHandler,
    options: {
      since?: Date;
      until?: Date;
      category?: EventCategory;
      type?: string;
    } = {}
  ): Promise<number> {
    let events = this.history.map(h => h.event);

    if (options.since) {
      events = events.filter(e => e.timestamp >= options.since);
    }
    if (options.until) {
      events = events.filter(e => e.timestamp <= options.until);
    }
    if (options.category) {
      events = events.filter(e => e.category === options.category);
    }
    if (options.type) {
      events = events.filter(e => e.type === options.type);
    }

    for (const event of events) {
      await handler(event);
    }

    return events.length;
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get event bus statistics
   */
  getStats(): EventStats {
    const eventsByCategory: Record<EventCategory, number> = {
      system: 0, task: 0, agent: 0, swarm: 0,
      calculation: 0, data: 0, hook: 0, error: 0, audit: 0
    };

    const eventsByType: Record<string, number> = {};

    this.history.forEach(entry => {
      eventsByCategory[entry.event.category]++;
      eventsByType[entry.event.type] = (eventsByType[entry.event.type] || 0) + 1;
    });

    const avgTime = this.handlerTimes.length > 0
      ? this.handlerTimes.reduce((a, b) => a + b, 0) / this.handlerTimes.length
      : 0;

    return {
      totalEvents: this.eventCounter,
      eventsByCategory,
      eventsByType,
      subscriptions: this.subscriptions.size,
      activeSubscriptions: Array.from(this.subscriptions.values())
        .filter(s => !s.options.once || s.callCount === 0).length,
      handlerErrors: this.handlerErrors,
      avgHandlerTime_ms: Math.round(avgTime * 100) / 100
    };
  }

  /**
   * Get subscription info
   */
  getSubscription(id: string): EventSubscription | undefined {
    return this.subscriptions.get(id);
  }

  /**
   * List all subscriptions
   */
  listSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      // Trim handler times array
      if (this.handlerTimes.length > 1000) {
        this.handlerTimes = this.handlerTimes.slice(-500);
      }

      // Clean up expired subscriptions (if maxCalls reached)
      this.subscriptions.forEach((sub, id) => {
        if (sub.options.maxCalls && sub.callCount >= sub.options.maxCalls) {
          this.subscriptions.delete(id);
        }
      });

    }, EVENT_CONSTANTS.CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop the event bus
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    log.info("[EventBus] Stopped");
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this.subscriptions.clear();
    this.history = [];
    this.eventCounter = 0;
    this.subscriptionCounter = 0;
    this.handlerTimes = [];
    this.handlerErrors = 0;
    log.info("[EventBus] Cleared");
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const eventBus = new EventBus();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Publish an event
 */
export function emit<T>(type: string, payload: T, options?: Partial<{ category: EventCategory; priority: EventPriority; source: string }>): Promise<PrismEvent<T>> {
  return eventBus.publish(type, payload, options);
}

/**
 * Subscribe to an event pattern
 */
export function on<T = unknown>(pattern: string, handler: EventHandler<T>, options?: SubscriptionOptions): string {
  return eventBus.subscribe(pattern, handler, options);
}

/**
 * Subscribe once
 */
export function once<T = unknown>(type: string, handler: EventHandler<T>): string {
  return eventBus.once(type, handler);
}

/**
 * Unsubscribe
 */
export function off(subscriptionId: string): boolean {
  return eventBus.unsubscribe(subscriptionId);
}
