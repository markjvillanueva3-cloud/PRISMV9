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

/** Event Priority type definition.
 */
export type EventPriority = "critical" | "high" | "normal" | "low";
/** Event Category type definition.
 */
export type EventCategory =
  | "system"
  | "task"
  | "agent"
  | "swarm"
  | "calculation"
  | "data"
  | "hook"
  | "error"
  | "quality"
  | "audit"
  // ERP event categories (INTEG-MS0)
  | "invoice"
  | "gl"
  | "accounting"
  | "shipping"
  | "job"
  | "estimate"
  // Scheduling/Capacity categories (INTEG-MS3)
  | "cycle_time"
  | "capacity"
  | "schedule";

/** Prism Event configuration/data structure.
 */
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

/** Event Subscription configuration/data structure.
 */
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

/** Subscription Options configuration/data structure.
 */
export interface SubscriptionOptions {
  priority?: EventPriority;  // Filter by priority
  category?: EventCategory;  // Filter by category
  once?: boolean;            // Auto-unsubscribe after first call
  timeout_ms?: number;       // Handler timeout
  maxCalls?: number;         // Max invocations before auto-unsubscribe
  debounce_ms?: number;      // Debounce rapid events
  filter?: (event: PrismEvent) => boolean;  // Custom filter
}

/** Event Handler type definition.
 */
export type EventHandler<T = unknown> = (event: PrismEvent<T>) => void | Promise<void>;

/** Event Stats configuration/data structure.
 */
export interface EventStats {
  totalEvents: number;
  eventsByCategory: Record<EventCategory, number>;
  eventsByType: Record<string, number>;
  subscriptions: number;
  activeSubscriptions: number;
  handlerErrors: number;
  avgHandlerTime_ms: number;
}

/** Event History Entry configuration/data structure.
 */
export interface EventHistoryEntry {
  event: PrismEvent;
  handlers: number;
  successfulHandlers: number;
  failedHandlers: number;
  totalTime_ms: number;
}

// ============================================================================
// PUB/SUB PROTOCOL TYPES (R3-MS4.5)
// ============================================================================

/** Typed event with source identification and structured payload. */
export interface TypedEvent {
  event: string;                    // e.g. "data_updated", "validation_complete"
  source: string;                   // e.g. "material_merge", "ralph_assess"
  payload: Record<string, unknown>; // Structured event data
  timestamp?: Date;                 // Auto-populated if not set
  chain_id?: string;                // Set when event is part of a reactive chain
}

/** Typed pub/sub subscription with optional filter criteria. */
export interface TypedEventSubscription {
  id?: string;                      // Auto-generated
  event: string;                    // Event name or glob pattern (e.g. "data_*")
  filter?: {
    source?: string;                // Source glob filter (e.g. "material_*")
    [key: string]: any;             // Additional filter criteria on payload
  };
  callback: (event: TypedEvent) => void | Promise<void>;
  description?: string;             // Human-readable description
  active?: boolean;                 // default: true
}

/** Reactive chain definition — sequence of actions triggered by an event. */
export interface ReactiveChain {
  id?: string;                      // Auto-generated
  name: string;                     // Human-readable name
  trigger_event: string;            // Event that starts the chain
  trigger_filter?: {
    source?: string;
    [key: string]: any;
  };
  steps: Array<{
    action: string;                 // Action name to execute
    params?: Record<string, any>;   // Static params (template variables supported)
    emit_event?: string;            // Event to emit on step completion
  }>;
  enabled: boolean;                 // default: true
}

// ============================================================================
// ERP EVENT PAYLOAD TYPES (INTEG-MS0 — Lane 21)
// Type-safe payloads for Manufacturing↔ERP integration events
// ============================================================================

/** Invoice event payload (U-INTEG01) */
export interface InvoiceEventPayload {
  invoice_id: string;
  job_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  due_date?: string;      // ISO date
  paid_date?: string;     // ISO date (for invoice.paid)
  payment_method?: string;
  partial_amount?: number; // For partial payments
  void_reason?: string;   // For invoice.voided
}

/** General Ledger event payload (U-INTEG02) */
export interface GLEventPayload {
  entry_id: string;
  journal_id?: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  period: string;         // e.g., "2026-04"
  fiscal_year: number;
  description: string;
  reference_type?: "invoice" | "payment" | "adjustment" | "accrual" | "reversal";
  reference_id?: string;
  reconciliation_id?: string;
  adjustment_reason?: string;
}

