/**
 * EventEngine — L2-P3-MS1 Infrastructure Layer
 *
 * In-process event bus with pub/sub, wildcard subscriptions,
 * event history, replay capability, and dead letter tracking.
 *
 * Actions: event_emit, event_subscribe, event_unsubscribe,
 *          event_history, event_replay
 */

// ============================================================================
// TYPES
// ============================================================================

export interface EventMessage {
  id: string;
  topic: string;
  payload: unknown;
  source: string;
  timestamp: string;
  correlation_id?: string;
}

export interface EventSubscription {
  id: string;
  topic_pattern: string;
  subscriber: string;
  created_at: string;
  events_received: number;
}

export interface EventStats {
  total_emitted: number;
  total_subscriptions: number;
  topics: string[];
  events_per_topic: Record<string, number>;
  dead_letter_count: number;
}

export type EventHandler = (event: EventMessage) => void;

// ============================================================================
// ENGINE CLASS
// ============================================================================

let eventIdCounter = 0;
let subIdCounter = 0;

export class EventEngine {
  private subscriptions = new Map<string, { sub: EventSubscription; handler: EventHandler }>();
  private history: EventMessage[] = [];
  private deadLetter: EventMessage[] = [];
  private topicCounts = new Map<string, number>();
  private maxHistory = 1000;

  emit(topic: string, payload: unknown, source: string = "system", correlationId?: string): EventMessage {
    eventIdCounter++;
    const event: EventMessage = {
      id: `EVT-${String(eventIdCounter).padStart(8, "0")}`,
      topic, payload, source,
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
    };

    this.history.push(event);
    if (this.history.length > this.maxHistory) this.history.shift();
    this.topicCounts.set(topic, (this.topicCounts.get(topic) || 0) + 1);

    let delivered = false;
    for (const { sub, handler } of this.subscriptions.values()) {
      if (this.matchTopic(sub.topic_pattern, topic)) {
        try {
          handler(event);
          sub.events_received++;
          delivered = true;
        } catch {
          // Handler error — don't crash bus
        }
      }
    }

    if (!delivered) {
      this.deadLetter.push(event);
      if (this.deadLetter.length > 500) this.deadLetter.shift();
    }

    return event;
  }

  subscribe(topicPattern: string, subscriber: string, handler: EventHandler): EventSubscription {
    subIdCounter++;
    const id = `SUB-${String(subIdCounter).padStart(6, "0")}`;
    const sub: EventSubscription = {
      id, topic_pattern: topicPattern, subscriber,
      created_at: new Date().toISOString(), events_received: 0,
    };
    this.subscriptions.set(id, { sub, handler });
    return sub;
  }

  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  getHistory(topic?: string, limit: number = 50): EventMessage[] {
    let result = [...this.history];
    if (topic) result = result.filter(e => this.matchTopic(topic, e.topic));
    return result.slice(-limit);
  }

  replay(topic: string, since?: string): EventMessage[] {
    let events = this.history.filter(e => this.matchTopic(topic, e.topic));
    if (since) {
      const sinceMs = new Date(since).getTime();
      events = events.filter(e => new Date(e.timestamp).getTime() >= sinceMs);
    }

    // Re-deliver to subscribers
    for (const event of events) {
      for (const { sub, handler } of this.subscriptions.values()) {
        if (this.matchTopic(sub.topic_pattern, event.topic)) {
          try { handler(event); } catch { /* skip */ }
        }
      }
    }

    return events;
  }

  listSubscriptions(): EventSubscription[] {
    return [...this.subscriptions.values()].map(s => s.sub);
  }

  getDeadLetter(limit: number = 50): EventMessage[] {
    return this.deadLetter.slice(-limit);
  }

  stats(): EventStats {
    const topicEntries: Record<string, number> = {};
    for (const [k, v] of this.topicCounts) topicEntries[k] = v;

    return {
      total_emitted: eventIdCounter,
      total_subscriptions: this.subscriptions.size,
      topics: [...this.topicCounts.keys()],
      events_per_topic: topicEntries,
      dead_letter_count: this.deadLetter.length,
    };
  }

  clear(): void {
    this.subscriptions.clear();
    this.history = [];
    this.deadLetter = [];
    this.topicCounts.clear();
    eventIdCounter = 0;
    subIdCounter = 0;
  }

  // ---- PRIVATE ----

  private matchTopic(pattern: string, topic: string): boolean {
    if (pattern === topic) return true;
    if (pattern === "*") return true;
    // Wildcard: "machine.*" matches "machine.start", "machine.stop.spindle"
    if (pattern.endsWith(".*")) {
      const prefix = pattern.slice(0, -2);
      return topic.startsWith(prefix + ".") || topic === prefix;
    }
    // Glob: "machine.**.alarm" matches "machine.cnc1.alarm"
    if (pattern.includes("**")) {
      const parts = pattern.split("**");
      return topic.startsWith(parts[0]) && topic.endsWith(parts[parts.length - 1]);
    }
    return false;
  }
}

export const eventEngine = new EventEngine();
