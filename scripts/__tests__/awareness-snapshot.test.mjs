/**
 * awareness-snapshot.test.mjs — AWARENESS-READINESS (2026-05-19)
 * ==============================================================
 * Tests the "ready to use" upgrade to scripts/awareness-snapshot.mjs:
 *
 *   - computeReadiness(buildState) — pure: derives built∩wired ("ready to
 *     use") figures from BUILD_STATE.COVERAGE_BY_DOMAIN.
 *   - renderMarkdown(snapshot) — must emit the "## Ready to use" section,
 *     and a degraded notice when readiness is null.
 *
 * Why this matters: PRISM Awareness reported "engines built" but never what
 * is actually INVOKABLE (built AND wired into a dispatcher). An engine with
 * no dispatcher reference is on disk but dark. This upgrade surfaces the
 * ready-to-use count so a session knows current live capability.
 *
 * Run: node --test H:/prism/scripts/__tests__/awareness-snapshot.test.mjs
 *
 * @milestone AWARENESS-READINESS
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { computeReadiness, renderMarkdown } from "../awareness-snapshot.mjs";

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** A BUILD_STATE.COVERAGE_BY_DOMAIN row. */
function row(domain, total, wired, coverage_pct) {
  return { domain, total, wired, unwired: total - wired, coverage_pct };
}

/** A BUILD_STATE object with the given coverage rows. */
function buildState(rows) {
  return { COVERAGE_BY_DOMAIN: { summary: {}, rows } };
}

const THREE_DOMAINS = buildState([
  row("Other", 607, 481, 79),
  row("Lathe", 190, 123, 65),
  row("Machine", 45, 32, 71),
]);

/** A complete snapshot object for renderMarkdown (all fields it reads). */
function mkSnapshot(readiness) {
  return {
    generatedAt: "2026-05-19T12:00:00.000Z",
    graphMtime: "2026-05-19T11:00:00.000Z",
    inputs: { graph: true, buildState: true, progress: true },
    graph: { nodes: 1000, edges: 500, filteredNodes: 800, inHighThreshold: 4, outHighThreshold: 2 },
    utilizationTotals: { hub: 1, sink: 2, source: 3, orphan: 4, ghost: 5, normal: 6 },
    byLayer: {},
    topHubs: [],
    topOrphans: [],
    ghostsByLayer: {},
    drift: { count: 0, top: [] },
    buildSummary: {
      builtEngines: 2617, builtWithWiki: 1096, needsWiring: 667,
      needsBuilding: 3232, pendingFE: 2, drift: 191,
    },
    readiness,
    warnings: [],
  };
}

// ─── computeReadiness ────────────────────────────────────────────────────────

