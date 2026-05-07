/**
 * FeedbackBusEngine.ts
 * U-NN-LOOP01 — In-process pub/sub event bus for closed-loop learning.
 *
 * Reviewer 2 finding (5-way assessment): 42 of 47 cross-process engines have
 * ZERO production callers. The promised FeedbackBusEngine from
 * INFRA-NEURAL-LEDGER-MS1/P0-U04 was never built. Print-to-program engines
 * never emit outcome events; the neural learner never auto-trains; memory
 * never gets the cross-engine signal it needs to consolidate. This is "the
 * single missing primitive that converts the 47-node forest into a graph."
 *
 * Design (per P0-U04 spec):
 *   - subscribe(topic, callback) → handle (unsubscribe via .unsubscribe(handle))
 *   - publish(topic, event)      → fan-out to all subscribers async
 *   - Async fan-out via queueMicrotask: a slow subscriber MUST NOT block
 *     the publisher. Each subscriber call is wrapped in try/catch — one
 *     crashing subscriber must not break the others or the publisher.
 *   - Wildcard topic `*` subscribes to ALL events (debug taps, telemetry).
 *   - In-process only; no external deps. EventEmitter from node:events
 *     would be too eager on error propagation, so we roll our own.
 *
 * Topics in PRISM (conventional, not enforced):
 *   - "outcome.recorded"      — new OutcomeRecord landed in CrossProcessOutcomeStore
 *   - "outcome.completed"     — pending → success/failure transition
 *   - "p2p.emitted"           — print-to-program produced a program
 *   - "neural.train.tick"     — NN consumed N samples since last tick
 *   - "memory.feedback"       — cross-session memory observed an update
 */

export type FeedbackEvent = {
  topic: string;
  ts: string;            // ISO timestamp (publisher-set)
  payload: unknown;
};

export type FeedbackCallback = (event: FeedbackEvent) => void | Promise<void>;

export interface SubscriptionHandle {
  /** Stable id for unsubscribe(). */
  readonly id: number;
  /** Topic pattern this handle was registered for. */
  readonly topic: string;
}

export interface FeedbackBusStats {
  totalSubscriptions: number;
  totalPublished: number;
  totalDelivered: number;
  totalSubscriberErrors: number;
  topics: Array<{ topic: string; subscriberCount: number; publishCount: number }>;
}

const WILDCARD_TOPIC = "*";

interface InternalSubscription {
  id: number;
  topic: string;
  callback: FeedbackCallback;
}

/**
 * In-process pub/sub feedback bus. Singleton-by-default but the class is
 * exported so tests can construct isolated instances.
 */
export class FeedbackBusEngine {
  private readonly subscriptions: Map<string, InternalSubscription[]> = new Map();
  private nextSubscriptionId = 1;
  private publishCounts: Map<string, number> = new Map();
  private totalPublished = 0;
  private totalDelivered = 0;
  private totalSubscriberErrors = 0;

  /**
   * Subscribe to a topic. Use "*" to receive every published event.
   * The returned handle can be passed to unsubscribe() to detach.
   *
   * @param topic Exact topic string, or "*" for catch-all.
   * @param callback Invoked once per matching publish (async-safe).
   * @returns Subscription handle for later unsubscribe().
   */
  subscribe(topic: string, callback: FeedbackCallback): SubscriptionHandle {
    if (typeof topic !== "string" || topic.length === 0) {
      throw new Error("subscribe: topic must be a non-empty string");
    }
    if (typeof callback !== "function") {
      throw new Error("subscribe: callback must be a function");
    }
    const id = this.nextSubscriptionId++;
    const sub: InternalSubscription = { id, topic, callback };
    const list = this.subscriptions.get(topic) ?? [];
    list.push(sub);
    this.subscriptions.set(topic, list);
    return { id, topic };
  }

  /**
   * Detach a subscription. Idempotent — calling unsubscribe twice on the
   * same handle is a no-op (returns false the second time).
   *
   * @returns true if a subscription was removed, false otherwise.
   */
  unsubscribe(handle: SubscriptionHandle): boolean {
    if (!handle || typeof handle.id !== "number") return false;
    const list = this.subscriptions.get(handle.topic);
    if (!list) return false;
    const idx = list.findIndex((s) => s.id === handle.id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    if (list.length === 0) {
      this.subscriptions.delete(handle.topic);
    }
    return true;
  }

  /**
   * Publish an event to a topic. Subscribers are notified asynchronously
   * via queueMicrotask — control returns to the caller immediately, even
   * if subscribers do work. A subscriber that throws is swallowed (logged
   * to bus stats); other subscribers still receive the event.
   *
   * @param topic Concrete topic — wildcard subscribers also fire.
   * @param payload Free-form event body. Stored on FeedbackEvent.payload.
   */
  publish(topic: string, payload: unknown): void {
    if (typeof topic !== "string" || topic.length === 0) {
      throw new Error("publish: topic must be a non-empty string");
    }
    if (topic === WILDCARD_TOPIC) {
      throw new Error("publish: cannot publish to wildcard topic '*' — use a concrete topic");
    }
    const event: FeedbackEvent = {
      topic,
      ts: new Date().toISOString(),
      payload,
    };
    this.totalPublished++;
    this.publishCounts.set(topic, (this.publishCounts.get(topic) ?? 0) + 1);

    // Concrete-topic subscribers + wildcard subscribers, in registration order.
    const concrete = this.subscriptions.get(topic) ?? [];
    const wildcard = this.subscriptions.get(WILDCARD_TOPIC) ?? [];
    const targets = [...concrete, ...wildcard];

    for (const sub of targets) {
      // Snapshot the subscription so a concurrent unsubscribe doesn't
      // shift the list under us. Each callback runs as its own microtask
      // — one slow subscriber doesn't block the next.
      queueMicrotask(() => {
        try {
          const result = sub.callback(event);
          // If the callback returns a promise, we still don't await — but
          // we attach a catch so unhandled-rejection doesn't propagate.
          if (result && typeof (result as Promise<unknown>).catch === "function") {
            (result as Promise<unknown>).catch(() => {
              this.totalSubscriberErrors++;
            });
          }
          this.totalDelivered++;
        } catch {
          this.totalSubscriberErrors++;
        }
      });
    }
  }

  /** List active topics (excludes wildcard) with subscriber counts. */
  topics(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /** Number of subscribers for a topic (does not count wildcard subscribers). */
  subscriberCount(topic: string): number {
    return (this.subscriptions.get(topic) ?? []).length;
  }

  /** Aggregate bus stats — useful for telemetry / health probes. */
  stats(): FeedbackBusStats {
    let totalSubs = 0;
    const topics: FeedbackBusStats["topics"] = [];
    for (const [t, list] of this.subscriptions.entries()) {
      totalSubs += list.length;
      topics.push({
        topic: t,
        subscriberCount: list.length,
        publishCount: this.publishCounts.get(t) ?? 0,
      });
    }
    return {
      totalSubscriptions: totalSubs,
      totalPublished: this.totalPublished,
      totalDelivered: this.totalDelivered,
      totalSubscriberErrors: this.totalSubscriberErrors,
      topics,
    };
  }

  /** Clear all subscriptions and reset counters (test reset hook). */
  reset(): void {
    this.subscriptions.clear();
    this.publishCounts.clear();
    this.nextSubscriptionId = 1;
    this.totalPublished = 0;
    this.totalDelivered = 0;
    this.totalSubscriberErrors = 0;
  }
}

export const feedbackBusEngine = new FeedbackBusEngine();