/** Accounting event payload (U-INTEG03) */
export interface AccountingEventPayload {
  job_id: string;
  customer_id?: string;
  amount: number;
  currency: string;
  recognition_type?: "point_in_time" | "over_time";
  cost_category?: "material" | "labor" | "overhead" | "subcontract" | "other";
  margin_percent?: number;
  budget_amount?: number;
  actual_amount?: number;
  variance?: number;
  variance_reason?: string;
  wip_status?: "in_progress" | "completed" | "written_off";
}

/** Shipping event payload (U-INTEG04) */
export interface ShippingEventPayload {
  shipment_id: string;
  job_id: string;
  customer_id: string;
  carrier: string;
  tracking_number?: string;
  shipped_date?: string;   // ISO date
  estimated_delivery?: string;
  actual_delivery?: string;
  signature?: string;
  return_reason?: string;
  delay_reason?: string;
  packages: number;
  weight_lbs?: number;
  destination: {
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

/** Job lifecycle event payload (for ERP chains) */
export interface JobEventPayload {
  job_id: string;
  job_number: string;
  customer_id: string;
  customer_name?: string;
  part_number?: string;
  quantity: number;
  status: "created" | "in_progress" | "completed" | "shipped" | "invoiced" | "closed";
  estimated_hours?: number;
  actual_hours?: number;
  estimated_cost?: number;
  actual_cost?: number;
  ship_date?: string;
  invoice_id?: string;
}

/** Estimate/Quote event payload (for ERP chains) */


/** Cycle Time Estimation event payload (INTEG-MS3 U-INTEG14) */
export interface CycleTimeEventPayload {
  job_id?: string;
  program_id?: string;
  machine_id: string;
  machine_name?: string;
  estimated_seconds: number;
  estimated_formatted: string;
  cutting_time_seconds: number;
  rapid_time_seconds: number;
  overhead_seconds: number;
  confidence: number;
  source: "g-code_analysis" | "historical" | "manual" | "calibrated";
  calibration_factor?: number;
}

/** Capacity Planning event payload (INTEG-MS3 U-INTEG15) */
export interface CapacityEventPayload {
  machine_id: string;
  machine_name?: string;
  time_window: { start: string; end: string };  // ISO dates
  available_hours: number;
  scheduled_hours: number;
  utilization_pct: number;
  pending_jobs: number;
  overload_hours?: number;  // Hours over capacity
  status: "available" | "normal" | "busy" | "overload";
}

/** Scheduling event payload (INTEG-MS3 U-INTEG16) */
export interface ScheduleEventPayload {
  schedule_id?: string;
  affected_machines: string[];
  affected_jobs: string[];
  optimization_type: "insertion" | "rebalance" | "reschedule" | "conflict_resolution";
  makespan_before_min?: number;
  makespan_after_min?: number;
  improvement_pct?: number;
  conflicts_resolved?: number;
}


// ============================================================================
// CONSTANTS
// ============================================================================

const EVENT_CONSTANTS = {
  MAX_HISTORY: 1000,
  DEFAULT_TIMEOUT_MS: 5000,
  // Raised 500 -> 50000 (2026-06-01, slot:echo). ROOT CAUSE of the recurring
  // "Max subscriptions reached" wedge: the fresh-McpServer-per-request wiring (1297b0a8f5
  // buildRequestServer/bindDispatchers) subscribes to this singleton per /mcp request without
  // an unsubscribe on request-end, so a busy multi-chat fleet saturated the 500 cap in ~12 calls
  // and EVERY action then 500'd — defeating sustained post-training across the JM fleet. The PROPER
  // fix is per-request subscription teardown (owner: MCP-core/golf, routed via chat bus); this
  // ceiling raise unblocks training now and is bounded by the existing RSS watchdog (3GB preemptive
  // restart) + the 60s CLEANUP_INTERVAL — it cannot regress behaviour (strictly higher ceiling).
  MAX_SUBSCRIPTIONS: 50000,
  CLEANUP_INTERVAL_MS: 60000,
  MAX_EVENT_PAYLOAD_SIZE: 1024 * 1024  // 1MB
};

// ============================================================================
// STANDARD EVENT TYPES
// ============================================================================

/** Event Types constant.
 */
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
  
  // Quality events
  QUALITY_SCORE_UPDATED: "quality.score.updated",
  QUALITY_GATE_PASSED: "quality.gate.passed",
  QUALITY_GATE_FAILED: "quality.gate.failed",

  // Audit events
  AUDIT_ACTION: "audit.action",
  AUDIT_ACCESS: "audit.access",
  AUDIT_CHANGE: "audit.change",

  // ============================================================================
  // ERP EVENT TYPES (INTEG-MS0 — Lane 21)
  // ============================================================================

  // Invoice events (U-INTEG01)
  INVOICE_CREATED: "invoice.created",
  INVOICE_SENT: "invoice.sent",
  INVOICE_PAID: "invoice.paid",
  INVOICE_OVERDUE: "invoice.overdue",
  INVOICE_VOIDED: "invoice.voided",
  INVOICE_PARTIAL_PAYMENT: "invoice.partial_payment",

  // General Ledger events (U-INTEG02)
  GL_POSTED: "gl.posted",
  GL_PERIOD_CLOSED: "gl.period_closed",
  GL_RECONCILED: "gl.reconciled",
  GL_ADJUSTMENT: "gl.adjustment",
  GL_REVERSAL: "gl.reversal",

  // Accounting events (U-INTEG03)
  ACCOUNTING_REVENUE_RECOGNIZED: "accounting.revenue_recognized",
  ACCOUNTING_COST_ACCRUED: "accounting.cost_accrued",
  ACCOUNTING_MARGIN_CALCULATED: "accounting.margin_calculated",
  ACCOUNTING_WIP_UPDATED: "accounting.wip_updated",
  ACCOUNTING_VARIANCE_DETECTED: "accounting.variance_detected",

  // Shipping events (U-INTEG04)
  SHIPPING_DISPATCHED: "shipping.dispatched",
  SHIPPING_IN_TRANSIT: "shipping.in_transit",
  SHIPPING_DELIVERED: "shipping.delivered",
  SHIPPING_RETURNED: "shipping.returned",
  SHIPPING_DELAYED: "shipping.delayed",
  SHIPPING_SIGNATURE_CAPTURED: "shipping.signature_captured",

  // Job lifecycle events (for ERP integration)
  JOB_CREATED: "job.created",
  JOB_STARTED: "job.started",
  JOB_COMPLETED: "job.completed",
  JOB_SHIPPED: "job.shipped",
  JOB_INVOICED: "job.invoiced",
  JOB_CLOSED: "job.closed",

  // Estimate/Quote events (for ERP integration)
  ESTIMATE_CREATED: "estimate.created",
  ESTIMATE_SENT: "estimate.sent",
  ESTIMATE_ACCEPTED: "estimate.accepted",
  ESTIMATE_REJECTED: "estimate.rejected",
  ESTIMATE_EXPIRED: "estimate.expired",
  ESTIMATE_CONVERTED_TO_JOB: "estimate.converted_to_job",

  // ============================================================================
  // SCHEDULING/CAPACITY EVENT TYPES (INTEG-MS3 — CycleTime→Scheduling Bridge)
  // ============================================================================

  // Cycle time estimation events (U-INTEG14)
  CYCLE_TIME_ESTIMATED: "cycle_time.estimated",
  CYCLE_TIME_CALIBRATED: "cycle_time.calibrated",

  // Capacity planning events (U-INTEG15)
  CAPACITY_UPDATED: "capacity.updated",
  CAPACITY_OVERLOAD: "capacity.overload",
  CAPACITY_AVAILABLE: "capacity.available",

  // Scheduling events (U-INTEG16)
  SCHEDULE_OPTIMIZED: "schedule.optimized",
  SCHEDULE_CONFLICT: "schedule.conflict",
  SCHEDULE_REBALANCED: "schedule.rebalanced",
} as const;

// ============================================================================
// EVENT BUS CLASS
// ============================================================================

/** Event Bus engine/manager.
 */
export class EventBus {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private history: EventHistoryEntry[] = [];
  private eventCounter: number = 0;
  private subscriptionCounter: number = 0;
  private handlerTimes: number[] = [];
  private handlerErrors: number = 0;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Pub/Sub protocol storage (R3-MS4.5)
  private typedSubscriptions: Map<string, TypedEventSubscription> = new Map();
  private reactiveChains: Map<string, ReactiveChain> = new Map();
  private typedHistory: TypedEvent[] = [];
  private typedSubCounter: number = 0;
  private chainCounter: number = 0;
  private chainDepth: number = 0;
  private static readonly MAX_CHAIN_DEPTH = 5;

