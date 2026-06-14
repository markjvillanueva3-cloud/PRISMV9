/** HermesFileScopePartitionerEngine tests — HZP02. */
import { describe, it, expect } from "vitest";
import {
  HermesFileScopePartitionerEngine,
  type AgentFileScope,
} from "../engines/HermesFileScopePartitionerEngine.js";

const sc = (agent_id: string, files: string[]): AgentFileScope => ({ agent_id, files });

describe("HermesFileScopePartitionerEngine.partition — happy", () => {
  it("disjoint scopes → safe_to_fanout=true, no conflicts", () => {
    const r = HermesFileScopePartitionerEngine.partition([
      sc("a", ["src/a.ts", "src/b.ts"]),
      sc("b", ["src/c.ts"]),
    ]);
    expect(r.safe_to_fanout).toBe(true);
    expect(r.conflicts).toEqual([]);
    expect(r.exclusive_count).toBe(3);
  });

  it("partition assigns each file to exactly one owner", () => {
    const r = HermesFileScopePartitionerEngine.partition([
      sc("a", ["src/x.ts"]),
      sc("b", ["src/y.ts"]),
    ]);
    expect(r.partition.a).toEqual(["src/x.ts"]);
    expect(r.partition.b).toEqual(["src/y.ts"]);
  });

  it("partition arrays are sorted (deterministic)", () => {
    const r = HermesFileScopePartitionerEngine.partition([
      sc("a", ["src/z.ts", "src/a.ts", "src/m.ts"]),
    ]);
    expect(r.partition.a).toEqual(["src/a.ts", "src/m.ts", "src/z.ts"]);
  });
});

describe("HermesFileScopePartitionerEngine.partition — conflict detection", () => {
  it("overlapping file → conflict + not safe", () => {
    const r = HermesFileScopePartitionerEngine.partition([
      sc("a", ["src/shared.ts"]),
      sc("b", ["src/shared.ts"]),
    ]);
    expect(r.safe_to_fanout).toBe(false);
    expect(r.conflicts.length).toBe(1);
    expect(r.conflicts[0].agents.sort()).toEqual(["a", "b"]);
  });

  it("three-way conflict reports all three agents", () => {
    const r = HermesFileScopePartitionerEngine.partition([
      sc("a", ["x.ts"]),
      sc("b", ["x.ts"]),
      sc("c", ["x.ts"]),
    ]);
    expect(r.conflicts[0].agents.length).toBe(3);
  });

  it("path separator normalization — \\ and / are equivalent", () => {
    const r = HermesFileScopePartitionerEngine.partition([
      sc("a", ["src\\a.ts"]),
      sc("b", ["src/a.ts"]),
    ]);
    expect(r.safe_to_fanout).toBe(false);
  });

  it("./ prefix is stripped before compare", () => {
    const r = HermesFileScopePartitionerEngine.partition([
      sc("a", ["./src/a.ts"]),
      sc("b", ["src/a.ts"]),
    ]);
    expect(r.safe_to_fanout).toBe(false);
  });
});

describe("HermesFileScopePartitionerEngine — validation + render", () => {
  it("empty scopes throws", () => {
    expect(() => HermesFileScopePartitionerEngine.partition([])).toThrow();
  });

  it("non-array throws", () => {
    expect(() => HermesFileScopePartitionerEngine.partition(null as never)).toThrow();
  });

  it("duplicate agent_id throws", () => {
    expect(() => HermesFileScopePartitionerEngine.partition([sc("a", ["x"]), sc("a", ["y"])])).toThrow();
  });

  it("internal-to-scope dup file does not inflate claim list", () => {
    const r = HermesFileScopePartitionerEngine.partition([sc("a", ["x.ts", "x.ts"])]);
    expect(r.exclusive_count).toBe(1);
  });

  it("renderResult shows SAFE tag + counts on disjoint", () => {
    const md = HermesFileScopePartitionerEngine.renderResult(
      HermesFileScopePartitionerEngine.partition([sc("a", ["x.ts"]), sc("b", ["y.ts"])]),
    );
    expect(md.includes("[PARTITION SAFE]")).toBe(true);
    expect(md.includes("agents=2")).toBe(true);
    expect(md.includes("exclusive=2")).toBe(true);
  });

  it("renderResult shows CONTESTED tag on conflict", () => {
    const md = HermesFileScopePartitionerEngine.renderResult(
      HermesFileScopePartitionerEngine.partition([sc("a", ["x.ts"]), sc("b", ["x.ts"])]),
    );
    expect(md.includes("[PARTITION CONTESTED]")).toBe(true);
  });
});
