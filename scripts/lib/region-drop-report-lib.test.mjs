/**
 * region-drop-report-lib -- tests for the pure cross-seed aggregator over region-route drop diagnostics.
 *
 * Each test encodes WHY the cross-seed reading is conclusive: a STABLE drop label is systematic (the
 * label says code-bug vs host vs blank), a VARYING label is VLM variance. These are the verdicts a
 * multi-seed GPU run on print 05850 needs -- so they are asserted exactly, GPU-free.
 *
 * Run: node scripts/lib/region-drop-report-lib.test.mjs
 *
 * @milestone BLUEPRINT-VISION-OCR/U-XRAY-P15-DROP-REPORT (slot:xray)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateRegionDropDiags, parseResultsJsonl, bucketForStableAttribution } from "./region-drop-report-lib.mjs";

// a results-record carrying one region-route page diag
function rec(pn, diags) {
  return { part_number: pn, region_page_diags: diags };
}
function diag(page, attribution, extra = {}) {
  return { page, route: "region_route", attribution, ...extra };
}

test("bucketForStableAttribution: maps each stable label to its investigation bucket", () => {
  assert.equal(bucketForStableAttribution("merge_or_unit_dropped"), "code_bug_suspect");
  assert.equal(bucketForStableAttribution("floor_failed_regions_ran"), "host_suspect");
  assert.equal(bucketForStableAttribution("extraction_failed"), "host_suspect");
  assert.equal(bucketForStableAttribution("blank_page"), "genuine_blank");
  assert.equal(bucketForStableAttribution("ok"), "ok");
  assert.equal(bucketForStableAttribution("garbage"), "ok"); // unknown label is not a drop to chase
});

test("empty / non-array runs -> empty report (no crash)", () => {
  for (const input of [[], null, undefined, "nope"]) {
    const r = aggregateRegionDropDiags(input);
    assert.equal(r.pages.length, 0);
    assert.equal(r.summary.totalPages, 0);
    assert.equal(r.summary.codeBugSuspect, 0);
  }
  assert.equal(aggregateRegionDropDiags([]).seedCount, 0);
});

test("STABLE merge_or_unit_dropped across 3 seeds -> code_bug_suspect, collapsedSeen from merge_stats", () => {
  const runs = ["s1", "s2", "s3"].map((label) => ({
    label,
    records: [rec("05850", [diag(3, "merge_or_unit_dropped", { floor_scoreable: 5, union_scoreable: 0, merge_stats: { collapsed: 5 } })])],
  }));
  const r = aggregateRegionDropDiags(runs);
  assert.equal(r.seedCount, 3);
  assert.equal(r.pages.length, 1);
  const p = r.pages[0];
  assert.equal(p.key, "05850::p3");
  assert.equal(p.seeds, 3);
  assert.equal(p.stable, true);
  assert.equal(p.dominant, "merge_or_unit_dropped");
  assert.equal(p.verdict, "code_bug_suspect");
  assert.equal(p.collapsedSeen, true, "merge_stats.collapsed>0 confirms the merge dropped scoreable floor dims");
  assert.equal(r.summary.codeBugSuspect, 1);
  assert.equal(r.summary.byAttribution.merge_or_unit_dropped, 3);
});

test("STABLE extraction_failed across seeds -> host_suspect", () => {
  const runs = ["s1", "s2", "s3"].map((label) => ({ label, records: [rec("05850", [diag(2, "extraction_failed")])] }));
  const r = aggregateRegionDropDiags(runs);
  assert.equal(r.pages[0].verdict, "host_suspect");
  assert.equal(r.pages[0].collapsedSeen, false, "no merge_stats -> collapsedSeen false");
  assert.equal(r.summary.hostSuspect, 1);
});

test("STABLE blank_page across seeds -> genuine_blank (an EXPECTED drop, not a bug)", () => {
  const runs = ["s1", "s2"].map((label) => ({ label, records: [rec("05850", [diag(1, "blank_page", { floor_scoreable: 0 })])] }));
  const r = aggregateRegionDropDiags(runs);
  assert.equal(r.pages[0].verdict, "genuine_blank");
  assert.equal(r.summary.genuineBlank, 1);
});

test("VARYING attribution across seeds -> variance (VLM stochasticity, not systematic)", () => {
  const runs = [
    { label: "s1", records: [rec("05850", [diag(2, "ok")])] },
    { label: "s2", records: [rec("05850", [diag(2, "extraction_failed")])] },
    { label: "s3", records: [rec("05850", [diag(2, "extraction_failed")])] },
  ];
  const r = aggregateRegionDropDiags(runs);
  const p = r.pages[0];
  assert.equal(p.stable, false);
  assert.equal(p.verdict, "variance");
  assert.equal(p.dominant, "extraction_failed", "dominant = most frequent (informative even under variance)");
  assert.equal(r.summary.variance, 1);
});

test("multiple parts + pages: correct keying, per-page verdicts, key-sorted", () => {
  const runs = ["s1", "s2"].map((label) => ({
    label,
    records: [
      rec("AAA", [diag(1, "ok"), diag(2, "merge_or_unit_dropped", { merge_stats: { collapsed: 2 } })]),
      rec("BBB", [diag(1, "blank_page")]),
    ],
  }));
  const r = aggregateRegionDropDiags(runs);
  assert.equal(r.pages.length, 3); // AAA::p1, AAA::p2, BBB::p1
  assert.deepEqual(r.pages.map((p) => p.key), ["AAA::p1", "AAA::p2", "BBB::p1"]);
  assert.equal(r.pages.find((p) => p.key === "AAA::p2").verdict, "code_bug_suspect");
  assert.equal(r.pages.find((p) => p.key === "AAA::p1").verdict, "ok");
  assert.equal(r.pages.find((p) => p.key === "BBB::p1").verdict, "genuine_blank");
  assert.equal(r.summary.totalPages, 3);
  assert.equal(r.summary.ok, 1);
});

test("records without region_page_diags ignored; malformed diags skipped", () => {
  const runs = [{
    label: "s1",
    records: [
      { part_number: "X" },                                  // no diags -> ignored
      rec("Y", [null, "nope", diag(1, "extraction_failed")]), // skips null/string, keeps the real one
      rec("Z", []),                                           // empty diags
    ],
  }];
  const r = aggregateRegionDropDiags(runs);
  assert.equal(r.pages.length, 1);
  assert.equal(r.pages[0].key, "Y::p1");
});

test("collapsedSeen true if ANY seed observed merge collapse on the page", () => {
  const runs = [
    { label: "s1", records: [rec("Q", [diag(2, "merge_or_unit_dropped", { merge_stats: { collapsed: 0 } })])] },
    { label: "s2", records: [rec("Q", [diag(2, "merge_or_unit_dropped", { merge_stats: { collapsed: 4 } })])] },
  ];
  const r = aggregateRegionDropDiags(runs);
  assert.equal(r.pages[0].collapsedSeen, true);
});

test("R12 honesty: a single seed is NOT variance-checked -> verdict provisional (every page vacuously stable)", () => {
  const runs = [{ label: "only", records: [rec("05850", [diag(3, "merge_or_unit_dropped", { merge_stats: { collapsed: 5 } })])] }];
  const r = aggregateRegionDropDiags(runs);
  assert.equal(r.pages[0].stable, true, "trivially stable with one seed");
  assert.equal(r.pages[0].varianceChecked, false, "but variance was NOT checkable -> not trustworthy");
  assert.equal(r.summary.provisional, true);
  assert.equal(r.summary.minSeedsForConfidence, 3);
});

test("2 seeds -> varianceChecked true; 3 seeds -> not provisional", () => {
  const two = ["a", "b"].map((label) => ({ label, records: [rec("X", [diag(1, "extraction_failed")])] }));
  const r2 = aggregateRegionDropDiags(two);
  assert.equal(r2.pages[0].varianceChecked, true);
  assert.equal(r2.summary.provisional, true, "2 < 3 seeds is still provisional per doctrine");
  const three = ["a", "b", "c"].map((label) => ({ label, records: [rec("X", [diag(1, "extraction_failed")])] }));
  const r3 = aggregateRegionDropDiags(three);
  assert.equal(r3.summary.provisional, false, ">=3 seeds clears provisional");
  assert.equal(r3.pages[0].varianceChecked, true);
});

test("empty-string part_number does not collide pages across parts (-> '(unknown)')", () => {
  const runs = [{ label: "s1", records: [
    { part_number: "", region_page_diags: [diag(1, "ok")] },
    { part_number: "REAL", region_page_diags: [diag(1, "blank_page")] },
  ] }];
  const r = aggregateRegionDropDiags(runs);
  const keys = r.pages.map((p) => p.key).sort();
  assert.deepEqual(keys, ["(unknown)::p1", "REAL::p1"]);
});

test("parseResultsJsonl: parses valid lines, fail-soft skips blank + torn lines", () => {
  const text = [
    JSON.stringify({ part_number: "A", region_page_diags: [diag(1, "ok")] }),
    "",                                   // blank
    "{ not valid json",                   // torn line -> skipped, rest survive
    JSON.stringify({ part_number: "B" }),
    "  ",                                 // whitespace
  ].join("\n");
  const recs = parseResultsJsonl(text);
  assert.equal(recs.length, 2);
  assert.equal(recs[0].part_number, "A");
  assert.equal(recs[1].part_number, "B");
  assert.deepEqual(parseResultsJsonl(""), []);
  assert.deepEqual(parseResultsJsonl(null), []);
});