  // Action registry for reactive chain step execution
  private actionRegistry: Map<string, (params: Record<string, any>, context: { trigger: TypedEvent; chain_id: string }) => Promise<Record<string, any>>> = new Map();

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
        // Check debounce — fire-and-forget debounced handlers to avoid hanging Promise.all
        /** If.
         * @param sub.options.debounce_ms - sub.options.debounce_ms
         * @returns void
         */
        if (sub.options.debounce_ms) {
          const debounceKey = `${sub.id}_${event.type}`;
          const existingTimer = this.debounceTimers.get(debounceKey);
          /** If.
           * @param existingTimer - existing timer
           * @returns void
           */
          if (existingTimer) {
            clearTimeout(existingTimer);
          }
          const timer = setTimeout(async () => {
            this.debounceTimers.delete(debounceKey);
            try {
              await this.executeHandler(sub, event);
              successfulHandlers++;
              sub.callCount++;
              sub.lastCalled = new Date();
              /** If.
               * @param sub.options.maxCalls - sub.options.max calls
               * @returns void
               */
              if (sub.options.maxCalls && sub.callCount >= sub.options.maxCalls) {
                this.unsubscribe(sub.id);
              }
            } catch (err) {
              failedHandlers++;
              log.error(`[EventBus] Debounced handler error for ${event.type}: ${err}`);
            }
          }, sub.options.debounce_ms);
          this.debounceTimers.set(debounceKey, timer);
          return; // Skip fall-through — debounced handler tracks its own success/failure
        } else {
          await this.executeHandler(sub, event);
        }

