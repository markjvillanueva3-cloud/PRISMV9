/**
 * EventEngine — companion test
 * =============================
 * WIRE-UNWIRED-MS0/U-WIRE-EVENT-ENGINE
 *
 * Verifies the prism_infra surface (evt_* actions) backed by the in-process
 * EventEngine singleton (distinct from `eventBusEngine` which the existing
 * event_* actions wire to).
 *
 * Covered by the wiring:
 *   - evt_emit              → eventEngine.emit(topic, payload, source, cid)
 *   - evt_history           → eventEngine.getHistory(topic?, limit?)
 *   - evt_replay            → eventEngine.replay(topic, since?)
 *   - evt_subscriptions_list → eventEngine.listSubscriptions()
 *   - evt_dead_letter       → eventEngine.getDeadLetter(limit?)
 *   - evt_stats             → eventEngine.stats()
 *
 * `subscribe` / `unsubscribe` are exercised here (require an in-process
 * EventHandler callback) but are NOT exposed via MCP — the dispatcher only
 * lists the read+admin surface above.
 *
 * Each assertion compares against a concrete expected value (R9). No
 * `.toBeDefined()` / `.toBeUndefined()` line-end stubs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  EventEngine,
  eventEngine,
  type EventMessage,
} from "../engines/EventEngine.js";

describe("EventEngine", () => {
  beforeEach(() => {
    // clear() wipes subscriptions, history, dead-letter, topic counts AND
    // resets both module-level id counters (line 216-217 of EventEngine.ts).
    eventEngine.clear();
  });

  describe("emit — id format + history accumulation", () => {
    it("emits an event with a zero-padded 'EVT-' id, ISO timestamp, and stored payload", () => {
      const before = Date.now();
      const evt = eventEngine.emit("machine.start", { rpm: 1200 }, "cnc-1");
      const after = Date.now();
      expect(evt.id).toEqual("EVT-00000001");
      expect(evt.topic).toEqual("machine.start");
      expect(evt.payload).toEqual({ rpm: 1200 });
      expect(evt.source).toEqual("cnc-1");
      const ts = Date.parse(evt.timestamp);
      expect(Number.isFinite(ts)).toEqual(true);
      expect(ts >= before && ts <= after).toEqual(true);
    });

    it("monotonically increments the event id across emits", () => {
      const a = eventEngine.emit("t", 1);
      const b = eventEngine.emit("t", 2);
      const c = eventEngine.emit("t", 3);
      expect(a.id).toEqual("EVT-00000001");
      expect(b.id).toEqual("EVT-00000002");
      expect(c.id).toEqual("EVT-00000003");
    });

    it("defaults source to 'system' when omitted", () => {
      const evt = eventEngine.emit("t", null);
      expect(evt.source).toEqual("system");
    });

    it("passes correlation_id through when provided", () => {
      const evt = eventEngine.emit("t", null, "src-x", "corr-abc");
      expect(evt.correlation_id).toEqual("corr-abc");
    });

    it("appends every emit to history (verified via getHistory)", () => {
      eventEngine.emit("a", 1);
      eventEngine.emit("b", 2);
      eventEngine.emit("c", 3);
      const all = eventEngine.getHistory();
      const topics = all.map((e) => e.topic);
      expect(topics).toEqual(["a", "b", "c"]);
    });
  });

  describe("subscribe / matchTopic — pattern semantics", () => {
    it("exact-match: subscribes to a literal topic and receives only that topic", () => {
      const received: EventMessage[] = [];
      eventEngine.subscribe("alarm", "alarm-handler", (e) => received.push(e));
      eventEngine.emit("alarm", { code: "E01" });
      eventEngine.emit("info", { msg: "ok" });
      expect(received.length).toEqual(1);
      expect(received[0].topic).toEqual("alarm");
    });

    it("wildcard '*' subscribes to ALL topics", () => {
      const received: EventMessage[] = [];
      eventEngine.subscribe("*", "all-handler", (e) => received.push(e));
      eventEngine.emit("a", 1);
      eventEngine.emit("b.deeply.nested", 2);
      expect(received.length).toEqual(2);
    });

    it("prefix wildcard 'machine.*' matches 'machine.start' AND 'machine.stop.spindle'", () => {
      const received: EventMessage[] = [];
      eventEngine.subscribe("machine.*", "mach-handler", (e) => received.push(e));
      eventEngine.emit("machine.start", null);
      eventEngine.emit("machine.stop.spindle", null);
      eventEngine.emit("other", null);
      const topics = received.map((e) => e.topic).sort();
      expect(topics).toEqual(["machine.start", "machine.stop.spindle"]);
    });

    it("prefix wildcard 'machine.*' also matches the bare 'machine'", () => {
      const received: EventMessage[] = [];
      eventEngine.subscribe("machine.*", "mach-handler", (e) => received.push(e));
      eventEngine.emit("machine", null);
      expect(received.length).toEqual(1);
    });

    it("glob '**' matches: 'machine.**.alarm' catches 'machine.cnc1.alarm'", () => {
      const received: EventMessage[] = [];
      eventEngine.subscribe("machine.**.alarm", "h", (e) => received.push(e));
      eventEngine.emit("machine.cnc1.alarm", null);
      eventEngine.emit("machine.cnc1.heartbeat", null); // no match
      expect(received.length).toEqual(1);
      expect(received[0].topic).toEqual("machine.cnc1.alarm");
    });

    it("non-matching pattern → handler is not invoked", () => {
      let count = 0;
      eventEngine.subscribe("orders.*", "h", () => count++);
      eventEngine.emit("alarm", null);
      expect(count).toEqual(0);
    });

    it("tracks events_received per subscription", () => {
      eventEngine.subscribe("t", "h1", () => undefined);
      eventEngine.emit("t", 1);
      eventEngine.emit("t", 2);
      const subs = eventEngine.listSubscriptions();
      expect(subs.length).toEqual(1);
      expect(subs[0].events_received).toEqual(2);
      expect(subs[0].subscriber).toEqual("h1");
    });

    it("returns a SUB- zero-padded id from subscribe()", () => {
      const sub = eventEngine.subscribe("t", "h", () => undefined);
      expect(sub.id).toMatch(/^SUB-\d{6}$/);
    });
  });

  describe("unsubscribe", () => {
    it("returns true when the subscription existed, false otherwise", () => {
      const sub = eventEngine.subscribe("t", "h", () => undefined);
      expect(eventEngine.unsubscribe(sub.id)).toEqual(true);
      expect(eventEngine.unsubscribe(sub.id)).toEqual(false);
      expect(eventEngine.unsubscribe("SUB-nonexistent")).toEqual(false);
    });

    it("after unsubscribe, future emits do NOT invoke the handler", () => {
      let count = 0;
      const sub = eventEngine.subscribe("t", "h", () => count++);
      eventEngine.emit("t", 1);
      eventEngine.unsubscribe(sub.id);
      eventEngine.emit("t", 2);
      expect(count).toEqual(1);
    });
  });

  describe("dead-letter queue", () => {
    it("events with no matching subscriber go to the dead-letter queue", () => {
      eventEngine.emit("orphan", 1);
      const dlq = eventEngine.getDeadLetter();
      expect(dlq.length).toEqual(1);
      expect(dlq[0].topic).toEqual("orphan");
    });

    it("events WITH a matching subscriber do NOT go to the dead-letter queue", () => {
      eventEngine.subscribe("delivered", "h", () => undefined);
      eventEngine.emit("delivered", 1);
      expect(eventEngine.getDeadLetter()).toEqual([]);
    });

    it("[ENGINE-QUIRK] a throwing-only handler does NOT count as delivered → event goes to DLQ", () => {
      // Verified semantics: in emit(), `delivered = true` is set AFTER
      // `handler(event)` runs successfully. If the handler throws, control
      // jumps to the catch block before delivered flips, so the event
      // arrives in the DLQ even though a matching subscription existed.
      // The bus does not crash (catch swallows the error), but downstream
      // observers see the event as undelivered.
      eventEngine.subscribe("t", "throwing-handler", () => {
        throw new Error("boom");
      });
      eventEngine.emit("t", 1);
      const dlq = eventEngine.getDeadLetter();
      expect(dlq.length).toEqual(1);
      expect(dlq[0].topic).toEqual("t");
    });

    it("a partially-throwing topic (one OK handler + one throwing) is NOT sent to DLQ", () => {
      // One successful delivery is enough to flip the `delivered` flag.
      let okCount = 0;
      eventEngine.subscribe("t", "ok-handler", () => { okCount++; });
      eventEngine.subscribe("t", "throwing-handler", () => {
        throw new Error("boom");
      });
      eventEngine.emit("t", 1);
      expect(okCount).toEqual(1);
      expect(eventEngine.getDeadLetter()).toEqual([]);
    });
  });

  describe("getHistory — filter + limit", () => {
    it("returns the last `limit` events when no topic filter", () => {
      for (let i = 1; i <= 10; i++) eventEngine.emit("t", i);
      const last3 = eventEngine.getHistory(undefined, 3);
      expect(last3.length).toEqual(3);
      expect(last3.map((e) => e.payload)).toEqual([8, 9, 10]);
    });

    it("filters by topic-pattern (wildcard semantics inherited from matchTopic)", () => {
      eventEngine.emit("alarm.high", null);
      eventEngine.emit("alarm.low", null);
      eventEngine.emit("info", null);
      const alarms = eventEngine.getHistory("alarm.*");
      const topics = alarms.map((e) => e.topic).sort();
      expect(topics).toEqual(["alarm.high", "alarm.low"]);
    });

    it("returns the WHOLE history when fewer events than limit", () => {
      eventEngine.emit("a", 1);
      eventEngine.emit("b", 2);
      const all = eventEngine.getHistory(undefined, 100);
      expect(all.length).toEqual(2);
    });
  });

  describe("replay — re-delivers historical events to current subscribers", () => {
    it("returns the events that match the topic pattern", () => {
      eventEngine.emit("machine.start", { rpm: 1200 });
      eventEngine.emit("info", { msg: "ok" });
      eventEngine.emit("machine.stop", null);
      const replayed = eventEngine.replay("machine.*");
      const topics = replayed.map((e) => e.topic).sort();
      expect(topics).toEqual(["machine.start", "machine.stop"]);
    });

    it("re-delivers replayed events to a subscriber registered AFTER the original emits", () => {
      eventEngine.emit("machine.start", null);
      eventEngine.emit("machine.stop", null);
      const received: string[] = [];
      eventEngine.subscribe("machine.*", "late-handler", (e) => received.push(e.topic));
      // Sanity: no events arrived yet — late subscriber hasn't seen anything.
      expect(received).toEqual([]);
      eventEngine.replay("machine.*");
      expect(received.sort()).toEqual(["machine.start", "machine.stop"]);
    });

    it("filters by `since` cutoff (ISO timestamp)", () => {
      // Engine semantics: `replay(topic, since)` includes events whose
      // timestamp is `>=` since. Since `toISOString()` is ms-precision and
      // multiple `new Date()` calls inside the same ms collide, we must spin
      // until the clock advances BEFORE capturing the cutoff so the first
      // emit's timestamp is strictly less than cutoff. Without this guard,
      // event 1 + cutoff land on the same ms and `event1.timestamp >= cutoff`
      // is true (collision = false-positive).
      eventEngine.emit("t", 1);
      const t1 = Date.now();
      while (Date.now() === t1) { /* spin <1ms */ }
      const cutoff = new Date().toISOString();
      eventEngine.emit("t", 2);
      const replayed = eventEngine.replay("t", cutoff);
      expect(replayed.length).toEqual(1);
      expect(replayed[0].payload).toEqual(2);
    });
  });

  describe("stats", () => {
    it("returns total_emitted, total_subscriptions, topics, events_per_topic, dead_letter_count", () => {
      eventEngine.subscribe("a", "sub-a", () => undefined);
      eventEngine.emit("a", 1);
      eventEngine.emit("a", 2);
      eventEngine.emit("b", 3); // no subscriber → DLQ
      const s = eventEngine.stats();
      expect(s.total_emitted).toEqual(3);
      expect(s.total_subscriptions).toEqual(1);
      expect(s.topics.sort()).toEqual(["a", "b"]);
      expect(s.events_per_topic.a).toEqual(2);
      expect(s.events_per_topic.b).toEqual(1);
      expect(s.dead_letter_count).toEqual(1);
    });

    it("returns zeroed stats after clear()", () => {
      eventEngine.emit("t", 1);
      eventEngine.subscribe("t", "h", () => undefined);
      eventEngine.clear();
      const s = eventEngine.stats();
      expect(s.total_emitted).toEqual(0);
      expect(s.total_subscriptions).toEqual(0);
      expect(s.topics).toEqual([]);
      expect(s.dead_letter_count).toEqual(0);
    });
  });

  describe("clear() — full singleton reset", () => {
    it("wipes subscriptions, history, dead-letter queue, AND resets id counters", () => {
      eventEngine.subscribe("a", "s", () => undefined);
      eventEngine.emit("a", 1);
      eventEngine.emit("b", 2);
      eventEngine.clear();
      expect(eventEngine.listSubscriptions()).toEqual([]);
      expect(eventEngine.getHistory()).toEqual([]);
      expect(eventEngine.getDeadLetter()).toEqual([]);
      // Module-level id counter restarted from 0.
      const first = eventEngine.emit("x", null);
      expect(first.id).toEqual("EVT-00000001");
    });
  });

  describe("adversarial inputs", () => {
    it("handles null/undefined/empty payloads", () => {
      const a = eventEngine.emit("t", null);
      const b = eventEngine.emit("t", undefined);
      const c = eventEngine.emit("t", "");
      expect(a.payload).toEqual(null);
      expect(b.payload === undefined).toEqual(true);
      expect(c.payload).toEqual("");
    });

    it("handles deep nested payloads via JSON-equivalent comparison", () => {
      const nested = { a: { b: { c: [1, 2, { d: "deep" }] } } };
      const evt = eventEngine.emit("t", nested);
      expect(evt.payload).toEqual(nested);
    });

    it("non-matching unsubscribe ID returns false (no exception)", () => {
      expect(eventEngine.unsubscribe("definitely-not-real")).toEqual(false);
    });
  });

  describe("class export — multi-tenant isolation", () => {
    it("creating a new EventEngine instance does not share subscriptions with the singleton", () => {
      const local = new EventEngine();
      const localReceived: string[] = [];
      local.subscribe("t", "local-h", (e) => localReceived.push(`local-${e.topic}`));
      // Emit on the singleton → must NOT reach the local instance.
      eventEngine.emit("t", null);
      expect(localReceived).toEqual([]);
      // Emit on the local → must NOT reach singleton subscriptions.
      const singletonReceived: string[] = [];
      eventEngine.subscribe("t", "singleton-h", (e) => singletonReceived.push(`s-${e.topic}`));
      local.emit("t", null);
      expect(singletonReceived).toEqual([]);
    });
  });
});
