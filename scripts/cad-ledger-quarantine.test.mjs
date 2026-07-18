/*
 * Tests for cad-ledger-quarantine.mjs pure classifiers (slot:delta, 2026-06-26). Hermetic -- no I/O;
 * the apply path (backup/atomic-write/clobber-guard) is exercised by the live dry-run + --apply run.
 * Run: node scripts/cad-ledger-quarantine.test.mjs (node:test auto-runs on exit; pipe to tail).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyLine, partitionLedger } from "./cad-ledger-quarantine.mjs";

const CUT = Date.parse("2026-06-26T07:48:31Z");
const rec = (status, ts) => JSON.stringify({ testId: "x", status, ...(ts ? { timestamp: ts } : {}) });

test("classifyLine: pre-cutoff fail -> quarantine (the certain false-fail)", () => {
  assert.equal(classifyLine(rec("fail", "2026-06-26T03:32:00Z"), CUT), "quarantine");
});

test("classifyLine: post-cutoff fail -> keep (a real, trustworthy fail)", () => {
  assert.equal(classifyLine(rec("fail", "2026-06-26T09:00:00Z"), CUT), "keep");
});

test("classifyLine: exactly-at-cutoff fail -> keep (strict < boundary, not <=)", () => {
  assert.equal(classifyLine(rec("fail", "2026-06-26T07:48:31Z"), CUT), "keep");
});

test("classifyLine: pass / error are always kept (non-fail = trustworthy signal)", () => {
  assert.equal(classifyLine(rec("pass", "2026-06-26T03:00:00Z"), CUT), "keep");
  assert.equal(classifyLine(rec("error", "2026-06-26T03:00:00Z"), CUT), "keep"); // real gen failure
});

test("classifyLine: undateable / missing-timestamp fail -> keep (never over-quarantine)", () => {
  assert.equal(classifyLine(rec("fail", null), CUT), "keep");
  assert.equal(classifyLine(rec("fail", "not-a-date"), CUT), "keep");
});

test("classifyLine: unparseable line -> unparseable (caller fails loud, never clobbers)", () => {
  assert.equal(classifyLine("NOT JSON", CUT), "unparseable");
});

test("classifyLine: blank line -> skip", () => {
  assert.equal(classifyLine("", CUT), "skip");
  assert.equal(classifyLine("   ", CUT), "skip");
});

test("partitionLedger: splits a mixed ledger correctly; only pre-cutoff fails are quarantined", () => {
  const lines = [
    rec("fail", "2026-06-26T03:32:00Z"),   // quarantine
    rec("fail", "2026-06-26T04:00:00Z"),   // quarantine
    rec("pass", "2026-06-26T08:00:00Z"),   // keep
    rec("error", "2026-06-26T03:00:00Z"),  // keep (real gen failure)
    rec("fail", "2026-06-26T09:00:00Z"),   // keep (post-cutoff real fail)
    "TORN{",                                // unparseable
    "",                                     // skip
  ];
  const { keep, quarantine, unparseable } = partitionLedger(lines, CUT);
  assert.equal(quarantine.length, 2);
  assert.equal(keep.length, 3);
  assert.equal(unparseable.length, 1);
  // no record is both kept and quarantined; total accounted (5 records + 1 torn, blank skipped)
  assert.equal(keep.length + quarantine.length + unparseable.length, 6);
});

test("partitionLedger: an all-quarantine ledger still keeps non-fail (guards 'empty the ledger')", () => {
  const lines = [rec("fail", "2026-06-26T01:00:00Z"), rec("error", "2026-06-26T01:00:00Z")];
  const { keep, quarantine } = partitionLedger(lines, CUT);
  assert.equal(quarantine.length, 1);
  assert.equal(keep.length, 1); // the error record survives -> ledger never fully emptied
});