        successfulHandlers++;
        sub.callCount++;
        sub.lastCalled = new Date();

        // Check max calls
        /** If.
         * @param sub.options.maxCalls - sub.options.max calls
         * @returns void
         */
        if (sub.options.maxCalls && sub.callCount >= sub.options.maxCalls) {
          this.unsubscribe(sub.id);
        }

        // Check once
        /** If.
         * @param sub.options.once - sub.options.once
         * @returns void
         */
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
    // Bound synchronously at the push site: the 60s startCleanup interval also
    // trims, but between ticks a busy bus accumulates well past the cap. Same
    // 1000/500 high-water/retain as startCleanup, so avgHandlerTime is unchanged.
    if (this.handlerTimes.length > 1000) {
      this.handlerTimes = this.handlerTimes.slice(-500);
    }

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
    /** If.
     * @param this.subscriptions.size - this.subscriptions.size
     * @returns void
     */
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
    /** If.
     * @param deleted - deleted
     * @returns void
     */
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
      /** If.
       * @param sub.pattern - sub.pattern
       * @returns void
       */
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
      quality: "quality",
      audit: "audit",
      // ERP categories (INTEG-MS0)
      invoice: "invoice",
      gl: "gl",
      accounting: "accounting",
      shipping: "shipping",
      job: "job",
      estimate: "estimate",
      // Scheduling/Capacity categories (INTEG-MS3)
      cycle_time: "cycle_time",
      capacity: "capacity",
      schedule: "schedule"
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
    /** If.
     * @param this.history.length - this.history.length
     * @returns void
     */
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

    /** If.
     * @param options.category - options.category
     * @returns void
     */
    if (options.category) {
      results = results.filter(e => e.event.category === options.category);
    }
    /** If.
     * @param options.type - options.type
     * @returns void
     */
    if (options.type) {
      results = results.filter(e => e.event.type === options.type);
    }
    /** If.
     * @param options.since - options.since
     * @returns void
     */
    if (options.since) {
      results = results.filter(e => e.event.timestamp >= options.since!);
    }

    /** If.
     * @param options.limit - options.limit
     * @returns void
     */
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

    /** If.
     * @param options.since - options.since
     * @returns void
     */
    if (options.since) {
      events = events.filter(e => e.timestamp >= options.since!);
    }
    /** If.
     * @param options.until - options.until
     * @returns void
     */
    if (options.until) {
      events = events.filter(e => e.timestamp <= options.until!);
    }
    /** If.
     * @param options.category - options.category
     * @returns void
     */
    if (options.category) {
      events = events.filter(e => e.category === options.category);
    }
    /** If.
     * @param options.type - options.type
     * @returns void
     */
    if (options.type) {
      events = events.filter(e => e.type === options.type);
    }

    /** For.
     * @param const - const
     * @returns void
     */
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
      calculation: 0, data: 0, hook: 0, error: 0, quality: 0, audit: 0,
      // ERP categories (INTEG-MS0)
      invoice: 0, gl: 0, accounting: 0, shipping: 0, job: 0, estimate: 0,
      // Scheduling/Capacity categories (INTEG-MS3)
      cycle_time: 0, capacity: 0, schedule: 0,
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

  /**
   * List events (compatibility method used by hookDispatcher)
   */
  listEvents(category?: string): Array<{ type: string; category: string }> {
    const seen = new Set<string>();
    const events: Array<{ type: string; category: string }> = [];
    this.history.forEach(entry => {
      if (!seen.has(entry.event.type)) {
        seen.add(entry.event.type);
        /** If.
         * @param !category - !category
         * @returns void
         */
        if (!category || entry.event.category === category) {
          events.push({ type: entry.event.type, category: entry.event.category });
        }
      }
    });
    return events;
  }

