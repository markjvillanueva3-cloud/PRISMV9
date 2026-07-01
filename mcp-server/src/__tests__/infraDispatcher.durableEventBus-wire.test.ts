/**
 * ensureDurableEventBusWired -- INFRA-SYNERGY Phase 3 durable-event-bus activation wire.
 *
 * Closes the RedisStreamSink orphan: EventBusEngine exposed attachDurableSink() but nothing
 * ever attached the sink. This proves the gated wire: default (flag unset) = no-op
 * (byte-identical in-memory bus); PRISM_EVENT_BUS=redis attaches the sink and self-connects,
 * fail-soft when Redis is absent/down. All deps injected -- no real Redis, no env mutation.
 */

import { describe, it, expect, vi } from "vitest";
import { ensureDurableEventBusWired } from "../tools/dispatchers/infraDispatcher.js";

function mockBus() {
  return { attachDurableSink: vi.fn() };
}
function mockSink(opts: { connected?: boolean; connectResolves?: boolean; connectThrows?: boolean } = {}) {
  // The wire reads sink.isConnected AFTER awaiting connect(), so connect() must mutate it.
  const obj: { isConnected: boolean; append: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn> } = {
    isConnected: opts.connected ?? false,
    append: vi.fn(async () => ({ ok: obj.isConnected })),
    connect: vi.fn(async () => {
      if (opts.connectThrows) throw new Error("ioredis blew up");
      obj.isConnected = opts.connectResolves ?? false;
      return obj.isConnected;
    }),
  };
  return obj;
}

describe("ensureDurableEventBusWired -- env gate (default off = byte-identical)", () => {
  it("returns false and attaches NOTHING when the flag is unset", async () => {
    const bus = mockBus();
    const sink = mockSink();
    const r = await ensureDurableEventBusWired({ env: undefined, bus, sink });
    expect(r).toBe(false);
    expect(bus.attachDurableSink).not.toHaveBeenCalled();
    expect(sink.connect).not.toHaveBeenCalled();
  });

  it("returns false for any non-redis flag value", async () => {
    const bus = mockBus();
    const sink = mockSink();
    const r = await ensureDurableEventBusWired({ env: "memory", bus, sink });
    expect(r).toBe(false);
    expect(bus.attachDurableSink).not.toHaveBeenCalled();
  });
});

describe("ensureDurableEventBusWired -- PRISM_EVENT_BUS=redis", () => {
  it("attaches the sink and self-connects when not yet connected (live Redis)", async () => {
    const bus = mockBus();
    const sink = mockSink({ connected: false, connectResolves: true });
    const r = await ensureDurableEventBusWired({ env: "redis", bus, sink });
    expect(bus.attachDurableSink).toHaveBeenCalledWith(sink);
    expect(sink.connect).toHaveBeenCalledTimes(1);
    expect(r).toBe(true);
  });

  it("attaches but SKIPS connect when the sink is already connected (idempotent re-wire)", async () => {
    const bus = mockBus();
    const sink = mockSink({ connected: true });
    const r = await ensureDurableEventBusWired({ env: "redis", bus, sink });
    expect(bus.attachDurableSink).toHaveBeenCalledWith(sink);
    expect(sink.connect).not.toHaveBeenCalled();
    expect(r).toBe(true);
  });

  it("FAIL-SOFT: attaches the socket but returns false when Redis is unreachable", async () => {
    const bus = mockBus();
    const sink = mockSink({ connected: false, connectResolves: false });
    const r = await ensureDurableEventBusWired({ env: "redis", bus, sink });
    // socket is attached (so a later reconnect can flow), but we honestly report not-live
    expect(bus.attachDurableSink).toHaveBeenCalledWith(sink);
    expect(sink.connect).toHaveBeenCalledTimes(1);
    expect(r).toBe(false);
  });

  it("FAIL-SOFT: a connect() that throws is swallowed -> returns false, never propagates", async () => {
    const bus = mockBus();
    const sink = mockSink({ connected: false, connectThrows: true });
    const r = await ensureDurableEventBusWired({ env: "redis", bus, sink });
    expect(bus.attachDurableSink).toHaveBeenCalledWith(sink);
    expect(r).toBe(false);
  });
});
