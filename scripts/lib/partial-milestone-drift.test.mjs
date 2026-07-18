/**
 * Tests for partial-milestone-drift.mjs — node:test runner.
 * Run: node --test scripts/lib/partial-milestone-drift.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { findPartialMilestoneDrift, renderMarkdown } from "./partial-milestone-drift.mjs";

const probeFromTable = (table) => (engName) => {
  if (!(engName in table)) return null;
  const sz = table[engName];
  return { exists: sz > 0, sizeBytes: sz };
};

test("empty input yields no candidates", () => {
  const r = findPartialMilestoneDrift({ envelopes: [], engineProbe: () => null });
  assert.equal(r.candidates.length, 0);
  assert.equal(r.scanned.milestones, 0);
  assert.equal(r.scanned.units, 0);
});

test("ignores envelope with status=complete", () => {
  const envelopes = [{
    id: "DONE-MS0", status: "complete",
    unit_list: [{ id: "U-X1", status: "pending", title: "FooEngine — does foo" }],
  }];
  const r = findPartialMilestoneDrift({ envelopes, engineProbe: probeFromTable({ FooEngine: 5000 }) });
  assert.equal(r.candidates.length, 0);
  assert.equal(r.scanned.milestones, 0);
});

test("detects partial drift on in_progress envelope with pending unit + engine on disk", () => {
  const envelopes = [{
    id: "WEDM-NEXT-MS0", status: "in_progress",
    unit_list: [
      { id: "U-WN06", status: "pending", title: "WEDMRecastLayerMLEngine — ML recast" },
      { id: "U-WN09", status: "pending", title: "WEDMSurfaceIntegrityPredictorEngine — Ra/Rz" },
    ],
  }];
  const probe = probeFromTable({ WEDMRecastLayerMLEngine: 21549, WEDMSurfaceIntegrityPredictorEngine: 0 });
  const r = findPartialMilestoneDrift({ envelopes, engineProbe: probe });
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0].unit_id, "U-WN06");
  assert.equal(r.candidates[0].engine, "WEDMRecastLayerMLEngine");
  assert.equal(r.candidates[0].engine_bytes, 21549);
});

test("respects minEngineBytes threshold to skip stubs", () => {
  const envelopes = [{
    id: "STUBS-MS0", status: "in_progress",
    unit_list: [{ id: "U-S1", status: "pending", title: "TinyEngine — stub" }],
  }];
  const r = findPartialMilestoneDrift({
    envelopes,
    engineProbe: probeFromTable({ TinyEngine: 200 }),
    options: { minEngineBytes: 1024 },
  });
  assert.equal(r.candidates.length, 0);
});

test("handles nested phases[].units objects", () => {
  const envelopes = [{
    id: "NESTED-MS0", status: "in_progress",
    phases: [{
      id: "P1", units: [
        { id: "U-N1", status: "pending", title: "NestedEngine — n" },
      ],
    }],
  }];
  const r = findPartialMilestoneDrift({
    envelopes,
    engineProbe: probeFromTable({ NestedEngine: 5000 }),
  });
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0].unit_id, "U-N1");
});

test("handles split shape: unit_list (objects) + phases[].units (string IDs)", () => {
  const envelopes = [{
    id: "SPLIT-MS0", status: "in_progress",
    unit_list: [
      { id: "U-SP1", status: "pending", title: "SplitEngine — split shape" },
    ],
    phases: [{ id: "P1", units: ["U-SP1"] }],
  }];
  const r = findPartialMilestoneDrift({
    envelopes,
    engineProbe: probeFromTable({ SplitEngine: 5000 }),
  });
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0].unit_id, "U-SP1");
});

test("ignores complete unit even on open envelope", () => {
  const envelopes = [{
    id: "MIX-MS0", status: "in_progress",
    unit_list: [
      { id: "U-DONE", status: "complete", title: "DoneEngine — already done" },
      { id: "U-OPEN", status: "pending", title: "OpenEngine — pending" },
    ],
  }];
  const r = findPartialMilestoneDrift({
    envelopes,
    engineProbe: probeFromTable({ DoneEngine: 9000, OpenEngine: 9000 }),
  });
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0].unit_id, "U-OPEN");
});

test("multiple engine matches in title: first existing on disk wins", () => {
  const envelopes = [{
    id: "MULTI-MS0", status: "in_progress",
    unit_list: [
      { id: "U-M1", status: "pending", title: "FirstEngine + SecondEngine — combo" },
    ],
  }];
  const r = findPartialMilestoneDrift({
    envelopes,
    engineProbe: probeFromTable({ FirstEngine: 0, SecondEngine: 9000 }),
  });
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0].engine, "SecondEngine");
});

test("renderMarkdown empty-state", () => {
  const md = renderMarkdown([]);
  assert.match(md, /No partial-milestone-drift candidates/);
});

test("renderMarkdown formats rows + escapes pipes in title", () => {
  const md = renderMarkdown([
    { ms_id: "M1", unit_id: "U-1", engine: "E1", engine_bytes: 1000, unit_title: "a | b" },
  ]);
  assert.match(md, /\| M1 \| U-1 \| E1 \| 1000 B \| a \\\| b \|/);
});

test("fail-soft on malformed envelope shapes", () => {
  const envelopes = [null, "string", { id: "X" }, { id: "Y", status: "in_progress", unit_list: null }];
  const r = findPartialMilestoneDrift({ envelopes, engineProbe: () => null });
  assert.equal(r.candidates.length, 0);
  assert.ok(r.scanned.milestones >= 2);
});

test("status synonyms (in-progress, wip, planned, active) accepted", () => {
  const envelopes = [{
    id: "SYN-MS0", status: "in_progress",
    unit_list: [
      { id: "U-1", status: "in-progress", title: "AlphaEngine — a" },
      { id: "U-2", status: "wip", title: "BetaEngine — b" },
      { id: "U-3", status: "planned", title: "GammaEngine — g" },
    ],
  }];
  const r = findPartialMilestoneDrift({
    envelopes,
    engineProbe: probeFromTable({ AlphaEngine: 2000, BetaEngine: 2000, GammaEngine: 2000 }),
  });
  assert.equal(r.candidates.length, 3);
});