  // ==========================================================================
  // PUB/SUB PROTOCOL METHODS (R3-MS4.5)
  // ==========================================================================

  /**
   * Glob pattern matching helper.
   * Supports '*' as a wildcard that matches any sequence of characters.
   */
  private matchesGlob(pattern: string, value: string): boolean {
    const regex = new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    return regex.test(value);
  }

  /**
   * Register a typed subscription with optional source/payload filter.
   * Returns a subscription_id for later unsubscribe.
   */
  subscribeTyped(subscription: TypedEventSubscription): string {
    const id = subscription.id || `tsub_${++this.typedSubCounter}_${Date.now()}`;
    const normalized: TypedEventSubscription = {
      ...subscription,
      id,
      active: subscription.active !== false
    };
    this.typedSubscriptions.set(id, normalized);
    log.debug(`[EventBus] TypedSubscription registered: ${id} for event "${subscription.event}"`);
    return id;
  }

  /**
   * Remove a typed subscription by id.
   * Returns true if the subscription existed and was removed.
   */
  unsubscribeTyped(subscriptionId: string): boolean {
    const deleted = this.typedSubscriptions.delete(subscriptionId);
    /** If.
     * @param deleted - deleted
     * @returns void
     */
    if (deleted) {
      log.debug(`[EventBus] TypedSubscription removed: ${subscriptionId}`);
    }
    return deleted;
  }

  /**
   * Publish a typed event.
   * Sets timestamp if absent, stores in typed history, notifies matching subscriptions,
   * and triggers any matching reactive chains.
   */
  async publishTyped(event: TypedEvent): Promise<void> {
    if (!event.timestamp) {
      event.timestamp = new Date();
    }

    // Store in typed history
    this.typedHistory.push(event);
    /** If.
     * @param this.typedHistory.length - this.typed history.length
     * @returns void
     */
    if (this.typedHistory.length > EVENT_CONSTANTS.MAX_HISTORY) {
      this.typedHistory.shift();
    }

    log.debug(`[EventBus] publishTyped: ${event.event} from ${event.source}`);

    // Notify matching subscriptions
    /** For.
     * @param const - const
     * @param sub] - sub]
     * @returns void
     */
    for (const [, sub] of this.typedSubscriptions) {
      if (sub.active === false) continue;
      if (!this.matchesGlob(sub.event, event.event)) continue;

      if (sub.filter?.source && !this.matchesGlob(sub.filter.source, event.source)) continue;

      // Additional payload filter keys (skip 'source' already handled)
      let payloadMatch = true;
      /** If.
       * @param sub.filter - sub.filter
       * @returns void
       */
      if (sub.filter) {
        for (const [key, value] of Object.entries(sub.filter)) {
          if (key === "source") continue;
          /** If.
           * @param event.payload[key] - event.payload[key]
           * @returns void
           */
          if (event.payload[key] !== value) {
            payloadMatch = false;
            break;
          }
        }
      }
      if (!payloadMatch) continue;

      try {
        await sub.callback(event);
      } catch (err) {
        log.error(`[EventBus] TypedSubscription callback error (${sub.id}): ${err}`);
      }
    }

    // Trigger matching reactive chains
    await this.triggerReactiveChains(event);
  }

  /**
   * Trigger reactive chains whose trigger_event matches the published event.
   */
  private async triggerReactiveChains(event: TypedEvent): Promise<void> {
    if (this.chainDepth >= EventBus.MAX_CHAIN_DEPTH) {
      log.warn(`[EventBus] Reactive chain depth limit (${EventBus.MAX_CHAIN_DEPTH}) reached — aborting`);
      return;
    }

    /** For.
     * @param const - const
     * @param chain] - chain]
     * @returns void
     */
    for (const [, chain] of this.reactiveChains) {
      if (!chain.enabled) continue;
      if (!this.matchesGlob(chain.trigger_event, event.event)) continue;

      if (chain.trigger_filter?.source && !this.matchesGlob(chain.trigger_filter.source, event.source)) continue;

      log.info(`[EventBus] Reactive chain triggered: ${chain.name} (${chain.id})`);
      this.chainDepth++;
      try {
        await this.executeChain(chain, event);
      } catch (err) {
        log.error(`[EventBus] Reactive chain "${chain.name}" error: ${err}`);
      } finally {
        this.chainDepth--;
      }
    }
  }

