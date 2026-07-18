/**
 * RedisStreamSink tests -- Phase 3 of INFRA-SYNERGY-RESEARCH-2026-06-25.
 *
 * Validates the fail-soft Redis Streams durable sink against a MOCKED ioredis
 * client (no live Redis). R15 matrix: happy round-trip + >=3 failure modes +
 * >=2 adversarial + input-validation. The live round-trip is opt-in
 * (PRISM_EVENT_BUS_LIVE=1) so Docker/Redis-down runs skip it.
 *
 * NOTE (R12): with no live Redis this validates the CONTRACT, not a real
 * stream round-trip. Live validation is deferred to a Redis-up session
 * (INFRA-SYNERGY-PHASE3-EVENTBUS-DESIGN.md sec 6-7).
 */
import { describe, it, expect, vi } from "vitest";
import { RedisStreamSink, type RedisStreamClient } from "../engines/RedisStreamSink.js";

function mockClient(over: Partial<Record<keyof RedisStreamClient, unknown>> = {}): RedisStreamClient {
  return {
    xadd: vi.fn(async () => "1-0"),
    xgroup: vi.fn(async () => "OK"),
    xreadgroup: vi.fn(async () => [["prism:events:t", [["1-0", ["data", JSON.stringify({ type: "evt.a", payload: { n: 1 } })]]]]]),
    xack: vi.fn(async () => 1),
    xpending: vi.fn(async () => [3, "1-0", "9-0", []]),
    quit: vi.fn(async () => "OK"),
    ...over,
  } as unknown as RedisStreamClient;
}

