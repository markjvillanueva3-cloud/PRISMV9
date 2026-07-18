/**
 * MCP capacity-contract regression guard (U-MCP-CAPACITY-CONTRACT, slot golf 2026-06-17).
 *
 * The sibling request-semaphore.test.ts proves the PRIMITIVE's mechanics (acquire/
 * release/queue/shed/FIFO) with arbitrary small numbers. This file is the missing
 * guard on the PRODUCTION capacity CONTRACT -- the numbers index.ts wires into the
 * live /mcp choke point -- tied to the operator's "16-chat heavy load" requirement.
 *
 * Why a contract test (R9 -- a test encodes WHY a number matters): the /mcp gate has
 * had its capacity numbers changed before (MCP_MAX_CONCURRENT 6->3 on 2026-05-29),
 * and a future edit could silently lower the 64/512 defaults below what a full
 * 16-chat ultracode session needs, re-introducing the disconnect-under-load the
 * operator reported -- without any test going red. These assertions pin the
 * empirically-validated capacity (32 concurrent initializes all HTTP 200 sub-second,
 * 2026-06-17) so a regression fails loudly here instead of in production.
 *
 * resolveMcpCapacity is unit-tested instead of booting index.ts because the server
 * entry binds :3100 (would EADDRINUSE against the live fleet server) and fires heavy
 * boot side effects; the capacity contract is fully expressible against the pure
 * resolver + the semaphore it feeds.
 */
import { describe, it, expect } from "vitest";
import { EventEmitter } from "node:events";
import {
  RequestSemaphore,
  acquireRequestSlot,
  resolveMcpCapacity,
  MCP_DEFAULT_MAX_CONCURRENCY,
  MCP_DEFAULT_QUEUE_MAX,
  MCP_MIN_CONCURRENCY_FOR_16_CHATS,
} from "../mcp/request-semaphore.js";

/** Resolve on next microtask so a just-resolved acquire() Promise can settle. */
const tick = () => Promise.resolve();

/** Minimal stand-in for an express response: emits 'close' and exposes `closed`. */
class FakeRes extends EventEmitter {
  closed = false;
  close(): void {
    this.closed = true;
    this.emit("close");
  }
}

describe("MCP capacity contract (resolveMcpCapacity)", () => {
  it("pins the production defaults at 64 active / 512 queued (regression teeth)", () => {
    // If any of these go red, the live /mcp capacity was changed -- verify the new
    // numbers still cover a 16-chat heavy session before updating the test.
    expect(MCP_DEFAULT_MAX_CONCURRENCY).toBe(64);
    expect(MCP_DEFAULT_QUEUE_MAX).toBe(512);
    expect(resolveMcpCapacity({})).toEqual({ maxConcurrency: 64, queueMax: 512 });
  });

  it("the default concurrency covers the documented 16-chat floor", () => {
    expect(MCP_MIN_CONCURRENCY_FOR_16_CHATS).toBe(16);
    expect(MCP_DEFAULT_MAX_CONCURRENCY).toBeGreaterThanOrEqual(MCP_MIN_CONCURRENCY_FOR_16_CHATS);
    // 64 active + 512 queued = 576 total in-flight capacity must absorb the modeled
    // 300-400 concurrent ultracode fan-out peak with headroom (MCP-FLEET-CAPACITY-MS0).
    const { maxConcurrency, queueMax } = resolveMcpCapacity({});
    expect(maxConcurrency + queueMax).toBeGreaterThanOrEqual(400);
  });

  it("honors explicit env overrides", () => {
    expect(resolveMcpCapacity({ PRISM_MCP_MAX_CONCURRENCY: "128", PRISM_MCP_QUEUE_MAX: "1024" }))
      .toEqual({ maxConcurrency: 128, queueMax: 1024 });
  });

  it("falls back to the default on blank/zero/non-numeric env (|| semantics preserved)", () => {
    // index.ts used `Number(env.X) || default`: 0 / "" / NaN are all falsy -> default.
    expect(resolveMcpCapacity({ PRISM_MCP_MAX_CONCURRENCY: "0" }).maxConcurrency).toBe(64);
    expect(resolveMcpCapacity({ PRISM_MCP_MAX_CONCURRENCY: "" }).maxConcurrency).toBe(64);
    expect(resolveMcpCapacity({ PRISM_MCP_MAX_CONCURRENCY: "abc" }).maxConcurrency).toBe(64);
    expect(resolveMcpCapacity({ PRISM_MCP_QUEUE_MAX: "" }).queueMax).toBe(512);
  });

  it("clamps a pathological override so it can never deadlock the gate", () => {
    // A truthy sub-1 concurrency floors to 1 (max < 1 would grant nothing -> deadlock).
    expect(resolveMcpCapacity({ PRISM_MCP_MAX_CONCURRENCY: "0.5" }).maxConcurrency).toBe(1);
    // A negative queue floors to 0 (pure shed, never a negative queue).
    expect(resolveMcpCapacity({ PRISM_MCP_QUEUE_MAX: "-5" }).queueMax).toBe(0);
  });
});

