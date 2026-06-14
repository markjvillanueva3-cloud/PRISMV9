// Tests for silent-close-out-drift.mjs — node:test, no external deps.
// Run: node --test H:/prism/scripts/lib/silent-close-out-drift.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { findSilentCloseOutDrift, buildShippedByMsId, renderMarkdown } from "./silent-close-out-drift.mjs";

test("no drift when envelopes are not complete", () => {
  const envelopes = [
    { id: "MS-A", status: "in_progress", phases: [{ units: [{ id: "U1", status: "complete" }] }] },
    { id: "MS-B", status: "not_started", phases: [{ units: [{ id: "U1", status: "pending" }] }] },
  ];
  const { cases, summary } = findSilentCloseOutDrift({ envelopes, shippedByMsId: new Map() });
  assert.equal(cases.length, 0);
  assert.equal(summary.skipped_not_complete_envelope, 2);
});

test("flags envelope-complete + progress-zero as drift", () => {
  const envelopes = [
    { id: "CAMK-MS0", status: "complete", phases: [{ units: [
      { id: "U01", status: "complete" }, { id: "U02", status: "complete" },
      { id: "U03", status: "complete" }, { id: "U04", status: "complete" },
      { id: "U05", status: "complete" },
    ]}], title: "Feature-to-Toolpath Bridge" },
  ];
  const shipped = new Map([["CAMK-MS0", 0]]);
  const { cases, summary } = findSilentCloseOutDrift({ envelopes, shippedByMsId: shipped });
  assert.equal(cases.length, 1);
  assert.equal(cases[0].milestone_id, "CAMK-MS0");
  assert.equal(cases[0].drift, 5);
  assert.equal(cases[0].units_complete, 5);
  assert.equal(cases[0].total_units, 5);
  assert.equal(cases[0].confidence, "envelope-fully-complete");
  assert.equal(summary.total_hidden_shipped_units, 5);
});

test("does NOT flag when progress matches envelope", () => {
  const envelopes = [
    { id: "MS-CLEAN", status: "complete", phases: [{ units: [
      { id: "U1", status: "complete" }, { id: "U2", status: "complete" },
    ]}] },
  ];
  const shipped = new Map([["MS-CLEAN", 2]]);
  const { cases } = findSilentCloseOutDrift({ envelopes, shippedByMsId: shipped });
  assert.equal(cases.length, 0);
});

test("partial-progress flag — envelope says 5 complete, progress says 2 shipped → drift=+3", () => {
  const envelopes = [
    { id: "MS-PARTIAL", status: "complete", phases: [{ units: [
      { id: "U1", status: "complete" }, { id: "U2", status: "complete" },
      { id: "U3", status: "complete" }, { id: "U4", status: "complete" },
      { id: "U5", status: "complete" },
    ]}] },
  ];
  const shipped = new Map([["MS-PARTIAL", 2]]);
  const { cases } = findSilentCloseOutDrift({ envelopes, shippedByMsId: shipped });
  assert.equal(cases.length, 1);
  assert.equal(cases[0].drift, 3);
});

test("envelope-fully-complete vs envelope-partially-complete confidence", () => {
  const envelopes = [
    // Fully: all 3 units complete
    { id: "MS-FULL", status: "complete", phases: [{ units: [
      { id: "U1", status: "complete" }, { id: "U2", status: "complete" }, { id: "U3", status: "complete" },
    ]}] },
    // Partial: 2 of 3 complete (envelope marked complete anyway — operator override)
    { id: "MS-PART", status: "complete", phases: [{ units: [
      { id: "U1", status: "complete" }, { id: "U2", status: "complete" }, { id: "U3", status: "pending" },
    ]}] },
  ];
  const shipped = new Map([["MS-FULL", 0], ["MS-PART", 0]]);
  const { cases } = findSilentCloseOutDrift({ envelopes, shippedByMsId: shipped });
  assert.equal(cases.length, 2);
  const full = cases.find((c) => c.milestone_id === "MS-FULL");
  const part = cases.find((c) => c.milestone_id === "MS-PART");
  assert.equal(full.confidence, "envelope-fully-complete");
  assert.equal(part.confidence, "envelope-partially-complete");
});

