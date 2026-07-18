/**
 * RequestSemaphore -- bounded-concurrency + bounded-queue gate for the /mcp
 * choke point (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
 *
 * Each concurrent /mcp POST builds a FRESH McpServer via buildRequestServer()
 * (MCP-CONCURRENCY-FIX 2026-05-31) that binds the full dispatcher graph. Under a
 * parallel-agent burst (26 slots x ultracode fan-out -> a modeled 300-400
 * concurrent peak) that is N concurrent fresh servers: an UNBOUNDED memory spike
 * the watchdog can only react to AFTER it has already happened. This gate caps the
 * number of request-servers built/handled at once and queues the overflow; once the
 * queue is also full it sheds load (the caller returns HTTP 503) so a burst applies
 * backpressure to clients instead of OOMing the process.
 *
 * Contract: every successful acquire() (resolves true) MUST be matched by exactly
 * one release(). A rejected acquire (resolves false) MUST NOT release. The /mcp
 * handler wires release() idempotently on res 'close' so a slot is freed exactly
 * once even if the client disconnects, buildRequestServer throws, or finish+close
 * both fire.
 *
 * Pure, dependency-free, and synchronous in its bookkeeping (the only async is the
 * pending-acquire Promise) so it is fully unit-testable without a live server.
 */
export class RequestSemaphore {
  private active = 0;
  private readonly waiters: Array<(granted: boolean) => void> = [];
  private readonly max: number;
  private readonly queueMax: number;

  constructor(max: number, queueMax: number) {
    // Clamp so a bad env var can never deadlock (max < 1 would grant nothing) or
    // make the queue accidentally "negative" (treated as 0 = no queue, pure shed).
    this.max = Math.max(1, Math.floor(Number.isFinite(max) ? max : 1));
    this.queueMax = Math.max(0, Math.floor(Number.isFinite(queueMax) ? queueMax : 0));
  }

