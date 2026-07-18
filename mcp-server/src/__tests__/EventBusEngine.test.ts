/**
 * EventBusEngine tests — restoration coverage (U-STUB-HUNT-05).
 *
 * Slot:bravo 2026-05-27. Real concrete-value assertions only.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { EventBusEngine, eventBusEngine } from "../engines/EventBusEngine.js";

describe("EventBusEngine.publish", () => {
  it("returns a unique id per publish", async () => {
    const bus = new EventBusEngine();
    const a = await bus.publish({ type: "test.event", data: { n: 1 } });
    const b = await bus.publish({ type: "test.event", data: { n: 2 } });
    expect(a).not.toBe(b);
    expect(a.startsWith("evt-")).toBe(true);
  });

  it("appends to event history", async () => {
    const bus = new EventBusEngine();
    await bus.publish({ type: "x" });
    await bus.publish({ type: "x" });
    expect(bus.getStats().event_count).toBe(2);
  });

  it("respects historyLimit ring buffer", async () => {
    const bus = new EventBusEngine({ historyLimit: 3 });
    for (let i = 0; i < 5; i++) await bus.publish({ type: "t", data: { i } });
    const stats = bus.getStats();
    expect(stats.event_count).toBe(3);
    expect(stats.publish_count).toBe(5);
  });

  it("throws on missing type fail-loud (R12)", async () => {
    const bus = new EventBusEngine();
    await expect(bus.publish({} as { type: string })).rejects.toThrow(/type/);
    await expect(bus.publish({ type: "" })).rejects.toThrow(/type/);
  });
});

describe("EventBusEngine.subscribe", () => {
  it("delivers events to type-specific subscriber", async () => {
    const bus = new EventBusEngine();
    const received: string[] = [];
    bus.subscribe("a.event", (r) => received.push(r.evt.type));
    await bus.publish({ type: "a.event" });
    await bus.publish({ type: "b.event" });
    expect(received).toEqual(["a.event"]);
  });

  it("delivers to wildcard subscribers", async () => {
    const bus = new EventBusEngine();
    const received: string[] = [];
    bus.subscribe("*", (r) => received.push(r.evt.type));
    await bus.publish({ type: "x" });
    await bus.publish({ type: "y" });
    expect(received).toEqual(["x", "y"]);
  });

  it("unsubscribe handle stops delivery", async () => {
    const bus = new EventBusEngine();
    let count = 0;
    const off = bus.subscribe("t", () => { count += 1; });
    await bus.publish({ type: "t" });
    off();
    await bus.publish({ type: "t" });
    expect(count).toBe(1);
  });

  it("a thrown handler does not break the bus (R12 fail-soft fan-out)", async () => {
    const bus = new EventBusEngine();
    let saw = 0;
    bus.subscribe("crash", () => { throw new Error("boom"); });
    bus.subscribe("crash", () => { saw += 1; });
    await bus.publish({ type: "crash" });
    expect(saw).toBe(1);
    expect(bus.getStats().dropped_handler_count).toBe(1);
  });

  it("rejects empty event type + non-function handler", () => {
    const bus = new EventBusEngine();
    expect(() => bus.subscribe("", () => {})).toThrow();
    expect(() => bus.subscribe("x", null as unknown as () => void)).toThrow();
  });
});

describe("EventBusEngine.getRecentEvents", () => {
  it("filters by type when provided", async () => {
    const bus = new EventBusEngine();
    await bus.publish({ type: "a" });
    await bus.publish({ type: "b" });
    await bus.publish({ type: "a" });
    expect(bus.getRecentEvents("a").length).toBe(2);
    expect(bus.getRecentEvents("b").length).toBe(1);
    expect(bus.getRecentEvents().length).toBe(3);
  });

  it("respects limit", async () => {
    const bus = new EventBusEngine();
    for (let i = 0; i < 10; i++) await bus.publish({ type: "t" });
    expect(bus.getRecentEvents("t", 3).length).toBe(3);
  });
});

describe("EventBusEngine.getStats", () => {
  it("reports real subscriber count + history_limit", () => {
    const bus = new EventBusEngine({ historyLimit: 100 });
    bus.subscribe("a", () => {});
    bus.subscribe("b", () => {});
    bus.subscribe("*", () => {});
    const s = bus.getStats();
    expect(s.subscribers).toBe(3);
    expect(s.history_limit).toBe(100);
    expect(s.mode).toBe("in-memory");
    expect(s.event_count).toBe(0);
    expect(s.publish_count).toBe(0);
  });
});

describe("EventBusEngine.clear", () => {
  it("resets events + subscribers + counters", async () => {
    const bus = new EventBusEngine();
    bus.subscribe("a", () => {});
    await bus.publish({ type: "a" });
    bus.clear();
    const s = bus.getStats();
    expect(s.event_count).toBe(0);
    expect(s.subscribers).toBe(0);
    expect(s.publish_count).toBe(0);
  });
});

describe("EventBusEngine durable sink (Phase 3, additive default-off)", () => {
  const RESTORE = process.env.PRISM_EVENT_BUS;
  afterEach(() => {
    if (RESTORE === undefined) delete process.env.PRISM_EVENT_BUS;
    else process.env.PRISM_EVENT_BUS = RESTORE;
  });

  it("no sink -> mode stays in-memory, durable_dropped_count 0 (zero regression)", async () => {
    const bus = new EventBusEngine();
    await bus.publish({ type: "x" });
    const s = bus.getStats();
    expect(s.mode).toBe("in-memory");
    expect(s.durable_dropped_count).toBe(0);
  });

  it("sink + flag=redis -> publish ALSO appends durably with mapped fields", async () => {
    process.env.PRISM_EVENT_BUS = "redis";
    const append = vi.fn(async () => ({ ok: true }));
    const bus = new EventBusEngine();
    const received: string[] = [];
    bus.subscribe("q.created", (r) => received.push(r.evt.type));
    bus.attachDurableSink({ append });
    await bus.publish({ type: "q.created", data: { id: 7 }, source: "quoting" });
    expect(received).toEqual(["q.created"]);               // in-memory fan-out unaffected
    expect(append).toHaveBeenCalledTimes(1);
    const [topic, evt] = append.mock.calls[0];
    expect(topic).toBe("q.created");
    expect(evt).toMatchObject({ type: "q.created", payload: { id: 7 }, source: "quoting" });
    expect(typeof evt.ts).toBe("number");
    expect(bus.getStats().mode).toBe("in-memory+redis");
  });

  it("sink attached but flag=file -> durable append NOT called (default-off)", async () => {
    process.env.PRISM_EVENT_BUS = "file";
    const append = vi.fn(async () => ({ ok: true }));
    const bus = new EventBusEngine();
    bus.attachDurableSink({ append });
    await bus.publish({ type: "x" });
    expect(append).not.toHaveBeenCalled();
  });

  it("a throwing sink never breaks publish (fail-soft) + bumps durable_dropped_count", async () => {
    process.env.PRISM_EVENT_BUS = "redis";
    const bus = new EventBusEngine();
    let saw = 0;
    bus.subscribe("x", () => { saw += 1; });
    bus.attachDurableSink({ append: vi.fn(async () => { throw new Error("redis down"); }) });
    const id = await bus.publish({ type: "x" });           // must still return an id
    expect(id.startsWith("evt-")).toBe(true);
    expect(saw).toBe(1);                                    // in-memory unaffected
    expect(bus.getStats().durable_dropped_count).toBe(1);
  });

  it("a sink returning {ok:false} bumps durable_dropped_count", async () => {
    process.env.PRISM_EVENT_BUS = "redis";
    const bus = new EventBusEngine();
    bus.attachDurableSink({ append: vi.fn(async () => ({ ok: false })) });
    await bus.publish({ type: "x" });
    expect(bus.getStats().durable_dropped_count).toBe(1);
  });
});

describe("module-singleton — invoked", () => {
  it("singleton handles full publish + subscribe round-trip", async () => {
    eventBusEngine.clear();
    const seen: string[] = [];
    const off = eventBusEngine.subscribe("singleton.test", (r) => seen.push(r.id));
    const id = await eventBusEngine.publish({ type: "singleton.test", data: { ok: true } });
    expect(seen).toEqual([id]);
    off();
    expect(eventBusEngine.getStats().publish_count).toBe(1);
    eventBusEngine.clear();
  });
});
