// scripts/lib/docustrata-doc-pipeline-lib.test.mjs
//
// U-QP-DOCUSTRATA-RUN-ALL (slot:charlie) -- real-value tests for the pure core
// of the run-all-documents pipeline. Every test encodes WHY the stage matters:
// a starved/mis-routed pipeline is exactly the failure mode that left the closed
// loop training on 10 curated pairs, so the routing + funnel invariants are the
// load-bearing assertions here.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TARGET_ROLES,
  DEFAULT_MIN_ROLE_CONFIDENCE,
  DEFAULT_TEXT_LAYER_MIN_CHARS,
  FOLDER_ROLE_MAP,
  isWorkSetDoc,
  selectDocumentWorkSet,
  buildWorkSetFromFolders,
  routeDocument,
  partitionByRoute,
  buildWorklistPaths,
  parseDocTextCheckpoint,
  mergeTextIntoRecord,
  coverageFunnel,
} from "./docustrata-doc-pipeline-lib.mjs";

function rec(o = {}) {
  return { inferred_role: "QUOTE", role_confidence: 0.9, disk_path: "H:/PRISM/Docustrata/q1.pdf", ...o };
}

// ---- isWorkSetDoc ---------------------------------------------------------

test("isWorkSetDoc: a confident quote with a disk path qualifies", () => {
  assert.equal(isWorkSetDoc(rec()), true);
});

test("isWorkSetDoc: every TARGET_ROLE at threshold qualifies, off-roles do not", () => {
  for (const role of TARGET_ROLES) {
    assert.equal(isWorkSetDoc(rec({ inferred_role: role, role_confidence: DEFAULT_MIN_ROLE_CONFIDENCE })), true, role);
  }
  assert.equal(isWorkSetDoc(rec({ inferred_role: "BLUEPRINT" })), false);
  assert.equal(isWorkSetDoc(rec({ inferred_role: "UNKNOWN" })), false);
});

test("isWorkSetDoc: confidence strictly below the gate is rejected (no wasted OCR on rows the extractor would drop)", () => {
  assert.equal(isWorkSetDoc(rec({ role_confidence: 0.49 })), false);
  assert.equal(isWorkSetDoc(rec({ role_confidence: DEFAULT_MIN_ROLE_CONFIDENCE })), true);
});

test("isWorkSetDoc: a record with no resolvable disk_path cannot be processed", () => {
  assert.equal(isWorkSetDoc(rec({ disk_path: "" })), false);
  assert.equal(isWorkSetDoc(rec({ disk_path: undefined })), false);
});

test("isWorkSetDoc: null / non-object / missing confidence are rejected, never throw", () => {
  assert.equal(isWorkSetDoc(null), false);
  assert.equal(isWorkSetDoc(undefined), false);
  assert.equal(isWorkSetDoc(42), false);
  assert.equal(isWorkSetDoc(rec({ role_confidence: undefined })), false);
  assert.equal(isWorkSetDoc(rec({ role_confidence: "high" })), false);
});

test("isWorkSetDoc: a custom role/confidence override is honored", () => {
  assert.equal(isWorkSetDoc(rec({ inferred_role: "PACKING_SLIP" }), { roles: ["PACKING_SLIP"] }), true);
  assert.equal(isWorkSetDoc(rec({ role_confidence: 0.6 }), { minRoleConfidence: 0.7 }), false);
});

// ---- selectDocumentWorkSet ------------------------------------------------

test("selectDocumentWorkSet: counts matched docs by role and reports the true total", () => {
  const records = [
    rec({ inferred_role: "QUOTE" }),
    rec({ inferred_role: "QUOTE" }),
    rec({ inferred_role: "INVOICE" }),
    rec({ inferred_role: "BLUEPRINT" }),          // off-role -> excluded
    rec({ inferred_role: "QUOTE", role_confidence: 0.1 }), // low conf -> excluded
  ];
  const r = selectDocumentWorkSet(records);
  assert.equal(r.total, 5);
  assert.equal(r.matched, 3);
  assert.equal(r.byRole.QUOTE, 2);
  assert.equal(r.byRole.INVOICE, 1);
  assert.equal(r.docs.length, 3);
});

