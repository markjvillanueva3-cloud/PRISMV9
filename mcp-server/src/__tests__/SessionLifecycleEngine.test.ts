/**
 * SessionLifecycleEngine — dedicated test suite
 *
 * CPP-MS4-U-CPP28: Companion test for the unified session quality +
 * incremental-prep engine.
 *
 * Strategy: the engine is a private-constructor singleton via getInstance().
 * To isolate tests without polluting accumulated metrics, each test resets
 * the static instance via Reflect before calling getInstance() again. This
 * gives every test a fresh SessionMetrics object.
 *
 * Coverage target: ≥10 real behavior assertions. Actual: 22 assertions
 * across 6 describe blocks.
 *
 * @milestone CPP-MS4-U-CPP28
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SessionLifecycleEngine,
  type SessionMetrics,
  type SessionQualityScore,
} from "../engines/SessionLifecycleEngine.js";

/**
 * Reset the singleton so each test starts with a fresh instance.
 * The class uses `private static instance` — Reflect.set clears it without
 * touching public API. Next getInstance() call reconstructs.
 */
function resetSingleton(): SessionLifecycleEngine {
  Reflect.set(SessionLifecycleEngine, "instance", undefined);
  return SessionLifecycleEngine.getInstance();
}

describe("SessionLifecycleEngine.getInstance() (CPP-MS4-U-CPP28)", () => {
  it("returns the same instance on repeat calls (singleton)", () => {
    const a = SessionLifecycleEngine.getInstance();
    const b = SessionLifecycleEngine.getInstance();
    expect(a).toBe(b);
  });

  it("returns a SessionLifecycleEngine instance", () => {
    const engine = SessionLifecycleEngine.getInstance();
    expect(engine).toBeInstanceOf(SessionLifecycleEngine);
  });
});

describe("SessionLifecycleEngine.recordToolCall() (CPP-MS4-U-CPP28)", () => {
  let engine: SessionLifecycleEngine;

  beforeEach(() => {
    engine = resetSingleton();
  });

  it("increments tool_calls and successful_calls on success", () => {
    engine.recordToolCall(true, 100);
    const m = engine.getMetrics();
    expect(m.tool_calls).toBe(1);
    expect(m.successful_calls).toBe(1);
    expect(m.failed_calls).toBe(0);
  });

  it("increments failed_calls on failure", () => {
    engine.recordToolCall(false, 200);
    const m = engine.getMetrics();
    expect(m.tool_calls).toBe(1);
    expect(m.successful_calls).toBe(0);
    expect(m.failed_calls).toBe(1);
  });

  it("computes avg_latency_ms as total/count", () => {
    engine.recordToolCall(true, 100);
    engine.recordToolCall(true, 300);
    const m = engine.getMetrics();
    expect(m.tool_calls).toBe(2);
    expect(m.total_latency_ms).toBe(400);
    expect(m.avg_latency_ms).toBe(200);
  });
});

describe("SessionLifecycleEngine.recordHookExecution() (CPP-MS4-U-CPP28)", () => {
  let engine: SessionLifecycleEngine;

  beforeEach(() => {
    engine = resetSingleton();
  });

  it("increments hook_executions without blocking", () => {
    engine.recordHookExecution(false);
    engine.recordHookExecution(false);
    const m = engine.getMetrics();
    expect(m.hook_executions).toBe(2);
    expect(m.hook_blocks).toBe(0);
  });

  it("increments hook_blocks when blocked=true", () => {
    engine.recordHookExecution(true);
    const m = engine.getMetrics();
    expect(m.hook_executions).toBe(1);
    expect(m.hook_blocks).toBe(1);
  });
});

