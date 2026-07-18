/**
 * QueueEngine — companion test
 * =============================
 * WIRE-UNWIRED-MS0/U-WIRE-QUEUE-ENGINE
 *
 * Verifies the prism_infra read-only surface (q_* actions) backed by the
 * in-memory QueueEngine singleton — priority job queue with retry policy,
 * dead-letter queue, and lifecycle management.
 *
 * Wired (read-only):
 *   - q_get_job     → queueEngine.getJob(job_id)
 *   - q_list_jobs   → queueEngine.listJobs(queue_name, status?)
 *   - q_stats       → queueEngine.stats(queue_name)
 *   - q_list_queues → queueEngine.listQueues()
 *
 * The mutation surface (enqueue / dequeue / complete / fail / cancel /
 * retry / purge / clear) is exercised here to drive jobs through their
 * lifecycle and verify the read surface reports correct state, but is NOT
 * exposed via MCP.
 *
 * Every assertion compares against a concrete expected value (R9).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { QueueEngine, queueEngine, type JobStatus } from "../engines/QueueEngine.js";

describe("QueueEngine", () => {
  beforeEach(() => {
    // clear() wipes jobs, processing-time samples, AND the module-level
    // jobIdCounter — keeps id assertions deterministic + suite shuffle-safe.
    queueEngine.clear();
  });

  describe("enqueue — job creation + id format", () => {
    it("creates a 'pending' job with a zero-padded JOB- id and default fields", () => {
      const job = queueEngine.enqueue("emails", { to: "x@y.z" });
      expect(job.id).toEqual("JOB-000001");
      expect(job.queue_name).toEqual("emails");
      expect(job.status).toEqual("pending");
      expect(job.priority).toEqual("normal");
      expect(job.attempts).toEqual(0);
      expect(job.max_attempts).toEqual(3);
      expect(job.timeout_sec).toEqual(300);
      expect(job.payload).toEqual({ to: "x@y.z" });
    });

    it("honors enqueue options (priority, max_attempts, timeout_sec)", () => {
      const job = queueEngine.enqueue("urgent", null, {
        priority: "critical",
        max_attempts: 5,
        timeout_sec: 60,
      });
      expect(job.priority).toEqual("critical");
      expect(job.max_attempts).toEqual(5);
      expect(job.timeout_sec).toEqual(60);
    });

    it("sets delay_until in the future when delay_sec is provided", () => {
      const before = Date.now();
      const job = queueEngine.enqueue("deferred", null, { delay_sec: 100 });
      const delayMs = new Date(job.delay_until ?? "").getTime();
      // delay_until ≈ now + 100s. Allow generous slack for slow CI.
      expect(delayMs > before + 90_000).toEqual(true);
      expect(delayMs < before + 110_000).toEqual(true);
    });

    it("monotonically increments the job id", () => {
      expect(queueEngine.enqueue("q", 1).id).toEqual("JOB-000001");
      expect(queueEngine.enqueue("q", 2).id).toEqual("JOB-000002");
      expect(queueEngine.enqueue("q", 3).id).toEqual("JOB-000003");
    });
  });

  describe("dequeue — priority + FIFO ordering", () => {
    it("dequeues the highest-priority job first (critical < high < normal < low)", () => {
      queueEngine.enqueue("q", "low-job", { priority: "low" });
      queueEngine.enqueue("q", "normal-job", { priority: "normal" });
      queueEngine.enqueue("q", "critical-job", { priority: "critical" });
      queueEngine.enqueue("q", "high-job", { priority: "high" });
      const first = queueEngine.dequeue("q");
      expect(first?.payload).toEqual("critical-job");
      expect(first?.status).toEqual("processing");
      expect(first?.attempts).toEqual(1);
    });

    it("breaks priority ties FIFO by creation order", () => {
      const a = queueEngine.enqueue("q", "first", { priority: "normal" });
      const b = queueEngine.enqueue("q", "second", { priority: "normal" });
      expect(queueEngine.dequeue("q")?.id).toEqual(a.id);
      expect(queueEngine.dequeue("q")?.id).toEqual(b.id);
    });

    it("returns undefined when the queue has no pending jobs", () => {
      const job = queueEngine.dequeue("empty-queue");
      expect(job === undefined).toEqual(true);
    });

    it("does NOT dequeue a delayed job before its delay_until elapses", () => {
      queueEngine.enqueue("q", "delayed", { delay_sec: 3600 });
      expect(queueEngine.dequeue("q") === undefined).toEqual(true);
    });

    it("dequeues across queues independently (queue isolation)", () => {
      queueEngine.enqueue("q1", "in-q1");
      queueEngine.enqueue("q2", "in-q2");
      expect(queueEngine.dequeue("q1")?.payload).toEqual("in-q1");
      expect(queueEngine.dequeue("q2")?.payload).toEqual("in-q2");
    });
  });

  describe("complete / fail — lifecycle transitions", () => {
    it("complete() moves a processing job to 'completed' and records the result", () => {
      queueEngine.enqueue("q", "work");
      const job = queueEngine.dequeue("q");
      expect(queueEngine.complete(job!.id, { ok: true })).toEqual(true);
      const stored = queueEngine.getJob(job!.id);
      expect(stored?.status).toEqual("completed");
      expect(stored?.result).toEqual({ ok: true });
    });

    it("complete() returns false for a job not in 'processing' state", () => {
      const job = queueEngine.enqueue("q", "still-pending");
      // Never dequeued → still pending → cannot complete.
      expect(queueEngine.complete(job.id)).toEqual(false);
      expect(queueEngine.complete("JOB-nonexistent")).toEqual(false);
    });

    it("fail() re-queues a job to 'pending' while attempts remain below max_attempts", () => {
      queueEngine.enqueue("q", "flaky", { max_attempts: 3 });
      const job = queueEngine.dequeue("q"); // attempts → 1
      expect(queueEngine.fail(job!.id, "transient error")).toEqual(true);
      const stored = queueEngine.getJob(job!.id);
      expect(stored?.status).toEqual("pending"); // re-queued for retry
      expect(stored?.error).toEqual("transient error");
    });

    it("fail() sends a job to 'dead_letter' once attempts reach max_attempts", () => {
      queueEngine.enqueue("q", "doomed", { max_attempts: 2 });
      // attempt 1
      let job = queueEngine.dequeue("q");
      queueEngine.fail(job!.id, "err-1");
      // attempt 2 — now attempts === max_attempts
      job = queueEngine.dequeue("q");
      expect(job?.attempts).toEqual(2);
      queueEngine.fail(job!.id, "err-2");
      expect(queueEngine.getJob(job!.id)?.status).toEqual("dead_letter");
    });
  });

  describe("cancel / retry", () => {
    it("cancel() marks a pending job 'cancelled'", () => {
      const job = queueEngine.enqueue("q", "abort-me");
      expect(queueEngine.cancel(job.id)).toEqual(true);
      expect(queueEngine.getJob(job.id)?.status).toEqual("cancelled");
    });

    it("cancel() returns false for an already-completed job", () => {
      queueEngine.enqueue("q", "done");
      const job = queueEngine.dequeue("q");
      queueEngine.complete(job!.id);
      expect(queueEngine.cancel(job!.id)).toEqual(false);
    });

    it("retry() resets a dead_letter job to 'pending' with attempts=0", () => {
      queueEngine.enqueue("q", "revive", { max_attempts: 1 });
      const job = queueEngine.dequeue("q");
      queueEngine.fail(job!.id, "boom"); // attempts(1) === max(1) → dead_letter
      expect(queueEngine.getJob(job!.id)?.status).toEqual("dead_letter");
      expect(queueEngine.retry(job!.id)).toEqual(true);
      const revived = queueEngine.getJob(job!.id);
      expect(revived?.status).toEqual("pending");
      expect(revived?.attempts).toEqual(0);
      expect(revived?.error === undefined).toEqual(true);
    });

    it("retry() returns false for a job that is not failed/dead_letter", () => {
      const job = queueEngine.enqueue("q", "healthy");
      expect(queueEngine.retry(job.id)).toEqual(false);
    });
  });

  describe("getJob / listJobs — read surface", () => {
    it("getJob returns undefined for an unknown id", () => {
      expect(queueEngine.getJob("JOB-999999") === undefined).toEqual(true);
    });

    it("listJobs returns every job in a queue, ignoring other queues", () => {
      queueEngine.enqueue("q1", "a");
      queueEngine.enqueue("q1", "b");
      queueEngine.enqueue("q2", "c");
      expect(queueEngine.listJobs("q1").length).toEqual(2);
      expect(queueEngine.listJobs("q2").length).toEqual(1);
    });

    it("listJobs filters by status when a status is given", () => {
      queueEngine.enqueue("q", "p1");
      queueEngine.enqueue("q", "p2");
      const job = queueEngine.dequeue("q"); // one job → processing
      queueEngine.complete(job!.id);        // → completed
      expect(queueEngine.listJobs("q", "completed").length).toEqual(1);
      expect(queueEngine.listJobs("q", "pending").length).toEqual(1);
    });
  });

  describe("stats — per-status aggregation", () => {
    it("counts jobs by status and computes total_processed", () => {
      // Build deterministically: dequeue() is FIFO within a priority band, so
      // each lifecycle job is enqueued + dequeued + transitioned BEFORE the
      // next is enqueued — guarantees the right job is acted on.
      // (1) completed job
      queueEngine.enqueue("q", "done-job");
      const dj = queueEngine.dequeue("q");
      queueEngine.complete(dj!.id);
      // (2) dead-letter job: max_attempts=1 → a single fail() → dead_letter
      queueEngine.enqueue("q", "fail-job", { max_attempts: 1 });
      const fj = queueEngine.dequeue("q"); // attempts → 1
      queueEngine.fail(fj!.id, "boom");    // 1 < 1 false → dead_letter
      // (3) two jobs left pending
      queueEngine.enqueue("q", "p1");
      queueEngine.enqueue("q", "p2");
      const s = queueEngine.stats("q");
      expect(s.queue_name).toEqual("q");
      expect(s.pending).toEqual(2);
      expect(s.completed).toEqual(1);
      expect(s.dead_letter).toEqual(1);
      expect(s.processing).toEqual(0);
      // total_processed = completed + failed + cancelled = 1 + 0 + 0.
      expect(s.total_processed).toEqual(1);
    });

    it("returns all-zero counts for a queue that has no jobs", () => {
      const s = queueEngine.stats("never-used");
      expect(s.pending).toEqual(0);
      expect(s.processing).toEqual(0);
      expect(s.completed).toEqual(0);
      expect(s.dead_letter).toEqual(0);
      expect(s.total_processed).toEqual(0);
    });

    it("records avg_processing_time_ms as a non-negative number after a completion", () => {
      queueEngine.enqueue("q", "timed");
      const job = queueEngine.dequeue("q");
      queueEngine.complete(job!.id);
      expect(queueEngine.stats("q").avg_processing_time_ms >= 0).toEqual(true);
    });
  });

  describe("listQueues / purge", () => {
    it("listQueues returns every distinct queue name with at least one job", () => {
      queueEngine.enqueue("alpha", 1);
      queueEngine.enqueue("beta", 2);
      queueEngine.enqueue("alpha", 3);
      expect(queueEngine.listQueues().sort()).toEqual(["alpha", "beta"]);
    });

    it("purge removes jobs of the given status and returns the count", () => {
      queueEngine.enqueue("q", "p1");
      const c = queueEngine.enqueue("q", "complete-me");
      const job = queueEngine.dequeue("q"); // p1 is dequeued first (FIFO)
      queueEngine.complete(job!.id);
      const purged = queueEngine.purge("q", "completed");
      expect(purged).toEqual(1);
      expect(queueEngine.getJob(job!.id) === undefined).toEqual(true);
      // The still-pending job survives the purge.
      expect(queueEngine.getJob(c.id)?.status).toEqual("pending");
    });
  });

  describe("adversarial inputs", () => {
    it("handles null / undefined / empty payloads", () => {
      const a = queueEngine.enqueue("q", null);
      const b = queueEngine.enqueue("q", undefined);
      const c = queueEngine.enqueue("q", "");
      expect(a.payload).toEqual(null);
      expect(b.payload === undefined).toEqual(true);
      expect(c.payload).toEqual("");
    });

    it("listJobs on a never-used queue returns an empty array", () => {
      expect(queueEngine.listJobs("ghost-queue")).toEqual([]);
    });

    it("all status filters are accepted by listJobs", () => {
      queueEngine.enqueue("q", 1);
      const statuses: JobStatus[] = [
        "pending", "processing", "completed", "failed", "cancelled", "dead_letter",
      ];
      for (const st of statuses) {
        // Must not throw for any documented status value.
        expect(Array.isArray(queueEngine.listJobs("q", st))).toEqual(true);
      }
    });
  });

  describe("class export — multi-instance isolation", () => {
    it("a new QueueEngine instance has its own job map", () => {
      const local = new QueueEngine();
      local.enqueue("local-q", "isolated");
      expect(local.listQueues()).toEqual(["local-q"]);
      // The singleton was cleared in beforeEach and never saw this queue.
      expect(queueEngine.listQueues()).toEqual([]);
    });
  });
});
