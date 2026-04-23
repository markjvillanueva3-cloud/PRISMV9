/**
 * TestResourceRegistryEngine tests
 * P2P-FULLSTACK-MS0 / U-P2PFS58
 */
import { describe, it, expect } from "vitest";
import {
  TestResourceRegistryEngine,
  testResourceRegistryEngine,
  type TestResource,
} from "../../engines/TestResourceRegistryEngine.js";

function freshEngine(): TestResourceRegistryEngine {
  // Use the default seed but a fresh instance per test so mutations
  // don't bleed across cases.
  return new TestResourceRegistryEngine();
}

describe("TestResourceRegistryEngine", () => {
  it("exports a ready-to-use singleton", () => {
    expect(testResourceRegistryEngine).toBeInstanceOf(TestResourceRegistryEngine);
  });

  it("seeds with canonical JM Die fixtures covering 4+ processes", () => {
    const e = freshEngine();
    const stats = e.stats();
    expect(stats.total).toBeGreaterThanOrEqual(8);
    expect(stats.by_process.wire_edm).toBeGreaterThan(0);
    expect(stats.by_process.sinker_edm).toBeGreaterThan(0);
    expect(stats.by_process.lathe).toBeGreaterThan(0);
    expect(stats.by_process.mill).toBeGreaterThan(0);
  });

  it("returns immutable snapshots — mutating list() doesn't affect registry", () => {
    const e = freshEngine();
    const list1 = e.list();
    list1[0].tags.push("mutated");
    list1.pop();
    const list2 = e.list();
    expect(list2.length).toBe(list1.length + 1);
    for (const r of list2) {
      expect(r.tags).not.toContain("mutated");
    }
  });

  it("get(id) returns undefined for unknown id", () => {
    const e = freshEngine();
    expect(e.get("does-not-exist")).toBeUndefined();
  });

  it("register() adds a new resource + can be retrieved by id", () => {
    const e = freshEngine();
    const before = e.stats().total;
    const added = e.register({
      id: "test-registered",
      process: "lathe",
      coverage: "tutorial",
      difficulty: "beginner",
      label: "Custom test",
    });
    expect(added.id).toBe("test-registered");
    expect(e.stats().total).toBe(before + 1);
    expect(e.get("test-registered")?.label).toBe("Custom test");
  });

  it("register() throws on duplicate id", () => {
    const e = freshEngine();
    e.register({
      id: "dup",
      process: "lathe",
      coverage: "tutorial",
      difficulty: "beginner",
      label: "first",
    });
    expect(() =>
      e.register({
        id: "dup",
        process: "lathe",
        coverage: "tutorial",
        difficulty: "beginner",
        label: "second",
      }),
    ).toThrow(/already registered/);
  });

  it("register() throws when id is empty", () => {
    const e = freshEngine();
    expect(() =>
      e.register({
        id: "",
        process: "lathe",
        coverage: "tutorial",
        difficulty: "beginner",
        label: "no id",
      }),
    ).toThrow(/id is required/);
  });

  it("unregister() removes a resource and returns true; false on miss", () => {
    const e = freshEngine();
    const anyId = e.list()[0].id;
    expect(e.unregister(anyId)).toBe(true);
    expect(e.unregister(anyId)).toBe(false); // already gone
    expect(e.get(anyId)).toBeUndefined();
  });

  it("filter by process returns only that process", () => {
    const e = freshEngine();
    const wedmOnly = e.filter({ process: "wire_edm" });
    expect(wedmOnly.length).toBeGreaterThan(0);
    for (const r of wedmOnly) expect(r.process).toBe("wire_edm");
  });

  it("filter by coverage returns only that coverage kind", () => {
    const e = freshEngine();
    const tutorials = e.filter({ coverage: "tutorial" });
    expect(tutorials.length).toBeGreaterThan(0);
    for (const r of tutorials) expect(r.coverage).toBe("tutorial");
  });

  it("filter by customer is case-sensitive + exact-match", () => {
    const e = freshEngine();
    const alcoa = e.filter({ customer: "ALCOA" });
    expect(alcoa.length).toBeGreaterThan(0);
    for (const r of alcoa) expect(r.customer).toBe("ALCOA");
    expect(e.filter({ customer: "alcoa" })).toHaveLength(0);
  });

  it("filter by tag does substring match on tags[]", () => {
    const e = freshEngine();
    const tutorials = e.filter({ tag: "tutorial" });
    expect(tutorials.length).toBeGreaterThan(0);
    for (const r of tutorials) expect(r.tags).toContain("tutorial");
  });

  it("filter.search does case-insensitive substring match on label/customer/tags", () => {
    const e = freshEngine();
    const hex = e.filter({ search: "HEX" });
    expect(hex.length).toBeGreaterThan(0);
  });

  it("filter composes — process + difficulty narrows correctly", () => {
    const e = freshEngine();
    const expertWedm = e.filter({ process: "wire_edm", difficulty: "expert" });
    for (const r of expertWedm) {
      expect(r.process).toBe("wire_edm");
      expect(r.difficulty).toBe("expert");
    }
  });

  it("stats() computes unique customer/material/controller counts", () => {
    const e = freshEngine();
    const s = e.stats();
    expect(s.unique_customers).toBeGreaterThan(0);
    expect(s.unique_materials).toBeGreaterThan(0);
    expect(s.unique_controllers).toBeGreaterThan(0);
    // Sum across process == total
    const sumProcess = Object.values(s.by_process).reduce((a, b) => a + b, 0);
    expect(sumProcess).toBe(s.total);
  });

  it("custom seed overrides the default", () => {
    const custom: TestResource[] = [
      {
        id: "only-one",
        process: "waterjet",
        coverage: "tutorial",
        difficulty: "beginner",
        label: "solo",
        tags: ["solo"],
      },
    ];
    const e = new TestResourceRegistryEngine(custom);
    expect(e.stats().total).toBe(1);
    expect(e.filter({ process: "wire_edm" })).toHaveLength(0);
    expect(e.filter({ process: "waterjet" })).toHaveLength(1);
  });
});
