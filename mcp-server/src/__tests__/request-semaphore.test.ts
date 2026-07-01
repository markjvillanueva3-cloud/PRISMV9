/**
 * RequestSemaphore tests (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
 *
 * Verifies the concurrency contract the /mcp choke point depends on: cap the
 * active set, queue the overflow, shed beyond the queue (503 backpressure), grant
 * queued waiters FIFO on release, never go negative, and clamp pathological config.
 * Each assertion fails if the corresponding behavior regresses.
 */
import { describe, it, expect } from "vitest";
import { EventEmitter } from "node:events";
import { RequestSemaphore, acquireRequestSlot } from "../mcp/request-semaphore.js";

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

describe("RequestSemaphore", () => {
  it("grants up to max immediately, then tracks inUse", async () => {
    const s = new RequestSemaphore(3, 10);
    expect(await s.acquire()).toBe(true);
    expect(await s.acquire()).toBe(true);
    expect(await s.acquire()).toBe(true);
    expect(s.inUse).toBe(3);
    expect(s.queued).toBe(0);
  });

  it("queues the (max+1)th request instead of granting it", async () => {
    const s = new RequestSemaphore(2, 5);
    await s.acquire();
    await s.acquire();
    let granted: boolean | null = null;
    const pending = s.acquire().then((g) => { granted = g; });
    await tick();
    // Still pending: not granted, parked in the queue.
    expect(granted).toBeNull();
    expect(s.inUse).toBe(2);
    expect(s.queued).toBe(1);
    // Release frees the slot to the waiter (active unchanged at max).
    s.release();
    await pending;
    expect(granted).toBe(true);
    expect(s.inUse).toBe(2);
    expect(s.queued).toBe(0);
  });

  it("sheds load (resolves false) once active AND queue are both full", async () => {
    const s = new RequestSemaphore(1, 1);
    expect(await s.acquire()).toBe(true); // active = 1 (full)
    let qGranted: boolean | null = null;
    const queued = s.acquire().then((g) => { qGranted = g; }); // queued (1/1)
    await tick();
    expect(qGranted).toBeNull();
    expect(s.queued).toBe(1);
    // Third request: active full + queue full -> shed.
    expect(await s.acquire()).toBe(false);
    expect(s.queued).toBe(1); // shed request did NOT enqueue
    s.release();
    await queued;
    expect(qGranted).toBe(true);
  });

  it("grants queued waiters in FIFO order", async () => {
    const s = new RequestSemaphore(1, 5);
    await s.acquire(); // holder
    const order: number[] = [];
    const w1 = s.acquire().then(() => order.push(1));
    const w2 = s.acquire().then(() => order.push(2));
    const w3 = s.acquire().then(() => order.push(3));
    await tick();
    expect(s.queued).toBe(3);
    s.release(); await w1;
    s.release(); await w2;
    s.release(); await w3;
    expect(order).toEqual([1, 2, 3]);
  });

  it("release with no waiters decrements inUse and floors at 0", async () => {
    const s = new RequestSemaphore(2, 2);
    await s.acquire();
    await s.acquire();
    expect(s.inUse).toBe(2);
    s.release();
    expect(s.inUse).toBe(1);
    s.release();
    expect(s.inUse).toBe(0);
    // Over-release must be a safe no-op (never negative, never over-subscribe).
    s.release();
    expect(s.inUse).toBe(0);
    // After a spurious release the gate still grants exactly max.
    expect(await s.acquire()).toBe(true);
    expect(await s.acquire()).toBe(true);
    expect(s.inUse).toBe(2);
  });

  it("clamps pathological config (max>=1, queueMax>=0, floored, finite)", async () => {
    const zero = new RequestSemaphore(0, -5);
    expect(zero.maxConcurrency).toBe(1); // max floored to 1, never 0 (no deadlock)
    expect(zero.maxQueue).toBe(0);       // negative queue -> 0 (pure shed)
    const frac = new RequestSemaphore(3.9, 7.9);
    expect(frac.maxConcurrency).toBe(3);
    expect(frac.maxQueue).toBe(7);
    const nan = new RequestSemaphore(Number.NaN, Number.POSITIVE_INFINITY);
    expect(nan.maxConcurrency).toBe(1);
    expect(nan.maxQueue).toBe(0);
    // queueMax 0 => the very first overflow sheds immediately.
    const s = new RequestSemaphore(1, 0);
    expect(await s.acquire()).toBe(true);
    expect(await s.acquire()).toBe(false);
  });

  it("full burst lifecycle: 2 active + 2 queued + 1 shed, all drain cleanly", async () => {
    const s = new RequestSemaphore(2, 2);
    expect(await s.acquire()).toBe(true);
    expect(await s.acquire()).toBe(true);
    const drained: boolean[] = [];
    const q1 = s.acquire().then((g) => drained.push(g));
    const q2 = s.acquire().then((g) => drained.push(g));
    await tick();
    expect(s.queued).toBe(2);
    expect(await s.acquire()).toBe(false); // shed: 2 active + 2 queued saturated
    // Drain every granted slot.
    s.release(); await q1;
    s.release(); await q2;
    s.release();
    s.release();
    expect(drained).toEqual([true, true]);
    expect(s.inUse).toBe(0);
    expect(s.queued).toBe(0);
  });
});

