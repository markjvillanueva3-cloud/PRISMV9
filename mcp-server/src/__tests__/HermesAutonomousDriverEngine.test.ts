/**
 * HermesAutonomousDriverEngine tests (R15: real reference-value / algebraic-invariant
 * asserts on the pure state machine -- 2 happy + 3 failure + 3 adversarial + 2 guards).
 *
 * Intent (R9): each test fails if the autonomous-drive CONTRACT changes --
 *   - waves drain in dependency order (not a flat list);
 *   - a transient failure is REQUEUED not lost (self-correction);
 *   - retries are BOUNDED (no infinite loop on a never-succeeding subtask);
 *   - a cyclic/malformed DAG is REJECTED before any execution;
 *   - transitions are PURE (no input mutation).
 */
import { describe, it, expect } from "vitest";
import {
  HermesAutonomousDriverEngine as D,
  type SubtaskResult,
} from "../engines/HermesAutonomousDriverEngine.js";
import type { Subtask } from "../engines/HermesParallelFanoutPlannerEngine.js";

function st(id: string, deps: string[] = []): Subtask {
  return { subtask_id: id, description: `task ${id}`, domain: "test", depends_on: deps, size_hint: "short" };
}
function ok(id: string, output = `out-${id}`): SubtaskResult {
  return { subtask_id: id, ok: true, output };
}
function fail(id: string): SubtaskResult {
  return { subtask_id: id, ok: false, error: `boom-${id}` };
}