  /**
   * Acquire a slot. Resolves true if a slot was granted (the caller owns it and
   * MUST release() exactly once). Resolves false if both the active set AND the
   * wait queue are full -- the caller should shed the request (503 backpressure).
   */
  acquire(): Promise<boolean> {
    if (this.active < this.max) {
      this.active++;
      return Promise.resolve(true);
    }
    if (this.waiters.length >= this.queueMax) {
      return Promise.resolve(false);
    }
    return new Promise<boolean>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  /**
   * Release a previously-acquired slot. If a waiter is queued the still-held slot
   * is handed straight to the longest-waiting one (FIFO, active count unchanged);
   * otherwise the active count drops by one. Release-at-zero is a safe no-op so a
   * buggy double-release can never drive active negative or over-subscribe.
   */
  release(): void {
    const next = this.waiters.shift();
    if (next) {
      next(true);
      return;
    }
    if (this.active > 0) this.active--;
  }

  /** Slots currently in use (actively building/handling a request). */
  get inUse(): number {
    return this.active;
  }

  /** Requests waiting for a slot. */
  get queued(): number {
    return this.waiters.length;
  }

  /** Configured max concurrent slots (post-clamp). */
  get maxConcurrency(): number {
    return this.max;
  }

  /** Configured max queue depth (post-clamp). */
  get maxQueue(): number {
    return this.queueMax;
  }
}

/**
 * Production /mcp capacity defaults (MCP-FLEET-CAPACITY-MS0): 64 concurrent
 * fresh-McpServer builds + 512 queued. Sized for the Blackwell box (96GB VRAM /
 * 136GB RAM) against the 300-400 concurrent peak modeled for a full 26-slot
 * ultracode fan-out (see the RequestSemaphore docstring). 64 + 512 = 576 total
 * in-flight capacity: a 16-chat heavy session (each chat's init holds 1 slot, with
 * room for ~4 concurrent in-flight builds per chat before any queueing) sits far
 * inside the active set, and the queue absorbs the heavy fan-out burst before any
 * 503 backpressure. These numbers were separately confirmed in a live :3100 soak
 * 2026-06-17 (32 concurrent initializes all HTTP 200 sub-second; peak_inflight 6
 * over 6h) -- that soak is NOT what the unit test asserts; the test proves the
 * resolver + semaphore algebra only (it boots no server, see the test docstring).
 */
export const MCP_DEFAULT_MAX_CONCURRENCY = 64;
export const MCP_DEFAULT_QUEUE_MAX = 512;

/** Minimum capacity a 16-chat heavy session requires (the regression floor). */
export const MCP_MIN_CONCURRENCY_FOR_16_CHATS = 16;

export interface McpCapacity {
  /** Max concurrent fresh-server builds handled at once (post-clamp, >= 1). */
  maxConcurrency: number;
  /** Max overflow requests parked before load-shedding (post-clamp, >= 0). */
  queueMax: number;
}

/**
 * Resolve the /mcp semaphore capacity from the environment, single-sourcing the
 * numbers that index.ts wires into `new RequestSemaphore(...)`. Pure + env-injectable
 * so the production capacity contract is testable WITHOUT booting the server (the
 * server entry has heavy boot side effects + binds :3100). Preserves the exact
 * `Math.max(floor, Number(env.X) || default)` semantics index.ts used inline: a
 * blank/0/non-numeric env value falls back to the default (0 is falsy), and the
 * floor guards against a pathological override deadlocking (max < 1) or a negative
 * queue.
 */
export function resolveMcpCapacity(env: NodeJS.ProcessEnv = process.env): McpCapacity {
  return {
    maxConcurrency: Math.max(1, Number(env.PRISM_MCP_MAX_CONCURRENCY) || MCP_DEFAULT_MAX_CONCURRENCY),
    queueMax: Math.max(0, Number(env.PRISM_MCP_QUEUE_MAX) || MCP_DEFAULT_QUEUE_MAX),
  };
}

/** Minimal response shape acquireRequestSlot needs (a real express res satisfies it). */
export interface ClosableResponse {
  readonly closed?: boolean;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
}

export type SlotOutcome = "proceed" | "shed" | "abandoned";

export interface SlotAcquisition {
  /**
   * "proceed"   -> a slot is held; the caller does its work and release() is already
   *                wired to fire on res 'close'.
   * "shed"      -> no slot (active set AND queue both saturated); caller sends 503.
   * "abandoned" -> the client disconnected WHILE this request was queued; the slot
   *                was granted to an already-closed response and has been released
   *                here, so the caller must just return (no work, no 503).
   */
  outcome: SlotOutcome;
  /** Idempotent release of the held slot (a no-op for "shed"). */
  release: () => void;
}

/**
 * Acquire a request slot, correctly handling the close-while-queued race that a
 * naive "wire release on res 'close' after acquire" misses: if the client
 * disconnects while the request is parked in the queue, res emits 'close' BEFORE
 * the slot is granted, so a release listener attached after the grant never runs
 * (Node does not replay 'close' to a late listener) -> the slot leaks and, under a
 * sustained burst, ratchets the active set to max and wedges the gate. We observe
 * the early close via a listener registered BEFORE acquire() and, once the slot is
 * granted to an already-closed response, release it immediately and report
 * "abandoned" so the caller skips the wasted buildRequestServer() against a dead res.
 *
 * Caught by reviewers B + C on the 3-of-3 scrutiny of U-MCP-CONCURRENCY-HARDEN
 * (2026-06-09); the inline first cut leaked the slot on this path.
 */
export async function acquireRequestSlot(
  sem: RequestSemaphore,
  res: ClosableResponse,
): Promise<SlotAcquisition> {
  let closedWhileWaiting = false;
  // Registered BEFORE acquire() so a 'close' during the queued wait is observable
  // after the (possibly much later) grant.
  res.on("close", () => { closedWhileWaiting = true; });

  const granted = await sem.acquire();
  if (!granted) {
    return { outcome: "shed", release: () => { /* nothing held */ } };
  }

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try { sem.release(); } catch { /* never break teardown */ }
  };
  res.on("close", release);

  // No await runs between the grant and this check, so a 'close' macrotask cannot
  // interleave here -- closedWhileWaiting reflects a disconnect during the wait.
  if (closedWhileWaiting || res.closed === true) {
    release();
    return { outcome: "abandoned", release };
  }
  return { outcome: "proceed", release };
}
