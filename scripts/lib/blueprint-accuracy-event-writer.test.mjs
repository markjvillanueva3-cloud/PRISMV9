// Tests for blueprint-accuracy-event-writer.mjs (U-BPA-EVENT-WRITER-LIB, slot:india).
//
// R9 intent: this is the canonical WRITER that closes the MCP-path RAG-extraction
// loop. The pins that matter: (1) a RAG BlueprintExtraction becomes a correctly
// TYPED outcome_record (so the consumer routes it to xproc_outcome_record, NOT
// the unknown bucket that silently drops a learning signal); (2) the writer is
// fail-LOUD on garbage but fail-SOFT on I/O (drop-in for the existing recordEvent
// adapters); (3) the round-trip THROUGH the real consumer-lib is proven, so the
// future dispatcher wiring is de-risked to a one-liner.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildExtractionOutcomeEvent,
  appendAccuracyEvent,
  recordExtractionOutcome,
  DEFAULT_EVENTS_FILE,
} from "./blueprint-accuracy-event-writer.mjs";
import {
  applyEvents,
  parseEventsBlob,
  EVENT_TO_XPROC_ACTION,
  KNOWN_EVENT_TYPES,
} from "./blueprint-accuracy-consumer-lib.mjs";

// A realistic BlueprintExtractionRAGEngine `BlueprintExtraction` (regions[]/sources[]).
function ragExtraction(over = {}) {
  return {
    extractionId: "bpe-rag:JM_DIE_26815:5:2026-06-24T00:00:00.000Z",
    pdfPath: "JM DIE/Prism JM Die/AAAS/26815/26815__Scanned.pdf",
    page: 5,
    customer: "AAAS",
    familyMatchId: "fam:pin_revolve",
    regions: [
      { regionId: "r1", dimType: "diameter", value: ".5000/.4995", confidence: 0.9, confidenceLower: 0.81, confidenceUpper: 0.945 },
      { regionId: "r2", dimType: "linear", value: "4.000", confidence: 0.8, confidenceLower: 0.72, confidenceUpper: 0.84 },
    ],
    sources: [
      { kind: "similar_print", id: "sim:26814", title: "prior pin 26814", score: 0.77 },
    ],
    confidenceFloor: "normal",
    contradictionsDetected: [],
    extractedAt: "2026-06-24T00:00:00.000Z",
    backendId: "ollama-vision",
    ...over,
  };
}

const FIXED_NOW = () => "2026-06-24T12:00:00.000Z";

// ── builder: happy path ──────────────────────────────────────────────────────

test("buildExtractionOutcomeEvent: maps a RAG extraction to a typed outcome_record", () => {
  const ev = buildExtractionOutcomeEvent(ragExtraction(), { now: FIXED_NOW });
  assert.equal(ev.type, "outcome_record");
  assert.equal(ev.ts, "2026-06-24T12:00:00.000Z");
  assert.equal(ev.payload.kind, "rag_extraction");
  assert.equal(ev.payload.pdf_path, "JM DIE/Prism JM Die/AAAS/26815/26815__Scanned.pdf");
  assert.equal(ev.payload.page, 5);
  assert.equal(ev.payload.customer, "AAAS");
  assert.equal(ev.payload.backend_id, "ollama-vision");
  assert.equal(ev.payload.extraction_id, "bpe-rag:JM_DIE_26815:5:2026-06-24T00:00:00.000Z");
  assert.equal(ev.payload.region_count, 2);
  assert.equal(ev.payload.source_count, 1);
  assert.equal(ev.payload.sources_cited, true);
  assert.equal(ev.payload.family_match_id, "fam:pin_revolve");
  assert.equal(ev.payload.confidence_floor, "normal");
  assert.equal(ev.payload.contradictions_detected, 0);
  // mean(0.9, 0.8) = 0.85
  assert.ok(Math.abs(ev.payload.extraction_confidence - 0.85) < 1e-9);
  // full extraction embedded for the miner
  assert.equal(ev.payload.extraction.extractionId, "bpe-rag:JM_DIE_26815:5:2026-06-24T00:00:00.000Z");
  // unconfirmed prediction
  assert.equal(ev.payload.accurate, null);
});

// ── builder: failure modes (>=3) ─────────────────────────────────────────────

