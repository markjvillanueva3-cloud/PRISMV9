/**
 * HermesAutonomousDriveRunnerEngine tests (R15: real reference-value asserts on the
 * async gated runner -- happy + >=3 failure + >=2 adversarial). The executor is a
 * deterministic MOCK (no Ollama/agents needed) so the orchestration logic -- gate,
 * dependency-ordered waves, bounded fan-out, self-correct/requeue, retry-exhaustion,
 * timeout, cycle rejection -- is fully proven in isolation.
 *
 * Intent (R9): each test fails if the runner CONTRACT changes -- the gate must truly
 * block execution, a transient failure must be retried, an always-failing/never-completing
 * subtask must terminate (not hang/loop), and the fan-out cap must hold.
 */
import { describe, it, expect } from "vitest";
import {
  HermesAutonomousDriveRunnerEngine as R,
  type SubtaskExecutor,
} from "../engines/HermesAutonomousDriveRunnerEngine.js";
import type { Subtask } from "../engines/HermesParallelFanoutPlannerEngine.js";

function st(id: string, deps: string[] = []): Subtask {
  return { subtask_id: id, description: `task ${id}`, domain: "test", depends_on: deps, size_hint: "short" };
}
const tick = (ms = 5): Promise<void> => new Promise((r) => setTimeout(r, ms));

const GATE = "PRISM_HERMES_AUTONOMOUS_DRIVE";
function withGateUnset<T>(fn: () => T): T {
  const prev = process.env[GATE];
  delete process.env[GATE];
  try {
    return fn();
  } finally {
    if (prev !== undefined) process.env[GATE] = prev;
  }
}
function withGateEnv<T>(val: string, fn: () => T): T {
  const prev = process.env[GATE];
  process.env[GATE] = val;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env[GATE];
    else process.env[GATE] = prev;
  }
}

