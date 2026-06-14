// scripts/build-print-corpus-manifest.test.mjs
// Tests for the print-corpus bucketing (STEP 2). classifyDoc is the SINGLE source of the
// drawing/ambiguous/excluded rule — both the manifest counts and the VLM worklist flow through it,
// so a wrong verdict here = either burning VLM time on a sales order (excluded leaking to drawing)
// or silently dropping a real print (drawing leaking to excluded). Each test encodes WHY a bucket
// verdict matters against the verified JM data reality (every text-layer doc also needs_ocr;
// print_score is a signed integer; role is the primary signal).

import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyDoc, DRAWING_ROLES, AMBIGUOUS_ROLES, BUSINESS_ROLES } from "./build-print-corpus-manifest.mjs";

test("PRINT/LASER_SHEET role → drawing bucket (the VLM worklist), regardless of low print_score", () => {
  // role=PRINT docs scored ~21 but ALSO needs_ocr — the role is the authoritative drawing signal.
  assert.equal(classifyDoc({ role: "PRINT", print_score: 21, has_text_layer: true, needs_ocr: true, mime: "application/pdf" }).bucket, "drawing");
  assert.equal(classifyDoc({ role: "LASER_SHEET", print_score: 3, mime: "application/pdf" }).bucket, "drawing");
});

test("high print_score with a non-business role → drawing even if role isn't PRINT", () => {
  // A drawing the classifier didn't tag PRINT but scored high must still reach the VLM worklist.
  const r = classifyDoc({ role: "OTHER_DRAWING", print_score: 12, needs_ocr: true, mime: "application/pdf" }, { printScoreFloor: 5 });
  assert.equal(r.bucket, "drawing");
  assert.match(r.reason, /print_score 12>=5/);
});

test("business roles → excluded, NEVER drawing (the whole point — don't OCR 79K sales orders)", () => {
  for (const role of ["NOTE", "SALES_ORDER", "CLOSED_ORDER", "SCAN_BUSINESS", "PACKING_SLIP", "QUOTE"]) {
    const r = classifyDoc({ role, print_score: 0, needs_ocr: true, mime: "application/pdf" });
    assert.equal(r.bucket, "excluded", `${role} must be excluded`);
    assert.match(r.reason, /business role/);
  }
  // adversarial: a business doc with an accidental positive print_score is STILL excluded.
  assert.equal(classifyDoc({ role: "SALES_ORDER", print_score: 30, mime: "application/pdf" }).bucket, "excluded");
});

test("scanned/unclassified that needs OCR → ambiguous (may hide a print; lower priority)", () => {
  assert.equal(classifyDoc({ role: "SCAN_GENERIC", needs_ocr: true, print_score: 0, mime: "application/pdf" }).bucket, "ambiguous");
  assert.equal(classifyDoc({ role: "UNKNOWN", needs_ocr: true, print_score: 0, mime: "application/pdf" }).bucket, "ambiguous");
  // a scanned doc that does NOT need OCR (has a full text layer) → not ambiguous → excluded (no drawing signal)
  assert.equal(classifyDoc({ role: "SCAN_GENERIC", needs_ocr: false, print_score: 0, mime: "application/pdf" }).bucket, "excluded");
});

test("non-PDF mime → excluded (the VLM raster path is PDF→PNG; .html/.jpg aren't single prints here)", () => {
  assert.equal(classifyDoc({ role: "PRINT", mime: "text/html" }).bucket, "excluded");
  assert.equal(classifyDoc({ role: "PRINT", mime: "image/jpeg" }).bucket, "excluded");
  // null/absent mime defaults to PDF (the corpus is overwhelmingly PDF) → role decides
  assert.equal(classifyDoc({ role: "PRINT", mime: null }).bucket, "drawing");
  assert.equal(classifyDoc({ role: "PRINT" }).bucket, "drawing");
});

test("no drawing signal (unknown role, no score, not needs_ocr) → excluded with explicit reason", () => {
  const r = classifyDoc({ role: "MISC", print_score: 0, needs_ocr: false, mime: "application/pdf" });
  assert.equal(r.bucket, "excluded");
  assert.match(r.reason, /no drawing signal/);
});

test("print_score floor is honored (a doc at floor-1 is NOT a drawing on score alone)", () => {
  assert.equal(classifyDoc({ role: "MISC", print_score: 4, needs_ocr: false, mime: "application/pdf" }, { printScoreFloor: 5 }).bucket, "excluded");
  assert.equal(classifyDoc({ role: "MISC", print_score: 5, needs_ocr: false, mime: "application/pdf" }, { printScoreFloor: 5 }).bucket, "drawing");
});

test("adversarial: malformed/empty doc never throws, defaults to excluded", () => {
  assert.equal(classifyDoc({}).bucket, "excluded");          // empty → role UNKNOWN, no needs_ocr → excluded
  assert.equal(classifyDoc(null).bucket, "excluded");        // null doc → still PDF default, role UNKNOWN → excluded
  assert.equal(classifyDoc({ print_score: NaN, mime: "application/pdf" }).bucket, "excluded");
});

test("role sets are disjoint (a role can't be both a drawing and business — no double-count)", () => {
  for (const r of DRAWING_ROLES) assert.ok(!BUSINESS_ROLES.has(r), `${r} in both DRAWING and BUSINESS`);
  for (const r of AMBIGUOUS_ROLES) { assert.ok(!BUSINESS_ROLES.has(r) && !DRAWING_ROLES.has(r), `${r} overlaps`); }
});
