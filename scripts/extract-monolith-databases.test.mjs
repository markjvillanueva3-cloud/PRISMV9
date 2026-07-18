// node --test scripts/extract-monolith-databases.test.mjs
// Real-value assertions on the load-bearing pure functions of the monolith DB extractor.
// Locks the invariants the 3-of-3 reviewers cared about: balanced extraction, comma-repair that
// never corrupts valid string arrays, the case-sensitive store-name capture, the gage-keyword fix,
// and recordCount-reflects-persisted-data.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractLiteral, safeEval, isDataStore, categorize, looksStoreIsh,
  repairSeparators, findRepairEdits,
} from "./extract-monolith-databases.mjs";

// ── extractLiteral — balanced-delimiter scanner ────────────────────────────────
test("extractLiteral — balanced object/array", () => {
  assert.equal(extractLiteral("x = {a:1}", 4), "{a:1}");
  assert.equal(extractLiteral("y = [1,2,3] ;", 4), "[1,2,3]");
});
test("extractLiteral — braces inside strings do not break depth", () => {
  assert.equal(extractLiteral('={a:"}{",b:1}', 1), '{a:"}{",b:1}');
  assert.equal(extractLiteral("={a:'][',b:2}", 1), "{a:'][',b:2}");
});
test("extractLiteral — // and /* */ comments with braces are ignored", () => {
  const src = "={a:1, // }]}\n b:2 /* { */ }";
  assert.equal(safeEval(extractLiteral(src, 1)).recordCount, 2);
});
test("extractLiteral — regex char-class braces do not desync", () => {
  // a regex value /[0-9]{2}/ has [ and { that must NOT count toward depth
  const src = "={pat: /[0-9]{2}/, n: 5}";
  const lit = extractLiteral(src, 1);
  assert.equal(lit, "{pat: /[0-9]{2}/, n: 5}");
});
test("extractLiteral — template ${} interpolation re-enters code mode", () => {
  const src = "={k: `a${ {x:1} }b`, m: 2}";
  assert.equal(extractLiteral(src, 1), "{k: `a${ {x:1} }b`, m: 2}");
});
test("extractLiteral — unbalanced returns null", () => {
  assert.equal(extractLiteral("={a:1", 1), null);
});

// ── isDataStore — admission gate (operator adjacency set) ──────────────────────
test("isDataStore — UPPER_SNAKE and PRISM_ admitted", () => {
  assert.ok(isDataStore("EXOTIC_MATERIALS_DATABASE"));
  assert.ok(isDataStore("PRISM_FUSION_POST_DATABASE"));
});
test("isDataStore — every operator-named adjacency keyword admitted", () => {
  for (const n of ["toolingList", "insertCatalog", "toolHolders", "fixtureData", "workholdingMap",
    "rawStock", "machineSpecs", "spindleData", "coolantList", "lubricantTable", "abrasiveDb",
    "coatingData", "controllerMap", "palletPool", "clampSet"]) {
    assert.ok(isDataStore(n), `expected isDataStore(${n})===true`);
  }
});
test("isDataStore — gage AND gauge both match (prior ga[gu]ge bug)", () => {
  assert.ok(isDataStore("gageBlocks"));
  assert.ok(isDataStore("gaugeData"));
});
test("isDataStore — lowercase non-keyword and too-short rejected", () => {
  assert.equal(isDataStore("config"), false);
  assert.equal(isDataStore("ab"), false);
});

// ── categorize — most-specific-first ───────────────────────────────────────────
test("categorize — adjacency categories route correctly", () => {
  assert.equal(categorize("WORKHOLDING_DATABASE"), "workholding");
  assert.equal(categorize("BIG_DAISHOWA_HOLDER_DATABASE"), "holders");
  assert.equal(categorize("COOLANT_TABLE"), "coolants");
  assert.equal(categorize("EXOTIC_MATERIALS_DATABASE"), "materials");
  assert.equal(categorize("CONSOLIDATED_MACHINES"), "machines");
  assert.equal(categorize("FANUC_CONTROLLER_MAP"), "controllers");
});
test("categorize — plural TOOLS routes to tools; TOOLPATH routes to process", () => {
  assert.equal(categorize("EXTRACTED_DETAILED_TOOLS"), "tools");
  assert.equal(categorize("PRISM_TOOLPATH_STRATEGIES_COMPLETE"), "process");
});