test("buildExtractionOutcomeEvent: throws on non-object / missing pdfPath / missing extractionId", () => {
  assert.throws(() => buildExtractionOutcomeEvent(null), /must be an object/);
  assert.throws(() => buildExtractionOutcomeEvent("nope"), /must be an object/);
  assert.throws(() => buildExtractionOutcomeEvent(ragExtraction({ pdfPath: "" })), /pdfPath is required/);
  assert.throws(() => buildExtractionOutcomeEvent(ragExtraction({ pdfPath: undefined })), /pdfPath is required/);
  assert.throws(() => buildExtractionOutcomeEvent(ragExtraction({ extractionId: "" })), /extractionId is required/);
});

// ── builder: adversarial (>=2) ───────────────────────────────────────────────

test("buildExtractionOutcomeEvent: empty regions -> confidence 0; no sources -> sources_cited false + floor preserved", () => {
  // A no-prior, no-region candidate (the engine's low-confidence shape). The
  // event must still be a valid outcome_record -- never dropped -- with the
  // floor surfaced so a consumer knows this was a degraded extraction.
  const ev = buildExtractionOutcomeEvent(
    ragExtraction({ regions: [], sources: [], confidenceFloor: "low_no_prior", contradictionsDetected: ["dim k mismatch"] }),
    { now: FIXED_NOW },
  );
  assert.equal(ev.payload.region_count, 0);
  assert.equal(ev.payload.extraction_confidence, 0);
  assert.equal(ev.payload.source_count, 0);
  assert.equal(ev.payload.sources_cited, false);
  assert.equal(ev.payload.confidence_floor, "low_no_prior");
  assert.equal(ev.payload.contradictions_detected, 1);
});

test("buildExtractionOutcomeEvent: NaN/non-finite region confidence is ignored in the mean (never poisons the signal)", () => {
  const ev = buildExtractionOutcomeEvent(
    ragExtraction({
      regions: [
        { regionId: "r1", dimType: "linear", value: "1", confidence: NaN, confidenceLower: 0, confidenceUpper: 0 },
        { regionId: "r2", dimType: "linear", value: "2", confidence: 0.6, confidenceLower: 0.5, confidenceUpper: 0.63 },
      ],
    }),
    { now: FIXED_NOW },
  );
  // only the finite 0.6 counts
  assert.ok(Math.abs(ev.payload.extraction_confidence - 0.6) < 1e-9);
  assert.equal(ev.payload.region_count, 2);
});

test("buildExtractionOutcomeEvent: missing optional fields degrade to null, never throw", () => {
  const ev = buildExtractionOutcomeEvent(
    { extractionId: "x", pdfPath: "p.pdf" }, // no page/customer/backendId/regions/sources/floor
    { now: FIXED_NOW },
  );
  assert.equal(ev.payload.page, null);
  assert.equal(ev.payload.customer, null);
  assert.equal(ev.payload.backend_id, null);
  assert.equal(ev.payload.family_match_id, null);
  assert.equal(ev.payload.region_count, 0);
  assert.equal(ev.payload.source_count, 0);
  assert.equal(ev.payload.confidence_floor, null);
  assert.equal(ev.payload.accurate, null);
});

// ── appender: I/O contract ───────────────────────────────────────────────────

