#!/usr/bin/env node
/**
 * Tests for cad-print-classifier.mjs (U-DELTA-PDF-CLASS v1 path-tier).
 * node:test. Run: node scripts/lib/cad-print-classifier.test.mjs
 * R9: real path examples drawn from the ACTUAL 2026-06-27 corpus sample. Each assertion encodes the
 * documented intent (Docustrata=business bulk, resources catalogs=reference, JM DIE=drawing-candidate,
 * business-filename overrides a drawing zone). Happy + >=3 failure/edge + >=2 adversarial.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyPdfPath, summarizeCorpus, normalizeRel, baseName, TIER } from "./cad-print-classifier.mjs";

// ---------- normalizeRel / baseName ----------
test("normalizeRel: strips prism prefix, lowercases, backslash->slash", () => {
  assert.equal(normalizeRel("H:\\prism\\Docustrata\\X.pdf"), "docustrata/x.pdf");
  assert.equal(normalizeRel("/h/prism/JM DIE/a.pdf"), "jm die/a.pdf");
  assert.equal(normalizeRel("C:/foo/prism/resources/Y.pdf"), "resources/y.pdf");
  assert.equal(normalizeRel(null), "");
});
test("baseName: last path segment", () => {
  assert.equal(baseName("jm die/prism jm die/10-010-150-2__p1.pdf"), "10-010-150-2__p1.pdf");
  assert.equal(baseName("noslug"), "noslug");
});

// ---------- Docustrata -> business (the 75% bulk) ----------
test("Docustrata paths classify as business", () => {
  assert.equal(classifyPdfPath("H:/prism/Docustrata/_organized/Scanned Document - 1_13_2022.pdf").tier, TIER.BUSINESS);
  const so = classifyPdfPath("H:/prism/Docustrata/JMD Sales Orders/1441__2024_01_11__p13.pdf");
  assert.equal(so.tier, TIER.BUSINESS);
  assert.ok(so.confidence >= 0.95, "explicit business buckets get high confidence");
  assert.equal(classifyPdfPath("H:/prism/Docustrata/JMD Packing Slips/x.pdf").confidence >= 0.95, true);
});

// ---------- resources reference material ----------
test("resources catalogs / courses -> reference", () => {
  assert.equal(classifyPdfPath("H:/prism/resources/MANUFACTURER_CATALOGS/sandvik.pdf").tier, TIER.REFERENCE);
  assert.equal(classifyPdfPath("H:/prism/resources/MIT COURSES/2_008/lec1.pdf").tier, TIER.REFERENCE);
  assert.equal(classifyPdfPath("H:/prism/resources/OPEN MIND/hypermill.pdf").tier, TIER.REFERENCE);
});

// ---------- JM DIE drawing zone -> drawing-candidate (NOT "drawing" -- honest) ----------
test("JM DIE part PDFs -> drawing-candidate (content tier confirms later)", () => {
  const c = classifyPdfPath("H:/prism/JM DIE/Prism JM Die/A225108HK-6__2024_08_14__p2.pdf");
  assert.equal(c.tier, TIER.DRAWING_CANDIDATE);
  assert.ok(c.confidence < 0.95, "a candidate is NOT a confirmed drawing");
  assert.equal(classifyPdfPath("H:/prism/resources/RESOURCE PDFS/print.pdf").tier, TIER.DRAWING_CANDIDATE);
});

// ---------- business-filename overrides a drawing zone (ADVERSARIAL) ----------
test("a Purchase_Order/Packing filename inside JM DIE overrides to business", () => {
  assert.equal(
    classifyPdfPath("H:/prism/JM DIE/Prism JM Die/026b1c21__11242025_Purchase_Order_001__p11.pdf").tier,
    TIER.BUSINESS,
    "a PO scanned into a part folder is still business",
  );
  assert.equal(classifyPdfPath("H:/prism/JM DIE/Prism JM Die/8257__Packing Slip.pdf").tier, TIER.BUSINESS);
});

// ---------- unknown + adversarial empties ----------
test("no-signal paths -> unknown; empty/null safe", () => {
  assert.equal(classifyPdfPath("H:/prism/some/random/file.pdf").tier, TIER.UNKNOWN);
  assert.equal(classifyPdfPath("").tier, TIER.UNKNOWN);
  assert.equal(classifyPdfPath(null).tier, TIER.UNKNOWN);
});

// ---------- summarizeCorpus ----------
test("summarizeCorpus buckets a mixed list with real counts", () => {
  const s = summarizeCorpus([
    "H:/prism/Docustrata/_organized/a.pdf",
    "H:/prism/Docustrata/JMD Quotes/b.pdf",
    "H:/prism/resources/MIT COURSES/c.pdf",
    "H:/prism/JM DIE/Prism JM Die/433230__2025_02_04__p2.pdf",
    "H:/prism/JM DIE/Prism JM Die/x__Invoice.pdf",
    "H:/prism/elsewhere/z.pdf",
  ]);
  assert.equal(s.total, 6);
  assert.equal(s.byTier[TIER.BUSINESS], 3, "2 docustrata + 1 invoice-in-JM");
  assert.equal(s.byTier[TIER.REFERENCE], 1);
  assert.equal(s.byTier[TIER.DRAWING_CANDIDATE], 1);
  assert.equal(s.byTier[TIER.UNKNOWN], 1);
  assert.ok(s.meanConfidence > 0 && s.meanConfidence <= 1);
  assert.equal(s.drawingCandidates, 1);
});

// ---------- summarizeCorpus: adversarial (non-strings skipped, never throws) ----------
test("summarizeCorpus skips non-strings/empties, never throws", () => {
  const s = summarizeCorpus(["H:/prism/Docustrata/a.pdf", null, 42, "", "  "]);
  assert.equal(s.total, 1);
  assert.equal(s.byTier[TIER.BUSINESS], 1);
  assert.equal(summarizeCorpus("notarray").total, 0);
});