describe("HermesAutonomousDriveRunnerEngine", () => {
  // ── HAPPY ────────────────────────────────────────────────────────────────
  it("drives a linear DAG to completion via the executor in dependency order (gate ON)", async () => {
    const calls: string[] = [];
    const executor: SubtaskExecutor = async (s) => {
      calls.push(s.subtask_id);
      return { ok: true, output: `done-${s.subtask_id}` };
    };
    const res = await R.drive({
      gateEnabled: true,
      subtasks: [st("a"), st("b", ["a"]), st("c", ["b"])],
      executor,
    });
    expect(res.ran).toBe(true);
    expect(res.gated).toBe(false);
    expect(res.aggregate?.status).toBe("complete");
    expect(res.aggregate?.completed).toBe(3);
    expect(res.aggregate?.outputs).toEqual({ a: "done-a", b: "done-b", c: "done-c" });
    expect(calls).toEqual(["a", "b", "c"]); // strict dependency order
    expect(res.trace.map((t) => t.wave)).toEqual([0, 1, 2]);
    expect(res.trace.flatMap((t) => t.ok)).toEqual(["a", "b", "c"]);
  });

  // ── SAFETY GATE — default OFF blocks all execution ───────────────────────
  it("refuses to run when the gate is OFF (default) -- executor is NEVER called", async () => {
    let called = 0;
    const executor: SubtaskExecutor = async () => {
      called += 1;
      return { ok: true };
    };
    const res = await withGateUnset(() => R.drive({ subtasks: [st("a")], executor }));
    expect(res.ran).toBe(false);
    expect(res.gated).toBe(true);
    expect(res.reason).toMatch(/gated-off/);
    expect(called).toBe(0); // the whole point: no autonomous execution unless armed
  });

  // ── SAFETY GATE — env var arms it ────────────────────────────────────────
  it("runs when the env gate PRISM_HERMES_AUTONOMOUS_DRIVE=1 is set", async () => {
    const executor: SubtaskExecutor = async () => ({ ok: true, output: "x" });
    const res = await withGateEnv("1", () => R.drive({ subtasks: [st("a")], executor }));
    expect(res.ran).toBe(true);
    expect(res.gated).toBe(false);
    expect(res.aggregate?.completed).toBe(1);
  });

  // ── FAN-OUT CAP — bounded concurrency per wave ───────────────────────────
  it("respects the maxParallel fan-out cap within a wave", async () => {
    let active = 0;
    let maxActive = 0;
    const done: string[] = [];
    const executor: SubtaskExecutor = async (s) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await tick(8);
      active -= 1;
      done.push(s.subtask_id);
      return { ok: true };
    };
    const res = await R.drive({
      gateEnabled: true,
      maxParallel: 2,
      subtasks: [st("a"), st("b"), st("c"), st("d")], // 4 independent leaves
      executor,
    });
    expect(res.aggregate?.completed).toBe(4);
    expect(maxActive).toBeLessThanOrEqual(2); // never more than the cap concurrently
    expect(maxActive).toBe(2); // ...and the cap IS used
    expect(res.trace.length).toBe(1); // 4 leaves = ONE wave (drained in two chunks of 2)
    expect(done.sort()).toEqual(["a", "b", "c", "d"]);
  });

  // ── FAILURE — self-correct (transient failure retried) ───────────────────
  it("self-corrects: a transient failure is retried by the runner until it succeeds", async () => {
    const attempts: Record<string, number> = {};
    const executor: SubtaskExecutor = async (s) => {
      attempts[s.subtask_id] = (attempts[s.subtask_id] ?? 0) + 1;
      if (s.subtask_id === "a" && attempts.a === 1) return { ok: false, error: "transient" };
      return { ok: true, output: `ok-${s.subtask_id}` };
    };
    const res = await R.drive({
      gateEnabled: true,
      bounds: { maxRetries: 2 },
      subtasks: [st("a"), st("b", ["a"])],
      executor,
    });
    expect(res.aggregate?.status).toBe("complete");
    expect(attempts.a).toBe(2); // failed once -> retried -> succeeded (not lost)
    expect(attempts.b).toBe(1);
  });

  // ── FAILURE — retries exhausted -> bounded termination ───────────────────
  it("terminates (status failed) when a subtask always fails -- bounded, no infinite loop", async () => {
    let aCalls = 0;
    const executor: SubtaskExecutor = async (s) => {
      if (s.subtask_id === "a") {
        aCalls += 1;
        return { ok: false, error: "always" };
      }
      return { ok: true };
    };
    const res = await R.drive({
      gateEnabled: true,
      bounds: { maxRetries: 2 },
      subtasks: [st("a"), st("b", ["a"])],
      executor,
    });
    expect(res.aggregate?.status).toBe("failed");
    expect(aCalls).toBe(3); // attempt 1 + 2 retries, then permanent -> BOUNDED
    expect(res.aggregate?.failed).toBe(1);
  });

  // ── ADVERSARIAL — never-completing subtask bounded by timeout ─────────────
  it("bounds a never-completing subtask via perSubtaskTimeoutMs (does not hang)", async () => {
    const executor: SubtaskExecutor = (s) =>
      s.subtask_id === "a"
        ? new Promise(() => {}) // never resolves
        : Promise.resolve({ ok: true });
    const res = await R.drive({
      gateEnabled: true,
      bounds: { maxRetries: 0 },
      perSubtaskTimeoutMs: 20,
      subtasks: [st("a")],
      executor,
    });
    expect(res.aggregate?.status).toBe("failed"); // timed out -> failure -> permanent (maxRetries:0)
    expect(res.trace[0]?.failed).toContain("a");
  });

  // ── ADVERSARIAL — cyclic DAG rejected before any execution ───────────────
  it("aborts a cyclic DAG without ever calling the executor", async () => {
    let called = 0;
    const executor: SubtaskExecutor = async () => {
      called += 1;
      return { ok: true };
    };
    const res = await R.drive({
      gateEnabled: true,
      subtasks: [st("a", ["b"]), st("b", ["a"])],
      executor,
    });
    expect(res.aggregate?.status).toBe("aborted");
    expect(res.reason).toMatch(/cycle|cyclic|invalid-dag/i);
    expect(called).toBe(0); // a cyclic DAG never reaches the executor
  });

  // ── GUARD — executor that throws is caught as a failure ──────────────────
  it("treats an executor that THROWS as a subtask failure (loop never crashes)", async () => {
    const executor: SubtaskExecutor = async (s) => {
      if (s.subtask_id === "a") throw new Error("boom");
      return { ok: true };
    };
    const res = await R.drive({
      gateEnabled: true,
      bounds: { maxRetries: 0 },
      subtasks: [st("a")],
      executor,
    });
    expect(res.aggregate?.status).toBe("failed");
    expect(res.trace[0]?.failed).toContain("a");
  });

  // ── GUARD — missing inputs throws (gate ON) ──────────────────────────────
  it("throws when neither subtasks nor goal+candidates are provided", async () => {
    const executor: SubtaskExecutor = async () => ({ ok: true });
    await expect(R.drive({ gateEnabled: true, executor })).rejects.toThrow(/provide.*subtasks.*goal/is);
  });
});