test("appendAccuracyEvent: round-trips to a temp ledger (one JSON object per line)", () => {
  const dir = mkdtempSync(join(tmpdir(), "bpa-writer-"));
  const ledger = join(dir, "nested", "evt.jsonl"); // nested -> exercises mkdir
  try {
    const e1 = buildExtractionOutcomeEvent(ragExtraction(), { now: FIXED_NOW });
    const e2 = buildExtractionOutcomeEvent(ragExtraction({ extractionId: "bpe-rag:x:1:t" }), { now: FIXED_NOW });
    const r1 = appendAccuracyEvent(e1, { path: ledger });
    const r2 = appendAccuracyEvent(e2, { path: ledger });
    assert.equal(r1.success, true);
    assert.equal(r1.written_to, ledger);
    assert.equal(r2.success, true);
    const lines = readFileSync(ledger, "utf8").split(/\r?\n/).filter(Boolean);
    assert.equal(lines.length, 2);
    assert.deepEqual(JSON.parse(lines[0]), e1);
    assert.deepEqual(JSON.parse(lines[1]), e2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("appendAccuracyEvent: byte-identical to the inline recordEvent impl it consolidates", () => {
  // The existing drivers wrote `JSON.stringify(event) + "\n"`. Prove the
  // canonical appender emits the exact same bytes so swapping them is safe.
  const dir = mkdtempSync(join(tmpdir(), "bpa-writer-"));
  const ledger = join(dir, "evt.jsonl");
  try {
    const ev = buildExtractionOutcomeEvent(ragExtraction(), { now: FIXED_NOW });
    appendAccuracyEvent(ev, { path: ledger });
    const got = readFileSync(ledger, "utf8");
    assert.equal(got, JSON.stringify(ev) + "\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("appendAccuracyEvent: fail-LOUD on a malformed event (never writes garbage)", () => {
  assert.throws(() => appendAccuracyEvent(null), /non-empty string `type`/);
  assert.throws(() => appendAccuracyEvent({}), /non-empty string `type`/);
  assert.throws(() => appendAccuracyEvent({ type: "" }), /non-empty string `type`/);
  assert.throws(() => appendAccuracyEvent({ type: 42 }), /non-empty string `type`/);
});

test("appendAccuracyEvent: fail-SOFT on an I/O error (drop-in for the recordEvent adapters)", () => {
  // A path whose parent is a FILE, not a dir -> mkdir/append fails -> soft return.
  const dir = mkdtempSync(join(tmpdir(), "bpa-writer-"));
  const fileAsParent = join(dir, "afile");
  appendAccuracyEvent({ type: "outcome_record", ts: "t", payload: {} }, { path: fileAsParent }); // create the file
  const bad = join(fileAsParent, "child.jsonl"); // treat the file as a directory
  try {
    const res = appendAccuracyEvent({ type: "outcome_record", ts: "t", payload: {} }, { path: bad });
    assert.equal(res.success, false);
    assert.ok(typeof res.error === "string" && res.error.length > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── THE loop-machinery proof: build -> append -> consumer routes it ──────────

test("loop closure: a built rag_extraction event is consumed as outcome_record (NOT dropped to unknown)", () => {
  const dir = mkdtempSync(join(tmpdir(), "bpa-writer-"));
  const ledger = join(dir, "evt.jsonl");
  try {
    const ext = ragExtraction();
    const out = recordExtractionOutcome(ext, { now: FIXED_NOW, path: ledger });
    assert.equal(out.success, true);

    // Read the ledger exactly as the consumer would, then route it.
    const blob = readFileSync(ledger, "utf8");
    const { events, malformedCount } = parseEventsBlob(blob);
    assert.equal(events.length, 1);
    assert.equal(malformedCount, 0, "the written event must parse cleanly (no malformed line)");
    const { state, actions, summary } = applyEvents(null, events);

    assert.equal(summary.processedCount, 1);
    assert.equal(state.eventCounts.outcome_record, 1);
    assert.equal(state.eventCounts.unknown, 0, "the RAG extraction must NOT drop to the unknown bucket");
    assert.equal(actions.length, 1);
    assert.equal(actions[0].event_type, "outcome_record");
    assert.equal(actions[0].xproc_action, EVENT_TO_XPROC_ACTION.outcome_record);
    // the routed payload still carries the embedded extraction for the miner
    assert.equal(actions[0].payload.kind, "rag_extraction");
    assert.equal(actions[0].payload.extraction.extractionId, ext.extractionId);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loop closure: 25 RAG extractions cross the consolidate threshold (drives retrain)", () => {
  const events = [];
  for (let i = 0; i < 25; i++) {
    events.push(buildExtractionOutcomeEvent(ragExtraction({ extractionId: `bpe-rag:n${i}:1:t` }), { now: FIXED_NOW }));
  }
  const { state, summary } = applyEvents(null, events, { consolidateThreshold: 25 });
  assert.equal(state.eventCounts.outcome_record, 25);
  assert.equal(summary.consolidationTriggeredByThreshold, true, "25 RAG predictions must trip the retrain-consolidate boundary");
});

// ── sanity: the canonical path + invariants ──────────────────────────────────

test("DEFAULT_EVENTS_FILE resolves to the shared ledger (or PRISM_BPA_EVENTS_FILE override)", () => {
  assert.ok(DEFAULT_EVENTS_FILE.replace(/\\/g, "/").endsWith("state/shared/blueprint-accuracy-events.jsonl") ||
    DEFAULT_EVENTS_FILE === process.env.PRISM_BPA_EVENTS_FILE);
});

test("outcome_record is a known consumer type (the alias/route contract holds)", () => {
  assert.ok(KNOWN_EVENT_TYPES.includes("outcome_record"));
  assert.ok(typeof EVENT_TO_XPROC_ACTION.outcome_record === "string" && EVENT_TO_XPROC_ACTION.outcome_record.length > 0);
});
