/**
 * quoting-docustrata-format — iter19 unit test.
 *
 * Run: node --test scripts/quoting-docustrata-format.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-FORMAT-VALIDATOR (charlie /goal-yolo iter19)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateDocustrataPayload,
  SUPPORTED_SCHEMA_VERSIONS,
  REVENUE_BOUNDS,
} from "./quoting-docustrata-format.mjs";

// ---------- Records-shape happy path ----------

test("records-shape: valid v1.0.0 payload returns valid + normalized Map", () => {
  const payload = {
    schema_version: "1.0.0",
    generated_iso: "2026-05-26T05:00:00.000Z",
    source: "docustrata-historical-pricing-trainer",
    records: [
      { customer: "ALCOA", part_id: "p1", revenue: 1500 },
      { customer: "ITW", part_id: "p2", revenue: 2300 },
    ],
  };
  const r = validateDocustrataPayload(payload);
  assert.equal(r.valid, true);
  assert.equal(r.errors.length, 0);
  assert.equal(r.normalized.size, 2);
  assert.equal(r.normalized.get("ALCOA|P1"), 1500);
  assert.equal(r.normalized.get("ITW|P2"), 2300);
  assert.equal(r.stats.row_count, 2);
  assert.equal(r.stats.distinct_customers, 2);
  assert.equal(r.stats.revenue_range.min, 1500);
  assert.equal(r.stats.revenue_range.max, 2300);
  assert.equal(r.stats.schema_version, "1.0.0");
  assert.equal(r.stats.source, "docustrata-historical-pricing-trainer");
});

// ---------- Flat-map happy path ----------

test("flat-map: valid {KEY:rev} payload returns valid + normalized Map", () => {
  const payload = { "ALCOA|P1": 1500, "ITW|P2": 2300 };
  const r = validateDocustrataPayload(payload);
  assert.equal(r.valid, true);
  assert.equal(r.normalized.size, 2);
  assert.equal(r.normalized.get("ALCOA|P1"), 1500);
});

// ---------- Schema version gate ----------

test("records-shape: unsupported schema_version rejected", () => {
  const payload = {
    schema_version: "2.0.0",
    records: [{ customer: "ALCOA", part_id: "p1", revenue: 1500 }],
  };
  const r = validateDocustrataPayload(payload);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes("unsupported schema_version")));
});

test("records-shape: missing schema_version is OK (defaults to permissive)", () => {
  const payload = { records: [{ customer: "ALCOA", part_id: "p1", revenue: 1500 }] };
  const r = validateDocustrataPayload(payload);
  assert.equal(r.valid, true);
});

// ---------- Revenue bounds enforcement ----------

test("revenue bounds: below min rejected (warning, not error)", () => {
  const payload = { records: [{ customer: "A", part_id: "p1", revenue: 0.005 }] };
  const r = validateDocustrataPayload(payload);
  // Out-of-range is a warning + record dropped; payload itself remains valid
  assert.equal(r.valid, true);
  assert.equal(r.normalized.size, 0);
  assert.ok(r.warnings.some(w => w.includes("outside sane range")));
});

test("revenue bounds: above max rejected", () => {
  const payload = { records: [{ customer: "A", part_id: "p1", revenue: 100_000_000 }] };
  const r = validateDocustrataPayload(payload);
  assert.equal(r.normalized.size, 0);
  assert.ok(r.warnings.some(w => w.includes("outside sane range")));
});

// ---------- Adversarial: null/non-object input ----------

test("adversarial: null input rejected", () => {
  const r = validateDocustrataPayload(null);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes("null/undefined")));
});

test("adversarial: undefined input rejected", () => {
  const r = validateDocustrataPayload(undefined);
  assert.equal(r.valid, false);
});

test("adversarial: array input rejected (must be object)", () => {
  const r = validateDocustrataPayload([1, 2, 3]);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes("must be an object")));
});

test("adversarial: string/number/boolean rejected", () => {
  for (const bad of ["string", 42, true]) {
    const r = validateDocustrataPayload(bad);
    assert.equal(r.valid, false, `${typeof bad} should reject`);
  }
});

// ---------- Records-shape: bad row entries ----------

test("records-shape: non-object row rejected", () => {
  const payload = {
    records: [
      { customer: "A", part_id: "p1", revenue: 100 },
      null,
      "string row",
      42,
    ],
  };
  const r = validateDocustrataPayload(payload);
  assert.equal(r.valid, false);
  assert.equal(r.errors.length, 3);
  assert.equal(r.normalized.size, 1); // only the valid row survived
});

test("records-shape: missing customer rejected", () => {
  const payload = { records: [{ customer: null, part_id: "p1", revenue: 100 }] };
  const r = validateDocustrataPayload(payload);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes("invalid customer/part_id")));
});

test("records-shape: missing part_id rejected", () => {
  const payload = { records: [{ customer: "A", part_id: "", revenue: 100 }] };
  const r = validateDocustrataPayload(payload);
  assert.equal(r.valid, false);
});

test("records-shape: NaN/Infinity/string revenue rejected", () => {
  for (const bad of [NaN, Infinity, -Infinity, "100", null, undefined, {}]) {
    const payload = { records: [{ customer: "A", part_id: "p1", revenue: bad }] };
    const r = validateDocustrataPayload(payload);
    assert.equal(r.valid, false, `revenue=${JSON.stringify(bad)} should reject`);
  }
});

// ---------- Duplicate-key warning ----------

test("records-shape: duplicate (customer, part_id) emits warning, last-wins", () => {
  const payload = {
    records: [
      { customer: "A", part_id: "p1", revenue: 100 },
      { customer: "A", part_id: "p1", revenue: 200 },
    ],
  };
  const r = validateDocustrataPayload(payload);
  assert.equal(r.valid, true);
  assert.equal(r.normalized.get("A|P1"), 200); // last wins
  assert.ok(r.warnings.some(w => w.includes("duplicate")));
});

// ---------- Flat-map: invalid key shape ----------

test("flat-map: key without | delimiter warns + skipped", () => {
  const payload = { "ALCOA": 1500, "ITW|P2": 2300 };
  const r = validateDocustrataPayload(payload);
  assert.equal(r.normalized.size, 1);
  assert.equal(r.normalized.get("ITW|P2"), 2300);
  assert.ok(r.warnings.some(w => w.includes("doesn't match expected")));
});

test("flat-map: non-number value rejected", () => {
  const payload = { "A|P1": "1500" };
  const r = validateDocustrataPayload(payload);
  assert.equal(r.valid, false);
});

test("flat-map: empty object rejected (no valid entries)", () => {
  const r = validateDocustrataPayload({});
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes("no valid entries")));
});

// ---------- Empty records array: valid + warning ----------

test("records-shape: empty records[] is valid (warning only)", () => {
  const payload = { schema_version: "1.0.0", records: [] };
  const r = validateDocustrataPayload(payload);
  assert.equal(r.valid, true);
  assert.equal(r.normalized.size, 0);
  assert.ok(r.warnings.some(w => w.includes("empty")));
});

// ---------- Constants exported ----------

test("SUPPORTED_SCHEMA_VERSIONS pinned to 1.0.0", () => {
  assert.ok(SUPPORTED_SCHEMA_VERSIONS.has("1.0.0"));
});

test("REVENUE_BOUNDS pinned for downstream contract", () => {
  assert.equal(REVENUE_BOUNDS.min, 0.01);
  assert.equal(REVENUE_BOUNDS.max, 10_000_000);
});

// ---------- Shape stability ----------

test("validateDocustrataPayload: stable 5-key return shape", () => {
  const r = validateDocustrataPayload({ records: [] });
  assert.deepEqual(Object.keys(r).sort(), ["errors", "normalized", "stats", "valid", "warnings"]);
});

// ---------- Integration: validator output feeds iter18 bridge ----------

test("integration: validator's normalized Map is directly consumable by mergeDocustrataRevenue shape", () => {
  // We don't import mergeDocustrataRevenue here (separate test file), but we
  // verify the normalized Map has the EXACT shape iter18's bridge expects.
  const payload = {
    schema_version: "1.0.0",
    records: [
      { customer: "ALCOA", part_id: "p1", revenue: 1500 },
      { customer: "ITW", part_id: "p2", revenue: 2300 },
    ],
  };
  const r = validateDocustrataPayload(payload);
  // The normalized Map keys MUST be uppercase + pipe-delimited (matches buildRevenueKey)
  for (const k of r.normalized.keys()) {
    assert.ok(/^[A-Z0-9_\- ]+\|[A-Z0-9_\- ]+$/i.test(k), `key ${k} matches expected shape`);
    assert.equal(k, k.toUpperCase(), `key ${k} is uppercase`);
  }
  // Values are all finite positive numbers
  for (const v of r.normalized.values()) {
    assert.ok(Number.isFinite(v) && v > 0);
  }
});
