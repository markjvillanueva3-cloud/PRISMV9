/**
 * databases-to-vault.test.mjs -- registry + count-resolver + note-builder + the wire.
 *
 * Covers: registry integrity (all 8 operator-named DBs present, no dup ids), the pure
 * resolveCount over hermetic fixtures (every count type + fail-soft), buildNote output
 * shape, AND a REAL-DATA oracle that resolves the live vendor + jm-die manifests so the
 * registry's count specs can't silently drift from the actual store schemas (the
 * "hermetic fakes don't prove wiring" lesson).
 *
 * @milestone DATABASE-VAULT-BRIDGE  @unit U-DB-VAULT  slot:papa
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DATABASES, resolveCount, validateRegistry, REPO_ROOT } from "./lib/database-registry.mjs";
import { buildNote } from "./databases-to-vault.mjs";

// ── registry integrity ──────────────────────────────────────────────────────
test("registry validates clean (no dup ids, all required fields)", () => {
  assert.deepEqual(validateRegistry(), []);
});

test("all 8 operator-named databases are present", () => {
  const ids = new Set(DATABASES.map((d) => d.id));
  for (const want of ["machines", "tools", "materials", "tooling", "vendors", "potential-customers", "jm-die-data", "fixtures"]) {
    assert.ok(ids.has(want), `missing database: ${want}`);
  }
  assert.equal(DATABASES.length, 8, "exactly the 8 named databases");
});

test("potential-customers is honestly flagged as a GAP (R12, not faked)", () => {
  const pc = DATABASES.find((d) => d.id === "potential-customers");
  assert.equal(pc.gap, true);
  assert.equal(pc.count.type, "gap");
  const r = resolveCount(pc.count);
  assert.equal(r.count, null);
  assert.match(r.detail, /GAP/);
});

// ── resolveCount over hermetic fixtures ─────────────────────────────────────
function withFixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "db-vault-"));
  try { return fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test("resolveCount manifest-category reads byCategory.<cat>.records", () => {
  withFixture((dir) => {
    fs.writeFileSync(path.join(dir, "m.json"), JSON.stringify({ byCategory: { materials: { records: 1980 }, tools: { records: 956 } } }));
    const r = resolveCount({ type: "manifest-category", manifest: "m.json", category: "materials", field: "records" }, dir);
    assert.equal(r.count, 1980);
  });
});

test("resolveCount manifest-category-sum sums multiple categories", () => {
  withFixture((dir) => {
    fs.writeFileSync(path.join(dir, "m.json"), JSON.stringify({ byCategory: { holders: { records: 180 }, inserts: { records: 45 } } }));
    const r = resolveCount({ type: "manifest-category-sum", manifest: "m.json", categories: ["holders", "inserts"], field: "records" }, dir);
    assert.equal(r.count, 225);
  });
});

test("resolveCount manifest-path reads a dot-path", () => {
  withFixture((dir) => {
    fs.writeFileSync(path.join(dir, "m.json"), JSON.stringify({ counts: { vendors: 482 }, corpus: { indexed_documents: 111745 } }));
    assert.equal(resolveCount({ type: "manifest-path", manifest: "m.json", path: "counts.vendors" }, dir).count, 482);
    assert.equal(resolveCount({ type: "manifest-path", manifest: "m.json", path: "corpus.indexed_documents" }, dir).count, 111745);
  });
});

test("resolveCount jsonl-lines counts non-empty lines", () => {
  withFixture((dir) => {
    fs.writeFileSync(path.join(dir, "t.jsonl"), '{"a":1}\n{"b":2}\n\n{"c":3}\n');
    assert.equal(resolveCount({ type: "jsonl-lines", file: "t.jsonl" }, dir).count, 3);
  });
});

test("resolveCount json-array returns array length at a path", () => {
  withFixture((dir) => {
    fs.writeFileSync(path.join(dir, "a.json"), JSON.stringify({ rows: [1, 2, 3, 4] }));
    assert.equal(resolveCount({ type: "json-array", file: "a.json", path: "rows" }, dir).count, 4);
  });
});

test("resolveCount is fail-soft: missing manifest -> null, never throws", () => {
  withFixture((dir) => {
    const r = resolveCount({ type: "manifest-category", manifest: "nope.json", category: "x" }, dir);
    assert.equal(r.count, null);
    assert.match(r.detail, /unreadable/);
  });
});

test("resolveCount fail-soft: category absent in manifest -> null", () => {
  withFixture((dir) => {
    fs.writeFileSync(path.join(dir, "m.json"), JSON.stringify({ byCategory: { other: { records: 5 } } }));
    const r = resolveCount({ type: "manifest-category", manifest: "m.json", category: "ghost" }, dir);
    assert.equal(r.count, null);
    assert.match(r.detail, /absent/);
  });
});

// ── buildNote output shape ──────────────────────────────────────────────────
test("buildNote emits vault frontmatter + count + schema + query hint", () => {
  const db = DATABASES.find((d) => d.id === "materials");
  const note = buildNote(db, { count: 1980, detail: "byCategory.materials.records" }, "2026-06-14T00:00:00.000Z");
  assert.match(note, /^---\nname: reference_db_materials\n/);
  assert.match(note, /type: reference/);
  assert.match(note, /1,980/); // toLocaleString
  assert.match(note, /## How to query it/);
  assert.match(note, /status: \*\*connected\*\*/);
});

test("buildNote marks a GAP database honestly", () => {
  const pc = DATABASES.find((d) => d.id === "potential-customers");
  const note = buildNote(pc, resolveCount(pc.count), "2026-06-14T00:00:00.000Z");
  assert.match(note, /status: \*\*GAP -- store not yet built\*\*/);
  assert.match(note, /count unavailable/);
});

// ── REAL-DATA oracle: registry count specs match the LIVE manifests ─────────
// Guards against the registry drifting from the actual store schema (counts move,
// keys get renamed). Skips gracefully if a store isn't present in this worktree.
test("REAL: vendors count resolves from the live vendor-catalog-db manifest", () => {
  const vendors = DATABASES.find((d) => d.id === "vendors");
  const manifestAbs = path.join(REPO_ROOT, vendors.count.manifest);
  if (!fs.existsSync(manifestAbs)) { return; } // store absent in this tree -> skip
  const r = resolveCount(vendors.count);
  assert.equal(typeof r.count, "number", "vendors count must resolve to a number against the live manifest");
  assert.ok(r.count > 0, "vendors count must be > 0");
});

test("REAL: jm-die-data count resolves from the live jm-die-database manifest", () => {
  const jm = DATABASES.find((d) => d.id === "jm-die-data");
  const manifestAbs = path.join(REPO_ROOT, jm.count.manifest);
  if (!fs.existsSync(manifestAbs)) { return; }
  const r = resolveCount(jm.count);
  assert.equal(typeof r.count, "number");
  assert.ok(r.count > 1000, "jm-die indexed_documents must be a large number");
});

test("REAL: prism-reference-db categories (machines/materials/tools/workholding) resolve", () => {
  const manifestAbs = path.join(REPO_ROOT, "mcp-server/data/prism-reference-db/MANIFEST.json");
  if (!fs.existsSync(manifestAbs)) { return; }
  for (const id of ["machines", "materials", "tools", "fixtures"]) {
    const db = DATABASES.find((d) => d.id === id);
    const r = resolveCount(db.count);
    assert.equal(typeof r.count, "number", `${id} count must resolve from the live reference-db manifest`);
  }
});