// ── findRepairEdits — single-pass scanner, disjoint edits, string-safe ─────────
test("findRepairEdits — missing comma between objects → one insert, no deletes", () => {
  const { inserts, deletes } = findRepairEdits('[{"a":1}{"b":2}]');
  assert.equal(inserts.length, 1);
  assert.equal(deletes.length, 0);
});
test("findRepairEdits — string array yields NO edits (must not corrupt)", () => {
  const { inserts, deletes } = findRepairEdits('["a","b","c"]');
  assert.equal(inserts.length, 0);
  assert.equal(deletes.length, 0);
});
test("findRepairEdits — commas/brackets inside strings are ignored", () => {
  const { inserts, deletes } = findRepairEdits('{a:"}{",b:"x,,y"}');
  assert.equal(inserts.length, 0);
  assert.equal(deletes.length, 0);
});

// ── repairSeparators — fallback repair, only fixes the broken cases ────────────
test("repairSeparators — inserts missing comma between objects", () => {
  assert.equal(repairSeparators('[{"a":1}{"b":2}]'), '[{"a":1},{"b":2}]');
});
test("repairSeparators — squeezes a double comma", () => {
  assert.equal(repairSeparators("{x:1,,y:2}"), "{x:1,y:2}");
});
test("repairSeparators — drops a leading comma after an opener", () => {
  assert.equal(repairSeparators("{,x:1}"), "{x:1}");
});
test("repairSeparators — valid input returns null (no change)", () => {
  assert.equal(repairSeparators("[1,2,3]"), null);
  assert.equal(repairSeparators('["a","b","c"]'), null);
  assert.equal(repairSeparators("[1,2,]"), null); // trailing comma is legal JS
});

// ── safeEval — eval + recordCount + recovery + fail-loud ───────────────────────
test("safeEval — valid object: ok, recordCount from parsed JSON", () => {
  const r = safeEval('{a:1,b:2,c:3}');
  assert.equal(r.ok, true);
  assert.equal(r.recordCount, 3);
  assert.equal(r.kind, "object");
});
test("safeEval — array recordCount is length", () => {
  const r = safeEval("[10,20,30,40]");
  assert.equal(r.ok, true);
  assert.equal(r.recordCount, 4);
  assert.equal(r.kind, "array");
});
test("safeEval — all-method object serializes empty → recordCount 0 (caller drops)", () => {
  const r = safeEval("{ foo(){ return 1; }, bar() {} }");
  assert.equal(r.ok, true);
  assert.equal(r.recordCount, 0); // functions dropped by JSON.stringify; count reflects persisted data
});
test("safeEval — undefined refs resolve to undefined, not ReferenceError", () => {
  const r = safeEval("{ a: SOME_OTHER_CONST, b: 7 }");
  assert.equal(r.ok, true);
  assert.equal(r.recordCount, 1); // a:undefined dropped on serialize; only b persists
});
test("safeEval — missing-comma array is recovered via repair", () => {
  const r = safeEval('[{"id":1}\n{"id":2}\n{"id":3}]'); // monolith-style: objects with no separating commas
  assert.equal(r.ok, true);
  assert.equal(r.recovered, true);
  assert.equal(r.recordCount, 3);
});
test("safeEval — over-cap literal is skipped loud (not silently dropped)", () => {
  const huge = "{a:[" + "0,".repeat(5_000_000) + "0]}"; // > 8MB
  const r = safeEval(huge);
  assert.equal(r.ok, false);
  assert.match(r.reason, /literal-too-large-skipped/);
});

// ── looksStoreIsh — under-capture audit visibility ─────────────────────────────
test("looksStoreIsh — ALLCAPS and data-suffixed camelCase surface for audit", () => {
  assert.ok(looksStoreIsh("DXFParser"));        // ALLCAPS-ish
  assert.ok(looksStoreIsh("barStockList"));     // data-suffixed camelCase
  assert.equal(looksStoreIsh("tmp"), false);
});
