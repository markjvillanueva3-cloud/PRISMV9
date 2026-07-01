/**
 * quoting-docustrata-sample — iter27 contract test for the sample fixture.
 *
 * Validates state/shared/quoting/docustrata-revenues.sample.json against the
 * iter19 validator + iter18 bridge. Catches drift between the published sample
 * (which operators copy-paste) and the actual validator contract.
 *
 * Run: node --test scripts/quoting-docustrata-sample.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-SAMPLE (charlie /goal-yolo iter27)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateDocustrataPayload,
  SUPPORTED_SCHEMA_VERSIONS,
  REVENUE_BOUNDS,
} from "./quoting-docustrata-format.mjs";
import { mergeDocustrataRevenue, buildRevenueKey } from "./quoting-docustrata-bridge.mjs";

const __filename = fileURLToPath(import.meta.url);
const SAMPLE_PATH = resolve(dirname(__filename), "..", "state", "shared", "quoting", "docustrata-revenues.sample.json");
const SAMPLE = JSON.parse(readFileSync(SAMPLE_PATH, "utf-8"));

// ---------- File parses + has expected top-level shape ----------

test("sample: parses as JSON object", () => {
  assert.equal(typeof SAMPLE, "object");
  assert.ok(SAMPLE !== null);
  assert.ok(!Array.isArray(SAMPLE));
});

test("sample: has schema_version in SUPPORTED set", () => {
  assert.ok(SUPPORTED_SCHEMA_VERSIONS.has(SAMPLE.schema_version), `schema_version ${SAMPLE.schema_version} not supported`);
});

test("sample: declares source field for audit", () => {
  assert.equal(typeof SAMPLE.source, "string");
  assert.ok(SAMPLE.source.length > 0);
});

test("sample: declares generated_iso for freshness check", () => {
  assert.equal(typeof SAMPLE.generated_iso, "string");
  // Must be ISO-8601 parseable
  const t = new Date(SAMPLE.generated_iso).getTime();
  assert.ok(Number.isFinite(t), "generated_iso must parse as Date");
});

test("sample: has records[] with >= 5 entries (variability floor)", () => {
  assert.ok(Array.isArray(SAMPLE.records));
  assert.ok(SAMPLE.records.length >= 5, `expected >=5 sample records, got ${SAMPLE.records.length}`);
});

// ---------- iter19 validator PASSES the sample ----------

test("sample: iter19 validateDocustrataPayload returns valid=true", () => {
  const r = validateDocustrataPayload(SAMPLE);
  assert.equal(r.valid, true, `validator rejected sample. errors: ${r.errors.join("; ")}`);
});

test("sample: normalized Map has one entry per record", () => {
  const r = validateDocustrataPayload(SAMPLE);
  assert.equal(r.normalized.size, SAMPLE.records.length, "every record should produce a unique normalized key");
});

test("sample: every revenue is within REVENUE_BOUNDS", () => {
  for (const rec of SAMPLE.records) {
    assert.ok(rec.revenue >= REVENUE_BOUNDS.min, `${rec.customer}|${rec.part_id} revenue ${rec.revenue} below min ${REVENUE_BOUNDS.min}`);
    assert.ok(rec.revenue <= REVENUE_BOUNDS.max, `${rec.customer}|${rec.part_id} revenue ${rec.revenue} above max ${REVENUE_BOUNDS.max}`);
  }
});

// ---------- Variability: spans multiple machine classes (per _doc_hint convention) ----------

test("sample: customer diversity — >=4 distinct customers", () => {
  const customers = new Set(SAMPLE.records.map(r => r.customer));
  assert.ok(customers.size >= 4, `expected >=4 distinct customers, got ${customers.size}`);
});

test("sample: revenue spread — max/min >= 5x (realistic shop range)", () => {
  const revenues = SAMPLE.records.map(r => r.revenue);
  const min = Math.min(...revenues);
  const max = Math.max(...revenues);
  assert.ok(max / min >= 5, `expected >=5x revenue spread for realistic shop variability, got ${(max / min).toFixed(2)}x`);
});

// ---------- Extra fields (like _doc_hint) are TOLERATED ----------

test("sample: _doc_hint extra field doesn't fail validation", () => {
  // _doc_hint is an operator-readability annotation. The validator must ignore
  // unknown fields per the iter19 contract.
  const sampleWithHints = SAMPLE.records.filter(r => "_doc_hint" in r);
  assert.ok(sampleWithHints.length > 0, "sample should demonstrate extra-field tolerance");
  const r = validateDocustrataPayload(SAMPLE);
  assert.equal(r.valid, true, "extra fields must not break validation");
});

// ---------- Integration: sample feeds iter18 bridge end-to-end ----------

test("sample: validator -> bridge full chain matches matching baseline", () => {
  // Build a baseline with the SAME (customer, part_id) tuples as the sample
  const baseline = SAMPLE.records.map(r => ({
    customer: r.customer,
    part_id: r.part_id,
    actual_revenue_usd: 10, // stub
    estimated_time_in_cut_s: 1800,
    machine_rate_usd_per_hr: 95,
    estimated_material_spend_usd: 50,
    machine_class: "mill",
  }));

  const v = validateDocustrataPayload(SAMPLE);
  assert.equal(v.valid, true);

  const { records: merged, report } = mergeDocustrataRevenue(baseline, v.normalized);
  assert.equal(report.matched, baseline.length, "all baseline records must match (we built them to match)");
  assert.equal(report.unmatched, 0);
  for (const m of merged) {
    assert.equal(m.revenue_source, "docustrata");
    assert.ok(m.actual_revenue_usd > 10, "override must replace stub");
  }
});

// ---------- Key shape contract (uppercase-pipe-delimited) ----------

test("sample: every (customer, part_id) tuple produces a valid revenue key", () => {
  for (const rec of SAMPLE.records) {
    const k = buildRevenueKey(rec.customer, rec.part_id);
    assert.notEqual(k, null, `${rec.customer}|${rec.part_id} must produce a valid key`);
    assert.ok(/^[A-Z0-9_\-. ]+\|[A-Z0-9_\-. ]+$/i.test(k), `key ${k} matches expected shape`);
  }
});

// ---------- No duplicate (customer, part_id) entries (data hygiene) ----------

test("sample: no duplicate (customer, part_id) tuples", () => {
  const seen = new Set();
  for (const rec of SAMPLE.records) {
    const k = `${rec.customer}|${rec.part_id}`;
    assert.ok(!seen.has(k), `duplicate key ${k}`);
    seen.add(k);
  }
});

// ---------- Revenues are NUMBERS not strings (common data-corruption mode) ----------

test("sample: every revenue field is a finite number", () => {
  for (const rec of SAMPLE.records) {
    assert.equal(typeof rec.revenue, "number", `${rec.customer}|${rec.part_id} revenue must be number not string`);
    assert.ok(Number.isFinite(rec.revenue));
  }
});

// ---------- ALCOA appears twice (top-customer-count case) ----------

test("sample: includes a customer with multiple parts (realistic top-customer case)", () => {
  const counts = new Map();
  for (const rec of SAMPLE.records) {
    counts.set(rec.customer, (counts.get(rec.customer) ?? 0) + 1);
  }
  const maxCount = Math.max(...counts.values());
  assert.ok(maxCount >= 2, "at least one customer should have >=2 parts (top-customer test fixture)");
});
