// scripts/lib/blueprint-trainset-curate-lib.test.mjs
// Tests for the OCR/print→CAD trainset curation core (U-PSGB-XRAY-TRAINSET-CURATE).
// The load-bearing intent (R9): POISON labels (garbage/ambiguous match_confidence) must be
// EXCLUDED from the supervised set, and only TRUSTWORTHY labels (exact/loose + real source)
// kept — the garbage-in-garbage-out guard. Pure, no I/O. Run: node --test <file>
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isCleanLabel, summarizeDrawingScore, curateRecord,
  newCurationStats, accumulate, finalizeCuration,
  TRUSTWORTHY_CONFIDENCE, EXCLUDED_CONFIDENCE, REAL_LABEL_SOURCES,
} from "./blueprint-trainset-curate-lib.mjs";

const rec = (o = {}) => ({ has_print: true, has_program: false, has_cad: false, match_confidence: "exact", label_source: "program", print_docs: [], program_files: [], cad_files: [], part_number: "P1", ...o });

// ── isCleanLabel: the trustworthy/poison boundary ──
test("isCleanLabel: exact/loose + real source → clean; garbage/ambiguous/miss/none → not", () => {
  assert.equal(isCleanLabel(rec({ match_confidence: "exact", label_source: "program" })), true);
  assert.equal(isCleanLabel(rec({ match_confidence: "loose", label_source: "cad" })), true);
  assert.equal(isCleanLabel(rec({ match_confidence: "exact", label_source: "cad+program" })), true);
  assert.equal(isCleanLabel(rec({ match_confidence: "garbage", label_source: "program" })), false, "poison pairing excluded");
  assert.equal(isCleanLabel(rec({ match_confidence: "ambiguous", label_source: "program" })), false);
  assert.equal(isCleanLabel(rec({ match_confidence: "miss", label_source: "none" })), false);
  assert.equal(isCleanLabel(rec({ match_confidence: "exact", label_source: "none" })), false, "trustworthy conf but no real source");
  assert.equal(isCleanLabel(rec({ has_print: false, match_confidence: "exact", label_source: "program" })), false, "no print = not a print-reading example");
});

test("isCleanLabel: case-insensitive, null-safe", () => {
  assert.equal(isCleanLabel(rec({ match_confidence: "EXACT", label_source: "Program" })), true);
  assert.equal(isCleanLabel(null), false);
  assert.equal(isCleanLabel(undefined), false);
  assert.equal(isCleanLabel("nope"), false);
  assert.equal(isCleanLabel(rec({ match_confidence: null })), false);
});

test("invariant arrays are frozen + cover the corpus tiers", () => {
  assert.ok(Object.isFrozen(TRUSTWORTHY_CONFIDENCE) && Object.isFrozen(EXCLUDED_CONFIDENCE) && Object.isFrozen(REAL_LABEL_SOURCES));
  assert.deepEqual([...TRUSTWORTHY_CONFIDENCE], ["exact", "loose"]);
  assert.deepEqual([...EXCLUDED_CONFIDENCE], ["ambiguous", "garbage"]);
});

// ── curateRecord: verdict + enriched row + subsets ──
test("curateRecord: clean record yields a row with correct subsets", () => {
  const v = curateRecord(rec({ has_program: true, has_cad: true, match_confidence: "exact", label_source: "cad+program", print_docs: [{ drawing_score: 0.8 }], program_files: ["a.nc"], cad_files: ["a.step"] }));
  assert.equal(v.keep, true); assert.equal(v.tier, "exact");
  assert.deepEqual(v.row.subsets, { roundtrip_b: true, print_program: true, triple: true });
  assert.equal(v.row.part_number, "P1");
  assert.equal(v.row.n_cad_files, 1);
});

test("curateRecord: clean row is SELF-CONTAINED — carries real locators, not just counts (reviewer P1)", () => {
  const v = curateRecord(rec({
    part_number: "221178737", part_number_normalized: "221178737",
    has_program: true, has_cad: true, match_confidence: "exact", label_source: "cad+program",
    print_docs: [{ doc_id: "abc-123", filename: "Scan 10-30.pdf", drawing_score: 0.7 }],
    program_files: ["X.nc"], cad_files: ["X.step"],
  }));
  assert.equal(v.row.part_number_normalized, "221178737", "stable re-join key emitted");
  assert.deepEqual(v.row.print_docs, [{ doc_id: "abc-123", filename: "Scan 10-30.pdf", drawing_score: 0.7 }], "print doc locators present");
  assert.deepEqual(v.row.program_files, ["X.nc"]);
  assert.deepEqual(v.row.cad_files, ["X.step"]);
  // a downstream trainer can locate every input from the row alone — no re-join to the 51.8MB pairs file
});

test("curateRecord: trustworthy confidence but an INVALID non-empty source → excluded (no-real-source branch)", () => {
  const v = curateRecord(rec({ match_confidence: "exact", label_source: "vendor" }));
  assert.equal(v.keep, false);
  assert.equal(v.reason, "no-real-source:vendor", "an exact match to a non-program/non-CAD source is not a supervised label");
  assert.equal(v.row, null);
});

