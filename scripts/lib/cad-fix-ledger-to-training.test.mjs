// scripts/lib/cad-fix-ledger-to-training.test.mjs
// Tests for U-CAD-FIX-LEDGER-TRAIN: CAD fix-ledger corrections -> CAD-gen training pairs.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cadFixToTrainingPair,
  convertLedgerText,
  dedupPairs,
} from "./cad-fix-ledger-to-training.mjs";

// Real-shaped row from state/shared/cad-fix-training-ledger.jsonl.
const REAL_ROW = {
  v: "1.0.0", ts: "2026-06-01T17:00:59.608Z", domain: "cad", kind: "missing-feature",
  part: "die", field: "central_oil_hole", wrong: "absent",
  right: "present(evidence_ratio=0.9466666666666667)",
  source: "xray-roundtrip:cad-prototype-die-2026-05-19.json",
  note: 'xray print-print: regenerated CAD missing required feature "central_oil_hole"',
  cycleId: null, trainsPrintReader: false, trainsCadGen: true, trainsCam: false,
};

describe("cadFixToTrainingPair", () => {
  it("happy: missing-feature correction -> a learnable CAD-gen pair", () => {
    const p = cadFixToTrainingPair(REAL_ROW);
    assert.ok(p);
    assert.match(p.instruction, /die part/);
    assert.match(p.instruction, /central_oil_hole/);
    assert.match(p.output, /REQUIRED/);
    assert.match(p.output, /evidence_ratio=0\.94/);
    assert.match(p.output, /must model this feature/);
  });

  it("GATE: skips rows that do not train the CAD generator (trainsCadGen !== true)", () => {
    assert.equal(cadFixToTrainingPair({ ...REAL_ROW, trainsCadGen: false }), null);
    assert.equal(cadFixToTrainingPair({ ...REAL_ROW, trainsCadGen: undefined, trainsPrintReader: true }), null);
  });

  it("failure: missing part or field -> null (not a degenerate pair)", () => {
    assert.equal(cadFixToTrainingPair({ ...REAL_ROW, part: "" }), null);
    assert.equal(cadFixToTrainingPair({ ...REAL_ROW, field: undefined }), null);
    assert.equal(cadFixToTrainingPair({ ...REAL_ROW, right: "" }), null);
  });

  it("extensible: an UNSEEN kind still yields a generic correction pair (not dropped)", () => {
    const p = cadFixToTrainingPair({ ...REAL_ROW, kind: "wrong-dimension", field: "bore_dia", wrong: "12.0mm", right: "12.5mm" });
    assert.ok(p);
    assert.match(p.output, /bore_dia/);
    assert.match(p.output, /12\.5mm/);
    assert.match(p.output, /12\.0mm/);
  });

  it("adversarial: non-object / null input -> null, never throws", () => {
    assert.doesNotThrow(() => {
      assert.equal(cadFixToTrainingPair(null), null);
      assert.equal(cadFixToTrainingPair("nope"), null);
      assert.equal(cadFixToTrainingPair(7), null);
    });
  });

  it("adversarial: missing wrong defaults to (omitted), still emits", () => {
    const p = cadFixToTrainingPair({ ...REAL_ROW, wrong: undefined });
    assert.ok(p);
    assert.match(p.output, /\(omitted\)/);
  });
});

describe("convertLedgerText", () => {
  it("counts emitted / invalid / skipped across mixed JSONL", () => {
    const text = [
      JSON.stringify(REAL_ROW),                              // emitted
      "{ broken json",                                       // invalid
      JSON.stringify({ ...REAL_ROW, trainsCadGen: false }),  // skipped (not cadGen)
      "",                                                    // blank ignored
    ].join("\n");
    const { rows, invalid, skipped } = convertLedgerText(text);
    assert.equal(rows.length, 1);
    assert.equal(invalid, 1);
    assert.equal(skipped, 1);
  });
});

describe("dedupPairs", () => {
  it("collapses a feature re-corrected across cycles to one pair", () => {
    const a = cadFixToTrainingPair(REAL_ROW);
    const b = cadFixToTrainingPair({ ...REAL_ROW, ts: "2026-06-02T00:00:00Z" }); // same part/field -> same pair
    const { rows, duplicates } = dedupPairs([a, b]);
    assert.equal(rows.length, 1);
    assert.equal(duplicates, 1);
  });
});
