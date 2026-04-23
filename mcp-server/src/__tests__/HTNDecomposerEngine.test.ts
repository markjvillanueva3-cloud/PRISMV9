import { describe, it, expect } from "vitest";
import {
  HTNDecomposerEngine,
  htnDecomposerEngine,
  type HTNOperator,
  type HTNMethod,
} from "../engines/HTNDecomposerEngine.js";

describe("HTNDecomposerEngine", () => {
  const ops: HTNOperator[] = [
    { name: "open_door", effect: (s) => ({ ...s, door: "open" }) },
    { name: "walk_in", precondition: (s) => s.door === "open", effect: (s) => ({ ...s, at: "inside" }) },
    { name: "pick_up", precondition: (s) => s.at === "inside", effect: (s) => ({ ...s, has: "item" }) },
  ];
  const methods: HTNMethod[] = [
    { task: "fetch_item", subtasks: [{ name: "enter" }, { name: "pick_up" }] },
    { task: "enter", subtasks: [{ name: "open_door" }, { name: "walk_in" }] },
  ];

  it("singleton instantiated", () => {
    expect(htnDecomposerEngine).toBeInstanceOf(HTNDecomposerEngine);
    expect(htnDecomposerEngine.name).toBe("HTNDecomposerEngine");
  });

  it("decomposes compound task into primitive sequence", () => {
    const e = new HTNDecomposerEngine();
    const plan = e.decompose({ name: "fetch_item" }, { at: "outside", door: "closed" }, ops, methods);
    expect(plan.primitiveActions.map((a) => a.name)).toEqual(["open_door", "walk_in", "pick_up"]);
    expect(plan.finalState.has).toBe("item");
    expect(plan.steps).toBe(3);
  });

  it("direct operator executes without method", () => {
    const e = new HTNDecomposerEngine();
    const plan = e.decompose({ name: "open_door" }, { door: "closed" }, ops, methods);
    expect(plan.primitiveActions).toEqual([{ name: "open_door", args: undefined }]);
    expect(plan.finalState.door).toBe("open");
  });

  it("backtracks across multiple methods when first fails condition", () => {
    const e = new HTNDecomposerEngine();
    const alt: HTNMethod[] = [
      { task: "greet", condition: (s) => s.mood === "happy", subtasks: [{ name: "wave" }] },
      { task: "greet", subtasks: [{ name: "nod" }] },
    ];
    const altOps: HTNOperator[] = [
      { name: "wave", effect: (s) => ({ ...s, greeted: "wave" }) },
      { name: "nod", effect: (s) => ({ ...s, greeted: "nod" }) },
    ];
    const plan = e.decompose({ name: "greet" }, { mood: "sad" }, altOps, alt);
    expect(plan.primitiveActions[0].name).toBe("nod");
  });

  it("FAIL: missing operator throws", () => {
    const e = new HTNDecomposerEngine();
    expect(() => e.decompose({ name: "fly" }, {}, ops, methods)).toThrow(/no decomposition|no method\/operator/);
  });

  it("FAIL: precondition violation throws", () => {
    const e = new HTNDecomposerEngine();
    expect(() => e.decompose({ name: "walk_in" }, { door: "closed" }, ops, [])).toThrow(/precondition failed|no decomposition/);
  });

  it("FAIL: invalid goal throws", () => {
    const e = new HTNDecomposerEngine();
    expect(() => e.decompose(null as unknown as { name: string }, {}, ops, methods)).toThrow(/goal\.name required/);
  });

  it("FAIL: non-array operators throws", () => {
    const e = new HTNDecomposerEngine();
    expect(() => e.decompose({ name: "x" }, {}, null as unknown as HTNOperator[], methods))
      .toThrow(/operators array required/);
  });

  it("FAIL: non-array methods throws", () => {
    const e = new HTNDecomposerEngine();
    expect(() => e.decompose({ name: "x" }, {}, ops, null as unknown as HTNMethod[]))
      .toThrow(/methods array required/);
  });

  it("ADV: deep nesting beyond maxDepth is caught", () => {
    const e = new HTNDecomposerEngine();
    const deep: HTNMethod[] = [];
    for (let i = 0; i < 40; i++) deep.push({ task: `t${i}`, subtasks: [{ name: `t${i + 1}` }] });
    deep.push({ task: "t40", subtasks: [{ name: "open_door" }] });
    expect(() => e.decompose({ name: "t0" }, { door: "closed" }, ops, deep))
      .toThrow(/max depth|no decomposition/);
  });

  it("ADV: method ordering preserved", () => {
    const e = new HTNDecomposerEngine();
    const plan = e.decompose({ name: "enter" }, { door: "closed", at: "outside" }, ops, methods);
    expect(plan.primitiveActions.map((a) => a.name)).toEqual(["open_door", "walk_in"]);
  });

  it("ADV: args propagate to operator", () => {
    const e = new HTNDecomposerEngine();
    let seenArgs: unknown;
    const argOps: HTNOperator[] = [{
      name: "log",
      effect: (s, a) => { seenArgs = a; return s; },
    }];
    e.decompose({ name: "log", args: { level: "info" } }, {}, argOps, []);
    expect(seenArgs).toEqual({ level: "info" });
  });
});