describe("HermesAutonomousDriverEngine", () => {
  // ── HAPPY 1 ──────────────────────────────────────────────────────────────
  it("drives a linear DAG (a->b->c) in dependency order to completion", () => {
    const subtasks = [st("a"), st("b", ["a"]), st("c", ["b"])];
    let state = D.start({ parent_task_id: "P", subtasks });
    expect(state.status).toBe("running");
    expect(state.wave_count).toBe(3);

    expect(D.nextBatch(state).ready).toEqual(["a"]); // wave 0: only the root
    state = D.recordResults(state, [ok("a")]);
    expect(state.status).toBe("running");
    expect(D.nextBatch(state).ready).toEqual(["b"]); // a done -> b unlocked

    state = D.recordResults(state, [ok("b")]);
    expect(D.nextBatch(state).ready).toEqual(["c"]);

    state = D.recordResults(state, [ok("c")]);
    expect(state.status).toBe("complete");
    expect(D.isComplete(state)).toBe(true);

    const agg = D.aggregate(state);
    expect(agg.completed).toBe(3);
    expect(agg.failed).toBe(0);
    expect(agg.outputs).toEqual({ a: "out-a", b: "out-b", c: "out-c" });
  });

  // ── HAPPY 2 ──────────────────────────────────────────────────────────────
  it("dispatches independent leaves in ONE wave, then the join", () => {
    const subtasks = [st("a"), st("b"), st("c", ["a", "b"])];
    let state = D.start({ parent_task_id: "P", subtasks });
    expect(state.wave_count).toBe(2); // {a,b} | {c}
    expect(D.nextBatch(state).ready.sort()).toEqual(["a", "b"]);

    state = D.recordResults(state, [ok("a"), ok("b")]);
    expect(D.nextBatch(state).ready).toEqual(["c"]);

    state = D.recordResults(state, [ok("c")]);
    expect(state.status).toBe("complete");
  });

  // ── FAILURE 1 — cyclic DAG rejected before execution ─────────────────────
  it("aborts a cyclic DAG at start with no execution", () => {
    const subtasks = [st("a", ["b"]), st("b", ["a"])];
    const state = D.start({ parent_task_id: "P", subtasks });
    expect(state.status).toBe("aborted");
    expect(state.reason).toMatch(/cycle|cyclic|invalid-dag/i);
    expect(D.nextBatch(state).ready).toEqual([]); // terminal -> nothing dispatchable
  });

  // ── FAILURE 2 — transient failure is requeued, not lost (self-correct) ────
  it("requeues a failed subtask within retry budget (self-correct), never drops it", () => {
    const subtasks = [st("a"), st("b", ["a"])];
    let state = D.start({ parent_task_id: "P", subtasks, bounds: { maxRetries: 2 } });

    state = D.recordResults(state, [fail("a")]); // a fails once
    expect(state.status).toBe("running");
    expect(state.attempts.a).toBe(1);
    expect(state.completed_ids).not.toContain("a");
    expect(state.failed_ids).not.toContain("a");
    expect(D.nextBatch(state).ready).toEqual(["a"]); // re-offered, not lost

    state = D.recordResults(state, [ok("a")]); // succeeds on retry
    expect(D.nextBatch(state).ready).toEqual(["b"]);
    state = D.recordResults(state, [ok("b")]);
    expect(state.status).toBe("complete");
  });

  // ── FAILURE 3 — retries exhausted -> permanent fail -> bounded termination ─
  it("marks a subtask failed after retries exhausted and terminates (no infinite loop)", () => {
    const subtasks = [st("a"), st("b", ["a"])];
    let state = D.start({ parent_task_id: "P", subtasks, bounds: { maxRetries: 1 } });

    state = D.recordResults(state, [fail("a")]); // attempt 1 (<= maxRetries) -> retry
    expect(state.status).toBe("running");
    state = D.recordResults(state, [fail("a")]); // attempt 2 (> maxRetries) -> permanent
    expect(state.failed_ids).toContain("a");
    expect(state.status).toBe("failed");
    expect(state.reason).toMatch(/blocked-by-failed-deps/);
    expect(D.isTerminal(state)).toBe(true);

    const after = D.recordResults(state, [ok("a")]); // terminal -> immutable no-op
    expect(after).toBe(state);

    const agg = D.aggregate(state);
    expect(agg.failed).toBe(1);
    expect(agg.status).toBe("failed");
  });

  // ── ADVERSARIAL 1 — maxIterations stops a never-succeeding loop ───────────
  it("aborts at maxIterations on a subtask that never succeeds", () => {
    const subtasks = [st("a")];
    let state = D.start({ parent_task_id: "P", subtasks, bounds: { maxIterations: 3, maxRetries: 10 } });
    let guard = 0;
    while (!D.isTerminal(state) && guard++ < 50) {
      state = D.recordResults(state, [fail("a")]);
    }
    expect(D.isTerminal(state)).toBe(true);
    expect(state.status).toBe("aborted");
    expect(state.reason).toMatch(/max-iterations/);
    expect(state.iteration).toBeLessThanOrEqual(4); // bounded, NOT the 50 guard ceiling
  });

  // ── ADVERSARIAL 2 — unknown id ignored; empty DAG completes ──────────────
  it("ignores an unknown subtask id and completes an empty DAG", () => {
    const subtasks = [st("a")];
    let state = D.start({ parent_task_id: "P", subtasks });
    state = D.recordResults(state, [ok("zzz-unknown")]); // not in plan -> ignored
    expect(state.completed_ids).toEqual([]);
    expect(state.status).toBe("running");
    state = D.recordResults(state, [ok("a")]);
    expect(state.status).toBe("complete");

    const empty = D.start({ parent_task_id: "Q", subtasks: [] });
    expect(empty.status).toBe("complete");
    expect(empty.reason).toBe("no-subtasks");
  });

  // ── ADVERSARIAL 3 — transitions are pure (no input mutation) ─────────────
  it("does not mutate the input state (pure transition)", () => {
    const subtasks = [st("a"), st("b", ["a"])];
    const s0 = D.start({ parent_task_id: "P", subtasks });
    const s1 = D.recordResults(s0, [ok("a")]);
    expect(s0.completed_ids).toEqual([]); // prior state untouched
    expect(s1.completed_ids).toEqual(["a"]);
    expect(s1).not.toBe(s0);
  });

  // ── GUARD 1 — malformed DAG (duplicate id) aborts ────────────────────────
  it("aborts on a malformed DAG (duplicate subtask_id)", () => {
    const subtasks = [st("a"), st("a")];
    const state = D.start({ parent_task_id: "P", subtasks });
    expect(state.status).toBe("aborted");
    expect(state.reason).toMatch(/invalid-dag|duplicate/i);
  });

  // ── GUARD 2 — maxRetries:0 makes a first failure immediately permanent ────
  it("with maxRetries 0, a first failure is immediately permanent", () => {
    const subtasks = [st("a")];
    let state = D.start({ parent_task_id: "P", subtasks, bounds: { maxRetries: 0 } });
    state = D.recordResults(state, [fail("a")]);
    expect(state.failed_ids).toContain("a");
    expect(state.status).toBe("failed");
  });

  // ── GUARD 3 — survives the dispatcher slimResponse round-trip ─────────────
  // The prism_session dispatcher wraps every response in slimResponse(), which STRIPS
  // empty arrays + null (responseSlimmer.ts). A fresh DriveState therefore loses
  // completed_ids:[] / failed_ids:[] / reason:null over the MCP transport, and the
  // consumer feeds that slimmed state straight back. The engine MUST hydrate, not crash.
  // (regression guard from 3-of-3 scrutiny arm C; ref_fanout_request_slim_strips_depends_on)
  it("survives a slimResponse round-trip (stripped empty arrays + null) and stays correct", () => {
    // mimic responseSlimmer: drop nulls + empty arrays, then JSON round-trip the transport
    const slim = <T>(o: T): T =>
      JSON.parse(
        JSON.stringify(o, (_k, v) =>
          v === null || (Array.isArray(v) && v.length === 0) ? undefined : v,
        ),
      );

    const started = D.start({ parent_task_id: "P", subtasks: [st("a"), st("b", ["a"])] });
    const slimmed = slim(started);
    // prove the transport loss is real (else the test would pass vacuously): the
    // empty completed_ids/failed_ids arrays are GONE from the serialized payload
    expect(JSON.stringify(slimmed)).not.toContain("completed_ids");
    expect(JSON.stringify(slimmed)).not.toContain("failed_ids");

    // feed the slimmed state straight back -> the engine hydrates and the ready wave is
    // correct. This line WOULD throw TypeError pre-hydrate ([...undefined]/undefined.includes).
    expect(D.nextBatch(slimmed).ready).toEqual(["a"]);

    const afterA = D.recordResults(slimmed, [ok("a")]);
    expect(afterA.completed_ids).toEqual(["a"]);
    expect(afterA.status).toBe("running");
    expect(D.nextBatch(afterA).ready).toEqual(["b"]); // a-done unlocks b through the round-trip

    // a slimmed terminal/aggregate path is also crash-safe and numerically correct
    const agg = D.aggregate(slim(afterA));
    expect(agg.completed).toBe(1);
    expect(agg.total).toBe(2);
    expect(agg.outputs).toEqual({ a: "out-a" });
  });
});
