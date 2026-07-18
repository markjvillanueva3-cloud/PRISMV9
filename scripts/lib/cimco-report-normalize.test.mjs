#!/usr/bin/env node
/**
 * Tests for the CIMCO sim-report node normalizer (U-CIMCO-SIM-1A).
 *
 * R9 -- each test encodes WHY: this is the testable half of the live report read
 * (the C# MSAA walk is compile-proven + operator-gated). The dangerous failure is
 * a fail-closed marker (blocked / not-found / opaque / empty) being read as a clean
 * pass -- so every non-grid source MUST carry rows:[] AND it must NOT clear when
 * round-tripped through the real parseSimulationReport verdict gate.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeReportNodes, extractRows, NORMALIZE_SOURCE, CLEARANCE_CAPABLE } from "./cimco-report-normalize.mjs";
import { parseSimulationReport } from "../cimco-control-map.mjs";

const found = (nodes, extra = {}) => ({ ok: true, op: "read-report", frameRealized: true, found: true, nodes, frameNodeCount: 200, ...extra });

// ── happy: the three read shapes ────────────────────────────────────────────
test("GRID joined-row: 'LINE | TYPE | DESC | ACTION' single node -> one structured row", () => {
  const r = normalizeReportNodes(found([{ text: "12 | Collision | tool vs fixture | retract", value: "", role: "listitem", path: "root>Report" }]));
  assert.equal(r.source, NORMALIZE_SOURCE.GRID);
  assert.equal(r.rows.length, 1);
  assert.deepEqual(r.rows[0], { line: 12, type: "Collision", description: "tool vs fixture", action: "retract" });
  // round-trip THROUGH the verdict gate (R15-step2): a collision row must FAIL.
  const v = parseSimulationReport(r.rows);
  assert.equal(v.pass, false);
  assert.equal(v.counts.collision, 1);
  assert.equal(v.firstOffendingLine, 12);
});

test("GRID per-cell: 4 sibling cells under one row-path -> one row", () => {
  const p = "root>Report>Row1";
  const r = normalizeReportNodes(found([
    { text: "45", role: "r29", path: p }, { text: "Over-travel", role: "r29", path: p },
    { text: "Y axis limit", role: "r29", path: p }, { text: "reduce stock", role: "r29", path: p },
  ]));
  assert.equal(r.source, NORMALIZE_SOURCE.GRID);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].line, 45);
  assert.equal(r.rows[0].type, "Over-travel");
  const v = parseSimulationReport(r.rows);
  assert.equal(v.counts.limit, 1, "over-travel classifies as a limit");
  assert.equal(v.pass, false);
});

test("TEXTSCRAPE sequential: distinct-path statictext nodes numeric-anchored into a row", () => {
  // DISTINCT paths -> per-cell grouping does NOT fire (each is a singleton group); the sequential
  // numeric-anchored scrape (TextPattern/Win32-like) is what assembles the row. (Same-path nodes are
  // a grid per-cell read instead -- covered by the GRID per-cell test.)
  const r = normalizeReportNodes(found([
    { text: "9", role: "statictext", path: "root>Out>a" }, { text: "Gouge", role: "statictext", path: "root>Out>b" },
    { text: "into floor", role: "statictext", path: "root>Out>c" },
  ]));
  assert.equal(r.source, NORMALIZE_SOURCE.TEXTSCRAPE);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].line, 9);
  assert.equal(r.rows[0].type, "Gouge");
  assert.equal(parseSimulationReport(r.rows).counts.collision, 1, "a gouge is a cutting crash -> collision");
});

// ── fail-closed ladder: none may read as a clean pass ────────────────────────
test("exe error (ok:false) -> source error, rows:[], blockedBy preserved", () => {
  const r = normalizeReportNodes({ ok: false, op: "read-report", code: "UI_DRIVER_TIMEOUT", error: "killed by timeout" });
  assert.equal(r.source, NORMALIZE_SOURCE.ERROR);
  assert.deepEqual(r.rows, []);
  assert.match(r.blockedBy, /timeout/i);
  assert.equal(r.confidence, 0);
});

test("ribbon-unrealized (found!=true + blockedBy) -> source blocked, passthrough", () => {
  const r = normalizeReportNodes({ ok: true, op: "read-report", frameRealized: false, found: false, blockedBy: "ribbon-uia-unrealized", nodes: null, frameNodeCount: 12 });
  assert.equal(r.source, NORMALIZE_SOURCE.BLOCKED);
  assert.equal(r.blockedBy, "ribbon-uia-unrealized");
  assert.deepEqual(r.rows, []);
});

test("report-grid-not-found -> source no-report, candidates passed through for the live de-risk", () => {
  const r = normalizeReportNodes({ ok: true, op: "read-report", frameRealized: true, found: false, blockedBy: "report-grid-not-found", nodes: null, candidates: [{ text: "Output", role: "list", path: "root" }], frameNodeCount: 300 });
  assert.equal(r.source, NORMALIZE_SOURCE.NO_REPORT);
  assert.equal(r.blockedBy, "report-grid-not-found");
  assert.equal(r.candidates.length, 1);
});

test("found:true but 0 nodes -> empty-report; parseSimulationReport keeps it NOT cleared (fail-OPEN guard)", () => {
  const r = normalizeReportNodes(found([]));
  assert.equal(r.source, NORMALIZE_SOURCE.EMPTY);
  assert.deepEqual(r.rows, []);
  const v = parseSimulationReport(r.rows); // [] => pass conformance-only but NOT cleared
  assert.equal(v.pass, true);
  assert.equal(v.clearedForLiveRun, false, "an empty report is NEVER cleared without explicit collisionCheckRan");
});

test("found:true, nodes present but unparseable -> opaque + blockedBy (fail-closed, never a clean empty)", () => {
  const r = normalizeReportNodes(found([
    { text: "Simulating...", role: "statictext", path: "root>x" }, { text: "Please wait", role: "statictext", path: "root>x" },
  ]));
  assert.equal(r.source, NORMALIZE_SOURCE.OPAQUE);
  assert.equal(r.blockedBy, "uia-report-grid-opaque");
  assert.deepEqual(r.rows, []);
});

test("LIVE header-only grid (real capture: 4 column headers + empty Report Row) -> header-only, NEVER clears", () => {
  // Verbatim shape from state/shared/cimco/live-report-structure.json: the report realized with its
  // column captions but the only row is the empty "Report Row" template -> 0 data rows. AMBIGUOUS
  // (clean run vs collision pass not triggered) -> must be a distinct NON-clearing label, not opaque.
  const r = normalizeReportNodes(found([
    { text: "Report Header", value: "", role: "r25", path: "Report>Report" },
    { text: "Start Time (Line)", value: "", role: "r25", path: "Report>Report>Report Header" },
    { text: "Type", value: "", role: "r25", path: "Report>Report>Report Header" },
    { text: "Message", value: "", role: "r25", path: "Report>Report>Report Header" },
    { text: "Action", value: "", role: "r25", path: "Report>Report>Report Header" },
    { text: "Report Row", value: "", role: "r28", path: "Report>Report" },
  ], { container: { name: "Report", role: "window" } }));
  assert.equal(r.source, NORMALIZE_SOURCE.HEADER_ONLY, "well-formed empty grid is header-only, not opaque");
  assert.equal(r.blockedBy, "report-headers-only-no-data-rows-ambiguous");
  assert.deepEqual(r.rows, []);
  assert.ok(!CLEARANCE_CAPABLE.has(r.source), "header-only must NEVER be clearance-capable -- ambiguous read");
});

test("header-only needs >=2 column tokens: a single stray 'Type' stays opaque (no false header-only)", () => {
  const r = normalizeReportNodes(found([{ text: "Type something here", role: "statictext", path: "root>x" }]));
  assert.equal(r.source, NORMALIZE_SOURCE.OPAQUE, "one token is not a header signature");
});

test("header-only never masks a real data row: headers + a populated collision row -> GRID (parses), not header-only", () => {
  const p = "Report>Report>Report Row";
  const r = normalizeReportNodes(found([
    { text: "Start Time (Line)", role: "r25", path: "Report>Report>Report Header" },
    { text: "Type", role: "r25", path: "Report>Report>Report Header" },
    { text: "Message", role: "r25", path: "Report>Report>Report Header" },
    { text: "Action", role: "r25", path: "Report>Report>Report Header" },
    { text: "21", role: "r29", path: p }, { text: "Collision", role: "r29", path: p },
    { text: "tool vs clamp", role: "r29", path: p }, { text: "retract", role: "r29", path: p },
  ]));
  assert.equal(r.source, NORMALIZE_SOURCE.GRID, "a real data row wins over the header-only fallback");
  assert.equal(parseSimulationReport(r.rows).pass, false, "the collision row must still FAIL");
});

// ── adversarial ──────────────────────────────────────────────────────────────
test("ADVERSARIAL masked stop-event: a Tool-Change row whose DESC hides a collision survives normalization", () => {
  // The normalizer must NOT drop the description -- parseSimulationReport scans it to catch the masked hazard.
  const r = normalizeReportNodes(found([{ text: "30 | Tool Change | COLLISION with fixture |", role: "listitem", path: "root>Report" }]));
  assert.equal(r.rows[0].type, "Tool Change");
  assert.match(r.rows[0].description, /collision/i);
  const v = parseSimulationReport(r.rows);
  assert.equal(v.counts.collision, 1, "masked collision in a stop-event description must still FAIL (not downgrade to warning)");
  assert.equal(v.pass, false);
});

test("ADVERSARIAL value-carried text: a cell whose text is empty but VALUE holds the row is not lost", () => {
  const r = normalizeReportNodes(found([{ text: "", value: "7 | Limit | over-travel X", role: "r29", path: "root>g" }]));
  assert.equal(r.source, NORMALIZE_SOURCE.GRID);
  assert.equal(r.rows[0].line, 7);
  assert.equal(parseSimulationReport(r.rows).counts.limit, 1);
});

test("ADVERSARIAL multi-cell description: middle cells join into description, last becomes action", () => {
  const p = "root>R>row";
  const r = normalizeReportNodes(found([
    { text: "5", role: "r29", path: p }, { text: "Collision", role: "r29", path: p }, { text: "tool", role: "r29", path: p },
    { text: "into", role: "r29", path: p }, { text: "clamp", role: "r29", path: p }, { text: "STOP", role: "r29", path: p },
  ]));
  assert.equal(r.rows[0].line, 5);
  assert.match(r.rows[0].description, /tool into clamp/);
  assert.equal(r.rows[0].action, "STOP");
});

// ── invariants ───────────────────────────────────────────────────────────────
test("null/garbage payload -> source error (never throws, never clears)", () => {
  for (const bad of [null, undefined, 42, "x", []]) {
    const r = normalizeReportNodes(bad);
    assert.equal(r.source, NORMALIZE_SOURCE.ERROR);
    assert.deepEqual(r.rows, []);
  }
});

test("CLEARANCE_CAPABLE encodes the invariant: only real MSAA reads (grid/textscrape/empty) can clear", () => {
  assert.ok(CLEARANCE_CAPABLE.has(NORMALIZE_SOURCE.GRID));
  assert.ok(CLEARANCE_CAPABLE.has(NORMALIZE_SOURCE.TEXTSCRAPE));
  assert.ok(CLEARANCE_CAPABLE.has(NORMALIZE_SOURCE.EMPTY));
  for (const s of [NORMALIZE_SOURCE.OPAQUE, NORMALIZE_SOURCE.HEADER_ONLY, NORMALIZE_SOURCE.BLOCKED, NORMALIZE_SOURCE.NO_REPORT, NORMALIZE_SOURCE.ERROR]) {
    assert.ok(!CLEARANCE_CAPABLE.has(s), `${s} must NOT be clearance-capable`);
  }
});

test("extractRows on all-empty-text nodes -> opaque (no rows fabricated)", () => {
  const e = extractRows([{ text: "", value: "", role: "x", path: "p" }, { text: "   ", value: "", role: "x", path: "p" }]);
  assert.deepEqual(e.rows, []);
  assert.equal(e.source, NORMALIZE_SOURCE.OPAQUE);
});

test("ROUND-TRIP a clean found report (warning + benign tool-change) -> conformance pass", () => {
  // A real read that found only advisory rows must PASS (collision-check demonstrably ran -> findings present).
  const r = normalizeReportNodes(found([
    { text: "3 | Tool Change | T05", role: "listitem", path: "root>R" },
    { text: "8 | Warning | high feed near rapid", role: "listitem", path: "root>R" },
  ]));
  assert.equal(r.source, NORMALIZE_SOURCE.GRID);
  const v = parseSimulationReport(r.rows);
  assert.equal(v.pass, true, "tool-change + warning are advisory, not failures");
  assert.equal(v.clearedForLiveRun, true, "findings present => collision-check confirmed => cleared");
  assert.equal(v.counts.collision, 0);
});
