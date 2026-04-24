// WIRE-EXEMPT: U-EFF25 stub — real engine never existed on any branch; consumed via dynamic import with try/catch fallback in infraDispatcher
/**
 * EventBusEngine — in-memory event bus stub (U-EFF25).
 *
 * Created to unblock compilation after main-restore gap analysis. Real engine
 * was never on any branch; infraDispatcher imports it dynamically with
 * try/catch fallbacks, so this stub only needs to satisfy TS2307 and return
 * safe defaults until an event-bus implementation lands.
 */
export interface EventBusEvent {
  type: string;
  version?: number;
  source?: string;
  data?: Record<string, unknown>;
}

export interface EventBusStats {
  mode: string;
  event_count: number;
  subscribers: number;
}

class EventBusEngine {
  private events: Array<{ id: string; ts: number; evt: EventBusEvent }> = [];

  async publish(evt: EventBusEvent): Promise<string> {
    const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.events.push({ id, ts: Date.now(), evt });
    if (this.events.length > 1000) this.events.shift();
    return id;
  }

  getRecentEvents(type?: string, limit = 20): Array<{ id: string; ts: number; evt: EventBusEvent }> {
    const filtered = type ? this.events.filter((e) => e.evt.type === type) : this.events;
    return filtered.slice(-Math.max(1, limit));
  }

  getStats(): EventBusStats {
    return { mode: "in-memory-stub", event_count: this.events.length, subscribers: 0 };
  }
}

export const eventBusEngine = new EventBusEngine();