test("minDrift option filters small drifts", () => {
  const envelopes = [
    { id: "MS-TINY",  status: "complete", phases: [{ units: [{ id: "U1", status: "complete" }] }] },
    { id: "MS-BIG",   status: "complete", phases: [{ units: [
      { id: "U1", status: "complete" }, { id: "U2", status: "complete" },
      { id: "U3", status: "complete" }, { id: "U4", status: "complete" },
      { id: "U5", status: "complete" },
    ]}] },
  ];
  const shipped = new Map([["MS-TINY", 0], ["MS-BIG", 0]]);
  const { cases } = findSilentCloseOutDrift({ envelopes, shippedByMsId: shipped, options: { minDrift: 3 } });
  assert.equal(cases.length, 1);
  assert.equal(cases[0].milestone_id, "MS-BIG");
});

test("buildShippedByMsId — accepts both shapes", () => {
  // {milestones:[]} shape
  const mp = { milestones: [{ milestone_id: "A", shipped: 5 }, { id: "B", shipped: 3 }] };
  const map = buildShippedByMsId(mp);
  assert.equal(map.get("A"), 5);
  assert.equal(map.get("B"), 3);

  // direct array shape
  const arr = [{ milestone_id: "X", shipped: 7 }];
  const map2 = buildShippedByMsId(arr);
  assert.equal(map2.get("X"), 7);
});

test("buildShippedByMsId — tolerates missing fields", () => {
  const map = buildShippedByMsId({ milestones: [{ milestone_id: "Z" }] });
  assert.equal(map.get("Z"), 0);
});

test("cases sorted by drift descending", () => {
  const envelopes = [
    { id: "SMALL",  status: "complete", phases: [{ units: [{ id: "U1", status: "complete" }] }] },
    { id: "BIG",    status: "complete", phases: [{ units: [
      { id: "U1", status: "complete" }, { id: "U2", status: "complete" }, { id: "U3", status: "complete" },
    ]}] },
    { id: "MEDIUM", status: "complete", phases: [{ units: [
      { id: "U1", status: "complete" }, { id: "U2", status: "complete" },
    ]}] },
  ];
  const shipped = new Map();
  const { cases } = findSilentCloseOutDrift({ envelopes, shippedByMsId: shipped });
  assert.equal(cases[0].milestone_id, "BIG");
  assert.equal(cases[1].milestone_id, "MEDIUM");
  assert.equal(cases[2].milestone_id, "SMALL");
});

test("renderMarkdown — empty input", () => {
  const md = renderMarkdown([]);
  assert.ok(md.includes("No silent close-out drift"));
});

test("renderMarkdown — formatted rows", () => {
  const cases = [
    { milestone_id: "CAMX-MS22", envelope_status: "complete", units_complete: 20, total_units: 20, progress_shipped: 0, drift: 20, confidence: "envelope-fully-complete" },
    { milestone_id: "CAMK-MS0",  envelope_status: "complete", units_complete: 5,  total_units: 5,  progress_shipped: 0, drift: 5,  confidence: "envelope-fully-complete" },
  ];
  const md = renderMarkdown(cases, 10);
  assert.ok(md.includes("| CAMX-MS22 |"));
  assert.ok(md.includes("**+20**"));
  assert.ok(md.includes("| CAMK-MS0 |"));
});

test("renderMarkdown — topN truncates with footnote", () => {
  const cases = Array.from({ length: 20 }, (_, i) => ({
    milestone_id: `MS-${i}`, envelope_status: "complete",
    units_complete: 1, total_units: 1, progress_shipped: 0, drift: 1,
    confidence: "envelope-fully-complete",
  }));
  const md = renderMarkdown(cases, 5);
  assert.ok(md.includes("MS-0"));
  assert.ok(md.includes("MS-4"));
  assert.ok(!md.includes("| MS-5 |"));
  assert.ok(md.includes("15 more milestones"));
});

test("non-array phases — production envelopes have phases as object/missing/string (fail-on-revert)", () => {
  // Caught in /loop iter-3 live-data run: real envelopes had phases as non-array.
  // Original code did `(env.phases || []).flatMap(...)` which threw TypeError.
  const envelopes = [
    { id: "MS-OBJECT-PHASES",  status: "complete", phases: { not: "an array" } },
    { id: "MS-STRING-PHASES",  status: "complete", phases: "phases-as-string" },
    { id: "MS-NULL-PHASES",    status: "complete", phases: null },
    { id: "MS-OBJECT-UNITS",   status: "complete", phases: [{ units: { not: "an array" } }] },
    { id: "MS-VALID",          status: "complete", phases: [{ units: [{ id: "U", status: "complete" }] }] },
  ];
  const { cases } = findSilentCloseOutDrift({ envelopes, shippedByMsId: new Map() });
  // All malformed envelopes resolve to 0 completed units → not flagged.
  // Only MS-VALID surfaces.
  assert.equal(cases.length, 1);
  assert.equal(cases[0].milestone_id, "MS-VALID");
});