test("selectDocumentWorkSet: non-array input is fail-soft (empty work-set, total 0)", () => {
  const r = selectDocumentWorkSet(null);
  assert.equal(r.total, 0);
  assert.equal(r.matched, 0);
  assert.deepEqual(r.docs, []);
});

// ---- routeDocument --------------------------------------------------------

test("routeDocument: needs_ocr:true ALWAYS forces the OCR route, even with a text layer present", () => {
  // The index already decided this doc has no usable layer -- trust it.
  assert.equal(routeDocument({ needs_ocr: true, has_text_layer: true, text_layer_chars: 9999 }), "ocr");
});

test("routeDocument: a born-digital doc with a long text layer takes the cheap pypdf route", () => {
  assert.equal(routeDocument({ has_text_layer: true, text_layer_chars: 5000 }), "textLayer");
  assert.equal(routeDocument({ text_layer_chars: DEFAULT_TEXT_LAYER_MIN_CHARS }), "textLayer");
});

test("routeDocument: a short or absent text layer falls through to OCR (a scan must not be skipped as empty)", () => {
  assert.equal(routeDocument({ has_text_layer: true, text_layer_chars: 10 }), "ocr");
  assert.equal(routeDocument({ text_layer_chars: 0 }), "ocr");
  assert.equal(routeDocument({}), "ocr");
  assert.equal(routeDocument(null), "ocr");
});

test("routeDocument: the text-layer threshold is configurable", () => {
  assert.equal(routeDocument({ text_layer_chars: 300 }, { textLayerMinChars: 500 }), "ocr");
  assert.equal(routeDocument({ text_layer_chars: 600 }, { textLayerMinChars: 500 }), "textLayer");
});

// ---- partitionByRoute -----------------------------------------------------

test("partitionByRoute: splits the work-set into the two routes without loss", () => {
  const docs = [
    { disk_path: "a.pdf", has_text_layer: true, text_layer_chars: 4000 },
    { disk_path: "b.pdf", needs_ocr: true },
    { disk_path: "c.pdf", text_layer_chars: 0 },
    { disk_path: "d.pdf", has_text_layer: true, text_layer_chars: 800 },
  ];
  const p = partitionByRoute(docs);
  assert.equal(p.textLayer.length, 2);
  assert.equal(p.ocr.length, 2);
  // conservation: every doc lands in exactly one bucket
  assert.equal(p.textLayer.length + p.ocr.length, docs.length);
});

// ---- buildWorklistPaths ---------------------------------------------------

test("buildWorklistPaths: de-duplicates while preserving first-seen order", () => {
  const docs = [
    { disk_path: "H:/a.pdf" },
    { disk_path: "H:/b.pdf" },
    { disk_path: "H:/a.pdf" }, // dup
    { disk_path: "  H:/c.pdf  " }, // trimmed
    { disk_path: "" },             // skipped
    { nope: 1 },                    // skipped
  ];
  assert.deepEqual(buildWorklistPaths(docs), ["H:/a.pdf", "H:/b.pdf", "H:/c.pdf"]);
});

test("buildWorklistPaths: non-array is fail-soft", () => {
  assert.deepEqual(buildWorklistPaths(null), []);
});

// ---- parseDocTextCheckpoint -----------------------------------------------

