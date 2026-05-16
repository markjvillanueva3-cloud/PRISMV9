#!/usr/bin/env node
/**
 * regen-dsl-shortcodes.test.mjs — tests for SYSTEM-VIZ-DSL-MS0/U-DSL-EXTEND
 *
 * Hermetic — passes synthetic graph + existing-codes objects directly to the
 * pure exports. Real-value assertions throughout.
 *
 * Run: node --test scripts/regen-dsl-shortcodes.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  assignShortcodes,
  extractNewNamesFromGraph,
  NEW_CATEGORIES,
  DSL_VERSION,
  SHORTCODE_BODY_DIGITS,
  SHORTCODE_CAPACITY_PER_CATEGORY,
} from "./regen-dsl-shortcodes.mjs";

describe("assignShortcodes — pure assignment", () => {
  test("empty input → no codes added, sensible byCategory", () => {
    const r = assignShortcodes({}, { AC: [], SK: [] });
    assert.equal(Object.keys(r.added).length, 0);
    assert.equal(r.preserved, 0);
    assert.equal(r.byCategory.AC.added, 0);
    assert.equal(r.byCategory.SK.added, 0);
  });

  test("preserves existing codes — no reassignment", () => {
    const existing = {
      AC0001: { code: "AC0001", name: "ai_route_mill_pipeline", category: "AC" },
      AC0002: { code: "AC0002", name: "ai_mill_agi_reason", category: "AC" },
    };
    const r = assignShortcodes(existing, { AC: ["ai_route_mill_pipeline", "ai_new_action"] });
    // preserved existing
    assert.equal(r.preserved, 1);
    assert.equal(r.byCategory.AC.preserved, 1);
    assert.equal(r.byCategory.AC.added, 1);
    // new code assigned next available body
    const newCodes = Object.keys(r.added);
    assert.equal(newCodes.length, 1);
    assert.ok(newCodes[0].startsWith("AC"));
    assert.notEqual(newCodes[0], "AC0001");
    assert.notEqual(newCodes[0], "AC0002");
  });

  test("sorted alphabetical assignment (deterministic across runs)", () => {
    const r1 = assignShortcodes({}, { AC: ["zebra", "alpha", "mike"] });
    const r2 = assignShortcodes({}, { AC: ["mike", "zebra", "alpha"] });
    const codes1 = Object.entries(r1.added).map(([c, e]) => [c, e.name]).sort(([a], [b]) => a.localeCompare(b));
    const codes2 = Object.entries(r2.added).map(([c, e]) => [c, e.name]).sort(([a], [b]) => a.localeCompare(b));
    assert.deepEqual(codes1, codes2);
    // alpha gets the lowest code
    const sortedByCode = Object.entries(r1.added).sort(([a], [b]) => a.localeCompare(b));
    assert.equal(sortedByCode[0][1].name, "alpha");
    assert.equal(sortedByCode[1][1].name, "mike");
    assert.equal(sortedByCode[2][1].name, "zebra");
  });

  test("deduplicates names within input batch", () => {
    const r = assignShortcodes({}, { AC: ["dup", "dup", "dup", "unique"] });
    assert.equal(Object.keys(r.added).length, 2);
  });

  test("filters out non-string names + empty strings", () => {
    const r = assignShortcodes({}, { AC: ["valid", null, undefined, "", 42, {}, "another"] });
    assert.equal(Object.keys(r.added).length, 2);
  });

  test("case-insensitive preservation match (same name lowercased)", () => {
    const existing = { AC0001: { code: "AC0001", name: "MyAction", category: "AC" } };
    const r = assignShortcodes(existing, { AC: ["myaction", "MYACTION", "newOne"] });
    // both 'myaction' and 'MYACTION' match existing; only newOne is new
    assert.equal(r.byCategory.AC.added, 1);
    assert.equal(r.byCategory.AC.preserved, 2);
  });

  test("multiple categories independent — no cross-prefix collisions", () => {
    const r = assignShortcodes({}, { AC: ["a"], SK: ["b"], ML: ["c"] });
    const codes = Object.keys(r.added);
    assert.equal(codes.length, 3);
    assert.ok(codes.some((c) => c.startsWith("AC")));
    assert.ok(codes.some((c) => c.startsWith("SK")));
    assert.ok(codes.some((c) => c.startsWith("ML")));
  });

  test("body-digits pads correctly (e.g. 0001 not 1)", () => {
    const r = assignShortcodes({}, { AC: ["a"] });
    const [[code]] = Object.entries(r.added);
    assert.equal(code, "AC0001");
    assert.equal(code.length, "AC".length + 4);
  });

  test("skips gaps — uses next unused body number", () => {
    const existing = {
      AC0001: { code: "AC0001", name: "x", category: "AC" },
      AC0003: { code: "AC0003", name: "y", category: "AC" },
    };
    const r = assignShortcodes(existing, { AC: ["z"] });
    // z should get AC0002 (the gap)
    const newCodes = Object.keys(r.added);
    assert.equal(newCodes[0], "AC0002");
  });

  test("overflow telemetry when bodyDigits exhausted", () => {
    // Force tiny bodyDigits (1) → bodies 1..9 fit (codes start at 1 not 0)
    const names = Array.from({ length: 15 }, (_, i) => `n${i}`);
    const r = assignShortcodes({}, { AC: names }, { bodyDigits: 1 });
    // 9 fit (bodies 1..9) + 6 overflow (10..15 exceed 10^1)
    assert.equal(Object.keys(r.added).length, 9);
    assert.equal(r.overflows.length, 6);
  });
});

describe("extractNewNamesFromGraph — graph parsing", () => {
  test("empty graph → all categories empty", () => {
    const r = extractNewNamesFromGraph({ nodes: [] });
    for (const prefix of Object.keys(NEW_CATEGORIES)) {
      assert.deepEqual(r[prefix], []);
    }
  });

  test("missing nodes → all empty (no throw)", () => {
    const r = extractNewNamesFromGraph({});
    assert.equal(r.AC.length, 0);
  });

  test("matches kind=dispatcher.action → AC bucket", () => {
    const r = extractNewNamesFromGraph({
      nodes: [
        { id: "action.ai_route_mill_pipeline", kind: "dispatcher.action", label: "ai_route_mill_pipeline" },
        { id: "action.foo_bar", kind: "dispatcher.action", label: "foo_bar" },
        { id: "wiki.entry.X", kind: "wiki_entry", label: "X" }, // NOT a match
      ],
    });
    assert.equal(r.AC.length, 2);
    assert.ok(r.AC.includes("ai_route_mill_pipeline"));
    assert.ok(r.AC.includes("foo_bar"));
  });

  test("matches kind=skill → SK bucket; wiki_entry NOT a skill", () => {
    const r = extractNewNamesFromGraph({
      nodes: [
        { id: "skill.checkin", kind: "skill", label: "checkin" },
        { id: "wiki.someskillname", kind: "wiki_entry", label: "someskillname" }, // NOT a skill (per actual graph)
      ],
    });
    assert.equal(r.SK.length, 1);
  });

  test("matches kind=milestone → ML; wiki entries NOT milestones", () => {
    const r = extractNewNamesFromGraph({
      nodes: [
        { id: "milestone.SYSTEM-VIZ-FS-COVERAGE-MS1", kind: "milestone", label: "SYSTEM-VIZ-FS-COVERAGE-MS1" },
        { id: "wiki.some-milestone-name", kind: "wiki_entry", label: "x" }, // NOT
      ],
    });
    assert.equal(r.ML.length, 1);
  });

  test("matches kind=ghost.* → GH bucket (covers ghost.engine, ghost.milestone, etc.)", () => {
    const r = extractNewNamesFromGraph({
      nodes: [
        { id: "ghost.engine.WiringBatch", kind: "ghost.engine", label: "WiringBatchExecutorEngine" },
        { id: "ghost.milestone.X", kind: "ghost.milestone", label: "MilestoneX" },
        { id: "ghost.script.S", kind: "ghost.script", label: "ScriptS" },
      ],
    });
    assert.equal(r.GH.length, 3);
  });

  test("one node → one category (no double-bucketing)", () => {
    const r = extractNewNamesFromGraph({
      nodes: [{ id: "ghost.engine.X", kind: "ghost.engine", label: "X" }],
    });
    const total = Object.values(r).reduce((sum, arr) => sum + arr.length, 0);
    assert.equal(total, 1);
    assert.equal(r.GH.length, 1);
  });

  test("derives name from id when label missing", () => {
    const r = extractNewNamesFromGraph({
      nodes: [{ id: "action.namespace.foo_action", kind: "dispatcher.action" }],
    });
    assert.equal(r.AC.length, 1);
    assert.equal(r.AC[0], "foo_action");
  });

  test("ignores nodes with no name + no id", () => {
    const r = extractNewNamesFromGraph({
      nodes: [{ kind: "ghost.engine" }],
    });
    assert.equal(r.GH.length, 0);
  });
});

describe("constants exposed for callers", () => {
  test("DSL_VERSION semver-shaped", () => {
    assert.match(DSL_VERSION, /^\d+\.\d+\.\d+$/);
  });
  test("body-digits sanity", () => {
    assert.ok(SHORTCODE_BODY_DIGITS >= 2);
    assert.ok(SHORTCODE_BODY_DIGITS <= 6);
  });
  test("capacity matches body-digits^base — 62^4 alphanumeric", () => {
    assert.equal(SHORTCODE_CAPACITY_PER_CATEGORY, Math.pow(62, SHORTCODE_BODY_DIGITS));
  });
  test("NEW_CATEGORIES frozen + has expected prefixes", () => {
    assert.throws(() => { NEW_CATEGORIES.NEW = {}; }); // frozen
    for (const p of ["AC", "SK", "ML", "FM", "GH"]) {
      assert.ok(NEW_CATEGORIES[p], `expected category ${p}`);
      assert.ok(typeof NEW_CATEGORIES[p].label === "string");
      assert.ok(typeof NEW_CATEGORIES[p].nodeMatch === "function");
    }
  });
});

describe("end-to-end — real-shape PRISM graph", () => {
  test("ghost + milestone + action all assigned in one pass", () => {
    const graph = {
      nodes: [
        { id: "ghost.engine.WiringBatch", kind: "ghost.engine", label: "WiringBatchExecutorEngine" },
        { id: "milestone.SYSTEM-VIZ-DSL-MS0", kind: "milestone", label: "SYSTEM-VIZ-DSL-MS0" },
        { id: "action.dsl_lookup", kind: "dispatcher.action", label: "dsl_lookup" },
        { id: "skill.dsl-lookup", kind: "skill", label: "dsl-lookup" },
      ],
    };
    const newNames = extractNewNamesFromGraph(graph);
    const r = assignShortcodes({}, newNames);
    assert.equal(Object.keys(r.added).length, 4);
    // Verify each got a different prefix
    const prefixes = new Set(Object.keys(r.added).map((c) => c.match(/^[A-Z]+/)[0]));
    assert.ok(prefixes.has("GH"));
    assert.ok(prefixes.has("ML"));
    assert.ok(prefixes.has("AC"));
    assert.ok(prefixes.has("SK"));
  });
});
