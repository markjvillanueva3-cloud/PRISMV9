// Tests for scripts/lib/system-viz-type-backfill.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PREFIX_TO_TYPE,
  inferType,
  applyTypeBackfill,
  countTypeCoverage,
} from "./system-viz-type-backfill.mjs";

// -------- PREFIX_TO_TYPE table ----------------------------------------------

test("PREFIX_TO_TYPE: frozen + non-empty + covers top-15 live prefixes", () => {
  assert.ok(Object.isFrozen(PREFIX_TO_TYPE));
  // Live 2026-05-20 system-graph.json top-15 by node count.
  for (const p of [
    "fs",
    "wiki",
    "datacat",
    "vault",
    "disp",
    "ghost",
    "formula",
    "eng",
    "test",
    "extract",
    "schema",
    "ppg",
    "core",
    "reg",
    "git",
  ]) {
    assert.ok(PREFIX_TO_TYPE[p], `prefix '${p}' missing from PREFIX_TO_TYPE`);
    assert.equal(typeof PREFIX_TO_TYPE[p], "string");
    assert.ok(PREFIX_TO_TYPE[p].length > 0);
  }
});

test("PREFIX_TO_TYPE: every value is snake_case (no spaces, no caps)", () => {
  for (const [k, v] of Object.entries(PREFIX_TO_TYPE)) {
    assert.match(v, /^[a-z][a-z0-9_]*$/, `value for '${k}' = ${v} not snake_case`);
  }
});

// -------- inferType ----------------------------------------------------------

test("inferType: mapped prefix returns canonical type", () => {
  assert.deepEqual(inferType({ id: "fs.knowledge/file.md" }), {
    type: "filesystem_leaf",
    prefix: "fs",
    status: "mapped",
  });
  assert.deepEqual(inferType({ id: "eng.someEngine" }), {
    type: "engine",
    prefix: "eng",
    status: "mapped",
  });
});

test("inferType: already-typed node is preserved (status='already-typed')", () => {
  const r = inferType({ id: "eng.foo", type: "engine_special" });
  assert.equal(r.status, "already-typed");
  assert.equal(r.type, "engine_special");
});

test("inferType: empty-string type is treated as untyped (length check)", () => {
  const r = inferType({ id: "eng.foo", type: "" });
  assert.equal(r.status, "mapped");
  assert.equal(r.type, "engine");
});

test("inferType: unknown prefix returns status='unknown', type=null", () => {
  const r = inferType({ id: "weirdo.x" });
  assert.equal(r.status, "unknown");
  assert.equal(r.type, null);
  assert.equal(r.prefix, "weirdo");
});

test("inferType: id without a dot is treated as the entire id being the prefix", () => {
  const r = inferType({ id: "fs" });
  assert.equal(r.status, "mapped");
  assert.equal(r.type, "filesystem_leaf");
});

test("inferType: empty id -> no-id", () => {
  assert.equal(inferType({ id: "" }).status, "no-id");
  assert.equal(inferType({}).status, "no-id");
});

test("inferType: non-object input -> no-id (defensive)", () => {
  assert.equal(inferType(null).status, "no-id");
  assert.equal(inferType(undefined).status, "no-id");
  assert.equal(inferType("eng.foo").status, "no-id");
  assert.equal(inferType(42).status, "no-id");
});

test("inferType: leading dot in id (e.g. '.fs') -> prefix='', status='no-id'", () => {
  const r = inferType({ id: ".fs.foo" });
  assert.equal(r.status, "no-id");
});

// -------- applyTypeBackfill --------------------------------------------------

test("applyTypeBackfill: mutates nodes in-place + counts correctly", () => {
  const g = {
    nodes: [
      { id: "eng.a" },
      { id: "wiki.b" },
      { id: "disp.c", type: "dispatcher_router" }, // already typed
      { id: "eng.d", type: "" }, // empty -> backfill
    ],
  };
  const r = applyTypeBackfill(g);
  assert.equal(r.total, 4);
  assert.equal(r.mapped, 3);
  assert.equal(r.alreadyTyped, 1);
  assert.equal(r.noId, 0);
  assert.equal(r.skippedUnknown, 0);
  assert.equal(r.allowedUnknown, 0);
  assert.equal(g.nodes[0].type, "engine");
  assert.equal(g.nodes[1].type, "wiki_entry");
  assert.equal(g.nodes[2].type, "dispatcher_router"); // preserved
  assert.equal(g.nodes[3].type, "engine");
});

test("applyTypeBackfill: idempotent — running twice yields same counts", () => {
  const g = { nodes: [{ id: "eng.a" }, { id: "wiki.b" }] };
  const r1 = applyTypeBackfill(g);
  const r2 = applyTypeBackfill(g);
  assert.equal(r1.mapped, 2);
  assert.equal(r2.mapped, 0);
  assert.equal(r2.alreadyTyped, 2);
});

test("applyTypeBackfill: onUnknown='throw' (default) — R12 fail-loud", () => {
  const g = { nodes: [{ id: "novel-prefix.x" }] };
  assert.throws(() => applyTypeBackfill(g), /unknown id-prefix 'novel-prefix'/);
});

