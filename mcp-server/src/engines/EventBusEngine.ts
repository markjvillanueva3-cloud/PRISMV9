/**
 * EventBusEngine — in-memory typed pub/sub bus with bounded ring-buffer history.
 *
 * STUB-RESCUE (slot:bravo 2026-05-27, U-STUB-HUNT-05). Original was tagged
 * as a U-EFF25 stub but had partial publish/getRecentEvents/getStats
 * implementations and hardcoded `subscribers: 0`. infraDispatcher routes 4
 * actions here (`event_bus_publish`, `event_bus_events`, `event_bus_stats`,
 * summary.event_bus). Real implementation adds:
 *
 *   - typed subscribe(eventType, handler) → unsubscribe handle
 *   - subscribe("*") wildcard for global listeners
 *   - publish() now fans out to matching subscribers synchronously, with
 *     try/catch per handler so one bad subscriber can't break the bus
 *   - configurable ring-buffer ceiling (default 1000)
 *   - getStats() returns real subscriber count
 *   - clear() for test isolation
 *
 * @version 2.0.0 — restored from stub
 */

const DEFAULT_HISTORY_LIMIT = 1000;
const DEFAULT_GET_RECENT_LIMIT = 20;
const ID_RAND_SLICE_START = 2;
const ID_RAND_SLICE_END = 8;
const WILDCARD = "*";

export interface EventBusEvent {
  type: string;
  version?: number;
  source?: string;
  data?: Record<string, unknown>;
  correlation_id?: string;
}

export interface EventBusRecord {
  id: string;
  ts: number;
  evt: EventBusEvent;
}

export interface EventBusStats {
  mode: string;
  event_count: number;
  subscribers: number;
  history_limit: number;
  publish_count: number;
  dropped_handler_count: number;
  /** Durable-backend appends that failed (when a sink is attached + flag=redis). */
  durable_dropped_count: number;
}

/**
 * Optional durable backend the in-memory bus ALSO fans out to (Phase 3 of
 * INFRA-SYNERGY). RedisStreamSink satisfies this structurally. Default: none
 * attached => the bus is byte-identical in-memory (zero regression).
 */
export interface DurableEventSink {
  append(
    topic: string,
    event: { type: string; payload?: Record<string, unknown>; ts?: number; source?: string },
  ): Promise<{ ok: boolean }>;
}

export type EventBusHandler = (record: EventBusRecord) => void;
export type Unsubscribe = () => void;

export class EventBusEngine {
  private events: EventBusRecord[] = [];
  private subscribers = new Map<string, Set<EventBusHandler>>();
  private historyLimit: number;
  private publishCount = 0;
  private droppedHandlerCount = 0;
  private now: () => number;
  private idSeq = 0;
  private durableSink: DurableEventSink | null = null;
  private durableDropped = 0;

  constructor(opts: { historyLimit?: number; now?: () => number } = {}) {
    this.historyLimit = Number.isFinite(opts.historyLimit) && (opts.historyLimit as number) > 0
      ? (opts.historyLimit as number)
      : DEFAULT_HISTORY_LIMIT;
    this.now = opts.now ?? (() => Date.now());
  }

  /** Publish an event. Returns the generated event id. */
  async publish(evt: EventBusEvent): Promise<string> {
    if (!evt || typeof evt.type !== "string" || evt.type.length === 0) {
      throw new Error("EventBusEngine.publish: evt.type is required (non-empty string)");
    }
    this.idSeq += 1;
    const id = `evt-${this.now()}-${this.idSeq.toString(36)}-${Math.random().toString(36).slice(ID_RAND_SLICE_START, ID_RAND_SLICE_END)}`;
    const record: EventBusRecord = { id, ts: this.now(), evt };
    this.events.push(record);
    while (this.events.length > this.historyLimit) this.events.shift();
    this.publishCount += 1;
    // Synchronous fan-out — type-specific first, then wildcard.
    this.dispatchTo(this.subscribers.get(evt.type), record);
    this.dispatchTo(this.subscribers.get(WILDCARD), record);
    // Durable fan-out (Phase 3): ONLY when a sink is attached AND PRISM_EVENT_BUS=redis.
    // Default (no sink / flag!=redis) -> skipped -> byte-identical in-memory bus.
    // Fail-soft: a down/failing sink can never break publish (mirrors per-handler
    // fail-soft above); it bumps durable_dropped_count instead.
    if (this.durableSink && process.env.PRISM_EVENT_BUS === "redis") {
      try {
        const r = await this.durableSink.append(evt.type, {
          type: evt.type, payload: evt.data, source: evt.source, ts: record.ts,
        });
        if (!r.ok) this.durableDropped += 1;
      } catch {
        this.durableDropped += 1;
      }
    }
    return id;
  }

  private dispatchTo(handlers: Set<EventBusHandler> | undefined, record: EventBusRecord): void {
    if (!handlers) return;
    for (const h of handlers) {
      try { h(record); }
      catch { this.droppedHandlerCount += 1; /* fail-soft per R12: one bad handler can't break the bus */ }
    }
  }

  /** Subscribe to an event type ("*" for wildcard). Returns unsubscribe handle. */
  subscribe(eventType: string, handler: EventBusHandler): Unsubscribe {
    if (typeof eventType !== "string" || eventType.length === 0) {
      throw new Error("EventBusEngine.subscribe: eventType is required");
    }
    if (typeof handler !== "function") {
      throw new Error("EventBusEngine.subscribe: handler must be a function");
    }
    if (!this.subscribers.has(eventType)) this.subscribers.set(eventType, new Set());
    this.subscribers.get(eventType)!.add(handler);
    return () => {
      const set = this.subscribers.get(eventType);
      if (!set) return;
      set.delete(handler);
      if (set.size === 0) this.subscribers.delete(eventType);
    };
  }

  /** Recent events, optionally filtered by type. */
  getRecentEvents(type?: string, limit = DEFAULT_GET_RECENT_LIMIT): EventBusRecord[] {
    const filtered = type ? this.events.filter((e) => e.evt.type === type) : this.events;
    return filtered.slice(-Math.max(1, limit));
  }

  /**
   * Attach a durable backend (e.g. RedisStreamSink) that publish() ALSO fans
   * out to when PRISM_EVENT_BUS=redis. Additive: with no sink the bus is
   * byte-identical in-memory. Pass null to detach.
   */
  attachDurableSink(sink: DurableEventSink | null): void {
    this.durableSink = sink;
  }

  /** Aggregate stats. */
  getStats(): EventBusStats {
    let subCount = 0;
    for (const set of this.subscribers.values()) subCount += set.size;
    return {
      // Reflect REALITY: "+redis" only when durable writes actually flow
      // (sink attached AND flag on), matching the publish() write condition.
      mode: (this.durableSink && process.env.PRISM_EVENT_BUS === "redis") ? "in-memory+redis" : "in-memory",
      event_count: this.events.length,
      subscribers: subCount,
      history_limit: this.historyLimit,
      publish_count: this.publishCount,
      dropped_handler_count: this.droppedHandlerCount,
      durable_dropped_count: this.durableDropped,
    };
  }

  /** Clear all events + subscribers (test isolation). */
  clear(): void {
    this.events = [];
    this.subscribers.clear();
    this.publishCount = 0;
    this.droppedHandlerCount = 0;
    this.durableDropped = 0;
    this.idSeq = 0;
  }
}

export const eventBusEngine = new EventBusEngine();
