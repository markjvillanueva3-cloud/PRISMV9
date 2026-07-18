/**
 * Tests for emit-brand-catalog-registry-json.mjs (slot:romeo, BRAND-CATALOG-APP-WIRING 2026-06-19).
 * Run: node scripts/emit-brand-catalog-registry-json.test.mjs
 *
 * Hermetic: injects canonical records + writes to an os.tmpdir() shard dir (never the live
 * data/tools). Verifies the emitter contract the ToolRegistry load path depends on.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { emitRegistryJson } from "./emit-brand-catalog-registry-json.mjs";

const RECS = [
  { id: "ACCU-1", brand: "Accupro", category: "drill", type: "drill", diameter_mm: 1.191, geometry_complete: true },
  { id: "ACCU-2", brand: "Accupro", category: "solid_mill", type: "endmill", diameter_mm: 6, num_flutes: 4, geometry_complete: true },
  { id: "ISC-1", brand: "Iscar", category: "insert", type: "insert", diameter_mm: 12.7, coating: "TiAlN", geometry_complete: true },
  { id: "", brand: "BadBrand", category: "drill", diameter_mm: 5 }, // no id -> skipped
];

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "brandcat-emit-"));
}

test("emits one shard per brand with the {category,tools} wrapper ToolRegistry expects", () => {
  const dir = tmpDir();
  try {
    const r = emitRegistryJson({ outDir: dir, records: RECS, stampedAt: "2026-06-19T00:00:00.000Z" });
    assert.equal(r.totalTools, 3, "3 valid tools (the no-id row is skipped)");
    assert.equal(r.skipped, 1);
    assert.equal(r.brands, 2, "Accupro + Iscar");

    const files = fs.readdirSync(dir).sort();
    assert.deepEqual(files, ["brand-catalog__ACCUPRO.json", "brand-catalog__ISCAR.json"]);

    const accu = JSON.parse(fs.readFileSync(path.join(dir, "brand-catalog__ACCUPRO.json"), "utf8"));
    assert.equal(accu.category, "brand-catalog", "wrapper category present (ToolRegistry reads {tools})");
    assert.equal(accu.count, 2);
    assert.equal(accu.tools.length, 2);
    assert.equal(accu.tools[0].id, "BC::ACCUPRO::ACCU-1", "namespaced id");
    assert.equal(accu.tools[0].last_updated, "2026-06-19T00:00:00.000Z", "stamp threaded through");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("re-emit is idempotent and removes stale shards when a brand disappears", () => {
  const dir = tmpDir();
  try {
    emitRegistryJson({ outDir: dir, records: RECS });
    assert.ok(fs.existsSync(path.join(dir, "brand-catalog__ISCAR.json")));
    // second emit without Iscar -> its shard must be cleared (no stale brand lingers)
    const r2 = emitRegistryJson({ outDir: dir, records: RECS.filter((x) => x.brand !== "Iscar") });
    assert.equal(r2.removed, 2, "both prior shards cleared before rewrite");
    assert.ok(!fs.existsSync(path.join(dir, "brand-catalog__ISCAR.json")), "stale Iscar shard gone");
    assert.ok(fs.existsSync(path.join(dir, "brand-catalog__ACCUPRO.json")));
    // emitted JSON is valid + reloadable
    const accu = JSON.parse(fs.readFileSync(path.join(dir, "brand-catalog__ACCUPRO.json"), "utf8"));
    assert.equal(accu.tools.length, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("--dry-run writes nothing but reports the real counts", () => {
  const dir = tmpDir();
  try {
    const r = emitRegistryJson({ outDir: dir, records: RECS, dryRun: true });
    assert.equal(r.totalTools, 3);
    assert.equal(r.brands, 2);
    assert.equal(fs.readdirSync(dir).length, 0, "dry-run must not write");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("implausible-geometry records keep their entry but drop the bogus diameter (surfaced count)", () => {
  const dir = tmpDir();
  try {
    const recs = [
      { id: "OK-1", brand: "YG-1", category: "drill", type: "drill", diameter_mm: 6, geometry_plausible: true },
      { id: "YG1-380", brand: "YG-1", category: "drill", type: "drill", diameter_mm: 380, geometry_plausible: false },
    ];
    const r = emitRegistryJson({ outDir: dir, records: recs });
    assert.equal(r.totalTools, 2); // both kept (catalog listing)
    assert.equal(r.diameterSuppressed, 1); // R12 surfaced
    const yg = JSON.parse(fs.readFileSync(path.join(dir, "brand-catalog__YG_1.json"), "utf8"));
    const bogus = yg.tools.find((t) => t.id === "BC::YG_1::YG1-380");
    const good = yg.tools.find((t) => t.id === "BC::YG_1::OK-1");
    // the bogus 380mm diameter must be ABSENT from the searchable record (key omitted)
    assert.equal(Object.prototype.hasOwnProperty.call(bogus, "cutting_diameter_mm"), false, "implausible diameter key omitted");
    assert.equal(bogus.geometry === undefined || !Object.prototype.hasOwnProperty.call(bogus.geometry, "diameter"), true, "no diameter in geometry");
    assert.equal(bogus.type, "drill"); // entry still listed, type intact
    // the plausible sibling keeps its real diameter (gate is targeted, not blanket)
    assert.equal(good.cutting_diameter_mm, 6);
    assert.equal(good.geometry.diameter, 6);
    // a raw-text scan proves no "380" diameter slipped into the YG-1 shard
    const raw = fs.readFileSync(path.join(dir, "brand-catalog__YG_1.json"), "utf8");
    assert.equal(/"cutting_diameter_mm":380/.test(raw), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("empty / non-array corpus fails loud (never silently emits nothing)", () => {
  const dir = tmpDir();
  try {
    assert.throws(() => emitRegistryJson({ outDir: dir, records: [] }), /returned 0 records/);
    assert.throws(() => emitRegistryJson({ outDir: dir, records: null }), /non-array/);
    assert.equal(fs.readdirSync(dir).length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("emitted tool rows are JSON-finite (no Infinity/NaN diameter leaks)", () => {
  const dir = tmpDir();
  try {
    emitRegistryJson({ outDir: dir, records: [{ id: "X", brand: "Z", category: "drill", diameter_mm: Infinity }] });
    const raw = fs.readFileSync(path.join(dir, "brand-catalog__Z.json"), "utf8");
    assert.ok(!/Infinity|NaN/.test(raw), "no non-finite literals in emitted JSON");
    const parsed = JSON.parse(raw); // would throw on Infinity literal
    assert.equal(parsed.tools[0].cutting_diameter_mm, undefined);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