test("applyTypeBackfill: onUnknown='allow' — types as 'unknown' + accumulates report", () => {
  const g = { nodes: [{ id: "novel-prefix.x" }, { id: "novel-prefix.y" }, { id: "eng.z" }] };
  const r = applyTypeBackfill(g, { onUnknown: "allow" });
  assert.equal(r.allowedUnknown, 2);
  assert.equal(r.mapped, 1);
  assert.equal(r.unknownPrefixes["novel-prefix"], 2);
  assert.equal(g.nodes[0].type, "unknown");
  assert.equal(g.nodes[1].type, "unknown");
  assert.equal(g.nodes[2].type, "engine");
});

test("applyTypeBackfill: onUnknown='skip' — leaves untyped + reports", () => {
  const g = { nodes: [{ id: "novel-prefix.x" }, { id: "eng.y" }] };
  const r = applyTypeBackfill(g, { onUnknown: "skip" });
  assert.equal(r.skippedUnknown, 1);
  assert.equal(r.mapped, 1);
  assert.equal(g.nodes[0].type, undefined); // untouched
  assert.equal(g.nodes[1].type, "engine");
});

test("applyTypeBackfill: invalid onUnknown opt -> throws", () => {
  assert.throws(
    () => applyTypeBackfill({ nodes: [] }, { onUnknown: "bogus" }),
    /onUnknown must be 'throw'\|'allow'\|'skip'/,
  );
});

test("applyTypeBackfill: missing nodes[] -> throws", () => {
  assert.throws(() => applyTypeBackfill({}), /graph.nodes\[\] required/);
  assert.throws(() => applyTypeBackfill(null), /graph.nodes\[\] required/);
  assert.throws(() => applyTypeBackfill({ nodes: "not-array" }), /graph.nodes\[\] required/);
});

test("applyTypeBackfill: typesAddedByPrefix is populated and accurate", () => {
  const g = {
    nodes: [
      { id: "eng.a" },
      { id: "eng.b" },
      { id: "wiki.c" },
    ],
  };
  const r = applyTypeBackfill(g);
  assert.equal(r.typesAddedByPrefix.eng, 2);
  assert.equal(r.typesAddedByPrefix.wiki, 1);
});

test("applyTypeBackfill: empty nodes[] -> all counts zero", () => {
  const r = applyTypeBackfill({ nodes: [] });
  assert.equal(r.total, 0);
  assert.equal(r.mapped, 0);
  assert.equal(r.alreadyTyped, 0);
});

test("applyTypeBackfill: nodes with no id are counted as noId, not crashed", () => {
  const g = { nodes: [{}, { id: "eng.x" }, { foo: "bar" }] };
  const r = applyTypeBackfill(g);
  assert.equal(r.noId, 2);
  assert.equal(r.mapped, 1);
});

// -------- countTypeCoverage --------------------------------------------------

test("countTypeCoverage: pre/post measurement is consistent", () => {
  const g = {
    nodes: [
      { id: "eng.a", type: "engine" },
      { id: "eng.b" },
      { id: "wiki.c", type: "wiki_entry" },
    ],
  };
  const before = countTypeCoverage(g);
  assert.equal(before.total, 3);
  assert.equal(before.typed, 2);
  assert.equal(before.untyped, 1);
  assert.equal(Math.round(before.pctTyped * 10) / 10, 66.7);
  assert.equal(before.byType.engine, 1);
  assert.equal(before.byType.wiki_entry, 1);
  assert.equal(before.untypedByPrefix.eng, 1);

  applyTypeBackfill(g);
  const after = countTypeCoverage(g);
  assert.equal(after.typed, 3);
  assert.equal(after.untyped, 0);
  assert.equal(after.pctTyped, 100);
});

test("countTypeCoverage: empty / null graph -> zero report (no throw)", () => {
  const r1 = countTypeCoverage({ nodes: [] });
  assert.equal(r1.total, 0);
  assert.equal(r1.pctTyped, 0);

  const r2 = countTypeCoverage(null);
  assert.equal(r2.total, 0);
});

test("countTypeCoverage: untypedByPrefix accumulates correctly across many nodes", () => {
  const g = {
    nodes: [
      { id: "fs.a" },
      { id: "fs.b" },
      { id: "fs.c" },
      { id: "wiki.d" },
    ],
  };
  const r = countTypeCoverage(g);
  assert.equal(r.untypedByPrefix.fs, 3);
  assert.equal(r.untypedByPrefix.wiki, 1);
});

// -------- Real-world simulation (mirrors live graph shape) -------------------

test("real-world simulation: mixed live-graph prefixes -> ≥80% typed after one pass", () => {
  const sample = [];
  // Build a 1000-node sample mirroring the live distribution.
  const counts = {
    fs: 560,
    wiki: 95,
    datacat: 90,
    vault: 80,
    disp: 40,
    ghost: 30,
    formula: 25,
    eng: 20,
    test: 15,
    extract: 10,
    schema: 8,
    ppg: 5,
    core: 5,
    reg: 4,
    git: 3,
    "novel-prefix-zz": 10, // 1% unknown (allowed)
  };
  for (const [p, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) sample.push({ id: `${p}.${i}` });
  }
  const g = { nodes: sample };

  const before = countTypeCoverage(g);
  assert.equal(before.pctTyped, 0);

  const r = applyTypeBackfill(g, { onUnknown: "allow" });
  assert.equal(r.unknownPrefixes["novel-prefix-zz"], 10);

  const after = countTypeCoverage(g);
  assert.ok(
    after.pctTyped >= 99, // 990 mapped + 10 typed-as-unknown = 100%; floor at 99 for tolerance
    `expected pctTyped >= 99, got ${after.pctTyped}`,
  );
});
