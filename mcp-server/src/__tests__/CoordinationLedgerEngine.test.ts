import { describe, it, expect } from "vitest";
import {
  CoordinationLedgerEngine,
  coordinationLedgerEngine,
} from "../engines/CoordinationLedgerEngine.js";

describe("CoordinationLedgerEngine", () => {
  it("singleton has matching class name", () => {
    expect(coordinationLedgerEngine).toBeInstanceOf(CoordinationLedgerEngine);
    expect(coordinationLedgerEngine.name).toBe("CoordinationLedgerEngine");
  });

  it("record returns an event with id and timestamp", () => {
    const ledger = new CoordinationLedgerEngine();
    const ev = ledger.record({ agent: "A", kind: "claim", target: "file.ts" });
    expect(ev.id).toMatch(/^evt-\d+-1$/);
    expect(ev.at).toBeGreaterThan(0);
    expect(ev.agent).toBe("A");
  });

  it("count increases as events are recorded", () => {
    const ledger = new CoordinationLedgerEngine();
    ledger.record({ agent: "A", kind: "claim", target: "x" });
    ledger.record({ agent: "B", kind: "claim", target: "y" });
    expect(ledger.count()).toBe(2);
  });

  it("since returns only events at or after the threshold", () => {
    const ledger = new CoordinationLedgerEngine();
    ledger.record({ agent: "A", kind: "claim", target: "a", at: 100 });
    ledger.record({ agent: "B", kind: "claim", target: "b", at: 200 });
    const recent = ledger.since(150);
    expect(recent.length).toBe(1);
    expect(recent[0].target).toBe("b");
  });

  it("byAgent filters correctly", () => {
    const ledger = new CoordinationLedgerEngine();
    ledger.record({ agent: "A", kind: "claim", target: "x" });
    ledger.record({ agent: "B", kind: "claim", target: "y" });
    ledger.record({ agent: "A", kind: "release", target: "x" });
    expect(ledger.byAgent("A").length).toBe(2);
    expect(ledger.byAgent("B").length).toBe(1);
  });

  it("byTarget filters correctly", () => {
    const ledger = new CoordinationLedgerEngine();
    ledger.record({ agent: "A", kind: "claim", target: "shared" });
    ledger.record({ agent: "B", kind: "claim", target: "shared" });
    ledger.record({ agent: "A", kind: "edit_start", target: "other" });
    expect(ledger.byTarget("shared").length).toBe(2);
    expect(ledger.byTarget("other").length).toBe(1);
  });

  it("detectConflicts flags overlapping claims from different agents", () => {
    const ledger = new CoordinationLedgerEngine();
    ledger.record({ agent: "A", kind: "claim", target: "contested", at: 1000 });
    ledger.record({ agent: "B", kind: "claim", target: "contested", at: 1500 });
    const conflicts = ledger.detectConflicts(30_000);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].target).toBe("contested");
    expect(conflicts[0].agents.sort()).toEqual(["A", "B"]);
  });

  it("detectConflicts ignores claims when first agent released before second claimed", () => {
    const ledger = new CoordinationLedgerEngine();
    ledger.record({ agent: "A", kind: "claim", target: "shared", at: 1000 });
    ledger.record({ agent: "A", kind: "release", target: "shared", at: 2000 });
    ledger.record({ agent: "B", kind: "claim", target: "shared", at: 3000 });
    const conflicts = ledger.detectConflicts(30_000);
    expect(conflicts.length).toBe(0);
  });

  it("reset clears the ledger", () => {
    const ledger = new CoordinationLedgerEngine();
    ledger.record({ agent: "A", kind: "claim", target: "x" });
    ledger.reset();
    expect(ledger.count()).toBe(0);
  });

  it("FAIL: constructor rejects tiny maxEvents", () => {
    expect(() => new CoordinationLedgerEngine(5)).toThrow(/maxEvents must be >= 10/);
  });

  it("FAIL: record without agent throws", () => {
    const ledger = new CoordinationLedgerEngine();
    expect(() => ledger.record({ agent: "", kind: "claim", target: "x" })).toThrow(/agent required/);
  });

  it("FAIL: record without target throws", () => {
    const ledger = new CoordinationLedgerEngine();
    expect(() => ledger.record({ agent: "A", kind: "claim", target: "" })).toThrow(/target required/);
  });

  it("ADV: ledger respects maxEvents by evicting oldest", () => {
    const ledger = new CoordinationLedgerEngine(10);
    for (let i = 0; i < 15; i++) {
      ledger.record({ agent: "A", kind: "note", target: `t${i}` });
    }
    expect(ledger.count()).toBe(10);
    const earliest = ledger.byAgent("A")[0];
    expect(earliest.target).not.toBe("t0");
  });

  it("ADV: event ids are unique across rapid writes", () => {
    const ledger = new CoordinationLedgerEngine();
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(ledger.record({ agent: "A", kind: "note", target: "x" }).id);
    }
    expect(ids.size).toBe(50);
  });
});