describe("acquireRequestSlot (close-while-queued race)", () => {
  it("proceeds with an open res and releases the slot on close", async () => {
    const s = new RequestSemaphore(2, 4);
    const res = new FakeRes();
    const slot = await acquireRequestSlot(s, res);
    expect(slot.outcome).toBe("proceed");
    expect(s.inUse).toBe(1);
    res.close(); // normal end/abort -> release fires
    expect(s.inUse).toBe(0);
  });

  it("sheds when active + queue are saturated (no slot held)", async () => {
    const s = new RequestSemaphore(1, 1);
    await s.acquire();          // active full
    const queued = new FakeRes();
    const qSlot = acquireRequestSlot(s, queued); // parks in the queue (1/1)
    await tick();
    const res = new FakeRes();
    const slot = await acquireRequestSlot(s, res); // active + queue full -> shed
    expect(slot.outcome).toBe("shed");
    // A shed never enqueues and holds nothing: releasing it is a no-op.
    slot.release();
    expect(s.queued).toBe(1);
    // Drain the still-valid queued waiter.
    s.release();
    expect((await qSlot).outcome).toBe("proceed");
  });

  it("does NOT leak a slot when the client disconnects WHILE queued (the P1 repro)", async () => {
    const s = new RequestSemaphore(1, 5);
    await s.acquire(); // holder occupies the only slot (active = 1 = max)
    const res = new FakeRes();
    const pending = acquireRequestSlot(s, res); // parks in the queue
    await tick();
    expect(s.queued).toBe(1);
    // Client disconnects while still queued: 'close' fires BEFORE the slot is granted.
    res.close();
    // A holder releases -> the still-held slot is handed to the (now dead) queued req.
    s.release();
    const slot = await pending;
    // Without the fix this returns "proceed" and inUse stays 1 forever (leak).
    expect(slot.outcome).toBe("abandoned");
    expect(s.inUse).toBe(0); // slot reclaimed -> capacity fully recovered
    expect(s.queued).toBe(0);
    // Capacity is genuinely usable again (not wedged).
    const fresh = new FakeRes();
    const next = await acquireRequestSlot(s, fresh);
    expect(next.outcome).toBe("proceed");
    expect(s.inUse).toBe(1);
  });

  it("release() is idempotent on the proceed path (close + manual release)", async () => {
    const s = new RequestSemaphore(2, 2);
    const res = new FakeRes();
    const slot = await acquireRequestSlot(s, res);
    expect(slot.outcome).toBe("proceed");
    expect(s.inUse).toBe(1);
    slot.release();      // manual
    res.close();         // close listener -> release again
    slot.release();      // explicit double
    expect(s.inUse).toBe(0); // exactly one decrement, never negative
  });

  it("sustained burst with mid-queue disconnects never erodes capacity", async () => {
    // The regression guard: repeatedly queue-then-disconnect must leave full capacity.
    const s = new RequestSemaphore(2, 10);
    const h1 = await s.acquire();
    const h2 = await s.acquire(); // both slots held (active = 2)
    void h1; void h2;
    const deaths: FakeRes[] = [];
    const waiters = [];
    for (let i = 0; i < 6; i++) {
      const res = new FakeRes();
      deaths.push(res);
      waiters.push(acquireRequestSlot(s, res));
    }
    await tick();
    expect(s.queued).toBe(6);
    // All six queued clients disconnect.
    for (const res of deaths) res.close();
    // Release the two holders; each handoff goes to a dead waiter.
    s.release();
    s.release();
    const outcomes = await Promise.all(waiters);
    // Some are granted-then-abandoned; none leak.
    for (const o of outcomes) expect(["abandoned", "proceed"]).toContain(o.outcome);
    // Critical invariant: capacity fully recovered, gate not wedged.
    expect(s.inUse).toBe(0);
    expect(s.queued).toBe(0);
    const fresh = new FakeRes();
    expect((await acquireRequestSlot(s, fresh)).outcome).toBe("proceed");
  });
});