test("parseDocTextCheckpoint: indexes only ok==true rows with non-empty text", () => {
  const jsonl = [
    JSON.stringify({ path: "a.pdf", text: "QUOTE TOTAL: $100", ok: true }),
    JSON.stringify({ path: "b.pdf", text: "", ok: true }),        // empty text -> skip
    JSON.stringify({ path: "c.pdf", text: "INVOICE", ok: false }), // failed -> skip
    "{ not valid json",                                            // malformed -> skip
    JSON.stringify({ path: "d.pdf", text: "SALES ORDER", ok: true }),
  ].join("\n");
  const m = parseDocTextCheckpoint(jsonl);
  assert.equal(m.size, 2);
  assert.equal(m.get("a.pdf"), "QUOTE TOTAL: $100");
  assert.equal(m.get("d.pdf"), "SALES ORDER");
  assert.equal(m.has("b.pdf"), false);
  assert.equal(m.has("c.pdf"), false);
});

test("parseDocTextCheckpoint: last write for a path wins (resume re-processing)", () => {
  const jsonl = [
    JSON.stringify({ path: "a.pdf", text: "OLD", ok: true }),
    JSON.stringify({ path: "a.pdf", text: "NEW", ok: true }),
  ].join("\n");
  assert.equal(parseDocTextCheckpoint(jsonl).get("a.pdf"), "NEW");
});

test("parseDocTextCheckpoint: empty / non-string input is fail-soft", () => {
  assert.equal(parseDocTextCheckpoint("").size, 0);
  assert.equal(parseDocTextCheckpoint(null).size, 0);
});

// ---- mergeTextIntoRecord --------------------------------------------------

test("mergeTextIntoRecord: writes text to BOTH rec.text and rec.extracted.text (extractor reads either)", () => {
  const m = new Map([["q1.pdf", "BILL TO: ACME\nQUOTE TOTAL: $500"]]);
  const merged = mergeTextIntoRecord(rec({ disk_path: "q1.pdf" }), m);
  assert.equal(merged.text, "BILL TO: ACME\nQUOTE TOTAL: $500");
  assert.equal(merged.extracted.text, "BILL TO: ACME\nQUOTE TOTAL: $500");
  assert.equal(merged.inferred_role, "QUOTE"); // original fields preserved
});

test("mergeTextIntoRecord: preserves an existing extracted object's other fields", () => {
  const m = new Map([["q1.pdf", "TXT"]]);
  const merged = mergeTextIntoRecord(rec({ disk_path: "q1.pdf", extracted: { pages: 3 } }), m);
  assert.equal(merged.extracted.pages, 3);
  assert.equal(merged.extracted.text, "TXT");
});

test("mergeTextIntoRecord: returns null when no text exists for the record (caller skips it)", () => {
  assert.equal(mergeTextIntoRecord(rec({ disk_path: "missing.pdf" }), new Map()), null);
  assert.equal(mergeTextIntoRecord(rec({ disk_path: "" }), new Map([["", "x"]])), null);
  assert.equal(mergeTextIntoRecord(null, new Map()), null);
});

// ---- coverageFunnel -------------------------------------------------------

test("coverageFunnel: stage percentages are relative to the stage above (no hidden starvation)", () => {
  const f = coverageFunnel({
    totalClassified: 73506, roleMatched: 35000, byRole: { QUOTE: 955, INVOICE: 12761 },
    routeTextLayer: 20000, routeOcr: 15000,
    textObtained: 30000, extractorQualified: 28000, pairs: 4200,
  });
  assert.equal(f.total_classified, 73506);
  assert.equal(f.role_matched, 35000);
  assert.equal(f.text_obtained, 30000);
  assert.equal(f.text_obtained_pct_of_matched, 85.7); // 30000/35000
  assert.equal(f.pairs, 4200);
  assert.equal(f.pairs_pct_of_matched, 12); // 4200/35000
  assert.equal(f.by_role.QUOTE, 955);
});

test("coverageFunnel: a zero-text (starved) pipeline reports 0% obtained -- the bug it exists to surface", () => {
  const f = coverageFunnel({ totalClassified: 73506, roleMatched: 35000, routeTextLayer: 0, routeOcr: 35000, textObtained: 0, pairs: 0 });
  assert.equal(f.text_obtained_pct_of_matched, 0);
  assert.equal(f.pairs_pct_of_matched, 0);
});

