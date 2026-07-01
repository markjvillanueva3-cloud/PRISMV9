/**
 * iter16 — unit test for summarizeRecordsDistribution.
 *
 * Run: node --test scripts/quoting-baseline-bootstrap.distribution.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-DISTRIBUTION-PROBE (charlie /goal-yolo iter16)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeRecordsDistribution } from "./quoting-baseline-bootstrap.mjs";

const r = (overrides = {}) => ({
  customer: "ALCOA",
  part_id: "p1",
  doc_date: "2026-05-26",
  actual_revenue_usd: 100,
  estimated_time_in_cut_s: 1800,
  machine_rate_usd_per_hr: 95,
  estimated_material_spend_usd: 60,
  machine_class: "mill",
  ...overrides,
});

test("summarizeRecordsDistribution: 5-record mixed cohort produces real distribution", () => {
  const records = [
    r({ machine_class: "mill", estimated_time_in_cut_s: 600, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 }),
    r({ machine_class: "wire-edm", estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 110, estimated_material_spend_usd: 35, customer: "ITW" }),
    r({ machine_class: "lathe", estimated_time_in_cut_s: 3600, machine_rate_usd_per_hr: 85, estimated_material_spend_usd: 40, customer: "BRADY" }),
    r({ machine_class: "mill", estimated_time_in_cut_s: 600, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 }),
    r({ machine_class: "grinder", estimated_time_in_cut_s: 7200, machine_rate_usd_per_hr: 75, estimated_material_spend_usd: 20, customer: "SFS" }),
  ];
  const d = summarizeRecordsDistribution(records, 5);
  assert.equal(d.total, 5);
  assert.equal(d.machineClassHisto.mill, 2);
  assert.equal(d.machineClassHisto["wire-edm"], 1);
  assert.equal(d.machineClassHisto.lathe, 1);
  assert.equal(d.machineClassHisto.grinder, 1);
  assert.equal(d.timeBucketHisto[600], 2);
  assert.equal(d.timeBucketHisto[1800], 1);
  assert.equal(d.timeBucketHisto[7200], 1);
  assert.equal(d.rateRange.min, 75);
  assert.equal(d.rateRange.max, 110);
  assert.equal(d.materialRange.min, 20);
  assert.equal(d.materialRange.max, 60);
  // ALCOA has 2 records (top), others have 1 each
  assert.equal(d.topCustomers[0].customer, "ALCOA");
  assert.equal(d.topCustomers[0].count, 2);
  assert.equal(d.topCustomers.length, 4); // 4 distinct customers
});

test("summarizeRecordsDistribution: empty records yields zeroed distribution", () => {
  const d = summarizeRecordsDistribution([], 5);
  assert.equal(d.total, 0);
  assert.deepEqual(d.machineClassHisto, {});
  assert.deepEqual(d.topCustomers, []);
  assert.equal(d.rateRange, null);
  assert.equal(d.materialRange, null);
});

test("summarizeRecordsDistribution: null/non-array input yields zeroed", () => {
  for (const bad of [null, undefined, "not array", 42, {}]) {
    const d = summarizeRecordsDistribution(bad, 5);
    assert.equal(d.total, 0);
  }
});

test("summarizeRecordsDistribution: topK respected", () => {
  const records = [];
  for (let i = 0; i < 20; i++) {
    records.push(r({ customer: `CUST_${i % 10}` })); // 10 distinct, 2 each
  }
  const d = summarizeRecordsDistribution(records, 3);
  assert.equal(d.topCustomers.length, 3);
  assert.equal(d.topCustomers[0].count, 2);
});

test("summarizeRecordsDistribution: missing machine_class -> 'unknown' bucket", () => {
  const records = [
    r({ machine_class: undefined }),
    r({ machine_class: undefined }),
    r({ machine_class: "mill" }),
  ];
  const d = summarizeRecordsDistribution(records, 5);
  assert.equal(d.machineClassHisto.unknown, 2);
  assert.equal(d.machineClassHisto.mill, 1);
});

test("summarizeRecordsDistribution: NaN/Infinity rate filtered from range", () => {
  const records = [
    r({ machine_rate_usd_per_hr: 95 }),
    r({ machine_rate_usd_per_hr: NaN }),
    r({ machine_rate_usd_per_hr: Infinity }),
    r({ machine_rate_usd_per_hr: 110 }),
  ];
  const d = summarizeRecordsDistribution(records, 5);
  assert.equal(d.rateRange.min, 95);
  assert.equal(d.rateRange.max, 110);
});

test("summarizeRecordsDistribution: non-object rows skipped (don't throw)", () => {
  const records = [r(), null, undefined, "string", 42, r({ customer: "B" })];
  const d = summarizeRecordsDistribution(records, 5);
  assert.equal(d.total, 6);  // total counts ALL input slots
  assert.equal(d.machineClassHisto.mill, 2); // but only 2 real rows aggregated
});

test("summarizeRecordsDistribution: stable 6-key shape", () => {
  const d = summarizeRecordsDistribution([r()], 5);
  assert.deepEqual(Object.keys(d).sort(), [
    "machineClassHisto",
    "materialRange",
    "rateRange",
    "timeBucketHisto",
    "topCustomers",
    "total",
  ]);
});

test("summarizeRecordsDistribution: time bucket histo sorted ascending by seconds", () => {
  const records = [
    r({ estimated_time_in_cut_s: 7200 }),
    r({ estimated_time_in_cut_s: 600 }),
    r({ estimated_time_in_cut_s: 3600 }),
    r({ estimated_time_in_cut_s: 1800 }),
  ];
  const d = summarizeRecordsDistribution(records, 5);
  const keys = Object.keys(d.timeBucketHisto).map(Number);
  assert.deepEqual(keys, [600, 1800, 3600, 7200]);
});

test("summarizeRecordsDistribution: machine class histo sorted by count desc", () => {
  const records = [
    r({ machine_class: "lathe" }),
    r({ machine_class: "mill" }),
    r({ machine_class: "mill" }),
    r({ machine_class: "mill" }),
    r({ machine_class: "wire-edm" }),
    r({ machine_class: "wire-edm" }),
  ];
  const d = summarizeRecordsDistribution(records, 5);
  const orderedKeys = Object.keys(d.machineClassHisto);
  assert.equal(orderedKeys[0], "mill"); // 3 — top
  assert.equal(orderedKeys[1], "wire-edm"); // 2
  assert.equal(orderedKeys[2], "lathe"); // 1
});

test("summarizeRecordsDistribution: topK=0 yields empty topCustomers", () => {
  const d = summarizeRecordsDistribution([r(), r({ customer: "B" })], 0);
  assert.deepEqual(d.topCustomers, []);
});

test("summarizeRecordsDistribution: fractional topK floored", () => {
  const records = [];
  for (let i = 0; i < 5; i++) records.push(r({ customer: `C${i}` }));
  const d = summarizeRecordsDistribution(records, 2.7);
  assert.equal(d.topCustomers.length, 2);
});
