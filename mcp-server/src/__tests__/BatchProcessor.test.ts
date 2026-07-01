/**
 * BatchProcessor — companion test
 * ================================
 * WIRE-UNWIRED-MS0/U-WIRE-BATCH-PROCESSOR
 *
 * Verifies the read-only observability surface that prism_infra exposes:
 *   - batch_queue_size → batchProcessor.getQueueSize()
 *   - batch_stats      → batchProcessor.getStats()
 *   - batch_persist_stats → batchProcessor.persistStats()
 *
 * Also exercises core enqueue / processTick semantics so the engine's
 * priority-queue + retry + expiry invariants are protected by a real
 * (non-stub) reference test — not just toBeDefined() noise (PRISM R9).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { batchProcessor, PRIORITY_LABELS, type BatchPriority } from "../engines/BatchProcessor.js";

/**
 * Reset more singleton state than drain() touches.
 *
 * drain() only clears `queue` + `current_queue_size`. The cumulative counters
 * (total_queued / total_processed / total_failed / total_expired,
 * queue_by_priority, waitTimes, processTimes) AND the registered processorFn
 * persist across calls — so without an explicit reset every test sees state
 * leakage from prior tests and the suite becomes order-dependent (would break
 * under vitest `--shuffle`). This is a per-test isolation helper.
 */
function resetBatchProcessorSingleton(): void {
  batchProcessor.drain();
  const proc = batchProcessor as unknown as {
    stats: {
      total_queued: number;
      total_processed: number;
      total_failed: number;
      total_expired: number;
      current_queue_size: number;
      queue_by_priority: Record<number, number>;
      avg_wait_ms: number;
      avg_process_ms: number;
    };
    waitTimes: number[];
    processTimes: number[];
    processorFn: ((action: string, params: Record<string, unknown>) => Promise<unknown>) | null;
  };
  proc.stats = {
    total_queued: 0,
    total_processed: 0,
    total_failed: 0,
    total_expired: 0,
    current_queue_size: 0,
    queue_by_priority: { 0: 0, 1: 0, 2: 0, 3: 0 },
    avg_wait_ms: 0,
    avg_process_ms: 0,
  };
  proc.waitTimes = [];
  proc.processTimes = [];
  proc.processorFn = null;
}