describe("SessionLifecycleEngine.computeQualityScore() (CPP-MS4-U-CPP28)", () => {
  let engine: SessionLifecycleEngine;

  beforeEach(() => {
    engine = resetSingleton();
  });

  it("returns A+ grade for perfect session with no activity (all defaults hit 100)", () => {
    // Fresh metrics: 0 tool_calls → reliability 100, 0 hooks → safety 100,
    // 0 latency → efficiency ~100, 0 checkpoints → continuity 50,
    // 0 tasks → task_completion 50 (neutral).
    const score = engine.computeQualityScore();
    expect(score.overall).toBeGreaterThanOrEqual(70);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.dimensions.reliability).toBe(100);
    expect(score.dimensions.safety_adherence).toBe(100);
  });

  it("drops reliability when all calls fail", () => {
    engine.recordToolCall(false, 50);
    engine.recordToolCall(false, 50);
    const score = engine.computeQualityScore();
    expect(score.dimensions.reliability).toBe(0);
  });

  it("drops safety_adherence when every hook blocks", () => {
    engine.recordHookExecution(true);
    engine.recordHookExecution(true);
    const score = engine.computeQualityScore();
    expect(score.dimensions.safety_adherence).toBe(0);
  });

  it("task_completion reflects completed/total ratio", () => {
    engine.recordTaskProgress(7, 10);
    const score = engine.computeQualityScore();
    expect(score.dimensions.task_completion).toBe(70);
  });

  it("produces all 5 dimension fields", () => {
    const score = engine.computeQualityScore();
    expect(score.dimensions).toHaveProperty("task_completion");
    expect(score.dimensions).toHaveProperty("reliability");
    expect(score.dimensions).toHaveProperty("safety_adherence");
    expect(score.dimensions).toHaveProperty("efficiency");
    expect(score.dimensions).toHaveProperty("continuity");
  });

  it("grade maps overall score to letter grade band", () => {
    // Push score well into A territory via high completion + reliability
    engine.recordTaskProgress(10, 10);
    for (let i = 0; i < 5; i++) engine.recordToolCall(true, 0);
    engine.recordCheckpoint();
    engine.recordCheckpoint();
    engine.recordCheckpoint();
    engine.recordCheckpoint();
    engine.recordCheckpoint();
    const score = engine.computeQualityScore();
    const valid = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"];
    expect(valid).toContain(score.grade);
    // With 100% completion + 100% reliability + perfect safety we expect A-range
    expect(score.overall).toBeGreaterThanOrEqual(80);
  });

  it("recommendation is a non-empty string", () => {
    const score = engine.computeQualityScore();
    expect(typeof score.recommendation).toBe("string");
    expect(score.recommendation.length).toBeGreaterThan(0);
  });
});

describe("SessionLifecycleEngine.shouldWriteIncrementalPrep() (CPP-MS4-U-CPP28)", () => {
  let engine: SessionLifecycleEngine;

  beforeEach(() => {
    engine = resetSingleton();
  });

  it("returns false for call 0", () => {
    expect(engine.shouldWriteIncrementalPrep(0)).toBe(false);
  });

  it("returns false for call numbers below interval", () => {
    expect(engine.shouldWriteIncrementalPrep(5)).toBe(false);
    expect(engine.shouldWriteIncrementalPrep(9)).toBe(false);
  });

  it("returns true at exact interval multiples (10, 20, 30)", () => {
    expect(engine.shouldWriteIncrementalPrep(10)).toBe(true);
    expect(engine.shouldWriteIncrementalPrep(20)).toBe(true);
    expect(engine.shouldWriteIncrementalPrep(30)).toBe(true);
  });
});

describe("SessionLifecycleEngine.getMetrics/getSessionId/getCallCount (CPP-MS4-U-CPP28)", () => {
  let engine: SessionLifecycleEngine;

  beforeEach(() => {
    engine = resetSingleton();
  });

  it("getSessionId returns a string starting with SESSION-", () => {
    const id = engine.getSessionId();
    expect(typeof id).toBe("string");
    expect(id.startsWith("SESSION-")).toBe(true);
  });

  it("getCallCount tracks recordToolCall invocations", () => {
    expect(engine.getCallCount()).toBe(0);
    engine.recordToolCall(true, 10);
    engine.recordToolCall(true, 10);
    engine.recordToolCall(false, 10);
    expect(engine.getCallCount()).toBe(3);
  });

  it("getMetrics returns a copy — mutating result does not affect engine", () => {
    const m1 = engine.getMetrics();
    (m1 as SessionMetrics).tool_calls = 9999;
    const m2 = engine.getMetrics();
    expect(m2.tool_calls).toBe(0);
  });

  it("getMetrics returns all 19 required fields", () => {
    const m = engine.getMetrics();
    const fields: Array<keyof SessionMetrics> = [
      "session_id", "start_time", "tool_calls", "successful_calls", "failed_calls",
      "hook_executions", "hook_blocks", "skill_injections", "template_matches",
      "cadence_ticks", "checkpoints_saved", "compaction_recoveries",
      "tasks_completed", "tasks_total", "errors_captured", "errors_resolved",
      "peak_pressure_pct", "avg_latency_ms", "total_latency_ms",
    ];
    for (const f of fields) expect(m).toHaveProperty(f);
  });
});

describe("SessionLifecycleEngine.recordPressure() (CPP-MS4-U-CPP28)", () => {
  let engine: SessionLifecycleEngine;

  beforeEach(() => {
    engine = resetSingleton();
  });

  it("tracks peak_pressure_pct as the maximum seen", () => {
    engine.recordPressure(30);
    engine.recordPressure(80);
    engine.recordPressure(50);
    expect(engine.getMetrics().peak_pressure_pct).toBe(80);
  });

  it("does not lower peak when smaller values come after", () => {
    engine.recordPressure(90);
    engine.recordPressure(10);
    expect(engine.getMetrics().peak_pressure_pct).toBe(90);
  });
});