test("flat env.units[] shape — legacy pre-2026-05-12 envelopes (fail-on-revert)", () => {
  // P2.1 fix (/loop iter-6 scrutiny, reviewer B): the helper previously read
  // ONLY nested env.phases[].units, silently skipping legacy flat-shape
  // envelopes — exactly the pre-2026-05-12 class MOST prone to silent
  // close-out debt. flattenEnvelopeUnits must mirror the audit script:
  // prefer flat env.units[], fall back to nested phases[].units.
  const envelopes = [
    // Flat shape, all complete, 0 shipped → must surface as drift +3.
    { id: "MS-FLAT", status: "complete", units: [
      { id: "U1", status: "complete" }, { id: "U2", status: "complete" }, { id: "U3", status: "complete" },
    ] },
    // Flat present but empty → fall back to nested phases.
    { id: "MS-FLAT-EMPTY-FALLBACK", status: "complete", units: [],
      phases: [{ units: [{ id: "U1", status: "complete" }, { id: "U2", status: "complete" }] }] },
    // Flat non-array (object) → coerce [] then nested fallback.
    { id: "MS-FLAT-OBJ", status: "complete", units: { not: "array" },
      phases: [{ units: [{ id: "U1", status: "complete" }] }] },
  ];
  const { cases } = findSilentCloseOutDrift({ envelopes, shippedByMsId: new Map() });
  assert.equal(cases.length, 3);
  const flat = cases.find((c) => c.milestone_id === "MS-FLAT");
  assert.equal(flat.drift, 3);
  assert.equal(flat.units_complete, 3);
  assert.equal(flat.total_units, 3);
  assert.equal(flat.confidence, "envelope-fully-complete");
  assert.equal(cases.find((c) => c.milestone_id === "MS-FLAT-EMPTY-FALLBACK").drift, 2);
  assert.equal(cases.find((c) => c.milestone_id === "MS-FLAT-OBJ").drift, 1);
});

test("null/undefined envelopes handled gracefully", () => {
  const { cases, summary } = findSilentCloseOutDrift({
    envelopes: [null, undefined, { status: "complete" }, { id: "OK", status: "complete", phases: [{ units: [{ id: "U", status: "complete" }] }] }],
    shippedByMsId: new Map(),
  });
  // The {status:complete} entry has no id → skipped. The OK entry has 1 complete unit, drift +1.
  assert.equal(cases.length, 1);
  assert.equal(cases[0].milestone_id, "OK");
});

test("real-world fixture — top-4 verified silent close-outs from 2026-05-17 audit", () => {
  // Snapshot from iter-2 inline analysis (alpha slot, 2026-05-17T23:54Z)
  const envelopes = [
    { id: "CAMX-MS22",       status: "complete", phases: [{ units: Array(20).fill({ id: "U", status: "complete" }) }], title: "Test-Driven Pipeline Validation" },
    { id: "CALC-HARDEN-MS0", status: "complete", phases: [{ units: Array(18).fill({ id: "U", status: "complete" }) }], title: "Safety-Critical Formula Fixes" },
    { id: "CAMX-MS19",       status: "complete", phases: [{ units: Array(15).fill({ id: "U", status: "complete" }) }], title: "PrintToProgram v2 + Multi-Process" },
    { id: "PIPELINE-VAR-MS0", status: "complete", phases: [{ units: Array(15).fill({ id: "U", status: "complete" }) }], title: "Per-Block Variability" },
  ];
  const shipped = new Map([["CAMX-MS22", 0], ["CALC-HARDEN-MS0", 0], ["CAMX-MS19", 0], ["PIPELINE-VAR-MS0", 0]]);
  const { cases, summary } = findSilentCloseOutDrift({ envelopes, shippedByMsId: shipped });
  assert.equal(cases.length, 4);
  assert.equal(cases[0].milestone_id, "CAMX-MS22");
  assert.equal(cases[0].drift, 20);
  assert.equal(summary.total_hidden_shipped_units, 20 + 18 + 15 + 15);
});