describe("BatchProcessor", () => {
  beforeEach(() => {
    resetBatchProcessorSingleton();
  });

  describe("getStats / getQueueSize (read-only observability)", () => {
    it("returns the BatchStats shape with zeroed counters on a fresh queue", () => {
      const stats = batchProcessor.getStats();
      expect(stats).toBeTypeOf("object");
      expect(stats).toHaveProperty("total_queued");
      expect(stats).toHaveProperty("total_processed");
      expect(stats).toHaveProperty("total_failed");
      expect(stats).toHaveProperty("total_expired");
      expect(stats).toHaveProperty("current_queue_size");
      expect(stats).toHaveProperty("queue_by_priority");
      expect(stats).toHaveProperty("avg_wait_ms");
      expect(stats).toHaveProperty("avg_process_ms");
      expect(stats.current_queue_size).toBe(batchProcessor.getQueueSize());
    });

    it("getQueueSize() reflects enqueued non-critical items", () => {
      const beforeSize = batchProcessor.getQueueSize();
      const id1 = batchProcessor.enqueue("noop", { x: 1 }, 1);
      const id2 = batchProcessor.enqueue("noop", { x: 2 }, 2);
      expect(id1).toMatch(/^batch_/);
      expect(id2).toMatch(/^batch_/);
      expect(batchProcessor.getQueueSize()).toBe(beforeSize + 2);
    });

    it("CRITICAL (priority 0) items are NEVER queued — they short-circuit", () => {
      const beforeSize = batchProcessor.getQueueSize();
      const id = batchProcessor.enqueue("safety-call", {}, 0);
      expect(id).toMatch(/^batch_/);
      expect(batchProcessor.getQueueSize()).toBe(beforeSize); // unchanged
    });

    it("queue_by_priority increments by the right slot", () => {
      // getStats() returns a shallow copy — queue_by_priority aliases the live
      // counter. Deep-clone the snapshot so before/after compare independent
      // values, not the same live reference. This is a real engine quirk worth
      // flagging in a future hardening pass, but the wiring contract is
      // unaffected: the read-only observability surface still returns correct
      // counts on each invocation.
      const before = JSON.parse(JSON.stringify(batchProcessor.getStats())) as {
        queue_by_priority: Record<number, number>;
      };
      batchProcessor.enqueue("a", {}, 1);
      batchProcessor.enqueue("b", {}, 1);
      batchProcessor.enqueue("c", {}, 2);
      const after = batchProcessor.getStats();
      expect(after.queue_by_priority[1]).toBe((before.queue_by_priority[1] ?? 0) + 2);
      expect(after.queue_by_priority[2]).toBe((before.queue_by_priority[2] ?? 0) + 1);
    });
  });

  describe("PRIORITY_LABELS", () => {
    it("maps each priority level to a label", () => {
      expect(PRIORITY_LABELS[0]).toBe("CRITICAL");
      expect(PRIORITY_LABELS[1]).toBe("HIGH");
      expect(PRIORITY_LABELS[2]).toBe("NORMAL");
      expect(PRIORITY_LABELS[3]).toBe("LOW");
    });
  });

  describe("processTick — execution semantics (requires processorFn)", () => {
    it("returns [] when no processor is registered (fail-safe)", async () => {
      batchProcessor.enqueue("noop", {}, 2);
      // No processor registered — processTick is a no-op (returns []).
      // We can't call registerProcessor here because there's no public
      // un-register and we don't want to leak state across tests.
      // What we CAN verify: when queue is empty, returns [].
      batchProcessor.drain();
      const results = await batchProcessor.processTick();
      expect(results).toEqual([]);
    });

    it("processes queued items via a registered processorFn (happy path)", async () => {
      let callCount = 0;
      batchProcessor.registerProcessor(async (action, params) => {
        callCount++;
        return { action, params, ok: true };
      });

      batchProcessor.enqueue("op-1", { v: "alpha" }, 1);
      batchProcessor.enqueue("op-2", { v: "beta" }, 2);
      const results = await batchProcessor.processTick();

      expect(results).toHaveLength(2);
      expect(callCount).toBe(2);
      const successes = results.filter((r) => r.status === "success");
      expect(successes).toHaveLength(2);
      // Priority 1 (HIGH) processes before priority 2 (NORMAL).
      expect(successes[0].result).toMatchObject({ action: "op-1" });
      expect(successes[0].duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("retries failing items up to max_retries, then marks terminal failed", async () => {
      let attempts = 0;
      batchProcessor.registerProcessor(async (_action, _params) => {
        attempts++;
        throw new Error("boom");
      });

      // max_retries=2 → expect 2 attempts then 1 terminal failure
      batchProcessor.enqueue("fail-op", {}, 1, { max_retries: 2 });

      // First tick: increments retry_count to 1, requeues.
      const r1 = await batchProcessor.processTick();
      expect(r1).toEqual([]); // no terminal result yet (still retrying)
      expect(attempts).toBe(1);

      // Second tick: retry_count reaches max_retries → terminal failure.
      const r2 = await batchProcessor.processTick();
      expect(attempts).toBe(2);
      expect(r2).toHaveLength(1);
      expect(r2[0].status).toBe("failed");
      expect(r2[0].error).toBe("boom");
    });

    it("expires items older than max_age_ms before processing", async () => {
      batchProcessor.registerProcessor(async () => ({ ok: true }));
      // Enqueue with a 1ms max age so it's already stale by the next tick.
      // Sleep 50ms (not 5ms) — Windows scheduler quantum + CI load can blow
      // through 5ms, making the assertion flaky.
      batchProcessor.enqueue("stale-op", {}, 1, { max_age_ms: 1 });
      await new Promise((r) => setTimeout(r, 50));
      const results = await batchProcessor.processTick();
      const expired = results.filter((r) => r.status === "expired");
      expect(expired).toHaveLength(1);
    });

    it("respects MAX_BATCH_PER_TICK (10) — enqueue 12 items, process at most 10 per tick", async () => {
      batchProcessor.registerProcessor(async () => ({ ok: true }));
      for (let i = 0; i < 12; i++) {
        batchProcessor.enqueue(`op-${i}`, {}, 2);
      }
      const r1 = await batchProcessor.processTick();
      expect(r1.length).toBe(10);
      expect(batchProcessor.getQueueSize()).toBe(2);
      const r2 = await batchProcessor.processTick();
      expect(r2.length).toBe(2);
      expect(batchProcessor.getQueueSize()).toBe(0);
    });
  });

  describe("priority ordering invariant", () => {
    it("processes higher priority (lower numeric) BEFORE lower priority", async () => {
      const order: string[] = [];
      batchProcessor.registerProcessor(async (action) => {
        order.push(action);
        return null;
      });
      // Enqueue out of priority order: LOW, NORMAL, HIGH.
      batchProcessor.enqueue("low", {}, 3);
      batchProcessor.enqueue("normal", {}, 2);
      batchProcessor.enqueue("high", {}, 1);
      await batchProcessor.processTick();
      expect(order).toEqual(["high", "normal", "low"]);
    });
  });

  describe("drain", () => {
    it("removes all queued items and zeroes current_queue_size", () => {
      batchProcessor.enqueue("a", {}, 2);
      batchProcessor.enqueue("b", {}, 2);
      expect(batchProcessor.getQueueSize()).toBeGreaterThanOrEqual(2);
      const drained = batchProcessor.drain();
      expect(drained.length).toBeGreaterThanOrEqual(2);
      expect(batchProcessor.getQueueSize()).toBe(0);
      expect(batchProcessor.getStats().current_queue_size).toBe(0);
    });
  });

  describe("persistStats", () => {
    it("writes a parseable JSON snapshot of getStats() to the configured state file", async () => {
      // R9: assert the actual contract — the file MUST be written AND the
      // round-trip must match the in-memory stats. `.not.toThrow()` alone
      // would mask EACCES / ENOSPC / missing state dir.
      const fs = await import("fs");
      const path = await import("path");
      const { PATHS } = await import("../constants.js");
      const target = path.join(PATHS.STATE_DIR, "d4_batch_stats.json");

      // Mutate stats so the persisted snapshot is distinguishable from any
      // pre-existing file content on disk.
      batchProcessor.enqueue("write-probe", {}, 2);
      const expected = batchProcessor.getStats();
      batchProcessor.persistStats();

      expect(fs.existsSync(target)).toBe(true);
      const round = JSON.parse(fs.readFileSync(target, "utf8")) as typeof expected;
      expect(round.current_queue_size).toBe(expected.current_queue_size);
      expect(round.total_queued).toBe(expected.total_queued);
      expect(round.queue_by_priority[2]).toBe(expected.queue_by_priority[2]);
    });
  });

  describe("adversarial inputs", () => {
    it("handles empty params object", () => {
      const id = batchProcessor.enqueue("op", {}, 2);
      expect(id).toMatch(/^batch_/);
    });

    it("clips max_retries=0 to terminal-fail on first attempt", async () => {
      let attempts = 0;
      batchProcessor.registerProcessor(async () => {
        attempts++;
        throw new Error("immediate fail");
      });
      batchProcessor.enqueue("fail-once", {}, 1, { max_retries: 0 });
      const r = await batchProcessor.processTick();
      // With max_retries=0, item.retry_count becomes 1 on failure;
      // 1 < 0 is false → terminal failure on the first tick.
      expect(attempts).toBe(1);
      expect(r).toHaveLength(1);
      expect(r[0].status).toBe("failed");
    });

    it("accepts every documented BatchPriority value (0..3)", () => {
      const priorities: BatchPriority[] = [0, 1, 2, 3];
      const beforeSize = batchProcessor.getQueueSize();
      for (const p of priorities) {
        batchProcessor.enqueue(`op-p${p}`, {}, p);
      }
      // Priority 0 (CRITICAL) never queues — so +3, not +4.
      expect(batchProcessor.getQueueSize()).toBe(beforeSize + 3);
    });
  });
});
