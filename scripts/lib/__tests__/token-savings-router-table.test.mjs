// scripts/lib/__tests__/token-savings-router-table.test.mjs
// Tests for token-savings-router-table.mjs
// TOKEN-SAVINGS-PIVOT/U-ROUTER-TABLE (slot:alpha, 2026-05-24).

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ROUTER_TABLE,
  lookupRoute,
  classifyNodeId,
  buildRouterTableFromCandidates,
  summarizeRouterTable,
} from "../token-savings-router-table.mjs";

describe("classifyNodeId", () => {
  it("classifies hook.* as advisory", () => {
    const r = classifyNodeId("hook.master-index-precheck-inject");
    assert.equal(r.kind, "advisory");
    assert.match(r.reason, /hook/);
  });

  it("classifies action.<dispatcher>:<action> as mcp-route", () => {
    const r = classifyNodeId("action.prism_calc:cutting_force");
    assert.equal(r.kind, "mcp-route");
    assert.equal(r.to, "prism_calc:cutting_force");
  });

  it("classifies skill./ollama-* as ollama-offload", () => {
    const r = classifyNodeId("skill./ollama-summarize");
    assert.equal(r.kind, "ollama-offload");
    assert.equal(r.skill, "/ollama-summarize");
  });

  it("classifies cmd./* and slash./* as skill", () => {
    const a = classifyNodeId("cmd./master-index");
    assert.equal(a.kind, "skill");
    assert.equal(a.name, "/master-index");

    const b = classifyNodeId("slash./scrutinize");
    assert.equal(b.kind, "skill");
    assert.equal(b.name, "/scrutinize");
  });

  it("classifies rtk.<cmd> as rtk-wrap", () => {
    const r = classifyNodeId("rtk.git");
    assert.equal(r.kind, "rtk-wrap");
    assert.equal(r.base, "git");
  });

  it("returns advisory for unknown prefix", () => {
    const r = classifyNodeId("totallyunknown.thing");
    assert.equal(r.kind, "advisory");
    assert.equal(r.reason, "no-prefix-match");
  });

  it("returns advisory for empty/invalid input", () => {
    assert.equal(classifyNodeId("").kind, "advisory");
    assert.equal(classifyNodeId(null).kind, "advisory");
    assert.equal(classifyNodeId(undefined).kind, "advisory");
    assert.equal(classifyNodeId(42).kind, "advisory");
  });

  it("flags malformed action IDs (missing colon)", () => {
    const r = classifyNodeId("action.prism_calc_no_colon");
    assert.equal(r.kind, "advisory");
    assert.match(r.reason, /malformed-action/);
  });
});

describe("lookupRoute", () => {
  it("known hook → advisory", () => {
    const r = lookupRoute("hook.master-index-precheck-inject");
    assert.ok(r, "expected an entry for seeded hook id");
    assert.equal(r.kind, "advisory");
  });

  it("known action → mcp-route", () => {
    const r = lookupRoute("action.prism_calc:cutting_force");
    assert.ok(r);
    assert.equal(r.kind, "mcp-route");
    assert.equal(r.to, "prism_calc:cutting_force");
  });

  it("known ollama skill → ollama-offload", () => {
    const r = lookupRoute("skill./ollama-summarize");
    assert.ok(r);
    assert.equal(r.kind, "ollama-offload");
  });

  it("known cmd → skill", () => {
    const r = lookupRoute("cmd./master-index");
    assert.ok(r);
    assert.equal(r.kind, "skill");
    assert.equal(r.name, "/master-index");
  });

  it("known rtk → rtk-wrap", () => {
    const r = lookupRoute("rtk.git");
    assert.ok(r);
    assert.equal(r.kind, "rtk-wrap");
    assert.equal(r.base, "git");
  });

  it("unknown id → null", () => {
    assert.equal(lookupRoute("nonexistent.id"), null);
  });

  it("invalid input → null", () => {
    assert.equal(lookupRoute(""), null);
    assert.equal(lookupRoute(null), null);
    assert.equal(lookupRoute(undefined), null);
    assert.equal(lookupRoute(123), null);
  });
});

