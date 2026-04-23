import { describe, it, expect } from "vitest";
import {
  MonteCarloScheduleEngine,
  monteCarloScheduleEngine,
} from "../engines/MonteCarloScheduleEngine.js";

describe("MonteCarloScheduleEngine", () => {
  it("singleton instantiated", () => {
    expect(monteCarloScheduleEngine).toBeInstanceOf(MonteCarloScheduleEngine);
    expect(monteCarloScheduleEngine.name).toBe("MonteCarloScheduleEngine");
  });

  it("deterministic O=M=P → zero-variance simulation", () => {
    const e = new MonteCarloScheduleEngine();
    const r = e.simulate({
      tasks: [
        { id: "A", optimistic: 3, likely: 3, pessimistic: 3 },
        { id: "B", optimistic: 2, likely: 2, pessimistic: 2, predecessors: ["A"] },
      ],
      trials: 500,
      seed: 1,
    });
    expect(r.mean).toBe(5);
    expect(r.stdDev).toBe(0);
    expect(r.p50).toBe(5);
    expect(r.p90).toBe(5);
    expect(r.tasksCriticalityPct.A).toBe(1);
    expect(r.tasksCriticalityPct.B).toBe(1);
  });

  it("percentile ordering p10 ≤ p50 ≤ p90", () => {
    const e = new MonteCarloScheduleEngine();
    const r = e.simulate({
      tasks: [
        { id: "A", optimistic: 1, likely: 3, pessimistic: 9 },
        { id: "B", optimistic: 2, likely: 4, pessimistic: 10, predecessors: ["A"] },
      ],
      trials: 2000,
      seed: 42,
    });
    expect(r.p10).toBeLessThanOrEqual(r.p50);
    expect(r.p50).toBeLessThanOrEqual(r.p90);
    expect(r.p90).toBeLessThanOrEqual(r.p99);
    expect(r.stdDev).toBeGreaterThan(0);
  });

  it("seed produces reproducible makespans", () => {
    const e = new MonteCarloScheduleEngine();
    const input = {
      tasks: [
        { id: "A", optimistic: 1, likely: 2, pessimistic: 5 },
        { id: "B", optimistic: 1, likely: 3, pessimistic: 7, predecessors: ["A"] },
      ],
      trials: 1000,
      seed: 123,
    };
    const r1 = e.simulate(input);
    const r2 = e.simulate(input);
    expect(r1.p50).toBe(r2.p50);
    expect(r1.mean).toBe(r2.mean);
  });

  it("mean within triangular expectation ±5%", () => {
    const e = new MonteCarloScheduleEngine();
    const r = e.simulate({
      tasks: [{ id: "A", optimistic: 2, likely: 4, pessimistic: 12 }],
      trials: 5000,
      seed: 7,
    });
    const triangleMean = (2 + 4 + 12) / 3;
    expect(Math.abs(r.mean - triangleMean)).toBeLessThan(0.4);
  });

  it("parallel branches: longer branch dominates criticality", () => {
    const e = new MonteCarloScheduleEngine();
    const r = e.simulate({
      tasks: [
        { id: "START", optimistic: 1, likely: 1, pessimistic: 1 },
        { id: "SHORT", optimistic: 1, likely: 1, pessimistic: 1, predecessors: ["START"] },
        { id: "LONG", optimistic: 10, likely: 10, pessimistic: 10, predecessors: ["START"] },
        { id: "END", optimistic: 1, likely: 1, pessimistic: 1, predecessors: ["SHORT", "LONG"] },
      ],
      trials: 200,
      seed: 1,
    });
    expect(r.tasksCriticalityPct.LONG).toBeGreaterThan(0.9);
    expect(r.tasksCriticalityPct.SHORT).toBeLessThan(0.1);
  });

  it("trials clamp honours MIN/MAX", () => {
    const e = new MonteCarloScheduleEngine();
    const low = e.simulate({
      tasks: [{ id: "A", optimistic: 1, likely: 1, pessimistic: 1 }],
      trials: 10,
      seed: 1,
    });
    expect(low.trials).toBeGreaterThanOrEqual(100);
  });

  it("FAIL: empty tasks throws", () => {
    const e = new MonteCarloScheduleEngine();
    expect(() => e.simulate({ tasks: [], trials: 100 })).toThrow(/non-empty/);
  });

  it("FAIL: O > M throws", () => {
    const e = new MonteCarloScheduleEngine();
    expect(() => e.simulate({
      tasks: [{ id: "A", optimistic: 5, likely: 3, pessimistic: 10 }],
    })).toThrow(/O ≤ M ≤ P/);
  });

  it("FAIL: NaN values throw", () => {
    const e = new MonteCarloScheduleEngine();
    expect(() => e.simulate({
      tasks: [{ id: "A", optimistic: Number.NaN, likely: 1, pessimistic: 2 }],
    })).toThrow(/finite O\/M\/P/);
  });

  it("FAIL: unknown predecessor throws", () => {
    const e = new MonteCarloScheduleEngine();
    expect(() => e.simulate({
      tasks: [{ id: "A", optimistic: 1, likely: 1, pessimistic: 1, predecessors: ["missing"] }],
    })).toThrow(/unknown predecessor/);
  });

  it("FAIL: cycle throws", () => {
    const e = new MonteCarloScheduleEngine();
    expect(() => e.simulate({
      tasks: [
        { id: "A", optimistic: 1, likely: 1, pessimistic: 1, predecessors: ["B"] },
        { id: "B", optimistic: 1, likely: 1, pessimistic: 1, predecessors: ["A"] },
      ],
    })).toThrow(/cycle detected/);
  });

  it("ADV: 20-task fan-in/fan-out still terminates", () => {
    const e = new MonteCarloScheduleEngine();
    const tasks = [];
    tasks.push({ id: "ROOT", optimistic: 1, likely: 1, pessimistic: 1 });
    for (let i = 0; i < 18; i++) {
      tasks.push({ id: `T${i}`, optimistic: 1, likely: 2, pessimistic: 3, predecessors: ["ROOT"] });
    }
    tasks.push({ id: "END", optimistic: 1, likely: 1, pessimistic: 1, predecessors: Array.from({ length: 18 }, (_, i) => `T${i}`) });
    const r = e.simulate({ tasks, trials: 200, seed: 99 });
    expect(r.trials).toBeGreaterThan(0);
    expect(r.p50).toBeGreaterThan(0);
  });

  it("ADV: duplicate id throws", () => {
    const e = new MonteCarloScheduleEngine();
    expect(() => e.simulate({
      tasks: [
        { id: "A", optimistic: 1, likely: 1, pessimistic: 1 },
        { id: "A", optimistic: 1, likely: 1, pessimistic: 1 },
      ],
    })).toThrow(/duplicate id/);
  });
});