describe("MCP capacity contract (16-chat heavy load behavior)", () => {
  it("a 16-chat session at 4 concurrent builds each (64) never queues at the production config", async () => {
    const { maxConcurrency, queueMax } = resolveMcpCapacity({});
    const sem = new RequestSemaphore(maxConcurrency, queueMax);
    const CHATS = 16;
    const FANOUT_PER_CHAT = 4; // 16 x 4 = 64 concurrent in-flight builds == active cap
    const slots = [];
    for (let c = 0; c < CHATS; c++) {
      for (let k = 0; k < FANOUT_PER_CHAT; k++) {
        slots.push(await acquireRequestSlot(sem, new FakeRes()));
      }
    }
    expect(slots.length).toBe(CHATS * FANOUT_PER_CHAT); // 64
    // Every one PROCEEDS -- a 16-chat heavy session fits entirely in the active set,
    // so no init is ever queued (let alone shed) under the production capacity.
    expect(slots.every((s) => s.outcome === "proceed")).toBe(true);
    expect(sem.inUse).toBe(64);
    expect(sem.queued).toBe(0);
  });

  it("absorbs a full 576-concurrent fan-out burst with ZERO shedding; only the 577th sheds", async () => {
    const { maxConcurrency, queueMax } = resolveMcpCapacity({});
    const sem = new RequestSemaphore(maxConcurrency, queueMax); // 64 / 512
    const N_ACTIVE = maxConcurrency; // 64
    const N_QUEUE = queueMax; // 512

    // Phase 1: fill the active set (a 16-chat session's fan-out and well beyond).
    const activeRes: FakeRes[] = [];
    const activeSlots = [];
    for (let i = 0; i < N_ACTIVE; i++) {
      const r = new FakeRes();
      activeRes.push(r);
      activeSlots.push(await acquireRequestSlot(sem, r));
    }
    expect(activeSlots.every((s) => s.outcome === "proceed")).toBe(true);
    expect(sem.inUse).toBe(N_ACTIVE);
    expect(sem.queued).toBe(0);

    // Phase 2: the heavy fan-out burst fills the queue -- STILL zero shedding.
    const queuedPromises = [];
    for (let i = 0; i < N_QUEUE; i++) {
      queuedPromises.push(acquireRequestSlot(sem, new FakeRes()));
    }
    await tick();
    expect(sem.queued).toBe(N_QUEUE); // 512 parked, none shed
    // 576 concurrent requests (64 active + 512 queued) all held without a single 503.

    // Phase 3: ONE past total capacity (the 577th) sheds -> HTTP 503 backpressure.
    const shed = await acquireRequestSlot(sem, new FakeRes());
    expect(shed.outcome).toBe("shed");
    expect(sem.queued).toBe(N_QUEUE); // a shed never enqueues

    // Phase 4: freeing the active slots promotes queued waiters FIFO -- the gate is
    // live under the full burst, not wedged (capacity genuinely recovers).
    for (const r of activeRes) r.close(); // 64 releases -> 64 queued promoted
    const promoted = await Promise.all(queuedPromises.slice(0, N_ACTIVE));
    expect(promoted.every((s) => s.outcome === "proceed")).toBe(true);
    expect(sem.inUse).toBe(N_ACTIVE); // handoffs, not decrements -- active stays full
    expect(sem.queued).toBe(N_QUEUE - N_ACTIVE); // 512 - 64 = 448 still queued
  });
});
