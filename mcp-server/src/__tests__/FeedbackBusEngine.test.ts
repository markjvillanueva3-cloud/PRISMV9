/**
 * FeedbackBusEngine.test.ts — U-NN-LOOP01 closed-loop pub/sub primitive.
 *
 * Tests cover the contract from the engine spec:
 *   - sync round-trip subscribe→publish (concrete numeric assertions)
 *   - multi-subscriber fan-out (all receive the same event)
 *   - wildcard "*" receives every concrete publish
 *   - subscriber crashes (sync + async) are isolated; others still fire
 *   - unsubscribe is idempotent and removes empty topic buckets
 *   - publish to an orphan topic is a no-op (no error, stats updated)
 *   - publish is non-blocking (control returns synchronously)
 *   - input validation throws on empty topic or non-function callback
 *   - publish to wildcard "*" is rejected (use concrete topic)
 *   - stats() reports counts truthfully
 *   - reset() clears subscriptions and counters
 *   - self-unsubscribe-during-publish does not corrupt fan-out
 *   - singleton export is the same instance across imports
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  FeedbackBusEngine,
  feedbackBusEngine,
  type FeedbackEvent,
} from "../engines/FeedbackBusEngine.js";

// queueMicrotask schedules on the microtask queue; awaiting an already-resolved
// promise lets the queue drain in order. Used after every publish() to verify
// fan-out completed.
const flushMicrotasks = () => Promise.resolve();

describe("FeedbackBusEngine", () => {
  let bus: FeedbackBusEngine;

  beforeEach(() => {
    bus = new FeedbackBusEngine();
  });

  it("subscribe + publish round-trip delivers exactly the event", async () => {
    const seen: FeedbackEvent[] = [];
    bus.subscribe("outcome.recorded", (e) => {
      seen.push(e);
    });

    bus.publish("outcome.recorded", { id: 42, success: true });
    await flushMicrotasks();

    expect(seen.length).toBe(1);
    expect(seen[0].topic).toBe("outcome.recorded");
    expect(seen[0].payload).toEqual({ id: 42, success: true });
    expect(typeof seen[0].ts).toBe("string");
    expect(seen[0].ts.length).toBeGreaterThanOrEqual(20); // ISO timestamp
  });

  it("multi-subscriber fan-out: every subscriber on a topic receives the event", async () => {
    let aHits = 0;
    let bHits = 0;
    let cHits = 0;
    bus.subscribe("p2p.emitted", () => {
      aHits++;
    });
    bus.subscribe("p2p.emitted", () => {
      bHits++;
    });
    bus.subscribe("p2p.emitted", () => {
      cHits++;
    });

    bus.publish("p2p.emitted", null);
    await flushMicrotasks();

    expect(aHits).toBe(1);
    expect(bHits).toBe(1);
    expect(cHits).toBe(1);
    expect(bus.subscriberCount("p2p.emitted")).toBe(3);
  });

  it("wildcard '*' subscriber receives every concrete publish", async () => {
    const wildcardEvents: string[] = [];
    bus.subscribe("*", (e) => {
      wildcardEvents.push(e.topic);
    });

    bus.publish("topic.alpha", 1);
    bus.publish("topic.beta", 2);
    bus.publish("topic.gamma", 3);
    await flushMicrotasks();

    expect(wildcardEvents).toEqual(["topic.alpha", "topic.beta", "topic.gamma"]);
  });

  it("wildcard subscriber fires alongside concrete subscribers (no duplication on concrete)", async () => {
    let concreteHits = 0;
    let wildcardHits = 0;
    bus.subscribe("neural.train.tick", () => {
      concreteHits++;
    });
    bus.subscribe("*", () => {
      wildcardHits++;
    });

    bus.publish("neural.train.tick", null);
    await flushMicrotasks();

    expect(concreteHits).toBe(1);
    expect(wildcardHits).toBe(1);
    // Different topic — only wildcard fires
    bus.publish("memory.feedback", null);
    await flushMicrotasks();
    expect(concreteHits).toBe(1);
    expect(wildcardHits).toBe(2);
  });

  it("sync subscriber crash is isolated — other subscribers still fire", async () => {
    let aHits = 0;
    let cHits = 0;
    bus.subscribe("crash.test", () => {
      aHits++;
    });
    bus.subscribe("crash.test", () => {
      throw new Error("boom (intentional test crash)");
    });
    bus.subscribe("crash.test", () => {
      cHits++;
    });

    bus.publish("crash.test", null);
    await flushMicrotasks();

    expect(aHits).toBe(1);
    expect(cHits).toBe(1);
    expect(bus.stats().totalSubscriberErrors).toBe(1);
  });

  it("async subscriber rejection is captured in error counter, others survive", async () => {
    let aHits = 0;
    let cHits = 0;
    bus.subscribe("async.crash", () => {
      aHits++;
    });
    bus.subscribe("async.crash", async () => {
      throw new Error("async boom (intentional)");
    });
    bus.subscribe("async.crash", () => {
      cHits++;
    });

    bus.publish("async.crash", null);
    // Two microtask flushes: one for the queueMicrotask wrapper, one for the
    // promise rejection .catch handler attached to the returned promise.
    await flushMicrotasks();
    await flushMicrotasks();

    expect(aHits).toBe(1);
    expect(cHits).toBe(1);
    expect(bus.stats().totalSubscriberErrors).toBe(1);
  });

  it("unsubscribe detaches the subscription and returns true", async () => {
    let hits = 0;
    const handle = bus.subscribe("detach.me", () => {
      hits++;
    });

    bus.publish("detach.me", null);
    await flushMicrotasks();
    expect(hits).toBe(1);

    const removed = bus.unsubscribe(handle);
    expect(removed).toBe(true);

    bus.publish("detach.me", null);
    await flushMicrotasks();
    expect(hits).toBe(1); // still 1 — unsubscribed
  });

  it("unsubscribe is idempotent — second call returns false", () => {
    const handle = bus.subscribe("idempotent", () => {});
    expect(bus.unsubscribe(handle)).toBe(true);
    expect(bus.unsubscribe(handle)).toBe(false);
    // Garbage handle
    expect(bus.unsubscribe({ id: 9999, topic: "nonexistent" })).toBe(false);
  });

  it("topic bucket is removed when last subscriber unsubscribes (no memory leak)", () => {
    const h1 = bus.subscribe("leak.check", () => {});
    const h2 = bus.subscribe("leak.check", () => {});

    expect(bus.topics()).toContain("leak.check");
    bus.unsubscribe(h1);
    expect(bus.topics()).toContain("leak.check"); // h2 still there
    bus.unsubscribe(h2);
    expect(bus.topics()).not.toContain("leak.check"); // bucket purged
    expect(bus.subscriberCount("leak.check")).toBe(0);
  });

  it("publish to a topic with no subscribers is a no-op (still counts in stats)", async () => {
    bus.publish("orphan.topic", { foo: "bar" });
    await flushMicrotasks();

    expect(bus.stats().totalPublished).toBe(1);
    expect(bus.stats().totalDelivered).toBe(0);
    expect(bus.stats().totalSubscriberErrors).toBe(0);
  });

  it("publish is non-blocking — control returns before subscriber runs", () => {
    let ran = false;
    bus.subscribe("nonblock", () => {
      ran = true;
    });

    bus.publish("nonblock", null);
    // Subscriber runs in microtask — has NOT executed yet
    expect(ran).toBe(false);
  });

  it("subscribe rejects empty topic or non-function callback", () => {
    expect(() => bus.subscribe("", () => {})).toThrow(/non-empty string/);
    // @ts-expect-error — intentional bad input
    expect(() => bus.subscribe("ok", null)).toThrow(/must be a function/);
    // @ts-expect-error — intentional bad input
    expect(() => bus.subscribe("ok", 123)).toThrow(/must be a function/);
  });

  it("publish rejects empty topic and the wildcard topic", () => {
    expect(() => bus.publish("", null)).toThrow(/non-empty string/);
    expect(() => bus.publish("*", null)).toThrow(/wildcard/);
  });

  it("stats() reports accurate counts across multiple publishes", async () => {
    bus.subscribe("alpha", () => {});
    bus.subscribe("alpha", () => {});
    bus.subscribe("beta", () => {});

    bus.publish("alpha", 1);
    bus.publish("alpha", 2);
    bus.publish("beta", 3);
    bus.publish("gamma", 4); // no subscriber
    await flushMicrotasks();

    const s = bus.stats();
    expect(s.totalSubscriptions).toBe(3);
    expect(s.totalPublished).toBe(4);
    expect(s.totalDelivered).toBe(2 + 2 + 1 + 0);
    expect(s.totalSubscriberErrors).toBe(0);
    const alpha = s.topics.find((t) => t.topic === "alpha");
    expect(alpha?.subscriberCount).toBe(2);
    expect(alpha?.publishCount).toBe(2);
  });

  it("reset() clears subscriptions, counters, and resets id allocator", async () => {
    bus.subscribe("foo", () => {});
    bus.publish("foo", null);
    await flushMicrotasks();
    expect(bus.stats().totalPublished).toBe(1);

    bus.reset();

    expect(bus.topics()).toEqual([]);
    expect(bus.stats().totalPublished).toBe(0);
    expect(bus.stats().totalDelivered).toBe(0);
    expect(bus.stats().totalSubscriptions).toBe(0);
    // After reset the next subscription id starts at 1 again
    const h = bus.subscribe("foo", () => {});
    expect(h.id).toBe(1);
  });

  it("self-unsubscribe inside callback does not corrupt the current fan-out", async () => {
    // Snapshot semantics: a subscriber that unsubscribes itself mid-publish
    // must NOT prevent later subscribers (registered before publish) from firing.
    let aHits = 0;
    let cHits = 0;
    bus.subscribe("self.unsub", () => {
      aHits++;
    });
    let selfHandle: ReturnType<typeof bus.subscribe>;
    selfHandle = bus.subscribe("self.unsub", () => {
      bus.unsubscribe(selfHandle);
    });
    bus.subscribe("self.unsub", () => {
      cHits++;
    });

    bus.publish("self.unsub", null);
    await flushMicrotasks();

    expect(aHits).toBe(1);
    expect(cHits).toBe(1);
    expect(bus.subscriberCount("self.unsub")).toBe(2);

    // Second publish — middle subscriber is gone
    bus.publish("self.unsub", null);
    await flushMicrotasks();
    expect(aHits).toBe(2);
    expect(cHits).toBe(2);
  });

  it("subscriberCount returns 0 for unknown topic and matches active subs", () => {
    expect(bus.subscriberCount("never.subscribed")).toBe(0);
    bus.subscribe("counted", () => {});
    bus.subscribe("counted", () => {});
    expect(bus.subscriberCount("counted")).toBe(2);
    // Wildcard subscribers do NOT count toward concrete topics
    bus.subscribe("*", () => {});
    expect(bus.subscriberCount("counted")).toBe(2);
  });

  it("singleton export is shared across importers", async () => {
    // The default singleton in FeedbackBusEngine.ts MUST behave like a real
    // bus and must be the same instance across all callers.
    expect(feedbackBusEngine).toBeInstanceOf(FeedbackBusEngine);
    feedbackBusEngine.reset();
    let hits = 0;
    const handle = feedbackBusEngine.subscribe("singleton.test", () => {
      hits++;
    });
    feedbackBusEngine.publish("singleton.test", null);
    await flushMicrotasks();
    expect(hits).toBe(1);
    feedbackBusEngine.unsubscribe(handle);
    feedbackBusEngine.reset();
  });
});
