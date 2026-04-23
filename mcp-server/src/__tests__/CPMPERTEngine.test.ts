import { describe, it, expect } from "vitest";
import { CPMPERTEngine, cpmPertEngine, type CPMTask } from "../engines/CPMPERTEngine.js";

describe("CPMPERTEngine", () => {
  it("singleton instantiated", () => {
    expect(cpmPertEngine).toBeInstanceOf(CPMPERTEngine);
    expect(cpmPertEngine.name).toBe("CPMPERTEngine");
  });

  it("textbook network: A(3) → B(4)→D(2), A→C(5)→D", () => {
    const e = new CPMPERTEngine();
    const tasks: CPMTask[] = [
      { id: "A", duration: 3 },
      { id: "B", duration: 4, predecessors: ["A"] },
      { id: "C", duration: 5, predecessors: ["A"] },
      { id: "D", duration: 2, predecessors: ["B", "C"] },
    ];
    const r = e.analyze(tasks);
    expect(r.projectDuration).toBe(10);
    expect(r.schedule.A.ES).toBe(0);
    expect(r.schedule.A.EF).toBe(3);
    expect(r.schedule.C.EF).toBe(8);
    expect(r.schedule.B.slack).toBe(1);
    expect(r.schedule.A.critical).toBe(true);
    expect(r.schedule.C.critical).toBe(true);
    expect(r.schedule.B.critical).toBe(false);
    expect(r.criticalPath).toEqual(["A", "C", "D"]);
  });

  it("PERT 3-point: expected = (O + 4M + P)/6", () => {
    const e = new CPMPERTEngine();
    const tasks: CPMTask[] = [
      { id: "X", optimistic: 2, likely: 4, pessimistic: 12 },
    ];
    const r = e.analyze(tasks);
    expect(r.schedule.X.expected).toBeCloseTo(5, 3); // (2 + 16 + 12)/6 = 30/6 = 5
    expect(r.schedule.X.variance).toBeCloseTo(((12 - 2) / 6) ** 2, 3);
  });

  it("PERT variance is sum along critical path", () => {
    const e = new CPMPERTEngine();
    const tasks: CPMTask[] = [
      { id: "A", optimistic: 1, likely: 2, pessimistic: 3, duration: 2 },
      { id: "B", optimistic: 2, likely: 4, pessimistic: 6, duration: 4, predecessors: ["A"] },
    ];
    const r = e.analyze(tasks);
    const varA = ((3 - 1) / 6) ** 2;
    const varB = ((6 - 2) / 6) ** 2;
    expect(r.pert.variance).toBeCloseTo(varA + varB, 3);
  });

  it("probabilityByT: at mean ≈ 0.5, well above mean → ≈ 1", () => {
    const e = new CPMPERTEngine();
    const tasks: CPMTask[] = [
      { id: "A", optimistic: 4, likely: 6, pessimistic: 8, duration: 6 },
    ];
    const r = e.analyze(tasks);
    expect(r.pert.probabilityByT(r.pert.expectedDuration)).toBeCloseTo(0.5, 2);
    expect(r.pert.probabilityByT(r.pert.expectedDuration + 10 * r.pert.stdDev)).toBeGreaterThan(0.99);
    expect(r.pert.probabilityByT(r.pert.expectedDuration - 10 * r.pert.stdDev)).toBeLessThan(0.01);
  });

  it("single task: critical path is just that task", () => {
    const e = new CPMPERTEngine();
    const r = e.analyze([{ id: "solo", duration: 7 }]);
    expect(r.criticalPath).toEqual(["solo"]);
    expect(r.projectDuration).toBe(7);
  });

  it("parallel branches: both critical when equal", () => {
    const e = new CPMPERTEngine();
    const r = e.analyze([
      { id: "A", duration: 1 },
      { id: "B", duration: 3, predecessors: ["A"] },
      { id: "C", duration: 3, predecessors: ["A"] },
      { id: "D", duration: 1, predecessors: ["B", "C"] },
    ]);
    expect(r.schedule.B.critical).toBe(true);
    expect(r.schedule.C.critical).toBe(true);
    expect(r.projectDuration).toBe(5);
  });

  it("FAIL: empty tasks throws", () => {
    const e = new CPMPERTEngine();
    expect(() => e.analyze([])).toThrow(/non-empty tasks/);
  });

  it("FAIL: duplicate id throws", () => {
    const e = new CPMPERTEngine();
    expect(() => e.analyze([
      { id: "A", duration: 1 },
      { id: "A", duration: 2 },
    ])).toThrow(/duplicate task id/);
  });

  it("FAIL: unknown predecessor throws", () => {
    const e = new CPMPERTEngine();
    expect(() => e.analyze([{ id: "A", duration: 1, predecessors: ["missing"] }]))
      .toThrow(/unknown predecessor/);
  });

  it("FAIL: cycle throws", () => {
    const e = new CPMPERTEngine();
    expect(() => e.analyze([
      { id: "A", duration: 1, predecessors: ["B"] },
      { id: "B", duration: 1, predecessors: ["A"] },
    ])).toThrow(/cycle detected/);
  });

  it("FAIL: missing task id throws", () => {
    const e = new CPMPERTEngine();
    expect(() => e.analyze([{ duration: 1 } as unknown as CPMTask]))
      .toThrow(/task must have an id/);
  });

  it("ADV: deterministic PERT with zero variance → point mass probability", () => {
    const e = new CPMPERTEngine();
    const r = e.analyze([{ id: "X", duration: 5 }]);
    expect(r.pert.stdDev).toBe(0);
    expect(r.pert.probabilityByT(5)).toBe(1);
    expect(r.pert.probabilityByT(4)).toBe(0);
  });

  it("ADV: 15-task chain", () => {
    const e = new CPMPERTEngine();
    const tasks: CPMTask[] = [];
    for (let i = 0; i < 15; i++) {
      tasks.push({
        id: `T${i}`,
        duration: 1,
        predecessors: i === 0 ? [] : [`T${i - 1}`],
      });
    }
    const r = e.analyze(tasks);
    expect(r.projectDuration).toBe(15);
    expect(r.criticalPath.length).toBe(15);
  });
});