describe("computeReadiness — built ∩ wired from COVERAGE_BY_DOMAIN", () => {
  test("happy: sums wired / unwired / total across all domain rows", () => {
    const r = computeReadiness(THREE_DOMAINS);
    assert.equal(r.readyToUse, 481 + 123 + 32);    // 636
    assert.equal(r.builtButUnwired, 126 + 67 + 13); // 206
    assert.equal(r.totalBuilt, 607 + 190 + 45);     // 842
  });

  test("coveragePct is round(wired / total * 100)", () => {
    const r = computeReadiness(THREE_DOMAINS);
    assert.equal(r.coveragePct, Math.round((636 / 842) * 100)); // 76
  });

  test("readyToUse + builtButUnwired === totalBuilt (conservation)", () => {
    const r = computeReadiness(THREE_DOMAINS);
    assert.equal(r.readyToUse + r.builtButUnwired, r.totalBuilt);
  });

  test("topUnwiredDomains sorted by unwired DESC", () => {
    const r = computeReadiness(THREE_DOMAINS);
    const unwired = r.topUnwiredDomains.map((d) => d.unwired);
    assert.deepEqual(unwired, [...unwired].sort((a, b) => b - a));
    assert.equal(r.topUnwiredDomains[0].domain, "Other"); // 126 unwired = most
  });

  test("topUnwiredDomains carries domain/wired/unwired/total/coveragePct", () => {
    const r = computeReadiness(THREE_DOMAINS);
    const lathe = r.topUnwiredDomains.find((d) => d.domain === "Lathe");
    assert.deepEqual(lathe, { domain: "Lathe", wired: 123, unwired: 67, total: 190, coveragePct: 65 });
  });

  test("topUnwiredDomains EXCLUDES fully-wired domains (0 unwired)", () => {
    const bs = buildState([
      row("FullyWired", 50, 50, 100), // 0 unwired — must not appear
      row("Partial", 20, 12, 60),
    ]);
    const r = computeReadiness(bs);
    assert.equal(r.topUnwiredDomains.length, 1);
    assert.equal(r.topUnwiredDomains[0].domain, "Partial");
  });

  test("topUnwiredDomains capped at 8 even with more unwired domains", () => {
    const rows = [];
    for (let i = 0; i < 12; i++) rows.push(row(`D${i}`, 100, 100 - (i + 1), 90));
    const r = computeReadiness(buildState(rows));
    assert.equal(r.topUnwiredDomains.length, 8);
  });

  test("returns null when COVERAGE_BY_DOMAIN is absent", () => {
    assert.equal(computeReadiness({}), null);
    assert.equal(computeReadiness({ headline: {} }), null);
  });

  test("returns null for null / undefined / non-object buildState", () => {
    assert.equal(computeReadiness(null), null);
    assert.equal(computeReadiness(undefined), null);
  });

  test("returns null when rows is missing, not an array, or empty", () => {
    assert.equal(computeReadiness({ COVERAGE_BY_DOMAIN: {} }), null);
    assert.equal(computeReadiness({ COVERAGE_BY_DOMAIN: { rows: "nope" } }), null);
    assert.equal(computeReadiness({ COVERAGE_BY_DOMAIN: { rows: [] } }), null);
  });

  test("coercion — string-number fields are summed numerically, not concatenated", () => {
    const bs = { COVERAGE_BY_DOMAIN: { rows: [
      { domain: "A", total: "100", wired: "60", unwired: "40", coverage_pct: "60" },
      { domain: "B", total: "50", wired: "50", unwired: "0", coverage_pct: "100" },
    ] } };
    const r = computeReadiness(bs);
    assert.equal(r.readyToUse, 110);   // 60 + 50, numeric
    assert.equal(r.totalBuilt, 150);
  });

  test("malformed rows — null entry / missing fields default to 0, no throw", () => {
    const bs = { COVERAGE_BY_DOMAIN: { rows: [
      null,
      { domain: "Good", total: 10, wired: 7, unwired: 3, coverage_pct: 70 },
      { domain: "NoFields" },
    ] } };
    const r = computeReadiness(bs);
    assert.equal(r.readyToUse, 7);
    assert.equal(r.builtButUnwired, 3);
    assert.equal(r.totalBuilt, 10);
  });

  test("coveragePct is 0 (not NaN) when every row total is 0", () => {
    const bs = { COVERAGE_BY_DOMAIN: { rows: [{ domain: "Z", total: 0, wired: 0, unwired: 0, coverage_pct: 0 }] } };
    const r = computeReadiness(bs);
    assert.equal(r.coveragePct, 0);
    assert.equal(Number.isNaN(r.coveragePct), false);
  });
});

// ─── renderMarkdown — "Ready to use" section ─────────────────────────────────

describe("renderMarkdown — Ready to use section", () => {
  test("emits the '## Ready to use' heading + ready/unwired/coverage lines", () => {
    const md = renderMarkdown(mkSnapshot(computeReadiness(THREE_DOMAINS)));
    assert.match(md, /## Ready to use \(built AND wired — invokable now\)/);
    assert.match(md, /\*\*636\*\* engines wired & ready to use/);
    assert.match(md, /\*\*206\*\* engines built but UNWIRED/);
    assert.match(md, /\*\*76%\*\* dispatcher coverage/);
  });

  test("lists the per-domain unwired backlog", () => {
    const md = renderMarkdown(mkSnapshot(computeReadiness(THREE_DOMAINS)));
    assert.match(md, /Largest unwired backlog/);
    assert.match(md, /\*\*Other\*\*: 481\/607 wired \(79%\) · 126 unwired/);
  });

  test("readiness === null → degraded notice, no crash", () => {
    const md = renderMarkdown(mkSnapshot(null));
    assert.match(md, /## Ready to use/);
    assert.match(md, /COVERAGE_BY_DOMAIN unavailable/);
    assert.match(md, /build-state-snapshot\.mjs/);
  });

  test("the Ready-to-use section sits between Headline and Graph utilization", () => {
    const md = renderMarkdown(mkSnapshot(computeReadiness(THREE_DOMAINS)));
    const iHead = md.indexOf("## Headline");
    const iReady = md.indexOf("## Ready to use");
    const iGraph = md.indexOf("## Graph utilization");
    assert.ok(iHead >= 0 && iReady >= 0 && iGraph >= 0, "all three sections present");
    assert.ok(iHead < iReady && iReady < iGraph, "ordering: Headline → Ready to use → Graph");
  });

  test("the section the inject hook greps for is byte-stable (findSection contract)", () => {
    // awareness-snapshot-inject.mjs compact() does
    // findSection("Ready to use (built AND wired — invokable now)") — the
    // heading text MUST match this literal or the digest silently drops it.
    const md = renderMarkdown(mkSnapshot(computeReadiness(THREE_DOMAINS)));
    assert.ok(
      md.includes("## Ready to use (built AND wired — invokable now)"),
      "heading must match the inject hook's findSection literal exactly",
    );
  });
});
