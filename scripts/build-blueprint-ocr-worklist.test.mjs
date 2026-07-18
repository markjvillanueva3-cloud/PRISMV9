// scripts/build-blueprint-ocr-worklist.test.mjs
// Tests for the blueprint-PDF selection predicate (U-PSGB-XRAY-BATCH #6 helper).
// Run: node --test <file>
import { test } from "node:test";
import assert from "node:assert/strict";
import { looksLikeBlueprint } from "./build-blueprint-ocr-worklist.mjs";

const OK = 200000; // a sane mid-size pdf

test("accepts drawing-folder / drawing-named PDFs of sane size", () => {
  assert.equal(looksLikeBlueprint("H:/JM DIE/CNC LATHE/ELECTRODE/x.pdf", "x.pdf", OK), true);
  assert.equal(looksLikeBlueprint("H:/a/Scanned Document - 1.pdf", "Scanned Document - 1.pdf", OK), true);
  assert.equal(looksLikeBlueprint("H:/a/9007405.pdf", "9007405.pdf", OK), true); // digit-named PN
  assert.equal(looksLikeBlueprint("H:/a/part-drawing.pdf", "part-drawing.pdf", OK), true);
});
test("rejects non-PDF", () => {
  assert.equal(looksLikeBlueprint("H:/a/9007405.min", "9007405.min", OK), false);
  assert.equal(looksLikeBlueprint("H:/a/draw.step", "draw.step", OK), false);
});
test("rejects multi-page manuals/catalogs (not single prints)", () => {
  assert.equal(looksLikeBlueprint("H:/a/SMW SPACE SAVER MANUAL.pdf", "SMW SPACE SAVER MANUAL.pdf", OK), false);
  assert.equal(looksLikeBlueprint("H:/a/tool catalog.pdf", "tool catalog.pdf", OK), false);
});
test("rejects digit-led BUSINESS docs (invoice/quote/PO would burn overnight VLM time)", () => {
  assert.equal(looksLikeBlueprint("H:/a/4500123 invoice.pdf", "4500123 invoice.pdf", OK), false);
  assert.equal(looksLikeBlueprint("H:/a/12345 quote.pdf", "12345 quote.pdf", OK), false);
  assert.equal(looksLikeBlueprint("H:/a/PO 99887.pdf", "PO 99887.pdf", OK), false);
  assert.equal(looksLikeBlueprint("H:/a/packing slip 555.pdf", "packing slip 555.pdf", OK), false);
});
test("rejects out-of-size-band files (tiny stub / huge)", () => {
  // use a drawing-ish name so the assertion isolates the SIZE band, not the name filter
  assert.equal(looksLikeBlueprint("H:/a/drawing.pdf", "drawing.pdf", 5000), false);      // too small
  assert.equal(looksLikeBlueprint("H:/a/drawing.pdf", "drawing.pdf", 9_000_000), false); // too big
  assert.equal(looksLikeBlueprint("H:/a/drawing.pdf", "drawing.pdf", 15000), true);      // lower bound inclusive
});
test("rejects a non-drawing-named PDF that isn't digit-led", () => {
  assert.equal(looksLikeBlueprint("H:/a/invoice.pdf", "invoice.pdf", OK), false);
  assert.equal(looksLikeBlueprint("H:/a/quote-letter.pdf", "quote-letter.pdf", OK), false);
});
test("null/empty inputs → false (no crash)", () => {
  assert.equal(looksLikeBlueprint(null, null, null), false);
  assert.equal(looksLikeBlueprint("", "", 0), false);
});
