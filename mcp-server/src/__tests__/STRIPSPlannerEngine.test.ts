import { describe, it, expect } from "vitest";
import {
  STRIPSPlannerEngine,
  stripsPlannerEngine,
  type STRIPSAction,
} from "../engines/STRIPSPlannerEngine.js";

describe("STRIPSPlannerEngine", () => {
  it("singleton instantiated", () => {
    expect(stripsPlannerEngine).toBeInstanceOf(STRIPSPlannerEngine);
    expect(stripsPlannerEngine.name).toBe("STRIPSPlannerEngine");
  });

  it("trivial: goal already satisfied → empty plan", () => {
    const e = new STRIPSPlannerEngine();
    const r = e.plan({ initial: ["at_home"], goal: ["at_home"], actions: [] });
    expect(r.foundGoal).toBe(true);
    expect(r.plan).toEqual([]);
    expect(r.pathCost).toBe(0);
  });

  it("2-step: home → store → work", () => {
    const e = new STRIPSPlannerEngine();
    const actions: STRIPSAction[] = [
      { name: "go_store", preconditions: ["at_home"], add: ["at_store"], delete: ["at_home"] },
      { name: "go_work", preconditions: ["at_store"], add: ["at_work"], delete: ["at_store"] },
    ];
    const r = e.plan({ initial: ["at_home"], goal: ["at_work"], actions });
    expect(r.foundGoal).toBe(true);
    expect(r.plan).toEqual(["go_store", "go_work"]);
    expect(r.pathCost).toBe(2);
  });

  it("finds cheaper path when action costs differ", () => {
    const e = new STRIPSPlannerEngine();
    const actions: STRIPSAction[] = [
      { name: "direct", preconditions: ["a"], add: ["z"], delete: [], cost: 10 },
      { name: "step1", preconditions: ["a"], add: ["b"], delete: [], cost: 1 },
      { name: "step2", preconditions: ["b"], add: ["z"], delete: [], cost: 1 },
    ];
    const r = e.plan({ initial: ["a"], goal: ["z"], actions });
    expect(r.foundGoal).toBe(true);
    expect(r.pathCost).toBe(2);
    expect(r.plan).toEqual(["step1", "step2"]);
  });

  it("blocks-world-like: multi-fact goal", () => {
    const e = new STRIPSPlannerEngine();
    const actions: STRIPSAction[] = [
      { name: "put_a_on_b", preconditions: ["clear_a", "clear_b", "on_table_a"], add: ["on_a_b"], delete: ["on_table_a", "clear_b"] },
      { name: "put_b_on_c", preconditions: ["clear_b", "clear_c", "on_table_b"], add: ["on_b_c"], delete: ["on_table_b", "clear_c"] },
    ];
    const r = e.plan({
      initial: ["clear_a", "clear_b", "clear_c", "on_table_a", "on_table_b", "on_table_c"],
      goal: ["on_a_b", "on_b_c"],
      actions,
    });
    expect(r.foundGoal).toBe(true);
    expect(r.plan).toContain("put_b_on_c");
    expect(r.plan).toContain("put_a_on_b");
  });

  it("returns foundGoal:false when unsolvable", () => {
    const e = new STRIPSPlannerEngine();
    const r = e.plan({
      initial: ["a"],
      goal: ["unreachable"],
      actions: [{ name: "noop", preconditions: ["a"], add: [], delete: [] }],
    });
    expect(r.foundGoal).toBe(false);
    expect(r.plan).toEqual([]);
  });

  it("respects maxNodes bound", () => {
    const e = new STRIPSPlannerEngine();
    const r = e.plan({
      initial: ["a"],
      goal: ["z"],
      actions: [{ name: "spin", preconditions: ["a"], add: ["a"], delete: [] }],
      maxNodes: 5,
    });
    expect(r.foundGoal).toBe(false);
    expect(r.expanded).toBeLessThanOrEqual(5);
  });

  it("FAIL: missing input throws", () => {
    const e = new STRIPSPlannerEngine();
    expect(() => e.plan(null as unknown as { initial: string[]; goal: string[]; actions: STRIPSAction[] }))
      .toThrow(/input required/);
  });

  it("FAIL: non-array initial throws", () => {
    const e = new STRIPSPlannerEngine();
    expect(() => e.plan({
      initial: "bad" as unknown as string[],
      goal: [],
      actions: [],
    })).toThrow(/initial\[\] required/);
  });

  it("FAIL: action missing required fields throws", () => {
    const e = new STRIPSPlannerEngine();
    expect(() => e.plan({
      initial: [],
      goal: [],
      actions: [{ name: "broken" } as unknown as STRIPSAction],
    })).toThrow(/missing preconditions/);
  });

  it("ADV: large-branching still terminates", () => {
    const e = new STRIPSPlannerEngine();
    const actions: STRIPSAction[] = [];
    for (let i = 0; i < 10; i++) {
      actions.push({ name: `noop${i}`, preconditions: ["a"], add: [`f${i}`], delete: [] });
    }
    actions.push({ name: "go", preconditions: ["f5"], add: ["z"], delete: [] });
    const r = e.plan({ initial: ["a"], goal: ["z"], actions });
    expect(r.foundGoal).toBe(true);
    expect(r.plan).toContain("go");
  });

  it("ADV: goal with multiple facts all satisfied in one action", () => {
    const e = new STRIPSPlannerEngine();
    const r = e.plan({
      initial: ["a"],
      goal: ["x", "y"],
      actions: [{ name: "do_both", preconditions: ["a"], add: ["x", "y"], delete: [] }],
    });
    expect(r.foundGoal).toBe(true);
    expect(r.plan).toEqual(["do_both"]);
  });

  it("deterministic: same input produces same plan", () => {
    const e = new STRIPSPlannerEngine();
    const input = {
      initial: ["a"],
      goal: ["c"],
      actions: [
        { name: "ab", preconditions: ["a"], add: ["b"], delete: [] },
        { name: "bc", preconditions: ["b"], add: ["c"], delete: [] },
      ],
    };
    const r1 = e.plan(input);
    const r2 = e.plan(input);
    expect(r1.plan).toEqual(r2.plan);
  });
});
