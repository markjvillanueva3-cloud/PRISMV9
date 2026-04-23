import { describe, it, expect } from "vitest";
import {
  DistributedCriticalPathEngine,
  distributedCriticalPathEngine,
  type AgentTask,
} from "../engines/DistributedCriticalPathEngine.js";

describe("DistributedCriticalPathEngine", () => {
  it("singleton has matching class name", () => {
    expect(distributedCriticalPathEngine).toBeInstanceOf(DistributedCriticalPathEngine);
    expect(distributedCriticalPathEngine.name).toBe("DistributedCriticalPathEngine");
  });

  it("single-agent chain reduces to CPM semantics", () => {
    const engine = new DistributedCriticalPathEngine();
    const tasks: AgentTask[] = [
      { id: "A", duration: 3, owner: "alice" },
      { id: "B", duration: 4, owner: "alice", predecessors: ["A"] },
    ];
    const r = engine.analyze(tasks);
    expect(r.makespan).toBe(7);
    expect(r.schedule.A.ES).toBe(0);
    expect(r.schedule.B.ES).toBe(3);
  });

  it("two parallel agents with no dependency run concurrently", () => {
    const engine = new DistributedCriticalPathEngine();
    const tasks: AgentTask[] = [
      { id: "A", duration: 5, owner: "alice" },
      { id: "B", duration: 5, owner: "bob" },
    ];
    const r = engine.analyze(tasks);
    expect(r.makespan).toBe(5);
  });

  it("same-agent tasks serialize even without explicit predecessor", () => {
    const engine = new DistributedCriticalPathEngine();
    const tasks: AgentTask[] = [
      { id: "A", duration: 5, owner: "alice" },
      { id: "B", duration: 5, owner: "alice" },
    ];
    const r = engine.analyze(tasks);
    expect(r.makespan).toBe(10);
  });

  it("handoffEdges flags cross-agent transitions correctly", () => {
    const engine = new DistributedCriticalPathEngine();
    const tasks: AgentTask[] = [
      { id: "A", duration: 2, owner: "alice" },
      { id: "B", duration: 3, owner: "bob", predecessors: ["A"] },
      { id: "C", duration: 1, owner: "bob", predecessors: ["B"] },
    ];
    const r = engine.analyze(tasks);
    const aToB = r.handoffEdges.find((e) => e.from === "A" && e.to === "B");
    const bToC = r.handoffEdges.find((e) => e.from === "B" && e.to === "C");
    expect(aToB?.across).toBe(true);
    expect(bToC?.across).toBe(false);
  });

  it("agentLoad sums durations per owner", () => {
    const engine = new DistributedCriticalPathEngine();
    const tasks: AgentTask[] = [
      { id: "A", duration: 2, owner: "alice" },
      { id: "B", duration: 3, owner: "alice" },
      { id: "C", duration: 4, owner: "bob" },
    ];
    const r = engine.analyze(tasks);
    expect(r.agentLoad.alice).toBe(5);
    expect(r.agentLoad.bob).toBe(4);
  });

  it("critical path covers the longest chain", () => {
    const engine = new DistributedCriticalPathEngine();
    const tasks: AgentTask[] = [
      { id: "A", duration: 1, owner: "alice" },
      { id: "B", duration: 5, owner: "alice", predecessors: ["A"] },
      { id: "C", duration: 1, owner: "bob", predecessors: ["A"] },
      { id: "D", duration: 1, owner: "bob", predecessors: ["B", "C"] },
    ];
    const r = engine.analyze(tasks);
    expect(r.criticalPath).toContain("A");
    expect(r.criticalPath).toContain("B");
    expect(r.criticalPath).toContain("D");
  });

  it("FAIL: empty tasks rejected", () => {
    const engine = new DistributedCriticalPathEngine();
    expect(() => engine.analyze([])).toThrow(/non-empty tasks/);
  });

  it("FAIL: missing owner rejected", () => {
    const engine = new DistributedCriticalPathEngine();
    expect(() => engine.analyze([{
      id: "A",
      duration: 1,
      owner: "",
    } as AgentTask])).toThrow(/needs owner/);
  });

  it("FAIL: negative duration rejected", () => {
    const engine = new DistributedCriticalPathEngine();
    expect(() => engine.analyze([{
      id: "A",
      duration: -1,
      owner: "alice",
    }])).toThrow(/finite non-negative duration/);
  });

  it("FAIL: unknown predecessor rejected", () => {
    const engine = new DistributedCriticalPathEngine();
    expect(() => engine.analyze([{
      id: "A",
      duration: 1,
      owner: "alice",
      predecessors: ["ghost"],
    }])).toThrow(/unknown predecessor/);
  });

  it("FAIL: duplicate task id rejected", () => {
    const engine = new DistributedCriticalPathEngine();
    expect(() => engine.analyze([
      { id: "A", duration: 1, owner: "alice" },
      { id: "A", duration: 2, owner: "bob" },
    ])).toThrow(/duplicate id/);
  });

  it("FAIL: cycle rejected", () => {
    const engine = new DistributedCriticalPathEngine();
    expect(() => engine.analyze([
      { id: "A", duration: 1, owner: "alice", predecessors: ["B"] },
      { id: "B", duration: 1, owner: "bob", predecessors: ["A"] },
    ])).toThrow(/cycle detected/);
  });

  it("ADV: bottleneck agent dictates makespan", () => {
    const engine = new DistributedCriticalPathEngine();
    const tasks: AgentTask[] = [];
    for (let i = 0; i < 5; i++) tasks.push({ id: `A${i}`, duration: 2, owner: "alice" });
    tasks.push({ id: "B", duration: 1, owner: "bob" });
    const r = engine.analyze(tasks);
    expect(r.makespan).toBe(10);
  });

  it("ADV: zero-duration task contributes no load", () => {
    const engine = new DistributedCriticalPathEngine();
    const tasks: AgentTask[] = [
      { id: "MARK", duration: 0, owner: "alice" },
      { id: "A", duration: 3, owner: "alice", predecessors: ["MARK"] },
    ];
    const r = engine.analyze(tasks);
    expect(r.makespan).toBe(3);
    expect(r.agentLoad.alice).toBe(3);
  });
});