describe("RedisStreamSink (mocked ioredis)", () => {
  // ---- HAPPY ----
  it("append -> consume -> ack -> pending round-trip", async () => {
    const sink = new RedisStreamSink();
    const client = mockClient();
    sink.attachClient(client);

    const a = await sink.append("t", { type: "evt.a", payload: { n: 1 } });
    expect(a.ok).toBe(true);
    expect(a.id).toBe("1-0");
    const [key, star, field] = (client.xadd as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(key).toBe("prism:events:t");
    expect(star).toBe("*");
    expect(field).toBe("data");

    const c = await sink.consume("t", "g1", "c1", { count: 5 });
    expect(c.ok).toBe(true);
    expect(c.events).toEqual([{ id: "1-0", event: { type: "evt.a", payload: { n: 1 } } }]);

    const ack = await sink.ack("t", "g1", ["1-0"]);
    expect(ack.ok).toBe(true);
    expect(ack.acked).toBe(1);

    const p = await sink.pending("t", "g1");
    expect(p.ok).toBe(true);
    expect(p.count).toBe(3); // the per-group lag
  });

  it("append stamps ts when omitted", async () => {
    const sink = new RedisStreamSink();
    const client = mockClient();
    sink.attachClient(client);
    await sink.append("t", { type: "evt.a" });
    const payload = JSON.parse((client.xadd as ReturnType<typeof vi.fn>).mock.calls[0][3]);
    expect(typeof payload.ts).toBe("number");
  });

  // ---- FAILURE MODES (fail-soft, never throw) ----
  it("FAILURE 1: not connected -> every op fails soft, no throw", async () => {
    const sink = new RedisStreamSink(); // no client attached
    expect(sink.isConnected).toBe(false);
    expect(await sink.append("t", { type: "x" })).toMatchObject({ ok: false, id: null });
    expect(await sink.consume("t", "g", "c")).toMatchObject({ ok: false, events: [] });
    expect(await sink.ack("t", "g", ["1-0"])).toMatchObject({ ok: false, acked: 0 });
    expect(await sink.pending("t", "g")).toMatchObject({ ok: false, count: 0 });
  });

  it("FAILURE 2: xadd throws -> append fails soft", async () => {
    const sink = new RedisStreamSink();
    sink.attachClient(mockClient({ xadd: vi.fn(async () => { throw new Error("WRONGTYPE"); }) }));
    const r = await sink.append("t", { type: "x" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("WRONGTYPE");
  });

  it("FAILURE 3: BUSYGROUP on xgroup is swallowed (group already exists)", async () => {
    const sink = new RedisStreamSink();
    const client = mockClient({ xgroup: vi.fn(async () => { throw new Error("BUSYGROUP Consumer Group name already exists"); }) });
    sink.attachClient(client);
    const c = await sink.consume("t", "g1", "c1");
    expect(c.ok).toBe(true); // proceeded to xreadgroup despite the pre-existing group
    expect(c.events.length).toBe(1);
  });

  it("FAILURE 4: a non-BUSYGROUP xgroup error fails soft", async () => {
    const sink = new RedisStreamSink();
    sink.attachClient(mockClient({ xgroup: vi.fn(async () => { throw new Error("READONLY"); }) }));
    const c = await sink.consume("t", "g1", "c1");
    expect(c.ok).toBe(false);
    expect(c.error).toContain("READONLY");
  });

  // ---- ADVERSARIAL ----
  it("ADVERSARIAL 1: malformed entries are skipped, batch survives", async () => {
    const sink = new RedisStreamSink();
    sink.attachClient(mockClient({
      xreadgroup: vi.fn(async () => [["prism:events:t", [
        ["1-0", ["data", "{not json"]],          // unparseable -> skipped
        ["2-0", ["nodata", "x"]],                 // no data field -> skipped
        ["3-0", ["data", JSON.stringify({ type: "ok" })]], // valid
      ]]]),
    }));
    const c = await sink.consume("t", "g", "c");
    expect(c.ok).toBe(true);
    expect(c.events).toEqual([{ id: "3-0", event: { type: "ok" } }]);
  });

  it("ADVERSARIAL 2: null xreadgroup reply -> empty events (no crash)", async () => {
    const sink = new RedisStreamSink();
    sink.attachClient(mockClient({ xreadgroup: vi.fn(async () => null) }));
    const c = await sink.consume("t", "g", "c");
    expect(c.ok).toBe(true);
    expect(c.events).toEqual([]);
  });

  it("ADVERSARIAL 3: a hung Redis op times out -> fail soft (never stalls the publisher)", async () => {
    process.env.PRISM_EVENT_TIMEOUT_MS = "40";
    try {
      const sink = new RedisStreamSink();
      sink.attachClient(mockClient({ xadd: vi.fn(() => new Promise<string>(() => { /* never resolves */ })) }));
      const start = Date.now();
      const r = await sink.append("t", { type: "x" });
      expect(r.ok).toBe(false);
      expect(r.error).toContain("timeout");
      expect(Date.now() - start).toBeLessThan(2000); // bounded, did not hang
    } finally {
      delete process.env.PRISM_EVENT_TIMEOUT_MS;
    }
  });

  // ---- INPUT VALIDATION (programmer error -> throw) ----
  it("rejects bad arguments by throwing", async () => {
    const sink = new RedisStreamSink();
    sink.attachClient(mockClient());
    await expect(sink.append("", { type: "x" })).rejects.toThrow(/topic/);
    await expect(sink.append("t", { type: "" })).rejects.toThrow(/type/);
    await expect(sink.consume("t", "", "c")).rejects.toThrow(/group/);
    await expect(sink.ack("t", "g", "no" as unknown as string[])).rejects.toThrow(/array/);
  });

  it("ack of an empty id list is a no-op success", async () => {
    const sink = new RedisStreamSink();
    sink.attachClient(mockClient());
    const r = await sink.ack("t", "g", []);
    expect(r).toMatchObject({ ok: true, acked: 0 });
  });
});

// ---- LIVE round-trip (opt-in; skipped unless a real Redis is up) ----
describe("RedisStreamSink (live Redis -- opt-in via PRISM_EVENT_BUS_LIVE=1)", () => {
  it.skipIf(process.env.PRISM_EVENT_BUS_LIVE !== "1")("append then consume on a real cluster", async () => {
    const sink = new RedisStreamSink();
    const ok = await sink.connect(process.env.REDIS_URL);
    expect(ok).toBe(true);
    const topic = `test-${Date.now()}`;
    const a = await sink.append(topic, { type: "live.event", payload: { ok: true } });
    expect(a.ok).toBe(true);
    const c = await sink.consume(topic, "g1", "c1", { fromId: "0" });
    expect(c.ok).toBe(true);
    expect(c.events.some((e) => e.event.type === "live.event")).toBe(true);
    await sink.shutdown();
  });
});
