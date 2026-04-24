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

  describe("hydrateFromJSONL", () => {
    it("hydrates valid JSONL into the ledger", () => {
      const ledger = new CoordinationLedgerEngine();
      const lines = [
        JSON.stringify({ id: "a", agent: "Claude", kind: "claim", target: "foo.ts", at: 1000 }),
        JSON.stringify({ id: "b", agent: "Codex", kind: "claim", target: "foo.ts", at: 1500 }),
      ];
      const result = ledger.hydrateFromJSONL(lines);
      expect(result.hydrated).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toEqual([]);
      expect(ledger.count()).toBe(2);
      expect(ledger.byTarget("foo.ts").length).toBe(2);
    });

    it("preserves supplied ids; synthesizes when missing", () => {
      const ledger = new CoordinationLedgerEngine();
      ledger.hydrateFromJSONL([
        JSON.stringify({ id: "keep-me", agent: "A", kind: "claim", target: "x", at: 100 }),
        JSON.stringify({ agent: "B", kind: "claim", target: "y", at: 200 }),
      ]);
      const ids = ledger.byAgent("A").map((e) => e.id).concat(ledger.byAgent("B").map((e) => e.id));
      expect(ids).toContain("keep-me");
      const synthesized = ledger.byAgent("B")[0].id;
      expect(synthesized).toMatch(/^evt-200-\d+$/);
    });

    it("skips blank lines without erroring", () => {
      const ledger = new CoordinationLedgerEngine();
      const result = ledger.hydrateFromJSONL(["", "  ", "\t"]);
      expect(result.hydrated).toBe(0);
      expect(result.skipped).toBe(3);
      expect(result.errors).toEqual([]);
    });

    it("FAIL: records malformed lines as errors without throwing", () => {
      const ledger = new CoordinationLedgerEngine();
      const result = ledger.hydrateFromJSONL([
        "not-json",
        JSON.stringify({ kind: "claim", target: "x", at: 1 }),          // missing agent
        JSON.stringify({ agent: "A", kind: "claim", at: 1 }),            // missing target
        JSON.stringify({ agent: "A", target: "x", at: 1 }),              // missing kind
        JSON.stringify({ agent: "A", kind: "claim", target: "ok", at: 5 }), // valid
      ]);
      expect(result.hydrated).toBe(1);
      expect(result.errors.length).toBe(4);
      expect(result.errors.map((e) => e.reason)).toContain("missing agent");
      expect(result.errors.map((e) => e.reason)).toContain("missing target");
      expect(result.errors.map((e) => e.reason)).toContain("missing kind");
    });

    it("ADV: trims to maxEvents on oversize hydration", () => {
      const ledger = new CoordinationLedgerEngine(10);
      const lines = Array.from({ length: 25 }, (_, i) =>
        JSON.stringify({ agent: "A", kind: "note", target: `t${i}`, at: 1000 + i })
      );
      ledger.hydrateFromJSONL(lines);
      expect(ledger.count()).toBe(10);
      // Most recent 10 retained (timestamps 1015..1024)
      const targets = ledger.byAgent("A").map((e) => e.target).sort();
      expect(targets).toContain("t24");
      expect(targets).not.toContain("t0");
    });

    it("ADV: sorts events chronologically even when lines arrive out of order", () => {
      const ledger = new CoordinationLedgerEngine();
      ledger.hydrateFromJSONL([
        JSON.stringify({ agent: "A", kind: "claim", target: "x", at: 3000 }),
        JSON.stringify({ agent: "A", kind: "claim", target: "x", at: 1000 }),
        JSON.stringify({ agent: "A", kind: "claim", target: "x", at: 2000 }),
      ]);
      const ats = ledger.byAgent("A").map((e) => e.at);
      expect(ats).toEqual([1000, 2000, 3000]);
    });

    it("ADV: hydrated state drives detectConflicts", () => {
      const ledger = new CoordinationLedgerEngine();
      ledger.hydrateFromJSONL([
        JSON.stringify({ agent: "Claude", kind: "claim", target: "hot.ts", at: 1000 }),
        JSON.stringify({ agent: "Codex",  kind: "claim", target: "hot.ts", at: 1500 }),
      ]);
      const conflicts = ledger.detectConflicts(30_000);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].target).toBe("hot.ts");
    });
  });

  describe("toJSONL", () => {
    it("round-trips through hydrateFromJSONL", () => {
      const ledger = new CoordinationLedgerEngine();
      ledger.record({ agent: "A", kind: "claim", target: "x", at: 1000 });
      ledger.record({ agent: "B", kind: "claim", target: "x", at: 2000 });
      const jsonl = ledger.toJSONL();
      const lines = jsonl.split("\n");
      expect(lines.length).toBe(2);

      const round = new CoordinationLedgerEngine();
      const result = round.hydrateFromJSONL(lines);
      expect(result.hydrated).toBe(2);
      expect(round.count()).toBe(2);
      expect(round.byTarget("x").length).toBe(2);
    });

    it("emits chronologically sorted events", () => {
      const ledger = new CoordinationLedgerEngine();
      ledger.record({ agent: "A", kind: "claim", target: "x", at: 3000 });
      ledger.record({ agent: "A", kind: "claim", target: "x", at: 1000 });
      ledger.record({ agent: "A", kind: "claim", target: "x", at: 2000 });
      const lines = ledger.toJSONL().split("\n").map((l) => JSON.parse(l));
      expect(lines.map((l) => l.at)).toEqual([1000, 2000, 3000]);
    });

    it("returns empty string for empty ledger", () => {
      const ledger = new CoordinationLedgerEngine();
      expect(ledger.toJSONL()).toBe("");
    });
  });
});
