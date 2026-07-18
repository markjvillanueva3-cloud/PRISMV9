// node --test scripts/db-toolbelt.test.mjs
// Registry-integrity assertions for the juliett DB/extraction toolbelt launcher.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS } from "./db-toolbelt.mjs";

test("TOOLS — has the canonical juliett categories", () => {
  for (const cat of ["database_builders", "extractors", "batch_books", "enrich", "guards_hooks"]) {
    assert.ok(Array.isArray(TOOLS[cat]) && TOOLS[cat].length > 0, `missing/empty category ${cat}`);
  }
});

test("TOOLS — every tool has id + desc + (run XOR path), no stubs", () => {
  for (const [cat, arr] of Object.entries(TOOLS)) {
    for (const t of arr) {
      assert.ok(t.id, `${cat} entry missing id`);
      assert.ok(t.desc && t.desc.length > 8, `${t.id} missing desc`);
      assert.ok(t.run || t.path, `${t.id} has neither run nor path`);
    }
  }
});

test("TOOLS — ids are globally unique (no collision across categories)", () => {
  const ids = Object.values(TOOLS).flat().map((t) => t.id);
  assert.equal(ids.length, new Set(ids).size, `duplicate tool id: ${ids.filter((x, i) => ids.indexOf(x) !== i).join(",")}`);
});

test("TOOLS — extractors are reused from the router (>=6, incl. the batch books + vision)", () => {
  const ids = TOOLS.extractors.map((t) => t.id);
  assert.ok(TOOLS.extractors.length >= 6);
  assert.ok(ids.includes("camelot-tables") && ids.includes("ollama-vision-ocr") && ids.includes("lima-pypdf-page"));
});

test("TOOLS — guards_hooks are reference-only (path, not run)", () => {
  for (const h of TOOLS.guards_hooks) {
    assert.ok(h.path && !h.run, `${h.id} should be a path-only hook reference`);
  }
});

test("TOOLS — the 3 canonical database builders are present + runnable", () => {
  const ids = TOOLS.database_builders.map((t) => t.id);
  for (const must of ["jm-die-db", "vendor-catalog-db", "monolith-db"]) {
    assert.ok(ids.includes(must), `missing builder ${must}`);
  }
  for (const t of TOOLS.database_builders) assert.match(t.run, /^node |^python /);
});