  /**
   * Execute the steps of a reactive chain sequentially.
   * Each step looks up its action in the actionRegistry and calls the handler.
   * If no handler is registered, logs a warning and continues.
   * Step results are accumulated and passed to subsequent steps as context.
   * Stops on any step failure.
   */
  private async executeChain(chain: ReactiveChain, triggerEvent: TypedEvent): Promise<void> {
    const stepResults: Record<string, Record<string, any>> = {};

    /** For.
     * @param let - let
     * @returns void
     */
    for (let i = 0; i < chain.steps.length; i++) {
      const step = chain.steps[i];
      log.info(`[EventBus] Chain "${chain.name}" step ${i + 1}/${chain.steps.length}: ${step.action}`);

      try {
        // Execute the action handler if registered
        const handler = this.actionRegistry.get(step.action);
        let result: Record<string, any> = {};

        /** If.
         * @param handler - handler
         * @returns void
         */
        if (handler) {
          // Merge step params with trigger payload and previous step results
          const mergedParams: Record<string, any> = {
            ...triggerEvent.payload,
            ...step.params,
            _previous_results: stepResults,
          };

          result = await handler(mergedParams, {
            trigger: triggerEvent,
            chain_id: chain.id!,
          });

          stepResults[step.action] = result;
          log.info(`[EventBus] Chain "${chain.name}" step "${step.action}" completed`);
        } else {
          log.warn(`[EventBus] Action "${step.action}" not registered — skipping execution`);
        }

        // If the step emits an event, publish it (may trigger further chains)
        /** If.
         * @param step.emit_event - step.emit_event
         * @returns void
         */
        if (step.emit_event) {
          const stepEvent: TypedEvent = {
            event: step.emit_event,
            source: `chain:${chain.id}`,
            payload: {
              chain_id: chain.id,
              step: step.action,
              trigger: triggerEvent.event,
              ...(step.params || {}),
              ...result,
            },
            timestamp: new Date(),
            chain_id: chain.id,
          };
          await this.publishTyped(stepEvent);
        }
      } catch (err) {
        log.error(`[EventBus] Chain "${chain.name}" step "${step.action}" failed: ${err}`);
        break; // Chain stops on failure
      }
    }
  }

  /**
   * Register an action handler that reactive chain steps can invoke.
   * The handler receives the step's params merged with trigger event payload,
   * and returns a result object that is passed to subsequent steps.
   */
  registerAction(
    name: string,
    handler: (params: Record<string, any>, context: { trigger: TypedEvent; chain_id: string }) => Promise<Record<string, any>>,
  ): void {
    // FAIL-LOUD dup-guard (slot:bravo, 2026-06-18, U-EVENTBUS-DUP-WARN). Registration is
    // last-writer-wins (Map.set), so a SECOND registration of the same name silently REPLACES the
    // first -> one handler becomes unreachable and a reactive-chain step (executeChain looks the
    // handler up by name) resolves to the WRONG handler. That was a real latent bug: two bootstraps
    // both registered "reoptimize_schedule" (U-REOPT-COLLISION-FIX). We still overwrite (back-compat:
    // legitimate re-registration / hot-reload stays allowed) but now WARN loudly so a collision is
    // surfaced, never silent. There are zero duplicate action names today, so this fires only on a
    // real future collision -- turning the silent footgun into a loud one (R12 fail-loud).
    if (this.actionRegistry.has(name)) {
      log.warn(`[EventBus] Action "${name}" RE-REGISTERED -- the previous handler is now unreachable (last-writer-wins). If two modules registered the same action name this is a collision: rename one.`);
    }
    this.actionRegistry.set(name, handler);
    log.debug(`[EventBus] Action registered: ${name}`);
  }

  /**
   * Remove a registered action by name.
   */
  removeAction(name: string): boolean {
    return this.actionRegistry.delete(name);
  }

  /**
   * List all registered action names.
   */
  listActions(): string[] {
    return Array.from(this.actionRegistry.keys());
  }

  /**
   * Register a reactive chain.
   * Returns the chain_id.
   */
  registerReactiveChain(chain: ReactiveChain): string {
    const id = chain.id || `chain_${++this.chainCounter}_${Date.now()}`;
    const normalized: ReactiveChain = { ...chain, id };
    this.reactiveChains.set(id, normalized);
    log.debug(`[EventBus] Reactive chain registered: ${id} ("${chain.name}")`);
    return id;
  }

  /**
   * Remove a reactive chain by id.
   * Returns true if it existed.
   */
  removeReactiveChain(chainId: string): boolean {
    return this.reactiveChains.delete(chainId);
  }

  /**
   * List all active typed subscriptions.
   */
  getTypedSubscriptions(): TypedEventSubscription[] {
    return Array.from(this.typedSubscriptions.values());
  }

  /**
   * List all registered reactive chains.
   */
  getReactiveChains(): ReactiveChain[] {
    return Array.from(this.reactiveChains.values());
  }