test("curateRecord: print+CAD without program → roundtrip_b only (delta's round-trip B set)", () => {
  const v = curateRecord(rec({ has_program: false, has_cad: true, match_confidence: "exact", label_source: "cad" }));
  assert.equal(v.keep, true);
  assert.deepEqual(v.row.subsets, { roundtrip_b: true, print_program: false, triple: false });
});

test("curateRecord: print+program without CAD → print_program only", () => {
  const v = curateRecord(rec({ has_program: true, has_cad: false, match_confidence: "loose", label_source: "program" }));
  assert.equal(v.keep, true);
  assert.deepEqual(v.row.subsets, { roundtrip_b: false, print_program: true, triple: false });
});

test("curateRecord: distinct exclusion reasons (the GIGO guard surfaces WHY)", () => {
  assert.equal(curateRecord(rec({ match_confidence: "garbage", label_source: "program" })).reason, "poison-label:garbage");
  assert.equal(curateRecord(rec({ match_confidence: "ambiguous", label_source: "program" })).reason, "poison-label:ambiguous");
  assert.equal(curateRecord(rec({ match_confidence: "miss", label_source: "none" })).reason, "unlabeled");
  assert.equal(curateRecord(rec({ has_print: false })).reason, "no-print");
  assert.equal(curateRecord(null).reason, "not-an-object");
  // a clean record never carries a row when excluded
  assert.equal(curateRecord(rec({ match_confidence: "garbage" })).row, null);
});

// ── summarizeDrawingScore ──
test("summarizeDrawingScore: min/max/mean across print_docs; empty/garbage → nulls", () => {
  const s = summarizeDrawingScore(rec({ print_docs: [{ drawing_score: 0.4 }, { drawing_score: 0.8 }, { drawing_score: 0.6 }] }));
  assert.equal(s.min, 0.4); assert.equal(s.max, 0.8); assert.equal(s.mean, 0.6); assert.equal(s.n, 3);
  const empty = summarizeDrawingScore(rec({ print_docs: [] }));
  assert.deepEqual(empty, { min: null, max: null, mean: null, n: 0 });
  const junk = summarizeDrawingScore(rec({ print_docs: [{ drawing_score: "x" }, { foo: 1 }] }));
  assert.equal(junk.n, 0, "non-finite scores filtered");
});

// ── accumulate + finalize (corpus roll-up) ──
test("accumulate + finalizeCuration: real-shaped mix → clean set excludes poison", () => {
  const records = [
    rec({ has_cad: true, match_confidence: "exact", label_source: "cad" }),        // keep roundtrip_b
    rec({ has_program: true, match_confidence: "loose", label_source: "program" }), // keep print_program
    rec({ has_program: true, has_cad: true, match_confidence: "exact", label_source: "cad+program" }), // keep triple
    rec({ match_confidence: "garbage", label_source: "program" }),                  // poison
    rec({ match_confidence: "garbage", label_source: "cad" }),                      // poison
    rec({ match_confidence: "ambiguous", label_source: "program" }),                // poison
    rec({ match_confidence: "miss", label_source: "none" }),                        // unlabeled
  ];
  let acc = newCurationStats();
  for (const r of records) acc = accumulate(acc, curateRecord(r));
  const f = finalizeCuration(acc);
  assert.equal(f.total_parts, 7);
  assert.equal(f.clean_trainset, 3, "only the 3 trustworthy-labeled parts");
  assert.equal(f.excluded, 4);
  assert.equal(f.poison_excluded, 3, "garbage+ambiguous are the GIGO poison count");
  assert.equal(f.by_tier.exact, 2); assert.equal(f.by_tier.loose, 1);
  assert.deepEqual(f.trainable_subsets, { roundtrip_b: 2, print_program: 2, triple: 1 });
  assert.equal(f.by_exclusion_reason["poison-label:garbage"], 2);
  assert.equal(f.by_exclusion_reason["unlabeled"], 1);
  assert.equal(f.clean_rate, +(3 / 7).toFixed(4));
});

test("finalizeCuration: empty corpus → zeros, no divide-by-zero", () => {
  const f = finalizeCuration(newCurationStats());
  assert.equal(f.total_parts, 0); assert.equal(f.clean_trainset, 0);
  assert.equal(f.clean_rate, 0); assert.equal(f.poison_excluded, 0);
});

// ── adversarial ──
test("curateRecord: unknown/missing confidence tiers are excluded, not silently kept", () => {
  assert.equal(curateRecord(rec({ match_confidence: "weird", label_source: "program" })).keep, false);
  // real source but unknown confidence → not kept (fail toward exclusion — never train on an unverified label)
  assert.equal(curateRecord(rec({ match_confidence: "weird", label_source: "program" })).reason, "unknown-confidence:weird");
  // a real source with a BLANK confidence is likewise unknown-trustworthiness → excluded, NOT silently kept
  const emptyConf = curateRecord(rec({ match_confidence: "", label_source: "program" }));
  assert.equal(emptyConf.keep, false);
  assert.ok(emptyConf.reason.startsWith("unknown-confidence"), "blank confidence + real source → unknown (fail toward exclusion)");
});
