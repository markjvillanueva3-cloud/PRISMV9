#!/usr/bin/env node
/**
 * consolidate-roadmaps.test.mjs — node:test suite (real-value assertions, R9).
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  normId, consolidateMilestones, collectPendingUnits, buildKnownUnitIds,
  crossRefProse, buildWiringUnits, consolidate, renderMarkdown, renderHtml,
  DEEP_INTEGRATION_BRIDGES,
} from "./consolidate-roadmaps.mjs";

test("normId — uppercase + trim, non-string → empty", () => {
  assert.equal(normId("  u-foo "), "U-FOO");
  assert.equal(normId(null), "");
  assert.equal(normId(7), "");
});

test("consolidateMilestones — unifies + merges source_roadmaps", () => {
  const ms = consolidateMilestones({
    milestoneProgress: { milestones: { A: { id: "A-MS0", title: "Alpha", total: 5, shipped: 2, pending: 3, derivedStatus: "in_progress" } } },
    roadmapIndex: { milestones: [{ id: "A-MS0", status: "in_progress" }, { id: "B-MS0", title: "Beta", status: "not_started" }] },
    envelopes: [{ id: "A-MS0", title: "Alpha" }, { id: "C-MS0", title: "Gamma" }],
  });
  assert.equal(ms.length, 3); // A, B, C unified
  const a = ms.find((m) => m.id === "A-MS0");
  assert.equal(a.total, 5);
  assert.equal(a.pending, 3);
  assert.deepEqual(a.source_roadmaps.sort(), ["MILESTONE_PROGRESS", "envelope", "roadmap-index"].sort());
  const b = ms.find((m) => m.id === "B-MS0");
  assert.deepEqual(b.source_roadmaps, ["roadmap-index"]);
});

test("collectPendingUnits -- un-shipped units, but NOT terminal-resolved (superseded)", () => {
  const pending = collectPendingUnits({
    milestones: {
      A: { id: "A-MS0", units: [
        { id: "U-A1", title: "one", shipped: true },
        { id: "U-A2", title: "two", shipped: false },
        { id: "U-A3", title: "three", shipped: false },
        { id: "U-A4", title: "superseded", shipped: false, resolved: true },  // excluded: not a build candidate
        { id: "U-A5", title: "legacy (no resolved field)", shipped: false },  // included: back-compat
      ] },
    },
  });
  const ids = pending.map((u) => u.unit_id);
  assert.equal(pending.length, 3); // A2, A3, A5
  assert.ok(!ids.includes("U-A1"), "shipped excluded");
  assert.ok(!ids.includes("U-A4"), "resolved (superseded) excluded -> never offered as a build candidate");
  assert.ok(ids.includes("U-A5"), "legacy unit without a resolved field is still included");
  assert.equal(pending[0].milestone, "A-MS0");
  assert.equal(pending[0].consolidated, true);
});

test("buildKnownUnitIds — unions MP units + envelope units", () => {
  const known = buildKnownUnitIds({
    milestoneProgress: { milestones: { A: { units: [{ id: "U-A1" }, { id: "U-A2" }] } } },
    envelopes: [{ units: [{ id: "U-E1" }] }],
  });
  assert.ok(known.has("U-A1"));
  assert.ok(known.has("U-E1"));
  assert.equal(known.has("U-NOPE"), false);
  assert.equal(known.size, 3);
});

test("crossRefProse — keeps only units NOT in any envelope/MP", () => {
  const known = new Set(["U-KNOWN1"]);
  const proseAgents = [{
    source_roadmap: "REVENUE",
    units: [
      { unit_id: "U-KNOWN1", title: "already roadmapped" },  // dropped
      { unit_id: "U-ORPHAN1", title: "never enveloped" },    // kept
      { unit_id: null, title: "idless prose unit" },          // kept
    ],
  }];
  const { unconsolidated, totalProse } = crossRefProse(proseAgents, known);
  assert.equal(totalProse, 3);
  assert.equal(unconsolidated.length, 2);
  assert.ok(unconsolidated.some((u) => u.unit_id === "U-ORPHAN1"));
  assert.ok(!unconsolidated.some((u) => u.unit_id === "U-KNOWN1"));
});

test("crossRefProse — dedupes repeated prose units", () => {
  const { unconsolidated } = crossRefProse([
    { source_roadmap: "R1", units: [{ unit_id: "U-DUP", title: "x" }] },
    { source_roadmap: "R2", units: [{ unit_id: "u-dup", title: "x phrased differently" }] },
  ], new Set());
  assert.equal(unconsolidated.length, 1); // U-DUP collapsed across roadmaps
});

test("buildWiringUnits — one domain-grouped unit per NEEDS_WIRING domain", () => {
  const units = buildWiringUnits({
    NEEDS_WIRING: { top_domains: [{ domain: "Lathe", count: 89 }, { domain: "Other", count: 144 }] },
  });
  assert.equal(units.length, 2);
  assert.equal(units[0].id, "U-BRIDGE-WIRE-LATHE");
  assert.equal(units[0].engine_count, 89);
  assert.ok(units[0].title.includes("89"));
});

test("buildWiringUnits — long-tail catch-all covers engines beyond top domains", () => {
  const units = buildWiringUnits({
    NEEDS_WIRING: {
      summary: "836 engines on disk with no dispatcher reference.",
      top_domains: [{ domain: "Lathe", count: 89 }, { domain: "Other", count: 144 }],
    },
  });
  assert.equal(units.length, 3); // 2 domains + long-tail
  const tail = units.find((u) => u.id === "U-BRIDGE-WIRE-LONGTAIL");
  assert.ok(tail, "long-tail unit emitted");
  assert.equal(tail.engine_count, 836 - 89 - 144); // 603
  // total coverage reconciles with the summary count
  assert.equal(units.reduce((s, u) => s + u.engine_count, 0), 836);
});

test("buildWiringUnits — no catch-all when summary absent or fully covered", () => {
  const units = buildWiringUnits({ NEEDS_WIRING: { top_domains: [{ domain: "X", count: 5 }] } });
  assert.equal(units.length, 1); // no summary → no long-tail
});

test("DEEP_INTEGRATION_BRIDGES — 16 well-formed cross-subsystem units", () => {
  assert.equal(DEEP_INTEGRATION_BRIDGES.length, 16);
  for (const b of DEEP_INTEGRATION_BRIDGES) {
    assert.ok(b.id.startsWith("U-BRIDGE-"), `${b.id} has bridge prefix`);
    assert.ok(b.from && b.to && b.intent && b.title, `${b.id} fully populated`);
  }
  // ids unique
  assert.equal(new Set(DEEP_INTEGRATION_BRIDGES.map((b) => b.id)).size, 16);
});

test("consolidate — full pipeline integration", () => {
  const inv = consolidate({
    milestoneProgress: { milestones: {
      A: { id: "A-MS0", title: "Alpha", total: 3, shipped: 1, pending: 2, derivedStatus: "in_progress",
           units: [{ id: "U-A1", shipped: true }, { id: "U-A2", shipped: false }, { id: "U-A3", shipped: false }] },
    } },
    roadmapIndex: { milestones: [{ id: "A-MS0", status: "in_progress" }] },
    envelopes: [{ id: "A-MS0", units: [{ id: "U-A1" }, { id: "U-A2" }, { id: "U-A3" }] }],
    proseAgents: [{ source_roadmap: "REVENUE", units: [
      { unit_id: "U-A2", title: "known" },        // in envelope → not un-consolidated
      { unit_id: "U-NEW9", title: "brand new" },  // un-consolidated
    ] }],
    miscInventory: { items: [{ misc_id: "MISC-001" }, { misc_id: "MISC-002" }] },
    buildState: { NEEDS_WIRING: { top_domains: [{ domain: "Lathe", count: 89 }] } },
  });
  assert.equal(inv.stats.pendingUnits, 2);            // U-A2 + U-A3
  assert.equal(inv.stats.proseUnconsolidated, 1);     // U-NEW9 only
  assert.equal(inv.stats.miscOrphans, 2);
  assert.equal(inv.stats.bridgeWiringUnits, 1);
  assert.equal(inv.stats.bridgeWiringEngines, 89);
  assert.equal(inv.stats.deepIntegrationUnits, 16);
  assert.equal(inv.stats.grandTotalRemaining, 2 + 1 + 2 + 1 + 16);
  assert.equal(inv.schemaVersion, "1.0.0");
  assert.equal(inv.provenance.advisoryOnly, true);
});

test("renderMarkdown / renderHtml — non-empty, carry the headline numbers", () => {
  const inv = consolidate({
    milestoneProgress: { milestones: { A: { id: "A-MS0", total: 1, shipped: 0, pending: 1, units: [{ id: "U-A1", shipped: false }] } } },
    roadmapIndex: { milestones: [] },
    envelopes: [],
    proseAgents: [{ source_roadmap: "R", units: [] }],
    miscInventory: { items: [] },
    buildState: { NEEDS_WIRING: { top_domains: [{ domain: "Other", count: 5 }] } },
  });
  const md = renderMarkdown(inv);
  assert.ok(md.includes("Consolidated Inventory"));
  assert.ok(md.includes("U-BRIDGE-WIRE-OTHER"));
  assert.ok(md.includes("U-BRIDGE-SFC-FUSION"));
  const html = renderHtml(inv);
  assert.ok(html.startsWith("<!doctype html>"));
  assert.ok(html.includes('lang="en"'));
  assert.ok(html.includes('role="main"'));
  assert.ok(html.includes("U-BRIDGE-SFC-FUSION"));
});