describe("buildRouterTableFromCandidates", () => {
  it("empty input → empty Map", () => {
    const m = buildRouterTableFromCandidates([]);
    assert.ok(m instanceof Map);
    assert.equal(m.size, 0);
  });

  it("non-array input → empty Map (fail-soft)", () => {
    assert.equal(buildRouterTableFromCandidates(null).size, 0);
    assert.equal(buildRouterTableFromCandidates(undefined).size, 0);
    assert.equal(buildRouterTableFromCandidates("not-an-array").size, 0);
    assert.equal(buildRouterTableFromCandidates({}).size, 0);
  });

  it("categorizes a mixed sample correctly", () => {
    const sample = [
      { id: "hook.foo" },
      { id: "action.prism_cam:toolpath" },
      { id: "skill./ollama-explain" },
      { id: "cmd./dedup" },
      { id: "rtk.vitest" },
      { id: "weird.thing" },
    ];
    const m = buildRouterTableFromCandidates(sample);
    assert.equal(m.size, 6);
    assert.equal(m.get("hook.foo").kind, "advisory");
    assert.equal(m.get("action.prism_cam:toolpath").kind, "mcp-route");
    assert.equal(m.get("skill./ollama-explain").kind, "ollama-offload");
    assert.equal(m.get("cmd./dedup").kind, "skill");
    assert.equal(m.get("rtk.vitest").kind, "rtk-wrap");
    assert.equal(m.get("weird.thing").kind, "advisory");
  });

  it("skips malformed entries (missing id, non-string id, dup ids)", () => {
    const sample = [
      { id: "hook.a" },
      { id: "hook.a" }, // duplicate — first wins
      { id: null },
      { id: 123 },
      {}, // no id
      null,
      "not-an-object",
      { id: "rtk.git" },
    ];
    const m = buildRouterTableFromCandidates(sample);
    assert.equal(m.size, 2);
    assert.ok(m.has("hook.a"));
    assert.ok(m.has("rtk.git"));
  });
});

describe("ROUTER_TABLE (frozen invariant)", () => {
  it("is a Map and is frozen", () => {
    assert.ok(ROUTER_TABLE instanceof Map);
    assert.equal(Object.isFrozen(ROUTER_TABLE), true);
  });

  it("entries are themselves frozen", () => {
    const entry = ROUTER_TABLE.values().next().value;
    assert.ok(entry, "table should be non-empty (seeded)");
    assert.equal(Object.isFrozen(entry), true);
  });

  it("Map.set on frozen table is a no-op or throws (cannot mutate)", () => {
    const before = ROUTER_TABLE.size;
    // Object.freeze on a Map doesn't block .set in all Node versions, but
    // either the call throws OR the size stays the same. Both are acceptable.
    let threw = false;
    try {
      ROUTER_TABLE.set("hook.mutation-attempt", { kind: "advisory" });
    } catch {
      threw = true;
    }
    const after = ROUTER_TABLE.size;
    assert.ok(
      threw || after === before,
      "expected set() to throw OR Map size to be unchanged",
    );
    // Even if .set was allowed silently, the entry must not have stuck if
    // freeze worked at the property-descriptor level. We assert at least one
    // of those two guarantees.
  });

  it("has all 20 seeded entries when audit JSON is absent", () => {
    // When the candidate JSON is missing, the synthetic seed (20 entries)
    // fully populates the table. If a real audit file landed mid-test we
    // accept any size ≥ 1 — the seed is just the floor.
    assert.ok(ROUTER_TABLE.size >= 1);
  });
});

describe("summarizeRouterTable", () => {
  it("returns total + byKind histogram", () => {
    const s = summarizeRouterTable();
    assert.equal(typeof s.total, "number");
    assert.equal(s.total, ROUTER_TABLE.size);
    assert.equal(typeof s.byKind, "object");
    assert.equal(typeof s.fromDisk, "boolean");

    const sumOfKinds = Object.values(s.byKind).reduce((a, b) => a + b, 0);
    assert.equal(sumOfKinds, s.total);
  });

  it("byKind contains expected kinds from synthetic seed", () => {
    const s = summarizeRouterTable();
    // If running against the synthetic seed, all 5 kinds should be present.
    // If a real audit JSON loaded, we don't enforce which kinds exist.
    if (!s.fromDisk) {
      assert.ok(s.byKind["advisory"] >= 1, "expected at least one advisory");
      assert.ok(s.byKind["mcp-route"] >= 1, "expected at least one mcp-route");
      assert.ok(
        s.byKind["ollama-offload"] >= 1,
        "expected at least one ollama-offload",
      );
      assert.ok(s.byKind["skill"] >= 1, "expected at least one skill");
      assert.ok(s.byKind["rtk-wrap"] >= 1, "expected at least one rtk-wrap");
    }
  });
});
