#!/usr/bin/env node
/**
 * Tests for zebra-capability-report.mjs (U-ZEBRA-CAPABILITY-REPORT).
 * Run: node --test scripts/zebra-capability-report.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  topDomains,
  renderCapabilityMap,
  renderMarkdown,
  SCHEMA_VERSION,
} from "./zebra-capability-report.mjs";

// ───────────────────────── topDomains ─────────────────────────

test("topDomains: top-N by count desc, name asc tiebreak, deterministic", () => {
  const r = topDomains({ mill: 52, lathe: 10, cad: 52, wedm: 5 }, 3);
  assert.deepEqual(r, ["cad=52", "mill=52", "lathe=10"], "ties broken by name asc");
});

test("topDomains: filters non-positive + non-finite, empty/null safe", () => {
  assert.deepEqual(topDomains({ a: 0, b: -5, c: NaN, d: 3 }, 5), ["d=3"]);
  assert.deepEqual(topDomains(null), []);
  assert.deepEqual(topDomains({}), []);
  assert.deepEqual(topDomains("not-an-object"), []);
});

test("topDomains: limit honored", () => {
  assert.equal(topDomains({ a: 5, b: 4, c: 3, d: 2 }, 2).length, 2);
});

// ───────────────────────── renderCapabilityMap ─────────────────────────

const sampleIndex = {
  schemaVersion: "1.0.0",
  generatedAt: "2026-05-21T00:00:00.000Z",
  slotCount: 3,
  fingerprints: [
    { slot: "bravo", ok: true, hermesRole: "specialist-mill", domains: ["mill"],
      queueLength: 365, vizNodeCount: 21171, tribalDomainScores: { mill: 52 },
      successRate: 0.5, successSampleSize: 0 },
    { slot: "golf", ok: true, hermesRole: "hygiene", domains: [],
      queueLength: 5, vizNodeCount: 1560, tribalDomainScores: {},
      successRate: 0, successSampleSize: 0 },
    { slot: "broken", ok: false, hermesRole: "?", vizNodeCount: 999999 },
  ],
};

test("renderCapabilityMap: sort = ok-first, then viz desc, then slot", () => {
  const m = renderCapabilityMap(sampleIndex);
  assert.equal(m.slotCount, 3);
  // ok bravo (21171 > 1560) → ok golf → !ok broken (last despite huge viz count)
  assert.deepEqual(m.rows.map((r) => r.slot), ["bravo", "golf", "broken"]);
  assert.equal(m.rows[0].ok, true);
  assert.equal(m.rows[2].ok, false, "ok:false sorts last");
});

test("renderCapabilityMap: tolerates missing fields, never throws", () => {
  const m = renderCapabilityMap({ fingerprints: [{ slot: "x" }] });
  assert.equal(m.slotCount, 1);
  assert.equal(m.rows[0].slot, "x");
  assert.equal(m.rows[0].queueLength, 0);
  assert.equal(m.rows[0].vizNodeCount, 0);
  assert.equal(m.rows[0].domains, "");
});

test("renderCapabilityMap: empty/null/garbage → empty rows, never throws", () => {
  assert.equal(renderCapabilityMap(null).slotCount, 0);
  assert.equal(renderCapabilityMap({}).slotCount, 0);
  assert.equal(renderCapabilityMap({ fingerprints: "not-array" }).slotCount, 0);
});

test("renderCapabilityMap: deterministic — same input twice is identical", () => {
  const a = JSON.stringify(renderCapabilityMap(sampleIndex));
  const b = JSON.stringify(renderCapabilityMap(sampleIndex));
  assert.equal(a, b);
});

// ───────────────────────── renderMarkdown ─────────────────────────

test("renderMarkdown: renders table with one row per slot + escapes pipes", () => {
  const md = renderMarkdown(renderCapabilityMap(sampleIndex));
  assert.ok(md.startsWith("# Slot Capability Map"));
  assert.ok(md.includes("| slot | ok | role |"), "header row present");
  assert.ok(md.includes("| bravo | ✓"), "bravo row");
  assert.ok(md.includes("| golf | ✓"), "golf row");
  assert.ok(md.includes("| broken | ✗"), "failed-fingerprint row marked");
  assert.ok(md.includes("3 slot fingerprint(s)"));
  assert.ok(md.includes(`report schemaVersion: ${SCHEMA_VERSION}`));
});

test("renderMarkdown: sanitizes pipes in field values — table cannot break", () => {
  // R12: a hostile slot name containing '|' would corrupt the markdown table.
  const m = renderCapabilityMap({ fingerprints: [{ slot: "evil|name", ok: true }] });
  const md = renderMarkdown(m);
  const dataLines = md.split("\n").filter((l) => l.startsWith("| evil"));
  assert.equal(dataLines.length, 1, "exactly one row, pipe-stripped");
  assert.ok(!dataLines[0].includes("evil|name"), "pipe was stripped from slot name");
});
