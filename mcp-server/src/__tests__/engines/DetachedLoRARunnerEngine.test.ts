/**
 * DetachedLoRARunnerEngine tests (U-LPR-GPU-ASYNC)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  DetachedLoRARunnerEngine,
  InMemoryProcessLauncher,
  QueueSaturatedError,
  type JobRequest,
} from "../../engines/DetachedLoRARunnerEngine.js";

let launcher: InMemoryProcessLauncher;
let eng: DetachedLoRARunnerEngine;

function req(overrides: Partial<JobRequest> = {}): JobRequest {
  return {
    job_id: "J1",
    experiment_id: "EXP-A",
    command: "python",
    args: ["train.py", "--rank=16"],
    cwd: "/mnt/lora",
    enqueued_by: "ml-eng",
    ...overrides,
  };
}

beforeEach(() => {
  launcher = new InMemoryProcessLauncher();
  eng = new DetachedLoRARunnerEngine(launcher);
});

// ──────────────────────────────────────────────────────────────────────
// submit validation + queue semantics
// ──────────────────────────────────────────────────────────────────────

describe("submit", () => {
  it("enqueues a valid job in queued state", () => {
    const j = eng.submit(req(), 1_000);
    expect(j.status).toBe("queued");
    expect(j.enqueued_at).toBe(1_000);
    expect(eng.queueStatus().queued_count).toBe(1);
  });

  it("rejects missing fields", () => {
    expect(() => eng.submit(req({ job_id: "" }))).toThrow(/job_id/);
    expect(() => eng.submit(req({ experiment_id: "" }))).toThrow(/experiment_id/);
    expect(() => eng.submit(req({ command: "" }))).toThrow(/command/);
    expect(() => eng.submit(req({ enqueued_by: "" }))).toThrow(/enqueued_by/);
  });

  it("rejects duplicate job_id", () => {
    eng.submit(req());
    expect(() => eng.submit(req())).toThrow(/already exists/);
  });

  it("throws QueueSaturatedError at capacity, with retry hint", () => {
    eng.configure({ capacity: 2 });
    eng.submit(req({ job_id: "J1" }));
    eng.submit(req({ job_id: "J2" }));
    try {
      eng.submit(req({ job_id: "J3" }));
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(QueueSaturatedError);
      const qe = err as QueueSaturatedError;
      expect(qe.retry_after_ms).toBeGreaterThan(0);
    }
  });

  it("higher priority jumps the queue", () => {
    eng.submit(req({ job_id: "J1", priority: 0 }), 1_000);
    eng.submit(req({ job_id: "J2", priority: 10 }), 2_000);
    const next = eng.dispatchNext(3_000)!;
    expect(next.job_id).toBe("J2");
  });

  it("FIFO within same priority", () => {
    eng.submit(req({ job_id: "J1", priority: 5 }), 1_000);
    eng.submit(req({ job_id: "J2", priority: 5 }), 2_000);
    const next = eng.dispatchNext(3_000)!;
    expect(next.job_id).toBe("J1");
  });
});

// ──────────────────────────────────────────────────────────────────────
// dispatchNext + running state
// ──────────────────────────────────────────────────────────────────────

describe("dispatchNext", () => {
  it("spawns process and transitions queued → running with pid", () => {
    eng.submit(req(), 1_000);
    const j = eng.dispatchNext(2_000)!;
    expect(j.status).toBe("running");
    expect(j.pid).toBeGreaterThan(0);
    expect(j.started_at).toBe(2_000);
    expect(launcher.spawnLog).toHaveLength(1);
  });

  it("returns null when nothing queued", () => {
    expect(eng.dispatchNext()).toBeNull();
  });

  it("respects concurrency=1 by default", () => {
    eng.submit(req({ job_id: "J1" }));
    eng.submit(req({ job_id: "J2" }));
    eng.dispatchNext();
    const second = eng.dispatchNext();
    expect(second).toBeNull();
  });

  it("honors concurrency=2 when configured", () => {
    eng.configure({ concurrency: 2 });
    eng.submit(req({ job_id: "J1" }));
    eng.submit(req({ job_id: "J2" }));
    eng.dispatchNext();
    const second = eng.dispatchNext();
    expect(second).not.toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────
// pause / resume
// ──────────────────────────────────────────────────────────────────────

describe("pause / resume", () => {
  it("pauses a running job → paused with pause_count=1", () => {
    eng.submit(req(), 1_000);
    eng.dispatchNext(2_000);
    const p = eng.pause("J1", 3_000);
    expect(p.status).toBe("paused");
    expect(p.pause_count).toBe(1);
    expect(p.paused_at).toBe(3_000);
  });

  it("rejects pause of queued job", () => {
    eng.submit(req());
    expect(() => eng.pause("J1")).toThrow(/can only pause running/);
  });

  it("resume restores running and accumulates pause time", () => {
    eng.submit(req(), 1_000);
    eng.dispatchNext(2_000);
    eng.pause("J1", 3_000);
    const r = eng.resume("J1", 5_000);
    expect(r.status).toBe("running");
    expect(r.cumulative_pause_ms).toBe(2_000);
    expect(r.resumed_at).toBe(5_000);
  });

  it("rejects resume of non-paused job", () => {
    eng.submit(req());
    eng.dispatchNext();
    expect(() => eng.resume("J1")).toThrow(/can only resume paused/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// kill / markComplete
// ──────────────────────────────────────────────────────────────────────

describe("kill", () => {
  it("kill queued → aborted, removes from queue", () => {
    eng.submit(req(), 1_000);
    const k = eng.kill("J1", "user-aborted launch request", 2_000);
    expect(k.status).toBe("aborted");
    expect(eng.queueStatus().queued_count).toBe(0);
  });

  it("kill running → killed, launcher records kill", () => {
    eng.submit(req(), 1_000);
    eng.dispatchNext(2_000);
    const k = eng.kill("J1", "operator pressed stop", 5_000);
    expect(k.status).toBe("killed");
    expect(launcher.killLog).toHaveLength(1);
  });

  it("requires ≥5 char reason", () => {
    eng.submit(req());
    expect(() => eng.kill("J1", "x")).toThrow(/reason/);
  });

  it("refuses to kill terminal job", () => {
    eng.submit(req());
    eng.dispatchNext();
    eng.kill("J1", "initial kill reason");
    expect(() => eng.kill("J1", "second kill attempt")).toThrow(/terminal/);
  });
});

describe("markComplete", () => {
  it("exit_code=0 → completed", () => {
    eng.submit(req(), 1_000);
    eng.dispatchNext(2_000);
    const r = eng.markComplete({ job_id: "J1", exit_code: 0, now: 10_000 });
    expect(r.status).toBe("completed");
    expect(r.completed_at).toBe(10_000);
  });

  it("exit_code≠0 → failed", () => {
    eng.submit(req(), 1_000);
    eng.dispatchNext(2_000);
    const r = eng.markComplete({ job_id: "J1", exit_code: 137, error: "OOM on GPU" });
    expect(r.status).toBe("failed");
    expect(r.exit_code).toBe(137);
  });

  it("rejects markComplete on queued job", () => {
    eng.submit(req());
    expect(() =>
      eng.markComplete({ job_id: "J1", exit_code: 0 }),
    ).toThrow(/not completable/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Timeout sweep
// ──────────────────────────────────────────────────────────────────────

describe("sweepTimeouts", () => {
  it("kills jobs past timeout_ms", () => {
    eng.submit(req({ timeout_ms: 500 }), 1_000);
    eng.dispatchNext(2_000);
    const killed = eng.sweepTimeouts(3_000); // 1000ms elapsed > 500ms budget
    expect(killed).toHaveLength(1);
    expect(killed[0].status).toBe("killed");
    expect(killed[0].error).toMatch(/timeout/);
  });

  it("subtracts cumulative_pause_ms from active time", () => {
    eng.submit(req({ timeout_ms: 1_000 }), 1_000);
    eng.dispatchNext(2_000);
    eng.pause("J1", 2_500);
    eng.resume("J1", 10_000); // 7500ms paused
    // active_ms at now=10_500 = (10_500 - 2_000 - 7500) = 1000, right at boundary
    const killed = eng.sweepTimeouts(10_500);
    expect(killed).toHaveLength(0);
    const killed2 = eng.sweepTimeouts(10_600);
    expect(killed2).toHaveLength(1);
  });

  it("ignores jobs without timeout_ms", () => {
    eng.submit(req(), 1_000);
    eng.dispatchNext(2_000);
    expect(eng.sweepTimeouts(1_000_000)).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// retry
// ──────────────────────────────────────────────────────────────────────

describe("retry", () => {
  it("re-queues failed job with +1 priority bump", () => {
    eng.submit(req({ priority: 0 }), 1_000);
    eng.dispatchNext(2_000);
    eng.markComplete({ job_id: "J1", exit_code: 1, error: "trainer fail" });
    const r = eng.retry("J1", "J1-retry", 5_000);
    expect(r.status).toBe("queued");
    expect(r.priority).toBe(1);
  });

  it("refuses retry of running job", () => {
    eng.submit(req());
    eng.dispatchNext();
    expect(() => eng.retry("J1", "J1-retry")).toThrow(/only failed/);
  });

  it("refuses retry with reused job_id", () => {
    eng.submit(req());
    eng.dispatchNext();
    eng.markComplete({ job_id: "J1", exit_code: 1 });
    expect(() => eng.retry("J1", "J1")).toThrow(/already exists/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// queueStatus + liveness
// ──────────────────────────────────────────────────────────────────────

describe("queueStatus / reconcileLiveness", () => {
  it("available_slots = capacity - (queued + running)", () => {
    eng.configure({ capacity: 5 });
    eng.submit(req({ job_id: "J1" }));
    eng.submit(req({ job_id: "J2" }));
    eng.dispatchNext();
    const s = eng.queueStatus();
    expect(s.available_slots).toBe(3);
    expect(s.running_count).toBe(1);
    expect(s.queued_count).toBe(1);
  });

  it("reconcileLiveness marks vanished processes as failed", () => {
    eng.submit(req(), 1_000);
    const j = eng.dispatchNext(2_000)!;
    launcher.simulateExit(j.pid!);
    const drifted = eng.reconcileLiveness(5_000);
    expect(drifted).toHaveLength(1);
    expect(drifted[0].status).toBe("failed");
    expect(drifted[0].error).toMatch(/vanished/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// config validation
// ──────────────────────────────────────────────────────────────────────

describe("configure", () => {
  it("rejects out-of-range values", () => {
    expect(() => eng.configure({ capacity: 0 })).toThrow(/capacity/);
    expect(() => eng.configure({ capacity: 2000 })).toThrow(/capacity/);
    expect(() => eng.configure({ concurrency: 0 })).toThrow(/concurrency/);
    expect(() => eng.configure({ concurrency: 100 })).toThrow(/concurrency/);
    expect(() => eng.configure({ p95_service_time_ms: 0 })).toThrow(/p95/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// clearAll
// ──────────────────────────────────────────────────────────────────────

describe("clearAll", () => {
  it("resets queue + jobs map", () => {
    eng.submit(req());
    eng.clearAll();
    expect(eng.queueStatus().queued_count).toBe(0);
    expect(eng.listJobs()).toHaveLength(0);
  });
});