test("coverageFunnel: garbage / missing fields are fail-soft to 0, never NaN, and the result is frozen", () => {
  const f = coverageFunnel({ totalClassified: "x", roleMatched: -5, textObtained: NaN });
  assert.equal(f.total_classified, 0);
  assert.equal(f.role_matched, 0);
  assert.equal(f.text_obtained, 0);
  assert.equal(f.role_matched_pct_of_total, 0); // den 0 -> 0, not NaN
  assert.equal(Object.isFrozen(f), true);
});

// ---- buildWorkSetFromFolders (the real corpus source) ---------------------

test("FOLDER_ROLE_MAP: the JMD folders map to the correct ground-truth roles", () => {
  assert.equal(FOLDER_ROLE_MAP["JMD Quotes"], "QUOTE");
  assert.equal(FOLDER_ROLE_MAP["JMD Sales Orders"], "SALES_ORDER");
  assert.equal(FOLDER_ROLE_MAP["JMD Orders Closed"], "CLOSED_ORDER");
});

test("buildWorkSetFromFolders: each PDF becomes a confidence-1.0 record routed text-layer-first", () => {
  const ws = buildWorkSetFromFolders({
    QUOTE: ["H:/q1.pdf", "H:/q2.pdf"],
    CLOSED_ORDER: ["H:/c1.pdf"],
  });
  assert.equal(ws.matched, 3);
  assert.equal(ws.byRole.QUOTE, 2);
  assert.equal(ws.byRole.CLOSED_ORDER, 1);
  const q = ws.docs.find((d) => d.disk_path === "H:/q1.pdf");
  assert.equal(q.inferred_role, "QUOTE");
  assert.equal(q.role_confidence, 1.0); // folder name IS the ground truth
  assert.equal(q.source, "folder");
  // routeDocument must honor the explicit text-layer-first route (no index metadata exists)
  assert.equal(routeDocument(q), "textLayer");
});

test("buildWorkSetFromFolders: a folder-sourced work-set passes the extractor's role gate", () => {
  const ws = buildWorkSetFromFolders({ QUOTE: ["H:/q1.pdf"] });
  // confidence 1.0 + a target role + a disk_path -> isWorkSetDoc accepts it
  assert.equal(isWorkSetDoc(ws.docs[0]), true);
});

test("buildWorkSetFromFolders: de-dups a path that appears under two roles (first wins)", () => {
  const ws = buildWorkSetFromFolders({ QUOTE: ["H:/dup.pdf"], SALES_ORDER: ["H:/dup.pdf", "H:/s2.pdf"] });
  assert.equal(ws.matched, 2);
  assert.equal(ws.docs.filter((d) => d.disk_path === "H:/dup.pdf").length, 1);
});

test("buildWorkSetFromFolders: roles filter restricts which folders are ingested", () => {
  const ws = buildWorkSetFromFolders(
    { QUOTE: ["H:/q1.pdf"], PACKING_SLIP: ["H:/p1.pdf"] },
    { roles: ["QUOTE"] },
  );
  assert.equal(ws.matched, 1);
  assert.equal(ws.byRole.QUOTE, 1);
  assert.equal(ws.byRole.PACKING_SLIP, undefined);
});

test("buildWorkSetFromFolders: garbage input is fail-soft (empty work-set)", () => {
  assert.equal(buildWorkSetFromFolders(null).matched, 0);
  assert.equal(buildWorkSetFromFolders({ QUOTE: "not-an-array" }).matched, 0);
});

test("routeDocument: an explicit _route override wins over index metadata", () => {
  // needs_ocr would normally force OCR, but an explicit text-layer route wins
  // (lets the cheap pypdf probe run first on a folder doc).
  assert.equal(routeDocument({ _route: "textLayer", needs_ocr: true }), "textLayer");
  assert.equal(routeDocument({ _route: "ocr", has_text_layer: true, text_layer_chars: 9999 }), "ocr");
});