  /**
   * Replay typed events since a given date, optionally filtered by event glob pattern.
   */
  replayEvents(since: Date, filter?: string): TypedEvent[] {
    let events = this.typedHistory.filter(e => e.timestamp && e.timestamp >= since);
    /** If.
     * @param filter - filter criteria
     * @returns void
     */
    if (filter) {
      events = events.filter(e => this.matchesGlob(filter, e.event));
    }
    return events;
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
      /** If.
       * @param this.handlerTimes.length - this.handler times.length
       * @returns void
       */
      if (this.handlerTimes.length > 1000) {
        this.handlerTimes = this.handlerTimes.slice(-500);
      }

      // Clean up expired subscriptions (if maxCalls reached)
      this.subscriptions.forEach((sub, id) => {
        /** If.
         * @param sub.options.maxCalls - sub.options.max calls
         * @returns void
         */
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

/** Event Bus constant.
 */
export const eventBus = new EventBus();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Publish an event
  * @param type - type string
  * @param payload - payload
  * @param options - configuration options
  * @returns promise resolving to prism event< t>
 */
export function emit<T>(type: string, payload: T, options?: Partial<{ category: EventCategory; priority: EventPriority; source: string }>): Promise<PrismEvent<T>> {
  return eventBus.publish(type, payload, options);
}

/**
 * Subscribe to an event pattern
  * @param pattern - pattern string
  * @param handler - handler
  * @param options - configuration options
  * @returns formatted string result
 */
export function on<T = unknown>(pattern: string, handler: EventHandler<T>, options?: SubscriptionOptions): string {
  return eventBus.subscribe(pattern, handler, options);
}

/**
 * Subscribe once
  * @param type - type string
  * @param handler - handler
  * @returns formatted string result
 */
export function once<T = unknown>(type: string, handler: EventHandler<T>): string {
  return eventBus.once(type, handler);
}

/**
 * Unsubscribe
  * @param subscriptionId - subscription identifier
  * @returns true if condition is met
 */
export function off(subscriptionId: string): boolean {
  return eventBus.unsubscribe(subscriptionId);
}

// ============================================================================
// SOURCE FILE CATALOG — LOW-priority extracted JS modules targeting EventBus
// ============================================================================

/** E V E N T B U S_ S O U R C E_ F I L E_ C A T A L O G constant.
 */
export const EVENTBUS_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "LOW";
  description: string;
}> = {
  // ── extracted/core/ (11 files) ──────────────────────────────────────────────

  PRISM_CAPABILITY_REGISTRY: {
    filename: "PRISM_CAPABILITY_REGISTRY.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 194,
    safety_class: "LOW",
    description: "Capability registry mapping available system features and their activation state",
  },
  PRISM_CONSTANTS: {
    filename: "PRISM_CONSTANTS.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 2461,
    safety_class: "LOW",
    description: "Master constants library: units, tolerances, material codes, and system-wide defaults",
  },
  PRISM_ENHANCED_MASTER_ORCHESTRATOR: {
    filename: "PRISM_ENHANCED_MASTER_ORCHESTRATOR.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 355,
    safety_class: "LOW",
    description: "Enhanced orchestrator with extended workflow coordination and task sequencing",
  },
  PRISM_ENHANCEMENTS: {
    filename: "PRISM_ENHANCEMENTS.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 60,
    safety_class: "LOW",
    description: "Incremental enhancement patches and feature flags for core system behavior",
  },
  PRISM_MASTER: {
    filename: "PRISM_MASTER.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 215,
    safety_class: "LOW",
    description: "Master entry point: top-level system initialization and module bootstrap",
  },
  PRISM_MASTER_DB: {
    filename: "PRISM_MASTER_DB.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 131,
    safety_class: "LOW",
    description: "Master database schema definitions and connection pool configuration",
  },
  PRISM_MASTER_ORCHESTRATOR: {
    filename: "PRISM_MASTER_ORCHESTRATOR.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 696,
    safety_class: "LOW",
    description: "Primary workflow orchestrator: task dispatch, dependency resolution, and execution ordering",
  },
  PRISM_MASTER_TOOLPATH_REGISTRY: {
    filename: "PRISM_MASTER_TOOLPATH_REGISTRY.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 612,
    safety_class: "LOW",
    description: "Central toolpath registry mapping operations to strategy chains and parameter sets",
  },
  PRISM_PARAM_ENGINE: {
    filename: "PRISM_PARAM_ENGINE.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 10,
    safety_class: "LOW",
    description: "Lightweight parameter engine stub for dynamic parameter injection",
  },
  PRISM_UNIFIED_WORKFLOW: {
    filename: "PRISM_UNIFIED_WORKFLOW.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 145,
    safety_class: "LOW",
    description: "Unified workflow definitions merging setup, machining, and inspection stages",
  },
  PRISM_WORKFLOW_ORCHESTRATOR_V2: {
    filename: "PRISM_WORKFLOW_ORCHESTRATOR_V2.js",
    source_dir: "extracted/core",
    category: "core",
    lines: 223,
    safety_class: "LOW",
    description: "V2 workflow orchestrator with improved retry logic and stage transitions",
  },

  // ── extracted/engines/core/ (5 files) ───────────────────────────────────────

  PRISM_ENHANCED_ORCHESTRATION_ENGINE: {
    filename: "PRISM_ENHANCED_ORCHESTRATION_ENGINE.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 452,
    safety_class: "LOW",
    description: "Enhanced orchestration engine with parallel execution paths and load balancing",
  },
  PRISM_FAILSAFE_GENERATOR: {
    filename: "PRISM_FAILSAFE_GENERATOR.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 169,
    safety_class: "LOW",
    description: "Failsafe code generator producing conservative fallback parameters on error",
  },
  PRISM_INTERVAL_ENGINE: {
    filename: "PRISM_INTERVAL_ENGINE.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 847,
    safety_class: "LOW",
    description: "Interval arithmetic engine for tolerance propagation and uncertainty quantification",
  },
  PRISM_NUMERICAL_ENGINE: {
    filename: "PRISM_NUMERICAL_ENGINE.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 19,
    safety_class: "LOW",
    description: "Minimal numerical engine stub for basic arithmetic and rounding utilities",
  },
  PRISM_UNIFIED_OUTPUT_ENGINE: {
    filename: "PRISM_UNIFIED_OUTPUT_ENGINE.js",
    source_dir: "extracted/engines/core",
    category: "engines",
    lines: 195,
    safety_class: "LOW",
    description: "Unified output formatter producing consistent JSON, CSV, and human-readable reports",
  },

  // ── extracted/engines/infrastructure/ (2 files) ─────────────────────────────

  PRISM_DB_MANAGER: {
    filename: "PRISM_DB_MANAGER.js",
    source_dir: "extracted/engines/infrastructure",
    category: "engines",
    lines: 258,
    safety_class: "LOW",
    description: "Database connection manager with pooling, migrations, and health checks",
  },
  PRISM_EVENT_MANAGER: {
    filename: "PRISM_EVENT_MANAGER.js",
    source_dir: "extracted/engines/infrastructure",
    category: "engines",
    lines: 106,
    safety_class: "LOW",
    description: "Event lifecycle manager: registration, dispatch, and handler cleanup",
  },

  // ── extracted/infrastructure/ (5 files) ─────────────────────────────────────

  PRISM_COMPARE: {
    filename: "PRISM_COMPARE.js",
    source_dir: "extracted/infrastructure",
    category: "infrastructure",
    lines: 2198,
    safety_class: "LOW",
    description: "Deep comparison utilities for objects, arrays, and nested structures with diff output",
  },
  PRISM_EVENT_BUS: {
    filename: "PRISM_EVENT_BUS.js",
    source_dir: "extracted/infrastructure",
    category: "infrastructure",
    lines: 154,
    safety_class: "LOW",
    description: "Original event bus implementation with pub/sub, wildcards, and replay support",
  },
  PRISM_GATEWAY: {
    filename: "PRISM_GATEWAY.js",
    source_dir: "extracted/infrastructure",
    category: "infrastructure",
    lines: 111,
    safety_class: "LOW",
    description: "API gateway entry point for request routing and middleware chaining",
  },
  PRISM_STATE_STORE: {
    filename: "PRISM_STATE_STORE.js",
    source_dir: "extracted/infrastructure",
    category: "infrastructure",
    lines: 221,
    safety_class: "LOW",
    description: "Persistent state store with snapshot, restore, and change-notification support",
  },
  PRISM_VALIDATOR: {
    filename: "PRISM_VALIDATOR.js",
    source_dir: "extracted/infrastructure",
    category: "infrastructure",
    lines: 3369,
    safety_class: "LOW",
    description: "Comprehensive validation library for parameters, G-code, and configuration schemas",
  },
};

/**
 * Return the EventBus source-file catalog for audit and traceability.
  * @returns typeof  e v e n t b u s_ s o u r c e_ f i l e_ c a t a l o g
 */
export function getEventBusSourceFileCatalog(): typeof EVENTBUS_SOURCE_FILE_CATALOG {
  return EVENTBUS_SOURCE_FILE_CATALOG;
}
